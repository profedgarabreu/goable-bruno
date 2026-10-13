<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Notas BNaves architecture
- Keep protected pages under the integration-compatible `_authenticated` gate and the operator-gated `_workspace` subtree; the only `/` is its index, because this is a private operational app with no public landing page.
- Keep `/login` as the public login and `/auth` as its redirect alias, preserving the integration gate's default destination.
- Store authorization roles only in protected `public.user_roles`, never editable profiles or client storage; `nf_perfis` contains identity fields only to prevent privilege escalation.
- Bootstrap the first registered account as Goable administrator and serialize signup using a database advisory lock; subsequent account creation requires trusted app metadata supplied by an authenticated admin server function.
- Keep M0 appointment examples static and fiscal business pages empty until their milestones; Pendências is independently persisted and never applies answers to fiscal settings.
- Centralize visual tokens in global CSS and clinic presentation in shared modules; route modules own their unique metadata.
- Scope Pendências items to a client link; capability-token server functions exclusively serve anonymous clients, while authenticated admin functions verify protected user_roles before any privileged work.
- Keep Pendências field validation shared and server-enforced, response/history writes transactional, and private attachment quotas serialized per item to prevent concurrent upload bypasses.
- Build response ZIPs in the authenticated browser with fflate and individually authorized file downloads to avoid buffering the whole archive in a server worker.
- Keep notes-module business rules (CPF, descriptions, blockers, status transitions, dedup key) pure in `src/lib/notas/rules.ts` and enforce them in server functions so they stay unit-testable and server-authoritative.
- Declare every server function as a literal `createServerFn(...)` chain at its export; factory wrappers hide it from the compiler and make handlers run in the browser.
- Version fiscal parameters through the `nf_parametro_nova_versao` database function, never in-place edits, so issued notes keep pointing at the exact version used.
- Mark fictional demo rows with `demo=true` and remove them only through the admin `limparDadosDemo` function before production.
- Gate admin-created accounts with a short-lived `nf_convites_acesso` row checked by `nf_guard_signup`, because the auth service inserts users before custom app metadata is available to the trigger.
- Keep the clinic-login write matrix (which tables/columns `consultorio` may change) in `salvarCadastro` and mirror it only cosmetically in the UI, so permissions stay server-authoritative.
- Process pasted ProntMed records only in memory (`extrairFicha`), drop values not literally present in the text, and audit only changed patient fields, so health record text is never persisted.
- Talk to fiscal issuers only through the `EmissorNFSe` adapters in `src/lib/notas/emissor/` (Focus field mapping isolated in `focusMapper.ts`), so swapping provider or mode never touches screens.
- Create batches and notes only via the `nf_criar_lote` database function (advisory lock + batch key + one-active-note-per-appointment unique index); retries reuse `ref_externa`, corrected re-issues get a new one and mark the old note `substituida`, to keep emission idempotent.
- Each note is processed by an atomic claim (`pendente`→`processando`) before contacting the issuer, and its `ambiente` is fixed at creation, so double clicks, refreshes and webhooks never send twice or switch environment.
- Deliver notes only through the channel adapters in `src/lib/notas/envio/` (real sender chosen only when its secrets exist, otherwise simulated) and record every attempt in `nf_envios` with the rendered content, so delivery is auditable without real providers.
- Validate public patient-link CPF digits only via the service-role-only `nf_link_paciente_verificar` function (row lock + failure counter), so guesses are serialized and anon never reads note tables.
- Invitations are `nf_convites_acesso` rows with a 7-day expiry, opened via `/login?convite=<email>`; account deactivation uses an auth ban instead of deletion, so audit history keeps its user ids.
- Full audit-log reads are admin-only at the RLS level (clinic logins only see fiscal-parameter version authors), because audit rows contain full CPFs.
- Subdirectories have their own `AGENTS.md`; read it before changing files there.
