// Бригада оригинала в теле MakeHuman: каждый рабочий логики (world.builders) — фигура прототипа.
// Где он стоит и куда смотрит — как в game.js → updateSticks: MB.builderPosition, залезание на куб и
// спрыгивание по своим кривым, у лестницы — лицом к стене, с поворотом не быстрее TURN_SPEED. Что он
// делает — по фазе логики: ходьба, лестница, кирка в карьере, кладка к верху растущей детали (house.layPoint),
// леса, чертёж у стола, перекур, обед на ящике, отдых и сон на земле (подстилка). Ноша — стопка блоков на раме
// за спиной (MB.carryLoad, цвета материалов в руках); в руку при кладке — блок той же кладки. Клетка — 2 м.
// Одежда — по разряду рабочего (b.rank, cw-ranks.js), облик — по номеру найма, как фигурка оригинала; новый разряд
// (событие мира 'rankUp') — переодевание, вспышка каски цветом разряда, искры над ней и кулак вверх; «Айда курить!» ('smokeCall') — зовущий
// машет рукой и выдыхает дым; курящие одной компании стоят лицом друг к другу. Рост — по рангу экспертизы, как
// фигурка оригинала (game.js → rankLook: младший 0,9, средний 1, старший 1,1 — рабочие «Бригадира смены»).
// Пересборка площадки: прежние фигуры освобождаются (материалы, фактуры костей) через два кадра — когда новые уже
// собрали те же программы шейдеров (иначе программы ушли бы с прежними и собирались бы заново).
import * as THREE from 'three';
import { animateWorker } from './people.js?v=9f2863b';
import { CELL, familyOf, familyMaterial, familyTile, tintOf } from './families.js?v=9f2863b';
import { roundedBox, boxUV, Batch, hashStr } from './geo.js?v=9f2863b';
import { createSmoke } from './cw-smoke.js?v=9f2863b';

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
const WOOD = [0.76, 0.64, 0.42];   // щепа лесов (burst 0xc2a36b у оригинала)

// реквизит отдыха: ящик под обед; для сна — брезентовая подстилка и под голову скатанная куртка. Лёжа тело
// тянется от таза (точка рабочего) на 0,8 м к голове (−z) и на 1 м к ступням (+z): подстилка — под всем телом.
// Валик — там, где у позы голова (people.js → позы сна, обмер моделей cwf-tmp/lie.mjs): на спине — низкий под
// затылком; на боку — толще, под щекой, сдвинут к лицу; подстилка на боку — к груди (рука вытянута вперёд).
const SEAT = new THREE.BoxGeometry(0.44, 0.4, 0.34);
SEAT.translate(0, 0.2, -0.04);
function matGeometry(side) {
  const b = new Batch();
  const m = new THREE.Matrix4();
  const sx = 0.08 * side;
  b.add(boxUV(roundedBox(0.7, 0.026, 1.92, 0.012, 3), 0.6, 0.6), m.makeTranslation(sx, 0.013, 0.08), new THREE.Color(0x4a5444));
  b.add(boxUV(roundedBox(0.66, 0.012, 0.5, 0.005, 3), 0.6, 0.6, 0.3, 0.2), m.makeTranslation(sx, 0.03, 0.83), new THREE.Color(0x3a4236));
  const r = side ? 0.08 : 0.05;
  const roll = new THREE.CylinderGeometry(r, r, side ? 0.3 : 0.44, 12, 1);
  roll.rotateZ(Math.PI / 2);
  const p = { pos: roll.attributes.position.array, nrm: roll.attributes.normal.array, uv: roll.attributes.uv.array, index: roll.index.array };
  if (side) b.add(p, m.makeTranslation(0.18 * side, 0.106, -0.7), new THREE.Color(0x3b3a33));
  else b.add(p, m.makeTranslation(0, 0.055, -0.77), new THREE.Color(0x3b3a33));
  return b.geometry();
}
// по позе сна (people.js: зерно % 4 — 0 на спине, 1 на левом боку, 2 на правом, 3 сидя)
const MATS = [matGeometry(0), matGeometry(1), matGeometry(-1), null];
MATS[3] = MATS[0];
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
  // табачный дым: струйки с тлеющих сигарет и клуб над зовущим (cw-smoke.js, один вызов отрисовки; выдох дымом
  // рисует life.js по событию 'exhale' фигуры)
  const smoke = createSmoke(ctx);
  group.add(smoke.mesh);
  // прежние фигуры до освобождения: { views, frames }
  const dead = [];
  const _e = new THREE.Vector3();
  // события мира: разряд и зов на перекур (у фигуры — жест, искры — в очередь фигуры w.fx, их рисует life.js)
  if (E.on) E.on(function (event) {
    if (!world || !event.builder) return;
    const v = views.find(function (x) { return x && x.builder === event.builder; });
    if (!v) return;
    const w = v.w, head = w.pos.y + 1.85;
    if (event.type === 'rankUp') {
      w.dress(event.rank, v.builder.shirt);
      w.gesture('rank', 1.6);
      v.glint = 0.9;
      // искры над каской (каска вспыхивает цветом разряда — v.glint)
      if (w.fx.length < 20) {
        w.fx.push({ type: 'tap', x: w.pos.x, y: head, z: w.pos.z, metal: true });
        w.fx.push({ type: 'tap', x: w.pos.x, y: head + 0.12, z: w.pos.z, metal: true });
      }
    } else if (event.type === 'smokeCall') {
      // зовёт по пути на перекур; событие из перемотки, когда он уже курит, — без жеста
      if (v.builder.phase !== 'walk' || v.builder.walkPurpose !== 'smoke') return;
      w.gesture('call', 1.8);
      // облачко над головой (как burst оригинала): закурил на ходу
      smoke.puff(w.pos.x, head + 0.05, w.pos.z, Math.sin(w.heading), Math.cos(w.heading), 5);
    }
  });
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
    // flat — цвет материала оригинала (рама с ношей одной сеткой на «Телефоне», people.js → setStack)
    look = { geometry: b.geometry(), material: glass ? mats.glass : familyMaterial(mats, family), flat: new THREE.Color(MB.MATERIAL[id] ? MB.MATERIAL[id].color : 0x8a8178) };
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
    smoke.clear();
    const old = views.filter(Boolean);
    old.forEach(function (v) { group.remove(v.w.group); });
    if (old.length) dead.push({ views: old, frames: 0 });
    views = [];
    world = null;
  }
  // освободить ушедшие фигуры через 2 кадра (новые за это время собрали свои программы)
  function bury(force) {
    for (let i = dead.length - 1; i >= 0; i--) {
      if (!force && ++dead[i].frames < 3) continue;
      dead[i].views.forEach(function (v) { if (v.w.dispose) v.w.dispose(); });
      dead.splice(i, 1);
    }
  }

  // Новые рабочие (найм, «Вербовщик») — новые фигуры; облик — по номеру в бригаде.
  function sync() {
    if (!world) return;
    for (let i = views.length; i < world.builders.length; i++) {
      const b = world.builders[i];
      if (b.trade === 'engineer') { views.push(null); continue; }
      const w = factory.create(i * 7 + 3, mats, { index: b.index, shirt: b.shirt, rank: b.rank || 1 });
      // рост по рангу экспертизы (game.js → rankLook): рабочие «Бригадира смены» — младший, средний, старший
      w.group.scale.setScalar(sizeOf(b.expertiseRank));
      w.pos = new THREE.Vector3();
      w.heading = 0;
      w.setStack([], '');
      w.seat = new THREE.Mesh(SEAT, mats.planks);
      w.mat = new THREE.Mesh(MATS[w.seed % 4], mats.rope);
      [w.seat, w.mat].forEach(function (m) {
        if (!m.geometry.attributes.color) m.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(m.geometry.attributes.position.count * 3).fill(1), 3));
        // «Телефон»: в тени — только тело рабочего (factory.lite)
        m.castShadow = !factory.lite;
        m.receiveShadow = true;
        m.visible = false;
        w.group.add(m);
      });
      w.anim.target = new THREE.Vector3();
      group.add(w.group);
      views.push({ w: w, builder: b, yaw: undefined, last: new THREE.Vector3(), first: true, carryVersion: -1 });
    }
  }

  // Рост фигуры по рангу экспертизы: как RANK_LOOKS оригинала (без ранга — обычный рабочий).
  function sizeOf(rank) { return !rank ? 1 : rank < 1 ? 0.9 : rank > 1 ? 1.1 : 1; }

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

  // Действие фигуры по фазе логики. На лестнице, не поднимаясь (hanging, game.js → updateSticks): монтаж пролёта и
  // кладка — работа над головой ('work-high'), иначе — держится за ступени ('climb').
  function actionOf(b, mode, hanging) {
    if (mode === 'climb') return 'mantle';
    if (mode === 'descend') return 'jump';
    if (mode === 'ladder') return 'climb';
    if (hanging) return b.phase === 'erect' || b.phase === 'place' ? 'work-high' : 'climb';
    switch (b.phase) {
      case 'place': return 'lay';
      case 'mine': return 'pick';
      case 'erect': return 'screw';
      case 'passage': return 'hammer';
      case 'campBuild': return 'lay';
      case 'campFetch': return 'pick';
      case 'plan': return 'plan';
      case 'meal': return 'eat';
      // 'rest' (отдых сидя) у оригинала рисуется, но логика первых 2 часов его не ставит — поза на случай, если появится
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
  // Как paintCarryStack оригинала: куб, который кладёт, — в руках, на спине — остальное.
  function paintStack(v, b) {
    MB.carryLoad(b, world, load);
    const inHands = b.phase === 'place' ? b.carry[0] || null : null;
    const back = inHands ? b.carry.filter(function (x) { return x !== inHands; }) : b.carry;
    const fill = b.carry.length ? load.fill * back.length / b.carry.length : 0;
    const n = back.length ? Math.min(back.length, 6, Math.max(1, Math.ceil(fill * 6 - 0.001))) : 0;
    if (v.carryVersion === b.carryVersion && v.stackN === n && v.inHands === inHands) return;
    v.carryVersion = b.carryVersion;
    v.stackN = n;
    v.inHands = inHands;
    const list = [], ids = [];
    for (let i = 0; i < n; i++) {
      const piece = back[Math.min(back.length - 1, Math.floor(i * back.length / n))];
      list.push(blockLook(piece.materialId));
      ids.push(piece.materialId);
    }
    v.w.setStack(list, ids.join(','));
  }

  // Курящие одной компании (smokeGroup логики) — лицом к её середине: точка — среднее остальных курящих рядом.
  const _h = new THREE.Vector3();
  function huddle(v, b, out) {
    let n = 0;
    out.set(0, 0, 0);
    for (let j = 0; j < views.length; j++) {
      const o = views[j];
      if (!o || o === v) continue;
      const ob = o.builder;
      if (ob.smokeGroup !== b.smokeGroup || ob.phase !== 'break' || ob.breakKind !== 'smoke' || o.w.pos.distanceToSquared(v.w.pos) > 36) continue;
      out.add(o.w.pos);
      n++;
    }
    if (!n) return false;
    out.multiplyScalar(1 / n);
    return out.distanceToSquared(v.w.pos) > 0.04;
  }

  function update(dt, time, tempo) {
    bury(false);
    if (!world) { smoke.update(0); return; }
    sync();
    cheer = Math.max(0, cheer - dt);
    spread();
    for (let i = 0; i < views.length; i++) {
      const v = views[i];
      if (!v) continue;
      const b = world.builders[i], w = v.w;
      // разряд мог смениться и без события (опыт оффлайн — shareWorkerXp, покупки меты; понижение — без 'rankUp'),
      // и в строю проверки тоже
      if (w.rank !== (b.rank || 1)) w.dress(b.rank || 1, b.shirt);
      if (v.glint > 0 || w.glinted) {
        // новый разряд: каска вспыхивает и гаснет
        v.glint = Math.max(0, (v.glint || 0) - dt);
        w.helmetMat.emissive.setHex(w.look.helmet);
        w.helmetMat.emissiveIntensity = 1.6 * v.glint * v.glint;
        w.glinted = v.glint > 0;
      }
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
      const cling = wall || v.pose ? NO_SHIFT : clingShift(b.to);
      const nudgeX = v.pose ? 0 : ((w0 ? w0[0] : 0) + ((w1 ? w1[0] : 0) - (w0 ? w0[0] : 0)) * t) * LADDER_STAND;
      const nudgeZ = v.pose ? 0 : ((w0 ? w0[1] : 0) + ((w1 ? w1[1] : 0) - (w0 ? w0[1] : 0)) * t) * LADDER_STAND;
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
      // пауза оригинала (темп 0): замирает всё — поза, поворот, шаг к детали, расхождение (у оригинала dt = 0)
      const pdt = tempo === 0 && !v.pose ? 0 : dt;
      v.step = (v.step || 0) + ((stepTo > 0 ? 1 : 0) - (v.step || 0)) * (1 - Math.exp(-pdt * 6));
      if (v.step > 0.001 && v.stepDir) { const e = v.step * v.step * (3 - 2 * v.step); _p.addScaledVector(v.stepDir, v.stepLen * e); }
      // расходятся, если стоят друг в друге (spread): шаг в сторону — тоже ходьба
      v.base = (v.base || new THREE.Vector3()).copy(_p);
      v.free = !v.pose && pos.mode === 'walk' && !hanging;
      v.sep = v.sep || new THREE.Vector3();
      v.sep.lerp(v.free ? v.sepTo || ZERO : ZERO, tempo >= 20 ? 1 : 1 - Math.exp(-pdt * 4));
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
      else if (b.phase === 'break' && b.breakKind === 'smoke' && b.smokeGroup && huddle(v, b, _h)) yawTarget = Math.atan2(_h.x - _p.x, _h.z - _p.z);
      else {
        const fx = (b.faceX + 0.5) * CELL - _p.x, fz = (b.faceZ + 0.5) * CELL - _p.z;
        if (fx * fx + fz * fz > 0.0016) yawTarget = Math.atan2(fx, fz);
      }
      v.yawTarget = yawTarget;
      if (v.yaw === undefined || tempo >= 20) v.yaw = yawTarget;
      else if (pdt > 0) {
        let turn = yawTarget - v.yaw;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        const step = TURN_SPEED * pdt * Math.max(1, tempo);
        v.yaw += Math.abs(turn) <= step ? turn : Math.sign(turn) * step;
      }
      if (v.pose) v.yaw = v.pose.yaw;
      // разворот на месте — переступает (people.js): скорость поворота, рад/с
      const dYaw = v.prevYaw === undefined ? 0 : Math.atan2(Math.sin(v.yaw - v.prevYaw), Math.cos(v.yaw - v.prevYaw));
      v.prevYaw = v.yaw;
      w.anim.turn = pdt > 0 && tempo < 20 ? Math.abs(dYaw) / pdt : 0;
      w.heading = v.yaw;
      w.group.rotation.y = v.yaw;
      // спит в бытовке — внутри, не видно
      const indoors = b.sleepPlace === 'dorm' && b.phase === 'break' && b.breakKind === 'sleep';
      w.group.visible = !indoors && (solo < 0 || solo === i);
      const a = w.anim;
      // сдача объекта: радуются все, кроме тех, кто на лестнице и спит (как у оригинала); идущие машут на ходу
      const asleep = b.phase === 'break' && b.breakKind === 'sleep';
      const action = v.pose ? v.pose.action : cheer > 0 && pos.mode === 'walk' && !hanging && !asleep ? 'cheer' : actionOf(b, pos.mode, hanging);
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
      a.hiPlace = action === 'work-high' && b.phase === 'place';
      if (a.hiPlace && b.carry.length) { a.hold = blockLook(b.carry[0].materialId); a.fxColor = fxColor(b.carry[0].materialId); }
      else if (action === 'work-high') a.fxColor = WOOD;
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
      if ((action === 'climb' || action === 'work-high') && wall) {
        const lx = (Math.floor(_p.x / CELL) + 0.5 + wall[0] * 0.28) * CELL, lz = (Math.floor(_p.z / CELL) + 0.5 + wall[1] * 0.28) * CELL;
        a.ladder = a.ladder || { x: 0, z: 0, ox: 0, oz: 0 };
        a.ladder.x = lx; a.ladder.z = lz; a.ladder.ox = wall[0]; a.ladder.oz = wall[1];
      } else a.ladder = null;
      a.stage = pos.mode === 'climb' || pos.mode === 'descend' ? pos.climb : 0;
      if (v.pose && (action === 'mantle' || action === 'jump')) a.stage = (a.t % 1.4) / 1.4;
      paintStack(v, b);
      // заплечная рама — когда есть ноша или идёт в карьер за ней (как стопка оригинала: нет ноши — нет и стопки);
      // на перекуре, обеде, во сне и у стола — снята
      if (w.stack) w.stack.visible = !!v.pose ? action === 'lay' : b.carry.length > 0 || b.phase === 'mine' || (b.phase === 'walk' && b.walkPurpose === 'mine');
      a.load = b.carry.length ? load.fill : 0;
      a.over = b.carry.length ? load.overload || 1 : 1;
      // тропы: ноги по земле копят карту следов
      if (ctx.wear && _p.y < 0.25 && a.speed > 0.2) ctx.wear.add(_p.x, _p.z, dt * 0.05, 0.32);
      // усталость и голод сверх порога, где они уже замедляют (как значки оригинала: луна, яблоко), — поза и жесты
      if (v.pose) { a.tired = v.pose.tired || 0; a.hungry = v.pose.hungry || 0; }
      else {
        const fat = MB.fatigueFill ? MB.fatigueFill(b) : 0, ff = MB.SLEEP ? MB.SLEEP.debuffFrom : 1;
        const hun = MB.hungerFill ? MB.hungerFill(b) : 0, hf = MB.BALANCE ? MB.BALANCE.hungerDebuffFrom : 1;
        a.tired = asleep || fat <= ff ? 0 : Math.min(1, (fat - ff) / Math.max(0.05, 1 - ff));
        a.hungry = b.phase === 'meal' || hun <= hf ? 0 : Math.min(1, (hun - hf) / Math.max(0.05, 1 - hf));
      }
      // пауза оригинала: фигуры замирают, как у него (кроме проверки движений); на ×20 поза — сразу (people.js)
      const adt = pdt;
      a.snap = tempo >= 20 && !v.pose;
      animateWorker(w, adt, time);
      // Спит на лугу: трава под подстилкой примята (карта вытоптанности — трава на ней в 4 раза ниже; сквозь
      // лежащего и подстилку травинки 0,2–0,6 м проходили насквозь), три пятна вдоль тела; после сна остаётся
      // примятой, как настоящая лёжка. Карта — 128 м вокруг площадки: места сна дальше — без неё (scene.js →
      // grass.push, hooksNeeded).
      if (action === 'sleep' && ctx.wear && adt > 0 && w.group.visible && (v.worn || 0) < 1) {
        v.worn = (v.worn || 0) + adt * 0.8;
        const sy = Math.sin(v.yaw), cy = Math.cos(v.yaw);
        for (let k = -1; k <= 1; k++) ctx.wear.add(_p.x + sy * (0.1 + 0.6 * k), _p.z + cy * (0.1 + 0.6 * k), adt * 0.8, 0.55);
      } else if (action !== 'sleep') v.worn = 0;
      // дым: тонкая струйка с тлеющего кончика (выдох клубом — life.js по событию 'exhale'); на ×20 — без дыма
      if (adt > 0 && tempo < 20 && w.tools.cigarette.visible && w.group.visible) {
        v.wispT = (v.wispT || 0) + adt;
        if (v.wispT > 0.07) { v.wispT = 0; w.tools.cigarette.userData.ember.getWorldPosition(_e); smoke.wisp(_e); }
      }
    }
    smoke.update(tempo === 0 ? 0 : dt);
  }

  // Проверка одежды: рабочие строем за зданием (со стороны −z) лицом к камере — по cols в ряд, ряды назад со
  // сдвигом; false — снова по логике. Возвращает точки (м) рабочих по порядку найма и камеры строя спереди и сзади.
  function lineup(on, opts) {
    const o = Object.assign({ action: 'idle', gap: 0.42, cols: 4, row: 0.75 }, opts || null);
    const list = views.filter(Boolean);
    if (!on || !world || !list.length) { list.forEach(function (v) { v.pose = null; }); solo = -1; return null; }
    solo = -1;
    const fp = world.level.footprint;
    const cols = Math.min(o.cols, list.length);
    const z0 = fp.minZ - 4.5, xc = (fp.minX + fp.maxX + 1) / 2;
    const spots = [];
    list.forEach(function (v, k) {
      const r = Math.floor(k / cols), c = k % cols;
      const n = Math.min(cols, list.length - r * cols);
      const x = xc + (c - (n - 1) / 2) * o.gap, z = z0 + r * o.row;
      v.pose = { action: o.action, x: x - 0.5, y: 0, z: z - 0.5, yaw: Math.PI, h: 0.6, metal: false };
      spots.push([x * CELL, z * CELL]);
    });
    const cx = xc * CELL, cz = z0 * CELL;
    const span = cols * o.gap * CELL;
    return {
      spots: spots,
      cam: [cx, 1.6, cz - span * 2.2 - 2], target: [cx, 1.0, cz + 0.5],
      camBack: [cx, 1.7, cz + span * 2.2 + 3], targetBack: [cx, 1.1, cz + 0.5],
    };
  }

  // Точки, где рабочие приминают траву (grass.push, до 8, ближние к камере): стоящий — ступни (точка рабочего),
  // лежащий — голова, таз и колени, сидящий — таз и стопы. Для scene.js (hooksNeeded): сейчас он передаёт только
  // точки рабочих, и лежащий примят лишь у таза.
  const PRESS = [], _pc = [];
  function pressPoints(camera) {
    _pc.length = 0;
    views.forEach(function (v) {
      if (!v || !v.w.group.visible || v.w.pos.y > 0.4) return;
      const w = v.w, sy = Math.sin(w.heading || 0), cy = Math.cos(w.heading || 0);
      const lying = w.anim.action === 'sleep' && w.anim.t > 1.0, sit = lying && w.seed % 4 === 3;
      const offs = sit ? [0, 0.45] : lying ? [-0.62, 0, 0.5] : [0];
      const d = camera ? w.pos.distanceToSquared(camera.position) : 0;
      offs.forEach(function (o) { _pc.push({ d: d, x: w.pos.x + sy * o, y: w.pos.y, z: w.pos.z + cy * o }); });
    });
    _pc.sort(function (a, b) { return a.d - b.d; });
    PRESS.length = Math.min(8, _pc.length);
    for (let i = 0; i < PRESS.length; i++) (PRESS[i] = PRESS[i] || new THREE.Vector3()).set(_pc[i].x, _pc[i].y, _pc[i].z);
    return PRESS;
  }

  return {
    group, build, update, clear, pressPoints,
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
    lineup: lineup,
  };
}

