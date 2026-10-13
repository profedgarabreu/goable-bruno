import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {painelConfiguracoes} from '@/lib/notas/config.functions';
import {useOperator} from '@/components/clinic/operator-context';
import {erroAmigavel} from '@/components/clinic/form-kit';

export type Painel=Awaited<ReturnType<typeof painelConfiguracoes>>;
export const painelKey=['painel-config'] as const;

export function usePainel(){const fn=useServerFn(painelConfiguracoes);return useQuery({queryKey:painelKey,queryFn:()=>fn()});}

/** Runs a save, shows feedback and refreshes every screen that depends on settings. */
export function useSalvar(){
 const qc=useQueryClient();const {operatorId}=useOperator();
 return {operatorId,async run<T>(fn:()=>Promise<T>,msg='Salvo com sucesso.'){try{const r=await fn();toast.success(msg);await Promise.all([qc.invalidateQueries({queryKey:painelKey}),qc.invalidateQueries({queryKey:['config-fiscal']})]);return r;}catch(e){toast.error(erroAmigavel(e));return undefined;}}};
}
export const competenciaLabel=(c:string)=>{const [y,m]=c.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});};
export const dataBR=(v:string|null|undefined)=>v?new Date(v).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
