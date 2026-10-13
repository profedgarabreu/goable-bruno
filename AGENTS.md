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
