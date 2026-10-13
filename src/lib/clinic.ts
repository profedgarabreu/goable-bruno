export const operators = ['Marli', 'Cíntia'] as const;
export type Operator = typeof operators[number];
export const operatorKey = 'nf_operador';
export function validOperator(value: unknown): value is Operator { return value === 'Marli' || value === 'Cíntia'; }
export function maskCpf(cpf: string) { const digits = cpf.replace(/\D/g, ''); return digits.length === 11 ? `***.${digits.slice(3,6)}.${digits.slice(6,9)}-**` : 'CPF não informado'; }
export const money = (value: number) => value.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
export function saoPauloDate(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit' }).format(date); }
export function pageHead(title: string, description: string) { return { meta:[{title:`${title} · Notas BNaves`},{name:'description',content:description},{property:'og:title',content:`${title} · Notas BNaves`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }; }
export type DemoStatus = 'importado' | 'cadastro_pendente' | 'aguardando_pagamento' | 'pago_ok' | 'aguardando_autorizacao' | 'emitido' | 'enviado' | 'nao_gera_nota';
export const statusLabels: Record<DemoStatus, { label:string; tone:string }> = {
 importado:{label:'Importado',tone:'info'}, cadastro_pendente:{label:'Cadastro pendente',tone:'error'}, aguardando_pagamento:{label:'Aguardando pagamento',tone:'warning'}, pago_ok:{label:'Pronto para conferir',tone:'success'}, aguardando_autorizacao:{label:'Aguardando autorização',tone:'warning'}, emitido:{label:'Nota emitida',tone:'info'}, enviado:{label:'Enviada',tone:'success'}, nao_gera_nota:{label:'Não gera nota',tone:'muted'}
};
export const demoAppointments: {name:string;cpf:string;service:string;doctor:string;value:number;payment:string;status:DemoStatus;paid:boolean;time:string}[] = [
 {name:'Ana Lúcia Ferreira',cpf:'00045678900',service:'Consulta',doctor:'Dr. Bruno Naves',value:470,payment:'Pix',status:'pago_ok',paid:true,time:'08:00'},
 {name:'Carlos Eduardo Silva',cpf:'00023456700',service:'Primeira consulta',doctor:'Dr. Bruno Naves',value:630,payment:'Crédito',status:'cadastro_pendente',paid:true,time:'08:30'},
 {name:'Maria Helena Costa',cpf:'00067890100',service:'Consulta',doctor:'Dr. Bruno Naves',value:470,payment:'Débito',status:'aguardando_pagamento',paid:false,time:'09:00'},
 {name:'Paulo Roberto Almeida',cpf:'00034567800',service:'Escleroterapia',doctor:'Dr. Bruno Naves',value:630,payment:'Pix',status:'aguardando_autorizacao',paid:true,time:'09:30'},
 {name:'Beatriz Santos Oliveira',cpf:'00078901200',service:'Consulta',doctor:'Dr. Bruno Naves',value:470,payment:'Dinheiro',status:'emitido',paid:true,time:'10:00'},
 {name:'José Antônio Pereira',cpf:'00056789000',service:'Primeira consulta',doctor:'Dr. Bruno Naves',value:630,payment:'Crédito',status:'enviado',paid:true,time:'10:30'},
 {name:'Fernanda Lima Rocha',cpf:'00089012300',service:'Consulta',doctor:'Dr. Bruno Naves',value:470,payment:'—',status:'importado',paid:false,time:'11:00'},
 {name:'Luiz Fernando Martins',cpf:'00012345600',service:'Retorno',doctor:'Dr. Bruno Naves',value:0,payment:'Convênio',status:'nao_gera_nota',paid:false,time:'11:30'},
];
