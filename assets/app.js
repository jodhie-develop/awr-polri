/* ============================================================
   AWR POLRI — POLDA KALIMANTAN TENGAH
   app.js — util auth (mock, query-string based, tanpa backend)
   ============================================================ */

// ---- Baca status auth dari URL (?auth=guest|member) ----
function getAuth(){
  const p = new URLSearchParams(window.location.search);
  const a = p.get('auth');
  return (a === 'member' || a === 'guest') ? a : null;
}

// ---- Tempel status auth ke semua link internal di halaman ----
function propagateAuth(){
  const auth = getAuth();
  if(!auth) return;
  document.querySelectorAll('a[href]').forEach(a=>{
    const href = a.getAttribute('href');
    if(!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    try{
      const url = new URL(href, window.location.href);
      if(url.origin !== window.location.origin) return;
      url.searchParams.set('auth', auth);
      a.setAttribute('href', url.pathname + '?' + url.searchParams.toString() + url.hash);
    }catch(e){/* ignore */}
  });
}

// ---- Render indikator status login di navbar ----
function renderAuthIndicator(){
  const el = document.getElementById('authIndicator');
  if(!el) return;
  const auth = getAuth();
  if(auth === 'member'){
    el.className = 'auth-indicator member';
    el.innerHTML = '<span class="dot"></span> Masuk sebagai Peserta Terdaftar';
  } else if(auth === 'guest'){
    el.className = 'auth-indicator guest';
    el.innerHTML = '<span class="dot"></span> Mode Tamu · fitur terbatas';
  } else {
    el.className = 'auth-indicator';
    el.innerHTML = '<span class="dot"></span> Belum Login';
  }

  const ctaWrap = document.getElementById('navCta');
  if(ctaWrap && auth){
    ctaWrap.innerHTML = auth === 'member'
      ? '<a class="btn gold" href="'+withAuth('index.html')+'">Dashboard Saya</a>'
      : '<a class="btn ghost" style="border-color:#f3f1e6; color:#f3f1e6;" href="'+withAuth('login.html')+'">Login</a><a class="btn gold" href="'+withAuth('signup.html')+'">Sign Up</a>';
  }
}

// ---- Bangun URL dengan auth ikut terbawa ----
function withAuth(href){
  const auth = getAuth();
  if(!auth) return href;
  const url = new URL(href, window.location.href);
  url.searchParams.set('auth', auth);
  return url.pathname + '?' + url.searchParams.toString();
}

// ---- Cek gating sebelum masuk fitur (Demo CAT / Kalkulator TKJ) ----
function gatedGo(targetPage, fiturLabel, jalur){
  const auth = getAuth();
  if(auth === 'member'){
    window.location.href = withAuth(targetPage + '?jalur=' + jalur);
  } else {
    const q = new URLSearchParams({fitur: fiturLabel, jalur: jalur, next: targetPage});
    if(auth) q.set('auth', auth);
    window.location.href = 'akses-ditolak.html?' + q.toString();
  }
}

// ---- Mock login / signup (tanpa backend) ----
function mockLogin(e){
  if(e) e.preventDefault();
  const next = new URLSearchParams(window.location.search).get('next') || 'index.html';
  window.location.href = next + (next.includes('?') ? '&' : '?') + 'auth=member';
}
function mockGuest(){
  const next = new URLSearchParams(window.location.search).get('next') || 'index.html';
  window.location.href = next + (next.includes('?') ? '&' : '?') + 'auth=guest';
}
function mockSignup(e){
  if(e) e.preventDefault();
  const next = new URLSearchParams(window.location.search).get('next') || 'index.html';
  window.location.href = next + (next.includes('?') ? '&' : '?') + 'auth=member&welcome=1';
}

// ---- Toggle kartu info (Alur/Persyaratan/Contoh Berkas/Video) ----
function toggleInfoCard(card){
  card.classList.toggle('open');
}

// ---- Chatbox AI (mock, sama seperti versi asli) ----
function toggleChat(){
  const p = document.getElementById('chatPanel');
  if(p) p.classList.toggle('open');
}
function sendChat(){
  const input = document.getElementById('chatInput');
  const body = document.getElementById('chatBody');
  if(!input || !body) return;
  const text = input.value.trim();
  if(!text) return;
  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.textContent = text;
  body.appendChild(userMsg);
  input.value = '';

  setTimeout(()=>{
    const botMsg = document.createElement('div');
    botMsg.className = 'msg bot';
    const lower = text.toLowerCase();
    if(lower.includes('syarat')){
      botMsg.textContent = 'Syarat umum meliputi WNI, sehat jasmani-rohani, dan tidak pernah menikah. Cek menu "Persyaratan Pendaftaran" pada jalur pilihanmu ya.';
    } else if(lower.includes('cat') || lower.includes('tes')){
      botMsg.textContent = 'Demo CAT Akademik tersedia di halaman tiap jalur — perlu Sign Up/Login dulu untuk mencobanya.';
    } else if(lower.includes('daftar') || lower.includes('animo') || lower.includes('sign up')){
      botMsg.textContent = 'Klik salah satu jalur (SIPSS/AKPOL/BINTARA/TAMTAMA) di beranda untuk mulai, lalu Sign Up untuk mengakses fitur lengkap.';
    } else {
      botMsg.textContent = 'Terima kasih, pertanyaanmu sudah dicatat. Tim panitia akan menindaklanjuti lewat WhatsApp yang terdaftar.';
    }
    body.appendChild(botMsg);
    body.scrollTop = body.scrollHeight;
  }, 500);
  body.scrollTop = body.scrollHeight;
}

// ---- Kalkulator TKJ (Tes Kesamaptaan Jasmani) ----
// Acuan pola perhitungan: Kalkulator Jasmani Polri T.A 2026 (tacticalinpolice.com)
const TKJ_STANDAR = {
  pria:   { lari: 3444, pullup: 17, pushup: 40, situp: 41, shuttle: 16.2, renang: 14 },
  wanita: { lari: 3095, pullup: 40, pushup: 50, situp: 40, shuttle: 17.6, renang: 20 }
};
const TKJ_NBL = 41;

function tkjNilaiMakinBesarMakinBaik(nilaiInput, target){
  if(isNaN(nilaiInput) || nilaiInput <= 0) return null;
  return Math.max(0, Math.min(100, (nilaiInput/target)*100));
}
function tkjNilaiMakinKecilMakinBaik(nilaiInput, target){
  if(isNaN(nilaiInput) || nilaiInput <= 0) return null;
  return Math.max(0, Math.min(100, (target/nilaiInput)*100));
}

function updateTkjPullupLabel(){
  const gender = document.getElementById('tkj-gender').value;
  const label = document.getElementById('tkj-pullup-label');
  if(label){
    label.textContent = gender === 'pria' ? 'Pull Up 1 Menit (kali)' : 'Chinning 1 Menit (kali)';
  }
}

function hitungTKJ(){
  const gender = document.getElementById('tkj-gender').value;
  const std = TKJ_STANDAR[gender];
  const pill = document.getElementById('tkj-pill');
  const nilaiBox = document.getElementById('tkj-nilai');
  const breakdown = document.getElementById('tkj-breakdown');

  const lari = parseFloat(document.getElementById('tkj-lari').value);
  const pullup = parseFloat(document.getElementById('tkj-pullup').value);
  const pushup = parseFloat(document.getElementById('tkj-pushup').value);
  const situp = parseFloat(document.getElementById('tkj-situp').value);
  const shuttle = parseFloat(document.getElementById('tkj-shuttle').value);
  const renang = parseFloat(document.getElementById('tkj-renang').value);

  const items = [
    { label: 'Lari 12 Menit', nilai: tkjNilaiMakinBesarMakinBaik(lari, std.lari) },
    { label: gender === 'pria' ? 'Pull Up' : 'Chinning', nilai: tkjNilaiMakinBesarMakinBaik(pullup, std.pullup) },
    { label: 'Push Up', nilai: tkjNilaiMakinBesarMakinBaik(pushup, std.pushup) },
    { label: 'Sit Up', nilai: tkjNilaiMakinBesarMakinBaik(situp, std.situp) },
    { label: 'Shuttle Run', nilai: tkjNilaiMakinKecilMakinBaik(shuttle, std.shuttle) },
    { label: 'Renang 25m', nilai: tkjNilaiMakinKecilMakinBaik(renang, std.renang) }
  ];

  const terisi = items.filter(it => it.nilai !== null);
  breakdown.innerHTML = '';

  if(terisi.length === 0){
    pill.textContent = 'Isi data dahulu';
    pill.className = 'pill warn';
    nilaiBox.textContent = '—';
    return;
  }

  terisi.forEach(it=>{
    const row = document.createElement('div');
    row.className = 'tkj-row';
    row.innerHTML = '<span class="tkj-item-label">'+it.label+'</span><span class="tkj-item-score'+(it.nilai < TKJ_NBL ? ' low' : '')+'">'+it.nilai.toFixed(1)+'</span>';
    breakdown.appendChild(row);
  });

  const nilaiAkhir = terisi.reduce((a,b)=>a+b.nilai,0) / terisi.length;
  nilaiBox.textContent = nilaiAkhir.toFixed(1);

  const adaDiBawahNBL = terisi.some(it => it.nilai < TKJ_NBL);

  if(adaDiBawahNBL){
    pill.textContent = 'Berpotensi TMS (di bawah NBL)';
    pill.className = 'pill bad';
  } else if(nilaiAkhir >= 81){
    pill.textContent = 'Baik Sekali';
    pill.className = 'pill ok';
  } else if(nilaiAkhir >= 71){
    pill.textContent = 'Baik';
    pill.className = 'pill ok';
  } else if(nilaiAkhir >= 61){
    pill.textContent = 'Cukup';
    pill.className = 'pill warn';
  } else {
    pill.textContent = 'Kurang';
    pill.className = 'pill warn';
  }
}

// ---- Video tabs (visual only) ----
function initVideoTabs(){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ---- Catat klik jalur sebagai "animo" (visual counter saja) ----
function catatAnimo(jalur){
  const el = document.getElementById('animoCounter');
  if(el){
    const cur = parseInt(el.dataset.count || '9200', 10);
    el.dataset.count = cur + 1;
    el.textContent = ((cur+1)/1000).toFixed(1) + 'K';
  }
}

// ---- Visitor counter tiny animation ----
function initVisitorCounter(){
  const elToday = document.getElementById('v-today');
  if(!elToday) return;
  let base = 2400;
  setInterval(()=>{
    base += Math.floor(Math.random()*3);
    elToday.innerHTML = (base/1000).toFixed(1) + '<small>K</small>';
  }, 4000);
}

// ---- Popup selamat datang BETAH (halaman utama, sekali per sesi) ----
function openBetahPopup(){
  const overlay = document.getElementById('betahOverlay');
  if(!overlay) return;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeBetahPopup(){
  const overlay = document.getElementById('betahOverlay');
  if(!overlay) return;
  overlay.classList.remove('show');
  document.body.style.overflow = '';
  try{ sessionStorage.setItem('betahPopupShown', '1'); }catch(e){}
}
function initBetahPopup(){
  const overlay = document.getElementById('betahOverlay');
  if(!overlay) return;
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeBetahPopup(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeBetahPopup(); });
  let already = false;
  try{ already = sessionStorage.getItem('betahPopupShown') === '1'; }catch(e){}
  if(!already) setTimeout(openBetahPopup, 500);
}

document.addEventListener('DOMContentLoaded', ()=>{
  propagateAuth();
  renderAuthIndicator();
  initVideoTabs();
  initVisitorCounter();
  initBetahPopup();
  const chatInput = document.getElementById('chatInput');
  if(chatInput) chatInput.addEventListener('keydown', e=>{ if(e.key === 'Enter') sendChat(); });
});
