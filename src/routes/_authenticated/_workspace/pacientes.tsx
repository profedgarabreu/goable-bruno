import {createFileRoute} from '@tanstack/react-router';
import {TableSkeleton} from '@/components/clinic/table-skeleton';
import {useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Plus,Search,Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {pageHead} from '@/lib/clinic';
import {listarCadastro} from '@/lib/notas/functions';
import {painelConfiguracoes} from '@/lib/notas/config.functions';
import {mascararCPF,pendenciasCadastro,somenteDigitos} from '@/lib/notas/rules';
import {DataTable,Pill,maskFone} from '@/components/clinic/form-kit';
import {PacienteDrawer,type Paciente} from '@/components/pacientes/paciente-drawer';

export const Route=createFileRoute('/_authenticated/_workspace/pacientes')({head:()=>pageHead('Pacientes','Cadastro dos pacientes: CPF, endereço, contatos e regras especiais.'),component:Pacientes});

const filtros=[['incompleto','Cadastro incompleto'],['sem_email','Sem e-mail'],['regra','Com regra especial'],['demo','Demo']] as const;
type Filtro=(typeof filtros)[number][0];

function Pacientes(){
 const listar=useServerFn(listarCadastro);const painel=useServerFn(painelConfiguracoes);const qc=useQueryClient();
 const {data:pacientes,isLoading}=useQuery({queryKey:['pacientes'],queryFn:async()=>(await listar({data:{tabela:'nf_pacientes'}})) as unknown as Paciente[]});
 const {data:p}=useQuery({queryKey:['painel-config'],queryFn:()=>painel()});
 const regras=p?.regras??[];
 const [busca,setBusca]=useState('');const [ativos,setAtivos]=useState<Filtro[]>([]);const [aberto,setAberto]=useState<Paciente|null|'novo'>(null);
 const linhas=useMemo(()=>{const q=busca.trim().toLocaleLowerCase('pt-BR');const qd=somenteDigitos(busca);return (pacientes??[]).filter(x=>{
  if(q&&!(x.nome.toLocaleLowerCase('pt-BR').includes(q)||(qd.length>=3&&(x.cpf??'').includes(qd))))return false;
  if(ativos.includes('incompleto')&&!pendenciasCadastro(x).length)return false;
  if(ativos.includes('sem_email')&&x.email)return false;
  if(ativos.includes('regra')&&!x.regra_especial_id)return false;
  if(ativos.includes('demo')&&!x.demo)return false;return true;}).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));},[pacientes,busca,ativos]);
 const toggle=(f:Filtro)=>setAtivos(a=>a.includes(f)?a.filter(x=>x!==f):[...a,f]);
 function abrirPorId(id:string){const x=pacientes?.find(y=>y.id===id);if(x)setAberto(x);}
 return <>
  <div className="page-heading"><div><div className="title-eyebrow">NOTAS BNAVES</div><h1>Pacientes</h1><p>O cadastro do consultório, sempre à mão.</p></div><div className="heading-actions"><Button variant="action" size="lg" onClick={()=>setAberto('novo')}><Plus/>Novo paciente</Button></div></div>
  <div className="mb-4 flex flex-wrap items-center gap-3"><div className="search-field flex-1 min-w-[260px]"><Search size={14}/><Input aria-label="Buscar paciente" placeholder="Buscar por nome ou CPF..." value={busca} onChange={e=>setBusca(e.target.value)}/></div>
   {filtros.map(([k,l])=><Button key={k} variant={ativos.includes(k)?'default':'outline'} onClick={()=>toggle(k)} aria-pressed={ativos.includes(k)}>{l}</Button>)}</div>
  {isLoading?<TableSkeleton colunas={6}/>:
  <DataTable head={['Nome','CPF','Celular','E-mail','Cadastro','Regra especial']} empty={!linhas.length}>{linhas.map(x=>{const pend=pendenciasCadastro(x);const regra=regras.find(r=>r.id===x.regra_especial_id);return <tr key={x.id} className="is-clickable" onClick={()=>setAberto(x)}>
   <td className="font-medium">{x.nome}{x.demo&&<span className="ml-2"><Pill tone="muted">demo</Pill></span>}</td><td className="tabular-nums whitespace-nowrap">{mascararCPF(x.cpf)}</td><td className="whitespace-nowrap">{x.celular?maskFone(x.celular):'—'}</td><td>{x.email||<span className="text-muted-foreground">sem e-mail</span>}</td>
   <td>{pend.length?<div><Pill tone="error">Incompleto</Pill><div className="mt-1 text-xs text-muted-foreground">{pend.join('; ')}</div></div>:<Pill tone="success">Completo</Pill>}</td><td>{regra?<Pill tone="warning">{regra.nome}</Pill>:'—'}</td></tr>;})}</DataTable>}
  <p className="mt-3 text-sm text-muted-foreground">{linhas.length} de {pacientes?.length??0} pacientes</p>
  {aberto&&<PacienteDrawer key={aberto==='novo'?'novo':aberto.id} paciente={aberto==='novo'?null:aberto} regras={regras} onClose={()=>setAberto(null)} onSaved={async()=>{await qc.invalidateQueries({queryKey:['pacientes']});await qc.invalidateQueries({queryKey:['painel-config']});}} onAbrirExistente={id=>{setAberto(null);setTimeout(()=>abrirPorId(id),50);}}/>}
 </>;
}
