import {apiJson,sameOrigin,secretEqual,issueAdminSession,securityRateLimit,hasSeparateSessionSecret} from '../_lib/security.js';
export async function onRequest(context){
  const req=context.request;if(req.method!=='POST')return apiJson({ok:false,error:'method_not_allowed'},405,{'Allow':'POST'});if(!sameOrigin(req))return apiJson({ok:false,error:'forbidden'},403);
  const secret=String(context.env.STATS_TOKEN||'');if(!secret)return apiJson({ok:false,error:'admin_not_configured'},503);
  const a=await securityRateLimit(context,'admin-login-client',{limit:6,windowSec:900,blockSec:1800});if(!a.allowed)return apiJson({ok:false,error:'rate_limited'},429,{'Retry-After':String(a.retryAfter)});
  const g=await securityRateLimit(context,'admin-login-global',{limit:200,windowSec:900,blockSec:900,global:true});if(!g.allowed)return apiJson({ok:false,error:'rate_limited'},429,{'Retry-After':String(g.retryAfter)});
  const ct=(req.headers.get('content-type')||'').toLowerCase();if(!ct.includes('application/json'))return apiJson({ok:false,error:'unsupported_media_type'},415);
  if(Number(req.headers.get('content-length')||0)>4096)return apiJson({ok:false,error:'payload_too_large'},413);
  let body={};try{const raw=await req.text();if(raw.length>4096)return apiJson({ok:false,error:'payload_too_large'},413);body=JSON.parse(raw)}catch(e){return apiJson({ok:false,error:'invalid_request'},400)}
  const token=String(body.token||'');if(!token||token.length>512||!(await secretEqual(token,secret)))return apiJson({ok:false,error:'unauthorized'},401);
  const session=await issueAdminSession(context.env,body.remember!==false);
  return apiJson({ok:true,remembered:session.remembered,expiresAt:session.expiresAt,security:{version:'2.6',separateSessionSecret:hasSeparateSessionSecret(context.env)}},200,{'Set-Cookie':session.cookie})
}
