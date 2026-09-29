"use strict";
// Pixel core: a 256x160 RGBA buffer, palette helpers, sprites with baked outlines, layers with live outlines, font.
const W = 320, H = 180;
const HEADLESS = typeof document === "undefined";
let screenCv = null, sctx = null, octx = null, frameImg = null, pix;
if (HEADLESS) pix = new Uint32Array(W * H);
else {
  screenCv = document.getElementById("screen");
  sctx = screenCv.getContext("2d");
  const offCv = document.createElement("canvas");
  offCv.width = W; offCv.height = H;
  octx = offCv.getContext("2d");
  frameImg = octx.createImageData(W, H);
  pix = new Uint32Array(frameImg.data.buffer);
}

function hx(s) {
  const r = parseInt(s.slice(1, 3), 16), g = parseInt(s.slice(3, 5), 16), b = parseInt(s.slice(5, 7), 16);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
const rgb = c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
const pack = (r, g, b) => ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return pack(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
const mul = (c, k) => { const A = rgb(c); return pack(A[0] * k[0], A[1] * k[1], A[2] * k[2]); };

const INK = hx("#24101a"), WHITE = hx("#ffffff"), GOLD = hx("#ffe04a"), PALE = hx("#fff2a0"), RED = hx("#e02030");
const BLACK = hx("#000000"), CYAN = hx("#8ef0ff"), GREEN = hx("#4ad86a"), DIM = hx("#b09878");
const METAL = [hx("#f6f6ff"), hx("#b8bccb"), hx("#767a8c"), hx("#4a4c5c")];
const HANDLE = hx("#6a3a1a");
const BLOOD = [hx("#ff4a3a"), hx("#d81a2a"), hx("#9a0c1e"), hx("#5a0614")];
const SKIN = { k: hx("#ffc8a4"), S: hx("#f09c80"), s: hx("#c0685a") };
const SHADOW_K = [0.66, 0.58, 0.74];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

function put(x, y, c) {
  x |= 0; y |= 0;
  if (x >= 0 && x < W && y >= 0 && y < H) pix[y * W + x] = c;
}
function get(x, y) {
  x = Math.max(0, Math.min(W - 1, x | 0)); y = Math.max(0, Math.min(H - 1, y | 0));
  return pix[y * W + x];
}
function tint(x, y, c, t) {
  x |= 0; y |= 0;
  if (x >= 0 && x < W && y >= 0 && y < H) pix[y * W + x] = mix(pix[y * W + x], c, t);
}
function darken(x, y, k = SHADOW_K) {
  x |= 0; y |= 0;
  if (x >= 0 && x < W && y >= 0 && y < H) pix[y * W + x] = mul(pix[y * W + x], k);
}
function rect(x, y, w, h, c) {
  for (let j = Math.max(0, y | 0); j < Math.min(H, (y + h) | 0); j++)
    for (let i = Math.max(0, x | 0); i < Math.min(W, (x + w) | 0); i++) pix[j * W + i] = c;
}
function rectA(x, y, w, h, c, t) {
  for (let j = Math.max(0, y | 0); j < Math.min(H, (y + h) | 0); j++)
    for (let i = Math.max(0, x | 0); i < Math.min(W, (x + w) | 0); i++) pix[j * W + i] = mix(pix[j * W + i], c, t);
}
function shadowEllipse(cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) darken(x, y);
}
function ellipseRing(cx, cy, rx, ry, c, gaps = 0, phase = 0) {
  const n = Math.max(24, Math.round((rx + ry) * 3.5));
  for (let a = 0; a < n; a++) {
    if (gaps && (a + phase) % gaps === 0) continue;
    const t = a / n * Math.PI * 2;
    put(Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), c);
  }
}
function fillEllipseDither(cx, cy, rx, ry, c, amount, border) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1) continue;
      const by = ((y % 4) + 4) % 4, bx = ((x % 4) + 4) % 4;
      if ((border && d > 0.82) || BAYER[by][bx] < 16 * amount) tint(x, y, c, 0.7);
    }
}
function line(x0, y0, x1, y1, c) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) put(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c);
}

// ---- sprites: ASCII rows + palette, 1 px outline baked in ----
function makeSprite(rows, pal, outline = INK) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const sw = w + 2, sh = h + 2, d = new Uint32Array(sw * sh);
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== "." && ch !== " ") d[(j + 1) * sw + i + 1] = pal[ch]; }));
  if (outline) {
    const o = d.slice();
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      if (d[y * sw + x]) continue;
      if ((x > 0 && d[y * sw + x - 1]) || (x < sw - 1 && d[y * sw + x + 1]) || (y > 0 && d[(y - 1) * sw + x]) || (y < sh - 1 && d[(y + 1) * sw + x]))
        o[y * sw + x] = outline;
    }
    return { w: sw, h: sh, d: o };
  }
  return { w: sw, h: sh, d };
}
function blit(s, x, y, o = {}) {
  const sc = o.scale || 1, flip = o.flip, flash = o.flash;
  const tw = Math.round(s.w * sc), th = Math.round(s.h * sc);
  x = Math.round(x); y = Math.round(y);
  for (let ty = 0; ty < th; ty++) {
    const yy = y + ty;
    if (yy < 0 || yy >= H) continue;
    const sy = Math.min(s.h - 1, (ty / sc) | 0);
    for (let tx = 0; tx < tw; tx++) {
      const xx = x + tx;
      if (xx < 0 || xx >= W) continue;
      let sx = Math.min(s.w - 1, (tx / sc) | 0);
      if (flip) sx = s.w - 1 - sx;
      const c = s.d[sy * s.w + sx];
      if (!c) continue;
      pix[yy * W + xx] = flash && c !== INK && (!o.dither || (xx + yy) % 2 === 0) ? flash : (o.fade ? mix(pix[yy * W + xx], c, o.fade) : c);
    }
  }
}
// feet-anchored draw: (x, y) is the bottom centre
function blitFeet(s, x, y, o = {}) {
  const sc = o.scale || 1;
  blit(s, x - s.w * sc / 2, y - s.h * sc + 1, o);
}

// ---- layers: pixels collected per object, outlined when drawn ----
class Layer {
  constructor() { this.m = new Map(); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); this.m.set((y + 512) * 4096 + x + 1024, c); }
  has(x, y) { return this.m.has((y + 512) * 4096 + x + 1024); }
  draw(outline = INK, flash = 0, dither = false) {
    if (outline) for (const k of this.m.keys()) {
      const x = (k % 4096) - 1024, y = Math.floor(k / 4096) - 512;
      if (!this.m.has(k + 1)) put(x + 1, y, outline);
      if (!this.m.has(k - 1)) put(x - 1, y, outline);
      if (!this.m.has(k + 4096)) put(x, y + 1, outline);
      if (!this.m.has(k - 4096)) put(x, y - 1, outline);
    }
    for (const [k, c] of this.m) {
      const x = (k % 4096) - 1024, y = Math.floor(k / 4096) - 512;
      put(x, y, flash && (!dither || (x + y) % 2 === 0) ? flash : c);
    }
  }
}
function disc(L, cx, cy, r, c) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) L.set(x, y, c);
}
function blob(L, cx, cy, rx, ry, pal) {
  for (let y = Math.floor(cy - ry) - 1; y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx) - 1; x <= cx + rx + 1; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1) continue;
      const rel = (x - cx) / rx + (y - cy) / ry * 0.8;
      L.set(x, y, rel < -0.55 ? pal[0] : rel > 0.6 ? pal[2] : pal[1]);
    }
}
function bline(L, a, b, r, pal) {
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 0; i <= n; i++) disc(L, a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, r, pal[1]);
  for (let i = 0; i <= n; i++) {
    const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
    L.set(x, y - r + 0.4, pal[0]);
    L.set(x, y + r - 0.4, pal[2]);
  }
  disc(L, a[0], a[1], r + 0.9, pal[1]);
  disc(L, b[0], b[1], r + 0.9, pal[1]);
  L.set(a[0] - 1, a[1] - 1, pal[0]);
  L.set(b[0] - 1, b[1] - 1, pal[0]);
}
function chainLine(L, a, b, sag = 0) {
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.4));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t);
    L.set(x, y, i % 2 ? METAL[1] : METAL[3]);
    if (i % 2) L.set(x, y - 1, METAL[0]);
  }
}
function cleaver(L, cx, cy, ang, size = 1) {
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
  const blade = 9 * size, half = 3.2 * size, r = Math.floor(14 * size) + 2;
  for (let y = Math.floor(cy) - r; y <= cy + r; y++)
    for (let x = Math.floor(cx) - r; x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy, u = dx * ux + dy * uy, v = dx * vx + dy * vy;
      if (u >= 0 && u <= blade && v >= -half && v <= half) {
        let c = v > half - 1.3 ? METAL[0] : v < -half + 1.3 ? METAL[2] : METAL[1];
        if ((u - blade + 2.4) ** 2 + (v + half - 1.8) ** 2 < 1.1) c = INK;
        else if (v > -0.5 && ((Math.trunc(u * 1.3) * 5 + Math.trunc(v * 1.7) * 3) % 7 + 7) % 7 < 2 + (u > blade * 0.5 ? 1 : 0))
          c = (Math.trunc(u) + Math.trunc(v)) % 3 ? BLOOD[1] : BLOOD[2];
        L.set(x, y, c);
      } else if (u >= -4.5 * size && u < 0 && Math.abs(v) <= 1.1 * size) L.set(x, y, HANDLE);
    }
}
const SWORD = [hx("#ffffff"), hx("#bff6ff"), hx("#6ab8d8"), hx("#2e5a86")];
const GUARD = [hx("#ffe04a"), hx("#c08a1a")];
function sword(L, hilt, ang, len = 28) {
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux, R = len + 6;
  for (let y = Math.floor(hilt[1]) - R; y <= hilt[1] + R; y++)
    for (let x = Math.floor(hilt[0]) - R; x <= hilt[0] + R; x++) {
      const dx = x - hilt[0], dy = y - hilt[1], u = dx * ux + dy * uy, v = dx * vx + dy * vy;
      if (u >= 1 && u <= len && Math.abs(v) <= 2.3 - Math.max(0, u - (len - 6)) * 0.4)
        L.set(x, y, v > 0.6 ? SWORD[0] : v < -0.8 ? SWORD[3] : u > 3 ? SWORD[1] : SWORD[2]);
      else if (u >= -1.2 && u < 1 && Math.abs(v) <= 5.2) L.set(x, y, v > 0 ? GUARD[0] : GUARD[1]);
      else if (u >= -4.5 && u < -1.2 && Math.abs(v) <= 0.9) L.set(x, y, HANDLE);
      else if (u >= -6.5 && u < -4.5 && Math.abs(v) <= 1.5) L.set(x, y, GUARD[0]);
    }
}
function sawDisc(L, cx, cy, spin, r = 5) {
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++)
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + spin;
      const tooth = r + 1.6 * (((a / (Math.PI * 2) * 10) % 1 + 1) % 1);
      if (d <= tooth) L.set(x, y, d < 1.5 ? INK : d < r - 1.5 ? (dx + dy < 0 ? METAL[0] : METAL[1]) : METAL[2]);
    }
}

// ---- 3x5 font with outline ----
const FONT = {
  A: "010101111101101", B: "110101110101110", C: "111100100100111", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "111100101101111", H: "101101111101101",
  I: "111010010010111", J: "001001001101111", K: "101101110101101", L: "100100100100111", "=": "000111000111000",
  M: "101111111101101", N: "110101101101101", O: "111101101101111", P: "110101110100100",
  Q: "111101101111001", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111", "0": "111101101101111", "1": "010110010010111",
  "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111",
  "6": "111100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001111",
  "!": "010010010000010", "/": "001001010100100", ":": "000010000010000", ".": "000000000000010",
  "-": "000000111000000", "+": "000010111010000", "?": "111001011000010", " ": "000000000000000",
  "%": "101001010100101", ",": "000000000010100", "'": "010010000000000",
  ">": "100010001010100", "<": "001010100010001", "(": "010100100100010", ")": "010001001001010",
};
const textW = (s, k = 1) => s.length * 4 * k - k;
function text(s, x, y, col, k = 1, outline = INK) {
  x = Math.round(x); y = Math.round(y);
  const pts = [], set = new Set();
  let n = 0;
  for (const ch of s) {
    const g = FONT[ch] || FONT[" "];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++)
      if (g[j * 3 + i] === "1") for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        const a = x + n * 4 * k + i * k + dx, b = y + j * k + dy;
        pts.push(a, b); set.add(a * 1000 + b);
      }
    n++;
  }
  if (outline) for (let i = 0; i < pts.length; i += 2) {
    const a = pts[i], b = pts[i + 1];
    for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]])
      if (!set.has((a + u) * 1000 + b + v)) put(a + u, b + v, outline);
  }
  for (let i = 0; i < pts.length; i += 2) put(pts[i], pts[i + 1], col);
}
const centered = (s, y, col, k = 1) => text(s, Math.round((W - textW(s, k)) / 2), y, col, k);
function wrap(s, maxChars) {
  const out = [];
  let cur = "";
  for (const w of s.split(" ")) {
    if ((cur + " " + w).trim().length > maxChars) { out.push(cur.trim()); cur = w; }
    else cur += " " + w;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - (1 - t) ** 3;
const easeIO = t => 3 * t * t - 2 * t * t * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
