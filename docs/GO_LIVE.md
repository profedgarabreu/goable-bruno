# Ida para produção — checklist detalhado

A aba **Configurações → Ida para produção** (só admin Goable) calcula cada item automaticamente. O botão **Ativar produção** só fica liberado quando todos os itens estiverem ✅ e pede que se digite `PRODUÇÃO`.

## Como cadastrar secrets
Os secrets ficam nas configurações do projeto no Lovable (**Project Settings → Secrets**), nunca no código. Depois de salvar um secret, recarregue o app: o checklist e a aba Emitente leem os secrets no servidor.

| Secret | Uso |
|---|---|
| `FOCUS_NFE_TOKEN_HOMOLOGACAO` | Token da Focus NFe do ambiente de homologação |
| `FOCUS_NFE_TOKEN_PRODUCAO` | Token da Focus NFe de produção |
| `FOCUS_WEBHOOK_SECRET` | Valor que a Focus envia no header `X-Webhook-Secret` |
| `RESEND_API_KEY` | Envio real de e-mail (domínio do remetente verificado no Resend) |
| `META_WA_TOKEN`, `META_WA_PHONE_ID`, `META_WA_TEMPLATE` | WhatsApp Cloud API (template utility com parâmetros nome, data e link) |

## Os 12 itens

1. **CNPJ e inscrição municipal**: Configurações → Emitente → Editar emitente.
2. **Parâmetros fiscais validados pelo contador**: o contador confere a aba Parâmetros fiscais (em especial `c_trib_mun`, `c_ind_op`, `ibscbs_cst`, `ibscbs_class_trib`). Depois, Emitente → **Registrar validação do contador**.
3. **Alíquota do mês corrente**: Configurações → Alíquota do mês. Fica ⚠️ enquanto a alíquota for a de demonstração (texto "demo" em "informado por").
4. **Token de homologação**: cadastrar `FOCUS_NFE_TOKEN_HOMOLOGACAO`.
5. **1 nota autorizada em homologação**: em Emitente → Modo do emissor, escolha **Homologação**. Emita 1 nota real pela Conferência e confira o PDF. Revise antes os campos marcados `// CONFIRMAR NA DOC` em `src/lib/notas/emissor/focusMapper.ts`.
6. **Webhook**: cadastrar `FOCUS_WEBHOOK_SECRET`. No painel da Focus, crie um gatilho NFS-e apontando para `https://<domínio publicado>/api/webhooks/emissor`, com o header `X-Webhook-Secret: <mesmo valor>`. Sem o secret, a rota responde 503; com secret errado, 401. O polling continua funcionando como reserva.
7. **Token de produção**: cadastrar `FOCUS_NFE_TOKEN_PRODUCAO` (com o certificado digital A1 do consultório carregado no painel da Focus).
8. **E-mail real**: cadastrar `RESEND_API_KEY`, verificar o domínio do remetente no Resend e preencher o e-mail remetente na aba Emitente. Depois, Textos de envio → **Enviar e-mail de teste**. O item só fica ✅ após um teste com status "enviado".
9. **WhatsApp**: cadastrar os 3 secrets da Meta **ou** ligar "Só e-mail por enquanto" no próprio checklist. Sem WhatsApp, pacientes sem e-mail ficam "Sem contato" para envio manual.
10. **Dados de demonstração apagados**: Emitente → **Limpar dados de demonstração** (digite LIMPAR). Apaga pacientes, atendimentos, notas, envios e arquivos fictícios.
11. **1 usuário do consultório ativo**: Configurações → Usuários → **Convidar** (papel Consultório). A secretária abre o link, cria a senha e confirma o e-mail.
12. **Pendências essenciais resolvidas**: em /pendencias, todos os itens "Essenciais" devem estar **Resolvidos**.

## Ativação
Com tudo ✅, clique em **Ativar produção** e digite `PRODUÇÃO`. A faixa "Demonstração/Homologação" some do topo. A partir daí, cada nota tem valor fiscal. Notas já criadas mantêm o ambiente em que nasceram.
