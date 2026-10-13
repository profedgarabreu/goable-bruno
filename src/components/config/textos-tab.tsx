import {useEffect,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {salvarTextoEnvio} from '@/lib/notas/config.functions';
import {variaveisTexto} from '@/lib/notas/rules';
import {Field} from '@/components/clinic/form-kit';
import {useSalvar,type Painel} from './shared';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {emailTeste} from '@/lib/notas/envio.functions';
import {htmlEmail,textoWhatsApp,assuntoEmail} from '@/lib/notas/envio/regras';
import {WhatsBubble} from '@/components/notas/envio-ui';
import {toast} from 'sonner';
import {erroAmigavel} from '@/components/clinic/form-kit';

const exemplo={nome:'Maria Aparecida',data:'13/10/2026',valor:'R$ 470,00',link:'https://notas.bnaves.com.br/n/abc123',consultorio:'BNaves Consultório de Angiologia'};
type Chave='email_assunto'|'email_corpo'|'whatsapp';
const rotulos:Record<Chave,string>={email_assunto:'Assunto do e-mail',email_corpo:'Corpo do e-mail',whatsapp:'Mensagem do WhatsApp'};

export function TextosTab({p}:{p:Painel}){
 const {run,operatorId}=useSalvar();const salvar=useServerFn(salvarTextoEnvio);
 const [t,setT]=useState<Record<Chave,string>>({email_assunto:'',email_corpo:'',whatsapp:''});const [busy,setBusy]=useState(false);
 const teste=useServerFn(emailTeste);const [dest,setDest]=useState('');const [prev,setPrev]=useState<{assunto:string;html:string;modo:string;status:string;erro:string|null}|null>(null);
 async function enviarTeste(){try{const r=await teste({data:{destino:dest,operador_id:operatorId}});setPrev(r);if(r.status==='erro')toast.error(r.erro??'Falha.');else toast.success(r.modo==='simulado'?'Modo simulado: nada foi enviado. Veja a prévia.':'E-mail de teste enviado.');}catch(e){toast.error(erroAmigavel(e));}}
 useEffect(()=>{setT(Object.fromEntries(p.textos.map(x=>[x.chave,x.conteudo])) as Record<Chave,string>);},[p.textos]);
 const original=Object.fromEntries(p.textos.map(x=>[x.chave,x.conteudo])) as Record<string,string>;
 async function save(){const mudou=(Object.keys(t) as Chave[]).filter(k=>t[k]!==original[k]);if(!mudou.length)return;setBusy(true);await run(async()=>{for(const k of mudou)await salvar({data:{chave:k,conteudo:t[k],operador_id:operatorId}});},'Textos salvos.');setBusy(false);}
 return <div className="grid gap-5">
  <p className="text-[15px] text-muted-foreground">Variáveis disponíveis: {variaveisTexto.map(v=><code key={v} className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">{`{{${v}}}`}</code>)}</p>
  <div className="grid gap-6 lg:grid-cols-2">
   <div className="grid gap-4 content-start">
    <Field label={rotulos.email_assunto}><Input value={t.email_assunto} onChange={x=>setT({...t,email_assunto:x.target.value})}/></Field>
    <Field label={rotulos.email_corpo}><Textarea rows={12} value={t.email_corpo} onChange={x=>setT({...t,email_corpo:x.target.value})}/></Field>
    <Field label={rotulos.whatsapp}><Textarea rows={4} value={t.whatsapp} onChange={x=>setT({...t,whatsapp:x.target.value})}/></Field>
    <Button variant="action" size="lg" className="h-12 text-base" disabled={busy} onClick={save}>Salvar textos</Button>
   </div>
   <div className="grid gap-4 content-start">
    <div className="rounded-lg border border-border bg-card p-5"><div className="text-xs font-semibold text-muted-foreground mb-2">PRÉVIA DO E-MAIL</div><div className="font-semibold mb-3">{assuntoEmail(t.email_assunto,{...exemplo,link:'(nota em anexo)'},false)}</div><iframe title="Prévia do e-mail" sandbox="" className="h-96 w-full rounded border border-border" srcDoc={htmlEmail(t.email_corpo,{...exemplo,link:'(a nota segue em anexo neste e-mail)'})}/>
     <div className="mt-3 flex flex-wrap gap-2"><Input aria-label="E-mail para teste" placeholder="seu@email.com" value={dest} onChange={e=>setDest(e.target.value)} className="max-w-xs"/><Button variant="outline" onClick={enviarTeste} disabled={!dest}>Enviar e-mail de teste para…</Button></div></div>
    <div className="rounded-lg border border-border bg-card p-5"><div className="text-xs font-semibold text-muted-foreground mb-2">PRÉVIA DO WHATSAPP</div><WhatsBubble texto={textoWhatsApp(t.whatsapp,exemplo)}/></div>
   </div>
  </div>
  {prev&&<Dialog open onOpenChange={o=>!o&&setPrev(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>E-mail de teste {prev.modo==='simulado'?'(simulado — nada foi enviado)':''}</DialogTitle><DialogDescription>{prev.assunto}</DialogDescription></DialogHeader><iframe title="E-mail de teste" sandbox="" srcDoc={prev.html} className="h-[60vh] w-full rounded border border-border"/></DialogContent></Dialog>}
 </div>;
}
