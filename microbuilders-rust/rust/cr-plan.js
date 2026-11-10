// Задания башенного крана (site-crane.js) по миру логики: куда поднять поддон и из чего. Без three.js.
// Стройка «ушла вверх» — стоят настилы лесов выше земли или идёт кладка выше первого яруса. Тогда кран везёт поддон
// туда, где будут класть деталь этого материала: деталь яруса ≥ 2 логика кладёт с настила ярусом ниже, соседнего по
// оси (клетка стойки — конец маршрута к ней или эти соседи; настил там стоит или его поставят перед укладкой). Поддон
// ставится на годный настил этой клетки или соседней того же яруса, к перилам со свободной стороны (не к детали, не к
// проходу между настилами, не к лестнице; снаружи пройти нельзя), в досягаемости точки, где каменщик встанет у
// детали (как crew.js: у лица детали, иногда — на соседнем настиле): reach модуля запаса (по умолчанию sk-stock.js
// REACH 1,25 м; модуль может объявить свою — site.claim(true, reach)). Когда начнут класть, видно по логике: деталь
// в руках каменщика (маршрут к ней; до неё — укладки по очереди), в его плане (owner), ничья с опорой — по очереди
// стройки (world.orderedBlocks). Поддон везут, если кладку начнут не раньше, чем он будет готов (lead — сколько крану
// до этого), и не позже, чем он уйдёт (life); кладут уже или не отсюда — поздно.
// Настил годен: живой, свободный (никто не стоит и не идёт туда — и по пути тоже), лестница сквозь него не идёт, в его
// клетку не пойдёт кладка, столб над ним пуст до неба и пока таким останется (трос и груз не проходят сквозь здание),
// над ним не задуман следующий ярус лесов, в досягаемости стрелы.
// Координаты: клетки логики (x, y, z), метры вида = клетка × CELL (куб x занимает [2x, 2x + 2]).
// клетка логики, м (как families.js → CELL; модуль без three.js — проверяется в node)
const CELL = 2;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Вынос середины поддона от середины клетки настила к наружному краю (м): поддон 0,6 м поперёк (cr-cargo.js),
// перила и верхняя связь клети — трубы в 0,876…0,924 м от середины клетки (scaffold.js). Поддон — 0,25…0,85 м:
// идущему по середине клетки (тело ~0,2 м) остаётся 5 см, до перил — 2,6 см.
export const DECK_OFFSET = 0.55;

export function createPlanner(world) {
  const index = world.index;
  const fp = world.level.footprint;
  const inside = function (x, y, z) { return index.inside(x, y, z); };
  const id = function (x, y, z) { return index.id(x, y, z); };

  function deckLive(d) { return d.built && !d.removed && !d.broken; }
  function blockAt(x, y, z) { return inside(x, y, z) ? world.blockGrid[id(x, y, z)] || null : null; }
  // клетка занята или станет занятой: стоит деталь, настил, пролёт лесов; деталь в работе (залита или занята)
  function solidish(x, y, z) {
    if (!inside(x, y, z)) return false;
    const i = id(x, y, z);
    if (world.solidGrid[i] === 1 || world.deckGrid[i] === 1 || world.mastGrid[i] === 1) return true;
    const b = world.blockGrid[i];
    return !!b && !b.built && (b.poured > 0 || b.reserved);
  }
  // Столб над клеткой настила (x, y, z) пуст до верха сетки: настил сам не мешает, над ним — ничего.
  function columnClear(x, y, z) {
    const b = blockAt(x, y, z);
    if (b && (b.built || b.poured > 0 || b.reserved)) return false;
    for (let yy = y + 1; inside(x, yy, z); yy++) if (solidish(x, yy, z)) return false;
    return true;
  }
  // Столб над настилом пуст и пока таким останется: задуманная по чертежу деталь над ним — не скоро (не в плане и не
  // в первых в очереди стройки, refresh). Груз ждёт наготове в 3 м над настилом — в клетке над ним — и опускается
  // сквозь весь столб; деталь над ним пошла в работу — кран сразу уходит вверх (site-crane.js, targetOk каждый кадр).
  function columnFree(x, y, z) {
    if (!columnClear(x, y, z)) return false;
    for (let yy = y + 1; inside(x, yy, z); yy++) { const b = blockAt(x, yy, z); if (b && !b.built && (b.owner >= 0 || order.has(b))) return false; }
    return true;
  }
  // Рабочий в клетке, идёт в неё или пройдёт по ней (оставшийся путь логики: b.path с b.pathIndex).
  function busy(x, y, z) {
    const list = world.builders || [];
    const at = function (c) { return c && c[0] === x && c[1] === y && c[2] === z; };
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!b || b.exited) continue;
      if (at(b.cell) || at(b.to)) return true;
      if (b.phase === 'walk' && b.path) for (let k = Math.max(0, b.pathIndex || 0); k < b.path.length; k++) if (at(b.path[k])) return true;
    }
    return false;
  }
  // Можно стоять в клетке (как canStand логики): пол земли, настил, пролёт лесов, деталь под ногами.
  function standable(x, y, z) {
    if (!inside(x, y, z)) return false;
    const i = id(x, y, z);
    if (world.solidGrid[i] === 1) return false;
    if (y === 0 || world.deckGrid[i] === 1 || world.mastGrid[i] === 1 || (world.doorGrid && world.doorGrid[i] === 1)) return true;
    if (!inside(x, y - 1, z)) return false;
    const j = id(x, y - 1, z);
    return world.solidGrid[j] === 1 || world.mastGrid[j] === 1 || (world.bridgeGrid && world.bridgeGrid[j] === 1) || (world.doorGrid && world.doorGrid[j] === 1);
  }
  // С наружной стороны настила (против стены) — пусто: ни детали по чертежу, ни настила, ни пола — поперёк клетки
  // через поддон не пройдут.
  function outerFree(d, w) {
    const ox = d.x - w[0], oz = d.z - w[1];
    if (!inside(ox, d.y, oz)) return true;
    return !blockAt(ox, d.y, oz) && !standable(ox, d.y, oz);
  }
  function deckAt(x, y, z) { return inside(x, y, z) && world.deckGrid[id(x, y, z)] === 1; }
  // Лестница идёт сквозь настил дальше вверх — по ней лезут через клетку, поддону места нет. Выход лестницы снизу —
  // можно: лестница пролёта у его стороны ox, oz в 0,56 м от середины клетки (scaffold.js), поддон — у других перил
  // (spotNear).
  function ladderNear(x, y, z) {
    return inside(x, y, z) && world.mastGrid[id(x, y, z)] === 1;
  }
  // Сторона стены у настила: сосед яруса с деталью по чертежу (иначе — к середине здания).
  function wallSide(x, y, z) {
    let best = null, bestS = -1;
    for (let k = 0; k < 4; k++) {
      const d = DIRS[k];
      if (!blockAt(x + d[0], y, z + d[1])) continue;
      // лучше та, напротив которой пусто (наружу — без деталей и настилов)
      const s = (blockAt(x - d[0], y, z - d[1]) ? 0 : 1) + (deckAt(x - d[0], y, z - d[1]) ? 0 : 0.5);
      if (s > bestS) { bestS = s; best = d; }
    }
    if (best) return best;
    const cx = (fp.minX + fp.maxX) / 2, cz = (fp.minZ + fp.maxZ) / 2;
    const dx = cx - x, dz = cz - z;
    return Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dz) || 1];
  }
  // Место поддона на настиле: середина низа (м) и поворот (длинная сторона вдоль перил). to — от поддона к середине
  // клетки (поддон — у перил напротив), иначе — сторона стены.
  function spot(d, to) {
    const w = to || wallSide(d.x, d.y, d.z);
    return {
      x: (d.x + 0.5) * CELL - w[0] * DECK_OFFSET, y: d.y * CELL, z: (d.z + 0.5) * CELL - w[1] * DECK_OFFSET,
      yaw: w[0] !== 0 ? Math.PI / 2 : 0, wall: w,
    };
  }
  // Где встанет каменщик из клетки настила d класть деталь B — как crew.js standFor (стена 0,36 м по оси клетки
  // детали, 0,5 м от лица; на прямой от середины своей клетки — первая точка, где можно стоять: своя клетка или
  // соседний настил; нет — своя клетка у края) и откуда модуль запаса ищет поддон (×1 — crew.js stockAnchor: запас —
  // в 0,72 м влево и 0,05 м назад от стойки, сам он — в 0,78 м слева от этой точки). Поменяется там — поменять здесь.
  // → { S: [x, z], A: [x, z] }
  function standOf(d, B) {
    const Px = (d.x + 0.5) * CELL, Pz = (d.z + 0.5) * CELL, Bx = (B.x + 0.5) * CELL, Bz = (B.z + 0.5) * CELL;
    const dx = Px - Bx, dz = Pz - Bz, xf = Math.abs(dx) >= Math.abs(dz);
    const wx = xf ? Bx + Math.sign(dx || 1) * 0.68 : Bx, wz = xf ? Bz : Bz + Math.sign(dz || 1) * 0.68;
    const can = function (x, z) {
      const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
      if (cx === d.x && cz === d.z) return true;
      return inside(cx, d.y, cz) && world.solidGrid[id(cx, d.y, cz)] !== 1 && world.deckGrid[id(cx, d.y, cz)] === 1;
    };
    let S = null;
    for (let k = 1; k > 0.01 && !S; k -= 0.125) { const x = Px + (wx - Px) * k, z = Pz + (wz - Pz) * k; if (can(x, z)) S = [x, z]; }
    if (!S) S = [Math.min(Math.max(wx, d.x * CELL + 0.15), d.x * CELL + CELL - 0.15), Math.min(Math.max(wz, d.z * CELL + 0.15), d.z * CELL + CELL - 0.15)];
    const fl = Math.hypot(Bx - S[0], Bz - S[1]) || 1, fx = (Bx - S[0]) / fl, fz = (Bz - S[1]) / fl, R = 0.78;
    const Tx = S[0] + fz * 0.72 - fx * 0.05, Tz = S[1] - fx * 0.72 - fz * 0.05, Dx = Tx - Bx, Dz = Tz - Bz, D2 = Dx * Dx + Dz * Dz;
    if (D2 <= R * R + 0.01) return { S: S, A: S };
    const t = Math.sqrt(D2 - R * R);
    return { S: S, A: [Bx - t * (-t * Dx - R * Dz) / D2, Bz - t * (R * Dx - t * Dz) / D2] };
  }
  // Досягаемость поддона крана у модуля запаса (sk-stock.js REACH: от точки стойки каменщика у детали, тот же ярус),
  // если он не объявил свою (claim(true, reach)); поддон ставим с запасом 0,1 м (и на ×1 — от stockAnchor, и рядами
  // на ×5 — от самой стойки)
  const REACH0 = 1.25;
  // Место поддона на настиле d у точки стойки st (standOf): сторона клетки к перилам, где снаружи пройти нельзя, не
  // к лестнице снизу и не avoid (к детали — там встанет каменщик, к его клетке — проход между настилами) — ближе всего к
  // его точке стойки; дальше near — null.
  function spotNear(d, st, near, avoid) {
    const r = world.rungByKey && inside(d.x, d.y - 1, d.z) && world.mastGrid[id(d.x, d.y - 1, d.z)] === 1 ? world.rungByKey.get(d.x + ',' + (d.y - 1) + ',' + d.z) : null;
    let best = null, bestD = near;
    for (let k = 0; k < 4; k++) {
      const sd = DIRS[k];
      if ((avoid && sd[0] === avoid[0] && sd[1] === avoid[1]) || (r && sd[0] === r.ox && sd[1] === r.oz)) continue;
      const s = spot(d, [-sd[0], -sd[1]]);
      if (!outerFree(d, s.wall)) continue;
      const dd = Math.max(Math.hypot(s.x - st.S[0], s.z - st.S[1]), Math.hypot(s.x - st.A[0], s.z - st.A[1]));
      if (dd < bestD) { bestD = dd; best = s; s.stand = st; s.reach = Math.round(dd * 100) / 100; }
    }
    return best;
  }
  // Стройка ушла вверх: настил выше земли или кладка выше первого яруса.
  function upward() {
    const decks = world.scaffoldDecks || [];
    for (let i = 0; i < decks.length; i++) if (deckLive(decks[i]) && decks[i].y > 0) return true;
    const list = world.builders || [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b && b.phase === 'place' && b.cell && b.cell[1] > 0) return true;
    }
    return false;
  }
  // Самый нижний задуманный (ещё не поставленный) ярус лесов в столбе над клеткой — настил или пролёт; −1 — нет.
  function pendingAbove(x, y, z) {
    let best = -1;
    const scan = function (p) { if (!p.built && !p.removed && p.x === x && p.z === z && p.y > y && (best < 0 || p.y < best)) best = p.y; };
    (world.scaffoldDecks || []).forEach(scan);
    (world.scaffoldPieces || []).forEach(scan);
    return best;
  }

  // Детали, которые скоро будут класть (ярус ≥ 2 — с настила ярусом ниже): в руках каменщиков, в их планах, первые
  // READY в очереди стройки; без особых деталей и стёкол.
  function upcoming() {
    const out = [], seen = new Set();
    const add = function (B) {
      if (!B || seen.has(B) || B.built || B.y < 2 || B.feature || (B.glassOf !== undefined && B.glassOf !== null)) return;
      seen.add(B); out.push(B);
    };
    (world.builders || []).forEach(function (b) { if (b && !b.exited) { (b.carry || []).forEach(add); (b.plan || []).forEach(add); } });
    order.forEach(function (n, B) { if (n <= READY) add(B); });
    return out;
  }
  // Клетки, откуда будут класть B: конец маршрута к ней (если идут); иначе — соседи по оси ярусом ниже без детали по
  // чертежу и без опоры под ногами, кроме настила (там стоит настил или логика его поставит). → [{ x, y, z, dir }]
  // (dir — от клетки к детали)
  function standCells(B) {
    const list = world.builders || [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i], r = b && !b.exited && b.routeId >= 0 ? world.routes[b.routeId] : null;
      if (!r || r.targetId !== B.id || !r.steps.length) continue;
      const c = r.steps[r.steps.length - 1].cell;
      const q = [B.x - c[0], B.z - c[2]];
      return c[1] === B.y - 1 && Math.abs(q[0]) + Math.abs(q[1]) === 1 ? [{ x: c[0], y: c[1], z: c[2], dir: q }] : [];
    }
    const out = [];
    for (let k = 0; k < 4; k++) {
      const x = B.x - DIRS[k][0], y = B.y - 1, z = B.z - DIRS[k][1];
      if (!inside(x, y, z) || blockAt(x, y, z) || world.solidGrid[id(x, y, z)] === 1) continue;
      if (!deckAt(x, y, z) && inside(x, y - 1, z) && world.solidGrid[id(x, y - 1, z)] === 1) continue;
      out.push({ x: x, y: y, z: z, dir: DIRS[k] });
    }
    return out;
  }
  // Очередь стройки: ничьи детали с опорой по порядку world.orderedBlocks (их план возьмёт следующий у стола) — номер.
  const order = new Map();
  function rankOf(B) { return order.has(B) ? order.get(B) : 99; }
  // Когда начнут класть деталь B (с от сейчас, грубо): { who, eta, kind }. kind: 'now' — кладут уже; 'route' — в руках
  // первой, каменщик идёт к ней; 'carry' — в руках, до неё — другие укладки; 'plan' — в его плане (сходит к карьеру);
  // 'ready' — ничья, с опорой (по очереди стройки); null — опоры нет.
  const STEP_S = 0.35, PLACE_S = 8;
  // ничьи детали с опорой — первые столько в очереди стройки (0 — следующий якорь плана). Логика L4–L7 (узел
  // crg-node/rank.mjs, пары настил → деталь): №0 кладут через 22–94 с (медиана 44), №1 — 28–136 (78), №2–3 — 47–194
  // (~115), в плане — 3–52 (14).
  const READY = 3;
  // d — настил, с которого её ждут: маршрут к ней кончается не на нём — класть будут не отсюда ('away').
  function eta(B, d) {
    const list = world.builders || [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!b || b.exited || !b.carry) continue;
      const k = b.carry.indexOf(B);
      if (k < 0) continue;
      if (k === 0 && b.phase === 'place') return { who: i, eta: 0, kind: 'now' };
      const r = b.routeId >= 0 ? world.routes[b.routeId] : null;
      const to = r && r.targetId === B.id && r.steps.length ? r.steps[r.steps.length - 1].cell : null;
      if (to && d && (to[0] !== d.x || to[1] !== d.y || to[2] !== d.z)) return { who: i, eta: 0, kind: 'away' };
      const walk = to ? Math.max(1, r.steps.length - (r.stepIndex || 0)) * STEP_S : 8;
      let before = b.phase === 'place' ? (b.timer || 0) : 0;
      for (let j = 0; j < k; j++) if (b.carry[j] !== b.carry[j - 1]) before += PLACE_S;
      return { who: i, eta: before + walk, kind: k === 0 ? 'route' : 'carry' };
    }
    if (B.owner >= 0 && list[B.owner] && !list[B.owner].exited) {
      const b = list[B.owner];
      // в плане: сначала то, что в руках, потом ходка к карьеру и назад (логика: план → укладка обычно 17–27 с)
      return { who: B.owner, eta: 20 + (b.carry ? b.carry.length : 0) * PLACE_S, kind: 'plan' };
    }
    // ничья с опорой: возьмёт в план следующий у стола (первая в очереди — якорь плана, рядом — в тот же план); eta —
    // медиана по номеру в очереди (READY)
    if (B.ready && B.owner < 0 && !B.reserved && order.has(B)) { const n = rankOf(B); return { who: null, eta: n === 0 ? 44 : n === 1 ? 78 : 115, kind: 'ready', rank: n }; }
    return null;
  }
  // Настил d годен под поддон сейчас (без досягаемости стрелы; выход лестницы снизу — по стороне, spotNear).
  function deckFree(d) {
    return deckLive(d) && d.y >= 1 && !blockAt(d.x, d.y, d.z) && !busy(d.x, d.y, d.z) && columnFree(d.x, d.y, d.z) && pendingAbove(d.x, d.y, d.z) < 0;
  }
  // Задание: { deck, spot, materialId, mason, block, stand, eta, kind, rank } или null. ok(spot, d) — досягаемость
  // стрелы и свободное место (без других поддонов); skip — id настилов, которые не брать (только что не вышло);
  // fam(materialId) → true — только такой материал (поддон уже выбран); lead — через сколько с поддон будет готов
  // (кран ещё идёт), life — сколько он потом ждёт (с игры, с ожиданием наготове над настилом); reach — досягаемость
  // поддона у модуля запаса (REACH0). Деталь в руках или в плане: кладку должны начать в [lead, lead + life] — раньше
  // поддон опоздает. Ничья с опорой — только первые READY в очереди стройки (кран ждёт с грузом наготове над
  // настилом, пока её не возьмут в план). Поддон — на годный настил в клетке, откуда будут класть (stand), или рядом
  // (соседняя клетка яруса), в reach от точки стойки. Лучше — то, что точно будет (в руках, в плане), ближе к lead,
  // поддон — ближе к каменщику.
  function pick(ok, skip, fam, lead, life, reach) {
    lead = lead || 0;
    life = life === undefined ? 80 : life;
    const near = (reach || REACH0) - 0.1;
    const decks = (world.scaffoldDecks || []).filter(function (d) { return !(skip && skip.has(d.id)) && !ladderNear(d.x, d.y, d.z) && deckFree(d); });
    let best = null, bestC = Infinity;
    if (!decks.length) return null;
    upcoming().forEach(function (B) {
      if (fam && !fam(B.materialId)) return;
      standCells(B).forEach(function (c) {
        const e = eta(B, c);
        if (!e || e.kind === 'now' || e.kind === 'away') return;
        // кладку начнут после готовности поддона (с запасом 3 с: каменщик успевает сходить к нему с начала укладки)
        if (e.kind === 'ready' ? e.rank > READY : e.eta < lead + 3 || e.eta > lead + life) return;
        const st = standOf(c, B);
        decks.forEach(function (d) {
          if (d.y !== c.y || Math.max(Math.abs(d.x - c.x), Math.abs(d.z - c.z)) > 1) return;
          const own = d.x === c.x && d.z === c.z;
          // в своей клетке — не к детали; в соседней — не к его клетке (проход между настилами)
          const s = spotNear(d, st, near, own ? c.dir : [c.x - d.x, c.z - d.z]);
          if (!s || !ok(s, d)) return;
          // ничья: лучше №1–2 (от склада кран до готового поддона ~1 мин — как раз), №0 — может не успеть, №3 — ждать дольше
          const k = e.kind === 'ready' ? 1.5 + 0.5 * Math.abs(e.rank - 1.5) : e.kind === 'plan' ? 0.6 + Math.max(0, e.eta - lead - 10) / 40 : Math.max(0, e.eta - lead - 10) / 40;
          // своя клетка (поддон у наружных перил — в шаге от стойки: короткая укладка успевает сходить) — заметно лучше
          const cst = k + s.reach / 2 + (own ? 0 : 0.6);
          if (cst < bestC) { bestC = cst; best = { deck: d, spot: s, materialId: B.materialId, mason: e.who, block: B, stand: c, eta: e.eta, kind: e.kind, rank: e.rank }; }
        });
      });
    });
    return best;
  }
  // Задание t ещё в силе: деталь не кладут и не положили, настил годен, кладку начнут не раньше, чем поддон будет
  // готов (через lead с).
  function still(t, lead) {
    if (!t || !t.deck || !t.block || t.block.built) return false;
    if (!deckLive(t.deck) || !columnFree(t.deck.x, t.deck.y, t.deck.z) || pendingAbove(t.deck.x, t.deck.y, t.deck.z) >= 0) return false;
    const e = eta(t.block, t.stand || t.deck);
    return !!e && e.kind !== 'now' && e.kind !== 'away' && e.eta >= (lead || 0);
  }

  // Высота препятствий (м вида) в клетке столба (x, z): верх деталей (стоящих и в работе), настилов с перилами
  // и пролётов лесов, плюс рост рабочего над ними. Сетка — на момент вызова (refresh).
  const tops = new Map();
  function refresh() {
    tops.clear();
    order.clear();
    const ob = world.orderedBlocks || [];
    for (let i = 0, n = 0; i < ob.length && n < 12; i++) { const b = ob[i]; if (!b.built && !b.reserved && b.owner < 0 && b.ready) order.set(b, n++); }
    const put = function (x, z, h) { const k = x * 4096 + z; if (!(tops.get(k) >= h)) tops.set(k, h); };
    (world.blocks || []).forEach(function (b) { if (b.built || b.poured > 0 || b.reserved) put(b.x, b.z, (b.y + 1) * CELL + 2.0); });
    (world.scaffoldDecks || []).forEach(function (d) { if (deckLive(d)) put(d.x, d.z, d.y * CELL + 2.0); });
    (world.scaffoldPieces || []).forEach(function (p) { if (p.built && !p.removed) put(p.x, p.z, (p.y + 1) * CELL + 0.3); });
  }
  // Высота препятствий у точки (м вида) с запасом pad (м) по сторонам.
  function topAt(xm, zm, pad) {
    const x0 = Math.floor((xm - pad) / CELL), x1 = Math.floor((xm + pad) / CELL);
    const z0 = Math.floor((zm - pad) / CELL), z1 = Math.floor((zm + pad) / CELL);
    let h = -Infinity;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const t = tops.get(x * 4096 + z); if (t > h) h = t; }
    return h;
  }

  return { upward: upward, pick: pick, still: still, eta: eta, upcoming: upcoming, standCells: standCells, deckFree: deckFree, columnClear: columnClear, columnFree: columnFree, standOf: standOf, busy: busy, refresh: refresh, topAt: topAt, spot: spot, deckLive: deckLive, blockAt: blockAt, pendingAbove: pendingAbove, standable: standable };
}
