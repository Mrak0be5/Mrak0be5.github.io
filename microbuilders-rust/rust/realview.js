// Перехват кадра оригинала. game.js создаёт рендерер как обычно (new THREE.WebGLRenderer), но получает наследника
// с подменённым render: главный проход его сцены (камера MicroBuildersCamera.current) рисует реалистичный кадр
// (scene.js) тем же контекстом, дымка оригинала и её копия экрана пропускаются, а интерфейсные 3D-объекты
// оригинала (значки и план рабочего, кольцо выбора, кольца перекура, подписи рудников) дорисовываются поверх его
// же камерой. Остальные вызовы (PMREM, цели рендера) идут штатно. Сцена оригинала дальше обновляется и служит
// моделью вида: выбор тапом, DOM-таблички, камера. Здесь же мост: мир логики, его события и темп.
import * as THREE from 'three';

// Вид не сдвигает случайность игры: logic.js и meta.js берут Math.random, а вид (uuid объектов three.js,
// частицы) на время своей работы — свой генератор.
const viewRandom = mulberry32(20261107);
export function asView(fn) {
  const game = Math.random;
  Math.random = viewRandom;
  try { return fn(); } finally { Math.random = game; }
}
// То же для долгой подготовки вида до старта игры (с ожиданиями кадров): генератор вида — на всё время.
export async function asViewAsync(fn) {
  const game = Math.random;
  Math.random = viewRandom;
  try { return await fn(); } finally { Math.random = game; }
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Рендерер, созданный загрузчиком заранее (свой контекст WebGL2, фактуры вида до старта игры): его же получит
// game.js из своего new THREE.WebGLRenderer.
let early = null;
export const hook = { view: null, inside: false, drawn: false, manual: false, allow: false, disabled: false, error: null, frames: 0, passFrames: 0, counts: { calls: 0, tris: 0 } };

export class RVRenderer extends THREE.WebGLRenderer {
  constructor(params) {
    if (early) { const r = early; early = null; return r; }
    super(params);
    install(this);
  }
}

// WebGL2 с повторами: на занятой видеокарте Chrome иногда не даёт контекст с первого раза (тогда three ушёл бы в
// WebGL1, где не собираются шейдеры скелета) — повтор на новом холсте #view. antialias — MSAA холста («Телефон»:
// кадр рисуется прямо в холст; остальные уровни сглаживают в своих целях).
export async function createRenderer(antialias) {
  let canvas = document.getElementById('view');
  let gl = null;
  for (let attempt = 0; attempt < 8 && !gl; attempt++) {
    if (attempt > 0) {
      await new Promise(function (r) { setTimeout(r, 500 + attempt * 400); });
      const fresh = canvas.cloneNode(false);
      canvas.replaceWith(fresh);
      canvas = fresh;
    }
    gl = canvas.getContext('webgl2', { antialias: !!antialias, powerPreference: 'high-performance', stencil: false, alpha: false, depth: true });
  }
  if (!gl) throw new Error('видеокарта не дала WebGL2 — перезагрузите страницу');
  early = null;
  const r = new RVRenderer({ canvas, context: gl, antialias: !!antialias, stencil: false });
  // как в game.js до его собственных настроек (он их повторит)
  const Stage = window.MicroBuildersStage;
  r.setPixelRatio(Math.min(2, (window.devicePixelRatio || 1) * (Stage ? Stage.scale() : 1)));
  r.setSize(Stage ? Stage.width() : window.innerWidth, Stage ? Stage.height() : window.innerHeight);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
  early = r;
  return r;
}

function install(r) {
  const base = { render: r.render, compile: r.compile, copy: r.copyFramebufferToTexture };
  const saved = { clear: new THREE.Color() };
  r.render = function (scene, camera) {
    if (hook.inside || r.getRenderTarget() !== null) return base.render.call(r, scene, camera);
    const cc = window.MicroBuildersCamera && window.MicroBuildersCamera.current;
    if (cc && camera === cc.camera) return mainPass(scene, camera);
    // дымка оригинала (game.js → renderHaze): свою дымку даёт атмосфера вида
    if (hook.drawn && isHaze(scene)) return;
    return base.render.call(r, scene, camera);
  };
  r.copyFramebufferToTexture = function (position, texture, level) {
    if (hook.drawn && !hook.inside) return;
    return base.copy.call(r, position, texture, level);
  };
  // Сборка шейдеров новой площадки (game.js → shadersReady): игра ждёт программы, пока под заставкой не видно
  // кадра. Ждёт она и программы вида, а свои (невидимые) не собирает — их не рисуют.
  r.compile = function (scene, camera, target) {
    const v = hook.view;
    const cc = window.MicroBuildersCamera && window.MicroBuildersCamera.current;
    if (!hook.inside && v && !hook.disabled && cc && camera === cc.camera && v.ready()) {
      hook.inside = true;
      try {
        const set = asView(function () { return v.compile(scene, camera); });
        if (set) return set;
      } catch (e) {
        console.error(e);
      } finally { hook.inside = false; }
    }
    return base.compile.call(r, scene, camera, target);
  };

  function mainPass(scene, camera) {
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    const v = hook.view;
    if (!v || hook.disabled || !v.ready() || v.passThrough(scene)) {
      hook.drawn = false;
      hook.passFrames++;
      return base.render.call(r, scene, camera);
    }
    hook.drawn = true;
    if (hook.manual && !hook.allow) return;
    hook.inside = true;
    save();
    try {
      asView(function () { v.frame(scene, camera); });
      hook.counts.calls = r.info.render.calls;
      hook.counts.tris = r.info.render.triangles;
    } catch (e) {
      // ошибка вида — дальше кадр оригинала как есть (игра не встаёт)
      hook.error = e;
      hook.disabled = true;
      console.error('RealView:', e);
      restore();
      hook.inside = false;
      hook.drawn = false;
      return base.render.call(r, scene, camera);
    }
    restore();
    overlay(scene, camera);
    hook.inside = false;
    hook.frames++;
  }

  function save() {
    saved.toneMapping = r.toneMapping;
    saved.exposure = r.toneMappingExposure;
    saved.autoClear = r.autoClear;
    r.getClearColor(saved.clear);
    saved.alpha = r.getClearAlpha();
    saved.shadowAuto = r.shadowMap.autoUpdate;
    saved.autoReset = r.info.autoReset;
    r.info.autoReset = false;
    r.info.reset();
  }
  function restore() {
    r.setRenderTarget(null);
    r.toneMapping = saved.toneMapping;
    r.toneMappingExposure = saved.exposure;
    r.autoClear = saved.autoClear;
    r.setClearColor(saved.clear, saved.alpha);
    r.shadowMap.autoUpdate = saved.shadowAuto;
    r.info.autoReset = saved.autoReset;
  }

  // Интерфейс оригинала поверх кадра: его камерой, без общей глубины (почти всё и так рисуется без проверки
  // глубины), в тон-маппинге оригинала.
  function overlay(scene, camera) {
    const list = overlays(scene);
    if (!list.length) return;
    const autoClear = r.autoClear;
    r.autoClear = false;
    r.clearDepth();
    for (let i = 0; i < list.length; i++) base.render.call(r, list[i], camera);
    r.autoClear = autoClear;
  }
}

function isHaze(scene) {
  if (!scene.isScene || scene.children.length !== 1) return false;
  const m = scene.children[0].material;
  return !!(m && m.uniforms && m.uniforms.uHaze);
}

// Корни интерфейса в сцене оригинала: значки над рабочими (внуки с renderOrder 40+), план выбранного рабочего
// (дети с userData.blink); на площадке (levelRoot — первый ребёнок сцены) — кольцо выбора рабочего и подписи
// рудников; кольца «Айда курить!» лежат в корне сцены (RingGeometry, renderOrder 3).
const roles = new WeakMap();
function roleOf(o) {
  const known = roles.get(o);
  if (known) return known;
  if (!o.isGroup || !o.children.length) return '';
  let role = '';
  for (let i = 0; i < o.children.length && !role; i++) {
    const c = o.children[i];
    if (c.userData && c.userData.blink !== undefined) role = 'plan';
    else for (let j = 0; j < c.children.length; j++) if (c.children[j].renderOrder >= 40) { role = 'badge'; break; }
  }
  if (role) roles.set(o, role);
  return role;
}
const _list = [];
export function overlays(scene) {
  _list.length = 0;
  const kids = scene.children;
  const level = kids[0];
  for (let i = 1; i < kids.length; i++) {
    const o = kids[i];
    if (!o.visible) continue;
    if (o.isMesh && o.renderOrder === 3 && o.geometry && o.geometry.type === 'RingGeometry') { _list.push(o); continue; }
    if (o.isGroup && o !== level && roleOf(o)) _list.push(o);
  }
  if (level && level.visible) {
    const ch = level.children;
    for (let i = 0; i < ch.length; i++) {
      const o = ch[i];
      if (!o.visible) continue;
      if (o.isSprite && o.material.depthTest === false) _list.push(o);
      else if (o.userData && o.userData.selection && o.userData.selection.visible) _list.push(o.userData.selection);
    }
  }
  return _list;
}

// Мост к игре: мир, кампания и мета логики (через MicroBuildersDebug, attach после game.js), события мира и темп.
// События ловятся у push массива world.events (logic.js кладёт туда всё, game.js разбирает и очищает в
// consumeEvents) и отдаются слушателям в кадре вида; пропущенные до перехвата — по проходу непрочитанного массива.
export function createBridge() {
  let D = null;
  const listeners = [];
  const seen = new WeakSet();
  const queue = [];
  let world = null, events = null, rebuilds = 0, tempo = 1, tempoClock = 0;
  const fxQueue = [];
  function watch(w) {
    const arr = w.events;
    if (!arr || arr === events) return;
    events = arr;
    if (Object.prototype.hasOwnProperty.call(arr, '__rv')) return;
    const push = arr.push;
    Object.defineProperty(arr, '__rv', { value: true });
    Object.defineProperty(arr, 'push', { value: function () { for (let i = 0; i < arguments.length; i++) queue.push(arguments[i]); return push.apply(this, arguments); }, writable: true, configurable: true });
  }
  const B = {
    get D() { return D; },
    attach: function (d) { D = d; },
    get MB() { return window.MicroBuilders; },
    get world() { return world; },
    get campaign() { return D ? D.campaign() : null; },
    get meta() { return D ? D.meta() : null; },
    get tempo() { return tempo; },
    get rebuilds() { return rebuilds; },
    on: function (fn) { listeners.push(fn); return function () { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    rebuilt: function () { rebuilds++; },
    // вызовы эффектов оригинала (MicroBuildersFx: chips, dust, confetti, flag…) — виду в его кадре
    fx: function (name, args) { if (fxQueue.length < 400) fxQueue.push(name, args); },
    drainFx: function (fn) { for (let i = 0; i < fxQueue.length; i += 2) fn(fxQueue[i], fxQueue[i + 1]); fxQueue.length = 0; },
    // раз в кадр вида: true — площадка сменилась (новый мир или пересборка)
    poll: function (dt) {
      const w = D ? D.world() : null;
      let changed = false;
      if (w !== world) { world = w; events = null; queue.length = 0; changed = true; }
      if (w) {
        watch(w);
        const arr = w.events;
        for (let i = 0; i < arr.length; i++) if (!seen.has(arr[i])) queue.push(arr[i]);
      }
      tempoClock -= dt;
      if (tempoClock <= 0) {
        tempoClock = 0.25;
        const on = document.querySelector('.tempo button[data-tempo].on');
        tempo = on ? Number(on.dataset.tempo) : 1;
      }
      return changed;
    },
    dispatch: function () {
      for (let i = 0; i < queue.length; i++) {
        const e = queue[i];
        if (!e || typeof e !== 'object' || seen.has(e)) continue;
        seen.add(e);
        for (let j = 0; j < listeners.length; j++) listeners[j](e);
      }
      queue.length = 0;
    },
  };
  return B;
}
