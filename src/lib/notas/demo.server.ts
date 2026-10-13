import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/integrations/supabase/types';
import {montarNota} from './nota';
import {chaveFicticia} from './emissor/mock';
import {competenciaDe,type Genero} from './rules';
import {planoDia,diasUteis,HIST_TAG} from './demo';
import {okList,ok,okOne} from './service.server';
type Db=SupabaseClient<Database>;

const D=(n:string)=>`d0000000-0000-0000-0000-0000000000${n}`;
const PACIENTES=[
 [D('01'),'Ana Lúcia Ferreira','10433218100','30130005','Avenida Afonso Pena','100','Centro','ana.demo1@exemplo.com','31988000000',false],
 [D('02'),'Carlos Eduardo Silva',null,'30160011','Rua da Bahia','137','Lourdes','carlos.demo2@exemplo.com','31988001111',false],
 [D('03'),'Maria Helena Costa','96001338914','30110017','Avenida do Contorno','174','Funcionários',null,'31988002222',false],
 [D('04'),'Paulo Roberto Almeida','08386379499','30160030','Rua Espírito Santo','211','Centro','paulo.demo4@exemplo.com','31988003333',true],
 [D('05'),'Beatriz Santos Oliveira','02654235114','30180001','Avenida Amazonas','248','Barro Preto','beatriz.demo5@exemplo.com','31988004444',false],
 [D('06'),'José Antônio Pereira','16155940789','30130150','Rua Pernambuco','285','Savassi',null,'31988005555',false],
 [D('07'),'Fernanda Lima Rocha','81618495950','30112020','Avenida Getúlio Vargas','322','Funcionários','fernanda.demo7@exemplo.com','31988006666',false],
 [D('08'),'Luiz Fernando Martins','31034131656','30130170','Rua Sergipe','359','Savassi',null,'31988007777',false],
 [D('09'),'Juliana Mendes Prado','47525534144','30140001','Avenida Brasil','396','Santa Efigênia','juliana.demo9@exemplo.com','31988008888',false],
 [D('0a'),'Ricardo Souza Campos','92832764851','30140090','Rua Gonçalves Dias','433','Lourdes','ricardo.demo10@exemplo.com','31988009999',false],
 [D('0b'),'Patrícia Gomes Duarte','35030564160','30170001','Avenida Álvares Cabral','470','Lourdes',null,'31988011110',false],
 [D('0c'),'Rodrigo Teixeira Lopes','39537672409','30160041','Rua Rio de Janeiro','507','Centro','rodrigo.demo12@exemplo.com','31988012221',false],
] as const;
// Today's ten demo appointments, as in the original seed: [patient, service, value, payment, convênio, status, time]
const HOJE:[string,string,number,string|null,boolean,string,string][]=[
 ['01','Consulta',470,'pix',false,'pago_ok','08:00'],['02','Primeira consulta',630,'credito',false,'cadastro_pendente','08:30'],
 ['03','Consulta',470,null,false,'aguardando_pagamento','09:00'],['04','Escleroterapia (sessão)',630,'pix',false,'aguardando_autorizacao','09:30'],
 ['05','Consulta',470,'dinheiro',false,'pago_ok','10:00'],['06','Primeira consulta',630,'credito',false,'pago_ok','10:30'],
 ['07','Consulta',470,null,false,'importado','11:00'],['08','Retorno',0,null,true,'nao_gera_nota','11:30'],
 ['09','Primeira consulta',630,'debito',false,'pago_ok','14:00'],['0a','Consulta',470,'pix',false,'pago_ok','14:30'],
];

const hojeSP=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export async function prepararDemo(db:Db){
 const hoje=hojeSP();
 const [regras,servicos,medicos,emit,param,aliqs,ops]=await Promise.all([
  db.from('nf_regras_especiais').select('*'),db.from('nf_servicos').select('*').eq('ativo',true),db.from('nf_medicos').select('id,nome').eq('ativo',true),
  db.from('nf_emitente').select('*').single(),db.from('nf_parametros_fiscais').select('*').eq('ativo',true).order('vigente_desde',{ascending:false}).limit(1).single(),
  db.from('nf_aliquota_mes').select('competencia,aliquota_simples'),db.from('nf_operadores').select('id').eq('ativo',true).order('ordem').limit(1)]);
 const e=okOne(emit);if(e.emissor_modo!=='mock')throw new Error('A demonstração só pode ser preparada no modo Demonstração.');
 const amagis=okList(regras).find(r=>r.nome==='AMAGIS');
 const srv=okList(servicos);const porNome=(n:string)=>srv.find(s=>s.nome===n);
 const medico=okList(medicos).find(m=>m.nome.includes('Bruno'))??okList(medicos)[0];
 const operador=okList(ops)[0]?.id??null;const parametro=okOne(param);
 const aliquota=new Map(okList(aliqs).map(a=>[a.competencia,Number(a.aliquota_simples)]));

 // 1. Patients (fixed ids → never duplicated).
 const pac=PACIENTES.map(([id,nome,cpf,cep,logradouro,numero,bairro,email,celular,regra])=>({id,nome,cpf,cep,logradouro,numero,bairro,municipio_ibge:'3106200',municipio_nome:'Belo Horizonte',uf:'MG',email,celular,regra_especial_id:regra?amagis?.id??null:null,origem:'importacao',demo:true}));
 const antes=okList(await db.from('nf_pacientes').select('id').in('id',pac.map(p=>p.id))).length;
 ok(await db.from('nf_pacientes').upsert(pac,{onConflict:'id',ignoreDuplicates:true}));
 const pacientes=okList(await db.from('nf_pacientes').select('*').eq('demo',true));
 const pmap=new Map(pacientes.map(p=>[p.id,p]));

 // 2. Today's ten: move the template rows to today if they have no notes, otherwise recreate.
 const base=okList(await db.from('nf_atendimentos').select('id,data_atendimento,notas:nf_notas(id)').eq('demo',true).like('observacao','Demo · %'));
 let hojeCriados=0;
 const mover=base.filter(b=>b.data_atendimento!==hoje&&!b.notas.length).map(b=>b.id);
 if(mover.length)ok(await db.from('nf_atendimentos').update({data_atendimento:hoje}).in('id',mover));
 if(!base.length){
  const rows=HOJE.map(([p,s,valor,forma,convenio,status,hora])=>({data_atendimento:hoje,paciente_id:D(p),medico_id:medico?.id??null,servico_id:porNome(s)?.id??null,quantidade:1,valor,forma_pagamento:forma as Database['public']['Enums']['nf_forma_pagamento']|null,convenio,status:status as Database['public']['Enums']['nf_status_atendimento'],observacao:`Demo · ${hora}`,demo:true})).filter(r=>pmap.has(r.paciente_id));
  hojeCriados=okList(await db.from('nf_atendimentos').insert(rows).select('id')).length;
 }

 // 3. History: previous month 1st → yesterday, business days only, skipped when the day already exists (idempotent).
 const dias=diasUteis(hoje);
 const existentes=new Set(okList(await db.from('nf_atendimentos').select('data_atendimento').eq('demo',true).eq('observacao',HIST_TAG).gte('data_atendimento',dias[0]??hoje)).map(r=>r.data_atendimento));
 const elegiveis=pacientes.filter(p=>p.cpf&&!p.cpf.endsWith('00')&&p.cep&&p.logradouro&&p.numero);
 let atendimentos=0,notas=0,envios=0;const novos=dias.filter(x=>!existentes.has(x));
 for(const dia of novos){
  const plano=planoDia(dia,elegiveis.map(p=>p.id));
  const linhas=plano.map(l=>{const s=porNome(l.servico)!;return {l,s,p:pmap.get(l.paciente)!};}).filter(x=>x.s);
  const ats=okList(await db.from('nf_atendimentos').insert(linhas.map(({l,s})=>({data_atendimento:dia,paciente_id:l.paciente,medico_id:medico?.id??null,servico_id:s.id,quantidade:1,valor:l.valor,forma_pagamento:l.forma,convenio:false,status:'enviado' as const,observacao:HIST_TAG,demo:true,pago_ok_por:operador,pago_ok_em:`${dia}T15:00:00-03:00`,aprovado_por:operador,aprovado_em:`${dia}T18:00:00-03:00`}))).select('id'));
  atendimentos+=ats.length;
  const numeros=await Promise.all(ats.map(()=>db.rpc('nf_mock_proximo_numero')));
  const aliq=aliquota.get(competenciaDe(dia))??11.8;
  const notasRows=ats.map((a,i)=>{const {l,s,p}=linhas[i]!;const ref=crypto.randomUUID();const regra=p.regra_especial_id?okList(regras).find(r=>r.id===p.regra_especial_id)??null:null;
   const payload=montarNota({atendimento:{data_atendimento:dia,valor:l.valor,quantidade:1},servico:{descricao_nota:s.descricao_nota,genero:s.genero as Genero},paciente:p,regra,emitente:e,parametro,aliquota:aliq,referencia:ref,ambiente:'mock'});
   return {atendimento_id:a.id,ambiente:'mock' as const,ref_externa:ref,status:'autorizada' as const,numero:String(numeros[i]?.data??''),chave_acesso:chaveFicticia(ref),emitida_em:`${dia}T18:${String(10+i).padStart(2,'0')}:00-03:00`,enviada_ao_emissor_em:`${dia}T18:00:00-03:00`,payload_enviado:payload as unknown as Json,parametro_fiscal_id:parametro.id,aliquota_simples_usada:aliq,descricao_usada:payload.servico.descricao};});
  const ns=okList(await db.from('nf_notas').insert(notasRows).select('id,atendimento_id'));notas+=ns.length;
  const env=ns.map((n,i)=>{const p=linhas[i]!.p;const email=!!p.email;return {nota_id:n.id,canal:(email?'email':'whatsapp') as 'email'|'whatsapp',destino:(email?p.email:p.celular)??'',status:'simulado',enviado_em:`${dia}T18:30:00-03:00`,assunto:email?'[DEMONSTRAÇÃO] Nota fiscal — BNaves':null,conteudo_renderizado:`Olá, ${p.nome.split(' ')[0]}. Sua nota fiscal do atendimento de ${dia.split('-').reverse().join('/')} está pronta. (demonstração)`,anexos:(email?[{nome:'NFSe.pdf'},{nome:'NFSe.xml'}]:[]) as Json};});
  envios+=okList(await db.from('nf_envios').insert(env).select('id')).length;
 }

 // 4. Exactly 2 cancelled and 1 replaced demo notes (only created once).
 const histNotas=okList(await db.from('nf_notas').select('id,status,atendimento_id,payload_enviado,parametro_fiscal_id,aliquota_simples_usada,descricao_usada,emitida_em,atendimento:nf_atendimentos!inner(demo,observacao,data_atendimento)').eq('atendimento.demo',true).eq('atendimento.observacao',HIST_TAG).order('emitida_em').limit(400));
 const canc=histNotas.filter(n=>n.status==='cancelada').length,subs=histNotas.filter(n=>n.status==='substituida').length;
 const livres=histNotas.filter(n=>n.status==='autorizada');
 const motivos=['CPF incorreto','Emitida em duplicidade'];
 for(let i=canc;i<2&&livres.length;i++){const n=livres.splice(3+i*5,1)[0]??livres.shift()!;
  ok(await db.from('nf_notas').update({status:'cancelada',cancelada_em:`${n.atendimento.data_atendimento}T19:00:00-03:00`,motivo_cancelamento:motivos[i]!}).eq('id',n.id));
  ok(await db.from('nf_atendimentos').update({status:'cancelado'}).eq('id',n.atendimento_id));}
 if(!subs&&livres.length){const n=livres.splice(Math.min(10,livres.length-1),1)[0]!;
  ok(await db.from('nf_notas').update({status:'substituida',motivo_cancelamento:'Valor incorreto'}).eq('id',n.id));
  const ref=crypto.randomUUID();const num=ok(await db.rpc('nf_mock_proximo_numero'));
  const payload={...(n.payload_enviado as Record<string,unknown>),referencia:ref} as Json;
  const nova=okOne(await db.from('nf_notas').insert({atendimento_id:n.atendimento_id,ambiente:'mock',ref_externa:ref,status:'autorizada',numero:String(num),chave_acesso:chaveFicticia(ref),emitida_em:`${n.atendimento.data_atendimento}T19:30:00-03:00`,payload_enviado:payload,parametro_fiscal_id:n.parametro_fiscal_id,aliquota_simples_usada:n.aliquota_simples_usada,descricao_usada:n.descricao_usada}).select('id').single());
  ok(await db.from('nf_notas').update({substituida_por:nova.id}).eq('id',n.id));notas++;}

 return {pacientes_criados:pac.length-antes,atendimentos_hoje_criados:hojeCriados,atendimentos_hoje_movidos:mover.length,dias_gerados:novos.length,dias_ja_existentes:dias.length-novos.length,atendimentos,notas,envios};
}
