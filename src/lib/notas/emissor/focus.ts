import type {NotaPayload} from '../nota';
import {EmissorIndisponivel,type EmissorNFSe,type ResultadoEmissao} from './types';
import {focusBaseUrl,paraFocus,deFocus} from './focusMapper';

/** Focus NFe adapter (NFSe Nacional). Auth: HTTP Basic with the token as user and empty password. */
export class FocusEmissor implements EmissorNFSe{
 private base:string;private auth:string;
 constructor(private ambiente:'homologacao'|'producao',token:string|undefined){
  if(!token)throw new EmissorIndisponivel(`Emissão em ${ambiente==='producao'?'produção':'homologação'} indisponível: o token da Focus NFe ainda não foi configurado.`);
  this.base=focusBaseUrl(ambiente);this.auth=`Basic ${btoa(`${token}:`)}`;
 }
 private async req(path:string,init:RequestInit={}){
  const r=await fetch(`${this.base}${path}`,{...init,headers:{Authorization:this.auth,'Content-Type':'application/json',...(init.headers??{})}});
  const txt=await r.text();let json:unknown;try{json=txt?JSON.parse(txt):{};}catch{json={mensagem:txt.slice(0,300)};}
  return {status:r.status,json:json as Record<string,unknown>};
 }
 async emitir(p:NotaPayload):Promise<ResultadoEmissao>{
  const r=await this.req(`/v2/nfsen?ref=${encodeURIComponent(p.referencia)}`,{method:'POST',body:JSON.stringify(paraFocus(p))});
  // A ref already sent returns its current state (idempotent); 4xx validation errors are synchronous.
  if(r.status===422&&String(r.json['codigo']??'').includes('ja_autorizad'))return this.consultar(p.referencia); // CONFIRMAR NA DOC
  if(r.status>=400)return {status:'erro',mensagem:String(r.json['mensagem']??`HTTP ${r.status}`),bruto:r.json};
  return deFocus(r.json);
 }
 async consultar(ref:string){const r=await this.req(`/v2/nfsen/${encodeURIComponent(ref)}`);if(r.status===404)return {status:'erro' as const,mensagem:'Nota não encontrada no emissor',bruto:r.json};return deFocus(r.json);}
 async cancelar(ref:string,motivo:string){
  const r=await this.req(`/v2/nfsen/${encodeURIComponent(ref)}`,{method:'DELETE',body:JSON.stringify({justificativa:motivo.padEnd(15,'.')})}); // CONFIRMAR NA DOC: mínimo de 15 caracteres
  const ok=r.status<400&&String(r.json['status']??'')==='cancelado';
  return {ok,mensagem:ok?undefined:String(r.json['mensagem']??r.json['status']??`HTTP ${r.status}`),bruto:r.json};
 }
 private async arquivo(ref:string,campo:'url_danfse'|'caminho_xml_nota_fiscal'){
  const c=await this.req(`/v2/nfsen/${encodeURIComponent(ref)}`);const caminho=String(c.json[campo]??'');
  if(!caminho)throw new Error('Arquivo ainda não disponível no emissor.');
  const url=caminho.startsWith('http')?caminho:`${this.base}${caminho}`; // CONFIRMAR NA DOC
  const r=await fetch(url,{headers:caminho.startsWith('http')?{}:{Authorization:this.auth}});
  if(!r.ok)throw new Error(`Falha ao baixar arquivo (HTTP ${r.status}).`);return r;
 }
 async baixarPdf(ref:string){return new Uint8Array(await (await this.arquivo(ref,'url_danfse')).arrayBuffer());}
 async baixarXml(ref:string){return (await this.arquivo(ref,'caminho_xml_nota_fiscal')).text();}
}
