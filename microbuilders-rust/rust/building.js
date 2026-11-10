// Здание оригинала (logic.js → world.blocks) деталями, как в Rust: клетка логики 2 м — одна деталь — фундамент,
// стена, окно в проёме, дверной проём, колонна, перекрытие (роли — plan.js). Стены и плиты одной кладки
// сливаются: фактура лежит в мировых координатах (ряды кирпича идут через детали), грани у готовых соседей не
// рисуются. Сетка разбита на куски 8 × 8 × 8 клеток — при постройке детали пересобирается её кусок (и соседний,
// если деталь на границе). Недостроенная деталь на ×1 растёт единицами своей кладки — пачками в такт рукам
// каменщика (ms-lay.js: кирпич, камень, брус, лист, щит; плита — полосами): пачка ложится в ту долю времени
// укладки, когда рука её кладёт, чуть оседает; под неё мастерок тянет полосу свежего раствора. На ×5 и ×20 —
// рядами своей кладки на долю (poured + доля текущего мини-куба) / N³, как кольцо над рабочим в оригинале.
// Будущие детали фронта работ — тонкий контур (подсветка оригинала). Постройки городка — те же детали.
// Особые блоки — как у оригинала (art/features.js): двери, прорубленные по ходу стройки (logic.js → retrofitDoor),
// и люки появляются в стене и перекрытии, когда логика их врезала; створки открываются на петле перед рабочим
// (feature-blocks.js → update); фонарь — стальной столбик с плафоном, ночью горит и светит; вода — дно, бортики,
// гладь с рябью и отражением неба, фонтан и слив; панорамные окна — остекление во всю клетку, ночью горит 2/3.
import * as THREE from 'three';
import { CELL, familyOf, familyMaterial, familyTile, tintOf, tintHex, FAMILY_TEX } from './families.js?v=ff29707';
import { classify, pieceBoxes, featureBoxes, chimneyCells, key3, DIRS } from './plan.js?v=ff29707';
import { linkSky } from './world.js?v=ff29707';
import { DYNAMIC, markDynamic } from './render.js?v=ff29707';
import { createFeatureMaterials, pushRod, pushPyramid, pushQuad, pushDisk, pushGlowBox, pushTube } from './feat-parts.js?v=ff29707';
import { mergeMeshes, unmergeMeshes, shadowProxy, dropShadowProxy } from './geo.js?v=ff29707';
import { LAY, PHASE, HAND_SPAN, layClock, layUnits, mergeUnits, fullCourses, packRange, laidCount, replan } from './ms-lay.js?v=ff29707';

const CHUNK = 8;
// сечение колонны, м
const PILLAR = { wood: 0.45, metal: 0.4 };
// плита перекрытия — из того же материала, что несут рабочие: плиты камня, кирпича, бетона, мрамора;
// у дерева — дощатый пол, у стали — рифлёный лист
const PLATE_FAMILY = { wood: 'floor', metal: 'deck' };
// семейства на растворе (свежая постель раствора по верху растущего ряда)
const MORTAR_BED = { stone: true, brick: true, marble: true, concrete: false, gem: true };
// рамки, стойки, сливы и пояса деталей — своим материалом, как у панелей Rust: у кладки — светлый тёсаный
// камень (у бетона — бетон темнее), у сруба — тёмный брус, у стали — чёрная сталь
const TRIM_FAMILY = { wood: 'beam', metal: null };
const CREAM = new THREE.Color(0xd2c8b5);
const _t = new THREE.Color();
function trimHex(MB, c) {
  const m = MB.MATERIAL[c.mat];
  _t.setHex(m ? m.color : 0x888888);
  if (c.family === 'wood') _t.multiplyScalar(0.55);
  else if (c.family === 'concrete') _t.multiplyScalar(0.8);
  else _t.lerp(CREAM, 0.6);
  return _t.getHex();
}
const WHITE = [1, 1, 1];

// грани бруска: нормаль и оси u, v (фактура — в мировых координатах вдоль осей грани)
const FACES = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];

function newBuf() { return { pos: [], nrm: [], uv: [], col: [], idx: [] }; }

// Разброс тона детали по клетке: [яркость, тепло] — детерминированно (без Math.random).
function jitter(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453, g = Math.sin(x * 269.5 + y * 183.3 + z * 246.1) * 43758.5453;
  return [(h - Math.floor(h)) - 0.5, (g - Math.floor(g)) - 0.5];
}
function shade(t, j) {
  const k = 1 + 0.08 * j[0], w = 0.04 * j[1];
  return [t[0] * k * (1 + w), t[1] * k, t[2] * k * (1 - w)];
}

// Брусок [x0, y0, z0, x1, y1, z1] без граней skip.
function pushBox(buf, b, skip, tile, tint) {
  const w = b[3] - b[0], h = b[4] - b[1], d = b[5] - b[2];
  if (w <= 1e-4 || h <= 1e-4 || d <= 1e-4) return;
  FACES.forEach(function (f, fi) {
    if (skip && skip.indexOf(fi) >= 0) return;
    const n = f.n, u = f.u, v = f.v;
    const cx = b[0] + w / 2 + n[0] * w / 2, cy = b[1] + h / 2 + n[1] * h / 2, cz = b[2] + d / 2 + n[2] * d / 2;
    const su0 = Math.abs(u[0]) * w + Math.abs(u[1]) * h + Math.abs(u[2]) * d;
    const sv0 = Math.abs(v[0]) * w + Math.abs(v[1]) * h + Math.abs(v[2]) * d;
    const base = buf.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const su = k === 0 || k === 3 ? -1 : 1, sv = k < 2 ? -1 : 1;
      const px = cx + u[0] * su0 / 2 * su + v[0] * sv0 / 2 * sv, py = cy + u[1] * su0 / 2 * su + v[1] * sv0 / 2 * sv, pz = cz + u[2] * su0 / 2 * su + v[2] * sv0 / 2 * sv;
      buf.pos.push(px, py, pz);
      buf.nrm.push(n[0], n[1], n[2]);
      buf.uv.push((px * u[0] + py * u[1] + pz * u[2]) / tile[0], (px * v[0] + py * v[1] + pz * v[2]) / tile[1]);
      buf.col.push(tint[0], tint[1], tint[2]);
    }
    buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
}

// Брусок с фаской c по рёбрам между видимыми гранями — свет ложится на кромку, как у настоящей кладки и
// сборных деталей. Грань ужимается на c у ребра с другой видимой гранью, ребро — полоса с нормалями обеих граней
// (скруглённый блик), угол трёх видимых граней — треугольник. Кромки чуть светлее (вытертые). Ребро у скрытой
// грани (стык с соседом) без фаски: детали стыкуются вплотную.
const FACE_OF = function (axis, pos) { return axis * 2 + (pos ? 0 : 1); };
const _P = [0, 0, 0];
function bevelVertex(buf, x, y, z, n, f, tile, tint, k) {
  const F = FACES[f], u = F.u, v = F.v;
  buf.pos.push(x, y, z);
  buf.nrm.push(n[0], n[1], n[2]);
  buf.uv.push((x * u[0] + y * u[1] + z * u[2]) / tile[0], (x * v[0] + y * v[1] + z * v[2]) / tile[1]);
  buf.col.push(tint[0] * k, tint[1] * k, tint[2] * k);
}
function bevelPoly(buf, pts, nrms, f, tile, tint, k, out) {
  const base = buf.pos.length / 3;
  // порядок обхода — наружу (по нормали out)
  const ax = pts[1][0] - pts[0][0], ay = pts[1][1] - pts[0][1], az = pts[1][2] - pts[0][2];
  const bx = pts[2][0] - pts[0][0], by = pts[2][1] - pts[0][1], bz = pts[2][2] - pts[0][2];
  const flip = (ay * bz - az * by) * out[0] + (az * bx - ax * bz) * out[1] + (ax * by - ay * bx) * out[2] < 0;
  pts.forEach(function (p, i) { bevelVertex(buf, p[0], p[1], p[2], nrms[i], f, tile, tint, k); });
  for (let i = 1; i < pts.length - 1; i++) {
    if (flip) buf.idx.push(base, base + i + 1, base + i); else buf.idx.push(base, base + i, base + i + 1);
  }
}
function pushBevelBox(buf, b, skip, tile, tint, c) {
  const lo = [b[0], b[1], b[2]], hi = [b[3], b[4], b[5]];
  const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  if (size[0] <= 1e-4 || size[1] <= 1e-4 || size[2] <= 1e-4) return;
  c = Math.min(c, 0.3 * Math.min(size[0], size[1], size[2]));
  if (c < 0.002) { pushBox(buf, b, skip, tile, tint); return; }
  const vis = [0, 1, 2, 3, 4, 5].map(function (f) { return !skip || skip.indexOf(f) < 0; });
  // пределы грани по оси: ужаты на c, где соседняя по ребру грань видна
  const lim = function (axis) { return [lo[axis] + (vis[FACE_OF(axis, false)] ? c : 0), hi[axis] - (vis[FACE_OF(axis, true)] ? c : 0)]; };
  const L = [lim(0), lim(1), lim(2)];
  // грани
  for (let f = 0; f < 6; f++) {
    if (!vis[f]) continue;
    const a = f >> 1, pos = (f & 1) === 0, plane = pos ? hi[a] : lo[a];
    const p = (a + 1) % 3, q = (a + 2) % 3;
    const pts = [[L[p][0], L[q][0]], [L[p][1], L[q][0]], [L[p][1], L[q][1]], [L[p][0], L[q][1]]].map(function (pq) {
      const P = [0, 0, 0]; P[a] = plane; P[p] = pq[0]; P[q] = pq[1]; return P;
    });
    const n = FACES[f].n;
    bevelPoly(buf, pts, [n, n, n, n], f, tile, tint, 1, n);
  }
  // рёбра: пары видимых граней разных осей
  for (let f1 = 0; f1 < 6; f1++) {
    for (let f2 = f1 + 1; f2 < 6; f2++) {
      const a1 = f1 >> 1, a2 = f2 >> 1;
      if (a1 === a2 || !vis[f1] || !vis[f2]) continue;
      const a3 = 3 - a1 - a2;
      const p1 = (f1 & 1) === 0, p2 = (f2 & 1) === 0;
      const c1 = p1 ? hi[a1] : lo[a1], c2 = p2 ? hi[a2] : lo[a2];
      const in1 = p1 ? -c : c, in2 = p2 ? -c : c;
      const r = L[a3];
      const mk = function (v1, v2, t) { const P = [0, 0, 0]; P[a1] = v1; P[a2] = v2; P[a3] = t; return P; };
      const pts = [mk(c1, c2 + in2, r[0]), mk(c1, c2 + in2, r[1]), mk(c1 + in1, c2, r[1]), mk(c1 + in1, c2, r[0])];
      const n1 = FACES[f1].n, n2 = FACES[f2].n;
      const out = [n1[0] + n2[0], n1[1] + n2[1], n1[2] + n2[2]];
      bevelPoly(buf, pts, [n1, n1, n2, n2], f1, tile, tint, 1.07, out);
    }
  }
  // углы трёх видимых граней
  for (let sx = 0; sx < 2; sx++) for (let sy = 0; sy < 2; sy++) for (let sz = 0; sz < 2; sz++) {
    const fx = FACE_OF(0, sx === 1), fy = FACE_OF(1, sy === 1), fz = FACE_OF(2, sz === 1);
    if (!vis[fx] || !vis[fy] || !vis[fz]) continue;
    const X = sx ? hi[0] : lo[0], Y = sy ? hi[1] : lo[1], Z = sz ? hi[2] : lo[2];
    const dx = sx ? -c : c, dy = sy ? -c : c, dz = sz ? -c : c;
    const pts = [[X, Y + dy, Z + dz], [X + dx, Y, Z + dz], [X + dx, Y + dy, Z]];
    const nx = FACES[fx].n, ny = FACES[fy].n, nz = FACES[fz].n;
    bevelPoly(buf, pts, [nx, ny, nz], fx, tile, tint, 1.09, [nx[0] + ny[0] + nz[0], nx[1] + ny[1] + nz[1], nx[2] + ny[2] + nz[2]]);
  }
}

function makeGeometry(buf) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
  g.setIndex(buf.idx);
  g.computeBoundingSphere();
  return g;
}

// Белый цвет вершин: материалы прототипа красят цветом вершин, без атрибута меш выходит чёрным.
function white(g) {
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  return g;
}

// Контур будущих деталей: свои выходы G-буфера, чтобы прозрачные линии не портили буферы под собой.
const GHOST_VERT = /* glsl */ `
void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const GHOST_FRAG = /* glsl */ `
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  outColor = vec4(uColor, uOpacity);
  gNormal = vec4(0.0); gInfo = vec4(0.0); gVelocity = vec4(0.0); gAlbedo = vec4(0.0); gIndirect = vec4(0.0);
}
`;
const BOX_EDGES = [[0, 1, 2, 3, 1, 2], [0, 1, 2, 0, 4, 2], [0, 1, 2, 0, 1, 5], [3, 4, 5, 0, 4, 5], [3, 4, 5, 3, 1, 5], [3, 4, 5, 3, 4, 2],
  [3, 1, 2, 3, 4, 2], [3, 1, 2, 3, 1, 5], [0, 4, 2, 3, 4, 2], [0, 4, 2, 0, 4, 5], [0, 1, 5, 3, 1, 5], [0, 1, 5, 0, 4, 5]];

// Предпросмотр детали до укладки (ms-lay.js → LAY.preview, crew.js → standFor): здания регистрируются, отвечает то, чей
// блок.
const PREVIEWS = [];
LAY.preview = function (b, side) {
  for (let i = 0; i < PREVIEWS.length; i++) if (PREVIEWS[i].has(b)) return PREVIEWS[i].preview(b, side);
  return null;
};

export function createBuilding(ctx) {
  const { E, mats } = ctx;
  const MB = E.MB;
  const group = new THREE.Group();
  group.name = 'building';
  const ghostMat = new THREE.ShaderMaterial({
    vertexShader: GHOST_VERT, fragmentShader: GHOST_FRAG, glslVersion: THREE.GLSL3,
    uniforms: { uColor: { value: new THREE.Color(0xdfe9f2) }, uOpacity: { value: 0.16 } },
    transparent: true, depthWrite: false,
  });
  // фаски по рёбрам деталей (на «Телефоне» — простые бруски)
  const box = ctx.bevel ? pushBevelBox : function (buf, b, skip, tile, tint) { pushBox(buf, b, skip, tile, tint); };
  // светящееся окно: тёплый свет изнутри ночью (яркость — ghostLight по ночи неба)
  const litGlass = new THREE.MeshStandardMaterial({ color: 0x15110c, emissive: 0xffb068, emissiveIntensity: 0, roughness: 0.15, metalness: 0, vertexColors: true });
  linkSky(litGlass);
  // панорамные стёкла, плафоны фонарей, вода и струи (feat-parts.js)
  const fm = createFeatureMaterials(!!ctx.pom);
  // свет фонаря (точечный, без тени) — один на здание, у первого готового фонаря. Источник — в сцене с самого начала
  // (сила 0, пока фонаря нет или день): появление источника посреди игры пересобрало бы все программы шейдеров —
  // на «Максимуме» рывок до 15 с. Группу здания сцена добавляет до первой сборки шейдеров (загрузка), источник —
  // следом (событие added). Дальность 6 м — светит кровля и стены у фонаря; без тени дальше он светил бы сквозь
  // кровлю на пол комнаты и землю под зданием (ftf1: tech-inside-night). На «Телефоне» — только плафон и пятно света.
  let lampLight = null, lampAt = null, lampStyle = 'warm', nightK = 0;
  function ensureLampLight() {
    if (lampLight || ctx.lampLight === false || !ctx.bevel || !group.parent) return;
    lampLight = new THREE.PointLight(0xffffff, 0, 6, 2);
    lampLight.name = 'lamp-light';
    lampLight.castShadow = false;
    // не в группу здания: её прячет вид квартала штаба, а невидимый источник выпадает из счёта — та же пересборка
    group.parent.add(lampLight);
  }
  group.addEventListener('added', ensureLampLight);
  const opts = {
    pillar: function (c) { return PILLAR[c.family] || 0.7; },
    glass: function (c) { return !!(c.glass && c.glass.built); },
  };

  // Прогрев программ шейдеров особых деталей и рам: по вырожденному треугольнику (без площади, под землёй) на материал
  // с теми же атрибутами, что у кусков. Их программы собираются с загрузкой — сборкой шейдеров площадки
  // (renderer.compile берёт и скрытые объекты) и в первых кадрах, — а не рывком, когда встанет первое
  // стекло-панорама, фонарь или вода. Три кадра видимы, дальше скрыты (вызовов отрисовки не стоят). Квартал штаба
  // (lampLight: false) без прогрева: программы общие, их собрало основное здание.
  const warmup = new THREE.Group();
  let warmFrames = 0;
  if (ctx.lampLight !== false) {
    const wb = newBuf();
    for (let i = 0; i < 3; i++) { wb.pos.push(0, -80, 0); wb.nrm.push(0, 1, 0); wb.uv.push(0, 0); wb.col.push(1, 1, 1); }
    wb.idx.push(0, 1, 2);
    const wg = makeGeometry(wb);
    [litGlass, fm.paneLit, fm.paneDim, fm.glow.cold, fm.glow.warm, fm.water, fm.fall, mats.glass, mats.planks, mats.blacksteel, mats.mortar].forEach(function (m) {
      const mesh = new THREE.Mesh(wg, m);
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      warmup.add(mesh);
    });
    warmup.name = 'feature-warmup';
    group.add(warmup);
    warmFrames = 3;
  }
  // «Телефон» — без источников света: пятно света под фонарём (прозрачный диск со спадом, складывается с полом).
  // Создано сразу, скрытым: его программа собирается с загрузкой, а не рывком в первую ночь
  let lampPool = null;
  if (!ctx.bevel && ctx.lampLight !== false) {
    lampPool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
      map: poolTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: true }));
    lampPool.name = 'lamp-pool';
    lampPool.renderOrder = 4;
    lampPool.visible = false;
    group.add(lampPool);
  }

  // Полосы свежего раствора под следующую пачку (мастерок ведёт её вдоль ряда): одна сетка экземплярами на все
  // растущие детали — один вызов отрисовки. Видна с загрузки три кадра одним экземпляром под землёй: программа
  // материала с экземплярами собирается тогда, а не рывком на первой укладке.
  const BEDS = 24;
  const bedMesh = new THREE.InstancedMesh(white(new THREE.BoxGeometry(1, 1, 1)), mats.mortar, BEDS);
  bedMesh.name = 'lay-beds';
  bedMesh.frustumCulled = false;
  bedMesh.castShadow = false;
  bedMesh.receiveShadow = true;
  bedMesh.userData.noGI = true;
  bedMesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, -80, 0));
  bedMesh.count = ctx.lampLight !== false ? 1 : 0;
  bedMesh.visible = bedMesh.count > 0;
  group.add(bedMesh);

  let world = null;
  let cells = new Map();          // клетка → { x, y, z, wall, glass, door, solid, kind, links, family, mat }
  let chunks = new Map();         // ключ куска → Group
  const dirty = new Set();
  let partials = new Map();       // id блока → { mesh, step, rv — пачка по единице (pushPack) }
  let ghost = null, ghostDirty = true, ghostTimer = 0;
  let builtSeen = 0;
  const seenBuilt = new Set();
  let showGhost = true;
  let chimneys = [];
  // створки дверей: клетка → { hinge, sign, base }; угол раскрытия живёт дольше куска (пересборка не захлопывает)
  const doors = new Map(), doorAngle = new Map();
  let lastT = 0;
  // ctx.merge («Телефон»): куски, не менявшиеся QUIET кадров (~2 с), рисуются слитыми — по мешу на материал на
  // «сверхкусок» 2 × 2 × 2 куска (16 клеток, по центру площадки; как участки квартала, city.js → mergeHouses), тень
  // сверхкуска — одним мешем: у почти готовой «Цитадели» 48 + 47 вызовов здания → 8 + 1. Пересобранный кусок выходит
  // из слияния своего сверхкуска в том же кадре, до тишины; время слияния не растёт с размером здания.
  const QUIET = 120;
  const merges = new Map();       // ключ сверхкуска → { sig, state }
  // и тень: все куски сверхкуска — одним мешем только для тени (geo.js → shadowProxy), пересборка — с каждым его куском
  const proxies = new Map();      // ключ сверхкуска → { sig, proxy }
  let frameNo = 0;
  const mergeStat = { merges: 0, ms: 0, max: 0 };
  // по x и z — пары кусков (−1, 0), (1, 2)… вокруг центра площадки, по высоте — (0, 1), (2, 3)… от земли
  const superKey = function (ck) { const p = ck.split(',').map(Number); return Math.floor((p[0] + 1) / 2) + ',' + Math.floor(p[1] / 2) + ',' + Math.floor((p[2] + 1) / 2); };

  const chunkKey = function (x, y, z) { return Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK) + ',' + Math.floor(z / CHUNK); };
  const get = function (x, y, z) { return cells.get(key3(x, y, z)); };
  // деталь клетки готова: стоит её стена (или дверь)
  const built = function (c) { return !!((c.wall && c.wall.built) || (c.door && c.door.built) || (c.hatch && c.hatch.built)); };
  // особый блок вне кладки (фонарь, вода) поставлен
  const featOf = function (c) { return c.water || c.lamp || null; };
  const featBuilt = function (c) { const f = featOf(c); return !!f && !!f.built; };
  const solidAt = function (x, y, z) { const c = get(x, y, z); return !!c && c.solid && built(c); };

  E.on(function (event) {
    if (!world) return;
    if (event.type === 'retrofitDoor' && event.block) rescan(event.block);
    else if (event.type === 'autofill' || event.type === 'lightning') rescan();
  });

  // Чертёж уровня: клетки всех блоков, их роли — один раз на площадку.
  function blueprint(blocks) {
    const map = new Map();
    blocks.forEach(function (b) {
      const k = key3(b.x, b.y, b.z);
      let c = map.get(k);
      if (!c) { c = { x: b.x, y: b.y, z: b.z, wall: null, glass: null, door: null, hatch: null, water: null, lamp: null, solid: false }; map.set(k, c); }
      if (b.glassOf !== undefined) c.glass = b;
      else if (b.feature === 'door') c.door = b;
      else if (b.feature === 'hatch') c.hatch = b;
      else if (b.feature === 'water') c.water = b;
      else if (b.feature === 'lamp') c.lamp = b;
      else c.wall = b;
    });
    map.forEach(function (c) {
      // вода и фонарь в логике не сплошные (feature-blocks.js → occupancy): не кладка
      c.solid = !!(c.wall || c.door || c.hatch);
      const main = c.wall || c.door || c.hatch || c.water || c.lamp;
      if (main) { c.mat = main.materialId; c.family = familyOf(MB, c.mat); }
    });
    // дверь по чертежу без своей стены — в кладке соседней стены (прорубленная — в своей)
    map.forEach(function (c) {
      if (!c.door || c.wall || c.door.additionalDoor) return;
      for (let i = 0; i < DIRS.length; i++) {
        const n = map.get(key3(c.x + DIRS[i][0], c.y, c.z + DIRS[i][1]));
        if (n && n.wall) { c.mat = n.wall.materialId; c.family = familyOf(MB, c.mat); break; }
      }
    });
    classify(map);
    // Трубы (plan.js → chimneyCells): дымят, когда верх поставлен (life.js). Шпили на навершиях, шесты, зубцы
    // и самоцветы — не трубы.
    chimneys = chimneyCells(map);
    return map;
  }

  function build(w) {
    clear();
    world = w;
    cells = blueprint(world.blocks);
    world.blocks.forEach(function (b) { dirty.add(chunkKey(b.x, b.y, b.z)); });
    builtSeen = -1;
    ghostDirty = true;
  }

  function clear() {
    merges.forEach(function (m) { if (m.state) unmergeMeshes(m.state); });
    merges.clear();
    proxies.forEach(function (p) { dropShadowProxy(p.proxy); });
    proxies.clear();
    chunks.forEach(function (g) { disposeGroup(g); group.remove(g); });
    chunks = new Map();
    partials.forEach(dropPartial);
    partials = new Map();
    plans.clear();
    if (ghost) { group.remove(ghost); ghost.geometry.dispose(); ghost = null; }
    if (camp) { disposeGroup(camp); group.remove(camp); camp = null; }
    campSig = '';
    doors.forEach(function (d) { DYNAMIC.delete(d.hinge); });
    doors.clear();
    doorAngle.clear();
    lampAt = null;
    if (lampPool) lampPool.visible = false;
    cells = new Map();
    seenBuilt.clear();
    dirty.clear();
    world = null;
  }

  function disposeGroup(g) {
    g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    // створки куска — из списка дверей и движущихся объектов (TAA)
    (g.userData.doors || []).forEach(function (k) { const d = doors.get(k); if (d) { DYNAMIC.delete(d.hinge); doors.delete(k); } });
  }

  // Что-то поменялось помимо обычной укладки: чертёж клеток заново (у блока, где логика прорубила дверь или люк,
  // feature теперь 'door' или 'hatch' — роль и детали клетки другие). Дверь — её кусок и соседние, иначе всё.
  // Роль прорубленной клетки меняет и соседей по диагонали (угловая вставка плиты смотрит на стену по диагонали):
  // куски всех 26 соседей.
  function rescan(block) {
    cells = blueprint(world.blocks);
    if (block) markAround(block, true);
    else world.blocks.forEach(function (b) { dirty.add(chunkKey(b.x, b.y, b.z)); });
    ghostDirty = true;
  }

  function markAround(b, diag) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      if (!diag && Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1) continue;
      dirty.add(chunkKey(b.x + dx, b.y + dy, b.z + dz));
    }
  }

  // Наборы буферов куска: кладка по семействам, плиты по своим семействам, рама, стекло, двери.
  function newSet() {
    return { solid: {}, plate: {}, steel: newBuf(), glass: newBuf(), lit: newBuf(), mortar: newBuf(), leaves: [], boxes: [],
      wood: newBuf(), paneLit: newBuf(), paneDim: newBuf(), glow: {}, water: newBuf(), fall: newBuf(), lamps: [] };
  }
  function plateFamily(c) { return PLATE_FAMILY[c.family] || c.family; }

  // Бруски детали клетки c в набор (clip — недостроенная: { h } по высоте или { w } полосами по x).
  function emit(set, c, getCell, isBuilt, clip) {
    const p = pieceBoxes(c, getCell, isBuilt, opts);
    const fam = c.family, pf = plateFamily(c);
    // каждая деталь чуть своего тона (партии кирпича и камня разные): ±4 % яркости, ±2 % тепла
    const jit = jitter(c.x, c.y, c.z);
    const tint = shade(tintOf(MB, c.mat, fam), jit);
    const ptint = shade(tintOf(MB, c.mat, pf), jit);
    const cut = function (list) {
      if (!clip) return list;
      // заходы плиты в стены (ext) — когда плита готова
      return list.filter(function (q) { return !q.ext; }).map(function (q) {
        const b = q.b.slice();
        if (clip.h !== undefined) b[4] = Math.min(b[4], c.y * CELL + clip.h);
        if (clip.w !== undefined) b[3] = Math.min(b[3], b[0] + clip.w * (q.b[3] - q.b[0]));
        // растущая деталь — со всеми гранями, кроме низа на земле
        return { b: b, skip: c.y === 0 ? [3] : [] };
      });
    };
    const solid = set.solid[fam] || (set.solid[fam] = newBuf());
    cut(p.solid).forEach(function (q) { box(solid, q.b, q.skip, familyTile(fam), tint, 0.022); });
    // растущая кладка: по верху ряда — свежий раствор, чуть шире ряда (у сруба и стали — без раствора)
    if (clip && clip.h !== undefined && clip.h < CELL - 1e-3 && clip.bed !== false && MORTAR_BED[fam]) {
      cut(p.solid).forEach(function (q) {
        const b = q.b;
        if (b[4] - b[1] < 0.02 || b[4] < c.y * CELL + clip.h - 1e-3) return;
        pushBox(set.mortar, [b[0] - 0.006, b[4] - 0.004, b[2] - 0.006, b[3] + 0.006, b[4] + 0.012, b[5] + 0.006], [3], [1, 1], WHITE);
      });
    }
    const tf = TRIM_FAMILY[fam] === undefined ? 'trim' : TRIM_FAMILY[fam];
    const trimBuf = tf ? (set.solid[tf] || (set.solid[tf] = newBuf())) : set.steel;
    const tt = tf ? tintHex(trimHex(MB, c), tf) : WHITE, ttile = tf ? familyTile(tf) : [1, 1];
    if (tf) cut(p.trim).forEach(function (q) { box(trimBuf, q.b, q.skip, ttile, tt, 0.012); });
    else cut(p.trim).forEach(function (q) { box(set.steel, q.b, q.skip, [1, 1], WHITE, 0.008); });
    if (p.plate.length) {
      const plate = set.plate[pf] || (set.plate[pf] = newBuf());
      cut(p.plate).forEach(function (q) { box(plate, q.b, q.skip, familyTile(pf), ptint, 0.015); });
    }
    // цилиндры (шест) растут по высоте вместе с деталью
    const top = clip && clip.h !== undefined ? c.y * CELL + clip.h : Infinity;
    p.rods.forEach(function (r) {
      if (clip && (clip.h === undefined || r.a[1] >= top)) return;
      const q = Math.min(r.b[1], top) === r.b[1] ? r : Object.assign({}, r, { b: [r.b[0], top, r.b[2]], cap: true, ball: false });
      rod(set, c, q, solid, trimBuf, tint, tt, ttile);
    });
    if (clip) return;
    p.pyr.forEach(function (q) { if (q.mat === 'steel') pushPyramid(set.steel, q.b, [1, 1], WHITE); else pushPyramid(trimBuf, q.b, ttile, tt); });
    p.wood.forEach(function (q) { box(set.wood, q.b, q.skip, familyTile('beam'), WHITE, 0.01); });
    p.steel.forEach(function (q) { pushBox(set.steel, q.b, q.skip, [1, 1], WHITE); });
    // ночью часть окон светится: внутри рабочий свет (окно выбрано по клетке, одно и то же каждую ночь); у
    // панорамы — 2/3, как у оригинала (paneOf), свет комнаты ярче к потолку
    const lit = jitter(c.x + 17, c.y, c.z)[0] < -0.05;
    const warm = 0.85 + 0.3 * (jitter(c.x, c.y + 5, c.z)[0] + 0.5);
    p.glass.forEach(function (q) {
      if (!q.pane) { pushBox(lit ? set.lit : set.glass, q.b, q.skip, [1, 1], WHITE); return; }
      const buf = q.pane === 'lit' ? set.paneLit : set.paneDim, from = buf.col.length;
      pushBox(buf, q.b, q.skip, [1, 1], WHITE);
      for (let i = from, v = from; i < buf.col.length; i += 3, v += 3) {
        const t = (buf.pos[v + 1] - q.b[1]) / Math.max(1e-3, q.b[4] - q.b[1]);
        const k = (0.42 + 0.58 * t * t) * warm;
        buf.col[i] = k; buf.col[i + 1] = k * (0.9 + 0.06 * t); buf.col[i + 2] = k * (0.78 + 0.12 * t);
      }
    });
    if (p.leaf) set.leaves.push(Object.assign({ key: key3(c.x, c.y, c.z) }, p.leaf));
    // бруски для проверки видимости (blocked): кладка, плиты и стёкла, без обрамлений
    p.solid.concat(p.plate, p.glass).forEach(function (q) { set.boxes.push(q.b); });
  }

  // Цилиндр детали в буфер своего материала: дерево — доски вдоль шеста, сталь, кладка клетки, рамки.
  function rod(set, c, r, solid, trimBuf, tint, tt, ttile) {
    // шест — строганое дерево: оттенок материала вполовину (иначе доски сосны рыжие, как окрашенные)
    if (r.mat === 'wood') { const t = tintOf(MB, c.mat, 'beam'); pushRod(set.wood, r, [3.0, 16 * Math.PI * r.r], [0.45 + 0.55 * t[0] * 0.8, 0.45 + 0.55 * t[1] * 0.85, 0.45 + 0.55 * t[2] * 0.9]); }
    else if (r.mat === 'steel') pushRod(set.steel, r, [1, 1], WHITE);
    else if (r.mat === 'trim') pushRod(trimBuf, r, ttile, tt);
    else pushRod(solid, r, familyTile(c.family), tint);
  }

  // Особый блок вне кладки (фонарь, вода) в набор: бруски, цилиндры, глади, пелены; точка света фонаря.
  // clip { h } — ставится: бруски и цилиндры до высоты h над низом клетки, без воды, плафона и крышки.
  function emitFeature(set, c, clip) {
    const p = featureBoxes(c, get, built);
    if (clip) {
      const top = c.y * CELL + clip.h;
      const cutB = function (list) { return list.filter(function (q) { return q.b[1] < top; }).map(function (q) { const b = q.b.slice(); b[4] = Math.min(b[4], top); return { b: b, skip: q.skip.filter(function (f) { return f !== 2; }) }; }); };
      p.solid = cutB(p.solid); p.trim = cutB(p.trim); p.steel = cutB(p.steel);
      p.rods = p.rods.filter(function (r) { return r.a[1] < top; }).map(function (r) { return r.b[1] <= top ? r : Object.assign({}, r, { b: [r.b[0], top, r.b[2]], cap: true, ball: false }); });
      p.glow = []; p.pyr = []; p.water = []; p.disks = []; p.falls = []; p.light = null;
    }
    const fam = c.family, jit = jitter(c.x, c.y, c.z);
    const tint = shade(tintOf(MB, c.mat, fam), jit);
    const solid = set.solid[fam] || (set.solid[fam] = newBuf());
    const tf = TRIM_FAMILY[fam] === undefined ? 'trim' : TRIM_FAMILY[fam];
    const trimBuf = tf ? (set.solid[tf] || (set.solid[tf] = newBuf())) : set.steel;
    const tt = tf ? tintHex(trimHex(MB, c), tf) : WHITE, ttile = tf ? familyTile(tf) : [1, 1];
    p.solid.forEach(function (q) { box(solid, q.b, q.skip, familyTile(fam), tint, 0.02); });
    p.trim.forEach(function (q) { box(trimBuf, q.b, q.skip, ttile, tt, 0.01); });
    p.steel.forEach(function (q) { box(set.steel, q.b, q.skip, [1, 1], WHITE, 0.006); });
    if (p.glow.length) {
      const style = c.lamp && c.lamp.style === 'cold' ? 'cold' : 'warm';
      const g = set.glow[style] || (set.glow[style] = newBuf());
      p.glow.forEach(function (q) { pushGlowBox(g, q.b, q.skip); });
      if (p.light) set.lamps.push({ at: p.light, style: style });
    }
    p.rods.forEach(function (r) { rod(set, c, r, solid, trimBuf, tint, tt, ttile); });
    p.pyr.forEach(function (q) { if (q.mat === 'steel') pushPyramid(set.steel, q.b, [1, 1], WHITE); else pushPyramid(trimBuf, q.b, ttile, tt); });
    p.water.forEach(function (w) { pushQuad(set.water, [[w.x0, w.y, w.z1], [w.x1, w.y, w.z1], [w.x1, w.y, w.z0], [w.x0, w.y, w.z0]], [0, 1, 0]); });
    p.disks.forEach(function (d) { pushDisk(set.water, d.x, d.y, d.z, d.r, 20); });
    p.falls.forEach(function (f) {
      if (f.quad) pushQuad(set.fall, f.quad, f.n);
      else if (f.path) pushTube(set.fall, f.path, f.rs, f.seg || 6, WHITE);
      else if (f.disk) pushDisk(set.fall, f.disk[0], f.disk[1], f.disk[2], f.r, 12);
      else pushRod(set.fall, { a: f.a, b: f.b, r: f.r, ri: f.ri, cap: !!f.cap, open: !!f.open, seg: f.seg || (f.open ? 24 : 10) }, [1, 1], WHITE);
    });
    p.solid.forEach(function (q) { set.boxes.push(q.b); });
  }

  // Меши набора в группу g.
  function flush(set, g) {
    let any = false;
    const add = function (buf, material, shadow) {
      if (!buf.idx.length) return;
      const mesh = new THREE.Mesh(makeGeometry(buf), material);
      buf.mesh = mesh;
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      g.add(mesh);
      any = true;
    };
    Object.keys(set.solid).forEach(function (f) { add(set.solid[f], familyMaterial(mats, f, ctx.pom), true); });
    Object.keys(set.plate).forEach(function (f) { add(set.plate[f], familyMaterial(mats, f, ctx.pom), true); });
    add(set.steel, mats.blacksteel, true);
    add(set.glass, mats.glass, false);
    add(set.lit, litGlass, false);
    add(set.mortar, mats.mortar, true);
    add(set.wood, mats.planks, true);
    add(set.paneLit, fm.paneLit, false);
    add(set.paneDim, fm.paneDim, false);
    Object.keys(set.glow).forEach(function (k) { add(set.glow[k], fm.glow[k], false); });
    add(set.water, fm.water, false);
    add(set.fall, fm.fall, false);
    if (set.leaves.length) g.userData.doors = [];
    set.leaves.forEach(function (l) { g.add(leafMesh(l)); g.userData.doors.push(l.key); any = true; });
    set.lamps.forEach(function (l) { if (!lampAt) { lampAt = l.at; lampStyle = l.style; } });
    return any;
  }

  // Тень сверхкусков (ctx.merge): кусок пересобран — тень его сверхкуска заново (до слияния: слитые меши тогда без тени).
  function shadowSupers() {
    const groups = new Map();
    chunks.forEach(function (g, ck) { const sk = superKey(ck); if (!groups.has(sk)) groups.set(sk, []); groups.get(sk).push(g); });
    proxies.forEach(function (p, sk) { if (!groups.has(sk)) { dropShadowProxy(p.proxy); proxies.delete(sk); } });
    groups.forEach(function (list, sk) {
      const sig = list.map(function (g) { return g.id; }).join(',');
      const p = proxies.get(sk);
      if (p && p.sig === sig) return;
      if (p) dropShadowProxy(p.proxy);
      const meshes = [];
      list.forEach(function (g) { g.children.forEach(function (o) { if (o.isMesh) meshes.push(o); }); });
      const proxy = shadowProxy(group, meshes, 'building-shadow');
      if (proxy) group.add(proxy.mesh);
      proxies.set(sk, { sig: sig, proxy: proxy });
    });
  }

  // Тихие куски — в слияние своего сверхкуска (ctx.merge): только меши материалов куска (створки дверей на петлях —
  // свои, ходят). Сливается не больше одного сверхкуска за кадр: после загрузки или полной пересборки все куски
  // затихают в одном кадре — остальные ждут своего (рисуются кусками). Выйти из слияния — сразу (пересобранный кусок
  // иначе виден старым).
  function mergeQuiet() {
    let budget = 1;
    const groups = new Map();
    chunks.forEach(function (g, ck) {
      const sk = superKey(ck);
      if (!groups.has(sk)) groups.set(sk, []);
      if (frameNo - g.userData.at > QUIET) groups.get(sk).push(g);
    });
    merges.forEach(function (m, sk) { if (!groups.has(sk)) { if (m.state) unmergeMeshes(m.state); merges.delete(sk); } });
    groups.forEach(function (members, sk) {
      const sig = members.map(function (g) { return g.id; }).join(',');
      const m = merges.get(sk);
      if (m && m.sig === sig) return;
      if (m && m.state) unmergeMeshes(m.state);
      let state = null;
      if (members.length > 1) {
        if (!budget) { merges.set(sk, { sig: null, state: null }); return; }
        budget--;
        const t0 = performance.now();
        const list = [];
        members.forEach(function (g) { g.children.forEach(function (o) { if (o.isMesh) list.push(o); }); });
        state = mergeMeshes(group, list, 'building-merged');
        group.add(state.group);
        const ms = performance.now() - t0;
        mergeStat.merges++; mergeStat.ms += ms; mergeStat.max = Math.max(mergeStat.max, ms);
      }
      merges.set(sk, { sig: sig, state: state });
    });
  }

  // Полотно двери: доски на петлях у косяка (доски вертикально), закрыто в плоскости стены; открывается внутрь
  // (от стороны face) перед рабочим — update().
  function leafMesh(l) {
    const geo = white(new THREE.BoxGeometry(l.w, l.h, 0.05));
    // доски вдоль высоты: u фактуры — по высоте полотна, v — по ширине (доска 0,2 м)
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * l.h / 3.0, u * l.w / 1.6); }
    const leaf = new THREE.Mesh(geo, mats.planks);
    leaf.geometry.translate(l.w / 2, l.h / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    // кованые полосы петель, узлы петель на косяке и ручка с обеих сторон — одним мешем (меньше вызовов отрисовки)
    const hw = newBuf();
    [0.28, l.h - 0.3].forEach(function (y) {
      pushBox(hw, [0.02, y - 0.0275, -0.029, 0.02 + l.w * 0.8, y + 0.0275, 0.029], null, [1, 1], WHITE);
      pushRod(hw, { a: [0, y - 0.06, 0], b: [0, y + 0.06, 0], r: 0.026, seg: 8 }, [1, 1], WHITE);
    });
    pushBox(hw, [l.w - 0.114, 0.95, -0.05, l.w - 0.086, 1.09, 0.05], null, [1, 1], WHITE);
    const hard = new THREE.Mesh(makeGeometry(hw), mats.blacksteel);
    hard.castShadow = true;
    leaf.add(hard);
    const hinge = new THREE.Group();
    // поворот на +угол уводит полотно вдоль x к −z, вдоль z (база −π/2) — к +x: внутрь — от стороны face
    const base = l.along === 'x' ? 0 : -Math.PI / 2, sign = l.along === 'x' ? l.out : -l.out;
    if (l.along === 'x') hinge.position.set(l.a, l.y, l.c); else hinge.position.set(l.c, l.y, l.a);
    hinge.add(leaf);
    const angle = doorAngle.get(l.key) || 0;
    hinge.rotation.y = base + sign * angle;
    doors.set(l.key, { hinge: hinge, base: base, sign: sign });
    markDynamic(hinge);
    return hinge;
  }

  // Кусок: готовые детали его клеток.
  function buildChunk(ck) {
    const old = chunks.get(ck);
    if (old) { disposeGroup(old); group.remove(old); chunks.delete(ck); }
    const parts = ck.split(',').map(Number);
    const set = newSet();
    for (let x = parts[0] * CHUNK; x < (parts[0] + 1) * CHUNK; x++) {
      for (let y = parts[1] * CHUNK; y < (parts[1] + 1) * CHUNK; y++) {
        for (let z = parts[2] * CHUNK; z < (parts[2] + 1) * CHUNK; z++) {
          const c = get(x, y, z);
          if (!c) continue;
          if (c.solid && built(c)) emit(set, c, get, built, null);
          else if (featBuilt(c)) emitFeature(set, c);
        }
      }
    }
    const g = new THREE.Group();
    g.userData.at = frameNo;
    if (flush(set, g)) {
      const lo = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      set.boxes.forEach(function (b) { for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], b[a]); lo[a + 3] = Math.max(lo[a + 3], b[a + 3]); } });
      g.userData.boxes = set.boxes;
      g.userData.bounds = lo;
      group.add(g);
      chunks.set(ck, g);
    }
  }

  // Доля отрезка from→to до первой готовой детали (1 — свободно): камера съёмки не заходит за стены. Бруски
  // кусков вместо обхода треугольников — несколько лучей за кадр стоят микросекунды.
  function blocked(from, to) {
    const o = [from.x, from.y, from.z], d = [to.x - from.x, to.y - from.y, to.z - from.z];
    let best = 1;
    const slab = function (b) {
      let t0 = 0, t1 = best;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(d[a]) < 1e-9) { if (o[a] < b[a] || o[a] > b[a + 3]) return 1; continue; }
        let ta = (b[a] - o[a]) / d[a], tb = (b[a + 3] - o[a]) / d[a];
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        if (ta > t0) t0 = ta;
        if (tb < t1) t1 = tb;
        if (t0 > t1) return 1;
      }
      return t0;
    };
    chunks.forEach(function (g) {
      const u = g.userData;
      if (!u.boxes || !u.boxes.length || slab(u.bounds) >= best) return;
      for (let i = 0; i < u.boxes.length; i++) { const t = slab(u.boxes[i]); if (t < best) best = t; }
    });
    return best;
  }

  // ---------- недостроенные детали ----------
  // Доля заливки: (poured + доля текущего мини-куба) / N³ (game.js → measureBadge).
  function fillOf(b) {
    const total = MB.pourTotal(b);
    let part = 0;
    if (b.owner >= 0) {
      const builder = world.builders[b.owner];
      if (builder && builder.phase === 'place' && builder.carry && builder.carry[0] === b) {
        const per = builder.actionT + builder.timer;
        part = per > 0 ? Math.min(1, builder.actionT / per) : 0;
      }
    }
    return Math.min(1, (b.poured + part) / total);
  }

  // ---------- кладка в такт рукам (ms-lay.js) ----------
  // план укладки детали: единицы её кладки в порядке укладки — один раз на укладку (сторона — клетка рабочего); деталь из
  // мини-кубов (grid ≥ 2, уровни с 19-го) держит план и между ходками: уложенное — единицами прежнего плана, новая
  // ходка (другой рабочий или другая сторона) переставляет только остаток (ms-lay.js → replan)
  const plans = new Map();        // id блока → { cells, owner, fam, course, special, plate, units, info }
  const CLOCK = {};
  let planSeq = 0;
  const _bm = new THREE.Matrix4(), _bs = new THREE.Vector3(), _bp = new THREE.Vector3(), _bq = new THREE.Quaternion();
  function planOf(b, c, builder) {
    let pl = plans.get(b.id);
    const side = [(builder.cell[0] + 0.5) * CELL, (builder.cell[2] + 0.5) * CELL];
    if (pl && pl.cells === cells && pl.owner === builder.index && Math.abs(pl.side[0] - side[0]) + Math.abs(pl.side[1] - side[1]) < 0.5) return pl;
    const old = pl && pl.cells === cells && !pl.special ? pl : null;
    const p = pieceBoxes(c, get, built, opts);
    const fam = c.family, course = FAMILY_TEX[fam] ? FAMILY_TEX[fam].course : 0.5;
    // шест, крест, навершие, люк в кладке и портал — растут рядами (в такт рукам, но не единицами)
    const special = p.rods.length > 0 || !!c.cross || !!c.finial || c.kind === 'cut' || (c.kind === 'hatch' && c.hatchBase !== 'plate') || (!p.solid.length && !p.plate.length);
    let units = special ? [] : layUnits(c, p, fam, course, c.y * CELL, side);
    // часть детали уже лежит (прежние ходки): она — первой, как лежит; остаток — по новой стойке (единицы те же; у
    // камня массива швы — по лицу, другие — дальше по прежнему плану)
    if (old && units.length && b.poured > 0) units = replan(old.units, Math.floor(old.units.length * b.poured / MB.pourTotal(b) + 1e-6), units) || old.units;
    // ящик детали (кладка и плита, без заходов в стены) — где встать каменщику (crew.js)
    const box = [Infinity, c.y * CELL, Infinity, -Infinity, (c.y + 1) * CELL, -Infinity];
    p.solid.concat(p.plate.filter(function (q) { return !q.ext; })).forEach(function (q) {
      box[0] = Math.min(box[0], q.b[0]); box[2] = Math.min(box[2], q.b[2]); box[3] = Math.max(box[3], q.b[3]); box[5] = Math.max(box[5], q.b[5]);
    });
    if (!(box[3] > box[0])) { box[0] = c.x * CELL + 0.8; box[2] = c.z * CELL + 0.8; box[3] = box[0] + 0.4; box[5] = box[2] + 0.4; }
    // у какого лица встанет рабочий: смотрит вдоль x — по оси, где его клетка дальше за краем ящика (как ms-lay.js →
    // layUnits: массив кладут рядами вдоль этого лица; crew.js → standFor встаёт у него же)
    const xView = Math.abs(side[0] - (box[0] + box[3]) / 2) - (box[3] - box[0]) / 2 >= Math.abs(side[1] - (box[2] + box[5]) / 2) - (box[5] - box[2]) / 2;
    pl = { id: ++planSeq, cells: cells, owner: builder.index, fam: fam, course: course, special: special || !units.length, plate: units.length > 0 && !!units[0].plate,
      units: units, span: units.length && units[0].plate ? 1 : HAND_SPAN[fam] || 2, prevW: 0, prevJ: -1, side: side,
      info: { mode: 'tied', K: 0, j: 0, c: 0, w: 0, cyc: 0, fam: fam, kind: c.kind, count: 0, laid: 0, pack: [0, 0, 0], hand: [0, 0, 0], tap: [0, 0, 0],
        from: [0, 0, 0], to: [0, 0, 0], bed: null, box: box, xView: xView, width: 0, mortar: false, block: b } };
    plans.set(b.id, pl);
    return pl;
  }
  // Ящик детали блока b и лицо, у которого встанет рабочий со стороны side [x, z] (как planOf), — до укладки: бригада
  // ведёт рабочего к стойке заранее, по последним шагам пути (crew.js → standFor, ms-lay.js → LAY.preview). Не кладка
  // (вода, фонарь, стекло) — null.
  const _pv = { box: null, xView: true, kind: '' };
  // зданий несколько (площадка и дома квартала штаба) — предпросмотр у того, чей это блок; дома квартала (lampLight:
  // false, создаются заново с каждым кварталом) — без рабочих, не регистрируются
  if (ctx.lampLight !== false) PREVIEWS.push({ has: function (b) { const c = world && b ? get(b.x, b.y, b.z) : null; return !!c && (c.wall === b || c.glass === b || c.door === b || c.hatch === b); }, preview: preview });
  function preview(b, side) {
    if (!world || !b) return null;
    const c = get(b.x, b.y, b.z);
    if (!c || !c.solid) return null;
    const p = pieceBoxes(c, get, built, opts);
    const box = _pv.box || (_pv.box = [0, 0, 0, 0, 0, 0]);
    box[0] = Infinity; box[1] = c.y * CELL; box[2] = Infinity; box[3] = -Infinity; box[4] = (c.y + 1) * CELL; box[5] = -Infinity;
    p.solid.concat(p.plate.filter(function (q) { return !q.ext; })).forEach(function (q) {
      box[0] = Math.min(box[0], q.b[0]); box[2] = Math.min(box[2], q.b[2]); box[3] = Math.max(box[3], q.b[3]); box[5] = Math.max(box[5], q.b[5]);
    });
    if (!(box[3] > box[0])) { box[0] = c.x * CELL + 0.8; box[2] = c.z * CELL + 0.8; box[3] = box[0] + 0.4; box[5] = box[2] + 0.4; }
    _pv.xView = Math.abs(side[0] - (box[0] + box[3]) / 2) - (box[3] - box[0]) / 2 >= Math.abs(side[1] - (box[2] + box[5]) / 2) - (box[5] - box[2]) / 2;
    _pv.kind = c.kind;
    return _pv;
  }
  // середина верха единиц пачки [ja, jb) у места u (номер в пачке, дробный) — плавно между соседними местами
  const _h0 = [0, 0, 0], _h1 = [0, 0, 0];
  function handAt(pl, ja, jb, u, out) {
    const n = jb - ja;
    u = Math.max(0, Math.min(n - 1, u));
    const i = Math.floor(u), t = u - i;
    centerOf(pl, ja, n, i, _h0);
    if (t > 0 && i + 1 < n) { centerOf(pl, ja, n, i + 1, _h1); for (let a = 0; a < 3; a++) _h0[a] += (_h1[a] - _h0[a]) * t; }
    out[0] = _h0[0]; out[1] = _h0[1]; out[2] = _h0[2];
    return out;
  }
  // середина верха span единиц подряд у единицы m пачки (по одной на ряд ступеньки — рука идёт по ступеньке ровно,
  // без зигзага по рядам)
  function centerOf(pl, ja, n, m, out) {
    const s = pl.span, lo = Math.max(0, Math.min(n - s, m - (s >> 1))), hi = Math.min(n, lo + s);
    let x = 0, y = 0, z = 0;
    for (let q = lo; q < hi; q++) { const b = pl.units[ja + q].b; x += b[0] + b[3]; z += b[2] + b[5]; y += b[4]; }
    out[0] = x / 2 / (hi - lo); out[1] = y / (hi - lo); out[2] = z / 2 / (hi - lo);
    return out;
  }
  // Сведения о пачке j для рук (crew.js, people.js): центр её верха, точка руки (середина единиц у места, где они
  // сейчас ложатся, на единицу вперёд — рука ИК догоняет цель), точка подбивки (на три единицы позади), постель —
  // нижний ряд пачки (мастерок ведёт раствор от from к to по её верху), ширина постели, сколько единиц и уложено.
  function packInfo(pl, ck, b) {
    const info = pl.info;
    info.mode = ck.mode; info.K = ck.K; info.j = ck.j; info.c = ck.c; info.w = ck.w; info.cyc = ck.cyc;
    info.count = 0; info.laid = 0; info.bed = null; info.block = b;
    const U = pl.units.length;
    if (ck.mode !== 'tied' || pl.special || !U) {
      // ряды: рука — к верху растущей детали
      layPoint(b, _bp.set((ck.builder.cell[0] + 0.5) * CELL, 0, (ck.builder.cell[2] + 0.5) * CELL), _bs);
      info.pack[0] = info.hand[0] = info.tap[0] = _bs.x; info.pack[1] = info.hand[1] = info.tap[1] = _bs.y; info.pack[2] = info.hand[2] = info.tap[2] = _bs.z;
      return info;
    }
    const r = packRange(U, ck, ck.j), ja = Math.min(r[0], U - 1), jb = Math.max(ja + 1, Math.min(r[1], U));
    let k0 = Infinity;
    for (let i = ja; i < jb; i++) if (pl.units[i].k < k0) k0 = pl.units[i].k;
    let sx = 0, sz = 0, top = -Infinity, n = 0;
    const bed = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    let first = null, last = null;
    for (let i = ja; i < jb; i++) {
      const q = pl.units[i].b;
      sx += (q[0] + q[3]) / 2; sz += (q[2] + q[5]) / 2; top = Math.max(top, q[4]); n++;
      if (pl.units[i].k !== k0) continue;
      for (let a = 0; a < 3; a++) { bed[a] = Math.min(bed[a], q[a]); bed[a + 3] = Math.max(bed[a + 3], q[a + 3]); }
      if (!first) first = q;
      last = q;
    }
    info.count = n;
    info.laid = Math.max(0, Math.min(n, laidCount(U, ck) - ja));
    info.pack[0] = sx / n; info.pack[1] = top; info.pack[2] = sz / n;
    // рука: единица, что ложится сейчас (w — доля окна), на единицу вперёд; подбивка — на три позади
    const u = ck.w * n - 0.5;
    handAt(pl, ja, jb, u + 1, info.hand);
    handAt(pl, ja, jb, u - 3, info.tap);
    info.bed = bed;
    // мастерок — от первой единицы ряда пачки к последней (вдоль ряда — по ходу единиц; одна единица — вдоль длинной
    // оси постели; у массива единицы во всю глубину, ряд — поперёк неё), по её низу
    const ux = (last[0] + last[3] - first[0] - first[3]) / 2, uz = (last[2] + last[5] - first[2] - first[5]) / 2;
    const ax = Math.abs(ux) + Math.abs(uz) > 0.05 ? Math.abs(ux) >= Math.abs(uz) : bed[3] - bed[0] >= bed[5] - bed[2];
    const fa = ax ? (first[0] + first[3]) / 2 : (first[2] + first[5]) / 2, la = ax ? (last[0] + last[3]) / 2 : (last[2] + last[5]) / 2;
    const lo = ax ? bed[0] : bed[2], hi = ax ? bed[3] : bed[5];
    const s0 = fa <= la ? lo : hi, s1 = fa <= la ? hi : lo;
    const mid = ax ? (bed[2] + bed[5]) / 2 : (bed[0] + bed[3]) / 2;
    info.from[0] = ax ? s0 : mid; info.from[1] = bed[1]; info.from[2] = ax ? mid : s0;
    info.to[0] = ax ? s1 : mid; info.to[1] = bed[1]; info.to[2] = ax ? mid : s1;
    info.width = ax ? bed[5] - bed[2] : bed[3] - bed[0];
    info.mortar = !!MORTAR_BED[pl.fam] || pl.fam === 'concrete';
    nearFace(pl, info, ax);
    return info;
  }
  // Массив (цоколь во всю клетку): рука, подбивка и мастерок — у ближнего лица, не глубже 0,3 м; полоса раствора —
  // по ближнему краю постели шириной 0,3 м. Стена, что уходит от рабочего (с торца), — нет: рука идёт вдоль ряда.
  function nearFace(pl, info, bedAlongX) {
    if (info.kind !== 'mass') return;
    // лицо со стороны рабочего — по оси, где он дальше за краем ящика (как crew.js → standFor)
    const B = info.box, sd = pl.side;
    const dx = sd[0] - (B[0] + B[3]) / 2, dz = sd[1] - (B[2] + B[5]) / 2;
    const fa = Math.abs(dx) - (B[3] - B[0]) / 2 >= Math.abs(dz) - (B[5] - B[2]) / 2 ? 0 : 2, sg = (fa === 0 ? dx : dz) >= 0 ? -1 : 1;
    if (B[fa + 3] - B[fa] <= 0.7) return;
    const near = sg > 0 ? B[fa] : B[fa + 3], lim = near + 0.3 * sg;
    const pull = function (P) { P[fa] = sg > 0 ? Math.min(P[fa], lim) : Math.max(P[fa], lim); };
    pull(info.hand); pull(info.tap); pull(info.pack);
    // постель поперёк взгляда (ряд вдоль лица) — полоса у лица; вдоль взгляда (ряд уходит от рабочего) — её начало
    if ((fa === 2) === bedAlongX) {
      const across = near + 0.15 * sg;
      info.from[fa] = info.to[fa] = across;
      info.width = Math.min(info.width, 0.3);
    } else { pull(info.from); pull(info.to); }
  }
  // Полоса раствора пачки: тянется за мастерком (PHASE.bed), под пачкой выступает швом, срезается (PHASE.trim).
  function bedStrip(info) {
    if (!info.bed || !info.mortar || bedMesh.count >= BEDS) return;
    const c = info.c;
    if (c < PHASE.bed[0] || c >= PHASE.trim[0] + 0.04) return;
    const s = THREE.MathUtils.smoothstep(c, PHASE.bed[0], PHASE.bed[1]);
    const f = info.from, t = info.to;
    const x0 = f[0], z0 = f[2], x1 = f[0] + (t[0] - f[0]) * s, z1 = f[2] + (t[2] - f[2]) * s;
    const ax = Math.abs(t[0] - f[0]) >= Math.abs(t[2] - f[2]);
    const w = info.width + 0.012;
    _bp.set((x0 + x1) / 2, f[1] + 0.005, (z0 + z1) / 2);
    _bs.set(ax ? Math.max(0.01, Math.abs(x1 - x0)) : w, 0.014, ax ? w : Math.max(0.01, Math.abs(z1 - z0)));
    bedMesh.setMatrixAt(bedMesh.count++, _bm.compose(_bp, _bq, _bs));
  }
  // единицы [a, b) рядов от minK — бруски в набор (смежные одного ряда сливаются); плита — своей кладкой
  function unitBuf(set, c, pl) {
    const fam = pl.plate ? plateFamily(c) : c.family;
    return { fam: fam, tint: shade(tintOf(MB, c.mat, fam), jitter(c.x, c.y, c.z)),
      buf: pl.plate ? (set.plate[fam] || (set.plate[fam] = newBuf())) : (set.solid[fam] || (set.solid[fam] = newBuf())) };
  }
  function pushUnits(set, c, pl, a, b, minK) {
    if (b <= a) return;
    const u = unitBuf(set, c, pl), skip = c.y === 0 ? [3] : [];
    mergeUnits(pl.units, a, b, minK).forEach(function (q) { pushBox(u.buf, q.b, skip, familyTile(u.fam), u.tint); });
  }
  // Пачка [a, b) — последней в своём буфере, по единице (без слияния): рука кладёт их по одной — видимая часть меша
  // (drawRange) растёт на единицу, сетка не пересобирается. ends — конец индексов каждой единицы.
  function pushPack(set, c, pl, a, b) {
    if (b <= a) return null;
    const u = unitBuf(set, c, pl), skip = c.y === 0 ? [3] : [];
    const rv = { buf: u.buf, base: u.buf.idx.length, ends: [], shown: -1, from: a };
    for (let i = a; i < b; i++) { pushBox(u.buf, pl.units[i].b, skip, familyTile(u.fam), u.tint); rv.ends.push(u.buf.idx.length); }
    return rv;
  }
  // видно m единиц пачки; события 'unit' — новым (ms-lay.js → LAY.listen)
  function reveal(p, pl, m) {
    const rv = p.rv;
    if (!rv || !rv.buf.mesh) return;
    m = Math.max(0, Math.min(rv.ends.length, m));
    if (rv.shown === m) return;
    if (LAY.listening() && rv.shown >= 0) {
      for (let i = rv.shown; i < m; i++) {
        const q = pl.units[rv.from + i].b;
        LAY.emit('unit', { block: pl.info.block, i: rv.from + i, at: [(q[0] + q[3]) / 2, q[4], (q[2] + q[5]) / 2], b: q });
      }
    }
    const n = m > 0 ? rv.ends[m - 1] : rv.base;
    rv.buf.mesh.geometry.setDrawRange(0, n);
    // пустой меш не рисуется вовсе (three с drawRange 0 всё равно зовёт отрисовку)
    rv.buf.mesh.visible = n > 0;
    rv.shown = m;
  }
  function dropPartial(p) {
    if (p.mesh) { group.remove(p.mesh); disposeGroup(p.mesh); p.mesh = null; }
    p.rv = null;
  }

  // Стекло окна (блок логики со стеклом — glassOf): в такт рукам (ms-lay.js) рама и стекло встают, когда рука вставляет
  // их в проём (первая пачка — рама, последняя — стекло; одна пачка — всё сразу, с половины окна «положить»); рядами —
  // по доле укладки (рама с 0,3, стекло с 0,6). Сведения о пачке: рука — к проёму со стороны рабочего, ящик — стена
  // клетки (у её лица встанет рабочий; проём ярусом выше — с подмостей, crew.js). Готово (built) — стекло в куске.
  const GLASS_OPTS = { pillar: function (c) { return opts.pillar(c); }, glass: function () { return true; } };
  function glassPartial(b, seen, active) {
    const c = get(b.x, b.y, b.z);
    const ck = c && c.solid && c.glass === b ? layClock(MB, world, b, 'glass', CLOCK) : null;
    if (!ck) { LAY.info.delete(b); return; }
    active.add(b.id);
    let pl = plans.get(b.id);
    const side = [(ck.builder.cell[0] + 0.5) * CELL, (ck.builder.cell[2] + 0.5) * CELL];
    if (!pl || pl.cells !== cells || !pl.glassP || Math.abs(pl.side[0] - side[0]) + Math.abs(pl.side[1] - side[1]) > 0.5) {
      const p = pieceBoxes(c, get, built, GLASS_OPTS);
      const box = [Infinity, c.y * CELL, Infinity, -Infinity, (c.y + 1) * CELL, -Infinity];
      p.solid.forEach(function (q) { box[0] = Math.min(box[0], q.b[0]); box[2] = Math.min(box[2], q.b[2]); box[3] = Math.max(box[3], q.b[3]); box[5] = Math.max(box[5], q.b[5]); });
      if (!(box[3] > box[0])) { box[0] = c.x * CELL + 0.8; box[2] = c.z * CELL + 0.8; box[3] = box[0] + 0.4; box[5] = box[2] + 0.4; }
      const xView = Math.abs(side[0] - (box[0] + box[3]) / 2) - (box[3] - box[0]) / 2 >= Math.abs(side[1] - (box[2] + box[5]) / 2) - (box[5] - box[2]) / 2;
      const g = p.glass.length ? p.glass[0].b : [box[0], box[1] + 1, box[2], box[3], box[1] + 1.4, box[5]];
      // рука — у проёма со стороны рабочего (на 6 см от стекла)
      const gx = (g[0] + g[3]) / 2, gy = (g[1] + g[4]) / 2, gz = (g[2] + g[5]) / 2, thinX = g[3] - g[0] < g[5] - g[2];
      const sg = thinX ? Math.sign(side[0] - gx) || 1 : Math.sign(side[1] - gz) || 1;
      const pk = [gx + (thinX ? sg * 0.06 : 0), gy, gz + (thinX ? 0 : sg * 0.06)];
      pl = { id: ++planSeq, cells: cells, owner: ck.builder.index, glassP: p, side: side, special: true, units: [], prevJ: -1, prevW: 0, shown: -1,
        info: { mode: 'tied', K: 0, j: 0, c: 0, w: 0, cyc: 0, fam: 'glass', kind: 'glass', count: 1, laid: 0, pack: pk, hand: pk.slice(), tap: pk.slice(),
          from: pk.slice(), to: pk.slice(), bed: null, box: box, xView: xView, width: 0, mortar: false, block: b } };
      plans.set(b.id, pl);
    }
    const info = pl.info;
    info.mode = ck.mode; info.K = ck.K; info.j = ck.j; info.c = ck.c; info.w = ck.w; info.cyc = ck.cyc; info.block = b;
    // сколько частей вставлено: 0, 1 — рама, 2 — рама и стекло
    const tied = ck.mode === 'tied';
    const n = tied ? (ck.K <= 1 ? (ck.w >= 0.5 ? 2 : 0) : ck.j === ck.K - 1 && ck.w >= 0.5 ? 2 : ck.j > 0 || ck.w >= 0.5 ? 1 : 0) : (ck.fill >= 0.6 ? 2 : ck.fill >= 0.3 ? 1 : 0);
    info.laid = n; info.count = 1;
    LAY.info.set(b, info);
    if (!n) return;
    seen.add(b.id);
    let p = partials.get(b.id);
    if (!p) { p = { mesh: null, rv: null, step: -1 }; partials.set(b.id, p); }
    if (p.step === 'g' + n) return;
    p.step = 'g' + n;
    dropPartial(p);
    const set = newSet();
    pl.glassP.steel.forEach(function (q) { pushBox(set.steel, q.b, q.skip, [1, 1], WHITE); });
    if (n >= 2) pl.glassP.glass.forEach(function (q) { pushBox(set.glass, q.b, q.skip, [1, 1], WHITE); });
    const g = new THREE.Group();
    flush(set, g);
    p.mesh = g;
    group.add(g);
    // событие кладки: часть легла (проверки — rv-fin*.mjs, эффекты)
    if (LAY.listening() && pl.shown !== n) {
      const q = (n >= 2 ? pl.glassP.glass[0] : pl.glassP.steel[0]);
      if (q) LAY.emit('unit', { block: b, i: n - 1, at: [(q.b[0] + q.b[3]) / 2, q.b[4], (q.b[2] + q.b[5]) / 2], b: q.b });
    }
    pl.shown = n;
  }
  function updatePartials(dt) {
    const seen = new Set(), active = new Set();
    bedMesh.count = 0;
    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.built) continue;
      if (b.glassOf !== undefined) { glassPartial(b, seen, active); continue; }
      const c = get(b.x, b.y, b.z);
      const feat = !!c && !c.solid && featOf(c) === b;
      if (!c || (!c.solid && !feat)) continue;
      // часы рук: на ×1 — пачками в такт (tied), иначе рядами по доле заливки
      const ck = feat ? null : layClock(MB, world, b, c.family, CLOCK);
      const tied = !!ck && ck.mode === 'tied';
      const pl = ck ? planOf(b, c, ck.builder) : null;
      // никто не кладёт, а часть уложена прежними ходками (grid ≥ 2): видно ровно уложенные единицы плана
      const kept = !ck && !feat && b.poured > 0 && LAY.tempo < 5 ? plans.get(b.id) : null;
      const keep = !!kept && kept.cells === cells && !kept.special && kept.units.length > 0;
      if (ck) {
        active.add(b.id);
        LAY.info.set(b, packInfo(pl, ck, b));
        if (tied) {
          bedStrip(pl.info);
          // пачка уложена (окно кончилось или пошёл следующий цикл)
          if (LAY.listening() && pl.prevJ >= 0 && ((ck.j === pl.prevJ && pl.prevW < 1 && ck.w >= 1) || (ck.j > pl.prevJ && pl.prevW < 1))) LAY.emit('pack', { block: b, j: pl.prevJ, K: ck.K });
          pl.prevJ = ck.j; pl.prevW = ck.w;
        }
      } else LAY.info.delete(b);
      const fill = tied ? ck.frac : fillOf(b);
      if (fill <= 0.001 && !(tied && !pl.special)) continue;
      seen.add(b.id);
      let p = partials.get(b.id);
      if (!p) { p = { mesh: null, rv: null, step: -1 }; partials.set(b.id, p); }
      // стена растёт рядами своей кладки, плита — полосами по 0,5 м; фонарь и бассейн — по 0,25 м (вода — готовым);
      // в такт рукам — единицами: пачки до текущей — сеткой, текущая — по единице от руки (drawRange)
      let clip = null, step, laid = -1, from = -1, to = -1;
      if (tied && !pl.special) {
        const U = pl.units.length, r = packRange(U, ck, ck.j);
        from = Math.min(r[0], U); to = Math.min(r[1], U);
        laid = Math.max(from, Math.min(to, laidCount(U, ck)));
        step = 'p' + pl.id + ':' + from + ':' + to;
      } else if (keep) {
        laid = from = to = Math.min(kept.units.length, Math.floor(kept.units.length * b.poured / MB.pourTotal(b) + 1e-6));
        step = 'k' + kept.id + ':' + laid;
      } else if (feat) {
        step = Math.max(0.25, Math.ceil(fill * 8 - 1e-6) / 4);
        clip = { h: step };
      } else if (c.kind === 'plate') {
        step = Math.max(1, Math.ceil(fill * 4 - 1e-6));
        clip = { w: step / 4 };
      } else {
        const course = FAMILY_TEX[c.family].course;
        const h = Math.min(CELL, Math.max(course, Math.ceil(fill * CELL / course - 1e-6) * course));
        step = h;
        clip = { h: h };
      }
      if (p.step === step) {
        if (p.rv) reveal(p, pl, laid - from);
        continue;
      }
      p.step = step;
      dropPartial(p);
      const set = newSet();
      if (laid >= 0) {
        // целые ряды — деталью с рамками (как рядами), начатые ряды — единицами, текущая пачка — по единице
        const px = keep ? kept : pl;
        const hb = px.plate ? 0 : fullCourses(px.units, from);
        if (hb > 0) emit(set, c, get, built, { h: hb * px.course, bed: false });
        pushUnits(set, c, px, 0, from, hb);
        p.rv = pushPack(set, c, px, from, to);
      } else if (feat) emitFeature(set, c, clip); else emit(set, c, get, built, clip);
      const g = new THREE.Group();
      flush(set, g);
      p.mesh = g;
      group.add(g);
      if (p.rv) reveal(p, pl, laid - from);
    }
    partials.forEach(function (p, id) {
      if (seen.has(id)) return;
      dropPartial(p);
      partials.delete(id);
    });
    // планы укладки — пока блок у рабочего и пока деталь из мини-кубов не достроена (уложенное — по плану)
    plans.forEach(function (pl, id) { const b = pl.info.block; if (!active.has(id) && (!b || b.built || !(b.poured > 0))) plans.delete(id); });
    bedMesh.visible = bedMesh.count > 0;
    if (bedMesh.count) bedMesh.instanceMatrix.needsUpdate = true;
  }

  // Куда тянется рука каменщика: верх растущей детали блока b у стороны рабочего (from — его стопы, мир).
  // Стена и колонна — у оси клетки на полтолщины к нему, массив и плита — у ближнего края.
  // Фонарь — как колонна (тонкий столбик у оси), бассейн — как массив (у ближнего края), верх — не выше их деталей.
  function layPoint(b, from, out) {
    if (!world) return false;
    const c = get(b.x, b.y, b.z);
    const feat = !!c && !c.solid && featOf(c) === b;
    if (!c || (!c.solid && !feat)) return false;
    const x0 = b.x * CELL, y0 = b.y * CELL, z0 = b.z * CELL, cx = x0 + CELL / 2, cz = z0 + CELL / 2;
    const kind = feat ? (c.lamp ? 'pillar' : 'mass') : c.kind, cap = feat ? (c.lamp ? 1.66 : 1.05) : CELL;
    const top = kind === 'plate' ? y0 + CELL - 0.005 : y0 + Math.min(cap, CELL * Math.max(0.04, b.built ? 1 : fillOf(b)));
    const dx = from.x - cx, dz = from.z - cz, d = Math.hypot(dx, dz) || 1;
    const off = kind === 'wall' || kind === 'pillar' ? 0.16 : Math.max(0, Math.min(0.85, d - 0.4));
    out.set(cx + dx / d * off, top, cz + dz / d * off);
    return true;
  }

  // ---------- контур будущих деталей ----------
  function buildGhost() {
    if (ghost) { group.remove(ghost); ghost.geometry.dispose(); ghost = null; }
    if (!showGhost) return;
    const pos = [];
    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.built || b.glassOf !== undefined || b.poured > 0 || b.owner >= 0) continue;
      // только фронт работ: детали на земле или рядом с готовыми (разметка следующего ряда, а не всё здание)
      if (b.y > 0 && !solidAt(b.x, b.y - 1, b.z) && !solidAt(b.x + 1, b.y, b.z) && !solidAt(b.x - 1, b.y, b.z) && !solidAt(b.x, b.y, b.z + 1) && !solidAt(b.x, b.y, b.z - 1)) continue;
      const c = get(b.x, b.y, b.z);
      if (!c) continue;
      let list = [];
      if (c.solid) { const p = pieceBoxes(c, get, built, opts); list = p.solid.concat(p.plate, p.trim.filter(function (q) { return q.post; })); }
      // особые блоки (вода, фонарь) — контур их брусков: дно и бортики, пята и фонарь
      else if (featOf(c) === b) { const p = featureBoxes(c, get, built); list = p.solid.concat(p.steel); }
      list.forEach(function (q) {
        BOX_EDGES.forEach(function (e) { pos.push(q.b[e[0]], q.b[e[1]], q.b[e[2]], q.b[e[3]], q.b[e[4]], q.b[e[5]]); });
      });
    }
    if (!pos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    ghost = new THREE.LineSegments(g, ghostMat);
    ghost.frustumCulled = false;
    ghost.renderOrder = 5;
    group.add(ghost);
  }

  // ---------- городок ----------
  // Постройки городка (world.camp: кухня, продажи… — с 11-го уровня у эталонного игрока): поставленные
  // кубы (done) — те же детали; воксель городка — клетка (balance.json → canteen.voxel = 1).
  let camp = null, campSig = '';
  function updateCamp() {
    const sites = world.camp || [];
    let sig = '';
    for (let i = 0; i < sites.length; i++) {
      let done = 0;
      for (let k = 0; k < sites[i].cubes.length; k++) if (sites[i].cubes[k].done) done++;
      sig += sites[i].id + ':' + sites[i].cubes.length + ':' + done + ';';
    }
    if (sig === campSig) return;
    campSig = sig;
    if (camp) { disposeGroup(camp); group.remove(camp); camp = null; }
    const map = new Map();
    sites.forEach(function (site) {
      site.cubes.forEach(function (cube) {
        const c = { x: cube.x, y: cube.y, z: cube.z, solid: true, cube: cube, mat: cube.materialId, family: familyOf(MB, cube.materialId) };
        map.set(key3(c.x, c.y, c.z), c);
      });
    });
    if (!map.size) return;
    classify(map);
    const getCamp = function (x, y, z) { return map.get(key3(x, y, z)); };
    const doneCamp = function (c) { return !!c.cube.done; };
    const set = newSet();
    map.forEach(function (c) { if (c.cube.done) emit(set, c, getCamp, doneCamp, null); });
    camp = new THREE.Group();
    flush(set, camp);
    group.add(camp);
    if (ctx.onChange) ctx.onChange();
  }

  // Створки (feature-blocks.js → update): открыта, пока рабочий идёт из клетки двери или в неё; на 0,46π
  // со скоростью 5 рад/с, как у оригинала. Сверх оригинала — и пока рабочий стоит в проёме (кладёт, лезет,
  // отдыхает): полотно не проходит сквозь него. Вода колышется, фонарь светит у первого готового фонаря.
  const OPEN = Math.PI * 0.46;
  const openNow = new Set();
  function animate(dt) {
    openNow.clear();
    const list = doors.size ? world.builders || [] : [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.cell) openNow.add(key3(b.cell[0], b.cell[1], b.cell[2]));
      if (b.phase !== 'walk' || !b.from || !b.to) continue;
      openNow.add(key3(b.from[0], b.from[1], b.from[2]));
      openNow.add(key3(b.to[0], b.to[1], b.to[2]));
    }
    doors.forEach(function (d, k) {
      const target = openNow.has(k) ? OPEN : 0;
      let a = doorAngle.get(k) || 0;
      if (a === target) return;
      a = target > a ? Math.min(target, a + dt * 5) : Math.max(target, a - dt * 5);
      doorAngle.set(k, a);
      d.hinge.rotation.y = d.base + d.sign * a;
    });
    fm.tick(dt);
    ensureLampLight();
    if (lampLight) {
      if (lampAt) lampLight.position.set(lampAt[0], lampAt[1], lampAt[2]);
      lampLight.color.setHex(lampStyle === 'cold' ? 0xcfe0ff : 0xffbd78);
      lampLight.intensity = lampAt && group.visible ? 26 * nightK : 0;
    }
    // «Телефон»: пятно света под фонарём
    if (lampPool && lampAt) {
      lampPool.position.set(lampAt[0], lampAt[1] - 1.0, lampAt[2]);
      lampPool.material.color.setHex(lampStyle === 'cold' ? 0x9fb8e0 : 0xe0a060).multiplyScalar(0.2 * nightK);
      lampPool.visible = nightK > 0.01;
    } else if (lampPool) lampPool.visible = false;
  }
  function poolTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    // спад как у точечного света: ярко у столбика, к краю — на нет
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.15, 'rgba(255,255,255,0.7)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.18)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Кадр: новые готовые детали → их куски; растущие детали; контур; городок; створки, вода, свет фонаря.
  // dt — с прошлого кадра (по часам страницы, если вид его не передал).
  function update(dtIn) {
    if (warmFrames > 0 && --warmFrames === 0) warmup.visible = false;
    if (!world) return;
    const now = performance.now();
    const dt = typeof dtIn === 'number' ? dtIn : Math.min(0.1, lastT ? (now - lastT) / 1000 : 0);
    lastT = now;
    updateCamp();
    const done = world.blocks.length - world.remaining;
    if (done !== builtSeen) {
      // поля блоков логики не трогаем: что уже нарисовано готовым — свой набор id
      world.blocks.forEach(function (b) {
        if (b.built === seenBuilt.has(b.id)) return;
        if (b.built) seenBuilt.add(b.id); else seenBuilt.delete(b.id);
        markAround(b);
        // деталь встала: облачко пыли по её верху (life.js); не при первой сборке площадки
        if (b.built && builtSeen >= 0 && ctx.onPiece && b.glassOf === undefined) {
          const c = get(b.x, b.y, b.z);
          if (c && c.solid) ctx.onPiece((b.x + 0.5) * CELL, (b.y + 1) * CELL - (c.kind === 'plate' ? 0.01 : 0), (b.z + 0.5) * CELL, c.kind);
        }
      });
      builtSeen = done;
      ghostDirty = true;
    }
    frameNo++;
    if (dirty.size) {
      dirty.forEach(buildChunk);
      dirty.clear();
      if (ctx.onChange) ctx.onChange();
    }
    if (ctx.merge) { shadowSupers(); mergeQuiet(); }
    updatePartials(Math.max(0, dt));
    // контур — раз в полсекунды хватает (новые взятые детали пропадают из него)
    ghostTimer += 1;
    if (ghostDirty || ghostTimer > 30) { buildGhost(); ghostDirty = false; ghostTimer = 0; }
    animate(Math.max(0, dt));
  }

  return {
    group, build, update, clear, layPoint, blocked,
    // верх готовых труб (мир, м) — дым
    chimneyTops: function () {
      return chimneys.filter(built).map(function (c) { return { x: (c.x + 0.5) * CELL, y: (c.y + 1) * CELL + 0.07, z: (c.z + 0.5) * CELL, big: c.y > 8 }; });
    },
    setGhost: function (on) { showGhost = !!on; ghostDirty = true; return showGhost; },
    // разметка не светится сама: ночью тусклее (night 0..1 — неба)
    ghostLight: function (night) {
      ghostMat.uniforms.uOpacity.value = 0.16 * (1 - 0.95 * night);
      nightK = THREE.MathUtils.smoothstep(night, 0.2, 0.7);
      litGlass.emissiveIntensity = 2.4 * nightK;
      fm.night(nightK);
    },
    // створки дверей (проверки, снимки): клетка → угол раскрытия, рад
    doors: function () { const o = {}; doors.forEach(function (d, k) { o[k] = Math.round((doorAngle.get(k) || 0) * 100) / 100; }); return o; },
    // проходы, открывающие створки в последнем кадре, и двери (проверки)
    doorDebug: function () { return { world: !!world, open: Array.from(openNow), keys: Array.from(doors.keys()), t: lastT }; },
    // слияние тихих кусков (ctx.merge): сколько раз и время, мс; куски, сверхкуски, спрятанные слиянием меши (проверки)
    mergeInfo: function () { let hidden = 0; merges.forEach(function (m) { if (m.state) hidden += m.state.hidden.length; }); return { merges: mergeStat.merges, ms: Math.round(mergeStat.ms * 10) / 10, max: Math.round(mergeStat.max * 10) / 10, chunks: chunks.size, groups: merges.size, merged: hidden }; },
    // свет фонаря: точка и сила (проверки)
    lamp: function () { return lampLight ? { at: lampAt, intensity: lampLight.intensity } : lampAt ? { at: lampAt, intensity: 0 } : null; },
    ghostOn: function () { return showGhost; },
    // роль клетки (подход рабочего, проверки, снимки): фонарь — тонкий столбик, к нему подходят как к колонне;
    // вода — не опора и не кладка (null)
    kindAt: function (x, y, z) { const c = get(x, y, z); return c && c.solid ? c.kind : c && c.lamp ? 'pillar' : null; },
  };
}
