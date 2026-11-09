// Твёрдые осколки эффектов (fx.js): каменная крошка и щепа, конфетти сдачи (бумага и фольга), блоки кладки,
// летящие из рук каменщика в растущий ряд. Каждый вид — один InstancedMesh освещённым материалом вида (небо,
// тени, G-буфер — linkSky): крошка — грубый многогранник с цветом материала, отскакивает и ложится на пол или
// верх готовой детали; конфетти — изогнутый листок: залп летит баллистикой, потом листки расходятся и
// планируют (сопротивление растёт, у плашмя летящих больше), качаются и кувыркаются, ложатся на крышу и землю;
// блоки — та же кладка, что у ноши рабочих (families.js: семейство → материал, тон материала — цвет экземпляра).
import * as THREE from 'three';
import { linkSky } from './world.js?v=9f2863b';
import { familyOf, familyMaterial, familyTile, tintOf } from './families.js?v=9f2863b';
import { roundedBox, boxUV, Batch, hashStr } from './geo.js?v=9f2863b';
import { WIND } from './fx-sprites.js?v=9f2863b';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color(), _e = new THREE.Euler(), _a = new THREE.Vector3();
function ss(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function white(geo) {
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  return geo;
}

// Осколок: икосаэдр со сдвинутыми вершинами, грани плоские (крошка камня с гранями скола).
function shardGeometry() {
  const g = new THREE.IcosahedronGeometry(0.5, 0);
  const pos = g.attributes.position;
  const seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = Math.round(pos.getX(i) * 100) + ',' + Math.round(pos.getY(i) * 100) + ',' + Math.round(pos.getZ(i) * 100);
    let f = seen.get(k);
    if (!f) { const h = hashStr(k); f = [0.7 + ((h % 97) / 97) * 0.55, 0.65 + (((h >> 7) % 89) / 89) * 0.5, 0.7 + (((h >> 13) % 83) / 83) * 0.5]; seen.set(k, f); }
    pos.setXYZ(i, pos.getX(i) * f[0], pos.getY(i) * f[1] * 0.75, pos.getZ(i) * f[2]);
  }
  g.computeVertexNormals();
  return white(g);
}
// Листок конфетти 1 × 1 (масштаб экземпляра — размер), чуть изогнут: свет ложится полосой.
function leafGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 4, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, (x * x - 0.08) * 0.35); }
  g.computeVertexNormals();
  return white(g);
}

// Набор тел: место, скорость, поворот (кватернион), угловая скорость, масштаб, возраст, жизнь, пол, состояние.
const F = 24;
const X = 0, Y = 1, Z = 2, VX = 3, VY = 4, VZ = 5, QX = 6, QY = 7, QZ = 8, QW = 9, WX = 10, WY = 11, WZ = 12,
  SX = 13, SY = 14, SZ = 15, AGE = 16, LIFE = 17, FLOOR = 18, REST = 19, SEED = 20, COL = 21, AUX = 22, AUX2 = 23;

function bodies(mesh, cap) {
  const d = new Float32Array(cap * F);
  const col = mesh.instanceColor.array;
  const set = { mesh, d, n: 0, cap };
  set.add = function (x, y, z, hex) {
    // переполнение: место отдаёт тот, кому осталось меньше всех (а не только что вылетевший)
    if (set.n >= cap) {
      let k = 0, best = Infinity;
      for (let i = 0; i < set.n; i++) { const left = d[i * F + LIFE] - d[i * F + AGE]; if (left < best) { best = left; k = i; } }
      set.remove(k);
    }
    const i = set.n++;
    const o = i * F;
    d.fill(0, o, o + F);
    d[o + X] = x; d[o + Y] = y; d[o + Z] = z; d[o + QW] = 1; d[o + SX] = d[o + SY] = d[o + SZ] = 1;
    d[o + SEED] = Math.random(); d[o + FLOOR] = -1e9;
    if (typeof hex === 'number') _c.setHex(hex); else _c.setRGB(hex[0], hex[1], hex[2]);
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    mesh.instanceColor.needsUpdate = true;
    return o;
  };
  set.remove = function (i) {
    set.n--;
    if (i !== set.n) { d.copyWithin(i * F, set.n * F, set.n * F + F); col.copyWithin(i * 3, set.n * 3, set.n * 3 + 3); mesh.instanceColor.needsUpdate = true; }
  };
  // поворот на угловую скорость за dt
  set.spin = function (o, dt) {
    const wx = d[o + WX], wy = d[o + WY], wz = d[o + WZ];
    const w = Math.hypot(wx, wy, wz);
    if (w < 1e-5) return;
    _q2.setFromAxisAngle(_a.set(wx / w, wy / w, wz / w), w * dt);
    _q.set(d[o + QX], d[o + QY], d[o + QZ], d[o + QW]).premultiply(_q2).normalize();
    d[o + QX] = _q.x; d[o + QY] = _q.y; d[o + QZ] = _q.z; d[o + QW] = _q.w;
  };
  set.write = function (i, k) {
    const o = i * F;
    _m.compose(_p.set(d[o + X], d[o + Y], d[o + Z]), _q.set(d[o + QX], d[o + QY], d[o + QZ], d[o + QW]), _s.set(d[o + SX] * k, d[o + SY] * k, d[o + SZ] * k));
    mesh.setMatrixAt(i, _m);
  };
  // warm — кадров с пустой видимой сеткой: программу материала three.js собирает при отрисовке и с нулём экземпляров
  set.warm = 0;
  set.flush = function () {
    mesh.count = set.n;
    mesh.visible = set.n > 0 || set.warm > 0;
    if (set.warm > 0) set.warm--;
    if (set.n) mesh.instanceMatrix.needsUpdate = true;
  };
  set.clear = function () { set.n = 0; mesh.count = 0; mesh.visible = false; };
  return set;
}

function instanced(geo, material, cap, name) {
  const mesh = new THREE.InstancedMesh(geo, material, cap);
  mesh.name = name;
  mesh.count = 0;
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.noGI = true;
  mesh.setColorAt(0, _c.setRGB(1, 1, 1));
  return mesh;
}

// opts: { mats, MB, caps: { chips, confetti, foil, flyers }, floorAt(x, y, z), foil: bool }
export function createPieces(opts) {
  const group = new THREE.Group();
  group.name = 'fx-pieces';
  const caps = opts.caps;
  // крошка: матовый камень; цвет материала — экземпляру
  const chipMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, vertexColors: true });
  linkSky(chipMat);
  const chips = bodies(instanced(shardGeometry(), chipMat, caps.chips, 'fx-chips'), caps.chips);
  // конфетти: мелованная бумага и фольга (на «Телефоне» — только бумага)
  const leaf = leafGeometry();
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0, side: THREE.DoubleSide, vertexColors: true });
  linkSky(paperMat);
  const paper = bodies(instanced(leaf, paperMat, caps.confetti, 'fx-confetti'), caps.confetti);
  let foil = null;
  if (caps.foil > 0) {
    const foilMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.24, metalness: 1, side: THREE.DoubleSide, vertexColors: true, envMapIntensity: 1.4 });
    linkSky(foilMat);
    foil = bodies(instanced(leaf, foilMat, caps.foil, 'fx-foil'), caps.foil);
  }
  [chips, paper, foil].forEach(function (s) { if (s) group.add(s.mesh); });

  // ---------- крошка и щепа ----------
  // size — поперечник, м; long — вытянутость (щепа); v — разлёт, м/с
  function chip(x, y, z, vx, vy, vz, hex, size, long) {
    const o = chips.add(x, y, z, hex);
    const d = chips.d;
    d[o + VX] = vx; d[o + VY] = vy; d[o + VZ] = vz;
    _q.setFromEuler(_e.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3));
    d[o + QX] = _q.x; d[o + QY] = _q.y; d[o + QZ] = _q.z; d[o + QW] = _q.w;
    d[o + WX] = (Math.random() - 0.5) * 24; d[o + WY] = (Math.random() - 0.5) * 24; d[o + WZ] = (Math.random() - 0.5) * 24;
    const l = long || 1;
    d[o + SX] = size * (0.8 + Math.random() * 0.4); d[o + SY] = size * (0.6 + Math.random() * 0.4) / Math.sqrt(l); d[o + SZ] = size * l;
    d[o + LIFE] = 1.3 + Math.random() * 0.9;
    d[o + FLOOR] = opts.floorAt(x, y, z);
    d[o + AUX] = Math.floor(x / 2) * 4096 + Math.floor(z / 2);
  }
  function stepChips(dt) {
    const d = chips.d;
    for (let i = chips.n - 1; i >= 0; i--) {
      const o = i * F;
      d[o + AGE] += dt;
      if (d[o + AGE] >= d[o + LIFE]) { chips.remove(i); continue; }
      if (d[o + REST] < 0.5) {
        d[o + VY] -= 9.8 * dt;
        d[o + X] += d[o + VX] * dt; d[o + Y] += d[o + VY] * dt; d[o + Z] += d[o + VZ] * dt;
        // перелетел в соседнюю клетку — свой пол (земля или верх готовой детали)
        const col = Math.floor(d[o + X] / 2) * 4096 + Math.floor(d[o + Z] / 2);
        if (col !== d[o + AUX]) { d[o + AUX] = col; d[o + FLOOR] = opts.floorAt(d[o + X], d[o + Y], d[o + Z]); }
        const bottom = d[o + FLOOR] + d[o + SY] * 0.3;
        if (d[o + Y] < bottom) {
          d[o + Y] = bottom;
          if (d[o + VY] < -1.2) {
            d[o + VY] = -d[o + VY] * 0.3; d[o + VX] *= 0.5; d[o + VZ] *= 0.5;
            d[o + WX] *= 0.5; d[o + WY] *= 0.5; d[o + WZ] *= 0.5;
          } else { d[o + REST] = 1; d[o + VX] = d[o + VY] = d[o + VZ] = 0; }
        }
        chips.spin(o, dt);
      }
    }
    for (let i = 0; i < chips.n; i++) {
      const o = i * F;
      chips.write(i, 1 - ss(d[o + AGE], d[o + LIFE] - 0.35, d[o + LIFE]));
    }
    chips.flush();
  }

  // ---------- конфетти ----------
  // листок: размер (м), цвет, фольга ли; скорость вылета
  function confetti(x, y, z, vx, vy, vz, size, hex, metal) {
    const set = metal && foil ? foil : paper;
    const o = set.add(x, y, z, hex);
    const d = set.d;
    d[o + VX] = vx; d[o + VY] = vy; d[o + VZ] = vz;
    _q.setFromEuler(_e.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3));
    d[o + QX] = _q.x; d[o + QY] = _q.y; d[o + QZ] = _q.z; d[o + QW] = _q.w;
    const w = 7 + Math.random() * 9;
    _a.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(w);
    d[o + WX] = _a.x; d[o + WY] = _a.y; d[o + WZ] = _a.z;
    d[o + SX] = size * (1.1 + Math.random() * 0.5); d[o + SY] = size * (0.6 + Math.random() * 0.25); d[o + SZ] = size;
    d[o + LIFE] = 9 + Math.random() * 4;
    d[o + FLOOR] = opts.floorAt(x, y, z);
    d[o + AUX] = Math.floor(x / 2) * 4096 + Math.floor(z / 2);
    d[o + AUX2] = 1.5 + Math.random() * 2.5;   // частота качания
  }
  function stepConfetti(set, dt) {
    if (!set) return;
    const d = set.d;
    for (let i = set.n - 1; i >= 0; i--) {
      const o = i * F;
      const age = (d[o + AGE] += dt);
      if (age >= d[o + LIFE]) { set.remove(i); continue; }
      if (d[o + REST] > 0.5) continue;
      // нормаль листка (z после поворота): плашмя — тормозит сильнее, ребром — падает быстрее
      const qx = d[o + QX], qy = d[o + QY], qz = d[o + QZ], qw = d[o + QW];
      const ny = Math.abs(2 * (qy * qz - qw * qx));
      // в залпе листки слиплись — летят далеко; разошлись — планируют (~1 м/с)
      const c = (0.08 + 7.5 * ss(age, 0.12, 0.9)) * (0.5 + 0.9 * ny);
      const rx = d[o + VX] - WIND[0], ry = d[o + VY], rz = d[o + VZ] - WIND[2];
      const sp = Math.hypot(rx, ry, rz);
      const k = 1 / (1 + c * sp * dt);
      const sway = 2.2 * ss(age, 0.4, 1.2), f = d[o + AUX2], ph = d[o + SEED] * 40;
      d[o + VX] = WIND[0] + rx * k + Math.sin(age * f + ph) * sway * dt;
      d[o + VZ] = WIND[2] + rz * k + Math.cos(age * f * 0.8 + ph) * sway * dt;
      d[o + VY] = ry * k - 9.8 * dt;
      d[o + X] += d[o + VX] * dt; d[o + Y] += d[o + VY] * dt; d[o + Z] += d[o + VZ] * dt;
      set.spin(o, dt);
      const colKey = Math.floor(d[o + X] / 2) * 4096 + Math.floor(d[o + Z] / 2);
      if (colKey !== d[o + AUX]) { d[o + AUX] = colKey; d[o + FLOOR] = opts.floorAt(d[o + X], d[o + Y], d[o + Z]); }
      if (d[o + Y] <= d[o + FLOOR] + 0.004 && d[o + VY] < 0) {
        // лёг плашмя, повёрнут как придётся
        d[o + Y] = d[o + FLOOR] + 0.004;
        d[o + REST] = 1;
        const a = Math.random() * 6.283, sy = Math.sin(a / 2), cy = Math.cos(a / 2), sx = -Math.SQRT1_2, cx = Math.SQRT1_2;
        d[o + QX] = cy * sx; d[o + QY] = sy * cx; d[o + QZ] = -sy * sx; d[o + QW] = cy * cx;
        d[o + VX] = d[o + VY] = d[o + VZ] = 0;
      }
    }
    for (let i = 0; i < set.n; i++) {
      const o = i * F;
      set.write(i, 1 - ss(d[o + AGE], d[o + LIFE] - 1.2, d[o + LIFE]));
    }
    set.flush();
  }

  // ---------- блоки кладки, летящие в ряд ----------
  // по семейству — свой InstancedMesh: брусок 0,19 м с фаской, кладка семейства (как ноша рабочих, crew.js)
  const BLOCK = 0.19;
  const flyers = new Map();
  function flyerSet(materialId) {
    const MB = opts.MB;
    const family = familyOf(MB, materialId);
    let set = flyers.get(family);
    if (set) return set;
    const tile = family === 'glass' ? [0.4, 0.4] : familyTile(family);
    const h = hashStr(family);
    const b = new Batch();
    b.add(boxUV(roundedBox(BLOCK, BLOCK, BLOCK, 0.008, 3), tile[0], tile[1], (h % 97) / 97, (h % 89) / 89), new THREE.Matrix4(), new THREE.Color(1, 1, 1));
    const mesh = instanced(b.geometry(), familyMaterial(opts.mats, family), caps.flyers, 'fx-fly-' + family);
    mesh.castShadow = !!opts.shadows;
    group.add(mesh);
    set = bodies(mesh, caps.flyers);
    set.family = family;
    flyers.set(family, set);
    return set;
  }
  // от (x0…) к (x1…) за dur с, дугой высотой arc; yaw — поворот в ряду
  function fly(materialId, x0, y0, z0, x1, y1, z1, dur, arc, yaw) {
    const set = flyerSet(materialId);
    const MB = opts.MB;
    const t = tintOf(MB, materialId, set.family === 'glass' ? 'glass' : set.family);
    const o = set.add(x0, y0, z0, set.family === 'glass' ? [1, 1, 1] : t);
    const d = set.d;
    // VX..VZ — откуда, WX..WZ — куда (поля тела под полёт)
    d[o + VX] = x0; d[o + VY] = y0; d[o + VZ] = z0;
    d[o + WX] = x1; d[o + WY] = y1; d[o + WZ] = z1;
    d[o + LIFE] = dur; d[o + AUX] = arc; d[o + AUX2] = yaw;
    d[o + FLOOR] = (Math.random() - 0.5) * 2.4;   // кувырок в полёте, рад
  }
  function stepFlyers(dt) {
    flyers.forEach(function (set) {
      const d = set.d;
      for (let i = set.n - 1; i >= 0; i--) {
        const o = i * F;
        d[o + AGE] += dt;
        if (d[o + AGE] >= d[o + LIFE] + 0.05) { set.remove(i); continue; }
      }
      for (let i = 0; i < set.n; i++) {
        const o = i * F;
        const u = Math.min(1, d[o + AGE] / d[o + LIFE]);
        const e = u * (2 - u);  // к концу медленнее — блок «садится» в ряд
        d[o + X] = d[o + VX] + (d[o + WX] - d[o + VX]) * e;
        d[o + Y] = d[o + VY] + (d[o + WY] - d[o + VY]) * e + Math.sin(Math.PI * u) * d[o + AUX];
        d[o + Z] = d[o + VZ] + (d[o + WZ] - d[o + VZ]) * e;
        // кувырок гаснет к посадке, в ряду — по оси ряда
        const tumble = d[o + FLOOR] * (1 - e);
        _q.setFromEuler(_e.set(tumble, d[o + AUX2] + tumble * 0.6, tumble * 0.4));
        d[o + QX] = _q.x; d[o + QY] = _q.y; d[o + QZ] = _q.z; d[o + QW] = _q.w;
        // сел — уходит в ряд (кладка растёт рядами, building.js)
        set.write(i, 1 - ss(u, 0.86, 1) * 0.9);
      }
      set.flush();
    });
  }

  // Сетки блоков всех семейств площадки — заранее (fx.js → build) и первые кадры площадки видимы пустыми: вариант
  // материала с экземплярами (и его тень) соберёт первый кадр новой стройки, пока открыт брифинг, а не первый
  // бросок посреди игры. Общий прогрев игры (game.js → shadersReady → renderer.compile) их не застаёт: площадку
  // вид строит уже после него, в первом кадре.
  const WARM_FRAMES = 3;
  function prepare(materialIds) {
    const seen = new Set();
    materialIds.forEach(function (id) {
      if (typeof id !== 'string' || seen.has(id)) return;
      seen.add(id);
      // на каждой площадке: свет (мачты ночи) и тени меняют программы — старая могла не подойти
      flyerSet(id).warm = WARM_FRAMES;
    });
  }
  function update(dt) {
    stepChips(dt);
    stepConfetti(paper, dt);
    stepConfetti(foil, dt);
    stepFlyers(dt);
  }
  function clear() {
    chips.clear(); paper.clear(); if (foil) foil.clear();
    flyers.forEach(function (s) { s.clear(); });
  }
  function count() {
    let f = 0;
    flyers.forEach(function (s) { f += s.n; });
    return { chips: chips.n, confetti: paper.n + (foil ? foil.n : 0), flyers: f };
  }
  return { group, chip, confetti, fly, prepare, update, clear, count, hasFoil: !!foil };
}
