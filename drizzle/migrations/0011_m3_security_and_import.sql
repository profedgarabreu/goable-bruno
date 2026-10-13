REVOKE ALL ON public.nf_convites_acesso FROM anon;
REVOKE ALL ON public.nf_textos_envio FROM anon;
DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE 'nf\_%' OR tablename LIKE 'pend\_%') LOOP EXECUTE format('REVOKE ALL ON public.%I FROM anon', t); END LOOP; END $$;
REVOKE EXECUTE ON FUNCTION public.nf_auditoria_autor() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nf_hoje() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nf_atendimento_hash() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nf_textos_touch() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nf_set_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nf_hoje() TO authenticated;

CREATE TABLE public.nf_admin_bootstrap (email text PRIMARY KEY);
GRANT ALL ON public.nf_admin_bootstrap TO service_role;
ALTER TABLE public.nf_admin_bootstrap ENABLE ROW LEVEL SECURITY;
INSERT INTO public.nf_admin_bootstrap(email) VALUES ('edgar@4ued.tech');

ALTER TABLE public.nf_convites_acesso ADD COLUMN papel public.nf_papel NOT NULL DEFAULT 'consultorio';

CREATE OR REPLACE FUNCTION public.nf_guard_signup()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(726314905);
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin_goable')
     AND EXISTS(SELECT 1 FROM public.nf_admin_bootstrap WHERE lower(email)=lower(NEW.email)) THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM public.nf_convites_acesso WHERE lower(email)=lower(NEW.email) AND expira_em>now()) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Acesso somente por convite.';
END; $function$;

CREATE OR REPLACE FUNCTION public.nf_create_profile()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _role public.nf_papel;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin_goable')
     AND EXISTS(SELECT 1 FROM public.nf_admin_bootstrap WHERE lower(email)=lower(NEW.email)) THEN _role := 'admin_goable';
  ELSE
    DELETE FROM public.nf_convites_acesso WHERE lower(email)=lower(NEW.email) AND expira_em>now() RETURNING papel INTO _role;
    IF _role IS NULL THEN RAISE EXCEPTION 'Acesso somente por convite.'; END IF;
  END IF;
  INSERT INTO public.nf_perfis(user_id, nome) VALUES(NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), 'Consultório BNaves'));
  INSERT INTO public.user_roles(user_id, role) VALUES(NEW.id, _role);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.nf_signup_open()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin_goable'); $function$;

CREATE TABLE public.nf_mapeamentos_importacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  assinatura text NOT NULL UNIQUE,
  colunas jsonb NOT NULL,
  ultimo_uso timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.nf_mapeamentos_importacao TO authenticated;
GRANT ALL ON public.nf_mapeamentos_importacao TO service_role;
ALTER TABLE public.nf_mapeamentos_importacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY nf_map_rw ON public.nf_mapeamentos_importacao FOR ALL TO authenticated
 USING (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio'))
 WITH CHECK (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio'));

ALTER TABLE public.nf_atendimentos ADD COLUMN autorizacao_liberada boolean NOT NULL DEFAULT false;
ALTER TABLE public.nf_atendimentos ADD COLUMN liberado_por uuid REFERENCES public.nf_operadores(id);
ALTER TABLE public.nf_atendimentos ADD COLUMN liberado_em timestamptz;
ALTER TABLE public.nf_importacoes ADD COLUMN linhas_duplicadas integer NOT NULL DEFAULT 0;

CREATE POLICY nf_atendimentos_cons_delete ON public.nf_atendimentos FOR DELETE TO authenticated
 USING (public.nf_has_role(auth.uid(),'consultorio') AND status IN ('importado','cadastro_pendente','aguardando_pagamento','pago_ok','aguardando_autorizacao','nao_gera_nota'));
GRANT DELETE ON public.nf_atendimentos TO authenticated;

CREATE POLICY nf_importacoes_storage_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='importacoes' AND (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio')));
CREATE POLICY nf_importacoes_storage_select ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='importacoes' AND (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio')));