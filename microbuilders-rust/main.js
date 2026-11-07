// Прототип «MicroBuilders: Rust» на движке оригинала: запуск, качество, сцена, цикл кадра, отладка
// (?debug=1 → window.RustDebug). Игра — мир logic.js оригинала с его балансом и обвязкой из game.js
// (engine.js); здесь — его вид: здание деталями, как в Rust (building.js: фундамент, стены, окна, двери, колонны,
// перекрытия), карьеры и столы (yard.js), леса (scaffold.js),
// бригада (crew.js) и интерфейс оригинала (hud.js). Клетка логики — 2 м. ?level=N — начать уровень N.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTextures } from './textures.js?v=0c1cc5f';
import { createMaterials } from './materials.js?v=0c1cc5f';
import { createSky, createTerrain, splatMap, terrainMaterial, terrainMesh, mountains, linkSkyTree, createWear } from './world.js?v=0c1cc5f';
import { createPost } from './post.js?v=0c1cc5f';
import { createRender, DYNAMIC } from './render.js?v=0c1cc5f';
import { createGrass, createForest, createRocks } from './nature.js?v=0c1cc5f';
import { createWorkerFactory } from './people.js?v=0c1cc5f';
import { createAudio } from './audio.js?v=0c1cc5f';
import { createLife } from './life.js?v=0c1cc5f';
import { loadEngine, createEngine } from './engine.js?v=0c1cc5f';
import { createBuilding } from './building.js?v=0c1cc5f';
import { CELL, familyOf } from './families.js?v=0c1cc5f';
import { createYard } from './yard.js?v=0c1cc5f';
import { createScaffold } from './scaffold.js?v=0c1cc5f';
import { createCrew } from './crew.js?v=0c1cc5f';
import { createHud } from './hud.js?v=0c1cc5f';
import { createLights } from './props.js?v=0c1cc5f';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1' || params.has('capture');
// Файлы оригинала: в репозитории — корень ('../'), в сборке сайта — 'engine/' (index.html задаёт сам).
const ENGINE_BASE = window.MB_ENGINE_BASE || '../';
// Радиус поляны, м: перекур — в 10–20 клетках от здания, обед и сон — в 30–40 (logic.js →
// pickPerimeterCell), рабочие уходят туда пешком. Лес начинается за краем поляны.
const CLEAR = 120;
// Час неба, пока ночь не открыта (уровни 1–9 — всегда день, как в оригинале).
const DAY_HOUR = 10.5;

const loading = document.getElementById('loading');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
// время этапов загрузки (RustDebug.timings): где тратятся секунды старта
const TIMINGS = [];
let lastMark = performance.now();
function mark(name) { const now = performance.now(); TIMINGS.push([name, Math.round(now - lastMark)]); lastMark = now; }
function progress(t, text) {
  mark(text || String(t));
  if (loadingBar) loadingBar.style.width = Math.round(t * 100) + '%';
  if (text && loadingText) loadingText.textContent = text;
  return new Promise(function (r) { requestAnimationFrame(function () { r(); }); });
}

// ---------- качество ----------
// «Максимум» и «Ультра» — свой конвейер кадра (render.js): временное сглаживание вместо MSAA и суперсэмплинга,
// затенение углов по G-буферу. «Максимум»: тень солнца 8192 и дальний каскад 4096 (лес и холмы отбрасывают
// тени), объёмный свет (лучи солнца, конусы прожекторов), блик солнца, трава и лес гуще, тела рабочих мельче.
// ss — верхний предел разрешения счёта относительно экрана (динамическое разрешение не поднимает выше).
export const QUALITY = {
  max: { name: 'Максимум', tex: 2048, shadow: 8192, farShadow: 4096, spotShadow: 2048, ao: 1, aoSamples: 24, bloom: true, msaa: 0, taa: 1, ratio: 2, ss: 1, glass: 'physical', terrainDetail: 1, grass: 1.6, trees: 1.35, bodyCell: 0.009, volume: 1, flare: 1, clouds: 1, gi: 1, ssr: 1, mblur: 1 },
  ultra: { name: 'Ультра', tex: 2048, shadow: 4096, farShadow: 2048, spotShadow: 1024, ao: 1, bloom: true, msaa: 0, taa: 1, ratio: 2, ss: 1, glass: 'physical', terrainDetail: 1, grass: 1, trees: 1, bodyCell: 0.0125, clouds: 1, gi: 1, ssr: 1 },
  high: { name: 'Высокая', tex: 2048, shadow: 2048, spotShadow: 1024, ao: 0.5, bloom: true, msaa: 4, ratio: 1.5, glass: 'physical', terrainDetail: 1, grass: 0.45, trees: 0.7, bodyCell: 0.015 },
  phone: { name: 'Телефон', tex: 1024, shadow: 1024, spotShadow: 0, ao: 0, bloom: false, msaa: 0, ratio: 1.5, glass: 'simple', terrainDetail: 0, grass: 0.12, trees: 0.45, bodyCell: 0.02, farForest: 0 },
};
const ORDER = ['max', 'ultra', 'high', 'phone'];
const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
let stored = null;
try { stored = localStorage.getItem('rust.quality'); } catch (e) { stored = null; }
const qualityKey = QUALITY[params.get('quality')] ? params.get('quality') : QUALITY[stored] ? stored : (coarse ? 'phone' : 'max');
const quality = Object.assign({}, QUALITY[qualityKey]);
// ?ao=0&bloom=0&grass=0&trees=0&msaa=0 — выключатели для отладки картинки
['ao', 'bloom', 'grass', 'trees', 'msaa', 'volume', 'flare', 'ss', 'taa', 'clouds', 'gi', 'ssr', 'mblur'].forEach(function (k) { if (params.has(k)) quality[k] = k === 'bloom' ? params.get(k) !== '0' : Number(params.get(k)); });

// ---------- рендерер ----------
// Только WebGL2: на занятой видеокарте Chrome иногда не создаёт контекст с первого раза — тогда три сам
// уходит в WebGL1, где не собираются шейдеры скелета. Контекст создаём сами, с повторами на новом холсте.
let canvas = document.getElementById('view');
let renderer, camera, controls;
const exposureGain = Number(params.get('exposure')) || 1.0;
const scene = new THREE.Scene();

async function createRenderer() {
  let gl = null;
  for (let attempt = 0; attempt < 8 && !gl; attempt++) {
    if (attempt > 0) {
      await new Promise(function (r) { setTimeout(r, 500 + attempt * 400); });
      const fresh = canvas.cloneNode(false);
      canvas.replaceWith(fresh);
      canvas = fresh;
    }
    gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false, depth: true });
  }
  if (!gl) throw new Error('видеокарта не дала WebGL2 — перезагрузите страницу');
  renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, stencil: false });
  renderer.setPixelRatio(basePR());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 0.45 * exposureGain;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.15, 4000);
  camera.position.set(22, 11, 26);
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.5;
  controls.maxDistance = 140;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 2, 0);
  controls.screenSpacePanning = false;
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
  canvas.addEventListener('webglcontextrestored', function () { if (textures) textures.repaint(); if (sky) sky.state.envDirty = true; });
}

const state = {
  hour: DAY_HOUR,
  // ?hour=… или RustDebug.time(…) — час неба вручную (иначе — часы логики)
  fixedHour: params.has('hour') ? Number(params.get('hour')) : null,
  time: 0,
  tempo: 1,
  ready: false,
  manual: false,
  frames: 0,
  quality: qualityKey,
  // жадный покупатель на каждом кадре (проверки до сдачи)
  greedy: false,
};

let E = null, hud = null;
let sky, post, textures, mats, terrain, splat, grass, factory, wear, life;
let house, yard, scaffold, crew, lights = null, viewGroups = [];
const audio = createAudio();
// браузер даёт звук только после касания или нажатия
['pointerdown', 'keydown'].forEach(function (e) { window.addEventListener(e, function () { audio.start(); }, { passive: true }); });
// Съёмка: камера за рабочим (follow) или облёт (orbit); задаёт отладка, считается в шаге кадра.
let follow = null, orbit = null;
const _cam = new THREE.Vector3(), _tgt = new THREE.Vector3(), _ray = new THREE.Vector3();
const camRay = new THREE.Raycaster();
function directCamera(dt) {
  if (follow && crew) {
    const w = crew.figure(follow.i);
    if (!w) return;
    follow.angle += (follow.spin || 0) * dt;
    const a = w.heading + follow.angle;
    _cam.set(w.pos.x + Math.sin(a) * follow.dist, w.pos.y + follow.height, w.pos.z + Math.cos(a) * follow.dist);
    _tgt.set(w.pos.x, w.pos.y + follow.look, w.pos.z);
    // камера не уходит за стену и под перекрытие: луч от рабочего к камере, у первой детали — ближе
    _ray.subVectors(_cam, _tgt);
    const len = _ray.length();
    if (len > 1e-3 && house) {
      camRay.set(_tgt, _ray.divideScalar(len));
      camRay.far = len;
      const hit = camRay.intersectObject(house.group, true).find(function (h) { return h.object.isMesh; });
      if (hit) _cam.copy(_tgt).addScaledVector(_ray, Math.max(0.45, hit.distance - 0.3));
    }
    const k = follow.snap ? 1 : 1 - Math.exp(-dt * (follow.smooth || 2.5));
    follow.snap = false;
    camera.position.lerp(_cam, k);
    controls.target.lerp(_tgt, k);
  } else if (orbit) {
    orbit.angle += orbit.speed * dt;
    camera.position.set(orbit.center[0] + Math.sin(orbit.angle) * orbit.radius, orbit.height, orbit.center[2] + Math.cos(orbit.angle) * orbit.radius);
    controls.target.set(orbit.center[0], orbit.center[1], orbit.center[2]);
  }
}

// ---------- площадка уровня ----------
// Габариты здания в метрах (footprint логики — в клетках; куб x занимает [2x, 2x + 2]).
function siteBounds() {
  const fp = E.world.level.footprint;
  return { x0: fp.minX * CELL, x1: (fp.maxX + 1) * CELL, z0: fp.minZ * CELL, z1: (fp.maxZ + 1) * CELL, h: (fp.maxY + 1) * CELL };
}
// Столы планирования (дома рабочих): середина — «двор» площадки.
function yardCenter() {
  let x = 0, z = 0, n = 0;
  E.world.builders.forEach(function (b) {
    if (b.trade === 'engineer' || !b.homeCell) return;
    x += (b.homeCell[0] + 0.5) * CELL; z += (b.homeCell[2] + 0.5) * CELL; n++;
  });
  if (n) return [x / n, z / n];
  const b = siteBounds();
  return [(b.x0 + b.x1) / 2, b.z1 + 12];
}
// Покрытие земли: утоптанная глина вокруг здания, щебень под карьерами и у столов, дорога со двора в лес.
function layoutOf() {
  const b = siteBounds();
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const spots = E.world.level.mines.map(function (mine) {
    let sx = 0, sz = 0;
    mine.rocks.forEach(function (r) { sx += r.x + 0.5; sz += r.z + 0.5; });
    return [sx / mine.rocks.length * CELL, sz / mine.rocks.length * CELL, 6.5];
  });
  const y = yardCenter();
  spots.push([y[0], y[1], 5]);
  return {
    site: { x: cx, z: cz, rx: (b.x1 - b.x0) / 2 + 7, rz: (b.z1 - b.z0) / 2 + 7 },
    yard: { x: y[0], z: y[1], rx: 6, rz: 4.5 },
    spots: spots,
    roads: [[[y[0], y[1] + 3], [y[0] + 30, y[1] + 175], 3.4]],
  };
}

function disposeGroup(g) {
  const seen = new Set();
  g.traverse(function (o) {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    if (o.isInstancedMesh) o.dispose();
  });
}

// Новый заказ (старт, следующий, заново, восстановление): покрытие, трава, здание, двор, бригада, свет.
// start — показать карточку старта заказа (при запуске страницы; дальше её показывает интерфейс).
let builtLevel = null;
function buildLevel(start) {
  const world = E.world;
  if (builtLevel !== null) {
    splat.relayout(layoutOf());
    if (grass) { scene.remove(grass.group); disposeGroup(grass.group); }
    grass = createGrass(terrain, splat, [0, 0], quality.grass, 3, wear, CLEAR);
    linkSkyTree(grass.group);
    scene.add(grass.group);
    wear.fade(0);
    if (post && post.gi) post.gi.setGround(terrain, splat);
  }
  builtLevel = E.campaign.levelIndex;
  // мачты света — с открытием ночи (10-й уровень)
  if (lights) { scene.remove(lights.group); disposeGroup(lights.group); lights = null; }
  if (E.MB.needOpen(E.campaign, 'night')) {
    lights = createLights(siteBounds(), mats, { shadowSize: quality.spotShadow });
    linkSkyTree(lights.group);
    scene.add(lights.group);
  }
  house.build(world);
  yard.build(world);
  scaffold.build(world);
  crew.build(world);
  celebrate = null;
  follow = null; orbit = null; watch = null;
  focusGI();
  fitShadow();
  frameCamera(true);
  if (hud) {
    hud.dirty();
    hud.paint();
    if (start) hud.showStart();
  }
}

// объём отражённого света — над зданием, воксель по его размеру
function focusGI() {
  if (!post || !post.gi) return;
  const b = siteBounds();
  const span = Math.max(b.x1 - b.x0, b.z1 - b.z0) + 16;
  post.gi.setExtent(Math.max(40 / 128, span / 128, (b.h + 4) / 48));
  post.gi.setCenter((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
}
let shadowRadius = 26;
function fitShadow() {
  const b = siteBounds();
  shadowRadius = THREE.MathUtils.clamp(Math.max(b.x1 - b.x0, b.z1 - b.z0) * 0.75 + b.h * 0.5 + 10, 26, 70);
  if (sky) sky.fitShadow(controls.target, shadowRadius);
}

// Вид не сдвигает случайность игры: logic.js и meta.js берут Math.random, а вид (uuid объектов three.js,
// частицы, звук) на время своей работы — свой генератор. Иначе постройка вида меняла бы ход стройки.
const viewRandom = mulberry32(20261107);
function asView(fn) {
  const game = Math.random;
  Math.random = viewRandom;
  try { return fn(); } finally { Math.random = game; }
}

// Отклик вида на события мира (экономика уже посчитана в engine.js, интерфейс подписан сам).
function onWorld(event) { asView(function () { react(event); }); }
// События для звука ролика (RustDebug.record / drain): укладка — с семейством материала и местом, м.
const recorded = { on: false, list: [] };
const SOUND_KIND = { wood: 'planks', metal: 'plates' };
function react(event) {
  // карточку старта показывает интерфейс сам (он подписан раньше)
  if (event.type === 'siteStart') { buildLevel(false); return; }
  // укладка — звук своего материала: камень и кирпич — мастерок и стук, брус — молоток, сталь — заклёпки
  if (event.type === 'pour' && event.block) {
    const b = event.block;
    const family = familyOf(E.MB, b.materialId);
    _p.set((b.x + 0.5) * CELL, (b.y + 0.5) * CELL, (b.z + 0.5) * CELL);
    audio.play(family === 'wood' ? 'hammer' : family === 'metal' ? 'screw' : 'lay', family === 'metal' ? 'plates' : 'stones', _p, camera);
    if (recorded.on) recorded.list.push({ type: 'place', kind: SOUND_KIND[family] || 'stones', pos: [_p.x, _p.y, _p.z].map(function (v) { return Math.round(v * 100) / 100; }) });
  }
  if (event.type === 'complete') {
    audio.complete();
    if (!state.manual) celebrate = { t: 0 };
    if (post && post.gi) post.gi.markDirty();
  }
  if (event.type === 'scaffold' || event.type === 'strip' || event.type === 'scaffoldWear') scaffoldClock = 99;
}

// ---------- запуск ----------
async function boot() {
  await progress(0.01, 'Видеокарта…');
  await createRenderer();
  await progress(0.02, 'Движок игры…');
  const engine = await loadEngine(THREE, ENGINE_BASE);
  E = createEngine(Object.assign({ groups: window.MicroBuildersUpgradeGroups }, engine));
  E.boot();
  // ?level=N — заказ N заново (проверки, ролик)
  if (params.has('level')) E.start(Number(params.get('level')) - 1);
  await progress(0.03, 'Готовим фактуры…');
  textures = createTextures(renderer, { size: quality.tex });
  const names = textures.names;
  for (let i = 0; i < names.length; i++) {
    textures.get(names[i]);
    await progress(0.05 + (0.5 * (i + 1)) / names.length, 'Фактуры: ' + (i + 1) + ' из ' + names.length);
  }
  mats = createMaterials(textures, quality);

  await progress(0.58, 'Рельеф и небо…');
  sky = createSky(renderer, scene, quality);
  terrain = createTerrain(7, CLEAR);
  splat = splatMap(terrain, layoutOf(), 640, 320);
  wear = createWear(128, 512);
  scene.add(terrainMesh(terrain, terrainMaterial(textures, splat, quality, wear)));
  scene.add(mountains(7, terrain));
  await progress(0.64, 'Трава и лес…');
  // лес раньше травы: кроны пишут подстилку в карту луга, трава под ними не растёт
  scene.add(createForest(terrain, splat, mats, quality.trees, quality.msaa, 11, quality.farForest === 0 ? null : renderer, !!quality.taa, CLEAR).group);
  grass = createGrass(terrain, splat, [0, 0], quality.grass, 3, wear, CLEAR);
  scene.add(grass.group);
  scene.add(createRocks(terrain, splat, mats, 21, CLEAR).group);

  await progress(0.7, 'Рабочие…');
  factory = createWorkerFactory(quality);
  await factory.ready;
  await progress(0.8, 'Стройка…');
  house = createBuilding({ E, mats, onChange: function () { if (post && post.gi) post.gi.markDirty(); } });
  yard = createYard({ E, mats });
  scaffold = createScaffold({ E, mats });
  crew = createCrew({ E, factory, mats, wear });
  scene.add(house.group, yard.group, scaffold.group, crew.group);
  viewGroups = [house.group, yard.group, scaffold.group, crew.group];
  hud = createHud(E, {
    getTempo: function () { return state.tempo; },
    setTempo: function (t) { state.tempo = t; },
    project: project,
    onNext: function () { E.next(); },
    onRestart: function () { E.restart(); },
    onLevel: function (i) { E.start(i); },
    toggleSound: function () { return audio.setEnabled(!audio.enabled()); },
    soundOn: function () { return audio.enabled(); },
    cycleQuality: function () {
      const next = ORDER[(ORDER.indexOf(state.quality) + 1) % ORDER.length];
      try { localStorage.setItem('rust.quality', next); } catch (e) { /* без хранилища — только этот запуск */ }
      E.save();
      const q = new URLSearchParams(location.search);
      q.delete('quality');
      q.delete('level');
      location.search = q.toString();
    },
    qualityName: function () { return QUALITY[state.quality].name; },
  });
  E.on(onWorld);
  buildLevel(!E.campaign.levelElapsed);
  bindPlayerCamera();

  // погода и живность: дождь, пыль, мошкара, птицы
  life = createLife(scene, quality, { camera, weather: params.get('weather') });
  await progress(0.92, 'Свет…');
  const postOpts = { sky, lights: function () { return lights ? lights.lights : []; } };
  post = quality.taa ? createRender(renderer, scene, camera, quality, postOpts) : createPost(renderer, scene, camera, quality, postOpts);
  applySize();
  // отражённый свет: здание, леса, двор и рельеф (рабочие — нет)
  if (post.gi) {
    post.gi.setGround(terrain, splat);
    post.gi.bind({ roots: function () { return [house.group, yard.group, scaffold.group]; }, exclude: DYNAMIC });
    focusGI();
  }
  state.hour = viewHour();
  sky.update(state.hour, 0, controls.target);
  fitShadow();
  linkSkyTree(scene);
  mark('свет и G-буфер');
  if (post.compile) post.compile(); else renderer.compile(scene, camera);
  mark('сборка шейдеров');
  await progress(1, '');
  if (loading) loading.classList.add('hidden');
  state.ready = true;
  if (window.RustDebug) window.RustDebug.ready = true;
  requestAnimationFrame(frame);
}

// Час неба: до открытия ночи — день (как в оригинале), с 10-го уровня — часы логики (120 с на час).
function viewHour() {
  if (state.fixedHour !== null) return state.fixedHour;
  const c = E.campaign;
  if (!c || !E.MB.needOpen(c, 'night')) return DAY_HOUR;
  return window.MicroBuildersSim.dayClock(c.levelElapsed + (c.awayElapsed || 0)).hour;
}
// Погода логики (название из balance.json → weather.kinds) → небо и частицы прототипа.
const WEATHER_MODE = { 'Дождь': 'rain', 'Шторм': 'rain', 'Снег': 'snow' };
let weatherShown = null;
function syncWeather() {
  if (!life || params.has('weather')) return;
  const mode = WEATHER_MODE[E.environment && E.environment.weather] || 'clear';
  if (mode === weatherShown) return;
  life.force(mode, weatherShown === null);
  weatherShown = mode;
}

// Экранная точка над клеткой логики (всплывающие монеты интерфейса).
const _p = new THREE.Vector3();
function project(x, y, z) {
  _p.set((x + 0.5) * CELL, (y + 1) * CELL, (z + 0.5) * CELL).project(camera);
  return { x: ((_p.x + 1) / 2) * window.innerWidth, y: ((1 - _p.y) / 2) * window.innerHeight, visible: _p.z < 1 && Math.abs(_p.x) < 1.1 && Math.abs(_p.y) < 1.1 };
}

// сдача объекта: камера медленно облетает готовое здание, пока игрок не возьмёт камеру
let celebrate = null;
const _c = new THREE.Vector3();
function celebrateCamera(dt) {
  const b = siteBounds();
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const size = Math.max(b.x1 - b.x0, b.z1 - b.z0) + b.h * 0.6;
  if (celebrate.t === 0) celebrate.angle = Math.atan2(camera.position.x - cx, camera.position.z - cz);
  celebrate.t += dt;
  celebrate.angle += dt * 0.14;
  const R = size * 1.3 + 8, k = 1 - Math.exp(-dt * 1.2);
  _c.set(cx + Math.sin(celebrate.angle) * R, 3 + size * 0.5, cz + Math.cos(celebrate.angle) * R);
  camera.position.lerp(_c, k);
  controls.target.lerp(_c.set(cx, b.h * 0.4, cz), k);
}

// ---------- камера игрока ----------
// Щелчок по рабочему — камера идёт за ним (вращать её можно как обычно), Esc или щелчок мимо — отпустить.
// WASD / стрелки — сдвиг по земле, H — снова к зданию.
const keys = new Set();
let watch = null;
function workerAt(x, y) {
  let best = -1, bestD = 46;
  crew.views().forEach(function (v, i) {
    if (!v || !v.w.group.visible) return;
    _p.copy(v.w.pos); _p.y += 1.0;
    _p.project(camera);
    if (_p.z > 1) return;
    const d = Math.hypot(((_p.x + 1) / 2) * window.innerWidth - x, ((1 - _p.y) / 2) * window.innerHeight - y);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}
let press = null;
function bindPlayerCamera() {
  canvas.addEventListener('pointerdown', function (e) { press = { x: e.clientX, y: e.clientY, t: performance.now() }; celebrate = null; });
  canvas.addEventListener('wheel', function () { celebrate = null; }, { passive: true });
  canvas.addEventListener('pointerup', function (e) {
    if (!press) return;
    const click = Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6 && performance.now() - press.t < 350;
    press = null;
    if (!click) return;
    const i = workerAt(e.clientX, e.clientY);
    watch = i >= 0 ? { i } : null;
  });
  window.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    keys.add(e.code);
    if (e.code === 'Escape') watch = null;
    if (e.code === 'KeyH') { watch = null; frameCamera(true); }
  });
  window.addEventListener('keyup', function (e) { keys.delete(e.code); });
  window.addEventListener('blur', function () { keys.clear(); });
}
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _m = new THREE.Vector3();
function playerCamera(dt) {
  if (celebrate) { celebrateCamera(dt); return; }
  // сдвиг клавишами — по земле, быстрее издалека
  const fw = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const rt = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  if (fw || rt) {
    watch = null;
    _f.subVectors(controls.target, camera.position); _f.y = 0; _f.normalize();
    _r.crossVectors(_f, camera.up).normalize();
    const sp = camera.position.distanceTo(controls.target) * 0.9 * dt;
    _m.copy(_f).multiplyScalar(fw * sp).addScaledVector(_r, rt * sp);
    controls.target.add(_m); camera.position.add(_m);
  }
  if (watch) {
    const w = crew.figure(watch.i);
    if (!w) { watch = null; return; }
    _m.set(w.pos.x, w.pos.y + 1.1, w.pos.z).sub(controls.target).multiplyScalar(1 - Math.exp(-dt * 4));
    controls.target.add(_m); camera.position.add(_m);
  }
}

// Камера к зданию: всё здание и ближние карьеры в кадре; узкий экран (телефон стоя) — дальше.
function frameCamera(snap) {
  const b = siteBounds();
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const size = Math.max(b.x1 - b.x0, b.z1 - b.z0) + b.h * 0.6;
  controls.target.set(cx, Math.min(b.h * 0.4, 8), cz);
  const k = camera.aspect < 1 ? Math.min(2.2, 0.85 / camera.aspect) : 1;
  if (snap) camera.position.set(cx + (size * 0.7 + 6) * k, 2 + size * 0.45 * k, cz + (size * 0.85 + 8) * k);
  controls.maxDistance = Math.max(140, size * 4);
  controls.update();
}

// ---------- динамическое разрешение ----------
// Меньше 50 кадров в секунду два окна по 2 с — холст считается в меньшем разрешении (до 0,55 по стороне),
// больше 85 — возвращается к полному. Картинку дотягивает резкость в последнем проходе.
const dyn = { scale: 1, t: -4, frames: 0, cool: 0, enabled: !params.has('fixedres') };
// плотность пикселей холста — по экрану, не больше quality.ratio. Со своим сглаживанием (TAA) разрешение счёта
// задаёт render.js; без него ?ss=1.5 включает суперсэмплинг (кроме больших экранов)
function basePR() {
  const pr = Math.min(window.devicePixelRatio || 1, quality.ratio);
  // своё сглаживание: холст — по экрану, разрешение счёта задаёт render.js
  if (quality.taa) return pr;
  // на больших экранах (от ~4,5 млн пикселей, например 4K) суперсэмплинг не нужен
  const big = window.innerWidth * window.innerHeight * pr * pr > 4.5e6;
  return Math.min(pr * (big ? 1 : quality.ss || 1), Math.max(2, pr));
}
function applySize() {
  if (!post) return;
  if (post.taa) post.setSize(window.innerWidth, window.innerHeight, basePR(), dyn.scale * (quality.ss || 1));
  else post.setSize(window.innerWidth, window.innerHeight, basePR() * dyn.scale);
}
function watchFrame(dt) {
  if (!dyn.enabled || state.manual) return;
  dyn.t += dt; dyn.frames++; dyn.cool -= dt;
  if (dyn.t < 2) return;
  const fps = dyn.frames / dyn.t;
  dyn.t = 0; dyn.frames = 0;
  let next = dyn.scale;
  // «Максимум» держит 60 кадров: суперсэмплинг уступает раньше
  const strict = qualityKey === 'max';
  const low = strict ? 56 : 50, high = strict ? 80 : 85;
  if (fps < low && dyn.scale > 0.55) next = Math.max(0.55, dyn.scale * 0.86);
  else if (fps > high && dyn.scale < 1 && dyn.cool <= 0) next = Math.min(1, dyn.scale * 1.1);
  if (next !== dyn.scale) { dyn.scale = next; dyn.cool = 6; applySize(); }
}

// ---------- кадр ----------
let last = performance.now();
let hudClock = 0, scaffoldClock = 0;
// Ход мира: логика оригинала (engine.js), затем её вид. dt — реальные секунды кадра.
function advance(dt) {
  if (state.greedy) E.greedy();
  E.step(dt, state.tempo, true);
  asView(function () {
    house.update();
    yard.update();
    scaffoldClock += dt;
    if (scaffoldClock > 0.1) { scaffoldClock = 0; if (scaffold.update() && post && post.gi) post.gi.markDirty(); }
    crew.update(dt, state.time, state.tempo);
    // новые меши вида — сразу с небом и G-буфером (иначе кадр-другой их не видно)
    viewGroups.forEach(linkSkyTree);
  });
}
function step(dt) {
  state.time += dt;
  advance(dt);
  asView(function () { view(dt); });
}
function view(dt) {
  state.hour = viewHour();
  syncWeather();
  // запасной ход: материалы, созданные по ходу игры мимо фабрик, тоже получают тень облаков
  if ((state.frames & 63) === 0) linkSkyTree(scene);
  directCamera(dt);
  if (!follow && !orbit && !state.manual) playerCamera(dt);
  controls.update();
  sky.follow(camera);
  sky.update(state.hour, state.time, controls.target);
  if (lights) lights.night(sky.state.night);
  house.ghostLight(sky.state.night);
  grass.update(state.time);
  wear.update(dt);
  const sim = Math.min(0.25, dt * state.tempo);
  if (life) life.update(dt, sim, state.time, state.hour, sky, crew.views().filter(Boolean).map(function (v) { return v.w; }), lights ? lights.lights : []);
  audio.update(dt, sky.state.night, life ? life.state().rain : 0);
  renderer.toneMappingExposure = sky.state.exposure * exposureGain;
  hud.tick(dt);
  hudClock += dt;
  if (hudClock >= 0.25) { hudClock = 0; hud.paint(true); }
}

function frame(now) {
  if (state.manual) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  step(dt);
  renderer.info.reset();
  asView(function () { post.render(state.time); });
  state.frames++;
  watchFrame(dt);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', function () {
  if (!camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  applySize();
});
// сохранение площадки при уходе со страницы (раз в 5 с — в engine.js)
window.addEventListener('pagehide', function () { if (E) E.save(); });
document.addEventListener('visibilitychange', function () { if (E && document.visibilityState === 'hidden') E.save(); });

// ---------- отладка ----------
if (DEBUG) {
  window.RustDebug = {
    ready: false,
    timings: function () { return TIMINGS; },
    weather: function (mode, instant) { if (life && mode !== undefined) { life.force(mode, instant); weatherShown = mode; } return life ? life.state() : null; },
    state: function () {
      const w = E.world, c = E.campaign;
      return { ready: state.ready, hour: Math.round(state.hour * 100) / 100, quality: state.quality, frames: state.frames, tempo: state.tempo, scale: Math.round(dyn.scale * 100) / 100,
        calls: renderer.info.render.calls, tris: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries,
        level: c.levelIndex + 1, name: w.level.name, status: c.status, elapsed: Math.round(c.levelElapsed),
        progress: Math.round((1 - w.remaining / w.blocks.length) * 1000) / 1000, blocks: w.blocks.length,
        coins: Math.round(c.coins), capital: Math.round(E.meta.capital), done: c.status === 'complete', chests: E.chestsReady.slice(),
        weather: E.environment ? E.environment.weather || '' : '', night: !!(E.environment && E.environment.night),
        workers: w.builders.map(function (b) { return b.phase + (b.walkPurpose && b.phase === 'walk' ? ':' + b.walkPurpose : ''); }) };
    },
    // час неба вручную; null — снова часы логики
    time: function (h) { state.fixedHour = h === null || h === undefined ? null : h; state.hour = viewHour(); sky.update(state.hour, state.time, controls.target); return state.hour; },
    // false — снова часы логики (true оставляет заданный час)
    fixHour: function (on) { if (!on) state.fixedHour = null; return state.fixedHour !== null; },
    // стройка до доли готовых кубов по ходу логики (жадный покупатель, ×20, без отрисовки)
    jump: function (f) {
      for (let guard = 0; guard < 20000 && E.campaign.status === 'play' && 1 - E.world.remaining / E.world.blocks.length < f; guard++) { E.greedy(); E.step(0.05, 20, true); }
      asView(function () { house.update(); yard.update(); scaffold.update(); crew.update(0, state.time, 20); });
      if (post && post.gi) post.gi.markDirty();
      return Math.round((1 - E.world.remaining / E.world.blocks.length) * 1000) / 1000;
    },
    record: function (on) { recorded.on = !!on; recorded.list.length = 0; return recorded.on; },
    drain: function () {
      const list = recorded.list.splice(0);
      return { events: list, cam: camera.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }), hour: state.hour, night: sky.state.night };
    },
    tempo: function (t) { state.tempo = t; return t; },
    greedy: function (on) { state.greedy = !!on; return state.greedy; },
    view: function (pos, target) { camera.position.fromArray(pos); controls.target.fromArray(target); controls.update(); return true; },
    manual: function (on) { state.manual = !!on; if (!on) { last = performance.now(); requestAnimationFrame(frame); } return state.manual; },
    frame: function (dt) { step(dt); renderer.info.reset(); asView(function () { post.render(state.time); }); state.frames++; return state.frames; },
    // n шагов без отрисовки (стройка до сдачи)
    simulate: function (n, dt) { for (let i = 0; i < n; i++) { state.time += dt; advance(dt); } hud.paint(); return state.frames; },
    engine: function () { return E; },
    level: function (n) { E.start(n - 1); return E.campaign.levelIndex + 1; },
    next: function () { return E.next(); },
    coins: function (n) { E.campaign.coins = n; hud.dirty(); hud.paint(); return n; },
    buy: function (k) { const ok = E.buy(k); hud.dirty(); hud.paint(); return ok; },
    // Эталонный прогон движка без вида (сверка с tools/runs/rust/engine-run.js): то же зерно Math.random,
    // тот же шаг и жадный покупатель. Площадка после него — последний уровень прогона.
    engineRun: function (o) {
      o = Object.assign({ from: 0, to: 0, seed: 7, tempo: 20, fps: 60 }, o || {});
      const random = Math.random;
      Math.random = mulberry32(o.seed);
      const rows = [];
      try {
        E.start(o.from);
        for (let level = o.from; level <= o.to; level++) {
          if (E.campaign.levelIndex !== level) E.start(level);
          const c = E.campaign, w = E.world;
          const capital0 = E.meta.capital;
          let frames = 0;
          const limit = 6 * 3600 * o.fps / o.tempo;
          while (c.status === 'play' && frames < limit) { E.greedy(); E.step(1 / o.fps, o.tempo, true); frames++; }
          rows.push({ level: level + 1, status: c.status, minutes: Math.round(c.levelElapsed / 6) / 10, coins: Math.round(c.coinsEarned || 0),
            capital: Math.round(E.meta.capital - capital0), workers: w.builders.length, buys: (c.buyLog || []).length, auto: E.stats.autoCompleted });
        }
      } finally { Math.random = random; }
      return rows;
    },
    worker: function (i) {
      const v = crew.views()[i];
      if (!v) return null;
      const b = v.builder;
      return { pos: v.w.pos.toArray(), phase: b.phase, purpose: b.walkPurpose, carry: b.carry.length, action: v.w.anim.action, cell: b.cell.slice() };
    },
    camera: function () { return { pos: camera.position.toArray(), target: controls.target.toArray() }; },
    home: function () { follow = null; orbit = null; frameCamera(true); return { pos: camera.position.toArray(), target: controls.target.toArray() }; },
    // контур здания и центр двора, м (кадры снимков)
    layout: function () { const b = siteBounds(), y = yardCenter(); return { x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1, h: b.h, yx: y[0], yz: y[1] }; },
    renderer: function () { return renderer; },
    three: function () { return THREE; },
    sky: function () { return sky; },
    gpu: function () { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); },
    scene: function () { return scene; },
    post: function () { return post; },
    house: function () { return house; },
    hud: function (on) { document.body.classList.toggle('rust-shot', !on); return !!on; },
    follow: function (opts) { follow = opts ? Object.assign({ angle: 0.9, dist: 3.4, height: 1.6, look: 1.1, snap: true }, opts) : null; orbit = null; return !!follow; },
    orbit: function (opts) { orbit = opts || null; follow = null; return !!orbit; },
    // рабочий за делом: фаза логики (или 'walk:назначение'), с ношей, на лестнице, без соседей ближе clear м
    pickWorker: function (phase, carry, ladder, clear) {
      const list = crew.views();
      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        if (!v || !v.w.group.visible) continue;
        const b = v.builder;
        const name = b.phase + (b.phase === 'walk' && b.walkPurpose ? ':' + b.walkPurpose : '');
        if (phase && name !== phase && b.phase !== phase) continue;
        if (carry && !b.carry.length) continue;
        if (ladder !== undefined && ladder !== null && (v.w.anim.action === 'climb') !== ladder) continue;
        if (clear && list.some(function (o) { return o && o !== v && o.w.pos.distanceTo(v.w.pos) < clear; })) continue;
        return i;
      }
      return -1;
    },
    completeShown: function () { return !!document.querySelector('#overlay-root .overlay.open, #overlay-root .overlay:not([hidden])'); },
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

boot().catch(function (e) {
  console.error(e);
  if (loadingText) loadingText.textContent = 'Ошибка запуска: ' + (e && e.message ? e.message : e);
});
