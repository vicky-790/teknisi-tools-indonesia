
(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const statusEl=$('#aiVisionStatus'),modeEl=$('#aiVisionMode'),questionEl=$('#aiVisionQuestion'),
        consentEl=$('#aiVisionConsent'),analyzeBtn=$('#aiVisionAnalyzeBtn'),
        reportEl=$('#aiSmartReport'),photoInfo=$('#aiPhotoInfo');
  if(!statusEl||!analyzeBtn||!reportEl)return;

  let lastPlainText='';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const arr=x=>Array.isArray(x)?x.filter(Boolean):[];
  const val=(x,f='-')=>(x===null||x===undefined||x==='')?f:x;
  const bridge=()=>window.TTIVisualBridge||null;

  function setStatus(kind,text){statusEl.className='aiStatus '+kind;statusEl.innerHTML=`<i></i>${esc(text)}`}
  async function checkStatus(){
    try{const r=await fetch('/api/vision',{cache:'no-store'}),j=await r.json();setStatus(j.ok&&j.configured?'ready':'local',j.ok&&j.configured?'AI Vision siap':'AI binding belum aktif')}
    catch(e){setStatus('error','AI API belum tersedia')}
  }
  function fileInfo(){
    const b=bridge(),f=b?.getFile?.();
    if(!f){photoInfo.innerHTML='<b>Foto aktif:</b> belum ada. Upload foto di panel Visual Smart Assistant V2.3 di atas.';return null}
    photoInfo.innerHTML=`<b>Foto aktif:</b> ${esc(f.name||'image')} • ${(f.size/1024).toFixed(0)} KB • ${esc(b?.getCategory?.()||'general')}`;return f
  }
  async function compress(file){
    const bitmap=await createImageBitmap(file),maxSide=1280,scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
    let q=.88,blob=null;for(let i=0;i<4;i++){blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',q));if(blob&&blob.size<=1450000)break;q-=.12}
    if(!blob)throw new Error('Gagal mengompres foto.');if(blob.size>1900000)throw new Error('Foto terlalu besar. Coba crop / foto lebih dekat.');
    return await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(new Error('Gagal membaca foto.'));fr.readAsDataURL(blob)})
  }
  function list(title,items){if(!items?.length)return'';return`<section class="aiReportSection"><h5>${esc(title)}</h5><ul>${items.map(x=>`<li>${esc(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('')}</ul></section>`}
  function specs(r){
    const d=r.extracted_data||{},pairs=[
      ['Manufacturer',d.manufacturer],['Model',d.model_number],['Voltage',d.voltage_v!=null?`${d.voltage_v} V`:null],['Current',d.current_a!=null?`${d.current_a} A`:null],
      ['Power',d.power_w!=null?`${d.power_w} W`:null],['Apparent power',d.power_va!=null?`${d.power_va} VA`:null],['Frequency',d.frequency_hz!=null?`${d.frequency_hz} Hz`:null],
      ['Phase',d.phase],['Power factor',d.power_factor],['RPM',d.rpm],['Capacitance',d.capacitance_uf!=null?`${d.capacitance_uf} µF`:null],['Resistance',d.resistance_ohm!=null?`${d.resistance_ohm} Ω`:null],
      ['Cooling capacity',d.capacity_btu_h!=null?`${d.capacity_btu_h} BTU/h`:null],['AC class',d.capacity_pk!=null?`${d.capacity_pk} PK`:null],['Dimensions / marking',d.dimensions_text]
    ].filter(x=>x[1]!==null&&x[1]!==undefined&&x[1]!=='');
    if(!pairs.length)return'';return`<section class="aiReportSection"><h5>Data / spesifikasi terbaca</h5><div class="aiSpecs">${pairs.map(([a,b])=>`<div class="aiSpec"><small>${esc(a)}</small><b>${esc(b)}</b></div>`).join('')}</div></section>`
  }
  function verified(items){if(!items?.length)return'';return`<section class="aiReportSection"><h5>Perhitungan terverifikasi engine</h5>${items.map(x=>`<div class="aiVerified"><p><b>${esc(x.name||'Perhitungan')}</b><br>${esc(x.formula||'')}<br><strong>${esc(x.result||'')}</strong>${x.note?`<br><small>${esc(x.note)}</small>`:''}</p></div>`).join('')}</section>`}
  function render(payload){
    const r=payload.report||{},obj=r.object||{},a=r.assessment||{},risk=(a.risk_level||'info').toLowerCase(),conf=obj.confidence_percent!=null?`${obj.confidence_percent}%`:'-',res=r.resistor||{};
    const resistor=res.applicable?`<section class="aiReportSection"><h5>Resistor analysis</h5><ul><li>Band: ${esc(arr(res.bands).join(' • ')||'-')}</li><li>Nilai engine: <b>${esc(res.verified_value||'-')}</b></li><li>Toleransi: ${esc(val(res.tolerance_percent,'-'))}%</li><li>Estimasi watt: <b>${esc(res.watt_estimate||'Tidak dipastikan dari foto ini')}</b></li><li>${esc(res.note||'Watt fisik membutuhkan skala pembanding.')}</li></ul></section>`:'';
    reportEl.innerHTML=`<div class="aiReport"><div class="aiReportHeader"><div><span class="eyebrow">AI SMART REPORT</span><h4>${esc(r.report_title||obj.name||'Visual Engineering Report')}</h4></div><div class="aiPills"><span class="aiPill">${esc(obj.category||'general')}</span><span class="aiPill">Confidence ${esc(conf)}</span><span class="aiPill aiRisk ${esc(risk)}">${esc((a.risk_level||'info').toUpperCase())}</span></div></div>
    <section class="aiReportSection"><h5>Identifikasi objek</h5><p><b>${esc(obj.name||'Belum pasti')}</b>${arr(obj.alternatives).length?`<br>Alternatif: ${esc(obj.alternatives.join(', '))}`:''}</p></section>
    ${list('Yang benar-benar terlihat',r.observations)}${r.extracted_text?`<section class="aiReportSection"><h5>Teks / marking terbaca</h5><p>${esc(r.extracted_text)}</p></section>`:''}${specs(r)}${resistor}
    <section class="aiReportSection"><h5>Penjelasan engineering</h5><p>${esc(a.summary||'Belum ada ringkasan.')}</p></section>${list('Kemungkinan masalah / interpretasi',a.possible_issues)}${verified(payload.verified_calculations)}${list('Safety / warning',r.safety_notes)}${list('Rekomendasi',r.recommendations)}${list('Pertanyaan lanjutan untuk customer',r.follow_up_questions)}
    <div class="aiReportActions"><button type="button" class="aiBtn" id="aiCopyBtn">Salin report</button><button type="button" class="aiBtn" id="aiPrintBtn">Print / PDF</button><button type="button" class="aiBtn" id="aiToTextBtn">Lanjutkan ke Assistant teks</button></div><div class="aiFootNote">Model: ${esc(payload.model||'-')} • Vision source: ${esc(payload.vision_source||'-')} • Foto/prompt tidak dikirim ke analytics.</div></div>`;
    lastPlainText=[r.report_title||'AI Smart Report',`Objek: ${obj.name||'-'}`,`Kategori: ${obj.category||'-'}`,`Confidence: ${conf}`,`Ringkasan: ${a.summary||'-'}`,`Observasi: ${arr(r.observations).join('; ')||'-'}`,`Safety: ${arr(r.safety_notes).join('; ')||'-'}`,`Rekomendasi: ${arr(r.recommendations).join('; ')||'-'}`,`Pertanyaan: ${arr(r.follow_up_questions).join('; ')||'-'}`].join('\n');
    $('#aiCopyBtn')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(lastPlainText);$('#aiCopyBtn').textContent='Tersalin ✓';setTimeout(()=>$('#aiCopyBtn').textContent='Salin report',1200)}catch(e){}});
    $('#aiPrintBtn')?.addEventListener('click',()=>{document.body.classList.add('ai-print-mode');window.print();setTimeout(()=>document.body.classList.remove('ai-print-mode'),700)});
    $('#aiToTextBtn')?.addEventListener('click',()=>{const input=$('#smartInput');if(!input)return;input.value=`Lanjutkan analisis berdasarkan AI Vision report berikut:\n${lastPlainText}`;input.dispatchEvent(new Event('input',{bubbles:true}));location.hash='assistant';input.focus()});
  }
  async function run(){
    const b=bridge(),file=b?.getFile?.();if(!file){reportEl.innerHTML='<div class="aiEmpty">Upload foto di Visual Smart Assistant V2.3 terlebih dahulu.</div>';return}
    if(!consentEl.checked){reportEl.innerHTML='<div class="aiEmpty">Centang persetujuan pemrosesan AI terlebih dahulu.</div>';return}
    analyzeBtn.disabled=true;reportEl.innerHTML='<div class="aiLoading"><div class="aiLoader"></div><div><b>AI Vision sedang menganalisis foto...</b><br>Identifikasi → ekstraksi data → safety check → Smart Report.</div></div>';
    try{
      const payload={imageDataUrl:await compress(file),mode:modeEl.value,question:clean(questionEl.value).slice(0,1200),category:clean(b?.getCategory?.()||'general').slice(0,40),note:clean(b?.getNote?.()||'').slice(0,1200),localOcr:clean(b?.getOcrText?.()||'').slice(0,2200)};
      const resp=await fetch('/api/vision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),j=await resp.json().catch(()=>({ok:false,error:'invalid_server_response'}));
      if(!resp.ok||!j.ok){if(j.error==='ai_binding_not_configured')throw new Error('AI binding Cloudflare belum dipasang. V2.3 lokal tetap bisa dipakai.');if(resp.status===429)throw new Error('AI sedang sibuk / kuota sementara habis. Coba lagi beberapa saat.');throw new Error(j.message||j.error||'AI Vision gagal.')}
      render(j);if(window.TTITrack)window.TTITrack('calculate','AI Vision Smart Report: '+(payload.category||'general'));
    }catch(e){reportEl.innerHTML=`<div class="aiEmpty"><div><b>AI Vision belum berhasil.</b><br>${esc(e.message||String(e))}<br><br>Fitur lokal V2.3 tetap tersedia di panel atas.</div></div>`}
    finally{analyzeBtn.disabled=false;fileInfo()}
  }
  analyzeBtn.addEventListener('click',run);document.addEventListener('change',e=>{if(e.target?.id==='visualCameraInput'||e.target?.id==='visualGalleryInput')setTimeout(fileInfo,300)});fileInfo();checkStatus();
})();
