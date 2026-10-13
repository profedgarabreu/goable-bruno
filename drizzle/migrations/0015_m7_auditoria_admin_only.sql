DROP POLICY IF EXISTS nf_auditoria_cons_select ON public.nf_auditoria;
CREATE POLICY nf_auditoria_cons_select ON public.nf_auditoria FOR SELECT TO authenticated
 USING (public.nf_has_role((SELECT auth.uid()), 'consultorio'::public.nf_papel) AND entidade = 'nf_parametros_fiscais' AND acao = 'nova_versao');