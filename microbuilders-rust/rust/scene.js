// Реалистичный вид стройки оригинала («MicroBuilders: Rust»): качество, сцена, кадр, отладка (?debug=1 →
// window.RustDebug). Игра, интерфейс, камера и звук — оригинал (game.js, ui.js, camera-controller.js) без правок:
// его главный проход подменяет перехват (realview.js), а здесь — что рисуется вместо: здание деталями, как в Rust
// (building.js: фундамент, стены, окна, двери, колонны, перекрытия), карьеры и столы (yard.js), леса
// (scaffold.js), бригада MakeHuman (crew.js), рельеф, лес, небо и погода. Клетка логики — 2 м: мир вида ровно ×2
// к координатам оригинала, камера — копия камеры оригинала (позиция ×2, поворот, угол, сдвиг под интерфейс).
import * as THREE from 'three';
import { createTextures } from './textures.js?v=9f2863b';
import { createMaterials } from './materials.js?v=9f2863b';
import { createSky, createTerrain, splatMap, terrainMaterial, terrainMesh, meshHeight, mountains, linkSkyTree, createWear, setSeason, setLevelSeason, unpinSeason, SEASON } from './world.js?v=9f2863b';
import { createPost } from './post.js?v=9f2863b';
import { createRender, DYNAMIC } from './render.js?v=9f2863b';
import { createMobile } from './mobile.js?v=9f2863b';
import { createGrass, createForest, createRocks } from './nature.js?v=9f2863b';
import { createWorkerFactory } from './people.js?v=9f2863b';
import { createLife } from './life.js?v=9f2863b';
import { createBuilding } from './building.js?v=9f2863b';
import { CELL } from './families.js?v=9f2863b';
import { createYard } from './yard.js?v=9f2863b';
import { createScaffold } from './scaffold.js?v=9f2863b';
import { createCrew } from './crew.js?v=9f2863b';
import { createLights } from './props.js?v=9f2863b';
import { roads as siteRoads, pit as sitePit } from './site-layout.js?v=9f2863b';

// Радиус поляны, м: перекур — в 10–20 клетках от здания, обед и сон — в 30–40 (logic.js →
// pickPerimeterCell), рабочие уходят туда пешком. Лес начинается за краем поляны.
const CLEAR = 120;

// ---------- качество ----------
// «Максимум» и «Ультра» — свой конвейер кадра (render.js): временное сглаживание вместо MSAA и суперсэмплинга,
// затенение углов по G-буферу. «Максимум»: тень солнца 8192 и дальний каскад 4096 (лес и холмы отбрасывают
// тени), объёмный свет (лучи солнца, конусы прожекторов), блик солнца, трава и лес гуще, тела рабочих мельче.
// ss — верхний предел разрешения счёта относительно холста (динамическое разрешение не поднимает выше).
export const QUALITY = {
  max: { name: 'Максимум', bevel: 1, tex: 2048, shadow: 8192, farShadow: 4096, spotShadow: 2048, ao: 1, aoSamples: 24, bloom: true, msaa: 0, taa: 1, ss: 1, glass: 'physical', terrainDetail: 1, grass: 1.6, trees: 1.35, bodyCell: 0.009, volume: 1, flare: 1, clouds: 1, gi: 1, ssr: 1, mblur: 1 },
  ultra: { name: 'Ультра', bevel: 1, tex: 2048, shadow: 4096, farShadow: 2048, spotShadow: 1024, ao: 1, bloom: true, msaa: 0, taa: 1, ss: 1, glass: 'physical', terrainDetail: 1, grass: 1, trees: 1, bodyCell: 0.0125, clouds: 1, gi: 1, ssr: 1 },
  high: { name: 'Высокая', bevel: 1, tex: 2048, shadow: 2048, spotShadow: 1024, ao: 0.5, bloom: true, msaa: 4, glass: 'physical', terrainDetail: 1, grass: 0.45, trees: 0.7, bodyCell: 0.015 },
  phone: { name: 'Телефон', mobile: 1, tex: 1024, shadow: 1024, spotShadow: 0, ao: 0, bloom: false, msaa: 0, glass: 'simple', terrainDetail: 0, grass: 0.12, trees: 0.45, bodyCell: 0.02, farForest: 0 },
};
export const ORDER = ['max', 'ultra', 'high', 'phone'];

// Уровень качества вида: ?rv=… (max, ultra, high, phone; off — без вида, кадр оригинала), иначе выбранный
// раньше (RustDebug.quality), иначе по устройству — телефон (палец или ?render=mobile) или «Максимум».
export function pickTier(params) {
  const asked = params.get('rv');
  if (asked === 'off') return null;
  if (QUALITY[asked]) return asked;
  let stored = null;
  try { stored = localStorage.getItem('rust.quality'); } catch (e) { stored = null; }
  if (QUALITY[stored]) return stored;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  return coarse || params.get('render') === 'mobile' ? 'phone' : 'max';
}

export function createScene(renderer, opts) {
  const B = opts.bridge;
  const params = opts.params;
  const tier = opts.tier;
  const quality = Object.assign({}, QUALITY[tier]);
  // ?ao=0&bloom=0&grass=0&trees=0&msaa=0 — выключатели для отладки картинки
  ['ao', 'bloom', 'grass', 'trees', 'msaa', 'volume', 'flare', 'ss', 'taa', 'clouds', 'gi', 'ssr', 'mblur'].forEach(function (k) { if (params.has(k)) quality[k] = k === 'bloom' ? params.get(k) !== '0' : Number(params.get(k)); });
  const exposureGain = Number(params.get('exposure')) || 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.15, 4000);
  // точка, куда смотрит камера оригинала (×2): по ней ходят квадрат теней и небо
  const target = new THREE.Vector3(0, 2, 0);
  // модули вида ждут от движка только MB и подписку на события мира
  const E = { get MB() { return B.MB; }, on: B.on };

  const TIMINGS = [];
  let lastMark = performance.now();
  function mark(name) { const now = performance.now(); TIMINGS.push([name, Math.round(now - lastMark)]); lastMark = now; }

  const state = {
    hour: 13,
    // ?hour=… или RustDebug.time(…) — час неба вручную (иначе — часы оригинала)
    fixedHour: params.has('hour') ? Number(params.get('hour')) : null,
    time: 0,
    tempo: 1,
    ready: false,
    frames: 0,
    cpuMs: 0,
    quality: tier,
  };
  let sky, post, textures, mats, terrain, splat, grass, factory, wear, life;
  let house, yard, scaffold, crew, lights = null, viewGroups = [];
  // ---------- модули: хозяйство площадки, эффекты, квартал штаба ----------
  // Каждый — свой файл (site.js, fx.js, city.js) вида create(ctx) → { group, build?(world), clear?(), update?(dt, info),
  // react?(event), call?(name, args), active? }. Грузятся динамически: ошибка модуля (при загрузке или в кадре)
  // выключает только его (RustDebug.state().plugins), игра и остальной вид идут дальше. ?only=site,fx — только эти.
  const LOADERS = { site: function () { return import('./site.js?v=9f2863b'); }, fx: function () { return import('./fx.js?v=9f2863b'); }, city: function () { return import('./city.js?v=9f2863b'); } };
  const plugins = [];
  const info = { dt: 0, time: 0, hour: 13, night: 0, tempo: 1, camera: null, target: null, origScene: null, origCamera: null, mode: 'site', cityRoot: null };
  async function loadPlugins(ctx) {
    const only = params.get('only') ? params.get('only').split(',') : null;
    for (const name of Object.keys(LOADERS)) {
      if (only && only.indexOf(name) < 0) continue;
      const p = { name: name, api: null, error: null };
      plugins.push(p);
      try {
        const mod = await LOADERS[name]();
        p.api = (await mod.create(ctx)) || null;
        if (p.api && p.api.group) { linkSkyTree(p.api.group); scene.add(p.api.group); }
      } catch (e) { fail(p, e); }
    }
  }
  function fail(p, e) {
    p.error = String((e && e.stack) || e);
    console.error('RealView ' + p.name + ':', e);
    if (p.api && p.api.group) p.api.group.visible = false;
    p.api = null;
  }
  function each(method, a, b) {
    for (let i = 0; i < plugins.length; i++) {
      const p = plugins[i];
      if (!p.api || !p.api[method]) continue;
      try { p.api[method](a, b); } catch (e) { fail(p, e); }
    }
  }
  function plugin(name) { for (let i = 0; i < plugins.length; i++) if (plugins[i].name === name) return plugins[i].api; return null; }
  let world = null, builtRebuilds = -1;
  let last = performance.now();
  let scaffoldClock = 0;
  // Съёмка: камера за рабочим (follow), облёт (orbit) или своя точка (fixed) вместо камеры оригинала.
  let follow = null, orbit = null, fixed = null;
  const rig = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  const _cam = new THREE.Vector3(), _tgt = new THREE.Vector3(), _v = new THREE.Vector3(), _sz = new THREE.Vector2();

  // ---------- запуск: всё, что не зависит от площадки (до старта игры) ----------
  async function prepare(progress) {
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
    splat = splatMap(terrain, emptyLayout(), 640, 320);
    // карта вытоптанности — и под спящими в поле (сон — в 30–40 клетках от здания)
    wear = createWear(192, 768);
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
    house = createBuilding({ E, mats, bevel: !!quality.bevel, pom: !!quality.taa, onChange: function () { if (post && post.gi) post.gi.markDirty(); },
      onPiece: function (x, y, z, kind) { if (life) life.puff(x, y, z, kind); } });
    yard = createYard({ E, mats });
    scaffold = createScaffold({ E, mats });
    crew = createCrew({ E, factory, mats, wear, camera, sky,
      layPoint: function (b, from, out) { return house.layPoint(b, from, out); },
      kindAt: function (x, y, z) { return house.kindAt(x, y, z); } });
    scene.add(house.group, yard.group, scaffold.group, crew.group);
    viewGroups = [house.group, yard.group, scaffold.group, crew.group];
    B.on(function (event) { react(event); each('react', event); });
    // погода и живность: дождь, пыль, мошкара, птицы
    life = createLife(scene, quality, { camera, weather: 'clear', chimneys: function () { return house ? house.chimneyTops() : []; },
      // высота земли на экране (следы на снегу лежат по ней)
      ground: function (x, z) { return meshHeight(terrain, x, z); },
      onFx: function () {} });
    await progress(0.9, 'Свет…');
    // глубина резкости — только у камеры за рабочим (съёмка, ролик): фокус на нём
    const postOpts = { sky, lights: function () { return lights ? lights.lights : []; },
      focus: function () { return follow && crew && crew.figure(follow.i) ? camera.position.distanceTo(_tgt) : 0; } };
    // «Телефон» — один проход в холст (mobile.js), «Высокая» — композер с MSAA-целью (post.js), выше — render.js
    post = quality.taa ? createRender(renderer, scene, camera, quality, postOpts) : quality.mobile ? createMobile(renderer, scene, camera) : createPost(renderer, scene, camera, quality, postOpts);
    syncSize(true);
    if (post.gi) {
      // отражённый свет: здание, леса, двор и рельеф (рабочие — нет)
      post.gi.setGround(terrain, splat);
      bindSiteGI();
    }
    sky.update(state.hour, 0, target);
    await progress(0.93, 'Площадка и квартал…');
    await loadPlugins({ THREE, renderer, scene, camera, target, quality, tier, mats, textures, terrain, sky, E, B, CELL, params, state, house, yard, crew, scaffold,
      ground: function (x, z) { return meshHeight(terrain, x, z); }, linkSkyTree: linkSkyTree, markGI: function () { if (post && post.gi) post.gi.markDirty(); } });
    mark('модули');
    linkSkyTree(scene);
    mark('свет и G-буфер');
    state.ready = true;
  }

  // ---------- площадка ----------
  // Габариты здания в метрах (footprint логики — в клетках; куб x занимает [2x, 2x + 2]).
  function siteBounds() {
    const fp = world.level.footprint;
    return { x0: fp.minX * CELL, x1: (fp.maxX + 1) * CELL, z0: fp.minZ * CELL, z1: (fp.maxZ + 1) * CELL, h: (fp.maxY + 1) * CELL };
  }
  // Столы планирования (дома рабочих): середина — «двор» площадки.
  function yardCenter() {
    let x = 0, z = 0, n = 0;
    world.builders.forEach(function (b) {
      if (b.trade === 'engineer' || !b.homeCell) return;
      x += (b.homeCell[0] + 0.5) * CELL; z += (b.homeCell[2] + 0.5) * CELL; n++;
    });
    if (n) return [x / n, z / n];
    const b = siteBounds();
    return [(b.x0 + b.x1) / 2, b.z1 + 12];
  }
  function emptyLayout() {
    return { site: { x: 0, z: 0, rx: 14, rz: 14 }, yard: { x: 0, z: 24, rx: 6, rz: 4.5 }, spots: [], roads: [] };
  }
  // Покрытие земли: дно карьера оригинала — земля без травы (site-layout.js → pit), щебень под карьерами и у столов,
  // колеи оригинала и дорога со двора в лес.
  function layoutOf() {
    const spots = world.level.mines.map(function (mine) {
      let sx = 0, sz = 0;
      mine.rocks.forEach(function (r) { sx += r.x + 0.5; sz += r.z + 0.5; });
      return [sx / mine.rocks.length * CELL, sz / mine.rocks.length * CELL, 6.5];
    });
    const y = yardCenter();
    spots.push([y[0], y[1], 5]);
    return {
      site: sitePit(world, B.campaign, B.meta, window.MicroBuildersMeta, CELL),
      yard: { x: y[0], z: y[1], rx: 6, rz: 4.5 },
      spots: spots,
      roads: [[[y[0], y[1] + 3], [y[0] + 30, y[1] + 175], 3.4]].concat(siteRoads(world, B.campaign, B.meta, window.MicroBuildersMeta, CELL)),
    };
  }
  function disposeGroup(g) {
    const seen = new Set();
    g.traverse(function (o) {
      if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      if (o.isInstancedMesh) o.dispose();
    });
  }

  // Новая площадка (старт, следующий заказ, заново, смена площадки): покрытие, трава, здание, двор, бригада, свет.
  function buildSite(w) {
    world = w;
    // сезон главы (world.js): до травы — она собирается под сезон; лес и небо перекрашиваются сами
    setLevelSeason(w && B.campaign ? B.campaign.levelIndex : -1);
    // трава растёт по карте луга: на новой площадке — заново (не на глине у здания и не на дороге)
    splat.relayout(w ? layoutOf() : emptyLayout());
    scene.remove(grass.group); disposeGroup(grass.group);
    grass = createGrass(terrain, splat, [0, 0], quality.grass, 3, wear, CLEAR);
    linkSkyTree(grass.group);
    scene.add(grass.group);
    wear.fade(0);
    if (post && post.gi) post.gi.setGround(terrain, splat);
    if (lights) { scene.remove(lights.group); disposeGroup(lights.group); lights = null; }
    if (!w) { house.clear(); yard.clear(); scaffold.clear(); crew.clear(); each('clear'); return; }
    // мачты света — с открытием ночи (10-й уровень)
    if (B.MB.needOpen(B.campaign, 'night')) {
      lights = createLights(siteBounds(), mats, { shadowSize: quality.spotShadow });
      linkSkyTree(lights.group);
      scene.add(lights.group);
      showMasts(mode === 'site');
    }
    house.build(w);
    yard.build(w);
    scaffold.build(w);
    crew.build(w);
    each('build', w);
    follow = null; orbit = null;
    focusGI();
    fitShadow();
    if (post && post.resetHistory) post.resetHistory();
  }
  // отражённый свет площадки: здание, леса, двор, хозяйство и рельеф (рабочие — нет)
  function bindSiteGI() {
    post.gi.bind({ roots: function () { const sp = plugin('site'); return [house.group, yard.group, scaffold.group].concat(sp && sp.group ? [sp.group] : []); }, exclude: DYNAMIC });
  }
  // Мачты света в квартале: прячутся сами мачты, а прожекторы гаснут силой (lights.night(0) в кадре) — число
  // источников не меняется, программы шейдеров не пересобираются.
  function showMasts(on) {
    if (lights) lights.group.children.forEach(function (o) { if (o.isMesh) o.visible = on; });
  }
  // объём отражённого света — над зданием, воксель по его размеру
  function focusGI() {
    if (!post || !post.gi) return;
    const b = siteBounds();
    const span = Math.max(b.x1 - b.x0, b.z1 - b.z0) + 16;
    post.gi.setExtent(Math.max(40 / 128, span / 128, (b.h + 4) / 48));
    post.gi.setCenter((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
  }
  function fitShadow() {
    const b = siteBounds();
    const radius = THREE.MathUtils.clamp(Math.max(b.x1 - b.x0, b.z1 - b.z0) * 0.75 + b.h * 0.5 + 10, 26, 70);
    sky.fitShadow(target, radius);
  }

  // Отклик вида на события мира (экономику и звук ведёт оригинал).
  const recorded = { on: false, list: [] };
  function react(event) {
    if (event.type === 'complete') {
      if (crew) crew.cheer(3.5);
      if (post && post.gi) post.gi.markDirty();
    }
    if (event.type === 'scaffold' || event.type === 'strip' || event.type === 'scaffoldWear') scaffoldClock = 99;
    if (recorded.on && event.type === 'pour' && event.block) recorded.list.push({ type: 'place', material: event.block.materialId, cell: [event.block.x, event.block.y, event.block.z] });
  }

  // Час неба как у оригинала (game.js → updateSky): на площадке до открытия ночи, в квартале и под заставкой —
  // 13:00, с 10-го уровня — часы стройки (MicroBuildersSim.dayClock).
  function viewHour() {
    if (state.fixedHour !== null) return state.fixedHour;
    const Sim = window.MicroBuildersSim, c = B.campaign;
    const ENV = Sim.ENVIRONMENT;
    const live = !!c && c.status !== 'title' && B.MB.needOpen(c, 'night');
    return Sim.dayClock(live ? c.levelElapsed : (13 - ENV.startHour) * ENV.hourSeconds).hour;
  }
  // Погода оригинала (MicroBuildersSim.weatherAt → balance.json weather.kinds) → небо и частицы вида.
  let weatherShown = null, weatherPinned = false;
  function syncWeather() {
    if (!life || weatherPinned) return;
    const c = B.campaign;
    const kind = c && c.status !== 'title' ? window.MicroBuildersSim.weatherAt(c.levelIndex, c.levelElapsed) : '';
    const mode = kind === 'rain' || kind === 'storm' ? 'rain' : kind === 'snow' ? 'snow' : 'clear';
    if (mode === weatherShown) return;
    life.force(mode, weatherShown === null);
    weatherShown = mode;
  }

  // ---------- камера ----------
  // Копия камеры оригинала: позиция ×2, тот же поворот, угол обзора и сдвиг проекции под интерфейс (view) — таблички,
  // значки и выбор тапом совпадают по пикселям. Свои near/far: горы стоят в 0,6–3,8 км.
  function copyCamera(src) {
    camera.copy(src, false);
    camera.position.multiplyScalar(2);
    camera.near = 0.15;
    camera.far = 4000;
    // за поляной рельеф выше нуля: камера не уходит в холм
    const ground = meshHeight(terrain, camera.position.x, camera.position.z) + 1.2;
    if (camera.position.y < ground) camera.position.y = ground;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const cc = window.MicroBuildersCamera.current;
    camera.getWorldDirection(_v);
    target.copy(camera.position).addScaledVector(_v, (cc ? cc.radius : 20) * 2);
  }
  // облёт закрытого вида: сдвиг угла вокруг рабочего (рад) и доля высоты (под потолком — ниже); по порядку предпочтения
  const DODGE = [[0, 1], [0, 0.6], [0.6, 1], [-0.6, 1], [0.6, 0.6], [-0.6, 0.6], [1.2, 1], [-1.2, 1], [1.8, 1], [-1.8, 1], [Math.PI, 1], [Math.PI, 0.6]];
  function directCamera(dt) {
    if (follow && crew) {
      const w = crew.figure(follow.i);
      if (!w) return false;
      follow.angle += (follow.spin || 0) * dt;
      _tgt.set(w.pos.x, w.pos.y + follow.look, w.pos.z);
      // Камера ходит по кругу вокруг рабочего: угол сглажен, расстояние держится, рабочий в центре кадра. За стену и
      // под перекрытие не уходит: отрезок от рабочего к камере по брускам готовых деталей; закрыто — ближний
      // свободный угол или ниже, не нашлось — ближе к рабочему у первой детали.
      const clear = function (ang, lift) {
        _cam.set(w.pos.x + Math.sin(ang) * follow.dist, w.pos.y + follow.height * lift, w.pos.z + Math.cos(ang) * follow.dist);
        return house ? house.blocked(_tgt, _cam) : 1;
      };
      const base = w.heading + follow.angle;
      if (follow.yaw === undefined || follow.snap) { follow.dodge = 0; follow.lift = 1; follow.dodgeTo = 0; follow.liftTo = 1; }
      if (follow.snap || clear(base + follow.dodge, follow.lift) < 0.7) {
        let bestK = -1;
        DODGE.forEach(function (c) {
          const k = clear(base + c[0], c[1]);
          if (k > bestK + 0.05) { bestK = k; follow.dodgeTo = c[0]; follow.liftTo = c[1]; }
        });
      } else if ((follow.dodgeTo !== 0 || follow.liftTo !== 1) && clear(base, 1) > 0.95) { follow.dodgeTo = 0; follow.liftTo = 1; }
      const kd = follow.snap ? 1 : 1 - Math.exp(-dt * 2.5);
      follow.dodge += (follow.dodgeTo - follow.dodge) * kd;
      follow.lift += (follow.liftTo - follow.lift) * kd;
      const want = base + follow.dodge;
      if (follow.yaw === undefined || follow.snap) follow.yaw = want;
      else follow.yaw += Math.atan2(Math.sin(want - follow.yaw), Math.cos(want - follow.yaw)) * (1 - Math.exp(-dt * (follow.smooth || 2.5)));
      const kk = clear(follow.yaw, follow.lift);
      if (kk < 1) _cam.lerp(_tgt, 1 - Math.max(0.15, kk - 0.08));
      // положение — с малой задержкой: гасит дрожь шага, рабочий не уходит из центра кадра
      const k = follow.snap ? 1 : 1 - Math.exp(-dt * 10);
      follow.snap = false;
      rig.pos.lerp(_cam, k);
      rig.target.lerp(_tgt, k);
    } else if (orbit) {
      orbit.angle += orbit.speed * dt;
      rig.pos.set(orbit.center[0] + Math.sin(orbit.angle) * orbit.radius, orbit.height, orbit.center[2] + Math.cos(orbit.angle) * orbit.radius);
      rig.target.set(orbit.center[0], orbit.center[1], orbit.center[2]);
    } else if (fixed) {
      rig.pos.copy(fixed.pos);
      rig.target.copy(fixed.target);
    } else return false;
    // проекция — от камеры оригинала (угол, кадр), без сдвига под интерфейс: снимки идут без него
    camera.clearViewOffset();
    camera.position.copy(rig.pos);
    target.copy(rig.target);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    return true;
  }

  // ---------- размер ----------
  // Холст ведёт оригинал (рамка телефона, чёткость по качеству игры): вид берёт его размер и считает кадр
  // в своём разрешении (динамическое — ниже при нехватке кадров).
  // на «Телефоне» своего динамического разрешения нет: холст в MSAA, чёткость снижает оригинал
  const dyn = { scale: 1, t: -4, frames: 0, cool: 0, enabled: !params.has('fixedres') && !quality.mobile };
  let sizeKey = '';
  function syncSize(force) {
    renderer.getSize(_sz);
    const pr = renderer.getPixelRatio();
    const key = _sz.x + 'x' + _sz.y + '@' + pr + '/' + dyn.scale;
    if (key === sizeKey && !force) return;
    sizeKey = key;
    if (post.taa) post.setSize(_sz.x, _sz.y, pr, dyn.scale * (quality.ss || 1));
    else post.setSize(_sz.x, _sz.y, pr * dyn.scale);
  }
  // Меньше 50 кадров в секунду два окна по 2 с — кадр считается в меньшем разрешении (до 0,55 по стороне),
  // больше 85 — возвращается к полному. Ступени качества (чёткость холста, тени) — за оригиналом.
  function watchFrame(dt) {
    if (!dyn.enabled || opts.hook.manual) return;
    dyn.t += dt; dyn.frames++; dyn.cool -= dt;
    if (dyn.t < 2) return;
    const fps = dyn.frames / dyn.t;
    dyn.t = 0; dyn.frames = 0;
    let next = dyn.scale;
    const strict = tier === 'max';
    const low = strict ? 56 : 50, high = strict ? 80 : 85;
    if (fps < low && dyn.scale > 0.55) next = Math.max(0.55, dyn.scale * 0.86);
    else if (fps > high && dyn.scale < 1 && dyn.cool <= 0) next = Math.min(1, dyn.scale * 1.1);
    if (next !== dyn.scale) { dyn.scale = next; dyn.cool = 6; }
  }

  // ---------- кадр ----------
  // Квартал штаба — свой вид (city.js), пока он не готов (active) — кадр оригинала; заставка без мира — тоже.
  let cityRoot = null;
  function passThrough(origScene) {
    if (!cityRoot) cityRoot = origScene.children.find(function (o) { return o.isGroup && o.children.some(function (c) { return c.userData && c.userData.buildingId !== undefined; }); }) || null;
    if (cityRoot && cityRoot.visible) { const city = plugin('city'); return !(city && city.active); }
    return !B.D || !B.D.world();
  }
  // экран: площадка или квартал — что из вида показывать
  let mode = 'site';
  function setMode(next) {
    if (next === mode) return;
    mode = next;
    const site = next === 'site';
    [house.group, yard.group, scaffold.group, crew.group].forEach(function (g) { g.visible = site; });
    if (grass) grass.group.visible = site;
    showMasts(site);
    const sp = plugin('site');
    if (sp && sp.group) sp.group.visible = site;
    const fp = plugin('fx');
    if (fp && fp.group) fp.group.visible = site;
    const city = plugin('city');
    if (city && city.group) city.group.visible = !site;
    // отражённый свет и квадрат теней — по кварталу или по площадке
    if (post && post.gi) {
      if (!site && city && city.giRoots) {
        post.gi.bind({ roots: city.giRoots, exclude: DYNAMIC });
        post.gi.setExtent(110 / 128);
        giAt.set(1e9, 0, 0);
      } else if (world) { bindSiteGI(); focusGI(); }
    }
    if (site && world) fitShadow(); else sky.fitShadow(target, 70);
    if (post && post.resetHistory) post.resetHistory();
  }
  const giAt = new THREE.Vector3(1e9, 0, 0);

  function frame(origScene, origCamera, dtOverride) {
    const now = performance.now();
    const dt = dtOverride !== undefined ? dtOverride : Math.min(0.1, (now - last) / 1000);
    last = now;
    const t0 = performance.now();
    state.time += dt;
    const changed = B.poll(dt);
    if (changed || B.rebuilds !== builtRebuilds) { builtRebuilds = B.rebuilds; buildSite(B.world); }
    B.dispatch();
    B.drainFx(function (name, args) { each('call', name, args); });
    const c = B.campaign;
    state.tempo = c && c.status === 'play' ? B.tempo : 1;
    setMode(cityRoot && cityRoot.visible ? 'city' : 'site');
    // ход вида
    house.update(dt);
    yard.update();
    scaffoldClock += dt;
    if (scaffoldClock > 0.1) { scaffoldClock = 0; if (scaffold.update() && post && post.gi) post.gi.markDirty(); }
    crew.update(dt, state.time, state.tempo);
    // новые меши вида — сразу с небом и G-буфером (иначе кадр-другой их не видно)
    viewGroups.forEach(linkSkyTree);
    if ((state.frames & 63) === 0) linkSkyTree(scene);
    // камера
    copyCamera(origCamera);
    directCamera(dt);
    state.hour = viewHour();
    syncWeather();
    sky.follow(camera);
    sky.update(state.hour, state.time, target);
    if (lights) lights.night(mode === 'site' ? sky.state.night : 0);
    house.ghostLight(sky.state.night);
    grass.update(state.time);
    // трава под ногами ближайших к камере рабочих на земле
    // (бригада отдаёт точки примятия: у лежащего — голова, таз, колени, у сидящего — две)
    if (grass.push && crew) grass.push(crew.pressPoints(camera));
    // отражённый свет квартала — за камерой оригинала
    if (mode === 'city' && post && post.gi && giAt.distanceTo(target) > 20) { giAt.copy(target); post.gi.setCenter(target.x, target.z); }
    wear.update(dt);
    info.dt = dt; info.time = state.time; info.hour = state.hour; info.night = sky.state.night; info.tempo = state.tempo;
    info.camera = camera; info.target = target; info.origScene = origScene; info.origCamera = origCamera; info.mode = mode; info.cityRoot = cityRoot;
    each('update', dt, info);
    const sim = Math.min(0.25, dt * state.tempo);
    life.update(dt, sim, state.time, state.hour, sky, crew.views().filter(Boolean).map(function (v) { return v.w; }), lights ? lights.lights : []);
    // свой тон-маппинг (AgX) и экспозиция по небу — только на время кадра вида (перехват вернёт оригинальные)
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = sky.state.exposure * exposureGain;
    syncSize(false);
    post.render(state.time);
    state.cpuMs += (performance.now() - t0 - state.cpuMs) * 0.05;
    state.frames++;
    watchFrame(dt);
  }

  // программы кадра вида — для ожидания сборки шейдеров игрой (game.js → shadersReady)
  function compile() {
    if (post.compile) return post.compile();
    return renderer.compile(scene, camera);
  }

  // ---------- отладка ----------
  function debugApi() {
    const D = B.D;
    const api = {
      ready: false,
      timings: function () { return TIMINGS; },
      weather: function (mode, instant) { if (life && mode !== undefined) { weatherPinned = mode !== null; if (mode) life.force(mode, instant); else weatherShown = null; } return life ? life.state() : null; },
      state: function () {
        const w = B.world, cc = B.campaign;
        return { ready: state.ready, hour: Math.round(state.hour * 100) / 100, quality: state.quality, frames: state.frames, passFrames: opts.hook.passFrames, tempo: state.tempo,
          scale: Math.round(dyn.scale * 100) / 100, cpuMs: Math.round(state.cpuMs * 10) / 10, calls: opts.hook.counts.calls, tris: opts.hook.counts.tris,
          textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, error: opts.hook.error ? String(opts.hook.error.stack || opts.hook.error) : null,
          level: cc ? cc.levelIndex + 1 : 0, name: w ? w.level.name : '', status: cc ? cc.status : '', elapsed: cc ? Math.round(cc.levelElapsed) : 0, runMode: cc ? cc.runMode : '',
          progress: w ? Math.round((1 - w.remaining / w.blocks.length) * 1000) / 1000 : 0, blocks: w ? w.blocks.length : 0, coins: cc ? Math.round(cc.coins) : 0,
          capital: D.meta() ? Math.round(D.meta().capital) : 0, screen: D.panel().screen, weather: weatherShown, mode: mode,
          plugins: plugins.map(function (p) { return { name: p.name, ok: !!p.api, error: p.error }; }),
          workers: w ? w.builders.map(function (b) { return b.phase + (b.walkPurpose && b.phase === 'walk' ? ':' + b.walkPurpose : ''); }) : [], life: life ? life.state() : null };
      },
      // час неба вручную; null — снова часы оригинала
      time: function (h) { state.fixedHour = h === null || h === undefined ? null : h; state.hour = viewHour(); return state.hour; },
      fixHour: function (on) { if (!on) state.fixedHour = null; return state.fixedHour !== null; },
      // Ручной кадр: в rAF вид не рисует (холст держит последний кадр), RustDebug.frame(dt) — один кадр: вид
      // оригинала на dt (анимации, камера) и кадр вида. Ход мира — MicroBuildersDebug.step.
      manual: function (on) { opts.hook.manual = !!on; if (!on) last = performance.now(); return opts.hook.manual; },
      frame: function (dt) {
        forcedDt = dt === undefined ? 1 / 60 : dt;
        opts.hook.allow = true;
        try { D.viewFrame(forcedDt, true); } finally { opts.hook.allow = false; forcedDt = undefined; }
        return state.frames;
      },
      record: function (on) { recorded.on = !!on; recorded.list.length = 0; return recorded.on; },
      drain: function () { const list = recorded.list.splice(0); return { events: list, cam: camera.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }), hour: state.hour, night: sky.state.night }; },
      game: function () { return D; },
      renderer: function () { return renderer; },
      three: function () { return THREE; },
      sky: function () { return sky; },
      scene: function () { return scene; },
      post: function () { return post; },
      house: function () { return house; },
      plugin: function (name) { return plugin(name); },
      // Бюджет по частям сцены (без отсечения по камере): мешей, видимых, треугольников (с экземплярами), из них
      // отбрасывающих тень — что облегчать на «Телефоне».
      budget: function () {
        const out = [];
        scene.children.forEach(function (root) {
          const row = { name: root.name || root.type, meshes: 0, visible: 0, tris: 0, shadowTris: 0 };
          root.traverse(function (o) {
            if (!(o.isMesh || o.isPoints || o.isLine) || !o.geometry) return;
            row.meshes++;
            let vis = o.visible;
            for (let p = o.parent; vis && p; p = p.parent) vis = p.visible;
            if (!vis) return;
            row.visible++;
            const g = o.geometry;
            const n = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
            const inst = o.isInstancedMesh ? o.count : g.isInstancedBufferGeometry ? g.instanceCount : 1;
            const tris = o.isMesh ? Math.round(n / 3 * (Number.isFinite(inst) ? inst : 1)) : 0;
            row.tris += tris;
            if (o.castShadow) row.shadowTris += tris;
          });
          out.push(row);
        });
        return out.sort(function (a, b) { return b.tris - a.tris; });
      },
      crew: function () { return crew; },
      // сезон вручную ('autumn', 'winter'…; 'auto' — снова по главе): площадка пересоберётся в следующем кадре
      season: function (name) { if (name === 'auto') { unpinSeason(); builtRebuilds = -1; } else if (name) { setSeason(name, true); builtRebuilds = -1; } return SEASON.name + (SEASON.pinned ? ' (pinned)' : ''); },
      gpu: function () { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); },
      hud: function (on) { document.body.classList.toggle('rust-shot', !on); return !!on; },
      camera: function () { return { pos: camera.position.toArray(), target: target.toArray() }; },
      // своя камера вместо камеры оригинала (снимки): за рабочим, облёт, точка; home — снова камера оригинала
      follow: function (o) { follow = o ? Object.assign({ angle: 0.9, dist: 3.4, height: 1.6, look: 1.1, snap: true }, o) : null; orbit = null; fixed = null; if (follow) { rig.pos.copy(camera.position); rig.target.copy(target); } return !!follow; },
      orbit: function (o) { orbit = o || null; follow = null; fixed = null; return !!orbit; },
      view: function (pos, tgt) { fixed = { pos: new THREE.Vector3().fromArray(pos), target: new THREE.Vector3().fromArray(tgt) }; follow = null; orbit = null; return true; },
      home: function () { follow = null; orbit = null; fixed = null; return true; },
      // контур здания и центр двора, м (кадры снимков)
      layout: function () { if (!world) return null; const b = siteBounds(), y = yardCenter(); return { x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1, h: b.h, yx: y[0], yz: y[1] }; },
      // проверка движений: рабочий i играет действие на месте (null — снова по логике)
      pose: function (i, action, o) { return crew.pose(i, action || null, o); },
      worker: function (i) {
        const v = crew.views()[i];
        if (!v) return null;
        const b = v.builder;
        return { pos: v.w.pos.toArray(), phase: b.phase, purpose: b.walkPurpose, carry: b.carry.length, action: v.w.anim.action, cell: b.cell.slice() };
      },
      // рабочий за делом: фаза логики (или 'walk:назначение'), с ношей, на лестнице, без соседей ближе clear м,
      // до конца дела (таймер логики) не меньше left с игры
      pickWorker: function (phase, carry, ladder, clear, left) {
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
          if (left && !(b.timer > left)) continue;
          return i;
        }
        return -1;
      },
      // уровень вида на следующий запуск (null — снова по устройству)
      quality: function (key) { try { if (key) localStorage.setItem('rust.quality', key); else localStorage.removeItem('rust.quality'); } catch (e) { /* без хранилища */ } return key; },
    };
    return api;
  }
  let forcedDt;

  return {
    scene, camera, quality, state, prepare, compile, passThrough, debugApi,
    ready: function () { return state.ready; },
    frame: function (origScene, origCamera) { frame(origScene, origCamera, forcedDt); },
  };
}
