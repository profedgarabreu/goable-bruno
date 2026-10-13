import {Link,useNavigate,useRouter,useRouterState} from '@tanstack/react-router';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {getBadge} from '@/lib/pendencias/functions';
import {useServerFn} from '@tanstack/react-start';
import {statusEmissor} from '@/lib/notas/emissao.functions';
import {contadoresMenu} from '@/lib/notas/historico.functions';
import {CalendarDays,Upload,ClipboardCheck,FileText,Users,ChartNoAxesCombined,Settings,LogOut,FlaskConical,Menu,ArrowRight,ChevronDown,ShieldCheck,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Brand} from './brand';
import {useOperator} from './operator-context';
import {supabase} from '@/integrations/supabase/client';
import {saoPauloDate} from '@/lib/clinic';
import {AliquotaBanner} from './aliquota-banner';
const nav = [{to:'/',label:'Hoje',icon:CalendarDays},{to:'/importar',label:'Importar',icon:Upload},{to:'/conferencia',label:'Conferência',icon:ClipboardCheck},{to:'/notas',label:'Notas emitidas',icon:FileText},{to:'/pacientes',label:'Pacientes',icon:Users},{to:'/historico',label:'Histórico',icon:ChartNoAxesCombined},{to:'/pendencias',label:'Pendências',icon:ClipboardCheck},{to:'/configuracoes',label:'Configurações',icon:Settings}] as const;
/** Top strip reflects the issuer mode: mock → demo, homologação → test environment, produção → none. */
export function DemoBanner() {
 const fn=useServerFn(statusEmissor);
 const {data}=useQuery({queryKey:['status-emissor'],queryFn:()=>fn(),staleTime:60000});
 const modo=data?.modo??'mock';
 if(modo==='producao')return null;
 return modo==='homologacao'
  ?<div className="demo-banner"><FlaskConical size={13}/><strong>HOMOLOGAÇÃO</strong><span>— ambiente de testes da Receita</span></div>
  :<div className="demo-banner"><FlaskConical size={13}/><strong>DEMONSTRAÇÃO</strong><span>— notas sem valor fiscal</span></div>;
}
export function AppShell({children}:{children:React.ReactNode}) {
 const {operator,choose}=useOperator();const navigate=useNavigate();const router=useRouter();const {queryClient}=router.options.context;const [open,setOpen]=useState(false);const [leaving,setLeaving]=useState(false);
 const pathname=useRouterState({select:s=>s.location.pathname});
 const {data:badge}=useQuery({queryKey:['pend-badge'],queryFn:()=>getBadge(),refetchInterval:30000});
 const [date]=useState(()=>saoPauloDate());
 const contFn=useServerFn(contadoresMenu);const {data:cont}=useQuery({queryKey:['menu-contadores'],queryFn:()=>contFn(),refetchInterval:30000});
 const contagemNav:Partial<Record<string,number>>={'/conferencia':cont?.conferencia,'/notas':cont?.notas};
 async function logout() {setLeaving(true);await queryClient.cancelQueries();queryClient.clear(); const {error}=await supabase.auth.signOut(); if(error){setLeaving(false);return;} choose(null);await navigate({to:'/login',replace:true});}
 return <div className="app-shell"><aside className={`sidebar ${open?'is-open':''}`}><div className="sidebar-brand"><Brand/></div><div className="sidebar-caption">ROTINA DO CONSULTÓRIO</div><nav className="nav-list" aria-label="Menu principal">{nav.filter(n=>n.to!=='/pendencias'||badge?.admin).map(({to,label,icon:Icon})=><Link key={to} to={to} activeOptions={{exact:true}} className="nav-link" onClick={()=>setOpen(false)}><Icon size={19} strokeWidth={1.7}/>{label}{to==='/pendencias'&&<span className="nav-count">{badge?.count||0}</span>}{!!contagemNav[to]&&<span className="nav-count" aria-label={`${contagemNav[to]} pendentes`}>{contagemNav[to]}</span>}</Link>)}</nav><div className="sidebar-bottom"><div className="clinic-name">BNaves Consultório<br/>de Angiologia</div><div className="clinic-city">Belo Horizonte · MG</div><div className="goable"><Sparkles size={12}/> por <strong>Goable AI</strong><ArrowRight size={12}/></div></div></aside><div className="app-body"><header className="topbar"><div className="topbar-left"><Button variant="ghost" size="icon" className="mobile-menu" aria-label={open?'Fechar menu':'Abrir menu'} onClick={()=>setOpen(!open)}><Menu/></Button><span>Consultório</span><span>/</span><span className="text-foreground">{nav.find(n=>n.to===pathname)?.label||'Hoje'}</span></div><div className="topbar-actions"><div className="topbar-left"><CalendarDays size={15}/><time dateTime={date}>{new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</time></div><div className="topbar-divider"/><div className="operator-header"><span className="avatar">{operator?.slice(0,1)||'?'}</span><div><small>OPERADORA</small><strong className="font-medium">{operator||'Selecionar'}</strong></div><Button variant="ghost" size="icon" title="Trocar operadora" aria-label="Trocar operadora" onClick={()=>navigate({to:'/operador'})}><ChevronDown/></Button></div><div className="topbar-divider"/><Button variant="ghost" size="icon" title="Sair" aria-label="Sair" disabled={leaving} onClick={logout}><LogOut size={17}/></Button></div></header><DemoBanner/><AliquotaBanner/><main className="page-content">{children}<footer className="workspace-footer"><span>Notas BNaves · Cuidado também na rotina.</span><span className="flex items-center gap-1.5"><ShieldCheck size={12}/> Acesso protegido · por Goable AI</span></footer></main></div></div>;
}
