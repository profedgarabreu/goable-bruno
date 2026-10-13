// Pure fiscal/operational rules shared by server functions and tests.
export type Genero = 'a' | 'o';
export type StatusAtendimento = 'importado'|'cadastro_pendente'|'aguardando_pagamento'|'pago_ok'|'aguardando_autorizacao'|'aprovado'|'emitindo'|'emitido'|'erro_emissao'|'enviado'|'erro_envio'|'nao_gera_nota'|'cancelado';
export const statusAtendimento: StatusAtendimento[] = ['importado','cadastro_pendente','aguardando_pagamento','pago_ok','aguardando_autorizacao','aprovado','emitindo','emitido','erro_emissao','enviado','erro_envio','nao_gera_nota','cancelado'];

export const somenteDigitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');

export function validarCPF(valor: string | null | undefined): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const dv = (soma * 10) % 11 % 10;
    if (dv !== Number(d[n])) return false;
  }
  return true;
}
export function formatarCPF(valor: string) { const d = somenteDigitos(valor); return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : valor; }
export function mascararCPF(valor: string | null | undefined) { const d = somenteDigitos(valor); return d.length === 11 ? `***.${d.slice(3,6)}.${d.slice(6,9)}-**` : 'CPF não informado'; }

const extenso: Record<number, string> = {3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',11:'onze',12:'doze',13:'treze',14:'quatorze',15:'quinze',16:'dezesseis',17:'dezessete',18:'dezoito',19:'dezenove',20:'vinte'};
export function numeroPorExtenso(n: number, genero: Genero): string {
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error('Quantidade deve ser um inteiro de 1 a 20.');
  if (n === 1) return genero === 'a' ? 'uma' : 'um';
  if (n === 2) return genero === 'a' ? 'duas' : 'dois';
  return extenso[n]!;
}
/** "01 (uma) consulta médica" — the service text is never pluralized. */
export function montarDescricao(qtd: number, servico: { descricao_nota: string; genero: Genero }) {
  return `${String(qtd).padStart(2, '0')} (${numeroPorExtenso(qtd, servico.genero)}) ${servico.descricao_nota}`;
}

export const competenciaDe = (data: string) => data.slice(0, 7);
/** Mirrors the database trigger that fills nf_atendimentos.hash_dedup (md5 of this key). */
export function chaveDedup(a: { data_atendimento: string; paciente_id: string; servico_id: string | null; valor: number; quantidade: number }) {
  return [a.data_atendimento, a.paciente_id, a.servico_id ?? '', a.valor.toFixed(2), String(a.quantidade)].join('|');
}

export type Bloqueio = { codigo: 'cpf_ausente'|'cpf_invalido'|'endereco_incompleto'|'servico_ausente'|'servico_sem_parametro'|'mes_sem_aliquota'|'regra_especial_pendente'|'convenio'|'valor_invalido'; mensagem: string };
export type DadosBloqueio = {
  atendimento: { data_atendimento: string; valor: number; convenio: boolean; aprovado_em: string | null };
  paciente: { cpf: string | null; cep: string | null; logradouro: string | null; numero: string | null; municipio_ibge: string | null } ;
  servico: { parametro_fiscal_id: string | null } | null;
  aliquotaDoMes: number | null;
  regra: { nome: string; aguarda_autorizacao: boolean; ativo: boolean } | null;
};
export function calcularBloqueios(d: DadosBloqueio): Bloqueio[] {
  const b: Bloqueio[] = [];
  const cpf = somenteDigitos(d.paciente.cpf);
  if (!cpf) b.push({ codigo: 'cpf_ausente', mensagem: 'Paciente sem CPF.' });
  else if (!validarCPF(cpf)) b.push({ codigo: 'cpf_invalido', mensagem: 'CPF do paciente é inválido.' });
  const faltando = ([['cep','CEP'],['logradouro','logradouro'],['numero','número'],['municipio_ibge','município']] as const).filter(([k]) => !(d.paciente[k] ?? '').trim()).map(([, l]) => l);
  if (faltando.length) b.push({ codigo: 'endereco_incompleto', mensagem: `Endereço incompleto: ${faltando.join(', ')}.` });
  if (!d.servico) b.push({ codigo: 'servico_ausente', mensagem: 'Atendimento sem serviço.' });
  else if (!d.servico.parametro_fiscal_id) b.push({ codigo: 'servico_sem_parametro', mensagem: 'Serviço sem parâmetro fiscal.' });
  if (d.aliquotaDoMes == null) b.push({ codigo: 'mes_sem_aliquota', mensagem: `Alíquota do Simples de ${competenciaDe(d.atendimento.data_atendimento)} não informada.` });
  if (d.regra?.ativo && d.regra.aguarda_autorizacao && !d.atendimento.aprovado_em) b.push({ codigo: 'regra_especial_pendente', mensagem: `Aguardando autorização (${d.regra.nome}).` });
  if (d.atendimento.convenio) b.push({ codigo: 'convenio', mensagem: 'Atendimento de convênio não gera nota.' });
  if (!(d.atendimento.valor > 0)) b.push({ codigo: 'valor_invalido', mensagem: 'Valor deve ser maior que zero.' });
  return b;
}

export const transicoes: Record<StatusAtendimento, StatusAtendimento[]> = {
  importado: ['cadastro_pendente','aguardando_pagamento','pago_ok','nao_gera_nota','cancelado'],
  cadastro_pendente: ['aguardando_pagamento','pago_ok','nao_gera_nota','cancelado'],
  aguardando_pagamento: ['cadastro_pendente','pago_ok','nao_gera_nota','cancelado'],
  pago_ok: ['cadastro_pendente','aguardando_pagamento','aguardando_autorizacao','aprovado','cancelado'],
  aguardando_autorizacao: ['aprovado','cancelado'],
  aprovado: ['pago_ok','emitindo','cancelado'],
  emitindo: ['emitido','erro_emissao'],
  erro_emissao: ['aprovado','emitindo','cancelado'],
  emitido: ['enviado','erro_envio','cancelado'],
  erro_envio: ['enviado','cancelado'],
  enviado: ['cancelado'],
  nao_gera_nota: ['importado'],
  cancelado: [],
};
export function podeTransicionar(de: StatusAtendimento, para: StatusAtendimento) { return transicoes[de].includes(para); }
export function validarTransicao(de: StatusAtendimento, para: StatusAtendimento, bloqueios: Bloqueio[] = []) {
  if (!podeTransicionar(de, para)) throw new Error(`Transição inválida: ${de} → ${para}.`);
  if (para === 'aprovado') {
    const impeditivos = bloqueios.filter(x => x.codigo !== 'regra_especial_pendente' || de !== 'aguardando_autorizacao');
    if (impeditivos.length) throw new Error(`Não é possível aprovar: ${impeditivos.map(x => x.mensagem).join(' ')}`);
  }
}
