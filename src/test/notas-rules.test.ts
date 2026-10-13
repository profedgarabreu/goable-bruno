import {describe,it,expect} from 'vitest';
import {validarCPF,formatarCPF,mascararCPF,numeroPorExtenso,montarDescricao,calcularBloqueios,validarTransicao,podeTransicionar,chaveDedup,type DadosBloqueio} from '@/lib/notas/rules';

const ok=():DadosBloqueio=>({atendimento:{data_atendimento:'2026-10-13',valor:470,convenio:false,aprovado_em:null},paciente:{cpf:'10433218100',cep:'30130005',logradouro:'Avenida Afonso Pena',numero:'100',municipio_ibge:'3106200'},servico:{parametro_fiscal_id:'p1'},aliquotaDoMes:11.8,regra:null});
const codigos=(d:DadosBloqueio)=>calcularBloqueios(d).map(b=>b.codigo);

describe('validarCPF',()=>{
 it('aceita CPF válido com ou sem máscara',()=>{expect(validarCPF('10433218100')).toBe(true);expect(validarCPF('104.332.181-00')).toBe(true);});
 it('rejeita dígito errado, repetidos e tamanho',()=>{expect(validarCPF('10433218101')).toBe(false);expect(validarCPF('11111111111')).toBe(false);expect(validarCPF('123')).toBe(false);expect(validarCPF(null)).toBe(false);});
 it('formata e mascara',()=>{expect(formatarCPF('10433218100')).toBe('104.332.181-00');expect(mascararCPF('10433218100')).toBe('***.332.181-**');});
});
describe('numeroPorExtenso',()=>{
 it('respeita o gênero em 1 e 2',()=>{expect(numeroPorExtenso(1,'a')).toBe('uma');expect(numeroPorExtenso(1,'o')).toBe('um');expect(numeroPorExtenso(2,'a')).toBe('duas');expect(numeroPorExtenso(2,'o')).toBe('dois');});
 it('vai até 20',()=>{expect(numeroPorExtenso(3,'a')).toBe('três');expect(numeroPorExtenso(20,'o')).toBe('vinte');expect(()=>numeroPorExtenso(21,'a')).toThrow();expect(()=>numeroPorExtenso(0,'a')).toThrow();});
});
describe('montarDescricao',()=>{
 it('gera o modelo da nota real',()=>{expect(montarDescricao(1,{descricao_nota:'consulta médica',genero:'a'})).toBe('01 (uma) consulta médica');});
 it('usa o gênero masculino',()=>{expect(montarDescricao(1,{descricao_nota:'procedimento cirúrgico a laser',genero:'o'})).toBe('01 (um) procedimento cirúrgico a laser');});
 it('não pluraliza o texto do serviço',()=>{expect(montarDescricao(2,{descricao_nota:'sessão de escleroterapia',genero:'a'})).toBe('02 (duas) sessão de escleroterapia');});
});
describe('checarBloqueios',()=>{
 it('sem bloqueios quando tudo está completo',()=>{expect(codigos(ok())).toEqual([]);});
 it('CPF ausente',()=>{const d=ok();d.paciente.cpf=null;expect(codigos(d)).toEqual(['cpf_ausente']);});
 it('CPF inválido',()=>{const d=ok();d.paciente.cpf='10433218101';expect(codigos(d)).toEqual(['cpf_invalido']);});
 it('endereço incompleto lista o que falta',()=>{const d=ok();d.paciente.cep=null;d.paciente.numero='';d.paciente.municipio_ibge=null;const b=calcularBloqueios(d);expect(b.map(x=>x.codigo)).toEqual(['endereco_incompleto']);expect(b[0]!.mensagem).toContain('CEP, número, município');});
 it('logradouro ausente',()=>{const d=ok();d.paciente.logradouro=null;expect(codigos(d)).toEqual(['endereco_incompleto']);});
 it('serviço sem parâmetro',()=>{const d=ok();d.servico={parametro_fiscal_id:null};expect(codigos(d)).toEqual(['servico_sem_parametro']);});
 it('mês sem alíquota',()=>{const d=ok();d.aliquotaDoMes=null;expect(codigos(d)).toEqual(['mes_sem_aliquota']);});
 it('regra especial pendente até autorizar',()=>{const d=ok();d.regra={nome:'AMAGIS',aguarda_autorizacao:true,ativo:true};expect(codigos(d)).toEqual(['regra_especial_pendente']);d.atendimento.aprovado_em='2026-10-13T12:00:00Z';expect(codigos(d)).toEqual([]);});
 it('convênio',()=>{const d=ok();d.atendimento.convenio=true;expect(codigos(d)).toEqual(['convenio']);});
 it('valor menor ou igual a zero',()=>{const d=ok();d.atendimento.valor=0;expect(codigos(d)).toEqual(['valor_invalido']);});
});
describe('transicionarStatus',()=>{
 it('aceita transição válida',()=>{expect(podeTransicionar('pago_ok','aprovado')).toBe(true);expect(()=>validarTransicao('pago_ok','aprovado',[])).not.toThrow();});
 it('rejeita transição inválida',()=>{expect(()=>validarTransicao('importado','emitido')).toThrow(/Transição inválida/);expect(()=>validarTransicao('cancelado','importado')).toThrow();});
 it('não aprova com bloqueio',()=>{const b=calcularBloqueios({...ok(),aliquotaDoMes:null});expect(()=>validarTransicao('pago_ok','aprovado',b)).toThrow(/Não é possível aprovar/);});
 it('autorização libera regra especial',()=>{const d=ok();d.regra={nome:'AMAGIS',aguarda_autorizacao:true,ativo:true};expect(()=>validarTransicao('aguardando_autorizacao','aprovado',calcularBloqueios(d))).not.toThrow();});
});
describe('hash_dedup',()=>{
 const a={data_atendimento:'2026-10-13',paciente_id:'p',servico_id:'s',valor:470,quantidade:1};
 it('mesma linha reimportada gera a mesma chave',()=>{expect(chaveDedup({...a})).toBe(chaveDedup({...a,valor:470.0}));});
 it('qualquer campo diferente muda a chave',()=>{expect(chaveDedup({...a,quantidade:2})).not.toBe(chaveDedup(a));expect(chaveDedup({...a,valor:630})).not.toBe(chaveDedup(a));});
});
