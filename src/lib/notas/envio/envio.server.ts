// Server-only delivery engine: used by server functions, the batch flow and the issuer webhook (auto-send).
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/integrations/supabase/types';
import {ok,okOne} from '../service.server';
import type {Auditor} from '../emissao.server';
import {escolherCanal,assuntoEmail,htmlEmail,textoWhatsApp,primeiroNome,nomesAnexos,dataBR,valorBR,emailValido,celularValido,type Canal,type Vars} from './regras';
import {criarEmailSender,criarWhatsAppSender} from './senders';
import {somenteDigitos} from '../rules';

type Db=SupabaseClient<Database>;
export const APP_URL_PADRAO='https://goable-bruno.lovable.app';

export async function origemApp(){
 try{const {getRequestUrl}=await import('@tanstack/react-start/server');const u=getRequestUrl();if(u?.origin&&u.origin!=='null')return u.origin;}catch{/* outside a request */}
 return process.env['APP_URL']||APP_URL_PADRAO;
}

const token32=()=>{const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};

/** New patient link for a note; revokes every previous link of the same note. */
export async function novoLinkPaciente(db:Db,notaId:string,origem:string){
 {const {garantirArquivos}=await import('../arquivos.server');await garantirArquivos(db,notaId);}
 ok(await db.from('nf_links_paciente').update({revogado:true}).eq('nota_id',notaId).eq('revogado',false));
 const token=token32();
 const l=okOne(await db.from('nf_links_paciente').insert({nota_id:notaId,token}).select('id').single());
 return {id:l.id,url:`${origem}/nota/${token}`};
}

async function textos(db:Db){const t=ok(await db.from('nf_textos_envio').select('chave,conteudo'));return Object.fromEntries((t??[]).map(x=>[x.chave,x.conteudo])) as Record<string,string>;}

/**
 * Sends one authorized note. Without channel/destination the rule decides (e-mail → WhatsApp → sem contato).
 * Always records an nf_envios row (including simulated content), audits, and moves the appointment to enviado/erro_envio.
 */
export async function enviarNota(db:Db,notaId:string,auditar:Auditor,opts:{canal?:Canal;destino?:string;origem?:string}={}){
 {const {garantirArquivos}=await import('../arquivos.server');await garantirArquivos(db,notaId);}
 const n=okOne(await db.from('nf_notas').select('id,status,numero,ambiente,pdf_path,xml_path,atendimento:nf_atendimentos(id,status,valor,data_atendimento,paciente:nf_pacientes(id,nome,email,celular))').eq('id',notaId).single());
 if(n.status!=='autorizada')throw new Error('Só notas autorizadas podem ser enviadas.');
 const a=n.atendimento!;const p=a.paciente!;
 let alvo:{canal:Canal;destino:string}|null;
 if(opts.canal){
  const d=(opts.destino??'').trim();
  if(opts.canal==='email'&&!emailValido(d))throw new Error('Informe um e-mail válido.');
  if(opts.canal==='whatsapp'&&!celularValido(d))throw new Error('Informe um celular válido com DDD.');
  alvo={canal:opts.canal,destino:opts.canal==='email'?d.toLowerCase():somenteDigitos(d)};
 }else alvo=escolherCanal(p);
 if(!alvo){
  const e=okOne(await db.from('nf_envios').insert({nota_id:n.id,canal:'email',destino:'',status:'sem_contato',erro:'Paciente sem e-mail e sem celular.'}).select('id').single());
  await auditar('envio_sem_contato','nf_notas',n.id,null,{envio_id:e.id});
  return {status:'sem_contato' as const,envio_id:e.id};
 }
 const emit=ok(await db.from('nf_emitente').select('razao_social,email_remetente').eq('id',true).maybeSingle());
 const t=await textos(db);const consultorio='BNaves Consultório de Angiologia';
 const v:Vars={nome:primeiroNome(p.nome),data:dataBR(a.data_atendimento),valor:valorBR(Number(a.valor)),link:'',consultorio};
 let status:'enviado'|'simulado'|'erro';let erro:string|undefined;let provider:string|undefined;let conteudo:string;let assunto:string|null=null;let anexos:{nome:string;path:string}[]=[];let linkId:string|null=null;
 if(alvo.canal==='email'){
  if(!n.pdf_path||!n.xml_path)throw new Error('PDF/XML da nota ainda não disponíveis.');
  const nomes=nomesAnexos(n.numero,p.nome);anexos=[{nome:nomes.pdf,path:`notas/${n.pdf_path}`},{nome:nomes.xml,path:`notas/${n.xml_path}`}];
  v.link='(a nota segue em anexo neste e-mail)';
  assunto=assuntoEmail(t['email_assunto'],v,n.ambiente==='mock');conteudo=htmlEmail(t['email_corpo']??'',v);
  const baixar=(path:string)=>async()=>{const r=await db.storage.from('notas').download(path);if(r.error)throw new Error('Não foi possível ler o anexo.');return new Uint8Array(await r.data.arrayBuffer());};
  const r=await criarEmailSender().enviar({de:emit?.email_remetente??null,nomeDe:consultorio,para:alvo.destino,assunto,html:conteudo,anexos:[{...anexos[0]!,conteudo:baixar(n.pdf_path)},{...anexos[1]!,conteudo:baixar(n.xml_path)}]});
  status=r.status;erro=r.erro;provider=r.providerId;
 }else{
  const link=await novoLinkPaciente(db,n.id,opts.origem??await origemApp());linkId=link.id;v.link=link.url;
  conteudo=textoWhatsApp(t['whatsapp']??'Olá, {{nome}}! Sua nota fiscal do atendimento de {{data}} está disponível: {{link}}',v);
  const r=await criarWhatsAppSender().enviar({para:alvo.destino,texto:conteudo,params:{nome:v.nome,data:v.data,link:link.url}});
  status=r.status;erro=r.erro;provider=r.providerId;
 }
 const e=okOne(await db.from('nf_envios').insert({nota_id:n.id,canal:alvo.canal,destino:alvo.destino,status,erro:erro??null,provider_id:provider??null,enviado_em:status==='erro'?null:new Date().toISOString(),conteudo_renderizado:conteudo,assunto,anexos:anexos as unknown as Json,link_id:linkId}).select('id').single());
 const novo=status==='erro'?'erro_envio':'enviado';
 ok(await db.from('nf_atendimentos').update({status:novo}).eq('id',a.id).in('status',novo==='enviado'?['emitido','erro_envio','enviado']:['emitido','erro_envio']));
 await auditar(status==='erro'?'erro_envio':'enviar_nota','nf_notas',n.id,{atendimento:a.status},{envio_id:e.id,canal:alvo.canal,status,erro:erro??null});
 return {status,envio_id:e.id,canal:alvo.canal,erro:erro??null};
}

/** Called once when a note first becomes authorized; never throws (emission must not fail because of delivery). */
export async function envioAutomatico(db:Db,notaId:string,auditar:Auditor){
 try{
  const e=ok(await db.from('nf_emitente').select('envio_automatico').eq('id',true).maybeSingle());
  if(!e?.envio_automatico)return;
  const ja=ok(await db.from('nf_envios').select('id').eq('nota_id',notaId).limit(1));
  if(ja?.length)return;
  await enviarNota(db,notaId,auditar);
 }catch(err){await auditar('erro_envio','nf_notas',notaId,null,{erro:err instanceof Error?err.message:String(err),automatico:true}).catch(()=>{});}
}

export const ENVIO_OK=['enviado','simulado'];
