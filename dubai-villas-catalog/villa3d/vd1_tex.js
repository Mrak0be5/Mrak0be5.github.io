// Текстуры виллы: цвет, рельеф (карта нормалей из карты высот) и шероховатость, нарисованные кодом на canvas.
// Каждый набор можно заменить фотоскан-текстурой (Poly Haven, CC0): opts.images[key] = { base, meters } —
// тогда грузятся base + '_col.webp', '_nrm.webp', '_rgh.webp'.
// Ключ набора → { map, normalMap, roughnessMap, normalScale } с повтором в метрах (развёртка модели — мировые метры).

export function makeTextures(THREE, opts = {}) {
  const hi = opts.quality !== 'low';
  const S = (n) => (hi ? n : Math.max(128, n >> 1));
  let seed = 20261106;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rr = (a, b) => a + (b - a) * rnd();

  const canvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rgb = (r, g, b, a = 1) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
  const grey = (v, a = 1) => rgb(v * 255, v * 255, v * 255, a);

  function tex(c, srgb, meters, mw = meters) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    t.repeat.set(1 / mw, 1 / meters);
    return t;
  }
  // карта нормалей из высот: Собель с переносом через край (текстура бесшовная)
  function normalFromHeight(hc, strength) {
    const w = hc.width, h = hc.height;
    const src = hc.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const H = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) H[i] = src[i * 4] / 255;
    const out = canvas(w, h);
    const octx = out.getContext('2d');
    const img = octx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      const ym = ((y - 1 + h) % h) * w, y0 = y * w, yp = ((y + 1) % h) * w;
      for (let x = 0; x < w; x++) {
        const xm = x === 0 ? w - 1 : x - 1, xp = x === w - 1 ? 0 : x + 1;
        const dx = (H[ym + xp] + 2 * H[y0 + xp] + H[yp + xp] - H[ym + xm] - 2 * H[y0 + xm] - H[yp + xm]) * strength;
        const dy = (H[yp + xm] + 2 * H[yp + x] + H[yp + xp] - H[ym + xm] - 2 * H[ym + x] - H[ym + xp]) * strength;
        const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y0 + x) * 4;
        d[i] = (-dx * inv * 0.5 + 0.5) * 255;
        d[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
        d[i + 2] = (inv * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return out;
  }
  // мелкий шум прямо в пикселях: доля пикселей n/(w·h) получает сдвиг яркости ±spread (зерно в 1–2 пикселя);
  // tint(v) — цветной сдвиг вместо серого (возвращает [r,g,b] множители)
  function grain(ctx, w, h, n, spread, size = 2, tint = null) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const frac = Math.min(1, n / (w * h)), big = size > 1.6;
    for (let y = 0; y < h; y += big ? 2 : 1) for (let x = 0; x < w; x += big ? 2 : 1) {
      if (rnd() > frac * (big ? 2.2 : 1)) continue;
      const v = (rnd() - 0.5) * spread * 255 * 1.6;
      const [kr, kg, kb] = tint ? tint(v) : [1, 1, 1];
      for (let yy = 0; yy < (big ? 2 : 1); yy++) for (let xx = 0; xx < (big ? 2 : 1); xx++) {
        const i = (((y + yy) % h) * w + ((x + xx) % w)) * 4;
        d[i] = Math.max(0, Math.min(255, d[i] + v * kr));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + v * kg));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + v * kb));
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  // мягкие пятна (неровность тона и крупный рельеф)
  function blotches(ctx, w, h, n, r0, r1, spread) {
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, r = rr(r0, r1), v = (rnd() - 0.5) * spread;
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }
  function veins(ctx, w, h, n, color, width) {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      ctx.lineWidth = width * (0.3 + rnd());
      ctx.beginPath();
      let x = rnd() * w, y = -10;
      ctx.moveTo(x, y);
      const dir = rr(-0.4, 0.4);
      while (y < h + 10) { x += (rnd() - 0.5 + dir) * w * 0.08; y += h * (0.03 + rnd() * 0.07); ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  // набор: draw(c, hgt, rough, w, h) рисует согласованно цвет, высоту (серый, 0.5 — середина) и шероховатость
  function set(key, { size, h = size, meters, mw = meters, rough = 0.8, bump = 2, draw }) {
    const C = canvas(size, h), Hh = canvas(size, h), R = canvas(size, h);
    const c = C.getContext('2d'), hg = Hh.getContext('2d'), r = R.getContext('2d');
    hg.fillStyle = grey(0.5); hg.fillRect(0, 0, size, h);
    r.fillStyle = grey(rough); r.fillRect(0, 0, size, h);
    draw(c, hg, r, size, h);
    const k = size / 512;
    return { key, map: tex(C, true, meters, mw), normalMap: tex(normalFromHeight(Hh, bump / k), false, meters, mw), roughnessMap: tex(R, false, meters, mw), normalScale: 1 };
  }

  const T = {};
  const lazy = (key, make) => Object.defineProperty(T, key, { enumerable: true, configurable: true, get() { const v = make(); Object.defineProperty(T, key, { value: v, enumerable: true }); return v; } });

  // ---------- фасад ----------
  // бежевая штукатурка «под шубу»: мелкое зерно, следы кельмы, лёгкие разводы тона (фото фасада)
  lazy('render', () => set('render', {
    size: S(1024), meters: 2.4, rough: 0.9, bump: 1.6, draw(c, hg, r, w, h) {
      c.fillStyle = '#c9c1ad'; c.fillRect(0, 0, w, h);
      blotches(c, w, h, 26, w * 0.05, w * 0.22, 0.07);
      blotches(hg, w, h, 40, w * 0.03, w * 0.12, 0.12);
      grain(c, w, h, w * w * 0.12, 0.07, 1.5);
      grain(hg, w, h, w * w * 0.3, 0.55, 1.4);
      for (let i = 0; i < 60; i++) { // дуги кельмы
        const x = rnd() * w, y = rnd() * h, rad = rr(w * 0.04, w * 0.12);
        hg.strokeStyle = grey(rnd() > 0.5 ? 0.6 : 0.42, 0.35); hg.lineWidth = rr(1, 3) * (w / 512);
        hg.beginPath(); hg.arc(x, y, rad, rr(0, 6), rr(0, 6) + rr(0.6, 1.6)); hg.stroke();
      }
      grain(r, w, h, w * w * 0.08, 0.12, 2);
    }
  }));
  // белая штукатурка соседних домов и перголы
  lazy('renderWhite', () => set('renderWhite', {
    size: S(512), meters: 2.4, rough: 0.88, bump: 1.4, draw(c, hg, r, w, h) {
      c.fillStyle = '#ebe8e1'; c.fillRect(0, 0, w, h);
      blotches(c, w, h, 20, w * 0.05, w * 0.22, 0.04);
      grain(c, w, h, w * w * 0.1, 0.05, 1.5);
      grain(hg, w, h, w * w * 0.3, 0.5, 1.4);
    }
  }));
  // «рваный» камень тонкими рядами: плитки сланца с неровными краями, коричнево-красные, серые и бежевые,
  // часть выступает, швы глубокие и тёмные (пилон у гольфа на фото фасада)
  lazy('stone', () => set('stone', {
    size: S(1024), meters: 1.0, rough: 0.9, bump: 6.5, draw(c, hg, r, w, h) {
      c.fillStyle = '#2e2520'; c.fillRect(0, 0, w, h);
      hg.fillStyle = grey(0.06); hg.fillRect(0, 0, w, h);
      let y = 0;
      while (y < h) {
        const rowH = Math.round(rr(0.013, 0.038) * h);
        let x = -rr(0, 0.2) * w;
        while (x < w) {
          const sw = rr(0.06, 0.32) * w, t = rnd(), kind = rnd();
          const col = kind < 0.22 ? [118 + t * 46, 112 + t * 40, 104 + t * 36] : kind < 0.55 ? [134 + t * 50, 80 + t * 28, 56 + t * 20] : kind < 0.8 ? [102 + t * 44, 66 + t * 24, 48 + t * 18] : [150 + t * 40, 128 + t * 30, 98 + t * 26];
          const g = Math.max(1, (w / 512) * rr(1.0, 2.4));
          const jt = () => rr(-0.18, 0.18) * rowH;
          const quad = [[x + g + rr(0, 4), y + g + jt()], [x + sw - g - rr(0, 4), y + g + jt()], [x + sw - g - rr(0, 6), y + rowH - g + jt()], [x + g + rr(0, 6), y + rowH - g + jt()]];
          const lift = rr(0.45, 1);
          for (const ox of [0, w, -w]) {
            if (x + ox + sw < 0 || x + ox > w) continue;
            const path = (ctx) => { ctx.beginPath(); quad.forEach(([qx, qy], k) => (k ? ctx.lineTo(qx + ox, qy) : ctx.moveTo(qx + ox, qy))); ctx.closePath(); };
            c.fillStyle = rgb(col[0], col[1], col[2]); path(c); c.fill();
            for (let k = 0; k < 5; k++) { // слоистость и пятна на сколе
              c.fillStyle = rgb(col[0] + rr(-30, 30), col[1] + rr(-20, 20), col[2] + rr(-16, 16), 0.3);
              c.fillRect(x + ox + g + rnd() * sw * 0.7, y + g + rnd() * rowH * 0.6, sw * rr(0.08, 0.4), Math.max(1, rowH * rr(0.08, 0.3)));
            }
            const gh = hg.createLinearGradient(0, y, 0, y + rowH);
            gh.addColorStop(0, grey(lift * 0.7)); gh.addColorStop(0.25, grey(lift)); gh.addColorStop(1, grey(lift * 0.62));
            hg.fillStyle = gh; path(hg); hg.fill();
            r.fillStyle = grey(rr(0.7, 0.95)); path(r); r.fill();
            c.fillStyle = 'rgba(255,236,214,0.14)'; c.fillRect(x + ox + g, y + g, sw - 2 * g, Math.max(1, rowH * 0.1));
            c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + ox + g, y + rowH * 0.8, sw - 2 * g, rowH * 0.2);
          }
          x += sw;
        }
        y += rowH;
      }
      grain(c, w, h, w * w * 0.3, 0.14, 1.2);
      grain(hg, w, h, w * w * 0.4, 0.22, 1.2);
    }
  }));
  // облицовка «под кирпич» у навеса
  lazy('brick', () => set('brick', {
    size: S(512), meters: 0.9, rough: 0.9, bump: 3, draw(c, hg, r, w, h) {
      c.fillStyle = '#7a675a'; c.fillRect(0, 0, w, h);
      hg.fillStyle = grey(0.2); hg.fillRect(0, 0, w, h);
      const rows = 13, bw = w / 4, bh = h / rows;
      for (let i = 0; i < rows; i++) for (let j = -1; j < 5; j++) {
        const t = rnd(), x = j * bw + (i % 2) * bw / 2, m = w / 170;
        c.fillStyle = rgb(128 + t * 44, 74 + t * 28, 56 + t * 20);
        c.fillRect(x + m, i * bh + m, bw - 2 * m, bh - 2 * m);
        hg.fillStyle = grey(rr(0.62, 0.8)); hg.fillRect(x + m, i * bh + m, bw - 2 * m, bh - 2 * m);
      }
      grain(c, w, h, w * w * 0.2, 0.16, 1.6);
      grain(hg, w, h, w * w * 0.2, 0.25, 1.5);
    }
  }));
  // бетон террасы и крыльца: серый, мелкие поры, деформационные швы через 1,5 м
  lazy('concrete', () => set('concrete', {
    size: S(1024), meters: 3.0, rough: 0.82, bump: 1.8, draw(c, hg, r, w, h) {
      c.fillStyle = '#b7b3aa'; c.fillRect(0, 0, w, h);
      blotches(c, w, h, 40, w * 0.03, w * 0.16, 0.08);
      grain(c, w, h, w * w * 0.2, 0.08, 1.4);
      grain(hg, w, h, w * w * 0.12, 0.3, 1.2);
      for (let i = 0; i < w * 3; i++) { const x = rnd() * w, y = rnd() * h; hg.fillStyle = grey(0.2); hg.fillRect(x, y, 1.5, 1.5); c.fillStyle = 'rgba(70,66,60,0.35)'; c.fillRect(x, y, 1.5, 1.5); }
      for (const p of [0, 0.5]) { // швы
        c.fillStyle = 'rgba(80,76,70,0.7)'; c.fillRect(p * w, 0, w / 300, h); c.fillRect(0, p * h, w, h / 300);
        hg.fillStyle = grey(0.05); hg.fillRect(p * w, 0, w / 300, h); hg.fillRect(0, p * h, w, h / 300);
      }
      blotches(r, w, h, 30, w * 0.04, w * 0.15, 0.12);
    }
  }));
  // голый двор: серый гравий с мелким грунтом (фото с гольфа и фасада)
  lazy('gravel', () => set('gravel', {
    size: S(1024), meters: 1.6, rough: 0.95, bump: 4.5, draw(c, hg, r, w, h) {
      c.fillStyle = '#8c877e'; c.fillRect(0, 0, w, h);
      hg.fillStyle = grey(0.3); hg.fillRect(0, 0, w, h);
      blotches(c, w, h, 30, w * 0.04, w * 0.14, 0.1);
      const n = Math.round(w * w * 0.0075);
      for (let i = 0; i < n; i++) {
        const x = rnd() * w, y = rnd() * h, s = rr(0.7, 3.6) * (w / 512), t = rnd(), e = rr(0.6, 1), a = rr(0, 3);
        const g = t < 0.15 ? [168, 160, 146] : t < 0.5 ? [124, 120, 114] : [96 + t * 30, 92 + t * 28, 88 + t * 24];
        const hv = rr(0.62, 1);
        for (const [ox, oy] of [[0, 0], [w, 0], [0, h], [-w, 0], [0, -h]]) {
          const xx = x + ox, yy = y + oy;
          if (xx < -8 || xx > w + 8 || yy < -8 || yy > h + 8) continue;
          c.fillStyle = rgb(g[0], g[1], g[2]);
          c.beginPath(); c.ellipse(xx, yy, s, s * e, a, 0, 7); c.fill();
          c.fillStyle = 'rgba(255,250,240,0.2)';
          c.beginPath(); c.ellipse(xx - s * 0.25, yy - s * 0.3, s * 0.45, s * 0.3, 0, 0, 7); c.fill();
          hg.fillStyle = grey(hv * 0.8); hg.beginPath(); hg.ellipse(xx, yy, s, s * e, a, 0, 7); hg.fill();
          hg.fillStyle = grey(hv); hg.beginPath(); hg.ellipse(xx - s * 0.15, yy - s * 0.15, s * 0.6, s * 0.6 * e, a, 0, 7); hg.fill();
        }
      }
      grain(c, w, h, w * w * 0.1, 0.12, 1.2);
    }
  }));
  // бежевая брусчатка 0,2 × 0,1 вразбежку
  lazy('pavers', () => set('pavers', {
    size: S(1024), meters: 1.6, rough: 0.86, bump: 3.2, draw(c, hg, r, w, h) {
      c.fillStyle = '#6f6a62'; c.fillRect(0, 0, w, h);
      hg.fillStyle = grey(0.15); hg.fillRect(0, 0, w, h);
      const u = w / 8, v = h / 16;
      for (let i = 0; i < 16; i++) for (let j = -1; j < 9; j++) {
        const x = j * u + (i % 2) * u / 2, y = i * v, t = rnd(), m = w / 400;
        const base = 150 + t * 30;
        c.fillStyle = rgb(base + 6, base, base - 12);
        c.fillRect(x + m, y + m, u - 2 * m, v - 2 * m);
        const g = hg.createLinearGradient(x, y, x, y + v);
        g.addColorStop(0, grey(0.55)); g.addColorStop(0.15, grey(0.78)); g.addColorStop(0.85, grey(0.78)); g.addColorStop(1, grey(0.5));
        hg.fillStyle = g; hg.fillRect(x + m, y + m, u - 2 * m, v - 2 * m);
      }
      grain(c, w, h, w * w * 0.2, 0.1, 1.3);
      grain(hg, w, h, w * w * 0.2, 0.2, 1.2);
      blotches(c, w, h, 20, w * 0.05, w * 0.2, 0.08);
    }
  }));
  lazy('asphalt', () => set('asphalt', {
    size: S(512), meters: 3.0, rough: 0.9, bump: 2.2, draw(c, hg, r, w, h) {
      c.fillStyle = '#4a4c4f'; c.fillRect(0, 0, w, h);
      blotches(c, w, h, 20, w * 0.05, w * 0.25, 0.08);
      grain(c, w, h, w * w * 0.35, 0.2, 1.6);
      grain(hg, w, h, w * w * 0.4, 0.6, 1.6);
    }
  }));
  lazy('sand', () => set('sand', { // песок бункеров со следами грабель
    size: S(512), meters: 3.0, rough: 0.95, bump: 1.4, draw(c, hg, r, w, h) {
      c.fillStyle = '#d8c39b'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += h / 48) { hg.fillStyle = grey(0.55); hg.fillRect(0, y, w, h / 120); c.fillStyle = 'rgba(160,130,90,0.08)'; c.fillRect(0, y, w, h / 140); }
      grain(c, w, h, w * w * 0.4, 0.12, 1.2);
      grain(hg, w, h, w * w * 0.3, 0.3, 1.2);
    }
  }));
  // трава: стрижка полосами у фервея, ровный газон, сухой «раф»
  function turf(key, base, blade, meters, stripes) {
    return set(key, {
      size: S(512), meters, rough: 0.95, bump: 2.5, draw(c, hg, r, w, h) {
        c.fillStyle = base; c.fillRect(0, 0, w, h);
        if (stripes) { c.fillStyle = 'rgba(255,255,230,0.09)'; c.fillRect(0, 0, w / 2, h); }
        blotches(c, w, h, 24, w * 0.04, w * 0.18, 0.1);
        for (let i = 0; i < w * w * 0.09; i++) {
          const [cr, cg, cb] = blade(rnd()), x = rnd() * w, y = rnd() * h, l = rr(2, 6) * (w / 512);
          c.fillStyle = rgb(cr, cg, cb, 0.6);
          c.fillRect(x, y, 1, l);
          hg.fillStyle = grey(rr(0.5, 1), 0.6); hg.fillRect(x, y, 1, l);
        }
      }
    });
  }
  lazy('fairway', () => turf('fairway', '#66903f', (t) => [70 + t * 34, 118 + t * 50, 48 + t * 22], 14, true));
  lazy('lawn', () => turf('lawn', '#5d8040', (t) => (t > 0.93 ? [150 + t * 30, 140 + t * 20, 80] : [62 + t * 34, 104 + t * 50, 44 + t * 22]), 2.0, false));
  lazy('rough', () => turf('rough', '#9c9a62', (t) => (t > 0.45 ? [185 + t * 40, 166 + t * 36, 104 + t * 30] : [96 + t * 40, 118 + t * 40, 56 + t * 20]), 3.0, false));
  lazy('soil', () => set('soil', { // сухая земля с мусором веточек у ограды
    size: S(512), meters: 2.0, rough: 0.97, bump: 3, draw(c, hg, r, w, h) {
      c.fillStyle = '#9a8a72'; c.fillRect(0, 0, w, h);
      blotches(c, w, h, 30, w * 0.04, w * 0.16, 0.12);
      grain(c, w, h, w * w * 0.25, 0.16, 1.8);
      grain(hg, w, h, w * w * 0.3, 0.5, 1.8);
      c.strokeStyle = 'rgba(90,70,50,0.5)';
      for (let i = 0; i < 120; i++) { c.lineWidth = rr(0.5, 1.6); c.beginPath(); const x = rnd() * w, y = rnd() * h, a = rr(0, 6), l = rr(4, 18); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    }
  }));
  // дерево и металл
  lazy('wenge', () => set('wenge', { // тёмный венге: плотная продольная текстура, поры
    size: S(512), meters: 1.0, rough: 0.5, bump: 1.2, draw(c, hg, r, w, h) {
      c.fillStyle = '#3a2a21'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const y = rnd() * h, t = rnd(), lw = rr(0.4, 2.4);
        c.fillStyle = t > 0.6 ? `rgba(18,10,6,${rr(0.15, 0.4)})` : `rgba(120,88,64,${rr(0.05, 0.16)})`;
        c.fillRect(0, y, w, lw);
        hg.fillStyle = grey(t > 0.6 ? 0.42 : 0.56, 0.6); hg.fillRect(0, y, w, lw);
      }
      for (let i = 0; i < w * 6; i++) { const x = rnd() * w, y = rnd() * h; c.fillStyle = 'rgba(10,6,4,0.4)'; c.fillRect(x, y, rr(3, 9), 0.8); hg.fillStyle = grey(0.3); hg.fillRect(x, y, rr(3, 9), 0.8); }
      grain(r, w, h, w * w * 0.05, 0.15, 3);
    }
  }));
  lazy('oak', () => set('oak', { // светлый дуб — ступени террасы соседей, перголы
    size: S(512), meters: 1.0, rough: 0.6, bump: 1, draw(c, hg, r, w, h) {
      c.fillStyle = '#b79a76'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 200; i++) { const y = rnd() * h; c.fillStyle = `rgba(110,80,50,${rr(0.04, 0.16)})`; c.fillRect(0, y, w, rr(0.5, 2.5)); hg.fillStyle = grey(0.45, 0.5); hg.fillRect(0, y, w, 1); }
    }
  }));
  lazy('rust', () => set('rust', { // кортен входной двери: медно-ржавые потёки, тёмные пятна
    size: S(512), meters: 1.4, rough: 0.6, bump: 1.6, draw(c, hg, r, w, h) {
      c.fillStyle = '#7d4430'; c.fillRect(0, 0, w, h);
      blotches(c, w, h, 50, w * 0.03, w * 0.14, 0.18);
      for (let i = 0; i < 500; i++) {
        const t = rnd();
        c.fillStyle = rgb(150 + t * 60, 80 + t * 40, 50 + t * 30, rr(0.08, 0.3));
        const x = rnd() * w, y = rnd() * h, l = rr(6, 60);
        c.fillRect(x, y, rr(1, 3), l);
        hg.fillStyle = grey(0.6, 0.4); hg.fillRect(x, y, 2, l);
      }
      grain(c, w, h, w * w * 0.2, 0.18, 1.5);
      grain(hg, w, h, w * w * 0.3, 0.4, 1.4);
      blotches(r, w, h, 40, w * 0.03, w * 0.12, 0.25);
    }
  }));
  lazy('brushed', () => set('brushed', { // шлифованная нержавейка и алюминий: продольные риски
    size: S(256), meters: 0.5, rough: 0.32, bump: 0.6, draw(c, hg, r, w, h) {
      c.fillStyle = '#cfd3d6'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { const y = rnd() * h, v = rnd(); hg.fillStyle = grey(0.4 + v * 0.2, 0.5); hg.fillRect(0, y, w, 0.6); r.fillStyle = grey(0.26 + v * 0.12, 0.5); r.fillRect(0, y, w, 0.6); c.fillStyle = `rgba(255,255,255,${v * 0.06})`; c.fillRect(0, y, w, 0.6); }
    }
  }));
  lazy('powder', () => set('powder', { // чёрный порошковый алюминий рам: мелкая шагрень
    size: S(256), meters: 0.4, rough: 0.48, bump: 0.8, draw(c, hg, r, w, h) {
      c.fillStyle = '#1d1f21'; c.fillRect(0, 0, w, h);
      grain(hg, w, h, w * w * 0.6, 0.4, 1.2);
      grain(r, w, h, w * w * 0.3, 0.1, 1.2);
    }
  }));
  lazy('darkPanel', () => set('darkPanel', { // тёмные панели рамы фасада (HPL): чуть заметная текстура и швы листов
    size: S(512), meters: 2.4, rough: 0.55, bump: 1.2, draw(c, hg, r, w, h) {
      c.fillStyle = '#2a2d2f'; c.fillRect(0, 0, w, h);
      blotches(c, w, h, 16, w * 0.06, w * 0.2, 0.05);
      grain(hg, w, h, w * w * 0.2, 0.15, 1.2);
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, w, h / 256); c.fillRect(0, 0, w / 256, h);
      hg.fillStyle = grey(0.1); hg.fillRect(0, 0, w, h / 256); hg.fillRect(0, 0, w / 256, h);
    }
  }));

  // ---------- интерьер ----------
  // полированный керамогранит 1,2 × 0,6 «под мрамор» вразбежку, шов 2 мм — зеркальный блеск, швы матовые
  function tile(key, { base, vein, meters, size, cols, rows, joint, gloss, veinN, mw }) {
    return set(key, {
      size, h: size, meters, mw, rough: gloss, bump: 1.2, draw(c, hg, r, w, h) {
        c.fillStyle = base; c.fillRect(0, 0, w, h);
        blotches(c, w, h, 30, w * 0.05, w * 0.22, 0.05);
        veins(c, w, h, veinN, vein, w / 300);
        veins(c, w, h, veinN * 2, vein.replace(/[\d.]+\)$/, '0.06)'), w / 120);
        grain(c, w, h, w * w * 0.04, 0.025, 1.2);
        const tw = w / cols, th = h / rows, jw = Math.max(1, joint * w);
        for (let i = 0; i < rows; i++) {
          const off = (i % 2) * tw / 2, y = i * th;
          for (let j = -1; j <= cols; j++) {
            const x = j * tw + off, t = rnd() - 0.5;
            c.fillStyle = `rgba(${t > 0 ? '255,255,255' : '0,0,0'},${Math.abs(t) * 0.05})`;
            c.fillRect(x, y, tw, th);
          }
          c.fillStyle = 'rgba(150,135,110,0.85)'; c.fillRect(0, y, w, jw);
          hg.fillStyle = grey(0.1); hg.fillRect(0, y, w, jw);
          r.fillStyle = grey(0.7); r.fillRect(0, y, w, jw);
          for (let j = 0; j <= cols; j++) {
            const x = j * tw + off;
            c.fillRect(x, y, jw, th); hg.fillRect(x, y, jw, th); r.fillRect(x, y, jw, th);
          }
        }
        grain(r, w, h, w * w * 0.02, 0.04, 3);
      }
    });
  }
  lazy('floor', () => tile('floor', { base: '#ece4d5', vein: 'rgba(170,150,120,0.16)', meters: 1.2, mw: 2.4, size: S(1024), cols: 2, rows: 2, joint: 0.0025, gloss: 0.07, veinN: 7 }));
  lazy('kitchenFloor', () => tile('kitchenFloor', { base: '#d9d8d4', vein: 'rgba(110,110,115,0.25)', meters: 1.2, size: S(512), cols: 2, rows: 2, joint: 0.004, gloss: 0.12, veinN: 8 }));
  lazy('bath', () => tile('bath', { base: '#d8c8aa', vein: 'rgba(140,115,85,0.3)', meters: 1.2, size: S(512), cols: 2, rows: 2, joint: 0.004, gloss: 0.18, veinN: 9 }));
  lazy('stair', () => tile('stair', { base: '#e2cfae', vein: 'rgba(160,130,95,0.25)', meters: 1.6, size: S(512), cols: 1, rows: 1, joint: 0.0005, gloss: 0.16, veinN: 6 }));
  lazy('paint', () => set('paint', { // матовая краска стен валиком: еле заметная «апельсиновая корка»
    size: S(512), meters: 1.2, rough: 0.88, bump: 0.5, draw(c, hg, r, w, h) {
      c.fillStyle = '#f1ece3'; c.fillRect(0, 0, w, h);
      blotches(c, w, h, 30, w * 0.05, w * 0.2, 0.025);
      blotches(hg, w, h, 120, w * 0.005, w * 0.02, 0.3);
      grain(hg, w, h, w * w * 0.2, 0.3, 1.3);
    }
  }));
  lazy('quartz', () => set('quartz', { // белый кварц столешницы с мелкой искрой
    size: S(512), meters: 1.0, rough: 0.12, bump: 0.3, draw(c, hg, r, w, h) {
      c.fillStyle = '#ece9e2'; c.fillRect(0, 0, w, h);
      grain(c, w, h, w * w * 0.05, 0.12, 1.4, (v) => (v > 0 ? [1, 1, 1] : [0.9, 0.95, 1.05]));
      veins(c, w, h, 3, 'rgba(160,155,150,0.12)', w / 200);
    }
  }));

  // ---------- растения и вода ----------
  lazy('bark', () => set('bark', { // кора прозописа/акации: тёмная, продольные трещины
    size: S(512), h: S(512), meters: 0.6, rough: 0.95, bump: 4, draw(c, hg, r, w, h) {
      c.fillStyle = '#3b322b'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = rnd() * w, t = rnd();
        c.fillStyle = t > 0.5 ? `rgba(15,10,8,${rr(0.3, 0.6)})` : `rgba(120,105,90,${rr(0.1, 0.25)})`;
        const lw = rr(1, 5); c.fillRect(x, 0, lw, h);
        hg.fillStyle = grey(t > 0.5 ? 0.15 : 0.75, 0.8); hg.fillRect(x, 0, lw, h);
      }
      for (let i = 0; i < 400; i++) { const x = rnd() * w, y = rnd() * h; hg.fillStyle = grey(0.1); hg.fillRect(x, y, rr(2, 6), rr(1, 3)); }
      grain(c, w, h, w * w * 0.15, 0.2, 1.6);
    }
  }));
  lazy('palmBark', () => set('palmBark', { // ствол вашингтонии: кольцевые рубцы от черешков, волокна
    size: S(512), h: S(512), meters: 0.8, mw: 1.3, rough: 0.96, bump: 5, draw(c, hg, r, w, h) {
      c.fillStyle = '#7a6a56'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += h / 14) {
        const g = c.createLinearGradient(0, y, 0, y + h / 14);
        g.addColorStop(0, 'rgba(50,40,32,0.6)'); g.addColorStop(0.3, 'rgba(140,120,96,0.3)'); g.addColorStop(1, 'rgba(70,58,46,0.3)');
        c.fillStyle = g; c.fillRect(0, y, w, h / 14);
        const gh = hg.createLinearGradient(0, y, 0, y + h / 14);
        gh.addColorStop(0, grey(0.1)); gh.addColorStop(0.35, grey(0.85)); gh.addColorStop(1, grey(0.45));
        hg.fillStyle = gh; hg.fillRect(0, y, w, h / 14);
      }
      for (let i = 0; i < 300; i++) { const x = rnd() * w, y = rnd() * h; c.fillStyle = `rgba(40,30,22,${rr(0.1, 0.3)})`; c.fillRect(x, y, rr(1, 2), rr(8, 30)); }
      grain(c, w, h, w * w * 0.1, 0.16, 1.5);
    }
  }));
  // вода: только карта нормалей мелкой ряби (сдвигается во времени — см. модель)
  lazy('ripple', () => {
    const w = S(512), Hc = canvas(w);
    const hg = Hc.getContext('2d');
    hg.fillStyle = grey(0.5); hg.fillRect(0, 0, w, w);
    blotches(hg, w, w, 220, w * 0.01, w * 0.06, 0.5);
    const n = tex(normalFromHeight(Hc, 2.2), false, 6);
    return { key: 'ripple', normalMap: n };
  });

  // фотосканы вместо нарисованных наборов (сайт виллы): грузятся в фоне, модель видна сразу
  if (opts.images) {
    const loader = new THREE.TextureLoader();
    for (const [key, info] of Object.entries(opts.images)) {
      const load = (suffix, srgb) => {
        const t = loader.load(`${info.base}_${suffix}.webp`);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = 8;
        t.repeat.set(1 / (info.mw || info.meters), 1 / info.meters);
        return t;
      };
      const v = { key, map: load('col', true), normalMap: info.noNormal ? null : load('nrm', false), roughnessMap: info.noRough ? null : load('rgh', false), normalScale: info.normalScale || 1, image: true, tint: info.tint || null, rough: info.rough || null };
      Object.defineProperty(T, key, { value: v, enumerable: true, configurable: true });
      if (key === 'wenge') { // полотна дверей: волокна вертикально — тот же снимок, повёрнутый на 90°
        const rot = (t) => { if (t) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; } return t; };
        const vv = { ...v, map: rot(load('col', true)), normalMap: rot(info.noNormal ? null : load('nrm', false)), roughnessMap: rot(info.noRough ? null : load('rgh', false)) };
        Object.defineProperty(T, 'wengeV', { value: vv, enumerable: true, configurable: true });
      }
    }
  }
  return { T, rnd, rr };
}
