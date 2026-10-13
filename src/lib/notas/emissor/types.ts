import type {NotaPayload} from '../nota';
export type ResultadoEmissao={status:'processando'|'autorizada'|'erro';chave?:string|undefined;numero?:string|undefined;mensagem?:string|undefined;bruto:unknown};
export type ResultadoCancelamento={ok:boolean;mensagem?:string|undefined;bruto:unknown};
export interface EmissorNFSe{
 emitir(p:NotaPayload):Promise<ResultadoEmissao>;
 consultar(ref:string):Promise<ResultadoEmissao>;
 cancelar(ref:string,motivo:string):Promise<ResultadoCancelamento>;
 baixarPdf(ref:string):Promise<Uint8Array>;
 baixarXml(ref:string):Promise<string>;
}
export class EmissorIndisponivel extends Error{}
