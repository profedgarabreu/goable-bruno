import {createFileRoute,Outlet,redirect} from '@tanstack/react-router';
import {operatorKey,parseOperator} from '@/lib/clinic';
import {AppShell} from '@/components/clinic/shell';
export const Route=createFileRoute('/_authenticated/_workspace')({beforeLoad:()=>{if(!parseOperator(sessionStorage.getItem(operatorKey)))throw redirect({to:'/operador'});},component:()=> <AppShell><Outlet/></AppShell>});
