import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {useState} from 'react';
import {toast} from 'sonner';
import {FlaskConical,TestTube2,BadgeCheck,Lock} from 'lucide-react';
import {statusEmissor,alterarModoEmissor} from '@/lib/notas/emissao.functions';
import {useOperator} from '@/components/clinic/operator-context';
import {erroAmigavel} from '@/components/clinic/form-kit';

const modos=[
 {key:'mock',titulo:'Demonstração',texto:'Notas fictícias, sem valor fiscal. Para treinar.',icon:FlaskConical},
 {key:'homologacao',titulo:'Homologação',texto:'Ambiente de testes da Receita, via Focus NFe.',icon:TestTube2},
 {key:'producao',titulo:'Produção',texto:'Notas reais, com valor fiscal.',icon:BadgeCheck},
] as const;

/** Issuer mode picker. Only the Goable administrator changes it; unavailable modes explain what is missing. */
export function ModoEmissor(){
 const fn=useServerFn(statusEmissor);const alterar=useServerFn(alterarModoEmissor);const qc=useQueryClient();const {operatorId}=useOperator();
 const {data}=useQuery({queryKey:['status-emissor'],queryFn:()=>fn()});const [busy,setBusy]=useState(false);
 if(!data)return null;const admin=data.papel==='admin_goable';
 async function escolher(m:'mock'|'homologacao'|'producao'){setBusy(true);try{await alterar({data:{modo:m,operador_id:operatorId}});toast.success('Modo de emissão alterado.');await qc.invalidateQueries({queryKey:['status-emissor']});}catch(e){toast.error(erroAmigavel(e));}finally{setBusy(false);}}
 return <section aria-labelledby="modo-emissor-titulo"><h2 id="modo-emissor-titulo" className="mb-3 text-lg font-semibold">Modo de emissão</h2>
  <div className="modo-grid" role="radiogroup" aria-label="Modo de emissão">{modos.map(m=>{const d=data.disponiveis[m.key];const atual=data.modo===m.key;const Icon=m.icon;
   return <button key={m.key} type="button" role="radio" aria-checked={atual} disabled={!admin||!d.ok||busy||atual} onClick={()=>escolher(m.key)} className={`modo-card ${atual?'is-current':''} ${!d.ok?'is-unavailable':''}`}>
    <span className="flex items-center gap-2 font-semibold">{d.ok?<Icon size={17}/>:<Lock size={16}/>}{m.titulo}{atual&&<span className="status-badge tone-success ml-auto">Em uso</span>}</span>
    <span className="text-sm text-muted-foreground">{m.texto}</span>
    {!d.ok&&<span className="text-sm text-destructive">{d.motivo}</span>}
   </button>;})}</div>
  {!admin&&<p className="mt-2 text-sm text-muted-foreground">Somente a administração Goable altera o modo de emissão.</p>}
 </section>;
}
