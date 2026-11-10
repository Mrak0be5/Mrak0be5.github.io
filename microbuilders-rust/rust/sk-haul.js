// Переноска по материалу (без three.js — проверяется в node на логике оригинала). Чем рабочий носит ношу логики
// (b.carry, MB.carryLoad: кг, заполнение) и что с ней делает по фазам логики, в её темпе:
//   носилка — по семейству материала (families.js): кирпич — «коза» (лоток на древке) на правом плече; камень,
//             песчаник, гранит, мрамор — тачка; брус и доски — на плече; бетон — два ведра раствора (ходка
//             с одним блоком) или тачка с раствором; сталь, железо, бронза — лист на плече; стекло — рама-носилка
//             на ремне; самоцветы — ящик в руках. Ходка с подъёмом — в плане ходки есть деталь с y ≥ 2 (путь пойдёт
//             по лестнице лесов или на уступ: на логике уровней 2–7 прогноз без ложных, пропусков 1–3 из ~40):
//             тачка и вёдра — нет, ноша — за спиной (рама people.js, 'back'); коза — на плече и по лестнице;
//             брус, лист и рама со стеклом на лестнице и уступе — за спиной (sling). Пропуск прогноза — тачка
//             остаётся у подножия (park), ноша — за спину;
//   погрузка — фаза mine (b.actionT из b.actionT + b.timer): у каменоломни сначала кирка (если на неё есть
//             время), потом колотый камень в тачку по штуке; у штабеля — по штуке (кирпичи в козу, брус на плечо,
//             лист, стекло в раму, раствор в вёдра); в конце — подъём носилки (коза на плечо, руки на ручки);
//   выкладка — начало фазы place (доля DROP её времени): ноша этого блока — на поддон у места работы по штукам
//             (sk-stock.js), затем кладка с поддона (ms-lay.js — часы рук с задержкой hold, LAY.hold);
//   пустой   — после последней укладки ходки носилка пустая (тачку катит назад, коза на плече), в перерыве, на
//             обеде, у стола и во сне — убрана (тачка стоит, где оставлена).
// ×5 и ×20 — без подфаз: носилка наполняется и пустеет по долям, выкладка — сразу (оригинал так же сворачивает).
// Кинематика тачки (barrowStep) — точки и углы в метрах вида: колесо по земле ground(x, z), ручки — у кистей.

// носилка семейства (ходка без подъёма)
export const CARRIER = { brick: 'hod', stone: 'barrow', marble: 'barrow', concrete: 'buckets', wood: 'beam', metal: 'sheet', glass: 'stretcher', gem: 'crate' };
// сколько штук видно в носилке при полном заполнении (fill 1) и предел
// брус на плече — не больше двух (столбиком)
export const CAPACITY = { hod: 12, barrow: 8, buckets: 2, beam: 2, sheet: 3, stretcher: 3, crate: 1, back: 6 };
// доля времени укладки на выкладку ноши на поддон (×1): не меньше и не больше, с
export const DROP = { part: 0.22, min: 0.18, max: 0.7 };
// погрузка: кирка у каменоломни (если фаза mine не короче PICK_MIN с), доля на кирку; подъём носилки, с
const PICK_MIN = 0.7, PICK_PART = 0.4, LIFT_S = 0.3, GRAB_S = 0.45;

// Носилка ходки: семейство, сколько блоков, ходка с подъёмом.
export function carrierOf(fam, blocks, up) {
  let kind = CARRIER[fam] || 'back';
  if (fam === 'concrete' && blocks >= 2) kind = 'barrow';
  if (up && (kind === 'barrow' || kind === 'buckets')) kind = 'back';
  return kind;
}
// Видно штук в носилке kind при заполнении fill (n — блоков: не меньше штуки на блок).
export function unitsOf(kind, fill, n) {
  const cap = CAPACITY[kind] || 6;
  if (!n) return 0;
  if (kind === 'buckets' || kind === 'crate') return cap;
  return Math.max(Math.min(n, cap), Math.min(cap, Math.ceil(fill * cap - 1e-3)));
}
// Прогноз подъёма: в ходке (в руках и в очереди карьеров) есть деталь выше первого яруса.
export function tripUp(b) {
  for (let i = 0; i < b.carry.length; i++) if (b.carry[i].y >= 2) return true;
  for (let g = 0; g < b.mineQueue.length; g++) {
    const list = b.mineQueue[g].blocks;
    for (let i = 0; i < list.length; i++) if (list[i].y >= 2) return true;
  }
  return false;
}
// Шаг пути b.from → b.to: 'ladder' (по вертикали), 'step' (на уступ или с него), 'flat'.
export function segmentKind(b) {
  if (b.from[1] === b.to[1]) return 'flat';
  return b.from[0] === b.to[0] && b.from[2] === b.to[2] ? 'ladder' : 'step';
}
// Короткий шаг погрузки: сколько секунд вида, сколько циклов «взять — положить» для n штук.
export function loadPlan(T, tempo, quarry, n) {
  const real = T / Math.max(1, tempo);
  const pick = quarry && real >= PICK_MIN ? PICK_PART : 0;
  const lift = Math.min(0.3, LIFT_S / Math.max(real, 1e-3));
  const span = Math.max(0, 1 - pick - lift);
  const cycles = n > 0 ? Math.max(1, Math.min(n, Math.round(span * real / GRAB_S))) : 0;
  return { pick: pick, lift: lift, span: span, cycles: cycles, real: real };
}
// Ход погрузки к доле local фазы mine: стадия ('pick' кирка, 'load' по штуке, 'lift' подъём), фаза цикла c, сколько
// новых штук уже лежит (из n).
export function loadAt(plan, local, n, out) {
  out = out || {};
  out.c = 0; out.done = 0; out.stage = 'load';
  if (local < plan.pick) { out.stage = 'pick'; out.c = local / plan.pick; return out; }
  const u = plan.span > 0 ? (local - plan.pick) / plan.span : 1;
  if (u >= 1 || !plan.cycles) { out.stage = 'lift'; out.done = n; out.c = plan.lift > 0 ? Math.min(1, (local - plan.pick - plan.span) / plan.lift) : 1; return out; }
  const ph = u * plan.cycles, j = Math.floor(ph);
  out.c = ph - j;
  // штука ложится в фазе 0,6 цикла; в цикле — своя доля штук
  out.done = Math.min(n, Math.floor((j + (out.c >= 0.6 ? 1 : 0)) * n / plan.cycles + 1e-6));
  return out;
}
// Доля времени укладки на выкладку (×1); на ×5 и ×20 — сразу.
export function dropShare(T, tempo) {
  if (tempo >= 5 || !(T > 0)) return 0;
  const real = T / tempo;
  return Math.min(0.5, Math.max(DROP.min, Math.min(DROP.max, DROP.part * real)) / real);
}

// ---------- тачка ----------
// Размеры (м, оси тачки: начало — ось колеса, +z — вперёд, к колесу от ручек; y — вверх): колесо радиуса R, концы
// ручек — на z = −GRIP_Z, y = GRIP_Y при ровной тачке; ножки — на z = −LEG_Z, низ на y = −LEG_Y.
export const BARROW = { R: 0.2, GRIP_Z: 1.36, GRIP_Y: 0.2, LEG_Z: 0.78, LEG_Y: 0.2, HAND: 0.74, AHEAD: 0.34 };
// Наклон тачки на стоянке (опора на колесо и ножки): ось колеса на R над землёй, низ ножек на земле.
export const PARK_PITCH = Math.atan2(BARROW.R - BARROW.LEG_Y, BARROW.LEG_Z);
// Шаг тачки за кадр. s — состояние { x, y, z, yaw, pitch, wheel, park (0 — в руках, 1 — стоит) } (м, рад);
// P — стопы рабочего, yaw — его курс, push — катит (иначе ставит, где стоит); ground(x, z) — земля (м).
// Катит: концы ручек у кистей (впереди таза на AHEAD, на высоте HAND над стопами), колесо — впереди по курсу на
// земле, тачка — на ось колеса и ручки (тангаж); колесо крутится по пройденному пути. Ставит — опускает ручки
// до опоры на ножки (park → 1).
export const GRAB_T = 0.3;
// от колеса до ручек по горизонтали и от стоп до колеса (рабочий у ручек — колесо на BARROW_BACK впереди стоп)
export const BARROW_REACH = Math.sqrt(Math.max(0.5, BARROW.GRIP_Z * BARROW.GRIP_Z + BARROW.GRIP_Y * BARROW.GRIP_Y - 0.04));
export const BARROW_BACK = BARROW_REACH + BARROW.AHEAD;
export function barrowStep(s, P, yaw, push, ground, dt, snap) {
  const B = BARROW;
  const k = snap ? 1 : 1 - Math.exp(-dt * 10);
  s.park += ((push ? 0 : 1) - s.park) * (snap ? 1 : 1 - Math.exp(-dt * 6));
  if (push) {
    // Тачка жёсткая: ручки в кистях, колесо — впереди них по курсу самой тачки (он догоняет курс рабочего — тачка
    // поворачивается вокруг ручек), без отставания на ходу (рабочие оригинала ходят 4–8 м/с, на ×5 — впятеро быстрее:
    // при догоне колесо отставало, кисти уходили от ручек). Сама к рукам не катится: к ручкам стоящей тачки подходит
    // рабочий (sk-crew.js → v.barrowGo), взялся — она уже у рук; за GRAB_T поднимает ручки (тангаж со стоянки — на
    // высоту кистей), кисти на ручках с первого кадра.
    if (s.grab === undefined || s.parked) { s.grab = snap ? 1 : 0; s.parked = false; }
    s.grab = snap ? 1 : Math.min(1, s.grab + dt / GRAB_T);
    const ky = snap ? 1 : 1 - Math.exp(-dt * 14);
    let dy = yaw - s.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    s.yaw += dy * ky;
    const sy = Math.sin(yaw), cy = Math.cos(yaw), by = Math.sin(s.yaw), bc = Math.cos(s.yaw);
    const gx = P.x + sy * B.AHEAD, gz = P.z + cy * B.AHEAD, gy = P.y + B.HAND;
    // колесо — по курсу тачки впереди ручек: горизонталь ~ длина ручек (наклон пересчитывается ниже)
    const reach = BARROW_REACH;
    const wx = gx + by * reach, wz = gz + bc * reach;
    const wy = Math.max(P.y, ground(wx, wz)) + B.R;
    const prevX = s.x, prevZ = s.z;
    s.x = wx; s.z = wz;
    s.y = s.grab >= 1 ? wy : s.y + (wy - s.y) * (1 - Math.exp(-dt * 16));
    // тангаж: ручки (z = −GRIP_Z, y = GRIP_Y в осях тачки) — на высоте кистей
    const dist = Math.max(0.6, Math.hypot(gx - s.x, gz - s.z));
    const want = Math.atan2(gy - s.y, dist) - Math.atan2(B.GRIP_Y, B.GRIP_Z);
    s.pitch += (want - s.pitch) * (s.grab >= 1 ? 1 : 1 - Math.exp(-dt * 16));
    s.wheel += Math.hypot(s.x - prevX, s.z - prevZ) / B.R * (Math.cos(s.yaw) * (s.z - prevZ) + Math.sin(s.yaw) * (s.x - prevX) >= 0 ? 1 : -1);
  } else {
    // стоит: колесо — на земле, ножки — на земле (тангаж стоянки); снова взялся — подкатит к рукам
    if (s.park > 0.5) s.parked = true;
    const gy = ground(s.x, s.z) + B.R;
    s.y += (gy - s.y) * k;
    s.pitch += (PARK_PITCH - s.pitch) * k;
  }
  return s;
}
// Точки кистей на ручках (мир, м): левая и правая — концы ручек; out = [L, R] из { x, y, z }.
export function barrowGrips(s, out) {
  const B = BARROW, cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
  // конец ручки в осях тачки (±0,27 поперёк) → поворот по тангажу (вокруг оси колеса), курс
  const z = -B.GRIP_Z * cp - B.GRIP_Y * sp, y = -B.GRIP_Z * -sp + B.GRIP_Y * cp;
  const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? 0.27 : -0.27;
    const o = out[i];
    o.x = s.x + cy * x + sy * z; o.y = s.y + y; o.z = s.z - sy * x + cy * z;
  }
  return out;
}

// ---------- рабочие ----------
// носилки, которые есть и пустыми (в руках, на плече, на ремне, пустая рама за спиной); брус и лист без ноши — нет
const EMPTY_HELD = { hod: true, buckets: true, stretcher: true, crate: true, back: true };
// Состояние носилки рабочего по логике: createHaul(MB, familyOf) → { step(i, b, world, dt, tempo) → вид, view(i),
// reset() }. Вид рабочего (один объект на рабочего, пишется каждый кадр):
//   kind — носилка ('hod' | 'barrow' | 'buckets' | 'beam' | 'sheet' | 'stretcher' | 'crate' | 'back' | null),
//   fam, materialId — семейство и материал ноши (первого карьера ходки), units — штук в носилке, level — заполнение
//   0..1 (раствор в вёдрах и тачке), mode — 'load' (погрузка), 'carry' (с ношей), 'drop' (выкладка), 'lay' (кладёт
//   с запаса), 'empty' (носилка пустая в руках), 'stow' (в руках ничего), stage и c — подстадия ('pick', 'load',
//   'lift', 'drop') и фаза её цикла, sling — носилка за спиной (лестница, уступ), push — тачку катит (иначе тачка,
//   если есть, стоит), back — сколько блоков на раме за спиной (подъём, другие семейства смешанной ходки), hold —
//   с логики от начала укладки до кладки с поддона (выкладка; ms-lay.js — LAY.hold), share и put — сколько штук
//   этой укладки выкладывается на поддон и сколько уже выложено, block — блок укладки.
export function createHaul(MB, familyOf) {
  const views = [];
  const _load = { kg: 0, capacity: 0, fill: 0, overload: 1 };
  const _at = {};
  function view(i) {
    let v = views[i];
    if (!v) {
      v = views[i] = { kind: null, fam: '', materialId: '', units: 0, level: 0, mode: 'stow', stage: '', c: 0, sling: false, push: false,
        back: 0, hold: 0, put: 0, share: 0, block: null,
        // свои: ходка, прежняя фаза, укладка
        trip: null, phase: '', placeOf: null };
    }
    return v;
  }
  function famOf(id) { return familyOf(id); }
  // ходка: семейство и носилка — по первому карьеру; заполнение — по весу всей ходки (MB.carryWeight)
  function newTrip(b, world) {
    const groups = b.mineQueue;
    // первая в ходке — уже в руках (ходка посреди пути), иначе — первый карьер
    const first = b.carry[0] ? b.carry[0].materialId : groups[0] && groups[0].blocks[0] ? groups[0].blocks[0].materialId : '';
    const fam = first ? famOf(first) : '';
    let kg = 0, n = 0, same = 0;
    // блоки ходки (в руках и в очереди карьеров): по ним видно, что ходка новая, даже если её начало вид пропустил
    const ids = new Set();
    const add = function (x) { kg += MB.carryWeight ? MB.carryWeight(world.campaign, x.materialId) : 1; n++; if (famOf(x.materialId) === fam) same++; ids.add(x.id); };
    b.carry.forEach(add);
    groups.forEach(function (g) { g.blocks.forEach(add); });
    MB.carryLoad(b, world, _load);
    const cap = _load.capacity > 0 ? _load.capacity : 1;
    const up = tripUp(b);
    const kind = carrierOf(fam, same, up);
    return { fam: fam, materialId: first, kind: kind, up: up, blocks: n, same: same, fill: kg / cap, units: unitsOf(kind, kg / cap, same),
      loaded: 0, before: 0, gUnits: 0, gN: 0, group: null, plan: null, done: false, dropFrom: 0, dropN: 0, dropShare: 0, ids: ids };
  }
  // Ходка вида устарела: кадры логики прошли без вида (ход логики без кадров, долгая пауза вкладки) — конец прежней
  // ходки не видели, а у рабочего уже другие блоки. В карьере с пустыми руками — блоки карьера не из ходки; с ношей —
  // в руках не её блок.
  function stale(t, b) {
    if (!t || t.done) return true;
    if (b.carry.length) return !t.ids.has(b.carry[0].id);
    const g = b.mineQueue[0];
    return !!(g && g.blocks[0] && !t.ids.has(g.blocks[0].id));
  }
  // носилка следующей ходки (по дороге к карьеру): по первой группе очереди
  function nextKind(b) {
    const g = b.mineQueue[0];
    if (!g || !g.blocks[0]) return null;
    const fam = famOf(g.blocks[0].materialId);
    let same = 0;
    b.mineQueue.forEach(function (q) { q.blocks.forEach(function (x) { if (famOf(x.materialId) === fam) same++; }); });
    return carrierOf(fam, same, tripUp(b));
  }
  // hang — рабочий на лестнице лесов (кладёт с неё): ноша на теле, на поддон не выкладывает; arrive — с логики от
  // начала укладки до прихода к точке стойки (crew.js → v.arrive): до него идёт с ношей, выкладка — после
  function step(i, b, world, dt, tempo, hang, arrive) {
    const v = view(i);
    const phase = b.phase;
    const fast = tempo >= 5;
    const t0 = v.trip;
    // ушёл из карьера: группа погружена целиком
    if (t0 && v.phase === 'mine' && phase !== 'mine' && t0.group) t0.loaded = Math.max(t0.loaded, t0.before + t0.gUnits);
    v.c = 0; v.stage = ''; v.hold = 0; v.put = 0; v.share = 0; v.block = null; v.push = false; v.sling = false; v.cycles = 1;
    if (phase === 'mine' && b.mineQueue[0]) {
      // погрузка: первая остановка ходки — новая ходка (носилка, сколько штук)
      if (stale(v.trip, b)) v.trip = newTrip(b, world);
      const t = v.trip, g = b.mineQueue[0];
      if (t.group !== g) {
        // новая группа карьера: её доля штук ходки (другие семейства — на раму за спиной)
        t.group = g;
        const gf = famOf(g.blocks[0].materialId), mine = gf === t.fam;
        t.before = t.loaded;
        t.gUnits = mine ? Math.min(Math.max(1, Math.round(t.units * g.blocks.length / Math.max(1, t.same))), Math.max(0, t.units - t.loaded)) : 0;
        t.gN = mine ? t.gUnits : g.blocks.length;
        t.plan = loadPlan(b.actionT + b.timer, tempo, gf === 'stone' || gf === 'marble', t.gN);
      }
      const T = b.actionT + b.timer, local = T > 0 ? Math.min(1, b.actionT / T) : 1;
      loadAt(t.plan, fast ? 1 : local, t.gN, _at);
      v.kind = t.kind; v.fam = t.fam; v.materialId = t.materialId;
      v.units = t.before + Math.min(t.gUnits, _at.done);
      t.loaded = v.units;
      v.mode = 'load'; v.stage = fast ? 'lift' : _at.stage; v.c = fast ? 1 : _at.c;
      v.level = levelOf(t, v.units);
      v.back = backCount(b, t);
    } else if (b.carry.length > 0) {
      // погрузку не видели (вид собран посреди ходки: загрузка сохранения, смена уровня) — ходка по ноше в руках
      if (stale(v.trip, b)) { v.trip = newTrip(b, world); v.trip.loaded = v.trip.units; }
      const t = v.trip;
      v.kind = t.kind; v.fam = t.fam; v.materialId = t.materialId;
      const seg = phase === 'walk' ? segmentKind(b) : 'flat';
      // тачка не идёт на лестницу и уступ (пропуск прогноза): остаётся, где стоит, ноша — за спину
      if (seg !== 'flat' && t.kind === 'barrow') { t.kind = v.kind = 'back'; t.loaded = 0; }
      v.back = backCount(b, t);
      // на лестнице и уступе руки нужны для перекладин и края: коза, брус, лист и рама — за спиной
      v.sling = seg !== 'flat' && (t.kind === 'hod' || t.kind === 'beam' || t.kind === 'sheet' || t.kind === 'stretcher');
      if (phase === 'place' && b.carry[0]) {
        const blk = b.carry[0];
        v.block = blk;
        const T = b.actionT + b.timer;
        if (v.placeOf !== blk) {
          // новая укладка: доля носилки этого блока — на поддон (на раме за спиной — кладёт прямо с рамы)
          v.placeOf = blk;
          const same = b.carry.filter(function (x) { return famOf(x.materialId) === t.fam; }).length;
          const mine = famOf(blk.materialId) === t.fam && t.kind !== 'back' && !hang;
          t.dropFrom = t.loaded;
          t.dropN = mine && t.loaded > 0 ? Math.max(1, Math.round(t.loaded / Math.max(1, same))) : 0;
          t.dropShare = t.dropN ? dropShare(T, tempo) : 0;
          t.noDropOf = null;
        }
        const local = T > 0 ? Math.min(1, b.actionT / T) : 1;
        // подход к точке стойки: до него — с ношей, выкладка — после (вместе не дольше 0,6 укладки — часы рук ms-lay.js)
        const a0 = fast || !(T > 0) ? 0 : Math.min(0.45, Math.max(0, (arrive || 0) / T));
        const share = t.dropShare > 0 ? Math.max(0.05, Math.min(t.dropShare, 0.6 - a0)) : 0;
        if (t.noDropOf === blk) {
          // без выкладки (некуда поставить запас): кладёт из носилки — убывает доля этого блока, не вся ноша
          const k = local > a0 ? Math.min(1, (local - a0) / Math.max(1e-3, 1 - a0)) : 0;
          v.units = Math.max(0, t.dropFrom - Math.floor(t.noDropN * k + 1e-6));
          v.share = 0; v.put = 0; v.hold = a0 * T;
          v.mode = local < a0 ? 'carry' : 'lay'; v.c = 1; v.stage = '';
          t.loaded = v.units;
        } else {
          const dropK = share > 0 ? Math.min(1, Math.max(0, (local - a0) / share)) : 1;
          const out = Math.min(t.dropN, Math.floor(t.dropN * dropK + 1e-6));
          v.units = Math.max(0, t.dropFrom - out);
          v.share = t.dropN; v.put = out;
          v.hold = share > 0 ? (a0 + share) * T : a0 * T;
          v.mode = local < a0 ? 'carry' : dropK < 1 ? 'drop' : 'lay';
          v.c = dropK; v.stage = v.mode === 'drop' ? 'drop' : '';
          // циклов рук на выкладку: по 0,42 с (выкладка 0,18–0,7 с — один-два), не больше трёх
          v.cycles = share > 0 ? Math.max(1, Math.min(3, Math.round(share * T / Math.max(1, tempo) / 0.42))) : 1;
          // тачку у места работы отпустил сразу (стоит у стойки — sk-crew.js), к точке стойки идёт без неё
          t.loaded = v.units;
        }
      } else {
        // с ношей: идёт (тачку катит по ровному) или ждёт (тачка стоит)
        v.placeOf = null;
        v.units = t.loaded;
        v.mode = 'carry';
        v.push = t.kind === 'barrow' && phase === 'walk';
      }
      v.level = levelOf(t, v.units);
    } else {
      // без ноши: к карьеру — носилка следующей ходки пустая, от места работы домой — своя пустая; у стола,
      // в перерыве, на обеде и во сне в руках ничего (тачка стоит, где оставлена)
      v.placeOf = null;
      if (v.trip && phase !== 'mine') v.trip.done = true;
      const purpose = phase === 'walk' ? b.walkPurpose : null;
      let kind = null;
      if (purpose === 'mine') kind = nextKind(b);
      else if (purpose === 'out' || purpose === 'route' || purpose === 'recover' || purpose === '') kind = v.kind;
      if (kind === 'barrow') { v.kind = 'barrow'; v.mode = 'empty'; v.push = true; }
      else if (kind && EMPTY_HELD[kind]) { v.kind = kind; v.mode = 'empty'; }
      else { v.kind = v.kind === 'barrow' ? 'barrow' : null; v.mode = 'stow'; }
      v.units = 0; v.level = 0; v.back = 0;
    }
    v.phase = phase;
    return v;
  }
  // заполнение раствором (вёдра, тачка с раствором): по доле штук ходки
  function levelOf(t, units) {
    if (!t || !t.units || units <= 0) return 0;
    return Math.min(1, Math.max(0.3, t.fill)) * Math.min(1, units / t.units);
  }
  // блоки на раме за спиной: подъём — вся ноша; смешанная ходка — другие семейства
  function backCount(b, t) {
    if (t.kind === 'back') return b.carry.length;
    let n = 0;
    for (let k = 0; k < b.carry.length; k++) if (famOf(b.carry[k].materialId) !== t.fam) n++;
    return n;
  }
  // Укладка без выкладки (у места работы некуда поставить запас: гребень стены, тесный проём): ноша остаётся в
  // носилке, кладёт из неё; вид v этого кадра — тоже.
  // Доля этого блока убывает из носилки по ходу кладки (в ходке из двух блоков на второй остаётся своё).
  function noDrop(i) {
    const v = views[i], t = v && v.trip;
    if (!t || !v.placeOf) return;
    t.noDropOf = v.placeOf; t.noDropN = t.dropN;
    t.dropN = 0; t.dropShare = 0; t.loaded = t.dropFrom;
    v.units = t.dropFrom; v.share = 0; v.put = 0; v.hold = 0; v.mode = v.mode === 'carry' ? 'carry' : 'lay'; v.c = 1; v.stage = '';
    v.level = levelOf(t, v.units);
  }
  return { step: step, noDrop: noDrop, view: function (i) { return views[i] || null; }, reset: function () { views.length = 0; } };
}
