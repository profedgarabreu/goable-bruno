import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {urlArquivoNota} from '@/lib/notas/emissao.functions';
import {erroAmigavel} from '@/components/clinic/form-kit';

/** Opens a 10-minute signed link. The tab is opened synchronously so popup blockers allow it. */
export function useAbrirArquivo(){
 const fn=useServerFn(urlArquivoNota);
 return async(notaId:string,tipo:'pdf'|'xml')=>{
  const w=tipo==='pdf'?window.open('about:blank','_blank'):null;
  try{const {url}=await fn({data:{nota_id:notaId,tipo}});if(w)w.location.href=url;else window.location.assign(url);}
  catch(e){w?.close();toast.error(erroAmigavel(e));}
 };
}
