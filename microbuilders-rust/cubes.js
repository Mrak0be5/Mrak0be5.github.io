// Здание из кубов оригинала (logic.js → world.blocks): клетка 2 м, куб — кладка своего материала.
// Готовые кубы сливаются в сплошные стены: внутренние грани соседних кубов не рисуются, фактура лежит
// в мировых координатах (ряды кладки идут через границы кубов). Сетка разбита на куски 8×8×8 клеток —
// при постройке куба пересобирается его кусок (и соседний, если куб на границе). Недоложенный куб растёт
// снизу вверх на долю (poured + доля текущего мини-куба) / N³, как кольцо над рабочим в оригинале.
// Окно — куб стены и стеклянный куб в одной клетке: после стекла клетка рисуется рамой со стеклом.
// Дверь — особый блок: полотно в проёме. Будущие кубы фронта работ — тонкий контур (подсветка оригинала).
import * as THREE from 'three';
import { TEXTURE_TILES as TILE } from './textures.js?v=360d748';
import { adoptSky, linkSky } from './world.js?v=360d748';

export const CELL = 2;
const CHUNK = 8;

// Семейства материалов: фактура и тон. Материал оригинала задаёт только цвет и массу — по имени видно,
// камень это, кирпич, дерево или металл.
const FAMILY_RULES = [
  ['glass', /^glass$/],
  ['brick', /brick|clinker|terracotta|tile-/],
  ['wood', /pine|oak|larch|walnut|teak|mahogany|sandal|rosewood|wood|cedar|ash|tree|root/],
  ['metal', /steel|iron|bronze|copper|silver|gold|titan|brass|platinum|mithril|orichalc|iridium|osmium|adamant|neutron/],
  ['concrete', /concrete/],
  ['marble', /marble|alabaster|onyx/],
];
export function familyOf(MB, id) {
  const m = MB.MATERIAL[id];
  if (m && m.accent) return 'gem';
  const name = id.replace('ladder-', '');
  for (let i = 0; i < FAMILY_RULES.length; i++) if (FAMILY_RULES[i][1].test(name)) return FAMILY_RULES[i][0];
  return 'stone';
}

// Кладка семейства (рецепт textures.js), её средний тон (тон материала оригинала делится на него —
// получается оттенок) и высота ряда, м: недоложенный куб растёт рядами.
const NEUTRAL = [0.6, 0.6, 0.6];
const FAMILY_TEX = {
  stone: { mat: 'ashlar', base: NEUTRAL, course: 2 / 6 },
  brick: { mat: 'brick', base: NEUTRAL, course: 2 / 27 },
  wood: { mat: 'logs', base: NEUTRAL, course: 0.2 },
  metal: { mat: 'riveted', base: NEUTRAL, course: 0.5 },
  concrete: { mat: 'formwork', base: NEUTRAL, course: 0.5 },
  marble: { mat: 'marble', base: [0.7, 0.7, 0.7], course: 1 },
  gem: { mat: 'paint', base: [1, 1, 1], course: 0.5 },
  // стекло стеной (не окном) в уровнях 1–12 не встречается — на всякий случай гладкий блок
  glass: { mat: 'paint', base: [1, 1, 1], course: 0.5 },
};

const _c = new THREE.Color();
export function tintOf(MB, id, family) {
  const m = MB.MATERIAL[id];
  _c.setHex(m ? m.color : 0x888888).convertSRGBToLinear();
  const base = FAMILY_TEX[family].base;
  const lin = [Math.pow(base[0], 2.2), Math.pow(base[1], 2.2), Math.pow(base[2], 2.2)];
  return [Math.min(2.2, _c.r / lin[0]), Math.min(2.2, _c.g / lin[1]), Math.min(2.2, _c.b / lin[2])];
}

const FACES = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];

// Грань куба в мировых координатах: x0..x0+CELL по трём осям, uv — метры / размер плитки фактуры.
function pushFace(buf, f, x0, y0, z0, h, tile, tint) {
  const n = f.n, u = f.u, v = f.v;
  const cx = x0 + CELL / 2 + n[0] * CELL / 2, cy = y0 + h / 2 + n[1] * h / 2, cz = z0 + CELL / 2 + n[2] * CELL / 2;
  const hu = CELL / 2, hv = (n[1] !== 0 ? CELL : h) / 2;
  const base = buf.pos.length / 3;
  for (let k = 0; k < 4; k++) {
    const su = k === 0 || k === 3 ? -1 : 1, sv = k < 2 ? -1 : 1;
    const px = cx + u[0] * hu * su + v[0] * hv * sv, py = cy + u[1] * hu * su + v[1] * hv * sv, pz = cz + u[2] * hu * su + v[2] * hv * sv;
    buf.pos.push(px, py, pz);
    buf.nrm.push(n[0], n[1], n[2]);
    // мировые координаты вдоль осей грани → непрерывная фактура через соседние кубы
    const wu = px * u[0] + py * u[1] + pz * u[2], wv = px * v[0] + py * v[1] + pz * v[2];
    buf.uv.push(wu / tile[0], wv / tile[1]);
    buf.col.push(tint[0], tint[1], tint[2]);
  }
  buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

// Белый цвет вершин: материалы прототипа красят цветом вершин, без атрибута меш выходит чёрным.
function white(g) {
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  return g;
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

// Контур будущих кубов: свои выходы G-буфера, чтобы прозрачные линии не портили буферы под собой.
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

// Материал кладки семейства — общий для кубов, двора и ноши (кэш по набору материалов). Цвет материала
// оригинала (цвет вершин) — только по кладке: швы (альфа фактуры 0) остаются цвета раствора.
const FAMILY_MATS = new WeakMap();
export function familyMaterial(mats, family) {
  let set = FAMILY_MATS.get(mats);
  if (!set) { set = {}; FAMILY_MATS.set(mats, set); }
  if (set[family]) return set[family];
  const src = mats[FAMILY_TEX[family].mat];
  const m = adoptSky(src.clone(), src);
  m.vertexColors = true;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (shader, renderer) {
    prev.call(this, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #if defined( USE_COLOR ) && defined( USE_MAP )
        diffuseColor.rgb *= mix(vec3(1.0), vColor, texture2D(map, vMapUv).a);
        diffuseColor.a = opacity;
      #else
        #include <color_fragment>
      #endif`);
  };
  m.customProgramCacheKey = function () { return prevKey.call(this) + '|joint1'; };
  // сразу с небом и выходами G-буфера (без них кадр «Максимума» не видит куб, пока его не подключит обход сцены)
  linkSky(m);
  set[family] = m;
  return m;
}
export function familyTile(family) { return TILE[FAMILY_TEX[family].mat] || [2, 2]; }

export function createCubes(ctx) {
  const { E, mats } = ctx;
  const MB = E.MB;
  const group = new THREE.Group();
  group.name = 'cubes';
  const materialFor = function (family) { return familyMaterial(mats, family); };
  const tileOf = familyTile;
  const ghostMat = new THREE.ShaderMaterial({
    vertexShader: GHOST_VERT, fragmentShader: GHOST_FRAG, glslVersion: THREE.GLSL3,
    uniforms: { uColor: { value: new THREE.Color(0xdfe9f2) }, uOpacity: { value: 0.16 } },
    transparent: true, depthWrite: false,
  });

  let world = null;
  let cells = new Map();          // клетка → { wall, glass, door } (блоки в клетке)
  let chunks = new Map();         // ключ куска → Group
  const dirty = new Set();
  let partials = new Map();       // id блока → { mesh, cap, fill }
  let ghost = null, ghostDirty = true;
  let builtSeen = 0;
  const seenBuilt = new Set();
  let showGhost = true;

  const key3 = function (x, y, z) { return x + ',' + y + ',' + z; };
  const chunkKey = function (x, y, z) { return Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK) + ',' + Math.floor(z / CHUNK); };

  function cellOf(b) {
    const k = key3(b.x, b.y, b.z);
    let c = cells.get(k);
    if (!c) { c = { wall: null, glass: null, door: null }; cells.set(k, c); }
    return c;
  }

  // Клетка закрыта для соседа (его грань к ней не нужна): стена, окно или дверь стоят.
  function solidAt(x, y, z) {
    const c = cells.get(key3(x, y, z));
    if (!c) return false;
    return !!((c.wall && c.wall.built) || (c.door && c.door.built));
  }

  E.on(function (event) {
    if (!world) return;
    if (event.type === 'retrofitDoor' || event.type === 'autofill' || event.type === 'lightning') rescan();
  });

  // Новая площадка: клетки, все куски заново.
  function build(w) {
    clear();
    world = w;
    world.blocks.forEach(function (b) {
      const c = cellOf(b);
      if (b.glassOf !== undefined) c.glass = b;
      else if (b.feature === 'door') c.door = b;
      else c.wall = b;
      dirty.add(chunkKey(b.x, b.y, b.z));
    });
    builtSeen = -1;
    ghostDirty = true;
  }

  function clear() {
    chunks.forEach(function (g) { disposeGroup(g); group.remove(g); });
    chunks = new Map();
    partials.forEach(function (p) { group.remove(p.mesh); p.mesh.geometry.dispose(); if (p.cap) { group.remove(p.cap); p.cap.geometry.dispose(); } });
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

  // Кусок: грани готовых кубов по семействам, окна и двери.
  function buildChunk(ck) {
    const old = chunks.get(ck);
    if (old) { disposeGroup(old); group.remove(old); chunks.delete(ck); }
    const parts = ck.split(',').map(Number);
    const g = new THREE.Group();
    const bufs = {};
    let any = false;
    for (let x = parts[0] * CHUNK; x < (parts[0] + 1) * CHUNK; x++) {
      for (let y = parts[1] * CHUNK; y < (parts[1] + 1) * CHUNK; y++) {
        for (let z = parts[2] * CHUNK; z < (parts[2] + 1) * CHUNK; z++) {
          const c = cells.get(key3(x, y, z));
          if (!c) continue;
          const x0 = x * CELL, y0 = y * CELL, z0 = z * CELL;
          if (c.door && c.door.built) { g.add(doorMesh(c.door, c.wall)); any = true; continue; }
          if (!c.wall || !c.wall.built) continue;
          if (c.glass && c.glass.built) { g.add(windowMesh(c.glass, c.wall)); any = true; continue; }
          const family = familyOf(MB, c.wall.materialId);
          const tint = tintOf(MB, c.wall.materialId, family);
          const buf = bufs[family] || (bufs[family] = { pos: [], nrm: [], uv: [], col: [], idx: [] });
          for (let f = 0; f < 6; f++) {
            const n = FACES[f].n;
            if (solidAt(x + n[0], y + n[1], z + n[2])) continue;
            // нижняя грань на земле не видна
            if (n[1] < 0 && y === 0) continue;
            pushFace(buf, FACES[f], x0, y0, z0, CELL, tileOf(family), tint);
          }
        }
      }
    }
    Object.keys(bufs).forEach(function (family) {
      if (!bufs[family].idx.length) return;
      const mesh = new THREE.Mesh(makeGeometry(bufs[family]), materialFor(family));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      any = true;
    });
    if (any) {
      group.add(g);
      chunks.set(ck, g);
    }
  }

  // Окно: рама из материала стены по краю клетки и стекло посередине, лицом по faceX/faceZ.
  function windowMesh(glass, wall) {
    const g = new THREE.Group();
    const family = familyOf(MB, wall.materialId);
    const tint = tintOf(MB, wall.materialId, family);
    const frameBuf = { pos: [], nrm: [], uv: [], col: [], idx: [] };
    const x0 = glass.x * CELL, y0 = glass.y * CELL, z0 = glass.z * CELL;
    const alongX = glass.faceZ !== 0;   // стена идёт вдоль X, окно смотрит по Z
    const t = 0.32;                      // ширина рамы проёма
    // четыре бруска: низ, верх, два бока — как маленькие кубики, грани в мировых координатах
    const bars = alongX
      ? [[x0, y0, z0, CELL, t, CELL], [x0, y0 + CELL - t, z0, CELL, t, CELL], [x0, y0, z0, t, CELL, CELL], [x0 + CELL - t, y0, z0, t, CELL, CELL]]
      : [[x0, y0, z0, CELL, t, CELL], [x0, y0 + CELL - t, z0, CELL, t, CELL], [x0, y0, z0, CELL, CELL, t], [x0, y0, z0 + CELL - t, CELL, CELL, t]];
    bars.forEach(function (b) { pushBox(frameBuf, b, tileOf(family), tint); });
    const frame = new THREE.Mesh(makeGeometry(frameBuf), materialFor(family));
    frame.castShadow = true;
    frame.receiveShadow = true;
    g.add(frame);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 2 * t, CELL - 2 * t), mats.glass);
    pane.position.set(x0 + CELL / 2 + glass.faceX * 0.25, y0 + CELL / 2, z0 + CELL / 2 + glass.faceZ * 0.25);
    pane.rotation.y = Math.atan2(glass.faceX, glass.faceZ);
    g.add(pane);
    // переплёт: тёмная рама вокруг стекла
    const sash = new THREE.Mesh(white(new THREE.BoxGeometry(CELL - 2 * t + 0.06, 0.06, 0.08)), mats.blacksteel);
    sash.position.copy(pane.position);
    sash.rotation.y = pane.rotation.y;
    g.add(sash);
    const sash2 = sash.clone();
    sash2.rotation.z = Math.PI / 2;
    sash2.scale.x = 1;
    sash2.rotation.set(0, pane.rotation.y, Math.PI / 2);
    g.add(sash2);
    return g;
  }

  // Брусок (x0,y0,z0,w,h,d) — все шесть граней.
  function pushBox(buf, b, tile, tint) {
    const x0 = b[0], y0 = b[1], z0 = b[2], w = b[3], h = b[4], d = b[5];
    FACES.forEach(function (f) {
      const n = f.n, u = f.u, v = f.v;
      const cx = x0 + w / 2 + n[0] * w / 2, cy = y0 + h / 2 + n[1] * h / 2, cz = z0 + d / 2 + n[2] * d / 2;
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

  // Дверь: проём в клетке с рамой из материала стены и приоткрытым полотном.
  function doorMesh(door, wall) {
    const g = new THREE.Group();
    const matId = wall ? wall.materialId : door.materialId;
    const family = familyOf(MB, matId);
    const tint = tintOf(MB, matId, family);
    const buf = { pos: [], nrm: [], uv: [], col: [], idx: [] };
    const x0 = door.x * CELL, y0 = door.y * CELL, z0 = door.z * CELL;
    const alongX = door.faceZ !== 0;
    const t = 0.34, top = 0.22;
    const bars = alongX
      ? [[x0, y0 + CELL - top, z0, CELL, top, CELL], [x0, y0, z0, t, CELL - top, CELL], [x0 + CELL - t, y0, z0, t, CELL - top, CELL]]
      : [[x0, y0 + CELL - top, z0, CELL, top, CELL], [x0, y0, z0, CELL, CELL - top, t], [x0, y0, z0 + CELL - t, CELL, CELL - top, t]];
    bars.forEach(function (b) { pushBox(buf, b, tileOf(family), tint); });
    const frame = new THREE.Mesh(makeGeometry(buf), materialFor(family));
    frame.castShadow = true;
    frame.receiveShadow = true;
    g.add(frame);
    // полотно — доски на петлях у левого косяка, приоткрыто внутрь
    const w = CELL - 2 * t, h = CELL - top;
    const leaf = new THREE.Mesh(white(new THREE.BoxGeometry(w, h - 0.02, 0.06)), mats.planks);
    leaf.castShadow = true;
    leaf.geometry.translate(w / 2, h / 2, 0);
    const hinge = new THREE.Group();
    const yaw = Math.atan2(door.faceX, door.faceZ);
    hinge.position.set(x0 + CELL / 2, y0, z0 + CELL / 2);
    hinge.rotation.y = yaw;
    leaf.position.set(-w / 2, 0, -0.2);
    leaf.rotation.y = -1.25;
    hinge.add(leaf);
    g.add(hinge);
    return g;
  }

  // ---------- недоложенные кубы ----------
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
      if (b.built || b.glassOf !== undefined || b.feature === 'door') continue;
      const fill = fillOf(b);
      if (fill <= 0.001) continue;
      seen.add(b.id);
      let p = partials.get(b.id);
      if (!p) {
        p = { block: b, mesh: null, h: -1 };
        partials.set(b.id, p);
      }
      // растущий куб: бока и верх на высоте заливки (верх — срез кладки), рядами своей кладки
      const family = familyOf(MB, b.materialId);
      const course = FAMILY_TEX[family].course;
      const h = Math.min(CELL, Math.max(course, Math.ceil(fill * CELL / course - 1e-6) * course));
      if (p.h === h) continue;
      p.h = h;
      const buf = { pos: [], nrm: [], uv: [], col: [], idx: [] };
      const tint = tintOf(MB, b.materialId, family);
      const x0 = b.x * CELL, y0 = b.y * CELL, z0 = b.z * CELL;
      for (let f = 0; f < 6; f++) {
        const n = FACES[f].n;
        if (n[1] < 0) continue;
        if (n[1] === 0 && solidAt(b.x + n[0], b.y, b.z + n[2])) continue;
        pushFace(buf, FACES[f], x0, y0, z0, h, tileOf(family), tint);
      }
      if (p.mesh) { p.mesh.geometry.dispose(); p.mesh.geometry = makeGeometry(buf); }
      else {
        p.mesh = new THREE.Mesh(makeGeometry(buf), materialFor(family));
        p.mesh.castShadow = true;
        p.mesh.receiveShadow = true;
        group.add(p.mesh);
      }
    }
    partials.forEach(function (p, id) {
      if (seen.has(id)) return;
      if (p.mesh) { group.remove(p.mesh); p.mesh.geometry.dispose(); }
      partials.delete(id);
    });
  }

  // ---------- контур будущих кубов ----------
  function buildGhost() {
    if (ghost) { group.remove(ghost); ghost.geometry.dispose(); ghost = null; }
    if (!showGhost) return;
    const pos = [];
    const E4 = [[0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1], [1, 1, 1, 0, 1, 1], [1, 1, 1, 1, 0, 1], [1, 1, 1, 1, 1, 0],
      [1, 0, 0, 1, 1, 0], [1, 0, 0, 1, 0, 1], [0, 1, 0, 1, 1, 0], [0, 1, 0, 0, 1, 1], [0, 0, 1, 1, 0, 1], [0, 0, 1, 0, 1, 1]];
    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.built || b.glassOf !== undefined || b.poured > 0 || b.owner >= 0) continue;
      // только фронт работ: кубы на земле или рядом с готовыми (разметка следующего ряда, а не всё здание)
      if (b.y > 0 && !solidAt(b.x, b.y - 1, b.z) && !solidAt(b.x + 1, b.y, b.z) && !solidAt(b.x - 1, b.y, b.z) && !solidAt(b.x, b.y, b.z + 1) && !solidAt(b.x, b.y, b.z - 1)) continue;
      const x0 = b.x * CELL, y0 = b.y * CELL, z0 = b.z * CELL;
      E4.forEach(function (e) {
        pos.push(x0 + e[0] * CELL, y0 + e[1] * CELL, z0 + e[2] * CELL, x0 + e[3] * CELL, y0 + e[4] * CELL, z0 + e[5] * CELL);
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
  // кубы (done) — та же кладка; воксель городка — клетка (balance.json → canteen.voxel = 1).
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
    const solid = new Set();
    sites.forEach(function (site) { site.cubes.forEach(function (c) { if (c.done) solid.add(key3(c.x, c.y, c.z)); }); });
    if (!solid.size) return;
    const bufs = {};
    sites.forEach(function (site) {
      site.cubes.forEach(function (c) {
        if (!c.done) return;
        const family = familyOf(MB, c.materialId);
        const buf = bufs[family] || (bufs[family] = { pos: [], nrm: [], uv: [], col: [], idx: [] });
        const tint = tintOf(MB, c.materialId, family);
        for (let f = 0; f < 6; f++) {
          const n = FACES[f].n;
          if (solid.has(key3(c.x + n[0], c.y + n[1], c.z + n[2]))) continue;
          if (n[1] < 0 && c.y === 0) continue;
          pushFace(buf, FACES[f], c.x * CELL, c.y * CELL, c.z * CELL, CELL, tileOf(family), tint);
        }
      });
    });
    camp = new THREE.Group();
    Object.keys(bufs).forEach(function (family) {
      const mesh = new THREE.Mesh(makeGeometry(bufs[family]), materialFor(family));
      mesh.castShadow = mesh.receiveShadow = true;
      camp.add(mesh);
    });
    group.add(camp);
    if (ctx.onChange) ctx.onChange();
  }

  // Кадр: новые готовые кубы → их куски; растущие кубы; контур; городок.
  function update() {
    if (!world) return;
    updateCamp();
    const built = world.blocks.length - world.remaining;
    if (built !== builtSeen) {
      // поля блоков логики не трогаем: что уже нарисовано готовым — свой набор id
      world.blocks.forEach(function (b) {
        if (b.built === seenBuilt.has(b.id)) return;
        if (b.built) seenBuilt.add(b.id); else seenBuilt.delete(b.id);
        markAround(b);
      });
      builtSeen = built;
      ghostDirty = true;
    }
    if (dirty.size) {
      dirty.forEach(buildChunk);
      dirty.clear();
      if (ctx.onChange) ctx.onChange();
    }
    updatePartials();
    // контур — раз в полсекунды хватает (новые взятые кубы пропадают из него)
    ghostTimer += 1;
    if (ghostDirty || ghostTimer > 30) { buildGhost(); ghostDirty = false; ghostTimer = 0; }
  }
  let ghostTimer = 0;

  return {
    group, build, update, clear,
    setGhost: function (on) { showGhost = !!on; ghostDirty = true; return showGhost; },
    // разметка не светится сама: ночью тусклее (night 0..1 — неба)
    ghostLight: function (night) { ghostMat.uniforms.uOpacity.value = 0.16 * (1 - 0.8 * night); },
    ghostOn: function () { return showGhost; },
  };
}
