import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {exigirPapel,ok,okOne,okList,auditar,competenciaAtual} from './service.server';
import {avaliarChecklist,type EstadoChecklist} from './producao';

const op={operador_id:z.string().uuid().nullish()};
const CONVITE_DIAS=7;

export const prepararDemonstracao=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const {prepararDemo}=await import('./demo.server');
 const r=await prepararDemo(db);
 await auditar(db,data.operador_id,'preparar_demonstracao','nf_atendimentos',null,null,r);
 return r;
});

export const listarUsuarios=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const [{data:lista,error},roles,perfis,convites]=await Promise.all([supabaseAdmin.auth.admin.listUsers({perPage:200}),supabaseAdmin.from('user_roles').select('user_id,role'),supabaseAdmin.from('nf_perfis').select('user_id,nome'),db.from('nf_convites_acesso').select('email,papel,expira_em,criado_em').order('criado_em',{ascending:false})]);
 if(error){console.error('listarUsuarios',error);throw new Error('Não foi possível carregar os usuários.');}
 const papel=new Map(okList(roles).map(r=>[r.user_id,r.role]));const nome=new Map(okList(perfis).map(p=>[p.user_id,p.nome]));
 const agora=Date.now();
 return {
  eu:context.userId,
  usuarios:lista.users.map(u=>({id:u.id,email:u.email??'',nome:nome.get(u.id)??'',papel:papel.get(u.id)??null,ativo:!(u.banned_until&&new Date(u.banned_until).getTime()>agora),confirmado:!!u.email_confirmed_at,ultimo_acesso:u.last_sign_in_at??null})),
  convites:okList(convites).map(c=>({...c,expirado:new Date(c.expira_em).getTime()<agora})),
 };
});

export const convidarUsuario=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({email:z.string().trim().toLowerCase().email('Informe um e-mail válido.'),papel:z.enum(['consultorio','admin_goable']),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const expira=new Date(Date.now()+CONVITE_DIAS*86400000).toISOString();
 ok(await db.from('nf_convites_acesso').upsert({email:data.email,papel:data.papel,criado_por:context.userId,expira_em:expira,criado_em:new Date().toISOString()}));
 await auditar(db,data.operador_id,'convite_criado','nf_convites_acesso',data.email,null,{papel:data.papel,expira_em:expira});
 return {caminho:`/login?convite=${encodeURIComponent(data.email)}`,expira_em:expira};
});

export const revogarConvite=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({email:z.string().email(),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 ok(await db.from('nf_convites_acesso').delete().eq('email',data.email));
 await auditar(db,data.operador_id,'convite_revogado','nf_convites_acesso',data.email,null,null);
 return {ok:true};
});

export const definirUsuarioAtivo=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({user_id:z.string().uuid(),ativo:z.boolean(),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 if(data.user_id===context.userId)throw new Error('Você não pode desativar o seu próprio acesso.');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {error}=await supabaseAdmin.auth.admin.updateUserById(data.user_id,{ban_duration:data.ativo?'none':'876000h'});
 if(error){console.error('definirUsuarioAtivo',error);throw new Error('Não foi possível alterar o acesso agora.');}
 await auditar(db,data.operador_id,data.ativo?'usuario_reativado':'usuario_desativado','auth.users',data.user_id,null,null);
 return {ok:true};
});

async function estadoAtual(db:Parameters<typeof exigirPapel>[0]):Promise<EstadoChecklist>{
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const comp=competenciaAtual();
 const [emit,aliq,homolog,demoP,demoA,pend,teste,roles,usuarios]=await Promise.all([
  db.from('nf_emitente').select('*').single(),
  db.from('nf_aliquota_mes').select('informado_por').eq('competencia',comp).maybeSingle(),
  db.from('nf_notas').select('id',{count:'exact',head:true}).eq('ambiente','homologacao').eq('status','autorizada'),
  db.from('nf_pacientes').select('id',{count:'exact',head:true}).eq('demo',true),
  db.from('nf_atendimentos').select('id',{count:'exact',head:true}).eq('demo',true),
  db.from('pend_itens').select('id',{count:'exact',head:true}).eq('prioridade','bloqueia_producao').neq('status','resolvida'),
  db.from('nf_auditoria').select('id',{count:'exact',head:true}).eq('acao','email_teste').eq('depois->>status','enviado'),
  supabaseAdmin.from('user_roles').select('user_id').eq('role','consultorio'),
  supabaseAdmin.auth.admin.listUsers({perPage:200}),
 ]);
 const e=okOne(emit);const a=ok(aliq);const agora=Date.now();
 const ativos=new Set((usuarios.data?.users??[]).filter(u=>!(u.banned_until&&new Date(u.banned_until).getTime()>agora)).map(u=>u.id));
 const env=(k:string)=>!!process.env[k];
 return {
  cnpj:!!e.cnpj,inscricao:!!e.inscricao_municipal,validado:!!e.parametros_validados_em,competencia:comp,
  aliquota:a?{informado_por:a.informado_por}:null,
  focusHomologacao:env('FOCUS_NFE_TOKEN_HOMOLOGACAO'),notasHomologacao:homolog.count??0,webhook:env('FOCUS_WEBHOOK_SECRET'),focusProducao:env('FOCUS_NFE_TOKEN_PRODUCAO'),
  resend:env('RESEND_API_KEY'),remetente:!!e.email_remetente,emailTesteEnviado:(teste.count??0)>0,
  whatsapp:env('META_WA_TOKEN')&&env('META_WA_PHONE_ID')&&env('META_WA_TEMPLATE'),somenteEmail:e.whatsapp_somente_email,
  demo:(demoP.count??0)+(demoA.count??0),consultoriosAtivos:okList(roles).filter(r=>ativos.has(r.user_id)).length,essenciaisAbertas:pend.count??0,
  modo:e.emissor_modo,
 };
}

export const checklistProducao=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const estado=await estadoAtual(db);
 return {modo:estado.modo,somenteEmail:estado.somenteEmail,itens:avaliarChecklist(estado)};
});

export const definirSomenteEmail=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({valor:z.boolean(),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 ok(await db.from('nf_emitente').update({whatsapp_somente_email:data.valor}).eq('id',true));
 await auditar(db,data.operador_id,'somente_email','nf_emitente',null,null,{valor:data.valor});
 return {ok:true};
});

export const ativarProducao=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({confirmacao:z.literal('PRODUÇÃO'),...op})).handler(async({context,data})=>{
 const db=context.supabase;await exigirPapel(db,context.userId,true);
 const itens=avaliarChecklist(await estadoAtual(db));
 if(itens.some(i=>i.status!=='ok'))throw new Error('Ainda há itens pendentes no checklist de produção.');
 ok(await db.from('nf_emitente').update({emissor_modo:'producao'}).eq('id',true));
 await auditar(db,data.operador_id,'ativar_producao','nf_emitente',null,null,{modo:'producao'});
 return {ok:true};
});
