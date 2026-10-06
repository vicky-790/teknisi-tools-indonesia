let schemaReady = false;
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
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex'}});
}
async function ready(db){ if(!schemaReady){ await db.exec(SCHEMA); schemaReady=true; } }
function jktDay(offsetDays=0){
  return new Date(Date.now()+7*3600*1000+offsetDays*86400000).toISOString().slice(0,10);
}
export async function onRequest(context){
  if(context.request.method!=='GET') return json({ok:false,error:'method_not_allowed'},405);
  const db=context.env.ANALYTICS_DB;
  if(!db) return json({ok:false,error:'analytics_db_not_configured',setup:true},503);
  try{
    await ready(db);
    const today=jktDay(0), start=jktDay(-13);
    const qToday=db.prepare(`SELECT
      COUNT(*) AS events,
      COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) AS active_sessions,
      SUM(CASE WHEN event_type='calculate' THEN 1 ELSE 0 END) AS calculations,
      SUM(CASE WHEN event_type='copy_result' THEN 1 ELSE 0 END) AS copies,
      SUM(CASE WHEN event_type='article_open' THEN 1 ELSE 0 END) AS articles,
      SUM(CASE WHEN event_type='calculator_open' THEN 1 ELSE 0 END) AS tool_opens
      FROM analytics_events WHERE day_jakarta=?`).bind(today).first();
    const qAll=db.prepare(`SELECT
      COUNT(*) AS events,
      COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) AS sessions,
      SUM(CASE WHEN event_type='calculate' THEN 1 ELSE 0 END) AS calculations,
      SUM(CASE WHEN event_type='copy_result' THEN 1 ELSE 0 END) AS copies,
      SUM(CASE WHEN event_type='article_open' THEN 1 ELSE 0 END) AS articles
      FROM analytics_events`).first();
    const qTools=db.prepare(`SELECT path, MAX(label) AS label, COUNT(*) AS uses
      FROM analytics_events WHERE event_type='calculate'
      GROUP BY path ORDER BY uses DESC LIMIT 10`).all();
    const qArticles=db.prepare(`SELECT path, MAX(label) AS label, COUNT(*) AS views
      FROM analytics_events WHERE event_type='article_open'
      GROUP BY path ORDER BY views DESC LIMIT 10`).all();
    const qDaily=db.prepare(`SELECT day_jakarta AS day,
      COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) AS sessions,
      SUM(CASE WHEN event_type='calculate' THEN 1 ELSE 0 END) AS calculations,
      SUM(CASE WHEN event_type='copy_result' THEN 1 ELSE 0 END) AS copies,
      SUM(CASE WHEN event_type='article_open' THEN 1 ELSE 0 END) AS articles,
      SUM(CASE WHEN event_type='calculator_open' THEN 1 ELSE 0 END) AS tool_opens
      FROM analytics_events WHERE day_jakarta>=?
      GROUP BY day_jakarta ORDER BY day_jakarta ASC`).bind(start).all();
    const qRecent=db.prepare(`SELECT created_at,event_type,path,label
      FROM analytics_events ORDER BY id DESC LIMIT 20`).all();
    const [todayRow,allRow,tools,articles,daily,recent]=await Promise.all([qToday,qAll,qTools,qArticles,qDaily,qRecent]);
    return json({
      ok:true,
      timezone:'Asia/Jakarta',
      generatedAt:new Date().toISOString(),
      today:todayRow||{}, allTime:allRow||{},
      topTools:tools.results||[], topArticles:articles.results||[],
      daily:daily.results||[], recent:recent.results||[]
    });
  }catch(e){ return json({ok:false,error:'stats_error'},500); }
}
