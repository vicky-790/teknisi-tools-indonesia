import {apiJson,sameOrigin,secretEqual,issueAdminSession,securityRateLimit,hasSeparateSessionSecret,getAdminSecret,getOwnerSecret,configuredRoles,securityAudit} from '../_lib/security.js';
export async function onRequest(context){
  const req=context.request;if(req.method!=='POST')return apiJson({ok:false,error:'method_not_allowed'},405,{'Allow':'POST'});if(!sameOrigin(req))return apiJson({ok:false,error:'forbidden'},403);
  const roles=configuredRoles(context.env);if(!roles.admin&&!roles.owner)return apiJson({ok:false,error:'admin_not_configured'},503);
  const a=await securityRateLimit(context,'admin-login-client',{limit:6,windowSec:900,blockSec:1800});if(!a.allowed){await securityAudit(context,'login','unknown','rate_limited');return apiJson({ok:false,error:'rate_limited'},429,{'Retry-After':String(a.retryAfter)})}
  const g=await securityRateLimit(context,'admin-login-global',{limit:200,windowSec:900,blockSec:900,global:true});if(!g.allowed)return apiJson({ok:false,error:'rate_limited'},429,{'Retry-After':String(g.retryAfter)});
  const ct=(req.headers.get('content-type')||'').toLowerCase();if(!ct.includes('application/json'))return apiJson({ok:false,error:'unsupported_media_type'},415);
  if(Number(req.headers.get('content-length')||0)>4096)return apiJson({ok:false,error:'payload_too_large'},413);
  let body={};try{const raw=await req.text();if(raw.length>4096)return apiJson({ok:false,error:'payload_too_large'},413);body=JSON.parse(raw)}catch(e){return apiJson({ok:false,error:'invalid_request'},400)}
  const token=String(body.token||'');if(!token||token.length>512){await securityAudit(context,'login','unknown','denied','empty_or_oversize');return apiJson({ok:false,error:'unauthorized'},401)}
  const requested=String(body.role||'auto').toLowerCase();let role=null;
  if((requested==='owner'||requested==='auto')&&roles.owner&&await secretEqual(token,getOwnerSecret(context.env)))role='owner';
  if(!role&&(requested==='admin'||requested==='auto')&&roles.admin&&await secretEqual(token,getAdminSecret(context.env)))role='admin';
  if(!role){await securityAudit(context,'login',requested==='owner'?'owner':'admin','denied');return apiJson({ok:false,error:'unauthorized'},401)}
  const session=await issueAdminSession(context.env,body.remember!==false,role);await securityAudit(context,'login',role,'success');
  return apiJson({ok:true,role,remembered:session.remembered,expiresAt:session.expiresAt,security:{version:'2.8.2',rbac:true,separateSessionSecret:hasSeparateSessionSecret(context.env)}},200,{'Set-Cookie':session.cookie})
}
