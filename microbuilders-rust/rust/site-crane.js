// Башенный кран за карьером (art/props.js crane): у оригинала — мачта-ферма 15 клеток × s, стрела 13 вдоль +x,
// противовесная консоль с грузами, оголовок с тягами, кабина, тележка с крюком на тросе. Здесь — решётчатая мачта
// из труб с раскосами и лестницей внутри, фундамент с балластными блоками, поворотная часть: треугольная ферма
// стрелы, консоль с настилом, перилами, лебёдкой и бетонными грузами, оголовок-пирамида, тяги, кабина
// крановщика, заградительные огни. Стоит на месте оригинала, а стрела — длиннее (до дальнего угла здания с лесами):
// кран у оригинала — декорация, здесь он работает на стройку.
// Работа: пока стройка на земле — ходит вхолостую, как раньше (поворот от позы оригинала, тележка, крюк вниз-вверх).
// Когда стройка ушла вверх (настилы лесов выше земли, кладка выше первого яруса, cr-plan.js) — берёт со склада
// у своей мачты поддон материала детали, которую скоро будут класть с настила (cr-cargo.js), траверсой на цепях,
// поднимает выше всего на пути, поворачивает стрелу и ведёт тележку к настилу, откуда её будут класть; кладку
// начнут не скоро — ждёт наготове в 3 м над настилом (деталь первая в очереди стройки, в плане, в руках — пора),
// опускает поддон в досягаемость точки, где встанет каменщик, и отцепляет; поддон остаётся (cr-stock.js: убывает,
// исчезает, API для других модулей). Цель перепроверяется на ходу (кладут раньше или не отсюда — другой настил под
// тот же груз, нет — подождать в воздухе, потом назад на склад). Движения — с ограничением скорости
// и ускорения по каждой оси (поворот, тележка, лебёдка: balance.json → tuning.machines.hookSpeed,
// craneBoomSpeed); груз — маятник на тросе (отстаёт при разгоне, раскачивается, крановщик гасит раскачку, прежде
// чем опускать), поворачивается на крюке. Трос не проходит сквозь здание: путь вперёд считается теми же приводами
// (predict), высота переноса — выше всего под ним с запасом на раскачку, и пересчитывается на ходу (стройка растёт);
// груз поднимается на ходу, как только это проходит; опускание — только в пустой столб над настилом, над задуманным
// ярусом лесов — не ниже него; занят настил — ждёт, потом другой; некуда — ждёт в воздухе, потом везёт назад.
// Над настилом груз встаёт в 3 м (выше голов), там гасит качку и доворачивает траверсу вдоль стены, дальше — малой
// скоростью: рабочий пошёл на настил — груз встаёт в пределах 0,2 м и уходит вверх на 2,8 м. Пустая траверса не
// поворачивается, пока рама не вышла из клети настила.
// Между ходками, пока стройка наверху, крюк ждёт заказ над складом (не дольше 40 с — потом круг холостого цикла и
// снова к складу: поддон некуда, если с настилов не будут класть). Поддон кран берёт прямо с ряда склада (верхний из
// штабеля нужного материала); взятое место пополняют (подвезли — поднимается из-под щебня и растёт), только когда
// крюк далеко от склада: под крюком ничего не появляется и не подменяется.
// Мачта и фундамент — в общей куче площадки, подвижное — свои меши (markDynamic: скорость для TAA).
import * as THREE from 'three';
import { CELL, familyOf } from './families.js?v=ff29707';
import { Pile, M, mul, hex, WHITE } from './site-kit.js?v=ff29707';
import { boxUV } from './geo.js?v=ff29707';
import { markDynamic, DYNAMIC } from './render.js?v=ff29707';
import { cargoSpec, putCargo, putRig, RIG } from './cr-cargo.js?v=ff29707';
import { createPlanner } from './cr-plan.js?v=ff29707';
import { createStock } from './cr-stock.js?v=ff29707';

const C = CELL;
const V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
const YELLOW = hex(0xeac042), DARK = hex(0x2f3134);
const H = 15;
const DOWN = new THREE.Vector3(0, -1, 0), UP = new THREE.Vector3(0, 1, 0);

// Длина стрелы (в единицах крана s × клетка): до дальнего угла здания с полосой лесов и запасом; не короче
// стрелы оригинала (13). Раскладка — в клетках оригинала.
export function jibLength(lay) {
  const c = lay.crane, f = lay.level.footprint;
  let far = 0;
  [[f.minX - 1.5, f.minZ - 1.5], [f.maxX + 2.5, f.minZ - 1.5], [f.minX - 1.5, f.maxZ + 2.5], [f.maxX + 2.5, f.maxZ + 2.5]].forEach(function (p) {
    far = Math.max(far, Math.hypot(p[0] - c.x, p[1] - c.z));
  });
  return Math.min(40, Math.max(13, Math.ceil(far / c.s + 0.8)));
}

// Ось привода: к цели to со скоростью не больше vmax и ускорением не больше acc, тормозит вовремя (с замедлением
// brake, если оно меньше: у поворота тормозить приходится уже на большом вылете).
function axis(x, vmax, acc) { return { x: x, v: 0, to: x, vmax: vmax, acc: acc, brake: 0 }; }
function drive(a, dt) {
  const d = a.to - a.x;
  const want = Math.sign(d) * Math.min(a.vmax, Math.sqrt(2 * (a.brake || a.acc) * Math.abs(d)));
  a.v += THREE.MathUtils.clamp(want - a.v, -a.acc * dt, a.acc * dt);
  const nx = a.x + a.v * dt;
  // проскочил цель — встал
  if ((a.to - a.x) * (a.to - nx) <= 0 && Math.abs(a.v) <= a.acc * dt * 2 + 0.02) { a.x = a.to; a.v = 0; } else a.x = nx;
}
function still(a) { return a.x === a.to && a.v === 0; }
function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
// Поворот на вылете тележки: груз идёт по дуге — ускорение и скорость по дуге не больше, чем у тележки (иначе на
// 50 м вылета груз раскачивается на метры); тормозить — уже на том вылете, куда идёт тележка.
function slewLimits(a, t) {
  const arm = Math.max(6, t.x);
  a.acc = Math.min(0.05, 0.4 / arm);
  a.brake = Math.min(a.acc, 0.4 / Math.max(arm, t.to));
  a.vmax = Math.min(0.13, 4.5 / arm);
}

export function buildCrane(P, kit, lay, quarry, family, ctx, world0) {
  const heightAt = quarry.heightAt;
  const c = lay.crane, s = c.s, K = s * C;
  const x = c.x * C, z = c.z * C;
  const y0 = heightAt(x, z);
  const root = M(x, y0, z, c.yaw);
  const wp = function (lx, ly, lz) { return V(lx * K, ly * K, lz * K).applyMatrix4(root); };
  const at = function (lx, ly, lz, ry, rx, rz) { return mul(root, M(lx * K, ly * K, lz * K, ry || 0, rx || 0, rz || 0)); };
  const th = Math.sqrt(s);
  const fine = kit.fine;
  const MB = ctx.B.MB;
  const L = jibLength(lay);
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
  // оголовок-пирамида: у длинной стрелы — выше (тяги не слишком пологие)
  const hb = H + 0.8, ht = H + 0.8 + 3.6 * Math.max(1, L / 18), hw = 0.32, tw = 0.08;
  corners.forEach(function (q, i) {
    const a = sp(q[0] * hw, hb, q[1] * hw), b = sp(q[0] * tw, ht, q[1] * tw);
    S.tube('paintworn', a, b, chordR * 0.9, YELLOW, 8);
    const n = corners[(i + 1) % 4];
    const rows = Math.max(3, Math.round((ht - hb) / 1.2));
    for (let k = 0; k < rows; k++) {
      const u0 = k / rows, u1 = (k + 1) / rows;
      const r0 = hw + (tw - hw) * u0, r1 = hw + (tw - hw) * u1;
      S.tube('paintworn', sp(q[0] * r0, hb + (ht - hb) * u0, q[1] * r0), sp(n[0] * r0, hb + (ht - hb) * u0, n[1] * r0), braceR, YELLOW, 6);
      S.tube('paintworn', sp(q[0] * r0, hb + (ht - hb) * u0, q[1] * r0), sp(n[0] * r1, hb + (ht - hb) * u1, n[1] * r1), braceR, YELLOW, 6);
    }
  });
  S.put('blacksteel', kit.box(0.26 * K, 0.14 * K, 0.26 * K, 0.02), sat(0, ht, 0));
  // стрела: треугольная ферма (два нижних пояса — пути тележки, верхний пояс), панели по 1 единице
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
  // противовесная консоль: балки, настил, перила, лебёдка, бетонные грузы (длина и грузы — по стреле)
  const cl = Math.max(4.8, 0.3 * L);
  const cx0 = -0.5, cx1 = -0.5 - cl, cy = H + 0.9, cz = 0.45;
  [-1, 1].forEach(function (e) {
    S.put('paintworn', kit.box(cl * K, 0.22 * K, 0.1 * K, 0.01), sat((cx0 + cx1) / 2, cy, e * cz), YELLOW);
    if (fine) for (let i = 0; i <= Math.floor(cl / 0.8); i++) S.tube('tube', sp(cx0 - i * 0.8, cy + 0.11, e * cz), sp(cx0 - i * 0.8, cy + 0.6, e * cz), 0.022, WHITE, 5);
    S.tube('tube', sp(cx0, cy + 0.6, e * cz), sp(cx1, cy + 0.6, e * cz), 0.022, WHITE, 6);
  });
  S.put('diamond', kit.tbox('diamond', (cl - 0.2) * K, 0.03 * K, 0.8 * K, 0.004), sat((cx0 + cx1) / 2, cy + 0.12, 0));
  S.put('paintworn', kit.box(0.7 * K, 0.42 * K, 0.6 * K, 0.03), sat(-1.6, cy + 0.34, 0), hex(0x5c6066));
  S.put('blacksteel', kit.cyl(0.16 * K, 0.16 * K, 0.5 * K, 18), sat(-2.3, cy + 0.32, -0.25, 0, Math.PI / 2, 0));
  const weights = 3 + Math.max(0, Math.floor((cl - 4.8) / 0.6));
  for (let k = 0; k < weights; k++) {
    S.put('concrete', kit.tbox('concrete', 0.5 * K, 1.1 * K, 0.96 * K, 0.03, k * 0.31, 0.4), sat(cx1 + 1.2 + k * 0.6, H + 0.45, 0));
    if (fine) S.put('steel', kit.cyl(0.03, 0.03, 0.08, 6), sat(cx1 + 1.2 + k * 0.6, H + 1.02, 0));
  }
  // тяги от оголовка к стреле (у длинной стрелы — две пары) и к концу консоли
  const ties = L > 16 ? [0.42, 0.8] : [0.72];
  [-0.06, 0.06].forEach(function (e) {
    ties.forEach(function (u) { S.tube('steel', sp(0, ht - 0.05, e), sp(0.5 + L * u, jy1, e), 0.028 * th, WHITE, 6); });
    S.tube('steel', sp(0, ht - 0.05, e), sp(cx1 + 0.3, cy + 0.3, e), 0.028 * th, WHITE, 6);
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

  // ---------- тележка, тросы, крюковая обойма с траверсой ----------
  // Обойма и траверса — в метрах (груз — настоящего размера), не в единицах крана.
  const KH = 1.6;
  const T = pile();
  T.put('blacksteel', kit.box(0.8 * K, 0.14 * K, 0.86 * K, 0.02), M(0, -0.12 * K, 0));
  [-1, 1].forEach(function (e) {
    [-1, 1].forEach(function (f) { T.put('steel', kit.cyl(0.07 * K, 0.07 * K, 0.06 * K, 12), M(f * 0.25 * K, 0, e * jz * K, 0, Math.PI / 2, 0)); });
  });
  [-0.12, 0.12].forEach(function (lx) { T.put('steel', kit.cyl(0.09 * KH, 0.09 * KH, 0.05 * K, 14), M(lx * KH, -0.22 * K, -0.025 * K, 0, Math.PI / 2, 0)); });
  const trolley = T.build(family);
  trolley.name = 'crane-trolley';
  const HK = pile();
  // обойма: щёки с полосами, блоки, крюк
  const stripes = 5;
  for (let i = 0; i < stripes; i++) HK.put('paintworn', kit.box(0.46 * KH, 0.5 * KH / stripes, 0.3 * KH, 0.004), M(0, (0.25 - (i + 0.5) / stripes * 0.5) * KH, 0), i % 2 ? DARK : YELLOW);
  [-0.12, 0.12].forEach(function (lx) { HK.put('steel', kit.cyl(0.1 * KH, 0.1 * KH, 0.32 * KH, 14), M(lx * KH, 0.22 * KH, -0.16 * KH, 0, Math.PI / 2, 0)); });
  HK.put('steel', kit.cyl(0.035 * KH, 0.035 * KH, 0.18 * KH, 8), M(0, -0.43 * KH, 0));
  HK.put('steel', kit.box(0.04 * KH, 0.18 * KH, 0.04 * KH, 0.006), M(0.06 * KH, -0.52 * KH, 0, 0, 0, 0.6));
  HK.put('steel', kit.box(0.04 * KH, 0.12 * KH, 0.04 * KH, 0.006), M(-0.03 * KH, -0.58 * KH, 0, 0, 0, -0.9));
  putRig(HK, kit);
  const hook = HK.build(family);
  hook.name = 'crane-hook';
  // четыре ветви троса — единичной длины вниз от тележки (растягиваются по y)
  const R = pile();
  [[-0.12, -0.1], [-0.12, 0.1], [0.12, -0.1], [0.12, 0.1]].forEach(function (q) { R.tube('cable', V(q[0] * KH, 0, q[1] * KH), V(q[0] * KH, -1, q[1] * KH), 0.012 * th, WHITE, 4); });
  const rope = R.build(family);
  rope.name = 'crane-rope';
  rope.children.forEach(function (m) { m.castShadow = true; });
  slew.add(trolley, rope);
  const group = new THREE.Group();
  group.name = 'crane';
  group.add(slew, hook);
  [slew, hook].forEach(markDynamic);

  // ---------- склад у мачты ----------
  // поворот холостого цикла оригинала (от позы оригинала; ниже — ход крана)
  const S1 = 0.42 * (0.8 + 0.4 * ((lay.level.index * 0.37) % 1));
  const depot = findDepot();
  // места склада (ряды поддонов) и их куча — stockDepot
  const slots = [];
  let rows = null;
  stockDepot(P);
  const stock = createStock(kit, ctx, family, MB);
  group.add(stock.group);

  // ---------- ход крана ----------
  const TUNE = (window.MicroBuildersBalance && window.MicroBuildersBalance.tuning && window.MicroBuildersBalance.tuning.machines) || {};
  const hoistV = (TUNE.hookSpeed || 1.4) * C, boomV = (TUNE.craneBoomSpeed || 2.4) * C;
  const yT = y0 + (H + 0.8) * K - 0.02;          // тележка (подвес троса) в мире
  const rMin = (jx0 + 1.1) * K, rMax = (jx1 - 0.6) * K;
  const ropeMin = 1.6;                            // трос не короче (обойма под тележкой)
  // Холостой цикл оригинала (от позы оригинала, дальше от стройки): поворот, тележка, крюк вниз, пауза, вверх,
  // назад — теми же приводами, что и работа.
  const TX0 = (0.5 + 13 * 0.55) * K, TX1 = (0.5 + 13 * 0.82) * K;
  const HY0 = (H - 5.2) * K, HY1 = (H - 8.4) * K;   // высота крюка над плато в холостом цикле
  const ropeAt = function (hy) { return yT - (y0 + hy); };
  const A = axis(0, 0.13, 0.05);                  // поворот, рад
  const Rt = axis(TX0, boomV * 0.75, 0.4);        // тележка, м от оси мачты
  const Lr = axis(ropeAt(HY0), hoistV, 0.9);      // трос, м от тележки до обоймы
  // маятник: точка груза (центр масс под подвесом) в плоскости xz, скорость; поворот груза на крюке
  const pend = { x: 0, z: 0, vx: 0, vz: 0, pinned: false, init: false };
  const spin = { a: c.yaw, v: 0, to: c.yaw };
  const sus = new THREE.Vector3(), susPrev = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
  const qTilt = new THREE.Quaternion(), qYaw = new THREE.Quaternion();
  let planner = null, world = null;
  let job = null, idleStep = 0, idleWait = 0, cool = 4, clock = 0, tempo = 1, pickSkip = new Set(), swayMax = 0;
  let waiting = false, waitT = 0;   // ждёт заказ над складом (стройка наверху), сколько с
  const log = [];
  function say(msg) { log.push(Math.round(clock * 10) / 10 + ' ' + msg); if (log.length > 40) log.shift(); }

  // Точка над мачтой под углом a на вылете r (м вида).
  function polar(a, r, out) { const t = c.yaw + a; return out.set(x + Math.cos(t) * r, 0, z - Math.sin(t) * r); }
  // Поворот и вылет на точку (м вида): a — ближайший к текущему.
  function aim(px, pz) {
    const dx = px - x, dz = pz - z;
    const a = Math.atan2(-dz, dx) - c.yaw;
    return { a: A.x + wrap(a - A.x), r: Math.hypot(dx, dz) };
  }
  // Путь вперёд: приводы поворота, тележки и троса — как в кадре (те же скорости и разгоны), шагом 1/8 с, пока не
  // встанут (не дольше 75 с); f(px, pz, низ груза) — каждые 0,25 с пути, false — прервать (→ false).
  const pA = axis(0, 0, 0), pR = axis(0, 0, 0), pL = axis(0, 0, 0);
  function copyAxis(d, a, to) { d.x = a.x; d.v = a.v; d.to = to; d.vmax = a.vmax; d.acc = a.acc; d.brake = a.brake; }
  function predict(aTo, rTo, lTo, loaded, f) {
    copyAxis(pA, A, aTo); copyAxis(pR, Rt, rTo); copyAxis(pL, Lr, lTo);
    for (let k = 0; k < 600; k++) {
      if (k % 2 === 0) { polar(pA.x, pR.x, tmp); if (f(tmp.x, tmp.z, bottomAt(pL.x, loaded)) === false) return false; }
      if (still(pA) && still(pR) && still(pL)) break;
      slewLimits(pA, pR);
      drive(pA, 0.125); drive(pR, 0.125); drive(pL, 0.125);
      pL.x = Math.max(ropeMin, pL.x);
    }
    return true;
  }
  // Высота препятствий под путём к (aTo, rTo): здание, леса и рабочие (cr-plan), плато с забором и миниатюрами,
  // мачты света, городок бытовок; запас по сторонам — полширины груза с траверсой (~0,7 м), шаг выборки и раскачка.
  function pathTop(aTo, rTo, swing) {
    let h = -Infinity;
    const pad = 1.4 + (swing === undefined ? sway() : swing);
    predict(aTo, rTo, Lr.x, false, function (px, pz) { h = Math.max(h, obstacle(px, pz, pad)); });
    return h;
  }
  // Ход сразу всеми приводами (трос — к lTo) проходит выше всего под путём с запасом margin.
  function clearPath(aTo, rTo, lTo, loaded, margin) {
    const pad = 1.4 + sway();
    return predict(aTo, rTo, lTo, loaded, function (px, pz, bottom) { return bottom >= obstacle(px, pz, pad) + margin; });
  }
  function obstacle(px, pz, pad) {
    let h = heightAt(px, pz) + 3.0;
    if (planner) h = Math.max(h, planner.topAt(px, pz, pad));
    for (let i = 0; i < lay.masts.length; i++) {
      const m = lay.masts[i];
      if (Math.hypot(px - m.x * C, pz - m.z * C) < 1.8 + pad) h = Math.max(h, heightAt(m.x * C, m.z * C) + 8.7 * m.s * C);
    }
    const cb = lay.cabins;
    if (Math.abs(px - (cb.x - 0.95 * cb.s) * C) < 5.5 * cb.s * C + pad - 1.4 && Math.abs(pz - cb.z * C) < 2.6 * cb.s * C + pad - 1.4) h = Math.max(h, heightAt(cb.x * C, cb.z * C) + 2.7 * cb.s * C);
    return h;
  }
  // низ груза (или концов цепей траверсы) при длине троса l
  function bottomAt(l, loaded) { return yT - l - (loaded ? RIG.hang : RIG.low); }
  function ropeFor(bottom, loaded) { return yT - bottom - (loaded ? RIG.hang : RIG.low); }
  function sway() { return pend.pinned ? 0 : Math.hypot(pend.x - sus.x, pend.z - sus.z); }

  // Склад: на ровном плато у мачты (5 единиц от оси), в следе карьера (там нет леса), подальше от мачт света,
  // городка и миниатюр, в стороне от здания (кран заметно поворачивается к нему с грузом).
  function findDepot() {
    const ground = y0;
    const bx = lay.cx * C, bz = lay.cz * C;
    const toB = Math.atan2(-(bz - z), bx - x);
    let best = null, bestS = Infinity;
    for (let k = 0; k < 36; k++) {
      const t = k / 36 * Math.PI * 2;
      for (let rr = 4.2; rr <= 6.2; rr += 1) {
        const r = rr * K;
        const px = x + Math.cos(t) * r, pz = z - Math.sin(t) * r;
        // ровно по всей площадке склада (два ряда по три поддона, в осях склада: x — от мачты, z — поперёк)
        let flat = true;
        const cs = Math.cos(t), sn = Math.sin(t);
        for (let i = -2; i <= 2 && flat; i++) for (let j = -1; j <= 1 && flat; j++) {
          const lx = i * 1.6, lz = j * 2.5;
          flat = Math.abs(heightAt(px + lx * cs + lz * sn, pz - lx * sn + lz * cs) - ground) < 0.3;
        }
        if (!flat || (quarry.covers && !quarry.covers(px, pz, 3.6))) continue;
        let near = false;
        lay.masts.forEach(function (m) { if (Math.hypot(px - m.x * C, pz - m.z * C) < 4) near = true; });
        lay.minis.forEach(function (m) { if (Math.hypot(px - m.cx * C, pz - m.cz * C) < m.w * C / 2 + 3) near = true; });
        const cb = lay.cabins;
        if (Math.abs(px - (cb.x - 0.95 * cb.s) * C) < 6.5 * cb.s * C && Math.abs(pz - cb.z * C) < 3.5 * cb.s * C) near = true;
        if (near) continue;
        // лучше всего — в стороне от здания (~50°: поворот с грузом виден, но недолог), ближе к мачте и с той
        // стороны, где ходит холостой цикл (первая ходка уровня — оттуда)
        const sc = Math.abs(Math.abs(wrap(t - toB)) - 0.9) + (rr - 4.2) * 0.15 + 0.25 * Math.abs(wrap(t - c.yaw - S1 / 2)) / Math.PI;
        if (sc < bestS) { bestS = sc; best = { x: px, z: pz, y: ground, yaw: t }; }
      }
    }
    if (!best) {
      const t = toB + Math.PI * 0.6, r = 4.2 * K;
      best = { x: x + Math.cos(t) * r, z: z - Math.sin(t) * r, y: y0, yaw: t };
    }
    best.y = heightAt(best.x, best.z);
    return best;
  }
  // Материалы склада: те, из чего кладут выше земли (их кран и возит, cr-plan.js → upcoming: без особых
  // деталей и стёкол) — по числу деталей, затем прочие материалы уровня; не больше шести.
  function depotIds() {
    const n = new Map();
    ((world0 && world0.blocks) || []).forEach(function (b) {
      if (b.y < 1 || b.feature || (b.glassOf !== undefined && b.glassOf !== null) || !MB.MATERIAL[b.materialId]) return;
      n.set(b.materialId, (n.get(b.materialId) || 0) + 1);
    });
    const ids = Array.from(n.keys()).sort(function (a, b) { return n.get(b) - n.get(a); });
    (lay.level.materialIds || []).forEach(function (id) { if (ids.indexOf(id) < 0 && MB.MATERIAL[id] && !MB.MATERIAL[id].accent) ids.push(id); });
    // на «Телефоне» — четыре (каждый новый материал — вызов отрисовки в куче площадки)
    return ids.slice(0, fine ? 6 : 4);
  }
  // Запас на складе: по поддону каждого материала — в два ряда по сторонам прохода (в 1,6 м по короткой стороне
  // поддона: траверса проходит между рядами), на «Максимуме» у чётных столбцов — штабелем по два, на «Телефоне» груз —
  // одной краской цвета материала. Кран берёт верхний поддон нужного материала прямо с ряда (место строповки —
  // над ним); взятое место пополняют (подвезли: поднимается из-под щебня на 4 см и растёт), только когда крюк далеко
  // от склада, — под крюком ничего не появляется и не подменяется. Места: { id (материал), spec, x, y, z, yaw,
  // n (сколько стоит), full }; ряды — своя куча (пересборка, когда взяли или подвезли), щебень — в общей.
  function stockDepot(Pq) {
    const ids = depotIds();
    const cols = Math.max(1, Math.ceil(ids.length / 2));
    const cs = Math.cos(depot.yaw), sn = Math.sin(depot.yaw);
    // площадка склада — утрамбованный щебень
    Pq.put('gravel', boxUV(kit.box(cols * 1.5 + 1.9, 0.05, 5.1, 0.02), 2, 2), M(depot.x, depot.y + 0.005, depot.z, depot.yaw));
    ids.forEach(function (id, i) {
      const col = Math.floor(i / 2);
      const ox = (col - (cols - 1) / 2) * 1.5, oz = i % 2 ? 1.6 : -1.6;
      const px = depot.x + ox * cs + oz * sn, pz = depot.z - ox * sn + oz * cs;
      const full = fine && col % 2 === 0 ? 2 : 1;
      slots.push({ id: id, spec: cargoSpec(MB, id), x: px, y: heightAt(px, pz), z: pz, yaw: depot.yaw + ((i * 37) % 7 - 3) * 0.012, n: full, full: full });
    });
    depot.ids = ids;
    buildRows();
  }
  // Поддон k штабеля места (0 — нижний): матрица низа; поза — середина низа и поворот.
  function slotM(q, k) { const m = M(q.x, q.y, q.z, q.yaw), o = k % 2; return k > 0 ? mul(m, M(0.02 * o, k * (q.spec.height + 0.002), 0.01 * o, 0.05 * o)) : m; }
  function slotPose(q, k) { const e = slotM(q, k).elements; return { x: e[12], y: e[13], z: e[14], yaw: Math.atan2(e[8], e[10]) }; }
  function slotOf(id) { for (let i = 0; i < slots.length; i++) if (slots[i].id === id) return slots[i]; return null; }
  function buildRows() {
    if (rows) { group.remove(rows); rows.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); rows = null; }
    const q = pile();
    q.mudK = 0.4;
    slots.forEach(function (sl) { for (let k = 0; k < sl.n; k++) putCargo(q, kit, sl.spec, slotM(sl, k), undefined, !fine && k === 0); });
    rows = q.build(family);
    rows.name = 'crane-depot';
    group.add(rows);
    if (ctx.linkSkyTree) ctx.linkSkyTree(rows);
  }
  // Пополнение: одно место за раз, когда крюк дальше 18 м от склада (или место нужно заданию, а поддона нет —
  // тогда сразу); подвезённый поддон — свой меш, пока растёт, потом — в кучу рядов.
  let restock = null;
  function restockStep() {
    if (restock) return;
    const far = Math.hypot(hook.position.x - depot.x, hook.position.z - depot.z) > 18;
    for (let i = 0; i < slots.length; i++) {
      const q = slots[i];
      if (q.n >= q.full) continue;
      const need = !!job && job.slot === q && q.n === 0 && job.phase === PH.toDepot;
      if (!far && !need) continue;
      if (job && job.slot === q && (job.phase === PH.rig || job.back)) continue;
      const ld = loadOf(q.spec, !fine);
      const ps = slotPose(q, q.n);
      ld.position.set(ps.x, ps.y, ps.z);
      ld.rotation.set(0, ps.yaw, 0);
      restock = { slot: q, load: ld };
      show(ld, 1, 0);
      say('подвоз ' + q.id + ' на склад, крюк в ' + Math.round(Math.hypot(hook.position.x - depot.x, hook.position.z - depot.z)) + ' м');
      return;
    }
  }
  // Поддон с грузом — свой меш в группе крана (на крюке, подвозят); flat — груз одной краской, как ряды склада на
  // «Телефоне» (на крюке фактура — когда крюк ушёл от склада: под крюком поддон не перекрашивается).
  function loadOf(spec, flat, left) {
    const q = new Pile(kit);
    putCargo(q, kit, spec, new THREE.Matrix4(), left, !!flat);
    const ld = q.build(family);
    ld.name = 'crane-load';
    group.add(ld);
    markDynamic(ld);
    if (ctx.linkSkyTree) ctx.linkSkyTree(ld);
    return ld;
  }

  // ---------- задания ----------
  // job: { phase, spec, load (группа груза на крюке), target {x, y, z, yaw, deck}, wait, ... }
  // toPallet, rigPallet — за поддоном, который вернул модуль запаса (никому не нужен): к нему на настил, строповка, дальше —
  // как назад на склад (job.back)
  const PH = { toDepot: 1, rig: 2, lift: 3, travel: 4, lower: 5, land: 6, unrig: 7, clear: 8, hover: 9, stage: 10, toPallet: 11, rigPallet: 12 };
  function canStart() {
    if (!planner || !world || world.completed || tempo > 5 || stock.count() >= (fine ? 3 : 2)) return false;
    return planner.upward();
  }
  // Через сколько с крана поддон был бы готов на настиле (HOLD после посадки), если везти сейчас: от ожидания над
  // складом — к складу, строповка, подъём, перенос, опускание, отцепка; с грузом на крюке — перенос и опускание;
  // final — наготове в 3 м над настилом: медленный спуск, посадка, отцепка. В с игры (кран ходит не быстрее ×2 — на ×5
  // игра за это время уходит дальше).
  const LEAD = { depot: 56, rig: 48, lifted: 32, final: 14 };
  // наготове над настилом ждёт не дольше, с крана
  const STAGE = 80;
  function gameS(s) { return s * Math.max(1, tempo) / Math.max(1, Math.min(tempo, 2)); }
  function leadNow() {
    const ph = job ? job.phase : 0;
    return gameS(!job ? LEAD.depot : ph === PH.toDepot || ph === PH.rig ? LEAD.rig : ph === PH.lower ? LEAD.final : LEAD.lifted);
  }
  // mat(materialId) → true — только такой материал (поддон уже выбран или стоит). Кладку с настила должны начать не
  // раньше, чем поддон будет готов (через leadNow), и не позже, чем он уйдёт (life после готовности) с запасом на
  // ожидание наготове над настилом (STAGE).
  function pickTarget(mat) {
    planner.refresh();
    return planner.pick(function (s) {
      const r = Math.hypot(s.x - x, s.z - z);
      if (r < rMin + 1 || r > rMax) return false;
      if (stock.near(s.x, s.y, s.z, 1.6)) return false;
      // груз над настилом до верха троса помещается (и встаёт в 3 м над ним)
      return ropeFor(s.y + 3.0, true) > ropeMin;
    }, pickSkip, mat, leadNow(), stock.life() + gameS(STAGE), stock.reach());
  }
  // Поддон, который модуль запаса вернул крану (stock.recalled: с него никто не берёт): настил годен и столб над ним
  // пуст, в досягаемости стрелы; null — нет такого.
  // не вышло (на настиле люди) — этот поддон не раньше, чем через 30 с крана
  const pickupSkip = new Map();
  function pickupTarget() {
    if (!planner || !world || world.completed || tempo > 5 || !stock.recalled) return null;
    const list = stock.recalled();
    for (let i = 0; i < list.length; i++) {
      const o = list[i], p = o.info, d = o.deck;
      if (pickupSkip.has(p.id) && pickupSkip.get(p.id) > clock) continue;
      const r = Math.hypot(p.x - x, p.z - z);
      if (r < rMin + 1 || r > rMax || !planner.deckLive(d) || !planner.columnClear(d.x, d.y, d.z) || planner.pendingAbove(d.x, d.y, d.z) >= 0) continue;
      if (!(ropeFor(p.y + 3.0, true) > ropeMin) || !slotOf(p.materialId)) continue;
      return o;
    }
    return null;
  }
  // Забрать ненужный поддон с настила на склад: крюк к нему, вниз, строповка, подъём — и как назад на склад.
  function startPickup(o) {
    const p = o.info;
    job = { phase: PH.toPallet, spec: o.spec, slot: slotOf(p.materialId), load: null, pick: p.id, wait: 0, hold: 0, t0: clock, check: 0,
      target: { deck: o.deck, spot: { x: p.x, y: p.y, z: p.z, yaw: p.yaw }, materialId: p.materialId } };
    swayMax = 0;
    waiting = false;
    say('забрать ' + p.id + ' (' + p.left + ' ед.) с настила ' + o.deck.id + ' на склад');
    goAbove(p.x, p.z, false, ropeFor(p.y + 3.0, true));
    spin.to = nearYaw(p.yaw);
  }
  // Не вышло (поддон разобрали руками, настил сняли или застроили, на настиле долго стоят) — крюк вверх, ждать над складом.
  function dropPickup(why) {
    say('забрать не вышло: ' + why);
    if (job && job.pick) pickupSkip.set(job.pick, clock + 30);
    job = null;
    cool = 4;
    pend.pinned = false;
    Lr.vmax = hoistV;
    waitAtDepot();
  }
  function startJob(t) {
    const q = slotOf(t.materialId);
    job = { phase: PH.toDepot, spec: q.spec, slot: q, load: null, target: t, wait: 0, hold: 0, t0: clock, check: 0 };
    swayMax = 0;
    waiting = false;
    say('задание: ' + t.materialId + ' → настил ' + t.deck.id + ' (' + t.kind + (t.kind === 'ready' ? ' №' + t.rank : ', кладка через ' + Math.round(t.eta) + ' с, каменщик ' + t.mason) + ')');
    // крюк — выше всего на пути к складу, на подходе — вниз, до начала медленного спуска над поддоном; траверса
    // разворачивается по поддону на ходу
    const ps = slotPose(q, Math.max(0, q.n - 1));
    goAbove(ps.x, ps.z, false, ropeFor(ps.y + 1.5, true));
    spin.to = nearYaw(ps.yaw);
  }
  // Появление (dir +1) и уход (−1) поддона: k 0…1 за SHOW с крана; низ — y0 позы, на 4 см ниже в начале.
  const SHOW = 0.6, shows = [];
  function show(load, dir, k) {
    for (let i = shows.length - 1; i >= 0; i--) if (shows[i].load === load) shows.splice(i, 1);
    shows.push({ load: load, dir: dir, k: k, y: load.position.y });
    showStep(0);
  }
  function showStep(d) {
    for (let i = shows.length - 1; i >= 0; i--) {
      const q = shows[i], o = q.load;
      q.k += q.dir * d / SHOW;
      const k = THREE.MathUtils.clamp(q.k, 0, 1);
      o.visible = k > 0.01;
      o.scale.set(0.6 + 0.4 * k, Math.max(k, 1e-3), 0.6 + 0.4 * k);
      o.position.y = q.y - 0.04 * (1 - k);
      if (q.dir > 0 && q.k >= 1) {
        o.scale.set(1, 1, 1); o.visible = true; o.position.y = q.y; shows.splice(i, 1);
        // подвезли — в кучу рядов
        if (restock && restock.load === o) { restock.slot.n++; drop(o); restock = null; buildRows(); }
      } else if (q.dir < 0 && q.k <= 0) { shows.splice(i, 1); drop(o); }
    }
  }
  function drop(o) {
    if (o.parent) o.parent.remove(o);
    DYNAMIC.delete(o);
    o.traverse(function (m) { if (m.geometry) m.geometry.dispose(); });
  }
  // Ждать заказ над складом (стройка ушла вверх): крюк — невысоко над проходом между рядами.
  function waitAtDepot() {
    waiting = true; waitT = 0;
    goAbove(depot.x, depot.z, false, ropeFor(depot.y + 4.5, true));
  }
  // Пока шёл к складу, настил стал негоден, другого нет: поддон остаётся в ряду, крюк ждёт над складом.
  function cancel() {
    say('отмена до строповки: некуда');
    job = null;
    cool = 4;
    pickSkip.clear();
    waitAtDepot();
  }
  function dropLoad() {
    if (!job || !job.load) return;
    drop(job.load);
    job.load = null;
  }
  // Высота переноса к точке (px, pz): трос выбрать до высоты выше всего под путём. down — до какой длины троса
  // можно опускать на подходе (над целью; без него — не ниже высоты переноса).
  let route = null;
  function goAbove(px, pz, loaded, down) {
    if (planner) planner.refresh();
    const g = aim(px, pz);
    const r = THREE.MathUtils.clamp(g.r, rMin, rMax);
    route = { a: g.a, r: r, l: Math.max(ropeMin, ropeFor(pathTop(g.a, r) + 0.8, loaded)), stage: 0, loaded: loaded, down: down, tick: 0 };
  }
  // Ход по маршруту. Раз в 0,25 с — высота препятствий под оставшимся путём заново (стройка растёт, пока кран идёт):
  // выросла — трос выбрать выше. Груз ниже высоты переноса — сначала вверх, но поворот и тележка трогаются, как только
  // ход всеми приводами сразу проходит выше всего под путём (подъём на ходу); дальше трос — к высоте переноса, а на
  // подходе крановщик опускает груз, насколько пускает остаток пути (он по ходу только убывает), до route.down:
  // у склада крюк приходит уже низко. true — на месте.
  function follow(dt) {
    if (!route) return true;
    route.tick -= dt || 0;
    if (route.tick <= 0) {
      route.tick = 0.25;
      if (planner) planner.refresh();
      const sw = sway(), margin = 0.8 + sw;
      const need = Math.max(ropeMin, ropeFor(pathTop(route.a, route.r, sw) + margin, route.loaded));
      if (need < route.l - 0.3) route.l = need;
      else if (route.down !== undefined && route.stage === 1) {
        // опускать — с запасом на раскачку при торможении (иначе у стены пришлось бы снова поднимать)
        const sa = Math.max(sw, 2);
        route.l = Math.max(route.l, Math.min(route.down, ropeFor(pathTop(route.a, route.r, sa) + 0.8 + sa, route.loaded)));
      }
      if (route.stage === 0 && Lr.x > route.l + 0.3 && clearPath(route.a, route.r, route.l, route.loaded, margin)) route.stage = 1;
    }
    if (route.stage === 0) {
      Lr.to = route.l;
      if (Lr.x > route.l + 0.3) return false;
      route.stage = 1;
    }
    A.to = route.a; Rt.to = route.r;
    Lr.to = route.l;
    if (still(A) && still(Rt) && still(Lr)) { route = null; return true; }
    return false;
  }

  function stepJob(dt) {
    if (job.phase === PH.toPallet) {
      // к поддону на настиле: над ним — до 3 м, дальше как над складом (качка гаснет, траверса — по поддону, медленно
      // вниз); на настиле рабочий — не ниже 2,8 м над ним, ждать до 15 с
      if (!follow(dt)) return;
      const t = job.target, p = stock.get(job.pick);
      if (!p) { dropPickup('поддона нет'); return; }
      if (!targetOk(t)) { dropPickup('настил негоден'); return; }
      job.over = true;
      spin.to = nearYaw(p.yaw);
      if (!targetFree(t)) {
        Lr.vmax = hoistV;
        Lr.to = Math.min(Lr.to, ropeFor(p.y + 2.8, true));
        job.hold += dt;
        if (job.hold > 15) dropPickup('на настиле люди');
        return;
      }
      job.hold = 0;
      job.wait += dt;
      const slow = ropeFor(p.y + 1.5, true);
      if (Lr.x < slow - 0.01) { Lr.vmax = hoistV; Lr.to = slow; if (!still(Lr)) return; }
      if (sway() > 0.03 && job.wait < 10) return;
      if (Math.abs(wrap2(spin.a - p.yaw)) > 0.015 && job.wait < 8) return;
      Lr.vmax = 0.45;
      Lr.to = ropeFor(p.y, true);
      if (still(Lr)) { job.phase = PH.rigPallet; job.wait = 0; pend.pinned = true; spin.a += wrap2(p.yaw - spin.a); spin.v = 0; Lr.vmax = hoistV; say('строповка на настиле'); }
      return;
    }
    if (job.phase === PH.rigPallet) {
      // цепи заведены — поддон с настила на крюк (в том же кадре: из кучи поставленных — свой меш с тем же грузом)
      job.wait += dt;
      if (job.wait < 2.2) return;
      const got = stock.lift(job.pick);
      if (!got) { dropPickup('поддона нет'); return; }
      job.load = loadOf(job.spec, !fine, got.left);
      job.flat = !fine;
      job.load.position.set(0, -RIG.hang, 0);
      job.load.rotation.set(0, wrap(got.yaw - spin.a), 0);
      hook.add(job.load);
      // на склад — на свой штабель (как отмена: job.back)
      const ps = slotPose(job.slot, job.slot.n);
      job.target = { deck: null, spot: { x: ps.x, y: ps.y, z: ps.z, yaw: ps.yaw } };
      job.back = true;
      job.phase = PH.lift; job.wait = 0;
      Lr.vmax = 0.35;
      Lr.to = Lr.x - 0.4;
      say('подъём: назад на склад');
      return;
    }
    if (job.phase === PH.toDepot) {
      if (!follow(dt)) return;
      // над местом строповки: цель ещё нужна (пока шёл к складу, настил могли снять или застроить, деталь — положить
      // или её начнут раньше, чем приедет поддон) — иначе другой настил; некуда — поддон остаётся на складе
      if (!job.checked) {
        job.checked = true;
        if (!recheck()) { cancel(); return; }
      }
      // поддона в ряду нет (взяли, ещё не подвезли) — крюк ждёт (место нужно заданию — подвезут сразу)
      const q = job.slot;
      if (q.n === 0) return;
      const ps = slotPose(q, q.n - 1);
      // над верхним поддоном штабеля: траверса разворачивается по нему; крюк — до начала медленного спуска (1,5 м над
      // поддоном), качка гаснет (груз ведут: между штабелями — по 18 см до соседних); улеглась — медленно до поддона
      job.over = true;
      spin.to = nearYaw(ps.yaw);
      job.wait += dt;
      const slow = ropeFor(ps.y + 1.5, true);
      if (Lr.x < slow - 0.01) { Lr.vmax = hoistV; Lr.to = slow; if (!still(Lr)) return; }
      if (sway() > 0.03 && job.wait < 10) return;
      if (Math.abs(wrap2(spin.a - ps.yaw)) > 0.015 && job.wait < 8) return;
      Lr.vmax = 0.45;
      Lr.to = ropeFor(ps.y, true);
      if (still(Lr)) { job.phase = PH.rig; job.wait = 0; pend.pinned = true; spin.a += wrap2(ps.yaw - spin.a); spin.v = 0; Lr.vmax = hoistV; say('строповка'); }
    } else if (job.phase === PH.rig) {
      // цепи заведены — груз на крюке
      job.wait += dt;
      if (job.wait < 2.2) return;
      // верхний поддон штабеля — с ряда на крюк (в том же кадре: из кучи рядов — свой меш на том же месте)
      const q = job.slot, ps = slotPose(q, q.n - 1);
      job.load = loadOf(job.spec, !fine);
      job.flat = !fine;
      job.load.position.set(0, -RIG.hang, 0);
      job.load.rotation.set(0, wrap(ps.yaw - spin.a), 0);
      hook.add(job.load);
      q.n--;
      buildRows();
      job.phase = PH.lift; job.wait = 0;
      // натяжка — медленно, дальше — на высоту переноса
      Lr.vmax = 0.35;
      Lr.to = Lr.x - 0.4;
      say('подъём');
    } else if (job.phase === PH.lift) {
      if (!still(Lr)) return;
      if (pend.pinned) { pend.pinned = false; Lr.vmax = hoistV; }
      // цель ещё нужна? иначе — другой настил под этот груз; нет — подождать в воздухе
      if (!recheck()) { hover(); return; }
      toTarget();
    } else if (job.phase === PH.travel) {
      // раз в 1 с: цель ещё нужна (кладку начали раньше, деталь положили не отсюда) — иначе другой настил или ждать
      // в воздухе (назад на склад — не сюда: job.back)
      if (!job.back && (job.check -= dt) <= 0) {
        job.check = 1;
        const was = job.target;
        if (!recheck()) { hover(); return; }
        if (job.target !== was) { toTarget(); return; }
      }
      if (!follow(dt)) return;
      // над настилом: крановщик гасит раскачку (до ~1° — дальше гасит спуск) и разворот груза вдоль стены, потом
      // опускает
      job.wait += dt;
      spin.to = nearYaw(job.target.spot.yaw);
      if (sway() > Math.max(0.25, 0.015 * (pend.len || 0)) && job.wait < 10) return;
      if (Math.abs(wrap2(spin.a - job.target.spot.yaw)) > 0.04 && job.wait < 6) return;
      // кладку с настила начнут не скоро — ждать наготове (в 3 м над настилом, PH.stage); назад на склад — сразу вниз
      job.wait = 0; job.hold = 0; job.check = 0; job.ready = false;
      const e = job.back ? null : planner.eta(job.target.block, job.target.stand);
      if (e && (e.kind === 'ready' ? e.rank > 0 : e.eta > gameS(LEAD.final) + 30)) { job.phase = PH.stage; say('наготове над ' + job.target.deck.id + ' (' + e.kind + (e.kind === 'ready' ? ' №' + e.rank : ', кладка через ' + Math.round(e.eta) + ' с') + ')'); }
      else { job.phase = PH.lower; say('опускание'); }
    } else if (job.phase === PH.lower) {
      const t = job.target, top = t.spot.y;
      if (!targetOk(t)) {
        // столб над настилом перекрыли (новый ярус лесов, кладка) или настил сняли — груз вверх, выше всего вокруг, и
        // на другой настил; другого нет — подождать в воздухе
        say('настил негоден');
        pickSkip.add(t.deck.id);
        if (retarget()) toTarget(); else hover();
        return;
      }
      const near = bottomAt(Lr.x, true) - top;
      // пока груз выше 1,3 м — раз в 1 с: цель ещё нужна (каменщик пошёл класть раньше, чем поддон встанет, или
      // кладёт не отсюда) — груз вверх и на другой настил, нет его — ждать в воздухе
      if (near > 1.3 && (job.check -= dt) <= 0) {
        job.check = 1;
        const was = job.target;
        if (!recheck()) { hover(); return; }
        if (job.target !== was) { toTarget(); return; }
      }
      // над настилом задуман следующий ярус лесов — груз ещё выше него: не опускать ниже (поставят, пока опускаем),
      // подождать; ярус поставили — столб закрыт, другой настил (часто — этот новый)
      const py = t.deck ? planner.pendingAbove(t.deck.x, t.deck.y, t.deck.z) : -1;
      if (py >= 0 && bottomAt(Lr.x, true) > py * CELL - 0.2) {
        Lr.vmax = hoistV;
        Lr.to = Math.min(Lr.to, ropeFor(py * CELL + 2.8, true));
        job.hold += dt;
        if (job.hold > 8) { pickSkip.add(t.deck.id); if (retarget()) toTarget(); else hover(); }
        return;
      }
      if (!targetFree(t) && near > 0.45) {
        // на настиле рабочий (стоит, идёт туда или пройдёт по нему) — груз не ниже 2,8 м над настилом (выше головы
        // с запасом): выше 3 м спуск и так кончается в 3 м, ниже — малая скорость, встаёт в пределах 0,2 м и уходит
        // вверх; потом — другой настил
        Lr.vmax = near > 3.05 ? hoistV : 0.6;
        Lr.to = Math.min(Lr.to, ropeFor(top + 2.8, true));
        job.hold += dt;
        job.ready = false;
        if (job.hold > 7) { pickSkip.add(t.deck.id); if (retarget()) toTarget(); else hover(); }
        return;
      }
      job.hold = 0;
      // спуск быстро — до 3 м над настилом (выше голов; на полной скорости тормозной путь лебёдки — 4 м, поэтому
      // остановка — здесь), там качка гаснет до 3 см и траверса доворачивается вдоль стены (рама входит в клеть
      // настила с зазором 1–4 см); дальше 0,6 м/с до 1,3 м и последний метр — 0,35 м/с
      if (!job.ready) {
        const stop = ropeFor(top + 3.0, true);
        if (Lr.x < stop - 0.01) { Lr.vmax = hoistV; Lr.to = stop; if (!still(Lr)) return; }
        job.wait += dt;
        if ((sway() > 0.03 || Math.abs(wrap2(spin.a - t.spot.yaw)) > 0.015) && job.wait < 12) return;
        job.ready = true;
      }
      const slow = ropeFor(top + 1.3, true);
      if (Lr.x < slow - 0.01) { Lr.vmax = 0.6; Lr.to = slow; if (!still(Lr)) return; }
      Lr.vmax = 0.35;
      Lr.to = ropeFor(top, true);
      if (still(Lr)) land();
    } else if (job.phase === PH.stage) {
      // наготове: груз опускается до 3 м над настилом (выше голов), качка гаснет, траверса — вдоль стены; раз в 1 с —
      // пора опускать (кладку начнут, когда поддон как раз будет готов: через LEAD.final), поздно или не отсюда —
      // другой настил под этот груз (там — снова наготове), нет — назад на склад; ждёт не дольше STAGE
      const t = job.target, top = t.spot.y;
      job.wait += dt;
      // столб над настилом закрыли (деталь пошла в работу, ярус лесов), настил сняли — сразу вверх и другой настил
      if (!targetOk(t)) { say('настил негоден'); pickSkip.add(t.deck.id); if (retarget()) toTarget(); else hover(); return; }
      // на настиле рабочий (стоит, идёт, пройдёт; может подняться на подмостях до 2,75 м) — груз в 5 м над настилом
      const free = targetFree(t), stop = ropeFor(top + (free ? 3.0 : 5.0), true);
      if (Math.abs(Lr.to - stop) > 0.01) { Lr.vmax = hoistV; Lr.to = stop; job.ready = false; }
      if (!job.ready && still(Lr) && sway() < 0.03 && Math.abs(wrap2(spin.a - t.spot.yaw)) < 0.015) job.ready = true;
      if ((job.check -= dt) > 0) return;
      job.check = 1;
      planner.refresh();
      const e = planner.still(t, 0) ? planner.eta(t.block, t.stand) : null;
      const fin = gameS(LEAD.final);
      // пора: деталь — следующая в очереди стройки (её положат через 22–94 с), в плане или в руках (успеть: поддон
      // будет готов через fin) — поддон встанет и подождёт; долго ждём, а она вторая в очереди — тоже
      const go = e && (e.kind === 'ready' ? e.rank <= 0 || (e.rank <= 1 && job.wait > 40) : e.eta >= fin - 6 && e.eta <= fin + 30);
      if (go && targetFree(t)) { job.phase = PH.lower; job.hold = 0; say('опускание: ' + e.kind + (e.kind === 'ready' ? ' №' + e.rank : ', кладка через ' + Math.round(e.eta) + ' с')); return; }
      // ничья и не скоро: другой настил того же материала, где деталь уже первая в очереди, в плане или в руках
      if (e && e.kind === 'ready' && e.rank > 0 && job.wait > 2) {
        const n = pickTarget(function (m) { return m === t.materialId; });
        if (n && n.deck !== t.deck && (n.kind !== 'ready' || n.rank < e.rank)) { job.target = n; say('к настилу ' + n.deck.id + ' (' + n.kind + (n.kind === 'ready' ? ' №' + n.rank : ', кладка через ' + Math.round(n.eta) + ' с') + ')'); toTarget(); return; }
      }
      if (!e || (e.kind !== 'ready' && e.eta < fin - 6) || job.wait > STAGE) {
        say(!e ? 'цель отпала: ' + t.deck.id : e.kind !== 'ready' && e.eta < fin - 6 ? 'не успеть: кладка через ' + Math.round(e.eta) + ' с' : 'долго ждать');
        if (retarget()) { toTarget(); return; }
        abort();
      }
    } else if (job.phase === PH.hover) {
      // некуда ставить: груз висит выше всего вокруг; раз в 2 с — снова искать настил, через 30 с — назад на склад
      follow(dt);
      job.wait += dt;
      job.hold -= dt;
      if (job.hold > 0) return;
      job.hold = 2;
      pickSkip.clear();
      if (retarget(true)) { toTarget(); return; }
      if (job.wait > 30) abort();
    } else if (job.phase === PH.land) {
      // поддон стоит, цепи ослаблены — отцепить
      job.wait += dt;
      if (job.wait > 0.6) Lr.to = ropeFor(job.target.spot.y, true) + 0.05;
      if (job.wait < 2.0 || !still(Lr)) return;
      job.phase = PH.unrig; job.wait = 0;
      Lr.vmax = 0.4;
      Lr.to = Lr.x - 0.6;
    } else if (job.phase === PH.unrig) {
      if (!still(Lr)) return;
      pend.pinned = false;
      Lr.vmax = hoistV;
      // крюк — выше всего вокруг, задание выполнено
      goAbove(job.target.spot.x, job.target.spot.z, false);
      route.a = A.x; route.r = Rt.x; route.l = Math.min(route.l, Lr.x);
      job.phase = PH.clear;
    } else if (job.phase === PH.clear) {
      if (!follow(dt)) return;
      say('готово за ' + Math.round(clock - job.t0) + ' с');
      job = null;
      cool = 3;
      pickSkip.clear();
      idleStep = 0; idleWait = 0;
      // стройка всё ещё наверху — назад к складу, ждать следующий заказ там; иначе — к холостому циклу (над всем,
      // что под путём)
      if (planner && planner.upward()) waitAtDepot();
      else { polar(S1, TX1, tmp); goAbove(tmp.x, tmp.z, false); }
    }
  }
  function land() {
    const t = job.target;
    if (job.back) {
      // вернул на склад: поддон — на свой штабель (в кучу рядов в том же кадре)
      job.slot.n++;
      dropLoad();
      buildRows();
      pend.pinned = true;
      job.phase = PH.land; job.wait = 0;
      say('вернул на склад');
      return;
    }
    // поддон — где встал (раскачка погашена: до 5 см от места; поперёк — не дальше 2 см: наружу — перила, к стене —
    // проход), поворот — как висел
    hook.updateMatrixWorld(true);
    job.load.getWorldPosition(tmp);
    const wx = t.spot.wall[0], wz = t.spot.wall[1];
    let dx = tmp.x - t.spot.x, dz = tmp.z - t.spot.z;
    // вдоль стены и поперёк (к стене +)
    const along = THREE.MathUtils.clamp(dx * -wz + dz * wx, -0.05, 0.05), across = THREE.MathUtils.clamp(dx * wx + dz * wz, -0.02, 0.02);
    dx = -wz * along + wx * across; dz = wx * along + wz * across;
    pend.pinned = true;
    // поворот — вдоль стены, не больше 1° в сторону (углы поддона не заходят ни к перилам, ни в проход)
    const yaw = t.spot.yaw + THREE.MathUtils.clamp(wrap2(spin.a - t.spot.yaw), -0.018, 0.018);
    stock.add({ spec: job.spec, x: t.spot.x + dx, y: t.spot.y, z: t.spot.z + dz, yaw: yaw, deck: t.deck, side: [-wx, -wz], materialId: t.materialId, mason: t.mason, block: t.block });
    // куча поставленных — в этом же кадре (иначе кадр без поддона: с крюка снят, в куче ещё нет)
    stock.update(0);
    hook.remove(job.load);
    DYNAMIC.delete(job.load);
    job.load.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    job.load = null;
    job.phase = PH.land; job.wait = 0;
    say('на настиле ' + t.deck.id);
  }
  // Груз над настилом и траверса в клети (опускание с остановки в 3 м, посадка, отцепка, подъём пустой — пока рама
  // ниже верхней связи клети, 2 м над настилом, с запасом): крановщик ведёт груз малой скоростью, качка и поворот
  // на крюке гаснут сильнее.
  function caged() {
    if (!job || !job.target) return false;
    const ph = job.phase;
    // над складом траверса опускается между штабелями; за поддоном на настиле — в клеть настила
    if (ph === PH.toDepot || ph === PH.toPallet) return !!job.over;
    if (ph === PH.rigPallet) return true;
    if (ph === PH.lower || ph === PH.stage) return true;
    if (ph !== PH.land && ph !== PH.unrig && ph !== PH.clear) return false;
    return yT - Lr.x - RIG.frame - 0.05 < job.target.spot.y + 2.2;
  }
  function targetOk(t) { return !t.deck || (planner.deckLive(t.deck) && planner.columnClear(t.deck.x, t.deck.y, t.deck.z)); }
  function targetFree(t) { return !t.deck || !planner.busy(t.deck.x, t.deck.y, t.deck.z); }
  // Груз — к настилу задания: выше всего под путём, на подходе — вниз до 3 м над настилом.
  function toTarget() {
    goAbove(job.target.spot.x, job.target.spot.z, true, ropeFor(job.target.spot.y + 3.0, true));
    spin.to = nearYaw(job.target.spot.yaw);
    job.phase = PH.travel; job.wait = 0; job.hold = 0; job.ready = false;
  }
  // Цель ещё нужна: настил годен и кладку с него начнут, когда поддон будет готов (через leadNow). Нет — другой
  // настил под тот же груз (retarget); нет и его — false.
  function recheck() {
    const t = job.target;
    if (!t.deck || job.back || planner.still(t, 0)) return true;
    const e = t.block ? planner.eta(t.block, t.stand) : null;
    say('цель отпала: ' + t.deck.id + (t.block && t.block.built ? ', деталь готова' : e ? ', ' + e.kind + (e.who !== null && e.who !== undefined ? ' р' + e.who : '') : ', настил негоден'));
    return retarget();
  }
  // Подождать с грузом в воздухе (над тем же местом, выше всего вокруг).
  function hover() {
    say('ждёт с грузом');
    goAbove(sus.x, sus.z, true);
    job.phase = PH.hover; job.wait = 0; job.hold = 2;
  }
  // Другой настил для того же поддона: там будут класть этот материал (keep — не вычёркивать нынешний).
  function retarget(keep) {
    if (!keep && job.target.deck) pickSkip.add(job.target.deck.id);
    const id = job.target.materialId;
    const t = pickTarget(function (m) { return m === id; });
    if (!t) return false;
    job.target = t;
    say('другой настил ' + t.deck.id + ' (' + t.kind + ', кладка через ' + Math.round(t.eta) + ' с, каменщик ' + t.mason + ')');
    return true;
  }
  // Некуда везти — назад на склад, поставить, отцепить.
  function abort() {
    say('отмена: некуда');
    // на свой штабель (его, пока везут назад, не пополняют)
    const ps = slotPose(job.slot, job.slot.n);
    job.target = { deck: null, spot: { x: ps.x, y: ps.y, z: ps.z, yaw: ps.yaw } };
    job.back = true;
    goAbove(ps.x, ps.z, true, ropeFor(ps.y + 3.0, true));
    spin.to = nearYaw(ps.yaw);
    job.phase = PH.travel; job.wait = 0; job.ready = false;
  }
  function nearYaw(yaw) {
    // поддон симметричен на пол-оборота — ближайший из двух
    const d = wrap(yaw - spin.a);
    return spin.a + (Math.abs(d) > Math.PI / 2 ? wrap(d + Math.PI) : d);
  }
  function wrap2(d) { d = wrap(d); return Math.abs(d) > Math.PI / 2 ? wrap(d + Math.PI) : d; }

  // Холостой цикл (как раньше): шаги — цели приводов и паузы.
  const IDLE = [
    function () { A.to = S1; return still(A); },
    function () { Rt.to = TX1; return still(Rt); },
    function () { Lr.to = ropeAt(HY1); return still(Lr); },
    function (dt) { idleWait += dt; return idleWait > 6; },
    function () { Lr.to = ropeAt(HY0); return still(Lr); },
    function () { A.to = 0; Rt.to = TX0; return still(A) && still(Rt); },
    function (dt) { idleWait += dt; return idleWait > 8; },
  ];
  function stepIdle(dt) {
    // к холостому циклу или к складу — с безопасной высоты (крюк мог остаться низко над зданием)
    if (route) { follow(dt); return; }
    // стройка ушла вверх: между ходками крюк ждёт заказ над складом; заказа нет 40 с (поддон некуда: на настилах не
    // будут класть) или стройка опустилась (леса сняли) — круг холостого цикла, после круга — снова к складу
    const up = !!planner && !world.completed && planner.upward();
    if (waiting) {
      if (!up || (waitT += dt) > 40) { waiting = false; idleStep = 0; idleWait = 0; polar(S1, TX1, tmp); goAbove(tmp.x, tmp.z, false); }
      return;
    }
    if (IDLE[idleStep](dt)) {
      idleStep = (idleStep + 1) % IDLE.length; idleWait = 0;
      if (idleStep === 0 && up) waitAtDepot();
    }
  }

  // Шаг физики: приводы, подвес, маятник, поворот груза.
  function physics(dt) {
    slewLimits(A, Rt);
    drive(A, dt); drive(Rt, dt); drive(Lr, dt);
    Lr.x = Math.max(ropeMin, Lr.x);
    polar(A.x, Rt.x, sus);
    sus.y = yT;
    if (!pend.init) { pend.x = sus.x; pend.z = sus.z; susPrev.copy(sus); pend.init = true; }
    const loaded = !!(job && job.load && job.load.parent === hook);
    const len = Lr.x + (loaded ? 2.6 : 1.9);
    const cage = caged();
    if (pend.pinned) { pend.x = sus.x; pend.z = sus.z; pend.vx = pend.vz = 0; }
    else if (dt > 0) {
      const svx = (sus.x - susPrev.x) / dt, svz = (sus.z - susPrev.z) / dt;
      // крановщик гасит раскачку, когда приводы стоят; над настилом — ведёт груз: гашение критическое (сильнее —
      // маятник на длинном тросе возвращался бы к отвесу медленнее)
      const k = 9.8 / len;
      const damp = cage ? Math.max(0.9, 2 * Math.sqrt(k)) : 0.4 + (still(A) && still(Rt) ? 0.5 : 0);
      pend.vx += (-k * (pend.x - sus.x) - damp * (pend.vx - svx)) * dt;
      pend.vz += (-k * (pend.z - sus.z) - damp * (pend.vz - svz)) * dt;
      pend.x += pend.vx * dt; pend.z += pend.vz * dt;
      const off = Math.hypot(pend.x - sus.x, pend.z - sus.z), lim = len * 0.3;
      if (off > lim) { pend.x = sus.x + (pend.x - sus.x) * lim / off; pend.z = sus.z + (pend.z - sus.z) * lim / off; }
    }
    susPrev.copy(sus);
    // наибольший угол троса с грузом за задание (проверки)
    if (loaded && !pend.pinned) swayMax = Math.max(swayMax, Math.atan2(sway(), len) * 180 / Math.PI);
    // поворот груза на крюке: к цели мягкой пружиной; поворот стрелы тянет его за собой. Пустая траверса после
    // отцепки — к стреле, но не раньше, чем рама вышла из клети настила (иначе угол рамы — в перила)
    if (pend.pinned) spin.v = 0;
    else {
      if (!job || ((job.phase === PH.clear || job.phase === PH.unrig) && !cage)) spin.to = c.yaw + A.x;
      const ks = cage ? 1.2 : 0.3, kd = cage ? 2.2 : 0.55;
      spin.v += (-ks * wrap(spin.a - spin.to) - kd * spin.v) * dt;
      spin.a += spin.v * dt + A.v * dt * 0.15;
    }
    pend.len = len;
  }
  // Меши по состоянию.
  function place() {
    slew.rotation.y = c.yaw + A.x;
    trolley.position.set(Rt.x, (H + 0.8 - top) * K - 0.02, 0);
    const len = pend.len || (Lr.x + 1.9);
    dir.set((pend.x - sus.x) / len, 0, (pend.z - sus.z) / len);
    dir.y = -Math.sqrt(Math.max(0.01, 1 - dir.x * dir.x - dir.z * dir.z));
    hook.position.set(sus.x + dir.x * Lr.x, yT + dir.y * Lr.x, sus.z + dir.z * Lr.x);
    qTilt.setFromUnitVectors(DOWN, dir);
    qYaw.setFromAxisAngle(UP, spin.a);
    hook.quaternion.multiplyQuaternions(qTilt, qYaw);
    // трос: от тележки к обойме, в осях поворотной части
    rope.position.copy(trolley.position);
    rope.scale.set(1, Math.max(0.1, Lr.x - 0.15 * KH), 1);
    tmp.copy(dir).applyAxisAngle(UP, -slew.rotation.y);
    rope.quaternion.setFromUnitVectors(DOWN, tmp);
  }

  function update(dt, info, w) {
    tempo = info ? info.tempo : 1;
    if (w && w !== world) { world = w; planner = createPlanner(w); stock.bind(w, planner); }
    // ход крана — в темпе игры, но не быстрее ×2 (на ×5 и ×20 подробности не нужны); на паузе стоит
    const k = tempo > 0 ? Math.min(tempo, 2) : 0;
    const cdt = dt * k;
    clock += cdt;
    stock.update(dt * Math.max(0, tempo), dt);
    if (cdt <= 0) { place(); return; }
    let left = cdt;
    while (left > 1e-6) {
      const h = Math.min(left, 1 / 60);
      left -= h;
      if (job) stepJob(h);
      else {
        cool -= h;
        if (cool <= 0) {
          cool = 1.5;
          // ненужный поддон с настила (вернул модуль запаса) — сначала забрать на склад; иначе — новый заказ (материал —
          // из тех, что на складе)
          const rp = pickupTarget();
          if (rp) startPickup(rp);
          else if (canStart()) { const t = pickTarget(function (m) { return !!slotOf(m); }); if (t) startJob(t); }
        }
        if (!job) stepIdle(h);
      }
      physics(h);
    }
    showStep(cdt);
    restockStep();
    unflat();
    place();
  }
  // «Телефон»: груз на крюке — с фактурой, как только крюк дальше 18 м от склада.
  function unflat() {
    if (!job || !job.flat || !job.load || job.load.parent !== hook) return;
    if (Math.hypot(hook.position.x - depot.x, hook.position.z - depot.z) < 18) return;
    const ld = loadOf(job.spec, false);
    ld.position.copy(job.load.position);
    ld.rotation.copy(job.load.rotation);
    hook.add(ld);
    drop(job.load);
    job.load = ld;
    job.flat = false;
  }
  physics(0);
  place();
  function dispose() {
    DYNAMIC.delete(slew); DYNAMIC.delete(hook); dropLoad();
    shows.slice().forEach(function (q) { drop(q.load); });
    shows.length = 0;
    restock = null;
    if (rows) { group.remove(rows); rows.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); rows = null; }
    stock.dispose();
  }
  // Для проверок: состояние, задание сейчас, перемотка крана (без кадров).
  function state() {
    hook.updateMatrixWorld(true);
    const load = job && job.load ? job.load.getWorldPosition(new THREE.Vector3()).toArray().map(function (v) { return Math.round(v * 100) / 100; }) : null;
    return {
      jib: L, phase: job ? Object.keys(PH).find(function (k) { return PH[k] === job.phase; }) : waiting ? 'wait' : 'idle' + idleStep,
      slew: Math.round(A.x * 1000) / 1000, trolley: Math.round(Rt.x * 100) / 100, rope: Math.round(Lr.x * 100) / 100,
      hook: hook.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }), load: load, loadYaw: Math.round(spin.a * 1000) / 1000,
      cargoH: job ? Math.round(job.spec.height * 100) / 100 : 0, sway: Math.round(sway() * 100) / 100,
      swayDeg: Math.round(Math.atan2(sway(), pend.len || 1) * 1800 / Math.PI) / 10, swayMax: Math.round(swayMax * 10) / 10,
      target: job && job.target ? { x: job.target.spot.x, y: job.target.spot.y, z: job.target.spot.z, yaw: job.target.spot.yaw, deck: job.target.deck ? job.target.deck.id : null, material: job.target.materialId } : null,
      depot: [depot.x, depot.y, depot.z, depot.yaw], depotIds: depot.ids, slots: slots.map(function (q) { return q.id + ':' + q.n; }), mast: [x, y0, z], yaw0: c.yaw, jibY: yT, reach: [rMin, rMax], upward: planner ? planner.upward() : false,
      level: world ? world.level.name : null,
      stock: stock.list().length, log: log.slice(-12),
    };
  }
  function force() { cool = 0; if (!job && canStart()) { const t = pickTarget(function (m) { return !!slotOf(m); }); if (t) { startJob(t); return true; } } return !!job; }
  function skip(sec, info) { const f = { tempo: 1 }; const n = Math.ceil(sec * 30); for (let i = 0; i < n; i++) update(1 / 30, info || f, world); return state(); }
  return { group: group, update: update, dispose: dispose, event: stock.event, stock: stock, state: state, force: force, skip: skip };
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
