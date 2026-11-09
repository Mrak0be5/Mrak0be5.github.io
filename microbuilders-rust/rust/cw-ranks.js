// Разряды рабочих оригинала (worker-model.js, balance.json → meta.training.ranks) в реалистичном виде: цвета каски
// и спецовки разряда, что каждый разряд добавляет (как редкость: следующий носит всё прежнего и ещё вещь), облик
// рабочего по номеру найма (кожа, волосы, лицо — тот же хэш, что looksOf оригинала) и снаряжение кодом:
//   1 — комбинезон цвета разряда (хаки), простая каска, кожаные перчатки;
//   2 — светоотражающие ленты на груди, спине, рукавах и штанинах, наклейка на каске;
//   3 — пояс с подсумком и молотком, светоотражающие полосы по бокам каски;
//   4 — яркие перчатки, наколенники, наушники, круглая нашивка со звездой на спине;
//   5 — рация на лямке, очки на каске, голубое свечение под ногами;
//   6 — налобный фонарь, наплечники, звезда на нагруднике, фиолетовое свечение;
//   7 — золото: золотая каска с гребнем и крылышками, золотые ленты и пряжка.
// Ленты, нашивки и наклейка рисуют шейдеры ткани и каски (humans.js, people.js) — без лишних вызовов отрисовки;
// снаряжение — по одной слитой сетке на кость (пояс, грудь, плечи, каска), цвет — в вершинах.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch } from './geo.js?v=45127fe';
import { linkSky } from './world.js?v=45127fe';

const GOLD = 0xffcf4a, TAPE = 0xeef3f8, METAL = 0xc9ced4;
const RANK_FALLBACK = [
  { helmet: 'f0cf5a', suit: '9c9272' }, { helmet: 'f28a2e', suit: 'c9652a' }, { helmet: 'e0473b', suit: 'a3302c' },
  { helmet: '52c26a', suit: '2f8748' }, { helmet: '3d8ef0', suit: '2b5aa6' }, { helmet: 'a86cf0', suit: '6b42b0' },
  { helmet: 'ffd84a', suit: 'c98a12' },
];
function ranks() {
  const b = typeof window !== 'undefined' ? window.MicroBuildersBalance : null;
  const list = b && b.meta && b.meta.training && b.meta.training.ranks;
  return list && list.length ? list : RANK_FALLBACK;
}
function shade(hex, k) { const c = new THREE.Color(hex); c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k); return c.getHex(); }
function mix(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex(); }

// Одежда разряда — как outfitOf оригинала (каска и комбинезон из баланса, вещи по ступеням).
export function outfitOf(rank) {
  const list = ranks();
  const index = Math.max(0, Math.min(list.length, rank || 1) - 1);
  const spec = list[index];
  const helmet = parseInt(spec.helmet, 16), suit = parseInt(spec.suit || spec.helmet, 16);
  const top = index === list.length - 1;
  return {
    tier: index + 1, top: top, helmet: helmet, helmetDark: shade(helmet, 0.72), suit: suit, suitDark: shade(suit, 0.74), suitLight: shade(suit, 1.18),
    trim: top ? GOLD : TAPE,
    glove: index >= 3 ? (top ? GOLD : mix(helmet, 0xffffff, 0.15)) : 0x8a6440,
    aura: index >= 4 ? helmet : null,
  };
}

// Облик по номеру найма — тот же хэш, что looksOf (worker-model.js): соседи по найму выглядят по-разному,
// и рабочий вида — тот же человек, что фигурка оригинала (седой — седой, с бородой — с бородой).
const SKIN_REAL = [0xdcae92, 0xd09c7c, 0xb98060, 0x96603f, 0x6e4430, 0xe3bda4];
const HAIR_REAL = [0x3a2a1f, 0x5b3b22, 0x1f1b18, 0x8a5a2e, 0xa8854c, 0x8e8a84, 0xbdb8b0];
const FACES = ['plain', 'moustache', 'beard', 'stubble', 'plain', 'moustache'];
export function looksOf(seed) {
  let h = (Math.abs(Math.floor(seed || 0)) + 1) * 2654435761 >>> 0;
  function pick(n) { h = (h ^ (h >>> 15)) * 2246822519 >>> 0; return h % n; }
  const skin = pick(SKIN_REAL.length), hair = pick(HAIR_REAL.length), face = FACES[pick(FACES.length)];
  return { skin: SKIN_REAL[skin], hair: HAIR_REAL[hair], grey: hair >= 5, face: face, brow: pick(3) - 1 };
}

// ---------- снаряжение кодом ----------
// Части — примитивы three в осях кости (м), цвет — в вершинах; на сетку — одна «пачка».
function prim(g) {
  return { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: g.attributes.uv ? g.attributes.uv.array : null, index: g.index ? g.index.array : Array.from({ length: g.attributes.position.count }, function (_, i) { return i; }) };
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
function put(batch, g, color, p, s, r) {
  const sc = Array.isArray(s) ? s : [s, s, s];
  _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0);
  _m.compose(new THREE.Vector3(p[0], p[1], p[2]), _q.setFromEuler(_e), new THREE.Vector3(sc[0], sc[1], sc[2]));
  batch.add(prim(g), _m, _c.setHex(color));
}
const G = {};
function geo() {
  if (G.box) return G;
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
  G.cyl8 = new THREE.CylinderGeometry(1, 1, 1, 8);
  G.sphere = new THREE.SphereGeometry(1, 14, 10);
  G.half = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  G.torus = new THREE.TorusGeometry(1, 0.14, 6, 20);
  G.band = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true);
  return G;
}
function out(batch) { return batch.vcount ? batch.geometry() : null; }
// Матовое и металл одной сеткой (один вызов отрисовки): металл — атрибут aMetal (материал gear).
export function gearOut(matte, metal) {
  const a = matte && matte.vcount ? matte.geometry() : null, b = metal && metal.vcount ? metal.geometry() : null;
  const list = [a, b].filter(Boolean);
  if (!list.length) return null;
  list.forEach(function (g) {
    g.setAttribute('aMetal', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(g === b ? 1 : 0), 1));
  });
  const g = list.length === 1 ? list[0] : mergeGeometries(list);
  g.computeBoundingSphere();
  return g;
}

// Материалы снаряжения: gear — матовое (ткань, резина, кожа, дерево) и металл в одной сетке (aMetal), светящееся
// (линза фонаря, огонёк рации, рубин) — отдельно.
let MATS = null;
export function gearMaterials() {
  if (MATS) return MATS;
  MATS = {
    gear: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.02 }),
    glow: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, emissive: 0xffffff, emissiveIntensity: 2.2 }),
  };
  MATS.gear.onBeforeCompile = function (shader) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aMetal;\nvarying float vMetal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMetal = aMetal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vMetal;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.85, vMetal);\nroughnessFactor = mix(roughnessFactor, 0.32, vMetal);');
  };
  MATS.gear.customProgramCacheKey = function () { return 'cw-gear1'; };
  // огонёк светится своим цветом: emissive × цвет вершин
  MATS.glow.onBeforeCompile = function (shader) {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;');
  };
  MATS.glow.customProgramCacheKey = function () { return 'cw-glow1'; };
  Object.values(MATS).forEach(linkSky);
  return MATS;
}

// Каска: оси группы каски (people.js): y = 0 — край полей, макушка купола — 0,125, вперёд +z; купол ~0,1 м.
const HEAD_CACHE = new Map();
export function helmetGear(tier, top, helmetDark) {
  const key = tier + '|' + helmetDark;
  if (HEAD_CACHE.has(key)) return HEAD_CACHE.get(key);
  const g = geo();
  const matte = new Batch(), metal = new Batch(), glow = new Batch();
  if (tier >= 4) {
    // наушники на дужке: чашки у ушей (ниже края каски), дужка к полям
    [-1, 1].forEach(function (s) {
      put(matte, g.cyl, 0x2a2d31, [s * 0.088, -0.05, -0.004], [0.036, 0.03, 0.036], [0, 0, Math.PI / 2]);
      put(matte, g.cyl, helmetDark, [s * 0.104, -0.05, -0.004], [0.028, 0.008, 0.028], [0, 0, Math.PI / 2]);
      put(matte, g.box, 0x2a2d31, [s * 0.098, -0.018, -0.004], [0.008, 0.06, 0.016], [0, 0, -0.18 * s]);
    });
  }
  if (tier >= 5) {
    // очки, поднятые на каску: резинка по куполу, две линзы спереди
    put(matte, g.band, 0x24272b, [0, 0.05, 0.002], [0.1, 0.016, 0.116]);
    [-1, 1].forEach(function (s) {
      put(metal, g.cyl, 0x2f5f7c, [s * 0.033, 0.066, 0.098], [0.021, 0.012, 0.021], [1.2, 0, s * 0.25]);
      put(matte, g.torus, 0x2a2d31, [s * 0.033, 0.067, 0.103], [0.022, 0.022, 0.18], [-0.37, s * 0.25, 0]);
    });
  }
  if (tier >= 6) {
    // налобный фонарь
    put(metal, g.cyl, top ? GOLD : 0x3a3d42, [0, 0.074, 0.1], [0.017, 0.022, 0.017], [1.15, 0, 0]);
    put(glow, g.cyl, 0xfff2c0, [0, 0.079, 0.111], [0.013, 0.004, 0.013], [1.15, 0, 0]);
  }
  if (top) {
    // гребень по коньку, крылышки по бокам, рубин спереди
    // плюмаж: тёмно-красный, по коньку назад
    put(matte, g.sphere, 0xb8291f, [0, 0.15, -0.035], [0.013, 0.04, 0.075], [0.45, 0, 0]);
    [-1, 1].forEach(function (s) {
      put(metal, g.box, GOLD, [s * 0.086, 0.06, -0.025], [0.005, 0.04, 0.055], [0.3, 0.25 * s, -0.4 * s]);
      put(metal, g.box, GOLD, [s * 0.094, 0.085, -0.045], [0.004, 0.032, 0.042], [0.6, 0.25 * s, -0.55 * s]);
    });
    put(glow, g.sphere, 0xff2a48, [0, 0.07, 0.103], [0.011, 0.011, 0.006]);
  }
  const set = { gear: gearOut(matte, metal), glow: out(glow) };
  HEAD_CACHE.set(key, set);
  return set;
}

// Сечение талии по углу (people.js → waistProfile): prof.r — наибольший радиус ткани от оси талии в каждом из N
// секторов (от +z вперёд к +x); между серединами секторов — линейно (на склоне так лента не уходит в ткань).
export function profileRadius(prof, a) {
  const n = prof.r.length, f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * n - 0.5 + n, i = Math.floor(f), t = f - i;
  return prof.r[i % n] * (1 - t) + prof.r[(i + 1) % n] * t;
}
// Ремень по сечению талии: открытая лента, радиус — ткань + толщина кожи (облегает спину и бока, накрывает нижний
// край нагрудника).
function profileBand(prof, h, margin) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(x, z), r = profileRadius(prof, a) + margin;
    p.setXYZ(i, Math.sin(a) * r, p.getY(i) * h, Math.cos(a) * r);
  }
  g.computeVertexNormals();
  return g;
}

// Ремень с пряжкой (у всех, как у оригинала), с 3-го разряда — подсумок слева и молоток в петле справа. Оси —
// таза модели, начало — на высоте ремня по оси талии, вперёд +z; w, d — полуширина и полуглубина талии; prof —
// сечение талии (тогда лента — по нему, пряжка и подсумок — на его поверхности).
const BELT_CACHE = new Map();
export function beltGear(w, d, top, tools, prof) {
  const key = Math.round(w * 1000) + '|' + Math.round(d * 1000) + '|' + top + '|' + tools + '|' + (prof ? prof.key : '');
  if (BELT_CACHE.has(key)) return BELT_CACHE.get(key);
  const g = geo();
  const matte = new Batch(), metal = new Batch();
  // ремень — открытая лента по талии, пряжка спереди
  if (prof) {
    d = profileRadius(prof, 0) - 0.003;
    w = Math.max(profileRadius(prof, Math.PI / 2), profileRadius(prof, -Math.PI / 2)) - 0.003;
    put(matte, profileBand(prof, 0.042, 0.005), 0x2b2420, [0, 0, 0], [1, 1, 1]);
  } else put(matte, g.band, 0x2b2420, [0, 0, 0], [w + 0.008, 0.042, d + 0.008]);
  put(metal, g.box, top ? GOLD : METAL, [0, 0, d + 0.011], [0.052, 0.036, 0.008]);
  put(matte, g.box, 0x2b2420, [0, 0, d + 0.013], [0.03, 0.016, 0.006]);
  if (!tools) { const plain = { gear: gearOut(matte, metal) }; BELT_CACHE.set(key, plain); return plain; }
  // подсумок: кожа с клапаном и заклёпкой
  put(matte, g.box, 0x7a4e2c, [w + 0.02, -0.07, 0.01], [0.05, 0.11, 0.09], [0, 0.22, 0]);
  put(matte, g.box, 0x5e3a1f, [w + 0.024, -0.02, 0.01], [0.056, 0.03, 0.094], [0, 0.22, 0]);
  put(metal, g.sphere, METAL, [w + 0.048, -0.03, 0.012], 0.006);
  // молоток: рукоять в петле, бойок вверх
  put(matte, g.box, 0x2b2420, [-(w + 0.012), -0.04, 0.0], [0.022, 0.04, 0.03]);
  put(matte, g.cyl8, 0x9b6b3d, [-(w + 0.024), -0.1, 0.0], [0.011, 0.24, 0.011], [0, 0, 0.1]);
  put(metal, g.box, 0x55595e, [-(w + 0.016), 0.02, 0.0], [0.022, 0.024, 0.1], [0, 0, 0.1]);
  const set = { gear: gearOut(matte, metal) };
  BELT_CACHE.set(key, set);
  return set;
}

// Рация на левой лямке (разряд 5+): корпус, антенна, огонёк. Оси груди модели (сустав груди).
let RADIO = null;
export function radioGear() {
  if (RADIO) return RADIO;
  const g = geo();
  const matte = new Batch(), glow = new Batch();
  put(matte, g.box, 0x1f2226, [0, 0, 0], [0.048, 0.075, 0.026]);
  put(matte, g.box, 0x34383d, [0, -0.012, 0.014], [0.036, 0.03, 0.004]);
  put(matte, g.cyl8, 0x1f2226, [-0.012, 0.07, 0], [0.004, 0.07, 0.004]);
  put(glow, g.sphere, 0x6dff7d, [0.012, 0.03, 0.014], 0.004);
  RADIO = { gear: gearOut(matte, null), glow: out(glow) };
  return RADIO;
}

// Наплечник (разряд 6+): полукупол с окантовкой. Оси плеча модели.
const PAD_CACHE = new Map();
export function padGear(color, top) {
  const key = color + '|' + top;
  if (PAD_CACHE.has(key)) return PAD_CACHE.get(key);
  const g = geo();
  const matte = new Batch(), metal = new Batch();
  put(matte, g.half, color, [0, 0.012, 0], [0.072, 0.045, 0.07]);
  put(metal, g.band, top ? GOLD : 0xffd36b, [0, 0.014, 0], [0.073, 0.01, 0.071]);
  const set = { gear: gearOut(matte, metal) };
  PAD_CACHE.set(key, set);
  return set;
}

// Свечение под ногами старших разрядов (5+): мягкое кольцо на земле, аддитивно.
let AURA = null;
export function auraGeometry() {
  if (AURA) return AURA;
  AURA = new THREE.RingGeometry(0.22, 0.5, 40, 2);
  AURA.rotateX(-Math.PI / 2);
  const p = AURA.attributes.position, a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i));
    const k = Math.max(0, 1 - Math.abs(r - 0.33) / 0.17);
    a[i * 3] = a[i * 3 + 1] = a[i * 3 + 2] = k * k;
  }
  AURA.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return AURA;
}
