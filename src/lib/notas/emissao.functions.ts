import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import type {Json} from '@/integrations/supabase/types';
import {exigirPapel,ok,okOne,okList,auditar} from './service.server';
import {calcularBloqueios,competenciaDe,type Genero} from './rules';
import {montarNota,type NotaPayload} from './nota';
import {disponibilidadeModos,criarEmissor,montarParaAtendimento,processarNota,atualizarStatusLote,type Auditor} from './emissao.server';

const op={operador_id:z.string().uuid().nullish()};
const uuid=z.string().uuid();
type Db=Parameters<typeof auditar>[0];
const auditor=(db:Db,operador:string|null|undefined):Auditor=>(acao,entidade,id,antes,depois)=>auditar(db,operador,acao,entidade,id,antes,depois);

export const statusEmissor=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;const papel=await exigirPapel(db,context.userId);
 const e=ok(await db.from('nf_emitente').select('emissor_modo,cnpj,parametros_validados_em').eq('id',true).maybeSingle());
 return {papel,modo:e?.emissor_modo??'mock',disponiveis:disponibilidadeModos(e),producaoLiberada:!!(e?.cnpj&&e.parametros_validados_em)};
});

export const alterarModoEmissor=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({modo:z.enum(['mock','homologacao','producao']),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const e=okOne(await db.from('nf_emitente').select('emissor_modo,cnpj,parametros_validados_em').eq('id',true).single());
 const disp=disponibilidadeModos(e)[data.modo];if(!disp.ok)throw new Error(disp.motivo??'Modo indisponível.');
 ok(await db.from('nf_emitente').update({emissor_modo:data.modo}).eq('id',true));
 await auditar(db,data.operador_id,'alterar_modo_emissor','nf_emitente','true',{emissor_modo:e.emissor_modo},{emissor_modo:data.modo});
 return {modo:data.modo};
});

/** Paid appointments of any date without an active note, with blockers and a note preview. */
export const listarConferencia=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const [rows,emit,pars,aliqs]=await Promise.all([
  db.from('nf_atendimentos').select('id,data_atendimento,status,valor,quantidade,forma_pagamento,convenio,aprovado_em,autorizacao_liberada,servico_id,demo,paciente:nf_pacientes(*,regra:nf_regras_especiais(*)),servico:nf_servicos(id,nome,descricao_nota,genero,parametro_fiscal_id),medico:nf_medicos(nome)').eq('status','pago_ok').order('data_atendimento',{ascending:false}).order('created_at'),
  db.from('nf_emitente').select('*').eq('id',true).maybeSingle(),
  db.from('nf_parametros_fiscais').select('*'),
  db.from('nf_aliquota_mes').select('competencia,aliquota_simples')]);
 const emitente=ok(emit);const parametros=new Map(okList(pars).map(p=>[p.id,p]));const aliquotas=new Map(okList(aliqs).map(a=>[a.competencia,Number(a.aliquota_simples)]));
 const modo=emitente?.emissor_modo??'mock';
 return {modo,linhas:okList(rows).map(r=>{
  const p=r.paciente!;const aliq=aliquotas.get(competenciaDe(r.data_atendimento))??null;const par=r.servico?.parametro_fiscal_id?parametros.get(r.servico.parametro_fiscal_id)??null:null;
  const bloqueios=calcularBloqueios({atendimento:{data_atendimento:r.data_atendimento,valor:Number(r.valor),convenio:r.convenio,aprovado_em:r.aprovado_em,autorizacao_liberada:r.autorizacao_liberada},paciente:p,servico:r.servico,aliquotaDoMes:aliq,regra:p.regra});
  const previa=!bloqueios.length&&emitente&&par&&r.servico&&aliq!=null?montarNota({atendimento:{data_atendimento:r.data_atendimento,valor:Number(r.valor),quantidade:r.quantidade},servico:{descricao_nota:r.servico.descricao_nota,genero:r.servico.genero as Genero},paciente:p,regra:p.regra,emitente,parametro:par,aliquota:aliq,referencia:'(gerada na aprovação)',ambiente:modo}):null;
  return {...r,valor:Number(r.valor),bloqueios,previa};
 })};
});

export const aprovarEmitir=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_ids:z.array(uuid).min(1).max(200),chave:z.string().min(16).max(80),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 if(!data.operador_id)throw new Error('Escolha a operadora antes de aprovar.');
 const existente=ok(await db.from('nf_lotes').select('id').eq('chave_idempotencia',data.chave).maybeSingle());
 if(existente)return {lote_id:existente.id,repetido:true};
 const e=okOne(await db.from('nf_emitente').select('emissor_modo,cnpj,parametros_validados_em').eq('id',true).single());
 const disp=disponibilidadeModos(e)[e.emissor_modo];if(!disp.ok)throw new Error(`Modo de emissão indisponível: ${disp.motivo}`);
 const itens=[];const bloqueadas:string[]=[];
 for(const id of [...new Set(data.atendimento_ids)]){
  const ref=crypto.randomUUID();const m=await montarParaAtendimento(db,id,ref,e.emissor_modo);
  if(m.atendimento.status!=='pago_ok')continue;
  if(!m.payload){bloqueadas.push(`${m.atendimento.paciente?.nome}: ${m.bloqueios.map(b=>b.mensagem).join(' ')}`);continue;}
  itens.push({atendimento_id:id,ref_externa:ref,payload:m.payload,parametro_fiscal_id:m.parametro_fiscal_id,aliquota:m.aliquota,descricao:m.payload.servico.descricao,valor:m.payload.valores.servico});
 }
 if(bloqueadas.length)throw new Error(`Há notas bloqueadas: ${bloqueadas.join(' | ')}`);
 if(!itens.length)throw new Error('Nenhuma das notas selecionadas está pronta (talvez já tenham sido emitidas). Atualize a tela.');
 const lote=okOne(await db.rpc('nf_criar_lote',{_chave:data.chave,_operador:data.operador_id,_ambiente:e.emissor_modo,_itens:itens as unknown as Json}));
 const notas=okList(await db.from('nf_notas').select('id,atendimento_id').eq('lote_id',lote));
 await auditar(db,data.operador_id,'aprovar_lote','nf_lotes',lote,null,{notas:notas.length,ambiente:e.emissor_modo});
 for(const n of notas)await auditar(db,data.operador_id,'aprovar_emitir','nf_atendimentos',n.atendimento_id,{status:'pago_ok'},{status:'emitindo',via:'aprovado',nota_id:n.id,lote_id:lote});
 return {lote_id:lote,repetido:false};
});

export const processarNotaFn=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nota_id:uuid,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const r=await processarNota(db,data.nota_id,auditor(db,data.operador_id));
 const n=okOne(await db.from('nf_notas').select('lote_id').eq('id',data.nota_id).single());if(n.lote_id)await atualizarStatusLote(db,n.lote_id);
 return r;
});

export const statusLote=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({lote_id:uuid})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const [lote,notas]=await Promise.all([
  db.from('nf_lotes').select('*,operador:nf_operadores(nome)').eq('id',data.lote_id).maybeSingle(),
  db.from('nf_notas').select('id,status,numero,ref_externa,ambiente,mensagem_erro,descricao_usada,tentativas,emitida_em,pdf_path,atendimento:nf_atendimentos(id,status,valor,data_atendimento,paciente:nf_pacientes(*))').eq('lote_id',data.lote_id).order('created_at')]);
 const l=ok(lote);if(!l)throw new Error('Lote não encontrado.');
 return {lote:l,notas:okList(notas).map(n=>({...n,valor:Number(n.atendimento?.valor??0)}))};
});

export const sincronizarPendentes=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const ns=okList(await db.from('nf_notas').select('id,lote_id').in('status',['pendente','processando']).limit(50));
 const res:Record<string,number>={};const lotes=new Set<string>();
 for(const n of ns){try{const r=await processarNota(db,n.id,auditor(db,data.operador_id));res[r.status]=(res[r.status]??0)+1;}catch{res['falha']=(res['falha']??0)+1;}if(n.lote_id)lotes.add(n.lote_id);}
 for(const l of lotes)await atualizarStatusLote(db,l);
 return {verificadas:ns.length,resultado:res};
});

/** Retry keeps the SAME ref_externa; the payload is rebuilt from the corrected data. */
export const tentarDeNovo=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nota_id:uuid,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const n=okOne(await db.from('nf_notas').select('id,status,ref_externa,ambiente,atendimento_id,lote_id').eq('id',data.nota_id).single());
 if(n.status!=='erro')throw new Error('Só notas com erro podem ser reenviadas.');
 const m=await montarParaAtendimento(db,n.atendimento_id,n.ref_externa,n.ambiente);
 if(!m.payload)throw new Error(`Corrija antes de tentar: ${m.bloqueios.map(b=>b.mensagem).join(' ')}`);
 const up=okList(await db.from('nf_notas').update({status:'pendente',mensagem_erro:null,payload_enviado:m.payload as unknown as Json,parametro_fiscal_id:m.parametro_fiscal_id,aliquota_simples_usada:m.aliquota,descricao_usada:m.payload.servico.descricao}).eq('id',n.id).eq('status','erro').select('id'));
 if(!up.length)throw new Error('A nota já está sendo reenviada.');
 ok(await db.from('nf_atendimentos').update({status:'emitindo'}).eq('id',n.atendimento_id).eq('status','erro_emissao'));
 await auditar(db,data.operador_id,'tentar_de_novo','nf_notas',n.id,{status:'erro'},{status:'pendente',ref_externa:n.ref_externa});
 if(n.lote_id)ok(await db.from('nf_lotes').update({status:'emitindo'}).eq('id',n.lote_id));
 return {nota_id:n.id,lote_id:n.lote_id,ref_externa:n.ref_externa};
});

export const listarNotas=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({de:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),ate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),status:z.enum(['pendente','processando','autorizada','erro','cancelada','substituida']).nullish(),medico_id:uuid.nullish()})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 let q=db.from('nf_notas').select('id,status,numero,ambiente,ref_externa,mensagem_erro,emitida_em,cancelada_em,motivo_cancelamento,substituida_por,pdf_path,xml_path,lote_id,created_at,descricao_usada,atendimento:nf_atendimentos!inner(id,status,valor,data_atendimento,medico_id,paciente:nf_pacientes(*,regra:nf_regras_especiais(id,nome)),servico:nf_servicos(id,nome),medico:nf_medicos(id,nome)),envios:nf_envios(canal,status)').gte('atendimento.data_atendimento',data.de).lte('atendimento.data_atendimento',data.ate).order('created_at',{ascending:false}).limit(500);
 if(data.status)q=q.eq('status',data.status);
 if(data.medico_id)q=q.eq('atendimento.medico_id',data.medico_id);
 return okList(await q).map(n=>({...n,valor:Number(n.atendimento?.valor??0)}));
});

export const urlArquivoNota=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nota_id:uuid,tipo:z.enum(['pdf','xml'])})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const n=okOne(await db.from('nf_notas').select('pdf_path,xml_path,numero').eq('id',data.nota_id).single());
 const path=data.tipo==='pdf'?n.pdf_path:n.xml_path;if(!path)throw new Error('Arquivo ainda não disponível.');
 const r=await db.storage.from('notas').createSignedUrl(path,600,data.tipo==='xml'?{download:`nfse-${n.numero??data.nota_id}.xml`}:undefined);
 if(r.error)throw new Error('Não foi possível gerar o link do arquivo.');
 return {url:r.data.signedUrl};
});

export const cancelarNota=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nota_id:uuid,motivo:z.string().trim().min(5,'Informe o motivo.').max(255),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const n=okOne(await db.from('nf_notas').select('id,status,ref_externa,ambiente,atendimento_id').eq('id',data.nota_id).single());
 if(n.status!=='autorizada')throw new Error('Só notas autorizadas podem ser canceladas.');
 const r=await criarEmissor(db,n.ambiente).cancelar(n.ref_externa,data.motivo);
 if(!r.ok)throw new Error(`O emissor recusou o cancelamento: ${r.mensagem??'motivo não informado'}`);
 const up=okList(await db.from('nf_notas').update({status:'cancelada',cancelada_em:new Date().toISOString(),motivo_cancelamento:data.motivo,resposta:{cancelamento:r.bruto} as Json}).eq('id',n.id).eq('status','autorizada').select('id'));
 if(!up.length)throw new Error('A nota já foi alterada. Atualize a tela.');
 const a=okOne(await db.from('nf_atendimentos').select('status').eq('id',n.atendimento_id).single());
 if(['emitido','enviado','erro_envio'].includes(a.status))ok(await db.from('nf_atendimentos').update({status:'pago_ok',aprovado_por:null,aprovado_em:null}).eq('id',n.atendimento_id).eq('status',a.status));
 await auditar(db,data.operador_id,'cancelar_nota','nf_notas',n.id,{status:'autorizada',atendimento:a.status},{status:'cancelada',motivo:data.motivo,atendimento:'pago_ok'});
 return {ok:true,atendimento_id:n.atendimento_id};
});

/** Re-issue after correction: new note with a NEW ref_externa; the cancelled one becomes "substituida". */
export const reemitirNota=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nota_id:uuid,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 if(!data.operador_id)throw new Error('Escolha a operadora antes de reemitir.');
 const old=okOne(await db.from('nf_notas').select('id,status,atendimento_id,substituida_por').eq('id',data.nota_id).single());
 if(old.status==='substituida'&&old.substituida_por){const nv=okOne(await db.from('nf_notas').select('lote_id').eq('id',old.substituida_por).single());return {lote_id:nv.lote_id};}
 if(old.status!=='cancelada')throw new Error('Cancele a nota antes de reemitir.');
 const e=okOne(await db.from('nf_emitente').select('emissor_modo,cnpj,parametros_validados_em').eq('id',true).single());
 const disp=disponibilidadeModos(e)[e.emissor_modo];if(!disp.ok)throw new Error(`Modo de emissão indisponível: ${disp.motivo}`);
 const ref=crypto.randomUUID();const m=await montarParaAtendimento(db,old.atendimento_id,ref,e.emissor_modo);
 if(!m.payload)throw new Error(`Corrija antes de reemitir: ${m.bloqueios.map(b=>b.mensagem).join(' ')}`);
 const lote=okOne(await db.rpc('nf_criar_lote',{_chave:`reemitir:${old.id}`,_operador:data.operador_id,_ambiente:e.emissor_modo,_itens:[{atendimento_id:old.atendimento_id,ref_externa:ref,payload:m.payload,parametro_fiscal_id:m.parametro_fiscal_id,aliquota:m.aliquota,descricao:m.payload.servico.descricao,valor:m.payload.valores.servico}] as unknown as Json}));
 const nova=ok(await db.from('nf_notas').select('id').eq('lote_id',lote).maybeSingle());
 if(!nova)throw new Error('Não foi possível criar a nova nota. O atendimento precisa estar pronto para conferir.');
 ok(await db.from('nf_notas').update({status:'substituida',substituida_por:nova.id}).eq('id',old.id).eq('status','cancelada'));
 await auditar(db,data.operador_id,'reemitir_nota','nf_notas',old.id,{status:'cancelada'},{status:'substituida',substituida_por:nova.id,lote_id:lote});
 return {lote_id:lote};
});

export type PreviaNota=NotaPayload;
