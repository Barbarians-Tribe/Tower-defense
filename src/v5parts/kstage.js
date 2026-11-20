  function buildKnight(o) {
    const stg = ST, p = knightPoseOf(o), B = BKS[stg - 1], Q = pose(B, p), { Fc, Fp, Fh, P } = Q;
    const bladeDir = kneePoseBlade(Q, o, p._k), run = o.m === 'move' ? 1 : 0, spinF = o.m === 'att' && o.kind === 'spin' ? 1 : 0, ph = o.ph || 0;
    const S2 = stg >= 2, S3 = stg >= 3, S4 = stg >= 4, S5 = stg >= 5, k = B.H / 40;
    // --- bacaklar (zırhlı tozluk, diz plakası, çizme) ---
    for (let i = 0; i < 2; i++) {
      const L = Q.leg[i], toe = mad(L.A, L.fd, 4.7 * k);
      cap(L.Hp, L.K, 2.9 * k, 2.1 * k, M(RARM, 0.05), { rim: 0.3 });
      cap(L.K, L.A, 2.0 * k, 1.55 * k, M(RARM, 0.1), { rim: 0.3 });
      ell(mad(L.K, L.fd, 0.6), null, [2.1 * k, 2.2 * k, 2.0 * k], c => pick(S2 && c.qy > 0.5 && Math.abs(c.qz) < 0.3 ? RRED : RSTL, c.sh - 0.12, bay(c.X, c.Y) * 0.8), { spec: 0.3 });
      cap(mad(L.A, L.fd, -1.4), toe, 1.7 * k, 1.3 * k, M(RBLK, 0.15), { rim: 0.35 });
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
      return pick(rp(['#241f2b', '#4b4452', '#8d8294', '#c4bacb']), c.sh, bay(c.X, c.Y) * 0.8);
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
      let col = pick(RCLK, clamp(c.sh * 0.9 - (c.side < 0 ? 0.08 : 0) + Math.sin(c.cu * 38 + c.cv * 3) * 0.05, 0, 1), bay(c.X, c.Y) * 0.9);
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
      return mid < 0.18 && c.cv > 0.25 ? RRED[0] : pick(RRED, clamp(c.sh * 0.9 - mid * 0.1, 0, 1), bay(c.X, c.Y) * 0.9);
    }, { rim: 0.15 });
    // --- kızıl alev dalgaları (3. evreden itibaren): omuz, pelerin kenarı, 5. evrede yer alevi ---
    if (S3) {
      const nW = [0, 0, 7, 12, 20][stg - 1], tm = ph * 6.2832;
      for (let q = 0; q < nW; q++) {
        const sd = hash(q, 11) < 0.5 ? -1 : 1, u = 4 + hash(q, 12) * 36 * k, rr = sd * (6.5 + hash(q, 13) * 5), ff = -2 - hash(q, 14) * 4, fl = Math.sin(tm * 2 + q) * 0.8;
        ell([rr + fl, ff, u], null, [0.8, 0.8, 1.9 + hash(q, 15) * 1.5], c => pick(RRED, 0.35 + 0.6 * hq(c.X, c.Y, q) + c.sh * 0.2, 0), { rim: 0 });
      }
      if (S5) for (let q = 0; q < 16; q++) ell([(hash(q, 21) - 0.5) * 22, (hash(q, 22) - 0.5) * 10, 1 + hash(q, 23) * 4], null, [1.2, 1.2, 2.2 + hash(q, 24) * 2.4], c => pick(RRED, 0.4 + 0.6 * hq(c.X, c.Y, q), 0), { rim: 0 });
    }
    return { th: proj(mad(tt, td, 0.2)) };
  }
  const sway = (q, ph) => Math.sin(ph * 6.2832 + q) * 0.3 * q * 0.15;

