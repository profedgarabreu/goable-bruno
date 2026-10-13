CREATE TABLE public.nf_convites_acesso (
  email text PRIMARY KEY,
  criado_por uuid NOT NULL,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nf_convites_acesso TO authenticated;
GRANT ALL ON public.nf_convites_acesso TO service_role;
ALTER TABLE public.nf_convites_acesso ENABLE ROW LEVEL SECURITY;
CREATE POLICY nf_convites_admin ON public.nf_convites_acesso FOR ALL TO authenticated USING (public.nf_has_role(auth.uid(),'admin_goable')) WITH CHECK (public.nf_has_role(auth.uid(),'admin_goable') AND criado_por = auth.uid());
CREATE OR REPLACE FUNCTION public.nf_guard_signup()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE convidado boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(726314905);
  IF NOT EXISTS(SELECT 1 FROM public.nf_perfis) THEN RETURN NEW; END IF;
  DELETE FROM public.nf_convites_acesso WHERE lower(email) = lower(NEW.email) AND expira_em > now() RETURNING true INTO convidado;
  IF COALESCE(convidado,false) OR COALESCE(NEW.raw_app_meta_data->>'nf_admin_created', 'false') = 'true' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'O cadastro está fechado. Solicite acesso à administração Goable.';
END; $function$;