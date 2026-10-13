import {z} from 'zod';
import type {Json} from '@/integrations/supabase/types';
export const tipos=['texto_curto','texto_longo','cnpj','email','telefone','data','sim_nao_naosei','escolha_unica','escolha_multipla','contato','arquivos','composto'] as const;
export const prioridades={bloqueia_producao:'Essenciais para começar',importante:'Importantes',desejavel:'Se puder'};
export const statuses={aberta:'Aberta',respondida:'Respondida',em_analise:'Em análise',precisa_complemento:'Precisa de complemento',resolvida:'Resolvida'};
export const MAX_BYTES=25*1024*1024;
export const SIGNED_SECONDS=600;
export type Tipo=typeof tipos[number];
export type Config={opcoes?:string[]|undefined;accept?:string|undefined;maxArquivos?:number|undefined;placeholder?:string|undefined;campos?:Campo[]|undefined;anexos?:Config|undefined};
export type Campo=Config & {key:string;label:string;tipo:Tipo;opcional?:boolean|undefined};
export type Arquivo={id:string;item_id:string;campo_key:string;nome_original:string;mime:string;tamanho:number;enviado_por_nome:string;enviado_em:string};
export type Resposta={item_id:string;valor:Json;respondido_por_nome:string;respondido_em:string};
export type Item={id:string;link_id:string;ordem:number;categoria:string;prioridade:keyof typeof prioridades;titulo:string;descricao:string;tipo:Tipo;config:Config;obrigatoria:boolean;status:keyof typeof statuses;comentario_goable:string;criado_em:string;atualizado_em:string};
export type Bundle={nome_cliente:string;itens:Item[];respostas:Resposta[];arquivos:Arquivo[]};
export const configSchema:z.ZodType<Config>=z.lazy(()=>z.object({opcoes:z.array(z.string().min(1).max(200)).max(30).optional(),accept:z.string().max(300).optional(),maxArquivos:z.number().int().min(1).max(20).optional(),placeholder:z.string().max(300).optional(),anexos:configSchema.optional(),campos:z.array(configSchema.and(z.object({key:z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),label:z.string().min(1).max(200),tipo:z.enum(tipos),opcional:z.boolean().optional()}))).max(20).optional()}));
export const itemSchema=z.object({id:z.string().uuid().optional(),link_id:z.string().uuid(),ordem:z.number().int().min(1),categoria:z.enum(['fiscal','dados','envio','regras','operacao','outros']),prioridade:z.enum(['bloqueia_producao','importante','desejavel']),titulo:z.string().min(2).max(300),descricao:z.string().max(3000),tipo:z.enum(tipos),config:configSchema,obrigatoria:z.boolean()});
export const tokenSchema=z.string().regex(/^[a-f0-9]{64}$/);
export function linkValid(link:{ativo:boolean;expira_em:string|null}, now=Date.now()){return link.ativo && (!link.expira_em || new Date(link.expira_em).getTime()>now);}
export function maskCnpj(s:string){return s.replace(/\D/g,'').slice(0,14).replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');}
export function validCnpj(s:string){const d=s.replace(/\D/g,'');if(d.length!==14||/^(\d)\1+$/.test(d))return false;const calc=(n:number)=>{let w=n-7;let sum=0;for(let i=0;i<n;i++){sum+=Number(d[i])*w--;if(w===1)w=9;}const r=sum%11;return r<2?0:11-r;};return calc(12)===Number(d[12])&&calc(13)===Number(d[13]);}
export function maskPhone(s:string){return s.replace(/\D/g,'').slice(0,11).replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{4,5})(\d{4})$/,'$1-$2');}
export function validPhone(s:string){const d=s.replace(/\D/g,'');return /^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(d);}
export function hasPassword(v:unknown){return /(?:senha|password|passwd)\s*[:=]/i.test(JSON.stringify(v));}
export function record(v:unknown):Record<string,unknown>{return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};}
export function fileFields(tipo:Tipo,config:Config,prefix=''):Campo[]{const fields:Campo[]=[];if(tipo==='arquivos')fields.push({...config,key:prefix,label:'Arquivos',tipo:'arquivos'});if(tipo==='composto')for(const c of config.campos||[])fields.push(...fileFields(c.tipo,c,prefix?`${prefix}.${c.key}`:c.key));if(config.anexos)fields.push({...config.anexos,key:prefix?`${prefix}.anexos`:'anexos',label:'Anexos (opcional)',tipo:'arquivos',opcional:true});return fields;}
export function validateValue(tipo:Tipo,config:Config,value:unknown,required:boolean,files:Arquivo[],prefix=''):string|null{
 if(value!=null&&tipo!=='arquivos'){const structured=['composto','contato','escolha_unica','escolha_multipla'].includes(tipo);if(structured?typeof value!=='object'||Array.isArray(value):typeof value!=='string')return 'Formato de resposta inválido.';if(structured){const allowed=tipo==='composto'?(config.campos||[]).map(c=>c.key):tipo==='contato'?['nome','empresa','telefone','email']:tipo==='escolha_unica'?['selecionada','outro']:['selecionadas','outro'];if(Object.keys(record(value)).some(k=>!allowed.includes(k)))return 'Campo de resposta inválido.';}}
 if(tipo==='arquivos')return required&&!files.some(f=>f.campo_key===prefix)?'Envie pelo menos um arquivo.':null;
 if(tipo==='composto'){const v=record(value);for(const c of config.campos||[]){const err=validateValue(c.tipo,c,v[c.key],required&&!c.opcional,files,prefix?`${prefix}.${c.key}`:c.key);if(err)return `${c.label}: ${err}`;}return null;}
 if(tipo==='contato'){const v=record(value);if(!required&&Object.values(v).every(x=>!x))return null;if(required&&!String(v['nome']||'').trim())return 'Informe o nome do contato.';if(required&&!v['telefone']&&!v['email'])return 'Informe telefone ou e-mail do contato.';for(const t of ['telefone','email'] as const){if(v[t]){const e=validateValue(t,{},v[t],false,files);if(e)return e;}}return null;}
 if(tipo==='escolha_multipla'||tipo==='escolha_unica'){const v=record(value);const options=tipo==='escolha_multipla'?(Array.isArray(v['selecionadas'])?v['selecionadas']:[]):v['selecionada']?[v['selecionada']]:[];if(required&&!options.length)return 'Escolha uma opção.';const allowed=[...(config.opcoes||[]),'Outro'];if(options.some(x=>typeof x!=='string'||!allowed.includes(x)))return 'Opção inválida.';if(options.includes('Outro')&&!String(v['outro']||'').trim())return 'Preencha a opção Outro.';return null;}
 const text=typeof value==='string'?value.trim():'';if(!text)return required?'Preencha este campo.':null;
 if(text.length>20000)return 'Resposta muito longa.';
 if(tipo==='cnpj'&&!text.split(/[\n;,]+/).every(validCnpj))return 'Confira os dígitos do CNPJ.';
 if(tipo==='telefone'&&!validPhone(text))return 'Informe um telefone brasileiro válido com DDD.';
 if(tipo==='email'&&!z.string().email().safeParse(text).success)return 'Informe um e-mail válido.';
 if(tipo==='data'&&(!/^\d{4}-\d{2}-\d{2}$/.test(text)||Number.isNaN(Date.parse(text))||new Date(text).toISOString().slice(0,10)!==text))return 'Informe uma data válida.';
 if(tipo==='sim_nao_naosei'&&!['Sim','Não','Não sei'].includes(text))return 'Escolha Sim, Não ou Não sei.';
 return null;
}
const mimeMap:Record<string,string[]>={pdf:['application/pdf'],png:['image/png'],jpg:['image/jpeg'],jpeg:['image/jpeg'],webp:['image/webp'],svg:['image/svg+xml'],csv:['text/csv','application/vnd.ms-excel','text/plain',''],xlsx:['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],xls:['application/vnd.ms-excel'],doc:['application/msword'],docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document']};
export function validateFile(name:string,mime:string,size:number,config:Config,count:number){const ext=name.toLowerCase().split('.').pop()||'';if(size<=0||size>MAX_BYTES)throw new Error('Cada arquivo deve ter até 25 MB e não pode estar vazio.');if(count>=(config.maxArquivos||5))throw new Error('Limite de arquivos atingido.');if(!mimeMap[ext]?.includes(mime))throw new Error('Tipo de arquivo não permitido.');const accept=(config.accept||'.pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv').split(',').map(s=>s.trim().toLowerCase());if(!accept.some(a=>a===`.${ext}`||a===mime||(a.endsWith('/*')&&mime.startsWith(a.slice(0,-1)))))throw new Error('Tipo de arquivo não permitido.');return ext;}
export function progress(b:Bundle){return {answered:b.itens.filter(i=>i.status==='resolvida'||(i.status!=='precisa_complemento'&&b.respostas.some(r=>r.item_id===i.id))).length,essential:b.itens.filter(i=>i.prioridade==='bloqueia_producao'&&(i.status==='aberta'||i.status==='precisa_complemento')).length};}
export function formatValue(value:unknown,config?:Config):string{if(value==null)return '—';if(typeof value==='string')return value||'—';if(Array.isArray(value))return value.map(v=>formatValue(v)).join(', ');return Object.entries(record(value)).map(([k,v])=>`${config?.campos?.find(c=>c.key===k)?.label||({selecionada:'Opção',selecionadas:'Opções',outro:'Outro',nome:'Nome',empresa:'Empresa',telefone:'Telefone',email:'E-mail'} as Record<string,string>)[k]||k}: ${formatValue(v,config?.campos?.find(c=>c.key===k))}`).join('\n');}
export function localDate(s:string){return new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});}
export function slug(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);}
