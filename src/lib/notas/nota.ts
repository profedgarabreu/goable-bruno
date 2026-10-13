// Pure note assembly and error translation. No I/O: server functions and tests share it.
import {montarDescricao,somenteDigitos,formatarCPF,type Genero} from './rules';

export type Ambiente='mock'|'homologacao'|'producao';
export type NotaPayload={
 referencia:string;
 ambiente:Ambiente;
 competencia:string; // AAAA-MM-DD (data do atendimento)
 prestador:{razao_social:string;cnpj:string|null;inscricao_municipal:string|null;municipio_ibge:string;regime:string};
 tomador:{tipo:'cpf'|'cnpj';documento:string;nome:string;endereco:{cep:string|null;logradouro:string|null;numero:string|null;complemento:string|null;bairro:string|null;municipio_ibge:string|null;municipio_nome:string|null;uf:string|null}|null;email:string|null;telefone:string|null};
 paciente:{nome:string;cpf:string|null};
 servico:{c_trib_nac:string;c_trib_mun:string|null;nbs:string|null;c_ind_op:string|null;municipio_incidencia_ibge:string;trib_issqn:string;regime_especial:string;exigibilidade_suspensa:boolean;descricao:string};
 valores:{servico:number;iss_retido:boolean;pis_cofins_cst:string|null;pis_cofins_csll_retencao:string|null;ibscbs_cst:string|null;ibscbs_class_trib:string|null;aliquota_simples:number;valor_aprox_tributos:number};
};

export type EntradaNota={
 atendimento:{data_atendimento:string;valor:number;quantidade:number};
 servico:{descricao_nota:string;genero:Genero};
 paciente:{nome:string;cpf:string|null;cep:string|null;logradouro:string|null;numero:string|null;complemento:string|null;bairro:string|null;municipio_ibge:string|null;municipio_nome:string|null;uf:string|null;email:string|null;celular:string|null};
 regra:{ativo:boolean;iss_retido:boolean;tomador_cnpj:string|null;tomador_nome:string|null}|null;
 emitente:{razao_social:string;cnpj:string|null;inscricao_municipal:string|null;municipio_ibge:string;regime:string};
 parametro:{c_trib_nac:string;c_trib_mun:string|null;nbs:string|null;c_ind_op:string|null;municipio_incidencia_ibge:string;trib_issqn:string;regime_especial:string;exigibilidade_suspensa:boolean;iss_retido:boolean;pis_cofins_cst:string|null;pis_cofins_csll_retencao:string|null;ibscbs_cst:string|null;ibscbs_class_trib:string|null};
 aliquota:number;
 referencia:string;
 ambiente:Ambiente;
};

const arred=(n:number)=>Math.round(n*100)/100;

export function montarNota(e:EntradaNota):NotaPayload{
 const p=e.paciente;const regra=e.regra?.ativo?e.regra:null;
 const pj=!!(regra&&somenteDigitos(regra.tomador_cnpj).length===14);
 const base=montarDescricao(e.atendimento.quantidade,e.servico);
 const cpf=somenteDigitos(p.cpf)||null;
 const descricao=pj?`${base} — paciente: ${p.nome}${cpf?`, CPF ${formatarCPF(cpf)}`:''}`:base;
 const valor=arred(e.atendimento.valor);
 return {
  referencia:e.referencia,ambiente:e.ambiente,competencia:e.atendimento.data_atendimento,
  prestador:{razao_social:e.emitente.razao_social,cnpj:somenteDigitos(e.emitente.cnpj)||null,inscricao_municipal:e.emitente.inscricao_municipal,municipio_ibge:e.emitente.municipio_ibge,regime:e.emitente.regime},
  tomador:pj?{tipo:'cnpj',documento:somenteDigitos(regra!.tomador_cnpj),nome:regra!.tomador_nome||'Tomador PJ',endereco:null,email:null,telefone:null}
   :{tipo:'cpf',documento:cpf??'',nome:p.nome,endereco:{cep:somenteDigitos(p.cep)||null,logradouro:p.logradouro,numero:p.numero,complemento:p.complemento,bairro:p.bairro,municipio_ibge:p.municipio_ibge,municipio_nome:p.municipio_nome,uf:p.uf},email:p.email,telefone:somenteDigitos(p.celular)||null},
  paciente:{nome:p.nome,cpf},
  servico:{c_trib_nac:e.parametro.c_trib_nac,c_trib_mun:e.parametro.c_trib_mun,nbs:e.parametro.nbs,c_ind_op:e.parametro.c_ind_op,municipio_incidencia_ibge:e.parametro.municipio_incidencia_ibge,trib_issqn:e.parametro.trib_issqn,regime_especial:e.parametro.regime_especial,exigibilidade_suspensa:e.parametro.exigibilidade_suspensa,descricao},
  valores:{servico:valor,iss_retido:e.parametro.iss_retido||!!regra?.iss_retido,pis_cofins_cst:e.parametro.pis_cofins_cst,pis_cofins_csll_retencao:e.parametro.pis_cofins_csll_retencao,ibscbs_cst:e.parametro.ibscbs_cst,ibscbs_class_trib:e.parametro.ibscbs_class_trib,aliquota_simples:e.aliquota,valor_aprox_tributos:arred(valor*e.aliquota/100)},
 };
}

/** Plain-Portuguese messages for common issuer errors; the original stays in nf_notas.resposta. */
const errosConhecidos:[RegExp,string][]=[
 [/E0160|cpf.*tomador/i,'O CPF do paciente foi recusado. Confira o CPF no cadastro e tente de novo.'],
 [/cnpj.*prestador|E0040/i,'O CNPJ do consultório não foi aceito. Fale com a Goable.'],
 [/certificado/i,'Problema com o certificado digital do consultório. Fale com a Goable.'],
 [/cep|endere/i,'O endereço do paciente foi recusado. Confira CEP, rua e número.'],
 [/token|autentica|401|403/i,'O emissor recusou o acesso. Fale com a Goable.'],
 [/timeout|indispon|503|502|fetch failed/i,'O emissor está fora do ar agora. Tente de novo em alguns minutos.'],
];
export function traduzirErro(msg:string|null|undefined){
 const m=msg??'';for(const [re,t] of errosConhecidos)if(re.test(m))return t;
 return m?`O emissor recusou a nota: ${m}`:'O emissor recusou a nota por um motivo não informado.';
}

export const motivosCancelamento=['CPF incorreto','Valor incorreto','Serviço incorreto','Emitida em duplicidade','Outro'] as const;
