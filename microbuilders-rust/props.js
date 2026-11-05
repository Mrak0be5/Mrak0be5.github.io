// Хозяйство стройки: склад материалов (поддоны досок, камень, листы, плиты, связки жердей, ящики с дверями
// и окнами, мешки раствора), бытовка из профлиста, биотуалет, козлы, бочка, прожекторы; приставные лестницы
// рабочих. Всё — из тех же примитивов и материалов, что и детали.
import * as THREE from 'three';
import { Batch, plank, roundedBox, boxUV, stick, cylinder, corrugated, stone, quad, rng } from './geo.js?v=83604fc';
import { TEXTURE_TILES as TILE } from './textures.js?v=83604fc';

const W = new THREE.Color(1, 1, 1);
function M(x, y, z, ry = 0, rx = 0, rz = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
}
const FLAT = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
function Bm(x, y, z, ax, ay, az) {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...ax), new THREE.Vector3(...ay), new THREE.Vector3(...az));
  m.setPosition(x, y, z);
  return m;
}

const UP = new THREE.Vector3(0, 1, 0);
// Цилиндр geo.cylinder (ось +y от 0 до длины) от точки a к точке b.
function tube(p, mat, a, b, r, c) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(UP, d.divideScalar(len)), new THREE.Vector3(1, 1, 1));
  p.put(mat, cylinder(r, r, len, 10), m, c);
}

// Мачта освещения на прицепе: корпус генератора, колёса, четыре выносные опоры, телескопическая мачта 6,9 м,
// перекладина с четырьмя светодиодными прожекторами (лицевые стёкла — в glow, они светятся ночью).
// Смотрит на точку (ax, az). Возвращает центр прожекторов.
function lightTower(p, glow, x, z, ax, az) {
  const base = M(x, 0, z, Math.atan2(ax - x, az - z));
  const at = function (lx, ly, lz, rx) { return base.clone().multiply(M(lx, ly, lz, 0, rx || 0, 0)); };
  const wp = function (lx, ly, lz) { return new THREE.Vector3(lx, ly, lz).applyMatrix4(base); };
  const yellow = new THREE.Color(0.86, 0.58, 0.07);
  p.put('blacksteel', boxUV(roundedBox(0.9, 0.09, 2.0, 0.01), 1, 1), at(0, 0.4, 0), W);
  p.put('paint', boxUV(roundedBox(0.86, 0.74, 1.25, 0.05, 4), 1, 1), at(0, 0.82, -0.2), yellow);
  p.put('paint', boxUV(roundedBox(0.7, 0.05, 0.92, 0.02, 3), 1, 1), at(0, 1.21, -0.2), new THREE.Color(0.18, 0.18, 0.18));
  p.put('blacksteel', boxUV(roundedBox(0.5, 0.3, 0.02, 0.005), 1, 1), at(0, 0.86, 0.46), new THREE.Color(0.35, 0.35, 0.36));
  tube(p, 'blacksteel', wp(0, 0.4, 0.95), wp(0, 0.34, 1.75), 0.03, W);
  [-1, 1].forEach(function (sd) {
    p.put('rubber', cylinder(0.26, 0.26, 0.15, 18), base.clone().multiply(M(sd > 0 ? 0.47 : -0.62, 0.26, -0.15, 0, 0, -Math.PI / 2)), W);
    p.put('steel', cylinder(0.11, 0.11, 0.155, 12), base.clone().multiply(M(sd > 0 ? 0.47 : -0.625, 0.26, -0.15, 0, 0, -Math.PI / 2)), new THREE.Color(0.7, 0.7, 0.7));
    [-1, 1].forEach(function (fb) {
      const a = wp(sd * 0.4, 0.55, -0.2 + fb * 0.62), b = wp(sd * 1.05, 0.04, -0.2 + fb * 1.3);
      tube(p, 'blacksteel', a, b, 0.028, W);
      p.put('blacksteel', boxUV(roundedBox(0.2, 0.03, 0.2, 0.005), 1, 1), M(b.x, 0.015, b.z), W);
    });
  });
  tube(p, 'tube', wp(0, 1.2, -0.66), wp(0, 3.6, -0.66), 0.07, W);
  tube(p, 'tube', wp(0, 3.5, -0.66), wp(0, 5.5, -0.66), 0.056, W);
  tube(p, 'tube', wp(0, 5.4, -0.66), wp(0, 6.95, -0.66), 0.044, W);
  p.put('blacksteel', cylinder(0.085, 0.085, 0.08, 12), M(wp(0, 3.5, -0.66).x, 3.5, wp(0, 3.5, -0.66).z), W);
  p.put('blacksteel', cylinder(0.07, 0.07, 0.08, 12), M(wp(0, 5.4, -0.66).x, 5.4, wp(0, 5.4, -0.66).z), W);
  tube(p, 'blacksteel', wp(-1.0, 6.92, -0.62), wp(1.0, 6.92, -0.62), 0.035, W);
  [-0.72, -0.24, 0.24, 0.72].forEach(function (lx) {
    const m = at(lx, 6.92, -0.52, 0.62);
    p.put('blacksteel', boxUV(roundedBox(0.44, 0.3, 0.09, 0.012), 1, 1), m, W);
    glow.add(quad(0.38, 0.24), m.clone().multiply(M(-0.19, -0.12, 0.047)), W, 0);
  });
  return wp(0, 6.85, -0.3);
}

// Готовая геометрия three → примитив для Batch (позиции, нормали, uv, индексы).
function prim(g) {
  if (!g.index) g = g.toNonIndexed();
  const n = g.attributes.position.count;
  const index = g.index ? g.index.array : Uint32Array.from({ length: n }, function (_, i) { return i; });
  return { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: g.attributes.uv ? g.attributes.uv.array : new Float32Array(n * 2), index };
}

// Изнанка: обход граней и нормали наоборот (внутренняя стенка открытого цилиндра, барабана).
function inward(q) {
  const index = new Uint32Array(q.index.length);
  for (let i = 0; i < q.index.length; i += 3) { index[i] = q.index[i]; index[i + 1] = q.index[i + 2]; index[i + 2] = q.index[i + 1]; }
  const nrm = new Float32Array(q.nrm.length);
  for (let i = 0; i < nrm.length; i++) nrm[i] = -q.nrm[i];
  return { pos: q.pos, nrm, uv: q.uv, index };
}

// Куча песка: склон с осыпью и неровностями, в ней лопата.
function sandPile(p, r, x, z, R, H) {
  const rings = 14, segs = 40, pos = [], uv = [], index = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(a * 3 + 1.3) + 0.05 * Math.sin(a * 7 + 0.4);
      const rr = R * t * wob;
      const h = H * Math.pow(1 - t, 1.15) * (1 + 0.06 * Math.sin(a * 5 + t * 9) * t) - 0.02;
      pos.push(Math.cos(a) * rr, Math.max(-0.02, h), Math.sin(a) * rr);
      uv.push((Math.cos(a) * rr) / 1.0, (Math.sin(a) * rr) / 1.0);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + segs + 1;
    index.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  p.put('mortar', prim(g), M(x, 0, z), new THREE.Color(1.15, 0.94, 0.66));
  // лопата: черенок наклонно, полотно в песке
  const top = new THREE.Vector3(x + 0.45, H * 0.55 + 1.05, z - 0.25), tip = new THREE.Vector3(x + 0.25, H * 0.55, z - 0.12);
  tube(p, 'planks', top, tip, 0.017, new THREE.Color(0.9, 0.85, 0.75));
  const d = new THREE.Vector3().subVectors(tip, top).normalize();
  const bm = new THREE.Matrix4().compose(tip.clone().addScaledVector(d, 0.12), new THREE.Quaternion().setFromUnitVectors(UP, d), new THREE.Vector3(1, 1, 1));
  p.put('steel', boxUV(roundedBox(0.22, 0.26, 0.012, 0.004), 1, 1), bm, new THREE.Color(0.55, 0.55, 0.57));
}

// Бетономешалка: рама на двух колёсах, барабан наклонно с зубчатым венцом, мотор под кожухом, ручка.
function mixer(p, x, z, ry) {
  const base = M(x, 0, z, ry);
  const at = function (lx, ly, lz, rx, rz) { return base.clone().multiply(M(lx, ly, lz, 0, rx || 0, rz || 0)); };
  const wp = function (lx, ly, lz) { return new THREE.Vector3(lx, ly, lz).applyMatrix4(base); };
  const orange = new THREE.Color(0.86, 0.33, 0.05);
  [-1, 1].forEach(function (sd) {
    tube(p, 'tube', wp(sd * 0.32, 0.22, 0), wp(sd * 0.22, 0.95, -0.05), 0.022, W);
    tube(p, 'tube', wp(sd * 0.22, 0.95, -0.05), wp(sd * 0.3, 0.05, -0.55), 0.022, W);
    p.put('rubber', cylinder(0.22, 0.22, 0.09, 16), base.clone().multiply(M(sd > 0 ? 0.33 : -0.42, 0.22, 0, 0, 0, -Math.PI / 2)), W);
  });
  tube(p, 'tube', wp(-0.4, 0.22, 0), wp(0.4, 0.22, 0), 0.016, W);
  tube(p, 'tube', wp(-0.3, 0.06, -0.55), wp(0.3, 0.06, -0.55), 0.02, W);
  tube(p, 'tube', wp(0, 0.6, -0.3), wp(0, 0.95, -1.05), 0.02, W);
  p.put('blacksteel', boxUV(roundedBox(0.34, 0.24, 0.3, 0.03, 3), 1, 1), at(0, 0.62, -0.22), new THREE.Color(0.28, 0.29, 0.3));
  // барабан: профиль от дна к горловине
  const prof = [[0.0, -0.3], [0.2, -0.3], [0.32, -0.22], [0.38, -0.05], [0.37, 0.12], [0.27, 0.32], [0.17, 0.44], [0.16, 0.48], [0.15, 0.47]];
  // профиль сверху вниз: грани оболочки смотрят наружу; изнутри — та же оболочка навыворот
  const lathe = new THREE.LatheGeometry(prof.slice().reverse().map(function (q) { return new THREE.Vector2(q[0], q[1]); }), 28);
  const drum = at(0, 1.08, 0.12, 0.7);
  p.put('paint', prim(lathe), drum, orange);
  p.put('paint', inward(prim(lathe)), drum.clone().multiply(new THREE.Matrix4().makeScale(0.985, 0.985, 0.985)), orange.clone().multiplyScalar(0.45));
  p.put('blacksteel', prim(new THREE.TorusGeometry(0.385, 0.03, 6, 36).rotateX(Math.PI / 2)), drum.clone().multiply(M(0, -0.04, 0)), W);
}

// Ведро: конус без крышки, дно, ручка-дуга; внутри раствор.
function bucket(p, x, z, color, full, ry = 0) {
  p.put('paint', cylinder(0.13, 0.155, 0.3, 16, false), M(x, 0, z), color);
  p.put('paint', inward(cylinder(0.125, 0.15, 0.3, 16, false)), M(x, 0, z), color.clone().multiplyScalar(0.6));
  p.put('paint', prim(new THREE.CircleGeometry(0.13, 16).rotateX(-Math.PI / 2)), M(x, 0.004, z), color);
  if (full) p.put('mortar', prim(new THREE.CircleGeometry(0.145, 16).rotateX(-Math.PI / 2)), M(x, 0.22, z), new THREE.Color(0.75, 0.73, 0.7));
  p.put('steel', prim(new THREE.TorusGeometry(0.15, 0.005, 4, 16, Math.PI)), M(x, 0.3, z, ry, 0, 0), W);
}

// Кабель по земле от a до b с изгибами.
function cable(p, r, a, b) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const side = (i === 0 || i === n) ? 0 : (r() - 0.5) * 0.7;
    pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t + side * (b.z - a.z) / Math.hypot(b.x - a.x, b.z - a.z), 0.012, a.z + (b.z - a.z) * t - side * (b.x - a.x) / Math.hypot(b.x - a.x, b.z - a.z)));
  }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.011, 5, false);
  p.put('paint', prim(g), new THREE.Matrix4(), new THREE.Color(0.85, 0.32, 0.04));
}

// Мелочь на площадке: камешки, обрезки досок, осколки блоков. Не под зданием и не на складе.
function debris(p, r, f, cx, cz) {
  const inside = function (x, z, pad) { return x > f.x0 - pad && x < f.x1 + pad && z > f.z0 - pad && z < f.z1 + pad; };
  const yard = function (x, z) { return x > cx - 7.2 && x < cx + 10 && z > cz - 2.4 && z < cz + 4.6; };
  let n = 0;
  for (let k = 0; k < 600 && n < 150; k++) {
    const x = (f.x0 + f.x1) / 2 + (r() - 0.5) * 26, z = (f.z0 + f.z1) / 2 + (r() - 0.5) * 22;
    if (inside(x, z, 0.4) || (yard(x, z) && r() < 0.7)) continue;
    const kind = r();
    if (kind < 0.62) {
      const w = 0.025 + Math.pow(r(), 2) * 0.07;
      p.put('stone', stone(w, w * (0.5 + r() * 0.4), w * (0.7 + r() * 0.5), Math.floor(r() * 24), TILE.stone, r(), r()), M(x, w * 0.12, z, r() * 6.3, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4), new THREE.Color(0.8 + r() * 0.25, 0.8 + r() * 0.22, 0.78 + r() * 0.2));
    } else if (kind < 0.9) {
      const len = 0.12 + r() * 0.5;
      p.put('planks', plank(len, 0.05 + r() * 0.11, 0.022, Math.floor(r() * 8), r()), M(x, 0.011, z, r() * 6.3, 0, (r() - 0.5) * 0.08), new THREE.Color(0.85 + r() * 0.2, 0.82 + r() * 0.2, 0.78 + r() * 0.2));
    } else {
      const w = 0.08 + r() * 0.14;
      p.put('stone', stone(w, w * 0.55, w * 0.8, Math.floor(r() * 24), TILE.stone, r(), r()), M(x, w * 0.18, z, r() * 6.3, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5), W);
    }
    n++;
  }
}

class Pile {
  constructor() { this.batches = new Map(); }
  put(mat, prim, m, c) { let b = this.batches.get(mat); if (!b) { b = new Batch(); this.batches.set(mat, b); } b.add(prim, m, c || W, 0); }
  build(mats) {
    const g = new THREE.Group();
    this.batches.forEach(function (b, mat) {
      const mesh = new THREE.Mesh(b.geometry(), mats[mat]);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
    });
    return g;
  }
}

function pallet(p, r, x, z, ry) {
  const base = M(x, 0, z, ry);
  for (let k = 0; k < 3; k++) p.put('planks', plank(1.2, 0.1, 0.1, Math.floor(r() * 8), r() * 0.5), base.clone().multiply(M(0, 0.05, -0.45 + k * 0.45)), W);
  for (let k = 0; k < 7; k++) p.put('planks', plank(0.13, 1.0, 0.022, Math.floor(r() * 8), r() * 0.5), base.clone().multiply(Bm(-0.54 + k * 0.18, 0.111, 0, FLAT[0], FLAT[1], FLAT[2]).multiply(M(0, 0, 0, Math.PI / 2))), W);
  return base;
}

export function createYard(plan, terrain, mats, seed = 5, opts = {}) {
  const r = rng(seed);
  const f = plan.footprint;
  const cx = f.x1 + 5.2, cz = f.z1 + 3.6;
  const group = new THREE.Group();
  group.name = 'yard';
  const p = new Pile();
  const stacks = {};
  const blocked = [];
  function spot(kind, x, z, sx, sz) { stacks[kind] = new THREE.Vector3(x + sx, 0, z + sz); blocked.push([x, z, 0.9]); }

  // доски на поддоне
  {
    const x = cx - 3.5, z = cz - 1.2;
    const base = pallet(p, r, x, z, 0.1);
    for (let l = 0; l < 5; l++) for (let k = 0; k < 6; k++) {
      p.put('planks', plank(2.6, 0.16, 0.025, Math.floor(r() * 8), r() * 0.1), base.clone().multiply(Bm(-0.42 + k * 0.17, 0.135 + l * 0.026, (r() - 0.5) * 0.06, [0, 0, 1], [1, 0, 0], [0, 1, 0])), W);
    }
    spot('planks', x, z, -1.0, 1.1);
  }
  // жерди связками
  {
    const x = cx - 5.6, z = cz + 1.2;
    for (let b = 0; b < 3; b++) for (let k = 0; k < 9; k++) {
      const s = stick(2.8, 0.035, 0.028, (r() - 0.5) * 0.05, TILE.bark);
      p.put('bark', s, M(x - 1.4, 0.04 + (k % 3) * 0.06 + b * 0.0, z + b * 0.55 + Math.floor(k / 3) * 0.07, 0.02 * (r() - 0.5)), W);
    }
    spot('sticks', x, z, 0.8, 0.6);
  }
  // камень на двух поддонах и тачки
  {
    const x = cx - 0.6, z = cz - 1.6;
    const b1 = pallet(p, r, x, z, 0), b2 = pallet(p, r, x + 1.3, z, 0);
    [b1, b2].forEach(function (base) {
      for (let k = 0; k < 14; k++) {
        const w = 0.35 + r() * 0.25, h = 0.2 + r() * 0.08, d = 0.24 + r() * 0.1;
        const lx = -0.4 + (k % 3) * 0.4, lz = -0.38 + (Math.floor(k / 3) % 3) * 0.38, ly = 0.24 + Math.floor(k / 9) * 0.25;
        p.put('stone', stone(w, h, d, Math.floor(r() * 24), TILE.stone, r(), r()), base.clone().multiply(M(lx, ly, lz, r() * 0.3)), new THREE.Color(0.95 + r() * 0.1, 0.95 + r() * 0.08, 0.92 + r() * 0.08));
      }
    });
    spot('stones', x + 0.65, z, 0, 1.2);
  }
  // профлист на брусках
  {
    const x = cx + 2.6, z = cz - 0.8;
    [-0.9, 0, 0.9].forEach(function (o) { p.put('planks', plank(1.0, 0.08, 0.08, Math.floor(r() * 8), 0), M(x + o, 0.04, z, Math.PI / 2), W); });
    for (let k = 0; k < 8; k++) {
      const s = corrugated(0.8, 2.4, TILE.zinc, 0.076, 0.009, 0);
      for (let i = 0; i < s.uv.length; i += 2) s.uv[i] += r();
      p.put(k % 3 === 2 ? 'paintsheet' : 'zinc', s, M(x - 1.2, 0.1 + k * 0.022, z + 0.4 + (r() - 0.5) * 0.03, Math.PI / 2, -Math.PI / 2, 0), W);
    }
    spot('sheets', x, z, 0, 0.95);
  }
  // бронеплиты
  {
    const x = cx + 2.8, z = cz + 2.0;
    [-0.4, 0.4].forEach(function (o) { p.put('planks', plank(1.1, 0.08, 0.08, Math.floor(r() * 8), 0), M(x + o, 0.04, z, Math.PI / 2), W); });
    for (let k = 0; k < 6; k++) p.put('steelplate', boxUV(roundedBox(1.0, 0.03, 1.0, 0.005), TILE.steelplate[0], TILE.steelplate[1], r(), r()), M(x + (r() - 0.5) * 0.04, 0.1 + k * 0.032, z + (r() - 0.5) * 0.04, (r() - 0.5) * 0.06), W);
    spot('plates', x, z, -0.9, 0);
  }
  // ящики (двери, окна) и мешки раствора
  {
    const x = cx + 0.4, z = cz + 2.2;
    for (let k = 0; k < 2; k++) {
      const bx = x + k * 1.25;
      for (let s = 0; s < 6; s++) p.put('planks', plank(1.1, 0.15, 0.022, Math.floor(r() * 8), r() * 0.5), M(bx, 0.1 + s * 0.16, z - 0.35, 0), W);
      for (let s = 0; s < 6; s++) p.put('planks', plank(1.1, 0.15, 0.022, Math.floor(r() * 8), r() * 0.5), M(bx, 0.1 + s * 0.16, z + 0.35, 0), W);
      for (let s = 0; s < 6; s++) p.put('planks', plank(0.7, 0.15, 0.022, Math.floor(r() * 8), r() * 0.5), M(bx - 0.55, 0.1 + s * 0.16, z, Math.PI / 2), W);
      for (let s = 0; s < 6; s++) p.put('planks', plank(0.7, 0.15, 0.022, Math.floor(r() * 8), r() * 0.5), M(bx + 0.55, 0.1 + s * 0.16, z, Math.PI / 2), W);
    }
    spot('box', x + 0.6, z, 0, -1.0);
    for (let k = 0; k < 8; k++) {
      const b = boxUV(roundedBox(0.62, 0.13, 0.42, 0.05, 5), 0.6, 0.6, r(), r());
      p.put('paint', b, M(cx - 3.2 + (k % 2) * 0.66, 0.07 + Math.floor(k / 2) * 0.13, cz + 3.0, (r() - 0.5) * 0.12), new THREE.Color(0.42, 0.37, 0.3));
    }
  }
  // козлы с доской
  [[cx - 1.8, cz + 3.6], [cx - 0.4, cz + 3.6]].forEach(function (c) {
    [-0.25, 0.25].forEach(function (o) {
      p.put('planks', plank(0.75, 0.06, 0.05, Math.floor(r() * 8), 0), M(c[0], 0.36, c[1] + o, 0, 0, 0.35), W);
      p.put('planks', plank(0.75, 0.06, 0.05, Math.floor(r() * 8), 0), M(c[0], 0.36, c[1] + o, 0, 0, -0.35), W);
    });
    p.put('planks', plank(0.6, 0.08, 0.08, Math.floor(r() * 8), 0), M(c[0], 0.72, c[1], Math.PI / 2), W);
  });
  p.put('planks', plank(2.2, 0.2, 0.03, 3, 0.2), M(cx - 1.1, 0.78, cz + 3.6), W);

  // бытовка: контейнер 6 × 2,4 м из профлиста на блоках
  {
    const x = cx + 6.5, z = cz + 0.5, L = 6.0, D = 2.4, H = 2.55;
    for (const bx of [-2.6, 0, 2.6]) for (const bz of [-0.9, 0.9]) p.put('concrete', boxUV(roundedBox(0.4, 0.25, 0.4, 0.02), 3, 3, r(), r()), M(x + bx, 0.12, z + bz), W);
    p.put('tube', boxUV(roundedBox(L, 0.12, D, 0.01), 0.5, 0.5), M(x, 0.31, z), W);
    p.put('tube', boxUV(roundedBox(L, 0.1, D, 0.01), 0.5, 0.5), M(x, H + 0.32, z), W);
    for (let s = 0; s < 2; s++) {
      let k = 0;
      for (let u = -L / 2; u < L / 2 - 0.05; u += 0.73, k++) {
        const cw = Math.min(0.8, L / 2 - u);
        const sh = corrugated(cw, H, TILE.paintsheet, 0.076, 0.012, 0);
        for (let i = 0; i < sh.uv.length; i += 2) sh.uv[i] += r();
        if (s === 0) p.put('paintsheet', sh, M(x + u, 0.37, z + D / 2, 0), W);
        else p.put('paintsheet', sh, M(x - u, 0.37, z - D / 2, Math.PI), W);
      }
    }
    [[x - L / 2, 1], [x + L / 2, -1]].forEach(function (e) {
      for (let u = -D / 2; u < D / 2 - 0.05; u += 0.73) {
        const cw = Math.min(0.8, D / 2 - u);
        const sh = corrugated(cw, H, TILE.paintsheet, 0.076, 0.012, 0);
        p.put('paintsheet', sh, e[1] > 0 ? M(e[0], 0.37, z + u + cw, -Math.PI / 2) : M(e[0], 0.37, z - u - cw, Math.PI / 2), W);
      }
    });
    p.put('zinc', boxUV(roundedBox(L + 0.1, 0.06, D + 0.1, 0.01), 3, 3, r(), r()), M(x, H + 0.4, z), W);
    // дверь и окно на длинной стороне
    p.put('tube', boxUV(roundedBox(0.95, 2.0, 0.06, 0.01), 0.5, 0.5), M(x - 1.6, 1.37, z + D / 2 + 0.03), new THREE.Color(0.5, 0.5, 0.52));
    p.put('glass', { pos: new Float32Array([0, 0, 0, 1.1, 0, 0, 1.1, 0.8, 0, 0, 0.8, 0]), nrm: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), uv: new Float32Array(8), index: new Uint32Array([0, 1, 2, 0, 2, 3]) }, M(x + 0.6, 1.3, z + D / 2 + 0.04), W);
    p.put('tube', boxUV(roundedBox(1.2, 0.06, 0.08, 0.01), 0.5, 0.5), M(x + 1.15, 1.27, z + D / 2 + 0.04), W);
    p.put('tube', boxUV(roundedBox(1.2, 0.06, 0.08, 0.01), 0.5, 0.5), M(x + 1.15, 2.13, z + D / 2 + 0.04), W);
    blocked.push([x, z, 3.4], [x - 2, z, 2.2], [x + 2, z, 2.2]);
  }
  // биотуалет
  {
    const x = cx + 10.4, z = cz + 2.4;
    p.put('paint', boxUV(roundedBox(1.1, 2.2, 1.1, 0.06, 5), 1, 1), M(x, 1.1, z), new THREE.Color(0.08, 0.22, 0.55));
    p.put('paint', boxUV(roundedBox(1.2, 0.08, 1.2, 0.04, 5), 1, 1), M(x, 2.24, z), new THREE.Color(0.85, 0.85, 0.82));
    p.put('blacksteel', boxUV(roundedBox(0.7, 1.85, 0.02, 0.02), 1, 1), M(x, 1.05, z + 0.56), new THREE.Color(0.3, 0.32, 0.36));
    blocked.push([x, z, 0.9]);
  }
  // бочка
  p.put('paint', cylinder(0.29, 0.29, 0.88, 18), M(cx + 4.8, 0, cz + 3.6), new THREE.Color(0.08, 0.28, 0.6));
  // песок с лопатой, бетономешалка, вёдра, мелочь по площадке
  sandPile(p, r, cx - 7.6, cz + 4.3, 1.45, 0.78);
  blocked.push([cx - 7.6, cz + 4.3, 1.6]);
  mixer(p, cx + 1.7, cz + 5.3, -0.5);
  blocked.push([cx + 1.7, cz + 5.3, 1.0]);
  bucket(p, cx + 0.9, cz + 4.6, new THREE.Color(0.12, 0.12, 0.12), true);
  bucket(p, cx + 0.55, cz + 4.95, new THREE.Color(0.85, 0.36, 0.06), false, 1.1);
  bucket(p, cx - 0.2, cz - 2.3, new THREE.Color(0.12, 0.12, 0.12), true, 2.3);
  debris(p, r, f, cx, cz);
  // мачты освещения по диагонали от здания — ночью заливают светом стены, видимые с площадки
  const glow = new Batch();
  const fcx = (f.x0 + f.x1) / 2, fcz = (f.z0 + f.z1) / 2;
  const towerAt = [[f.x0 - 3.2, f.z1 + 3.0], [f.x1 + 3.0, f.z0 - 3.2]];
  const heads = towerAt.map(function (t) {
    blocked.push([t[0], t[1], 1.4]);
    return lightTower(p, glow, t[0], t[1], fcx, fcz);
  });
  // кабели от бытовки к мачтам
  towerAt.forEach(function (t) { cable(p, r, new THREE.Vector3(cx + 3.6, 0, cz + 1.4), new THREE.Vector3(t[0], 0, t[1])); });
  // бытовка ночью: светлое окно и лампа над дверью
  const ctx = cx + 6.5, ctz = cz + 0.5 + 1.2;
  p.put('blacksteel', boxUV(roundedBox(0.18, 0.1, 0.12, 0.02, 3), 1, 1), M(ctx - 1.6, 2.5, ctz + 0.07), W);
  const g = p.build(mats);
  group.add(g);

  const lampMat = new THREE.MeshStandardMaterial({ color: 0x161616, emissive: 0xfff3e4, emissiveIntensity: 0, roughness: 0.35 });
  group.add(new THREE.Mesh(glow.geometry(), lampMat));
  const roomMat = new THREE.MeshStandardMaterial({ color: 0x2b2722, emissive: 0xff9f45, emissiveIntensity: 0, roughness: 0.9 });
  const room = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), roomMat);
  room.position.set(ctx + 1.15, 1.7, ctz + 0.032);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0xffd8a0, emissiveIntensity: 0, roughness: 0.3 });
  const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.05), bulbMat);
  bulb.rotation.x = Math.PI / 2;
  bulb.position.set(ctx - 1.6, 2.449, ctz + 0.07);
  group.add(room, bulb);
  const door = new THREE.PointLight(0xffd29a, 0, 13, 2);
  door.position.set(ctx - 1.6, 2.38, ctz + 0.3);
  group.add(door);
  const spots = heads.map(function (h, i) {
    const sp = new THREE.SpotLight(0xfff1df, 0, 75, 0.64, 0.55, 2);
    sp.position.copy(h);
    sp.target.position.set(fcx, 0.6, fcz);
    if (i === 0 && opts.shadowSize) {
      sp.castShadow = true;
      sp.shadow.mapSize.set(opts.shadowSize, opts.shadowSize);
      sp.shadow.bias = -0.0004;
      sp.shadow.normalBias = 0.025;
      sp.shadow.radius = 3;
      sp.shadow.camera.near = 0.5;
      sp.shadow.camera.far = 45;
      sp.shadow.autoUpdate = false;
    }
    group.add(sp, sp.target);
    return sp;
  });
  const lights = spots.concat([door]);
  // night 0..1: прожекторы, окна и лампа включаются в сумерки (тени прожектора считаются только ночью)
  function night(k) {
    const on = THREE.MathUtils.smoothstep(k, 0.15, 0.55);
    // днём конус почти закрыт: свет и выборка тени прожектора пропускаются на всех пикселях (без пересборки шейдеров)
    spots.forEach(function (sp) { sp.intensity = 150 * on; sp.angle = on > 0.001 ? 0.64 : 0.005; if (sp.castShadow) sp.shadow.autoUpdate = on > 0.01; });
    lampMat.emissiveIntensity = 26 * on;
    roomMat.emissiveIntensity = 0.55 * on;
    bulbMat.emissiveIntensity = 18 * on;
    door.intensity = 9 * on;
  }
  night(0);
  return { group, stacks, blocked, lights, night, center: new THREE.Vector3(cx, 0, cz) };
}

// Приставная лестница длиной len (м): две тетивы и ступени через 0,3 м.
export function ladder(len, mats) {
  const p = new Pile();
  const r = rng(Math.round(len * 10));
  [-0.22, 0.22].forEach(function (x) {
    p.put('planks', plank(len, 0.07, 0.04, Math.floor(r() * 8), 0.1), Bm(x, len / 2, 0, [0, 1, 0], [0, 0, 1], [1, 0, 0]), W);
  });
  for (let y = 0.3; y < len - 0.1; y += 0.3) p.put('planks', plank(0.44, 0.045, 0.03, Math.floor(r() * 8), r() * 0.5), M(0, y, 0), W);
  const g = p.build(mats);
  g.traverse(function (o) { o.castShadow = true; });
  return g;
}
