import {createFileRoute,Link} from '@tanstack/react-router';
import {TableSkeleton} from '@/components/clinic/table-skeleton';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {toast} from 'sonner';
import {zipSync} from 'fflate';
import {ChevronLeft,ChevronRight,FileSpreadsheet,FileArchive,FileText,Loader2,AlertTriangle,TrendingUp,TrendingDown} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,LabelList,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Progress} from '@/components/ui/progress';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {money,pageHead} from '@/lib/clinic';
import {useOperator} from '@/components/clinic/operator-context';
import {erroAmigavel} from '@/components/clinic/form-kit';
import {urlArquivoNota} from '@/lib/notas/emissao.functions';
import {historicoMes,exportarPlanilhaMes,pacoteMes,exportarCsvMes} from '@/lib/notas/historico.functions';
import {deslocarCompetencia,variacao,formaLabel,ehCancelada,dataBR,type Quebra} from '@/lib/notas/historico';
import {competenciaLabel} from '@/components/config/shared';

const competenciaHoje=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());
export const Route=createFileRoute('/_authenticated/_workspace/historico')({
 validateSearch:z.object({c:z.string().regex(/^\d{4}-\d{2}$/).optional()}),
 head:()=>pageHead('Histórico mensal','Totais do mês por médico, serviço e pagamento, com exportações para o contador.'),
 component:Historico,
});
const statusLabel:Record<string,string>={autorizada:'Autorizada',cancelada:'Cancelada',substituida:'Substituída'};
const POR_PAGINA=20;

function baixar(nome:string,blob:Blob){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=nome;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
const deB64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function Historico(){
 const hoje=competenciaHoje();const {c:comp=hoje}=Route.useSearch();const navigate=Route.useNavigate();
 const setComp=(c:string)=>navigate({search:{c:c===hoje?undefined:c},replace:true});
 const {operatorId}=useOperator();
 const [medico,setMedico]=useState<string>('');const [servico,setServico]=useState<string>('');const [forma,setForma]=useState<string>('');const [incluirCanc,setIncluirCanc]=useState(false);const [pagina,setPagina]=useState(0);
 const filtros={competencia:comp,medico_id:medico||null,servico_id:servico||null,forma:(forma||null) as 'pix'|null};
 const fn=useServerFn(historicoMes);
 const {data,isLoading,error}=useQuery({queryKey:['historico',filtros],queryFn:()=>fn({data:filtros})});
 const urlFn=useServerFn(urlArquivoNota);
 const fx={xlsx:useServerFn(exportarPlanilhaMes),zip:useServerFn(pacoteMes),csv:useServerFn(exportarCsvMes)};
 const [exportando,setExportando]=useState<string|null>(null);const [prog,setProg]=useState<{feito:number;total:number}|null>(null);
 async function exportar(tipo:'xlsx'|'zip'|'csv'){
  setExportando(tipo);
  try{
   if(tipo==='xlsx'){const r=await fx.xlsx({data:{...filtros,operador_id:operatorId}});baixar(r.nome,new Blob([deB64(r.base64)],{type:XLSX_MIME}));}
   else if(tipo==='csv'){const r=await fx.csv({data:{...filtros,incluirCanceladas:incluirCanc,operador_id:operatorId}});baixar(r.nome,new Blob([r.csv],{type:'text/csv;charset=utf-8'}));}
   else{
    const r=await fx.zip({data:{...filtros,operador_id:operatorId}});const files:Record<string,Uint8Array>={[r.planilha.nome]:deB64(r.planilha.base64)};
    setProg({feito:0,total:r.arquivos.length});
    for(const [i,a] of r.arquivos.entries()){const url=a.url??(await urlFn({data:{nota_id:a.nota_id,tipo:a.tipo}})).url;const res=await fetch(url);if(!res.ok)throw new Error(`Não foi possível baixar ${a.nome}.`);files[a.nome]=new Uint8Array(await res.arrayBuffer());setProg({feito:i+1,total:r.arquivos.length});}
    baixar(r.nome,new Blob([zipSync(files,{level:6})],{type:'application/zip'}));
   }
   toast.success('Exportação concluída.');
  }catch(e){toast.error(erroAmigavel(e));}finally{setExportando(null);setProg(null);}
 }
 const s=data?.resumo;
 const autorizadas=(data?.linhas??[]).filter(l=>l.status==='autorizada');const canceladas=(data?.linhas??[]).filter(l=>ehCancelada(l.status));
 const paginas=Math.max(1,Math.ceil(autorizadas.length/POR_PAGINA));const pag=Math.min(pagina,paginas-1);
 const vt=data?variacao(s!.total,data.anterior.total):null;const vq=data?variacao(s!.emitidas,data.anterior.emitidas):null;
 const anoMes=competenciaLabel(comp);
 return <div className="pb-10">
  <div className="page-heading"><div><div className="title-eyebrow">FECHAMENTO DO MÊS</div><h1>Histórico mensal</h1><p>Tudo organizado para o contador — competência de <span className="capitalize">{anoMes}</span>.</p></div>
   <div className="heading-actions"><div className="flex items-center gap-1"><Button variant="outline" size="icon" aria-label="Mês anterior" onClick={()=>{setPagina(0);setComp(deslocarCompetencia(comp,-1));}}><ChevronLeft/></Button>
    <label className="date-picker"><input type="month" aria-label="Competência" value={comp} onChange={e=>{if(e.target.value){setPagina(0);setComp(e.target.value);}}}/></label>
    <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={()=>{setPagina(0);setComp(deslocarCompetencia(comp,1));}}><ChevronRight/></Button>{comp!==hoje&&<Button variant="ghost" onClick={()=>setComp(hoje)}>Mês atual</Button>}</div></div></div>

  <div className="mb-5 flex flex-wrap items-end gap-3">
   <Filtro label="Médico" value={medico} onChange={v=>{setPagina(0);setMedico(v);}} opcoes={(data?.medicos??[]).map(m=>({v:m.id,l:m.nome}))}/>
   <Filtro label="Serviço" value={servico} onChange={v=>{setPagina(0);setServico(v);}} opcoes={(data?.servicos??[]).map(m=>({v:m.id,l:m.nome}))}/>
   <Filtro label="Forma de pagamento" value={forma} onChange={v=>{setPagina(0);setForma(v);}} opcoes={Object.entries(formaLabel).map(([v,l])=>({v,l}))}/>
   <label className="flex h-10 items-center gap-2 text-sm"><Switch checked={incluirCanc} onCheckedChange={setIncluirCanc}/>Incluir canceladas</label>
   <div className="ml-auto flex flex-wrap gap-2">
    <Button variant="action" disabled={!!exportando} onClick={()=>exportar('xlsx')}>{exportando==='xlsx'?<Loader2 className="animate-spin"/>:<FileSpreadsheet/>}Planilha do contador</Button>
    <Button variant="outline" disabled={!!exportando} onClick={()=>exportar('zip')}>{exportando==='zip'?<Loader2 className="animate-spin"/>:<FileArchive/>}Pacote do mês (.zip)</Button>
    <Button variant="outline" disabled={!!exportando} onClick={()=>exportar('csv')}>{exportando==='csv'?<Loader2 className="animate-spin"/>:<FileText/>}CSV</Button>
   </div>
  </div>

  {isLoading&&<TableSkeleton colunas={5}/>}
  {error&&<p className="text-destructive">Não foi possível carregar o histórico.</p>}
  {data&&s&&<>
   {data.pendentes>0&&<div className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm"><AlertTriangle size={16} className="text-action"/>Há {data.pendentes} atendimento{data.pendentes===1?'':'s'} pago{data.pendentes===1?'':'s'} sem nota neste mês. <Link to="/conferencia" className="font-semibold text-primary underline">Ir para a conferência</Link></div>}
   <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <Cartao titulo="Notas emitidas" valor={String(s.emitidas)} extra={<Var v={vq} ant={data.anterior.competencia}/>}/>
    <Cartao titulo="Valor total" valor={money(s.total)} extra={<Var v={vt} ant={data.anterior.competencia}/>}/>
    <Cartao titulo="Ticket médio" valor={money(s.ticket)}/>
    <Cartao titulo="Canceladas" valor={String(s.canceladas.quantidade)} extra={<span className="text-xs text-muted-foreground">{money(s.canceladas.valor)} · fora do total</span>}/>
    <Cartao titulo="Valor aprox. de tributos" valor={money(s.tributos)} extra={<span className="text-xs text-muted-foreground">estimativa — conferir com o contador</span>}/>
   </section>
   <section className="mb-6 grid gap-4 xl:grid-cols-3">
    <QuebraCard titulo="Por médico" q={s.porMedico}/><QuebraCard titulo="Por serviço" q={s.porServico}/><QuebraCard titulo="Por forma de pagamento" q={s.porForma}/>
   </section>
   <section className="table-section mb-6 p-4"><h2 className="mb-3 text-lg font-semibold">Evolução diária</h2>
    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={s.porDia} margin={{top:20,right:8,left:0,bottom:0}}><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="dia" tickLine={false} fontSize={11}/><YAxis tickLine={false} fontSize={11} width={56} tickFormatter={v=>`R$ ${Number(v).toLocaleString('pt-BR')}`}/><Tooltip formatter={(v:number)=>money(v)} labelFormatter={d=>`Dia ${d}`}/><Bar dataKey="valor" fill="var(--primary)" radius={[3,3,0,0]}><LabelList dataKey="valor" position="top" fontSize={10} formatter={(v:number)=>v?Math.round(v).toLocaleString('pt-BR'):''}/></Bar></BarChart></ResponsiveContainer></div>
   </section>
   <section className="table-section mb-6"><div className="table-toolbar"><h2>Notas autorizadas <span className="count-pill">{autorizadas.length}</span></h2></div>
    <Tabela linhas={autorizadas.slice(pag*POR_PAGINA,(pag+1)*POR_PAGINA)}/>
    <div className="table-footer"><span>Página {pag+1} de {paginas}</span><span className="flex gap-2"><Button size="sm" variant="outline" disabled={pag===0} onClick={()=>setPagina(pag-1)}>Anterior</Button><Button size="sm" variant="outline" disabled={pag>=paginas-1} onClick={()=>setPagina(pag+1)}>Próxima</Button></span></div>
   </section>
   {incluirCanc&&<section className="table-section"><div className="table-toolbar"><h2>Canceladas e substituídas <span className="count-pill">{canceladas.length}</span></h2></div><Tabela linhas={canceladas} canceladas/><div className="table-footer"><span>Não somam no total do mês.</span><span>{money(s.canceladas.valor)}</span></div></section>}
  </>}
  <Dialog open={!!prog}><DialogContent><DialogHeader><DialogTitle>Gerando o pacote do mês</DialogTitle><DialogDescription>Baixando {prog?.feito} de {prog?.total} arquivos…</DialogDescription></DialogHeader><Progress value={prog&&prog.total?prog.feito/prog.total*100:100}/></DialogContent></Dialog>
 </div>;
}

function Filtro({label,value,onChange,opcoes}:{label:string;value:string;onChange:(v:string)=>void;opcoes:{v:string;l:string}[]}){
 return <label className="grid gap-1 text-xs font-medium text-muted-foreground">{label}<Select value={value||'all'} onValueChange={v=>onChange(v==='all'?'':v)}><SelectTrigger className="h-10 w-[190px] text-sm text-foreground"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{opcoes.map(o=><SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent></Select></label>;
}
function Cartao({titulo,valor,extra}:{titulo:string;valor:string;extra?:React.ReactNode}){return <div className="hoje-contador cursor-default"><span>{titulo}</span><strong>{valor}</strong>{extra}</div>;}
function Var({v,ant}:{v:number|null;ant:string}){if(v==null)return <span className="text-xs text-muted-foreground">sem base em {competenciaLabel(ant)}</span>;const up=v>=0;return <span className={`flex items-center gap-1 text-xs ${up?'text-success':'text-destructive'}`}>{up?<TrendingUp size={12}/>:<TrendingDown size={12}/>}{up?'+':''}{v.toLocaleString('pt-BR')}% vs. mês anterior</span>;}
function QuebraCard({titulo,q}:{titulo:string;q:Quebra[]}){
 return <div className="table-section p-4"><h2 className="mb-2 text-base font-semibold">{titulo}</h2>
  {q.length===0?<p className="py-6 text-center text-sm text-muted-foreground">Sem notas neste filtro.</p>:<>
   <div style={{height:Math.max(90,q.length*42)}}><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={q} margin={{top:0,right:70,left:0,bottom:0}}><XAxis type="number" hide/><YAxis type="category" dataKey="chave" width={110} tickLine={false} axisLine={false} fontSize={12}/><Tooltip formatter={(v:number)=>money(v)}/><Bar dataKey="valor" fill="var(--action)" radius={[0,3,3,0]}><LabelList dataKey="valor" position="right" fontSize={11} formatter={(v:number)=>money(v)}/></Bar></BarChart></ResponsiveContainer></div>
   <table className="mt-2 w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="font-medium">Item</th><th className="text-right font-medium">Notas</th><th className="text-right font-medium">Valor</th></tr></thead><tbody>{q.map(x=><tr key={x.chave} className="border-t border-border"><td className="py-1">{x.chave}</td><td className="text-right">{x.quantidade}</td><td className="text-right font-medium">{money(x.valor)}</td></tr>)}</tbody></table></>}
 </div>;
}
type L={id:string;data:string;numero:string|null;paciente:string;cpf:string|null;servico:string;medico:string;forma:string|null;valor:number;status:string;envio:string;motivo:string|null;substituta:string|null};
function Tabela({linhas,canceladas}:{linhas:L[];canceladas?:boolean}){
 return <div className="table-scroll"><table className="appointments-table"><thead><tr><th>Data</th><th>Número</th><th>Paciente</th><th>Serviço / médico</th><th>Pagamento</th><th>Valor</th><th>Status</th><th>{canceladas?'Motivo':'Envio'}</th></tr></thead><tbody>
  {linhas.length===0&&<tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma nota nesta competência.</td></tr>}
  {linhas.map(l=><tr key={l.id}><td className="whitespace-nowrap">{dataBR(l.data)}</td><td>{l.numero??'—'}</td><td><div className="patient-name">{l.paciente}</div><div className="patient-cpf">{l.cpf}</div></td><td><div className="service-name">{l.servico}</div><div className="doctor-name">{l.medico}</div></td><td>{formaLabel[l.forma??'']??'—'}</td><td className="whitespace-nowrap font-medium">{money(l.valor)}</td>
   <td><span className={`status-badge tone-${l.status==='autorizada'?'success':'error'}`}><span className="status-dot"/>{statusLabel[l.status]??l.status}</span></td>
   <td className="text-sm">{canceladas?<>{l.motivo??'—'}{l.substituta&&<div className="text-xs text-muted-foreground">Substituída pela nº {l.substituta}</div>}</>:l.envio}</td></tr>)}
 </tbody></table></div>;
}
