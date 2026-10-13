import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {Loader2,Mail,MessageCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {enviarNotaFn,verMensagem,copiarLinkPaciente} from '@/lib/notas/envio.functions';
import {emailValido,celularValido} from '@/lib/notas/envio/regras';
import {useOperator} from '@/components/clinic/operator-context';
import {Field,erroAmigavel} from '@/components/clinic/form-kit';

type Envio={id:string;canal:'email'|'whatsapp';status:string;destino:string;erro:string|null;created_at:string};
type Link={acessado_em:string|null;revogado:boolean};
export type NotaEnvio={id:string;status:string;numero:string|null;envios?:Envio[]|null;links?:Link[]|null;atendimento?:{paciente?:{nome:string;email:string|null;celular:string|null}|null}|null};

const canalLabel={email:'E-mail',whatsapp:'WhatsApp'};
export function ultimoEnvio(n:NotaEnvio){return [...(n.envios??[])].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]??null;}
export function situacaoEnvio(n:NotaEnvio):{label:string;tone:'success'|'info'|'error'|'warning'|'muted';chave:'enviado'|'simulado'|'erro'|'sem_contato'|'acessado'|'nao'}{
 const e=ultimoEnvio(n);
 if(!e)return {label:'Não enviada',tone:'muted',chave:'nao'};
 if(e.status==='sem_contato')return {label:'Sem contato',tone:'warning',chave:'sem_contato'};
 if(e.status==='erro')return {label:`${canalLabel[e.canal]} · Erro`,tone:'error',chave:'erro'};
 if(e.canal==='whatsapp'&&(n.links??[]).some(l=>!l.revogado&&l.acessado_em))return {label:'WhatsApp · Link acessado',tone:'success',chave:'acessado'};
 return e.status==='simulado'?{label:`${canalLabel[e.canal]} · Simulado`,tone:'info',chave:'simulado'}:{label:`${canalLabel[e.canal]} · Enviado`,tone:'success',chave:'enviado'};
}
export const precisaEnvio=(n:NotaEnvio)=>n.status==='autorizada'&&['nao','sem_contato','erro'].includes(situacaoEnvio(n).chave);

export function EnvioBadge({n}:{n:NotaEnvio}){const s=situacaoEnvio(n);const e=ultimoEnvio(n);
 return <><span className={`status-badge tone-${s.tone}`}>{s.label}</span>{e?.status==='erro'&&e.erro&&<div className="mt-1 max-w-[220px] whitespace-normal text-xs text-destructive">{e.erro}</div>}</>;}

/** Resend / "Informar contato e enviar": channel, editable destination, optional save on the patient. */
export function ReenviarDialog({nota,titulo,onClose,onDone}:{nota:NotaEnvio;titulo:string;onClose:()=>void;onDone:()=>void}){
 const fn=useServerFn(enviarNotaFn);const {operatorId}=useOperator();const p=nota.atendimento?.paciente;
 const [canal,setCanal]=useState<'email'|'whatsapp'>(p?.email||!p?.celular?'email':'whatsapp');
 const [dest,setDest]=useState({email:p?.email??'',whatsapp:p?.celular??''});const [salvar,setSalvar]=useState(!(canal==='email'?p?.email:p?.celular));const [busy,setBusy]=useState(false);
 const d=dest[canal];const valido=canal==='email'?emailValido(d):celularValido(d);
 async function ok(){setBusy(true);try{const r=await fn({data:{nota_id:nota.id,canal,destino:d,atualizar_cadastro:salvar,operador_id:operatorId}});
  if(r.status==='erro')toast.error(r.erro??'Falha no envio.');else toast.success(r.status==='simulado'?'Envio simulado registrado (sem envio real).':'Nota enviada.');onDone();}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 return <Dialog open onOpenChange={o=>!o&&onClose()}><DialogContent><DialogHeader><DialogTitle>{titulo}</DialogTitle><DialogDescription>Nota {nota.numero??''} · {p?.nome}</DialogDescription></DialogHeader>
  <div className="grid gap-4">
   <Field label="Canal"><Select value={canal} onValueChange={v=>setCanal(v as 'email'|'whatsapp')}><SelectTrigger aria-label="Canal"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="email">E-mail (PDF e XML anexados)</SelectItem><SelectItem value="whatsapp">WhatsApp (link seguro)</SelectItem></SelectContent></Select></Field>
   <Field label={canal==='email'?'E-mail do paciente':'Celular do paciente'} error={d&&!valido?(canal==='email'?'E-mail inválido.':'Celular inválido — use DDD + 9 dígitos.'):null}><Input aria-label="Destino" value={d} inputMode={canal==='email'?'email':'tel'} onChange={e=>setDest({...dest,[canal]:e.target.value})}/></Field>
   <label className="flex items-center gap-2 text-sm"><Checkbox checked={salvar} onCheckedChange={v=>setSalvar(v===true)}/>Atualizar no cadastro do paciente</label>
  </div>
  <DialogFooter><Button variant="outline" onClick={onClose}>Voltar</Button><Button variant="action" size="lg" disabled={!valido||busy} onClick={ok}>{busy&&<Loader2 className="animate-spin"/>}Enviar</Button></DialogFooter></DialogContent></Dialog>;
}

export function MensagemDialog({notaId,onClose}:{notaId:string;onClose:()=>void}){
 const fn=useServerFn(verMensagem);const {data,isLoading}=useQuery({queryKey:['mensagens',notaId],queryFn:()=>fn({data:{nota_id:notaId}})});
 return <Dialog open onOpenChange={o=>!o&&onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Mensagens enviadas</DialogTitle><DialogDescription>Conteúdo exatamente como foi enviado (ou simulado).</DialogDescription></DialogHeader>
  <div className="grid max-h-[70vh] gap-4 overflow-y-auto">{isLoading&&<Loader2 className="animate-spin"/>}
   {!isLoading&&!data?.length&&<p className="text-muted-foreground">Nenhum envio registrado.</p>}
   {data?.map(e=><div key={e.id} className="rounded-lg border border-border p-3">
    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">{e.canal==='email'?<Mail size={15}/>:<MessageCircle size={15}/>}<strong>{canalLabel[e.canal]}</strong><span className="text-muted-foreground">{e.destino||'sem destino'} · {new Date(e.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</span><span className="status-badge tone-muted">{e.status}</span></div>
    {e.erro&&<p className="mb-2 text-sm text-destructive">{e.erro}</p>}
    {e.assunto&&<p className="mb-2 text-sm"><strong>Assunto:</strong> {e.assunto}</p>}
    {e.canal==='email'&&e.conteudo_renderizado&&<iframe title="E-mail enviado" sandbox="" srcDoc={e.conteudo_renderizado} className="h-80 w-full rounded border border-border bg-card"/>}
    {e.canal==='email'&&Array.isArray(e.anexos)&&(e.anexos as {nome:string}[]).length>0&&<p className="mt-2 text-sm text-muted-foreground">Anexos: {(e.anexos as {nome:string}[]).map(a=>a.nome).join(', ')}</p>}
    {e.canal==='whatsapp'&&e.conteudo_renderizado&&<WhatsBubble texto={e.conteudo_renderizado}/>}
   </div>)}
  </div></DialogContent></Dialog>;
}

export function WhatsBubble({texto}:{texto:string}){return <div className="wa-chat"><div className="wa-bubble">{texto}<span className="wa-time">agora</span></div></div>;}

export function useCopiarLink(){const fn=useServerFn(copiarLinkPaciente);const {operatorId}=useOperator();
 return async(notaId:string)=>{try{const r=await fn({data:{nota_id:notaId,operador_id:operatorId}});await navigator.clipboard.writeText(r.url).catch(()=>{});toast.success('Novo link copiado. Os links anteriores desta nota foram desativados.',{description:r.url});return r.url;}catch(e){toast.error(erroAmigavel(e));return null;}};}
