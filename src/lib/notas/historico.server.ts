import type {SupabaseClient} from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import type {Database} from '@/integrations/supabase/types';
import {ok,okList} from './service.server';
import {intervaloCompetencia,resumirHistorico,formaLabel,ehCancelada,type LinhaHistorico} from './historico';
type Db=SupabaseClient<Database>;
export type Filtros={medico_id?:string|null|undefined;servico_id?:string|null|undefined;forma?:string|null|undefined};

function situacaoEnvio(envios:{status:string;canal:string;created_at:string}[]){const e=[...envios].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];if(!e)return 'Não enviada';if(e.status==='sem_contato')return 'Sem contato';const c=e.canal==='email'?'E-mail':'WhatsApp';return `${c} · ${e.status==='erro'?'Erro':e.status==='simulado'?'Simulado':'Enviado'}`;}

/** Notes whose service date (competência) falls in the month, authorized + cancelled/substituted. */
export async function carregarMes(db:Db,competencia:string,f:Filtros):Promise<LinhaHistorico[]>{
 const {de,ate}=intervaloCompetencia(competencia);
 let q=db.from('nf_notas').select('id,numero,chave_acesso,status,emitida_em,aliquota_simples_usada,descricao_usada,motivo_cancelamento,substituida_por,parametro:nf_parametros_fiscais(c_trib_nac,nbs),atendimento:nf_atendimentos!inner(valor,data_atendimento,forma_pagamento,medico_id,servico_id,paciente:nf_pacientes(nome,cpf),servico:nf_servicos(nome),medico:nf_medicos(nome)),envios:nf_envios(status,canal,created_at)')
  .in('status',['autorizada','cancelada','substituida']).gte('atendimento.data_atendimento',de).lte('atendimento.data_atendimento',ate).order('numero').limit(5000);
 if(f.medico_id)q=q.eq('atendimento.medico_id',f.medico_id);
 if(f.servico_id)q=q.eq('atendimento.servico_id',f.servico_id);
 if(f.forma)q=q.eq('atendimento.forma_pagamento',f.forma as Database['public']['Enums']['nf_forma_pagamento']);
 const rows=okList(await q);
 const subIds=[...new Set(rows.map(r=>r.substituida_por).filter((x):x is string=>!!x))];
 const subs=subIds.length?new Map(okList(await db.from('nf_notas').select('id,numero').in('id',subIds)).map(s=>[s.id,s.numero])):new Map<string,string|null>();
 return rows.map(r=>{const a=r.atendimento!;return {id:r.id,numero:r.numero,chave:r.chave_acesso,status:r.status,valor:Number(a.valor),aliquota:r.aliquota_simples_usada==null?null:Number(r.aliquota_simples_usada),data:a.data_atendimento,emitida_em:r.emitida_em,
  paciente:a.paciente?.nome??'',cpf:a.paciente?.cpf??null,servico:a.servico?.nome??'',descricao:r.descricao_usada,medico:a.medico?.nome??'',forma:a.forma_pagamento,motivo:r.motivo_cancelamento,
  substituta:r.substituida_por?(subs.get(r.substituida_por)??'(sem número)'):null,envio:situacaoEnvio(r.envios??[]),c_trib_nac:r.parametro?.c_trib_nac??null,nbs:r.parametro?.nbs??null};})
  .sort((x,y)=>x.data.localeCompare(y.data)||(x.numero??'').localeCompare(y.numero??'',undefined,{numeric:true}));
}
export async function dadosEmitente(db:Db){return ok(await db.from('nf_emitente').select('razao_social,cnpj,emissor_modo').eq('id',true).maybeSingle());}

const MOEDA='"R$" #,##0.00;-"R$" #,##0.00';const DATA='dd/mm/yyyy';const PCT='0.00"%"';
const dt=(iso:string|null)=>{if(!iso)return null;const s=iso.slice(0,10);const [y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y!,m!-1,d!));};
const fmtCNPJ=(c:string|null)=>c&&c.length===14?c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):(c??'Não informado');
const fmtCPF=(c:string|null)=>c&&c.length===11?c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4'):(c??'');
const statusLabel:Record<string,string>={autorizada:'Autorizada',cancelada:'Cancelada',substituida:'Substituída'};

function formatar(ws:XLSX.WorkSheet,col:number,fmt:string,desde=1){const r=XLSX.utils.decode_range(ws['!ref']!);for(let i=desde;i<=r.e.r;i++){const c=ws[XLSX.utils.encode_cell({r:i,c:col})];if(c&&(c.t==='n'||c.t==='d'))c.z=fmt;}}

/** Accountant workbook: Resumo / Notas / Canceladas, numeric money cells with BRL format and real date cells. */
export function montarPlanilha(competencia:string,rows:LinhaHistorico[],emitente:{razao_social:string;cnpj:string|null}|null):Uint8Array{
 const s=resumirHistorico(rows,competencia);const wb=XLSX.utils.book_new();
 const [y,m]=competencia.split('-');
 const res:(string|number|null)[][]=[['Notas BNaves — Fechamento do mês'],[],['Competência',`${m}/${y}`],['Emitente',emitente?.razao_social??''],['CNPJ',fmtCNPJ(emitente?.cnpj??null)],
  ['Alíquota do Simples usada',s.aliquotas.length?s.aliquotas.map(a=>`${a.toFixed(2).replace('.',',')}%`).join(' / '):'—'],[],
  ['Notas emitidas',s.emitidas],['Valor total',s.total],['Ticket médio',s.ticket],['Canceladas (quantidade)',s.canceladas.quantidade],['Canceladas (valor)',s.canceladas.valor],['Valor aproximado de tributos (estimativa — conferir com o contador)',s.tributos],[]];
 const moedaLinhas:number[]=[8,9,11,12];
 for(const [titulo,q] of [['Por médico',s.porMedico],['Por serviço',s.porServico],['Por forma de pagamento',s.porForma]] as const){res.push([titulo,'Notas','Valor']);for(const x of q){res.push([x.chave,x.quantidade,x.valor]);}res.push([]);}
 const wr=XLSX.utils.aoa_to_sheet(res);
 for(const i of moedaLinhas){const c=wr[XLSX.utils.encode_cell({r:i,c:1})];if(c)c.z=MOEDA;}
 formatar(wr,2,MOEDA,14);wr['!cols']=[{wch:58},{wch:22},{wch:16}];
 XLSX.utils.book_append_sheet(wb,wr,'Resumo');
 const cabN=['Número','Chave de acesso','Data de competência','Data de emissão','Tomador','CPF','Serviço','Descrição','Médico','Forma de pagamento','Valor','Código de tributação nacional','NBS','Alíquota do Simples usada','Status','Motivo de cancelamento'];
 const wn=XLSX.utils.aoa_to_sheet([cabN,...rows.map(r=>[r.numero??'',r.chave??'',dt(r.data),dt(r.emitida_em),r.paciente,fmtCPF(r.cpf),r.servico,r.descricao??'',r.medico,formaLabel[r.forma??'']??'',r.valor,r.c_trib_nac??'',r.nbs??'',r.aliquota,statusLabel[r.status]??r.status,r.motivo??''])],{cellDates:true});
 formatar(wn,2,DATA);formatar(wn,3,DATA);formatar(wn,10,MOEDA);formatar(wn,13,PCT);
 wn['!cols']=[{wch:10},{wch:52},{wch:14},{wch:14},{wch:32},{wch:16},{wch:22},{wch:34},{wch:26},{wch:14},{wch:14},{wch:14},{wch:12},{wch:12},{wch:12},{wch:28}];
 wn['!autofilter']={ref:wn['!ref']!};
 XLSX.utils.book_append_sheet(wb,wn,'Notas');
 const canc=rows.filter(r=>ehCancelada(r.status));
 const wc=XLSX.utils.aoa_to_sheet([['Número','Data de competência','Tomador','CPF','Serviço','Valor','Status','Motivo','Nota substituta'],...canc.map(r=>[r.numero??'',dt(r.data),r.paciente,fmtCPF(r.cpf),r.servico,r.valor,statusLabel[r.status]??r.status,r.motivo??'',r.substituta??''])],{cellDates:true});
 formatar(wc,1,DATA);formatar(wc,5,MOEDA);wc['!cols']=[{wch:10},{wch:14},{wch:32},{wch:16},{wch:22},{wch:14},{wch:12},{wch:32},{wch:14}];
 XLSX.utils.book_append_sheet(wb,wc,'Canceladas');
 return new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
}
