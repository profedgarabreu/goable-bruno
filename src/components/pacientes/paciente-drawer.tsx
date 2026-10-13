import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {FileText,Loader2,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {salvarPaciente} from '@/lib/notas/config.functions';
import {validarCPF,somenteDigitos} from '@/lib/notas/rules';
import {EditDrawer,Field,maskCPF,maskCEP,maskFone,erroAmigavel} from '@/components/clinic/form-kit';
import {useOperator} from '@/components/clinic/operator-context';
import {buscarCep} from './viacep';
import {FichaDialog} from './ficha-dialog';

export type Paciente={id:string;nome:string;cpf:string|null;cep:string|null;logradouro:string|null;numero:string|null;complemento:string|null;bairro:string|null;municipio_ibge:string|null;municipio_nome:string|null;uf:string|null;email:string|null;celular:string|null;regra_especial_id:string|null;prontuario_prontmed:string|null;origem:string;demo:boolean};
export type FormPaciente=Record<'nome'|'cpf'|'cep'|'logradouro'|'numero'|'complemento'|'bairro'|'municipio_ibge'|'municipio_nome'|'uf'|'email'|'celular'|'regra_especial_id'|'prontuario_prontmed',string>;

const paraForm=(p:Paciente|null):FormPaciente=>({nome:p?.nome??'',cpf:maskCPF(p?.cpf??''),cep:maskCEP(p?.cep??''),logradouro:p?.logradouro??'',numero:p?.numero??'',complemento:p?.complemento??'',bairro:p?.bairro??'',municipio_ibge:p?.municipio_ibge??'',municipio_nome:p?.municipio_nome??'',uf:p?.uf??'',email:p?.email??'',celular:maskFone(p?.celular??''),regra_especial_id:p?.regra_especial_id??'',prontuario_prontmed:p?.prontuario_prontmed??''});

export function PacienteDrawer({paciente,regras,onClose,onSaved,onAbrirExistente}:{paciente:Paciente|null;regras:{id:string;nome:string}[];onClose:()=>void;onSaved:()=>Promise<void>;onAbrirExistente:(id:string)=>void}){
 const salvar=useServerFn(salvarPaciente);const {operatorId}=useOperator();
 const [f,setF]=useState<FormPaciente>(()=>paraForm(paciente));const [busy,setBusy]=useState(false);const [cepBusy,setCepBusy]=useState(false);const [cepErr,setCepErr]=useState<string|null>(null);
 const [ficha,setFicha]=useState(false);const [usouFicha,setUsouFicha]=useState(false);const [dup,setDup]=useState<{id:string;nome:string}|null>(null);
 const set=(k:keyof FormPaciente,v:string)=>setF(x=>({...x,[k]:v}));
 const cpfErr=f.cpf&&!validarCPF(f.cpf)?'CPF inválido — confira os números.':null;
 const emailErr=f.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)?'E-mail inválido.':null;
 async function cep(){setCepErr(null);setCepBusy(true);const r=await buscarCep(f.cep);setCepBusy(false);if('erro' in r){setCepErr(r.erro);return;}setF(x=>({...x,cep:maskCEP(r.cep),logradouro:r.logradouro||x.logradouro,bairro:r.bairro||x.bairro,municipio_nome:r.municipio_nome,uf:r.uf,municipio_ibge:r.municipio_ibge}));}
 async function save(){
  setBusy(true);setDup(null);
  const original=paraForm(paciente);
  const mudou=Object.fromEntries((Object.keys(f) as (keyof FormPaciente)[]).filter(k=>!paciente||f[k]!==original[k]).map(k=>[k,['cpf','cep','celular','municipio_ibge'].includes(k)?somenteDigitos(f[k])||null:f[k].trim()||null]));
  if(paciente&&!Object.keys(mudou).length){setBusy(false);onClose();return;}
  if(!paciente)mudou['origem']=usouFicha?'ficha_ia':'manual';
  try{const r=await salvar({data:{id:paciente?.id,dados:mudou as never,operador_id:operatorId}});
   if(r.erro==='cpf_duplicado'){setDup(r.existente);return;}
   toast.success(paciente?'Cadastro atualizado.':'Paciente cadastrado.');await onSaved();onClose();
  }catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}
 }
 return <EditDrawer open onOpenChange={o=>!o&&onClose()} title={paciente?paciente.nome:'Novo paciente'} description={paciente?.demo?'Paciente fictício de demonstração.':undefined} onSave={save} saving={busy} canSave={f.nome.trim().length>=2&&!cpfErr&&!emailErr}>
  <Button variant="outline" size="lg" className="h-12 justify-start text-base" onClick={()=>setFicha(true)}><FileText/>Completar pela ficha do ProntMed</Button>
  {dup&&<div className="status-card is-blocked text-[15px]" role="alert">Já existe um paciente com este CPF: <strong>{dup.nome}</strong>. <button type="button" className="font-semibold underline" onClick={()=>onAbrirExistente(dup.id)}>Abrir cadastro existente</button></div>}
  <Field label="Nome completo"><Input value={f.nome} onChange={x=>set('nome',x.target.value)}/></Field>
  <Field label="CPF" error={cpfErr}><Input inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={x=>set('cpf',maskCPF(x.target.value))}/></Field>
  <Field label="CEP" error={cepErr}><div className="flex gap-2"><Input inputMode="numeric" placeholder="00000-000" value={f.cep} onChange={x=>{set('cep',maskCEP(x.target.value));setCepErr(null);}} onKeyDown={x=>{if(x.key==='Enter'){x.preventDefault();cep();}}}/><Button type="button" variant="outline" onClick={cep} disabled={cepBusy||somenteDigitos(f.cep).length!==8}>{cepBusy?<Loader2 className="animate-spin"/>:<Search/>}Buscar CEP</Button></div></Field>
  <Field label="Logradouro"><Input value={f.logradouro} onChange={x=>set('logradouro',x.target.value)}/></Field>
  <div className="grid grid-cols-[120px_1fr] gap-3"><Field label="Número"><Input value={f.numero} onChange={x=>set('numero',x.target.value)}/></Field><Field label="Complemento"><Input value={f.complemento} onChange={x=>set('complemento',x.target.value)}/></Field></div>
  <Field label="Bairro"><Input value={f.bairro} onChange={x=>set('bairro',x.target.value)}/></Field>
  <div className="grid grid-cols-[1fr_80px_120px] gap-3"><Field label="Município"><Input value={f.municipio_nome} onChange={x=>set('municipio_nome',x.target.value)}/></Field><Field label="UF"><Input maxLength={2} value={f.uf} onChange={x=>set('uf',x.target.value.toUpperCase())}/></Field><Field label="IBGE"><Input inputMode="numeric" value={f.municipio_ibge} onChange={x=>set('municipio_ibge',somenteDigitos(x.target.value).slice(0,7))}/></Field></div>
  <Field label="E-mail" error={emailErr}><Input type="email" value={f.email} onChange={x=>set('email',x.target.value)}/></Field>
  <Field label="Celular"><Input inputMode="tel" placeholder="(31) 90000-0000" value={f.celular} onChange={x=>set('celular',maskFone(x.target.value))}/></Field>
  <Field label="Regra especial"><Select value={f.regra_especial_id||'none'} onValueChange={v=>set('regra_especial_id',v==='none'?'':v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{regras.map(r=><SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent></Select></Field>
  <Field label="Prontuário no ProntMed"><Input value={f.prontuario_prontmed} onChange={x=>set('prontuario_prontmed',x.target.value)}/></Field>
  {ficha&&<FichaDialog atual={f} onClose={()=>setFicha(false)} onAplicar={campos=>{setF(x=>({...x,...campos}));setUsouFicha(true);setFicha(false);toast.success('Campos aplicados. Confira e clique em Salvar.');}}/>}
 </EditDrawer>;
}
