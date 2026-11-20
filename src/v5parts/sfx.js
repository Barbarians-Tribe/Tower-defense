/* ---------- SES: Web Audio ile üretilen tüm sesler. Yankılı (gecikmeli geri besleme), yüzeye göre (çim/taş), mesafe ve yöne göre ---------- */
const SFX = (() => {
  let ac = null, master = null, send = null, nb = null, bb = null, on = true, fireG = null, chG = null, chO = null, chF = null;
  const last = {}, lim = (k, ms) => { const n = performance.now(); if (n - (last[k] || 0) < ms) return false; last[k] = n; return true; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const init = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.connect(ac.destination);
      master = ac.createGain(); master.gain.value = 0.95; master.connect(comp);
      send = ac.createGain(); send.gain.value = 0.22;                                           // yankı: tek parça evrişim (konvolüsyon) yankısı, metalik geri besleme yok
      const L = Math.floor(ac.sampleRate * 1.7), ir = ac.createBuffer(2, L, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const dd = ir.getChannelData(c); let lp = 0; for (let i = 0; i < L; i++) { const t = i / L, k = 0.55 - 0.5 * t; lp += (Math.random() * 2 - 1 - lp) * k; dd[i] = lp * Math.pow(1 - t, 3.2) * (i < 900 ? i / 900 : 1) * 1.6; } }
      const cv = ac.createConvolver(); cv.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.8; send.connect(cv); cv.connect(wet); wet.connect(master);
      nb = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate); let d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      bb = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate); d = bb.getChannelData(0); let y = 0; for (let i = 0; i < d.length; i++) { y = (y + (Math.random() * 2 - 1) * 0.06) / 1.02; d[i] = y * 9; }
      const fs = ac.createBufferSource(); fs.buffer = bb; fs.loop = true; const ff = ac.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 380; ff.Q.value = 0.5;
      fireG = ac.createGain(); fireG.gain.value = 0; fs.connect(ff); ff.connect(fireG); fireG.connect(master); fireG.connect(send); fs.start();
    } catch (e) { ac = null; }
  };
  /* GERÇEK KAYIT KATMANI: window.__SMP = {ad: [data-URI, ...]} varsa o ses sentezin yerine çalar (rastgele varyant + hafif perde farkı) */
  const SB = {}; let sbLoaded = false;
  const loadSamples = () => { if (sbLoaded || !window.__SMP) return; sbLoaded = true; Object.keys(window.__SMP).forEach(k => { SB[k] = []; window.__SMP[k].forEach(u => { try { const bin = atob(u.split(',')[1]), ab = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) ab[i] = bin.charCodeAt(i); ac.decodeAudioData(ab.buffer, b => SB[k].push(b), () => {}); } catch (e) {} }); }); };
  const playS = (name, vol, pan, dly, rate) => { const L = SB[name]; if (!L || !L.length || !ac || !on || ac.state !== 'running' || vol < 0.02) return false; const src = ac.createBufferSource(); src.buffer = L[Math.floor(Math.random() * L.length)]; src.playbackRate.value = (rate || 1) * rnd(0.95, 1.05); const g = route(vol, pan); src.connect(g); src.start(T() + (dly || 0)); return true; };
  const ok = () => on && ac && ac.state === 'running';
  const route = (vol, pan) => { const g = ac.createGain(); g.gain.value = vol; let n = g; if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); n = p; } n.connect(master); n.connect(send); return g; };
  const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
  const noise = (d, t, dur, type, f0, f1, peak, a) => {
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); f.Q.value = type === 'bandpass' ? 1.6 : 0.7;
    const g = ac.createGain(); env(g, t, a || 0.005, peak, dur - (a || 0.005)); s.connect(f); f.connect(g); g.connect(d); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  };
  const tone = (d, t, type, f0, f1, dur, peak, a, vib) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const g = ac.createGain(); env(g, t, a || 0.005, peak, dur - (a || 0.005)); o.connect(g); g.connect(d); o.start(t); o.stop(t + dur + 0.05);
  };
  /* insan sesi: testere dişi ses telleri + 3 paralel ünlü formantı (a/o/u/e) + nefes; kadın = daha tiz ses, daha kısa gırtlak */
  const V = { A: [730, 1090, 2440], O: [570, 840, 2410], U: [330, 820, 2200], E: [540, 1830, 2480], AE: [660, 1720, 2410] };
  const voice = (d, t, o) => {
    const fk = o.fem ? 1.75 : (o.k || 1), fs = o.fem ? 1.17 : 1, dur = o.dur, a = Math.min(o.att || 0.03, dur * 0.3);
    const src = ac.createOscillator(); src.type = 'sawtooth'; src.frequency.setValueAtTime(o.f0 * fk, t);
    if (o.fm) src.frequency.linearRampToValueAtTime(o.fm * fk, t + dur * (o.tm || 0.35));
    src.frequency.linearRampToValueAtTime(o.f1 * fk, t + dur);
    const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.rough ? rnd(30, 48) : rnd(5, 8); lg.gain.value = o.f0 * fk * (o.rough ? 0.03 : 0.012); l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + dur + 0.05);
    const out = ac.createGain(); env(out, t, a, o.peak, dur - a);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; out.connect(lp); lp.connect(d);
    const A = V[o.v], B = V[o.v2 || o.v];
    [[6, 5], [8, 3], [10, 1.4]].forEach((qg, i) => { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = qg[0]; b.frequency.setValueAtTime(A[i] * fs, t); b.frequency.linearRampToValueAtTime(B[i] * fs, t + dur); const gi = ac.createGain(); gi.gain.value = qg[1]; src.connect(b); b.connect(gi); gi.connect(out); });
    src.start(t); src.stop(t + dur + 0.05);
    noise(d, t, dur, 'bandpass', A[1] * fs, B[1] * fs, o.peak * (o.breath === undefined ? 0.3 : o.breath), a);
  };
  const inhale = (d, t, dur, peak) => noise(d, t, dur, 'bandpass', 1400, 2600, peak, dur * 0.7);
  const vt = (n) => (n === 1 || n === 3 ? { fem: true } : n === 2 ? { k: 0.82 } : n === 4 ? { k: 1.1 } : {});
  const T = () => ac.currentTime;
  const P = (vol, pan, fn, dly) => { if (!ok() || vol < 0.02) return; fn(route(vol, pan), T() + (dly || 0)); };
  /* yüzey ve zırh parçaları */
  const grass = (d, t, k) => { noise(d, t, 0.12, 'lowpass', 1100 * k, 420, 0.34, 0.008); noise(d, t + 0.01, 0.07, 'highpass', 3400, 5200, 0.09, 0.005); noise(d, t + 0.04, 0.16, 'bandpass', 700, 400, 0.1, 0.04); };
  const stone = (d, t, k) => { tone(d, t, 'triangle', 260 * k, 130, 0.07, 0.28, 0.002); noise(d, t, 0.06, 'bandpass', 2200, 1500, 0.24, 0.002); noise(d, t, 0.12, 'lowpass', 900, 300, 0.2, 0.003); };
  const surf = (d, t, s, k) => (s === 'stone' ? stone(d, t, k) : grass(d, t, k));
  /* zırh: ince çınlama yok; demir plaka şakırtısı = düşük-orta uyumsuz kısmi tonlar + halka zincir cızırtısı + ağır gövde */
  const armor = (d, t, amt) => {
    const b = rnd(300, 430);
    [1, 1.59, 2.31, 3.4].forEach((m, i) => tone(d, t + i * 0.006, 'triangle', b * m, b * m * 0.96, 0.05 + 0.025 / (i + 1), 0.085 * amt / (1 + i * 0.6), 0.001));
    noise(d, t, 0.1, 'bandpass', 2300, 1500, 0.1 * amt, 0.002); noise(d, t + 0.03, 0.12, 'bandpass', 3100, 2200, 0.05 * amt, 0.01);
    tone(d, t, 'sine', 150, 80, 0.07, 0.1 * amt, 0.003);
  };
  const API = {
    init, get on() { return on; }, toggle() { on = !on; if (!on && fireG) fireG.gain.value = 0; return on; },
    draw(v, p) { P(v, p, (d, t) => { noise(d, t, 0.7, 'bandpass', 220, 820, 0.4, 0.15); noise(d, t + 0.05, 0.5, 'bandpass', 1500, 2400, 0.06, 0.2); tone(d, t, 'sawtooth', 55, 98, 0.7, 0.12, 0.3); tone(d, t + 0.1, 'triangle', 330, 600, 0.5, 0.06, 0.3); tone(d, t + 0.62, 'sine', 90, 70, 0.12, 0.12, 0.01); }); },   // gıcırdayan yay + gerilen kiriş
    release(v, p) { P(v, p, (d, t) => { [[190, 1], [380, 0.55], [570, 0.3], [760, 0.15]].forEach(([f, a]) => tone(d, t, 'sine', f, f * 0.93, 0.3 + 0.2 / (a + 0.5), 0.5 * a, 0.002, [38, f * 0.012])); noise(d, t, 0.02, 'highpass', 2500, 2500, 0.4, 0.001); tone(d, t, 'sine', 110, 55, 0.1, 0.55, 0.002); noise(d, t + 0.03, 0.28, 'bandpass', 1200, 4200, 0.3, 0.05); }); },
    hit(v, p) { P(v, p, (d, t) => { tone(d, t, 'sine', 130, 42, 0.18, 0.8, 0.003); noise(d, t, 0.1, 'lowpass', 1300, 300, 0.55, 0.003); noise(d, t, 0.04, 'bandpass', 3000, 2000, 0.2, 0.001); tone(d, t + 0.02, 'triangle', 240, 210, 0.22, 0.14, 0.003, [46, 10]); }); },
    stepKnight(s, v, p) { if (!lim('sk', 60)) return; P(v, p, (d, t) => { surf(d, t, s, rnd(0.9, 1.1)); tone(d, t, 'sine', 90, 50, 0.14, 0.5, 0.003); armor(d, t + 0.01, 0.9); noise(d, t + 0.03, 0.25, 'bandpass', 2600, 1700, 0.05, 0.05); }); },
    stepZombie(s, v, p) { if (!lim('sz', 40)) return; P(v * 0.9, p, (d, t) => { noise(d, t, 0.16, 'lowpass', 560, 220, 0.4, 0.012); tone(d, t, 'sine', 72, 42, 0.13, 0.32, 0.004); if (s === 'grass') { noise(d, t + 0.02, 0.2, 'bandpass', 600, 350, 0.12, 0.05); noise(d, t + 0.01, 0.06, 'highpass', 3000, 4500, 0.04, 0.004); } else noise(d, t + 0.02, 0.1, 'bandpass', 1500, 900, 0.1, 0.02); }); },
    jump(v, p) { P(v, p, (d, t) => { noise(d, t, 0.2, 'bandpass', 400, 900, 0.14, 0.03); armor(d, t, 1.3); tone(d, t, 'sine', 140, 220, 0.1, 0.18, 0.01); voice(d, t + 0.02, { f0: 120, f1: 135, dur: 0.14, peak: 0.12, v: 'A', breath: 0.6 }); }); },
    land(s, v, p) { P(v, p, (d, t) => { tone(d, t, 'sine', 120, 42, 0.22, 0.8, 0.003); surf(d, t, s, 0.8); armor(d, t, 2); armor(d, t + 0.045, 1.2); }); },
    swing(v, p, dly, heavy) { P(v, p, (d, t) => { noise(d, t, heavy ? 0.3 : 0.2, 'bandpass', 450, 2800, heavy ? 0.45 : 0.34, 0.07); tone(d, t + 0.02, 'triangle', 880, 360, 0.18, 0.05, 0.03); armor(d, t, 0.5); }, dly); },
    slashHit(v, p) { P(v, p, (d, t) => { noise(d, t, 0.16, 'lowpass', 2000, 300, 0.4, 0.003); tone(d, t, 'sine', 170, 55, 0.13, 0.45, 0.003); noise(d, t, 0.05, 'highpass', 3000, 3000, 0.1, 0.002); }); },
    waveRelease(v, p) { P(v, p, (d, t) => { tone(d, t, 'sine', 100, 28, 0.7, 0.8, 0.005); noise(d, t, 0.6, 'lowpass', 900, 120, 0.5, 0.01); noise(d, t, 0.14, 'highpass', 1800, 5200, 0.25, 0.003); noise(d, t + 0.05, 0.4, 'bandpass', 300, 120, 0.3, 0.05); }); },
    charge(level) {                                                                                 // basılı tutarken yükselen uğultu (null: kapat)
      if (!ok()) return;
      if (level === null) { if (chG) { chG.gain.cancelScheduledValues(T()); chG.gain.setTargetAtTime(0.0001, T(), 0.05); } return; }
      if (!chO) { chO = ac.createOscillator(); chO.type = 'sawtooth'; chF = ac.createBiquadFilter(); chF.type = 'lowpass'; chF.frequency.value = 300; chG = ac.createGain(); chG.gain.value = 0.0001; chO.connect(chF); chF.connect(chG); chG.connect(master); chG.connect(send); chO.start(); }
      chO.frequency.setTargetAtTime(48 + level * 120, T(), 0.05); chF.frequency.setTargetAtTime(220 + level * 900, T(), 0.05); chG.gain.setTargetAtTime(0.025 + level * 0.07, T(), 0.05);
    },
    /* zombi acısı: gerçek insan sesi. Okla vurulunca nefes çekme + "agh!" çığlığı; kılıçta kısa boğuk "hugh!" */
    zHurt() {},                                                                                      // zombi sesleri kaldırıldı
    groan() {},                                                                                      // zombi sesleri kaldırıldı
    bite(v, p) { P(v, p, (d, t) => { noise(d, t, 0.07, 'bandpass', 900, 600, 0.3, 0.004); noise(d, t + 0.08, 0.1, 'bandpass', 700, 400, 0.3, 0.004); tone(d, t, 'sine', 120, 60, 0.12, 0.35, 0.003); tone(d, t + 0.08, 'sine', 100, 55, 0.12, 0.3, 0.003); }); },
    claw(v, p) { P(v, p, (d, t) => { noise(d, t, 0.2, 'bandpass', 3400, 1500, 0.34, 0.01); noise(d, t + 0.01, 0.17, 'bandpass', 5200, 2600, 0.14, 0.01); armor(d, t + 0.05, 2.6); armor(d, t + 0.13, 1.8); tone(d, t, 'sine', 100, 52, 0.15, 0.45, 0.003); noise(d, t, 0.06, 'lowpass', 600, 200, 0.4, 0.003); }); },
    zDeath() {},                                                                                      // zombi sesleri kaldırıldı
    thud(v, p, dly) { P(v, p, (d, t) => { tone(d, t, 'sine', 100, 34, 0.26, 0.5, 0.003); noise(d, t, 0.2, 'lowpass', 800, 160, 0.3, 0.004); }, dly); },
    squelch(v, p) { if (!lim('sq', 70)) return; P(v, p, (d, t) => { const f = rnd(180, 420); tone(d, t, 'sine', f, f * 0.45, 0.09, 0.16, 0.004); noise(d, t, 0.1, 'bandpass', 1200, 500, 0.12, 0.01); }); },
    soldierHurt(v, p) { P(v, p, (d, t) => { voice(d, t + 0.02, { f0: rnd(110, 130), fm: 150, f1: 100, dur: 0.24, peak: 0.34, v: 'O', v2: 'A', rough: 1, breath: 0.5 }); tone(d, t, 'sine', 110, 55, 0.14, 0.3, 0.003); }); },
    soldierDeath(v, p) { P(v, p, (d, t) => { voice(d, t, { f0: 125, fm: 175, f1: 60, dur: 1, peak: 0.32, v: 'A', v2: 'O', rough: 1, breath: 0.5 }); armor(d, t + 0.45, 2.6); armor(d, t + 0.62, 2); armor(d, t + 0.78, 1.5); tone(d, t + 0.8, 'sine', 100, 30, 0.35, 0.8, 0.003); noise(d, t + 0.8, 0.3, 'lowpass', 1000, 150, 0.5, 0.004); }); },
    ambient(level, dt) {                                                                            // meşale: çok kısık yumuşak alev + doğal çıtırtılar
      if (!ok() || !fireG) return;
      fireG.gain.setTargetAtTime(0.002 + 0.013 * level, T(), 0.3);
      if (Math.random() < dt * (1.2 + 7 * level)) P(0.12 + 0.35 * level, rnd(-0.5, 0.5), (d, t) => { noise(d, t, rnd(0.006, 0.02), 'bandpass', rnd(1800, 4200), 2400, rnd(0.05, 0.2), 0.001); if (Math.random() < 0.35) noise(d, t + 0.012, rnd(0.015, 0.04), 'bandpass', rnd(900, 1800), 700, 0.06, 0.002); });
      if (Math.random() < dt * (0.35 + 1.2 * level)) P(0.1 + 0.25 * level, rnd(-0.4, 0.4), (d, t) => noise(d, t, rnd(0.14, 0.3), 'lowpass', 520, 260, 0.14, 0.06));
    }
  };
  const nm = {   // işlev -> örnek adı (argümanlardan): [ad, vol indeksi]
    draw: () => 'draw', release: () => 'release', hit: () => 'hit', jump: () => 'jump', swing: (a) => a[3] ? 'swingHeavy' : 'swing', slashHit: () => 'slashHit', waveRelease: () => 'waveRelease',
    stepKnight: (a) => 'stepKnight_' + a[0], stepZombie: (a) => 'stepZombie_' + a[0], land: (a) => 'land_' + a[0],
    zHurt: (a) => (a[3] === 'blade' ? 'zHurtBlade' : 'zHurt') + (a[2] === 1 || a[2] === 3 ? '_f' : '_m'), groan: (a) => 'groan' + (a[2] === 1 || a[2] === 3 ? '_f' : '_m'), zDeath: (a) => 'zDeath' + (a[2] === 1 || a[2] === 3 ? '_f' : '_m'),
    claw: () => 'claw', bite: () => 'bite', thud: () => 'thud', squelch: () => 'squelch', soldierHurt: () => 'soldierHurt', soldierDeath: () => 'soldierDeath'
  }, surfFns = { stepKnight: 1, stepZombie: 1, land: 1 };
  Object.keys(nm).forEach(k => { const f = API[k]; API[k] = function () { loadSamples(); const a = [].slice.call(arguments), o = surfFns[k] ? 1 : 0, vol = a[o] === undefined ? 1 : a[o], pan = a[o + 1], dly = k === 'swing' || k === 'thud' ? a[o + 2] : (k === 'zDeath' ? 0.22 : 0); if (playS(nm[k](a), vol, pan, dly)) return; return f.apply(this, arguments); }; });
  const amb0 = API.ambient; let fireSrc = null, fireGain = null;
  API.ambient = function (level, dt) { loadSamples(); if (ok() && SB.fireLoop && SB.fireLoop.length) { if (!fireSrc) { fireSrc = ac.createBufferSource(); fireSrc.buffer = SB.fireLoop[0]; fireSrc.loop = true; fireGain = ac.createGain(); fireGain.gain.value = 0; fireSrc.connect(fireGain); fireGain.connect(master); fireSrc.start(); } fireGain.gain.setTargetAtTime(0.03 + 0.25 * level, T(), 0.3); if (fireG) fireG.gain.value = 0; return; } return amb0.call(this, level, dt); };
  return API;
})();
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => SFX.init(), { passive: true }));
