import {describe,it,expect} from 'vitest';
import {resumirHistorico,variacao,nomeExportacao,nomeArquivoNota,deslocarCompetencia,intervaloCompetencia,resumoAuditoria,contarNotasAtencao,type LinhaHistorico} from '@/lib/notas/historico';

const base:LinhaHistorico={id:'1',numero:'1',chave:null,status:'autorizada',valor:630,aliquota:11.8,data:'2026-10-13',emitida_em:null,paciente:'Maria Souza',cpf:null,servico:'Consulta',descricao:null,medico:'Dr. Bruno',forma:'pix',motivo:null,substituta:null,envio:'',c_trib_nac:null,nbs:null};
const l=(o:Partial<LinhaHistorico>)=>({...base,...o});

describe('histórico mensal',()=>{
 const rows=[l({id:'a',valor:630}),l({id:'b',valor:470,forma:'credito'}),l({id:'c',valor:350,servico:'Escleroterapia',forma:'debito',data:'2026-10-01'}),l({id:'d',valor:470,status:'cancelada'}),l({id:'e',valor:100,status:'substituida'})];
 const s=resumirHistorico(rows,'2026-10');
 it('soma só autorizadas no total',()=>{expect(s.emitidas).toBe(3);expect(s.total).toBe(1450);expect(s.ticket).toBe(483.33);});
 it('canceladas e substituídas ficam separadas',()=>{expect(s.canceladas).toEqual({quantidade:2,valor:570});});
 it('tributos = valor × alíquota%',()=>{expect(s.tributos).toBe(171.1);});
 it('quebras por forma e serviço',()=>{expect(s.porForma.map(q=>q.chave).sort()).toEqual(['Crédito','Débito','Pix']);expect(s.porServico.find(q=>q.chave==='Consulta')?.valor).toBe(1100);});
 it('evolução diária tem todos os dias do mês',()=>{expect(s.porDia).toHaveLength(31);expect(s.porDia[0]!.valor).toBe(350);expect(s.porDia[12]!.valor).toBe(1100);});
 it('variação vs. mês anterior',()=>{expect(variacao(1100,1000)).toBe(10);expect(variacao(900,1000)).toBe(-10);expect(variacao(5,0)).toBeNull();});
 it('competências',()=>{expect(deslocarCompetencia('2026-01',-1)).toBe('2025-12');expect(intervaloCompetencia('2026-02').ate).toBe('2026-02-28');});
});
describe('nomes de exportação',()=>{
 it('sufixo _DEMONSTRACAO em mock',()=>{expect(nomeExportacao('2026-10','mock','xlsx')).toBe('Notas_BNaves_2026-10_DEMONSTRACAO.xlsx');expect(nomeExportacao('2026-10','producao','zip')).toBe('Notas_BNaves_2026-10.zip');});
 it('arquivo da nota com primeiro nome',()=>{expect(nomeArquivoNota('12','maria aparecida','pdf')).toBe('NFSe_12_Maria.pdf');});
});
describe('auditoria',()=>{
 it('resumo legível do ok de pagamento',()=>{expect(resumoAuditoria({operador:'Marli',acao:'ok_pagamento',entidade:'nf_atendimentos',antes:{status:'aguardando_pagamento'},depois:{status:'pago_ok'},contexto:{paciente:'Maria Aparecida Souza',valor:630,forma:'pix'}})).toBe('Marli marcou como pago o atendimento de Maria S. — Pix — R$ 630,00'.replace(/ /g,' ').replace('R$ 630','R$\u00a0630'));});
 it('badge de notas = erros + sem contato',()=>{expect(contarNotasAtencao([{status:'erro',envios:[]},{status:'autorizada',envios:[{status:'sem_contato',created_at:'1'}]},{status:'autorizada',envios:[{status:'sem_contato',created_at:'1'},{status:'simulado',created_at:'2'}]},{status:'autorizada',envios:[]}])).toBe(2);});
});
