// Запуск «MicroBuilders: Rust»: экран загрузки, рендерер и вид (фактуры, рельеф, лес, рабочие) до старта игры,
// затем файлы оригинала в порядке его index.html — без правок, кроме ключа сохранения в meta.js (оригинал и
// прототип живут на одном домене). game.js получает рендерер-перехватчик (realview.js) через свой THREE.
// Ссылки страницы — от корня репозитория (<base href="../">): game.js и ui.js берут значки как в оригинале.
import * as THREE from 'three';
import { RVRenderer, createRenderer, createBridge, hook, asViewAsync } from './realview.js?v=45127fe';
import { createScene, pickTier, QUALITY } from './scene.js?v=45127fe';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1' || params.has('capture');
const DEV = params.get('dev') === '1';
export const STORAGE_FROM = "'microbuilders.meta.v1'";
export const STORAGE_TO = "'microbuilders-rv.meta.v1'";
// Ошибка оригинала (ветка OpusIdea): у испытаний школы и строек штаба номер уровня — строка («Испытание», «Штаб»),
// CHAPTER_LOOKS[NaN] роняет buildLevelView — площадка испытания не строится. Строка — глава 1.
export const CHAPTER_FROM = "CHAPTER_LOOKS[Math.floor(Math.max(0, (level.number || 1) - 1) / 10)";
export const CHAPTER_TO = "CHAPTER_LOOKS[Math.floor(Math.max(0, (Number(level.number) || 1) - 1) / 10)";
const PATCHES = { 'meta.js': [[STORAGE_FROM, STORAGE_TO]], 'game.js': [[CHAPTER_FROM, CHAPTER_TO]] };

const loading = document.getElementById('loading');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
function progress(t, text) {
  if (loadingBar) loadingBar.style.width = Math.round(t * 100) + '%';
  if (text && loadingText) loadingText.textContent = text;
  return new Promise(function (r) { requestAnimationFrame(function () { r(); }); });
}

// Файлы оригинала: сборка сайта вписывает список (window.RV_SCRIPTS), в репозитории он берётся из index.html
// оригинала — с теми же метками версий. classic — до модуля three (ui.js строит интерфейс), module — после.
async function scriptList() {
  if (window.RV_SCRIPTS) return window.RV_SCRIPTS;
  const html = await (await fetch('index.html', { cache: 'no-store' })).text();
  const css = Array.from(html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)).map(function (m) { return m[1]; });
  const classic = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g)).map(function (m) { return m[1]; });
  const mod = (html.match(/<script type="module">([\s\S]*?)<\/script>/) || [])[1] || '';
  const module = Array.from(mod.matchAll(/'([\w/.-]+\.js(?:\?v=\w+)?)'/g)).map(function (m) { return m[1]; }).filter(function (s) { return s.indexOf('three.module') < 0; });
  if (!module.some(function (s) { return s.split('?')[0] === 'game.js'; })) throw new Error('index.html оригинала: не найден список скриптов');
  return { css, classic, module };
}

function addScript(src) {
  return new Promise(function (resolve, reject) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = function () { reject(new Error('не загрузился ' + src)); };
    document.body.appendChild(script);
  });
}
async function loadScript(src) {
  const name = src.split('?')[0];
  // офлайн-файл (build_rust.py --offline): тексты файлов оригинала вшиты, уже с правками; встроенный скрипт
  // выполняется сразу при вставке
  if (window.RV_TEXTS) {
    if (window.RV_TEXTS[name] === undefined) throw new Error('в офлайн-файле нет ' + name);
    const script = document.createElement('script');
    script.text = window.RV_TEXTS[name];
    document.body.appendChild(script);
    return;
  }
  if (!PATCHES[name]) return addScript(src);
  let text = await (await fetch(src)).text();
  PATCHES[name].forEach(function (pair) {
    if (text.indexOf(pair[0]) < 0) throw new Error(name + ': не найдено место правки «' + pair[0].slice(0, 40) + '…»');
    text = text.replace(pair[0], pair[1]);
  });
  return addScript(URL.createObjectURL(new Blob([text + '\n//# sourceURL=' + new URL(src, document.baseURI).href], { type: 'text/javascript' })));
}

async function boot() {
  const list = await scriptList();
  (list.css || []).forEach(function (href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.insertBefore(link, document.head.querySelector('link[href$="app.css"]'));
  });
  // файлы игры качаются, пока строится вид (дальше — из кэша браузера)
  if (!window.RV_TEXTS) list.module.forEach(function (src) { fetch(src).catch(function () {}); });
  await progress(0.01, 'Интерфейс…');
  for (const src of list.classic) await loadScript(src);
  const tier = pickTier(params);
  const bridge = createBridge();
  window.THREE = Object.assign({}, THREE, { WebGLRenderer: RVRenderer });
  // логика, мета и вид оригинала (без game.js): модулям вида нужен MicroBuilders (материалы, раскладка)
  await progress(0.015, 'Логика игры…');
  const game = list.module.find(function (s) { return s.split('?')[0] === 'game.js'; });
  for (const src of list.module) if (src !== game) await loadScript(src);
  let view = null;
  if (tier) {
    await progress(0.02, 'Видеокарта…');
    // игра ещё не запущена: всё время подготовки случайность — у вида (прогон с зерном совпадёт с оригиналом)
    await asViewAsync(async function () {
      const renderer = await createRenderer(!!QUALITY[tier].mobile);
      view = createScene(renderer, { tier, bridge, params, hook });
      await view.prepare(progress);
    });
    hook.view = view;
  }
  await progress(0.95, 'Игра…');
  // Свечение и «миниатюра» оригинала (art/post.js) — его сцене, а её не рисуют: кадр — главным проходом.
  if (view) window.MicroBuildersPost.create = function () { return null; };
  // Эффекты оригинала (art/fx.js): каждый вызов — и его пулам (их не рисуют), и виду (fx.js) с теми же числами.
  const Fx = window.MicroBuildersFx;
  const createFx = Fx.create;
  Fx.create = function () {
    const fx = createFx.apply(this, arguments);
    if (!view || !fx) return fx;
    Object.keys(fx).forEach(function (name) {
      const fn = fx[name];
      if (typeof fn !== 'function' || name === 'update') return;
      fx[name] = function () {
        const args = Array.prototype.map.call(arguments, function (a) { return a && a.isVector3 ? a.clone() : a; });
        bridge.fx(name, args);
        return fn.apply(this, arguments);
      };
    });
    return fx;
  };
  // пересборка площадки (game.js → buildLevelView) — сигнал виду
  const Q = window.MicroBuildersQuarry;
  const build = Q.build;
  Q.build = function () { bridge.rebuilt(); return build.apply(this, arguments); };
  // MicroBuildersDebug (мир, кампания, мета, сцена) game.js создаёт один раз при выполнении и только с классом
  // dev-mode у body: класс — на время выполнения, отладочные элементы (.dev-only) остаются скрыты.
  const hadDev = document.body.classList.contains('dev-mode');
  document.body.classList.add('dev-mode');
  try { await loadScript(game); } finally { if (!hadDev) document.body.classList.remove('dev-mode'); }
  const D = window.MicroBuildersDebug;
  if (!D) throw new Error('game.js не создал MicroBuildersDebug');
  bridge.attach(D);
  if (!DEV && !DEBUG) delete window.MicroBuildersDebug;
  if (DEBUG && view) window.RustDebug = Object.assign(view.debugApi(), { hook: function () { return hook; } });
  await progress(1, '');
  // экран загрузки уходит с первым кадром (игра ждёт сборку шейдеров до 4 с)
  const started = performance.now();
  await new Promise(function (resolve) {
    (function check() {
      if (hook.frames + hook.passFrames > 0 || !view || performance.now() - started > 9000) resolve();
      else requestAnimationFrame(check);
    })();
  });
  if (loading) loading.classList.add('hidden');
  if (window.RustDebug) window.RustDebug.ready = true;
}

boot().catch(function (e) {
  console.error(e);
  if (loadingText) loadingText.textContent = 'Ошибка запуска: ' + (e && e.message ? e.message : e);
});
