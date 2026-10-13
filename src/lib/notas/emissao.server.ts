// Server-only emission engine shared by server functions and the issuer webhook.
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/integrations/supabase/types';
import {ok,okOne,okList} from './service.server';
import {calcularBloqueios,competenciaDe,type Genero} from './rules';
import {montarNota,traduzirErro,type Ambiente,type NotaPayload} from './nota';
import {MockEmissor} from './emissor/mock';
import {FocusEmissor} from './emissor/focus';
import type {EmissorNFSe,ResultadoEmissao} from './emissor/types';

type Db=SupabaseClient<Database>;
export type Auditor=(acao:string,entidade:string,id:string|null,antes:unknown,depois:unknown)=>Promise<void>;

export function disponibilidadeModos(emitente:{cnpj:string|null;parametros_validados_em:string|null}|null){
 const hom=!!process.env['FOCUS_NFE_TOKEN_HOMOLOGACAO'];const prod=!!process.env['FOCUS_NFE_TOKEN_PRODUCAO'];
 const faltasProd=[!emitente?.cnpj&&'CNPJ do consultório',!emitente?.parametros_validados_em&&'validação do contador',!prod&&'token de produção da Focus NFe'].filter(Boolean) as string[];
 return {
  mock:{ok:true,motivo:null as string|null},
  homologacao:{ok:hom,motivo:hom?null:'Falta configurar o token de homologação da Focus NFe.'},
  producao:{ok:faltasProd.length===0,motivo:faltasProd.length?`Falta: ${faltasProd.join(', ')}.`:null},
 };
}

export function criarEmissor(db:Db,ambiente:Ambiente):EmissorNFSe{
 if(ambiente==='mock')return new MockEmissor({
  buscar:async ref=>{const n=ok(await db.from('nf_notas').select('payload_enviado,enviada_ao_emissor_em,numero,chave_acesso,emitida_em').eq('ref_externa',ref).maybeSingle());
   return n?{payload:n.payload_enviado as unknown as NotaPayload,enviadoEm:n.enviada_ao_emissor_em,numero:n.numero,chave:n.chave_acesso,emitidaEm:n.emitida_em}:null;},
  proximoNumero:async()=>Number(ok(await db.rpc('nf_mock_proximo_numero'))),
 });
 return new FocusEmissor(ambiente,process.env[ambiente==='producao'?'FOCUS_NFE_TOKEN_PRODUCAO':'FOCUS_NFE_TOKEN_HOMOLOGACAO']);
}

/** Builds the neutral payload for an appointment with the service's own fiscal-parameter version and the month's rate. */
export async function montarParaAtendimento(db:Db,atendimentoId:string,referencia:string,ambiente:Ambiente){
 const a=okOne(await db.from('nf_atendimentos').select('id,status,data_atendimento,valor,quantidade,convenio,aprovado_em,autorizacao_liberada,paciente:nf_pacientes(*,regra:nf_regras_especiais(*)),servico:nf_servicos(id,nome,descricao_nota,genero,parametro_fiscal_id)').eq('id',atendimentoId).maybeSingle());
 const comp=competenciaDe(a.data_atendimento);
 const [emit,aliq,par]=await Promise.all([
  db.from('nf_emitente').select('*').eq('id',true).maybeSingle(),
  db.from('nf_aliquota_mes').select('aliquota_simples').eq('competencia',comp).maybeSingle(),
  a.servico?.parametro_fiscal_id?db.from('nf_parametros_fiscais').select('*').eq('id',a.servico.parametro_fiscal_id).maybeSingle():Promise.resolve({data:null,error:null}),
 ]);
 const emitente=ok(emit);const aliquota=ok(aliq);const parametro=ok(par);const p=a.paciente!;
 const bloqueios=calcularBloqueios({atendimento:{data_atendimento:a.data_atendimento,valor:Number(a.valor),convenio:a.convenio,aprovado_em:a.aprovado_em,autorizacao_liberada:a.autorizacao_liberada},paciente:p,servico:a.servico,aliquotaDoMes:aliquota?Number(aliquota.aliquota_simples):null,regra:p.regra});
 if(!emitente)bloqueios.push({codigo:'servico_sem_parametro',mensagem:'Emitente não cadastrado.'});
 const payload=bloqueios.length||!emitente||!parametro||!a.servico||!aliquota?null:montarNota({
  atendimento:{data_atendimento:a.data_atendimento,valor:Number(a.valor),quantidade:a.quantidade},
  servico:{descricao_nota:a.servico.descricao_nota,genero:a.servico.genero as Genero},
  paciente:p,regra:p.regra,emitente,parametro,aliquota:Number(aliquota.aliquota_simples),referencia,ambiente});
 return {atendimento:a,bloqueios,payload,parametro_fiscal_id:parametro?.id??null,aliquota:aliquota?Number(aliquota.aliquota_simples):null};
}

const notaCols='id,status,ref_externa,ambiente,payload_enviado,enviada_ao_emissor_em,numero,chave_acesso,emitida_em,atendimento_id,lote_id,updated_at,pdf_path,xml_path,tentativas';

/** Applies an issuer answer to a note. Safe to call repeatedly (webhook + polling race). */
export async function aplicarResultado(db:Db,notaId:string,r:ResultadoEmissao,auditar:Auditor){
 const n=okOne(await db.from('nf_notas').select(notaCols).eq('id',notaId).single());
 if(['autorizada','cancelada','substituida'].includes(n.status))return {status:n.status,mensagem:null};
 if(r.status==='processando'){ok(await db.from('nf_notas').update({status:'processando',resposta:r.bruto as Json}).eq('id',n.id).in('status',['pendente','processando']));return {status:'processando',mensagem:null};}
 if(r.status==='erro'){
  const msg=traduzirErro(r.mensagem);
  const up=okList(await db.from('nf_notas').update({status:'erro',mensagem_erro:msg,resposta:{original:r.mensagem??null,bruto:r.bruto} as Json}).eq('id',n.id).in('status',['pendente','processando']).select('id'));
  if(up.length){ok(await db.from('nf_atendimentos').update({status:'erro_emissao'}).eq('id',n.atendimento_id).eq('status','emitindo'));await auditar('erro_emissao','nf_notas',n.id,{status:n.status},{status:'erro',mensagem:msg,original:r.mensagem});}
  return {status:'erro',mensagem:msg};
 }
 // autorizada: fix number/key once, then files, then final status.
 const emitidaEm=n.emitida_em??new Date().toISOString();
 if(!n.numero)ok(await db.from('nf_notas').update({numero:r.numero??null,chave_acesso:r.chave??null,emitida_em:emitidaEm,resposta:r.bruto as Json}).eq('id',n.id).is('numero',null));
 const emissor=criarEmissor(db,n.ambiente);const pasta=competenciaDe(emitidaEm.slice(0,10));
 const [pdf,xml]=await Promise.all([emissor.baixarPdf(n.ref_externa),emissor.baixarXml(n.ref_externa)]);
 const pdfPath=`${pasta}/${n.id}.pdf`,xmlPath=`${pasta}/${n.id}.xml`;
 const st=db.storage.from('notas');
 const [u1,u2]=await Promise.all([st.upload(pdfPath,pdf,{contentType:'application/pdf',upsert:true}),st.upload(xmlPath,new TextEncoder().encode(xml),{contentType:'application/xml',upsert:true})]);
 if(u1.error||u2.error)throw new Error(`Falha ao guardar PDF/XML: ${(u1.error??u2.error)!.message}`);
 const fin=okList(await db.from('nf_notas').update({status:'autorizada',pdf_path:pdfPath,xml_path:xmlPath,mensagem_erro:null}).eq('id',n.id).in('status',['pendente','processando']).select('id,numero'));
 if(fin.length){ok(await db.from('nf_atendimentos').update({status:'emitido'}).eq('id',n.atendimento_id).eq('status','emitindo'));await auditar('nota_autorizada','nf_notas',n.id,{status:n.status},{status:'autorizada',numero:fin[0]?.numero});
  const {envioAutomatico}=await import('./envio/envio.server');await envioAutomatico(db,n.id,auditar);}
 return {status:'autorizada',mensagem:null};
}

/** One step for one note: claims pending notes (only one caller sends), otherwise queries the issuer. */
export async function processarNota(db:Db,notaId:string,auditar:Auditor){
 const n=okOne(await db.from('nf_notas').select(notaCols).eq('id',notaId).single());
 if(['autorizada','cancelada','substituida','erro'].includes(n.status))return {status:n.status,mensagem:null};
 const emissor=criarEmissor(db,n.ambiente);const payload=n.payload_enviado as unknown as NotaPayload;
 const enviar=async()=>{const r=await emissor.emitir(payload);ok(await db.from('nf_notas').update({enviada_ao_emissor_em:new Date().toISOString()}).eq('id',n.id));return r;};
 let r:ResultadoEmissao;
 if(n.status==='pendente'){
  const claim=okList(await db.from('nf_notas').update({status:'processando',tentativas:n.tentativas+1,enviada_ao_emissor_em:null}).eq('id',n.id).eq('status','pendente').select('id'));
  if(!claim.length)return {status:'processando',mensagem:null};
  r=await enviar();
 }else if(!n.enviada_ao_emissor_em){
  // Claimed but never confirmed as sent (crash/refresh): resend after 30 s with the SAME ref (issuer dedups by ref).
  if(Date.now()-new Date(n.updated_at).getTime()<30000)return {status:'processando',mensagem:null};
  const again=okList(await db.from('nf_notas').update({tentativas:n.tentativas+1}).eq('id',n.id).eq('updated_at',n.updated_at).select('id'));
  if(!again.length)return {status:'processando',mensagem:null};
  r=await enviar();
 }else r=await emissor.consultar(n.ref_externa);
 return aplicarResultado(db,n.id,r,auditar);
}

export async function atualizarStatusLote(db:Db,loteId:string){
 const ns=okList(await db.from('nf_notas').select('status').eq('lote_id',loteId));
 const abertos=ns.some(x=>x.status==='pendente'||x.status==='processando');const erros=ns.some(x=>x.status==='erro');
 const status=abertos?'emitindo':erros?'concluido_com_erros':'concluido';
 ok(await db.from('nf_lotes').update({status}).eq('id',loteId).neq('status',status));return status;
}
