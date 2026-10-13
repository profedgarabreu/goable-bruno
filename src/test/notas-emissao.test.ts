import {describe,it,expect} from 'vitest';
import {montarNota,traduzirErro,type EntradaNota,type NotaPayload} from '@/lib/notas/nota';
import {MockEmissor,chaveFicticia,type MockRegistro} from '@/lib/notas/emissor/mock';
import {paraFocus,deFocus,focusBaseUrl} from '@/lib/notas/emissor/focusMapper';
import {FocusEmissor} from '@/lib/notas/emissor/focus';
import {podeTransicionar,validarTransicao} from '@/lib/notas/rules';

const base:EntradaNota={
 atendimento:{data_atendimento:'2026-10-13',valor:470,quantidade:1},
 servico:{descricao_nota:'consulta médica',genero:'a'},
 paciente:{nome:'Ana Lúcia Ferreira',cpf:'104.332.181-00',cep:'30140-061',logradouro:'Rua dos Timbiras',numero:'1200',complemento:'apto 501',bairro:'Funcionários',municipio_ibge:'3106200',municipio_nome:'Belo Horizonte',uf:'MG',email:'ana@example.com',celular:'(31) 99876-5432'},
 regra:null,
 emitente:{razao_social:'BNAVES CONSULTORIO DE ANGIOLOGIA LTDA',cnpj:null,inscricao_municipal:null,municipio_ibge:'3106200',regime:'simples_me_epp'},
 parametro:{c_trib_nac:'04.03.03',c_trib_mun:'04.03.03.001',nbs:'123012100',c_ind_op:'050103',municipio_incidencia_ibge:'3106200',trib_issqn:'operacao_tributavel',regime_especial:'nenhum',exigibilidade_suspensa:false,iss_retido:false,pis_cofins_cst:'00',pis_cofins_csll_retencao:'0',ibscbs_cst:'410',ibscbs_class_trib:'410999'},
 aliquota:11.8,referencia:'7d0b6c1e-1111-4222-8333-444455556666',ambiente:'mock',
};

describe('montarNota',()=>{
 it('consulta normal: tomador pessoa física, descrição e tributos aproximados',()=>{
  const n=montarNota(base);
  expect(n.tomador).toMatchObject({tipo:'cpf',documento:'10433218100',nome:'Ana Lúcia Ferreira',telefone:'31998765432'});
  expect(n.tomador.endereco?.cep).toBe('30140061');
  expect(n.servico.descricao).toBe('01 (uma) consulta médica');
  expect(n.valores).toMatchObject({servico:470,iss_retido:false,aliquota_simples:11.8,valor_aprox_tributos:55.46,ibscbs_cst:'410'});
  expect(n.competencia).toBe('2026-10-13');expect(n.referencia).toBe(base.referencia);
 });
 it('regra com tomador PJ: a empresa é o tomador e o paciente vai na descrição',()=>{
  const n=montarNota({...base,regra:{ativo:true,iss_retido:false,tomador_cnpj:'11.222.333/0001-81',tomador_nome:'Empresa Exemplo'}});
  expect(n.tomador).toMatchObject({tipo:'cnpj',documento:'11222333000181',nome:'Empresa Exemplo',endereco:null});
  expect(n.servico.descricao).toBe('01 (uma) consulta médica — paciente: Ana Lúcia Ferreira, CPF 104.332.181-00');
 });
 it('ISS retido vem da regra especial (AMAGIS) ou do parâmetro',()=>{
  expect(montarNota({...base,regra:{ativo:true,iss_retido:true,tomador_cnpj:null,tomador_nome:null}}).valores.iss_retido).toBe(true);
  expect(montarNota({...base,parametro:{...base.parametro,iss_retido:true}}).valores.iss_retido).toBe(true);
  expect(montarNota({...base,regra:{ativo:false,iss_retido:true,tomador_cnpj:null,tomador_nome:null}}).valores.iss_retido).toBe(false);
 });
 it('quantidade e gênero na descrição sem pluralizar o serviço',()=>{
  expect(montarNota({...base,atendimento:{...base.atendimento,quantidade:2},servico:{descricao_nota:'retorno médico',genero:'o'}}).servico.descricao).toBe('02 (dois) retorno médico');
 });
});

function mockCom(reg:MockRegistro|null,agora:number){let seq=41;return new MockEmissor({buscar:async()=>reg,proximoNumero:async()=>++seq,agora:()=>agora});}
describe('MockEmissor e idempotência',()=>{
 const payload=montarNota(base);
 it('primeiro processando; autorizada só após ~3 s',async()=>{
  const t0=Date.parse('2026-10-13T12:00:00Z');
  expect((await mockCom(null,t0).emitir(payload)).status).toBe('processando');
  const reg={payload,enviadoEm:new Date(t0).toISOString(),numero:null,chave:null,emitidaEm:null};
  expect((await mockCom(reg,t0+1000).consultar(payload.referencia)).status).toBe('processando');
  const r=await mockCom(reg,t0+3500).consultar(payload.referencia);
  expect(r).toMatchObject({status:'autorizada',numero:'42'});expect(r.chave).toMatch(/^\d{50}$/);
 });
 it('mesma ref gera a mesma chave; nota já autorizada não ganha número novo',async()=>{
  expect(chaveFicticia(payload.referencia)).toBe(chaveFicticia(payload.referencia));
  expect(chaveFicticia(payload.referencia)).not.toBe(chaveFicticia('outra-ref'));
  const reg={payload,enviadoEm:'2026-10-13T12:00:00Z',numero:'7',chave:chaveFicticia(payload.referencia),emitidaEm:null};
  expect(await mockCom(reg,Date.now()).consultar(payload.referencia)).toMatchObject({status:'autorizada',numero:'7'});
 });
 it('CPF terminado em 00 dá erro E0160 traduzido para português',async()=>{
  const r=await mockCom(null,Date.now()).emitir({...payload,tomador:{...payload.tomador,documento:'12345678900'}});
  expect(r).toMatchObject({status:'erro',mensagem:'E0160 — CPF do tomador inválido'});
  expect(traduzirErro(r.mensagem)).toBe('O CPF do paciente foi recusado. Confira o CPF no cadastro e tente de novo.');
 });
 it('PDF DANFSe e XML DPS são gerados',async()=>{
  const reg={payload,enviadoEm:'2026-10-13T12:00:00Z',numero:'7',chave:chaveFicticia(payload.referencia),emitidaEm:'2026-10-13T12:00:04Z'};
  const m=mockCom(reg,Date.now());
  const pdf=await m.baixarPdf(payload.referencia);
  expect(new TextDecoder().decode(pdf.slice(0,5))).toBe('%PDF-');expect(pdf.length).toBeGreaterThan(3000);
  const xml=await m.baixarXml(payload.referencia);
  expect(xml).toContain('<DPS');expect(xml).toContain('<xDescServ>01 (uma) consulta médica</xDescServ>');
 },30000);
});

describe('transições de emissão',()=>{
 it('válidas',()=>{
  for(const [de,para] of [['pago_ok','aprovado'],['aprovado','emitindo'],['emitindo','emitido'],['emitindo','erro_emissao'],['erro_emissao','emitindo'],['emitido','pago_ok'],['enviado','pago_ok']] as const)expect(podeTransicionar(de,para)).toBe(true);
 });
 it('inválidas',()=>{
  expect(()=>validarTransicao('aguardando_pagamento','emitindo')).toThrow(/Transição inválida/);
  expect(()=>validarTransicao('emitido','emitindo')).toThrow();
  expect(podeTransicionar('cancelado','pago_ok')).toBe(false);
 });
});

describe('focusMapper',()=>{
 const payload:NotaPayload={...montarNota(base),prestador:{...montarNota(base).prestador,cnpj:'11222333000181',inscricao_municipal:'123'}};
 it('mapeia campos da NFSe Nacional',()=>{
  const f=paraFocus(payload);
  expect(f).toMatchObject({data_competencia:'2026-10-13',codigo_municipio_emissora:3106200,cnpj_prestador:'11222333000181',cpf_tomador:'10433218100',razao_social_tomador:'Ana Lúcia Ferreira',cep_tomador:'30140061',codigo_tributacao_nacional_iss:'040303',descricao_servico:'01 (uma) consulta médica',valor_servico:470,tipo_retencao_iss:1,codigo_opcao_simples_nacional:2});
  expect(f).not.toHaveProperty('cnpj_tomador');
 });
 it('tomador PJ usa cnpj_tomador e ISS retido',()=>{
  const pj=montarNota({...base,regra:{ativo:true,iss_retido:true,tomador_cnpj:'11222333000181',tomador_nome:'Empresa'}});
  const f=paraFocus(pj);expect(f).toMatchObject({cnpj_tomador:'11222333000181',tipo_retencao_iss:2});expect(f).not.toHaveProperty('cep_tomador');
 });
 it('traduz respostas',()=>{
  expect(deFocus({status:'processando_autorizacao'}).status).toBe('processando');
  expect(deFocus({status:'autorizado',numero:15,chave_nfse:'9'.repeat(50)})).toMatchObject({status:'autorizada',numero:'15'});
  expect(deFocus({status:'erro_autorizacao',erros:[{codigo:'E0160',mensagem:'CPF do tomador inválido'}]})).toMatchObject({status:'erro',mensagem:'E0160 — CPF do tomador inválido'});
  expect(focusBaseUrl('homologacao')).toContain('homologacao');
 });
 it('sem token falha com mensagem amigável',()=>{
  expect(()=>new FocusEmissor('homologacao',undefined)).toThrow('token da Focus NFe ainda não foi configurado');
 });
});
