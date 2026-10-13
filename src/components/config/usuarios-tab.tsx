import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {Copy,Loader2,UserPlus,Ban,RotateCcw,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {listarUsuarios,convidarUsuario,revogarConvite,definirUsuarioAtivo} from '@/lib/notas/admin.functions';
import {DataTable,Field,Pill,erroAmigavel} from '@/components/clinic/form-kit';
import {TableSkeleton} from '@/components/clinic/table-skeleton';
import {useOperator} from '@/components/clinic/operator-context';
import {dataBR} from './shared';

const papeis={consultorio:'Consultório',admin_goable:'Administração Goable'} as const;
type Confirmar={titulo:string;texto:string;acao:()=>Promise<unknown>}|null;

export function UsuariosTab(){
 const qc=useQueryClient();const {operatorId}=useOperator();
 const fn=useServerFn(listarUsuarios);const convidar=useServerFn(convidarUsuario);const revogar=useServerFn(revogarConvite);const ativar=useServerFn(definirUsuarioAtivo);
 const {data,isLoading}=useQuery({queryKey:['usuarios'],queryFn:()=>fn()});
 const [aberto,setAberto]=useState(false);const [email,setEmail]=useState('');const [papel,setPapel]=useState<'consultorio'|'admin_goable'>('consultorio');
 const [busy,setBusy]=useState(false);const [link,setLink]=useState<string|null>(null);const [confirmar,setConfirmar]=useState<Confirmar>(null);
 const recarregar=()=>qc.invalidateQueries({queryKey:['usuarios']});
 async function enviar(){setBusy(true);try{const r=await convidar({data:{email,papel,operador_id:operatorId}});setLink(`${window.location.origin}${r.caminho}`);await recarregar();}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 async function copiar(url:string){await navigator.clipboard.writeText(url);toast.success('Link copiado.');}
 async function executar(){if(!confirmar)return;setBusy(true);try{await confirmar.acao();toast.success('Feito.');await recarregar();setConfirmar(null);}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 return <div className="grid gap-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Usuários</h2><p className="text-sm text-muted-foreground">Quem acessa o sistema. Novos acessos entram somente por convite, válido por 7 dias.</p></div><Button variant="action" onClick={()=>{setEmail('');setPapel('consultorio');setLink(null);setAberto(true);}}><UserPlus/>Convidar</Button></div>
  {isLoading?<TableSkeleton colunas={5}/>:<DataTable head={['Nome','E-mail','Papel','Situação','Último acesso','']} empty={!data?.usuarios.length}>
   {data?.usuarios.map(u=><tr key={u.id}><td>{u.nome||'—'}</td><td>{u.email}</td><td>{u.papel?papeis[u.papel]:'Sem papel'}</td><td>{!u.ativo?<Pill tone="error">Desativado</Pill>:!u.confirmado?<Pill tone="warning">E-mail não confirmado</Pill>:<Pill tone="success">Ativo</Pill>}</td><td>{dataBR(u.ultimo_acesso)}</td>
    <td className="text-right">{u.id!==data.eu&&(u.ativo
     ?<Button variant="ghost" size="sm" onClick={()=>setConfirmar({titulo:'Desativar acesso',texto:`${u.email} não conseguirá mais entrar. Você pode reativar depois.`,acao:()=>ativar({data:{user_id:u.id,ativo:false,operador_id:operatorId}})})}><Ban/>Desativar</Button>
     :<Button variant="ghost" size="sm" onClick={()=>setConfirmar({titulo:'Reativar acesso',texto:`${u.email} voltará a conseguir entrar.`,acao:()=>ativar({data:{user_id:u.id,ativo:true,operador_id:operatorId}})})}><RotateCcw/>Reativar</Button>)}</td></tr>)}
  </DataTable>}
  <div><h3 className="mb-2 font-semibold">Convites</h3>
   {isLoading?<TableSkeleton colunas={4}/>:<DataTable head={['E-mail','Papel','Validade','']} empty={!data?.convites.length}>
    {data?.convites.map(c=><tr key={c.email}><td>{c.email}</td><td>{papeis[c.papel]}</td><td>{c.expirado?<Pill tone="muted">Expirado</Pill>:`até ${dataBR(c.expira_em)}`}</td>
     <td className="text-right whitespace-nowrap">{!c.expirado&&<Button variant="ghost" size="sm" onClick={()=>copiar(`${window.location.origin}/login?convite=${encodeURIComponent(c.email)}`)}><Copy/>Copiar link</Button>}<Button variant="ghost" size="sm" onClick={()=>setConfirmar({titulo:'Revogar convite',texto:`O link enviado para ${c.email} deixará de funcionar.`,acao:()=>revogar({data:{email:c.email,operador_id:operatorId}})})}><X/>Revogar</Button></td></tr>)}
   </DataTable>}
  </div>
  <Dialog open={aberto} onOpenChange={setAberto}><DialogContent><DialogHeader><DialogTitle>Convidar usuário</DialogTitle><DialogDescription>Gera um link de cadastro válido por 7 dias. Envie o link para a pessoa pelo WhatsApp ou e-mail.</DialogDescription></DialogHeader>
   {link?<div className="grid gap-3"><p className="text-[15px]">Convite criado. Copie o link e envie para <strong>{email}</strong>:</p><div className="flex gap-2"><Input readOnly value={link} aria-label="Link do convite" onFocus={e=>e.currentTarget.select()}/><Button variant="action" onClick={()=>copiar(link)}><Copy/>Copiar</Button></div><p className="text-sm text-muted-foreground">Ao abrir o link, a pessoa cria a própria senha com este mesmo e-mail.</p></div>
   :<div className="grid gap-4"><Field label="E-mail"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="secretaria@exemplo.com"/></Field>
    <Field label="Papel"><Select value={papel} onValueChange={v=>setPapel(v as typeof papel)}><SelectTrigger aria-label="Papel"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="consultorio">Consultório (secretária)</SelectItem><SelectItem value="admin_goable">Administração Goable</SelectItem></SelectContent></Select></Field></div>}
   <DialogFooter>{link?<Button variant="outline" onClick={()=>setAberto(false)}>Fechar</Button>:<Button variant="action" size="lg" disabled={busy||!/.+@.+\..+/.test(email)} onClick={enviar}>{busy&&<Loader2 className="animate-spin"/>}Gerar convite</Button>}</DialogFooter>
  </DialogContent></Dialog>
  <Dialog open={!!confirmar} onOpenChange={o=>!o&&setConfirmar(null)}><DialogContent><DialogHeader><DialogTitle>{confirmar?.titulo}</DialogTitle><DialogDescription>{confirmar?.texto}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setConfirmar(null)}>Voltar</Button><Button variant="destructive" disabled={busy} onClick={executar}>{busy&&<Loader2 className="animate-spin"/>}Confirmar</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}
