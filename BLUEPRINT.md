# BLUEPRINT — Notas BNaves · Automação da Emissão de NFS-e

> **Mensagem de abertura do projeto no Lovable (M0).** Leia o documento inteiro antes de escrever código. Ele descreve o sistema completo que vamos construir em 8 mensagens. **Nesta primeira mensagem, construa apenas o que está na seção 12 (escopo da M0).** As próximas mensagens vão detalhar cada parte. Guarde este blueprint como conhecimento do projeto.

---

## 1. Contexto

**Cliente:** BNAVES CONSULTORIO DE ANGIOLOGIA LTDA, Belo Horizonte/MG. É o consultório do Dr. Bruno de Lima Naves, angiologista e cirurgião vascular. A filha dele, também médica, atende no mesmo consultório, e os pacientes dela seguem o mesmo fluxo.
**Quem constrói:** Goable AI, a fornecedora do sistema.
**Usuárias:** duas secretárias, Marli e Cíntia, com um login único do consultório. A Goable tem um login de administração.

**Problema:** hoje cada nota fiscal é emitida à mão no **Portal Contribuinte da NFS-e Nacional** (nfse.gov.br). A secretária copia nome, CPF e endereço do paciente do ProntMed (app.prontmed.com), escolhe os códigos fiscais, digita a descrição e o valor, emite, passa por um captcha para baixar o PDF, salva numa pasta e depois envia ao paciente por e-mail ou WhatsApp. São cerca de 10 notas por dia, de 3 a 5 minutos cada.

**Objetivo:** "a máquina faz 99%, a secretária dá o OK". O sistema monta as notas do dia, a secretária confere e aprova o lote, o sistema emite pela API, guarda o PDF e o XML, envia ao paciente e organiza o histórico do mês para o contador.

---

## 2. Princípios inegociáveis

1. **Ninguém emite sem conferência humana.** Toda nota passa por "ok de pagamento" e por aprovação do lote.
2. **Só emite atendimento particular pago.** Convênio não gera nota. Não há descontos nem cortesias.
3. **Dados de saúde são sensíveis (LGPD).** RLS em todas as tabelas, nada acessado direto do navegador sem RLS, PDFs em bucket privado com URL assinada e expiração, nenhum segredo no código ou no banco em texto puro.
4. **E-mail é o canal preferencial.** O WhatsApp é exceção, só para quem não tem e-mail, e nunca leva o PDF anexado: envia um link seguro com expiração.
5. **O certificado digital nunca passa pelo nosso sistema.** Ele fica cadastrado no painel do provedor de emissão.
6. **Parâmetros fiscais são editáveis e versionados.** O sistema não decide regra fiscal: quem define é o contador.
7. **A interface é para secretária, não para técnico.** Poucos cliques, letra grande, português simples e status com cor e texto.

---

## 3. Stack e convenções

- **Frontend:** React + TypeScript + Tailwind + shadcn/ui + TanStack Router (padrão Lovable).
- **Backend:** Supabase/Lovable Cloud (Postgres + RLS + Storage + Auth). Server functions com `createServerFn` e o client admin do Supabase. Webhooks em rota de servidor pública, validada por token.
- **IA:** **Lovable AI** (nativa), para extrair dados de PDF/print de relatório e de texto colado da ficha do paciente. Não usar API de IA externa.
- **Emissão de NFS-e:** provedor de API **Focus NFe (NFS-e Nacional)**, atrás de um **adapter** (`EmissorNFSe`) com duas implementações:
  - `MockEmissor`: emissão simulada que gera um PDF "SEM VALOR FISCAL — DEMONSTRAÇÃO". É o padrão até a conta Focus estar ativa.
  - `FocusEmissor`: chamada real, em homologação ou produção.
- **E-mail:** Resend.
- **WhatsApp:** Meta WhatsApp Cloud API, porque a Goable é Tech Provider oficial. Mensagem de template da categoria *utility*.
- **Segredos (Secrets):** `EMISSOR_MODO` (`mock` | `homologacao` | `producao`), `FOCUS_NFE_TOKEN`, `FOCUS_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_REMETENTE`, `META_WA_TOKEN`, `META_WA_PHONE_ID`, `META_WA_TEMPLATE`.
- **Tabelas:** prefixo `nf_`. Datas em `timestamptz`, exibidas em America/Sao_Paulo. Valores em `numeric(12,2)`.
- **Repositório:** sincronizado com o GitHub da Goable.

---

## 4. Fluxo do dia a dia

```
1. IMPORTAR      Secretária traz os atendimentos do dia para o sistema:
                 (a) arquivo exportado do ProntMed (CSV/XLSX), (b) PDF ou print do
                 Relatório Financeiro > Particular (lido pela Lovable AI), ou (c) inclusão manual.
2. CASAR         Cada linha é ligada a um paciente do cadastro próprio (nf_pacientes).
                 Paciente novo ou incompleto → "Completar cadastro": colar o texto da
                 ficha do ProntMed e a IA preenche CPF, endereço e celular; e-mail é perguntado.
3. OK PAGO       Secretária marca "pago" em cada linha (forma: Pix, crédito, débito, dinheiro).
4. CONFERIR      Tela de conferência com alertas que bloqueiam emissão:
                 CPF inválido, endereço incompleto, serviço sem parâmetro fiscal,
                 mês sem alíquota do Simples, paciente com regra especial pendente.
5. APROVAR LOTE  Um clique aprova as notas sem bloqueio.
6. EMITIR        Sistema envia cada DPS ao emissor (adapter), recebe chave/número,
                 guarda PDF (DANFSe) e XML no Storage.
7. ENVIAR        E-mail com PDF anexado; sem e-mail → WhatsApp com link seguro.
8. HISTÓRICO     Fim do mês: relatório por médico, serviço e forma de pagamento,
                 exportável em XLSX para o contador, + ZIP dos XMLs/PDFs do mês.
```

**Exceções que a V1 trata:** cancelar nota (CPF errado, valor errado) e reemitir corrigida; reenviar a nota ao paciente; emitir avulsa fora do lote; atendimento "aguardando autorização" (regra especial).

---

## 5. Parâmetros fiscais (lidos de uma nota real emitida em 25/09/2026)

O arquivo `parametros_fiscais_seed.json` traz os valores. Resumo:

| Campo | Valor observado | Status |
|---|---|---|
| Emitente | BNAVES CONSULTORIO DE ANGIOLOGIA LTDA · BH/MG · Simples Nacional ME/EPP | CNPJ e inscrição: o cliente informa |
| Código de Tributação Nacional | 04.03.03 | confirmado na nota |
| Código Complementar Municipal | 04.03.03.001 | separadores a confirmar |
| NBS | 123012100 — Serviços de clínica médica | confirmado na nota |
| Município de incidência | Belo Horizonte/MG (IBGE 3106200) | confirmado |
| Tributação ISSQN | Operação tributável, sem retenção, regime especial "Nenhum" | padrão |
| PIS/COFINS | 00 — Nenhum; não retidos | padrão |
| Indicador da operação | 050103 | **validar com o contador** (o texto fala de "bem móvel material") |
| IBS/CBS CST / cClassTrib | 410 / 410999 | **validar com o contador** (o texto fala de "operação não onerosa") |
| Valor aproximado dos tributos | Alíquota do Simples Nacional: **11,80%** (set/2026) | **muda todo mês**: é o "a alíquota muda" que as secretárias citam |
| Descrição | `01 (uma) consulta médica` | modelo: `{qtd_2dig} ({qtd_extenso}) {descricao_servico}` |

**Regra de produção:** só se troca `EMISSOR_MODO` para `producao` depois que o contador marcar, na tela de Configurações, "Parâmetros validados por [nome] em [data]". Sem essa validação, o sistema recusa emitir em produção.

---

## 6. Regras especiais (lembretes colados no monitor da recepção)

Na recepção existem avisos impressos que precisam virar regra no sistema:

- `AMAGIS — aguardar autorização p/ envio de NF — reter ISS`
- `DESBAN — aguardar autorização p/ envio de NF — enviar declaração`

O sistema terá a tabela `nf_regras_especiais`, com nome, aguarda autorização, ISS retido, exige declaração, tomador PJ (CNPJ) e observação. Um paciente pode ser ligado a uma regra. Atendimento de paciente com regra entra como **"Aguardando autorização"** e fica fora do lote até a secretária liberar. Depois de liberado, a nota segue o fluxo normal, com os campos de retenção ou de tomador que a regra define. Os detalhes de cada regra vêm do contador e são editáveis.

---

## 7. Modelo de dados (tabelas `nf_`)

| Tabela | Campos principais |
|---|---|
| `nf_perfis` | user_id, papel (`consultorio` \| `admin_goable`), nome |
| `nf_operadores` | id, nome (Marli, Cíntia), ativo. É escolhido a cada sessão para registrar quem fez o quê |
| `nf_emitente` | razao_social, cnpj, inscricao_municipal, municipio_ibge, regime (`simples_me_epp`), email_remetente, whatsapp_numero |
| `nf_medicos` | id, nome, crm, ativo, nome_no_prontmed (para casar com a importação) |
| `nf_servicos` | id, nome (Consulta, Primeira consulta, Retorno, Escleroterapia (sessão), Cirurgia a laser…), gera_nota, valor_padrao, descricao_nota, parametro_fiscal_id, aliases_prontmed text[] |
| `nf_parametros_fiscais` | id, nome, c_trib_nac, c_trib_mun, nbs, c_ind_op, municipio_incidencia_ibge, trib_issqn, iss_retido, pis_cofins_cst, ibscbs_cst, ibscbs_class_trib, versao, vigente_desde, validado_por, validado_em |
| `nf_aliquota_mes` | competencia (AAAA-MM), aliquota_simples numeric(5,2), informado_por, informado_em |
| `nf_regras_especiais` | id, nome, aguarda_autorizacao, iss_retido, exige_declaracao, tomador_cnpj, tomador_nome, observacao |
| `nf_pacientes` | id, nome, cpf (único), cep, logradouro, numero, complemento, bairro, municipio_ibge, municipio_nome, uf, email, celular, regra_especial_id, prontuario_prontmed, origem, atualizado_em |
| `nf_importacoes` | id, data_ref, origem (`csv` \| `xlsx` \| `pdf_ia` \| `imagem_ia` \| `manual`), arquivo_path, linhas_lidas, linhas_novas, operador_id, criado_em |
| `nf_atendimentos` | id, importacao_id, data_atendimento, paciente_id, medico_id, servico_id, quantidade, valor, forma_pagamento, convenio (bool), status, pago_ok_por, pago_ok_em, aprovado_por, aprovado_em, observacao, hash_dedup (único) |
| `nf_lotes` | id, criado_em, aprovado_por (operador), total_notas, valor_total, status |
| `nf_notas` | id, atendimento_id, lote_id, ambiente (`mock` \| `homologacao` \| `producao`), ref_externa (idempotência), chave_acesso, numero, status, mensagem_erro, pdf_path, xml_path, payload_enviado jsonb, resposta jsonb, emitida_em, cancelada_em, motivo_cancelamento, substituida_por |
| `nf_envios` | id, nota_id, canal (`email` \| `whatsapp`), destino, status, erro, enviado_em, provider_id |
| `nf_auditoria` | id, quando, operador_id, user_id, acao, entidade, entidade_id, antes jsonb, depois jsonb |

**Status do atendimento:** `importado` → `cadastro_pendente` → `aguardando_pagamento` → `pago_ok` → `aguardando_autorizacao` (só com regra especial) → `aprovado` → `emitindo` → `emitido` / `erro_emissao` → `enviado` / `erro_envio` · `nao_gera_nota` (convênio) · `cancelado`.

**Deduplicação:** `hash_dedup` = data + paciente + serviço + valor. Reimportar o mesmo relatório não duplica linhas.

---

## 8. Telas

| Rota | Tela | O que faz |
|---|---|---|
| `/login` | Login | Login único do consultório |
| `/operador` | Quem está operando? | Dois cartões grandes, Marli e Cíntia. Vale para a sessão e pode ser trocado no topo |
| `/` | **Hoje** | Seletor de data, botão "Importar atendimentos", lista com checkbox "pago" e forma de pagamento, badges de status e contadores (a importar, pendentes, prontos, emitidas, enviadas) |
| `/importar` | Importar | Arrastar arquivo (CSV/XLSX/PDF/imagem) ou incluir manual. Mostra a prévia antes de gravar |
| `/conferencia` | Conferência | Notas prontas e bloqueadas (com motivo e botão de corrigir), total do lote e botão **Aprovar e emitir** |
| `/notas` | Notas emitidas | Filtros, status de emissão e envio, ver PDF, reenviar, cancelar e reemitir |
| `/pacientes` | Pacientes | Cadastro próprio, busca por nome/CPF, "Completar com texto da ficha" |
| `/historico` | Histórico mensal | Totais por médico, serviço e forma de pagamento; exportar XLSX; baixar ZIP de XML/PDF |
| `/configuracoes` | Configurações | Emitente, médicos, serviços, parâmetros fiscais, alíquota do mês, regras especiais, textos de e-mail/WhatsApp, modo do emissor (somente admin) |

**Banner fixo:** quando `EMISSOR_MODO ≠ producao`, mostrar a faixa "AMBIENTE DE DEMONSTRAÇÃO — notas sem valor fiscal".
**Bloqueio no topo:** se o mês corrente não tiver alíquota do Simples, mostrar o aviso "Informe a alíquota do Simples de [mês] para liberar as emissões".

---

## 9. Design

- Tema claro, limpo, com alta legibilidade (base 16px; tabelas de 15px no mínimo).
- **Primária:** teal `#00504E` · **Destaque/ação:** laranja `#F47920` · **Sucesso:** `#22C55E` · **Erro:** `#DC2626` · **Fundo:** `#F7F8F8` · **Texto:** `#0F1A1A`.
- Fonte Inter. Rodapé discreto "por Goable AI".
- Status sempre com cor e rótulo (nunca só cor). Ações principais com botão grande e laranja.
- Desktop primeiro (computador da recepção), mas responsivo.

---

## 10. Segurança e LGPD

- RLS em todas as tabelas: papel `consultorio` lê e escreve os dados operacionais; `admin_goable` faz tudo; as configurações fiscais e o modo do emissor são editáveis só por admin, ou pelo consultório com registro de auditoria.
- Bucket privado `notas` (PDF/XML) e bucket privado `importacoes` (arquivos de entrada). URLs assinadas: 10 min para a tela e 7 dias para o link de WhatsApp.
- Toda ação relevante grava em `nf_auditoria` com o operador da sessão: ok de pagamento, aprovação, emissão, cancelamento, envio e alteração de parâmetro.
- Arquivos importados são apagados do Storage após 90 dias. Os dados das notas ficam guardados pelo prazo fiscal.
- O CPF é exibido mascarado nas listas (`***.456.789-**`) e completo só na conferência e no cadastro.

---

## 11. Plano de construção (8 mensagens)

| Msg | Entrega |
|---|---|
| **M0** | Esta mensagem: base do app, auth, layout, rotas, design |
| M1 | Banco completo, RLS, seeds, server functions centrais, auditoria |
| M2 | Configurações (emitente, médicos, serviços, parâmetros, alíquota do mês, regras especiais) + Pacientes (com "completar pela ficha" via IA) |
| M3 | Importação (CSV/XLSX com mapeamento de colunas; PDF/print via Lovable AI; manual) + tela Hoje com ok de pagamento |
| M4 | Conferência + adapter de emissão (Mock + Focus NFe) + webhook + PDF/XML + cancelar/reemitir |
| M5 | Envio ao paciente (Resend + WhatsApp Cloud API com link seguro) + reenvio |
| M6 | Histórico mensal, exportação XLSX, ZIP do mês, painel de auditoria |
| M7 | Polimento, QA ponta a ponta, checklist de ida para produção |

---

## 12. ESCOPO DESTA MENSAGEM (M0)

Construa somente:

1. **Projeto base** com a stack da seção 3 e o design da seção 9 (tokens de cor no Tailwind, fonte Inter).
2. **Auth** com e-mail e senha (Lovable Cloud/Supabase). A tabela `nf_perfis` tem papel `consultorio` ou `admin_goable`, com RLS. Por enquanto, cadastro aberto apenas para o primeiro usuário; depois, só admin cria usuários.
3. **Tela `/operador`** com dois cartões fixos (Marli e Cíntia, ainda em constante, pois a tabela vem na M1). Guardar o operador escolhido em contexto e em `sessionStorage`. Mostrar o nome do operador no topo, com a opção "trocar".
4. **Layout** com barra lateral: Hoje, Importar, Conferência, Notas, Pacientes, Histórico, Configurações. Topo com data, operador e sair. Banner "AMBIENTE DE DEMONSTRAÇÃO".
5. **Todas as rotas da seção 8** criadas com um estado vazio bonito, título e uma frase do que a tela fará.
6. **Tela Hoje** com dados fictícios estáticos (8 linhas, com cada status representado), para validarmos o visual.

**Não** crie tabelas de negócio, integrações ou chamadas de IA nesta mensagem.

### Critérios de aceite (M0)
- [ ] Login funciona; usuário sem sessão é redirecionado para `/login`.
- [ ] Depois do login, se não houver operador na sessão, abre `/operador`; o operador escolhido aparece no topo e pode ser trocado.
- [ ] As 9 rotas existem e navegam pela barra lateral.
- [ ] Banner de demonstração visível em todas as telas internas.
- [ ] A tela Hoje mostra a tabela fictícia com badges de status coloridos e com rótulo.
- [ ] Cores e fonte seguem a seção 9; layout legível em 1366×768.
- [ ] `nf_perfis` existe com RLS ativo.

### Relato esperado
Ao terminar, responda com: arquivos criados, rotas, decisões tomadas, o que ficou pendente e qualquer desvio deste blueprint.
