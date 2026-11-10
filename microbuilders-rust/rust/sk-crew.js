// Переноска и запас в бригаде (связка sk-haul.js, sk-stock.js, sk-props.js, sk-pose.js для crew.js и people.js):
// у каждого рабочего — носилка его ходки (коза, брус, лист, рама со стеклом, ящик — на груди ведущего скелета, на
// кости груди модели; тачка — в мире, колесо по земле; вёдра — в кистях, висят отвесно; коза, листы, рама и брус при
// погрузке, выкладке и кладке — на полу рядом), у места работы — запас (поддон, куча, стопка, корыто, стойка; при
// кладке с подмостей — на настиле, поднимается с ним), поддоны крана — тоже запас. Встраивание (журнал progress-sk-1.md):
//   crew.js → createCrew: const carry = createCarry({ E, mats, lite: factory.lite, kindAt, ground, site, views });
//     group.add(carry.group); build/clear — с бригадой; в цикле рабочих после позиции и курса:
//     const sk = carry.before(i, v, b, _p, v.yaw, pdt, tempo) (a.sk = sk для people.js), после animateWorker —
//     carry.after(i, v); в конце update — carry.frame(dt, tempo); действие фазы mine / выкладки — carry.action(i, b);
//   people.js → animateWorker: a.sk — слой позы под ношу (walkPose), циклы 'load' и 'drop' (cycle, точки sk.A, sk.B),
//     в кладке левая берёт с запаса (sk.grab вместо FRAME);
//   ms-lay.js → часы рук после выкладки — LAY.hold = carry.hold, пачка левой — с запаса: LAY.source → carry.grab(blk).
// Носилка не перескакивает между телом и полом: снять, поставить, поднять — переход TRANS с (в осях груди: поднятая —
// идёт с ним), вёдра — так же из кулаков на пол и обратно; ставит, когда встал (подход к точке стойки — с ношей).
// Тачка и носилки на полу не ставятся в рабочих, в настилы подмостей и в запасы (ctx.views — фигуры и настилы бригады).
// Поддоны крана: убылью ведёт модуль (site.claim(true)), только пока с поддона кто-то кладёт или его ждут (каменщик
// несёт ношу того же семейства к детали рядом); без того — кран сам (по укладке рядом и по времени); пока захвачено,
// у остальных поддонов убыль — по-крановому, по времени.
import * as THREE from 'three';
import { createHaul, barrowStep, barrowGrips, dropShare, BARROW, BARROW_BACK, PARK_PITCH } from './sk-haul.js?v=ff29707';
import { createStock, REACH, layoutOf, layoutFor } from './sk-stock.js?v=ff29707';
import { createCarrier, createStockView, disposeCarriers, GRIP, HOD_SLOT, HOD_BEND } from './sk-props.js?v=ff29707';
import { walkPose, MOUNT, crouchFor } from './sk-pose.js?v=ff29707';
import { familyOf, CELL } from './families.js?v=ff29707';
import { LAY, PHASE, MIN_TIED } from './ms-lay.js?v=ff29707';
import { markDynamic, DYNAMIC } from './render.js?v=ff29707';

const FULL = { mass: true, plate: true, hatch: true, cut: true };
// коза на земле: поворот вокруг x, при котором конец древка (1 м вниз по оси) и задний край лотка (0,44 м по лотку)
// на одной высоте, и высота точки опоры над ними
const HOD_LIE = (function () {
  const tx = 0.44 * Math.cos(HOD_BEND), tz = -0.44 * Math.sin(HOD_BEND);
  const dy = tx + 1.0, dz = tz;
  const a = Math.atan2(-dy, -dz);
  return { x: a, y: Math.cos(a) * 1.0 };
})();
// носилки, которые ставят на пол у места работы и у штабеля: справа от точки стойки (side), вперёд (ahead), длина
// вдоль взгляда (fore — вперёд, aft — назад от точки стоянки) — пол под ней; тачка: колесо впереди, ручки сзади
// across — лежит поперёк взгляда (брус 2,4 м — вдоль стены позади рабочего, а не в стену), пол — на концах; load — и при
// погрузке (брус у штабеля — сразу на плечо)
const GROUND = { hod: { side: 0.6, ahead: -0.1, fore: 0.45, aft: 0.95, load: true }, sheet: { side: 0.62, ahead: -0.3, fore: 0.62, aft: 0.62, load: true },
  stretcher: { side: 0.55, ahead: -0.2, fore: 0.31, aft: 0.31, load: true }, beam: { side: 0.3, ahead: -0.5, fore: 0.1, aft: 0.1, across: 1.2, load: false } };
const BARROW_SPAN = { fore: 0.25, aft: 1.4 };
// переход носилки тело ↔ пол (с), вёдер кулак ↔ пол (с)
const TRANS = 0.28, BUCKET_T = 0.25;
// Тачка: где поставить (оси взгляда: side — вправо, ahead — вперёд, turn — поворот тачки от взгляда). У места
// работы — справа от точки стойки вдоль взгляда, дальше, назад; вдоль ряда позади (колесо вправо или влево); слева.
// У карьера — сбоку, корыто у бедра.
// Тачка — сама запас (кладёт из неё левой): сперва слева, корыто — у левой руки; потом справа и дальше
const PARK_SITE = [[-0.62, 0.15, 0], [-0.75, -0.05, 0], [0.72, 0.15, 0], [0.95, 0.1, 0], [0.72, -0.35, 0], [1.0, -0.45, 0], [0.95, -0.85, -Math.PI / 2], [-0.95, -0.85, Math.PI / 2],
  [-1.2, -0.45, 0], [0.5, -1.1, -Math.PI / 2], [1.25, 0.1, 0]];
// У карьера — поперёк, ручками к рабочему (колесо — сбоку на длину тачки): корыто у бедра, к ручкам — полшага, взялся —
// повернул с ней на дорогу (а не разворачивал её колесом через карьер)
const PARK_QUARRY = [[BARROW_BACK, -0.15, -Math.PI / 2], [-BARROW_BACK, -0.15, Math.PI / 2], [BARROW_BACK, -0.45, -Math.PI / 2], [-BARROW_BACK, -0.45, Math.PI / 2],
  [0.62, 0.5, 0], [-0.62, 0.5, 0], [0.62, 0.15, 0], [-0.62, 0.15, 0], [1.1, 0.4, 0]];
// фазы, в которых ношу ставят на пол рядом (перекур, сон, обед, кухня, сборка лесов, проход, стол): носилку — на пол,
// вёдра — к ногам; встал — поднимает
const REST = { break: true, meal: true, kitchen: true, erect: true, passage: true, plan: true };
// точки тачки для проверки места (оси тачки: колесо — начало, +z — вперёд): колесо, корыто, ручки
const BARROW_PTS = (function () { const o = []; [0.15, -0.1, -0.5, -0.9, -1.15, -1.36].forEach(function (z) { [-0.3, 0, 0.3].forEach(function (x) { o.push([x, z]); }); }); return o; })();
// поддоны крана: убыль «по-крановому», пока захвачено (с на поддон), и успеть до срока крана (40 с после готовности
// без захвата, 90 с — с ним: CRANE_DUE_C); CRANE_WAIT — сколько после готовности ждать каменщика, который несёт ношу
// того же семейства к детали рядом; CRANE_REACH — досягаемость, которую объявляем крану (site.claim(…, reach): кран
// ставит поддон у фронта работ, в пределах соседней клетки настила того же яруса)
const CRANE_LIFE = 28, CRANE_DUE = 38, CRANE_DUE_C = 84, CRANE_SLOW = 34, CRANE_WAIT = 50, CRANE_REACH = 2.9;
// На ×1 поддон крана убывает только руками (охапка в походе, взятие с поддона у стойки): захват убыли — всегда, пока
// поддоны есть; никому не нужный (с него не кладут и не ходят, никого не ждут) STALE_T с после готовности или
// последнего взятия, или стоит дольше CRANE_KEEP с после готовности, — возвращается крану: кран забирает его с настила
// на склад (site.recall).
const STALE_T = 60, CRANE_KEEP = 200;
// Сходить к поддону крана (он дальше руки, но в CRANE_REACH, на том же ярусе; дальше — до FETCH_FAR, если к нему по полу
// без стен): шаг к нему (FETCH_WALK м/с), до FETCH_PICKS циклов рук — взять охапку (FETCH_CYC с; за цикл — FETCH_UNIT единиц
// груза крана: кирпич — верхний ряд обеих пачек), назад с ней, цикл — положить на свой запас у стойки; всё — во время
// укладки (часы рук ждут: подход, выкладка и поход вместе не дольше FETCH_MAX укладки — у коротких укладок не ходит).
const FETCH_WALK = 5.0, FETCH_CYC = 0.32, FETCH_MAX = 0.72, FETCH_FAR = 6.5, FETCH_PICKS = 3, FETCH_UNIT = { brick: 2 };
// охапка в руках на обратном пути (оси груди): кисти перед грудью, локти согнуты
const ARM_L = new THREE.Vector3(0.13, -0.3, 0.3), ARM_R = new THREE.Vector3(-0.13, -0.3, 0.3);
const ARMFUL = { lean: -0.03, side: 0, swingL: 0, swingR: 0, stride: 0.92, bob: 0.01, sway: 0, spread: 0, handL: 'grip', handR: 'grip', gripL: 1, gripR: 1, styleL: 'fist', styleR: 'fist' };
const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _p2 = new THREE.Vector3(), _q3 = new THREE.Quaternion(), _s1 = new THREE.Vector3(), _w1 = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
function ss(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

export function createCarry(ctx) {
  const MB = ctx.E.MB;
  const lite = !!ctx.lite;
  const group = new THREE.Group();
  group.name = 'sk-carry';
  const fam = function (id) { return familyOf(MB, id); };
  const haul = createHaul(MB, fam);
  let world = null;
  // пол яруса под запас (как crew.js → canStand, но без стены и колонны: поддон шире их верха)
  function floorAt(x, y, z) {
    if (!world) return false;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL), cy = Math.round(y / CELL), index = world.index;
    if (!index.inside(cx, cy, cz)) return cy === 0;
    if (world.solidGrid[index.id(cx, cy, cz)] === 1) return false;
    if (cy === 0 || world.deckGrid[index.id(cx, cy, cz)] === 1) return true;
    if (world.solidGrid[index.id(cx, cy - 1, cz)] !== 1) return false;
    const k = ctx.kindAt ? ctx.kindAt(cx, cy - 1, cz) : 'mass';
    return !k || !!FULL[k];
  }
  // поддоны крана: события — в запас; убылью ведём, только пока с поддона кладут (claim)
  const site = function () { return ctx.site ? ctx.site() : null; };
  const stock = createStock({ canStand: floorAt, consume: function (id, n) { const s = site(); return s ? s.consume(id, n) : -1; } });
  const stockView = createStockView(ctx.mats, MB, lite);
  group.add(stockView.group);
  // keepSet — крану сказан долгий срок поддона (×1: убыль только руками, ненужные снимаем сами)
  let unhook = null, claimed = false, keepSet = false;
  function hookCrane() {
    const s = site();
    if (unhook || !s || !s.onCrane) return;
    unhook = s.onCrane(function (e) { stock.crane(e); });
    // досягаемость — крану (без захвата убыли: захват — только пока с поддона кладут, craneStep)
    if (s.claim) s.claim(claimed, CRANE_REACH);
    // уже готовые поддоны
    s.deliveries().forEach(function (p) { if (p.ready) stock.crane({ type: 'craneReady', pallet: p }); });
  }
  const rec = [];
  const _load = { kg: 0, capacity: 0, fill: 0, overload: 1 };
  function recOf(i, v) {
    let r = rec[i];
    if (r && r.w === v.w) return r;
    // фигура сменилась (найм на место ушедшего) — прежний реквизит долой
    if (r) dropRec(r);
    const w = v.w;
    // рамка ведущей груди на кости груди модели (crew.js → рама ноши так же): носилки — в осях ведущей груди
    const chest = w.bones.find(function (o) { return o.name === 'chest'; }) || w.bones[3];
    const frame = new THREE.Group();
    frame.name = 'sk-chest';
    chest.add(frame);
    if (w.stack && w.stack.parent && w.stack.parent !== chest) { w.group.updateMatrixWorld(true); w.stack.parent.attach(frame); }
    const anchor = new THREE.Group();
    frame.add(anchor);
    const main = createCarrier(ctx.mats, MB, lite);
    anchor.add(main.group);
    // вёдра: в кулаках (там, где инструмент и блок кладки)
    const bl = createCarrier(ctx.mats, MB, lite), br = createCarrier(ctx.mats, MB, lite);
    if (w.leftTools && w.leftTools.block.parent) { w.leftTools.block.parent.add(bl.group); bl.group.position.copy(w.leftTools.block.position); }
    if (w.tools && w.tools.hammer.parent) { w.tools.hammer.parent.add(br.group); br.group.position.copy(w.tools.hammer.position); }
    const barrow = createCarrier(ctx.mats, MB, lite);
    barrow.group.visible = false;
    group.add(barrow.group);
    // тачка движется сама по себе (не на кости): скорости для TAA и размытия движения (render.js)
    markDynamic(barrow.group);
    // где вёдра в кулаках (на земле при выкладке и кладке — свои места, потом обратно в кулаки)
    const fists = [[bl.group.parent, bl.group.position.clone()], [br.group.parent, br.group.position.clone()]];
    r = rec[i] = { w: w, frame: frame, anchor: anchor, main: main, bl: bl, br: br, fists: fists, barrow: barrow, bs: null, sk: null, entry: null, blk: null, K: 0, put: 0, taken: 0, j: -1,
      grab: new THREE.Vector3(), hasGrab: false, A: new THREE.Vector3(), B: new THREE.Vector3(), gripL: new THREE.Vector3(), gripR: new THREE.Vector3(), pose: {},
      // место носилки ('ground' | 'mount' | 'sling' | null) и переход к нему: доля trT, откуда — trP, trQ (оси рамки груди)
      place: null, trT: 1, trP: new THREE.Vector3(), trQ: new THREE.Quaternion(), G: { x: 0, y: 0, z: 0, rx: 0, ry: 0 },
      // вёдра: 'fist' | 'down', доля перехода
      bk: 'fist', bkT: 1, bkW: [new THREE.Vector3(), new THREE.Vector3()] };
    return r;
  }
  const _grips = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }];
  const flat = function (P) { return function () { return P.y; }; };

  // Препятствия для тачки и носилок на полу (тот же ярус): другие рабочие (круги), настилы подмостей (свой и чужие),
  // запасы (по раскладке, с корытом у поддона). → out: { c, x, z, r } | { x, z, ca, sa, hx, hz, ox }.
  const OBS = [];
  function obstacles(i, y, v, out) {
    out.length = 0;
    const vs = ctx.views ? ctx.views() : null;
    if (vs) for (let j = 0; j < vs.length; j++) {
      const o = vs[j];
      if (!o || !o.w) continue;
      if (j !== i && o.w.group.visible && Math.abs(o.w.pos.y - y) < 1.2) out.push({ c: true, x: o.w.pos.x, z: o.w.pos.z, r: 0.36 });
      const pl = o.plat;
      if (pl && pl.state !== 'off' && Math.abs(pl.at.y - y) < 0.6) out.push({ c: false, x: pl.at.x, z: pl.at.z, ca: Math.cos(pl.yaw), sa: Math.sin(pl.yaw), hx: 0.86, hz: 0.42, ox: 0 });
    }
    const list = stock.list();
    for (let k = 0; k < list.length; k++) {
      const e = list[k];
      if (e.deck || e.fade > 0 || Math.abs(e.y - y) > 0.6) continue;
      const L = layoutFor(e), h = L.half || [0.5, 0.4];
      out.push({ c: false, x: e.x, z: e.z, ca: Math.cos(e.yaw), sa: Math.sin(e.yaw), hx: h[0] + 0.08, hz: h[1] + 0.08, ox: 0 });
      if (e.tub && L.kind !== 'tub') out.push({ c: false, x: e.x, z: e.z, ca: Math.cos(e.yaw), sa: Math.sin(e.yaw), hx: 0.52, hz: 0.37, ox: 1.05 });
    }
    return out;
  }
  function blocked(obs, x, z) {
    for (let k = 0; k < obs.length; k++) {
      const o = obs[k], dx = x - o.x, dz = z - o.z;
      if (o.c) { if (dx * dx + dz * dz < o.r * o.r) return true; continue; }
      const lx = dx * o.ca - dz * o.sa - o.ox, lz = dx * o.sa + dz * o.ca;
      if (Math.abs(lx) < o.hx && Math.abs(lz) < o.hz) return true;
    }
    return false;
  }
  // тачка с колесом в (x, z), курс yaw — не в препятствиях и на полу
  function barrowFree(obs, x, y, z, yaw) {
    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    for (let k = 0; k < BARROW_PTS.length; k++) {
      const p = BARROW_PTS[k], wx = x + cy * p[0] + sy * p[1], wz = z - sy * p[0] + cy * p[1];
      if (blocked(obs, wx, wz)) return false;
      if ((k % 3 === 1) && !floorAt(wx, y, wz)) return false;
    }
    return true;
  }

  // Где оставить тачку у стойки S по пути к ней (подход заранее — crew.js): колесо у лица детали сбоку от стойки (слева,
  // потом справа, чуть дальше и ближе), тачка — вдоль взгляда ya на деталь (так её и катил); на полу всеми точками, не в
  // рабочих, настилах, запасах и других тачках, не дальше front м вперёд от стойки (там лицо детали). → { x, z — стопы у
  // ручек (тут отпускает), wx, wz — колесо, yaw, side — 1 слева, −1 справа } или null.
  const REL = [[0.62, 0.15], [0.75, -0.05], [-0.62, 0.15], [-0.75, -0.05], [0.8, -0.4], [-0.8, -0.4]];
  const _rel = { x: 0, z: 0, wx: 0, wz: 0, yaw: 0, side: 0 };
  function barrowRelease(i, v, S, ya, front) {
    if (!world) return null;
    const fx = Math.sin(ya), fz = Math.cos(ya), lx = Math.cos(ya), lz = -Math.sin(ya);
    const obs = obstacles(i, S.y, v, OBS);
    // сам он у стойки (полкорпуса и запас)
    obs.push({ c: true, x: S.x, z: S.z, r: 0.3 });
    // другие тачки (стоят или катят): ящик вдоль тачки
    for (let k = 0; k < rec.length; k++) {
      const o = rec[k];
      if (k === i || !o || !o.bs || !o.barrow.group.visible || Math.abs(o.bs.y - BARROW.R - S.y) > 0.6) continue;
      const s = o.bs, sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
      obs.push({ c: false, x: s.x - sy * 0.62, z: s.z - cy * 0.62, ca: cy, sa: sy, hx: 0.42, hz: 0.95, ox: 0 });
    }
    const sy = Math.sin(ya), cy = Math.cos(ya);
    for (let k = 0; k < REL.length; k++) {
      const c = REL[k], wx = S.x + lx * c[0] + fx * c[1], wz = S.z + lz * c[0] + fz * c[1];
      let ok = true;
      for (let q = 0; q < BARROW_PTS.length && ok; q++) {
        const p = BARROW_PTS[q], px = wx + cy * p[0] + sy * p[1], pz = wz - sy * p[0] + cy * p[1];
        if (blocked(obs, px, pz) || !floorAt(px, S.y, pz) || (px - S.x) * fx + (pz - S.z) * fz > front) ok = false;
      }
      const rx = wx - fx * BARROW_BACK, rz = wz - fz * BARROW_BACK;
      if (!ok || !floorAt(rx, S.y, rz) || blocked(obs, rx, rz)) continue;
      _rel.x = rx; _rel.z = rz; _rel.wx = wx; _rel.wz = wz; _rel.yaw = ya; _rel.side = c[0] > 0 ? 1 : -1;
      return _rel;
    }
    return null;
  }
  // Настил подмостей будет (деталь выше 1,6 м над полом — верхние пачки кладут с настила, crew.js platNeed), а его ещё
  // нет: его след у точки стойки S (вдоль ряда, серединой — к середине детали, как crew.js platStep) — тоже препятствие
  // (тачка и носилка не встают туда, где потом вырастут доски).
  function deckSoon(obs, v, info, S, ya) {
    if (!info || !info.box || (v.plat && v.plat.state === 'up')) return;
    if (info.box[4] - S.y < 1.6 && !(v.platWant > 0)) return;
    const ax = Math.cos(ya), az = -Math.sin(ya), B = info.box;
    const shift = Math.max(-0.7, Math.min(0.7, ((B[0] + B[3]) / 2 - S.x) * ax + ((B[2] + B[5]) / 2 - S.z) * az + 0.05));
    obs.push({ c: false, x: S.x + ax * shift, z: S.z + az * shift, ca: Math.cos(ya), sa: Math.sin(ya), hx: 0.9, hz: 0.45, ox: 0 });
  }
  // Кадр рабочего до позы: вид носилки по логике, носилка на теле или в мире, запас у места работы, цели рук.
  // P — стопы (мир, м) после шага к детали и расхождения, yaw — курс. → sk (тот же объект кадр за кадром).
  // v.hang — на лестнице лесов (ноша на теле, без выкладки), v.stand — точка стойки кладки (запас — у неё), v.pose —
  // проверка движений (носилки убраны), v.arrive — когда встанет к детали (выкладка — после), v.plat — подмости.
  let lastTempo = 1;
  function before(i, v, b, P, yaw, dt, tempo) {
    if (!world) return null;
    const r = recOf(i, v), w = v.w;
    if (v.pose) { hideRec(r); r.sk = null; w.anim.sk = null; return null; }
    lastTempo = tempo;
    const hang = !!v.hang;
    const arrive = b.phase === 'place' && b.carry[0] && v.arriveOf === b.carry[0] ? v.arrive || 0 : 0;
    const sk = haul.step(i, b, world, dt * Math.max(1, tempo), tempo, hang, arrive);
    r.sk = sk;
    // запас у места работы — в первый кадр укладки (некуда поставить — кладёт из носилки, без выкладки)
    if (r.blk && (b.phase !== 'place' || sk.block !== r.blk)) finishPlace(r);
    if (b.phase === 'place' && sk.block && tempo < 20 && !hang && r.blk !== sk.block) startPlace(r, sk, b, v.stand || P, P, i, v);
    // запас на настиле подмостей — поднимается с настилом; бригада держит рабочего от него (v.deckPile)
    v.deckPile = null;
    if (r.entry && r.entry.deck && v.plat && v.plat.state === 'up') {
      const y = v.plat.at.y + Math.max(0.045, v.plat.y);
      // точка взятия (верх штуки, placeStock — раз на цикл) поднимается с настилом (иначе левая тянулась к месту, где
      // штука была до подъёма)
      if (Math.abs(r.entry.y - y) > 0.002) { if (r.hasGrab) r.grab.y += y - r.entry.y; r.entry.y = y; stock.moved(); }
      v.deckPile = layoutOf(r.entry.fam, true).place;
    }
    MB.carryLoad(b, world, _load);
    sk.fill = b.carry.length ? _load.fill : 0; sk.over = b.carry.length ? _load.overload || 1 : 1;
    const snap = tempo >= 20;
    _f.set(Math.sin(yaw), 0, Math.cos(yaw));
    // встал у детали (подход к точке стойки кончился) — носилку можно снять (шаги вдоль ряда потом — не в счёт)
    const settled = !v.walkIn;
    // на настиле подмостей выше пола (или спрыгивает с него): носилке не место на полу внизу, тачку не держит
    const pl = v.plat;
    const aloft = !!(pl && ((pl.state === 'up' && pl.y > 0.15) || pl.state === 'hop'));
    // --- тачка ---
    v.barrowGo = null; r.going = false;
    if (sk.kind === 'barrow' || r.bs) {
      if (!r.bs) r.bs = { x: P.x + _f.x * 1.6, y: P.y + BARROW.R, z: P.z + _f.z * 1.6, yaw: yaw, pitch: 0, wheel: 0, park: 1 };
      const s = r.bs, ground = ctx.ground || flat(P);
      if (aloft) sk.push = false;
      // подход к стойке заранее (crew.js → v.preRel): тачку оставил у стойки по пути — стоит, где отпустил, к детали
      // идёт без неё
      if (sk.push && v.preRel && b.phase === 'walk') sk.push = false;
      let parking = false;
      if (sk.kind === 'barrow' && sk.mode === 'load' && sk.stage === 'lift') {
        // подъём у карьера: берётся за ручки (к ним подходит сам — ниже); убрана (погрузки в кадре не было) — вырастает
        // перед ним
        sk.push = true;
        if (r.bsGone) { r.bsGone = false; r.bsAway = 0; r.bsGrow = 0; s.x = P.x + _f.x * BARROW_BACK; s.z = P.z + _f.z * BARROW_BACK; s.yaw = yaw; s.grab = undefined; }
      } else if (sk.kind === 'barrow' && (sk.mode === 'load' || sk.mode === 'drop' || sk.mode === 'lay' || (b.phase === 'place' && sk.mode === 'carry'))) {
        // у карьера — поперёк, ручками к нему (корыто у бедра); у места работы — где отпустил по пути к стойке, иначе
        // справа от точки стойки кладки, вдоль взгляда на деталь, дальше или позади: место — раз на укладку (у карьера —
        // раз на группу), не в рабочих, не в настилах и запасах
        parking = true;
        const pk = parkBarrow(r, sk, b, P, yaw, v, i);
        // сама не едет: не на месте (отпустил там, где ей не стоять: в стене, в рабочем) или убрана — уходит в землю и
        // вырастает на месте, как запас
        if (Math.hypot(pk.x - s.x, pk.z - s.z) > 0.05 || !!r.bsGone) {
          if (!snap) r.bsGrow = 0;
          s.x = pk.x; s.z = pk.z; s.yaw = pk.yaw; s.pitch = PARK_PITCH; s.park = 1; s.parked = true;
        }
        r.bsGone = false; r.bsAway = 0;
      } else if (sk.kind === 'barrow' && !sk.push && REST[b.phase] === true && !r.bsGone && !r.going) {
        // у стола, на перекуре, обеде (тачка не в руках): не в столах, не в рабочих и не в запасах — где оставил, если там
        // можно, иначе сбоку или позади (место — раз на остановку; уходит в землю и вырастает там)
        parking = true;
        if (r.bparkOf !== 'rest:' + b.phase) {
          r.bparkOf = 'rest:' + b.phase;
          const pk = restBarrow(r, b, P, yaw, v, i);
          if (pk) { if (!snap) r.bsGrow = 0; s.x = pk.x; s.z = pk.z; s.yaw = pk.yaw; s.pitch = PARK_PITCH; s.park = 1; s.parked = true; }
        }
      } else if (sk.push && (r.bsGone || Math.hypot(P.x - s.x, P.z - s.z) > (s.parked && !snap && tempo < 5 ? 6.5 : 4))) {
        // катить нечего — тачка далеко (оставлена у подножия лестницы) или убрана: идёт без неё (к стоящей рядом —
        // сбегает за ней: спрыгнул с подмостей, логика уже ведёт дальше)
        sk.push = false;
      }
      // взялся за стоящую тачку: сам идёт к её ручкам (crew.js ведёт по v.barrowGo, лицом по тачке), тачка ждёт; встал у
      // ручек — берёт (у рук она уже стоит). ×5 и ×20 — сразу
      if (sk.push && !snap && tempo < 5 && !r.bsGone && s.parked) {
        const hx = s.x - Math.sin(s.yaw) * BARROW_BACK, hz = s.z - Math.cos(s.yaw) * BARROW_BACK;
        if (Math.hypot(P.x - hx, P.z - hz) > 0.12) {
          v.barrowGo = (r.goTo || (r.goTo = new THREE.Vector3())).set(hx, P.y, hz); v.barrowYaw = s.yaw;
          sk.push = false; r.going = true;
        }
      }
      // брошенная тачка (ходка без тачки, другая ноша — рабочий ушёл от неё дальше 5 м): через 1,5 с уходит в землю, как
      // пустой запас (не стоит на путях бригады), понадобится — вырастет у карьера
      if (!sk.push && !parking && !r.going && !r.bsGone && Math.hypot(P.x - s.x, P.z - s.z) > 5) r.bsAway = (r.bsAway || 0) + dt * Math.max(1, tempo);
      else if (sk.push || parking || r.going) r.bsAway = 0;
      barrowStep(s, P, yaw, sk.push, ground, dt * Math.max(1, tempo), snap);
      const show = sk.kind === 'barrow' ? sk.units : 0;
      r.barrow.set('barrow', sk.materialId || 'ladder-stone', sk.fam === 'concrete' ? 'concrete' : 'stone', sk.kind === 'barrow' ? show : 0, sk.kind === 'barrow' ? sk.level : 0);
      if (r.bsAway > 1.5 && !r.bsGone) {
        r.bsGrow = Math.max(0, Math.min(1, r.bsGrow === undefined ? 1 : r.bsGrow) - dt / 0.35);
        if (r.bsGrow <= 0 || snap) { r.bsGone = true; r.bsGrow = 0; }
      }
      r.barrow.group.visible = w.group.visible && !r.bsGone;
      if (!(r.bsAway > 1.5)) r.bsGrow = Math.min(1, (r.bsGrow === undefined ? 1 : r.bsGrow) + dt / 0.35);
      const gk = ss(r.bsGrow, 0, 1);
      r.barrow.group.scale.setScalar(0.6 + 0.4 * gk);
      r.barrow.group.position.set(s.x, s.y - 0.12 * (1 - gk), s.z);
      r.barrow.group.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
      r.barrow.wheel.rotation.x = s.wheel;
      if (sk.push) {
        // запястье — над концом ручки и на ладонь позади (кулак обхватывает ручку сверху)
        barrowGrips(s, _grips);
        const bx = Math.sin(s.yaw) * 0.07, bz = Math.cos(s.yaw) * 0.07;
        r.gripL.set(_grips[0].x - bx, _grips[0].y + 0.035, _grips[0].z - bz);
        r.gripR.set(_grips[1].x - bx, _grips[1].y + 0.035, _grips[1].z - bz);
      }
    }
    // --- носилка на теле ---
    const body = sk.kind && sk.kind !== 'barrow' && sk.kind !== 'back' && sk.kind !== 'buckets' && (sk.mode !== 'stow');
    // коза, листы и рама со стеклом при погрузке, выкладке и кладке, брус — при выкладке и кладке: на полу справа
    // (штуки кладут в носилку и берут из неё; присевший каменщик не вдавливает в пол ношу у бока, брус не торчит
    // в стену); пола справа нет — слева, нигде нет — на теле. Ставит, когда встал (не на ходу); на поднятом настиле —
    // за спиной (пол внизу)
    const lowKind = GROUND[sk.kind];
    // перекур, обед, сон, сборка лесов, стол — с ношей: носилку на пол рядом, вёдра к ногам (поднимает, когда пошёл)
    const resting = !hang && !aloft && REST[b.phase] === true && b.carry.length > 0 && !!sk.kind && sk.mode === 'carry' && tempo < 20;
    if (!resting) r.restPk = null;
    let grounded = !!lowKind && !hang && !sk.sling && !aloft && ((sk.mode === 'load' && sk.stage !== 'lift' && lowKind.load) || ((sk.mode === 'drop' || sk.mode === 'lay') && settled) || (r.fetch && r.blk === sk.block) || resting);
    const pk = grounded ? (resting ? restPark(r, P, yaw, v, lowKind, i) : parkAt(r, sk, b, P, yaw, v, lowKind.side, lowKind.ahead, 0.5, 0.15, lowKind, i)) : null;
    if (pk && !pk.ok) grounded = false;
    // настил подмостей встал там, где лежит носилка (он появляется посреди укладки под верхние ряды) — носилку за
    // спину (переходом), не сквозь доски
    if (grounded && pl && pl.state !== 'off' && Math.abs(pl.at.y - P.y) < 0.6) {
      const ca = Math.cos(pl.yaw), sa = Math.sin(pl.yaw), dx = pk.x - pl.at.x, dz = pk.z - pl.at.z;
      if (Math.abs(dx * ca - dz * sa) < 0.95 && Math.abs(dx * sa + dz * ca) < 0.5) grounded = false;
    }
    // за спиной: на лестнице и уступе; брус, листы, рама и коза, которые некуда поставить (гребень стены, поднятый
    // настил), — и пока кладёт (наклон к ряду не тычет ношей в стену, руки свободны)
    const slung = !!(sk.kind && MOUNT[sk.kind] && MOUNT[sk.kind].sling) && (sk.sling || (!!lowKind && !grounded && (sk.mode === 'lay' || sk.mode === 'drop' || aloft)));
    const m = body && !grounded ? (slung ? MOUNT[sk.kind].sling : MOUNT[sk.kind]) : null;
    if (grounded) groundPose(r, sk, P, pk);
    const want = !body ? null : grounded ? 'ground' : slung ? 'sling' : 'mount';
    // качание длинной ноши в такт шагу (фаза шага people.js — a.phase)
    const sway = sk.kind === 'beam' || sk.kind === 'sheet' ? Math.sin((w.anim.phase || 0) * 2) * (sk.kind === 'beam' ? 0.045 : 0.03) * Math.min(1, (w.anim.speed || 0) / 1.5) : 0;
    placeCarrier(r, w, want, m, sway, dt, snap);
    if (want) {
      r.main.set(sk.kind, sk.materialId, sk.fam, sk.kind === 'crate' ? 1 : sk.units, sk.level);
      r.main.group.visible = want === 'ground' ? w.group.visible : true;
    } else r.main.set(null);
    r.grounded = grounded;
    // вёдра — в обеих руках; при выкладке и кладке — стоят на земле справа или на настиле (раствор из них черпают;
    // поднимается настил — с ним), ставит, когда встал; из кулаков на пол и обратно — переходом
    const buckets = sk.kind === 'buckets' && sk.mode !== 'stow' && !sk.sling;
    const down = buckets && (((sk.mode === 'drop' || sk.mode === 'lay') && settled) || resting);
    placeBuckets(r, w, buckets, down, P, yaw, pl, dt, snap);
    [r.bl, r.br].forEach(function (c) { c.set(buckets ? 'buckets' : null, sk.materialId, 'concrete', 2, sk.level); });
    // рама за спиной (people.js stack) — только для подъёма и других семейств смешанной ходки
    sk.rack = sk.kind === 'back' || sk.back > 0;
    // --- запас у места работы ---
    sk.grab = null;
    if (b.phase === 'place' && sk.block && r.blk === sk.block) placeStock(r, sk, b, P, tempo);
    // поддон крана стал готов в первые миги укладки (кран привёз впритык): сходить за охапкой ещё не поздно, пока часы рук
    // не пошли (planFetch: не позже 0,25 с после выкладки); принесённое — на свой запас
    if (b.phase === 'place' && sk.block && r.blk === sk.block && !r.fetch && r.entry && !r.entry.crane && r.fetchWhy === 'нет поддона' && lastTempo < 5
      && b.actionT <= (sk.hold || 0) + 0.25 && fam(sk.block.materialId) !== 'glass') {
      const inf = LAY.info.get(sk.block);
      if (inf && inf.mode === 'tied' && r.S) { const plan = planFetch(r, sk, b, r.S, fam(sk.block.materialId), v, P); if (plan) r.fetch = plan; }
    }
    // поход к поддону крана (часы рук ждут; рабочего ведёт crew.js по v.fetchTo)
    if (r.fetch && b.phase === 'place' && sk.block && r.blk === sk.block) fetchStep(r, sk, b, P, v);
    else { v.fetchTo = null; v.fetchFace = null; v.fetchMove = false; sk.armful = false; }
    // без запаса — из носилки: верх ноши в козе (на земле), в тачке, листы и рама на полу; только блок своего семейства
    // (другое семейство смешанной ходки — с рамы за спиной) и только если носилка рядом (не внизу под поднятым настилом;
    // за спиной — рука берёт из-за плеча, как с рамы). Штук в носилке убывает по ходу кладки (sk-haul.js)
    if (b.phase === 'place' && sk.block && !r.entry && !sk.grab && sk.units > 0 && sk.mode === 'lay' && fam(sk.block.materialId) === sk.fam && !aloft
      && ((sk.kind === 'barrow' && r.bs && Math.hypot(r.bs.x - P.x, r.bs.z - P.z) < 2.2) || r.grounded)) {
      slot(r, sk, P, r.grab);
      sk.grab = r.grab;
    }
    // --- поза --- (ноша на полу на перекуре и обеде — без позы под ношу)
    if (sk.mode !== 'fetch') { walkPose(resting && (grounded || down || sk.kind === 'barrow') ? null : sk.kind, sk, r.pose); sk.pose = r.pose; }
    // кисти на ручках, пока катит (взялся у ручек — тачка уже у рук, поднимает их с ними)
    const held = sk.push && !!r.bs;
    sk.gripLW = held ? r.gripL : null; sk.gripRW = held ? r.gripR : null;
    // хват на теле — в осях груди (people.js → reach(…, point(p, true))); переход на пол — руки на ноше, пока несёт;
    // в походе к поддону крана — охапка (fetchStep)
    if (sk.mode === 'fetch') { if (!sk.armful && sk.stage !== 'pick' && sk.stage !== 'put') { sk.gripRC = null; sk.gripLC = null; } }
    else if (want && want !== 'ground' && GRIP[sk.kind] && !slung) {
      const g = GRIP[sk.kind];
      sk.gripRC = localGrip(r, g.R);
      sk.gripLC = !g.L ? null : localGrip(r, g.L, true);
    } else { sk.gripRC = null; sk.gripLC = null; }
    // погрузка и выкладка: откуда (A) и куда (B) руки носят штуки (в походе — fetchStep)
    if (sk.mode !== 'fetch') sk.A = sk.B = null;
    if (sk.mode === 'fetch') { /* A, B — fetchStep */ }
    else if (sk.mode === 'load' && sk.stage === 'load') { source(r, sk, b, P, r.A); slot(r, sk, P, r.B); sk.A = r.A; sk.B = r.B; }
    else if (sk.mode === 'drop') { slot(r, sk, P, r.A); if (!(r.entry && stock.top(r.entry, r.B))) r.B.set(P.x + Math.cos(yaw) * 0.78, P.y + 0.3, P.z - Math.sin(yaw) * 0.78); sk.A = r.A; sk.B = r.B; }
    sk.crouch = sk.A ? crouchFor(Math.min(sk.A.y, sk.B.y) - P.y) : 0;
    w.anim.sk = sk;
    return sk;
  }
  // Поза носилки на полу (мир) → r.G: коза лежит, листы стопкой, брус вдоль стены, рама на полке.
  function groundPose(r, sk, P, pk) {
    const G = r.G, c = Math.cos(pk.yaw), sn = Math.sin(pk.yaw);
    if (sk.kind === 'hod') {
      // лежит: опора — конец древка и задний край лотка, лоток раскрывом вверх (наклон — по отгибу лотка), лоток —
      // вперёд по ходу, древко — назад
      G.x = pk.x; G.y = P.y + HOD_LIE.y; G.z = pk.z; G.rx = HOD_LIE.x; G.ry = pk.yaw + Math.PI;
    } else if (sk.kind === 'sheet') {
      // плашмя стопкой, длинная сторона — вдоль взгляда (середина стопки в осях листа — −0,31; 0,08)
      G.x = pk.x - (-0.31 * c + 0.08 * sn); G.y = P.y + 0.003; G.z = pk.z - (0.31 * sn + 0.08 * c); G.rx = 0; G.ry = pk.yaw;
    } else if (sk.kind === 'beam') {
      // брус на полу вдоль стены (поперёк взгляда): поворот на +90°, середина ноши в осях бруса — −0,08; −0,1
      const a = pk.yaw + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      G.x = pk.x - (-0.0775 * ca - 0.1 * sa); G.y = P.y + 0.002; G.z = pk.z - (0.0775 * sa - 0.1 * ca); G.rx = 0; G.ry = a;
    } else {
      // рама стоит на полке и стойках (0,85 м), плоскость — вдоль взгляда
      G.x = pk.x + 0.31 * sn; G.y = P.y + 0.85; G.z = pk.z + 0.31 * c; G.rx = 0; G.ry = pk.yaw;
    }
  }
  // Носилка на место want ('ground' — поза r.G в мире, 'mount' / 'sling' — крепление m на груди, null — нет): смена
  // места — переход TRANS с: на пол — по миру (откуда — где была в миг начала: опускает, корпус в выкладке
  // приседает — носилка за ним не скачет), на тело — в осях рамки груди (откуда — где была, в её осях: поднятая с пола
  // идёт с ним). Потом на полу — в мире, на теле — на якоре груди.
  function placeCarrier(r, w, want, m, sway, dt, snap) {
    const g = r.main.group;
    if (want !== r.place) {
      if (r.place && want && !snap) {
        g.updateWorldMatrix(true, false);
        if (want === 'ground') g.matrixWorld.decompose(r.trP, r.trQ, _s1);
        else {
          r.frame.updateWorldMatrix(true, false);
          _m1.copy(r.frame.matrixWorld).invert().multiply(g.matrixWorld);
          _m1.decompose(r.trP, r.trQ, _s1);
        }
        r.trT = 0;
      } else r.trT = 1;
      r.place = want;
    }
    if (!want) {
      if (g.parent !== r.anchor) { r.anchor.add(g); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); }
      return;
    }
    r.trT = snap ? 1 : Math.min(1, r.trT + dt / TRANS);
    if (want === 'ground') {
      if (g.parent !== group) group.add(g);
      _q3.setFromEuler(_e.set(r.G.rx, r.G.ry, 0, 'YXZ'));
      if (r.trT >= 1) { g.position.set(r.G.x, r.G.y, r.G.z); g.quaternion.copy(_q3); }
      else {
        const k = ss(r.trT, 0, 1);
        g.position.copy(r.trP).lerp(_w1.set(r.G.x, r.G.y, r.G.z), k);
        g.quaternion.copy(r.trQ).slerp(_q3, k);
      }
      g.visible = w.group.visible;
      return;
    }
    if (g.parent !== r.anchor) { r.anchor.add(g); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); }
    // цель в осях рамки груди
    {
      const sh = w.armRest.R.sh;
      _p2.set(sh.x + m.at[0], sh.y + m.at[1], sh.z + m.at[2]);
      _q3.setFromEuler(_e.set(m.rot[0] + sway, m.rot[1], m.rot[2], 'YXZ'));
    }
    if (r.trT >= 1) { r.anchor.position.copy(_p2); r.anchor.quaternion.copy(_q3); return; }
    const k = ss(r.trT, 0, 1);
    r.anchor.position.copy(r.trP).lerp(_p2, k);
    r.anchor.quaternion.copy(r.trQ).slerp(_q3, k);
  }
  // Вёдра: в кулаках (висят отвесно — after) или на полу справа / на настиле у правого торца; смена — переходом
  // BUCKET_T с (по миру: из кулака к месту на полу и обратно).
  function placeBuckets(r, w, on, down, P, yaw, pl, dt, snap) {
    const want = on && down ? 'down' : 'fist';
    if (want !== r.bk) { r.bk = want; r.bkT = snap || !on ? 1 : 0; }
    r.bkT = Math.min(1, r.bkT + (snap ? 1 : dt / BUCKET_T));
    const rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const deck = pl && pl.state === 'up';
    [r.bl, r.br].forEach(function (c, k) {
      const g = c.group, fist = r.fists[k];
      if (want === 'fist' && r.bkT >= 1) {
        if (fist[0] && g.parent !== fist[0]) { fist[0].add(g); g.position.copy(fist[1]); g.rotation.set(0, 0, 0); }
        return;
      }
      // место на полу: справа у ног; на настиле — у правого торца (настил поднимается — вёдра с ним)
      const s = k ? -0.17 : 0.17, W = r.bkW[k];
      if (deck) {
        const ax = Math.cos(pl.yaw), az = -Math.sin(pl.yaw), fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw);
        W.set(pl.at.x - ax * 0.58 + fx * s, pl.at.y + Math.max(0.045, pl.y) + 0.62, pl.at.z - az * 0.58 + fz * s);
      } else W.set(P.x + rx * 0.5 + _f.x * (0.1 + s), P.y + 0.62, P.z + rz * 0.5 + _f.z * (0.1 + s));
      if (g.parent !== group) group.add(g);
      if (r.bkT >= 1) g.position.copy(W);
      else {
        // кулак в мире (поза прошлого кадра)
        if (fist[0]) { fist[0].updateWorldMatrix(true, false); _w1.copy(fist[1]).applyMatrix4(fist[0].matrixWorld); } else _w1.copy(W);
        const u = ss(r.bkT, 0, 1);
        if (want === 'down') g.position.copy(_w1).lerp(W, u); else g.position.copy(W).lerp(_w1, u);
      }
      g.rotation.set(0, yaw, 0);
    });
    r.bucketsDown = want === 'down' || r.bkT < 1;
  }
  // Где стоит носилка, снятая с плеча (коза, листы, рама, брус на полу): у места работы — справа от точки стойки кладки
  // (side, ahead — вбок и вперёд по взгляду на деталь), раз на укладку — не ездит за рабочим вдоль ряда; у карьера и
  // штабеля — справа от рабочего (qside, qahead), каждый кадр.
  // span — { fore, aft }: длина носилки вперёд и назад вдоль взгляда; пол проверяется в точке и на концах. Справа нет
  // пола (впереди стена, сбоку проём), там запас, рабочий или настил — дальше назад на 0,25 и 0,5 м, потом так же слева
  // (ok — нашлось).
  function parkAt(r, sk, b, P, yaw, v, side, ahead, qside, qahead, span, i) {
    const blk = b.phase === 'place' ? sk.block : null;
    if (blk && r.park && r.parkOf === blk) return r.park;
    const S = blk && v.stand ? v.stand : P, info = blk ? LAY.info.get(blk) : null;
    let ya = yaw;
    if (blk) { const tx = info ? info.pack[0] : (blk.x + 0.5) * CELL, tz = info ? info.pack[2] : (blk.z + 0.5) * CELL; if (Math.hypot(tx - S.x, tz - S.z) > 0.05) ya = Math.atan2(tx - S.x, tz - S.z); }
    const fx = Math.sin(ya), fz = Math.cos(ya), rx = -Math.cos(ya), rz = Math.sin(ya), sd = blk ? side : qside, ah = blk ? ahead : qahead;
    const pk = r.park || (r.park = { x: 0, z: 0, yaw: 0, ok: true });
    const e = blk ? r.entry : null, fo = span.fore, af = span.aft, ac = span.across || 0;
    const obs = obstacles(i, S.y, v, OBS);
    // где он стоит у детали (стопы — не в носилке); будущий настил
    if (blk && v.standAt) obs.push({ c: true, x: v.standAt.x, z: v.standAt.z, r: 0.34 });
    let ok = false;
    for (let k = 1; k >= -1 && !ok; k -= 2) {
      for (let j = 0; j < 3 && !ok; j++) {
        const a = ah - j * 0.25, x = S.x + rx * sd * k + fx * a, z = S.z + rz * sd * k + fz * a;
        ok = floorAt(x, S.y, z) && floorAt(x + fx * fo, S.y, z + fz * fo) && floorAt(x - fx * af, S.y, z - fz * af) && !(e && Math.hypot(e.x - x, e.z - z) < 0.75)
          && (!ac || (floorAt(x + rx * ac, S.y, z + rz * ac) && floorAt(x - rx * ac, S.y, z - rz * ac)))
          && !blocked(obs, x, z) && !blocked(obs, x + fx * fo * 0.8, z + fz * fo * 0.8) && !blocked(obs, x - fx * af * 0.8, z - fz * af * 0.8)
          && (!ac || (!blocked(obs, x + rx * ac * 0.8, z + rz * ac * 0.8) && !blocked(obs, x - rx * ac * 0.8, z - rz * ac * 0.8)));
        if (ok || (k === 1 && !j)) { pk.x = x; pk.z = z; }
      }
    }
    pk.yaw = ya; pk.ok = ok;
    // место — когда сведения о пачке уже есть (точка стойки по ним)
    r.parkOf = info ? blk : null;
    return pk;
  }
  // Тачка, пока он у стола, курит, ест (в руках ничего): где стоит, если не в столах, не в рабочих, запасах и других
  // тачках; иначе сбоку (справа, слева) или позади, вдоль взгляда или поперёк. → { x, z, yaw } (колесо) или null — где стоит.
  const REST_B = [[0.85, -0.2, 0], [-0.85, -0.2, 0], [0.85, -0.9, 0], [-0.85, -0.9, 0], [0.7, -1.0, Math.PI / 2], [-0.7, -1.0, -Math.PI / 2]];
  function restBarrow(r, b, P, yaw, v, i) {
    const obs = obstacles(i, P.y, v, OBS);
    obs.push({ c: true, x: P.x, z: P.z, r: 0.35 });
    // столы планирования (yard.js: у дома каждого рабочего, на 0,6 м по +z; столешница 1,24 × 0,74)
    world.builders.forEach(function (o) { if (o && o.trade !== 'engineer' && o.homeCell && P.y < 0.5) obs.push({ c: false, x: (o.homeCell[0] + 0.5) * CELL, z: (o.homeCell[2] + 0.5) * CELL + 0.6, ca: 1, sa: 0, hx: 0.72, hz: 0.47, ox: 0 }); });
    for (let k = 0; k < rec.length; k++) {
      const o = rec[k];
      if (k === i || !o || !o.bs || !o.barrow.group.visible) continue;
      const q = o.bs, sy = Math.sin(q.yaw), cy = Math.cos(q.yaw);
      obs.push({ c: false, x: q.x - sy * 0.62, z: q.z - cy * 0.62, ca: cy, sa: sy, hx: 0.42, hz: 0.95, ox: 0 });
    }
    const s = r.bs;
    if (barrowFree(obs, s.x, P.y, s.z, s.yaw)) return null;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    for (let k = 0; k < REST_B.length; k++) {
      const c = REST_B[k], x = P.x + rx * c[0] + fx * c[1], z = P.z + rz * c[0] + fz * c[1], by = yaw + c[2];
      if (barrowFree(obs, x, P.y, z, by)) { _rb.x = x; _rb.z = z; _rb.yaw = by; return _rb; }
    }
    return null;
  }
  const _rb = { x: 0, z: 0, yaw: 0 };
  // Где носилка на полу, пока он курит, ест, собирает леса (раз на перекур): справа, слева, сзади-справа, сзади-слева, сзади
  // (вдоль взгляда; пол под ней, не в рабочих, настилах и запасах); нигде — справа, как есть.
  const REST_AT = [[1, 0.1], [-1, 0.1], [1, -0.4], [-1, -0.4], [0, -0.75]];
  function restPark(r, P, yaw, v, span, i) {
    if (r.restPk) return r.restPk;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw), sd = Math.max(0.45, span.side || 0.5);
    const obs = obstacles(i, P.y, v, OBS), fo = span.fore, af = span.aft;
    const pk = { x: P.x + rx * sd, z: P.z + rz * sd, yaw: yaw, ok: false };
    for (let k = 0; k < REST_AT.length && !pk.ok; k++) {
      const c = REST_AT[k], x = P.x + rx * sd * c[0] + fx * c[1], z = P.z + rz * sd * c[0] + fz * c[1];
      if (!floorAt(x, P.y, z) || !floorAt(x + fx * fo, P.y, z + fz * fo) || !floorAt(x - fx * af, P.y, z - fz * af)) continue;
      if (blocked(obs, x, z) || blocked(obs, x + fx * fo * 0.8, z + fz * fo * 0.8) || blocked(obs, x - fx * af * 0.8, z - fz * af * 0.8)) continue;
      pk.x = x; pk.z = z; pk.ok = true;
    }
    r.restPk = pk;
    return pk;
  }
  // Где стоит тачка (колесо, курс): у места работы — раз на укладку, у карьера — раз на группу карьера; кандидаты
  // PARK_SITE / PARK_QUARRY по порядку, первый, где тачка на полу и не в рабочих, настилах и запасах (своя точка стойки
  // у детали и место у карьера — тоже).
  function parkBarrow(r, sk, b, P, yaw, v, i) {
    const blk = b.phase === 'place' ? sk.block : null, g = blk ? null : b.mineQueue && b.mineQueue[0];
    const key = blk || g || null;
    if (key && r.bpark && r.bparkOf === key) return r.bpark;
    const pk0 = r.bpark || (r.bpark = { x: 0, z: 0, yaw: 0, ok: false });
    // отпустил у стойки по пути к ней (crew.js → v.preRelOf, место проверено barrowRelease) — там и стоит
    if (blk && v.preRelOf === blk && r.bs && !r.bsGone) { pk0.x = r.bs.x; pk0.z = r.bs.z; pk0.yaw = r.bs.yaw; pk0.ok = true; r.bparkOf = blk; return pk0; }
    const S = blk && v.stand ? v.stand : P, info = blk ? LAY.info.get(blk) : null;
    let ya = yaw;
    if (blk) { const tx = info ? info.pack[0] : (blk.x + 0.5) * CELL, tz = info ? info.pack[2] : (blk.z + 0.5) * CELL; if (Math.hypot(tx - S.x, tz - S.z) > 0.05) ya = Math.atan2(tx - S.x, tz - S.z); }
    const fx = Math.sin(ya), fz = Math.cos(ya), rx = -Math.cos(ya), rz = Math.sin(ya);
    const obs = obstacles(i, S.y, v, OBS);
    if (blk) { obs.push({ c: true, x: (v.standAt || S).x, z: (v.standAt || S).z, r: 0.3 }); deckSoon(obs, v, info, S, ya); }
    else obs.push({ c: true, x: P.x, z: P.z, r: 0.3 });
    const list = blk ? PARK_SITE : PARK_QUARRY;
    const pk = r.bpark || (r.bpark = { x: 0, z: 0, yaw: 0, ok: false });
    let found = false;
    // у места работы — где отпустил, если там можно (не перед ним у детали, рядом со стойкой): тачка не едет сама
    const s = r.bs;
    if (blk && s && Math.hypot(s.x - Math.sin(s.yaw) * 0.5 - S.x, s.z - Math.cos(s.yaw) * 0.5 - S.z) < 1.0 && barrowFree(obs, s.x, S.y, s.z, s.yaw)) {
      const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
      let front = false;
      for (let k = 0; k < BARROW_PTS.length && !front; k++) { const q = BARROW_PTS[k], wx = s.x + cy * q[0] + sy * q[1], wz = s.z - sy * q[0] + cy * q[1]; if ((wx - S.x) * fx + (wz - S.z) * fz > 0.25) front = true; }
      if (!front) { pk.x = s.x; pk.z = s.z; pk.yaw = s.yaw; found = true; }
    }
    for (let k = 0; k < list.length && !found; k++) {
      const c = list[k], x = S.x + rx * c[0] + fx * c[1], z = S.z + rz * c[0] + fz * c[1], by = ya + c[2];
      if (!barrowFree(obs, x, S.y, z, by)) continue;
      pk.x = x; pk.z = z; pk.yaw = by; found = true;
    }
    if (!found) { const c = list[0]; pk.x = S.x + rx * c[0] + fx * c[1]; pk.z = S.z + rz * c[0] + fz * c[1]; pk.yaw = ya; }
    pk.ok = found;
    // у места работы — когда сведения о пачке уже есть (точка стойки по ним)
    r.bparkOf = blk ? (info ? blk : null) : key;
    return pk;
  }
  // Откуда берёт при погрузке (мир): у каменоломни — колотый камень у ног перед собой, у штабеля — верх пачки
  // перед собой, у корыта — раствор, у бруса и листов — край стопки.
  function source(r, sk, b, P, out) {
    const g = b.mineQueue && b.mineQueue[0];
    const mx = g && g.mine ? (g.mine.x + 0.5) * CELL : P.x + _f.x, mz = g && g.mine ? (g.mine.z + 0.5) * CELL : P.z + _f.z;
    const dx = mx - P.x, dz = mz - P.z, d = Math.hypot(dx, dz) || 1;
    const h = sk.fam === 'stone' || sk.fam === 'marble' ? 0.12 : sk.fam === 'concrete' ? 0.24 : sk.fam === 'brick' ? 0.85 : 0.6;
    return out.set(P.x + dx / d * 0.62, P.y + h, P.z + dz / d * 0.62);
  }
  // Куда кладёт (мир): корыто тачки, лоток козы на земле, плечо (брус, лист), рама со стеклом, вёдра (у ног).
  const _slot = new THREE.Vector3();
  function slot(r, sk, P, out) {
    if (sk.kind === 'barrow' && r.bs) {
      // ближняя к рабочему часть корыта (верх 0,62 × 0,82 у z −0,5 в осях тачки), а не середина: тачка в 0,6–0,8 м
      // сбоку — рука берёт и кладёт у ближнего борта
      const s = r.bs, sy = Math.sin(s.yaw), cy = Math.cos(s.yaw), dx = P.x - s.x, dz = P.z - s.z;
      const lx = THREE.MathUtils.clamp(dx * cy - dz * sy, -0.17, 0.17), lz = THREE.MathUtils.clamp(dx * sy + dz * cy, -0.76, -0.24);
      return out.set(s.x + lx * cy + lz * sy, s.y + 0.32, s.z - lx * sy + lz * cy);
    }
    if (r.place === 'ground' && GROUND[sk.kind]) {
      r.main.group.updateMatrixWorld(true);
      if (sk.kind === 'hod') return out.fromArray(HOD_SLOT).applyMatrix4(r.main.group.matrixWorld);
      // верхний лист стопки; верхний брус; верх стёкол в раме
      if (sk.kind === 'sheet') return out.set(-0.31, Math.max(1, sk.units) * 0.011 + 0.01, 0.08).applyMatrix4(r.main.group.matrixWorld);
      if (sk.kind === 'beam') return out.set(0, 0.15 * Math.min(2, Math.max(1, sk.units)), -0.1).applyMatrix4(r.main.group.matrixWorld);
      return out.set(0.05, -0.1, -0.31).applyMatrix4(r.main.group.matrixWorld);
    }
    if (sk.kind === 'buckets') {
      // ведро на полу (или в кулаке, пока ставит)
      if (r.bl.group.parent === group) { out.copy(r.bl.group.position); out.y -= 0.32; return out; }
      const rx = -Math.cos(r.w.heading || 0), rz = Math.sin(r.w.heading || 0); return out.set(P.x + rx * 0.5 + _f.x * 0.1, P.y + 0.3, P.z + rz * 0.5 + _f.z * 0.1);
    }
    // на плечо: правое плечо (по рабочему)
    const sh = r.w.armRest.R.sh;
    r.frame.updateWorldMatrix(true, false);
    return out.copy(_slot.set(sh.x, sh.y + 0.08, sh.z)).applyMatrix4(r.frame.matrixWorld);
  }
  // точка хвата носилки (оси носилки) → оси ведущей груди (через якорь)
  const _gl = new THREE.Vector3(), _gr = new THREE.Vector3();
  function localGrip(r, p, left) {
    const out = left ? _gl : _gr;
    out.set(p[0], p[1], p[2]);
    r.anchor.updateMatrix();
    return out.applyMatrix4(r.anchor.matrix);
  }
  // Запас укладки: выкладка (K штук — по штуке на цикл рук ms-lay.js) и кладка с запаса (верхняя штука — левой).
  // Первый кадр укладки: запас у точки стойки S — свой (есть что выложить; поддон крана рядом — свои штуки на него) или
  // поддон крана рядом (рама за спиной — берёт его груз); своему некуда встать (гребень стены, тесный проём) — выкладки
  // нет, носилка остаётся на теле (r.noStock).
  function startPlace(r, sk, b, S, P, i, v) {
    const blk = sk.block;
    const info = LAY.info.get(blk) || null;
    // ожидание сведений и настила — счёт кадров заново на каждую деталь (прежняя могла кончиться посреди ожидания)
    if (r.pendOf !== blk) { r.pendOf = blk; r.pend = 0; r.pendP = 0; }
    // тачка — сама запас: стоит у стойки (отпустил рядом по пути к ней), кладёт прямо из неё, без выкладки (укладка у
    // земли ~1 с: выкладка съела бы цикл руки); на подмостях — с настила, как прежде
    if (sk.kind === 'barrow' && sk.share > 0 && r.bs && !r.bsGone && !(v.platWant > 0)) {
      r.blk = blk; r.put = 0; r.taken = 0; r.j = -1; r.jc = -1; r.K = 0; r.entry = null; r.fetch = null; r.fetchPut = false; r.pend = 0;
      (r.S = r.S || new THREE.Vector3()).set(S.x, S.y, S.z);
      haul.noDrop(i); r.noStock = true; r.fetchWhy = 'из тачки'; r.startWhy = 'barrow';
      return;
    }
    // сведения о пачке здание пишет кадром позже (по ним — точка стойки и подмости): подождать до 4 кадров
    if (!info && sk.share > 0 && (r.pend = (r.pend || 0) + 1) < 4) return;
    r.pend = 0;
    // ряд — с подмостей, а прежний настил ещё не сложен (спрыгнул с него после прошлой детали той же ходки): запас — на
    // новый настил, когда встанет (до 30 кадров; выкладка идёт, штуки на него догоняют долей). Иначе запас оставался на
    // полу, а настил с каменщиком поднимался — рука тянулась к нему сквозь доски (L5 бетон: 0,72 м ниже стоп)
    if (sk.share > 0 && v.platWant > 0 && !(v.plat && v.plat.state === 'up') && (r.pendP = (r.pendP || 0) + 1) < 30) return;
    r.pendP = 0;
    r.blk = blk; r.put = 0; r.taken = 0; r.j = -1; r.jc = -1; r.K = 0; r.entry = null; r.noStock = false; r.fetch = null; r.fetchPut = false;
    r.S = r.S || new THREE.Vector3(); r.S.set(S.x, S.y, S.z);
    const fm = fam(blk.materialId);
    // укладка на ×1 короче цикла руки после выкладки (камень L5 с подмостей — 0,47 с): выкладки нет, кладёт из носилки
    // в такт рукам (с выкладкой — рядами, и выложенное под этот блок осталось бы невзятым и пропало после укладки)
    // (и подход к точке стойки — часы рук ждут и его: sk-haul.js a0, не больше 0,45 укладки)
    const Tl = b.actionT + b.timer, tl = Math.max(1, lastTempo);
    const a0 = v.arriveOf === blk && v.arrive > 0 && Tl > 0 ? Math.min(0.45, v.arrive / Tl) : 0;
    if (lastTempo < 5 && sk.share > 0 && Tl > 0 && Tl * (1 - a0 - dropShare(Tl, tl)) / tl < MIN_TIED + 0.05) { haul.noDrop(i); r.noStock = true; r.fetchWhy = 'короткая укладка'; r.startWhy = 'short'; return; }
    // кладка с подмостей (crew.js: настил у ног уже стоит на время выкладки) — запас на настиле: у левого торца или
    // вдоль заднего края, поднимается с ним
    const pl = v.plat;
    // для разбора (rv-fin1.mjs): какой веткой заведён запас, сведения, настил
    r.startWhy = 'ground:' + (info ? info.mode : '-') + ':' + (Math.round((v.platWant || 0) * 100) / 100) + ':' + (pl ? pl.state + '@' + Math.round(pl.y * 100) / 100 : '-');
    if (sk.share > 0 && pl && pl.state === 'up' && v.platWant > 0) {
      r.startWhy = 'deck';
      const L = layoutOf(fm, true), ax = Math.cos(pl.yaw), az = -Math.sin(pl.yaw), fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw);
      const along = L.place === 'end' ? L.along : 0, across = L.place === 'end' ? 0 : -0.27;
      r.entry = stock.ensureAt(fm, blk.materialId, { x: pl.at.x + ax * along + fx * across, y: pl.at.y + Math.max(0.045, pl.y), z: pl.at.z + az * along + fz * across, yaw: pl.yaw }, b.index);
      // поддон крана того же материала на этом ярусе — сходить за охапкой до подъёма настила (после выкладки своей ноши)
      if (info && info.mode === 'tied' && lastTempo < 5 && fm !== 'glass') { const plan = planFetch(r, sk, b, S, fm, v, P); if (plan) r.fetch = plan; }
      return;
    }
    // взгляд — к пачке (или к середине клетки детали) от точки стойки S (туда рабочий подходит класть)
    const tx = info ? info.pack[0] : (blk.x + 0.5) * CELL, tz = info ? info.pack[2] : (blk.z + 0.5) * CELL;
    _v.set(tx - S.x, 0, tz - S.z);
    // без своей ноши (рама за спиной) — только поддон крана: чужой запас не трогает; раствор и стекло — своим запасом
    // (на поддон крана их не кладут)
    r.entry = sk.share > 0 ? stock.ensure(fm, blk.materialId, S, _v, b.index, P, fm === 'concrete' || fm === 'glass') : stock.find(fm, S, REACH, true);
    if (r.entry && r.entry.kind === 'crane' && sk.share === 0 && !(r.entry.craneLeft > 0)) r.entry = null;
    // поддон крана дальше руки — сходить к нему за штуками (свой запас у стойки — для принесённого; рама за спиной —
    // запас заводится под принесённое)
    r.fetch = null;
    // для разбора (rv-skf.mjs): почему не пошёл к поддону крана (planFetch уточнит)
    r.fetchWhy = r.entry && r.entry.kind === 'crane' ? 'берёт с поддона' : !info ? 'нет сведений о пачке' : info.mode !== 'tied' ? 'рядами' : lastTempo >= 5 ? 'темп' : fm === 'glass' ? 'стекло' : r.fetchWhy;
    if (!(r.entry && r.entry.kind === 'crane') && info && info.mode === 'tied' && lastTempo < 5 && fm !== 'glass') {
      const plan = planFetch(r, sk, b, S, fm, v, P);
      // принесённое — на свой запас: с подмостей — на настил (поднимется с ним), с пола — у стойки
      if (plan && !r.entry && pl && pl.state === 'up' && v.platWant > 0) {
        const L = layoutOf(fm, true), ax = Math.cos(pl.yaw), az = -Math.sin(pl.yaw), fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw);
        const along = L.place === 'end' ? L.along : 0, across = L.place === 'end' ? 0 : -0.27;
        r.entry = stock.ensureAt(fm, blk.materialId, { x: pl.at.x + ax * along + fx * across, y: pl.at.y + Math.max(0.045, pl.y), z: pl.at.z + az * along + fz * across, yaw: pl.yaw }, b.index);
      }
      if (plan && !r.entry) r.entry = stock.ensure(fm, blk.materialId, S, _v, b.index, P, true);
      if (plan && r.entry) r.fetch = plan;
    }
    // для разбора: как далеко от точки стойки поддон крана того же материала на том же ярусе (не дотянулся — дальше REACH)
    r.craneD = null;
    if (!(r.entry && r.entry.kind === 'crane')) stock.list().forEach(function (e) {
      if (e.kind !== 'crane' || e.fam !== fm || Math.abs(e.y - S.y) > 0.6) return;
      const d = Math.round(Math.hypot(e.x - S.x, e.z - S.z) * 100) / 100;
      if (r.craneD === null || d < r.craneD) r.craneD = d;
    });
    if (!r.entry && sk.share > 0) {
      haul.noDrop(i); r.noStock = true; r.misses = (r.misses || 0) + 1;
      // для разбора: где не нашлось места (точка стойки, пол вокруг на 0,8 м по восьми сторонам)
      r.missAt = { S: [S.x, S.y, S.z].map(function (q) { return Math.round(q * 100) / 100; }), floor: [0, 1, 2, 3, 4, 5, 6, 7].map(function (k) { const a = k * Math.PI / 4; return floorAt(S.x + Math.sin(a) * 0.8, S.y, S.z + Math.cos(a) * 0.8) ? 1 : 0; }).join('') };
    }
  }
  // Поход к поддону крана: где встать у него (со стороны точки стойки, в 0,75 м от середины), успевает ли (подход,
  // выкладка и поход — не дольше FETCH_MAX укладки), сколько штук принести (рама за спиной — все, своя ноша — половину).
  // → план { e, F, q0 (доля укладки — начало похода), go, pick, back, put (доли), n } или null.
  // Путь по полу яруса от A до B (шаг 0,3 м): ни стены, ни пустоты под ногами.
  function floorPath(A, B) {
    const d = Math.hypot(B.x - A.x, B.z - A.z), n = Math.max(1, Math.ceil(d / 0.3));
    for (let k = 1; k < n; k++) { const t = k / n; if (!floorAt(A.x + (B.x - A.x) * t, A.y, A.z + (B.z - A.z) * t)) return false; }
    return true;
  }
  function planFetch(r, sk, b, S, fm, v, P) {
    const st = v.standAt || S;
    // ближний поддон крана с грузом: в досягаемости крана, а нет — дальше, до FETCH_FAR (к нему — по полу без стен)
    let c = null, cd = FETCH_FAR;
    stock.list().forEach(function (e) {
      if (!e.crane || e.fam !== fm || !(e.craneLeft > 0) || e.fade > 0 || Math.abs(e.y - st.y) > 0.6) return;
      const d = Math.hypot(e.x - st.x, e.z - st.z);
      if (d < cd && (d <= CRANE_REACH || floorPath(st, e))) { cd = d; c = e; }
    });
    r.fetchWhy = 'нет поддона';
    if (!c) return null;
    let ux = st.x - c.x, uz = st.z - c.z;
    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul; uz /= ul;
    const F = new THREE.Vector3(c.x + ux * 0.75, st.y, c.z + uz * 0.75), d = Math.hypot(F.x - st.x, F.z - st.z);
    // в руке (поддон у самой стойки) — не ходить; встать у поддона — на полу того же яруса
    r.fetchWhy = 'место у поддона';
    if (d < 0.35 || !floorAt(F.x, F.y, F.z) || Math.abs(c.y - st.y) > 0.6) return null;
    const T = b.actionT + b.timer, tempo = Math.max(1, lastTempo);
    // часы рук уже идут (вид подключился посреди укладки) — поход сдвинул бы их: не ходит
    r.fetchWhy = 'уже кладёт';
    if (b.actionT > (sk.hold || 0) + 0.25) return null;
    r.fetchWhy = 'короткая укладка';
    if (!(T > 0)) return null;
    // без выкладки (своей ноши этого семейства нет — рама за спиной) руки ждут только подход к точке стойки (с лестницы
    // и уступа — не заранее): поход — вместо него, сразу и прямо от места, где он стоит (к поддону, потом к стойке)
    const direct = !(sk.share > 0) && !!P && b.actionT <= 0.02 * T && Math.abs(P.y - st.y) < 0.3 && floorPath(P, F);
    // циклов «взять»: по FETCH_UNIT единиц груза крана за цикл, сколько осталось (не больше FETCH_PICKS); не успевает —
    // меньше циклов
    const g = FETCH_UNIT[fm] || 1, q0 = direct ? 0 : (sk.hold || 0) / T, put = FETCH_CYC * tempo / T;
    const back = (d / FETCH_WALK + 0.12) * tempo / T, go = direct ? (Math.hypot(F.x - P.x, F.z - P.z) / FETCH_WALK + 0.12) * tempo / T : back;
    let pk = Math.max(1, Math.min(FETCH_PICKS, Math.ceil(c.craneLeft / g)));
    while (pk > 1 && q0 + go + back + pk * FETCH_CYC * tempo / T + put > FETCH_MAX) pk--;
    const pick = pk * FETCH_CYC * tempo / T, f = go + back + pick + put;
    // для разбора: укладка, доля до похода (выкладка, подход), ходьба туда, весь поход, циклов, до поддона, прямо
    r.fetchDbg = [Math.round(T * 100) / 100, Math.round(q0 * 100) / 100, Math.round(go * 100) / 100, Math.round(f * 100) / 100, pk, Math.round(d * 100) / 100, direct ? 1 : 0];
    if (q0 + f > FETCH_MAX) return null;
    r.fetchWhy = 'идёт';
    // штук принести: по циклам рук кладки после похода (часы рук — в остаток укладки)
    const info = LAY.info.get(sk.block), cyc = info && info.cyc > 0 ? info.cyc : 0.8;
    const K = Math.max(1, Math.round(T * (1 - q0 - f) / tempo / cyc));
    return { e: c, F: F, q0: q0, go: go, pick: pick, back: back, put: put, f: f, n: sk.share > 0 ? Math.max(1, Math.floor(K / 2)) : K, got: 0, laid: 0, stage: '',
      pk: pk, g: g, done: 0, ai: -1, A: new THREE.Vector3() };
  }
  // Кадр похода: стадия по доле укладки (go — к поддону, pick — два цикла «взять», back — назад с охапкой, put — цикл
  // «положить» на свой запас); crew.js ведёт рабочего к v.fetchTo и обратно, лицом — к v.fetchFace; часы рук ждут
  // (sk.hold — до конца похода). Груз крана убывает по взятым штукам (consume долей единицы), свой запас растёт.
  const _fa = new THREE.Vector3(), _fb = new THREE.Vector3();
  function fetchStep(r, sk, b, P, v) {
    const fe = r.fetch, T = b.actionT + b.timer, local = T > 0 ? Math.min(1, b.actionT / T) : 1;
    sk.hold = (fe.q0 + fe.f) * T;
    v.fetchTo = null; v.fetchFace = null; v.fetchMove = false; sk.armful = false;
    if (local < fe.q0 || local >= fe.q0 + fe.f) { fe.stage = local < fe.q0 ? '' : 'done'; if (fe.stage === 'done') putRest(r, fe); return; }
    const u = local - fe.q0, e = fe.e;
    sk.mode = 'fetch'; sk.A = sk.B = null;
    const arms = function (out) { r.frame.updateWorldMatrix(true, false); return out.copy(ARM_L).add(ARM_R).multiplyScalar(0.5).applyMatrix4(r.frame.matrixWorld); };
    v.fetchMove = u < fe.go + fe.pick + fe.back;
    if (u < fe.go) { fe.stage = 'go'; v.fetchTo = fe.F; sk.stage = 'go'; }
    else if (u < fe.go + fe.pick) {
      fe.stage = 'pick'; v.fetchTo = fe.F; sk.stage = 'pick';
      const cc = (u - fe.go) / fe.pick * fe.pk, ci = Math.min(fe.pk - 1, Math.floor(cc)), c = Math.min(1, cc - ci);
      // цикл ci: рука — к верхней единице груза (точка — на весь цикл: взятая не дёргает руку к следующей)
      if (fe.ai !== ci) { fe.ai = ci; if (!(stock.top(e, _fa) && e.crane)) _fa.set(e.x, e.top || e.y + 0.5, e.z); fe.A.copy(_fa); }
      // хват (0,36 цикла): с поддона крана — FETCH_UNIT единиц его груза сверху, поддон убывает на глазах; в охапку —
      // своя доля штук; событие кладки 'take' — руки взяли с поддона крана (проверки, эффекты)
      if (fe.done <= ci && c >= 0.36) {
        const due = Math.max(fe.got + 1, Math.round(fe.n * (ci + 1) / fe.pk));
        if (LAY.listening()) LAY.emit('take', { builder: b, block: sk.block, count: due - fe.got, source: 'pallet', at: [fe.A.x, fe.A.y, fe.A.z], crane: true });
        if (e.crane && e.craneLeft > 0) {
          const k = Math.min(e.craneLeft, fe.g);
          const left = site() ? site().consume(e.crane, k) : -1;
          if (left >= 0) { e.craneLeft = left; e.taken = (e.taken || 0) + k; stock.moved(); }
        }
        fe.got = Math.min(fe.n, due); fe.done = ci + 1;
      }
      sk.A = r.A.copy(fe.A); sk.B = arms(r.B); sk.c = c; sk.cycles = 1;
      v.fetchFace = _fb.set(e.x, e.y, e.z);
    } else if (u < fe.go + fe.pick + fe.back) { fe.stage = 'back'; sk.stage = 'back'; sk.armful = fe.got > 0; }
    else {
      fe.stage = 'put'; sk.stage = 'put';
      const c = (u - fe.go - fe.pick - fe.back) / fe.put;
      sk.A = arms(r.A); sk.B = r.entry && stock.top(r.entry, r.B) ? r.B : r.B.set(P.x, P.y + 0.6, P.z);
      sk.c = c; sk.cycles = 1;
      if (c >= 0.8) putRest(r, fe);
    }
    if (sk.armful || fe.stage === 'pick' || fe.stage === 'put') {
      // охапка — в руках, кисти перед грудью (позы sk-pose: ARMFUL)
      sk.pose = ARMFUL; sk.gripLC = ARM_L; sk.gripRC = ARM_R; sk.gripLW = sk.gripRW = null;
    }
  }
  // принесённое — на свой запас (раз); источник первой пачки после похода — заново (запас был пуст, когда часы рук
  // встали на первый цикл: левая брала бы «с рамы», а штука уходила бы с запаса без руки)
  function putRest(r, fe) {
    if (r.fetchPut || !r.entry) return;
    r.fetchPut = true;
    const n = Math.max(0, fe.got);
    if (n) { stock.put(r.entry, n); r.put += n; if (!r.took) r.j = -1; }
  }
  function placeStock(r, sk, b, P, tempo) {
    const blk = sk.block;
    const info = LAY.info.get(blk) || null;
    // своей ноши этого семейства нет (рама за спиной): поддон крана того же материала стал готов в досягаемости, пока
    // кладёт, — со следующего цикла рук берёт с него
    if (!r.entry && sk.share === 0 && sk.mode === 'lay' && info && info.mode === 'tied' && info.j !== r.jc && r.S) {
      r.jc = info.j;
      const c = stock.find(fam(blk.materialId), r.S, REACH, true);
      if (c && c.craneLeft > 0) { r.entry = c; r.j = -1; }
    }
    const e = r.entry;
    if (!e) return;
    // занят этой укладкой (подход и выкладка бывают дольше IDLE): не уходит
    e.idle = 0;
    const tied = info && info.mode === 'tied';
    // штук на поддон — по циклам рук (сведения о пачке здание пишет кадром позже — пока ничего не выложено, уточнять)
    if (!r.put && (!r.K || (tied && r.K !== Math.max(1, info.K)))) r.K = tied ? Math.max(1, info.K) : Math.max(1, sk.share);
    // выложено: доля K по ходу выкладки (с походом к поддону крана — свою половину, остальное принесёт)
    const Kd = r.fetch ? Math.max(0, r.K - r.fetch.n) : r.K;
    if (sk.share > 0 && !r.fetchPut) {
      const want = Math.min(Kd, Math.floor(Kd * sk.put / sk.share + 1e-6));
      if (want > r.put) { stock.put(e, want - r.put); r.put = want; }
    }
    if (sk.mode !== 'lay') return;
    if (tied) {
      // цикл j: верхняя штука — точка для левой (до хвата), когда левая сжала пачку (PHASE.take) — взята
      if (info.j !== r.j) { r.j = info.j; r.hasGrab = !!stock.top(e, r.grab); r.took = false; }
      if (!r.took && info.c >= PHASE.take) {
        r.took = true;
        // последний цикл — рука забирает и остаток выложенного под этот блок (часы рук укоротились после выкладки:
        // подъём подмостей, поход — циклов стало меньше, чем штук выложено), а не тает без руки после укладки
        let n = info.j >= info.K - 1 ? Math.max(1, r.put - r.taken) : 1;
        while (n-- > 0 && stock.take(e) >= 0) r.taken++;
      }
      sk.grab = r.hasGrab ? r.grab : null;
    } else {
      // рядами (×5): убыль по доле заливки
      const fill = (b.actionT + b.timer) > 0 ? b.actionT / (b.actionT + b.timer) : 1;
      const due = Math.min(r.put || r.K, Math.floor(fill * (r.put || r.K) + 1e-6));
      while (r.taken < due && stock.take(e) >= 0) r.taken++;
      // левая берёт с запаса и рядами (LAY.source)
      r.hasGrab = !!stock.top(e, r.grab);
      sk.grab = r.hasGrab ? r.grab : null;
    }
  }
  // Укладка кончилась (логика короче последнего цикла рук): выложенное под этот блок, но не взятое, — взято. Запас на
  // настиле — сразу долой (настил спрыгнут и сложат: корыто и стойка не висят в воздухе).
  function finishPlace(r) {
    const e = r.entry;
    if (e) {
      while (r.taken < r.put && e.units > 0 && stock.take(e) >= 0) r.taken++;
      if (e.deck && e.units <= 0 && !(e.fade > 0)) { e.fade = 1e-3; stock.moved(); }
    }
    r.entry = null; r.blk = null; r.noStock = false; r.fetch = null; r.fetchPut = false;
  }
  // После позы: вёдра висят отвесно (поворот кисти снят), качаются по ходу.
  function after(i, v) {
    const r = rec[i];
    if (!r || !r.bl.group.visible || r.bucketsDown) return;
    [r.bl.group, r.br.group].forEach(function (g) {
      if (!g.parent) return;
      g.parent.updateWorldMatrix(true, false);
      g.parent.matrixWorld.decompose(_v, _q, _f);
      _q2.setFromAxisAngle(Y, v.w.heading || 0);
      g.quaternion.copy(_q.invert().multiply(_q2));
    });
  }
  // Действие фазы для crew.js → actionOf: погрузка ('pick' — кирка у каменоломни, 'load' — по штуке), выкладка
  // ('drop'); null — как прежде.
  function action(i, b) {
    const r = rec[i];
    const sk = r && r.sk;
    if (!sk) return null;
    // идёт к ручкам стоящей тачки — шаг, руки свободны
    if (r.going) return 'fetch';
    // ×5 и ×20 — как прежде (кирка в карьере)
    if (b.phase === 'mine') return lastTempo >= 5 ? null : sk.stage === 'pick' ? 'pick' : 'load';
    if (b.phase === 'place' && sk.mode === 'drop') return 'drop';
    // поход к поддону крана: идёт — 'fetch' (руки свободны или охапка), берёт — 'load', кладёт — 'drop'
    if (b.phase === 'place' && sk.mode === 'fetch') return sk.stage === 'pick' ? 'load' : sk.stage === 'put' ? 'drop' : 'fetch';
    return null;
  }
  // Точка верхней штуки запаса для левой руки при кладке блока blk (ms-lay.js → LAY.source): null — с рамы.
  function grab(blk) {
    if (!blk || blk.owner < 0) return null;
    const r = rec[blk.owner];
    return r && r.sk && r.sk.block === blk && r.sk.grab ? r.sk.grab : null;
  }
  // Часы рук кладки после подхода и выкладки (ms-lay.js → layClock): с логики от начала укладки.
  function hold(blk) {
    if (!blk || blk.owner < 0) return 0;
    const r = rec[blk.owner];
    return r && r.sk && r.sk.block === blk ? r.sk.hold : 0;
  }
  // Каменщик скоро будет класть с поддона крана e: несёт или набирает ношу его семейства, и деталь — в досягаемости
  // похода от поддона (тот же ярус или ярус выше — с подмостей). Идёт к ней — клетка стойки известна (конец маршрута):
  // её ярус — ярус поддона, середина — в досягаемости похода.
  function expected(e) {
    if (!world) return false;
    // везли под кладку этой детали (cr-plan: ничья с опорой — первые в очереди стройки, её возьмут через 1–2 мин) — пока
    // не положена, ждём
    if (e.blockId !== null && e.blockId !== undefined) {
      const B = world.blocks[e.blockId] && world.blocks[e.blockId].id === e.blockId ? world.blocks[e.blockId] : null;
      if (B && !B.built && !(B.poured > 0 && B.owner < 0)) return true;
    }
    const near = function (blk) {
      if (!blk || fam(blk.materialId) !== e.fam) return false;
      const dy = blk.y * CELL - e.y;
      return dy > -0.6 && dy < CELL + 0.6 && Math.hypot((blk.x + 0.5) * CELL - e.x, (blk.z + 0.5) * CELL - e.z) <= FETCH_FAR + CELL * 0.5;
    };
    const bs = world.builders;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (!b || b.exited || b.trade === 'engineer') continue;
      const rt = b.routeId >= 0 && world.routes ? world.routes[b.routeId] : null, last = rt && rt.steps && rt.steps.length ? rt.steps[rt.steps.length - 1].cell : null;
      for (let k = 0; k < b.carry.length; k++) {
        const blk = b.carry[k];
        if (last && rt.targetId === blk.id) {
          if (fam(blk.materialId) === e.fam && Math.abs(last[1] * CELL - e.y) < 0.6 && Math.hypot((last[0] + 0.5) * CELL - e.x, (last[2] + 0.5) * CELL - e.z) <= FETCH_FAR + 0.5) return true;
        } else if (near(blk)) return true;
      }
      // в его плане (сходит к карьеру и понесёт)
      if (b.plan) for (let k = 0; k < b.plan.length; k++) if (near(b.plan[k])) return true;
      if (b.phase === 'mine' || (b.phase === 'walk' && b.walkPurpose === 'mine')) {
        for (let g = 0; g < b.mineQueue.length; g++) { const q = b.mineQueue[g]; for (let k = 0; k < q.blocks.length; k++) if (near(q.blocks[k])) return true; }
      }
    }
    return false;
  }
  // Поддоны крана за кадр (gdt — с игры). На ×1 (темп < 5) — убыль только руками: захват всегда, пока поддоны есть;
  // ненужный (с него не кладут и не ходят, никого не ждут — STALE_T с после готовности или последнего взятия; или
  // дольше CRANE_KEEP после готовности) — крану (site.recall: заберёт на склад). На ×5 и ×20 — захват
  // убыли (claim), пока с какого-то кладут, пока его ждут (каменщик несёт или набирает ношу того же семейства к детали
  // рядом — не дольше CRANE_WAIT после готовности) или кому-то не успеть до срока крана (после прежнего захвата); пока
  // захвачено — у остальных убыль по-крановому (по времени, CRANE_LIFE с на поддон), отставшим — чтобы опустели до срока
  // (не таяли с грузом). Никого не ждут и не берут — захвата нет, поддон убывает у крана (по укладке рядом и по времени).
  function craneStep(gdt) {
    const s = site();
    if (!s || !s.claim) return;
    const list = stock.list();
    let active = 0, late = false, wait = 0, any = false;
    for (let k = 0; k < list.length; k++) {
      const e = list[k];
      if (!e.crane) continue;
      e.active = false; e.wait = false; e.age += gdt; any = true;
      if (claimed) e.claimT = (e.claimT || 0) + gdt;
      // убыло (на ×1 — только руками): с этого мига снова ждёт
      if (e.useLeft === undefined || e.craneLeft < e.useLeft) e.useAge = e.age;
      e.useLeft = e.craneLeft;
    }
    for (let k = 0; k < rec.length; k++) {
      const r = rec[k];
      if (r && r.blk && r.entry && r.entry.crane) { r.entry.active = true; active++; }
      if (r && r.blk && r.fetch && r.fetch.e.crane && r.fetch.stage !== 'done') { r.fetch.e.active = true; active++; }
    }
    // ×1: только руками — захват всегда; ненужный — снять (кран: оседает и тает с грузом)
    if (lastTempo < 5) {
      if (any !== claimed || (any && !keepSet)) { s.claim(any, CRANE_REACH, CRANE_KEEP * 4); claimed = any; keepSet = any; }
      for (let k = 0; k < list.length; k++) {
        const e = list[k];
        if (!e.crane || e.active || e.recalled || !(e.craneLeft > 0)) continue;
        const idle = e.age - Math.max(e.readyAge || 0, e.useAge || 0);
        // ненужный — крану: заберёт на склад (нет такого у площадки — оседает и тает)
        if (e.age - (e.readyAge || 0) > CRANE_KEEP || (idle > STALE_T && !expected(e))) { e.recalled = true; if (s.recall) s.recall(e.crane); else if (s.expire) s.expire(e.crane); }
      }
      return;
    }
    if (keepSet) { s.claim(claimed, CRANE_REACH, 90); keepSet = false; }
    for (let k = 0; k < list.length; k++) {
      const e = list[k];
      if (!e.crane || e.active || !(e.craneLeft > 0)) continue;
      if (lastTempo < 20 && e.age - e.readyAge < CRANE_WAIT && expected(e)) { e.wait = true; wait++; continue; }
      // был под захватом (своя убыль крана стояла): кран без захвата убывает не медленнее total / CRANE_SLOW в с — успеет
      // ли до срока (не захваченный ни разу успевает всегда: его срок — по его же убыли)
      if (e.claimT > 0 && e.readyAge + CRANE_DUE - e.age < e.craneLeft * CRANE_SLOW / Math.max(1, e.total)) late = true;
    }
    const want = active > 0 || wait > 0 || late;
    if (want !== claimed) { s.claim(want, CRANE_REACH); claimed = want; }
    if (!claimed || !(gdt > 0)) return;
    for (let k = 0; k < list.length; k++) {
      const e = list[k];
      if (!e.crane || e.active || e.wait || !(e.craneLeft > 0)) continue;
      // пока захвачено, срок крана — 90 с после готовности (CRANE_DUE_C — с запасом)
      const rate = Math.max(e.total / CRANE_LIFE, e.craneLeft / Math.max(0.5, e.readyAge + CRANE_DUE_C - e.age));
      e.owe = (e.owe || 0) + gdt * rate;
      if (e.owe >= 0.05) { const left = s.consume(e.crane, e.owe); e.owe = 0; if (left >= 0) { e.craneLeft = left; stock.moved(); } }
    }
  }
  function frame(dt, tempo) {
    hookCrane();
    const gdt = dt * Math.max(1, tempo);
    // убыль и уход запаса — по часам игры (на ×5 пустые уходят быстрее); на ×20 свой запас не ведём (поддоны крана
    // остаются — убывают по-крановому)
    if (tempo >= 20) {
      rec.forEach(function (r) { if (r && r.entry) { r.entry = null; r.blk = null; r.noStock = false; } });
      if (stock.list().some(function (e) { return !e.crane || e.units > 0; })) stock.clear(true);
    } else stock.update(gdt);
    craneStep(gdt);
    stockView.update(stock);
  }
  function build(w) { clear(); world = w; }
  // носилки рабочего убраны (проверка движений); тачка стоит, где стояла
  function hideRec(r) { r.main.set(null); r.bl.set(null); r.br.set(null); r.place = null; r.trT = 1; }
  function dropRec(r) {
    [r.main, r.bl, r.br, r.barrow].forEach(function (c) { c.set(null); c.dispose(); });
    if (r.frame.parent) r.frame.parent.remove(r.frame);
    [r.main.group, r.bl.group, r.br.group].forEach(function (g) { if (g.parent) g.parent.remove(g); });
    group.remove(r.barrow.group);
    DYNAMIC.delete(r.barrow.group);
  }
  function clear() {
    world = null;
    haul.reset();
    stock.clear();
    stockView.clear();
    rec.forEach(function (r) { if (r) dropRec(r); });
    rec.length = 0;
    // сетки носилок — общие (sk-props.js): со сменой площадки — освободить
    disposeCarriers();
    if (unhook) { unhook(); unhook = null; }
    if (claimed) { const s = site(); if (s && s.claim) s.claim(false); claimed = false; }
    keepSet = false;
  }
  return { group: group, build: build, clear: clear, before: before, after: after, action: action, hold: hold, grab: grab, frame: frame, stock: stock, barrowRelease: barrowRelease,
    // для проверок (rv-skf.mjs): реквизит рабочего
    rec: function (i) { return rec[i] || null; },
    // тачки (crew.js → spread: другие рабочие не стоят и не идут сквозь корыто — ни стоящей, ни той, что катят; две
    // тачки — не друг в друге): { x, y, z, yaw, owner, held — катит }
    barrows: function (out) {
      out.length = 0;
      for (let k = 0; k < rec.length; k++) { const r = rec[k]; if (r && r.bs && r.barrow.group.visible) out.push({ x: r.bs.x, y: r.bs.y - BARROW.R, z: r.bs.z, yaw: r.bs.yaw, owner: k, held: !!(r.sk && r.sk.push) }); }
      return out;
    },
    state: function () { return { claimed: claimed, stock: stock.list().map(function (e) { return { id: e.id, kind: e.kind, fam: e.fam, units: e.units, crane: e.crane, left: e.craneLeft, x: Math.round(e.x * 100) / 100, y: e.y, z: Math.round(e.z * 100) / 100, deck: !!e.deck, active: !!e.active, wait: !!e.wait }; }),
      workers: rec.map(function (r) { return r && r.sk ? { kind: r.sk.kind, mode: r.sk.mode, stage: r.sk.stage, units: r.sk.units, push: r.sk.push, sling: r.sk.sling, back: r.sk.back, grab: !!r.sk.grab, noStock: !!r.noStock, misses: r.misses || 0, missAt: r.missAt || null,
        entry: r.entry ? (r.entry.crane ? 'crane' : r.entry.deck ? 'deck' : r.entry.kind) : null, start: r.startWhy || null, grounded: !!r.grounded, place: r.place, tr: Math.round(r.trT * 100) / 100, bk: r.bk, bkT: Math.round(r.bkT * 100) / 100,
        park: r.bpark ? !!r.bpark.ok : null, going: !!r.going, rest: !!r.restPk, fetch: r.fetch ? r.fetch.stage || 'план' : null, fetchWhy: r.fetchWhy || null, fetchDbg: r.fetchDbg || null, grabB: r.bs ? Math.round((r.bs.grab === undefined ? 1 : r.bs.grab) * 100) / 100 : null, craneD: r.craneD === undefined ? null : r.craneD } : null; }) }; } };
}
