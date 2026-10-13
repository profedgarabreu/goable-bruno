// Pure, deterministic demo-history planning (same day → same plan), shared by the server and tests.
export const HIST_TAG='Demo · histórico';
export type FormaDemo='pix'|'credito'|'debito'|'dinheiro';
export type LinhaDemo={paciente:string;servico:string;valor:number;forma:FormaDemo};

export function rng(seed:string){let h=1779033703^seed.length;for(let i=0;i<seed.length;i++){h=Math.imul(h^seed.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19);}
 return ()=>{h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return (h>>>0)/4294967296;};}
const pick=<T,>(r:()=>number,itens:[T,number][])=>{const t=itens.reduce((s,[,w])=>s+w,0);let x=r()*t;for(const [v,w] of itens){if((x-=w)<0)return v;}return itens[itens.length-1]![0];};

export const FORMAS:[FormaDemo,number][]=[['pix',45],['credito',30],['debito',15],['dinheiro',10]];
const SERVICOS:[string,number][]=[['Consulta',50],['Primeira consulta',32],['Escleroterapia (sessão)',18]];
export const VALORES:Record<string,number>={'Consulta':470,'Primeira consulta':630,'Escleroterapia (sessão)':350,'Cirurgia a laser':2400};

/** Business days from the 1st of the previous month up to yesterday (AAAA-MM-DD). */
export function diasUteis(hoje:string){
 const [y,m]=hoje.split('-').map(Number) as [number,number];
 const ini=new Date(Date.UTC(m===1?y-1:y,m===1?11:m-2,1));const fim=new Date(`${hoje}T00:00:00Z`);
 const out:string[]=[];for(const d=ini;d<fim;d.setUTCDate(d.getUTCDate()+1)){const w=d.getUTCDay();if(w>0&&w<6)out.push(d.toISOString().slice(0,10));}
 return out;
}

/** 8–12 appointments; at most one laser surgery on ~30% of days (≈1–2 per week). Patient+service pairs never repeat in a day. */
export function planoDia(dia:string,pacientes:string[]):LinhaDemo[]{
 const r=rng(dia);const n=8+Math.floor(r()*5);const usados=new Set<string>();const out:LinhaDemo[]=[];
 const laser=r()<0.3;
 for(let i=0;out.length<n&&i<200;i++){
  const servico=laser&&out.length===0?'Cirurgia a laser':pick(r,SERVICOS);
  const paciente=pacientes[Math.floor(r()*pacientes.length)];if(!paciente)break;
  const k=`${paciente}|${servico}`;if(usados.has(k))continue;usados.add(k);
  out.push({paciente,servico,valor:VALORES[servico]!,forma:pick(r,FORMAS)});
 }
 return out;
}
