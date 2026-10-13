ALTER TABLE public.nf_emitente ADD COLUMN IF NOT EXISTS whatsapp_somente_email boolean NOT NULL DEFAULT false;
ALTER TABLE public.nf_convites_acesso ADD COLUMN IF NOT EXISTS criado_em timestamptz NOT NULL DEFAULT now();
REVOKE ALL ON public.nf_emitente, public.nf_convites_acesso FROM anon;