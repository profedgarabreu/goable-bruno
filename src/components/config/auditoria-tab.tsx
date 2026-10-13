import {Fragment,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {ChevronDown,ChevronRight,Download,Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {listarAuditoria,opcoesAuditoria} from '@/lib/notas/historico.functions';
import {rotuloAcao,entidadesAuditoria,paraCSV} from '@/lib/notas/historico';
import {saoPauloDate} from '@/lib/clinic';
import {erroAmigavel} from '@/components/clinic/form-kit';
import type {Painel} from './shared';

const TAM=25;
const menos=(d:string,n:number)=>{const x=new Date(`${d}T12:00:00Z`);x.setUTCDate(x.getUTCDate()-n);return x.toISOString().slice(0,10);};
const quandoBR=(iso:string)=>new Date(iso).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const fmt=(v:unknown)=>v==null?'—':typeof v==='object'?JSON.stringify(v):String(v);

export function AuditoriaTab({p}:{p:Painel}){
 const hoje=saoPauloDate();
 const [f,setF]=useState({de:menos(hoje,30),ate:hoje,operador_id:'',acao:'',entidade:''});const [pagina,setPagina]=useState(0);const [aberto,setAberto]=useState<string|null>(null);const [baixando,setBaixando]=useState(false);
 const listar=useServerFn(listarAuditoria);const opcoes=useServerFn(opcoesAuditoria);
 const filtros={de:f.de,ate:f.ate,operador_id:f.operador_id||null,acao:f.acao||null,entidade:f.entidade||null};
 const {data,isLoading,error}=useQuery({queryKey:['auditoria',filtros,pagina],queryFn:()=>listar({data:{...filtros,pagina,tamanho:TAM}})});
 const {data:op}=useQuery({queryKey:['auditoria-opcoes'],queryFn:()=>opcoes()});
 const set=(k:keyof typeof f,v:string)=>{setPagina(0);setF({...f,[k]:v});};
 const paginas=Math.max(1,Math.ceil((data?.total??0)/TAM));
 async function csv(){setBaixando(true);try{const r=await listar({data:{...filtros,pagina:0,tamanho:5000}});
  const txt=paraCSV(['Quando','Operador','Usuário','Ação','Entidade','ID','Resumo','Antes','Depois'],r.linhas.map(l=>[quandoBR(l.quando),l.operador??'',l.usuario,l.acaoLabel,entidadesAuditoria[l.entidade]??l.entidade,l.entidade_id??'',l.resumo,fmt(l.antes),fmt(l.depois)]));
  const u=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=`Auditoria_BNaves_${f.de}_a_${f.ate}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);
 }catch(e){toast.error(erroAmigavel(e));}finally{setBaixando(false);}}
 const sel=(k:'operador_id'|'acao'|'entidade',label:string,ops:{v:string;l:string}[])=><label className="grid gap-1 text-xs font-medium text-muted-foreground">{label}<Select value={f[k]||'all'} onValueChange={v=>set(k,v==='all'?'':v)}><SelectTrigger className="h-10 w-[200px] text-sm text-foreground"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{ops.map(o=><SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent></Select></label>;
 return <div className="grid gap-4">
  <p className="text-sm text-muted-foreground">Tudo o que foi feito no sistema, com quem fez e o que mudou. Visível somente para a administração Goable.</p>
  <div className="flex flex-wrap items-end gap-3">
   <label className="grid gap-1 text-xs font-medium text-muted-foreground">De<Input type="date" className="h-10" value={f.de} onChange={e=>e.target.value&&set('de',e.target.value)}/></label>
   <label className="grid gap-1 text-xs font-medium text-muted-foreground">Até<Input type="date" className="h-10" value={f.ate} onChange={e=>e.target.value&&set('ate',e.target.value)}/></label>
   {sel('operador_id','Operador',p.operadores.map(o=>({v:o.id as string,l:o.nome as string})))}
   {sel('acao','Ação',(op?.acoes??[]).map(a=>({v:a,l:rotuloAcao(a)})))}
   {sel('entidade','Entidade',(op?.entidades??[]).map(a=>({v:a,l:entidadesAuditoria[a]??a})))}
   <Button variant="outline" className="ml-auto" disabled={baixando} onClick={csv}>{baixando?<Loader2 className="animate-spin"/>:<Download/>}Exportar CSV</Button>
  </div>
  {error&&<p className="text-destructive">{erroAmigavel(error)}</p>}
  <div className="table-section"><div className="table-scroll"><table className="appointments-table"><thead><tr><th aria-label="Detalhe"/><th>Quando</th><th>Operador</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Resumo</th></tr></thead><tbody>
   {isLoading&&<tr><td colSpan={7} className="text-center text-muted-foreground"><Loader2 className="inline animate-spin"/> Carregando…</td></tr>}
   {data?.linhas.length===0&&<tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum registro neste filtro.</td></tr>}
   {data?.linhas.map(l=><Fragment key={l.id}><tr className="cursor-pointer" onClick={()=>setAberto(aberto===l.id?null:l.id)}>
    <td>{aberto===l.id?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</td><td className="whitespace-nowrap text-sm">{quandoBR(l.quando)}</td><td>{l.operador??'—'}</td><td className="text-sm">{l.usuario}</td><td className="text-sm">{l.acaoLabel}</td><td className="text-sm">{entidadesAuditoria[l.entidade]??l.entidade}</td><td className="max-w-[420px] whitespace-normal text-sm">{l.resumo}</td></tr>
    {aberto===l.id&&<tr><td/><td colSpan={6}><Diff antes={l.antes} depois={l.depois}/></td></tr>}</Fragment>)}
  </tbody></table></div>
  <div className="table-footer"><span>{data?.total??0} registros · página {pagina+1} de {paginas}</span><span className="flex gap-2"><Button size="sm" variant="outline" disabled={pagina===0} onClick={()=>setPagina(pagina-1)}>Anterior</Button><Button size="sm" variant="outline" disabled={pagina>=paginas-1} onClick={()=>setPagina(pagina+1)}>Próxima</Button></span></div></div>
 </div>;
}

function Diff({antes,depois}:{antes:unknown;depois:unknown}){
 const obj=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:v==null?{}:{valor:v};
 const a=obj(antes),d=obj(depois);const chaves=[...new Set([...Object.keys(a),...Object.keys(d)])];
 if(!chaves.length)return <p className="py-2 text-sm text-muted-foreground">Sem detalhes registrados.</p>;
 return <table className="my-2 w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="font-medium">Campo</th><th className="font-medium">Antes</th><th className="font-medium">Depois</th></tr></thead><tbody>
  {chaves.map(k=>{const mudou=fmt(a[k])!==fmt(d[k]);return <tr key={k} className="border-t border-border align-top"><td className="py-1 pr-3 font-medium">{k}</td><td className={`py-1 pr-3 break-all ${mudou?'text-destructive':''}`}>{fmt(a[k])}</td><td className={`py-1 break-all ${mudou?'text-success':''}`}>{fmt(d[k])}</td></tr>;})}
 </tbody></table>;
}
