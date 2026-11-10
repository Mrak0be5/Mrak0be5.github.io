// Квартал штаба в реалистичном виде — геометрия (метры мира вида: координаты оригинала ×2). Покрытия бульвара
// (асфальт с колеями и разметкой, тротуары из плит, гранитный бордюр, мощёные площадки перед рядами, переходы),
// живые изгороди, липы бульвара и аллей, фонари, легковые машины, зона расширения (забор, башенный кран,
// материалы, бытовка), заборы и вещи участков, силуэт будущего здания, кольцо выбора, пятна света фонарей.
// Всё сливается в «пачки» по материалу (Pile) — мало вызовов отрисовки на телефоне.
import * as THREE from 'three';
import { Batch, roundedBox, boxUV, cylinder, stick, stone, rng } from './geo.js?v=ff29707';
import { TEXTURE_TILES as TILE } from './textures.js?v=ff29707';

export const WHITE = new THREE.Color(1, 1, 1);
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
const IDENT = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

// Матрица: место, поворот (рад, порядок YXZ), масштаб.
export function M(x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
}
export function C(r, g, b) { return new THREE.Color(r, g, b); }

// Пачки по ключу материала; build(materials) → Group: по мешу на материал (ключи с одним материалом
// сливаются), тень отбрасывают все, кроме ключей из noShadow (плоские покрытия).
export class Pile {
  constructor() { this.batches = new Map(); }
  put(key, prim, m, c) {
    let b = this.batches.get(key);
    if (!b) { b = new Batch(); this.batches.set(key, b); }
    b.add(prim, m || IDENT, c || WHITE, 0);
  }
  // Сетка с цветом у каждой вершины (groundGrid) — в ту же пачку ключа (Batch.add красит одним цветом).
  putGrid(key, prim) {
    let b = this.batches.get(key);
    if (!b) { b = new Batch(); this.batches.set(key, b); }
    const base = b.vcount, n = prim.pos.length / 3;
    for (let i = 0; i < n * 3; i++) { b.pos.push(prim.pos[i]); b.nrm.push(prim.nrm[i]); b.col.push(prim.col[i]); }
    for (let i = 0; i < n * 2; i++) b.uv.push(prim.uv[i]);
    for (let i = 0; i < prim.index.length; i++) b.idx.push(base + prim.index[i]);
    b.vcount += n;
  }
  // Хранить готовой (кеш): числа — в типизированных массивах (вдвое меньше памяти), дополнять её больше нельзя.
  compact() {
    this.batches.forEach(function (b) {
      b.pos = Float32Array.from(b.pos); b.nrm = Float32Array.from(b.nrm); b.uv = Float32Array.from(b.uv);
      b.col = Float32Array.from(b.col); b.idx = Uint32Array.from(b.idx); b.ends = [];
    });
    return this;
  }
  // Всё из другой пачки (копией: build красит свои пачки на месте) — слой из кусков, собранных раньше.
  absorb(other) {
    const self = this;
    other.batches.forEach(function (ob, key) {
      let b = self.batches.get(key);
      if (!b) { b = new Batch(); self.batches.set(key, b); }
      const base = b.vcount;
      for (let i = 0; i < ob.pos.length; i++) { b.pos.push(ob.pos[i]); b.nrm.push(ob.nrm[i]); b.col.push(ob.col[i]); }
      for (let i = 0; i < ob.uv.length; i++) b.uv.push(ob.uv[i]);
      for (let i = 0; i < ob.idx.length; i++) b.idx.push(base + ob.idx[i]);
      b.vcount += ob.vcount;
    });
  }
  build(materials, noShadow, tint) {
    const g = new THREE.Group();
    const byMat = new Map();
    this.batches.forEach(function (b, key) {
      const mat = materials[key];
      if (!b.vcount || !mat) return;
      // тон ключа (телефон: общий материал вместо своей фактуры)
      const t = tint && tint[key];
      if (t) for (let i = 0; i < b.col.length; i += 3) { b.col[i] *= t.r; b.col[i + 1] *= t.g; b.col[i + 2] *= t.b; }
      let e = byMat.get(mat);
      if (!e) { e = { list: [], keys: [] }; byMat.set(mat, e); }
      e.list.push(b); e.keys.push(key);
    });
    byMat.forEach(function (e, mat) {
      const b = e.list.length === 1 ? e.list[0] : mergeBatches(e.list);
      const mesh = new THREE.Mesh(b.geometry(), mat);
      mesh.castShadow = e.keys.some(function (k) { return !(noShadow && noShadow[k]); });
      mesh.receiveShadow = true;
      mesh.name = 'city-' + e.keys.join('+');
      g.add(mesh);
    });
    return g;
  }
}
function mergeBatches(list) {
  const out = new Batch();
  list.forEach(function (b) {
    const base = out.vcount;
    for (let i = 0; i < b.pos.length; i++) out.pos.push(b.pos[i]);
    for (let i = 0; i < b.nrm.length; i++) out.nrm.push(b.nrm[i]);
    for (let i = 0; i < b.uv.length; i++) out.uv.push(b.uv[i]);
    for (let i = 0; i < b.col.length; i++) out.col.push(b.col[i]);
    for (let i = 0; i < b.idx.length; i++) out.idx.push(b.idx[i] + base);
    out.vcount += b.vcount;
  });
  return out;
}

// Телефон: мелкие бруски без фасок (12 треугольников вместо 108) — фаска 1–5 см с высоты камеры квартала
// не видна, а мелочей (лента, колышки, скамьи, щиты забора) — тысячи.
let CHEAP = false;
export function cheap(on) { CHEAP = !!on; }
export function sbx(w, h, d, tile) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: new Float32Array(g.attributes.position.count * 2), index: g.index.array };
  return boxUV(p, tile ? tile[0] : 1, tile ? tile[1] : 1);
}

// Брус w × h × d с фаской r, развёртка по своим граням (tile — метров на плитку).
export function bx(w, h, d, r, tile, s) {
  if (CHEAP && !(r >= 0.06)) return sbx(w, h, d, tile);
  return boxUV(roundedBox(w, h, d, r === undefined ? 0.01 : r, s || 3), tile ? tile[0] : 1, tile ? tile[1] : 1);
}
// Брус по углам в мире [x0, y0, z0] – [x1, y1, z1]: фактура в мировых координатах — плиты и швы идут через
// соседние бруски без разрыва.
export function bxw(x0, y0, z0, x1, y1, z1, r, tile) {
  const p = CHEAP && !(r >= 0.06) ? sbx(x1 - x0, y1 - y0, z1 - z0) : roundedBox(x1 - x0, y1 - y0, z1 - z0, r, 3);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  for (let i = 0; i < p.pos.length; i += 3) { p.pos[i] += cx; p.pos[i + 1] += cy; p.pos[i + 2] += cz; }
  return boxUV(p, tile ? tile[0] : 1, tile ? tile[1] : 1);
}
// Цилиндр от точки a к точке b (geo.cylinder — по +y).
export function tubeAB(pile, key, a, b, r0, r1, c, rad) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  if (len < 1e-4) return;
  const m = new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(UP, d.divideScalar(len)), new THREE.Vector3(1, 1, 1));
  pile.put(key, cylinder(r0, r1 === undefined ? r0 : r1, len, rad || 8), m, c);
}

// Сетка земли по рельефу: узлы через step м, высота h(x, z), развёртка — мировая (u = x, v = −z, как у верхней
// грани бруска). Деление ячеек — как у рельефа вида (terrainMesh): диагональ из (x0, z0 + s) в (x0 + s, z0), тогда
// при шаге 5 м по его узлам поверхность ложится на рельеф точно.
export function groundGrid(x0, x1, z0, z1, step, h, tile, color, stepZ) {
  const nx = Math.max(1, Math.round((x1 - x0) / step)), nz = Math.max(1, Math.round((z1 - z0) / (stepZ || step)));
  const pos = [], nrm = [], uv = [], index = [], col = [];
  const e = 0.5;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz;
      const y = h(x, z);
      pos.push(x, y, z);
      const n = new THREE.Vector3(-(h(x + e, z) - h(x - e, z)) / (2 * e), 1, -(h(x, z + e) - h(x, z - e)) / (2 * e)).normalize();
      nrm.push(n.x, n.y, n.z);
      uv.push(x / tile[0], -z / tile[1]);
      const c = color ? color(x, z) : WHITE;
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + nx + 1, c = b + 1, d = a + 1;
      index.push(a, b, d, b, c, d);
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), index: new Uint32Array(index), col: col };
}
// Сетка с цветом вершин — своей пачкой (Batch.add красит одним цветом: здесь цвет у каждой вершины свой).
export function gridMesh(prim, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(prim.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(prim.nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(prim.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(prim.col, 3));
  g.setIndex(new THREE.BufferAttribute(prim.index, 1));
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  return mesh;
}

// ---------- фактуры канвасом: листва лип, оранжевая сетка ограждения, сетка забора ----------

// Канвас → фактура с растёкшимся в прозрачное цветом и своими мипмапами, где доля пикселей выше порога
// alphaTest на каждом уровне как на исходном (иначе листва вдали редеет) — как в nature.js.
function cutoutTexture(c, threshold, srgb) {
  const w = c.width, h = c.height;
  const d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let filled = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) filled[i] = d[i * 4 + 3] > 8 ? 1 : 0;
  for (let pass = 0; pass < 8; pass++) {
    const next = filled.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (filled[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = (x + dx + w) % w, yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        const j = yy * w + xx;
        if (!filled[j]) continue;
        r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++;
      }
      if (n) { d[i * 4] = r / n; d[i * 4 + 1] = g / n; d[i * 4 + 2] = b / n; next[i] = 1; }
    }
    filled = next;
  }
  const levels = [{ data: new Uint8Array(d.buffer.slice(0)), width: w, height: h }];
  const coverage = function (a, k) { let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i] * k > threshold * 255) n++; return n / (a.length / 4); };
  const base = coverage(levels[0].data, 1);
  while (levels[levels.length - 1].width > 1 || levels[levels.length - 1].height > 1) {
    const src = levels[levels.length - 1];
    const lw = Math.max(1, src.width >> 1), lh = Math.max(1, src.height >> 1);
    const out = new Uint8Array(lw * lh * 4), alpha = new Float32Array(lw * lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const acc = [0, 0, 0, 0];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const j = (Math.min(src.height - 1, y * 2 + dy) * src.width + Math.min(src.width - 1, x * 2 + dx)) * 4;
        for (let k = 0; k < 4; k++) acc[k] += src.data[j + k] / 4;
      }
      const i = (y * lw + x) * 4;
      out[i] = acc[0]; out[i + 1] = acc[1]; out[i + 2] = acc[2]; out[i + 3] = acc[3];
      alpha[y * lw + x] = acc[3];
    }
    let lo = 0.5, hi = 8;
    for (let it = 0; it < 16; it++) { const mid = (lo + hi) / 2; if (coverage(out, mid) < base) lo = mid; else hi = mid; }
    for (let i = 0; i < alpha.length; i++) out[i * 4 + 3] = Math.min(255, alpha[i] * hi);
    levels.push({ data: out, width: lw, height: lh });
  }
  const tex = new THREE.DataTexture(levels[0].data, w, h, THREE.RGBAFormat);
  tex.mipmaps = levels;
  tex.colorSpace = srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Листва липы: веточки с сердцевидными листьями 7–10 см, жилки, светлая изнанка у части листьев.
export function lindenTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const r = rng(4242);
  function leaf(x, y, a, len) {
    const w = len * (0.5 + r() * 0.12);
    const shade = 0.72 + r() * 0.5;
    const pale = r() < 0.16;
    const R = Math.round((pale ? 92 : 54) * shade), G = Math.round((pale ? 116 : 92) * shade), B = Math.round((pale ? 52 : 30) * shade);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = `rgb(${R},${G},${B})`;
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.1, -w * 1.1, len * 0.85, -w * 0.9, len, 0);
    g.bezierCurveTo(len * 0.85, w * 0.9, len * 0.1, w * 1.1, 0, 0);
    g.fill();
    g.strokeStyle = `rgba(${Math.round(R * 0.7)},${Math.round(G * 0.72)},${Math.round(B * 0.7)},0.9)`;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.92, 0);
    for (let k = 1; k < 4; k++) { const t = k * 0.22; g.moveTo(len * t, 0); g.lineTo(len * (t + 0.16), -w * 0.5); g.moveTo(len * t, 0); g.lineTo(len * (t + 0.16), w * 0.5); }
    g.stroke();
    g.restore();
  }
  function twig(x0, y0, ang, len, depth) {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    g.strokeStyle = 'rgb(70,56,42)';
    g.lineWidth = Math.max(1, 3.4 - depth);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const n = Math.round(len / 17);
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      [-1, 1].forEach(function (sd) { if (r() < 0.9) leaf(x, y, ang + sd * (0.7 + r() * 0.5), 26 + r() * 14); });
    }
    if (depth < 2) for (let k = 0; k < 3; k++) {
      const t = 0.2 + r() * 0.65;
      twig(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, ang + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.5), len * (0.42 + r() * 0.2), depth + 1);
    }
  }
  twig(6, 128, 0, 450, 0);
  twig(14, 92, 0.16, 380, 1);
  twig(14, 166, -0.16, 380, 1);
  return cutoutTexture(c, 0.45);
}

// Оранжевая сетка ограждения стройки (ячейка-ромб 6 см) — плитка 0,5 × 0,5 м.
export function netTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = 'rgb(236,104,22)';
  g.lineWidth = 3.2;
  g.lineCap = 'round';
  for (let k = -128; k <= 256; k += 16) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 128, 128); g.stroke();
    g.beginPath(); g.moveTo(k + 128, 0); g.lineTo(k, 128); g.stroke();
  }
  // утолщения в узлах
  g.fillStyle = 'rgb(222,92,16)';
  for (let y = 0; y <= 128; y += 8) for (let x = (y / 8) % 2 ? 8 : 0; x <= 128; x += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
  return cutoutTexture(c, 0.4);
}

// Сварная сетка временного забора (ячейка 10 × 20 см, проволока 4 мм) — плитка 1 × 1 м.
export function meshTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = 'rgb(176,180,182)';
  for (let x = 0; x < 128; x += 12.8) g.fillRect(Math.round(x), 0, 2, 128);
  for (let y = 0; y < 128; y += 25.6) g.fillRect(0, Math.round(y), 128, 2);
  return cutoutTexture(c, 0.4);
}

// ---------- деревья ----------

// Крона лиственного дерева из карточек (как leafCrown в nature.js): главный объём и 3–4 боковых «облака»
// листвы — силуэт неровный, как у живой липы; гуще к краю облака, внутри и снизу темнее, нормали — от центра
// кроны вперемешку с нормалью облака (мягкий объёмный свет). Обе стороны карточки — свои треугольники.
export function crownCards(r, n, cy, rx, ry, size) {
  const pos = [], nrm = [], uv = [], col = [], idx = [];
  const d = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), t = new THREE.Vector3();
  const lobes = [{ x: 0, y: 0, z: 0, k: 0.82, w: 0.42 }];
  const nl = 3 + Math.floor(r() * 2);
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + r() * 0.9;
    lobes.push({ x: Math.cos(a) * rx * 0.48, y: (r() - 0.35) * ry * 0.55, z: Math.sin(a) * rx * 0.48, k: 0.5 + r() * 0.2, w: 0.58 / nl });
  }
  for (let k = 0; k < n; k++) {
    let pick = r(), L = lobes[0];
    for (let i = 0; i < lobes.length; i++) { pick -= lobes[i].w; if (pick <= 0) { L = lobes[i]; break; } }
    d.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (d.lengthSq() > 1 || d.lengthSq() < 0.01) { k--; continue; }
    d.normalize();
    const dist = Math.pow(r(), 0.3);
    // низ облака приплюснут: овальная крона с ровным низом
    const dy = d.y < 0 ? d.y * 0.65 : d.y;
    const p = new THREE.Vector3(L.x + d.x * rx * L.k * dist, cy + L.y + dy * ry * L.k * dist, L.z + d.z * rx * L.k * dist);
    const g = new THREE.Vector3(p.x / rx, (p.y - cy) / ry, p.z / rx).normalize();
    const nn = new THREE.Vector3(d.x * 0.55 + g.x * 0.45, d.y * 0.55 + g.y * 0.45 + 0.3, d.z * 0.55 + g.z * 0.45).normalize();
    t.set(r() - 0.5, r() - 0.5, r() - 0.5);
    u.crossVectors(nn, t);
    if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
    u.normalize();
    v.crossVectors(nn, u).normalize();
    const sz = size * (0.7 + r() * 0.5);
    const low = THREE.MathUtils.clamp(0.5 + (p.y - cy) / (ry * 1.6), 0, 1);
    const shade = (0.5 + 0.5 * dist) * (0.72 + 0.28 * low) * (0.85 + r() * 0.3);
    const b0 = pos.length / 3;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (cc, i) {
      pos.push(p.x + (u.x * cc[0] + v.x * cc[1]) * sz * 0.5, p.y + (u.y * cc[0] + v.y * cc[1]) * sz * 0.5, p.z + (u.z * cc[0] + v.z * cc[1]) * sz * 0.5);
      nrm.push(nn.x, nn.y, nn.z);
      uv.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0);
      col.push(shade, shade, shade * 0.94);
    });
    idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Ствол с развилкой: чуть изогнутый, комель шире, 3–4 скелетные ветви уходят в крону (кора — mats.bark).
export function trunkGeometry(r, height, crownY, radius) {
  const b = new Batch();
  const bark = TILE.bark;
  // ствол — жердь geo.stick по +x, поворот вверх
  const lean = (r() - 0.5) * 0.12;
  const main = stick(crownY + 0.4, radius, radius * 0.62, (r() - 0.5) * 0.08, bark, 6, 9);
  b.add(main, M(0, 0, 0, r() * 6.28, 0, Math.PI / 2 + lean), WHITE, 0);
  const n = 3 + Math.floor(r() * 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r() * 0.8;
    const up = 0.55 + r() * 0.35;
    const len = (height - crownY) * (0.55 + r() * 0.3);
    const y = crownY - 0.2 + r() * 0.5;
    const br = stick(len, radius * 0.5, radius * 0.18, 0.05 + r() * 0.1, bark, 4, 6);
    b.add(br, M(Math.cos(a) * 0.04, y, Math.sin(a) * 0.04, -a, 0, up), WHITE, 0);
  }
  // корневая шейка: утолщение у земли
  b.add(cylinder(radius * 1.45, radius * 1.05, 0.25, 9, false, bark), M(0, -0.02, 0), WHITE, 0);
  return b.geometry();
}

// ---------- машины ----------

// Усечённая призма: низ w0 × d0 на y = 0, верх w1 × d1 на y = h, сдвинут по z на dz. Грани плоские; faces —
// углы каждой боковой грани (низ-лево, низ-право, верх-право, верх-лево снаружи) для накладок (quadOn).
export function taper(w0, d0, w1, d1, h, dz) {
  const B = [[-w0 / 2, 0, -d0 / 2], [w0 / 2, 0, -d0 / 2], [w0 / 2, 0, d0 / 2], [-w0 / 2, 0, d0 / 2]];
  const T = [[-w1 / 2, h, -d1 / 2 + dz], [w1 / 2, h, -d1 / 2 + dz], [w1 / 2, h, d1 / 2 + dz], [-w1 / 2, h, d1 / 2 + dz]];
  const faces = { front: [B[3], B[2], T[2], T[3]], back: [B[1], B[0], T[0], T[1]], right: [B[2], B[1], T[1], T[2]], left: [B[0], B[3], T[3], T[0]], top: [T[3], T[2], T[1], T[0]] };
  const pos = [], nrm = [], index = [];
  Object.keys(faces).forEach(function (k) {
    const q = faces[k];
    const a = new THREE.Vector3().fromArray(q[0]), b = new THREE.Vector3().fromArray(q[1]), c = new THREE.Vector3().fromArray(q[3]);
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const base = pos.length / 3;
    q.forEach(function (p) { pos.push(p[0], p[1], p[2]); nrm.push(n.x, n.y, n.z); });
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return { prim: boxUV({ pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(pos.length / 3 * 2), index: new Uint32Array(index) }, 1, 1), faces: faces };
}
// Накладка на грань q (4 угла): часть [u0, u1] × [v0, v1] грани, отступ off наружу по нормали грани.
export function quadOn(q, u0, u1, v0, v1, off) {
  const P = q.map(function (p) { return new THREE.Vector3().fromArray(p); });
  const n = P[1].clone().sub(P[0]).cross(P[3].clone().sub(P[0])).normalize();
  const at = function (u, v) {
    const bottom = P[0].clone().lerp(P[1], u), top = P[3].clone().lerp(P[2], u);
    return bottom.lerp(top, v).addScaledVector(n, off);
  };
  const pts = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  const pos = [], nrm = [];
  pts.forEach(function (p) { pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); });
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(8), index: new Uint32Array([0, 1, 2, 0, 2, 3]) };
}


// Легковой хэтчбек ~3,9 × 1,75 м: кузов (цвет машины), стёкла, бамперы, фары и фонари, номера, ручки, зеркала;
// колёса — отдельными осями (крутятся). Вершины несут свой материал: aMat = (шероховатость, металл, свечение:
// 1 — фара, 2 — стоп-сигнал). Перед — +z.
export function carGeometry(color, merged) {
  const paint = new THREE.Color(color);
  const dark = C(0.05, 0.05, 0.055), chrome = C(0.75, 0.75, 0.76), plate = C(0.86, 0.86, 0.84), glass = C(0.03, 0.035, 0.04);
  const parts = [];
  const add = function (prim, m, c, rough, metal, glow) { parts.push({ prim, m: m || IDENT, c, mat: [rough, metal, glow] }); };
  // кузов: низ с фаской, капот с уклоном к носу, салон — усечённая пирамида (лобовое и заднее стекло наклонены)
  add(bx(1.76, 0.52, 3.9, 0.16, [1, 1], 5), M(0, 0.61, 0), paint, 0.3, 0.6, 0);
  add(taper(1.7, 1.15, 1.66, 1.0, 0.1, -0.08).prim, M(0, 0.86, 1.32), paint, 0.3, 0.6, 0);
  const cab = taper(1.62, 2.3, 1.34, 1.38, 0.52, -0.22);
  add(cab.prim, M(0, 0.86, -0.28), paint, 0.3, 0.6, 0);
  // стёкла на гранях салона: лобовое, заднее, по два боковых (стойки — кузов между ними)
  const cm = M(0, 0.86, -0.28);
  const panel = function (f, u0, u1, v0, v1) { add(quadOn(cab.faces[f], u0, u1, v0, v1, 0.006), cm, glass, 0.04, 0.3, 0); };
  panel('front', 0.07, 0.93, 0.08, 0.9); panel('back', 0.09, 0.91, 0.12, 0.88);
  ['left', 'right'].forEach(function (f) { panel(f, 0.05, 0.47, 0.1, 0.86); panel(f, 0.53, 0.93, 0.1, 0.86); });
  // бамперы и пороги — чёрный пластик
  add(bx(1.78, 0.26, 0.22, 0.08), M(0, 0.42, 1.9), dark, 0.6, 0, 0);
  add(bx(1.78, 0.26, 0.22, 0.08), M(0, 0.42, -1.9), dark, 0.6, 0, 0);
  add(bx(0.06, 0.12, 2.3, 0.03), M(0.88, 0.37, 0), dark, 0.6, 0, 0);
  add(bx(0.06, 0.12, 2.3, 0.03), M(-0.88, 0.37, 0), dark, 0.6, 0, 0);
  // колёсные арки
  [1.24, -1.22].forEach(function (z) { [1, -1].forEach(function (s) { add(bx(0.06, 0.5, 0.86, 0.05), M(s * 0.86, 0.48, z), dark, 0.8, 0, 0); }); });
  // решётка, фары, фонари, номера
  add(bx(0.8, 0.12, 0.04, 0.02), M(0, 0.6, 1.94), dark, 0.4, 0.4, 0);
  [0.62, -0.62].forEach(function (x) {
    add(bx(0.34, 0.12, 0.06, 0.03), M(x, 0.74, 1.91), C(0.95, 0.95, 0.92), 0.08, 0.1, 1);
    add(bx(0.3, 0.14, 0.05, 0.03), M(x, 0.8, -1.92), C(0.55, 0.04, 0.03), 0.15, 0.1, 2);
    add(bx(0.12, 0.07, 0.16, 0.02), M(x * 1.44, 1.0, 0.62), paint, 0.32, 0.55, 0);
  });
  add(bx(0.52, 0.12, 0.02, 0.005), M(0, 0.45, 2.015), plate, 0.5, 0, 0);
  add(bx(0.52, 0.12, 0.02, 0.005), M(0, 0.62, -1.965), plate, 0.5, 0, 0);
  [[0.88, 0.25], [-0.88, 0.25], [0.88, -0.75], [-0.88, -0.75]].forEach(function (p) { add(bx(0.03, 0.03, 0.14, 0.01), M(p[0], 0.9, p[1]), chrome, 0.2, 1, 0); });
  // телефон: колёса в кузове (не крутятся) — один вызов на машину
  if (merged) [1.24, -1.22].forEach(function (z) { axleParts().forEach(function (p) { parts.push({ prim: p.prim, m: M(0, 0.31, z).multiply(p.m), c: p.c, mat: p.mat }); }); });
  return { body: mergeCar(parts), axle: merged ? null : mergeCar(axleParts()) };
}
function mergeCar(parts) {
  const b = new Batch();
  const mat = [];
  parts.forEach(function (p) {
    const before = b.vcount;
    b.add(p.prim, p.m, p.c, 0);
    for (let i = before; i < b.vcount; i++) mat.push(p.mat[0], p.mat[1], p.mat[2]);
  });
  const g = b.geometry();
  g.setAttribute('aMat', new THREE.Float32BufferAttribute(mat, 3));
  return g;
}
// Ось с двумя колёсами (шина, диск со спицами-выемками, колпак): вращается вокруг x на своём месте.
function axleParts() {
  const parts = [];
  const tyre = C(0.07, 0.07, 0.07), rim = C(0.62, 0.63, 0.65), hub = C(0.3, 0.3, 0.32);
  [0.79, -0.79].forEach(function (x) {
    const side = Math.sign(x);
    parts.push({ prim: cylinder(0.31, 0.31, 0.2, 18, true), m: M(x - side * 0.1, 0, 0, 0, 0, -Math.PI / 2 * side), c: tyre, mat: [0.85, 0, 0] });
    parts.push({ prim: cylinder(0.2, 0.2, 0.012, 14, true), m: M(x + side * 0.095, 0, 0, 0, 0, -Math.PI / 2 * side), c: rim, mat: [0.3, 0.9, 0] });
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2;
      parts.push({ prim: bx(0.012, 0.07, 0.06, 0.004), m: M(x + side * 0.104, Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0, a), c: hub, mat: [0.6, 0.5, 0] });
    }
  });
  return parts;
}

// ---------- силуэт будущего здания ----------

// Бруски силуэта: наружные грани кубов чертежа (между соседями силуэта — без граней), у вершины — координаты
// на грани в метрах и размер грани (aFace: u, v, w, h) — шейдер рисует светлые рёбра кубов.
export function ghostGeometry(cubes) {
  // ключ — клетка и начало её здания (у соседних участков свои клетки с теми же номерами)
  const key = function (x, y, z, c) { return x + ',' + y + ',' + z + ',' + c[3] + ',' + c[5]; };
  const set = new Set(cubes.map(function (c) { return key(c[0], c[1], c[2], c); }));
  const pos = [], face = [], idx = [];
  const S = 2, P = 0.02;
  const F = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  ];
  cubes.forEach(function (c) {
    const ox = c[3], oy = c[4], oz = c[5];
    F.forEach(function (f) {
      if (set.has(key(c[0] + f.n[0], c[1] + f.n[1], c[2] + f.n[2], c))) return;
      const cx = ox + (c[0] + 0.5) * S + f.n[0] * (S / 2 - P), cy = oy + (c[1] + 0.5) * S + f.n[1] * (S / 2 - P), cz = oz + (c[2] + 0.5) * S + f.n[2] * (S / 2 - P);
      const half = S / 2 - P;
      const base = pos.length / 3;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k) {
        pos.push(cx + (f.u[0] * k[0] + f.v[0] * k[1]) * half, cy + (f.u[1] * k[0] + f.v[1] * k[1]) * half, cz + (f.u[2] * k[0] + f.v[2] * k[1]) * half);
        face.push((k[0] + 1) * half, (k[1] + 1) * half, half * 2, half * 2);
      });
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFace', new THREE.Float32BufferAttribute(face, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Кольцо выбора участка: полосы вдоль краёв (w × d — внутренний размер), aFace.x — координата поперёк полосы
// (0..1) для мягкого края. h(x, z) — высота над местом (зона расширения лежит на подъёме рельефа): полосы делятся
// на отрезки по step м и ложатся на землю; без h — плоско на y = 0.
export function ringGeometry(w, d, band, h, step) {
  const pos = [], face = [], idx = [];
  const y = function (x, z) { return h ? h(x, z) : 0; };
  function strip(x0, z0, x1, z1, across) {
    const alongX = across === 'z';
    const len = alongX ? x1 - x0 : z1 - z0;
    const n = h ? Math.max(1, Math.ceil(len / (step || 1))) : 1;
    const b0 = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = alongX ? [x0 + (x1 - x0) * t, z0] : [x0, z0 + (z1 - z0) * t];
      const b = alongX ? [x0 + (x1 - x0) * t, z1] : [x1, z0 + (z1 - z0) * t];
      pos.push(a[0], y(a[0], a[1]), a[1], b[0], y(b[0], b[1]), b[1]);
      face.push(0, 0, 0, 0, 1, 0, 0, 0);
    }
    for (let i = 0; i < n; i++) {
      const a = b0 + i * 2, b = a + 1, c = a + 2, dd = a + 3;
      // нормаль вверх при любом направлении полосы
      if (alongX) idx.push(a, b, c, b, dd, c); else idx.push(a, c, b, b, c, dd);
    }
  }
  const hw = w / 2, hd = d / 2;
  strip(-hw - band, hd, hw + band, hd + band, 'z');
  strip(-hw - band, -hd - band, hw + band, -hd, 'z');
  strip(hw, -hd, hw + band, hd, 'x');
  strip(-hw - band, -hd, -hw, hd, 'x');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFace', new THREE.Float32BufferAttribute(face, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Пятна света фонарей на земле: круг r вокруг каждой точки [x, z] (aFace.xy — от −1 до 1 по кругу), сеткой
// по поверхности h(x, z, sx, sz): асфальт, бордюр, тротуар, площадки, газон — каждый на своей высоте (пятно не висит
// над проезжей частью и не светит низ машин). На границах покрытий (xs, zs) — по два ряда узлов (с той и другой
// стороны: sx, sz = ∓1), между ними — отвесная полоска по торцу бордюра.
export function poolGeometry(points, r, h, xs, zs, step) {
  const pos = [], face = [], idx = [];
  const samples = function (c, cuts) {
    const out = [];
    const n = Math.ceil(2 * r / step);
    for (let i = 0; i <= n; i++) out.push([c - r + 2 * r * i / n, 0]);
    cuts.forEach(function (v) { if (v > c - r + 0.02 && v < c + r - 0.02) { out.push([v, -1]); out.push([v, 1]); } });
    out.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return out;
  };
  points.forEach(function (p) {
    const ax = samples(p[0], xs), az = samples(p[1], zs);
    const base = pos.length / 3, nx = ax.length;
    for (let j = 0; j < az.length; j++) {
      for (let i = 0; i < nx; i++) {
        const x = ax[i][0], z = az[j][0];
        pos.push(x, h(x, z, ax[i][1], az[j][1]), z);
        face.push((x - p[0]) / r, (z - p[1]) / r, 0, 0);
      }
    }
    for (let j = 0; j < az.length - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = base + j * nx + i, b = a + nx, c = b + 1, d = a + 1;
        idx.push(a, b, d, b, c, d);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFace', new THREE.Float32BufferAttribute(face, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Брусок (bxw) со скошенным верхом вдоль z: от высоты ya (у za) к yb (у zb), низ y0 на месте — пандус в конце
// тротуара, опущенный бордюр. Высота бруска поджимается пропорционально (фаска сохраняет вид).
export function slopeTop(p, y0, za, zb, ya, yb) {
  let top = -Infinity;
  for (let i = 1; i < p.pos.length; i += 3) top = Math.max(top, p.pos[i]);
  for (let i = 0; i < p.pos.length; i += 3) {
    const t = Math.min(1, Math.max(0, (p.pos[i + 2] - za) / (zb - za)));
    const k = (ya + (yb - ya) * t - y0) / (top - y0);
    p.pos[i + 1] = y0 + (p.pos[i + 1] - y0) * k;
  }
  return p;
}

// ---------- мелочи участков и зоны ----------

// Поддон с кладкой: доски поддона и пачка блоков (цвет — материал), обвязка лентой.
export function pallet(pile, x, y, z, ry, tint, key, h) {
  const m = M(x, y, z, ry);
  const at = function (lx, ly, lz) { return m.clone().multiply(M(lx, ly, lz)); };
  [-0.45, 0, 0.45].forEach(function (lz) { pile.put('planks', bx(1.2, 0.04, 0.12, 0.006, TILE.planks), at(0, 0.125, lz)); });
  [-0.5, 0, 0.5].forEach(function (lx) { pile.put('planks', bx(0.1, 0.1, 1.0, 0.006, TILE.planks), at(lx, 0.05, 0)); });
  const hh = h || 0.7;
  pile.put(key || 'concrete', bx(1.14, hh, 0.96, 0.02, [0.5, 0.5]), at(0, 0.145 + hh / 2, 0), tint);
  [-0.3, 0.3].forEach(function (lx) { pile.put('blacksteel', bx(0.025, hh + 0.01, 0.97, 0.004), at(lx, 0.145 + hh / 2, 0), C(0.3, 0.3, 0.32)); });
}

// Курган сыпучего: кольца вокруг вершины, профиль (1 − t²)^1,2 с волной по кругу и неровным краем, юбка уходит
// под землю; развёртка — плоская сверху (фактура песка/щебня в метрах), нормали — сглаженные.
export function mound(w, h, d, seed, tile) {
  const r = rng(seed);
  const R = CHEAP ? 4 : 7, A = CHEAP ? 12 : 22;
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const pos = [0, h, 0], uv = [0, 0], idx = [];
  for (let i = 1; i <= R; i++) {
    const t = i / R;
    for (let k = 0; k < A; k++) {
      const a = k / A * Math.PI * 2;
      const wob = 1 + 0.12 * Math.sin(a * 3 + ph[0]) + 0.06 * Math.sin(a * 5 + ph[1]);
      const x = Math.cos(a) * t * w / 2 * wob, z = Math.sin(a) * t * d / 2 * wob;
      const y = i === R ? -0.05 : h * Math.pow(1 - t * t, 1.2) * (1 + 0.1 * Math.sin(a * 4 + ph[2] + t * 3) * t);
      pos.push(x, y, z); uv.push(x / tile[0], -z / tile[1]);
    }
  }
  for (let k = 0; k < A; k++) idx.push(0, 1 + (k + 1) % A, 1 + k);
  for (let i = 1; i < R; i++) for (let k = 0; k < A; k++) {
    const a = 1 + (i - 1) * A + k, b = 1 + (i - 1) * A + (k + 1) % A, c = 1 + i * A + k, e = 1 + i * A + (k + 1) % A;
    idx.push(a, e, c, a, b, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: new Float32Array(uv), index: new Uint32Array(idx) };
}
// Куча песка/щебня: большой курган и пара осыпей у подножия.
export function heap(pile, key, x, y, z, w, h, seed, tint) {
  const r = rng(seed);
  pile.put(key, mound(w, h, w * (0.75 + r() * 0.2), seed, [1.5, 1.5]), M(x, y, z, r() * 6.28), tint);
  for (let k = 0; k < (CHEAP ? 1 : 2); k++) {
    const a = r() * 6.28, d = w * (0.38 + r() * 0.12);
    pile.put(key, mound(w * 0.45, h * 0.35, w * 0.4, seed + k + 1, [1.5, 1.5]), M(x + Math.cos(a) * d, y, z + Math.sin(a) * d, r() * 6.28), tint);
  }
}
// Куст: ком из карточек листвы (как крона липы) с тёмной сердцевиной — не просвечивает насквозь. Карточки
// несут свою тень (внутри темнее) — их цвета вершин множатся на тон.
export function bush(pile, x, y, z, w, h, seed, tint) {
  const r = rng(seed);
  const g = crownCards(r, CHEAP ? 12 : 26, h * 0.52, w * 0.5, h * 0.5, Math.min(0.6, 0.18 + w * 0.32));
  g.applyMatrix4(M(x, y, z, r() * 6.28));
  const col = g.attributes.color.array, t = tint || WHITE, c = new Array(col.length);
  for (let i = 0; i < col.length; i += 3) { c[i] = col[i] * t.r; c[i + 1] = col[i + 1] * t.g; c[i + 2] = col[i + 2] * t.b; }
  pile.putGrid('leaves', { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: g.attributes.uv.array, index: g.index.array, col: c });
  g.dispose();
  if (w > 0.5) pile.put('hedge', stone(w * 0.62, h * 0.55, w * 0.58, Math.floor(r() * 24), [1, 1]), M(x, y + h * 0.3, z, r() * 6.28), C(0.4 * t.r, 0.48 * t.g, 0.36 * t.b));
}

// Скамья: две литые боковины (крашеный чугун), сиденье и спинка из реек.
const CAST = C(0.05, 0.055, 0.055);
export function bench(pile, x, y, z, ry) {
  const m = M(x, y, z, ry);
  const at = function (lx, ly, lz, rx) { return m.clone().multiply(M(lx, ly, lz, 0, rx || 0)); };
  [-0.75, 0.75].forEach(function (lx) {
    pile.put('metal', bx(0.06, 0.45, 0.5, 0.01), at(lx, 0.225, 0.02), CAST);
    pile.put('metal', bx(0.06, 0.5, 0.06, 0.01), at(lx, 0.62, -0.22, -0.18), CAST);
  });
  for (let k = 0; k < 4; k++) pile.put('planks', bx(1.8, 0.035, 0.1, 0.006, TILE.planks), at(0, 0.46, -0.16 + k * 0.12));
  for (let k = 0; k < 3; k++) pile.put('planks', bx(1.8, 0.1, 0.03, 0.006, TILE.planks), at(0, 0.6 + k * 0.13, -0.25 - k * 0.025, -0.18));
}

// Урна: стальной стакан на столбике.
export function bin(pile, x, y, z) {
  pile.put('metal', cylinder(0.035, 0.035, 0.5, 8), M(x, y, z), C(0.12, 0.13, 0.13));
  pile.put('metal', cylinder(0.2, 0.22, 0.55, 12, true), M(x, y + 0.35, z), C(0.18, 0.2, 0.19));
}

// Решётка приствольная: квадрат 1,2 м чугуна с кольцом под ствол.
export function treeGrate(pile, x, y, z) {
  pile.put('metal', bx(1.3, 0.03, 1.3, 0.008), M(x, y + 0.015, z), C(0.07, 0.065, 0.06));
  pile.put('soil', bx(0.5, 0.02, 0.5, 0.01, [4, 4]), M(x, y + 0.02, z), WHITE);
}

// Куст: неровный ком листвы (заготовка камня с фактурой стриженой листвы), w × h, тон — оттенок листвы.
export function shrub(pile, x, y, z, w, h, seed, tint) {
  const r = rng(seed);
  pile.put('hedge', stone(w, h, w * (0.8 + r() * 0.3), Math.floor(r() * 24), [1, 1]), M(x, y + h * 0.4, z, r() * 6.28), tint || WHITE);
}
// Туя: стриженый конус листвы на коротком стволе (пары у входов).
export function thuja(pile, x, y, z, h, seed) {
  const r = rng(seed);
  const w = h * (0.26 + r() * 0.04);
  pile.put('bark', cylinder(0.04, 0.035, 0.25, 6), M(x, y, z), C(0.5, 0.45, 0.4));
  pile.put('hedge', cylinder(w, w * 0.08, h, CHEAP ? 8 : 14, true, [1, 1]), M(x, y + 0.12, z, r() * 6.28), C(0.72, 0.9, 0.68));
  pile.put('hedge', cylinder(w * 0.7, w, h * 0.14, CHEAP ? 8 : 14, false, [1, 1]), M(x, y + 0.04, z, r() * 6.28), C(0.6, 0.78, 0.58));
}
// Светящийся столбик дорожки: стальной цилиндр, светящийся пояс под колпаком (стекло фонарей — светится ночью).
export function bollard(pile, x, y, z) {
  pile.put('metal', cylinder(0.07, 0.075, 0.62, 10), M(x, y, z), CAST);
  pile.put('lens', cylinder(0.065, 0.065, 0.1, 10, false), M(x, y + 0.62, z));
  pile.put('metal', cylinder(0.085, 0.085, 0.04, 10), M(x, y + 0.72, z), CAST);
  pile.put('concrete', bx(0.24, 0.05, 0.24, 0.01, [1, 1]), M(x, y + 0.025, z), C(0.62, 0.61, 0.59));
}
// Стела у входа: бетонная тумба, тёмная панель с полосой цвета здания (кладки штаба), колпак.
export function stele(pile, x, y, z, ry, band) {
  const m = M(x, y, z, ry);
  const at = function (lx, ly, lz) { return m.clone().multiply(M(lx, ly, lz)); };
  pile.put('concrete', bx(1.3, 0.3, 0.5, 0.02, [1, 1]), at(0, 0.15, 0), C(0.7, 0.69, 0.66));
  pile.put('metal', bx(1.1, 1.5, 0.22, 0.02), at(0, 1.05, 0), C(0.09, 0.1, 0.105));
  pile.put('paint', bx(1.12, 0.18, 0.24, 0.01), at(0, 1.55, 0), band);
  pile.put('paint', bx(0.7, 0.05, 0.235, 0.005), at(0, 1.05, 0), C(0.85, 0.85, 0.82));
  pile.put('paint', bx(0.5, 0.05, 0.235, 0.005), at(0, 0.9, 0), C(0.85, 0.85, 0.82));
  pile.put('metal', bx(1.18, 0.05, 0.28, 0.01), at(0, 1.83, 0), C(0.2, 0.21, 0.21));
}
