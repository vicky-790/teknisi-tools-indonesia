
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const input=$('#smartInput'),conversation=$('#conversation'),domainWrap=$('#troubleDomains'),stage=$('#troubleStage');
const voiceBtn=$('#voiceStartBtn'),readBtn=$('#voiceReadBtn'),voiceStatus=$('#voiceStatus');

const flows={
 electrical:{label:'Electrical',icon:'⚡',issues:[
  {id:'mcb-trip',title:'MCB sering trip',desc:'Trip saat beban masuk atau setelah beberapa menit.',qs:[
   ['MCB biasanya trip kapan?',[['Langsung saat alat dinyalakan','instant'],['Setelah beberapa menit','delay'],['Acak / tidak menentu','random'],['Belum tahu','unknown']]],
   ['Jenis beban yang paling berkaitan?',[['Motor / pompa / compressor','motor'],['Heater / pemanas','heater'],['Banyak beban bersamaan','multi'],['Belum teridentifikasi','unknown']]],
   ['Ada panas berlebih, bau hangus, atau bekas gosong?',[['Ya','burn'],['Tidak','no'],['Belum dicek','unknown']]],
   ['Ada penambahan beban / instalasi baru?',[['Ya','newload'],['Tidak','no'],['Tidak yakin','unknown']]]
  ],causes:['Overload / beban bersamaan terlalu besar','Inrush motor/compressor atau karakteristik proteksi','Koneksi longgar / panas pada jalur','Gangguan alat atau hubung singkat intermiten']},
  {id:'partial-dead',title:'Sebagian area mati',desc:'Satu grup lampu/stopkontak tidak mendapat daya.',qs:[
   ['MCB grup terkait terlihat bagaimana?',[['Trip / posisi OFF','trip'],['ON tetapi area tetap mati','on'],['Tidak tahu MCB mana','unknown']]],
   ['Masalah hanya satu titik atau satu grup?',[['Satu titik','single'],['Beberapa titik satu jalur','group'],['Area luas','wide'],['Belum tahu','unknown']]],
   ['Ada pekerjaan / perubahan instalasi sebelumnya?',[['Ya','work'],['Tidak','no'],['Tidak tahu','unknown']]],
   ['Ada bau hangus / panas / bunyi abnormal?',[['Ya','burn'],['Tidak','no'],['Belum dicek','unknown']]]
  ],causes:['Proteksi grup trip','Sambungan/terminal terputus atau longgar','Gangguan pada perangkat downstream','Masalah suplai upstream']}
 ]},
 hvac:{label:'HVAC / AC',icon:'❄',issues:[
  {id:'ac-not-cold',title:'AC tidak dingin',desc:'Unit hidup tetapi pendinginan lemah atau hilang.',qs:[
   ['Airflow indoor terasa bagaimana?',[['Kencang / normal','normalair'],['Lemah','weakair'],['Hampir tidak ada','noair'],['Belum dicek','unknown']]],
   ['Filter / evaporator terlihat bagaimana?',[['Bersih','clean'],['Kotor','dirty'],['Ada es / icing','ice'],['Belum dicek','unknown']]],
   ['Outdoor fan / compressor bekerja?',[['Keduanya bekerja','both'],['Fan saja','fanonly'],['Tidak bekerja','off'],['Tidak yakin','unknown']]],
   ['Ada error code atau lampu berkedip?',[['Ada','error'],['Tidak ada','no'],['Belum dilihat','unknown']]]
  ],causes:['Airflow terhambat filter/coil','Icing evaporator','Outdoor fan/compressor tidak bekerja normal','Sensor/control issue','Masalah refrigerant — perlu verifikasi, bukan asumsi awal']},
  {id:'ac-leak',title:'AC bocor air',desc:'Air menetes dari indoor atau sekitar pipa.',qs:[
   ['Titik bocor paling terlihat?',[['Indoor depan/bawah','indoor'],['Sekitar pipa','pipe'],['Tidak jelas','unknown']]],
   ['Drain keluar mengalir?',[['Normal','normal'],['Kecil / tidak keluar','blocked'],['Belum dicek','unknown']]],
   ['Ada es pada evaporator/pipa?',[['Ada','ice'],['Tidak','no'],['Belum dicek','unknown']]],
   ['Bocor muncul terus atau sesekali?',[['Terus','constant'],['Sesekali','intermittent'],['Baru sekali','once']]]
  ],causes:['Drain tersumbat / aliran drain buruk','Kemiringan drain kurang tepat','Icing lalu mencair berlebih','Insulasi pipa kondensasi bermasalah']}
 ]},
 plumbing:{label:'Plumbing',icon:'◉',issues:[
  {id:'pump-low-flow',title:'Pompa hidup, air kecil',desc:'Motor pompa berjalan tetapi debit/tekanan rendah.',qs:[
   ['Sumber air mencukupi?',[['Ya','sourceok'],['Rendah / hampir habis','sourcelow'],['Tidak tahu','unknown']]],
   ['Pompa sudah priming dan suction terisi?',[['Ya','primed'],['Sering kehilangan priming','loseprime'],['Tidak tahu','unknown']]],
   ['Ada suara angin / gelembung pada suction?',[['Ada','airleak'],['Tidak','no'],['Belum dicek','unknown']]],
   ['Tekanan kecil di semua outlet?',[['Ya, semua','all'],['Hanya beberapa','some'],['Belum dibandingkan','unknown']]]
  ],causes:['Suction leak / kehilangan priming','Foot valve/check valve bermasalah','Filter/impeller/restriksi jalur','Total head terlalu tinggi atau diameter pipa terlalu kecil','Sumber air tidak mencukupi']},
  {id:'pump-cycle',title:'Pompa sering hidup-mati',desc:'Pompa cycling walau pemakaian air kecil.',qs:[
   ['Pompa hidup-mati saat tidak ada keran dibuka?',[['Ya','idlecycle'],['Tidak','usage'],['Belum diamati','unknown']]],
   ['Ada kebocoran yang terlihat?',[['Ada','leak'],['Tidak','no'],['Belum dicek','unknown']]],
   ['Sistem pakai pressure tank / controller otomatis?',[['Pressure tank','tank'],['Controller otomatis','controller'],['Tidak tahu','unknown']]],
   ['Check valve / foot valve pernah dicek?',[['Sudah dan normal','ok'],['Belum / curiga bocor balik','checkvalve'],['Tidak tahu','unknown']]]
  ],causes:['Kebocoran kecil downstream','Check valve bocor balik','Pressure tank kehilangan tekanan/diaphragm issue','Controller/pressure switch cycling']}
 ]},
 mechanical:{label:'Mechanical',icon:'⚙',issues:[
  {id:'motor-hot',title:'Motor cepat panas',desc:'Motor/gear motor panas melebihi kondisi biasanya.',qs:[
   ['Beban mekanis terasa berat / macet?',[['Ya','overload'],['Tidak','no'],['Belum dicek','unknown']]],
   ['Ada suara bearing kasar / mendengung?',[['Ada','bearing'],['Tidak','no'],['Belum dicek','unknown']]],
   ['Ventilasi/fan motor bersih dan berputar?',[['Normal','coolingok'],['Kotor / fan bermasalah','coolingbad'],['Belum dicek','unknown']]],
   ['Arus kerja pernah dibandingkan nameplate?',[['Lebih tinggi','highcurrent'],['Normal','normalcurrent'],['Belum diukur','unknown']]]
  ],causes:['Overload mekanis','Bearing/friction meningkat','Pendinginan motor buruk','Arus berlebih / masalah suplai','Duty cycle melebihi rating']},
  {id:'vibration',title:'Getaran / bunyi abnormal',desc:'Motor, fan, pump atau rotating equipment bergetar.',qs:[
   ['Getaran muncul pada semua kecepatan?',[['Semua kecepatan','all'],['Kecepatan tertentu','speed'],['Tidak tahu','unknown']]],
   ['Mounting / baut pondasi kencang?',[['Kencang','mountok'],['Ada yang longgar','loose'],['Belum dicek','unknown']]],
   ['Coupling/pulley terlihat align?',[['Terlihat normal','alignok'],['Curiga tidak align','misalign'],['Belum dicek','unknown']]],
   ['Ada suara bearing kasar?',[['Ada','bearing'],['Tidak','no'],['Belum dicek','unknown']]]
  ],causes:['Mounting longgar','Misalignment coupling/pulley','Unbalance rotating part','Bearing aus','Resonansi pada speed tertentu']}
 ]},
 building:{label:'Building',icon:'▦',issues:[
  {id:'lamp-dead',title:'Lampu / grup lighting mati',desc:'Satu lampu atau satu grup lampu tidak menyala.',qs:[
   ['Yang mati berapa banyak?',[['Satu titik','single'],['Satu grup','group'],['Beberapa area','wide'],['Belum pasti','unknown']]],
   ['Selector/contactor/pilot lamp statusnya?',[['Normal','controlok'],['Tidak normal','controlbad'],['Tidak ada kontrol','simple'],['Belum dicek','unknown']]],
   ['MCB lighting posisi bagaimana?',[['ON','on'],['Trip/OFF','trip'],['Belum dicek','unknown']]],
   ['Ada jadwal Auto / BAS / timer?',[['Ada','auto'],['Tidak','manual'],['Tidak tahu','unknown']]]
  ],causes:['Lamp/driver failure di titik tertentu','MCB/proteksi grup','Contactor/relay/selector control issue','Schedule/BAS/Auto mode issue','Sambungan jalur lighting']},
  {id:'intermittent',title:'Equipment hidup-mati sendiri',desc:'Peralatan building bekerja intermiten tanpa pola jelas.',qs:[
   ['Masalah berkaitan dengan waktu/jadwal tertentu?',[['Ya','schedule'],['Tidak','no'],['Belum diamati','unknown']]],
   ['Ada panas pada panel/terminal?',[['Ada','heat'],['Tidak','no'],['Belum dicek','unknown']]],
   ['Ada alarm/error/log di controller?',[['Ada','log'],['Tidak','no'],['Belum dicek','unknown']]],
   ['Control menggunakan sensor/PLC/relay?',[['Ya','control'],['Tidak','simple'],['Tidak tahu','unknown']]]
  ],causes:['Interlock / schedule / control logic','Sensor atau input intermittent','Relay/contactor/terminal longgar','Thermal protection / overheating','Supply control tidak stabil']}
 ]}
};

let currentDomain=null,currentFlow=null,answers=[],qIndex=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const track=n=>{try{window.TTITrack&&window.TTITrack('calculate',n)}catch(e){}};

function renderDomains(){
 domainWrap.innerHTML=Object.entries(flows).map(([k,d])=>`<button class="troubleDomain" type="button" data-domain="${k}"><b>${d.icon}</b><span>${d.label}</span></button>`).join('');
 domainWrap.addEventListener('click',e=>{const b=e.target.closest('[data-domain]');if(b)selectDomain(b.dataset.domain)});
}
function selectDomain(key){
 currentDomain=key;currentFlow=null;answers=[];qIndex=0;
 domainWrap.querySelectorAll('.troubleDomain').forEach(b=>b.classList.toggle('active',b.dataset.domain===key));
 const d=flows[key];
 stage.innerHTML=`<div><span class="eyebrow">PILIH GEJALA • ${esc(d.label)}</span><h3>Apa masalah utamanya?</h3><div class="troubleIssueGrid">${d.issues.map(f=>`<button class="troubleIssue" type="button" data-flow="${f.id}"><strong>${esc(f.title)}</strong><span>${esc(f.desc)}</span></button>`).join('')}</div></div>`;
 stage.querySelectorAll('[data-flow]').forEach(b=>b.addEventListener('click',()=>startFlow(b.dataset.flow)));
}
function startFlow(id){
 const f=flows[currentDomain].issues.find(x=>x.id===id);if(!f)return;
 currentFlow=f;answers=[];qIndex=0;renderQuestion();track(`Troubleshooting: ${flows[currentDomain].label}`);
}
function renderQuestion(){
 const [q,opts]=currentFlow.qs[qIndex];
 const progress=`<div class="troubleProgress">${currentFlow.qs.map((_,i)=>`<i class="${i<=qIndex?'done':''}"></i>`).join('')}</div>`;
 stage.innerHTML=`${progress}<div class="troubleQuestion"><small>LANGKAH ${qIndex+1} / ${currentFlow.qs.length}</small><h3>${esc(q)}</h3><div class="troubleAnswers">${opts.map(([l,v])=>`<button class="troubleAnswer" type="button" data-value="${esc(v)}">${esc(l)}</button>`).join('')}</div></div><div class="troubleActions"><button class="troubleBtn ghost" type="button" id="troubleBack">← Kembali</button><button class="troubleBtn ghost" type="button" id="troubleReset">Reset wizard</button></div>`;
 stage.querySelectorAll('.troubleAnswer').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.value,b.textContent.trim())));
 $('#troubleBack').onclick=()=>{if(qIndex===0){selectDomain(currentDomain);return}qIndex--;answers.pop();renderQuestion()};
 $('#troubleReset').onclick=reset;
}
function choose(value,label){answers.push({q:currentFlow.qs[qIndex][0],value,label});qIndex++;qIndex>=currentFlow.qs.length?renderResult():renderQuestion()}
function resultChecks(){
 const v=answers.map(a=>a.value),checks=[];
 if(v.includes('burn')||v.includes('heat'))checks.push('Hentikan pemakaian dan prioritaskan inspeksi titik panas/bau hangus setelah sumber energi diisolasi.');
 if(v.includes('dirty')||v.includes('weakair'))checks.push('Mulai dari airflow: filter, evaporator, fan dan jalur udara sebelum menyimpulkan masalah refrigerant.');
 if(v.includes('ice'))checks.push('Cari penyebab icing: airflow, sensor/control, fan, lalu verifikasi sistem refrigerant bila perlu.');
 if(v.includes('blocked'))checks.push('Periksa jalur drain/restriksi dan pastikan aliran pembuangan bebas.');
 if(v.includes('loseprime')||v.includes('airleak'))checks.push('Fokus pada suction: priming, sambungan, foot valve/check valve dan kemungkinan udara masuk.');
 if(v.includes('sourcelow'))checks.push('Pastikan sumber air mencukupi sebelum menilai performa pompa.');
 if(v.includes('overload')||v.includes('highcurrent'))checks.push('Bandingkan beban mekanis dan arus kerja dengan data nameplate sebelum operasi dilanjutkan.');
 if(v.includes('bearing'))checks.push('Periksa bearing/friction dan hentikan bila suara/getaran menunjukkan kerusakan progresif.');
 if(v.includes('loose')||v.includes('misalign'))checks.push('Periksa mounting, alignment, coupling/pulley dalam kondisi mesin terisolasi.');
 if(v.includes('controlbad')||v.includes('auto')||v.includes('schedule')||v.includes('control'))checks.push('Pisahkan sisi power dan control: cek mode Auto/Manual, interlock, schedule, sensor/input, relay/contactor dan log controller.');
 if(v.includes('trip')||v.includes('instant'))checks.push('Jangan sekadar menaikkan rating MCB. Cari penyebab arus lebih, short, inrush atau alat bermasalah dan cocokkan dengan kabel/proteksi.');
 if(v.includes('newload')||v.includes('multi'))checks.push('Hitung total beban serentak dan bandingkan dengan kapasitas sirkuit/proteksi.');
 if(!checks.length)checks.push('Mulai dari inspeksi visual, status indikator, kondisi mekanis, lalu pengukuran sesuai kompetensi.');
 checks.push('Catat nameplate, kondisi saat gejala muncul, hasil ukur, dan perubahan terakhir untuk analisis lanjutan.');
 return checks.slice(0,6);
}
function narrative(){
 const d=flows[currentDomain];
 return `Troubleshooting ${d.label} — ${currentFlow.title}. ${answers.map(a=>`${a.q} Jawaban: ${a.label}.`).join(' ')} Tolong analisis kemungkinan penyebab, urutan pengecekan aman, data yang masih kurang, dan kapan harus berhenti/eskalasi ke teknisi kompeten.`;
}
function renderResult(){
 const d=flows[currentDomain],checks=resultChecks();
 stage.innerHTML=`<div class="troubleResult"><div class="troubleResultHero"><span class="eyebrow">HASIL WIZARD • ${esc(d.label)}</span><h3>${esc(currentFlow.title)}</h3><p>Prioritas pemeriksaan awal berdasarkan jawaban Anda — bukan vonis kerusakan final.</p></div><div class="troubleResultCard"><h4>Kemungkinan yang perlu diprioritaskan</h4><ul>${currentFlow.causes.slice(0,5).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="troubleResultCard"><h4>Urutan pengecekan berikutnya</h4><ul>${checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="troubleSafety"><b>Safety:</b> jangan melakukan pengukuran live, membuka panel bertegangan, sistem refrigerant, pressure system, atau rotating equipment tanpa prosedur, alat ukur, APD, dan kompetensi yang sesuai.</div><div class="troubleActions"><button class="troubleBtn" id="continueAssistant" type="button">Lanjut ke Smart Assistant ↗</button><button class="troubleBtn ghost" id="copyTrouble" type="button">Salin ringkasan</button><button class="troubleBtn ghost" id="restartTrouble" type="button">Ulangi wizard</button></div></div>`;
 $('#continueAssistant').onclick=()=>{input.value=narrative().slice(0,3000);input.dispatchEvent(new Event('input',{bubbles:true}));$('#assistant').scrollIntoView({behavior:'smooth'});input.focus()};
 $('#copyTrouble').onclick=async e=>{try{await navigator.clipboard.writeText(narrative());e.target.textContent='Tersalin ✓';setTimeout(()=>e.target.textContent='Salin ringkasan',1200)}catch(_){}};
 $('#restartTrouble').onclick=()=>selectDomain(currentDomain);
}
function reset(){
 currentDomain=null;currentFlow=null;answers=[];qIndex=0;
 domainWrap.querySelectorAll('.troubleDomain').forEach(b=>b.classList.remove('active'));
 stage.innerHTML=`<div class="troubleIntro"><div><div class="troubleIntroIcon">🩺</div><h3>Pilih domain di sebelah kiri.</h3><p>Wizard akan menanyakan gejala satu per satu, menyusun prioritas pemeriksaan, warning, lalu membuat ringkasan yang bisa diteruskan ke Smart Assistant.</p></div></div>`;
}

function setupVoice(){
 if(!voiceBtn||!input)return;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 let rec=null,listening=false;
 if(!SR){
  voiceBtn.disabled=true;voiceBtn.textContent='🎙 Voice tidak didukung';
  if(voiceStatus)voiceStatus.textContent='Gunakan browser yang mendukung Web Speech API.';
 }else{
  rec=new SR();rec.lang='id-ID';rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=1;
  rec.onstart=()=>{listening=true;voiceBtn.classList.add('listening');voiceBtn.textContent='⏹ Stop bicara';voiceStatus.innerHTML='<span class="voicePulse"></span>Mendengarkan Bahasa Indonesia…'};
  rec.onresult=e=>{
   let final='',interim='';
   for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;e.results[i].isFinal?final+=t:interim+=t}
   voiceStatus.textContent=interim?`Mendengar: ${interim}`:'Memproses suara…';
   if(final){
    input.value=((input.value.trim()?input.value.trim()+' ':'')+final.trim()).slice(0,3000);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    voiceStatus.textContent='Transkrip masuk ke kolom cerita. Periksa lalu tekan Analisis Engineering.';
   }
  };
  rec.onerror=e=>{voiceStatus.textContent=e.error==='not-allowed'?'Izin mikrofon ditolak. Aktifkan izin mikrofon untuk situs ini.':`Voice error: ${e.error}`};
  rec.onend=()=>{listening=false;voiceBtn.classList.remove('listening');voiceBtn.textContent='🎙 Mulai bicara'};
  voiceBtn.onclick=()=>{if(listening){try{rec.stop()}catch(e){};return}try{rec.start();track('Voice Assistant: Speech Input')}catch(e){}};
 }
 if(readBtn){
  if(!('speechSynthesis'in window)){readBtn.disabled=true;readBtn.textContent='🔊 TTS tidak didukung'}
  else readBtn.onclick=()=>{
   if(speechSynthesis.speaking){speechSynthesis.cancel();readBtn.classList.remove('speaking');readBtn.textContent='🔊 Bacakan hasil';return}
   const bubbles=[...conversation.querySelectorAll('.smartMessage.assistant .smartBubble')];
   const text=(bubbles.at(-1)?.innerText||'Belum ada hasil analisis untuk dibacakan.').trim();
   const u=new SpeechSynthesisUtterance(text.slice(0,3500));u.lang='id-ID';u.rate=.95;
   const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/^id(-|_)/i.test(v.lang))||null;
   u.onstart=()=>{readBtn.classList.add('speaking');readBtn.textContent='⏹ Stop suara'};
   u.onend=u.onerror=()=>{readBtn.classList.remove('speaking');readBtn.textContent='🔊 Bacakan hasil'};
   speechSynthesis.speak(u);track('Voice Assistant: Read Result');
  };
 }
}
if(domainWrap&&stage){renderDomains();reset()}
setupVoice();
})();
