# M0 — Notas BNaves
- [x] Email/password login and protected profile/role foundation; first-user-only registration.
- [x] Operator session selection, navigation, demonstration banner and design tokens.
- [x] Nine requested pages; Today with eight fictional rows; remaining operational pages empty.
- [x] Verify sign-in, operator switching, navigation, logout, security rules and desktop/mobile layout.

M1–M7 are out of scope for this delivery. Fiscal seed retained for M1, not imported.

# M0.5 — Central de Pendências
- [x] Private schema, admin RLS, capability-token access, initial 14 questions and active client link.
- [x] Server-validated answers, revision history, private uploads and ten-minute admin downloads.
- [x] Mobile-first client form with every requested field type and progress.
- [x] Admin questions editor, status review, link management, sidebar badge and ZIP export.
- [x] Verify acceptance criteria, security and responsive layouts; deliver detailed report and client URL.

Confirmation-email delivery to a real mailbox is not verified; confirmation remains enabled. Temporary QA accounts were removed. Authorization roles are in user_roles rather than nf_perfis for safety. First account is the Goable administrator. Extra public routes /auth (alias) and /senha support managed auth and password recovery.
# M1 — Banco do módulo de notas
- [x] nf_ tables, enums, updated_at triggers, hash_dedup, RLS (admin all; clinic read/write operational; fiscal config read-only), no anon grants.
- [x] Seeds: fiscal data, rates 2026-09/10, services with gender, rules, operators, doctors, 12 demo patients, 10 demo appointments.
- [x] Private buckets notas and importacoes.
- [x] Core server functions, CRUD backend, limparDadosDemo, operator screen reading nf_operadores.
- [x] Tests and live permission checks.

## M2 — Configurações + Pacientes
- [x] 8 abas de Configurações com permissões por papel
- [x] Pacientes com busca, filtros, ViaCEP e CPF duplicado
- [x] Completar pela ficha (IA) sem guardar o texto
- [x] Faixa de alíquota em todas as telas internas
- [x] Textos de envio em tabela própria

## M4 — Conferência + Emissão
- [x] Grants anon zerados e default privileges do papel de migração ajustados
- [x] Modo do emissor (mock/homologação/produção) com bloqueios e faixa no topo
- [x] montarNota, adapters Mock (DANFSe/XML) e Focus, webhook
- [x] Conferência, aprovação idempotente, tela do lote com progresso e polling
- [x] Notas emitidas: PDF/XML assinados, cancelar, reemitir corrigida, emitir avulsa
- [ ] Homologação/produção reais — aguardando tokens da Focus NFe e segredo do webhook

## M5 — Envio ao paciente
- [x] Regra de canal (e-mail com PDF/XML → WhatsApp com link → sem contato) e envio automático configurável
- [x] Adapters Resend/Meta com modo simulado automático e estado na aba Emitente
- [x] Link seguro /nota/:token com 3 dígitos do CPF, bloqueio após 5 erros e expiração de 7 dias
- [x] Notas: badges de envio, reenviar, ver mensagem, copiar link, filtro; lote com "Enviar pendentes"; e-mail de teste
- [ ] Envio real — aguardando RESEND_API_KEY (com domínio verificado) e META_WA_TOKEN/META_WA_PHONE_ID/META_WA_TEMPLATE
