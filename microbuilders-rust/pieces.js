// Детали как в Rust: фундамент, стена (сплошная, с дверным проёмом, окном, гаражными воротами), фронтон,
// перекрытие, скат крыши, лестница, парапет. Уровни: прутья → дерево → камень → металл → броня; деталь сначала
// встаёт каркасом из прутьев, потом её доводят до уровня чертежа (как улучшение в Rust).
// Каждый этап — набор элементов (жердь, доска, камень, лист, плита) в порядке укладки; элемент кладёт рабочий.
// Геометрия детали — в её локальной системе (стена: x вдоль, y вверх, z наружу), пачки — по материалам.
import * as THREE from 'three';
import { Batch, plank, roundedBox, boxUV, stick, cylinder, torus, corrugated, stone, quad, rng } from './geo.js?v=83604fc';
import { TEXTURE_TILES as TILE } from './textures.js?v=83604fc';

export const GRID = 3;
export const STORY = 3;
export const PLINTH = 0.35;
export const FLOOR_T = 0.25;
export const TIERS = ['twig', 'wood', 'stone', 'metal', 'armored'];
export const TIER_NAMES = { twig: 'прутья', wood: 'дерево', stone: 'камень', metal: 'металл', armored: 'броня' };
export const THICK = { twig: 0.1, wood: 0.14, stone: 0.3, metal: 0.14, armored: 0.22 };
// Что несёт рабочий на этапе и сколько секунд кладёт один элемент (на ×1).
export const CARRY = {
  twig: { kind: 'sticks', work: 1.4 }, wood: { kind: 'planks', work: 1.9 }, stone: { kind: 'stones', work: 2.2 },
  metal: { kind: 'sheets', work: 3.2 }, armored: { kind: 'plates', work: 4.2 },
};

const WHITE = new THREE.Color(1, 1, 1);
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

function M(x, y, z, rx = 0, ry = 0, rz = 0, order = 'XYZ') {
  _e.set(rx, ry, rz, order);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s);
}
// Базис: куда идут локальные оси x, y, z примитива.
function B(x, y, z, ax, ay, az) {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(ax[0], ax[1], ax[2]), new THREE.Vector3(ay[0], ay[1], ay[2]), new THREE.Vector3(az[0], az[1], az[2]));
  m.setPosition(x, y, z);
  return m;
}
const VERT = [[0, 1, 0], [-1, 0, 0], [0, 0, 1]];   // доска стоймя лицом наружу
const STUD = [[0, 1, 0], [0, 0, 1], [1, 0, 0]];    // брус стоймя, широкой гранью поперёк стены
const FLAT = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];   // доска плашмя лицом вверх
const ALONGZ = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]]; // брус вдоль z на ребре

function tint(r, base, spread) {
  const k = 1 + (r() - 0.5) * spread;
  return new THREE.Color(base[0] * k * (1 + (r() - 0.5) * 0.04), base[1] * k, base[2] * k * (1 + (r() - 0.5) * 0.05));
}
const woodTint = function (r) { return tint(r, [1, 1, 1], 0.16); };
const STONE_HUES = [[1.06, 1.0, 0.9], [0.95, 0.96, 1.0], [1.0, 1.0, 1.0], [1.08, 1.02, 0.86], [0.9, 0.9, 0.9]];
const stoneTint = function (r) { return tint(r, STONE_HUES[Math.floor(r() * STONE_HUES.length)], 0.32); };

// Сегмент жерди от (ax, ay) до (bx, by) в плоскости xy стены на глубине z.
function stickBetween(ax, ay, bx, by, z, r, rad) {
  const len = Math.hypot(bx - ax, by - ay);
  const ang = Math.atan2(by - ay, bx - ax);
  const prim = stick(len, rad, rad * (0.72 + r() * 0.15), (r() - 0.5) * 0.05 * Math.min(1, len / 2), TILE.bark);
  return { prim, matrix: M(ax, ay, z, r() * Math.PI * 2, 0, ang, 'ZYX') };
}

// ---------- этап ----------

class Stage {
  constructor(name, carry, work) {
    this.name = name; this.carry = carry; this.work = work;
    this.batches = new Map();
    this.elements = [];
    this.meshes = [];
    this.revealed = 0;
  }
  el(x, y, z, extra) {
    this.elements.push(Object.assign({ pos: new THREE.Vector3(x, y, z), work: this.work, objects: null }, extra || {}));
    return this;
  }
  put(mat, prim, matrix, color) {
    let b = this.batches.get(mat);
    if (!b) { b = new Batch(); this.batches.set(mat, b); }
    b.add(prim, matrix, color || WHITE, this.elements.length - 1);
    return this;
  }
  obj(o) {
    const e = this.elements[this.elements.length - 1];
    (e.objects || (e.objects = [])).push(o);
    o.visible = false;
    return this;
  }
  finish(group, mats) {
    const self = this;
    this.batches.forEach(function (batch, mat) {
      const mesh = new THREE.Mesh(batch.geometry(), mats[mat]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.batch = { ends: batch.ends, countFor: batch.countFor };
      mesh.geometry.setDrawRange(0, 0);
      mesh.visible = false;
      group.add(mesh);
      self.meshes.push(mesh);
    });
    this.batches = null;
  }
  reveal(n) {
    n = Math.max(0, Math.min(this.elements.length, n));
    this.revealed = n;
    this.meshes.forEach(function (m) {
      const c = m.userData.batch.countFor(n);
      m.geometry.setDrawRange(0, c);
      m.visible = c > 0;
    });
    for (let i = 0; i < this.elements.length; i++) {
      const o = this.elements[i].objects;
      if (o) o.forEach(function (x) { x.visible = i < n; });
    }
  }
  hide() { this.meshes.forEach(function (m) { m.visible = false; }); }
  get done() { return this.revealed >= this.elements.length; }
}

// ---------- стены ----------

function openingsFor(kind, L) {
  if (kind === 'door') return [{ x0: L / 2 - 0.55, x1: L / 2 + 0.55, y0: 0, y1: 2.2, kind }];
  if (kind === 'window') return [{ x0: L / 2 - 0.6, x1: L / 2 + 0.6, y0: 0.95, y1: 2.15, kind }];
  if (kind === 'garage') return [{ x0: 0.3, x1: L - 0.3, y0: 0, y1: 2.55, kind }];
  return [];
}

function solidSpans(x0, x1, ya, yb, openings) {
  let spans = [[x0, x1]];
  openings.forEach(function (o) {
    if (o.y1 <= ya + 1e-6 || o.y0 >= yb - 1e-6) return;
    const next = [];
    spans.forEach(function (s) {
      const a = s[0], b = s[1];
      if (o.x1 <= a || o.x0 >= b) { next.push(s); return; }
      if (o.x0 > a) next.push([a, o.x0]);
      if (o.x1 < b) next.push([o.x1, b]);
    });
    spans = next;
  });
  return spans.filter(function (s) { return s[1] - s[0] > 0.03; });
}

// Вертикальные сплошные отрезки столбца [cx0, cx1] от 0 до top.
function solidColumn(cx0, cx1, top, openings) {
  let segs = [[0, top]];
  openings.forEach(function (o) {
    if (o.x1 <= cx0 + 1e-6 || o.x0 >= cx1 - 1e-6) return;
    const next = [];
    segs.forEach(function (s) {
      if (o.y1 <= s[0] || o.y0 >= s[1]) { next.push(s); return; }
      if (o.y0 > s[0]) next.push([s[0], o.y0]);
      if (o.y1 < s[1]) next.push([o.y1, s[1]]);
    });
    segs = next;
  });
  return segs.filter(function (s) { return s[1] - s[0] > 0.04; });
}

function postsFor(w, inset) {
  const posts = [w.xa + inset, w.xb - inset];
  w.openings.forEach(function (o) { posts.push(o.x0 - inset * 0.8, o.x1 + inset * 0.8); });
  posts.sort(function (a, b) { return a - b; });
  const all = [];
  for (let i = 0; i < posts.length; i++) {
    all.push(posts[i]);
    if (i === posts.length - 1) break;
    const a = posts[i], b = posts[i + 1];
    const inOpening = w.openings.some(function (o) { return a >= o.x0 - inset - 0.01 && b <= o.x1 + inset + 0.01 && o.y0 < 0.5; });
    if (inOpening) continue;
    const n = Math.floor((b - a) / 1.05);
    for (let k = 1; k <= n; k++) all.push(a + ((b - a) * k) / (n + 1));
  }
  return all;
}

function topAt(w, x) { return w.top ? Math.min(w.H, w.top(x)) : w.H; }

function twigWall(st, w, r) {
  const posts = postsFor(w, 0.06);
  posts.forEach(function (x) {
    const h = topAt(w, x) - 0.04;
    const s = stickBetween(x, 0.02, x, h, 0, r, 0.031 + r() * 0.008);
    st.el(x, h / 2, 0).put('bark', s.prim, s.matrix, woodTint(r));
  });
  const rails = w.top ? [0.14] : [0.14, w.H * 0.5, w.H - 0.14];
  rails.forEach(function (y) {
    solidSpans(w.xa, w.xb, y - 0.04, y + 0.04, w.openings).forEach(function (sp) {
      const s = stickBetween(sp[0] - 0.02, y, sp[1] + 0.02, y, 0.055, r, 0.027);
      st.el((sp[0] + sp[1]) / 2, y, 0.05).put('bark', s.prim, s.matrix, woodTint(r));
      posts.forEach(function (x) {
        if (x < sp[0] || x > sp[1]) return;
        st.put('rope', torus(0.037, 0.006), M(x, y, 0.025, Math.PI / 2, 0, 0), WHITE);
        st.put('rope', torus(0.033, 0.006), M(x, y + 0.02, 0.04, 0, Math.PI / 2, 0), WHITE);
      });
    });
  });
  // верх фронтона — две наклонные жерди по линии кровли
  if (w.top) {
    const peak = w.peakX;
    [[w.xa, peak], [peak, w.xb]].forEach(function (seg) {
      const ya = topAt(w, seg[0]) - 0.08, yb = topAt(w, seg[1]) - 0.08;
      const s = stickBetween(seg[0], ya, seg[1], yb, 0.055, r, 0.03);
      st.el((seg[0] + seg[1]) / 2, (ya + yb) / 2, 0.05).put('bark', s.prim, s.matrix, woodTint(r));
    });
  }
  w.openings.forEach(function (o) {
    const yh = o.y1 + 0.05;
    const s = stickBetween(o.x0 - 0.1, yh, o.x1 + 0.1, yh, 0.06, r, 0.03);
    st.el((o.x0 + o.x1) / 2, yh, 0.05).put('bark', s.prim, s.matrix, woodTint(r));
    if (o.y0 > 0.2) {
      const s2 = stickBetween(o.x0 - 0.1, o.y0 - 0.05, o.x1 + 0.1, o.y0 - 0.05, 0.06, r, 0.03);
      st.el((o.x0 + o.x1) / 2, o.y0 - 0.05, 0.05).put('bark', s2.prim, s2.matrix, woodTint(r));
    }
  });
  // раскосы в глухих пролётах
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i] + 0.03, b = posts[i + 1] - 0.03;
    if (b - a < 0.45) continue;
    if (w.openings.some(function (o) { return o.x1 > a && o.x0 < b; })) continue;
    const h = Math.min(topAt(w, a), topAt(w, b)) - 0.18;
    if (h < 0.6) continue;
    const flip = i % 2 === 0;
    const s = stickBetween(a, flip ? 0.16 : h, b, flip ? h : 0.16, -0.05, r, 0.025);
    st.el((a + b) / 2, h / 2, -0.05).put('bark', s.prim, s.matrix, woodTint(r));
  }
}

function woodWall(st, w, r) {
  const t = 0.022;
  const posts = postsFor(w, 0.05);
  posts.forEach(function (x) {
    const h = topAt(w, x);
    st.el(x, h / 2, -0.02).put('planks', plank(h, 0.1, 0.05, Math.floor(r() * 8), r() * 0.5), B(x, h / 2, -0.02, STUD[0], STUD[1], STUD[2]), woodTint(r));
  });
  const battens = w.top ? [0.35] : [0.35, w.H * 0.5 + 0.1, w.H - 0.3];
  battens.forEach(function (y) {
    solidSpans(w.xa, w.xb, y - 0.06, y + 0.06, w.openings).forEach(function (sp) {
      const len = sp[1] - sp[0];
      st.el((sp[0] + sp[1]) / 2, y, -0.085).put('planks', plank(len, 0.1, 0.03, Math.floor(r() * 8), r() * 0.4), M((sp[0] + sp[1]) / 2, y, -0.085), woodTint(r));
    });
  });
  const cuts = [];
  w.openings.forEach(function (o) { cuts.push(o.x0, o.x1); });
  let x = w.xa;
  let col = 0;
  while (x < w.xb - 0.03) {
    let bw = 0.15 + r() * 0.08;
    if (w.xb - (x + bw) < 0.09) bw = w.xb - x;
    cuts.forEach(function (c) { if (c > x + 0.04 && c < x + bw - 0.005) bw = c - x; });
    const cx = x + bw / 2;
    const top = w.top ? Math.min(topAt(w, x), topAt(w, x + bw)) : w.H;
    solidColumn(x + 0.01, x + bw - 0.01, top, w.openings).forEach(function (seg) {
      const len = seg[1] - seg[0];
      const cy = (seg[0] + seg[1]) / 2;
      const z = 0.03 + t / 2 + (r() - 0.5) * 0.003;
      const m = B(cx, cy, z, VERT[0], VERT[1], VERT[2]).multiply(M(0, 0, 0, 0, (r() - 0.5) * 0.008, (r() - 0.5) * 0.005));
      st.el(cx, cy, z).put('planks', plank(len - 0.004, bw - 0.004, t, Math.floor(r() * 8), r() * (1 - len / 3) * 0.95), m, woodTint(r));
      battens.forEach(function (by) {
        if (by < seg[0] + 0.03 || by > seg[1] - 0.03) return;
        [-0.25, 0.25].forEach(function (k) {
          st.put('blacksteel', cylinder(0.0045, 0.0045, 0.004, 6), M(cx + bw * k, by + (r() - 0.5) * 0.02, 0.03 + t, Math.PI / 2, 0, 0), WHITE);
        });
      });
    });
    x += bw;
    col++;
  }
  // наличники проёмов
  w.openings.forEach(function (o) {
    const zt = 0.03 + t + 0.012;
    [o.x0 - 0.05, o.x1 + 0.05].forEach(function (cx) {
      const len = o.y1 - o.y0 + (o.y0 > 0 ? 0.1 : 0.05);
      const cy = o.y0 + len / 2 - (o.y0 > 0 ? 0.05 : 0);
      st.el(cx, cy, zt).put('planks', plank(len, 0.1, 0.024, Math.floor(r() * 8), 0.1), B(cx, cy, zt, VERT[0], VERT[1], VERT[2]), woodTint(r));
    });
    const hw = o.x1 - o.x0 + 0.3;
    st.el((o.x0 + o.x1) / 2, o.y1 + 0.06, zt).put('planks', plank(hw, 0.12, 0.026, Math.floor(r() * 8), 0.2), M((o.x0 + o.x1) / 2, o.y1 + 0.06, zt), woodTint(r));
    if (o.y0 > 0.2) {
      st.el((o.x0 + o.x1) / 2, o.y0 - 0.03, 0.06).put('planks', plank(hw + 0.06, 0.05, 0.13, Math.floor(r() * 8), 0.3), B((o.x0 + o.x1) / 2, o.y0 - 0.03, 0.06, FLAT[0], FLAT[1], FLAT[2]), woodTint(r));
    }
  });
}

// Курсы кладки: границы проёмов — границы курсов, высота курса около 0,29 м.
function courses(w, r, step) {
  const bp = [0, w.H];
  w.openings.forEach(function (o) { if (o.y0 > 0.01) bp.push(o.y0); if (o.y1 < w.H - 0.01) bp.push(o.y1); });
  const pts = Array.from(new Set(bp.map(function (v) { return Math.round(v * 1000) / 1000; }))).sort(function (a, b) { return a - b; });
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.round((b - a) / step));
    const ws = [];
    for (let k = 0; k < n; k++) ws.push(0.8 + r() * 0.4);
    const sum = ws.reduce(function (s, v) { return s + v; }, 0);
    let y = a;
    ws.forEach(function (wv) { const h = ((b - a) * wv) / sum; out.push([y, y + h]); y += h; });
  }
  return out;
}

function stoneWall(st, w, r) {
  const T = 0.3;
  const list = courses(w, r, 0.29);
  list.forEach(function (c, k) {
    const ya = c[0], yb = c[1], h = yb - ya;
    let spans = solidSpans(w.xa, w.xb, ya + 0.005, yb - 0.005, w.openings);
    const lintels = [];
    w.openings.forEach(function (o) {
      if (Math.abs(o.y1 - ya) > 0.002) return;
      const a = o.x0 - 0.24, b = o.x1 + 0.24;
      lintels.push([a, b]);
      const next = [];
      spans.forEach(function (s) {
        if (b <= s[0] || a >= s[1]) { next.push(s); return; }
        if (a > s[0] + 0.15) next.push([s[0], a]);
        if (b < s[1] - 0.15) next.push([b, s[1]]);
      });
      spans = next;
    });
    lintels.forEach(function (l) {
      const len = l[1] - l[0];
      const p = stone(len - 0.014, h - 0.014, T + 0.01, Math.floor(r() * 24), TILE.stone, r(), r());
      st.el((l[0] + l[1]) / 2, ya + h / 2, 0).put('stone', p, M((l[0] + l[1]) / 2, ya + h / 2, (r() - 0.5) * 0.006), stoneTint(r));
    });
    spans.forEach(function (sp) {
      let first = true;
      let x = sp[0];
      if (k % 2 === 1 && sp[1] - sp[0] > 0.9) {
        const half = 0.22 + r() * 0.12;
        addStone(x, half);
        x += half;
      }
      while (x < sp[1] - 0.04) {
        let len = 0.38 + r() * 0.4;
        if (sp[1] - (x + len) < 0.22) len = sp[1] - x;
        addStone(x, len);
        x += len;
      }
      function addStone(x0, len) {
        const cx = x0 + len / 2;
        let hh = h;
        if (w.top) {
          const lim = Math.min(topAt(w, x0), topAt(w, x0 + len)) - ya;
          if (lim < 0.1) return;
          hh = Math.min(h, lim);
        }
        st.el(cx, ya + hh / 2, 0);
        if (first) {
          const mortar = roundedBox(sp[1] - sp[0] - 0.02, h - 0.004, T - 0.05, 0.01, 3);
          boxUV(mortar, TILE.mortar[0], TILE.mortar[1], r(), r());
          if (!w.top) st.put('mortar', mortar, M((sp[0] + sp[1]) / 2, ya + h / 2, 0), WHITE);
          first = false;
        }
        const p = stone(len - 0.014, hh - 0.014, T + (r() - 0.5) * 0.018, Math.floor(r() * 24), TILE.stone, r(), r());
        st.put('stone', p, M(cx, ya + hh / 2, (r() - 0.5) * 0.008, (r() - 0.5) * 0.012, (r() - 0.5) * 0.02, (r() - 0.5) * 0.01), stoneTint(r));
      }
    });
    // подоконник — сразу после курса, на котором стоит окно
    w.openings.forEach(function (o) {
      if (o.y0 < 0.2 || Math.abs(o.y0 - yb) > 0.002) return;
      const len = o.x1 - o.x0 + 0.26;
      const p = stone(len, 0.07, T + 0.09, Math.floor(r() * 24), TILE.stone, r(), r());
      st.el((o.x0 + o.x1) / 2, o.y0 - 0.035, 0.045).put('stone', p, M((o.x0 + o.x1) / 2, o.y0 - 0.03, 0.045), stoneTint(r));
    });
  });
}

function metalWall(st, w, r, sheetMat) {
  const posts = postsFor(w, 0.04);
  posts.forEach(function (x) {
    const h = topAt(w, x);
    const p = boxUV(roundedBox(0.06, h, 0.06, 0.004), 0.5, 0.5);
    st.el(x, h / 2, 0).put('tube', p, M(x, h / 2, 0), WHITE);
  });
  const rails = w.top ? [0.05] : [0.05, w.H * 0.5, w.H - 0.05];
  rails.forEach(function (y) {
    solidSpans(w.xa, w.xb, y - 0.04, y + 0.04, w.openings).forEach(function (sp) {
      const p = boxUV(roundedBox(sp[1] - sp[0], 0.06, 0.06, 0.004), 0.5, 0.5);
      st.el((sp[0] + sp[1]) / 2, y, 0).put('tube', p, M((sp[0] + sp[1]) / 2, y, 0), WHITE);
    });
  });
  const tile = TILE[sheetMat];
  let x = w.xa, col = 0;
  while (x < w.xb - 0.05) {
    let cw = 0.8;
    const lastSheet = w.xb - (x + 0.73) < 0.12;
    if (lastSheet) cw = w.xb - x;
    const top = w.top ? Math.min(topAt(w, x), topAt(w, x + cw)) : w.H;
    const lap = (col % 2) * 0.006;
    const edges = [x, x + cw];
    w.openings.forEach(function (o) { [o.x0, o.x1].forEach(function (e) { if (e > x + 0.01 && e < x + cw - 0.01) edges.push(e); }); });
    edges.sort(function (a, b) { return a - b; });
    const ou = r(), oi = r();
    for (let k = 0; k < edges.length - 1; k++) {
      const sa = edges[k], sb = edges[k + 1];
      if (sb - sa < 0.02) continue;
      const ph = ((sa - x) / 0.076) * Math.PI * 2;
      solidColumn(sa + 0.004, sb - 0.004, top, w.openings).forEach(function (seg) {
        const sh = seg[1] - seg[0];
        const out = corrugated(sb - sa, sh, tile, 0.076, 0.009, ph);
        for (let i = 0; i < out.uv.length; i += 2) out.uv[i] += ou + (sa - x) / tile[0];
        st.el((sa + sb) / 2, seg[0] + sh / 2, 0.05).put(sheetMat, out, M(sa, seg[0], 0.048 + lap), WHITE);
        const inn = corrugated(sb - sa, sh, tile, 0.076, 0.009, 0);
        for (let i = 0; i < inn.uv.length; i += 2) inn.uv[i] += oi;
        st.put(sheetMat, inn, M(sb, seg[0], -0.048 - lap, 0, Math.PI, 0), WHITE);
        rails.forEach(function (ry) {
          if (ry < seg[0] + 0.02 || ry > seg[1] - 0.02) return;
          for (let sx = x + 0.038; sx < x + cw - 0.02; sx += 0.152) {
            if (sx < sa + 0.01 || sx > sb - 0.01) continue;
            st.put('steel', cylinder(0.0065, 0.0065, 0.006, 6), M(sx, ry, 0.06 + lap, Math.PI / 2, 0, 0), WHITE);
          }
        });
      });
    }
    if (lastSheet) break;
    x += cw - 0.07;
    col++;
  }
  w.openings.forEach(function (o) {
    const p1 = boxUV(roundedBox(o.x1 - o.x0 + 0.16, 0.08, 0.15, 0.003), tile[0], tile[1], r(), 0);
    st.el((o.x0 + o.x1) / 2, o.y1 + 0.04, 0.0).put('zinc', p1, M((o.x0 + o.x1) / 2, o.y1 + 0.04, 0), WHITE);
    [o.x0 - 0.02, o.x1 + 0.02].forEach(function (jx) {
      const h = o.y1 - o.y0;
      const p2 = boxUV(roundedBox(0.04, h, 0.15, 0.003), tile[0], tile[1], r(), 0);
      st.el(jx, o.y0 + h / 2, 0).put('zinc', p2, M(jx, o.y0 + h / 2, 0), WHITE);
    });
  });
}

function armoredWall(st, w, r) {
  const posts = postsFor(w, 0.06);
  posts.forEach(function (x) {
    const h = topAt(w, x);
    st.el(x, h / 2, 0).put('tube', boxUV(roundedBox(0.1, h, 0.1, 0.006), 0.5, 0.5), M(x, h / 2, 0), WHITE);
  });
  const bands = courses(w, r, 1.0);
  for (let side = 1; side >= -1; side -= 2) {
    const z = side * 0.085;
    const xs = [w.xa, w.xa + (w.xb - w.xa) / 2, w.xb];
    bands.forEach(function (band) {
      for (let ci = 0; ci < 2; ci++) {
        const a = xs[ci], b = xs[ci + 1];
        let y0 = band[0], y1 = band[1];
        if (w.top) { y1 = Math.min(y1, Math.min(topAt(w, a), topAt(w, b))); if (y1 - y0 < 0.08) continue; }
        solidSpans(a, b, y0 + 0.01, y1 - 0.01, w.openings).forEach(function (sp) {
          const pw = sp[1] - sp[0] - 0.008, ph = y1 - y0 - 0.008;
          if (pw < 0.08) return;
          const p = boxUV(roundedBox(pw, ph, 0.03, 0.006), TILE.steelplate[0], TILE.steelplate[1], r(), r());
          const cx = (sp[0] + sp[1]) / 2, cy = (y0 + y1) / 2;
          st.el(cx, cy, z).put('steelplate', p, M(cx, cy, z), WHITE);
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
            st.put('steel', cylinder(0.014, 0.012, 0.012, 6), M(cx + c[0] * (pw / 2 - 0.05), cy + c[1] * (ph / 2 - 0.05), z + side * 0.015, side * Math.PI / 2, 0, 0), WHITE);
          });
          st.put('steel', cylinder(0.006, 0.006, ph - 0.02, 5, false), M(sp[1] - 0.004, y0 + 0.01, z + side * 0.012), WHITE);
        });
      }
    });
  }
}

// ---------- двери и окна ----------

function leafMeshes(build, mats) {
  const batches = new Map();
  const put = function (mat, prim, m, c) {
    let b = batches.get(mat);
    if (!b) { b = new Batch(); batches.set(mat, b); }
    b.add(prim, m, c || WHITE, 0);
  };
  build(put);
  const g = new THREE.Group();
  batches.forEach(function (b, mat) {
    const mesh = new THREE.Mesh(b.geometry(), mats[mat]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
  });
  return g;
}

function doorInsert(st, w, o, type, mats, r, doors, frame) {
  const T = w.T;
  const wLeaf = o.x1 - o.x0 - 0.1, hLeaf = o.y1 - o.y0 - 0.06;
  // коробка
  const jamb = type === 'wood' ? 'planks' : 'tube';
  [o.x0 + 0.025, o.x1 - 0.025].forEach(function (jx) {
    const p = jamb === 'planks' ? plank(o.y1 - o.y0, T + 0.02, 0.05, Math.floor(r() * 8), 0.2) : boxUV(roundedBox(o.y1 - o.y0, T + 0.02, 0.05, 0.004), 0.5, 0.5);
    st.el(jx, (o.y0 + o.y1) / 2, 0).put(jamb, p, B(jx, (o.y0 + o.y1) / 2, 0, [0, 1, 0], [0, 0, 1], [1, 0, 0]), woodTint(r));
  });
  const hp = jamb === 'planks' ? plank(o.x1 - o.x0, T + 0.02, 0.06, Math.floor(r() * 8), 0.2) : boxUV(roundedBox(o.x1 - o.x0, T + 0.02, 0.06, 0.004), 0.5, 0.5);
  st.el((o.x0 + o.x1) / 2, o.y1 - 0.03, 0).put(jamb, hp, B((o.x0 + o.x1) / 2, o.y1 - 0.03, 0, [1, 0, 0], [0, 0, 1], [0, -1, 0]), woodTint(r));

  // полотно на петлях (своя группа — открывается перед рабочим)
  const pivot = new THREE.Group();
  pivot.position.set(o.x0 + 0.05, o.y0 + 0.02, T * 0.25);
  const leaf = leafMeshes(function (put) {
    if (type === 'wood') {
      const n = 5, bw = wLeaf / n;
      for (let i = 0; i < n; i++) {
        put('planks', plank(hLeaf, bw - 0.004, 0.032, Math.floor(r() * 8), r() * 0.3), B(bw * (i + 0.5), hLeaf / 2, 0, VERT[0], VERT[1], VERT[2]), new THREE.Color(0.62, 0.68, 0.6).multiplyScalar(0.9 + r() * 0.15));
      }
      [0.25, hLeaf - 0.25].forEach(function (y) {
        put('planks', plank(wLeaf - 0.06, 0.13, 0.03, Math.floor(r() * 8), 0.2), M(wLeaf / 2, y, -0.031), new THREE.Color(0.6, 0.66, 0.58));
        put('blacksteel', boxUV(roundedBox(wLeaf * 0.75, 0.045, 0.006, 0.002), 0.2, 0.2), M(wLeaf * 0.375, y, 0.02), WHITE);
      });
      const dl = Math.hypot(wLeaf - 0.15, hLeaf - 0.75);
      put('planks', plank(dl, 0.12, 0.03, Math.floor(r() * 8), 0.1), M(wLeaf / 2, hLeaf / 2, -0.031, 0, 0, Math.atan2(hLeaf - 0.75, wLeaf - 0.15)), new THREE.Color(0.6, 0.66, 0.58));
      put('blacksteel', torus(0.045, 0.006), M(wLeaf - 0.12, 1.0, 0.03), WHITE);
    } else {
      const mat = type === 'armored' ? 'steelplate' : 'paintsheet';
      const p = boxUV(roundedBox(wLeaf, hLeaf, type === 'armored' ? 0.07 : 0.05, 0.008), TILE[mat][0], TILE[mat][1], r(), r());
      put(mat, p, M(wLeaf / 2, hLeaf / 2, 0), WHITE);
      if (type === 'armored') {
        for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) put('steel', cylinder(0.012, 0.01, 0.012, 6), M(0.12 + (i * (wLeaf - 0.24)) / 3, 0.15 + (k * (hLeaf - 0.3)) / 5, 0.04, Math.PI / 2, 0, 0), WHITE);
      } else {
        [0.3, hLeaf / 2, hLeaf - 0.3].forEach(function (y) { put('tube', boxUV(roundedBox(wLeaf - 0.08, 0.05, 0.02, 0.004), 0.5, 0.5), M(wLeaf / 2, y, 0.03), WHITE); });
      }
      put('steel', boxUV(roundedBox(0.14, 0.025, 0.03, 0.006), 0.2, 0.2), M(wLeaf - 0.15, 1.0, 0.05), WHITE);
      [0.25, hLeaf - 0.25].forEach(function (y) { put('blacksteel', cylinder(0.018, 0.018, 0.12, 8), M(0.0, y - 0.06, 0), WHITE); });
    }
  }, mats);
  pivot.add(leaf);
  frame.add(pivot);
  st.el((o.x0 + o.x1) / 2, 1.1, 0.1, { work: 6 }).obj(pivot);
  doors.push({ pivot, kind: 'swing', open: 0, target: 0, sign: 1, local: new THREE.Vector3((o.x0 + o.x1) / 2, 1.0, 0) });
}

function garageInsert(st, w, o, mats, r, doors, frame, sheetMat) {
  const T = w.T;
  [o.x0 + 0.03, o.x1 - 0.03].forEach(function (gx) {
    st.el(gx, (o.y0 + o.y1) / 2, -T / 2 - 0.05).put('tube', boxUV(roundedBox(0.06, o.y1 - o.y0, 0.08, 0.004), 0.5, 0.5), M(gx, (o.y0 + o.y1) / 2, -T / 2 - 0.05), WHITE);
  });
  const box = boxUV(roundedBox(o.x1 - o.x0 + 0.1, 0.32, 0.32, 0.01), TILE.zinc[0], TILE.zinc[1], r(), 0);
  st.el((o.x0 + o.x1) / 2, o.y1 + 0.1, -T / 2 - 0.17).put('zinc', box, M((o.x0 + o.x1) / 2, o.y1 + 0.12, -T / 2 - 0.17), WHITE);
  const slatH = 0.078, n = Math.ceil((o.y1 - o.y0) / slatH);
  const width = o.x1 - o.x0 - 0.04;
  const g = new THREE.BoxGeometry(width, slatH - 0.004, 0.018);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) { uv[i] *= width / TILE[sheetMat][0]; uv[i + 1] *= slatH / TILE[sheetMat][1]; }
  const slats = new THREE.InstancedMesh(g, mats[sheetMat], n);
  slats.castShadow = slats.receiveShadow = true;
  slats.frustumCulled = false;
  const color = new THREE.Color(1, 1, 1);
  for (let i = 0; i < n; i++) slats.setColorAt(i, color);
  const holder = new THREE.Group();
  holder.position.set((o.x0 + o.x1) / 2, o.y0, -T / 2 - 0.05);
  holder.add(slats);
  frame.add(holder);
  st.el((o.x0 + o.x1) / 2, 1.2, -0.2, { work: 8 }).obj(holder);
  const door = { kind: 'roll', open: 0, target: 0, slats, n, slatH, height: o.y1 - o.y0, local: new THREE.Vector3((o.x0 + o.x1) / 2, 1.0, 0) };
  door.update = function () {
    const m = new THREE.Matrix4();
    const lift = door.open * (door.height - 0.1);
    for (let i = 0; i < n; i++) {
      const y = i * slatH + slatH / 2 + lift;
      const hidden = y > door.height - 0.02;
      m.makeTranslation(0, hidden ? -100 : y, 0);
      slats.setMatrixAt(i, m);
    }
    slats.instanceMatrix.needsUpdate = true;
  };
  door.update();
  doors.push(door);
}

function windowInsert(st, w, o, type, r) {
  const T = w.T;
  const fw = o.x1 - o.x0, fh = o.y1 - o.y0;
  const cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2;
  const zf = type === 'shutters' || type === 'glass' ? T * 0.15 : 0;
  // рама
  const fr = type === 'bars' || type === 'embrasure' ? 'tube' : 'planks';
  const frameBar = function (len, along, x, y) {
    const p = fr === 'planks' ? plank(len, Math.min(0.14, T + 0.02), 0.06, Math.floor(r() * 8), r() * 0.5) : boxUV(roundedBox(len, Math.min(0.14, T + 0.02), 0.05, 0.004), 0.5, 0.5);
    const m = along === 'x' ? B(x, y, zf, [1, 0, 0], [0, 0, 1], [0, -1, 0]) : B(x, y, zf, [0, 1, 0], [0, 0, 1], [1, 0, 0]);
    st.put(fr, p, m, woodTint(r));
  };
  st.el(cx, cy, zf, { work: 5 });
  frameBar(fw, 'x', cx, o.y0 + 0.03);
  frameBar(fw, 'x', cx, o.y1 - 0.03);
  frameBar(fh - 0.12, 'y', o.x0 + 0.03, cy);
  frameBar(fh - 0.12, 'y', o.x1 - 0.03, cy);
  if (type === 'glass' || type === 'shutters') {
    // переплёт крестом и стекло
    const mull = function (len, along, x, y) {
      const p = plank(len, 0.05, 0.04, Math.floor(r() * 8), 0.3);
      st.put('planks', p, along === 'x' ? M(x, y, zf + 0.01) : B(x, y, zf + 0.01, [0, 1, 0], [-1, 0, 0], [0, 0, 1]), woodTint(r));
    };
    mull(fw - 0.1, 'x', cx, cy);
    mull(fh - 0.1, 'y', cx, cy);
    st.put('glass', quad(fw - 0.1, fh - 0.1), M(o.x0 + 0.05, o.y0 + 0.05, zf), WHITE);
  }
  if (type === 'bars') {
    for (let bx = o.x0 + 0.12; bx < o.x1 - 0.08; bx += 0.13) st.put('blacksteel', cylinder(0.012, 0.012, fh - 0.06, 8), M(bx, o.y0 + 0.03, 0), WHITE);
    [o.y0 + fh * 0.33, o.y0 + fh * 0.66].forEach(function (y) { st.put('blacksteel', boxUV(roundedBox(fw - 0.06, 0.04, 0.012, 0.002), 0.2, 0.2), M(cx, y, 0.02), WHITE); });
  }
  if (type === 'embrasure') {
    const slit = 0.12;
    const ph = (fh - slit) / 2;
    [o.y0 + ph / 2, o.y1 - ph / 2].forEach(function (y) {
      st.put('steelplate', boxUV(roundedBox(fw - 0.02, ph, 0.04, 0.006), TILE.steelplate[0], TILE.steelplate[1], r(), r()), M(cx, y, 0.02), WHITE);
    });
  }
  if (type === 'shutters') {
    const lw = fw / 2;
    [[o.x0, -1], [o.x1, 1]].forEach(function (s) {
      const hinge = new THREE.Matrix4().makeTranslation(s[0] + s[1] * 0.02, o.y0, T / 2 + 0.03).multiply(M(0, 0, 0, 0, s[1] * 2.5, 0));
      for (let i = 0; i < 3; i++) {
        const bw = lw / 3;
        const m = hinge.clone().multiply(B(-s[1] * (bw * (i + 0.5)), fh / 2, 0, [0, 1, 0], [-1, 0, 0], [0, 0, 1]));
        st.put('planks', plank(fh - 0.02, bw - 0.004, 0.025, Math.floor(r() * 8), r() * 0.4), m, new THREE.Color(0.55, 0.64, 0.7));
      }
      [0.25, fh - 0.25].forEach(function (y) {
        st.put('blacksteel', boxUV(roundedBox(lw * 0.8, 0.035, 0.005, 0.002), 0.2, 0.2), hinge.clone().multiply(M(-s[1] * lw * 0.4, y, 0.015)), WHITE);
      });
    });
  }
}

// ---------- сборка детали ----------

// spec стены: xa..xb (м, с выпуском на углах), H, top(x) (фронтон), openings, T (толщина уровня).
export function buildWall(piece, mats, ctx) {
  const r = rng(piece.seed);
  const group = new THREE.Group();
  const L = GRID;
  const w = {
    xa: -(piece.extA || 0), xb: L + (piece.extB || 0), H: piece.height || STORY,
    top: piece.top || null, peakX: piece.peakX, openings: openingsFor(piece.opening, L), T: THICK[piece.tier],
  };
  const stages = [];
  const twig = new Stage('twig', CARRY.twig.kind, CARRY.twig.work);
  twigWall(twig, w, r);
  stages.push(twig);
  if (piece.tier !== 'twig') {
    const fin = new Stage(piece.tier, CARRY[piece.tier].kind, CARRY[piece.tier].work);
    if (piece.tier === 'wood') woodWall(fin, w, r);
    else if (piece.tier === 'stone') stoneWall(fin, w, r);
    else if (piece.tier === 'metal') metalWall(fin, w, r, piece.sheet || 'zinc');
    else armoredWall(fin, w, r);
    stages.push(fin);
  }
  const last = stages[stages.length - 1];
  const doors = [];
  if (piece.tier !== 'twig') w.openings.forEach(function (o) {
    if (o.kind === 'door') doorInsert(last, w, o, piece.insert || 'wood', mats, r, doors, group);
    else if (o.kind === 'window') windowInsert(last, w, o, piece.insert || 'glass', r);
    else if (o.kind === 'garage') garageInsert(last, w, o, mats, r, doors, group, piece.sheet || 'zinc');
  });
  stages.forEach(function (s) { s.finish(group, mats); });
  return { group, stages, doors, openings: w.openings, w };
}

function buildFoundation(piece, mats) {
  const r = rng(piece.seed);
  const group = new THREE.Group();
  const S = GRID, top = PLINTH;
  const ext = piece.exterior || { n: true, s: true, e: true, w: true };
  const stages = [];
  const twig = new Stage('twig', 'sticks', 1.2);
  // разбивка: колья по углам, шнур между ними
  [[0.06, 0.06], [S - 0.06, 0.06], [S - 0.06, S - 0.06], [0.06, S - 0.06]].forEach(function (c) {
    const s = stickBetween(0, -0.3, 0, 0.55, 0, r, 0.025);
    twig.el(c[0], 0.1, c[1]).put('bark', s.prim, new THREE.Matrix4().makeTranslation(c[0], 0, c[1]).multiply(s.matrix), woodTint(r));
  });
  const corners = [[0.06, 0.06], [S - 0.06, 0.06], [S - 0.06, S - 0.06], [0.06, S - 0.06]];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    twig.el((a[0] + b[0]) / 2, 0.3, (a[1] + b[1]) / 2).put('string', cylinder(0.0025, 0.0025, len, 4, false), M(a[0], 0.3, a[1], 0, -ang, -Math.PI / 2, 'YXZ'), WHITE);
  }
  // лежни из жердей
  for (let k = 0; k < 4; k++) {
    const z = 0.4 + k * 0.73;
    const s = stickBetween(0.1, 0, S - 0.1, 0, 0, r, 0.035);
    twig.el(S / 2, 0.05, z).put('bark', s.prim, new THREE.Matrix4().makeTranslation(0, 0.05, z).multiply(s.matrix), woodTint(r));
  }
  stages.push(twig);
  const tier = piece.tier;
  if (tier !== 'twig') {
    const fin = new Stage(tier, CARRY[tier].kind, CARRY[tier].work);
    if (tier === 'wood') {
      [[0.25, 0.25], [S - 0.25, 0.25], [S - 0.25, S - 0.25], [0.25, S - 0.25], [S / 2, S / 2]].forEach(function (c) {
        fin.el(c[0], -0.05, c[1]).put('stone', stone(0.4, 0.3, 0.4, Math.floor(r() * 24), TILE.stone, r(), r()), M(c[0], -0.08, c[1], 0, r(), 0), stoneTint(r));
      });
      [0.12, S - 0.12].forEach(function (z) {
        fin.el(S / 2, top - 0.14, z).put('planks', plank(S, 0.16, 0.16, Math.floor(r() * 8), 0), M(S / 2, top - 0.16, z), woodTint(r));
      });
      for (let k = 0; k < 6; k++) {
        const x = 0.1 + (k * (S - 0.2)) / 5;
        fin.el(x, top - 0.08, S / 2).put('planks', plank(S - 0.04, 0.16, 0.06, Math.floor(r() * 8), 0), B(x, top - 0.1, S / 2, ALONGZ[0], ALONGZ[1], ALONGZ[2]), woodTint(r));
      }
      for (let z = 0.07; z < S; z += 0.145) {
        fin.el(S / 2, top - 0.011, z).put('planks', plank(S, 0.141, 0.022, Math.floor(r() * 8), 0), B(S / 2, top - 0.011, z, FLAT[0], FLAT[1], FLAT[2]), woodTint(r));
      }
    } else if (tier === 'stone' || tier === 'armored') {
      // по периметру (только наружные стороны) — два курса камня, сверху — плиты
      // по кругу n → e → s → w; каждая сторона закрывает угол в своём конце, если следующая тоже наружная
      const ring = [
        { on: ext.n, a: [0, 0], b: [S, 0], n: [0, -1] }, { on: ext.e, a: [S, 0], b: [S, S], n: [1, 0] },
        { on: ext.s, a: [S, S], b: [0, S], n: [0, 1] }, { on: ext.w, a: [0, S], b: [0, 0], n: [-1, 0] },
      ];
      const sides = [];
      ring.forEach(function (sd, i) { if (sd.on) sides.push(Object.assign({ endExt: ring[(i + 1) % 4].on ? 0.22 : 0 }, sd)); });
      const coursesY = [[-0.3, 0.02], [0.02, top - 0.12]];
      coursesY.forEach(function (c, k) {
        sides.forEach(function (sd) {
          const len = S + sd.endExt;
          let x = k % 2 ? 0.2 : 0;
          const dirx = (sd.b[0] - sd.a[0]) / len, dirz = (sd.b[1] - sd.a[1]) / len;
          const ang = Math.atan2(-dirz, dirx);
          while (x < len - 0.05) {
            let sl = 0.45 + r() * 0.35;
            if (len - (x + sl) < 0.25) sl = len - x;
            const cxl = x + sl / 2;
            const px = sd.a[0] + dirx * cxl + sd.n[0] * 0.07, pz = sd.a[1] + dirz * cxl + sd.n[1] * 0.07;
            const h = c[1] - c[0];
            fin.el(px, c[0] + h / 2, pz).put('stone', stone(sl - 0.014, h - 0.014, 0.3, Math.floor(r() * 24), TILE.stone, r(), r()), M(px, c[0] + h / 2, pz, 0, ang + (r() - 0.5) * 0.02, 0), stoneTint(r));
            x += sl;
          }
        });
      });
      const slab = tier === 'armored' ? 'steelplate' : 'concrete';
      [[0.75, 0.75], [2.25, 0.75], [0.75, 2.25], [2.25, 2.25]].forEach(function (c) {
        // наружные четверти — с выступом 0,22 м: стена (по оси ребра) стоит на фундаменте с полкой
        const xa = c[0] < 1.5 && ext.w ? -0.22 : 0, xb = c[0] > 1.5 && ext.e ? 0.22 : 0;
        const za = c[1] < 1.5 && ext.n ? -0.22 : 0, zb = c[1] > 1.5 && ext.s ? 0.22 : 0;
        const w = 1.49 - xa + xb, d = 1.49 - za + zb;
        const p = boxUV(roundedBox(w, 0.13, d, 0.015), TILE[slab][0], TILE[slab][1], r(), r());
        fin.el(c[0], top - 0.065, c[1]).put(slab, p, M(c[0] + (xa + xb) / 2, top - 0.065, c[1] + (za + zb) / 2), WHITE);
      });
    } else if (tier === 'metal') {
      [[S / 2, 0.06, 0], [S / 2, S - 0.06, 0], [0.06, S / 2, 1], [S - 0.06, S / 2, 1]].forEach(function (c) {
        const p = boxUV(roundedBox(S, 0.5, 0.12, 0.006), 0.5, 0.5);
        fin.el(c[0], top - 0.25, c[1]).put('tube', p, M(c[0], top - 0.27, c[1], 0, c[2] ? Math.PI / 2 : 0, 0), WHITE);
      });
      [[0.75, 0.75], [2.25, 0.75], [0.75, 2.25], [2.25, 2.25]].forEach(function (c) {
        const p = boxUV(roundedBox(1.49, 0.012, 1.49, 0.003), TILE.diamond[0], TILE.diamond[1], r(), r());
        fin.el(c[0], top - 0.006, c[1]).put('diamond', p, M(c[0], top - 0.006, c[1]), WHITE);
      });
    }
    stages.push(fin);
  }
  stages.forEach(function (s) { s.finish(group, mats); });
  return { group, stages, doors: [] };
}

function buildFloor(piece, mats) {
  const r = rng(piece.seed);
  const group = new THREE.Group();
  const S = GRID;
  const stages = [];
  const twig = new Stage('twig', 'sticks', 1.2);
  for (let k = 0; k < 6; k++) {
    const z = 0.15 + k * 0.54;
    const s = stickBetween(0, 0, S, 0, 0, r, 0.04);
    twig.el(S / 2, -0.12, z).put('bark', s.prim, new THREE.Matrix4().makeTranslation(0, -0.12, z).multiply(s.matrix), woodTint(r));
  }
  for (let k = 0; k < 4; k++) {
    const x = 0.3 + k * 0.8;
    const s = stickBetween(0, 0, S, 0, 0, r, 0.03);
    twig.el(x, -0.06, S / 2).put('bark', s.prim, new THREE.Matrix4().makeTranslation(x, -0.06, 0).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2)).multiply(s.matrix), woodTint(r));
  }
  stages.push(twig);
  const tier = piece.tier;
  if (tier !== 'twig') {
    const fin = new Stage(tier, CARRY[tier].kind, CARRY[tier].work);
    if (tier === 'wood') {
      for (let k = 0; k < 6; k++) {
        const x = 0.04 + (k * (S - 0.08)) / 5;
        fin.el(x, -0.13, S / 2).put('planks', plank(S, 0.2, 0.06, Math.floor(r() * 8), 0), B(x, -0.122, S / 2, ALONGZ[0], ALONGZ[1], ALONGZ[2]), woodTint(r));
      }
      for (let z = 0.07; z < S; z += 0.145) {
        fin.el(S / 2, -0.011, z).put('planks', plank(S, 0.141, 0.022, Math.floor(r() * 8), 0), B(S / 2, -0.011, z, FLAT[0], FLAT[1], FLAT[2]), woodTint(r));
        for (let k = 0; k < 6; k++) fin.put('blacksteel', cylinder(0.004, 0.004, 0.003, 6), M(0.04 + (k * (S - 0.08)) / 5, 0.0, z), WHITE);
      }
    } else if (tier === 'stone') {
      [0.1, S - 0.1].forEach(function (x) {
        fin.el(x, -0.17, S / 2).put('planks', plank(S, 0.16, 0.12, Math.floor(r() * 8), 0), B(x, -0.17, S / 2, ALONGZ[0], ALONGZ[1], ALONGZ[2]), woodTint(r));
      });
      for (let k = 0; k < 5; k++) {
        const z = 0.3 + k * 0.6;
        const p = boxUV(roundedBox(S - 0.01, 0.15, 0.59, 0.012), TILE.concrete[0], TILE.concrete[1], r(), r());
        fin.el(S / 2, -0.075, z).put('concrete', p, M(S / 2, -0.075, z), WHITE);
      }
    } else {
      [0.1, S / 2, S - 0.1].forEach(function (x) {
        fin.el(x, -0.12, S / 2).put('tube', boxUV(roundedBox(0.08, 0.2, S, 0.004), 0.5, 0.5), M(x, -0.12, S / 2), WHITE);
      });
      const mat = tier === 'armored' ? 'steelplate' : 'diamond';
      const th = tier === 'armored' ? 0.03 : 0.012;
      [[0.75, 0.75], [2.25, 0.75], [0.75, 2.25], [2.25, 2.25]].forEach(function (c) {
        fin.el(c[0], -th / 2, c[1]).put(mat, boxUV(roundedBox(1.49, th, 1.49, 0.003), TILE[mat][0], TILE[mat][1], r(), r()), M(c[0], -th / 2, c[1]), WHITE);
      });
    }
    stages.push(fin);
  }
  stages.forEach(function (s) { s.finish(group, mats); });
  return { group, stages, doors: [] };
}

// Скат: x вдоль конька (0..len), s вдоль ската от карниза вверх, n — нормаль. Основание (s=0) — край свеса.
function buildRoof(piece, mats) {
  const r = rng(piece.seed);
  const group = new THREE.Group();
  const { len, slope, x0 = 0 } = piece.roof;
  const xa = x0, xb = x0 + len;
  const stages = [];
  const twig = new Stage('twig', 'sticks', 1.2);
  // стропила-жерди
  const rafterXs = [];
  for (let x = xa + 0.05; x <= xb - 0.04; x += 0.58) rafterXs.push(x);
  if (xb - 0.05 - rafterXs[rafterXs.length - 1] > 0.2) rafterXs.push(xb - 0.05);
  rafterXs.forEach(function (x) {
    const s = stickBetween(x, 0, x, slope, -0.08, r, 0.04);
    twig.el(x, slope / 2, -0.08).put('bark', s.prim, s.matrix, woodTint(r));
  });
  for (let s = 0.3; s < slope - 0.1; s += 0.6) {
    const st = stickBetween(xa, s, xb, s, -0.025, r, 0.025);
    twig.el((xa + xb) / 2, s, -0.025).put('bark', st.prim, st.matrix, woodTint(r));
  }
  stages.push(twig);
  const tier = piece.tier;
  if (tier !== 'twig') {
    const fin = new Stage(tier, CARRY[tier].kind, CARRY[tier].work);
    rafterXs.forEach(function (x) {
      fin.el(x, slope / 2, -0.1).put('planks', plank(slope, 0.15, 0.05, Math.floor(r() * 8), 0), B(x, slope / 2, -0.1, [0, 1, 0], [0, 0, 1], [1, 0, 0]), woodTint(r));
    });
    if (tier === 'wood' || tier === 'stone') {
      const atlas = tier === 'wood' ? 'shingles' : 'slate';
      for (let s = 0.0; s < slope - 0.05; s += 0.25) {
        fin.el((xa + xb) / 2, s, -0.012).put('planks', plank(xb - xa, 0.05, 0.022, Math.floor(r() * 8), r() * 0.2), M((xa + xb) / 2, s + 0.03, -0.012), woodTint(r));
      }
      const exposure = tier === 'wood' ? 0.15 : 0.18;
      for (let s = 0.0, k = 0; s < slope - 0.12; s += exposure, k++) {
        const L = Math.min(0.4, slope - s);
        const ang = Math.atan2(0.012, 0.25);
        fin.el((xa + xb) / 2, s + L / 2, 0.01).put(atlas, plank(xb - xa + 0.02, L, 0.012, Math.floor(r() * 4), r() * 0.3, 0.0015, 4, 3.0), M((xa + xb) / 2, s + L / 2, 0.006 + 0.004 * (k % 2), -ang, 0, 0), WHITE);
      }
    } else {
      const mat = tier === 'armored' ? 'steelplate' : (piece.sheet || 'zinc');
      for (let s = 0.0; s < slope - 0.05; s += 0.5) {
        fin.el((xa + xb) / 2, s, -0.012).put('planks', plank(xb - xa, 0.08, 0.022, Math.floor(r() * 8), r() * 0.2), M((xa + xb) / 2, s + 0.04, -0.012), woodTint(r));
      }
      if (tier === 'metal') {
        let x = xa, col = 0;
        while (x < xb - 0.05) {
          const cw = Math.min(0.8, xb - x + 0.02);
          const p = corrugated(cw, slope, TILE[mat], 0.076, 0.009, 0);
          for (let i = 0; i < p.uv.length; i += 2) p.uv[i] += r();
          fin.el(x + cw / 2, slope / 2, 0.02).put(mat, p, M(x, 0, 0.012 + (col % 2) * 0.005), WHITE);
          x += cw - 0.07; col++;
        }
      } else {
        for (let s = 0; s < slope - 0.05; s += 1.0) {
          const h = Math.min(1.0, slope - s);
          [[xa, (xa + xb) / 2], [(xa + xb) / 2, xb]].forEach(function (c) {
            fin.el((c[0] + c[1]) / 2, s + h / 2, 0.02).put('steelplate', boxUV(roundedBox(c[1] - c[0] - 0.006, h - 0.006, 0.025, 0.005), 2, 2, r(), r()), M((c[0] + c[1]) / 2, s + h / 2, 0.015), WHITE);
          });
        }
      }
    }
    // карнизная доска; на коньке — накрывашка (у ската «b»)
    fin.el((xa + xb) / 2, 0.02, -0.05).put('planks', plank(xb - xa + 0.04, 0.18, 0.025, Math.floor(r() * 8), 0.1), B((xa + xb) / 2, 0.0, -0.06, [1, 0, 0], [0, 0, 1], [0, -1, 0]), woodTint(r));
    if (piece.roof.ridge) {
      const capMat = tier === 'metal' ? (piece.sheet || 'zinc') : tier === 'armored' ? 'steelplate' : 'planks';
      const p = capMat === 'planks' ? plank(xb - xa + 0.04, 0.2, 0.025, Math.floor(r() * 8), 0.2) : boxUV(roundedBox(xb - xa + 0.04, 0.22, 0.008, 0.002), 2, 2, r(), 0);
      fin.el((xa + xb) / 2, slope - 0.05, 0.04).put(capMat, p, M((xa + xb) / 2, slope - 0.04, 0.045, -0.35, 0, 0), WHITE);
    }
    if (piece.roof.bargeA || piece.roof.bargeB) {
      [[piece.roof.bargeA, xa - 0.02], [piece.roof.bargeB, xb + 0.02]].forEach(function (b) {
        if (!b[0]) return;
        fin.el(b[1], slope / 2, -0.04).put('planks', plank(slope, 0.2, 0.025, Math.floor(r() * 8), 0), B(b[1], slope / 2, -0.04, [0, 1, 0], [0, 0, 1], [1, 0, 0]), woodTint(r));
      });
    }
    stages.push(fin);
  }
  stages.forEach(function (s) { s.finish(group, mats); });
  return { group, stages, doors: [] };
}

// Лестница П-образная в клетке: марш вверх по +z (x 0,1..1,45), площадка у z≈2,6, марш назад (x 1,55..2,9).
export const STAIR = { steps: 8, run: 0.25, flightA: [0.1, 1.45], flightB: [1.55, 2.9], z0: 0.2, landing: [2.2, 2.95] };
function buildStairs(piece, mats) {
  const r = rng(piece.seed);
  const group = new THREE.Group();
  const rise = STORY / (STAIR.steps * 2);
  const stages = [];
  const twig = new Stage('twig', 'sticks', 1.2);
  const flights = [
    { x: STAIR.flightA, y0: 0, dir: 1 },
    { x: STAIR.flightB, y0: STORY / 2, dir: -1 },
  ];
  flights.forEach(function (f) {
    const za = f.dir > 0 ? STAIR.z0 : STAIR.landing[0], zb = f.dir > 0 ? STAIR.landing[0] : STAIR.z0;
    [f.x[0] + 0.05, f.x[1] - 0.05].forEach(function (x) {
      const len = Math.hypot(zb - za, STORY / 2);
      const d = new THREE.Vector3(0, STORY / 2, zb - za).normalize();
      const sp = stick(len, 0.045, 0.04, 0.01, TILE.bark);
      twig.el(x, f.y0 + STORY / 4, (za + zb) / 2).put('bark', sp, B(x, f.y0 - 0.05, za, [d.x, d.y, d.z], [0, -d.z, d.y], [1, 0, 0]), woodTint(r));
    });
  });
  stages.push(twig);
  const tier = piece.tier;
  const fin = tier === 'twig' ? twig : new Stage(tier, CARRY[tier].kind, CARRY[tier].work);
  flights.forEach(function (f) {
    for (let i = 0; i < STAIR.steps; i++) {
      const y = f.y0 + (i + 1) * rise;
      const z = f.dir > 0 ? STAIR.z0 + i * STAIR.run + STAIR.run / 2 : STAIR.landing[0] - i * STAIR.run - STAIR.run / 2;
      const cx = (f.x[0] + f.x[1]) / 2, wd = f.x[1] - f.x[0];
      if (tier === 'twig') {
        for (let k = 0; k < 3; k++) {
          const s = stickBetween(f.x[0], 0, f.x[1], 0, 0, r, 0.022);
          fin.el(cx, y, z).put('bark', s.prim, new THREE.Matrix4().makeTranslation(0, y - 0.02, z + (k - 1) * 0.07).multiply(s.matrix), woodTint(r));
        }
      } else if (tier === 'wood') {
        fin.el(cx, y, z).put('planks', plank(wd, STAIR.run + 0.02, 0.04, Math.floor(r() * 8), r() * 0.4), B(cx, y - 0.02, z, FLAT[0], FLAT[1], FLAT[2]), woodTint(r));
      } else if (tier === 'stone') {
        fin.el(cx, y, z).put('stone', stone(wd, rise + 0.08, STAIR.run + 0.04, Math.floor(r() * 24), TILE.stone, r(), r()), M(cx, y - (rise + 0.08) / 2, z), stoneTint(r));
      } else {
        fin.el(cx, y, z).put('diamond', boxUV(roundedBox(wd, 0.012, STAIR.run, 0.003), TILE.diamond[0], TILE.diamond[1], r(), r()), M(cx, y - 0.006, z), WHITE);
      }
    }
  });
  // площадка
  const ly = STORY / 2;
  const lz = (STAIR.landing[0] + STAIR.landing[1]) / 2, lw = STAIR.landing[1] - STAIR.landing[0];
  if (tier === 'wood' || tier === 'twig') {
    for (let x = 0.12; x < 2.9; x += 0.145) fin.el(x, ly, lz).put('planks', plank(lw, 0.14, 0.03, Math.floor(r() * 8), 0.2), B(x, ly - 0.015, lz, [0, 0, 1], [1, 0, 0], [0, 1, 0]), woodTint(r));
  } else if (tier === 'stone') {
    fin.el(1.5, ly, lz).put('concrete', boxUV(roundedBox(2.8, 0.16, lw, 0.012), TILE.concrete[0], TILE.concrete[1], r(), r()), M(1.5, ly - 0.08, lz), WHITE);
  } else {
    fin.el(1.5, ly, lz).put('diamond', boxUV(roundedBox(2.8, 0.012, lw, 0.003), TILE.diamond[0], TILE.diamond[1], r(), r()), M(1.5, ly - 0.006, lz), WHITE);
  }
  // косоуры
  if (tier !== 'twig') {
    flights.forEach(function (f) {
      const za = f.dir > 0 ? STAIR.z0 : STAIR.landing[0], zb = f.dir > 0 ? STAIR.landing[0] : STAIR.z0;
      const len = Math.hypot(zb - za, STORY / 2);
      const d = new THREE.Vector3(0, STORY / 2, zb - za).normalize();
      [f.x[0] + 0.03, f.x[1] - 0.03].forEach(function (x) {
        const mat = tier === 'wood' || tier === 'stone' ? 'planks' : 'tube';
        const p = mat === 'planks' ? plank(len, 0.24, 0.05, Math.floor(r() * 8), 0) : boxUV(roundedBox(len, 0.2, 0.05, 0.004), 0.5, 0.5);
        const m = B(x, f.y0 + STORY / 4 - 0.1, (za + zb) / 2, [d.x, d.y, d.z], [0, -d.z, d.y], [1, 0, 0]);
        fin.el(x, f.y0 + STORY / 4, (za + zb) / 2).put(mat, p, m, woodTint(r));
      });
    });
  }
  if (fin !== twig) stages.push(fin);
  stages.forEach(function (s) { s.finish(group, mats); });
  return { group, stages, doors: [] };
}

// Деталь целиком: группа в мировых координатах (frame), этапы и двери; позиции элементов — в мире.
export function buildPiece(piece, mats) {
  let built;
  if (piece.type === 'wall' || piece.type === 'gable' || piece.type === 'parapet') built = buildWall(piece, mats);
  else if (piece.type === 'foundation') built = buildFoundation(piece, mats);
  else if (piece.type === 'floor') built = buildFloor(piece, mats);
  else if (piece.type === 'roof') built = buildRoof(piece, mats);
  else if (piece.type === 'stairs') built = buildStairs(piece, mats);
  else throw new Error('нет такой детали: ' + piece.type);
  const g = built.group;
  g.matrixAutoUpdate = false;
  g.matrix.copy(piece.frame);
  g.matrixWorldNeedsUpdate = true;
  built.stages.forEach(function (st) {
    st.elements.forEach(function (e) { e.local = e.pos.clone(); e.pos.applyMatrix4(piece.frame); });
  });
  built.doors.forEach(function (d) { d.world = d.local.clone().applyMatrix4(piece.frame); });
  built.piece = piece;
  return built;
}
