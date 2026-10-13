import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {AlertTriangle,Percent} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {salvarCadastro} from '@/lib/notas/functions';
import {aliquotaValida} from '@/lib/notas/rules';
import {Field,DataTable,Pill} from '@/components/clinic/form-kit';
import {useOperator} from '@/components/clinic/operator-context';
import {useSalvar,competenciaLabel,dataBR,type Painel} from './shared';

export function AliquotaTab({p}:{p:Painel}){
 const {run,operatorId}=useSalvar();const {operator}=useOperator();const salvar=useServerFn(salvarCadastro);
 const atual=p.aliquotas.find(a=>a.competencia===p.competencia);
 const [open,setOpen]=useState(false);const [valor,setValor]=useState('');const [busy,setBusy]=useState(false);
 const n=Number(valor.replace(',','.'));const erro=valor&&!aliquotaValida(n)?'A alíquota deve ficar entre 0 e 33%.':null;
 async function save(){setBusy(true);const dados={competencia:p.competencia,aliquota_simples:Math.round(n*100)/100,informado_por:operator??'Consultório'};const r=await run(()=>salvar({data:{tabela:'nf_aliquota_mes',id:atual?.id,dados,operador_id:operatorId}}),'Alíquota informada.');setBusy(false);if(r)setOpen(false);}
 return <div className="grid gap-5">
  <p className="text-[15px] text-muted-foreground">É a alíquota do Simples Nacional informada pelo contador. Muda todo mês.</p>
  {!atual&&<div className="status-card is-blocked flex items-center gap-3"><AlertTriangle className="text-destructive"/><strong>{competenciaLabel(p.competencia)} ainda está sem alíquota.</strong> As notas deste mês ficam bloqueadas até ela ser informada.</div>}
  <div><Button variant="action" size="lg" className="h-12 text-base" onClick={()=>{setValor(atual?String(atual.aliquota_simples).replace('.',','):'');setOpen(true);}}><Percent/>Informar alíquota de {competenciaLabel(p.competencia)}</Button></div>
  <DataTable head={['Competência','Alíquota','Informado por','Quando']} empty={!p.aliquotas.length}>{p.aliquotas.map(a=><tr key={a.id}><td className="capitalize">{competenciaLabel(a.competencia)} {a.competencia===p.competencia&&<Pill tone="info">mês corrente</Pill>}</td><td className="font-semibold">{Number(a.aliquota_simples).toLocaleString('pt-BR',{minimumFractionDigits:2})}%</td><td>{a.informado_por}</td><td>{dataBR(a.informado_em)}</td></tr>)}</DataTable>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle className="capitalize">Alíquota de {competenciaLabel(p.competencia)}</DialogTitle><DialogDescription>Use o número enviado pelo contador para este mês.</DialogDescription></DialogHeader>
   <Field label="Alíquota do Simples (%)" error={erro}><Input autoFocus inputMode="decimal" placeholder="Ex.: 11,80" value={valor} onChange={x=>setValor(x.target.value.replace(/[^\d,.]/g,''))} className="h-12 text-lg"/></Field>
   <DialogFooter><Button variant="action" size="lg" disabled={busy||!valor||!!erro} onClick={save}>Salvar</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}
