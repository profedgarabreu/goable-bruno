import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {exigirPapel,ok,okList,auditar,competenciaAtual} from './service.server';
import {validarCPF,validarCNPJ,somenteDigitos,diffCampos} from './rules';
import {extrairDaFicha} from './ficha.server';

const op={operador_id:z.string().uuid().nullish()};

export const meuPapel=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>({papel:await exigirPapel(context.supabase,context.userId)}));

export const painelConfiguracoes=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;const papel=await exigirPapel(db,context.userId);
 const [emitente,parametros,aliquotas,servicos,medicos,regras,operadores,textos,vinculos,historico]=await Promise.all([
  db.from('nf_emitente').select('*').maybeSingle(),
  db.from('nf_parametros_fiscais').select('*').order('versao',{ascending:false}),
  db.from('nf_aliquota_mes').select('*').order('competencia',{ascending:false}),
  db.from('nf_servicos').select('*').order('ordem'),
  db.from('nf_medicos').select('*').order('nome'),
  db.from('nf_regras_especiais').select('*').order('nome'),
  db.from('nf_operadores').select('*').order('ordem'),
  db.from('nf_textos_envio').select('*'),
  db.from('nf_pacientes').select('regra_especial_id').not('regra_especial_id','is',null),
  db.from('nf_auditoria').select('entidade_id,quando,operador:nf_operadores(nome)').eq('entidade','nf_parametros_fiscais').eq('acao','nova_versao'),
 ]);
 const contagem:Record<string,number>={};for(const v of okList(vinculos))contagem[v.regra_especial_id!]=(contagem[v.regra_especial_id!]??0)+1;
 const autores:Record<string,string>={};for(const h of okList(historico))if(h.entidade_id)autores[h.entidade_id]=h.operador?.nome??'Administração Goable';
 return {papel,competencia:competenciaAtual(),emitente:ok(emitente),parametros:okList(parametros).map(p=>({...p,autor:autores[p.id]??(p.versao===1?'Carga inicial':'—')})),aliquotas:okList(aliquotas),servicos:okList(servicos),medicos:okList(medicos),regras:okList(regras).map(r=>({...r,pacientes:contagem[r.id]??0})),operadores:okList(operadores),textos:okList(textos)};
});

const txt=z.string().trim().nullish().transform(v=>v||null);
export const salvarEmitente=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({dados:z.object({razao_social:z.string().trim().min(3),cnpj:z.string().nullish().transform(v=>somenteDigitos(v)||null).refine(v=>v===null||validarCNPJ(v),'CNPJ inválido'),inscricao_municipal:txt,municipio_ibge:z.string().regex(/^\d{7}$/,'Código IBGE com 7 dígitos'),municipio_nome:z.string().trim().min(2),uf:z.string().length(2),regime:z.string().min(2),email_remetente:z.string().email().nullish().or(z.literal('')).transform(v=>v||null),whatsapp_numero:z.string().nullish().transform(v=>somenteDigitos(v)||null)}),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const antes=ok(await db.from('nf_emitente').select('*').eq('id',true).single());
 const depois=ok(await db.from('nf_emitente').update(data.dados).eq('id',true).select('*').single());
 const d=diffCampos(antes,depois);await auditar(db,data.operador_id,'editar','nf_emitente','true',d.antes,d.depois);return depois;
});

export const registrarValidacaoContador=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({contador:z.string().trim().min(3),data:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),conferido:z.literal(true),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const antes=ok(await db.from('nf_emitente').select('parametros_validados_por,parametros_validados_em').eq('id',true).single());
 const patch={parametros_validados_por:data.contador,parametros_validados_em:`${data.data}T12:00:00-03:00`};
 ok(await db.from('nf_emitente').update(patch).eq('id',true));
 await auditar(db,data.operador_id,'registrar_validacao_contador','nf_emitente','true',antes,patch);return {ok:true};
});

export const salvarTextoEnvio=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({chave:z.enum(['email_assunto','email_corpo','whatsapp']),conteudo:z.string().trim().min(5).max(4000),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const antes=ok(await db.from('nf_textos_envio').select('conteudo').eq('chave',data.chave).maybeSingle());
 ok(await db.from('nf_textos_envio').upsert({chave:data.chave,conteudo:data.conteudo}));
 await auditar(db,data.operador_id,'editar','nf_textos_envio',data.chave,antes,{conteudo:data.conteudo});return {ok:true};
});

const pacienteSchema=z.object({nome:z.string().trim().min(2,'Informe o nome'),cpf:z.string().nullish().transform(v=>somenteDigitos(v)||null).refine(v=>v===null||validarCPF(v),'CPF inválido'),cep:z.string().nullish().transform(v=>somenteDigitos(v)||null).refine(v=>v===null||v.length===8,'CEP deve ter 8 dígitos'),logradouro:txt,numero:txt,complemento:txt,bairro:txt,municipio_ibge:z.string().nullish().transform(v=>somenteDigitos(v)||null),municipio_nome:txt,uf:z.string().trim().toUpperCase().nullish().transform(v=>v||null).refine(v=>v===null||v.length===2,'UF inválida'),email:z.string().trim().email('E-mail inválido').nullish().or(z.literal('')).transform(v=>v||null),celular:z.string().nullish().transform(v=>somenteDigitos(v)||null),regra_especial_id:z.string().uuid().nullish().or(z.literal('')).transform(v=>v||null),prontuario_prontmed:txt,origem:z.enum(['importacao','ficha_ia','manual']).optional()});

export const salvarPaciente=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid().optional(),dados:pacienteSchema.partial(),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 if(!data.id&&!data.dados.nome)throw new Error('Informe o nome.');
 if(data.dados.cpf){const dup=ok(await db.from('nf_pacientes').select('id,nome').eq('cpf',data.dados.cpf).neq('id',data.id??'00000000-0000-0000-0000-000000000000').maybeSingle());if(dup)return {erro:'cpf_duplicado' as const,existente:dup};}
 let antes=null,depois;
 if(data.id){antes=ok(await db.from('nf_pacientes').select('*').eq('id',data.id).maybeSingle());if(!antes)throw new Error('Paciente não encontrado.');depois=ok(await db.from('nf_pacientes').update(data.dados).eq('id',data.id).select('*').single());}
 else depois=ok(await db.from('nf_pacientes').insert({...data.dados,nome:data.dados.nome!,origem:data.dados.origem??'manual'}).select('*').single());
 const d=diffCampos(antes,depois);
 await auditar(db,data.operador_id,data.id?'editar':'criar','nf_pacientes',depois.id,d.antes,d.depois);
 return {erro:null,paciente:depois};
});

/** The pasted record is processed in memory only: never stored, logged or audited. */
export const extrairFicha=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({texto:z.string().min(10,'Cole o texto da ficha.').max(20000,'Texto muito longo.')})).handler(async({context,data})=>{
 await exigirPapel(context.supabase,context.userId);
 const key=process.env['LOVABLE_API_KEY'];if(!key)throw new Error('Leitura da ficha indisponível no momento.');
 return extrairDaFicha(data.texto,key);
});
