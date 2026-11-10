// Груз башенного крана (site-crane.js): поддон с материалом яруса и стропы. Поддон — узкий, для лесов, 1,2 × 0,6 м
// (настил из досок на шашках): на настиле он встаёт к наружным перилам и оставляет у стены проход больше метра
// (европоддон 0,8 м по середине клетки упирался бы в идущих). На нём — то, из чего сейчас кладут: кирпич двумя
// пачками в ленте, тёсаный камень блоками, брус рядами на прокладках, стальные листы, бетонные блоки, мраморные
// плиты, стеклоблоки; самоцветы — ящиками. Груз — «единицы» сверху вниз: поддон у каменщиков убывает по одной (верхний ряд пачки, верхний блок).
// Сборка — в кучу (site-kit.js Pile) в осях поддона: начало — середина низа, длинная сторона — вдоль x.
// Стропы — четырёхветвевой строп из троса: ветви от кольца под крюком к углам поддона; меш один, вершины
// пересчитываются каждый кадр (натянуты, провисли, сняты — висят пучком под крюком).
import * as THREE from 'three';
import { familyOf, familyTile, tintOf } from './families.js?v=ff29707';
import { boxUV } from './geo.js?v=ff29707';
import { M, mul, hex } from './site-kit.js?v=ff29707';

export const PALLET = { w: 1.2, d: 0.6, h: 0.144 };
const WOOD = hex(0x9c7a52), WOOD_D = hex(0x7a5c3c), STRAP = hex(0x2f5f9a), STRAP_L = hex(0xd9d3c2), CRATE = hex(0x8a6a44), GLASS_C = hex(0x9fb4be);

// Состав груза по материалу: { fam, units: [{ w, h, d, x, y, z, key, ou, ov, c }], height, straps } — коробки в осях
// поддона (y — середина коробки над верхом настила), упорядочены снизу вверх (убывает с конца списка).
export function cargoSpec(MB, materialId) {
  const fam = familyOf(MB, materialId);
  const tint = fam === 'glass' ? [1, 1, 1] : tintOf(MB, materialId, fam === 'gem' ? 'gem' : fam);
  const col = new THREE.Color(tint[0], tint[1], tint[2]);
  const units = [];
  const top = PALLET.h;
  const put = function (key, w, h, d, x, y, z, ou, ov, c) { units.push({ key: key, w: w, h: h, d: d, x: x, y: top + y, z: z, ou: ou || 0, ov: ov || 0, c: c || col }); };
  let straps = false;
  if (fam === 'brick') {
    // две пачки по 0,57 м, шесть ярусов по два ряда кирпича (0,148 м — ровно два ряда фактуры: швы совпадают)
    const tile = familyTile('brick'), course = 0.148;
    for (let k = 0; k < 6; k++) for (let p = 0; p < 2; p++) put('fam:brick', 0.57, course - 0.002, 0.56, (p - 0.5) * 0.585, (k + 0.5) * course, 0, p * 0.37, (k * course) / tile[1] + 0.5 * course / tile[1]);
    straps = true;
  } else if (fam === 'stone') {
    // тёсаные блоки 0,56 × 0,32 × 0,28: два ряда по 2 × 2
    for (let k = 0; k < 2; k++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
      put('fam:stone', 0.56, 0.32, 0.275, (i - 0.5) * 0.585, 0.165 + k * 0.335, (j - 0.5) * 0.29, i * 0.31 + j * 0.53 + k * 0.17, 0.5 + 0.17 * k);
  } else if (fam === 'wood') {
    // брус 200 мм: ряд — три бруса (одна коробка, фактура сруба даёт брусья и джут), прокладки между рядами
    const tile = familyTile('wood');
    for (let k = 0; k < 4; k++) put('fam:wood', 1.16, 0.2, 0.58, 0, 0.1 + k * 0.225, 0, k * 0.29, 0.5 * 0.2 / tile[1] + k * 0.13);
  } else if (fam === 'metal') {
    // листы 1,16 × 0,04 × 0,56 стопкой
    for (let k = 0; k < 10; k++) put('fam:metal', 1.16, 0.036, 0.56, (k % 2 - 0.5) * 0.008, 0.02 + k * 0.042, ((k * 7) % 3 - 1) * 0.006, k * 0.21, k * 0.13);
    straps = true;
  } else if (fam === 'concrete') {
    // бетонные блоки 0,58 × 0,3 × 0,28: два ряда по 2 × 2
    for (let k = 0; k < 2; k++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
      put('fam:concrete', 0.575, 0.3, 0.28, (i - 0.5) * 0.59, 0.15 + k * 0.305, (j - 0.5) * 0.29, i * 0.4 + k * 0.2, j * 0.3);
  } else if (fam === 'marble') {
    // плиты 1,16 × 0,06 на прокладках
    for (let k = 0; k < 6; k++) put('fam:marble', 1.16, 0.06, 0.56, 0, 0.05 + k * 0.085, 0, k * 0.27, k * 0.19);
  } else if (fam === 'glass') {
    // стеклоблоки 19 см в ящике — три ряда по 6 × 3 (коробками рядов)
    for (let k = 0; k < 3; k++) put('glass', 1.14, 0.19, 0.56, 0, 0.1 + k * 0.2, 0);
  } else {
    // самоцветы: два ящика с крышками, цвет — на лентах
    for (let k = 0; k < 2; k++) put('planks', 0.55, 0.42, 0.55, (k - 0.5) * 0.59, 0.21, 0, k * 0.3, 0.2, CRATE);
    straps = true;
  }
  let height = 0;
  units.forEach(function (u) { height = Math.max(height, u.y + u.h / 2); });
  return { fam: fam, materialId: materialId, units: units, height: height, straps: straps, color: col, blue: isBlue(MB, materialId) };
}
function isBlue(MB, id) {
  const spec = MB.MATERIAL[id];
  return !!spec && (spec.color & 255) > ((spec.color >> 16) & 255) + 40;
}

// Поддон с грузом в кучу P по матрице m (низ поддона). left — сколько единиц груза осталось (по умолчанию все).
// Доски поддона: на «Максимуме» — фактура досок с фаской, на «Телефоне» — одной краской (меньше вызовов: поддон,
// ленты и строп — один меш краски). flat — и груз одной краской цвета материала (запас склада на «Телефоне»: в общей
// куче площадки каждый материал кладки был бы своим вызовом отрисовки).
export function putCargo(P, kit, spec, m, left, flat) {
  const n = left === undefined ? spec.units.length : Math.max(0, Math.min(spec.units.length, left));
  const at = function (x, y, z, ry) { return mul(m, M(x, y, z, ry || 0)); };
  const wood = function (w, h, d, ou, ov, mm, c) {
    if (kit.fine) P.put('planks', kit.tbox('planks', w, h, d, 0.004, ou, ov, 1), mm);
    else P.put('paint', kit.box(w, h, d, 0), mm, c || WOOD);
  };
  // настил: четыре доски вдоль, три поперечные доски, девять шашек, три нижние доски
  for (let k = 0; k < 4; k++) wood(PALLET.w, 0.022, 0.145, k * 0.17, k * 0.125, at(0, PALLET.h - 0.011, (k - 1.5) * 0.151));
  for (let k = -1; k <= 1; k++) wood(0.145, 0.022, PALLET.d, k * 0.4 + 0.2, 0.5, at(k * 0.5275, PALLET.h - 0.033, 0), WOOD_D);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) wood(0.145, 0.078, j === 0 ? 0.145 : 0.1, i * 0.3, j * 0.2, at(i * 0.5275, 0.061, j * 0.25), WOOD_D);
  if (kit.fine) for (let k = -1; k <= 1; k++) wood(PALLET.w, 0.022, 0.1, k * 0.21, 0.75, at(0, 0.011, k * 0.25), WOOD_D);
  for (let i = 0; i < n; i++) {
    const u = spec.units[i];
    if (flat) { P.put('paint', kit.box(u.w, u.h, u.d, 0), at(u.x, u.y, u.z), u.key === 'glass' ? GLASS_C : u.c); continue; }
    let prim;
    if (u.key.indexOf('fam:') === 0) {
      const tile = familyTile(u.key.slice(4));
      prim = boxUV(kit.box(u.w, u.h, u.d, Math.min(0.012, u.h * 0.2)), tile[0], tile[1], u.ou, u.ov);
    } else if (u.key === 'glass') prim = boxUV(kit.box(u.w, u.h, u.d, 0.01), 0.19, 0.19);
    else prim = kit.tbox(u.key, u.w, u.h, u.d, 0.008, u.ou, u.ov);
    P.put(u.key === 'glass' && !kit.mats.glass ? 'paint' : u.key, prim, at(u.x, u.y, u.z), u.c);
  }
  // стяжные ленты — пока груз цел (у каменщиков первую же единицу берут — ленты срезаны)
  if (spec.straps && n === spec.units.length) {
    const h = spec.height - PALLET.h, c = spec.blue ? STRAP_L : STRAP;
    [-0.3, 0.3].forEach(function (x) {
      P.put('paint', kit.box(0.035, 0.006, 0.59, 0), at(x, spec.height + 0.003, 0), c);
      [-1, 1].forEach(function (e) { P.put('paint', kit.box(0.035, h, 0.006, 0), at(x, PALLET.h + h / 2, e * 0.292), c); });
    });
  }
}

// Высота верха груза при n оставшихся единицах (м над низом поддона).
export function cargoTop(spec, n) {
  let h = PALLET.h;
  for (let i = 0; i < Math.min(n, spec.units.length); i++) h = Math.max(h, spec.units[i].y + spec.units[i].h / 2);
  return h;
}

// ---------- траверса ----------
// Под крюком всегда висит строповочная траверса для поддонов: кольцо, четыре ветви троса к углам рамы из швеллера
// 1,36 × 0,5 м, с углов рамы — отвесные цепи с крюками, которые заводятся под торцы поддона (за концами груза,
// в 8 см от торца). Цепи отвесные — груз между ними не задевает, а когда траверса опущена на поддон, концы цепей
// как раз у его торцов (зацепили — отцепили без видимых «рук»). Поперёк рама уже поддона (0,57 против 0,6 м):
// в клети настила её держит не шире груза, наружу к перилам ничего не выходит. Сборка — в кучу P в осях крюка: начало — середина обоймы крюка, y вниз — к грузу.
// RIG.hang — от начала крюка до низа поддона (м), RIG.low — до концов цепей.
export const RIG = { ring: 1.0, frame: 1.75, chain: 1.3, hang: 3.16, low: 3.1, fw: 1.36, fd: 0.5 };
const YELLOW = hex(0xe2b53a), CHAIN = hex(0x6a6c70), WHITE_C = new THREE.Color(1, 1, 1);
export function putRig(P, kit) {
  const V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  const fw = RIG.fw / 2, fd = RIG.fd / 2, yf = -RIG.frame;
  // кольцо (плоское звено) под крюком
  P.put('steel', kit.cyl(0.07, 0.07, 0.03, 12), M(0, -RIG.ring + 0.05, 0, 0, Math.PI / 2, 0));
  // ветви: от кольца к углам рамы
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) {
    P.tube('cable', V(0, -RIG.ring, 0), V(q[0] * fw, yf + 0.05, q[1] * fd), 0.011, WHITE_C, 5);
    // отвесная цепь: звенья — короткие брусочки вразбежку (вблизи читается цепью), крюк на конце
    const n = kit.fine ? 18 : 6, step = RIG.chain / n;
    for (let i = 0; i < n; i++) P.put('steel', kit.box(i % 2 ? 0.012 : 0.032, step * 1.05, i % 2 ? 0.032 : 0.012, 0), M(q[0] * fw, yf - (i + 0.5) * step, q[1] * fd), CHAIN);
    P.put('steel', kit.box(0.025, 0.08, 0.06, 0.004), M(q[0] * fw, -RIG.low + 0.02, q[1] * fd), CHAIN);
    // крюк цепи — носом под торец поддона (к середине)
    P.put('steel', kit.box(0.12, 0.025, 0.025, 0.004), M(q[0] * (fw - 0.05), -RIG.low - 0.01, q[1] * fd, 0), CHAIN);
  });
  // рама траверсы: швеллеры по длинным и коротким сторонам, проушины по углам
  [-1, 1].forEach(function (e) {
    P.put('paintworn', kit.box(RIG.fw + 0.08, 0.1, 0.07, 0.008), M(0, yf, e * fd), YELLOW);
    P.put('paintworn', kit.box(0.07, 0.1, RIG.fd - 0.07, 0.008), M(e * fw, yf, 0), YELLOW);
  });
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { P.put('steel', kit.box(0.05, 0.08, 0.05, 0.006), M(q[0] * fw, yf + 0.08, q[1] * fd)); });
}
