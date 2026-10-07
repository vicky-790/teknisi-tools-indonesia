
(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  const cameraInput = $('#visualCameraInput');
  const galleryInput = $('#visualGalleryInput');
  const preview = $('#visualPreviewImg');
  const placeholder = $('#visualPlaceholder');
  const resultBox = $('#visualResults');
  const ocrBox = $('#visualOcrText');
  const fileName = $('#metaFileName');
  const fileType = $('#metaFileType');
  const fileSize = $('#metaFileSize');
  const fileDim = $('#metaFileDim');
  const category = $('#visualCategory');
  const note = $('#visualNote');
  const runGeneralBtn = $('#runGeneralBtn');
  const runResistorBtn = $('#runResistorBtn');
  const runNameplateBtn = $('#runNameplateBtn');
  const runDamageBtn = $('#runDamageBtn');
  const clearBtn = $('#clearVisualBtn');
  const copyBtn = $('#copyVisualBtn');
  const band1 = $('#resBand1');
  const band2 = $('#resBand2');
  const band3 = $('#resBand3');
  const band4 = $('#resBand4');
  const applyManualBtn = $('#applyManualResistor');
  const guessResistorBtn = $('#guessResistorBtn');

  if(!preview || !resultBox) return;

  const state = {
    file:null,
    imageUrl:'',
    imageLoaded:false,
    ocrText:'',
    lastReportText:''
  };

  const resistorPalette = [
    {name:'black', label:'Hitam', rgb:[20,20,20], digit:0, multiplier:1, tolerance:null},
    {name:'brown', label:'Cokelat', rgb:[98,56,28], digit:1, multiplier:10, tolerance:1},
    {name:'red', label:'Merah', rgb:[180,33,33], digit:2, multiplier:100, tolerance:2},
    {name:'orange', label:'Oranye', rgb:[235,123,24], digit:3, multiplier:1000, tolerance:null},
    {name:'yellow', label:'Kuning', rgb:[245,205,34], digit:4, multiplier:10000, tolerance:null},
    {name:'green', label:'Hijau', rgb:[45,150,76], digit:5, multiplier:100000, tolerance:0.5},
    {name:'blue', label:'Biru', rgb:[41,107,205], digit:6, multiplier:1000000, tolerance:0.25},
    {name:'violet', label:'Ungu', rgb:[130,62,186], digit:7, multiplier:10000000, tolerance:0.1},
    {name:'grey', label:'Abu', rgb:[122,122,122], digit:8, multiplier:100000000, tolerance:0.05},
    {name:'white', label:'Putih', rgb:[230,230,230], digit:9, multiplier:1000000000, tolerance:null},
    {name:'gold', label:'Emas', rgb:[186,149,47], digit:null, multiplier:0.1, tolerance:5},
    {name:'silver', label:'Perak', rgb:[174,178,189], digit:null, multiplier:0.01, tolerance:10}
  ];

  const commonColors = {
    black:'#222', brown:'#8b5a2b', red:'#d53a3a', orange:'#f38c20', yellow:'#f4d03f',
    green:'#31a05f', blue:'#3377dd', violet:'#8a4bd9', grey:'#9ba3aa', white:'#f0f0f0',
    gold:'#c8a53d', silver:'#c4cbd3'
  };

  function fmtBytes(v){
    if(!v && v!==0) return '-';
    const u=['B','KB','MB','GB']; let i=0; let n=v;
    while(n>=1024 && i<u.length-1){ n/=1024; i++; }
    return `${n.toFixed(n<10&&i?1:0)} ${u[i]}`;
  }
  function esc(s=''){ return String(s).replace(/[&<>"]/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }
  function clean(s=''){ return String(s).replace(/\s+/g,' ').trim(); }
  function list(items){ return `<ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>`; }
  function prettyOhm(v){
    if(v>=1e9) return `${trimZero(v/1e9)} GΩ`;
    if(v>=1e6) return `${trimZero(v/1e6)} MΩ`;
    if(v>=1e3) return `${trimZero(v/1e3)} kΩ`;
    if(v<1) return `${trimZero(v*1000)} mΩ`;
    return `${trimZero(v)} Ω`;
  }
  function trimZero(n){
    return Number(n).toLocaleString('id-ID',{maximumFractionDigits:3});
  }
  function nearestPaletteColor(rgb){
    let best = resistorPalette[0], score=Infinity;
    resistorPalette.forEach(c=>{
      const d = Math.sqrt((rgb[0]-c.rgb[0])**2 + (rgb[1]-c.rgb[1])**2 + (rgb[2]-c.rgb[2])**2);
      if(d<score){score=d; best=c;}
    });
    return {color:best, distance:score};
  }
  function setReport(html, plainText=''){
    resultBox.innerHTML = html;
    state.lastReportText = plainText || resultBox.innerText || '';
  }
  function resetVisual(){
    state.file = null; state.ocrText=''; state.lastReportText=''; state.imageLoaded=false;
    if(state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    state.imageUrl='';
    preview.removeAttribute('src');
    preview.style.display='none';
    placeholder.style.display='block';
    ocrBox.textContent='Belum ada OCR.';
    fileName.textContent='-'; fileType.textContent='-'; fileSize.textContent='-'; fileDim.textContent='-';
    note.value=''; category.value='general';
    [band1,band2,band3,band4].forEach((el,i)=>el.selectedIndex = i===3 ? 10 : i);
    setReport(`<div class="empty"><b>Siap untuk analisis visual.</b><br>Unggah foto dari kamera atau galeri, lalu pilih mode: <b>Identifikasi</b>, <b>Resistor</b>, <b>Nameplate OCR</b>, atau <b>Catatan Kerusakan</b>.</div>`);
  }

  function populateBands(){
    const bandOptionsDigit = resistorPalette.filter(c=>c.digit!==null).map(c=>`<option value="${c.name}">${c.label}</option>`).join('');
    const bandOptionsMult = resistorPalette.map(c=>`<option value="${c.name}">${c.label}</option>`).join('');
    const bandOptionsTol = resistorPalette.filter(c=>c.tolerance!==null).map(c=>`<option value="${c.name}">${c.label} (${trimZero(c.tolerance)}%)</option>`).join('');
    band1.innerHTML = bandOptionsDigit;
    band2.innerHTML = bandOptionsDigit;
    band3.innerHTML = bandOptionsMult;
    band4.innerHTML = bandOptionsTol;
    band1.value='brown'; band2.value='black'; band3.value='red'; band4.value='gold';
  }

  function imageToCanvas(img){
    const max = 480;
    const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(60, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(60, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img,0,0,w,h);
    return {canvas, ctx, w, h};
  }

  function dominantColorFromImage(img){
    const {ctx,w,h} = imageToCanvas(img);
    const data = ctx.getImageData(0,0,w,h).data;
    let r=0,g=0,b=0,count=0;
    const step = 16;
    for(let i=0;i<data.length;i+=4*step){
      r += data[i]; g += data[i+1]; b += data[i+2]; count++;
    }
    return [Math.round(r/count),Math.round(g/count),Math.round(b/count)];
  }

  function identifyFromClues(text, selectedCategory, bandGuess){
    const t = ` ${clean(text).toLowerCase()} `;
    const has = (...keys)=>keys.some(k=>t.includes(k));
    const findings = [];
    let object = 'Objek belum dapat dipastikan dari satu foto';
    let domain = selectedCategory || 'general';
    let confidence = 'rendah';

    if(bandGuess && bandGuess.bands && bandGuess.bands.length>=3){
      object = 'Kemungkinan resistor axial';
      domain = 'electronics';
      confidence = 'sedang';
      findings.push('Terdapat pola warna memanjang yang mirip gelang resistor.');
    }
    if(has('resistor','ohm','k ohm','kohm','mohm','ω')){
      object='Resistor / komponen hambatan';
      domain='electronics';
      confidence='tinggi';
      findings.push('Teks/OCR mengandung petunjuk hambatan.');
    } else if(has('capacitor','uf','μf','microfarad')){
      object='Kapasitor';
      domain='electronics';
      confidence='sedang';
      findings.push('Ditemukan satuan kapasitansi.');
    } else if(has('mcb','breaker','c10','c16','c20','rcbo')){
      object='MCB / RCBO / circuit breaker';
      domain='electrical';
      confidence='sedang';
      findings.push('Terdapat kata kunci breaker/MCB.');
    } else if(has('contactor','coil','a1','a2','schneider lc1','cjx')){
      object='Contactor / relay daya';
      domain='electrical';
      confidence='sedang';
      findings.push('Terdapat terminal/teks yang umum pada contactor.');
    } else if(has('compressor','btu','r32','r410a','r22','air conditioner','ac','pk')){
      object='Perangkat AC / nameplate HVAC';
      domain='hvac';
      confidence='sedang';
      findings.push('Terdapat kata kunci refrigerant/BTU/PK.');
    } else if(has('pump','pompa','head','flow','lpm','m3/h')){
      object='Pompa / nameplate pompa';
      domain='plumbing';
      confidence='sedang';
      findings.push('Terdapat kata kunci head/flow/pump.');
    } else if(has('motor','rpm','hp','kw','phase','3ph','3 ph')){
      object='Motor listrik / mesin berputar';
      domain='mechanical';
      confidence='sedang';
      findings.push('OCR menunjukkan data motor/mesin.');
    } else if(has('pvc','1/2','3/4','1 inch','elbow','valve','stop kran')){
      object='Fitting / komponen plumbing';
      domain='plumbing';
      confidence='rendah';
      findings.push('Ada istilah yang sering muncul pada fitting pipa.');
    } else if(has('hebel','bata','keramik','mortar','semen')){
      object='Material civil / bangunan';
      domain='civil';
      confidence='rendah';
      findings.push('Terdapat istilah material sipil.');
    }

    if(selectedCategory && selectedCategory!=='general'){
      findings.push(`Kategori input dipilih: ${selectedCategory}.`);
    }
    return {object, domain, confidence, findings};
  }

  function resistorBandsManual(){
    const lookup = Object.fromEntries(resistorPalette.map(x=>[x.name,x]));
    const b1 = lookup[band1.value], b2 = lookup[band2.value], b3 = lookup[band3.value], b4 = lookup[band4.value];
    if(!b1 || !b2 || !b3 || !b4) return null;
    const value = ((b1.digit*10) + b2.digit) * b3.multiplier;
    const tol = b4.tolerance ?? 5;
    return {
      bands:[b1,b2,b3,b4],
      value, tolerance: tol,
      label: `${b1.label} • ${b2.label} • ${b3.label} • ${b4.label}`
    };
  }

  function detectResistorBandsFromImage(img){
    const {ctx,w,h} = imageToCanvas(img);
    const x0 = Math.round(w*0.10), x1 = Math.round(w*0.90);
    const y0 = Math.round(h*0.42), y1 = Math.round(h*0.58);
    const cols = [];
    for(let x=x0;x<x1;x++){
      let r=0,g=0,b=0,count=0;
      for(let y=y0;y<y1;y+=2){
        const d = ctx.getImageData(x,y,1,1).data;
        r += d[0]; g += d[1]; b += d[2]; count++;
      }
      cols.push({x, rgb:[r/count,g/count,b/count]});
    }
    let avg = [0,0,0];
    cols.forEach(c=>{ avg[0]+=c.rgb[0]; avg[1]+=c.rgb[1]; avg[2]+=c.rgb[2]; });
    avg = avg.map(v=>v/cols.length);
    cols.forEach(c=>{
      c.delta = Math.sqrt((c.rgb[0]-avg[0])**2 + (c.rgb[1]-avg[1])**2 + (c.rgb[2]-avg[2])**2);
      c.hit = c.delta > 42;
      c.nearest = nearestPaletteColor(c.rgb);
    });
    const groups = [];
    let current = null;
    cols.forEach(c=>{
      if(c.hit){
        if(!current) current = {start:c.x, colors:[], xs:[]};
        current.colors.push(c.nearest.color.name);
        current.xs.push(c.x);
      } else if(current){
        if(current.xs.length >= 4) groups.push(current);
        current = null;
      }
    });
    if(current && current.xs.length >= 4) groups.push(current);
    const summarized = groups.map(g=>{
      const tally = {};
      g.colors.forEach(name=>tally[name]=(tally[name]||0)+1);
      const winner = Object.entries(tally).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'brown';
      return {name:winner, width:g.xs.length};
    }).filter(g=>g.name);

    const merged = [];
    summarized.forEach(g=>{
      if(!merged.length || merged[merged.length-1].name !== g.name) merged.push(g);
      else merged[merged.length-1].width += g.width;
    });
    const finalBands = merged.filter(g=>g.width>=5).slice(0,4).map(g=>resistorPalette.find(c=>c.name===g.name));
    return {
      bands: finalBands.filter(Boolean),
      confidence: finalBands.length>=4 ? 'sedang' : (finalBands.length>=2 ? 'rendah' : 'sangat rendah')
    };
  }

  function resistorReport(source='manual'){
    const manual = resistorBandsManual();
    if(!manual) return;
    const rangeLow = manual.value * (1 - manual.tolerance/100);
    const rangeHigh = manual.value * (1 + manual.tolerance/100);
    const html = `
      <div class="visualReport">
        <div class="visualHead">
          <div><span class="visualBadge">Resistor Analyzer</span><h4>${source==='photo'?'Auto guess + manual correction':'Manual band calculation'}</h4></div>
          <div class="visualBadge">${manual.label}</div>
        </div>
        <section><h5>Hasil utama</h5>
          ${list([
            `Nilai resistor: <b>${prettyOhm(manual.value)}</b>`,
            `Toleransi: <b>± ${trimZero(manual.tolerance)}%</b>`,
            `Rentang aktual kira-kira: <b>${prettyOhm(rangeLow)}</b> sampai <b>${prettyOhm(rangeHigh)}</b>`
          ])}
        </section>
        <section><h5>Keterangan teknisi</h5>
          ${list([
            'Pembacaan warna dari foto bersifat estimasi. Gunakan mode manual untuk koreksi jika ada gelang yang salah terbaca.',
            'Estimasi watt fisik resistor tidak bisa dipastikan akurat hanya dari satu foto tanpa pembanding skala. Tambahkan foto di samping penggaris/koin/jari untuk estimasi ukuran body.',
            'Jika gelang terakhir terlalu samar, cek body resistor langsung dengan kaca pembesar atau multimeter.'
          ])}
        </section>
      </div>`;
    const txt = `Resistor Analyzer\nBand: ${manual.label}\nNilai: ${prettyOhm(manual.value)}\nToleransi: ±${trimZero(manual.tolerance)}%\nRentang: ${prettyOhm(rangeLow)} s/d ${prettyOhm(rangeHigh)}\nCatatan: Watt fisik resistor tidak bisa dipastikan hanya dari satu foto tanpa skala pembanding.`;
    setReport(html, txt);
  }

  function parseNameplate(text){
    const src = text.replace(/,/g,'.');
    const take = regex => src.match(regex)?.[1] || '';
    const takeWord = regex => src.match(regex)?.[0] || '';
    const voltage = take(/(\d+(?:\.\d+)?)\s*(?:v|volt)\b/i);
    const current = take(/(\d+(?:\.\d+)?)\s*(?:a|amp|amps)\b/i);
    const frequency = take(/(\d+(?:\.\d+)?)\s*hz\b/i);
    let powerRaw = takeWord(/(\d+(?:\.\d+)?)\s*(kw|w|hp)\b/i);
    const capacitor = takeWord(/(\d+(?:\.\d+)?)\s*(?:uf|μf|mfd)\b/i);
    const phase = /(?:^|\s)(3\s*ph|3phase|3-phase|3 phase)\b/i.test(src) ? '3-phase' : ((/(?:^|\s)(1\s*ph|single phase)\b/i.test(src)) ? '1-phase' : '');
    const refrigerant = takeWord(/\b(r32|r410a|r22|r290)\b/i).toUpperCase();

    let power = '';
    if(powerRaw){
      const m = powerRaw.match(/(\d+(?:\.\d+)?)\s*(kw|w|hp)/i);
      if(m){
        let val = parseFloat(m[1]);
        let unit = m[2].toLowerCase();
        if(unit==='kw') val *= 1000;
        if(unit==='hp') val *= 746;
        power = val.toFixed(0);
      }
    }
    let approx = '';
    if(!power && voltage && current){
      if(phase==='3-phase'){
        approx = `${trimZero(1.732*parseFloat(voltage)*parseFloat(current))} W (perkiraan kasar tanpa power factor)`;
      }else{
        approx = `${trimZero(parseFloat(voltage)*parseFloat(current))} W (perkiraan kasar)`;
      }
    }

    return {voltage,current,frequency,power,capacitor,phase,refrigerant,approx};
  }

  async function runOCR(){
    if(!state.file) throw new Error('Belum ada foto yang diunggah.');
    ocrBox.textContent = 'Membaca teks pada gambar... tunggu sebentar.';
    if(!window.Tesseract){
      throw new Error('Mesin OCR belum termuat. Pastikan koneksi internet tersedia saat pertama kali membuka halaman ini.');
    }
    const result = await window.Tesseract.recognize(state.file, 'eng', {
      logger: m=>{
        if(m.status){
          const prog = m.progress ? ` ${Math.round(m.progress*100)}%` : '';
          ocrBox.textContent = `${m.status}${prog}`;
        }
      }
    });
    state.ocrText = clean(result.data.text || '');
    ocrBox.textContent = state.ocrText || 'Teks OCR kosong / belum terbaca.';
    return state.ocrText;
  }

  function buildGeneralReport(extraText=''){
    const dom = dominantColorFromImage(preview);
    const hex = '#' + dom.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
    const bandGuess = state.imageLoaded ? detectResistorBandsFromImage(preview) : null;
    const ident = identifyFromClues(`${extraText} ${state.ocrText} ${note.value}`, category.value, bandGuess);
    const findings = [];
    findings.push(`File: <code>${esc(state.file?.name || '-')}</code>`);
    findings.push(`Tipe: <code>${esc(state.file?.type || '-')}</code>`);
    findings.push(`Warna dominan foto: <b>${hex}</b>`);
    if(ident.findings.length) ident.findings.forEach(x=>findings.push(x));
    const next = [
      'Tambahkan 1 foto close-up dan 1 foto keseluruhan untuk identifikasi lebih akurat.',
      'Jika ada nameplate / label / marking, jalankan mode Nameplate OCR.',
      'Jika objek berupa resistor axial, jalankan mode Resistor Analyzer untuk pembacaan gelang warna.'
    ];
    const html = `
      <div class="visualReport">
        <div class="visualHead">
          <div><span class="visualBadge">Identifikasi Visual</span><h4>${esc(ident.object)}</h4></div>
          <div class="visualBadge">Confidence: ${esc(ident.confidence)}</div>
        </div>
        <section><h5>Hasil identifikasi awal</h5>${list([
          `Domain paling dekat: <b>${esc(ident.domain)}</b>`,
          `Objek/komponen paling mungkin: <b>${esc(ident.object)}</b>`,
          `Tingkat keyakinan saat ini: <b>${esc(ident.confidence)}</b>`
        ])}</section>
        <section><h5>Clue yang terbaca</h5>${list(findings)}</section>
        <section><h5>Saran lanjutan</h5>${list(next)}</section>
      </div>`;
    const txt = `Identifikasi Visual\nObjek paling mungkin: ${ident.object}\nDomain: ${ident.domain}\nConfidence: ${ident.confidence}\nClue: ${ident.findings.join('; ')}\nSaran: Tambahkan foto close-up & keseluruhan; gunakan Nameplate OCR bila ada label; gunakan Resistor Analyzer bila objek resistor axial.`;
    setReport(html, txt);
  }

  function buildNameplateReport(text){
    const p = parseNameplate(text || '');
    const items = [];
    if(p.voltage) items.push(`Tegangan terbaca: <b>${esc(p.voltage)} V</b>`);
    if(p.current) items.push(`Arus terbaca: <b>${esc(p.current)} A</b>`);
    if(p.power) items.push(`Daya terbaca / terkonversi: <b>${trimZero(parseFloat(p.power))} W</b>`);
    if(p.frequency) items.push(`Frekuensi: <b>${esc(p.frequency)} Hz</b>`);
    if(p.phase) items.push(`Fasa: <b>${esc(p.phase)}</b>`);
    if(p.capacitor) items.push(`Kapasitor: <b>${esc(p.capacitor)}</b>`);
    if(p.refrigerant) items.push(`Refrigerant: <b>${esc(p.refrigerant)}</b>`);
    if(p.approx) items.push(`Perkiraan daya dari V × I: <b>${esc(p.approx)}</b>`);
    if(!items.length) items.push('Belum ada angka penting yang terbaca jelas. Coba foto lebih dekat, cahaya cukup, dan sudut lebih tegak lurus.');

    const warn = [
      'OCR pada pelat nama sangat dipengaruhi fokus, pantulan cahaya, dan sudut foto.',
      'Untuk motor / kompresor / AC, perhitungan daya dari V × I hanyalah pendekatan. Daya nyata dapat dipengaruhi power factor dan efisiensi.',
      'Gunakan data nameplate asli sebagai acuan utama instalasi, proteksi MCB, kabel, dan kapasitor.'
    ];

    const html = `
      <div class="visualReport">
        <div class="visualHead">
          <div><span class="visualBadge">Nameplate OCR</span><h4>Ekstraksi data dari foto</h4></div>
          <div class="visualBadge">${p.phase || 'phase unknown'}</div>
        </div>
        <section><h5>Data yang berhasil dibaca</h5>${list(items)}</section>
        <section><h5>Teks OCR</h5><div class="visualOcr">${esc(text || 'OCR kosong')}</div></section>
        <section><h5>Catatan teknis</h5>${list(warn)}</section>
      </div>`;
    const txt = `Nameplate OCR\n${items.map(x=>x.replace(/<[^>]+>/g,'')).join('\n')}\nOCR:\n${text || '-'}\nCatatan: OCR dipengaruhi fokus/cahaya/sudut; daya dari V×I hanya pendekatan.`;
    setReport(html, txt);
  }

  function buildDamageReport(){
    const type = category.value || 'general';
    const memo = clean(note.value || '');
    const base = {
      electrical:[
        'Matikan sumber listrik sebelum inspeksi lanjutan.',
        'Cek bekas gosong, perubahan warna, terminal longgar, bau hangus, dan rating nameplate.',
        'Jika ada panas berlebih, verifikasi arus kerja, ukuran kabel, dan proteksi.'
      ],
      hvac:[
        'Amati kotoran filter, icing, oil stain, kondensasi abnormal, dan bunyi tidak wajar.',
        'Cek indoor, outdoor, pipa, drain, kapasitor, dan nameplate kompresor/fan.',
        'Pastikan beban ruang, kebersihan coil, dan suplai listrik sesuai.'
      ],
      plumbing:[
        'Amati kebocoran, korosi, sambungan rembes, tekanan kecil, dan suara pompa.',
        'Cek head, debit, diameter pipa, valve, foot valve, dan filter.',
        'Jika ada pompa, foto nameplate pompa sangat membantu.'
      ],
      civil:[
        'Dokumentasikan lokasi retak/lepas/keropos serta panjang-lebar perkiraan.',
        'Tandai apakah retak aktif, ada rembesan, atau hanya finishing.',
        'Tambahkan foto pembanding jarak dekat dan jauh.'
      ],
      electronics:[
        'Periksa marking komponen, polaritas, warna gelang, dan jejak panas pada PCB.',
        'Jika objek resistor/kapasitor/relay, ambil foto close-up kedua sisi.',
        'Gunakan mode Resistor Analyzer atau Nameplate OCR bila relevan.'
      ],
      general:[
        'Foto close-up + foto keseluruhan biasanya menghasilkan analisis lebih baik.',
        'Tambahkan gejala yang dirasakan: tidak hidup, bocor, panas, trip, berisik, dll.',
        'Jika ada label/model/serial, jalankan mode OCR.'
      ]
    }[type] || [];

    const html = `
      <div class="visualReport">
        <div class="visualHead">
          <div><span class="visualBadge">Catatan Kerusakan / Intake</span><h4>Laporan awal untuk customer / teknisi</h4></div>
          <div class="visualBadge">${esc(type)}</div>
        </div>
        <section><h5>Ringkasan kasus</h5>
          <p>${memo ? esc(memo) : 'Belum ada catatan tambahan. Anda bisa mengetik keluhan singkat customer agar laporan awal lebih kontekstual.'}</p>
        </section>
        <section><h5>Poin inspeksi yang disarankan</h5>${list(base)}</section>
        <section><h5>Format tindak lanjut</h5>${list([
          'Objek / area yang difoto',
          'Gejala yang terlihat',
          'Kemungkinan penyebab awal',
          'Data yang masih diperlukan',
          'Rekomendasi pemeriksaan atau tindakan lanjutan'
        ])}</section>
      </div>`;
    const txt = `Catatan Kerusakan / Intake\nKategori: ${type}\nCatatan: ${memo || '-'}\nPoin inspeksi:\n- ${base.join('\n- ')}\nFormat tindak lanjut: objek, gejala, kemungkinan penyebab, data tambahan, rekomendasi.`;
    setReport(html, txt);
  }

  function loadFile(file){
    if(!file) return;
    if(state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    state.file = file;
    state.ocrText = '';
    ocrBox.textContent = 'Belum ada OCR.';
    state.imageUrl = URL.createObjectURL(file);
    preview.onload = ()=>{
      state.imageLoaded = true;
      placeholder.style.display = 'none';
      preview.style.display = 'block';
      fileName.textContent = file.name || '-';
      fileType.textContent = file.type || '-';
      fileSize.textContent = fmtBytes(file.size || 0);
      fileDim.textContent = `${preview.naturalWidth || preview.width} × ${preview.naturalHeight || preview.height}px`;
      buildGeneralReport('');
    };
    preview.src = state.imageUrl;
  }

  async function maybeOCRForGeneral(){
    let text = state.ocrText;
    if(!text && state.file){
      try{ text = await runOCR(); }catch(e){ text = ''; ocrBox.textContent = e.message; }
    }
    return text;
  }

  cameraInput.addEventListener('change', e=>loadFile(e.target.files?.[0]));
  galleryInput.addEventListener('change', e=>loadFile(e.target.files?.[0]));
  clearBtn.addEventListener('click', resetVisual);

  copyBtn.addEventListener('click', async ()=>{
    if(!state.lastReportText) return;
    try{
      await navigator.clipboard.writeText(state.lastReportText);
      copyBtn.textContent = 'Tersalin ✓';
      setTimeout(()=>copyBtn.textContent='Salin hasil', 1200);
    }catch(e){}
  });

  runGeneralBtn.addEventListener('click', async ()=>{
    if(!state.file){ setReport('<div class="empty">Unggah foto dulu bro.</div>'); return; }
    const text = await maybeOCRForGeneral();
    buildGeneralReport(text);
    if(window.TTITrack) window.TTITrack('calculate','Visual Assistant: General Identify');
  });

  runNameplateBtn.addEventListener('click', async ()=>{
    if(!state.file){ setReport('<div class="empty">Unggah foto nameplate / label dulu bro.</div>'); return; }
    try{
      const text = await runOCR();
      buildNameplateReport(text);
      if(window.TTITrack) window.TTITrack('calculate','Visual Assistant: Nameplate OCR');
    }catch(e){
      setReport(`<div class="empty">${esc(e.message)}</div>`, e.message);
    }
  });

  runDamageBtn.addEventListener('click', ()=>{
    if(!state.file){ setReport('<div class="empty">Unggah foto objek/kerusakan dulu bro.</div>'); return; }
    buildDamageReport();
    if(window.TTITrack) window.TTITrack('calculate','Visual Assistant: Damage Intake');
  });

  guessResistorBtn.addEventListener('click', ()=>{
    if(!state.file || !state.imageLoaded){ setReport('<div class="empty">Unggah foto resistor dulu bro.</div>'); return; }
    const guess = detectResistorBandsFromImage(preview);
    if(guess.bands?.length){
      if(guess.bands[0]) band1.value = guess.bands[0].name;
      if(guess.bands[1]) band2.value = guess.bands[1].name;
      if(guess.bands[2]) band3.value = guess.bands[2].name;
      if(guess.bands[3] && guess.bands[3].tolerance!==null) band4.value = guess.bands[3].name;
      resistorReport('photo');
    }else{
      setReport('<div class="empty">Auto guess belum menemukan gelang yang cukup jelas. Coba foto lebih dekat, cahaya cukup, dan posisikan resistor mendatar.</div>');
    }
  });

  applyManualBtn.addEventListener('click', ()=>resistorReport('manual'));
  runResistorBtn.addEventListener('click', ()=>{
    if(!state.file){ setReport('<div class="empty">Unggah foto resistor dulu bro.</div>'); return; }
    const guess = detectResistorBandsFromImage(preview);
    if(guess.bands?.length){
      if(guess.bands[0]) band1.value = guess.bands[0].name;
      if(guess.bands[1]) band2.value = guess.bands[1].name;
      if(guess.bands[2]) band3.value = guess.bands[2].name;
      if(guess.bands[3] && guess.bands[3].tolerance!==null) band4.value = guess.bands[3].name;
    }
    resistorReport('photo');
    if(window.TTITrack) window.TTITrack('calculate','Visual Assistant: Resistor Analyzer');
  });

  populateBands();
  window.TTIVisualBridge={
    getFile:()=>state.file,
    getNote:()=>note?.value||'',
    getCategory:()=>category?.value||'general',
    getOcrText:()=>state.ocrText||'',
    getPreview:()=>preview,
    reset:resetVisual
  };
  resetVisual();
})();