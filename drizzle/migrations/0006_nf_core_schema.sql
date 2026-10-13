CREATE TYPE public.nf_status_atendimento AS ENUM ('importado','cadastro_pendente','aguardando_pagamento','pago_ok','aguardando_autorizacao','aprovado','emitindo','emitido','erro_emissao','enviado','erro_envio','nao_gera_nota','cancelado');
CREATE TYPE public.nf_status_nota AS ENUM ('pendente','processando','autorizada','erro','cancelada','substituida');
CREATE TYPE public.nf_forma_pagamento AS ENUM ('pix','credito','debito','dinheiro','outro');
CREATE TYPE public.nf_canal AS ENUM ('email','whatsapp');
CREATE TYPE public.nf_ambiente AS ENUM ('mock','homologacao','producao');

CREATE OR REPLACE FUNCTION public.nf_set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.nf_hoje() RETURNS date LANGUAGE sql STABLE SET search_path TO 'public' AS $$ SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date; $$;

CREATE TABLE public.nf_operadores (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL UNIQUE CHECK (length(trim(nome)) BETWEEN 2 AND 80), ativo boolean NOT NULL DEFAULT true, ordem integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_emitente (id boolean PRIMARY KEY DEFAULT true CHECK (id), razao_social text NOT NULL, cnpj text CHECK (cnpj ~ '^\d{14}$'), inscricao_municipal text, municipio_ibge text NOT NULL, municipio_nome text NOT NULL, uf text NOT NULL CHECK (uf ~ '^[A-Z]{2}$'), regime text NOT NULL DEFAULT 'simples_me_epp', email_remetente text, whatsapp_numero text, parametros_validados_por text, parametros_validados_em timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_medicos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, crm text, nome_no_prontmed text, ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_parametros_fiscais (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), grupo_id uuid NOT NULL DEFAULT gen_random_uuid(), nome text NOT NULL, c_trib_nac text NOT NULL, c_trib_mun text, nbs text, nbs_descricao text, c_ind_op text, municipio_incidencia_ibge text NOT NULL, trib_issqn text NOT NULL DEFAULT 'operacao_tributavel', regime_especial text NOT NULL DEFAULT 'nenhum', exigibilidade_suspensa boolean NOT NULL DEFAULT false, iss_retido boolean NOT NULL DEFAULT false, beneficio_municipal boolean NOT NULL DEFAULT false, pis_cofins_cst text, pis_cofins_csll_retencao text, ibscbs_cst text, ibscbs_class_trib text, valor_aprox_tributos_modo text NOT NULL DEFAULT 'aliquota_simples', versao integer NOT NULL DEFAULT 1 CHECK (versao > 0), vigente_desde date NOT NULL DEFAULT CURRENT_DATE, ativo boolean NOT NULL DEFAULT true, validacao jsonb NOT NULL DEFAULT '{}'::jsonb, validado_por text, validado_em timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (grupo_id, versao));
CREATE UNIQUE INDEX nf_parametros_um_ativo ON public.nf_parametros_fiscais(grupo_id) WHERE ativo;

CREATE TABLE public.nf_servicos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL UNIQUE, gera_nota boolean NOT NULL DEFAULT true, valor_padrao numeric(12,2) CHECK (valor_padrao IS NULL OR valor_padrao >= 0), descricao_nota text NOT NULL, genero text NOT NULL DEFAULT 'a' CHECK (genero IN ('a','o')), parametro_fiscal_id uuid REFERENCES public.nf_parametros_fiscais(id), aliases_prontmed text[] NOT NULL DEFAULT '{}', observacao text NOT NULL DEFAULT '', ativo boolean NOT NULL DEFAULT true, ordem integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_aliquota_mes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competencia text NOT NULL UNIQUE CHECK (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$'), aliquota_simples numeric(5,2) NOT NULL CHECK (aliquota_simples >= 0 AND aliquota_simples <= 100), informado_por text NOT NULL, informado_em timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_regras_especiais (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL UNIQUE, aguarda_autorizacao boolean NOT NULL DEFAULT true, iss_retido boolean NOT NULL DEFAULT false, exige_declaracao boolean NOT NULL DEFAULT false, tomador_cnpj text CHECK (tomador_cnpj ~ '^\d{14}$'), tomador_nome text, observacao text NOT NULL DEFAULT '', ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_pacientes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, cpf text UNIQUE CHECK (cpf ~ '^\d{11}$'), cep text CHECK (cep ~ '^\d{8}$'), logradouro text, numero text, complemento text, bairro text, municipio_ibge text, municipio_nome text, uf text, email text, celular text, regra_especial_id uuid REFERENCES public.nf_regras_especiais(id), prontuario_prontmed text, origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('importacao','ficha_ia','manual')), demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_importacoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), data_ref date NOT NULL, origem text NOT NULL CHECK (origem IN ('csv','xlsx','pdf_ia','imagem_ia','manual')), arquivo_path text, linhas_lidas integer NOT NULL DEFAULT 0, linhas_novas integer NOT NULL DEFAULT 0, operador_id uuid REFERENCES public.nf_operadores(id), criado_em timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_atendimentos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), importacao_id uuid REFERENCES public.nf_importacoes(id), data_atendimento date NOT NULL, paciente_id uuid NOT NULL REFERENCES public.nf_pacientes(id), medico_id uuid REFERENCES public.nf_medicos(id), servico_id uuid REFERENCES public.nf_servicos(id), quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 99), valor numeric(12,2) NOT NULL DEFAULT 0, forma_pagamento public.nf_forma_pagamento, convenio boolean NOT NULL DEFAULT false, status public.nf_status_atendimento NOT NULL DEFAULT 'importado', pago_ok_por uuid REFERENCES public.nf_operadores(id), pago_ok_em timestamptz, aprovado_por uuid REFERENCES public.nf_operadores(id), aprovado_em timestamptz, observacao text NOT NULL DEFAULT '', hash_dedup text NOT NULL DEFAULT '' UNIQUE, demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX nf_atendimentos_data ON public.nf_atendimentos(data_atendimento);

CREATE TABLE public.nf_lotes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), criado_em timestamptz NOT NULL DEFAULT now(), aprovado_por uuid REFERENCES public.nf_operadores(id), total_notas integer NOT NULL DEFAULT 0, valor_total numeric(12,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'aberto', updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_notas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), atendimento_id uuid NOT NULL REFERENCES public.nf_atendimentos(id), lote_id uuid REFERENCES public.nf_lotes(id), ambiente public.nf_ambiente NOT NULL DEFAULT 'mock', ref_externa text NOT NULL UNIQUE, chave_acesso text, numero text, status public.nf_status_nota NOT NULL DEFAULT 'pendente', mensagem_erro text, pdf_path text, xml_path text, payload_enviado jsonb, resposta jsonb, emitida_em timestamptz, cancelada_em timestamptz, motivo_cancelamento text, substituida_por uuid REFERENCES public.nf_notas(id), parametro_fiscal_id uuid REFERENCES public.nf_parametros_fiscais(id), aliquota_simples_usada numeric(5,2), descricao_usada text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_envios (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nota_id uuid NOT NULL REFERENCES public.nf_notas(id), canal public.nf_canal NOT NULL, destino text NOT NULL, status text NOT NULL DEFAULT 'pendente', erro text, enviado_em timestamptz, provider_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.nf_auditoria (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quando timestamptz NOT NULL DEFAULT now(), operador_id uuid REFERENCES public.nf_operadores(id), user_id uuid NOT NULL DEFAULT auth.uid(), acao text NOT NULL, entidade text NOT NULL, entidade_id text, antes jsonb, depois jsonb);
CREATE INDEX nf_auditoria_entidade ON public.nf_auditoria(entidade, entidade_id);

CREATE OR REPLACE FUNCTION public.nf_atendimento_hash() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN NEW.hash_dedup := md5(concat_ws('|', NEW.data_atendimento::text, NEW.paciente_id::text, COALESCE(NEW.servico_id::text,''), to_char(NEW.valor,'FM999999999990.00'), NEW.quantidade::text)); RETURN NEW; END; $$;
CREATE TRIGGER nf_atendimento_hash BEFORE INSERT OR UPDATE OF data_atendimento, paciente_id, servico_id, valor, quantidade ON public.nf_atendimentos FOR EACH ROW EXECUTE FUNCTION public.nf_atendimento_hash();

CREATE OR REPLACE FUNCTION public.nf_auditoria_autor() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN IF auth.uid() IS NOT NULL THEN NEW.user_id := auth.uid(); END IF; NEW.quando := now(); RETURN NEW; END; $$;
CREATE TRIGGER nf_auditoria_autor BEFORE INSERT ON public.nf_auditoria FOR EACH ROW EXECUTE FUNCTION public.nf_auditoria_autor();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['nf_operadores','nf_emitente','nf_medicos','nf_parametros_fiscais','nf_servicos','nf_aliquota_mes','nf_regras_especiais','nf_pacientes','nf_importacoes','nf_atendimentos','nf_lotes','nf_notas','nf_envios'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.nf_set_updated_at()', t||'_updated_at', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['nf_operadores','nf_emitente','nf_medicos','nf_parametros_fiscais','nf_servicos','nf_aliquota_mes','nf_regras_especiais','nf_pacientes','nf_importacoes','nf_atendimentos','nf_lotes','nf_notas','nf_envios','nf_auditoria'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, PUBLIC', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.nf_has_role((SELECT auth.uid()), ''admin_goable'')) WITH CHECK (public.nf_has_role((SELECT auth.uid()), ''admin_goable''))', t||'_admin', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.nf_has_role((SELECT auth.uid()), ''consultorio''))', t||'_cons_select', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['nf_operadores','nf_medicos','nf_servicos','nf_aliquota_mes','nf_pacientes','nf_importacoes','nf_atendimentos','nf_lotes','nf_notas','nf_envios'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.nf_has_role((SELECT auth.uid()), ''consultorio''))', t||'_cons_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.nf_has_role((SELECT auth.uid()), ''consultorio'')) WITH CHECK (public.nf_has_role((SELECT auth.uid()), ''consultorio''))', t||'_cons_update', t);
  END LOOP;
END $$;
CREATE POLICY nf_auditoria_cons_insert ON public.nf_auditoria FOR INSERT TO authenticated WITH CHECK (public.nf_has_role((SELECT auth.uid()), 'consultorio') AND user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.nf_parametro_nova_versao(_id uuid, _dados jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE old public.nf_parametros_fiscais; r public.nf_parametros_fiscais;
BEGIN
  IF NOT public.nf_has_role(auth.uid(), 'admin_goable') THEN RAISE EXCEPTION 'Somente a administração Goable altera parâmetros fiscais.'; END IF;
  SELECT * INTO old FROM public.nf_parametros_fiscais WHERE id=_id AND ativo FOR UPDATE;
  IF old.id IS NULL THEN RAISE EXCEPTION 'Parâmetro inexistente ou já substituído.'; END IF;
  r := jsonb_populate_record(old, _dados - ARRAY['id','grupo_id','versao','ativo','created_at','updated_at','validado_por','validado_em']);
  r.id := gen_random_uuid(); r.versao := old.versao + 1; r.ativo := true; r.validado_por := NULL; r.validado_em := NULL;
  r.vigente_desde := COALESCE((_dados->>'vigente_desde')::date, public.nf_hoje()); r.created_at := now(); r.updated_at := now();
  UPDATE public.nf_parametros_fiscais SET ativo=false WHERE id=_id;
  INSERT INTO public.nf_parametros_fiscais SELECT (r).*;
  UPDATE public.nf_servicos SET parametro_fiscal_id=r.id WHERE parametro_fiscal_id=_id;
  RETURN r.id;
END; $$;
REVOKE ALL ON FUNCTION public.nf_parametro_nova_versao(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nf_parametro_nova_versao(uuid,jsonb) TO authenticated, service_role;

INSERT INTO public.nf_operadores(nome,ordem) VALUES ('Marli',1),('Cíntia',2);
INSERT INTO public.nf_emitente(razao_social,cnpj,inscricao_municipal,municipio_ibge,municipio_nome,uf,regime) VALUES ('BNAVES CONSULTORIO DE ANGIOLOGIA LTDA',NULL,NULL,'3106200','Belo Horizonte','MG','simples_me_epp');
INSERT INTO public.nf_parametros_fiscais(nome,c_trib_nac,c_trib_mun,nbs,nbs_descricao,c_ind_op,municipio_incidencia_ibge,trib_issqn,regime_especial,exigibilidade_suspensa,iss_retido,beneficio_municipal,pis_cofins_cst,pis_cofins_csll_retencao,ibscbs_cst,ibscbs_class_trib,valor_aprox_tributos_modo,versao,vigente_desde,validacao) VALUES ('Clínica médica — padrão (consulta)','04.03.03','04.03.03.001','123012100','Serviços de clínica médica','050103','3106200','operacao_tributavel','nenhum',false,false,false,'00','0','410','410999','aliquota_simples',1,'2026-09-25','{"c_trib_mun":"confirmar separadores","c_ind_op":"validar_contador: o texto lido é ''Serviço prestado fisicamente sobre bem móvel material - Endereço do destinatário''","ibscbs_cst":"validar_contador: 410 = Imunidade e não incidência","ibscbs_class_trib":"validar_contador: 410999 = Operações não onerosas sem previsão de tributação"}'::jsonb);
INSERT INTO public.nf_aliquota_mes(competencia,aliquota_simples,informado_por) VALUES ('2026-09',11.80,'seed (lido da nota de 25/09/2026)'),('2026-10',11.80,'demo — confirmar com contador');
INSERT INTO public.nf_servicos(nome,gera_nota,valor_padrao,descricao_nota,genero,aliases_prontmed,observacao,ordem,parametro_fiscal_id)
SELECT v.nome,true,v.valor,v.descr,v.gen,v.aliases,v.obs,v.ordem,(SELECT id FROM public.nf_parametros_fiscais WHERE ativo LIMIT 1) FROM (VALUES
 ('Primeira consulta',630.00::numeric,'consulta médica','a',ARRAY['Primeira Consulta'],'Valor visto no relatório — a confirmar',1),
 ('Consulta',470.00,'consulta médica','a',ARRAY['Consulta'],'Valor visto no relatório — a confirmar',2),
 ('Retorno',NULL,'consulta médica de retorno','o',ARRAY['Retorno'],'',3),
 ('Resultado de exame',NULL,'avaliação de resultado de exame','o',ARRAY['Resultado de exame'],'',4),
 ('Escleroterapia (sessão)',NULL,'sessão de escleroterapia','a',ARRAY['Escleroterapia'],'',5),
 ('Cirurgia a laser',NULL,'procedimento cirúrgico a laser','o',ARRAY['Laser','Cirurgia'],'',6)) AS v(nome,valor,descr,gen,aliases,obs,ordem);
INSERT INTO public.nf_regras_especiais(nome,aguarda_autorizacao,iss_retido,exige_declaracao,tomador_cnpj,observacao) VALUES
 ('AMAGIS',true,true,false,NULL,'Lembrete no monitor: aguardar aut. p/ envio de NF - reter ISS. Detalhar com o contador.'),
 ('DESBAN',true,false,true,NULL,'Lembrete no monitor: aguardar aut. p/ envio de NF - enviar declaração. Detalhar com o contador.');
INSERT INTO public.nf_medicos(nome,nome_no_prontmed,ativo) VALUES ('Dr. Bruno de Lima Naves','Bruno de Lima Naves',true),('A confirmar',NULL,false);
INSERT INTO public.nf_pacientes(id,nome,cpf,cep,logradouro,numero,complemento,bairro,municipio_ibge,municipio_nome,uf,email,celular,regra_especial_id,origem,demo) VALUES
('d0000000-0000-0000-0000-000000000001','Ana Lúcia Ferreira','10433218100','30130005','Avenida Afonso Pena','100',NULL,'Centro','3106200','Belo Horizonte','MG','ana.demo1@exemplo.com','31988000000',NULL,'importacao',true),
('d0000000-0000-0000-0000-000000000002','Carlos Eduardo Silva',NULL,'30160011','Rua da Bahia','137',NULL,'Lourdes','3106200','Belo Horizonte','MG','carlos.demo2@exemplo.com','31988001111',NULL,'importacao',true),
('d0000000-0000-0000-0000-000000000003','Maria Helena Costa','96001338914','30110017','Avenida do Contorno','174',NULL,'Funcionários','3106200','Belo Horizonte','MG',NULL,'31988002222',NULL,'importacao',true),
('d0000000-0000-0000-0000-000000000004','Paulo Roberto Almeida','08386379499','30160030','Rua Espírito Santo','211',NULL,'Centro','3106200','Belo Horizonte','MG','paulo.demo4@exemplo.com','31988003333',(SELECT id FROM public.nf_regras_especiais WHERE nome='AMAGIS'),'importacao',true),
('d0000000-0000-0000-0000-000000000005','Beatriz Santos Oliveira','02654235114','30180001','Avenida Amazonas','248',NULL,'Barro Preto','3106200','Belo Horizonte','MG','beatriz.demo5@exemplo.com','31988004444',NULL,'importacao',true),
('d0000000-0000-0000-0000-000000000006','José Antônio Pereira','16155940789','30130150','Rua Pernambuco','285',NULL,'Savassi','3106200','Belo Horizonte','MG',NULL,'31988005555',NULL,'importacao',true),
('d0000000-0000-0000-0000-000000000007','Fernanda Lima Rocha','81618495950','30112020','Avenida Getúlio Vargas','322',NULL,'Funcionários','3106200','Belo Horizonte','MG','fernanda.demo7@exemplo.com','31988006666',NULL,'importacao',true),
('d0000000-0000-0000-0000-000000000008','Luiz Fernando Martins','31034131656','30130170','Rua Sergipe','359',NULL,'Savassi','3106200','Belo Horizonte','MG',NULL,'31988007777',NULL,'importacao',true),
('d0000000-0000-0000-0000-000000000009','Juliana Mendes Prado','47525534144','30140001','Avenida Brasil','396',NULL,'Santa Efigênia','3106200','Belo Horizonte','MG','juliana.demo9@exemplo.com','31988008888',NULL,'importacao',true),
('d0000000-0000-0000-0000-00000000000a','Ricardo Souza Campos','92832764851','30140090','Rua Gonçalves Dias','433',NULL,'Lourdes','3106200','Belo Horizonte','MG','ricardo.demo10@exemplo.com','31988009999',NULL,'importacao',true),
('d0000000-0000-0000-0000-00000000000b','Patrícia Gomes Duarte','35030564160','30170001','Avenida Álvares Cabral','470',NULL,'Lourdes','3106200','Belo Horizonte','MG',NULL,'31988011110',NULL,'importacao',true),
('d0000000-0000-0000-0000-00000000000c','Rodrigo Teixeira Lopes','39537672409','30160041','Rua Rio de Janeiro','507',NULL,'Centro','3106200','Belo Horizonte','MG','rodrigo.demo12@exemplo.com','31988012221',NULL,'importacao',true);
INSERT INTO public.nf_atendimentos(data_atendimento,paciente_id,medico_id,servico_id,quantidade,valor,forma_pagamento,convenio,status,observacao,demo) VALUES
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000001',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Consulta'),1,470,'pix',false,'pago_ok','Demo · 08:00',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000002',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Primeira consulta'),1,630,'credito',false,'cadastro_pendente','Demo · 08:30',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000003',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Consulta'),1,470,NULL,false,'aguardando_pagamento','Demo · 09:00',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000004',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Escleroterapia (sessão)'),1,630,'pix',false,'aguardando_autorizacao','Demo · 09:30',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000005',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Consulta'),1,470,'dinheiro',false,'emitido','Demo · 10:00',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000006',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Primeira consulta'),1,630,'credito',false,'enviado','Demo · 10:30',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000007',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Consulta'),1,470,NULL,false,'importado','Demo · 11:00',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000008',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Retorno'),1,0,NULL,true,'nao_gera_nota','Demo · 11:30',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-000000000009',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Primeira consulta'),1,630,'debito',false,'aprovado','Demo · 14:00',true),
(public.nf_hoje(),'d0000000-0000-0000-0000-00000000000a',(SELECT id FROM public.nf_medicos WHERE nome='Dr. Bruno de Lima Naves'),(SELECT id FROM public.nf_servicos WHERE nome='Consulta'),1,470,'pix',false,'erro_emissao','Demo · 14:30',true);