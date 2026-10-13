import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {exigirPapel,ok,okList,auditar,bloqueiosDe} from './service.server';
import {calcularBloqueios,competenciaDe,type StatusAtendimento} from './rules';
import {temBloqueioCadastro} from './importacao';

const op={operador_id:z.string().uuid().nullish()};
const id=z.string().uuid();
const forma=z.enum(['pix','credito','debito','dinheiro','outro']);
const travados:StatusAtendimento[]=['aprovado','emitindo','emitido','erro_emissao','enviado','erro_envio','cancelado'];

export const listarDia=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({data:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const [rows,aliq]=await Promise.all([
  db.from('nf_atendimentos').select('id,data_atendimento,created_at,status,valor,quantidade,forma_pagamento,convenio,aprovado_em,autorizacao_liberada,pago_ok_em,demo,servico_id,medico_id,paciente:nf_pacientes(*,regra:nf_regras_especiais(id,nome,aguarda_autorizacao,iss_retido,exige_declaracao,observacao,ativo)),servico:nf_servicos(id,nome,parametro_fiscal_id),medico:nf_medicos(id,nome),pago_por:nf_operadores!nf_atendimentos_pago_ok_por_fkey(nome)').eq('data_atendimento',data.data).order('created_at'),
  db.from('nf_aliquota_mes').select('aliquota_simples').eq('competencia',competenciaDe(data.data)).maybeSingle()]);
 const a=ok(aliq);
 return okList(rows).map(r=>({...r,valor:Number(r.valor),bloqueios:calcularBloqueios({atendimento:{data_atendimento:r.data_atendimento,valor:Number(r.valor),convenio:r.convenio,aprovado_em:r.aprovado_em,autorizacao_liberada:r.autorizacao_liberada},paciente:{cpf:r.paciente?.cpf??null,cep:r.paciente?.cep??null,logradouro:r.paciente?.logradouro??null,numero:r.paciente?.numero??null,municipio_ibge:r.paciente?.municipio_ibge??null},servico:r.servico,aliquotaDoMes:a?Number(a.aliquota_simples):null,regra:r.paciente?.regra??null})}));
});

async function mudar(db:Parameters<typeof auditar>[0],atId:string,de:StatusAtendimento,patch:Record<string,unknown>,operador:string|null|undefined,acao:string,extra?:Record<string,unknown>){
 const rows=okList(await db.from('nf_atendimentos').update(patch as never).eq('id',atId).eq('status',de).select('id'));
 if(!rows.length)throw new Error('O atendimento foi alterado por outra pessoa. Atualize e tente novamente.');
 await auditar(db,operador,acao,'nf_atendimentos',atId,{status:de},{...patch,...extra});
}

export const marcarPago=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_id:id,pago:z.boolean(),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const {atendimento:a,bloqueios}=await bloqueiosDe(db,data.atendimento_id);
 const full=ok(await db.from('nf_atendimentos').select('forma_pagamento,autorizacao_liberada,paciente:nf_pacientes(regra:nf_regras_especiais(aguarda_autorizacao,ativo))').eq('id',a.id).single());
 if(data.pago){
  if(!full.forma_pagamento)throw new Error('Informe a forma de pagamento antes de dar o ok.');
  if(a.status==='cadastro_pendente'||temBloqueioCadastro(bloqueios))throw new Error('Complete o cadastro antes de dar o ok de pagamento.');
  if(a.status!=='aguardando_pagamento'&&a.status!=='importado')throw new Error('Este atendimento não está aguardando pagamento.');
  const regra=full.paciente?.regra;const precisaAut=!!(regra?.ativo&&regra.aguarda_autorizacao&&!full.autorizacao_liberada);
  const novo:StatusAtendimento=precisaAut?'aguardando_autorizacao':'pago_ok';
  await mudar(db,a.id,a.status,{status:novo,pago_ok_por:data.operador_id??null,pago_ok_em:new Date().toISOString()},data.operador_id,'ok_pagamento');
  return {status:novo};
 }
 if(a.status!=='pago_ok'&&a.status!=='aguardando_autorizacao')throw new Error('Só é possível desfazer o ok antes da aprovação.');
 await mudar(db,a.id,a.status,{status:'aguardando_pagamento',pago_ok_por:null,pago_ok_em:null,autorizacao_liberada:false,liberado_por:null,liberado_em:null},data.operador_id,'desfazer_ok_pagamento');
 return {status:'aguardando_pagamento' as const};
});

export const atualizarForma=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_id:id,forma:forma.nullable(),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const a=ok(await db.from('nf_atendimentos').select('status,forma_pagamento').eq('id',data.atendimento_id).single());
 if(travados.includes(a.status as StatusAtendimento))throw new Error('Atendimento já aprovado: não pode ser alterado aqui.');
 if(!data.forma&&(a.status==='pago_ok'||a.status==='aguardando_autorizacao'))throw new Error('Desfaça o ok de pagamento antes de limpar a forma.');
 ok(await db.from('nf_atendimentos').update({forma_pagamento:data.forma}).eq('id',data.atendimento_id));
 await auditar(db,data.operador_id,'editar','nf_atendimentos',data.atendimento_id,{forma_pagamento:a.forma_pagamento},{forma_pagamento:data.forma});
 return {ok:true};
});

export const liberarAutorizacao=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_id:id,recebida:z.literal(true),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const a=ok(await db.from('nf_atendimentos').select('status').eq('id',data.atendimento_id).single());
 if(a.status!=='aguardando_autorizacao')throw new Error('Este atendimento não está aguardando autorização.');
 await mudar(db,data.atendimento_id,'aguardando_autorizacao',{status:'pago_ok',autorizacao_liberada:true,liberado_por:data.operador_id??null,liberado_em:new Date().toISOString()},data.operador_id,'liberar_autorizacao');
 return {status:'pago_ok' as const};
});

/** Re-evaluates registration blockers for the patient's open appointments (after editing the patient or the row). */
async function reavaliar(db:Parameters<typeof auditar>[0],atendimentoIds:string[],operador:string|null|undefined){
 const mudancas:{id:string;de:string;para:string}[]=[];
 for(const atId of atendimentoIds){const {atendimento:a,bloqueios}=await bloqueiosDe(db,atId);const cad=temBloqueioCadastro(bloqueios);
  let para:StatusAtendimento|null=null;
  if(a.status==='cadastro_pendente'&&!cad)para='aguardando_pagamento';
  else if((a.status==='aguardando_pagamento'||a.status==='importado')&&cad)para='cadastro_pendente';
  if(para){await mudar(db,a.id,a.status,{status:para},operador,'reavaliar_bloqueios',{bloqueios:bloqueios.map(b=>b.codigo)});mudancas.push({id:a.id,de:a.status,para});}}
 return mudancas;
}

export const reavaliarPaciente=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({paciente_id:id,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const ats=okList(await db.from('nf_atendimentos').select('id').eq('paciente_id',data.paciente_id).in('status',['importado','cadastro_pendente','aguardando_pagamento']));
 return reavaliar(db,ats.map(a=>a.id),data.operador_id);
});

export const editarAtendimento=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_id:id,valor:z.number().min(0).max(1_000_000),servico_id:id.nullable(),quantidade:z.number().int().min(1).max(20),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const antes=ok(await db.from('nf_atendimentos').select('status,valor,servico_id,quantidade').eq('id',data.atendimento_id).single());
 if(!['importado','cadastro_pendente','aguardando_pagamento','nao_gera_nota'].includes(antes.status))throw new Error('Desfaça o ok de pagamento antes de editar.');
 const r=await db.from('nf_atendimentos').update({valor:data.valor,servico_id:data.servico_id,quantidade:data.quantidade}).eq('id',data.atendimento_id);
 if(r.error?.code==='23505')throw new Error('Já existe um atendimento igual neste dia para este paciente.');ok(r);
 await auditar(db,data.operador_id,'editar','nf_atendimentos',data.atendimento_id,{valor:Number(antes.valor),servico_id:antes.servico_id,quantidade:antes.quantidade},{valor:data.valor,servico_id:data.servico_id,quantidade:data.quantidade});
 return {mudancas:await reavaliar(db,[data.atendimento_id],data.operador_id)};
});

export const marcarSemNota=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_id:id,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const a=ok(await db.from('nf_atendimentos').select('status').eq('id',data.atendimento_id).single());
 if(!['importado','cadastro_pendente','aguardando_pagamento','pago_ok','aguardando_autorizacao'].includes(a.status))throw new Error('Não é possível marcar este atendimento como sem nota.');
 await mudar(db,data.atendimento_id,a.status as StatusAtendimento,{status:'nao_gera_nota',convenio:true},data.operador_id,'marcar_sem_nota');
 return {ok:true};
});

export const excluirAtendimento=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({atendimento_id:id,...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId);
 const a=ok(await db.from('nf_atendimentos').select('*').eq('id',data.atendimento_id).single());
 if(travados.includes(a.status as StatusAtendimento))throw new Error('Atendimentos aprovados não podem ser excluídos.');
 const del=okList(await db.from('nf_atendimentos').delete().eq('id',data.atendimento_id).eq('status',a.status).select('id'));
 if(!del.length)throw new Error('Não foi possível excluir. Atualize e tente novamente.');
 await auditar(db,data.operador_id,'excluir','nf_atendimentos',data.atendimento_id,a,null);
 return {ok:true};
});
