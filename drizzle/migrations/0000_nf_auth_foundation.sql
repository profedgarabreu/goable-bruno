CREATE TYPE public.nf_papel AS ENUM ('consultorio', 'admin_goable');
CREATE TABLE public.nf_perfis (user_id uuid PRIMARY KEY, nome text NOT NULL DEFAULT 'Consultório BNaves', criado_em timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.nf_perfis TO authenticated;
GRANT ALL ON public.nf_perfis TO service_role;
ALTER TABLE public.nf_perfis ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.nf_papel NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.nf_has_role(_user_id uuid, _role public.nf_papel) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;
REVOKE ALL ON FUNCTION public.nf_has_role(uuid, public.nf_papel) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nf_has_role(uuid, public.nf_papel) TO authenticated, service_role;
CREATE POLICY nf_perfis_read ON public.nf_perfis FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.nf_has_role((SELECT auth.uid()), 'admin_goable'));
CREATE POLICY nf_perfis_update ON public.nf_perfis FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR public.nf_has_role((SELECT auth.uid()), 'admin_goable')) WITH CHECK (user_id = (SELECT auth.uid()) OR public.nf_has_role((SELECT auth.uid()), 'admin_goable'));
CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.nf_has_role((SELECT auth.uid()), 'admin_goable'));
CREATE FUNCTION public.nf_signup_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT NOT EXISTS(SELECT 1 FROM public.nf_perfis); $$;
REVOKE ALL ON FUNCTION public.nf_signup_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nf_signup_open() TO anon, authenticated, service_role;
CREATE FUNCTION public.nf_guard_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(726314905);
  IF EXISTS(SELECT 1 FROM public.nf_perfis) AND COALESCE(NEW.raw_app_meta_data->>'nf_admin_created', 'false') <> 'true' THEN
    RAISE EXCEPTION 'O cadastro está fechado. Solicite acesso à administração Goable.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER nf_guard_signup BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.nf_guard_signup();
CREATE FUNCTION public.nf_create_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role public.nf_papel;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.nf_perfis) THEN _role := 'admin_goable'; ELSE _role := 'consultorio'; END IF;
  INSERT INTO public.nf_perfis(user_id, nome) VALUES(NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), 'Consultório BNaves'));
  INSERT INTO public.user_roles(user_id, role) VALUES(NEW.id, _role);
  RETURN NEW;
END; $$;
CREATE TRIGGER nf_create_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.nf_create_profile();
REVOKE ALL ON FUNCTION public.nf_guard_signup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_create_profile() FROM PUBLIC;
COMMENT ON TABLE public.user_roles IS 'Authorization source; roles never reside in editable nf_perfis. First account bootstraps Goable administration; later accounts require trusted server app_metadata.';