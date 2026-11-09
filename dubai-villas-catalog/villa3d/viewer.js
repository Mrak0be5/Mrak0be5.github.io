// Просмотр 3D-модели виллы: атмосферное небо с солнцем, отражения от неба, мягкие тени, затенение в углах (GTAO),
// вращение мышью/пальцем, готовые ракурсы, пролёт и прогулка по дому.
// mount(container, build, { onTour, onWalk, quality }) — build(THREE) возвращает
// { root, views, tour?, doors?, phys?, spawns?, rooms?, inside?, update?, setQuality?, sun? }.
// views: { имя: { pos, target, clip? } } — clip режет модель по высоте (поэтажный план сверху).
// phys + spawns включают прогулку от первого лица (walk.js): столкновения со стенами, ступени, подписи комнат.
// quality: 'high' — постобработка (GTAO, MSAA), тени 4096, физическое стекло; 'low' — для телефонов.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Walker } from './walk.js?v=vd1-fix-20261106';

const HAZE = new THREE.Color(0xc9d6e0);

// Небо Притэма: днём над Дубаем — светлое, с дымкой у горизонта. noDisc — без диска солнца (для карты отражений:
// солнце и так светит направленным светом, второй блик от неба удвоил бы его).
function makeSky(sunDir, noDisc) {
  const sky = new Sky();
  sky.scale.setScalar(1000);
  const u = sky.material.uniforms;
  u.turbidity.value = 4.2;
  u.rayleigh.value = 1.9;
  u.mieCoefficient.value = 0.0045;
  u.mieDirectionalG.value = 0.8;
  u.sunPosition.value.copy(sunDir);
  if (noDisc) sky.material.fragmentShader = sky.material.fragmentShader.replace('L0 += ( vSunE * 19000.0 * Fex ) * sundisk;', '');
  sky.frustumCulled = false;
  sky.userData.noAO = true;
  return sky;
}

function canvasTex(w, h, draw, srgb = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Для карты отражений: земля, далёкая полоса деревьев и домов на горизонте — чтобы стекло и вода отражали не пустое небо.
function horizonRing() {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const tex = canvasTex(2048, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) {
      const t = r();
      const top = h * (0.38 + 0.4 * r() * r());
      ctx.fillStyle = t < 0.08 ? '#e8e6df' : `rgb(${58 + t * 40},${74 + t * 40},${44 + t * 20})`;
      ctx.fillRect(x, top, 4 + r() * 10, h - top);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(700, 700, 60, 64, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.BackSide, fog: false }));
  ring.position.y = 10;
  return ring;
}

// Маршрут пролёта: сплайн через точки камеры и отдельный сплайн через точки взгляда с тем же параметром.
// Скорость ровная по длине пути (speed на участке, м/с), hold — остановка в точке, плавный разгон и торможение у остановок.
function makeTour(stops) {
  const n = stops.length;
  const path = new THREE.CatmullRomCurve3(stops.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal');
  const lookPath = new THREE.CatmullRomCurve3(stops.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal');
  const DIV = 24;
  path.arcLengthDivisions = (n - 1) * DIV;
  const lengths = path.getLengths(path.arcLengthDivisions);
  const total = lengths[lengths.length - 1];
  const at = stops.map((_, i) => lengths[i * DIV] / total);
  const segs = [];
  let t = 0;
  for (let i = 0; i < n; i++) {
    if (stops[i].hold) { segs.push({ i, start: t, end: t + stops[i].hold, hold: true }); t += stops[i].hold; }
    if (i === n - 1) break;
    const len = (at[i + 1] - at[i]) * total;
    const easeIn = i === 0 || !!stops[i].hold, easeOut = i === n - 2 || !!stops[i + 1].hold;
    const dur = Math.max(0.4, (len / (stops[i].speed || 1.8)) * (easeIn || easeOut ? 1.35 : 1));
    segs.push({ i, start: t, end: t + dur, u0: at[i], u1: at[i + 1], easeIn, easeOut });
    t += dur;
  }
  const labels = [];
  let current = '';
  for (const s of stops) { if (s.label) current = s.label; labels.push(current); }
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  return {
    duration: t,
    pose(time) {
      const seg = segs.find((s) => time < s.end) || segs[segs.length - 1];
      let u, index = seg.i;
      if (seg.hold) u = at[seg.i];
      else {
        let k = Math.min(1, Math.max(0, (time - seg.start) / (seg.end - seg.start)));
        if (seg.easeIn && seg.easeOut) k = k * k * (3 - 2 * k);
        else if (seg.easeIn) k = k * k * (2 - k);
        else if (seg.easeOut) k = k * (1 + k - k * k);
        u = seg.u0 + (seg.u1 - seg.u0) * k;
        if (k > 0.5) index = seg.i + 1;
      }
      const tt = path.getUtoTmapping(Math.min(1, Math.max(0, u)));
      path.getPoint(tt, pos);
      lookPath.getPoint(tt, look);
      return { pos, look, label: labels[index] };
    }
  };
}

export function mount(container, build, options = {}) {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  let quality = options.quality || (coarse ? 'low' : 'high');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!options.preserveDrawingBuffer, powerPreference: 'high-performance' });
  const webgl2 = renderer.capabilities.isWebGL2;
  const dprFor = (q) => Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1.5);
  renderer.setPixelRatio(dprFor(quality));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = { aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping, agx: THREE.AgXToneMapping }[options.toneMapping] || THREE.NeutralToneMapping;
  const EXPOSURE = options.exposure || 0.85;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;     // солнце неподвижно: тени пересчитываются только когда что-то сдвинулось
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.append(renderer.domElement);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const model = build(THREE, { quality, ...(options.buildOptions || {}) });

  // солнце: модель может задать направление (азимут от +X к +Z и высоту в градусах); по умолчанию — дубайский день, юго-запад
  const sunCfg = model.sun || { azimuth: 145, elevation: 38 };
  const az = THREE.MathUtils.degToRad(sunCfg.azimuth), el = THREE.MathUtils.degToRad(sunCfg.elevation);
  const sunDir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();

  const scene = new THREE.Scene();
  const skyMesh = makeSky(sunDir, false);
  scene.add(skyMesh);
  scene.fog = new THREE.FogExp2(HAZE, 0.0009);

  // карта отражений и рассеянного света — от того же неба без диска, с землёй и полосой деревьев у горизонта
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = makeSky(sunDir, true);
  envScene.add(envSky);
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.23, 0.24, 0.16) }));
  envGround.rotation.x = -Math.PI / 2;
  envGround.position.y = -2;
  envScene.add(envGround, horizonRing());
  let envTarget = pmrem.fromScene(envScene, 0, 0.1, 2000);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = options.envIntensity || 0.75;

  const hemi = new THREE.HemisphereLight(0xdfe8ef, 0xb59a74, 0.12);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e4, options.sunIntensity || 7.5);
  sun.position.copy(sunDir).multiplyScalar(90);
  sun.castShadow = true;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.025;
  Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 20, far: 190 });
  scene.add(sun, sun.target);
  const setShadowSize = (q) => {
    const size = q === 'high' ? 4096 : 2048;
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
  };
  setShadowSize(quality);

  // время суток: азимут от +X к +Z (восток = 0°, юг = 90°, запад = 180°), высота в градусах; lights — свет в доме
  const SUN_I = options.sunIntensity || 7.5, ENV_I = options.envIntensity || 0.75;
  let sunState = { azimuth: sunCfg.azimuth, elevation: sunCfg.elevation, lights: 0 };
  let nightLights = [];
  function setSun(cfg = {}) {
    sunState = { ...sunState, ...cfg };
    const a = THREE.MathUtils.degToRad(sunState.azimuth), e = THREE.MathUtils.degToRad(sunState.elevation);
    sunDir.set(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)).normalize();
    for (const m of [skyMesh, envSky]) m.material.uniforms.sunPosition.value.copy(sunDir);
    const day = THREE.MathUtils.smoothstep(sunState.elevation, -3, 14);
    const warm = 1 - THREE.MathUtils.smoothstep(sunState.elevation, 4, 30);
    sun.color.setRGB(1, 0.95 - 0.25 * warm, 0.9 - 0.48 * warm);
    sun.intensity = SUN_I * day;
    sun.position.copy(sunDir).multiplyScalar(90);
    sun.castShadow = day > 0.02;
    hemi.intensity = 0.12 * (0.3 + 0.7 * day) + 0.5 * (1 - day);   // ночью — лунный свет и зарево города
    hemi.color.setRGB(0.87 - 0.45 * (1 - day), 0.91 - 0.38 * (1 - day), 0.94 - 0.18 * (1 - day));
    envTarget.dispose();
    envTarget = pmrem.fromScene(envScene, 0, 0.1, 2000);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = ENV_I * (0.35 + 0.65 * day);
    scene.fog.color.setRGB(0.79 - 0.35 * warm * (1 - day), 0.84 - 0.45 * (1 - day), 0.88 - 0.5 * (1 - day));
    // ниже солнце — выше экспозиция (как глаз), вечером в доме включается свет
    exposureNight = 1 + 2.2 * (1 - day);
    const lights = sunState.lights ?? (day < 0.5 ? 1 : 0);
    if (typeof model.setLights === 'function') model.setLights(lights);
    for (const l of nightLights) scene.remove(l);
    nightLights = [];
    if (lights && Array.isArray(model.nightLights)) for (const [x, y, z, k] of model.nightLights) {
      const l = new THREE.PointLight(0xffc98a, (k || 1) * 11 * lights, 10, 2);
      l.position.set(x, y, z);
      scene.add(l);
      nightLights.push(l);
    }
    exposureTarget = currentExposureBase();
    shadowDirty = true;
  }
  let exposureNight = 1;

  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: 0x9a9a6c, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  scene.add(ground);

  // Внутри дома отражения и рассеянный свет — от светлой тёплой комнаты с окнами, а не от неба:
  // материалы модели с userData.room получают эту среду вместо общей.
  const roomScene = new THREE.Scene();
  const tone = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.BackSide });
  const walls = tone(0.62, 0.58, 0.52);
  roomScene.add(new THREE.Mesh(new THREE.BoxGeometry(16, 5, 16), [walls, walls, tone(0.74, 0.72, 0.68), tone(0.55, 0.47, 0.36), walls, walls]));
  for (const [x, z, ry] of [[0, -7.9, 0], [7.9, 0, -Math.PI / 2]]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.8, 3.0) }));
    win.position.set(x, 0.3, z);
    win.rotation.y = ry;
    roomScene.add(win);
  }
  const roomTarget = pmrem.fromScene(roomScene, 0.03);

  // разрез по высоте для поэтажных планов: плоскость только у материалов модели, небо и земля остаются целыми
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  renderer.localClippingEnabled = true;
  const depthMats = new Map();
  model.root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !node.userData.noCast;
    node.receiveShadow = !node.userData.noReceive;
    for (const material of [].concat(node.material)) {
      if (material.userData.room) material.envMap = roomTarget.texture;
      material.clippingPlanes = [clipPlane];
      material.clipShadows = true;
      for (const key of ['map', 'normalMap', 'roughnessMap', 'alphaMap', 'bumpMap', 'aoMap']) if (material[key]) material[key].anisotropy = Math.min(maxAniso, 8);
    }
    // листва и другие вырезы по альфе: тень по форме листьев, а не квадратами
    const m = [].concat(node.material)[0];
    if (m.alphaTest > 0 && (m.map || m.alphaMap) && node.castShadow) {
      if (!depthMats.has(m)) depthMats.set(m, new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m.map, alphaMap: m.alphaMap, alphaTest: m.alphaTest, side: THREE.DoubleSide, clippingPlanes: [clipPlane], clipShadows: true }));
      node.customDepthMaterial = depthMats.get(m);
    }
  });
  for (const m of model.extraMaterials || []) { m.clippingPlanes = [clipPlane]; m.clipShadows = true; }
  scene.add(model.root);
  let shadowDirty = true;
  let planView = false;  // открыт поэтажный план (разрез): двери показываются открытыми, как на плане
  const feet = new THREE.Vector3();
  // состояние для модели: где наблюдатель (ступни) и что сейчас — обход, план, пролёт или прогулка
  function modelTick(dt, time) {
    if (typeof model.update !== 'function') return;
    let ctx;
    if (walker && walker.active) ctx = { mode: 'walk', observer: feet.copy(walker.pos) };
    else if (tourState !== 'idle') ctx = { mode: 'tour', observer: feet.copy(camera.position).add(new THREE.Vector3(0, -1.6, 0)) };
    else ctx = { mode: planView ? 'plan' : 'orbit', observer: null };
    if (model.update(dt, time, ctx)) shadowDirty = true;
  }
  const setClip = (y) => { const c = Number.isFinite(y) ? y : 1e6; if (clipPlane.constant !== c) { clipPlane.constant = c; shadowDirty = true; } };

  const ORBIT_FOV = 40, TOUR_FOV = 58;
  const camera = new THREE.PerspectiveCamera(ORBIT_FOV, 1, 0.3, 1500);
  const controls = new OrbitControls(camera, renderer.domElement);
  const ORBIT = { minDistance: 5, maxDistance: 170, enableZoom: true, enablePan: true };
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  Object.assign(controls, ORBIT);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 0.6;

  // ---------- постобработка: MSAA-буфер с плавающей точкой, GTAO, тонмаппинг AgX ----------
  let composer = null, gtao = null;
  function buildComposer() {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: webgl2 ? 4 : 0 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.normalMaterial.clippingPlanes = [clipPlane];
    gtao.updateGtaoMaterial({ radius: 0.75, distanceExponent: 1.6, thickness: 2.2, scale: 1.25, samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1.6, rings: 2, samples: 16 });
    gtao.blendIntensity = 0.92;
    // в буфер нормалей не попадают небо и листва (вырез по альфе он не знает — дал бы тёмные квадраты)
    const hideFor = gtao.overrideVisibility.bind(gtao);
    gtao.overrideVisibility = () => { hideFor(); scene.traverse((o) => { if (o.userData.noAO) o.visible = false; }); };
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
  }
  function dropComposer() {
    if (!composer) return;
    for (const pass of composer.passes) if (pass.dispose) pass.dispose();
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    composer = null;
    gtao = null;
  }
  function draw() {
    if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  const views = model.views || {};
  let tween = null;

  // ---------- пролёт ----------
  const route = Array.isArray(model.tour) && model.tour.length > 1 ? makeTour(model.tour) : null;
  // двери: распашные поворачиваются на openAngle, раздвижные (userData.slide = [dx, dz]) сдвигаются
  const doors = (model.doors || []).map((obj) => ({ obj, open: obj.userData.slide ? 1 : (obj.userData.openAngle || 0), target: 0, k: 0, base: obj.position.clone() }));
  function moveDoor(door, dt) {
    if (door.obj.userData.slide) {
      if (door.k !== door.target) {
        door.k = dt === Infinity ? door.target : door.k + Math.sign(door.target - door.k) * Math.min(Math.abs(door.target - door.k), dt * 1.1);
        shadowDirty = true;
      }
      const [sx, sz] = door.obj.userData.slide;
      door.obj.position.set(door.base.x + sx * door.k, door.base.y, door.base.z + sz * door.k);
    } else {
      const r = door.obj.rotation;
      if (r.y !== door.target) {
        r.y = dt === Infinity ? door.target : r.y + Math.sign(door.target - r.y) * Math.min(Math.abs(door.target - r.y), dt * 1.6);
        shadowDirty = true;
      }
    }
  }
  let tourState = 'idle';
  let tourTime = 0;
  let tourLabel = '';
  let lastNotice = 0;
  const lookAt = new THREE.Vector3();
  const notify = () => {
    if (typeof options.onTour === 'function') options.onTour({ state: tourState, label: tourLabel, progress: route ? tourTime / route.duration : 0, time: tourTime, duration: route ? route.duration : 0 });
  };
  const inside = typeof model.inside === 'function' ? model.inside : (p) => Math.abs(p.x) < 13.5 && Math.abs(p.z) < 8.2 && p.y < 10;
  function setNear(value, fov = camera.fov) {
    if (camera.near !== value || camera.fov !== fov) { camera.near = value; camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  // глаз привыкает к свету: в комнатах экспозиция выше, чем на улице
  let exposureTarget = EXPOSURE;
  let insideNow = false;
  const currentExposureBase = () => EXPOSURE * exposureNight * (insideNow ? 1.45 / Math.sqrt(exposureNight) : 1);
  const adaptTo = (p, instant) => {
    insideNow = inside(p);
    exposureTarget = currentExposureBase();
    if (instant) renderer.toneMappingExposure = exposureTarget;
  };
  function applyTour(instant) {
    const pose = route.pose(tourTime);
    camera.position.copy(pose.pos);
    lookAt.copy(pose.look);
    camera.lookAt(lookAt);
    setNear(inside(pose.pos) ? 0.05 : 0.3, TOUR_FOV); // в комнатах — широкий угол, как у архитектурной съёмки
    adaptTo(pose.pos, instant);
    if (pose.label !== tourLabel) { tourLabel = pose.label; notify(); }
  }
  function freeLook() { // на паузе можно оглядеться на месте: цель вращения в 5 см перед камерой
    const dir = lookAt.clone().sub(camera.position).normalize();
    controls.target.copy(camera.position).addScaledVector(dir, 0.05);
    Object.assign(controls, { minDistance: 0.01, maxDistance: 0.2, enableZoom: false, enablePan: false, enabled: true });
    controls.update();
  }
  function orbitMode() {
    Object.assign(controls, ORBIT, { enabled: true });
    setNear(0.3, ORBIT_FOV);
    insideNow = false;
    exposureTarget = currentExposureBase();
  }
  const tour = route && {
    get duration() { return route.duration; },
    get state() { return tourState; },
    get time() { return tourTime; },
    start() {
      tween = null;
      if (walker && walker.active) walker.stop();
      setClip(null);
      controls.autoRotate = false;
      controls.enabled = false;
      tourTime = 0;
      tourState = 'playing';
      for (const door of doors) door.target = door.open;
      applyTour();
      notify();
    },
    pause() {
      if (tourState !== 'playing') return;
      tourState = 'paused';
      freeLook();
      notify();
    },
    resume() {
      if (tourState !== 'paused') return;
      controls.enabled = false;
      tourState = 'playing';
      notify();
    },
    stop(toView = 'start') {
      if (tourState === 'idle') return;
      tourState = 'idle';
      tourLabel = '';
      for (const door of doors) door.target = 0;
      orbitMode();
      if (toView) setView(toView);
      notify();
    },
    seek(time) { // для проверок: поставить момент пролёта и нарисовать кадр
      tourTime = Math.min(route.duration, Math.max(0, time));
      setClip(null);
      for (const door of doors) { door.target = door.open; moveDoor(door, Infinity); }
      applyTour(true);
      modelTick(10, tourTime);
      draw();
      return tourLabel;
    }
  };
  // нажатие на модель во время пролёта — пауза; слушатель на перехвате, чтобы тем же движением сразу оглядеться
  renderer.domElement.addEventListener('pointerdown', () => { if (tour && tourState === 'playing') tour.pause(); }, { capture: true });

  let currentView = 'start';
  function setView(name, instant) {
    const view = views[name] || views.start;
    if (!view) return;
    currentView = views[name] ? name : 'start';
    if (walker && walker.active) { walkView = false; walker.stop(); }
    if (tour && tourState !== 'idle') { tourState = 'idle'; tourLabel = ''; for (const door of doors) door.target = 0; notify(); }
    orbitMode();
    setClip(view.clip);
    planView = Number.isFinite(view.clip);
    const from = { pos: camera.position.clone(), target: controls.target.clone() };
    const to = { pos: new THREE.Vector3(...view.pos), target: new THREE.Vector3(...view.target) };
    if (instant) {
      tween = null;
      camera.position.copy(to.pos);
      controls.target.copy(to.target);
      controls.update();
      insideNow = false;
      renderer.toneMappingExposure = currentExposureBase();
      return;
    }
    tween = { from, to, start: performance.now(), duration: 900 };
  }

  // ---------- прогулка от первого лица ----------
  const spawns = model.spawns && typeof model.spawns === 'object' ? model.spawns : null;
  const rooms = Array.isArray(model.rooms) ? model.rooms : [];
  let walkView = true;   // по выходу из прогулки вернуться к общему виду (кроме перехода на другой ракурс)
  let room = '';
  const roomAt = (p) => {
    for (const r of rooms) {
      const [x0, x1, y0, y1, z0, z1] = r.box;
      if (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1 && p.y >= y0 - 0.6 && p.y < y1) return r.name; // p — ступни
    }
    return '';
  };
  const walkNotify = (info) => { if (typeof options.onWalk === 'function') options.onWalk({ ...info, room }); };
  const walker = model.phys && spawns ? new Walker(camera, renderer.domElement, () => model.phys, {
    onChange(info) {
      if (info.active) {
        tween = null;
        controls.enabled = false;
        controls.autoRotate = false;
        setClip(null);
        setNear(0.05, 60);    // естественная перспектива глаза: 60° по вертикали
        for (const door of doors) door.target = door.open;
      } else {
        for (const door of doors) door.target = 0;
        room = '';
        if (walkView) setView('start'); else walkView = true;
      }
      walkNotify(info);
    }
  }) : null;
  const walk = walker && {
    spawns: Object.entries(spawns).map(([name, s]) => ({ name, label: s.label || name })),
    get active() { return walker.active; },
    get locked() { return walker.locked; },
    start(name) {
      const spawn = spawns[name] || Object.values(spawns)[0];
      if (tour && tourState !== 'idle') { tourState = 'idle'; tourLabel = ''; notify(); }
      walker.start(spawn);
      room = roomAt(walker.pos);
      adaptTo(walker.pos, true);
      walkNotify({ active: true, locked: walker.locked, coarse: walker.coarse });
    },
    stop() { walker.stop(); },
    relock() { walker.relock(); },
    // для проверок: пройти по нажатым клавишам заданное время и вернуть место
    step(keys, seconds, dt = 1 / 30) {
      walker.keys = new Set(keys);
      for (let t = 0; t < seconds; t += dt) { walker.update(dt); modelTick(dt, t); }
      walker.keys.clear();
      for (const door of doors) moveDoor(door, Infinity);
      adaptTo(walker.pos, true);
      draw();
      return { x: walker.pos.x, y: walker.pos.y, z: walker.pos.z, room: roomAt(walker.pos) };
    },
    look(yaw, pitch = 0) { walker.yaw = yaw; walker.pitch = pitch; walker.update(0); draw(); }
  };

  function setQuality(q) {
    quality = q === 'low' ? 'low' : 'high';
    renderer.setPixelRatio(dprFor(quality));
    setShadowSize(quality);
    if (typeof model.setQuality === 'function') model.setQuality(quality);
    if (quality === 'high') { if (!composer) buildComposer(); } else dropComposer();
    resize();
    shadowDirty = true;
  }

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    }
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  setQuality(quality);
  if (options.sun) setSun(options.sun);
  setView('start', true);

  let running = true;
  let frames = 0;
  const frameHooks = new Set();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmpV = new THREE.Vector3();
  let last = performance.now();
  const clock0 = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    for (const door of doors) moveDoor(door, dt);
    if (walker && walker.active) {
      walker.update(dt);
      adaptTo(walker.pos);
      const r = roomAt(walker.pos);
      if (r !== room) { room = r; walkNotify({ active: true, locked: walker.locked, coarse: walker.coarse }); }
    } else if (tourState === 'playing') {
      tourTime += dt;
      if (tourTime >= route.duration) {
        tourTime = route.duration;
        applyTour();
        tourState = 'idle';
        tourLabel = '';
        for (const door of doors) door.target = 0;
        orbitMode();
        controls.target.copy(lookAt);
        controls.update();
        notify();
      } else {
        applyTour();
        if (now - lastNotice > 250) { lastNotice = now; notify(); }
      }
    } else {
      if (tween) {
        const t = Math.min(1, (now - tween.start) / tween.duration);
        const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
        controls.target.lerpVectors(tween.from.target, tween.to.target, k);
        if (t >= 1) tween = null;
      }
      controls.update();
      // ближняя плоскость растёт с расстоянием облёта: точнее глубина, без мерцания граней издалека
      if (controls.maxDistance > 1) setNear(THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.012, 0.3, 1.5));
    }
    modelTick(dt, (now - clock0) / 1000);
    const e = renderer.toneMappingExposure;
    if (Math.abs(e - exposureTarget) > 1e-3) renderer.toneMappingExposure = e + (exposureTarget - e) * Math.min(1, dt * 2.5);
    draw();
    for (const cb of frameHooks) cb(dt);
    frames += 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  draw();

  return {
    setView,
    views: Object.keys(views),
    tour,
    walk,
    get quality() { return quality; },
    setQuality,
    setAutoRotate(on) {
      if (on && tour) tour.stop();
      if (on && walker && walker.active) walker.stop();
      controls.autoRotate = !!on;
    },
    get autoRotate() { return controls.autoRotate; },
    renderOnce() { controls.update(); modelTick(10, 0); draw(); },
    setSun,
    get sun() { return { ...sunState }; },
    onFrame(cb) { frameHooks.add(cb); return () => frameHooks.delete(cb); },
    // экранные координаты точки модели (для подписей комнат и замеров): null — за камерой
    project(x, y, z) {
      tmpV.set(x, y, z).project(camera);
      if (tmpV.z > 1) return null;
      const r = renderer.domElement.getBoundingClientRect();
      return { x: (tmpV.x * 0.5 + 0.5) * r.width, y: (-tmpV.y * 0.5 + 0.5) * r.height, behind: tmpV.z > 1 };
    },
    // точка модели под курсором (рулетка): учитывает разрез плана
    pick(clientX, clientY) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(model.root, true);
      const hit = hits.find((h) => h.point.y < clipPlane.constant - 0.001 && !(h.object.material && h.object.material.alphaTest > 0));
      return hit ? hit.point.clone() : null;
    },
    // мгновенный переход в точку (мини-карта): ступни в (x, y, z)
    teleport(x, y, z, yaw) {
      if (!walker) return;
      const spawn = { pos: [x, y, z], yaw: yaw ?? walker.yaw };
      if (walker.active) { walker.pos.set(x, y, z); walker.camY = y + 1.62; walker.vel.set(0, 0, 0); if (yaw !== undefined) walker.yaw = yaw; }
      else walker.start(spawn);
      room = roomAt(walker.pos);
      walkNotify({ active: true, locked: walker.locked, coarse: walker.coarse });
    },
    get walkState() { return walker && walker.active ? { x: walker.pos.x, y: walker.pos.y, z: walker.pos.z, yaw: walker.yaw, room } : null; },
    get viewName() { return currentView; },
    snapshot(type = 'image/jpeg', q = 0.92) { draw(); return renderer.domElement.toDataURL(type, q); },
    get frames() { return frames; },
    debug: { renderer, scene, camera, controls, get composer() { return composer; }, get gtao() { return gtao; }, draw, model },
    dispose() {
      running = false;
      if (walker) walker.dispose();
      observer.disconnect();
      controls.dispose();
      dropComposer();
      scene.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
        for (const material of materials) {
          for (const value of Object.values(material)) if (value && value.isTexture) value.dispose();
          material.dispose();
        }
      });
      for (const m of depthMats.values()) m.dispose();
      envTarget.dispose();
      roomTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
