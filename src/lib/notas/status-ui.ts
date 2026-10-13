import type {StatusAtendimento} from './rules';
export const statusUI:Record<StatusAtendimento,{label:string;tone:'info'|'error'|'warning'|'success'|'muted'}>={
 importado:{label:'Importado',tone:'info'},cadastro_pendente:{label:'Cadastro pendente',tone:'error'},aguardando_pagamento:{label:'Aguardando pagamento',tone:'warning'},pago_ok:{label:'Pronto para conferir',tone:'success'},aguardando_autorizacao:{label:'Aguardando autorização',tone:'warning'},aprovado:{label:'Aprovado',tone:'info'},emitindo:{label:'Emitindo',tone:'info'},emitido:{label:'Nota emitida',tone:'info'},erro_emissao:{label:'Erro na emissão',tone:'error'},enviado:{label:'Enviada',tone:'success'},erro_envio:{label:'Erro no envio',tone:'error'},nao_gera_nota:{label:'Não gera nota',tone:'muted'},cancelado:{label:'Cancelado',tone:'muted'},
};
export const categoriasHoje=[
 {key:'completar',label:'A completar',status:['cadastro_pendente','importado']},
 {key:'pagamento',label:'Aguardando pagamento',status:['aguardando_pagamento']},
 {key:'prontas',label:'Prontas para conferir',status:['pago_ok']},
 {key:'autorizacao',label:'Aguardando autorização',status:['aguardando_autorizacao']},
 {key:'emitidas',label:'Emitidas',status:['aprovado','emitindo','emitido','erro_emissao']},
 {key:'enviadas',label:'Enviadas',status:['enviado','erro_envio']},
 {key:'semnota',label:'Sem nota',status:['nao_gera_nota','cancelado']},
] as const satisfies readonly {key:string;label:string;status:readonly StatusAtendimento[]}[];
export type CategoriaHoje=(typeof categoriasHoje)[number]['key'];
export const categoriaDe=(s:StatusAtendimento)=>categoriasHoje.find(c=>(c.status as readonly string[]).includes(s))?.key;
