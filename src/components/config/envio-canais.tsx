import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {Mail,MessageCircle} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {statusEnvio,alterarEnvioAutomatico} from '@/lib/notas/envio.functions';
import {useOperator} from '@/components/clinic/operator-context';
import {erroAmigavel} from '@/components/clinic/form-kit';

/** Delivery settings: automatic send switch (admin) and the real/simulated state of each channel. */
export function EnvioCanais(){
 const fn=useServerFn(statusEnvio);const alt=useServerFn(alterarEnvioAutomatico);const qc=useQueryClient();const {operatorId}=useOperator();
 const {data}=useQuery({queryKey:['status-envio'],queryFn:()=>fn()});
 if(!data)return null;const admin=data.papel==='admin_goable';
 async function trocar(v:boolean){try{await alt({data:{ligado:v,operador_id:operatorId}});toast.success(v?'Envio automático ligado.':'Envio automático desligado.');await qc.invalidateQueries({queryKey:['status-envio']});}catch(e){toast.error(erroAmigavel(e));}}
 const c=data.canais;
 return <section aria-labelledby="envio-titulo" className="rounded-lg border border-border bg-card p-5">
  <h2 id="envio-titulo" className="mb-3 text-lg font-semibold">Envio ao paciente</h2>
  <label className="mb-4 flex items-center gap-3 text-[15px]"><Switch checked={data.envio_automatico} disabled={!admin} onCheckedChange={trocar} aria-label="Enviar automaticamente após emitir"/>Enviar automaticamente após emitir</label>
  <ul className="grid gap-2 text-[15px]">
   <li className="flex items-center gap-2"><Mail size={16}/>E-mail: <strong>{c.email.modo==='real'?'ativo':'simulado'}</strong>{c.email.motivo&&<span className="text-muted-foreground">({c.email.motivo})</span>}</li>
   <li className="flex items-center gap-2"><MessageCircle size={16}/>WhatsApp: <strong>{c.whatsapp.modo==='real'?'ativo':'simulado'}</strong>{c.whatsapp.motivo&&<span className="text-muted-foreground">({c.whatsapp.motivo})</span>}</li>
  </ul>
  {!admin&&<p className="mt-2 text-sm text-muted-foreground">Somente a administração Goable liga ou desliga o envio automático.</p>}
 </section>;
}
