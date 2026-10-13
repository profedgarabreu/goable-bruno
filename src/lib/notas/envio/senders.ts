// Channel adapters. Real senders are chosen only when their secrets exist; otherwise simulated (records only).
import {traduzirErroEnvio} from './regras';

export type ResultadoEnvio={status:'enviado'|'simulado'|'erro';providerId?:string|undefined;erro?:string|undefined;bruto?:unknown};
export type Anexo={nome:string;path:string;conteudo?:()=>Promise<Uint8Array>};
export interface EmailSender{readonly modo:'real'|'simulado';enviar(m:{de:string|null;nomeDe:string;para:string;assunto:string;html:string;anexos:Anexo[]}):Promise<ResultadoEnvio>}
export interface WhatsAppSender{readonly modo:'real'|'simulado';enviar(m:{para:string;texto:string;params:{nome:string;data:string;link:string}}):Promise<ResultadoEnvio>}

export class SimuladoEmailSender implements EmailSender{readonly modo='simulado' as const;async enviar(){return {status:'simulado' as const};}}
export class SimuladoWhatsAppSender implements WhatsAppSender{readonly modo='simulado' as const;async enviar(){return {status:'simulado' as const};}}

const b64=(u:Uint8Array)=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s);};

export class ResendSender implements EmailSender{
 readonly modo='real' as const;constructor(private key:string){}
 async enviar(m:Parameters<EmailSender['enviar']>[0]):Promise<ResultadoEnvio>{
  if(!m.de)return {status:'erro',erro:'Cadastre o e-mail remetente na aba Emitente.'};
  try{
   const attachments=await Promise.all(m.anexos.map(async a=>({filename:a.nome,content:b64(await a.conteudo!())})));
   const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json'},body:JSON.stringify({from:`${m.nomeDe} <${m.de}>`,to:[m.para],subject:m.assunto,html:m.html,attachments})});
   const j=await r.json().catch(()=>({})) as {id?:string;message?:string};
   return r.ok?{status:'enviado',providerId:j.id,bruto:j}:{status:'erro',erro:traduzirErroEnvio(j.message??`HTTP ${r.status}`),bruto:j};
  }catch(e){return {status:'erro',erro:traduzirErroEnvio(e instanceof Error?e.message:String(e))};}
 }
}

export class MetaCloudSender implements WhatsAppSender{
 readonly modo='real' as const;constructor(private token:string,private phoneId:string,private template:string){}
 async enviar(m:Parameters<WhatsAppSender['enviar']>[0]):Promise<ResultadoEnvio>{
  const to=m.para.startsWith('55')?m.para:`55${m.para}`;
  try{
   const r=await fetch(`https://graph.facebook.com/v21.0/${this.phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to,type:'template',template:{name:this.template,language:{code:'pt_BR'},components:[{type:'body',parameters:[m.params.nome,m.params.data,m.params.link].map(text=>({type:'text',text}))}]}})});
   const j=await r.json().catch(()=>({})) as {messages?:{id:string}[];error?:{message?:string;code?:number}};
   return r.ok?{status:'enviado',providerId:j.messages?.[0]?.id,bruto:j}:{status:'erro',erro:traduzirErroEnvio(`${j.error?.code??r.status} ${j.error?.message??''}`),bruto:j};
  }catch(e){return {status:'erro',erro:traduzirErroEnvio(e instanceof Error?e.message:String(e))};}
 }
}

/** Reads secrets at call time (server only). */
export function estadoCanais(){
 const resend=process.env['RESEND_API_KEY'];const wa=['META_WA_TOKEN','META_WA_PHONE_ID','META_WA_TEMPLATE'].filter(k=>!process.env[k]);
 return {
  email:{modo:resend?'real' as const:'simulado' as const,motivo:resend?null:'falta RESEND_API_KEY'},
  whatsapp:{modo:wa.length?'simulado' as const:'real' as const,motivo:wa.length?`falta ${wa.join(', ')}`:null},
 };
}
export function criarEmailSender():EmailSender{const k=process.env['RESEND_API_KEY'];return k?new ResendSender(k):new SimuladoEmailSender();}
export function criarWhatsAppSender():WhatsAppSender{const t=process.env['META_WA_TOKEN'],p=process.env['META_WA_PHONE_ID'],n=process.env['META_WA_TEMPLATE'];return t&&p&&n?new MetaCloudSender(t,p,n):new SimuladoWhatsAppSender();}
