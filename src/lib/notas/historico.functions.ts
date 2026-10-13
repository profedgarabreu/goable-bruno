import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {exigirPapel,ok,okList,auditar} from './service.server';
import {carregarMes,dadosEmitente,montarPlanilha} from './historico.server';
import {competenciaValida,deslocarCompetencia,intervaloCompetencia,resumirHistorico,nomeExportacao,nomeArquivoNota,paraCSV,valorCSV,dataBR,formaLabel,resumoAuditoria,rotuloAcao,contarNotasAtencao} from './historico';
import {calcularBloqueios,competenciaDe,mascararCPF} from './rules';

const uuid=z.string().uuid();
const filtros={competencia:z.string().refine(competenciaValida,'Competência inválida'),medico_id:uuid.nullish(),servico_id:uuid.nullish(),forma:z.enum(['pix','credito','debito','dinheiro','outro']).nullish()};
const op={operador_id:uuid.nullish()};
const b64=(u:Uint8Array)=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s);};

export const historicoMes=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object(filtros)).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const ant=deslocarCompetencia(data.competencia,-1);const {de,ate}=intervaloCompetencia(data.competencia);
 const [rows,prev,pend,meds,servs,em]=await Promise.all([carregarMes(db,data.competencia,data),carregarMes(db,ant,data),
  db.from('nf_atendimentos').select('id',{count:'exact',head:true}).in('status',['pago_ok','aprovado','emitindo','erro_emissao']).gte('data_atendimento',de).lte('data_atendimento',ate),
  db.from('nf_medicos').select('id,nome').order('nome'),db.from('nf_servicos').select('id,nome').order('ordem'),dadosEmitente(db)]);
 if(pend.error)throw new Error(pend.error.message);
 const pa=resumirHistorico(prev,ant);
 return {linhas:rows.map(r=>({...r,cpf:mascararCPF(r.cpf)})),resumo:resumirHistorico(rows,data.competencia),anterior:{competencia:ant,total:pa.total,emitidas:pa.emitidas},pendentes:pend.count??0,
  medicos:okList(meds),servicos:okList(servs),modo:em?.emissor_modo??'mock'};
});

export const exportarPlanilhaMes=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({...filtros,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const [rows,em]=await Promise.all([carregarMes(db,data.competencia,data),dadosEmitente(db)]);
 const nome=nomeExportacao(data.competencia,em?.emissor_modo??'mock','xlsx');
 const bytes=montarPlanilha(data.competencia,rows,em);
 await auditar(db,data.operador_id,'exportacao_mes','nf_notas',null,null,{tipo:'xlsx',competencia:data.competencia,arquivo:nome,notas:rows.length});
 return {nome,base64:b64(bytes)};
});

/** ZIP is assembled in the browser: this returns the workbook plus short-lived signed URLs for each authorized note's PDF/XML. */
export const pacoteMes=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({...filtros,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const [rows,em]=await Promise.all([carregarMes(db,data.competencia,data),dadosEmitente(db)]);
 const modo=em?.emissor_modo??'mock';
 const autorizadas=rows.filter(r=>r.status==='autorizada');
 const paths=okList(autorizadas.length?await db.from('nf_notas').select('id,pdf_path,xml_path').in('id',autorizadas.map(r=>r.id)):{data:[],error:null});
 const porId=new Map(paths.map(p=>[p.id,p]));
 const arquivos:{nome:string;url:string}[]=[];
 for(const r of autorizadas){const p=porId.get(r.id);for(const tipo of ['pdf','xml'] as const){const path=tipo==='pdf'?p?.pdf_path:p?.xml_path;if(!path)continue;const s=await db.storage.from('notas').createSignedUrl(path,600);if(s.error)throw new Error('Não foi possível preparar os arquivos das notas.');arquivos.push({nome:`${tipo}/${nomeArquivoNota(r.numero,r.paciente,tipo)}`,url:s.data.signedUrl});}}
 const planilha=nomeExportacao(data.competencia,modo,'xlsx');
 const nome=nomeExportacao(data.competencia,modo,'zip');
 await auditar(db,data.operador_id,'exportacao_mes','nf_notas',null,null,{tipo:'zip',competencia:data.competencia,arquivo:nome,notas:autorizadas.length,arquivos:arquivos.length});
 return {nome,planilha:{nome:planilha,base64:b64(montarPlanilha(data.competencia,rows,em))},arquivos};
});

export const exportarCsvMes=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({...filtros,incluirCanceladas:z.boolean().default(false),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const [rows,em]=await Promise.all([carregarMes(db,data.competencia,data),dadosEmitente(db)]);
 const lista=rows.filter(r=>data.incluirCanceladas||r.status==='autorizada');
 const nome=nomeExportacao(data.competencia,em?.emissor_modo??'mock','csv');
 const csv=paraCSV(['Data','Número','Paciente','CPF','Serviço','Médico','Forma de pagamento','Valor','Status','Envio'],lista.map(r=>[dataBR(r.data),r.numero??'',r.paciente,r.cpf??'',r.servico,r.medico,formaLabel[r.forma??'']??'',valorCSV(r.valor),r.status,r.envio]));
 await auditar(db,data.operador_id,'exportacao_mes','nf_notas',null,null,{tipo:'csv',competencia:data.competencia,arquivo:nome,notas:lista.length});
 return {nome,csv};
});

// ---- Audit panel (admin only) ----
const filtrosAud=z.object({de:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),ate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),operador_id:uuid.nullish(),acao:z.string().max(60).nullish(),entidade:z.string().max(60).nullish(),pagina:z.number().int().min(0).default(0),tamanho:z.number().int().min(10).max(5000).default(25)});
export const listarAuditoria=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(filtrosAud).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const fim=new Date(`${data.ate}T00:00:00-03:00`);fim.setUTCDate(fim.getUTCDate()+1);
 let q=db.from('nf_auditoria').select('id,quando,operador_id,user_id,acao,entidade,entidade_id,antes,depois,operador:nf_operadores(nome)',{count:'exact'}).gte('quando',new Date(`${data.de}T00:00:00-03:00`).toISOString()).lt('quando',fim.toISOString()).order('quando',{ascending:false}).range(data.pagina*data.tamanho,data.pagina*data.tamanho+data.tamanho-1);
 if(data.operador_id)q=q.eq('operador_id',data.operador_id);if(data.acao)q=q.eq('acao',data.acao);if(data.entidade)q=q.eq('entidade',data.entidade);
 const r=await q;if(r.error)throw new Error(r.error.message);const rows=r.data??[];
 const ids=(ent:string)=>[...new Set(rows.filter(x=>x.entidade===ent&&x.entidade_id&&/^[0-9a-f-]{36}$/.test(x.entidade_id)).map(x=>x.entidade_id!))];
 const [ats,nts,pacs,perfis]=await Promise.all([
  ids('nf_atendimentos').length?db.from('nf_atendimentos').select('id,valor,forma_pagamento,paciente:nf_pacientes(nome)').in('id',ids('nf_atendimentos')):Promise.resolve({data:[],error:null}),
  ids('nf_notas').length?db.from('nf_notas').select('id,numero,atendimento:nf_atendimentos(valor,forma_pagamento,paciente:nf_pacientes(nome))').in('id',ids('nf_notas')):Promise.resolve({data:[],error:null}),
  ids('nf_pacientes').length?db.from('nf_pacientes').select('id,nome').in('id',ids('nf_pacientes')):Promise.resolve({data:[],error:null}),
  db.from('nf_perfis').select('user_id,nome')]);
 type Ctx={paciente?:string|null|undefined;valor?:number|null|undefined;forma?:string|null|undefined;numero?:string|null|undefined};
 const ctx=new Map<string,Ctx>();
 for(const a of okList(ats as never) as {id:string;valor:number;forma_pagamento:string|null;paciente:{nome:string}|null}[])ctx.set(a.id,{paciente:a.paciente?.nome,valor:Number(a.valor),forma:a.forma_pagamento});
 for(const n of okList(nts as never) as {id:string;numero:string|null;atendimento:{valor:number;forma_pagamento:string|null;paciente:{nome:string}|null}|null}[])ctx.set(n.id,{paciente:n.atendimento?.paciente?.nome,valor:n.atendimento?Number(n.atendimento.valor):null,forma:n.atendimento?.forma_pagamento,numero:n.numero});
 for(const p of okList(pacs as never) as {id:string;nome:string}[])ctx.set(p.id,{paciente:p.nome});
 const usuarios=new Map((perfis.data??[]).map(p=>[p.user_id,p.nome]));
 return {total:r.count??0,linhas:rows.map(x=>({id:x.id,quando:x.quando,operador:x.operador?.nome??null,usuario:usuarios.get(x.user_id)??`${x.user_id.slice(0,8)}…`,acao:x.acao,acaoLabel:rotuloAcao(x.acao),entidade:x.entidade,entidade_id:x.entidade_id,antes:x.antes,depois:x.depois,
  resumo:resumoAuditoria({operador:x.operador?.nome??null,acao:x.acao,entidade:x.entidade,antes:x.antes,depois:x.depois,contexto:x.entidade_id?ctx.get(x.entidade_id):null})}))};
});
export const opcoesAuditoria=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const r=okList(await db.from('nf_auditoria').select('acao,entidade').order('quando',{ascending:false}).limit(5000));
 return {acoes:[...new Set(r.map(x=>x.acao))].sort(),entidades:[...new Set(r.map(x=>x.entidade))].sort()};
});

// ---- Sidebar badges ----
export const contadoresMenu=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const [rows,aliqs,notas]=await Promise.all([
  db.from('nf_atendimentos').select('data_atendimento,valor,convenio,aprovado_em,autorizacao_liberada,paciente:nf_pacientes(cpf,cep,logradouro,numero,municipio_ibge,regra:nf_regras_especiais(nome,aguarda_autorizacao,ativo)),servico:nf_servicos(parametro_fiscal_id)').eq('status','pago_ok'),
  db.from('nf_aliquota_mes').select('competencia,aliquota_simples'),
  db.from('nf_notas').select('status,envios:nf_envios(status,created_at)').in('status',['erro','autorizada'])]);
 const al=new Map(okList(aliqs).map(a=>[a.competencia,Number(a.aliquota_simples)]));
 const conferencia=okList(rows).filter(r=>{const p=r.paciente;return calcularBloqueios({atendimento:{data_atendimento:r.data_atendimento,valor:Number(r.valor),convenio:r.convenio,aprovado_em:r.aprovado_em,autorizacao_liberada:r.autorizacao_liberada},paciente:{cpf:p?.cpf??null,cep:p?.cep??null,logradouro:p?.logradouro??null,numero:p?.numero??null,municipio_ibge:p?.municipio_ibge??null},servico:r.servico,aliquotaDoMes:al.get(competenciaDe(r.data_atendimento))??null,regra:p?.regra??null}).length===0;}).length;
 return {conferencia,notas:contarNotasAtencao(okList(notas))};
});

// ---- Demo cleanup preview ----
export const contarDadosDemo=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const ats=okList(await db.from('nf_atendimentos').select('id').eq('demo',true));
 const pac=await db.from('nf_pacientes').select('id',{count:'exact',head:true}).eq('demo',true);if(pac.error)throw new Error(pac.error.message);
 const notas=ats.length?okList(await db.from('nf_notas').select('id,pdf_path,xml_path').in('atendimento_id',ats.map(a=>a.id))):[];
 const env=notas.length?await db.from('nf_envios').select('id',{count:'exact',head:true}).in('nota_id',notas.map(n=>n.id)):{count:0,error:null};
 if(env.error)throw new Error(env.error.message);
 return {pacientes:pac.count??0,atendimentos:ats.length,notas:notas.length,envios:env.count??0,arquivos:notas.reduce((s,n)=>s+(n.pdf_path?1:0)+(n.xml_path?1:0),0)};
});
void ok;
