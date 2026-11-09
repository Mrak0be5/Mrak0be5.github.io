// Башенный кран за карьером (art/props.js crane): у оригинала — мачта-ферма 15 клеток × s, стрела 13 вдоль +x,
// противовесная консоль с грузами, оголовок с тягами, кабина, тележка с крюком на тросе. Здесь — решётчатая мачта
// из труб с раскосами и лестницей внутри, фундамент с балластными блоками, поворотная часть: треугольная ферма
// стрелы, консоль с настилом, перилами, лебёдкой и бетонными грузами, оголовок-пирамида, тяги, кабина
// крановщика, заградительные огни. Кран работает: поворачивает стрелу (в пределах плато, от позы оригинала),
// гоняет тележку, опускает и поднимает крюк; крюк качается на тросе. Мачта и фундамент — в общей куче площадки,
// подвижное — свои меши (markDynamic: скорость для TAA).
import * as THREE from 'three';
import { CELL } from './families.js?v=9f2863b';
import { Pile, M, mul, hex, WHITE } from './site-kit.js?v=9f2863b';
import { markDynamic, DYNAMIC } from './render.js?v=9f2863b';

const C = CELL;
const V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
const YELLOW = hex(0xeac042), DARK = hex(0x2f3134);
const H = 15, L = 13;

function ease(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }

export function buildCrane(P, kit, lay, heightAt, family) {
  const c = lay.crane, s = c.s, K = s * C;
  const x = c.x * C, z = c.z * C;
  const y0 = heightAt(x, z);
  const root = M(x, y0, z, c.yaw);
  const wp = function (lx, ly, lz) { return V(lx * K, ly * K, lz * K).applyMatrix4(root); };
  const at = function (lx, ly, lz, ry, rx, rz) { return mul(root, M(lx * K, ly * K, lz * K, ry || 0, rx || 0, rz || 0)); };
  const th = Math.sqrt(s);
  const fine = kit.fine;
  // подвижные кучи — на тех же клонах материалов с грязью, что и неподвижная (одна программа шейдера на материал):
  // земля — плато под краном, своей грязи у них нет
  const pile = function () { const q = new Pile(kit); q.ground = function () { return y0; }; q.mudK = 0; return q; };

  // ---------- фундамент ----------
  P.put('concrete', kit.tbox('concrete', 3.4 * K, 0.4 * K, 3.4 * K, 0.05, 0.3, 0.1), at(0, 0.2, 0));
  [-1, 1].forEach(function (k) {
    for (let i = 0; i < 3; i++) {
      P.put('concrete', kit.tbox('concrete', 0.88 * K, 0.68 * K, 0.84 * K, 0.04, k + i * 0.4, 0.5), at(k * 0.95, 0.75, (i - 1) * 0.86));
      if (fine) [-1, 1].forEach(function (e) { P.put('steel', kit.cyl(0.03 * th, 0.03 * th, 0.06, 6), at(k * 0.95 + e * 0.2, 1.09, (i - 1) * 0.86)); });
    }
  });
  // ---------- мачта ----------
  const w = 0.92, h0 = 0.4, h1 = 0.4 + H;
  const chordR = 0.07 * th, braceR = 0.035 * th;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  corners.forEach(function (q) {
    P.tube('paintworn', wp(q[0] * w / 2, h0, q[1] * w / 2), wp(q[0] * w / 2, h1, q[1] * w / 2), chordR, YELLOW, 8);
    P.put('blacksteel', kit.box(0.2 * th, 0.04, 0.2 * th, 0.01), at(q[0] * w / 2, h0 + 0.01, q[1] * w / 2));
  });
  const secH = 1.25;
  const sections = Math.round(H / secH);
  for (let i = 0; i < sections; i++) {
    const ya = h0 + i * H / sections, yb = h0 + (i + 1) * H / sections;
    for (let f = 0; f < 4; f++) {
      const a = corners[f], b = corners[(f + 1) % 4];
      P.tube('paintworn', wp(a[0] * w / 2, ya, a[1] * w / 2), wp(b[0] * w / 2, ya, b[1] * w / 2), braceR, YELLOW, 6);
      // раскосы зигзагом: соседние грани — навстречу
      const up = (i + f) % 2 === 0;
      P.tube('paintworn', wp(a[0] * w / 2, up ? ya : yb, a[1] * w / 2), wp(b[0] * w / 2, up ? yb : ya, b[1] * w / 2), braceR, YELLOW, 6);
    }
    // фланцы стыков секций
    if (fine && i % 2 === 0) corners.forEach(function (q) { P.put('blacksteel', kit.box(0.17 * th, 0.06, 0.17 * th, 0.008), at(q[0] * w / 2, ya, q[1] * w / 2)); });
  }
  // лестница внутри мачты
  if (fine) {
    [-0.18, 0.18].forEach(function (lx) { P.tube('steel', wp(lx, h0, -w / 2 + 0.12), wp(lx, h1, -w / 2 + 0.12), 0.018, WHITE, 5); });
    for (let yy = h0 + 0.15; yy < h1; yy += 0.15) P.tube('steel', wp(-0.18, yy, -w / 2 + 0.12), wp(0.18, yy, -w / 2 + 0.12), 0.011, WHITE, 4);
  }

  // ---------- поворотная часть (своя группа: начало — ось мачты на высоте h1) ----------
  const S = pile();
  const top = H + 0.4;  // y оригинала верха мачты (h1)
  const sp = function (lx, ly, lz) { return V(lx * K, (ly - top) * K, lz * K); };
  const sat = function (lx, ly, lz, ry, rx, rz) { return M(lx * K, (ly - top) * K, lz * K, ry || 0, rx || 0, rz || 0); };
  // опорно-поворотное устройство и платформа
  S.put('blacksteel', kit.cyl(0.62 * K, 0.62 * K, 0.12 * K, 24), sat(0, H + 0.4, 0));
  S.put('paintworn', kit.box(1.3 * K, 0.28 * K, 1.3 * K, 0.03), sat(0, H + 0.66, 0), DARK);
  // кабина крановщика: рама, стёкла спереди, сбоку и снизу, крыша, козырёк
  const cab = sat(0.35, H + 1.25, 0.95);
  S.put('paintworn', kit.box(0.88 * K, 0.88 * K, 0.82 * K, 0.04), cab, YELLOW);
  S.put('pane', quadP(0.74 * K, 0.6 * K), mul(cab, M(0.445 * K, -0.22 * K, 0.37 * K, Math.PI / 2)), WHITE);
  S.put('pane', quadP(0.7 * K, 0.6 * K), mul(cab, M(-0.35 * K, -0.22 * K, 0.445 * K)), WHITE);
  S.put('paintworn', kit.box(0.96 * K, 0.04 * K, 0.9 * K, 0.01), mul(cab, M(0, 0.46 * K, 0)), YELLOW.clone().multiplyScalar(0.8));
  S.put('blacksteel', kit.box(0.04 * K, 0.06 * K, 0.7 * K, 0), mul(cab, M(0.47 * K, 0.4 * K, 0)));
  // оголовок-пирамида
  const hb = H + 0.8, ht = H + 4.4, hw = 0.32, tw = 0.08;
  corners.forEach(function (q, i) {
    const a = sp(q[0] * hw, hb, q[1] * hw), b = sp(q[0] * tw, ht, q[1] * tw);
    S.tube('paintworn', a, b, chordR * 0.9, YELLOW, 8);
    const n = corners[(i + 1) % 4];
    for (let k = 0; k < 3; k++) {
      const u0 = k / 3, u1 = (k + 1) / 3;
      const r0 = hw + (tw - hw) * u0, r1 = hw + (tw - hw) * u1;
      S.tube('paintworn', sp(q[0] * r0, hb + (ht - hb) * u0, q[1] * r0), sp(n[0] * r0, hb + (ht - hb) * u0, n[1] * r0), braceR, YELLOW, 6);
      S.tube('paintworn', sp(q[0] * r0, hb + (ht - hb) * u0, q[1] * r0), sp(n[0] * r1, hb + (ht - hb) * u1, n[1] * r1), braceR, YELLOW, 6);
    }
  });
  S.put('blacksteel', kit.box(0.26 * K, 0.14 * K, 0.26 * K, 0.02), sat(0, ht, 0));
  // стрела: треугольная ферма (два нижних пояса — пути тележки, верхний пояс), панели по 1 клетке
  const jx0 = 0.5, jx1 = 0.5 + L, jy0 = H + 0.8, jy1 = H + 1.6, jz = 0.35;
  [-1, 1].forEach(function (e) { S.tube('paintworn', sp(jx0, jy0, e * jz), sp(jx1, jy0, e * jz), chordR, YELLOW, 8); });
  S.tube('paintworn', sp(jx0, jy1, 0), sp(jx1 - 0.3, jy1, 0), chordR, YELLOW, 8);
  const bays = L;
  for (let i = 0; i <= bays; i++) {
    const xa = jx0 + (jx1 - jx0) * i / bays, xm = jx0 + (jx1 - jx0) * (i + 0.5) / bays, xb = jx0 + (jx1 - jx0) * (i + 1) / bays;
    S.tube('paintworn', sp(xa, jy0, -jz), sp(xa, jy0, jz), braceR, YELLOW, 6);
    if (i === bays) break;
    [-1, 1].forEach(function (e) {
      S.tube('paintworn', sp(xa, jy0, e * jz), sp(Math.min(xm, jx1 - 0.3), jy1, 0), braceR, YELLOW, 6);
      S.tube('paintworn', sp(Math.min(xm, jx1 - 0.3), jy1, 0), sp(xb, jy0, e * jz), braceR, YELLOW, 6);
    });
    if (fine) S.tube('paintworn', sp(xa, jy0, -jz), sp(xb, jy0, jz), braceR * 0.8, YELLOW, 5);
  }
  S.tube('paintworn', sp(jx1, jy0, -jz), sp(jx1 - 0.3, jy1, 0), braceR, YELLOW, 6);
  S.tube('paintworn', sp(jx1, jy0, jz), sp(jx1 - 0.3, jy1, 0), braceR, YELLOW, 6);
  // противовесная консоль: балки, настил, перила, лебёдка, бетонные грузы
  const cx0 = -0.5, cx1 = -5.3, cy = H + 0.9, cz = 0.45;
  [-1, 1].forEach(function (e) {
    S.put('paintworn', kit.box(4.8 * K, 0.22 * K, 0.1 * K, 0.01), sat((cx0 + cx1) / 2, cy, e * cz), YELLOW);
    if (fine) for (let i = 0; i <= 6; i++) S.tube('tube', sp(cx0 - i * 0.8, cy + 0.11, e * cz), sp(cx0 - i * 0.8, cy + 0.6, e * cz), 0.022, WHITE, 5);
    S.tube('tube', sp(cx0, cy + 0.6, e * cz), sp(cx1, cy + 0.6, e * cz), 0.022, WHITE, 6);
  });
  S.put('diamond', kit.tbox('diamond', 4.6 * K, 0.03 * K, 0.8 * K, 0.004), sat((cx0 + cx1) / 2, cy + 0.12, 0));
  S.put('paintworn', kit.box(0.7 * K, 0.42 * K, 0.6 * K, 0.03), sat(-1.6, cy + 0.34, 0), hex(0x5c6066));
  S.put('blacksteel', kit.cyl(0.16 * K, 0.16 * K, 0.5 * K, 18), sat(-2.3, cy + 0.32, -0.25, 0, Math.PI / 2, 0));
  for (let k = 0; k < 3; k++) {
    S.put('concrete', kit.tbox('concrete', 0.5 * K, 1.1 * K, 0.96 * K, 0.03, k * 0.31, 0.4), sat(-4.1 + k * 0.6, H + 0.45, 0));
    if (fine) S.put('steel', kit.cyl(0.03, 0.03, 0.08, 6), sat(-4.1 + k * 0.6, H + 1.02, 0));
  }
  // тяги от оголовка к стреле и к концу консоли (по две)
  [-0.06, 0.06].forEach(function (e) {
    S.tube('steel', sp(0, H + 4.35, e), sp(L * 0.72, jy1, e), 0.028 * th, WHITE, 6);
    S.tube('steel', sp(0, H + 4.35, e), sp(-5.0, cy + 0.3, e), 0.028 * th, WHITE, 6);
  });
  // заградительные огни: оголовок, конец стрелы, конец консоли
  [[0, ht + 0.12, 0], [jx1 + 0.05, jy1 - 0.1, 0], [cx1 - 0.05, cy + 0.65, 0]].forEach(function (q) {
    S.put('blacksteel', kit.cyl(0.05 * K, 0.05 * K, 0.04 * K, 10), sat(q[0], q[1] - 0.04, q[2]));
    S.put('redlamp', kit.cyl(0.04 * K, 0.035 * K, 0.07 * K, 10), sat(q[0], q[1], q[2]));
  });
  const slew = S.build(family);
  slew.name = 'crane-slew';
  slew.position.copy(wp(0, top, 0));
  slew.rotation.y = c.yaw;

  // ---------- тележка, тросы, крюковая обойма ----------
  const T = pile();
  T.put('blacksteel', kit.box(0.8 * K, 0.14 * K, 0.86 * K, 0.02), M(0, -0.12 * K, 0));
  [-1, 1].forEach(function (e) {
    [-1, 1].forEach(function (f) { T.put('steel', kit.cyl(0.07 * K, 0.07 * K, 0.06 * K, 12), M(f * 0.25 * K, 0, e * jz * K, 0, Math.PI / 2, 0)); });
  });
  [-0.12, 0.12].forEach(function (lx) { T.put('steel', kit.cyl(0.09 * K, 0.09 * K, 0.05 * K, 14), M(lx * K, -0.22 * K, -0.025 * K, 0, Math.PI / 2, 0)); });
  const trolley = T.build(family);
  trolley.name = 'crane-trolley';
  const HK = pile();
  // обойма: щёки с полосами, блоки, крюк
  const stripes = 5;
  for (let i = 0; i < stripes; i++) HK.put('paintworn', kit.box(0.46 * K, 0.5 * K / stripes, 0.3 * K, 0.004), M(0, (0.25 - (i + 0.5) / stripes * 0.5) * K, 0), i % 2 ? DARK : YELLOW);
  [-0.12, 0.12].forEach(function (lx) { HK.put('steel', kit.cyl(0.1 * K, 0.1 * K, 0.32 * K, 14), M(lx * K, 0.22 * K, -0.16 * K, 0, Math.PI / 2, 0)); });
  HK.put('steel', kit.cyl(0.035 * K, 0.035 * K, 0.18 * K, 8), M(0, -0.43 * K, 0));
  HK.put('steel', kit.box(0.04 * K, 0.18 * K, 0.04 * K, 0.006), M(0.06 * K, -0.52 * K, 0, 0, 0, 0.6));
  HK.put('steel', kit.box(0.04 * K, 0.12 * K, 0.04 * K, 0.006), M(-0.03 * K, -0.58 * K, 0, 0, 0, -0.9));
  const hook = HK.build(family);
  hook.name = 'crane-hook';
  // четыре ветви троса — единичной длины вниз от тележки (растягиваются по y)
  const R = pile();
  [[-0.12, -0.1], [-0.12, 0.1], [0.12, -0.1], [0.12, 0.1]].forEach(function (q) { R.tube('cable', V(q[0] * K, 0, q[1] * K), V(q[0] * K, -1, q[1] * K), 0.012 * th, WHITE, 4); });
  const rope = R.build(family);
  rope.name = 'crane-rope';
  rope.children.forEach(function (m) { m.castShadow = true; });
  slew.add(trolley, rope);
  const group = new THREE.Group();
  group.name = 'crane';
  group.add(slew, hook);
  [slew, hook].forEach(markDynamic);

  // ---------- ход крана ----------
  // Цикл 64 с: поворот стрелы от позы оригинала дальше от стройки, тележка наружу, крюк вниз, пауза, крюк вверх,
  // поворот назад, тележка к мачте. Крюк — маятник на тросе: отстаёт при разгоне тележки и повороте.
  const S0 = 0, S1 = 0.42 * (0.8 + 0.4 * ((lay.level.index * 0.37) % 1));
  const TX0 = 0.5 + L * 0.55, TX1 = 0.5 + L * 0.82;
  const HY0 = H - 5.2, HY1 = H - 8.4;
  let time = 0, swingX = 0, swingZ = 0, vx = 0, vz = 0;
  const prevHook = new THREE.Vector3(), hookW = new THREE.Vector3(), tmp = new THREE.Vector3();
  let first = true;
  function pose(t) {
    const p = t % 64;
    let a = S0, tx = TX0, hy = HY0;
    if (p < 10) a = S0 + (S1 - S0) * ease(p / 10);
    else if (p < 40) a = S1;
    else if (p < 50) a = S1 + (S0 - S1) * ease((p - 40) / 10);
    if (p >= 10 && p < 18) tx = TX0 + (TX1 - TX0) * ease((p - 10) / 8);
    else if (p >= 18 && p < 50) tx = TX1;
    else if (p >= 50 && p < 58) tx = TX1 + (TX0 - TX1) * ease((p - 50) / 8);
    if (p >= 18 && p < 26) hy = HY0 + (HY1 - HY0) * ease((p - 18) / 8);
    else if (p >= 26 && p < 32) hy = HY1;
    else if (p >= 32 && p < 40) hy = HY1 + (HY0 - HY1) * ease((p - 32) / 8);
    return { a: a, tx: tx, hy: hy };
  }
  function update(dt) {
    time += dt;
    const q = pose(time);
    slew.rotation.y = c.yaw + q.a;
    trolley.position.set(q.tx * K, (H + 0.8 - top) * K - 0.02, 0);
    // точка подвеса в мире; крюк догоняет её маятником (длина троса — до обоймы)
    slew.updateMatrixWorld(true);
    trolley.getWorldPosition(tmp);
    const len = (H + 0.62 - q.hy) * K;
    const g = 9.8, k = g / Math.max(2, len), damp = 0.6;
    if (first) { prevHook.copy(tmp); first = false; }
    const ax = (tmp.x - prevHook.x), az = (tmp.z - prevHook.z);
    prevHook.copy(tmp);
    const sdt = Math.min(0.05, dt);
    // крюк по инерции остаётся на месте, когда подвес уходит, и возвращается под него маятником
    swingX -= ax * 0.95; swingZ -= az * 0.95;
    if (sdt > 0) {
      vx += (-k * swingX - damp * vx) * sdt;
      vz += (-k * swingZ - damp * vz) * sdt;
      swingX += vx * sdt; swingZ += vz * sdt;
      swingX = THREE.MathUtils.clamp(swingX, -1.2, 1.2); swingZ = THREE.MathUtils.clamp(swingZ, -1.2, 1.2);
    }
    hookW.set(tmp.x + swingX, tmp.y - len, tmp.z + swingZ);
    hook.position.copy(hookW);
    hook.rotation.y = slew.rotation.y;
    // трос: от тележки к обойме (наклон — по качанию)
    rope.position.copy(trolley.position);
    const lenR = Math.hypot(swingX, len, swingZ);
    rope.scale.set(1, lenR - 0.15 * K, 1);
    // наклон троса в осях поворотной части
    tmp.set(swingX, 0, swingZ).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -slew.rotation.y);
    rope.rotation.set(-Math.atan2(tmp.z, len), 0, Math.atan2(tmp.x, len), 'XZY');
  }
  update(0);
  function dispose() { DYNAMIC.delete(slew); DYNAMIC.delete(hook); }
  return { group: group, update: update, dispose: dispose };
}

// Стекло: прямоугольник w × h в плоскости xy, нормаль +z (как quad в geo.js).
function quadP(w, h) {
  return {
    pos: new Float32Array([0, 0, 0, w, 0, 0, w, h, 0, 0, h, 0]),
    nrm: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uv: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    index: new Uint16Array([0, 1, 2, 0, 2, 3]),
  };
}
