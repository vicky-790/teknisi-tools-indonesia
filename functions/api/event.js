let schemaReady = false;
const ALLOWED = new Set([
  'calculator_open','calculate','copy_result','article_open',
  'tools_click','knowledge_click','pwa_install','cta_click'
]);
const SCHEMA = `
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

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}
function clean(v,max){ return String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max); }
async function ready(db){
  if(schemaReady) return;
  await db.exec(SCHEMA);
  schemaReady=true;
}

export async function onRequest(context){
  const req=context.request;
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:{'Allow':'POST, OPTIONS'}});
  if(req.method!=='POST') return json({ok:false,error:'method_not_allowed'},405);
  const db=context.env.ANALYTICS_DB;
  if(!db) return json({ok:false,error:'analytics_db_not_configured'},503);

  const len=Number(req.headers.get('content-length')||0);
  if(len>4096) return json({ok:false,error:'payload_too_large'},413);
  let raw='';
  try { raw=await req.text(); } catch(e){ return json({ok:false,error:'bad_request'},400); }
  if(raw.length>4096) return json({ok:false,error:'payload_too_large'},413);
  let data;
  try { data=JSON.parse(raw); } catch(e){ return json({ok:false,error:'invalid_json'},400); }

  const event=clean(data.event,40);
  const path=clean(data.path,200);
  const label=clean(data.label,120);
  const session=clean(data.session,80);
  if(!ALLOWED.has(event)) return json({ok:false,error:'invalid_event'},400);
  if(!path.startsWith('/')) return json({ok:false,error:'invalid_path'},400);

  try {
    await ready(db);
    const now=new Date();
    const iso=now.toISOString();
    const day=new Date(now.getTime()+7*3600*1000).toISOString().slice(0,10);
    await db.prepare(`INSERT INTO analytics_events
      (created_at,day_jakarta,event_type,path,label,session_id)
      VALUES (?,?,?,?,?,?)`).bind(iso,day,event,path,label,session).run();
    return json({ok:true},202);
  } catch(e){
    return json({ok:false,error:'storage_error'},500);
  }
}
