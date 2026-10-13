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
  atendimento: { data_atendimento: string; valor: number; convenio: boolean; aprovado_em: string | null; autorizacao_liberada?: boolean };
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
  if (d.regra?.ativo && d.regra.aguarda_autorizacao && !d.atendimento.aprovado_em && !d.atendimento.autorizacao_liberada) b.push({ codigo: 'regra_especial_pendente', mensagem: `Aguardando autorização (${d.regra.nome}).` });
  if (d.atendimento.convenio) b.push({ codigo: 'convenio', mensagem: 'Atendimento de convênio não gera nota.' });
  if (!(d.atendimento.valor > 0)) b.push({ codigo: 'valor_invalido', mensagem: 'Valor deve ser maior que zero.' });
  return b;
}

export const transicoes: Record<StatusAtendimento, StatusAtendimento[]> = {
  importado: ['cadastro_pendente','aguardando_pagamento','pago_ok','nao_gera_nota','cancelado'],
  cadastro_pendente: ['aguardando_pagamento','pago_ok','nao_gera_nota','cancelado'],
  aguardando_pagamento: ['cadastro_pendente','pago_ok','nao_gera_nota','cancelado'],
  pago_ok: ['cadastro_pendente','aguardando_pagamento','aguardando_autorizacao','aprovado','nao_gera_nota','cancelado'],
  aguardando_autorizacao: ['pago_ok','aguardando_pagamento','aprovado','nao_gera_nota','cancelado'],
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

export function validarCNPJ(valor: string | null | undefined): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n: number) => { let soma = 0, peso = n - 7; for (let i = 0; i < n; i++) { soma += Number(d[i]) * peso--; if (peso < 2) peso = 9; } const r = soma % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}
export function formatarCNPJ(v: string) { const d = somenteDigitos(v); return d.length === 14 ? `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}` : v; }

/** Reasons that keep a patient registration from being invoice-ready. */
export function pendenciasCadastro(p: { cpf: string | null; cep: string | null; logradouro: string | null; numero: string | null; municipio_ibge: string | null }) {
  const m: string[] = [];
  const cpf = somenteDigitos(p.cpf);
  if (!cpf) m.push('sem CPF'); else if (!validarCPF(cpf)) m.push('CPF inválido');
  const falta = ([['cep','CEP'],['logradouro','logradouro'],['numero','número'],['municipio_ibge','município']] as const).filter(([k]) => !(p[k] ?? '').trim()).map(([, l]) => l);
  if (falta.length) m.push(`endereço sem ${falta.join(', ')}`);
  return m;
}

export const variaveisTexto = ['nome','data','valor','link','consultorio'] as const;
export function renderTexto(modelo: string, v: Partial<Record<(typeof variaveisTexto)[number], string>>) {
  return modelo.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, k: string) => (v as Record<string,string|undefined>)[k] ?? all);
}

/** Only the keys whose values changed — used to keep audit entries minimal. */
export function diffCampos(antesIn: object | null | undefined, depoisIn: object | null | undefined) {
  const antes = antesIn as Record<string, unknown> | null, depois = (depoisIn ?? {}) as Record<string, unknown>;
  const a: Record<string, unknown> = {}, d: Record<string, unknown> = {};
  for (const k of Object.keys(depois)) { if (k === 'updated_at' || k === 'created_at') continue; const x = antes?.[k] ?? null, y = depois[k] ?? null; if (JSON.stringify(x) !== JSON.stringify(y)) { a[k] = x; d[k] = y; } }
  return { antes: antes ? a : null, depois: d };
}

export const aliquotaValida = (n: number) => Number.isFinite(n) && n >= 0 && n <= 33;

export const camposFicha = ['nome','cpf','celular','email','cep','logradouro','numero','complemento','bairro','municipio_nome','uf','data_nascimento'] as const;
export type CampoFicha = (typeof camposFicha)[number];
export type Ficha = Record<CampoFicha, string | null>;
const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
/** Normalizes AI output and drops any value that does not literally appear in the pasted text. */
export function normalizarFicha(bruto: Partial<Record<string, unknown>>, texto: string): { ficha: Ficha; avisos: string[] } {
  const ficha = {} as Ficha; const avisos: string[] = [];
  const t = semAcento(texto), dig = somenteDigitos(texto);
  for (const k of camposFicha) {
    const v = bruto[k]; let s = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
    if (!s || /^null$/i.test(s)) { ficha[k] = null; continue; }
    const numerico = k === 'cpf' || k === 'cep' || k === 'celular';
    if (numerico) s = somenteDigitos(s);
    if (k === 'uf') s = s.toUpperCase();
    const presente = numerico ? dig.includes(s) : k === 'data_nascimento' ? true : t.includes(semAcento(s));
    if (!presente) { avisos.push(`“${k}” ignorado: não aparece no texto.`); ficha[k] = null; continue; }
    ficha[k] = s;
  }
  if (ficha.cpf && !validarCPF(ficha.cpf)) avisos.push('O CPF da ficha é inválido — confira com o paciente.');
  if (ficha.cep && ficha.cep.length !== 8) { avisos.push('O CEP da ficha não tem 8 dígitos.'); ficha.cep = null; }
  if (ficha.uf && !/^[A-Z]{2}$/.test(ficha.uf)) ficha.uf = null;
  return { ficha, avisos };
}
