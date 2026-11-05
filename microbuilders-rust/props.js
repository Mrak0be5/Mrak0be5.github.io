// Хозяйство стройки: склад материалов (поддоны досок, камень, листы, плиты, связки жердей, ящики с дверями
// и окнами, мешки раствора), бытовка из профлиста, биотуалет, козлы, бочка, прожекторы; приставные лестницы
// рабочих. Всё — из тех же примитивов и материалов, что и детали.
import * as THREE from 'three';
import { Batch, plank, roundedBox, boxUV, stick, cylinder, corrugated, stone, rng } from './geo.js?v=3ae8fc6';
import { TEXTURE_TILES as TILE } from './textures.js?v=3ae8fc6';

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

export function createYard(plan, terrain, mats, seed = 5) {
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
  const g = p.build(mats);
  group.add(g);

  const lights = [];
  return { group, stacks, blocked, lights, center: new THREE.Vector3(cx, 0, cz) };
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
