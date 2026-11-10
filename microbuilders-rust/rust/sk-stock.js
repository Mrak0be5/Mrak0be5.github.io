// Запас у места работы (без three.js — проверяется в node): у детали, которую кладут (на земле, на настиле лесов,
// на перекрытии), — поддон её материала с пачками и корыто с раствором (кладка: кирпич, камень, мрамор), стопка
// бруса или листов на прокладках (дерево, сталь), корыто с раствором (бетон), стойка со стеклом (стекло). Рабочий
// выкладывает ношу на запас по штуке (put), кладёт из него по штуке (take — верхняя), пустой запас через IDLE с
// без дела уходит (fade) и убирается. Поддоны, которые поставил кран (site.js → cr-stock.js, события craneReady,
// craneUpdate, craneCleared), — тоже запас: свои штуки рабочий кладёт сверху поддона (extra) в пределах поддона
// крана 1,2 × 0,6 м (craneLayout), берёт сначала их, потом груз крана — долей его единицы на штуку (consume у
// site.js: единица крана — пачка 0,57 м, штука рабочего — три кирпича). Раскладка штук — layoutFor(e) (в осях
// запаса: начало — середина низа, +x — длинная сторона, y — вверх, м); рисует sk-props.js.
//
// createStock({ canStand(x, y, z) → можно ли стоять (пол яруса), consume(id, n) → взять у крана }) →
//   spot(fam, P, f, level) — место под новый запас у стоянки P (вектор взгляда f — к детали): слева от рабочего,
//                            иначе сзади, справа; на полу того же яруса, не ближе 0,7 м к другим запасам;
//   ensure(fam, materialId, P, f, owner) — запас в досягаемости (REACH от P) или новый у P; put(e, n), take(e),
//   top(e, out) — середина верхней штуки (мир, м; null — пусто), find(fam, P, r, crane), crane(event), update(dt),
//   clear(keepCrane), list() — запасы для рисования, version — растёт с каждой переменой.

// досягаемость: запас, к которому тянется рука каменщика от стоянки (м)
export const REACH = 1.25;
// пустой запас без дела, с — и уходит за FADE с (места укладки ходки — через 2–12 м: пустые поддоны не копятся)
export const IDLE = 3, FADE = 0.4;
// поддон под пачки: 1,0 × 0,8 × 0,14; прокладки стопок: две доски поперёк
export const PALLET = { w: 1.0, d: 0.8, h: 0.14 };
export const SLEEPER = { h: 0.08 };

// Раскладка запаса семейства: kind ('pallet' — на поддоне, 'heap' — кучей на земле, 'stack' — на прокладках, 'tub' — корыто, 'rack' —
// стойка со стеклом), cap — сколько штук помещается, unit — размер штуки [w, h, d], at(i) — середина штуки i
// (снизу вверх, ряд за рядом), base — высота опоры (поддона или прокладок), tub — корыто рядом.
const LAYOUTS = {};
// deck — запас на настиле подмостей (crew.js → подмости каменщика, настил 1,6 × 0,7 м): без поддона, компактно — у
// левого торца настила (place 'end': середина в along м от середины настила, ближний край — не ближе 0,27 м: рабочий
// стоит на −0,15…+0,04 м, полкорпуса 0,22), брус — вдоль заднего края (place 'back'). half — полуразмеры по x и z
// (оси запаса: x — вдоль настила), turn — повернуть на 90° (стойка стекла поперёк настила).
const DECK_HALF = 0.8;
export function layoutOf(fam, deck) {
  const key = deck ? 'deck:' + fam : fam;
  if (LAYOUTS[key]) return LAYOUTS[key];
  let L;
  if (deck) {
    const g = function (unit, nx, nz, layers, gap) {
      const sx = unit[0] + gap, sz = unit[2] + gap;
      return { cap: nx * nz * layers, unit: unit, base: 0, half: [(nx * sx - gap) / 2, (nz * sz - gap) / 2], at: function (i) {
        const per = nx * nz, layer = Math.floor(i / per), k = i % per;
        return [(k % nx - (nx - 1) / 2) * sx, (layer + 0.5) * unit[1], (Math.floor(k / nx) - (nz - 1) / 2) * sz];
      } };
    };
    if (fam === 'brick') L = Object.assign(g([0.25, 0.19, 0.12], 2, 3, 3, 0.012), { kind: 'heap', tub: false, place: 'end' });
    else if (fam === 'stone') L = Object.assign(g([0.34, 0.22, 0.2], 1, 2, 3, 0.03), { kind: 'heap', tub: false, place: 'end' });
    else if (fam === 'marble') L = Object.assign(g([0.42, 0.05, 0.3], 1, 1, 8, 0.02), { kind: 'heap', tub: false, place: 'end' });
    else if (fam === 'wood') L = Object.assign(g([1.5, 0.15, 0.15], 1, 1, 4, 0.02), { kind: 'heap', tub: false, place: 'back' });
    // листы на настиле — у торца, обрезками 0,5 × 0,6 (лист 1 × 0,5 вдоль заднего края свисал за настил и лежал под
    // пятками рабочего)
    else if (fam === 'metal') L = Object.assign(g([0.5, 0.012, 0.6], 1, 1, 12, 0.004), { kind: 'heap', tub: false, place: 'end' });
    // корыто на настиле — малое, 0,5 × 0,5 (большое 0,92 м свисало за торец и стояло под ногами)
    else if (fam === 'concrete') L = { kind: 'tub', tub: false, cap: 8, unit: [0.44, 0.02, 0.44], base: 0.03, half: [0.25, 0.25], tubSize: [0.25, 0.25, 0.2], place: 'end',
      at: function (i) { return [0, 0.05 + (i + 0.5) * 0.017, 0]; } };
    // стойка стекла на настиле — поперёк настила (turn), стёкла 0,5 × 0,8
    else if (fam === 'glass') L = { kind: 'rack', tub: false, cap: 6, unit: [0.5, 0.8, 0.008], base: 0.06, half: [0.28, 0.15], turn: true, place: 'end', rackW: 0.56,
      at: function (i) { return [0, 0.06 + 0.4, -0.04 + i * 0.025]; } };
    else L = Object.assign(g([0.3, 0.25, 0.3], 1, 1, 2, 0.02), { kind: 'heap', tub: false, place: 'end' });
    // у торца, ближним краем — в 0,27 м от середины настила (ближе — рабочий стоит на −0,15…+0,04 м, полкорпуса
    // 0,22; дальше — левая не достаёт), не за торцом (поперёк — повёрнутая стойка)
    const hx = L.turn ? L.half[1] : L.half[0];
    L.along = L.place === 'end' ? Math.min(DECK_HALF - hx - 0.02, 0.27 + hx) : 0;
    LAYOUTS[key] = L;
    return L;
  }
  // x0 — сдвиг рядов по x: штуки — на ближней к рабочему половине (−x запаса смотрит на него, sk-stock spot), левая
  // достаёт до последней (дальний край поддона 1,0 м — уже нет). bed — нижних слоёв, что лежат на поддоне всегда (поддон
  // кирпича высокий: штуки рабочего — сверху, на высоте пояса присевшего; с земли рука не доставала): bedAt(i), bed —
  // сколько их
  const grid = function (unit, nx, nz, layers, base, gap, x0, bed) {
    const sx = unit[0] + gap, sz = unit[2] + gap, ox = x0 || 0, W = (nx * sx - gap) / 2, nb = bed || 0, per = nx * nz;
    // ряд за рядом поперёк, слоями
    const pos = function (i, layer) { const k = i % per, ix = k % nx, iz = Math.floor(k / nx); return [ox + (ix - (nx - 1) / 2) * sx, base + (layer + 0.5) * unit[1], (iz - (nz - 1) / 2) * sz]; };
    return {
      cap: per * layers, unit: unit, base: base + nb * unit[1], bed: nb * per, half: [Math.max(Math.abs(ox - W), Math.abs(ox + W)), (nz * sz - gap) / 2],
      at: function (i) { return pos(i, Math.floor(i / per) + nb); },
      bedAt: function (i) { return pos(i, Math.floor(i / per)); },
    };
  };
  // кирпич — пачками в два ряда у ближнего края поддона (до 0,61 м от рабочего), поверх двух слоёв, что на поддоне
  if (fam === 'brick') L = Object.assign(grid([0.25, 0.19, 0.12], 2, 5, 3, PALLET.h, 0.012, -0.24, 2), { kind: 'pallet', tub: true });
  // колотый камень — кучей на земле (с тачки вываливают) поверх нижнего слоя кучи, рядом корыто с раствором
  else if (fam === 'stone') L = Object.assign(grid([0.34, 0.22, 0.2], 2, 3, 3, 0, 0.04, -0.12, 1), { kind: 'heap', tub: true });
  else if (fam === 'marble') L = Object.assign(grid([0.42, 0.05, 0.3], 1, 2, 10, PALLET.h, 0.02, -0.27, 6), { kind: 'pallet', tub: true });
  else if (fam === 'wood') L = Object.assign(grid([1.9, 0.15, 0.15], 1, 4, 4, SLEEPER.h, 0.02, 0, 2), { kind: 'stack', tub: false });
  else if (fam === 'metal') L = Object.assign(grid([1.0, 0.012, 0.5], 1, 1, 12, SLEEPER.h, 0.004, 0, 6), { kind: 'stack', tub: false });
  else if (fam === 'concrete') {
    // корыто 0,92 × 0,26 × 0,62 на козлах 0,38 м: штука — черпак раствора (уровень падает)
    L = { kind: 'tub', tub: false, cap: 8, unit: [0.84, 0.024, 0.54], base: 0.42, lift: 0.38, half: [0.46, 0.31], tubSize: [0.46, 0.31, 0.26], at: function (i) { return [0, 0.38 + 0.06 + (i + 0.5) * 0.024, 0]; } };
  } else if (fam === 'glass') {
    // стойка: стёкла 0,6 × 0,9 на ребре, наклон к раме
    L = { kind: 'rack', tub: false, cap: 6, unit: [0.6, 0.9, 0.008], base: 0.06, half: [0.35, 0.15], rackW: 0.7, at: function (i) { return [0, 0.06 + 0.45, -0.04 + i * 0.025]; } };
  } else L = Object.assign(grid([0.4, 0.3, 0.3], 2, 2, 1, PALLET.h, 0.04), { kind: 'pallet', tub: false });
  // поддон — во весь поддон 1,0 × 0,8
  if (L.kind === 'pallet') L.half = [PALLET.w / 2, PALLET.d / 2];
  LAYOUTS[fam] = L;
  return L;
}
// Свои штуки на поддоне крана (cr-cargo.js: поддон 1,2 × 0,6 м): сеткой в пределах поддона без свеса — по длине
// 1,16 м, по глубине depth (единица груза крана unit[2] + 0,04; два ряда — вдвое), штука — как на своём поддоне (брус и
// стекло — короче, по поддону), слоями; base 0 — от верха груза крана.
export const CRANE_PALLET = { w: 1.2, d: 0.6 };
export function craneLayout(fam, depth) {
  const D = Math.min(CRANE_PALLET.d, Math.max(0.3, depth || CRANE_PALLET.d)), key = 'crane:' + fam + ':' + Math.round(D * 100);
  if (LAYOUTS[key]) return LAYOUTS[key];
  const own = layoutOf(fam);
  let unit = own.unit.slice(), gap = 0.012;
  if (fam === 'wood') unit = [1.12, 0.15, 0.15];
  else if (fam === 'glass') unit = [0.56, 0.008, 0.42];
  else if (fam === 'concrete') unit = [0.28, 0.14, 0.28];
  else if (fam === 'stone') gap = 0.03;
  unit[0] = Math.min(unit[0], CRANE_PALLET.w - 0.04); unit[2] = Math.min(unit[2], D);
  const sx = unit[0] + gap, sz = unit[2] + gap;
  const nx = Math.max(1, Math.floor((CRANE_PALLET.w - 0.04 + gap) / sx)), nz = Math.max(1, Math.floor((D + gap) / sz));
  const L = { kind: 'crane', tub: false, cap: nx * nz * 4, unit: unit, base: 0, half: [CRANE_PALLET.w / 2, D / 2],
    at: function (i) {
      const per = nx * nz, layer = Math.floor(i / per), k = i % per;
      return [(k % nx - (nx - 1) / 2) * sx, (layer + 0.5) * unit[1], (Math.floor(k / nx) - (nz - 1) / 2) * sz];
    } };
  LAYOUTS[key] = L;
  return L;
}
// Раскладка запаса e: поддон крана, настил подмостей или пол.
export function layoutFor(e) { return e.crane || e.kind === 'crane' ? craneLayout(e.fam, e.cd) : layoutOf(e.fam, e.deck); }
// Доля единицы груза крана на одну свою штуку (по объёму: пачка кирпича на поддоне крана 0,57 × 0,146 × 0,56 — около
// восьми пачек по три кирпича).
function craneShare(fam, unit) {
  if (!unit || !(unit[0] * unit[1] * unit[2] > 0)) return 0.25;
  const u = layoutOf(fam).unit, own = fam === 'concrete' ? 0.28 * 0.14 * 0.28 : u[0] * u[1] * u[2];
  return Math.min(1, Math.max(0.1, own / (unit[0] * unit[1] * unit[2])));
}
// глубина своей раскладки на поддоне крана — по его единице (два ряда единиц — вдвое)
function craneDepth(unit) { return !unit ? CRANE_PALLET.d : Math.min(CRANE_PALLET.d, (unit[2] < 0.45 ? 2 * unit[2] : unit[2]) + 0.04); }

export function createStock(opts) {
  const o = opts || {};
  const canStand = o.canStand || function () { return true; };
  const entries = [];
  let seq = 0, version = 0;
  const api = { version: 0 };
  function bump() { api.version = ++version; }
  function sameLevel(e, y) { return Math.abs(e.y - y) < 0.6; }
  // ближайший запас семейства в радиусе r от точки P (тот же ярус); crane — только поддоны крана (true) или только
  // свой ('own': свои штуки на поддон крана не кладут — раствор, стекло)
  function find(fam, P, r, crane) {
    let best = null, bd = r;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.fam !== fam || e.fade > 0 || e.deck || !sameLevel(e, P.y) || (crane === true && !e.crane) || (crane === 'own' && e.kind === 'crane')) continue;
      const d = Math.hypot(e.x - P.x, e.z - P.z);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }
  // Место под новый запас у стоянки P: f — направление взгляда (к детали). Сначала слева (берёт левая; рука и поворот
  // таза достают только туда): слева, спереди-слева, сзади-слева — на 0,78–0,98 м, потом ближе с меньшим запасом по
  // краям; не нашлось слева — сзади, справа, сзади-справа (там поза взятия разворачивает к нему влево — хуже). На полу
  // того же яруса (canStand по углам запаса), не ближе 0,7 м к другим запасам и не перед рабочим (там деталь).
  const ANG = [[Math.PI / 2, Math.PI * 0.35, Math.PI * 0.72], [Math.PI, -Math.PI / 2, -Math.PI * 0.72]];
  // радиусы и запас по краям: 0,78 и 0,98 м — полный (0,45; стопка 0,5), 0,7 и 1,15 м — 0,3, вплотную 0,55 м — 0,22
  const RAD = [0.78, 0.98, 0.7, 1.15, 0.55];
  function spot(fam, P, f) {
    const fl = Math.hypot(f.x, f.z) || 1, fx = f.x / fl, fz = f.z / fl;
    const L = layoutOf(fam);
    for (let g = 0; g < ANG.length; g++) for (let r = 0; r < RAD.length; r++) {
      const rad = RAD[r], half = r < 2 ? (L.kind === 'stack' ? 0.5 : 0.45) : r < 4 ? 0.3 : 0.22;
      for (let k = 0; k < ANG[g].length; k++) {
        // поворот взгляда на угол: влево — (fz, −fx)… (как _l в people.js: лево при курсе h — (cos h, −sin h))
        const a = ANG[g][k], ca = Math.cos(a), sa = Math.sin(a);
        const dx = fx * ca + fz * sa, dz = fz * ca - fx * sa;
        const x = P.x + dx * rad, z = P.z + dz * rad;
        let ok = canStand(x, P.y, z);
        for (let q = 0; ok && q < 4; q++) ok = canStand(x + (q & 1 ? half : -half), P.y, z + (q & 2 ? half : -half));
        // пустые свои запасы не мешают — уходят (ниже); с грузом и поддоны крана — не ближе 0,7 м
        for (let i = 0; ok && i < entries.length; i++) { const e = entries[i]; if (e.fade === 0 && (e.units > 0 || e.crane) && sameLevel(e, P.y) && Math.hypot(e.x - x, e.z - z) < 0.7) ok = false; }
        if (!ok) continue;
        // (кроме занятых: ждут выкладки — idle держит sk-crew.js)
        for (let i = 0; i < entries.length; i++) { const e = entries[i]; if (e.fade === 0 && !e.crane && !e.deck && e.units <= 0 && e.idle > 0.5 && sameLevel(e, P.y) && Math.hypot(e.x - x, e.z - z) < 1.1) { e.fade = 1e-3; bump(); } }
        // поддон, куча, корыто, стойка: ось x запаса — от рабочего (ближняя половина — к нему, там штуки); стопка бруса
        // и листов — длинной стороной вдоль взгляда (вдоль ряда, поперёк к рабочему)
        const yaw = L.kind === 'stack' ? Math.atan2(fx, fz) + Math.PI / 2 : Math.atan2(-dz, dx);
        return { x: x, y: P.y, z: z, yaw: yaw };
      }
    }
    return null;
  }
  // P2 — запасная точка (где рабочий стоит сейчас), если у P места нет; own — не класть на поддон крана. Свой запас
  // рядом — снова свой, если в досягаемости левой (слева от взгляда f, не дальше 1,1 м) и не пуст; поддон крана — в REACH
  function ensure(fam, materialId, P, f, owner, P2, own) {
    let e = find(fam, P, REACH, own ? 'own' : false);
    if (e && !e.crane) {
      const fl = Math.hypot(f.x, f.z) || 1, lx = f.z / fl, lz = -f.x / fl, dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 1;
      if (!(e.units > 0 && d < 1.1 && (dx * lx + dz * lz) / d > 0.35)) e = null;
    }
    if (e) { e.idle = 0; return e; }
    const s = spot(fam, P, f) || (P2 ? spot(fam, P2, f) : null);
    if (!s) return null;
    return make(fam, materialId, s, owner, false);
  }
  function make(fam, materialId, s, owner, deck) {
    const L = layoutOf(fam, deck);
    const e = { id: 'sk-' + (++seq), kind: L.kind, fam: fam, materialId: materialId, x: s.x, y: s.y, z: s.z, yaw: s.yaw, units: 0, cap: L.cap,
      appear: 0, fade: 0, idle: 0, owner: owner === undefined ? -1 : owner, tub: !!L.tub, crane: null, craneLeft: 0, top: 0, mortar: L.tub ? 1 : 0, deck: !!deck };
    entries.push(e);
    bump();
    return e;
  }
  // Запас на настиле подмостей в точке s { x, y, z, yaw } (место выбирает бригада: торец или задний край настила);
  // стойка стекла — поперёк настила.
  function ensureAt(fam, materialId, s, owner) {
    const e = make(fam, materialId, s, owner, true);
    if (layoutOf(fam, true).turn) e.yaw += Math.PI / 2;
    return e;
  }
  // Запас сдвинут (настил поднимается с ним) — перерисовать.
  function moved() { bump(); }
  // выложить n штук (сверх места — не помещаются: штабель не выше слоёв раскладки)
  function put(e, n) {
    if (!e) return 0;
    const room = e.crane ? 99 : e.cap - e.units;
    const k = Math.max(0, Math.min(room, n === undefined ? 1 : n));
    if (k) { e.units += k; e.idle = 0; bump(); }
    return k;
  }
  // взять верхнюю штуку: свои (на поддоне крана — сверху: рабочий выложил ношу на поддон крана и кладёт из общей
  // кучи — у крана убывает его доля e.per на каждую штуку), затем крана — долей его единицы (e.per); → сколько
  // осталось (−1 — пусто)
  function take(e) {
    if (!e) return -1;
    e.idle = 0;
    if (e.units > 0) {
      e.units--;
      if (e.tub || e.kind === 'tub') e.mortar = Math.max(0.15, e.mortar - 0.04);
      if (e.crane && e.craneLeft > 0 && o.consume) { const left = o.consume(e.crane, e.per || 1); if (left >= 0) e.craneLeft = left; e.taken = (e.taken || 0) + 1; }
      bump();
      return e.units + e.craneLeft;
    }
    if (e.crane && e.craneLeft > 0 && o.consume) { const left = o.consume(e.crane, e.per || 1); e.craneLeft = Math.max(0, left); e.taken = (e.taken || 0) + 1; bump(); return e.craneLeft; }
    return -1;
  }
  // середина верхней штуки (мир): своя — по раскладке, у крана — его next
  function top(e, out) {
    if (!e) return null;
    out = out || {};
    if (e.units > 0) {
      const L = layoutFor(e), p = L.at(Math.min(e.units, L.cap) - 1);
      // на поддоне крана — поверх его груза (top — мир)
      const y0 = e.crane ? e.top - L.base : e.y;
      const c = Math.cos(e.yaw), s = Math.sin(e.yaw);
      out.x = e.x + p[0] * c + p[2] * s; out.y = y0 + p[1]; out.z = e.z - p[0] * s + p[2] * c;
      return out;
    }
    if (e.crane && e.craneLeft > 0 && e.next) { out.x = e.next[0]; out.y = e.next[1]; out.z = e.next[2]; return out; }
    return null;
  }
  // поддоны крана (site.js → onCrane): готов — запас; убывает — его остаток и верх; убран — долой (свои штуки
  // сверху — дождутся, пока их возьмут, и уйдут). cd — глубина своей раскладки, per — доля единицы крана на штуку,
  // total, age, readyAge — для убыли «по-крановому» (sk-crew.js).
  function crane(ev) {
    if (!ev || !ev.pallet) return;
    const p = ev.pallet;
    let e = null;
    for (let i = 0; i < entries.length; i++) if (entries[i].crane === p.id) e = entries[i];
    // убран: свои штуки (если остались) ложатся на пустой поддон и уходят вместе с ним (кран держит пустой 20 с)
    if (ev.type === 'craneCleared') { if (e) { e.crane = null; e.craneLeft = 0; e.next = null; e.top = e.y + 0.144; e.gone = 0; if (!e.units) e.fade = Math.max(e.fade, 1e-3); bump(); } return; }
    if (ev.type !== 'craneReady' && ev.type !== 'craneUpdate') return;
    if (!e) {
      const cd = craneDepth(p.unit);
      e = { id: 'sk-' + (++seq), kind: 'crane', fam: p.family, materialId: p.materialId, x: p.x, y: p.y, z: p.z, yaw: p.yaw, units: 0, cap: craneLayout(p.family, cd).cap,
        appear: 1, fade: 0, idle: 0, owner: p.mason === null || p.mason === undefined ? -1 : p.mason, tub: false, crane: p.id, craneLeft: p.left, top: p.top, next: p.next, mortar: 0,
        cd: cd, per: craneShare(p.family, p.unit), total: p.total || p.left, age: p.age || 0, readyAge: p.age || 0, taken: 0, blockId: p.blockId === undefined ? null : p.blockId };
      entries.push(e);
    } else { e.craneLeft = p.left; e.top = p.top; e.next = p.next; if (p.age !== undefined) e.age = p.age; }
    bump();
  }
  function update(dt) {
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.appear < 1) { e.appear = Math.min(1, e.appear + dt / 0.35); bump(); }
      const empty = e.units <= 0 && !(e.crane && e.craneLeft > 0);
      if (e.fade > 0) {
        e.fade += dt / FADE;
        bump();
        if (e.fade >= 1) entries.splice(i, 1);
        continue;
      }
      e.idle += dt;
      // пустой без дела — уходит; поддон крана без своих штук — его убирает кран (craneCleared); свои штуки на
      // убранном поддоне крана — с ним (через 20 с)
      if (empty && !e.crane && e.idle > IDLE) { e.fade = 1e-3; bump(); }
      else if (e.kind === 'crane' && !e.crane && (e.gone = (e.gone || 0) + dt) > 19.4) { e.fade = 1e-3; bump(); }
    }
  }
  // keepCrane — поддоны крана оставить (×20: свой запас не ведётся, а поддоны стоят и убывают дальше)
  function clear(keepCrane) {
    if (keepCrane) { for (let i = entries.length - 1; i >= 0; i--) { const e = entries[i]; if (e.crane) e.units = 0; else entries.splice(i, 1); } }
    else entries.length = 0;
    bump();
  }
  return Object.assign(api, { find: find, spot: spot, ensure: ensure, ensureAt: ensureAt, moved: moved, put: put, take: take, top: top, crane: crane, update: update, clear: clear,
    list: function () { return entries; } });
}
