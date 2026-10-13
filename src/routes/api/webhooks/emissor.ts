import {createFileRoute} from '@tanstack/react-router';

import {verificarSegredoWebhook} from '@/lib/notas/webhook';

/** Issuer callback (Focus NFe). Requires X-Webhook-Secret = FOCUS_WEBHOOK_SECRET; 503 while unset. */
export const Route=createFileRoute('/api/webhooks/emissor')({
 server:{handlers:{
  POST:async({request})=>{
   const secret=process.env['FOCUS_WEBHOOK_SECRET'];
   const v=verificarSegredoWebhook(secret,request.headers.get('x-webhook-secret'));
   if(v!==200)return Response.json({erro:v===503?'Webhook não configurado.':'Não autorizado.'},{status:v});
   let body:Record<string,unknown>;try{body=await request.json();}catch{return Response.json({erro:'JSON inválido.'},{status:400});}
   const ref=String(body['ref']??body['referencia']??'');if(!/^[0-9a-f-]{36}$/i.test(ref))return Response.json({erro:'Referência inválida.'},{status:400});
   const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
   const {aplicarResultado,atualizarStatusLote}=await import('@/lib/notas/emissao.server');
   const {deFocus}=await import('@/lib/notas/emissor/focusMapper');
   const {data:nota}=await supabaseAdmin.from('nf_notas').select('id,lote_id,ambiente').eq('ref_externa',ref).maybeSingle();
   if(!nota||nota.ambiente==='mock')return Response.json({ok:true,ignorado:true});
   const auditar=async(acao:string,entidade:string,id:string|null,antes:unknown,depois:unknown)=>{await supabaseAdmin.from('nf_auditoria').insert({user_id:'00000000-0000-0000-0000-000000000000',operador_id:null,acao:`webhook_${acao}`,entidade,entidade_id:id,antes:antes as never,depois:depois as never});};
   try{await aplicarResultado(supabaseAdmin,nota.id,deFocus(body),auditar);if(nota.lote_id)await atualizarStatusLote(supabaseAdmin,nota.lote_id);}
   catch(e){console.error('webhook emissor',e instanceof Error?e.message:e);return Response.json({erro:'Falha ao processar.'},{status:500});}
   return Response.json({ok:true});
  },
 }},
});
