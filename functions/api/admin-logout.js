import {apiJson,sameOrigin,clearAdminSession} from '../_lib/security.js';
export async function onRequest(context){const req=context.request;if(req.method!=='POST')return apiJson({ok:false,error:'method_not_allowed'},405,{'Allow':'POST'});if(!sameOrigin(req))return apiJson({ok:false,error:'forbidden'},403);return apiJson({ok:true},200,{'Set-Cookie':clearAdminSession()})}
