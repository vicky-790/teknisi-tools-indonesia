let schemaReady = false;
const ALLOWED = new Set([
  'page_view','calculator_open','calculate','copy_result','article_open',
  'tools_click','knowledge_click','pwa_install','cta_click','site_search',
  'geo_granted','geo_denied','geo_unavailable'
]);
const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  day_jakarta TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_analytics_day ON analytics_events(day_jakarta);
CREATE INDEX IF NOT EXISTS idx_analytics_type_day ON analytics_events(event_type, day_jakarta);
CREATE INDEX IF NOT EXISTS idx_analytics_path_type ON analytics_events(path, event_type);
`;
const EXTRA_COLUMNS = {
  country:"TEXT NOT NULL DEFAULT ''",region:"TEXT NOT NULL DEFAULT ''",city:"TEXT NOT NULL DEFAULT ''",
  continent:"TEXT NOT NULL DEFAULT ''",cf_timezone:"TEXT NOT NULL DEFAULT ''",device_type:"TEXT NOT NULL DEFAULT ''",
  browser:"TEXT NOT NULL DEFAULT ''",os:"TEXT NOT NULL DEFAULT ''",referrer_host:"TEXT NOT NULL DEFAULT ''",
  source:"TEXT NOT NULL DEFAULT ''",medium:"TEXT NOT NULL DEFAULT ''",landing_path:"TEXT NOT NULL DEFAULT ''",
  approx_lat:"REAL",approx_lon:"REAL",gps_lat:"REAL",gps_lon:"REAL",gps_accuracy:"REAL",gps_permission:"TEXT NOT NULL DEFAULT ''"
};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}})}
function clean(v,max){return String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}
function finite(v,min,max){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
function rounded(v,d=3){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?Number(n.toFixed(d)):null}
async function ready(db){
  if(schemaReady)return; await db.exec(BASE_SCHEMA);
  const info=await db.prepare('PRAGMA table_info(analytics_events)').all();
  const present=new Set((info.results||[]).map(r=>r.name));
  for(const [name,type] of Object.entries(EXTRA_COLUMNS)){if(!present.has(name))await db.exec(`ALTER TABLE analytics_events ADD COLUMN ${name} ${type};`)}
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_geo ON analytics_events(country,region,city);CREATE INDEX IF NOT EXISTS idx_analytics_source ON analytics_events(source,medium);CREATE INDEX IF NOT EXISTS idx_analytics_device ON analytics_events(device_type,browser,os);CREATE INDEX IF NOT EXISTS idx_analytics_landing ON analytics_events(landing_path);CREATE INDEX IF NOT EXISTS idx_analytics_coords ON analytics_events(approx_lat,approx_lon);`);
  schemaReady=true;
}
function parseUA(ua){ua=String(ua||'');let browser='Other';if(/SamsungBrowser\//i.test(ua))browser='Samsung Internet';else if(/EdgA?\//i.test(ua))browser='Edge';else if(/OPR\//i.test(ua))browser='Opera';else if(/CriOS\//i.test(ua)||/Chrome\//i.test(ua))browser='Chrome';else if(/FxiOS\//i.test(ua)||/Firefox\//i.test(ua))browser='Firefox';else if(/Safari\//i.test(ua)&&/Version\//i.test(ua))browser='Safari';let os='Other';if(/Android/i.test(ua))os='Android';else if(/iPhone|iPad|iPod/i.test(ua))os='iOS/iPadOS';else if(/Windows NT/i.test(ua))os='Windows';else if(/Macintosh|Mac OS X/i.test(ua))os='macOS';else if(/Linux/i.test(ua))os='Linux';let device='Desktop';if(/iPad|Tablet|Nexus 7|Nexus 10|SM-T|Tab/i.test(ua))device='Tablet';else if(/Mobi|Android|iPhone|iPod/i.test(ua))device='Mobile';return{browser,os,device}}
function sourceFrom(meta){const us=clean(meta.utmSource,60).toLowerCase(),um=clean(meta.utmMedium,40).toLowerCase();if(us)return{source:us,medium:um||'campaign'};const h=clean(meta.referrerHost,120).toLowerCase();if(!h)return{source:'Direct',medium:'direct'};if(h.includes('google.'))return{source:'Google',medium:'organic'};if(h.includes('bing.com'))return{source:'Bing',medium:'organic'};if(h.includes('duckduckgo.com'))return{source:'DuckDuckGo',medium:'organic'};if(h.includes('search.yahoo.'))return{source:'Yahoo',medium:'organic'};if(h.includes('facebook.com')||h.includes('fb.com'))return{source:'Facebook',medium:'social'};if(h.includes('instagram.com'))return{source:'Instagram',medium:'social'};if(h.includes('tiktok.com'))return{source:'TikTok',medium:'social'};if(h.includes('youtube.com')||h.includes('youtu.be'))return{source:'YouTube',medium:'social'};if(h.includes('wa.me')||h.includes('whatsapp.com'))return{source:'WhatsApp',medium:'social'};if(h.includes('teknisi-tools-indonesia.pages.dev'))return{source:'Internal',medium:'internal'};return{source:'Referral',medium:'referral'}}
export async function onRequest(context){
  const req=context.request;if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{Allow:'POST, OPTIONS'}});if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  const db=context.env.ANALYTICS_DB;if(!db)return json({ok:false,error:'analytics_db_not_configured'},503);
  const reqUrl=new URL(req.url),origin=req.headers.get('origin');if(origin&&origin!==reqUrl.origin)return json({ok:false,error:'cross_origin_forbidden'},403);
  const len=Number(req.headers.get('content-length')||0);if(len>8192)return json({ok:false,error:'payload_too_large'},413);
  let data;try{const raw=await req.text();if(raw.length>8192)return json({ok:false,error:'payload_too_large'},413);data=JSON.parse(raw)}catch(e){return json({ok:false,error:'invalid_json'},400)}
  const event=clean(data.event,40),path=clean(data.path,220),label=clean(data.label,120),session=clean(data.session,80),landing=clean(data.landing,220);
  if(!ALLOWED.has(event))return json({ok:false,error:'invalid_event'},400);if(!path.startsWith('/'))return json({ok:false,error:'invalid_path'},400);if(landing&&!landing.startsWith('/'))return json({ok:false,error:'invalid_landing'},400);
  const cf=req.cf||{},ua=parseUA(req.headers.get('user-agent')),traffic=sourceFrom(data);
  const country=clean(cf.country,3).toUpperCase(),region=clean(cf.region||cf.regionCode,80),city=clean(cf.city,80),continent=clean(cf.continent,3).toUpperCase(),cfTimezone=clean(cf.timezone,80),referrerHost=clean(data.referrerHost,120).toLowerCase();
  const approxLat=rounded(finite(cf.latitude,-90,90),3),approxLon=rounded(finite(cf.longitude,-180,180),3);
  let gpsLat=null,gpsLon=null,gpsAccuracy=null,gpsPermission='';
  if(event==='geo_granted'){
    gpsLat=rounded(finite(data.gpsLat,-90,90),5);gpsLon=rounded(finite(data.gpsLon,-180,180),5);gpsAccuracy=rounded(finite(data.gpsAccuracy,0,100000),1);
    if(gpsLat===null||gpsLon===null)return json({ok:false,error:'invalid_gps'},400);gpsPermission='granted';
  }else if(event==='geo_denied')gpsPermission='denied';else if(event==='geo_unavailable')gpsPermission='unavailable';
  let stage='schema';
  try{
    await ready(db);
    stage='retention_cleanup';
    const cutoff=new Date(Date.now()-7*86400000).toISOString();
    await db.prepare("UPDATE analytics_events SET gps_lat=NULL,gps_lon=NULL,gps_accuracy=NULL WHERE gps_lat IS NOT NULL AND created_at < ?").bind(cutoff).run();
    stage='insert';
    const now=new Date(),iso=now.toISOString(),day=new Date(now.getTime()+7*3600*1000).toISOString().slice(0,10);
    await db.prepare(`INSERT INTO analytics_events (created_at,day_jakarta,event_type,path,label,session_id,country,region,city,continent,cf_timezone,device_type,browser,os,referrer_host,source,medium,landing_path,approx_lat,approx_lon,gps_lat,gps_lon,gps_accuracy,gps_permission) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(iso,day,event,path,label,session,country,region,city,continent,cfTimezone,ua.device,ua.browser,ua.os,referrerHost,traffic.source,traffic.medium,landing||path,approxLat,approxLon,gpsLat,gpsLon,gpsAccuracy,gpsPermission).run();
    return json({ok:true,geo:event.startsWith('geo_')?gpsPermission:undefined},202);
  }catch(e){console.error('analytics storage error',stage,e);return json({ok:false,error:'storage_error',stage},500)}
}
