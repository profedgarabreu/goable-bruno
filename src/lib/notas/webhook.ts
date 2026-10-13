/** 503 while the secret is not configured, 401 on mismatch (constant-time compare), 200 when valid. */
export function verificarSegredoWebhook(secret:string|undefined,header:string|null):200|401|503{
 if(!secret)return 503;
 const x=new TextEncoder().encode(header??''),y=new TextEncoder().encode(secret);
 let d=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)d|=(x[i]??0)^(y[i]??0);
 return d===0?200:401;
}
