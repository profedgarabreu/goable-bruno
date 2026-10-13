// Isolated mapping between our neutral NotaPayload and the Focus NFe "NFSe Nacional" API
// (POST /v2/nfsen?ref=, GET /v2/nfsen/{ref}, DELETE /v2/nfsen/{ref}).
// Field names follow the public example in FocusNFe/api-doc (_nfsen.md). Items marked
// "CONFIRMAR NA DOC" must be checked against doc.focusnfe.com.br before homologação.
import type {NotaPayload} from '../nota';
import type {ResultadoEmissao} from './types';

export const focusBaseUrl=(ambiente:'homologacao'|'producao')=>ambiente==='producao'?'https://api.focusnfe.com.br':'https://homologacao.focusnfe.com.br';

const simplesOpcao:Record<string,number>={mei:1,simples_me_epp:2}; // CONFIRMAR NA DOC: 1=MEI, 2=ME/EPP, 3=não optante?
const tributacaoIss:Record<string,number>={operacao_tributavel:1,imunidade:2,exportacao:3,nao_incidencia:4}; // CONFIRMAR NA DOC
const regimeEspecial:Record<string,number>={nenhum:0}; // CONFIRMAR NA DOC

export function paraFocus(p:NotaPayload){
 const t=p.tomador;const end=t.endereco;
 const corpo:Record<string,unknown>={
  data_emissao:new Date().toISOString(),
  data_competencia:p.competencia,
  codigo_municipio_emissora:Number(p.prestador.municipio_ibge),
  cnpj_prestador:p.prestador.cnpj,
  inscricao_municipal_prestador:p.prestador.inscricao_municipal??undefined,
  codigo_opcao_simples_nacional:simplesOpcao[p.prestador.regime]??3,
  regime_especial_tributacao:regimeEspecial[p.servico.regime_especial]??0,
  [t.tipo==='cnpj'?'cnpj_tomador':'cpf_tomador']:t.documento,
  razao_social_tomador:t.nome,
  codigo_municipio_tomador:end?.municipio_ibge?Number(end.municipio_ibge):undefined,
  cep_tomador:end?.cep??undefined,
  logradouro_tomador:end?.logradouro??undefined,
  numero_tomador:end?.numero??undefined,
  complemento_tomador:end?.complemento??undefined,
  bairro_tomador:end?.bairro??undefined,
  telefone_tomador:t.telefone??undefined,
  email_tomador:t.email??undefined,
  codigo_municipio_prestacao:Number(p.servico.municipio_incidencia_ibge),
  codigo_tributacao_nacional_iss:p.servico.c_trib_nac.replace(/\D/g,''), // example uses 6 digits without dots
  codigo_tributacao_municipal_iss:p.servico.c_trib_mun?.replace(/\D/g,'')||undefined, // CONFIRMAR NA DOC: nome do campo e se BH exige
  codigo_nbs:p.servico.nbs??undefined, // CONFIRMAR NA DOC
  descricao_servico:p.servico.descricao,
  valor_servico:p.valores.servico,
  tributacao_iss:tributacaoIss[p.servico.trib_issqn]??1,
  tipo_retencao_iss:p.valores.iss_retido?2:1, // CONFIRMAR NA DOC: 1=não retido, 2=retido pelo tomador
  exigibilidade_suspensa:p.servico.exigibilidade_suspensa?1:undefined, // CONFIRMAR NA DOC
  pis_cofins_situacao_tributaria:p.valores.pis_cofins_cst??undefined, // CONFIRMAR NA DOC
  percentual_total_tributos_simples_nacional:p.valores.aliquota_simples, // CONFIRMAR NA DOC
  valor_total_tributos:p.valores.valor_aprox_tributos, // CONFIRMAR NA DOC
  ibs_cbs_situacao_tributaria:p.valores.ibscbs_cst??undefined, // CONFIRMAR NA DOC (campo RT)
  ibs_cbs_classificacao_tributaria:p.valores.ibscbs_class_trib??undefined, // CONFIRMAR NA DOC (campo RT)
  codigo_indicador_operacao:p.servico.c_ind_op??undefined, // CONFIRMAR NA DOC (campo RT)
 };
 for(const k of Object.keys(corpo))if(corpo[k]===undefined||corpo[k]===null)delete corpo[k];
 return corpo;
}

type FocusResposta={status?:string;numero?:string|number;codigo_verificacao?:string;chave_nfse?:string;url?:string;url_danfse?:string;caminho_xml_nota_fiscal?:string;mensagem?:string;codigo?:string;erros?:{codigo?:string;mensagem?:string}[]};

export function deFocus(r:FocusResposta):ResultadoEmissao{
 const s=r.status??'';
 if(s==='autorizado')return {status:'autorizada',numero:r.numero!=null?String(r.numero):undefined,chave:r.chave_nfse??r.codigo_verificacao,bruto:r}; // CONFIRMAR NA DOC: nome do campo da chave de 50 dígitos
 if(s==='processando_autorizacao')return {status:'processando',bruto:r};
 const erro=r.erros?.map(e=>[e.codigo,e.mensagem].filter(Boolean).join(' — ')).join('; ')||[r.codigo,r.mensagem].filter(Boolean).join(' — ')||s||'Erro desconhecido';
 return {status:'erro',mensagem:erro,bruto:r};
}
