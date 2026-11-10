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
import { animateWorker } from './people.js?v=ff29707';
import { CELL, familyOf, familyMaterial, familyTile, tintOf } from './families.js?v=ff29707';
import { roundedBox, boxUV, Batch, hashStr } from './geo.js?v=ff29707';
import { createSmoke } from './cw-smoke.js?v=ff29707';
import { LAY, PHASE, ashlarStone, hash11 } from './ms-lay.js?v=ff29707';
import { createCarry } from './sk-crew.js?v=ff29707';

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
  // Переноска по материалу и запас у места работы (sk-crew.js): носилка ходки по семейству (коза, тачка, брус и лист
  // на плече, вёдра, рама со стеклом), погрузка у карьера по штуке, выкладка ноши на поддон у детали и кладка с него;
  // поддоны крана — тоже запас. Часы рук кладки ждут выкладку (LAY.hold), левая берёт пачку с поддона (LAY.source).
  // views — фигуры и подмости бригады (тачка и носилки на полу не ставятся в рабочих и в настилах)
  const carry = createCarry({ E: E, mats: mats, lite: !!factory.lite, kindAt: ctx.kindAt, ground: ctx.ground, site: ctx.site, views: function () { return views; } });
  group.add(carry.group);
  const _hp = {}, _hP = new THREE.Vector3();
  // руки ждут выкладку ноши (модуль запаса) и подход к точке стойки (ходьба к детали в начале укладки — часы рук стоят,
  // пока он не встал: v.arrive — секунды логики от начала укладки до прихода). Приход считается раз на деталь в её
  // первый кадр (здание спрашивает часы рук раньше бригады — prepArrive отсюда): число пачек K не меняется посреди куба
  LAY.hold = function (blk) {
    const h = carry.hold(blk) || 0;
    const v = blk && blk.owner >= 0 ? views[blk.owner] : null;
    if (!v) return h;
    const b = world && world.builders[blk.owner];
    if (v.arriveOf !== blk && !v.pose && b && b.phase === 'place' && b.carry[0] === blk) {
      // точка рабочего по логике — сейчас (кадр бригады ещё не был: после перемотки логики прошлая точка устарела)
      MB.builderPosition(b, world, _hp);
      prepArrive(v, b, blk, _hP.set((_hp.x + 0.5) * CELL, _hp.y * CELL, (_hp.z + 0.5) * CELL), LAY.tempo);
    }
    // деталь выше плеч (ярусом выше, верх стены, стекло в окне над головой) — руки ждут и подъём подмостей до первой
    // пачки (настил поднимается после выкладки, 3,5 м/с): кладёт, когда уже поднят, а не едет вверх посреди пачки
    const h0 = v.arriveOf === blk && v.arrivePoured === blk.poured ? Math.max(h, v.arrive) : h;
    if (!(v.riseOf === blk && v.risePoured === blk.poured && v.rise > 0) || !b) return h0;
    // короткая укладка — ждёт подъём, сколько можно, не теряя цикла руки (≥ 0,7 с на пачки, как MIN_TIED с запасом)
    const per = b.actionT + b.timer, tp = Math.max(1, LAY.tempo);
    return h0 + Math.max(0, Math.min(v.rise, per - h0 - 0.7 * tp));
  };
  LAY.source = function (b, blk, out) {
    const g = carry.grab(blk);
    if (!g) return false;
    out[0] = g.x; out[1] = g.y; out[2] = g.z;
    return true;
  };
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
  // Брусок единицы кладки w × h × d с фактурой одной её единицы: грань — внутри одного кирпича, камня, бруса, листа,
  // щита (середина единицы ряда 0 плитки — без шва поперёк). i — номер единицы в ряду (разные кирпичи пачки).
  function unitPiece(family, w, h, d, r, i) {
    const tile = familyTile(family);
    let ou = 0.25, ov = 0.125;
    if (family === 'brick') { ou = 0.125 + 0.25 * (i % 4); ov = 0.0625; }
    else if (family === 'stone') { ou = ashlarStone(0).u; ov = 1 / 12; }
    else if (family === 'wood') { ou = hash11(0.7) + 0.5; ov = 0.05; }
    else if (family === 'metal') { ov = 0.0625; }
    return boxUV(roundedBox(w, h, d, r, 3), tile[0], tile[1], ou, ov);
  }
  function blockLook(id) {
    let look = looks.get(id);
    if (look) return look;
    const family = familyOf(MB, id);
    const glass = family === 'glass';
    const tile = glass ? [0.4, 0.4] : familyTile(family);
    const t = glass ? [1, 1, 1] : tintOf(MB, id, family);
    const h = hashStr(id);
    const b = new Batch(), col = new THREE.Color(t[0], t[1], t[2]), m = new THREE.Matrix4();
    // в слоте рамы (0,19 м): кирпич — пачка из трёх ложком вдоль рамы, брус — обрезок, остальное — блок с фактурой одной
    // единицы кладки (в оригинале — кубик цвета материала)
    if (family === 'brick') for (let i = 0; i < 3; i++) b.add(unitPiece(family, 0.12, 0.062, 0.25, 0.006, i), m.makeTranslation(0, (i - 1) * 0.065, 0), col);
    else if (family === 'wood') b.add(unitPiece(family, 0.17, 0.17, 0.3, 0.012, 0), m.identity(), col);
    else if (glass || family === 'gem') b.add(boxUV(roundedBox(BLOCK, BLOCK, BLOCK, 0.008, 3), tile[0], tile[1], (h % 97) / 97, (h % 89) / 89), m.identity(), col);
    else b.add(unitPiece(family, BLOCK, BLOCK, BLOCK, 0.008, 0), m.identity(), col);
    // flat — цвет материала оригинала (рама с ношей одной сеткой на «Телефоне», people.js → setStack)
    look = { geometry: b.geometry(), material: glass ? mats.glass : familyMaterial(mats, family), flat: new THREE.Color(MB.MATERIAL[id] ? MB.MATERIAL[id].color : 0x8a8178) };
    looks.set(id, look);
    return look;
  }
  // В руке каменщика — то, что он кладёт (ms-lay.js — в такт рукам): три кирпича пачкой, тёсаный камень, обрезок
  // бруса, лист с заклёпками, щит, плита; фактура — та же кладка, грань — внутри одной её единицы (без шва поперёк).
  const hands = new Map();
  function handLook(id) {
    let look = hands.get(id);
    if (look) return look;
    const family = familyOf(MB, id);
    if (family === 'gem') { look = blockLook(id); hands.set(id, look); return look; }
    if (family === 'glass') {
      // стекло — лист 0,5 × 0,5 м (вставляет в раму окна)
      const g = new Batch();
      g.add(boxUV(roundedBox(0.5, 0.5, 0.01, 0.003, 2), 0.4, 0.4), new THREE.Matrix4(), new THREE.Color(1, 1, 1));
      look = { geometry: g.geometry(), material: mats.glass, family: family };
      hands.set(id, look);
      return look;
    }
    const t = tintOf(MB, id, family);
    const col = new THREE.Color(t[0], t[1], t[2]);
    const b = new Batch(), m = new THREE.Matrix4();
    // кирпич 250 × 62 × 120 мм — три пачкой; камень; обрезок бруса 0,42 м (крупнее — в руке торчит над головой); лист; плита; блок
    if (family === 'brick') for (let i = 0; i < 3; i++) b.add(unitPiece(family, 0.25, 0.062, 0.12, 0.006, i), m.makeTranslation(0, (i - 1) * 0.065, 0), col);
    else if (family === 'stone') b.add(unitPiece(family, 0.34, 0.22, 0.2, 0.02, 0), m.identity(), col);
    else if (family === 'wood') b.add(unitPiece(family, 0.42, 0.17, 0.17, 0.012, 0), m.identity(), col);
    else if (family === 'metal') b.add(unitPiece(family, 0.5, 0.012, 0.32, 0.003, 0), m.identity(), col);
    else if (family === 'marble') b.add(unitPiece(family, 0.4, 0.05, 0.3, 0.006, 0), m.identity(), col);
    else b.add(unitPiece(family, 0.3, 0.2, 0.2, 0.012, 0), m.identity(), col);
    look = { geometry: b.geometry(), material: familyMaterial(mats, family), family: family };
    hands.set(id, look);
    return look;
  }
  // В окне «положить» в руке — одна единица (та, что ложится сейчас): кирпич ложком; остальные — как в handLook
  const ones = new Map();
  function handOne(id) {
    let look = ones.get(id);
    if (look) return look;
    const family = familyOf(MB, id);
    if (family !== 'brick') { look = handLook(id); ones.set(id, look); return look; }
    const t = tintOf(MB, id, family);
    const b = new Batch();
    b.add(unitPiece(family, 0.25, 0.062, 0.12, 0.006, 1), new THREE.Matrix4(), new THREE.Color(t[0], t[1], t[2]));
    look = { geometry: b.geometry(), material: familyMaterial(mats, family), family: family };
    ones.set(id, look);
    return look;
  }
  // Кладка: где встать (стопы, мир) — у лица детали со стороны рабочего, в 0,5 м от постели, напротив пачки (вдоль
  // ряда за ней — по одной в такт рукам), только по полу своего яруса: клетка рабочего, клетка детали перед стеной,
  // соседняя свободная клетка с полом под ногами (на стене — по её гребню). Нельзя встать у лица (за ним пустота,
  // деталь по диагонали) — ближайшая к нему точка, где можно стоять: на прямой к рабочему, в его клетке и в четырёх
  // соседних. Ящик детали и пачка — building.js (LAY.info).
  // зазор от лица детали: в первый кадр укладки — 0,5 м (по нему модуль запаса ставит поддон, его край — у лица), потом
  // ближе — 0,4 м (рука достаёт середину пачки без вытягивания)
  const GAP = 0.4, GAP0 = 0.5;
  const _s = new THREE.Vector3();
  // сведения о детали до укладки (LAY.preview): как LAY.info, без часов рук
  const PV_INFO = { mode: '', box: null, xView: true, kind: '', bed: null, pack: [0, 0, 0] };
  function standFor(b, piece, info, P, out, gap) {
    gap = gap || GAP;
    // до укладки (подход заранее, первый кадр) — ящик и лицо от здания, как будут в сведениях о пачке (плита — первая
    // полоса у ближнего края ящика)
    if (!info && LAY.preview) {
      const pv = LAY.preview(piece, [(b.cell[0] + 0.5) * CELL, (b.cell[2] + 0.5) * CELL]);
      if (pv) {
        const q = PV_INFO, bx = pv.box;
        q.box = bx; q.xView = pv.xView; q.kind = pv.kind; q.bed = pv.kind === 'plate' ? bx : null;
        q.pack[0] = (bx[0] + bx[3]) / 2; q.pack[1] = bx[4]; q.pack[2] = (bx[2] + bx[5]) / 2;
        info = q;
      }
    }
    const tied = !!info && info.mode === 'tied';
    let box = info && info.box;
    const xv = info ? info.xView : undefined;
    if (!box) {
      const kind = ctx.kindAt ? ctx.kindAt(piece.x, piece.y, piece.z) : 'wall', h = kind === 'wall' || kind === 'pillar' ? 0.2 : 1;
      const x0 = (piece.x + 0.5) * CELL, z0 = (piece.z + 0.5) * CELL;
      box = [x0 - h, 0, z0 - h, x0 + h, 0, z0 + h];
    }
    const cx = (box[0] + box[3]) / 2, cz = (box[2] + box[5]) / 2, hx = (box[3] - box[0]) / 2, hz = (box[5] - box[2]) / 2;
    const dx = P.x - cx, dz = P.z - cz;
    const px = info ? info.pack[0] : cx, pz = info ? info.pack[2] : cz;
    const clamp = THREE.MathUtils.clamp;
    // плита у ног (перекрытие яруса ниже): идёт по уложенным полосам — в 0,45 м за ближним краем пачки, по середине
    // полосы; вне плиты — как у стены
    if (info && info.kind === 'plate' && info.bed && Math.abs(box[4] - P.y) < 0.3) {
      const bed = info.bed, ax = Math.abs(dx) >= Math.abs(dz), sg = ax ? (dx >= 0 ? -1 : 1) : (dz >= 0 ? -1 : 1);
      const near = ax ? (sg > 0 ? bed[0] : bed[3]) : (sg > 0 ? bed[2] : bed[5]);
      if (ax) out.set(near - sg * 0.45, P.y, cz); else out.set(cx, P.y, near - sg * 0.45);
      plateNear = near; plateSg = sg; plateAx = ax; plateBox = box; standAxis = null;
      if (onPlate(out)) return out;
      // ещё не на уложенном (первые полосы): ближайшая к этой точке, где можно стоять, — на прямой к рабочему, в его
      // клетке и в соседних (гребень стены у края плиты, а не угол развилки по диагонали от неё)
      return nearestStand(b, P, out);
    }
    plateBox = null;
    // лицо со стороны рабочего — по оси, где он дальше за краем ящика (решено планом укладки — info.xView: по нему же
    // уложены ряды массива)
    const xFace = xv !== undefined ? xv : Math.abs(dx) - hx >= Math.abs(dz) - hz;
    standAxis = xFace ? 'z' : 'x';
    // вдоль лица: в такт рукам — к пачке, но не дальше TRAVEL от середины лица (ряд до 2 м рука достаёт наклоном и
    // поворотом корпуса — меньше шагов, запас остаётся в досягаемости); рядами (×5) — напротив пачки
    const lim = function (p, c, h) { return tied ? clamp(p, c - Math.max(0, h - TRAVEL), c + Math.max(0, h - TRAVEL)) : clamp(p, c - h - 0.15, c + h + 0.15); };
    if (xFace) out.set(cx + (dx >= 0 ? 1 : -1) * (hx + gap), P.y, lim(pz, cz, hz));
    else out.set(lim(px, cx, hx), P.y, cz + (dz >= 0 ? 1 : -1) * (hz + gap));
    nearestStand(b, P, out);
    // напротив лица встать негде (клетка стойки логики — по диагонали от детали: железо L10 с настила у пилястры) —
    // ближний к детали угол своей клетки, если он заметно ближе к ящику детали
    const dOut = boxDist(box, out);
    if (dOut > 0.7) {
      const lx = b.cell[0] * CELL, lz = b.cell[2] * CELL;
      _side.set(clamp(cx, lx + 0.25, lx + CELL - 0.25), P.y, clamp(cz, lz + 0.25, lz + CELL - 0.25));
      if (canStand(_side, b) && boxDist(box, _side) < dOut - 0.2) { out.copy(_side); return out; }
    }
    // стена с торца (уходит от рабочего): встать сбоку у её лица, если оттуда ближе к пачке (рядом с рабочим —
    // с его стороны, а в створе — с любой)
    const longX = hx > 2 * hz, longZ = hz > 2 * hx;
    if ((!xFace && longZ) || (xFace && longX)) {
      let best = Math.hypot(out.x - px, out.z - pz);
      const sides = longZ ? (Math.abs(dx) < 0.3 ? [1, -1] : [dx >= 0 ? 1 : -1]) : (Math.abs(dz) < 0.3 ? [1, -1] : [dz >= 0 ? 1 : -1]);
      for (let i = 0; i < sides.length; i++) {
        if (longZ) _side.set(cx + sides[i] * (hx + gap), P.y, tied ? lim(pz, cz, hz) : clamp(pz, box[2] + 0.2, box[5] - 0.2));
        else _side.set(tied ? lim(px, cx, hx) : clamp(px, box[0] + 0.2, box[3] - 0.2), P.y, cz + sides[i] * (hz + gap));
        nearestStand(b, P, _side);
        const d = Math.hypot(_side.x - px, _side.z - pz);
        if (d < best - 0.05) { best = d; out.copy(_side); }
      }
    }
    return out;
  }
  const _side = new THREE.Vector3();
  // от точки до ящика детали по горизонтали (0 — над ним)
  function boxDist(B, p) { return Math.hypot(Math.max(B[0] - p.x, 0, p.x - B[3]), Math.max(B[2] - p.z, 0, p.z - B[5])); }
  // ось вдоль лица последней стойки (standFor): 'x' | 'z'; у плиты — нет
  let standAxis = null;
  // Подход к точке стойки в начале укладки (ходьбой, update: до WALK_IN м/с — рабочие оригинала бегают 4–8 м/с, у точки —
  // 0,3 + 4·d м/с, до 6 см): время, с по часам страницы
  const WALK_IN = 3.0, WALK_D = (WALK_IN - 0.3) / 4;
  // к ручкам своей тачки — бегом, как рабочие оригинала (4–8 м/с): логика уже ведёт его дальше
  const WALK_GO = 6.0;
  function walkTime(d) {
    if (d <= 0.06) return 0;
    return Math.max(0, d - WALK_D) / WALK_IN + 0.25 * Math.log((0.3 + 4 * Math.min(d, WALK_D)) / 0.54);
  }
  // Подход к точке стойки — заранее (×1): на последнем шаге пути логики к детали (и на предыдущем, если он по ровному
  // на том же ярусе) вид ведёт рабочего не к середине клетки, а к стойке у лица детали (standFor по последней клетке):
  // к началу укладки он уже стоит, и часы рук не ждут подхода (укладка у земли ~1 с — иначе оставался ряд без руки).
  // Тачку по пути оставляет у стойки сбоку (место — carry.barrowRelease, вдоль взгляда на деталь, колесо у лица), от
  // неё — шаг вбок и к стойке без тачки. Сдвиг вида D(u) — ломаная по узлам (u — доля окна: номер шага + segmentT
  // логики, узлы — по длине пути вида: скорость вида ровная), к концу окна — стойка.
  const _pe = new THREE.Vector3(), _pr = new THREE.Vector3(), _pq = new THREE.Vector3(), _pd = new THREE.Vector3();
  function preTarget(b) {
    if (b.walkPurpose === 'place') return b.carry[0] || null;
    if (b.walkPurpose === 'route' && b.routeTargetId >= 0) for (let k = 0; k < b.carry.length; k++) if (b.carry[k].id === b.routeTargetId) return b.carry[k];
    return null;
  }
  // точка рабочего логики на шаге c0 → c1 в доле t (как в update: середина клетки и прижатие к соседнему кубу по c1)
  function stepPoint(c0, c1, t, out) {
    const cl = clingShift(c1);
    return out.set((c0[0] + (c1[0] - c0[0]) * t + 0.5 + cl[0]) * CELL, c0[1] * CELL, (c0[2] + (c1[2] - c0[2]) * t + 0.5 + cl[1]) * CELL);
  }
  function windowPoint(path, w0, nseg, u, out) {
    const s = Math.min(nseg - 1, Math.floor(u * nseg)), t = u * nseg - s;
    return stepPoint(path[w0 + s], path[w0 + s + 1], t, out);
  }
  // Окно подхода заранее: клетки последних шагов к детали blk по ровному на одном ярусе — [предпоследний шаг,] последний
  // и номер шага, который идёт сейчас. У маршрута логики (walkPurpose 'route') путь шага — две клетки, конец — его
  // последний шаг (маршрут к этой детали); у 'place' — путь целиком. → { cells, leg } или null.
  const _win = { cells: [], leg: 0 };
  function preWindow(b, blk) {
    const cells = _win.cells;
    cells.length = 0;
    if (b.walkPurpose === 'route') {
      const rt = b.routeId >= 0 && world.routes ? world.routes[b.routeId] : null, st = rt && rt.steps;
      if (!st || rt.targetId !== blk.id || !st.length) return null;
      const L = st.length, k = rt.stepIndex;
      if (k < L - 2 || k > L - 1) return null;
      const lastC = st[L - 1].cell, prevC = L >= 2 ? st[L - 2].cell : null, firstC = L >= 3 ? st[L - 3].cell : null;
      if (k === L - 1) {
        if (!same(b.to, lastC)) return null;
        // окно из двух шагов, если предыдущий шаг маршрута — по ровному с того же яруса, и этот идёт с его клетки
        if (prevC && firstC && prevC[1] === lastC[1] && firstC[1] === lastC[1] && same(b.from, prevC) && !st[L - 1].piece && !st[L - 2].piece) { cells.push(firstC, prevC, lastC); _win.leg = 1; }
        else { cells.push(b.from, lastC); _win.leg = 0; }
      } else {
        if (!prevC || !same(b.to, prevC) || prevC[1] !== lastC[1] || b.from[1] !== lastC[1] || !firstC || !same(b.from, firstC) || st[L - 1].piece || st[L - 2].piece) return null;
        cells.push(firstC, prevC, lastC); _win.leg = 0;
      }
    } else {
      const path = b.path, n = path ? path.length : 0;
      if (n < 2 || b.pathIndex > n - 2) return null;
      const w0 = n >= 3 && path[n - 3][1] === path[n - 1][1] && path[n - 2][1] === path[n - 1][1] ? n - 3 : n - 2;
      if (b.pathIndex < w0) return null;
      for (let k = w0; k < n; k++) cells.push(path[k]);
      _win.leg = b.pathIndex - w0;
    }
    const y = cells[cells.length - 1][1];
    for (let k = 0; k < cells.length; k++) if (cells[k][1] !== y) return null;
    return _win;
  }
  function same(a, c) { return a[0] === c[0] && a[1] === c[1] && a[2] === c[2]; }
  function planPre(i, v, b, blk, cells, key) {
    const n = cells.length, last = cells[n - 1], nseg = n - 1;
    const pr = { blk: blk, key: key, cells: cells.slice(), nseg: nseg, ok: false, knots: null, rel: 2, ya: 0, S: new THREE.Vector3(), res: new THREE.Vector3() };
    const E = stepPoint(cells[n - 2], last, 1, _pe);
    standFor({ cell: last }, blk, LAY.info.get(blk) || null, E, pr.S, GAP0);
    const S = pr.S;
    const cx = (blk.x + 0.5) * CELL, cz = (blk.z + 0.5) * CELL;
    pr.ya = Math.hypot(cx - S.x, cz - S.z) > 0.05 ? Math.atan2(cx - S.x, cz - S.z) : v.yaw || 0;
    pr.knots = [[0, 0, 0], [1, S.x - E.x, S.z - E.z]];
    const sk = v.w.anim.sk;
    if (sk && sk.kind === 'barrow' && sk.push) {
      // тачку — у стойки сбоку (нет места — без подхода заранее: тачка ушла бы в стену)
      const rel = carry.barrowRelease(i, v, S, pr.ya, 0.3);
      if (!rel) return pr;
      const V0 = windowPoint(pr.cells, 0, nseg, 0, _pq), R = _pr.set(rel.x, S.y, rel.z);
      // от ручек — шаг в сторону стойки (мимо ручки), потом к стойке
      const lx = Math.cos(pr.ya), lz = -Math.sin(pr.ya), sx = R.x - lx * rel.side * 0.4, sz = R.z - lz * rel.side * 0.4;
      const L1 = Math.hypot(R.x - V0.x, R.z - V0.z), L2 = 0.4, L3 = Math.hypot(S.x - sx, S.z - sz), tot = L1 + L2 + L3;
      const u1 = L1 / tot, u2 = (L1 + L2) / tot;
      const P1 = windowPoint(pr.cells, 0, nseg, u1, new THREE.Vector3()), P2 = windowPoint(pr.cells, 0, nseg, u2, new THREE.Vector3());
      pr.knots = [[0, 0, 0], [u1, R.x - P1.x, R.z - P1.z], [u2, sx - P2.x, sz - P2.z], [1, S.x - E.x, S.z - E.z]];
      pr.rel = u1;
    }
    pr.ok = true;
    return pr;
  }
  // сдвиг ломаной D(u) → out
  function knotsAt(K, u, out) {
    let k = 1;
    while (k < K.length - 1 && u > K[k][0]) k++;
    const a = K[k - 1], c = K[k], t = c[0] > a[0] ? Math.min(1, Math.max(0, (u - a[0]) / (c[0] - a[0]))) : 1;
    return out.set(a[1] + (c[1] - a[1]) * t, 0, a[2] + (c[2] - a[2]) * t);
  }
  // Сдвиг вида подхода заранее (out — к точке логики) или false — не идёт к детали по ровному последним шагом. Сдвиг,
  // что был до окна (шаг от прошлой детали, прежнее окно), гаснет поверх ломаной за ~0,3 с — без скачка.
  function preApproach(i, v, b, out, dt) {
    if (b.phase !== 'walk') return false;
    const blk = preTarget(b);
    if (!blk || blk.built) return false;
    const win = preWindow(b, blk);
    if (!win) return false;
    const cells = win.cells, last = cells[cells.length - 1];
    if (mastDir(last[0], last[1], last[2])) return false;
    const key = cells.map(function (c) { return c.join(','); }).join(';');
    const u = Math.min(1, Math.max(0, (win.leg + b.segmentT) / (cells.length - 1)));
    let pr = v.pre;
    // стойка — по миру на миг плана: деталь легла (другая или своя прежняя той же ходки) — план заново
    if (!pr || pr.blk !== blk || pr.key !== key || pr.left !== world.remaining) {
      const was = v.pre;
      pr = v.pre = planPre(i, v, b, blk, cells, key);
      pr.left = world.remaining;
      // тачку к этой детали уже отпустил (план заново посреди подхода) — так и стоит
      if (was && was.blk === blk && v.preRelOf === blk) { if (pr.rel > 1) pr.rel = 0; } else v.preRelOf = null;
      if (pr.ok) { knotsAt(pr.knots, u, pr.res); pr.res.set((v.off ? v.off.x : 0) - pr.res.x, 0, (v.off ? v.off.z : 0) - pr.res.z); }
    }
    if (!pr.ok) return false;
    pr.res.multiplyScalar(Math.exp(-10 * dt));
    knotsAt(pr.knots, u, out);
    out.x += pr.res.x; out.z += pr.res.z;
    v.preU = u;
    // для разбора (rv-fin1.mjs): последний кадр подхода — доля, сдвиг, остаток, окно, шаг
    v.preDbg = [Math.round(u * 1000) / 1000, Math.round(out.x * 100) / 100, Math.round(out.z * 100) / 100, Math.round(pr.res.x * 100) / 100, Math.round(pr.res.z * 100) / 100, key, win.leg, Math.round(b.segmentT * 100) / 100];
    // тачку отпустил (sk-crew.js: стоит, где отпустил; у детали — там и место)
    v.preRel = u >= pr.rel ? blk : null;
    if (v.preRel) v.preRelOf = blk;
    return true;
  }
  // Первый кадр укладки блока blk (P — точка рабочего по логике): идёт ли к стойке ходьбой (дальше 0,45 м) и когда
  // встанет (v.arrive — с логики от начала укладки, не дальше 0,45 укладки) — раз на деталь
  const _sa = new THREE.Vector3();
  function prepArrive(v, b, blk, P, tempo) {
    standFor(b, blk, LAY.info.get(blk) || null, P, _sa, GAP0);
    const ox = v.off ? v.off.x : 0, oz = v.off ? v.off.z : 0;
    const d = Math.hypot(_sa.x - P.x - ox, _sa.z - P.z - oz);
    v.walkIn = tempo > 0 && tempo < 5 && d > 0.45;
    v.arriveOf = blk; v.arrivePoured = blk.poured;
    // для разбора (rv-fin1.mjs): откуда и куда подход, сдвиг вида в этот миг
    v.arriveDbg = [Math.round(d * 100) / 100, Math.round(_sa.x * 100) / 100, Math.round(_sa.z * 100) / 100, Math.round(P.x * 100) / 100, Math.round(P.z * 100) / 100, Math.round(ox * 100) / 100, Math.round(oz * 100) / 100, Math.round(b.actionT * 1000) / 1000];
    v.arrive = v.walkIn ? Math.min(0.45 * (b.actionT + b.timer), b.actionT + walkTime(d) * tempo) : 0;
  }
  // ход вдоль лица от середины: ряд длиной 2 h — стойки в пределах ±(h − TRAVEL), дальше рука достаёт сама (ряд 2 м —
  // ±0,1 м: стоит у середины, запас слева в досягаемости левой, к краям ряда — наклоном и поворотом корпуса)
  const TRAVEL = 0.9;
  // Свой запас у места работы (модуль запаса: поддон, куча, стопка, корыто рядом) — точка стойки не в нём: сдвиг
  // вдоль лица (ось ax: 'x' | 'z'), в сторону от запаса, до свободной точки, где можно стоять. Размеры — по виду
  // запаса (sk-stock.js → layoutOf, sk-props.js: поддон 1 × 0,8, корыто 0,92 × 0,62 в 1,05 м сбоку), плюс полкорпуса.
  const BODY = 0.22;
  function stockSize(e) {
    if (e.kind === 'pallet' || e.kind === 'crane') return [0.5, 0.4];
    if (e.kind === 'heap') return [0.42, 0.4];
    if (e.kind === 'stack') return e.fam === 'wood' ? [0.97, 0.36] : [0.52, 0.27];
    if (e.kind === 'tub') return [0.46, 0.31];
    return [0.35, 0.2];
  }
  function inBox(e, x, z, ox, hx, hz) {
    const c = Math.cos(e.yaw), sn = Math.sin(e.yaw), dx = x - e.x, dz = z - e.z;
    const lx = dx * c - dz * sn - ox, lz = dx * sn + dz * c;
    return Math.abs(lx) < hx + BODY && Math.abs(lz) < hz + BODY;
  }
  function stockAt(b, x, y, z) {
    const list = carry.stock.list();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.deck || e.fade > 0 || Math.abs(e.y - y) > 0.6) continue;
      const hs = stockSize(e);
      if (inBox(e, x, z, 0, hs[0], hs[1]) || (e.tub && inBox(e, x, z, 1.05, 0.46, 0.31))) return e;
    }
    return null;
  }
  function clearOfStock(b, P, out, ax) {
    const e = stockAt(b, out.x, out.y, out.z);
    if (!e) return out;
    const sg = (ax === 'x' ? out.x - e.x : out.z - e.z) >= 0 ? 1 : -1;
    for (let k = 0; k < 2; k++) {
      const dir = k ? -sg : sg;
      for (let d = 0.05; d <= 1.6; d += 0.05) {
        _s.set(out.x + (ax === 'x' ? dir * d : 0), out.y, out.z + (ax === 'z' ? dir * d : 0));
        if (!stockAt(b, _s.x, _s.y, _s.z) && canStand(_s, b)) return out.copy(_s);
      }
    }
    return out;
  }
  // Точка для модуля запаса (crew → v.stand: sk-crew.js → startPlace ставит запас слева от взгляда «точка → пачка» в
  // 0,78 м, sk-stock.js → spot): подобрана так, чтобы поддон встал слева от стоянки S, рядом (середина — в 0,72 м
  // влево и 0,05 м назад, ближний край — в 0,22 м от середины стоп: левая берёт с него, повернувшись влево с наклоном,
  // — сзади поддон рука не доставала). Стойка
  // у середины лица (±0,1 м, TRAVEL), поэтому поддон в досягаемости на всю укладку. Нет места — sk сам ищет другое у
  // этой точки. P1 — середина первой пачки.
  const STOCK_R = 0.78, STOCK_SIDE = 0.72, STOCK_BACK = 0.05;
  function stockAnchor(S, P1, out) {
    const fx0 = P1[0] - S.x, fz0 = P1[2] - S.z, fl = Math.hypot(fx0, fz0) || 1;
    const fx = fx0 / fl, fz = fz0 / fl;
    // лево взгляда на деталь: (fz, −fx); цель запаса T
    const Tx = S.x + fz * STOCK_SIDE - fx * STOCK_BACK, Tz = S.z - fx * STOCK_SIDE - fz * STOCK_BACK;
    const Dx = Tx - P1[0], Dz = Tz - P1[2], D2 = Dx * Dx + Dz * Dz;
    if (D2 <= STOCK_R * STOCK_R + 0.01) return out.copy(S);
    // D = −t·f + R·(fz, −fx): f и t из линейной системы (определитель — |D|²)
    const t = Math.sqrt(D2 - STOCK_R * STOCK_R);
    const gx = (-t * Dx - STOCK_R * Dz) / D2, gz = (STOCK_R * Dx - t * Dz) / D2;
    return out.set(P1[0] - t * gx, S.y, P1[2] - t * gz);
  }
  // Ближайшая к want точка, где можно стоять: на прямой от неё к рабочему, в его клетке и в соседних — want, прижатая
  // к клетке (0,15 м от краёв) и к её осям (гребень стены под ногами). Нет такой — где стоит.
  const _best = new THREE.Vector3();
  function nearestStand(b, P, want) {
    let bd = Infinity;
    const tryAt = function (x, z) {
      const d = (x - want.x) * (x - want.x) + (z - want.z) * (z - want.z);
      if (d >= bd) return;
      _s.set(x, P.y, z);
      if (!canStand(_s, b)) return;
      bd = d;
      _best.copy(_s);
    };
    for (let t = 1; t > 0.01; t -= 0.125) tryAt(P.x + (want.x - P.x) * t, P.z + (want.z - P.z) * t);
    const clamp = THREE.MathUtils.clamp;
    for (let i = 0; i < 5; i++) {
      const lx = (b.cell[0] + (i === 1 ? 1 : i === 2 ? -1 : 0)) * CELL, lz = (b.cell[2] + (i === 3 ? 1 : i === 4 ? -1 : 0)) * CELL;
      const qx = clamp(want.x, lx + 0.15, lx + CELL - 0.15), qz = clamp(want.z, lz + 0.15, lz + CELL - 0.15);
      tryAt(qx, qz);
      tryAt(lx + CELL / 2, qz);
      tryAt(qx, lz + CELL / 2);
    }
    return bd < Infinity ? want.copy(_best) : want.copy(P);
  }
  // по уложенной части плиты: внутри её ящика и до ближнего края пачки
  let plateBox = null, plateNear = 0, plateSg = 1, plateAx = true;
  function onPlate(s) {
    const B = plateBox;
    if (!B || s.x < B[0] || s.x > B[3] || s.z < B[2] || s.z > B[5]) return false;
    return ((plateAx ? s.x : s.z) - plateNear) * plateSg <= -0.15;
  }
  const FULL = { mass: true, plate: true, hatch: true, cut: true };
  function canStand(s, b) {
    const x = Math.floor(s.x / CELL), z = Math.floor(s.z / CELL), y = b.cell[1];
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    const own = x === b.cell[0] && z === b.cell[2];
    if (!own && world.solidGrid[index.id(x, y, z)] === 1) return false;
    if (y === 0 || world.deckGrid[index.id(x, y, z)] === 1) return true;
    if (world.solidGrid[index.id(x, y - 1, z)] !== 1) return false;
    const k = ctx.kindAt ? ctx.kindAt(x, y - 1, z) : 'mass';
    if (!k || FULL[k]) return true;
    // на стене и колонне — по их верху: колонна до 0,3 м от оси, стена — середина 0,36 м и гребни к готовым соседям
    // по связи (стена 36 см по оси клетки)
    const ox = s.x - (x + 0.5) * CELL, oz = s.z - (z + 0.5) * CELL, ax = Math.abs(ox), az = Math.abs(oz);
    if (k === 'pillar') return Math.max(ax, az) < 0.3;
    if (ax < 0.18 && az < 0.18) return true;
    if (az < 0.14) return linked(x + (ox > 0 ? 1 : -1), y - 1, z);
    if (ax < 0.14) return linked(x, y - 1, z + (oz > 0 ? 1 : -1));
    return false;
  }
  const LINK = { wall: true, mass: true, cut: true, hatch: true };
  function linked(x, y, z) {
    const index = world.index;
    if (!index.inside(x, y, z) || world.solidGrid[index.id(x, y, z)] !== 1) return false;
    const k = ctx.kindAt ? ctx.kindAt(x, y, z) : 'wall';
    return !!k && LINK[k] === true;
  }
  // Подмости: ряд выше плеч (деталь на ярус выше, верх стены) — каменщик кладёт с подмостей: настил из досок на
  // телескопических стойках, раздвигается из-под ног по мере кладки (по 0,25 м, до 2,75 м, 3,5 м/с — темп логики:
  // куб камня кладётся за 1–1,5 с) так, чтобы середина пачки была у пояса — груди (1,15 м над настилом); после
  // укладки он спрыгивает, подмости складываются. Только на ×1 в такт рукам (короче — руки тянутся вверх), на
  // сплошном полу (земля, настил лесов, массив, плита) и если над головой свободно. Настил — вдоль ряда, 1,6 × 0,7 м,
  // по середине детали (каменщик ходит по нему за пачкой).
  const PLAT = (function () {
    const b = new Batch(), m = new THREE.Matrix4(), white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < 4; i++) b.add(boxUV(roundedBox(1.6, 0.045, 0.17, 0.006, 3), 3.0, 1.6, 0, 0.2 * i), m.makeTranslation(0, -0.0225, -0.27 + 0.18 * i), white);
    // поперечины под досками
    [-0.7, 0, 0.7].forEach(function (x) { b.add(boxUV(roundedBox(0.06, 0.04, 0.7, 0.004, 3), 3.0, 1.6), m.makeTranslation(x, -0.065, 0), white); });
    const deck = b.geometry();
    const l = new Batch();
    [[-0.72, -0.28], [0.72, -0.28], [-0.72, 0.28], [0.72, 0.28]].forEach(function (q) { l.add(boxUV(roundedBox(0.045, 1, 0.045, 0.004, 1), 1, 1), m.makeTranslation(q[0], 0.5, q[1]), white); });
    // связи между стойками по длинным сторонам (растягиваются со стойками)
    [-0.28, 0.28].forEach(function (z) { l.add(boxUV(roundedBox(1.44, 0.035, 0.03, 0.003, 1), 1, 1), m.makeTranslation(0, 0.5, z), white); });
    return { deck: deck, legs: l.geometry() };
  })();
  function platformOf(v) {
    if (v.plat) return v.plat;
    const g = new THREE.Group();
    g.name = 'lay-platform';
    const deck = new THREE.Mesh(PLAT.deck, mats.planks), legs = new THREE.Mesh(PLAT.legs, mats.tube);
    [deck, legs].forEach(function (o) { o.castShadow = !factory.lite; o.receiveShadow = true; g.add(o); });
    g.visible = false;
    group.add(g);
    v.plat = { group: g, deck: deck, legs: legs, y: 0, to: 0, state: 'off', at: new THREE.Vector3(), yaw: 0, hop: 0, idle: 0 };
    return v.plat;
  }
  // нужная высота настила (м над полом) для пачки: её середина — у пояса — груди, верх — не выше плеч (верх массива
  // в 2 м — уже над головой); 0 — не нужна или нельзя
  const CHEST = 1.15, SHOULDER = 1.6, PLAT_MAX = 2.75;
  function platNeed(b, info, P, S) {
    if (!info || info.mode !== 'tied') return 0;
    const lo = info.bed ? info.bed[1] : info.pack[1] - 0.2;
    const mid = (lo + info.pack[1]) / 2 - P.y, over = Math.max(mid - CHEST, info.pack[1] - P.y - SHOULDER);
    if (mid < 1.45 && over < 0.3) return 0;
    const x = Math.floor(S.x / CELL), z = Math.floor(S.z / CELL), y = b.cell[1], index = world.index;
    if (!index.inside(x, y + 1, z) || world.solidGrid[index.id(x, y + 1, z)] === 1) return 0;
    if (y > 0 && world.deckGrid[index.id(x, y, z)] !== 1) {
      if (world.solidGrid[index.id(x, y - 1, z)] !== 1) return 0;
      const k = ctx.kindAt ? ctx.kindAt(x, y - 1, z) : 'mass';
      if (k && !FULL[k]) return 0;
    }
    // голова (1,8 м над настилом) выше следующего яруса — и над ним свободно
    const top = index.inside(x, y + 2, z) && world.solidGrid[index.id(x, y + 2, z)] === 1 ? 2.2 : PLAT_MAX;
    return THREE.MathUtils.clamp(Math.ceil(over / 0.25) * 0.25, 0.5, top);
  }
  // где на настиле запас модуля sk (sk-stock.js → layoutOf(fam, true).place): брус — вдоль заднего края, остальное (и
  // листы — обрезками) — у левого торца; пока его нет — по семейству детали
  function deckPile(v, info) {
    if (v && v.deckPile) return v.deckPile;
    const fam = info ? info.fam : '';
    return fam === 'wood' ? 'back' : 'end';
  }
  // Подмости рабочего v за кадр: возвращает подъём стоп (м). S — точка стойки (без подъёма), want — нужная высота.
  // Настил стоит для другой детали и стойка этой — не на нём (следующий блок из той же клетки в другую сторону; после
  // перемотки логики без кадров настил остаётся от прежней укладки): низкий — переставить сразу (в этот же кадр, до
  // модуля запаса: поддон — на новый настил), поднятый — спрыгнуть, сложить и поставить заново
  function platStale(pl, blk, S) {
    if (pl.state !== 'up' || pl.blk === blk) return false;
    const dx = S.x - pl.at.x, dz = S.z - pl.at.z, ax = Math.cos(pl.yaw), az = -Math.sin(pl.yaw);
    if (Math.abs(dx * ax + dz * az) <= 0.62 && Math.abs(dx * Math.sin(pl.yaw) + dz * Math.cos(pl.yaw)) <= 0.3) { pl.blk = blk; return false; }
    if (pl.y < 0.3) pl.state = 'off'; else { pl.state = 'hop'; pl.hop = 0; }
    return true;
  }
  function platStep(v, want, S, P, info, dt, arrived) {
    const pl = want > 0 || v.plat ? platformOf(v) : null;
    if (!pl) return 0;
    if (want > 0 && pl.state !== 'hop') {
      pl.idle = 0;
      if (pl.state !== 'up') {
        pl.blk = v.builder.carry[0] || null;
        // поставить у ног: вдоль ряда (поперёк взгляда на пачку), серединой — к середине детали (до 0,5 м вбок)
        pl.state = 'up';
        pl.yaw = Math.atan2(info.pack[0] - S.x, info.pack[2] - S.z);
        const ax = Math.cos(pl.yaw), az = -Math.sin(pl.yaw), B = info.box;
        // серединой хода по настилу — к середине детали: запас модуля sk у левого торца (+0,52 м, sk-crew.js →
        // startPlace) — настил на 0,05 м левее, стойки (−0,15…+0,04 м от середины настила) — у середины ряда, запас —
        // в 0,35–0,8 м от стоп, в досягаемости левой с наклоном
        const end = deckPile(null, info) === 'end';
        const shift = B ? THREE.MathUtils.clamp(((B[0] + B[3]) / 2 - S.x) * ax + ((B[2] + B[5]) / 2 - S.z) * az + (end ? 0.05 : 0), -0.7, 0.7) : 0;
        pl.at.set(S.x + ax * shift, P.y, S.z + az * shift);
        if (pl.y > 0.6) pl.y = 0.05;
        pl.to = 0;
      }
      pl.to = Math.max(pl.to, want);
    } else if (pl.state === 'up') {
      // укладка кончилась: пошёл — спрыгивает сразу, между блоками (ждёт следующий) — через 0,15 с
      pl.idle += dt;
      if (pl.idle > 0.15 || v.builder.phase === 'walk') { pl.state = 'hop'; pl.hop = 0; }
    }
    let lift = 0;
    if (pl.state === 'up') {
      // настил поднимается, когда каменщик встал на него
      if (arrived) pl.y = Math.min(pl.to, pl.y + dt * 3.5);
      lift = pl.y;
    } else if (pl.state === 'hop') {
      // спрыгивает: присед, полёт, приземление (0,4 с) — по прыжку логики (game.js → jumpHeight)
      pl.hop = Math.min(1, pl.hop + dt / 0.4);
      const e = pl.hop, h = pl.y;
      lift = e < 0.25 ? h : e > 0.85 ? 0 : h * (1 - (e - 0.25) / 0.6) + 0.18 * Math.sin(Math.PI * (e - 0.25) / 0.6);
      if (pl.hop >= 1) pl.state = 'fold';
    } else if (pl.state === 'fold') {
      pl.y = Math.max(0, pl.y - dt * 2.2);
      if (pl.y <= 0.05) { pl.y = 0; pl.state = 'off'; }
    }
    pl.group.visible = pl.state !== 'off' && v.w.group.visible;
    if (pl.group.visible) {
      pl.group.position.set(pl.at.x, pl.at.y, pl.at.z);
      pl.group.rotation.y = pl.yaw;
      pl.deck.position.y = Math.max(0.045, pl.y);
      pl.legs.scale.y = Math.max(0.001, pl.y - 0.085);
      pl.legs.visible = pl.y > 0.12;
    }
    return lift;
  }

  const _p = new THREE.Vector3(), _st = new THREE.Vector3(), _sf = new THREE.Vector3(), _pf = new THREE.Vector3(), _v1 = new THREE.Vector3();
  const SRC = [0, 0, 0];
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
    // стоящие тачки (sk-crew.js): рабочий не стоит в корыте и в ручках — шаг в сторону от оси тачки (от колеса до
    // концов ручек), на сколько не хватает до 0,52 м (полкорыта и полкорпуса)
    const bl = carry.barrows(BARROWS);
    for (let i = 0; i < views.length && bl.length; i++) {
      const a = views[i];
      if (!a || !a.free || !a.base) continue;
      for (let k = 0; k < bl.length; k++) {
        const t = bl[k];
        // своя тачка — нет: он идёт к её ручкам и берётся за них
        if (t.owner === i || Math.abs(a.base.y - t.y) > 0.6) continue;
        const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw), dx = a.base.x - t.x, dz = a.base.z - t.z;
        const u = THREE.MathUtils.clamp(dx * fx + dz * fz, -1.4, 0.2);
        let nx = dx - fx * u, nz = dz - fz * u;
        const d = Math.hypot(nx, nz);
        if (d >= 0.52) continue;
        if (d < 1e-3) { nx = -fz; nz = fx; } else { nx /= d; nz /= d; }
        a.sepTo.x += nx * (0.52 - d); a.sepTo.z += nz * (0.52 - d);
      }
    }
    // две тачки (катят обе или одну): корыта не друг в друге — оси тачек (колесо +0,15 … ручки −1,36) не ближе 0,66 м;
    // расходится тот, кто катит (оба — поровну)
    for (let k = 0; k < bl.length; k++) for (let q = k + 1; q < bl.length; q++) {
      const t1 = bl[k], t2 = bl[q];
      if (Math.abs(t1.y - t2.y) > 0.6 || (!t1.held && !t2.held)) continue;
      const a1 = t1.held ? views[t1.owner] : null, a2 = t2.held ? views[t2.owner] : null;
      const f1 = !!(a1 && a1.free && a1.sepTo), f2 = !!(a2 && a2.free && a2.sepTo);
      if (!f1 && !f2) continue;
      // ближайшие точки осей — по пяти точкам каждой
      let best = 9, bx = 0, bz = 0;
      const s1 = Math.sin(t1.yaw), c1 = Math.cos(t1.yaw), s2 = Math.sin(t2.yaw), c2 = Math.cos(t2.yaw);
      for (let u = 0; u < 5; u++) {
        const l1 = 0.15 - 1.51 * u / 4, x1 = t1.x + s1 * l1, z1 = t1.z + c1 * l1;
        for (let w = 0; w < 5; w++) {
          const l2 = 0.15 - 1.51 * w / 4, dx = x1 - (t2.x + s2 * l2), dz = z1 - (t2.z + c2 * l2), d = Math.hypot(dx, dz);
          if (d < best) { best = d; bx = dx; bz = dz; }
        }
      }
      if (best >= 0.66) continue;
      if (best < 1e-3) { bx = -c1; bz = s1; best = 1; } else { bx /= best; bz /= best; }
      const m = 0.66 - (best >= 1 ? 0 : best), w1 = f1 ? (f2 ? 0.5 : 1) : 0, w2 = f2 ? (f1 ? 0.5 : 1) : 0;
      if (f1) { a1.sepTo.x += bx * m * w1; a1.sepTo.z += bz * m * w1; }
      if (f2) { a2.sepTo.x -= bx * m * w2; a2.sepTo.z -= bz * m * w2; }
    }
  }
  const BARROWS = [];

  function build(w) {
    clear();
    world = w;
    carry.build(w);
    sync();
  }

  function clear() {
    smoke.clear();
    carry.clear();
    const old = views.filter(Boolean);
    old.forEach(function (v) { group.remove(v.w.group); if (v.plat) group.remove(v.plat.group); });
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
  // Как paintCarryStack оригинала: куб, который кладёт, — в руках, на спине — остальное. С переноской по материалу
  // (sk — sk-crew.js) на раме только ноша «за спиной»: ходка с подъёмом (sk.kind 'back') и другие семейства смешанной
  // ходки (sk.back); своя ноша — в носилке.
  const NONE = [];
  function paintStack(v, b, sk) {
    MB.carryLoad(b, world, load);
    const inHands = b.phase === 'place' ? b.carry[0] || null : null;
    let back = inHands ? b.carry.filter(function (x) { return x !== inHands; }) : b.carry;
    if (sk && sk.kind !== 'back') back = sk.back > 0 ? back.filter(function (x) { return familyOf(MB, x.materialId) !== sk.fam; }) : NONE;
    const fill = b.carry.length ? load.fill * back.length / b.carry.length : 0;
    const n = back.length ? Math.min(back.length, 6, Math.max(1, Math.ceil(fill * 6 - 0.001))) : 0;
    const kind = sk ? sk.kind : '';
    if (v.carryVersion === b.carryVersion && v.stackN === n && v.inHands === inHands && v.stackKind === kind) return;
    v.carryVersion = b.carryVersion;
    v.stackN = n;
    v.inHands = inHands;
    v.stackKind = kind;
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
    // темп страницы — часам рук (ms-lay.js; здание читает его кадром позже); пауза — прежний темп
    if (tempo > 0) LAY.tempo = tempo;
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
      // Кладка: шаг к детали — встать у её лица, откуда рука достаёт ряд (и по диагонали); на ×1 — вдоль ряда за
      // пачкой. Шаг и возврат — ходьбой (по сдвигу).
      const placing = !v.pose && b.phase === 'place' && b.carry.length && pos.mode !== 'ladder' && !hanging;
      const info = placing ? LAY.info.get(b.carry[0]) || null : null;
      v.off = v.off || new THREE.Vector3();
      v.offTo = v.offTo || new THREE.Vector3();
      // в такт рукам на ×1: стойка у середины лица, шаги — со стопами на опоре (people.js), подход — ходьбой
      const tiedNow = !!info && info.mode === 'tied' && tempo > 0 && tempo < 5;
      // пауза оригинала (темп 0): замирает всё — поза, поворот, шаг к детали, расхождение (у оригинала dt = 0)
      const pdt = tempo === 0 && !v.pose ? 0 : dt;
      // подход к стойке заранее — на последних шагах пути к детали (×1, по ровному); к ручкам стоящей тачки — сам
      // (sk-crew.js → v.barrowGo, кадр назад)
      v.preOn = !placing && !v.pose && !v.barrowGo && tempo > 0 && tempo < 5 && !hanging && pos.mode === 'walk' && preApproach(i, v, b, _pd, dt);
      if (!v.preOn) { v.preRel = null; if (b.phase === 'walk') v.preRelOf = null; }
      const goNow = !placing && !v.preOn && !!v.barrowGo && !v.pose && tempo > 0 && tempo < 5 && !hanging && pos.mode === 'walk' && !v.first;
      // точка стойки — раз на пачку (новая пачка, новый блок); меняется, только когда пачка ушла дальше 0,25 м (шаг
      // вдоль ряда — не чаще раза в цикл, не дрожит); не в своём запасе (clearOfStock)
      if (placing) {
        const pj = info ? info.j : -1, fresh = v.standBlock !== b.carry[0];
        if (fresh || v.standJ !== pj || !v.standAt) {
          // первые кадры укладки (запаса ещё нет) — в 0,5 м от лица: по этой стойке модуль запаса ставит поддон
          standFor(b, b.carry[0], info, _p, _sf, fresh || !v.stockSet ? GAP0 : GAP);
          if (standAxis && tiedNow) clearOfStock(b, _p, _sf, standAxis);
          if (!v.standAt) v.standAt = new THREE.Vector3();
          if (fresh || v.standAt.distanceToSquared(_sf) > 0.0625) v.standAt.copy(_sf);
          if (fresh) {
            v.stockSet = false; v.anchorOf = null;
            // подход к новой детали дальше 0,45 м — ходьбой; руки ждут, пока не встал (LAY.hold → v.arrive; уже
            // посчитан, если здание спросило часы рук раньше)
            if (v.arriveOf !== b.carry[0]) prepArrive(v, b, b.carry[0], _p, tempo);
          }
          v.standBlock = b.carry[0]; v.standJ = pj;
        }
        // точка для модуля запаса (v.stand): по первой пачке, раз на деталь; поддон ставится в первый кадр со
        // сведениями о пачке — дальше стойка ближе к лицу (GAP)
        if (tiedNow && v.anchorOf !== b.carry[0]) { stockAnchor(v.standAt, info.pack, v.anchor || (v.anchor = new THREE.Vector3())); v.anchorOf = b.carry[0]; }
        else if (v.anchorOf === b.carry[0] && info) v.stockSet = true;
        // следующий мини-куб той же детали (grid ≥ 2) — руки не ждут прошлого подхода (LAY.hold — по arrivePoured)
        if (v.arriveOf === b.carry[0] && v.arrivePoured !== b.carry[0].poured) v.walkIn = false;
        if (v.walkIn && b.actionT > 0.45 * (b.actionT + b.timer)) v.walkIn = false;
        v.offTo.copy(v.standAt).sub(_p);
        // поход к поддону крана за штуками (sk-crew.js → v.fetchTo, кадр назад): к месту у поддона и обратно
        if (v.fetchTo) v.offTo.set(v.fetchTo.x - _p.x, 0, v.fetchTo.z - _p.z);
      } else if (v.preOn) { v.offTo.copy(_pd); v.standBlock = null; v.walkIn = false; v.arriveOf = null; }
      else if (goNow) {
        // к ручкам тачки — шагом до WALK_IN м/с от точки прошлого кадра (логика может уже вести дальше — сдвиг догоняет)
        const G = v.barrowGo, dx = G.x - v.last.x, dz = G.z - v.last.z, d = Math.hypot(dx, dz), st = Math.min(d, WALK_GO * pdt);
        v.offTo.set(v.last.x + (d > 1e-6 ? dx / d * st : 0) - _p.x, 0, v.last.z + (d > 1e-6 ? dz / d * st : 0) - _p.z);
        v.goD = d;
        v.standBlock = null; v.walkIn = false; v.arriveOf = null;
      } else { v.offTo.set(0, 0, 0); v.standBlock = null; v.walkIn = false; v.arriveOf = null; }
      // ряд выше плеч — с подмостей (на ×1): стоит на настиле, пока кладёт, по нему ходит вдоль ряда; пока выкладывает
      // ношу на поддон (sk-crew.js, кадр назад), — на полу
      const st = _st.copy(_p).add(v.offTo);
      // (sk-crew.js кладёт её на настил у ног — настил на это время у пола, потом поднимается с запасом)
      const dropping = !!(placing && w.anim.sk && (w.anim.sk.mode === 'drop' || w.anim.sk.mode === 'fetch') && w.anim.sk.block === b.carry[0]);
      v.platWant = placing && tempo > 0 && tempo < 5 ? platNeed(b, info, _p, st) : 0;
      // подъём настила к первой пачке — раз на деталь (руки его ждут — LAY.hold): с пола до нужной высоты, 3,5 м/с
      if (placing && v.platWant > 0.5 && (v.riseOf !== b.carry[0] || v.risePoured !== b.carry[0].poured)) {
        v.riseOf = b.carry[0]; v.risePoured = b.carry[0].poured;
        v.rise = Math.max(0, v.platWant - (v.plat && v.plat.state === 'up' ? v.plat.y : 0)) / 3.5 * Math.max(1, tempo);
      }
      const want = dropping && v.platWant > 0 ? 0.05 : v.platWant;
      // первый кадр укладки (вид носилки — ещё прошлого кадра) мог задать настилу полную высоту: пока выкладывает —
      // настил у пола
      if (dropping && v.plat && v.plat.state === 'up' && v.plat.to > want) v.plat.to = want;
      if (want > 0 && v.plat) platStale(v.plat, b.carry[0], st);
      if (want > 0 && v.plat && v.plat.state === 'up' && !v.fetchMove) {
        // по настилу: вдоль него до ±0,62 м от середины; запас у левого торца (+0,52 м) — у середины, −0,15…+0,04 м (не
        // ближе 0,48 м к запасу и не дальше 0,67 — левая достаёт его, к краям ряда — наклоном); запас вдоль заднего края
        // (брус, лист) — шаг к переднему краю
        const pl = v.plat, ax = Math.cos(pl.yaw), az = -Math.sin(pl.yaw), pile = deckPile(v, info);
        const along = THREE.MathUtils.clamp((st.x - pl.at.x) * ax + (st.z - pl.at.z) * az, pile === 'end' ? -0.15 : -0.62, pile === 'end' ? 0.04 : 0.62);
        const across = pile === 'back' ? 0.08 : 0, fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw);
        v.offTo.set(pl.at.x + ax * along + fx * across - _p.x, 0, pl.at.z + az * along + fz * across - _p.z);
        st.copy(_p).add(v.offTo);
      }
      if (tempo >= 20 || v.preOn || goNow) v.off.copy(v.offTo);
      else if (placing && tiedNow) {
        // подход к детали — ходьбой до WALK_IN м/с; шаг вдоль ряда — не быстрее 0,8 м/с (стопы на опоре, people.js
        // переставляет их по одной), плавно к точке
        // (к поддону крана и назад — бегом 5 м/с, как рабочие оригинала: поход sk-crew.js рассчитан на FETCH_WALK)
        const d = v.off.distanceTo(v.offTo), sp = v.walkIn || v.fetchMove ? Math.min(v.fetchMove ? 5.0 : WALK_IN, 0.3 + (v.fetchMove ? 6 : 4) * d) : Math.min(0.8, 0.15 + 2.5 * d);
        if (d > 1e-4 && pdt > 0) v.off.lerp(v.offTo, Math.min(1, sp * pdt / d));
        if (v.walkIn && v.off.distanceTo(v.offTo) < 0.06) v.walkIn = false;
      } else v.off.lerp(v.offTo, 1 - Math.exp(-pdt * 5));
      const arrived = v.off.distanceTo(v.offTo) < 0.3;
      _p.add(v.off);
      // пол под ногами (без подмостей): запас и носилки ставятся на него
      const floorY = _p.y;
      _p.y += want > 0 || v.plat ? platStep(v, want, st, _p, info, pdt, arrived) : 0;
      // расходятся, если стоят друг в друге (spread): шаг в сторону — тоже ходьба
      v.base = (v.base || new THREE.Vector3()).copy(_p);
      v.free = !v.pose && pos.mode === 'walk' && !hanging;
      v.sep = v.sep || new THREE.Vector3();
      // расходятся быстрее, чем подходят (идут 4–8 м/с — иначе успевали пройти друг сквозь друга и сквозь тачку)
      v.sep.lerp(v.free ? v.sepTo || ZERO : ZERO, tempo >= 20 ? 1 : 1 - Math.exp(-pdt * 8));
      _p.add(v.sep);
      // скорость шага — по фактическому сдвигу (на ×20 и шаги чаще)
      const mvx = v.first ? 0 : _p.x - v.last.x, mvz = v.first ? 0 : _p.z - v.last.z, moved = Math.hypot(mvx, mvz);
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
      else if (v.preOn) {
        // подход заранее — лицом по ходу; с тачкой перед тем, как отпустить, — разворот вдоль взгляда на деталь (так она
        // и встанет); у стойки — к детали
        const pr = v.pre, u = v.preU, run = moved > 1e-4 ? Math.atan2(mvx, mvz) : yawTarget;
        if (pr.rel <= 1 && u < pr.rel) {
          const k = THREE.MathUtils.smoothstep(u, pr.rel * 0.45, pr.rel * 0.9);
          let dd = pr.ya - run; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
          yawTarget = run + dd * k;
        } else yawTarget = u < 0.82 && moved > 1e-4 ? run : pr.ya;
      } else if (goNow) {
        // к ручкам тачки — по ходу, у ручек — вдоль тачки
        yawTarget = (v.goD || 0) > 0.3 && moved > 1e-4 ? Math.atan2(mvx, mvz) : v.barrowYaw === undefined ? yawTarget : v.barrowYaw;
      }
      else if (b.phase === 'break' && b.breakKind === 'smoke' && b.smokeGroup && huddle(v, b, _h)) yawTarget = Math.atan2(_h.x - _p.x, _h.z - _p.z);
      else if (info && (v.walkIn || v.fetchMove) && v.off.distanceTo(v.offTo) > 0.25) {
        // подход к детали и поход к поддону крана — лицом по ходу
        yawTarget = Math.atan2(v.offTo.x - v.off.x, v.offTo.z - v.off.z);
      } else if (info && v.fetchFace) {
        // у поддона крана — лицом к нему
        yawTarget = Math.atan2(v.fetchFace.x - _p.x, v.fetchFace.z - _p.z);
      } else if (info) {
        // кладка — лицом к пачке
        const fx = info.pack[0] - _p.x, fz = info.pack[2] - _p.z;
        if (fx * fx + fz * fz > 0.0016) yawTarget = Math.atan2(fx, fz);
      } else {
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
      // носилка ходки, запас у места работы, цели рук погрузки и выкладки (sk-crew.js → a.sk): стопы — на полу (без
      // подмостей), запас — у точки стойки кладки; на лестнице лесов (hanging) ноша остаётся на теле
      v.hang = hanging;
      v.stand = placing ? (v.anchorOf === b.carry[0] && v.anchor ? v.anchor : v.standAt) : null;
      const sk = carry.before(i, v, b, _pf.set(_p.x, floorY, _p.z), v.yaw, pdt, tempo);
      // сдача объекта: радуются все, кроме тех, кто на лестнице и спит (как у оригинала); идущие машут на ходу
      const asleep = b.phase === 'break' && b.breakKind === 'sleep';
      const action = v.pose ? v.pose.action : cheer > 0 && pos.mode === 'walk' && !hanging && !asleep ? 'cheer'
        : (!hanging && pos.mode === 'walk' && carry.action(i, b)) || actionOf(b, pos.mode, hanging);
      if (a.action !== action) { a.from = a.action; a.action = action; a.t = 0; a.prev = 0; }
      // цели рук и реквизит по действию
      a.hold = null;
      a.laySrc = null;
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
      if (a.hiPlace && b.carry.length) {
        a.hold = handLook(b.carry[0].materialId); a.fxColor = fxColor(b.carry[0].materialId);
        const hi = LAY.info.get(b.carry[0]);
        a.lay = hi && hi.mode === 'tied' ? hi : null;
      }
      else if (action === 'work-high') a.fxColor = WOOD;
      if (!(a.hiPlace && b.carry.length)) a.lay = null;
      if (!v.pose && action === 'lay' && b.carry.length) {
        const piece = b.carry[0];
        a.hold = handLook(piece.materialId);
        a.fxColor = fxColor(piece.materialId);
        a.fxMetal = familyOf(MB, piece.materialId) === 'metal';
        // пачку берёт с поддона рядом, если его даёт модуль запаса (LAY.source), иначе — из ноши на раме (и рядами)
        if (LAY.source && LAY.source(b, piece, SRC) === true) a.laySrc = (v.src || (v.src = new THREE.Vector3())).fromArray(SRC);
        // на ×1 — пачками в такт: фаза цикла, пачка и постель от здания (ms-lay.js)
        if (info && info.mode === 'tied') {
          a.lay = info; a.target.set(info.pack[0], info.pack[1], info.pack[2]);
          if (info.count > 0 && info.c > PHASE.lay[0] - 0.03 && info.c < PHASE.lay[1]) a.hold = handOne(piece.materialId);
          // рука взяла пачку — событие модулям (LAY.listen)
          const pc = v.layC === undefined ? 0 : v.layC;
          if (LAY.listening() && info.c >= PHASE.take && (pc < PHASE.take || info.c < pc)) {
            LAY.emit('take', { builder: b, block: piece, count: info.count, source: a.laySrc ? 'pallet' : 'frame', at: a.laySrc ? a.laySrc.toArray() : null });
          }
          v.layC = info.c;
        }
        else if (info) a.target.set(info.pack[0], info.pack[1], info.pack[2]);
        else if (!(ctx.layPoint && ctx.layPoint(piece, _p, a.target))) a.target.set(_p.x + Math.sin(v.yaw) * 0.7, _p.y + 0.6, _p.z + Math.cos(v.yaw) * 0.7);
      } else if (!v.pose && action === 'pick') {
        // набирает группу блоков одного материала (logic.js → mineQueue)
        const group = b.mineQueue && b.mineQueue[0];
        const id = group && group.blocks && group.blocks[0] ? group.blocks[0].materialId : b.carry[0] ? b.carry[0].materialId : '';
        a.fxColor = fxColor(id);
      } else if (!v.pose && action === 'fetch' && sk && sk.armful && b.carry[0]) {
        // назад от поддона крана с охапкой: в руках — его штука
        a.hold = handLook(b.carry[0].materialId); a.fxColor = fxColor(b.carry[0].materialId);
      } else if (!v.pose && (action === 'load' || action === 'drop')) {
        // погрузка и выкладка по штуке (sk-crew.js): в руке — штука ноши (кирпичи, камень, брус, лист); раствор и стекло —
        // без штуки (черпают, ставят)
        // в походе к поддону крана — штука его материала (материал детали)
        const id = sk && sk.mode === 'fetch' && b.carry[0] ? b.carry[0].materialId : sk && sk.materialId;
        const f = id ? familyOf(MB, id) : '';
        if (f === 'brick' || f === 'stone' || f === 'marble' || f === 'wood' || f === 'metal') a.hold = handLook(id);
        a.fxColor = fxColor(id || '');
      } else if (!v.pose && action === 'plan') {
        // стол — перед рабочим (yard.js: столешница 0,86 м, на 0,6 м по ходу взгляда)
        a.target.set((b.homeCell[0] + 0.5) * CELL, 0.89, (b.homeCell[2] + 0.5) * CELL + 0.6);
      }
      w.seat.visible = action === 'eat';
      w.mat.visible = action === 'sleep';
      // шаг к детали и обратно — тоже ходьба
      // шаг вдоль ряда за пачкой (кладка в такт рукам, до 0,9 м) и к точке стойки, пока выкладывает ношу на поддон, —
      // переступает, руки работают (people.js → a.shuffle)
      const walkIn = !!v.walkIn && placing && tiedNow;
      const layStep = !v.pose && b.phase === 'place' && !walkIn && (action === 'lay' && !!a.lay || action === 'drop') && v.off.distanceTo(v.offTo) < 0.9;
      a.speed = !v.pose && pos.mode === 'walk' && !layStep && (b.phase === 'walk' || walkIn || speed > 0.35) ? Math.min(speed, 12) : 0;
      // стопы на опоре (×1): шаги ставит people.js (plantFeet), без переступания на месте; и при погрузке у карьера
      // (поворот к носилке — тазом, стопы стоят)
      a.plant = (layStep || (!v.pose && (b.phase === 'mine' || b.phase === 'place') && action === 'load')) && tempo > 0 && tempo < 5;
      a.shuffle = layStep && !a.plant && speed > 0.2 ? Math.min(1, speed / 1.2) : 0;
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
      paintStack(v, b, sk);
      // заплечная рама — когда есть ноша или идёт в карьер за ней (как стопка оригинала: нет ноши — нет и стопки);
      // на перекуре, обеде, во сне и у стола — снята; с переноской по материалу — только для ноши «за спиной»
      if (w.stack) w.stack.visible = !!v.pose ? action === 'lay' : sk ? sk.rack : b.carry.length > 0 || b.phase === 'mine' || (b.phase === 'walk' && b.walkPurpose === 'mine');
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
      // вёдра висят отвесно (поворот кулака снят)
      if (sk) carry.after(i, v);
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
    // запас у мест работы и поддоны крана — раз за кадр (пауза — стоит)
    carry.frame(tempo === 0 ? 0 : dt, tempo);
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
    // переноска и запас (sk-crew.js): state(), stock — для проверок
    carry: carry,
  };
}

