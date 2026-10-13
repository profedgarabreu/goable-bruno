import {createFileRoute} from '@tanstack/react-router';
import {queryOptions,useSuspenseQuery} from '@tanstack/react-query';
import {getClient} from '@/lib/pendencias/functions';
import {ClientPendencias} from '@/components/pendencias/client';
import {pageHead} from '@/lib/clinic';
import {ShieldX} from 'lucide-react';
const options=(token:string)=>queryOptions({queryKey:['pend-client',token],queryFn:()=>getClient({data:{token}}),staleTime:0});
export const Route=createFileRoute('/responder/$token')({head:()=>({...pageHead('Informações para finalizar seu sistema','Responda com segurança às pendências do consultório BNaves.'),meta:[...pageHead('Informações para finalizar seu sistema','Responda com segurança às pendências do consultório BNaves.').meta,{name:'robots',content:'noindex,nofollow,noarchive'},{name:'referrer',content:'no-referrer'}]}),loader:({context,params})=>context.queryClient.ensureQueryData(options(params.token)),component:Page});
function Page(){const {token}=Route.useParams();const {data}=useSuspenseQuery(options(token));return data.ok?<ClientPendencias token={token} bundle={data.bundle}/>:<main className="pend-invalid"><ShieldX size={44}/><h1>Link inválido ou expirado</h1><p>Peça um novo link à Goable.</p></main>;}
