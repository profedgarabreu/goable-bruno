import {createFileRoute,Link,useNavigate} from '@tanstack/react-router';
import {useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {Search,MoreHorizontal,FileText,FileCode2,Ban,RefreshCcw,Plus,Loader2,AlertTriangle,UserRoundPen} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {money,pageHead,saoPauloDate} from '@/lib/clinic';
import {mascararCPF} from '@/lib/notas/rules';
import {motivosCancelamento} from '@/lib/notas/nota';
import {notaStatusUI,type StatusNota} from '@/lib/notas/status-ui';
import {listarNotas,cancelarNota,reemitirNota,sincronizarPendentes} from '@/lib/notas/emissao.functions';
import {editarAtendimento} from '@/lib/notas/atendimentos.functions';
import {painelConfiguracoes} from '@/lib/notas/config.functions';
import {useOperator} from '@/components/clinic/operator-context';
import {Field,erroAmigavel} from '@/components/clinic/form-kit';
import {PacienteDrawer,type Paciente} from '@/components/pacientes/paciente-drawer';
import {useAbrirArquivo} from '@/components/notas/acoes-arquivo';

export const Route=createFileRoute('/_authenticated/_workspace/notas')({
 head:()=>pageHead('Notas emitidas','Consulte, baixe, cancele ou reemita as notas fiscais do consultório.'),
 component:NotasPage,
});
type Nota=Awaited<ReturnType<typeof listarNotas>>[number];
const inicioMes=(d:string)=>`${d.slice(0,7)}-01`;
const fimMes=(d:string)=>{const [y,m]=d.split('-').map(Number);return new Date(Date.UTC(y!,m!,0)).toISOString().slice(0,10);};
const TODOS='todos';

function NotasPage(){
 const hoje=saoPauloDate();const {operatorId}=useOperator();const qc=useQueryClient();
 const [de,setDe]=useState(inicioMes(hoje));const [ate,setAte]=useState(fimMes(hoje));const [status,setStatus]=useState(TODOS);const [medico,setMedico]=useState(TODOS);const [canal,setCanal]=useState(TODOS);const [busca,setBusca]=useState('');
 const listar=useServerFn(listarNotas);const painel=useServerFn(painelConfiguracoes);const sync=useServerFn(sincronizarPendentes);const abrir=useAbrirArquivo();
 const {data:notas,isLoading}=useQuery({queryKey:['notas',de,ate,status,medico],queryFn:()=>listar({data:{de,ate,status:status===TODOS?null:status as StatusNota,medico_id:medico===TODOS?null:medico}})});
 const {data:p}=useQuery({queryKey:['painel-config'],queryFn:()=>painel()});
 const [cancelar,setCancelar]=useState<Nota|null>(null);const [reemitir,setReemitir]=useState<Nota|null>(null);const [sincronizando,setSincronizando]=useState(false);
 const visiveis=useMemo(()=>{const q=busca.trim().toLocaleLowerCase('pt-BR');const qd=busca.replace(/\D/g,'');
  return (notas??[]).filter(n=>{const env=n.envios??[];
   if(canal==='nao'&&env.length)return false;if((canal==='email'||canal==='whatsapp')&&!env.some(e=>e.canal===canal))return false;
   if(!q)return true;const pac=n.atendimento?.paciente;
   return (pac?.nome??'').toLocaleLowerCase('pt-BR').includes(q)||(qd.length>=3&&((pac?.cpf??'').includes(qd)||(n.numero??'').includes(qd)));});},[notas,busca,canal]);
 const recarregar=()=>qc.invalidateQueries({queryKey:['notas']});
 async function sincronizar(){setSincronizando(true);try{const r=await sync({data:{operador_id:operatorId}});toast.success(r.verificadas?`${r.verificadas} nota(s) verificada(s) no emissor.`:'Nenhuma nota em processamento.');await recarregar();}catch(e){toast.error(erroAmigavel(e));}finally{setSincronizando(false);}}
 return <div>
  <div className="page-heading"><div><div className="title-eyebrow">ARQUIVO FISCAL</div><h1>Notas emitidas</h1><p>PDF, XML, cancelamento e reemissão.</p></div>
   <div className="heading-actions"><Button variant="outline" size="lg" disabled={sincronizando} onClick={sincronizar}>{sincronizando?<Loader2 className="animate-spin"/>:<RefreshCcw/>}Atualizar pendentes</Button><Button variant="action" size="lg" asChild><Link to="/importar" search={{modo:'manual'}}><Plus/>Emitir avulsa</Link></Button></div></div>
  <section className="table-section"><div className="notas-filtros">
   <Field label="De"><Input type="date" value={de} onChange={e=>e.target.value&&setDe(e.target.value)}/></Field>
   <Field label="Até"><Input type="date" value={ate} onChange={e=>e.target.value&&setAte(e.target.value)}/></Field>
   <Field label="Situação"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value={TODOS}>Todas</SelectItem>{Object.entries(notaStatusUI).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></Field>
   <Field label="Médico"><Select value={medico} onValueChange={setMedico}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value={TODOS}>Todos</SelectItem>{(p?.medicos??[]).map(m=><SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></Field>
   <Field label="Envio"><Select value={canal} onValueChange={setCanal}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value={TODOS}>Todos</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="nao">Não enviada</SelectItem></SelectContent></Select></Field>
   <Field label="Buscar" className="notas-busca"><div className="search-field"><Search size={14}/><Input aria-label="Buscar nota" placeholder="Paciente, CPF ou número" value={busca} onChange={e=>setBusca(e.target.value)}/></div></Field>
  </div>
   <div className="table-scroll"><table className="appointments-table"><thead><tr><th>Número</th><th>Data</th><th>Paciente</th><th>Serviço</th><th>Valor</th><th>Nota</th><th>Envio</th><th aria-label="Ações"/></tr></thead><tbody>
    {isLoading&&<tr><td colSpan={8} className="text-center text-muted-foreground"><Loader2 className="inline animate-spin"/> Carregando…</td></tr>}
    {!isLoading&&!visiveis.length&&<tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Nenhuma nota neste período. As notas aparecem aqui depois de <Link to="/conferencia" className="font-semibold text-primary underline">aprovadas na conferência</Link>.</td></tr>}
    {visiveis.map(n=>{const st=notaStatusUI[n.status as StatusNota];const pac=n.atendimento?.paciente;
     return <tr key={n.id}><td className="font-medium">{n.numero??'—'}{n.ambiente==='mock'&&<div className="text-[11px] text-muted-foreground">demonstração</div>}</td>
      <td className="whitespace-nowrap text-muted-foreground">{n.atendimento?new Date(`${n.atendimento.data_atendimento}T12:00`).toLocaleDateString('pt-BR'):'—'}</td>
      <td><div className="patient-name">{pac?.nome}</div><div className="patient-cpf">{mascararCPF(pac?.cpf)}</div></td>
      <td>{n.atendimento?.servico?.nome??'—'}<div className="doctor-name">{n.atendimento?.medico?.nome}</div></td>
      <td className="whitespace-nowrap">{money(n.valor)}</td>
      <td><span className={`status-badge tone-${st.tone}`}>{st.label}</span>{n.status==='erro'&&n.mensagem_erro&&<div className="mt-1 max-w-[220px] whitespace-normal text-xs text-destructive">{n.mensagem_erro}</div>}{n.status==='cancelada'&&n.motivo_cancelamento&&<div className="mt-1 text-xs text-muted-foreground">{n.motivo_cancelamento}</div>}</td>
      <td><span className="status-badge tone-muted">{(n.envios??[]).length?(n.envios??[]).map(e=>e.canal==='email'?'E-mail':'WhatsApp').join(' + '):'Não enviada'}</span></td>
      <td><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações da nota de ${pac?.nome}`}><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
       <DropdownMenuItem disabled={!n.pdf_path} onSelect={()=>abrir(n.id,'pdf')}><FileText/>Ver PDF</DropdownMenuItem>
       <DropdownMenuItem disabled={!n.xml_path} onSelect={()=>abrir(n.id,'xml')}><FileCode2/>Baixar XML</DropdownMenuItem>
       {n.lote_id&&(n.status==='erro'||n.status==='processando'||n.status==='pendente')&&<DropdownMenuItem asChild><Link to="/notas/lote/$id" params={{id:n.lote_id}}><RefreshCcw/>Abrir lote</Link></DropdownMenuItem>}
       <DropdownMenuItem disabled={n.status!=='autorizada'} className="text-destructive" onSelect={()=>setCancelar(n)}><Ban/>Cancelar</DropdownMenuItem>
       <DropdownMenuItem disabled={n.status!=='autorizada'&&n.status!=='cancelada'} onSelect={()=>setReemitir(n)}><RefreshCcw/>Reemitir corrigida</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu></td></tr>;})}
   </tbody></table></div>
   <div className="table-footer"><span>{visiveis.length} nota{visiveis.length===1?'':'s'}</span><span>Total autorizado <strong className="total-value">{money(visiveis.filter(n=>n.status==='autorizada').reduce((s,n)=>s+n.valor,0))}</strong></span></div>
  </section>
  {cancelar&&<CancelarDialog nota={cancelar} onClose={()=>setCancelar(null)} onDone={async()=>{setCancelar(null);await recarregar();}}/>}
  {reemitir&&<ReemitirDialog nota={reemitir} servicos={p?.servicos??[]} regras={p?.regras??[]} onClose={()=>{setReemitir(null);void recarregar();}}/>}
 </div>;
}

function MotivoCampos({motivo,setMotivo,outro,setOutro}:{motivo:string;setMotivo:(v:string)=>void;outro:string;setOutro:(v:string)=>void}){
 return <><Field label="Motivo do cancelamento"><Select value={motivo} onValueChange={setMotivo}><SelectTrigger aria-label="Motivo do cancelamento"><SelectValue placeholder="Escolha o motivo"/></SelectTrigger><SelectContent>{motivosCancelamento.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></Field>
  {motivo==='Outro'&&<Field label="Descreva o motivo"><Textarea value={outro} onChange={e=>setOutro(e.target.value)} maxLength={240}/></Field>}
  <p className="flex items-start gap-2 rounded-md bg-[var(--warning-soft)] p-3 text-sm"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--warning)]"/>A nota será cancelada no emissor oficial.</p></>;
}
const textoMotivo=(m:string,o:string)=>m==='Outro'?o.trim():m;

function CancelarDialog({nota,onClose,onDone}:{nota:Nota;onClose:()=>void;onDone:()=>Promise<void>}){
 const fn=useServerFn(cancelarNota);const {operatorId}=useOperator();const [motivo,setMotivo]=useState('');const [outro,setOutro]=useState('');const [busy,setBusy]=useState(false);
 const txt=textoMotivo(motivo,outro);
 async function ok(){setBusy(true);try{await fn({data:{nota_id:nota.id,motivo:txt,operador_id:operatorId}});toast.success('Nota cancelada. O atendimento voltou para conferência.');await onDone();}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 return <Dialog open onOpenChange={o=>!o&&onClose()}><DialogContent><DialogHeader><DialogTitle>Cancelar nota {nota.numero}</DialogTitle><DialogDescription>{nota.atendimento?.paciente?.nome} · {money(nota.valor)}</DialogDescription></DialogHeader>
  <div className="grid gap-4"><MotivoCampos motivo={motivo} setMotivo={setMotivo} outro={outro} setOutro={setOutro}/></div>
  <DialogFooter><Button variant="outline" onClick={onClose}>Voltar</Button><Button variant="destructive" size="lg" disabled={txt.length<5||busy} onClick={ok}>{busy&&<Loader2 className="animate-spin"/>}Cancelar nota</Button></DialogFooter></DialogContent></Dialog>;
}

/** Cancel (if needed) → correct patient/appointment → new note with a new reference; the old one becomes "substituída". */
function ReemitirDialog({nota,servicos,regras,onClose}:{nota:Nota;servicos:{id:string;nome:string;ativo:boolean}[];regras:{id:string;nome:string}[];onClose:()=>void}){
 const {operatorId}=useOperator();const navigate=useNavigate();
 const fns={cancelar:useServerFn(cancelarNota),editar:useServerFn(editarAtendimento),reemitir:useServerFn(reemitirNota)};
 const a=nota.atendimento!;const [jaCancelada,setJaCancelada]=useState(nota.status==='cancelada');
 const [motivo,setMotivo]=useState('');const [outro,setOutro]=useState('');
 const [servico,setServico]=useState(a.servico?.id??'');const [valor,setValor]=useState(String(a.valor).replace('.',','));const qtd=a.quantidade;
 const [paciente,setPaciente]=useState<Paciente|null>(null);const [busy,setBusy]=useState(false);
 const v=Number(valor.replace(/\./g,'').replace(',','.'));const txt=textoMotivo(motivo,outro);
 async function salvar(){setBusy(true);try{
  if(!jaCancelada){await fns.cancelar({data:{nota_id:nota.id,motivo:txt,operador_id:operatorId}});setJaCancelada(true);}
  if(servico!==a.servico?.id||Math.abs(v-Number(a.valor))>0.001)await fns.editar({data:{atendimento_id:a.id,servico_id:servico||null,valor:Math.round(v*100)/100,quantidade:qtd,operador_id:operatorId}});
  const r=await fns.reemitir({data:{nota_id:nota.id,operador_id:operatorId}});
  toast.success('Nova nota criada. Emitindo…');if(r.lote_id)await navigate({to:'/notas/lote/$id',params:{id:r.lote_id}});
 }catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 return <><Dialog open={!paciente} onOpenChange={o=>!o&&onClose()}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Reemitir corrigida</DialogTitle><DialogDescription>{a.paciente?.nome} · nota {nota.numero??'—'}. A nota atual {jaCancelada?'já está cancelada':'será cancelada'} e uma nova será emitida com nova referência.</DialogDescription></DialogHeader>
  <div className="grid gap-4">
   {!jaCancelada&&<MotivoCampos motivo={motivo} setMotivo={setMotivo} outro={outro} setOutro={setOutro}/>}
   <div className="grid grid-cols-[1fr_130px] gap-3"><Field label="Serviço"><Select value={servico||'none'} onValueChange={setServico}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{servicos.filter(s=>s.ativo).map(s=><SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select></Field><Field label="Valor (R$)"><Input inputMode="decimal" value={valor} onChange={e=>setValor(e.target.value.replace(/[^\d,.]/g,''))}/></Field></div>
   {a.paciente&&<Button variant="outline" onClick={()=>setPaciente(a.paciente as unknown as Paciente)}><UserRoundPen/>Corrigir cadastro do paciente</Button>}
  </div>
  <DialogFooter><Button variant="outline" onClick={onClose}>Voltar</Button><Button variant="action" size="lg" disabled={busy||!(v>0)||!servico||(!jaCancelada&&txt.length<5)} onClick={salvar}>{busy&&<Loader2 className="animate-spin"/>}Salvar e reemitir</Button></DialogFooter></DialogContent></Dialog>
  {paciente&&<PacienteDrawer paciente={paciente} regras={regras} onClose={()=>setPaciente(null)} onAbrirExistente={()=>setPaciente(null)} onSaved={async()=>{toast.success('Cadastro corrigido. Agora clique em "Salvar e reemitir".');}}/>}
 </>;
}
