import {describe,it,expect} from 'vitest';
import {diasUteis,planoDia,FORMAS} from '@/lib/notas/demo';
const pac=['a','b','c','d','e','f','g','h','i','j'];
describe('demonstração',()=>{
 it('cobre do 1º dia útil do mês anterior até ontem, sem fins de semana',()=>{
  const d=diasUteis('2026-10-13');
  expect(d[0]).toBe('2026-09-01');expect(d.at(-1)).toBe('2026-10-12');expect(d).not.toContain('2026-10-11');expect(d).not.toContain('2026-10-13');
 });
 it('virada de ano: janeiro começa em dezembro',()=>{expect(diasUteis('2027-01-05')[0]).toBe('2026-12-01');});
 it('8 a 12 atendimentos por dia, sem repetir paciente+serviço, e determinístico',()=>{
  for(const dia of diasUteis('2026-10-13')){const p=planoDia(dia,pac);expect(p.length).toBeGreaterThanOrEqual(8);expect(p.length).toBeLessThanOrEqual(12);
   expect(new Set(p.map(l=>l.paciente+l.servico)).size).toBe(p.length);expect(planoDia(dia,pac)).toEqual(p);}
 });
 it('formas de pagamento seguem a distribuição pedida (±6 pontos)',()=>{
  const todas=diasUteis('2026-10-13').flatMap(d=>planoDia(d,pac));const n=todas.length;
  for(const [f,w] of FORMAS)expect(Math.abs(todas.filter(l=>l.forma===f).length/n*100-w)).toBeLessThan(6);
 });
 it('cirurgia a laser aparece 1 a 2 vezes por semana em média',()=>{
  const dias=diasUteis('2026-10-13');const laser=dias.flatMap(d=>planoDia(d,pac)).filter(l=>l.servico==='Cirurgia a laser').length;
  const semanas=dias.length/5;expect(laser/semanas).toBeGreaterThanOrEqual(0.8);expect(laser/semanas).toBeLessThanOrEqual(2.2);
 });
});
