import {createFileRoute,Link,useNavigate} from '@tanstack/react-router';
import {TableSkeleton} from '@/components/clinic/table-skeleton';
import {useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {toast} from 'sonner';
import {CalendarDays,ChevronLeft,ChevronRight,Upload,Search,MoreHorizontal,UserRoundPen,ShieldCheck,ArrowRight,Loader2,Pencil,Ban,Trash2,KeyRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {money,pageHead,saoPauloDate} from '@/lib/clinic';
import {useOperator} from '@/components/clinic/operator-context';
import {listarDia,marcarPago,atualizarForma,liberarAutorizacao,reavaliarPaciente,editarAtendimento,marcarSemNota,excluirAtendimento} from '@/lib/notas/atendimentos.functions';
import {painelConfiguracoes} from '@/lib/notas/config.functions';
import {mascararCPF,type StatusAtendimento} from '@/lib/notas/rules';
import {formasPagamento,type FormaPagamento} from '@/lib/notas/importacao';
import {statusUI,categoriasHoje,categoriaDe,type CategoriaHoje} from '@/lib/notas/status-ui';
import {Field,erroAmigavel} from '@/components/clinic/form-kit';
import {PacienteDrawer,type Paciente} from '@/components/pacientes/paciente-drawer';

export const Route=createFileRoute('/_authenticated/_workspace/')({
 validateSearch:z.object({data:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}),
 head:()=>pageHead('Hoje','Atendimentos do dia, ok de pagamento e pendências antes da conferência.'),
 component:Today,
});
type Linha=Awaited<ReturnType<typeof listarDia>>[number];
const somaDias=(d:string,n:number)=>{const x=new Date(`${d}T12:00:00Z`);x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};

function Today(){
 const {operator,operatorId}=useOperator();const hoje=saoPauloDate();
 const {data:dataSel=hoje}=Route.useSearch();const navigate=useNavigate({from:Route.fullPath});
 const setData=(d:string)=>navigate({search:{data:d===hoje?undefined:d},replace:true});
 const qc=useQueryClient();const listar=useServerFn(listarDia);const painel=useServerFn(painelConfiguracoes);
 const {data:linhas,isLoading}=useQuery({queryKey:['dia',dataSel],queryFn:()=>listar({data:{data:dataSel}})});
 const {data:p}=useQuery({queryKey:['painel-config'],queryFn:()=>painel()});
 const [busca,setBusca]=useState('');const [cat,setCat]=useState<CategoriaHoje|null>(null);
 const [paciente,setPaciente]=useState<Paciente|null>(null);const [liberar,setLiberar]=useState<Linha|null>(null);const [editar,setEditar]=useState<Linha|null>(null);const [excluir,setExcluir]=useState<Linha|null>(null);
 const [ocupado,setOcupado]=useState<string|null>(null);
 const fns={pago:useServerFn(marcarPago),forma:useServerFn(atualizarForma),liberar:useServerFn(liberarAutorizacao),reavaliar:useServerFn(reavaliarPaciente),editar:useServerFn(editarAtendimento),semNota:useServerFn(marcarSemNota),excluir:useServerFn(excluirAtendimento)};
 const recarregar=()=>qc.invalidateQueries({queryKey:['dia']});
 async function acao(idLinha:string,fn:()=>Promise<unknown>,msg?:string){setOcupado(idLinha);try{await fn();if(msg)toast.success(msg);await recarregar();return true;}catch(e){toast.error(erroAmigavel(e));return false;}finally{setOcupado(null);}}
 const contagem=useMemo(()=>{const c:Record<string,number>={};for(const l of linhas??[]){const k=categoriaDe(l.status as StatusAtendimento);if(k)c[k]=(c[k]??0)+1;}return c;},[linhas]);
 const visiveis=useMemo(()=>{const q=busca.trim().toLocaleLowerCase('pt-BR');const qd=busca.replace(/\D/g,'');return (linhas??[]).filter(l=>(!cat||categoriaDe(l.status as StatusAtendimento)===cat)&&(!q||(l.paciente?.nome??'').toLocaleLowerCase('pt-BR').includes(q)||(qd.length>=3&&(l.paciente?.cpf??'').includes(qd))));},[linhas,busca,cat]);
 const prontas=(linhas??[]).filter(l=>l.status==='pago_ok');
 function alternarPago(l:Linha){const travado=!['importado','cadastro_pendente','aguardando_pagamento','pago_ok','aguardando_autorizacao','nao_gera_nota'].includes(l.status);const marcado=l.status==='pago_ok'||l.status==='aguardando_autorizacao';const podePagar=['aguardando_pagamento','importado','pago_ok','aguardando_autorizacao'].includes(l.status);if(travado||!podePagar||ocupado)return;if(!marcado&&!l.forma_pagamento){toast.error('Escolha a forma de pagamento antes de marcar como pago.');return;}acao(l.id,()=>fns.pago({data:{atendimento_id:l.id,pago:!marcado,operador_id:operatorId}}),!marcado?'Pagamento confirmado.':'Ok de pagamento desfeito.');}
 function teclado(e:React.KeyboardEvent<HTMLTableElement>){const tr=(e.target as HTMLElement).closest('tr[data-linha]') as HTMLTableRowElement|null;if(!tr||e.target!==tr)return;
  if(e.key===' '){e.preventDefault();const l=visiveis.find(x=>x.id===tr.dataset['linha']);if(l)alternarPago(l);}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const alvo=(e.key==='ArrowDown'?tr.nextElementSibling:tr.previousElementSibling) as HTMLElement|null;if(alvo?.dataset['linha'])alvo.focus();}}
 const dataLabel=new Date(`${dataSel}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
 return <div className="pb-24">
  <div className="page-heading"><div><div className="title-eyebrow">SUA ROTINA, MAIS TRANQUILA</div><h1>Hoje</h1><p>Olá, {operator}. Vamos cuidar das notas de <span>{dataLabel}</span>?</p></div>
   <div className="heading-actions"><div className="flex items-center gap-1"><Button variant="outline" size="icon" aria-label="Dia anterior" onClick={()=>setData(somaDias(dataSel,-1))}><ChevronLeft/></Button><label className="date-picker"><CalendarDays size={16}/><input type="date" aria-label="Data dos atendimentos" value={dataSel} onChange={e=>{if(e.target.value)setData(e.target.value);}}/></label><Button variant="outline" size="icon" aria-label="Próximo dia" onClick={()=>setData(somaDias(dataSel,1))}><ChevronRight/></Button>{dataSel!==hoje&&<Button variant="ghost" onClick={()=>setData(hoje)}>Hoje</Button>}</div>
    <Button variant="action" size="lg" asChild><Link to="/importar"><Upload/> Importar atendimentos</Link></Button></div></div>
  <section className="hoje-contadores" aria-label="Resumo do dia">{categoriasHoje.map(c=><button key={c.key} type="button" className={`hoje-contador ${cat===c.key?'is-active':''}`} aria-pressed={cat===c.key} onClick={()=>setCat(cat===c.key?null:c.key)}><span>{c.label}</span><strong>{String(contagem[c.key]??0).padStart(2,'0')}</strong></button>)}</section>
  <section className="table-section"><div className="table-toolbar"><h2>Atendimentos <span className="count-pill">{visiveis.length}</span>{cat&&<Button variant="link" className="ml-2 h-auto p-0" onClick={()=>setCat(null)}>limpar filtro</Button>}</h2><div className="table-tools"><div className="search-field"><Search size={14}/><Input aria-label="Buscar paciente" placeholder="Buscar por nome ou CPF..." value={busca} onChange={e=>setBusca(e.target.value)}/></div></div></div>
   <div className="table-scroll"><table className="appointments-table" onKeyDown={teclado}><thead><tr><th>Data</th><th>Paciente</th><th>Serviço / médico</th><th>Valor</th><th>Pagamento</th><th className="paid-cell">Pago</th><th>Status</th><th aria-label="Ações"/></tr></thead><tbody>
    {isLoading&&<TableSkeleton emTabela colunas={8}/>}
    {visiveis.map(l=>{const st=statusUI[l.status as StatusAtendimento];const travado=!['importado','cadastro_pendente','aguardando_pagamento','pago_ok','aguardando_autorizacao','nao_gera_nota'].includes(l.status);const pagoMarcado=l.status==='pago_ok'||l.status==='aguardando_autorizacao'||travado&&!!l.pago_ok_em;const podePagar=['aguardando_pagamento','importado','pago_ok','aguardando_autorizacao'].includes(l.status);
     return <tr key={l.id} aria-busy={ocupado===l.id} tabIndex={0} data-linha={l.id} className="focus:outline-2 focus:outline-primary focus:-outline-offset-2">
      <td className="whitespace-nowrap text-muted-foreground">{new Date(`${l.data_atendimento}T12:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</td>
      <td><div className="patient-cell"><span className="patient-avatar">{(l.paciente?.nome??'?').split(' ').slice(0,2).map(n=>n[0]).join('')}</span><div><div className="patient-name">{l.paciente?.nome}{l.paciente?.regra&&<span className="status-badge tone-warning ml-2">{l.paciente.regra.nome}</span>}</div><div className="patient-cpf">{mascararCPF(l.paciente?.cpf)}</div></div></div></td>
      <td><div className="service-name">{l.servico?.nome??<span className="text-destructive">Sem serviço</span>}{l.quantidade>1&&` ×${l.quantidade}`}</div><div className="doctor-name">{l.medico?.nome??'—'}</div></td>
      <td className="font-medium whitespace-nowrap">{money(l.valor)}</td>
      <td><Select disabled={travado||l.status==='nao_gera_nota'||ocupado===l.id} value={l.forma_pagamento??'none'} onValueChange={v=>acao(l.id,()=>fns.forma({data:{atendimento_id:l.id,forma:v==='none'?null:v as FormaPagamento,operador_id:operatorId}}))}><SelectTrigger className="h-9 w-[118px]" aria-label={`Forma de pagamento de ${l.paciente?.nome}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{formasPagamento.map(f=><SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></td>
      <td className="paid-cell"><label className="inline-flex flex-col items-center gap-0.5 text-[11px] text-muted-foreground"><Checkbox className="h-6 w-6" aria-label={`Pago: ${l.paciente?.nome}`} checked={pagoMarcado} disabled={!podePagar||ocupado===l.id} onCheckedChange={c=>{if(c===true&&!l.forma_pagamento){toast.error('Escolha a forma de pagamento antes de marcar como pago.');return;}acao(l.id,()=>fns.pago({data:{atendimento_id:l.id,pago:c===true,operador_id:operatorId}}),c===true?'Pagamento confirmado.':'Ok de pagamento desfeito.');}}/>{l.pago_por?.nome&&pagoMarcado?l.pago_por.nome:''}</label></td>
      <td><span className={`status-badge tone-${st.tone}`}><span className="status-dot"/>{st.label}</span>{l.status==='cadastro_pendente'&&l.bloqueios.length>0&&<div className="mt-1 max-w-[170px] whitespace-normal text-xs leading-snug text-muted-foreground">{l.bloqueios.filter(b=>b.codigo!=='mes_sem_aliquota').map(b=>b.mensagem).join(' ')}</div>}</td>
      <td><div className="flex items-center justify-end gap-1">
       {l.status==='cadastro_pendente'&&l.paciente&&<Button size="sm" variant="outline" onClick={()=>setPaciente(l.paciente as unknown as Paciente)}><UserRoundPen/>Completar cadastro</Button>}
       {l.status==='aguardando_autorizacao'&&<Button size="sm" variant="outline" onClick={()=>setLiberar(l)}><KeyRound/>Liberar</Button>}
       {!travado&&<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações de ${l.paciente?.nome}`}><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={()=>setEditar(l)}><Pencil/>Editar valor, serviço e quantidade</DropdownMenuItem>
        {l.paciente&&<DropdownMenuItem onSelect={()=>setPaciente(l.paciente as unknown as Paciente)}><UserRoundPen/>Abrir cadastro do paciente</DropdownMenuItem>}
        {l.status!=='nao_gera_nota'&&<DropdownMenuItem onSelect={()=>acao(l.id,()=>fns.semNota({data:{atendimento_id:l.id,operador_id:operatorId}}),'Marcado como convênio / sem nota.')}><Ban/>Marcar como convênio / sem nota</DropdownMenuItem>}
        <DropdownMenuItem className="text-destructive" onSelect={()=>setExcluir(l)}><Trash2/>Excluir</DropdownMenuItem>
       </DropdownMenuContent></DropdownMenu>}
      </div></td></tr>;})}
    {!isLoading&&visiveis.length===0&&<tr><td colSpan={8} className="py-10 text-center text-muted-foreground">{(linhas?.length??0)===0?<>Nenhum atendimento nesta data. <Link to="/importar" className="font-semibold text-primary underline">Importar atendimentos</Link></>:'Nenhum atendimento neste filtro.'}</td></tr>}
   </tbody></table></div>
   <div className="table-footer"><span>{visiveis.length} de {linhas?.length??0} atendimentos{(linhas??[]).some(l=>l.demo)&&<> <span className="mx-2">·</span> inclui dados fictícios de demonstração</>}</span><span>Total particular <strong className="total-value">{money((linhas??[]).filter(l=>l.status!=='nao_gera_nota'&&l.status!=='cancelado').reduce((s,l)=>s+l.valor,0))}</strong></span></div>
  </section>
  <div className="bottom-note"><ShieldCheck size={13}/> Nenhuma nota é emitida sem a sua conferência e aprovação. <span className="mx-2">·</span> Atalhos: clique numa linha e use <kbd className="rounded border border-border px-1">↑</kbd> <kbd className="rounded border border-border px-1">↓</kbd> para navegar e <kbd className="rounded border border-border px-1">Espaço</kbd> para marcar o pago.</div>
  <div className="hoje-rodape"><span><strong>{prontas.length}</strong> pronta{prontas.length===1?'':'s'} para conferir · <strong>{money(prontas.reduce((s,l)=>s+l.valor,0))}</strong></span><Button variant="action" size="lg" asChild><Link to="/conferencia">Ir para conferência <ArrowRight/></Link></Button></div>

  {paciente&&<PacienteDrawer paciente={paciente} regras={p?.regras??[]} onClose={()=>setPaciente(null)} onAbrirExistente={()=>setPaciente(null)} onSaved={async()=>{try{const m=await fns.reavaliar({data:{paciente_id:paciente.id,operador_id:operatorId}});if(m.length)toast.success(`${m.length} atendimento(s) atualizado(s) após o cadastro.`);}catch(e){toast.error(erroAmigavel(e));}await recarregar();}}/>}
  {liberar&&<LiberarDialog linha={liberar} onClose={()=>setLiberar(null)} onConfirm={async()=>{if(await acao(liberar.id,()=>fns.liberar({data:{atendimento_id:liberar.id,recebida:true,operador_id:operatorId}}),'Autorização registrada. Pronto para conferir.'))setLiberar(null);}}/>}
  {editar&&<EditarDialog linha={editar} servicos={p?.servicos??[]} onClose={()=>setEditar(null)} onSave={async v=>{if(await acao(editar.id,()=>fns.editar({data:{atendimento_id:editar.id,...v,operador_id:operatorId}}),'Atendimento atualizado.'))setEditar(null);}}/>}
  <AlertDialog open={!!excluir} onOpenChange={o=>!o&&setExcluir(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir atendimento?</AlertDialogTitle><AlertDialogDescription>{excluir?.paciente?.nome} — {excluir?.servico?.nome} ({excluir&&money(excluir.valor)}). A exclusão fica registrada no histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={()=>excluir&&acao(excluir.id,()=>fns.excluir({data:{atendimento_id:excluir.id,operador_id:operatorId}}),'Atendimento excluído.')}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>;
}

function LiberarDialog({linha,onClose,onConfirm}:{linha:Linha;onClose:()=>void;onConfirm:()=>Promise<void>}){
 const [ok,setOk]=useState(false);const [busy,setBusy]=useState(false);const r=linha.paciente?.regra;
 return <Dialog open onOpenChange={o=>!o&&onClose()}><DialogContent><DialogHeader><DialogTitle>Liberar {linha.paciente?.nome}</DialogTitle><DialogDescription>Regra especial: <strong>{r?.nome}</strong></DialogDescription></DialogHeader>
  <ul className="grid gap-2 text-[15px]"><li>ISS retido: <strong>{r?.iss_retido?'Sim':'Não'}</strong></li><li>Exige declaração: <strong>{r?.exige_declaracao?'Sim':'Não'}</strong></li>{r?.observacao&&<li className="text-muted-foreground">{r.observacao}</li>}</ul>
  <label className="flex items-center gap-3 text-[15px] font-medium"><Checkbox checked={ok} onCheckedChange={c=>setOk(c===true)}/>Autorização recebida</label>
  <DialogFooter><Button variant="action" size="lg" disabled={!ok||busy} onClick={async()=>{setBusy(true);await onConfirm();setBusy(false);}}>Confirmar liberação</Button></DialogFooter></DialogContent></Dialog>;
}

function EditarDialog({linha,servicos,onClose,onSave}:{linha:Linha;servicos:{id:string;nome:string;ativo:boolean}[];onClose:()=>void;onSave:(v:{valor:number;servico_id:string|null;quantidade:number})=>Promise<void>}){
 const [valor,setValor]=useState(String(linha.valor).replace('.',','));const [servico,setServico]=useState(linha.servico_id??'');const [qtd,setQtd]=useState(String(linha.quantidade));const [busy,setBusy]=useState(false);
 const v=Number(valor.replace(/\./g,'').replace(',','.'));const q=Number(qtd);const valido=Number.isFinite(v)&&v>=0&&Number.isInteger(q)&&q>=1&&q<=20;
 return <Dialog open onOpenChange={o=>!o&&onClose()}><DialogContent><DialogHeader><DialogTitle>Editar atendimento</DialogTitle><DialogDescription>{linha.paciente?.nome}</DialogDescription></DialogHeader>
  <div className="grid gap-4"><Field label="Serviço"><Select value={servico||'none'} onValueChange={x=>setServico(x==='none'?'':x)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Sem serviço</SelectItem>{servicos.filter(s=>s.ativo).map(s=><SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select></Field>
   <div className="grid grid-cols-2 gap-3"><Field label="Valor (R$)"><Input inputMode="decimal" value={valor} onChange={e=>setValor(e.target.value.replace(/[^\d,.]/g,''))}/></Field><Field label="Quantidade"><Input inputMode="numeric" value={qtd} onChange={e=>setQtd(e.target.value.replace(/\D/g,''))}/></Field></div></div>
  <DialogFooter><Button variant="action" size="lg" disabled={!valido||busy} onClick={async()=>{setBusy(true);await onSave({valor:Math.round(v*100)/100,servico_id:servico||null,quantidade:q});setBusy(false);}}>Salvar</Button></DialogFooter></DialogContent></Dialog>;
}
