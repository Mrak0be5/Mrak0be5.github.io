// Чертежи зданий в сокетах как в Rust: клетки 3×3 м (i — по x, j — по z), стены — на рёбрах клеток.
// Стороны: n — север (z мин.), s — юг (z макс., фасад к камере), w — запад (x мин.), e — восток (x макс.).
// Список проёмов стороны — по рёбрам слева направо (по росту x для n/s, по росту z для w/e).
import * as THREE from 'three';
import { GRID, STORY, PLINTH, THICK } from './pieces.js?v=3ae8fc6';
import { hashStr } from './geo.js?v=3ae8fc6';

export const BUILDINGS = [
  {
    id: 'hut', name: 'Хижина', blurb: 'Деревянный сруб на настиле, двускатная крыша из дранки',
    size: [2, 1], stories: 1, foundation: 'wood', walls: ['wood'], roof: { type: 'gable', axis: 'x', pitch: 36, tier: 'wood' },
    sides: [{ s: ['door', 'window'], n: ['wall', 'window'], w: ['window'], e: ['wall'] }],
    inserts: { door: 'wood', window: 'shutters' },
  },
  {
    id: 'stonehouse', name: 'Каменный дом', blurb: 'Кладка из известняка, сланцевая кровля, перегородка с дверью',
    size: [3, 2], stories: 1, foundation: 'stone', walls: ['stone'], roof: { type: 'gable', axis: 'x', pitch: 33, tier: 'stone' },
    sides: [{ s: ['window', 'door', 'window'], n: ['window', 'wall', 'window'], w: ['wall', 'window'], e: ['window', 'wall'] }],
    interior: [{ axis: 'z', i: 2, j: 0, level: 0, opening: 'door' }, { axis: 'z', i: 2, j: 1, level: 0 }],
    inserts: { door: 'wood', window: 'glass' },
  },
  {
    id: 'twostory', name: 'Двухэтажный дом', blurb: 'Каменный низ, деревянный верх, лестница и перекрытие',
    size: [3, 2], stories: 2, foundation: 'stone', walls: ['stone', 'wood'], floors: 'wood', roof: { type: 'gable', axis: 'x', pitch: 35, tier: 'wood' },
    stairs: [{ i: 0, j: 0, level: 0, tier: 'wood' }],
    sides: [
      { s: ['window', 'door', 'window'], n: ['wall', 'window', 'window'], w: ['wall', 'window'], e: ['window', 'wall'] },
      { s: ['window', 'window', 'window'], n: ['window', 'wall', 'window'], w: ['window', 'wall'], e: ['wall', 'window'] },
    ],
    inserts: { door: 'wood', window: 'glass' },
  },
  {
    id: 'workshop', name: 'Мастерская', blurb: 'Крашеный профлист, гаражные ворота, решётки на окнах',
    size: [2, 3], stories: 1, foundation: 'stone', walls: ['metal'], sheet: 'paintsheet', roof: { type: 'gable', axis: 'z', pitch: 18, tier: 'metal' },
    sides: [{ s: ['garage', 'window'], n: ['wall', 'wall'], w: ['window', 'wall', 'window'], e: ['window', 'door', 'window'] }],
    inserts: { door: 'metal', window: 'bars' },
  },
  {
    id: 'base', name: 'Укреплённая база', blurb: 'Камень и металл, бронедверь, бойницы, плоская кровля с парапетом',
    size: [3, 3], stories: 2, foundation: 'armored', walls: ['stone', 'metal'], floors: 'metal', roof: { type: 'flat', tier: 'metal', parapet: 'metal' },
    stairs: [{ i: 2, j: 0, level: 0, tier: 'metal' }],
    sides: [
      { s: ['window', 'door', 'window'], n: ['window', 'wall', 'window'], w: ['window', 'wall', 'window'], e: ['window', 'wall', 'window'] },
      { s: ['window', 'window', 'window'], n: ['window', 'wall', 'window'], w: ['window', 'window', 'window'], e: ['window', 'wall', 'window'] },
    ],
    interior: [{ axis: 'x', i: 0, j: 1, level: 0 }, { axis: 'x', i: 1, j: 1, level: 0, opening: 'door' }],
    inserts: { door: 'armored', window: 'embrasure', window1: 'bars', interiorDoor: 'metal' },
  },
];

const ORDER = { foundation: 0, wall: 1, stairs: 2, floor: 3, gable: 4, roof: 5, parapet: 6 };

function rotY(a) { return new THREE.Matrix4().makeRotationY(a); }

// Мировая система ребра: x — вдоль стены, z — наружу (outward = +1: к +z для ребра «x», к +x для ребра «z»).
function edgeFrame(ox, oz, axis, i, j, y, outward) {
  if (axis === 'x') {
    if (outward >= 0) return new THREE.Matrix4().makeTranslation(ox + i * GRID, y, oz + j * GRID);
    return new THREE.Matrix4().makeTranslation(ox + (i + 1) * GRID, y, oz + j * GRID).multiply(rotY(Math.PI));
  }
  if (outward < 0) return new THREE.Matrix4().makeTranslation(ox + i * GRID, y, oz + j * GRID).multiply(rotY(-Math.PI / 2));
  return new THREE.Matrix4().makeTranslation(ox + i * GRID, y, oz + (j + 1) * GRID).multiply(rotY(Math.PI / 2));
}

// Мировая точка локального x стены (на её линии): нужна фронтонам.
function edgePoint(frame, xl) { return new THREE.Vector3(xl, 0, 0).applyMatrix4(frame); }

export function planBuilding(def, center = [0, 0]) {
  const W = def.size[0], D = def.size[1];
  const ox = center[0] - (W * GRID) / 2, oz = center[1] - (D * GRID) / 2;
  const pieces = [];
  const stairsAt = {};
  (def.stairs || []).forEach(function (s) { stairsAt[s.i + ',' + s.j + ',' + (s.level + 1)] = true; });
  function add(p) {
    p.building = def.id;
    p.id = pieces.length;
    p.seed = hashStr(def.id + ':' + p.type + ':' + p.id);
    p.order = ORDER[p.type];
    pieces.push(p);
    return p;
  }

  // фундаменты
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    add({ type: 'foundation', tier: def.foundation, level: 0, cell: [i, j],
      exterior: { n: j === 0, s: j === D - 1, w: i === 0, e: i === W - 1 },
      frame: new THREE.Matrix4().makeTranslation(ox + i * GRID, 0, oz + j * GRID) });
  }

  // стены по этажам
  for (let k = 0; k < def.stories; k++) {
    const tier = def.walls[Math.min(k, def.walls.length - 1)];
    const sides = def.sides[Math.min(k, def.sides.length - 1)];
    const y = PLINTH + k * STORY;
    const T = THICK[tier];
    const winInsert = (k > 0 && def.inserts.window1) || def.inserts.window;
    function wall(axis, i, j, outward, opening, extA, extB) {
      add({ type: 'wall', tier, level: k, edge: { axis, i, j }, outward, opening: opening === 'wall' ? null : opening,
        insert: opening === 'door' ? def.inserts.door : opening === 'window' ? winInsert : null,
        sheet: def.sheet, extA, extB, exterior: true, frame: edgeFrame(ox, oz, axis, i, j, y, outward) });
    }
    for (let i = 0; i < W; i++) {
      // юг: локальный x по +x — начало у запада
      wall('x', i, D, 1, sides.s[i], i === 0 ? T / 2 : 0, i === W - 1 ? T / 2 : 0);
      // север: локальный x по −x — начало у востока
      wall('x', i, 0, -1, sides.n[i], i === W - 1 ? T / 2 : 0, i === 0 ? T / 2 : 0);
    }
    for (let j = 0; j < D; j++) {
      wall('z', 0, j, -1, sides.w[j], 0, 0);
      wall('z', W, j, 1, sides.e[j], 0, 0);
    }
    (def.interior || []).filter(function (w) { return w.level === k; }).forEach(function (w) {
      const tExt = T / 2;
      const shortA = w.axis === 'z' ? (w.j === 0 ? -tExt : 0) : (w.i === 0 ? -tExt : 0);
      const shortB = w.axis === 'z' ? (w.j === D - 1 ? -tExt : 0) : (w.i === W - 1 ? -tExt : 0);
      add({ type: 'wall', tier, level: k, edge: { axis: w.axis, i: w.i, j: w.j }, outward: 1, opening: w.opening || null,
        insert: w.opening === 'door' ? (def.inserts.interiorDoor || 'wood') : null, sheet: def.sheet,
        extA: shortA, extB: shortB, exterior: false, frame: edgeFrame(ox, oz, w.axis, w.i, w.j, y, 1) });
    });
    // перекрытие над этажом
    if (k + 1 < def.stories) {
      for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
        if (stairsAt[i + ',' + j + ',' + (k + 1)]) continue;
        add({ type: 'floor', tier: def.floors || 'wood', level: k + 1, cell: [i, j],
          frame: new THREE.Matrix4().makeTranslation(ox + i * GRID, PLINTH + (k + 1) * STORY, oz + j * GRID) });
      }
    }
  }
  // лестница развёрнута входом на юг (к +z): марши идут к северной стене и обратно
  (def.stairs || []).forEach(function (s) {
    add({ type: 'stairs', tier: s.tier, level: s.level, cell: [s.i, s.j],
      frame: new THREE.Matrix4().makeTranslation(ox + (s.i + 1) * GRID, PLINTH + s.level * STORY, oz + (s.j + 1) * GRID).multiply(rotY(Math.PI)) });
  });

  // крыша
  const topY = PLINTH + def.stories * STORY;
  const roof = def.roof;
  if (roof.type === 'gable') {
    const th = THREE.MathUtils.degToRad(roof.pitch);
    const o = 0.38, g = 0.28, lift = 0.2;
    const tan = Math.tan(th), sin = Math.sin(th), cos = Math.cos(th);
    const along = roof.axis === 'x' ? W : D;
    const depth = roof.axis === 'x' ? D : W;
    const span = (depth * GRID) / 2;
    const slope = (span + o) / cos;
    const eaveY = topY + lift - o * tan;
    const rise = span * tan;
    const topTier = def.walls[Math.min(def.stories - 1, def.walls.length - 1)];
    for (let a = 0; a < along; a++) {
      const first = a === 0, last = a === along - 1;
      if (roof.axis === 'x') {
        // северный скат: вверх к +z; локальный x — к −x
        add({ type: 'roof', tier: roof.tier, level: def.stories, sheet: def.sheet,
          roof: { len: GRID + (last ? g : 0) + (first ? g : 0), x0: last ? -g : 0, slope, bargeA: last, bargeB: first },
          frame: new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, sin, cos), new THREE.Vector3(0, cos, -sin)).setPosition(ox + (a + 1) * GRID, eaveY, oz - o) });
        add({ type: 'roof', tier: roof.tier, level: def.stories, sheet: def.sheet,
          roof: { len: GRID + (last ? g : 0) + (first ? g : 0), x0: first ? -g : 0, slope, ridge: true, bargeA: first, bargeB: last },
          frame: new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, sin, -cos), new THREE.Vector3(0, cos, sin)).setPosition(ox + a * GRID, eaveY, oz + D * GRID + o) });
      } else {
        add({ type: 'roof', tier: roof.tier, level: def.stories, sheet: def.sheet,
          roof: { len: GRID + (last ? g : 0) + (first ? g : 0), x0: first ? -g : 0, slope, bargeA: first, bargeB: last },
          frame: new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(cos, sin, 0), new THREE.Vector3(-sin, cos, 0)).setPosition(ox - o, eaveY, oz + a * GRID) });
        add({ type: 'roof', tier: roof.tier, level: def.stories, sheet: def.sheet,
          roof: { len: GRID + (last ? g : 0) + (first ? g : 0), x0: last ? -g : 0, slope, ridge: true, bargeA: last, bargeB: first },
          frame: new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-cos, sin, 0), new THREE.Vector3(sin, cos, 0)).setPosition(ox + W * GRID + o, eaveY, oz + (a + 1) * GRID) });
      }
    }
    // фронтоны над торцевыми стенами
    const ends = roof.axis === 'x'
      ? [{ axis: 'z', i: 0, outward: -1 }, { axis: 'z', i: W, outward: 1 }]
      : [{ axis: 'x', j: 0, outward: -1 }, { axis: 'x', j: D, outward: 1 }];
    ends.forEach(function (e) {
      for (let k2 = 0; k2 < depth; k2++) {
        const i = e.axis === 'z' ? e.i : k2, j = e.axis === 'z' ? k2 : e.j;
        const frame = edgeFrame(ox, oz, e.axis, i, j, topY, e.outward);
        const top = function (xl) {
          const p = edgePoint(frame, xl);
          const d = roof.axis === 'x' ? Math.abs(p.z - (oz + (D * GRID) / 2)) : Math.abs(p.x - (ox + (W * GRID) / 2));
          return Math.max(0.02, tan * (span - d));
        };
        // где по локальному x конёк (для наклонных жердей каркаса)
        let peakX = 0, best = -1;
        for (let x = 0; x <= GRID + 1e-6; x += 0.05) { const t = top(x); if (t > best) { best = t; peakX = x; } }
        add({ type: 'gable', tier: topTier, level: def.stories, edge: { axis: e.axis, i, j }, outward: e.outward, opening: null,
          height: rise, top, peakX, sheet: def.sheet, exterior: true, frame });
      }
    });
  } else {
    for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
      add({ type: 'floor', tier: roof.tier, level: def.stories, cell: [i, j], roofFloor: true,
        frame: new THREE.Matrix4().makeTranslation(ox + i * GRID, topY, oz + j * GRID) });
    }
    const T = THICK[roof.parapet];
    for (let i = 0; i < W; i++) {
      add({ type: 'parapet', tier: roof.parapet, level: def.stories, edge: { axis: 'x', i, j: D }, outward: 1, height: 1.1, opening: null, exterior: true, sheet: def.sheet,
        extA: i === 0 ? T / 2 : 0, extB: i === W - 1 ? T / 2 : 0, frame: edgeFrame(ox, oz, 'x', i, D, topY, 1) });
      add({ type: 'parapet', tier: roof.parapet, level: def.stories, edge: { axis: 'x', i, j: 0 }, outward: -1, height: 1.1, opening: null, exterior: true, sheet: def.sheet,
        extA: i === W - 1 ? T / 2 : 0, extB: i === 0 ? T / 2 : 0, frame: edgeFrame(ox, oz, 'x', i, 0, topY, -1) });
    }
    for (let j = 0; j < D; j++) {
      add({ type: 'parapet', tier: roof.parapet, level: def.stories, edge: { axis: 'z', i: 0, j }, outward: -1, height: 1.1, opening: null, exterior: true, sheet: def.sheet, frame: edgeFrame(ox, oz, 'z', 0, j, topY, -1) });
      add({ type: 'parapet', tier: roof.parapet, level: def.stories, edge: { axis: 'z', i: W, j }, outward: 1, height: 1.1, opening: null, exterior: true, sheet: def.sheet, frame: edgeFrame(ox, oz, 'z', W, j, topY, 1) });
    }
  }
  return { def, pieces, W, D, ox, oz, topY, footprint: { x0: ox, z0: oz, x1: ox + W * GRID, z1: oz + D * GRID } };
}
