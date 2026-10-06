(function(){
'use strict';
const $=s=>document.querySelector(s);
const fmt=n=>new Intl.NumberFormat('id-ID').format(Number(n||0));
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const eventNames={calculator_open:'Calculator opened',calculate:'Calculation',copy_result:'Result copied',article_open:'Article opened',tools_click:'Tools clicked',knowledge_click:'Knowledge clicked',pwa_install:'PWA installed',cta_click:'CTA clicked'};
function set(id,v){ const el=document.getElementById(id); if(el)el.textContent=fmt(v); }
function shortLabel(row){ return row.label || row.path || '—'; }
function drawBars(target,rows,valueKey,empty){
  const el=$(target); if(!el)return;
  if(!rows.length){el.innerHTML='<div class="statEmpty">'+empty+'</div>';return;}
  const max=Math.max(...rows.map(r=>Number(r[valueKey]||0)),1);
  el.innerHTML=rows.slice(0,7).map((r,i)=>`<div class="rankRow"><div class="rankNum">${i+1}</div><div class="rankMain"><div class="rankTop"><span>${esc(shortLabel(r))}</span><b>${fmt(r[valueKey])}</b></div><div class="rankBar"><i style="width:${Math.max(3,Number(r[valueKey]||0)/max*100)}%"></i></div></div></div>`).join('');
}
function buildDaily(rows){
  const map=new Map(rows.map(r=>[r.day,r]));
  const out=[]; const now=new Date();
  for(let i=13;i>=0;i--){
    const d=new Date(now.getTime()+7*3600000-i*86400000).toISOString().slice(0,10);
    const r=map.get(d)||{day:d,calculations:0,copies:0,articles:0,tool_opens:0,sessions:0};
    r.total=Number(r.calculations||0)+Number(r.copies||0)+Number(r.articles||0)+Number(r.tool_opens||0);
    out.push(r);
  }
  return out;
}
function spark(rows){
  const svg=$('#trendSvg'), labels=$('#trendLabels'); if(!svg||!labels)return;
  const data=buildDaily(rows), vals=data.map(r=>r.total), max=Math.max(...vals,1);
  const W=900,H=220,p=18;
  const pts=data.map((r,i)=>{const x=p+i*(W-2*p)/(data.length-1); const y=H-p-(r.total/max)*(H-2*p); return [x,y,r];});
  const line=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');
  const area=`M ${pts[0][0]} ${H-p} `+pts.map(q=>`L ${q[0]} ${q[1]}`).join(' ')+` L ${pts[pts.length-1][0]} ${H-p} Z`;
  svg.innerHTML=`<defs><linearGradient id="statGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="trendArea" d="${area}"/><path class="trendLine" d="${line}"/>`+pts.map(q=>`<circle class="trendDot" cx="${q[0]}" cy="${q[1]}" r="4"><title>${esc(q[2].day)} • ${fmt(q[2].total)} events</title></circle>`).join('');
  labels.innerHTML=data.map((r,i)=>i%3===0||i===data.length-1?`<span>${r.day.slice(5)}</span>`:'<span></span>').join('');
}
function recent(rows){
  const el=$('#recentEvents'); if(!el)return;
  if(!rows.length){el.innerHTML='<div class="statEmpty">Belum ada event masuk. Coba gunakan salah satu kalkulator.</div>';return;}
  el.innerHTML=rows.map(r=>{const d=new Date(r.created_at); const t=isNaN(d)?'—':d.toLocaleString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});return `<div class="eventRow"><div><b>${esc(eventNames[r.event_type]||r.event_type)}</b><span>${esc(shortLabel(r))}</span></div><time>${esc(t)}</time></div>`}).join('');
}
async function load(){
  const status=$('#statsStatus');
  try{
    const res=await fetch('/api/stats',{cache:'no-store'}); const d=await res.json();
    if(!res.ok){
      if(d.setup){status.className='statsStatus warn';status.innerHTML='<b>Database belum terhubung.</b> Bind Cloudflare D1 dengan nama <code>ANALYTICS_DB</code>, lalu refresh halaman ini.';return;}
      throw new Error(d.error||'API error');
    }
    status.className='statsStatus live'; status.textContent='LIVE • data event anonim • Asia/Jakarta';
    set('kSession',d.today.active_sessions); set('kCalc',d.today.calculations); set('kCopy',d.today.copies); set('kArticle',d.today.articles);
    set('aCalc',d.allTime.calculations); set('aSession',d.allTime.sessions); set('aEvents',d.allTime.events);
    drawBars('#topTools',d.topTools||[],'uses','Belum ada kalkulasi tercatat.');
    drawBars('#topArticles',d.topArticles||[],'views','Belum ada artikel dibuka.');
    spark(d.daily||[]); recent(d.recent||[]);
    const upd=$('#updatedAt'); if(upd)upd.textContent='Updated '+new Date(d.generatedAt).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'});
  }catch(e){ status.className='statsStatus warn'; status.innerHTML='<b>Statistik belum dapat dimuat.</b> Pastikan Pages Functions dan D1 sudah aktif.'; }
}
load();
setInterval(load,60000);
})();
