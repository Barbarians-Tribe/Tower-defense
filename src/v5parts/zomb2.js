  /* ---------- ZOMBİ (1. seviye): 5 farklı köylü. Katmanlı: iskelet > deri > giysi (delikli, yırtık kenarlı) > saç telleri ---------- */
  const ZT = [{ n: 'erkek', H: 40, w: 1.0 }, { n: 'kadın-başörtülü', H: 37, w: 0.92 }, { n: 'şişman', H: 38, w: 1.55 }, { n: 'kadın-topuz', H: 38, w: 0.9 }, { n: 'sırık', H: 41, w: 0.95 }];
  const ZK = ZT.map(t => { const b = body(t.H); b.hw *= Math.max(1, t.w * 0.9); return b; });
  const ZSK = rp(['#2b2631', '#4d4757', '#766f80', '#9a93a3']), ZSK2 = rp(['#262a2c', '#464d4d', '#6d7571', '#8f968f']), WND = rp(['#1a070c', '#42141f', '#6e2634', '#9a4450']);
  const ZR = { white: rp(['#26232b', '#4f4a55', '#837c85', '#b3acb0']), brown: rp(['#16100f', '#33251f', '#533d31', '#745845']), pant: rp(['#12100f', '#272019', '#443a30', '#62564a']), grey: rp(['#26252c', '#4a4850', '#757380', '#9c9aa5']), skirt: rp(['#17110f', '#33261f', '#523f33', '#725a49']), dark: rp(['#0b090d', '#17121b', '#2b2231', '#413646']), boot: rp(['#0d0908', '#211713', '#3d2b22', '#5a4132']) };
  const HAIR = [rp(['#0b080c', '#1a1318', '#2e2229', '#4a3a40']), rp(['#14100e', '#2a221d', '#463a31', '#6a5a4c']), rp(['#08060a', '#140f13', '#251c22', '#3b2f35']), rp(['#120c0b', '#261a16', '#43302a', '#664a3e']), rp(['#14131a', '#2a2933', '#4d4c58', '#767482'])];
  const G_ZOM = { duty: 0.64, reach: 7, lift: 2.0, hip: 19.0, bob: 0.7, sign: 1, pyaw: 6, cyaw: 7, roll: 4.5, sway: 1.6, lean: 8, push: 16 };
  const ZA = { r: { flex: 76, abd: 8, elb: 34, amp: 8, eamp: 8 }, l: { flex: 68, abd: 12, elb: 48, amp: 8, eamp: 8 } };
  const ZBITE = { r: { flex: 92, abd: 18, elb: 14, amp: 0 }, l: { flex: 86, abd: 22, elb: 24, amp: 0 } };
  function zombiePoseOf(o) {
    const B = ZK[o.v], lim = { reach: 0.72, lift: 0.4, drag: 22, toe: 22 }, limpSide = o.v % 2;
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
    return gaitP(B, G, o.ph, ZA, { dip: -0.2, lean: G.lean, hcomp: -0.5, hp: 5, hr: -5, croll: 3, limp: limpSide, lim });
  }
  /* saç telleri: kafa derisinden çıkan ince, yerçekimiyle kıvrılan, yürüyüşle hafif sallanan tel kümeleri */
  function strands(Hc, Fh, v, n, cfg, ph, moving) {
    const hr = HAIR[v], rad = [2.85, 3.25, 3.85];
    for (let k = 0; k < n; k++) {
      const az = (hash(k, 31 + v) * 2 - 1) * PI * (cfg.az || 1), el = cfg.e0 + hash(k, 32 + v) * (cfg.e1 - cfg.e0), ce = Math.cos(el);
      const ux = ce * Math.sin(az), uy = ce * Math.cos(az), uz = Math.sin(el);
      if (cfg.nf && uy > 0.45 && uz < cfg.nf) continue;
      const root = add(Hc, loc(Fh, [ux * rad[0] * 0.97, uy * rad[1] * 0.97 - (uy < 0 ? 0.2 : 0), uz * rad[2] * 0.97])), len = cfg.l0 + hash(k, 33 + v) * (cfg.l1 - cfg.l0);
      let dir = nrm(loc(Fh, [ux * cfg.out, uy * cfg.out - (cfg.back || 0), uz * cfg.out + 0.15])), q0 = root;
      for (let i = 1; i <= 3; i++) {
        const sw = Math.sin(ph * 6.2832 * 2 + k * 0.9 + i) * cfg.sw * i * 0.14, lag = (moving ? -0.22 : 0) * i;
        dir = nrm(add(add(dir, [sw, lag * 0.4 + sw * 0.3, -cfg.g * 0.3 * i * 0.5 - 0.0]), [0, 0, 0]));
        const q1 = mad(q0, dir, len / 3);
        cap(q0, q1, 0.36 * (1 - 0.2 * i) + 0.05, 0.3 * (1 - 0.22 * i) + 0.04, c => pick(hr, c.sh + (hq(c.X, c.Y, k) - 0.5) * 0.3 + (k % 5 === 0 ? 0.12 : 0), 0.1), { rim: 0.3, spec: 0.35 });
        q0 = q1;
      }
    }
  }
  function buildZombie(o) {
    const T = ZT[o.v], v = o.v, w = T.w, B = ZK[v], p = zombiePoseOf(o), Q = pose(B, p), { Fc, Fp, Fh, P } = Q, bite = o.m === 'bite', skirt = v === 1 || v === 3;
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
    if (v === 0) strands(Q.Hc, Fh, v, 46, { e0: 0.2, e1: 1.35, l0: 1.8, l1: 3.4, out: 1.0, g: 0.7, sw: 0.5, nf: 0.75, back: 0 }, ph, moving);
    if (v === 2) strands(Q.Hc, Fh, v, 44, { e0: 0.3, e1: 1.35, l0: 1.6, l1: 2.7, out: 1.0, g: 0.6, sw: 0.4, nf: 0.8 }, ph, moving);
    if (v === 4) strands(Q.Hc, Fh, v, 42, { e0: 0.1, e1: 1.35, l0: 2.6, l1: 5.0, out: 0.8, g: 1.3, sw: 0.8, nf: 0.45 }, ph, moving);
    if (v === 3) {
      strands(Q.Hc, Fh, v, 34, { e0: 0.35, e1: 1.3, l0: 1.6, l1: 3.0, out: 0.9, g: 0.3, sw: 0.3, nf: 0.85, back: 0.6 }, ph, moving);
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

