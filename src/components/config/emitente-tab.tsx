import {Fragment,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {ShieldAlert,ShieldCheck,Pencil,BadgeCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {salvarEmitente,registrarValidacaoContador} from '@/lib/notas/config.functions';
import {validarCNPJ,formatarCNPJ} from '@/lib/notas/rules';
import {regimes} from '@/lib/notas/labels';
import {EditDrawer,Field,maskCNPJ,maskFone,d} from '@/components/clinic/form-kit';
import {useSalvar,dataBR,type Painel} from './shared';
import {saoPauloDate} from '@/lib/clinic';

export function EmitenteTab({p}:{p:Painel}){
 const e=p.emitente;const admin=p.papel==='admin_goable';const {run,operatorId}=useSalvar();
 const salvar=useServerFn(salvarEmitente);const validar=useServerFn(registrarValidacaoContador);
 const [edit,setEdit]=useState(false);const [val,setVal]=useState(false);const [busy,setBusy]=useState(false);
 const [f,setF]=useState<Record<string,string>>({});
 const [v,setV]=useState({contador:'',data:saoPauloDate(),ok:false});
 if(!e)return <p>Emitente não cadastrado.</p>;
 const faltas=[!e.cnpj&&'CNPJ do consultório não informado',!e.parametros_validados_em&&'Validação do contador não registrada'].filter(Boolean) as string[];
 const pronto=faltas.length===0;
 function abrir(){setF({razao_social:e!.razao_social,cnpj:maskCNPJ(e!.cnpj??''),inscricao_municipal:e!.inscricao_municipal??'',municipio_nome:e!.municipio_nome,municipio_ibge:e!.municipio_ibge,uf:e!.uf,regime:e!.regime,email_remetente:e!.email_remetente??'',whatsapp_numero:maskFone(e!.whatsapp_numero??'')});setEdit(true);}
 const cnpjErr=f.cnpj&&!validarCNPJ(f.cnpj)?'CNPJ inválido — confira os números.':null;
 async function save(){setBusy(true);const r=await run(()=>salvar({data:{dados:{...f,razao_social:f.razao_social??'',municipio_ibge:f.municipio_ibge??'',municipio_nome:f.municipio_nome??'',uf:(f.uf??'').toUpperCase(),regime:f.regime??''},operador_id:operatorId}}),'Dados do emitente salvos.');setBusy(false);if(r)setEdit(false);}
 async function saveVal(){setBusy(true);const r=await run(()=>validar({data:{contador:v.contador,data:v.data,conferido:true,operador_id:operatorId}}),'Validação do contador registrada.');setBusy(false);if(r)setVal(false);}
 const linhas:[string,string][]=[['Razão social',e.razao_social],['CNPJ',e.cnpj?formatarCNPJ(e.cnpj):'Não informado'],['Inscrição municipal',e.inscricao_municipal||'Não informada'],['Município',`${e.municipio_nome}/${e.uf} (IBGE ${e.municipio_ibge})`],['Regime',regimes[e.regime]??e.regime],['E-mail remetente',e.email_remetente||'Não informado'],['WhatsApp',e.whatsapp_numero?maskFone(e.whatsapp_numero):'Não informado'],['Validação do contador',e.parametros_validados_em?`${e.parametros_validados_por} em ${dataBR(e.parametros_validados_em)}`:'Pendente']];
 return <div className="grid gap-5">
  <div className={`status-card ${pronto?'is-ready':'is-blocked'}`}>
   <div className="flex flex-wrap items-start gap-3">{pronto?<ShieldCheck className="text-success" size={26}/>:<ShieldAlert className="text-destructive" size={26}/>}
    <div className="flex-1 min-w-[220px]"><h2 className={`text-lg font-semibold ${pronto?'':'text-destructive'}`}>{pronto?'Pronto para produção':'Produção bloqueada'}</h2>
     <ul className="mt-2 grid gap-1 text-[15px]">{faltas.map(x=><li key={x}>• {x}</li>)}<li className="text-muted-foreground">• Certificado digital: configurado no provedor de emissão — M4</li></ul></div>
    {admin&&<Button variant="outline" onClick={()=>{setV({contador:e.parametros_validados_por??'',data:saoPauloDate(),ok:false});setVal(true);}}><BadgeCheck/>Registrar validação do contador</Button>}
   </div>
  </div>
  <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Dados de quem emite a nota</h2>{admin&&<Button variant="action" onClick={abrir}><Pencil/>Editar emitente</Button>}</div>
  <div className="ficha">{linhas.map(([l,x])=><Fragment key={l}><div className="ficha-label">{l}</div><div>{x}</div></Fragment>)}</div>
  {!admin&&<p className="text-sm text-muted-foreground">Somente a administração Goable altera os dados do emitente.</p>}
  <EditDrawer open={edit} onOpenChange={setEdit} title="Editar emitente" onSave={save} saving={busy} canSave={!cnpjErr&&!!f.razao_social}>
   <Field label="Razão social"><Input value={f.razao_social??''} onChange={x=>setF({...f,razao_social:x.target.value})}/></Field>
   <Field label="CNPJ" error={cnpjErr}><Input inputMode="numeric" placeholder="00.000.000/0000-00" value={f.cnpj??''} onChange={x=>setF({...f,cnpj:maskCNPJ(x.target.value)})}/></Field>
   <Field label="Inscrição municipal"><Input value={f.inscricao_municipal??''} onChange={x=>setF({...f,inscricao_municipal:x.target.value})}/></Field>
   <div className="grid grid-cols-[1fr_90px_130px] gap-3"><Field label="Município"><Input value={f.municipio_nome??''} onChange={x=>setF({...f,municipio_nome:x.target.value})}/></Field><Field label="UF"><Input maxLength={2} value={f.uf??''} onChange={x=>setF({...f,uf:x.target.value.toUpperCase()})}/></Field><Field label="Código IBGE"><Input inputMode="numeric" value={f.municipio_ibge??''} onChange={x=>setF({...f,municipio_ibge:d(x.target.value).slice(0,7)})}/></Field></div>
   <Field label="Regime"><Select value={f.regime} onValueChange={r=>setF({...f,regime:r})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(regimes).map(([k,l])=><SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field>
   <Field label="E-mail remetente"><Input type="email" value={f.email_remetente??''} onChange={x=>setF({...f,email_remetente:x.target.value})}/></Field>
   <Field label="WhatsApp do consultório"><Input inputMode="tel" value={f.whatsapp_numero??''} onChange={x=>setF({...f,whatsapp_numero:maskFone(x.target.value)})}/></Field>
  </EditDrawer>
  <Dialog open={val} onOpenChange={setVal}><DialogContent><DialogHeader><DialogTitle>Registrar validação do contador</DialogTitle><DialogDescription>Registre quando o contador conferiu os parâmetros fiscais.</DialogDescription></DialogHeader>
   <div className="grid gap-4"><Field label="Nome do contador"><Input value={v.contador} onChange={x=>setV({...v,contador:x.target.value})}/></Field><Field label="Data da validação"><Input type="date" value={v.data} onChange={x=>setV({...v,data:x.target.value})}/></Field>
    <label className="flex items-start gap-3 text-[15px]"><Checkbox checked={v.ok} onCheckedChange={c=>setV({...v,ok:c===true})} className="mt-0.5"/>Parâmetros fiscais conferidos pelo contador</label></div>
   <DialogFooter><Button variant="action" size="lg" disabled={busy||!v.ok||v.contador.trim().length<3||!v.data} onClick={saveVal}>Salvar validação</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}
