import {z} from 'zod';
import {createFileRoute,useNavigate} from '@tanstack/react-router';
import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import * as XLSX from 'xlsx';
import {FileSpreadsheet,FileImage,PencilLine,Loader2,Check,Plus,Trash2,ArrowLeft,ArrowRight,Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {supabase} from '@/integrations/supabase/client';
import {money,pageHead,saoPauloDate} from '@/lib/clinic';
import {useOperator} from '@/components/clinic/operator-context';
import {Field,Pill,erroAmigavel} from '@/components/clinic/form-kit';
import {buscarMapeamento,salvarMapeamento,extrairRelatorio,previaImportacao,confirmarImportacao,type LinhaBruta} from '@/lib/notas/importacao.functions';
import {listarCadastro} from '@/lib/notas/functions';
import {painelConfiguracoes} from '@/lib/notas/config.functions';
import {camposMapeamento,assinaturaCabecalho,adivinharMapeamento,formasPagamento,normalizarTexto,type CampoMapa,type FormaPagamento} from '@/lib/notas/importacao';

export const Route=createFileRoute('/_authenticated/_workspace/importar')({validateSearch:z.object({modo:z.enum(['manual']).optional()}),head:()=>pageHead('Importar','Traga os atendimentos do ProntMed por planilha, PDF, print ou digitação.'),component:Importar});

type Origem='planilha'|'relatorio_ia'|'manual';
type Previa=Awaited<ReturnType<typeof previaImportacao>>;
type Escolha={paciente:string;servico:string;lembrar:boolean;medico:string;incluir:boolean};
const NOVO='__novo__';

function Importar(){
 const [passo,setPasso]=useState<1|2|3>(1);const [dataRef,setDataRef]=useState(saoPauloDate());
 const [origem,setOrigem]=useState<Origem>('planilha');const [arquivo,setArquivo]=useState<File|null>(null);
 const [brutas,setBrutas]=useState<LinhaBruta[]>([]);const [previa,setPrevia]=useState<Previa|null>(null);const [escolhas,setEscolhas]=useState<Escolha[]>([]);
 const [busy,setBusy]=useState(false);const previaFn=useServerFn(previaImportacao);
 async function irParaPrevia(linhas:LinhaBruta[],o:Origem,f:File|null){
  if(!linhas.length){toast.error('Nenhuma linha encontrada.');return;}
  setBusy(true);try{const r=await previaFn({data:{data_ref:dataRef,linhas}});setBrutas(linhas);setOrigem(o);setArquivo(f);setPrevia(r);
   setEscolhas(r.linhas.map(l=>({paciente:l.paciente.estado==='encontrado'?l.paciente.id:l.paciente.estado==='novo'?NOVO:'',servico:l.servico_id??'',lembrar:false,medico:l.medico_id??'',incluir:!l.duplicada})));setPasso(2);
  }catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}
 }
 return <>
  <div className="page-heading"><div><div className="title-eyebrow">NOTAS BNAVES</div><h1>Importar atendimentos</h1><p>Traga os atendimentos do dia em três passos.</p></div></div>
  <div className="import-steps">{(['Arquivo','Prévia','Confirmar'] as const).map((n,i)=><span key={n} className={`import-step ${passo===i+1?'is-active':passo>i+1?'is-done':''}`}>{passo>i+1?<Check size={14}/>:<span>{i+1}</span>}{n}</span>)}</div>
  {passo===1&&<Passo1 dataRef={dataRef} setDataRef={setDataRef} busy={busy} onLinhas={irParaPrevia}/>}
  {passo>=2&&previa&&<Passo2 previa={previa} brutas={brutas} escolhas={escolhas} setEscolhas={setEscolhas} origem={origem} arquivo={arquivo} dataRef={dataRef} passo={passo} setPasso={setPasso}/>}
 </>;
}

function Passo1({dataRef,setDataRef,busy,onLinhas}:{dataRef:string;setDataRef:(d:string)=>void;busy:boolean;onLinhas:(l:LinhaBruta[],o:Origem,f:File|null)=>Promise<void>}){
 return <div className="grid gap-5">
  <Field label="Data de referência" className="max-w-[240px]"><Input type="date" value={dataRef} onChange={e=>e.target.value&&setDataRef(e.target.value)}/></Field>
  <Tabs defaultValue={Route.useSearch().modo??"planilha"}><TabsList className="h-auto flex-wrap gap-1 bg-muted p-1 mb-5"><TabsTrigger value="planilha" className="px-3 py-2 text-[15px]"><FileSpreadsheet className="mr-1.5" size={16}/>Planilha (CSV/XLSX)</TabsTrigger><TabsTrigger value="relatorio" className="px-3 py-2 text-[15px]"><FileImage className="mr-1.5" size={16}/>PDF ou print</TabsTrigger><TabsTrigger value="manual" className="px-3 py-2 text-[15px]"><PencilLine className="mr-1.5" size={16}/>Manual</TabsTrigger></TabsList>
   <TabsContent value="planilha"><Planilha busy={busy} onLinhas={(l,f)=>onLinhas(l,'planilha',f)}/></TabsContent>
   <TabsContent value="relatorio"><Relatorio busy={busy} onLinhas={(l,f)=>onLinhas(l,'relatorio_ia',f)}/></TabsContent>
   <TabsContent value="manual"><Manual busy={busy} onLinhas={l=>onLinhas(l,'manual',null)}/></TabsContent>
  </Tabs>
 </div>;
}

function Planilha({busy,onLinhas}:{busy:boolean;onLinhas:(l:LinhaBruta[],f:File)=>Promise<void>}){
 const buscar=useServerFn(buscarMapeamento);const salvar=useServerFn(salvarMapeamento);
 const [arquivo,setArquivo]=useState<File|null>(null);const [cab,setCab]=useState<string[]>([]);const [dados,setDados]=useState<unknown[][]>([]);
 const [mapa,setMapa]=useState<Partial<Record<CampoMapa,string>>>({});const [salvo,setSalvo]=useState<string|null>(null);const [lendo,setLendo]=useState(false);
 async function ler(f:File){setLendo(true);try{
  const wb=f.name.toLowerCase().endsWith('.csv')?XLSX.read(await f.text(),{type:'string',raw:true}):XLSX.read(await f.arrayBuffer(),{type:'array'});
  const ws=wb.Sheets[wb.SheetNames[0]!]!;const rows=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,raw:true,defval:''});
  const h=(rows[0]??[]).map(x=>String(x).trim());if(!h.filter(Boolean).length)throw new Error('Planilha sem cabeçalho.');
  setArquivo(f);setCab(h);setDados(rows.slice(1).filter(r=>r.some(c=>String(c).trim())));
  const m=await buscar({data:{assinatura:assinaturaCabecalho(h)}});
  if(m){setMapa(m.colunas as Partial<Record<CampoMapa,string>>);setSalvo(m.nome);toast.success(`Mapeamento “${m.nome}” reaplicado automaticamente.`);}else{setMapa(adivinharMapeamento(h));setSalvo(null);}
 }catch(e){toast.error(erroAmigavel(e));}finally{setLendo(false);}}
 async function continuar(){
  if(!mapa.paciente){toast.error('Indique a coluna do paciente.');return;}
  const idx=(c:CampoMapa)=>mapa[c]?cab.indexOf(mapa[c]!):-1;const get=(r:unknown[],c:CampoMapa)=>{const i=idx(c);return i>=0?r[i]:undefined;};const str=(v:unknown)=>v==null||v===''?null:String(v).trim();
  const linhas:LinhaBruta[]=dados.map(r=>({data:get(r,'data'),paciente:String(get(r,'paciente')??'').trim(),cpf:str(get(r,'cpf')),procedimento:str(get(r,'procedimento')),profissional:str(get(r,'profissional')),valor:get(r,'valor'),forma_pagamento:str(get(r,'forma_pagamento')),convenio:str(get(r,'convenio'))})).filter(l=>l.paciente);
  try{await salvar({data:{nome:arquivo!.name.replace(/\.[^.]+$/,''),assinatura:assinaturaCabecalho(cab),colunas:mapa as Record<string,string>}});}catch(e){toast.error(erroAmigavel(e));}
  await onLinhas(linhas,arquivo!);
 }
 return <div className="grid gap-5">
  <div className="flex flex-wrap items-center gap-3"><label className="inline-flex"><Input type="file" accept=".csv,.xlsx,.xls" aria-label="Arquivo da planilha" className="max-w-sm" onChange={e=>{const f=e.target.files?.[0];if(f)ler(f);}}/></label>{lendo&&<Loader2 className="animate-spin"/>}<a href="/exemplos/relatorio_prontmed_exemplo.csv" download className="inline-flex items-center gap-1.5 text-sm text-primary underline"><Download size={14}/>Baixar planilha de exemplo</a></div>
  {cab.length>0&&<div className="table-section p-5"><div className="mb-4 flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold">Mapeamento de colunas</h2>{salvo?<Pill tone="success">Mapeamento salvo reaplicado: {salvo}</Pill>:<Pill tone="info">Novo cabeçalho — confira e continue</Pill>}<span className="text-sm text-muted-foreground">{dados.length} linha(s) no arquivo</span></div>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{camposMapeamento.map(([c,l])=><Field key={c} label={l}><Select value={mapa[c]??'none'} onValueChange={v=>setMapa({...mapa,[c]:v==='none'?undefined:v})}><SelectTrigger aria-label={`Coluna para ${l}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">— não usar —</SelectItem>{cab.filter(Boolean).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></Field>)}</div>
   <div className="mt-5 flex justify-end"><Button variant="action" size="lg" disabled={busy} onClick={continuar}>{busy&&<Loader2 className="animate-spin"/>}Ver prévia <ArrowRight/></Button></div></div>}
 </div>;
}

function Relatorio({busy,onLinhas}:{busy:boolean;onLinhas:(l:LinhaBruta[],f:File)=>Promise<void>}){
 const extrair=useServerFn(extrairRelatorio);const [lendo,setLendo]=useState(false);const [erro,setErro]=useState<string|null>(null);
 async function ler(f:File){setErro(null);
  const mime=f.type==='image/jpg'?'image/jpeg':f.type;
  if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(mime)){setErro('Envie um PDF ou imagem PNG/JPG.');return;}
  if(f.size>10*1024*1024){setErro('Arquivo muito grande (máx. 10 MB).');return;}
  setLendo(true);try{const buf=new Uint8Array(await f.arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode(...buf.subarray(i,i+0x8000));
   const linhas=await extrair({data:{base64:btoa(bin),mime:mime as 'application/pdf'}});
   if(!linhas.length){setErro('Nenhuma linha legível foi encontrada no arquivo.');return;}
   toast.success(`${linhas.length} linha(s) lida(s) do relatório.`);
   await onLinhas(linhas.map(l=>({data:l.data,paciente:l.paciente!,procedimento:l.procedimento,profissional:l.profissional,valor:l.valor,forma_pagamento:l.forma_pagamento,convenio:l.convenio_ou_particular})),f);
  }catch(e){setErro(erroAmigavel(e));}finally{setLendo(false);}}
 return <div className="grid gap-3 max-w-xl"><p className="text-[15px] text-muted-foreground">Envie o PDF ou um print do Relatório Financeiro do ProntMed. A leitura usa só o que estiver legível; o que não der para ler fica em branco para você completar.</p>
  <Input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" aria-label="PDF ou imagem do relatório" disabled={lendo||busy} onChange={e=>{const f=e.target.files?.[0];if(f)ler(f);}}/>
  {(lendo||busy)&&<p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin"/>Lendo o relatório… isso pode levar alguns segundos.</p>}{erro&&<p className="text-destructive">{erro}</p>}</div>;
}

type LinhaManual={paciente_id:string|null;paciente:string;servico_id:string;medico_id:string;valor:string;forma:FormaPagamento|'';quantidade:string};
function Manual({busy,onLinhas}:{busy:boolean;onLinhas:(l:LinhaBruta[])=>Promise<void>}){
 const listar=useServerFn(listarCadastro);const painel=useServerFn(painelConfiguracoes);
 const {data:pacientes}=useQuery({queryKey:['pacientes'],queryFn:async()=>(await listar({data:{tabela:'nf_pacientes'}})) as unknown as {id:string;nome:string;cpf:string|null}[]});
 const {data:p}=useQuery({queryKey:['painel-config'],queryFn:()=>painel()});
 const servicos=(p?.servicos??[]).filter(s=>s.ativo);const medicos=(p?.medicos??[]).filter(m=>m.ativo);
 const nova=():LinhaManual=>({paciente_id:null,paciente:'',servico_id:'',medico_id:medicos.find(m=>/bruno/i.test(m.nome))?.id??'',valor:'',forma:'',quantidade:'1'});
 const [linhas,setLinhas]=useState<LinhaManual[]>([]);const lista=linhas.length?linhas:[nova()];
 const set=(i:number,v:Partial<LinhaManual>)=>setLinhas(lista.map((l,k)=>k===i?{...l,...v}:l));
 const validas=lista.filter(l=>l.paciente.trim().length>=2&&l.servico_id);
 async function continuar(){await onLinhas(validas.map(l=>({paciente:l.paciente.trim(),paciente_id:l.paciente_id,servico_id:l.servico_id,medico_id:l.medico_id||null,valor:l.valor||undefined,forma_pagamento:l.forma||null,convenio:'Particular',quantidade:Math.max(1,Math.min(20,Number(l.quantidade)||1))})));}
 return <div className="grid gap-4">{lista.map((l,i)=><div key={i} className="table-section grid gap-3 p-4 lg:grid-cols-[2fr_1.4fr_1.2fr_110px_130px_80px_auto] items-end">
   <PacienteBusca pacientes={pacientes??[]} valor={l.paciente} selecionado={l.paciente_id} onChange={(nome,pid)=>set(i,{paciente:nome,paciente_id:pid})}/>
   <Field label="Serviço"><Select value={l.servico_id||'none'} onValueChange={v=>{const s=servicos.find(x=>x.id===v);set(i,{servico_id:v==='none'?'':v,valor:s?.valor_padrao!=null?String(s.valor_padrao).replace('.',','):l.valor});}}><SelectTrigger aria-label="Serviço"><SelectValue placeholder="Escolha"/></SelectTrigger><SelectContent><SelectItem value="none">Escolha…</SelectItem>{servicos.map(s=><SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select></Field>
   <Field label="Médico"><Select value={l.medico_id||'none'} onValueChange={v=>set(i,{medico_id:v==='none'?'':v})}><SelectTrigger aria-label="Médico"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{medicos.map(m=><SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></Field>
   <Field label="Valor (R$)"><Input inputMode="decimal" value={l.valor} onChange={e=>set(i,{valor:e.target.value.replace(/[^\d,.]/g,'')})}/></Field>
   <Field label="Pagamento"><Select value={l.forma||'none'} onValueChange={v=>set(i,{forma:v==='none'?'':v as FormaPagamento})}><SelectTrigger aria-label="Forma de pagamento"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{formasPagamento.map(f=><SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></Field>
   <Field label="Qtd."><Input inputMode="numeric" value={l.quantidade} onChange={e=>set(i,{quantidade:e.target.value.replace(/\D/g,'')})}/></Field>
   <Button variant="ghost" size="icon" aria-label="Remover linha" disabled={lista.length===1} onClick={()=>setLinhas(lista.filter((_,k)=>k!==i))}><Trash2/></Button>
  </div>)}
  <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={()=>setLinhas([...lista,nova()])}><Plus/>Adicionar outra</Button><Button variant="action" size="lg" disabled={busy||!validas.length} onClick={continuar}>{busy&&<Loader2 className="animate-spin"/>}Ver prévia ({validas.length}) <ArrowRight/></Button></div></div>;
}

function PacienteBusca({pacientes,valor,selecionado,onChange}:{pacientes:{id:string;nome:string}[];valor:string;selecionado:string|null;onChange:(nome:string,id:string|null)=>void}){
 const [aberto,setAberto]=useState(false);const q=normalizarTexto(valor);
 const sug=q.length>=2?pacientes.filter(p=>normalizarTexto(p.nome).includes(q)).slice(0,6):[];
 return <div className="relative"><Field label="Paciente"><Input value={valor} placeholder="Digite para buscar…" onFocus={()=>setAberto(true)} onBlur={()=>setTimeout(()=>setAberto(false),150)} onChange={e=>{onChange(e.target.value,null);setAberto(true);}}/></Field>
  {selecionado?<span className="absolute right-2 top-[34px]"><Pill tone="success">cadastrado</Pill></span>:valor.trim().length>=2&&!aberto?<span className="absolute right-2 top-[34px]"><Pill tone="info">novo</Pill></span>:null}
  {aberto&&q.length>=2&&<div role="listbox" className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">{sug.map(p=><button key={p.id} type="button" role="option" aria-selected={selecionado===p.id} className="block w-full px-3 py-2 text-left text-[15px] hover:bg-secondary" onMouseDown={()=>{onChange(p.nome,p.id);setAberto(false);}}>{p.nome}</button>)}<button type="button" role="option" aria-selected={false} className="block w-full border-t border-border px-3 py-2 text-left text-[15px] font-medium text-primary hover:bg-secondary" onMouseDown={()=>{onChange(valor.trim(),null);setAberto(false);}}><Plus size={14} className="mr-1 inline"/>Criar novo paciente: “{valor.trim()}”</button></div>}
 </div>;
}

function Passo2({previa,brutas,escolhas,setEscolhas,origem,arquivo,dataRef,passo,setPasso}:{previa:Previa;brutas:LinhaBruta[];escolhas:Escolha[];setEscolhas:(e:Escolha[])=>void;origem:Origem;arquivo:File|null;dataRef:string;passo:number;setPasso:(p:1|2|3)=>void}){
 const confirmar=useServerFn(confirmarImportacao);const {operatorId}=useOperator();const navigate=useNavigate();const [busy,setBusy]=useState(false);
 const set=(i:number,v:Partial<Escolha>)=>setEscolhas(escolhas.map((e,k)=>k===i?{...e,...v}:e));
 const linhas=previa.linhas;
 const revisar=(i:number)=>{const l=linhas[i]!,e=escolhas[i]!;return !l.duplicada&&(!e.paciente||!e.servico||(!l.convenio&&l.valor<=0));};
 const cont=useMemo(()=>({lidas:linhas.length,novas:linhas.filter((l,i)=>!l.duplicada&&escolhas[i]?.incluir).length,duplicadas:linhas.filter(l=>l.duplicada).length,convenio:linhas.filter(l=>l.convenio&&!l.duplicada).length,revisar:linhas.filter((_,i)=>revisar(i)).length}),[linhas,escolhas]);// eslint-disable-line react-hooks/exhaustive-deps
 const pendentes=linhas.some((l,i)=>!l.duplicada&&escolhas[i]?.incluir&&!escolhas[i]?.paciente);
 async function gravar(){
  setBusy(true);try{
   let arquivo_path:string|null=null;
   if(arquivo){const ext=(arquivo.name.split('.').pop()??'bin').toLowerCase().replace(/[^a-z0-9]/g,'');arquivo_path=`${dataRef.slice(0,7)}/${crypto.randomUUID()}.${ext}`;const up=await supabase.storage.from('importacoes').upload(arquivo_path,arquivo,{contentType:arquivo.type||'application/octet-stream'});if(up.error)throw new Error('Não foi possível guardar o arquivo original. Tente novamente.');}
   const finais=linhas.flatMap((l,i)=>{const e=escolhas[i]!;if(l.duplicada||!e.incluir)return [];return [{data_atendimento:l.data_atendimento,paciente_id:e.paciente&&e.paciente!==NOVO?e.paciente:null,novo_paciente:e.paciente===NOVO?{nome:l.paciente_nome,cpf:l.cpf}:null,servico_id:e.servico||null,lembrar_alias:e.lembrar&&l.procedimento&&!l.servico_casou?l.procedimento:null,medico_id:e.medico||null,valor:l.valor,quantidade:l.quantidade,forma_pagamento:l.forma_pagamento,convenio:l.convenio}];});
   const origemDb=origem==='manual'?'manual' as const:origem==='planilha'?(arquivo?.name.toLowerCase().endsWith('.csv')?'csv' as const:'xlsx' as const):(arquivo?.type==='application/pdf'?'pdf_ia' as const:'imagem_ia' as const);
   const r=await confirmar({data:{data_ref:dataRef,origem:origemDb,arquivo_path,linhas_lidas:brutas.length,linhas:finais,operador_id:operatorId}});
   toast.success(`${r.novas} atendimento(s) importado(s)${r.duplicadas?`, ${r.duplicadas} já existia(m)`:''}${r.pacientes_novos?`, ${r.pacientes_novos} paciente(s) novo(s)`:''}.`);
   const dia=finais[0]?.data_atendimento??dataRef;await navigate({to:'/',search:{data:dia===saoPauloDate()?undefined:dia}});
  }catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}
 }
 return <div className="grid gap-5">
  <section className="hoje-contadores" style={{gridTemplateColumns:'repeat(5,minmax(0,1fr))'}} aria-label="Resumo da importação">{([['Linhas lidas',cont.lidas],['Novas',cont.novas],['Duplicadas',cont.duplicadas],['Convênio',cont.convenio],['A revisar',cont.revisar]] as const).map(([l,n])=><div key={l} className="hoje-contador" data-testid={`cont-${normalizarTexto(l).replace(/ /g,'-')}`}><span>{l}</span><strong>{n}</strong></div>)}</section>
  <div className="table-section"><div className="table-scroll"><table className="config-table"><thead><tr><th>Incluir</th><th>Data</th><th>Paciente</th><th>Serviço</th><th>Médico</th><th>Valor</th><th>Pagamento</th><th>Situação</th></tr></thead><tbody>{linhas.map((l,i)=>{const e=escolhas[i]!;const dis=l.duplicada||passo===3;return <tr key={i} className={l.duplicada?'opacity-60':''}>
   <td><Checkbox aria-label={`Incluir linha ${i+1}`} checked={e.incluir&&!l.duplicada} disabled={dis} onCheckedChange={c=>set(i,{incluir:c===true})}/></td>
   <td className="whitespace-nowrap">{new Date(`${l.data_atendimento}T12:00`).toLocaleDateString('pt-BR')}</td>
   <td><div className="font-medium">{l.paciente_nome}</div>{l.paciente.estado==='encontrado'?<Pill tone="success">encontrado</Pill>:l.paciente.estado==='novo'?<Pill tone="info">novo — será criado</Pill>:<div className="mt-1 grid gap-1"><Pill tone="warning">possível — escolha</Pill><Select disabled={dis} value={e.paciente||'none'} onValueChange={v=>set(i,{paciente:v==='none'?'':v})}><SelectTrigger className="h-9 min-w-[180px]" aria-label={`Paciente da linha ${i+1}`}><SelectValue placeholder="Escolha…"/></SelectTrigger><SelectContent><SelectItem value="none">Escolha…</SelectItem>{l.paciente.candidatos.map(c=><SelectItem key={c.id} value={c.id}>{c.nome} ({Math.round(c.score*100)}%)</SelectItem>)}<SelectItem value={NOVO}>Criar novo paciente</SelectItem></SelectContent></Select></div>}</td>
   <td>{l.procedimento&&<div className="text-xs text-muted-foreground">“{l.procedimento}”</div>}{l.servico_casou?<span>{previa.servicos.find(s=>s.id===l.servico_id)?.nome}</span>:<div className="grid gap-1"><Select disabled={dis} value={e.servico||'none'} onValueChange={v=>set(i,{servico:v==='none'?'':v})}><SelectTrigger className="h-9 min-w-[180px]" aria-label={`Serviço da linha ${i+1}`}><SelectValue placeholder="Escolha…"/></SelectTrigger><SelectContent><SelectItem value="none">Escolha…</SelectItem>{previa.servicos.map(s=><SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select>{l.procedimento&&e.servico&&<label className="flex items-center gap-2 text-xs"><Checkbox checked={e.lembrar} disabled={dis} onCheckedChange={c=>set(i,{lembrar:c===true})}/>lembrar este nome</label>}</div>}</td>
   <td><Select disabled={dis} value={e.medico||'none'} onValueChange={v=>set(i,{medico:v==='none'?'':v})}><SelectTrigger className="h-9 min-w-[150px]" aria-label={`Médico da linha ${i+1}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{previa.medicos.map(m=><SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></td>
   <td className={`whitespace-nowrap ${l.valor<=0&&!l.convenio?'text-destructive font-medium':''}`}>{money(l.valor)}</td>
   <td>{l.forma_pagamento?formasPagamento.find(f=>f.value===l.forma_pagamento)?.label:<span className="text-muted-foreground">—</span>}{l.forma_original&&<div className="text-xs text-muted-foreground">“{l.forma_original}”</div>}</td>
   <td>{l.duplicada?<Pill tone="muted">já importada</Pill>:l.convenio?<Pill tone="muted">convênio — sem nota</Pill>:revisar(i)?<Pill tone="warning">revisar</Pill>:<Pill tone="success">ok</Pill>}</td></tr>;})}</tbody></table></div></div>
  {passo===2?<div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={()=>setPasso(1)}><ArrowLeft/>Voltar</Button><Button variant="action" size="lg" disabled={pendentes||cont.novas===0} onClick={()=>setPasso(3)}>Continuar <ArrowRight/></Button></div>
  :<div className="status-card is-ready flex flex-wrap items-center justify-between gap-3"><div className="text-[15px]">Gravar <strong>{cont.novas}</strong> atendimento(s){cont.duplicadas?<> e ignorar <strong>{cont.duplicadas}</strong> já importado(s)</>:null}. Nenhum pagamento é confirmado automaticamente.</div><div className="flex gap-2"><Button variant="outline" onClick={()=>setPasso(2)}><ArrowLeft/>Revisar</Button><Button variant="action" size="lg" disabled={busy} onClick={gravar}>{busy&&<Loader2 className="animate-spin"/>}Confirmar importação</Button></div></div>}
 </div>;
}
