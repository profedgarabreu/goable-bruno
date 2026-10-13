import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {salvarCadastro} from '@/lib/notas/functions';
import {validarCNPJ,formatarCNPJ} from '@/lib/notas/rules';
import {EditDrawer,Field,DataTable,Pill,maskCNPJ} from '@/components/clinic/form-kit';
import {useSalvar} from './shared';

export type Coluna={key:string;label:string;tipo?:'texto'|'bool'|'numero'|'cnpj'|'longo';obrigatorio?:boolean;naTabela?:boolean};
type Linha={id:string}&Record<string,unknown>;
/** Simple table + side-drawer editor for small back-office lists (médicos, regras, operadores). */
export function CrudTab({tabela,titulo,linhas,colunas,podeEditar,extra,aviso}:{tabela:'nf_medicos'|'nf_regras_especiais'|'nf_operadores';titulo:string;linhas:Linha[];colunas:Coluna[];podeEditar:boolean;extra?:{label:string;render:(l:Linha)=>React.ReactNode};aviso?:string}){
 const {run,operatorId}=useSalvar();const salvar=useServerFn(salvarCadastro);
 const [open,setOpen]=useState(false);const [atual,setAtual]=useState<Linha|null>(null);const [f,setF]=useState<Record<string,unknown>>({});const [busy,setBusy]=useState(false);
 function abrir(l:Linha|null){setAtual(l);setF(Object.fromEntries(colunas.map(c=>{const v=l?.[c.key];return [c.key,c.tipo==='bool'?(v??true):c.tipo==='cnpj'?maskCNPJ(String(v??'')):c.tipo==='numero'?(v==null?'':String(v)):(v??'')];})));setOpen(true);}
 const erros=Object.fromEntries(colunas.map(c=>[c.key,c.obrigatorio&&!String(f[c.key]??'').trim()?'Obrigatório.':c.tipo==='cnpj'&&String(f[c.key]??'')&&!validarCNPJ(String(f[c.key]))?'CNPJ inválido.':null]));
 async function save(){const dados=Object.fromEntries(colunas.map(c=>{const v=f[c.key];return [c.key,c.tipo==='numero'?Number(v||0):c.tipo==='bool'?!!v:typeof v==='string'?(v.trim()||(c.tipo==='longo'?'':null)):v];}));setBusy(true);const r=await run(()=>salvar({data:{tabela,id:atual?.id,dados,operador_id:operatorId}}),`${titulo} salvo.`);setBusy(false);if(r)setOpen(false);}
 const mostrar=(c:Coluna,v:unknown)=>c.tipo==='bool'?(v?<Pill tone={c.key==='ativo'?'success':'warning'}>Sim</Pill>:<Pill tone="muted">Não</Pill>):c.tipo==='cnpj'&&v?formatarCNPJ(String(v)):String(v??'')||'—';
 const visiveis=colunas.filter(c=>c.naTabela!==false);
 return <div className="grid gap-4">
  <div className="flex items-center justify-between gap-3"><p className="text-[15px] text-muted-foreground">{aviso??(podeEditar?'Clique numa linha para editar.':'Somente a administração Goable altera este cadastro.')}</p>{podeEditar&&<Button variant="action" onClick={()=>abrir(null)}><Plus/>Novo</Button>}</div>
  <DataTable head={[...visiveis.map(c=>c.label),...(extra?[extra.label]:[])]} empty={!linhas.length}>{linhas.map(l=><tr key={l.id} className={podeEditar?'is-clickable':''} onClick={()=>podeEditar&&abrir(l)}>{visiveis.map(c=><td key={c.key}>{mostrar(c,l[c.key])}</td>)}{extra&&<td>{extra.render(l)}</td>}</tr>)}</DataTable>
  <EditDrawer open={open} onOpenChange={setOpen} title={atual?`Editar ${titulo.toLowerCase()}`:`Novo ${titulo.toLowerCase()}`} onSave={save} saving={busy} canSave={Object.values(erros).every(e=>!e)}>
   {colunas.map(c=>c.tipo==='bool'?<label key={c.key} className="flex items-center justify-between text-[15px]">{c.label}<Switch checked={!!f[c.key]} onCheckedChange={x=>setF({...f,[c.key]:x})}/></label>
    :<Field key={c.key} label={c.label} error={String(f[c.key]??'')?erros[c.key]:null}>{c.tipo==='longo'?<Textarea rows={3} value={String(f[c.key]??'')} onChange={x=>setF({...f,[c.key]:x.target.value})}/>:<Input inputMode={c.tipo==='numero'||c.tipo==='cnpj'?'numeric':undefined} value={String(f[c.key]??'')} onChange={x=>setF({...f,[c.key]:c.tipo==='cnpj'?maskCNPJ(x.target.value):c.tipo==='numero'?x.target.value.replace(/\D/g,''):x.target.value})}/>}</Field>)}
  </EditDrawer>
 </div>;
}
