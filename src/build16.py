d='/tmp/claude-0/-home-claude/88e0b27b-13ad-5e75-9c47-6122477329c2/scratchpad/'
s=open(d+'kule-savunma-v15.html',encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep('<title>Kule Savunma 1.5</title>','<title>Kule Savunma 1.6</title>')
rep('Taslak 1.5 · Gerçek Hareket ve 30 FPS','Taslak 1.6 · 2D Piksel Stil')
rep("function pick(ramp, t, b) {\n  const n = ramp.length;\n  return ramp[clamp(Math.floor(t * (n - 1) + b), 0, n - 1)];","let CEL = false;                                                   // karakter çizerken: sert 2D piksel bantları (ışık-gölge geçişi dither'sız)\nfunction pick(ramp, t, b) {\n  const n = ramp.length;\n  return ramp[clamp(Math.floor(t * (n - 1) + (CEL ? b * 0.15 : b)), 0, n - 1)];")
rep("function addCorpse(kind, x, y, a, hit, kn, v) { state.corpses.push({ k: kind, x, y, a, hit, kn, v, t: 0 }); }",
"""function addCorpse(kind, x, y, a, hit, kn, v, arrow) {
  let dv = 0; if (kind === 'z' && arrow) { const r = Math.random(); if (r > 0.8) { dv = 2; hit = a + Math.PI; kn = 2.4; } else if (r > 0.55) { dv = 1; hit = a + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2; kn = 1; } }
  state.corpses.push({ k: kind, x, y, a, hit, kn, v, dv, t: 0 });
}""")
rep("z.kn || 3, z.v);","z.kn || 3, z.v, z.byArrow);")
rep("if (z.hp > 0) z.hr = 0.9;","z.byArrow = true; if (z.hp > 0) z.hr = 0.9;")
rep("o = { v: c.v, fd, tb };","o = { v: c.v, fd, tb, dv: c.dv };")
open(d+'kule-savunma-v16.html','w',encoding='utf-8').write(s)
