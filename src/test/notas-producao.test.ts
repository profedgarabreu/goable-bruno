import {describe,it,expect} from 'vitest';
import {avaliarChecklist,podeAtivar,type EstadoChecklist} from '@/lib/notas/producao';
const atual:EstadoChecklist={cnpj:false,inscricao:false,validado:false,competencia:'2026-10',aliquota:{informado_por:'demo — confirmar com contador'},focusHomologacao:false,notasHomologacao:0,webhook:false,focusProducao:false,resend:false,remetente:false,emailTesteEnviado:false,whatsapp:false,somenteEmail:false,demo:22,consultoriosAtivos:0,essenciaisAbertas:4,modo:'mock'};
const pronto:EstadoChecklist={...atual,cnpj:true,inscricao:true,validado:true,aliquota:{informado_por:'Marli'},focusHomologacao:true,notasHomologacao:1,webhook:true,focusProducao:true,resend:true,remetente:true,emailTesteEnviado:true,somenteEmail:true,demo:0,consultoriosAtivos:1,essenciaisAbertas:0};
const st=(e:EstadoChecklist)=>avaliarChecklist(e).map(i=>i.status);
describe('checklist de produção',()=>{
 it('tem 12 itens',()=>expect(avaliarChecklist(atual)).toHaveLength(12));
 it('alíquota de demonstração é aviso, não ok',()=>expect(st(atual)[2]).toBe('aviso'));
 it('estado atual bloqueia a ativação',()=>expect(podeAtivar(avaliarChecklist(atual))).toBe(false));
 it('tudo pronto (só e-mail) libera a ativação',()=>expect(podeAtivar(avaliarChecklist(pronto))).toBe(true));
 it('um único dado demo restante bloqueia',()=>{expect(st({...pronto,demo:1})[9]).toBe('falta');expect(podeAtivar(avaliarChecklist({...pronto,demo:1}))).toBe(false);});
 it('e-mail sem teste enviado fica em aviso',()=>expect(st({...pronto,emailTesteEnviado:false})[7]).toBe('aviso'));
 it('pendência essencial aberta bloqueia',()=>expect(st({...pronto,essenciaisAbertas:1})[11]).toBe('falta'));
});
