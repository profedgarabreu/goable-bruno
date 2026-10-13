import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
export const createClinicUser=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({email:z.string().email(),nome:z.string().min(2),password:z.string().min(8)})).handler(async({context,data})=>{
 const {data:allowed,error}=await context.supabase.rpc('nf_has_role',{_user_id:context.userId,_role:'admin_goable'});
 if(error||!allowed)throw new Error('Somente a administração Goable pode criar acessos.');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {error:creationError}=await supabaseAdmin.auth.admin.createUser({email:data.email,password:data.password,email_confirm:false,user_metadata:{nome:data.nome},app_metadata:{nf_admin_created:true}});
 if(creationError)return {ok:false,message:'Não foi possível criar o acesso. Confira se o e-mail já está cadastrado.'};
 const {error:inviteError}=await supabaseAdmin.auth.admin.generateLink({type:'signup',email:data.email,password:data.password});
 // Account confirmation is still required. Confirmation mail is requested through the public resend flow.
 if(inviteError) return {ok:true,message:'Acesso criado. A confirmação do e-mail deve ser solicitada na tela de login.'};
 return {ok:true,message:'Acesso criado. Solicite a confirmação do e-mail na tela de login.'};
});
