// DANFSe-style PDF for the mock issuer. Built-in Helvetica only (no filesystem fonts).
import {Document,Page,Text,View,StyleSheet,Svg,Rect,pdf} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type {NotaPayload} from '../nota';

const s=StyleSheet.create({
 page:{padding:28,fontFamily:'Helvetica',fontSize:9,color:'#1f2937'},
 header:{flexDirection:'row',justifyContent:'space-between',borderBottom:'1.5pt solid #0f4c4c',paddingBottom:8,marginBottom:10},
 title:{fontSize:13,fontFamily:'Helvetica-Bold',color:'#0f4c4c'},
 sub:{fontSize:8,color:'#6b7280',marginTop:2},
 block:{border:'0.75pt solid #cbd5e1',borderRadius:3,padding:8,marginBottom:8},
 blockTitle:{fontSize:8,fontFamily:'Helvetica-Bold',color:'#0f4c4c',marginBottom:4,textTransform:'uppercase'},
 row:{flexDirection:'row',marginBottom:2},label:{width:130,color:'#6b7280'},value:{flex:1},
 watermark:{position:'absolute',top:380,left:-120,width:840,textAlign:'center',fontSize:30,fontFamily:'Helvetica-Bold',color:'#dc2626',opacity:0.16,transform:'rotate(-35deg)'},
 footer:{position:'absolute',bottom:20,left:28,right:28,fontSize:7,color:'#9ca3af',textAlign:'center'},
});
const brl=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const L=({l,v}:{l:string;v:string|null|undefined})=><View style={s.row}><Text style={s.label}>{l}</Text><Text style={s.value}>{v||'—'}</Text></View>;
const Bloco=({t,children}:{t:string;children:React.ReactNode})=><View style={s.block}><Text style={s.blockTitle}>{t}</Text>{children}</View>;

function Qr({texto,size=78}:{texto:string;size?:number}){
 const q=QRCode.create(texto,{errorCorrectionLevel:'M'});const n=q.modules.size;const c=size/n;const rects=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.modules.get(x,y))rects.push(<Rect key={`${x}-${y}`} x={x*c} y={y*c} width={c} height={c} fill="#111827"/>);
 return <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{rects}</Svg>;
}

export type DadosDanfse={payload:NotaPayload;numero:string;chave:string;emitidaEm:string;demonstracao:boolean};
export function Danfse({payload:p,numero,chave,emitidaEm,demonstracao}:DadosDanfse){
 const end=p.tomador.endereco;
 return <Document title={`DANFSe ${numero}`} author="Notas BNaves"><Page size="A4" style={s.page}>
  {demonstracao&&<Text style={s.watermark} fixed>SEM VALOR FISCAL — DEMONSTRAÇÃO</Text>}
  <View style={s.header}><View><Text style={s.title}>DANFSe — Documento Auxiliar da NFS-e</Text><Text style={s.sub}>Nota Fiscal de Serviço Eletrônica · Padrão Nacional</Text><Text style={[s.sub,{marginTop:6}]}>Número: {numero}   ·   Emissão: {new Date(emitidaEm).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}   ·   Competência: {p.competencia.split('-').reverse().join('/')}</Text><Text style={s.sub}>Chave de acesso: {chave}</Text></View><Qr texto={demonstracao?'#demo':`https://www.nfse.gov.br/consultapublica?chave=${chave}`}/></View>
  <Bloco t="Emitente (prestador)"><L l="Razão social" v={p.prestador.razao_social}/><L l="CNPJ" v={p.prestador.cnpj??'não informado (demonstração)'}/><L l="Inscrição municipal" v={p.prestador.inscricao_municipal}/><L l="Município (IBGE)" v={p.prestador.municipio_ibge}/><L l="Regime" v={p.prestador.regime}/></Bloco>
  <Bloco t="Tomador"><L l={p.tomador.tipo==='cnpj'?'CNPJ':'CPF'} v={p.tomador.documento}/><L l="Nome" v={p.tomador.nome}/>{end&&<L l="Endereço" v={[end.logradouro,end.numero,end.complemento,end.bairro].filter(Boolean).join(', ')+` — ${end.municipio_nome??''}/${end.uf??''} · CEP ${end.cep??''}`}/>}<L l="E-mail" v={p.tomador.email}/><L l="Telefone" v={p.tomador.telefone}/></Bloco>
  <Bloco t="Serviço"><L l="Descrição" v={p.servico.descricao}/><L l="Cód. tributação nacional" v={p.servico.c_trib_nac}/><L l="Cód. tributação municipal" v={p.servico.c_trib_mun}/><L l="NBS" v={p.servico.nbs}/><L l="Indicador da operação" v={p.servico.c_ind_op}/><L l="Município de incidência" v={p.servico.municipio_incidencia_ibge}/></Bloco>
  <Bloco t="Valores"><L l="Valor do serviço" v={brl(p.valores.servico)}/><L l="ISS retido" v={p.valores.iss_retido?'Sim, pelo tomador':'Não'}/><L l="Valor líquido" v={brl(p.valores.servico)}/></Bloco>
  <Bloco t="Tributos"><L l="Tributação do ISSQN" v={p.servico.trib_issqn}/><L l="PIS/COFINS (CST)" v={p.valores.pis_cofins_cst}/><L l="IBS/CBS (CST / classTrib)" v={`${p.valores.ibscbs_cst??'—'} / ${p.valores.ibscbs_class_trib??'—'}`}/><L l="Valor aprox. dos tributos" v={`${brl(p.valores.valor_aprox_tributos)} (${p.valores.aliquota_simples.toLocaleString('pt-BR')}% — Simples Nacional)`}/></Bloco>
  <Text style={s.footer} fixed>{demonstracao?'Documento gerado em ambiente de demonstração. Não possui validade fiscal.':'Consulte a autenticidade no Portal Nacional da NFS-e.'} · Notas BNaves por Goable AI</Text>
 </Page></Document>;
}

export async function gerarDanfse(d:DadosDanfse):Promise<Uint8Array>{
 const blob=await pdf(<Danfse {...d}/>).toBlob();
 return new Uint8Array(await blob.arrayBuffer());
}
