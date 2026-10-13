import {createFileRoute,useNavigate} from '@tanstack/react-router';
import {useState,type FormEvent} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {Loader2} from 'lucide-react';
import {createClinicUser} from '@/lib/auth.functions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {pageHead} from '@/lib/clinic';
import {usePainel} from '@/components/config/shared';
import {EmitenteTab} from '@/components/config/emitente-tab';
import {ParametrosTab} from '@/components/config/parametros-tab';
import {AliquotaTab} from '@/components/config/aliquota-tab';
import {ServicosTab} from '@/components/config/servicos-tab';
import {CrudTab} from '@/components/config/crud-tab';
import {TextosTab} from '@/components/config/textos-tab';
import {Pill} from '@/components/clinic/form-kit';

const abas=['emitente','parametros','aliquota','servicos','medicos','regras','operadores','textos'] as const;
const nomes:Record<(typeof abas)[number],string>={emitente:'Emitente',parametros:'Parâmetros fiscais',aliquota:'Alíquota do mês',servicos:'Serviços',medicos:'Médicos',regras:'Regras especiais',operadores:'Operadores',textos:'Textos de envio'};

export const Route=createFileRoute('/_authenticated/_workspace/configuracoes')({
 validateSearch:z.object({aba:z.enum(abas).optional()}),
 head:()=>pageHead('Configurações','Emitente, parâmetros fiscais, alíquota do mês, serviços e textos do consultório.'),
 component:Configuration,
});

function Configuration(){
 const {aba='emitente'}=Route.useSearch();const navigate=useNavigate({from:Route.fullPath});
 const {data:p,isLoading,error}=usePainel();
 const semAliquota=p&&!p.aliquotas.some(a=>a.competencia===p.competencia);
 return <>
  <div className="page-heading"><div><div className="title-eyebrow">NOTAS BNAVES</div><h1>Configurações</h1><p>As informações que mantêm suas notas em dia.</p></div>{p&&<Pill tone={p.papel==='admin_goable'?'info':'muted'}>{p.papel==='admin_goable'?'Administração Goable':'Consultório'}</Pill>}</div>
  {isLoading&&<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin"/>Carregando…</div>}
  {error&&<p className="text-destructive">Não foi possível carregar as configurações.</p>}
  {p&&<Tabs value={aba} onValueChange={v=>navigate({search:{aba:v as (typeof abas)[number]},replace:true})}>
   <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted p-1 mb-6">{abas.map(a=><TabsTrigger key={a} value={a} className="text-[15px] px-3 py-2">{nomes[a]}{a==='aliquota'&&semAliquota&&<span className="ml-1.5 h-2 w-2 rounded-full bg-destructive" aria-label="pendente"/>}</TabsTrigger>)}</TabsList>
   <TabsContent value="emitente"><EmitenteTab p={p}/></TabsContent>
   <TabsContent value="parametros"><ParametrosTab p={p}/></TabsContent>
   <TabsContent value="aliquota"><AliquotaTab p={p}/></TabsContent>
   <TabsContent value="servicos"><ServicosTab p={p}/></TabsContent>
   <TabsContent value="medicos"><CrudTab tabela="nf_medicos" titulo="Médico" linhas={p.medicos} podeEditar={p.papel==='admin_goable'} colunas={[{key:'nome',label:'Nome',obrigatorio:true},{key:'crm',label:'CRM'},{key:'nome_no_prontmed',label:'Nome no ProntMed'},{key:'ativo',label:'Ativo',tipo:'bool'}]}/></TabsContent>
   <TabsContent value="regras"><CrudTab tabela="nf_regras_especiais" titulo="Regra" linhas={p.regras} podeEditar={p.papel==='admin_goable'} extra={{label:'Pacientes ligados',render:l=><strong>{String(l['pacientes'])}</strong>}} colunas={[{key:'nome',label:'Nome',obrigatorio:true},{key:'aguarda_autorizacao',label:'Aguarda autorização',tipo:'bool'},{key:'iss_retido',label:'ISS retido',tipo:'bool'},{key:'exige_declaracao',label:'Exige declaração',tipo:'bool'},{key:'tomador_cnpj',label:'CNPJ do tomador (PJ)',tipo:'cnpj',naTabela:false},{key:'tomador_nome',label:'Nome do tomador (PJ)',naTabela:false},{key:'observacao',label:'Observação',tipo:'longo',naTabela:false},{key:'ativo',label:'Ativa',tipo:'bool'}]}/></TabsContent>
   <TabsContent value="operadores"><CrudTab tabela="nf_operadores" titulo="Operador" linhas={p.operadores} podeEditar aviso="Quem usa o sistema no consultório. A ordem define a posição na tela de escolha." colunas={[{key:'nome',label:'Nome',obrigatorio:true},{key:'ordem',label:'Ordem',tipo:'numero'},{key:'ativo',label:'Ativo',tipo:'bool'}]}/></TabsContent>
   <TabsContent value="textos"><TextosTab p={p}/></TabsContent>
  </Tabs>}
  {p?.papel==='admin_goable'&&<Acessos/>}
 </>;
}

function Acessos(){
 const [expanded,setExpanded]=useState(false);const [email,setEmail]=useState('');const [nome,setNome]=useState('');const [password,setPassword]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const createUser=useServerFn(createClinicUser);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{const result=await createUser({data:{email,nome,password}});setMessage(result.message);if(result.ok){setEmail('');setNome('');setPassword('');}}catch{setMessage('Não foi possível criar o acesso. Tente novamente.');}finally{setBusy(false);}}
 return <section className="mt-10 border-t border-border pt-6"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Acessos do consultório</h2><Button variant="outline" onClick={()=>setExpanded(!expanded)}>{expanded?'Fechar':'Criar acesso'}</Button></div>{expanded&&<form className="mt-6 max-w-md" onSubmit={submit}>{message&&<p role="status" className="auth-message tone-info">{message}</p>}<label className="auth-field">Nome<Input required minLength={2} value={nome} onChange={e=>setNome(e.target.value)}/></label><label className="auth-field">E-mail<Input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="auth-field">Senha inicial<Input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><Button variant="action" size="lg" disabled={busy}>Criar acesso do consultório</Button></form>}</section>;
}
