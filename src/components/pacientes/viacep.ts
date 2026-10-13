export type Endereco={cep:string;logradouro:string;bairro:string;municipio_nome:string;uf:string;municipio_ibge:string};
/** Looks up a Brazilian postal code on ViaCEP (public, CORS-enabled). */
export async function buscarCep(valor:string):Promise<Endereco|{erro:string}>{
 const cep=valor.replace(/\D/g,'');
 if(cep.length!==8)return {erro:'O CEP precisa ter 8 números.'};
 try{const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`);if(!r.ok)return {erro:'CEP inválido. Confira os números.'};const j=await r.json();
  if(j.erro)return {erro:'CEP não encontrado. Confira os números ou preencha o endereço à mão.'};
  return {cep,logradouro:j.logradouro??'',bairro:j.bairro??'',municipio_nome:j.localidade??'',uf:j.uf??'',municipio_ibge:j.ibge??''};
 }catch{return {erro:'Não foi possível consultar o CEP agora. Preencha o endereço à mão.'};}
}
