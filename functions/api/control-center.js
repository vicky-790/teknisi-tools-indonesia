import {apiJson,sameOrigin,verifyRoleRequest,securityRateLimit,configuredRoles,hasSeparateSessionSecret} from '../_lib/security.js';
export async function onRequest(context){
 const req=context.request;if(req.method!=='GET')return apiJson({ok:false,error:'method_not_allowed'},405,{'Allow':'GET'});if(!sameOrigin(req))return apiJson({ok:false,error:'forbidden'},403);
 const auth=await verifyRoleRequest(req,context.env,['admin','owner']);if(!auth.ok)return apiJson({ok:false,error:'unauthorized'},401);
 const rl=await securityRateLimit(context,'control-center',{limit:120,windowSec:300,blockSec:600});if(!rl.allowed)return apiJson({ok:false,error:'rate_limited'},429,{'Retry-After':String(rl.retryAfter)});
 const db=context.env.ANALYTICS_DB;let metrics={events:0,pageViews:0,calculations:0};
 if(db)try{const r=await db.prepare(`SELECT COUNT(*) events,SUM(event_type='page_view') pageViews,SUM(event_type='calculate') calculations FROM analytics_events`).first();metrics={events:Number(r?.events||0),pageViews:Number(r?.pageViews||0),calculations:Number(r?.calculations||0)}}catch(e){}
 return apiJson({ok:true,role:auth.role,generatedAt:new Date().toISOString(),metrics,services:{analyticsDb:!!db,workersAI:!!context.env.AI},security:{rbac:true,sessionCookie:'HttpOnly + Secure + SameSite=Strict',separateSessionSecret:hasSeparateSessionSecret(context.env),headerTokenEnabled:String(context.env.ALLOW_STATS_TOKEN_HEADER||'')==='1',configuredRoles:configuredRoles(context.env)},privacy:{rawSecretsExposed:false}})
}
