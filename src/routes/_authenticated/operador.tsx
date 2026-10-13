import {createFileRoute,useNavigate} from '@tanstack/react-router';
import {ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Brand} from '@/components/clinic/brand';
import {DemoBanner} from '@/components/clinic/shell';
import {useOperator} from '@/components/clinic/operator-context';
import {operators,pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/_authenticated/operador')({head:()=>pageHead('Escolher operadora','Identifique a operadora da sessão do consultório BNaves.'),component:OperatorPage});
function OperatorPage(){const {choose}=useOperator();const navigate=useNavigate();return <><DemoBanner/><main className="operator-page"><Brand/><h1>Quem está operando hoje?</h1><p>Olá! Selecione seu nome para começar.</p><div className="operator-cards">{operators.map(name=><Button variant="outline" className="operator-card" key={name} onClick={()=>{choose(name);navigate({to:'/'});}}><span className="avatar">{name[0]}</span><strong>{name}</strong><small className="flex items-center gap-2">Entrar no consultório <ArrowRight size={14}/></small></Button>)}</div><div className="auth-footer">por Goable AI</div></main></>;}
