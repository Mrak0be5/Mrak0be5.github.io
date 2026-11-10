// Эффекты в реалистичном виде: вызовы эффектов оригинала (art/fx.js — загрузчик отдаёт их сюда через
// call(name, args) с теми же числами; координаты оригинала, мир вида — ×2). Летящих блоков кладки (мини-кубы
// flyMesh оригинала, game.js → updateHandCube) нет: пачку из рук в ряд кладёт сам каменщик (ms-lay.js,
// building.js — деталь растёт пачками в такт его рукам). Модуль вида (scene.js → LOADERS):
// create(ctx) → { group, build, clear, update(dt, info), call(name, args) }.
//   place  — деталь встала: пыль из шва по низу детали (по её форме: стена, колонна, массив; у плиты перекрытия —
//            по её верху) — низкая быстрая «юбка» (видна с зума игрока) и оседающая дымка; есть опора (земля,
//            цоколь, перекрытие) — стелется по ней, над пустотой (фасад выше первого яруса) — оседает вдоль стены;
//            по материалу — каменная крошка или щепа с верхней кромки, искры по металлу, блик стекла и золота на
//            лице к камере;
//   dust   — клубы пыли (самосвал, вертолёт); укладка на ×5 (центр низа детали) — та же пыль из шва, что у place;
//            trail — пыль из-под колёс, smoke — дизельный выхлоп;
//   chips  — крошка (леса, износ, городок, машины), золотые искры удачи и находок; дымок «Айда курить!» и
//            искры нового разряда рисует бригада вида (crew.js);
//   tier   — ярус закрыт: вспышка по верхним кромкам и волна пыли по низу (fx-tier.js);
//   confetti, flag — сдача: три залпа конфетти (бумага и фольга, fx-pieces.js), флаг на флагштоке по ветру
//            (fx-flag.js; на трубе, шесте, навершии, кресте и зубце вида — на кровле рядом);
//   clear  — ×20 и смена уровня: всё пропадает.
// Пыль в тени здания освещена только небом (луч к солнцу по сетке клеток), в дождь её почти нет, с земли —
// в тон глине сезона, чуть светлее земли (в воздух уходит мелкая фракция). Модуль правок общих файлов не требует
// (scene.js → LOADERS.fx уже грузит его).
// Удары кирки, постукивание мастерком, выдох дыма и пыль из-под ног дают движения бригады вида (life.js по
// событиям people.js) — strike, puff и мелкие chips рабочих здесь не повторяются. Аврал (rush), заливка (fill*)
// и монеты (coin) оригинал больше не зовёт (монеты — DOM).
import * as THREE from 'three';
import { createSprites, DUST, SMOKE, SPARK, GLINT, WIND } from './fx-sprites.js?v=ff29707';
import { createPieces } from './fx-pieces.js?v=ff29707';
import { createFlag } from './fx-flag.js?v=ff29707';
import { createTierGlow } from './fx-tier.js?v=ff29707';
import { familyOf } from './families.js?v=ff29707';
import { classify, chimneyCells, key3 } from './plan.js?v=ff29707';
import { SEASON } from './world.js?v=ff29707';

// цвета пыли и дыма (sRGB)
const SOIL = 0xb9a68a, MORTAR = 0xc4bcad, SAWDUST = 0xd6bf94, EXHAUST = 0x5a554f;
const FINES = 0xe6dccb;         // мелкая сухая фракция: пыль в воздухе светлее земли, с которой поднялась
const CONFETTI = [0xf2c230, 0xff7a1a, 0x3cc8e6, 0xffffff, 0xe5433b, 0x58c45a];
const FOIL = [0xffd36b, 0xdfe3e8, 0xe8a59a, 0xffd36b];
const WALL_FACE = 0.18 + 0.04;  // от оси клетки до лица стены с рамкой, м (plan.js → WALL_T, TRIM)
const TOP_GAP = 0.005;          // верх плиты ниже верха клетки (plan.js)
const CAP_H = 0.07;             // слив по верху стены и колонны со свободным верхом (plan.js → CAP)
const SALVO = 0.55;             // с между залпами конфетти

export function create(ctx) {
  const B = ctx.B, CELL = ctx.CELL;
  const q = ctx.quality;
  const phone = !!q.mobile || ctx.tier === 'phone';
  const rich = !!q.taa;
  // бюджет: «Телефон» — до 260 спрайтов, без фольги и теней от эффектов
  const caps = phone ? { sprites: 260, chips: 48, confetti: 96, foil: 0 }
    : rich ? { sprites: 1100, chips: 180, confetti: 200, foil: 90 }
      : { sprites: 700, chips: 120, confetti: 150, foil: 54 };
  const group = new THREE.Group();
  group.name = 'fx';
  // «Телефон»: экран мал — пыль с зума игрока гуще и крупнее (иначе клуб в несколько пикселей не читается)
  const DUSTY = phone ? 1.5 : 1;
  const sprites = createSprites(caps.sprites, sunlit, phone ? 1 : 0.5);
  const pieces = createPieces({ mats: ctx.mats, caps, floorAt, shadows: !phone, get MB() { return B.MB; } });
  const flag = createFlag({ shadows: !phone });
  const glow = createTierGlow();
  group.add(sprites.mesh, pieces.group, flag.group, glow.mesh);
  const R = Math.random;
  const _c = new THREE.Color();

  // Сырость: в дождь и грозу пыли почти нет, в снег — меньше; земля мокнет и сохнет за несколько секунд.
  // Погода — как у оригинала (MicroBuildersSim.weatherAt, scene.js → syncWeather).
  let dry = 1, dryTarget = 1, dryClock = 0;
  function syncDry(dt) {
    dryClock -= dt;
    if (dryClock <= 0) {
      dryClock = 0.5;
      const c = B.campaign, Sim = window.MicroBuildersSim;
      const kind = c && c.status !== 'title' && Sim && Sim.weatherAt ? Sim.weatherAt(c.levelIndex, c.levelElapsed) : '';
      dryTarget = kind === 'rain' || kind === 'storm' ? 0.15 : kind === 'snow' ? 0.5 : 1;
    }
    dry += (dryTarget - dry) * Math.min(1, dt * 0.4);
  }

  // ---------- место ----------
  function world() { return B.world; }
  function solidAt(w, x, y, z) { return w.index.inside(x, y, z) && w.solidGrid[w.index.id(x, y, z)] === 1; }
  function planned(w, x, y, z) { return w.blockByKey.has(B.MB.cellKey(x, y, z)); }
  // Форма детали клетки по чертежу вида (roleMap) — для луча к солнцу, пола и шва: считается раз на клетку
  // площадки (без строк ключей в кадре). 1 — вся клетка (массив и прочее), 2 — плита, 3 — колонна, 4 — стена:
  // прямая — во всю клетку по своей оси, угол и тавр — плечи от оси клетки к связкам (+8/+16 — к +x/−x,
  // +32/+64 — к +z/−z; plan.js → pieceBoxes). Прорубленная дверь, люк, молния — чертёж пересобран: заново.
  const S_FULL = 1, S_PLATE = 2, S_PILLAR = 3, S_WALL = 4, S_XP = 8, S_XN = 16, S_ZP = 32, S_ZN = 64;
  let shapes = null, shapesOf = null;
  function shapeAt(w, x, y, z) {
    if (shapesOf !== w) { shapes = new Int8Array(w.index.size); shapesOf = w; }
    const id = w.index.id(x, y, z);
    let s = shapes[id];
    if (s === 0) {
      const c = roleMap(w).get(key3(x, y, z)), kind = c && c.solid ? c.kind : null;
      if (kind === 'plate' || (kind === 'hatch' && c.hatchBase === 'plate')) s = S_PLATE;
      else if (kind === 'pillar') s = S_PILLAR;
      else if (kind === 'wall') {
        const L = c.links || [];
        s = S_WALL;
        if (!L[2] && !L[3]) s |= S_XP | S_XN;
        else if (!L[0] && !L[1]) s |= S_ZP | S_ZN;
        else s |= (L[0] ? S_XP : 0) | (L[1] ? S_XN : 0) | (L[2] ? S_ZP : 0) | (L[3] ? S_ZN : 0);
      } else s = S_FULL;
      shapes[id] = s;
    }
    return s;
  }
  // точка (dx, dz — от оси клетки) на детали стены по оси клетки (с рамкой): плечо к связке или стойка на оси
  function onWall(s, dx, dz) {
    const ax = Math.abs(dx), az = Math.abs(dz);
    if (ax < 0.22 && az < 0.22) return true;
    if (az < 0.2 && (s & (dx > 0 ? S_XP : S_XN))) return true;
    return ax < 0.2 && !!(s & (dz > 0 ? S_ZP : S_ZN));
  }
  // Пол под точкой (м): верх готовой детали ниже точки (у стены — только на её полосе по оси клетки) или земля.
  function floorAt(x, y, z) {
    const w = world();
    const g = ctx.ground(x, z);
    if (!w || !ctx.house) return g;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let cy = Math.floor((y + 0.05) / CELL); cy >= 0; cy--) {
      if (!solidAt(w, cx, cy, cz)) continue;
      const top = (cy + 1) * CELL;
      if (top > y + 0.05) continue;
      const s = shapeAt(w, cx, cy, cz);
      if (s === S_PILLAR || s & S_WALL) {
        if (onWall(s === S_PILLAR ? 0 : s, x - (cx + 0.5) * CELL, z - (cz + 0.5) * CELL)) return top;
        continue;
      }
      return Math.max(g, top - (s === S_PLATE ? 0.005 : 0));
    }
    return g;
  }
  // Солнце за готовыми деталями (свет клубов, fx-sprites.js): луч от точки к солнцу шагами по 0,3 м сквозь сетку
  // клеток мира до верха здания. Клетка готовой детали затеняет, если луч прошёл по самой детали вида: стена —
  // полоса у оси клетки, колонна — середина, плита — верх клетки, массив — вся клетка. Пыль у лица стены — в той
  // же клетке, что стена: с солнечной стороны луч уходит от неё, с теневой — проходит сквозь неё.
  const SHADE_STEP = 0.3;
  function sunlit(x, y, z) {
    const w = world(), sky = ctx.sky;
    if (!w || !sky) return 1;
    const d = sky.state.sunDir;
    if (d.y < 0.03) return 1;
    const idx = w.index, grid = w.solidGrid;
    const steps = Math.min(90, Math.ceil(((idx.maxY + 1) * CELL - y) / (d.y * SHADE_STEP)));
    let px = x, py = y, pz = z;
    for (let k = 0; k < steps; k++) {
      px += d.x * SHADE_STEP; py += d.y * SHADE_STEP; pz += d.z * SHADE_STEP;
      const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL), cz = Math.floor(pz / CELL);
      if (!idx.inside(cx, cy, cz) || grid[idx.id(cx, cy, cz)] !== 1) continue;
      if (solidPoint(w, cx, cy, cz, px, py, pz)) return 0;
    }
    return 1;
  }
  function solidPoint(w, cx, cy, cz, px, py, pz) {
    if (!ctx.house) return true;
    const s = shapeAt(w, cx, cy, cz);
    if (s === S_FULL) return true;
    if (s === S_PLATE) return py - cy * CELL > CELL - 0.27;
    const dx = px - (cx + 0.5) * CELL, dz = pz - (cz + 0.5) * CELL;
    if (s === S_PILLAR) return Math.abs(dx) < 0.3 && Math.abs(dz) < 0.3;
    return onWall(s, dx, dz);
  }

  // Форма детали клетки для пыли по её низу: точки шва [x, z, наружу x, наружу z] (мир, м).
  const seam = [];
  function seamPoints(bx, by, bz, n) {
    seam.length = 0;
    const w = world();
    const cx = (bx + 0.5) * CELL, cz = (bz + 0.5) * CELL;
    const sh = w && ctx.house && w.index.inside(bx, by, bz) ? shapeAt(w, bx, by, bz) : S_FULL;
    if (sh & S_WALL) {
      // по лицам панели: прямая — во всю клетку, у угла и тавра — по плечам к связкам
      const ax = !!(sh & (S_XP | S_XN)), az = !!(sh & (S_ZP | S_ZN));
      const span = function (neg, pos) { const lo = neg ? -0.9 : -0.2, hi = pos ? 0.9 : 0.2; return lo + R() * (hi - lo); };
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        if (az && (!ax || i % 4 >= 2)) seam.push(cx + side * WALL_FACE, cz + span(sh & S_ZN, sh & S_ZP), side, 0);
        else seam.push(cx + span(sh & S_XN, sh & S_XP), cz + side * WALL_FACE, 0, side);
      }
    } else if (sh === S_PILLAR) {
      for (let i = 0; i < n; i++) { const a = (i + R() * 0.5) / n * 6.283; seam.push(cx + Math.cos(a) * 0.3, cz + Math.sin(a) * 0.3, Math.cos(a), Math.sin(a)); }
    } else {
      // массив, плита, прочее — по краю клетки
      for (let i = 0; i < n; i++) {
        const a = (i + R() * 0.5) / n * 6.283, c = Math.cos(a), s = Math.sin(a);
        const r = 1 / Math.max(Math.abs(c), Math.abs(s));
        seam.push(cx + c * r, cz + s * r, c, s);
      }
    }
    return seam;
  }
  // пыль с земли — в тон глине сезона (world.js → SEASON.look.dirt: осенью бурее), но светлее самой земли: в
  // воздух уходит мелкая сухая фракция; выше — раствор кладки
  const soil = [0, 0, 0], fines = new THREE.Color(FINES);
  function soilColor() {
    const k = (SEASON.look && SEASON.look.dirt) || [1, 1, 1];
    _c.setHex(SOIL);
    soil[0] = _c.r * k[0] * 0.82 + fines.r * 0.18; soil[1] = _c.g * k[1] * 0.82 + fines.g * 0.18; soil[2] = _c.b * k[2] * 0.82 + fines.b * 0.18;
    return soil;
  }
  function dustHex(y) { return y < 0.4 ? soilColor() : MORTAR; }
  function vary(hex, k) { _c.setHex(hex); _c.multiplyScalar(1 - k * 0.5 + R() * k); return _c.getHex(); }

  // ---------- вызовы оригинала ----------
  // Пол у шва (м): верх того, на что выходит пыль, — у лица детали (уступ цоколя) и в метре наружу (плита
  // перекрытия за внутренним лицом стены, соседняя плита, земля). Выше первого яруса снаружи фасада — земля или
  // нижняя кровля далеко внизу: опоры нет.
  function seamFloor(x, z, nx, nz, y) {
    return Math.max(floorAt(x + nx * 0.3, y + 0.05, z + nz * 0.3), floorAt(x + nx, y + 0.05, z + nz));
  }
  // Выброс из шва: деталь легла — раствор выдавило, пыль выходит низкой быстрой «юбкой» (вспышка, читается и с
  // зума игрока), потом встаёт и тает дымкой. x, z — точка шва, nx, nz — наружу, y — низ шва; power — доля
  // густоты, haze — ещё и дымка, slow — тише (с верха плиты, волна яруса). Есть опора (земля с её рельефом, плита,
  // массив) — клуб стелется по ней и гаснет к ней низом; над пустотой (наружное лицо стены второго яруса и выше,
  // край кровли) не держится ни на чём: выходит тише, плотнее (не растекается по полу) и оседает вдоль стены.
  function seamPuff(x, z, nx, nz, y, hex, power, wait, haze, slow) {
    const floor = seamFloor(x, z, nx, nz, y), held = floor > y - 0.3;
    const y0 = held ? Math.max(y, floor) : y, k = (held ? power : power * 1.2) * DUSTY;
    const out = ((slow ? 1.1 : 2.1) + R() * 0.8) * (held ? 1 : 0.8);
    sprites.emit(DUST, x + nx * 0.1, y0 + 0.07, z + nz * 0.1, nx * out, held ? 0.05 + R() * 0.1 : -0.3 - R() * 0.2, nz * out, 0.75 + R() * 0.35, 0.2, 0.6, hex, 0.34 * k * dry, wait, floor);
    if (haze) {
      const v = 0.7 + R() * 0.4;
      sprites.emit(DUST, x + nx * 0.14, y0 + 0.18, z + nz * 0.14, nx * v, held ? 0.2 + R() * 0.15 : -0.2 - R() * 0.15, nz * v, 1.7 + R() * 0.6, 0.16, 0.42, hex, 0.2 * k * dry, wait, floor);
    }
  }
  // Деталь встала (клетка оригинала): пыль из шва по низу (у плиты перекрытия — по её верху: она лежит у верха
  // клетки, plan.js). Возвращает верх детали, м — для крошки и искр.
  function setDown(bx, by, bz, cls) {
    const w = world();
    const plate = !!ctx.house && !!w && w.index.inside(bx, by, bz) && shapeAt(w, bx, by, bz) === S_PLATE;
    const top = (by + 1) * CELL - (plate ? TOP_GAP : 0), seamY = plate ? top : by * CELL;
    if (dry >= 0.1) {
      const pts = seamPoints(bx, by, bz, phone ? 10 : 12);
      const hex = seamY < 0.4 ? soilColor() : cls === 'wood' ? SAWDUST : MORTAR;
      for (let i = 0; i < pts.length; i += 4) seamPuff(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], seamY, hex, 1, 0, i % 8 === 0, plate);
    }
    return top;
  }
  // клубы пыли кольцом у основания (x, y, z — мир): над землёй встают клубы, низом расходится быстрая юбка
  function puffs(x, y, z, count, spread, wait) {
    if (dry < 0.1) return;
    const hex = dustHex(y), floor = floorAt(x, y + 0.1, z);
    for (let k = 0; k < count; k++) {
      const a = k * 6.283 / count + R() * 0.6, c = Math.cos(a), s = Math.sin(a);
      sprites.emit(DUST, x + c * spread, y + 0.22, z + s * spread, c * 1.3, 0.35 + R() * 0.2, s * 1.3, 1.6 + R() * 0.6, 0.18, 0.5, hex, 0.24 * DUSTY * dry, wait, floor);
      const v = 1.8 + R() * 0.7;
      sprites.emit(DUST, x + c * spread, floor + 0.07, z + s * spread, c * v, 0.06, s * v, 0.75 + R() * 0.3, 0.18, 0.55, hex, 0.3 * DUSTY * dry, wait, floor);
    }
  }
  // искры: floor — пол (м); без него — свой у каждой, по месту, куда она долетит (за кромкой детали — ниже)
  function sparksAt(x, y, z, n, hex, floor) {
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, v = 1.5 + R() * 2.2, c = Math.cos(a), s = Math.sin(a);
      const f = floor !== undefined ? floor : floorAt(x + c * v * 0.3, y, z + s * v * 0.3);
      sprites.emit(SPARK, x, y, z, c * v, 1.2 + R() * 2.4, s * v, 0.35 + R() * 0.35, 0.026 + R() * 0.016, 0, hex, 1, 0, f);
    }
  }
  // золото удачи и находок: блики и чешуйки фольги
  function goldBurst(x, y, z, count) {
    const n = Math.min(phone ? 6 : 12, Math.ceil(count * 0.6));
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, v = 0.6 + R() * 1.4;
      sprites.emit(GLINT, x + Math.cos(a) * 0.4 * R(), y + R() * 0.6, z + Math.sin(a) * 0.4 * R(), 0, 0, 0, 0.35 + R() * 0.3, 0.16 + R() * 0.1, 0, 0xffe7a0, 1, R() * 0.4);
      if (pieces.hasFoil) pieces.confetti(x, y + 0.2, z, Math.cos(a) * v, 2 + R() * 2.5, Math.sin(a) * v, 0.06, 0xffd36b, true);
    }
  }

  // Роли клеток по чертежу вида (plan.js → classify, как building.js → blueprint): шест, навершие, крест,
  // зубец, труба — у флага (верх, который выбрал оригинал, у вида бывает не плоским). Раз на площадку.
  let roles = null, rolesOf = null;
  function roleMap(w) {
    if (rolesOf === w) return roles;
    const map = new Map();
    w.blocks.forEach(function (b) {
      const k = key3(b.x, b.y, b.z);
      let c = map.get(k);
      if (!c) { c = { x: b.x, y: b.y, z: b.z, wall: null, glass: null, door: null, hatch: null, water: null, lamp: null, solid: false }; map.set(k, c); }
      if (b.glassOf !== undefined) c.glass = b;
      else if (b.feature === 'door') c.door = b;
      else if (b.feature === 'hatch') c.hatch = b;
      else if (b.feature === 'water') c.water = b;
      else if (b.feature === 'lamp') c.lamp = b;
      else c.wall = b;
    });
    map.forEach(function (c) {
      c.solid = !!(c.wall || c.door || c.hatch);
      const main = c.wall || c.door || c.hatch || c.water || c.lamp;
      if (main) { c.mat = main.materialId; c.family = familyOf(B.MB, c.mat); }
    });
    classify(map);
    // трубы — столбы целиком (дымят сверху, life.js)
    chimneyCells(map).forEach(function (c) {
      for (let y = c.y; y >= 0; y--) { const d = map.get(key3(c.x, y, c.z)); if (!d || !d.solid || d.kind !== 'pillar') break; d.flue = true; }
    });
    roles = map; rolesOf = w;
    return map;
  }
  // Место флагштока: блок оригинала (самый высокий, ближе к центру). Если у вида там не плоский верх (труба,
  // шест, навершие с пирамидкой, крест, зубец, люк) или над ним что-то стоит (фонарь) — тот же выбор среди плоских:
  // флаг встаёт на кровлю рядом. Основание — по верху детали вида: у стены и колонны — на сливе, у плиты — чуть
  // ниже верха клетки.
  function flagSpot(x, y, z) {
    const w = world();
    let bx = Math.floor(x), by = Math.round(y) - 1, bz = Math.floor(z);
    if (!w || !ctx.house) return [x * CELL, y * CELL, z * CELL];
    const map = roleMap(w);
    const flat = function (b) {
      const c = map.get(key3(b.x, b.y, b.z));
      if (!c || !c.solid || c.flue || c.pole || c.finial || c.cross || c.merlon || c.kind === 'hatch') return false;
      return !map.has(key3(b.x, b.y + 1, b.z));
    };
    const here = w.blockByKey.get(B.MB.cellKey(bx, by, bz));
    if (!here || !flat(here)) {
      const f = w.level.footprint, cx = (f.minX + f.maxX) / 2 + 0.5, cz = (f.minZ + f.maxZ) / 2 + 0.5;
      let best = Infinity, top = null;
      for (let i = 0; i < w.blocks.length; i++) {
        const b = w.blocks[i];
        if (!b.built || !flat(b)) continue;
        const score = -b.y * 1000 + Math.abs(b.x + 0.5 - cx) + Math.abs(b.z + 0.5 - cz);
        if (score < best) { best = score; top = b; }
      }
      if (top) { bx = top.x; by = top.y; bz = top.z; }
    }
    const c = map.get(key3(bx, by, bz)), kind = c ? c.kind : null;
    const lift = kind === 'wall' || kind === 'pillar' ? CAP_H : kind === 'plate' ? -TOP_GAP : 0;
    return [(bx + 0.5) * CELL, (by + 1) * CELL + lift, (bz + 0.5) * CELL];
  }
  // Полотнище — по ветру (WIND, как дым труб и снос пыли) и как можно шире к камере: от ветра не дальше 60°.
  // yaw — поворот узла флага: его +x (полотнище от древка) уходит под ветер.
  function flagYaw(x, z) {
    const cam = ctx.camera.position;
    const wind = Math.atan2(-WIND[2], WIND[0]);
    // лицом к камере вполоборота (как у оригинала) — одной или другой стороной, ближе к ветру
    let d = wrap(Math.atan2(cam.x - x, cam.z - z) + 0.5 - wind);
    if (Math.abs(d) > Math.PI / 2) d = wrap(d + Math.PI);
    return wind + Math.max(-Math.PI / 3, Math.min(Math.PI / 3, d));
  }
  function wrap(a) { return a - Math.round(a / (2 * Math.PI)) * 2 * Math.PI; }

  // Новый разряд (game.js → onRankUp: крошка цвета каски над рабочим) — у бригады вида; остальная крошка того же
  // числа — кубы из рук (abandon) — камнем.
  let helmets = null;
  function isHelmet(hex) {
    if (!helmets) {
      helmets = new Set();
      const ranks = (B.MB && B.MB.TRAINING_RANKS) || [];
      ranks.forEach(function (r) { if (r.helmet) helmets.add(parseInt(r.helmet, 16)); });
      helmets.add(0xffd24a);
    }
    return helmets.has(hex);
  }
  const CALLS = {
    // деталь встала (x, z — центр клетки оригинала, y — её низ; cls — stone | wood | metal | gold | glass)
    place: function (cls, x, y, z, hex) {
      const bx = Math.floor(x), by = Math.round(y), bz = Math.floor(z);
      const top = setDown(bx, by, bz, cls);
      // с верхней кромки: у основания крошку и искры прячут соседние детали
      const edge = seamPoints(bx, by, bz, phone ? 3 : 5);
      if (cls === 'stone' || cls === 'wood') {
        for (let i = 0; i < edge.length; i += 4) {
          const v = 1 + R() * 1.2;
          if (cls === 'wood') pieces.chip(edge[i], top - 0.02, edge[i + 1], edge[i + 2] * v, 1.2 + R() * 1.4, edge[i + 3] * v, vary(0xc49a5c, 0.3), 0.04 + R() * 0.025, 3.2);
          else pieces.chip(edge[i], top - 0.02, edge[i + 1], edge[i + 2] * v, 1.2 + R() * 1.4, edge[i + 3] * v, vary(hex, 0.45), 0.06 + R() * 0.07, 1);
        }
      } else if (cls === 'metal' || cls === 'gold') {
        for (let i = 0; i < edge.length; i += 4) sparksAt(edge[i], top, edge[i + 1], 3, cls === 'gold' ? 0xffc23a : 0xff8a28);
      }
      if ((cls === 'gold' || cls === 'glass') && edge.length) {
        // блик — на верхней кромке лица, повёрнутого к камере (у стены — не за ней)
        const cam = ctx.camera.position;
        let k = 0, best = -1e9;
        for (let i = 0; i < edge.length; i += 4) {
          const d = edge[i + 2] * (cam.x - edge[i]) + edge[i + 3] * (cam.z - edge[i + 1]);
          if (d > best) { best = d; k = i; }
        }
        sprites.emit(GLINT, edge[k] + edge[k + 2] * 0.04, top + 0.03, edge[k + 1] + edge[k + 3] * 0.04, 0, 0, 0, 0.42, 0.28, 0, 0xfff4d8, 1, 0.04);
      }
    },
    // клубы пыли: укладка на ×5, кучка самосвала, поток от винта вертолёта
    dust: function (x, y, z) {
      // на ×5 оригинал вместо place зовёт dust в центр низа детали: кольцо клубов родилось бы внутри массива —
      // пыль из шва, как у place, без крошки
      const bx = Math.floor(x), by = Math.round(y), bz = Math.floor(z), w = world();
      if (w && y === by && x - bx === 0.5 && z - bz === 0.5) {
        const block = w.blockByKey.get(B.MB.cellKey(bx, by, bz)), Fx = window.MicroBuildersFx;
        if (block) { setDown(bx, by, bz, Fx && Fx.kind ? Fx.kind(block) : 'stone'); return; }
      }
      const X = x * CELL, Y = y * CELL, Z = z * CELL;
      puffs(X, Math.max(ctx.ground(X, Z), Y), Z, phone ? 3 : 5, 0.6, 0);
    },
    // пыль из-под колёс (dx, dz — куда едет)
    trail: function (x, y, z, dx, dz) {
      const X = x * CELL, Z = z * CELL, g = ctx.ground(X, Z);
      if (dry < 0.1) return;
      sprites.emit(DUST, X - dx * 0.25, g + 0.18, Z - dz * 0.25, -dx * 0.8 + (R() - 0.5) * 0.5, 0.3, -dz * 0.8 + (R() - 0.5) * 0.5, 1.6 + R() * 0.5, 0.16, 0.36, soilColor(), 0.22 * dry, 0, g);
    },
    // дизельный выхлоп: тёмный клуб у трубы, всплывает и тает по ветру
    smoke: function (x, y, z) {
      sprites.emit(SMOKE, x * CELL, y * CELL, z * CELL, 0.4 + R() * 0.3, 0.9 + R() * 0.3, (R() - 0.5) * 0.4, 2.8 + R() * 0.8, 0.12, 0.42, EXHAUST, 0.55, 0);
    },
    chips: function (x, y, z, hex, count) {
      const X = x * CELL, Y = y * CELL, Z = z * CELL;
      if (count <= 2) {
        // мелкое у рабочих (кирка, лестница, пот) — у бригады вида; пыль взлёта такси — клубком
        if (hex === 0xcbb894) puffs(X, ctx.ground(X, Z), Z, 2, 0.4, 0);
        return;
      }
      // «Айда курить!» (облачко над головой зовущего) и новый разряд (искры над каской, вспышка каски) рисует
      // бригада вида (crew.js по событиям smokeCall и rankUp) — здесь не повторяются
      if (hex === 0xe9e4da || (count === 10 && isHelmet(hex))) return;
      if (hex === 0xffd34a || hex === 0xf2c75c) { goldBurst(X, Y, Z, count); return; }
      if (hex === 0xfff1b8 || hex === 0xa8f0ff) { sparksAt(X, Y, Z, Math.min(phone ? 6 : 14, count), hex === 0xfff1b8 ? 0xffd890 : 0x9fe8ff, floorAt(X, Y, Z)); return; }
      const n = Math.min(phone ? 6 : 14, count);
      for (let i = 0; i < n; i++) {
        pieces.chip(X, Y, Z, (R() - 0.5) * 3, 1.6 + R() * 2.4, (R() - 0.5) * 3, vary(hex, 0.3), 0.04 + R() * 0.07, hex === 0xc2a36b || hex === 0xb59a72 || hex === 0x8a6a48 ? 2.6 : 1);
      }
      if (count >= 8) puffs(X, Y - 0.2, Z, phone ? 2 : 3, 0.3, 0);
    },
    // Ярус закрыт: list — внешние рёбра [x, z, nx, nz, …] (середина ребра на границе клетки и наружу), y — низ
    // яруса, cx/cz — центр здания (оригинал). Кромка — по лицу детали вида: у стены — у оси клетки.
    tier: function (list, y, cx, cz) {
      const w = world();
      if (!w) return;
      const base = y * CELL, top = (y + 1) * CELL + 0.04;
      const CX = cx * CELL, CZ = cz * CELL;
      const segs = [];
      const n = Math.min(192, list.length / 4);
      const step = Math.max(1, Math.ceil(n / (phone ? 16 : 40)));
      for (let i = 0; i < n; i++) {
        const o = i * 4, nx = list[o + 2], nz = list[o + 3];
        const bx = Math.floor(list[o] - nx * 0.5), bz = Math.floor(list[o + 1] - nz * 0.5);
        const kind = ctx.house ? ctx.house.kindAt(bx, y, bz) : null;
        const ox = (bx + 0.5) * CELL, oz = (bz + 0.5) * CELL;
        const tx = -nz, tz = nx;
        let off = 1.03, l0 = 1, l1 = 1;
        if (kind === 'wall') {
          off = WALL_FACE + 0.03;
          const plus = planned(w, bx + tx, y, bz + tz), minus = planned(w, bx - tx, y, bz - tz);
          l0 = minus ? 1 : WALL_FACE; l1 = plus ? 1 : WALL_FACE;
        } else if (kind === 'pillar') { off = 0.3; l0 = l1 = 0.3; }
        const px = ox + nx * off, pz = oz + nz * off;
        const delay = (Math.atan2(pz - CZ, px - CX) + Math.PI) / (2 * Math.PI) * 0.5;
        segs.push(px - tx * l0, top, pz - tz * l0, px + tx * l1, top, pz + tz * l1, delay);
        if (i % step === 0 && dry > 0.1) {
          // волна пыли по низу: клубы выходят из шва наружу
          seamPuff(px, pz, nx, nz, base, dustHex(base), 0.85, delay, true, true);
          if (!phone && (i / step) % 2 === 0) sprites.emit(GLINT, px, top + 0.02, pz, 0, 0, 0, 0.4, 0.24, 0, 0xffeccc, 0.9, delay + 0.03);
        }
      }
      glow.show(segs, ctx.sky ? ctx.sky.state.night : 0);
    },
    // Финал: три залпа конфетти над зданием за 1,1 с; radius — полуразмер здания (клетки), от него разлёт и размер.
    confetti: function (x, y, z, radius) {
      salvo.x = x * CELL; salvo.y = y * CELL; salvo.z = z * CELL; salvo.r = radius;
      salvo.left = 2; salvo.t = SALVO;
      fire(0);
    },
    // Флаг на крыше (x, y, z — верх блока под древком), scale — от размера здания; полотнище — по ветру.
    flag: function (x, y, z, scale) {
      const at = flagSpot(x, y, z);
      flag.show(at[0], at[1], at[2], scale, flagYaw(at[0], at[2]));
    },
    clear: clear,
  };

  const salvo = { left: 0, t: 0, x: 0, y: 0, z: 0, r: 1 };
  function fire(index) {
    const r = salvo.r, size = 0.105 * Math.min(2, Math.max(1, r / 5)) * (phone ? 1.3 : 1);
    const a0 = index * 2.1, off = index === 0 ? 0 : r * CELL * 0.4;
    const x = salvo.x + Math.cos(a0) * off, z = salvo.z + Math.sin(a0) * off;
    const nPaper = Math.floor(caps.confetti / 3), nFoil = Math.floor(caps.foil / 3);
    for (let i = 0; i < nPaper + nFoil; i++) {
      const a = R() * 6.283, speed = (0.6 + R()) * Math.min(4, 1 + r * 0.25) * CELL;
      const metal = i >= nPaper;
      pieces.confetti(x + Math.cos(a) * r * CELL * 0.25, salvo.y + R() * 1.5, z + Math.sin(a) * r * CELL * 0.25,
        Math.cos(a) * speed, (2.5 + R() * 2.5) * CELL, Math.sin(a) * speed, size,
        metal ? FOIL[(i + index) % FOIL.length] : CONFETTI[(i + index) % CONFETTI.length], metal);
    }
  }

  function clear() {
    sprites.clear(); pieces.clear(); flag.hide(); glow.clear();
    salvo.left = 0;
  }

  // экран квартала (city): площадка не рисуется и эффекты не идут — вызовы оригинала (пыль взлёта такси и прочее)
  // не копятся замороженными до возврата
  let mode = 'site';
  return {
    group,
    // новая площадка: всё долой
    build: function (w) {
      clear();
      shapesOf = null; rolesOf = null;
      // роли клеток — сразу, под брифингом (а не на первой укладке)
      if (w && w.blocks && ctx.house) roleMap(w);
    },
    clear: clear,
    // чертёж вида пересобран (building.js → rescan: прорубленная дверь, автозаполнение, молния) — формы клеток заново
    react: function (event) {
      if (event.type === 'retrofitDoor' || event.type === 'autofill' || event.type === 'lightning') { shapesOf = null; rolesOf = null; }
    },
    call: function (name, args) {
      if (mode !== 'site' && name !== 'clear') return;
      const fn = CALLS[name];
      if (fn) fn.apply(null, args);
    },
    update: function (dt, info) {
      const site = info.mode === 'site';
      group.visible = site;
      // ушли в квартал: то, что было в воздухе, долой (флаг сданного здания остаётся)
      if (!site && mode === 'site') { sprites.clear(); pieces.clear(); glow.clear(); salvo.left = 0; }
      mode = info.mode;
      if (!site) return;
      if (salvo.left > 0) {
        salvo.t -= dt;
        if (salvo.t <= 0) { fire(3 - salvo.left); salvo.left--; salvo.t = SALVO; }
      }
      syncDry(dt);
      if (ctx.sky) { sprites.light(ctx.sky); flag.light(ctx.sky, info.camera); }
      sprites.update(dt, info.camera);
      pieces.update(dt);
      flag.update(dt);
      glow.update(dt);
    },
    // проверки и снимки: что сейчас в воздухе
    state: function () { return Object.assign({ sprites: sprites.count(), flag: flag.state(), salvos: salvo.left, tier: glow.mesh.visible, dry: Math.round(dry * 100) / 100 }, pieces.count()); },
  };
}
