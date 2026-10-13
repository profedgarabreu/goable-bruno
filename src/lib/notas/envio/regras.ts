// Pure delivery rules (channel choice, message rendering, patient-link checks). Unit-tested; server enforces them.
import {renderTexto,somenteDigitos,validarCPF} from '../rules';

export type Canal='email'|'whatsapp';
export type StatusEnvio='enviado'|'simulado'|'erro'|'sem_contato'|'pendente';
export const RODAPE_EMAIL='Enviamos sua nota por e-mail para proteger seus dados de saúde.';
export const FINAL_WHATSAPP='Se preferir receber por e-mail, responda esta mensagem com o seu e-mail.';
export const ASSUNTO_PADRAO='Nota fiscal — {{consultorio}} — atendimento de {{data}}';
export const LINK_DIAS=7, LINK_MAX_FALHAS=5;

export const emailValido=(v:string|null|undefined)=>!!v&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const celularValido=(v:string|null|undefined)=>{const d=somenteDigitos(v);return d.length===11&&d[2]==='9'||d.length===13&&d.startsWith('55')&&d[4]==='9';};

/** E-mail first (PDF attached); otherwise WhatsApp with a secure link; otherwise no contact. */
export function escolherCanal(p:{email:string|null;celular:string|null}):{canal:Canal;destino:string}|null{
 if(emailValido(p.email))return {canal:'email',destino:p.email!.trim().toLowerCase()};
 if(celularValido(p.celular))return {canal:'whatsapp',destino:somenteDigitos(p.celular)};
 return null;
}

export const primeiroNome=(n:string|null|undefined)=>{const s=(n??'').trim().split(/\s+/)[0]??'';return s?s[0]!.toLocaleUpperCase('pt-BR')+s.slice(1).toLocaleLowerCase('pt-BR'):'';};
export const slugNome=(n:string)=>primeiroNome(n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]/g,'')||'paciente';
export const nomesAnexos=(numero:string|null,nome:string)=>{const b=`NFSe_${numero??'sem-numero'}_${slugNome(nome)}`;return {pdf:`${b}.pdf`,xml:`${b}.xml`};};
export const dataBR=(iso:string)=>{const [y,m,d]=iso.slice(0,10).split('-');return `${d}/${m}/${y}`;};
export const valorBR=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export type Vars={nome:string;data:string;valor:string;link:string;consultorio:string};

export function assuntoEmail(modelo:string|null|undefined,v:Vars,demo:boolean){
 const s=renderTexto((modelo??'').trim()||ASSUNTO_PADRAO,v);return demo?`[DEMONSTRAÇÃO] ${s}`:s;
}
/** WhatsApp text always ends with the e-mail opt-in sentence. */
export function textoWhatsApp(modelo:string,v:Vars){
 const t=renderTexto(modelo,v).trim();return t.endsWith(FINAL_WHATSAPP)?t:`${t}\n\n${FINAL_WHATSAPP}`;
}
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
/** Simple responsive HTML with clinic branding; text is escaped, URLs become links. */
export function htmlEmail(corpo:string,v:Vars){
 const paras=renderTexto(corpo,v).split(/\n{2,}/).map(p=>`<p style="margin:0 0 16px">${esc(p).replace(/\n/g,'<br>').replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" style="color:#0f766e">$1</a>')}</p>`).join('');
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(v.consultorio)}</title></head><body style="margin:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#1f2a2e"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden"><tr><td style="background:#0f766e;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:bold">${esc(v.consultorio)}</td></tr><tr><td style="padding:24px;font-size:16px;line-height:1.55">${paras}</td></tr><tr><td style="padding:16px 24px;background:#f0f5f4;font-size:13px;color:#56656a">${esc(RODAPE_EMAIL)}</td></tr></table></td></tr></table></body></html>`;
}

/** Mirrors the database check (nf_link_paciente_verificar) for tests and UI hints. */
export type EstadoLink='valido'|'expirado'|'bloqueado';
export function estadoLink(l:{expira_em:string;revogado:boolean;tentativas_falhas:number},agora=new Date()):EstadoLink{
 if(l.revogado||new Date(l.expira_em).getTime()<agora.getTime())return 'expirado';
 return l.tentativas_falhas>=LINK_MAX_FALHAS?'bloqueado':'valido';
}
export function conferirDigitos(cpf:string|null,digitos:string,falhas:number):{estado:'liberado'|'incorreto'|'bloqueado';falhas:number}{
 if(falhas>=LINK_MAX_FALHAS)return {estado:'bloqueado',falhas};
 const c=somenteDigitos(cpf);
 if(validarCPF(c)&&/^\d{3}$/.test(digitos)&&c.slice(0,3)===digitos)return {estado:'liberado',falhas};
 const f=falhas+1;return {estado:f>=LINK_MAX_FALHAS?'bloqueado':'incorreto',falhas:f};
}

/** Portuguese messages for common provider errors; the original stays in the record. */
export function traduzirErroEnvio(msg:string|null|undefined){
 const m=(msg??'').toLowerCase();
 if(/domain.*not verified|verify a domain|not verified/.test(m))return 'O domínio do e-mail remetente ainda não foi verificado no provedor de e-mail.';
 if(/invalid.*(to|email)|is not a valid/.test(m))return 'O e-mail do paciente parece inválido. Confira o endereço.';
 if(/api key|unauthori|401|invalid oauth|access token/.test(m))return 'A chave do provedor de envio é inválida ou expirou.';
 if(/rate|429|too many/.test(m))return 'Muitos envios em pouco tempo. Tente de novo em alguns minutos.';
 if(/template/.test(m))return 'O modelo de mensagem do WhatsApp não foi encontrado ou não está aprovado.';
 if(/recipient|phone|131026|whatsapp/.test(m))return 'Não foi possível entregar no WhatsApp deste número. Confira o celular.';
 return msg?`Falha no envio: ${msg}`:'Falha no envio. Tente de novo.';
}
