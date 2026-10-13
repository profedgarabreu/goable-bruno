import {camposFicha,normalizarFicha} from './rules';

export const PROMPT_FICHA=`Você extrai dados cadastrais de um texto copiado da ficha de um paciente no sistema ProntMed.
Regras obrigatórias:
- Retorne SOMENTE informações que aparecem literalmente no texto. Nunca invente, deduza ou complete dados.
- Use null para qualquer campo ausente ou ambíguo.
- cpf, celular e cep: apenas os dígitos encontrados no texto.
- logradouro: tipo + nome da via (ex.: "Rua dos Timbiras"), sem número, complemento ou bairro.
- numero: só o número do imóvel. complemento: apto, sala, bloco etc.
- municipio_nome: nome da cidade. uf: sigla de 2 letras.
- data_nascimento: como aparece (DD/MM/AAAA).
- Ignore campos não pedidos (indicação, sexo, estado civil, naturalidade etc.).`;

const schema={type:'object',additionalProperties:false,required:[...camposFicha],properties:Object.fromEntries(camposFicha.map(k=>[k,{type:['string','null']}]))};

export async function extrairDaFicha(texto:string,apiKey:string){
 const res=await fetch('https://ai.gateway.lovable.dev/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Lovable-API-Key':apiKey,'X-Lovable-AIG-SDK':'fetch'},body:JSON.stringify({model:'openai/gpt-6-astra',stream:true,store:false,reasoning:{effort:'low'},instructions:PROMPT_FICHA,input:[{role:'user',content:texto}],text:{format:{type:'json_schema',name:'ficha_paciente',strict:true,schema}}})});
 if(res.status===402)throw new Error('Créditos de IA esgotados. Avise a administração Goable.');
 if(res.status===429)throw new Error('Muitas leituras seguidas. Aguarde um minuto e tente de novo.');
 if(!res.ok||!res.body)throw new Error('Não foi possível ler a ficha agora. Tente novamente.');
 const reader=res.body.getReader();const dec=new TextDecoder();let buf='',out='',falhou=false;
 for(;;){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line.startsWith('data:'))continue;const payload=line.slice(5).trim();if(payload==='[DONE]')continue;try{const ev=JSON.parse(payload);if(ev.type==='response.output_text.delta')out+=ev.delta;else if(ev.type==='response.failed'||ev.type==='error')falhou=true;}catch{/* ignore partial */}}}
 if(falhou||!out)throw new Error('Não foi possível ler a ficha agora. Tente novamente.');
 let bruto:Record<string,unknown>;try{bruto=JSON.parse(out);}catch{throw new Error('A leitura da ficha veio incompleta. Tente novamente.');}
 return normalizarFicha(bruto,texto);
}
