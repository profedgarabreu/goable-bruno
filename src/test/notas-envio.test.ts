import {describe,it,expect} from 'vitest';
import {escolherCanal,textoWhatsApp,assuntoEmail,htmlEmail,conferirDigitos,estadoLink,nomesAnexos,FINAL_WHATSAPP,RODAPE_EMAIL} from '@/lib/notas/envio/regras';

const v={nome:'Maria',data:'13/10/2026',valor:'R$ 470,00',link:'https://x/nota/abc',consultorio:'BNaves'};

describe('regra de canal',()=>{
 it('e-mail válido tem prioridade',()=>expect(escolherCanal({email:'Maria@Ex.com ',celular:'31999998888'})).toEqual({canal:'email',destino:'maria@ex.com'}));
 it('sem e-mail, usa WhatsApp',()=>expect(escolherCanal({email:null,celular:'(31) 99999-8888'})).toEqual({canal:'whatsapp',destino:'31999998888'}));
 it('e-mail inválido cai para WhatsApp',()=>expect(escolherCanal({email:'maria@',celular:'31999998888'})?.canal).toBe('whatsapp'));
 it('sem contato retorna null',()=>expect(escolherCanal({email:'',celular:'3133334444'})).toBeNull());
});

describe('renderização',()=>{
 it('WhatsApp termina com o convite para e-mail',()=>{const t=textoWhatsApp('Olá, {{nome}}! Nota de {{data}}: {{link}}',v);expect(t.startsWith('Olá, Maria! Nota de 13/10/2026: https://x/nota/abc')).toBe(true);expect(t.endsWith(FINAL_WHATSAPP)).toBe(true);});
 it('não duplica a frase final',()=>expect(textoWhatsApp(`Oi. ${FINAL_WHATSAPP}`,v).split(FINAL_WHATSAPP).length).toBe(2));
 it('assunto padrão e prefixo de demonstração',()=>{expect(assuntoEmail('',v,false)).toBe('Nota fiscal — BNaves — atendimento de 13/10/2026');expect(assuntoEmail('',v,true)).toBe('[DEMONSTRAÇÃO] Nota fiscal — BNaves — atendimento de 13/10/2026');});
 it('HTML escapa conteúdo e traz o rodapé',()=>{const h=htmlEmail('Olá {{nome}} <script>',v);expect(h).toContain('Olá Maria &lt;script&gt;');expect(h).toContain(RODAPE_EMAIL);});
 it('nomes dos anexos',()=>expect(nomesAnexos('17','JOSÉ da Silva')).toEqual({pdf:'NFSe_17_Jose.pdf',xml:'NFSe_17_Jose.xml'}));
});

describe('link do paciente',()=>{
 const cpf='52998224725';
 it('3 dígitos certos liberam',()=>expect(conferirDigitos(cpf,'529',0).estado).toBe('liberado'));
 it('erro conta tentativa',()=>expect(conferirDigitos(cpf,'111',2)).toEqual({estado:'incorreto',falhas:3}));
 it('5º erro bloqueia',()=>expect(conferirDigitos(cpf,'111',4)).toEqual({estado:'bloqueado',falhas:5}));
 it('bloqueado não libera nem com dígitos certos',()=>expect(conferirDigitos(cpf,'529',5).estado).toBe('bloqueado'));
 it('expiração e revogação',()=>{const agora=new Date('2026-10-13T12:00:00Z');
  expect(estadoLink({expira_em:'2026-10-20T12:00:00Z',revogado:false,tentativas_falhas:0},agora)).toBe('valido');
  expect(estadoLink({expira_em:'2026-10-13T11:59:00Z',revogado:false,tentativas_falhas:0},agora)).toBe('expirado');
  expect(estadoLink({expira_em:'2026-10-20T12:00:00Z',revogado:true,tentativas_falhas:0},agora)).toBe('expirado');
  expect(estadoLink({expira_em:'2026-10-20T12:00:00Z',revogado:false,tentativas_falhas:5},agora)).toBe('bloqueado');});
});
