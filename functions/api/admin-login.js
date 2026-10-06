const COOKIE='__Host-tti_admin';
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex',...headers}})}
function safeEq(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function b64url(buf){let s='';for(const b of new Uint8Array(buf))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sign(secret,msg){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64url(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(msg)))}
export async function onRequest(context){
  const req=context.request;if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  const secret=String(context.env.STATS_TOKEN||'');if(!secret)return json({ok:false,error:'stats_token_not_configured'},503);
  let body={};try{body=await req.json()}catch(e){return json({ok:false,error:'invalid_json'},400)}
  const token=String(body.token||'');if(!safeEq(token,secret))return json({ok:false,error:'unauthorized'},401);
  const remember=body.remember!==false,ttl=remember?30*86400:12*3600,exp=Date.now()+ttl*1000,base=`v1.${exp}`,sig=await sign(secret,base),value=`${base}.${sig}`;
  let cookie=`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict`;
  if(remember)cookie+=`; Max-Age=${ttl}`;
  return json({ok:true,remembered:remember,expiresAt:new Date(exp).toISOString()},200,{'Set-Cookie':cookie});
}
