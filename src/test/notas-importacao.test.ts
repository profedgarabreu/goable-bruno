import {describe,it,expect} from 'vitest';
import {normalizarFormaPagamento,casarServico,similaridadeNome,casarPaciente,marcarDuplicadas,statusInicial,ehConvenio,parseValorBR,parseDataBR,casarMedico} from '@/lib/notas/importacao';

const servicos=[
 {id:'s1',nome:'Consulta',aliases_prontmed:['Consulta'],valor_padrao:470,ativo:true},
 {id:'s2',nome:'Primeira consulta',aliases_prontmed:['Primeira Consulta'],valor_padrao:630,ativo:true},
 {id:'s3',nome:'Escleroterapia',aliases_prontmed:['ESCLEROTERAPIA','Escleroterapia com espuma'],valor_padrao:null,ativo:true},
 {id:'s4',nome:'Antigo',aliases_prontmed:['Velho'],valor_padrao:null,ativo:false},
];

describe('importação',()=>{
 it('normaliza formas de pagamento',()=>{
  expect(normalizarFormaPagamento('Cartão de crédito')).toBe('credito');
  expect(normalizarFormaPagamento('CARTAO DE DEBITO')).toBe('debito');
  expect(normalizarFormaPagamento('PIX')).toBe('pix');
  expect(normalizarFormaPagamento('Dinheiro')).toBe('dinheiro');
  expect(normalizarFormaPagamento('Boleto')).toBe('outro');
  expect(normalizarFormaPagamento('')).toBeNull();
 });
 it('casa serviço por alias sem acento/caixa e ignora inativos',()=>{
  expect(casarServico('escleroterapia com espuma',servicos)?.id).toBe('s3');
  expect(casarServico('Primeira Consulta',servicos)?.id).toBe('s2');
  expect(casarServico('Velho',servicos)).toBeNull();
  expect(casarServico('Retorno',servicos)).toBeNull();
 });
 it('similaridade de nome',()=>{
  expect(similaridadeNome('José Antônio Pereira','JOSE ANTONIO PEREIRA')).toBe(1);
  expect(similaridadeNome('Maria Aparecida Souza Lima','Maria Aparecida S. Lima')).toBeGreaterThan(0.75);
  expect(similaridadeNome('Maria Aparecida','Roberto Almeida')).toBeLessThan(0.5);
 });
 it('casa paciente por CPF, nome exato ou candidatos',()=>{
  const ps=[{id:'p1',nome:'José Antônio Pereira',cpf:'52998224725'},{id:'p2',nome:'Maria Aparecida Souza Lima',cpf:null}];
  expect(casarPaciente({paciente:'Qualquer',cpf:'529.982.247-25'},ps)).toMatchObject({estado:'encontrado',id:'p1'});
  expect(casarPaciente({paciente:'jose antonio pereira'},ps)).toMatchObject({estado:'encontrado',id:'p1'});
  expect(casarPaciente({paciente:'Maria Aparecida S Lima'},ps).estado).toBe('possivel');
  expect(casarPaciente({paciente:'Roberto Almeida'},ps).estado).toBe('novo');
 });
 it('dedup pelo mesmo hash (data+paciente+serviço+valor+quantidade)',()=>{
  const ex=[{data_atendimento:'2026-10-13',paciente_id:'p1',servico_id:'s1',valor:470,quantidade:1}];
  const linhas=[{data_atendimento:'2026-10-13',paciente_id:'p1',servico_id:'s1',valor:470,quantidade:1},{data_atendimento:'2026-10-13',paciente_id:'p1',servico_id:'s1',valor:630,quantidade:1},{data_atendimento:'2026-10-13',paciente_id:null,servico_id:'s1',valor:470,quantidade:1}];
  expect(marcarDuplicadas(linhas,ex)).toEqual([true,false,false]);
 });
 it('status inicial nunca é pago_ok',()=>{
  expect(statusInicial(true,[])).toBe('nao_gera_nota');
  expect(statusInicial(false,[{codigo:'valor_invalido',mensagem:''}])).toBe('cadastro_pendente');
  expect(statusInicial(false,[{codigo:'mes_sem_aliquota',mensagem:''}])).toBe('aguardando_pagamento');
 });
 it('convênio, valor, data e médico',()=>{
  expect(ehConvenio('Particular')).toBe(false);expect(ehConvenio('UNIMED')).toBe(true);
  expect(parseValorBR('1.630,50')).toBe(1630.5);expect(parseValorBR('0,00')).toBe(0);
  expect(parseDataBR('13/10/2026','2000-01-01')).toBe('2026-10-13');
  expect(casarMedico('Bruno de Lima Naves',[{id:'m1',nome:'Dr. Bruno de Lima Naves',nome_no_prontmed:'Bruno de Lima Naves',ativo:true}])).toEqual({id:'m1',casou:true});
 });
});
