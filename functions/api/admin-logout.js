const COOKIE='__Host-tti_admin';
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex',...headers}})}
export async function onRequest(context){
  if(context.request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  return json({ok:true},200,{'Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`});
}
