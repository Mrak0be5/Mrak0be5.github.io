// Раскладка хозяйства площадки в координатах оригинала (клетки, без ×2) — те же формулы, что у оригинала:
// рамка и подкова карьера (art/quarry.js build, contour, terraces), забор, мачты, кран, бытовки и миниатюры
// (art/props.js site, fence, backdrop, minis), стоянка техники (parking, MACHINES, TIERS), самосвал и поддоны
// (art/vehicles.js decorate), хозяйство стройки (game.js quarryCells). Без three.js: та же раскладка и на
// странице оригинала (?rv=off) — кадры сверки снимают одни и те же места.

// Ступени техники по номеру заказа (art/props.js TIERS) и радиусы стоянок машин (MACHINES).
export const TIERS = [3, 8, 15, 25];
export const MACHINES = [{ kind: 'compressor', r: 1.1 }, { kind: 'roller', r: 1.6 }, { kind: 'excavator', r: 2.6 }, { kind: 'truckCrane', r: 3.1 }];
// Уступ карьера (art/quarry.js STEP_W, STEP_H при scale 1), ширина плато, рядов на стенку.
export const STEP = { w: 1.8, h: 1.15, plateau: 46, rows: 5 };

export function tierOf(order) {
  // у стройки штаба номер 'Штаб', у школы — 'Испытание': техники нет (как у оригинала)
  if (typeof order !== 'number' || !isFinite(order)) return 0;
  let n = 0;
  while (n < TIERS.length && order >= TIERS[n]) n++;
  return n;
}
// Номер главы уровня (по 10 уровней, с 0); не сюжетная площадка (штаб, школа — номер не число) — глава 0.
export function chapterOf(level) {
  const n = level && level.number;
  return typeof n === 'number' && isFinite(n) ? Math.floor(Math.max(0, n - 1) / 10) : 0;
}

// Хозяйство стройки, которое обходит подкова (game.js quarryCells): городок, площадки лифтов, дронов и двора
// сборки, дома рабочих.
export function quarryCells(level, world, campaign, meta, Meta) {
  const cells = [];
  const add = function (x, z) { cells.push({ x: x, z: z }); };
  ((world && world.camp) || []).forEach(function (site) {
    add(site.x - 1, site.z - 1);
    add(site.x + site.w + 2, site.z + site.d);
  });
  (level.elevators || []).forEach(function (pad) {
    add(pad.x, pad.z);
    add(pad.x + 3, pad.z + 3);
  });
  const mine = level.mines[0];
  if (mine) {
    add(mine.x + 1, mine.z - 7);
    add(mine.x + 9, mine.z + 1);
    const engineers = !!campaign && ((campaign.devGroups && campaign.devGroups.all === true) || (campaign.purchases && campaign.purchases.engineers > 0) ||
      (!!Meta && !!meta && Meta.sessionLineOpen(meta, 'engineers')));
    if (engineers) add(mine.x + 29, mine.z + 12);
  }
  ((world && world.builders) || []).forEach(function (b) { add(b.homeCell[0], b.homeCell[2]); });
  return cells;
}

// Бровка подковы: правая сторона от фронта к задней, скруглённые углы, задняя сторона, левая к фронту.
// Точки через ~0,5 клетки: x, z, нормаль наружу (nx, nz), s — длина от начала.
export function contour(x0, x1, z0, z1, radius) {
  const out = [];
  let s = 0;
  function push(x, z, nx, nz) {
    if (out.length) { const last = out[out.length - 1]; s += Math.hypot(x - last.x, z - last.z); }
    out.push({ x: x, z: z, nx: nx, nz: nz, s: s });
  }
  function line(ax, az, bx, bz, nx, nz) {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.5));
    for (let i = 0; i < n; i++) push(ax + (bx - ax) * i / n, az + (bz - az) * i / n, nx, nz);
  }
  function corner(ox, oz, from, to) {
    for (let i = 0; i < 20; i++) {
      const a = from + (to - from) * i / 20;
      push(ox + Math.cos(a) * radius, oz + Math.sin(a) * radius, Math.cos(a), Math.sin(a));
    }
  }
  line(x1, z1, x1, z0 + radius, 1, 0);
  corner(x1 - radius, z0 + radius, 0, -Math.PI / 2);
  line(x1 - radius, z0, x0 + radius, z0, 0, -1);
  corner(x0 + radius, z0 + radius, -Math.PI / 2, -Math.PI);
  line(x0, z0 + radius, x0, z1, -1, 0);
  push(x0, z1, -1, 0);
  return out;
}

// Рамка подковы (art/props.js site = art/quarry.js build): всё, куда ходят рабочие и техника, плюс хозяйство.
export function siteFrame(level, extra) {
  const f = level.footprint;
  let minX = f.minX, maxX = f.maxX, minZ = f.minZ, maxZ = f.maxZ;
  const cells = level.rocks.concat(level.mines.map(function (m) { return { x: m.standX, z: m.standZ }; }));
  for (let i = 0; i < level.spawnPoints.length; i++) cells.push({ x: level.spawnPoints[i][0], z: level.spawnPoints[i][2] });
  for (let i = 0; i < extra.length; i++) cells.push(extra[i]);
  for (let i = 0; i < cells.length; i++) {
    minX = Math.min(minX, cells[i].x); maxX = Math.max(maxX, cells[i].x);
    minZ = Math.min(minZ, cells[i].z); maxZ = Math.max(maxZ, cells[i].z);
  }
  const x0 = minX - 2.2, x1 = maxX + 3.2, z0 = minZ - 2.2, z1 = maxZ + 2;
  const scale = Math.min(2.2, Math.max(1, Math.max(x1 - x0, z1 - z0) / 34));
  const W = STEP.w * scale;
  const radius = Math.min(7 * scale, (x1 - x0) / 4, (z1 - z0) / 4);
  const rim = contour(x0, x1, z0, z1, radius);
  const total = rim[rim.length - 1].s;
  const taper = Math.max(4, (rim[0].z - rim[Math.floor(rim.length / 2)].z) * 0.6);
  const top = 3 * STEP.h * scale;
  // сужение стен к открытому фронту: доля полной высоты по длине бровки
  function t(s) {
    const e = Math.min(1, Math.min(s, total - s) / taper);
    return Math.max(0.04, e * e * (3 - 2 * e));
  }
  function nearest(x, z) {
    let best = rim[0], bestD = Infinity;
    for (let i = 0; i < rim.length; i++) {
      const d = (rim[i].x - x) * (rim[i].x - x) + (rim[i].z - z) * (rim[i].z - z);
      if (d < bestD) { bestD = d; best = rim[i]; }
    }
    return best;
  }
  return {
    x0: x0, x1: x1, z0: z0, z1: z1, scale: scale, W: W, H: STEP.h * scale, radius: radius, rim: rim, total: total, taper: taper, top: top, t: t,
    nearest: nearest,
    // забор — за полосой валунов на плато
    fenceD: 2.28 * W + 3.1 * scale + 0.5,
    // высота плато оригинала под точкой — по ближайшей точке бровки
    y: function (x, z) { return top * t(nearest(x, z).s); },
  };
}

// Столбики забора (art/props.js fence): через 1,7 клетки там, где стенка не ниже 0,45 полной; цепочки — участки
// без разрыва (лента натянута между соседними столбиками цепочки).
export function fenceRuns(S) {
  const s = S.scale, d = S.fenceD, step = 1.7 * s;
  const runs = [];
  let run = step, prev = null, chain = null;
  for (let i = 0; i < S.rim.length; i++) {
    const p = S.rim[i];
    const x = p.x + p.nx * d, z = p.z + p.nz * d;
    if (prev) run += Math.hypot(x - prev[0], z - prev[1]);
    prev = [x, z];
    const t = S.t(p.s);
    if (t < 0.45) { chain = null; continue; }
    if (run < step) continue;
    run = 0;
    if (!chain) { chain = []; runs.push(chain); }
    chain.push({ x: x, y: S.top * t, z: z, nx: p.nx, nz: p.nz });
  }
  return runs;
}

// Мачты (4 по бровке), кран, бытовки и ряд миниатюр (art/props.js backdrop, minis). yaw — поворот вокруг y,
// как placed() оригинала.
export function backdrop(level, S, cx, cz, LEVELS) {
  const s = S.scale;
  const sideLen = S.z1 - S.z0 - S.radius;
  const arc = Math.PI / 2 * S.radius;
  const at4 = [S.taper, sideLen + arc / 2, S.total - sideLen - arc / 2, S.total - S.taper];
  const masts = at4.map(function (a) {
    let p = S.rim[0];
    for (let j = 0; j < S.rim.length; j++) if (Math.abs(S.rim[j].s - a) < Math.abs(p.s - a)) p = S.rim[j];
    const d = S.fenceD + 0.9 * s;
    const x = p.x + p.nx * d, z = p.z + p.nz * d;
    return { x: x, y: S.top * S.t(p.s), z: z, yaw: Math.atan2(cx - x, cz - z), s: s };
  });
  const zRow = S.z0 - S.fenceD - 1.0 * s;
  const left = S.x0 + S.radius * 0.5, right = S.x1 - S.radius * 0.5;
  const craneX = left + 1.7 * s, craneZ = zRow - 3.2 * s;
  const crane = { x: craneX, y: S.y(craneX, craneZ), z: craneZ, yaw: 0.35, s: s };
  const cabX = right - 2.2 * s, cabZ = zRow - 0.8 * s;
  const cabins = { x: cabX, y: S.y(cabX, cabZ), z: cabZ, yaw: 0, s: s };
  return { masts: masts, crane: crane, cabins: cabins, zRow: zRow, minis: minis(level, S, craneX + 2.9 * s, cabX - 6.1 * s, zRow, LEVELS) };
}

// Миниатюры 1–3 прошлых строек на постаментах: k — масштаб клетки уровня, (ox, oy, oz) — сдвиг клетки 0 его
// сетки, постамент w × d с центром (cx, cz) на высоте y.
export function minis(level, S, xa, xb, zFront, LEVELS) {
  const list = [];
  for (let i = Math.max(0, level.index - 3); i < level.index; i++) if (LEVELS && LEVELS[i]) list.push(LEVELS[i]);
  if (!list.length || xb <= xa) return [];
  const s = S.scale, gap = 1.2 * s, margin = 0.5 * s;
  const ks = list.map(function (L) {
    const f = L.footprint;
    return Math.min(0.22 * s, 3.4 * s / Math.max(f.maxX - f.minX + 1, f.maxZ - f.minZ + 1, f.maxY + 1));
  });
  let width = gap * (list.length - 1);
  for (let i = 0; i < list.length; i++) width += (list[i].footprint.maxX - list[i].footprint.minX + 1) * ks[i] + margin;
  const fit = Math.min(1, (xb - xa) / width);
  let x = (xa + xb) / 2 - width * fit / 2;
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const L = list[i], f = L.footprint, k = ks[i] * fit;
    const w = (f.maxX - f.minX + 1) * k + margin * fit;
    const d = (f.maxZ - f.minZ + 1) * k + margin * fit;
    const pcx = x + w / 2, pcz = zFront - d / 2;
    const y = S.y(pcx, pcz);
    out.push({ level: L, cx: pcx, cz: pcz, y: y, w: w, d: d, h: 0.2 * s, k: k,
      ox: pcx - (f.minX + f.maxX + 1) / 2 * k, oy: y + 0.2 * s, oz: pcz - (f.minZ + f.maxZ + 1) / 2 * k });
    x += w + gap * fit;
  }
  return out;
}

function hull(points) {
  points.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  const lower = [], upper = [];
  for (let i = 0; i < points.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) lower.pop();
    lower.push(points[i]);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) upper.pop();
    upper.push(points[i]);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}
function outside(h, x, z) {
  let inside = true, best = Infinity;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const ex = b[0] - a[0], ez = b[1] - a[1];
    if (ex * (z - a[1]) - ez * (x - a[0]) < 0) inside = false;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1)));
    best = Math.min(best, Math.hypot(a[0] + ex * t - x, a[1] + ez * t - z));
  }
  return inside ? 0 : best;
}

// Стоянки техники (art/props.js parking + build): все четыре машины по порядку ступеней, мордой к въезду
// вполоборота; tier — с какой ступени машина видна (i < tier).
export function machines(level, S, cx, cz, extra) {
  const f = level.footprint;
  const pts = [[f.minX - 1, f.minZ - 1], [f.maxX + 2, f.minZ - 1], [f.minX - 1, f.maxZ + 2], [f.maxX + 2, f.maxZ + 2]];
  for (let i = 0; i < extra.length; i++) pts.push([extra[i].x + 0.5, extra[i].z + 0.5]);
  for (let i = 0; i < level.rocks.length; i++) pts.push([level.rocks[i].x + 0.5, level.rocks[i].z + 0.5]);
  let front = -Infinity;
  for (let i = 0; i < level.spawnPoints.length; i++) {
    pts.push([level.spawnPoints[i][0] + 0.5, level.spawnPoints[i][2] + 0.5]);
    front = Math.max(front, level.spawnPoints[i][2]);
  }
  for (let i = 0; i < level.mines.length; i++) {
    const mine = level.mines[i];
    pts.push([mine.standX + 0.5, mine.standZ + 0.5]);
    for (let j = 0; j < mine.rocks.length; j++) pts.push([mine.rocks[j].x + 0.5, mine.rocks[j].z + 0.5]);
  }
  const h = hull(pts);
  const dx = Math.round((f.minX + f.maxX) / 2) + 0.5;
  const decor = [dx - 5.6, dx + 4.6, front + 0.6, front + 5.8];
  const taken = [];
  function slot(r) {
    let best = null, bestD = Infinity;
    for (let pass = 0; pass < 2 && !best; pass++) {
      for (let z = S.z0 + r + 1; z <= S.z1 + 3 - r; z += 0.5) {
        for (let x = S.x0 + r + 0.8; x <= S.x1 - r - 0.8; x += 0.5) {
          if (pass === 0 && x < cx) continue;
          const dist = Math.hypot(x - cx, z - cz);
          if (dist >= bestD) continue;
          if (x + r > decor[0] && x - r < decor[1] && z + r > decor[2] && z - r < decor[3]) continue;
          if (outside(h, x, z) < r + 1) continue;
          let clear = true;
          for (let i = 0; i < taken.length && clear; i++) clear = Math.hypot(x - taken[i][0], z - taken[i][1]) >= r + taken[i][2] + 0.5;
          if (!clear) continue;
          best = [x, z]; bestD = dist;
        }
      }
    }
    if (best) taken.push([best[0], best[1], r]);
    return best;
  }
  const out = [];
  for (let i = 0; i < MACHINES.length; i++) {
    const p = slot(MACHINES[i].r);
    if (p) out.push({ kind: MACHINES[i].kind, tier: i + 1, x: p[0], z: p[1], yaw: (p[0] >= cx ? -0.75 : 0.75) + (i % 2 ? 0.12 : -0.1), r: MACHINES[i].r });
  }
  return out;
}

// Площадка снабжения на въезде (art/vehicles.js decorate): самосвал кузовом к стройке и три поддона с блоками.
export function supply(level) {
  const f = level.footprint;
  const cx = Math.round((f.minX + f.maxX) / 2) + 0.5;
  let front = -Infinity;
  for (let i = 0; i < level.spawnPoints.length; i++) front = Math.max(front, level.spawnPoints[i][2]);
  const ids = level.materialIds;
  return {
    truck: { x: cx - 2.6, z: front + 3.2, turn: -Math.PI / 4, materialId: ids[0] },
    pallets: [
      { x: cx + 1.6, z: front + 2.4, turn: 0.1, materialId: ids[1 % ids.length] },
      { x: cx + 2.9, z: front + 2.0, turn: -0.15, materialId: ids[2 % ids.length] },
      { x: cx + 2.3, z: front + 3.5, turn: 0.25, materialId: ids[1 % ids.length] },
    ],
  };
}

// Вся раскладка площадки. MB — window.MicroBuilders (LEVELS), Meta — window.MicroBuildersMeta.
export function layout(world, campaign, meta, MB, Meta) {
  const level = world.level;
  const f = level.footprint;
  const cx = (f.minX + f.maxX) / 2 + 0.5, cz = (f.minZ + f.maxZ) / 2 + 0.5;
  const extra = quarryCells(level, world, campaign, meta, Meta);
  const S = siteFrame(level, extra);
  const back = backdrop(level, S, cx, cz, MB && MB.LEVELS);
  return { level: level, cx: cx, cz: cz, extra: extra, S: S, fence: fenceRuns(S), masts: back.masts, crane: back.crane, cabins: back.cabins, minis: back.minis,
    zRow: back.zRow, machines: machines(level, S, cx, cz, extra), tier: tierOf(level.number), chapter: chapterOf(level), supply: supply(level) };
}

// Колеи оригинала (art/quarry.js tracks) — отрезками дорог для карты покрытия вида (world.js splatMap → roads:
// [[x, z], [x, z], полуширина], метры): два въезда с фронта к двору и по колее от каждого рудника к зданию.
// Кривые колеи оригинала (квадратичные) — по 4 отрезка.
export function roads(world, campaign, meta, Meta, C) {
  const level = world.level, f = level.footprint;
  const k = C || 2;
  const cx = (f.minX + f.maxX) / 2 + 0.5;
  const S = siteFrame(level, quarryCells(level, world, campaign, meta, Meta));
  const bMaxZ = S.z1 - 1;
  const out = [];
  function track(x0, z0, x1, z1, bend, half) {
    const mx = (x0 + x1) / 2 - (z1 - z0) * bend, mz = (z0 + z1) / 2 + (x1 - x0) * bend;
    let px = x0, pz = z0;
    for (let i = 1; i <= 4; i++) {
      const t = i / 4, s = 1 - t;
      const x = s * s * x0 + 2 * s * t * mx + t * t * x1, z = s * s * z0 + 2 * s * t * mz + t * t * z1;
      out.push([[px * k, pz * k], [x * k, z * k], half]);
      px = x; pz = z;
    }
  }
  const yardZ = f.maxZ + 4;
  // въезды — из-за края кадра (у оригинала с 30 клеток, здесь с 16: дальше лес)
  track(cx - 2, bMaxZ + 16, cx - 1, yardZ, 0.12, 1.8);
  track(cx + 6, bMaxZ + 16, cx + 3, yardZ + 1, -0.1, 1.8);
  level.mines.forEach(function (mine, i) {
    const sx = mine.standX + 0.5, sz = mine.standZ + 0.5;
    track(sx, sz, Math.max(f.minX - 1, Math.min(f.maxX + 2, sx)), Math.max(f.minZ - 1, Math.min(f.maxZ + 2, sz)), ((i * 0.37) % 1 - 0.5) * 0.16, 1.5);
  });
  return out;
}

// Дно карьера (у оригинала вся площадка в рамке подковы — земля с колеями, без травы) — овалом для карты покрытия
// вида (world.js splatMap → site: { x, z, rx, rz }, метры): от задней стенки до фронта, между боковыми стенками.
// Глина в splatMap — 1 − smoothstep(d, 0,85, 1,05) по нормированному расстоянию овала: овал раздут так, чтобы вся
// бровка подковы (подножие стенок, и в скруглённых углах) была не дальше d = 0,8 — у стен земля, а не газон.
// Лишнее за бровкой — под стенками и плато карьера.
export function pit(world, campaign, meta, Meta, C) {
  const k = C || 2;
  const S = siteFrame(world.level, quarryCells(world.level, world, campaign, meta, Meta));
  const x = (S.x0 + S.x1) / 2, z = (S.z0 + S.z1 + 3) / 2;
  const hx = (S.x1 - S.x0) / 2 + 0.5, hz = (S.z1 - S.z0 + 3) / 2 + 0.5;
  let f = 0;
  for (let i = 0; i < S.rim.length; i++) f = Math.max(f, Math.hypot((S.rim[i].x - x) / hx, (S.rim[i].z - z) / hz));
  const g = Math.max(1, f / 0.8);
  return { x: x * k, z: z * k, rx: hx * g * k, rz: hz * g * k };
}
