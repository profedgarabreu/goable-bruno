import {createFileRoute,Link} from '@tanstack/react-router';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {ArrowLeft,FileText,Loader2,RefreshCw,RotateCcw,UserRoundPen} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {money,pageHead} from '@/lib/clinic';
import {mascararCPF} from '@/lib/notas/rules';
import {notaStatusUI,modoLabel,type StatusNota} from '@/lib/notas/status-ui';
import {tentarDeNovo} from '@/lib/notas/emissao.functions';
import {painelConfiguracoes} from '@/lib/notas/config.functions';
import {useOperator} from '@/components/clinic/operator-context';
import {erroAmigavel} from '@/components/clinic/form-kit';
import {PacienteDrawer,type Paciente} from '@/components/pacientes/paciente-drawer';
import {useEmissaoLote} from '@/components/notas/use-emissao-lote';
import {useAbrirArquivo} from '@/components/notas/acoes-arquivo';
import {EnvioBadge,precisaEnvio} from '@/components/notas/envio-ui';
import {enviarPendentesLote} from '@/lib/notas/envio.functions';
import {Send} from 'lucide-react';

export const Route=createFileRoute('/_authenticated/_workspace/notas_/lote/$id')({
 head:()=>pageHead('Resultado do lote','Acompanhe a emissão de cada nota do lote aprovado.'),
 component:LotePage,
});

function LotePage(){
 const {id}=Route.useParams();const {operatorId}=useOperator();
 const em=useEmissaoLote(id);const retry=useServerFn(tentarDeNovo);const painel=useServerFn(painelConfiguracoes);const abrir=useAbrirArquivo();const enviarPend=useServerFn(enviarPendentesLote);const [enviando,setEnviando]=useState(false);
 const {data:p}=useQuery({queryKey:['painel-config'],queryFn:()=>painel()});
 const [corrigir,setCorrigir]=useState<{notaId:string;paciente:Paciente}|null>(null);const [ocupado,setOcupado]=useState<string|null>(null);
 async function tentar(notaId:string){setOcupado(notaId);try{await retry({data:{nota_id:notaId,operador_id:operatorId}});toast.success('Reenviando com a mesma referência.');em.reiniciar();}catch(e){toast.error(erroAmigavel(e));}finally{setOcupado(null);}}
 async function enviarPendentes(){setEnviando(true);try{const r=await enviarPend({data:{lote_id:id,operador_id:operatorId}});const t=Object.entries(r).map(([k,v])=>`${v} ${k}`).join(', ');toast.success(t?`Envios: ${t}.`:'Nenhuma nota pendente de envio.');em.reiniciar();}catch(e){toast.error(erroAmigavel(e));}finally{setEnviando(false);}}
 const pendEnvio=em.notas.filter(n=>precisaEnvio(n as never)).length;
 const lote=em.dados?.lote;const total=em.notas.length;const fin=em.notas.filter(n=>['autorizada','erro','cancelada','substituida'].includes(n.status)).length;
 return <div>
  <div className="page-heading"><div><Link to="/notas" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14}/>Notas emitidas</Link><h1>Resultado do lote</h1>
   <p>{lote?<>Aprovado por {lote.operador?.nome??'—'} em {new Date(lote.criado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · {total} nota{total===1?'':'s'} · {money(Number(lote.valor_total))}{em.notas[0]&&<> · {modoLabel[em.notas[0].ambiente]}</>}</>:'Carregando…'}</p></div>
   <div className="heading-actions">{pendEnvio>0&&<Button variant="action" size="lg" disabled={enviando} onClick={enviarPendentes}>{enviando?<Loader2 className="animate-spin"/>:<Send/>}Enviar pendentes ({pendEnvio})</Button>}{em.fase==='expirado'&&<Button variant="outline" size="lg" onClick={em.reiniciar}><RefreshCw/>Atualizar status</Button>}</div></div>
  <section className="table-section mb-5 p-5" aria-live="polite"><div className="mb-3 flex flex-wrap items-center gap-3"><strong className="text-[15px]">{em.fase==='enviando'?`Emitindo ${em.atual} de ${em.totalEnvio}…`:em.fase==='aguardando'?'Aguardando o emissor (verificando a cada 5 segundos)…':em.fase==='concluido'?'Lote concluído.':em.fase==='expirado'?'O emissor ainda não respondeu algumas notas. Use "Atualizar status".':'Carregando…'}</strong>
   <span className="status-badge tone-success">{em.autorizadas} autorizada{em.autorizadas===1?'':'s'}</span>{em.comErro>0&&<span className="status-badge tone-error">{em.comErro} com erro</span>}</div><Progress value={total?fin/total*100:0}/></section>
  <section className="table-section"><div className="table-scroll"><table className="appointments-table"><thead><tr><th>Paciente</th><th>Descrição</th><th>Valor</th><th>Número</th><th>Situação</th><th>Envio</th><th aria-label="Ações"/></tr></thead><tbody>
   {!em.dados&&<tr><td colSpan={7} className="text-center"><Loader2 className="inline animate-spin"/></td></tr>}
   {em.notas.map(n=>{const st=notaStatusUI[n.status as StatusNota];const pac=n.atendimento?.paciente;
    return <tr key={n.id}><td><div className="patient-name">{pac?.nome}</div><div className="patient-cpf">{mascararCPF(pac?.cpf)}</div></td><td className="text-sm">{n.descricao_usada}</td><td className="whitespace-nowrap">{money(n.valor)}</td><td>{n.numero??'—'}</td>
     <td><span className={`status-badge tone-${st.tone}`}>{(n.status==='processando'||n.status==='pendente')&&<Loader2 size={12} className="animate-spin"/>}{st.label}</span>{n.mensagem_erro&&<div className="mt-1 max-w-[280px] whitespace-normal text-xs text-destructive">{n.mensagem_erro}</div>}</td>
     <td>{n.status==='autorizada'?<EnvioBadge n={n as never}/>:'—'}</td>
     <td><div className="flex flex-wrap justify-end gap-1.5">
      {n.status==='autorizada'&&<Button size="sm" variant="outline" onClick={()=>abrir(n.id,'pdf')}><FileText/>Ver PDF</Button>}
      {n.status==='erro'&&<><Button size="sm" variant="outline" disabled={ocupado===n.id} onClick={()=>tentar(n.id)}><RotateCcw/>Tentar de novo</Button>{pac&&<Button size="sm" variant="outline" onClick={()=>setCorrigir({notaId:n.id,paciente:pac as unknown as Paciente})}><UserRoundPen/>Corrigir e tentar</Button>}</>}
     </div></td></tr>;})}
  </tbody></table></div></section>
  {corrigir&&<PacienteDrawer paciente={corrigir.paciente} regras={p?.regras??[]} onClose={()=>setCorrigir(null)} onAbrirExistente={()=>setCorrigir(null)} onSaved={async()=>{const id=corrigir.notaId;setCorrigir(null);await tentar(id);}}/>}
 </div>;
}
