d='/tmp/claude-0/-home-claude/88e0b27b-13ad-5e75-9c47-6122477329c2/scratchpad/'
s=open(d+'kule-savunma-v13.html',encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
rep('<title>Kule Savunma 1.3</title>','<title>Kule Savunma 1.4</title>')
rep('Taslak 1.3 · Köylü Zombiler ve Ses','Taslak 1.4 · Sesler ve Ölüm Animasyonu')
import os
sfx=open(d+'v5parts/sfx.js',encoding='utf-8').read()
if os.path.exists(d+'v5parts/samples.js'): sfx=open(d+'v5parts/samples.js',encoding='utf-8').read()+'\n'+sfx
sfx=sfx.replace("chF = null;","chF = null, chOn = false;").replace("if (level === null) { if (chG) {","if (level === null) { if (chG && chOn) { chOn = false;").replace("chG.connect(send); chO.start(); }","chG.connect(send); chO.start(); }\n      chOn = true;")
assert 'chOn = true' in sfx and 'chOn = false;' in sfx
sfx+='''const surfAt = (x, y) => (Math.hypot(x, y) < 7.4 ? 'stone' : 'grass');
const spat = (x, y) => { const dx = x - cam.x, dy = y - cam.y, dd = Math.hypot(dx, dy); return [Math.pow(clamp(1 - dd / 34, 0, 1), 1.4), clamp(dx / 18, -1, 1)]; };
function addCorpse(kind, x, y, a, hit, kn, v) { state.corpses.push({ k: kind, x, y, a, hit, kn, v, t: 0 }); }
'''
i=s.index("/* ---------- ses: Web Audio ile üretilen okçu"); j=s.index("function fire(z) {")
s=s[:i]+sfx+s[j:]
rep("s.drawSnd = false; SFX.release();","s.drawSnd = false; { const q = spat(0, 0); SFX.release(Math.max(q[0], 0.7), q[1]); }")
rep("s.drawSnd = true; SFX.draw(); }","s.drawSnd = true; { const q = spat(0, 0); SFX.draw(Math.max(q[0], 0.7), q[1]); } }")
rep("z.incoming -= CF.damage; z.flash = 0.12; SFX.hit();","z.incoming -= CF.damage; z.flash = 0.12; z.hitAng = Math.atan2(z.y, z.x); z.kn = 1.6; { const q = spat(z.x, z.y); SFX.hit(Math.max(q[0], 0.5), q[1]); SFX.zHurt(q[0], q[1], z.v); }")
rep("z.hp -= SOL.damage; z.flash = 0.12;\n","z.hp -= SOL.damage; z.flash = 0.12; z.hitAng = Math.atan2(dy, dx); z.kn = 4; { const q = spat(z.x, z.y); SFX.slashHit(q[0], q[1]); SFX.zHurt(q[0], q[1], z.v, 'blade'); }\n")
rep("z.hp -= W.damage; z.flash = 0.15; z.x += fx * W.push; z.y += fy * W.push;","z.hp -= W.damage; z.flash = 0.15; z.x += fx * W.push; z.y += fy * W.push; z.hitAng = Math.atan2(fy, fx); z.kn = 9; { const q = spat(z.x, z.y); SFX.slashHit(q[0], q[1]); }")
rep("function waveHit(S) {","function waveHit(S) {\n  { const q = spat(S.x, S.y); SFX.waveRelease(q[0], q[1]); }")
rep("  S.act = { kind, t: 0, n: 0 };","  S.act = { kind, t: 0, n: 0 };\n  { const q = spat(S.x, S.y); if (kind === 'normal') SFX.swing(q[0], q[1], 0.1); else if (kind === 'spin') { SFX.swing(q[0], q[1], 0.05, 1); SFX.swing(q[0], q[1], 0.45, 1); } else SFX.swing(q[0], q[1], 0.12, 1); }")
rep("S.z === 0 && S.vz === 0) S.vz = SOL.jump;","S.z === 0 && S.vz === 0) { S.vz = SOL.jump; SFX.jump(1, 0); }")
rep("if (S.z <= 0) { S.z = 0; S.vz = 0; }","if (S.z <= 0) { S.z = 0; S.vz = 0; SFX.land(surfAt(S.x, S.y), 1, 0); }")
rep("function hurtSoldier() {\n  const S = state.sol; S.hp -= 1; S.flash = 0.12;","function hurtSoldier(zz) {\n  const S = state.sol; S.hp -= 1; S.flash = 0.12; if (zz) S.hitAng = Math.atan2(S.y - zz.y, S.x - zz.x); SFX.soldierHurt(1, 0);")
rep("S.dead = true; S.respawn = 4; S.act = null;","S.dead = true; S.respawn = 4; S.act = null; SFX.soldierDeath(1, 0); addCorpse('k', S.x, S.y, dispAngle(S), S.hitAng === undefined ? 0 : S.hitAng, 3, 0);")
rep("z.sbite = ZB.biteInterval; hurtSoldier(); }","z.sbite = ZB.biteInterval; hurtSoldier(z); { const q = spat(z.x, z.y); SFX.claw(Math.max(q[0], 0.9), q[1]); } }")
rep("s.hp -= ZB.biteDamage; s.towerFlash = 0.15;","s.hp -= ZB.biteDamage; s.towerFlash = 0.15; { const q = spat(0, 0); SFX.bite(q[0], q[1]); }")
rep("z.dead = true; s.coins += ZB.reward; s.kills += 1;","z.dead = true; s.coins += ZB.reward; s.kills += 1;\n  { const q = spat(z.x, z.y); SFX.zDeath(q[0], q[1], z.v); } addCorpse('z', z.x, z.y, z.ang === undefined ? Math.atan2(-z.y, -z.x) : z.ang, z.hitAng === undefined ? 0 : z.hitAng, z.kn || 3, z.v);")
rep("openRings: 0, zombies: [], arrows: []","openRings: 0, zombies: [], corpses: [], arrows: []")
rep("s.zombies = s.zombies.filter(z => !(z.dead && z.dyingT > 0.4));","""s.zombies = s.zombies.filter(z => !z.dead);
  for (const c of s.corpses) {
    c.t += dt;
    if (c.kn > 0.05) { c.x += Math.cos(c.hit) * c.kn * dt; c.y += Math.sin(c.hit) * c.kn * dt; c.kn *= Math.exp(-3.2 * dt); }
    if (!c.knee && c.t > 0.6) { c.knee = true; const q = spat(c.x, c.y); SFX.thud(q[0] * 0.5, q[1]); }
    if (!c.thud && c.t > 1.0) { c.thud = true; const q = spat(c.x, c.y); SFX.thud(q[0], q[1]); burst(fxp(c.x), fyp(c.y) - 4, 6, ['#6a5a48', '#4a4036'], 40, 0.4, 2); }
    if (c.t > 3.2 && c.t < 6.2) {
      const kk = (c.t - 3.2) / 3;
      if (Math.random() < dt * (3 + 8 * kk)) { const q = spat(c.x, c.y); SFX.squelch(q[0] * 0.8, q[1]); }
      if (Math.random() < dt * 6 * (1 - kk * 0.5)) s.parts.push({ x: fxp(c.x) + (Math.random() - 0.5) * 14, y: fyp(c.y) - 3, vx: (Math.random() - 0.5) * 6, vy: -6 - Math.random() * 6, g: -1.5, life: 1.2, max: 1.2, s: 2, c: Math.random() < 0.5 ? '#7a9a3c' : '#4e6a2a' });
    }
  }
  s.corpses = s.corpses.filter(c => c.t < 6.2);""")
rep("  soldierUpdate(dt);\n","""  soldierUpdate(dt);
  { let lv = S.dead ? 0 : 0.45; for (const L of LIGHTS) { const dd = Math.hypot(L.x - cam.x, L.y - cam.y); lv += 1 / (1 + dd * dd / 40); } SFX.ambient(Math.min(1, lv * 0.6), dt); }
  if (S.holding && S.holdT > 0.3 && !S.waveFired && !S.act && !S.dead) SFX.charge(clamp((S.holdT - 0.3) / (SOL.wave.hold - 0.3), 0, 1)); else SFX.charge(null);
""")
rep("    z.flash = Math.max(0, z.flash - dt);\n","    z.flash = Math.max(0, z.flash - dt);\n    z.gT = (z.gT === undefined ? 1 + Math.random() * 5 : z.gT) - dt; if (z.gT <= 0) { z.gT = 4 + Math.random() * 7; const q = spat(z.x, z.y); SFX.groan(q[0], q[1], z.v); }\n")
rep("if (dd > 0 && dd < 30) S.gp = (S.gp + dd / RG.stepJog) % 1;","if (dd > 0 && dd < 30) S.gp = (S.gp + dd / RG.stepJog) % 1;\n  { const hs = Math.floor(S.gp * 2); if (S._hs !== undefined && hs !== S._hs && S.moving && S.z === 0 && !A) { const q = spat(S.x, S.y); SFX.stepKnight(surfAt(S.x, S.y), Math.max(q[0], 0.9), q[1]); } S._hs = hs; }")
rep("if (dd < 30) z.gp = (z.gp + dd / RG.stepZom) % 1;","if (dd < 30) z.gp = (z.gp + dd / RG.stepZom) % 1;\n  if (dd > 0.02 && !z.biting) { const hs = Math.floor(z.gp * 2); if (z._hs !== undefined && hs !== z._hs) { const q = spat(z.x, z.y); SFX.stepZombie(surfAt(z.x, z.y), q[0], q[1]); } z._hs = hs; }")
CORPSE='''function drawCorpse(c) {
  const sx = Math.round(fxp(c.x)), sy = Math.round(fyp(c.y)), vis = clamp((lightAt(c.x, c.y) - 0.1) / 0.25, 0, 1);
  if (vis <= 0.02) return;
  const FALL = 1.2, REST = 3.2, END = 6.2, TBT = [0.08, 0.16, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.94, 1.03, 1.12], k = clamp((c.t - REST) / (END - REST), 0, 1);
  const fd = ((Math.round((c.hit - c.a) / (Math.PI / 4)) % 8) + 8) % 8, tb = TBT.filter(x => c.t > x).length, o = { v: c.v, fd, tb };
  const base = c.k === 'z' ? RG.zombieDead(c.a, o) : RG.knightDead(c.a, o);
  F.save(); F.globalAlpha = vis;
  // zemin: önce kan gölü, çürürken yeşil-siyah sümük
  if (c.t > 0.9) {
    const grow = Math.min(1, (c.t - 0.9) / 2.4), fade = k > 0.86 ? 1 - (k - 0.86) / 0.14 * 0.75 : 1, pr = (3 + 9 * grow + 7 * Math.sqrt(k)) * fade;
    const mix = (a, b) => Math.round(a + (b - a) * k), col = 'rgb(' + mix(58, 30) + ',' + mix(14, 40) + ',' + mix(22, 16) + ')';
    F.fillStyle = col; F.beginPath(); F.ellipse(sx + 1, sy + 1, pr, pr * 0.38, 0, 0, 6.283); F.fill();
    F.fillStyle = 'rgba(10,6,8,0.45)'; F.beginPath(); F.ellipse(sx + 1, sy + 1, pr * 0.62, pr * 0.24, 0, 0, 6.283); F.fill();
    if (k > 0.1) { F.fillStyle = 'rgba(150,170,70,0.75)'; for (let q = 0; q < 4; q++) { const bx = sx + Math.sin(c.t * 3 + q * 2.1) * pr * 0.6, by = sy + 1 + Math.cos(c.t * 2.3 + q) * pr * 0.2; F.fillRect(bx, by, 1.5, 1.5); } }
  }
  let img = base.c, ox = base.ox, oy = base.oy, w = img.width / HR, h = img.height / HR, sxk = 1, syk = 1, dy = 0, al = 1;
  if (k > 0) {
    const q = RG.rot(base, Math.min(9, Math.floor(k * 10))); img = q.c;
    const bl = Math.sin(clamp(k / 0.45, 0, 1) * Math.PI) * 0.13 * (k < 0.5 ? 1 : 0), pulse = k > 0.08 && k < 0.7 ? 0.018 * Math.sin(c.t * 17) : 0;
    sxk = 1 + bl + pulse; syk = (k < 0.5 ? 1 + bl * 1.4 : 1 - (k - 0.5) * 0.45) + pulse; dy = k > 0.5 ? (k - 0.5) * 6 : 0; al = k > 0.92 ? (1 - k) / 0.08 : 1;
  }
  F.globalAlpha = vis * al;
  F.drawImage(img, sx + ox * sxk, sy + dy + oy * syk + (h * (1 - syk)) * 0.0, w * sxk, h * syk);
  F.restore();
}
'''
rep("function drawArrow(a) {",CORPSE+"function drawArrow(a) {")
rep("  for (const z of s.zombies) { z.sx = fxp(z.x);","  for (const c of s.corpses) list.push({ t: 6, k: fyp(c.y) - 8, c });\n  for (const z of s.zombies) { z.sx = fxp(z.x);")
rep("    else if (it.t === 5) drawSoldier();","    else if (it.t === 6) drawCorpse(it.c);\n    else if (it.t === 5) drawSoldier();")
open(d+'kule-savunma-v14.html','w',encoding='utf-8').write(s)
