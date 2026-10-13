import {Skeleton} from '@/components/ui/skeleton';
/** Placeholder rows while a table loads. `emTabela` renders bare <tr>s for use inside an existing <tbody>. */
export function TableSkeleton({colunas,linhas=5,emTabela=false}:{colunas:number;linhas?:number;emTabela?:boolean}){
 const rows=Array.from({length:linhas},(_,i)=><tr key={i} aria-hidden="true">{Array.from({length:colunas},(_,j)=><td key={j}><Skeleton className="h-4 w-full max-w-[160px]"/></td>)}</tr>);
 if(emTabela)return <>{rows}</>;
 return <div className="table-section" role="status" aria-label="Carregando"><div className="table-scroll"><table className="config-table"><tbody>{rows}</tbody></table></div></div>;
}
