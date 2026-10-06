/* Teknisi Tools Indonesia V1.7 — anonymous custom usage analytics.
   Stores only event name, page path, short label, timestamp, and a temporary
   random session ID. Calculator inputs/results are never sent. */
(function(){
  'use strict';
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  if (navigator.webdriver) return;

  var API='/api/event';
  var path=location.pathname || '/';
  var label=(document.querySelector('h1')?.textContent || document.title || path).trim().slice(0,120);
  var sid='';
  try {
    sid=sessionStorage.getItem('tti_session_id') || '';
    if(!sid){
      sid=(crypto.randomUUID ? crypto.randomUUID() : 's-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
      sessionStorage.setItem('tti_session_id',sid);
    }
  } catch(e) {
    sid='s-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }

  function send(eventName, extraLabel){
    var body=JSON.stringify({
      event:eventName,
      path:path.slice(0,200),
      label:String(extraLabel || label || '').slice(0,120),
      session:sid.slice(0,80)
    });
    try {
      if(navigator.sendBeacon){
        var blob=new Blob([body],{type:'application/json'});
        if(navigator.sendBeacon(API,blob)) return;
      }
    } catch(e) {}
    fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true,credentials:'same-origin'}).catch(function(){});
  }

  window.TTITrack=send;

  // One page-level semantic event per load.
  if(path.indexOf('/tools/')===0) send('calculator_open');
  else if(path.indexOf('/articles/')===0) send('article_open');

  document.addEventListener('click',function(e){
    var el=e.target.closest('a,button');
    if(!el) return;
    var txt=(el.textContent||'').replace(/\s+/g,' ').trim();
    var href=(el.getAttribute('href')||'');

    if(el.tagName==='BUTTON' && /calculate|hitung/i.test(txt)) send('calculate');
    if(el.tagName==='BUTTON' && /copy result|salin/i.test(txt)) send('copy_result');
    if(href==='/pages/tools.html' || href.endsWith('/pages/tools.html')) send('tools_click','Tools');
    if(href==='/pages/artikel.html' || href.endsWith('/pages/artikel.html')) send('knowledge_click','Knowledge');
    if(el.classList.contains('navbtn') || /consult|konsult|contact|hubungi/i.test(txt)) send('cta_click',txt.slice(0,120));
  },{passive:true});

  window.addEventListener('appinstalled',function(){ send('pwa_install','PWA installed'); });
})();
