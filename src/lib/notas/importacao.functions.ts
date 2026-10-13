import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {exigirPapel,ok,okList,auditar} from './service.server';
import {calcularBloqueios,competenciaDe,somenteDigitos,validarCPF} from './rules';
import {casarPaciente,casarServico,casarMedico,normalizarFormaPagamento,ehConvenio,parseValorBR,parseDataBR,marcarDuplicadas,statusInicial,type FormaPagamento} from './importacao';
import {extrairDoRelatorio} from './relatorio.server';

const op={operador_id:z.string().uuid().nullish()};
const dataISO=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const s=z.string().max(300).nullish();

export const buscarMapeamento=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({assinatura:z.string().min(1).max(2000)})).handler(async({context,data})=>{
 await exigirPapel(context.supabase,context.userId);
 const m=ok(await context.supabase.from('nf_mapeamentos_importacao').select('id,nome,colunas').eq('assinatura',data.assinatura).maybeSingle());
 if(m)ok(await context.supabase.from('nf_mapeamentos_importacao').update({ultimo_uso:new Date().toISOString()}).eq('id',m.id));
 return m as {id:string;nome:string;colunas:Record<string,string>}|null;
});

export const salvarMapeamento=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({nome:z.string().trim().min(1).max(120),assinatura:z.string().min(1).max(2000),colunas:z.record(z.string(),z.string().max(200))})).handler(async({context,data})=>{
 await exigirPapel(context.supabase,context.userId);
 ok(await context.supabase.from('nf_mapeamentos_importacao').upsert({nome:data.nome,assinatura:data.assinatura,colunas:data.colunas,ultimo_uso:new Date().toISOString()},{onConflict:'assinatura'}));
 return {ok:true};
});

/** Vision extraction of a ProntMed financial report (PDF or screenshot). The file is not stored here. */
export const extrairRelatorio=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({base64:z.string().min(100).max(14_000_000,'Arquivo muito grande (máx. 10 MB).'),mime:z.enum(['application/pdf','image/png','image/jpeg','image/webp'])})).handler(async({context,data})=>{
 await exigirPapel(context.supabase,context.userId);
 const key=process.env['LOVABLE_API_KEY'];if(!key)throw new Error('Leitura de relatório indisponível no momento.');
 return extrairDoRelatorio(data.base64,data.mime,key);
});

const linhaBruta=z.object({data:z.unknown().optional(),paciente:z.string().trim().min(1).max(200),cpf:s,procedimento:s,profissional:s,valor:z.unknown().optional(),forma_pagamento:s,convenio:s,quantidade:z.number().int().min(1).max(20).optional(),paciente_id:z.string().uuid().nullish(),servico_id:z.string().uuid().nullish(),medico_id:z.string().uuid().nullish()});
export type LinhaBruta=z.input<typeof linhaBruta>;

export const previaImportacao=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({data_ref:dataISO,linhas:z.array(linhaBruta).min(1).max(500)})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const [pac,serv,med]=await Promise.all([db.from('nf_pacientes').select('id,nome,cpf,regra_especial_id'),db.from('nf_servicos').select('id,nome,aliases_prontmed,valor_padrao,ativo,gera_nota').order('ordem'),db.from('nf_medicos').select('id,nome,nome_no_prontmed,ativo')]);
 const pacientes=okList(pac),servicos=okList(serv).map(x=>({...x,valor_padrao:x.valor_padrao==null?null:Number(x.valor_padrao)})),medicos=okList(med);
 const linhas=data.linhas.map((l,i)=>{
  const paciente=l.paciente_id?{estado:'encontrado' as const,id:l.paciente_id,nome:pacientes.find(p=>p.id===l.paciente_id)?.nome??l.paciente}:casarPaciente({paciente:l.paciente,cpf:l.cpf??null},pacientes);
  const servico=l.servico_id?servicos.find(x=>x.id===l.servico_id)??null:casarServico(l.procedimento,servicos);
  const medico=l.medico_id?{id:l.medico_id,casou:true}:casarMedico(l.profissional,medicos);
  const valor=parseValorBR(l.valor)??servico?.valor_padrao??0;
  const cpf=somenteDigitos(l.cpf);
  return {i,data_atendimento:parseDataBR(l.data,data.data_ref),paciente_nome:l.paciente.trim(),cpf:cpf&&validarCPF(cpf)?cpf:null,procedimento:l.procedimento??null,profissional:l.profissional??null,paciente,servico_id:servico?.id??null,servico_casou:!!servico,medico_id:medico.id,medico_casou:medico.casou,valor,quantidade:l.quantidade??1,forma_pagamento:normalizarFormaPagamento(l.forma_pagamento),forma_original:l.forma_pagamento??null,convenio:ehConvenio(l.convenio)};
 });
 const ids=[...new Set(linhas.flatMap(l=>l.paciente.estado==='encontrado'?[l.paciente.id]:[]))];const datas=[...new Set(linhas.map(l=>l.data_atendimento))];
 const existentes=ids.length?okList(await db.from('nf_atendimentos').select('data_atendimento,paciente_id,servico_id,valor,quantidade').in('paciente_id',ids).in('data_atendimento',datas)):[];
 const dup=marcarDuplicadas(linhas.map(l=>({...l,paciente_id:l.paciente.estado==='encontrado'?l.paciente.id:null})),existentes.map(e=>({...e,valor:Number(e.valor)})));
 return {linhas:linhas.map((l,k)=>({...l,duplicada:dup[k]!})),servicos:servicos.filter(x=>x.ativo).map(x=>({id:x.id,nome:x.nome,valor_padrao:x.valor_padrao})),medicos:medicos.filter(m=>m.ativo).map(m=>({id:m.id,nome:m.nome}))};
});

const linhaFinal=z.object({data_atendimento:dataISO,paciente_id:z.string().uuid().nullish(),novo_paciente:z.object({nome:z.string().trim().min(2).max(200),cpf:z.string().nullish()}).nullish(),servico_id:z.string().uuid().nullable(),lembrar_alias:z.string().trim().max(200).nullish(),medico_id:z.string().uuid().nullable(),valor:z.number().min(0).max(1_000_000),quantidade:z.number().int().min(1).max(20),forma_pagamento:z.enum(['pix','credito','debito','dinheiro','outro']).nullable(),convenio:z.boolean()});

export const confirmarImportacao=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({data_ref:dataISO,origem:z.enum(['planilha','relatorio_ia','manual']),arquivo_path:z.string().max(500).regex(/^\d{4}-\d{2}\/[\w.\-]+$/).nullish(),linhas_lidas:z.number().int().min(0),linhas:z.array(linhaFinal).max(500),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 // New patients (origin "importacao"); reuse one per normalized name within the same batch.
 const criados=new Map<string,string>();let pacientesNovos=0;
 for(const l of data.linhas){if(l.paciente_id||!l.novo_paciente)continue;const k=l.novo_paciente.nome.toLowerCase();if(criados.has(k))continue;
  const cpf=somenteDigitos(l.novo_paciente.cpf);
  const p=ok(await db.from('nf_pacientes').insert({nome:l.novo_paciente.nome,cpf:cpf&&validarCPF(cpf)?cpf:null,origem:'importacao'}).select('id').single());
  criados.set(k,p.id);pacientesNovos++;await auditar(db,data.operador_id,'criar','nf_pacientes',p.id,null,{nome:l.novo_paciente.nome,origem:'importacao'});}
 // "Remember this name": add alias to the chosen service.
 for(const l of data.linhas){if(!l.lembrar_alias||!l.servico_id)continue;const sv=ok(await db.from('nf_servicos').select('aliases_prontmed').eq('id',l.servico_id).single());
  if(!sv.aliases_prontmed.some(a=>a.toLowerCase()===l.lembrar_alias!.toLowerCase())){const novo=[...sv.aliases_prontmed,l.lembrar_alias];ok(await db.from('nf_servicos').update({aliases_prontmed:novo}).eq('id',l.servico_id));await auditar(db,data.operador_id,'adicionar_alias','nf_servicos',l.servico_id,{aliases_prontmed:sv.aliases_prontmed},{aliases_prontmed:novo});}}
 const ids=[...new Set(data.linhas.map(l=>l.paciente_id??criados.get(l.novo_paciente?.nome.toLowerCase()??'')).filter(Boolean) as string[])];
 const [pacs,servs,aliqs]=await Promise.all([db.from('nf_pacientes').select('id,cpf,cep,logradouro,numero,municipio_ibge,regra:nf_regras_especiais(nome,aguarda_autorizacao,ativo)').in('id',ids.length?ids:['00000000-0000-0000-0000-000000000000']),db.from('nf_servicos').select('id,parametro_fiscal_id'),db.from('nf_aliquota_mes').select('competencia,aliquota_simples')]);
 const pm=new Map(okList(pacs).map(p=>[p.id,p])),sm=new Map(okList(servs).map(x=>[x.id,x])),am=new Map(okList(aliqs).map(a=>[a.competencia,Number(a.aliquota_simples)]));
 const imp=ok(await db.from('nf_importacoes').insert({data_ref:data.data_ref,origem:data.origem,arquivo_path:data.arquivo_path??null,linhas_lidas:data.linhas_lidas,linhas_novas:0,operador_id:data.operador_id??null}).select('id').single());
 const rows=data.linhas.flatMap(l=>{const pid=l.paciente_id??criados.get(l.novo_paciente?.nome.toLowerCase()??'');if(!pid)return [];const p=pm.get(pid);
  const b=calcularBloqueios({atendimento:{data_atendimento:l.data_atendimento,valor:l.valor,convenio:l.convenio,aprovado_em:null},paciente:{cpf:p?.cpf??null,cep:p?.cep??null,logradouro:p?.logradouro??null,numero:p?.numero??null,municipio_ibge:p?.municipio_ibge??null},servico:l.servico_id?{parametro_fiscal_id:sm.get(l.servico_id)?.parametro_fiscal_id??null}:null,aliquotaDoMes:am.get(competenciaDe(l.data_atendimento))??null,regra:p?.regra??null});
  return [{importacao_id:imp.id,data_atendimento:l.data_atendimento,paciente_id:pid,medico_id:l.medico_id,servico_id:l.servico_id,quantidade:l.quantidade,valor:l.valor,forma_pagamento:l.forma_pagamento,convenio:l.convenio,status:statusInicial(l.convenio,b),hash_dedup:''}];});
 const inseridos=rows.length?okList(await db.from('nf_atendimentos').upsert(rows,{onConflict:'hash_dedup',ignoreDuplicates:true}).select('id,status')):[];
 const duplicadas=rows.length-inseridos.length;
 ok(await db.from('nf_importacoes').update({linhas_novas:inseridos.length,linhas_duplicadas:duplicadas}).eq('id',imp.id));
 await auditar(db,data.operador_id,'importar','nf_importacoes',imp.id,null,{origem:data.origem,linhas_lidas:data.linhas_lidas,novas:inseridos.length,duplicadas,pacientes_novos:pacientesNovos,arquivo:data.arquivo_path??null});
 const porStatus:Record<string,number>={};for(const r of inseridos)porStatus[r.status]=(porStatus[r.status]??0)+1;
 return {importacao_id:imp.id,novas:inseridos.length,duplicadas,pacientes_novos:pacientesNovos,porStatus};
});
