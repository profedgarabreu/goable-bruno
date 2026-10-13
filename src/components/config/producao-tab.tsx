import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {CheckCircle2,AlertTriangle,XCircle,Loader2,Rocket} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {checklistProducao,ativarProducao,definirSomenteEmail} from '@/lib/notas/admin.functions';
import {podeAtivar} from '@/lib/notas/producao';
import {erroAmigavel} from '@/components/clinic/form-kit';
import {TableSkeleton} from '@/components/clinic/table-skeleton';
import {useOperator} from '@/components/clinic/operator-context';

const icone={ok:<CheckCircle2 className="text-success" aria-label="Concluído"/>,aviso:<AlertTriangle className="text-warning" aria-label="Atenção"/>,falta:<XCircle className="text-destructive" aria-label="Pendente"/>};

export function ProducaoTab(){
 const qc=useQueryClient();const {operatorId}=useOperator();
 const fn=useServerFn(checklistProducao);const ativar=useServerFn(ativarProducao);const soEmail=useServerFn(definirSomenteEmail);
 const {data,isLoading}=useQuery({queryKey:['checklist-producao'],queryFn:()=>fn()});
 const [aberto,setAberto]=useState(false);const [texto,setTexto]=useState('');const [busy,setBusy]=useState(false);
 const liberado=!!data&&podeAtivar(data.itens);
 async function confirmar(){setBusy(true);try{await ativar({data:{confirmacao:'PRODUÇÃO',operador_id:operatorId}});toast.success('Produção ativada.');setAberto(false);await qc.invalidateQueries();}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 async function alternar(v:boolean){try{await soEmail({data:{valor:v,operador_id:operatorId}});await qc.invalidateQueries({queryKey:['checklist-producao']});}catch(e){toast.error(erroAmigavel(e));}}
 return <div className="grid gap-5">
  <div><h2 className="text-lg font-semibold">Ida para produção</h2><p className="text-sm text-muted-foreground">Tudo o que precisa estar pronto antes de emitir notas com valor fiscal. O status é calculado automaticamente.</p></div>
  {isLoading||!data?<TableSkeleton colunas={3} linhas={12}/>:<ol className="grid gap-2">{data.itens.map(i=><li key={i.n} className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-3">
   <span className="mt-0.5">{icone[i.status]}</span>
   <div className="min-w-[220px] flex-1"><div className="font-medium">{i.n}. {i.titulo}</div><div className="text-sm text-muted-foreground">{i.explicacao}</div>
    {i.n===9&&<label className="mt-2 flex items-center gap-2 text-sm"><Switch checked={data.somenteEmail} onCheckedChange={alternar}/>Só e-mail por enquanto</label>}</div>
   {i.link&&i.status!=='ok'&&<Button asChild variant="outline" size="sm"><a href={i.link.aba?`${i.link.to}?aba=${i.link.aba}`:i.link.to}>{i.link.rotulo}</a></Button>}
  </li>)}</ol>}
  <div className="status-card flex flex-wrap items-center justify-between gap-3"><div className="text-[15px]">{data?.modo==='producao'?'O sistema já está em produção.':liberado?'Todos os itens estão concluídos.':'O botão é liberado quando todos os itens estiverem concluídos.'}</div>
   <Button variant="action" size="lg" disabled={!liberado||data?.modo==='producao'} onClick={()=>{setTexto('');setAberto(true);}}><Rocket/>Ativar produção</Button></div>
  <Dialog open={aberto} onOpenChange={setAberto}><DialogContent><DialogHeader><DialogTitle>Ativar produção</DialogTitle><DialogDescription>A partir daqui as notas passam a ter valor fiscal. Digite PRODUÇÃO para confirmar.</DialogDescription></DialogHeader>
   <Input aria-label="Confirmação" value={texto} onChange={e=>setTexto(e.target.value)} placeholder="PRODUÇÃO"/>
   <DialogFooter><Button variant="outline" onClick={()=>setAberto(false)}>Voltar</Button><Button variant="destructive" disabled={busy||texto!=='PRODUÇÃO'} onClick={confirmar}>{busy&&<Loader2 className="animate-spin"/>}Ativar produção</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}
