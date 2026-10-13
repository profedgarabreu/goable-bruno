import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Loader2,Sparkles,AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {extrairFicha} from '@/lib/notas/config.functions';
import {validarCPF,type Ficha} from '@/lib/notas/rules';
import {maskCPF,maskCEP,maskFone,erroAmigavel} from '@/components/clinic/form-kit';
import {buscarCep} from './viacep';
import type {FormPaciente} from './paciente-drawer';

const campos:[keyof FormPaciente,string][]=[['nome','Nome'],['cpf','CPF'],['celular','Celular'],['email','E-mail'],['cep','CEP'],['logradouro','Logradouro'],['numero','Número'],['complemento','Complemento'],['bairro','Bairro'],['municipio_nome','Município'],['uf','UF'],['municipio_ibge','IBGE']];

/** The pasted text lives only in this component's state and is discarded on close. */
export function FichaDialog({atual,onClose,onAplicar}:{atual:FormPaciente;onClose:()=>void;onAplicar:(c:Partial<FormPaciente>)=>void}){
 const extrair=useServerFn(extrairFicha);
 const [texto,setTexto]=useState('');const [busy,setBusy]=useState(false);const [erro,setErro]=useState<string|null>(null);
 const [extraido,setExtraido]=useState<Partial<FormPaciente>|null>(null);const [nasc,setNasc]=useState<string|null>(null);const [avisos,setAvisos]=useState<string[]>([]);const [marcados,setMarcados]=useState<Set<string>>(new Set());
 async function ler(){
  setBusy(true);setErro(null);
  try{const {ficha,avisos:av}=await extrair({data:{texto}}) as {ficha:Ficha;avisos:string[]};
   const e:Partial<FormPaciente>={};const avisosExtra=[...av];
   if(ficha.nome)e.nome=ficha.nome;if(ficha.cpf)e.cpf=maskCPF(ficha.cpf);if(ficha.celular)e.celular=maskFone(ficha.celular);if(ficha.email)e.email=ficha.email;
   if(ficha.logradouro)e.logradouro=ficha.logradouro;if(ficha.numero)e.numero=ficha.numero;if(ficha.complemento)e.complemento=ficha.complemento;if(ficha.bairro)e.bairro=ficha.bairro;if(ficha.municipio_nome)e.municipio_nome=ficha.municipio_nome;if(ficha.uf)e.uf=ficha.uf;
   if(ficha.cep){e.cep=maskCEP(ficha.cep);const c=await buscarCep(ficha.cep);if('erro' in c)avisosExtra.push(`CEP da ficha: ${c.erro}`);else{e.municipio_ibge=c.municipio_ibge;if(c.municipio_nome)e.municipio_nome=c.municipio_nome;if(c.uf)e.uf=c.uf;if(!e.bairro&&c.bairro)e.bairro=c.bairro;if(!e.logradouro&&c.logradouro)e.logradouro=c.logradouro;}}
   setExtraido(e);setNasc(ficha.data_nascimento);setAvisos(avisosExtra);
   setMarcados(new Set(Object.keys(e).filter(k=>e[k as keyof FormPaciente]&&e[k as keyof FormPaciente]!==atual[k as keyof FormPaciente]&&!(k==='cpf'&&!validarCPF(e.cpf!)))));
   setTexto('');
  }catch(x){setErro(erroAmigavel(x));}finally{setBusy(false);}
 }
 const toggle=(k:string)=>setMarcados(s=>{const n=new Set(s);if(n.has(k))n.delete(k);else n.add(k);return n;});
 return <Dialog open onOpenChange={o=>!o&&onClose()}><DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
  <DialogHeader><DialogTitle>Completar pela ficha do ProntMed</DialogTitle><DialogDescription>{extraido?'Marque os campos que deseja usar e confirme.':'Abra a ficha do paciente no ProntMed, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui.'}</DialogDescription></DialogHeader>
  {!extraido?<>
   <Textarea autoFocus rows={10} className="text-[15px]" placeholder="Cole aqui o conteúdo da ficha…" value={texto} onChange={e=>setTexto(e.target.value)}/>
   <p className="text-xs text-muted-foreground">O texto colado é usado só para esta leitura e não fica guardado em lugar nenhum.</p>
   {erro&&<p className="text-sm text-destructive">{erro}</p>}
   <DialogFooter><Button variant="action" size="lg" disabled={busy||texto.trim().length<10} onClick={ler}>{busy?<Loader2 className="animate-spin"/>:<Sparkles/>}{busy?'Lendo a ficha…':'Ler ficha'}</Button></DialogFooter>
  </>:<>
   {avisos.length>0&&<div className="status-card is-blocked text-sm grid gap-1">{avisos.map(a=><div key={a} className="flex gap-2"><AlertTriangle size={15} className="shrink-0 text-destructive"/>{a}</div>)}</div>}
   {nasc&&<p className="text-sm text-muted-foreground">Data de nascimento na ficha (só para conferência, não é salva): <strong>{nasc}</strong></p>}
   <div className="table-section"><table className="config-table"><thead><tr><th>Usar</th><th>Campo</th><th>Atual</th><th>Da ficha</th></tr></thead><tbody>{campos.map(([k,l])=>{const v=extraido[k];const cpfRuim=k==='cpf'&&v&&!validarCPF(v);return <tr key={k}><td><Checkbox aria-label={`Usar ${l}`} disabled={!v} checked={marcados.has(k)} onCheckedChange={()=>toggle(k)}/></td><td className="font-medium">{l}</td><td className="text-muted-foreground">{atual[k]||'—'}</td><td>{v?<span className={cpfRuim?'text-destructive':''}>{v}{cpfRuim&&' (inválido)'}</span>:<span className="text-muted-foreground">não encontrado</span>}</td></tr>;})}</tbody></table></div>
   <DialogFooter className="gap-2"><Button variant="outline" onClick={()=>{setExtraido(null);setAvisos([]);}}>Colar outra ficha</Button><Button variant="action" size="lg" disabled={!marcados.size} onClick={()=>onAplicar(Object.fromEntries([...marcados].map(k=>[k,extraido[k as keyof FormPaciente]??''])))}>Usar {marcados.size} campo(s)</Button></DialogFooter>
  </>}
 </DialogContent></Dialog>;
}
