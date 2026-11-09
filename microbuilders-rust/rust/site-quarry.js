// Карьер площадки: подкова уступов оригинала (art/quarry.js terraces) — три скальные стенки с полками, сверху
// плато, стены сходят на нет к открытому фронту (к камере). Реалистично: стенки — колотая скала (фактура камня)
// со слоями, неровностью и вертикальными следами ковша, у подножия каждой — осыпь щебня, на полках — грунт и
// глыбы, рядом с рудником — жилы его цвета; плато — полоса грунта у бровки и луг, дальше пологий откос к земле
// поляны (у оригинала плато уходит за туман). Плато держит забор, мачты, кран, бытовки и миниатюры: где они стоят,
// ровная часть шире. Координаты рамки — клетки оригинала (site-layout.js), меши — метры вида (×2).
import * as THREE from 'three';
import { rng, Batch, boxUV } from './geo.js?v=9f2863b';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TEXTURE_TILES as TILE } from './textures.js?v=9f2863b';
import { CELL } from './families.js?v=9f2863b';
import { vnoise, fbm, hash2 } from './site-kit.js?v=9f2863b';

const C = CELL;
// средний тон фактуры камня (как в yard.js): цвет оригинала делится на него
const ROCK_BASE = [0.5, 0.47, 0.43];
const _col = new THREE.Color();
// k — доля яркости оригинала: его камень светлее настоящего (известняк и гранит — 0,25–0,4 линейного альбедо)
function tintOf(hex, out, k) {
  _col.setHex(hex).convertSRGBToLinear();
  const f = k === undefined ? 1 : k;
  return out.setRGB(Math.min(3, f * _col.r / Math.pow(ROCK_BASE[0], 2.2)), Math.min(3, f * _col.g / Math.pow(ROCK_BASE[1], 2.2)), Math.min(3, f * _col.b / Math.pow(ROCK_BASE[2], 2.2)));
}

// Тон главы (game.js CHAPTER_LOOKS, по 10 уровней): порода и грунт — rock, трава плато — grass; [r, g, b, доля].
// Как у оригинала: цвет → смесь с его яркостью, окрашенной в тон главы.
const CHAPTER_LOOKS = [
  { rock: [1, 1, 1, 0], grass: [1, 1, 1, 0] },
  { rock: [0.95, 1, 1.12, 0.65], grass: [0.95, 1.05, 1, 0.4] },
  { rock: [1.5, 0.82, 0.6, 0.45], grass: [0.75, 1.3, 0.6, 0.55] },
  { rock: [1.45, 1.18, 0.8, 0.5], grass: [1.35, 1.15, 0.6, 0.45] },
  { rock: [0.72, 0.78, 0.9, 0.7], grass: [1.1, 1, 0.7, 0.35] },
  { rock: [1.25, 1.25, 1.28, 0.55], grass: [0.95, 1.02, 1.05, 0.4] },
];
function chapterTone(c, look) {
  if (!look || !look[3]) return c;
  const l = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  return c.setRGB(c.r + (l * look[0] - c.r) * look[3], c.g + (l * look[1] - c.g) * look[3], c.b + (l * look[2] - c.b) * look[3]);
}

export function buildQuarry(kit, ctx, lay, MB) {
  const S = lay.S, level = lay.level;
  // глава — по номеру уровня (штаб и школа — глава 0, site-layout.js chapterOf); с сезоном world.js тон породы и
  // луга — в шейдере грунтов и скалы (site-kit.js SEASON_U), цвет вершин — без тона главы
  const chapter = CHAPTER_LOOKS[(lay.chapter || 0) % CHAPTER_LOOKS.length] || CHAPTER_LOOKS[0];
  const toneRock = kit.season ? null : chapter.rock, toneGrass = kit.season ? null : chapter.grass;
  const scale = S.scale, Wc = S.W, Hc = S.H, lean = 0.28 * Wc;
  const fine = kit.fine;
  const R = fine ? 7 : 3;           // рядов на стенку
  const SUB = fine ? 3 : 1;         // точек кольца на шаг бровки (0,5 клетки): следы ковша видны с шагом 0,33 м
  const TREAD = fine ? 4 : 2;       // колонок на полку
  const r = rng(level.index * 7919 + 17);
  const ph = r() * 100;
  const crestD = 2 * Wc + lean;     // верхняя бровка от нижней, клетки
  const ground = ctx.ground || function () { return 0; };

  // ---------- кольца: бровка оригинала + продолжение к фронту (стены сходят в землю) ----------
  const rim = S.rim;
  const base = [];
  const a0 = rim[0], a1 = rim[rim.length - 1];
  base.push({ x: a0.x, z: a0.z + 3, nx: a0.nx, nz: a0.nz, s: -3, t: 0 }, { x: a0.x, z: a0.z + 1.5, nx: a0.nx, nz: a0.nz, s: -1.5, t: S.t(0) * 0.4 });
  rim.forEach(function (p) { base.push({ x: p.x, z: p.z, nx: p.nx, nz: p.nz, s: p.s, t: S.t(p.s) }); });
  base.push({ x: a1.x, z: a1.z + 1.5, nx: a1.nx, nz: a1.nz, s: S.total + 1.5, t: S.t(S.total) * 0.4 }, { x: a1.x, z: a1.z + 3, nx: a1.nx, nz: a1.nz, s: S.total + 3, t: 0 });

  // Ширина ровного плато от верхней бровки (клетки): забор с мачтами — всегда, у крана, бытовок и миниатюр —
  // до их дальнего края с запасом.
  const flat = base.map(function () { return S.fenceD + 2.2 * scale - crestD; });
  function need(x, z, radius) {
    let j = 0, best = Infinity;
    for (let i = 0; i < base.length; i++) { const d = (base[i].x - x) * (base[i].x - x) + (base[i].z - z) * (base[i].z - z); if (d < best) { best = d; j = i; } }
    const p = base[j];
    const d = (x - p.x) * p.nx + (z - p.z) * p.nz + radius + 1.5 - crestD;
    for (let i = 0; i < base.length; i++) {
      const ds = Math.abs(base[i].s - p.s);
      const k = 1 - THREE.MathUtils.smoothstep(ds, radius + 1, radius + 8);
      if (k > 0) flat[i] = Math.max(flat[i], flat[i] + (d - flat[i]) * k);
    }
  }
  const s = scale;
  need(lay.crane.x, lay.crane.z, 3.2 * s);
  need(lay.cabins.x - 1.2 * s, lay.cabins.z, 4.6 * s);
  lay.masts.forEach(function (m) { need(m.x, m.z, 1.0 * s); });
  lay.minis.forEach(function (m) { need(m.cx, m.cz, Math.max(m.w, m.d) / 2 + 0.5); });
  // сгладить вдоль бровки: край ровного плато без зубцов
  for (let pass = 0; pass < 3; pass++) {
    const src = flat.slice();
    for (let i = 0; i < flat.length; i++) {
      let sum = 0, n = 0;
      for (let k = -4; k <= 4; k++) { const j = i + k; if (j < 0 || j >= flat.length) continue; sum += Math.max(src[j], src[i] * 0.85); n++; }
      flat[i] = Math.max(src[i], sum / n);
    }
  }
  // откос к земле поляны, клетки: отвал грунта ~1:2 (на больших площадках плато и так уходит к лесу)
  const slopeLen = 3 + 1.4 * S.top;

  // подробные кольца (на «Телефоне» — бровка как есть)
  const rings = [];
  for (let i = 0; i < base.length; i++) {
    const p = base[i];
    if (i === 0) { rings.push(Object.assign({ f: flat[0] }, p)); continue; }
    const q = base[i - 1];
    for (let k = 1; k <= SUB; k++) {
      const u = k / SUB;
      const nx = q.nx + (p.nx - q.nx) * u, nz = q.nz + (p.nz - q.nz) * u, nl = Math.hypot(nx, nz) || 1;
      rings.push({ x: q.x + (p.x - q.x) * u, z: q.z + (p.z - q.z) * u, nx: nx / nl, nz: nz / nl, s: q.s + (p.s - q.s) * u,
        t: q.t + (p.t - q.t) * u, f: flat[i - 1] + (flat[i] - flat[i - 1]) * u });
    }
  }

  // Концы подковы у фронта: где плато ниже ~2 м, стенки, полки и плато плавно уходят под землю поляны (иначе там
  // полосы на газоне, сквозь которые растёт трава вида): за 4–6 м, край — рваный (шум по месту), так что полки
  // зарастают травой поляны пятнами, а не кончаются ровным срезом. e кольца — доля высоты над землёй (0 — на 0,4 м
  // под землёй, 1 — как есть); у точки — со своим шумом. На этих кольцах нет ни забора, ни глыб.
  const SINK0 = 0.5, SINK1 = 2.3;
  rings.forEach(function (g) { g.h = S.top * g.t * C; g.e = THREE.MathUtils.smoothstep(g.h, SINK0, SINK1); });
  function sinkY(i, x, z, y) {
    const g = rings[i];
    if (g.h >= SINK1 + 1.1) return y;
    const e = THREE.MathUtils.smoothstep(g.h + 1.6 * (vnoise(x * 0.31 + 7.1, z * 0.31 - 2.3) - 0.5) + 0.5 * (vnoise(x * 1.1, z * 1.1) - 0.5), SINK0, SINK1);
    if (e >= 1) return y;
    const gy = ground(x, z) - 0.4;
    return gy + (y - gy) * e;
  }

  // Волна стены оригинала (медленный изгиб бровки и неровность по высоте), клетки. tk — доля неровности по высоте:
  // на сужении к фронту стенка низкая, и неровность по высоте положила бы ряды пластинами внахлёст.
  function wave(ring, y, tk) {
    const sp = ring.s;
    const k = tk === undefined ? 1 : tk;
    return 0.35 * scale * Math.sin(sp * 0.13 + ph) + k * 0.25 * scale * (0.5 * Math.sin(sp * 0.45 + y * 1.3 + ph) + 0.3 * Math.sin(sp * 1.25 - y * 2.9 + ph * 1.7) + 0.2 * Math.sin(sp * 2.4 + y * 5.1));
  }
  // Неровность лица стенки, м (наружу из скалы — к карьеру): крупные бугры, слои по 0,6 м со своим выступом,
  // вертикальные лунки ковша (через 2,2 м, на части стен).
  function rough(sm, ym, k) {
    let d = 1.1 * (fbm(sm / 2.1 + k * 13, ym / 1.6, 3) - 0.5) + 0.5 * (vnoise(sm / 6.5 + k * 3, ym / 4) - 0.5);
    // слои по 0,58 м (как швы напластования фактуры скалы): у каждого свой выступ, блоки слоя — свой
    const layer = Math.floor(ym / 0.58 + 0.55 * vnoise(sm * 0.13, ym * 0.3));
    d += 0.22 * (hash2(layer + k * 31, Math.floor(sm / 3.2 + hash2(layer, 7) * 3)) - 0.5);
    if (fine) {
      const f = sm / 2.2 - Math.floor(sm / 2.2);
      const on = THREE.MathUtils.smoothstep(vnoise(sm * 0.07 + 3, k * 2.3), 0.4, 0.55);
      d -= 0.2 * on * (1 - (2 * f - 1) * (2 * f - 1));
    }
    return d;
  }
  // Ближайший рудник к точке бровки — жилы его цвета в стенке (как у оригинала, ближе 11 клеток).
  function nearMine(x, z) {
    let best = null, bd = Infinity;
    level.mines.forEach(function (m) { const d = Math.hypot(m.x + 0.5 - x, m.z + 0.5 - z); if (d < bd) { bd = d; best = m; } });
    return { mine: best, d: bd };
  }
  const near = rings.map(function (g) { return nearMine(g.x, g.z); });
  const oreTint = {};
  level.mines.forEach(function (m) { oreTint[m.materialId] = tintOf(MB.MATERIAL[m.materialId] ? MB.MATERIAL[m.materialId].color : 0x999999, new THREE.Color(), 0.7); });
  // сдвиг по неровной бровке (общий у стенки и полки над ней)
  function crestJit(ring, k) { return 0.06 * (vnoise(ring.s * 1.7, k * 9 + 1) - 0.5) * scale; }
  const faceNy = lean / Math.hypot(lean, Hc), faceNd = -Hc / Math.hypot(lean, Hc);

  // ---------- профиль каждого кольца ----------
  // Стенки: R + 1 точек на каждую — d (клетки от нижней бровки наружу) и y (м, с сужением), с неровностью лица.
  // Вверх по стенке d не убывает (без навесов): общий профиль у сетки стенок, полок, осыпей, глыб, heightAt и
  // камешков — всё стоит на той поверхности, что видна.
  const NW = R + 1, NP = 3 * NW;
  const WD = new Float32Array(rings.length * NP), WY = new Float32Array(rings.length * NP);
  const minStep = 0.3 * lean / R;
  for (let i = 0; i < rings.length; i++) {
    const g = rings[i];
    g.i = i;
    const tk = THREE.MathUtils.smoothstep(g.t, 0.12, 0.6);
    const rk = Math.min(1, g.t * 1.6) * tk;
    for (let k = 0; k < 3; k++) {
      let prev = -Infinity;
      for (let j = 0; j <= R; j++) {
        const y = (k + j / R) * Hc;
        let d = k * Wc + lean * j / R + wave(g, y, tk);
        if (j === R) d += crestJit(g, k);
        let ym = y * g.t * C;
        if (j > 0 && j < R) {
          const dd = rough(g.s * C, y * C, k) * rk;
          d += faceNd * dd / C;
          ym += faceNy * dd * g.t;
        }
        if (j > 0) d = Math.max(d, prev + minStep);
        // подножие нижней стенки — в землю поляны (без щели, если земля карьера ниже нуля)
        if (k === 0 && j === 0) ym = Math.min(0, ground((g.x + g.nx * d) * C, (g.z + g.nz * d) * C) - 0.12);
        prev = d;
        WD[i * NP + k * NW + j] = d;
        WY[i * NP + k * NW + j] = ym;
      }
    }
  }
  function wd(i, k, j) { return WD[i * NP + k * NW + j]; }
  function wy(i, k, j) { return WY[i * NP + k * NW + j]; }
  const strip = rings.map(function (g) { return 1.2 * scale * (0.55 + 0.9 * vnoise(g.s * 0.23, 5)); });
  // край ровного плато (клетки от нижней бровки)
  const flatEnd = rings.map(function (g, i) { return Math.max(crestD + Math.max(strip[i] + 0.5, g.f), wd(i, 2, R) + 0.4); });
  // Осыпь у подножия каждой стенки: профиль вала (доля длины к карьеру — доля высоты) и высота вала, м.
  const SP = [[-1, -0.06], [-0.6, 0.38], [-0.25, 0.8], [0, 1.0], [0.6, 0.7]];
  const HS = new Float32Array(rings.length * 3);
  rings.forEach(function (g, i) {
    for (let k = 0; k < 3; k++) {
      const n = fbm(g.s * 0.31 + k * 3.3, k, 2);
      HS[i * 3 + k] = (0.08 + 0.85 * Math.max(0, n - 0.3)) * Math.min(1, g.t * 1.3) * Math.sqrt(scale);
    }
  });
  // верх осыпи по лицу стенки: доля шага первого ряда
  function screeClimb(i, k) {
    const base = wd(i, k, 0), yb = k === 0 ? 0 : wy(i, k, 0);
    return (wd(i, k, 1) - base) * Math.min(1, HS[i * 3 + k] / Math.max(0.05, wy(i, k, 1) - yb));
  }
  // высота осыпи стенки k кольца i на расстоянии d (−Infinity — вне вала); yb — подошва (на дне — земля)
  function screeAt(i, k, d, yb) {
    const hs = HS[i * 3 + k], len = hs * 1.6 / C, base = wd(i, k, 0);
    if (hs < 0.01 || d <= base - len) return -Infinity;
    const up = SP[4][0] * screeClimb(i, k);
    if (d >= base + up) return -Infinity;
    const u = d < base ? (d - base) / len : (d - base) / Math.max(1e-6, up) * SP[4][0];
    for (let n = 1; n < SP.length; n++) {
      if (u <= SP[n][0]) { const a = SP[n - 1], b = SP[n]; return yb + hs * (a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0])); }
    }
    return -Infinity;
  }
  // Вал безопасности у верхней бровки (у оригинала — плотный ряд глыб по краю плато): насыпь грунта с колотой
  // скалой 0,4–0,85 м в 1–1,6 м от бровки, с проходами; на нём — глыбы. По кольцу: центр и полуширина (клетки от
  // нижней бровки), высота (м); у низких стенок к фронту вала нет.
  const BW = new Float32Array(rings.length * 3);
  rings.forEach(function (g, i) {
    const tk = THREE.MathUtils.smoothstep(g.t, 0.45, 0.8);
    const gap = THREE.MathUtils.smoothstep(vnoise(g.s * 0.085 + 5.3, 2.7), 0.2, 0.32);
    BW[i * 3] = wd(i, 2, R) + (0.5 + 0.3 * vnoise(g.s * 0.21, 8.1)) * scale;
    BW[i * 3 + 1] = (0.4 + 0.15 * vnoise(g.s * 0.33, 4.4)) * scale;
    BW[i * 3 + 2] = (0.4 + 0.45 * fbm(g.s * 0.27, 1.9, 2)) * Math.sqrt(scale) * tk * gap;
  });
  function bermProf(u) { const a = Math.max(0, 1 - u * u); return a * Math.sqrt(a); }
  // высота вала над плато (м) на расстоянии d; −Infinity — вне вала (края вала — на 9 см под плато)
  function bermAt(i, d) {
    const hb = BW[i * 3 + 2];
    if (hb < 0.01) return -Infinity;
    const u = (d - BW[i * 3]) / BW[i * 3 + 1];
    if (u <= -1 || u >= 1) return -Infinity;
    return hb * bermProf(u) - 0.09;
  }
  // Высота поверхности кольца i на расстоянии d (клетки) от его нижней бровки, м: дно — земля поляны, стенки и
  // полки — по профилю, плато — ровно (с валом у бровки), откос — плавно к земле.
  function surf(i, d) {
    const y = surfRaw(i, d), g = rings[i];
    if (g.h >= SINK1 + 1.1) return y;
    // утопленный конец подковы: видна земля поляны
    const gx = (g.x + g.nx * d) * C, gz = (g.z + g.nz * d) * C;
    return Math.max(ground(gx, gz), sinkY(i, gx, gz, y));
  }
  function surfRaw(i, d) {
    const g = rings[i], o = i * NP;
    const x = (g.x + g.nx * d) * C, z = (g.z + g.nz * d) * C;
    let y = null;
    if (d <= WD[o]) y = ground(x, z);
    else {
      let pd = WD[o], py = WY[o];
      for (let n = 1; n < NP && y === null; n++) {
        const nd = WD[o + n], ny = WY[o + n];
        if (d <= nd) y = py + (ny - py) * (d - pd) / Math.max(1e-6, nd - pd);
        pd = nd; py = ny;
      }
      if (y === null) {
        const dF = flatEnd[i];
        if (d <= dF) return py + Math.max(0, bermAt(i, d));
        const u = Math.min(1, (d - dF) / slopeLen), k = u * u * (3 - 2 * u);
        return py * (1 - k) + (ground(x, z) - 0.35) * k;
      }
    }
    for (let k = 0; k < 3; k++) y = Math.max(y, screeAt(i, k, d, k === 0 ? ground(x, z) : wy(i, k, 0)));
    return y;
  }
  function nearestRing(x, z) {
    let j = 0, best = Infinity;
    for (let i = 0; i < rings.length; i++) { const d = (rings[i].x - x) * (rings[i].x - x) + (rings[i].z - z) * (rings[i].z - z); if (d < best) { best = d; j = i; } }
    return j;
  }

  // ---------- сетки ----------
  function grid() { return { pos: [], col: [], uv: [], idx: [], cols: 0 }; }
  function quadStrip(g, cols, point, color, uvOf) {
    const startV = g.pos.length / 3;
    const along = new Float32Array(cols);
    let prev = null;
    for (let i = 0; i < rings.length; i++) {
      const cur = [];
      for (let j = 0; j < cols; j++) {
        const p = point(i, j);
        p[1] = sinkY(i, p[0], p[2], p[1]);
        cur.push(p);
        if (prev) along[j] += Math.hypot(p[0] - prev[j][0], p[2] - prev[j][2]);
        g.pos.push(p[0], p[1], p[2]);
        const c = color(i, j, p);
        g.col.push(c.r, c.g, c.b);
        const q = uvOf(i, j, p, along[j]);
        g.uv.push(q[0], q[1]);
        if (i > 0 && j > 0) {
          const a = startV + (i - 1) * cols + j - 1, b = startV + i * cols + j - 1;
          g.idx.push(a, b + 1, b, a, a + 1, b + 1);
        }
      }
      prev = cur;
    }
  }
  function mesh(g, material, cast, look) {
    if (look && look[3]) {
      for (let i = 0; i < g.col.length; i += 3) {
        tmpC.setRGB(g.col[i], g.col[i + 1], g.col[i + 2]);
        chapterTone(tmpC, look);
        g.col[i] = tmpC.r; g.col[i + 1] = tmpC.g; g.col[i + 2] = tmpC.b;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
    geo.setIndex(g.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(g.idx, 1) : new THREE.Uint16BufferAttribute(g.idx, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, material);
    m.castShadow = !!cast;
    m.receiveShadow = true;
    return m;
  }
  // точка кольца: d — от нижней бровки наружу (клетки), ym — высота (м)
  function pt(ring, d, ym) { return [(ring.x + ring.nx * d) * C, ym, (ring.z + ring.nz * d) * C]; }

  const groupQ = new THREE.Group();
  groupQ.name = 'quarry';
  const tone = new THREE.Color(), tmp = new THREE.Color(), tmpC = new THREE.Color();
  const rockA = tintOf(0xb8b1a5, new THREE.Color(), 0.62), rockB = tintOf(0x9a948a, new THREE.Color(), 0.62);

  // Стенки: R + 1 рядов от подножия до бровки по профилю колец.
  const rock = grid();
  const tileR = TILE.stone || [2, 2];
  for (let k = 0; k < 3; k++) {
    quadStrip(rock, R + 1, function (i, j) {
      return pt(rings[i], wd(i, k, j), wy(i, k, j));
    }, function (i, j, p) {
      const g = rings[i];
      tone.copy(rockA).lerp(rockB, 0.5 + 0.5 * Math.sin(g.s * 0.21 + k * 1.9 + ph));
      // низ стенки — в тени полки и сырой, верх у бровки — светлее и пыльный
      tone.multiplyScalar(0.7 + 0.3 * Math.pow(j / R, 0.8));
      const m = near[i];
      if (m.mine && m.d < 11 && oreTint[m.mine.materialId]) {
        const y = p[1] / C;
        const vein = Math.max(0, Math.sin(g.s * 0.8 + y * 2.1 + k) * Math.sin(g.s * 0.31 - y * 0.7 + ph));
        tone.lerp(oreTint[m.mine.materialId], 0.55 * vein * (1 - m.d / 11));
      }
      return tone;
    }, function (i, j, p, along) { return [along / tileR[0] + k * 0.37, p[1] / tileR[1]]; });
  }
  groupQ.add(mesh(rock, kit.own.rock, true, toneRock));

  // Полки и плато: грунт от бровки до подножия следующей стенки; у верхней бровки — полоса грунта, дальше луг.
  const dirt = grid(), grass = grid(), bench = grid();
  const tileD = kit.own.dirt.userData.tile || [4, 4], tileG = kit.own.grass.userData.tile || [4, 4], tileB = kit.own.gravel.userData.tile || [2, 2];
  const dirtTone = function (i) { const n = vnoise(rings[i].s * 0.4, 3); return tmp.setRGB(1.02 - 0.08 * n, 0.98 - 0.08 * n, 0.94 - 0.1 * n); };
  // полки — щебень с бурыми пятнами грунта, у подножия следующей стенки темнее (тень и сырость)
  const benchTone = function (i, j) {
    const n = vnoise(rings[i].s * 0.35, j * 0.7 + 11);
    const k = 0.8 + 0.12 * n - 0.1 * (j / TREAD);
    return tmp.setRGB(k * (0.98 + 0.1 * n), k * (0.95 + 0.04 * n), k * (0.9 - 0.04 * n));
  };
  for (let k = 0; k < 2; k++) {
    quadStrip(bench, TREAD + 1, function (i, j) {
      const g = rings[i];
      const u = j / TREAD;
      const dA = wd(i, k, R), dB = wd(i, k + 1, 0), y = wy(i, k, R);
      const p = pt(g, dA + (dB - dA) * u, y);
      if (j > 0 && j < TREAD) p[1] += (0.05 * (vnoise(g.s * 1.3, u * 3 + k * 7) - 0.5) - 0.04 * Math.sin(u * Math.PI)) * g.t;
      return p;
    }, benchTone, function (i, j, p) { return [p[0] / tileB[0], p[2] / tileB[1]]; });
  }
  // вал у верхней бровки: щебень с грунтом, буро-серый, по гребню неровный
  const BC = fine ? 9 : 5;
  quadStrip(bench, BC, function (i, j) {
    const g = rings[i];
    const u = -1 + 2 * j / (BC - 1);
    const hb = BW[i * 3 + 2];
    const p = pt(g, BW[i * 3] + u * BW[i * 3 + 1], wy(i, 2, R) + hb * bermProf(u) - 0.09);
    if (j > 0 && j < BC - 1) p[1] += hb * 0.16 * (vnoise(g.s * 1.9, j * 1.7) - 0.5);
    return p;
  }, function (i, j) {
    const n = vnoise(rings[i].s * 0.45, j * 0.9 + 3);
    const k = 0.74 + 0.14 * n + 0.08 * Math.sin(Math.PI * j / (BC - 1));
    return tmp.setRGB(k * 1.04, k * 0.95, k * 0.84);
  }, function (i, j, p) { return [p[0] / tileB[0], p[2] / tileB[1]]; });
  // плато: бровка, край полосы грунта (неровный), луг до края ровного, откос к земле поляны
  const SL = 5;
  function plateau(i, j) {
    const g = rings[i];
    const top = wy(i, 2, R);
    if (j === 0) return pt(g, wd(i, 2, R), top);
    const dS = Math.max(crestD + strip[i], wd(i, 2, R) + 0.2);
    if (j === 1) return pt(g, dS, top);
    const dF = flatEnd[i];
    if (j < 2 + 2) {
      // ровное плато: две колонки — середина и край
      const d = j === 2 ? (dS + dF) / 2 : dF;
      const p = pt(g, d, top);
      p[1] += 0.12 * (vnoise(g.s * 0.5, j * 3.1) - 0.5) * Math.min(1, g.t * 2);
      return p;
    }
    // откос: плавно к земле (чуть в неё, без щели)
    const u = (j - 3) / SL;
    const p = pt(g, dF + slopeLen * u, top);
    const k = u * u * (3 - 2 * u);
    p[1] = top * (1 - k) + (ground(p[0], p[2]) - 0.35) * k;
    return p;
  }
  quadStrip(dirt, 2, function (i, j) { return plateau(i, j); }, function (i) { return dirtTone(i); }, function (i, j, p) { return [p[0] / tileD[0], p[2] / tileD[1]]; });
  quadStrip(grass, 3 + SL, function (i, j) { return plateau(i, j + 1); }, function (i, j) {
    const n = vnoise(rings[i].s * 0.17, j);
    return tmp.setRGB(0.92 + 0.12 * n, 0.94 + 0.08 * n, 0.86 + 0.06 * n).multiplyScalar(j === 0 ? 0.9 : 1);
  }, function (i, j, p) { return [p[0] / tileG[0], p[2] / tileG[1]]; });
  groupQ.add(mesh(dirt, kit.own.dirt, false, toneRock));
  groupQ.add(mesh(grass, kit.own.grass, false, toneGrass));

  // Осыпи у подножия стенок: вал щебня 0,2–0,8 м, местами почти нет; внутренний край уходит в скалу ниже гребня.
  // Развёртка — вдоль стенки и по профилю осыпи (без растяжки на крутом).
  // на «Телефоне» осыпи — в одной сетке с полками (тот же щебень, без тени): на вызов отрисовки меньше
  const scree = fine ? grid() : bench;
  const tileS = kit.own.gravel.userData.tile || [2, 2];
  const screeTone = new THREE.Color(0.94, 0.92, 0.88);
  for (let k = 0; k < 3; k++) {
    quadStrip(scree, SP.length, function (i, j) {
      const g = rings[i];
      const hs = HS[i * 3 + k];
      const len = hs * 1.6 / C;
      const base = wd(i, k, 0);
      const yb = k === 0 ? 0 : wy(i, k, 0);
      const q = SP[j];
      // наверх — по лицу стенки (не выше гребня осыпи)
      const d = q[0] < 0 ? base + q[0] * len : base + q[0] * screeClimb(i, k);
      const p = pt(g, d, yb + hs * q[1]);
      // на дне — по земле поляны (край в неё чуть уходит)
      if (k === 0) p[1] = ground(p[0], p[2]) + hs * q[1];
      return p;
    }, function () { return screeTone; }, function (i, j, p, along) {
      const hs = HS[i * 3 + k];
      return [along / tileS[0], (SP[j][0] + 1) * hs * 1.8 / tileS[1]];
    });
  }
  if (fine) groupQ.add(mesh(scree, kit.own.gravel, true, toneRock));
  groupQ.add(mesh(bench, kit.own.gravel, false, toneRock));

  // Глыбы на полках и у верхней бровки (у оригинала — штабели колотых глыб, плотно, местами в два яруса):
  // взорванная скала 1–3,5 м с плоскими гранями скола и острыми рёбрами, рядом с рудником — с его оттенком;
  // у подножия стенок — обломки помельче (осыпь оригинала).
  const rocks = [];
  const stride = 2 * SUB;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  for (let i = 2 * SUB; i < rings.length - 2 * SUB; i += stride) {
    const g = rings[i];
    if (g.t < 0.35) continue;
    const yaw0 = Math.atan2(g.nx, g.nz);
    const m = nearMine(g.x, g.z);
    for (let k = 0; k < 3; k++) {
      if (r() > (fine ? 0.62 : 0.45)) continue;
      const size = (k === 2 ? 0.85 + r() * 0.9 : 0.6 + r() * 0.45) * scale * C * 0.85;
      const sc = size / C;
      const dA = wd(i, k, R), dB = k < 2 ? wd(i, k + 1, 0) : dA + 2.5 * scale;
      const len = Math.max(0.05, dB - dA);
      const d = dA + 0.15 + sc * 0.45 + r() * Math.max(0.05, len - 0.3 - sc);
      const side = (r() - 0.5) * 0.9;
      const x = (g.x + g.nx * d + g.nz * side) * C, z = (g.z + g.nz * d - g.nx * side) * C;
      tone.copy(rockA).multiplyScalar(0.9 + r() * 0.35).lerp(rockB, r() * 0.5);
      if (m.mine && m.d < 10 && r() < 0.35) tone.lerp(oreTint[m.mine.materialId], 0.3);
      chapterTone(tone, toneRock);
      const y = surf(i, d);
      const h = size * (0.65 + r() * 0.3);
      rocks.push({ x: x, y: y, z: z, w: size * (0.9 + r() * 0.35), h: h, d: size * (0.7 + r() * 0.35), yaw: yaw0 + (r() - 0.5) * 0.9, c: tone.clone(), big: true });
      if (r() < 0.3) {
        const s2 = size * (0.55 + r() * 0.25);
        rocks.push({ x: x + g.nx * 0.25 * size, y: y + h * 0.62, z: z + g.nz * 0.25 * size, w: s2, h: s2 * 0.8, d: s2 * 0.9, yaw: r() * 6, c: tone.clone().multiplyScalar(0.95), big: true });
      }
    }
    // обломки у подножия стенок (на дне — земля поляны, на полках — полка)
    for (let k = 0; k < 3; k++) {
      if (r() > (fine ? 0.45 : 0.2)) continue;
      const n = 1 + Math.floor(r() * (fine ? 3 : 1.5));
      for (let e = 0; e < n; e++) {
        const sz = (0.18 + r() * 0.24) * C * (0.8 + 0.4 * r());
        const d = wd(i, k, 0) - (0.1 + r() * 0.8) * (k === 0 ? 1.2 : 0.6);
        const side = (r() - 0.5) * 1.4;
        const x = (g.x + g.nx * d + g.nz * side) * C, z = (g.z + g.nz * d - g.nx * side) * C;
        tone.copy(rockA).multiplyScalar(0.85 + r() * 0.3).lerp(rockB, r() * 0.6);
        chapterTone(tone, toneRock);
        const y = k === 0 ? ground(x, z) : wy(i, k, 0) - 0.02;
        rocks.push({ x: x, y: y - sz * 0.08, z: z, w: sz, h: sz * (0.5 + r() * 0.3), d: sz * (0.7 + r() * 0.4), yaw: r() * 6, c: tone.clone(), big: false });
      }
    }
  }
  // глыбы на валу: через 1,6–2,8 м, вросшие в насыпь, местами по две
  for (let i = 0; i < rings.length; i += 3 * SUB) {
    const g = rings[i];
    const hb = BW[i * 3 + 2];
    if (hb < 0.18 || r() > 0.72) continue;
    const yaw0 = Math.atan2(g.nx, g.nz);
    const mm = nearMine(g.x, g.z);
    const n = r() < 0.3 ? 2 : 1;
    for (let e = 0; e < n; e++) {
      const size = (0.75 + r() * 0.85) * Math.sqrt(scale);
      const d = BW[i * 3] + (r() - 0.5) * BW[i * 3 + 1] * 0.9;
      const side = (r() - 0.5) * 0.8 + e * 0.6;
      const x = (g.x + g.nx * d + g.nz * side) * C, z = (g.z + g.nz * d - g.nx * side) * C;
      tone.copy(rockA).multiplyScalar(0.85 + r() * 0.35).lerp(rockB, r() * 0.5);
      if (mm.mine && mm.d < 10 && r() < 0.3) tone.lerp(oreTint[mm.mine.materialId], 0.3);
      chapterTone(tone, toneRock);
      const h = size * (0.6 + r() * 0.3);
      rocks.push({ x: x, y: surf(i, d) - h * 0.22, z: z, w: size * (0.9 + r() * 0.4), h: h, d: size * (0.75 + r() * 0.35), yaw: yaw0 + (r() - 0.5) * 1.2, c: tone.clone(), big: true });
    }
  }
  if (rocks.length) {
    const batch = new Batch();
    // на «Телефоне» — грубые заготовки и без тени (глыбы — почти четверть треугольников модуля, издали тень не видна)
    const forms = boulderForms(fine ? 2 : 0, fine ? 8 : 4), small = boulderForms(fine ? 1 : 0, fine ? 5 : 3);
    rocks.forEach(function (o) {
      const set = o.big ? forms : small;
      const form = set[Math.floor(r() * set.length)];
      _e.set((r() - 0.5) * 0.16, o.yaw, (r() - 0.5) * 0.16, 'YXZ');
      // низ заготовки срезан на −0,3: глыба лежит низом на поверхности
      _m.compose(_p.set(o.x, o.y + o.h * 0.28, o.z), _q.setFromEuler(_e), _s.set(o.w, o.h, o.d));
      batch.add(form, _m, o.c);
    });
    // скала стенок (слои, швы, сколы): глыбы — куски тех же стенок, грани не гладкие
    const mesh2 = new THREE.Mesh(batch.geometry(), kit.own.rock);
    mesh2.name = 'boulders';
    mesh2.castShadow = fine;
    mesh2.receiveShadow = true;
    groupQ.add(mesh2);
  }

  // Высота поверхности карьера под точкой (м вида): дно — земля поляны, уступы и плато — по профилю, откос — к земле.
  function heightAt(xm, zm) {
    const x = xm / C, z = zm / C;
    const i = nearestRing(x, z);
    const g = rings[i];
    return surf(i, (x - g.x) * g.nx + (z - g.z) * g.nz);
  }
  // Поверхность кольца для камешков: высота (м) и уклон по профилю (м/м) на расстоянии d (м) от нижней бровки.
  function profile(ring, dm) {
    const d = dm / C, e = 0.05 / C;
    const y = surf(ring.i, d);
    return [y, (surf(ring.i, d + e) - surf(ring.i, d - e)) / 0.1];
  }
  function crestOf(ring) { return wd(ring.i, 2, R) * C; }
  // След карьера (м вида, pad — запас, м): дно в рамке, стенки, полки и ровное плато до начала откоса — там, где
  // стоят забор, мачты, кран, бытовки и миниатюры (деревьям и кустам леса там не место). Откос — нет: дерево у
  // подножия отвала — как в жизни. Утопленные концы подковы — нет.
  function covers(xm, zm, pad) {
    const x = xm / C, z = zm / C, p = (pad || 0) / C;
    if (x > S.x0 - p && x < S.x1 + p && z > S.z0 - p && z < S.z1 + 3 + p) return true;
    const i = nearestRing(x, z), g = rings[i];
    if (g.e < 0.5) return false;
    if ((i === 0 || i === rings.length - 1) && Math.abs((x - g.x) * -g.nz + (z - g.z) * g.nx) > 1 + p) return false;
    const d = (x - g.x) * g.nx + (z - g.z) * g.nz;
    return d > -p && d <= flatEnd[i] + p;
  }
  // дальний край карьера от центра поляны (м): ровное плато и откос
  let reachFlat = 0, reach = 0;
  rings.forEach(function (g, i) {
    if (g.e < 0.5) return;
    reachFlat = Math.max(reachFlat, Math.hypot(g.x + g.nx * flatEnd[i], g.z + g.nz * flatEnd[i]) * C);
    reach = Math.max(reach, Math.hypot(g.x + g.nx * (flatEnd[i] + slopeLen), g.z + g.nz * (flatEnd[i] + slopeLen)) * C);
  });
  return { group: groupQ, heightAt: heightAt, profile: profile, crestOf: crestOf, covers: covers, reach: [Math.round(reachFlat), Math.round(reach)], rings: rings,
    slopes: rings.filter(function (g) { return g.t > 0.5; }) };
}

// Заготовки глыб единичного размера (колотая скала): икосфера, сдвинутая шумом, и 7–10 плоскостей скола близко к
// центру — крупные плоские грани. Треугольники целиком на одном сколе — с нормалью плоскости (грань плоская,
// ребро острое), остальное — гладко; низ срезан — глыба лежит. Без общих вершин: рёбра сколов не сглаживаются.
const FORMS = {};
function boulderForms(detail, count) {
  const key = detail + ':' + count;
  if (FORMS[key]) return FORMS[key];
  const out = [];
  for (let v = 0; v < count; v++) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(0.5, detail).deleteAttribute('normal').deleteAttribute('uv'), 1e-4);
    const pos = g.attributes.position;
    const ox = v * 17.3 + detail * 3.1, oz = v * 5.1;
    // 10–14 сколов на 0,17–0,27 от центра: почти вся поверхность — плоские грани, рёбра острые (взорванная скала)
    const nc = 10 + (v % 5);
    const cuts = [];
    for (let k = 0; k < nc; k++) {
      const a = (k + 0.6 * hash2(v + detail * 31, k)) / nc * Math.PI * 2 * 2.618, b = (hash2(v, k + 7) - 0.32) * 1.7;
      cuts.push([Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b), 0.17 + 0.1 * hash2(v, k + 3)]);
    }
    cuts.push([0, -1, 0, 0.3]);
    const on = new Int8Array(pos.count).fill(-1);
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 1 + 0.2 * (fbm(x * 2.6 + ox, z * 2.6 + y * 1.7 + oz, 3) - 0.5) + 0.06 * (vnoise(x * 7 + oz, y * 7 + ox) - 0.5);
      x *= k; y *= k; z *= k;
      // скол — ближайшая к поверхности плоскость, за которую точка вышла сильнее всего
      for (let pass = 0; pass < 2; pass++) {
        let best = 0, bc = -1;
        for (let c = 0; c < cuts.length; c++) {
          const q = cuts[c];
          const dd = x * q[0] + y * q[1] + z * q[2] - q[3];
          if (dd > best) { best = dd; bc = c; }
        }
        if (bc < 0) break;
        const q = cuts[bc];
        x -= q[0] * best; y -= q[1] * best; z -= q[2] * best;
        on[i] = bc;
      }
      pos.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal, idx = g.index.array;
    const P = new Float32Array(idx.length * 3), N = new Float32Array(idx.length * 3);
    const index = new Uint16Array(idx.length);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const flat = on[a] >= 0 && on[a] === on[b] && on[b] === on[c] ? cuts[on[a]] : null;
      for (let e = 0; e < 3; e++) {
        const vi = idx[t + e], o = (t + e) * 3;
        P[o] = pos.getX(vi); P[o + 1] = pos.getY(vi); P[o + 2] = pos.getZ(vi);
        if (flat) { N[o] = flat[0]; N[o + 1] = flat[1]; N[o + 2] = flat[2]; }
        else { N[o] = nrm.getX(vi); N[o + 1] = nrm.getY(vi); N[o + 2] = nrm.getZ(vi); }
        index[t + e] = t + e;
      }
    }
    // обратно в габарит заготовки: x и z — ±0,5, низ — на −0,3, верх — на +0,5 (сколы съели объём)
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], P[i + a]); hi[a] = Math.max(hi[a], P[i + a]); }
    const sc = [1 / (hi[0] - lo[0]), 0.8 / (hi[1] - lo[1]), 1 / (hi[2] - lo[2])];
    for (let i = 0; i < P.length; i += 3) {
      P[i] = (P[i] - (lo[0] + hi[0]) / 2) * sc[0];
      P[i + 1] = (P[i + 1] - lo[1]) * sc[1] - 0.3;
      P[i + 2] = (P[i + 2] - (lo[2] + hi[2]) / 2) * sc[2];
      const nx = N[i] / sc[0], ny = N[i + 1] / sc[1], nz = N[i + 2] / sc[2], nl = Math.hypot(nx, ny, nz) || 1;
      N[i] = nx / nl; N[i + 1] = ny / nl; N[i + 2] = nz / nl;
    }
    const p = { pos: P, nrm: N, uv: new Float32Array(idx.length * 2), index: index };
    out.push(boxUV(p, 0.5, 0.5, hash2(v, 1), hash2(v, 2)));
  }
  FORMS[key] = out;
  return out;
}
