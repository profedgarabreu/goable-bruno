ALTER TABLE public.nf_emitente ADD COLUMN IF NOT EXISTS envio_automatico boolean NOT NULL DEFAULT true;
ALTER TABLE public.nf_envios ADD COLUMN IF NOT EXISTS conteudo_renderizado text;
ALTER TABLE public.nf_envios ADD COLUMN IF NOT EXISTS assunto text;
ALTER TABLE public.nf_envios ADD COLUMN IF NOT EXISTS anexos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.nf_envios ADD COLUMN IF NOT EXISTS link_id uuid;
CREATE INDEX IF NOT EXISTS nf_envios_nota ON public.nf_envios(nota_id, created_at DESC);

CREATE TABLE public.nf_links_paciente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.nf_notas(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (length(token) >= 43),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  tentativas_falhas integer NOT NULL DEFAULT 0,
  acessado_em timestamptz,
  revogado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nf_links_paciente_nota ON public.nf_links_paciente(nota_id);
REVOKE ALL ON public.nf_links_paciente FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nf_links_paciente TO authenticated;
GRANT ALL ON public.nf_links_paciente TO service_role;
ALTER TABLE public.nf_links_paciente ENABLE ROW LEVEL SECURITY;
CREATE POLICY nf_links_paciente_admin ON public.nf_links_paciente FOR ALL TO authenticated USING (public.nf_has_role((SELECT auth.uid()), 'admin_goable')) WITH CHECK (public.nf_has_role((SELECT auth.uid()), 'admin_goable'));
CREATE POLICY nf_links_paciente_cons ON public.nf_links_paciente FOR ALL TO authenticated USING (public.nf_has_role((SELECT auth.uid()), 'consultorio')) WITH CHECK (public.nf_has_role((SELECT auth.uid()), 'consultorio'));
CREATE TRIGGER nf_links_paciente_updated_at BEFORE UPDATE ON public.nf_links_paciente FOR EACH ROW EXECUTE FUNCTION public.nf_set_updated_at();

-- Atomic CPF-prefix check for the public patient link (row lock serializes concurrent guesses). Service role only.
CREATE OR REPLACE FUNCTION public.nf_link_paciente_verificar(_token text, _digitos text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE l public.nf_links_paciente; cpf text; pdf text;
BEGIN
  SELECT * INTO l FROM public.nf_links_paciente WHERE token = _token FOR UPDATE;
  IF l.id IS NULL OR l.revogado OR l.expira_em < now() THEN RETURN jsonb_build_object('estado','expirado'); END IF;
  IF l.tentativas_falhas >= 5 THEN RETURN jsonb_build_object('estado','bloqueado'); END IF;
  SELECT regexp_replace(coalesce(p.cpf,''),'\D','','g'), n.pdf_path INTO cpf, pdf
    FROM public.nf_notas n JOIN public.nf_atendimentos a ON a.id = n.atendimento_id JOIN public.nf_pacientes p ON p.id = a.paciente_id
    WHERE n.id = l.nota_id AND n.status = 'autorizada';
  IF pdf IS NULL THEN RETURN jsonb_build_object('estado','expirado'); END IF;
  IF length(cpf) = 11 AND _digitos ~ '^\d{3}$' AND left(cpf,3) = _digitos THEN
    UPDATE public.nf_links_paciente SET acessado_em = now() WHERE id = l.id;
    RETURN jsonb_build_object('estado','liberado','pdf_path',pdf,'nota_id',l.nota_id);
  END IF;
  UPDATE public.nf_links_paciente SET tentativas_falhas = tentativas_falhas + 1 WHERE id = l.id;
  IF l.tentativas_falhas + 1 >= 5 THEN RETURN jsonb_build_object('estado','bloqueado'); END IF;
  RETURN jsonb_build_object('estado','incorreto','restantes', 5 - (l.tentativas_falhas + 1));
END; $$;
REVOKE ALL ON FUNCTION public.nf_link_paciente_verificar(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nf_link_paciente_verificar(text, text) TO service_role;