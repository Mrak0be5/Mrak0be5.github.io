// Особые детали здания (building.js): материалы панорамных стёкол, плафонов фонарей, воды и струй, и сборка
// непрямоугольных частей в буферы кусков — цилиндры (шест, столбик фонаря, тумба и чаша фонтана, струи),
// пирамидки (навершия, крышка фонаря), четырёхугольники (гладь, пелена слива), диски (вода в чаше, пена), трубки
// по дуге (струи фонтана).
// Буфер — как у building.js: { pos, nrm, uv, col, idx }; фактура — в метрах по осям детали (tile).
import * as THREE from 'three';
import { linkSky } from './world.js?v=45127fe';

// ---------- материалы ----------
// Вода: тёмная гладь с отражением неба (окружение сцены, на «Максимуме» и SSR) — рябь бегущими волнами и шумом
// в мировых координатах (клетки русла сливаются без шва), вдали мельче. Пелена и струи — пряди бегут вниз.
const WATER_HEAD = /* glsl */ `
varying vec3 vMbW;
uniform float uWaterT;
float mbWH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mbWN(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mbWH(i), mbWH(i + vec2(1.0, 0.0)), u.x), mix(mbWH(i + vec2(0.0, 1.0)), mbWH(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec2 mbWaveSlope(vec2 p, float t) {
  vec2 D[6] = vec2[6](vec2(0.94, 0.34), vec2(-0.5, 0.87), vec2(0.17, -0.98), vec2(-0.82, -0.57), vec2(0.6, 0.8), vec2(-0.99, 0.12));
  float K[6] = float[6](3.1, 4.7, 6.3, 8.9, 13.0, 19.0);
  float A[6] = float[6](0.012, 0.009, 0.007, 0.005, 0.0035, 0.0022);
  vec2 g = vec2(0.0);
  for (int i = 0; i < 6; i++) {
    float ph = dot(D[i], p) * K[i] - sqrt(9.81 * K[i]) * 0.5 * t;
    g += D[i] * K[i] * A[i] * cos(ph);
  }
  vec2 q = p * 7.0 + vec2(t * 0.6, -t * 0.45);
  float n0 = mbWN(q), nx = mbWN(q + vec2(0.05, 0.0)), nz = mbWN(q + vec2(0.0, 0.05));
  return g + vec2(nx - n0, nz - n0) * 0.24;
}
`;
const WATER_VERT = /* glsl */ `
vMbW = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;
const WATER_NORMAL = /* glsl */ `
{
  vec3 mbUpV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  float mbUpK = smoothstep(0.55, 0.9, dot(normal, mbUpV));
  vec2 mbS = mbWaveSlope(vMbW.xz, uWaterT) / (1.0 + length(cameraPosition - vMbW) * 0.02);
  vec3 mbNW = normalize(vec3(-mbS.x, 1.0, -mbS.y));
  normal = normalize(mix(normal, normalize((viewMatrix * vec4(mbNW, 0.0)).xyz), mbUpK));
}
`;
const WATER_COLOR = /* glsl */ `
diffuseColor.rgb *= 0.82 + 0.36 * mbWN(vMbW.xz * 0.6 + vec2(uWaterT * 0.04, 0.0));
`;
// пряди пелены: светлая пена и тёмные просветы бегут вниз; по краям струи — рябь нормали поперёк
const FALL_COLOR = /* glsl */ `
float mbFa = dot(vMbW.xz, vec2(0.71, 0.71));
float mbFs = mbWN(vec2(mbFa * 11.0, vMbW.y * 1.6 + uWaterT * 3.2)) * 0.65 + mbWN(vec2(mbFa * 31.0, vMbW.y * 4.0 + uWaterT * 5.5)) * 0.35;
diffuseColor.rgb = mix(vec3(0.05, 0.11, 0.11), diffuseColor.rgb, smoothstep(0.25, 0.75, mbFs));
// просветы между прядями (сквозь струю видно, со сглаживанием по кадрам — alphaHash)
diffuseColor.a *= mix(0.3, 1.0, smoothstep(0.3, 0.7, mbFs));
`;
const FALL_ROUGH = /* glsl */ `
roughnessFactor = mix(0.05, 0.35, smoothstep(0.3, 0.8, mbFs));
`;

function waterMaterial(color, rough, side, colorChunk, roughChunk, time, key, see) {
  const m = new THREE.MeshStandardMaterial({ color: color, roughness: rough, metalness: 0, side: side, envMapIntensity: 1.1 });
  // струи сквозят: отбрасывание по хешу альфы (G-буфер цел), временное сглаживание делает его полупрозрачностью
  if (see) { m.alphaHash = true; m.opacity = see; }
  // вода под дождём не темнеет и снег на неё не ложится
  m.defines = { MB_DRY: '' };
  m.onBeforeCompile = function (shader) {
    shader.uniforms.uWaterT = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMbW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WATER_VERT);
    let f = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + WATER_HEAD)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + colorChunk);
    if (roughChunk) f = f.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + roughChunk);
    else f = f.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + WATER_NORMAL);
    shader.fragmentShader = f;
  };
  m.customProgramCacheKey = function () { return key; };
  linkSky(m);
  return m;
}

// Свет за панорамным стеклом — цвет вершин (ярче к потолку, у каждого окна свой тон): умножает излучение.
function paneMaterial(lit) {
  const m = new THREE.MeshStandardMaterial({ color: 0x2e3c45, roughness: 0.04, metalness: 0, vertexColors: true, envMapIntensity: 1.5,
    emissive: lit ? 0xffcf9a : 0x000000, emissiveIntensity: 0 });
  m.defines = { MB_DRY: '' };
  if (lit) {
    m.onBeforeCompile = function (shader) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor;\n#endif');
    };
    m.customProgramCacheKey = function () { return 'mbPaneLit1'; };
  }
  linkSky(m);
  return m;
}

// Плафон фонаря: стекло — днём тёмное с отражением неба и чуть светится, ночью горит (art/features.js → lampCold,
// lampWarm: голубой и оранжевый свет). Цвет вершин (pushGlowBox) — пятно лампы за стеклом: ярко в середине, к рамке
// тусклее; умножает только свечение, не цвет стекла.
function glowMaterial(color, hex) {
  const m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.08, metalness: 0, emissive: hex, emissiveIntensity: 0.12, vertexColors: true, envMapIntensity: 1.6 });
  m.defines = { MB_DRY: '' };
  m.onBeforeCompile = function (shader) {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = diffuse;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor;\n#endif');
  };
  m.customProgramCacheKey = function () { return 'mbGlow1'; };
  linkSky(m);
  return m;
}

// taa — у кадра временное сглаживание («Максимум», «Ультра»): струи полупрозрачные; без него — сплошные.
export function createFeatureMaterials(taa) {
  const time = { value: 0 };
  const fm = {
    paneLit: paneMaterial(true),
    paneDim: paneMaterial(false),
    glow: { cold: glowMaterial(0x7f8d93, 0x9cd2ee), warm: glowMaterial(0x8c8576, 0xffb04a) },
    water: waterMaterial(0x16302d, 0.03, THREE.FrontSide, WATER_COLOR, null, time, 'mbWater1'),
    fall: waterMaterial(0xd2e2df, 0.2, THREE.DoubleSide, FALL_COLOR, FALL_ROUGH, time, 'mbFall2', taa ? 0.75 : 0),
    tick: function (dt) { time.value = (time.value + dt) % 3600; },
    // ночь k 0…1 (сглаженная): 2/3 панорам горят светом комнаты, плафоны ярче (art/features.js → F.night)
    night: function (k) {
      fm.paneLit.emissiveIntensity = 1.7 * k;
      // не до белого (ft12, ftf1 — выгорало при 2,1): в середине пятна чуть выше 1, к рамке — цвет света
      fm.glow.cold.emissiveIntensity = 0.12 + 1.05 * k;
      fm.glow.warm.emissiveIntensity = 0.16 + 1.15 * k;
    },
  };
  return fm;
}

// ---------- геометрия ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3(), _n = new THREE.Vector3();

function vert(buf, p, n, u, v, tint) {
  buf.pos.push(p.x, p.y, p.z);
  buf.nrm.push(n.x, n.y, n.z);
  buf.uv.push(u, v);
  buf.col.push(tint[0], tint[1], tint[2]);
}

// Цилиндр r = { a, b, r, ri?, seg?, cap?, open?, ball? } (a, b — центры торцов, м): боковина с плавными нормалями,
// торцы (cap) — оба; ri — полое кольцо (стенки снаружи и внутри, кольцо по верху); open — только боковина; ball —
// шар радиуса r посередине a–b. UV: вдоль оси / tile[0], по окружности (длина дуги) / tile[1].
export function pushRod(buf, r, tile, tint) {
  _a.fromArray(r.a); _b.fromArray(r.b);
  _d.subVectors(_b, _a);
  const len = _d.length();
  if (len < 1e-5 || r.r <= 0) return;
  _d.divideScalar(len);
  _u.set(Math.abs(_d.y) < 0.9 ? 0 : 1, Math.abs(_d.y) < 0.9 ? 1 : 0, 0).cross(_d).normalize();
  _v.crossVectors(_d, _u);
  const seg = r.seg || (r.r > 0.3 ? 24 : 12);
  const P = new THREE.Vector3();
  if (r.ball) {
    const c = new THREE.Vector3().addVectors(_a, _b).multiplyScalar(0.5), rings = Math.max(4, seg >> 1);
    const base = buf.pos.length / 3;
    for (let j = 0; j <= rings; j++) {
      const ph = (j / rings) * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
      for (let i = 0; i <= seg; i++) {
        const th = (i / seg) * Math.PI * 2;
        _n.copy(_u).multiplyScalar(Math.cos(th) * sp).addScaledVector(_v, Math.sin(th) * sp).addScaledVector(_d, cp);
        P.copy(c).addScaledVector(_n, r.r);
        vert(buf, P, _n, i / seg * 2 * Math.PI * r.r / tile[1], j / rings * Math.PI * r.r / tile[0], tint);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const p0 = base + j * (seg + 1) + i, p1 = p0 + seg + 1;
      buf.idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1);
    }
    return;
  }
  const wall = function (rad, inward) {
    const base = buf.pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      _n.copy(_u).multiplyScalar(Math.cos(th)).addScaledVector(_v, Math.sin(th));
      const n = inward ? _n.clone().negate() : _n;
      const arc = th * rad / tile[1];
      P.copy(_a).addScaledVector(_n, rad); vert(buf, P, n, 0, arc, tint);
      P.copy(_b).addScaledVector(_n, rad); vert(buf, P, n, len / tile[0], arc, tint);
    }
    for (let i = 0; i < seg; i++) {
      const p = base + i * 2;
      // снаружи — против часовой при взгляде снаружи (θ от _u к _v)
      if (inward) buf.idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
      else buf.idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
    }
  };
  // кольцо (ri < r) или диск (ri = 0) в торце at с нормалью n
  const ring = function (at, n, ri, ro) {
    const base = buf.pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      _n.copy(_u).multiplyScalar(Math.cos(th)).addScaledVector(_v, Math.sin(th));
      P.copy(at).addScaledVector(_n, ro); vert(buf, P, n, P.x / tile[0], P.z / tile[1], tint);
      P.copy(at).addScaledVector(_n, ri); vert(buf, P, n, P.x / tile[0], P.z / tile[1], tint);
    }
    // обход наружу по n: вдоль _u→_v против часовой, если n = _d
    const up = n.dot(_d) > 0;
    for (let i = 0; i < seg; i++) {
      const p = base + i * 2;
      if (up) buf.idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
      else buf.idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
    }
  };
  wall(r.r, false);
  if (r.open) return;
  const top = _d.clone(), bot = _d.clone().negate();
  if (r.ri) {
    wall(r.ri, true);
    ring(_b.clone(), top, r.ri, r.r);
    return;
  }
  if (r.cap === false) return;
  ring(_b.clone(), top, 0, r.r);
  ring(_a.clone(), bot, 0, r.r);
}

// Трубка по ломаной pts ([x, y, z]) с радиусами rs (струя по дуге): кольца сечения поперёк касательной, без
// торцов. Нормали наружу, обход — как у боковины pushRod.
export function pushTube(buf, pts, rs, seg, tint) {
  const n = pts.length;
  if (n < 2) return;
  const base = buf.pos.length / 3, T = new THREE.Vector3(), U = new THREE.Vector3(), V = new THREE.Vector3(), P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    U.set(Math.abs(T.y) < 0.9 ? 0 : 1, Math.abs(T.y) < 0.9 ? 1 : 0, 0).cross(T).normalize();
    V.crossVectors(T, U);
    for (let k = 0; k <= seg; k++) {
      const th = k / seg * Math.PI * 2;
      N.copy(U).multiplyScalar(Math.cos(th)).addScaledVector(V, Math.sin(th));
      P.set(pts[i][0], pts[i][1], pts[i][2]).addScaledVector(N, rs[i]);
      vert(buf, P, N, i / (n - 1), k / seg, tint);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
    const p = base + i * (seg + 1) + k, q = p + seg + 1;
    buf.idx.push(p, p + 1, q, q, p + 1, q + 1);
  }
}

// Четырёхскатная пирамидка на основании b = [x0, y0, z0, x1, y1, z1] (y1 — вершина): грани с плоскими нормалями.
export function pushPyramid(buf, b, tile, tint) {
  const cx = (b[0] + b[3]) / 2, cz = (b[2] + b[5]) / 2;
  const apex = new THREE.Vector3(cx, b[4], cz);
  const corners = [[b[0], b[2]], [b[3], b[2]], [b[3], b[5]], [b[0], b[5]]].map(function (q) { return new THREE.Vector3(q[0], b[1], q[1]); });
  for (let i = 0; i < 4; i++) {
    const p0 = corners[i], p1 = corners[(i + 1) % 4];
    const n = new THREE.Vector3().subVectors(p0, apex).cross(new THREE.Vector3().subVectors(p1, apex)).normalize();
    if (n.y < 0) n.negate();
    const base = buf.pos.length / 3;
    const edge = p0.distanceTo(p1), slant = Math.hypot(b[4] - b[1], 0.5 * Math.hypot(b[3] - b[0], b[5] - b[2]) * 0.7);
    vert(buf, p0, n, 0, 0, tint);
    vert(buf, p1, n, edge / tile[0], 0, tint);
    vert(buf, apex, n, edge / 2 / tile[0], slant / tile[1], tint);
    // обход — наружу по нормали
    const e1 = new THREE.Vector3().subVectors(p1, p0), e2 = new THREE.Vector3().subVectors(apex, p0);
    if (e1.cross(e2).dot(n) >= 0) buf.idx.push(base, base + 1, base + 2); else buf.idx.push(base, base + 2, base + 1);
  }
}

// Плафон: брусок b без граней skip, каждая грань — сетка 3 × 3 вершины; цвет вершин — пятно лампы (1 в середине
// грани, к углам 0,35), им материал плафона умножает свечение.
const GLOW_FACES = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];
export function pushGlowBox(buf, b, skip) {
  const c = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2], half = [(b[3] - b[0]) / 2, (b[4] - b[1]) / 2, (b[5] - b[2]) / 2];
  GLOW_FACES.forEach(function (f, fi) {
    if (skip && skip.indexOf(fi) >= 0) return;
    const base = buf.pos.length / 3;
    const ext = function (a) { return Math.abs(a[0]) * half[0] + Math.abs(a[1]) * half[1] + Math.abs(a[2]) * half[2]; };
    const su = ext(f.u), sv = ext(f.v), sn = ext(f.n);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const a = i - 1, q = j - 1;
      const k = 1 - 0.65 * (a * a + q * q) / 2;
      // пятно чуть выше середины: лампа под крышкой
      const kv = k * (q > 0 ? 0.92 : q < 0 ? 0.8 : 1);
      buf.pos.push(c[0] + f.n[0] * sn + f.u[0] * su * a + f.v[0] * sv * q, c[1] + f.n[1] * sn + f.u[1] * su * a + f.v[1] * sv * q, c[2] + f.n[2] * sn + f.u[2] * su * a + f.v[2] * sv * q);
      buf.nrm.push(f.n[0], f.n[1], f.n[2]);
      buf.uv.push(i / 2, j / 2);
      buf.col.push(kv, kv, kv);
    }
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const p = base + j * 3 + i;
      buf.idx.push(p, p + 1, p + 4, p, p + 4, p + 3);
    }
  });
}

// Четырёхугольник из 4 точек [x, y, z] (по кругу) с нормалью n (обход — по ней), UV — в метрах по миру.
export function pushQuad(buf, pts, n) {
  _n.fromArray(n).normalize();
  const base = buf.pos.length / 3;
  const P = new THREE.Vector3();
  pts.forEach(function (p) { P.fromArray(p); vert(buf, P, _n, p[0] + p[2], p[1], [1, 1, 1]); });
  const e1 = new THREE.Vector3().fromArray(pts[1]).sub(P.fromArray(pts[0])), e2 = new THREE.Vector3().fromArray(pts[2]).sub(P.fromArray(pts[0]));
  if (e1.cross(e2).dot(_n) >= 0) buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  else buf.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
}

// Диск воды (нормаль вверх) радиуса r в точке (x, y, z).
export function pushDisk(buf, x, y, z, r, seg) {
  const base = buf.pos.length / 3;
  const up = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(x, y, z);
  vert(buf, P, up, x, z, [1, 1, 1]);
  for (let i = 0; i <= seg; i++) {
    const th = (i / seg) * Math.PI * 2;
    P.set(x + Math.cos(th) * r, y, z + Math.sin(th) * r);
    vert(buf, P, up, P.x, P.z, [1, 1, 1]);
  }
  // против часовой сверху: x → −z … — обход от +x к +z смотрит вниз, поэтому индексы наоборот
  for (let i = 0; i < seg; i++) buf.idx.push(base, base + i + 2, base + i + 1);
}
