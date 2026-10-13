# PLANO DE DESENVOLVIMENTO — Notas BNaves (Dr. Bruno)

**Versão 2 · 12/10/2026.** Substitui o `PLANO_bruno_notas_v1.md` e incorpora a análise do vídeo da operação.
**Arquivos do pacote:** `00_BLUEPRINT_notas_dr_bruno.md` (abre o projeto no Lovable) · `parametros_fiscais_seed.json` (subir junto na M1).

---

## 1. O que o vídeo mudou no plano

| Antes (v1) | Agora (confirmado no vídeo) | Efeito no plano |
|---|---|---|
| Emissor incerto: NFS-e Nacional, Receita Saúde ou municipal | **Portal Contribuinte da NFS-e Nacional (nfse.gov.br)**, emitente **BNAVES CONSULTORIO DE ANGIOLOGIA LTDA**, BH, **Simples ME/EPP** | Plano B (Receita Saúde) descartado. A emissão por API está confirmada |
| Regras fiscais desconhecidas | Códigos lidos: 04.03.03 / 04.03.03.001 / NBS 123012100 / indicador da operação 050103 / IBS-CBS 410 e 410999 | Os parâmetros entram já no seed. O contador só **valida**, não precisa explicar do zero |
| "Alíquota muda todo mês" (hipótese: Simples) | Campo "Alíquota do Simples Nacional: **11,80%**" | Hipótese confirmada. Tela "alíquota do mês" com bloqueio de emissão |
| ProntMed: não sabíamos se era desktop | **Web (app.prontmed.com)**, com Relatório Financeiro > Particular (forma de pagamento: crédito, débito, Pix, dinheiro) | O relatório Particular é a fonte da importação. Um robô (Playwright) fica viável na fase 2 |
| E-mail como canal principal | **A ficha do ProntMed não mostra campo de e-mail** (só celular) | O cadastro próprio de pacientes precisa capturar o e-mail. Na prática, o WhatsApp tende a ser muito usado, então ele vai com link seguro, não com PDF anexado |
| — | Captcha "Sou humano" para baixar o PDF no portal | Mais uma prova de que um robô no portal seria frágil. A API devolve o PDF sem captcha |
| — | Lembretes no monitor: **AMAGIS** (aguardar autorização, reter ISS) e **DESBAN** (aguardar autorização, enviar declaração) | Novo recurso: **regras especiais por paciente/entidade**, com status "Aguardando autorização" |
| — | PDF salvo numa pasta do mês com o nome do paciente | Nosso Storage organiza por `AAAA-MM/` e gera o ZIP do mês |
| — | Descrição no padrão "01 (uma) consulta médica" | Modelo automático de descrição com o número por extenso |

---

## 2. Críticas e pontos de atenção

1. **Dois códigos vistos na nota parecem errados**, e isso precisa ir ao contador antes de produção:
   - O indicador da operação **050103** fala de "serviço sobre bem móvel material". Não combina com consulta médica.
   - O IBS/CBS **410 / 410999** significa "operação não onerosa". Uma consulta paga é onerosa.

   Em 2026 esses campos ainda têm efeito prático pequeno, mas **não vamos automatizar um possível erro em escala**. Por isso o sistema bloqueia o modo produção até o contador registrar a validação.
2. **A análise do GPT é boa e honesta.** Ela marca o que é leitura e o que é inferência. Falhou o áudio, e as falas da secretária poderiam explicar as escolhas na retenção do ISS. Pedir uma frase da secretária: "por que mexeu na retenção?".
3. **O "ok de pagamento" pode ficar quase automático.** O relatório Particular do ProntMed já traz o que foi pago e a forma. Se a importação vier desse relatório, o sistema pré-marca a forma de pagamento e a secretária só confirma. Mantemos o clique, porque está no contrato e é a nossa trava contra erro.
4. **O risco de prazo continua sendo o maior.** O Mock do emissor permite demonstrar o fluxo completo **sem conta Focus, sem certificado e sem CNPJ**. A demo não depende de nada do cliente.
5. **O blueprint antigo dizia "integrar ao ambiente do aluno".** Isso não se aplica aqui. **Decisão:** é um app próprio do cliente, separado do goable.ai/fu. A gestão da entrega continua no painel /fu, como qualquer cliente.

---

## 3. Decisões tomadas (autonomia)

| # | Decisão | Por quê |
|---|---|---|
| D1 | App Lovable próprio do cliente, nome provisório **"Notas BNaves"** | Isolamento de dados sensíveis; o cliente pode ter domínio próprio |
| D2 | Emissão pela **Focus NFe (NFS-e Nacional)**, atrás de um adapter, com **MockEmissor** como padrão | Evita assinar XML e montar mTLS por conta própria; a demo não depende de conta |
| D3 | O certificado A1 é cadastrado **no painel da Focus**, nunca no nosso banco | Segurança; nenhum arquivo .pfx sob nossa guarda |
| D4 | Se o certificado for token (A3), **recomendar a compra de um A1** | Não vamos construir agente local na V1 |
| D5 | Importação por CSV/XLSX (com mapeamento salvo) **+ PDF/print lido pela Lovable AI** + manual | Funciona com qualquer coisa que o ProntMed exporte, até um print de tela |
| D6 | "Completar cadastro" colando o texto da ficha do ProntMed, com a IA extraindo os campos | Resolve CPF e endereço sem digitação e sem API |
| D7 | WhatsApp envia **link assinado (7 dias)**, nunca o PDF anexado; a mensagem pede o e-mail do paciente | Respeita a preocupação do Dr. Bruno com dado sensível no WhatsApp |
| D8 | Login único + **seletor de operador** por sessão + auditoria | Rastreabilidade sem obrigar dois logins |
| D9 | Produção bloqueada até o contador validar os parâmetros | Não escalar erro fiscal |
| D10 | Robô no ProntMed e integração com maquininha/Pix ficam na **fase 2** | Fora do contrato da V1 |
| D11 | Serviços com campo `genero` (a/o) para a descrição por extenso ("01 (uma) consulta", "01 (um) procedimento") | Detalhe que evita nota com texto errado |

---

## 4. As 8 mensagens

| Msg | Entrega | Modelo / esforço | Depende do cliente? | Arquivos que acompanham |
|---|---|---|---|---|
| **M0** | Blueprint: base, auth, layout, rotas, design, tela Hoje com dados fictícios | **Sonnet · médio** | Não | `00_BLUEPRINT_notas_dr_bruno.md` |
| **M1** | Todas as tabelas `nf_`, enums de status, RLS, seeds (JSON), server functions centrais, auditoria, operadores no banco | **Opus · alto** | Não | `parametros_fiscais_seed.json`, `M1_banco.md` |
| **M2** | Configurações (emitente, médicos, serviços, parâmetros versionados, alíquota do mês, regras especiais, textos) + Pacientes (CRUD, validação de CPF, ViaCEP, "completar pela ficha" via Lovable AI) | **Sonnet · alto** | Não | `M2_config_pacientes.md` |
| **M3** | Importação: upload, CSV/XLSX com mapeamento de colunas salvo, PDF/imagem via Lovable AI, prévia, dedup, casamento de paciente/serviço/médico; tela Hoje real com ok de pagamento | **Opus · alto** | Ajuste fino quando chegar o relatório real | `M3_importacao.md`, `exemplo_relatorio_ficticio.csv` |
| **M4** | Conferência com bloqueios; adapter `EmissorNFSe` (Mock + Focus); fila de emissão idempotente; webhook; PDF/XML no Storage; cancelar e reemitir; emissão avulsa | **Opus · extra** | Não para o Mock; sim para homologação Focus | `M4_emissao.md`, `adapter_contrato.ts` |
| **M5** | Envio: Resend (PDF anexado), WhatsApp Cloud API (template utility + link assinado), regra e-mail→WhatsApp, reenvio, log em `nf_envios` | **Sonnet · alto** | Remetente e número, só para produção | `M5_envio.md`, `templates_mensagens.md` |
| **M6** | Histórico mensal (por médico, serviço e forma de pagamento), exportação XLSX, ZIP de XML/PDF do mês, painel de auditoria | **Sonnet · médio** | Não | `M6_historico.md` |
| **M7** | Polimento e QA ponta a ponta (roteiro de 15 casos), mensagens de erro em português simples, checklist de produção, troca de modo | **Sonnet · alto** | Sim (go-live) | `M7_qa_golive.md` |

**Demo para o cliente:** depois da **M5**, em modo Mock, com 10 atendimentos fictícios, mostrando importar → ok → conferir → emitir → PDF → e-mail/WhatsApp. São 6 mensagens, cerca de 3 a 4 dias úteis.
**Produção:** depois da M7, com a conta Focus ativa, o certificado no painel Focus, o CNPJ e a validação do contador. Recomendo **1 semana em paralelo**: o sistema emite em homologação e a secretária confere contra o processo manual.

---

## 5. O que pedir ao cliente agora (4 itens)

1. **CNPJ e inscrição municipal**, e se a filha emite pelo mesmo CNPJ.
2. **Certificado: A1 ou token?** Uma foto da tela basta. Se for token, recomendar comprar um A1.
3. **Exportar o Relatório Financeiro > Particular de um dia** (Excel, PDF ou print), enviado por canal seguro.
4. **Contato do contador**, para validar os 2 códigos duvidosos, a lista de serviços que geram nota, as regras AMAGIS/DESBAN e a alíquota de outubro.

O e-mail remetente e o número do WhatsApp só são necessários na M7.

---

## 6. Contas e custos que a Goable abre

- **Focus NFe:** conta, token de homologação e depois de produção. Cotar o plano para cerca de 220 notas por mês.
- **Resend:** domínio de envio. Pode ser o domínio do consultório, se ele tiver, ou um subdomínio da Goable na demo.
- **Meta WhatsApp Cloud API:** número do consultório e template utility aprovado.
- **Lovable Cloud:** projeto novo.

## 7. Fase 2 (fora da V1, para a proposta do adicional)

Robô Playwright no ProntMed com usuário Goable (n8n ou worker): importação automática diária · baixa automática de pagamento (Pix/maquininha) · anexar o PDF na ficha do paciente no ProntMed · portal do paciente para baixar as notas.
