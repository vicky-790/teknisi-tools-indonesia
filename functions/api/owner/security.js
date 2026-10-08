import {apiJson,sameOrigin,verifyRoleRequest,securityRateLimit,configuredRoles,hasSeparateSessionSecret} from '../../_lib/security.js';
export async function onRequest(context){
 const req=context.request;if(req.method!=='GET')return apiJson({ok:false,error:'method_not_allowed'},405,{'Allow':'GET'});if(!sameOrigin(req))return apiJson({ok:false,error:'forbidden'},403);
 const auth=await verifyRoleRequest(req,context.env,['owner']);if(!auth.ok)return apiJson({ok:false,error:auth.role==='admin'?'owner_required':'unauthorized'},auth.role==='admin'?403:401);
 const rl=await securityRateLimit(context,'owner-security',{limit:60,windowSec:300,blockSec:600});if(!rl.allowed)return apiJson({ok:false,error:'rate_limited'},429,{'Retry-After':String(rl.retryAfter)});
 const roles=configuredRoles(context.env),db=context.env.ANALYTICS_DB;let audit=[];
 if(db)try{const r=await db.prepare(`SELECT created_at,action,role,outcome,detail FROM security_audit ORDER BY id DESC LIMIT 30`).all();audit=r.results||[]}catch(e){}
 return apiJson({ok:true,role:'owner',posture:{rbac:true,ownerTokenConfigured:roles.owner,adminTokenConfigured:roles.admin,separateSessionSecret:hasSeparateSessionSecret(context.env),legacyHeaderTokenEnabled:String(context.env.ALLOW_STATS_TOKEN_HEADER||'')==='1',sameOriginRequired:true,rateLimit:true,auditLog:!!db},audit})
}
