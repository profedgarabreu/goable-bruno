import {createFileRoute,Link,useNavigate} from '@tanstack/react-router';
import {TableSkeleton} from '@/components/clinic/table-skeleton';
import {Fragment,useMemo,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {ChevronDown,ChevronRight,Loader2,Send,ShieldCheck,UserRoundPen,Percent,ListChecks,CheckCircle2,AlertTriangle,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Progress} from '@/components/ui/progress';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {money,pageHead} from '@/lib/clinic';
import {useOperator} from '@/components/clinic/operator-context';
import {listarConferencia,aprovarEmitir} from '@/lib/notas/emissao.functions';
import {editarAtendimento} from '@/lib/notas/atendimentos.functions';
import {painelConfiguracoes} from '@/lib/notas/config.functions';
import {mascararCPF,formatarCPF,formatarCNPJ} from '@/lib/notas/rules';
import {rotuloCodigo} from '@/lib/notas/labels';
import {formasPagamento} from '@/lib/notas/importacao';
import {modoLabel} from '@/lib/notas/status-ui';
import {Field,erroAmigavel} from '@/components/clinic/form-kit';
import {PacienteDrawer,type Paciente} from '@/components/pacientes/paciente-drawer';
import {useEmissaoLote} from '@/components/notas/use-emissao-lote';

export const Route=createFileRoute('/_authenticated/_workspace/conferencia')({
 head:()=>pageHead('Conferência','Confira as notas prontas, corrija bloqueios e aprove a emissão.'),
 component:Conferencia,
});
type Dados=Awaited<ReturnType<typeof listarConferencia>>;type Linha=Dados['linhas'][number];
const dataLonga=(d:string)=>new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
const formaLabel=(f:string|null)=>formasPagamento.find(x=>x.value===f)?.label??'—';
const cadastro=new Set(['cpf_ausente','cpf_invalido','endereco_incompleto']);

function Conferencia(){
 const {operator,operatorId}=useOperator();const qc=useQueryClient();
 const listar=useServerFn(listarConferencia);const painel=useServerFn(painelConfiguracoes);
 const {data,isLoading}=useQuery({queryKey:['conferencia'],queryFn:()=>listar()});
 const {data:p}=useQuery({queryKey:['painel-config'],queryFn:()=>painel()});
 const [desmarcadas,setDesmarcadas]=useState<Set<string>>(new Set());const [aberta,setAberta]=useState<string|null>(null);
 const [paciente,setPaciente]=useState<Paciente|null>(null);const [servicoDe,setServicoDe]=useState<Linha|null>(null);const [confirmar,setConfirmar]=useState(false);
 const linhas=data?.linhas??[];
 const prontas=linhas.filter(l=>!l.bloqueios.length);const selecionadas=prontas.filter(l=>!desmarcadas.has(l.id));
 const grupos=useMemo(()=>{const m=new Map<string,Linha[]>();for(const l of linhas){const g=m.get(l.data_atendimento)??[];g.push(l);m.set(l.data_atendimento,g);}return [...m.entries()];},[linhas]);
 const recarregar=()=>qc.invalidateQueries({queryKey:['conferencia']});
 const alternar=(id:string)=>setDesmarcadas(s=>{const n=new Set(s);if(n.has(id))n.delete(id);else n.add(id);return n;});
 return <div className="pb-28">
  <div className="page-heading"><div><div className="title-eyebrow">ANTES DE EMITIR</div><h1>Conferência</h1><p>Confira cada nota. Só as marcadas serão emitidas.</p></div></div>
  <section className="table-section"><div className="table-toolbar"><h2>Prontas para conferir <span className="count-pill">{linhas.length}</span></h2><div className="flex gap-3 text-sm"><span className="status-badge tone-success">{prontas.length} prontas</span><span className="status-badge tone-error">{linhas.length-prontas.length} bloqueadas</span></div></div>
   <div className="table-scroll"><table className="appointments-table conferencia-table"><thead><tr><th className="w-10"><span className="sr-only">Selecionar</span></th><th>Paciente</th><th>Serviço e descrição da nota</th><th>Valor</th><th>Pagamento</th><th>Situação</th></tr></thead>
    <tbody>
     {isLoading&&<TableSkeleton emTabela colunas={6}/>}
     {!isLoading&&!linhas.length&&<tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum atendimento aguardando conferência. Dê o ok de pagamento na tela <Link to="/" className="font-semibold text-primary underline">Hoje</Link>.</td></tr>}
     {grupos.map(([dia,ls])=><Fragment key={dia}>
      <tr className="conferencia-grupo"><td colSpan={6}><span className="capitalize-first">{dataLonga(dia)}</span> · {ls.length} atendimento{ls.length>1?'s':''}</td></tr>
      {ls.map(l=>{const pronta=!l.bloqueios.length;const exp=aberta===l.id;
       return <Fragment key={l.id}><tr className={`conferencia-linha ${exp?'is-open':''}`} onClick={()=>setAberta(exp?null:l.id)}>
        <td onClick={e=>e.stopPropagation()}><Checkbox className="h-6 w-6" aria-label={`Emitir nota de ${l.paciente?.nome}`} disabled={!pronta} checked={pronta&&!desmarcadas.has(l.id)} onCheckedChange={()=>alternar(l.id)}/></td>
        <td><div className="flex items-start gap-2">{exp?<ChevronDown size={16} className="mt-1 shrink-0"/>:<ChevronRight size={16} className="mt-1 shrink-0"/>}<div><div className="patient-name">{l.paciente?.nome}{l.paciente?.regra&&<span className="status-badge tone-warning ml-2">{l.paciente.regra.nome}</span>}</div><div className="patient-cpf">{mascararCPF(l.paciente?.cpf)}{l.demo&&' · demonstração'}</div></div></div></td>
        <td><div className="service-name">{l.servico?.nome??<span className="text-destructive">Sem serviço</span>}</div><div className="text-sm text-muted-foreground">{l.previa?.servico.descricao??'—'}</div></td>
        <td className="whitespace-nowrap font-medium">{money(l.valor)}</td>
        <td>{formaLabel(l.forma_pagamento)}</td>
        <td onClick={e=>e.stopPropagation()}>{pronta?<span className="status-badge tone-success"><CheckCircle2 size={13}/>Pronta</span>:<div className="grid gap-1.5"><span className="status-badge tone-error w-fit"><AlertTriangle size={13}/>Bloqueada</span><span className="max-w-[260px] whitespace-normal text-xs leading-snug text-destructive">{l.bloqueios.map(b=>b.mensagem).join(' ')}</span>
         <div className="flex flex-wrap gap-1.5">
          {l.bloqueios.some(b=>cadastro.has(b.codigo))&&l.paciente&&<Button size="sm" variant="outline" onClick={()=>setPaciente(l.paciente as unknown as Paciente)}><UserRoundPen/>Completar cadastro</Button>}
          {l.bloqueios.some(b=>b.codigo==='mes_sem_aliquota')&&<Button size="sm" variant="outline" asChild><Link to="/configuracoes" search={{aba:'aliquota'}}><Percent/>Informar alíquota</Link></Button>}
          {l.bloqueios.some(b=>b.codigo==='servico_ausente'||b.codigo==='servico_sem_parametro')&&<Button size="sm" variant="outline" onClick={()=>setServicoDe(l)}><ListChecks/>Escolher serviço</Button>}
         </div></div>}</td>
       </tr>
       {exp&&<tr className="conferencia-previa"><td/><td colSpan={5}>{l.previa?<PreviaNota linha={l}/>:<p className="py-2 text-sm text-muted-foreground">A prévia aparece quando os bloqueios forem resolvidos.</p>}</td></tr>}
      </Fragment>;})}
     </Fragment>)}
    </tbody></table></div>
  </section>
  <div className="bottom-note"><ShieldCheck size={13}/> Modo de emissão: <strong>{data?modoLabel[data.modo]:'…'}</strong></div>
  <div className="hoje-rodape"><span><strong>{selecionadas.length}</strong> nota{selecionadas.length===1?'':'s'} selecionada{selecionadas.length===1?'':'s'} · <strong>{money(selecionadas.reduce((s,l)=>s+l.valor,0))}</strong></span><Button variant="action" size="lg" disabled={!selecionadas.length} onClick={()=>setConfirmar(true)}><Send/>Aprovar e emitir</Button></div>
  {confirmar&&data&&<ConfirmarDialog ids={selecionadas.map(l=>l.id)} total={selecionadas.reduce((s,l)=>s+l.valor,0)} operador={operator} operadorId={operatorId} modo={data.modo} onClose={()=>{setConfirmar(false);void recarregar();}}/>}
  {paciente&&<PacienteDrawer paciente={paciente} regras={p?.regras??[]} onClose={()=>setPaciente(null)} onAbrirExistente={()=>setPaciente(null)} onSaved={async()=>{await recarregar();}}/>}
  {servicoDe&&<ServicoDialog linha={servicoDe} servicos={p?.servicos??[]} operadorId={operatorId} onClose={()=>setServicoDe(null)} onSaved={async()=>{setServicoDe(null);await recarregar();}}/>}
 </div>;
}

function PreviaNota({linha}:{linha:Linha}){
 const n=linha.previa!;const e=n.tomador.endereco;
 const cod=(campo:string,v:string|null)=>v?<>{v}{rotuloCodigo(campo,v)&&<span className="text-muted-foreground"> — {rotuloCodigo(campo,v)}</span>}</>:'—';
 return <div className="previa-nota"><div className="previa-titulo">Prévia da nota</div><dl>
  <dt>Tomador</dt><dd>{n.tomador.nome} · {n.tomador.tipo==='cpf'?`CPF ${formatarCPF(n.tomador.documento)}`:`CNPJ ${formatarCNPJ(n.tomador.documento)}`}</dd>
  <dt>Endereço</dt><dd>{e?`${[e.logradouro,e.numero,e.complemento,e.bairro].filter(Boolean).join(', ')} — ${e.municipio_nome}/${e.uf} · CEP ${e.cep}`:'Tomador pessoa jurídica'}</dd>
  <dt>Contato</dt><dd>{n.tomador.email??'sem e-mail'}{n.tomador.telefone?` · ${n.tomador.telefone}`:''}</dd>
  <dt>Descrição</dt><dd className="font-medium">{n.servico.descricao}</dd>
  <dt>Cód. tributação nacional</dt><dd>{cod('c_trib_nac',n.servico.c_trib_nac)}</dd>
  <dt>Cód. tributação municipal</dt><dd>{cod('c_trib_mun',n.servico.c_trib_mun)}</dd>
  <dt>NBS</dt><dd>{n.servico.nbs??'—'}</dd>
  <dt>IBS/CBS</dt><dd>{cod('ibscbs_cst',n.valores.ibscbs_cst)} · {cod('ibscbs_class_trib',n.valores.ibscbs_class_trib)}</dd>
  <dt>Valor</dt><dd className="font-semibold">{money(n.valores.servico)}{n.valores.iss_retido&&<span className="status-badge tone-warning ml-2">ISS retido</span>}</dd>
  <dt>Alíquota do Simples</dt><dd>{n.valores.aliquota_simples.toLocaleString('pt-BR')}% · tributos aproximados {money(n.valores.valor_aprox_tributos)}</dd>
 </dl></div>;
}

function ConfirmarDialog({ids,total,operador,operadorId,modo,onClose}:{ids:string[];total:number;operador:string|null;operadorId:string|null;modo:'mock'|'homologacao'|'producao';onClose:()=>void}){
 const aprovar=useServerFn(aprovarEmitir);const navigate=useNavigate();
 const chave=useRef(crypto.randomUUID()); // one key per confirmation: double clicks and retries reuse the same batch
 const [ok,setOk]=useState(false);const [busy,setBusy]=useState(false);const [loteId,setLoteId]=useState<string|null>(null);
 const em=useEmissaoLote(loteId);
 async function confirmar(){if(busy)return;setBusy(true);try{const r=await aprovar({data:{atendimento_ids:ids,chave:chave.current,operador_id:operadorId}});setLoteId(r.lote_id);}catch(e){toast.error(erroAmigavel(e));setBusy(false);}}
 const total_=em.notas.length;const finalizadas=em.notas.filter(n=>n.status==='autorizada'||n.status==='erro').length;
 const terminou=em.fase==='concluido'||em.fase==='expirado';
 return <Dialog open onOpenChange={o=>{if(!o&&(!loteId||terminou))onClose();}}><DialogContent className="sm:max-w-lg">
  <DialogHeader><DialogTitle>{loteId?'Emitindo notas':'Aprovar e emitir'}</DialogTitle><DialogDescription>{loteId?'Pode acompanhar aqui. Se fechar ou atualizar a página, a emissão continua de onde parou na tela do lote.':'Confira o resumo antes de confirmar.'}</DialogDescription></DialogHeader>
  {!loteId?<>
   <dl className="resumo-emissao"><dt>Operadora</dt><dd>{operador??'—'}</dd><dt>Notas</dt><dd>{ids.length}</dd><dt>Total</dt><dd className="font-semibold">{money(total)}</dd><dt>Modo</dt><dd>{modoLabel[modo]}</dd></dl>
   <label className="flex items-start gap-3 text-[15px] font-medium"><Checkbox className="mt-0.5" checked={ok} onCheckedChange={c=>setOk(c===true)}/>Confirmo que conferi as notas acima</label>
   <DialogFooter><Button variant="outline" onClick={onClose} disabled={busy}>Voltar</Button><Button variant="action" size="lg" disabled={!ok||busy} onClick={confirmar}>{busy?<Loader2 className="animate-spin"/>:<Send/>}Confirmar emissão</Button></DialogFooter>
  </>:<>
   <div className="grid gap-3" aria-live="polite">
    <p className="text-[15px] font-medium">{em.fase==='enviando'?`Emitindo ${em.atual} de ${em.totalEnvio}…`:em.fase==='aguardando'?`Aguardando o emissor… ${finalizadas} de ${total_} concluída${total_===1?'':'s'}`:em.fase==='concluido'?'Lote concluído.':em.fase==='expirado'?'Algumas notas ainda estão em processamento.':'Preparando…'}</p>
    <Progress value={total_?(finalizadas/total_)*100:5}/>
    <div className="flex gap-2 text-sm"><span className="status-badge tone-success">{em.autorizadas} autorizada{em.autorizadas===1?'':'s'}</span>{em.comErro>0&&<span className="status-badge tone-error">{em.comErro} com erro</span>}</div>
   </div>
   <DialogFooter><Button variant="action" size="lg" onClick={()=>navigate({to:'/notas/lote/$id',params:{id:loteId}})}>{terminou?'Ver resultado':'Acompanhar na tela do lote'}<ArrowRight/></Button></DialogFooter>
  </>}
 </DialogContent></Dialog>;
}

function ServicoDialog({linha,servicos,operadorId,onClose,onSaved}:{linha:Linha;servicos:{id:string;nome:string;ativo:boolean;valor_padrao:number|null;parametro_fiscal_id:string|null}[];operadorId:string|null;onClose:()=>void;onSaved:()=>Promise<void>}){
 const editar=useServerFn(editarAtendimento);const [servico,setServico]=useState(linha.servico_id??'');const [valor,setValor]=useState(String(linha.valor).replace('.',','));const [busy,setBusy]=useState(false);
 const v=Number(valor.replace(/\./g,'').replace(',','.'));
 async function salvar(){setBusy(true);try{await editar({data:{atendimento_id:linha.id,servico_id:servico,valor:Math.round(v*100)/100,quantidade:linha.quantidade,operador_id:operadorId}});toast.success('Serviço atualizado.');await onSaved();}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 return <Dialog open onOpenChange={o=>!o&&onClose()}><DialogContent><DialogHeader><DialogTitle>Escolher serviço</DialogTitle><DialogDescription>{linha.paciente?.nome}</DialogDescription></DialogHeader>
  <div className="grid gap-4"><Field label="Serviço"><Select value={servico||'none'} onValueChange={x=>{setServico(x);const s=servicos.find(y=>y.id===x);if(s?.valor_padrao&&!(v>0))setValor(String(s.valor_padrao).replace('.',','));}}><SelectTrigger><SelectValue placeholder="Escolha"/></SelectTrigger><SelectContent>{servicos.filter(s=>s.ativo).map(s=><SelectItem key={s.id} value={s.id}>{s.nome}{!s.parametro_fiscal_id&&' (sem parâmetro fiscal)'}</SelectItem>)}</SelectContent></Select></Field>
   <Field label="Valor (R$)"><Input inputMode="decimal" value={valor} onChange={e=>setValor(e.target.value.replace(/[^\d,.]/g,''))}/></Field></div>
  <DialogFooter><Button variant="action" size="lg" disabled={!servico||!(v>0)||busy} onClick={salvar}>Salvar</Button></DialogFooter></DialogContent></Dialog>;
}
