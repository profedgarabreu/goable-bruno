import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {operatorKey,parseOperator,type Operator} from '@/lib/clinic';
const OperatorContext = createContext<{operator:string|null;operatorId:string|null;choose:(operator:Operator|null)=>void}>({operator:null,operatorId:null,choose:()=>{}});
export function OperatorProvider({children}:{children:ReactNode}) {
 const [current,setCurrent] = useState<Operator|null>(null);
 useEffect(()=>{setCurrent(parseOperator(sessionStorage.getItem(operatorKey)));},[]);
 function choose(value:Operator|null) { setCurrent(value); if(value)sessionStorage.setItem(operatorKey,JSON.stringify(value));else sessionStorage.removeItem(operatorKey); }
 return <OperatorContext.Provider value={{operator:current?.nome??null,operatorId:current?.id??null,choose}}>{children}</OperatorContext.Provider>;
}
export const useOperator = ()=>useContext(OperatorContext);
