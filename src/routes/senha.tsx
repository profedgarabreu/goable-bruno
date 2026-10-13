import {createFileRoute,useNavigate} from '@tanstack/react-router';
import {useState,type FormEvent} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Brand} from '@/components/clinic/brand';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/senha')({head:()=>pageHead('Nova senha','Redefina sua senha de acesso ao Notas BNaves.'),component:Password});
function Password(){const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const navigate=useNavigate();async function submit(e:FormEvent){e.preventDefault();if(password!==confirm){setMessage('As senhas precisam ser iguais.');return;}setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);if(error)setMessage('O link expirou ou a senha não atende aos requisitos. Solicite um novo link.');else await navigate({to:'/'});}return <main className="auth-panel min-h-screen"><form className="auth-form" onSubmit={submit}><Brand/><h2>Definir nova senha</h2><p>Escolha uma senha com pelo menos 8 caracteres.</p>{message&&<div role="alert" className="auth-message tone-error">{message}</div>}<label className="auth-field">Nova senha<Input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="auth-field">Confirmar senha<Input required minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><Button size="lg" variant="action" className="w-full" disabled={busy}>Salvar senha</Button></form></main>;}
