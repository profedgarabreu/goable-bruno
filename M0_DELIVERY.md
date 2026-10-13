# M0 — Notas BNaves

## Entrega
- Telas: `/login`, `/operador`, `/`, `/importar`, `/conferencia`, `/notas`, `/pacientes`, `/historico`, `/configuracoes`.
- Complementares: `/auth` redireciona para `/login`; `/senha` permite redefinir senha por link de recuperação.
- Login real por e-mail e senha, confirmação de e-mail mantida, cadastro público apenas para o primeiro usuário. Primeiro acesso é administrador Goable; ele pode criar acessos do consultório em Configurações.
- Marli e Cíntia em seleção por sessão; operadora no topo, troca e saída.
- Design claro Inter, teal e laranja, banner permanente de demonstração, CPFs mascarados e oito atendimentos fictícios na tela Hoje.
- nf_perfis e user_roles com RLS. Nenhuma tabela operacional ou integração fiscal foi criada.

## Arquivos principais
- src/styles.css: tokens e layout.
- src/components/clinic/: identidade, layout, operadora e estados vazios.
- src/routes/login.tsx, auth.tsx, senha.tsx: acesso público.
- src/routes/_authenticated/: operadora, proteção e páginas internas.
- src/lib/clinic.ts: exemplos, formatos e metadados.
- src/lib/auth.functions.ts: criação de acesso restrita à administração.
- drizzle/migrations/: fundação de perfis, permissões e registro inicial.
- src/test/clinic.test.ts: quatro testes de regras.
- BLUEPRINT.md, DEVELOPMENT_PLAN.md, src/lib/parametros_fiscais_seed.json: documentos preservados para próximas etapas.

## Decisões e desvios
- Papel separado de nf_perfis, em user_roles, para impedir alteração indevida de privilégios.
- Primeiro usuário é administrador Goable; cadastro posterior exige validação administrativa no servidor.
- Hoje está no índice protegido, mantendo URL `/`, sem página pública de apresentação.
- Funções especiais de registro protegidas por bloqueio transacional para evitar dois primeiros usuários simultâneos.
- Foto ilustrativa gerada para a tela de acesso, não uma fotografia real do consultório.
- Dados fiscais não importados; implementação aguarda M1. Funcionalidade operacional aguarda M2–M7.

## Verificação
- Cinco testes automatizados passaram.
- Login por senha, redirecionamento para operadora, escolha Marli, troca para Cíntia, busca, navegação por todas as telas e logout exercitados com uma conta temporária, removida ao final.
- Segundo cadastro não autorizado foi rejeitado no servidor.
- RLS confirmado nas duas tabelas. Funções de autorização e indicador público de cadastro aberto têm permissões intencionais; funções de gatilho não podem ser chamadas por anon/authenticated.
- Sem erros de execução no navegador; desktop 1366×768 e celular 390×844 sem transbordamento horizontal da página.
- Entrega de confirmação a uma caixa de e-mail real e recuperação por e-mail permanecem não verificadas; não houve desativação da confirmação de usuários reais.