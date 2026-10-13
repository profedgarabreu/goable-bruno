import {createFileRoute} from '@tanstack/react-router';
import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Download,Loader2,ShieldCheck,ShieldX} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {infoNotaPaciente,confirmarCpfNota} from '@/lib/notas/envio.functions';

const titulo='Sua nota fiscal — BNaves Consultório de Angiologia';
const desc='Baixe com segurança a nota fiscal do seu atendimento.';
export const Route=createFileRoute('/nota/$token')({
 head:()=>({meta:[{title:titulo},{name:'description',content:desc},{property:'og:title',content:titulo},{property:'og:description',content:desc},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex,nofollow,noarchive'},{name:'referrer',content:'no-referrer'}]}),
 loader:({params})=>infoNotaPaciente({data:{token:params.token}}),
 staleTime:0,
 component:NotaPaciente,
});

function Shell({children}:{children:React.ReactNode}){
 return <main className="nota-publica"><div className="nota-card"><div className="nota-marca">BNaves<span>Consultório de Angiologia</span></div>{children}</div><p className="nota-rodape">Proteção de dados de saúde · por Goable AI</p></main>;
}

function NotaPaciente(){
 const info=Route.useLoaderData();const {token}=Route.useParams();const fn=useServerFn(confirmarCpfNota);
 const [dig,setDig]=useState('');const [busy,setBusy]=useState(false);const [estado,setEstado]=useState<string>(info.estado);const [msg,setMsg]=useState<string|null>(null);const [url,setUrl]=useState<string|null>(null);
 if(estado==='expirado')return <Shell><ShieldX className="nota-icone erro" size={40}/><h1>Este link expirou.</h1><p>Peça um novo ao consultório.</p></Shell>;
 if(estado==='bloqueado')return <Shell><ShieldX className="nota-icone erro" size={40}/><h1>Link bloqueado</h1><p>Entre em contato com o consultório.</p></Shell>;
 if(info.estado!=='valido')return null;
 const data=new Date(`${info.data}T12:00`).toLocaleDateString('pt-BR');
 async function confirmar(e:React.FormEvent){e.preventDefault();setBusy(true);setMsg(null);try{const r=await fn({data:{token,digitos:dig}});
  if(r.estado==='liberado'){setUrl(r.url);setEstado('liberado');}else if(r.estado==='incorreto'){setMsg(`Dígitos incorretos. Restam ${r.restantes} tentativa${r.restantes===1?'':'s'}.`);setDig('');}else setEstado(r.estado);}
  catch{setMsg('Não foi possível conferir agora. Tente de novo.');}finally{setBusy(false);}}
 return <Shell>
  <h1>Olá, {info.primeiroNome}.</h1><p>Sua nota fiscal do atendimento de {data} está pronta.</p>
  {estado==='liberado'&&url?<><a href={url} className="nota-baixar"><Download size={20}/>Baixar nota (PDF)</a><p className="nota-ajuda">O botão vale por 5 minutos. Se expirar, recarregue a página.</p></>:
  <form onSubmit={confirmar} className="nota-form"><label htmlFor="dig"><ShieldCheck size={18} className="mt-1 shrink-0"/><span>Para sua segurança, digite os <strong>3 primeiros dígitos do seu CPF</strong>.</span></label>
   <Input id="dig" inputMode="numeric" autoComplete="off" maxLength={3} value={dig} onChange={e=>setDig(e.target.value.replace(/\D/g,''))} className="nota-digitos" aria-describedby="nota-msg"/>
   {msg&&<p id="nota-msg" className="nota-msg" role="alert">{msg}</p>}
   <Button type="submit" variant="action" size="lg" className="h-12 text-base" disabled={dig.length!==3||busy}>{busy&&<Loader2 className="animate-spin"/>}Confirmar</Button></form>}
 </Shell>;
}
