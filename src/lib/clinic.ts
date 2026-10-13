export type Operator = { id: string; nome: string };
export const operatorKey = 'nf_operador';
export function parseOperator(raw: string | null): Operator | null { try { const v = JSON.parse(raw ?? ''); return v && typeof v.id === 'string' && /^[0-9a-f-]{36}$/i.test(v.id) && typeof v.nome === 'string' && v.nome.trim() ? { id: v.id, nome: v.nome } : null; } catch { return null; } }
export function maskCpf(cpf: string) { const digits = cpf.replace(/\D/g, ''); return digits.length === 11 ? `***.${digits.slice(3,6)}.${digits.slice(6,9)}-**` : 'CPF não informado'; }
export const money = (value: number) => value.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
export function saoPauloDate(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit' }).format(date); }
export function pageHead(title: string, description: string) { return { meta:[{title:`${title} · Notas BNaves`},{name:'description',content:description},{property:'og:title',content:`${title} · Notas BNaves`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }; }
