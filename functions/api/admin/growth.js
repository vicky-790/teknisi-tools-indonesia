import {apiJson,sameOrigin,verifyRoleRequest,securityRateLimit} from '../../_lib/security.js';

function jktDay(offset=0){
  return new Date(Date.now()+7*3600000+offset*86400000).toISOString().slice(0,10);
}
function n(v){return Number(v||0)}
function opportunity(term=''){
  const q=String(term||'').toLowerCase();
  if(/mcb|ampere|watt|kabel|voltage|listrik|3 phase|3phase/.test(q))return '/pages/kalkulator-listrik';
  if(/ac|pk|btu|hvac|dingin/.test(q))return '/tools/ac-pk';
  if(/bata|hebel|beton|keramik|semen|plester|civil/.test(q))return '/pages/kalkulator-civil';
  if(/motor|cvt|roller|aki|ban|bbm/.test(q))return '/pages/motorcycle-center';
  if(/dtc|injeksi|injector|tps|map|ckp|mil|ecu/.test(q))return '/pages/injection-dtc';
  if(/pompa|pipa|air|toren/.test(q))return '/pages/smart-assistant';
  return '/pages/topik';
}
export async function onRequest(context){
  const req=context.request;
  if(req.method!=='GET')return apiJson({ok:false,error:'method_not_allowed'},405,{'Allow':'GET'});
  if(!sameOrigin(req))return apiJson({ok:false,error:'forbidden'},403);
  const auth=await verifyRoleRequest(req,context.env,['admin','owner']);
  if(!auth.ok)return apiJson({ok:false,error:'unauthorized'},401);
  const rl=await securityRateLimit(context,'admin-growth',{limit:40,windowSec:300,blockSec:300});
  if(!rl.allowed)return apiJson({ok:false,error:'rate_limited'},429,{'Retry-After':String(rl.retryAfter)});
  const db=context.env.ANALYTICS_DB;
  if(!db)return apiJson({ok:false,error:'analytics_db_not_configured'},503);
  const d7=jktDay(-6),d30=jktDay(-29);
  try{
    const [summary7,summary30,tools,sources,searches,shares,pages]=await Promise.all([
      db.prepare(`SELECT COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) sessions,
        SUM(event_type='page_view') page_views,SUM(event_type='calculate') calculations,
        SUM(event_type='calculator_open') tool_opens,SUM(event_type='share_result') shares,
        SUM(event_type='article_open') article_opens
        FROM analytics_events WHERE day_jakarta>=?`).bind(d7).first(),
      db.prepare(`SELECT COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) sessions,
        SUM(event_type='page_view') page_views,SUM(event_type='calculate') calculations,
        SUM(event_type='share_result') shares FROM analytics_events WHERE day_jakarta>=?`).bind(d30).first(),
      db.prepare(`SELECT path,label,
        SUM(event_type='calculator_open') opens,
        SUM(event_type='calculate') calculations,
        COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) sessions
        FROM analytics_events WHERE day_jakarta>=? AND (event_type='calculator_open' OR event_type='calculate')
        GROUP BY path,label ORDER BY (opens+calculations) DESC LIMIT 12`).bind(d7).all(),
      db.prepare(`SELECT source,medium,COUNT(*) events,
        COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) sessions
        FROM analytics_events WHERE day_jakarta>=? AND event_type='page_view'
        GROUP BY source,medium ORDER BY sessions DESC,events DESC LIMIT 10`).bind(d30).all(),
      db.prepare(`SELECT label query,COUNT(*) searches,
        COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) sessions
        FROM analytics_events WHERE day_jakarta>=? AND event_type='site_search' AND label<>''
        GROUP BY label ORDER BY searches DESC LIMIT 12`).bind(d30).all(),
      db.prepare(`SELECT path,label method,COUNT(*) shares
        FROM analytics_events WHERE day_jakarta>=? AND event_type='share_result'
        GROUP BY path,label ORDER BY shares DESC LIMIT 12`).bind(d30).all(),
      db.prepare(`SELECT path,COUNT(*) views,
        COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) sessions
        FROM analytics_events WHERE day_jakarta>=? AND event_type='page_view'
        GROUP BY path ORDER BY views DESC LIMIT 15`).bind(d30).all()
    ]);
    const s7={sessions:n(summary7?.sessions),pageViews:n(summary7?.page_views),calculations:n(summary7?.calculations),toolOpens:n(summary7?.tool_opens),shares:n(summary7?.shares),articleOpens:n(summary7?.article_opens)};
    const s30={sessions:n(summary30?.sessions),pageViews:n(summary30?.page_views),calculations:n(summary30?.calculations),shares:n(summary30?.shares)};
    return apiJson({
      ok:true,role:auth.role,generatedAt:new Date().toISOString(),
      periods:{sevenDays:{from:d7,...s7},thirtyDays:{from:d30,...s30}},
      rates:{
        calculatePerView:s7.pageViews?Number((s7.calculations/s7.pageViews*100).toFixed(1)):0,
        sharePerView:s7.pageViews?Number((s7.shares/s7.pageViews*100).toFixed(2)):0
      },
      trendingTools:(tools.results||[]).map(x=>({path:x.path,label:x.label,opens:n(x.opens),calculations:n(x.calculations),sessions:n(x.sessions)})),
      sources:(sources.results||[]).map(x=>({source:x.source||'Unknown',medium:x.medium||'',events:n(x.events),sessions:n(x.sessions)})),
      onSiteDemand:(searches.results||[]).map(x=>({query:String(x.query||''),searches:n(x.searches),sessions:n(x.sessions),recommendedPath:opportunity(x.query)})),
      sharedPages:(shares.results||[]).map(x=>({path:x.path,method:x.method||'',shares:n(x.shares)})),
      topPages:(pages.results||[]).map(x=>({path:x.path,views:n(x.views),sessions:n(x.sessions)})),
      caveat:'Growth Engine memakai anonymous first-party analytics + on-site search signals. Ini bukan data Google Search Console dan tidak mengklaim ranking/impression Google.'
    });
  }catch(e){
    return apiJson({ok:false,error:'growth_query_failed'},500);
  }
}