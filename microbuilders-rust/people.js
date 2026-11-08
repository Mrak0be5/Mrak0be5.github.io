// Рабочие кодом. Тело — гладкое поле расстояний из эллипсоидов и конусов (торс, голова с носом, ушами и
// бровями, руки в перчатках, ноги в ботинках), сетка — marching cubes (таблицы из three/examples), нормали —
// градиент поля. Скелет из 20 костей, веса кожи — по близости к примитивам своей кости (мягкие суставы).
// Одежда — область вершины (куртка, светоотражающий жилет с лентами, ремень, брюки, перчатки, ботинки,
// волосы, глаза, губы): цвет и шероховатость задаёт материал рабочего, сетка общая. Каска, инструмент и ноша —
// отдельные меши на костях. Движения процедурные: ходьба с маховыми руками, перенос, удары молотком, укладка,
// подъём по лестнице, отдых.
import * as THREE from 'three';
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './geo.js?v=f4726a0';
import { linkSky } from './world.js?v=f4726a0';
import { markDynamic } from './render.js?v=f4726a0';
import { loadHumans, makeHuman } from './humans.js?v=f4726a0';

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

export function workerLook(seed) {
  const r = rng(seed);
  const pick = function (a) { return a[Math.floor(r() * a.length)]; };
  const skin = pick(SKINS);
  const skinC = new THREE.Color(skin);
  const beard = r() < 0.5 ? skinC.clone().multiplyScalar(0.72).getHex() : skin;
  const colors = [skin, pick(JACKETS), pick(VESTS), 0xd9dcd6, pick(PANTS), 0x2a1f16, pick(GLOVES), 0x4a3424, 0x151515, pick(HAIR), 0x1a120d, 0xd8d0c4, 0x9a5c50, 0x2a1e16, beard];
  const rough = [0.55, 0.86, 0.72, 0.34, 0.86, 0.62, 0.78, 0.6, 0.9, 0.8, 0.3, 0.3, 0.45, 0.8, 0.62];
  const face = r() < 0.3 ? 2 : r() < 0.5 ? 1 : 0;
  if (face === 2) colors[14] = skinC.clone().multiplyScalar(0.45).lerp(new THREE.Color(colors[9]), 0.6).getHex();
  return { colors, rough, helmet: pick(HELMETS), build: r() < 0.65 ? 0 : 1, face, eyes: Math.floor(r() * EYE_COLORS.length) };
}

// ---------- каска, инструмент, ноша ----------

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
  SHARED.helmet = hg[0];
  SHARED.ridge = hg[1];
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
  const strapGeo = white(new THREE.BoxGeometry(0.035, 0.42, 0.012));
  [-0.09, 0.09].forEach(function (x) {
    const strap = new THREE.Mesh(strapGeo, mats.rubber);
    strap.position.set(x, 0.12, 0.05);
    g.add(strap);
  });
  const box = new THREE.BoxGeometry(0.19, 0.19, 0.19);
  const blocks = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.85 }));
    m.position.set(i % 2 ? 0.07 : -0.07, -0.07 + Math.floor(i / 2) * 0.195, -0.11);
    m.rotation.y = (i % 3 - 1) * 0.06;
    m.castShadow = true;
    blocks.push(m);
    g.add(m);
  }
  g.userData.blocks = blocks;
  g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- рабочий ----------

const _q = new THREE.Quaternion(), _e = new THREE.Euler();

// Рабочие — модели MakeHuman (humans.js), если файлы загрузились; иначе — прежние тела из поля расстояний.
export function createWorkerFactory(quality) {
  let humans = null, legacy = null;
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
  function create(seed, mats) {
    const look = workerLook(seed);
    look.iris = EYE_COLORS[look.eyes];
    // ведущий скелет: суставы — из модели MakeHuman (meta.json) или из таблицы BONES
    const keys = humans ? Object.keys(humans.variants) : [];
    const variant = humans ? (look.build === 1 && humans.variants.b ? 'b' : keys[(seed * 7 + 3) % keys.length] === 'b' ? 'a' : keys[(seed * 7 + 3) % keys.length]) : null;
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
      human = makeHuman({ variants: { [variant]: humans.variants[variant] }, map: humans.map, fingers: humans.fingers }, look, seed, bones, NAMES);
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
      const head = new THREE.Mesh(L.heads[look.face], bodyMat);
      head.castShadow = true; head.receiveShadow = true;
      const eye = new THREE.Mesh(L.eyes[look.eyes], L.eyeMat);
      bones[B.head].add(head, eye);
    }
    const S = shared();
    const hm = new THREE.MeshStandardMaterial({ color: look.helmet, roughness: 0.32, metalness: 0.0, side: THREE.DoubleSide });
    linkSky(hm);
    const helmet = new THREE.Group();
    helmet.add(new THREE.Mesh(S.helmet, hm), new THREE.Mesh(S.ridge, hm));
    // каска — на макушке модели (верх каски на 2 см выше головы)
    helmet.position.set(0, human ? human.head + 0.008 - 0.125 - at(B.head)[1] : 0.104, human ? 0.002 : -0.008);
    helmet.rotation.x = -0.08;
    helmet.children.forEach(function (c) { c.castShadow = true; });
    bones[B.head].add(helmet);
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
    if (human) {
      // каска и инструмент — на костях самой модели: позвоночник MakeHuman гнётся ещё и в spine_01, и при наклоне
      // голова и кисть уходят от ведущих костей на 2–3 см (лоб проступал сквозь каску). В позе покоя скелеты
      // совпадают, attach сохраняет положение.
      const mhBone = function (k) { let found = null; human.scene.traverse(function (o) { if (!found && o.isBone && o.name === humans.map[k]) found = o; }); return found; };
      const mhHead = mhBone('head'), mhHand = mhBone('handR'), mhHandL = mhBone('handL');
      group.updateMatrixWorld(true);
      if (mhHead) mhHead.attach(helmet);
      if (mhHand) Object.values(tools).forEach(function (t) { mhHand.attach(t); });
      if (mhHandL) Object.values(leftTools).forEach(function (t) { mhHandL.attach(t); });
    }
    // ноша висит на груди: у MakeHuman грудной сустав на 10 см ниже и на 5 см дальше прежнего — сдвиг возвращает
    // ношу на место относительно тела; руки для ноши на плече — ИК от суставов модели (armIK)
    const c0 = at(B.chest), c1 = BONES[B.chest][2];
    const restArm = function (sd) {
      const v = function (i) { const q = at(B[i + sd]); return new THREE.Vector3(q[0] - c0[0], q[1] - c0[1], q[2] - c0[2]); };
      const sh = v('upperArm'), el = v('foreArm'), wr = v('hand');
      const d = el.clone().sub(sh).normalize();
      const z = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize();
      return { sh, L1: el.distanceTo(sh), L2: wr.distanceTo(el), d, h: d.clone().cross(z), z };
    };
    const worker = {
      group, mesh, bones, look, tools, leftTools, toolRest, human, hipsRest: at(B.hips)[1], seed, fx: [],
      chestShift: new THREE.Vector3(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]), armRest: { R: restArm('R'), L: restArm('L') },
      anim: { phase: 0, speed: 0, action: 'idle', t: 0, climb: 0, bend: 0, stage: 0, target: null, hold: null, load: 0, over: 1, gripL: 0.25, gripR: 0.25, prev: 0 },
      pose: BONES.map(function () { return new THREE.Quaternion(); }),
      // Ноша оригинала: стопка блоков материала на заплечной раме (до 6 штук по долям ноши, game.js →
      // paintCarryStack). looks — блоки снизу вверх: { geometry, material } (crew.js), key — их состав;
      // пустой список — рама без ноши.
      setStack: function (looks, key) {
        if (worker.stackKey === key) return;
        worker.stackKey = key;
        if (!worker.stack) {
          worker.stack = stackRig(mats);
          // за спиной: от грудного сустава назад и чуть ниже
          worker.stack.position.set(0, -0.08, -0.2).add(worker.chestShift);
          bones[B.chest].add(worker.stack);
        }
        const blocks = worker.stack.userData.blocks;
        for (let i = 0; i < blocks.length; i++) {
          blocks[i].visible = i < looks.length;
          if (i < looks.length) { blocks[i].geometry = looks[i].geometry; blocks[i].material = looks[i].material; }
        }
        worker.stack.visible = true;
      },
    };
    return worker;
  }
  return { create, ready };
}

// ---------- движения ----------
// Поза собирается слоями: ходьба или стойка, действие на месте (циклы по фазе логики), затем ИК рук к точкам
// в мире — верх растущей кладки, столешница, рот, рукоять кирки. Пальцы — хват (humans.js → grip). Удары кирки,
// постукивание мастерком, выдох дыма — события w.fx для эффектов (life.js).

const TARGET = BONES.map(function () { return new THREE.Euler(); });
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
function point(p, local) { return { p: p, local: !!local }; }
function reach(sd, a, b, k, pole) { IK_REQ.push({ sd: sd, a: a, b: b || null, k: k || 0, pole: pole || POLE[sd] }); }
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _f = new THREE.Vector3(), _l = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
// вспомогательные точки (по одной на роль, без выделений в кадре)
const PT = {}; ['a', 'b', 'c', 'd', 'e'].forEach(function (k) { PT[k] = new THREE.Vector3(); });
// точка у фигуры: вперёд, влево, вверх от стоп (м)
function near(out, w, fwd, left, up) { return out.copy(w.pos).addScaledVector(_f, fwd).addScaledVector(_l, left).setY(w.pos.y + up); }
// точка от цели в мире: вдоль ряда (влево), к фигуре, вверх
function along(out, base, left, back, up) { return out.copy(base).addScaledVector(_l, left).addScaledVector(_f, -back).setY(base.y + up); }
// рот и место у пояса — в осях груди
const MOUTH = new THREE.Vector3(-0.05, 0.3, 0.22), BELLY = new THREE.Vector3(-0.1, -0.2, 0.2), FRAME = new THREE.Vector3(0.13, 0.2, -0.14);

// событие эффекта в очередь фигуры; pick и mouth — точку дадут кирка и голова после позы
function fx(w, type, p, extra) {
  if (w.fx.length >= 24) return;
  w.fx.push(Object.assign({ type: type, x: p.x || 0, y: p.y || 0, z: p.z || 0, pick: !!p.pick, mouth: !!p.mouth }, extra || null));
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
  let bob = 0, gripL = 0.25, gripR = 0.25, styleL = 'fist', styleR = 'fist', holdBlock = false, ember = 0;
  const h = w.heading || 0;
  _f.set(S(h), 0, C(h));
  _l.set(C(h), 0, -S(h));
  const load = a.load || 0;
  const moving = a.speed > 0.05;
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
    TARGET[B.spine].x += 0.16 * run + 0.08 * load + 0.12 * Math.max(0, Math.min(1, (a.over || 1) - 1));
    // голова держит горизонт: гасит качку корпуса
    TARGET[B.head].x -= 0.06 * run;
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
    if (a.action === 'idle') {
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
      bob = -0.05 - 0.12 * hit;
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
        // ступени — через 0,3 м от низа каждой клетки лесов (scaffold.js), 1..6
        const rung = function (hh, odd) {
          const base = Math.floor(hh / 2) * 2;
          let n = Math.round((hh - base) / 0.3);
          if ((n & 1) !== (odd ? 1 : 0)) n += 1;
          return base + Math.max(1, Math.min(6, n)) * 0.3;
        };
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
      const sw = (S(t * 8.0) * 0.5 + 0.5);
      // правая рука с молотком работает над головой, левая упирается в стену на уровне плеча
      set(B.upperArmR, -2.3 - sw * 0.35, 0.1, 0.25);
      set(B.foreArmR, -0.5 - sw * 0.8, 0, 0);
      set(B.upperArmL, -1.45, -0.15, -0.35);
      set(B.foreArmL, -0.75, 0, 0);
      TARGET[B.head].x -= 0.3;
      gripR = 1; gripL = 0.12; styleL = 'flat';
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
      reach('R', point(BELLY, true), point(MOUTH, true), up, POLE_SMOKE);
      set(B.handR, -0.75 * up, 0.25 * up, 0);
      gripL = 0.85; gripR = 0.7; styleR = 'pinch';
      ember = bump(c, 0.18, 0.34);
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
      near(PT.a, w, 0.36, 0.06, 0.6);
      reach('L', point(PT.a), null, 0, POLE_LOW.L);
      near(PT.b, w, 0.36, -0.1, 0.66);
      reach('R', point(PT.b), point(MOUTH, true), bite, POLE_SMOKE);
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
      // Сон на земле: лежит на спине на подстилке, голова набок, руки на животе, дышит.
      set(B.hips, -Math.PI / 2 + 0.03, 0, 0);
      bob = 0.12 - (w.hipsRest || 0.95);
      set(B.thighL, -0.04, 0, -0.06); set(B.thighR, -0.12, 0, 0.08);
      set(B.shinL, 0.06, 0, 0); set(B.shinR, 0.2, 0, 0);
      set(B.footL, 0.5, 0, 0); set(B.footR, 0.45, 0.2, 0);
      TARGET[B.chest].x += 0.035 * S(time * 1.1);
      set(B.head, -0.15, 0.55, 0);
      set(B.upperArmL, 0.08, 0, -0.42); set(B.foreArmL, -0.2, 0, 0);
      set(B.upperArmR, 0.05, 0, 0.36); set(B.foreArmR, -0.35, 0, 0);
      gripL = gripR = 0.4;
    }
  }
  a.t += dt;
  // плавный переход к цели: корпус и руки без ИК, затем руки по ИК от уже повёрнутой груди
  const k = 1 - Math.exp(-dt * 14);
  let ikL = false, ikR = false;
  for (let i = 0; i < IK_REQ.length; i++) { if (IK_REQ[i].sd === 'L') ikL = true; else ikR = true; }
  for (let i = 1; i < BONES.length; i++) {
    if ((ikL && (i === B.upperArmL || i === B.foreArmL)) || (ikR && (i === B.upperArmR || i === B.foreArmR))) continue;
    _q.setFromEuler(TARGET[i]);
    w.pose[i].slerp(_q, k);
    w.bones[i].quaternion.copy(w.pose[i]);
  }
  w.bones[B.hips].position.y = (w.hipsRest || BONES[B.hips][2][1]) + bob;
  if (IK_REQ.length) {
    const chest = w.bones[B.chest];
    // правая рука по прямой кинематике уже стоит: от её кисти — точки на рукояти кирки
    if (ikR) chest.updateWorldMatrix(true, false); else w.bones[B.handR].updateWorldMatrix(true, false);
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
  // точки событий от инструмента и головы (после позы)
  for (let i = 0; i < w.fx.length; i++) {
    const e = w.fx[i];
    if (e.pick) {
      w.bones[B.handR].updateWorldMatrix(true, false);
      _v.copy(w.tools.pickaxe.userData.head).setY(-0.22).applyMatrix4(w.toolRest).applyMatrix4(w.bones[B.handR].matrixWorld);
      e.x = _v.x; e.y = Math.max(w.pos.y + 0.03, _v.y); e.z = _v.z; e.pick = false;
    } else if (e.mouth) {
      w.bones[B.chest].updateWorldMatrix(true, false);
      _v.copy(MOUTH).add(PT.d.set(0, -0.02, 0.06)).applyMatrix4(w.bones[B.chest].matrixWorld);
      e.x = _v.x; e.y = _v.y; e.z = _v.z; e.mouth = false; e.dx = _f.x; e.dz = _f.z;
    }
  }
  // инструмент в руке — по действию; при смене действия прежний ещё 0,2 с в руке, пока рука выходит из позы
  const T = w.tools, LT = w.leftTools, was = a.t < 0.2 ? a.from : null;
  const doing = function (x, y) { return a.action === x || was === x || (!!y && (a.action === y || was === y)); };
  T.hammer.visible = doing('hammer', 'work-high');
  T.trowel.visible = doing('lay');
  T.drill.visible = doing('screw');
  T.pickaxe.visible = doing('pick');
  T.cigarette.visible = doing('smoke');
  T.sandwich.visible = doing('eat');
  LT.lunchbox.visible = doing('eat');
  if (a.hold && LT.block.geometry !== a.hold.geometry) { LT.block.geometry = a.hold.geometry; LT.block.material = a.hold.material; }
  LT.block.visible = holdBlock && !!a.hold;
  if (T.cigarette.visible) T.cigarette.userData.ember.material.emissiveIntensity = 1.2 + 7 * ember;
  // хват пальцев — плавно
  const kg = 1 - Math.exp(-dt * 10);
  a.gripL += (gripL - a.gripL) * kg;
  a.gripR += (gripR - a.gripR) * kg;
  if (w.human) { w.human.grip(a.gripL, styleL, a.gripR, styleR); w.human.retarget(); w.human.blink(dt); }
}

function resolve(chest, pt, out) {
  out.copy(pt.p);
  if (!pt.local) chest.worldToLocal(out);
  return out;
}
