CREATE TABLE public.nf_textos_envio (
  chave text PRIMARY KEY CHECK (chave IN ('email_assunto','email_corpo','whatsapp')),
  conteudo text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.nf_textos_envio TO authenticated;
GRANT ALL ON public.nf_textos_envio TO service_role;
ALTER TABLE public.nf_textos_envio ENABLE ROW LEVEL SECURITY;
CREATE POLICY nf_textos_envio_select ON public.nf_textos_envio FOR SELECT TO authenticated USING (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio'));
CREATE POLICY nf_textos_envio_insert ON public.nf_textos_envio FOR INSERT TO authenticated WITH CHECK (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio'));
CREATE POLICY nf_textos_envio_update ON public.nf_textos_envio FOR UPDATE TO authenticated USING (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio')) WITH CHECK (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio'));
CREATE POLICY nf_textos_envio_delete ON public.nf_textos_envio FOR DELETE TO authenticated USING (public.nf_has_role(auth.uid(),'admin_goable'));
CREATE OR REPLACE FUNCTION public.nf_textos_touch() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN NEW.atualizado_em := now(); RETURN NEW; END; $$;
CREATE TRIGGER nf_textos_envio_touch BEFORE UPDATE ON public.nf_textos_envio FOR EACH ROW EXECUTE FUNCTION public.nf_textos_touch();
INSERT INTO public.nf_textos_envio(chave, conteudo) VALUES
('email_assunto', 'Sua nota fiscal — {{consultorio}}'),
('email_corpo', E'Olá, {{nome}}!\n\nObrigado pela confiança em nosso consultório. Segue o link para a nota fiscal do seu atendimento de {{data}}, no valor de {{valor}}:\n\n{{link}}\n\nEnviamos a nota por e-mail para proteger os seus dados de saúde: assim ela chega só até você, sem passar por canais menos seguros.\n\nQualquer dúvida, é só responder esta mensagem.\n\nCom carinho,\n{{consultorio}}'),
('whatsapp', E'Olá, {{nome}}! Aqui é do {{consultorio}}. A nota fiscal do seu atendimento de {{data}} ({{valor}}) está disponível neste link seguro, válido por 7 dias: {{link}}');