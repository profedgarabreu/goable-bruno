import {createFileRoute,redirect} from '@tanstack/react-router';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/auth')({head:()=>pageHead('Acesso','Acesso seguro ao consultório BNaves.'),beforeLoad:()=>{throw redirect({to:'/login',replace:true});}});
