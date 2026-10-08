import {apiJson,sameOrigin,readAdminSession,configuredRoles,securityRateLimit} from '../_lib/security.js';
export async function onRequest(context){
 const req=context.request;if(req.method!=='GET')return apiJson({ok:false,error:'method_not_allowed'},405,{'Allow':'GET'});if(!sameOrigin(req))return apiJson({ok:false,error:'forbidden'},403);
 const rl=await securityRateLimit(context,'admin-session',{limit:120,windowSec:300,blockSec:300});if(!rl.allowed)return apiJson({ok:false,error:'rate_limited'},429,{'Retry-After':String(rl.retryAfter)});
 const s=await readAdminSession(req,context.env);if(!s.ok)return apiJson({ok:false,authenticated:false,configured:configuredRoles(context.env)},401);
 return apiJson({ok:true,authenticated:true,role:s.role,expiresAt:s.expiresAt,sessionVersion:s.version,capabilities:s.role==='owner'?['analytics','operations','security_posture','audit_log','owner_settings']:['analytics','operations'],configured:configuredRoles(context.env)})
}
