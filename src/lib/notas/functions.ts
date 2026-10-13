import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {exigirPapel,ok,okList,auditar,configFiscal,bloqueiosDe} from './service.server';
import type {Json} from '@/integrations/supabase/types';
import {statusAtendimento,validarTransicao,validarCPF,validarCNPJ,somenteDigitos,diffCampos,type StatusAtendimento} from './rules';

const op={operador_id:z.string().uuid().nullish()};
const id=z.string().uuid();
const cpfOpt=z.string().nullish().transform(v=>somenteDigitos(v)||null).refine(v=>v===null||validarCPF(v),'CPF inválido');

export const listarOperadores=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{await exigirPapel(context.supabase,context.userId);return okList(await context.supabase.from('nf_operadores').select('id,nome,ativo,ordem').order('ordem'));});

export const getConfigFiscalAtual=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{await exigirPapel(context.supabase,context.userId);return configFiscal(context.supabase);});

export const checarBloqueios=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_id:id})).handler(async({context,data})=>{await exigirPapel(context.supabase,context.userId);return (await bloqueiosDe(context.supabase,data.atendimento_id)).bloqueios;});

export const transicionarStatus=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_id:id,novo_status:z.enum(statusAtendimento as [StatusAtendimento,...StatusAtendimento[]]),motivo:z.string().max(500).optional(),...op})).handler(async({context,data})=>{
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

export const registrarAuditoria=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({acao:z.string().min(1).max(80),entidade:z.string().regex(/^nf_[a-z_]+$/),entidade_id:z.string().max(100).nullable(),antes:z.unknown(),depois:z.unknown(),...op})).handler(async({context,data})=>{await exigirPapel(context.supabase,context.userId);await auditar(context.supabase,data.operador_id,data.acao,data.entidade,data.entidade_id,data.antes,data.depois);return {ok:true};});

// Generic list/create/edit for the M1 back-office entities (screens arrive in M2).
const schemas={
 nf_operadores:z.object({nome:z.string().trim().min(2).max(80),ativo:z.boolean().optional(),ordem:z.number().int().optional()}),
 nf_medicos:z.object({nome:z.string().trim().min(2),crm:z.string().nullish(),nome_no_prontmed:z.string().nullish(),ativo:z.boolean().optional()}),
 nf_servicos:z.object({nome:z.string().trim().min(2),gera_nota:z.boolean().optional(),valor_padrao:z.number().nonnegative().nullish(),descricao_nota:z.string().trim().min(2),genero:z.enum(['a','o']),parametro_fiscal_id:id.nullish(),aliases_prontmed:z.array(z.string()).optional(),observacao:z.string().optional(),ativo:z.boolean().optional(),ordem:z.number().int().optional()}),
 nf_pacientes:z.object({nome:z.string().trim().min(2),cpf:cpfOpt,cep:z.string().nullish().transform(v=>somenteDigitos(v)||null),logradouro:z.string().nullish(),numero:z.string().nullish(),complemento:z.string().nullish(),bairro:z.string().nullish(),municipio_ibge:z.string().nullish(),municipio_nome:z.string().nullish(),uf:z.string().length(2).nullish(),email:z.string().email().nullish(),celular:z.string().nullish(),regra_especial_id:id.nullish(),prontuario_prontmed:z.string().nullish(),origem:z.enum(['importacao','ficha_ia','manual']).optional()}),
 nf_regras_especiais:z.object({nome:z.string().trim().min(2),aguarda_autorizacao:z.boolean().optional(),iss_retido:z.boolean().optional(),exige_declaracao:z.boolean().optional(),tomador_cnpj:z.string().nullish().transform(v=>somenteDigitos(v)||null).refine(v=>v===null||validarCNPJ(v),'CNPJ do tomador inválido'),tomador_nome:z.string().trim().nullish().transform(v=>v||null),observacao:z.string().optional(),ativo:z.boolean().optional()}),
 nf_aliquota_mes:z.object({competencia:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),aliquota_simples:z.number().min(0,'A alíquota vai de 0 a 33%.').max(33,'A alíquota vai de 0 a 33%.'),informado_por:z.string().trim().min(2)}),
} as const;
type Tabela=keyof typeof schemas;
// Which tables the clinic login may write; null = every column, array = only these columns on edit.
const permissaoConsultorio:Record<Tabela,{criar:boolean;campos:string[]|null}|false>={nf_operadores:{criar:true,campos:null},nf_pacientes:{criar:true,campos:null},nf_aliquota_mes:{criar:true,campos:null},nf_servicos:{criar:false,campos:['valor_padrao','descricao_nota']},nf_medicos:false,nf_regras_especiais:false};
const tabela=z.enum(Object.keys(schemas) as [Tabela,...Tabela[]]);

export const listarCadastro=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({tabela})).handler(async({context,data})=>{await exigirPapel(context.supabase,context.userId);return okList(await context.supabase.from(data.tabela).select('*').order('created_at')) as unknown as {[k:string]:Json}[];});

export const salvarCadastro=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({tabela,id:id.optional(),dados:z.record(z.string(),z.unknown()),...op})).handler(async({context,data})=>{
 const db=context.supabase;const papel=await exigirPapel(db,context.userId);
 const schema=schemas[data.tabela];
 const dados=(data.id?schema.partial():schema).parse(data.dados) as Record<string,unknown>;
 if(papel==='consultorio'){const regra=permissaoConsultorio[data.tabela];
  if(!regra||(!data.id&&!regra.criar))throw new Error('Somente a administração Goable pode alterar este cadastro.');
  if(data.id&&regra.campos){const proibidos=Object.keys(dados).filter(k=>!regra.campos!.includes(k));if(proibidos.length)throw new Error('O consultório só pode alterar valor e texto da nota dos serviços.');}}
 if(data.tabela==='nf_aliquota_mes')dados['informado_em']=new Date().toISOString();
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const t=db.from(data.tabela) as any;
 let antes=null,depois;
 if(data.id){antes=ok(await t.select('*').eq('id',data.id).maybeSingle());if(!antes)throw new Error('Registro não encontrado.');depois=ok(await t.update(dados).eq('id',data.id).select('*').single());}
 else depois=ok(await t.insert(dados).select('*').single());
 const d=diffCampos(antes,depois as Record<string,unknown>);
 await auditar(db,data.operador_id,data.id?'editar':'criar',data.tabela,(depois as {id:string}).id,d.antes,d.depois);
 return depois as {[k:string]:Json};
});

const s50=z.string().trim().max(200);
const parametroSchema=z.object({nome:s50.min(3),c_trib_nac:s50.min(1),c_trib_mun:s50.nullable(),nbs:s50.nullable(),nbs_descricao:s50.nullable(),c_ind_op:s50.nullable(),municipio_incidencia_ibge:z.string().regex(/^\d{7}$/),trib_issqn:s50.min(1),regime_especial:s50.min(1),exigibilidade_suspensa:z.boolean(),iss_retido:z.boolean(),beneficio_municipal:z.boolean(),pis_cofins_cst:s50.nullable(),pis_cofins_csll_retencao:s50.nullable(),ibscbs_cst:s50.nullable(),ibscbs_class_trib:s50.nullable(),valor_aprox_tributos_modo:s50.min(1),vigente_desde:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).partial();
export const editarParametroFiscal=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id,dados:parametroSchema,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const novo=ok(await db.rpc('nf_parametro_nova_versao',{_id:data.id,_dados:data.dados as never}));
 await auditar(db,data.operador_id,'nova_versao','nf_parametros_fiscais',novo,{id:data.id},data.dados);
 return {id:novo};
});

export const limparDadosDemo=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({confirmacao:z.literal('LIMPAR'),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const ids=okList(await db.from('nf_atendimentos').select('id').eq('demo',true)).map(a=>a.id);
 const notas=ids.length?okList(await db.from('nf_notas').select('id,pdf_path,xml_path').in('atendimento_id',ids)):[];
 const nids=notas.map(n=>n.id);let envios=0;
 if(nids.length){
  envios=okList(await db.from('nf_envios').delete().in('nota_id',nids).select('id')).length;
  ok(await db.from('nf_links_paciente').delete().in('nota_id',nids));
  ok(await db.from('nf_notas').update({substituida_por:null}).in('substituida_por',nids));
  ok(await db.from('nf_notas').delete().in('id',nids));
 }
 const paths=notas.flatMap(n=>[n.pdf_path,n.xml_path]).filter((p):p is string=>!!p);
 if(paths.length){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');await supabaseAdmin.storage.from('notas').remove(paths);}
 const at=okList(await db.from('nf_atendimentos').delete().eq('demo',true).select('id'));
 const pac=okList(await db.from('nf_pacientes').delete().eq('demo',true).select('id'));
 const r={pacientes:pac.length,atendimentos:at.length,notas:nids.length,envios,arquivos:paths.length};
 await auditar(db,data.operador_id,'limpar_dados_demo','nf_pacientes',null,r,null);
 return r;
});
