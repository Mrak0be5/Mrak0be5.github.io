// Неподвижное хозяйство площадки (art/props.js, art/vehicles.js): забор с сигнальной лентой по плато, мачты
// освещения, городок из бытовок-контейнеров с лестницей, миниатюры прошлых строек на бетонных постаментах,
// техника компании на стоянке во дворе, поддоны с блоками у въезда. Места — из site-layout.js (клетки
// оригинала), здесь всё в метрах вида (×2) и складывается в общую кучу по материалам (site-kit.js Pile).
import * as THREE from 'three';
import { boxUV, corrugated, quad, rng, torus } from './geo.js?v=45127fe';
import { CELL, familyOf, tintOf, familyTile } from './families.js?v=45127fe';
import { M, mul, hex, WHITE, wheel } from './site-kit.js?v=45127fe';

const C = CELL;
const V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
// цвета оригинала (art/props.js, art/vehicles.js) в линейном виде
const YELLOW = hex(0xe6bc3c), ORANGE = hex(0xe8802e), DARK = hex(0x2f3134), STEEL = hex(0x8e9398), RED = hex(0xb8322a, 0.9);
const WHITE_P = hex(0xe9e8e1), BLUE_P = hex(0x2f62ad), BLUE_B = hex(0x3d6fb5), STRAP = hex(0x35587f), STRAP_L = hex(0xd9d3c2);

// ---------- забор ----------
// Столбики из оцинкованной трубы на бетонных лапах; две сигнальные ленты (красно-белые полосы по 0,25 м) с
// провисом и лёгким перекрутом, натянуты с обеих сторон (лента видна и из карьера, и с плато).
export function fence(P, kit, lay, heightAt) {
  const s = lay.S.scale;
  const red = hex(0xc4241c), white = hex(0xf2f0ea);
  const H = 0.72 * s * C;
  // лапа — по самому низкому из углов (у сужения стен плато к фронту идёт вниз: по центру угол висел бы)
  const foot = 0.21 * s;
  const posts = lay.fence.map(function (run) {
    return run.map(function (q) {
      const x = q.x * C, z = q.z * C;
      let y = heightAt(x, z);
      for (let k = 0; k < 4; k++) {
        const a = Math.atan2(q.nx, q.nz) + Math.PI / 4 + k * Math.PI / 2;
        y = Math.min(y, heightAt(x + Math.sin(a) * foot * 1.41, z + Math.cos(a) * foot * 1.41));
      }
      return { x: x, z: z, y: y, nx: q.nx, nz: q.nz };
    });
  });
  posts.forEach(function (run) {
    run.forEach(function (p, i) {
      const yaw = Math.atan2(p.nx, p.nz);
      P.put('concrete', kit.tbox('concrete', 0.42 * s, 0.16 * s, 0.42 * s, 0.03, i * 0.37, 0.2), M(p.x, p.y + 0.06 * s, p.z, yaw));
      P.tube('tube', V(p.x, p.y + 0.05, p.z), V(p.x, p.y + H, p.z), 0.028 * Math.sqrt(s), WHITE, 8);
      P.put('blacksteel', kit.cyl(0.034 * Math.sqrt(s), 0.034 * Math.sqrt(s), 0.03, 8), M(p.x, p.y + H - 0.01, p.z));
    });
    for (let i = 1; i < run.length; i++) {
      const a = run[i - 1], b = run[i];
      [0.5, 0.61].forEach(function (h, strand) {
        tape(P, kit, V(a.x, a.y + h * s * C, a.z), V(b.x, b.y + h * s * C, b.z), 0.075, red, white, i * 7 + strand);
      });
    }
  });
}
// На «Телефоне» — 4 полосы на пролёт и без тени (с камеры игры лента — нитка; полосы по 0,25 м — 8 тыс.
// треугольников в тени).
function tape(P, kit, a, b, width, red, white, seed) {
  const len = a.distanceTo(b);
  const n = kit.fine ? Math.max(2, Math.ceil(len / 0.25)) : 4;
  const key = kit.fine ? 'paint' : 'paint~';
  const sag = 0.025 * len;
  const dir = new THREE.Vector3().subVectors(b, a).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const twist = 0.25 * Math.sin(seed * 1.7);
  const pos = [], nrm = [];
  const cols = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, u);
    p.y -= sag * 4 * u * (1 - u);
    // ширина ленты — по вертикали, перекручена к середине пролёта
    const ang = twist * Math.sin(u * Math.PI);
    const up = new THREE.Vector3(0, Math.cos(ang), 0).addScaledVector(side, Math.sin(ang));
    const nn = new THREE.Vector3().crossVectors(dir, up).normalize();
    pos.push(p.x - up.x * width / 2, p.y - up.y * width / 2, p.z - up.z * width / 2, p.x + up.x * width / 2, p.y + up.y * width / 2, p.z + up.z * width / 2);
    nrm.push(nn.x, nn.y, nn.z, nn.x, nn.y, nn.z);
  }
  // каждая полоса — свой квад: цвет по полосе (вершины не общие)
  const qpos = [], qnrm = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2 ? white : red;
    for (let k = 0; k < 2; k++) for (let e = 0; e < 2; e++) {
      const j = (i + k) * 2 + e;
      qpos.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
      qnrm.push(nrm[j * 3], nrm[j * 3 + 1], nrm[j * 3 + 2]);
    }
    cols.push(c);
  }
  // лицевая и обратная стороны (материал односторонний)
  for (let i = 0; i < n; i++) {
    const p4 = qpos.slice(i * 12, i * 12 + 12), n4 = qnrm.slice(i * 12, i * 12 + 12);
    const front = { pos: new Float32Array(p4), nrm: new Float32Array(n4), uv: new Float32Array(8), index: new Uint16Array([0, 2, 1, 1, 2, 3]) };
    const back = { pos: new Float32Array(p4), nrm: new Float32Array(n4.map(function (v) { return -v; })), uv: new Float32Array(8), index: new Uint16Array([0, 1, 2, 1, 3, 2]) };
    P.put(key, front, IDENT, cols[i]);
    P.put(key, back, IDENT, cols[i]);
  }
}
const IDENT = new THREE.Matrix4();

// ---------- мачты ----------
// Мачта освещения (у оригинала 8 клеток): бетонный блок-балласт, оцинкованная конусная опора 15 м с фланцем
// и болтами, щиток, кабель-канал, траверса и два светодиодных прожектора к стройке (стёкла светятся ночью).
export function masts(P, kit, lay, heightAt) {
  lay.masts.forEach(function (m, n) {
    const x = m.x * C, z = m.z * C, s = m.s * C;
    const y = heightAt(x, z);
    const base = M(x, y, z, m.yaw, 0, 0);
    const at = function (lx, ly, lz, ry, rx, rz) { return mul(base, M(lx * s, ly * s, lz * s, ry || 0, rx || 0, rz || 0)); };
    const wp = function (lx, ly, lz) { return V(lx * s, ly * s, lz * s).applyMatrix4(base); };
    P.put('concrete', kit.tbox('concrete', 0.8 * s, 0.44 * s, 0.8 * s, 0.04, n * 0.3, 0), at(0, 0.22, 0));
    P.put('blacksteel', kit.box(0.34 * s, 0.025 * s, 0.34 * s, 0.01), at(0, 0.452, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { P.put('steel', kit.cyl(0.012 * s, 0.012 * s, 0.04 * s, 6), at(c[0] * 0.13, 0.45, c[1] * 0.13)); });
    // конусная опора
    P.put('tube', kit.cyl(0.085 * s, 0.05 * s, 7.4 * s, 10, true), at(0, 0.46, 0));
    P.put('paint', kit.box(0.24 * s, 0.32 * s, 0.1 * s, 0.012), at(0, 1.3, 0.13), hex(0x8f969c));
    P.put('blacksteel', kit.box(0.2 * s, 0.03 * s, 0.11 * s, 0.006), at(0, 1.47, 0.13));
    P.tube('blacksteel', wp(0.05, 0.47, 0.06), wp(0.05, 1.16, 0.1), 0.012 * s, WHITE, 6);
    P.tube('blacksteel', wp(-0.05, 1.45, 0.1), wp(-0.05, 7.8, 0.055), 0.01 * s, WHITE, 5);
    // траверса и прожекторы
    P.put('blacksteel', kit.box(1.8 * s, 0.07 * s, 0.07 * s, 0.008), at(0, 7.85, 0.1));
    P.put('blacksteel', kit.box(0.16 * s, 0.16 * s, 0.16 * s, 0.01), at(0, 7.85, 0.04));
    [-1, 1].forEach(function (side) {
      const head = at(side * 0.45, 8.15, 0.22, 0, 0.5, 0);
      P.put('blacksteel', kit.box(0.78 * s, 0.6 * s, 0.1 * s, 0.015), head);
      // рёбра радиатора сзади
      for (let k = 0; k < 7; k++) P.put('blacksteel', kit.box(0.02 * s, 0.52 * s, 0.06 * s, 0), mul(head, M((k - 3) * 0.1 * s, 0, -0.07 * s)));
      P.put('lamp', quad(0.68 * s, 0.5 * s), mul(head, M(-0.34 * s, -0.25 * s, 0.052 * s)), WHITE);
      // скоба
      P.tube('blacksteel', wp(side * 0.45, 7.88, 0.12), wp(side * 0.45, 8.0, 0.18), 0.02 * s, WHITE, 6);
    });
  });
}

// ---------- бытовки ----------
// Контейнер 6 × 2,6 × 2,4 м (у оригинала 3 × 1,3 × 1,21 клетки): стальная рама цвета оригинала (угловые стойки,
// верхние и нижние балки, фитинги), стены из трапециевидного профлиста, два окна в ПВХ-раме с решёткой на длинной
// стороне к карьеру (+z), дверь в торце, кондиционер, оцинкованная крыша; нижние — на деревянных шпалах.
function container(P, kit, m, s, body, frame, sleepers, seed) {
  const k = s * C;
  const at = function (x, y, z, ry, rx) { return mul(m, M(x * k, y * k, z * k, ry || 0, rx || 0)); };
  const L = 2.96, Hh = 1.3, D = 1.21, y0 = 0.12;
  if (sleepers) for (let i = -1; i <= 1; i += 2) P.put('planks', kit.tbox('planks', 0.2 * k, 0.12 * k, 1.42 * k, 0.01, seed * 0.13 + i, 0.3), at(i * 1.1, 0.06, 0, 0.02 * i));
  // стены — профлист с волной 0,25 м (шаг трапеции контейнера), чуть внутри рамы
  const wallH = (Hh - 0.12) * k;
  const sheet = function (w, mtx) { P.put('paint', corrugated(w, wallH, [1, 1], 0.27, 0.024, seed), mtx, body); };
  const inset = 0.035;
  // длинные стороны (+z — к карьеру и камере, −z — назад)
  sheet((L - 0.12) * k, at(-(L - 0.12) / 2, y0 + 0.06, D / 2 - inset));
  sheet((L - 0.12) * k, at((L - 0.12) / 2, y0 + 0.06, -D / 2 + inset, Math.PI));
  // торцы
  sheet((D - 0.12) * k, at(L / 2 - inset, y0 + 0.06, (D - 0.12) / 2, Math.PI / 2));
  sheet((D - 0.12) * k, at(-L / 2 + inset, y0 + 0.06, -(D - 0.12) / 2, -Math.PI / 2));
  // пол и крыша
  P.put('steelplate', kit.tbox('steelplate', L * k, 0.05 * k, D * k, 0.01), at(0, y0 + 0.03, 0));
  P.put('zinc', kit.tbox('zinc', (L - 0.08) * k, 0.04, (D - 0.08) * k, 0.008, seed * 0.21, 0), at(0, y0 + Hh - 0.02, 0));
  // рама: стойки, балки, угловые фитинги
  const post = 0.085, rail = 0.08;
  for (let sx = -1; sx <= 1; sx += 2) for (let sz = -1; sz <= 1; sz += 2) {
    P.put('paintworn', kit.box(post * k, Hh * k, post * k, 0.01), at(sx * (L / 2 - post / 2), y0 + Hh / 2, sz * (D / 2 - post / 2)), frame);
    for (let e = 0; e < 2; e++) P.put('blacksteel', kit.box(0.1 * k, 0.07 * k, 0.1 * k, 0.008), at(sx * (L / 2 - 0.05), y0 + (e ? Hh - 0.035 : 0.035), sz * (D / 2 - 0.05)));
  }
  for (let e = 0; e < 2; e++) {
    const y = y0 + (e ? Hh - rail / 2 : rail / 2);
    for (let sz = -1; sz <= 1; sz += 2) P.put('paintworn', kit.box(L * k, rail * k, rail * k, 0.008), at(0, y, sz * (D / 2 - rail / 2)), frame);
    for (let sx = -1; sx <= 1; sx += 2) P.put('paintworn', kit.box(rail * k, rail * k, D * k, 0.008), at(sx * (L / 2 - rail / 2), y, 0), frame);
  }
  // окна на +z: ПВХ-рама, стекло, подоконник, решётка
  [-0.72, 0.72].forEach(function (wx, wi) {
    const fz = D / 2 + 0.005;
    // ночью в части окон горит свет (у оригинала окна бытовок светятся)
    const lit = (seed + wi) % 3 !== 1;
    const W = 0.5, Hw = 0.44, cy = y0 + 0.72;
    P.put('paint', kit.box(W * k, Hw * k, 0.05 * k, 0.006), at(wx, cy, fz - 0.02), hex(0xecebe6));
    P.put(lit ? 'winlit' : 'pane', quad((W - 0.06) * k, (Hw - 0.06) * k), at(wx - (W - 0.06) / 2, cy - (Hw - 0.06) / 2, fz + 0.006), WHITE);
    P.put('paint', kit.box(0.025 * k, (Hw - 0.05) * k, 0.03 * k, 0), at(wx, cy, fz + 0.012), hex(0xecebe6));
    P.put('paint', kit.box((W + 0.06) * k, 0.025 * k, 0.07 * k, 0.004), at(wx, cy - Hw / 2 - 0.012, fz + 0.01), hex(0xd8d8d4));
    for (let b = -2; b <= 2; b++) P.tube('blacksteel', V(0, 0, 0).applyMatrix4(at(wx + b * 0.1, cy - Hw / 2, fz + 0.045)), V(0, 0, 0).applyMatrix4(at(wx + b * 0.1, cy + Hw / 2, fz + 0.045)), 0.006 * k, WHITE, 5);
  });
  // дверь в торце +x: полотно, ручка, козырёк, лампа
  const dx = L / 2 + 0.006;
  // дверь — под площадкой лестницы (у верхней — к площадке)
  const dz = -0.25;
  P.put('paintworn', kit.box(0.03 * k, 0.98 * k, 0.46 * k, 0.006), at(dx, y0 + 0.56, dz), frame.clone().multiplyScalar(0.85));
  P.put('steel', kit.box(0.04 * k, 0.025 * k, 0.09 * k, 0.004), at(dx + 0.02, y0 + 0.55, dz + 0.16));
  P.put('zinc', kit.tbox('zinc', 0.14 * k, 0.015 * k, 0.6 * k, 0.003), at(dx + 0.06, y0 + 1.1, dz));
  P.put('paint', kit.box(0.05 * k, 0.05 * k, 0.07 * k, 0.01), at(dx + 0.025, y0 + 1.17, dz + 0.3), hex(0x303234));
  P.put('lamp', quad(0.04 * k, 0.03 * k), at(dx + 0.051, y0 + 1.155, dz + 0.32, Math.PI / 2), WHITE);
  // кондиционер на задней стене
  if (seed % 2 === 0) {
    P.put('paint', kit.box(0.42 * k, 0.28 * k, 0.16 * k, 0.015), at(-0.6, y0 + 0.9, -D / 2 - 0.09), hex(0xdfe0dc));
    P.put('blacksteel', kit.cyl(0.1 * k, 0.1 * k, 0.01 * k, 14), at(-0.68, y0 + 0.9, -D / 2 - 0.17, 0, Math.PI / 2));
  }
}

// Городок (art/props.js cabins): две бытовки рядом, третья сверху, наружная стальная лестница с площадкой в торце.
export function cabins(P, kit, lay, heightAt) {
  const c = lay.cabins, s = c.s, k = s * C;
  const x = c.x * C, z = c.z * C;
  const y = Math.min(heightAt(x, z), heightAt(x - 3.35 * k, z));
  const m = M(x, y, z, c.yaw);
  const at = function (lx, ly, lz, ry) { return mul(m, M(lx * k, ly * k, lz * k, ry || 0)); };
  // площадка под городком — утрамбованный щебень
  P.put('gravel', boxUV(kit.box(8.9 * k, 0.05, 2.4 * k, 0.02), 2, 2), at(-0.95, 0.0, 0.05));
  container(P, kit, m, s, WHITE_P, BLUE_P, true, 1);
  container(P, kit, at(-3.35, 0, 0), s, BLUE_B, WHITE_P, true, 2);
  // верхняя — угловыми фитингами на нижнюю (у оригинала зазор 0,18 клетки — в реалистичном виде висела бы)
  container(P, kit, at(0, 1.3, 0), s, WHITE_P, BLUE_P, false, 4);
  // лестница: косоуры, рифлёные ступени, площадка, перила
  const sx = 1.86;
  for (let i = 0; i < 7; i++) P.put('diamond', kit.tbox('diamond', 0.56 * k, 0.03 * k, 0.21 * k, 0.004), at(sx, 0.2 * (i + 1), 0.78 - 0.2 * i));
  [-1, 1].forEach(function (e) {
    P.bar('blacksteel', V(0, 0, 0).applyMatrix4(at(sx + e * 0.3, 0.02, 1.0)), V(0, 0, 0).applyMatrix4(at(sx + e * 0.3, 1.47, -0.5)), 0.045 * k, WHITE);
    P.tube('tube', V(0, 0, 0).applyMatrix4(at(sx + e * 0.3, 0.02, -0.48)), V(0, 0, 0).applyMatrix4(at(sx + e * 0.3, 1.45, -0.48)), 0.022 * k, WHITE, 6);
  });
  P.put('diamond', kit.tbox('diamond', 0.6 * k, 0.04 * k, 0.44 * k, 0.005), at(sx, 1.47, -0.48));
  const rail = hex(0xd8d4cc);
  P.tube('tube', V(0, 0, 0).applyMatrix4(at(sx + 0.3, 0.95, 0.95)), V(0, 0, 0).applyMatrix4(at(sx + 0.3, 2.32, -0.48)), 0.018 * k, rail, 8);
  P.tube('tube', V(0, 0, 0).applyMatrix4(at(sx + 0.3, 0.02, 0.95)), V(0, 0, 0).applyMatrix4(at(sx + 0.3, 0.95, 0.95)), 0.018 * k, rail, 8);
  P.tube('tube', V(0, 0, 0).applyMatrix4(at(sx + 0.3, 1.47, -0.48)), V(0, 0, 0).applyMatrix4(at(sx + 0.3, 2.32, -0.48)), 0.018 * k, rail, 8);
  P.tube('tube', V(0, 0, 0).applyMatrix4(at(sx + 0.3, 2.32, -0.48)), V(0, 0, 0).applyMatrix4(at(sx - 0.3, 2.32, -0.48)), 0.018 * k, rail, 8);
  P.tube('tube', V(0, 0, 0).applyMatrix4(at(sx - 0.3, 1.47, -0.48)), V(0, 0, 0).applyMatrix4(at(sx - 0.3, 2.32, -0.48)), 0.018 * k, rail, 8);
  // биотуалет у торца площадки: пластиковая кабина, светлая крыша, дверь с решёткой вентиляции, труба
  {
    const tx = 2.78, tz = 0.25, blue = hex(0x2a68b4);
    P.put('paint', kit.box(0.46 * k, 0.05 * k, 0.48 * k, 0.01), at(tx, 0.025, tz), hex(0x1f4f8a));
    P.put('paint', kit.box(0.44 * k, 0.86 * k, 0.44 * k, 0.03), at(tx, 0.48, tz), blue);
    P.put('paint', kit.box(0.48 * k, 0.05 * k, 0.48 * k, 0.02), at(tx, 0.935, tz), hex(0xe9e6dc));
    P.put('paint', kit.box(0.34 * k, 0.76 * k, 0.012 * k, 0.006), at(tx, 0.47, tz + 0.226), blue.clone().multiplyScalar(0.9));
    for (let i = 0; i < 5; i++) P.put('blacksteel', kit.box(0.22 * k, 0.008 * k, 0.006 * k, 0), at(tx, 0.74 + i * 0.025, tz + 0.234));
    P.put('steel', kit.box(0.02 * k, 0.06 * k, 0.02 * k, 0.004), at(tx + 0.13, 0.48, tz + 0.236), hex(0xb0b4b8));
    P.put('paint', kit.cyl(0.025 * k, 0.025 * k, 0.16 * k, 8), at(tx - 0.12, 0.95, tz - 0.12), hex(0x30343a));
  }
  // кабель от мачты к городку, бочка и поддон у торца
  P.put('paintworn', kit.cyl(0.29 * k, 0.29 * k, 0.88 * k / 2, 16), at(-5.3, 0.0, 0.5), hex(0x2c5a3a));
  P.put('planks', kit.tbox('planks', 0.6 * k, 0.07 * k, 0.5 * k, 0.01), at(-5.3, 0.035, -0.25, 0.3));
  // Хозяйство городка за бытовками: бункер для мусора с обломками, кабельный барабан, штабель труб на
  // прокладках, клетка с газовыми баллонами.
  {
    // бункер-накопитель: трапеция (шире кверху), рёбра, проушины, внутри доски и битые блоки
    const sk = at(2.9, 0, -1.55, 0.08), as = function (x, y, z, ry, rx, rz) { return mul(sk, M(x * k, y * k, z * k, ry || 0, rx || 0, rz || 0)); };
    const col = hex(0x2f5f9e);
    P.put('paintworn', kit.box(0.7 * k, 0.04 * k, 0.5 * k, 0.01), as(0, 0.05, 0), col);
    [-1, 1].forEach(function (e) {
      P.put('paintworn', kit.box(0.9 * k, 0.5 * k, 0.03 * k, 0.008), as(0, 0.3, e * 0.3, 0, e * 0.28, 0), col);
      P.put('paintworn', kit.box(0.03 * k, 0.5 * k, 0.56 * k, 0.008), as(e * 0.4, 0.3, 0, 0, 0, -e * 0.38), col);
      P.put('blacksteel', kit.cyl(0.04 * k, 0.04 * k, 0.05 * k, 10), as(e * 0.47, 0.42, 0, 0, 0, -e * Math.PI / 2));
      for (let i = -1; i <= 1; i++) P.put('paintworn', kit.box(0.04 * k, 0.48 * k, 0.03 * k, 0.006), as(i * 0.28, 0.3, e * 0.322, 0, e * 0.28, 0), col.clone().multiplyScalar(0.85));
    });
    P.put('blacksteel', kit.box(0.94 * k, 0.04 * k, 0.04 * k, 0.006), as(0, 0.57, 0.38));
    P.put('blacksteel', kit.box(0.94 * k, 0.04 * k, 0.04 * k, 0.006), as(0, 0.57, -0.38));
    const rr = rng(Math.round(c.x * 31 + c.z * 17) + 5);
    for (let i = 0; i < (kit.fine ? 9 : 4); i++) P.put('planks', kit.tbox('planks', (0.5 + rr() * 0.4) * k, 0.03 * k, 0.07 * k, 0.004, rr(), rr()), as((rr() - 0.5) * 0.4, 0.38 + rr() * 0.15, (rr() - 0.5) * 0.4, rr() * 3, (rr() - 0.5) * 0.5, (rr() - 0.5) * 0.4), hex(rr() < 0.5 ? 0xb48452 : 0x8a6a48));
    for (let i = 0; i < (kit.fine ? 5 : 2); i++) P.put('concrete', kit.tbox('concrete', (0.12 + rr() * 0.1) * k, (0.08 + rr() * 0.06) * k, (0.1 + rr() * 0.08) * k, 0.01, rr(), rr()), as((rr() - 0.5) * 0.5, 0.42 + rr() * 0.1, (rr() - 0.5) * 0.3, rr() * 3, rr() - 0.5, rr() - 0.5));
  }
  {
    // кабельный барабан на боку: щёки из досок, сердечник, намотка кабеля
    const dr = at(-4.4, 0.32, -1.5, 0.4);
    [-1, 1].forEach(function (e) { P.put('planks', kit.cyl(0.32 * k, 0.32 * k, 0.04 * k, kit.fine ? 20 : 10), mul(dr, M(e * 0.2 * k - (e > 0 ? 0.04 * k : 0), 0, 0, 0, 0, -Math.PI / 2))); });
    P.put('rubber', kit.cyl(0.22 * k, 0.22 * k, 0.36 * k, kit.fine ? 18 : 10), mul(dr, M(-0.18 * k, 0, 0, 0, 0, -Math.PI / 2)), hex(0x2a2826));
    P.put('blacksteel', kit.cyl(0.05 * k, 0.05 * k, 0.48 * k, 8), mul(dr, M(-0.24 * k, 0, 0, 0, 0, -Math.PI / 2)));
    P.tube('rubber', V(0, 0, 0).applyMatrix4(mul(dr, M(0, -0.2 * k, 0.12 * k))), V(0, 0, 0).applyMatrix4(at(-3.9, 0.02, -1.0)), 0.025 * k, hex(0x2a2826), 6);
  }
  {
    // штабель труб на трёх прокладках
    const ps = at(-1.6, 0, -1.65, 0.03);
    [-0.7, 0, 0.7].forEach(function (x) { P.put('planks', kit.tbox('planks', 0.08 * k, 0.07 * k, 0.6 * k, 0.006, x, 0.2), mul(ps, M(x * k, 0.035 * k, 0))); });
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4 - row; i++) {
      const z = (i - (3 - row) / 2) * 0.13, y = 0.07 + 0.06 + row * 0.11;
      P.put('tube', kit.cyl(0.06 * k, 0.06 * k, 1.9 * k, 10), mul(ps, M(-0.95 * k, y * k, z * k, 0, 0, -Math.PI / 2)), hex(0x7a6a5a));
    }
  }
  {
    // клетка с газовыми баллонами за биотуалетом: решётка, крыша, баллоны (пропан — красные)
    const gc = at(2.82, 0, -0.55), ag = function (x, y, z) { return mul(gc, M(x * k, y * k, z * k)); };
    [[-0.25, -0.15], [0.25, -0.15], [-0.25, 0.15], [0.25, 0.15]].forEach(function (q) { P.put('blacksteel', kit.box(0.03 * k, 0.75 * k, 0.03 * k, 0), ag(q[0], 0.375, q[1])); });
    P.put('zinc', kit.tbox('zinc', 0.56 * k, 0.02 * k, 0.36 * k, 0.004), ag(0, 0.76, 0));
    for (let i = 0; i < 6; i++) P.put('blacksteel', kit.box(0.008 * k, 0.7 * k, 0.008 * k, 0), ag(-0.2 + i * 0.08, 0.37, 0.155));
    [-0.12, 0.12].forEach(function (x) {
      P.put('paint', kit.cyl(0.09 * k, 0.09 * k, 0.52 * k, 14), ag(x, 0.02, -0.02), hex(0xb32a1e));
      P.put('steel', kit.cyl(0.03 * k, 0.03 * k, 0.07 * k, 8), ag(x, 0.54, -0.02), hex(0x9a9ea2));
    });
  }
}

// ---------- миниатюры прошлых строек ----------
// Модель из блоков уровня (только наружные грани, как у оригинала) кладкой своих материалов: фактура в масштабе
// модели (кирпичи мелкие, как на макете), на бетонном постаменте с фаской и латунной табличкой.
const NB = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
export function minis(P, kit, lay, MB) {
  lay.minis.forEach(function (mi, n) {
    const x = mi.cx * C, z = mi.cz * C, y = mi.y * C;
    const w = mi.w * C, d = mi.d * C, h = mi.h * C;
    P.put('concrete', kit.tbox('concrete', w, h, d, 0.03, n * 0.41, 0.1), M(x, y + h / 2 - 0.02, z));
    P.put('concrete', kit.tbox('concrete', w + 0.12, 0.06, d + 0.12, 0.015, n * 0.3, 0.6), M(x, y + 0.01, z));
    P.put('steel', kit.box(Math.min(0.42, w * 0.4), 0.13, 0.012, 0.004), M(x, y + h * 0.55, z + d / 2 + 0.006), hex(0xb08a3a));
    const L = mi.level, k = mi.k * C;
    const keys = new Set();
    L.blocks.forEach(function (b) { keys.add(b.x + ',' + b.y + ',' + b.z); });
    L.blocks.forEach(function (b) {
      const fam = familyOf(MB, b.materialId);
      const key = 'fam:' + fam;
      const tint = tintOf(MB, b.materialId, fam);
      const col = new THREE.Color(tint[0], tint[1], tint[2]);
      const tile = familyTile(fam);
      for (let f = 0; f < 6; f++) {
        const o = NB[f];
        if (f === 3) continue;
        if (keys.has((b.x + o[0]) + ',' + (b.y + o[1]) + ',' + (b.z + o[2]))) continue;
        P.put(key, face(f, b, tile), new THREE.Matrix4().makeScale(k, k, k).setPosition(mi.ox * C, mi.oy * C, mi.oz * C), col);
      }
    });
  });
}
// Грань куба клетки (x, y, z) уровня в клетках; развёртка — в метрах полного размера (клетка 2 м), как boxUV.
function face(f, b, tile) {
  const x0 = b.x + 0.01, x1 = b.x + 0.99, y0 = b.y + 0.01, y1 = b.y + 0.99, z0 = b.z + 0.01, z1 = b.z + 0.99;
  let P4, n;
  if (f === 0) { P4 = [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]; n = [1, 0, 0]; }
  else if (f === 1) { P4 = [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]; n = [-1, 0, 0]; }
  else if (f === 2) { P4 = [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]; n = [0, 1, 0]; }
  else if (f === 4) { P4 = [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]; n = [0, 0, 1]; }
  else { P4 = [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]; n = [0, 0, -1]; }
  const pos = new Float32Array(12), nrm = new Float32Array(12), uv = new Float32Array(8);
  for (let i = 0; i < 4; i++) {
    const p = P4[i];
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
    nrm[i * 3] = n[0]; nrm[i * 3 + 1] = n[1]; nrm[i * 3 + 2] = n[2];
    const X = p[0] * C, Y = p[1] * C, Z = p[2] * C;
    let u, v;
    if (f === 0) { u = -Z; v = Y; } else if (f === 1) { u = Z; v = Y; } else if (f === 2) { u = X; v = -Z; } else if (f === 4) { u = X; v = Y; } else { u = -X; v = Y; }
    uv[i * 2] = u / tile[0]; uv[i * 2 + 1] = v / tile[1];
  }
  return { pos, nrm, uv, index: new Uint16Array([0, 1, 2, 0, 2, 3]) };
}

// ---------- техника компании ----------
// Передвижной компрессор (оранжевый, на двух колёсах): капот с жалюзи, рама, крылья, дышло с петлёй и опорой.
function compressor(P, kit, m) {
  const at = function (x, y, z, ry, rx, rz) { return mul(m, M(x * C, y * C, z * C, ry, rx, rz)); };
  P.put('paint', kit.box(0.86 * C, 0.72 * C, 1.45 * C, 0.05), at(0, 0.66, -0.1), ORANGE);
  P.put('paint', kit.box(0.9 * C, 0.06 * C, 1.5 * C, 0.02), at(0, 1.04, -0.1), ORANGE.clone().multiplyScalar(0.85));
  // жалюзи на боках
  [-1, 1].forEach(function (sd) {
    for (let i = 0; i < 9; i++) P.put('blacksteel', kit.box(0.02 * C, 0.025 * C, 0.6 * C, 0), at(sd * 0.435, 0.48 + i * 0.045, -0.35, 0, 0, sd * 0.5));
    P.put('blacksteel', kit.box(0.012 * C, 0.04 * C, 0.04 * C, 0), at(sd * 0.436, 0.9, 0.3));
  });
  P.put('blacksteel', kit.box(0.7 * C, 0.08 * C, 1.9 * C, 0.01), at(0, 0.3, 0));
  [-1, 1].forEach(function (sd) {
    wheel(P, kit, at(sd * 0.52, 0.27, -0.15), 0.27 * C, 0.17 * C, sd, { tread: 'block', rim: hex(0x7e817f), rr: 0.55, nuts: 5 });
    P.put('paintworn', kit.box(0.2 * C, 0.035 * C, 0.66 * C, 0.01), at(sd * 0.52, 0.58, -0.15), ORANGE.clone().multiplyScalar(0.8));
  });
  P.bar('blacksteel', V(0, 0.33 * C, 0.7 * C).applyMatrix4(m), V(0, 0.27 * C, 1.45 * C).applyMatrix4(m), 0.08 * C, WHITE);
  P.put('steel', kit.cyl(0.05 * C, 0.05 * C, 0.02 * C, 12), at(0, 0.26, 1.48, 0, 0, Math.PI / 2));
  // опорное колесо дышла: стойка с винтом, вилка, колёсико
  P.put('blacksteel', kit.cyl(0.03 * C, 0.03 * C, 0.24 * C, 8), at(0, 0.13, 1.32));
  P.put('steel', kit.cyl(0.012 * C, 0.012 * C, 0.08 * C, 6), at(0, 0.37, 1.32), hex(0xa8acb0));
  P.put('blacksteel', kit.box(0.08 * C, 0.06 * C, 0.03 * C, 0.004), at(0, 0.11, 1.32));
  wheel(P, kit, at(0.035, 0.07, 1.32), 0.07 * C, 0.04 * C, 1, { tread: 'smooth', rim: hex(0x7e817f), rr: 0.5, nuts: 3 });
  // страховочные цепи и катафоты
  [-1, 1].forEach(function (sd) {
    for (let i = 0; i < 6; i++) P.put('steel', torus(0.012 * C, 0.004 * C), at(sd * (0.06 + i * 0.008), 0.28 - Math.sin(i / 5 * Math.PI) * 0.05, 1.05 + i * 0.06, 0, Math.PI / 2 * (i % 2)), hex(0x8a8e92));
    P.put('paint', kit.box(0.004 * C, 0.06 * C, 0.06 * C, 0), at(sd * 0.436, 0.5, -0.92), hex(0xc22a18));
  });
  P.put('paint', kit.box(0.42 * C, 0.3 * C, 0.05 * C, 0.01), at(0, 0.78, 0.64), DARK);
  P.put('lamp', quad(0.1 * C, 0.06 * C), at(-0.1, 0.82, 0.666), WHITE);
  P.put('blacksteel', kit.cyl(0.04 * C, 0.04 * C, 0.26 * C, 10), at(0.22, 1.07, -0.6));
  // капот: швы створок, замки, петли; рым для подъёма, белая полоса с надписью-табличкой
  [-1, 1].forEach(function (sd) {
    [-0.72, 0.1, 0.55].forEach(function (z) { P.put('blacksteel', kit.box(0.006 * C, 0.62 * C, 0.012 * C, 0), at(sd * 0.432, 0.66, z)); });
    [-0.35, 0.33].forEach(function (z) { P.put('steel', kit.box(0.02 * C, 0.05 * C, 0.07 * C, 0.004), at(sd * 0.44, 0.78, z), hex(0x9a9ea2)); });
    P.put('paint', kit.box(0.004 * C, 0.07 * C, 1.43 * C, 0), at(sd * 0.432, 0.95, -0.1), hex(0xe8e6de));
    P.put('paint', kit.box(0.004 * C, 0.1 * C, 0.24 * C, 0), at(sd * 0.433, 0.7, 0.33), hex(0xf0c419));
    // задние фонари
    P.put('paint', kit.box(0.08 * C, 0.04 * C, 0.012 * C, 0.003), at(sd * 0.3, 0.42, -0.95), hex(0x8a1a12));
  });
  P.put('steel', kit.box(0.03 * C, 0.12 * C, 0.12 * C, 0.01), at(0, 1.12, -0.1), hex(0x8f9397));
  P.put('blacksteel', kit.box(0.7 * C, 0.04 * C, 0.04 * C, 0.004), at(0, 0.4, -0.96));
  // свёрнутый шланг на крюке у пульта
  P.put('rubber', torus(0.09 * C, 0.018 * C), at(0.3, 0.62, 0.66), hex(0x2c2a28));
  P.put('rubber', torus(0.075 * C, 0.018 * C), at(0.3, 0.62, 0.69), hex(0x2c2a28));
  P.put('steel', kit.box(0.03 * C, 0.03 * C, 0.08 * C, 0), at(0.3, 0.7, 0.68));
}
// Дорожный каток с гладким вальцом: валец в раме, задние колёса, моторный отсек с жалюзи, площадка оператора,
// рулевая колонка, сиденье, каркас ROPS с крышей.
function roller(P, kit, m) {
  const at = function (x, y, z, ry, rx, rz) { return mul(m, M(x * C, y * C, z * C, ry, rx, rz)); };
  const rot = at(-0.75, 0.56, 0.9, 0, 0, -Math.PI / 2);
  P.put('tube', kit.cyl(0.56 * C, 0.56 * C, 1.5 * C, 28), rot, hex(0xaeb2b4));
  P.put('paintworn', kit.cyl(0.3 * C, 0.3 * C, 1.52 * C, 16), mul(rot, M(0, -0.01 * C, 0)), YELLOW);
  [-1, 1].forEach(function (k) {
    // щёки рамы вальца — гладкая краска (сколы — по кромкам ступицы и крыльев)
    P.put('paint', kit.box(0.08 * C, 0.72 * C, 1.25 * C, 0.015), at(k * 0.82, 0.64, 0.9), YELLOW);
    wheel(P, kit, at(k * 0.62, 0.46, -0.62), 0.46 * C, 0.36 * C, k, { rim: YELLOW, rr: 0.55 });
    P.tube('blacksteel', V(k * 0.5 * C, 1.25 * C, -0.3 * C).applyMatrix4(m), V(k * 0.5 * C, 2.3 * C, -0.3 * C).applyMatrix4(m), 0.035 * C, WHITE, 8);
    P.tube('blacksteel', V(k * 0.5 * C, 1.25 * C, 0.38 * C).applyMatrix4(m), V(k * 0.5 * C, 2.3 * C, 0.38 * C).applyMatrix4(m), 0.035 * C, WHITE, 8);
  });
  P.put('paint', kit.box(1.72 * C, 0.14 * C, 0.7 * C, 0.02), at(0, 1.02, 0.85), YELLOW);
  P.put('paint', kit.box(1.3 * C, 0.72 * C, 1.35 * C, 0.05), at(0, 0.84, -0.55), YELLOW);
  for (let i = 0; i < 7; i++) P.put('blacksteel', kit.box(1.0 * C, 0.015 * C, 0.05 * C, 0), at(0, 1.205, -0.95 + i * 0.07));
  P.put('diamond', kit.tbox('diamond', 1.1 * C, 0.06 * C, 0.8 * C, 0.01), at(0, 1.24, 0.05));
  P.put('paint', kit.box(0.42 * C, 0.1 * C, 0.36 * C, 0.04), at(0, 1.34, -0.05), DARK);
  P.put('paint', kit.box(0.42 * C, 0.36 * C, 0.08 * C, 0.04), at(0, 1.5, -0.22, 0, -0.15), DARK);
  P.tube('blacksteel', V(0, 1.25 * C, 0.32 * C).applyMatrix4(m), V(0, 1.62 * C, 0.26 * C).applyMatrix4(m), 0.03 * C, WHITE, 8);
  P.put('blacksteel', kit.cyl(0.13 * C, 0.13 * C, 0.025 * C, 16), at(0, 1.64, 0.24, 0, -0.6, 0));
  P.put('paint', kit.box(1.16 * C, 0.08 * C, 0.96 * C, 0.03), at(0, 2.32, 0.04), YELLOW);
  P.put('blacksteel', kit.cyl(0.035 * C, 0.035 * C, 0.3 * C, 10), at(0.4, 1.2, -0.95));
  P.put('lamp', quad(0.12 * C, 0.04 * C), at(-0.06, 2.37, 0.1, 0, -Math.PI / 2), hex(0xff8a20));
  // шарнир сочленённой рамы и цилиндры поворота
  P.put('blacksteel', kit.box(0.42 * C, 0.3 * C, 0.3 * C, 0.02), at(0, 0.72, 0.28));
  [-1, 1].forEach(function (k) {
    P.tube('steel', V(k * 0.18 * C, 0.66 * C, 0.1 * C).applyMatrix4(m), V(k * 0.42 * C, 0.66 * C, 0.55 * C).applyMatrix4(m), 0.035 * C, hex(0xc8ccd0), 8);
    P.tube('blacksteel', V(k * 0.12 * C, 0.66 * C, -0.05 * C).applyMatrix4(m), V(k * 0.18 * C, 0.66 * C, 0.1 * C).applyMatrix4(m), 0.05 * C, WHITE, 8);
  });
  // скребки вальца спереди и сзади
  [0.42, -0.42].forEach(function (dz) { P.put('blacksteel', kit.box(1.5 * C, 0.04 * C, 0.1 * C, 0.006), at(0, 0.24, 0.9 + dz, 0, dz > 0 ? -0.5 : 0.5)); });
  // моторный отсек: жалюзи на боках, тёмная полоса, ручки, задние фонари, буфер с проушиной
  [-1, 1].forEach(function (k) {
    for (let i = 0; i < 6; i++) P.put('blacksteel', kit.box(0.012 * C, 0.025 * C, 0.42 * C, 0), at(k * 0.652, 0.66 + i * 0.05, -0.75, 0, 0, k * 0.5));
    P.put('paint', kit.box(0.006 * C, 0.06 * C, 1.3 * C, 0), at(k * 0.651, 1.1, -0.55), DARK);
    P.put('steel', kit.box(0.02 * C, 0.03 * C, 0.12 * C, 0.004), at(k * 0.66, 0.98, -0.2), hex(0x9a9ea2));
    P.put('paint', kit.box(0.09 * C, 0.06 * C, 0.015 * C, 0.004), at(k * 0.48, 0.95, -1.23), hex(0x8a1a12));
    P.put('paint', kit.box(0.09 * C, 0.04 * C, 0.015 * C, 0.004), at(k * 0.48, 0.88, -1.23), hex(0xd88a1a));
  });
  P.put('blacksteel', kit.box(1.2 * C, 0.16 * C, 0.1 * C, 0.015), at(0, 0.42, -1.25));
  P.put('steel', kit.cyl(0.05 * C, 0.05 * C, 0.04 * C, 10), at(0, 0.42, -1.3, 0, Math.PI / 2, 0), hex(0x7d8185));
  // подножка и поручень к площадке оператора
  P.put('diamond', kit.tbox('diamond', 0.22 * C, 0.025 * C, 0.36 * C, 0.004), at(0.72, 0.72, 0.05));
  P.tube('tube', V(0.6 * C, 1.3 * C, 0.38 * C).applyMatrix4(m), V(0.6 * C, 2.0 * C, 0.38 * C).applyMatrix4(m), 0.018 * C, YELLOW, 8);
  // рабочие фары на крыше каркаса (вперёд и назад), проблесковый маячок, зеркало
  [[-0.42, 0.52, 0], [0.42, 0.52, 0], [-0.42, -0.44, Math.PI], [0.42, -0.44, Math.PI]].forEach(function (q) {
    P.put('blacksteel', kit.box(0.14 * C, 0.1 * C, 0.08 * C, 0.01), at(q[0], 2.25, q[1], q[2]));
    P.put('lamp', quad(0.11 * C, 0.07 * C), mul(at(q[0], 2.25, q[1], q[2]), M(-0.055 * C, -0.035 * C, 0.041 * C)), WHITE);
  });
  P.put('blacksteel', kit.cyl(0.07 * C, 0.07 * C, 0.03 * C, 12), at(0.3, 2.36, -0.2));
  P.put('paint', kit.cyl(0.06 * C, 0.05 * C, 0.11 * C, 12), at(0.3, 2.39, -0.2), hex(0xf08a10));
  P.put('blacksteel', kit.box(0.02 * C, 0.02 * C, 0.24 * C, 0), at(-0.5, 2.0, 0.5, 0.6));
  P.put('blacksteel', kit.box(0.03 * C, 0.16 * C, 0.1 * C, 0.006), at(-0.58, 2.0, 0.6, 0.6));
  P.put('pane', quad(0.08 * C, 0.14 * C), mul(at(-0.58, 2.0, 0.6, 0.6), M(-0.04 * C, -0.07 * C, 0.051 * C)), WHITE);
  // подлокотники и спинка сиденья, огнетушитель на стойке
  [-1, 1].forEach(function (k) { P.put('paint', kit.box(0.05 * C, 0.05 * C, 0.26 * C, 0.015), at(k * 0.23, 1.47, -0.02), DARK); });
  P.put('paint', kit.cyl(0.04 * C, 0.04 * C, 0.2 * C, 10), at(-0.5, 1.3, -0.2), hex(0xb01e16));
}
// Экскаватор и автокран (ступени 3–4, после первых часов): упрощённые, но в тех же габаритах.
// Балка от a к b (мир, м): сечение w по оси side (единичный вектор) × h поперёк; фаска r.
const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3();
function beam(P, kit, key, a, b, w, h, side, c, r) {
  _by.subVectors(b, a);
  const len = _by.length();
  if (len < 1e-4) return;
  _by.divideScalar(len);
  _bx.copy(side).addScaledVector(_by, -side.dot(_by)).normalize();
  _bz.crossVectors(_bx, _by);
  const mtx = new THREE.Matrix4().makeBasis(_bx, _by, _bz).setPosition(a.clone().add(b).multiplyScalar(0.5));
  P.put(key, kit.box(w, len, h, r || 0), mtx, c);
}
// Гусеничный экскаватор (ступень 3): ходовая — рамы, звёздочка, ленивец, катки, лента из башмаков с грунтозацепами;
// поворотная часть — опорно-поворотный круг, моторный отсек с решёткой и поручнями, противовес, кабина со стёклами
// и козырьком, стрела и рукоять коробчатые с гидроцилиндрами, ковш с зубьями опущен на землю.
function excavator(P, kit, m) {
  const at = function (x, y, z, ry, rx, rz) { return mul(m, M(x * C, y * C, z * C, ry, rx, rz)); };
  const fine = kit.fine;
  const TR = 0.25, TL = 0.95;      // радиус огибания ленты и полудлина ходовой (клетки)
  [-1, 1].forEach(function (k) {
    const x = k * 0.72;
    P.put('blacksteel', kit.box(0.3 * C, 0.3 * C, 1.75 * C, 0.04), at(x, 0.28, 0));
    // звёздочка сзади, ленивец спереди, опорные катки снизу, поддерживающие сверху
    [-TL, TL].forEach(function (z, e) { P.put('blacksteel', kit.cyl(0.22 * C, 0.22 * C, 0.4 * C, fine ? 18 : 10), at(x - 0.2, 0.28, z, 0, 0, -Math.PI / 2)); if (!e) for (let i = 0; i < 9; i++) P.put('blacksteel', kit.box(0.42 * C, 0.06 * C, 0.06 * C, 0), mul(at(x, 0.28, z, 0, i / 9 * Math.PI * 2, 0), M(0, 0.24 * C, 0))); });
    for (let i = 0; i < 5; i++) P.put('steel', kit.cyl(0.08 * C, 0.08 * C, 0.36 * C, 12), at(x - 0.18, 0.11, -0.64 + i * 0.32, 0, 0, -Math.PI / 2), hex(0x55585c));
    // лента: башмаки по стадиону вокруг звёздочки и ленивца
    const run = 2 * TL, arc = Math.PI * TR, total = 2 * run + 2 * arc;
    const n = fine ? 46 : 22;
    for (let i = 0; i < n; i++) {
      let u = i / n * total, y, z, ang;
      if (u < run) { z = -TL + u; y = 0.28 + TR; ang = 0; }
      else if ((u -= run) < arc) { const a = u / TR; z = TL + Math.sin(a) * TR; y = 0.28 + Math.cos(a) * TR; ang = a; }
      else if ((u -= arc) < run) { z = TL - u; y = 0.28 - TR; ang = Math.PI; }
      else { u -= run; const a = u / TR; z = -TL - Math.sin(a) * TR; y = 0.28 - Math.cos(a) * TR; ang = Math.PI + a; }
      const shoe = at(x, y, z, 0, ang, 0);
      P.put('blacksteel', kit.box(0.5 * C, 0.035 * C, total / n * 0.92 * C, 0), shoe);
      if (fine) P.put('blacksteel', kit.box(0.5 * C, 0.04 * C, 0.025 * C, 0), mul(shoe, M(0, 0.03 * C, 0)));
    }
  });
  P.put('blacksteel', kit.box(0.95 * C, 0.3 * C, 1.3 * C, 0.03), at(0, 0.45, 0));
  // поворотная часть развёрнута (у оригинала — тот же угол): ковш на земле наискосок
  const u = mul(m, M(0, 0, 0, 0.55));
  const au = function (x, y, z, ry, rx, rz) { return mul(u, M(x * C, y * C, z * C, ry, rx, rz)); };
  const wu = function (x, y, z) { return V(x * C, y * C, z * C).applyMatrix4(u); };
  const side = new THREE.Vector3(1, 0, 0).transformDirection(u);
  P.put('blacksteel', kit.cyl(0.62 * C, 0.62 * C, 0.1 * C, 24), au(0, 0.6, 0));
  P.put('paint', kit.box(1.6 * C, 0.08 * C, 1.9 * C, 0.02), au(0.05, 0.72, -0.25), DARK);
  // моторный отсек: капот, решётка, швы створок, поручни, выхлоп
  P.put('paint', kit.box(1.56 * C, 0.6 * C, 1.05 * C, 0.05), au(0.05, 1.06, -0.62), YELLOW);
  for (let i = 0; i < 7; i++) P.put('blacksteel', kit.box(0.56 * C, 0.015 * C, 0.04 * C, 0), au(0.42, 1.365, -0.95 + i * 0.07));
  [-1, 1].forEach(function (k) { P.put('blacksteel', kit.box(0.008 * C, 0.5 * C, 0.012 * C, 0), au(0.05 + k * 0.78, 1.05, -0.62)); });
  P.put('blacksteel', kit.box(0.008 * C, 0.012 * C, 1.0 * C, 0), au(0.83, 1.32, -0.62));
  P.tube('tube', wu(0.8, 1.37, -1.0), wu(0.8, 1.6, -1.0), 0.02 * C, YELLOW, 6);
  P.tube('tube', wu(0.8, 1.6, -1.0), wu(0.8, 1.6, -0.2), 0.02 * C, YELLOW, 6);
  P.tube('tube', wu(0.8, 1.37, -0.2), wu(0.8, 1.6, -0.2), 0.02 * C, YELLOW, 6);
  P.put('blacksteel', kit.cyl(0.05 * C, 0.05 * C, 0.42 * C, 10), au(0.5, 1.34, -0.55));
  // противовес: тяжёлый литой блок со скруглением, чёрные полосы
  P.put('paint', kit.box(1.64 * C, 0.62 * C, 0.42 * C, 0.08), au(0.05, 1.04, -1.33), YELLOW.clone().multiplyScalar(0.92));
  for (let i = 0; i < 4; i++) P.put('paint', kit.box(0.12 * C, 0.3 * C, 0.01 * C, 0), au(-0.45 + i * 0.33, 1.0, -1.545, 0, 0, 0.6), DARK);
  // кабина: рама, стёкла спереди и по бокам, крыша с козырьком, ручка двери, маячок
  const cab = au(-0.42, 1.25, 0.3);
  const ac = function (x, y, z, ry) { return mul(cab, M(x * C, y * C, z * C, ry || 0)); };
  P.put('paint', kit.box(0.72 * C, 0.95 * C, 0.88 * C, 0.04), ac(0, 0.5, 0), DARK);
  P.put('pane', quad(0.6 * C, 0.66 * C), ac(-0.3, 0.2, 0.442), WHITE);
  P.put('pane', quad(0.7 * C, 0.6 * C), ac(-0.362, 0.26, -0.35, -Math.PI / 2), WHITE);
  P.put('pane', quad(0.4 * C, 0.6 * C), ac(0.362, 0.26, -0.36 + 0.4 - 0.05, Math.PI / 2), WHITE);
  P.put('paint', kit.box(0.78 * C, 0.06 * C, 1.02 * C, 0.02), ac(0, 0.99, 0.05), YELLOW);
  P.put('steel', kit.box(0.02 * C, 0.03 * C, 0.1 * C, 0.004), ac(-0.37, 0.5, -0.1), hex(0x9a9ea2));
  P.put('blacksteel', kit.cyl(0.05 * C, 0.05 * C, 0.03 * C, 10), ac(0.2, 1.02, -0.2));
  P.put('paint', kit.cyl(0.045 * C, 0.04 * C, 0.09 * C, 10), ac(0.2, 1.05, -0.2), hex(0xf08a10));
  P.put('blacksteel', kit.box(0.12 * C, 0.08 * C, 0.07 * C, 0.008), ac(-0.25, 1.06, 0.48));
  P.put('lamp', quad(0.09 * C, 0.05 * C), ac(-0.295, 1.035, 0.516), WHITE);
  // стрела и рукоять — коробчатые балки, пальцы шарниров, гидроцилиндры
  const B0 = wu(0.3, 1.0, 0.55), B1 = wu(0.3, 2.85, 2.3), K1 = wu(0.3, 0.75, 3.0);
  beam(P, kit, 'paintworn', B0, B1, 0.3 * C, 0.42 * C, side, YELLOW, 0.03);
  beam(P, kit, 'paintworn', B1, K1, 0.24 * C, 0.3 * C, side, YELLOW, 0.025);
  [B0, B1].forEach(function (p) { P.put('steel', kit.cyl(0.07 * C, 0.07 * C, 0.4 * C, 12), mul(u, M(0, 0, 0, 0, 0, -Math.PI / 2)).setPosition(p.clone().addScaledVector(side, -0.2 * C)), hex(0x8a8e92)); });
  [-1, 1].forEach(function (k) {
    const a = wu(0.3 + k * 0.2, 0.85, 0.95), b = wu(0.3 + k * 0.2, 2.0, 1.55);
    P.tube('paintworn', a, a.clone().lerp(b, 0.55), 0.07 * C, YELLOW, 10);
    P.tube('steel', a.clone().lerp(b, 0.5), b, 0.04 * C, hex(0xd6d9dc), 10);
  });
  const s0 = wu(0.3, 2.55, 1.65), s1 = wu(0.3, 3.15, 2.45);
  P.tube('paintworn', s0, s0.clone().lerp(s1, 0.6), 0.06 * C, YELLOW, 10);
  P.tube('steel', s0.clone().lerp(s1, 0.55), s1, 0.035 * C, hex(0xd6d9dc), 10);
  const k0 = wu(0.3, 2.5, 2.55), k1 = wu(0.3, 1.25, 2.95);
  P.tube('paintworn', k0, k0.clone().lerp(k1, 0.6), 0.05 * C, YELLOW, 10);
  P.tube('steel', k0.clone().lerp(k1, 0.55), k1, 0.03 * C, hex(0xd6d9dc), 10);
  // шланги вдоль стрелы
  P.tube('rubber', wu(0.42, 1.25, 0.8), wu(0.42, 2.95, 2.25), 0.02 * C, WHITE, 6);
  P.tube('rubber', wu(0.18, 1.25, 0.8), wu(0.18, 2.95, 2.25), 0.02 * C, WHITE, 6);
  // ковш: днище, щёки, зубья
  const bk = au(0.3, 0.32, 3.12, 0, 0.35, 0);
  P.put('steelplate', kit.tbox('steelplate', 0.62 * C, 0.42 * C, 0.48 * C, 0.03), bk);
  [-1, 1].forEach(function (k) { P.put('paintworn', kit.box(0.03 * C, 0.46 * C, 0.52 * C, 0.008), mul(bk, M(k * 0.32 * C, 0, 0)), YELLOW); });
  for (let i = 0; i < 5; i++) P.put('blacksteel', kit.box(0.06 * C, 0.05 * C, 0.14 * C, 0.01), mul(bk, M((i - 2) * 0.13 * C, -0.2 * C, 0.27 * C, 0, -0.2, 0)));
}
function truckCrane(P, kit, m) {
  const at = function (x, y, z, ry, rx, rz) { return mul(m, M(x * C, y * C, z * C, ry, rx, rz)); };
  P.put('blacksteel', kit.box(1 * C, 0.32 * C, 4.4 * C, 0.02), at(0, 0.72, -0.7));
  [0.75, -1.35, -2.2].forEach(function (z) { [-1, 1].forEach(function (k) { wheel(P, kit, at(k * 0.62, 0.42, z), 0.42 * C, 0.3 * C, k, { rim: hex(0x8e8f8a), nuts: 10 }); }); });
  P.put('paintworn', kit.box(1.5 * C, 0.12 * C, 2.9 * C, 0.02), at(0, 0.95, -1.2), YELLOW);
  P.put('paint', kit.box(1.4 * C, 1.05 * C, 1 * C, 0.06), at(0, 1.4, 1.05), YELLOW);
  P.put('pane', quad(1.2 * C, 0.45 * C), at(-0.6, 1.5, 1.555), WHITE);
  P.put('paintworn', kit.box(1.25 * C, 0.5 * C, 1.5 * C, 0.04), at(0, 1.6, -1.85), YELLOW);
  P.bar('paintworn', V(-0.1 * C, 1.95 * C, -2.2 * C).applyMatrix4(m), V(-0.1 * C, 4.2 * C, 1.4 * C).applyMatrix4(m), 0.44 * C, YELLOW);
  P.bar('paintworn', V(-0.1 * C, 4.1 * C, 1.24 * C).applyMatrix4(m), V(-0.1 * C, 5.05 * C, 2.76 * C).applyMatrix4(m), 0.31 * C, YELLOW);
  P.tube('cable', V(-0.1 * C, 5.0 * C, 2.85 * C).applyMatrix4(m), V(-0.1 * C, 1.35 * C, 2.85 * C).applyMatrix4(m), 0.012 * C, WHITE, 5);
  P.put('paintworn', kit.box(0.36 * C, 0.42 * C, 0.26 * C, 0.03), at(-0.1, 1.15, 2.85), YELLOW);
  // кабина шасси: стёкла по бокам, козырёк, фары, решётка; кабина крановщика у основания стрелы
  [-1, 1].forEach(function (k) {
    P.put('pane', quad(0.62 * C, 0.42 * C), mul(at(k * 0.702, 1.5, k > 0 ? 1.4 : 0.78), M(0, 0, 0, k * Math.PI / 2)), WHITE);
    P.put('blacksteel', kit.box(0.18 * C, 0.1 * C, 0.02 * C, 0.004), at(k * 0.5, 1.0, 1.555));
    P.put('lamp', quad(0.14 * C, 0.07 * C), at(k * 0.5 - 0.07, 0.965, 1.567), WHITE);
  });
  for (let i = 0; i < 4; i++) P.put('blacksteel', kit.box(0.5 * C, 0.02 * C, 0.015 * C, 0), at(0, 1.08 + i * 0.05, 1.556));
  P.put('paint', kit.box(1.44 * C, 0.05 * C, 1.06 * C, 0.015), at(0, 1.95, 1.05), YELLOW.clone().multiplyScalar(0.85));
  P.put('paint', kit.box(0.62 * C, 0.7 * C, 0.8 * C, 0.04), at(0.5, 2.2, -1.45), DARK);
  P.put('pane', quad(0.5 * C, 0.45 * C), at(0.25, 2.1, -1.048), WHITE);
  P.put('pane', quad(0.6 * C, 0.45 * C), mul(at(0.812, 2.1, -1.15), M(0, 0, 0, Math.PI / 2)), WHITE);
  // гидроцилиндр подъёма стрелы, противовес поворотной части, маячки
  const lf0 = V(-0.1 * C, 1.85 * C, -1.1 * C).applyMatrix4(m), lf1 = V(-0.1 * C, 3.25 * C, -0.15 * C).applyMatrix4(m);
  P.tube('paintworn', lf0, lf0.clone().lerp(lf1, 0.6), 0.11 * C, YELLOW, 12);
  P.tube('steel', lf0.clone().lerp(lf1, 0.55), lf1, 0.07 * C, hex(0xd6d9dc), 12);
  P.put('paint', kit.box(1.3 * C, 0.5 * C, 0.45 * C, 0.06), at(0, 1.9, -2.75), YELLOW.clone().multiplyScalar(0.9));
  [-0.5, 0.5].forEach(function (x) {
    P.put('blacksteel', kit.cyl(0.05 * C, 0.05 * C, 0.03 * C, 10), at(x, 1.98, 1.2));
    P.put('paint', kit.cyl(0.045 * C, 0.04 * C, 0.09 * C, 10), at(x, 2.01, 1.2), hex(0xf08a10));
  });
  // секции телескопа: стыки и направляющие
  [0.42, 0.55].forEach(function (t, i) {
    const p = V(-0.1 * C, 1.95 * C, -2.2 * C).lerp(V(-0.1 * C, 5.05 * C, 2.76 * C), t + i * 0.18).applyMatrix4(m);
    P.put('blacksteel', kit.box(0.5 * C, 0.06 * C, 0.5 * C, 0.01), mul(m, M(0, 0, 0, 0, 1.01, 0)).setPosition(p));
  });
  [0.3, -2.6].forEach(function (z) {
    P.put('paintworn', kit.box(3 * C, 0.16 * C, 0.2 * C, 0.02), at(0, 0.62, z), YELLOW);
    [-1, 1].forEach(function (k) {
      P.put('blacksteel', kit.box(0.12 * C, 0.52 * C, 0.12 * C, 0.01), at(k * 1.45, 0.34, z));
      P.put('planks', kit.tbox('planks', 0.5 * C, 0.08 * C, 0.5 * C, 0.01), at(k * 1.45, 0.04, z));
    });
  });
}
const BUILD = { compressor: compressor, roller: roller, excavator: excavator, truckCrane: truckCrane };
export function machines(P, kit, lay, heightAt) {
  lay.machines.forEach(function (mc) {
    if (mc.tier > lay.tier) return;
    const x = mc.x * C, z = mc.z * C;
    // на земле двора: по самой низкой точке под стоянкой (колёса не висят)
    const y = heightAt ? Math.min(heightAt(x, z), heightAt(x + 1, z + 1), heightAt(x - 1, z - 1), heightAt(x + 1, z - 1), heightAt(x - 1, z + 1)) : 0;
    BUILD[mc.kind](P, kit, M(x, y, z, mc.yaw));
  });
}

// ---------- поддоны с блоками у въезда ----------
// Поддон 2 × 2 м (у оригинала 0,98 клетки): настил из пяти досок на трёх брусках, нижние доски; на нём 8 блоков
// материала уровня кладкой своего семейства; у двух из трёх — синие стяжные ленты с пряжками; вокруг — щепа.
export function pallets(P, kit, lay, MB, heightAt) {
  lay.supply.pallets.forEach(function (pl, i) {
    const m = M(pl.x * C, heightAt ? heightAt(pl.x * C, pl.z * C) : 0, pl.z * C, pl.turn);
    const at = function (x, y, z, ry) { return mul(m, M(x * C, y * C, z * C, ry || 0)); };
    // доски: фаска 1 см одним сегментом (скруглять нечего), нижние доски и щепа — без фаски
    for (let k = 0; k < 5; k++) P.put('planks', kit.tbox('planks', 0.98 * C, 0.04 * C, 0.15 * C, 0.004, i * 0.3 + k * 0.17, k * 0.125, 1), at(0, 0.16, (k - 2) * 0.205, (k - 2) * 0.004));
    for (let k = -1; k <= 1; k++) P.put('planks', kit.tbox('planks', 0.12 * C, 0.1 * C, 0.98 * C, 0.006, k * 0.4 + i, 0.5, 1), at(k * 0.43, 0.07, 0));
    for (let k = -1; k <= 1; k += 2) P.put('planks', kit.tbox('planks', 0.98 * C, 0.03 * C, 0.12 * C, 0, i + k, 0.75), at(0, 0.015, k * 0.42));
    const fam = familyOf(MB, pl.materialId);
    const tint = tintOf(MB, pl.materialId, fam);
    const col = new THREE.Color(tint[0], tint[1], tint[2]);
    const tile = familyTile(fam);
    for (let k = 0; k < 8; k++) {
      const bx = ((k & 1) - 0.5) * 0.44, by = 0.39 + (k >> 2) * 0.44, bz = (((k >> 1) & 1) - 0.5) * 0.44;
      P.put('fam:' + fam, boxUV(kit.box(0.42 * C, 0.42 * C, 0.42 * C, 0.02), tile[0], tile[1], k * 0.31, k * 0.17), at(bx, by, bz, ((k * 37) % 5 - 2) * 0.01), col);
    }
    if (i % 3 !== 0) {
      const spec = MB.MATERIAL[pl.materialId];
      const blue = !!spec && (spec.color & 255) > ((spec.color >> 16) & 255) + 40;
      const strap = blue ? STRAP_L : STRAP;
      [-1, 1].forEach(function (sd) {
        P.put('paint', kit.box(0.9 * C, 0.008 * C, 0.04 * C, 0), at(0, 1.048, sd * 0.22), strap);
        [-1, 1].forEach(function (e) { P.put('paint', kit.box(0.008 * C, 0.88 * C, 0.04 * C, 0), at(e * 0.443, 0.61, sd * 0.22), strap); });
        P.put('steel', kit.box(0.014 * C, 0.05 * C, 0.06 * C, 0.003), at(0.452, 0.48, sd * 0.22));
      });
    }
    const r = rng(Math.abs(Math.round(pl.x * 37 + pl.z * 91)) + i * 7 + 1);
    for (let k = 0; k < (kit.fine ? 22 : 8); k++) {
      const a = r() * Math.PI * 2, rr = (0.58 + r() * r() * 0.55) * C;
      P.put('planks', kit.tbox('planks', (0.04 + r() * 0.06) * C, 0.006 * C, (0.015 + r() * 0.02) * C, 0, r(), r()), mul(m, M(Math.sin(a) * rr, 0.006, Math.cos(a) * rr, r() * Math.PI)), hex(k % 2 ? 0xd9b07a : 0xb48452));
    }
  });
}
export { RED, YELLOW, DARK, STEEL };
