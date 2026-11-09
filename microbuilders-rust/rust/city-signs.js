// Вывески квартала штаба одним атласом (канвас): щит закрытого участка, паспорт объекта и знак «идёт стройка» у
// забора стройки, таблички с названиями зданий штаба на стелах у входа. Краска с износом: пыль снизу, точки грязи,
// потёртые края — вблизи читается, издали не рябит (мипмапы, анизотропия). Один материал — один вызов на пачку.
import * as THREE from 'three';

const W = 1024;            // атлас в логических пикселях (на «Телефоне» канвас вдвое меньше)
const FONT = '"Segoe UI", Roboto, Arial, sans-serif';

// Места в атласе: x, y, w, h (логические пиксели, y — сверху)
const SLOTS = {
  plot: [0, 0, 512, 240],
  passport: [512, 0, 512, 352],
  warn: [0, 256, 512, 104],
};
function nameSlot(k) { return [(k % 2) * 512, 368 + Math.floor(k / 2) * 112, 512, 104]; }

function seeded(seed) { let a = seed >>> 0 || 1; return function () { a = (a * 16807) % 2147483647; return a / 2147483647; }; }

// Текст в ширину: шрифт уменьшается, пока строка не влезет.
function fit(g, text, weight, size, maxW) {
  let s = size;
  do { g.font = weight + ' ' + s + 'px ' + FONT; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
// Износ таблички: пыль от нижнего края, точки грязи, светлые потёртости по краю.
function weather(g, s, seed, dust) {
  const r = seeded(seed);
  const gr = g.createLinearGradient(0, s[1] + s[3] * 0.55, 0, s[1] + s[3]);
  gr.addColorStop(0, 'rgba(92,74,52,0)');
  gr.addColorStop(1, 'rgba(92,74,52,' + dust + ')');
  g.fillStyle = gr;
  g.fillRect(s[0], s[1], s[2], s[3]);
  for (let i = 0; i < 160; i++) {
    const x = s[0] + r() * s[2], y = s[1] + Math.pow(r(), 0.6) * s[3];
    g.fillStyle = 'rgba(60,48,36,' + (0.05 + r() * 0.12) + ')';
    g.beginPath(); g.arc(x, y, 0.6 + r() * 2.2, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.lineWidth = 3;
  g.strokeRect(s[0] + 2, s[1] + 2, s[2] - 4, s[3] - 4);
}
// «Строки» мелкого текста: серые полосы разной длины — вблизи как набор, издали как текст.
function lines(g, x, y, w, n, step, seed, color) {
  const r = seeded(seed);
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = w * (0.32 + r() * 0.18);
    g.fillRect(x, y + i * step, a, 7);
    g.fillRect(x + a + 14, y + i * step, w * (0.25 + r() * 0.35), 7);
  }
}

// Щит закрытого участка: синяя шапка «Земельный участок», белое поле, красная полоса запрета.
function drawPlot(g) {
  const [x, y, w, h] = SLOTS.plot;
  g.fillStyle = '#e9e6de'; g.fillRect(x, y, w, h);
  g.fillStyle = '#1f4f8c'; g.fillRect(x, y, w, 62);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fit(g, 'ЗЕМЕЛЬНЫЙ УЧАСТОК', '700', 40, w - 40); g.fillText('ЗЕМЕЛЬНЫЙ УЧАСТОК', x + w / 2, y + 33);
  g.fillStyle = '#1d2b3a';
  fit(g, 'ПОД ЗАСТРОЙКУ ШТАБА', '700', 34, w - 50); g.fillText('ПОД ЗАСТРОЙКУ ШТАБА', x + w / 2, y + 98);
  lines(g, x + 40, y + 128, w - 80, 3, 18, 7, 'rgba(40,50,60,0.55)');
  g.fillStyle = '#b3241b'; g.fillRect(x, y + h - 46, w, 46);
  g.fillStyle = '#ffffff';
  fit(g, 'ПРОХОД ЗАПРЕЩЁН', '700', 30, w - 60); g.fillText('ПРОХОД ЗАПРЕЩЁН', x + w / 2, y + h - 22);
  weather(g, SLOTS.plot, 11, 0.35);
}
// Паспорт объекта у ворот стройки: синяя шапка, строки реквизитов, сроки, логотип-кубик подрядчика.
function drawPassport(g) {
  const [x, y, w, h] = SLOTS.passport;
  g.fillStyle = '#f1efe8'; g.fillRect(x, y, w, h);
  g.fillStyle = '#20508e'; g.fillRect(x, y, w, 66);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fit(g, 'ПАСПОРТ ОБЪЕКТА', '700', 42, w - 40); g.fillText('ПАСПОРТ ОБЪЕКТА', x + w / 2, y + 35);
  g.textAlign = 'left';
  g.fillStyle = '#1b2633';
  const rows = ['Объект: штаб MicroBuilders', 'Заказчик: штаб компании', 'Подрядчик: бригада штаба', 'Начало работ:', 'Окончание работ:'];
  rows.forEach(function (t, i) { fit(g, t, '600', 24, w - 170); g.fillText(t, x + 26, y + 98 + i * 34); });
  lines(g, x + 26, y + 270, w - 200, 3, 18, 23, 'rgba(30,40,55,0.5)');
  // знак подрядчика: оранжевый кубик и каска
  g.fillStyle = '#e8892a'; rrect(g, x + w - 130, y + 96, 100, 100, 12); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + w - 80, y + 156, 30, Math.PI, 0); g.fill();
  g.fillRect(x + w - 118, y + 154, 76, 9);
  g.fillStyle = '#1b2633';
  fit(g, '8 800 000-00-00', '700', 22, 160); g.textAlign = 'center'; g.fillText('8 800 000-00-00', x + w - 80, y + 222);
  g.fillStyle = '#20508e'; g.fillRect(x, y + h - 14, w, 14);
  weather(g, SLOTS.passport, 31, 0.3);
}
// Знак у забора: жёлтое поле, чёрный треугольник «!», надпись.
function drawWarn(g) {
  const [x, y, w, h] = SLOTS.warn;
  g.fillStyle = '#f2c230'; g.fillRect(x, y, w, h);
  g.fillStyle = '#16140f';
  g.beginPath(); g.moveTo(x + 58, y + 14); g.lineTo(x + 104, y + 90); g.lineTo(x + 12, y + 90); g.closePath(); g.fill();
  g.fillStyle = '#f2c230'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 46px ' + FONT; g.fillText('!', x + 58, y + 64);
  g.fillStyle = '#16140f'; g.textAlign = 'left';
  fit(g, 'ОСТОРОЖНО!', '800', 36, w - 150); g.fillText('ОСТОРОЖНО!', x + 124, y + 34);
  fit(g, 'ИДУТ СТРОИТЕЛЬНЫЕ РАБОТЫ', '700', 24, w - 150); g.fillText('ИДУТ СТРОИТЕЛЬНЫЕ РАБОТЫ', x + 124, y + 72);
  weather(g, SLOTS.warn, 41, 0.25);
}
// Табличка стелы: графит, название здания белым, тонкая линия под ним.
function drawName(g, s, name, seed) {
  const [x, y, w, h] = s;
  g.fillStyle = '#1b1e20'; g.fillRect(x, y, w, h);
  g.fillStyle = '#f0eee8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const t = String(name || '').toUpperCase();
  fit(g, t, '700', 44, w - 50); g.fillText(t, x + w / 2, y + h * 0.42);
  g.fillStyle = 'rgba(240,238,232,0.55)'; g.fillRect(x + w * 0.3, y + h * 0.78, w * 0.4, 4);
  weather(g, s, seed, 0.18);
}

// Атлас: ids — порядок зданий (табличка — по месту в списке), names — их названия. size — сторона канваса.
export function createSignAtlas(renderer, ids, names, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.scale(size / W, size / W);
  g.fillStyle = '#808080'; g.fillRect(0, 0, W, W);
  drawPlot(g); drawPassport(g); drawWarn(g);
  const at = {};
  ids.forEach(function (id, k) { const s = nameSlot(k); drawName(g, s, names[k], 50 + k * 7); at[id] = s; });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const uv = function (s) { return [s[0] / W, 1 - (s[1] + s[3]) / W, (s[0] + s[2]) / W, 1 - s[1] / W]; };
  return {
    texture: tex,
    // развёртка места: [u0, v0, u1, v1]; key — plot | passport | warn | id здания
    rect: function (key) { const s = SLOTS[key] || at[key]; return s ? uv(s) : null; },
  };
}

// Пластина w × h лицом к +z с развёрткой места атласа r = [u0, v0, u1, v1] (поля пачки: pos, nrm, uv, index).
export function plate(w, h, r) {
  return {
    pos: new Float32Array([-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0]),
    nrm: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uv: new Float32Array([r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3]]),
    index: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}
