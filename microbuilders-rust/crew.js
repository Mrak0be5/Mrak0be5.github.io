// Бригада оригинала в теле MakeHuman: каждый рабочий логики (world.builders) — фигура прототипа.
// Где он стоит и куда смотрит — как в game.js → updateSticks: MB.builderPosition, залезание на куб и
// спрыгивание по своим кривым, у лестницы — лицом к стене, с поворотом не быстрее TURN_SPEED. Что он
// делает — по фазе логики: ходьба, лестница, кирка в карьере, кладка к верху растущей детали (house.layPoint),
// леса, чертёж у стола, перекур, обед на ящике, отдых и сон на земле (подстилка). Ноша — стопка блоков на раме
// за спиной (MB.carryLoad, цвета материалов в руках); в руку при кладке — блок той же кладки. Клетка — 2 м.
import * as THREE from 'three';
import { animateWorker } from './people.js?v=f4726a0';
import { CELL, familyOf, familyMaterial, familyTile, tintOf } from './families.js?v=f4726a0';
import { roundedBox, boxUV, Batch, hashStr } from './geo.js?v=f4726a0';

const TURN_SPEED = 9;       // рад/с (game.js)
const LADDER_STAND = 0.1;   // доля клетки: стоит у лестницы (лестница — в 0,28 клетки к стене), руки на ступенях
const NO_SHIFT = [0, 0];

function climbStage(c, from, to) {
  const t = Math.min(1, Math.max(0, (c - from) / (to - from)));
  return t * t * (3 - 2 * t);
}
// подъём на куб: короткий тянущийся заход, подтягивание, шаг через край (game.js → climbLift)
function climbLift(c) { return 0.04 * climbStage(c, 0, 0.2) + 0.86 * climbStage(c, 0.2, 0.78) + 0.1 * climbStage(c, 0.78, 1); }
function climbDip(c) { return -0.06 * Math.sin(Math.PI * Math.min(1, c / 0.2)); }
// прыжок вниз: присед, толчок с подскоком, парабола, приземление
function jumpHeight(c, dy) {
  if (c <= 0.25) return 0;
  if (c >= 0.85) return dy;
  const apex = 0.15;
  const q = (c - 0.25) / 0.6;
  const b = 2 * apex + Math.sqrt(4 * apex * apex - 4 * apex * dy);
  return (dy - b) * q * q + b * q;
}
function jumpDip(c) {
  if (c < 0.25) return -0.12 * climbStage(c, 0, 0.25);
  if (c < 0.32) return -0.12 * (1 - climbStage(c, 0.25, 0.32));
  if (c < 0.85) return 0;
  return -0.14 * Math.sin(Math.PI * (c - 0.85) / 0.15);
}

const BLOCK = 0.19;   // блок ноши на раме, м

// реквизит отдыха: ящик под обед, подстилка для сна
const SEAT = new THREE.BoxGeometry(0.44, 0.4, 0.34);
const MAT = new THREE.BoxGeometry(0.72, 0.035, 1.95);
SEAT.translate(0, 0.2, -0.04);
MAT.translate(0, 0.018, -0.32);
const _c = new THREE.Color();

export function createCrew(ctx) {
  const { E, factory, mats } = ctx;
  const MB = E.MB;
  const group = new THREE.Group();
  group.name = 'crew';
  let world = null;
  let views = [];
  const pos = {};
  const load = { kg: 0, capacity: 0, fill: 0, overload: 1 };
  // Блок ноши — та же кладка, что у кубов его материала (кирпичи, брус, лист…), в натуральную величину.
  const looks = new Map();
  // проверка движений: виден только этот рабочий (-1 — все)
  let solo = -1;
  // объект сдан: стоящие рабочие радуются (секунды)
  let cheer = 0;
  function blockLook(id) {
    let look = looks.get(id);
    if (look) return look;
    const family = familyOf(MB, id);
    const glass = family === 'glass';
    const tile = glass ? [0.4, 0.4] : familyTile(family);
    const t = glass ? [1, 1, 1] : tintOf(MB, id, family);
    const h = hashStr(id);
    const b = new Batch();
    b.add(boxUV(roundedBox(BLOCK, BLOCK, BLOCK, 0.008, 3), tile[0], tile[1], (h % 97) / 97, (h % 89) / 89), new THREE.Matrix4(), new THREE.Color(t[0], t[1], t[2]));
    look = { geometry: b.geometry(), material: glass ? mats.glass : familyMaterial(mats, family) };
    looks.set(id, look);
    return look;
  }
  const _p = new THREE.Vector3();
  const ZERO = new THREE.Vector3();
  // Двое у одного карьера или на одной клетке не стоят друг в друге: расходятся до SPREAD м — по позициям прошлого
  // кадра без этого сдвига (иначе раскачка), плавно; на лестнице, на стене и в позе — нет.
  const SPREAD = 0.62;
  function spread() {
    views.forEach(function (v) { if (v) (v.sepTo || (v.sepTo = new THREE.Vector3())).set(0, 0, 0); });
    for (let i = 0; i < views.length; i++) {
      const a = views[i];
      if (!a || !a.free) continue;
      for (let j = i + 1; j < views.length; j++) {
        const o = views[j];
        if (!o || !o.free || Math.abs(a.base.y - o.base.y) > 0.5) continue;
        let dx = a.base.x - o.base.x, dz = a.base.z - o.base.z;
        const d = Math.hypot(dx, dz);
        if (d >= SPREAD) continue;
        if (d < 1e-3) { dx = Math.cos(i * 2.4 + j); dz = Math.sin(i * 2.4 + j); } else { dx /= d; dz /= d; }
        const k = (SPREAD - d) / 2;
        a.sepTo.x += dx * k; a.sepTo.z += dz * k;
        o.sepTo.x -= dx * k; o.sepTo.z -= dz * k;
      }
    }
  }

  function build(w) {
    clear();
    world = w;
    sync();
  }

  function clear() {
    views.forEach(function (v) { group.remove(v.w.group); });
    views = [];
    world = null;
  }

  // Новые рабочие (найм, «Вербовщик») — новые фигуры; облик — по номеру в бригаде.
  function sync() {
    if (!world) return;
    for (let i = views.length; i < world.builders.length; i++) {
      const b = world.builders[i];
      if (b.trade === 'engineer') { views.push(null); continue; }
      const w = factory.create(i * 7 + 3, mats);
      w.pos = new THREE.Vector3();
      w.heading = 0;
      w.setStack([], '');
      w.seat = new THREE.Mesh(SEAT, mats.planks);
      w.mat = new THREE.Mesh(MAT, mats.rope);
      [w.seat, w.mat].forEach(function (m) {
        m.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(m.geometry.attributes.position.count * 3).fill(1), 3));
        m.castShadow = m.receiveShadow = true;
        m.visible = false;
        w.group.add(m);
      });
      w.anim.target = new THREE.Vector3();
      group.add(w.group);
      views.push({ w: w, builder: b, yaw: undefined, last: new THREE.Vector3(), first: true, carryVersion: -1 });
    }
  }

  // Лестница в клетке или под ней: направление на стену, на которой она висит (game.js → mastDir).
  function mastDir(x, y, z) {
    const upper = world.rungByKey.get(MB.cellKey(x, y, z));
    if (upper && upper.built && !upper.removed) return [upper.ox, upper.oz];
    const lower = world.rungByKey.get(MB.cellKey(x, y - 1, z));
    if (lower && lower.built && !lower.removed) return [lower.ox, lower.oz];
    return null;
  }
  // Под ногами ни куба, ни настила: висит на лестнице.
  function hangingAt(cell) {
    if (cell[1] === 0) return false;
    const index = world.index;
    if (!index.inside(cell[0], cell[1] - 1, cell[2])) return false;
    return world.solidGrid[index.id(cell[0], cell[1] - 1, cell[2])] !== 1 && world.deckGrid[index.id(cell[0], cell[1], cell[2])] !== 1;
  }
  // Без опоры под ногами прижимается к соседнему кубу (game.js → clingShift).
  function clingShift(cell) {
    if (cell[1] === 0) return NO_SHIFT;
    const index = world.index;
    if (!index.inside(cell[0], cell[1] - 1, cell[2])) return NO_SHIFT;
    if (world.solidGrid[index.id(cell[0], cell[1] - 1, cell[2])] === 1) return NO_SHIFT;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < dirs.length; i++) {
      const x = cell[0] + dirs[i][0], z = cell[2] + dirs[i][1];
      if (!index.inside(x, cell[1], z)) continue;
      if (world.solidGrid[index.id(x, cell[1], z)] === 1) return [dirs[i][0] * 0.26, dirs[i][1] * 0.26];
    }
    return NO_SHIFT;
  }

  // Действие фигуры по фазе логики.
  function actionOf(b, mode, hanging) {
    if (mode === 'climb') return 'mantle';
    if (mode === 'descend') return 'jump';
    if (mode === 'ladder' || (hanging && b.phase !== 'walk')) return 'climb';
    switch (b.phase) {
      case 'place': return b.cell[1] > 0 && hanging ? 'work-high' : 'lay';
      case 'mine': return 'pick';
      case 'erect': return hanging ? 'work-high' : 'screw';
      case 'passage': return 'hammer';
      case 'campBuild': return 'lay';
      case 'campFetch': return 'pick';
      case 'plan': return 'plan';
      case 'meal': return 'eat';
      case 'break': return b.breakKind === 'sleep' ? 'sleep' : b.breakKind === 'rest' ? 'rest' : 'smoke';
      default: return 'idle';
    }
  }
  // Цвет частиц материала (крошка кирки, пыль кладки) — цвет материала оригинала.
  function fxColor(id) {
    const m = MB.MATERIAL[id];
    return _c.setHex(m ? m.color : 0x8a8178).toArray();
  }

  // Стопка за спиной: до 6 блоков, сколько — по заполнению ноши, материалы — то, что в руках, по порядку.
  function paintStack(v, b) {
    MB.carryLoad(b, world, load);
    const n = b.carry.length ? Math.max(1, Math.min(6, Math.ceil(load.fill * 6))) : 0;
    if (v.carryVersion === b.carryVersion && v.stackN === n) return;
    v.carryVersion = b.carryVersion;
    v.stackN = n;
    const list = [], ids = [];
    for (let i = 0; i < n; i++) {
      const piece = b.carry[Math.min(b.carry.length - 1, Math.floor(i / n * b.carry.length))];
      list.push(blockLook(piece.materialId));
      ids.push(piece.materialId);
    }
    v.w.setStack(list, ids.join(','));
  }

  function update(dt, time, tempo) {
    if (!world) return;
    sync();
    cheer = Math.max(0, cheer - dt);
    spread();
    for (let i = 0; i < views.length; i++) {
      const v = views[i];
      if (!v) continue;
      const b = world.builders[i], w = v.w;
      MB.builderPosition(b, world, pos);
      if (v.pose) { pos.x = v.pose.x; pos.y = v.pose.y; pos.z = v.pose.z; pos.mode = 'walk'; }
      const t = b.segmentT;
      const y = pos.mode === 'climb'
        ? b.from[1] + (b.to[1] - b.from[1]) * climbLift(pos.climb) + climbDip(pos.climb)
        : pos.mode === 'descend'
          ? b.from[1] + jumpHeight(pos.climb, b.to[1] - b.from[1]) + jumpDip(pos.climb)
          : pos.y;
      const w0 = mastDir(b.from[0], b.from[1], b.from[2]);
      const w1 = mastDir(b.to[0], b.to[1], b.to[2]);
      const wall = w1 || w0;
      const hanging = b.phase !== 'walk' && !!wall && hangingAt(b.cell);
      const cling = wall ? NO_SHIFT : clingShift(b.to);
      const nudgeX = ((w0 ? w0[0] : 0) + ((w1 ? w1[0] : 0) - (w0 ? w0[0] : 0)) * t) * LADDER_STAND;
      const nudgeZ = ((w0 ? w0[1] : 0) + ((w1 ? w1[1] : 0) - (w0 ? w0[1] : 0)) * t) * LADDER_STAND;
      _p.set((pos.x + 0.5 + cling[0] + nudgeX) * CELL, y * CELL, (pos.z + 0.5 + cling[1] + nudgeZ) * CELL);
      // Кладка: шаг к детали. Стена стоит по оси соседней клетки — в 2 м от рабочего, рука не достаёт: он
      // подходит на 0,42 м к лицу детали. Без пола у стены (стена на стене, настил лесов) — до края своей клетки.
      let stepTo = 0;
      if (!v.pose && b.phase === 'place' && b.carry.length && pos.mode !== 'ladder' && !hanging) {
        const piece = b.carry[0];
        const ddx = piece.x - b.cell[0], ddz = piece.z - b.cell[2];
        if (piece.y === b.cell[1] && Math.abs(ddx) + Math.abs(ddz) === 1) {
          const kind = ctx.kindAt ? ctx.kindAt(piece.x, piece.y, piece.z) : 'wall';
          const face = kind === 'wall' ? 0.18 : kind === 'pillar' ? 0.36 : 1.0;
          const under = piece.y === 0 ? 'ground' : ctx.kindAt ? ctx.kindAt(piece.x, piece.y - 1, piece.z) : null;
          const floor = under === 'ground' || under === 'mass' || under === 'plate';
          const off = (_p.x - (b.cell[0] + 0.5) * CELL) * ddx + (_p.z - (b.cell[2] + 0.5) * CELL) * ddz;
          const want = Math.min(CELL - face - 0.42, floor ? 9 : 0.92);
          stepTo = Math.max(0, want - off);
          v.stepDir = v.stepDir || new THREE.Vector3();
          v.stepDir.set(ddx, 0, ddz);
          v.stepLen = stepTo;
        }
      }
      v.step = (v.step || 0) + ((stepTo > 0 ? 1 : 0) - (v.step || 0)) * (1 - Math.exp(-dt * 6));
      if (v.step > 0.001 && v.stepDir) { const e = v.step * v.step * (3 - 2 * v.step); _p.addScaledVector(v.stepDir, v.stepLen * e); }
      // расходятся, если стоят друг в друге (spread): шаг в сторону — тоже ходьба
      v.base = (v.base || new THREE.Vector3()).copy(_p);
      v.free = !v.pose && pos.mode === 'walk' && !hanging;
      v.sep = v.sep || new THREE.Vector3();
      v.sep.lerp(v.free ? v.sepTo || ZERO : ZERO, tempo >= 20 ? 1 : 1 - Math.exp(-dt * 4));
      _p.add(v.sep);
      // скорость шага — по фактическому сдвигу (на ×20 и шаги чаще)
      const moved = v.first ? 0 : Math.hypot(_p.x - v.last.x, _p.z - v.last.z);
      const speed = dt > 0 ? moved / dt : 0;
      v.last.copy(_p);
      v.first = false;
      w.pos.copy(_p);
      w.group.position.copy(_p);
      // поворот: к стене у лестницы, иначе к точке, куда он смотрит (faceX/faceZ — клетка цели)
      let yawTarget = v.yaw === undefined ? w.group.rotation.y : v.yawTarget;
      const dx = b.to[0] - b.from[0], dz = b.to[2] - b.from[2];
      if ((pos.mode === 'ladder' || hanging) && wall) yawTarget = Math.atan2(wall[0], wall[1]);
      // на куб и с куба — лицом по ходу
      else if ((pos.mode === 'climb' || pos.mode === 'descend') && (dx || dz)) yawTarget = Math.atan2(dx, dz);
      else {
        const fx = (b.faceX + 0.5) * CELL - _p.x, fz = (b.faceZ + 0.5) * CELL - _p.z;
        if (fx * fx + fz * fz > 0.0016) yawTarget = Math.atan2(fx, fz);
      }
      v.yawTarget = yawTarget;
      if (v.yaw === undefined || tempo >= 20) v.yaw = yawTarget;
      else if (dt > 0) {
        let turn = yawTarget - v.yaw;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        const step = TURN_SPEED * dt * Math.max(1, tempo);
        v.yaw += Math.abs(turn) <= step ? turn : Math.sign(turn) * step;
      }
      if (v.pose) v.yaw = v.pose.yaw;
      // разворот на месте — переступает (people.js): скорость поворота, рад/с
      const dYaw = v.prevYaw === undefined ? 0 : Math.atan2(Math.sin(v.yaw - v.prevYaw), Math.cos(v.yaw - v.prevYaw));
      v.prevYaw = v.yaw;
      w.anim.turn = dt > 0 && tempo < 20 ? Math.abs(dYaw) / dt : 0;
      w.heading = v.yaw;
      w.group.rotation.y = v.yaw;
      // спит в бытовке — внутри, не видно
      const indoors = b.sleepPlace === 'dorm' && b.phase === 'break' && b.breakKind === 'sleep';
      w.group.visible = !indoors && (solo < 0 || solo === i);
      const a = w.anim;
      const action = v.pose ? v.pose.action : cheer > 0 && pos.mode === 'walk' && !hanging && b.phase !== 'walk' ? 'cheer' : actionOf(b, pos.mode, hanging);
      if (a.action !== action) { a.from = a.action; a.action = action; a.t = 0; a.prev = 0; }
      // цели рук и реквизит по действию
      a.hold = null;
      if (v.pose) {
        // проверка движений: цель перед рабочим на заданной высоте, блок — первый материал уровня
        const ahead = action === 'plan' ? 0.55 : 0.5;
        a.target.set(_p.x + Math.sin(v.yaw) * ahead, _p.y + (action === 'plan' ? 0.89 : v.pose.h), _p.z + Math.cos(v.yaw) * ahead);
        const id = world.level.blocks[0] ? world.level.blocks[0].materialId : '';
        if (action === 'lay' && id) a.hold = blockLook(id);
        a.fxColor = fxColor(id);
        a.fxMetal = !!v.pose.metal;
      } else if (action === 'lay') {
        const piece = b.carry[0] || null;
        if (!piece) { a.target.set(_p.x + Math.sin(v.yaw) * 0.65, _p.y + 0.6, _p.z + Math.cos(v.yaw) * 0.65); }
      }
      if (!v.pose && action === 'lay' && b.carry.length) {
        const piece = b.carry[0];
        a.hold = blockLook(piece.materialId);
        a.fxColor = fxColor(piece.materialId);
        a.fxMetal = familyOf(MB, piece.materialId) === 'metal';
        if (!(ctx.layPoint && ctx.layPoint(piece, _p, a.target))) a.target.set(_p.x + Math.sin(v.yaw) * 0.7, _p.y + 0.6, _p.z + Math.cos(v.yaw) * 0.7);
      } else if (!v.pose && action === 'pick') {
        // набирает группу блоков одного материала (logic.js → mineQueue)
        const group = b.mineQueue && b.mineQueue[0];
        const id = group && group.blocks && group.blocks[0] ? group.blocks[0].materialId : b.carry[0] ? b.carry[0].materialId : '';
        a.fxColor = fxColor(id);
      } else if (!v.pose && action === 'plan') {
        // стол — перед рабочим (yard.js: столешница 0,86 м, на 0,6 м по ходу взгляда)
        a.target.set((b.homeCell[0] + 0.5) * CELL, 0.89, (b.homeCell[2] + 0.5) * CELL + 0.6);
      }
      w.seat.visible = action === 'eat';
      w.mat.visible = action === 'sleep';
      // шаг к детали и обратно — тоже ходьба
      a.speed = !v.pose && pos.mode === 'walk' && (b.phase === 'walk' || speed > 0.35) ? Math.min(speed, 12) : 0;
      // для пыли из-под ног (life.js)
      w.state = a.speed > 0 ? 'walk' : b.phase;
      a.climb = _p.y / 0.5;
      // лестница лесов: точка на её плоскости (scaffold.js: центр клетки + 0,28 клетки к стене) — руки на ступени
      if (action === 'climb' && wall) {
        const lx = (Math.floor(_p.x / CELL) + 0.5 + wall[0] * 0.28) * CELL, lz = (Math.floor(_p.z / CELL) + 0.5 + wall[1] * 0.28) * CELL;
        a.ladder = a.ladder || { x: 0, z: 0, ox: 0, oz: 0 };
        a.ladder.x = lx; a.ladder.z = lz; a.ladder.ox = wall[0]; a.ladder.oz = wall[1];
      } else a.ladder = null;
      a.stage = pos.mode === 'climb' || pos.mode === 'descend' ? pos.climb : 0;
      if (v.pose && (action === 'mantle' || action === 'jump')) a.stage = (a.t % 1.4) / 1.4;
      paintStack(v, b);
      a.load = b.carry.length ? load.fill : 0;
      a.over = b.carry.length ? load.overload || 1 : 1;
      // тропы: ноги по земле копят карту следов
      if (ctx.wear && _p.y < 0.25 && a.speed > 0.2) ctx.wear.add(_p.x, _p.z, dt * 0.05, 0.32);
      animateWorker(w, dt, time);
    }
  }

  return {
    group, build, update, clear,
    views: function () { return views; },
    cheer: function (seconds) { cheer = seconds; },
    // проверка движений: рабочий i стоит, где стоит, и играет действие (null — снова по логике)
    pose: function (i, action, opts) {
      const v = views[i];
      if (!v) return false;
      solo = action ? i : -1;
      if (!action) { v.pose = null; return true; }
      const b = v.builder;
      MB.builderPosition(b, world, pos);
      v.pose = Object.assign({ action: action, x: pos.x, y: pos.y, z: pos.z, yaw: v.yaw || 0, h: 0.6, metal: false }, v.pose && v.pose.action ? { x: v.pose.x, y: v.pose.y, z: v.pose.z, yaw: v.pose.yaw } : null, opts || null);
      return true;
    },
    figure: function (i) { return views[i] ? views[i].w : null; },
  };
}
