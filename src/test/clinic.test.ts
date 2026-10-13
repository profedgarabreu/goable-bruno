import {describe,it,expect} from 'vitest';
import {maskCpf,parseOperator,saoPauloDate} from '@/lib/clinic';
describe('Clinic M0 rules',()=>{
 it('masks CPF in lists and hides first three and last two digits',()=>{expect(maskCpf('12345678909')).toBe('***.456.789-**');});
 it('parses only well-formed stored operators',()=>{expect(parseOperator(JSON.stringify({id:'d0000000-0000-0000-0000-000000000001',nome:'Marli'}))?.nome).toBe('Marli');expect(parseOperator('Marli')).toBeNull();expect(parseOperator(JSON.stringify({id:'x',nome:'A'}))).toBeNull();});
 it('displays dates in São Paulo timezone',()=>{expect(saoPauloDate(new Date('2026-10-13T00:38:00Z'))).toBe('2026-10-12');});
});
