import type {NotaPayload} from '../nota';
import type {EmissorNFSe,ResultadoEmissao} from './types';

export type MockRegistro={payload:NotaPayload;enviadoEm:string|null;numero:string|null;chave:string|null;emitidaEm:string|null};
export type MockDeps={buscar:(ref:string)=>Promise<MockRegistro|null>;proximoNumero:()=>Promise<number>;agora?:()=>number};

/** Deterministic fictitious 50-digit access key derived from the reference (same ref → same key). */
export function chaveFicticia(ref:string){
 let out='';let h=2166136261;
 for(let i=0;out.length<50;i++){h^=ref.charCodeAt(i%ref.length)+i;h=Math.imul(h,16777619)>>>0;out+=String(h%10);}
 return out;
}
const cpfErro=(p:NotaPayload)=>p.tomador.tipo==='cpf'&&p.tomador.documento.endsWith('00');
const ERRO_CPF='E0160 — CPF do tomador inválido';
export const MOCK_ATRASO_MS=3000;

export function xmlDps(p:NotaPayload,numero:string|null,chave:string|null){
 const esc=(v:unknown)=>String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
 return `<?xml version="1.0" encoding="UTF-8"?>
<DPS versao="1.00" ambiente="demonstracao">
  <infDPS Id="${esc(p.referencia)}">
    <dCompet>${esc(p.competencia)}</dCompet>
    <nNFSe>${esc(numero)}</nNFSe>
    <chNFSe>${esc(chave)}</chNFSe>
    <prest><CNPJ>${esc(p.prestador.cnpj)}</CNPJ><IM>${esc(p.prestador.inscricao_municipal)}</IM><xNome>${esc(p.prestador.razao_social)}</xNome><cMun>${esc(p.prestador.municipio_ibge)}</cMun></prest>
    <toma><${p.tomador.tipo==='cnpj'?'CNPJ':'CPF'}>${esc(p.tomador.documento)}</${p.tomador.tipo==='cnpj'?'CNPJ':'CPF'}><xNome>${esc(p.tomador.nome)}</xNome><email>${esc(p.tomador.email)}</email></toma>
    <serv><cTribNac>${esc(p.servico.c_trib_nac)}</cTribNac><cTribMun>${esc(p.servico.c_trib_mun)}</cTribMun><cNBS>${esc(p.servico.nbs)}</cNBS><xDescServ>${esc(p.servico.descricao)}</xDescServ><cLocIncid>${esc(p.servico.municipio_incidencia_ibge)}</cLocIncid></serv>
    <valores><vServ>${p.valores.servico.toFixed(2)}</vServ><tpRetISSQN>${p.valores.iss_retido?2:1}</tpRetISSQN><CST_PISCOFINS>${esc(p.valores.pis_cofins_cst)}</CST_PISCOFINS><CST_IBSCBS>${esc(p.valores.ibscbs_cst)}</CST_IBSCBS><cClassTrib>${esc(p.valores.ibscbs_class_trib)}</cClassTrib><pTotTribSN>${p.valores.aliquota_simples.toFixed(2)}</pTotTribSN><vTotTrib>${p.valores.valor_aprox_tributos.toFixed(2)}</vTotTrib></valores>
  </infDPS>
</DPS>
`;
}

/** Demo issuer: first answer "processando", authorized on the next query ~3 s later. State lives in nf_notas (stateless workers). */
export class MockEmissor implements EmissorNFSe{
 constructor(private deps:MockDeps){}
 private agora(){return this.deps.agora?.()??Date.now();}
 async emitir(p:NotaPayload):Promise<ResultadoEmissao>{
  if(cpfErro(p))return {status:'erro',mensagem:ERRO_CPF,bruto:{mock:true,codigo:'E0160',mensagem:'CPF do tomador inválido'}};
  return {status:'processando',bruto:{mock:true,status:'processando',enviado_em:new Date(this.agora()).toISOString()}};
 }
 async consultar(ref:string):Promise<ResultadoEmissao>{
  const r=await this.deps.buscar(ref);
  if(!r)return {status:'erro',mensagem:'Nota não encontrada no emissor de demonstração',bruto:{mock:true}};
  if(cpfErro(r.payload))return {status:'erro',mensagem:ERRO_CPF,bruto:{mock:true,codigo:'E0160'}};
  if(r.numero&&r.chave)return {status:'autorizada',numero:r.numero,chave:r.chave,bruto:{mock:true,status:'autorizada'}};
  if(!r.enviadoEm||this.agora()-new Date(r.enviadoEm).getTime()<MOCK_ATRASO_MS)return {status:'processando',bruto:{mock:true,status:'processando'}};
  const numero=String(await this.deps.proximoNumero());
  return {status:'autorizada',numero,chave:chaveFicticia(ref),bruto:{mock:true,status:'autorizada',numero}};
 }
 async cancelar(_ref:string,motivo:string){return {ok:true,bruto:{mock:true,status:'cancelada',motivo}};}
 private async exigir(ref:string){const r=await this.deps.buscar(ref);if(!r?.numero||!r.chave)throw new Error('Nota ainda não autorizada.');return r;}
 async baixarPdf(ref:string){const r=await this.exigir(ref);const {gerarDanfse}=await import('./danfse');return gerarDanfse({payload:r.payload,numero:r.numero!,chave:r.chave!,emitidaEm:r.emitidaEm??new Date().toISOString(),demonstracao:true});}
 async baixarXml(ref:string){const r=await this.exigir(ref);return xmlDps(r.payload,r.numero,r.chave);}
}
