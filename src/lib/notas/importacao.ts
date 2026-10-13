// Pure import rules: normalization, matching and initial status. Shared by server functions and tests.
import {chaveDedup,somenteDigitos,validarCPF,type Bloqueio,type StatusAtendimento} from './rules';

export type FormaPagamento='pix'|'credito'|'debito'|'dinheiro'|'outro';
export const formasPagamento:{value:FormaPagamento;label:string}[]=[{value:'pix',label:'Pix'},{value:'credito',label:'Crédito'},{value:'debito',label:'Débito'},{value:'dinheiro',label:'Dinheiro'},{value:'outro',label:'Outro'}];

export const normalizarTexto=(s:string|null|undefined)=>(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export function normalizarFormaPagamento(v:string|null|undefined):FormaPagamento|null{
 const t=normalizarTexto(v);if(!t)return null;
 if(/\bpix\b/.test(t))return 'pix';
 if(/credito/.test(t))return 'credito';
 if(/debito/.test(t))return 'debito';
 if(/dinheiro|especie/.test(t))return 'dinheiro';
 return 'outro';
}

/** "Particular" (or empty) = private; anything else (UNIMED, convênio…) = insurance. */
export function ehConvenio(v:string|null|undefined){const t=normalizarTexto(v);return !!t&&!/^(particular|nao|n|privado)$/.test(t);}

export function parseValorBR(v:unknown):number|null{
 if(typeof v==='number')return Number.isFinite(v)?Math.round(v*100)/100:null;
 const s=String(v??'').replace(/r\$|\s/gi,'');if(!s)return null;
 const n=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);return Number.isFinite(n)?Math.round(n*100)/100:null;
}
export function parseDataBR(v:unknown,padrao:string):string{
 if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10);}
 const s=String(v??'').trim();let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
 if(m){const y=m[3]!.length===2?`20${m[3]}`:m[3];return `${y}-${m[2]!.padStart(2,'0')}-${m[1]!.padStart(2,'0')}`;}
 m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:padrao;
}

/** Dice coefficient over character bigrams of normalized names (0..1). */
export function similaridadeNome(a:string,b:string){
 const x=normalizarTexto(a).replace(/ /g,''),y=normalizarTexto(b).replace(/ /g,'');
 if(!x||!y)return 0;if(x===y)return 1;if(x.length<2||y.length<2)return 0;
 const big=(s:string)=>{const m=new Map<string,number>();for(let i=0;i<s.length-1;i++){const k=s.slice(i,i+2);m.set(k,(m.get(k)??0)+1);}return m;};
 const A=big(x),B=big(y);let inter=0;for(const [k,n] of A)inter+=Math.min(n,B.get(k)??0);
 return (2*inter)/(x.length-1+y.length-1);
}

export type PacienteRef={id:string;nome:string;cpf:string|null};
export type CasamentoPaciente={estado:'encontrado';id:string;nome:string}|{estado:'possivel';candidatos:{id:string;nome:string;score:number}[]}|{estado:'novo'};
export function casarPaciente(linha:{paciente:string;cpf?:string|null},pacientes:PacienteRef[]):CasamentoPaciente{
 const cpf=somenteDigitos(linha.cpf);
 if(cpf&&validarCPF(cpf)){const p=pacientes.find(x=>x.cpf===cpf);if(p)return {estado:'encontrado',id:p.id,nome:p.nome};}
 const alvo=normalizarTexto(linha.paciente);
 const exato=pacientes.filter(x=>normalizarTexto(x.nome)===alvo);
 if(exato.length===1)return {estado:'encontrado',id:exato[0]!.id,nome:exato[0]!.nome};
 const candidatos=pacientes.map(p=>({id:p.id,nome:p.nome,score:similaridadeNome(p.nome,linha.paciente)})).filter(c=>c.score>=0.75).sort((a,b)=>b.score-a.score).slice(0,5);
 return candidatos.length?{estado:'possivel',candidatos}:{estado:'novo'};
}

export type ServicoRef={id:string;nome:string;aliases_prontmed:string[];valor_padrao:number|null;ativo:boolean};
export function casarServico(procedimento:string|null|undefined,servicos:ServicoRef[]):ServicoRef|null{
 const t=normalizarTexto(procedimento);if(!t)return null;
 const ativos=servicos.filter(s=>s.ativo);
 return ativos.find(s=>s.aliases_prontmed.some(a=>normalizarTexto(a)===t))??ativos.find(s=>normalizarTexto(s.nome)===t)??null;
}
export type MedicoRef={id:string;nome:string;nome_no_prontmed:string|null;ativo:boolean};
export function casarMedico(profissional:string|null|undefined,medicos:MedicoRef[]):{id:string|null;casou:boolean}{
 const t=normalizarTexto(profissional);const ativos=medicos.filter(m=>m.ativo);
 const m=t?ativos.find(x=>normalizarTexto(x.nome_no_prontmed)===t||normalizarTexto(x.nome).includes(t)||t.includes(normalizarTexto(x.nome_no_prontmed)||'@')):undefined;
 if(m)return {id:m.id,casou:true};
 const padrao=ativos.find(x=>/bruno/i.test(x.nome))??ativos[0];return {id:padrao?.id??null,casou:false};
}

const codigosCadastro=new Set<Bloqueio['codigo']>(['cpf_ausente','cpf_invalido','endereco_incompleto','servico_ausente','servico_sem_parametro','valor_invalido']);
export const temBloqueioCadastro=(b:Bloqueio[])=>b.some(x=>codigosCadastro.has(x.codigo));
/** Initial status of an imported row. Payment is never confirmed automatically. */
export function statusInicial(convenio:boolean,bloqueios:Bloqueio[]):StatusAtendimento{
 if(convenio)return 'nao_gera_nota';
 if(temBloqueioCadastro(bloqueios))return 'cadastro_pendente';
 return 'aguardando_pagamento';
}

/** Rows whose dedup key already exists are reported as already imported. */
export function marcarDuplicadas<T extends {data_atendimento:string;paciente_id:string|null;servico_id:string|null;valor:number;quantidade:number}>(linhas:T[],existentes:{data_atendimento:string;paciente_id:string;servico_id:string|null;valor:number;quantidade:number}[]){
 const vistos=new Set(existentes.map(e=>chaveDedup({...e,valor:Number(e.valor)})));
 return linhas.map(l=>{if(!l.paciente_id)return false;const k=chaveDedup({...l,paciente_id:l.paciente_id});if(vistos.has(k))return true;vistos.add(k);return false;});
}

export const camposMapeamento=[['data','Data'],['paciente','Paciente (nome)'],['cpf','CPF'],['procedimento','Procedimento / tipo de atendimento'],['profissional','Médico / profissional'],['valor','Valor'],['forma_pagamento','Forma de pagamento'],['convenio','Convênio / particular']] as const;
export type CampoMapa=(typeof camposMapeamento)[number][0];
export const assinaturaCabecalho=(h:string[])=>h.map(normalizarTexto).join('|');
export function adivinharMapeamento(h:string[]):Partial<Record<CampoMapa,string>>{
 const r:Partial<Record<CampoMapa,string>>={};const regras:[CampoMapa,RegExp][]=[['data',/^data/],['paciente',/paciente|nome/],['cpf',/cpf/],['procedimento',/procedimento|tipo de atendimento|servico|atendimento/],['profissional',/profissional|medico|doutor/],['valor',/valor|total/],['forma_pagamento',/pagamento|forma/],['convenio',/convenio|particular|plano/]];
 for(const [c,re] of regras){const col=h.find(x=>re.test(normalizarTexto(x))&&!Object.values(r).includes(x));if(col)r[c]=col;}
 return r;
}
