d='/tmp/claude-0/-home-claude/88e0b27b-13ad-5e75-9c47-6122477329c2/scratchpad/'
s=open(d+'kule-savunma-v10.html',encoding='utf-8').read()
rd=lambda n:open(d+'v5parts/'+n,encoding='utf-8').read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(a[:70],s.count(a)); s=s.replace(a,b)
def blk(a,b,new):
    global s
    i=s.index(a); j=s.index(b,i); s=s[:i]+new+s[j:]
rep('<title>Kule Savunma 1.0</title>','<title>Kule Savunma 1.2</title>')
rep('Taslak 1.0 · Karanlık Şövalye','Taslak 1.2 · Evrim Görünüşleri')
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
open(d+'kule-savunma-v12.html','w',encoding='utf-8').write(s)

s=open(d+'kule-savunma-v12.html',encoding='utf-8').read()
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
open(d+'kule-savunma-v12.html','w',encoding='utf-8').write(s)
