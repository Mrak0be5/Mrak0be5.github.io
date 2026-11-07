// Здание оригинала (logic.js → world.blocks) деталями, как в Rust: клетка логики 2 м — одна деталь — фундамент,
// стена, окно в проёме, дверной проём, колонна, перекрытие (роли — plan.js). Стены и плиты одной кладки
// сливаются: фактура лежит в мировых координатах (ряды кирпича идут через детали), грани у готовых соседей не
// рисуются. Сетка разбита на куски 8 × 8 × 8 клеток — при постройке детали пересобирается её кусок (и соседний,
// если деталь на границе). Недостроенная деталь растёт рядами своей кладки (плита — полосами) на долю
// (poured + доля текущего мини-куба) / N³, как кольцо над рабочим в оригинале. Будущие детали фронта работ —
// тонкий контур (подсветка оригинала). Постройки городка — те же детали.
import * as THREE from 'three';
import { CELL, familyOf, familyMaterial, familyTile, tintOf, tintHex, FAMILY_TEX } from './families.js?v=0c1cc5f';
import { classify, pieceBoxes, key3, DIRS } from './plan.js?v=0c1cc5f';

const CHUNK = 8;
// сечение колонны, м
const PILLAR = { wood: 0.45, metal: 0.4 };
// плита перекрытия — из того же материала, что несут рабочие: плиты камня, кирпича, бетона, мрамора;
// у дерева — дощатый пол, у стали — рифлёный лист
const PLATE_FAMILY = { wood: 'floor', metal: 'deck' };
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
  function newSet() { return { solid: {}, plate: {}, steel: newBuf(), glass: newBuf(), leaves: [] }; }
  function plateFamily(c) { return PLATE_FAMILY[c.family] || c.family; }

  // Бруски детали клетки c в набор (clip — недостроенная: { h } по высоте или { w } полосами по x).
  function emit(set, c, getCell, isBuilt, clip) {
    const p = pieceBoxes(c, getCell, isBuilt, opts);
    const fam = c.family, pf = plateFamily(c);
    const tint = tintOf(MB, c.mat, fam);
    const ptint = tintOf(MB, c.mat, pf);
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
    cut(p.solid).forEach(function (q) { pushBox(solid, q.b, q.skip, familyTile(fam), tint); });
    const tf = TRIM_FAMILY[fam] === undefined ? 'trim' : TRIM_FAMILY[fam];
    if (tf) {
      const trim = set.solid[tf] || (set.solid[tf] = newBuf());
      const tt = tintHex(trimHex(MB, c), tf);
      cut(p.trim).forEach(function (q) { pushBox(trim, q.b, q.skip, familyTile(tf), tt); });
    } else cut(p.trim).forEach(function (q) { pushBox(set.steel, q.b, q.skip, [1, 1], WHITE); });
    if (p.plate.length) {
      const plate = set.plate[pf] || (set.plate[pf] = newBuf());
      cut(p.plate).forEach(function (q) { pushBox(plate, q.b, q.skip, familyTile(pf), ptint); });
    }
    if (clip) return;
    p.steel.forEach(function (q) { pushBox(set.steel, q.b, q.skip, [1, 1], WHITE); });
    p.glass.forEach(function (q) { pushBox(set.glass, q.b, q.skip, [1, 1], WHITE); });
    if (p.leaf) set.leaves.push(p.leaf);
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
    Object.keys(set.solid).forEach(function (f) { add(set.solid[f], familyMaterial(mats, f), true); });
    Object.keys(set.plate).forEach(function (f) { add(set.plate[f], familyMaterial(mats, f), true); });
    add(set.steel, mats.blacksteel, true);
    add(set.glass, mats.glass, false);
    set.leaves.forEach(function (l) { g.add(leafMesh(l)); any = true; });
    return any;
  }

  // Полотно двери: доски на петлях у косяка, приоткрыто внутрь.
  function leafMesh(l) {
    const leaf = new THREE.Mesh(white(new THREE.BoxGeometry(l.w, l.h, 0.05)), mats.planks);
    leaf.geometry.translate(l.w / 2, l.h / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
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
      group.add(g);
      chunks.set(ck, g);
    }
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
    group, build, update, clear,
    setGhost: function (on) { showGhost = !!on; ghostDirty = true; return showGhost; },
    // разметка не светится сама: ночью тусклее (night 0..1 — неба)
    ghostLight: function (night) { ghostMat.uniforms.uOpacity.value = 0.16 * (1 - 0.95 * night); },
    ghostOn: function () { return showGhost; },
    // роль клетки (проверки, снимки)
    kindAt: function (x, y, z) { const c = get(x, y, z); return c && c.solid ? c.kind : null; },
  };
}
