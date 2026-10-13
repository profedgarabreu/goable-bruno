import {useEffect,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {useQueryClient} from '@tanstack/react-query';
import {statusLote,processarNotaFn} from '@/lib/notas/emissao.functions';
import {useOperator} from '@/components/clinic/operator-context';

export type LoteStatus=Awaited<ReturnType<typeof statusLote>>;
const abertas=(s:LoteStatus|null)=>(s?.notas??[]).filter(n=>n.status==='pendente'||n.status==='processando');
const esperar=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export const POLL_MS=5000,POLL_MAX_MS=120000;

/**
 * Drives a batch: sends pending notes one by one (live progress), then polls processing ones every 5 s for up to 2 min.
 * Safe to run twice (refresh, two tabs): the server claims each note, so nothing is sent twice.
 */
export function useEmissaoLote(loteId:string|null){
 const status=useServerFn(statusLote);const proc=useServerFn(processarNotaFn);const {operatorId}=useOperator();const qc=useQueryClient();
 const [dados,setDados]=useState<LoteStatus|null>(null);const [fase,setFase]=useState<'parado'|'enviando'|'aguardando'|'concluido'|'expirado'>('parado');
 const [atual,setAtual]=useState(0);const [totalEnvio,setTotalEnvio]=useState(0);const [rodada,setRodada]=useState(0);const [erro,setErro]=useState<string|null>(null);
 useEffect(()=>{
  if(!loteId)return;let cancel=false;
  (async()=>{
   try{
    let s=await status({data:{lote_id:loteId}});if(cancel)return;setDados(s);
    const pend=s.notas.filter(n=>n.status==='pendente');
    if(pend.length){setFase('enviando');setTotalEnvio(pend.length);
     for(let i=0;i<pend.length;i++){if(cancel)return;setAtual(i+1);
      try{await proc({data:{nota_id:pend[i]!.id,operador_id:operatorId}});}catch(e){setErro(e instanceof Error?e.message:String(e));}
      s=await status({data:{lote_id:loteId}});if(cancel)return;setDados(s);}}
    const t0=Date.now();
    while(abertas(s).length&&Date.now()-t0<POLL_MAX_MS){
     if(cancel)return;setFase('aguardando');await esperar(POLL_MS);if(cancel)return;
     for(const n of abertas(s)){try{await proc({data:{nota_id:n.id,operador_id:operatorId}});}catch(e){setErro(e instanceof Error?e.message:String(e));}}
     s=await status({data:{lote_id:loteId}});if(cancel)return;setDados(s);
    }
    setFase(abertas(s).length?'expirado':'concluido');
    void qc.invalidateQueries({queryKey:['notas']});void qc.invalidateQueries({queryKey:['conferencia']});void qc.invalidateQueries({queryKey:['dia']});
   }catch(e){if(!cancel){setErro(e instanceof Error?e.message:String(e));setFase('expirado');}}
  })();
  return ()=>{cancel=true;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[loteId,rodada]);
 const notas=dados?.notas??[];
 return {dados,notas,fase,atual,totalEnvio,erro,
  autorizadas:notas.filter(n=>n.status==='autorizada').length,
  comErro:notas.filter(n=>n.status==='erro').length,
  reiniciar:()=>{setErro(null);setRodada(r=>r+1);}};
}
