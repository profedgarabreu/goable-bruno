import {createFileRoute} from '@tanstack/react-router';
import {Settings} from 'lucide-react';
import {useState,useEffect,type FormEvent} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {supabase} from '@/integrations/supabase/client';
import {createClinicUser} from '@/lib/auth.functions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {EmptyPage} from '@/components/clinic/empty-page';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/_authenticated/_workspace/configuracoes')({head:()=>pageHead('Configurações','As informações que mantêm suas notas em dia.'),component:Configuration});
function Configuration(){const [admin,setAdmin]=useState(false);const [expanded,setExpanded]=useState(false);const [email,setEmail]=useState('');const [nome,setNome]=useState('');const [password,setPassword]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const createUser=useServerFn(createClinicUser);
 useEffect(()=>{supabase.auth.getUser().then(async({data})=>{if(!data.user)return;const {data:allowed}=await supabase.rpc('nf_has_role',{_user_id:data.user.id,_role:'admin_goable'});setAdmin(allowed===true);});},[]);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{const result=await createUser({data:{email,nome,password}});setMessage(result.message);if(result.ok){setEmail('');setNome('');setPassword('');}}catch{setMessage('Não foi possível criar o acesso. Tente novamente.');}finally{setBusy(false);}}
 return <><EmptyPage title="Configurações" subtitle="As informações que mantêm suas notas em dia." icon={Settings} emptyTitle="Vamos preparar o consultório" description="Dados do emitente, médicos, serviços, alíquotas e parâmetros fiscais serão configurados aqui." stage="M2"/>{admin&&<section className="border-t border-border pt-6"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Acessos do consultório</h2><Button variant="outline" onClick={()=>setExpanded(!expanded)}>{expanded?'Fechar':'Criar acesso'}</Button></div>{expanded&&<form className="mt-6 max-w-md" onSubmit={submit}>{message&&<p role="status" className="auth-message tone-info">{message}</p>}<label className="auth-field">Nome<Input required minLength={2} value={nome} onChange={e=>setNome(e.target.value)}/></label><label className="auth-field">E-mail<Input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="auth-field">Senha inicial<Input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><Button variant="action" size="lg" disabled={busy}>Criar acesso do consultório</Button></form>}</section>}</>;
}
