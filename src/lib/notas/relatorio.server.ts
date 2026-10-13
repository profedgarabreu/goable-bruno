export const PROMPT_RELATORIO=`Você lê a imagem ou PDF de um Relatório Financeiro do sistema ProntMed de um consultório médico.
Extraia uma linha por atendimento da tabela.
Regras obrigatórias:
- Use SOMENTE o que está visível e legível no documento. Nunca invente, deduza ou complete dados.
- Use null em qualquer campo ausente, vazio ou ilegível.
- data: como aparece (DD/MM/AAAA).
- paciente: nome completo como aparece.
- procedimento: o tipo de atendimento/procedimento como aparece.
- profissional: nome do médico/profissional como aparece.
- valor: o valor como aparece (ex.: "630,00").
- forma_pagamento: como aparece (ex.: "PIX", "Cartão de crédito"); null se vazio.
- convenio_ou_particular: como aparece (ex.: "Particular", "UNIMED").
- Ignore cabeçalhos, totais, subtotais e rodapés.`;

const campos=['data','paciente','procedimento','profissional','valor','forma_pagamento','convenio_ou_particular'] as const;
export type LinhaRelatorio=Record<(typeof campos)[number],string|null>;
const schema={type:'object',additionalProperties:false,required:['linhas'],properties:{linhas:{type:'array',items:{type:'object',additionalProperties:false,required:[...campos],properties:Object.fromEntries(campos.map(k=>[k,{type:['string','null']}]))}}}};

export async function extrairDoRelatorio(base64:string,mime:string,apiKey:string):Promise<LinhaRelatorio[]>{
 const dataUrl=`data:${mime};base64,${base64}`;
 const arquivo=mime==='application/pdf'?{type:'input_file',filename:'relatorio.pdf',file_data:dataUrl}:{type:'input_image',image_url:dataUrl};
 const res=await fetch('https://ai.gateway.lovable.dev/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Lovable-API-Key':apiKey,'X-Lovable-AIG-SDK':'fetch'},body:JSON.stringify({model:'openai/gpt-6-astra',stream:true,store:false,reasoning:{effort:'low'},instructions:PROMPT_RELATORIO,input:[{role:'user',content:[{type:'input_text',text:'Extraia as linhas de atendimento deste relatório.'},arquivo]}],text:{format:{type:'json_schema',name:'relatorio_prontmed',strict:true,schema}}})});
 if(res.status===402)throw new Error('Créditos de IA esgotados. Avise a administração Goable.');
 if(res.status===429)throw new Error('Muitas leituras seguidas. Aguarde um minuto e tente de novo.');
 if(!res.ok||!res.body)throw new Error('Não foi possível ler o relatório agora. Tente novamente.');
 const reader=res.body.getReader();const dec=new TextDecoder();let buf='',out='',falhou=false;
 for(;;){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line.startsWith('data:'))continue;const payload=line.slice(5).trim();if(payload==='[DONE]')continue;try{const ev=JSON.parse(payload);if(ev.type==='response.output_text.delta')out+=ev.delta;else if(ev.type==='response.failed'||ev.type==='error')falhou=true;}catch{/* partial */}}}
 if(falhou||!out)throw new Error('Não foi possível ler o relatório agora. Tente novamente.');
 try{const j=JSON.parse(out) as {linhas:LinhaRelatorio[]};return (j.linhas??[]).filter(l=>l.paciente);}catch{throw new Error('A leitura do relatório veio incompleta. Tente novamente.');}
}
