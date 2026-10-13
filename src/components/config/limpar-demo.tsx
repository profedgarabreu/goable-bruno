import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import {Trash2,Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {contarDadosDemo} from '@/lib/notas/historico.functions';
import {limparDadosDemo} from '@/lib/notas/functions';
import {useOperator} from '@/components/clinic/operator-context';
import {erroAmigavel} from '@/components/clinic/form-kit';

type Contagem=Awaited<ReturnType<typeof contarDadosDemo>>;
export function LimparDemo(){
 const contar=useServerFn(contarDadosDemo);const limpar=useServerFn(limparDadosDemo);const {operatorId}=useOperator();const qc=useQueryClient();
 const [c,setC]=useState<Contagem|null>(null);const [txt,setTxt]=useState('');const [busy,setBusy]=useState(false);
 async function abrir(){setBusy(true);try{setTxt('');setC(await contar());}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 async function confirmar(){setBusy(true);try{const r=await limpar({data:{confirmacao:'LIMPAR',operador_id:operatorId}});toast.success(`Removidos: ${r.pacientes} pacientes, ${r.atendimentos} atendimentos, ${r.notas} notas.`);setC(null);await qc.invalidateQueries();}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 return <section className="rounded-lg border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Dados de demonstração</h2><p className="text-sm text-muted-foreground">Remova pacientes e atendimentos fictícios antes de começar a usar em produção.</p></div>
  <Button variant="outline" className="text-destructive" disabled={busy} onClick={abrir}>{busy&&!c?<Loader2 className="animate-spin"/>:<Trash2/>}Limpar dados de demonstração</Button></div>
  <Dialog open={!!c} onOpenChange={o=>!o&&setC(null)}><DialogContent><DialogHeader><DialogTitle>Limpar dados de demonstração?</DialogTitle><DialogDescription>Isto apaga definitivamente:</DialogDescription></DialogHeader>
   {c&&<ul className="grid gap-1 text-[15px]"><li><strong>{c.pacientes}</strong> pacientes</li><li><strong>{c.atendimentos}</strong> atendimentos</li><li><strong>{c.notas}</strong> notas</li><li><strong>{c.envios}</strong> envios</li><li><strong>{c.arquivos}</strong> arquivos (PDF/XML)</li></ul>}
   <label className="grid gap-1 text-sm">Digite <strong>LIMPAR</strong> para confirmar<Input value={txt} onChange={e=>setTxt(e.target.value)} autoComplete="off"/></label>
   <DialogFooter><Button variant="outline" onClick={()=>setC(null)}>Cancelar</Button><Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={txt!=='LIMPAR'||busy} onClick={confirmar}>Apagar dados de demonstração</Button></DialogFooter></DialogContent></Dialog>
 </section>;
}
