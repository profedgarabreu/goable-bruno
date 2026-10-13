import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {exigirPapel,ok,okList,auditar,configFiscal,bloqueiosDe} from './service.server';
import type {Json} from '@/integrations/supabase/types';
import {statusAtendimento,validarTransicao,validarCPF,somenteDigitos,type StatusAtendimento} from './rules';

const op={operador_id:z.string().uuid().nullish()};
const id=z.string().uuid();
const base=()=>createServerFn({method:'POST'}).middleware([requireSupabaseAuth]);
const cpfOpt=z.string().nullish().transform(v=>somenteDigitos(v)||null).refine(v=>v===null||validarCPF(v),'CPF inválido');

export const listarOperadores=base().handler(async({context})=>{await exigirPapel(context.supabase,context.userId);return okList(await context.supabase.from('nf_operadores').select('id,nome,ativo,ordem').order('ordem'));});

export const getConfigFiscalAtual=base().handler(async({context})=>{await exigirPapel(context.supabase,context.userId);return configFiscal(context.supabase);});

export const checarBloqueios=base().inputValidator(z.object({atendimento_id:id})).handler(async({context,data})=>{await exigirPapel(context.supabase,context.userId);return (await bloqueiosDe(context.supabase,data.atendimento_id)).bloqueios;});

export const transicionarStatus=base().inputValidator(z.object({atendimento_id:id,novo_status:z.enum(statusAtendimento as [StatusAtendimento,...StatusAtendimento[]]),motivo:z.string().max(500).optional(),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const {atendimento,bloqueios}=await bloqueiosDe(db,data.atendimento_id);
 validarTransicao(atendimento.status,data.novo_status,bloqueios);
 const agora=new Date().toISOString();
 const patch:{status:StatusAtendimento;pago_ok_por?:string|null;pago_ok_em?:string;aprovado_por?:string|null;aprovado_em?:string}={status:data.novo_status};
 if(data.novo_status==='pago_ok'){patch.pago_ok_por=data.operador_id??null;patch.pago_ok_em=agora;}
 if(data.novo_status==='aprovado'){patch.aprovado_por=data.operador_id??null;patch.aprovado_em=agora;}
 const rows=okList(await db.from('nf_atendimentos').update(patch).eq('id',data.atendimento_id).eq('status',atendimento.status).select('id'));
 if(!rows.length)throw new Error('O atendimento foi alterado por outra pessoa. Atualize e tente novamente.');
 await auditar(db,data.operador_id,'transicionar_status','nf_atendimentos',data.atendimento_id,{status:atendimento.status},{status:data.novo_status,motivo:data.motivo??null});
 return {ok:true,status:data.novo_status};
});

export const registrarAuditoria=base().inputValidator(z.object({acao:z.string().min(1).max(80),entidade:z.string().regex(/^nf_[a-z_]+$/),entidade_id:z.string().max(100).nullable(),antes:z.unknown(),depois:z.unknown(),...op})).handler(async({context,data})=>{await exigirPapel(context.supabase,context.userId);await auditar(context.supabase,data.operador_id,data.acao,data.entidade,data.entidade_id,data.antes,data.depois);return {ok:true};});

// Generic list/create/edit for the M1 back-office entities (screens arrive in M2).
const schemas={
 nf_operadores:z.object({nome:z.string().trim().min(2).max(80),ativo:z.boolean().optional(),ordem:z.number().int().optional()}),
 nf_medicos:z.object({nome:z.string().trim().min(2),crm:z.string().nullish(),nome_no_prontmed:z.string().nullish(),ativo:z.boolean().optional()}),
 nf_servicos:z.object({nome:z.string().trim().min(2),gera_nota:z.boolean().optional(),valor_padrao:z.number().nonnegative().nullish(),descricao_nota:z.string().trim().min(2),genero:z.enum(['a','o']),parametro_fiscal_id:id.nullish(),aliases_prontmed:z.array(z.string()).optional(),observacao:z.string().optional(),ativo:z.boolean().optional(),ordem:z.number().int().optional()}),
 nf_pacientes:z.object({nome:z.string().trim().min(2),cpf:cpfOpt,cep:z.string().nullish().transform(v=>somenteDigitos(v)||null),logradouro:z.string().nullish(),numero:z.string().nullish(),complemento:z.string().nullish(),bairro:z.string().nullish(),municipio_ibge:z.string().nullish(),municipio_nome:z.string().nullish(),uf:z.string().length(2).nullish(),email:z.string().email().nullish(),celular:z.string().nullish(),regra_especial_id:id.nullish(),prontuario_prontmed:z.string().nullish(),origem:z.enum(['importacao','ficha_ia','manual']).optional()}),
 nf_aliquota_mes:z.object({competencia:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),aliquota_simples:z.number().min(0).max(100),informado_por:z.string().trim().min(2)}),
} as const;
type Tabela=keyof typeof schemas;
const tabela=z.enum(Object.keys(schemas) as [Tabela,...Tabela[]]);

export const listarCadastro=base().inputValidator(z.object({tabela})).handler(async({context,data})=>{await exigirPapel(context.supabase,context.userId);return okList(await context.supabase.from(data.tabela).select('*').order('created_at')) as unknown as {[k:string]:Json}[];});

export const salvarCadastro=base().inputValidator(z.object({tabela,id:id.optional(),dados:z.record(z.string(),z.unknown()),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const schema=schemas[data.tabela];
 const dados=(data.id?schema.partial():schema).parse(data.dados) as Record<string,unknown>;
 if(data.tabela==='nf_aliquota_mes')dados['informado_em']=new Date().toISOString();
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const t=db.from(data.tabela) as any;
 let antes=null,depois;
 if(data.id){antes=ok(await t.select('*').eq('id',data.id).maybeSingle());if(!antes)throw new Error('Registro não encontrado.');depois=ok(await t.update(dados).eq('id',data.id).select('*').single());}
 else depois=ok(await t.insert(dados).select('*').single());
 await auditar(db,data.operador_id,data.id?'editar':'criar',data.tabela,(depois as {id:string}).id,antes,depois);
 return depois as {[k:string]:Json};
});

export const editarParametroFiscal=base().inputValidator(z.object({id,dados:z.record(z.string(),z.unknown()),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const novo=ok(await db.rpc('nf_parametro_nova_versao',{_id:data.id,_dados:data.dados as never}));
 await auditar(db,data.operador_id,'nova_versao','nf_parametros_fiscais',novo,{id:data.id},data.dados);
 return {id:novo};
});

export const limparDadosDemo=base().inputValidator(z.object({...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const at=okList(await db.from('nf_atendimentos').delete().eq('demo',true).select('id'));
 const pac=okList(await db.from('nf_pacientes').delete().eq('demo',true).select('id'));
 await auditar(db,data.operador_id,'limpar_dados_demo','nf_pacientes',null,{atendimentos:at.length,pacientes:pac.length},null);
 return {atendimentos:at.length,pacientes:pac.length};
});
