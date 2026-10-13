// Pure go-live checklist evaluation (tested). Server collects the facts; this decides ✅/⚠️/❌.
export type EstadoChecklist={
 cnpj:boolean;inscricao:boolean;validado:boolean;competencia:string;aliquota:{informado_por:string}|null;
 focusHomologacao:boolean;notasHomologacao:number;webhook:boolean;focusProducao:boolean;
 resend:boolean;remetente:boolean;emailTesteEnviado:boolean;whatsapp:boolean;somenteEmail:boolean;
 demo:number;consultoriosAtivos:number;essenciaisAbertas:number;modo:string;
};
export type ItemChecklist={n:number;titulo:string;status:'ok'|'aviso'|'falta';explicacao:string;link:{rotulo:string;to:string;aba?:string}|null};

export function avaliarChecklist(e:EstadoChecklist):ItemChecklist[]{
 const s=(v:boolean):'ok'|'falta'=>v?'ok':'falta';
 const cfg=(aba:string,rotulo='Resolver')=>({rotulo,to:'/configuracoes',aba});
 const aliqDemo=!!e.aliquota&&/demo/i.test(e.aliquota.informado_por);
 return [
  {n:1,titulo:'CNPJ e inscrição municipal',status:s(e.cnpj&&e.inscricao),explicacao:e.cnpj&&e.inscricao?'Dados do emitente completos.':`Falta: ${[!e.cnpj&&'CNPJ',!e.inscricao&&'inscrição municipal'].filter(Boolean).join(' e ')}.`,link:cfg('emitente','Editar emitente')},
  {n:2,titulo:'Parâmetros fiscais validados pelo contador',status:s(e.validado),explicacao:e.validado?'Validação registrada.':'O contador ainda não conferiu os parâmetros fiscais.',link:cfg('emitente','Registrar validação')},
  {n:3,titulo:`Alíquota de ${e.competencia} informada`,status:!e.aliquota?'falta':aliqDemo?'aviso':'ok',explicacao:!e.aliquota?'A alíquota do mês corrente não foi informada.':aliqDemo?'A alíquota atual é a de demonstração. Informe o valor real do contador.':'Alíquota real do mês informada.',link:cfg('aliquota','Informar alíquota')},
  {n:4,titulo:'Token de homologação da Focus',status:s(e.focusHomologacao),explicacao:e.focusHomologacao?'Configurado.':'Cadastrar o secret FOCUS_NFE_TOKEN_HOMOLOGACAO (ver docs/GO_LIVE.md).',link:null},
  {n:5,titulo:'1 nota autorizada em homologação',status:s(e.notasHomologacao>0),explicacao:e.notasHomologacao>0?`${e.notasHomologacao} nota(s) de teste autorizada(s).`:'Emita ao menos uma nota real no ambiente de testes da Receita.',link:{rotulo:'Ir para a conferência',to:'/conferencia'}},
  {n:6,titulo:'Webhook secret configurado',status:s(e.webhook),explicacao:e.webhook?'Configurado.':'Cadastrar o secret FOCUS_WEBHOOK_SECRET e o webhook na Focus.',link:null},
  {n:7,titulo:'Token de produção da Focus',status:s(e.focusProducao),explicacao:e.focusProducao?'Configurado.':'Cadastrar o secret FOCUS_NFE_TOKEN_PRODUCAO.',link:null},
  {n:8,titulo:'E-mail real ativo e testado',status:e.resend&&e.remetente&&e.emailTesteEnviado?'ok':e.resend&&e.remetente?'aviso':'falta',explicacao:!e.resend?'Falta o secret RESEND_API_KEY.':!e.remetente?'Falta o e-mail remetente na aba Emitente.':!e.emailTesteEnviado?'Envie um e-mail de teste pela aba Textos de envio.':'E-mail real ativo e teste enviado.',link:cfg('textos','Enviar teste')},
  {n:9,titulo:'WhatsApp real ou "só e-mail por enquanto"',status:e.whatsapp||e.somenteEmail?'ok':'falta',explicacao:e.whatsapp?'WhatsApp real ativo.':e.somenteEmail?'Marcado como "só e-mail por enquanto".':'Configure META_WA_TOKEN, META_WA_PHONE_ID e META_WA_TEMPLATE ou marque "só e-mail por enquanto".',link:null},
  {n:10,titulo:'Dados de demonstração apagados',status:s(e.demo===0),explicacao:e.demo===0?'Nenhum dado fictício.':`${e.demo} registros fictícios ainda no sistema.`,link:cfg('emitente','Limpar demonstração')},
  {n:11,titulo:'1 usuário do consultório ativo',status:s(e.consultoriosAtivos>0),explicacao:e.consultoriosAtivos>0?`${e.consultoriosAtivos} acesso(s) do consultório ativo(s).`:'Convide as secretárias pela aba Usuários.',link:cfg('usuarios','Convidar')},
  {n:12,titulo:'Pendências essenciais resolvidas',status:s(e.essenciaisAbertas===0),explicacao:e.essenciaisAbertas===0?'Todas resolvidas.':`${e.essenciaisAbertas} pendência(s) essencial(is) em aberto.`,link:{rotulo:'Ver pendências',to:'/pendencias'}},
 ];
}
export const podeAtivar=(itens:ItemChecklist[])=>itens.every(i=>i.status==='ok');
