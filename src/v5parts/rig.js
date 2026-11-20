/* =====================================================================
   v1.1: İSKELET (RIG). Tüm insansı karakterler (şövalye, zombiler) aynı anatomik iskeletten çizilir.
   Kemik boyları boy (H) oranlarından (Drillis-Contini), eklem hareketleri insan eklem açı aralıklarından alınır.
   Her kare: iskelet pozu -> 3B ilkel şekiller (elipsoid, kapsül, kumaş) -> z-tamponlu piksel çizimi -> önbellekli sprite.
   Gövde koordinatı: [r sağ, f ileri, u yukarı] (birim = ekran pikseli, 1 m = 6 birim x zoom değil; karakter boyu H = 40 birim).
   ===================================================================== */
const RG = (() => {
  const PI = Math.PI, DEG = PI / 180, TL = TILT;
  const SW = 76, SH = 92, OX = 38, OY = 76, PW = SW * HR, PH = SH * HR;       // sprite tuvali (birim) ve ayak noktası
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mad = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const lerp = (a, b, t) => a + (b - a) * t, sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const loc = (F, v) => add(add(mul(F.r, v[0]), mul(F.f, v[1])), mul(F.u, v[2]));          // yerel -> gövde

  /* ---------- insan ölçüleri: boy H'nin oranları (Drillis-Contini) ---------- */
  function body(H) {
    return { H, hipH: 0.530 * H, hw: 0.055 * H, thigh: 0.245 * H, shank: 0.246 * H, ank: 0.039 * H, foot: 0.152 * H,
      trunk: 0.288 * H, sw: 0.125 * H, ua: 0.186 * H, fa: 0.146 * H, hand: 0.108 * H, neck: 0.06 * H, head: 0.095 * H };
  }
  /* yön çerçevesi: önce yan yatma (roll), sonra öne eğilme (pitch), sonra dönme (yaw) */
  function frame(yaw, pitch, roll) {
    const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch), sr = Math.sin(roll), cr = Math.cos(roll);
    const rot = v => {
      let r = v[0] * cr + v[2] * sr, f = v[1], u = -v[0] * sr + v[2] * cr;
      const f2 = f * cp + u * sp, u2 = -f * sp + u * cp; f = f2; u = u2;
      return [r * cy - f * sy, r * sy + f * cy, u];
    };
    return { r: rot([1, 0, 0]), f: rot([0, 1, 0]), u: rot([0, 0, 1]) };
  }
  function bend(U, F0, e) {                                                                // dirsek/diz bükülmesi
    let n = cross(U, F0); if (len(n) < 1e-4) n = [1, 0, 0]; n = nrm(n);
    return add(mul(U, Math.cos(e)), mul(cross(n, U), Math.sin(e)));
  }
  function ik(Hp, T, L1, L2, pole) {                                                       // 2 kemikli ters kinematik
    const v = sub(T, Hp), d = len(v) || 1, dir = mul(v, 1 / d), dc = clamp(d, Math.abs(L1 - L2) + 0.3, L1 + L2 - 0.04);
    const a = (L1 * L1 - L2 * L2 + dc * dc) / (2 * dc), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const pp = nrm(sub(pole, mul(dir, dot(pole, dir))));
    return { K: add(add(Hp, mul(dir, a)), mul(pp, h)), A: add(Hp, mul(dir, dc)) };
  }
  function armFK(Fc, S, side, flex, abd, elb, B) {                                       // omuz: öne/yana, dirsek: 0-145°
    abd *= DEG; flex *= DEG; elb = clamp(elb, 0, 148) * DEG;
    let v = [side * Math.sin(abd), 0, -Math.cos(abd)];
    v = [v[0], v[1] * Math.cos(-flex) + v[2] * Math.sin(-flex), -v[1] * Math.sin(-flex) + v[2] * Math.cos(-flex)];
    const U = loc(Fc, v), E = mad(S, U, B.ua), Fa = bend(U, Fc.f, elb), Wr = mad(E, Fa, B.fa);
    return { E, W: Wr, Fa, U, hand: mad(Wr, Fa, B.hand * 0.32) };
  }

  /* ---------- yürüyüş / koşu parametreleri ---------- */
  const G_WALK = { duty: 0.62, reach: 8, lift: 3.2, hip: 20.2, bob: 1.0, sign: 1, pyaw: 4, cyaw: 5, roll: 2.5, sway: 1.1, lean: 3, push: 28, kn: 0 };
  const G_JOG = { duty: 0.40, reach: 7.4, lift: 5, hip: 20.1, bob: 1.5, sign: -1, pyaw: 8, cyaw: 12, roll: 4, sway: 1.0, lean: 11, push: 38, kn: 0 };
  const stepOf = G => 2 * G.reach / G.duty;                                              // bir tam döngünün (2 adım) yere göre mesafesi

  /* poz: p = { pu, pr, pf, py, pp, pro, c:{y,p,r}, h:{y,p,r}, leg:[sağ,sol], arm:[sağ,sol] } */
  function pose(B, p) {
    const P = [p.pr || 0, p.pf || 0, p.pu], Fp = frame(p.py || 0, p.pp || 0, p.pro || 0), Fc = frame(p.c.y, p.c.p, p.c.r);
    const sp = p.sp === undefined ? 1 : p.sp, Q = {};
    Q.P = P; Q.Fp = Fp; Q.Fc = Fc; Q.B = B;
    Q.hip = [mad(P, Fp.r, B.hw), mad(P, Fp.r, -B.hw)];
    Q.N = mad(P, Fc.u, B.trunk + B.neck * 0.2);
    Q.sho = [mad(mad(P, Fc.u, B.trunk * 0.96), Fc.r, B.sw), mad(mad(P, Fc.u, B.trunk * 0.96), Fc.r, -B.sw)];
    for (let i = 0; i < 2; i++) { const fx = clamp(p.arm[i].flex, 0, 150) / 150; Q.sho[i] = mad(mad(Q.sho[i], Fc.u, fx * 1.5), Fc.f, fx * 0.8); }
    const Fh = frame(p.h.y, p.h.p, p.h.r); Q.Fh = Fh; Q.Hc = mad(mad(Q.N, Fc.u, B.neck * 0.5), Fh.u, B.head * 0.5);
    Q.leg = [0, 1].map(i => {
      const side = i ? -1 : 1, L = p.leg[i], Hp = Q.hip[i];
      let K, A, fd;
      if (L.fk) {
        const thd = loc(frame(0, 0, 0), [side * Math.sin(L.abd * DEG), Math.sin(L.flex * DEG) * Math.cos(L.abd * DEG), -Math.cos(L.flex * DEG) * Math.cos(L.abd * DEG)]);
        const shd = bend(nrm(thd), [0, 1, 0], -L.knee * DEG);
        K = mad(Hp, nrm(thd), B.thigh); A = mad(K, shd, B.shank);
      } else { const r = ik(Hp, L.t, B.thigh, B.shank, [side * 0.18, 1, 0]); K = r.K; A = r.A; }
      const P2 = (L.pitch || 0) * DEG, to = (L.toe === undefined ? 8 : L.toe) * DEG;
      fd = [side * Math.sin(to) * Math.cos(P2), Math.cos(to) * Math.cos(P2), -Math.sin(P2)];
      return { Hp, K, A, fd };
    });
    Q.arm = [0, 1].map(i => { const a = p.arm[i]; return armFK(Fc, Q.sho[i], i ? -1 : 1, a.flex, a.abd, a.elb, B); });
    return Q;
  }

  /* ---------- poz üreticileri ---------- */
  function baseP(B) { return { pu: B.hipH, c: { y: 0, p: 0, r: 0 }, h: { y: 0, p: 0, r: 0 }, leg: [], arm: [] }; }
  function footPitch(lp, duty, push) {
    if (lp < duty) { const q = lp / duty; return q < 0.12 ? -9 * (1 - q / 0.12) : q < 0.55 ? 0 : push * Math.pow((q - 0.55) / 0.45, 1.6); }
    const qs = (lp - duty) / (1 - duty); return qs < 0.4 ? lerp(push, -2, sm(qs / 0.4)) : lerp(-2, -11, sm((qs - 0.4) / 0.6));
  }
  function legGait(B, G, lp, side, lim) {
    lim = lim || {}; const reach = G.reach * (lim.reach || 1), lift = G.lift * (lim.lift || 1);
    let f, u = B.ank, pitch = footPitch(lp, G.duty, G.push + (lim.push || 0));
    if (lp < G.duty) { f = reach * (1 - 2 * lp / G.duty); const P2 = Math.max(0, pitch) * DEG; f -= 4.6 * (1 - Math.cos(P2)); u += 4.6 * Math.sin(P2) * 0.85; }
    else { const qs = (lp - G.duty) / (1 - G.duty); f = -reach + 2 * reach * (0.5 - 0.5 * Math.cos(PI * Math.min(1, qs * 1.04))); u += lift * Math.sin(PI * Math.pow(qs, 0.8)); }
    const gauge = B.hw + (G.sign < 0 ? 0.2 : 0.7);
    return { t: [side * gauge, f, u], pitch: pitch + (lim.drag ? lim.drag * (lp >= G.duty ? 1 : 0) : 0), toe: lim.toe };
  }
  function gaitP(B, G, ph, A, o) {
    o = o || {}; const p = baseP(B), tw = 2 * PI * ph, cp = Math.cos(tw), sn = Math.sin(tw);
    p.pu = G.hip * (B.H / 40) + o.dip + G.sign * G.bob * (Math.cos(4 * PI * (ph - G.duty / 2)) - 1) / 2;
    p.pr = G.sway * sn; p.py = G.pyaw * cp * DEG; p.pro = G.roll * sn * DEG;
    p.c = { y: -G.cyaw * cp * DEG, p: (o.lean === undefined ? G.lean : o.lean) * DEG, r: -0.6 * G.roll * sn * DEG + (o.croll || 0) * DEG };
    p.h = { y: -p.c.y * 0.8, p: -(p.c.p) * (o.hcomp === undefined ? 0.7 : o.hcomp) + (o.hp || 0) * DEG, r: -p.c.r * 0.8 + (o.hr || 0) * DEG };
    p.leg = [legGait(B, G, ph % 1, 1, o.limp === 0 ? o.lim : null), legGait(B, G, (ph + 0.5) % 1, -1, o.limp === 1 ? o.lim : null)];
    const aR = A.r, aL = A.l;
    p.arm = [{ flex: aR.flex - aR.amp * cp, abd: aR.abd, elb: aR.elb - (aR.eamp || 0) * cp }, { flex: aL.flex + aL.amp * cp, abd: aL.abd, elb: aL.elb + (aL.eamp || 0) * cp }];
    return p;
  }
  const KN_ARMS = { r: { flex: 18, abd: 8, elb: 36, amp: 20, eamp: 8 }, l: { flex: 38, abd: 20, elb: 84, amp: 9, eamp: 5 } };
  const KN_BL = { th: 34, psi: 2 };
  function idleP(B, br, A) {
    const p = baseP(B), b = [0, 0.3, 0.5, 0.25][br] || 0;
    p.pu = B.hipH - 0.6 + b * 0.4; p.pr = 0; p.py = 3 * DEG; p.pro = 0;
    p.c = { y: -3 * DEG, p: 3 * DEG + b * 0.01, r: 0 }; p.h = { y: 2 * DEG, p: -2 * DEG, r: 0 };
    const gx = B.hw + 1.4;
    p.leg = [{ t: [gx, -0.8, B.ank], pitch: 0, toe: 12 }, { t: [-gx, 1.2, B.ank], pitch: 0, toe: 12 }];
    p.arm = [{ flex: A.r.flex + b, abd: A.r.abd, elb: A.r.elb }, { flex: A.l.flex + b, abd: A.l.abd, elb: A.l.elb }];
    return p;
  }
  function jumpP(B, jp, A) {
    const p = baseP(B); p.pu = B.hipH - 1 - jp * 0.3; p.pr = 0; p.py = 0;
    const pr = [[42, 68], [60, 95], [22, 26]][jp], pl = [[68, 98], [84, 118], [18, 16]][jp];
    p.leg = [{ fk: 1, flex: pr[0], abd: 3, knee: pr[1], pitch: jp === 2 ? 22 : 34 }, { fk: 1, flex: pl[0], abd: -3, knee: pl[1], pitch: jp === 2 ? 22 : 45 }];
    p.c = { y: 0, p: (jp === 2 ? 4 : 8) * DEG, r: 0 }; p.h = { y: 0, p: -4 * DEG, r: 0 };
    p.arm = A.jump[jp];
    return p;
  }
  /* ok yarası tepkisi (12 kare): darbe sarsıntısı -> yarayı tutup sendeleme -> dizler çöker -> dizüstü -> devrilme -> yere serilme */
  const DT = {
    drop: [0, .02, .05, .1, .2, .32, .42, .44, .36, .26, .16, .1], th: [0, 0, 2, 5, 10, 18, 28, 42, 60, 76, 87, 90],
    hf: [8, 10, 14, 22, 34, 40, 30, 18, 12, 14, 18, 22], kn: [14, 18, 28, 48, 78, 110, 135, 150, 130, 100, 70, 45],
    hf2: [4, 6, 8, 14, 22, 26, 20, 10, 8, 12, 16, 20], kn2: [8, 12, 20, 36, 60, 95, 125, 145, 125, 95, 65, 40],
    rf: [30, 75, 100, 90, 80, 70, 60, 50, 70, 95, 115, 125], ra: [8, 35, 55, 45, 30, 20, 20, 25, 40, 55, 58, 58], re: [40, 25, 35, 70, 95, 110, 100, 70, 45, 35, 32, 32],
    lf: [40, 60, 85, 80, 70, 60, 55, 50, 65, 85, 95, 92], la: [10, 45, 65, 55, 45, 35, 30, 40, 55, 65, 72, 72], le: [80, 40, 30, 40, 60, 80, 70, 55, 45, 40, 38, 38],
    cp: [0, -.28, -.32, -.2, .05, .2, .28, .3, .2, .1, .05, 0], hp: [0, -.35, -.4, -.25, -.05, .15, .2, .2, .1, 0, -.1, -.2]
  };
  /* ölüm çeşitleri: 0 öne çökme, 1 diz çöküp yana yıkılma (kalp krizi referansı), 2 geriye savrulup düşme */
  const DTV = [DT,
    Object.assign({}, DT, { drop: [0, .03, .08, .16, .3, .42, .46, .46, .44, .36, .22, .1], th: [0, 0, 1, 2, 3, 4, 6, 10, 26, 56, 84, 90], cp: [0, -.1, .1, .3, .45, .5, .5, .45, .4, .3, .15, 0], hp: [0, -.15, .2, .4, .5, .5, .45, .4, .3, .1, -.1, -.2], hf: [8, 12, 20, 18, 12, 8, 6, 6, 10, 16, 22, 26], kn: [14, 24, 60, 100, 130, 148, 152, 152, 140, 100, 64, 42], rf: [30, 50, 70, 60, 55, 70, 85, 85, 80, 90, 105, 120], re: [40, 60, 90, 70, 40, 20, 14, 14, 20, 30, 34, 34] }),
    Object.assign({}, DT, { drop: [0, .02, .04, .06, .08, .1, .12, .12, .1, .1, .1, .1], th: [0, 4, 10, 20, 32, 46, 58, 68, 78, 85, 89, 90], cp: [0, -.3, -.45, -.5, -.45, -.4, -.3, -.2, -.1, 0, 0, 0], hp: [0, -.4, -.6, -.6, -.5, -.4, -.3, -.2, -.1, -.1, -.2, -.2], hf: [8, 14, 22, 28, 30, 28, 24, 22, 20, 20, 22, 22], kn: [14, 20, 30, 36, 34, 30, 28, 32, 36, 40, 42, 45], rf: [30, 90, 125, 140, 140, 130, 125, 125, 125, 125, 125, 125], ra: [8, 50, 80, 90, 80, 70, 60, 58, 58, 58, 58, 58], lf: [40, 90, 120, 130, 125, 115, 100, 92, 92, 92, 92, 92] })];
  function deadP(B, o) {
    const T = DTV[o.dv | 0] || DT, tb = Math.max(0, Math.min(11, o.tb)), cf = Math.cos(o.fd * PI / 4), sf = Math.sin(o.fd * PI / 4), tt = tb / 11, p = baseP(B);
    p.pu = B.hipH * (1 - T.drop[tb]); p.pr = 0; p.pf = 0; p.py = 0.25 * tt * sf;
    const cp = tb <= 3 || o.dv ? T.cp[tb] : T.cp[tb] * (0.4 + 0.6 * Math.max(0, cf));
    p.c = { y: 0.25 * tt * sf, p: cp, r: 0.25 * tt * sf }; p.h = { y: 0.3 * tt * sf, p: T.hp[tb], r: 0.3 * tt * sf };
    p.leg = [{ fk: 1, flex: T.hf[tb], abd: lerp(3, 14, tt), knee: T.kn[tb], pitch: 22 * tt }, { fk: 1, flex: T.hf2[tb], abd: lerp(-3, -20, tt), knee: T.kn2[tb], pitch: 8 * tt }];
    p.arm = [{ flex: T.rf[tb], abd: T.ra[tb], elb: T.re[tb] }, { flex: T.lf[tb], abd: T.la[tb], elb: T.le[tb] }];
    return p;
  }
  /* ölmeyen ok isabeti: darbe sarsıntısı -> gövde öne kırılır, dizler bükülür, baş düşer -> kambur toparlanma (6 kare) */
  const HT = { drop: [.02, .07, .11, .11, .08, .04], cp: [-.15, .5, .85, .8, .55, .3], hp: [-.3, .15, .45, .4, .25, .1], hf: [10, 22, 30, 30, 22, 14], kn: [20, 42, 58, 58, 42, 26], hf2: [6, 14, 22, 22, 16, 10], kn2: [12, 30, 46, 46, 32, 18],
    rf: [60, 75, 85, 80, 65, 50], ra: [20, 16, 12, 14, 18, 20], re: [30, 38, 46, 42, 36, 32], lf: [50, 70, 82, 78, 62, 48], la: [24, 20, 16, 18, 22, 24], le: [40, 50, 60, 56, 48, 42] };
  function hitP(B, o) {
    const tb = Math.max(0, Math.min(5, o.tb)), p = baseP(B), sd = o.v % 2 ? 1 : -1;
    p.pu = B.hipH * (1 - HT.drop[tb]); p.pr = 0; p.pf = 0.4 * tb / 5; p.py = 0.12 * sd * tb / 5;
    p.c = { y: 0.12 * sd, p: HT.cp[tb], r: 0.14 * sd }; p.h = { y: 0, p: HT.hp[tb], r: -0.2 * sd };
    p.leg = [{ fk: 1, flex: HT.hf[tb], abd: 6, knee: HT.kn[tb], pitch: 6 }, { fk: 1, flex: HT.hf2[tb], abd: -8, knee: HT.kn2[tb], pitch: 4 }];
    p.arm = [{ flex: HT.rf[tb], abd: HT.ra[tb], elb: HT.re[tb] }, { flex: HT.lf[tb], abd: HT.la[tb], elb: HT.le[tb] }];
    return p;
  }
  function setFall(o, lift) {                                                                  // bütün vücudu ayak noktası etrafında düşme yönüne yatırır
    const th = (DTV[o.dv | 0] || DT).th[Math.max(0, Math.min(11, o.tb))] * PI / 180, a = o.fd * PI / 4, df = [Math.sin(a), Math.cos(a)], sn = Math.sin(th), cs = Math.cos(th);
    cur.tf = q => { const h = q[0] * df[0] + q[1] * df[1], hp = h * cs + q[2] * sn, up = -h * sn + q[2] * cs + lift * sn; return [q[0] + (hp - h) * df[0], q[1] + (hp - h) * df[1], up]; };
  }
  /* saldırı anahtar kareleri: sağ kol (kılıç) ve sol kol (meşale), gövde dönüşü, öne atılma */
  const KF = {
    ready: { rf: 18, ra: 8, re: 36, rt: 34, rp: 2, lf: 52, la: 22, le: 100, cy: 0, cp: 3, py: 0, lun: 0, cr: 0 },
    wind: { rf: 168, ra: 34, re: 92, rt: 206, rp: 28, lf: 26, la: 58, le: 96, cy: -40, cp: -10, py: -20, lun: -1, cr: 6 },
    cut: { rf: 62, ra: 12, re: 14, rt: 98, rp: -16, lf: 40, la: 44, le: 104, cy: 42, cp: 22, py: 26, lun: 1.1, cr: -4 },
    follow: { rf: 50, ra: 18, re: 22, rt: 118, rp: -5, lf: 44, la: 38, le: 100, cy: 30, cp: 16, py: 18, lun: 0.95, cr: 0 },
    spin: { rf: 26, ra: 80, re: 6, rt: 92, rp: 80, lf: 52, la: 24, le: 112, cy: -24, cp: 6, py: 12, lun: 0, cr: 0 },
    up: { rf: 174, ra: 14, re: 46, rt: 188, rp: 2, lf: 18, la: 52, le: 72, cy: -4, cp: -10, py: 0, lun: -0.9, cr: 0 },
    slam: { rf: 58, ra: 10, re: 10, rt: 68, rp: 0, lf: 40, la: 46, le: 62, cy: 6, cp: 26, py: 6, lun: 1.2, cr: 0 },
    slam2: { rf: 50, ra: 10, re: 14, rt: 80, rp: 0, lf: 34, la: 40, le: 70, cy: 4, cp: 20, py: 4, lun: 0.8, cr: 0 }
  };
  const mixK = (a, b, t) => { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], t); return o; };
  function attackKey(kind, t) {
    if (kind === 'normal') {
      if (t < 0.2) return mixK(KF.ready, KF.wind, sm(t / 0.2));
      if (t < 0.3) return mixK(KF.wind, KF.cut, 1 - Math.pow(1 - (t - 0.2) / 0.1, 2));
      return mixK(KF.cut, KF.follow, sm((t - 0.3) / 0.12));
    }
    if (kind === 'spin') return mixK(KF.ready, KF.spin, sm(t / 0.1));
    if (t < 0.3) return mixK(KF.ready, KF.up, sm(t / 0.3));
    if (t < 0.4) return mixK(KF.up, KF.slam, 1 - Math.pow(1 - (t - 0.3) / 0.1, 2));
    return mixK(KF.slam, KF.slam2, sm((t - 0.4) / 0.2));
  }
  function attackP(B, k, kind, t, moving, ph, G) {
    const p = baseP(B), L = k.lun, spin = kind === 'spin';
    const crouch = spin ? 2.4 : 1.2 + (L < 0 ? 2.4 : 1.5) * Math.abs(L);
    p.pu = B.hipH - 0.7 - crouch; p.pf = L * (spin ? 0 : 2.6); p.pr = 0; p.py = k.py * DEG; p.pro = 0;
    p.c = { y: k.cy * DEG, p: k.cp * DEG, r: k.cr * DEG }; p.h = { y: -k.cy * DEG * 0.7, p: -k.cp * DEG * 0.7, r: 0 };
    const gx = B.hw + (spin ? 3.0 : 2.0), fF = spin ? 3 : 6.6, bF = spin ? -3 : -5.4;
    const lf = L >= 0 ? lerp(1.5, fF, L) : lerp(1.5, 3.2, -L), rf = L >= 0 ? lerp(-0.8, bF, L) : lerp(-0.8, -5.2, -L);
    p.leg = [{ t: [gx, rf, B.ank + (L > 0.3 ? 0.8 : 0)], pitch: L > 0.3 ? 30 : 0, toe: 14 }, { t: [-gx, lf, B.ank + (L > 0.6 ? 0 : 0)], pitch: 0, toe: 18 }];
    p.arm = [{ flex: k.rf, abd: k.ra, elb: k.re }, { flex: k.lf, abd: k.la, elb: k.le }];
    return p;
  }

  /* ---------- çizim çekirdeği: z-tamponlu ışın izleme (ortografik, ekran y = wy*TILT - yükseklik) ---------- */
  let cur = null, prims, cidx;
  const LD = nrm([-0.45, 0.4, 0.82]), DN = nrm([0, 1, TL]), HV = nrm(add(LD, DN)), DD = 1 + TL * TL;
  const W3 = p => { if (cur.tf) p = cur.tf(p); return [p[1] * cur.ca - p[0] * cur.sa, p[1] * cur.sa + p[0] * cur.ca, p[2]]; };
  const ctx = { X: 0, Y: 0, sh: 0, s: 0, qx: 0, qy: 0, qz: 0, cu: 0, cv: 0, N: null };
  function ell(c, F, rd, mat, o) { F = F || { r: [1, 0, 0], f: [0, 1, 0], u: [0, 0, 1] }; prims.push(Object.assign({ k: 0, c: W3(c), ax: [W3(F.r), W3(F.f), W3(F.u)], rd, mat }, o)); }
  function cap(a, b, ra, rb, mat, o) { prims.push(Object.assign({ k: 1, a: W3(a), b: W3(b), ra, rb, mat }, o)); }
  function cloth(pts, cols, rows, mat, o) {
    const w = pts.map(col => col.map(W3)), nn = [];
    for (let i = 0; i <= cols; i++) { nn[i] = []; for (let j = 0; j <= rows; j++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(cols, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(rows, j + 1);
      nn[i][j] = nrm(cross(sub(w[i1][j], w[i0][j]), sub(w[i][j1], w[i][j0])));
    } }
    prims.push(Object.assign({ k: 2, w, nn, cols, rows, mat }, o));
  }
  function shadeOf(N, p) {
    const ndl = dot(N, LD), base = 0.5 * ndl + 0.5;
    let sh = 0.05 + 0.86 * Math.pow(Math.max(0, base), 1.3);
    const nd = dot(N, DN); sh += Math.pow(Math.max(0, 1 - Math.abs(nd)), 3) * (p.rim === undefined ? 0.22 : p.rim);
    if (p.spec) sh += p.spec * Math.pow(Math.max(0, dot(N, HV)), 22);
    return sh;
  }
  let DEP, COL, IDB;
  function put(X, Y, t, p, i, N) {
    const k = Y * PW + X; if (t <= DEP[k]) return;
    ctx.X = X; ctx.Y = Y; ctx.sh = clamp(shadeOf(N, p), 0, 1); ctx.N = N;
    const c = p.mat(ctx); if (!c) return;
    DEP[k] = t; IDB[k] = i; COL[k * 4] = c[0]; COL[k * 4 + 1] = c[1]; COL[k * 4 + 2] = c[2]; COL[k * 4 + 3] = 255;
  }
  function rastE(p, idx) {
    const C = p.c, A = p.ax, rd = p.rd, mr = Math.max(rd[0], rd[1], rd[2]) * 1.25, sc = C[1] * TL - C[2];
    const X0 = Math.max(0, Math.floor((C[0] + OX - mr) * HR)), X1 = Math.min(PW - 1, Math.ceil((C[0] + OX + mr) * HR));
    const Y0 = Math.max(0, Math.floor((sc + OY - mr * 1.3) * HR)), Y1 = Math.min(PH - 1, Math.ceil((sc + OY + mr * 1.3) * HR));
    const dk = A.map((a, k) => (a[1] + a[2] * TL) / rd[k]), a2 = dk[0] * dk[0] + dk[1] * dk[1] + dk[2] * dk[2];
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
      const sx = (X + 0.5) / HR - OX, sy = (Y + 0.5) / HR - OY, o = [sx - C[0], -C[1], -sy - C[2]];
      const oL = [dot(A[0], o) / rd[0], dot(A[1], o) / rd[1], dot(A[2], o) / rd[2]];
      const b = oL[0] * dk[0] + oL[1] * dk[1] + oL[2] * dk[2], c = oL[0] * oL[0] + oL[1] * oL[1] + oL[2] * oL[2] - 1, disc = b * b - a2 * c;
      if (disc < 0) continue;
      const t = (-b + Math.sqrt(disc)) / a2, qx = oL[0] + t * dk[0], qy = oL[1] + t * dk[1], qz = oL[2] + t * dk[2];
      const N = nrm([A[0][0] * qx / rd[0] + A[1][0] * qy / rd[1] + A[2][0] * qz / rd[2], A[0][1] * qx / rd[0] + A[1][1] * qy / rd[1] + A[2][1] * qz / rd[2], A[0][2] * qx / rd[0] + A[1][2] * qy / rd[1] + A[2][2] * qz / rd[2]]);
      ctx.qx = qx; ctx.qy = qy; ctx.qz = qz; ctx.s = qx * 1.7 + qz * 2.3; put(X, Y, t, p, idx, N);
    }
  }
  function rastC(p, idx) {
    const A = p.a, B2 = p.b, mr = Math.max(p.ra, p.rb) * 1.25 + 0.2, v = sub(B2, A), c = dot(v, v), b = v[1] + TL * v[2];
    const sA = A[1] * TL - A[2], sB = B2[1] * TL - B2[2];
    const X0 = Math.max(0, Math.floor((Math.min(A[0], B2[0]) + OX - mr) * HR)), X1 = Math.min(PW - 1, Math.ceil((Math.max(A[0], B2[0]) + OX + mr) * HR));
    const Y0 = Math.max(0, Math.floor((Math.min(sA, sB) + OY - mr * 1.3) * HR)), Y1 = Math.min(PH - 1, Math.ceil((Math.max(sA, sB) + OY + mr * 1.3) * HR));
    const den = DD * c - b * b;
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
      const sx = (X + 0.5) / HR - OX, sy = (Y + 0.5) / HR - OY, w0 = [sx - A[0], -A[1], -sy - A[2]];
      const dd = w0[1] + TL * w0[2], e = dot(v, w0);
      let s = den > 1e-6 ? (e * DD - b * dd) / den : 0; s = s < 0 ? 0 : s > 1 ? 1 : s;
      const t = (s * b - dd) / DD, m = [w0[0] - s * v[0], w0[1] + t - s * v[1], w0[2] + t * TL - s * v[2]], d2 = dot(m, m), r = p.ra + (p.rb - p.ra) * s;
      if (d2 >= r * r) continue;
      const th = t + Math.sqrt((r * r - d2) / DD), N = nrm([m[0], m[1] + (th - t), m[2] + (th - t) * TL]);
      ctx.s = s; ctx.qx = ctx.qy = ctx.qz = 0; put(X, Y, th, p, idx, N);
    }
  }
  function rastT(p, idx) {
    const { w, nn, cols, rows } = p, pj = q => [q[0] + OX, q[1] * TL - q[2] + OY];
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      for (const tri of [[0, 1, 2], [0, 2, 3]]) {
        const V = tri.map(k => q[k]), P = V.map(([a, b]) => pj(w[a][b]));
        const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]) * HR)), x1 = Math.min(PW - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0]) * HR));
        const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]) * HR)), y1 = Math.min(PH - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1]) * HR));
        const d = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1]); if (Math.abs(d) < 1e-9) continue;
        for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
          const px = (X + 0.5) / HR, py = (Y + 0.5) / HR;
          const l0 = ((P[1][1] - P[2][1]) * (px - P[2][0]) + (P[2][0] - P[1][0]) * (py - P[2][1])) / d, l1 = ((P[2][1] - P[0][1]) * (px - P[2][0]) + (P[0][0] - P[2][0]) * (py - P[2][1])) / d, l2 = 1 - l0 - l1;
          if (l0 < -0.001 || l1 < -0.001 || l2 < -0.001) continue;
          const t = l0 * w[V[0][0]][V[0][1]][1] + l1 * w[V[1][0]][V[1][1]][1] + l2 * w[V[2][0]][V[2][1]][1];
          const n0 = nn[V[0][0]][V[0][1]], n1 = nn[V[1][0]][V[1][1]], n2 = nn[V[2][0]][V[2][1]];
          let N = nrm([l0 * n0[0] + l1 * n1[0] + l2 * n2[0], l0 * n0[1] + l1 * n1[1] + l2 * n2[1], l0 * n0[2] + l1 * n1[2] + l2 * n2[2]]); ctx.side = 1;
          if (dot(N, DN) < 0) { N = mul(N, -1); ctx.side = -1; }
          ctx.cu = (l0 * V[0][0] + l1 * V[1][0] + l2 * V[2][0]) / cols; ctx.cv = (l0 * V[0][1] + l1 * V[1][1] + l2 * V[2][1]) / rows; ctx.qx = ctx.qy = ctx.qz = 0; ctx.s = ctx.cu * 5 + ctx.cv * 7;
          put(X, Y, t, p, idx, N);
        }
      }
    }
  }
  function render(a, build) {
    cur = { ca: Math.cos(a), sa: Math.sin(a) }; prims = []; CEL = true;
    DEP = new Float32Array(PW * PH).fill(-1e9); COL = new Uint8ClampedArray(PW * PH * 4); IDB = new Int16Array(PW * PH).fill(-1);
    let meta; try { meta = build(); } finally { CEL = false; }
    prims.forEach((p, i) => p.k === 0 ? rastE(p, i) : p.k === 1 ? rastC(p, i) : rastT(p, i));
    // kenar ayrımı: önündeki başka parçanın hemen arkasındaki piksel koyulaşır (kol/gövde ayrımı)
    for (let Y = 1; Y < PH - 1; Y++) for (let X = 1; X < PW - 1; X++) {
      const k = Y * PW + X; if (DEP[k] < -1e8) continue;
      let hit = false;
      for (const kk of [k - 1, k + 1, k - PW, k + PW]) if (DEP[kk] > -1e8 && IDB[kk] !== IDB[k] && DEP[kk] > DEP[k] + 1.1) { hit = true; break; }
      if (hit) { COL[k * 4] *= 0.5; COL[k * 4 + 1] *= 0.5; COL[k * 4 + 2] *= 0.55; }
    }
    let x0 = PW, x1 = -1, y0 = PH, y1 = -1;
    for (let Y = 0; Y < PH; Y++) for (let X = 0; X < PW; X++) if (COL[(Y * PW + X) * 4 + 3]) { if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
    if (x1 < 0) { const c = mk(1, 1); return { c, ox: 0, oy: 0, th: [0, 0] }; }
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(PW - 1, x1 + 2); y1 = Math.min(PH - 1, y1 + 2);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, c = mk(w, h), g = c.getContext('2d'), id = g.createImageData(w, h);
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) { const s = ((Y + y0) * PW + X + x0) * 4, d = (Y * w + X) * 4; id.data[d] = COL[s]; id.data[d + 1] = COL[s + 1]; id.data[d + 2] = COL[s + 2]; id.data[d + 3] = COL[s + 3]; }
    g.putImageData(id, 0, 0); outline(c, INK);
    return { c, ox: x0 / HR - OX, oy: y0 / HR - OY, th: meta && meta.th ? [meta.th[0], meta.th[1]] : [0, 0], h: null };
  }
  const proj = p => { const w = W3(p); return [w[0], w[1] * TL - w[2]]; };

  /* ---------- malzemeler ---------- */
  const rp = a => a.map(rgb);
  const RSTL = rp(STL), RARM = rp(ARM), RCLK = rp(CLK), RRED = rp(RED), RWOOD = rp(['#241a1a', '#3d2a27', '#563b33', '#7a5a40']), RBLK = rp(['#07050a', '#0d0a10', '#17121c', '#241f2b']);
  const M = (ramp, bias, db) => c => pick(ramp, c.sh + (bias || 0), bay(c.X, c.Y) * (db === undefined ? 0.5 : db));
  const fold = (c, k) => { const n = c.N, a = c.s * 0.9; return vnoise(a * 1.3 + n[0] * 3.3 + k * 2.7, n[2] * 3.6 + a * 0.6 + k) - 0.5; };
  const hq = (X, Y, s) => hash(X * 7 + (s | 0), Y * 3 + 11);

  /* ---------- KARANLIK ŞÖVALYE ---------- */
  const BKS = [40, 41, 42, 43, 45].map(body); let ST = 1;
  const RFUR = rp(['#2a2430', '#4a4250', '#6e6574', '#a09aa4']);
  function knightPoseOf(o) {
    const B = BKS[ST - 1];
    if (o.m === 'dead') return deadP(B, o);
    if (o.m === 'hit') return hitP(B, o);
    if (o.m === 'move') return gaitP(B, G_JOG, o.ph, KN_ARMS, { dip: 0 });
    if (o.m === 'jump') return jumpP(B, o.jp, Object.assign({ jump: [[{ flex: 38, abd: 46, elb: 30 }, { flex: 72, abd: 30, elb: 86 }], [{ flex: 28, abd: 56, elb: 24 }, { flex: 82, abd: 34, elb: 84 }], [{ flex: 24, abd: 62, elb: 20 }, { flex: 40, abd: 44, elb: 70 }]] }, KN_ARMS));
    if (o.m === 'att') { const k = o.kind ? attackKey(o.kind, o.t) : mixK(KF.ready, KF.up, o.c * 0.9), p = o.kind ? attackP(B, k, o.kind, o.t) : attackP(B, k, 'normal', 0); return Object.assign(p, { _k: k }); }
    return idleP(B, o.br || 0, KN_ARMS);
  }
  function kneePoseBlade(Q, o, A) {                                                          // kılıç yönü: göğüs çerçevesinde (aşağıdan sapma θ, yana ψ)
    let th = KN_BL.th, ps = KN_BL.psi;
    if (o.m === 'att') { const k = A; th = k.rt; ps = k.rp; }
    else if (o.m === 'move') { const cp = Math.cos(2 * PI * o.ph); th += -5 * cp; ps += 3 * cp; }
    else if (o.m === 'jump') { th = 70; ps = 40; }
    else if (o.m === 'dead') { th = 100; ps = 70; }
    th *= DEG; ps *= DEG;
    return nrm(loc(Q.Fc, [Math.sin(th) * Math.sin(ps), Math.sin(th) * Math.cos(ps), -Math.cos(th)]));
  }
  function buildKnight(o) {
    if (MODE2D && ST === 1) return buildKnight2D(o);
    const stg = ST, p = knightPoseOf(o), B = BKS[stg - 1];
    if (o.m === 'dead') setFall(o, 4.8 * B.H / 40);
    const Q = pose(B, p), { Fc, Fp, Fh, P } = Q;
    const bladeDir = kneePoseBlade(Q, o, p._k), run = o.m === 'move' ? 1 : 0, spinF = o.m === 'att' && o.kind === 'spin' ? 1 : 0, ph = o.ph || 0;
    const S2 = stg >= 2, S3 = stg >= 3, S4 = stg >= 4, S5 = stg >= 5, k = B.H / 40;
    // --- bacaklar (zırhlı tozluk, diz plakası, çizme) ---
    for (let i = 0; i < 2; i++) {
      const L = Q.leg[i], toe = mad(L.A, L.fd, 4.7 * k);
      cap(L.Hp, L.K, 2.9 * k, 2.1 * k, M(RARM, 0.05), { rim: 0.3 });
      cap(L.K, L.A, 2.0 * k, 1.55 * k, M(RARM, 0.1), { rim: 0.3 });
      ell(mad(L.K, L.fd, 0.6), null, [2.1 * k, 2.2 * k, 2.0 * k], c => pick(S2 && c.qy > 0.5 && Math.abs(c.qz) < 0.3 ? RRED : RSTL, c.sh - 0.12, bay(c.X, c.Y) * 0.8), { spec: 0.3 });
      cap(mad(L.A, L.fd, -1.4), toe, 1.7 * k, 1.3 * k, M(RBLK, 0.15), { rim: 0.35 });
      for (const q of [0.28, 0.55, 0.8]) ell(add(L.K, mul(sub(L.A, L.K), q)), null, [2.12 * k - q * 0.5, 2.12 * k - q * 0.5, 0.3], M(RARM, 0.3), { spec: 0.1, rim: 0.1 });            // baldır segment halkaları
      for (const q of [0.35, 0.7]) ell(add(L.Hp, mul(sub(L.K, L.Hp), q)), null, [2.95 * k - q * 0.7, 2.95 * k - q * 0.7, 0.28], M(RARM, 0.3), { spec: 0.1, rim: 0.1 });                // uyluk bantları
      const sdl = i ? -1 : 1; for (let q = 0; q < 3; q++) cap(add(add(L.Hp, [sdl * 2.6, 1.4, 0.6 - q * 0.4]), [0, 0, 0]), add(add(L.Hp, [sdl * (3.0 + q * 0.3), 1.6, -5.2 - q * 1.1]), mul(sub(L.K, L.Hp), 0.0)), 1.3, 1.0, M(RARM, 0.05), { rim: 0.35 });   // tasset plakaları
    }
    // --- leğen, karın, göğüs (omuzdan dar, bele doğru daralır) ---
    ell(mad(P, Fp.u, 0.6), Fp, [4.5 * k, 3.2 * k, 3.1 * k], c => Math.abs(c.qz - 0.45) < 0.14 ? pick(RBLK, c.sh, 0.2) : pick(RARM, c.sh, bay(c.X, c.Y) * 0.9), { rim: 0.3 });
    ell(mad(P, Fc.u, 5.0 * k), Fc, [3.8 * k, 2.8 * k, 3.9 * k], M(RARM, 0), { rim: 0.3 });
    ell(mad(P, Fc.u, 9.0 * k), Fc, [(S2 ? 5.2 : 4.9) * k, 3.5 * k, 5.2 * k], c => {
      let t = c.sh; if (c.qy > 0.2 && Math.abs(c.qx) < 0.08) t += 0.22;
      if (Math.abs(c.qz + 0.15) < 0.05) t -= 0.25; if (Math.abs(c.qz - 0.18) < 0.035) t += 0.2;
      if (S2 && c.qy > 0.4 && (Math.abs(c.qx) > 0.82 || c.qz < -0.82) && hq(c.X, c.Y, 4) < 0.7) return pick(RRED, 0.45 + c.sh * 0.3, 0.3);
      return pick(RARM, t, bay(c.X, c.Y) * 0.9);
    }, { rim: 0.35, spec: 0.2 });
    if (S2) {                                                                           // göğüs madalyonu (kırmızı taşlı)
      const m = mad(mad(P, Fc.u, 11.6 * k), Fc.f, 3.5 * k);
      ell(m, Fc, [1.7, 0.9, 1.7], M(RSTL, -0.1), { spec: 0.5 }); ell(mad(m, Fc.f, 0.6), Fc, [0.9, 0.5, 0.9], M(RRED, 0.45), { spec: 0.6 });
    }
    // --- omuz, kol: trapez eğimi, yassı omuzluk, ince kol ---
    for (let i = 0; i < 2; i++) {
      const S = Q.sho[i], arm = Q.arm[i], sd = i ? -1 : 1, tilt = frame(p.c.y, p.c.p, p.c.r + sd * 0.5);
      cap(mad(Q.N, Fc.u, -1.2), mad(S, Fc.u, 0.4), 1.9 * k, 1.7 * k, M(RARM, 0.02), {});
      ell(mad(mad(S, Fc.r, sd * 1.1), Fc.u, 0.5), tilt, [3.5 * k, 2.9 * k, 1.5 * k], M(RARM, 0.12), { rim: 0.4 });
      ell(mad(mad(S, Fc.r, sd * 1.3), Fc.u, 1.5), tilt, [2.9 * k, 2.5 * k, 1.1 * k], c => pick(S2 && c.qy > 0.5 && c.qz > 0.2 ? RRED : RSTL, c.sh - 0.2, bay(c.X, c.Y) * 0.8), { rim: 0.3, spec: 0.3 });
      if (S3) for (let q = 0; q < 2; q++) cap(mad(mad(S, Fc.r, sd * (2.6 + q * 1.5)), Fc.u, 2.2), mad(mad(S, Fc.r, sd * (3.2 + q * 1.9)), Fc.u, 4.6 + q * 0.4), 0.6, 0.15, M(RSTL, -0.1), { spec: 0.4 });
      cap(S, arm.E, 1.75 * k, 1.5 * k, M(RARM, 0.05), { rim: 0.3 });
      ell(arm.E, null, [1.7 * k, 1.7 * k, 1.7 * k], M(RSTL, -0.15), { spec: 0.2 });
      cap(arm.E, arm.W, 1.55 * k, 1.3 * k, M(RARM, 0.1), { rim: 0.3 });
      cap(arm.W, mad(arm.hand, arm.Fa, 0.9), 1.45 * k, 1.25 * k, M(RARM, 0.2), { rim: 0.3, spec: 0.2 });
    }
    // --- boyun, gorget, pelerin yakası, başlık ---
    cap(mad(Q.N, Fc.u, -1), mad(Q.N, Fh.u, 2.2), 1.9 * k, 1.7 * k, M(RBLK, 0.2));
    ell(mad(Q.N, Fc.u, -0.4), Fc, [3.6 * k, 3.1 * k, 1.5 * k], M(RARM, 0.1), { rim: 0.3 });
    const hoodK = S2 ? 0.9 : 1;
    ell(mad(mad(Q.N, Fc.u, -0.6), Fc.f, -0.9), Fc, [(S2 ? 6.2 : 6.6) * k, 4.0 * k, 3.0 * k], M(RCLK, 0.05), { rim: 0.25 });
    ell(mad(mad(Q.Hc, Fh.f, -1.1), Fh.u, -0.4), Fh, [4.3 * hoodK * k, 4.4 * hoodK * k, 4.8 * hoodK * k], M(RCLK, 0.05), { rim: 0.2 });
    // --- miğfer: dar-uzun kafa, T siperlik ---
    ell(mad(Q.Hc, Fh.u, 0.5), Fh, [3.05 * k, 3.45 * k, 4.5 * k], c => {
      const vis = c.qy > 0.42, slit = vis && c.qz > -0.1 && c.qz < 0.26 && Math.abs(c.qx) < 0.85, bar = vis && Math.abs(c.qx) < 0.17 && c.qz > -0.88 && c.qz < 0.26;
      if (slit || bar) return RBLK[1];
      let t = c.sh; if (Math.abs(c.qz - 0.58) < 0.05) t += 0.28; if (c.qz < -0.9) t -= 0.3;
      return pick(RSTL, t, bay(c.X, c.Y) * 0.9);
    }, { rim: 0.35, spec: 0.5 });
    const hb = mad(Q.Hc, Fh.u, 4.3 * k);
    if (stg === 1) cap(hb, mad(hb, Fh.u, 2.2), 0.75, 0.45, M(RSTL, 0), { spec: 0.4 });
    else if (stg === 2) cap(hb, mad(hb, Fh.u, 4.6), 0.9, 0.25, M(RSTL, 0), { spec: 0.4 });
    else {
      const n = S4 ? 5 : 5;
      for (let q = 0; q < n; q++) { const a = (q / n - 0.5) * 2.6, off = [Math.sin(a) * 2.3, 0.3 - Math.cos(a) * 0.6, 0], h2 = q === 2 ? 5.6 : 3.6 + (q % 2) * 0.6;
        cap(add(hb, loc(Fh, off)), add(add(hb, loc(Fh, off)), loc(Fh, [Math.sin(a) * 0.9, 0, h2])), 0.8, 0.2, M(RSTL, -0.05), { spec: 0.4 }); }
    }
    if (S4) {                                                                           // başın arkasında dikenli hale
      const R = S5 ? 12 : 9, cen = mad(mad(Q.Hc, Fh.f, -2.8), Fh.u, 1.5), segs = 28;
      for (let q = 0; q < segs; q++) {
        const a0 = q / segs * 2 * PI, a1 = (q + 1) / segs * 2 * PI;
        cap(add(cen, loc(Fh, [Math.cos(a0) * R, 0, Math.sin(a0) * R])), add(cen, loc(Fh, [Math.cos(a1) * R, 0, Math.sin(a1) * R])), 0.42, 0.42, M(RSTL, -0.2), { spec: 0.3 });
        if (q % 3 === 0) cap(add(cen, loc(Fh, [Math.cos(a0) * R, 0, Math.sin(a0) * R])), add(cen, loc(Fh, [Math.cos(a0) * (R + 2.8), 0, Math.sin(a0) * (R + 2.8)])), 0.4, 0.12, M(RSTL, -0.1), { spec: 0.3 });
      }
    }
    // --- kürk omuzluk (2. evreden itibaren) ---
    if (S2) {
      const nF = S5 ? 13 : S4 ? 11 : 9, top = mad(P, Fc.u, 11.4 * k);
      for (let q = 0; q < nF; q++) {
        const t = q / (nF - 1) - 0.5, wob = hash(q, 7 + stg) - 0.5, fr = 1.5 * (1 - Math.abs(t) * 1.6) - 1.2 + (Math.abs(t) > 0.3 ? 2.2 : 0);
        ell(add(top, loc(Fc, [t * 14.5 * k + wob, fr + wob * 0.8, 0.6 - Math.abs(t) * 1.4 + wob * 0.7])), Fc, [(S5 ? 2.9 : 2.5) * k, 2.3 * k, 1.9 * k], c => pick(RFUR, c.sh + (hq(c.X, c.Y, q) - 0.5) * 0.55, 0), { rim: 0.2 });
      }
    }
    // --- kemer ve toka ---
    ell(mad(mad(P, Fp.u, 1.7), Fp.f, 3.3 * k), Fp, [S2 ? 1.5 : 0.9, 0.6, S2 ? 1.5 : 0.9], M(S2 ? RSTL : RRED, S2 ? -0.1 : 0.2), { spec: 0.4 });
    // --- zincirler (3. evreden itibaren) ---
    if (S3) {
      const chain = (a, b, sag, r) => { let q0 = a; for (let q = 1; q <= 9; q++) { const s = q / 9, q1 = add(add(mul(a, 1 - s), mul(b, s)), [0, 0, -Math.sin(PI * s) * sag]); cap(q0, q1, r, r, c => pick(RSTL, c.sh + (q % 2 ? -0.2 : 0.05), 0), { spec: 0.3 }); q0 = q1; } };
      for (let i = 0; i < 2; i++) { const sd = i ? -1 : 1; chain(mad(mad(Q.sho[i], Fc.f, 3.2), Fc.u, -0.5), mad(mad(P, Fp.f, 3.4), Fp.u, 1.8), 2.6, 0.38); }
      if (S4) chain(mad(mad(mad(P, Fc.u, 9.5), Fc.r, 5), Fc.f, 3.6), mad(mad(mad(P, Fc.u, 9.5), Fc.r, -5), Fc.f, 3.6), 3.6, 0.38);
      if (S5) chain(mad(mad(mad(P, Fc.u, 6), Fc.r, 4.4), Fc.f, 3.0), mad(mad(mad(P, Fc.u, 6), Fc.r, -4.4), Fc.f, 3.0), 3.0, 0.38);
    }
    // --- meşale (sol el) ---
    const hl = Q.arm[1].hand, td = nrm([-0.12, 0.06, 1]), tb = mad(hl, td, -1.6), tt = mad(hl, td, 8.8);
    cap(tb, tt, 0.75, 0.7, M(RWOOD, 0), { rim: 0.15 });
    ell(mad(tt, td, 0.5), null, [1.4, 1.4, 1.1], M(rp(['#17121c', '#2b2830', '#3d3346']), 0), {});
    // --- kılıç (sağ el): evreye göre ---
    const hr = Q.arm[0].hand, b = bladeDir, g = nrm(cross(b, Math.abs(b[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]));
    const Lb = [18, 20, 22, 24, 30][stg - 1], Rb = [0.95, 1.1, 1.15, 1.3, 1.9][stg - 1], gw = [3.3, 3.8, 4.2, 4.6, 5.8][stg - 1];
    cap(mad(hr, b, -2.0), mad(hr, b, 1.5), 0.75, 0.75, M(RBLK, 0.3));
    ell(mad(hr, b, -2.6), null, [1.05, 1.05, 1.05], M(S2 ? RRED : RSTL, S2 ? 0.1 : -0.1), { spec: 0.3 });
    const gc = mad(hr, b, 1.6), gcol = M(rp(['#241f2b', '#3b323b', '#5a505e', '#7d7280']), 0);
    cap(mad(gc, g, -gw), mad(gc, g, gw), 0.7, 0.7, gcol, { spec: 0.4 });
    if (S2) { cap(mad(gc, g, gw), mad(mad(gc, g, gw + 0.8), b, 1.6), 0.6, 0.25, gcol, {}); cap(mad(gc, g, -gw), mad(mad(gc, g, -gw - 0.8), b, 1.6), 0.6, 0.25, gcol, {}); }
    ell(mad(hr, b, 1.9), null, [0.95, 0.95, 0.95], M(RRED, 0.35), { spec: 0.6 });
    if (S3) ell(mad(hr, b, 1.9), null, [1.7, 1.7, 1.7], c => (hq(c.X, c.Y, 3) < 0.5 ? pick(RSTL, c.sh, 0) : null), {});
    cap(mad(hr, b, 2.2), mad(hr, b, 2.2 + Lb), Rb, Rb * 0.45, c => {
      if (S4 && Math.abs(((c.s * 7) % 1) - 0.5) < 0.12 && hq(c.X, c.Y, 6) < 0.8) return pick(RRED, 0.6 + 0.4 * hq(c.X, c.Y, 1), 0);
      return pick(rp(['#120e17', '#2a2330', '#4b4452', '#8d8294']), c.sh, bay(c.X, c.Y) * 0.8);
    }, { spec: 0.9, rim: 0.3 });
    if (S3) { let q0 = mad(gc, g, gw * 0.9); for (let q = 1; q <= 5; q++) { const q1 = add(mad(gc, g, gw * 0.9 + sway(q, ph)), [0, 0, -q * 1.3]); cap(q0, q1, 0.3, 0.3, M(RSTL, -0.1), {}); q0 = q1; } ell(q0, null, [0.7, 0.4, 1.0], M(RRED, 0.35), {}); }
    ell(hr, null, [1.7, 1.7, 1.7], M(RARM, 0.25), { rim: 0.3 });
    // --- pelerin ve kırmızı tabard ---
    const pts = [], cols = 10, rows = 8, Lc = 24 * k, top = mad(P, Fc.u, 11.2 * k), widen = S2 ? 1.1 : 1;
    for (let i = 0; i <= cols; i++) {
      const tt2 = i / cols - 0.5; pts[i] = [];
      for (let j = 0; j <= rows; j++) {
        const v = j / rows, sw2 = Math.sin(2 * PI * ph + j * 0.45 + tt2 * 2) * (0.5 + 3 * run) * v * v;
        const back = 4.6 + 2 * v + 1.6 * v * v + (run * 6.5 + spinF * 2.5 + (o.m === 'jump' ? 3 : 0)) * Math.pow(v, 1.25);
        const fl = (1 + 0.7 * v + spinF * 1.2 * v) * widen, fold = Math.sin(tt2 * 17 + v * 2) * (0.5 + v * 0.7), sag = Math.pow(Math.abs(tt2) * 2, 2) * 2.2 * (1 - v);
        pts[i][j] = [top[0] + tt2 * 13.4 * fl + sw2 - (spinF ? 6 * v * v : 0), top[1] - back + fold * 0.5 + sag * 0.3, top[2] - v * Lc - (o.m === 'jump' ? 2 * v : 0)];
      }
    }
    cloth(pts, cols, rows, c => {
      const hem = 0.76 + 0.24 * hash(Math.floor(c.cu * cols * 1.5) + 31, 5) - (Math.abs(c.cu - 0.5) > 0.38 ? 0.06 : 0) - (S2 ? 0.05 * hash(Math.floor(c.cv * 9), 4) : 0);
      if (c.cv > hem) return null;
      let col = pick(RCLK, clamp(c.sh * 0.85 - (c.side < 0 ? 0.08 : 0) + Math.sin(c.cu * 38 + c.cv * 3) * 0.06 + fold(c, 3) * 0.5 + (hq(c.X, c.Y, 9) - 0.5) * 0.12, 0, 1), bay(c.X, c.Y) * 0.45);
      if (c.cv > 0.38 && ((c.cu * 21 + c.cv * 2.6) % 3.4) < 0.28) col = RCLK[0];
      if (c.cv > hem - (S2 ? 0.12 : 0.05) && hq(c.X, c.Y, 2) < (S2 ? 0.5 : 0.3)) col = RRED[S2 ? 2 : 1];
      return col;
    }, { rim: 0.2 });
    const tp = [], tw = S2 ? 1.9 : 1.45; for (let i = 0; i <= 2; i++) { tp[i] = []; for (let j = 0; j <= 5; j++) {
      const v = j / 5, u = P[2] + 1.8 - v * 13.5 * k; let ff = 3.9 + 0.7 * v;
      for (const L of Q.leg) { if (u > L.K[2]) { const tK = clamp((L.Hp[2] - u) / (L.Hp[2] - L.K[2]), 0, 1); ff = Math.max(ff, L.Hp[1] + (L.K[1] - L.Hp[1]) * tK + 2.5); } else { const t2 = clamp((L.K[2] - u) / (L.K[2] - L.A[2] + 1e-6), 0, 1); ff = Math.max(ff, L.K[1] + (L.A[1] - L.K[1]) * t2 + 2.1); } }
      tp[i][j] = [P[0] + (i - 1) * tw + Math.sin(2 * PI * ph + v * 2) * 0.3 * run * v, ff, u];
    } }
    cloth(tp, 2, 5, c => {
      const end = 0.85 + 0.15 * hash(Math.floor(c.cu * 7) + 3, 9) - Math.abs(c.cu - 0.5) * 0.2;
      if (c.cv > end) return null;
      const mid = Math.abs(c.cu - 0.5) * 2;
      return mid < 0.18 && c.cv > 0.25 ? RRED[0] : pick(RRED, clamp(c.sh * 0.9 - mid * 0.1 + fold(c, 5) * 0.5 + (hq(c.X, c.Y, 9) - 0.5) * 0.1, 0, 1), bay(c.X, c.Y) * 0.45);
    }, { rim: 0.15 });
    // --- kızıl alev dalgaları (3. evreden itibaren): omuz, pelerin kenarı, 5. evrede yer alevi ---
    if (S3) {
      const nW = [0, 0, 7, 12, 20][stg - 1], tm = ph * 6.2832;
      for (let q = 0; q < nW; q++) {
        const sd = hash(q, 11) < 0.5 ? -1 : 1, u = 4 + hash(q, 12) * 36 * k, rr = sd * (6.5 + hash(q, 13) * 5), ff = -2 - hash(q, 14) * 4, fl = Math.sin(tm * 2 + q) * 0.8;
        ell([rr + fl, ff, u], null, [0.5, 0.5, 2.2 + hash(q, 15) * 2], c => pick(RRED, 0.35 + 0.6 * hq(c.X, c.Y, q) + c.sh * 0.2, 0), { rim: 0 });
      }
      if (S5) for (let q = 0; q < 16; q++) ell([(hash(q, 21) - 0.5) * 22, (hash(q, 22) - 0.5) * 10, 1 + hash(q, 23) * 4], null, [0.8, 0.8, 2.6 + hash(q, 24) * 2.6], c => pick(RRED, 0.4 + 0.6 * hq(c.X, c.Y, q), 0), { rim: 0 });
    }
    return { th: proj(mad(tt, td, 0.2)) };
  }
  const sway = (q, ph) => Math.sin(ph * 6.2832 + q) * 0.3 * q * 0.15;

  /* ---------- ZOMBİ (1. seviye): 5 farklı köylü. Katmanlı: iskelet > deri > giysi (delikli, yırtık kenarlı) > saç telleri ---------- */
  const ZT = [{ n: 'erkek', H: 40, w: 1.0 }, { n: 'kadın-başörtülü', H: 37, w: 0.92 }, { n: 'şişman', H: 38, w: 1.55 }, { n: 'kadın-topuz', H: 38, w: 0.9 }, { n: 'sırık', H: 41, w: 0.95 }];
  const ZK = ZT.map(t => { const b = body(t.H); b.hw *= Math.max(1, t.w * 0.9); return b; });
  const ZSK = rp(['#221e28', '#3d3747', '#5f586b', '#7f7889']), ZSK2 = rp(['#1f2325', '#394040', '#576060', '#778079']), WND = rp(['#1a070c', '#42141f', '#6e2634', '#9a4450']);
  const ZR = { white: rp(['#1f1c24', '#3f3a45', '#686270', '#948d97']), brown: rp(['#16100f', '#33251f', '#533d31', '#745845']), pant: rp(['#12100f', '#272019', '#443a30', '#62564a']), grey: rp(['#1f1e25', '#3b3a43', '#5f5d6a', '#85838f']), skirt: rp(['#17110f', '#33261f', '#523f33', '#725a49']), dark: rp(['#0b090d', '#17121b', '#2b2231', '#413646']), boot: rp(['#0d0908', '#211713', '#3d2b22', '#5a4132']) };
  const HAIR = [rp(['#0b080c', '#1a1318', '#2e2229', '#4a3a40']), rp(['#14100e', '#2a221d', '#463a31', '#6a5a4c']), rp(['#08060a', '#140f13', '#251c22', '#3b2f35']), rp(['#120c0b', '#261a16', '#43302a', '#664a3e']), rp(['#0e0d12', '#1c1b22', '#33323c', '#52505e'])];
  const G_ZOM = { duty: 0.64, reach: 7, lift: 2.0, hip: 19.0, bob: 0.7, sign: 1, pyaw: 6, cyaw: 7, roll: 4.5, sway: 1.6, lean: 8, push: 16 };
  const ZA = { r: { flex: 76, abd: 8, elb: 34, amp: 8, eamp: 8 }, l: { flex: 68, abd: 12, elb: 48, amp: 8, eamp: 8 } };
  const ZBITE = { r: { flex: 92, abd: 18, elb: 14, amp: 0 }, l: { flex: 86, abd: 22, elb: 24, amp: 0 } };
  function zombiePoseOf(o) {
    const B = ZK[o.v], lim = { reach: 0.72, lift: 0.4, drag: 22, toe: 22 }, limpSide = o.v % 2;
    if (o.m === 'dead') return deadP(B, o);
    if (o.m === 'hit') return hitP(B, o);
    const G = o.v === 2 ? Object.assign({}, G_ZOM, { sway: 2.6, roll: 6.5, reach: 5.8, lean: 4, hip: 18.2 }) : o.v === 4 ? Object.assign({}, G_ZOM, { lean: 12 }) : G_ZOM;
    if (o.m === 'bite') {
      const p = idleP(B, 0, ZBITE); p.pu = B.hipH - 2.4; p.pf = 1.2;
      p.c = { y: 0, p: (15 + o.br * 3) * DEG, r: 4 * DEG }; p.h = { y: 0, p: 12 * DEG, r: -6 * DEG }; p.py = 0;
      p.leg = [{ t: [B.hw + 1.8, 3.4, B.ank], pitch: 0, toe: 16 }, { t: [-B.hw - 1.8, -3.0, B.ank], pitch: 0, toe: 16 }];
      p.arm = [{ flex: ZBITE.r.flex + o.br * 4, abd: 18, elb: 14 }, { flex: ZBITE.l.flex - o.br * 4, abd: 22, elb: 26 }];
      return p;
    }
    if (o.m === 'idle') {
      const p = idleP(B, 0, ZA); p.pu = B.hipH - 1.4; p.c = { y: 0, p: 8 * DEG, r: 3 * DEG }; p.h = { y: 0, p: 8 * DEG, r: -6 * DEG };
      p.arm = [{ flex: 40, abd: 8, elb: 30 }, { flex: 34, abd: 12, elb: 40 }]; return p;
    }
    const zp = gaitP(B, G, o.ph, ZA, { dip: -0.2, lean: G.lean, hcomp: -0.5, hp: 5, hr: -5, croll: 3, limp: limpSide, lim });
    /* referans videodaki gibi: yana eğik baş, düşük omuz, asimetrik kollar (biri göğse, biri sarkık), bükülü dizler */
    const ZV = [{ hr: -22, cr: 7, h: 0, st: 0, r: [78, 10, 96], l: [12, 12, 18], dk: 0.6 }, { hr: 6, cr: 0, h: 14, st: 10, r: [48, 6, 28], l: [44, 8, 30], dk: 0.5 }, { hr: 12, cr: -5, h: 6, st: 0, r: [8, 10, 20], l: [76, 22, 22], dk: 0.5 },
      { hr: 20, cr: -6, h: 4, st: 3, r: [60, 8, 72], l: [20, 10, 30], dk: 0.6 }, { hr: -14, cr: 4, h: 10, st: 8, r: [40, 8, 24], l: [34, 16, 30], dk: 1.0 }][o.v] || {};
    if (ZV.r) {
      const cw = Math.cos(2 * PI * (o.ph || 0));
      zp.h.r += ZV.hr * DEG; zp.h.p += ZV.h * DEG; zp.c.r += ZV.cr * DEG; zp.c.p += ZV.st * DEG; zp.pu -= ZV.dk;
      zp.arm = [{ flex: ZV.r[0] - 6 * cw, abd: ZV.r[1], elb: ZV.r[2] }, { flex: ZV.l[0] + 5 * cw, abd: ZV.l[1], elb: ZV.l[2] }];
    }
    return zp;
  }
  /* saç telleri: kafa derisinden çıkan ince, yerçekimiyle kıvrılan, yürüyüşle hafif sallanan tel kümeleri */
  function strands(Hc, Fh, v, n, cfg, ph, moving) {
    const hr = HAIR[v], rad = [2.85, 3.25, 3.85];
    for (let k = 0; k < n; k++) {
      const az = (hash(k, 31 + v) * 2 - 1) * PI * (cfg.az || 1), el = cfg.e0 + hash(k, 32 + v) * (cfg.e1 - cfg.e0), ce = Math.cos(el);
      const ux = ce * Math.sin(az), uy = ce * Math.cos(az), uz = Math.sin(el);
      if (cfg.nf && uy > 0.45 && uz < cfg.nf) continue;
      const root = add(Hc, loc(Fh, [ux * rad[0] * 0.97, uy * rad[1] * 0.97 - (uy < 0 ? 0.2 : 0), uz * rad[2] * 0.97])), len = cfg.l0 + hash(k, 33 + v) * (cfg.l1 - cfg.l0);
      let dir = nrm(loc(Fh, [ux * cfg.out * 0.55, uy * cfg.out * 0.55 - (cfg.back || 0), uz * cfg.out * 0.55 - 0.25])), q0 = root;
      for (let i = 1; i <= 3; i++) {
        const sw = Math.sin(ph * 6.2832 * 2 + k * 0.9 + i) * cfg.sw * i * 0.14, lag = (moving ? -0.22 : 0) * i;
        dir = nrm(add(dir, [sw, lag * 0.4 + sw * 0.3, -cfg.g * (0.5 + 0.2 * i)]));
        const q1 = mad(q0, dir, len / 3);
        cap(q0, q1, 0.5 * (1 - 0.2 * i) + 0.05, 0.42 * (1 - 0.22 * i) + 0.04, c => pick(hr, c.sh + (hq(c.X, c.Y, k) - 0.5) * 0.3 + (k % 5 === 0 ? 0.12 : 0), 0.1), { rim: 0.3, spec: 0.35 });
        q0 = q1;
      }
    }
  }
  function buildZombie(o) {
    const T = ZT[o.v], v = o.v, w = T.w, B = ZK[v], p = zombiePoseOf(o);
    if (o.m === 'dead') setFall(o, 3.2 + (T.w - 1) * 3.2);
    const Q = pose(B, p), { Fc, Fp, Fh, P } = Q, bite = o.m === 'bite', skirt = v === 1 || v === 3;
    const ph = o.ph || 0.2, moving = o.m === 'walk';
    const nz = (c, sx, sy, k) => vnoise(c.X / sx + k * 3.1, c.Y / sy + v * 5.3 + k);
    // deri: soluk gri-mor, damar/çürük lekeleri, yara
    const SK = rate => c => {
      const n = nz(c, 4.5, 4.5, 1), b = nz(c, 9, 9, 7);
      if (n > 1 - rate * 1.2) return pick(WND, 0.2 + c.sh * 0.7 + (n > 1 - rate * 0.5 ? -0.25 : 0), bay(c.X, c.Y) * 0.4);
      return pick(b > 0.62 ? ZSK2 : ZSK, c.sh + (hq(c.X, c.Y, 4) - 0.5) * 0.12 + (b - 0.5) * 0.15, bay(c.X, c.Y) * 0.4);
    };
    // giysi: dokuma tane, kıvrımlar, delikler (null = altındaki deri görünür), yırtık kenar
    const CLT = (ramp, o2) => c => {
      o2 = o2 || {};
      if (o2.hole && nz(c, 3.4, 3.4, 5) > 1 - o2.hole) return null;
      if (o2.cut && o2.cut(c)) return null;
      let t = c.sh + fold(c, o2.k || 0) * 0.6 + (hq(c.X, c.Y, 9) - 0.5) * 0.12 + (((c.X >> 1) + (c.Y >> 1)) & 1 ? 0.02 : -0.02);
      if (o2.stain && nz(c, 5, 5, 9) > 1 - o2.stain) return pick(WND, 0.25 + c.sh * 0.5, bay(c.X, c.Y) * 0.4);
      return pick(ramp, t, bay(c.X, c.Y) * 0.4);
    };
    const pantR = v === 0 || v === 2 ? ZR.pant : ZR.dark;
    // --- bacaklar: önce çıplak (yıpranmış) bacak, üstüne pantolon ---
    for (let i = 0; i < 2; i++) {
      const L = Q.leg[i], toe = mad(L.A, L.fd, 4.2), bare = skirt || v === 2 || v === 4;
      cap(L.Hp, L.K, 1.95 * w, 1.6 * w, SK(0.16), { rim: 0.2 }); cap(L.K, L.A, 1.55 * w, 1.1 * w, SK(0.22), { rim: 0.2 });
      ell(mad(L.K, L.fd, 0.5), null, [1.5 * w, 1.6 * w, 1.6 * w], SK(0.2), { rim: 0.2 });
      if (!skirt) {
        cap(L.Hp, L.K, 2.55 * w, 2.0 * w, CLT(pantR, { hole: 0.1, k: i, stain: 0.08 }), { rim: 0.2 });
        cap(L.K, L.A, 1.95 * w, 1.55 * w, CLT(pantR, { k: i + 3, hole: 0.12, cut: c => c.s > (v === 0 ? 0.62 : 0.48) + 0.22 * nz(c, 2.5, 6, 2) - (i ? 0.1 : 0) }), { rim: 0.2 });
      }
      const fw = v === 2 ? 1.3 : 1;
      if (v === 0 || v === 1) { cap(mad(L.A, L.fd, -1.4), toe, 1.6, 1.25, CLT(ZR.boot, { k: 8 }), { rim: 0.3 }); cap(mad(L.A, [0, 0, 0.7], 1), mad(L.K, L.A, 0.14), 1.7, 1.55, CLT(ZR.boot, { k: 2 }), {}); }
      else { cap(mad(L.A, L.fd, -1.2), toe, 1.35 * fw, 1.1 * fw, SK(0.14), { rim: 0.3 }); for (let t = -1; t <= 1; t++) ell(add(mad(L.A, L.fd, 4.9), [t * 0.75 * fw, 0, -0.25]), null, [0.55 * fw, 0.7, 0.55], SK(0.05), {}); }
    }
    // --- gövde: iskelet-derisi + giysi katmanları ---
    ell(mad(P, Fp.u, 0.8), Fp, [3.7 * w, 2.8 * w, 3.0], SK(0.18), { rim: 0.2 });
    ell(mad(P, Fc.u, 5.0), Fc, [3.4 * w, 2.5 * w, 3.7], SK(0.2), { rim: 0.2 });
    ell(mad(P, Fc.u, 8.7), Fc, [4.0 * w, 2.8 * w, 4.6], c => {                                       // göğüs kafesi, köprücük
      if (c.qy > 0.4 && c.qz > -0.5 && c.qz < 0.1 && Math.abs(Math.sin(c.qz * 14)) > 0.8 && Math.abs(c.qx) < 0.8) return pick(ZSK, c.sh - 0.2, 0.3);
      return SK(0.22)(c);
    }, { rim: 0.2 });
    if (v === 2) ell(mad(mad(P, Fc.u, 4.4), Fc.f, 2.4), Fc, [5.6, 4.4, 4.4], c => (nz(c, 5, 5, 9) > 0.72 ? pick(WND, 0.25 + c.sh * 0.6, 0.4) : pick(ZSK, c.sh + 0.1 + (hq(c.X, c.Y, 4) - 0.5) * 0.1, bay(c.X, c.Y) * 0.4)), { rim: 0.2 });
    ell(mad(P, Fp.u, 1.0), Fp, [4.15 * w, 3.15 * w, 3.2], skirt ? CLT(ZR.skirt, { k: 4 }) : v === 4 ? c => (Math.abs(c.qz - 0.45) < 0.14 ? pick(ZR.dark, c.sh, 0.2) : CLT(ZR.pant, { hole: 0.08, k: 4 })(c)) : CLT(ZR.pant, { hole: 0.08, k: 4, stain: 0.08 }), { rim: 0.2 });
    const shirt = [ZR.white, ZR.brown, ZR.white, ZR.grey, ZR.grey][v];
    ell(mad(P, Fc.u, 5.0), Fc, [3.75 * w, 2.85 * w, 3.85], CLT(shirt, { k: 11, hole: 0.1, cut: c => (v === 2 ? c.qy > 0 && c.qz < -0.05 : c.qz < -0.8 + 0.3 * nz(c, 2.5, 6, 3)) }), { rim: 0.2 });
    ell(mad(P, Fc.u, 8.7), Fc, [(v === 3 ? 4.1 : 4.4) * w, 3.05 * w, 4.75], c => {
      const front = c.qy > 0.15;
      if (v === 3) { if (front && (c.qz > 0.3 || (Math.abs(c.qx) < 0.3 && c.qz > -0.35))) return null; return CLT(ZR.grey, { k: 12, hole: 0.14 })(c); }
      if (v === 4) { if (front && Math.abs(c.qx) < 0.34 && c.qz < 0.75) return null; return CLT(ZR.grey, { k: 13, hole: 0.12, stain: 0.1 })(c); }
      if (v === 1) { if (c.qz > 0.55 && front) return CLT(ZR.white, { k: 14 })(c); const lace = front && Math.abs(c.qx) < 0.1 && Math.sin(c.qz * 26) > 0; return lace ? pick(ZR.white, 0.3, 0) : CLT(ZR.brown, { k: 15, hole: 0.06 })(c); }
      if (c.qz < -0.8 + 0.25 * nz(c, 2.5, 6, 3)) return null;
      if (front && Math.abs(c.qx) < 0.3 + (c.qz > 0.4 ? 0.1 : 0)) return null;                      // yelek önü açık
      if (Math.abs(Math.abs(c.qx) - 0.3) < 0.04 && front) return ZR.brown[0];
      return CLT(ZR.brown, { k: 15, hole: 0.07, stain: 0.08 })(c);
    }, { rim: 0.25 });
    if (v === 0 || v === 2) { ell(mad(mad(P, Fc.u, 11.0), Fc.f, 0.4), Fc, [3.4 * w, 2.6 * w, 1.0], CLT(ZR.white, { k: 16 }), {}); }          // gömlek yakası
    if (v === 1) ell(mad(mad(P, Fc.u, 11.5), Fc.f, 0.3), Fc, [3.5, 2.9, 1.0], CLT(ZR.white, { k: 17 }), {});
    ell(mad(P, Fp.u, 1.9), Fp, [4.3 * w, 3.3 * w, 0.8], c => pick(v === 0 || v === 4 ? ZR.dark : ZR.brown, c.sh + (Math.sin(c.qx * 18) > 0.9 ? 0.2 : 0), 0.1), {});   // kemer/kuşak
    // --- etek (kadınlar): kıvrımlı, yırtık uçlu ---
    if (skirt) {
      const cols = 16, rows = 6, wu = P[2] + 1.0, hu = v === 1 ? 3.0 : 8.5, R1 = v === 1 ? 7.8 : 6.6, pts = [];
      for (let i = 0; i <= cols; i++) { const a = i / cols * 2 * PI; pts[i] = []; for (let j = 0; j <= rows; j++) {
        const t = j / rows, rad = 4.0 + (R1 - 4.0) * Math.pow(t, 0.8) + Math.sin(a * 5 + 1) * 0.5 * t, swy = Math.sin(2 * PI * ph + a) * 0.7 * t;
        pts[i][j] = [P[0] + Math.sin(a) * rad + swy, P[1] + Math.cos(a) * rad * 0.9 + 0.2, wu + (hu - wu) * t];
      } }
      cloth(pts, cols, rows, c => {
        const jag = hash(Math.floor(c.cu * 52), 5 + v) * hash(Math.floor(c.cu * 17), 9); if (c.cv > 0.8 + 0.2 * jag) return null;
        const front = c.cu < 0.2 || c.cu > 0.8;
        if (v === 1 && front && c.cv > 0.05) return CLT(ZR.white, { k: 18, stain: 0.2, hole: 0.05 })(c);
        return CLT(ZR.skirt, { k: 19, stain: 0.1, hole: 0.06 })(c);
      }, { rim: 0.2 });
    }
    // --- kollar: çıplak kol + kısa/uzun kol (yırtık uçlu) + pençe parmaklar ---
    for (let i = 0; i < 2; i++) {
      const S = Q.sho[i], arm = Q.arm[i], sl = [0.62, 0.78, 0.6, 0.3, 0.5][v] - (i ? 0.08 : 0), slv = v === 1 ? ZR.brown : v === 0 || v === 2 ? ZR.white : ZR.grey;
      cap(mad(Q.N, Fc.u, -1), S, 1.5 * w, 1.4 * w, SK(0.2), {});
      ell(mad(S, Fc.r, i ? -0.5 : 0.5), Fc, [2.2 * w, 2.0 * w, 1.8], SK(0.2), {});
      cap(S, arm.E, 1.4 * w, 1.1 * w, SK(0.26), { rim: 0.25 }); cap(arm.E, arm.W, 1.15 * w, 0.9 * w, SK(0.3), { rim: 0.25 });
      ell(arm.E, null, [1.25 * w, 1.25 * w, 1.25 * w], SK(0.2), {});
      cap(S, arm.E, 1.85 * w, 1.55 * w, CLT(slv, { k: 20 + i, hole: 0.06, cut: c => c.s > sl + 0.12 * nz(c, 2.4, 3, 6) }), { rim: 0.25 });
      ell(S, Fc, [2.6 * w, 2.3 * w, 2.0], v === 3 ? SK(0.2) : CLT(slv, { k: 22 }), { rim: 0.2 });
      const hd = nrm(add(arm.Fa, [0, 0, -0.5])), hc = mad(arm.W, hd, 1.2), sd = i ? -1 : 1;
      ell(hc, null, [1.25 * w, 1.1 * w, 0.8 * w], SK(0.3), { rim: 0.25 });                           // avuç
      for (let f = -1.5; f <= 1.5; f++) {                                                           // 4 parmak, iki boğum, kıvrık
        const base = add(mad(hc, hd, 0.9), [sd * 0 + f * 0.5 * w, 0, 0]), m1 = mad(add(base, [f * 0.22, 0, -0.2]), hd, 1.2), m2 = add(mad(m1, hd, 1.0), [f * 0.1, 0, -0.65]);
        cap(base, m1, 0.42, 0.36, SK(0.1), {}); cap(m1, m2, 0.36, 0.28, SK(0.1), {}); ell(m2, null, [0.3, 0.3, 0.3], c => pick(ZR.dark, c.sh + 0.3, 0.1), {});
      }
      cap(mad(hc, [sd * 0.6, 0, 0], 1), mad(mad(hc, hd, 1.5), [sd * 1.4, 0.3, 0.1], 1), 0.45, 0.32, SK(0.1), {});   // başparmak
    }
    // --- boyun (tendon), kafa: kafatası + çene + burun + kulak + kaş ---
    cap(mad(Q.N, Fc.u, -1), mad(Q.N, Fh.u, 2.0), 1.55 * w, 1.35 * w, SK(0.15), {});
    const fat = v === 2 ? 1.2 : 1, open = bite ? 1.5 : 0.35, mh = add(Q.Hc, loc(Fh, [0, 2.2 * fat, -1.9 * fat]));
    ell(Q.Hc, Fh, [2.85 * fat, 3.25 * fat, 3.8 * fat], c => {
      if (c.qy > 0.5) {
        const ex = Math.abs(Math.abs(c.qx) - 0.42) < 0.24 && Math.abs(c.qz - 0.06) < 0.22;
        if (ex) return Math.abs(Math.abs(c.qx) - 0.42) < 0.08 && Math.abs(c.qz - 0.06) < 0.08 ? [206, 120, 112] : [18, 8, 14];
        if (c.qz > 0.22 && c.qz < 0.42 && Math.abs(c.qx) < 0.85) return pick(ZSK, c.sh - 0.25, 0.2);                 // kaş çıkıntısı gölgesi
        if (c.qz < -0.12 && c.qz > -0.4 && Math.abs(Math.abs(c.qx) - 0.5) < 0.25) return pick(ZSK, c.sh - 0.2, 0.2);  // yanak çukuru
      }
      const hairy = v === 1 ? (c.qz > 0.45 || c.qy < -0.2) : (c.qz > 0.55 || (c.qy < -0.25 && c.qz > -0.35));
      if (hairy) return pick(v === 1 ? ZR.white : HAIR[v], c.sh + (hq(c.X, c.Y, 3) - 0.5) * 0.3, 0.1);
      return SK(0.13)(c);
    }, { rim: 0.25 });
    ell(add(Q.Hc, loc(Fh, [0, 0.9 * fat, -1.4 - open * 0.6])), Fh, [2.0 * fat, 2.3 * fat, 1.5 * fat], c => (c.qy > 0.55 && c.qz > -0.2 && c.qz < 0.4 && Math.abs(c.qx) < 0.45 ? [20, 8, 14] : SK(0.15)(c)), { rim: 0.25 });  // alt çene (açılır)
    ell(add(Q.Hc, loc(Fh, [0, 3.2 * fat, -0.6])), Fh, [0.55, 0.9, 1.0], SK(0.1), {});                         // burun
    for (const sd of [-1, 1]) ell(add(Q.Hc, loc(Fh, [sd * 2.85 * fat, -0.2, -0.2])), Fh, [0.45, 0.8, 1.0], SK(0.12), {});   // kulaklar
    ell(add(mh, loc(Fh, [0, -0.2, -open * 0.3])), Fh, [1.7, 0.9, 0.4 + open * 0.5], c => pick(rp(['#0c0407', '#2b0a12', '#4e1420']), c.sh * 0.6 + 0.1, 0.1), {});   // ağız boşluğu
    for (let t = -1; t <= 1; t += 2) cap(add(mh, loc(Fh, [t * 0.7, 0.35, 0.5 + open * 0.1])), add(mh, loc(Fh, [t * 0.7, 0.35, -0.1 + open * 0.1])), 0.22, 0.2, c => pick(rp(['#6a6258', '#a89e8e', '#d0c6b2']), c.sh, 0.1), {});
    // --- saç: tel tel; hafif sallanır ---
    if (v === 0) strands(Q.Hc, Fh, v, 70, { e0: 0.1, e1: 1.35, l0: 2.2, l1: 3.6, out: 1.0, g: 0.7, sw: 0.5, nf: 0.75, back: 0 }, ph, moving);
    if (v === 2) strands(Q.Hc, Fh, v, 60, { e0: 0.2, e1: 1.35, l0: 1.6, l1: 2.7, out: 1.0, g: 0.6, sw: 0.4, nf: 0.8 }, ph, moving);
    if (v === 4) strands(Q.Hc, Fh, v, 70, { e0: -0.1, e1: 1.35, l0: 3.0, l1: 5.6, out: 0.8, g: 1.2, sw: 0.8, nf: 0.45 }, ph, moving);
    if (v === 3) {
      strands(Q.Hc, Fh, v, 40, { e0: 0.35, e1: 1.3, l0: 1.6, l1: 3.0, out: 0.9, g: 0.15, sw: 0.3, nf: 0.85, back: 0.6 }, ph, moving);
      ell(add(Q.Hc, loc(Fh, [0, -1.9, 4.5])), Fh, [1.6, 1.6, 1.4], c => pick(HAIR[3], c.sh + (Math.sin(c.qx * 9 + c.qz * 7) > 0.6 ? 0.2 : 0), 0.1), { rim: 0.3, spec: 0.3 });
      strands(Q.Hc, Fh, v, 12, { e0: -0.3, e1: 0.4, l0: 4.5, l1: 7.5, out: 0.5, g: 1.7, sw: 1.1, nf: 0.2, az: 1.0, back: 0.1 }, ph, moving);
    }
    if (v === 1) {                                                                                  // başörtüsü: kıvrımlı kumaş, düğüm, altından uzun saç
      ell(add(Q.Hc, loc(Fh, [0, -0.7, 0.8])), Fh, [3.35, 3.8, 4.2], c => { if (c.qy > 0.5 && c.qz < 0.42) return null; return CLT(ZR.white, { k: 25, stain: 0.1, hole: 0.03 })(c); }, { rim: 0.25 });
      ell(add(Q.Hc, loc(Fh, [0, -3.6, -0.2])), Fh, [1.4, 1.3, 1.4], CLT(ZR.white, { k: 26 }), {});
      strands(Q.Hc, Fh, v, 24, { e0: -0.8, e1: 0.3, l0: 5.5, l1: 9, out: 0.45, g: 2.0, sw: 1.2, nf: 0.1, az: 0.95, back: 0.1 }, ph, moving);
    }
    return { th: [0, 0] };
  }

  /* ---------- 2B KUKLA ŞÖVALYE (evre 1) ----------
     İskeletin eklem noktaları ekrana izdüşürülür; her parça elle tasarlanmış düz 2B şekil (kapsül/elips/çokgen) olarak,
     ressam sırasıyla (uzaktan yakına) ve sert 3 bantla çizilir. Z-tamponu ve yumuşak gölgelendirme yok. */
  let MODE2D = true;
  const LS = [-0.55, -0.83]; let PD = 0;
  const bandOf = v => (v < 0.36 ? 0 : v < 0.66 ? 1 : 2);
  const rcol = (r, b, s) => r[Math.max(0, Math.min(r.length - 1, b + (s || 0)))];
  function put2(X, Y, c) { if (!c || X < 0 || Y < 0 || X >= PW || Y >= PH) return; const k = Y * PW + X; DEP[k] = PD; IDB[k] = PD; COL[k * 4] = c[0]; COL[k * 4 + 1] = c[1]; COL[k * 4 + 2] = c[2]; COL[k * 4 + 3] = 255; }
  function cap2(A, B, ra, rb, sh) {
    const ax = B[0] - A[0], ay = B[1] - A[1], l2 = ax * ax + ay * ay || 1, m = Math.max(ra, rb) + 1; PD += 2;
    for (let Y = Math.floor(Math.min(A[1], B[1]) - m); Y <= Math.ceil(Math.max(A[1], B[1]) + m); Y++) for (let X = Math.floor(Math.min(A[0], B[0]) - m); X <= Math.ceil(Math.max(A[0], B[0]) + m); X++) {
      const px = X + 0.5 - A[0], py = Y + 0.5 - A[1]; let t = (px * ax + py * ay) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = px - t * ax, dy = py - t * ay, r = ra + (rb - ra) * t; if (dx * dx + dy * dy >= r * r) continue;
      const nx = dx / r, ny = dy / r; put2(X, Y, sh(bandOf(0.5 + 0.5 * (nx * LS[0] + ny * LS[1])), nx, ny, X, Y, t));
    }
  }
  function ell2(C, rx, ry, sh) {
    PD += 2;
    for (let Y = Math.floor(C[1] - ry - 1); Y <= Math.ceil(C[1] + ry + 1); Y++) for (let X = Math.floor(C[0] - rx - 1); X <= Math.ceil(C[0] + rx + 1); X++) {
      const nx = (X + 0.5 - C[0]) / rx, ny = (Y + 0.5 - C[1]) / ry; if (nx * nx + ny * ny >= 1) continue;
      put2(X, Y, sh(bandOf(0.5 + 0.5 * (nx * LS[0] + ny * LS[1])), nx, ny, X, Y, 0));
    }
  }
  function poly2(V, sh) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; V.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); PD += 2;
    for (let Y = Math.floor(y0); Y <= Math.ceil(y1); Y++) for (let X = Math.floor(x0); X <= Math.ceil(x1); X++) {
      const px = X + 0.5, py = Y + 0.5; let ins = false;
      for (let i = 0, j = V.length - 1; i < V.length; j = i++) if ((V[i][1] > py) !== (V[j][1] > py) && px < (V[j][0] - V[i][0]) * (py - V[i][1]) / (V[j][1] - V[i][1]) + V[i][0]) ins = !ins;
      if (!ins) continue; const u = (px - x0) / (x1 - x0 || 1), v = (py - y0) / (y1 - y0 || 1);
      put2(X, Y, sh(bandOf(0.5 + 0.5 * ((u - 0.5) * LS[0] * 1.6 + (v - 0.5) * LS[1])), u, v, X, Y, 0));
    }
  }
  function buildKnight2D(o) {
    const p = o.m === 'hit' ? hitP(BKS[0], o) : knightPoseOf(o), B = BKS[0], k = B.H / 40;
    if (o.m === 'dead') setFall(o, 4.8 * B.H / 40);
    const Q = pose(B, p), { Fc, Fp, Fh, P } = Q, run = o.m === 'move' ? 1 : 0, spinF = o.m === 'att' && o.kind === 'spin' ? 1 : 0;
    const bladeDir = kneePoseBlade(Q, o, p._k), SP = q => { const w = proj(q); return [(w[0] + OX) * HR, (w[1] + OY) * HR]; }, D = q => { const w = W3(q); return w[1] + TL * w[2]; };
    const dv = v => { const a = W3(P), b = W3(add(P, v)); return [b[0] - a[0], b[1] - a[1] - 0 * (b[2] - a[2])]; };
    const frB = dv(Fc.f)[1] / TL * 0 + (W3(add(P, Fc.f))[1] - W3(P)[1]), fr = frB, fh = W3(add(Q.Hc, Fh.f))[1] - W3(Q.Hc)[1], fhx = W3(add(Q.Hc, Fh.f))[0] - W3(Q.Hc)[0];
    const wv = o.m === 'move' ? Math.floor((((o.ph || 0) % 1) + 1) % 1 * 6) / 6 : ((o.br | 0) % 4) / 4, R = HR;
    const parts = [];
    const add2 = (d, f) => parts.push([d, f]);
    // --- pelerin arka paneli: dökümlü, yırtık etekli; dalga referanstaki gibi adımlı (2'li) ---
    const cloakD = fr >= -0.25 ? -80 : 80, back = 4.4 + run * 4.5 + spinF * 2, Wh = 8.2 * k + run * 0.8;
    const topR = mad(mad(Q.sho[0], Fc.r, 1.8 * k), Fc.u, 1.0 * k), topL = mad(mad(Q.sho[1], Fc.r, -1.8 * k), Fc.u, 1.0 * k);
    const hemZ = 1.6 * k + (o.m === 'jump' ? 3 : 0), V = [SP(mad(Q.N, Fc.u, 1.2 * k)), SP(topR), SP([topR[0] + 1.5 * k, topR[1] - 1.5, topR[2] - 9 * k])];
    const N = 11, hemAt = (s, tip) => { const a = (tip ? s + 0.5 / N : s), wob = Math.sin(2 * PI * wv + a * 6.0) * (0.7 + 2.2 * run), tooth = tip ? 1.2 + 3.6 * hash(Math.round(a * N) * 3 + 7, 5) : 0, fl = 1 + 0.25 * Math.sin(a * 3.1 + wv * 6.28) * 0.4;
      return SP([P[0] + (0.5 - a) * 2 * Wh * fl + wob, P[1] - back - 0.6 * Math.sin(a * 3.14) - run * 2.5 * Math.abs(a - 0.5), hemZ - tooth + 0.9 * Math.sin(2 * PI * wv + a * 7)]); };
    for (let i = 0; i < N; i++) { V.push(hemAt(i / N, false)); V.push(hemAt(i / N, true)); } V.push(hemAt(1, false));
    V.push(SP([topL[0] - 1.5 * k, topL[1] - 1.5, topL[2] - 9 * k]), SP(topL));
    add2(cloakD, () => poly2(V, (b, u, v, X, Y) => {
      const st = u * 7.5 + 0.8 * Math.sin(v * 5 + wv * 6.283), fr2 = st - Math.floor(st);
      if (fr2 < 0.1) return rcol(RCLK, 0); if (v > 0.9 && hash(X, Y) < 0.5) return rcol(RCLK, 0);
      const e = b + (fr2 > 0.7 && v < 0.7 ? 1 : 0) - (v > 0.55 ? 1 : 0); return rcol(RCLK, Math.max(0, Math.min(2, e)), 0);
    }));
    // --- bacaklar: koyu pantolon + deri çizme ---
    for (let i = 0; i < 2; i++) {
      const L = Q.leg[i], toe = mad(L.A, L.fd, 4.7 * k), sd = D(L.K);
      add2(sd - 2, () => { cap2(SP(L.Hp), SP(L.K), 2.9 * k * R, 2.2 * k * R, (b) => rcol(RBLK, b, 1)); cap2(SP(L.K), SP(L.A), 2.1 * k * R, 1.6 * k * R, (b) => rcol(RBLK, b, 1)); });
      add2(sd, () => cap2(SP(mad(L.A, L.fd, -1.4)), SP(toe), 1.8 * k * R, 1.4 * k * R, (b, nx, ny, X, Y) => (ny > 0.4 && b === 0 ? rcol(RBLK, 0) : rcol(RARM, b, -1))));
      add2(sd + 1, () => ell2(SP(mad(L.K, L.fd, 0.8)), 2.0 * k * R, 1.5 * k * R, (b) => rcol(RSTL, b, -1)));
    }
    // --- gövde: siyah kumaş cüppe, belde kemer ---
    const chest = mad(P, Fc.u, 9.5 * k), tD = D(P);
    add2(tD, () => { cap2(SP(mad(P, Fp.u, 0.6)), SP(chest), 4.3 * k * R, 4.9 * k * R, (b) => rcol(RBLK, b, 1)); });
    // kırmızı tabard şeridi (cüppenin önünde asılı, yırtık ucu)
    const tabTop = mad(mad(P, Fc.u, 11.6 * k), Fc.f, 3.5 * k), tabBot = mad(mad(P, Fp.u, -5.5 * k), Fp.f, 3.3 * k), tw = 2.5 * k, TV = [];
    TV.push(SP(mad(tabTop, Fc.r, tw)), SP(mad(tabTop, Fc.r, -tw)));
    for (let i = 0; i <= 6; i++) { const s = i / 6, c = mad(tabBot, Fc.r, tw * (1 - 2 * s)), z = 0.5 + (i % 2 ? 2.8 + 2.2 * hash(i * 5 + 3, 8) : 0); TV.push(SP([c[0], c[1], c[2] - z + 0.5 * Math.sin(2 * PI * wv + s * 4)])); }
    add2(tD + 3, () => poly2(TV, (b, u, v, X, Y) => (Math.abs(u - 0.5) < 0.05 && v < 0.85 ? rcol(RRED, 3, -1) : rcol(RRED, b, 0))));
    add2(tD + 4, () => ell2(SP(mad(mad(P, Fp.u, 1.9), Fp.f, 3.4 * k)), 1.6 * R, 1.1 * R, (b) => rcol(RSTL, b, 0)));          // kemer tokası
    // --- omuz pelerin yakası ve kollar ---
    const sh0 = Q.sho[0], sh1 = Q.sho[1];
    add2(D(Q.N) + 1, () => ell2(SP(mad(Q.N, Fc.u, -0.6)), 6.4 * k * R * Math.max(0.55, 1 - Math.abs(fr) * 0.35), 3.2 * k * R, (b) => rcol(RCLK, b, 0)));
    for (let i = 0; i < 2; i++) {
      const S = Q.sho[i], arm = Q.arm[i], ad = D(arm.E);
      add2(ad + 2, () => { cap2(SP(S), SP(arm.E), 1.9 * k * R, 1.6 * k * R, (b) => rcol(RCLK, b, 0)); cap2(SP(arm.E), SP(arm.W), 1.6 * k * R, 1.35 * k * R, (b) => rcol(RCLK, b, 0)); cap2(SP(arm.W), SP(mad(arm.hand, arm.Fa, 0.9)), 1.45 * k * R, 1.3 * k * R, (b) => rcol(RARM, b, -1)); });
    }
    // --- meşale (sol el) ---
    const hl = Q.arm[1].hand, td = nrm([-0.12, 0.06, 1]), tb = mad(hl, td, -1.6), tt = mad(hl, td, 8.8);
    add2(D(hl) + 4, () => { cap2(SP(tb), SP(tt), 0.8 * R, 0.75 * R, (b) => rcol(RWOOD, b, 0)); ell2(SP(mad(tt, td, 0.5)), 1.5 * R, 1.2 * R, (b) => rcol(RBLK, b, 1)); });
    // --- kılıç (sağ el) ---
    const hr = Q.arm[0].hand, b = bladeDir, g = nrm(cross(b, Math.abs(b[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0])), Lb = 18, gw = 3.3, gc = mad(hr, b, 1.6);
    add2(D(hr) + 5, () => {
      cap2(SP(mad(hr, b, -2)), SP(mad(hr, b, 1.5)), 0.8 * R, 0.8 * R, (bb) => rcol(RBLK, bb, 1));
      cap2(SP(mad(gc, g, -gw)), SP(mad(gc, g, gw)), 0.75 * R, 0.75 * R, (bb) => rcol(RSTL, bb, -1));
      cap2(SP(mad(hr, b, 2.2)), SP(mad(hr, b, 2.2 + Lb)), 1.05 * R, 0.5 * R, (bb, nx) => (Math.abs(nx) < 0.2 ? [60, 50, 66] : rcol([[18, 14, 23], [42, 35, 48], [75, 68, 82], [141, 130, 148]], bb + 1, 0)));
      ell2(SP(hr), 1.7 * R, 1.7 * R, (bb) => rcol(RARM, bb, 0));
    });
    // --- baş: kapüşon, atkı yakası, çelik miğfer, T siperlik ---
    const hD = D(Q.Hc), hc = SP(mad(Q.Hc, Fh.u, 0.5)), hood = SP(mad(mad(Q.Hc, Fh.f, -1.1), Fh.u, -0.4));
    add2(D(Q.N), () => cap2(SP(mad(Q.N, Fc.u, -1)), SP(mad(Q.N, Fh.u, 2.2)), 1.9 * k * R, 1.7 * k * R, (bb) => rcol(RBLK, bb, 1)));
    add2(hD + (fr < -0.25 ? 6 : -2), () => ell2(hood, 4.7 * k * R, 5.1 * k * R, (bb) => rcol(RCLK, bb, 0)));
    add2(hD + 1 + (fr < -0.25 ? 0 : 0), () => ell2(SP(mad(mad(Q.N, Fc.u, -0.4), Fc.f, 0.4)), 3.9 * k * R, 1.7 * k * R, (bb) => rcol(RCLK, bb, bb === 2 ? -1 : 0)));        // atkı
    if (fr >= -0.25 || fh > -0.2) add2(hD + 2, () => {
      const rx = 3.05 * k * R, ry = 4.4 * k * R, vis = fh > 0.12, fx = fhx * 0.9;
      ell2(hc, rx, ry, (bb, nx, ny) => {
        if (vis) { const x2 = nx - fx, slit = ny > -0.3 && ny < 0.0 && Math.abs(x2) < 0.78, bar = Math.abs(x2) < 0.15 && ny > -0.3 && ny < 0.72; if (slit || bar) return [14, 10, 18]; }
        if (ny < -0.58 && ny > -0.68) return rcol(RSTL, 3, 0); if (ny > 0.82) return rcol(RSTL, 0, 0); return rcol(RSTL, bb + (bb ? 0 : 0), -0 + (nx * LS[0] < 0 ? 0 : -1));
      });
      cap2(SP(mad(Q.Hc, Fh.u, 4.3 * k)), SP(mad(Q.Hc, Fh.u, 6.5 * k)), 0.8 * R, 0.45 * R, (bb) => rcol(RSTL, bb, 0));
    });
    parts.sort((a, c) => a[0] - c[0]); PD = 0; parts.forEach(q => q[1]());
    return { th: [0, 0], torch: proj(tt) };
  }

  /* ---------- sprite önbelleği ---------- */
  const cache = new Map(), NDIR = 16, KMAX = 1500;
  const dirB = a => ((Math.round(a / (2 * PI / NDIR)) % NDIR) + NDIR) % NDIR;
  function getSpr(key, a, build) {
    let s = cache.get(key);
    if (s) { cache.delete(key); cache.set(key, s); return s; }
    s = render(a, build); cache.set(key, s);
    if (cache.size > KMAX) cache.delete(cache.keys().next().value);
    return s;
  }
  const flash = s => s.h || (s.h = tint(s.c, '#ffffff', 0.7));
  const phB = (ph, n) => Math.floor(((ph % 1) + 1) % 1 * n);
  const ang = d => d * 2 * PI / NDIR;

  /* knight: o = { m: idle|move|jump|att, ph, t, kind, c, jp, br } */
  function knight(a, o) {
    const d = dirB(a); let key = 'k' + ST + (MODE2D ? 'f' : '') + '_' + d + o.m;
    const q = Object.assign({}, o);
    if (o.m === 'move') { q.pb = phB(o.ph, 12); q.ph = (q.pb + 0.5) / 12; key += q.pb; }
    else if (o.m === 'att') { if (o.kind) { const st = o.kind === 'spin' ? 0.05 : 0.025; q.t = Math.floor(o.t / st) * st + st / 2; key += o.kind + Math.floor(o.t / st); } else { q.c = Math.round(o.c * 4) / 4; key += 'c' + q.c * 4; } }
    else if (o.m === 'jump') key += o.jp; else key += (q.br = o.br | 0);
    return getSpr(key, ang(d), () => buildKnight(q));
  }
  function zombie(a, o) {
    const d = dirB(a); let key = 'z' + o.v + '_' + d + o.m; const q = Object.assign({}, o);
    if (o.m === 'walk') { q.pb = phB(o.ph, 10); q.ph = (q.pb + 0.5) / 10; key += q.pb; } else if (o.m === 'bite') key += (q.br = o.br | 0);
    return getSpr(key, ang(d), () => buildZombie(q));
  }
  /* boşta kalan zamanda yürüyüş sprite'larını hazırlar */
  let queue = null, qi = 0;
  function prewarm(ms) {
    if (!queue) { queue = []; for (let d = 0; d < NDIR; d++) { for (let k = 0; k < 12; k++) queue.push(() => knight(ang(d), { m: 'move', ph: (k + 0.5) / 12 })); queue.push(() => knight(ang(d), { m: 'idle', br: 0 })); for (let v = 0; v < 5; v++) { for (let k = 0; k < 10; k++) queue.push(() => zombie(ang(d), { v, m: 'walk', ph: (k + 0.5) / 10 })); queue.push(() => zombie(ang(d), { v, m: 'bite', br: 0 })); } } }
    const t0 = performance.now();
    while (qi < queue.length && performance.now() - t0 < ms) queue[qi++]();
  }
  function knightDead(a, o) { const d = dirB(a), q = Object.assign({}, o, { m: 'dead' }); return getSpr('kd' + ST + (MODE2D ? 'f' : '') + '_' + d + '_' + o.fd + '_' + o.tb + '_' + (o.dv | 0), ang(d), () => buildKnight(q)); }
  function knightHit(a, o) { const d = dirB(a), q = Object.assign({}, o, { m: 'hit' }); return getSpr('kh' + ST + (MODE2D ? 'f' : '') + '_' + d + '_' + o.tb, ang(d), () => buildKnight(q)); }
  function zombieHit(a, o) { const d = dirB(a), q = Object.assign({}, o, { m: 'hit' }); return getSpr('zh' + o.v + '_' + d + '_' + o.tb, ang(d), () => buildZombie(q)); }
  function zombieDead(a, o) { const d = dirB(a), q = Object.assign({}, o, { m: 'dead' }); return getSpr('zd' + o.v + '_' + d + '_' + o.fd + '_' + o.tb + '_' + (o.dv | 0), ang(d), () => buildZombie(q)); }
  /* çürüme: 10 aşamalı grotesk bozulma (yeşil-mor çürük, şişkinlik kabarcıkları, kurtçuklar, kenardan çözülen sümüksü doku) */
  function rot(spr, st) {
    spr._rot = spr._rot || [];
    if (spr._rot[st]) return spr._rot[st];
    const k = (st + 0.5) / 10, w = spr.c.width, h = spr.c.height, src = spr.c.getContext('2d').getImageData(0, 0, w, h), out = mk(w, h), og = out.getContext('2d'), dst = og.createImageData(w, h), A = src.data, D = dst.data;
    const nn = (x, y) => vnoise(x / 5 + st * 0.7, y / 5) * 0.55 + hash(x + st * 13, y) * 0.45, thr = k * 1.15;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (!A[i + 3]) continue;
      const n = nn(x, y); if (n < thr) continue;
      let R = A[i], G = A[i + 1], B2 = A[i + 2];
      if (n < thr + 0.08) { R = 30; G = 24; B2 = 18; }                                         // sümüksü kenar
      else {
        const g = Math.min(1, k * 2.3) * 0.72, dk = Math.max(0, k - 0.4) * 1.1;
        R = R + (96 - R) * g; G = G + (112 - G) * g; B2 = B2 + (60 - B2) * g;
        R *= 1 - dk; G *= 1 - dk; B2 *= 1 - dk;
        if (vnoise(x / 6 + 5, y / 6) > 0.64) { R = R * 0.5 + 34; G = G * 0.4 + 14; B2 = B2 * 0.5 + 30; }          // mor-siyah çürük lekeleri
        if (k > 0.1 && k < 0.88 && vnoise(x / 2.3 + st * 1.9, y / 2.3 + 9) > 0.82) { R = 192; G = 198; B2 = 84; }     // irin kabarcıkları
        else if (k > 0.3 && hash(x * 3 + st, y * 7) > 0.986) { R = 224; G = 218; B2 = 190; }                         // kurtçuk
      }
      D[i] = R; D[i + 1] = G; D[i + 2] = B2; D[i + 3] = 255;
    }
    og.putImageData(dst, 0, 0); return (spr._rot[st] = { c: out, ox: spr.ox, oy: spr.oy });
  }
  function setStage(n) { ST = n; queue = null; qi = 0; }
  return { knight, zombie, knightDead, zombieDead, zombieHit, knightHit, mode2d: v => { if (v !== undefined) { MODE2D = !!v; cache.clear(); } return MODE2D; }, rot, setStage, get stage() { return ST; }, flash, prewarm, G_JOG, G_WALK, G_ZOM, stepJog: stepOf(G_JOG), stepZom: stepOf(G_ZOM), dirB, ang, render, buildKnight, buildZombie, cache, get done() { return queue && qi >= queue.length; } };
})();
