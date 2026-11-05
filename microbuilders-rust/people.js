// Рабочие кодом. Тело — гладкое поле расстояний из эллипсоидов и конусов (торс, голова с носом, ушами и
// бровями, руки в перчатках, ноги в ботинках), сетка — marching cubes (таблицы из three/examples), нормали —
// градиент поля. Скелет из 20 костей, веса кожи — по близости к примитивам своей кости (мягкие суставы).
// Одежда — область вершины (куртка, светоотражающий жилет с лентами, ремень, брюки, перчатки, ботинки,
// волосы, глаза, губы): цвет и шероховатость задаёт материал рабочего, сетка общая. Каска, инструмент и ноша —
// отдельные меши на костях. Движения процедурные: ходьба с маховыми руками, перенос, удары молотком, укладка,
// подъём по лестнице, отдых.
import * as THREE from 'three';
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';
import { rng, plank, stone as stonePrim, corrugated, cylinder } from './geo.js?v=3ae8fc6';
import { TEXTURE_TILES as TILE } from './textures.js?v=3ae8fc6';

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
  TORSO.add(ell(B.chest, R.jacket, 0.05, [0, 1.29, 0.012], [0.178 * W, 0.15, 0.118 * W]));
  TORSO.add(cone(B.chest, R.jacket, 0.04, [-0.155 * W, 1.415, -0.004], [0.155 * W, 1.415, -0.004], 0.068, 0.068));
  TORSO.add(ell(B.chest, R.jacket, 0.04, [0, 1.33, -0.03], [0.16 * W, 0.12, 0.09]));
  cone(B.neck, R.skin, 0.03, [0, 1.43, -0.005], [0, 1.585, 0.012], 0.054, 0.052);
  ell(B.head, R.skin, 0.03, [0, 1.672, 0.012], [0.079, 0.102, 0.095]);
  ell(B.head, R.skin, 0.03, [0, 1.612, 0.034], [0.063, 0.05, 0.07]);
  ell(B.head, R.skin, 0.02, [0, 1.585, 0.06], [0.032, 0.025, 0.03]);
  cone(B.head, R.skin, 0.012, [0, 1.668, 0.092], [0, 1.638, 0.112], 0.0125, 0.012);
  [1, -1].forEach(function (s) {
    ell(B.head, R.skin, 0.008, [s * 0.079, 1.66, 0.002], [0.011, 0.027, 0.017]);
    ell(B.head, R.skin, 0.02, [s * 0.04, 1.64, 0.07], [0.03, 0.025, 0.025]);
  });
  ell(B.head, R.skin, 0.02, [0, 1.701, 0.072], [0.062, 0.016, 0.024]);
  ['L', 'R'].forEach(function (side) {
    const s = side === 'L' ? 1 : -1;
    const a = ARM[side], d = a.d;
    const up = B['upperArm' + side], fo = B['foreArm' + side], ha = B['hand' + side];
    ell(up, R.jacket, 0.035, [s * 0.18 * W, 1.425, -0.004], [0.068 * W, 0.072, 0.066]);
    cone(up, R.jacket, 0.02, a.sh, a.el, 0.056 * W, 0.046);
    ell(fo, R.jacket, 0.015, a.el, [0.047, 0.047, 0.047]);
    cone(fo, R.jacket, 0.02, a.el, a.wr, 0.047, 0.036);
    const k1 = [a.wr[0] + d[0] * 0.1, a.wr[1] + d[1] * 0.1, a.wr[2]];
    const k2 = [a.wr[0] + d[0] * 0.18, a.wr[1] + d[1] * 0.18, a.wr[2]];
    cone(ha, R.glove, 0.015, a.wr, k1, 0.037, 0.033);
    cone(ha, R.glove, 0.012, [a.wr[0] + d[0] * 0.09, a.wr[1] + d[1] * 0.09, a.wr[2]], k2, 0.029, 0.021);
    cone(ha, R.glove, 0.01, [a.wr[0] + d[0] * 0.035, a.wr[1] + d[1] * 0.035, a.wr[2] + 0.022], [a.wr[0] + d[0] * 0.08, a.wr[1] + d[1] * 0.08, a.wr[2] + 0.052], 0.016, 0.013);
    const l = LEG[side];
    const th = B['thigh' + side], sh = B['shin' + side], ft = B['foot' + side];
    cone(th, R.pants, 0.04, l.hip, l.knee, 0.092 * W, 0.06);
    ell(sh, R.pants, 0.02, l.knee, [0.056, 0.06, 0.058]);
    cone(sh, R.pants, 0.02, l.knee, l.ankle, 0.058, 0.045);
    ell(sh, R.pants, 0.03, [s * 0.108, 0.34, -0.028], [0.052, 0.11, 0.052]);
    cone(ft, R.boot, 0.02, [s * 0.112, 0.21, -0.012], [s * 0.112, 0.06, -0.01], 0.057, 0.06);
    cone(ft, R.boot, 0.03, [s * 0.112, 0.055, -0.07], [s * 0.112, 0.05, 0.165], 0.054, 0.047);
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
  // marching cubes с общими вершинами по рёбрам
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
  // согласовать обход треугольников с нормалью поля
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * nrm[a * 3] + cy * nrm[a * 3 + 1] + cz * nrm[a * 3 + 2] < 0) { index[t + 1] = c; index[t + 2] = b; }
  }
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

// ---------- материал рабочего ----------

const BODY_VERT_HEAD = /* glsl */ `
attribute float aReg;
attribute vec3 aRest;
uniform vec3 uColors[15];
uniform float uRough[15];
varying vec3 vRegColor;
varying float vRegRough;
varying vec3 vRest;
varying float vCloth;
varying float vTape;
`;
const BODY_VERT = /* glsl */ `
{
  int ri = int(aReg + 0.5);
  vRegColor = uColors[ri];
  vRegRough = uRough[ri];
  vRest = aRest;
  vCloth = (ri == 1 || ri == 2 || ri == 4) ? 1.0 : 0.0;
  vTape = ri == 3 ? 1.0 : 0.0;
}
`;
const BODY_FRAG_HEAD = /* glsl */ `
varying vec3 vRegColor;
varying float vRegRough;
varying vec3 vRest;
varying float vCloth;
varying float vTape;
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
  m.customProgramCacheKey = function () { return 'worker1'; };
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
  return { colors, rough, helmet: pick(HELMETS), build: r() < 0.65 ? 0 : 1 };
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
  const ridge = new THREE.CapsuleGeometry(0.013, 0.14, 4, 8);
  ridge.rotateX(Math.PI / 2);
  ridge.translate(0, 0.118, 0.0);
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

// Ноша на плече или в руках: доски, жерди, листы, плиты (материалы деталей).
export function carryObject(kind, count, mats) {
  const g = new THREE.Group();
  const add = function (prim, mat, m) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(prim.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(prim.nrm, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(prim.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(prim.pos.length).fill(1), 3));
    geo.setIndex(new THREE.BufferAttribute(prim.index instanceof Uint32Array || prim.index instanceof Uint16Array ? prim.index : new Uint32Array(prim.index), 1));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.applyMatrix4(m);
    mesh.castShadow = true;
    g.add(mesh);
  };
  const r = rng(count * 31 + kind.length);
  if (kind === 'planks') {
    for (let i = 0; i < Math.max(1, Math.min(4, count)); i++) add(plank(2.6, 0.18, 0.025, Math.floor(r() * 8), r() * 0.1), mats.planks, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(0, i * 0.027, 0));
  } else if (kind === 'sticks') {
    for (let i = 0; i < Math.max(2, Math.min(5, count + 1)); i++) {
      const p = cylinder(0.032, 0.026, 2.4, 7, true, TILE.bark);
      add(p, mats.bark, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition((i % 3 - 1) * 0.05, Math.floor(i / 3) * 0.05, -1.2));
    }
  } else if (kind === 'sheets') {
    const p = corrugated(0.8, 2.2, TILE.zinc, 0.076, 0.009, 0);
    add(p, mats.zinc, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(0, -1.1, 0.4));
  } else if (kind === 'plates') {
    const p = plank(0.9, 0.9, 0.03, 0, 0);
    add(p, mats.steelplate, new THREE.Matrix4());
  } else if (kind === 'stones') {
    for (let i = 0; i < Math.max(1, Math.min(6, count)); i++) {
      const s = stonePrim(0.24 + r() * 0.08, 0.13, 0.17, Math.floor(r() * 24), TILE.stone, r(), r());
      add(s, mats.stone, new THREE.Matrix4().makeRotationY((r() - 0.5) * 0.6).setPosition((i % 2 - 0.5) * 0.2, Math.floor(i / 4) * 0.13, ((Math.floor(i / 2) % 2) - 0.5) * 0.24));
    }
  } else if (kind === 'box') {
    add(plank(0.9, 1.2, 0.06, 2, 0), mats.planks, new THREE.Matrix4());
  }
  return g;
}

// Ноша одного вида и числа — общая на всех рабочих: геометрия создаётся один раз.
const CARRY_CACHE = new Map();
function cachedCarry(kind, count, mats) {
  const key = kind + ':' + Math.min(6, count);
  let proto = CARRY_CACHE.get(key);
  if (!proto) { proto = carryObject(kind, count, mats); CARRY_CACHE.set(key, proto); }
  return proto.clone();
}

// Тачка: корыто из листа, колесо, ручки; камни кладутся внутрь.
export function wheelbarrow(mats) {
  const S = shared();
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x2f5e2c, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide });
  // корыто: дно и четыре наклонных борта (передний пологий — к колесу)
  const tub = new THREE.Group();
  const plate = function (w, d, x, y, z, rx, rz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), paint);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    tub.add(m);
  };
  plate(0.46, 0.5, 0, 0, 0, 0, 0);
  plate(0.46, 0.42, 0, 0.161, 0.385, -0.87, 0);
  plate(0.46, 0.3, 0, 0.136, -0.313, 1.13, 0);
  plate(0.3, 0.6, 0.305, 0.13, 0.03, 0, 1.05);
  plate(0.3, 0.6, -0.305, 0.13, 0.03, 0, -1.05);
  tub.position.set(0, 0.42, 0.32);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 20), S.black);
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(0, 0.2, 0.8);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 12), S.steel);
  hub.rotation.z = Math.PI / 2;
  hub.position.copy(wheel.position);
  g.add(tub, wheel, hub);
  [-1, 1].forEach(function (s) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 1.5, 8), S.steel);
    h.rotation.x = Math.PI / 2 - 0.2;
    h.position.set(s * 0.25, 0.44, 0.08);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 8), S.black);
    grip.rotation.x = Math.PI / 2 - 0.2;
    grip.position.set(s * 0.25, 0.3, -0.6);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6), S.steel);
    leg.position.set(s * 0.2, 0.2, 0.12);
    g.add(h, grip, leg);
  });
  const load = new THREE.Group();
  load.position.set(0, 0.5, 0.32);
  g.add(load);
  g.userData.load = load;
  g.userData.wheel = wheel;
  g.traverse(function (o) { o.castShadow = true; o.receiveShadow = true; });
  return g;
}

// ---------- рабочий ----------

const _q = new THREE.Quaternion(), _e = new THREE.Euler();

export function createWorkerFactory(quality) {
  const bodies = [buildBody({ width: 1.0, belly: 0.1 }, quality.bodyCell), buildBody({ width: 1.08, belly: 0.7 }, quality.bodyCell)];
  function create(seed, mats) {
    const look = workerLook(seed);
    const root = new THREE.Bone();
    const bones = [root];
    BONES.forEach(function (b, i) {
      if (i === 0) return;
      const bone = new THREE.Bone();
      bone.name = b[0];
      const p = BONES[b[1]][2];
      bone.position.set(b[2][0] - p[0], b[2][1] - p[1], b[2][2] - p[2]);
      bones[b[1]].add(bone);
      bones.push(bone);
    });
    root.name = 'root';
    const mesh = new THREE.SkinnedMesh(bodies[look.build], workerMaterial(look));
    mesh.add(root);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const group = new THREE.Group();
    group.add(mesh);
    const S = shared();
    const hm = new THREE.MeshStandardMaterial({ color: look.helmet, roughness: 0.32, metalness: 0.0, side: THREE.DoubleSide });
    const helmet = new THREE.Group();
    helmet.add(new THREE.Mesh(S.helmet, hm), new THREE.Mesh(S.ridge, hm));
    helmet.position.set(0, 0.104, -0.008);
    helmet.rotation.x = -0.08;
    helmet.children.forEach(function (c) { c.castShadow = true; });
    bones[B.head].add(helmet);
    const tools = { hammer: tool('hammer'), trowel: tool('trowel'), drill: tool('drill') };
    Object.values(tools).forEach(function (t) {
      // в правой руке: рукоять по оси кисти
      t.position.set(-0.07 * SA, -0.07 * CA, 0.03);
      t.rotation.set(0, 0, -A);
      t.visible = false;
      bones[B.handR].add(t);
    });
    const worker = {
      group, mesh, bones, look, tools,
      carry: null, carryKind: null, carryCount: 0, barrow: null,
      anim: { phase: 0, speed: 0, action: 'idle', t: 0, climb: 0, bend: 0 },
      pose: BONES.map(function () { return new THREE.Quaternion(); }),
      setCarry: function (kind, count) {
        if (worker.carry) { worker.carry.parent && worker.carry.parent.remove(worker.carry); worker.carry = null; }
        worker.carryKind = kind; worker.carryCount = count;
        if (!kind) { if (worker.barrow && worker.barrow.parent) worker.barrow.parent.remove(worker.barrow); return; }
        if (kind === 'stones') {
          if (!worker.barrow) { worker.barrow = wheelbarrow(mats); }
          group.add(worker.barrow);
          const load = worker.barrow.userData.load;
          while (load.children.length) load.remove(load.children[0]);
          load.add(cachedCarry('stones', count, mats));
          worker.carry = null;
          return;
        }
        if (worker.barrow && worker.barrow.parent) worker.barrow.parent.remove(worker.barrow);
        const obj = cachedCarry(kind, count, mats);
        if (kind === 'planks' || kind === 'sticks') {
          obj.position.set(-0.17, 0.14, 0.05);
          bones[B.chest].add(obj);
        } else if (kind === 'sheets') {
          obj.position.set(-0.24, 0.0, -0.1);
          bones[B.chest].add(obj);
        } else {
          obj.position.set(0, -0.05, 0.38);
          obj.rotation.x = Math.PI / 2 - 0.15;
          bones[B.chest].add(obj);
        }
        worker.carry = obj;
      },
      dropBarrow: function () { if (worker.barrow && worker.barrow.parent) worker.barrow.parent.remove(worker.barrow); },
    };
    return worker;
  }
  return { create, bodies };
}

// ---------- движения ----------

const TARGET = BONES.map(function () { return new THREE.Euler(); });
function set(i, x, y, z) { TARGET[i].set(x, y, z, 'XYZ'); }

// a.speed — м/с (идёт), a.action: idle | walk | hammer | lay | screw | climb | pick | push (тачка)
export function animateWorker(w, dt, time) {
  const a = w.anim;
  TARGET.forEach(function (e) { e.set(0, 0, 0); });
  const S = Math.sin, C = Math.cos;
  const armDown = 0.6;
  // база: руки вдоль тела
  set(B.upperArmL, 0, 0, -armDown);
  set(B.upperArmR, 0, 0, armDown);
  set(B.foreArmL, -0.15, 0, 0);
  set(B.foreArmR, -0.15, 0, 0);
  let bob = 0;
  const moving = a.speed > 0.05;
  if (moving) {
    const stride = 1.35 + a.speed * 0.25;
    a.phase += (a.speed / stride) * Math.PI * 2 * dt;
    const p = a.phase;
    const amp = Math.min(1, a.speed / 1.3);
    set(B.thighL, -S(p) * 0.42 * amp, 0, 0);
    set(B.thighR, S(p) * 0.42 * amp, 0, 0);
    set(B.shinL, Math.max(0, S(p - 1.6)) * 0.85 * amp + 0.05, 0, 0);
    set(B.shinR, Math.max(0, S(p + Math.PI - 1.6)) * 0.85 * amp + 0.05, 0, 0);
    set(B.footL, Math.max(0, -S(p)) * 0.25 * amp, 0, 0);
    set(B.footR, Math.max(0, S(p)) * 0.25 * amp, 0, 0);
    set(B.upperArmL, S(p) * 0.32 * amp, 0, -armDown);
    set(B.upperArmR, -S(p) * 0.32 * amp, 0, armDown);
    set(B.foreArmL, -0.25 - Math.max(0, S(p)) * 0.3 * amp, 0, 0);
    set(B.foreArmR, -0.25 - Math.max(0, -S(p)) * 0.3 * amp, 0, 0);
    set(B.hips, 0, S(p) * 0.06 * amp, 0);
    set(B.chest, 0.04, -S(p) * 0.08 * amp, 0);
    bob = (Math.abs(C(p)) - 0.6) * 0.03 * amp;
  } else {
    const br = S(time * 1.6 + w.look.build) * 0.02;
    set(B.chest, br, 0, 0);
    set(B.head, 0, S(time * 0.37 + w.look.helmet) * 0.25, 0);
  }
  // ноша
  const ck = w.carryKind;
  if (ck === 'planks' || ck === 'sticks') {
    set(B.upperArmR, -2.75, 0.15, 0.25);
    set(B.foreArmR, -1.9, 0, 0);
    TARGET[B.chest].y += 0.0;
  } else if (ck === 'sheets') {
    set(B.upperArmR, -0.35, 0, 0.75);
    set(B.foreArmR, -0.9, 0, 0);
    set(B.upperArmL, -0.95, 0.0, 0.1);
    set(B.foreArmL, -0.6, 0, 0);
  } else if (ck === 'plates' || ck === 'box') {
    set(B.upperArmL, -0.9, 0, -0.25);
    set(B.upperArmR, -0.9, 0, 0.25);
    set(B.foreArmL, -1.0, 0, 0);
    set(B.foreArmR, -1.0, 0, 0);
    TARGET[B.spine].x -= 0.12;
  } else if (ck === 'stones') {
    // тачка: руки вниз-вперёд, наклон
    set(B.upperArmL, -0.35, 0, -0.5);
    set(B.upperArmR, -0.35, 0, 0.5);
    set(B.foreArmL, -0.15, 0, 0);
    set(B.foreArmR, -0.15, 0, 0);
    TARGET[B.spine].x += 0.18;
  }
  // действие на месте
  if (!moving) {
    const t = a.t;
    if (a.action === 'hammer') {
      const sw = (S(t * 9.0) * 0.5 + 0.5);
      set(B.upperArmR, -1.45 - sw * 0.5, 0.1, 0.35);
      set(B.foreArmR, -0.6 - sw * 1.1, 0, 0);
      set(B.handR, sw * 0.5 - 0.2, 0, 0);
      set(B.upperArmL, -1.2, -0.2, -0.3);
      set(B.foreArmL, -0.9, 0, 0);
      TARGET[B.chest].x += 0.1;
    } else if (a.action === 'lay' || a.action === 'pick') {
      const k = a.action === 'pick' ? 1 : 0.7 + 0.3 * S(t * 2.2);
      TARGET[B.spine].x += 0.55 * k;
      TARGET[B.chest].x += 0.25 * k;
      set(B.thighL, -0.75 * k, 0, 0); set(B.thighR, -0.75 * k, 0, 0);
      set(B.shinL, 1.25 * k, 0, 0); set(B.shinR, 1.25 * k, 0, 0);
      set(B.footL, -0.45 * k, 0, 0); set(B.footR, -0.45 * k, 0, 0);
      set(B.upperArmL, -1.05 * k, 0, -0.35); set(B.upperArmR, -1.05 * k, 0, 0.35);
      set(B.foreArmL, -0.5, 0, 0); set(B.foreArmR, -0.5, 0, 0);
      bob = -0.28 * k;
    } else if (a.action === 'screw') {
      set(B.upperArmR, -1.35, 0, 0.2);
      set(B.foreArmR, -0.3 + S(t * 30) * 0.02, 0, 0);
      set(B.upperArmL, -1.2, 0, -0.25);
      set(B.foreArmL, -0.6, 0, 0);
    } else if (a.action === 'tie') {
      set(B.upperArmL, -1.1 + S(t * 6) * 0.12, 0, -0.3);
      set(B.upperArmR, -1.1 - S(t * 6) * 0.12, 0, 0.3);
      set(B.foreArmL, -1.2, 0, 0); set(B.foreArmR, -1.2, 0, 0);
    } else if (a.action === 'climb') {
      const c = a.climb * 6.0;
      set(B.upperArmL, -2.4 + S(c) * 0.35, 0, -0.2); set(B.upperArmR, -2.4 - S(c) * 0.35, 0, 0.2);
      set(B.foreArmL, -0.5, 0, 0); set(B.foreArmR, -0.5, 0, 0);
      set(B.thighL, -0.9 - S(c) * 0.45, 0, 0); set(B.thighR, -0.9 + S(c) * 0.45, 0, 0);
      set(B.shinL, 1.3 + S(c) * 0.3, 0, 0); set(B.shinR, 1.3 - S(c) * 0.3, 0, 0);
    } else if (a.action === 'work-high') {
      const sw = (S(t * 8.0) * 0.5 + 0.5);
      set(B.upperArmR, -2.5 - sw * 0.35, 0.1, 0.25);
      set(B.foreArmR, -0.5 - sw * 0.8, 0, 0);
      set(B.upperArmL, -2.3, 0, -0.25);
      set(B.foreArmL, -0.4, 0, 0);
      TARGET[B.head].x -= 0.35;
    }
  }
  a.t += dt;
  // плавный переход к цели
  const k = 1 - Math.exp(-dt * 14);
  for (let i = 1; i < BONES.length; i++) {
    _q.setFromEuler(TARGET[i]);
    w.pose[i].slerp(_q, k);
    w.bones[i].quaternion.copy(w.pose[i]);
  }
  w.bones[B.hips].position.y = BONES[B.hips][2][1] + bob;
  // инструмент в руке — по действию
  w.tools.hammer.visible = a.action === 'hammer' || a.action === 'work-high';
  w.tools.trowel.visible = a.action === 'lay' && w.carryKind === 'stones';
  w.tools.drill.visible = a.action === 'screw';
  if (w.barrow && w.barrow.parent) {
    w.barrow.position.set(0, 0, 0.55);
    w.barrow.userData.wheel.rotation.x += a.speed * dt / 0.17;
  }
}
