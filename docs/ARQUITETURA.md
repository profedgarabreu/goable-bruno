# Notas BNaves — Arquitetura

## Stack
TanStack Start (React 19, SSR em Cloudflare Workers) + Lovable Cloud (Postgres, Auth, Storage). Lógica de servidor em `createServerFn` (`src/lib/**/*.functions.ts`). Regras puras e testadas em `src/lib/notas/*.ts` (vitest em `src/test/`).

## Acesso e papéis
- Login por e-mail e senha. O cadastro só funciona com convite (`nf_convites_acesso`, validade de 7 dias, criado na aba Usuários) ou com o e-mail da allowlist `nf_admin_bootstrap` enquanto não existir admin. Os gatilhos `nf_guard_signup` e `nf_create_profile` aplicam essa regra no banco.
- Papéis ficam somente em `user_roles` (`consultorio`, `admin_goable`), verificados por `nf_has_role` nas políticas de RLS e por `exigirPapel` nas server functions.
- O anon não tem nenhum grant em tabelas `nf_`/`pend_`. Os únicos pontos públicos são `/login`, `/responder/:token` (pendências, por token) e `/nota/:token` (paciente, por token + 3 dígitos do CPF via `nf_link_paciente_verificar`).

## Tabelas principais
| Tabela | Papel |
|---|---|
| `nf_emitente` | Linha única: dados do consultório, `emissor_modo`, `envio_automatico`, `whatsapp_somente_email` |
| `nf_parametros_fiscais` | Versionada (`nf_parametro_nova_versao`): editar cria uma nova versão |
| `nf_aliquota_mes` | Alíquota do Simples por competência |
| `nf_servicos`, `nf_medicos`, `nf_regras_especiais`, `nf_operadores`, `nf_textos_envio` | Cadastros |
| `nf_pacientes`, `nf_atendimentos` | Operação. `hash_dedup` único evita importação duplicada. `demo=true` marca dados fictícios |
| `nf_importacoes`, `nf_mapeamentos_importacao` | Arquivos importados e mapeamentos de colunas |
| `nf_lotes`, `nf_notas` | Emissão (`nf_criar_lote`: lock + chave idempotente + 1 nota ativa por atendimento) |
| `nf_envios`, `nf_links_paciente` | Entregas (conteúdo renderizado) e links seguros |
| `nf_auditoria` | Toda alteração, com operador. Leitura completa só para admin |
| `pend_*` | Central de Pendências (independente do fiscal) |

Buckets privados: `notas` (`AAAA-MM/<nota_id>.pdf|xml`), `importacoes` e `pendencias`. Os arquivos só saem por URL assinada.

## Fluxos
```text
Importar ─► atendimentos (importado/cadastro_pendente/aguardando_pagamento/nao_gera_nota)
Hoje: Pago ─► pago_ok | aguardando_autorizacao ─(Liberar)─► pago_ok
Conferência: checarBloqueios ─► Aprovar ─► nf_criar_lote ─► claim pendente→processando ─► Emissor
Emissor: autorizada ─► PDF/XML no Storage ─► envio automático (e-mail | WhatsApp+link | sem_contato)
         erro ─► mensagem em português ─► Tentar de novo (mesma ref) | Corrigir
Notas: Cancelar (motivo) | Reemitir corrigida (nova ref, antiga = substituida)
Histórico: carregarMes ─► telas, XLSX, CSV, ZIP (montado no navegador)
```

## Adapters
- **Emissor** (`src/lib/notas/emissor/`): `MockEmissor` (DANFSe com marca d'água, erro determinístico para CPF terminado em 00) e `FocusEmissor` (NFS-e Nacional, mapeamento isolado em `focusMapper.ts`). A escolha segue o `ambiente` gravado na nota.
- **Envio** (`src/lib/notas/envio/`): `ResendSender`/`MetaCloudSender` quando os secrets existem, senão simulados. Toda tentativa é registrada em `nf_envios`.
- **IA** (Lovable AI): leitura da ficha do ProntMed e visão do relatório. Só extrai o que está literalmente no texto, e o texto colado nunca é salvo.

## Demonstração
`prepararDemonstracao` (admin, só em modo mock) garante os 12 pacientes e os 10 atendimentos de hoje e gera o histórico do mês anterior até ontem (8–12 por dia útil, plano determinístico em `demo.ts`). Os dias já existentes são pulados, então rodar de novo não duplica. As notas de histórico nascem sem arquivo: PDF/XML são gerados no primeiro acesso (`garantirArquivos`). `limparDadosDemo` remove tudo o que tem `demo=true`.

## Secrets
Veja `docs/GO_LIVE.md`. Sem os secrets, os modos homologação/produção e os envios reais ficam indisponíveis, com o motivo exibido na tela.

## Decisões
Veja `AGENTS.md` (uma regra por decisão, com o porquê).
