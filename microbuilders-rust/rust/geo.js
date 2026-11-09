// Геометрия деталей: примитивы в локальных координатах (метры) и «пачка» (Batch) — общая геометрия одного
// материала, куда детали дописываются по порядку укладки. Показ готовой части — drawRange по границам
// элементов, без своих шейдеров: тени, затенение углов и нормали рисуются обычными материалами.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- примитивы: { pos, nrm, uv, index, face? } ----------

const boxTemplates = {};
function boxTemplate(s) {
  if (!boxTemplates[s]) {
    const g = new THREE.BoxGeometry(1, 1, 1, s, s, s);
    const n = g.attributes.normal.array;
    const face = new Uint8Array(g.attributes.position.count);
    for (let i = 0; i < face.length; i++) {
      const x = n[i * 3], y = n[i * 3 + 1], z = n[i * 3 + 2];
      face[i] = x > 0.5 ? 0 : x < -0.5 ? 1 : y > 0.5 ? 2 : y < -0.5 ? 3 : z > 0.5 ? 4 : 5;
    }
    boxTemplates[s] = { pos: g.attributes.position.array, index: g.index.array, face };
  }
  return boxTemplates[s];
}

// Брус с фаской радиуса r (s — нечётное число сегментов на грань: 3 — фаска одним рядом).
export function roundedBox(w, h, d, r, s = 3) {
  const t = boxTemplate(s);
  const count = t.face.length;
  const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3);
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  const half = 0.5 / s;
  for (let i = 0; i < count; i++) {
    const px = t.pos[i * 3], py = t.pos[i * 3 + 1], pz = t.pos[i * 3 + 2];
    const sx = Math.sign(px), sy = Math.sign(py), sz = Math.sign(pz);
    let nx = px - sx * half, ny = py - sy * half, nz = pz - sz * half;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    pos[i * 3] = sx * hx + nx * r; pos[i * 3 + 1] = sy * hy + ny * r; pos[i * 3 + 2] = sz * hz + nz * r;
    nrm[i * 3] = nx; nrm[i * 3 + 1] = ny; nrm[i * 3 + 2] = nz;
  }
  return { pos, nrm, uv: new Float32Array(count * 2), index: t.index, face: t.face };
}

// Развёртка «коробкой» в метрах: каждая грань — своя плоскость (по исходной грани бруса или по нормали).
export function boxUV(p, tileU, tileV, ou = 0, ov = 0) {
  const n = p.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const x = p.pos[i * 3], y = p.pos[i * 3 + 1], z = p.pos[i * 3 + 2];
    let f = p.face ? p.face[i] : -1;
    if (f < 0) {
      const ax = Math.abs(p.nrm[i * 3]), ay = Math.abs(p.nrm[i * 3 + 1]), az = Math.abs(p.nrm[i * 3 + 2]);
      if (ax >= ay && ax >= az) f = p.nrm[i * 3] > 0 ? 0 : 1;
      else if (ay >= az) f = p.nrm[i * 3 + 1] > 0 ? 2 : 3;
      else f = p.nrm[i * 3 + 2] > 0 ? 4 : 5;
    }
    let u, v;
    if (f === 0) { u = -z; v = y; } else if (f === 1) { u = z; v = y; }
    else if (f === 2) { u = x; v = -z; } else if (f === 3) { u = x; v = z; }
    else if (f === 4) { u = x; v = y; } else { u = -x; v = y; }
    p.uv[i * 2] = u / tileU + ou; p.uv[i * 2 + 1] = v / tileV + ov;
  }
  return p;
}

// Доска из атласа (rows строк, строка — одна доска длиной uLen м): длина по x, ширина по y, толщина по z.
// Атлас досок — 8 строк по 3 м; дранка и сланец — 4 строки по 3 м (строка — ряд кровли).
export function plank(len, width, thick, row, uOff = 0, r = 0.0025, rows = 8, uLen = 3.0) {
  const p = roundedBox(len, width, thick, r, 3);
  const n = p.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const x = p.pos[i * 3], y = p.pos[i * 3 + 1];
    const f = p.face[i];
    const u = (x + len / 2) / uLen + uOff;
    let v;
    if (f === 4 || f === 5) v = (row + Math.min(0.995, Math.max(0.005, (y + width / 2) / width))) / rows;
    else v = (row + (f === 2 ? 0.97 : 0.03)) / rows + (f === 0 || f === 1 ? (y / width) * 0.02 : 0);
    p.uv[i * 2] = f === 5 ? -u : u;
    p.uv[i * 2 + 1] = v;
  }
  return p;
}

// Наклонная доска фронтона: низ на y=0, верх от h0 (x=0) до h1 (x=w); плоские грани.
export function slantedBoard(w, h0, h1, t, tile) {
  const P = [[0, 0, -t / 2], [w, 0, -t / 2], [w, h1, -t / 2], [0, h0, -t / 2], [0, 0, t / 2], [w, 0, t / 2], [w, h1, t / 2], [0, h0, t / 2]];
  const faces = [[4, 5, 6, 7], [1, 0, 3, 2], [0, 4, 7, 3], [5, 1, 2, 6], [3, 7, 6, 2], [0, 1, 5, 4]];
  const pos = [], nrm = [], index = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  faces.forEach(function (f) {
    a.fromArray(P[f[0]]); b.fromArray(P[f[1]]); c.fromArray(P[f[2]]);
    const nn = b.sub(a).cross(c.sub(a)).normalize();
    const base = pos.length / 3;
    f.forEach(function (k) { pos.push(P[k][0], P[k][1], P[k][2]); nrm.push(nn.x, nn.y, nn.z); });
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const p = { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(pos.length / 3 * 2), index: new Uint32Array(index) };
  return boxUV(p, tile[0], tile[1]);
}

// Жердь: конус по +x от 0 до len, радиусы r0→r1, прогиб bend (м) вверх в середине. Кора по окружности.
export function stick(len, r0, r1, bend, tile, seg = 6, rad = 7) {
  const pos = [], nrm = [], uv = [], index = [];
  for (let j = 0; j <= seg; j++) {
    const t = j / seg;
    const x = t * len;
    const r = r0 + (r1 - r0) * t;
    const oy = bend * 4 * t * (1 - t);
    const slope = bend * 4 * (1 - 2 * t) / len;
    for (let i = 0; i <= rad; i++) {
      const a = (i / rad) * Math.PI * 2;
      const cy = Math.cos(a), cz = Math.sin(a);
      pos.push(x, oy + cy * r, cz * r);
      const nx = -slope * cy;
      const l = Math.hypot(nx, cy, cz);
      nrm.push(nx / l, cy / l, cz / l);
      uv.push(i / rad, x / tile[1]);
    }
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < rad; i++) {
    const a = j * (rad + 1) + i, b = a + rad + 1;
    index.push(a, a + 1, b, b, a + 1, b + 1);
  }
  // торцы: свежий срез светлее за счёт той же коры — достаточно издалека
  [0, seg].forEach(function (j) {
    const t = j / seg, x = t * len, r = r0 + (r1 - r0) * t, oy = bend * 4 * t * (1 - t);
    const c = pos.length / 3; const dir = j === 0 ? -1 : 1;
    pos.push(x, oy, 0); nrm.push(dir, 0, 0); uv.push(0.5, 0.5);
    for (let i = 0; i <= rad; i++) {
      const a = (i / rad) * Math.PI * 2;
      pos.push(x, oy + Math.cos(a) * r, Math.sin(a) * r); nrm.push(dir, 0, 0); uv.push(0.5 + Math.cos(a) * 0.1, 0.5 + Math.sin(a) * 0.1);
    }
    for (let i = 0; i < rad; i++) {
      if (dir > 0) index.push(c, c + 1 + i, c + 2 + i); else index.push(c, c + 2 + i, c + 1 + i);
    }
  });
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), index: new Uint32Array(index) };
}

// Цилиндр по оси y (стержни, гвозди, болты, трубы); caps — закрыть торцы.
export function cylinder(r0, r1, len, rad = 8, caps = true, tile = [0.2, 0.2]) {
  const g = new THREE.CylinderGeometry(r1, r0, len, rad, 1, !caps);
  g.translate(0, len / 2, 0);
  const p = { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: g.attributes.uv.array, index: g.index.array };
  for (let i = 0; i < p.uv.length; i += 2) { p.uv[i] *= (Math.PI * 2 * Math.max(r0, r1)) / tile[0]; p.uv[i + 1] *= len / tile[1]; }
  return p;
}

// Кольцо обмотки (верёвка на стыке жердей).
export function torus(R, r, tile = [0.08, 0.08]) {
  const g = new THREE.TorusGeometry(R, r, 5, 10);
  const p = { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: g.attributes.uv.array, index: g.index.array };
  for (let i = 0; i < p.uv.length; i += 2) { p.uv[i] *= (Math.PI * 2 * R) / tile[0]; p.uv[i + 1] *= (Math.PI * 2 * r) / tile[1]; }
  return p;
}

// Профлист: ширина w по x, высота h по y, волна по z (шаг period, глубина amp). Двусторонний материал.
export function corrugated(w, h, tile, period = 0.076, amp = 0.009, phase = 0) {
  const cols = Math.max(8, Math.ceil((w / period) * 8));
  const pos = [], nrm = [], uv = [], index = [];
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * w;
    const k = (Math.PI * 2) / period;
    const z = amp * Math.sin(k * x + phase);
    const dz = amp * k * Math.cos(k * x + phase);
    const l = Math.hypot(dz, 1);
    for (let j = 0; j <= 1; j++) {
      const y = j * h;
      pos.push(x, y, z); nrm.push(-dz / l, 0, 1 / l); uv.push(x / tile[0], y / tile[1]);
    }
  }
  for (let i = 0; i < cols; i++) { const a = i * 2; index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), index: new Uint32Array(index) };
}

// Плоский четырёхугольник (стекло, натянутая плёнка): w × h в плоскости xy, нормаль +z.
export function quad(w, h, tile = [1, 1]) {
  return {
    pos: new Float32Array([0, 0, 0, w, 0, 0, w, h, 0, 0, h, 0]),
    nrm: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uv: new Float32Array([0, 0, w / tile[0], 0, w / tile[0], h / tile[1], 0, h / tile[1]]),
    index: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}

// ---------- камни: заготовки неровных глыб единичного размера ----------

function vnoise3(x, y, z, seed) {
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
  const tx = x - fx, ty = y - fy, tz = z - fz;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), sz = tz * tz * (3 - 2 * tz);
  function h(i, j, k) {
    let n = Math.imul((fx + i) * 73856093 ^ (fy + j) * 19349663 ^ (fz + k) * 83492791 ^ seed, 0x5bd1e995);
    n ^= n >>> 15;
    return ((Math.imul(n, 0x27d4eb2d) >>> 0) / 4294967296);
  }
  const a = h(0, 0, 0) + (h(1, 0, 0) - h(0, 0, 0)) * sx, b = h(0, 1, 0) + (h(1, 1, 0) - h(0, 1, 0)) * sx;
  const c = h(0, 0, 1) + (h(1, 0, 1) - h(0, 0, 1)) * sx, d = h(0, 1, 1) + (h(1, 1, 1) - h(0, 1, 1)) * sx;
  const e = a + (b - a) * sy, f = c + (d - c) * sy;
  return e + (f - e) * sz;
}

const stoneCache = [];
export function stoneTemplates(count = 24) {
  if (stoneCache.length >= count) return stoneCache;
  for (let k = stoneCache.length; k < count; k++) {
    const seed = 1013 + k * 7919;
    const p = roundedBox(1, 1, 1, 0.035, 7);
    const pos0 = p.pos, nrm0 = p.nrm;
    for (let i = 0; i < pos0.length; i += 3) {
      const x = pos0[i], y = pos0[i + 1], z = pos0[i + 2];
      const n1 = vnoise3(x * 2.5 + k, y * 2.5, z * 2.5, seed) - 0.5;
      const n2 = vnoise3(x * 7, y * 7 + k, z * 7, seed + 1) - 0.5;
      // сколы: плавно у рёбер (где сумма двух координат близка к 1), глубина — по шуму
      const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
      const edge = Math.max(ax + ay, ay + az, ax + az);
      const edgeness = Math.min(1, Math.max(0, (edge - 0.86) / 0.14));
      const chip = Math.max(0, vnoise3(x * 3.5, y * 3.5, z * 3.5 + k, seed + 2) - 0.45) * edgeness;
      const d = n1 * 0.045 + n2 * 0.022 - chip * 0.14;
      pos0[i] += nrm0[i] * d; pos0[i + 1] += nrm0[i + 1] * d; pos0[i + 2] += nrm0[i + 2] * d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos0, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(p.index), 1));
    const m = mergeVertices(g, 1e-5);
    m.computeVertexNormals();
    stoneCache.push({ pos: m.attributes.position.array, nrm: m.attributes.normal.array, index: m.index.array });
  }
  return stoneCache;
}

// Камень w × h × d из заготовки: растянуть, нормали пересчитать для растяжения, развёртка коробкой.
export function stone(w, h, d, variant, tile, ou, ov) {
  const t = stoneTemplates()[variant % stoneTemplates().length];
  const n = t.pos.length / 3;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = t.pos[i * 3] * w; pos[i * 3 + 1] = t.pos[i * 3 + 1] * h; pos[i * 3 + 2] = t.pos[i * 3 + 2] * d;
    let nx = t.nrm[i * 3] / w, ny = t.nrm[i * 3 + 1] / h, nz = t.nrm[i * 3 + 2] / d;
    const l = Math.hypot(nx, ny, nz) || 1;
    nrm[i * 3] = nx / l; nrm[i * 3 + 1] = ny / l; nrm[i * 3 + 2] = nz / l;
  }
  return boxUV({ pos, nrm, uv: new Float32Array(n * 2), index: t.index }, tile[0], tile[1], ou, ov);
}

// ---------- пачка ----------

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

export class Batch {
  constructor() {
    this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.idx = [];
    this.vcount = 0;
    this.ends = []; // [элемент, число индексов после него]
  }

  add(p, matrix, color, element) {
    _m3.getNormalMatrix(matrix);
    const n = p.pos.length / 3;
    const base = this.vcount;
    const r = color ? color.r : 1, g = color ? color.g : 1, b = color ? color.b : 1;
    for (let i = 0; i < n; i++) {
      _v.set(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]).applyMatrix4(matrix);
      _n.set(p.nrm[i * 3], p.nrm[i * 3 + 1], p.nrm[i * 3 + 2]).applyMatrix3(_m3).normalize();
      this.pos.push(_v.x, _v.y, _v.z);
      this.nrm.push(_n.x, _n.y, _n.z);
      this.uv.push(p.uv ? p.uv[i * 2] : 0, p.uv ? p.uv[i * 2 + 1] : 0);
      this.col.push(r, g, b);
    }
    for (let i = 0; i < p.index.length; i++) this.idx.push(base + p.index[i]);
    this.vcount += n;
    const last = this.ends[this.ends.length - 1];
    if (last && last[0] === element) last[1] = this.idx.length;
    else this.ends.push([element, this.idx.length]);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.vcount > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }

  // Число индексов, которые показывают первые n элементов.
  countFor(n) {
    let c = 0;
    for (let i = 0; i < this.ends.length; i++) { if (this.ends[i][0] < n) c = this.ends[i][1]; else break; }
    return c;
  }
}
