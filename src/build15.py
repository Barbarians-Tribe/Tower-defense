d='/tmp/claude-0/-home-claude/88e0b27b-13ad-5e75-9c47-6122477329c2/scratchpad/'
s=open(d+'kule-savunma-v14.html',encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep('<title>Kule Savunma 1.4</title>','<title>Kule Savunma 1.5</title>')
rep('Taslak 1.4 · Sesler ve Ölüm Animasyonu','Taslak 1.5 · Gerçek Hareket ve 30 FPS')
# 30 fps
rep("function frame(ts) {\n  if (last === null) last = ts;\n  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;",
    "function frame(ts) {\n  requestAnimationFrame(frame);\n  if (last === null) last = ts;\n  if (ts - last < 29) return;                                       // oyun 30 FPS çalışır\n  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;")
rep("if (!RG.done) RG.prewarm(4);\n  requestAnimationFrame(frame);\n}","if (!RG.done) RG.prewarm(4);\n}")
# ok isabeti: ölmeyen vuruş = sendeleme, ölümcül = momentumla öne çökme
rep("z.hitAng = Math.atan2(z.y, z.x); z.kn = 1.6;","z.hitAng = (z.ang === undefined ? Math.atan2(-z.y, -z.x) : z.ang) + (Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) * Math.PI / 4 : 0); z.kn = 3.4; if (z.hp > 0) z.hr = 0.9;")
rep("ZB.speed * dt","ZB.speed * (z.hr > 0 ? 0.3 : 1) * dt",2)
rep("    z.flash = Math.max(0, z.flash - dt);\n","    z.flash = Math.max(0, z.flash - dt); z.hr = Math.max(0, (z.hr || 0) - dt);\n")
rep("const spr = RG.zombie(a, o), img = z.flash > 0","const spr = z.hr > 0 && !z.dead ? RG.zombieHit(a, { v: z.v, tb: [0.07, 0.17, 0.3, 0.5, 0.7].filter(x => 0.9 - z.hr > x).length }) : RG.zombie(a, o), img = z.flash > 0")
open(d+'kule-savunma-v15.html','w',encoding='utf-8').write(s)
