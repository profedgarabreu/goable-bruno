import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {exigirPapel,ok,okOne,okList,auditar} from './service.server';
import type {Auditor} from './emissao.server';
import {emailValido,celularValido,htmlEmail,assuntoEmail,textoWhatsApp,primeiroNome} from './envio/regras';
import {somenteDigitos} from './rules';

const op={operador_id:z.string().uuid().nullish()};
const uuid=z.string().uuid();
type Db=Parameters<typeof auditar>[0];
const auditor=(db:Db,operador:string|null|undefined):Auditor=>(acao,entidade,id,antes,depois)=>auditar(db,operador,acao,entidade,id,antes,depois);

export const statusEnvio=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;const papel=await exigirPapel(db,context.userId);
 const {estadoCanais}=await import('./envio/senders');
 const e=ok(await db.from('nf_emitente').select('envio_automatico').eq('id',true).maybeSingle());
 return {papel,envio_automatico:e?.envio_automatico??true,canais:estadoCanais()};
});

export const alterarEnvioAutomatico=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({ligado:z.boolean(),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 ok(await db.from('nf_emitente').update({envio_automatico:data.ligado}).eq('id',true));
 await auditar(db,data.operador_id,'alterar_envio_automatico','nf_emitente','true',{envio_automatico:!data.ligado},{envio_automatico:data.ligado});
 return {ligado:data.ligado};
});

/** Manual send / resend / "informar contato e enviar". Optionally saves the destination on the patient. */
export const enviarNotaFn=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nota_id:uuid,canal:z.enum(['email','whatsapp']).nullish(),destino:z.string().max(200).nullish(),atualizar_cadastro:z.boolean().default(false),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const {enviarNota}=await import('./envio/envio.server');
 if(data.canal&&data.atualizar_cadastro){
  const d=(data.destino??'').trim();
  if(data.canal==='email'&&!emailValido(d))throw new Error('Informe um e-mail válido.');
  if(data.canal==='whatsapp'&&!celularValido(d))throw new Error('Informe um celular válido com DDD.');
  const n=okOne(await db.from('nf_notas').select('atendimento:nf_atendimentos(paciente:nf_pacientes(id,email,celular))').eq('id',data.nota_id).single());
  const p=n.atendimento!.paciente!;const campo=data.canal==='email'?'email':'celular';const novo=data.canal==='email'?d.toLowerCase():somenteDigitos(d);
  if(p[campo]!==novo){ok(await db.from('nf_pacientes').update(campo==='email'?{email:novo}:{celular:novo}).eq('id',p.id));await auditar(db,data.operador_id,'atualizar_contato','nf_pacientes',p.id,{[campo]:p[campo]},{[campo]:novo});}
 }
 return enviarNota(db,data.nota_id,auditor(db,data.operador_id),data.canal?{canal:data.canal,destino:data.destino??''}:{});
});

/** Sends every authorized note of a batch that has no successful delivery yet. */
export const enviarPendentesLote=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({lote_id:uuid,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const {enviarNota,ENVIO_OK}=await import('./envio/envio.server');
 const ns=okList(await db.from('nf_notas').select('id,envios:nf_envios(status)').eq('lote_id',data.lote_id).eq('status','autorizada'));
 const res:Record<string,number>={};
 for(const n of ns){if((n.envios??[]).some(e=>ENVIO_OK.includes(e.status)))continue;
  try{const r=await enviarNota(db,n.id,auditor(db,data.operador_id));res[r.status]=(res[r.status]??0)+1;}catch{res['falha']=(res['falha']??0)+1;}}
 return res;
});

export const verMensagem=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nota_id:uuid})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 return okList(await db.from('nf_envios').select('id,canal,destino,status,erro,assunto,conteudo_renderizado,anexos,created_at').eq('nota_id',data.nota_id).order('created_at',{ascending:false}));
});

export const copiarLinkPaciente=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nota_id:uuid,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const n=okOne(await db.from('nf_notas').select('id,status').eq('id',data.nota_id).single());
 if(n.status!=='autorizada')throw new Error('Só notas autorizadas têm link para o paciente.');
 const {novoLinkPaciente,origemApp}=await import('./envio/envio.server');
 const l=await novoLinkPaciente(db,n.id,await origemApp());
 await auditar(db,data.operador_id,'gerar_link_paciente','nf_notas',n.id,null,{link_id:l.id,anteriores:'revogados'});
 return {url:l.url};
});

const exemplo={nome:'Maria',data:'13/10/2026',valor:'R$ 470,00',consultorio:'BNaves Consultório de Angiologia'};
export const emailTeste=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({destino:z.string().max(200),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 if(!emailValido(data.destino))throw new Error('Informe um e-mail válido.');
 const {criarEmailSender}=await import('./envio/senders');
 const t=Object.fromEntries(okList(await db.from('nf_textos_envio').select('chave,conteudo')).map(x=>[x.chave,x.conteudo]));
 const e=ok(await db.from('nf_emitente').select('email_remetente,emissor_modo').eq('id',true).maybeSingle());
 const v={...exemplo,link:'(a nota segue em anexo neste e-mail)'};
 const assunto=`[TESTE] ${assuntoEmail(t['email_assunto'],v,e?.emissor_modo==='mock')}`;const html=htmlEmail(t['email_corpo']??'',v);
 const s=criarEmailSender();const r=await s.enviar({de:e?.email_remetente??null,nomeDe:exemplo.consultorio,para:data.destino.trim(),assunto,html,anexos:[]});
 await auditar(db,data.operador_id,'email_teste','nf_textos_envio',null,null,{destino:data.destino,status:r.status});
 return {modo:s.modo,status:r.status,erro:r.erro??null,assunto,html,whatsapp:textoWhatsApp(t['whatsapp']??'',{...exemplo,link:'https://…/nota/exemplo'})};
});

// ---- Public patient link (no login). Token checked server-side with the service role; nothing private before CPF check.
const tokenSchema=z.string().regex(/^[A-Za-z0-9_-]{43,64}$/);
async function admin(){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');return supabaseAdmin;}

export const infoNotaPaciente=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string().max(100)})).handler(async({data})=>{
 if(!tokenSchema.safeParse(data.token).success)return {estado:'expirado' as const};
 const db=await admin();const {estadoLink}=await import('./envio/regras');
 const l=ok(await db.from('nf_links_paciente').select('expira_em,revogado,tentativas_falhas,nota:nf_notas(status,atendimento:nf_atendimentos(data_atendimento,paciente:nf_pacientes(nome)))').eq('token',data.token).maybeSingle());
 if(!l||l.nota?.status!=='autorizada')return {estado:'expirado' as const};
 const est=estadoLink(l);if(est!=='valido')return {estado:est};
 const a=l.nota.atendimento!;
 return {estado:'valido' as const,primeiroNome:primeiroNome(a.paciente?.nome),data:a.data_atendimento};
});

export const confirmarCpfNota=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string().max(100),digitos:z.string().max(10)})).handler(async({data})=>{
 if(!tokenSchema.safeParse(data.token).success)return {estado:'expirado' as const};
 const db=await admin();
 const r=ok(await db.rpc('nf_link_paciente_verificar',{_token:data.token,_digitos:data.digitos.replace(/\D/g,'')})) as {estado:'liberado'|'incorreto'|'bloqueado'|'expirado';pdf_path?:string;restantes?:number};
 if(r.estado!=='liberado')return {estado:r.estado,restantes:r.restantes??0};
 const s=await db.storage.from('notas').createSignedUrl(r.pdf_path!,300,{download:'nota-fiscal.pdf'});
 if(s.error)throw new Error('Não foi possível preparar o arquivo. Tente de novo.');
 return {estado:'liberado' as const,url:s.data.signedUrl};
});
