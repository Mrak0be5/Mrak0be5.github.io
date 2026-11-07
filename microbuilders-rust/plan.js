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
export const CELL = 2;
export const WALL_T = 0.36;     // толщина стены, м
export const SLAB_T = 0.24;     // толщина перекрытия
export const TOP_GAP = 0.005;   // верх плиты чуть ниже верха стены: совпавшие грани не мерцают
export const WIN = { w: 1.1, h: 1.1, sill: 0.65 };   // окно: ширина, высота, низ от низа клетки
export const DOOR = { w: 1.1, h: 1.86 };             // дверной проём
export const CAP = { h: 0.07, over: 0.07 };          // слив по верху стены, где выше по чертежу ничего нет
export const TRIM = { w: 0.14, d: 0.04, lip: 0.22, lipD: 0.05 };   // рамка детали: ширина и вынос; пояс фундамента
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
}

// Бруски детали клетки c: { b: [x0, y0, z0, x1, y1, z1], skip: [грани] }.
//   solid — в материале клетки, plate — плита перекрытия, trim — рамки, стойки, сливы, подоконники, пояса
//   (своим материалом, building.js; post — стойка угла, она же в контуре), steel и glass — рама и стекло окна,
//   leaf — полотно двери: { a, along, y, w, h, out } (петля по оси стены a, наружу — out).
// get(x, y, z) — клетка чертежа; built(c) — деталь клетки готова (её грани у готовых соседей не нужны);
// opts.pillar(c) — сечение колонны, opts.glass(c) — стекло в окне поставлено.
export function pieceBoxes(c, get, built, opts) {
  const C = CELL, x0 = c.x * C, y0 = c.y * C, z0 = c.z * C, y1 = y0 + C;
  const cx = x0 + C / 2, cz = z0 + C / 2, h = WALL_T / 2;
  const out = { solid: [], plate: [], trim: [], steel: [], glass: [], leaf: null };
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
  if (c.kind === 'pillar') {
    const p = opts.pillar(c) / 2;
    const dn = get(c.x, c.y - 1, c.z), head = !(up && up.solid && up.kind === 'pillar');
    out.solid.push({ b: [cx - p, y0, cz - p, cx + p, y1, cz + p], skip: head ? vskip.concat([2]) : vskip });
    if (!(dn && dn.solid && dn.kind === 'pillar')) out.trim.push({ b: [cx - p - 0.06, y0, cz - p - 0.06, cx + p + 0.06, y0 + 0.14, cz + p + 0.06], skip: [3] });
    if (head) out.trim.push({ b: [cx - p - o, y1 - 0.1, cz - p - o, cx + p + o, y1, cz + p + o], skip: [] });
    cap(cx - p - o, cz - p - o, cx + p + o, cz + p + o);
    return out;
  }
  if (c.kind === 'plate') {
    // до оси соседних стен (плита заходит в стену; заход — свой брусок, недостроенная плита растёт без него),
    // с готовыми соседями торцы не нужны. Две плиты, зашедшие в одну угловую стену, не перекрываются: заход
    // по z уступает половину клетки заходу по x соседней плиты
    const e = DIRS.map(function (d) { const n = get(c.x + d[0], c.y, c.z + d[1]); return n && n.solid && n.kind === 'wall' ? C / 2 : 0; });
    const plateAt = function (dx, dz) { const n = get(c.x + dx, c.y, c.z + dz); return !!n && n.solid && n.kind === 'plate'; };
    const skip = [];
    DIRS.forEach(function (d, i) { const n = done(d[0], 0, d[1]); if (e[i] > 0 || (n && n.kind !== 'pillar')) skip.push(SIDE_FACE[i]); });
    if (above && above.kind === 'mass') skip.push(2);
    const bottom = y1 - TOP_GAP - SLAB_T, top = y1 - TOP_GAP;
    out.plate.push({ b: [x0, bottom, z0, x0 + C, top, z0 + C], skip: skip });
    DIRS.forEach(function (d, i) {
      if (!e[i]) return;
      const inWall = done(d[0], 0, d[1]) ? [SIDE_FACE[i]] : [];
      const sk = [SIDE_FACE[i ^ 1]].concat(inWall, skip.filter(function (f) { return f === 2; }));
      if (d[0]) {
        const a = d[0] > 0 ? x0 + C : x0 - C / 2;
        out.plate.push({ b: [a, bottom, z0, a + C / 2, top, z0 + C], skip: sk, ext: true });
      } else {
        const lo = plateAt(-1, d[1]) ? C / 2 : 0, hi = plateAt(1, d[1]) ? C / 2 : 0;
        const a = d[1] > 0 ? z0 + C : z0 - C / 2;
        out.plate.push({ b: [x0 + lo, bottom, a, x0 + C - hi, top, a + C / 2], skip: sk, ext: true });
      }
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
    if (alongX) cap(c0, cz - h - o, c1, cz + h + o); else cap(cx - h - o, c0, cx + h + o, c1);
    const ow = (opening === 'door' ? DOOR.w : WIN.w) / 2;
    const ob = opening === 'door' ? y0 : y0 + WIN.sill, ot = opening === 'door' ? y0 + DOOR.h : y0 + WIN.sill + WIN.h;
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
        if (y1 - tw - ot > 0.01) strip(nAxis, p, s, ca - ow, ca + ow, ot, y1 - tw, td);
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
      out.leaf = { a: ca - ow + 0.02, along: alongX ? 'x' : 'z', y: y0, w: 2 * ow - 0.04, h: DOOR.h - 0.03, c: alongX ? cz : cx, out: alongX ? (fz || 1) : (fx || 1) };
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
    if (!on) return;
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
