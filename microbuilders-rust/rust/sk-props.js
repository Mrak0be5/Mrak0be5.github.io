// Реквизит переноски и запаса (sk-haul.js, sk-stock.js) кодом: носилки по семейству и запас у места работы.
// «Максимум» — по мешу на материал (доски, сталь, резина, оцинковка, раствор, кладка семейства, стекло), фаски,
// колесо со спицами-диском и протектором; «Телефон» (lite) — носилка с ношей одной сеткой материала снаряжения
// (cw-ranks.js gearMaterials: матовое и металл в одной сетке, цвет — в вершинах, цвет штук — цвет материала
// оригинала), колесо тачки — вторая сетка (крутится), без фасок; тень — только у крупного (тачка, поддон).
// Сетки — по составу (носилка, семейство, штук, заполнение): кэш, пересборка — только когда состав сменился.
// Оси носилок (м):
//   коза   — начало на плече (точка опоры лотка), +y — вдоль древка к лотку, +z — в раскрыв лотка; кирпичи ложком
//            вдоль древка, слоями 1–2–3 в «V»; хват правой — на древке в GRIP.hod;
//   тачка  — начало на оси колеса, +z — вперёд (к колесу), ручки — к −z (sk-haul.js BARROW), колесо — своя сетка
//            (wheel) на оси, крутится вокруг x;
//   брус, лист — начало на плече (опора), +z — вдоль ноши вперёд, ноша лежит на y ≥ 0; хват — снизу спереди;
//   вёдра  — начало в кулаке (дужка), ведро висит к −y;
//   рама со стеклом — начало у верха передней стойки (хват), рама — в плоскости yz, стёкла на полке;
//   ящик   — начало между ладоней, ящик к +z.
import * as THREE from 'three';
import { Batch, roundedBox, boxUV, cylinder, stone } from './geo.js?v=ff29707';
import { familyMaterial, familyTile, tintOf } from './families.js?v=ff29707';
import { gearMaterials, gearOut } from './cw-ranks.js?v=ff29707';
import { TEXTURE_TILES as TILE } from './textures.js?v=ff29707';
import { ashlarStone, hash11 } from './ms-lay.js?v=ff29707';
import { BARROW } from './sk-haul.js?v=ff29707';
import { layoutFor, PALLET, SLEEPER } from './sk-stock.js?v=ff29707';
import { linkSky } from './world.js?v=ff29707';

// цвет частей на «Телефоне» (sRGB) и металл ли они; strap — ремень (на «Максимуме» — материал rope)
const FLAT = { planks: [0x8a6a44, 0], steel: [0x5a5d61, 1], tube: [0x6a6f75, 1], rubber: [0x1c1c1c, 0], zinc: [0x8e9396, 1], mortar: [0x8f8b83, 0],
  paint: [0xffffff, 0], glass: [0x9fb6bf, 1], strap: [0x3b3a33, 0] };
const SHAPE = 3;
const GALV = new THREE.Color(0x9aa0a4);
// хваты (оси носилки): правая и левая, м
export const GRIP = {
  hod: { R: [0, -0.52, 0.015], L: null },
  beam: { R: [0, -0.05, 0.42], L: null },
  sheet: { R: [-0.58, 0.04, 0.12], L: null },
  stretcher: { R: [0, 0, 0], L: null },
  crate: { R: [-0.2, 0.12, 0.17], L: [0.2, 0.12, 0.17] },
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function M(x, y, z, rx, ry, rz) { _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); return _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(1, 1, 1)); }
// ось x заготовки → ось y носилки, y → z, z → x (кирпич ложком вдоль древка)
const _bx = new THREE.Vector3(0, 1, 0), _by = new THREE.Vector3(0, 0, 1), _bz = new THREE.Vector3(1, 0, 0);
function MC(x, y, z) { return _m.makeBasis(_bx, _by, _bz).setPosition(x, y, z); }

// Детали по материалам: put(ключ, заготовка, матрица, цвет) → build(): «Максимум» — меш на материал, «Телефон» —
// одна сетка снаряжения (gearOut) с цветом частей FLAT × цвет.
class Parts {
  constructor(lite) { this.lite = lite; this.map = new Map(); this.matte = lite ? new Batch() : null; this.metal = lite ? new Batch() : null; }
  put(key, prim, m, color) {
    if (this.lite) {
      const f = key.indexOf('fam:') === 0 ? null : FLAT[key] || FLAT.paint;
      const c = new THREE.Color(f ? f[0] : 0xffffff);
      if (color) c.multiply(color);
      (f && f[1] ? this.metal : this.matte).add(prim, m, c);
      return;
    }
    let b = this.map.get(key);
    if (!b) { b = new Batch(); this.map.set(key, b); }
    b.add(prim, m, color || null);
  }
  // от a к b брусок сечением w × h (ось бруска — y)
  bar(key, a, b, w, h, color) {
    _d.subVectors(b, a);
    const len = _d.length();
    if (len < 1e-4) return;
    _q.setFromUnitVectors(UP, _d.divideScalar(len));
    _p.addVectors(a, b).multiplyScalar(0.5);
    this.put(key, this.box(w, len, h, 0.006), _m.compose(_p, _q, _s.set(1, 1, 1)), color);
  }
  tube(key, a, b, r, rad, color) {
    _d.subVectors(b, a);
    const len = _d.length();
    if (len < 1e-4) return;
    _q.setFromUnitVectors(UP, _d.divideScalar(len));
    this.put(key, cylinder(r, r, len, this.lite ? Math.max(5, rad >> 1) : rad, true), _m.compose(a, _q, _s.set(1, 1, 1)), color);
  }
  box(w, h, d, r) { return roundedBox(w, h, d, this.lite ? 0 : r, this.lite ? 1 : SHAPE); }
  // геометрии с материалами: [{ geometry, material }] (fam(ключ) — материал кладки)
  geos(mats) {
    const out = [];
    if (this.lite) {
      const geo = gearOut(this.matte, this.metal);
      if (geo) out.push({ geometry: geo, material: gearMaterials().gear });
    } else {
      this.map.forEach(function (b, key) {
        if (!b.vcount) return;
        const mat = key.indexOf('fam:') === 0 ? familyMaterial(mats, key.slice(4)) : mats[key === 'strap' ? 'rope' : key] || mats.paint;
        // небо и выходы G-буфера — сразу (меш появляется после обхода сцены linkSkyTree)
        linkSky(mat);
        out.push({ geometry: b.geometry(), material: mat });
      });
    }
    return out;
  }
  // меши в группу g; mats — материалы вида; shadow — бросают ли тень
  build(g, mats, shadow) { return meshesOf(this.geos(mats), g, shadow); }
}
function meshesOf(list, g, shadow) {
  return list.map(function (q) { const m = new THREE.Mesh(q.geometry, q.material); m.castShadow = !!shadow; m.receiveShadow = true; if (g) g.add(m); return m; });
}

// Штука кладки w × h × d с фактурой одной её единицы (как crew.js → unitPiece): кирпич, тёсаный камень, брус,
// лист, плита; i — номер (разные кирпичи и камни).
function unitPrim(fam, w, h, d, r, i, lite) {
  const tile = familyTile(fam === 'gem' || fam === 'glass' ? 'stone' : fam);
  let ou = 0.25, ov = 0.125;
  if (fam === 'brick') { ou = 0.125 + 0.25 * (i % 4); ov = 0.0625 + 0.074 * ((i >> 2) % 3); }
  else if (fam === 'stone') { const s = ashlarStone(i % 5); ou = s.u; ov = 1 / 12 + (i % 3) / 3; }
  else if (fam === 'wood') { ou = hash11(0.7 + i) + 0.5; ov = 0.05 + 0.2 * (i % 4); }
  else if (fam === 'metal') { ov = 0.0625 + 0.5 * (i % 2); }
  return boxUV(roundedBox(w, h, d, lite ? 0 : r, lite ? 1 : SHAPE), tile[0], tile[1], ou, ov);
}
// цвет штук: «Максимум» — оттенок кладки (цвет вершин на фактуре семейства), «Телефон» — цвет материала оригинала
function unitColor(MB, id, fam, lite) {
  if (lite) { const m = MB.MATERIAL[id]; return new THREE.Color(m ? m.color : 0x8a8178); }
  const t = tintOf(MB, id, fam === 'glass' ? 'stone' : fam);
  return new THREE.Color(t[0], t[1], t[2]);
}

// Корыто или лоток: открытая коробка с наклонными стенками (верх hx × hz, низ bx × bz, глубина h, толщина t) —
// снаружи и внутри (две поверхности), у оси низа — y = 0.
function trayPrim(hx, hz, bx, bz, h, t) {
  const pos = [], nrm = [], uv = [], index = [];
  const quad = function (a, b, c, d, n) {
    const base = pos.length / 3;
    [a, b, c, d].forEach(function (v) { pos.push(v[0], v[1], v[2]); nrm.push(n[0], n[1], n[2]); uv.push(v[0] + v[2], v[1] + v[2] * 0.5); });
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const shell = function (k, inward) {
    const o = inward ? t : 0, s = inward ? -1 : 1;
    const B = [[-bx + o, o, -bz + o], [bx - o, o, -bz + o], [bx - o, o, bz - o], [-bx + o, o, bz - o]];
    const T = [[-hx + o, h, -hz + o], [hx - o, h, -hz + o], [hx - o, h, hz - o], [-hx + o, h, hz - o]];
    // низ (снаружи — вниз, внутри — вверх)
    if (inward) quad(B[0], B[3], B[2], B[1], [0, 1, 0]); else quad(B[0], B[1], B[2], B[3], [0, -1, 0]);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const e1 = [B[j][0] - B[i][0], B[j][1] - B[i][1], B[j][2] - B[i][2]], e2 = [T[i][0] - B[i][0], T[i][1] - B[i][1], T[i][2] - B[i][2]];
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      n = [s * -n[0] / l, s * -n[1] / l, s * -n[2] / l];
      if (inward) quad(B[i], T[i], T[j], B[j], n); else quad(B[i], B[j], T[j], T[i], n);
    }
  };
  shell(0, false); shell(1, true);
  // кромка по верху
  const R = [[-hx, h, -hz], [hx, h, -hz], [hx, h, hz], [-hx, h, hz]], Ri = [[-hx + t, h, -hz + t], [hx - t, h, -hz + t], [hx - t, h, hz - t], [-hx + t, h, hz - t]];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(R[i], Ri[i], Ri[j], R[j], [0, 1, 0]); }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), index: new Uint32Array(index) };
}

// ---------- носилки ----------
// Коза: древко 1,1 м, лоток «V» 0,55 м (две доски под 90°, торцевая доска внизу), n кирпичей слоями 1–2–3 по два.
// Лоток отогнут от древка назад на HOD_BEND (как у настоящей козы): древко на плече идёт вниз-вперёд к руке, лоток
// лежит на плече и уходит назад почти горизонтально, раскрывом вверх; начало осей — точка опоры на плече (лоток
// выступает вперёд от неё на 0,12 м). HOD_SLOT — середина лотка (оси козы): туда кладут и оттуда берут кирпичи.
export const HOD_BEND = 0.82;
const HOD_T = new THREE.Matrix4().makeRotationX(-HOD_BEND).multiply(new THREE.Matrix4().makeTranslation(0, -0.12, 0));
export const HOD_SLOT = new THREE.Vector3(0, 0.28, 0.1).applyMatrix4(HOD_T).toArray();
const _ht = new THREE.Matrix4();
function hod(P, MB, id, n) {
  const pole = new THREE.Vector3(0, -1.0, 0), top = new THREE.Vector3(0, 0.03, 0);
  P.tube('planks', pole, top, 0.019, 8);
  const T = function (m) { return _ht.multiplyMatrices(HOD_T, m); };
  // доски лотка: в плоскости, где лежит древко, раскрыв к +z
  [-Math.PI / 4, -3 * Math.PI / 4].forEach(function (a, k) {
    P.put('planks', boxUV(P.box(0.21, 0.56, 0.014, 0.004), TILE.planks[0], TILE.planks[1], 0.1 * k, 0.3), T(M(0.074 * (k ? -1 : 1), 0.29, 0.074, 0, a, 0)));
  });
  P.put('planks', boxUV(P.box(0.27, 0.014, 0.15, 0.004), TILE.planks[0], TILE.planks[1], 0.5, 0.1), T(M(0, 0.012, 0.07)));
  // скоба под лотком — к древку
  P.tube('steel', new THREE.Vector3(0, 0.1, 0.012).applyMatrix4(HOD_T), new THREE.Vector3(0, 0.36, 0.012).applyMatrix4(HOD_T), 0.008, 6);
  if (!id || n <= 0) return;
  const fam = 'brick', col = unitColor(MB, id, fam, P.lite);
  let k = 0;
  for (let layer = 0; layer < 3 && k < n; layer++) for (let c = 0; c <= layer && k < n; c++) for (let r = 0; r < 2 && k < n; r++) {
    // кирпич ложком вдоль лотка: длина 0,25 по y, постель 0,12 по x, тычок 0,065 по z
    const x = (c - layer / 2) * 0.125, z = 0.045 + layer * 0.068, y = 0.15 + r * 0.26;
    P.put('fam:' + fam, unitPrim(fam, 0.25, 0.065, 0.12, 0.005, k, P.lite), T(MC(x, y, z)), col);
    k++;
  }
}
// Тачка: корыто, две ручки-оглобли, вилка с осью, ножки с перемычкой; груз — колотый камень или раствор.
function barrowBody(P, MB, id, fam, n, level) {
  const B = BARROW;
  // корыто: верх 0,62 × 0,82, низ 0,4 × 0,5, глубина 0,3; низ — над оглоблями, передняя кромка — над колесом
  const tz = -0.5, ty = 0.14;
  P.put('paint', trayPrim(0.31, 0.41, 0.2, 0.25, 0.3, 0.004), M(0, ty, tz), new THREE.Color(0x2f6b3a));
  // оглобли: от ручек (концы на GRIP_Z) под корытом к вилке у колеса
  [-1, 1].forEach(function (s) {
    _a.set(s * 0.27, B.GRIP_Y, -B.GRIP_Z); _b.set(s * 0.1, 0.02, 0.04);
    P.bar('planks', _a, _b, 0.042, 0.042, null);
    // ручка-накладка (резина) на конце
    _a.set(s * 0.27, B.GRIP_Y + 0.004, -B.GRIP_Z); _b.set(s * 0.265, B.GRIP_Y - 0.008, -B.GRIP_Z + 0.16);
    P.bar('rubber', _a, _b, 0.05, 0.05, null);
    // вилка к оси
    _a.set(s * 0.1, 0.02, 0.04); _b.set(s * 0.06, 0, 0);
    P.bar('steel', _a, _b, 0.03, 0.012, null);
    // ножка: от оглобли вниз до земли (при ровной тачке низ — на −LEG_Y)
    _a.set(s * 0.22, 0.11, -B.LEG_Z + 0.04); _b.set(s * 0.24, -B.LEG_Y + 0.01, -B.LEG_Z - 0.02);
    P.tube('tube', _a, _b, 0.013, 8);
    P.put('rubber', P.box(0.05, 0.02, 0.06, 0.004), M(s * 0.24, -B.LEG_Y + 0.01, -B.LEG_Z - 0.02));
  });
  P.tube('tube', new THREE.Vector3(-0.23, 0.0, -B.LEG_Z - 0.0), new THREE.Vector3(0.23, 0.0, -B.LEG_Z - 0.0), 0.011, 6);
  // ось колеса
  P.tube('steel', new THREE.Vector3(-0.07, 0, 0), new THREE.Vector3(0.07, 0, 0), 0.012, 8);
  if (n <= 0 && !(level > 0)) return;
  if (fam === 'concrete') {
    // раствор: гладь в корыте по уровню
    const h = 0.05 + 0.22 * Math.min(1, level || 0.5), sx = 0.2 + (0.31 - 0.2) * h / 0.3, sz = 0.25 + (0.41 - 0.25) * h / 0.3;
    P.put('mortar', boxUV(P.box(sx * 2 - 0.02, 0.02, sz * 2 - 0.02, 0.004), TILE.mortar[0], TILE.mortar[1]), M(0, ty + h, tz));
    return;
  }
  // колотый камень: до 8 кусков двумя слоями
  const col = unitColor(MB, id, 'stone', P.lite);
  for (let k = 0; k < n; k++) {
    const layer = k >> 2, q = k & 3;
    const x = (q & 1 ? 0.11 : -0.11) + (layer ? 0.05 : 0), z = tz + (q & 2 ? 0.14 : -0.14) + (layer ? -0.04 : 0), y = ty + 0.1 + layer * 0.15;
    const w = 0.2 + 0.04 * hash11(k + 1.3), h = 0.14 + 0.03 * hash11(k + 2.1), d = 0.18 + 0.04 * hash11(k + 3.7);
    const prim = P.lite ? unitPrim('stone', w, h, d, 0, k, true) : stone(w, h, d, k * 5 + 3, familyTile('stone'), ashlarStone(k % 5).u, 1 / 12);
    P.put('fam:stone', prim, M(x, y, z, 0.2 * hash11(k + 4.4) - 0.1, hash11(k + 5.5) * 3, 0.2 * hash11(k + 6.6) - 0.1), col);
  }
}
// Колесо тачки: шина (тор), обод-диск, ступица — ось колеса по x.
function barrowWheel(P) {
  const R = BARROW.R, seg = P.lite ? 12 : 22;
  const tyre = new THREE.TorusGeometry(R - 0.045, 0.045, P.lite ? 6 : 10, seg);
  tyre.rotateY(Math.PI / 2);
  P.put('rubber', { pos: tyre.attributes.position.array, nrm: tyre.attributes.normal.array, uv: tyre.attributes.uv.array, index: tyre.index.array }, M(0, 0, 0));
  const disc = cylinder(R - 0.075, R - 0.075, 0.05, P.lite ? 10 : 18, true);
  P.put('steel', disc, M(-0.025, 0, 0, 0, 0, -Math.PI / 2), new THREE.Color(0xb7322b));
  P.put('steel', cylinder(0.035, 0.035, 0.1, 8, true), M(-0.05, 0, 0, 0, 0, -Math.PI / 2));
  if (!P.lite) {
    // протектор: поперечные грунтозацепы — видно, что колесо крутится
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      P.put('rubber', P.box(0.07, 0.012, 0.03, 0), M(0, Math.cos(a) * R, Math.sin(a) * R, -a, 0, 0));
    }
  }
}
// Брус на плечо: n брусьев 2,4 м сечением 0,15, лежат вдоль +z: столбиком по два над плечом, третий и четвёртый —
// вторым столбиком снаружи (к −x, от головы).
function beams(P, MB, id, n) {
  const col = unitColor(MB, id, 'wood', P.lite);
  const L = 2.4;
  for (let k = 0; k < n; k++) {
    const c = k < 2 ? 0 : 1, row = k % 2;
    P.put('fam:wood', unitPrim('wood', L, 0.15, 0.15, 0.008, k, P.lite), M(-c * 0.155, 0.075 + row * 0.15, -0.1, 0, Math.PI / 2, 0), col);
  }
}
// Лист металла: n листов 1,25 × 0,62 × 0,01 стопкой; крепление (sk-pose.js MOUNT.sheet) ставит их на ребро у правого
// бока — ось x листа вниз, верхняя кромка на плече, длинная сторона вдоль хода; правая держит нижнюю кромку.
function sheets(P, MB, id, n) {
  const col = unitColor(MB, id, 'metal', P.lite);
  for (let k = 0; k < n; k++) P.put('fam:metal', unitPrim('metal', 0.62, 0.01, 1.25, 0.002, k, P.lite), M(-0.31, 0.006 + k * 0.011, 0.08), col);
}
// Ведро с раствором: дужка в кулаке, ведро ниже на 0,32 м; level — заполнение.
function bucket(P, level) {
  // оцинковка — светло-серой краской (металл zinc у мелкого реквизита в тени чернел)
  const zinc = trayPrim(0.15, 0.15, 0.12, 0.12, 0.3, 0.004);
  P.put('paint', zinc, M(0, -0.62, 0), GALV);
  // дужка: две стойки к кулаку
  [-1, 1].forEach(function (s) { _a.set(s * 0.15, -0.34, 0); _b.set(s * 0.03, 0.0, 0); P.tube('steel', _a, _b, 0.004, 5); });
  P.tube('steel', new THREE.Vector3(-0.03, 0, 0), new THREE.Vector3(0.03, 0, 0), 0.006, 6);
  if (level > 0) {
    const h = 0.06 + 0.22 * Math.min(1, level), s = 0.12 + 0.03 * h / 0.3;
    P.put('mortar', boxUV(P.box(s * 2 - 0.012, 0.012, s * 2 - 0.012, 0.003), TILE.mortar[0], TILE.mortar[1]), M(0, -0.62 + h, 0));
  }
}
// Рама-носилка для стекла: две стойки 0,85 м, полка внизу, перекладина, ремень к левому плечу; n стёкол на полке.
function stretcher(P, n) {
  const H = 0.85, D = 0.62;
  [0, -D].forEach(function (z) { P.put('planks', boxUV(P.box(0.035, H, 0.035, 0.004), TILE.planks[0], TILE.planks[1]), M(0, -H / 2, z)); });
  P.put('planks', boxUV(P.box(0.03, 0.03, D + 0.06, 0.004), TILE.planks[0], TILE.planks[1]), M(0, -0.06, -D / 2));
  // полка (уголок) и войлок на ней
  P.put('planks', boxUV(P.box(0.11, 0.025, D + 0.06, 0.004), TILE.planks[0], TILE.planks[1]), M(0.045, -H + 0.02, -D / 2));
  P.put('strap', P.box(0.1, 0.006, D, 0.002), M(0.045, -H + 0.035, -D / 2));
  // ремень: от перекладины над плечом
  _a.set(0, -0.04, -D / 2 + 0.1); _b.set(0.3, 0.32, -D / 2 + 0.1);
  P.bar('strap', _a, _b, 0.04, 0.006, null);
  for (let k = 0; k < n; k++) P.put('glass', P.box(0.008, 0.72, 0.56, 0.002), M(0.03 + k * 0.012, -H + 0.04 + 0.36, -D / 2, 0, 0, -0.04));
}
// Ящик для самоцветов: доски, планки по углам.
function crate(P) {
  P.put('planks', boxUV(P.box(0.45, 0.3, 0.34, 0.006), TILE.planks[0], TILE.planks[1]), M(0, 0, 0.17));
  [-1, 1].forEach(function (s) { P.put('planks', boxUV(P.box(0.03, 0.31, 0.35, 0.004), TILE.planks[0], TILE.planks[1], 0.5), M(s * 0.21, 0, 0.17)); });
}

// Носилка в группу: kind, материал id (семейство fam), n штук, level — заполнение раствором. → { group, wheel
// (у тачки — группа колеса), meshes } — меши по составу из кэша (общие у рабочих).
const CACHE = new Map();
export function carrierParts(kind, MB, id, fam, n, level, lite) {
  const lv = Math.round((level || 0) * 8) / 8;
  const key = kind + '|' + id + '|' + n + '|' + lv + '|' + (lite ? 1 : 0);
  let c = CACHE.get(key);
  if (c) return c;
  const P = new Parts(lite);
  if (kind === 'hod') hod(P, MB, id, n);
  // «Телефон»: колесо — в той же сетке (не крутится; один вызов на тачку)
  else if (kind === 'barrow') { barrowBody(P, MB, id, fam, n, lv); if (lite) barrowWheel(P); }
  else if (kind === 'beam') beams(P, MB, id, n);
  else if (kind === 'sheet') sheets(P, MB, id, n);
  else if (kind === 'buckets') bucket(P, lv);
  else if (kind === 'stretcher') stretcher(P, n);
  else if (kind === 'crate') crate(P);
  c = { parts: P, key: key };
  CACHE.set(key, c);
  return c;
}
// Геометрии носилок — общие у всех рабочих (по составу и детальности): у каждого свои меши на тех же буферах;
// смена площадки — disposeCarriers() освобождает все (sk-crew.js → clear).
const GEOS = new Map();
function sharedGeos(key, parts, mats) {
  let list = GEOS.get(key);
  if (!list) { list = parts.geos(mats); GEOS.set(key, list); }
  return list;
}
export function disposeCarriers() {
  GEOS.forEach(function (list) { list.forEach(function (q) { q.geometry.dispose(); }); });
  GEOS.clear();
}
// колесо тачки — одно на всех (кэш по детальности)
const WHEELS = {};
function wheelParts(lite) { if (!WHEELS[lite ? 1 : 0]) { const P = new Parts(lite); barrowWheel(P); WHEELS[lite ? 1 : 0] = P; } return WHEELS[lite ? 1 : 0]; }

// Носилка рабочего: группа с мешами состава; set(kind, id, fam, n, level) меняет состав (геометрии — общие, меши —
// свои, кэш по составу), dispose() — снять меши (геометрии общие — освобождает disposeCarriers).
export function createCarrier(mats, MB, lite) {
  const group = new THREE.Group();
  group.name = 'sk-carrier';
  const body = new THREE.Group(), wheel = new THREE.Group();
  group.add(body, wheel);
  let cur = '';
  const built = new Map();
  function meshesFor(key, parts, shadow) {
    let list = built.get(key);
    if (list) return list;
    list = meshesOf(sharedGeos(key, parts, mats), null, shadow);
    built.set(key, list);
    return list;
  }
  return {
    group: group, body: body, wheel: wheel,
    set: function (kind, id, fam, n, level) {
      const c = kind ? carrierParts(kind, MB, id, fam, n, level, lite) : null;
      const key = c ? c.key : '';
      if (key === cur) return false;
      cur = key;
      body.children.slice().forEach(function (o) { body.remove(o); });
      wheel.children.slice().forEach(function (o) { wheel.remove(o); });
      if (!c) { group.visible = false; return true; }
      // тень — у тачки и бруса (крупное); мелочь в руках — без (на «Телефоне» — всё без)
      const shadow = !lite && (kind === 'barrow' || kind === 'beam' || kind === 'sheet');
      meshesFor(c.key + '|' + (shadow ? 1 : 0), c.parts, shadow).forEach(function (m) { body.add(m); });
      if (kind === 'barrow' && !lite) meshesFor('wheel|0', wheelParts(false), true).forEach(function (m) { wheel.add(m); });
      group.visible = true;
      return true;
    },
    key: function () { return cur; },
    dispose: function () { built.clear(); cur = ''; body.children.slice().forEach(function (o) { body.remove(o); }); wheel.children.slice().forEach(function (o) { wheel.remove(o); }); },
  };
}

// ---------- запас ----------
// Запас (sk-stock.js) в группу: поддон или прокладки, штуки по раскладке, корыто с раствором рядом (кладка). Оси —
// начало в середине низа, +x — длинная сторона. Кран — только свои штуки поверх его поддона.
function stockParts(P, MB, e) {
  const L = layoutFor(e);
  const crane = e.kind === 'crane';
  // на поддоне крана — поверх его груза (свои штуки — в пределах поддона 1,2 × 0,6, sk-stock.js → craneLayout)
  const lift = crane ? e.top - e.y - L.base : 0;
  if (!crane && L.kind === 'pallet') {
    // поддон: пять досок настила, три поперечные, шашки
    for (let k = 0; k < 5; k++) P.put('planks', boxUV(P.box(PALLET.w, 0.022, 0.145, 0.003), TILE.planks[0], TILE.planks[1], k * 0.17, k * 0.125), M(0, PALLET.h - 0.011, (k - 2) * 0.163));
    for (let k = -1; k <= 1; k++) P.put('planks', boxUV(P.box(0.12, 0.022, PALLET.d, 0.003), TILE.planks[0], TILE.planks[1], k * 0.4, 0.5), M(k * 0.44, PALLET.h - 0.033, 0), new THREE.Color(0.8, 0.78, 0.74));
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) P.put('planks', boxUV(P.box(0.12, 0.074, 0.1, 0.003), TILE.planks[0], TILE.planks[1], i * 0.3, j * 0.2), M(i * 0.44, 0.037 + 0.022, j * 0.34), new THREE.Color(0.75, 0.72, 0.68));
  } else if (!crane && L.kind === 'stack') {
    // прокладки поперёк
    [-0.35, 0.35].forEach(function (x) { P.put('planks', boxUV(P.box(0.08, SLEEPER.h, e.fam === 'metal' ? 0.6 : 0.75, 0.004), TILE.planks[0], TILE.planks[1], x, 0.3), M(x * (e.fam === 'metal' ? 1 : 2), SLEEPER.h / 2, 0)); });
  } else if (!crane && L.kind === 'rack') {
    // стойка стекла: основание, наклонная спинка (на настиле — уже, rackW)
    const rw = L.rackW || 0.7, rh = L.unit[1] + 0.1;
    P.put('planks', boxUV(P.box(rw, 0.05, 0.3, 0.004), TILE.planks[0], TILE.planks[1]), M(0, 0.025, 0));
    [-1, 1].forEach(function (k) { P.put('planks', boxUV(P.box(0.04, rh, 0.04, 0.004), TILE.planks[0], TILE.planks[1]), M(k * (rw / 2 - 0.05), 0.02 + rh / 2, -0.08, -0.12, 0, 0)); });
  }
  if (!crane && (L.kind === 'tub' || L.tub)) {
    // корыто: у кладки — сбоку от поддона, у бетона — само запас (на козлах; на настиле — малое, без козел); уровень
    // раствора — по штукам (вылили ведро — поднялся, зачерпнул — опустился; пустое — только мазок на дне)
    const ts = L.kind === 'tub' && L.tubSize ? L.tubSize : [0.46, 0.31, 0.26];
    const ox = L.kind === 'tub' ? 0 : PALLET.w / 2 + 0.55, ly = L.kind === 'tub' ? L.lift || 0 : 0;
    if (ly > 0) {
      // козлы: четыре стойки и две перекладины под дном
      [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { P.put('planks', boxUV(P.box(0.05, ly, 0.05, 0.004), TILE.planks[0], TILE.planks[1], a * 0.2, b * 0.3), M(ox + a * (ts[0] - 0.12), ly / 2, b * (ts[1] - 0.08))); }); });
      [-1, 1].forEach(function (b) { P.put('planks', boxUV(P.box(2 * ts[0] - 0.12, 0.05, 0.07, 0.004), TILE.planks[0], TILE.planks[1], 0.3, b * 0.2), M(ox, ly - 0.025, b * (ts[1] - 0.08))); });
    }
    P.put('paint', trayPrim(ts[0], ts[1], ts[0] - 0.06, ts[1] - 0.05, ts[2], 0.004), M(ox, ly, 0), GALV);
    const lv = L.kind === 'tub' ? (e.units > 0 ? 0.2 + 0.8 * Math.min(1, e.units / Math.max(1, L.cap)) : 0.02) : Math.max(0.2, e.mortar);
    P.put('mortar', boxUV(P.box(2 * ts[0] - 0.1 + 0.06 * lv, 0.014, 2 * ts[1] - 0.08 + 0.05 * lv, 0.003), TILE.mortar[0], TILE.mortar[1]), M(ox, ly + 0.02 + (ts[2] - 0.06) * lv, 0));
  }
  if (L.kind === 'tub') return;
  const fam = e.fam === 'gem' ? 'stone' : e.fam;
  const col = e.fam === 'glass' ? null : unitColor(MB, e.materialId, fam, P.lite);
  // нижние слои, что на поддоне всегда (sk-stock.js grid bed): штуки рабочего — поверх них
  if (!crane && L.bed && L.bedAt) {
    for (let i = 0; i < L.bed; i++) { const p = L.bedAt(i), u = L.unit; P.put('fam:' + fam, unitPrim(fam, u[0], u[1], u[2], Math.min(0.01, u[1] * 0.2), i + 7, P.lite), M(p[0], p[1], p[2]), col); }
  }
  if (e.units <= 0) return;
  for (let i = 0; i < Math.min(e.units, L.cap); i++) {
    const p = L.at(i), u = L.unit;
    if (e.fam === 'glass') P.put('glass', P.box(u[0], u[1], u[2], 0.002), M(p[0], p[1], p[2], -0.12, 0, 0));
    else P.put('fam:' + fam, unitPrim(fam, u[0], u[1], u[2], Math.min(0.01, u[1] * 0.2), i, P.lite), M(p[0], p[1] + lift, p[2]), col);
  }
}

// Запас площадки: группа на запас (сдвиг, поворот, подъём и уход — трансформом), сетки — по составу.
export function createStockView(mats, MB, lite) {
  const group = new THREE.Group();
  group.name = 'sk-stock';
  const views = new Map();
  let seen = -1;
  function sync(stock) {
    const list = stock.list();
    const live = new Set();
    list.forEach(function (e) {
      live.add(e.id);
      let v = views.get(e.id);
      if (!v) { v = { g: new THREE.Group(), key: '' }; v.g.name = 'sk-stock-' + e.id; views.set(e.id, v); group.add(v.g); }
      const key = e.units + '|' + Math.round(e.mortar * 10) + '|' + (e.kind === 'crane' ? Math.round(e.top * 100) : 0);
      if (key !== v.key) {
        v.key = key;
        v.g.children.slice().forEach(function (o) { v.g.remove(o); o.geometry.dispose(); });
        const P = new Parts(lite);
        stockParts(P, MB, e);
        P.build(v.g, mats, !lite);
      }
      // появляется — поднимается из-под пола на 4 см и растёт; уходит — оседает и тает
      const k = e.fade > 0 ? 1 - e.fade : e.appear, s = 0.6 + 0.4 * k;
      v.g.position.set(e.x, e.y - 0.04 * (1 - k), e.z);
      v.g.rotation.set(0, e.yaw, 0);
      v.g.scale.set(s, k, s);
      v.g.visible = k > 0.01;
    });
    views.forEach(function (v, id) {
      if (live.has(id)) return;
      v.g.children.forEach(function (o) { o.geometry.dispose(); });
      group.remove(v.g);
      views.delete(id);
    });
  }
  return {
    group: group,
    update: function (stock) { if (stock.version === seen) return; seen = stock.version; sync(stock); },
    clear: function () { views.forEach(function (v) { v.g.children.forEach(function (o) { o.geometry.dispose(); }); group.remove(v.g); }); views.clear(); seen = -1; },
  };
}
