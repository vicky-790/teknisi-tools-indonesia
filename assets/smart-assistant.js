(()=>{'use strict';
const $=s=>document.querySelector(s),input=$('#smartInput'),conversation=$('#conversation'),counter=$('#charCount');
if(!input||!conversation)return;
const state={messages:[],lastReport:null},riskRank={info:0,caution:1,risk:2};
const domainsOrder=['Electrical','HVAC / AC','Civil','Plumbing','Electronics','Mechanical','Maintenance','Energy','Building Engineering','Automation / IoT'];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).toLowerCase().replace(/,/g,'.');
const n=s=>{const v=Number(String(s).replace(',','.'));return Number.isFinite(v)?v:null};
const fmt=(v,d=2)=>Number(v).toLocaleString('id-ID',{maximumFractionDigits:d});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uniq=a=>[...new Set(a.filter(Boolean))];
const add=(o,k,...x)=>o[k].push(...x.filter(Boolean));
function setRisk(o,l,label){if(riskRank[l]>riskRank[o.status.level])o.status={level:l,label}}
function detectDomains(t){
 const rules=[
 ['Electrical',/\b(listrik|mcb|ampere|arus|watt|va\b|volt\b|tegangan|kabel|stop ?kontak|panel|rcbo|elcb|breaker|3 ?phase|tiga ?phase|water ?heater)\b/i],
 ['HVAC / AC',/\b(ac\b|air ?condition|pk\b|btu|dingin|evaporator|kondensor|compressor|kompresor|freon|refrigerant|hvac)\b/i],
 ['Civil',/\b(dinding|tembok|bata|hebel|aac|semen|pasir|mortar|plester|aci\b|beton|keramik|sloof|kolom|balok|plat|cor\b|civil)\b/i],
 ['Plumbing',/\b(pipa|toren|tandon|pompa|kran|air\b|debit|pressure|tekanan|sumur|plumbing|drain|saluran)\b/i],
 ['Electronics',/\b(resistor|led\b|kapasitor|dioda|transistor|pcb|elektronik|electronics|power ?supply|adaptor)\b/i],
 ['Mechanical',/\b(pulley|puli|rpm|gear|gearbox|belt|bearing|torsi|torque|mekanik|mechanical|shaft|poros|motor listrik)\b/i],
 ['Maintenance',/\b(rusak|mati|trip|panas|bunyi|berisik|bocor|tidak dingin|ga dingin|nggak dingin|lemah|kecil|error|trouble|cek|periksa|maintenance|servis|service)\b/i],
 ['Energy',/\b(kwh|tagihan|biaya listrik|energi|battery|baterai|ups|runtime|backup|solar|panel surya)\b/i],
 ['Building Engineering',/\b(genset|chiller|ahu|fcu|lift|elevator|building|gedung|utility|booster pump|fire pump|stp|wtp)\b/i],
 ['Automation / IoT',/\b(esp32|arduino|plc|iot|otomasi|automation|sensor|relay|contactor|kontaktor|modbus|rs485|mqtt|firebase)\b/i]
 ];
 return domainsOrder.filter(d=>rules.find(r=>r[0]===d)[1].test(t));
}
function dimension(t){
 const m=t.match(/(\d+(?:[.,]\d+)?)\s*(?:m(?:eter)?|m2|m²)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:m(?:eter)?|m2|m²)?(?:\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:m(?:eter)?)?)?/i);
 return m?{a:n(m[1]),b:n(m[2]),c:m[3]?n(m[3]):null}:null;
}
function one(t,re){const m=t.match(re);return m?n(m[1]):null}
function service(t){
 let m=t.match(/(?:daya|pln|kapasitas(?:\s+listrik)?|listrik\s+rumah)\D{0,25}(\d{3,5})\s*(va|watt|w)\b/i);
 if(!m)m=t.match(/\b(450|900|1300|2200|3500|4400|5500|6600|7700|10600|11000|13200|16500|23000)\s*(va|watt|w)\b/i);
 return m?{value:n(m[1]),unit:m[2].toUpperCase()}:null;
}
function mcb(t){
 let m=t.match(/(?:mcb|breaker)\D{0,15}(\d+(?:[.,]\d+)?)\s*(?:a|ampere)\b/i);
 if(!m&&/(daya|pln|listrik rumah)/i.test(t))m=t.match(/\b(\d+(?:[.,]\d+)?)\s*(?:a|ampere)\b/i);
 return m?n(m[1]):null;
}
function openings(t){
 let total=0,found=[],m;const re=/(pintu|jendela)\D{0,18}(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|m)?/gi;
 while((m=re.exec(t))){let a=n(m[2]),b=n(m[3]),u=(m[4]||'').toLowerCase(),assume='';if(u==='cm'||(!u&&(a>20||b>20))){a/=100;b/=100;if(!u)assume=' (diasumsikan cm)'}const area=a*b;total+=area;found.push(`${m[1]} ${fmt(a)}×${fmt(b)} m = ${fmt(area)} m²${assume}`)}
 return {total,found};
}
const devices=[
 ['AC',/\bac\b/i],['Kulkas',/\b(kulkas|lemari es)\b/i],['TV',/\btv\b/i],['Mesin cuci',/\bmesin cuci\b/i],
 ['Magic com / rice cooker',/\b(magic ?com|rice ?cooker|magic jar)\b/i],['Pompa air',/\bpompa(?: air)?\b/i],
 ['Water heater',/\bwater ?heater\b/i],['Setrika',/\bsetrika\b/i],['Dispenser',/\bdispenser\b/i],['Microwave',/\bmicrowave\b/i],['Oven',/\boven\b/i]
];
function deviceData(t){const out=[];for(const [name,re] of devices){const m=t.match(re);if(!m)continue;const w=t.slice(Math.max(0,m.index-28),Math.min(t.length,m.index+m[0].length+38));const wm=w.match(/(\d+(?:[.,]\d+)?)\s*(?:w|watt)\b/i);out.push({name,watt:wm?n(wm[1]):null})}return out}
function facts(t){return{
 dim:dimension(t),
 height:one(t,/(?:tinggi\s+(?:plafon|ceiling|ruangan|kamar)?|plafon)\D{0,12}(\d+(?:[.,]\d+)?)\s*m\b/i),
 people:one(t,/(\d+)\s*(?:orang|penghuni|people)\b/i),
 service:service(t),mcb:mcb(t),
 voltage:one(t,/\b(110|127|220|230|380|400)\s*v(?:olt)?\b/i)||220,
 openings:openings(t),
 tank:one(t,/(?:toren|tandon)\D{0,18}(\d+(?:[.,]\d+)?)\s*(?:l|liter)\b/i),
 flow:one(t,/(\d+(?:[.,]\d+)?)\s*(?:l\/?min|liter\/?menit|lpm)\b/i),
 pipe:one(t,/(?:pipa)\D{0,12}(\d+(?:[.,]\d+)?)\s*(?:"|inch|inci)\b/i),
 staticHeight:one(t,/(?:tinggi|head|naik)\D{0,15}(\d+(?:[.,]\d+)?)\s*m(?:eter)?\b/i),
 devices:deviceData(t)
}}
function base(domains){return{domains,status:{level:'info',label:'ANALISIS AWAL'},summary:[],data:[],calculations:[],explanations:[],warnings:[],recommendations:[],questions:[],links:[],assumptions:[]}}
function electrical(o,t,f){
 if(!o.domains.includes('Electrical')&&!o.domains.includes('Energy'))return;
 if(f.service)add(o,'data',`Kapasitas yang disebut: ${fmt(f.service.value,0)} ${f.service.unit}`);
 if(f.mcb){add(o,'data',`MCB yang disebut: ${fmt(f.mcb)} A`);add(o,'calculations',{title:'Kapasitas teoritis dari MCB',formula:`S ≈ V × I = ${fmt(f.voltage,0)} × ${fmt(f.mcb)}`,result:`≈ ${fmt(f.voltage*f.mcb,0)} VA`})}
 if(f.devices.length)add(o,'data',`Peralatan terdeteksi: ${f.devices.map(x=>x.name+(x.watt?` (${fmt(x.watt,0)} W)`:'')).join(', ')}`);
 const explicit=f.devices.filter(x=>x.watt>0),total=explicit.reduce((a,b)=>a+b.watt,0);
 if(explicit.length)add(o,'calculations',{title:'Beban nameplate yang berhasil dibaca',formula:explicit.map(x=>`${x.name} ${fmt(x.watt,0)} W`).join(' + '),result:`${fmt(total,0)} W`});
 if(f.service&&explicit.length){const ratio=total/f.service.value;if(ratio>1){setRisk(o,'risk','BERISIKO MELEBIHI KAPASITAS');add(o,'warnings',`Beban berlabel yang terbaca (${fmt(total,0)} W) sudah lebih besar dari angka kapasitas ${fmt(f.service.value,0)} ${f.service.unit}.`)}else if(ratio>.75){setRisk(o,'caution','BORDERLINE / CEK SIMULTAN');add(o,'warnings',`Beban berlabel yang terbaca sekitar ${fmt(ratio*100,0)}% dari angka kapasitas. Starting current dan beban lain dapat memicu trip.`)}}
 if(f.devices.some(x=>!x.watt)){add(o,'questions',`Berapa Watt/VA nameplate untuk: ${f.devices.filter(x=>!x.watt).map(x=>x.name).join(', ')}?`);add(o,'explanations','Saya tidak mengarang Watt perangkat yang tidak disebutkan karena tiap model bisa berbeda.')}
 if(f.service&&f.mcb){const approx=f.voltage*f.mcb;if(Math.abs(approx-f.service.value)/f.service.value<.2)add(o,'explanations',`MCB ${fmt(f.mcb)} A pada ${fmt(f.voltage,0)} V ≈ ${fmt(approx,0)} VA, cukup konsisten sebagai cross-check kasar.`)}
 add(o,'recommendations','Gunakan daya nameplate dan tentukan perangkat yang benar-benar menyala bersamaan.');
 add(o,'warnings','Untuk panel, MCB, kabel atau pengukuran bertegangan, gunakan prosedur aman dan personel kompeten.');
 add(o,'links',{url:'/tools/mcb',label:'Kalkulator MCB'},{url:'/tools/cable-size',label:'Ukuran Kabel'},{url:'/tools/voltage-drop',label:'Voltage Drop'});
}
function hvac(o,t,f){
 if(!o.domains.includes('HVAC / AC'))return;
 if(!f.dim){add(o,'questions','Berapa panjang × lebar ruangan? Sertakan tinggi plafon bila ada.');return}
 const area=f.dim.a*f.dim.b,factor=f.height?Math.max(.85,f.height/2.7):1,sun=/(matahari langsung|kena matahari|hadap barat|panas sekali|lantai paling atas)/i.test(t)?1.15:1;
 const btu=area*500*factor*sun+(f.people&&f.people>2?(f.people-2)*600:0);
 const sizes=[[5000,.5],[7000,.75],[9000,1],[12000,1.5],[18000,2],[24000,2.5]],pick=sizes.find(x=>btu<=x[0])||[Math.ceil(btu/1000)*1000,'>2.5'];
 add(o,'data',`Ukuran ruangan: ${fmt(f.dim.a)} × ${fmt(f.dim.b)} m = ${fmt(area)} m²`);
 add(o,'calculations',{title:'Quick cooling-load estimate',formula:`${fmt(area)} m² × 500 BTU/h/m²${f.height?` × faktor tinggi ${fmt(factor,2)}`:''}${sun>1?' × faktor panas 1,15':''}`,result:`≈ ${fmt(btu,0)} BTU/h → kelas sekitar ${pick[1]} PK (${fmt(pick[0],0)} BTU/h)`});
 add(o,'assumptions','500 BTU/h per m² adalah quick sizing awal, bukan full heat-load calculation.');
 if(!f.height)add(o,'questions','Berapa tinggi plafon ruangan?');
 if(!/(matahari|hadap barat|lantai atas|teduh)/i.test(t))add(o,'questions','Apakah ruangan terkena matahari langsung / berada di lantai atas?');
 if(!f.people)add(o,'questions','Biasanya berapa orang berada di ruangan?');
 add(o,'explanations',`Rekomendasi awal berada di kelas ${pick[1]} PK. Kaca, atap, matahari, plafon dan penghuni dapat mengubah kebutuhan.`);
 if(f.service)add(o,'explanations','Kecukupan listrik AC harus memakai input Watt/VA model AC yang dipilih, bukan PK saja.');
 add(o,'links',{url:'/tools/ac-pk',label:'Kalkulator PK AC'},{url:'/tools/watt-ampere',label:'Watt → Ampere'});
}
function civil(o,t,f){
 if(!o.domains.includes('Civil'))return;
 if(/(dinding|tembok|bata|hebel|aac)/i.test(t)){
  if(!f.dim){add(o,'questions','Berapa panjang × tinggi dinding?');return}
  const gross=f.dim.a*f.dim.b,net=Math.max(0,gross-f.openings.total);add(o,'data',`Bidang utama: ${fmt(gross)} m²`);f.openings.found.forEach(x=>add(o,'data','Bukaan: '+x));
  add(o,'calculations',{title:'Luas dinding bersih',formula:`${fmt(gross)} − ${fmt(f.openings.total)} m² bukaan`,result:`${fmt(net)} m²`});
  if(/\bhebel\b|\baac\b/i.test(t)){const pcs=Math.ceil(net/.12*1.05);add(o,'calculations',{title:'Estimasi hebel 60×20 cm',formula:`${fmt(net)} ÷ 0,12 × 1,05`,result:`≈ ${fmt(pcs,0)} pcs`});add(o,'assumptions','Hebel 600×200 mm, waste 5%.');add(o,'links',{url:'/civil/hebel',label:'Kalkulator Hebel'})}
  else if(/\bbata\b/i.test(t)){const pcs=Math.ceil(net/((.2+.01)*(.05+.01))*1.07);add(o,'calculations',{title:'Estimasi bata merah',formula:'Modul bata 200×50 mm + spesi 10 mm + waste 7%',result:`≈ ${fmt(pcs,0)} pcs`});add(o,'assumptions','Ukuran bata 200×50 mm, spesi 10 mm, waste 7%.');add(o,'links',{url:'/civil/bata-merah',label:'Kalkulator Bata Merah'})}
  else add(o,'questions','Material dinding yang ingin dipakai bata merah atau hebel/AAC?');
  add(o,'recommendations','Lanjutkan cross-check mortar/perekat, plester-acian dan waste pembelian.');
 }
 if(/\bbeton|cor\b/i.test(t)&&f.dim&&f.dim.c){const v=f.dim.a*f.dim.b*f.dim.c;add(o,'calculations',{title:'Volume geometri beton',formula:`${fmt(f.dim.a)} × ${fmt(f.dim.b)} × ${fmt(f.dim.c)}`,result:`${fmt(v,3)} m³`});add(o,'links',{url:'/civil/beton',label:'Kalkulator Beton'})}
 if(/\bkeramik\b/i.test(t)&&f.dim){add(o,'data',`Luas area keramik: ${fmt(f.dim.a*f.dim.b)} m²`);add(o,'questions','Berapa ukuran keramik dan isi per dus?');add(o,'links',{url:'/civil/keramik',label:'Kalkulator Keramik'})}
 add(o,'warnings','Quantity take-off adalah estimasi awal; dimensi aktual dan spesifikasi proyek tetap menjadi acuan.');
}
function plumbing(o,t,f){
 if(!o.domains.includes('Plumbing'))return;
 if(f.tank)add(o,'data',`Kapasitas toren: ${fmt(f.tank,0)} L`);if(f.flow)add(o,'data',`Debit: ${fmt(f.flow)} L/menit`);if(f.pipe)add(o,'data',`Pipa: ${fmt(f.pipe)} inch`);
 if(f.tank&&f.flow)add(o,'calculations',{title:'Waktu pengisian ideal',formula:`${fmt(f.tank,0)} ÷ ${fmt(f.flow)} L/menit`,result:`≈ ${fmt(f.tank/f.flow,1)} menit`});
 if(/(air.*kecil|tekanan.*kecil|lemah|aliran.*kecil)/i.test(t)){setRisk(o,'caution','PERLU DATA HEAD & FLOW');add(o,'explanations','Aliran kecil tidak otomatis berarti pompa kurang besar. Cek head statis, friction loss, diameter/panjang pipa, fitting, filter, valve, air leak sisi hisap, level sumber dan impeller.');add(o,'questions','Apa merk/model dan data head/debit pompa?','Berapa panjang pipa dan jumlah elbow/fitting?','Air kecil di semua titik atau hanya satu titik?')}
 add(o,'recommendations','Bandingkan total dynamic head dengan kurva pompa, bukan memilih hanya dari Watt/HP.');
}
function electronics(o,t){
 if(!o.domains.includes('Electronics'))return;
 const vs=one(t,/(?:supply|sumber|input)\D{0,12}(\d+(?:[.,]\d+)?)\s*v\b/i),vf=one(t,/(?:led|forward)\D{0,12}(\d+(?:[.,]\d+)?)\s*v\b/i),ma=one(t,/(\d+(?:[.,]\d+)?)\s*ma\b/i);
 if(vs&&vf&&ma&&vs>vf){const R=(vs-vf)/(ma/1000),P=(ma/1000)**2*R;add(o,'calculations',{title:'Resistor seri LED',formula:`R = (${fmt(vs)} − ${fmt(vf)}) / ${fmt(ma/1000,3)} A`,result:`≈ ${fmt(R,0)} Ω; disipasi ≈ ${fmt(P,3)} W`})}else add(o,'questions','Untuk hitung LED/resistor: berapa supply, forward voltage LED dan arus target mA?');
 add(o,'links',{url:'/electrical/ohms-law',label:'Hukum Ohm'});
}
function mechanical(o,t){
 if(!o.domains.includes('Mechanical'))return;
 if(/pulley|puli|belt/i.test(t)){add(o,'explanations','Rasio pulley ideal mengikuti N1 × D1 ≈ N2 × D2.');add(o,'questions','Berapa RPM input, diameter pulley penggerak dan diameter pulley yang digerakkan?')}
 if(/motor/i.test(t))add(o,'questions','Sebutkan nameplate motor: kW/HP, voltage, phase, ampere dan RPM.');
}
function maintenance(o,t){
 if(!o.domains.includes('Maintenance'))return;
 if(/ac\b/i.test(t)&&/(tidak dingin|ga dingin|nggak dingin|dingin sebentar|outdoor hidup mati)/i.test(t)){add(o,'explanations','Gejala AC tidak cukup untuk menyimpulkan freon habis. Screening awal: airflow/filter, coil, fan, tegangan supply, error/sensor dan pola kerja compressor.');add(o,'recommendations','Mulai dari filter & airflow → kebersihan coil → fan → indikator/error → tegangan supply.');add(o,'warnings','Pemeriksaan refrigerant dilakukan teknisi dengan alat yang sesuai.')}
 if(/mcb.*trip|trip.*mcb/i.test(t)){setRisk(o,'caution','PERLU ISOLASI PENYEBAB');add(o,'explanations','MCB trip dapat terkait overload, short circuit atau inrush tinggi.');add(o,'recommendations','Catat perangkat yang baru menyala saat trip dan ukur arus bila aman.')}
 if(/pompa/i.test(t)&&/(lemah|kecil|bunyi|panas|mati)/i.test(t))add(o,'recommendations','Untuk pompa: cek priming/air leak, filter, valve, capacitor, impeller, arus motor dan head sistem.');
}
function automation(o,t){
 if(!o.domains.includes('Automation / IoT'))return;
 add(o,'explanations','Pisahkan desain menjadi power, sensor input, logic/controller, actuator output, manual override, fail-safe dan monitoring.');
 add(o,'recommendations','Sediakan Manual/Auto/Off bila relevan.','Pisahkan low-voltage control dari beban mains dengan isolasi yang sesuai.','Tentukan safe-state saat sensor/controller/jaringan gagal.','Tambahkan watchdog, timeout dan alarm fault penting.');
 if(/pompa|toren/i.test(t))add(o,'recommendations','Untuk toren: pertimbangkan dry-run, timeout isi, konflik sensor high/low dan feedback contactor.');
 add(o,'questions','Controller apa yang dipakai, tegangan sensor, jenis output dan beban yang dikendalikan?');
}
function building(o){
 if(!o.domains.includes('Building Engineering'))return;
 add(o,'recommendations','Sertakan nameplate, mode operasi, alarm/error, single-line/P&ID dan kondisi sebelum-sesudah gangguan.');
 add(o,'warnings','Genset, lift, chiller, fire pump dan panel distribusi memiliki interlock/proteksi khusus; ikuti prosedur site dan manual manufacturer.');
}
function energy(o,t){
 if(!o.domains.includes('Energy'))return;
 if(/kwh|biaya listrik|tagihan/i.test(t))add(o,'links',{url:'/tools/kwh',label:'Kalkulator kWh / Biaya'});
 if(/battery|baterai|ups|runtime/i.test(t))add(o,'links',{url:'/tools/runtime',label:'Runtime Peralatan'});
}
function analyzeText(text){
 const t=norm(text),domains=detectDomains(t);if(!domains.length)domains.push('Maintenance');
 const f=facts(t),o=base(domains);add(o,'summary',`Saya mendeteksi kasus ini terkait ${domains.join(', ')}.`);if(domains.length>1)add(o,'summary','Kasus diperlakukan sebagai multi-domain agar satu rekomendasi tidak mengabaikan sistem lain.');
 electrical(o,t,f);hvac(o,t,f);civil(o,t,f);plumbing(o,t,f);electronics(o,t);mechanical(o,t);maintenance(o,t);automation(o,t);building(o,t);energy(o,t);
 if(!o.calculations.length)add(o,'summary','Data yang ada belum cukup untuk perhitungan numerik yang dapat dipertanggungjawabkan; fokus sementara pada diagnosis awal dan data yang perlu dilengkapi.');
 if(o.questions.length&&!o.calculations.length)setRisk(o,'caution','BUTUH DATA TAMBAHAN');
 ['summary','data','explanations','warnings','recommendations','questions','assumptions'].forEach(k=>o[k]=uniq(o[k]));o.links=Array.from(new Map(o.links.map(x=>[x.url,x])).values());return o;
}
function section(title,items,type='list'){if(!items?.length)return'';if(type==='data')return`<section class="smartReportSection"><h4>${esc(title)}</h4><div class="smartDataGrid">${items.map(x=>`<div class="smartData"><small>DATA TERBACA</small><strong>${esc(x)}</strong></div>`).join('')}</div></section>`;if(type==='calc')return`<section class="smartReportSection"><h4>${esc(title)}</h4>${items.map(x=>`<div class="smartCalc"><b>${esc(x.title)}</b><code>${esc(x.formula)}</code><strong>${esc(x.result)}</strong></div>`).join('')}</section>`;if(type==='links')return`<section class="smartReportSection"><h4>${esc(title)}</h4><div class="smartLinkRow">${items.map(x=>`<a class="smartLink" href="${esc(x.url)}">${esc(x.label)} ↗</a>`).join('')}</div></section>`;return`<section class="smartReportSection"><h4>${esc(title)}</h4><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`}
function html(r){return`<div class="smartReport"><div class="smartReportHead"><span class="smartStatus ${r.status.level}">${esc(r.status.label)}</span><div class="smartTags">${r.domains.map(x=>`<span class="smartTag">${esc(x)}</span>`).join('')}</div></div>${section('Masalah yang saya pahami',r.summary)}${section('Data yang berhasil dibaca',r.data,'data')}${section('Perhitungan',r.calculations,'calc')}${section('Penjelasan',r.explanations)}${section('Asumsi yang digunakan',r.assumptions)}${section('Hal yang perlu diperhatikan',r.warnings)}${section('Rekomendasi',r.recommendations)}${section('Data tambahan yang masih dibutuhkan',r.questions)}${section('Tool terkait',r.links,'links')}</div>`}
function textReport(r){let s=`SMART ENGINEERING & TECHNICIAN ASSISTANT\nStatus: ${r.status.label}\nDomain: ${r.domains.join(', ')}\n`;const ap=(h,a,fn=x=>x)=>{if(a?.length){s+=`\n${h}\n`;a.forEach(x=>s+=`- ${fn(x)}\n`)}};ap('MASALAH',r.summary);ap('DATA',r.data);ap('PERHITUNGAN',r.calculations,x=>`${x.title}: ${x.formula} => ${x.result}`);ap('PENJELASAN',r.explanations);ap('ASUMSI',r.assumptions);ap('WARNING',r.warnings);ap('REKOMENDASI',r.recommendations);ap('DATA YANG MASIH DIBUTUHKAN',r.questions);return s}
function msg(role,content,isHTML=false){const row=document.createElement('div');row.className='smartMessage '+role;row.innerHTML=`<div class="smartAvatar">${role==='user'?'YOU':'TT'}</div><div class="smartBubble">${isHTML?content:`<p>${esc(content)}</p>`}</div>`;conversation.appendChild(row);conversation.scrollTop=conversation.scrollHeight;return row}
function allUserText(){return state.messages.filter(x=>x.role==='user').map(x=>x.text).join(' | ')}
function run(){
 const v=clean(input.value);if(v.length<8)return;state.messages.push({role:'user',text:v});msg('user',v);input.value='';counter.textContent='0 / 3000';const typing=msg('assistant','<div class="smartTyping"><i></i><i></i><i></i></div>',true);
 setTimeout(()=>{const r=analyzeText(allUserText());state.lastReport=r;typing.querySelector('.smartBubble').innerHTML=html(r);conversation.scrollTop=conversation.scrollHeight;try{sessionStorage.setItem('tti_smart_case',JSON.stringify(state.messages.slice(-12)))}catch(e){}if(window.TTITrack)window.TTITrack('calculate','Smart Assistant: '+r.domains.join(' + '))},250);
}
input.addEventListener('input',()=>counter.textContent=`${input.value.length} / 3000`);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();run()}});$('#analyzeBtn').addEventListener('click',run);
document.querySelectorAll('.smartExample').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.example;counter.textContent=`${input.value.length} / 3000`;input.focus()}));
$('#resetCase').addEventListener('click',()=>{state.messages=[];state.lastReport=null;try{sessionStorage.removeItem('tti_smart_case')}catch(e){}conversation.innerHTML='<div class="smartMessage assistant"><div class="smartAvatar">TT</div><div class="smartBubble"><b>Case baru siap.</b><p>Ceritakan kebutuhan teknis dari awal.</p></div></div>'});
$('#copyReport').addEventListener('click',async()=>{if(!state.lastReport)return;try{await navigator.clipboard.writeText(textReport(state.lastReport));$('#copyReport').textContent='Tersalin ✓';setTimeout(()=>$('#copyReport').textContent='Salin report',1200)}catch(e){}});
$('#printReport').addEventListener('click',()=>{if(state.lastReport)window.print()});
try{const saved=JSON.parse(sessionStorage.getItem('tti_smart_case')||'[]');if(Array.isArray(saved)&&saved.length)state.messages=saved.filter(x=>x?.role==='user'&&x.text).slice(-12)}catch(e){}
})();