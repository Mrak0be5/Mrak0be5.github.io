// Здание оригинала (logic.js → world.blocks) деталями, как в Rust: клетка логики 2 м — одна деталь — фундамент,
// стена, окно в проёме, дверной проём, колонна, перекрытие (роли — plan.js). Стены и плиты одной кладки
// сливаются: фактура лежит в мировых координатах (ряды кирпича идут через детали), грани у готовых соседей не
// рисуются. Сетка разбита на куски 8 × 8 × 8 клеток — при постройке детали пересобирается её кусок (и соседний,
// если деталь на границе). Недостроенная деталь растёт рядами своей кладки (плита — полосами) на долю
// (poured + доля текущего мини-куба) / N³, как кольцо над рабочим в оригинале. Будущие детали фронта работ —
// тонкий контур (подсветка оригинала). Постройки городка — те же детали.
import * as THREE from 'three';
import { CELL, familyOf, familyMaterial, familyTile, tintOf, tintHex, FAMILY_TEX } from './families.js?v=f4726a0';
import { classify, pieceBoxes, key3, DIRS } from './plan.js?v=f4726a0';
import { linkSky } from './world.js?v=f4726a0';

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
  const opts = {
    pillar: function (c) { return PILLAR[c.family] || 0.7; },
    glass: function (c) { return !!(c.glass && c.glass.built); },
  };

  let world = null;
  let cells = new Map();          // клетка → { x, y, z, wall, glass, door, solid, kind, links, family, mat }
  let chunks = new Map();         // ключ куска → Group
  const dirty = new Set();
  let partials = new Map();       // id блока → { mesh, step }
  let ghost = null, ghostDirty = true, ghostTimer = 0;
  let builtSeen = 0;
  const seenBuilt = new Set();
  let showGhost = true;
  let chimneys = [];

  const chunkKey = function (x, y, z) { return Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK) + ',' + Math.floor(z / CHUNK); };
  const get = function (x, y, z) { return cells.get(key3(x, y, z)); };
  // деталь клетки готова: стоит её стена (или дверь)
  const built = function (c) { return !!((c.wall && c.wall.built) || (c.door && c.door.built)); };
  const solidAt = function (x, y, z) { const c = get(x, y, z); return !!c && c.solid && built(c); };

  E.on(function (event) {
    if (!world) return;
    if (event.type === 'retrofitDoor' || event.type === 'autofill' || event.type === 'lightning') rescan();
  });

  // Чертёж уровня: клетки всех блоков, их роли — один раз на площадку.
  function blueprint(blocks) {
    const map = new Map();
    blocks.forEach(function (b) {
      const k = key3(b.x, b.y, b.z);
      let c = map.get(k);
      if (!c) { c = { x: b.x, y: b.y, z: b.z, wall: null, glass: null, door: null, solid: false }; map.set(k, c); }
      if (b.glassOf !== undefined) c.glass = b;
      else if (b.feature === 'door') c.door = b;
      else c.wall = b;
    });
    map.forEach(function (c) {
      c.solid = !!(c.wall || c.door);
      const main = c.wall || c.door;
      if (main) { c.mat = main.materialId; c.family = familyOf(MB, c.mat); }
    });
    // дверь без своей стены — в кладке соседней стены
    map.forEach(function (c) {
      if (!c.door || c.wall) return;
      for (let i = 0; i < DIRS.length; i++) {
        const n = map.get(key3(c.x + DIRS[i][0], c.y, c.z + DIRS[i][1]));
        if (n && n.wall) { c.mat = n.wall.materialId; c.family = familyOf(MB, c.mat); break; }
      }
    });
    classify(map);
    // Трубы: столб колонн в 2+ клетки со свободным верхом — самый высокий в здании или высокий (5+). Дымят,
    // когда верх поставлен (life.js). Пинакли и колонны двора — ниже верха здания и короткие.
    chimneys = [];
    let maxY = 0;
    map.forEach(function (c) { if (c.solid) maxY = Math.max(maxY, c.y); });
    map.forEach(function (c) {
      if (!c.solid || c.kind !== 'pillar') return;
      const up = map.get(key3(c.x, c.y + 1, c.z));
      if (up && up.solid) return;
      let n = 1;
      for (;;) { const d = map.get(key3(c.x, c.y - n, c.z)); if (!d || !d.solid || d.kind !== 'pillar') break; n++; }
      if (n >= 2 && (c.y === maxY || n >= 5)) chimneys.push(c);
    });
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
    chunks.forEach(function (g) { disposeGroup(g); group.remove(g); });
    chunks = new Map();
    partials.forEach(function (p) { if (p.mesh) { group.remove(p.mesh); disposeGroup(p.mesh); } });
    partials = new Map();
    if (ghost) { group.remove(ghost); ghost.geometry.dispose(); ghost = null; }
    if (camp) { disposeGroup(camp); group.remove(camp); camp = null; }
    campSig = '';
    cells = new Map();
    seenBuilt.clear();
    dirty.clear();
    world = null;
  }

  function disposeGroup(g) {
    g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
  }

  // Что-то поменялось помимо обычной укладки (дверь в стене, автодостройка): всё заново.
  function rescan() {
    world.blocks.forEach(function (b) { dirty.add(chunkKey(b.x, b.y, b.z)); });
    ghostDirty = true;
  }

  function markAround(b) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1) continue;
      dirty.add(chunkKey(b.x + dx, b.y + dy, b.z + dz));
    }
  }

  // Наборы буферов куска: кладка по семействам, плиты по своим семействам, рама, стекло, двери.
  function newSet() { return { solid: {}, plate: {}, steel: newBuf(), glass: newBuf(), lit: newBuf(), mortar: newBuf(), leaves: [], boxes: [] }; }
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
    if (clip && clip.h !== undefined && clip.h < CELL - 1e-3 && MORTAR_BED[fam]) {
      cut(p.solid).forEach(function (q) {
        const b = q.b;
        if (b[4] - b[1] < 0.02 || b[4] < c.y * CELL + clip.h - 1e-3) return;
        pushBox(set.mortar, [b[0] - 0.006, b[4] - 0.004, b[2] - 0.006, b[3] + 0.006, b[4] + 0.012, b[5] + 0.006], [3], [1, 1], WHITE);
      });
    }
    const tf = TRIM_FAMILY[fam] === undefined ? 'trim' : TRIM_FAMILY[fam];
    if (tf) {
      const trim = set.solid[tf] || (set.solid[tf] = newBuf());
      const tt = tintHex(trimHex(MB, c), tf);
      cut(p.trim).forEach(function (q) { box(trim, q.b, q.skip, familyTile(tf), tt, 0.012); });
    } else cut(p.trim).forEach(function (q) { box(set.steel, q.b, q.skip, [1, 1], WHITE, 0.008); });
    if (p.plate.length) {
      const plate = set.plate[pf] || (set.plate[pf] = newBuf());
      cut(p.plate).forEach(function (q) { box(plate, q.b, q.skip, familyTile(pf), ptint, 0.015); });
    }
    if (clip) return;
    p.steel.forEach(function (q) { pushBox(set.steel, q.b, q.skip, [1, 1], WHITE); });
    // ночью часть окон светится: внутри рабочий свет (окно выбрано по клетке, одно и то же каждую ночь)
    const lit = jitter(c.x + 17, c.y, c.z)[0] < -0.05;
    p.glass.forEach(function (q) { pushBox(lit ? set.lit : set.glass, q.b, q.skip, [1, 1], WHITE); });
    if (p.leaf) set.leaves.push(p.leaf);
    // бруски для проверки видимости (blocked): кладка, плиты и стёкла, без обрамлений
    p.solid.concat(p.plate, p.glass).forEach(function (q) { set.boxes.push(q.b); });
  }

  // Меши набора в группу g.
  function flush(set, g) {
    let any = false;
    const add = function (buf, material, shadow) {
      if (!buf.idx.length) return;
      const mesh = new THREE.Mesh(makeGeometry(buf), material);
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
    set.leaves.forEach(function (l) { g.add(leafMesh(l)); any = true; });
    return any;
  }

  // Полотно двери: доски на петлях у косяка, приоткрыто внутрь.
  function leafMesh(l) {
    const leaf = new THREE.Mesh(white(new THREE.BoxGeometry(l.w, l.h, 0.05)), mats.planks);
    leaf.geometry.translate(l.w / 2, l.h / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    // кованые полосы петель и ручка с обеих сторон
    [0.28, l.h - 0.3].forEach(function (y) {
      const strap = new THREE.Mesh(white(new THREE.BoxGeometry(l.w * 0.8, 0.055, 0.058)), mats.blacksteel);
      strap.position.set(l.w * 0.4, y, 0);
      strap.castShadow = true;
      leaf.add(strap);
    });
    const handle = new THREE.Mesh(white(new THREE.BoxGeometry(0.028, 0.14, 0.1)), mats.blacksteel);
    handle.position.set(l.w - 0.1, 1.02, 0);
    handle.castShadow = true;
    leaf.add(handle);
    const hinge = new THREE.Group();
    if (l.along === 'x') { hinge.position.set(l.a, l.y, l.c); hinge.rotation.y = -l.out * 1.15; }
    else { hinge.position.set(l.c, l.y, l.a); hinge.rotation.y = -Math.PI / 2 + l.out * 1.15; }
    hinge.add(leaf);
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
          if (c && c.solid && built(c)) emit(set, c, get, built, null);
        }
      }
    }
    const g = new THREE.Group();
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

  function updatePartials() {
    const seen = new Set();
    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.built || b.glassOf !== undefined) continue;
      const fill = fillOf(b);
      if (fill <= 0.001) continue;
      const c = get(b.x, b.y, b.z);
      if (!c || !c.solid) continue;
      seen.add(b.id);
      let p = partials.get(b.id);
      if (!p) { p = { mesh: null, step: -1 }; partials.set(b.id, p); }
      // стена растёт рядами своей кладки, плита — полосами по 0,5 м
      let clip, step;
      if (c.kind === 'plate') {
        step = Math.max(1, Math.ceil(fill * 4 - 1e-6));
        clip = { w: step / 4 };
      } else {
        const course = FAMILY_TEX[c.family].course;
        const h = Math.min(CELL, Math.max(course, Math.ceil(fill * CELL / course - 1e-6) * course));
        step = h;
        clip = { h: h };
      }
      if (p.step === step) continue;
      p.step = step;
      const set = newSet();
      emit(set, c, get, built, clip);
      const g = new THREE.Group();
      flush(set, g);
      if (p.mesh) { group.remove(p.mesh); disposeGroup(p.mesh); }
      p.mesh = g;
      group.add(g);
    }
    partials.forEach(function (p, id) {
      if (seen.has(id)) return;
      if (p.mesh) { group.remove(p.mesh); disposeGroup(p.mesh); }
      partials.delete(id);
    });
  }

  // Куда тянется рука каменщика: верх растущей детали блока b у стороны рабочего (from — его стопы, мир).
  // Стена и колонна — у оси клетки на полтолщины к нему, массив и плита — у ближнего края.
  function layPoint(b, from, out) {
    if (!world) return false;
    const c = get(b.x, b.y, b.z);
    if (!c || !c.solid) return false;
    const x0 = b.x * CELL, y0 = b.y * CELL, z0 = b.z * CELL, cx = x0 + CELL / 2, cz = z0 + CELL / 2;
    const top = c.kind === 'plate' ? y0 + CELL - 0.005 : y0 + CELL * Math.max(0.04, b.built ? 1 : fillOf(b));
    const dx = from.x - cx, dz = from.z - cz, d = Math.hypot(dx, dz) || 1;
    const off = c.kind === 'wall' || c.kind === 'pillar' ? 0.16 : Math.max(0, Math.min(0.85, d - 0.4));
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
      if (!c || !c.solid) continue;
      const p = pieceBoxes(c, get, built, opts);
      p.solid.concat(p.plate, p.trim.filter(function (q) { return q.post; })).forEach(function (q) {
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

  // Кадр: новые готовые детали → их куски; растущие детали; контур; городок.
  function update() {
    if (!world) return;
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
    if (dirty.size) {
      dirty.forEach(buildChunk);
      dirty.clear();
      if (ctx.onChange) ctx.onChange();
    }
    updatePartials();
    // контур — раз в полсекунды хватает (новые взятые детали пропадают из него)
    ghostTimer += 1;
    if (ghostDirty || ghostTimer > 30) { buildGhost(); ghostDirty = false; ghostTimer = 0; }
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
      litGlass.emissiveIntensity = 2.4 * THREE.MathUtils.smoothstep(night, 0.2, 0.7);
    },
    ghostOn: function () { return showGhost; },
    // роль клетки (проверки, снимки)
    kindAt: function (x, y, z) { const c = get(x, y, z); return c && c.solid ? c.kind : null; },
  };
}
