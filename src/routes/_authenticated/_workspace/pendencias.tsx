import {createFileRoute} from '@tanstack/react-router';
import {queryOptions,useSuspenseQuery} from '@tanstack/react-query';
import {getAdmin} from '@/lib/pendencias/functions';
import {AdminPendencias} from '@/components/pendencias/admin';
import {pageHead} from '@/lib/clinic';
const options=queryOptions({queryKey:['pend-admin'],queryFn:()=>getAdmin(),staleTime:0});
export const Route=createFileRoute('/_authenticated/_workspace/pendencias')({head:()=>pageHead('Central de Pendências','Administração Goable das informações para finalizar o Notas BNaves.'),loader:({context})=>context.queryClient.ensureQueryData(options),component:Page,errorComponent:()=> <div className="empty-state"><h1>Acesso exclusivo da administração Goable</h1><p>Entre com uma conta administradora para acessar Pendências.</p></div>});
function Page(){const {data}=useSuspenseQuery(options);return <AdminPendencias data={data}/>;}
