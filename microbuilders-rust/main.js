// Прототип «MicroBuilders: Rust»: запуск, качество, сцена, цикл кадра, отладка (?dev=1 → window.RustDebug).
// ?scene=showroom — все детали во всех уровнях; иначе — стройка с рабочими.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTextures } from './textures.js?v=3ae8fc6';
import { createMaterials, ROOMS } from './materials.js?v=3ae8fc6';
import { createSky, createTerrain, splatMap, terrainMaterial, terrainMesh, mountains } from './world.js?v=3ae8fc6';
import { createPost } from './post.js?v=3ae8fc6';
import { createGrass, createForest, createRocks } from './nature.js?v=3ae8fc6';
import { buildPiece, TIERS } from './pieces.js?v=3ae8fc6';
import { planBuilding } from './blueprints.js?v=3ae8fc6';
import { createWorkerFactory } from './people.js?v=3ae8fc6';
import { createSite } from './site.js?v=3ae8fc6';
import { createUI } from './ui.js?v=3ae8fc6';

const params = new URLSearchParams(location.search);
const loading = document.getElementById('loading');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
function progress(t, text) {
  if (loadingBar) loadingBar.style.width = Math.round(t * 100) + '%';
  if (text && loadingText) loadingText.textContent = text;
  return new Promise(function (r) { requestAnimationFrame(function () { r(); }); });
}

// ---------- качество ----------
export const QUALITY = {
  ultra: { name: 'Ультра', tex: 2048, shadow: 4096, ao: 1, bloom: true, msaa: 4, ratio: 2, glass: 'physical', terrainDetail: 1, grass: 1, trees: 1, bodyCell: 0.0125 },
  high: { name: 'Высокая', tex: 2048, shadow: 2048, ao: 0.5, bloom: true, msaa: 4, ratio: 1.5, glass: 'physical', terrainDetail: 1, grass: 0.45, trees: 0.7, bodyCell: 0.015 },
  phone: { name: 'Телефон', tex: 1024, shadow: 1024, ao: 0, bloom: false, msaa: 0, ratio: 1.5, glass: 'simple', terrainDetail: 0, grass: 0.12, trees: 0.45, bodyCell: 0.02 },
};
const ORDER = ['ultra', 'high', 'phone'];
const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
let stored = null;
try { stored = localStorage.getItem('rust.quality'); } catch (e) { stored = null; }
const qualityKey = QUALITY[params.get('quality')] ? params.get('quality') : QUALITY[stored] ? stored : (coarse ? 'phone' : 'ultra');
const quality = Object.assign({}, QUALITY[qualityKey]);
// ?ao=0&bloom=0&grass=0&trees=0&msaa=0 — выключатели для отладки картинки
['ao', 'bloom', 'grass', 'trees', 'msaa'].forEach(function (k) { if (params.has(k)) quality[k] = k === 'bloom' ? params.get(k) !== '0' : Number(params.get(k)); });

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.ratio));
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
  hour: params.has('hour') ? Number(params.get('hour')) : 8.6,
  time: 0,
  tempo: 1,
  ready: false,
  manual: false,
  frames: 0,
  quality: qualityKey,
  scene: params.get('scene') || 'game',
  fixedHour: params.has('hour'),
};

let sky, post, textures, mats, terrain, view, grass, site, ui, factory;
// Съёмка: камера за рабочим (follow) или облёт (orbit); задаёт отладка, считается в шаге кадра.
let follow = null, orbit = null;
const _cam = new THREE.Vector3(), _tgt = new THREE.Vector3();
function directCamera(dt) {
  if (follow && site) {
    const w = site.S.workers[follow.i];
    if (!w) return;
    follow.angle += (follow.spin || 0) * dt;
    const a = w.heading + follow.angle;
    _cam.set(w.pos.x + Math.sin(a) * follow.dist, w.pos.y + follow.height, w.pos.z + Math.cos(a) * follow.dist);
    _tgt.set(w.pos.x, w.pos.y + follow.look, w.pos.z);
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

async function boot() {
  await progress(0.01, 'Видеокарта…');
  await createRenderer();
  await progress(0.02, 'Готовим фактуры…');
  textures = createTextures(renderer, { size: quality.tex });
  const names = textures.names;
  for (let i = 0; i < names.length; i++) {
    textures.get(names[i]);
    await progress(0.05 + (0.5 * (i + 1)) / names.length, 'Фактуры: ' + (i + 1) + ' из ' + names.length);
  }
  mats = createMaterials(textures, quality);

  await progress(0.58, 'Рельеф и небо…');
  sky = createSky(renderer, scene, quality);
  const showroom = state.scene === 'showroom';
  terrain = createTerrain(7, showroom ? 40 : 34);
  const layout = showroom
    ? { site: { x: 0, z: 0, rx: 34, rz: 14 }, yard: { x: 0, z: 14, rx: 30, rz: 6 }, roads: [[[0, 16], [0, 120], 3.2]] }
    : { site: { x: 1.5, z: 1.5, rx: 13, rz: 11 }, yard: { x: 10.5, z: 9.5, rx: 11, rz: 7 }, roads: [[[13, 12], [70, 150], 3.4]] };
  const splat = splatMap(terrain, layout);
  scene.add(terrainMesh(terrain, terrainMaterial(textures, splat, quality)));
  scene.add(mountains(7));
  await progress(0.64, 'Трава и лес…');
  grass = createGrass(terrain, splat, [0, 0], quality.grass);
  scene.add(grass.group);
  scene.add(createForest(terrain, splat, mats, quality.trees, quality.msaa).group);
  scene.add(createRocks(terrain, splat, mats).group);

  if (showroom) {
    await progress(0.72, 'Чертежи…');
    view = buildShowroom();
    scene.add(view.group);
    setRooms(view.views);
  } else {
    await progress(0.7, 'Рабочие…');
    factory = createWorkerFactory(quality);
    await progress(0.8, 'Стройка…');
    site = createSite({ scene, mats, terrain, factory, onEvent });
    restore();
    site.start(savedIndex);
    for (let i = 0; i < 5 + site.S.upgrades.crew; i++) site.addWorker();
    if (params.has('built')) site.jump(Number(params.get('built')));
    ui = createUI(document.getElementById('hud'), {
      buy: function (k) { const ok = site.buy(k); save(); return ok; },
      setTempo: function (t) { state.tempo = t; },
      cycleQuality: function () {
        const next = ORDER[(ORDER.indexOf(state.quality) + 1) % ORDER.length];
        try { localStorage.setItem('rust.quality', next); } catch (e) { /* без хранилища — только этот запуск */ }
        save();
        const q = new URLSearchParams(location.search);
        q.delete('quality');
        location.search = q.toString();
      },
      next: function () { site.start(site.S.index + 1); ui.setBuilding(site.S.index); frameCamera(true); save(); },
    });
    ui.setBuilding(site.S.index);
    frameCamera(true);
  }

  await progress(0.92, 'Свет…');
  post = createPost(renderer, scene, camera, quality);
  sky.update(state.hour, 0, controls.target);
  sky.fitShadow(controls.target, showroom ? 34 : 26);
  renderer.compile(scene, camera);
  await progress(1, '');
  if (loading) loading.classList.add('hidden');
  state.ready = true;
  if (window.RustDebug) window.RustDebug.ready = true;
  requestAnimationFrame(frame);
}

// ---------- сохранение ----------
let savedIndex = 0;
function restore() {
  if (params.has('b')) { savedIndex = Number(params.get('b')) || 0; return; }
  try {
    const s = JSON.parse(localStorage.getItem('rust.save') || 'null');
    if (!s) return;
    savedIndex = s.index || 0;
    site.S.coins = s.coins || 0;
    site.S.upgrades = Object.assign(site.S.upgrades, s.upgrades || {});
  } catch (e) { /* испорченное сохранение — начать заново */ }
}
function save() {
  if (!site || params.has('b')) return;
  try { localStorage.setItem('rust.save', JSON.stringify({ index: site.S.index, coins: site.S.coins, upgrades: site.S.upgrades })); } catch (e) { /* без хранилища */ }
}

function onEvent(type, data) {
  if (!ui) return;
  if (type === 'place' && state.tempo <= 5) ui.pop(data.pos, data.gain);
  if (type === 'piece') ui.toast(data.name + ' — готово', data.gain);
  if (type === 'complete') { ui.complete(data.name, data.bonus); save(); }
}

function frameCamera(snap) {
  const f = site.S.plan.footprint;
  const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2;
  const size = Math.max(f.x1 - f.x0, f.z1 - f.z0) + site.S.plan.def.stories * 3;
  controls.target.set(cx + 1.5, 2.2, cz + 1.5);
  // узкий экран (телефон стоя): отъехать дальше, чтобы здание и склад влезли по ширине
  const k = camera.aspect < 1 ? Math.min(2.2, 0.85 / camera.aspect) : 1;
  if (snap) camera.position.set(cx + 1.5 + (size * 1.35 + 2.5) * k, 4 + size * 0.75 * k, cz + 1.5 + (size * 1.6 + 4.5) * k);
  controls.update();
}

// ---------- шоурум ----------
function buildPlan(plan) {
  const group = new THREE.Group();
  const built = plan.pieces.map(function (p) { const b = buildPiece(p, mats); group.add(b.group); return b; });
  return { plan, group, built };
}
function setRooms(views) {
  views.forEach(function (v, i) {
    if (i >= 6) return;
    const f = v.plan.footprint;
    ROOMS.xz[i].set(f.x0 + 0.02, f.z0 + 0.02, f.x1 - 0.02, f.z1 - 0.02);
    ROOMS.y[i].set(0.2, v.plan.topY + 0.15, 1);
  });
}
function revealAll(v) {
  v.built.forEach(function (b) {
    b.stages.forEach(function (s, k) { s.reveal(s.elements.length); if (k < b.stages.length - 1) s.hide(); });
  });
}
function buildShowroom() {
  const group = new THREE.Group();
  const views = [];
  TIERS.forEach(function (tier, t) {
    const def = {
      id: 'show-' + tier, name: tier, size: [2, 1], stories: 1, foundation: tier === 'twig' ? 'wood' : tier, walls: [tier],
      sheet: tier === 'metal' ? 'zinc' : undefined,
      roof: { type: 'gable', axis: 'x', pitch: 34, tier },
      sides: [{ s: ['door', 'window'], n: ['wall', 'window'], w: ['window'], e: ['wall'] }],
      inserts: { door: tier === 'metal' ? 'metal' : tier === 'armored' ? 'armored' : 'wood', window: tier === 'stone' ? 'glass' : tier === 'metal' ? 'bars' : tier === 'armored' ? 'embrasure' : 'shutters' },
    };
    const v = buildPlan(planBuilding(def, [(t - 2) * 11, 0]));
    revealAll(v);
    group.add(v.group);
    views.push(v);
  });
  return { group, views };
}

// ---------- динамическое разрешение ----------
// Меньше 50 кадров в секунду два окна по 2 с — холст считается в меньшем разрешении (до 0,55 по стороне),
// больше 85 — возвращается к полному. Картинку дотягивает резкость в последнем проходе.
const dyn = { scale: 1, t: -4, frames: 0, cool: 0, enabled: !params.has('fixedres') };
function basePR() { return Math.min(window.devicePixelRatio || 1, quality.ratio); }
function applySize() { if (post) post.setSize(window.innerWidth, window.innerHeight, basePR() * dyn.scale); }
function watchFrame(dt) {
  if (!dyn.enabled || state.manual) return;
  dyn.t += dt; dyn.frames++; dyn.cool -= dt;
  if (dyn.t < 2) return;
  const fps = dyn.frames / dyn.t;
  dyn.t = 0; dyn.frames = 0;
  let next = dyn.scale;
  if (fps < 50 && dyn.scale > 0.55) next = Math.max(0.55, dyn.scale * 0.86);
  else if (fps > 85 && dyn.scale < 1 && dyn.cool <= 0) next = Math.min(1, dyn.scale * 1.1);
  if (next !== dyn.scale) { dyn.scale = next; dyn.cool = 6; applySize(); }
}

// ---------- кадр ----------
let last = performance.now();
function step(dt) {
  const sim = dt * state.tempo;
  state.time += dt;
  if (!state.fixedHour) state.hour = (state.hour + sim / 40) % 24;
  if (site) { site.step(sim, state.time); site.render(Math.min(0.25, sim), state.time); }
  directCamera(dt);
  controls.update();
  sky.follow(camera);
  sky.update(state.hour, state.time, controls.target);
  grass.update(state.time);
  renderer.toneMappingExposure = sky.state.exposure * exposureGain;
  if (ui) {
    ui.update({ coins: site.S.coins, hour: state.hour, qualityName: QUALITY[state.quality].name, progress: site.progress(), upgrades: site.S.upgrades, workers: site.S.workers.length });
    ui.updatePops(dt, camera, window.innerWidth, window.innerHeight);
  }
}

function frame(now) {
  if (state.manual) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  step(dt);
  renderer.info.reset();
  post.render(state.time);
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
setInterval(save, 5000);

// ---------- отладка ----------
if (params.get('dev') === '1' || params.has('capture')) {
  window.RustDebug = {
    ready: false,
    state: function () {
      const p = site ? site.progress() : null;
      return { ready: state.ready, hour: Math.round(state.hour * 100) / 100, quality: state.quality, frames: state.frames, scene: state.scene, tempo: state.tempo, scale: Math.round(dyn.scale * 100) / 100,
        calls: renderer.info.render.calls, tris: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries,
        progress: p, coins: site ? site.S.coins : 0, done: site ? site.S.done : false, building: site ? site.S.index : -1,
        workers: site ? site.S.workers.map(function (w) { return w.state; }) : [] };
    },
    time: function (h) { state.hour = h; sky.update(state.hour, state.time, controls.target); return state.hour; },
    fixHour: function (on) { state.fixedHour = !!on; return state.fixedHour; },
    tempo: function (t) { state.tempo = t; return t; },
    view: function (pos, target) { camera.position.fromArray(pos); controls.target.fromArray(target); controls.update(); return true; },
    manual: function (on) { state.manual = !!on; if (!on) { last = performance.now(); requestAnimationFrame(frame); } return state.manual; },
    frame: function (dt) { step(dt); renderer.info.reset(); post.render(state.time); state.frames++; return state.frames; },
    jump: function (f) { site.jump(f); return site.progress(); },
    next: function () { site.start(site.S.index + 1); ui.setBuilding(site.S.index); frameCamera(true); return site.S.index; },
    building: function (i) { site.start(i); ui.setBuilding(site.S.index); frameCamera(true); return site.S.index; },
    coins: function (n) { site.S.coins = n; return n; },
    buy: function (k) { return site.buy(k); },
    worker: function (i) { const w = site.S.workers[i]; return w ? { pos: w.pos.toArray(), state: w.state, carry: w.carryKind, action: w.anim.action } : null; },
    site: function () { return site; },
    pieces: function () {
      return site.S.built.map(function (b) {
        const st = b.stages[b.stage];
        return [b.piece.type, b.piece.level, b.stage, st.revealed + '/' + st.elements.length, b.lock, Math.round(b.fail * 10) / 10, b.done ? 'done' : ''].join(' ');
      });
    },
    camera: function () { return { pos: camera.position.toArray(), target: controls.target.toArray() }; },
    renderer: function () { return renderer; },
    scene: function () { return scene; },
    post: function () { return post; },
    hud: function (on) { document.getElementById('hud').style.display = on ? '' : 'none'; return !!on; },
    follow: function (opts) { follow = opts ? Object.assign({ angle: 0.9, dist: 3.4, height: 1.6, look: 1.1, snap: true }, opts) : null; orbit = null; return !!follow; },
    orbit: function (opts) { orbit = opts || null; follow = null; return !!orbit; },
    // рабочий за делом: состояние, ноша, не на лестнице (или на ней — onLadder)
    pickWorker: function (stateName, carry, ladder, clear) {
      const list = site.S.workers;
      for (let i = 0; i < list.length; i++) {
        const w = list[i];
        if (w.state !== stateName) continue;
        if (carry && !(w.carryKind === carry || (w.task && w.task.kind === carry))) continue;
        if (ladder !== undefined && ladder !== null && (w.onLadder > 0.05) !== ladder) continue;
        // для крупного плана — чтобы соседи не закрывали камеру
        if (clear && list.some(function (o) { return o !== w && o.pos.distanceTo(w.pos) < clear; })) continue;
        return i;
      }
      return -1;
    },
    record: function (on) { site.S.recordEvents = !!on; site.S.events.length = 0; return !!on; },
    drain: function () {
      const e = site.S.events.splice(0).map(function (x) { return { type: x.type, kind: x.kind, action: x.action, pos: x.pos ? x.pos.toArray().map(function (v) { return Math.round(v * 100) / 100; }) : null }; });
      return { events: e, cam: camera.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }), hour: state.hour };
    },
    completeShown: function () { return !document.getElementById('done').classList.contains('hidden'); },
  };
}

boot().catch(function (e) {
  console.error(e);
  if (loadingText) loadingText.textContent = 'Ошибка запуска: ' + (e && e.message ? e.message : e);
});
