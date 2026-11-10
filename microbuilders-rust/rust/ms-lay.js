// Кладка в такт рукам (без three.js — проверяется в node). Недостроенная деталь растёт не долей, а единицами своей
// кладки, и каждая единица появляется, когда рука каменщика её кладёт:
//   единицы — по швам фактуры семейства (textures.js, мировые координаты): кирпич ложковой перевязки 0,26 м
//             со сдвигом на полкирпича через ряд; тёсаный камень — ряды по 1/3 м, камни по хэшу рецепта ashlar,
//             у каждого лица стены свои (стена — две версты, лицевая и тыльная); брус — ряд 0,2 м целиком; лист
//             1 × 0,5 м вразбежку; щит опалубки 1 × 0,5 м; плита мрамора 1 × 1 м; плита перекрытия — полосы
//             по 0,25 м от рабочего;
//   порядок — ярусами (кирпич — 6 рядов, 0,44 м; камень — 3 ряда, 1 м; брус, лист, щит — по ряду) снизу вверх,
//             ярус — змейкой поперёк взгляда рабочего, ступенькой: верхний ряд яруса отстаёт от нижнего на полъединицы
//             (уступ, как ведут кладку от угла). Так пачка — короткий участок ступеньки у руки, а не два ряда во всю
//             стену, и рука за окно «положить» проходит меньше метра;
//   часы    — время укладки куба логики (b.actionT + b.timer, logic.js → builderPlaceSeconds) делится на K циклов
//             руки по 0,65–1 с (по семейству). Цикл: левая берёт из ноши или с поддона (LAY.source) и подносит
//             (0–LAY_A), правая тянет мастерком полосу раствора по постели пачки; в окне LAY_A–LAY_B единицы пачки
//             ложатся от руки одна за другой (единица i из n — в доле окна (i + 0,5) / n); потом подбивка ручкой
//             мастерка (у бруса и листа — молоток) и срезка лишнего раствора. Пауза — часы стоят; ×5 и ×20 (или
//             куб короче 0,45 с) — деталь растёт рядами по доле заливки, как оригинал, руки — в своём темпе.
// building.js строит единицы и пишет сведения о пачке (центр, постель, точка руки) в LAY.info; crew.js и people.js
// по ним ставят руки и ноги. Темп страницы приносит бригада (LAY.tempo), здание читает его кадром позже.
//
// Для других модулей (запас и переноска, звук, эффекты):
//   LAY.info.get(block)      — сведения о пачке блока, который сейчас кладут (block = builder.carry[0]); null — не кладут;
//   LAY.source = fn(builder, block, out) — подменить источник единиц: вернуть true и точку out = [x, y, z] (верх
//                              стопки на поддоне, мир, в досягаемости левой руки) — рука берёт оттуда; false/нет — из
//                              ноши на раме за спиной;
//   LAY.hold = fn(block)     — сколько секунд логики от начала укладки руки заняты другим (выкладка ноши на поддон):
//                              часы рук стоят, пачки не ложатся; остаток укладки делится на циклы (не больше 0,75 укладки);
//   LAY.listen(fn)           — события кладки fn(type, e): 'take' (рука взяла пачку: e.builder, e.block, e.count,
//                              e.source — 'frame' | 'pallet', e.at), 'unit' (единица легла: e.block, e.i, e.at — центр
//                              верха, e.b — её брусок [x0, y0, z0, x1, y1, z1], только чтение), 'pack' (пачка уложена:
//                              e.block, e.j, e.K); вернёт функцию отписки.

// окно цикла руки: до LAY_A — взять и поднести (в TAKE рука сжимает пачку), LAY_A–LAY_B — единицы ложатся от руки
export const TAKE = 0.05, LAY_A = 0.3, LAY_B = 0.74;
// фазы цикла (доли): левая у источника (src: с 0,9 цикла до 0,1 следующего — кисть успевает дойти и сжать пачку),
// полоса раствора мастерком по постели пачки, кладка от руки, подбивка ручкой мастерка (молотком — у бруса и листа),
// срезка выдавленного раствора вдоль лица
export const PHASE = { take: TAKE, src: [0.9, 0.1], bed: [0.06, 0.28], lay: [LAY_A, LAY_B], tap: [0.75, 0.82], trim: [0.8, 0.9] };
// рука идёт за серединой стольких единиц подряд (одна на ряд ступеньки — без зигзага по рядам)
export const HAND_SPAN = { brick: 6, stone: 6, wood: 1, metal: 2, concrete: 2, marble: 2, gem: 3, glass: 3 };
// цикл руки, с: кирпич лёгкий — чаще, брус и лист — тяжелее (кирпич 0,72 с: за цикл рука успевает к источнику и
// обратно, пачка — ~17 кирпичей на темпе логики L6–L8, путь руки за окно — участок ступеньки до ~1 м)
const CYCLE = { brick: 0.72, stone: 0.9, marble: 0.95, concrete: 0.9, wood: 1.0, metal: 0.9, gem: 0.85, glass: 0.85 };
// с какого времени укладки (с, по часам страницы) руки ведут пачки: от 0,45 с — один цикл (вся деталь — одна пачка; у
// земли подход к стойке — заранее, по пути, укладка — 0,4–1 с), от 0,9 с — два и больше (цикл не короче 0,45 с);
// короче — рядами
export const MIN_TIED = 0.45, MIN_TWO = 0.9;
// руки ждут (LAY.hold) не дольше этой доли укладки
const HOLD_MAX = 0.75;
// ярус кладки (м) и уступ его рядов (м на ряд, чуть больше полъединицы — верхняя ложится после обеих под ней):
// кирпич — 6 рядов (0,44 м, как ведут уступ у угла), камень — 3 ряда (1 м), брус, лист, щит — по ряду
const LIFT = { brick: 0.45, stone: 1.0, wood: 0.2, metal: 0.5, concrete: 0.5, marble: 1, gem: 0.5, glass: 0.5 };
const RACK = { brick: 0.14, stone: 0.3, wood: 0, metal: 0.52, concrete: 0.52, marble: 0.52, gem: 0.27, glass: 0.27 };

const listeners = [];
export const LAY = {
  tempo: 1,
  // блок логики → сведения о пачке (building.js → crew.js), пишутся каждый кадр
  info: new WeakMap(),
  // источник единиц (модуль запаса): fn(builder, block, out[3]) → true — с поддона в точке out
  source: null,
  // руки заняты до начала кладки (модуль запаса — выкладка ноши): fn(block) → секунды логики от начала укладки
  hold: null,
  // ящик детали и лицо, у которого встанет рабочий (здание, до укладки — подход заранее): fn(block, [x, z]) →
  // { box, xView, kind } | null
  preview: null,
  listen: function (fn) {
    listeners.push(fn);
    return function () { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  },
  emit: function (type, e) {
    for (let i = 0; i < listeners.length; i++) { try { listeners[i](type, e); } catch (err) { console.error(err); } }
  },
  listening: function () { return listeners.length > 0; },
};

// ---------- часы рук ----------
// Состояние укладки блока b (owner — рабочий логики в фазе place с ним в руках). Возвращает null, если укладки нет.
// mode 'tied' — пачками в такт рукам: K циклов, j — номер цикла, c — фаза цикла 0..1, w — доля окна «положить»
// пачки j (0..1), puts — пачек уложено целиком в этом мини-кубе, frac — доля детали, уложенная к этому мигу,
// cyc — длина цикла, с (по часам страницы); 'rows' — доля заливки (fill) непрерывно.
export function layClock(MB, world, b, family, out) {
  out = out || {};
  if (b.owner < 0 || !world.builders) return null;
  const builder = world.builders[b.owner];
  if (!builder || builder.phase !== 'place' || !builder.carry || builder.carry[0] !== b) return null;
  const total = MB.pourTotal(b);
  const per = builder.actionT + builder.timer;
  // пока руки выкладывают ношу (LAY.hold), часы стоят: кладка — в остаток укладки
  // (не больше HOLD_MAX укладки: поход к поддону крана — до 0,72, sk-crew.js FETCH_MAX; подъём подмостей оставляет
  // рукам ≥ 0,7 с — crew.js LAY.hold)
  const hold = LAY.hold ? Math.min(per * HOLD_MAX, Math.max(0, +LAY.hold(b) || 0)) : 0;
  const local = per > hold ? Math.min(1, Math.max(0, (builder.actionT - hold) / (per - hold))) : 0;
  const tempo = LAY.tempo > 0 ? LAY.tempo : 1;
  const real = (per - hold) / tempo;
  out.hold = hold;
  out.builder = builder;
  out.per = per;
  out.local = local;
  out.fill = Math.min(1, (b.poured + local) / total);
  out.total = total;
  out.poured = b.poured;
  if (tempo >= 5 || real < MIN_TIED) {
    out.mode = 'rows'; out.K = 0; out.j = 0; out.c = 0; out.w = 0; out.puts = 0; out.frac = out.fill; out.cyc = 0;
    return out;
  }
  const K = Math.max(real >= MIN_TWO ? 2 : 1, Math.round(real / (CYCLE[family] || 0.95)));
  const ph = local * K;
  const j = Math.min(K - 1, Math.floor(ph));
  out.mode = 'tied';
  out.K = K;
  out.j = j;
  out.c = Math.min(1, ph - j);
  out.w = Math.min(1, Math.max(0, (out.c - LAY_A) / (LAY_B - LAY_A)));
  out.puts = j + (out.w >= 1 ? 1 : 0);
  out.frac = Math.min(1, (b.poured + (j + out.w) / K) / total);
  out.cyc = real / K;
  return out;
}
// единиц уложено к доле frac и границы пачки j текущего мини-куба (доля в детали)
export function packRange(U, clock, j) {
  const a = (clock.poured + j / clock.K) / clock.total, b = (clock.poured + (j + 1) / clock.K) / clock.total;
  return [Math.floor(U * a + 1e-6), Math.floor(U * Math.min(1, b) + 1e-6)];
}
// единиц детали уложено к часам: пачки до j — целиком, пачка j — по одной от руки (единица i из n — в w = (i + 0,5) / n)
export function laidCount(U, clock) {
  const r = packRange(U, clock, clock.j), n = r[1] - r[0];
  return Math.min(U, r[0] + Math.min(n, Math.floor(n * clock.w + 0.5)));
}
// доля окна, в которой ложится единица i пачки из n
export function unitAt(i, n) { return (i + 0.5) / Math.max(1, n); }

// ---------- хэш рецептов (glsl.js, float32 как на видеокарте) ----------
const fr = Math.fround;
function fract(x) { return fr(x - Math.floor(x)); }
export function hash11(p) {
  p = fract(fr(fr(p) * fr(0.1031)));
  p = fr(p * fr(p + fr(33.33)));
  p = fr(p * fr(p + p));
  return fract(p);
}
export function hash12(x, y) {
  const k = fr(0.1031);
  let a = fract(fr(fr(x) * k)), b = fract(fr(fr(y) * k)), c = fract(fr(fr(x) * k));
  const d = fr(fr(fr(a * fr(b + fr(33.33))) + fr(b * fr(c + fr(33.33)))) + fr(c * fr(a + fr(33.33))));
  a = fr(a + d); b = fr(b + d); c = fr(c + d);
  return fract(fr(fr(a + b) * c));
}

// ---------- швы по длине ряда ----------
// Швы ряда row (номер ряда от земли) вдоль оси a в [a0, a1] у лица со знаком s (u фактуры = s·a/плитка):
// мировые координаты, по возрастанию.
function jointsOf(family, row, a0, a1, s) {
  const out = [];
  const grid = function (step, off) {
    for (let a = Math.ceil((a0 - off) / step - 1e-6) * step + off; a < a1 - 1e-6; a += step) if (a > a0 + 1e-6) out.push(a);
  };
  if (family === 'brick') grid(0.26, 0.13 * (row & 1));
  else if (family === 'metal') grid(1, 0.5 * (row & 1));
  else if (family === 'concrete' || family === 'marble') grid(1, 0);
  else if (family === 'stone') {
    // ashlar: в ряду n = 3–5 камней, сдвиг ряда, границы с разбросом (textures.js → RECIPES.ashlar)
    const n = 3 + Math.floor(hash11(row * 7.13 + 1.7) * 3);
    const off = hash11(row * 3.71 + 0.3);
    for (let k = 0; k < n; k++) {
      const jit = (hash12(row, k) - 0.5) * 0.4;
      const bx = (k + jit) / n;
      // x' = fract(u + off) = bx → u = bx − off (+ целое); u = s·a/2 → a = 2·s·u
      const u0 = bx - off;
      const m0 = Math.floor(Math.min(s * a0, s * a1) / 2 - u0) - 1, m1 = Math.ceil(Math.max(s * a0, s * a1) / 2 - u0) + 1;
      for (let m = m0; m <= m1; m++) {
        const a = 2 * s * (u0 + m);
        if (a > a0 + 1e-6 && a < a1 - 1e-6) out.push(a);
      }
    }
    out.sort(function (p, q) { return p - q; });
  } else grid(0.5, 0);
  return out;
}

// ---------- единицы детали ----------
// Единицы кладки детали клетки c: p — бруски детали (plan.js → pieceBoxes), y0 — низ клетки, course — высота ряда
// семейства, side — точка рабочего [x, z] (порядок — ярусами снизу вверх, ярус — змейкой поперёк взгляда на деталь,
// ступенькой). Плита — полосами. Единица: { k — ряд, b — брусок [x0, y0, z0, x1, y1, z1], run — номер пролёта
// (смежные единицы одного пролёта и ряда сливаются), lat — место поперёк взгляда }. Плиты — k = номер полосы.
export function layUnits(c, p, family, course, y0, side) {
  const units = [];
  const cx = (c.x + 0.5) * 2, cz = (c.z + 0.5) * 2;
  // поперёк взгляда рабочего: от его точки к центру клетки — вперёд, лево — поперёк
  let fx = cx - side[0], fz = cz - side[1];
  const fl = Math.hypot(fx, fz) || 1;
  fx /= fl; fz /= fl;
  // лево рабочего (как в people.js: _l = (cos h, 0, −sin h) при взгляде (sin h, 0, cos h))
  const lx = fz, lz = -fx;
  if (p.plate.length && !p.solid.length) {
    // плита: полосы по 0,25 м поперёк взгляда, от рабочего
    const alongX = Math.abs(fx) >= Math.abs(fz);
    let k = 0;
    const strips = [];
    p.plate.forEach(function (q) {
      if (q.ext) return;
      const b = q.b, a0 = alongX ? b[0] : b[2], a1 = alongX ? b[3] : b[5];
      for (let a = a0; a < a1 - 1e-4; a += 0.25) {
        const e = Math.min(a1, a + 0.25), bb = b.slice();
        if (alongX) { bb[0] = a; bb[3] = e; } else { bb[2] = a; bb[5] = e; }
        const mid = (a + e) / 2;
        strips.push({ b: bb, d: (alongX ? (mid - side[0]) * Math.sign(fx || 1) : (mid - side[1]) * Math.sign(fz || 1)), lat: 0 });
      }
    });
    strips.sort(function (s1, s2) { return s1.d - s2.d; });
    strips.forEach(function (s) { units.push({ k: k++, b: s.b, run: 0, lat: s.lat, plate: true }); });
    return units;
  }
  const n = Math.max(1, Math.round(2 / course));
  // лицо, у которого встанет рабочий (как crew.js → standFor и building.js → nearFace): по оси, где его клетка дальше
  // за краем ящика детали; широкий квадратный брусок (массив, толстая колонна) кладут рядами вдоль этого лица
  const B = [Infinity, Infinity, -Infinity, -Infinity];
  p.solid.forEach(function (q) { B[0] = Math.min(B[0], q.b[0]); B[1] = Math.min(B[1], q.b[2]); B[2] = Math.max(B[2], q.b[3]); B[3] = Math.max(B[3], q.b[5]); });
  const xView = Math.abs(side[0] - (B[0] + B[2]) / 2) - (B[2] - B[0]) / 2 >= Math.abs(side[1] - (B[1] + B[3]) / 2) - (B[3] - B[1]) / 2;
  // ярус: L рядов, верхний ряд яруса отстаёт от нижнего на rack (м) на ряд — ступенька
  const L = Math.max(1, Math.round((LIFT[family] || course) / course)), rack = RACK[family] || 0;
  for (let k0 = 0, lift = 0; k0 < n; k0 += L, lift++) {
    const list = [];
    for (let k = k0; k < Math.min(n, k0 + L); k++) courseUnits(list, p, family, course, y0, k, cx, cz, lx, lz, fx, fz, xView);
    // змейкой: чётные ярусы — слева направо, нечётные — обратно; версты одного места — рядом
    const dir = lift & 1 ? -1 : 1;
    list.sort(function (u1, u2) { return (dir * u1.lat + rack * (u1.k - k0)) - (dir * u2.lat + rack * (u2.k - k0)) || u1.k - u2.k || u1.leaf - u2.leaf; });
    for (let i = 0; i < list.length; i++) units.push(list[i]);
  }
  return units;
}
// единицы ряда k в список; lat — место вдоль своего бруска (пролёта): у стены поперёк взгляда — к левой руке
// рабочего, у стены, что уходит от него (видна с торца), — от рабочего вглубь (рука идёт вдоль ряда, а не стоит).
// Ряд — вдоль длинной стороны бруска; у широкого квадратного (массив 2 × 2 м) — вдоль лица, у которого стоит рабочий
// (xView — он смотрит вдоль x): единицы во всю глубину ложатся у его руки, ступенька идёт вбок, а не вглубь.
function courseUnits(list, p, family, course, y0, k, cx, cz, lx, lz, fx, fz, xView) {
  const yb = y0 + k * course, yt = y0 + (k + 1) * course;
  const row = Math.floor((yb + 1e-4) / course);
  p.solid.forEach(function (q, qi) {
    const b = q.b;
    const lo = Math.max(b[1], yb), hi = Math.min(b[4], yt);
    if (hi - lo < 1e-3) return;
    const dx = b[3] - b[0], dz = b[5] - b[2], deep = Math.min(dx, dz) > 0.7;
    const ax = deep && Math.abs(dx - dz) < 0.3 ? !xView : dx >= dz - 1e-6;
    // знак места вдоль бруска: по левой руке, а если брусок уходит от рабочего — вглубь
    const la = ax ? lx : lz, sl = Math.abs(la) >= 0.5 ? Math.sign(la) : Math.sign(ax ? fx : fz) || 1;
    // версты: камень — у каждого лица свои швы (две половины толщины), остальные — единицы во всю толщину; массив
    // (вглубь 2 м, дальнюю версту рука не достанет) — во всю толщину по швам ближнего к рабочему лица
    const leaves = family !== 'stone' ? [-1] : deep ? [(ax ? fz : fx) > 0 ? 0 : 1] : [0, 1];
    leaves.forEach(function (leaf) {
      const t0 = ax ? b[2] : b[0], t1 = ax ? b[5] : b[3], tc = (t0 + t1) / 2;
      const lt0 = leaf === 1 && !deep ? tc : t0, lt1 = leaf === 0 && !deep ? tc : t1;
      // знак u фактуры по лицу версты: вдоль x — лицо +z (u = x/2) или −z (u = −x/2); вдоль z — +x (u = −z/2), −x (u = z/2)
      const s = ax ? (leaf === 0 ? -1 : 1) : (leaf === 0 ? 1 : -1);
      const a0 = ax ? b[0] : b[2], a1 = ax ? b[3] : b[5];
      // брус — ряд пролёта целиком (стык брусьев в клетке один, у лиц — в разных местах)
      const cuts = family === 'wood' ? [] : jointsOf(family, row, a0, a1, leaf < 0 ? 1 : s);
      // слишком короткие куски (у торца) — к соседу
      const edges = [a0].concat(cuts.filter(function (a) { return a - a0 > 0.03 && a1 - a > 0.03; }), [a1]);
      for (let i = 0; i < edges.length - 1; i++) {
        const e0 = edges[i], e1 = edges[i + 1];
        const bb = ax ? [e0, lo, lt0, e1, hi, lt1] : [lt0, lo, e0, lt1, hi, e1];
        const mx = (bb[0] + bb[3]) / 2, mz = (bb[2] + bb[5]) / 2;
        list.push({ k: k, b: bb, run: qi * 2 + (leaf > 0 ? 1 : 0), lat: sl * (ax ? mx - cx : mz - cz), leaf: leaf });
      }
    });
  });
}

// Единицы [from, to) рядов от minK и выше — смежные одного ряда и пролёта сливаются (меньше граней; в ярусе
// единицы идут ступенькой вперемешку по рядам — сливаются по ряду). На выходе — бруски.
const _sel = [];
export function mergeUnits(units, from, to, minK) {
  const out = [];
  _sel.length = 0;
  for (let i = from; i < to; i++) if (!(units[i].k < (minK || 0))) _sel.push(units[i]);
  _sel.sort(function (p, q) { return p.k - q.k || p.run - q.run || (p.b[0] + p.b[2]) - (q.b[0] + q.b[2]); });
  let cur = null;
  for (let i = 0; i < _sel.length; i++) {
    const u = _sel[i];
    if (cur && cur.k === u.k && cur.run === u.run && !u.plate && touches(cur.b, u.b)) {
      for (let a = 0; a < 3; a++) { cur.b[a] = Math.min(cur.b[a], u.b[a]); cur.b[a + 3] = Math.max(cur.b[a + 3], u.b[a + 3]); }
      continue;
    }
    cur = { k: u.k, run: u.run, b: u.b.slice() };
    out.push(cur);
  }
  _sel.length = 0;
  return out;
}
function touches(a, b) {
  // общая грань по одной из осей, по остальным — те же пределы
  let face = 0;
  for (let i = 0; i < 3; i++) {
    const same = Math.abs(a[i] - b[i]) < 1e-5 && Math.abs(a[i + 3] - b[i + 3]) < 1e-5;
    const meet = Math.abs(a[i + 3] - b[i]) < 1e-5 || Math.abs(b[i + 3] - a[i]) < 1e-5;
    if (same) continue;
    if (meet) face++; else return false;
  }
  return face === 1;
}

// Сколько рядов уложено целиком, когда легли единицы [0, n) (для рамок и стоек: растут целыми рядами) — самый
// нижний ряд среди оставшихся (в ярусе единицы рядов идут вперемешку).
export function fullCourses(units, n) {
  let k = Infinity, top = -1;
  for (let i = 0; i < units.length; i++) {
    if (units[i].k > top) top = units[i].k;
    if (i >= n && units[i].k < k) k = units[i].k;
  }
  return k === Infinity ? top + 1 : k;
}

// Новый план той же детали (другой рабочий или другая сторона — grid ≥ 2, уровни с 19-го): первые n единиц прежнего
// плана уже лежат — они остаются первыми, остаток — в порядке нового плана (по новой стойке). Единицы те же, если
// швы не зависят от стороны (у камня массива — верста ближнего лица): нет — null (дальше по прежнему плану).
function unitKey(u) { const b = u.b; return Math.round(b[0] * 1e3) + ',' + Math.round(b[1] * 1e3) + ',' + Math.round(b[2] * 1e3) + ',' + Math.round(b[3] * 1e3) + ',' + Math.round(b[4] * 1e3) + ',' + Math.round(b[5] * 1e3); }
export function replan(old, n, fresh) {
  if (!old || !fresh || old.length !== fresh.length) return null;
  n = Math.max(0, Math.min(old.length, n));
  const laid = new Set();
  for (let i = 0; i < n; i++) laid.add(unitKey(old[i]));
  const out = old.slice(0, n);
  for (let i = 0; i < fresh.length; i++) if (!laid.has(unitKey(fresh[i]))) out.push(fresh[i]);
  return out.length === old.length ? out : null;
}

// Самый длинный камень ряда row рецепта ashlar: середина и длина в u фактуры (у лица +z: u = x/2) — камень в руке
// каменщика берёт фактуру одного камня, без шва поперёк (crew.js).
export function ashlarStone(row) {
  const n = 3 + Math.floor(hash11(row * 7.13 + 1.7) * 3), off = hash11(row * 3.71 + 0.3);
  let best = null;
  for (let k = 0; k < n; k++) {
    const b0 = (k + (hash12(row, k) - 0.5) * 0.4) / n, b1 = (k + 1 + (hash12(row, (k + 1) % n) - 0.5) * 0.4) / n;
    if (!best || b1 - b0 > best.w) best = { u: (b0 + b1) / 2 - off, w: b1 - b0 };
  }
  return best;
}
