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
