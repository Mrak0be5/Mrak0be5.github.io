// Бригада оригинала в теле MakeHuman: каждый рабочий логики (world.builders) — фигура прототипа.
// Где он стоит и куда смотрит — как в game.js → updateSticks: MB.builderPosition, залезание на куб и
// спрыгивание по своим кривым, у лестницы — лицом к стене, с поворотом не быстрее TURN_SPEED. Что он
// делает — по фазе логики: ходьба, лестница, набор в карьере, укладка, леса, план у стола, отдых.
// Ноша — стопка блоков на раме за спиной (MB.carryLoad, цвета материалов в руках). Клетка — 2 м.
import * as THREE from 'three';
import { animateWorker } from './people.js?v=0c1cc5f';
import { CELL, familyOf, familyMaterial, familyTile, tintOf } from './families.js?v=0c1cc5f';
import { roundedBox, boxUV, Batch, hashStr } from './geo.js?v=0c1cc5f';

const TURN_SPEED = 9;       // рад/с (game.js)
const LADDER_STAND = -0.1;  // доля клетки: стоит чуть перед лестницей
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
      default: return 'idle';
    }
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
    for (let i = 0; i < views.length; i++) {
      const v = views[i];
      if (!v) continue;
      const b = world.builders[i], w = v.w;
      MB.builderPosition(b, world, pos);
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
      const sit = b.phase === 'break' && b.breakKind === 'rest' ? 0.12 : 0;
      _p.set((pos.x + 0.5 + cling[0] + nudgeX) * CELL, (y - sit) * CELL, (pos.z + 0.5 + cling[1] + nudgeZ) * CELL);
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
      w.heading = v.yaw;
      w.group.rotation.y = v.yaw;
      // спит в бытовке — внутри, не видно
      const indoors = b.sleepPlace === 'dorm' && b.phase === 'break' && b.breakKind === 'sleep';
      w.group.visible = !indoors;
      const a = w.anim;
      const action = actionOf(b, pos.mode, hanging);
      if (a.action !== action) { a.action = action; a.t = 0; }
      a.speed = pos.mode === 'walk' && b.phase === 'walk' ? Math.min(speed, 12) : 0;
      // для пыли из-под ног (life.js)
      w.state = a.speed > 0 ? 'walk' : b.phase;
      a.climb = _p.y / 0.5;
      a.stage = pos.mode === 'climb' || pos.mode === 'descend' ? pos.climb : 0;
      paintStack(v, b);
      // тропы: ноги по земле копят карту следов
      if (ctx.wear && _p.y < 0.25 && a.speed > 0.2) ctx.wear.add(_p.x, _p.z, dt * 0.05, 0.32);
      animateWorker(w, dt, time);
    }
  }

  return {
    group, build, update, clear,
    views: function () { return views; },
    figure: function (i) { return views[i] ? views[i].w : null; },
  };
}
