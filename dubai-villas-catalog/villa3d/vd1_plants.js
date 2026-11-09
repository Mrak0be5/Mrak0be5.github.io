// Растения у виллы: акации (прозопис) с ветвящимся каркасом и перистой листвой, пальмы-вашингтонии с веерными
// листьями, кусты, пучки сухой травы на рафе. Всё рисуется кодом: кора и листья — текстуры canvas с прозрачностью,
// ветви — конические трубки по изогнутым путям, крона — карточки листвы со «сферическими» нормалями (мягкий объём).
// makePlants(THREE, { T, quality }) → { acacia, palm, shrub, tufts, flush(parent), update(time) }

export function makePlants(THREE, { T, quality = 'high' }) {
  const hi = quality !== 'low';
  const V = THREE.Vector3;
  let gseed = 4242;
  const grnd = () => ((gseed = (gseed * 16807) % 2147483647) / 2147483647);
  const seeded = (s) => { let x = (s * 9301 + 49297) % 233280 || 1; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };

  // ---------- текстуры листвы (canvas с альфой) ----------
  const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const alphaTex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  // перистые побеги прозописа: черешок, пары перышек, на них мелкие листочки
  const acaciaTex = (() => {
    const s = hi ? 512 : 256, c = cv(s), g = c.getContext('2d'), r = seeded(17);
    g.clearRect(0, 0, s, s);
    const sprig = (x, y, ang, len, depth) => {
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      g.strokeStyle = 'rgba(70,72,40,0.95)';
      g.lineWidth = Math.max(0.6, s / 512 * (depth ? 0.8 : 1.6));
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + ex) / 2 + (r() - 0.5) * len * 0.2, (y + ey) / 2, ex, ey); g.stroke();
      if (depth === 0) {
        const n = 7 + Math.floor(r() * 5);
        for (let i = 1; i <= n; i++) {
          const t = i / (n + 1), px = x + (ex - x) * t, py = y + (ey - y) * t;
          for (const side of [-1, 1]) sprig(px, py, ang + side * (0.9 + r() * 0.5), len * (0.28 + r() * 0.12) * (1.1 - t * 0.5), 1);
        }
      } else {
        const n = 9 + Math.floor(r() * 6);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, px = x + (ex - x) * t, py = y + (ey - y) * t, ll = s / 512 * (2.4 + r() * 1.6);
          for (const side of [-1, 1]) {
            const a = ang + side * 1.25;
            const k = r();
            g.fillStyle = `rgb(${104 + k * 46},${118 + k * 40},${70 + k * 26})`;
            g.beginPath(); g.ellipse(px + Math.cos(a) * ll, py + Math.sin(a) * ll, ll, ll * 0.42, a, 0, 7); g.fill();
          }
        }
      }
    };
    for (let i = 0; i < 15; i++) sprig(s * (0.2 + r() * 0.6), s * (0.99 - r() * 0.25), -Math.PI / 2 + (r() - 0.5) * 2.2, s * (0.35 + r() * 0.4), 0);
    return alphaTex(c);
  })();
  // мелколистный кустарник (конокарпус/фикус у оград)
  const bushTex = (() => {
    const s = hi ? 256 : 128, c = cv(s), g = c.getContext('2d'), r = seeded(23);
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      const a = r() * 7, d = Math.sqrt(r()) * s * 0.46, x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d, l = s / 256 * (5 + r() * 6), k = r();
      g.fillStyle = `rgb(${46 + k * 40},${72 + k * 50},${32 + k * 24})`;
      g.beginPath(); g.ellipse(x, y, l, l * 0.55, r() * 7, 0, 7); g.fill();
      g.strokeStyle = 'rgba(20,30,10,0.35)'; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(x - l * 0.8, y); g.lineTo(x + l * 0.8, y); g.stroke();
    }
    return alphaTex(c);
  })();
  // веер вашингтонии в полярной развёртке: столбцы — сегменты, у краёв расщеплены (прозрачные щели), середина сплошная
  const fanTex = (dry) => {
    const w = hi ? 512 : 256, h = w / 2, c = cv(w, h), g = c.getContext('2d'), r = seeded(dry ? 41 : 31);
    g.clearRect(0, 0, w, h);
    const segs = 30, sw = w / segs;
    for (let i = 0; i < segs; i++) {
      const k = r(), split = h * (0.42 + r() * 0.2);
      const base = dry ? [150 + k * 40, 118 + k * 30, 72 + k * 20] : [58 + k * 30, 98 + k * 34, 46 + k * 18];
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
      g.fillRect(i * sw, 0, sw + 0.6, split);
      g.beginPath(); // свободный конец сегмента — сужается к острию
      g.moveTo(i * sw + sw * 0.08, split); g.lineTo(i * sw + sw * 0.5 + (r() - 0.5) * sw * 0.4, h * (0.92 + r() * 0.08)); g.lineTo(i * sw + sw * 0.92, split);
      g.fill();
      g.fillStyle = dry ? 'rgba(90,64,40,0.5)' : 'rgba(30,52,24,0.55)'; // складка-жилка
      g.fillRect(i * sw + sw * 0.47, 0, Math.max(1, sw * 0.06), h * 0.9);
      if (dry) for (let j = 0; j < 4; j++) { g.fillStyle = `rgba(80,58,36,${0.2 + r() * 0.3})`; g.fillRect(i * sw + r() * sw, r() * h * 0.8, 2, h * 0.1); }
    }
    return alphaTex(c);
  };
  const frondTex = fanTex(false), frondDryTex = fanTex(true);
  // пучок сухой травы: тонкие изогнутые стебли, золотистые сверху, зеленоватые у земли
  const grassTex = (() => {
    const w = hi ? 256 : 128, h = w, c = cv(w, h), g = c.getContext('2d'), r = seeded(53);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = w * (0.2 + r() * 0.6), top = h * (0.02 + r() * 0.35), bend = (r() - 0.5) * w * 0.5, k = r();
      const grad = g.createLinearGradient(0, h, 0, top);
      grad.addColorStop(0, `rgb(${110 + k * 20},${118 + k * 20},${60})`);
      grad.addColorStop(0.5, `rgb(${190 + k * 30},${166 + k * 30},${100 + k * 20})`);
      grad.addColorStop(1, `rgb(${222 + k * 20},${200 + k * 20},${150})`);
      g.strokeStyle = grad;
      g.lineWidth = Math.max(0.8, w / 256 * (0.8 + r() * 1.4));
      g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + bend * 0.3, (h + top) / 2, x + bend, top); g.stroke();
      if (r() < 0.35) { g.fillStyle = `rgba(${210 + k * 30},${185 + k * 30},${130},0.9)`; g.beginPath(); g.ellipse(x + bend, top, w / 256 * 2, h * 0.05, 0.2, 0, 7); g.fill(); } // колос
    }
    return alphaTex(c);
  })();

  // ---------- материалы ----------
  const winded = []; // материалы с ветром: uniform uTime
  function wind(mat, amp, key) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      mat.userData.shader = shader;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 wp = position;
        #ifdef USE_INSTANCING
          wp += instanceMatrix[3].xyz;
        #endif
        float sway = max(position.y, 0.0);
        float ph = wp.x * 0.37 + wp.z * 0.29;
        transformed.x += (sin(uTime * 1.7 + ph) * 0.7 + sin(uTime * 3.1 + ph * 2.3) * 0.3) * ${amp.toFixed(3)} * sway;
        transformed.z += cos(uTime * 1.3 + ph * 1.3) * ${(amp * 0.6).toFixed(3)} * sway;`);
    };
    mat.customProgramCacheKey = () => `wind-${key}`;
    winded.push(mat);
    return mat;
  }
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const P = {
    bark: std({ map: T.bark.map, normalMap: T.bark.normalMap, roughnessMap: T.bark.roughnessMap, roughness: 1, color: 0xc8beb4 }),
    palmBark: std({ map: T.palmBark.map, normalMap: T.palmBark.normalMap, roughnessMap: T.palmBark.roughnessMap, roughness: 1 }),
    leaf: std({ map: acaciaTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.78, vertexColors: true }),
    bush: std({ map: bushTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, vertexColors: true }),
    frond: std({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.6, vertexColors: true }),
    frondDry: std({ map: frondDryTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, vertexColors: true }),
    grass: std({ map: grassTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 })
  };
  for (const k of ['bark', 'palmBark']) P[k].normalScale.set(1.2, 1.2);
  wind(P.leaf, 0.012, 'leaf');
  wind(P.bush, 0.01, 'bush');
  wind(P.frond, 0.02, 'frond');
  wind(P.grass, 0.07, 'grass');
  for (const k of ['leaf', 'bush', 'frond', 'frondDry', 'grass']) P[k].userData.noAO = true;
  for (const [k, m] of Object.entries(P)) m.name = `p_${k}`;
  P.grass.userData.noCast = true;

  // ---------- накопители геометрии по материалам ----------
  const acc = new Map();
  const bucket = (mat) => {
    if (!acc.has(mat)) acc.set(mat, { pos: [], nor: [], uv: [], col: [], idx: [] });
    return acc.get(mat);
  };
  const tmp = new V(), tmp2 = new V();
  // коническая трубка по точкам: кольца с переносом рамки, развёртка в метрах (для коры)
  function tube(mat, pts, radii, sides) {
    const b = bucket(mat), base = b.pos.length / 3;
    let n = new V(), prevT = null, len = 0;
    for (let i = 0; i < pts.length; i++) {
      const t = (i === 0 ? tmp.subVectors(pts[1], pts[0]) : i === pts.length - 1 ? tmp.subVectors(pts[i], pts[i - 1]) : tmp.subVectors(pts[i + 1], pts[i - 1])).clone().normalize();
      if (!prevT) { n.set(t.y, -t.x, 0); if (n.lengthSq() < 1e-4) n.set(1, 0, 0); n.cross(t).normalize(); }
      else { n.sub(tmp2.copy(t).multiplyScalar(n.dot(t))).normalize(); }
      prevT = t;
      const bn = new V().crossVectors(t, n);
      if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
      const circ = Math.max(1, Math.round((2 * Math.PI * radii[0]) / 0.45));
      for (let j = 0; j <= sides; j++) {
        const a = (j / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const nx = n.x * ca + bn.x * sa, ny = n.y * ca + bn.y * sa, nz = n.z * ca + bn.z * sa;
        b.pos.push(pts[i].x + nx * radii[i], pts[i].y + ny * radii[i], pts[i].z + nz * radii[i]);
        b.nor.push(nx, ny, nz);
        b.uv.push((j / sides) * circ, len / 0.6);
        b.col.push(1, 1, 1);
      }
    }
    const row = sides + 1;
    for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < sides; j++) {
      const a = base + i * row + j, c = a + row;
      b.idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  // карточка листвы: квадрат с основанием в точке p, «вверх» по dir, нормали — от центра кроны
  function card(mat, p, dir, side, size, center, tint, normalBias = 0.35) {
    const b = bucket(mat), base = b.pos.length / 3;
    const up = dir.clone().normalize(), right = side.clone().sub(up.clone().multiplyScalar(side.dot(up))).normalize();
    const corners = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]];
    for (const [u, v] of corners) {
      const q = p.clone().addScaledVector(right, u * size).addScaledVector(up, v * size);
      const nrm = q.clone().sub(center).normalize().multiplyScalar(1 - normalBias).add(new V(0, normalBias, 0)).normalize();
      b.pos.push(q.x, q.y, q.z);
      b.nor.push(nrm.x, nrm.y, nrm.z);
      b.uv.push(u + 0.5, v);
      b.col.push(tint[0], tint[1], tint[2]);
    }
    b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const randPerp = (d, r) => { const a = new V(r() - 0.5, r() - 0.5, r() - 0.5); a.sub(d.clone().multiplyScalar(a.dot(d))); return a.normalize(); };

  // ---------- акация / прозопис ----------
  // ствол до развилки, 2–4 лидера, ветвление до 4 порядков, листва на концах — кроной-зонтиком
  const colliders = [];
  function acacia(x, z, H, R, seedN = 1, lod = 0) {
    const r = seeded(seedN * 131 + 7);
    const k = H / 6.8;
    const maxDepth = lod ? 2 : 3, sides = lod ? 4 : 7;
    const leafTint = () => { const t = r(); return [0.92 + t * 0.25, 0.92 + t * 0.18, 0.8 + t * 0.2]; };
    const mark = acc.get(P.bark) ? acc.get(P.bark).pos.length : 0, markLeaf = acc.get(P.leaf) ? acc.get(P.leaf).pos.length : 0;
    const center = new V(x, H * 0.78, z);
    const forkH = H * (0.2 + r() * 0.08);
    const lean = new V((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3);
    const trunkPts = [];
    for (let i = 0; i <= 5; i++) { const t = i / 5; trunkPts.push(new V(x + lean.x * t * t + (r() - 0.5) * 0.03, forkH * t, z + lean.z * t * t + (r() - 0.5) * 0.03)); }
    tube(P.bark, trunkPts, trunkPts.map((_, i) => (0.17 - i * 0.012) * k), sides + 1);
    const fork = trunkPts[5];
    const grow = (p, d, L, rad, depth) => {
      const pts = [p.clone()];
      const bendAx = randPerp(d, r);
      let dir = d.clone();
      const segs = lod ? 3 : 5;
      for (let i = 1; i <= segs; i++) {
        dir.addScaledVector(bendAx, (r() - 0.5) * 0.35).add(new V(0, depth < 2 ? 0.06 : -0.03, 0));
        const out = new V(pts[pts.length - 1].x - x, 0, pts[pts.length - 1].z - z);
        if (out.lengthSq() > 0.01) dir.addScaledVector(out.normalize(), depth * 0.04); // крона расходится зонтом
        dir.normalize();
        pts.push(pts[pts.length - 1].clone().addScaledVector(dir, L / segs));
      }
      tube(P.bark, pts, pts.map((_, i) => rad * (1 - 0.38 * (i / segs))), Math.max(3, sides - depth * 2));
      if (depth < maxDepth) {
        const kids = depth === 0 ? 3 : 2 + (r() < 0.45 ? 1 : 0);
        for (let c = 0; c < kids; c++) {
          const at = Math.min(segs, Math.round(segs * (0.5 + r() * 0.5)));
          const cd = dir.clone().addScaledVector(randPerp(dir, r), 0.55 + r() * 0.45).normalize();
          if (cd.y < -0.15) cd.y = -0.15;
          grow(pts[at], cd.normalize(), L * (0.6 + r() * 0.18), rad * 0.62, depth + 1);
        }
      }
      if (depth >= maxDepth - 1) { // листва: на концах и вдоль последних ветвей — плотная перистая крона
        const n = depth === maxDepth ? (lod ? 3 : 6 + Math.floor(r() * 3)) : (lod ? 1 : 2);
        for (let f = 0; f < n; f++) {
          const at = pts[Math.max(1, segs - Math.floor(r() * (depth === maxDepth ? 4 : 2)))];
          const up = dir.clone().addScaledVector(randPerp(dir, r), 0.9).add(new V(0, 0.3, 0)).normalize();
          card(P.leaf, at, up, randPerp(up, r), (0.7 + r() * 0.5) * k * (lod ? 1.5 : 1), center, leafTint());
        }
      }
    };
    const leaders = 2 + (r() < 0.6 ? 1 : 0) + (r() < 0.25 ? 1 : 0);
    for (let i = 0; i < leaders; i++) {
      const a = (i / leaders) * Math.PI * 2 + r() * 0.8, phi = 0.42 + r() * 0.35;
      grow(fork, new V(Math.sin(phi) * Math.cos(a), Math.cos(phi), Math.sin(phi) * Math.sin(a)), (H - forkH) * (0.5 + r() * 0.12), 0.115 * k, 0);
    }
    // подогнать ширину кроны к наблюдаемой: сжать/растянуть по горизонтали всё, что выше развилки
    const fit = (b, from) => {
      if (!b) return 1;
      let mx = 0;
      for (let i = from; i < b.pos.length; i += 3) if (b.pos[i + 1] > forkH) mx = Math.max(mx, Math.hypot(b.pos[i] - x, b.pos[i + 2] - z));
      return mx;
    };
    const reach = fit(acc.get(P.leaf), markLeaf) || 1, s = R / reach;
    for (const [b, from] of [[acc.get(P.bark), mark], [acc.get(P.leaf), markLeaf]]) {
      if (!b) continue;
      for (let i = from; i < b.pos.length; i += 3) {
        if (b.pos[i + 1] <= forkH) continue;
        const f = Math.min(1, (b.pos[i + 1] - forkH) / 1.2);
        const ss = 1 + (s - 1) * f;
        b.pos[i] = x + (b.pos[i] - x) * ss;
        b.pos[i + 2] = z + (b.pos[i + 2] - z) * ss;
      }
    }
    colliders.push([x - 0.22 * k, 0, z - 0.22 * k, x + 0.22 * k, H * 0.4, z + 0.22 * k]);
  }

  // ---------- вашингтония ----------
  function fan(mat, origin, axis, upHint, R, spread, droop, fold, tint) {
    const b = bucket(mat), base = b.pos.length / 3;
    const ax = axis.clone().normalize();
    const side = new V().crossVectors(ax, upHint).normalize();
    const nrm = new V().crossVectors(side, ax).normalize();
    const J = hi ? 28 : 14, K = hi ? 6 : 4;
    for (let k = 0; k <= K; k++) {
      const rr = 0.08 + (k / K) * (R - 0.08);
      for (let j = 0; j <= J; j++) {
        const a = (j / J - 0.5) * spread;
        const u = Math.cos(a) * rr, v = Math.sin(a) * rr;
        const pleat = (j % 2 ? 1 : -1) * 0.022 * rr;
        const w = pleat + Math.abs(v) * fold - droop * (rr / R) * (rr / R) * R;
        b.pos.push(origin.x + ax.x * u + side.x * v + nrm.x * w, origin.y + ax.y * u + side.y * v + nrm.y * w, origin.z + ax.z * u + side.z * v + nrm.z * w);
        b.nor.push(0, 1, 0);
        b.uv.push(j / J, 1 - (k / K));
        b.col.push(tint[0], tint[1], tint[2]);
      }
    }
    const row = J + 1;
    for (let k = 0; k < K; k++) for (let j = 0; j < J; j++) {
      const a = base + k * row + j, c = a + row;
      b.idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
    // нормали по граням листа
    const P0 = new V(), P1 = new V(), P2 = new V(), e1 = new V(), e2 = new V();
    const acc2 = new Float32Array((K + 1) * row * 3);
    for (let k = 0; k < K; k++) for (let j = 0; j < J; j++) {
      const ids = [k * row + j, (k + 1) * row + j, k * row + j + 1];
      P0.fromArray(b.pos, (base + ids[0]) * 3); P1.fromArray(b.pos, (base + ids[1]) * 3); P2.fromArray(b.pos, (base + ids[2]) * 3);
      e1.subVectors(P1, P0); e2.subVectors(P2, P0);
      const fn = new V().crossVectors(e1, e2).normalize();
      if (fn.dot(nrm) < 0) fn.negate();
      for (const q of [ids[0], ids[1], ids[2], (k + 1) * row + j + 1]) { acc2[q * 3] += fn.x; acc2[q * 3 + 1] += fn.y; acc2[q * 3 + 2] += fn.z; }
    }
    for (let q = 0; q < (K + 1) * row; q++) {
      const l = Math.hypot(acc2[q * 3], acc2[q * 3 + 1], acc2[q * 3 + 2]) || 1;
      const o = (base + q) * 3;
      b.nor[o] = acc2[q * 3] / l * 0.75; b.nor[o + 1] = acc2[q * 3 + 1] / l * 0.75 + 0.25; b.nor[o + 2] = acc2[q * 3 + 2] / l * 0.75;
    }
  }
  function palm(x, z, h, lean = 0.04, seedN = 1, lod = 0) {
    const r = seeded(seedN * 977 + 3);
    const ld = new V(Math.cos(r() * 7), 0, Math.sin(r() * 7));
    const pts = [];
    const N = lod ? 5 : 12;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push(new V(x + ld.x * lean * h * t * t, h * t, z + ld.z * lean * h * t * t));
    }
    tube(P.palmBark, pts, pts.map((_, i) => 0.25 - 0.08 * (i / N) + (i === 0 ? 0.06 : 0)), lod ? 6 : 12);
    const top = pts[N];
    // «сапоги» — основания срезанных черешков под кроной
    const boots = new V(top.x, top.y - 0.55, top.z);
    tube(P.frondDry, [boots, top.clone().add(new V(0, 0.1, 0))], [0.27, 0.22], lod ? 6 : 10);
    const tint = () => { const t = r(); return [0.85 + t * 0.25, 0.9 + t * 0.2, 0.85 + t * 0.2]; };
    const live = lod ? 16 : 28;
    for (let i = 0; i < live; i++) {
      const a = i * 2.39996 + r() * 0.3;
      const tilt = 0.25 + (i / live) * 1.45 + (r() - 0.5) * 0.25;  // от вертикали: молодые торчат вверх, старые — в стороны и вниз
      const d = new V(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a));
      const L = 1.05 + r() * 0.35, start = top.clone().add(new V(0, 0.05 - (i / live) * 0.3, 0));
      const mid = start.clone().addScaledVector(d, L * 0.5).add(new V(0, -0.04 * L, 0));
      const end = start.clone().addScaledVector(d, L).add(new V(0, -0.15 * L * Math.sin(tilt), 0));
      if (!lod) tube(P.palmBark, [start, mid, end], [0.035, 0.026, 0.018], 4);
      const axis = end.clone().sub(mid).normalize().add(new V(0, -0.12, 0)).normalize();
      const upHint = new V(0, 1, 0).sub(axis.clone().multiplyScalar(axis.y)).normalize();
      fan(P.frond, end, axis, upHint.lengthSq() > 0.1 ? new V().crossVectors(upHint, axis).cross(axis).negate() : new V(1, 0, 0), 0.95 + r() * 0.3, 2.9, 0.18 + tilt * 0.12, 0.22, tint());
    }
    if (!lod) for (let i = 0; i < 9; i++) { // сухие листья висят «юбкой»
      const a = r() * 7, dd = new V(Math.cos(a) * 0.32, -1, Math.sin(a) * 0.32).normalize();
      const start = top.clone().add(new V(0, -0.35, 0));
      const end = start.clone().addScaledVector(dd, 0.9);
      tube(P.frondDry, [start, end], [0.03, 0.02], 4);
      fan(P.frondDry, end, dd, new V(Math.cos(a), 0, Math.sin(a)), 0.85 + r() * 0.2, 1.8, 0.05, 0.6, [1, 1, 1]);
    }
    colliders.push([x - 0.3, 0, z - 0.3, x + 0.3, 3, z + 0.3]);
  }

  // ---------- куст ----------
  function shrub(x, z, R, H, seedN = 1, y0 = 0) {
    const r = seeded(seedN * 53 + 11);
    const center = new V(x, y0 + H * 0.55, z);
    for (let i = 0; i < 6; i++) {
      const a = r() * 7, p0 = new V(x + (r() - 0.5) * 0.2, y0, z + (r() - 0.5) * 0.2), p1 = new V(x + Math.cos(a) * R * 0.5, y0 + H * 0.6, z + Math.sin(a) * R * 0.5);
      tube(P.bark, [p0, p0.clone().lerp(p1, 0.5).add(new V(0, 0.05, 0)), p1], [0.03, 0.022, 0.012], 4);
    }
    const n = Math.round((hi ? 70 : 30) * (R * H) / 0.8);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, rad = 0.65 + r() * 0.35;
      const dir = new V(Math.sqrt(1 - u * u) * Math.cos(a), Math.abs(u) * 0.9 + 0.1, Math.sqrt(1 - u * u) * Math.sin(a)).normalize();
      const p = new V(x + dir.x * R * rad * 0.8, y0 + H * 0.15 + dir.y * H * 0.8 * rad, z + dir.z * R * rad * 0.8);
      const t = r();
      card(P.bush, p.clone().addScaledVector(dir, -0.15), dir, randPerp(dir, r), 0.34 + r() * 0.24, center, [0.8 + t * 0.3, 0.85 + t * 0.25, 0.8 + t * 0.2], 0.25);
    }
  }

  // ---------- трава: крестовые карточки на InstancedMesh, тон каждого пучка свой ----------
  const tuftGeo = (() => {
    const g = new THREE.BufferGeometry(), pos = [], uv = [], nor = [], idx = [];
    for (let q = 0; q < 3; q++) {
      const a = (q / 3) * Math.PI, c = Math.cos(a) * 0.5, s = Math.sin(a) * 0.5, b = pos.length / 3;
      for (const [u, v] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { pos.push(c * u, v, s * u); uv.push((u + 1) / 2, v); nor.push(0, 1, 0); }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  })();
  const tuftLists = [];
  // items: [x, y, z, height, width, tone 0..1]
  function tufts(items) { tuftLists.push(items); }

  function flush(parent) {
    for (const [mat, b] of acc) {
      if (!b.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      if (mat.vertexColors) g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setIndex(b.idx);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.name = `plants_${Object.keys(P).find((k) => P[k] === mat) || 'part'}`;
      if (mat.userData.noAO) m.userData.noAO = true;
      parent.add(m);
    }
    acc.clear();
    const all = tuftLists.flat();
    if (all.length) {
      const mesh = new THREE.InstancedMesh(tuftGeo, P.grass, all.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V(), c = new THREE.Color();
      all.forEach(([x, y, z, h, w, tone], i) => {
        q.setFromAxisAngle(new V(0, 1, 0), grnd() * 6.28);
        sc.set(w, h, w);
        m4.compose(new V(x, y, z), q, sc);
        mesh.setMatrixAt(i, m4);
        c.setRGB(0.78 + tone * 0.3, 0.8 + tone * 0.22, 0.62 + tone * 0.2);
        mesh.setColorAt(i, c);
      });
      mesh.userData.noCast = true;
      mesh.userData.noAO = true;
      mesh.name = 'plants_grass';
      mesh.computeBoundingSphere();
      parent.add(mesh);
    }
  }
  function update(time) {
    for (const m of winded) if (m.userData.shader) m.userData.shader.uniforms.uTime.value = time;
  }
  return { P, acacia, palm, shrub, tufts, flush, update, colliders };
}
