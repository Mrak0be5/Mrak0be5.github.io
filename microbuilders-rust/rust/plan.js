// Детали здания по клеткам чертежа уровня — без three.js (проверяется в node: tools/runs/rust/plan-check.mjs).
// Клетка логики 2 м — одна деталь, как в Rust. Роль клетки — по готовому чертежу (все блоки уровня), слой за
// слоем снизу вверх:
//   mass   — нижний ряд (фундамент-цоколь) и стены в две клетки толщиной (полоса 2 × N над стеной): кладка
//            во всю клетку;
//   plate  — перекрытие: клетка, у которой заняты все 8 соседей слоя (и полоса 2 × N над пустотой), — плита
//            у верха клетки до оси соседних стен: сверху пол, снизу потолок; пока стены вокруг не встали —
//            на стойках опалубки. Башни и устои — полые: стены по краю, внутри перекрытие на каждом ярусе;
//   wall   — остальное: стена по оси клетки, связки — к соседям-стенам и массиву слоя (прямая, угол, тавр, крест);
//            стекло в клетке стены — окно в проёме, дверь — дверной проём; без соседей — колонна (pillar).
// Стена по оси клетки и плита у её верха — там, где логика ставит ноги рабочих (верх клетки).
// Каждая деталь видна отдельно, как панели Rust: у стены — рамка по краям клетки с обеих сторон и наличники
// проёмов, на углах и примыканиях — стойка, у фундамента — верхний пояс, у колонны — база и капитель.
// Уточнение по смыслу чертежа (refine, после ролей слоёв):
//   cut    — дверь, прорубленная по ходу стройки (additionalDoor) не в прямой стене поперёк хода: тонкий
//            портал поперёк хода и плита по верху клетки (по ней ходят), как у оригинала;
//   hatch  — люк: в перекрытии — плита с проёмом и стальной лестницей, в кладке — шахта с перекладинами;
//   зубцы  — одиночные кубы поверх стены (crenels) — мерлоны вдоль стены, а не колонны с капителью;
//   шест   — столб дерева или стали в 2+ клетки, прислонённый к фасаду (флагшток, мачта) — круглый шест;
//   ящик   — одиночный куб у фасада на массиве (ящики у пандуса) — блок, а не «плавник» стены;
//   навершие — одиночный куб на кровле или массиве — постамент с пирамидкой.
// Особые блоки вне кладки (logic.js: не сплошные) — featureBoxes: фонарь (стальной столбик, плафон, крышка)
// и вода (дно, бортики к соседям без воды, гладь; каскад — фонтан с чашей и струёй, слив с края русла).
export const CELL = 2;
export const WALL_T = 0.36;     // толщина стены, м
export const SLAB_T = 0.24;     // толщина перекрытия
export const TOP_GAP = 0.005;   // верх плиты чуть ниже верха стены: совпавшие грани не мерцают
export const WIN = { w: 1.1, h: 1.1, sill: 0.65 };   // окно: ширина, высота, низ от низа клетки
export const DOOR = { w: 1.1, h: 1.86 };             // дверной проём
export const CAP = { h: 0.07, over: 0.07 };          // слив по верху стены, где выше по чертежу ничего нет
export const TRIM = { w: 0.14, d: 0.04, lip: 0.22, lipD: 0.05 };   // рамка детали: ширина и вынос; пояс фундамента
// панорамное окно (art/features.js → buildWindow): стекло во всю клетку, рама 0,08 клетки по краю группы окон,
// 0,03 — между соседними окнами; ночью горит 2/3 (по клетке)
export const PANO = { frame: 0.16, joint: 0.06, prof: 0.045, bar: 0.04, transom: 0.7 };
// вода: дно, бортик (толщина, высота), уровень глади от низа клетки
export const WATER = { bottom: 0.2, rim: 0.24, rimH: 1.0, level: 0.76 };
// прорубленная дверь: полутолщина портала (плита по верху — толщиной перекрытия SLAB_T)
export const CUT = { half: 0.12 };
// направления соседей слоя: +x −x +z −z; грани бруска: +x −x +y −y +z −z
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const FACE_DIR = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const SIDE_FACE = [0, 1, 4, 5];
export const key3 = function (x, y, z) { return x + ',' + y + ',' + z; };

// cells: Map key3 → { x, y, z, solid } (solid — в клетке стоит стена или дверь). Ставит kind и links (стены).
export function classify(cells) {
  const at = function (x, y, z) { return cells.get(key3(x, y, z)); };
  const occ = function (x, y, z) { const c = at(x, y, z); return !!c && c.solid; };
  const layers = new Map();
  cells.forEach(function (c) {
    c.kind = null;
    if (!c.solid) return;
    if (!layers.has(c.y)) layers.set(c.y, []);
    layers.get(c.y).push(c);
  });
  Array.from(layers.keys()).sort(function (a, b) { return a - b; }).forEach(function (y) {
    const layer = layers.get(y);
    const in2x2 = function (c) {
      return [[1, 1], [1, -1], [-1, 1], [-1, -1]].some(function (s) { return occ(c.x + s[0], y, c.z) && occ(c.x, y, c.z + s[1]) && occ(c.x + s[0], y, c.z + s[1]); });
    };
    const inner = function (c) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if ((dx || dz) && !occ(c.x + dx, y, c.z + dz)) return false;
      return true;
    };
    if (y === 0) { layer.forEach(function (c) { c.kind = 'mass'; }); return; }
    // области слоя (4-связные): есть ли середина — тогда край области стена, иначе полоса 2 × N — плита
    // над пустотой или толстая стена над стеной
    const region = new Map();
    layer.forEach(function (c) {
      if (c.kind || region.has(c)) return;
      const r = { inner: false };
      const stack = [c];
      region.set(c, r);
      while (stack.length) {
        const q = stack.pop();
        if (inner(q)) r.inner = true;
        DIRS.forEach(function (d) {
          const n = at(q.x + d[0], y, q.z + d[1]);
          if (n && n.solid && !n.kind && !region.has(n)) { region.set(n, r); stack.push(n); }
        });
      }
    });
    layer.forEach(function (c) {
      if (inner(c)) c.kind = 'plate';
      else if (in2x2(c) && !region.get(c).inner) c.kind = occ(c.x, y - 1, c.z) ? 'mass' : 'plate';
      else c.kind = 'wall';
    });
    layer.forEach(function (c) {
      if (c.kind !== 'wall') return;
      c.links = DIRS.map(function (d) { const n = at(c.x + d[0], y, c.z + d[1]); return !!n && n.solid && (n.kind === 'wall' || n.kind === 'mass'); });
      if (!c.links.some(Boolean)) c.kind = 'pillar';
    });
  });
  refine(cells, at, occ);
}

// ---------- уточнение ролей ----------
// c.mat и c.family — у клеток здания (building.js); без них правила по материалу не срабатывают.
const LINKABLE = { wall: true, mass: true, cut: true, hatch: true };
const POLE_FAMILY = { wood: true, metal: true };
// портал прорубленной двери: поперёк хода по z (ход по x) — вдоль x
function cutAlongX(c) { const fx = c.door.faceX || 0, fz = c.door.faceZ || 0; return fz !== 0 || !fx; }
function linkCount(c) { return c.links ? c.links.filter(Boolean).length : 0; }
// стена-обрубок: одна связка, сосед по ней из другого материала (флагшток, ящик, зубец у башни)
function stubNeighbor(c, at) {
  if (c.kind !== 'wall' || linkCount(c) !== 1 || !c.mat) return null;
  const d = DIRS[c.links.indexOf(true)];
  const n = at(c.x + d[0], c.y, c.z + d[1]);
  return n && n.mat && n.mat !== c.mat ? n : null;
}
function refine(cells, at, occ) {
  const top = function (c) { return !occ(c.x, c.y + 1, c.z); };
  // прорубленные двери и люки (logic.js → convertEmergencyDoors, finishPassage): клетка стены или плиты
  cells.forEach(function (c) {
    c.pole = c.merlon = c.slit = c.finial = c.cross = false;
    if (!c.solid) return;
    if (c.hatch) { c.hatchBase = c.kind; c.kind = 'hatch'; return; }
    if (!c.door || !c.door.additionalDoor) return;
    // плита над пустотой: под ней и так проход — дверь ничего не меняет (портал поставил бы новые стенки)
    if (c.kind === 'plate') return;
    const fx = c.door.faceX || 0, fz = c.door.faceZ || 0;
    const L = c.links;
    const straightX = c.kind === 'wall' && !L[2] && !L[3], straightZ = c.kind === 'wall' && !L[0] && !L[1];
    // поперёк прямой стены — обычный дверной проём со створкой, иначе портал поперёк хода
    if (!((straightX && fz) || (straightZ && fx))) c.kind = 'cut';
  });
  // трубы до шестов: столб трубы шестом не станет
  const flue = new Set();
  chimneyCells(cells).forEach(function (c) {
    for (let y = c.y; y >= 0; y--) { const d = at(c.x, y, c.z); if (!d || !d.solid || d.kind !== 'pillar') break; flue.add(d); }
  });
  // шесты: прислонённые к фасаду столбы дерева или стали в 2+ клетки со свободным верхом
  const loose = function (c) { return !!c && c.solid && !flue.has(c) && (c.kind === 'pillar' || !!stubNeighbor(c, at)); };
  let poles = false;
  cells.forEach(function (c) {
    if (!loose(c) || !POLE_FAMILY[c.family]) return;
    const dn = at(c.x, c.y - 1, c.z);
    if (loose(dn) && dn.mat === c.mat) return;
    const run = [c];
    for (;;) {
      const u = at(c.x, c.y + run.length, c.z);
      if (!loose(u) || u.mat !== c.mat) break;
      run.push(u);
    }
    if (run.length < 2 || !top(run[run.length - 1])) return;
    run.forEach(function (q) { q.kind = 'pillar'; q.pole = true; q.links = null; });
    poles = true;
  });
  // ящики: одиночный куб у фасада поверх массива — блок
  cells.forEach(function (c) {
    if (!c.solid || !top(c) || !stubNeighbor(c, at)) return;
    const dn = at(c.x, c.y - 1, c.z);
    if (dn && dn.solid && dn.kind === 'mass') { c.kind = 'mass'; c.links = null; }
  });
  // связки после шестов (соседи шеста теряют связку с ним; без связок — колонна)
  if (poles) {
    cells.forEach(function (c) {
      if (!c.solid || c.kind !== 'wall') return;
      c.links = DIRS.map(function (d) { const n = at(c.x + d[0], c.y, c.z + d[1]); return !!n && n.solid && !!LINKABLE[n.kind]; });
      if (!c.links.some(Boolean)) c.kind = 'pillar';
    });
  }
  // крест на столбе (навершие фасада, L10 «Собор»): над столбом колонн в 3+ клетки — средник с двумя концами
  // перекладины по одной оси (у концов нет других связок и клеток над и под ними), над средником — одиночная
  // клетка или ничего. Рисуется брусьями сечения столба, а не панелями стены с зубцом наверху.
  cells.forEach(function (c) {
    if (!c.solid || c.kind !== 'wall' || linkCount(c) !== 2) return;
    const L = c.links, alongX = L[0] && L[1];
    if (!alongX && !(L[2] && L[3])) return;
    let n = 0;
    for (;;) { const d = at(c.x, c.y - 1 - n, c.z); if (!d || !d.solid || d.kind !== 'pillar' || d.pole) break; n++; }
    if (n < 3) return;
    const ends = (alongX ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]]).map(function (d) { return at(c.x + d[0], c.y, c.z + d[1]); });
    if (!ends.every(function (e) { return e.kind === 'wall' && linkCount(e) === 1 && top(e) && !occ(e.x, e.y - 1, e.z); })) return;
    const up = at(c.x, c.y + 1, c.z);
    const lone = function (q) { return DIRS.every(function (d) { return !occ(q.x + d[0], q.y, q.z + d[1]); }); };
    if (up && up.solid && !(top(up) && lone(up))) return;
    c.cross = 'hub'; c.crossX = alongX;
    ends.forEach(function (e, i) { e.cross = 'arm'; e.crossX = alongX; e.crossS = i === 0 ? 1 : -1; });
    if (up && up.solid) up.cross = 'top';
  });
  // зубцы: куб поверх стены со свободным верхом — одиночный или обрубок у башни (сосед идёт выше)
  const merlons = new Map();
  cells.forEach(function (c) {
    if (!c.solid || c.pole || c.cross || !top(c) || c.y === 0) return;
    const dn = at(c.x, c.y - 1, c.z);
    // под зубцом — сплошная стена (2+ связки), а не ступень или обрубок
    if (!dn || !dn.solid || dn.kind !== 'wall' || linkCount(dn) < 2) return;
    const nb = stubNeighbor(c, at);
    if (!(c.kind === 'pillar' || (nb && nb.kind === 'wall' && occ(nb.x, nb.y + 1, nb.z)))) return;
    c.kind = 'wall';
    c.links = dn.links.slice();
    c.merlon = true;
    merlons.set(c.y, (merlons.get(c.y) || 0) + 1);
  });
  // бойницы — у зубчатой стены (3+ зубца в слое)
  cells.forEach(function (c) { if (c.merlon && merlons.get(c.y) >= 3) c.slit = true; });
  // навершия: одиночный куб на кровле или массиве со свободным верхом
  cells.forEach(function (c) {
    if (!c.solid || c.kind !== 'pillar' || c.pole || !top(c)) return;
    const dn = at(c.x, c.y - 1, c.z);
    if (dn && dn.solid && (dn.kind === 'plate' || dn.kind === 'mass')) c.finial = true;
  });
}

// Трубы (дым, life.js): верх столба колонн в 2+ клетки со свободным верхом — самый высокий в здании или высокий
// (5+) — на широкой кровле (10+ клеток слоя под столбом: шпиль на маленьком навершии — не труба), не самоцвет,
// не шест и не навершие. Верхние клетки столбов.
export function chimneyCells(cells) {
  const at = function (x, y, z) { return cells.get(key3(x, y, z)); };
  let maxY = 0;
  cells.forEach(function (c) { if (c.solid) maxY = Math.max(maxY, c.y); });
  const list = [];
  cells.forEach(function (c) {
    if (!c.solid || c.kind !== 'pillar' || c.pole || c.finial || c.family === 'gem') return;
    const up = at(c.x, c.y + 1, c.z);
    if (up && up.solid) return;
    let n = 1;
    for (;;) { const d = at(c.x, c.y - n, c.z); if (!d || !d.solid || d.kind !== 'pillar') break; n++; }
    if (n < 2 || !(c.y === maxY || n >= 5)) return;
    const base = at(c.x, c.y - n, c.z);
    if (!base || !base.solid) return;
    // клетки слоя под столбом (4-связно, до 10)
    const seen = new Set([base]), stack = [base];
    while (stack.length && seen.size < 10) {
      const q = stack.pop();
      DIRS.forEach(function (d) { const m = at(q.x + d[0], q.y, q.z + d[1]); if (m && m.solid && !seen.has(m)) { seen.add(m); stack.push(m); } });
    }
    if (seen.size >= 10) list.push(c);
  });
  return list;
}

// Ночью горит примерно две трети окон: какие — по клетке, одни и те же каждую ночь (art/features.js → paneOf).
export function paneOf(b) {
  let k = Math.imul(b.x * 73856093 ^ b.y * 19349663 ^ b.z * 83492791, 0x9e3779b1) >>> 0;
  k ^= k >>> 15;
  return k % 3 ? 'lit' : 'dim';
}
// Панорамное окно — остекление во всю клетку прямой стены (art/features.js → buildWindow, panorama): рама во всю
// толщину стены материалом рамок по краю группы окон, между соседними окнами той же стороны — тонкий стальной
// импост; внутри — стальная рама вокруг стекла и переплёт (ригель на 0,7 высоты, под ним стойка). Снаружи по низу —
// отлив. Стекло — пока его не поставили, проём пустой.
function panorama(out, c, get, opts, w) {
  const g = c.glass, gfx = g.faceX || 0, gfz = g.faceZ || 0, alongX = w.alongX;
  const same = function (da, dy) {
    const n = get(c.x + (alongX ? da : 0), c.y + dy, c.z + (alongX ? 0 : da));
    return !!(n && n.solid && n.kind === 'wall' && n.glass && n.glass.style === 'panorama' && (n.glass.faceX || 0) === gfx && (n.glass.faceZ || 0) === gfz);
  };
  const jl = same(-1, 0), jr = same(1, 0), jd = same(0, -1), ju = same(0, 1);
  const F = PANO.frame, J = PANO.joint, fd = w.h + TRIM.d, P = PANO.prof;
  const put = function (list, s0, s1, b0, b1, d, skip) {
    if (s1 - s0 <= 1e-4 || b1 - b0 <= 1e-4) return;
    list.push({ b: alongX ? [s0, b0, w.cz - d, s1, b1, w.cz + d] : [w.cx - d, b0, s0, w.cx + d, b1, s1], skip: skip || [] });
  };
  const a0 = w.a0, a1 = w.a1, y0 = w.y0, y1 = w.y1;
  const lo = alongX ? 1 : 5, hi = alongX ? 0 : 4;
  // рама: стойки по краю группы во всю высоту, ригели между ними (у соседа по стороне — сквозь)
  if (!jl) put(out.trim, a0, a0 + F, y0, y1, fd, w.vskip.concat(w.loSkip));
  if (!jr) put(out.trim, a1 - F, a1, y0, y1, fd, w.vskip.concat(w.hiSkip));
  const r0 = jl ? a0 : a0 + F, r1 = jr ? a1 : a1 - F;
  const rs = [].concat(jl ? [lo] : [], jr ? [hi] : []);
  if (!jd) put(out.trim, r0, r1, y0, y0 + F, fd, w.vskip.filter(function (f) { return f === 3; }).concat(rs));
  if (!ju) put(out.trim, r0, r1, y1 - F, y1, fd, w.vskip.filter(function (f) { return f === 2; }).concat(rs));
  // импосты между соседними окнами: вертикальные — во всю высоту проёма, горизонтальные — между ними
  const oy0 = jd ? y0 : y0 + F, oy1 = ju ? y1 : y1 - F;
  if (jl) put(out.steel, a0, a0 + J, oy0, oy1, 0.07, [lo]);
  if (jr) put(out.steel, a1 - J, a1, oy0, oy1, 0.07, [hi]);
  const ox0 = jl ? a0 + J : a0 + F, ox1 = jr ? a1 - J : a1 - F;
  if (jd) put(out.steel, ox0, ox1, y0, y0 + J, 0.07, [3]);
  if (ju) put(out.steel, ox0, ox1, y1 - J, y1, 0.07, [2]);
  // отлив снаружи по низу группы
  if (!jd) {
    const s = alongX ? (gfz || 1) : (gfx || 1), q = (alongX ? w.cz : w.cx) + s * fd;
    const q0 = Math.min(q, q + s * 0.08), q1 = Math.max(q, q + s * 0.08), e0 = jl ? a0 : a0 + 0.03, e1 = jr ? a1 : a1 - 0.03;
    out.trim.push({ b: alongX ? [e0, y0 + F - 0.05, q0, e1, y0 + F, q1] : [q0, y0 + F - 0.05, e0, q1, y0 + F, e1], skip: [] });
  }
  if (!opts.glass(c)) return;
  const ay0 = jd ? y0 + J : y0 + F, ay1 = ju ? y1 - J : y1 - F;
  // грани встык (торцы вдоль стены A, верх и низ Y) — внутри соседних брусков, не нужны
  const A = alongX ? [0, 1] : [4, 5], Y = [2, 3];
  // стальная рама вокруг стекла
  put(out.steel, ox0, ox0 + P, ay0, ay1, 0.045, Y);
  put(out.steel, ox1 - P, ox1, ay0, ay1, 0.045, Y);
  put(out.steel, ox0 + P, ox1 - P, ay0, ay0 + P, 0.045, A);
  put(out.steel, ox0 + P, ox1 - P, ay1 - P, ay1, 0.045, A);
  // переплёт: ригель и стойка под ним
  const yt = ay0 + (ay1 - ay0) * PANO.transom, bw = PANO.bar / 2, ca = w.ca;
  put(out.steel, ox0 + P, ox1 - P, yt - bw, yt + bw, 0.035, A);
  put(out.steel, ca - bw, ca + bw, ay0 + P, yt - bw, 0.035, Y);
  put(out.glass, ox0 + P, ox1 - P, ay0 + P, ay1 - P, 0.006, A.concat(Y));
  out.glass[out.glass.length - 1].pane = paneOf(g);
}

// Стальная лестница в плоскости x (рельсы по x ± 0,22 у z): от y0 до y1, перекладины через 0,3 м.
function ladder(out, x, z, y0, y1) {
  [-0.22, 0.22].forEach(function (s) { out.steel.push({ b: [x + s - 0.025, y0, z - 0.025, x + s + 0.025, y1, z + 0.025], skip: [] }); });
  for (let y = y0 + 0.3; y < y1 - 0.05; y += 0.3) out.steel.push({ b: [x - 0.195, y, z - 0.015, x + 0.195, y + 0.03, z + 0.015], skip: [] });
}
// Пол под клеткой: верх ближайшей готовой детали внизу (у плиты — её верх), иначе земля.
function floorBelow(c, done) {
  for (let yy = c.y - 1; yy >= 0; yy--) {
    const n = done(0, yy - c.y, 0);
    if (n) return n.kind === 'plate' ? (yy + 1) * CELL - TOP_GAP : (yy + 1) * CELL;
  }
  return 0;
}

// Бруски детали клетки c: { b: [x0, y0, z0, x1, y1, z1], skip: [грани] }.
//   solid — в материале клетки, plate — плита перекрытия, trim — рамки, стойки, сливы, подоконники, пояса
//   (своим материалом, building.js; post — стойка угла, она же в контуре), steel и glass — рама и стекло окна,
//   leaf — полотно двери: { a, along, y, w, h, out } (петля по оси стены a, наружу — out);
//   rods — цилиндры { a, b, r, ri?, mat, cap? } (шест, кольца; mat: 'wood', 'steel', 'solid', 'trim'), pyr — пирамидки
//   { b, mat } (навершия, крышки), wood — доски (крышка люка). У стекла панорамного окна pane: 'lit' | 'dim'.
// get(x, y, z) — клетка чертежа; built(c) — деталь клетки готова (её грани у готовых соседей не нужны);
// opts.pillar(c) — сечение колонны, opts.glass(c) — стекло в окне поставлено.
export function pieceBoxes(c, get, built, opts) {
  const C = CELL, x0 = c.x * C, y0 = c.y * C, z0 = c.z * C, y1 = y0 + C;
  const cx = x0 + C / 2, cz = z0 + C / 2, h = WALL_T / 2;
  const out = { solid: [], plate: [], trim: [], steel: [], glass: [], leaf: null, rods: [], pyr: [], wood: [] };
  const done = function (dx, dy, dz) {
    const n = get(c.x + dx, c.y + dy, c.z + dz);
    return n && n.solid && built(n) ? n : null;
  };
  // полоса рамки на грани: axis — нормаль грани ('x' или 'z'), p — плоскость грани, s — наружу (±1);
  // s0..s1 — вдоль грани, b0..b1 — по высоте, d — вынос
  const tw = TRIM.w, td = TRIM.d;
  const strip = function (axis, p, s, s0, s1, b0, b1, d) {
    if (s1 - s0 <= 1e-4 || b1 - b0 <= 1e-4) return;
    const q0 = s > 0 ? p : p - d, q1 = s > 0 ? p + d : p;
    const back = axis === 'x' ? (s > 0 ? 1 : 0) : (s > 0 ? 5 : 4);
    out.trim.push({ b: axis === 'x' ? [q0, b0, s0, q1, b1, s1] : [s0, b0, q0, s1, b1, q1], skip: [back] });
  };
  // низ на земле и на массиве, верх под массивом не виден
  const below = done(0, -1, 0), above = done(0, 1, 0);
  const vskip = [];
  if (c.y === 0 || (below && below.kind === 'mass')) vskip.push(3);
  if (above && above.kind === 'mass') vskip.push(2);

  if (c.kind === 'mass') {
    const skip = [];
    FACE_DIR.forEach(function (d, f) { const n = done(d[0], d[1], d[2]); if (n && n.kind === 'mass') skip.push(f); });
    if (c.y === 0) skip.push(3);
    out.solid.push({ b: [x0, y0, z0, x0 + C, y1, z0 + C], skip: skip });
    // на открытых гранях (к пустой клетке): у фундамента — верхний пояс и швы между блоками, у толстой стены —
    // рамка панели. Полосы граней по x на внешнем углу продлены на вынос, во внутреннем — короче на вынос
    // (угол закрывает грань по z)
    const empty = function (dx, dz) { const n = get(c.x + dx, c.y, c.z + dz); return !(n && n.solid); };
    const massAt = function (dx, dz) { const n = get(c.x + dx, c.y, c.z + dz); return !!n && n.solid && n.kind === 'mass'; };
    const open = DIRS.map(function (d) { return empty(d[0], d[1]); });
    const base = c.y === 0, lip = base ? TRIM.lip : tw, ld = base ? TRIM.lipD : td;
    DIRS.forEach(function (d, i) {
      if (!open[i]) return;
      const axis = d[0] ? 'x' : 'z', s = d[0] || d[1];
      const p = d[0] ? (s > 0 ? x0 + C : x0) : (s > 0 ? z0 + C : z0);
      const s0 = d[0] ? z0 : x0, s1 = s0 + C;
      const lo = !d[0] ? 0 : open[3] ? 1 : massAt(d[0], -1) ? -1 : 0, hi = !d[0] ? 0 : open[2] ? 1 : massAt(d[0], 1) ? -1 : 0;
      strip(axis, p, s, s0 - lo * ld, s1 + hi * ld, y1 - lip, y1, ld);
      if (!base) strip(axis, p, s, s0 - lo * td, s1 + hi * td, y0, y0 + tw, td);
      const yb = base ? y0 : y0 + tw;
      strip(axis, p, s, s0 - lo * td, s0 + tw, yb, y1 - lip, td);
      strip(axis, p, s, s1 - tw, s1 + hi * td, yb, y1 - lip, td);
    });
    return out;
  }
  // слив: верх стены (колонны) последний по чертежу — без стены и массива над ней
  const up = get(c.x, c.y + 1, c.z);
  const capped = !(up && up.solid && (up.kind === 'wall' || up.kind === 'mass' || up.kind === 'pillar'));
  // слив выступает по бокам стены и на свободных торцах; к соседу по связке — встык (без перекрытия)
  const o = CAP.over;
  const cap = function (bx0, bz0, bx1, bz1) {
    if (capped) out.trim.push({ b: [bx0, y1, bz0, bx1, y1 + CAP.h, bz1], skip: [] });
  };
  if (c.kind === 'pillar' && c.pole) {
    // круглый шест (флагшток, мачта башенки): у земли — стальная обойма с пятой, наверху — шар-навершие
    const dn = get(c.x, c.y - 1, c.z), r = c.family === 'metal' ? 0.08 : 0.11;
    const foot = !(dn && dn.solid && dn.pole), head = !(up && up.solid && up.pole);
    const wood = c.family === 'wood';
    out.rods.push({ a: [cx, y0, cz], b: [cx, head ? y1 + 0.3 : y1, cz], r: r, mat: wood ? 'wood' : 'steel', cap: head });
    if (foot) {
      out.steel.push({ b: [cx - 0.24, y0, cz - 0.24, cx + 0.24, y0 + 0.04, cz + 0.24], skip: vskip.indexOf(3) >= 0 ? [3] : [] });
      out.rods.push({ a: [cx, y0 + 0.04, cz], b: [cx, y0 + 0.42, cz], r: r + 0.025, mat: 'steel', cap: true });
    }
    if (head) {
      out.rods.push({ a: [cx, y1 + 0.3, cz], b: [cx, y1 + 0.36, cz], r: r + 0.03, mat: 'steel', cap: true });
      out.rods.push({ a: [cx, y1 + 0.36, cz], b: [cx, y1 + 0.52, cz], r: 0.075, mat: 'steel', cap: true, ball: true });
    }
    return out;
  }
  if (c.cross) {
    // крест на столбе: брусья сечения столба. Средник — столб насквозь и перекладина до границ клетки к концам;
    // конец — брус до края клетки с поясом на торце; верх — брус с поясом под шапкой. Грани у готовых соседей
    // креста не нужны.
    const p = opts.pillar(c) / 2, ym = y0 + C / 2, X = c.crossX;
    const hid = function (dx, dy, dz) { const n = done(dx, dy, dz); return !!n && (!!n.cross || n.kind === 'pillar'); };
    // брусок вдоль оси перекладины: s0..s1 — вдоль, по высоте и поперёк — сечение столба у ym
    const beam = function (s0, s1, skip) { out.solid.push({ b: X ? [s0, ym - p, cz - p, s1, ym + p, cz + p] : [cx - p, ym - p, s0, cx + p, ym + p, s1], skip: skip }); };
    const lo = X ? 1 : 5, hi = X ? 0 : 4, a0 = X ? x0 : z0, ca = X ? cx : cz;
    const band = function (s0, s1) { out.trim.push({ b: X ? [s0, ym - p - 0.05, cz - p - 0.05, s1, ym + p + 0.05, cz + p + 0.05] : [cx - p - 0.05, ym - p - 0.05, s0, cx + p + 0.05, ym + p + 0.05, s1], skip: [] }); };
    if (c.cross === 'hub') {
      out.solid.push({ b: [cx - p, y0, cz - p, cx + p, y1, cz + p], skip: [].concat(hid(0, -1, 0) ? [3] : [], hid(0, 1, 0) ? [2] : []) });
      const e0 = X ? hid(-1, 0, 0) : hid(0, 0, -1), e1 = X ? hid(1, 0, 0) : hid(0, 0, 1);
      beam(a0, ca - p, [hi].concat(e0 ? [lo] : []));
      beam(ca + p, a0 + C, [lo].concat(e1 ? [hi] : []));
      return out;
    }
    if (c.cross === 'arm') {
      // конец перекладины: от средника (граница клетки) до края клетки без 0,25 м, пояс на торце
      const s = c.crossS, inner = s > 0 ? a0 : a0 + C, end = s > 0 ? a0 + C - 0.25 : a0 + 0.25;
      const inHid = X ? hid(-s, 0, 0) : hid(0, 0, -s);
      beam(Math.min(inner, end), Math.max(inner, end), inHid ? [s > 0 ? lo : hi] : []);
      band(s > 0 ? end - 0.16 : end, s > 0 ? end : end + 0.16);
      return out;
    }
    // верх креста: брус от средника вверх, пояс у верха и шапка тёсаного камня
    const t = y1 - 0.45;
    out.solid.push({ b: [cx - p, y0, cz - p, cx + p, t, cz + p], skip: hid(0, -1, 0) ? [3] : [] });
    out.trim.push({ b: [cx - p - 0.05, t - 0.16, cz - p - 0.05, cx + p + 0.05, t, cz + p + 0.05], skip: [] });
    out.trim.push({ b: [cx - p - 0.03, t, cz - p - 0.03, cx + p + 0.03, t + 0.06, cz + p + 0.03], skip: [3] });
    out.pyr.push({ b: [cx - p - 0.03, t + 0.06, cz - p - 0.03, cx + p + 0.03, t + 0.3, cz + p + 0.03], mat: 'trim' });
    return out;
  }
  if (c.kind === 'pillar' && c.finial) {
    // навершие: постамент кладки с цоколем и карнизом, сверху пирамидка тёсаного камня
    const p = 0.42;
    out.solid.push({ b: [cx - p, y0, cz - p, cx + p, y0 + 1.05, cz + p], skip: vskip.concat([2]) });
    out.trim.push({ b: [cx - p - 0.06, y0, cz - p - 0.06, cx + p + 0.06, y0 + 0.16, cz + p + 0.06], skip: [3] });
    out.trim.push({ b: [cx - p - 0.08, y0 + 1.05, cz - p - 0.08, cx + p + 0.08, y0 + 1.17, cz + p + 0.08], skip: [] });
    out.pyr.push({ b: [cx - p + 0.02, y0 + 1.17, cz - p + 0.02, cx + p - 0.02, y0 + 1.92, cz + p - 0.02], mat: 'trim' });
    return out;
  }
  if (c.kind === 'pillar') {
    const p = opts.pillar(c) / 2;
    // над столбом — колонна или средник креста: столб идёт дальше, без капители
    const dn = get(c.x, c.y - 1, c.z), head = !(up && up.solid && (up.kind === 'pillar' || up.cross === 'hub'));
    out.solid.push({ b: [cx - p, y0, cz - p, cx + p, y1, cz + p], skip: head ? vskip.concat([2]) : vskip });
    if (!(dn && dn.solid && dn.kind === 'pillar')) out.trim.push({ b: [cx - p - 0.06, y0, cz - p - 0.06, cx + p + 0.06, y0 + 0.14, cz + p + 0.06], skip: [3] });
    if (head) out.trim.push({ b: [cx - p - o, y1 - 0.1, cz - p - o, cx + p + o, y1, cz + p + o], skip: [] });
    cap(cx - p - o, cz - p - o, cx + p + o, cz + p + o);
    return out;
  }
  const hatchPlate = c.kind === 'hatch' && c.hatchBase === 'plate';
  if (c.kind === 'plate' || hatchPlate) {
    // до оси соседних стен (плита заходит в стену; заход — свой брусок, недостроенная плита растёт без него),
    // с готовыми соседями торцы не нужны. Две плиты, зашедшие в одну угловую стену, не перекрываются: заход
    // по z уступает половину клетки заходу по x соседней плиты
    const e = DIRS.map(function (d) { const n = get(c.x + d[0], c.y, c.z + d[1]); return n && n.solid && n.kind === 'wall' ? C / 2 : 0; });
    const plateAt = function (dx, dz) { const n = get(c.x + dx, c.y, c.z + dz); return !!n && n.solid && n.kind === 'plate'; };
    const skip = [];
    DIRS.forEach(function (d, i) { const n = done(d[0], 0, d[1]); if (e[i] > 0 || (n && n.kind !== 'pillar')) skip.push(SIDE_FACE[i]); });
    if (above && above.kind === 'mass') skip.push(2);
    const bottom = y1 - TOP_GAP - SLAB_T, top = y1 - TOP_GAP;
    if (!hatchPlate) out.plate.push({ b: [x0, bottom, z0, x0 + C, top, z0 + C], skip: skip });
    else {
      // люк: плита кольцом вокруг проёма 1,1 м, грани к проёму открыты
      const k = 0.55, sideOf = function (f) { return skip.filter(function (q) { return f.indexOf(q) >= 0; }); };
      out.plate.push({ b: [x0, bottom, z0, x0 + C, top, cz - k], skip: sideOf([0, 1, 2, 5]) });
      out.plate.push({ b: [x0, bottom, cz + k, x0 + C, top, z0 + C], skip: sideOf([0, 1, 2, 4]) });
      out.plate.push({ b: [x0, bottom, cz - k, cx - k, top, cz + k], skip: sideOf([1, 2]).concat([4, 5]) });
      out.plate.push({ b: [cx + k, bottom, cz - k, x0 + C, top, cz + k], skip: sideOf([0, 2]).concat([4, 5]) });
    }
    // угол комнаты: оба соседа по сторонам — стены, по диагонали — угловая стена; четверть её клетки между плечами
    // (0,82 × 0,82 м) не закрыта ни одним заходом — без вставки на кровле сквозная дыра в комнату. Вставка — до осей
    // плеч угла; грани к своим заходам и в стену не нужны, заходы к ней — тоже (кровля без шва)
    const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]].filter(function (s) {
      if (!e[s[0] > 0 ? 0 : 1] || !e[s[1] > 0 ? 2 : 3]) return false;
      const n = get(c.x + s[0], c.y, c.z + s[1]);
      return !!n && n.solid && n.kind === 'wall';
    });
    const toCorner = function (i) {
      const d = DIRS[i];
      return corners.filter(function (s) { return d[0] ? s[0] === d[0] : s[1] === d[1]; }).map(function (s) { return d[0] ? (s[1] > 0 ? 4 : 5) : (s[0] > 0 ? 0 : 1); });
    };
    // верх захода (вставки) не виден под массивом над его же клеткой, а не над плитой
    const massUp = function (dx, dz) { const n = done(dx, 1, dz); return n && n.kind === 'mass' ? [2] : []; };
    DIRS.forEach(function (d, i) {
      if (!e[i]) return;
      const inWall = done(d[0], 0, d[1]) ? [SIDE_FACE[i]] : [];
      const sk = [SIDE_FACE[i ^ 1]].concat(inWall, toCorner(i), massUp(d[0], d[1]));
      if (d[0]) {
        const a = d[0] > 0 ? x0 + C : x0 - C / 2;
        out.plate.push({ b: [a, bottom, z0, a + C / 2, top, z0 + C], skip: sk, ext: true });
      } else {
        const lo = plateAt(-1, d[1]) ? C / 2 : 0, hi = plateAt(1, d[1]) ? C / 2 : 0;
        const a = d[1] > 0 ? z0 + C : z0 - C / 2;
        out.plate.push({ b: [x0 + lo, bottom, a, x0 + C - hi, top, a + C / 2], skip: sk, ext: true });
      }
    });
    corners.forEach(function (s) {
      const qa = s[0] > 0 ? x0 + C : x0 - C / 2, qb = s[1] > 0 ? z0 + C : z0 - C / 2;
      const inner = [s[0] > 0 ? 1 : 0, s[1] > 0 ? 5 : 4], outer = done(s[0], 0, s[1]) ? [s[0] > 0 ? 0 : 1, s[1] > 0 ? 4 : 5] : [];
      out.plate.push({ b: [qa, bottom, qb, qa + C / 2, top, qb + C / 2], skip: inner.concat(outer, massUp(s[0], s[1])), ext: true });
    });
    // пока стены вокруг не встали — плита на стойках опалубки до ближайшей готовой опоры внизу
    const open = DIRS.some(function (d, i) { return e[i] > 0 && !done(d[0], 0, d[1]); });
    if (open) {
      let floor = 0;
      for (let yy = c.y - 1; yy >= 0; yy--) {
        const n = done(0, yy - c.y, 0);
        if (n) { floor = n.kind === 'plate' ? (yy + 1) * C - TOP_GAP : (yy + 1) * C; break; }
      }
      [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(function (q) {
        out.steel.push({ b: [cx + q[0] - 0.035, floor, cz + q[1] - 0.035, cx + q[0] + 0.035, bottom, cz + q[1] + 0.035], skip: [] });
      });
    }
    if (hatchPlate) {
      // стальной уголок по кромке проёма, лестница с пола внизу до поручней над плитой, откинутая крышка из досок
      const k = 0.55, e2 = 0.05;
      out.steel.push({ b: [cx - k - e2, top, cz - k - e2, cx + k + e2, top + 0.025, cz - k], skip: [3] });
      out.steel.push({ b: [cx - k - e2, top, cz + k, cx + k + e2, top + 0.025, cz + k + e2], skip: [3] });
      out.steel.push({ b: [cx - k - e2, top, cz - k, cx - k, top + 0.025, cz + k], skip: [3] });
      out.steel.push({ b: [cx + k, top, cz - k, cx + k + e2, top + 0.025, cz + k], skip: [3] });
      ladder(out, cx, cz - k + 0.09, floorBelow(c, done), top + 0.95, 'z');
      out.wood.push({ b: [cx - k, top + 0.025, cz + k + e2, cx + k, top + 1.12, cz + k + e2 + 0.05], skip: [] });
      out.steel.push({ b: [cx - 0.3, top + 0.5, cz + k + e2 + 0.05, cx + 0.3, top + 0.55, cz + k + e2 + 0.07], skip: [] });
    }
    return out;
  }
  if (c.kind === 'hatch') {
    // люк в кладке (art/features.js → buildHatch): шахта из материала клетки — стенки по краям клетки, перекладины
    // по стенке −z. Наружная грань стенки скрыта только у соседа встык во всю грань (массив, другая шахта); у стены
    // по оси клетки видна — короб шахты в рамке панелей, как детали Rust: пояса по верху и низу, стойки по углам
    const T = 0.28, hid = function (dx, dz) { const n = done(dx, 0, dz); return !!n && (n.kind === 'mass' || (n.kind === 'hatch' && n.hatchBase !== 'plate')); };
    const sk = function (outFace, dx, dz) { return vskip.concat(hid(dx, dz) ? [outFace] : []); };
    out.solid.push({ b: [x0, y0, z0, x0 + T, y1, z0 + C], skip: sk(1, -1, 0) });
    out.solid.push({ b: [x0 + C - T, y0, z0, x0 + C, y1, z0 + C], skip: sk(0, 1, 0) });
    out.solid.push({ b: [x0 + T, y0, z0, x0 + C - T, y1, z0 + T], skip: sk(5, 0, -1).concat([1, 0]) });
    out.solid.push({ b: [x0 + T, y0, z0 + C - T, x0 + C - T, y1, z0 + C], skip: sk(4, 0, 1).concat([1, 0]) });
    for (let y = y0 + 0.3; y < y1 - 0.1; y += 0.42) out.steel.push({ b: [cx - 0.42, y, z0 + T + 0.04, cx + 0.42, y + 0.05, z0 + T + 0.09], skip: [] });
    DIRS.forEach(function (d, i) {
      if (hid(d[0], d[1])) return;
      const axis = d[0] ? 'x' : 'z', s = d[0] || d[1];
      const p = d[0] ? (s > 0 ? x0 + C : x0) : (s > 0 ? z0 + C : z0);
      const s0 = d[0] ? z0 : x0, s1 = s0 + C;
      strip(axis, p, s, s0, s1, y1 - tw, y1, td);
      strip(axis, p, s, s0, s1, y0, y0 + tw, td);
      strip(axis, p, s, s0, s0 + tw, y0 + tw, y1 - tw, td);
      strip(axis, p, s, s1 - tw, s1, y0 + tw, y1 - tw, td);
    });
    // слив по верху всех четырёх стенок: по z — во всю ширину, по x — между ними
    cap(x0 - o, z0 - o, x0 + C + o, z0 + T + o);
    cap(x0 - o, z0 + C - T - o, x0 + C + o, z0 + C + o);
    cap(x0 - o, z0 + T + o, x0 + T + o, z0 + C - T - o);
    cap(x0 + C - T - o, z0 + T + o, x0 + C + o, z0 + C - T - o);
    return out;
  }
  if (c.kind === 'cut') {
    // прорубленная дверь (art/features.js → buildDoor, additionalDoor): тонкий портал поперёк хода из материала
    // клетки, плита по верху клетки (на ней стоят рабочие) — толщиной и на высоте перекрытия, встык с плитами
    // соседей; створка на петле
    const alongX = cutAlongX(c);
    const a0 = alongX ? x0 : z0, a1 = a0 + C, ca = a0 + C / 2, pc = alongX ? cz : cx, ph = CUT.half;
    const ow = DOOR.w / 2, sb = y1 - TOP_GAP - SLAB_T;
    const lo = alongX ? 1 : 5, hi = alongX ? 0 : 4;
    // торец косяка закрыт соседом по оси портала, только если тот встык во всю высоту: массив, шахта люка,
    // портал той же оси, стена с плечом к порталу (стена шире портала)
    const endHid = function (s) {
      const n = alongX ? done(s, 0, 0) : done(0, 0, s);
      if (!n) return false;
      if (n.kind === 'mass' || (n.kind === 'hatch' && n.hatchBase !== 'plate')) return true;
      if (n.kind === 'cut') return cutAlongX(n) === alongX;
      return n.kind === 'wall' && !n.cross && !!n.links && n.links[alongX ? (s > 0 ? 1 : 0) : (s > 0 ? 3 : 2)];
    };
    const jamb = function (s0, s1, b0, b1, skip) { out.solid.push({ b: alongX ? [s0, b0, pc - ph, s1, b1, pc + ph] : [pc - ph, b0, s0, pc + ph, b1, s1], skip: skip }); };
    const floor3 = vskip.filter(function (f) { return f === 3; });
    jamb(a0, ca - ow, y0, sb, floor3.concat(endHid(-1) ? [lo] : [], [2]));
    jamb(ca + ow, a1, y0, sb, floor3.concat(endHid(1) ? [hi] : [], [2]));
    // бок плиты закрыт соседом с плитой на той же высоте во всю сторону клетки (плита, портал, люк в плите) или
    // массивом; у стены (она по оси клетки) бок виден
    const skip = [];
    DIRS.forEach(function (d, i) {
      const n = done(d[0], 0, d[1]);
      if (n && (n.kind === 'mass' || n.kind === 'plate' || n.kind === 'cut' || (n.kind === 'hatch' && n.hatchBase === 'plate'))) skip.push(SIDE_FACE[i]);
    });
    if (above && above.kind === 'mass') skip.push(2);
    out.plate.push({ b: [x0, sb, z0, x0 + C, y1 - TOP_GAP, z0 + C], skip: skip });
    // наличник проёма с обеих сторон портала и порог
    const nAxis = alongX ? 'z' : 'x';
    [1, -1].forEach(function (s) {
      const p = pc + s * ph;
      strip(nAxis, p, s, ca - ow - tw, ca - ow, y0, sb, td);
      strip(nAxis, p, s, ca + ow, ca + ow + tw, y0, sb, td);
    });
    // порог: низ — на земле и массиве, иначе виден снизу (под порталом стена по оси или пусто)
    out.trim.push({ b: alongX ? [ca - ow, y0, pc - ph - 0.03, ca + ow, y0 + 0.035, pc + ph + 0.03] : [pc - ph - 0.03, y0, ca - ow, pc + ph + 0.03, y0 + 0.035, ca + ow], skip: floor3 });
    const fx = c.door.faceX || 0, fz = c.door.faceZ || 0;
    out.leaf = { a: ca - ow + 0.02, along: alongX ? 'x' : 'z', y: y0 + 0.035, w: 2 * ow - 0.04, h: sb - y0 - 0.07, c: pc, out: alongX ? (fz || 1) : (fx || 1) };
    return out;
  }
  // стена: торец к готовому соседу по связке не виден
  const L = c.links;
  const endHidden = function (i) {
    if (!L[i]) return false;
    const d = DIRS[i];
    const n = done(d[0], 0, d[1]);
    return !!n && (n.kind === 'wall' || n.kind === 'mass');
  };
  const straightX = !L[2] && !L[3], straightZ = !L[0] && !L[1];
  if (straightX || straightZ) {
    const alongX = straightX;
    const lo = alongX ? 1 : 5, hi = alongX ? 0 : 4;          // грани торцов −a и +a
    const a0 = alongX ? x0 : z0, a1 = a0 + C, ca = a0 + C / 2;
    const seg = function (s0, s1, b0, b1, skip) {
      out.solid.push({ b: alongX ? [s0, b0, cz - h, s1, b1, cz + h] : [cx - h, b0, s0, cx + h, b1, s1], skip: skip });
    };
    const loSkip = endHidden(alongX ? 1 : 3) ? [lo] : [], hiSkip = endHidden(alongX ? 0 : 2) ? [hi] : [];
    const opening = c.door ? 'door' : c.glass ? 'window' : null;
    const c0 = a0 - (L[alongX ? 1 : 3] ? 0 : o), c1 = a1 + (L[alongX ? 0 : 2] ? 0 : o);
    if (c.merlon) {
      // зубец: глухой блок кладки толще стены, у зубчатой стены — с бойницей; сверху слив. Торцы видны всегда
      // (зубец толще плеча соседней башни)
      const hw = h + 0.07;
      const mseg = function (s0, s1, b0, b1, skip) { out.solid.push({ b: alongX ? [s0, b0, cz - hw, s1, b1, cz + hw] : [cx - hw, b0, s0, cx + hw, b1, s1], skip: skip }); };
      if (alongX) cap(c0, cz - hw - o, c1, cz + hw + o); else cap(cx - hw - o, c0, cx + hw + o, c1);
      if (!c.slit) { mseg(a0, a1, y0, y1, vskip); return out; }
      const sw = 0.07, sb0 = y0 + 0.55, sb1 = y0 + 1.5;
      mseg(a0, ca - sw, y0, y1, vskip);
      mseg(ca + sw, a1, y0, y1, vskip);
      mseg(ca - sw, ca + sw, y0, sb0, vskip.filter(function (f) { return f === 3; }).concat([lo, hi]));
      mseg(ca - sw, ca + sw, sb1, y1, [lo, hi]);
      // тёсаный подоконник бойницы с обеих сторон
      out.trim.push({ b: alongX ? [ca - sw - 0.06, sb0 - 0.04, cz - hw - 0.04, ca + sw + 0.06, sb0 + 0.02, cz + hw + 0.04] : [cx - hw - 0.04, sb0 - 0.04, ca - sw - 0.06, cx + hw + 0.04, sb0 + 0.02, ca + sw + 0.06], skip: [] });
      return out;
    }
    if (alongX) cap(c0, cz - h - o, c1, cz + h + o); else cap(cx - h - o, c0, cx + h + o, c1);
    if (c.glass && !c.door && c.glass.style === 'panorama') {
      panorama(out, c, get, opts, { alongX: alongX, a0: a0, a1: a1, ca: ca, y0: y0, y1: y1, cx: cx, cz: cz, h: h, vskip: vskip, loSkip: loSkip, hiSkip: hiSkip });
      return out;
    }
    const ow = (opening === 'door' ? DOOR.w : WIN.w) / 2;
    // дверь у плиты своего яруса: плита заходит в стену до оси — верх проёма чуть ниже её низа (иначе в верху
    // проёма щель в нутро плиты, а створка режет потолок)
    const slabSide = function (s) {
      const n = alongX ? get(c.x, c.y, c.z + s) : get(c.x + s, c.y, c.z);
      return !!n && n.solid && (n.kind === 'plate' || (n.kind === 'hatch' && n.hatchBase === 'plate'));
    };
    const dh = opening === 'door' && (slabSide(1) || slabSide(-1)) ? Math.min(DOOR.h, C - TOP_GAP - SLAB_T - 0.01) : DOOR.h;
    const ob = opening === 'door' ? y0 : y0 + WIN.sill, ot = opening === 'door' ? y0 + dh : y0 + WIN.sill + WIN.h;
    // рамка панели с обеих сторон: верх, низ (под дверью — разрыв), торцы по границам клетки; наличник проёма
    const nAxis = alongX ? 'z' : 'x', pc = alongX ? cz : cx;
    [1, -1].forEach(function (s) {
      const p = pc + s * h;
      strip(nAxis, p, s, a0, a1, y1 - tw, y1, td);
      strip(nAxis, p, s, a0, a0 + tw, y0, y1 - tw, td);
      strip(nAxis, p, s, a1 - tw, a1, y0, y1 - tw, td);
      if (opening === 'door') {
        strip(nAxis, p, s, a0 + tw, ca - ow - tw, y0, y0 + tw, td);
        strip(nAxis, p, s, ca + ow + tw, a1 - tw, y0, y0 + tw, td);
        strip(nAxis, p, s, ca - ow - tw, ca - ow, y0, y1 - tw, td);
        strip(nAxis, p, s, ca + ow, ca + ow + tw, y0, y1 - tw, td);
        // над проёмом у плиты наличник ушёл бы в потолок и торчал из-под него светлой полоской
        if (y1 - tw - ot > 0.01 && !slabSide(s)) strip(nAxis, p, s, ca - ow, ca + ow, ot, y1 - tw, td);
      } else {
        strip(nAxis, p, s, a0 + tw, a1 - tw, y0, y0 + tw, td);
        if (opening === 'window') {
          strip(nAxis, p, s, ca - ow - tw, ca - ow, ob, ot, td);
          strip(nAxis, p, s, ca + ow, ca + ow + tw, ob, ot, td);
          strip(nAxis, p, s, ca - ow - tw, ca + ow + tw, ot, Math.min(ot + tw, y1 - tw), td);
        }
      }
    });
    if (!opening) { seg(a0, a1, y0, y1, vskip.concat(loSkip, hiSkip)); return out; }
    seg(a0, ca - ow, y0, y1, vskip.concat(loSkip));
    seg(ca + ow, a1, y0, y1, vskip.concat(hiSkip));
    seg(ca - ow, ca + ow, ot, y1, vskip.filter(function (f) { return f === 2; }).concat([lo, hi]));
    if (opening === 'window') {
      seg(ca - ow, ca + ow, y0, ob - 0.05, vskip.filter(function (f) { return f === 3; }).concat([lo, hi]));
      // подоконник — выступает за рамку по обе стороны стены, шире наличника
      const sw = ow + tw + 0.04, so = h + td + 0.03;
      out.trim.push({ b: alongX ? [ca - sw, ob - 0.05, cz - so, ca + sw, ob, cz + so] : [cx - so, ob - 0.05, ca - sw, cx + so, ob, ca + sw], skip: [] });
      if (opts.glass(c)) {
        const f = 0.05, t = 0.03;
        const bar = function (s0, s1, b0, b1) { out.steel.push({ b: alongX ? [s0, b0, cz - t, s1, b1, cz + t] : [cx - t, b0, s0, cx + t, b1, s1], skip: [] }); };
        // стойки, низ и верх рамы, импост и переплёт — встык, без перекрытий
        const mid = (ob + ot) / 2;
        bar(ca - ow, ca - ow + f, ob, ot); bar(ca + ow - f, ca + ow, ob, ot);
        bar(ca - ow + f, ca + ow - f, ob, ob + f); bar(ca - ow + f, ca + ow - f, ot - f, ot);
        bar(ca - 0.025, ca + 0.025, ob + f, ot - f);
        bar(ca - ow + f, ca - 0.025, mid - 0.025, mid + 0.025); bar(ca + 0.025, ca + ow - f, mid - 0.025, mid + 0.025);
        out.glass.push({ b: alongX ? [ca - ow + f, ob + f, cz - 0.006, ca + ow - f, ot - f, cz + 0.006] : [cx - 0.006, ob + f, ca - ow + f, cx + 0.006, ot - f, ca + ow - f], skip: [] });
      }
    } else {
      const fx = c.door.faceX || 0, fz = c.door.faceZ || 0;
      out.leaf = { a: ca - ow + 0.02, along: alongX ? 'x' : 'z', y: y0, w: 2 * ow - 0.04, h: dh - 0.03, c: alongX ? cz : cx, out: alongX ? (fz || 1) : (fx || 1) };
    }
    return out;
  }
  // угол, тавр, крест: стойка (шире стены на вынос рамки) и плечи к соседям
  const k = h + td;
  out.trim.push({ b: [cx - k, y0, cz - k, cx + k, y1, cz + k], skip: vskip, post: true });
  // слив вдоль x — через середину, плечи по z — встык к нему (без перекрытия: верх не мерцает)
  cap(L[1] ? x0 : cx - h - o, cz - h - o, L[0] ? x0 + C : cx + h + o, cz + h + o);
  if (L[2]) cap(cx - h - o, cz + h + o, cx + h + o, z0 + C);
  if (L[3]) cap(cx - h - o, z0, cx + h + o, cz - h - o);
  if (L[0]) out.solid.push({ b: [cx + k, y0, cz - h, x0 + C, y1, cz + h], skip: vskip.concat([1], endHidden(0) ? [0] : []) });
  if (L[1]) out.solid.push({ b: [x0, y0, cz - h, cx - k, y1, cz + h], skip: vskip.concat([0], endHidden(1) ? [1] : []) });
  if (L[2]) out.solid.push({ b: [cx - h, y0, cz + k, cx + h, y1, z0 + C], skip: vskip.concat([5], endHidden(2) ? [4] : []) });
  if (L[3]) out.solid.push({ b: [cx - h, y0, z0, cx + h, y1, cz - k], skip: vskip.concat([4], endHidden(3) ? [5] : []) });
  // рамки плеч с обеих сторон: верх и низ от стойки до границы клетки, торец на границе
  L.forEach(function (on, i) {
    if (!on || c.merlon) return;
    const d = DIRS[i], ax = d[0] !== 0, sg = d[0] || d[1];
    const nAxis = ax ? 'z' : 'x', pc = ax ? cz : cx;
    const r0 = sg > 0 ? (ax ? cx : cz) + k : (ax ? x0 : z0), r1 = sg > 0 ? (ax ? x0 : z0) + C : (ax ? cx : cz) - k;
    [1, -1].forEach(function (s) {
      const p = pc + s * h;
      strip(nAxis, p, s, r0, r1, y1 - tw, y1, td);
      strip(nAxis, p, s, r0, r1, y0, y0 + tw, td);
      if (sg > 0) strip(nAxis, p, s, r1 - tw, r1, y0 + tw, y1 - tw, td); else strip(nAxis, p, s, r0, r0 + tw, y0 + tw, y1 - tw, td);
    });
  });
  return out;
}

// ---------- особые блоки вне кладки ----------
// Клетка c с c.lamp или c.water (блок логики). Бруски (как у pieceBoxes): solid — в материале клетки, trim —
// материалом рамок, steel, glow — плафон фонаря; rods, pyr; water — глади { x0, z0, x1, z1, y } и диски
// { x, z, r, y }; falls — пелены, струи и пена: { quad: [4 точки], n }, цилиндр { a, b, r }, трубка по дуге
// { path: [точки], rs: [радиусы], seg }, пятно { disk: [x, y, z], r }; light — точка света фонаря.
export function featureBoxes(c, get, built) {
  const C = CELL, x0 = c.x * C, y0 = c.y * C, z0 = c.z * C, y1 = y0 + C;
  const cx = x0 + C / 2, cz = z0 + C / 2;
  const out = { solid: [], trim: [], steel: [], glow: [], rods: [], pyr: [], water: [], disks: [], falls: [], light: null };
  const dn = get(c.x, c.y - 1, c.z);
  const onPlate = !!(dn && dn.solid && built(dn) && dn.kind === 'plate');
  if (c.lamp) {
    // фонарь (art/features.js → buildLamp, ×2): стальная пята на болтах, столбик с кольцом, фонарь — плафон в
    // рамке из уголков, четырёхскатная крышка с шишечкой
    const y = onPlate ? y0 - TOP_GAP : y0;
    out.steel.push({ b: [cx - 0.22, y, cz - 0.22, cx + 0.22, y + 0.06, cz + 0.22], skip: [3] });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      out.rods.push({ a: [cx + q[0] * 0.16, y + 0.06, cz + q[1] * 0.16], b: [cx + q[0] * 0.16, y + 0.1, cz + q[1] * 0.16], r: 0.022, mat: 'steel', cap: true, seg: 6 });
    });
    out.rods.push({ a: [cx, y + 0.06, cz], b: [cx, y + 0.78, cz], r: 0.07, mat: 'steel' });
    out.rods.push({ a: [cx, y + 0.06, cz], b: [cx, y + 0.16, cz], r: 0.1, mat: 'steel', cap: true });
    out.rods.push({ a: [cx, y + 0.5, cz], b: [cx, y + 0.56, cz], r: 0.09, mat: 'steel', cap: true });
    out.steel.push({ b: [cx - 0.2, y + 0.76, cz - 0.2, cx + 0.2, y + 0.82, cz + 0.2], skip: [] });
    out.glow.push({ b: [cx - 0.15, y + 0.82, cz - 0.15, cx + 0.15, y + 1.22, cz + 0.15], skip: [2, 3] });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      out.steel.push({ b: [cx + q[0] * 0.16 - 0.022, y + 0.82, cz + q[1] * 0.16 - 0.022, cx + q[0] * 0.16 + 0.022, y + 1.22, cz + q[1] * 0.16 + 0.022], skip: [2, 3] });
    });
    out.steel.push({ b: [cx - 0.21, y + 1.22, cz - 0.21, cx + 0.21, y + 1.27, cz + 0.21], skip: [] });
    out.pyr.push({ b: [cx - 0.24, y + 1.27, cz - 0.24, cx + 0.24, y + 1.5, cz + 0.24], mat: 'steel' });
    out.rods.push({ a: [cx, y + 1.46, cz], b: [cx, y + 1.58, cz], r: 0.025, mat: 'steel', cap: true, seg: 6 });
    out.rods.push({ a: [cx, y + 1.58, cz], b: [cx, y + 1.66, cz], r: 0.045, mat: 'steel', cap: true, ball: true, seg: 8 });
    out.light = [cx, y + 1.02, cz];
    return out;
  }
  if (!c.water) return out;
  const W = WATER;
  const isWater = function (dx, dy, dz) { const n = get(c.x + dx, c.y + dy, c.z + dz); return !!(n && n.water); };
  const lvl = y0 + W.level;
  // фонтан каскада над водой: тумба из воды нижней клетки, чаша с бортиком, струя из сопла «зонтиком»; через губы
  // чаши — струи по параболе и капель в нижнюю воду, где они бьют — пятна пены
  if (c.water.style === 'cascade' && isWater(0, -1, 0)) {
    const low = y0 - C + W.level;
    out.rods.push({ a: [cx, y0 - C + W.bottom, cz], b: [cx, y0 + 0.3, cz], r: 0.17, mat: 'solid' });
    out.rods.push({ a: [cx, low - 0.05, cz], b: [cx, low + 0.12, cz], r: 0.24, mat: 'trim', cap: true });
    out.rods.push({ a: [cx, y0 + 0.2, cz], b: [cx, y0 + 0.34, cz], r: 0.3, mat: 'trim', cap: true });
    out.rods.push({ a: [cx, y0 + 0.34, cz], b: [cx, y0 + 0.44, cz], r: 0.78, mat: 'solid', cap: true });
    out.rods.push({ a: [cx, y0 + 0.44, cz], b: [cx, y0 + 0.56, cz], r: 0.8, ri: 0.7, mat: 'trim' });
    out.disks.push({ x: cx, z: cz, r: 0.7, y: y0 + 0.52 });
    out.rods.push({ a: [cx, y0 + 0.44, cz], b: [cx, y0 + 0.6, cz], r: 0.05, mat: 'steel', cap: true });
    // струя из сопла и «зонтик»: дуги падают обратно в чашу, где бьют — пена
    const top = y0 + 1.12, jit = function (i) { const v = Math.sin(c.x * 12.9 + c.z * 4.1 + i * 78.2) * 43758.5; return v - Math.floor(v); };
    out.falls.push({ a: [cx, y0 + 0.58, cz], b: [cx, top, cz], r: 0.03, cap: true, seg: 8 });
    for (let i = 0; i < 6; i++) {
      const th = (i + 0.4 * jit(i)) / 6 * Math.PI * 2, co = Math.cos(th), si = Math.sin(th), rr = 0.38 + 0.08 * jit(i + 7);
      const path = [], rs = [];
      for (let k = 0; k <= 5; k++) {
        const u = k / 5;
        path.push([cx + co * rr * u, top + 0.08 * u - (top + 0.08 - (y0 + 0.52)) * u * u, cz + si * rr * u]);
        rs.push(0.013 + 0.008 * u);
      }
      out.falls.push({ path: path, rs: rs, seg: 5 });
      out.falls.push({ disk: [cx + co * rr, y0 + 0.525, cz + si * rr], r: 0.05 + 0.02 * jit(i + 3) });
    }
    // через губы чаши — три неравные струи по параболе (вылет 0,2–0,3 м, к низу шире), между ними — редкая капель;
    // где бьют в нижнюю воду — пятна пены
    const lipY = y0 + 0.56, drop = lipY - low;
    [0, 2.2, 4.3, 1.2, 3.4].forEach(function (th0, i) {
      const lip = i < 3, th = th0 + 0.6 * jit(i + 11), co = Math.cos(th), si = Math.sin(th);
      const throw0 = lip ? 0.2 + 0.1 * jit(i + 13) : 0.05, r0 = 0.8;
      const P = function (u) { const r = r0 + throw0 * u; return [cx + co * r, lipY - drop * u * u, cz + si * r]; };
      if (lip) {
        const w0 = 0.07 + 0.03 * jit(i + 17);
        for (let k = 0; k < 6; k++) {
          const a = P(k / 6), b = P((k + 1) / 6), wa = w0 * (1 + 0.5 * k / 6), wb = w0 * (1 + 0.5 * (k + 1) / 6);
          // нормаль ленты — от оси чаши и вверх, поперёк касательной
          const tr = throw0 / 6, ty = a[1] - b[1], tl = Math.hypot(tr, ty) || 1;
          out.falls.push({ quad: [[a[0] - si * wa, a[1], a[2] + co * wa], [a[0] + si * wa, a[1], a[2] - co * wa], [b[0] + si * wb, b[1], b[2] - co * wb], [b[0] - si * wb, b[1], b[2] + co * wb]],
            n: [co * ty / tl, tr / tl, si * ty / tl] });
        }
        const e = P(1);
        out.falls.push({ disk: [e[0], low + 0.012, e[2]], r: 0.14 + 0.06 * jit(i + 19) });
      } else {
        const path = [], rs = [];
        for (let k = 0; k <= 4; k++) { path.push(P(k / 4)); rs.push(0.008 + 0.004 * k / 4); }
        out.falls.push({ path: path, rs: rs, seg: 4 });
        const e = P(1);
        out.falls.push({ disk: [e[0], low + 0.012, e[2]], r: 0.06 });
      }
    });
    return out;
  }
  const nb = DIRS.map(function (d) { return isWater(d[0], 0, d[1]); });
  // слив с края: сосед по слою пуст, под ним — вода (русло льётся в чашу или бассейн ниже)
  const spill = DIRS.map(function (d, i) {
    if (nb[i]) return false;
    const n = get(c.x + d[0], c.y, c.z + d[1]);
    return !(n && (n.solid || n.lamp)) && isWater(d[0], -1, d[1]);
  });
  const R = W.rim;
  // готовая стена соседа вдоль края — берег сама (русло между стенами, бассейн в коробке): вода и дно доходят до
  // её грани (у стены по оси клетки — на 0,82 м в клетку соседа), бортика нет; у массива — до границы клетки.
  // Берег — грань стены во всю длину края: прямая стена вдоль края (и на конце ряда), тавр и крест (плечи по обе стороны; стойка
  // выступает на вынос рамки и стоит в воде, плечо к воде — пирс в воде). У угла грань в полкрая — бортик
  const bank = DIRS.map(function (d, i) {
    if (nb[i]) return -1;
    const n = get(c.x + d[0], c.y, c.z + d[1]);
    if (!n || !n.solid || !built(n)) return -1;
    if (n.kind === 'mass') return 0;
    const L = n.links;
    if (n.kind !== 'wall' || n.door || n.glass || n.cross || !L) return -1;
    const straight = d[0] ? !L[0] && !L[1] : !L[2] && !L[3], arms = d[0] ? L[2] && L[3] : L[0] && L[1];
    if (!straight && !arms) return -1;
    return C / 2 - WALL_T / 2 - (n.merlon ? 0.07 : 0) - 0.004;
  });
  const wet = DIRS.map(function (d, i) { return nb[i] || bank[i] >= 0; });
  // бок дна скрыт у берега и у готовой соседней воды (пока соседа заливают, бок виден, а не дыра в дно)
  const side = DIRS.map(function (d, i) { return bank[i] >= 0 || (nb[i] && !!get(c.x + d[0], c.y, c.z + d[1]).water.built); });
  const ex = DIRS.map(function (d, i) { return bank[i] > 0 ? bank[i] : 0; });
  // дно: по бокам к соседней воде и к берегу-стене без граней; низ — только на земле (выступы дна над стенами
  // по оси клетки и концы русла над тонкой стеной видны снизу)
  out.solid.push({ b: [x0 - ex[1], y0, z0 - ex[3], x0 + C + ex[0], y0 + W.bottom, z0 + C + ex[2]], skip: (c.y === 0 ? [3] : []).concat(side[0] ? [0] : [], side[1] ? [1] : [], side[2] ? [4] : [], side[3] ? [5] : []) });
  // бортики к соседям без воды и без берега; бортики по z — между бортиками по x. У слива — низкий порог под гладью
  const xs0 = x0 - ex[1] + (wet[1] ? 0 : R), xs1 = x0 + C + ex[0] - (wet[0] ? 0 : R), zs0 = z0 - ex[3] + (wet[3] ? 0 : R), zs1 = z0 + C + ex[2] - (wet[2] ? 0 : R);
  DIRS.forEach(function (d, i) {
    if (wet[i]) return;
    const top = spill[i] ? lvl - 0.05 : y0 + W.rimH, yb = y0 + W.bottom;
    let b, cp;
    if (d[0]) {
      // бортик по x — во всю длину края, у берега-стены по z — до её грани
      const p0 = d[0] > 0 ? x0 + C - R : x0, p1 = p0 + R, za = z0 - ex[3], zb = z0 + C + ex[2];
      b = [p0, yb, za, p1, top, zb];
      cp = [p0 - 0.03, top, za - (wet[3] ? 0 : 0.03), p1 + 0.03, top + 0.05, zb + (wet[2] ? 0 : 0.03)];
    } else {
      const p0 = d[1] > 0 ? z0 + C - R : z0, p1 = p0 + R;
      b = [xs0, yb, p0, xs1, top, p1];
      // слив бортика по z — между сливами бортиков по x (они закрывают углы)
      cp = [xs0 + (wet[1] ? 0 : 0.03), top, p0 - 0.03, xs1 - (wet[0] ? 0 : 0.03), top + 0.05, p1 + 0.03];
    }
    out.solid.push({ b: b, skip: [3] });
    if (spill[i]) {
      // порог слива — тёсаный лоток с носиком за край
      const s = d[0] || d[1];
      const e0 = d[0] ? (s > 0 ? x0 + C - R : x0 - 0.16) : xs0, e1 = d[0] ? (s > 0 ? x0 + C + 0.16 : x0 + R) : xs1;
      const f0 = d[0] ? zs0 : (s > 0 ? z0 + C - R : z0 - 0.16), f1 = d[0] ? zs1 : (s > 0 ? z0 + C + 0.16 : z0 + R);
      out.trim.push({ b: [e0, top, f0, e1, top + 0.03, f1], skip: [] });
    } else out.trim.push({ b: cp, skip: [] });
  });
  // гладь — между бортиками, у слива — до кромки лотка
  const g0 = spill[1] ? x0 - 0.16 : xs0, g1 = spill[0] ? x0 + C + 0.16 : xs1, h0 = spill[3] ? z0 - 0.16 : zs0, h1 = spill[2] ? z0 + C + 0.16 : zs1;
  out.water.push({ x0: g0, z0: h0, x1: g1, z1: h1, y: lvl });
  // пелена слива: от кромки лотка вниз и чуть наружу — до глади (или чаши фонтана) нижней клетки
  DIRS.forEach(function (d, i) {
    if (!spill[i]) return;
    const n = get(c.x + d[0], c.y - 1, c.z + d[1]);
    const fountain = n.water.style === 'cascade' && !!get(c.x + d[0], c.y - 2, c.z + d[1]) && !!get(c.x + d[0], c.y - 2, c.z + d[1]).water;
    const bottomY = fountain ? y0 - C + 0.52 : y0 - C + W.level;
    const s = d[0] || d[1], edge = (d[0] ? (s > 0 ? x0 + C : x0) : (s > 0 ? z0 + C : z0)) + s * 0.16;
    const mid = d[0] ? (zs0 + zs1) / 2 : (xs0 + xs1) / 2, top = lvl + 0.01, H = top - bottomY;
    const P = function (a, y, t) { return d[0] ? [a, y, t] : [t, y, a]; };
    // по параболе: с кромки почти горизонтально, ниже — круче; к низу шире на 5 см с каждой стороны
    for (let k = 0; k < 6; k++) {
      const u0 = k / 6, u1 = (k + 1) / 6, a0 = edge + s * 0.45 * u0, a1 = edge + s * 0.45 * u1, ya = top - H * u0 * u0, yb = top - H * u1 * u1;
      const ha = 0.36 + 0.05 * u0, hb = 0.36 + 0.05 * u1, tr = 0.45 / 6, ty = ya - yb, tl = Math.hypot(tr, ty) || 1;
      out.falls.push({ quad: [P(a0, ya, mid - ha), P(a0, ya, mid + ha), P(a1, yb, mid + hb), P(a1, yb, mid - hb)],
        n: d[0] ? [s * ty / tl, tr / tl, 0] : [0, tr / tl, s * ty / tl] });
    }
  });
  // фонтан каскада без воды под ним — как у оригинала: тумба с чашей в своём бассейне, струя
  if (c.water.style === 'cascade') {
    out.rods.push({ a: [cx, y0 + W.bottom, cz], b: [cx, y0 + 1.1, cz], r: 0.16, mat: 'solid' });
    out.rods.push({ a: [cx, y0 + 1.1, cz], b: [cx, y0 + 1.2, cz], r: 0.42, ri: 0.34, mat: 'trim', cap: false });
    out.disks.push({ x: cx, z: cz, r: 0.34, y: y0 + 1.16 });
    out.falls.push({ a: [cx, y0 + 1.16, cz], b: [cx, y0 + 1.8, cz], r: 0.035, cap: true });
  }
  return out;
}

