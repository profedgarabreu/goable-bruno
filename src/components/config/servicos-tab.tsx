import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {ArrowDown,ArrowUp,Plus,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {salvarCadastro} from '@/lib/notas/functions';
import {montarDescricao,type Genero} from '@/lib/notas/rules';
import {money} from '@/lib/clinic';
import {EditDrawer,Field,DataTable,Pill} from '@/components/clinic/form-kit';
import {useSalvar,type Painel} from './shared';

type Serv=Painel['servicos'][number];
type Form={nome:string;gera_nota:boolean;valor_padrao:string;descricao_nota:string;genero:Genero;parametro_fiscal_id:string;aliases_prontmed:string[];ativo:boolean};
const vazio:Form={nome:'',gera_nota:true,valor_padrao:'',descricao_nota:'',genero:'a',parametro_fiscal_id:'',aliases_prontmed:[],ativo:true};

export function ServicosTab({p}:{p:Painel}){
 const admin=p.papel==='admin_goable';const {run,operatorId}=useSalvar();const salvar=useServerFn(salvarCadastro);
 const [atual,setAtual]=useState<Serv|null>(null);const [open,setOpen]=useState(false);const [f,setF]=useState<Form>(vazio);const [chip,setChip]=useState('');const [busy,setBusy]=useState(false);
 const parametrosAtivos=p.parametros.filter(x=>x.ativo);
 function abrir(s:Serv|null){setAtual(s);setF(s?{nome:s.nome,gera_nota:s.gera_nota,valor_padrao:s.valor_padrao==null?'':String(s.valor_padrao).replace('.',','),descricao_nota:s.descricao_nota,genero:s.genero as Genero,parametro_fiscal_id:s.parametro_fiscal_id??'',aliases_prontmed:s.aliases_prontmed,ativo:s.ativo}:{...vazio,parametro_fiscal_id:parametrosAtivos[0]?.id??''});setChip('');setOpen(true);}
 const valorNum=f.valor_padrao.trim()?Number(f.valor_padrao.replace(/\./g,'').replace(',','.')):null;
 const valorErr=valorNum!=null&&!(valorNum>=0)?'Valor inválido.':null;
 async function save(){
  const completo={nome:f.nome,gera_nota:f.gera_nota,valor_padrao:valorNum,descricao_nota:f.descricao_nota,genero:f.genero,parametro_fiscal_id:f.parametro_fiscal_id||null,aliases_prontmed:f.aliases_prontmed,ativo:f.ativo,...(atual?{}:{ordem:(p.servicos.at(-1)?.ordem??0)+1})};
  const dados=admin?completo:{valor_padrao:valorNum,descricao_nota:f.descricao_nota};
  setBusy(true);const r=await run(()=>salvar({data:{tabela:'nf_servicos',id:atual?.id,dados,operador_id:operatorId}}),'Serviço salvo.');setBusy(false);if(r)setOpen(false);
 }
 async function mover(i:number,dir:-1|1){const a=p.servicos[i],b=p.servicos[i+dir];if(!a||!b)return;await run(async()=>{await salvar({data:{tabela:'nf_servicos',id:a.id,dados:{ordem:b.ordem},operador_id:operatorId}});await salvar({data:{tabela:'nf_servicos',id:b.id,dados:{ordem:a.ordem},operador_id:operatorId}});},'Ordem atualizada.');}
 function addChip(){const v=chip.trim();if(v&&!f.aliases_prontmed.includes(v))setF({...f,aliases_prontmed:[...f.aliases_prontmed,v]});setChip('');}
 let previa='';try{previa=f.descricao_nota.trim()?montarDescricao(1,{descricao_nota:f.descricao_nota.trim(),genero:f.genero}):'';}catch{previa='';}
 const travado=!admin;
 return <div className="grid gap-4">
  <div className="flex items-center justify-between gap-3"><p className="text-[15px] text-muted-foreground">{admin?'Clique num serviço para editar.':'O consultório pode ajustar o valor e o texto da nota de cada serviço.'}</p>{admin&&<Button variant="action" onClick={()=>abrir(null)}><Plus/>Novo serviço</Button>}</div>
  <DataTable head={['Ordem','Serviço','Gera nota','Valor padrão','Texto da nota','Situação']} empty={!p.servicos.length}>{p.servicos.map((s,i)=><tr key={s.id} className="is-clickable" onClick={()=>abrir(s)}>
   <td onClick={e=>e.stopPropagation()}>{admin?<div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Subir" disabled={i===0} onClick={()=>mover(i,-1)}><ArrowUp/></Button><Button size="icon" variant="ghost" aria-label="Descer" disabled={i===p.servicos.length-1} onClick={()=>mover(i,1)}><ArrowDown/></Button></div>:i+1}</td>
   <td className="font-medium">{s.nome}{s.observacao&&<div className="text-xs text-muted-foreground">{s.observacao}</div>}</td><td>{s.gera_nota?<Pill tone="success">Sim</Pill>:<Pill tone="muted">Não</Pill>}</td><td>{s.valor_padrao==null?'—':money(Number(s.valor_padrao))}</td><td className="text-muted-foreground">{montarDescricao(1,{descricao_nota:s.descricao_nota,genero:s.genero as Genero})}</td><td>{s.ativo?<Pill tone="success">Ativo</Pill>:<Pill tone="muted">Inativo</Pill>}</td></tr>)}</DataTable>
  <EditDrawer open={open} onOpenChange={setOpen} title={atual?`Editar ${atual.nome}`:'Novo serviço'} onSave={save} saving={busy} canSave={!!f.nome.trim()&&f.descricao_nota.trim().length>=2&&!valorErr}>
   <Field label="Nome"><Input disabled={travado} value={f.nome} onChange={x=>setF({...f,nome:x.target.value})}/></Field>
   <label className="flex items-center justify-between text-[15px]">Gera nota fiscal<Switch disabled={travado} checked={f.gera_nota} onCheckedChange={x=>setF({...f,gera_nota:x})}/></label>
   <Field label="Valor padrão (R$)" error={valorErr}><Input inputMode="decimal" placeholder="Ex.: 470,00" value={f.valor_padrao} onChange={x=>setF({...f,valor_padrao:x.target.value.replace(/[^\d,.]/g,'')})}/></Field>
   <Field label="Texto da nota" hint="Escreva no singular; a quantidade é colocada automaticamente."><Input value={f.descricao_nota} onChange={x=>setF({...f,descricao_nota:x.target.value})}/></Field>
   <Field label="Gênero da palavra"><Select disabled={travado} value={f.genero} onValueChange={g=>setF({...f,genero:g as Genero})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="a">Feminino (uma, duas)</SelectItem><SelectItem value="o">Masculino (um, dois)</SelectItem></SelectContent></Select></Field>
   <div className="rounded-md border border-border bg-secondary px-4 py-3"><div className="text-xs text-muted-foreground">Prévia na nota</div><div className="text-[15px] font-medium" data-testid="previa-descricao">{previa||'—'}</div></div>
   <Field label="Parâmetro fiscal"><Select disabled={travado} value={f.parametro_fiscal_id||'none'} onValueChange={v=>setF({...f,parametro_fiscal_id:v==='none'?'':v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Sem parâmetro</SelectItem>{parametrosAtivos.map(x=><SelectItem key={x.id} value={x.id}>{x.nome} (v{x.versao})</SelectItem>)}</SelectContent></Select></Field>
   <Field label="Apelidos no ProntMed" hint="Como o serviço aparece no relatório do ProntMed. Tecle Enter para adicionar."><div className="flex flex-wrap gap-2">{f.aliases_prontmed.map(a=><span key={a} className="status-badge tone-info text-sm">{a}{!travado&&<button type="button" aria-label={`Remover ${a}`} onClick={()=>setF({...f,aliases_prontmed:f.aliases_prontmed.filter(x=>x!==a)})}><X size={12}/></button>}</span>)}</div>{!travado&&<Input value={chip} placeholder="Ex.: CONSULTA PARTICULAR" onChange={x=>setChip(x.target.value)} onKeyDown={x=>{if(x.key==='Enter'){x.preventDefault();addChip();}}} onBlur={addChip}/>}</Field>
   <label className="flex items-center justify-between text-[15px]">Ativo<Switch disabled={travado} checked={f.ativo} onCheckedChange={x=>setF({...f,ativo:x})}/></label>
  </EditDrawer>
 </div>;
}
