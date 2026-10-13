import {Link} from '@tanstack/react-router';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {AlertTriangle} from 'lucide-react';
import {getConfigFiscalAtual} from '@/lib/notas/functions';

/** Yellow strip on every internal page while the current month has no Simples rate. */
export function AliquotaBanner(){
 const fn=useServerFn(getConfigFiscalAtual);
 const {data}=useQuery({queryKey:['config-fiscal'],queryFn:()=>fn(),staleTime:60000});
 if(!data||data.aliquota)return null;
 const [y,m]=data.competencia.split('-');const mes=new Date(Number(y),Number(m)-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 return <div className="aliquota-banner" role="alert"><AlertTriangle size={16}/><span>A alíquota do Simples de <strong>{mes}</strong> ainda não foi informada. As notas do mês ficam bloqueadas.</span><Link to="/configuracoes" search={{aba:'aliquota'}}>Informar agora</Link></div>;
}
