import {describe,it,expect} from 'vitest';
import {maskCpf,validOperator,saoPauloDate,demoAppointments} from '@/lib/clinic';
describe('Clinic M0 rules',()=>{
 it('masks CPF in lists and hides first three and last two digits',()=>{expect(maskCpf('12345678909')).toBe('***.456.789-**');});
 it('accepts only Marli or Cíntia as session operators',()=>{expect(validOperator('Marli')).toBe(true);expect(validOperator('Cíntia')).toBe(true);expect(validOperator('Admin')).toBe(false);});
 it('displays dates in São Paulo timezone',()=>{expect(saoPauloDate(new Date('2026-10-13T00:38:00Z'))).toBe('2026-10-12');});
 it('has eight fictitious appointments for M0',()=>{expect(demoAppointments).toHaveLength(8);});
});
