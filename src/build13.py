d='/tmp/claude-0/-home-claude/88e0b27b-13ad-5e75-9c47-6122477329c2/scratchpad/'
s=open(d+'kule-savunma-v10.html',encoding='utf-8').read()
rd=lambda n:open(d+'v5parts/'+n,encoding='utf-8').read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(a[:70],s.count(a)); s=s.replace(a,b)
def blk(a,b,new):
    global s
    i=s.index(a); j=s.index(b,i); s=s[:i]+new+s[j:]
rep('<title>Kule Savunma 1.0</title>','<title>Kule Savunma 1.3</title>')
rep('Taslak 1.0 · Karanlık Şövalye','Taslak 1.3 · Köylü Zombiler ve Ses')
# eski şövalye + sprite üretimi -> rig
blk("function makeKnight(d, f) {","const flameSpr =",rd('rig.js')+"\n")
blk("/* zombi: 3 renk varyantı","function dispAngle","")
SOLD='''function drawSoldier() {
  const S = state.sol, A = S.act, a = dispAngle(S);
  const sx = Math.round(fxp(S.x)), sy0 = Math.round(fyp(S.y)), sy = sy0 - Math.round(S.z * 7);
  if (S._px === undefined) { S._px = S.x; S._py = S.y; S.gp = 0; }
  const dd = Math.hypot(S.x - S._px, S.y - S._py) * Z; S._px = S.x; S._py = S.y;
  if (dd > 0 && dd < 30) S.gp = (S.gp + dd / RG.stepJog) % 1;
  shadowHi(F, sx, sy0, 8, 2.6, 0.32);
  let o;
  if (S.z > 0.02 || S.vz > 0) o = { m: 'jump', jp: S.vz > 4 ? 0 : S.vz > -4 ? 1 : 2 };
  else if (A) o = { m: 'att', kind: A.kind, t: A.t };
  else if (S.holding && S.holdT > 0.3 && !S.waveFired) o = { m: 'att', kind: null, c: clamp((S.holdT - 0.3) / (SOL.wave.hold - 0.3), 0, 1) };
  else if (S.moving) o = { m: 'move', ph: S.gp };
  else o = { m: 'idle', br: Math.floor(state.time * 1.6) % 4 };
  const spr = RG.knight(a, o), img = S.flash > 0 ? RG.flash(spr) : spr.c;
  F.drawImage(img, sx + spr.ox, sy + spr.oy, img.width / HR, img.height / HR);
  S._th = [sx + spr.th[0], sy + spr.th[1]];
}
'''
blk("function kHands(S, a) {","function drawSoldierFx()",SOLD)
rep("const a = dispAngle(S), H = kHands(S, a), sx = H.sx, jz = Math.round(S.z * 7), sy = Math.round(fyp(S.y)), fx = H.th[0], fy = H.th[1] - 10,",
    "const a = dispAngle(S), sx = Math.round(fxp(S.x)), jz = Math.round(S.z * 7), sy = Math.round(fyp(S.y)), th = S._th || [sx, sy - 40], fx = th[0], fy = th[1],")
ZD='''function drawZombie(z) {
  const a = z.ang === undefined ? Math.atan2(-z.y, -z.x) : z.ang;
  if (z._px === undefined) { z._px = z.x; z._py = z.y; z.gp = Math.random(); }
  const dd = Math.hypot(z.x - z._px, z.y - z._py) * Z; z._px = z.x; z._py = z.y;
  if (dd < 30) z.gp = (z.gp + dd / RG.stepZom) % 1;
  const o = z.biting ? { m: 'bite', v: z.v, br: Math.floor(z.phase / 2) & 1 } : dd > 0.02 ? { m: 'walk', v: z.v, ph: z.gp } : { m: 'idle', v: z.v };
  const spr = RG.zombie(a, o), img = z.flash > 0 ? RG.flash(spr) : spr.c;
  const sx = Math.round(z.sx), sy = Math.round(z.sy);
  let alpha = clamp((state.time - z.born) / 0.7, 0, 1), dy = 0;
  if (z.dead) { const f = clamp(z.dyingT / 0.4, 0, 1); alpha *= 1 - f; dy = Math.round(f * 8); }
  alpha *= z.vis === undefined ? 1 : z.vis; if (alpha <= 0.01) return;
  shadowHi(F, sx, sy, 9, 3, 0.3 * alpha);
  F.save(); F.globalAlpha = alpha;
  F.drawImage(img, sx + spr.ox, sy + dy + spr.oy, img.width / HR, img.height / HR);
  F.restore();
}
'''
blk("function drawZombie(z) {","function drawArrow(a)",ZD)
rep("drawWorld(); present(); updateHud();\n  requestAnimationFrame(frame);","drawWorld(); present(); updateHud(); if (!RG.done) RG.prewarm(4);\n  requestAnimationFrame(frame);")
open(d+'kule-savunma-v13.html','w',encoding='utf-8').write(s)

s=open(d+'kule-savunma-v13.html',encoding='utf-8').read()
a='<div class="hint" id="hint">'
assert s.count(a)==1
s=s.replace(a,'<div class="skinpick" id="skinpick" aria-label="Şövalye görünüşü"><span>Evre</span><button class="btn sm" type="button" data-st="1" aria-pressed="true">1</button><button class="btn sm" type="button" data-st="2" aria-pressed="false">2</button><button class="btn sm" type="button" data-st="3" aria-pressed="false">3</button><button class="btn sm" type="button" data-st="4" aria-pressed="false">4</button><button class="btn sm" type="button" data-st="5" aria-pressed="false">5</button></div>\n    '+a)
a='.hint { bottom: 12px; color: var(--steel); }'
assert s.count(a)==1
s=s.replace(a,a+"\n.skinpick { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: grid; gap: 8px; justify-items: center; background: var(--panel); border: 2px solid var(--line); box-shadow: 0 0 0 2px var(--edge); padding: 8px; font-size: 18px; color: var(--steel); }\n.skinpick .btn { font-size: 22px; box-shadow: 0 0 0 2px var(--edge), 0 3px 0 2px var(--edge); }")
a="requestAnimationFrame(frame);\n"
i=s.rindex(a)
s=s[:i]+"""document.querySelectorAll('#skinpick button').forEach(bt => bt.addEventListener('click', () => {
  RG.setStage(+bt.dataset.st);
  document.querySelectorAll('#skinpick button').forEach(x => x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'));
  bt.blur();
}));
"""+s[i:]
open(d+'kule-savunma-v13.html','w',encoding='utf-8').write(s)

s=open(d+'kule-savunma-v13.html',encoding='utf-8').read()
def rp2(a,b):
    global s
    assert s.count(a)==1,(a[:60],s.count(a)); s=s.replace(a,b)
# zombi türü: 5 görünüm, rastgele doğma aralığı (ortalama aynı)
rp2("v: (Math.random() * 3) | 0","v: (Math.random() * 5) | 0")
rp2("s.spawnTimer += ZB.spawnInterval; }","s.spawnTimer += ZB.spawnInterval * (0.3 + Math.random() * 1.4); }")
# ses
SFX='''/* ---------- ses: Web Audio ile üretilen okçu sesleri (kiriş germe, atış, isabet) ---------- */
const SFX = (() => {
  let ac = null, master = null, on = true, nb = null;
  const init = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
      nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  };
  const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
  const noise = (t, dur, type, f0, f1, peak, a) => {
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); env(g, t, a, peak, dur - a); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  };
  const tone = (t, type, f0, f1, dur, peak, a) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); env(g, t, a, peak, dur - a); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  };
  const ok = () => on && ac && ac.state === 'running';
  return {
    init,
    get on() { return on; }, toggle() { on = !on; return on; },
    draw() { if (!ok()) return; const t = ac.currentTime; noise(t, 0.5, 'bandpass', 260, 760, 0.16, 0.12); tone(t, 'sawtooth', 62, 105, 0.5, 0.05, 0.2); tone(t + 0.08, 'triangle', 420, 640, 0.35, 0.025, 0.2); },
    release() { if (!ok()) return; const t = ac.currentTime; tone(t, 'triangle', 210, 135, 0.3, 0.28, 0.004); tone(t, 'sine', 420, 250, 0.18, 0.1, 0.004); noise(t, 0.16, 'highpass', 1800, 3600, 0.12, 0.01); },
    hit() { if (!ok()) return; const t = ac.currentTime; tone(t, 'sine', 150, 48, 0.16, 0.45, 0.003); noise(t, 0.12, 'lowpass', 1400, 400, 0.32, 0.004); noise(t, 0.05, 'highpass', 2500, 2500, 0.1, 0.002); }
  };
})();
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => SFX.init(), { passive: true }));
'''
rp2("function fire(z) {",SFX+"function fire(z) {")
rp2("z.incoming += CF.damage; s.kick = 1;","z.incoming += CF.damage; s.kick = 1; s.drawSnd = false; SFX.release();")
rp2("  s.shootTimer += dt;\n","  s.shootTimer += dt;\n  if (target && !s.drawSnd && s.shootTimer >= CF.interval - 0.6) { s.drawSnd = true; SFX.draw(); }\n")
rp2("z.incoming -= CF.damage; z.flash = 0.12;","z.incoming -= CF.damage; z.flash = 0.12; SFX.hit();")
rp2('<button class="btn" id="pauseBtn" type="button">Duraklat</button>','<button class="btn" id="sfxBtn" type="button" aria-pressed="true">Ses</button>\n    <button class="btn" id="pauseBtn" type="button">Duraklat</button>')
rp2("pauseBtn.addEventListener('click', () => setPaused(!state.paused));","pauseBtn.addEventListener('click', () => setPaused(!state.paused));\n$('sfxBtn').addEventListener('click', e => { SFX.init(); e.currentTarget.setAttribute('aria-pressed', SFX.toggle() ? 'true' : 'false'); e.currentTarget.blur(); });")
open(d+'kule-savunma-v13.html','w',encoding='utf-8').write(s)
