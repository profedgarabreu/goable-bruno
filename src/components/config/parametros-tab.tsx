import {Fragment,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {AlertTriangle,Pencil} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {editarParametroFiscal} from '@/lib/notas/functions';
import {camposParametro,rotuloCodigo} from '@/lib/notas/labels';
import {EditDrawer,Field,DataTable,Pill} from '@/components/clinic/form-kit';
import {useSalvar,dataBR,type Painel} from './shared';
import {saoPauloDate} from '@/lib/clinic';

type Valor=string|boolean|null;
export function ParametrosTab({p}:{p:Painel}){
 const admin=p.papel==='admin_goable';const {run,operatorId}=useSalvar();const editar=useServerFn(editarParametroFiscal);
 const ativo=p.parametros.find(x=>x.ativo);const historico=p.parametros.filter(x=>x.grupo_id===ativo?.grupo_id);
 const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [f,setF]=useState<Record<string,Valor>>({});
 if(!ativo)return <p>Nenhum parâmetro fiscal ativo.</p>;
 const rec=ativo as unknown as Record<string,Valor>;const validacao=(ativo.validacao??{}) as Record<string,string>;
 function abrir(){setF({...Object.fromEntries(camposParametro.map(c=>[c.key,rec[c.key]??null])),vigente_desde:saoPauloDate()});setOpen(true);}
 async function save(){
  const mudou=Object.fromEntries(Object.entries(f).filter(([k,v])=>k==='vigente_desde'||(v===''?null:v)!==(rec[k]??null)).map(([k,v])=>[k,v===''?null:v]));
  if(Object.keys(mudou).length<=1)return setOpen(false);
  setBusy(true);const r=await run(()=>editar({data:{id:ativo!.id,dados:mudou as never,operador_id:operatorId}}),`Nova versão ${ativo!.versao+1} criada.`);setBusy(false);if(r)setOpen(false);
 }
 const mostra=(k:string,v:Valor)=>typeof v==='boolean'?(v?'Sim':'Não'):v??'—';
 return <div className="grid gap-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{ativo.nome}</h2><p className="text-sm text-muted-foreground">Versão {ativo.versao} · vigente desde {new Date(`${ativo.vigente_desde}T12:00`).toLocaleDateString('pt-BR')}</p></div>
   {admin?<Button variant="action" onClick={abrir}><Pencil/>Editar (cria nova versão)</Button>:<p className="text-sm text-muted-foreground">Somente a administração Goable altera parâmetros fiscais.</p>}</div>
  <div className="ficha">{camposParametro.map(c=>{const v=rec[c.key]??null;const rot=rotuloCodigo(c.key,v);return <Fragment key={c.key}><div className="ficha-label">{c.label}</div><div><span className="font-medium">{mostra(c.key,v)}</span>{rot&&<span className="text-muted-foreground"> — {rot}</span>}{validacao[c.key]&&<div className="mt-1.5 flex flex-wrap items-center gap-2"><Pill tone="warning"><AlertTriangle size={12}/>Validar com o contador</Pill><span className="text-sm text-muted-foreground">{validacao[c.key]}</span></div>}</div></Fragment>;})}</div>
  <h3 className="text-base font-semibold mt-2">Histórico de versões</h3>
  <DataTable head={['Versão','Vigente desde','Criada em','Quem','Situação']}>{historico.map(h=><tr key={h.id}><td>v{h.versao}</td><td>{new Date(`${h.vigente_desde}T12:00`).toLocaleDateString('pt-BR')}</td><td>{dataBR(h.created_at)}</td><td>{h.autor}</td><td>{h.ativo?<Pill tone="success">Ativa</Pill>:<Pill tone="muted">Inativa</Pill>}</td></tr>)}</DataTable>
  <EditDrawer open={open} onOpenChange={setOpen} title={`Nova versão (v${ativo.versao+1})`} description="A versão atual fica guardada no histórico. Notas já emitidas continuam ligadas à versão usada." onSave={save} saving={busy}>
   <Field label="Vigente desde"><Input type="date" value={String(f['vigente_desde']??'')} onChange={x=>setF({...f,vigente_desde:x.target.value})}/></Field>
   {camposParametro.map(c=>c.tipo==='bool'?<label key={c.key} className="flex items-center justify-between gap-3 text-[15px]">{c.label}<Switch checked={!!f[c.key]} onCheckedChange={x=>setF({...f,[c.key]:x})}/></label>:<Field key={c.key} label={c.label} hint={rotuloCodigo(c.key,f[c.key])}><Input value={String(f[c.key]??'')} onChange={x=>setF({...f,[c.key]:x.target.value})}/></Field>)}
  </EditDrawer>
 </div>;
}
