import {useEffect,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {salvarTextoEnvio} from '@/lib/notas/config.functions';
import {renderTexto,variaveisTexto} from '@/lib/notas/rules';
import {Field} from '@/components/clinic/form-kit';
import {useSalvar,type Painel} from './shared';

const exemplo={nome:'Maria Aparecida',data:'13/10/2026',valor:'R$ 470,00',link:'https://notas.bnaves.com.br/n/abc123',consultorio:'BNaves Consultório de Angiologia'};
type Chave='email_assunto'|'email_corpo'|'whatsapp';
const rotulos:Record<Chave,string>={email_assunto:'Assunto do e-mail',email_corpo:'Corpo do e-mail',whatsapp:'Mensagem do WhatsApp'};

export function TextosTab({p}:{p:Painel}){
 const {run,operatorId}=useSalvar();const salvar=useServerFn(salvarTextoEnvio);
 const [t,setT]=useState<Record<Chave,string>>({email_assunto:'',email_corpo:'',whatsapp:''});const [busy,setBusy]=useState(false);
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
    <div className="rounded-lg border border-border bg-card p-5"><div className="text-xs font-semibold text-muted-foreground mb-2">PRÉVIA DO E-MAIL</div><div className="font-semibold mb-3">{renderTexto(t.email_assunto,exemplo)}</div><div className="whitespace-pre-wrap text-[15px] leading-relaxed">{renderTexto(t.email_corpo,exemplo)}</div></div>
    <div className="rounded-lg border border-border bg-success-soft p-5"><div className="text-xs font-semibold text-muted-foreground mb-2">PRÉVIA DO WHATSAPP</div><div className="whitespace-pre-wrap text-[15px]">{renderTexto(t.whatsapp,exemplo)}</div></div>
   </div>
  </div>
 </div>;
}
