import {createFileRoute,useNavigate} from '@tanstack/react-router';
import {queryOptions,useSuspenseQuery} from '@tanstack/react-query';
import {ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Brand} from '@/components/clinic/brand';
import {DemoBanner} from '@/components/clinic/shell';
import {useOperator} from '@/components/clinic/operator-context';
import {pageHead} from '@/lib/clinic';
import {listarOperadores} from '@/lib/notas/functions';
const operadoresQuery=queryOptions({queryKey:['nf_operadores'],queryFn:()=>listarOperadores()});
export const Route=createFileRoute('/_authenticated/operador')({head:()=>pageHead('Escolher operadora','Identifique a operadora da sessão do consultório BNaves.'),loader:({context})=>context.queryClient.ensureQueryData(operadoresQuery),component:OperatorPage});
function OperatorPage(){const {choose}=useOperator();const navigate=useNavigate();const {data}=useSuspenseQuery(operadoresQuery);const ativos=data.filter(o=>o.ativo);return <><DemoBanner/><main className="operator-page"><Brand/><h1>Quem está operando hoje?</h1><p>Olá! Selecione seu nome para começar.</p><div className="operator-cards">{ativos.map(o=><Button variant="outline" className="operator-card" key={o.id} onClick={()=>{choose({id:o.id,nome:o.nome});navigate({to:'/'});}}><span className="avatar">{o.nome[0]}</span><strong>{o.nome}</strong><small className="flex items-center gap-2">Entrar no consultório <ArrowRight size={14}/></small></Button>)}{ativos.length===0&&<p>Nenhuma operadora ativa cadastrada.</p>}</div><div className="auth-footer">por Goable AI</div></main></>;}
