import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/integrations/supabase/types';
import {calcularBloqueios,competenciaDe,type StatusAtendimento} from './rules';
type Db=SupabaseClient<Database>;
export async function exigirPapel(db:Db,userId:string,somenteAdmin=false){
 const [{data:admin},{data:cons}]=await Promise.all([db.rpc('nf_has_role',{_user_id:userId,_role:'admin_goable'}),somenteAdmin?Promise.resolve({data:false}):db.rpc('nf_has_role',{_user_id:userId,_role:'consultorio'})]);
 if(admin===true)return 'admin_goable' as const;
 if(!somenteAdmin&&cons===true)return 'consultorio' as const;
 throw new Error(somenteAdmin?'Somente a administração Goable pode fazer isso.':'Acesso não autorizado.');
}
export function ok<T>(r:{data:T;error:{message:string}|null}):T{if(r.error)throw new Error(r.error.message);return r.data;}
export function okList<T>(r:{data:T[]|null;error:{message:string}|null}):T[]{if(r.error)throw new Error(r.error.message);return r.data??[];}
export async function auditar(db:Db,operadorId:string|null|undefined,acao:string,entidade:string,id:string|null,antes:unknown,depois:unknown){
 ok(await db.from('nf_auditoria').insert({operador_id:operadorId??null,acao,entidade,entidade_id:id,antes:(antes??null) as Json,depois:(depois??null) as Json}));
}
export function competenciaAtual(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());}
export async function configFiscal(db:Db){
 const competencia=competenciaAtual();
 const [emitente,parametro,aliquota]=await Promise.all([db.from('nf_emitente').select('*').maybeSingle(),db.from('nf_parametros_fiscais').select('*').eq('ativo',true).order('vigente_desde',{ascending:false}).limit(1).maybeSingle(),db.from('nf_aliquota_mes').select('*').eq('competencia',competencia).maybeSingle()]);
 const e=ok(emitente);
 return {competencia,emitente:e,parametro:ok(parametro),aliquota:ok(aliquota),producaoLiberada:!!(e?.cnpj&&e.parametros_validados_em)};
}
export async function bloqueiosDe(db:Db,atendimentoId:string){
 const a=ok(await db.from('nf_atendimentos').select('id,status,data_atendimento,valor,convenio,aprovado_em,servico_id,paciente:nf_pacientes(cpf,cep,logradouro,numero,municipio_ibge,regra:nf_regras_especiais(nome,aguarda_autorizacao,ativo)),servico:nf_servicos(parametro_fiscal_id)').eq('id',atendimentoId).maybeSingle());
 if(!a)throw new Error('Atendimento não encontrado.');
 const aliq=ok(await db.from('nf_aliquota_mes').select('aliquota_simples').eq('competencia',competenciaDe(a.data_atendimento)).maybeSingle());
 const p=a.paciente;
 const bloqueios=calcularBloqueios({atendimento:{data_atendimento:a.data_atendimento,valor:Number(a.valor),convenio:a.convenio,aprovado_em:a.aprovado_em},paciente:{cpf:p?.cpf??null,cep:p?.cep??null,logradouro:p?.logradouro??null,numero:p?.numero??null,municipio_ibge:p?.municipio_ibge??null},servico:a.servico,aliquotaDoMes:aliq?Number(aliq.aliquota_simples):null,regra:p?.regra??null});
 return {atendimento:a as typeof a & {status:StatusAtendimento},bloqueios};
}
