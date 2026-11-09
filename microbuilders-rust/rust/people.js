// Рабочие кодом. Тело — гладкое поле расстояний из эллипсоидов и конусов (торс, голова с носом, ушами и
// бровями, руки в перчатках, ноги в ботинках), сетка — marching cubes (таблицы из three/examples), нормали —
// градиент поля. Скелет из 20 костей, веса кожи — по близости к примитивам своей кости (мягкие суставы).
// Одежда — область вершины (куртка, светоотражающий жилет с лентами, ремень, брюки, перчатки, ботинки,
// волосы, глаза, губы): цвет и шероховатость задаёт материал рабочего, сетка общая. Каска, инструмент и ноша —
// отдельные меши на костях (каждый — одной сеткой материала gear, cw-ranks.js). Одежда, каска и снаряжение — по
// разряду рабочего оригинала (dress), облик — по номеру найма. Движения процедурные: ходьба с маховыми руками,
// перенос, удары молотком, укладка, подъём по лестнице, перекур, обед на ящике, сон (на спине, на боку, сидя),
// жесты поверх действия («Айда курить!», новый разряд).
import * as THREE from 'three';
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, Batch } from './geo.js?v=9f2863b';
import { linkSky } from './world.js?v=9f2863b';
import { markDynamic, DYNAMIC } from './render.js?v=9f2863b';
import { loadHumans, makeHuman } from './humans.js?v=9f2863b';
import { outfitOf, looksOf, helmetGear, beltGear, radioGear, padGear, auraGeometry, gearMaterials, gearOut, profileRadius } from './cw-ranks.js?v=9f2863b';

// ---------- скелет ----------

const A = THREE.MathUtils.degToRad(38);
const SA = Math.sin(A), CA = Math.cos(A);
function arm(s) {
  const sh = [s * 0.185, 1.435, -0.005];
  const el = [sh[0] + s * 0.29 * SA, sh[1] - 0.29 * CA, -0.005];
  const wr = [el[0] + s * 0.255 * SA, el[1] - 0.255 * CA, -0.005];
  const tip = [wr[0] + s * 0.18 * SA, wr[1] - 0.18 * CA, -0.005];
  return { sh, el, wr, tip, d: [s * SA, -CA, 0] };
}
const ARM = { L: arm(1), R: arm(-1) };
function leg(s) { return { hip: [s * 0.092, 0.935, 0], knee: [s * 0.105, 0.505, 0.012], ankle: [s * 0.112, 0.1, -0.012] }; }
const LEG = { L: leg(1), R: leg(-1) };

export const BONES = [
  ['root', -1, [0, 0, 0]], ['hips', 0, [0, 0.98, 0]], ['spine', 1, [0, 1.1, 0]], ['chest', 2, [0, 1.3, 0]],
  ['neck', 3, [0, 1.48, 0]], ['head', 4, [0, 1.6, 0.01]],
  ['shoulderL', 3, [0.045, 1.445, 0]], ['upperArmL', 6, ARM.L.sh], ['foreArmL', 7, ARM.L.el], ['handL', 8, ARM.L.wr],
  ['shoulderR', 3, [-0.045, 1.445, 0]], ['upperArmR', 10, ARM.R.sh], ['foreArmR', 11, ARM.R.el], ['handR', 12, ARM.R.wr],
  ['thighL', 1, LEG.L.hip], ['shinL', 14, LEG.L.knee], ['footL', 15, LEG.L.ankle],
  ['thighR', 1, LEG.R.hip], ['shinR', 17, LEG.R.knee], ['footR', 18, LEG.R.ankle],
];
const B = {};
BONES.forEach(function (b, i) { B[b[0]] = i; });

// ---------- примитивы поля ----------
// [тип, кость, область, k (мягкость стыка), параметры]; области: 0 кожа, 1 куртка, 4 брюки, 6 перчатки, 7 ботинки
const R = { skin: 0, jacket: 1, vest: 2, tape: 3, pants: 4, belt: 5, glove: 6, boot: 7, sole: 8, hair: 9, eye: 10, sclera: 11, lips: 12, brow: 13, beard: 14 };
const TORSO = new Set();

function primitives(build) {
  const W = build.width, belly = build.belly;
  const P = [];
  const ell = function (bone, reg, k, c, r) { P.push({ t: 0, bone, reg, k, c, r }); return P.length - 1; };
  const cone = function (bone, reg, k, a, b, r1, r2) { P.push({ t: 1, bone, reg, k, a, b, r1, r2 }); return P.length - 1; };
  TORSO.add(ell(B.hips, R.pants, 0.04, [0, 0.955, -0.005], [0.165 * W, 0.105, 0.118 * W]));
  TORSO.add(ell(B.spine, R.jacket, 0.05, [0, 1.095, 0.008 + belly * 0.02], [0.148 * W * (1 + belly * 0.12), 0.12, 0.108 * W * (1 + belly * 0.35)]));
  TORSO.add(ell(B.chest, R.jacket, 0.05, [0, 1.29, 0.012], [0.19 * W, 0.155, 0.125 * W]));
  TORSO.add(cone(B.chest, R.jacket, 0.04, [-0.158 * W, 1.415, -0.004], [0.158 * W, 1.415, -0.004], 0.073, 0.073));
  TORSO.add(ell(B.chest, R.jacket, 0.04, [0, 1.33, -0.03], [0.168 * W, 0.12, 0.095]));
  // воротник куртки вокруг шеи; голова — отдельной сеткой на кости головы (buildHead)
  ell(B.chest, R.jacket, 0.018, [0, 1.462, -0.008], [0.078, 0.024, 0.072]);
  cone(B.neck, R.skin, 0.03, [0, 1.43, -0.008], [0, 1.57, 0.0], 0.06, 0.057);
  ['L', 'R'].forEach(function (side) {
    const s = side === 'L' ? 1 : -1;
    const a = ARM[side], d = a.d;
    const up = B['upperArm' + side], fo = B['foreArm' + side], ha = B['hand' + side];
    ell(up, R.jacket, 0.035, [s * 0.18 * W, 1.425, -0.004], [0.073 * W, 0.076, 0.07]);
    cone(up, R.jacket, 0.02, a.sh, a.el, 0.061 * W, 0.05);
    ell(fo, R.jacket, 0.015, a.el, [0.051, 0.051, 0.051]);
    cone(fo, R.jacket, 0.02, a.el, a.wr, 0.05, 0.04);
    const k1 = [a.wr[0] + d[0] * 0.1, a.wr[1] + d[1] * 0.1, a.wr[2]];
    const k2 = [a.wr[0] + d[0] * 0.18, a.wr[1] + d[1] * 0.18, a.wr[2]];
    cone(ha, R.glove, 0.015, a.wr, k1, 0.041, 0.036);
    cone(ha, R.glove, 0.012, [a.wr[0] + d[0] * 0.09, a.wr[1] + d[1] * 0.09, a.wr[2]], k2, 0.032, 0.024);
    cone(ha, R.glove, 0.01, [a.wr[0] + d[0] * 0.035, a.wr[1] + d[1] * 0.035, a.wr[2] + 0.022], [a.wr[0] + d[0] * 0.08, a.wr[1] + d[1] * 0.08, a.wr[2] + 0.054], 0.018, 0.015);
    const l = LEG[side];
    const th = B['thigh' + side], sh = B['shin' + side], ft = B['foot' + side];
    cone(th, R.pants, 0.04, l.hip, l.knee, 0.097 * W, 0.063);
    ell(th, R.pants, 0.012, [s * 0.158 * W, 0.64, 0.004], [0.022, 0.065, 0.05]);
    ell(sh, R.pants, 0.02, l.knee, [0.059, 0.062, 0.061]);
    cone(sh, R.pants, 0.02, l.knee, l.ankle, 0.061, 0.048);
    ell(sh, R.pants, 0.03, [s * 0.108, 0.34, -0.028], [0.055, 0.11, 0.055]);
    cone(ft, R.boot, 0.02, [s * 0.112, 0.21, -0.012], [s * 0.112, 0.06, -0.01], 0.06, 0.063);
    cone(ft, R.boot, 0.03, [s * 0.112, 0.055, -0.072], [s * 0.112, 0.05, 0.17], 0.058, 0.05);
  });
  return P;
}

function primDist(q, x, y, z) {
  if (q.t === 0) {
    const px = (x - q.c[0]) / q.r[0], py = (y - q.c[1]) / q.r[1], pz = (z - q.c[2]) / q.r[2];
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px / q.r[0], qy = py / q.r[1], qz = pz / q.r[2];
    const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1e-6;
    return (k0 * (k0 - 1)) / k1;
  }
  const bax = q.b[0] - q.a[0], bay = q.b[1] - q.a[1], baz = q.b[2] - q.a[2];
  const pax = x - q.a[0], pay = y - q.a[1], paz = z - q.a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const t = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / l2));
  const dx = pax - bax * t, dy = pay - bay * t, dz = paz - baz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (q.r1 + (q.r2 - q.r1) * t);
}
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * h * k) / 6;
}
function field(P, x, y, z) {
  let d = 1e9;
  for (let i = 0; i < P.length; i++) d = smin(d, primDist(P[i], x, y, z), P[i].k);
  return Math.max(d, -y);
}
function primBox(q) {
  const pad = q.k + 0.02;
  if (q.t === 0) return [q.c[0] - q.r[0] - pad, q.c[1] - q.r[1] - pad, q.c[2] - q.r[2] - pad, q.c[0] + q.r[0] + pad, q.c[1] + q.r[1] + pad, q.c[2] + q.r[2] + pad];
  const r = Math.max(q.r1, q.r2) + pad;
  return [Math.min(q.a[0], q.b[0]) - r, Math.min(q.a[1], q.b[1]) - r, Math.min(q.a[2], q.b[2]) - r, Math.max(q.a[0], q.b[0]) + r, Math.max(q.a[1], q.b[1]) + r, Math.max(q.a[2], q.b[2]) + r];
}

// ---------- тело ----------

const EDGE_CORNERS = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const CORNER = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];

function regionOf(prim, pi, x, y, z) {
  const ax = Math.abs(x);
  let reg = prim.reg;
  if (TORSO.has(pi) && reg === R.jacket && y > 1.0 && y < 1.47) reg = R.vest;
  if (reg === R.vest && ((y > 1.11 && y < 1.145) || (y > 1.255 && y < 1.29) || (y > 1.29 && ax > 0.07 && ax < 0.104))) reg = R.tape;
  if (TORSO.has(pi) && y > 0.985 && y < 1.03) reg = R.belt;
  if (reg === R.skin) {
    if (y < 1.47) return R.jacket;
    const ex = ax - 0.032, ey = y - 1.677, ez = z - 0.092;
    const de = Math.sqrt(ex * ex + ey * ey + ez * ez);
    if (de < 0.0078 && z > 0.07) return R.eye;
    if (de < 0.0125 && z > 0.07) return R.sclera;
    if (y > 1.694 && y < 1.707 && ax > 0.012 && ax < 0.056 && z > 0.07) return R.brow;
    if (y > 1.6 && y < 1.611 && ax < 0.024 && z > 0.083) return R.lips;
    if (y > 1.6 && z < -0.015 && y < 1.73) return R.hair;
    if (y > 1.705 && z < 0.06) return R.hair;
    if (y < 1.628 && z > 0.01 && ax < 0.07) return R.beard;
  }
  if (reg === R.boot && y < 0.028) return R.sole;
  return reg;
}

// Marching cubes по сетке значений поля F (nx × ny × nz, шаг cell от x0, y0, z0); вершины на рёбрах — общие.
function polygonize(F, nx, ny, nz, x0, y0, z0, cell) {
  const idx = function (i, j, k) { return i + nx * (j + ny * k); };
  const pos = [], index = [];
  const edgeVert = new Map();
  function vertexOn(i, j, k, e) {
    const c0 = EDGE_CORNERS[e][0], c1 = EDGE_CORNERS[e][1];
    const a = CORNER[c0], b = CORNER[c1];
    const ia = idx(i + a[0], j + a[1], k + a[2]), ib = idx(i + b[0], j + b[1], k + b[2]);
    const key = ia < ib ? ia * 8388608 + ib : ib * 8388608 + ia;
    let v = edgeVert.get(key);
    if (v !== undefined) return v;
    const fa = F[ia], fb = F[ib];
    const t = fa / (fa - fb);
    pos.push(x0 + (i + a[0] + (b[0] - a[0]) * t) * cell, y0 + (j + a[1] + (b[1] - a[1]) * t) * cell, z0 + (k + a[2] + (b[2] - a[2]) * t) * cell);
    v = pos.length / 3 - 1;
    edgeVert.set(key, v);
    return v;
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0;
    for (let c = 0; c < 8; c++) if (F[idx(i + CORNER[c][0], j + CORNER[c][1], k + CORNER[c][2])] < 0) ci |= 1 << c;
    if (!edgeTable[ci]) continue;
    for (let t = 0; t < 16 && triTable[ci * 16 + t] !== -1; t += 3) {
      index.push(vertexOn(i, j, k, triTable[ci * 16 + t]), vertexOn(i, j, k, triTable[ci * 16 + t + 1]), vertexOn(i, j, k, triTable[ci * 16 + t + 2]));
    }
  }
  return { pos, index };
}
// Обход треугольников — по нормали поля (наружу).
function orientByNormals(pos, index, nrm) {
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    // по средней нормали трёх вершин: на изломах поля нормаль одной вершины бывает неверной (дырки)
    const nx = nrm[a * 3] + nrm[b * 3] + nrm[c * 3], ny = nrm[a * 3 + 1] + nrm[b * 3 + 1] + nrm[c * 3 + 1], nz = nrm[a * 3 + 2] + nrm[b * 3 + 2] + nrm[c * 3 + 2];
    if (cx * nx + cy * ny + cz * nz < 0) { index[t + 1] = c; index[t + 2] = b; }
  }
}

export function buildBody(build, cell) {
  const P = primitives(build);
  const x0 = -0.74, y0 = -0.012, z0 = -0.22, x1 = 0.74, y1 = 1.84, z1 = 0.3;
  const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1;
  const F = new Float32Array(nx * ny * nz).fill(1e9);
  const idx = function (i, j, k) { return i + nx * (j + ny * k); };
  // поле по коробкам примитивов: каждый обновляет только свою область
  P.forEach(function (q) {
    const b = primBox(q);
    const i0 = Math.max(0, Math.floor((b[0] - x0) / cell)), i1 = Math.min(nx - 1, Math.ceil((b[3] - x0) / cell));
    const j0 = Math.max(0, Math.floor((b[1] - y0) / cell)), j1 = Math.min(ny - 1, Math.ceil((b[4] - y0) / cell));
    const k0 = Math.max(0, Math.floor((b[2] - z0) / cell)), k1 = Math.min(nz - 1, Math.ceil((b[5] - z0) / cell));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = x0 + i * cell, y = y0 + j * cell, z = z0 + k * cell;
      const id = idx(i, j, k);
      F[id] = smin(F[id], primDist(q, x, y, z), q.k);
    }
  });
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const y = y0 + j * cell;
    const id = idx(i, j, k);
    F[id] = Math.max(F[id], -y);
  }
  const { pos, index } = polygonize(F, nx, ny, nz, x0, y0, z0, cell);
  const n = pos.length / 3;
  const nrm = new Float32Array(n * 3), skinI = new Uint16Array(n * 4), skinW = new Float32Array(n * 4), reg = new Float32Array(n);
  const e = cell * 0.5;
  const acc = new Float32Array(BONES.length);
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let gx = field(P, x + e, y, z) - field(P, x - e, y, z);
    let gy = field(P, x, y + e, z) - field(P, x, y - e, z);
    let gz = field(P, x, y, z + e) - field(P, x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    nrm[v * 3] = gx / gl; nrm[v * 3 + 1] = gy / gl; nrm[v * 3 + 2] = gz / gl;
    acc.fill(0);
    let dmin = 1e9, pmin = 0;
    const ds = P.map(function (q, pi) { const d = primDist(q, x, y, z); if (d < dmin) { dmin = d; pmin = pi; } return d; });
    ds.forEach(function (d, pi) { acc[P[pi].bone] += Math.exp(-(d - dmin) / 0.012); });
    const order = Array.from(acc.keys()).sort(function (a, b) { return acc[b] - acc[a]; }).slice(0, 4);
    const sum = order.reduce(function (s, b) { return s + acc[b]; }, 0) || 1;
    order.forEach(function (b, k) { skinI[v * 4 + k] = b; skinW[v * 4 + k] = acc[b] / sum; });
    reg[v] = regionOf(P[pmin], pmin, x, y, z);
  }
  orientByNormals(pos, index, nrm);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(skinW, 4));
  g.setAttribute('aReg', new THREE.BufferAttribute(reg, 1));
  g.setAttribute('aRest', new THREE.Float32BufferAttribute(pos.slice(), 3));
  g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

// ---------- голова ----------
// Голова — своя сетка с шагом 4 мм на кости головы (жёстко): череп, лицо, скулы, челюсть, подбородок, надбровье,
// нос со спинкой и крыльями, губы, уши; глазницы, рот и ушные раковины вырезаны мягким вычитанием. Варианты:
// 0 — обычное лицо, 1 — шире, 2 — с бородой. Глаза — отдельные сферы с радужкой (eyeGeometry).
export const HEAD_REST = BONES[5][2];
function smax(a, b, k) { return -smin(-a, -b, k); }
function headPrims(v) {
  const P = [], sub = [];
  const ell = function (reg, k, c, r) { P.push({ t: 0, reg, k, c, r }); };
  const cone = function (reg, k, a, b, r1, r2) { P.push({ t: 1, reg, k, a, b, r1, r2 }); };
  const w = v === 1 ? 1.07 : 1.0;
  ell(R.skin, 0.03, [0, 1.69, -0.008], [0.076 * w, 0.094, 0.091]);
  ell(R.skin, 0.03, [0, 1.645, 0.03], [0.063 * w, 0.07, 0.072]);
  ell(R.skin, 0.025, [0, 1.594, 0.043], [0.046 * w, 0.031, 0.042]);
  ell(R.skin, 0.015, [0, 1.58, 0.077], [0.019, 0.017, 0.014]);
  [1, -1].forEach(function (sd) {
    ell(R.skin, 0.02, [sd * 0.043 * w, 1.658, 0.071], [0.021, 0.016, 0.019]);
    ell(R.skin, 0.008, [sd * 0.078 * w, 1.668, 0.002], [0.01, 0.028, 0.018]);
    ell(R.skin, 0.006, [sd * 0.0115, 1.646, 0.106], [0.0085, 0.008, 0.008]);
  });
  cone(R.skin, 0.012, [-0.046, 1.703, 0.083], [0.046, 1.703, 0.083], 0.01, 0.01);
  cone(R.skin, 0.008, [0, 1.69, 0.095], [0, 1.655, 0.114], 0.0075, 0.0105);
  ell(R.skin, 0.006, [0, 1.648, 0.115], [0.012, 0.011, 0.012]);
  ell(R.skin, 0.006, [0, 1.612, 0.094], [0.02, 0.008, 0.006]);
  [1, -1].forEach(function (sd) {
    // веки обтягивают глазное яблоко слоем 1,5 мм (глаз — отдельная сфера r 11,5 мм внутри)
    ell(R.skin, 0.004, [sd * 0.031, 1.679, 0.0765], [0.013, 0.013, 0.013]);
  });
  cone(R.skin, 0.03, [0, 1.535, -0.012], [0, 1.6, -0.002], 0.058, 0.056);
  if (v === 2) ell(R.beard, 0.02, [0, 1.598, 0.056], [0.056, 0.04, 0.046]);
  [1, -1].forEach(function (sd) {
    // прорезь век — миндалина 2,7 × 1,1 см: видна только часть глазного яблока
    // прорезь век — миндалина 2,7 × 1,1 см только сквозь кожу века: глаз виден вровень с веками
    sub.push({ t: 0, k: 0.002, c: [sd * 0.031, 1.6792, 0.0915], r: [0.0135, 0.0056, 0.0045] });
    sub.push({ t: 0, k: 0.004, c: [sd * 0.084 * w, 1.668, 0.008], r: [0.005, 0.014, 0.008] });
  });
  sub.push({ t: 1, k: 0.002, a: [-0.015, 1.6115, 0.1035], b: [0.015, 1.6115, 0.1035], r1: 0.0012, r2: 0.0012 });
  return { P, sub };
}
function headField(H, x, y, z) {
  let d = 1e9;
  for (let i = 0; i < H.P.length; i++) d = smin(d, primDist(H.P[i], x, y, z), H.P[i].k);
  for (let i = 0; i < H.sub.length; i++) d = smax(d, -primDist(H.sub[i], x, y, z), H.sub[i].k);
  return Math.max(d, 1.548 - y);
}
function headRegion(H, v, x, y, z) {
  let dmin = 1e9, reg = R.skin;
  H.P.forEach(function (q) { const d = primDist(q, x, y, z); if (d < dmin) { dmin = d; reg = q.reg; } });
  const ax = Math.abs(x);
  if ((ax / 0.0205) * (ax / 0.0205) + ((y - 1.6115) / 0.0082) * ((y - 1.6115) / 0.0082) < 1 && z > 0.086) return R.lips;
  if (y > 1.704 && y < 1.716 && ax > 0.011 && ax < 0.056 && z > 0.072) return R.brow;
  if ((y > 1.63 && z < -0.035) || (y > 1.71 && z < 0.045) || (ax > 0.058 && y > 1.69 && z < 0.035)) return R.hair;
  if (reg === R.beard) return R.beard;
  return R.skin;
}
// Щетина — плавная маска по коже (0..1): подбородок, щёки ниже скул, над губой; не на губах.
function stubble(x, y, z) {
  const ax = Math.abs(x);
  const s = (1 - THREE.MathUtils.smoothstep(y, 1.622, 1.646)) * THREE.MathUtils.smoothstep(z, -0.01, 0.03) * (1 - THREE.MathUtils.smoothstep(ax, 0.052, 0.072));
  const lip = Math.abs(y - 1.612) < 0.011 && ax < 0.024 && z > 0.08 ? 0.15 : 1;
  return s * lip * (y > 1.556 ? 1 : THREE.MathUtils.smoothstep(y, 1.54, 1.556));
}
export function buildHead(v, cell) {
  const H = headPrims(v);
  const x0 = -0.11, y0 = 1.53, z0 = -0.115, x1 = 0.11, y1 = 1.8, z1 = 0.145;
  const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[i + nx * (j + ny * k)] = headField(H, x0 + i * cell, y0 + j * cell, z0 + k * cell);
  const { pos, index } = polygonize(F, nx, ny, nz, x0, y0, z0, cell);
  const n = pos.length / 3, e = cell * 0.5;
  const nrm = new Float32Array(n * 3), reg = new Float32Array(n), local = new Float32Array(n * 3), beard = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const gx = headField(H, x + e, y, z) - headField(H, x - e, y, z);
    const gy = headField(H, x, y + e, z) - headField(H, x, y - e, z);
    const gz = headField(H, x, y, z + e) - headField(H, x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    nrm[i * 3] = gx / gl; nrm[i * 3 + 1] = gy / gl; nrm[i * 3 + 2] = gz / gl;
    reg[i] = headRegion(H, v, x, y, z);
    beard[i] = reg[i] === R.skin ? stubble(x, y, z) : 0;
    local[i * 3] = x - HEAD_REST[0]; local[i * 3 + 1] = y - HEAD_REST[1]; local[i * 3 + 2] = z - HEAD_REST[2];
  }
  orientByNormals(pos, index, nrm);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(local, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('aReg', new THREE.BufferAttribute(reg, 1));
  g.setAttribute('aBeard', new THREE.BufferAttribute(beard, 1));
  g.setAttribute('aRest', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}
// Глаза: две сферы, спереди радужка и зрачок (цвет вершин); блик даёт окружение.
const EYE_COLORS = [0x4a2e1c, 0x5b3a22, 0x3c5a73, 0x55603f, 0x2e2018];
function eyeGeometry(iris) {
  const c = new THREE.Color(iris), white = new THREE.Color(0.64, 0.6, 0.55), black = new THREE.Color(0.015, 0.012, 0.01);
  const parts = [1, -1].map(function (sd) {
    const g = new THREE.SphereGeometry(0.0115, 20, 14);
    g.rotateX(Math.PI / 2);
    const p = g.attributes.position.array, col = new Float32Array(p.length);
    for (let i = 0; i < p.length; i += 3) {
      const f = p[i + 2] / 0.0115;
      const k = f > 0.965 ? black : f > 0.83 ? c : white;
      col[i] = k.r; col[i + 1] = k.g; col[i + 2] = k.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.translate(sd * 0.031 - HEAD_REST[0], 1.679 - HEAD_REST[1], 0.0765 - HEAD_REST[2]);
    return g;
  });
  return mergeGeometries(parts);
}

// ---------- материал рабочего ----------

const BODY_VERT_HEAD = /* glsl */ `
attribute float aReg;
attribute float aBeard;
attribute vec3 aRest;
uniform vec3 uColors[15];
uniform float uRough[15];
varying vec3 vRegColor;
varying float vRegRough;
varying vec3 vRest;
varying float vCloth;
varying float vTape;
varying float vSkinMask;
`;
const BODY_VERT = /* glsl */ `
{
  int ri = int(aReg + 0.5);
  vRegColor = uColors[ri];
  if (ri == 0) vRegColor = mix(vRegColor, uColors[14], aBeard * 0.5);
  vRegRough = uRough[ri];
  vRest = aRest;
  vCloth = (ri == 1 || ri == 2 || ri == 4) ? 1.0 : 0.0;
  vTape = ri == 3 ? 1.0 : 0.0;
  vSkinMask = (ri == 0 || ri == 12) ? 1.0 : 0.0;
}
`;
const BODY_FRAG_HEAD = /* glsl */ `
varying vec3 vRegColor;
varying float vRegRough;
varying vec3 vRest;
varying float vCloth;
varying float vTape;
varying float vSkinMask;
// кожа: свет заходит в полутень с красниной (рассеяние под кожей)
vec3 mbTranslucent(vec3 L, vec3 V, vec3 N) {
  float nl = dot(N, L);
  return vSkinMask * vec3(0.75, 0.3, 0.18) * (max(0.0, (nl + 0.45) / 1.45) - max(nl, 0.0)) * RECIPROCAL_PI;
}
float bHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bHash(i), bHash(i + vec3(1, 0, 0)), f.x), mix(bHash(i + vec3(0, 1, 0)), bHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(bHash(i + vec3(0, 0, 1)), bHash(i + vec3(1, 0, 1)), f.x), mix(bHash(i + vec3(0, 1, 1)), bHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

export function workerMaterial(look) {
  const colors = look.colors.map(function (c) { return new THREE.Color(c); });
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  m.userData.colors = colors;
  m.defines = { MB_TRANSLUCENT: '' };
  m.onBeforeCompile = function (shader) {
    shader.uniforms.uColors = { value: colors };
    shader.uniforms.uRough = { value: look.rough };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + BODY_VERT_HEAD)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + BODY_VERT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + BODY_FRAG_HEAD)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float weave = bNoise(vRest * 900.0) * 0.5 + bNoise(vRest * 260.0) * 0.5;
        float wear = bNoise(vRest * 24.0);
        diffuseColor.rgb *= vRegColor * mix(1.0, 0.86 + 0.22 * weave, vCloth) * mix(1.0, 0.85 + 0.25 * wear, vCloth);`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRegRough;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float s = 0.004;
          float n0 = bNoise(vRest * 600.0);
          vec3 g = vec3(bNoise(vRest * 600.0 + vec3(s * 600.0, 0.0, 0.0)) - n0, bNoise(vRest * 600.0 + vec3(0.0, s * 600.0, 0.0)) - n0, bNoise(vRest * 600.0 + vec3(0.0, 0.0, s * 600.0)) - n0);
          normal = normalize(normal + (viewMatrix * vec4(g, 0.0)).xyz * 0.35 * vCloth);
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vRegColor * vTape * 0.35;');
  };
  m.customProgramCacheKey = function () { return 'worker2'; };
  return m;
}

const SKINS = [0xd9a58a, 0xc58c6c, 0xa66f50, 0x7d4f37, 0xe6b89c];
const HAIR = [0x2a1d14, 0x3d2a1a, 0x16110d, 0x6e5338, 0x8a8178];
const JACKETS = [0x2f3640, 0x4a4136, 0x3a4a3c, 0x26303d, 0x5a4632];
const VESTS = [0xf2741a, 0xd8ec2a, 0xf2741a, 0xe8f03a];
const PANTS = [0x2e3136, 0x3d3a34, 0x2a3442, 0x4b4337];
const HELMETS = [0xf4f2ec, 0xf2c41a, 0xf07a1c, 0x2f6bd0, 0xf4f2ec];
const GLOVES = [0x7a6246, 0x58606a, 0x8a7a4a];

// ident — рабочий логики { index, shirt, rank }: кожа, волосы и лицо — по номеру найма, как у фигурки оригинала
// (cw-ranks.js → looksOf), каска и спецовка — по разряду (dress); без него — случайный облик по зерну.
export function workerLook(seed, ident) {
  const r = rng(seed);
  const pick = function (a) { return a[Math.floor(r() * a.length)]; };
  const orig = ident && ident.index !== undefined ? looksOf(ident.index) : null;
  const skin = orig ? orig.skin : pick(SKINS);
  const skinC = new THREE.Color(skin);
  const beard = r() < 0.5 ? skinC.clone().multiplyScalar(0.72).getHex() : skin;
  const o = outfitOf(ident ? ident.rank : 1);
  const colors = [skin, o.suit, o.suitDark, 0xd9dcd6, o.suit, 0x2a1f16, o.glove, 0x4a3424, 0x151515, orig ? orig.hair : pick(HAIR), 0x1a120d, 0xd8d0c4, 0x9a5c50, 0x2a1e16, beard];
  const rough = [0.55, 0.86, 0.72, 0.34, 0.86, 0.62, 0.78, 0.6, 0.9, 0.8, 0.3, 0.3, 0.45, 0.8, 0.62];
  // лицо оригинала: борода — с бородой, щетина — щетина гуще, усы — усы (humans.js), гладкое — лёгкая щетина
  const roll = r();
  const face = orig ? (orig.face === 'beard' ? 2 : orig.face === 'plain' ? 0 : orig.face === 'moustache' ? 3 : 1) : roll < 0.3 ? 2 : roll < 0.65 ? 1 : 0;
  if (face === 2) colors[14] = skinC.clone().multiplyScalar(0.45).lerp(new THREE.Color(colors[9]), 0.6).getHex();
  return { colors, rough, helmet: o.helmet, build: r() < 0.65 ? 0 : 1, face, eyes: Math.floor(r() * EYE_COLORS.length),
    grey: !!(orig && orig.grey), plain: !orig || orig.face === 'plain', shirt: ident && ident.shirt !== undefined ? ident.shirt : 0x2f6fed };
}

// Каска разряда: пластик цвета разряда с потёртостями и грязью; наклейка (2+, белый круг с полосой цвета спецовки)
// и светоотражающие полосы по бокам (3+) — по точке купола в осях каски; у 7-го — золото (металл).
function helmetMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.32, metalness: 0.0, side: THREE.DoubleSide });
  const u = { uSticker: { value: 0 }, uStripes: { value: 0 }, uSuit: { value: new THREE.Color() }, uTrim: { value: new THREE.Color(0xeef3f8) } };
  m.userData.u = u;
  m.onBeforeCompile = function (shader) {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHp = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vHp;
        uniform float uSticker, uStripes;
        uniform vec3 uSuit, uTrim;
        float kH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float kN(vec3 x) {
          vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(kH(i), kH(i + vec3(1, 0, 0)), f.x), mix(kH(i + vec3(0, 1, 0)), kH(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(kH(i + vec3(0, 0, 1)), kH(i + vec3(1, 0, 1)), f.x), mix(kH(i + vec3(0, 1, 1)), kH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }
        float kRough = 0.0;
        float kEmit = 0.0;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 n = normalize(vHp / vec3(0.093, 0.125, 0.107));
          float dome = smoothstep(0.004, 0.014, vHp.y);
          // наклейка: белый круг спереди справа, через него полоса цвета спецовки
          vec3 d0 = normalize(vec3(0.36, 0.47, 0.81));
          float c = dot(n, d0);
          float disc = uSticker * dome * smoothstep(0.978, 0.983, c);
          vec3 tx = normalize(cross(vec3(0.0, 1.0, 0.0), d0)), ty = cross(d0, tx);
          float stripe = 1.0 - smoothstep(0.045, 0.06, abs(dot(n - d0, ty)));
          vec3 st = mix(vec3(0.9, 0.9, 0.88), uSuit, stripe);
          // полосы по бокам: светоотражающая плёнка
          float side = uStripes * dome * smoothstep(0.45, 0.52, abs(n.x)) * (1.0 - smoothstep(0.032, 0.045, abs(n.y - 0.42))) * (1.0 - smoothstep(0.5, 0.62, abs(n.z)));
          // царапины и пыль: по куполу мелкие светлые риски, у полей — грязь
          float scr = smoothstep(0.78, 0.86, kN(vHp * vec3(420.0, 60.0, 420.0))) * 0.5;
          float dirt = (1.0 - smoothstep(0.0, 0.05, vHp.y)) * smoothstep(0.35, 0.7, kN(vHp * 55.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, st, disc);
          diffuseColor.rgb = mix(diffuseColor.rgb, uTrim, side);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.25 + 0.06, scr * (1.0 - disc - side));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.2, 0.15), dirt * 0.45);
          kRough = disc * 0.3 + side * 0.05 + scr * 0.2 + dirt * 0.4;
          kEmit = side * 0.05;
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + kRough, 0.04, 1.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * kEmit;');
  };
  m.customProgramCacheKey = function () { return 'cw-helmet1'; };
  linkSky(m);
  return m;
}
// Пустая сетка снаряжения: геометрию ставит dress по разряду.
const NO_GEO = new THREE.BufferGeometry();
function gearSlot(material, parent) {
  const m = new THREE.Mesh(NO_GEO, material);
  m.visible = false;
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function setGear(slots, set, on) {
  ['gear', 'glow'].forEach(function (k) {
    const m = slots[k];
    if (!m) return;
    const g = on && set ? set[k] : null;
    m.visible = !!g;
    if (g) m.geometry = g;
  });
}
// Охват тела модели на высоте y (покой): полуширина, центр и полуглубина по z — по вершинам одежды.
// Обхват по сечению поверхности плоскостями y − band, y, y + band (рёбра треугольников, пересёкшие плоскость), а не по
// вершинам в полосе: у упрощённой модели «Телефона» вершин у пояса мало, обхват выходил на 3–6 см уже — ремень тонул
// в одежде; и у полной спина ремня уходила внутрь нагрудника. Кэш — у геометрии первой части (общая у модели).
const GIRTH = new WeakMap();
function girth(human, names, y, band, xMin, xMax) {
  const first = human.parts && human.parts[names[0]];
  const key = names.join(',') + '|' + y.toFixed(4) + '|' + band + '|' + xMin + '|' + xMax;
  let cache = first ? GIRTH.get(first) : null;
  if (cache && cache.has(key)) return cache.get(key);
  let w = 0, z0 = 1e9, z1 = -1e9;
  const take = function (x, z) {
    const ax = Math.abs(x);
    if ((xMin !== undefined && ax < xMin) || (xMax !== undefined && ax > xMax)) return;
    w = Math.max(w, ax); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  };
  names.forEach(function (name) {
    const g = human.parts && human.parts[name];
    if (!g) return;
    const p = g.attributes.position, idx = g.index;
    const n = idx ? idx.count : p.count;
    for (let k = -1; k <= 1; k++) {
      const yy = y + k * band;
      for (let t = 0; t < n; t += 3) {
        for (let e = 0; e < 3; e++) {
          const a = idx ? idx.getX(t + e) : t + e, b = idx ? idx.getX(t + (e + 1) % 3) : t + (e + 1) % 3;
          const da = p.getY(a) - yy, db = p.getY(b) - yy;
          if (da * db > 0 || da === db) continue;
          const s = da / (da - db);
          take(p.getX(a) + (p.getX(b) - p.getX(a)) * s, p.getZ(a) + (p.getZ(b) - p.getZ(a)) * s);
        }
      }
    }
  });
  const out = w > 0 ? { w: w, cz: (z0 + z1) / 2, d: (z1 - z0) / 2, front: z1 } : null;
  if (first) { if (!cache) { cache = new Map(); GIRTH.set(first, cache); } cache.set(key, out); }
  return out;
}

// Сечение талии по углу: наибольший радиус ткани (брюки, нагрудник, куртка без рукавов) от оси талии cz в полосе
// ремня (5 плоскостей ±half) — по нему ремень облегает спину и бока (эллипс по обхвату отстоял от спины на 13–23 мм,
// а на диагоналях нагрудник выходил поверх его нижнего края на 3–5 мм). WAIST_N секторов от +z к +x, пустые — от
// соседей; одно сглаживание «не меньше» — лента перекрывает ложбинку позвоночника, как настоящий ремень; кэш — у
// геометрии модели.
const WAIST_N = 48, WAIST = new WeakMap();
function waistProfile(human, names, y, half, cz, xMax, tuck) {
  const first = human.parts && human.parts[names[0]];
  if (!first) return null;
  const key = names.join(',') + '|' + y.toFixed(4) + '|' + cz.toFixed(4);
  let cache = WAIST.get(first);
  if (cache && cache.has(key)) return cache.get(key);
  const r = new Float32Array(WAIST_N);
  names.forEach(function (name) {
    const g = human.parts[name];
    if (!g) return;
    const p = g.attributes.position, idx = g.index, n = idx ? idx.count : p.count;
    for (let k = -2; k <= 2; k++) {
      const yy = y + k * half / 2;
      for (let t = 0; t < n; t += 3) for (let e = 0; e < 3; e++) {
        const a = idx ? idx.getX(t + e) : t + e, b = idx ? idx.getX(t + (e + 1) % 3) : t + (e + 1) % 3;
        const da = p.getY(a) - yy, db = p.getY(b) - yy;
        if (da * db > 0 || da === db) continue;
        // куртка и нагрудник ниже подола (humans.js → uTuck) не рисуются — не в счёт
        if (name !== 'pants' && yy < tuck) continue;
        const sk = da / (da - db), x = p.getX(a) + (p.getX(b) - p.getX(a)) * sk, z = p.getZ(a) + (p.getZ(b) - p.getZ(a)) * sk - cz;
        if (Math.abs(x) > xMax) continue;
        const i = Math.floor(((Math.atan2(x, z) / (Math.PI * 2)) % 1 + 1) % 1 * WAIST_N) % WAIST_N;
        r[i] = Math.max(r[i], Math.hypot(x, z));
      }
    }
  });
  for (let i = 0; i < WAIST_N; i++) if (!r[i]) {
    let a = 1, b = 1;
    while (!r[(i - a + WAIST_N) % WAIST_N] && a < WAIST_N) a++;
    while (!r[(i + b) % WAIST_N] && b < WAIST_N) b++;
    r[i] = (r[(i - a + WAIST_N) % WAIST_N] * b + r[(i + b) % WAIST_N] * a) / (a + b) || 0.13;
  }
  for (let pass = 0; pass < 1; pass++) {
    const c = r.slice();
    for (let i = 0; i < WAIST_N; i++) r[i] = Math.max(c[i], 0.25 * c[(i - 1 + WAIST_N) % WAIST_N] + 0.5 * c[i] + 0.25 * c[(i + 1) % WAIST_N]);
  }
  const out = { r: r, key: Array.from(r, function (x) { return Math.round(x * 1000); }).join(',') };
  if (!cache) { cache = new Map(); WAIST.set(first, cache); }
  cache.set(key, out);
  return out;
}

// ---------- каска, инструмент, ноша ----------

// Посадка каски на модель: передний край полей — на 3,1 см выше середины глаз (≈2 см над бровями), купол — не
// ниже 1,5 см над макушкой (подвеска); наклон назад HELMET_TILT — спереди поля выше, сзади ниже, как сидит настоящая
// каска (прежняя посадка по макушке надвигала поля на глаза). Край полей спереди (−0,009; 0,188) и верх купола 0,125 —
// в осях каски (helmetGeometry). Срез волос и кожи под каской (humans.js) — плоскость на 8 мм выше края внутри купола.
const HELMET_TILT = 0.16;
function helmetFit(eyeY, top, z) {
  const c = Math.cos(HELMET_TILT), s = Math.sin(HELMET_TILT), tg = Math.tan(HELMET_TILT);
  const y = Math.max(eyeY + 0.031 - (-0.009 * c + 0.188 * s), top + 0.015 - 0.125 * c);
  return { y: y, cutY: y + 0.008 / c - z * tg, cutTilt: tg };
}

function helmetGeometry() {
  const pts = [[0, 0.125], [0.03, 0.123], [0.058, 0.115], [0.08, 0.1], [0.094, 0.078], [0.1, 0.052], [0.102, 0.026], [0.102, 0.006], [0.116, -0.002], [0.121, -0.009], [0.114, -0.012], [0.098, -0.004], [0.094, 0.0]];
  // профиль снизу вверх: так грани лейс-оболочки смотрят наружу
  const g = new THREE.LatheGeometry(pts.slice().reverse().map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 32);
  const p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    if (p[i + 1] < 0.008 && p[i + 2] > 0) p[i + 2] *= 1.0 + 0.45 * Math.min(1, p[i + 2] / 0.11);
    p[i] *= 0.93;
    p[i + 2] *= 1.07;
  }
  g.computeVertexNormals();
  const ridge = new THREE.CapsuleGeometry(0.012, 0.085, 4, 8);
  ridge.rotateX(Math.PI / 2);
  ridge.translate(0, 0.115, -0.004);
  return [g, ridge];
}

const SHARED = {};
function shared() {
  if (SHARED.ready) return SHARED;
  const hg = helmetGeometry();
  // купол и конёк — одна сетка (один вызов отрисовки)
  hg[0].deleteAttribute('uv'); hg[1].deleteAttribute('uv');
  SHARED.helmet = mergeGeometries([hg[0].toNonIndexed(), hg[1].toNonIndexed()]);
  SHARED.helmet.computeBoundingSphere();
  SHARED.steel = new THREE.MeshStandardMaterial({ color: 0x5a5e62, metalness: 0.9, roughness: 0.38 });
  SHARED.wood = new THREE.MeshStandardMaterial({ color: 0x8a6a46, roughness: 0.7 });
  SHARED.yellow = new THREE.MeshStandardMaterial({ color: 0xe8b81a, roughness: 0.45 });
  SHARED.black = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6 });
  SHARED.paper = new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.8 });
  SHARED.filter = new THREE.MeshStandardMaterial({ color: 0xc98a3c, roughness: 0.7 });
  SHARED.plastic = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.45 });
  SHARED.bread = new THREE.MeshStandardMaterial({ color: 0xc89a5c, roughness: 0.85 });
  SHARED.filling = new THREE.MeshStandardMaterial({ color: 0xb8433a, roughness: 0.6 });
  SHARED.forged = new THREE.MeshStandardMaterial({ color: 0x2e3032, metalness: 0.85, roughness: 0.48 });
  [SHARED.steel, SHARED.wood, SHARED.yellow, SHARED.black, SHARED.paper, SHARED.filter, SHARED.plastic, SHARED.bread, SHARED.filling, SHARED.forged].forEach(linkSky);
  SHARED.ready = true;
  return SHARED;
}

function tool(kind) {
  const S = shared();
  const g = new THREE.Group();
  if (kind === 'hammer') {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.33, 8), S.wood);
    h.position.y = -0.09;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.032, 0.115), S.steel);
    head.position.y = -0.245;
    g.add(h, head);
  } else if (kind === 'trowel') {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.11, 8), S.wood);
    h.position.y = -0.06;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.003, 0.16), S.steel);
    blade.position.set(0, -0.13, 0.05);
    g.add(h, blade);
  } else if (kind === 'pickaxe') {
    // кирка: рукоять 0,86 м вперёд из кулака (по большому пальцу), на конце — кованый клюв поперёк
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.021, 0.86, 8), S.wood);
    h.rotation.x = Math.PI / 2;
    h.position.z = 0.36;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.06), S.forged);
    eye.position.z = 0.77;
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.26, 6), S.forged);
    beak.position.set(0, 0.15, 0.77);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.014), S.forged);
    blade.position.set(0, -0.12, 0.77);
    g.add(h, eye, beak, blade);
    g.userData.head = new THREE.Vector3(0, 0.26, 0.77);
  } else if (kind === 'cigarette') {
    // сигарета в щепоти: бумага, фильтр, тлеющий кончик (светится — затяжка ярче)
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.055, 8), S.paper);
    paper.rotation.x = Math.PI / 2;
    paper.position.z = 0.045;
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.02, 8), S.filter);
    filter.rotation.x = Math.PI / 2;
    filter.position.z = 0.008;
    const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.0043, 0.0043, 0.006, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a2a22, emissive: 0xff5a1a, emissiveIntensity: 1.5, roughness: 0.9 }));
    ember.rotation.x = Math.PI / 2;
    ember.position.z = 0.075;
    linkSky(ember.material);
    g.add(paper, filter, ember);
    g.userData.ember = ember;
  } else if (kind === 'sandwich') {
    const bread = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.034, 0.075), S.bread);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.008, 0.079), S.filling);
    g.add(bread, fill);
  } else if (kind === 'lunchbox') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.06, 0.15), S.plastic);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.012, 0.155), S.black);
    lid.position.y = 0.036;
    g.add(box, lid);
  } else if (kind === 'drill') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.07), S.yellow);
    body.position.y = -0.08;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), S.yellow);
    top.position.set(0, 0.01, 0.06);
    const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.06, 8), S.black);
    chuck.rotation.x = Math.PI / 2;
    chuck.position.set(0, 0.01, 0.19);
    g.add(body, top, chuck);
  }
  g.traverse(function (o) { o.castShadow = true; });
  return bake(g, kind === 'cigarette' ? g.userData.ember : null, 'tool-' + kind);
}

// Детали группы (меши с простыми материалами) — в одну сетку материала gear: цвет материала — в цвет вершин,
// металл — aMetal; keep — меш, который остаётся отдельным (светится). Один вызов отрисовки вместо 2–4.
const _bm = new THREE.Matrix4();
const BAKED = {};
function bake(g, keep, key) {
  const matte = new Batch(), metal = new Batch();
  g.updateMatrixWorld(true);
  const parts = [];
  g.traverse(function (o) { if (o.isMesh && o !== keep) parts.push(o); });
  if (key && BAKED[key]) {
    parts.forEach(function (o) { o.removeFromParent(); });
    const cached = new THREE.Mesh(BAKED[key], gearMaterials().gear);
    cached.castShadow = true;
    g.add(cached);
    return g;
  }
  parts.forEach(function (o) {
    const geo = o.geometry.index ? o.geometry : o.geometry;
    const p = { pos: geo.attributes.position.array, nrm: geo.attributes.normal.array, uv: null,
      index: geo.index ? geo.index.array : Array.from({ length: geo.attributes.position.count }, function (_, i) { return i; }) };
    _bm.copy(g.matrixWorld).invert().multiply(o.matrixWorld);
    const m = o.material;
    (m.metalness > 0.5 ? metal : matte).add(p, _bm, m.color);
    o.removeFromParent();
  });
  const geo = gearOut(matte, metal);
  if (key) BAKED[key] = geo;
  const mesh = new THREE.Mesh(geo, gearMaterials().gear);
  mesh.castShadow = true;
  g.add(mesh);
  return g;
}

// Блоки ноши одного вида на местах idx рамы — одна сетка в осях рамы (кэш по сетке блока и местам).
const STACKS = new Map();
function stackGeometry(geo, idx, blocks) {
  const key = geo.uuid + ':' + idx.join('');
  let g = STACKS.get(key);
  if (g) return g;
  g = mergeGeometries(idx.map(function (i) { return geo.clone().applyMatrix4(blocks[i].userData.slot); }));
  g.computeBoundingSphere();
  STACKS.set(key, g);
  return g;
}

// Заплечная рама для ноши: две стойки из трубы, полка и лямки; на полке — до 6 блоков 0,2 м (2 × 3).
function stackRig(mats) {
  const g = new THREE.Group();
  // цвет вершин белый: материалы трубы и резины красят цветом вершин
  const white = function (geo) { geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3)); return geo; };
  const tube = white(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6));
  [-0.13, 0.13].forEach(function (x) {
    const rail = new THREE.Mesh(tube, mats.tube);
    rail.position.set(x, 0.12, 0);
    g.add(rail);
  });
  const shelf = new THREE.Mesh(white(new THREE.BoxGeometry(0.3, 0.02, 0.24)), mats.tube);
  shelf.position.set(0, -0.18, -0.1);
  g.add(shelf);
  // поперечины вверху и над полкой, брезентовая спинка между стойками (к спине): без них сбоку рама читалась
  // двумя голыми трубами, отставшими от спины
  const bar = white(new THREE.CylinderGeometry(0.01, 0.01, 0.27, 6));
  bar.rotateZ(Math.PI / 2);
  [0.4, -0.02].forEach(function (y) {
    const m = new THREE.Mesh(bar, mats.tube);
    m.position.set(0, y, 0);
    g.add(m);
  });
  const canvas = new THREE.Mesh(white(new THREE.BoxGeometry(0.25, 0.4, 0.012)), new THREE.MeshStandardMaterial({ color: 0x4e4b3b, roughness: 0.92 }));
  canvas.position.set(0, 0.17, 0.02);
  g.add(canvas);
  const strapGeo = white(new THREE.BoxGeometry(0.035, 0.42, 0.012));
  [-0.09, 0.09].forEach(function (x) {
    const strap = new THREE.Mesh(strapGeo, mats.rubber);
    strap.position.set(x, 0.12, 0.05);
    g.add(strap);
  });
  const box = new THREE.BoxGeometry(0.19, 0.19, 0.19);
  const blocks = [];
  // свои ресурсы рамы (до первой ноши; потом блоки берут общие сетки и материалы кладки) — освободить с рабочим
  g.userData.own = [box];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.85 }));
    g.userData.own.push(m.material);
    m.position.set(i % 2 ? 0.07 : -0.07, -0.07 + Math.floor(i / 2) * 0.195, -0.11);
    m.rotation.y = (i % 3 - 1) * 0.06;
    m.updateMatrix();
    m.userData.slot = m.matrix.clone();
    m.castShadow = true;
    blocks.push(m);
    g.add(m);
  }
  g.userData.blocks = blocks;
  g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  // трубы, полка и лямки — одной сеткой (блоки ноши — свои материалы)
  const frame = new THREE.Group();
  g.children.slice().forEach(function (o) { if (blocks.indexOf(o) < 0) frame.add(o); });
  frame.children.forEach(function (o) { if (!o.material.color) o.material = new THREE.MeshStandardMaterial({ color: 0x555555 }); });
  bake(frame, null, 'frame');
  g.add(frame);
  g.userData.frameMesh = frame.children.find(function (o) { return o.isMesh; });
  g.userData.frameGeo = g.userData.frameMesh.geometry;
  return g;
}

// «Телефон»: рама и блоки ноши — одной сеткой материала снаряжения (цвет блока — цвет материала оригинала, look.flat):
// вместо рамы и 1–2 сеток блоков — один вызов отрисовки. Кэш — по составу (key) и местам.
const STACKS_FLAT = new Map();
function flatStack(frameGeo, looks, key, blocks) {
  let g = STACKS_FLAT.get(key);
  if (g) return g;
  // рама — только атрибуты, общие с блоками
  const fr = new THREE.BufferGeometry();
  ['position', 'normal', 'color', 'aMetal'].forEach(function (k) { fr.setAttribute(k, frameGeo.attributes[k]); });
  if (frameGeo.index) fr.setIndex(frameGeo.index);
  const list = [fr];
  looks.forEach(function (l, i) {
    if (i >= blocks.length) return;
    const b = new THREE.BufferGeometry();
    b.setAttribute('position', l.geometry.attributes.position.clone());
    b.setAttribute('normal', l.geometry.attributes.normal.clone());
    const n = b.attributes.position.count, col = new Float32Array(n * 3), c = l.flat || _flatGrey;
    for (let k = 0; k < n; k++) { col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; }
    b.setAttribute('color', new THREE.BufferAttribute(col, 3));
    b.setAttribute('aMetal', new THREE.BufferAttribute(new Float32Array(n), 1));
    if (l.geometry.index) b.setIndex(l.geometry.index.clone());
    list.push(b.applyMatrix4(blocks[i].userData.slot));
  });
  const idx = list.every(function (x) { return !!x.index; });
  g = mergeGeometries(idx ? list : list.map(function (x) { return x.index ? x.toNonIndexed() : x; }));
  g.computeBoundingSphere();
  STACKS_FLAT.set(key, g);
  return g;
}
const _flatGrey = new THREE.Color(0x8a8178);

// ---------- рабочий ----------

const _q = new THREE.Quaternion(), _e = new THREE.Euler();

// Рабочие — модели MakeHuman (humans.js), если файлы загрузились; иначе — прежние тела из поля расстояний.
export function createWorkerFactory(quality) {
  let humans = null, legacy = null;
  // «Телефон» (облегчённые модели): тело рабочего — одной сеткой (cw: 10 вызовов отрисовки → 1); ?merge=0/1 — вручную
  const asked = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('merge') : null;
  const merge = asked !== null ? asked === '1' : quality.bodyCell >= 0.02;
  // «Телефон»: в тени — только тело (мелочь — каска, снаряжение, инструмент, ноша — в карте 1024 всё равно в пару
  // текселей, а вызов в проходе тени — на каждую)
  const lite = !!quality.mobile || merge;
  const ready = loadHumans(quality.bodyCell >= 0.02).then(function (h) { humans = h; }).catch(function () { humans = null; });
  function legacyParts() {
    if (legacy) return legacy;
    const headCell = Math.max(0.003, quality.bodyCell * 0.32);
    const eyeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0 });
    linkSky(eyeMat);
    legacy = {
      bodies: [buildBody({ width: 1.0, belly: 0.1 }, quality.bodyCell), buildBody({ width: 1.08, belly: 0.7 }, quality.bodyCell)],
      heads: [0, 1, 2].map(function (v) { return buildHead(v, headCell); }),
      eyes: EYE_COLORS.map(eyeGeometry), eyeMat,
    };
    return legacy;
  }
  const NAMES = BONES.map(function (b) { return b[0]; });
  // ident — рабочий логики { index, shirt, rank } (облик по номеру найма, одежда по разряду); без него — по зерну.
  function create(seed, mats, ident) {
    const look = workerLook(seed, ident);
    look.iris = EYE_COLORS[look.eyes];
    // ведущий скелет: суставы — из модели MakeHuman (meta.json) или из таблицы BONES. Седой — пожилая модель (c),
    // крепкий — плотная (b), иначе обычная (a); женской модели (d) в бригаде нет — фигурки оригинала мужские (усы,
    // бороды), и комбинезон с нагрудником сидит на ней плохо
    const keys = humans ? Object.keys(humans.variants).filter(function (k) { return k !== 'd'; }) : [];
    let variant = null;
    if (humans) {
      if (!keys.length) keys.push(Object.keys(humans.variants)[0]);
      const any = keys[(seed * 7 + 3) % keys.length];
      variant = look.grey && humans.variants.c ? 'c' : look.build === 1 && humans.variants.b ? 'b' : any === 'b' && humans.variants.a ? 'a' : any;
    }
    const joints = humans && humans.variants[variant] ? humans.variants[variant].meta.joints : null;
    const at = function (i) { return joints && joints[BONES[i][0]] ? joints[BONES[i][0]] : BONES[i][2]; };
    const root = new THREE.Bone();
    const bones = [root];
    BONES.forEach(function (b, i) {
      if (i === 0) return;
      const bone = new THREE.Bone();
      bone.name = b[0];
      const p = at(b[1]), q = at(i);
      bone.position.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      bones[b[1]].add(bone);
      bones.push(bone);
    });
    root.name = 'root';
    const group = new THREE.Group();
    markDynamic(group);
    let mesh = null, human = null;
    if (humans) {
      human = makeHuman({ variants: { [variant]: humans.variants[variant] }, map: humans.map, fingers: humans.fingers }, look, seed, bones, NAMES, { merge: merge });
      group.add(root, human.scene);
      root.updateMatrixWorld(true);
    } else {
      const L = legacyParts();
      const bodyMat = workerMaterial(look);
      linkSky(bodyMat);
      mesh = new THREE.SkinnedMesh(L.bodies[look.build], bodyMat);
      mesh.add(root);
      mesh.updateMatrixWorld(true);
      mesh.bind(new THREE.Skeleton(bones));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      group.add(mesh);
      const head = new THREE.Mesh(L.heads[Math.min(2, look.face)], bodyMat);
      head.castShadow = true; head.receiveShadow = true;
      const eye = new THREE.Mesh(L.eyes[look.eyes], L.eyeMat);
      bones[B.head].add(head, eye);
    }
    const S = shared();
    const hm = helmetMaterial(look.helmet);
    const helmet = new THREE.Group();
    // каска на голове: родитель и положение (лёжа снимает и кладёт у изголовья — helmetOff)
    const helmetOn = { parent: bones[B.head], pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    helmet.add(new THREE.Mesh(S.helmet, hm));
    // снаряжение разряда на каске (наушники, очки, фонарь, гребень) — сетки ставит dress
    const GM = gearMaterials();
    const headGear = { gear: gearSlot(GM.gear, helmet), glow: gearSlot(GM.glow, helmet) };
    // каска — по глазам и макушке модели (helmetFit)
    const fit = human ? helmetFit(human.eyeY, human.head, at(B.head)[2] + 0.002) : null;
    helmet.position.set(0, fit ? fit.y - at(B.head)[1] : 0.104, human ? 0.002 : -0.008);
    helmet.rotation.x = fit ? -HELMET_TILT : -0.08;
    if (fit && human.helmetCut) human.helmetCut(fit.cutY, fit.cutTilt);
    helmet.children.forEach(function (c) { c.castShadow = true; });
    bones[B.head].add(helmet);
    helmetOn.pos.copy(helmet.position); helmetOn.quat.copy(helmet.quaternion);
    const tools = { hammer: tool('hammer'), trowel: tool('trowel'), drill: tool('drill'), pickaxe: tool('pickaxe'), cigarette: tool('cigarette'), sandwich: tool('sandwich') };
    Object.values(tools).forEach(function (t) {
      // в правой руке: рукоять по оси кисти
      t.position.set(-0.07 * SA, -0.07 * CA, 0.03);
      t.rotation.set(0, 0, -A);
      t.visible = false;
      bones[B.handR].add(t);
    });
    // положение инструмента в осях ведущей кисти (точки на рукояти кирки для левой руки и удара)
    const toolRest = new THREE.Matrix4().compose(tools.pickaxe.position.clone(), tools.pickaxe.quaternion.clone(), new THREE.Vector3(1, 1, 1));
    // сигарета — в кончиках пальцев
    tools.cigarette.position.set(-0.1 * SA, -0.1 * CA, 0.035);
    // в левой: блок кладки (геометрия и материал — от ноши, crew.js) и контейнер с обедом
    const leftTools = { block: new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.19, 0.19), shared().black), lunchbox: tool('lunchbox') };
    leftTools.block.castShadow = true;
    Object.values(leftTools).forEach(function (t) {
      t.position.set(0.1 * SA, -0.1 * CA, 0.04);
      t.rotation.set(0, 0, A);
      t.visible = false;
      bones[B.handL].add(t);
    });
    // снаряжение разряда на теле: пояс с подсумком и молотком (3+), рация на лямке (5+), наплечники (6+), свечение
    // под ногами (5+); сетки — в осях своей кости (сустав модели), видимость и геометрию ставит dress
    const bodyGear = { belt: null, radio: null, padL: null, padR: null, aura: null };
    const gearAt = function (name, x, y, z, rz) {
      const g = new THREE.Group();
      g.name = 'cw-' + name;
      g.position.set(x, y, z);
      if (rz) g.rotation.z = rz;
      group.add(g);
      return { group: g, gear: gearSlot(GM.gear, g), glow: gearSlot(GM.glow, g) };
    };
    const hipsAt = at(B.hips), chestAt = at(B.chest), shL = at(B.upperArmL), shR = at(B.upperArmR);
    // ремень — над краем нагрудника (низ нагрудника — у сустава таза)
    const beltY = hipsAt[1] + 0.045;
    bodyGear.belt = gearAt('belt', 0, beltY, 0);
    bodyGear.radio = gearAt('radio', 0.08, chestAt[1] + 0.13, 0.1);
    bodyGear.padL = gearAt('padL', shL[0] - 0.01, shL[1] + 0.035, shL[2], -0.35);
    bodyGear.padR = gearAt('padR', shR[0] + 0.01, shR[1] + 0.035, shR[2], 0.35);
    if (human) {
      // пояс по охвату талии этой модели, рация — по выпуклости груди у левой лямки
      // по брюкам и нагруднику у пояса (рукава висят рядом — не в счёт)
      const g1 = girth(human, ['pants', 'vest'], beltY, 0.012, undefined, 0.24);
      if (g1) {
        bodyGear.belt.size = g1; bodyGear.belt.group.position.z = g1.cz;
        g1.prof = waistProfile(human, ['pants', 'vest', 'jacket'], beltY, 0.021, g1.cz, 0.24, hipsAt[1] + 0.03);
      }
      const g2 = girth(human, ['vest', 'jacket'], chestAt[1] + 0.13, 0.015, 0.06);
      if (g2) bodyGear.radio.group.position.z = g2.front + 0.012;
    }
    if (human) {
      // каска и инструмент — на костях самой модели: позвоночник MakeHuman гнётся ещё и в spine_01, и при наклоне
      // голова и кисть уходят от ведущих костей на 2–3 см (лоб проступал сквозь каску). В позе покоя скелеты
      // совпадают, attach сохраняет положение.
      const mhBone = function (k) { let found = null; human.scene.traverse(function (o) { if (!found && o.isBone && o.name === humans.map[k]) found = o; }); return found; };
      const mhHead = mhBone('head'), mhHand = mhBone('handR'), mhHandL = mhBone('handL');
      group.updateMatrixWorld(true);
      if (mhHead) mhHead.attach(helmet);
      helmetOn.parent = helmet.parent; helmetOn.pos.copy(helmet.position); helmetOn.quat.copy(helmet.quaternion);
      if (mhHand) Object.values(tools).forEach(function (t) { mhHand.attach(t); });
      // сигарета в щепоти (покой в осях кисти модели) и губы в осях головы модели — для затяжки (animateWorker)
      tools.cigarette.userData.restPos = tools.cigarette.position.clone();
      tools.cigarette.userData.restQuat = tools.cigarette.quaternion.clone();
      if (mhHead) {
        const hj = at(B.head);
        human.lips = { bone: mhHead, p: mhHead.worldToLocal(new THREE.Vector3(0, hj[1] - 0.033, hj[2] + 0.1)) };
      }
      if (mhHandL) Object.values(leftTools).forEach(function (t) { if (t !== leftTools.lunchbox) mhHandL.attach(t); });
      // контейнер с обедом — на коленях: в покое — перед бёдрами плашмя к бедру, сидя ложится на колени
      const mhThigh = mhBone('thighL');
      if (mhThigh) {
        const hipL = at(B.thighL), kneeL = at(B.shinL);
        const lb = leftTools.lunchbox;
        lb.removeFromParent();
        lb.position.set(0, hipL[1] + (kneeL[1] - hipL[1]) * 0.55, hipL[2] + 0.115);
        lb.rotation.set(Math.PI / 2, 0, 0);
        group.add(lb);
        group.updateMatrixWorld(true);
        mhThigh.attach(lb);
      }
      const mhHips = mhBone('hips'), mhChest = mhBone('chest'), mhArmL = mhBone('upperArmL'), mhArmR = mhBone('upperArmR');
      if (mhHips) mhHips.attach(bodyGear.belt.group);
      if (mhChest) mhChest.attach(bodyGear.radio.group);
      if (mhArmL) mhArmL.attach(bodyGear.padL.group);
      if (mhArmR) mhArmR.attach(bodyGear.padR.group);
    } else {
      bones[B.hips].attach(bodyGear.belt.group);
      bones[B.chest].attach(bodyGear.radio.group);
      bones[B.upperArmL].attach(bodyGear.padL.group);
      bones[B.upperArmR].attach(bodyGear.padR.group);
    }
    // ноша висит на груди: у MakeHuman грудной сустав на 10 см ниже и на 5 см дальше прежнего — сдвиг возвращает
    // ношу на место относительно тела; руки для ноши на плече — ИК от суставов модели (armIK)
    const c0 = at(B.chest), c1 = BONES[B.chest][2];
    const chestShift = new THREE.Vector3(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]);
    // Заплечная рама: за спиной, от грудного сустава назад и чуть ниже. У модели — на её кости груди (как каска на
    // голове): позвоночник MakeHuman гнётся ещё и в пояснице, и на ведущей кости рама в наклоне отходила от спины на
    // 20–25 см.
    const stack = stackRig(mats);
    stack.position.set(0, -0.08, -0.2).add(chestShift);
    stack.visible = false;
    bones[B.chest].add(stack);
    if (human) {
      let mhChest = null;
      human.scene.traverse(function (o) { if (!mhChest && o.isBone && o.name === humans.map.chest) mhChest = o; });
      if (mhChest) { group.updateMatrixWorld(true); mhChest.attach(stack); }
    }
    stack.userData.restQ = stack.quaternion.clone();
    stack.userData.restP = stack.position.clone();
    // Ремень с подсумком у модели — на коже (кости и веса брюк и нагрудника у пояса): в приседе и сидя на ящике
    // гнётся с талией. Якорь вершины — точка пояса на том же угле вокруг талии: подсумок и молоток висят там, где
    // ремень, и не растягиваются.
    if (human && human.skinnedSlot) {
      bodyGear.beltSkin = human.skinnedSlot(GM.gear);
      // середина талии по z — в осях модели (группа ремня уже на кости таза, её position — в осях кости)
      const bz = bodyGear.beltZ = bodyGear.belt.size ? bodyGear.belt.size.cz : 0;
      bodyGear.beltAnchor = function (x, y, z, out) {
        const bs = bodyGear.belt.size || { w: 0.15, d: 0.11 };
        const a = Math.atan2(x, z - bz);
        if (bs.prof) { const r = profileRadius(bs.prof, a); return out.set(Math.sin(a) * r, beltY, bz + Math.cos(a) * r); }
        return out.set(Math.sin(a) * bs.w, beltY, bz + Math.cos(a) * bs.d);
      };
    }
    // «Телефон» (слитая сетка тела): каска и ремни — части той же сетки (humans.js → mergeGear), свои меши каски и
    // ремня не рисуются, пока каска на голове; три ремня — простой, с подсумком и молотком (3+), золотой (7)
    if (human && human.merged && fit && bodyGear.beltSkin) {
      const hg = S.helmet.clone();
      hg.setAttribute('aRest', hg.attributes.position.clone());
      hg.applyMatrix4(_m4.compose(new THREE.Vector3(0, fit.y, at(B.head)[2] + 0.002), _q.setFromAxisAngle(X_AXIS, -HELMET_TILT), new THREE.Vector3(1, 1, 1)));
      const bs = bodyGear.belt.size || { w: 0.15, d: 0.11 };
      const belts = [[false, false], [false, true], [true, true]].map(function (f) {
        const bg = beltGear(bs.w, bs.d, f[0], f[1], bs.prof || null).gear;
        return bg ? human.skinGear(bg, 'belt|' + Math.round(bs.w * 1000) + '|' + Math.round(bs.d * 1000) + '|' + f[0] + '|' + f[1] + '|' + (bs.prof ? bs.prof.key : ''), bodyGear.beltAnchor, [0, beltY, bodyGear.beltZ]) : null;
      });
      if (human.mergeGear([{ geo: hg, bone: humans.map.head }, { geo: belts[0] }, { geo: belts[1] }, { geo: belts[2] }])) {
        bodyGear.merged = true;
        helmet.children[0].visible = false;
      }
      hg.dispose();
    }
    // свои ресурсы рабочего (освободить в dispose): огонёк сигареты, начальный блок в руке, блоки рамы
    const own = [tools.cigarette.userData.ember.material, tools.cigarette.userData.ember.geometry, leftTools.block.geometry].concat(stack.userData.own);
    const restArm = function (sd) {
      const v = function (i) { const q = at(B[i + sd]); return new THREE.Vector3(q[0] - c0[0], q[1] - c0[1], q[2] - c0[2]); };
      const sh = v('upperArm'), el = v('foreArm'), wr = v('hand');
      const d = el.clone().sub(sh).normalize();
      const z = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize();
      return { sh, L1: el.distanceTo(sh), L2: wr.distanceTo(el), d, h: d.clone().cross(z), z };
    };
    const worker = {
      group, mesh, bones, look, tools, leftTools, toolRest, human, hipsRest: at(B.hips)[1], seed, fx: [], rank: 0, helmetMat: hm, stack,
      chestShift, armRest: { R: restArm('R'), L: restArm('L') },
      anim: { phase: 0, speed: 0, action: 'idle', t: 0, climb: 0, bend: 0, stage: 0, target: null, hold: null, load: 0, over: 1, gripL: 0.25, gripR: 0.25, prev: 0 },
      pose: BONES.map(function () { return new THREE.Quaternion(); }),
      // Ноша оригинала: стопка блоков материала на заплечной раме (до 6 штук по долям ноши, game.js →
      // paintCarryStack). looks — блоки снизу вверх: { geometry, material } (crew.js), key — их состав;
      // пустой список — рама без ноши.
      // Блоки одного материала — одной сеткой в осях рамы (один вызов отрисовки на материал, не на блок).
      setStack: function (looks, key) {
        if (worker.stackKey === key) return;
        worker.stackKey = key;
        const blocks = worker.stack.userData.blocks;
        if (merge && human) {
          // «Телефон»: рама с блоками — одна сетка
          worker.stack.userData.frameMesh.geometry = looks.length ? flatStack(worker.stack.userData.frameGeo, looks, key + '|' + looks.length, blocks) : worker.stack.userData.frameGeo;
          blocks.forEach(function (m) { m.visible = false; });
          worker.stack.visible = true;
          return;
        }
        const groups = new Map();
        looks.forEach(function (l, i) { if (i < blocks.length) (groups.get(l) || groups.set(l, []).get(l)).push(i); });
        let k = 0;
        groups.forEach(function (idx, l) {
          const m = blocks[k++];
          m.geometry = stackGeometry(l.geometry, idx, blocks);
          m.material = l.material;
          m.position.set(0, 0, 0); m.rotation.set(0, 0, 0);
          m.visible = true;
        });
        for (; k < blocks.length; k++) blocks[k].visible = false;
        worker.stack.visible = true;
      },
      // Одежда разряда (cw-ranks.js): каска, комбинезон, перчатки, ленты и нашивки, снаряжение; true — сменилась.
      dress: function (rank, shirt) {
        const o = outfitOf(rank);
        const key = o.tier + '|' + shirt;
        if (worker.dressKey === key) return false;
        worker.dressKey = key;
        worker.rank = o.tier;
        look.helmet = o.helmet;
        hm.color.setHex(o.helmet);
        hm.metalness = o.top ? 0.95 : 0;
        hm.roughness = o.top ? 0.2 : 0.32;
        hm.userData.u.uSticker.value = o.tier >= 2 && !o.top ? 1 : 0;
        hm.userData.u.uStripes.value = o.tier >= 3 ? 1 : 0;
        hm.userData.u.uSuit.value.setHex(o.suit);
        hm.userData.u.uTrim.value.setHex(o.trim);
        setGear(headGear, helmetGear(o.tier, o.top, o.helmetDark), o.tier >= 4);
        const bs = bodyGear.belt.size || { w: 0.15, d: 0.11 };
        const belt = beltGear(bs.w, bs.d, o.top, o.tier >= 3, bs.prof || null);
        worker.beltKind = o.top ? 3 : o.tier >= 3 ? 2 : 1;
        if (bodyGear.merged) {
          // «Телефон»: ремень и каска — части слитой сетки тела
          bodyGear.beltSkin.visible = false;
          setGear(bodyGear.belt, null, false);
          human.gearShow(!worker.bareHead, worker.beltKind, o.helmet);
        } else if (bodyGear.beltSkin) {
          // на коже: сетка с весами — общая у модели и вида ремня
          const key = 'belt|' + Math.round(bs.w * 1000) + '|' + Math.round(bs.d * 1000) + '|' + o.top + '|' + (o.tier >= 3) + '|' + (bs.prof ? bs.prof.key : '');
          const g = belt.gear ? human.skinGear(belt.gear, key, bodyGear.beltAnchor, [0, beltY, bodyGear.beltZ]) : null;
          bodyGear.beltSkin.geometry = g || bodyGear.beltSkin.geometry;
          bodyGear.beltSkin.visible = !!g;
          setGear(bodyGear.belt, null, false);
        } else setGear(bodyGear.belt, belt, true);
        setGear(bodyGear.radio, radioGear(), o.tier >= 5);
        setGear(bodyGear.padL, padGear(o.suitDark, o.top), o.tier >= 6);
        setGear(bodyGear.padR, padGear(o.suitDark, o.top), o.tier >= 6);
        if (o.aura) {
          if (!bodyGear.aura) {
            const am = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: o.aura, emissiveIntensity: 1.6, vertexColors: true, transparent: true,
              opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, roughness: 1 });
            am.onBeforeCompile = function (shader) {
              shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.r;');
            };
            am.customProgramCacheKey = function () { return 'cw-aura1'; };
            linkSky(am);
            bodyGear.aura = new THREE.Mesh(auraGeometry(), am);
            bodyGear.aura.position.y = 0.012;
            bodyGear.aura.renderOrder = 2;
            bodyGear.aura.userData.noGI = true;
            group.add(bodyGear.aura);
          }
          bodyGear.aura.material.emissive.setHex(o.aura);
          bodyGear.aura.visible = true;
        } else if (bodyGear.aura) bodyGear.aura.visible = false;
        if (human) human.dress(o, shirt);
        else if (mesh) {
          // прежнее тело (поле расстояний): цвета областей — куртка, жилет, брюки, перчатки
          const u = mesh.material.userData.colors;
          if (u) { u[1].setHex(o.suit); u[2].setHex(o.suitDark); u[4].setHex(o.suit); u[6].setHex(o.glove); }
        }
        return true;
      },
      // Каска снята (сон лёжа) — лежит на земле у изголовья подстилки, куполом вверх (оси фигуры; side — бок, на
      // котором лежит: 0 на спине — слева от головы, ±1 — за спиной); волосы и кожа под ней — целиком (humans.js).
      bareHead: false,
      helmetOff: function (off, side) {
        if (worker.bareHead === !!off) return;
        worker.bareHead = !!off;
        if (off) {
          group.add(helmet);
          if (side) helmet.position.set(-0.5 * side, 0.012, -0.8); else helmet.position.set(0.48, 0.012, -0.66);
          helmet.rotation.set(0, side ? -1.9 * side : 2.2, 0);
        } else {
          helmetOn.parent.add(helmet);
          helmet.position.copy(helmetOn.pos);
          helmet.quaternion.copy(helmetOn.quat);
        }
        if (human && human.helmetOn) human.helmetOn(!off);
        // «Телефон»: на голове каска — часть слитой сетки, на земле — свой меш
        if (bodyGear.merged) { helmet.children[0].visible = !!off; human.gearShow(!off, worker.beltKind); }
      },
      // жест поверх действия: 'call' — «Айда курить!», 'rank' — новый разряд (секунды)
      gesture: function (kind, seconds) { worker.anim.gesture = kind; worker.anim.gestT = 0; worker.anim.gestDur = seconds || 1.5; },
      // Рабочий ушёл с площадки (пересборка, смена уровня): свои материалы, фактуры костей и сетки — освободить, из
      // списка движущихся (render.js) — убрать. Общие сетки моделей, снаряжения и кладки остаются.
      dispose: function () {
        DYNAMIC.delete(group);
        if (human) human.dispose();
        else if (mesh) { mesh.material.dispose(); mesh.skeleton.dispose(); }
        hm.dispose();
        if (bodyGear.aura) bodyGear.aura.material.dispose();
        own.forEach(function (x) { if (x) x.dispose(); });
        own.length = 0;
      },
    };
    worker.dress(ident ? ident.rank : 1, look.shirt);
    if (lite) {
      const body = new Set(human ? human.meshes : mesh ? [mesh] : []);
      group.traverse(function (o) { if (o.isMesh && !body.has(o)) o.castShadow = false; });
    }
    return worker;
  }
  // lite — «Телефон»: в тени только тело (реквизит рабочего в crew.js — так же)
  return { create, ready, lite };
}

// ---------- движения ----------
// Поза собирается слоями: ходьба или стойка, действие на месте (циклы по фазе логики), затем ИК рук к точкам
// в мире — верх растущей кладки, столешница, рот, рукоять кирки. Пальцы — хват (humans.js → grip). Удары кирки,
// постукивание мастерком, выдох дыма — события w.fx для эффектов (life.js).

const TARGET = BONES.map(function () { return new THREE.Euler(); });
const SAVE = BONES.map(function () { return new THREE.Vector3(); });
function set(i, x, y, z) { TARGET[i].set(x, y, z, 'XYZ'); }

// Двухзвенная ИК руки в осях груди: кисть — в target, локоть — в сторону pole. Плечо поворачивается целиком,
// предплечье сгибается вокруг оси локтя — поперёк руки (в покое рука отведена на 38°, ось X кости для сгиба
// не годится: с ней локоть не сгибается больше чем на ~100°).
const IK = { d: new THREE.Vector3(), p: new THREE.Vector3(), u: new THREE.Vector3(), f: new THREE.Vector3(), z: new THREE.Vector3(), h: new THREE.Vector3(), m0: new THREE.Matrix4(), m1: new THREE.Matrix4(), q: new THREE.Quaternion() };
function armIK(w, sd, target, pole) {
  const J = w.armRest[sd], k = IK;
  const d = k.d.subVectors(target, J.sh);
  const dist = THREE.MathUtils.clamp(d.length(), Math.abs(J.L1 - J.L2) + 0.01, (J.L1 + J.L2) * 0.999);
  d.normalize();
  const ca = (J.L1 * J.L1 + dist * dist - J.L2 * J.L2) / (2 * J.L1 * dist), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const p = k.p.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
  const u = k.u.copy(d).multiplyScalar(ca).addScaledVector(p, sa);
  const f = k.f.copy(d).multiplyScalar(dist).addScaledVector(u, -J.L1).normalize();
  const cb = THREE.MathUtils.clamp(u.dot(f), -1, 1), beta = Math.acos(cb), sb = Math.sin(beta);
  const z = sb > 1e-3 ? k.z.copy(f).addScaledVector(u, -cb).divideScalar(sb) : k.z.copy(p);
  // поворот плеча: базис покоя (рука, ось локтя, вперёд) → новый
  k.m1.makeBasis(u, k.h.crossVectors(u, z), z).multiply(k.m0.makeBasis(J.d, J.h, J.z).transpose());
  TARGET[B['upperArm' + sd]].setFromQuaternion(k.q.setFromRotationMatrix(k.m1), 'XYZ');
  TARGET[B['foreArm' + sd]].setFromQuaternion(k.q.setFromAxisAngle(J.h, beta), 'XYZ');
}

const ss = THREE.MathUtils.smoothstep;
// ступень лестницы лесов у высоты hh (ступени — через 0,3 м от низа каждой клетки, scaffold.js, 1..6): нечётная или
// чётная — кисти на ступенях через одну
function rung(hh, odd) {
  const base = Math.floor(hh / 2) * 2;
  let n = Math.round((hh - base) / 0.3);
  if ((n & 1) !== (odd ? 1 : 0)) n += 1;
  return base + Math.max(1, Math.min(6, n)) * 0.3;
}
// 0 → 1 → 0 на отрезке [a, b] цикла
function bump(c, a, b) { return c <= a || c >= b ? 0 : Math.sin(Math.PI * (c - a) / (b - a)); }
// фаза цикла прошла точку p с прошлого кадра (события эффектов)
function crossed(prev, cur, p) { return cur >= prev ? prev < p && cur >= p : prev < p || cur >= p; }

// Цели рук: точка в мире (world) или в осях груди (local), между двумя — доля k. Разрешаются после поворота
// корпуса, когда известна матрица груди.
const IK_REQ = [];
const POLE = { L: new THREE.Vector3(0.9, -0.4, -0.25), R: new THREE.Vector3(-0.9, -0.4, -0.25) };
const POLE_LOW = { L: new THREE.Vector3(0.7, -0.15, -0.7), R: new THREE.Vector3(-0.7, -0.15, -0.7) };
// локоть вниз и чуть в сторону: рука к губам (перекур, бутерброд)
const POLE_SMOKE = new THREE.Vector3(-0.35, -1.0, 0.1);
// local: true — в осях груди, 'head' — в осях головы (губы), иначе — в мире
function point(p, local) { return { p: p, local: local || false }; }
function reach(sd, a, b, k, pole) { IK_REQ.push({ sd: sd, a: a, b: b || null, k: k || 0, pole: pole || POLE[sd] }); }
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _f = new THREE.Vector3(), _l = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const ZERO3 = new THREE.Vector3(), Z_AXIS = new THREE.Vector3(0, 0, 1), X_AXIS = new THREE.Vector3(1, 0, 0), _q2 = new THREE.Quaternion();
// доля наклона груди, на которую рама отстаёт (висит на лямках)
const FRAME_LAG = 0.4, FRAME_PIVOT = new THREE.Vector3(0, 0.36, 0.03);
// вспомогательные точки (по одной на роль, без выделений в кадре)
const PT = {}; ['a', 'b', 'c', 'd', 'e'].forEach(function (k) { PT[k] = new THREE.Vector3(); });
// точка у фигуры: вперёд, влево, вверх от стоп (м)
// (м роста среднего рабочего: младший и старший — по своему масштабу, crew.js → размер по рангу экспертизы)
function near(out, w, fwd, left, up) { const s = w.group.scale.x; return out.copy(w.pos).addScaledVector(_f, fwd * s).addScaledVector(_l, left * s).setY(w.pos.y + up * s); }
// точка от цели в мире: вдоль ряда (влево), к фигуре, вверх
function along(out, base, left, back, up) { return out.copy(base).addScaledVector(_l, left).addScaledVector(_f, -back).setY(base.y + up); }
// Губы и кисть у рта — в осях головы: у моделей MakeHuman губы на 3,3 см ниже и 10 см впереди сустава головы (у всех
// трёх). Прежние точки в осях груди мерились от прежнего скелета: грудной сустав MakeHuman на 10,6 см ниже, и
// сигарета, бутерброд и выдох приходились на подбородок и горло. Кисть с сигаретой — так, чтобы фильтр (в щепоти, на
// 10 см дальше запястья) был у губ; с бутербродом — край бутерброда у рта (подобраны по позе, cwf-tmp/mh.mjs).
// Место у пояса (BELLY) и блок с рамы (FRAME, у левой лопатки на уровне груди) — в осях груди; BELLY — от прежнего
// скелета, его сдвигает w.chestShift.
const LIPS = new THREE.Vector3(0, -0.033, 0.1);
// затяжка: запястье (оси головы) и поворот кисти — подобраны так, чтобы фильтр был у губ, сигарета смотрела от лица,
// а кулак не закрывал нос (cwf-tmp/smoketune.mjs)
const SMOKE = { hand: [-0.023, -0.162, 0.177], wrist: [0.2, -0.2, -0.2] };
const SMOKE_HAND = new THREE.Vector3().fromArray(SMOKE.hand), EAT_HAND = new THREE.Vector3(0.023, -0.048, 0.181);
const BELLY = new THREE.Vector3(-0.1, -0.2, 0.2), FRAME = new THREE.Vector3(0.19, -0.02, -0.15);
const _belly = new THREE.Vector3();
// Локти лёжа (в осях груди): на спине — в стороны и к земле; на боку нижняя рука лежит по подстилке (локоть вперёд и
// к ногам), верхняя свисает к подстилке перед грудью (локоть вверх и к ногам; знак — по стороне)
const POLE_SLEEP = { backL: new THREE.Vector3(0.9, 0, -0.4), backR: new THREE.Vector3(-0.9, 0.2, -0.3), low: new THREE.Vector3(0, -0.5, 0.85),
  upR: new THREE.Vector3(-0.25, 0, -0.95), upL: new THREE.Vector3(0.25, 0, -0.95) };

// Позы сна (точки — у фигуры: вперёд, влево, вверх, м; подобраны по моделям MakeHuman, cwf-tmp/mh.mjs): высота таза,
// наклон таза и бёдер, кисти. Лёжа фигура вытянута к −z (голова — к изголовью подстилки, crew.js).
const SIT_DOZE = { hips: 0.12, pelvis: -0.15, thigh: -2.35, shin: 1.72, foot: 0.78, hand: [0.28, 0.07, 0.54] };
const SLEEP_BACK = { hips: 0.145, belly: [-0.1, 0.09, 0.37], mat: [0.12, -0.3, 0.1] };
// стойка с киркой: проседание таза в покое и на ударе (колени согнуты, задняя нога отставлена: прежние −0,05/−0,17
// уводили носки в землю на 6–15 см)
const PICK_STANCE = { bob: -0.03, hit: 0.02 };
const SLEEP_SIDE = { hips: 0.24, headRoll: 0.45, low: [-0.66, 0.4, 0.08], up: [0.08, 0.06, 0.52] };

// событие эффекта в очередь фигуры; pick и mouth — точку дадут кирка и голова после позы
function fx(w, type, p, extra) {
  if (w.fx.length >= 24) return;
  w.fx.push(Object.assign({ type: type, x: p.x || 0, y: p.y || 0, z: p.z || 0, pick: !!p.pick, hammer: !!p.hammer, mouth: !!p.mouth, ember: !!p.ember }, extra || null));
}

// a.speed — м/с (идёт или бежит), a.action: idle | lay | pick | hammer | screw | tie | climb | work-high | mantle |
// jump | plan | smoke | eat | rest | sleep; a.stage 0..1 — ход залезания на куб или прыжка; a.target — точка
// в мире (верх растущей кладки у фигуры, середина стола); a.hold — блок для руки (вид из crew.js); a.load 0..1 —
// ноша, a.over — перегруз.
export function animateWorker(w, dt, time) {
  const a = w.anim;
  TARGET.forEach(function (e) { e.set(0, 0, 0); });
  IK_REQ.length = 0;
  const S = Math.sin, C = Math.cos;
  const armDown = 0.6;
  // база: руки вдоль тела
  set(B.upperArmL, 0, 0, -armDown);
  set(B.upperArmR, 0, 0, armDown);
  set(B.foreArmL, -0.15, 0, 0);
  set(B.foreArmR, -0.15, 0, 0);
  let bob = 0, gripL = 0.25, gripR = 0.25, styleL = 'fist', styleR = 'fist', holdBlock = false, ember = 0, bare = null;
  const h = w.heading || 0;
  _f.set(S(h), 0, C(h));
  _l.set(C(h), 0, -S(h));
  const load = a.load || 0;
  const moving = a.speed > 0.05;
  // усталость к ночи и голод (0..1 сверх порога, где они уже замедляют работу, — crew.js): сутулится, мах рук меньше
  const tired = a.tired || 0, hungry = a.hungry || 0;
  if (moving) {
    // шаг до ~2,4 м/с, дальше — бег (рабочие оригинала ходят 4–8 м/с на клетке 2 м): частота шагов
    // растёт медленно, длина шага — быстро; наклон вперёд, колено выше, руки согнуты, фаза полёта
    const run = ss(a.speed, 2.4, 4.8);
    const stride = (1.35 + a.speed * 0.25) * (1 - 0.12 * load);
    const rate = THREE.MathUtils.lerp(a.speed / stride, 1.45 + 0.035 * a.speed, run);
    a.phase += rate * Math.PI * 2 * dt;
    const p = a.phase;
    const amp = Math.min(1, a.speed / 1.3);
    const L = THREE.MathUtils.lerp;
    set(B.thighL, L(-S(p) * 0.42 * amp, -S(p) * 0.72 - 0.18, run), 0, 0);
    set(B.thighR, L(S(p) * 0.42 * amp, S(p) * 0.72 - 0.18, run), 0, 0);
    set(B.shinL, L(Math.max(0, S(p - 1.6)) * 0.85 * amp + 0.05, Math.max(0, S(p - 1.2)) * 1.7 + 0.3, run), 0, 0);
    set(B.shinR, L(Math.max(0, S(p + Math.PI - 1.6)) * 0.85 * amp + 0.05, Math.max(0, S(p + Math.PI - 1.2)) * 1.7 + 0.3, run), 0, 0);
    set(B.footL, L(Math.max(0, -S(p)) * 0.25 * amp, Math.max(0, -S(p)) * 0.35 - 0.1, run), 0, 0);
    set(B.footR, L(Math.max(0, S(p)) * 0.25 * amp, Math.max(0, S(p)) * 0.35 - 0.1, run), 0, 0);
    // с ношей мах рук меньше, кисти держат лямки у груди
    const straps = ss(load, 0.2, 0.6) * (1 - 0.7 * run);
    const swing = 1 - 0.65 * straps;
    set(B.upperArmL, L(L(S(p) * 0.32 * amp, S(p) * 0.75 - 0.15, run) * swing, -0.55, straps), 0, L(-armDown * (1 - 0.45 * run), -0.18, straps));
    set(B.upperArmR, L(L(-S(p) * 0.32 * amp, -S(p) * 0.75 - 0.15, run) * swing, -0.55, straps), 0, L(armDown * (1 - 0.45 * run), 0.18, straps));
    set(B.foreArmL, L(L(-0.25 - Math.max(0, S(p)) * 0.3 * amp, -1.45 - Math.max(0, S(p)) * 0.2, run), -1.95, straps), 0, 0);
    set(B.foreArmR, L(L(-0.25 - Math.max(0, -S(p)) * 0.3 * amp, -1.45 - Math.max(0, -S(p)) * 0.2, run), -1.95, straps), 0, 0);
    if (straps > 0.3) { gripL = gripR = 0.9; }
    // таз: поворот за ногой и проседание над ногой в махе; плечи — навстречу тазу
    set(B.hips, 0, S(p) * L(0.06 * amp, 0.12, run), S(p) * 0.045 * amp * (1 - 0.5 * run));
    set(B.chest, L(0.04, 0.1, run), -S(p) * L(0.08 * amp, 0.16, run), -S(p) * 0.03 * amp);
    TARGET[B.spine].x += 0.16 * run + 0.08 * load + 0.12 * Math.max(0, Math.min(1, (a.over || 1) - 1)) + 0.1 * tired;
    // усталый: голова ниже, руки висят (мах меньше)
    if (tired > 0) {
      TARGET[B.head].x += 0.14 * tired;
      TARGET[B.upperArmL].x *= 1 - 0.4 * tired; TARGET[B.upperArmR].x *= 1 - 0.4 * tired;
    }
    // голова держит горизонт: гасит качку корпуса
    TARGET[B.head].x -= 0.06 * run;
    if (a.action === 'cheer') {
      // объект сдан, а он идёт: машет руками над головой на ходу (как у оригинала — радуются и идущие)
      const q = time * (6.5 + (w.seed % 3));
      set(B.upperArmL, -2.7 + 0.25 * S(q), 0, -0.5); set(B.upperArmR, -2.7 - 0.25 * S(q + 1), 0, 0.5);
      set(B.foreArmL, -0.35, 0, 0); set(B.foreArmR, -0.35, 0, 0);
      TARGET[B.head].x -= 0.2;
      gripL = gripR = 0.9;
    }
    bob = L((Math.abs(C(p)) - 0.6) * 0.03 * amp, (Math.abs(C(p)) - 0.45) * 0.08, run);
  } else {
    // дыхание, вес переносится с ноги на ногу, взгляд блуждает
    const br = S(time * 1.6 + w.look.build) * 0.02;
    const sh = S(time * 0.31 + (w.seed || 0));
    set(B.chest, br, 0, 0);
    set(B.head, 0.04 * S(time * 0.23 + 1.3), S(time * 0.37 + w.look.helmet) * 0.25, 0);
    set(B.hips, 0, 0.03 * sh, 0.035 * sh);
    set(B.thighL, 0.02, 0, -0.035 * sh);
    set(B.thighR, 0.02, 0, -0.035 * sh);
    set(B.shinL, 0.1 * Math.max(0, -sh), 0, 0);
    set(B.shinR, 0.1 * Math.max(0, sh), 0, 0);
    TARGET[B.spine].z -= 0.02 * sh;
    // разворот на месте: переступает с ноги на ногу, пока поворачивается
    a.turnK = (a.turnK || 0) + ((a.turn > 0.8 ? 1 : 0) - (a.turnK || 0)) * (1 - Math.exp(-dt * 8));
    if (a.turnK > 0.02 && (a.action === 'idle' || a.action === 'lay' || a.action === 'plan' || a.action === 'smoke')) {
      a.turnPh = (a.turnPh || 0) + dt * 9;
      const st = a.turnK, q = a.turnPh;
      TARGET[B.thighL].x += -Math.max(0, S(q)) * 0.35 * st; TARGET[B.thighR].x += -Math.max(0, -S(q)) * 0.35 * st;
      TARGET[B.shinL].x += Math.max(0, S(q)) * 0.6 * st; TARGET[B.shinR].x += Math.max(0, -S(q)) * 0.6 * st;
      bob += -0.015 * st * Math.abs(S(q));
    }
    // стоит усталый: плечи вниз, голова опущена
    if (tired > 0 && (a.action === 'idle' || a.action === 'plan' || a.action === 'smoke')) {
      TARGET[B.spine].x += 0.08 * tired; TARGET[B.chest].x += 0.06 * tired; TARGET[B.head].x += 0.16 * tired;
    }
    if (a.action === 'idle' && (tired > 0.25 || hungry > 0.3)) {
      // усталый зевает (раз в 8–11 с): голова назад, ладонь ко рту; голодный — ладонь на живот, потирает
      const P = 8 + (w.seed % 4), c = ((time + w.seed * 2.3) % P) / P, g = bump(c, 0.0, 0.3);
      if (g > 0 && tired > 0.25) {
        TARGET[B.head].x -= 0.42 * g; TARGET[B.chest].x -= 0.12 * g; TARGET[B.spine].x -= 0.06 * g;
        reach('R', point(PT.d.set(-0.02, -0.12, 0.135), 'head'), null, 0, POLE_SMOKE);
        set(B.handR, -0.5 * g, 0, 0);
        gripR = 0.2; styleR = 'flat';
      } else if (g > 0) {
        const rub = S(time * 4.5) * 0.03;
        reach('L', point(PT.d.set(0.03 + rub, -0.2, 0.17), true), null, 0, POLE.L);
        TARGET[B.head].x += 0.12 * g;
        gripL = 0.15; styleL = 'flat';
      }
    } else if (a.action === 'idle') {
      // жесты ожидания раз в 10–14 с (по номеру рабочего): потянуться, потереть шею, поправить каску
      const P = 10 + (w.seed % 5), c = ((time + w.seed * 3.7) % P) / P, g = bump(c, 0.0, 0.24);
      const kind = Math.floor((time + w.seed * 3.7) / P + w.seed) % 3;
      if (g > 0) {
        if (kind === 0) {
          set(B.upperArmL, -2.6 * g, 0, -0.6 + 0.4 * g); set(B.upperArmR, -2.6 * g, 0, 0.6 - 0.4 * g);
          set(B.foreArmL, -0.6 * g, 0, 0); set(B.foreArmR, -0.6 * g, 0, 0);
          TARGET[B.spine].x -= 0.18 * g; TARGET[B.head].x -= 0.25 * g;
          gripL = gripR = 0.1; styleL = styleR = 'flat';
        } else if (kind === 1) {
          reach('R', point(PT.d.set(-0.03, 0.28, -0.1), true), null, 0, POLE.R);
          TARGET[B.head].x += 0.25 * g; TARGET[B.head].z += 0.15 * g;
          gripR = 0.4;
        } else {
          reach('R', point(PT.d.set(-0.06, 0.52, 0.1), true), null, 0, POLE.R);
          gripR = 0.7;
        }
      }
    }
  }
  // действие на месте
  if (!moving) {
    const t = a.t;
    if (a.action === 'lay') {
      // Кладка: левая рука берёт блок с рамы за плечом, несёт к верху ряда и прижимает; правая — мастерок:
      // раствор вдоль ряда, затем осаживает блок. Поза — по высоте верха кладки над стопами: низко — присед,
      // по пояс — наклон, у головы — выпрямлен и тянется.
      const P = 1.9, c = (t % P) / P;
      const tg = a.target || near(PT.e, w, 0.65, 0, 0.6);
      const rel = tg.y - w.pos.y;
      const low = 1 - ss(rel, 0.3, 0.95), high = ss(rel, 1.25, 1.75);
      const bend = (1 - high) * (0.55 - 0.3 * low) * (0.9 + 0.1 * S(c * 6.283));
      TARGET[B.spine].x += bend * 0.8 + 0.2 * low;
      TARGET[B.chest].x += bend * 0.3;
      TARGET[B.head].x += 0.22 * (1 - high) - 0.35 * high;
      set(B.thighL, -1.15 * low - 0.1 * (1 - low), 0, -0.1 * low); set(B.thighR, -1.15 * low - 0.1 * (1 - low), 0, 0.1 * low);
      set(B.shinL, 1.75 * low + 0.12 * (1 - low), 0, 0); set(B.shinR, 1.75 * low + 0.12 * (1 - low), 0, 0);
      set(B.footL, -0.55 * low + 0.12 * high, 0, 0); set(B.footR, -0.55 * low + 0.12 * high, 0, 0);
      bob = -0.33 * low - 0.03 * (1 - low) * (1 - high) + 0.04 * high;
      // левая: рама (0–0.2) → к ряду (0.2–0.45) → прижать (0.45–0.56) → лежит на блоке → назад к раме
      const toRow = ss(c, 0.18, 0.45) * (1 - ss(c, 0.9, 1.0));
      const press = bump(c, 0.45, 0.6);
      along(PT.a, tg, 0.1, 0.05, 0.1 - 0.07 * press);
      reach('L', point(FRAME, true), point(PT.a), toRow, POLE_LOW.L);
      holdBlock = c > 0.17 && c < 0.5;
      gripL = holdBlock ? 1 : 0.15;
      styleL = holdBlock ? 'fist' : 'flat';
      // правая: раствор вдоль ряда (0–0.4), ждёт (0.4–0.56), осаживает тремя ударами (0.56–0.86)
      const spread = 1 - ss(c, 0.36, 0.44);
      const tap = bump(c, 0.56, 0.88);
      const knock = Math.abs(S((c - 0.56) / 0.32 * Math.PI * 3)) * tap;
      along(PT.b, tg, -0.2 + 0.32 * S(c / 0.4 * Math.PI), 0.08, 0.04);
      along(PT.c, tg, 0.06, 0.06, 0.2 - 0.12 * knock);
      reach('R', point(PT.b), point(PT.c), 1 - spread, POLE_LOW.R);
      gripR = 1;
      if (crossed(a.prev, c, 0.5)) fx(w, 'place', along(_v, tg, 0.1, 0, 0), { color: a.fxColor });
      if (crossed(a.prev, c, 0.67) || crossed(a.prev, c, 0.77)) fx(w, 'tap', along(_v, tg, 0.06, 0, 0.02), { color: a.fxColor, metal: a.fxMetal });
      a.prev = c;
    } else if (a.action === 'pick') {
      // Кирка: замах над головой (корпус назад), удар (корпус вперёд, колени мягко), выдернуть и снова.
      // Правая рука — у конца рукояти, левая — на рукояти выше (ИК к рукояти).
      const P = 1.3, c = (t % P) / P;
      const lift = ss(c, 0.04, 0.46) * (1 - ss(c, 0.5, 0.6));
      const hit = ss(c, 0.5, 0.6) * (1 - ss(c, 0.8, 1.0));
      set(B.thighL, -0.3 - 0.32 * hit, 0, -0.12); set(B.thighR, 0.14 - 0.1 * hit, 0, 0.12);
      set(B.shinL, 0.34 + 0.45 * hit, 0, 0); set(B.shinR, 0.26 + 0.35 * hit, 0, 0);
      set(B.footL, -0.08 - 0.1 * hit, 0, 0); set(B.footR, -0.12 - 0.12 * hit, 0, 0);
      TARGET[B.spine].x += -0.14 * lift + 0.66 * hit;
      TARGET[B.chest].x += -0.08 * lift + 0.22 * hit;
      TARGET[B.chest].y += 0.12 * lift;
      TARGET[B.head].x += 0.15 * hit - 0.1 * lift;
      bob = PICK_STANCE.bob + PICK_STANCE.hit * hit;
      set(B.upperArmR, -0.55 - 2.15 * lift + 0.32 * hit, 0.12, 0.2 - 0.12 * lift);
      set(B.foreArmR, -0.3 - 0.6 * lift - 0.05 * hit, 0, 0);
      set(B.handR, 0.3 * lift - 0.55 * hit, 0, 0);
      reach('L', { handle: 0.3 }, null, 0, POLE.L);
      gripL = gripR = 1;
      if (crossed(a.prev, c, 0.58)) fx(w, 'impact', { pick: true }, { color: a.fxColor });
      a.prev = c;
    } else if (a.action === 'hammer') {
      const sw = (S(t * 9.0) * 0.5 + 0.5);
      set(B.upperArmR, -1.45 - sw * 0.5, 0.1, 0.35);
      set(B.foreArmR, -0.6 - sw * 1.1, 0, 0);
      set(B.handR, sw * 0.5 - 0.2, 0, 0);
      set(B.upperArmL, -1.2, -0.2, -0.3);
      set(B.foreArmL, -0.9, 0, 0);
      TARGET[B.chest].x += 0.1;
      gripR = 1; gripL = 0.15; styleL = 'flat';
      const c = (t * 9.0 / (Math.PI * 2)) % 1;
      if (crossed(a.prev, c, 0.75)) fx(w, 'tap', near(_v, w, 0.6, -0.1, 1.2), { color: a.fxColor, metal: a.fxMetal });
      a.prev = c;
    } else if (a.action === 'screw') {
      set(B.upperArmR, -1.35, 0, 0.2);
      set(B.foreArmR, -0.3 + S(t * 30) * 0.02, 0, 0);
      set(B.upperArmL, -1.2, 0, -0.25);
      set(B.foreArmL, -0.6, 0, 0);
      gripR = 1; gripL = 0.9;
    } else if (a.action === 'tie') {
      set(B.upperArmL, -1.1 + S(t * 6) * 0.12, 0, -0.3);
      set(B.upperArmR, -1.1 - S(t * 6) * 0.12, 0, 0.3);
      set(B.foreArmL, -1.2, 0, 0); set(B.foreArmR, -1.2, 0, 0);
    } else if (a.action === 'climb') {
      const c = a.climb * 6.0;
      set(B.upperArmL, -2.4 + S(c) * 0.35, 0, -0.2); set(B.upperArmR, -2.4 - S(c) * 0.35, 0, 0.2);
      set(B.foreArmL, -0.5 - 0.3 * Math.max(0, S(c)), 0, 0); set(B.foreArmR, -0.5 - 0.3 * Math.max(0, -S(c)), 0, 0);
      set(B.thighL, -0.9 - S(c) * 0.45, 0, 0); set(B.thighR, -0.9 + S(c) * 0.45, 0, 0);
      set(B.shinL, 1.3 + S(c) * 0.3, 0, 0); set(B.shinR, 1.3 - S(c) * 0.3, 0, 0);
      TARGET[B.head].x -= 0.15;
      gripL = gripR = 1;
      if (a.ladder) {
        // кисти на ступенях через одну: левая — нечётные, правая — чётные; перехват, когда плечи переросли ступень
        const Ld = a.ladder, hh = w.pos.y + 1.68;
        PT.a.set(Ld.x + Ld.oz * 0.17 - Ld.ox * 0.03, rung(hh, true) + 0.03, Ld.z - Ld.ox * 0.17 - Ld.oz * 0.03);
        PT.b.set(Ld.x - Ld.oz * 0.17 - Ld.ox * 0.03, rung(hh, false) + 0.03, Ld.z + Ld.ox * 0.17 - Ld.oz * 0.03);
        reach('L', point(PT.a), null, 0, POLE_LOW.L);
        reach('R', point(PT.b), null, 0, POLE_LOW.R);
      }
    } else if (a.action === 'mantle') {
      // залезание на куб 2 м (a.stage 0..1, как climbLift в game.js): руки на край, подтягивание с коленом
      // на ребро, шаг через край
      const st = a.stage;
      const reachUp = ss(st, 0, 0.2), pull = ss(st, 0.2, 0.78), over = ss(st, 0.78, 1);
      const up = reachUp * (1 - pull);
      set(B.upperArmL, -2.75 * up - 0.5 * pull * (1 - over), 0, -0.25 - 0.2 * pull); set(B.upperArmR, -2.75 * up - 0.5 * pull * (1 - over), 0, 0.25 + 0.2 * pull);
      set(B.foreArmL, -0.2 * up - 0.9 * pull * (1 - over), 0, 0); set(B.foreArmR, -0.2 * up - 0.9 * pull * (1 - over), 0, 0);
      const knee = ss(st, 0.45, 0.7) * (1 - over);
      set(B.thighL, -0.3 * reachUp * (1 - pull) - 1.5 * knee, 0, 0); set(B.thighR, -0.3 * reachUp * (1 - pull) + 0.25 * knee, 0, 0);
      set(B.shinL, 0.5 * reachUp * (1 - pull) + 1.8 * knee, 0, 0); set(B.shinR, 0.5 * reachUp * (1 - pull) + 0.4 * pull * (1 - over), 0, 0);
      TARGET[B.spine].x += 0.35 * pull * (1 - over);
      TARGET[B.head].x -= 0.25 * up;
      gripL = gripR = 0.2; styleL = styleR = 'flat';
    } else if (a.action === 'jump') {
      // спрыгивание (jumpHeight/jumpDip game.js): присед на краю, полёт с руками в стороны, мягкое приземление
      const st = a.stage;
      const crouch = Math.max(1 - Math.abs(st - 0.12) / 0.14, 0) + Math.max(1 - Math.abs(st - 0.92) / 0.1, 0);
      const air = ss(st, 0.25, 0.32) * (1 - ss(st, 0.8, 0.86));
      set(B.thighL, -0.9 * crouch - 0.35 * air, 0, 0); set(B.thighR, -0.9 * crouch - 0.15 * air, 0, 0);
      set(B.shinL, 1.4 * crouch + 0.5 * air, 0, 0); set(B.shinR, 1.4 * crouch + 0.3 * air, 0, 0);
      set(B.footL, -0.5 * crouch, 0, 0); set(B.footR, -0.5 * crouch, 0, 0);
      set(B.upperArmL, -0.6 * crouch - 0.3 * air, 0, -0.6 - 0.7 * air); set(B.upperArmR, -0.6 * crouch - 0.3 * air, 0, 0.6 + 0.7 * air);
      set(B.foreArmL, -0.4, 0, 0); set(B.foreArmR, -0.4, 0, 0);
      TARGET[B.spine].x += 0.4 * crouch;
      gripL = gripR = 0.15; styleL = styleR = 'flat';
      if (crossed(a.prev, st, 0.86)) fx(w, 'land', near(_v, w, 0, 0, 0.03));
      a.prev = st;
    } else if (a.action === 'work-high') {
      // На лестнице лесов, не поднимаясь (game.js → updateSticks, hanging): одна рука держится за ступень, ноги на
      // ступенях, голова запрокинута. Монтаж пролёта (erect) — правая с молотком работает над головой, из-под молотка
      // щепа; кладка с лестницы (a.hiPlace) — левая с блоком тянется к стене над головой и прижимает его.
      const sw = (S(t * 8.0) * 0.5 + 0.5);
      set(B.thighL, -0.5, 0, -0.04); set(B.thighR, -0.18, 0, 0.04);
      set(B.shinL, 0.7, 0, 0); set(B.shinR, 0.3, 0, 0);
      set(B.footL, -0.15, 0, 0);
      TARGET[B.head].x -= 0.3;
      TARGET[B.chest].x -= 0.04 * sw;
      const hold = a.hiPlace ? 'R' : 'L';
      if (a.ladder) {
        const Ld = a.ladder, hh = w.pos.y + 1.45, sg = hold === 'L' ? 1 : -1;
        PT.a.set(Ld.x + Ld.oz * 0.17 * sg - Ld.ox * 0.03, rung(hh, hold === 'L') + 0.03, Ld.z - Ld.ox * 0.17 * sg - Ld.oz * 0.03);
        reach(hold, point(PT.a), null, 0, POLE_LOW[hold]);
      } else if (hold === 'L') { set(B.upperArmL, -1.45, -0.15, -0.35); set(B.foreArmL, -0.75, 0, 0); }
      else { set(B.upperArmR, -1.45, 0.15, 0.35); set(B.foreArmR, -0.75, 0, 0); }
      if (a.hiPlace) {
        // блок к стене над головой: подносит (0–0,45), прижимает (0,45–0,7), отпускает
        const c = (t % 2.2) / 2.2, up = ss(c, 0.05, 0.45) * (1 - ss(c, 0.8, 0.98));
        near(PT.b, w, 0.32, 0.12, 1.3); near(PT.c, w, 0.42, 0.1, 1.95 - 0.04 * bump(c, 0.45, 0.7));
        reach('L', point(PT.b), point(PT.c), up, POLE.L);
        holdBlock = c < 0.72;
        gripL = holdBlock ? 1 : 0.2; styleL = holdBlock ? 'fist' : 'flat'; gripR = 1;
        if (crossed(a.prev, c, 0.55)) fx(w, 'place', near(_v, w, 0.45, 0.1, 1.95), { color: a.fxColor });
        a.prev = c;
      } else {
        set(B.upperArmR, -2.3 - sw * 0.35, 0.1, 0.25);
        set(B.foreArmR, -0.5 - sw * 0.8, 0, 0);
        gripR = 1; gripL = 1;
        const c = (t * 8.0 / (Math.PI * 2)) % 1;
        if (crossed(a.prev, c, 0.75)) fx(w, 'tap', { hammer: true }, { color: a.fxColor });
        a.prev = c;
      }
    } else if (a.action === 'plan') {
      // Над столом: опора на руки, корпус вперёд, взгляд в чертёж; правой время от времени показывает и чертит.
      const tg = a.target || near(PT.e, w, 0.55, 0, 0.88);
      const P = 6.5 + (w.seed % 4), c = (t % P) / P;
      const draw = ss(c, 0.3, 0.42) * (1 - ss(c, 0.78, 0.9));
      TARGET[B.spine].x += 0.46; TARGET[B.chest].x += 0.18; TARGET[B.head].x += 0.3;
      TARGET[B.head].y += 0.18 * S(t * 0.4 + w.seed) * (1 - draw);
      set(B.thighL, -0.16, 0, -0.04); set(B.thighR, -0.1, 0, 0.04);
      set(B.shinL, 0.1, 0, 0); set(B.shinR, 0.05, 0, 0);
      bob = -0.02;
      along(PT.a, tg, 0.22, 0.22, 0.05);
      reach('L', point(PT.a), null, 0, POLE_LOW.L);
      along(PT.b, tg, -0.22, 0.24, 0.05);
      along(PT.c, tg, -0.04 + 0.05 * C(t * 5.0), 0.12 + 0.04 * S(t * 3.3), 0.07);
      reach('R', point(PT.b), point(PT.c), draw, POLE_LOW.R);
      gripL = 0.1; styleL = 'flat';
      gripR = draw > 0.3 ? 0.9 : 0.12; styleR = draw > 0.3 ? 'point' : 'flat';
    } else if (a.action === 'smoke') {
      // Перекур: вес на одной ноге, левая рука в кармане, правая — сигарета у пояса, затяжка, выдох дымом.
      const P = 7 + (w.seed % 3) * 0.8, c = (t % P) / P;
      const up = ss(c, 0.05, 0.18) * (1 - ss(c, 0.34, 0.46));
      set(B.hips, 0, 0.05, 0.06);
      set(B.thighL, 0.02, 0, -0.06); set(B.thighR, -0.08, 0.1, -0.06);
      set(B.shinR, 0.22, 0, 0);
      TARGET[B.spine].z -= 0.04;
      TARGET[B.head].x += -0.12 * bump(c, 0.18, 0.34) + 0.06;
      TARGET[B.head].y += 0.25 * S(t * 0.25 + w.seed);
      set(B.upperArmL, 0.12, 0, -0.32); set(B.foreArmL, -0.65, 0, 0); set(B.handL, 0.3, 0, 0);
      reach('R', point(_belly.copy(BELLY).add(w.chestShift || ZERO3), true), point(SMOKE_HAND, 'head'), up, POLE_SMOKE);
      a.drag = up;
      set(B.handR, SMOKE.wrist[0] * up, SMOKE.wrist[1] * up, SMOKE.wrist[2] * up);
      gripL = 0.85; gripR = 0.7; styleR = 'pinch';
      ember = bump(c, 0.18, 0.34);
      // выдох дымом (струйку с кончика пускает crew.js → cw-smoke.js)
      if (crossed(a.prev, c, 0.5)) fx(w, 'exhale', { mouth: true });
      a.prev = c;
    } else if (a.action === 'eat') {
      // Обед на ящике: сидит, контейнер на коленях в левой, бутерброд в правой — ко рту, жуёт.
      const P = 3.6 + (w.seed % 3) * 0.4, c = (t % P) / P;
      const bite = ss(c, 0.1, 0.3) * (1 - ss(c, 0.46, 0.66));
      bob = 0.5 - (w.hipsRest || 0.95);
      set(B.thighL, -1.5, 0, -0.12); set(B.thighR, -1.5, 0, 0.12);
      set(B.shinL, 1.45, 0, 0); set(B.shinR, 1.45, 0, 0);
      set(B.footL, 0.05, 0, 0); set(B.footR, 0.05, 0, 0);
      TARGET[B.spine].x += 0.2; TARGET[B.chest].x += 0.06;
      TARGET[B.head].x += 0.14 - 0.12 * bite + 0.03 * S(t * 9) * (1 - bite);
      // левая кисть держит контейнер на коленях (он на бедре модели): запястье у его заднего края, пальцы на крышке
      if (w.leftTools.lunchbox.parent) {
        w.leftTools.lunchbox.getWorldPosition(PT.a).addScaledVector(_l, 0.04 * w.group.scale.x).addScaledVector(_f, -0.08 * w.group.scale.x);
        PT.a.y += 0.06 * w.group.scale.x;
      } else near(PT.a, w, 0.36, 0.06, 0.6);
      reach('L', point(PT.a), null, 0, POLE_LOW.L);
      near(PT.b, w, 0.36, -0.1, 0.66);
      reach('R', point(PT.b), point(EAT_HAND, 'head'), bite, POLE_SMOKE);
      set(B.handR, -0.6 * bite, 0, 0);
      gripL = 0.2; styleL = 'flat'; gripR = 0.6; styleR = 'pinch';
    } else if (a.action === 'rest') {
      // Отдых на земле: колени вверх, руки на коленях, корпус чуть назад, голова опущена.
      bob = 0.17 - (w.hipsRest || 0.95);
      set(B.thighL, -2.0, 0, -0.18); set(B.thighR, -2.0, 0, 0.18);
      set(B.shinL, 2.1, 0, 0); set(B.shinR, 2.1, 0, 0);
      set(B.footL, -0.1, 0, 0); set(B.footR, -0.1, 0, 0);
      TARGET[B.spine].x += 0.25; TARGET[B.chest].x += 0.12 + 0.02 * S(time * 1.3);
      TARGET[B.head].x += 0.3;
      near(PT.a, w, 0.42, 0.12, 0.38);
      near(PT.b, w, 0.42, -0.12, 0.38);
      reach('L', point(PT.a), null, 0, POLE_LOW.L);
      reach('R', point(PT.b), null, 0, POLE_LOW.R);
      gripL = gripR = 0.35;
    } else if (a.action === 'cheer') {
      // объект сдан: руки вверх, подпрыгивает, голова вверх; у каждого свой темп
      const q = t * (6.5 + (w.seed % 3)), hop = Math.abs(S(q));
      set(B.upperArmL, -2.7 + 0.25 * S(q), 0, -0.5); set(B.upperArmR, -2.7 - 0.25 * S(q + 1), 0, 0.5);
      set(B.foreArmL, -0.35, 0, 0); set(B.foreArmR, -0.35, 0, 0);
      set(B.thighL, -0.25 * hop, 0, -0.05); set(B.thighR, -0.25 * hop, 0, 0.05);
      set(B.shinL, 0.45 * hop, 0, 0); set(B.shinR, 0.45 * hop, 0, 0);
      TARGET[B.head].x -= 0.3; TARGET[B.spine].x -= 0.08;
      bob = 0.07 * hop - 0.04;
      gripL = gripR = 0.9;
    } else if (a.action === 'sleep') {
      // Сон на земле, на подстилке: сначала опускается на колени (0–0,5 с), затем ложится (0,5–1,6 с) — на спину
      // (левая кисть на животе, правая на подстилке у бедра, голова набок), на бок «калачиком» (нижняя рука вытянута
      // по подстилке перед лицом, верхняя свисает, кисть на подстилке перед грудью; голова на валике — crew.js кладёт
      // его под щёку) или дремлет сидя; у каждого своя поза; дышит. Лёжа каска снята (helmetOff, у изголовья). Кисти
      // лёжа — ИК к точкам подстилки: без него рука оставалась в отведении покоя (38°) и на боку уходила в землю.
      const hr = w.hipsRest || 0.95;
      const kneel = ss(t, 0, 0.5), lie = ss(t, 0.5, 1.6);
      const kind = w.seed % 4, side = kind === 1 ? 1 : kind === 2 ? -1 : 0;
      const breath = 0.035 * S(time * 1.1 + w.seed);
      if (kind === 3) {
        // дремлет сидя: колени вверх, руки на коленях, голова упала на грудь; голени почти отвесно — стопы на
        // подстилке (прежние 2,0/2,15 уводили ботинки в землю на 12–16 см)
        bob = SIT_DOZE.hips - hr;
        set(B.hips, SIT_DOZE.pelvis, 0, 0);
        set(B.thighL, SIT_DOZE.thigh, 0, -0.2); set(B.thighR, SIT_DOZE.thigh, 0, 0.2);
        set(B.shinL, SIT_DOZE.shin, 0, 0); set(B.shinR, SIT_DOZE.shin, 0, 0);
        set(B.footL, SIT_DOZE.foot, 0, 0); set(B.footR, SIT_DOZE.foot, 0, 0);
        TARGET[B.spine].x += 0.35 - SIT_DOZE.pelvis; TARGET[B.chest].x += 0.18 + breath;
        set(B.head, 0.55, 0.15 * S(time * 0.13 + w.seed), 0.1);
        near(PT.a, w, SIT_DOZE.hand[0], SIT_DOZE.hand[1], SIT_DOZE.hand[2]);
        near(PT.b, w, SIT_DOZE.hand[0], -SIT_DOZE.hand[1], SIT_DOZE.hand[2]);
        reach('L', point(PT.a), null, 0, POLE_LOW.L);
        reach('R', point(PT.b), null, 0, POLE_LOW.R);
        gripL = gripR = 0.4;
      } else if (lie < 1) {
        // на коленях: бёдра почти отвесно, голени на земле, корпус вперёд, руки к земле
        set(B.thighL, -0.25 * kneel, 0, -0.08); set(B.thighR, -0.25 * kneel, 0, 0.08);
        set(B.shinL, 1.8 * kneel, 0, 0); set(B.shinR, 1.8 * kneel, 0, 0);
        set(B.footL, 0.5 * kneel, 0, 0); set(B.footR, 0.5 * kneel, 0, 0);
        TARGET[B.spine].x += 0.35 * kneel;
        set(B.upperArmL, -0.6 * kneel, 0, -0.35); set(B.upperArmR, -0.6 * kneel, 0, 0.35);
        set(B.foreArmL, -0.3, 0, 0); set(B.foreArmR, -0.3, 0, 0);
        bob = (0.5 - hr) * kneel;
      }
      if (kind !== 3 && lie > 0) {
        const L = THREE.MathUtils.lerp;
        const k = lie;
        for (let i = 0; i < TARGET.length; i++) { SAVE[i].set(TARGET[i].x, TARGET[i].y, TARGET[i].z); TARGET[i].set(0, 0, 0); }
        const b0 = bob;
        // кисти из позы на коленях (к земле перед коленями) — к точкам подстилки
        near(PT.c, w, 0.35, 0.16, 0.06); near(PT.d, w, 0.35, -0.16, 0.06);
        if (side === 0) {
          set(B.hips, -Math.PI / 2 + 0.03, 0, 0);
          set(B.thighL, -0.04, 0, -0.06); set(B.thighR, -0.12, 0, 0.08);
          set(B.shinL, 0.06, 0, 0); set(B.shinR, 0.2, 0, 0);
          set(B.footL, 0.5, 0, 0); set(B.footR, 0.45, 0.2, 0);
          TARGET[B.chest].x += breath;
          set(B.head, -0.15, 0.55 * (w.seed % 2 ? 1 : -1), 0);
          bob = L(b0, SLEEP_BACK.hips - hr, k);
          near(PT.a, w, SLEEP_BACK.belly[0], SLEEP_BACK.belly[1], SLEEP_BACK.belly[2] + breath * 0.3);
          near(PT.b, w, SLEEP_BACK.mat[0], SLEEP_BACK.mat[1], SLEEP_BACK.mat[2]);
          reach('L', point(PT.c), point(PT.a), k, POLE_SLEEP.backL);
          reach('R', point(PT.d), point(PT.b), k, POLE_SLEEP.backR);
          styleL = 'flat'; styleR = 'flat';
        } else {
          // на боку (side: 1 — на левом, −1 — на правом): лёгкий «калачик»
          set(B.hips, -Math.PI / 2 + 0.05, side * 1.45, 0);
          set(B.thighL, -0.85, 0, 0); set(B.thighR, -0.65, 0, 0);
          set(B.shinL, 1.1, 0, 0); set(B.shinR, 0.95, 0, 0);
          set(B.footL, 0.35, 0, 0); set(B.footR, 0.35, 0, 0);
          TARGET[B.spine].x += 0.25; TARGET[B.chest].x += 0.12 + breath;
          set(B.head, 0.25, 0, -side * SLEEP_SIDE.headRoll);
          const low = side > 0 ? 'L' : 'R', high = side > 0 ? 'R' : 'L';
          bob = L(b0, SLEEP_SIDE.hips - hr, k);
          near(PT.a, w, SLEEP_SIDE.low[0], SLEEP_SIDE.low[1] * side, SLEEP_SIDE.low[2]);
          near(PT.b, w, SLEEP_SIDE.up[0], SLEEP_SIDE.up[1] * side, SLEEP_SIDE.up[2]);
          reach(low, point(low === 'L' ? PT.c : PT.d), point(PT.a), k, POLE_SLEEP.low);
          reach(high, point(high === 'L' ? PT.c : PT.d), point(PT.b), k, side > 0 ? POLE_SLEEP.upR : POLE_SLEEP.upL);
          styleL = 'flat'; styleR = 'flat';
        }
        if (k < 1) for (let i = 0; i < TARGET.length; i++) { const e = TARGET[i], o = SAVE[i]; e.set(L(o.x, e.x, k), L(o.y, e.y, k), L(o.z, e.z, k)); }
        gripL = gripR = 0.25;
      } else if (kind !== 3) gripL = gripR = 0.4;
      // лёжа — без каски (у изголовья): снимает, когда голова уже почти на валике
      bare = kind !== 3 && lie > 0.85 ? (side || 0) : null;
    }
  }
  // жест поверх действия (правая рука): «Айда курить!» — машет к себе над головой; новый разряд — кулак вверх
  if (a.gesture) {
    a.gestT += dt;
    const u = a.gestT / (a.gestDur || 1.5);
    if (u >= 1) a.gesture = null;
    // на лестнице, на кубе и в прыжке руки заняты, во сне — лежит: жест ждёт (время идёт)
    else if (a.action !== 'sleep' && a.action !== 'climb' && a.action !== 'mantle' && a.action !== 'jump') {
      const g = ss(u, 0, 0.14) * (1 - ss(u, 0.82, 1));
      const q = a.gestT, L = THREE.MathUtils.lerp;
      const mixSet = function (i, x, y, z) { const e = TARGET[i]; e.set(L(e.x, x, g), L(e.y, y, g), L(e.z, z, g)); };
      if (a.gesture === 'call') {
        const wave = S(q * 8.5);
        mixSet(B.upperArmR, -2.5 + 0.1 * wave, 0.25, 0.35 + 0.3 * wave);
        mixSet(B.foreArmR, -0.7 - 0.6 * Math.max(0, wave), 0, 0);
        mixSet(B.handR, -0.35 * wave, 0, 0);
        TARGET[B.head].x -= 0.12 * g;
        TARGET[B.head].y += 0.35 * g;
        if (g > 0.3) { gripR = 0.1; styleR = 'flat'; }
      } else if (a.gesture === 'rank') {
        const pump = Math.abs(S(q * 6.5));
        mixSet(B.upperArmR, -2.35 - 0.45 * pump, 0, 0.3);
        mixSet(B.foreArmR, -1.6 + 1.0 * pump, 0, 0);
        mixSet(B.handR, 0, 0, 0);
        TARGET[B.chest].x -= 0.1 * g;
        TARGET[B.head].x -= 0.22 * g;
        if (g > 0.3) { gripR = 1; styleR = 'fist'; }
      }
      if (g > 0.3) for (let i = IK_REQ.length - 1; i >= 0; i--) if (IK_REQ[i].sd === 'R') IK_REQ.splice(i, 1);
    }
  }
  a.t += dt;
  // плавный переход к цели: корпус и руки без ИК, затем руки по ИК от уже повёрнутой груди; на ×20 (a.snap) — сразу,
  // как поворот у оригинала: логика за кадр уходит на треть секунды, и сглаживание отставало бы (лежит, хотя уже идёт)
  const k = a.snap ? 1 : 1 - Math.exp(-dt * 14);
  let ikL = false, ikR = false;
  for (let i = 0; i < IK_REQ.length; i++) { if (IK_REQ[i].sd === 'L') ikL = true; else ikR = true; }
  for (let i = 1; i < BONES.length; i++) {
    if ((ikL && (i === B.upperArmL || i === B.foreArmL)) || (ikR && (i === B.upperArmR || i === B.foreArmR))) continue;
    _q.setFromEuler(TARGET[i]);
    w.pose[i].slerp(_q, k);
    w.bones[i].quaternion.copy(w.pose[i]);
  }
  // стоя на месте — стопы на земле (plantBob): таз — по нижней точке ботинок; у радости — ещё подскок
  if (!moving && PLANT[a.action]) bob = plantBob(w) + (a.action === 'cheer' ? bob + 0.04 : 0);
  // высота таза: мелкие колебания (шаг, дыхание) — сразу, большие перемены позы (сесть, лечь, встать) — плавно
  if (a.bobS === undefined || a.snap) a.bobS = bob;
  else a.bobS += (bob - a.bobS) * (1 - Math.exp(-dt * (Math.abs(bob - a.bobS) > 0.06 ? 9 : 40)));
  w.bones[B.hips].position.y = (w.hipsRest || BONES[B.hips][2][1]) + a.bobS;
  if (IK_REQ.length) {
    const chest = w.bones[B.chest];
    // правая рука по прямой кинематике уже стоит: от её кисти — точки на рукояти кирки
    if (ikR) chest.updateWorldMatrix(true, false); else w.bones[B.handR].updateWorldMatrix(true, false);
    // точки в осях головы (губы): голова уже в позе
    w.bones[B.head].updateWorldMatrix(true, false);
    HEAD_M.copy(w.bones[B.head].matrixWorld);
    for (let r = 0; r < IK_REQ.length; r++) {
      const q = IK_REQ[r];
      if (q.a.handle !== undefined) {
        _v.set(0, 0, q.a.handle).applyMatrix4(w.toolRest).applyMatrix4(w.bones[B.handR].matrixWorld);
        chest.worldToLocal(_v);
      } else {
        resolve(chest, q.a, _v);
        if (q.b) { resolve(chest, q.b, _v2); _v.lerp(_v2, q.k); }
      }
      armIK(w, q.sd, _v, q.pole);
      [B['upperArm' + q.sd], B['foreArm' + q.sd]].forEach(function (i) {
        _q.setFromEuler(TARGET[i]);
        w.pose[i].slerp(_q, k);
        w.bones[i].quaternion.copy(w.pose[i]);
      });
    }
  }
  // Рама ноши висит на лямках: в наклоне (присед кладки, удар кирки) она поворачивается вокруг верха лямок у плеч
  // меньше груди — низ с полкой подходит к пояснице (жёстко на груди полка уходила на 20 см за таз)
  if (w.stack && w.stack.visible && w.stack.userData.restQ) {
    const st = w.stack, m = w.bones[B.chest].matrixWorld.elements;
    w.bones[B.chest].updateWorldMatrix(true, false);
    const lean = Math.atan2(m[4] * _f.x + m[6] * _f.z, m[5]);
    st.quaternion.copy(st.userData.restQ).multiply(_q.setFromAxisAngle(X_AXIS, -FRAME_LAG * Math.max(0, lean)));
    // верх лямок (ось рамы) — на месте: сдвиг = R0·p − R·p
    st.position.copy(st.userData.restP).add(_v.copy(FRAME_PIVOT).applyQuaternion(st.userData.restQ)).sub(_v2.copy(FRAME_PIVOT).applyQuaternion(st.quaternion));
  }
  // точки событий от инструмента и головы (после позы)
  for (let i = 0; i < w.fx.length; i++) {
    const e = w.fx[i];
    if (e.hammer) {
      // боёк молотка (в осях инструмента у кисти, как кирка)
      w.bones[B.handR].updateWorldMatrix(true, false);
      _v.set(0, -0.245, 0).applyMatrix4(w.toolRest).applyMatrix4(w.bones[B.handR].matrixWorld);
      e.x = _v.x; e.y = _v.y; e.z = _v.z; e.hammer = false;
    } else if (e.pick) {
      w.bones[B.handR].updateWorldMatrix(true, false);
      _v.copy(w.tools.pickaxe.userData.head).setY(-0.22).applyMatrix4(w.toolRest).applyMatrix4(w.bones[B.handR].matrixWorld);
      e.x = _v.x; e.y = Math.max(w.pos.y + 0.03, _v.y); e.z = _v.z; e.pick = false;
    } else if (e.mouth) {
      // клуб выдоха — из губ, чуть впереди
      w.bones[B.head].updateWorldMatrix(true, false);
      _v.copy(LIPS).add(PT.d.set(0, -0.005, 0.03)).applyMatrix4(w.bones[B.head].matrixWorld);
      e.x = _v.x; e.y = _v.y; e.z = _v.z; e.mouth = false; e.dx = _f.x; e.dz = _f.z;
    } else if (e.ember) {
      // струйка встаёт с кончика почти отвесно
      w.tools.cigarette.userData.ember.updateWorldMatrix(true, false);
      w.tools.cigarette.userData.ember.getWorldPosition(_v);
      e.x = _v.x; e.y = _v.y + 0.01; e.z = _v.z; e.ember = false; e.dx = 0; e.dz = 0;
    }
  }
  // инструмент в руке — по действию; при смене действия прежний ещё 0,2 с в руке, пока рука выходит из позы
  const T = w.tools, LT = w.leftTools, was = a.t < 0.2 ? a.from : null;
  const doing = function (x, y) { return a.action === x || was === x || (!!y && (a.action === y || was === y)); };
  T.hammer.visible = doing('hammer') || (doing('work-high') && !a.hiPlace);
  T.trowel.visible = doing('lay');
  T.drill.visible = doing('screw');
  T.pickaxe.visible = doing('pick');
  T.cigarette.visible = doing('smoke');
  T.sandwich.visible = doing('eat');
  LT.lunchbox.visible = doing('eat');
  if (a.hold && LT.block.geometry !== a.hold.geometry) { LT.block.geometry = a.hold.geometry; LT.block.material = a.hold.material; }
  LT.block.visible = holdBlock && !!a.hold;
  if (T.cigarette.visible) T.cigarette.userData.ember.material.emissiveIntensity = 1.2 + 7 * ember;
  // каска: лёжа снята (bare — бок, на котором лежит), иначе на голове
  if (w.helmetOff) w.helmetOff(bare !== null, bare || 0);
  // хват пальцев — плавно
  const kg = a.snap ? 1 : 1 - Math.exp(-dt * 10);
  a.gripL += (gripL - a.gripL) * kg;
  a.gripR += (gripR - a.gripR) * kg;
  if (w.human) { w.human.grip(a.gripL, styleL, a.gripR, styleR); w.human.retarget(); w.human.blink(dt); }
  // Затяжка: фильтр — в губы, сигарета идёт из щепоти к губам (поворачивается в пальцах); кисть — перед ртом чуть
  // ниже, а не кулак у носа (жёсткая сигарета в щепоти требовала кисть у самого лица)
  const cig = T.cigarette;
  if (w.human && w.human.lips && cig.visible && cig.userData.restPos) {
    cig.position.copy(cig.userData.restPos); cig.quaternion.copy(cig.userData.restQuat);
    const k = a.action === 'smoke' ? a.drag || 0 : 0;
    if (k > 0.001) {
      const par = cig.parent, L = w.human.lips;
      par.updateWorldMatrix(true, false);
      L.bone.updateWorldMatrix(true, false);
      cig.updateMatrix();
      _m4.multiplyMatrices(par.matrixWorld, cig.matrix);
      // щепоть — 4,5 см от фильтра по сигарете в покое кисти
      _v.set(0, 0, 0.045).applyMatrix4(_m4);
      _v2.copy(L.p).applyMatrix4(L.bone.matrixWorld);
      const dist = _v.distanceTo(_v2);
      PT.e.subVectors(_v, _v2).normalize();
      // фильтр у губ (чуть впереди), ось — к щепоти; если кисть далеко — фильтр у губ лишь отчасти
      _v2.addScaledVector(PT.e, 0.004 + Math.max(0, dist - 0.06));
      _q.setFromUnitVectors(Z_AXIS, PT.e);
      par.matrixWorld.decompose(PT.d, _q2, PT.c);
      _q2.invert();
      cig.quaternion.slerp(_q.premultiply(_q2), k);
      cig.position.lerp(par.worldToLocal(_v2), k);
    }
  }
}

const HEAD_M = new THREE.Matrix4();

// Стопы на земле: в позах стоя на месте таз опускается или поднимается так, чтобы нижняя точка ботинок (пятка или
// носок — точки в осях кости стопы) была там же, где в покое: присед кладки, удар кирки, стойка у стола, перекур.
// Прежние подобранные проседания таза уводили носки в землю на 3–15 см или поднимали над ней (cwf-tmp/cycle.mjs).
const PLANT = { idle: 1, lay: 1, pick: 1, hammer: 1, screw: 1, tie: 1, plan: 1, smoke: 1, cheer: 1 };
const FOOT_PTS = [new THREE.Vector3(0, -0.09, -0.06), new THREE.Vector3(0, -0.09, 0.15)];
const LEGS = [[B.thighL, B.shinL, B.footL], [B.thighR, B.shinR, B.footR]];
const _pm = new THREE.Matrix4(), _pm2 = new THREE.Matrix4(), _pv = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _q1 = new THREE.Quaternion();
// нижняя точка стоп относительно сустава таза (в осях фигуры); rest — в позе покоя
function lowestFoot(w, rest) {
  let lo = Infinity;
  for (let l = 0; l < 2; l++) {
    _pm.makeRotationFromQuaternion(rest ? _q1 : w.bones[B.hips].quaternion);
    for (let j = 0; j < 3; j++) {
      const b = w.bones[LEGS[l][j]];
      _pm.multiply(_pm2.compose(b.position, rest ? _q1 : b.quaternion, _one));
    }
    for (let k = 0; k < FOOT_PTS.length; k++) lo = Math.min(lo, _pv.copy(FOOT_PTS[k]).applyMatrix4(_pm).y);
  }
  return lo;
}
// проседание таза (от покоя), при котором стопы стоят, как в покое
function plantBob(w) {
  if (w.footRest === undefined) w.footRest = lowestFoot(w, true);
  return w.footRest - lowestFoot(w, false);
}
function resolve(chest, pt, out) {
  out.copy(pt.p);
  if (pt.local === 'head') chest.worldToLocal(out.applyMatrix4(HEAD_M));
  else if (!pt.local) chest.worldToLocal(out);
  return out;
}
