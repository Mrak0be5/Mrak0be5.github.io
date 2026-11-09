// Квартал штаба в реалистичном виде (экран «Штаб»): бульвар оригинала (game.js → buildCity, makeCityLot,
// buildCityStreets, buildCityGreenery, makeCityExpansion, makeCityRing, машины) на тех же местах ×2 — таблички
// #city-signs и выбор тапом совпадают. Здания штаба — детали стройки (building.js) по своим кубовым чертежам
// (MB.HQ_LEVELS) с подставным миром: какие кубы стоят, растут или видны силуэтом, вид каждый кадр читает из
// экземпляров квартала оригинала (cityRecords: масштаб куба — его появление, силуэт — чертёж), так что смысл и
// ход (стройка штаба, рост нового здания по порядку кубов) — как у оригинала. Модуль вида (scene.js → LOADERS):
// create(ctx) → { group, active, update(dt, info), stats() }.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createBuilding } from './building.js?v=45127fe';
import { createScaffold } from './scaffold.js?v=45127fe';
import { markDynamic } from './render.js?v=45127fe';
import { TEXTURE_TILES as TILE } from './textures.js?v=45127fe';
import { FAMILY_TEX, familyMaterial } from './families.js?v=45127fe';
import { createCityTextures, CITY_TILES as CT } from './city-tex.js?v=45127fe';
import * as P from './city-props.js?v=45127fe';
import { createSignAtlas, plate } from './city-signs.js?v=45127fe';
import { createFeatureMaterials } from './feat-parts.js?v=45127fe';
import { rng } from './geo.js?v=45127fe';

const S = 2;               // мир вида = координаты оригинала × 2
// плоские покрытия тень не отбрасывают (лишние вызовы в проходе тени)
const FLAT = { marking: true, slabs: true, pavers: true, curb: true, soil: true, lens: true, lawn: true, sign: true };
// Телефон: мелочи из дерева, стали, бетона и краски — одним материалом краски без сколов (без фактур, тон —
// цветом вершин): квартал рисуется десятком вызовов вместо трёх десятков. Тон — средний цвет своей фактуры;
// сколы краски (paintworn) на дереве и бетоне читались бы грязными пятнами.
let TINT = null;
const GENERIC = { planks: [0.42, 0.31, 0.2], blacksteel: [0.07, 0.07, 0.07], steel: [0.3, 0.31, 0.33], tube: [0.36, 0.38, 0.41],
  concrete: [0.5, 0.49, 0.46], paint: [1, 1, 1], pole: [1, 1, 1], paintworn: [1, 1, 1], bark: [0.3, 0.24, 0.18] };
const Q = 64;              // ступени масштаба куба при сверке
const RING_Y = 0.205;      // высота кольца выбора над уровнем покрытий: тротуар base + 0,16, бордюры площадок + 0,19

// Выходы G-буфера для своих прозрачных шейдеров (как контур будущих деталей в building.js): альфа 0 — буферы
// под пятном не меняются.
const GB_OUT = /* glsl */ `
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
`;
const GB_ZERO = 'gNormal = vec4(0.0); gInfo = vec4(0.0); gVelocity = vec4(0.0); gAlbedo = vec4(0.0); gIndirect = vec4(0.0);';
// Цвет на выход: в цель кадра (render.js, post.js) — линейный HDR как есть, в холст («Телефон», mobile.js — один
// проход без своих целей) — тон-маппинг AgX и sRGB, как у материалов вида (three задаёт их по цели рендера).
const OUT_COLOR = `
#ifdef TONE_MAPPING
outColor.rgb = toneMapping(outColor.rgb);
#endif
outColor = linearToOutputTexel(outColor);
`;
const FACE_VERT = /* glsl */ `
in vec4 aFace;
out vec4 vFace;
out vec3 vW;
void main() {
  vFace = aFace;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
// Силуэт будущего здания (чертёж оригинала): голубое стекло кубов, светлые рёбра, бегущая вверх полоса.
const GHOST_FRAG = GB_OUT + /* glsl */ `
in vec4 vFace;
in vec3 vW;
uniform vec3 uColor;
uniform float uGain, uTime, uOpacity;
void main() {
  vec2 d = min(vFace.xy, vFace.zw - vFace.xy);
  float e = min(d.x, d.y);
  float edge = 1.0 - smoothstep(0.025, 0.08, e);
  float scan = smoothstep(0.85, 1.0, fract(vW.y * 0.25 - uTime * 0.35));
  float a = uOpacity * (0.2 + 0.1 * scan) + edge * 0.6 * uOpacity / 0.32;
  outColor = vec4(uColor * uGain * (1.0 + edge * 1.2 + scan * 0.5), clamp(a, 0.0, 0.92));
  ${OUT_COLOR}
  ${GB_ZERO}
}
`;
// Кольцо выбора участка: золотая полоса с мягкими краями, пульс — как у кольца оригинала (его прозрачность).
const RING_FRAG = GB_OUT + /* glsl */ `
in vec4 vFace;
in vec3 vW;
uniform vec3 uColor;
uniform float uGain, uOpacity;
void main() {
  float k = vFace.x;
  float core = 1.0 - smoothstep(0.25, 0.5, abs(k - 0.5));
  outColor = vec4(uColor * uGain * (0.7 + 0.6 * core), uOpacity * (0.35 + 0.65 * core));
  ${OUT_COLOR}
  ${GB_ZERO}
}
`;
// Пятно света фонаря на земле (ночью): тёплый круг с мягким краем, складывается со светом кадра.
const POOL_FRAG = GB_OUT + /* glsl */ `
in vec4 vFace;
in vec3 vW;
uniform vec3 uColor;
uniform float uGain;
void main() {
  float r2 = dot(vFace.xy, vFace.xy);
  float f = pow(max(0.0, 1.0 - r2), 2.2);
  outColor = vec4(uColor * uGain * f, 1.0);
  ${OUT_COLOR}
  ${GB_ZERO}
}
`;

export function create(ctx) {
  const THREE = ctx.THREE;
  const { mats, quality, B } = ctx;
  const phone = ctx.tier === 'phone';
  P.cheap(!quality.bevel);
  const group = new THREE.Group();
  group.name = 'city';
  group.visible = false;
  let ready = false, time = 0, base = 0.08;
  let M = null;                 // материалы по ключу
  let SIGNS = null;             // атлас вывесок (city-signs.js): rect(ключ) → развёртка места
  let lots = [];                // участки: { id, record, house, world, … }
  let lotLayer = null, lotSig = '', ghostMesh = null, ghostSig = '';
  let ring = null, origRing = null, cars = [], pools = null, stillGroup = null, zoneRing = null, ringDims = null;
  let natureHidden = [], area = null, early = null, zoneRect = null, forestHidden = [], FEAT = null;
  // самый долгий кадр с входа в квартал (мс) — проверка рывка на первом кадре (сборка шейдеров, зданий)
  const hitch = { last: 0, max: 0, city: false, trace: [] };
  let buildMs = 0;
  const MB = function () { return B.MB; };
  // здания штаба читают из движка только MB: без подписки на события площадки (молния, автодостройка, дверь
  // чужого мира пересобирали бы все здания квартала) — их состояние квартал сам читает каждый кадр
  const cityE = { get MB() { return B.MB; }, on: function () {} };

  // Ночной подсвет квартала: свечение города в облаках и отражённый свет фонарей (небо — холодное, снизу — тёплое).
  // Луна (0,35) на тёмной траве и листве почти ничего не даёт, а отражённый свет (GI) есть только на «Максимуме»
  // и только над площадкой — без подсвета газон, изгороди и деревья ночью чёрные. Источник — в сцене с самого
  // начала, всегда видим (вне квартала и днём сила 0): число источников не меняется, программы не пересобираются.
  const FILL = 0.75;
  const fill = new THREE.HemisphereLight(0x8fa3cc, 0x4a3c2c, 0);
  fill.name = 'city-fill';
  ctx.scene.add(fill);

  // ---------- источники: в квартале их набор — как на площадке ----------
  // scene.js прячет в квартале мачты света площадки (группой), а программы шейдеров зависят от числа источников по
  // породам (с тенью, с картой): первый вход в штаб на уровнях с мачтами (с 10-го) пересобирал бы все программы
  // сцены — рывок. Вместо спрятанного источника в квартале горит «двойник» той же породы (с тенью, если она была)
  // силой 0: набор источников — как на площадке, программы — те же, что собрал прогрев. Тень двойника —
  // один раз, карта 16 × 16 вверх, в пустое небо.
  let sceneLights = [], lightKids = -1, lightAge = 0;
  const lightSeen = new WeakMap();   // источник → { site: был виден на площадке, city: появился в квартале }
  const twins = new Map();           // источник площадки → двойник
  // в сцене (цепочка родителей доходит до неё) и видим; источник убранной группы (старые мачты прошлой площадки)
  // хранит своего родителя, но в сцене его уже нет
  function inScene(o) { for (let p = o; p; p = p.parent) if (p === ctx.scene) return true; return false; }
  function shown(o) { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === ctx.scene) return true; } return false; }
  function scanLights(city) {
    let gone = false;
    for (let i = 0; i < sceneLights.length && !gone; i++) gone = !inScene(sceneLights[i]);
    if (gone || ctx.scene.children.length !== lightKids || ++lightAge > 60) {
      lightKids = ctx.scene.children.length; lightAge = 0;
      sceneLights = [];
      ctx.scene.children.forEach(function (c) { if (c !== group) c.traverse(function (o) { if (o.isLight) sceneLights.push(o); }); });
    }
    for (let i = 0; i < sceneLights.length; i++) {
      const l = sceneLights[i];
      let k = lightSeen.get(l);
      if (!k) { k = { site: false, city: city }; lightSeen.set(l, k); }
      if (!city && shown(l)) k.site = true;
    }
  }
  function lightKey(l) { return l.type + (l.castShadow ? '+s' : '') + (l.map ? '+m' : ''); }
  // набор sig не больше одного из прогретых (по каждой породе источников — не больше штук)
  const warmedSigs = [];
  function countSig(sig) { const c = {}; sig.split(',').forEach(function (k) { if (k) c[k] = (c[k] || 0) + 1; }); return c; }
  function covered(sig) {
    const c = countSig(sig);
    return warmedSigs.some(function (w) { const wc = countSig(w); return Object.keys(c).every(function (k) { return (wc[k] || 0) >= c[k]; }); });
  }
  let lastSum = -1, pendingSig = false;
  const KIND = { DirectionalLight: 1, PointLight: 2, SpotLight: 3, HemisphereLight: 4, RectAreaLight: 5 };
  function lightSum() {
    let q = 0;
    for (let i = 0; i < sceneLights.length; i++) {
      const l = sceneLights[i];
      if (shown(l)) q += (KIND[l.type] || 6) + (l.castShadow ? 10 : 0) + (l.map ? 100 : 0) + 1000;
    }
    return q;
  }
  // набор источников, что видит кадр (порода, тень, карта) — для прогрева программ
  function lightSig() {
    const keys = [];
    for (let i = 0; i < sceneLights.length; i++) if (shown(sceneLights[i])) keys.push(lightKey(sceneLights[i]));
    return keys.sort().join(',');
  }
  function twinOf(src) {
    let t = twins.get(src);
    if (t) return t;
    t = new src.constructor();
    t.name = 'city-twin';
    t.intensity = 0;
    t.castShadow = !!src.castShadow;
    if (src.isSpotLight) t.map = src.map || null;
    t.position.set(0, 900, 0);
    if (t.target) { t.target.position.set(0, 100, 0); t.add(t.target); }
    if (t.castShadow && t.shadow) {
      t.shadow.mapSize.set(16, 16);
      t.shadow.autoUpdate = false;
      t.shadow.needsUpdate = true;
      t.shadow.camera.near = 0.5; t.shadow.camera.far = 1;
    }
    t.visible = false;
    group.add(t);
    twins.set(src, t);
    return t;
  }
  // в квартале: двойник у каждого источника площадки, спрятанного группой (сам он видим)
  function syncTwins() {
    const need = new Set();
    for (let i = 0; i < sceneLights.length; i++) {
      const l = sceneLights[i];
      if (!l.visible || !inScene(l) || shown(l)) continue;
      const k = lightSeen.get(l);
      if (k && (k.site || k.city)) need.add(l);
    }
    twins.forEach(function (t, src) {
      if (!inScene(src)) { group.remove(t); t.dispose(); twins.delete(src); return; }
      t.visible = need.has(src);
    });
    need.forEach(function (l) { twinOf(l).visible = true; });
  }

  // ---------- материалы ----------
  function texMat(set, opts) {
    const m = new THREE.MeshStandardMaterial(Object.assign({
      map: set.map, normalMap: set.normalMap, roughnessMap: set.ormMap, metalnessMap: set.ormMap, aoMap: set.ormMap,
      roughness: 1, metalness: 0, vertexColors: true,
    }, opts || {}));
    return m;
  }
  function faceShader(frag, uniforms, opts) {
    return new THREE.ShaderMaterial(Object.assign({ vertexShader: FACE_VERT, fragmentShader: frag, glslVersion: THREE.GLSL3, uniforms,
      transparent: true, depthWrite: false }, opts || {}));
  }
  // ORM крашеного металла 64 × 64 (метр развёртки): затенения нет (R = 1), шероховатость пятнами 0,3–0,7
  // (крупный и мелкий шум, бесшовно по кругу), металличность — множитель материала (B = 1).
  function speckle() {
    const n = 64, data = new Uint8Array(n * n * 4), T = Math.PI * 2 / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = Math.sin(x * T * 2 + Math.sin(y * T * 3) * 1.3) * Math.sin(y * T * 2 - x * T) * 0.5 + Math.sin(x * T * 7 - y * T * 5) * 0.25 + Math.sin(x * T * 13 + y * T * 11) * 0.12;
      const i = (y * n + x) * 4;
      data[i] = 255; data[i + 1] = Math.round(255 * Math.min(0.9, Math.max(0.2, 0.5 + 0.17 * v))); data[i + 2] = 255; data[i + 3] = 255;
    }
    const t = new THREE.DataTexture(data, n, n);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  function materials() {
    const tex = createCityTextures(ctx.renderer, phone ? 512 : 1024);
    const shared = ctx.textures;
    const out = {};
    // газон: фактура травы вида, полосы стрижки вдоль бульвара (по x мира, 1,6 м)
    out.lawn = texMat(shared.get('grass'));
    out.lawn.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCityW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCityW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCityW;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n{ float st = step(0.5, fract(vCityW.x / 3.2)); diffuseColor.rgb *= mix(0.9, 1.06, st); }');
    };
    out.lawn.customProgramCacheKey = function () { return 'citylawn1'; };
    out.soil = texMat(shared.get('dirt'));
    out.gravel = texMat(shared.get('gravel'));
    out.asphalt = texMat(tex.get('asphalt'));
    out.slabs = texMat(tex.get('slabs'));
    out.pavers = texMat(tex.get('pavers'));
    out.hedge = texMat(tex.get('hedge'));
    // Разметка, вывески, стекло фонаря, крашеный металл — с тем же набором карт, что у покрытий (белая точка вместо
    // альбедо, плоская нормаль, ORM без поправок): одна программа шейдера на всех вместо пяти — на «Максимуме»
    // каждая своя программа — до полсекунды сборки под ANGLE при загрузке.
    const px = function (r, g, b, srgb) {
      const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      return t;
    };
    const white = px(255, 255, 255, true), flat = px(128, 128, 255), orm = px(255, 255, 255);
    const plain = function (o) { return Object.assign({ map: white, normalMap: flat, roughnessMap: orm, metalnessMap: orm, aoMap: orm, vertexColors: true }, o); };
    // разметка: краска по асфальту (рельеф и шероховатость асфальта, свой цвет)
    const as = tex.get('asphalt');
    out.marking = new THREE.MeshStandardMaterial(plain({ color: 0xdedbd2, normalMap: as.normalMap, roughnessMap: as.ormMap, metalnessMap: as.ormMap, aoMap: as.ormMap,
      roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    out.curb = mats.dressed;
    out.planks = mats.planks; out.blacksteel = mats.blacksteel; out.steel = mats.steel; out.concrete = mats.concrete;
    out.pole = mats.paintworn; out.paintworn = mats.paintworn; out.paint = mats.paint; out.tube = mats.tube; out.bark = mats.bark;
    if (phone) {
      TINT = {};
      Object.keys(GENERIC).forEach(function (k) { if (k === 'bark') return; out[k] = mats.paint; TINT[k] = new THREE.Color(GENERIC[k][0], GENERIC[k][1], GENERIC[k][2]); });
    }
    out.diamond = mats.diamond; out.glass = mats.glass;
    // вывески: щит участка, паспорт стройки, знак у забора, таблички стел с названиями зданий штаба — атлас
    // (city-signs.js) рисуется со сборкой квартала (названия — из участков оригинала), до неё — белая точка
    const dot = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    dot.colorSpace = THREE.SRGBColorSpace;
    dot.needsUpdate = true;
    out.sign = new THREE.MeshStandardMaterial(plain({ map: dot, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    // крашеный металл городской мебели (столбы фонарей, скамьи, столбики, стелы): порошковая краска без
    // сколов, шероховатость пятнами (ORM с шумом, 0,3–0,7) — блики не ровные, как на пластике; на «Телефоне» —
    // общий материал
    if (phone) { out.metal = mats.paint; TINT.metal = new THREE.Color(1, 1, 1); } else {
      const sp = speckle();
      out.metal = new THREE.MeshStandardMaterial(plain({ color: 0xffffff, roughnessMap: sp, metalnessMap: sp, aoMap: sp, roughness: 1, metalness: 0.35 }));
    }
    // стекло плафона фонаря: светится ночью (sync)
    out.lens = new THREE.MeshStandardMaterial(plain({ color: 0x1c1b19, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: 0.25, metalness: 0 }));
    // листва лип: просвечивает против солнца, как листва леса
    const leafTex = P.lindenTexture();
    out.leaves = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, vertexColors: true, roughness: 0.74, metalness: 0, alphaToCoverage: (quality.msaa || 0) > 0 });
    out.leaves.defines = { MB_TRANSLUCENT: '' };
    out.leaves.onBeforeCompile = function (shader) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        vec3 mbTranslucent(vec3 L, vec3 V, vec3 N) { return vec3((pow(max(dot(-V, L), 0.0), 3.0) * 1.2 + max(-dot(N, L), 0.0) * 0.3) * RECIPROCAL_PI); }`);
    };
    out.leaves.customProgramCacheKey = function () { return 'cityleaves1'; };
    out.leafDepth = new THREE.MeshDepthMaterial({ map: leafTex, alphaTest: 0.45, depthPacking: THREE.RGBADepthPacking, side: THREE.BackSide });
    // кусты участков — своя глубина: three клонирует её на пару (глубина, материал), и общий клон у экземпляров
    // крон и простых мешей кустов менял бы программу туда-обратно каждый проход теней (и собирал её на входе)
    out.leafDepthLot = out.leafDepth.clone();
    // ограждения: оранжевая сетка участков и сварная сетка забора зоны (вырез по альфе, обе стороны)
    const net = P.netTexture(), mesh = P.meshTexture();
    out.net = new THREE.MeshStandardMaterial({ map: net, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75, metalness: 0 });
    out.netDepth = new THREE.MeshDepthMaterial({ map: net, alphaTest: 0.4, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    out.mesh = new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.85 });
    out.meshDepth = new THREE.MeshDepthMaterial({ map: mesh, alphaTest: 0.4, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    // машины: у вершины свой материал (aMat — шероховатость, металл, свет: фара / стоп-сигнал)
    out.car = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5, envMapIntensity: 1.3 });
    out.car.userData.light = { value: 0.4 };
    out.car.onBeforeCompile = function (shader) {
      shader.uniforms.uCarLight = out.car.userData.light;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aMat;\nvarying vec3 vMat;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMat;\nuniform float uCarLight;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vMat.x;')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMat.y;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (vMat.z > 0.5) totalEmissiveRadiance += (vMat.z > 1.5 ? vec3(1.0, 0.05, 0.03) * 0.6 : vec3(1.0, 0.93, 0.8)) * uCarLight;');
    };
    out.car.customProgramCacheKey = function () { return 'citycar1'; };
    out.ghost = faceShader(GHOST_FRAG, { uColor: { value: new THREE.Color(0x8fc4ff) }, uGain: { value: 1.6 }, uTime: { value: 0 }, uOpacity: { value: 0.32 } });
    // кольцо — над тротуаром и бордюрами площадок (верх base + 0,19), со сдвигом глубины: полоса со стороны
    // бульвара лежит над плитами тротуара и не тонет в них (TAA, G-буфер)
    out.ring = faceShader(RING_FRAG, { uColor: { value: new THREE.Color(0xffc955) }, uGain: { value: 3.0 }, uOpacity: { value: 0.85 } },
      { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    out.pool = faceShader(POOL_FRAG, { uColor: { value: new THREE.Color(1.0, 0.78, 0.5) }, uGain: { value: 0 } }, { blending: THREE.AdditiveBlending });
    return out;
  }

  // ---------- что стоит в квартале оригинала ----------
  function scan(root) {
    const out = { lanes: [], walks: [], curbs: [], hedges: [], courts: [], lamps: [], trees: [], cars: [], road: null, ring: null, zone: null };
    root.children.forEach(function (o) {
      const ud = o.userData || {};
      const p = o.geometry && o.geometry.parameters;
      if (ud.buildingId === 'expansion') out.zone = o;
      else if (ud.buildingId !== undefined) return;
      else if (ud.lane !== undefined) out.cars.push(o);
      else if (o.isMesh && o.geometry.type === 'PlaneGeometry') { if (p.width < 0.5) out.lanes.push(o); else if (p.width < 50) out.road = o; }
      else if (o.isMesh && o.geometry.type === 'BoxGeometry') {
        if (Math.abs(p.height - 0.7) < 0.01) out.hedges.push(o);
        else if (Math.abs(p.height - 0.14) < 0.005) out.curbs.push(o);
        else if (Math.abs(p.height - 0.12) < 0.005) out.walks.push(o);
        else if (Math.abs(p.height - 0.1) < 0.005) out.courts.push(o);
      } else if (o.isGroup && o.children.length === 4 && o.children.every(function (c) { return c.isMesh && c.geometry.type === 'BoxGeometry' && Math.abs(c.geometry.parameters.height - 0.05) < 0.001; })) out.ring = o;
      else if (o.isGroup && o.children.length === 3 && o.children[0].geometry) {
        const g0 = o.children[0].geometry.parameters;
        if (Math.abs(g0.height - 2.6) < 0.01) out.lamps.push(o);
        else if (Math.abs(g0.height - 1.1) < 0.01) out.trees.push(o);
      }
    });
    return out;
  }

  // ---------- бульвар ----------
  function boulevard(sc, pile) {
    const g = ctx.ground;
    const road = sc.road;
    const rz0 = (road.position.z - road.geometry.parameters.height / 2) * S, rz1 = (road.position.z + road.geometry.parameters.height / 2) * S;
    const curbX = Math.abs(sc.curbs[0] ? sc.curbs[0].position.x : 1.6) * S;
    const walkOut = sc.walks.length ? (Math.abs(sc.walks[0].position.x) + sc.walks[0].geometry.parameters.width / 2) * S : 4.8;
    // переходы — там, где площадки рядов пересекают проезжую часть
    const courts = sc.courts.map(function (o) { return { z: o.position.z * S, half: o.geometry.parameters.depth / 2 * S, w: o.geometry.parameters.width / 2 * S }; });
    const inCourt = function (z, pad) { return courts.some(function (c) { return Math.abs(z - c.z) < c.half + (pad || 0); }); };
    // уровень покрытий: выше бугров рельефа на поляне (они до ~7 см), здания и участки — от него
    let gmax = -Infinity;
    for (let x = -26; x <= 26; x += 4) for (let z = rz0 + 4; z <= rz1; z += 4) gmax = Math.max(gmax, g(x, z));
    base = Math.max(0, gmax) + 0.02;
    const yRoad = base + 0.02, yWalk = base + 0.16, yCourt = base + 0.15;
    // газон: по узлам рельефа (5 м), на поляне — не выше уровня покрытий
    const gx0 = -50, gx1 = 50, gz0 = Math.floor((rz0 - 34) / 5) * 5, gz1 = Math.ceil((rz1 + 14) / 5) * 5;
    area = { x0: gx0, x1: gx1, z0: gz0, z1: gz1 };
    const lawn = P.groundGrid(gx0, gx1, gz0, gz1, 5, function (x, z) {
      const y = g(x, z) + 0.03;
      return Math.hypot(x, z) < 118 ? Math.min(y, base) : y;
    }, TILE.grass, function (x, z) { const n = Math.sin(x * 0.11 + z * 0.07) * Math.sin(z * 0.13 - x * 0.05); return P.C(0.86 + 0.06 * n, 1.06 + 0.05 * n, 0.72); });
    const lawnMesh = P.gridMesh(lawn, M.lawn);
    lawnMesh.name = 'city-lawn';
    group.add(lawnMesh);
    // асфальт: колеи темнее (резина), середина полосы — масляная дорожка
    const ax = curbX - 0.08;
    const asphalt = P.groundGrid(-ax, ax, rz0, rz1, 0.2, function () { return yRoad; }, CT.asphalt, function (x, z) {
      const lane = Math.abs(x) - ax / 2;
      const track = Math.exp(-Math.pow((Math.abs(lane) - 0.78) / 0.22, 2));
      const drip = Math.exp(-Math.pow(lane / 0.25, 2));
      // крупные пятна вдоль дороги (участки разного возраста) — повтор плитки фактуры не читается
      const age = 0.05 * Math.sin(z * 0.37 + Math.sin(z * 0.11) * 2.0) + 0.03 * Math.sin(z * 1.3 + x);
      const k = (1 - 0.14 * track - 0.08 * drip) * (1 + age);
      return P.C(k, k, k * 1.01);
    }, 4);
    const roadMesh = P.gridMesh(asphalt, M.asphalt);
    roadMesh.name = 'city-asphalt';
    group.add(roadMesh);
    // разметка: прерывистая осевая по штрихам оригинала, сплошные у бордюров, «зебра» на переходах
    sc.lanes.forEach(function (o) {
      const z = o.position.z * S;
      if (inCourt(z, 1.6)) return;
      const len = o.geometry.parameters.height * S;
      pile.put('marking', P.bxw(-0.075, yRoad - 0.01, z - len / 2, 0.075, yRoad + 0.006, z + len / 2, 0.004, [1, 1]), null, wear(z));
    });
    [-1, 1].forEach(function (sd) {
      let z = rz0 + 0.5;
      const edges = [];
      courts.forEach(function (c) { edges.push([c.z - c.half - 0.6, c.z + c.half + 0.6]); });
      edges.sort(function (a, b) { return a[0] - b[0]; });
      edges.forEach(function (e) { if (e[0] > z) pile.put('marking', P.bxw(sd * (ax - 0.35) - 0.06, yRoad - 0.01, z, sd * (ax - 0.35) + 0.06, yRoad + 0.006, e[0], 0.004, [1, 1]), null, wear(z * 3)); z = Math.max(z, e[1]); });
      if (z < rz1 - 0.5) pile.put('marking', P.bxw(sd * (ax - 0.35) - 0.06, yRoad - 0.01, z, sd * (ax - 0.35) + 0.06, yRoad + 0.006, rz1 - 0.5, 0.004, [1, 1]), null, wear(z * 3));
    });
    courts.forEach(function (c) {
      for (let k = 0; k < 6; k++) {
        const x = -2.5 + k;
        if (Math.abs(x) + 0.25 > ax - 0.1) continue;
        pile.put('marking', P.bxw(x - 0.25, yRoad - 0.01, c.z - c.half + 0.3, x + 0.25, yRoad + 0.006, c.z + c.half - 0.3, 0.004, [1, 1]), null, wear(c.z + k * 7));
      }
      // стоп-линии
      [-1, 1].forEach(function (sd) { pile.put('marking', P.bxw(sd > 0 ? 0.1 : -ax + 0.1, yRoad - 0.01, c.z + sd * (c.half + 0.45) - 0.15, sd > 0 ? ax - 0.1 : -0.1, yRoad + 0.006, c.z + sd * (c.half + 0.45) + 0.15, 0.004, [1, 1]), null, wear(c.z * 2 + sd)); });
    });
    // тротуары из плит и гранитный бордюр кусками по метру (на переходах — пониженный); на концах бульвара —
    // пандусы к газону на RAMP м: плиты и бордюр опускаются почти до газона, торцов в 16–19 см нет
    const RAMP = 1.6, yEnd = base + 0.025;
    const walkTop = function (z) { return z > rz1 - RAMP ? yWalk + (yEnd - yWalk) * (z - (rz1 - RAMP)) / RAMP : z < rz0 + RAMP ? yWalk + (yEnd - yWalk) * ((rz0 + RAMP) - z) / RAMP : yWalk; };
    [-1, 1].forEach(function (sd) {
      const x0 = sd > 0 ? curbX + 0.13 : -walkOut, x1 = sd > 0 ? walkOut : -curbX - 0.13;
      pile.put('slabs', P.bxw(x0, base - 0.12, rz0 + RAMP, x1, yWalk, rz1 - RAMP, 0.01, CT.slabs));
      pile.put('slabs', P.slopeTop(P.bxw(x0, base - 0.12, rz1 - RAMP, x1, yWalk, rz1, 0.01, CT.slabs), base - 0.12, rz1 - RAMP, rz1, yWalk, yEnd));
      pile.put('slabs', P.slopeTop(P.bxw(x0, base - 0.12, rz0, x1, yWalk, rz0 + RAMP, 0.01, CT.slabs), base - 0.12, rz0, rz0 + RAMP, yEnd, yWalk));
      for (let z = rz0; z < rz1 - 0.01; z += 1) {
        const z1 = Math.min(rz1, z + 1) - 0.006;
        const low = inCourt(z + 0.5, -0.2);
        const top = low ? yRoad + 0.04 : yWalk + 0.03;
        const t = 0.9 + 0.1 * Math.sin(z * 12.9898) * Math.sin(z * 4.1);
        let piece = P.bxw(sd * curbX - 0.13, base - 0.1, z, sd * curbX + 0.13, top, z1, 0.025, TILE.dressed);
        if (!low && (z1 > rz1 - RAMP || z < rz0 + RAMP)) piece = P.slopeTop(piece, base - 0.1, z, z1, Math.max(walkTop(z), yRoad) + 0.03, Math.max(walkTop(z1), yRoad) + 0.03);
        pile.put('curb', piece, null, P.C(0.62 * t, 0.62 * t, 0.64 * t));
      }
    });
    // площадки перед рядами: брусчатка от тротуара до края участков, бордюр по краю к газону
    courts.forEach(function (c) {
      [-1, 1].forEach(function (sd) {
        const x0 = sd > 0 ? walkOut : -c.w, x1 = sd > 0 ? c.w : -walkOut;
        pile.put('pavers', P.bxw(x0, base - 0.1, c.z - c.half, x1, yCourt, c.z + c.half, 0.01, CT.pavers));
        for (let x = walkOut; x < c.w - 0.01; x += 1) {
          const xa = sd * x, xb = sd * Math.min(c.w, x + 1 - 0.006);
          pile.put('curb', P.bxw(Math.min(xa, xb), base - 0.08, c.z + c.half, Math.max(xa, xb), yCourt + 0.04, c.z + c.half + 0.16, 0.02, TILE.dressed), null, P.C(0.6, 0.6, 0.62));
        }
        // скамьи спиной к участкам и урны
        [9.5, 19.5].forEach(function (x, k) {
          P.bench(pile, sd * x, yCourt, c.z - c.half + 0.7, 0);
          if (k === 0) P.bin(pile, sd * (x + 1.6), yCourt, c.z - c.half + 0.55);
        });
      });
    });
    // живые изгороди за участками: бруски листвы с неровной поверхностью (сегментами по 2,4 м)
    sc.hedges.forEach(function (o) {
      const p = o.geometry.parameters;
      const w = p.width * S, h = p.height * S + 0.1, d = p.depth * S;
      const cx = o.position.x * S, cz = o.position.z * S;
      const n = Math.max(1, Math.round(w / 2.4));
      // куски внахлёст на 0,6 м: скруглённые торцы уходят в соседа, шва не видно
      for (let k = 0; k < n; k++) {
        const sx = cx - w / 2 + (k + 0.5) * w / n;
        const ends = (k === 0 ? 0 : 0.3) + (k === n - 1 ? 0 : 0.3);
        pile.put('hedge', hedgeBlock(w / n + ends, h, d, sx + ((k === n - 1 ? 0 : 0.3) - (k === 0 ? 0 : 0.3)) / 2, base + h / 2 - 0.05, cz));
      }
    });
    // липы: на бульваре — в решётках тротуара, по краям квартала — аллеями
    const trees = { avenue: [], alley: [] };
    sc.trees.forEach(function (o) {
      const x = o.position.x * S, z = o.position.z * S, s = o.scale.x;
      if (s < 0.75) { trees.avenue.push([x, yWalk, z, s, o.rotation.y]); P.treeGrate(pile, x, yWalk, z); }
      else trees.alley.push([x, g(x, z), z, s, o.rotation.y]);
    });
    plantTrees(trees);
    // фонари: столб с выносом над проезжей частью, светодиодный светильник
    const heads = [];
    sc.lamps.forEach(function (o) {
      const x = o.position.x * S, z = o.position.z * S;
      const dir = Math.sign(o.children[1].position.x) || -Math.sign(x);
      heads.push(lamp(pile, x, Math.max(base, g(x, z)), z, dir));
    });
    // фонари светят ночью: пятна по покрытиям — асфальт, бордюр, тротуар, площадки, газон (каждое на своей
    // высоте: пятно не висит над дорогой и не подсвечивает низ машин)
    const cx0 = curbX - 0.13, cx1 = curbX + 0.13;
    const surf = function (x, z, sx, sz) {
      const ax = Math.abs(x + sx * 0.001), zz = z + sz * 0.001;
      if (ax < cx0) return yRoad + 0.012;
      if (ax < cx1) return (inCourt(rz0 + Math.floor(zz - rz0) + 0.5, -0.2) ? yRoad + 0.04 : Math.max(walkTop(zz), yRoad) + 0.03) + 0.008;
      if (ax < walkOut) return walkTop(zz) + 0.008;
      const c = courts.find(function (q) { return Math.abs(zz - q.z) < q.half; });
      if (c && ax < c.w) return yCourt + 0.008;
      const y = g(x, z) + 0.03;
      return (Math.hypot(x, z) < 118 ? Math.min(y, base) : y) + 0.03;
    };
    const xcuts = [], zcuts = [];
    [cx0, cx1, walkOut].forEach(function (v) { xcuts.push(v, -v); });
    courts.forEach(function (c) { xcuts.push(c.w, -c.w); zcuts.push(c.z - c.half, c.z + c.half); });
    pools = new THREE.Mesh(P.poolGeometry(heads.map(function (h) { return [h.x, h.z]; }), 4.6, surf, xcuts, zcuts, phone ? 0.92 : 0.46), M.pool);
    pools.renderOrder = 4;
    pools.frustumCulled = false;
    pools.userData.noAO = true;
    pools.visible = false;
    group.add(pools);
    return { yRoad, rz0, rz1 };
  }
  function wear(seed) { const t = 0.86 + 0.12 * Math.abs(Math.sin(seed * 12.9898) * 43758.5453 % 1); return P.C(t, t, t * 0.98); }

  // Брусок изгороди: фаска, поверхность волнится шумом (листва стрижена неровно), фактура листвы в метрах.
  function hedgeBlock(w, h, d, x, y, z) {
    const p = P.bxw(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2, 0.22, CT.hedge);
    for (let i = 0; i < p.pos.length; i += 3) {
      const px = p.pos[i], py = p.pos[i + 1], pz = p.pos[i + 2];
      const n = Math.sin(px * 2.3 + pz * 1.7) * Math.sin(py * 3.1 - px * 0.9) * 0.05 + Math.sin(px * 7.7 - py * 5.3 + pz * 3.1) * 0.02;
      const low = py < y - h / 2 + 0.05 ? 0 : 1;
      p.pos[i] += p.nrm[i] * n * low; p.pos[i + 1] += p.nrm[i + 1] * n * low; p.pos[i + 2] += p.nrm[i + 2] * n * low;
    }
    return p;
  }

  // Фонарь: гранитная тумба, конический столб, вынос дугой, корпус светильника и стекло (светится ночью).
  function lamp(pile, x, y, z, dir) {
    const graph = P.C(0.035, 0.045, 0.042);
    pile.put('concrete', P.bx(0.46, 0.5, 0.46, 0.03, [1, 1]), P.M(x, y + 0.25, z), P.C(0.72, 0.72, 0.7));
    pile.put('metal', P.bx(0.34, 0.1, 0.34, 0.02), P.M(x, y + 0.55, z), graph);
    P.tubeAB(pile, 'metal', new THREE.Vector3(x, y + 0.5, z), new THREE.Vector3(x, y + 6.1, z), 0.13, 0.075, graph, 12);
    P.tubeAB(pile, 'metal', new THREE.Vector3(x, y + 0.6, z), new THREE.Vector3(x, y + 1.4, z), 0.155, 0.14, graph, 12);
    // вынос: дуга из отрезков
    const pts = [[0, 6.0], [0.3, 6.34], [0.8, 6.5], [1.35, 6.48]];
    for (let k = 0; k < pts.length - 1; k++) {
      P.tubeAB(pile, 'metal', new THREE.Vector3(x + dir * pts[k][0], y + pts[k][1], z), new THREE.Vector3(x + dir * pts[k + 1][0], y + pts[k + 1][1], z), 0.06, 0.05, graph, 8);
    }
    // светодиодный светильник: литой корпус-«лопата» (низ плоский, верх скошен), рёбра радиатора сверху,
    // плоский рассеиватель снизу, хомут на конце выноса; корпус чуть приподнят к дороге
    const hx = x + dir * 1.72, hy = y + 6.4, tilt = dir * 0.07;
    const alu = P.C(0.2, 0.21, 0.22);
    P.tubeAB(pile, 'metal', new THREE.Vector3(x + dir * 1.33, y + 6.48, z), new THREE.Vector3(x + dir * 1.48, y + 6.44, z), 0.055, 0.055, graph, 8);
    const body = P.taper(0.52, 0.27, 0.42, 0.2, 0.08, 0).prim;
    pile.put('metal', P.bx(0.12, 0.1, 0.14, 0.02), P.M(x + dir * 1.47, hy + 0.04, z, 0, 0, tilt), alu);
    pile.put('metal', body, P.M(hx, hy, z, 0, 0, tilt), alu);
    for (let k = 0; k < 5; k++) pile.put('metal', P.bx(0.42, 0.035, 0.012, 0.004), P.M(hx + dir * 0.02, hy + 0.09, z - 0.08 + k * 0.04, 0, 0, tilt), alu);
    pile.put('lens', P.bx(0.5, 0.012, 0.2, 0.004), P.M(hx, hy - 0.004, z, 0, 0, tilt));
    return { x: hx, z: z };
  }

  // Липы: две формы кроны на аллеи, одна — на бульвар; экземплярами (по ствол и крону на форму).
  function plantTrees(trees) {
    const forms = [
      { list: trees.avenue, h: 4.6, crownY: 3.0, rx: 1.35, ry: 1.25, cards: phone ? 46 : 80, size: 1.05, trunk: 0.11, seed: 11, nominal: 0.62 },
      { list: trees.alley.filter(function (t, i) { return i % 2 === 0; }), h: 6.6, crownY: 4.1, rx: 1.85, ry: 1.75, cards: phone ? 60 : 120, size: 1.25, trunk: 0.15, seed: 23, nominal: 1 },
      { list: trees.alley.filter(function (t, i) { return i % 2 === 1; }), h: 7.2, crownY: 4.6, rx: 2.0, ry: 1.95, cards: phone ? 60 : 125, size: 1.3, trunk: 0.16, seed: 37, nominal: 1 },
    ];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    forms.forEach(function (f) {
      if (!f.list.length) return;
      const r = (function () { let a = f.seed; return function () { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
      const crown = P.crownCards(r, f.cards, f.crownY + f.ry * 0.25, f.rx, f.ry, f.size);
      const trunk = P.trunkGeometry(r, f.h, f.crownY, f.trunk);
      const crowns = new THREE.InstancedMesh(crown, M.leaves, f.list.length);
      const trunks = new THREE.InstancedMesh(trunk, M.bark, f.list.length);
      f.list.forEach(function (t, k) {
        const sc = (t[3] / f.nominal) * (0.92 + 0.16 * r());
        q.setFromAxisAngle(up, t[4] * 2.3 + r() * 6.28);
        m.compose(p.set(t[0], t[1] - 0.05, t[2]), q, s.set(sc, sc * (0.95 + 0.1 * r()), sc));
        crowns.setMatrixAt(k, m); trunks.setMatrixAt(k, m);
        const hue = r();
        crowns.setColorAt(k, col.setRGB(0.88 + 0.18 * hue, 0.95 + 0.12 * r(), 0.78 + 0.2 * (1 - hue)));
        trunks.setColorAt(k, col.setRGB(0.42, 0.37, 0.33));
      });
      crowns.name = 'city-crown'; trunks.name = 'city-trunk';
      crowns.customDepthMaterial = M.leafDepth;
      crowns.castShadow = crowns.receiveShadow = true;
      trunks.castShadow = trunks.receiveShadow = true;
      crowns.userData.noAO = true;
      crowns.computeBoundingSphere(); trunks.computeBoundingSphere();
      group.add(crowns, trunks);
    });
  }

  // ---------- зона расширения: поле за забором с воротами в конце бульвара, кран, материалы, бытовка ----------
  function expansion(zone, pile) {
    const g = ctx.ground;
    zone.updateWorldMatrix(true, false);
    const o = new THREE.Vector3().setFromMatrixPosition(zone.matrixWorld).multiplyScalar(S);
    const soil = zone.children.find(function (c) { return c.isMesh && c.geometry.type === 'PlaneGeometry'; });
    const W = (soil ? soil.geometry.parameters.width : 24.8) * S, D = (soil ? soil.geometry.parameters.height : 9) * S;
    zoneRect = { x0: o.x - W / 2, x1: o.x + W / 2, z0: o.z - D / 2, z1: o.z + D / 2 };
    const at = function (x, z) { return Math.max(base - 0.04, g(o.x + x, o.z + z)); };
    // земля поля по рельефу (в конце квартала поляна уже поднимается), щебёночный проезд от ворот
    const field = P.groundGrid(o.x - W / 2, o.x + W / 2, o.z - D / 2, o.z + D / 2, 1, function (x, z) { return Math.max(base - 0.04, g(x, z)) + 0.05; }, TILE.dirt);
    group.add(P.gridMesh(field, M.soil));
    const drive = P.groundGrid(o.x - 3.6, o.x + 3.6, o.z - D / 2 + 2, o.z + D / 2, 1, function (x, z) { return Math.max(base - 0.04, g(x, z)) + 0.075; }, TILE.gravel);
    group.add(P.gridMesh(drive, M.gravel));
    // забор: щиты сварной сетки 3,5 × 2 м на бетонных пятах, ворота шириной проезда
    const hw = W / 2 - 0.6, hd = D / 2 - 0.6, gate = 3.8;
    const meshPile = new P.Pile();
    const panel = function (ax, az, bx, bz) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 3.5));
      for (let k = 0; k < n; k++) {
        const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n;
        const y0 = at(x0, z0), y1 = at(x1, z1);
        const ang = Math.atan2(x1 - x0, z1 - z0);
        const l = Math.hypot(x1 - x0, z1 - z0);
        const cx = o.x + (x0 + x1) / 2, cz = o.z + (z0 + z1) / 2, cy = Math.min(y0, y1);
        // рама щита и сетка
        pile.put('tube', P.bx(0.04, 2.0, 0.04, 0.01), P.M(o.x + x0, cy + 1.12, o.z + z0, ang), P.C(0.85, 0.86, 0.88));
        pile.put('tube', P.bx(0.035, 0.035, l, 0.008), P.M(cx, cy + 2.1, cz, ang), P.C(0.85, 0.86, 0.88));
        pile.put('tube', P.bx(0.035, 0.035, l, 0.008), P.M(cx, cy + 0.14, cz, ang), P.C(0.85, 0.86, 0.88));
        const m = P.bx(0.004, 1.94, l - 0.06, 0, [1, 1]);
        meshPile.put('mesh', m, P.M(cx, cy + 1.12, cz, ang));
        pile.put('concrete', P.bx(0.22, 0.14, 0.62, 0.02, [1, 1]), P.M(o.x + x0, cy + 0.07, o.z + z0, ang), P.C(0.62, 0.6, 0.57));
      }
    };
    panel(-hw, -hd, hw, -hd); panel(-hw, -hd, -hw, hd); panel(hw, -hd, hw, hd);
    panel(-hw, hd, -gate, hd); panel(gate, hd, hw, hd);
    // ворота: столбы, шлагбаум (поднят), будка охраны
    [-1, 1].forEach(function (sd) {
      const x = sd * (gate + 0.15);
      pile.put('pole', P.bx(0.3, 2.9, 0.3, 0.03), P.M(o.x + x, at(x, hd) + 1.45, o.z + hd), P.C(0.25, 0.27, 0.27));
      pile.put('pole', P.bx(0.36, 0.08, 0.36, 0.02), P.M(o.x + x, at(x, hd) + 2.93, o.z + hd), P.C(0.25, 0.27, 0.27));
    });
    const bx0 = -gate - 0.6;
    pile.put('pole', P.bx(0.3, 1.0, 0.3, 0.03), P.M(o.x + bx0, at(bx0, hd + 0.6) + 0.5, o.z + hd + 0.6), P.C(0.82, 0.82, 0.8));
    for (let k = 0; k < 8; k++) pile.put('paint', P.bx(0.09, 0.62, 0.09, 0.01), P.M(o.x + bx0, at(bx0, hd + 0.6) + 1.32 + k * 0.6, o.z + hd + 0.6, 0, 0, 0.08), k % 2 ? P.C(0.9, 0.9, 0.88) : P.C(0.75, 0.06, 0.04));
    cabin(pile, o.x - 18.5, at(-18.5, -4.5), o.z - 4.5, 0, P.C(0.78, 0.8, 0.82));
    cabin(pile, o.x - 18.5, at(-18.5, -4.5) + 2.62, o.z - 4.5, 0, P.C(0.34, 0.47, 0.62));
    // материалы по местам оригинала: балки, поддоны кирпича, трубы, блоки, арматура
    const spots = [[-7, 1.5], [-5.6, 1.6], [-7.6, -1.6], [3, 2], [8, 1.8]];
    spots.forEach(function (s, i) {
      const x = s[0] * S, z = s[1] * S, y = at(x, z);
      if (i === 0) beams(pile, o.x + x, y, o.z + z);
      else if (i === 1) { P.pallet(pile, o.x + x - 0.65, y, o.z + z, 0.1, P.C(0.72, 0.36, 0.25), 'concrete', 0.65); P.pallet(pile, o.x + x + 0.65, y, o.z + z + 0.2, -0.05, P.C(0.72, 0.36, 0.25), 'concrete', 0.65); P.pallet(pile, o.x + x, y + 0.8, o.z + z + 0.1, 0.02, P.C(0.72, 0.36, 0.25), 'concrete', 0.65); }
      else if (i === 2) pipes(pile, o.x + x, y, o.z + z);
      else if (i === 3) { P.pallet(pile, o.x + x - 0.7, y, o.z + z, 0, P.C(0.85, 0.84, 0.8), 'concrete', 0.75); P.pallet(pile, o.x + x + 0.7, y, o.z + z, 0.04, P.C(0.85, 0.84, 0.8), 'concrete', 0.75); }
      else rebar(pile, o.x + x, y, o.z + z);
    });
    P.heap(pile, 'gravel', o.x + 19, at(19, -4.5), o.z - 4.5, 3.2, 1.3, 77);
    P.heap(pile, 'soil', o.x + 14.5, at(14.5, -6), o.z - 6, 2.6, 1.0, 91, P.C(1.15, 1.05, 0.9));
    crane(pile, o.x + 11, at(11, -3), o.z - 3);
    const mg = meshPile.build(M);
    mg.children.forEach(function (c) { c.customDepthMaterial = M.meshDepth; c.userData.noAO = true; });
    group.add(mg);
  }
  // Бытовка-контейнер 6 × 2,45 × 2,6 м: профлист, окна, дверь, опоры.
  function cabin(pile, x, y, z, ry, color) {
    const m = P.M(x, y, z, ry);
    const at = function (lx, ly, lz) { return m.clone().multiply(P.M(lx, ly, lz)); };
    pile.put('paintworn', P.bx(6.0, 2.5, 2.4, 0.03, [1, 1]), at(0, 1.35, 0), color);
    for (let k = 0; k < 15; k++) pile.put('paintworn', P.bx(0.05, 2.3, 0.03, 0.01), at(-2.8 + k * 0.4, 1.35, -1.215), color);
    pile.put('pole', P.bx(6.06, 0.12, 2.46, 0.02), at(0, 0.12, 0), P.C(0.25, 0.25, 0.25));
    pile.put('pole', P.bx(6.06, 0.1, 2.46, 0.02), at(0, 2.62, 0), P.C(0.25, 0.25, 0.25));
    [-1.8, 0.2, 1.8].forEach(function (lx) { pile.put('glass', P.bx(1.0, 0.8, 0.04, 0.01), at(lx, 1.6, 1.21)); pile.put('pole', P.bx(1.1, 0.06, 0.06, 0.01), at(lx, 1.17, 1.24), P.C(0.25, 0.25, 0.25)); });
    pile.put('pole', P.bx(0.9, 2.0, 0.05, 0.01), at(-0.9, 1.1, 1.21), P.C(0.3, 0.33, 0.36));
    [-2.8, 2.8].forEach(function (lx) { [-1.1, 1.1].forEach(function (lz) { pile.put('concrete', P.bx(0.3, 0.1, 0.3, 0.01, [1, 1]), at(lx, 0.05, lz)); }); });
  }
  function beams(pile, x, y, z) {
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) {
      const lx = (k - (3 - row) / 2) * 0.42, ly = 0.12 + row * 0.32;
      pile.put('steel', P.bx(0.3, 0.3, 5.2, 0.01), P.M(x + lx, y + ly + 0.15, z, 0.02 * row), P.C(0.5, 0.34, 0.24));
    }
    [-1.8, 0, 1.8].forEach(function (lz) { pile.put('planks', P.bx(1.8, 0.12, 0.12, 0.008, TILE.planks), P.M(x, y + 0.06, z + lz)); });
  }
  function pipes(pile, x, y, z) {
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) {
      const lx = (k - (3 - row) / 2) * 0.46;
      const a = new THREE.Vector3(x + lx, y + 0.24 + row * 0.4, z - 2.6), b = new THREE.Vector3(x + lx, y + 0.24 + row * 0.4, z + 2.6);
      P.tubeAB(pile, 'tube', a, b, 0.22, 0.22, P.C(0.55, 0.57, 0.6), 14);
    }
  }
  function rebar(pile, x, y, z) {
    for (let k = 0; k < 18; k++) {
      const lx = (k % 6 - 2.5) * 0.06, ly = 0.08 + Math.floor(k / 6) * 0.06;
      P.tubeAB(pile, 'steel', new THREE.Vector3(x - 3 + lx * 0.3, y + ly, z + lx), new THREE.Vector3(x + 3, y + ly, z + lx), 0.014, 0.014, P.C(0.55, 0.32, 0.22), 6);
    }
    [-2, 0, 2].forEach(function (lx) { pile.put('planks', P.bx(0.12, 0.08, 1.0, 0.008, TILE.planks), P.M(x + lx, y + 0.04, z)); });
  }
  // Башенный кран по месту и размерам оригинала: решётчатая башня, кабина, голова, стрела к бульвару,
  // противовесная консоль с бетонными блоками, тяги, тележка и крюк.
  function crane(pile, x, y, z) {
    const yellow = P.C(0.9, 0.62, 0.08);
    const V = function (a, b, c) { return new THREE.Vector3(x + a, y + b, z + c); };
    const bar = function (a, b, r) { P.tubeAB(pile, 'paintworn', a, b, r || 0.06, r || 0.06, yellow, 6); };
    pile.put('concrete', P.bx(3.6, 0.6, 3.6, 0.04, [1, 1]), P.M(x, y + 0.3, z), P.C(0.7, 0.69, 0.66));
    const H = 12.2, a = 0.7, step = 2.0;
    const cs = [[-a, -a], [a, -a], [a, a], [-a, a]];
    cs.forEach(function (c) { bar(V(c[0], 0.6, c[1]), V(c[0], H, c[1]), 0.1); });
    for (let h = 0.6; h < H - 0.1; h += step) {
      for (let k = 0; k < 4; k++) {
        const c0 = cs[k], c1 = cs[(k + 1) % 4];
        bar(V(c0[0], h, c0[1]), V(c1[0], h, c1[1]), 0.055);
        bar(V(c0[0], h, c0[1]), V(c1[0], Math.min(H, h + step), c1[1]), 0.05);
      }
    }
    // поворотная часть, кабина, голова
    pile.put('pole', P.bx(1.9, 0.5, 1.9, 0.04), P.M(x, y + H + 0.25, z), yellow);
    pile.put('paintworn', P.bx(1.2, 1.4, 1.3, 0.06), P.M(x - 0.6, y + H + 1.2, z + 1.3), P.C(0.92, 0.92, 0.9));
    pile.put('glass', P.bx(1.22, 0.7, 1.32, 0.04), P.M(x - 0.6, y + H + 1.35, z + 1.3));
    const top = V(0, H + 4.2, 0);
    [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]].forEach(function (c) { bar(V(c[0], H + 0.5, c[1]), top, 0.06); });
    // стрела: трёхгранная ферма от башни к −x (до −13,6 м), противовесная консоль к +x
    const J = H + 0.55, L = -13.6, CJ = 4.4;
    const chords = [[0, -0.45], [0, 0.45], [1.0, 0]];
    chords.forEach(function (c) { bar(V(0.7, J + c[0], c[1]), V(L, J + c[0] * 0.6, c[1] * 0.6), 0.075); });
    for (let t = 0.7; t > L + 0.5; t -= 1.2) {
      const k = (0.7 - t) / (0.7 - L), sh = 1 - 0.4 * k;
      bar(V(t, J, -0.45 * sh), V(t - 0.6, J + 1.0 * sh, 0), 0.04);
      bar(V(t, J, 0.45 * sh), V(t - 0.6, J + 1.0 * sh, 0), 0.04);
      bar(V(t, J, -0.45 * sh), V(t, J, 0.45 * sh), 0.04);
    }
    [-0.4, 0.4].forEach(function (zz) { bar(V(0, J, zz), V(CJ + 0.4, J, zz), 0.08); });
    for (let t = 0.6; t < CJ; t += 1.0) bar(V(t, J, -0.4), V(t + 0.5, J, 0.4), 0.04);
    pile.put('diamond', P.bx(CJ, 0.04, 0.9, 0.005, [0.6, 0.6]), P.M(x + CJ / 2 + 0.3, y + J + 0.06, z));
    for (let k = 0; k < 3; k++) pile.put('concrete', P.bx(0.5, 1.5, 1.2, 0.03, [1, 1]), P.M(x + CJ - 0.2 - k * 0.55, y + J - 0.6, z), P.C(0.66, 0.65, 0.62));
    // тяги от головы к стреле и консоли
    bar(top, V(L * 0.62, J + 0.65, 0), 0.035);
    bar(top, V(CJ, J + 0.05, 0), 0.035);
    // тележка у места крюка оригинала, канаты, обойма, крюк
    const hx = 1.2 - 11;
    pile.put('pole', P.bx(0.8, 0.25, 0.7, 0.02), P.M(x + hx, y + J - 0.1, z), P.C(0.25, 0.25, 0.25));
    [-0.12, 0.12].forEach(function (dz) { P.tubeAB(pile, 'blacksteel', V(hx, J - 0.2, dz), V(hx, 7.6, dz), 0.016, 0.016, P.C(0.6, 0.6, 0.6), 5); });
    pile.put('pole', P.bx(0.45, 0.6, 0.3, 0.04), P.M(x + hx, y + 7.3, z), yellow);
    P.tubeAB(pile, 'steel', V(hx, 6.95, 0), V(hx, 6.5, 0), 0.04, 0.03, P.C(0.3, 0.3, 0.3), 6);
  }

  // ---------- участки ----------
  function makeLot(record) {
    const level = MB().HQ_LEVELS[record.id];
    if (!level) return null;
    const inner = record.solids[0] ? record.solids[0].parent : record.lot;
    record.lot.updateWorldMatrix(true, true);
    const lp = new THREE.Vector3().setFromMatrixPosition(record.lot.matrixWorld).multiplyScalar(S);
    const ip = new THREE.Vector3().setFromMatrixPosition(inner.matrixWorld).multiplyScalar(S);
    const p = record.soil.geometry.parameters;
    // Подставной мир — кубы чертежа со сдвигом к нулю: building.js режет здание на куски 8 × 8 × 8 клеток, а
    // чертежи штаба стоят вокруг 0 (−2…2) — без сдвига здание легло бы в 4 куска (вчетверо больше вызовов).
    let mx = Infinity, mz = Infinity;
    level.blocks.forEach(function (b) { mx = Math.min(mx, b.x); mz = Math.min(mz, b.z); });
    const blocks = level.blocks.map(function (b) { return Object.assign({}, b, { x: b.x - mx, z: b.z - mz, built: false, poured: 0, owner: -1 }); });
    const world = { blocks: blocks, remaining: blocks.length, builders: [], camp: [], level: level };
    // lampLight: false — без своего источника света у фонаря на крыше (в квартале он прятался бы вместе с группой,
    // а смена числа источников пересобирает все шейдеры); фонарь светит своим стеклом.
    const house = createBuilding({ E: cityE, mats: mats, bevel: !!quality.bevel, pom: !!quality.taa, lampLight: false });
    house.setGhost(false);
    house.build(world);
    house.group.position.set(ip.x + mx * S, base + 0.1, ip.z + mz * S);
    group.add(house.group);
    const feat = new Map();
    record.features.forEach(function (f) { feat.set(f.block.id, f.object); });
    // клетки следа здания (по всем ярусам) — для лесов вокруг
    const foot = new Set();
    blocks.forEach(function (b) { foot.add(b.x + ',' + b.z); });
    return { id: record.id, record, level, world, house, feat, foot, lp, ip, w: p.width * S, d: p.height * S, hash: 0, state: '', ghost: [], builtSig: '', scaffold: null, quiet: 0, version: 0, hidden: null, kids: null,
      live: null, liveHidden: null, liveKids: null, liveAt: 0, layer: null };
  }

  // Состояние участка — из экземпляров квартала оригинала: масштаб куба (0 — нет, 1 — стоит, между — растёт),
  // силуэт — масштаб куба чертежа, особые блоки (дверь, стекло, фонарь) — масштаб их группы.
  function readLot(L) {
    const r = L.record;
    let h = (r.paving.visible ? 1 : 0) + (r.fence.visible ? 2 : 0) + (r.soil.visible ? 4 : 0);
    for (let i = 0; i < r.blocks.length; i++) {
      const it = r.blocks[i];
      const s = it.solid.instanceMatrix.array[it.index * 16 + 5], g = it.ghost.instanceMatrix.array[it.index * 16 + 5];
      h = (Math.imul(h, 31) + Math.round(s * Q) * 3 + (g > 0.5 ? 1 : 0)) | 0;
    }
    for (let i = 0; i < r.features.length; i++) h = (Math.imul(h, 31) + (r.features[i].object.scale.x > 0.5 ? 7 : 1)) | 0;
    if (h === L.hash) return false;
    L.hash = h;
    const MBk = MB();
    const scaleOf = new Map(), ghostOf = new Map();
    r.blocks.forEach(function (it) {
      scaleOf.set(it.block.id, it.solid.instanceMatrix.array[it.index * 16 + 5]);
      ghostOf.set(it.block.id, it.ghost.instanceMatrix.array[it.index * 16 + 5] > 0.5);
    });
    const featBuilt = function (id) { const o = L.feat.get(id); return !!o && o.scale.x > 0.5; };
    let remaining = 0;
    const ghost = [];
    L.world.blocks.forEach(function (b) {
      let built, fill = 0;
      if (b.glassOf !== undefined || b.feature) built = featBuilt(b.id);
      else if (b.glassId !== undefined && featBuilt(b.glassId)) built = true;
      else {
        const s = scaleOf.get(b.id) || 0;
        built = s > 0.999;
        if (!built && s > 0.002) fill = s;
      }
      b.built = built;
      b.poured = fill ? fill * MBk.pourTotal(b) : 0;
      if (!built) remaining++;
      if (!built && ghostOf.get(b.id) && b.glassOf === undefined) ghost.push([b.x, b.y, b.z]);
    });
    L.world.remaining = remaining;
    L.ghost = ghost;
    // готовое здание, что ждёт показа (meta.citySeen), у оригинала — пустое мощение без силуэта: не «участок под
    // застройку» (разбивка колышками — только при силуэте чертежа)
    L.state = r.soil.visible ? 'locked' : r.fence.visible ? 'building' : remaining < L.world.blocks.length ? 'live' : ghost.length ? 'plot' : 'wait';
    return true;
  }

  // Леса вокруг строящегося здания: рамы по клеткам вокруг следа до яруса над верхней готовой деталью, настилы
  // с перилами, лестница у фасада (scaffold.js с подставным миром — как леса площадки).
  function syncScaffold(L) {
    const on = L.state === 'building';
    let sig = '';
    if (on) L.world.blocks.forEach(function (b) { if (b.built) sig += b.id + ','; });
    if (sig === L.builtSig && (!!L.scaffold === on)) return;
    L.builtSig = sig;
    if (!on) { if (L.scaffold) { L.scaffold.clear(); group.remove(L.scaffold.group); L.scaffold = null; } return; }
    if (!L.scaffold) {
      L.scaffold = createScaffold({ E: ctx.E, mats: mats });
      L.scaffold.group.position.copy(L.house.group.position);
      group.add(L.scaffold.group);
    }
    const top = new Map();
    L.world.blocks.forEach(function (b) { if (b.built) { const k = b.x + ',' + b.z; top.set(k, Math.max(top.has(k) ? top.get(k) : -1, b.y)); } });
    const maxY = L.level.footprint.maxY;
    const ring = new Map();
    L.foot.forEach(function (k) {
      const xz = k.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const nk = (xz[0] + dx) + ',' + (xz[1] + dz);
        if (L.foot.has(nk)) continue;
        const t = top.has(k) ? top.get(k) : -1;
        const cur = ring.get(nk) || { x: xz[0] + dx, z: xz[1] + dz, top: -1, ox: 0, oz: 0 };
        cur.top = Math.max(cur.top, t);
        if (Math.abs(dx) + Math.abs(dz) === 1) { cur.ox = -dx; cur.oz = -dz; }
        ring.set(nk, cur);
      }
    });
    const pieces = [];
    let ladder = false;
    ring.forEach(function (c) {
      if (c.top < 0) return;
      const levels = Math.min(maxY, c.top + 1);
      const isLadder = !ladder && c.oz === -1 && c.ox === 0;
      if (isLadder) ladder = true;
      for (let y = 0; y <= levels; y++) {
        pieces.push({ id: pieces.length, x: c.x, y: y, z: c.z, built: true, removed: false, ox: c.ox, oz: c.oz, deck: y >= 1, ladder: isLadder });
      }
    });
    refreshShadows();
    const fake = { scaffoldPieces: pieces, scaffoldDecks: [] };
    L.scaffold.build(fake);
    L.scaffold.update();
    ctx.linkSkyTree(L.scaffold.group);
  }

  // Покрытия и вещи участков по их состоянию (пересборка при смене): закрытый — земля, колышки с лентой и щит;
  // открытый — брусчатка в гранитной рамке; стройка — оранжевая сетка по краю, поддоны, песок; работает —
  // скамьи и кусты у входа; участок под здание — разбивочные колышки по углам следа.
  // Вещи участка собираются в его пачки один раз на состояние (кеш L.layer): при смене одного участка остальные
  // не пересобираются, слой — копия готовых пачек.
  function syncLotLayer() {
    const sig = lots.map(function (L) { return L.id + ':' + L.state; }).join(';');
    if (sig === lotSig) return;
    lotSig = sig;
    refreshShadows();
    if (lotLayer) { group.remove(lotLayer); lotLayer.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
    const pile = new P.Pile(), netPile = new P.Pile();
    lots.forEach(function (L) {
      if (!L.layer || L.layer.state !== L.state) {
        L.layer = { state: L.state, pile: new P.Pile(), net: new P.Pile() };
        lotPile(L, L.layer.pile, L.layer.net);
        L.layer.pile.compact(); L.layer.net.compact();
      }
      pile.absorb(L.layer.pile);
      netPile.absorb(L.layer.net);
    });
    lotLayer = pile.build(M, FLAT, TINT);
    lotLayer.children.forEach(function (c) { if (c.material === M.leaves) { c.customDepthMaterial = M.leafDepthLot; c.userData.noAO = true; } });
    const nets = netPile.build(M);
    // сетка — карточки с вырезом по альфе: в затенении углов «Высокой» (GTAO рисует их сплошными) — не нужна
    nets.children.forEach(function (c) { c.customDepthMaterial = M.netDepth; c.userData.noAO = true; });
    lotLayer.add(nets);
    group.add(lotLayer);
    ctx.linkSkyTree(lotLayer);
  }
  function lotPile(L, pile, netPile) {
    const x0 = L.lp.x - L.w / 2, x1 = L.lp.x + L.w / 2, z0 = L.lp.z - L.d / 2, z1 = L.lp.z + L.d / 2;
    if (L.state === 'locked') {
      // пустырь: земля волнами по сетке — колеи от въезда, лужи и сырые пятна темнее, сухие бугры светлее
      pile.put('soil', P.bxw(x0 + 0.05, base - 0.1, z0 + 0.05, x1 - 0.05, base + 0.05, z1 - 0.05, 0.03, TILE.dirt), null, P.C(0.95, 0.9, 0.85));
      pile.putGrid('soil', wasteland(L, x0 + 0.05, x1 - 0.05, z0 + 0.05, z1 - 0.05));
      // бурьян кочками по краям и у колышков, пара кустиков посреди
      const wr = rng(L.id.length * 31 + 7);
      for (let k = 0; k < (phone ? 10 : 22); k++) {
        const edge = k % 3 !== 2;
        const u = wr(), v = wr();
        const wx = edge ? (u < 0.5 ? x0 + 0.5 + wr() * 1.4 : x1 - 0.5 - wr() * 1.4) : x0 + 2 + u * (L.w - 4);
        const wz = edge ? z0 + 0.5 + v * (L.d - 1) : z0 + 2 + v * (L.d - 4);
        const s = 0.35 + wr() * 0.45;
        P.bush(pile, wx, base + 0.04, wz, s, s * (0.55 + wr() * 0.4), k * 13 + L.id.length, P.C(1.0 + 0.3 * wr(), 0.95 + 0.12 * wr(), 0.5 + 0.2 * wr()));
      }
      // колышки по периметру и красно-белая лента
      const posts = [];
      for (let x = x0 + 0.4; x <= x1 - 0.39; x += (L.w - 0.8) / 6) { posts.push([x, z0 + 0.4]); posts.push([x, z1 - 0.4]); }
      for (let z = z0 + 0.4 + (L.d - 0.8) / 4; z < z1 - 0.5; z += (L.d - 0.8) / 4) { posts.push([x0 + 0.4, z]); posts.push([x1 - 0.4, z]); }
      posts.forEach(function (p) { pile.put('planks', P.bx(0.06, 0.8, 0.06, 0.006, TILE.planks), P.M(p[0], base + 0.4, p[1]), P.C(0.9, 0.85, 0.8)); });
      const tape = function (ax, az, bx, bz) {
        const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.8), ang = Math.atan2(bx - ax, bz - az);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          pile.put('paint', P.sbx(0.008, 0.07, len / n), P.M(ax + (bx - ax) * t, base + 0.7, az + (bz - az) * t, ang), k % 2 ? P.C(0.92, 0.92, 0.9) : P.C(0.8, 0.07, 0.05));
        }
      };
      tape(x0 + 0.4, z0 + 0.4, x1 - 0.4, z0 + 0.4); tape(x0 + 0.4, z1 - 0.4, x1 - 0.4, z1 - 0.4);
      tape(x0 + 0.4, z0 + 0.4, x0 + 0.4, z1 - 0.4); tape(x1 - 0.4, z0 + 0.4, x1 - 0.4, z1 - 0.4);
      // щит «участок» у передней кромки, бурьян и камни
      const sx = L.lp.x + (L.lp.x > 0 ? -5 : 5), sz = z1 - 1.0;
      [-0.7, 0.7].forEach(function (dx) { pile.put('planks', P.bx(0.08, 1.7, 0.08, 0.008, TILE.planks), P.M(sx + dx, base + 0.85, sz), P.C(0.85, 0.8, 0.72)); });
      pile.put('planks', P.bx(1.7, 0.9, 0.04, 0.01, TILE.planks), P.M(sx, base + 1.35, sz + 0.05), P.C(0.95, 0.9, 0.82));
      pile.put('sign', plate(1.5, 0.7, SIGNS.rect('plot')), P.M(sx, base + 1.35, sz + 0.073));
      P.heap(pile, 'gravel', L.lp.x - 3, base + 0.04, L.lp.z - 3, 1.6, 0.5, L.id.length * 13 + 1);
      P.heap(pile, 'soil', L.lp.x + 4, base + 0.02, L.lp.z + 1.5, 2.2, 0.6, L.id.length * 17 + 3, P.C(1.1, 1.0, 0.9));
      return;
    }
    // брусчатка участка и гранитная рамка
    pile.put('pavers', P.bxw(x0 + 0.14, base - 0.1, z0 + 0.14, x1 - 0.14, base + 0.1, z1 - 0.14, 0.01, CT.pavers), null, P.C(1.04, 1.02, 0.98));
    const frame = function (ax, az, bx, bz) { pile.put('curb', P.bxw(ax, base - 0.08, az, bx, base + 0.14, bz, 0.02, TILE.dressed), null, P.C(0.6, 0.6, 0.62)); };
    frame(x0, z0, x1, z0 + 0.14); frame(x0, z1 - 0.14, x1, z1); frame(x0, z0 + 0.14, x0 + 0.14, z1 - 0.14); frame(x1 - 0.14, z0 + 0.14, x1, z1 - 0.14);
    const fp = L.level.footprint;
    const fx0 = L.ip.x + fp.minX * S, fx1 = L.ip.x + (fp.maxX + 1) * S, fz0 = L.ip.z + fp.minZ * S, fz1 = L.ip.z + (fp.maxZ + 1) * S;
    if (L.state === 'plot') {
      // разбивка: колышки по углам следа, шнур между ними
      [[fx0, fz0], [fx1, fz0], [fx1, fz1], [fx0, fz1]].forEach(function (c, i, a) {
        pile.put('planks', P.bx(0.05, 0.5, 0.05, 0.005, TILE.planks), P.M(c[0], base + 0.35, c[1]), P.C(0.95, 0.88, 0.75));
        pile.put('paint', P.bx(0.06, 0.06, 0.06, 0.01), P.M(c[0], base + 0.6, c[1]), P.C(0.85, 0.1, 0.06));
        const n = a[(i + 1) % 4];
        const len = Math.hypot(n[0] - c[0], n[1] - c[1]);
        pile.put('paint', P.bx(0.008, 0.008, len, 0), P.M((c[0] + n[0]) / 2, base + 0.45, (c[1] + n[1]) / 2, Math.atan2(n[0] - c[0], n[1] - c[1])), P.C(0.95, 0.95, 0.9));
      });
    }
    if (L.state === 'building') {
      // ограждение: стойки и оранжевая сетка по краю участка (как забор оригинала), материалы у ворот
      const hw = L.w / 2 - 0.6, hd = L.d / 2 - 0.6;
      const side = function (ax, az, bx, bz) {
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2.4)), ang = Math.atan2(bx - ax, bz - az);
        for (let k = 0; k <= n; k++) {
          const t = k / n;
          pile.put('steel', P.bx(0.035, 1.3, 0.035, 0.008), P.M(L.lp.x + ax + (bx - ax) * t, base + 0.75, L.lp.z + az + (bz - az) * t), P.C(0.6, 0.6, 0.62));
          pile.put('paint', P.bx(0.05, 0.05, 0.05, 0.01), P.M(L.lp.x + ax + (bx - ax) * t, base + 1.42, L.lp.z + az + (bz - az) * t), P.C(0.95, 0.94, 0.9));
        }
        netPile.put('net', P.bx(0.004, 1.1, len, 0, [0.5, 0.5]), P.M(L.lp.x + (ax + bx) / 2, base + 0.8, L.lp.z + (az + bz) / 2, ang));
        // белая лента по верху (цвета забора оригинала)
        pile.put('paint', P.bx(0.012, 0.1, len, 0.004), P.M(L.lp.x + (ax + bx) / 2, base + 1.32, L.lp.z + (az + bz) / 2, ang), P.C(0.95, 0.94, 0.9));
      };
      side(-hw, -hd, hw, -hd); side(-hw, hd, hw, hd); side(-hw, -hd, -hw, hd); side(hw, -hd, hw, hd);
      // паспорт объекта на стойках перед забором (ближе к бульвару), знаки «идёт стройка» на сетке — спереди и
      // со стороны бульвара
      const toRoad = L.lp.x > 0 ? -1 : 1;
      const px = L.lp.x + toRoad * (hw - 2.0), pz = L.lp.z + hd + 0.3;
      [-0.72, 0.72].forEach(function (dx) { pile.put('steel', P.bx(0.06, 2.15, 0.06, 0.01), P.M(px + dx, base + 1.075, pz - 0.035), P.C(0.32, 0.33, 0.35)); });
      pile.put('paintworn', P.bx(1.62, 1.14, 0.03, 0.008), P.M(px, base + 1.55, pz), P.C(0.2, 0.22, 0.24));
      pile.put('sign', plate(1.5, 1.03, SIGNS.rect('passport')), P.M(px, base + 1.55, pz + 0.017));
      [[L.lp.x - toRoad * 1.6, L.lp.z + hd + 0.012, 0], [L.lp.x + toRoad * (hw + 0.012), L.lp.z, toRoad * Math.PI / 2]].forEach(function (w) {
        const m = P.M(w[0], base + 0.88, w[1], w[2]);
        pile.put('paint', P.bx(0.94, 0.22, 0.01, 0.003), m, P.C(0.78, 0.78, 0.76));
        pile.put('sign', plate(0.9, 0.183, SIGNS.rect('warn')), m.clone().multiply(P.M(0, 0, 0.0065)));
      });
      const tint = L.level.blocks.length ? brickTint(L.level.blocks[0].materialId) : P.C(0.8, 0.75, 0.7);
      const sx = Math.min(L.lp.x + hw - 0.8, (fx1 + 2 + L.lp.x + hw) / 2);
      P.pallet(pile, sx, base + 0.1, L.lp.z + hd - 1.2, 0.05, tint, 'concrete', 0.6);
      P.pallet(pile, sx, base + 0.1, L.lp.z + hd - 2.6, -0.04, tint, 'concrete', 0.5);
      P.heap(pile, 'gravel', L.lp.x - (sx - L.lp.x), base + 0.1, L.lp.z + hd - 1.6, 1.5, 0.6, L.id.length * 7 + 5, P.C(1.15, 1.05, 0.85));
    }
    if (L.state === 'live') landscape(pile, L, x0, x1, z0, z1, fx0, fx1, fz0, fz1);
  }
  // Пустырь закрытого участка: сетка земли по кромке на уровне покрытий, внутри — бугры, две колеи от въезда
  // (передняя кромка, к бульвару) с изгибом вглубь, лужи — впадины темнее, сухие пятна светлее.
  function wasteland(L, x0, x1, z0, z1) {
    const seed = L.id.length * 1.7 + L.lp.z * 0.13 + L.lp.x * 0.07;
    const cx = L.lp.x + Math.sin(seed * 3.1) * 2.5;
    const track = function (x, z) {
      const t = (z1 - z) / (z1 - z0);
      const c = cx + Math.sin(t * 2.4 + seed) * 2.2 * t;
      const d = Math.abs(Math.abs(x - c) - 0.8);
      return Math.exp(-d * d / 0.03) * (t < 0.8 ? 1 : Math.max(0, (1 - t) / 0.2));
    };
    const pools = [];
    for (let k = 0; k < 3; k++) pools.push([L.lp.x + Math.sin(seed * (k + 2.3)) * L.w * 0.32, L.lp.z + Math.cos(seed * (k + 1.7)) * L.d * 0.3, 0.9 + 0.7 * Math.abs(Math.sin(seed * k + 1))]);
    const puddle = function (x, z) {
      let p = 0;
      pools.forEach(function (q) { p = Math.max(p, 1 - THREE.MathUtils.smoothstep(Math.hypot((x - q[0]) / q[2], (z - q[1]) / (q[2] * 0.7)), 0.55, 1.0)); });
      return p;
    };
    const edge = function (x, z) { return Math.min(1, Math.min(x - x0, x1 - x, z - z0, z1 - z) / 0.6); };
    return P.groundGrid(x0, x1, z0, z1, phone ? 1 : 0.4, function (x, z) {
      const n = Math.sin(x * 1.3 + z * 0.7) * Math.sin(z * 1.1 - x * 0.4) * 0.035 + Math.sin(x * 4.1 + z * 3.3) * 0.01;
      return base + 0.055 + edge(x, z) * (n + 0.035 - 0.05 * track(x, z) - 0.045 * puddle(x, z));
    }, TILE.dirt, function (x, z) {
      const tr = track(x, z), pd = puddle(x, z);
      const dry = 0.5 + 0.5 * Math.sin(x * 0.5 + z * 0.8 + seed) * Math.sin(z * 0.37 - x * 0.21);
      const k = (0.88 + 0.2 * dry) * (1 - 0.25 * tr) * (1 - 0.5 * pd);
      return P.C(k * 0.98, k * 0.92, k * 0.85);
    });
  }

  // Благоустройство работающего здания: газоны в гранитных бортах по бокам и за зданием (вокруг здания —
  // отмостка из брусчатки участка), кусты и туи в газонах, дорожка из плит от кромки к двери со светящимися
  // столбиками, туи у входа, вазоны с кустами и стела с полосой цвета здания у кромки.
  function landscape(pile, L, x0, x1, z0, z1, fx0, fx1, fz0, fz1) {
    const m = 0.9, e = 0.55, front = 2.6, cw = 0.12;
    const r = rng(L.id.length * 97 + 11);
    const beds = [];
    const left = fx0 - m - (x0 + e) > 1.2, right = x1 - e - (fx1 + m) > 1.2;
    if (left) beds.push([x0 + e, fx0 - m, z0 + e, z1 - front]);
    if (right) beds.push([fx1 + m, x1 - e, z0 + e, z1 - front]);
    if (fz0 - m - (z0 + e) > 1.0) beds.push([left ? fx0 - m : x0 + e, right ? fx1 + m : x1 - e, z0 + e, fz0 - m]);
    const ct = P.C(0.62, 0.62, 0.64);
    beds.forEach(function (b) {
      const bx0 = b[0], bx1 = b[1], bz0 = b[2], bz1 = b[3];
      pile.put('lawn', P.bxw(bx0 + cw, base + 0.02, bz0 + cw, bx1 - cw, base + 0.13, bz1 - cw, 0.01, TILE.grass), null, P.C(0.9, 1.0, 0.88));
      pile.put('curb', P.bxw(bx0, base + 0.02, bz0, bx1, base + 0.18, bz0 + cw, 0.015, TILE.dressed), null, ct);
      pile.put('curb', P.bxw(bx0, base + 0.02, bz1 - cw, bx1, base + 0.18, bz1, 0.015, TILE.dressed), null, ct);
      pile.put('curb', P.bxw(bx0, base + 0.02, bz0 + cw, bx0 + cw, base + 0.18, bz1 - cw, 0.015, TILE.dressed), null, ct);
      pile.put('curb', P.bxw(bx1 - cw, base + 0.02, bz0 + cw, bx1, base + 0.18, bz1 - cw, 0.015, TILE.dressed), null, ct);
      // кусты: по одному на ~5 м² газона, вдали от бортов; в дальнем углу — туя
      const w = bx1 - bx0 - 1.2, d = bz1 - bz0 - 1.2;
      if (w < 0.3 || d < 0.3) return;
      const n = Math.min(phone ? 3 : 6, Math.max(1, Math.round(w * d / 5)));
      for (let k = 0; k < n; k++) {
        const s = 0.6 + r() * 0.7;
        P.bush(pile, bx0 + 0.6 + r() * w, base + 0.12, bz0 + 0.6 + r() * d, s, s * (0.65 + r() * 0.3), k * 7 + L.id.length * 5, P.C(0.85 + 0.2 * r(), 0.95 + 0.1 * r(), 0.8 + 0.15 * r()));
      }
      P.thuja(pile, bx0 + 0.75, base + 0.12, bz0 + 0.75, 1.5 + r() * 0.5, L.id.length + bz0);
    });
    // дорожка к двери: от кромки участка до фасада в створе двери
    const door = L.level.blocks.find(function (b) { return b.feature === 'door'; });
    const dx = door ? L.ip.x + (door.x + 0.5) * S : (fx0 + fx1) / 2;
    // фасад в створе точки x: передняя грань самого выдвинутого куба этого столбца клеток
    const frontAt = function (wx) {
      const cell = Math.floor((wx - L.ip.x) / S);
      let f = -Infinity;
      L.level.blocks.forEach(function (b) { if (b.x === cell) f = Math.max(f, L.ip.z + (b.z + 1) * S); });
      return f;
    };
    let fz = frontAt(dx);
    if (!isFinite(fz)) fz = fz1;
    pile.put('slabs', P.bxw(dx - 0.9, base + 0.03, fz, dx + 0.9, base + 0.106, z1 - 0.14, 0.008, CT.slabs), null, P.C(1.05, 1.03, 1.0));
    [-1, 1].forEach(function (sd) {
      pile.put('curb', P.bxw(dx + sd * 0.9 - (sd > 0 ? 0 : 0.1), base + 0.03, fz, dx + sd * 0.9 + (sd > 0 ? 0.1 : 0), base + 0.115, z1 - 0.14, 0.01, TILE.dressed), null, ct);
      const bf = Math.max(fz, frontAt(dx + sd * 1.25));
      for (let z = z1 - 0.9; z > bf + 1.2; z -= 2.6) P.bollard(pile, dx + sd * 1.25, base + 0.1, z);
      const tz = Math.max(fz, frontAt(dx + sd * 1.55)) + 0.55;
      if (tz < z1 - 1.6) P.thuja(pile, dx + sd * 1.55, base + 0.1, tz, 1.75 + r() * 0.3, L.id.length * 3 + sd);
      // вазоны у кромки: бетонный короб с кустом
      const vx = dx + sd * 2.3, vz = z1 - 0.85;
      pile.put('concrete', P.bx(0.9, 0.5, 0.9, 0.03, [1, 1]), P.M(vx, base + 0.35, vz), P.C(0.74, 0.73, 0.7));
      pile.put('soil', P.bx(0.78, 0.02, 0.78, 0.01, [4, 4]), P.M(vx, base + 0.59, vz));
      P.bush(pile, vx, base + 0.58, vz, 0.8, 0.6, L.id.length * 11 + sd * 3, P.C(0.9, 1.0, 0.85));
    });
    // стела с полосой цвета здания у кромки, со стороны бульвара
    const toRoad = L.lp.x > 0 ? -1 : 1;
    const sx = THREE.MathUtils.clamp(dx + toRoad * 4.2, x0 + 1.0, x1 - 1.0);
    P.stele(pile, sx, base + 0.1, z1 - 1.0, 0, L.level.blocks.length ? brickTint(L.level.blocks[0].materialId) : P.C(0.6, 0.6, 0.6));
    // табличка с названием здания на панели стелы
    const nr = SIGNS.rect(L.id);
    if (nr) pile.put('sign', plate(0.95, 0.193, nr), P.M(sx, base + 0.1 + 1.28, z1 - 1.0 + 0.1125));
  }

  function brickTint(id) {
    const m = MB().MATERIAL[id];
    const c = new THREE.Color(m ? m.color : 0xbbbbbb).convertSRGBToLinear();
    return P.C(Math.min(2, c.r / 0.32), Math.min(2, c.g / 0.32), Math.min(2, c.b / 0.32));
  }

  // Силуэт будущих зданий одним мешем (пересборка при смене набора кубов чертежа).
  function syncGhost() {
    const sig = lots.map(function (L) { return L.id + ':' + L.ghost.length + ':' + (L.ghost.length ? L.ghost[0].join('.') + L.ghost[L.ghost.length - 1].join('.') : ''); }).join(';');
    if (sig === ghostSig) return;
    ghostSig = sig;
    if (ghostMesh) { group.remove(ghostMesh); ghostMesh.geometry.dispose(); ghostMesh = null; }
    const cubes = [];
    lots.forEach(function (L) { L.ghost.forEach(function (c) { cubes.push([c[0], c[1], c[2], L.house.group.position.x, L.house.group.position.y, L.house.group.position.z]); }); });
    if (!cubes.length) return;
    ghostMesh = new THREE.Mesh(P.ghostGeometry(cubes), M.ghost);
    ghostMesh.renderOrder = 5;
    ghostMesh.name = 'city-ghost';
    // прозрачное поверх кадра — не в затенение углов «Высокой» (post.js → GTAO рисует глубину всех мешей)
    ghostMesh.userData.noAO = true;
    ghostMesh.frustumCulled = false;
    group.add(ghostMesh);
  }

  // Здания, что стоят без изменений полсекунды, сливаются в общие меши по материалу (building.js рисует каждое
  // здание своим набором мешей: кладка, рамы, плиты, сталь, стекло, двери) — квартал из пяти зданий ~10 вызовов
  // вместо ~50. Меняется здание (стройка, рост нового) — оно рисуется само, пока снова не успокоится.
  let merged = null, mergedSig = '';
  const _wp = new THREE.Vector3();
  const _mw = new THREE.Matrix4(), _inv = new THREE.Matrix4();
  function isLit(m) { return m.isMeshStandardMaterial && !m.map && m.emissive && m.emissive.getHex() === 0xffb068; }
  function mergeHouses() {
    const members = lots.filter(function (L) { return L.quiet > 30 && L.house.group.children.length > 0; });
    const sig = members.map(function (L) { return L.id + ':' + L.version; }).join(';');
    if (sig === mergedSig) return;
    mergedSig = sig;
    refreshShadows();
    members.forEach(dropLive);
    // слитые меши участка прячутся по одному (несливаемое — пятна света, частицы — остаётся видно)
    lots.forEach(function (L) { if (L.hidden) { L.hidden.forEach(function (o) { o.visible = true; }); L.hidden = null; } });
    if (merged) { group.remove(merged); merged.children.forEach(function (m) { m.geometry.dispose(); }); merged = null; }
    if (!members.length) return;
    group.updateMatrixWorld(true);
    _inv.copy(group.matrixWorld).invert();
    const buckets = new Map();
    let lit = null;
    members.forEach(function (L) {
      L.hidden = [];
      L.house.group.updateMatrixWorld(true);
      L.house.group.traverse(function (o) {
        if (!o.isMesh || !o.visible || !o.geometry.index || !o.geometry.attributes.color || o.isInstancedMesh) return;
        let m = o.material;
        if (Array.isArray(m)) return;
        if (isLit(m)) { if (!lit) lit = m; m = lit; }
        let b = buckets.get(m);
        if (!b) { b = { geos: [], cast: o.castShadow, order: o.renderOrder }; buckets.set(m, b); }
        const g = o.geometry.clone();
        g.applyMatrix4(_mw.multiplyMatrices(_inv, o.matrixWorld));
        b.geos.push(g);
        L.hidden.push(o);
      });
      L.hidden.forEach(function (o) { o.visible = false; });
      L.kids = new Set(L.house.group.children);
    });
    merged = new THREE.Group();
    merged.name = 'city-houses';
    buckets.forEach(function (b, m) {
      const g = mergeGeometries(b.geos, false);
      b.geos.forEach(function (x) { x.dispose(); });
      if (!g) return;
      const mesh = new THREE.Mesh(g, m);
      mesh.name = 'city-house';
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      mesh.renderOrder = b.order;
      merged.add(mesh);
    });
    group.add(merged);
  }

  // Меши здания (building.js: куски кладки, растущие детали) → по мешу на материал; исходные — скрыть.
  function mergeOne(L, cast) {
    const buckets = new Map(), hide = [];
    group.updateMatrixWorld(true);
    _inv.copy(group.matrixWorld).invert();
    L.house.group.updateMatrixWorld(true);
    let lit = null;
    L.house.group.traverse(function (o) {
      if (!o.isMesh || !o.visible || !o.geometry.index || !o.geometry.attributes.color || o.isInstancedMesh || Array.isArray(o.material)) return;
      let m = o.material;
      if (isLit(m)) { if (!lit) lit = m; m = lit; }
      let b = buckets.get(m);
      if (!b) { b = { geos: [], order: o.renderOrder, cast: o.castShadow }; buckets.set(m, b); }
      const g = o.geometry.clone();
      g.applyMatrix4(_mw.multiplyMatrices(_inv, o.matrixWorld));
      b.geos.push(g);
      hide.push(o);
    });
    const out = new THREE.Group();
    out.name = 'city-house-live';
    buckets.forEach(function (b, m) {
      const g = mergeGeometries(b.geos, false);
      b.geos.forEach(function (x) { x.dispose(); });
      if (!g) return;
      const mesh = new THREE.Mesh(g, m);
      mesh.name = 'city-house';
      mesh.castShadow = cast && b.cast;
      mesh.receiveShadow = true;
      mesh.renderOrder = b.order;
      out.add(mesh);
    });
    hide.forEach(function (o) { o.visible = false; });
    return { group: out, hidden: hide };
  }
  // Растущее здание (рост нового по порядку кубов, стройка) building.js рисует кусками и растущими деталями —
  // полсотни мешей с тенью (на «Телефоне» +90 вызовов при бюджете 150, на «Максимуме» +200). Пока оно не
  // успокоилось, его меши сливаются в один на материал раз в LIVE_EVERY кадров: на «Телефоне» — раз в 6 (рост
  // ступенями по 0,1 с) и без тени, выше — раз в 3 (по 0,05 с) с тенью. Новые куски между слияниями ждут
  // следующего (скрыты), ушедшие — до него видны слитыми.
  const LIVE_EVERY = phone ? 6 : 3;
  let frameNo = 0;
  function liveMerge(L) {
    if (L.live && frameNo - L.liveAt < LIVE_EVERY) {
      L.house.group.children.forEach(function (c) {
        if (L.liveKids.has(c)) return;
        L.liveKids.add(c);
        c.traverse(function (o) { if (o.isMesh && o.visible) { o.visible = false; L.liveHidden.push(o); } });
      });
      return;
    }
    dropLive(L);
    const r = mergeOne(L, !phone);
    L.live = r.group; L.liveHidden = r.hidden; L.liveAt = frameNo;
    L.liveKids = new Set(L.house.group.children);
    group.add(L.live);
    ctx.linkSkyTree(L.live);
  }
  function dropLive(L) {
    if (!L.live) return;
    L.liveHidden.forEach(function (o) { o.visible = true; });
    group.remove(L.live);
    L.live.children.forEach(function (m) { m.geometry.dispose(); });
    L.live = null; L.liveHidden = null; L.liveKids = null;
  }

  // ---------- машины: те же полосы и места, что у машин оригинала ----------
  function makeCars(list, yRoad) {
    cars = list.map(function (o) {
      let color = 0xcccccc;
      o.traverse(function (c) { if (c.isMesh && c.material && c.material.color && color === 0xcccccc && c.geometry.type === 'BoxGeometry') color = c.material.color.getHex(); });
      const geo = P.carGeometry(color, phone);
      const g = new THREE.Group();
      const body = new THREE.Mesh(geo.body, M.car);
      body.name = 'city-car';
      body.castShadow = body.receiveShadow = true;
      g.add(body);
      let front = null, rear = null;
      if (geo.axle) {
        front = new THREE.Mesh(geo.axle, M.car); rear = new THREE.Mesh(geo.axle, M.car);
        front.position.set(0, 0.31, 1.24); rear.position.set(0, 0.31, -1.22);
        front.castShadow = rear.castShadow = true;
        g.add(front, rear);
      }
      g.visible = false;
      group.add(g);
      markDynamic(g);
      return { orig: o, group: g, front, rear, last: null, y: yRoad };
    });
  }
  function syncCars() {
    cars.forEach(function (c) {
      const o = c.orig;
      // у концов бульвара машина оригинала плавно уменьшается (game.js → tickCityBuild: edge / 1,5) — и эта
      const on = o.visible && o.scale.x > 0.02;
      c.group.visible = on;
      c.group.scale.setScalar(Math.min(1, o.scale.x));
      const z = o.position.z * S;
      if (c.last !== null) {
        const d = z - c.last;
        if (Math.abs(d) < 5 && c.front) { const a = d / 0.31 * (o.rotation.y > 1 ? -1 : 1); c.front.rotation.x += a; c.rear.rotation.x += a; }
      }
      c.last = z;
      c.group.position.set(o.position.x * S, c.y, z);
      c.group.rotation.y = o.rotation.y;
    });
  }

  // ---------- сборка ----------
  function build(root) {
    const t0 = performance.now();
    if (early) { group.remove(early); early.userData.geo.dispose(); early = null; }
    const ids = Array.from(B.D.cityRecords().keys()).filter(function (id) { return !!MB().HQ_LEVELS[id]; });
    SIGNS = createSignAtlas(ctx.renderer, ids, ids.map(function (id) { return MB().HQ_LEVELS[id].name; }), phone ? 512 : 1024);
    const dot = M.sign.map;
    M.sign.map = SIGNS.texture;
    dot.dispose();
    const t1 = performance.now();
    const sc = scan(root);
    if (!sc.road) throw new Error('квартал оригинала: не найдена проезжая часть');
    // всё неподвижное бульвара и зоны — одной пачкой: по мешу на материал
    const still = new P.Pile();
    const bl = boulevard(sc, still);
    if (sc.zone) expansion(sc.zone, still);
    stillGroup = still.build(M, FLAT, TINT);
    group.add(stillGroup);
    origRing = sc.ring;
    // кольцо выбора: внутренний размер — как у оригинала (участок + 0,6) × 2
    const strip = origRing ? origRing.children[0].geometry.parameters : { width: 10.6, depth: 0.24 };
    const side = origRing ? origRing.children[2].geometry.parameters : { width: 0.24, depth: 8.6 };
    ringDims = { w: (strip.width - strip.depth) * S, d: (side.depth - (side.width || 0.24)) * S, band: (strip.depth || 0.24) * S };
    ring = new THREE.Mesh(P.ringGeometry(ringDims.w, ringDims.d, ringDims.band), M.ring);
    ring.renderOrder = 6;
    ring.visible = false;
    ring.userData.noAO = true;
    group.add(ring);
    makeCars(sc.cars, bl.yRoad);
    const t2 = performance.now();
    B.D.cityRecords().forEach(function (record) { const L = makeLot(record); if (L) lots.push(L); });
    // участки и здания — уже с загрузкой (квартал оригинала собран по сохранению), здания сразу слиты
    tickLots(0, 0, 0, false);
    lots.forEach(function (L) { L.quiet = 31; });
    mergeHouses();
    const t3 = performance.now();
    ctx.linkSkyTree(group);
    precompile();
    parts.mat = Math.round(t1 - t0); parts.street = Math.round(t2 - t1); parts.lots = Math.round(t3 - t2);
    ready = true;
  }

  // Программы шейдеров квартала — заранее: видеокарта собирает их параллельно (KHR_parallel_shader_compile), и
  // первый вход в штаб идёт без рывка (иначе на «Максимуме» — секунды). Сборка — в ту же цель, что у кадра вида:
  // render.js — G-буфер, post.js — своя цель (линейный цвет без тон-маппинга), mobile.js («Телефон») — холст (AgX
  // и sRGB в самих шейдерах — другие программы). Кладка зданий штаба ещё не построена — её материалы (семейства)
  // на время — на пустых мешах; так же — всё, что при загрузке скрыто или появится позже.
  const canvasFrame = !quality.taa && !!quality.mobile;
  // Держатели программ: по вырожденному треугольнику на материал (семейства кладки, материалы квартала и вида, что
  // он берёт), с тенью и своей глубиной где надо, экземплярами — кроны и стволы лип. all — и то, что уже стоит
  // в квартале (для сборки с загрузкой, когда квартала ещё нет).
  function holders(all) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.01, 0, 0, 0, 0.01, 0], 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
    const holder = new THREE.Group();
    holder.name = 'city-holders';
    Object.keys(FAMILY_TEX).forEach(function (f) { holder.add(new THREE.Mesh(geo, familyMaterial(mats, f, !!quality.taa))); });
    [mats.glass, mats.mortar, mats.blacksteel, mats.planks].forEach(function (m) { holder.add(new THREE.Mesh(geo, m)); });
    // особые детали зданий (building.js → feat-parts.js: панорамы, плафоны, вода; светящиеся окна) — у каждого
    // здания свои материалы, программы общие: держатели из той же фабрики
    if (!FEAT) {
      const fm = createFeatureMaterials(!!quality.taa);
      FEAT = [fm.paneLit, fm.paneDim, fm.glow.cold, fm.glow.warm, fm.water, fm.fall,
        new THREE.MeshStandardMaterial({ color: 0x15110c, emissive: 0xffb068, emissiveIntensity: 0, roughness: 0.15, metalness: 0, vertexColors: true })];
    }
    FEAT.forEach(function (m) { holder.add(new THREE.Mesh(geo, m)); });
    // и то, что при загрузке скрыто: силуэт, вывески, кольцо выбора, пятна фонарей, машины
    const list = [M.ghost, M.sign, M.ring, M.pool, M.car];
    if (all) Object.keys(M).forEach(function (k) { const m = M[k]; if (m && m.isMaterial && !m.isMeshDepthMaterial && list.indexOf(m) < 0) list.push(m); });
    list.forEach(function (m) { holder.add(new THREE.Mesh(geo, m)); });
    // меши, которых при загрузке ещё нет (кусты и сетка участков появятся со слоем участков): с тенью и своей
    // глубиной — их программы глубины соберёт прогрев теней
    [[M.leaves, M.leafDepthLot], [M.net, M.netDepth], [M.mesh, M.meshDepth]].forEach(function (p) {
      const m = new THREE.Mesh(geo, p[0]);
      m.customDepthMaterial = p[1];
      m.castShadow = true;
      holder.add(m);
    });
    if (all) {
      [[M.leaves, M.leafDepth], [M.bark, null]].forEach(function (p) {
        const m = new THREE.InstancedMesh(geo, p[0], 1);
        m.setColorAt(0, new THREE.Color(1, 1, 1));
        if (p[1]) m.customDepthMaterial = p[1];
        m.castShadow = true;
        holder.add(m);
      });
    }
    holder.userData.geo = geo;
    return holder;
  }
  function precompile() {
    const r = ctx.renderer;
    const t0 = performance.now();
    const tmp = canvasFrame ? null : new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const holder = holders(false);
    const geo = holder.userData.geo;
    group.add(holder);
    // материалы держателей — с небом и G-буфером, как в кадре (иначе собранная программа — не та)
    ctx.linkSkyTree(holder);
    const prev = r.getRenderTarget(), tm = r.toneMapping;
    if (canvasFrame) r.toneMapping = THREE.AgXToneMapping;
    try {
      r.setRenderTarget(tmp);
      r.compile(group, ctx.camera, ctx.scene);
    } catch (e) { /* соберутся в кадре */ }
    r.setRenderTarget(prev);
    const t1 = performance.now();
    warmShadows();
    r.toneMapping = tm;
    group.remove(holder);
    geo.dispose();
    if (tmp) tmp.dispose();
    // первая сборка — compile/warm, перепрогрев под новый набор источников — rewarm
    if (warmRuns > 1) parts.rewarm = Math.round(performance.now() - t0);
    else { parts.compile = Math.round(t1 - t0); parts.warm = Math.round(performance.now() - t1); }
  }

  // Программы глубины для теней (свои карточки листвы, сетки, экземпляры стволов) собираются не в compile, а в
  // первом проходе теней — на «Максимуме» под ANGLE это до двух секунд на первом входе в штаб. Здесь — кадры
  // сцены вида в крошечную цель во время загрузки: видна только группа квартала (все её меши — без отсечения:
  // каждая программа рисуется хоть раз) и источники (программы зависят от их числа). Проход теней three берёт
  // источники из прошлого кадра той же сцены, а render.js после кадра рисует движущееся слоем DYN_LAYER (в нём
  // источников нет) — в игре тени идут с «0 источников»; поэтому прогрев дважды: с источниками и после кадра
  // пустым слоем.
  let warm = '', warmKeys = [], warmSig = '', warmRuns = 0, warmAt = -1e9;
  const parts = {};
  const _vp = new THREE.Vector4(), _sc = new THREE.Vector4();
  function warmShadows() {
    const r = ctx.renderer, sm = r.shadowMap;
    // двойники источников — только в квартале; прогрев — при наборе источников площадки (он же — в квартале)
    twins.forEach(function (t) { t.visible = false; });
    scanLights(inCity);
    warmSig = lightSig();
    lastSum = -1;
    if (warmedSigs.indexOf(warmSig) < 0) warmedSigs.push(warmSig);
    warmRuns++;
    warmAt = performance.now();
    const hasLight = function (o) { let f = false; o.traverse(function (c) { if (c.isLight) f = true; }); return f; };
    const hidden = [];
    ctx.scene.children.forEach(function (o) { if (o !== group && o.visible && !hasLight(o)) { o.visible = false; hidden.push(o); } });
    const culled = [];
    group.traverse(function (o) { if ((o.isMesh || o.isPoints) && o.frustumCulled) { o.frustumCulled = false; culled.push(o); } });
    const vis = group.visible, au = sm.autoUpdate, nu = sm.needsUpdate;
    group.visible = true;
    sm.autoUpdate = false;
    const lights = [];
    ctx.scene.traverse(function (o) { if (o.isDirectionalLight && o.castShadow && o.shadow) { lights.push([o, o.shadow.needsUpdate]); o.shadow.needsUpdate = true; } });
    // цель — как G-буфер render.js (6 выходов, те же типы): ANGLE (D3D11) собирает исполняемый шейдер под набор
    // выходов кадра при первой отрисовке, а не в compile — иначе на входе в штаб пересборка всех программ квартала;
    // «Телефон» — холст (угол 4 × 4 пикселя: кадр вида следом его перерисует)
    let tmp = null;
    if (quality.taa) {
      tmp = new THREE.WebGLMultipleRenderTargets(4, 4, 6, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      tmp.texture[2].type = THREE.UnsignedByteType;
      tmp.texture[4].type = THREE.UnsignedByteType;
      tmp.depthTexture = new THREE.DepthTexture(4, 4, THREE.FloatType);
    } else if (!canvasFrame) tmp = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    const prev = r.getRenderTarget(), n0 = r.info.programs.length, mask = ctx.camera.layers.mask;
    r.getViewport(_vp); r.getScissor(_sc);
    const scissor = r.getScissorTest();
    const passes = [];
    const shadowPass = function (on) {
      const t = performance.now();
      sm.needsUpdate = on && sm.enabled;
      if (on) lights.forEach(function (l) { l[0].shadow.needsUpdate = true; });
      r.render(ctx.scene, ctx.camera);
      passes.push(Math.round(performance.now() - t));
    };
    try {
      r.setRenderTarget(tmp);
      if (!tmp) { r.setViewport(0, 0, 4, 4); r.setScissor(0, 0, 4, 4); r.setScissorTest(true); }
      shadowPass(false);              // источники в состоянии сцены
      shadowPass(true);               // тени с ними
      ctx.camera.layers.set(31);
      shadowPass(false);              // пустой слой: в состоянии 0 источников (как после velocityPass)
      ctx.camera.layers.mask = mask;
      shadowPass(true);               // тени с 0 источников
      warm = n0 + '>' + r.info.programs.length;
      if (warmRuns === 1) parts.passes = passes.join('/');
      warmKeys = r.info.programs.slice(n0).map(function (q) { return q.id + ' ' + q.cacheKey; });
    } catch (e) { warm = 'err ' + (e && e.message); }
    ctx.camera.layers.mask = mask;
    if (!tmp) { r.setViewport(_vp); r.setScissor(_sc); r.setScissorTest(scissor); }
    r.setRenderTarget(prev);
    sm.autoUpdate = au; sm.needsUpdate = nu;
    group.visible = vis;
    hidden.forEach(function (o) { o.visible = true; });
    culled.forEach(function (o) { o.frustumCulled = true; });
    lights.forEach(function (l) { l[0].shadow.needsUpdate = true; });
    if (tmp && tmp.depthTexture) tmp.depthTexture.dispose();
    if (tmp) tmp.dispose();
  }

  // Дальняя карта теней солнца (world.js → farSun, вне ближнего круга) перерисовывается только при сдвиге солнца или
  // фокуса: квартал (вход, выход, новое здание, леса) в ней сам не появляется — иначе без теней или с тенями
  // спрятанного. Отметка — всем источникам с ручным обновлением теней, не чаще раза в 0,4 с.
  let shadowWait = 0, shadowPending = false;
  function refreshShadows(now) {
    if (!now) { shadowPending = true; return; }
    ctx.scene.children.forEach(function (o) { if (o.isDirectionalLight && o.castShadow && o.shadow && o.shadow.autoUpdate === false) o.shadow.needsUpdate = true; });
    shadowPending = false; shadowWait = 0.4;
  }

  // Трава и камни поляны вида не растут сквозь асфальт: в квартале — спрятаны (пока scene.js сам их не прячет).
  // Валуны (nature.js → createRocks, материал камня вида) — только те, что стоят на газоне квартала.
  function hideNature(on) {
    if (on && !natureHidden.length) {
      ctx.scene.children.forEach(function (o) {
        if (o.name === 'grass' && o.visible) { o.visible = false; natureHidden.push(o); return; }
        if (!area || o === group || !o.isGroup) return;
        o.children.forEach(function (g) {
          g.children.forEach(function (r) {
            if (!r.isMesh || r.material !== mats.stone || !r.visible) return;
            const p = r.position;
            if (p.x > area.x0 - 2 && p.x < area.x1 + 2 && p.z > area.z0 - 2 && p.z < area.z1 + 2) { r.visible = false; natureHidden.push(r); }
          });
        });
      });
    } else if (!on && natureHidden.length) {
      natureHidden.forEach(function (o) { o.visible = true; });
      natureHidden = [];
    }
    hideForest(on);
  }
  // Опушка леса вида (nature.js: кромка 134 ± 11 м) заходит в квартал — ели и берёзы у заднего забора зоны
  // расширения, под стрелой крана. У оригинала вокруг квартала газон: в квартале деревья леса (экземпляры
  // елей, берёз, кустов) в границах газона квартала и в 10 м от забора зоны сжимаются в точку, на площадке —
  // возвращаются.
  let forestOff = false;
  function hideForest(on) {
    if (on && !forestOff && area) {
      forestOff = true;
      const r = { x0: area.x0, x1: area.x1, z0: area.z0, z1: area.z1 };
      if (zoneRect) { r.x0 = Math.min(r.x0, zoneRect.x0 - 10); r.x1 = Math.max(r.x1, zoneRect.x1 + 10); r.z0 = Math.min(r.z0, zoneRect.z0 - 10); }
      ctx.scene.children.forEach(function (f) {
        if (f.name !== 'forest' || !f.visible) return;
        f.traverse(function (m) {
          if (m.isInstancedMesh) {
            const a = m.instanceMatrix.array;
            let any = false;
            for (let k = 0; k < m.count; k++) {
              const x = a[k * 16 + 12], z = a[k * 16 + 14];
              if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
              forestHidden.push({ m: m, k: k, e: a.slice(k * 16, k * 16 + 11) });
              for (let i = 0; i < 11; i++) a[k * 16 + i] = 0;
              any = true;
            }
            if (any) m.instanceMatrix.needsUpdate = true;
          } else if (m.isMesh && m.visible) {
            // отдельные мелочи опушки (не дальний лес целиком и не слитые на всю опушку меши)
            if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
            if (m.geometry.boundingSphere.radius > 6) return;
            m.getWorldPosition(_wp);
            if (_wp.x > r.x0 && _wp.x < r.x1 && _wp.z > r.z0 && _wp.z < r.z1) { m.visible = false; forestHidden.push({ m: m }); }
          }
        });
      });
    } else if (!on && forestOff) {
      forestOff = false;
      const touched = new Set();
      forestHidden.forEach(function (h) {
        if (h.e) { h.m.instanceMatrix.array.set(h.e, h.k * 16); touched.add(h.m); } else h.m.visible = true;
      });
      touched.forEach(function (m) { m.instanceMatrix.needsUpdate = true; });
      forestHidden = [];
    }
  }

  // ---------- кадр ----------
  // Участки по экземплярам квартала оригинала: состояние, здания (building.js), леса, слияние зданий, слой
  // участков, силуэт. step — кадров с прошлого раза (для «спокойствия» здания), live — слияние растущего здания
  // (только в кадре квартала). → время частей, мс: участки / здания и леса / слияние / слой участков.
  function tickLots(dt, night, step, live) {
    const t0 = performance.now();
    lots.forEach(function (L) { if (readLot(L)) { L.quiet = 0; L.version++; refreshShadows(); } else L.quiet += step; });
    const tA = performance.now();
    lots.forEach(function (L) {
      L.house.update(dt);
      // building.js пересобрал куски слитого здания — слить заново
      if (L.hidden && L.house.group.children.some(function (c) { return !L.kids.has(c); })) { L.version++; L.quiet = 0; }
      syncScaffold(L);
      L.house.ghostLight(night);
    });
    const tB = performance.now();
    mergeHouses();
    frameNo++;
    if (live) lots.forEach(function (L) { if (!L.hidden && L.quiet <= 30 && L.house.group.children.length) liveMerge(L); else dropLive(L); });
    const tC = performance.now();
    syncLotLayer();
    const tD = performance.now();
    syncGhost();
    return [tA - t0, tB - tA, tC - tB, tD - tC].map(Math.round);
  }
  // Квартал оригинала обновляется и вне штаба (syncCity при загрузке, завершении уровня, перемотке): участки
  // и здания вида догоняют его в фоне раз в 20 кадров площадки (без изменений — доли миллисекунды), и вход в штаб
  // не пересобирает кварталов на первом кадре.
  let bgFrame = 0, bgDt = 0;
  function background(dt, night) {
    bgDt = Math.min(0.5, bgDt + dt);
    if (++bgFrame < 20) return;
    tickLots(bgDt, night, bgFrame, false);
    lots.forEach(dropLive);
    bgFrame = 0; bgDt = 0;
  }

  let inCity = false;
  function update(dt, info) {
    inCity = info.mode === 'city';
    if (!ready) {
      if (!info.cityRoot || !B.D || !B.D.cityRecords().size) return;
      const t0 = performance.now();
      build(info.cityRoot);
      buildMs = Math.round(performance.now() - t0);
    }
    const city = info.mode === 'city';
    hideNature(city);
    const now = performance.now();
    if (city !== hitch.city) refreshShadows(true);
    if (city && !hitch.city) { hitch.max = 0; hitch.self = 0; hitch.selfParts = ''; hitch.trace = []; }
    else if (city && hitch.last) {
      const d = now - hitch.last;
      hitch.max = Math.max(hitch.max, d);
      if (hitch.trace.length < 10) hitch.trace.push(Math.round(d));
    }
    hitch.city = city;
    hitch.last = now;
    scanLights(city);
    if (!city) {
      fill.intensity = 0;
      background(dt, info.night);
      // на площадке появились источники, под которые программы квартала не собраны (мачты света с 10-го уровня) —
      // собрать, пока квартал не на экране (иначе — рывок при входе в штаб): в том же кадре, где площадка сама
      // собирает свои программы под новый набор (рывки сливаются в один), не чаще раза в 5 с. Меньше источников,
      // чем уже прогрето (смена площадки: старые мачты убраны, новых ещё нет), — не повод.
      // набор — строкой только когда сменилась его быстрая сумма (без строк и сортировки каждый кадр)
      const q = lightSum();
      if (q !== lastSum) {
        lastSum = q;
        const sig = lightSig();
        pendingSig = sig !== warmSig && !covered(sig);
      }
      if (pendingSig && B.world && now - warmAt > 5000) { pendingSig = false; precompile(); }
      return;
    }
    syncTwins();
    time += dt;
    // свежая трава (новая площадка пересобирает её) — тоже спрятать
    if (natureHidden.length) ctx.scene.children.forEach(function (o) { if (o.name === 'grass' && o.visible && natureHidden.indexOf(o) < 0) { o.visible = false; natureHidden.push(o); } });
    const tSelf = performance.now();
    const t = tickLots(dt, info.night, 1, true);
    syncCars();
    shadowWait -= dt;
    if (shadowPending && shadowWait <= 0) refreshShadows(true);
    const self = performance.now() - tSelf;
    // самый долгий кадр JS квартала и из чего он: участки / здания и леса / слияние / слой участков / прочее
    if (self > (hitch.self || 0)) { hitch.self = self; hitch.selfParts = t.join('/') + '/' + Math.round(performance.now() - tSelf - t.reduce(function (a, b) { return a + b; }, 0)); }
    // кольцо выбора — место, размер и пульс кольца оригинала
    if (origRing) {
      // зона расширения (кольцо оригинала растянуто на всё поле) — своё кольцо по рельефу
      const zone = origRing.visible && origRing.scale.x > 1.5;
      ring.visible = origRing.visible && !zone;
      if (zone && !zoneRing) {
        const cx = origRing.position.x * S, cz = origRing.position.z * S;
        zoneRing = new THREE.Mesh(P.ringGeometry(ringDims.w * origRing.scale.x, ringDims.d * origRing.scale.z, ringDims.band, function (x, z) {
          return Math.max(base - 0.04, ctx.ground(cx + x, cz + z)) + 0.13;
        }, 1), M.ring);
        zoneRing.position.set(cx, 0, cz);
        zoneRing.renderOrder = 6;
        zoneRing.userData.noAO = true;
        group.add(zoneRing);
      }
      if (zoneRing) zoneRing.visible = zone;
      if (ring.visible) {
        ring.position.set(origRing.position.x * S, base + RING_Y, origRing.position.z * S);
        ring.scale.set(origRing.scale.x, 1, origRing.scale.z);
      }
      const om = origRing.children[0].material;
      M.ring.uniforms.uOpacity.value = om && om.opacity !== undefined ? om.opacity : 0.85;
    }
    // ночь: фонари, их пятна, фары, силуэт тусклее
    const n = THREE.MathUtils.smoothstep(info.night, 0.15, 0.55);
    M.lens.emissiveIntensity = 24 * n;
    fill.intensity = FILL * n;
    if (pools) { pools.visible = n > 0.01; M.pool.uniforms.uGain.value = 0.035 * n; }
    M.car.userData.light.value = 0.4 + 7 * n;
    M.ghost.uniforms.uTime.value = time;
    M.ghost.uniforms.uGain.value = 1.6 * (1 - 0.6 * n);
    M.ring.uniforms.uGain.value = 3.0 * (1 - 0.5 * n);
  }

  // Сводка для проверок: участки, их состояние, кубы; меши и треугольники квартала.
  function stats() {
    let meshes = 0, tris = 0;
    group.traverseVisible(function (o) {
      if (!o.isMesh) return;
      meshes++;
      const g = o.geometry;
      const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      tris += n * (o.isInstancedMesh ? o.count : 1);
    });
    const top = [];
    group.traverseVisible(function (o) {
      if (!o.isMesh) return;
      const g = o.geometry;
      top.push([o.name || (o.parent && o.parent.parent && o.parent.parent.name) || o.type, Math.round((g.index ? g.index.count / 3 : g.attributes.position.count / 3) * (o.isInstancedMesh ? o.count : 1))]);
    });
    top.sort(function (a, b) { return b[1] - a[1]; });
    return { ready, base: Math.round(base * 1000) / 1000, meshes, tris: Math.round(tris), top: top.slice(0, 8).map(function (t) { return t[0] + ' ' + t[1]; }).join(', '),
      lots: lots.map(function (L) { return L.id + ':' + L.state + ':' + (L.world.blocks.length - L.world.remaining) + '/' + L.world.blocks.length + (L.ghost.length ? ' g' + L.ghost.length : ''); }),
      cars: cars.filter(function (c) { return c.group.visible; }).length, ring: !!(ring && ring.visible), hitchMs: Math.round(hitch.max), trace: hitch.trace.join(','), warm: warm, selfMs: Math.round(hitch.self || 0), selfParts: hitch.selfParts || '', buildMs: buildMs,
      parts: parts, warmRuns: warmRuns, fill: Math.round(fill.intensity * 100) / 100, twins: Array.from(twins.values()).filter(function (t) { return t.visible; }).length };
  }

  // Корни для отражённого света в квартале (gi.js → bind): неподвижные покрытия, участки и здания — без
  // прозрачных силуэта, кольца, пятен света и машин.
  function giRoots() {
    const out = [];
    if (stillGroup) out.push(stillGroup);
    if (lotLayer) out.push(lotLayer);
    if (merged) out.push(merged);
    lots.forEach(function (L) { if (!L.hidden) out.push(L.house.group); if (L.scaffold) out.push(L.scaffold.group); });
    return out;
  }

  // Отладка: что видно в точке холста (доли ширины и высоты) — первые попадания луча от камеры вида.
  const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
  function pick(fx, fy) {
    _ndc.set(fx * 2 - 1, 1 - fy * 2);
    _ray.setFromCamera(_ndc, ctx.camera);
    const vis = function (o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    return _ray.intersectObject(ctx.scene, true).filter(function (h) { return vis(h.object) && !h.object.isSprite; }).slice(0, 3).map(function (h) {
      let n = h.object.name, p = h.object.parent;
      while (!n && p) { n = p.name; p = p.parent; }
      return (n || h.object.type) + ':' + (h.object.material && h.object.material.type) + ' d' + Math.round(h.distance) + ' @' + h.point.toArray().map(function (v) { return Math.round(v * 10) / 10; }).join(',');
    });
  }

  // Материалы и фактуры квартала — с загрузкой вида, а программы шейдеров под них видеокарта собирает
  // параллельно (KHR_parallel_shader_compile, держатели — в скрытой группе), пока грузится и запускается игра;
  // к сборке квартала (первый кадр) они готовы. ?cityearly=0 — без этого (сравнение).
  {
    const t0 = performance.now();
    M = materials();
    parts.early = 0;
    if (ctx.params.get('cityearly') !== '0') {
      early = holders(true);
      group.add(early);
      ctx.linkSkyTree(early);
      const r = ctx.renderer, prev = r.getRenderTarget(), tm = r.toneMapping;
      const tmp = canvasFrame ? null : new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
      if (canvasFrame) r.toneMapping = THREE.AgXToneMapping;
      try {
        r.setRenderTarget(tmp);
        const done = r.compileAsync ? r.compileAsync(early, ctx.camera, ctx.scene) : (r.compile(early, ctx.camera, ctx.scene), null);
        if (done) done.then(function () { parts.early = Math.round(performance.now() - t0); }, function () { parts.early = -1; });
      } catch (e) { parts.early = -1; }
      r.setRenderTarget(prev);
      r.toneMapping = tm;
      if (tmp) tmp.dispose();
    }
    parts.create = Math.round(performance.now() - t0);
  }

  return { group, active: true, update, stats, giRoots, pick, warmKeys: function () { return warmKeys; } };
}
