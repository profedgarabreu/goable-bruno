REVOKE ALL ON public.nf_admin_bootstrap FROM anon;
REVOKE ALL ON public.nf_mapeamentos_importacao FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

ALTER TABLE public.nf_emitente ADD COLUMN IF NOT EXISTS emissor_modo public.nf_ambiente NOT NULL DEFAULT 'mock';
ALTER TABLE public.nf_lotes ADD COLUMN IF NOT EXISTS chave_idempotencia text;
CREATE UNIQUE INDEX IF NOT EXISTS nf_lotes_chave_idem ON public.nf_lotes(chave_idempotencia) WHERE chave_idempotencia IS NOT NULL;
ALTER TABLE public.nf_notas ADD COLUMN IF NOT EXISTS tentativas integer NOT NULL DEFAULT 0;
ALTER TABLE public.nf_notas ADD COLUMN IF NOT EXISTS enviada_ao_emissor_em timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS nf_notas_uma_ativa_por_atendimento ON public.nf_notas(atendimento_id) WHERE status NOT IN ('cancelada','substituida');
CREATE INDEX IF NOT EXISTS nf_notas_status_idx ON public.nf_notas(status);
CREATE SEQUENCE IF NOT EXISTS public.nf_mock_numero_seq START 1;
REVOKE ALL ON SEQUENCE public.nf_mock_numero_seq FROM anon, PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE public.nf_mock_numero_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.nf_mock_proximo_numero()
RETURNS bigint LANGUAGE sql VOLATILE SET search_path TO 'public' AS $$ SELECT nextval('public.nf_mock_numero_seq'); $$;
REVOKE ALL ON FUNCTION public.nf_mock_proximo_numero() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nf_mock_proximo_numero() TO authenticated, service_role;

-- Creates (or returns) a batch and its notes atomically. Serialized by advisory lock;
-- idempotent by batch key and by the partial unique index on active notes per appointment.
CREATE OR REPLACE FUNCTION public.nf_criar_lote(_chave text, _operador uuid, _ambiente public.nf_ambiente, _itens jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE _lote uuid; it jsonb; n integer := 0; total numeric := 0; _at uuid;
BEGIN
  IF NOT (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio')) THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('nf_emissao'));
  SELECT id INTO _lote FROM public.nf_lotes WHERE chave_idempotencia = _chave;
  IF _lote IS NOT NULL THEN RETURN _lote; END IF;
  INSERT INTO public.nf_lotes(aprovado_por, status, chave_idempotencia) VALUES (_operador, 'emitindo', _chave) RETURNING id INTO _lote;
  FOR it IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    UPDATE public.nf_atendimentos SET status='emitindo', aprovado_por=_operador, aprovado_em=now()
      WHERE id=(it->>'atendimento_id')::uuid AND status IN ('pago_ok','erro_emissao')
        AND NOT EXISTS (SELECT 1 FROM public.nf_notas x WHERE x.atendimento_id=(it->>'atendimento_id')::uuid AND x.status NOT IN ('cancelada','substituida'))
      RETURNING id INTO _at;
    IF _at IS NOT NULL THEN
      INSERT INTO public.nf_notas(atendimento_id, lote_id, ambiente, ref_externa, status, payload_enviado, parametro_fiscal_id, aliquota_simples_usada, descricao_usada)
      VALUES (_at, _lote, _ambiente, it->>'ref_externa', 'pendente', it->'payload', (it->>'parametro_fiscal_id')::uuid, (it->>'aliquota')::numeric, it->>'descricao');
      n := n + 1; total := total + (it->>'valor')::numeric;
    END IF;
    _at := NULL;
  END LOOP;
  UPDATE public.nf_lotes SET total_notas=n, valor_total=total WHERE id=_lote;
  RETURN _lote;
END; $$;
REVOKE ALL ON FUNCTION public.nf_criar_lote(text, uuid, public.nf_ambiente, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nf_criar_lote(text, uuid, public.nf_ambiente, jsonb) TO authenticated;

CREATE POLICY nf_notas_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='notas' AND (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio')));
CREATE POLICY nf_notas_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='notas' AND (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio')));
CREATE POLICY nf_notas_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='notas' AND (public.nf_has_role(auth.uid(),'admin_goable') OR public.nf_has_role(auth.uid(),'consultorio')));