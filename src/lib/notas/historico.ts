// Pure monthly-history rules: aggregation, export file names, audit summaries. Shared by server and screens.
import {slugNome} from './envio/regras';

export type LinhaHistorico={id:string;numero:string|null;chave:string|null;status:string;valor:number;aliquota:number|null;data:string;emitida_em:string|null;
 paciente:string;cpf:string|null;servico:string;descricao:string|null;medico:string;forma:string|null;motivo:string|null;substituta:string|null;envio:string;c_trib_nac:string|null;nbs:string|null};
export type Quebra={chave:string;quantidade:number;valor:number};

export const formaLabel:Record<string,string>={pix:'Pix',credito:'Crédito',debito:'Débito',dinheiro:'Dinheiro',outro:'Outro'};
export const ehCancelada=(s:string)=>s==='cancelada'||s==='substituida';
const r2=(n:number)=>Math.round(n*100)/100;

export function competenciaValida(c:string){return /^\d{4}-(0[1-9]|1[0-2])$/.test(c);}
export function deslocarCompetencia(c:string,n:number){const [y,m]=c.split('-').map(Number);const d=new Date(Date.UTC(y!,m!-1+n,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
export function intervaloCompetencia(c:string){const prox=deslocarCompetencia(c,1);const fim=new Date(Date.UTC(Number(prox.slice(0,4)),Number(prox.slice(5,7))-1,0));return {de:`${c}-01`,ate:fim.toISOString().slice(0,10),dias:fim.getUTCDate()};}

function quebrar(rows:LinhaHistorico[],k:(r:LinhaHistorico)=>string):Quebra[]{
 const m=new Map<string,Quebra>();for(const r of rows){const c=k(r);const q=m.get(c)??{chave:c,quantidade:0,valor:0};q.quantidade++;q.valor=r2(q.valor+r.valor);m.set(c,q);}
 return [...m.values()].sort((a,b)=>b.valor-a.valor);
}
/** Totals only count authorized notes; cancelled/substituted are reported apart. Tax estimate = valor × alíquota% do Simples usada. */
export function resumirHistorico(rows:LinhaHistorico[],competencia:string){
 const ok=rows.filter(r=>r.status==='autorizada');const canc=rows.filter(r=>ehCancelada(r.status));
 const total=r2(ok.reduce((s,r)=>s+r.valor,0));
 const {dias}=intervaloCompetencia(competencia);
 const porDia=Array.from({length:dias},(_,i)=>{const d=`${competencia}-${String(i+1).padStart(2,'0')}`;const v=ok.filter(r=>r.data===d);return {dia:i+1,quantidade:v.length,valor:r2(v.reduce((s,r)=>s+r.valor,0))};});
 const aliqs=[...new Set(ok.map(r=>r.aliquota).filter((a):a is number=>a!=null))];
 return {emitidas:ok.length,total,ticket:ok.length?r2(total/ok.length):0,canceladas:{quantidade:canc.length,valor:r2(canc.reduce((s,r)=>s+r.valor,0))},
  tributos:r2(ok.reduce((s,r)=>s+r.valor*(r.aliquota??0)/100,0)),aliquotas:aliqs,
  porMedico:quebrar(ok,r=>r.medico||'Sem médico'),porServico:quebrar(ok,r=>r.servico||'Sem serviço'),porForma:quebrar(ok,r=>formaLabel[r.forma??'']??'Não informada'),porDia};
}
export function variacao(atual:number,anterior:number):number|null{if(!anterior)return null;return Math.round((atual-anterior)/anterior*1000)/10;}

export function nomeExportacao(competencia:string,modo:string,ext:string){return `Notas_BNaves_${competencia}${modo==='mock'?'_DEMONSTRACAO':''}.${ext}`;}
export function nomeArquivoNota(numero:string|null,paciente:string,ext:'pdf'|'xml'){return `NFSe_${numero??'sem-numero'}_${slugNome(paciente)}.${ext}`;}

export const dataBR=(iso:string|null|undefined)=>{if(!iso)return '';const [y,m,d]=iso.slice(0,10).split('-');return `${d}/${m}/${y}`;};
const csvCampo=(v:unknown)=>{const s=v==null?'':String(v);return /[;"\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
export function paraCSV(cab:string[],linhas:unknown[][]){return '\uFEFF'+[cab,...linhas].map(l=>l.map(csvCampo).join(';')).join('\r\n');}
export const valorCSV=(n:number)=>n.toFixed(2).replace('.',',');

// ---- Audit trail ----
export const acoesAuditoria:Record<string,string>={
 ok_pagamento:'marcou como pago',desfazer_ok_pagamento:'desfez o ok de pagamento',forma_pagamento:'alterou a forma de pagamento',liberar_autorizacao:'liberou a autorização',
 marcar_sem_nota:'marcou como convênio / sem nota',editar:'editou',criar:'criou',excluir:'excluiu',transicionar_status:'mudou o status',importar:'importou atendimentos',
 adicionar_alias:'adicionou apelido do ProntMed',aprovar_lote:'aprovou o lote',aprovar_emitir:'aprovou para emissão',nota_autorizada:'teve a nota autorizada',
 cancelar_nota:'cancelou a nota',reemitir_nota:'reemitiu a nota corrigida',tentar_de_novo:'tentou emitir de novo',falha:'registrou falha na emissão',
 enviar_nota:'enviou a nota',envio_sem_contato:'tentou enviar (sem contato)',gerar_link_paciente:'gerou link seguro',atualizar_contato:'atualizou o contato',
 alterar_envio_automatico:'alterou o envio automático',alterar_modo_emissor:'alterou o modo do emissor',registrar_validacao_contador:'registrou a validação do contador',
 nova_versao:'criou nova versão do parâmetro fiscal',email_teste:'enviou e-mail de teste',limpar_dados_demo:'limpou os dados de demonstração',exportacao_mes:'exportou o mês',
};
export const entidadesAuditoria:Record<string,string>={nf_atendimentos:'atendimento',nf_notas:'nota',nf_pacientes:'paciente',nf_lotes:'lote',nf_emitente:'emitente',nf_servicos:'serviço',
 nf_medicos:'médico',nf_operadores:'operador',nf_regras_especiais:'regra especial',nf_aliquota_mes:'alíquota do mês',nf_parametros_fiscais:'parâmetro fiscal',nf_textos_envio:'texto de envio',nf_importacoes:'importação',nf_envios:'envio'};
export const rotuloAcao=(a:string)=>acoesAuditoria[a]??a.replace(/_/g,' ');
export const abreviarNome=(n:string|null|undefined)=>{const p=(n??'').trim().split(/\s+/).filter(Boolean);if(!p.length)return '';return p.length===1?p[0]!:`${p[0]} ${p[p.length-1]![0]}.`;};
const moeda=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
type Obj=Record<string,unknown>;
/** "Marli marcou como pago o atendimento de Maria S. — Pix — R$ 630,00" */
export function resumoAuditoria(e:{operador:string|null;acao:string;entidade:string;antes:unknown;depois:unknown;contexto?:{paciente?:string|null;valor?:number|null;forma?:string|null;numero?:string|null}|null}){
 const quem=e.operador??'Alguém';const ent=entidadesAuditoria[e.entidade]??e.entidade;const c=e.contexto??{};const d=(e.depois&&typeof e.depois==='object'?e.depois:{}) as Obj;
 const alvo=c.paciente?`${e.entidade==='nf_notas'?(c.numero?`nº ${c.numero} `:''):''}de ${abreviarNome(c.paciente)}`:'';
 if(e.acao==='exportacao_mes')return `${quem} exportou ${String(d['tipo']??'arquivo').toUpperCase()} da competência ${String(d['competencia']??'')}`;
 const partes=[`${quem} ${rotuloAcao(e.acao)} ${e.entidade==='nf_emitente'||e.acao==='limpar_dados_demo'?'':`o${ent==='nota'||ent==='regra especial'||ent==='alíquota do mês'||ent==='importação'?'a':''} ${ent}`}${alvo?' '+alvo:''}`.replace(/\s+/g,' ').trim()];
 const forma=(d['forma_pagamento'] as string|undefined)??c.forma;if(forma&&['ok_pagamento','forma_pagamento'].includes(e.acao))partes.push(formaLabel[forma]??forma);
 if(c.valor!=null&&e.entidade==='nf_atendimentos'||c.valor!=null&&e.entidade==='nf_notas')partes.push(moeda(c.valor!));
 if(e.acao==='cancelar_nota'&&d['motivo'])partes.push(`motivo: ${String(d['motivo'])}`);
 return partes.join(' — ');
}

// ---- Sidebar counters ----
export function contarNotasAtencao(notas:{status:string;envios:{status:string;created_at:string}[]|null}[]){
 return notas.filter(n=>n.status==='erro'||n.status==='autorizada'&&[...(n.envios??[])].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]?.status==='sem_contato').length;
}
