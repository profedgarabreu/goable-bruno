import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/integrations/supabase/types';
import type {NotaPayload} from './nota';
import {competenciaDe} from './rules';
type Db=SupabaseClient<Database>;

/**
 * Demo history notes are created without files to keep "Preparar demonstração" light.
 * The first time someone opens a PDF/XML (or exports the month) the mock files are generated
 * from the stored payload snapshot and saved, so later opens reuse them.
 */
export async function garantirArquivos(db:Db,notaId:string){
 const {data:n,error}=await db.from('nf_notas').select('id,status,ambiente,numero,chave_acesso,emitida_em,payload_enviado,pdf_path,xml_path').eq('id',notaId).single();
 if(error||!n)throw new Error('Nota não encontrada.');
 if(n.pdf_path&&n.xml_path)return {pdf_path:n.pdf_path,xml_path:n.xml_path};
 if(n.ambiente!=='mock'||!['autorizada','cancelada','substituida'].includes(n.status)||!n.payload_enviado)return {pdf_path:n.pdf_path,xml_path:n.xml_path};
 const payload=n.payload_enviado as unknown as NotaPayload;const emitidaEm=n.emitida_em??new Date().toISOString();
 const [{gerarDanfse},{xmlDps}]=await Promise.all([import('./emissor/danfse'),import('./emissor/mock')]);
 const pdf=await gerarDanfse({payload,numero:n.numero??'',chave:n.chave_acesso??'',emitidaEm,demonstracao:true});
 const xml=xmlDps(payload,n.numero,n.chave_acesso);
 const pasta=competenciaDe(emitidaEm.slice(0,10));const pdfPath=`${pasta}/${n.id}.pdf`,xmlPath=`${pasta}/${n.id}.xml`;
 const st=db.storage.from('notas');
 const [u1,u2]=await Promise.all([st.upload(pdfPath,pdf,{contentType:'application/pdf',upsert:true}),st.upload(xmlPath,new TextEncoder().encode(xml),{contentType:'application/xml',upsert:true})]);
 if(u1.error||u2.error){console.error('garantirArquivos',u1.error??u2.error);throw new Error('Não foi possível preparar o arquivo da nota.');}
 await db.from('nf_notas').update({pdf_path:pdfPath,xml_path:xmlPath}).eq('id',n.id);
 return {pdf_path:pdfPath,xml_path:xmlPath};
}
