import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {operatorKey,validOperator,type Operator} from '@/lib/clinic';
const OperatorContext = createContext<{operator:Operator|null;choose:(operator:Operator|null)=>void}>({operator:null,choose:()=>{}});
export function OperatorProvider({children}:{children:ReactNode}) {
 const [operator,setOperator] = useState<Operator|null>(null);
 useEffect(()=>{const saved=sessionStorage.getItem(operatorKey);if(validOperator(saved))setOperator(saved);},[]);
 function choose(value:Operator|null) { setOperator(value); if(value)sessionStorage.setItem(operatorKey,value);else sessionStorage.removeItem(operatorKey); }
 return <OperatorContext.Provider value={{operator,choose}}>{children}</OperatorContext.Provider>;
}
export const useOperator = ()=>useContext(OperatorContext);
