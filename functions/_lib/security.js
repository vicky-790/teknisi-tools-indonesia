const COOKIE='__Host-tti_admin';
let rateSchemaReady=false;
const memoryLimits=new Map();
const enc=new TextEncoder();

function b64url(buf){let s='';for(const b of new Uint8Array(buf))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function hex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function getCookie(req,name){const raw=req.headers.get('cookie')||'';for(const p of raw.split(';')){const i=p.indexOf('=');if(i<0)continue;if(p.slice(0,i).trim()===name)return p.slice(i+1).trim()}return''}
function safeBytes(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a[i]^b[i];return x===0}
async function sha256(v){return new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(v||''))))}
async function hmac(secret,msg){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(msg)))}

export function apiJson(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, max-age=0',
    'X-Robots-Tag':'noindex',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Cross-Origin-Resource-Policy':'same-origin',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    ...headers
  }})
}
export function sameOrigin(req){
  let url;try{url=new URL(req.url)}catch(e){return false}
  const origin=req.headers.get('origin');if(origin&&origin!==url.origin)return false;
  const site=(req.headers.get('sec-fetch-site')||'').toLowerCase();
  if(site&&!['same-origin','same-site','none'].includes(site))return false;
  return true
}
export async function secretEqual(a,b){return safeBytes(await sha256(String(a||'')),await sha256(String(b||'')))}
export function getSessionSecret(env){const s=String(env.ADMIN_SESSION_SECRET||'');return s.length>=32?s:String(env.STATS_TOKEN||'')}
export function hasSeparateSessionSecret(env){return String(env.ADMIN_SESSION_SECRET||'').length>=32}
export async function issueAdminSession(env,remember=true){
  const secret=getSessionSecret(env);if(!secret)throw new Error('session_secret_missing');
  const ttl=remember?30*86400:12*3600,exp=Date.now()+ttl*1000,nonce=crypto.randomUUID().replace(/-/g,'');
  const base=`v2.${exp}.${nonce}`,sig=b64url(await hmac(secret,base)),value=`${base}.${sig}`;
  let cookie=`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Priority=High`;if(remember)cookie+=`; Max-Age=${ttl}`;
  return{cookie,expiresAt:new Date(exp).toISOString(),remembered:remember}
}
export function clearAdminSession(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Priority=High; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`}
export async function verifyAdminRequest(req,env){
  const secret=getSessionSecret(env);if(!secret)return false;
  if(String(env.ALLOW_STATS_TOKEN_HEADER||'')==='1'){const h=String(req.headers.get('x-stats-token')||'');if(h&&await secretEqual(h,String(env.STATS_TOKEN||'')))return true}
  const parts=getCookie(req,COOKIE).split('.');if(parts.length!==4||parts[0]!=='v2')return false;
  const exp=Number(parts[1]),nonce=parts[2],sig=parts[3];if(!Number.isFinite(exp)||exp<Date.now()||exp>Date.now()+31*86400000)return false;
  if(!/^[a-f0-9]{32}$/i.test(nonce)||!/^[A-Za-z0-9_-]{32,64}$/.test(sig))return false;
  return secretEqual(sig,b64url(await hmac(secret,`v2.${exp}.${nonce}`)))
}
async function clientFingerprint(req,env,extra=''){
  const raw=`${req.headers.get('cf-connecting-ip')||''}|${String(req.headers.get('user-agent')||'').slice(0,220)}|${req.cf?.colo||''}|${extra}`;
  const secret=getSessionSecret(env)||String(env.STATS_TOKEN||'')||'tti-v26-rate-fallback';
  try{return hex(await hmac(secret,raw)).slice(0,48)}catch(e){return hex(await sha256(raw)).slice(0,48)}
}
async function ensureRateSchema(db){
  if(rateSchemaReady)return;
  await db.exec(`CREATE TABLE IF NOT EXISTS security_rate_limits(bucket TEXT NOT NULL,client_hash TEXT NOT NULL,window_start INTEGER NOT NULL,hits INTEGER NOT NULL DEFAULT 0,blocked_until INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL,PRIMARY KEY(bucket,client_hash));CREATE INDEX IF NOT EXISTS idx_security_rate_updated ON security_rate_limits(updated_at);`);
  rateSchemaReady=true
}
function memoryRate(bucket,key,limit,windowSec,blockSec,now){
  const id=`${bucket}:${key}`,r=memoryLimits.get(id);
  if(r&&r.blockedUntil>now)return{allowed:false,retryAfter:Math.max(1,r.blockedUntil-now),backend:'memory'};
  if(!r||now-r.windowStart>=windowSec){memoryLimits.set(id,{windowStart:now,hits:1,blockedUntil:0,updatedAt:now});return{allowed:true,retryAfter:0,backend:'memory'}}
  r.hits++;r.updatedAt=now;if(r.hits>limit){r.blockedUntil=now+blockSec;return{allowed:false,retryAfter:blockSec,backend:'memory'}}
  return{allowed:true,retryAfter:0,backend:'memory'}
}
export async function securityRateLimit(context,bucket,opts={}){
  const limit=Math.max(1,Number(opts.limit||60)),windowSec=Math.max(1,Number(opts.windowSec||60)),blockSec=Math.max(1,Number(opts.blockSec||windowSec)),now=Math.floor(Date.now()/1000);
  const key=opts.global?'GLOBAL':await clientFingerprint(context.request,context.env,String(opts.extra||'')),db=context.env.ANALYTICS_DB;
  if(db){try{
    await ensureRateSchema(db);
    const row=await db.prepare(`SELECT window_start,hits,blocked_until FROM security_rate_limits WHERE bucket=? AND client_hash=?`).bind(bucket,key).first();
    if(row&&Number(row.blocked_until||0)>now)return{allowed:false,retryAfter:Math.max(1,Number(row.blocked_until)-now),backend:'d1'};
    if(!row||now-Number(row.window_start||0)>=windowSec){
      await db.prepare(`INSERT INTO security_rate_limits(bucket,client_hash,window_start,hits,blocked_until,updated_at) VALUES(?,?,?,?,0,?) ON CONFLICT(bucket,client_hash) DO UPDATE SET window_start=excluded.window_start,hits=1,blocked_until=0,updated_at=excluded.updated_at`).bind(bucket,key,now,1,now).run();
      return{allowed:true,retryAfter:0,backend:'d1'}
    }
    const hits=Number(row.hits||0)+1,blocked=hits>limit?now+blockSec:0;
    await db.prepare(`UPDATE security_rate_limits SET hits=?,blocked_until=?,updated_at=? WHERE bucket=? AND client_hash=?`).bind(hits,blocked,now,bucket,key).run();
    if(now%3600<8)await db.prepare(`DELETE FROM security_rate_limits WHERE updated_at<?`).bind(now-172800).run();
    if(blocked)return{allowed:false,retryAfter:blockSec,backend:'d1'};return{allowed:true,retryAfter:0,backend:'d1'}
  }catch(e){}}
  return memoryRate(bucket,key,limit,windowSec,blockSec,now)
}
