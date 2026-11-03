(function () {
  const MB = MicroBuilders;
  const Meta = MicroBuildersMeta;
  const Features = MicroBuilderFeatures;
  const Blocks = MicroBuildersBlocks;
  const view = document.getElementById('view');
  const mobileRendering = new URLSearchParams(window.location.search).get('render') === 'mobile';
  // Телефон или планшет (основной ввод — палец): тени 2048 вместо 4096, иначе риск потери WebGL-контекста.
  const handheld = mobileRendering || matchMedia('(pointer: coarse)').matches;
  // Качество графики (меню → «Графика»): high — свечение (art/post.js), тени 4096, полная чёткость; medium — тени
  // 2048, чёткость до 1,5; low — тени 1024, чёткость 1. «Авто» начинает с high (на телефоне — с medium) и опускает
  // на ступень, если на стройке меньше 40 кадров в секунду 8 секунд подряд (watchQuality). ?quality=high|medium|low —
  // жёстко, без авто (снимки и замеры).
  const QUALITY = {
    high: { shadow: 4096, ratio: 3, post: true },
    medium: { shadow: 2048, ratio: 1.5, post: false },
    low: { shadow: 1024, ratio: 1, post: false },
  };
  const QUALITY_NAMES = { auto: 'авто', high: 'высокая', medium: 'средняя', low: 'низкая' };
  const QUALITY_ORDER = ['auto', 'high', 'medium', 'low'];
  const forcedQuality = QUALITY[new URLSearchParams(window.location.search).get('quality')] ? new URLSearchParams(window.location.search).get('quality') : null;
  let qualitySetting = 'auto';
  let qualityLevel = forcedQuality || (mobileRendering ? 'low' : handheld ? 'medium' : 'high');
  const qualityWatch = { t: 0, frames: 0, strikes: 0, grace: 8 };
  // Пост свечения: создаётся при первом кадре на «высоком», null — WebGL 1 или ещё не нужен.
  let post = null;
  let postTried = false;
  const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: !mobileRendering });
  // The framed desktop preview is CSS-scaled, so render at the scaled resolution to stay sharp.
  function renderPixelRatio() {
    return mobileRendering ? 1 : Math.min(QUALITY[qualityLevel].ratio, window.devicePixelRatio * MicroBuildersStage.scale());
  }
  renderer.setPixelRatio(renderPixelRatio());
  renderer.setSize(MicroBuildersStage.width(), MicroBuildersStage.height());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xb7cfe0, 1);
  // ACES мягко сжимает блики металла вместо пересвета; экспозиция возвращает яркость средних тонов
  // (свет сильнее — LIGHT_GAIN в updateSky). Небо рисует свой шейдер, тон-маппинг его не трогает.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb7cfe0, 36, 120);
  const clock = new THREE.Clock();
  const dummy = new THREE.Object3D();
  const vehicleUp = new THREE.Vector3(0, 1, 0);
  const levelRoot = new THREE.Group();
  let yardRoot = null;
  let elevatorRoot = null;
  // Air taxis (syncTaxis): their models on the helipad and the shared materials and textures.
  let taxiView = null;
  let taxiKit = null;
  const taxiSeat = new THREE.Vector3();
  scene.add(levelRoot);
  // Blue preview of every pattern being assembled in a yard: the slots drones have not filled yet.
  const patternGhosts = new THREE.Group();
  scene.add(patternGhosts);
  const patternGhostGeometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
  const patternGhostEdges = new THREE.EdgesGeometry(patternGhostGeometry);
  const patternGhostFill = new THREE.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.3, depthWrite: false });
  const patternGhostLine = new THREE.LineBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.85 });
  let patternGhostSignature = '';
  // Carried cubes: one unit box scaled per slot (the size depends on the material grid only).
  const carryGeometry = new THREE.BoxGeometry(1, 1, 1);
  const CARRY_SLOTS = 6;
  const cityRoot = new THREE.Group();
  cityRoot.visible = false;
  scene.add(cityRoot);
  const cityRecords = new Map();
  const cityDecor = {};
  // Кубы квартала и городка с фаской (cityBlockGeometry, campBlockGeometry) и материалы кубов квартала.
  let cityShape = null;
  let campShape = null;
  const cityMaterials = {};
  // The quarter (docs/gdd/16-ux-flow.md §8): a boulevard from the camera (+z) into −z, lots in two
  // columns (Meta.CITY row/col) with every facade facing the camera, the expansion zone at the far end.
  const CITY_LOT = { width: 10, depth: 8 };
  const CITY_GRID = { colX: 7.4, rowPitch: 12.5 };
  const CITY_AVENUE = { width: 3.2, walk: 0.8, near: 11 };
  const CITY_ZONE_ROW = 5;
  // Camera box of the whole quarter (setMode('city')): the pivot rides the avenue and may slide over a lot.
  const CITY_CAMERA = {
    mode: 'city',
    key: 'city:boulevard',
    minX: -12.6, maxX: 12.6, minZ: -55.1, maxZ: 6.5, topY: 5.5,
    rail: { from: { x: 0, z: 6 }, to: { x: 0, z: -50.5 }, halfWidth: 7.6 },
  };
  const cityMat = {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x3d4146, roughness: 0.95 }),
    walk: new THREE.MeshStandardMaterial({ color: 0xc9bfae, roughness: 0.95 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xa69e90, roughness: 0.9 }),
    lane: new THREE.MeshBasicMaterial({ color: 0xf2efe6 }),
    paving: new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 1 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x9c8460, roughness: 1 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x79a356, roughness: 1 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x4a7f3a, roughness: 0.9 }),
    blueprint: new THREE.MeshStandardMaterial({ color: 0x8fc4ff, transparent: true, opacity: 0.32, roughness: 0.6, depthWrite: false }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6b4128, roughness: 0.9 }),
    leaves: [0x4f8f3e, 0x5f9f44, 0x3f7d3a].map(function (color) {
      return new THREE.MeshStandardMaterial({ color: color, roughness: 0.85 });
    }),
    pole: new THREE.MeshStandardMaterial({ color: 0x2c3136, metalness: 0.5, roughness: 0.4 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffe1a0, emissive: 0xffc46b, emissiveIntensity: 0.8 }),
    fence: new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: 0.6 }),
    fenceWhite: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6 }),
    crate: new THREE.MeshStandardMaterial({ color: 0xb98a52, roughness: 0.85 }),
    ring: new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.85, depthWrite: false }),
  };
  const citySigns = new Map();
  const citySignPoint = new THREE.Vector3();
  let cityNewBuilding = null; // just revealed: its card reads «Новое здание: …»
  let cityReveal = null; // { id, phase: 'fly' | 'grow', t }: camera on a new building, then it grows
  let cityRefreshKey = '';
  let cityCardHtml = '';
  let cityWalletHtml = '';
  let cityCovers = []; // HQ top bars (wallet pills, site chip) in stage px: signs never show under them
  // Camera per screen (docs/gdd/16-ux-flow.md §7): the view of every site the player left, the city view.
  const cameraStates = { site: {}, city: null };
  let siteBuiltTop = 0;
  let safeAreaKey = '';
  let safeAreaQueued = false;

  const hemi = new THREE.HemisphereLight(0xe4f0ff, 0x7c8a57, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b4, 1.45);
  sun.castShadow = true;
  // Тени PCF Soft: карта по качеству (QUALITY), не больше 2048 на телефоне и 1024 при ?render=mobile.
  function qualityShadow() {
    return Math.min(QUALITY[qualityLevel].shadow, mobileRendering ? 1024 : handheld ? 2048 : 4096);
  }
  sun.shadow.mapSize.set(qualityShadow(), qualityShadow());
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  scene.add(sun);
  scene.add(sun.target);
  // Окружение для отражений металла и самоцветов (block-materials.js): только блокам, не всей сцене.
  Blocks.environment(renderer);

  // ---- time of day (docs/gdd/08-needs-weather-events.md → «День и ночь») ----
  // The sky dome, the fog, the hemisphere light and the sun follow the site clock
  // (MicroBuildersSim.dayClock: a site starts at 8:00, night 20:00–6:00, dawn 2 h after it, sunset
  // and twilight 2 h before it) by blending the looks below, so dawn, day, sunset and night read at
  // a glance and never switch abruptly. Colors are sRGB hex; light intensities as in three.js.
  // stars / moon — how much of them the dome shows; glow — the sun's halo; moonLight — how much the
  // directional light comes from the moon instead of the sun.
  const SKY_LOOKS = {
    night: { top: 0x0d1830, horizon: 0x26375c, fog: 0x1f2c48, hemiSky: 0x9fb4e8, hemiGround: 0x2b3530, hemi: 0.55, sunColor: 0xb8c8f0, sun: 0.4, glow: 0, stars: 1, moon: 1, moonLight: 1 },
    predawn: { top: 0x2c4372, horizon: 0xae869c, fog: 0x67678a, hemiSky: 0xa3aad6, hemiGround: 0x3d4539, hemi: 0.56, sunColor: 0xb4acdf, sun: 0.36, glow: 0.3, stars: 0.3, moon: 0.4, moonLight: 0.6 },
    sunrise: { top: 0x6888b8, horizon: 0xf2a39c, fog: 0xd2acab, hemiSky: 0xf0c8c0, hemiGround: 0x6e5a44, hemi: 0.74, sunColor: 0xffb08a, sun: 1.05, glow: 1, stars: 0, moon: 0, moonLight: 0 },
    morning: { top: 0x84b3d8, horizon: 0xf6d3b0, fog: 0xc2d1de, hemiSky: 0xe8eefa, hemiGround: 0x7a5c3e, hemi: 0.84, sunColor: 0xffd9a8, sun: 1.32, glow: 0.5, stars: 0, moon: 0, moonLight: 0 },
    day: { top: 0x78b0d6, horizon: 0xf5d6b3, fog: 0xb7cfe0, hemiSky: 0xe4f0ff, hemiGround: 0x7a5c3e, hemi: 0.9, sunColor: 0xffe2b4, sun: 1.45, glow: 0.35, stars: 0, moon: 0, moonLight: 0 },
    afternoon: { top: 0x6fa3cf, horizon: 0xf6c995, fog: 0xcfc8b9, hemiSky: 0xeee6d8, hemiGround: 0x7d5e40, hemi: 0.82, sunColor: 0xffc98a, sun: 1.36, glow: 0.6, stars: 0, moon: 0, moonLight: 0 },
    sunset: { top: 0x4c6b9b, horizon: 0xf0865a, fog: 0xc48c78, hemiSky: 0xf0b48c, hemiGround: 0x6a5440, hemi: 0.7, sunColor: 0xff8a48, sun: 1, glow: 1, stars: 0, moon: 0, moonLight: 0 },
    twilight: { top: 0x2a3b69, horizon: 0x9a6e8e, fog: 0x5b5777, hemiSky: 0x9c9ccc, hemiGround: 0x3c4238, hemi: 0.56, sunColor: 0xa4a8e0, sun: 0.36, glow: 0.35, stars: 0.35, moon: 0.5, moonLight: 0.6 },
  };
  // Под ACES (renderer.toneMapping) солнце ярче, отсвет неба слабее — глубокие тени и сочные цвета блоков.
  const LIGHT_GAIN = { sun: 1.5, hemi: 0.78 };
  const SKY_COLORS = ['top', 'horizon', 'fog', 'hemiSky', 'hemiGround', 'sunColor'];
  const SKY_LEVELS = ['hemi', 'sun', 'glow', 'stars', 'moon', 'moonLight'];
  Object.keys(SKY_LOOKS).forEach(function (name) {
    const look = SKY_LOOKS[name];
    SKY_COLORS.forEach(function (key) {
      const hex = look[key];
      look[key] = [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];
    });
  });
  // The sun rises in the middle of dawn and sets in the middle of the sunset-and-twilight hours,
  // sweeping SUN_SWEEP degrees each side of SUN_NOON (the light's old fixed direction, so midday
  // keeps the familiar shadows), up to SUN_PEAK degrees high. Shadows never go flatter than
  // LIGHT_LOW degrees; the moon lights from MOON_SIDE degrees round from the noon sun.
  const SUN_NOON = Math.atan2(0.35, 0.7);
  const SUN_SWEEP = 100;
  const SUN_PEAK = 58;
  const LIGHT_LOW = 22;
  const MOON_SIDE = 150;
  const MOON_LIGHT_HIGH = 52;
  const MOON_SKY_HIGH = 24;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Vector3(0.47, 0.69, 0.84) },
        uHorizon: { value: new THREE.Vector3(0.96, 0.84, 0.7) },
        uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.25).normalize() },
        uSunColor: { value: new THREE.Vector3(1, 0.89, 0.71) },
        uGlow: { value: 0.35 },
        uMoonDir: { value: new THREE.Vector3(-0.6, 0.4, -0.5).normalize() },
        uMoon: { value: 0 },
        uStars: { value: 0 },
        uClouds: { value: 0 },
        uCloudColor: { value: new THREE.Vector3(0.6, 0.62, 0.66) },
        uTime: { value: 0 },
        uFlash: { value: 0 },
      },
      vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uGlow;',
        'uniform vec3 uMoonDir; uniform float uMoon; uniform float uStars; uniform float uClouds; uniform vec3 uCloudColor;',
        'uniform float uTime; uniform float uFlash; varying vec3 vPos;',
        'float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
        'float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y); }',
        'float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }',
        'void main(){',
        '  vec3 d = normalize(vPos); float h = d.y;',
        '  vec3 col = mix(uHorizon, uTop, smoothstep(-0.08, 0.55, h));',
        '  float s = max(dot(d, uSunDir), 0.0);',
        '  float band = 1.0 - smoothstep(0.0, 0.5, abs(h - uSunDir.y));',
        '  col += uSunColor * (pow(s, 5.0) * 0.4 * band + pow(s, 48.0) * 0.5 + smoothstep(0.9991, 0.9996, s) * 0.9) * uGlow;',
        '  float m = max(dot(d, uMoonDir), 0.0);',
        '  col += vec3(0.86, 0.9, 1.0) * (smoothstep(0.99935, 0.9997, m) * 0.85 + pow(m, 60.0) * 0.12) * uMoon;',
        '  vec3 g = floor(d * 150.0);',
        '  float star = step(0.9962, hash(g)) * smoothstep(0.03, 0.3, h) * (0.55 + 0.45 * hash(g + 3.7));',
        '  col += vec3(star) * uStars;',
        // Clouds: a drifting layer over the dome; more cover — thicker, darker under a storm.
        '  if (uClouds > 0.001) {',
        '    vec2 cuv = d.xz / max(0.12, h + 0.18) * 1.6 + vec2(uTime * 0.012, uTime * 0.005);',
        '    float n = fbm(cuv);',
        '    float cover = smoothstep(1.0 - uClouds * 0.95, 1.15 - uClouds * 0.6, n + uClouds * 0.25) * smoothstep(-0.05, 0.12, h);',
        '    col = mix(col, uCloudColor * (0.82 + 0.36 * n), cover * 0.92);',
        '  }',
        '  col += vec3(0.85, 0.88, 1.0) * uFlash * 0.6;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
    })
  );
  scene.add(sky);
  // What updateSky last painted (dial — the hours the day-clock ring is drawn for; time — the frame
  // clock it ran at) and the light rig of applySceneLighting: the sun circles its target at reach,
  // fogNear / fogFar — the fog before the weather thickens it.
  const skyView = { look: null, dial: '', time: 0 };
  const lightRig = { reach: 0, fogNear: 36, fogFar: 120, box: 0, half: 0, x: 0, y: 0 };
  // Тени по видимой области (fitShadow): камера карты теней — копия теневой камеры солнца, точка взгляда камеры.
  const shadowProbe = new THREE.OrthographicCamera();
  const shadowFocus = new THREE.Vector3();
  const skyColor = new THREE.Color();
  const sunDir = new THREE.Vector3();
  const lightDir = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  const skyAhead = new THREE.Vector3();

  // ---- weather (docs/gdd/08-needs-weather-events.md → «Погода») ----
  // What each weather shows, 0…1: snowfall, rain (a storm pours harder and slants it), heat haze,
  // cloud cover and the storm's darkness and lightning. A change cross-fades over WEATHER_FADE
  // seconds of the site around the phase boundary, so clouds gather before the rain starts.
  const WEATHER_LOOKS = {
    '': { snow: 0, rain: 0, heat: 0, clouds: 0, storm: 0 },
    snow: { snow: 1, rain: 0, heat: 0, clouds: 0.6, storm: 0 },
    rain: { snow: 0, rain: 0.6, heat: 0, clouds: 0.8, storm: 0 },
    heat: { snow: 0, rain: 0, heat: 1, clouds: 0, storm: 0 },
    storm: { snow: 0, rain: 1, heat: 0, clouds: 1, storm: 1 },
  };
  const WEATHER_CHANNELS = ['snow', 'rain', 'heat', 'clouds', 'storm'];
  const WEATHER_FADE = 30;
  // The ground (visual only, no mechanics): snow settles in SNOW_BUILD seconds of snowfall and melts
  // in SNOW_MELT; rain wets it in WET_BUILD and it dries in WET_DRY; heat melts and dries 4× faster.
  const SNOW_BUILD = 50;
  const SNOW_MELT = 160;
  const WET_BUILD = 15;
  const WET_DRY = 100;
  // Ground cover now (cover — snow, wet — rain, melt — 0…1 while snow is melting, snowSum — seconds
  // of full snowfall so far: footprints fill in by it) for the world it was counted for; the
  // lightning flash (0…1, real time) and the storm window last checked for one.
  const weatherView = {
    world: null, site: -1, seconds: 0, cover: 0, wet: 0, melt: 0, snowSum: 0, dry: 0, heat: 0,
    flash: 0, flashAt: 0, flashWindow: -1, flashArmed: false, lastFlash: -10, haze: 0,
  };
  // Ground materials that take the snow and the wet (weatherSurface), and the footprints.
  const weatherGround = { uSnow: { value: 0 }, uWet: { value: 0 }, uMelt: { value: 0 }, uDry: { value: 0 } };
  // Карьер главы (глава — 10 уровней, свой сезон и край: docs/gdd/08 «Погода», 06 «Региональные главы»): порода и
  // земля (rock) и трава (grass) перекрашиваются к цвету главы по яркости фактуры — рисунок остаётся, меняется тон.
  // [r, g, b, доля] в линейных значениях; первая глава — как есть. Только вид (buildLevelView, quarrySurface).
  const CHAPTER_LOOKS = [
    { rock: [1, 1, 1, 0], grass: [1, 1, 1, 0] }, // 1–10, осень, рудная долина: бурый суглинок, сухой луг
    { rock: [0.95, 1, 1.12, 0.65], grass: [0.95, 1.05, 1, 0.4] }, // 11–20, зима, север: серый гранит, блёклая трава
    { rock: [1.5, 0.82, 0.6, 0.45], grass: [0.75, 1.3, 0.6, 0.55] }, // 21–30, весна: красная глина, свежая трава
    { rock: [1.45, 1.18, 0.8, 0.5], grass: [1.35, 1.15, 0.6, 0.45] }, // 31–40, лето, жара: светлый песчаник, солома
    { rock: [0.72, 0.78, 0.9, 0.7], grass: [1.1, 1, 0.7, 0.35] }, // 41–50, осень, побережье: тёмный сланец
    { rock: [1.25, 1.25, 1.28, 0.55], grass: [0.95, 1.02, 1.05, 0.4] }, // 51–60, зима: светлый известняк
  ];
  const chapterTint = { rock: { value: new THREE.Vector4(1, 1, 1, 0) }, grass: { value: new THREE.Vector4(1, 1, 1, 0) } };
  // Heat scorches the grass straw-yellow all at once: it turns in DRY_TURN seconds of the site
  // (15 game minutes) as the heat starts and greens back as fast once it ends.
  const DRY_TURN = 15;
  // Heat: dust lying low over the site, in drifting layers (addGroundDust; the level's meshes).
  const groundDust = { layers: [], amount: { value: 0 }, center: { value: new THREE.Vector3() }, radius: { value: 30 } };
  // Snow lies and melts in patches: a point of the ground is white while the cover (scaled to
  // −0.15…1.15) is above the noise there, so the snow comes and goes area by area, low noise first.
  const SNOW_FIELD_GLSL = [
    'float snowHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float snowNoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(snowHash(i), snowHash(i + vec2(1.0, 0.0)), f.x), mix(snowHash(i + vec2(0.0, 1.0)), snowHash(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float snowField(vec2 p){ return snowNoise(p * 0.09) * 0.6 + snowNoise(p * 0.27 + 7.0) * 0.3 + snowNoise(p * 1.1 + 3.0) * 0.1; }',
    'float snowLevel(float cover){ return cover * 1.3 - 0.15; }',
    '',
  ].join('\n');
  // Footprints in the snow (visual only): a ring of FOOTPRINTS boot prints, laid by workers walking on
  // snowy ground every FOOT_STEP cells, left and right, each in a faint trodden smudge (overlapping
  // smudges make a path where the crew walks often). Falling snow fills a print in FOOT_FILL seconds
  // of full snowfall; one where the snow has melted is gone with it.
  const FOOTPRINTS = 6000;
  const FOOT_STEP = 0.4;
  const FOOT_FILL = 60;
  const footDummy = new THREE.Object3D();

  // Precipitation: flakes and streaks in a box ahead of the camera, anchored in the world (wrapped
  // with mod in the shader), so they do not slide when the camera moves. Real-time animation.
  const PRECIP = {
    time: { value: 0 },
    center: { value: new THREE.Vector3() },
    snowBox: { value: new THREE.Vector3(40, 26, 40) },
    rainBox: { value: new THREE.Vector3(36, 24, 36) },
    snowAmount: { value: 0 },
    rainAmount: { value: 0 },
    dustAmount: { value: 0 },
    wind: { value: new THREE.Vector3(1.2, 0, 0.6) },
    light: { value: 1 },
    px: { value: 1 },
  };
  const snowfall = makePrecipitation(mobileRendering ? 1100 : 1800, false);
  const rainfall = makePrecipitation(mobileRendering ? 900 : 1500, true);
  const heatDust = makeHeatDust(mobileRendering ? 800 : 1400);
  const footprints = makeFootprints();
  const footState = { next: 0 };

  // Heat: warm dust motes rising and swirling in the hot air ahead of the camera (as the snow, but up).
  function makeHeatDust(count) {
    const position = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const box = PRECIP.snowBox.value;
    for (let i = 0; i < count; i++) {
      position[i * 3] = Math.random() * box.x;
      position[i * 3 + 1] = Math.random() * box.y;
      position[i * 3 + 2] = Math.random() * box.z;
      seed[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: PRECIP.time, uCenter: PRECIP.center, uBox: PRECIP.snowBox, uAmount: PRECIP.dustAmount, uLight: PRECIP.light, uPx: PRECIP.px },
      vertexShader: [
        'attribute float seed; uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uAmount; uniform float uPx;',
        'varying float vAlpha;',
        'void main(){',
        '  vec3 p = position;',
        '  p.y += uTime * (0.35 + seed * 0.5);',
        '  p.x += sin(uTime * (0.4 + seed * 0.6) + seed * 31.0) * 1.1;',
        '  p.z += cos(uTime * (0.3 + seed * 0.5) + seed * 13.0) * 1.1;',
        '  vec3 lo = uCenter - uBox * 0.5;',
        '  p = lo + mod(p - lo, uBox);',
        '  float edge = 1.0 - smoothstep(0.7, 1.0, length(p.xz - uCenter.xz) / (uBox.x * 0.5));',
        '  edge *= 1.0 - smoothstep(0.75, 1.0, (p.y - lo.y) / uBox.y);',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  float on = step(seed, uAmount * 0.85);',
        '  gl_PointSize = on * min(9.0 * uPx, uPx * (1.0 + 1.2 * seed) * 16.0 / max(1.0, -mv.z));',
        '  vAlpha = on * edge * (0.725 + 0.275 * sin(uTime * (1.5 + seed * 2.0) + seed * 50.0));',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform float uLight; varying float vAlpha;',
        'void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25 || vAlpha <= 0.0) discard;',
        '  gl_FragColor = vec4(vec3(1.0, 0.82, 0.48) * uLight, (1.0 - d * 4.0) * vAlpha * 0.6); }',
      ].join('\n'),
    });
    const mesh = new THREE.Points(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  function makeFootprints() {
    const geometry = new THREE.PlaneGeometry(0.42, 0.5);
    geometry.rotateX(-Math.PI / 2);
    const born = new THREE.InstancedBufferAttribute(new Float32Array(FOOTPRINTS).fill(-1e9), 1);
    geometry.setAttribute('aBorn', born);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: { uSnowSum: { value: 0 }, uFill: { value: FOOT_FILL }, uSnow: weatherGround.uSnow, uLight: PRECIP.light },
      vertexShader: [
        'attribute float aBorn; uniform float uSnowSum; uniform float uFill;',
        'varying vec2 vUv; varying float vFill; varying vec3 vWorld;',
        'void main(){',
        '  vUv = uv;',
        '  vFill = clamp((uSnowSum - aBorn) / uFill, 0.0, 1.0);',
        '  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);',
        '  vWorld = w.xyz;',
        '  gl_Position = projectionMatrix * viewMatrix * w;',
        '}',
      ].join('\n'),
      fragmentShader: SNOW_FIELD_GLSL + [
        'uniform float uSnow; uniform float uLight; varying vec2 vUv; varying float vFill; varying vec3 vWorld;',
        'void main(){',
        '  vec2 q = (vUv - 0.5) * 2.0;',
        // A boot in the middle (the sole toward +z: uv.y runs to −z after the plane is laid flat, the
        // heel behind it) and a soft trodden smudge round it.
        '  float sole = length((q - vec2(0.0, -0.18)) / vec2(0.3, 0.42));',
        '  float heel = length((q - vec2(0.0, 0.42)) / vec2(0.26, 0.2));',
        '  float boot = max(smoothstep(1.0, 0.7, sole), smoothstep(1.0, 0.7, heel));',
        '  float smudge = smoothstep(1.0, 0.2, length(q)) * 0.2;',
        '  float n = snowField(vWorld.xz);',
        '  float there = smoothstep(n - 0.05, n + 0.05, snowLevel(uSnow));',
        '  float a = max(boot * 0.72, smudge) * (1.0 - vFill * vFill) * there;',
        '  if (a <= 0.01) discard;',
        '  gl_FragColor = vec4(vec3(0.46, 0.53, 0.66) * uLight, a);',
        '}',
      ].join('\n'),
    });
    const mesh = new THREE.InstancedMesh(geometry, material, FOOTPRINTS);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    footDummy.scale.set(0, 0, 0);
    footDummy.updateMatrix();
    for (let i = 0; i < FOOTPRINTS; i++) mesh.setMatrixAt(i, footDummy.matrix);
    footDummy.scale.set(1, 1, 1);
    scene.add(mesh);
    return mesh;
  }

  function makePrecipitation(count, streaks) {
    const vertices = streaks ? count * 2 : count;
    const position = new Float32Array(vertices * 3);
    const seed = new Float32Array(vertices);
    const tip = new Float32Array(vertices);
    const box = streaks ? PRECIP.rainBox.value : PRECIP.snowBox.value;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * box.x;
      const y = Math.random() * box.y;
      const z = Math.random() * box.z;
      const r = Math.random();
      const copies = streaks ? 2 : 1;
      for (let k = 0; k < copies; k++) {
        const v = i * copies + k;
        position[v * 3] = x;
        position[v * 3 + 1] = y;
        position[v * 3 + 2] = z;
        seed[v] = r;
        tip[v] = k;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    if (streaks) geometry.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
    const fade = 'float edge = 1.0 - smoothstep(0.7, 1.0, length(p.xz - uCenter.xz) / (uBox.x * 0.5));' +
      ' edge *= 1.0 - smoothstep(0.85, 1.0, (p.y - lo.y) / uBox.y);';
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: PRECIP.time, uCenter: PRECIP.center, uBox: streaks ? PRECIP.rainBox : PRECIP.snowBox,
        uAmount: streaks ? PRECIP.rainAmount : PRECIP.snowAmount, uWind: PRECIP.wind, uLight: PRECIP.light, uPx: PRECIP.px,
      },
      vertexShader: streaks ? [
        'attribute float seed; attribute float tip; uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox;',
        'uniform float uAmount; uniform vec3 uWind; varying float vAlpha;',
        'void main(){',
        '  vec3 vel = vec3(uWind.x, -(17.0 + seed * 6.0), uWind.z);',
        '  vec3 lo = uCenter - uBox * 0.5;',
        '  vec3 p = lo + mod(position + vel * uTime - lo, uBox);',
        '  p -= vel * tip * 0.045;',
        '  ' + fade,
        '  vAlpha = step(seed, uAmount) * edge * (0.2 + 0.3 * tip);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
        '}',
      ].join('\n') : [
        'attribute float seed; uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uAmount;',
        'uniform vec3 uWind; uniform float uPx; varying float vAlpha;',
        'void main(){',
        '  vec3 p = position;',
        '  p.y -= uTime * (1.0 + seed * 0.9);',
        '  p.x += sin(uTime * (0.6 + seed) + seed * 40.0) * 0.6 + uTime * uWind.x * 0.25;',
        '  p.z += cos(uTime * (0.5 + seed * 0.7) + seed * 17.0) * 0.6 + uTime * uWind.z * 0.25;',
        '  vec3 lo = uCenter - uBox * 0.5;',
        '  p = lo + mod(p - lo, uBox);',
        '  ' + fade,
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  float on = step(seed, uAmount);',
        '  gl_PointSize = on * min(14.0 * uPx, uPx * (1.6 + 1.8 * seed) * 26.0 / max(1.0, -mv.z));',
        '  vAlpha = on * edge;',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: streaks ? [
        'uniform float uLight; varying float vAlpha;',
        'void main(){ if (vAlpha <= 0.0) discard; gl_FragColor = vec4(vec3(0.74, 0.8, 0.88) * uLight, vAlpha); }',
      ].join('\n') : [
        'uniform float uLight; varying float vAlpha;',
        'void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25 || vAlpha <= 0.0) discard;',
        '  gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * uLight, (1.0 - d * 4.0) * vAlpha * 0.9); }',
      ].join('\n'),
    });
    const mesh = streaks ? new THREE.LineSegments(geometry, material) : new THREE.Points(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  // Heat: after the frame is drawn it is copied and drawn again through the hot air — the picture
  // wobbles in rising waves (stronger toward the top of the screen: the far ground and the horizon),
  // warm-graded and a little overexposed, with sun glare from above and a burning orange vignette.
  // Only while it is hot and the sun is up.
  const haze = {
    scene: new THREE.Scene(),
    camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    texture: null,
    size: new THREE.Vector2(),
    origin: new THREE.Vector2(),
    material: new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: { tMap: { value: null }, uTime: { value: 0 }, uHaze: { value: 0 }, uAspect: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tMap; uniform float uTime; uniform float uHaze; uniform float uAspect; varying vec2 vUv;',
        'float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float hn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }',
        'void main(){',
        '  vec2 uv = vUv;',
        '  float far = mix(0.35, 1.0, smoothstep(0.1, 0.85, uv.y));',
        '  vec2 p = vec2(uv.x * 22.0 * uAspect, uv.y * 12.0 - uTime * 1.7);',
        '  vec2 wobble = vec2(hn(p) - 0.5, (hn(p + 19.7) - 0.5) * 0.6) * 0.011;',
        '  wobble += vec2(sin(uv.y * 170.0 - uTime * 7.0) * 0.0016, 0.0);',
        '  vec3 c = texture2D(tMap, uv + wobble * uHaze * far).rgb;',
        '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
        '  vec3 hot = c * vec3(1.08, 0.99, 0.86) + vec3(0.05, 0.03, 0.0);',
        '  hot = mix(vec3(l), hot, 1.08);',
        '  hot += smoothstep(0.6, 1.0, l) * vec3(0.13, 0.09, 0.03);',
        '  float glare = smoothstep(0.55, 1.05, uv.y) * (0.8 + 0.2 * sin(uTime * 1.3));',
        '  hot += vec3(1.0, 0.9, 0.72) * glare * 0.2;',
        '  float vig = smoothstep(0.38, 0.85, length((uv - 0.5) * vec2(uAspect, 1.0)));',
        '  hot = mix(hot, hot * vec3(1.0, 0.7, 0.42), vig * (0.5 + 0.08 * sin(uTime * 2.1)));',
        '  gl_FragColor = vec4(mix(c, hot, uHaze), 1.0);',
        '}',
      ].join('\n'),
    }),
  };
  haze.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), haze.material));

  // Дальняя трава до горизонта: выгоревший луг вокруг карьера, тот же тон, что по краям земли art/quarry.js (землю
  // стройплощадки и уступы рисует карьер). Тени облаков и зерно — от карьера, снег, дождь и жара — weatherSurface.
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(90, 64),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: grassTexture() })
  );
  MicroBuildersQuarry.clouds(grass);
  quarrySurface(grass.material, 'grass');
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.12;
  grass.receiveShadow = true;
  scene.add(grass);

  let campaign = null;
  let world = null;
  let meta = null;
  let currentScreen = 'build';
  let cityBuilding = null;
  // Company panels (#meta-panel): every screen but the site and the quarter. The office and the
  // recruiting center open from their buildings, the rest from the nav (the exchange from both).
  // × goes back where the panel was opened from: panelReturn {screen, building (the lot selected)}.
  const PANEL_SCREENS = ['foremen', 'exchange', 'contract', 'office', 'tech', 'recruiting', 'personnel', 'supply', 'reactor', 'training'];
  let panelReturn = { screen: 'build', building: null };
  let panelKey = ''; // what the open panel shows (refreshPanel re-renders when it changes)
  let panelCheckedAt = 0;
  let officeTab = 'Бригада';
  // Centre of personnel: its tab and whether its «i» is open.
  let personnelTab = 'camp';
  let personnelInfo = false;
  // Camp buildings in the order they open: the personnel line, its site upgrade and technology, what it
  // is against (the short hint on the card; the weather link is in «i»).
  const PERSONNEL_CAMP = [
    { line: 'level', node: 'kitchen', tech: 'kitchen', hint: 'Голод' },
    { line: 'sales', node: 'sales', tech: 'salesOffice', hint: 'Доход' },
    { line: 'light', node: 'light', tech: 'floodlights', hint: 'Ночь' },
    { line: 'lounge', node: 'lounge', tech: 'lounge', hint: 'Перекуры' },
    { line: 'dorm', node: 'dorm', tech: 'dormitory', hint: 'Сон' },
  ];
  const PERSONNEL_TABS = [['camp', 'Городок'], ['canteen', 'Столовая'], ['dishes', 'Блюда']];
  const PERSONNEL_INFO = {
    camp: ['Здания городка открываются здесь за капитал и печати, тут же — их уровни и прокачки. На каждой стройке открытое здание стоит основанием: стройку начинают за жетон и монеты, уровни и прокачки покупают в окне здания.',
      'Кухня спасает от голода (в снег ×2), зона отдыха — от перекуров (в дождь ×1,5), бытовки — от усталости (в жару ×1,5), освещение — от ночного штрафа, офис продаж приносит монеты.',
      'Реактор на стройке открывается в Реакторе штаба.'],
    canteen: ['Места и длительность обеда действуют во всех столовых. Рабочий обедает, когда голод доходит до ' +
      Math.round(window.MicroBuildersBalance.tuning.builders.hungerDebuffFrom * 100) + '%; если мест нет, работает дальше голодным.'],
    dishes: ['Столовая на стройке готовит одно из изученных блюд. Пообедавший получает его бафф до следующего обеда.'],
  };

  // «Продвинутые улучшения» (paintAdvanced, renderTechAdvanced): the star of the advanced key nodes on the
  // site and in the tech center; above boot(), the HUD paints it from the first frame.
  const ADVANCED = MB.ADVANCED;
  const ADVANCED_TREE = [['advanced', null]].concat(ADVANCED.nodes.map(function (node) { return [node.id, 'advanced']; }));
  const ADVANCED_GATES = { advanced: { name: ADVANCED.name, icon: ADVANCED.icon, badge: '' } };
  const ADVANCED_NODES = {};
  ADVANCED.nodes.forEach(function (node) { ADVANCED_NODES[node.id] = node; });
  let advancedGraph = null;
  let advancedOn = false;
  let advancedPick = null;
  let advancedViews = {};
  let advancedTipKey = '';
  let techTab = 'graph';
  let techAdvancedGraph = null;
  let techAdvancedPick = null;
  let techAdvancedViews = {};

  let foremanFocus = null;
  let foremenAll = false; // «Все бригадиры»: the whole catalogue instead of own cards and the next three
  // «Об уровне» and the line «куда ушло время» come from the third story order (two orders done).
  const LEVEL_INFO_FROM = 2;
  // Time ledger states of the needs: what the player can shorten.
  const NEED_STATES = ['Перекур', 'Обед', 'Сон'];
  // The site's losses under the progress (paintLossStrip): ledger key, the word in the line.
  const LOSSES = [['Перекур', 'перекуры'], ['Обед', 'обед'], ['Сон', 'сон'], ['Ремонт лесов', 'ремонт лесов']];
  // What a counter-technology answers (its first site line): the loss it shortens on the site, or
  // the night penalty (techLossText).
  const LOSS_LINES = {
    smokeRare: 'Перекур', smokeShort: 'Перекур', smokeHabit: 'Перекур', willpower: 'Перекур', lounge: 'Перекур', loungeSeats: 'Перекур', smokePath: 'Перекур',
    kitchen: 'Обед', portions: 'Обед', satiety: 'Обед', mealFast: 'Обед',
    dorm: 'Сон', dormBeds: 'Сон', dormSleep: 'Сон', sleepFast: 'Сон', coffee: 'Сон',
    scaffoldDurability: 'Ремонт лесов',
    light: 'night', lightPower: 'night', nightGear: 'night',
  };
  let foremanGridScroll = 0; // «← Бригадиры» comes back to the same place in the grid
  let snapshotElapsed = 0;
  // The playtest journal (playtestReport): events kept, the levels of the last purchase scan, its timer.
  const JOURNAL_CAP = 2000;
  let journalLevels = null;
  let journalScanIn = 0;
  let timeScale = 1;
  let soundOn = true;
  let audioCtx = null;
  let music = null; // background music (startMusic): { gain, timer, step, next, noise }
  let hudElapsed = 0;
  // Session HUD (docs/gdd/16-ux-flow.md §5). The dock cards are rebuilt only when something changed
  // (hudDirty) or the coins crossed a card price (dockRange); the coin counter tweens to
  // campaign.coins and sums gains into «+1 240» once a second; the rate is the last minute of pay.
  let hudDirty = true;
  const dockRange = { campaign: null, low: 0, high: Infinity, taxiLow: false };
  const hudCoins = { campaign: null, shown: 0, from: 0, to: 0, t: 1, gain: 0, gainSince: 0, pulseAt: 0 };
  const coinRate = { campaign: null, samples: [], text: '' };
  const envView = { campaign: null, night: false, weather: '' };
  const chestAnnounced = new WeakMap(); // campaign → thresholds already announced («Сундук 25% готов!»)
  const chestToasts = {}; // threshold → that toast's handle: it goes once the chest is claimed any other way
  const contractWarned = new WeakSet(); // campaigns that got «Минута до конца контракта!»
  let crewSignature = '';
  let bannerToast = null; // the start card toast (showBanner), replaced by the next start
  // Weather badge of the day clock (names from Meta.applyEnvironment).
  const WEATHER_ICONS = { 'Снег': 'snow', 'Жара': 'heat', 'Дождь': 'rain', 'Шторм': 'storm' };
  // Why weather slows the crew on the building further (weatherEffect).
  let luckyPop = null; // the golden cube / jackpot popup on screen: { key, count, coins, capital, timer }
  // Construction sites (docs/gdd/16-ux-flow.md §1-3): the world in memory belongs to the registry
  // slot `liveKey` (Meta.site(meta, key)); it is simulated only while the player looks at it.
  const UI = window.MicroBuildersUI;
  const SITE_KEYS = Meta.SITE_KEYS;
  const RETURN_DIALOG_SECONDS = 60;
  const RESUME_CATCH_UP_SECONDS = 30;
  const ICONS = window.MicroBuildersIcons;
  // Sites that are not on screen catch up once they have been left this long (shorter gaps add up).
  const INACTIVE_CATCH_UP_SECONDS = 20;
  // The site on screen is rebuilt from its snapshot to catch up (its workers start over), so its
  // shorter absences are banked (snap.awayBank) until together they reach this.
  const ACTIVE_CATCH_UP_SECONDS = 60;
  let liveKey = null;
  let hiddenAt = 0;
  // Pre-start briefing (docs/gdd/16-ux-flow.md §4): the draft crew of the briefing that is open.
  let briefing = null;
  // Where a foreman works, by run mode («Ещё на основной стройке», «Работает на контракте»).
  let schoolTab = 'trials';
  const CREW_PLACES = { school: 'на испытании школы', campaign: 'на основной стройке', contract: 'на контракте', exchange: 'на заказе биржи' };
  const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };
  // Machines are useless without drones to assemble their patterns, so their tabs wait for the first drone.
  const DRONE_GATED_GROUPS = ['loaders', 'helicopters'];

  // Session simulator estimate shown in the level info sheet: refreshed after every purchase
  // and every SIM_REFRESH_SECONDS of real time.
  const SIM_REFRESH_SECONDS = 10;
  const simSummaries = new WeakMap();
  let simEstimate = null;
  let simElapsed = 0;
  const stickViews = new Map();
  const vehicleViews = new Map();
  const planningDesks = new Set();
  const blockViews = new Map();
  const pourViews = new Map();
  // Status icons over workers and drones (docs/gdd/16-ux-flow.md §6): the icon shows the intent,
  // not the raw phase, and switches with hysteresis in real seconds so it never blinks. All icons
  // come from one glyph atlas with shared materials; rings are prebuilt geometry + drawRange.
  const BADGE_COLORS = {
    plan: '#4a6b5a',
    fetch: '#6b4f2e',
    haul: '#2f6f8f',
    build: '#8a6a2b',
    meal: '#e07a32',
    smoke: '#5c534c',
    rest: '#3c4d86',
    front: '#6b6f75',
    path: '#b5651d',
    lost: '#c0392b',
    // A short escape: through a cube or two onto ordinary ground (red «lost» — straight through the house).
    lostShort: '#d9971a',
    overload: '#b3261e',
  };
  const BADGE_URGENT = { overload: true, path: true, lost: true, lostShort: true };
  const BADGE_TIMED_PHASES = { plan: true, mine: true, place: true, erect: true, passage: true, meal: true, break: true, pick: true };
  const BADGE_PENDING = 0.2; // a new state must last this long (real s) before the icon switches
  const BADGE_HOLD = 0.5; // the icon on screen stays at least this long
  // Plans, picks and cubes have known timings: one that will take under this (real s) gets no icon.
  const BADGE_QUICK = 1;
  const BADGE_PREDICTABLE = { plan: true, fetch: true, haul: true };
  const BADGE_SECONDS_MIN = 1.5; // «12 с» on the ring only for actions at least this long in real seconds
  const BADGE_SIZE = 0.72;
  const BADGE_RING_SEGMENTS = 48;
  const BADGE_LOD_PX = 16; // smaller on screen than this: only urgent icons…
  const BADGE_MIN_PX = 12; // …and those are kept at least this big
  const BADGE_MAX_PX = 44; // close up (worker view) icons stop growing
  const BADGE_LABEL_PX = 20; // labels («×1,6», «3/8») are at least this tall on screen: text ≈ 11 px
  const BADGE_LABEL_MIN_PX = 26; // icons smaller than this keep only urgent and selected labels
  const badgeRoot = new THREE.Group();
  scene.add(badgeRoot);
  const badgeRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x3dce67, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  });
  const badgeLodState = { urgentOnly: false, scale: 1, px: 30 };
  let badgeAtlas = null;
  // World-anchored feedback in #fx-layer (§5 «Отклик», §6): pooled coin floaters and worker chips.
  const FX_FLOAT_MAX = 12;
  const FX_ICONS = {
    coin: 'icons/icon-coins.jpg?v=2',
    lucky: 'icons/icon-coins.jpg?v=2',
    gold: 'icons/icon-coins.jpg?v=2',
    capital: 'icons/icon-capital.jpg?v=2',
  };
  const FX_CHIP_MAX = 3;
  // tripChipKind → chip tone: green — «План работ» sized the trip, gold — the carry, red — overload.
  const TRIP_CHIP_TONES = { count: 'plan', weight: 'carry', parts: 'carry', split: 'carry', front: 'warn', order: 'warn', heavy: 'bad' };
  const FX_AGGREGATE_SECONDS = 0.6; // at ×5 coin floaters are merged over this much real time
  const fxFloats = [];
  const fxChips = [];
  const fxPoint = new THREE.Vector3();
  const fxStack = []; // boxes of the floaters and chips placed this frame (stage px)
  const fxOrder = [];
  let fxTop = 0; // stage px under the top HUD bars
  const fxAggregate = { coins: 0, x: 0, y: 0, z: 0, t: 0 };
  let fxTime = 0;
  let fxChipLog = null; // dev: every chip asked for, on screen or not (MicroBuildersDebug.chipLog)
  const workerCard = { nodes: null };

  const pops = [];
  // Lightning: the bolt (segments) and the pieces of the knocked-out cubes (see onLightning).
  const BOLT_SEGMENTS = 96;
  const SHARD_LIMIT = 720;
  const SHARD_CRACK = 0.14;
  const SHARD_LIFE = 2.6;
  const SHARD_HOT = new THREE.Color(1, 0.86, 0.55);
  const lightningFx = { bolt: null, glow: null, boltAge: Infinity, shards: [], shardMesh: null };
  // The smoke calls on screen: an orange ring growing out to the call radius (pooled).
  const callRings = [];
  const graphStates = {}; // upgrade graph node states (paintUpgradeGraph), filled on every dock paint
  const TURN_SPEED = 9; // rad/s a worker turns at (visual)
  // On a ladder he stands this far from his cell's centre toward the wall: the ladder hangs 0.14
  // toward it, so a negative value keeps him just in front of the rungs.
  const LADDER_STAND = -0.1;
  // Direction from a cube being poured to what it leans on: floor, a side neighbour, the ceiling.
  const POUR_FLOOR = [0, -1, 0];
  const POUR_SIDES = [[-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]];
  const POUR_CEILING = [0, 1, 0];
  // The figure of worker-model.js stands ~1.06 tall: about a cube with this scale.
  const STICK_SCALE = 0.94;
  // Workers brought by expertise: ±10% height (junior 0.8, middle 1, senior 1.2).
  const RANK_LOOKS = {
    junior: { size: 0.9 },
    middle: { size: 1 },
    senior: { size: 1.1 },
  };
  const NO_SHIFT = [0, 0];
  const cubeCoins = new Map(); // coins poured into a cube so far → one «+N» when it is done (onPour/onPlace)
  // Mini-cubes flying from a worker's hands into the cube he builds: one instanced mesh, pooled slots.
  const FLY_SLOTS = 96;
  const flyCubes = [];
  let flyMesh = null;
  const flyColor = new THREE.Color();
  let solidMeshes = [];
  let ghostMaterials = [];
  let ghostMeshes = [];
  // Призраки здания — стекло art/fx.js (glass): рамка яруса, который строят, и бледный силуэт цели.
  // Вид каждого в прошлом кадре: 0 — ярус, 1 — к клетке несут блок, 2 — силуэт, 3 — блок уже стоит
  // (updateGhostDensity); вид и маска соседей лежат в цвете экземпляра.
  let ghostGlass = null;
  let ghostTier = NaN;
  let ghostRemaining = -1;
  let ghostBlocks = [];
  let ghostKinds = new Uint8Array(0);
  const ghostData = new THREE.Color();
  // Соседи для маски — порядок бит как в glass(): 6 по граням (+x −x +y −y +z −z), потом 12 по рёбрам —
  // пары осей xy, xz, yz со знаками (+ +, + −, − +, − −).
  const GHOST_NB = [];
  for (let a = 0; a < 3; a++) {
    for (let s = 1; s >= -1; s -= 2) {
      const d = [0, 0, 0];
      d[a] = s;
      GHOST_NB.push([d[0], d[1], d[2], 1 << (a * 2 + (s > 0 ? 0 : 1))]);
    }
  }
  for (let a = 0; a < 3; a++) {
    for (let b = a + 1; b < 3; b++) {
      for (let k = 0; k < 4; k++) {
        const d = [0, 0, 0];
        d[a] = k < 2 ? 1 : -1;
        d[b] = k % 2 ? -1 : 1;
        GHOST_NB.push([d[0], d[1], d[2], 1 << (6 + (a + b - 1) * 4 + k)]);
      }
    }
  }
  // Затенение в стыках (block-materials.js, MB_NB): маска занятых клеток вокруг блока, пересчёт после укладки.
  let aoDirty = false;
  const AO_NEIGHBORS = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const zeros = (dx === 0 ? 1 : 0) + (dy === 0 ? 1 : 0) + (dz === 0 ? 1 : 0);
        if (zeros > 1) continue;
        const bit = zeros === 0 ? 12 + (dx > 0 ? 4 : 0) + (dy > 0 ? 2 : 0) + (dz > 0 ? 1 : 0)
          : dz === 0 ? (dx > 0 ? 2 : 0) + (dy > 0 ? 1 : 0)
          : dy === 0 ? 4 + (dx > 0 ? 2 : 0) + (dz > 0 ? 1 : 0)
          : 8 + (dy > 0 ? 2 : 0) + (dz > 0 ? 1 : 0);
        AO_NEIGHBORS.push([dx, dy, dz, 1 << bit]);
      }
    }
  }
  // Соседи по граням — второй канал маски: px, nx, py, ny, pz, nz.
  const AO_SIDES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  // Site camp buildings (docs/gdd/20-site-camp.md): their views by id and the open sheet, if any.
  let campViews = {};
  let campSheet = null;
  // The open «Городок» list of the HUD ({ body }), repainted with the HUD (paintCampButton).
  let campList = null;
  // The open spell book on the site ({ body }), repainted with the mana (refreshSpells).
  let spellSheet = null;
  // The colour of each spell school (the rare resource it is learned with) in the spell book.
  const SPELL_SCHOOLS = { residential: '143, 227, 159', industrial: '245, 166, 91', highrise: '127, 200, 255', landmark: '242, 199, 92' };
  // The selected worker's see-through cubes (updateWorkerXray): the ray radius and the hidden cubes
  // with their faint copies (declared up here: disposeLevel runs during the boot).
  const XRAY_RADIUS = 1.4;
  // Seconds a cube takes to turn see-through and back; how see-through it gets.
  const XRAY_FADE = 0.3;
  const XRAY_OPACITY = 0.2;
  const xray = { hidden: new Map(), clock: 0, materials: {}, geometry: null };
  // Names and stack materials of camp buildings (declared up here: the boot builds the site view).
  const CAMP_NAMES = { canteen: 'Полевая кухня', sales: 'Офис продаж', dorm: 'Бытовки', lounge: 'Зона отдыха', light: 'Освещение', reactor: 'Реактор' };
  // Camp buildings collapsing (collapseCamp) and the soft puff of their dust.
  const collapses = [];
  let dustTexture = null;
  // Lighting masts at night (updateMastLights): one spotlight per mast, without shadows — always in
  // the scene and dark by day, so a mast going up never recompiles the materials — a soft additive
  // beam cone from the lamps to the building and a glow on the lamps.
  // The lamps of a mast: its cubes drawn in this material (whatever gem they are set in).
  const LAMP_MATERIAL = 'ladder-diamond-pure';
  const beamMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0xfff0cf) } },
    vertexShader: [
      'varying float vT; varying vec3 vNormalV; varying vec3 vViewPos;',
      'void main(){ vT = -position.y; vNormalV = normalize(normalMatrix * normal);',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0); vViewPos = mv.xyz; gl_Position = projectionMatrix * mv; }',
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity; uniform vec3 uColor; varying float vT; varying vec3 vNormalV; varying vec3 vViewPos;',
      'void main(){',
      '  float facing = abs(dot(normalize(vNormalV), normalize(-vViewPos)));',
      '  float a = uOpacity * pow(facing, 1.6) * pow(1.0 - clamp(vT, 0.0, 1.0), 1.4) * smoothstep(0.0, 0.06, vT);',
      '  gl_FragColor = vec4(uColor * a, a);',
      '}',
    ].join('\n'),
  });
  const beamGeometry = new THREE.ConeGeometry(0.42, 1, 28, 1, true).translate(0, -0.5, 0);
  const mastLights = [0, 1].map(function () {
    const light = new THREE.SpotLight(0xfff1d6, 0, 0, 0.6, 0.7, 1.4);
    light.castShadow = false;
    scene.add(light);
    scene.add(light.target);
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.frustumCulled = false;
    beam.renderOrder = 6;
    beam.visible = false;
    scene.add(beam);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff1d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    glow.visible = false;
    scene.add(glow);
    return { light: light, beam: beam, glow: glow };
  });
  const mastAim = new THREE.Vector3();
  const mastUp = new THREE.Vector3(0, -1, 0);
  const CAMP_PILES = { canteen: 'ladder-pine', sales: 'ladder-concrete', dorm: 'ladder-brick-yellow', lounge: 'ladder-pine', light: 'ladder-concrete', reactor: 'ladder-concrete' };
  // The site upgrade of each camp building.
  const CAMP_NODES = { canteen: 'kitchen', sales: 'sales', dorm: 'dorm', lounge: 'lounge', light: 'light', reactor: 'reactor' };
  // The reactor's magic sphere: the cubes drawn in this material make its core (buildReactorFx),
  // whatever gem they are set in.
  const REACTOR_CORE = 'ladder-diamond';
  let runeTexture = null;
  // Camp building upgrades capped by the personnel centre: the building and its meta line.
  const CAP_TEXTS = {
    sales: ['Офис продаж', 'Уровни офиса продаж'],
    kitchen: ['Полевая кухня', 'Уровни столовой'],
    dorm: ['Бытовки', 'Уровни бытовок'],
    lounge: ['Зона отдыха', 'Уровни зоны отдыха'],
    light: ['Освещение', 'Уровни освещения'],
  };
  // The «i» of building sheets: the long texts about the mechanics are folded by default.
  let sheetInfoOpen = false;
  const campPoint = new THREE.Vector3();
  // The pulse of the outline of tappable buildings, between these two colours.
  const OUTLINE_DIM = new THREE.Color(0xa88848);
  const OUTLINE_BRIGHT = new THREE.Color(0xf3dfae);
  let featureState = Features.createState();
  // Призраки здания видны сразу: ярус, который строят, и силуэт цели (переключатель «Подсветка» в Dev).
  let ghostsOn = true;
  let scaffoldLookup = new Map();
  // Wear marks by piece id (crack lines, the tape cross of a broken piece) and the pieces on view.
  let scaffoldCrackLookup = new Map();
  let scaffoldTapeLookup = new Map();
  let scaffoldPieceById = new Map();
  let scaffoldMeshes = [];
  const scaffoldDirty = new Set();
  const hiddenScaffoldMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(0, -40, 0), new THREE.Quaternion(), new THREE.Vector3(0.001, 0.001, 0.001));
  // Instance tints of a scaffold piece by its wear (paintScaffoldWear).
  const WEAR_TINT = { ok: new THREE.Color(0xffffff), cracked: new THREE.Color(0xc29a72), broken: new THREE.Color(0x75685c) };
  // How far a worn piece leans (radians): a ladder off its wall, a deck sags to one side.
  const WEAR_TILT = { ok: 0, cracked: 0.07, broken: 0.14 };
  // Scaffold types (balance.json → tuning.scaffold: every tierFloors floors, `tiers` of them).
  // The floor of the deck tells the type first (scaffoldFloorTextures): wood boards, concrete slabs,
  // green painted plywood, chequer plate with a yellow-black edge, dark chequer plate with a red edge.
  // The wooden type is square timber (`timber`), the others steel tubes.
  const SCAFFOLD_LOOKS = [
    { frame: 0x9a6b3e, rough: 0.85, metal: 0.03, brace: 0x7a5232, deckRough: 0.88, deckMetal: 0.02, timber: true },
    { frame: 0x9aa7b0, rough: 0.38, metal: 0.72, brace: 0xe07a2c, deckRough: 0.95, deckMetal: 0 },
    { frame: 0x2f6db3, rough: 0.45, metal: 0.4, brace: 0xf0c330, deckRough: 0.6, deckMetal: 0.05 },
    { frame: 0xe2b21e, rough: 0.5, metal: 0.3, brace: 0xc9442c, deckRough: 0.45, deckMetal: 0.45 },
    { frame: 0x3b4149, rough: 0.42, metal: 0.6, brace: 0xc8262e, deckRough: 0.5, deckMetal: 0.5 },
  ];
  let scaffoldFloors = null;
  const workerRaycaster = new THREE.Raycaster();
  const workerPointer = new THREE.Vector2();
  const workerPlan = new THREE.Group();
  let selectedBuilder = null;
  let workerPlanSignature = '';
  scene.add(workerPlan);

  const cameraController = MicroBuildersCamera.create({
    view: view,
    getWorld: function () {
      return world;
    },
    getSelectedBuilder: function () {
      return selectedBuilder;
    },
    getStickView: function (builder) {
      return stickViews.get(builder);
    },
    onClick: function (event) {
      selectWorker(event);
    },
    onInteract: onCameraInteract,
    onWorkerViewChange: updateWorkerViewButton,
  });
  const camera = cameraController.camera;
  // Частицы, вспышки и финал стройки (art/fx.js): пыль, крошка и искры по материалу, кромка закрытого яруса,
  // конфетти и флажок на сданном здании, пыль самосвала и выхлоп. Всё из пулов, созданных один раз.
  const fx = MicroBuildersFx.create(scene, function () { return camera; }, formatShort);
  let fxTier = -1; // ярус фокуса стройки при прошлой проверке (closeTier)
  let shakeAmp = 0; // тряска камеры: сила, гаснет за ~0,5 с (shake)
  let shakeT = 0;
  // Волна блеска по зданию снизу вверх при сдаче (block-materials.js glint): с от сдачи, проход снизу доверху.
  const GLINT_START = 0.25;
  const GLINT_SWEEP = 1.4;
  let glintT = -1;
  // Сдача (celebrate): бригада подпрыгивает и машет руками CHEER секунд; камера облетает готовое здание
  // COMPLETE_SWEEP секунд, потом окно «Объект сдан!» (onLiveComplete).
  const CHEER = 2.6;
  const COMPLETE_SWEEP = 2.4;
  let cheerT = 0;
  const vehicleFxPoint = new THREE.Vector3();
  // Звук (sfx): общий gain, буфер шума, время последнего звука по имени, комбо укладок и звона монет.
  let sfxBus = null;
  let sfxNoise = null;
  const sfxLast = {};
  let sfxCombo = 0;
  // Фон (updateAudio): гул техники — две пилы через lowpass, ветер — петля шума через bandpass.
  let humGain = null;
  let humOsc = null;
  let humOsc2 = null;
  let windGain = null;
  let windFilter = null;
  let humNear = 0;
  let humMove = 0;
  let audioWait = 0;
  watchSafeArea();
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', markAbsent);
  window.addEventListener('pagehide', markAbsent);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') markAbsent();
    else onPageVisible();
  });

  document.getElementById('interface-toggle').addEventListener('click', function (event) {
    const hidden = document.body.classList.toggle('interface-hidden');
    event.currentTarget.classList.toggle('on', hidden);
    event.currentTarget.setAttribute('aria-label', hidden ? 'Показать интерфейс' : 'Скрыть интерфейс');
    event.currentTarget.title = hidden ? 'Показать интерфейс' : 'Скрыть интерфейс';
  });
  document.getElementById('camera-home').addEventListener('click', recenterCamera);
  document.getElementById('city-signs').addEventListener('click', function (event) {
    const sign = event.target.closest('.city-sign');
    if (sign) selectCityLot(sign.dataset.id);
  });
  document.getElementById('restart').addEventListener('click', confirmRestart);
  document.body.insertAdjacentHTML('beforeend', '<div id="site-signs"></div>');
  document.getElementById('site-signs').addEventListener('click', function (event) {
    const sign = event.target.closest('[data-camp]');
    if (sign) openCamp(sign.dataset.camp);
  });
  document.getElementById('jump-level-go').addEventListener('click', function () {
    const number = Math.round(Number(document.getElementById('jump-level').value));
    if (!(number >= 1 && number <= MB.LEVELS.length)) {
      UI.toast({ text: 'Введите уровень от 1 до ' + MB.LEVELS.length, icon: 'lock', tone: 'warn', key: 'jump-level' });
      return;
    }
    fastForwardTo(number - 1);
  });
  document.getElementById('reset-company').addEventListener('click', confirmReset);
  document.getElementById('playtest-report').addEventListener('click', openPlaytestReport);
  document.getElementById('abandon-run').addEventListener('click', confirmAbandon);
  document.getElementById('site-chip').addEventListener('click', function () { openScreen('build'); });
  document.getElementById('next-cta').addEventListener('click', onNextCta);
  document.getElementById('level-prev').addEventListener('click', function () { jumpTo(world.level.index - 1); });
  document.getElementById('level-next').addEventListener('click', function () { jumpTo(world.level.index + 1); });
  document.getElementById('level-pick').addEventListener('change', function (event) {
    jumpTo(Number(event.target.value));
  });
  document.getElementById('ghost-toggle').addEventListener('change', function (event) {
    ghostsOn = event.target.checked;
    applyGhostVisibility();
  });
  document.getElementById('scaffold-toggle').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-step').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-erect').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-shortcut-routes').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-expansion-budget').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-horizontal-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-vertical-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-ladder-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-deck-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-passage-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('free-purchases').addEventListener('change', function (event) {
    campaign.freePurchases = event.target.checked;
    paintHud();
  });
  document.getElementById('mute').addEventListener('click', function () {
    soundOn = !soundOn;
    meta.settings.sound = soundOn;
    Meta.save(meta);
    paintMute();
    setMusicVolume();
  });
  // «Графика»: авто → высокая → средняя → низкая → авто.
  document.getElementById('quality').addEventListener('click', function () {
    qualitySetting = QUALITY_ORDER[(QUALITY_ORDER.indexOf(qualitySetting) + 1) % QUALITY_ORDER.length];
    meta.settings.quality = qualitySetting;
    Meta.save(meta);
    if (!forcedQuality) applyQuality(qualitySetting === 'auto' ? (handheld ? 'medium' : 'high') : qualitySetting);
    paintQuality();
  });
  // Browsers start audio only from a gesture: the first touch anywhere unlocks it and starts the music.
  document.addEventListener('pointerdown', function () {
    ensureAudio();
    if (audioCtx.state === 'suspended' && document.visibilityState === 'visible') audioCtx.resume();
    startMusic();
  });
  document.addEventListener('visibilitychange', function () {
    if (!audioCtx) return;
    if (document.visibilityState === 'hidden') audioCtx.suspend();
    else audioCtx.resume();
  });
  document.querySelectorAll('[data-dev-group]').forEach(function (box) {
    box.addEventListener('change', function () {
      campaign.devGroups[box.dataset.devGroup] = box.checked;
      if (box.dataset.devGroup === 'all') {
        document.querySelectorAll('[data-dev-group]').forEach(function (other) {
          other.checked = box.checked;
          campaign.devGroups[other.dataset.devGroup] = box.checked;
        });
      }
      paintHud();
    });
  });
  document.getElementById('upgrade-dock').addEventListener('click', function (event) {
    const button = event.target.closest('.upgrade');
    if (!button) return;
    tapUpgrade(button.id.slice(3));
  });
  document.querySelectorAll('#app-nav [data-screen]').forEach(function (button) {
    button.addEventListener('click', function () {
      const screen = button.dataset.screen;
      if (screen !== 'build' && contractLocked()) return;
      // Tabs never disappear: a closed one says what opens it.
      const lock = navLock(screen);
      if (lock) {
        UI.toast({ text: lock, icon: 'lock', key: 'nav-lock:' + screen });
        return;
      }
      if (screen === 'hq') cityBuilding = null;
      openScreen(screen);
    });
  });
  // The site's only way out: the quarter, where the rest of the navigation lives.
  document.getElementById('hq-btn').addEventListener('click', function () {
    if (contractLocked()) return;
    cityBuilding = null;
    openScreen('hq');
  });
  document.getElementById('mana-btn').addEventListener('click', function () {
    if (world && campaign && campaign.status === 'play') openSpells();
  });
  document.getElementById('camp-btn').addEventListener('click', function () {
    if (world && campaign && campaign.status === 'play') openCampList();
  });
  document.getElementById('chest-25').addEventListener('click', function () { tapChest(25); });
  document.getElementById('chest-50').addEventListener('click', function () { tapChest(50); });
  // ui.js toggles the popover first; its lines are painted right away, then every HUD tick.
  document.getElementById('day-clock').addEventListener('click', paintDayPop);
  document.getElementById('hide-interface').addEventListener('click', function () {
    document.getElementById('interface-toggle').click();
  });
  // Dev: «CPU» (cpu-profiler.js) joins «Рабочие» inside the Dev panel, off the dock.
  if (document.getElementById('cpu-profiler-toggle')) {
    document.getElementById('dev-buttons').appendChild(document.getElementById('cpu-profiler-toggle'));
  }
  document.getElementById('level-info-toggle').addEventListener('click', function () {
    if (!meta.flags.levelInfo) {
      meta.flags.levelInfo = true;
      Meta.save(meta);
      this.classList.remove('has-news');
    }
    setLevelInfo(true);
  });
  document.getElementById('loss-strip').addEventListener('click', function () { openTimings(); });
  document.getElementById('level-info-tabs').addEventListener('click', function (event) {
    const tab = event.target.dataset && event.target.dataset.tab;
    if (tab) setLevelInfoTab(tab);
  });
  // «Тайминги» → «По прокачкам» (paintLevelTimings) is remembered between sessions.
  const TIME_CATEGORIES_KEY = 'mb.timeCategories';
  const timeCategoriesToggle = document.getElementById('level-time-categories');
  try { timeCategoriesToggle.checked = window.localStorage.getItem(TIME_CATEGORIES_KEY) === '1'; } catch (error) { /* stays off */ }
  timeCategoriesToggle.addEventListener('change', function () { setTimeCategories(timeCategoriesToggle.checked); });
  document.getElementById('material-row').addEventListener('click', toggleMaterialRow);
  document.getElementById('panel-close').addEventListener('click', closePanel);
  document.getElementById('meta-content').addEventListener('click', onMetaAction);
  document.getElementById('city-card').addEventListener('click', onCityCardAction);
  document.querySelectorAll('.tempo button[data-tempo]').forEach(function (button) {
    button.addEventListener('click', function () {
      // The speed row is a playtest tool open to everyone for now (§5); it goes before release.
      // A contract's clock never stops (docs/gdd/16-ux-flow.md §1): no pause while it runs.
      if (Number(button.dataset.tempo) === 0 && contractRunning()) {
        UI.toast({ text: 'Таймер испытания не останавливается', icon: 'clock', tone: 'warn', key: 'contract-pause' });
        return;
      }
      timeScale = Number(button.dataset.tempo);
      if (timeScale === 20) settleAcceleratedVisuals();
      paintTempo();
    });
  });
  window.addEventListener('keydown', function (event) {
    if (BuildPatternEditor.opened) return;
    // Windows stop keys before they get here; with none open Escape closes the top layer (a HUD
    // popover, a company panel, the HQ lot card) — the same as Back.
    if (event.key === 'Escape') {
      UI.layer.back();
      return;
    }
    if (document.body.classList.contains('has-modal') || currentScreen !== 'build') return;
    // Typing a number (the menu's «Перемотать на уровень») is not a purchase.
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.key === '1') buy('builders');
    if (event.key === '2') buy('speed');
    if (event.key === '3') buy('carry');
    if (event.key === '4') buy('horizontal');
    if (event.key === '5') buy('vertical');
    if (event.key === '6') buy('plan');
    if (event.key === '7') buy('vehicles');
    if (event.key === '8') buy('vehicleHeight');
    if (event.key === '9') buy('vehicleReach');
  });

  // The foundation of a camp building not started yet: a concrete slab over its pad with orange-and-
  // white corner posts — tap it to start the building (1 token + the coins of its first level).
  const campFoundationMat = {
    slab: new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: 0.92 }),
    edge: new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.9 }),
    post: new THREE.MeshStandardMaterial({ color: 0xf08a2a, roughness: 0.6 }),
    cap: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.5 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6a4a2f, roughness: 0.9 }),
  };
  const machineMat = {
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2b91f, roughness: 0.45, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.7, metalness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.35, metalness: 0.7 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x1d1f21, roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x8cc7da, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.6 }),
    light: new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xfff0b0, emissiveIntensity: 0.6 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.6 }),
    heli: new THREE.MeshStandardMaterial({ color: 0xd8402f, roughness: 0.38, metalness: 0.35 }),
    heliWhite: new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.4, metalness: 0.3 }),
    blur: new THREE.MeshBasicMaterial({ color: 0x1d2024, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
  };
  // Фары и огни техники светятся (art/post.js), ночью ярче (frame).
  MicroBuildersPost.mark(machineMat.light);
  // Машины работают в карьере: присохшая грязь снизу, сколы и подтёки по краске (art/vehicles.js grime).
  ['yellow', 'dark', 'heli', 'heliWhite'].forEach(function (key) { MicroBuildersVehicles.dirty(machineMat[key], 0.25); });
  ['steel', 'tyre'].forEach(function (key) { MicroBuildersVehicles.dirty(machineMat[key], 0.35); });

  // The worker figure itself is worker-model.js (MicroBuildersWorkerModel): body, face and the
  // clothes of his rank. Here only the props in his hands.
  const workerMat = {
    cloth: new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.62 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 }),
    pick: new THREE.MeshStandardMaterial({ color: 0xb7c0c8, metalness: 0.7, roughness: 0.35 }),
  };
  const WorkerModel = window.MicroBuildersWorkerModel;

  const LOOK = {
    stone: { roughness: 0.92, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
    sand: { roughness: 0.88, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
    concrete: { roughness: 0.84, metalness: 0.04, emissive: 0x000000, emissiveIntensity: 0 },
    wood: { roughness: 0.78, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
    brick: { roughness: 0.82, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
    metal: { roughness: 0.32, metalness: 0.82, emissive: 0x000000, emissiveIntensity: 0 },
    marble: { roughness: 0.28, metalness: 0.08, emissive: 0x000000, emissiveIntensity: 0 },
    gem: { roughness: 0.22, metalness: 0.18, emissive: 0x000000, emissiveIntensity: 0 },
    obsidian: { roughness: 0.12, metalness: 0.55, emissive: 0x120818, emissiveIntensity: 0.25 },
    diamond: { roughness: 0.04, metalness: 0.12, emissive: 0xb9f6ff, emissiveIntensity: 0.45 },
    platinum: { roughness: 0.16, metalness: 0.92, emissive: 0x000000, emissiveIntensity: 0 },
    tile: { roughness: 0.3, metalness: 0.06, emissive: 0x000000, emissiveIntensity: 0 },
    crystal: { roughness: 0.06, metalness: 0.12, emissive: 0x000000, emissiveIntensity: 0 },
    lapis: { roughness: 0.3, metalness: 0.2, emissive: 0x000000, emissiveIntensity: 0 },
    amber: { roughness: 0.18, metalness: 0.05, emissive: 0x000000, emissiveIntensity: 0 },
    opal: { roughness: 0.14, metalness: 0.1, emissive: 0x000000, emissiveIntensity: 0 },
    magma: { roughness: 0.7, metalness: 0.05, emissive: 0x000000, emissiveIntensity: 0 },
    cosmic: { roughness: 0.1, metalness: 0.2, emissive: 0x000000, emissiveIntensity: 0 },
    glass: { roughness: 0.08, metalness: 0.1, emissive: 0x123c4a, emissiveIntensity: 0.35 },
  };
  const blockSurfaceCache = {};
  // Grand dinner effects by name (the kitchen block and its toast; events may come during boot).
  const GRAND_EFFECTS = { place: 'укладка', carry: 'ноша', walk: 'ходьба', climb: 'подъём' };

  BuildPatternEditor.init(applyScaffoldTuning);
  MicroBuildersWorkerLog.bind(focusWorker);
  boot();

  // Dev-mode helpers for testing machines and drones: buy every upgrade, fast-forward the site.
  if (document.body.classList.contains('dev-mode')) {
    window.MicroBuildersDebug = {
      maxUpgrades: function () {
        campaign.freePurchases = true;
        campaign.devGroups.all = true;
        Object.keys(window.MicroBuildersBalance.session).forEach(function (kind) {
          let guard = 0;
          while (guard < 40 && buy(kind)) guard += 1;
        });
        paintHud();
      },
      // slice: sim seconds per frame (default 0.05; 1/60 imitates the real 60 fps loop at ×1).
      step: function (seconds, slice) {
        const dt = slice || 0.05;
        for (let t = 0; t < seconds && campaign.status === 'play'; t += dt) {
          MB.beginFrame(world);
          MB.stepWorld(world, dt);
          consumeEvents();
        }
        paintHud();
      },
      world: function () { return world; },
      features: function () { return featureState; },
      chapterTint: function () { return chapterTint; },
      quality: function () { return { setting: qualitySetting, level: qualityLevel, forced: forcedQuality, post: !!post, handheld: handheld }; },
      // Что под точкой экрана (sx, sy — доли от левого верхнего угла): проверка графики.
      pick: function (sx, sy) {
        workerPointer.set(sx * 2 - 1, 1 - sy * 2);
        workerRaycaster.setFromCamera(workerPointer, camera);
        return workerRaycaster.intersectObjects(scene.children, true).filter(function (hit) { return hit.object.isMesh; }).slice(0, 4).map(function (hit) {
          const o = hit.object;
          const m = Array.isArray(o.material) ? o.material[0] : o.material;
          return {
            type: o.type, geo: o.geometry && o.geometry.type, mat: m && m.type, color: m && m.color ? m.color.getHexString() : '',
            map: !!(m && m.map), opacity: m ? m.opacity : 1, transparent: !!(m && m.transparent), d: Math.round(hit.distance * 10) / 10,
            y: Math.round(hit.point.y * 100) / 100, instance: hit.instanceId, count: o.count, parent: o.parent ? o.parent.type : '',
            scale: hit.instanceId !== undefined ? (function () {
              o.getMatrixAt(hit.instanceId, dummy.matrix);
              dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
              return dummy.scale.toArray().map(function (v) { return Math.round(v * 100) / 100; });
            })() : o.scale.toArray(),
            image: m && m.map && m.map.image ? m.map.image.width + 'x' + m.map.image.height : '',
            env: !!(m && m.envMap), shader: m && m.onBeforeCompile ? String(m.onBeforeCompile).slice(0, 50) : '',
            emissive: m && m.emissive ? m.emissive.getHexString() + '×' + Math.round(m.emissiveIntensity * 100) / 100 : '',
            glow: !!(m && m.userData.mbGlow), blending: m ? m.blending : 0,
          };
        });
      },
      // The canteen stands finished as form n (1–5); lookAtCamp frames a camp building.
      canteenForm: function (n, collapse) {
        return window.MicroBuildersDebug.campForm('canteen', n, collapse);
      },
      // Camp building id ('canteen' / 'sales' / 'dorm' / 'lounge' / 'light' — both masts) stands finished as form n.
      campForm: function (id, n, collapse) {
        if (!MB.debugCampForm(world, id, n, collapse)) return false;
        consumeEvents();
        paintHud();
        const site = MB.campSite(world, id) || (world.lights || [])[0];
        return site ? site.total : true;
      },
      lookAtCamp: function (id, distance, polar) {
        const site = MB.campSite(world, id || 'canteen');
        if (!site) return false;
        const view = cameraController.getView();
        view.target = { x: (site.box.x0 + site.box.x1) / 2, y: site.box.h * 0.35, z: (site.box.z0 + site.box.z1) / 2 };
        view.distance = distance || 24;
        view.polar = polar || 1.05;
        view.autoFollow = false;
        return cameraController.setView(view);
      },
      meta: function () { return meta; },
      campaign: function () { return campaign; },
      // Opens a building sheet: 'personnel' (the HQ centre) or a camp building id on the site.
      sheet: function (id) { if (id === 'personnel') openBuildingPanel('personnel'); else openCamp(id); },
      // Presence flow: away(seconds) pretends the app spent that long in the background (from the
      // current screen) and runs the return; screen(name) is a nav tap; finish() completes the site.
      away: function (seconds) { simulateAway(seconds); },
      screen: function (name) { openScreen(name); },
      finish: function () {
        if (campaign.status !== 'play') return;
        MB.applyOfflineMass(world, Infinity);
        consumeEvents();
        paintHud();
      },
      sites: function () { return meta.sites; },
      liveSite: function () { return liveKey; },
      overlays: function () {
        return Array.prototype.map.call(document.querySelectorAll('#overlay-root .overlay'), function (el) { return el.dataset.overlay; });
      },
      requestRun: function (spec) { requestRun(spec); },
      briefing: function () { return briefing; },
      // The playtest report as the menu builds it ({ text, data }); scan — the purchase diff at once.
      report: function () { return playtestReport(); },
      journalScan: function () { journalScanIn = 0; tickJournal(0); },
      switchSite: function (key) { switchSite(key); },
      city: function () { syncCity(); paintCityCard(); paintCityWallet(); placeCitySigns(); },
      // City animations, the camera and the signs advance together (headless tests have no rAF).
      cityTick: function (seconds) {
        for (let t = 0; t < seconds; t += 0.05) {
          tickCityBuild(0.05);
          cameraController.update(0.05, campaign ? campaign.status : '');
        }
        refreshCity();
        placeCitySigns();
      },
      cityRecords: function () { return cityRecords; },
      pickCity: function (id) { cityBuilding = id; paintCityCard(); },
      selectCity: function (id) { selectCityLot(id); },
      // The building's window as if opened from its card in the HQ (× leads back to that card).
      openOffice: function (tab) {
        if (tab) officeTab = tab;
        if (currentScreen !== 'hq') openScreen('hq');
        openBuildingPanel('office');
      },
      showCard: function (card) { showCardReveal(card, 'chest50'); },
      openCityBuilding: function (id) {
        if (currentScreen !== 'hq') openScreen('hq');
        if (!openBuildingPanel(id)) selectCityLot(id);
      },
      panel: function () { return { screen: currentScreen, back: panelReturn, layer: UI.layer.top(), scroll: document.getElementById('meta-panel').scrollTop }; },
      panelTick: function () { refreshPanel(true); },
      // Camera: the controller, a synchronous safe-area measure and the recenter button paint.
      camera: function () { return cameraController; },
      safeArea: function () { refreshSafeArea({ snap: true }); return cameraController.getSafeArea(); },
      cameraUi: function () { paintCameraButton(); },
      // The HUD without rAF (headless tests): per-frame HUD effects (coin tween, «+N» sums, popup
      // timers run on setTimeout anyway) for `seconds`, then one regular HUD tick.
      hudTick: function (seconds) {
        for (let t = 0; t < (seconds || 0.25); t += 0.05) tickHudFx(0.05);
        paintHud(true);
        paintDayPop();
      },
      stepUntil: function (test, maxSeconds) {
        for (let t = 0; t < maxSeconds && campaign.status === 'play'; t += 0.05) {
          MB.beginFrame(world);
          MB.stepWorld(world, 0.05);
          consumeEvents();
          if (test(world)) break;
        }
        paintHud();
      },
      buy: function (kind, times) {
        campaign.freePurchases = true;
        campaign.devGroups.all = true;
        for (let i = 0; i < times; i++) buy(kind);
        paintHud();
      },
      look: function (x, z, radius) {
        cameraController.framePoint(x, 1, z, radius || 8);
        cameraController.snap();
      },
      lookVehicle: function (index, radius) {
        const vehicle = world.vehicles[index];
        if (vehicle) cameraController.framePoint(vehicle.cell[0] + 0.5, 1, vehicle.cell[2] + 0.5, radius || 7);
        cameraController.snap();
      },
      lookDrone: function (index, radius) {
        const drone = world.builders.filter(function (builder) { return builder.trade === 'engineer'; })[index];
        if (drone) cameraController.framePoint(drone.cell[0], drone.cell[1], drone.cell[2], radius || 4);
        cameraController.snap();
      },
      follow: function (trade, nth) {
        const list = world.builders.filter(function (builder) { return builder.trade === trade; });
        const builder = list[nth || 0];
        if (!builder) return;
        if (selectedBuilder !== builder) focusWorker(builder);
      },
      // The camera now: orbit distance, whether it follows the selected worker, see-through cubes.
      cameraInfo: function () {
        return { radius: cameraController.radius, tracking: cameraController.isTracking(), xray: xray.hidden.size,
          eye: camera.position.toArray().map(function (v) { return Math.round(v * 10) / 10; }) };
      },
      // Worker views without rAF (headless tests): one view frame with a fixed real dt;
      // render: true also draws the scene.
      viewFrame: function (realDt, render) {
        const dt = realDt === undefined ? 1 / 30 : realDt;
        updatePours();
        updatePops(dt);
        updateSparks(dt);
        updateLightningFx(dt);
        updateFlyCubes(dt);
        updateSticks(clock.elapsedTime, dt);
        updateWorkerPlan(clock.elapsedTime);
        cameraController.update(dt, campaign ? campaign.status : '');
        updateWorldFx(dt);
        paintWorkerCard();
        if (render) renderer.render(scene, camera);
      },
      // Shown status icon per worker: kind, number of switches so far, on screen or not.
      badges: function () {
        const list = [];
        stickViews.forEach(function (viewState, builder) {
          const badge = viewState.badge;
          list.push({
            index: builder.index,
            trade: builder.trade,
            shown: badge.shown,
            icon: badge.group.visible ? badge.shown : '',
            changes: badge.changes,
            label: badge.labelText,
            labelShown: !!(badge.label && badge.label.visible && badge.group.visible),
            labelPx: badge.label ? Math.round(badge.label.scale.y * badgeLodState.px * badge.size / BADGE_SIZE) : 0,
            ring: badge.ring.visible ? badge.segments : 0,
          });
        });
        return list;
      },
      pickWorker: function (nth) {
        const list = world.builders.filter(function (builder) { return builder.trade !== 'engineer'; });
        focusWorker(list[nth || 0] || null);
      },
      fx: function () {
        return {
          floats: fxFloats.filter(function (fx) { return fx.life > 0; }).map(function (fx) { return fx.text.data + (fx.caption.data ? ' | ' + fx.caption.data : ''); }),
          chips: fxChips.filter(function (fx) { return fx.life > 0; }).map(function (fx) { return fx.text.data; }),
        };
      },
      // Start (true) or stop recording every chip text asked for; returns the live list.
      chipLog: function (on) {
        fxChipLog = on ? [] : null;
        return fxChipLog;
      },
    };
  }

  function boot() {
    fillLevelPick();
    meta = Meta.load();
    soundOn = meta.settings.sound !== false;
    paintMute();
    qualitySetting = QUALITY_ORDER.indexOf(meta.settings.quality) >= 0 ? meta.settings.quality : 'auto';
    if (!forcedQuality && qualitySetting !== 'auto') applyQuality(qualitySetting);
    paintQuality();
    // The absence started when the page was hidden (or, after a crash, at the last save).
    const company = Meta.claimAway(meta, meta.hiddenAt || meta.lastSeenAt, true);
    const key = Meta.activeSite(meta);
    const returning = !!Meta.site(meta, key) || meta.completed.length > 0 || meta.campaignLevel > 0;
    if (!returning) {
      // The very first launch: level 1 waits behind the title card.
      campaign = MB.createCampaign();
      Meta.configureNewCampaign(meta, campaign, 'campaign', 0, null);
      world = MB.startLevel(campaign);
      campaign.status = 'title';
      world.events.length = 0;
      liveKey = null;
      buildLevelView();
      paintHud();
      buildCity();
      openScreen('build', { silent: true });
      showTitle();
      requestAnimationFrame(frame);
      return;
    }
    document.body.classList.add('playing');
    buildCity();
    if (Meta.site(meta, key)) {
      // A returning player lands on the site: every site catches up, then the return window.
      enterSites({ seconds: company.seconds, company: company, boot: true });
    } else {
      // Progress but no site (old saves, end of the campaign): the next story order.
      campaign = MB.createCampaign();
      Meta.configureNewCampaign(meta, campaign, 'campaign', meta.campaignLevel, null);
      world = MB.startLevel(campaign);
      campaign.status = 'title';
      world.events.length = 0;
      buildLevelView();
      openScreen('build', { silent: true });
      requestRun({ mode: 'campaign', levelIndex: meta.campaignLevel, reason: 'boot' });
    }
    paintHud();
    requestAnimationFrame(frame);
  }

  // First launch only (docs/gdd/16-ux-flow.md §3): starting level 1 needs no briefing.
  function showTitle() {
    UI.overlay.open({
      id: 'title',
      className: 'title-card',
      closable: false,
      kicker: 'Строительная компания',
      title: 'MicroBuilders',
      body: '<p>Ваш первый заказ — маленький каменный дом. Бригада построит его сама, а вы помогайте прокачками.</p>',
      actions: [{ id: 'start', label: 'Начать стройку', primary: true, onClick: beginShift }],
    });
  }

  function beginShift() {
    ensureAudio();
    UI.overlay.close('title');
    campaign.status = 'play';
    liveKey = Meta.siteKey(campaign.runMode);
    Meta.saveSite(meta, liveKey, campaign, world, { awaySince: null, awayBank: 0 });
    Meta.setActiveSite(meta, liveKey);
    journalNote('start', journalRun(campaign));
    document.body.classList.add('playing');
    showBanner();
    paintHud();
    // The HUD just appeared: frame the free band, then the entry fly-in.
    refreshSafeArea({ snap: true });
    cameraController.frameHome({ intro: true });
  }

  function paintMute() {
    document.getElementById('mute').textContent = soundOn ? 'Звук: вкл' : 'Звук: выкл';
  }

  function paintQuality() {
    const setting = forcedQuality || qualitySetting;
    document.getElementById('quality').textContent = 'Графика: ' + QUALITY_NAMES[setting] +
      (setting === 'auto' ? ' · ' + QUALITY_NAMES[qualityLevel] : '');
  }

  // Новое качество: размер карты теней (карту three создаст заново), чёткость холста, пост свечения.
  function applyQuality(level) {
    qualityLevel = level;
    const size = qualityShadow();
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    }
    renderer.setPixelRatio(renderPixelRatio());
    if (post && !QUALITY[level].post) post.release();
    qualityWatch.t = 0;
    qualityWatch.frames = 0;
    qualityWatch.strikes = 0;
    qualityWatch.grace = 6;
    paintQuality();
  }

  // «Авто»: средний кадр на стройке за 4 секунды; два таких отрезка подряд ниже 40 кадров — ступень ниже.
  // Первые секунды уровня (сборка шейдеров) и рывки длиннее полсекунды не считаются.
  function watchQuality(wallDt) {
    if (forcedQuality || qualitySetting !== 'auto' || qualityLevel === 'low') return;
    if (currentScreen !== 'build' || document.visibilityState === 'hidden' || !world || wallDt > 0.5) {
      qualityWatch.t = 0;
      qualityWatch.frames = 0;
      return;
    }
    if (qualityWatch.grace > 0) {
      qualityWatch.grace -= wallDt;
      return;
    }
    qualityWatch.t += wallDt;
    qualityWatch.frames += 1;
    if (qualityWatch.t < 4) return;
    const fps = qualityWatch.frames / qualityWatch.t;
    qualityWatch.t = 0;
    qualityWatch.frames = 0;
    qualityWatch.strikes = fps < 40 ? qualityWatch.strikes + 1 : 0;
    if (qualityWatch.strikes >= 2) applyQuality(qualityLevel === 'high' ? 'medium' : 'low');
  }

  // Кадр на экран: на «высоком» ПК — через пост свечения (art/post.js), иначе как раньше. ?quality=high включает
  // пост и на «телефоне» (снимки в headless Chrome, где указатель считается пальцем).
  function renderScene(night) {
    if (QUALITY[qualityLevel].post && (!handheld || forcedQuality === 'high')) {
      if (!postTried) {
        postTried = true;
        post = MicroBuildersPost.create(renderer);
      }
      if (post) {
        MicroBuildersPost.setActive(true);
        post.render(scene, camera, 0.3 + 0.15 * night);
        return;
      }
    }
    MicroBuildersPost.setActive(false);
    renderer.render(scene, camera);
  }

  // Saves the live site; `extra` goes to Meta.saveSite (status, awaySince, reward).
  function saveLive(extra) {
    if (meta === null || campaign === null || world === null || liveKey === null) return;
    if (campaign.status !== 'play' && campaign.status !== 'complete') return;
    Meta.saveSite(meta, liveKey, campaign, world, extra);
  }

  function timedMode(mode) { return mode === 'contract' || mode === 'school'; }

  function trialLimit(c) { return c.runMode === 'school' ? Meta.schoolLimitSeconds(c) : Meta.contractLimitSeconds(meta); }

  function contractRunning() {
    return !!campaign && liveKey === 'side' && timedMode(campaign.runMode) && campaign.status === 'play';
  }

  // A contract is a timed trial: the player stays on its site until it is handed over or dropped
  // (menu «Бросить контракт»). Every way out (nav, other sites' windows, new runs) asks here.
  function contractLocked() {
    if (!contractRunning()) return false;
    UI.toast({ text: campaign.runMode === 'school' ? 'Завершите или бросьте испытание школы' : 'Во время контракта уйти нельзя — сдайте или бросьте контракт', icon: 'contract', tone: 'warn', key: 'contract-lock' });
    return true;
  }

  function applyScaffoldTuning() {
    if (campaign && campaign.runMode === 'school') return;
    MB.SCAFFOLD.enabled = document.getElementById('scaffold-toggle').checked;
    MB.SCAFFOLD.step = Number(document.getElementById('scaffold-step').value);
    MB.SCAFFOLD.erectSeconds = Number(document.getElementById('scaffold-erect').value);
    MB.SCAFFOLD.shortcutRoutes = document.getElementById('scaffold-shortcut-routes').checked;
    MB.SCAFFOLD.expansionBudget = Number(document.getElementById('scaffold-expansion-budget').value);
    MB.SCAFFOLD.horizontalPrice = Number(document.getElementById('scaffold-horizontal-price').value);
    MB.SCAFFOLD.verticalPrice = Number(document.getElementById('scaffold-vertical-price').value);
    MB.SCAFFOLD.ladderPrice = Number(document.getElementById('scaffold-ladder-price').value);
    MB.SCAFFOLD.deckPrice = Number(document.getElementById('scaffold-deck-price').value);
    MB.SCAFFOLD.passagePrice = Number(document.getElementById('scaffold-passage-price').value);
    if (!world || !campaign) return;
    const status = campaign.status;
    disposeLevel();
    world = MB.startLevel(campaign);
    if (status === 'title') {
      campaign.status = 'title';
      world.events.length = 0;
    }
    SITE_KEYS.forEach(function (key) { UI.overlay.close('complete-' + key); });
    buildLevelView();
    paintHud();
  }

  function resetCompany() {
    UI.overlay.closeAll();
    disposeLevel();
    Meta.clearSave();
    meta = Meta.createState();
    Meta.save(meta);
    journalLevels = null;
    cityBuilding = null;
    liveKey = null;
    timeScale = 1;
    paintTempo();
    campaign = MB.createCampaign();
    Meta.configureNewCampaign(meta, campaign, 'campaign', 0, null);
    campaign.freePurchases = document.getElementById('free-purchases').checked;
    world = MB.startLevel(campaign);
    campaign.status = 'title';
    world.events.length = 0;
    document.body.classList.remove('playing');
    openScreen('build', { silent: true });
    buildLevelView();
    paintHud();
    syncCity();
    showTitle();
  }

  // «Начать заказ заново» restarts the run on screen with its own mode and payload.
  function restartRun() {
    if (campaign.runMode === 'school') return;
    requestRun({ mode: campaign.runMode, levelIndex: campaign.levelIndex, payload: campaign.runPayload, reason: 'restart' });
  }

  function confirmRestart() {
    if (!world || campaign.status === 'title') return;
    UI.overlay.open({
      id: 'confirm-restart',
      kicker: siteKicker(campaign.runMode, campaign.levelIndex),
      title: 'Начать заказ заново?',
      body: '<p>Прогресс этой стройки и купленные прокачки пропадут.</p>',
      actions: [
        { label: 'Начать заново', primary: true, danger: true, onClick: restartRun },
        { label: 'Отмена' },
      ],
    });
  }

  function confirmReset() {
    UI.overlay.open({
      id: 'confirm-reset',
      kicker: 'Опасная зона',
      title: 'Сбросить всю компанию?',
      body: '<p>Удалятся все стройки, офис, бригадиры, валюты и штаб. Отменить нельзя.</p>',
      actions: [
        { label: 'Удерживайте, чтобы сбросить', primary: true, danger: true, hold: 1500, onClick: resetCompany },
        { label: 'Отмена' },
      ],
    });
  }

  // Dropping a side order from the menu (a contract can be left only this way).
  function confirmAbandon() {
    const side = Meta.site(meta, 'side');
    if (!side || side.status !== 'play') return;
    const contract = side.runMode === 'contract';
    const school = side.runMode === 'school';
    UI.overlay.open({
      id: 'confirm-abandon',
      kicker: school ? 'Школа бригадиров' : contract ? 'Контракт ' + (meta.contract.index + 1) : 'Заказ биржи',
      title: school ? 'Бросить испытание?' : contract ? 'Бросить контракт?' : 'Бросить заказ биржи?',
      body: school ? '<p>Попытка потрачена. Полученный опыт сохраняется.</p>' : contract
        ? '<p>Прогресс пропадёт, перезарядка 5 мин.</p>'
        : '<p>Прогресс этой стройки пропадёт. Заказ останется на бирже.</p>',
      actions: [
        { label: school ? 'Бросить испытание' : contract ? 'Бросить контракт' : 'Бросить заказ', primary: true, danger: true, onClick: abandonSide },
        { label: 'Отмена' },
      ],
    });
  }

  function abandonSide() {
    const side = Meta.site(meta, 'side');
    if (!side) return;
    journalNote('abandon', journalRun(side));
    if (side.runMode === 'school') Meta.failSchoolTrial(meta);
    else if (side.runMode === 'contract') Meta.failContract(meta);
    else Meta.clearSite(meta, 'side');
    if (liveKey === 'side') {
      liveKey = null;
      switchSite(Meta.activeSite(meta), { toHq: !Meta.site(meta, Meta.activeSite(meta)) });
    } else {
      renderMetaScreen();
    }
  }

  function sessionUpgradeOpen(kind) {
    const button = document.getElementById('up-' + kind);
    return upgradeLineOpen(kind, button.dataset.group);
  }

  function upgradeLineOpen(kind, group) {
    if (taxiTooLow(kind)) return false;
    if (campaign.devGroups.all === true || campaign.devGroups[group] === true) return true;
    // Behind a pass not opened with tokens yet.
    if (MB.lineGated(campaign, kind)) return false;
    if (DRONE_GATED_GROUPS.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return false;
    return Meta.sessionLineOpen(meta, kind);
  }

  // «Аэротакси» waits for the building to stand MB.TAXI_FLOORS floors high (logic.js → buyUpgrade).
  function taxiTooLow(kind) {
    return kind === 'elevators' && !!world && !(campaign.purchases.elevators > 0) && MB.taxiFloorsShort(world) > 0;
  }

  function buy(kind) {
    if (!world || campaign.status !== 'play') return false;
    if (!sessionUpgradeOpen(kind)) return false;
    // The graph: a line opens once its parent has a level.
    const parent = window.MicroBuildersUpgradeGraph.parent(kind);
    if (parent && campaign.purchases[parent] < 1 && campaign.devGroups.all !== true) return false;
    const bought = MB.buyUpgrade(campaign, world, kind);
    if (!bought) return false;
    logBuy(kind);
    meta.journal.siteBuys = (meta.journal.siteBuys || 0) + 1;
    if (meta.journal.siteBuys === 1) journalNote('first-buy', Object.assign(journalRun(campaign), { kind: kind }));
    tone(kind === 'builders' ? 520 : 680, 0.09);
    // The purchase's own events go through the normal dispatch instead of the bin: new workers and
    // machines, elevators, the «Счастливчик» toast and the 'upgrade' feedback on the card.
    consumeEvents();
    refreshSimEstimate();
    paintHud();
    return true;
  }

  // The player's purchases of this site in their order (saved with it): the next story order offers
  // to repeat them («Как в прошлый раз», meta.lastBuys).
  function logBuy(kind) {
    (campaign.buyLog || (campaign.buyLog = [])).push(kind);
  }

  // «Как в прошлый раз · 4»: the next purchases of the previous story order (meta.lastBuys) that the
  // coins pay for now, in that order. Offered while this site follows that order; another purchase
  // ends it.
  function repeatQueue() {
    const last = meta.lastBuys || [];
    const log = campaign.buyLog || [];
    if (!world || campaign.runMode !== 'campaign' || campaign.status !== 'play' || campaign.repeatOff || log.length >= last.length) return [];
    for (let i = 0; i < log.length; i++) if (log[i] !== last[i]) return [];
    const session = window.MicroBuildersBalance.session;
    const levels = {};
    const queue = [];
    let coins = campaign.coins;
    for (let i = log.length; i < last.length; i++) {
      const kind = last[i];
      if (!session[kind] || !document.getElementById('up-' + kind) || !sessionUpgradeOpen(kind) || MB.lineGated(campaign, kind)) break;
      const parent = window.MicroBuildersUpgradeGraph.parent(kind);
      if (parent && !(campaign.purchases[parent] > 0) && queue.indexOf(parent) < 0) break;
      const level = levels[kind] !== undefined ? levels[kind] : campaign.purchases[kind];
      if (level >= session[kind].max) break;
      const cost = campaign.freePurchases ? 0 : MB.upgradeCost(kind, level, campaign);
      if (cost > coins) break;
      coins -= cost;
      levels[kind] = level + 1;
      queue.push(kind);
    }
    return queue;
  }

  function paintRepeatBuys() {
    const button = document.getElementById('repeat-buys');
    const count = repeatQueue().length;
    if (button.hidden === count > 0) button.hidden = count === 0;
    const text = 'Как в прошлый раз · ' + count;
    if (count > 0 && button.textContent !== text) button.textContent = text;
  }

  document.getElementById('repeat-buys').addEventListener('click', function () {
    const queue = repeatQueue();
    let bought = 0;
    for (let i = 0; i < queue.length; i++) {
      if (!MB.buyUpgrade(campaign, world, queue[i])) break;
      logBuy(queue[i]);
      bought += 1;
    }
    if (bought === 0) {
      // MB.buyUpgrade refused what repeatQueue let through: no offer on this site any more.
      campaign.repeatOff = true;
      paintRepeatBuys();
      return;
    }
    tone(680, 0.09);
    consumeEvents();
    refreshSimEstimate();
    hudDirty = true;
    paintHud();
    UI.toast({ text: 'Как в прошлый раз: ' + bought + ' ' + UI.plural(bought, 'покупка', 'покупки', 'покупок'), icon: 'build', tone: 'good', key: 'repeat-buys' });
  });

  // A tap on a card buys it or says why not: the card shakes, «Не хватает 1,2 тыс».
  function siteUpgradeCapped(kind) {
    return (kind === 'kitchen' && MB.kitchenCapped(campaign)) || (kind === 'sales' && MB.salesCapped(campaign)) ||
      ((kind === 'dorm' || kind === 'lounge' || kind === 'light') && MB.campCapped(campaign, kind));
  }

  function capText(kind) {
    const text = CAP_TEXTS[kind] || CAP_TEXTS.kitchen;
    return 'Нужен Центр персонала · «' + text[1] + '»';
  }

  function tapUpgrade(kind) {
    if (buy(kind)) return;
    const button = document.getElementById('up-' + kind);
    if (CAP_TEXTS[kind] && world && sessionUpgradeOpen(kind) && siteUpgradeCapped(kind) &&
        campaign.purchases[kind] < window.MicroBuildersBalance.session[kind].max) {
      shake(button);
      UI.toast({ text: capText(kind), icon: 'lock', key: kind + '-cap', duration: 2600 });
      return;
    }
    if (button.classList.contains('locked') && !sessionUpgradeOpen(kind)) {
      // A locked card (paintLockedUpgrade) names the office node that opens it.
      shake(button);
      UI.toast({ text: button.title, icon: 'lock', key: 'upgrade-locked', duration: 2400 });
      return;
    }
    if (!world || campaign.status !== 'play' || !sessionUpgradeOpen(kind)) return;
    shake(button);
    if (campaign.purchases[kind] >= window.MicroBuildersBalance.session[kind].max) {
      UI.toast({ text: upgradeName(kind) + ': максимальный уровень', icon: 'lock', key: 'upgrade-max', duration: 1600 });
      return;
    }
    const cost = MB.upgradeCost(kind, campaign.purchases[kind], campaign);
    if (campaign.coins < cost) coinsShort(cost);
  }

  // Not enough site coins: «Не хватает 1,2 тыс» and the coin counter blinks red.
  function coinsShort(cost) {
    UI.toast({ text: 'Не хватает ' + formatShort(cost - campaign.coins), icon: 'icons/icon-coins.jpg?v=2', tone: 'warn', key: 'upgrade-short', duration: 1600 });
    const coins = document.getElementById('coins');
    coins.classList.add('short');
    clearTimeout(coins.shortTimer);
    coins.shortTimer = setTimeout(function () { coins.classList.remove('short'); }, 600);
  }

  function shake(el) {
    if (!el || !el.animate) return;
    el.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' },
    ], { duration: 320, easing: 'ease-out' });
  }

  function frame() {
    requestAnimationFrame(frame);
    const wallDt = clock.getDelta();
    const realDt = Math.min(wallDt, 0.05);
    tickCityBuild(realDt);
    // Presence rule: the site lives only while the player looks at it (the build screen, page on screen).
    const present = currentScreen === 'build' && document.visibilityState !== 'hidden';
    if (world && campaign.status === 'play' && present && !BuildPatternEditor.opened) {
      const simulationStarted = performance.now();
      const worldStarted = performance.now();
      MB.beginFrame(world);
      const elapsedBefore = campaign.levelElapsed;
      const totalBefore = campaign.totalElapsed;
      let budget = realDt * timeScale;
      if (timedMode(campaign.runMode)) budget = Math.min(budget, Math.max(0, trialLimit(campaign) - elapsedBefore));
      let guard = 0;
      while (budget > 0 && guard < 40) {
        const slice = Math.min(budget, 0.05);
        MB.stepWorld(world, slice);
        budget -= slice;
        guard += 1;
      }
      const environment = Meta.applyEnvironment(meta, campaign);
      applyEnvironmentView(environment);
      if (campaign.runMode === 'school') {
        // The playtest tempo advances the trial clock with construction; a slow frame still
        // spends real time. Accelerating workers alone must not make a timed tier easier.
        const elapsed = Math.min(Math.max(wallDt, campaign.levelElapsed - elapsedBefore), Math.max(0, trialLimit(campaign) - elapsedBefore));
        campaign.levelElapsed = elapsedBefore + elapsed;
        campaign.totalElapsed = totalBefore + elapsed;
      }
      MicroBuildersProfiler.add('worldStep', performance.now() - worldStarted);
      const eventsStarted = performance.now();
      consumeEvents();
      if (timedMode(campaign.runMode) && campaign.status === 'play' && campaign.levelElapsed >= trialLimit(campaign)) failLiveContract();
      MicroBuildersProfiler.add('eventView', performance.now() - eventsStarted);
      MicroBuildersProfiler.add('simulation', performance.now() - simulationStarted);
      MicroBuildersProfiler.add('scheduler', world.metrics.scheduler);
      MicroBuildersProfiler.add('path', world.metrics.path);
      MicroBuildersProfiler.add('scaffoldSearch', world.metrics.scaffoldSearch);
      MicroBuildersProfiler.count('assignments', world.metrics.assignments);
      MicroBuildersProfiler.count('pathSearches', world.metrics.pathSearches);
      MicroBuildersProfiler.count('aStarSearches', world.metrics.aStarSearches);
      MicroBuildersProfiler.count('scaffoldExpansions', world.metrics.scaffoldExpansions);
      MicroBuildersProfiler.count('invalidations', world.metrics.invalidations);
      if (world.metrics.aStarPeak) MicroBuildersProfiler.astar(world.metrics.aStarPeak);
      snapshotElapsed += realDt;
      if (snapshotElapsed >= 5 && campaign.status === 'play') {
        snapshotElapsed = 0;
        saveLive({ awaySince: null });
      }
    }
    if (contractRunning() && campaign.runMode === 'school' && present && BuildPatternEditor.opened) {
      campaign.levelElapsed += wallDt;
      campaign.totalElapsed += wallDt;
      if (campaign.levelElapsed >= trialLimit(campaign)) failLiveContract();
    }
    const time = clock.elapsedTime;
    let viewStarted = performance.now();
    updatePours();
    updateLightningFx(realDt);
    if (timeScale !== 20) {
      updatePops(realDt);
      updateSparks(realDt);
      updateCallRings(realDt);
      updateFlyCubes(realDt);
      ghostMaterials.forEach(function (material) {
        material.opacity = 0.24 + Math.sin(time * 2.2) * 0.04;
      });
    }
    updateGhosts();
    MicroBuildersProfiler.add('effectsView', performance.now() - viewStarted);
    viewStarted = performance.now();
    updateSticks(time, realDt);
    updateVehicles(realDt);
    MicroBuildersProfiler.add('workersView', performance.now() - viewStarted);
    viewStarted = performance.now();
    updateWorkerPlan(time);
    MicroBuildersProfiler.add('planView', performance.now() - viewStarted);
    viewStarted = performance.now();
    if (timeScale !== 20) {
      updateFeatures(realDt, time);
    }
    MicroBuildersProfiler.add('featuresView', performance.now() - viewStarted);
    viewStarted = performance.now();
    cameraController.update(realDt, campaign ? campaign.status : '');
    applyShake(realDt);
    updateGlint(realDt);
    updateAudio(realDt);
    if (cityRoot.visible) placeCitySigns();
    updateCampViews(time);
    updateCollapses(realDt);
    updateMastLights();
    placeCampSigns();
    updateWorkerXray(realDt);
    updateWorldFx(realDt);
    updateSky(realDt, time);
    const night = skyView.look ? skyView.look.stars : 0;
    // Особые блоки (art/features.js): окна загораются с сумерками; детали — общие InstancedMesh, и на ×20 тоже.
    Features.night(featureState, Math.min(1, night * 1.5));
    Features.sync(featureState);
    machineMat.light.emissiveIntensity = 0.6 + 1.6 * night;
    MicroBuildersProps.update(realDt, night, world ? world.level.number : 0, !!campaign && campaign.status === 'play');
    MicroBuildersVehicles.night(night);
    // Жизнь карьера (art/ambient.js): вихри пыли, следы ботинок и шин, камешки с террас.
    if (world && currentScreen === 'build' && !cityRoot.visible) {
      ambientEnv.wet = weatherView.wet;
      ambientEnv.dust = weatherView.heat;
      ambientEnv.night = night;
      MicroBuildersAmbient.update(realDt, world, groundPose, timeScale, ambientEnv);
    }
    MicroBuildersProfiler.add('cameraView', performance.now() - viewStarted);
    fitShadow();
    const renderStarted = performance.now();
    renderScene(night);
    renderHaze(time);
    watchQuality(wallDt);
    MicroBuildersProfiler.add('render', performance.now() - renderStarted);
    MicroBuildersProfiler.count('drawCalls', renderer.info.render.calls);
    MicroBuildersProfiler.count('triangles', renderer.info.render.triangles);
    tickHudFx(realDt);
    tickJournal(wallDt);
    hudElapsed += realDt;
    simElapsed += realDt;
    if (world && simElapsed >= SIM_REFRESH_SECONDS) refreshSimEstimate();
    if (campaign && campaign.status !== 'title' && hudElapsed >= 0.25) {
      hudElapsed = 0;
      const hudStarted = performance.now();
      paintHud(true);
      paintDayPop();
      paintLevelInfo();
      MicroBuildersWorkerLog.paint(world, selectedBuilder);
      paintWorkerCard();
      paintCampSigns();
      refreshCampSheet();
      paintCameraButton();
      refreshCity();
      refreshPanel();
      MicroBuildersProfiler.add('hudView', performance.now() - hudStarted);
    }
  }

  function consumeEvents() {
    const events = world.events;
    let scaffoldRefreshNeeded = false;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.capital) meta.capital += event.capital;
      if (event.type === 'pour') onPour(event);
      if (event.type === 'place' || event.type === 'vehiclePlaceBatch' || event.type === 'autofill' ||
        event.type === 'retrofitDoor' || event.type === 'lightning' || event.type === 'campCube') aoDirty = true;
      if (event.type === 'campCube') onCampCube(event);
      if (event.type === 'campReform') onCampReform(event);
      if (event.type === 'campReady') onCampReady(event);
      if (event.type === 'canteenFull') onCanteenFull();
      if (event.type === 'loungeFull') onLoungeFull();
      if (event.type === 'salesPay') onSalesPay(event);
      if (event.type === 'smokeCall') onSmokeCall(event);
      if (event.type === 'rankUp') onRankUp(event);
      if (event.type === 'snack') onSnack(event);
      if (event.type === 'torte') onTorte();
      if (event.type === 'kitchen') UI.toast({ text: 'Кухня ' + event.level + '-го уровня: рабочие ушли на кухню', icon: 'icons/icon-kitchen.jpg', tone: 'good', key: 'kitchen' });
      if (event.type === 'chefLevel') UI.toast({ text: 'Шеф-повар ' + event.level + '-го уровня: блюда сильнее', icon: 'icons/icon-cook-hat.jpg', tone: 'good', key: 'chef-level' });
      if (event.type === 'secretDish') {
        Meta.discoverDish(meta, event.dish);
        tone(990, 0.2);
        UI.toast({ text: 'Шеф открыл секретное блюдо: ' + dishTitle(event.dish) + '!', icon: 'icons/icon-dish-' + event.dish + '.jpg', tone: 'good', key: 'secret-' + event.dish, duration: 3600 });
      }
      if (event.type === 'grandDinner') UI.toast({ text: 'Гранд-обед №' + event.count + ': вся бригада идёт обедать. ' + dishTitle(event.dish) + ' — ' +
        (GRAND_EFFECTS[MB.DISH[event.dish].effect] || '') + ' +' + Math.round(MB.DISH[event.dish].value * 100) + '% до сдачи', icon: 'icons/icon-grand-dinner.jpg', tone: 'good', key: 'grand-dinner', duration: 3200 });
      if (event.type === 'place') {
        // «Учебный центр»: a whole cube a worker set himself — 1 experience to the centre.
        if (!event.drone) Meta.addTrainingXp(meta, 1);
        const placed = Meta.onBlocksPlaced(meta, campaign, world, [event.block]);
        showPlacementRewards(placed);
        floatFinds(placed.finds);
        if (onPlace(event)) scaffoldRefreshNeeded = true;
        noteBuiltTop([event.block]);
      }
      if (event.type === 'vehiclePlaceBatch') {
        const placed = Meta.onBlocksPlaced(meta, campaign, world, event.blocks);
        showPlacementRewards(placed);
        floatFinds(placed.finds);
        if (onVehiclePlaceBatch(event)) scaffoldRefreshNeeded = true;
        noteBuiltTop(event.blocks);
      }
      if (event.type === 'plan' || event.type === 'trip' || event.type === 'tripDone' || event.type === 'abandon') {
        onWorkerEvent(event);
      }
      if (event.type === 'foreman' && event.block) floatForeman(event);
      if (event.type === 'autofill') {
        showPlacementRewards({ expertise: Meta.gainForemanExperience(meta, campaign, world, event.blocks, false) });
        onAutofill(event);
        noteBuiltTop(event.blocks);
      }
      if (event.type === 'foreman') onForemanEvent(event);
      if (event.type === 'upgrade') onUpgradeEvent(event);
      if (event.type === 'retrofitDoor') onRetrofitDoor(event);
      if (event.type === 'scaffold') {
        onScaffold(event);
        if (scaffoldLookup.has(event.ids[0])) {
          revealScaffold(event.ids[0]);
          paintScaffoldWear(event.ids[0]);
        } else {
          scaffoldRefreshNeeded = true;
        }
      }
      if (event.type === 'scaffoldWear') {
        onScaffoldWear(event);
        if (scaffoldLookup.has(event.id)) paintScaffoldWear(event.id);
        else scaffoldRefreshNeeded = true;
      }
      if (event.type === 'strip') scaffoldRefreshNeeded = true;
      if (event.type === 'lightning') {
        onLightning(event);
        scaffoldRefreshNeeded = true;
      }
      if (event.type === 'spawn') syncSticks();
      if (event.type === 'spawnVehicle') syncVehicles();
      if (event.type === 'taxis') syncTaxis();
      if (event.type === 'taxiCall') tone(880, 0.05);
      if (event.type === 'yardOpen') openYard(event);
      if (event.type === 'yardDeck') addYardBoard(event);
      if (event.type === 'yardCube') addYardCube(event);
      if (event.type === 'yardRigClear') clearYardRig(event.vehicle);
      if (event.type === 'yardClear') clearYard(event.vehicle);
      if (event.type === 'blocked') {
        // A stalled school site still spends real time and keeps its attempt.
        if (campaign.runMode === 'school') campaign.status = 'play';
        openBlocked(event);
      }
      if (event.type === 'complete') onLiveComplete();
    }
    if (scaffoldRefreshNeeded) refreshScaffoldView();
    if (aoDirty) refreshBlockAo();
    events.length = 0;
    flushScaffold();
  }

  // Foreman triggers: a toast with the portrait in the lane (the same trigger again adds «×N») and
  // the card's avatar in the level strip flashes. «Золотой куб!» and «Джекпот ×10!» get the big
  // popup instead. The golden cube's capital find is granted here whether or not anything shows.
  function onForemanEvent(event) {
    // The same effect bought in the office (office lines with a `trigger`): the line's name and icon.
    const office = event.office && Meta.OFFICE[event.office];
    const card = office ? { name: office.name, rarity: 'office' } : Meta.CARDS[event.card];
    const found = event.card === 'golden' ? Meta.goldenFind(meta, event.block, campaign, event.findMultiplier) : 0;
    if (found > 0) floatCapital(event.block.x + 0.5, event.block.y + 1.1, event.block.z + 0.5, found);
    // A trigger can change what the cards read (the recruiter's extra worker: «1 → 2»).
    hudDirty = true;
    pulseCrew(event.card);
    if (event.card === 'golden' || event.jackpot) {
      showLuckyPop(event, found);
      return;
    }
    let text = '';
    let key = 'foreman:' + event.card;
    if (event.card === 'recruiter') text = '+1 рабочий до конца заказа';
    else if (event.card === 'mechanic') text = '+1 дрон до конца заказа';
    else if (event.card === 'contractor') text = 'Подарок: ' + upgradeName(event.kind) + ' +1';
    else if (event.card === 'lucky' || event.card === 'banker') text = 'Бесплатно: ' + upgradeName(event.kind);
    else if (event.card === 'surveyor') text = 'Этаж готов — бригада +' + Math.round(event.stack * 100) + '% до конца заказа';
    else if (event.card === 'crane') text = 'Кран поставил ' + event.count + ' ' + UI.plural(event.count, 'куб', 'куба', 'кубов');
    if (!text) return;
    // A free or gifted level flashes on its own card («Бесплатно!» / «Подарок!», onUpgradeEvent)
    // and the portrait in the strip flashes: a toast saying the same is only for a card off screen.
    if (event.kind && dockCardShown(event.kind)) return;
    if (event.kind) key += ':' + event.kind;
    UI.toast({
      title: card.name,
      text: text,
      icon: office ? 'icons/' + officeIcon(event.office) : 'icons/icon-foreman-' + event.card + '.jpg?v=3',
      className: 'toast-foreman rarity-' + card.rarity,
      tone: event.free ? 'good' : 'info',
      key: key,
    });
  }

  // A dock card the player can see right now: its tab is open and it is scrolled into the dock.
  function dockCardShown(kind) {
    const button = document.getElementById('up-' + kind);
    const body = document.body.classList;
    if (!button || button.hidden || currentScreen !== 'build' || body.contains('interface-hidden') || body.contains('has-modal')) return false;
    if (!button.closest('.upgrade-group.active')) return false;
    const box = button.getBoundingClientRect();
    const dock = document.getElementById('upgrade-dock').getBoundingClientRect();
    return box.width > 0 && box.right > dock.left + 8 && box.left < dock.right - 8;
  }

  function upgradeName(kind) {
    let name = kind;
    (window.MicroBuildersUpgradeGroups || []).forEach(function (group) {
      group.items.forEach(function (item) { if (item[0] === kind) name = item[1]; });
    });
    return name;
  }

  // «Золотой куб!» / «Джекпот ×10!»: a big popup with the portrait for 1.6 s; more of the same
  // meanwhile add up («Золотой куб ×2!»). At ×20 (no visuals) a gold toast says it instead.
  function showLuckyPop(event, found) {
    const card = Meta.CARDS[event.card];
    const key = event.jackpot ? 'jackpot' : 'golden';
    if (timeScale === 20 || currentScreen !== 'build') {
      UI.toast({
        title: event.jackpot ? 'Джекпот ×' + foremanValueText('number', event.jackpotMultiplier || 10) : 'Золотой куб',
        text: luckyText(event.gained, found),
        icon: 'icons/icon-foreman-' + event.card + '.jpg?v=3',
        className: 'toast-foreman rarity-' + card.rarity,
        tone: 'gold',
        priority: 2,
        key: 'lucky-' + key,
      });
      return;
    }
    const pop = document.getElementById('lucky-pop');
    const fresh = !luckyPop || luckyPop.key !== key || pop.hidden;
    if (fresh) {
      if (luckyPop) clearTimeout(luckyPop.timer);
      luckyPop = { key: key, count: 0, coins: 0, capital: 0, timer: 0 };
    }
    luckyPop.count += 1;
    luckyPop.coins += event.gained || 0;
    luckyPop.capital += found;
    document.getElementById('lucky-pop-img').src = 'icons/icon-foreman-' + event.card + '.jpg?v=3';
    document.getElementById('lucky-pop-title').textContent = event.jackpot
      ? 'Джекпот ×' + foremanValueText('number', event.jackpotMultiplier || 10) + '!'
      : (luckyPop.count > 1 ? 'Золотой куб ×' + luckyPop.count + '!' : 'Золотой куб!');
    document.getElementById('lucky-pop-text').textContent =
      (event.jackpot && luckyPop.count > 1 ? luckyPop.count + ' раза: ' : '') + luckyText(luckyPop.coins, luckyPop.capital);
    pop.hidden = false;
    if (pop.animate) {
      pop.animate([
        { transform: 'scale(' + (fresh ? 0.55 : 1.12) + ')', opacity: fresh ? 0 : 1 },
        { transform: 'scale(1.06)', opacity: 1, offset: 0.6 },
        { transform: 'scale(1)', opacity: 1 },
      ], { duration: 320, easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)' });
    }
    if (timeScale === 1) {
      tone(880, 0.07);
      setTimeout(function () { tone(1320, 0.12); }, 90);
    }
    clearTimeout(luckyPop.timer);
    luckyPop.timer = setTimeout(hideLuckyPop, 1600);
  }

  function luckyText(coins, capital) {
    const parts = [];
    if (coins > 0) parts.push('+' + formatShort(coins) + ' монет');
    if (capital > 0) parts.push('Находка +' + capital + ' капитала');
    return parts.join(' · ');
  }

  function hideLuckyPop() {
    const pop = document.getElementById('lucky-pop');
    luckyPop = null;
    if (!pop.animate) {
      pop.hidden = true;
      return;
    }
    pop.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(0.96)' }], { duration: 220 })
      .onfinish = function () { if (!luckyPop) pop.hidden = true; };
  }

  function onPour(event) {
    const record = ensurePour(event.block);
    setPourScale(record, event.block, event.index, 1);
    // A worker's cube pays per mini-cube; its «+N» floats once the whole cube is set (onPlace).
    if (event.gained > 0) {
      const sum = cubeCoins.get(event.block.id) || { coins: 0, lucky: 0, multiplier: 0 };
      sum.coins += event.gained;
      if (event.lucky) {
        sum.lucky += 1;
        sum.multiplier = event.luckyMultiplier;
      }
      cubeCoins.set(event.block.id, sum);
    }
    if (event.capitalCoin) noteCapitalCoin(event.builder);
    if (timeScale !== 20 && event.gained > 0) pulseCoins();
  }

  function onPlace(event) {
    clearPour(event.block.id);
    setBlockVisualScale(blockViews.get(event.block.id), 1, 0.001);
    popBlock(event.block.id);
    if (event.drone) floatDronePlace(event);
    const sum = cubeCoins.get(event.block.id);
    if (sum) {
      cubeCoins.delete(event.block.id);
      const b = event.block;
      if (sum.lucky > 0) floatLucky(b.x + 0.5, b.y + 1.1, b.z + 0.5, sum.multiplier, sum.coins);
      else floatWorldCoins(b.x + 0.5, b.y + 1.1, b.z + 0.5, sum.coins);
    }
    land(event.block);
    const scaffoldChanged = hasAdjacentDeck(event.block);
    if (timeScale !== 20 && event.gained > 0) pulseCoins();
    return scaffoldChanged;
  }

  // Касание блока: кольцо пыли и по классу материала (art/fx.js kind) крошка, искры или блик; на ×5 только пыль.
  // Стук — по материалу (sfx 'place:<класс>').
  function land(block) {
    if (timeScale === 20) return;
    const kind = MicroBuildersFx.kind(block);
    if (timeScale < 5) fx.place(kind, block.x + 0.5, block.y, block.z + 0.5, MB.MATERIAL[block.materialId].color);
    else fx.dust(block.x + 0.5, block.y, block.z + 0.5);
    sfx('place:' + kind, block.materialId);
  }

  function onVehiclePlaceBatch(event) {
    let x = 0;
    let y = 0;
    let z = 0;
    let scaffoldChanged = false;
    for (let i = 0; i < event.blocks.length; i++) {
      const block = event.blocks[i];
      clearPour(block.id);
      setBlockVisualScale(blockViews.get(block.id), 1, 0.001);
      popBlock(block.id);
      x += block.x + 0.5;
      y += block.y + 0.5;
      z += block.z + 0.5;
      if (hasAdjacentDeck(block)) scaffoldChanged = true;
    }
    floatVehicleBatch(event, x / event.blocks.length, y / event.blocks.length, z / event.blocks.length);
    if (timeScale !== 20) {
      const count = event.blocks.length;
      burst(
        x / count,
        y / count,
        z / count,
        MB.MATERIAL[event.blocks[0].materialId].color,
        12
      );
    }
    if (timeScale === 1) tone(230, 0.08);
    if (timeScale !== 20 && event.gained > 0) pulseCoins();
    return scaffoldChanged;
  }

  function hasAdjacentDeck(block) {
    const floors = [block.y, block.y + 1];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let floor = 0; floor < floors.length; floor++) {
      for (let i = 0; i < dirs.length; i++) {
        const x = block.x + dirs[i][0];
        const z = block.z + dirs[i][1];
        if (!world.index.inside(x, floors[floor], z)) continue;
        if (world.deckGrid[world.index.id(x, floors[floor], z)] !== 1) continue;
        return true;
      }
    }
    return false;
  }

  function onAutofill(event) {
    for (let i = 0; i < event.blocks.length; i++) {
      clearPour(event.blocks[i].id);
      const record = blockViews.get(event.blocks[i].id);
      setBlockVisualScale(record, 1, 0.001);
    }
  }

  // What a feature sees in a cell (window frames join their neighbours): a window's glass cube
  // stands for its cell, otherwise the cube there.
  function featureBlockAt(x, y, z) {
    const key = MB.cellKey(x, y, z);
    return world.glassByKey.get(key) || world.blockByKey.get(key);
  }

  function onRetrofitDoor(event) {
    const block = event.block;
    const record = blockViews.get(block.id);
    setBlockVisualScale(record, 0.001, 0.001);
    const feature = Features.build(block, {
      parent: levelRoot,
      getBlock: featureBlockAt,
      blocks: world.blocks,
    }, featureState);
    feature.scale.setScalar(1);
    record.feature = feature;
  }

  function hexColor(color) {
    return '#' + color.toString(16).padStart(6, '0');
  }

  function shade(color, amount) {
    const r = Math.round(((color >> 16) & 255) * amount);
    const g = Math.round(((color >> 8) & 255) * amount);
    const b = Math.round((color & 255) * amount);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function materialTexture(spec) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const look = spec.look;
    context.fillStyle = hexColor(spec.color);
    context.fillRect(0, 0, 128, 128);
    if (spec.grid === 1 && !spec.accent) {
      for (let i = 0; i < 24; i++) {
        context.fillStyle = shade(spec.color, i % 2 === 0 ? 0.94 : 1.06);
        context.fillRect((i * 41) % 128, (i * 23) % 128, 2, 2);
      }
    } else if (look === 'stone' || look === 'sand' || look === 'concrete') {
      for (let i = 0; i < (look === 'concrete' ? 420 : 180); i++) {
        context.fillStyle = i % 3 === 0 ? shade(spec.color, 0.72) : shade(spec.color, 1.18);
        const size = look === 'sand' ? 2 : 3 + (i % 4);
        context.fillRect((i * 37) % 128, (i * 19) % 128, size, size);
      }
    } else if (look === 'wood') {
      for (let y = 0; y < 128; y += 7) {
        context.fillStyle = y % 14 === 0 ? shade(spec.color, 0.72) : shade(spec.color, 1.12);
        context.fillRect(0, y, 128, 3);
      }
      context.strokeStyle = shade(spec.color, 0.55);
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(28, 0);
      context.bezierCurveTo(40, 40, 18, 80, 34, 128);
      context.stroke();
    } else if (look === 'brick') {
      context.fillStyle = shade(spec.color, 0.55);
      context.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 4; row++) {
        const offset = row % 2 === 0 ? 0 : 32;
        for (let col = -1; col < 3; col++) {
          context.fillStyle = row % 2 === 0 ? hexColor(spec.color) : shade(spec.color, 0.9);
          context.fillRect(col * 64 + offset + 3, row * 32 + 3, 58, 26);
        }
      }
    } else if (look === 'metal' || look === 'platinum') {
      for (let i = 0; i < 18; i++) {
        context.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(0, i * 8);
        context.lineTo(128, i * 8 - 24);
        context.stroke();
      }
    } else if (look === 'marble') {
      context.strokeStyle = shade(spec.color, 0.62);
      context.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        context.beginPath();
        context.moveTo(-10, 20 + i * 22);
        context.bezierCurveTo(30, 10 + i * 18, 70, 50 + i * 12, 140, 16 + i * 20);
        context.stroke();
      }
    } else if (look === 'gem') {
      for (let i = 0; i < 7; i++) {
        context.fillStyle = i % 2 === 0 ? shade(spec.color, 1.25) : shade(spec.color, 0.65);
        context.beginPath();
        context.ellipse(20 + (i * 17) % 100, 24 + (i * 29) % 90, 18, 10, i, 0, Math.PI * 2);
        context.fill();
      }
    } else if (look === 'obsidian') {
      context.strokeStyle = 'rgba(210, 180, 255, 0.55)';
      context.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        context.beginPath();
        context.moveTo(10 + i * 18, 0);
        context.lineTo(40 + i * 12, 128);
        context.stroke();
      }
    } else if (look === 'diamond') {
      paintDiamond(context, spec);
    } else if (look === 'tile') {
      // Glazed tiles: 4 × 4 with light grout and a glint on each.
      context.fillStyle = shade(spec.color, 0.62);
      context.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          context.fillStyle = (x + y) % 2 === 0 ? hexColor(spec.color) : shade(spec.color, 0.9);
          context.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
          context.fillStyle = 'rgba(255,255,255,0.28)';
          context.fillRect(x * 32 + 5, y * 32 + 5, 10, 3);
        }
      }
    } else if (look === 'crystal') {
      // A cut gem: facets of its colour, lighter and darker, with white edges.
      for (let i = 0; i < 9; i++) {
        const size = 34 + (i % 3) * 12;
        paintFacet(context, (i * 41) % 112 - 8, (i * 29) % 112 - 8, size,
          i % 2 === 0 ? shade(spec.color, 1.35) : shade(spec.color, 0.7), 'rgba(255,255,255,0.7)');
      }
      paintFacet(context, 34, 34, 60, shade(spec.color, 1.15), 'rgba(255,255,255,0.95)');
    } else if (look === 'lapis') {
      // Deep blue with pyrite flecks and pale veins.
      context.strokeStyle = shade(spec.color, 1.45);
      context.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        context.beginPath();
        context.moveTo(-6, 30 + i * 36);
        context.bezierCurveTo(40, 10 + i * 40, 80, 60 + i * 20, 134, 24 + i * 38);
        context.stroke();
      }
      for (let i = 0; i < 40; i++) {
        context.fillStyle = i % 3 === 0 ? '#f5d76e' : '#d9b443';
        context.fillRect((i * 53) % 128, (i * 37) % 128, 2 + (i % 2), 2);
      }
    } else if (look === 'amber') {
      // Warm resin: a lighter heart, bubbles and a dark inclusion.
      const glow = context.createRadialGradient(64, 64, 6, 64, 64, 90);
      glow.addColorStop(0, shade(spec.color, 1.3));
      glow.addColorStop(1, shade(spec.color, 0.7));
      context.fillStyle = glow;
      context.fillRect(0, 0, 128, 128);
      context.fillStyle = 'rgba(255,240,200,0.45)';
      for (let i = 0; i < 9; i++) {
        context.beginPath();
        context.arc((i * 47) % 120 + 4, (i * 31) % 120 + 4, 2 + (i % 3), 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = shade(spec.color, 0.35);
      context.beginPath();
      context.ellipse(44, 80, 9, 4, 0.6, 0, Math.PI * 2);
      context.fill();
    } else if (look === 'opal') {
      // Play of colour: soft patches of pink, green, blue and violet.
      const fire = ['rgba(255,150,200,0.45)', 'rgba(120,240,190,0.45)', 'rgba(120,180,255,0.45)', 'rgba(200,140,255,0.45)', 'rgba(255,220,140,0.4)'];
      for (let i = 0; i < 14; i++) {
        context.fillStyle = fire[i % fire.length];
        context.beginPath();
        context.ellipse((i * 37) % 128, (i * 53) % 128, 16 + (i % 4) * 5, 9 + (i % 3) * 4, i, 0, Math.PI * 2);
        context.fill();
      }
    } else if (look === 'magma') {
      // Dark crust split by glowing cracks.
      context.fillStyle = '#2a1410';
      context.fillRect(0, 0, 128, 128);
      context.strokeStyle = hexColor(spec.color);
      context.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        context.beginPath();
        context.moveTo((i * 29) % 128, 0);
        context.lineTo((i * 29 + 30) % 128, 44);
        context.lineTo((i * 29 + 6) % 128, 88);
        context.lineTo((i * 29 + 40) % 128, 128);
        context.stroke();
      }
    } else if (look === 'cosmic') {
      // A star's heart: a bright core, rays and sparks.
      const core = context.createRadialGradient(64, 64, 4, 64, 64, 80);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.5, hexColor(spec.color));
      core.addColorStop(1, shade(spec.color, 0.6));
      context.fillStyle = core;
      context.fillRect(0, 0, 128, 128);
      context.strokeStyle = 'rgba(255,255,255,0.7)';
      context.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        context.beginPath();
        context.moveTo(64 + Math.cos(a) * 12, 64 + Math.sin(a) * 12);
        context.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62);
        context.stroke();
      }
      context.fillStyle = '#ffffff';
      for (let i = 0; i < 20; i++) context.fillRect((i * 61) % 128, (i * 43) % 128, 2, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function paintFacet(context, x, y, size, fill, stroke) {
    context.fillStyle = fill;
    context.strokeStyle = stroke;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + size / 2, y);
    context.lineTo(x + size, y + size / 2);
    context.lineTo(x + size / 2, y + size);
    context.lineTo(x, y + size / 2);
    context.closePath();
    context.fill();
    context.stroke();
  }

  function paintDiamond(context, spec) {
    const id = spec.id;
    if (id === 'ladder-diamond') {
      paintFacet(context, 16, 8, 96, 'rgba(255,255,255,0.72)', 'rgba(120, 210, 255, 0.95)');
      paintFacet(context, 36, 28, 56, 'rgba(186, 236, 255, 0.55)', 'rgba(255,255,255,0.9)');
    } else if (id === 'ladder-diamond-pure') {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          paintFacet(context, x * 16, y * 16, 16, (x + y) % 2 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(230,248,255,0.7)', 'rgba(255,255,255,0.95)');
        }
      }
    } else if (id === 'ladder-diamond-black') {
      context.fillStyle = '#12151a';
      context.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 5; i++) {
        paintFacet(context, 8 + i * 22, 18 + (i % 2) * 36, 28, 'rgba(40,48,58,0.9)', 'rgba(230,240,255,0.85)');
      }
    } else if (id === 'ladder-diamond-royal') {
      context.fillStyle = '#f2c14a';
      context.fillRect(0, 0, 128, 128);
      paintFacet(context, 8, 8, 112, 'rgba(255,248,220,0.55)', 'rgba(255,220,120,1)');
      paintFacet(context, 34, 34, 60, 'rgba(255,255,255,0.65)', 'rgba(255,196,64,1)');
    } else if (id === 'ladder-diamond-imperial') {
      context.fillStyle = '#c47a12';
      context.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 3; i++) {
        paintFacet(context, 6 + i * 38, 20, 40, 'rgba(255,214,120,0.75)', 'rgba(255,244,200,0.95)');
        paintFacet(context, 24 + i * 38, 68, 40, 'rgba(255,160,40,0.8)', 'rgba(255,236,180,0.95)');
      }
    } else {
      context.fillStyle = '#fffaf2';
      context.fillRect(0, 0, 128, 128);
      context.strokeStyle = 'rgba(255, 214, 120, 0.95)';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(64, 4);
      context.lineTo(64, 124);
      context.moveTo(4, 64);
      context.lineTo(124, 64);
      context.moveTo(18, 18);
      context.lineTo(110, 110);
      context.moveTo(110, 18);
      context.lineTo(18, 110);
      context.stroke();
      paintFacet(context, 40, 40, 48, 'rgba(255,255,255,0.8)', 'rgba(255, 196, 64, 1)');
    }
  }

  // Кубы вне здания (штабели, ноша, город, техника): фактура block-materials.js вдвое мельче, без затенения в стыках.
  // Призрак (ghost) — прежняя полупрозрачная заливка: ею рисуют только призраки зданий городка.
  function blockSurface(materialId, ghost) {
    const key = materialId + (ghost ? ':ghost' : '');
    if (blockSurfaceCache[key]) return blockSurfaceCache[key];
    if (!ghost) {
      blockSurfaceCache[key] = Blocks.material(materialId, 0, false, true);
      return blockSurfaceCache[key];
    }
    const spec = MB.MATERIAL[materialId];
    const finish = LOOK[spec.look];
    // Window glass is see-through blue in the pile, on the back and while it is being set.
    const glass = spec.look === 'glass';
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: materialTexture(spec),
      roughness: finish.roughness,
      metalness: finish.metalness,
      emissive: spec.glow !== undefined ? spec.glow : finish.emissive,
      emissiveIntensity: spec.glow !== undefined ? spec.glowStrength : finish.emissiveIntensity,
      transparent: ghost || glass,
      opacity: ghost ? 0.16 : glass ? 0.8 : 1,
      depthWrite: !ghost && !glass,
    });
    material.map.userData.shared = true;
    blockSurfaceCache[key] = material;
    return material;
  }

  let materialRow = null;

  function materialLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(20, 16, 12, 0.82)';
    context.fillRect(0, 8, 256, 48);
    context.fillStyle = '#f6efe4';
    context.font = '700 22px Manrope, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(1.6, 0.4, 1);
    return sprite;
  }

  function toggleMaterialRow() {
    const button = document.getElementById('material-row');
    if (materialRow) {
      scene.remove(materialRow);
      materialRow = null;
      button.textContent = 'Материалы';
      return;
    }
    const row = new THREE.Group();
    const ladder = MB.MATERIAL_LADDER;
    const footprint = world.level.footprint;
    const originX = footprint.minX;
    const originZ = footprint.maxZ + 8;
    // One row per grid, nearest first; accents (✦) at the end of their row.
    const placed = {};
    let widest = 0;
    let grids = 0;
    for (let i = 0; i < ladder.length; i++) {
      const spec = ladder[i];
      const at = placed[spec.grid] || 0;
      placed[spec.grid] = at + 1;
      widest = Math.max(widest, at + 1);
      grids = Math.max(grids, spec.grid);
      const z = originZ + (spec.grid - 1) * 3.2;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.96), blockSurface(spec.id, false));
      mesh.position.set(originX + at * 1.7 + 0.5, 1.2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const label = materialLabel((spec.accent ? '✦ ' : '') + spec.name);
      label.position.set(mesh.position.x, 2.15, z);
      row.add(mesh);
      row.add(label);
    }
    scene.add(row);
    materialRow = row;
    button.textContent = 'Скрыть материалы';
    const mid = originX + (widest - 1) * 1.7 * 0.5;
    cameraController.framePoint(mid, 1.2, originZ + (grids - 1) * 1.6, 40);
  }

  function buildLevelView() {
    simEstimate = null;
    disposeLevel();
    const level = world.level;
    const footprint = level.footprint;
    const cx = (footprint.minX + footprint.maxX) / 2 + 0.5;
    const cz = (footprint.minZ + footprint.maxZ) / 2 + 0.5;
    // Земля стройплощадки, уступы карьера, груды руды у рудников, камни и колеи — art/quarry.js; за карьером забор,
    // кран, бытовки, миниатюры прошлых строек и техника компании — art/props.js. Стены обходят хозяйство стройки.
    const padRadius = Math.max(footprint.maxX - footprint.minX, footprint.maxZ - footprint.minZ) * 0.85 + 4;
    const chapter = CHAPTER_LOOKS[Math.floor(Math.max(0, (level.number || 1) - 1) / 10) % CHAPTER_LOOKS.length];
    chapterTint.rock.value.fromArray(chapter.rock);
    chapterTint.grass.value.fromArray(chapter.grass);
    const cells = quarryCells(level);
    levelRoot.add(MicroBuildersQuarry.build(level, cx, cz, {
      materials: MB.MATERIAL,
      blocks: Blocks,
      mobile: mobileRendering,
      anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
      cells: cells,
      surface: quarrySurface,
      wet: function () { return weatherView.wet; },
    }));
    MicroBuildersQuarry.keep(level.mines.map(function (mine) { return mine.materialId; }));
    levelRoot.add(MicroBuildersProps.build(level, cx, cz, { cells: cells, order: level.number }));
    MicroBuildersVehicles.decorate(level, levelRoot);
    addGroundDust(cx, cz, padRadius);

    const buckets = {};
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (block.feature) continue;
      if (!buckets[block.materialId]) buckets[block.materialId] = [];
      buckets[block.materialId].push(block);
    }
    // Фактуры прошлых строек больше не нужны: видеопамять и canvas — только под материалы этой.
    keepBlockTextures(Object.keys(buckets));
    solidMeshes = [];
    ghostMaterials = [];
    ghostMeshes = [];
    // Блоки (block-materials.js): куб с фаской, по мешу на пару (материал, вариант фактуры); вариант, поворот,
    // сдвиг кладки и оттенок блока берутся из его клетки (Blocks.look), маска соседей — атрибут на экземпляр.
    const blockGeo = Blocks.geometry(0.98, 0.07);
    const tint = new THREE.Color();
    // Призраки (art/fx.js glass), один InstancedMesh на всё здание: рамка яруса, который строят, и бледный силуэт
    // цели (refreshGhosts). Клетка во всю ширину: рёбра соседних клеток сходятся без зазора; по высоте 0,98.
    const glass = MicroBuildersFx.glass();
    ghostGlass = glass;
    const ghostGeo = new THREE.BoxGeometry(1, 0.98, 1);
    const ghost = new THREE.InstancedMesh(ghostGeo, glass, Math.max(1, world.blocks.length));
    ghost.castShadow = false;
    ghost.frustumCulled = false;
    ghost.visible = ghostsOn;
    ghostMeshes.push(ghost);
    let ghostCount = 0;
    ghostTier = NaN;
    ghostRemaining = -1;
    Object.keys(buckets).forEach(function (materialId) {
      const list = buckets[materialId];
      const looks = list.map(function (block) { return Blocks.look(block.x, block.y, block.z); });
      const solids = [];
      const used = [];
      for (let v = 0; v < Blocks.VARIANTS; v++) {
        const count = looks.filter(function (look) { return look.variant === v; }).length;
        used.push(0);
        if (!count) continue;
        // Своя копия геометрии: маска соседей и вида — атрибуты на экземпляр.
        const mesh = new THREE.InstancedMesh(blockGeo.clone(), Blocks.material(materialId, v, true), count);
        mesh.geometry.setAttribute('mbNb', new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2));
        mesh.geometry.setAttribute('mbLook', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
        mesh.userData.blocks = [];
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        solids[v] = mesh;
      }
      for (let i = 0; i < list.length; i++) {
        const block = list[i];
        const look = looks[i];
        const solid = solids[look.variant];
        const j = used[look.variant]++;
        dummy.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        ghost.setMatrixAt(ghostCount, dummy.matrix);
        dummy.position.x += look.jx;
        dummy.position.z += look.jz;
        dummy.scale.setScalar(0.001);
        dummy.rotation.set(0, look.turn + look.yaw, 0);
        dummy.updateMatrix();
        solid.setMatrixAt(j, dummy.matrix);
        solid.setColorAt(j, tint.setScalar(look.tint));
        solid.geometry.attributes.mbLook.array[j] = look.mask;
        solid.userData.blocks[j] = block;
        blockViews.set(block.id, { solid: solid, index: j, ghost: ghost, ghostIndex: ghostCount++ });
      }
      solids.forEach(function (solid) {
        solid.instanceMatrix.needsUpdate = true;
        levelRoot.add(solid);
        solidMeshes.push(solid);
      });
    });
    blockGeo.dispose();
    ghost.count = ghostCount;
    ghost.instanceMatrix.needsUpdate = true;
    levelRoot.add(ghost);

    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (!block.feature) continue;
      const feature = Features.build(block, {
        parent: levelRoot,
        getBlock: featureBlockAt,
        blocks: world.blocks,
      }, featureState);
      const record = blockViews.get(block.id);
      if (record) {
        record.feature = feature;
        continue;
      }
      // Window glass: no ghost of its own (its wall cube has one); once set, the window replaces it.
      if (block.glassOf !== undefined) {
        blockViews.set(block.id, { feature: feature, wall: blockViews.get(block.glassOf) });
        continue;
      }
      // Призрак двери или окна — отдельный меш из того же стекла; вне яруса скрыт (refreshGhosts).
      const featureGhost = new THREE.Mesh(ghostGeo, glass);
      featureGhost.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
      featureGhost.visible = false;
      levelRoot.add(featureGhost);
      blockViews.set(block.id, { feature: feature, ghostObject: featureGhost });
    }

    for (let i = 0; i < world.blocks.length; i++) {
      if (world.blocks[i].built) setBlockVisualScale(blockViews.get(world.blocks[i].id), 1, 0.001);
    }
    refreshBlockAo();
    refreshGhosts();

    for (let i = 0; i < level.mines.length; i++) addMineLabel(level.mines[i]);
    buildCampViews();
    buildScaffoldView();
    setSiteCamera(level, cx, cz);
    syncSticks();
    syncVehicles();
    syncTaxis();
    paintLevelInfo();
    applySceneLighting();
  }

  // ---------- site camp: canteen and sales office (docs/gdd/20-site-camp.md) ----------
  // Every cube of a camp building is a mesh of its own (a few dozen): a blue silhouette until it is
  // set, then the material. A wide invisible box takes the taps; a sign above the roof says how far
  // it is while it goes up, and the state for 5 s after its sheet closes once it stands.

  function campLevel(site) {
    return campaign.purchases[CAMP_NODES[site.kind || site.id]] || 0;
  }

  // «Кафе», «Бизнес-центр» … — the standing form of a camp building (the first one while none stands).
  function campName(site) {
    return site.target ? MB.campForm(site.kind, Math.max(1, site.form || 0)).name : CAMP_NAMES[site.kind];
  }

  // A rebuild: the old form is gone, the new one is going up (the building works at the old level).
  function campRebuilding(site) {
    return !!site.target && site.form >= 1 && !site.ready;
  }

  function buildCampViews() {
    campViews = {};
    document.getElementById('site-signs').innerHTML = '';
    (world.camp || []).forEach(buildCampView);
  }

  // A camp building's view (the canteen's forms of CANTEEN.voxel-cell voxels, the sales office of
  // cells): instanced cubes per material for the form going up (site.cubes: the first site.built
  // are set), one ghost mesh for the cubes still to set, the stack, a silhouette outline (an inflated
  // back-face copy of the set cubes, glass left out), the tap box and the DOM sign. Rebuilt when
  // the canteen starts a new form.
  function campViewKey(site) {
    return (site.target || 0) + ':' + site.total;
  }

  // Camp cube materials: the block's own, marking the stencil, so the outline is drawn only round
  // the silhouette (never over the building or through its seams and windows).
  function campSurface(materialId) {
    const key = 'camp:' + materialId;
    if (blockSurfaceCache[key]) return blockSurfaceCache[key];
    // Как блок стройки (block-materials.js): затенение в стыках и голые грани (кубы — campInstances).
    const material = Blocks.material(materialId, 0, true, true);
    material.stencilWrite = true;
    material.stencilRef = 1;
    material.stencilFunc = THREE.AlwaysStencilFunc;
    material.stencilZPass = THREE.ReplaceStencilOp;
    blockSurfaceCache[key] = material;
    return material;
  }

  // Кубы городка — как блоки стройки: куб с фаской (свой клон общей геометрии на материал, slots.geos — освободить
  // вместе с видом), маска соседей для затенения в стыках и вид грани (Blocks.look). Соседи — все кубы формы
  // (дом встаёт целиком), снизу земля. Кубы городка — целые клетки (CANTEEN.voxel = 1).
  function campInstances(group, geo, cubes) {
    const byMaterial = {};
    const filled = new Set();
    cubes.forEach(function (cube, i) {
      if (!byMaterial[cube.materialId]) byMaterial[cube.materialId] = [];
      byMaterial[cube.materialId].push(i);
      filled.add(Math.floor(cube.wx) + ',' + Math.floor(cube.wy) + ',' + Math.floor(cube.wz));
    });
    const has = function (x, y, z) { return y < 0 || filled.has(x + ',' + y + ',' + z); };
    const slots = new Array(cubes.length);
    slots.geos = [];
    Object.keys(byMaterial).forEach(function (materialId) {
      const list = byMaterial[materialId];
      const shape = campBlockGeometry().clone();
      const nb = new Float32Array(list.length * 2);
      const looks = new Float32Array(list.length);
      list.forEach(function (cubeIndex, k) {
        const cube = cubes[cubeIndex];
        const x = Math.floor(cube.wx);
        const y = Math.floor(cube.wy);
        const z = Math.floor(cube.wz);
        for (let n = 0; n < AO_NEIGHBORS.length; n++) {
          const d = AO_NEIGHBORS[n];
          if (has(x + d[0], y + d[1], z + d[2])) nb[k * 2] += d[3];
        }
        for (let n = 0; n < AO_SIDES.length; n++) {
          const d = AO_SIDES[n];
          if (has(x + d[0], y + d[1], z + d[2])) nb[k * 2 + 1] += 1 << n;
        }
        looks[k] = Blocks.look(x, y, z).mask;
      });
      shape.setAttribute('mbNb', new THREE.InstancedBufferAttribute(nb, 2));
      shape.setAttribute('mbLook', new THREE.InstancedBufferAttribute(looks, 1));
      slots.geos.push(shape);
      const mesh = new THREE.InstancedMesh(shape, campSurface(materialId), list.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      list.forEach(function (cubeIndex, k) { slots[cubeIndex] = { mesh: mesh, k: k }; });
      group.add(mesh);
    });
    return slots;
  }

  function campBlockGeometry() {
    if (!campShape) campShape = Blocks.geometry(0.97, 0.07);
    return campShape;
  }

  function setCampInstance(mesh, k, cube, shown) {
    dummy.position.set(cube.wx, cube.wy, cube.wz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(shown ? 1 : 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(k, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  // The foundation of a camp building not started yet (campFoundationMat): tap it to start the building.
  // No sign over it: its name is cut into a low board at its front edge (buildCampPlate).
  function buildCampFoundation(box, name) {
    const group = new THREE.Group();
    // box: the world extent of the first form (logic.js → campBox).
    const w = box.x1 - box.x0 + 0.4, d = box.z1 - box.z0 + 0.4;
    const cx = (box.x0 + box.x1) / 2, cz = (box.z0 + box.z1) / 2;
    const slabGeo = new THREE.BoxGeometry(w - 0.2, 0.12, d - 0.2);
    const edgeGeo = new THREE.BoxGeometry(w, 0.06, d);
    const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8);
    const capGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.16, 8);
    const slab = new THREE.Mesh(slabGeo, campFoundationMat.slab);
    slab.position.set(cx, 0.08, cz);
    slab.receiveShadow = true;
    const edge = new THREE.Mesh(edgeGeo, campFoundationMat.edge);
    edge.position.set(cx, 0.03, cz);
    edge.receiveShadow = true;
    group.add(slab, edge);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (corner) {
      const x = cx + corner[0] * (w / 2 - 0.1), z = cz + corner[1] * (d / 2 - 0.1);
      const post = new THREE.Mesh(postGeo, campFoundationMat.post);
      post.position.set(x, 0.35, z);
      post.castShadow = true;
      const cap = new THREE.Mesh(capGeo, campFoundationMat.cap);
      cap.position.set(x, 0.5, z);
      group.add(post, cap);
    });
    const plate = buildCampPlate(group, box, name);
    group.visible = false;
    return { group: group, geos: [slabGeo, edgeGeo, postGeo, capGeo].concat(plate.geos), plate: plate };
  }

  // The name board: two stakes at the front edge (the camera's side, +z) and a wooden board leaning
  // back a little, the name cut into it — small from afar, read when the camera comes close.
  function buildCampPlate(group, box, name) {
    const width = Math.max(2, Math.min(3.4, (box.x1 - box.x0) * 0.8));
    const height = width * 0.27;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round(512 * height / width);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const paint = function () {
      paintCampPlate(canvas, name);
      texture.needsUpdate = true;
    };
    paint();
    if (document.fonts && !document.fonts.check('800 40px Manrope')) document.fonts.load('800 40px Manrope').then(paint, function () {});
    const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
    const wood = campFoundationMat.wood;
    const boardGeo = new THREE.BoxGeometry(width, height, 0.08);
    const stakeGeo = new THREE.BoxGeometry(0.1, 0.62, 0.1);
    const cx = (box.x0 + box.x1) / 2, z = box.z1 + 0.55;
    const board = new THREE.Mesh(boardGeo, [wood, wood, wood, wood, face, wood]);
    board.position.set(cx, 0.48, z);
    board.rotation.x = -0.42;
    board.castShadow = true;
    group.add(board);
    [-1, 1].forEach(function (side) {
      const stake = new THREE.Mesh(stakeGeo, wood);
      stake.position.set(cx + side * (width / 2 - 0.25), 0.31, z - 0.06);
      stake.castShadow = true;
      group.add(stake);
    });
    return { geos: [boardGeo, stakeGeo], texture: texture, face: face };
  }

  // Dark planks, the name cut in: the groove is in shadow on its upper edge and catches the light
  // on its lower one.
  function paintCampPlate(canvas, name) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const grain = ctx.createLinearGradient(0, 0, 0, h);
    grain.addColorStop(0, '#8a6440');
    grain.addColorStop(1, '#6b4a2e');
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(40, 24, 12, 0.18)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 7; i++) {
      const y = h * i / 7 + Math.sin(i * 2.3) * 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y + 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30, 18, 8, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    let size = Math.round(h * 0.5);
    ctx.font = '800 ' + size + 'px Manrope, sans-serif';
    const fit = (w - 56) / ctx.measureText(name).width;
    if (fit < 1) size = Math.floor(size * fit);
    ctx.font = '800 ' + size + 'px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = w / 2, y = h / 2 + size * 0.04;
    ctx.fillStyle = 'rgba(255, 226, 180, 0.45)';
    ctx.fillText(name, x, y + 2.5);
    ctx.fillStyle = '#2a170a';
    ctx.fillText(name, x, y);
  }

  function buildCampView(site) {
    const previous = campViews[site.id];
    if (previous) {
      levelRoot.remove(previous.group);
      if (previous.foundation) levelRoot.remove(previous.foundation);
      previous.geos.forEach(function (geo) { geo.dispose(); });
      if (previous.plate) {
        previous.plate.texture.dispose();
        previous.plate.face.dispose();
      }
      ghostMaterials = ghostMaterials.filter(function (material) { return material !== previous.ghostMat; });
      if (previous.reactor) disposeReactorFx(previous.reactor);
    }
    const group = new THREE.Group();
    const size = site.voxel || 1;
    const geo = new THREE.BoxGeometry(0.97 * size, 0.97 * size, 0.97 * size);
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0x7fb2ff, transparent: true, opacity: 0.24, depthWrite: false });
    ghostMaterials.push(ghostMat);
    const slots = campInstances(group, geo, site.cubes);
    const ghost = new THREE.InstancedMesh(geo, ghostMat, Math.max(1, site.cubes.length));
    ghost.frustumCulled = false;
    group.add(ghost);
    // Outline: the cubes again, a little inflated, drawn last and only where the building did not
    // mark the stencil — a rim round the silhouette.
    const outlineMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.KeepStencilOp,
      uniforms: { uColor: { value: new THREE.Color(0xf2d79a) }, uGrow: { value: 0.05 } },
      vertexShader: 'uniform float uGrow; void main(){ gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position * (1.0 + uGrow), 1.0); }',
      fragmentShader: 'uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }',
    });
    const outline = new THREE.InstancedMesh(geo, outlineMat, Math.max(1, site.cubes.length));
    outline.frustumCulled = false;
    outline.renderOrder = 10;
    site.cubes.forEach(function (cube, i) { setCampInstance(outline, i, cube, true); });
    outline.visible = false;
    group.add(outline);
    const shown = new Uint8Array(site.cubes.length);
    site.cubes.forEach(function (cube, i) {
      const done = cube.done === undefined ? i < site.built : cube.done;
      shown[i] = done ? 1 : 0;
      setCampInstance(slots[i].mesh, slots[i].k, cube, done);
      setCampInstance(ghost, i, cube, !done);
    });
    // The stack the crew takes the cubes from (taken away once the house stands).
    const plankGeo = new THREE.BoxGeometry(0.9, 0.22, 0.9);
    const pile = [];
    site.pile.forEach(function (cell, i) {
      for (let k = 0; k < 3 - i; k++) {
        const plank = new THREE.Mesh(plankGeo, blockSurface(CAMP_PILES[site.id] || 'ladder-pine', false));
        plank.position.set(cell[0] + 0.5, 0.11 + k * 0.23, cell[2] + 0.5);
        plank.rotation.y = (k % 2) * 0.24 - 0.12;
        plank.castShadow = true;
        plank.receiveShadow = true;
        group.add(plank);
        pile.push(plank);
      }
    });
    const box = site.box;
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(box.x1 - box.x0 + 1, box.h + 0.5, box.z1 - box.z0 + 1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set((box.x0 + box.x1) / 2, (box.h + 0.5) / 2, (box.z0 + box.z1) / 2);
    group.add(hit);
    levelRoot.add(group);
    const foundation = buildCampFoundation(box, CAMP_NAMES[site.kind] || campName(site));
    levelRoot.add(foundation.group);
    let sign = previous ? previous.signEl : null;
    if (!sign) {
      sign = document.createElement('button');
      sign.type = 'button';
      sign.className = 'city-sign camp-sign';
      sign.dataset.camp = site.id;
      sign.hidden = true;
      document.getElementById('site-signs').appendChild(sign);
    }
    let lamp = null;
    if (site.kind === 'light') {
      lamp = new THREE.Vector3();
      let count = 0;
      site.cubes.forEach(function (cube) {
        if ((cube.drawn || cube.materialId) !== LAMP_MATERIAL) return;
        lamp.x += cube.wx;
        lamp.y += cube.wy;
        lamp.z += cube.wz;
        count += 1;
      });
      if (count > 0) lamp.divideScalar(count);
      else lamp.set((box.x0 + box.x1) / 2, box.h, (box.z0 + box.z1) / 2);
    }
    campViews[site.id] = {
      site: site,
      lamp: lamp,
      key: campViewKey(site),
      group: group,
      geos: [geo, plankGeo, hit.geometry].concat(foundation.geos, slots.geos),
      foundation: foundation.group,
      plate: foundation.plate,
      ghostMat: ghostMat,
      slots: slots,
      ghost: ghost,
      pile: pile,
      outline: outline,
      outlineMat: outlineMat,
      outlineWidth: 0,
      center: new THREE.Vector3((box.x0 + box.x1) / 2, box.h / 2, (box.z0 + box.z1) / 2),
      hit: hit,
      built: site.built,
      shown: shown,
      level: previous ? previous.level : -1,
      anchor: new THREE.Vector3((box.x0 + box.x1) / 2, box.h + 0.8, (box.z0 + box.z1) / 2),
      signEl: sign,
      sign: '',
      until: previous ? previous.until : 0,
      reactor: site.kind === 'reactor' ? buildReactorFx(site, group, box) : null,
      wasReady: site.ready,
    };
    updateCampView(campViews[site.id], 0);
    paintCampSign(campViews[site.id]);
  }

  function updateCampViews(time) {
    if (!world) return;
    Object.keys(campViews).forEach(function (id) { updateCampView(campViews[id], time); });
  }

  function updateCampView(view, time) {
    const site = view.site;
    if (view.key !== campViewKey(site)) {
      buildCampView(site);
      return;
    }
    // The canteen shows up once «Полевая кухня» is bought on this site (a new kitchen level is a new
    // canteen form to build); the sales office with the personnel centre's «Офис продаж».
    const level = MB.campActive(world, site) ? campLevel(site) : 0;
    if (view.level !== level) {
      const was = view.level;
      view.level = level;
      view.group.visible = level >= 1;
      if (site.id === 'canteen' && was >= 0 && level > was) onCanteenLevel(level);
      if (site.id === 'sales' && was >= 0 && level > was) onSalesLevel(level);
      if ((site.id === 'dorm' || site.id === 'lounge' || site.id === 'light-left' || site.id === 'reactor') && was >= 0 && level > was) onCampLevel(site, level);
    }
    // Not started yet (a token and the coins of level 1): the foundation of the pad.
    const base = MB.campFoundation(world, site);
    if (view.foundation.visible !== base) view.foundation.visible = base;
    if (view.reactor) updateReactorFx(view, time);
    if (level < 1) return;
    if (site.ready) updateCampOutline(view, time);
    if (view.built !== site.built) {
      // Each worker sets his own cubes, so they go in a little out of order: compare them all.
      for (let i = 0; i < site.cubes.length; i++) {
        const done = site.cubes[i].done === undefined ? i < site.built : site.cubes[i].done;
        if (view.shown[i] === (done ? 1 : 0)) continue;
        view.shown[i] = done ? 1 : 0;
        setCampInstance(view.slots[i].mesh, view.slots[i].k, site.cubes[i], done);
        setCampInstance(view.ghost, i, site.cubes[i], !done);
      }
      view.built = site.built;
    }
    for (let i = 0; i < view.pile.length; i++) view.pile[i].visible = !site.ready;
    view.outline.visible = site.ready;
  }

  function updateCampOutline(view, time) {
    // ~2 CSS px of rim at the current camera distance, whatever the zoom.
    const dist = camera.position.distanceTo(view.center);
    const perPx = 2 * dist * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, MicroBuildersStage.height());
    const width = Math.min(0.3, Math.max(0.02, 2 * perPx));
    if (Math.abs(width - view.outlineWidth) > 0.003) {
      view.outlineWidth = width;
      view.outlineMat.uniforms.uGrow.value = 2 * width / (0.97 * (view.site.voxel || 1));
    }
    view.outlineMat.uniforms.uColor.value.copy(OUTLINE_DIM).lerp(OUTLINE_BRIGHT, 0.5 + 0.5 * Math.sin(time * 2.4));
  }

  // ---------- the reactor's glow: a magic sphere on top, louder with each form ----------
  // Only additive meshes and sprites (no lights: a light added at run time recompiles every
  // material). All forms: the core glow, a halo and sparks on orbit; from the 2nd motes rising from
  // the ground and a rune circle under the building; from the 3rd a beam into the sky; from the 4th
  // waves rolling off the sphere; the 5th doubles the circle and the beam. A flash once it is built.
  function reactorRunes() {
    if (runeTexture) return runeTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const c = canvas.getContext('2d');
    c.translate(256, 256);
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineCap = 'round';
    [[250, 5], [232, 2], [176, 3], [160, 1.5]].forEach(function (ring) {
      c.lineWidth = ring[1];
      c.beginPath();
      c.arc(0, 0, ring[0], 0, Math.PI * 2);
      c.stroke();
    });
    // Glyphs between the rings: little strokes and ticks, all different.
    c.lineWidth = 3.5;
    for (let i = 0; i < 24; i++) {
      c.save();
      c.rotate(i / 24 * Math.PI * 2);
      c.translate(0, -204);
      c.beginPath();
      const v = (i * 7) % 5;
      c.moveTo(-9, -12); c.lineTo(v > 1 ? 9 : 0, v > 2 ? 12 : -2);
      c.moveTo(v % 2 ? -9 : 9, 10); c.lineTo(0, v > 3 ? -12 : 4);
      if (v === 0 || v === 3) { c.moveTo(-6, 0); c.arc(0, 0, 6, Math.PI, Math.PI * 3); }
      c.stroke();
      c.restore();
    }
    // A star of two triangles inside.
    c.lineWidth = 2.5;
    [0, Math.PI].forEach(function (turn) {
      c.beginPath();
      for (let k = 0; k <= 3; k++) {
        const a = turn + k / 3 * Math.PI * 2 - Math.PI / 2;
        if (k === 0) c.moveTo(Math.cos(a) * 158, Math.sin(a) * 158);
        else c.lineTo(Math.cos(a) * 158, Math.sin(a) * 158);
      }
      c.stroke();
    });
    runeTexture = new THREE.CanvasTexture(canvas);
    runeTexture.colorSpace = THREE.SRGBColorSpace;
    runeTexture.userData.shared = true;
    return runeTexture;
  }

  function buildReactorFx(site, group, box) {
    const level = Math.max(1, site.target || site.form || 1);
    const cx = (box.x0 + box.x1) / 2 + 0.5;
    const cz = (box.z0 + box.z1) / 2 + 0.5;
    // The sphere is the biggest joined lump of glowing cubes (the lone glowing tips are not it).
    const glowing = new Map();
    site.cubes.forEach(function (cube) {
      if ((cube.drawn || cube.materialId) === REACTOR_CORE) glowing.set(Math.round(cube.wx * 2) + ',' + Math.round(cube.wy * 2) + ',' + Math.round(cube.wz * 2), cube);
    });
    let lump = [];
    const seen = new Set();
    const step = 2 * (site.voxel || 1);
    glowing.forEach(function (cube, key) {
      if (seen.has(key)) return;
      const part = [];
      const queue = [key];
      seen.add(key);
      while (queue.length) {
        const at = queue.pop();
        const c = glowing.get(at);
        part.push(c);
        const p = at.split(',').map(Number);
        [[step, 0, 0], [-step, 0, 0], [0, step, 0], [0, -step, 0], [0, 0, step], [0, 0, -step]].forEach(function (d) {
          const next = (p[0] + d[0]) + ',' + (p[1] + d[1]) + ',' + (p[2] + d[2]);
          if (glowing.has(next) && !seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        });
      }
      if (part.length > lump.length) lump = part;
    });
    const core = new THREE.Vector3();
    lump.forEach(function (cube) {
      core.x += cube.wx;
      core.y += cube.wy;
      core.z += cube.wz;
    });
    if (lump.length > 0) core.divideScalar(lump.length);
    else core.set(cx, box.h + 1, cz);
    let radius = 1;
    lump.forEach(function (cube) { radius = Math.max(radius, Math.hypot(cube.wx - core.x, cube.wy - core.y, cube.wz - core.z) + 0.5); });
    const root = new THREE.Group();
    root.visible = false;
    group.add(root);
    const fx = { root: root, core: core, radius: radius, level: level, mats: [], geos: [], glows: [], rings: [], sparks: [], motes: [], runes: [], beams: [], waves: [], born: -1 };
    function additive(color, opacity) {
      const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      fx.mats.push(material);
      return material;
    }
    function glow(color, scale, opacity, through) {
      const material = new THREE.SpriteMaterial({ map: softTexture(), color: color, transparent: true, opacity: opacity, depthWrite: false, depthTest: !through, blending: THREE.AdditiveBlending, fog: false });
      fx.mats.push(material);
      const sprite = new THREE.Sprite(material);
      sprite.scale.setScalar(scale);
      sprite.position.copy(core);
      sprite.renderOrder = 7;
      root.add(sprite);
      return sprite;
    }
    // The core: a white heart in a violet halo, both breathing; the light shows through the shell.
    fx.glows.push({ sprite: glow(0x6a45ff, radius * (3 + 0.6 * level), 0.4, true), base: radius * (3 + 0.6 * level), opacity: 0.4, speed: 1.3 });
    fx.glows.push({ sprite: glow(0x9fe6ff, radius * (1.7 + 0.25 * level), 0.55, true), base: radius * (1.7 + 0.25 * level), opacity: 0.55, speed: 2.1 });
    // Rings round the sphere on tilted axes, each spinning its own way.
    const ringColors = [0x38c8ff, 0x8a55ff, 0x38c8ff];
    for (let i = 0; i < [1, 2, 2, 3, 3][level - 1]; i++) {
      const geo = new THREE.TorusGeometry(radius * (1.4 + 0.3 * i), 0.025 + 0.008 * level, 6, 72);
      fx.geos.push(geo);
      const mesh = new THREE.Mesh(geo, additive(ringColors[i], 0.5));
      mesh.position.copy(core);
      mesh.renderOrder = 7;
      const tilt = new THREE.Group();
      tilt.position.copy(core);
      tilt.rotation.set(0.5 + i * 0.7, i * 1.1, 0.3 - i * 0.5);
      mesh.position.set(0, 0, 0);
      tilt.add(mesh);
      root.add(tilt);
      fx.rings.push({ mesh: mesh, speed: (i % 2 ? -1 : 1) * (0.7 + 0.25 * i + 0.1 * level) });
    }
    // Sparks on orbit round the sphere.
    for (let i = 0; i < 4 + 4 * level; i++) {
      const sprite = glow(i % 3 ? 0xa8f0ff : 0xd6b8ff, 0.32 + 0.05 * level, 0.95);
      fx.sparks.push({
        sprite: sprite, r: radius * (1.25 + ((i * 37) % 10) / 10), speed: (0.5 + ((i * 53) % 10) / 12) * (i % 2 ? 1 : -1),
        phase: i * 2.399, tilt: ((i * 29) % 10) / 10 - 0.5,
      });
    }
    const reach = Math.max(2.5, Math.max(box.x1 - box.x0, box.z1 - box.z0) / 2 + 1.2);
    if (level >= 2) {
      // Motes drifting up from the ground round the base into the sphere.
      for (let i = 0; i < 6 * level; i++) {
        fx.motes.push({ sprite: glow(i % 2 ? 0x9ff3ff : 0xc7a6ff, 0.28 + 0.04 * level, 0), a: i * 2.399, r: reach * (0.8 + ((i * 31) % 10) / 25), phase: ((i * 41) % 100) / 100, period: 3.2 + ((i * 17) % 10) / 6 });
      }
      // The rune circle on the ground (the 5th adds a bigger one turning back).
      for (let i = 0; i < (level >= 5 ? 2 : 1); i++) {
        const size = reach * (1.15 + 0.12 * (level - 2)) * (i ? 1.45 : 1);
        const geo = new THREE.PlaneGeometry(size * 2, size * 2);
        fx.geos.push(geo);
        const material = additive(i ? 0xb98cff : 0x7fe6ff, 0.6);
        material.map = reactorRunes();
        const mesh = new THREE.Mesh(geo, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(cx, 0.06 + i * 0.01, cz);
        mesh.renderOrder = 5;
        root.add(mesh);
        fx.runes.push({ mesh: mesh, speed: i ? -0.12 : 0.18 });
      }
    }
    if (level >= 3) {
      // A beam from the sphere into the sky: wider with the form, a white inner one on the 5th.
      for (let i = 0; i < (level >= 5 ? 2 : 1); i++) {
        const width = radius * (i ? 0.28 : 0.4 + 0.18 * (level - 3));
        const geo = new THREE.CylinderGeometry(width, width * 1.6, 1, 28, 1, true).translate(0, 0.5, 0);
        fx.geos.push(geo);
        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          uniforms: { uOpacity: { value: 0.7 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(i ? 0xf0fbff : 0x86dcff) } },
          vertexShader: [
            'varying float vT; varying vec3 vNormalV; varying vec3 vViewPos;',
            'void main(){ vT = position.y; vNormalV = normalize(normalMatrix * normal);',
            '  vec4 mv = modelViewMatrix * vec4(position, 1.0); vViewPos = mv.xyz; gl_Position = projectionMatrix * mv; }',
          ].join('\n'),
          fragmentShader: [
            'uniform float uOpacity; uniform float uTime; uniform vec3 uColor; varying float vT; varying vec3 vNormalV; varying vec3 vViewPos;',
            'void main(){',
            '  float facing = abs(dot(normalize(vNormalV), normalize(-vViewPos)));',
            '  float bands = 0.7 + 0.3 * sin(vT * 60.0 - uTime * 5.0);',
            '  float a = uOpacity * pow(facing, 1.4) * pow(1.0 - clamp(vT, 0.0, 1.0), 1.3) * smoothstep(0.0, 0.03, vT) * bands;',
            '  gl_FragColor = vec4(uColor * a, a);',
            '}',
          ].join('\n'),
        });
        fx.mats.push(material);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.copy(core);
        mesh.scale.y = 26 + 8 * level;
        mesh.frustumCulled = false;
        mesh.renderOrder = 6;
        root.add(mesh);
        fx.beams.push({ mesh: mesh, material: material, opacity: i ? 0.9 : 0.55 + 0.1 * (level - 3) });
      }
    }
    if (level >= 4) {
      // Waves rolling off the sphere along the ground plane.
      for (let i = 0; i < (level >= 5 ? 3 : 2); i++) {
        const geo = new THREE.RingGeometry(0.9, 1, 64);
        fx.geos.push(geo);
        const mesh = new THREE.Mesh(geo, additive(0x9fe8ff, 0));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(core);
        mesh.renderOrder = 7;
        root.add(mesh);
        fx.waves.push({ mesh: mesh, offset: i / (level >= 5 ? 3 : 2) });
      }
    }
    // The flash of the start: a big glow and a ring flying out, shown for a moment.
    fx.flash = glow(0xe6fbff, 1, 0, true);
    const flashGeo = new THREE.RingGeometry(0.85, 1, 64);
    fx.geos.push(flashGeo);
    fx.shock = new THREE.Mesh(flashGeo, additive(0xc7f4ff, 0));
    fx.shock.rotation.x = -Math.PI / 2;
    fx.shock.position.copy(core);
    root.add(fx.shock);
    return fx;
  }

  function disposeReactorFx(fx) {
    fx.geos.forEach(function (geo) { geo.dispose(); });
    fx.mats.forEach(function (material) { material.dispose(); });
  }

  function updateReactorFx(view, time) {
    const fx = view.reactor;
    const site = view.site;
    const on = !!site.ready && view.level >= 1;
    if (on && !view.wasReady && time > 0) {
      fx.born = time;
      if (levelRoot.visible) burst(fx.core.x, fx.core.y, fx.core.z, 0xa8f0ff, 18 + 6 * fx.level);
    }
    if (time > 0) view.wasReady = on;
    fx.root.visible = on;
    if (!on) return;
    const look = skyView.look;
    const night = look ? Math.max(0, Math.min(1, (look.moonLight - 0.15) / 0.6)) : 0;
    const shine = 0.8 + 0.4 * night;
    const core = fx.core;
    fx.glows.forEach(function (item) {
      const breath = 1 + 0.12 * Math.sin(time * item.speed) + 0.05 * Math.sin(time * item.speed * 3.7);
      item.sprite.scale.setScalar(item.base * breath);
      item.sprite.material.opacity = item.opacity * shine;
    });
    fx.rings.forEach(function (item) { item.mesh.rotation.z = time * item.speed; });
    fx.sparks.forEach(function (item) {
      const a = item.phase + time * item.speed;
      item.sprite.position.set(core.x + Math.cos(a) * item.r, core.y + Math.sin(a * 1.3) * item.r * item.tilt, core.z + Math.sin(a) * item.r);
      item.sprite.material.opacity = (0.6 + 0.4 * Math.sin(time * 4 + item.phase)) * shine;
    });
    fx.motes.forEach(function (item) {
      const t = ((time / item.period + item.phase) % 1 + 1) % 1;
      const pull = t * t;
      const a = item.a + t * 1.6;
      const r = item.r * (1 - pull) + fx.radius * 0.6 * pull;
      item.sprite.position.set(core.x + Math.cos(a) * r, 0.2 + (core.y - 0.2) * t, core.z + Math.sin(a) * r);
      item.sprite.material.opacity = Math.sin(t * Math.PI) * 0.9 * shine;
    });
    fx.runes.forEach(function (item, i) {
      item.mesh.rotation.z = time * item.speed;
      item.mesh.material.opacity = (0.45 + 0.2 * Math.sin(time * 1.7 + i)) * shine;
    });
    fx.beams.forEach(function (item) {
      item.material.uniforms.uTime.value = time;
      item.material.uniforms.uOpacity.value = item.opacity * (0.85 + 0.15 * Math.sin(time * 3.1)) * shine;
    });
    const period = fx.level >= 5 ? 2.4 : 3.4;
    fx.waves.forEach(function (item) {
      const t = ((time / period + item.offset) % 1 + 1) % 1;
      item.mesh.scale.setScalar(fx.radius * (1.2 + t * (5 + fx.level)));
      item.mesh.material.opacity = (1 - t) * (1 - t) * 0.5 * shine;
    });
    // The start: 1.6 s of flash, the ring flies out to the whole camp.
    const since = fx.born >= 0 ? time - fx.born : 99;
    if (since < 1.6) {
      const k = since / 1.6;
      fx.flash.scale.setScalar(fx.radius * (2 + 10 * Math.sqrt(k)) * (0.8 + 0.2 * fx.level));
      fx.flash.material.opacity = (1 - k) * (1 - k);
      fx.shock.scale.setScalar(fx.radius * (1 + k * (10 + 3 * fx.level)));
      fx.shock.material.opacity = (1 - k) * 0.9;
      fx.flash.visible = true;
      fx.shock.visible = true;
    } else {
      fx.flash.visible = false;
      fx.shock.visible = false;
    }
  }

  function onCampCube(event) {
    const cube = event.site.cubes[event.index];
    if (cube) burst(cube.wx, cube.wy + 0.1, cube.wz, MB.MATERIAL[cube.materialId].color, 4);
  }

  // A new canteen level: the old building collapses (collapseCamp) and the new one's ghost appears.
  function onCampReform(event) {
    collapseCamp(event.site, event.old);
    if (campViews[event.site.id]) buildCampView(event.site);
    paintCampSigns();
    refreshCampSheet(true);
  }

  // The old building comes down with a show, in real time: it shudders, then falls from the base up —
  // the cubes burst outward, tumble, bounce once and crumble — under a rolling cloud of dust.
  function collapseCamp(site, cubes) {
    if (!cubes || cubes.length === 0 || !levelRoot.visible) return;
    const size = site.voxel || 1;
    const geo = new THREE.BoxGeometry(0.97 * size, 0.97 * size, 0.97 * size);
    const group = new THREE.Group();
    const slots = campInstances(group, geo, cubes);
    let cx = 0;
    let cz = 0;
    let top = 0;
    cubes.forEach(function (cube) {
      cx += cube.wx;
      cz += cube.wz;
      top = Math.max(top, cube.wy);
    });
    cx /= cubes.length;
    cz /= cubes.length;
    const parts = cubes.map(function (cube, i) {
      const dx = cube.wx - cx;
      const dz = cube.wz - cz;
      const r = Math.hypot(dx, dz) || 1;
      const push = 0.8 + Math.random() * 2.2;
      return {
        slot: slots[i], x: cube.wx, y: cube.wy, z: cube.wz,
        vx: dx / r * push + (Math.random() - 0.5) * 1.2,
        vy: 0.5 + Math.random() * 2.5,
        vz: dz / r * push + (Math.random() - 0.5) * 1.2,
        rx: 0, ry: 0, rz: 0,
        sx: (Math.random() - 0.5) * 9, sy: (Math.random() - 0.5) * 9, sz: (Math.random() - 0.5) * 9,
        delay: 0.3 + cube.wy * 0.04 + Math.random() * 0.12,
        bounced: false, scale: 1,
      };
    });
    levelRoot.add(group);
    collapses.push({ group: group, geo: geo, geos: slots.geos, parts: parts, t: 0, half: 0.49 * size, dust: campDust(cx, cz, site.box, top) });
  }

  // A ring of soft dust puffs round the base that billow out and up and fade.
  // A soft white dot (dust puffs, lamp glows).
  function softTexture() {
    if (!dustTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      dustTexture = new THREE.CanvasTexture(canvas);
      dustTexture.colorSpace = THREE.SRGBColorSpace;
      dustTexture.userData.shared = true;
    }
    return dustTexture;
  }

  function campDust(cx, cz, box, top) {
    const texture = softTexture();
    const rx = Math.max(2, (box.x1 - box.x0) / 2);
    const rz = Math.max(2, (box.z1 - box.z0) / 2);
    const light = Math.min(1, PRECIP.light.value);
    const puffs = [];
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2 + Math.random() * 0.3;
      const material = new THREE.SpriteMaterial({ map: texture, color: new THREE.Color(0xd9c9aa).multiplyScalar(light), transparent: true, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(material);
      const ring = 0.6 + Math.random() * 0.5;
      sprite.position.set(cx + Math.cos(a) * rx * ring, 0.6 + Math.random() * Math.min(3, top * 0.3), cz + Math.sin(a) * rz * ring);
      levelRoot.add(sprite);
      puffs.push({ sprite: sprite, vx: Math.cos(a) * (0.8 + Math.random()), vz: Math.sin(a) * (0.8 + Math.random()), vy: 0.3 + Math.random() * 0.6, grow: 2.5 + Math.random() * 2.5, delay: 0.25 + Math.random() * 0.5 });
    }
    return puffs;
  }

  // At night the standing masts shine at the building: the spotlight (stronger with the mast's
  // level), the beam and the glow fade in with the dark. Off over the quarter and by day.
  function updateMastLights() {
    const look = skyView.look;
    const dark = look ? Math.max(0, Math.min(1, (look.moonLight - 0.15) / 0.6)) : 0;
    const masts = world && levelRoot.visible && !cityRoot.visible ? world.lights || [] : [];
    const fp = world ? world.level.footprint : null;
    for (let i = 0; i < mastLights.length; i++) {
      const fx = mastLights[i];
      const mast = masts[i];
      const view = mast ? campViews[mast.id] : null;
      const on = !!(view && view.lamp && mast.form >= 1 && MB.campActive(world, mast) && view.key === campViewKey(mast) && dark > 0.01);
      if (!on) {
        fx.light.intensity = 0;
        fx.beam.visible = false;
        fx.glow.visible = false;
        continue;
      }
      // Lamps of the standing form: while a new one goes up the old lamps are gone, so it lights
      // from the top of what stands.
      const lamp = view.lamp;
      mastAim.set((fp.minX + fp.maxX) / 2 + 0.5, Math.max(2, siteBuiltTop * 0.4), (fp.minZ + fp.maxZ) / 2 + 0.5);
      const distance = lamp.distanceTo(mastAim);
      const reach = Math.max(4, Math.max(fp.maxX - fp.minX, fp.maxZ - fp.minZ) * 0.6);
      fx.light.position.copy(lamp);
      fx.light.target.position.copy(mastAim);
      fx.light.angle = Math.max(0.3, Math.min(0.85, Math.atan(reach / Math.max(1, distance))));
      fx.light.intensity = dark * (60 + 45 * mast.form);
      const length = distance * 1.15;
      fx.beam.position.copy(lamp);
      fx.beam.scale.set(length * Math.tan(fx.light.angle) / 0.42, length, length * Math.tan(fx.light.angle) / 0.42);
      fx.beam.quaternion.setFromUnitVectors(mastUp, mastAim.sub(lamp).normalize());
      fx.beam.visible = true;
      fx.glow.position.copy(lamp);
      fx.glow.scale.setScalar(1.6 + 0.5 * mast.form);
      if (!fx.glow.material.map) {
        fx.glow.material.map = softTexture();
        fx.glow.material.needsUpdate = true;
      }
      fx.glow.material.opacity = 0.9 * dark;
      fx.glow.visible = true;
    }
    beamMaterial.uniforms.uOpacity.value = 0.45 * dark;
  }

  function updateCollapses(dt) {
    for (let c = collapses.length - 1; c >= 0; c--) {
      const fx = collapses[c];
      fx.t += dt;
      const shake = fx.t < 0.3 ? 0.06 * Math.sin(fx.t * 90) : 0;
      for (let i = 0; i < fx.parts.length; i++) {
        const part = fx.parts[i];
        const local = fx.t - part.delay;
        if (local > 0) {
          part.vy -= 16 * dt;
          part.x += part.vx * dt;
          part.y += part.vy * dt;
          part.z += part.vz * dt;
          part.rx += part.sx * dt;
          part.ry += part.sy * dt;
          part.rz += part.sz * dt;
          if (part.y < fx.half) {
            part.y = fx.half;
            if (!part.bounced) {
              part.bounced = true;
              part.vy = -part.vy * 0.3;
              part.vx *= 0.5;
              part.vz *= 0.5;
            } else {
              part.vy = 0;
              part.vx *= 0.8;
              part.vz *= 0.8;
            }
          }
          if (part.bounced || local > 1.1) part.scale = Math.max(0, part.scale - dt * 1.6);
        }
        dummy.position.set(part.x + (local > 0 ? 0 : shake), part.y, part.z + (local > 0 ? 0 : shake * 0.6));
        dummy.rotation.set(part.rx, part.ry, part.rz);
        dummy.scale.setScalar(part.scale);
        dummy.updateMatrix();
        part.slot.mesh.setMatrixAt(part.slot.k, dummy.matrix);
        part.slot.mesh.instanceMatrix.needsUpdate = true;
      }
      for (let i = 0; i < fx.dust.length; i++) {
        const puff = fx.dust[i];
        const local = fx.t - puff.delay;
        if (local <= 0) continue;
        puff.sprite.position.x += puff.vx * dt;
        puff.sprite.position.y += puff.vy * dt;
        puff.sprite.position.z += puff.vz * dt;
        puff.vx *= 1 - dt * 0.8;
        puff.vz *= 1 - dt * 0.8;
        puff.sprite.scale.setScalar(1 + puff.grow * Math.min(1, local / 1.6));
        puff.sprite.material.opacity = 0.75 * Math.min(1, local / 0.25) * Math.max(0, 1 - local / 2.4);
      }
      if (fx.t > 3.2) {
        levelRoot.remove(fx.group);
        fx.geo.dispose();
        fx.geos.forEach(function (geo) { geo.dispose(); });
        fx.dust.forEach(function (puff) {
          levelRoot.remove(puff.sprite);
          puff.sprite.material.dispose();
        });
        collapses.splice(c, 1);
      }
    }
  }

  function onCampReady(event) {
    const site = event.site;
    if (site.id === 'canteen' && site.form >= 2) {
      UI.toast({
        title: '«' + MB.canteenForm(site.form).name + '» построен' + (site.form === 2 ? 'о' : ''),
        text: 'Ур. ' + site.form + ' · мест ' + MB.canteenSeats(world),
        icon: 'hq', tone: 'good', key: 'canteen-ready',
      });
    } else if (site.id === 'sales' && site.form >= 2) {
      UI.toast({
        title: '«' + MB.campForm('sales', site.form).name + '» построен',
        text: 'Ур. ' + site.form + ' · +' + formatRate(MB.salesRate(world)) + '/с',
        icon: 'icons/icon-coins.jpg?v=2', tone: 'good', key: 'sales-ready',
      });
    } else if (site.kind === 'reactor') {
      UI.toast({
        title: '«' + MB.campForm('reactor', site.form).name + '» запущен',
        text: 'Мана +' + Math.round(campaign.manaRate || 0) + '/мин · запас ' + Math.round(campaign.manaMax || 0),
        icon: 'icons/icon-mana.jpg', tone: 'good', key: 'reactor-ready',
      });
    } else if (site.kind === 'lounge') {
      UI.toast({
        title: '«' + MB.campForm('lounge', site.form).name + '» ' + (site.form <= 3 ? 'готова' : 'готов'),
        text: 'Мест ' + MB.loungeSeats(world) + ' · перекур −' + Math.round((1 - (MB.LOUNGE.smokeScale || 1)) * 100) + '%',
        icon: 'hq', tone: 'good', key: 'lounge-ready',
      });
    } else if (site.kind === 'dorm' || site.kind === 'light') {
      UI.toast({
        title: '«' + MB.campForm(site.kind, site.form).name + '» ' + (site.kind === 'dorm' ? 'готов' + (site.form === 1 ? '' : site.form === 2 ? '' : 'о') : 'светит'),
        text: site.kind === 'dorm' ? 'Коек ' + MB.dormBeds(world) + ' · сон −' + Math.round((1 - MB.dormSleepScale(campaign)) * 100) + '%' : nightLine(environmentEffects('')),
        icon: site.kind === 'dorm' ? 'hq' : 'moon', tone: 'good', key: site.id + '-ready',
      });
    } else if (site.id === 'canteen') {
      const dish = MB.DISH[site.dish];
      UI.toast({
        title: 'Полевая кухня готова',
        text: 'Мест ' + MB.canteenSeats(world) + (dish ? ' · ' + dish.name : ''),
        icon: 'hq', tone: 'good', key: 'canteen-ready',
      });
    } else {
      UI.toast({
        title: 'Офис продаж построен',
        text: '+' + formatRate(MB.salesRate(world)) + '/с',
        icon: 'icons/icon-coins.jpg?v=2', tone: 'good', key: 'sales-ready',
      });
    }
    const view = campViews[site.id];
    if (view) view.until = performance.now() + 5000;
    paintCampSigns();
    refreshCampSheet(true);
  }

  // «Полевая кухня» bought: level 1 — the canteen may be built; every next level — a new building
  // to rebuild it into (more seats once it stands).
  function onCanteenLevel(level) {
    const form = MB.canteenForm(Math.min(MB.CANTEEN_FORMS.length, level));
    UI.toast(level === 1
      ? { title: 'Полевая кухня доступна', icon: 'hq', tone: 'good', key: 'canteen-level-1' }
      : { title: 'Строим «' + form.name + '»', text: 'Кухня работает',
        icon: 'hq', tone: 'good', key: 'canteen-level-' + level });
    paintCampSigns();
    refreshCampSheet(true);
  }

  // «Офис продаж» bought on the site: level 1 — it may be built; every next level — more income.
  function onSalesLevel(level) {
    const forms = MB.campFormCount('sales');
    UI.toast(level === 1
      ? { title: 'Можно строить офис продаж', icon: 'icons/icon-coins.jpg?v=2', tone: 'good', key: 'sales-level-1' }
      : forms > 0
        ? { title: 'Строим «' + MB.campForm('sales', Math.min(forms, level)).name + '»', text: 'Доход сохранён',
          icon: 'icons/icon-coins.jpg?v=2', tone: 'good', key: 'sales-level-' + level }
        : { title: 'Офис продаж ' + level + '-го уровня', text: world.sales && world.sales.ready ? 'Приносит ' + formatRate(MB.salesRate(world)) + ' в секунду' : 'Больше дохода, когда достроят',
          icon: 'icons/icon-coins.jpg?v=2', tone: 'good', key: 'sales-level-' + level });
    paintCampSigns();
    refreshCampSheet(true);
  }

  // «Бытовки» / «Зона отдыха» / «Освещение» bought: level 1 — they may be built; every next level —
  // a new form.
  function onCampLevel(site, level) {
    const mast = site.kind === 'light';
    const form = MB.campForm(site.kind, Math.min(MB.campFormCount(site.kind), level));
    UI.toast(level === 1
      ? { title: CAMP_NAMES[site.kind] + ' · доступно', icon: mast ? 'moon' : 'hq', tone: 'good', key: site.kind + '-level-1' }
      : { title: 'Строим «' + form.name + '»', text: 'Прежний эффект сохранён',
        icon: mast ? 'moon' : 'hq', tone: 'good', key: site.kind + '-level-' + level });
    paintCampSigns();
    refreshCampSheet(true);
  }

  // The first worker turned away on a site explains the rule once.
  function onCanteenFull() {
    if (world.canteen.toldFull) return;
    world.canteen.toldFull = true;
    UI.toast({
      title: 'В столовой нет мест',
      text: 'Добавьте места в Центре персонала',
      icon: 'hq',
      tone: 'warn',
      key: 'canteen-full',
    });
  }

  // The first worker turned away at the lounge on a site explains the rule once.
  function onLoungeFull() {
    if (!world.lounge || world.lounge.toldFull) return;
    world.lounge.toldFull = true;
    UI.toast({
      title: 'В зоне отдыха нет мест',
      text: 'Улучшите Зону отдыха',
      icon: 'hq',
      tone: 'warn',
      key: 'lounge-full',
    });
  }

  // The sales office pays every few seconds: «+N» floats over its roof and flies into the counter.
  function onSalesPay(event) {
    const view = campViews.sales;
    if (view && currentScreen === 'build') floatWorldCoins(view.anchor.x, view.anchor.y - 0.4, view.anchor.z, event.coins);
    if (timeScale !== 20) pulseCoins();
    if (campSheet && campSheet.id === 'sales') refreshCampSheet(false);
  }

  function paintCampSigns() {
    Object.keys(campViews).forEach(function (id) { paintCampSign(campViews[id]); });
  }

  function paintCampSign(view) {
    const site = view.site;
    let state = 'is-idle';
    let line = 'Назначить рабочих';
    if (site.ready) {
      state = 'is-live';
      if (site.id === 'canteen') line = MB.DISH[site.dish] ? MB.DISH[site.dish].name : 'Без блюда';
      else if (site.kind === 'dorm') line = 'Коек <b>' + MB.dormBeds(world) + '</b> · спят ' + MB.dormSleepers(world);
      else if (site.kind === 'lounge') line = 'Мест <b>' + MB.loungeSeats(world) + '</b> · курят ' + MB.loungeSmokers(world);
      else if (site.kind === 'light') line = 'Ночь · работа −<b>' + environmentEffects('').nightSlow + '%</b>';
      else if (site.kind === 'reactor') line = 'Мана <b>+' + Math.round(campaign.manaRate || 0) + '</b>/мин';
      else line = '<b>+' + UI.escapeHtml(formatRate(MB.salesRate(world))) + '</b>/с';
    } else {
      const count = '<b>' + site.built + '/' + site.total + '</b>';
      if (site.assigned > 0) {
        state = 'is-building';
        line = count + ' · рабочих ' + MB.campCrew(world, site) + ' из ' + site.assigned;
      } else if (site.built > 0 || campRebuilding(site)) {
        line = count + ' · никто не строит';
      }
      if (campRebuilding(site) && site.assigned === 0) line = count + ' · назначить рабочих';
    }
    const progress = site.built / site.total;
    const html = '<span class="city-sign-main">' + (site.id === 'sales' ? '<img class="camp-sign-coin" src="icons/icon-coins.jpg?v=2" alt="">' : ICONS.hq) +
      '<span>' + UI.escapeHtml(campName(site)) + '</span></span><span class="city-sign-line">' + line + '</span>' +
      (site.ready ? '' : '<span class="city-sign-bar"><i style="width:' + Math.round(progress * 100) + '%"></i></span>');
    if (view.sign !== state + html) {
      view.sign = state + html;
      view.signEl.className = 'city-sign camp-sign ' + state;
      view.signEl.innerHTML = html;
    }
  }

  function placeCampSigns() {
    Object.keys(campViews).forEach(function (id) { placeCampSign(campViews[id]); });
  }

  function placeCampSign(view) {
    const sign = view.signEl;
    const site = view.site;
    // A foundation has no sign (its name board stands in the world; «Городок» in the HUD lists them).
    const show = !!(world && MB.campActive(world, site) && campaign && campaign.status === 'play' &&
      currentScreen === 'build' && !cityRoot.visible && !(campSheet && campSheet.id === site.id) &&
      (!site.ready || performance.now() < view.until));
    if (!show) {
      if (!sign.hidden) sign.hidden = true;
      return;
    }
    camera.updateMatrixWorld();
    campPoint.copy(view.anchor).project(camera);
    const visible = campPoint.z > -1 && campPoint.z < 1 && Math.abs(campPoint.x) < 1 && campPoint.y < 1 && campPoint.y > -1;
    if (sign.hidden === visible) sign.hidden = !visible;
    if (!visible) return;
    const x = Math.round((campPoint.x + 1) / 2 * MicroBuildersStage.width());
    const y = Math.round((1 - campPoint.y) / 2 * MicroBuildersStage.height());
    sign.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -100%)';
  }

  // The tapped camp building, if any.
  function pickCampView() {
    let picked = null;
    let best = Infinity;
    Object.keys(campViews).forEach(function (id) {
      const view = campViews[id];
      if (!MB.campActive(world, view.site) && !MB.campFoundation(world, view.site)) return;
      const hits = workerRaycaster.intersectObject(view.hit, false);
      if (hits.length > 0 && hits[0].distance < best) {
        best = hits[0].distance;
        picked = view;
      }
    });
    return picked;
  }

  // Tap on a camp building or its sign: the slider of the crew while it is going up, then its own
  // sheet — the canteen's menu, the sales office's income and upgrades.
  function openCamp(id) {
    const site = world && MB.campSite(world, id);
    if (!site || !(MB.campActive(world, site) || MB.campFoundation(world, site)) || campaign.status !== 'play') return;
    sheetInfoOpen = false;
    focusCamp(site);
    UI.overlay.open({
      id: 'camp',
      type: 'sheet',
      className: 'canteen-sheet',
      kicker: 'Строительный городок',
      title: campName(site),
      body: function (body, handle) {
        campSheet = { id: id, body: body, ready: null, level: campLevel(site) };
        body.addEventListener('input', onCampInput);
        body.addEventListener('click', onCampClick);
        refreshCampSheet(true);
        addSheetInfo(handle, body);
        // The sheet's height is part of the camera's free band (measureSafeArea).
        const card = body.closest('.overlay-card');
        if (card && window.ResizeObserver) {
          campSheet.resize = new ResizeObserver(queueSafeArea);
          campSheet.resize.observe(card);
        }
        queueSafeArea();
      },
      onClose: function () {
        const view = campViews[id];
        if (view) view.until = performance.now() + 5000;
        if (campSheet && campSheet.resize) campSheet.resize.disconnect();
        campSheet = null;
        queueSafeArea();
      },
    });
  }

  // «Городок» in the HUD: the camp buildings of the site in one list (the two light masts in one
  // row); a row flies the camera to its building and opens its window. The badge counts the
  // foundations a token would start now.
  function campKinds() {
    const kinds = [];
    const byKind = {};
    ((world && world.camp) || []).forEach(function (site) {
      if (!byKind[site.kind]) {
        byKind[site.kind] = [];
        kinds.push(site.kind);
      }
      byKind[site.kind].push(site);
    });
    return kinds.map(function (kind) { return { kind: kind, sites: byKind[kind], state: campKindState(byKind[kind]) }; });
  }

  function campKindState(sites) {
    const site = sites[0];
    if (MB.campFoundation(world, site)) return MB.campStartable(campaign, CAMP_NODES[site.kind]) ? 'start' : 'base';
    if (!MB.campActive(world, site)) return 'locked';
    return sites.every(function (one) { return one.ready; }) ? 'live' : 'building';
  }

  function paintCampButton() {
    const button = document.getElementById('camp-btn');
    const kinds = world && campaign && campaign.status === 'play' ? campKinds().filter(function (entry) { return entry.state !== 'locked'; }) : [];
    const on = kinds.length > 0;
    if (button.hidden === on) button.hidden = !on;
    if (!on) return;
    const ready = kinds.filter(function (entry) { return entry.state === 'start'; }).length;
    const badge = document.getElementById('camp-ready');
    if (badge.hidden === (ready > 0)) badge.hidden = ready === 0;
    setText('camp-ready', String(ready));
    if (campList) morphHtml(campList.body, campListHtml());
  }

  function campListHtml() {
    const token = '<img class="camp-row-token" src="icons/icon-gate-token.jpg" alt="жетон">';
    const coin = '<img class="camp-row-token" src="icons/icon-coins.jpg?v=2" alt="монет">';
    return '<div class="camp-list">' + campKinds().map(function (entry) {
      const site = entry.sites[0];
      const node = CAMP_NODES[site.kind];
      let line = '';
      if (entry.state === 'start') line = 'Основание · старт ' + token + (MB.TOKENS.campStart || 1) + ' + ' + coin + formatShort(MB.upgradeCost(node, 0, campaign));
      else if (entry.state === 'base') line = 'Основание · нужен ' + token + ' жетон';
      else if (entry.state === 'locked') line = node === 'reactor' ? 'Откройте в реакторе штаба' : 'Откройте в центре персонала';
      else if (entry.state === 'live') line = 'Работает · ур. ' + campLevel(site);
      else {
        let built = 0, total = 0, assigned = 0;
        entry.sites.forEach(function (one) { built += one.built; total += one.total; assigned += one.assigned; });
        line = 'Стройка <b>' + built + '/' + total + '</b> · ' + (assigned > 0 ? 'рабочих ' + assigned : 'никто не строит');
      }
      const icon = node === 'reactor' ? 'icon-hq-reactor.jpg' : officeIcon(node);
      return '<button type="button" class="camp-row is-' + entry.state + '" data-camp-go="' + site.id + '"' + (entry.state === 'locked' ? ' aria-disabled="true"' : '') + '>' +
        '<img class="camp-row-icon" src="icons/' + icon + '" alt="">' +
        '<span class="camp-row-text"><b>' + UI.escapeHtml(entry.state === 'live' || entry.state === 'building' ? campName(site) : CAMP_NAMES[site.kind]) + '</b>' +
        '<small>' + line + '</small></span>' +
        (entry.state === 'locked' ? ICONS.lock : ICONS.chevron) + '</button>';
    }).join('') + '</div>';
  }

  function openCampList() {
    UI.overlay.open({
      id: 'camp-list',
      type: 'sheet',
      className: 'camp-list-sheet',
      kicker: 'Строительный городок',
      title: 'Здания стройки',
      body: function (body) {
        campList = { body: body };
        body.innerHTML = campListHtml();
        body.addEventListener('click', function (event) {
          const row = event.target.closest('[data-camp-go]');
          if (!row) return;
          if (row.getAttribute('aria-disabled') === 'true') {
            shake(row);
            UI.toast({ text: row.dataset.campGo === 'reactor' ? 'Реактор стройки открывается в реакторе штаба' : 'Это здание открывается в центре персонала штаба', icon: 'lock', key: 'camp-locked', duration: 1800 });
            return;
          }
          UI.overlay.close('camp-list');
          openCamp(row.dataset.campGo);
        });
      },
      onClose: function () {
        campList = null;
      },
    });
  }

  // A tapped camp building: the camera flies to it, framed by its size; the open sheet narrows the
  // free band, so the building lands in the middle of what is left above it.
  function focusCamp(site) {
    const box = site.box;
    if (!box) return;
    const size = Math.max(box.x1 - box.x0, box.z1 - box.z0, box.h);
    cameraController.flyTo({
      target: { x: (box.x0 + box.x1) / 2, y: box.h * 0.4, z: (box.z0 + box.z1) / 2 },
      distance: Math.max(14, Math.min(cameraController.homeDistance || 60, 10 + 1.5 * size)),
    }, 0.6);
  }

  // The «i» in the head of a building sheet folds and unfolds its texts about the mechanics.
  function addSheetInfo(handle, body) {
    const head = handle.el && handle.el.querySelector('.overlay-head');
    if (!head || head.querySelector('.sheet-info-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'info-btn sheet-info-btn';
    button.textContent = 'i';
    button.setAttribute('aria-label', 'Как это работает');
    button.addEventListener('click', function () {
      sheetInfoOpen = !sheetInfoOpen;
      applySheetInfo(body);
    });
    head.insertBefore(button, head.querySelector('.overlay-close'));
    applySheetInfo(body);
  }

  function applySheetInfo(body) {
    body.querySelectorAll('.sheet-info').forEach(function (el) { el.hidden = !sheetInfoOpen; });
    const card = body.closest('.overlay');
    const button = card && card.querySelector('.sheet-info-btn');
    if (button) {
      button.classList.toggle('on', sheetInfoOpen);
      button.setAttribute('aria-expanded', String(sheetInfoOpen));
    }
  }

  function canteenFedCount() {
    let fed = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'builder' && builder.dish) fed += 1;
    }
    return fed;
  }

  function canteenFedText() {
    return canteenFedCount() + '/' + MB.workerCount(world);
  }

  function campCrewNote(site) {
    return site.assigned === 0 ? 'Никто не строит' : 'Строят: ' + MB.campCrew(world, site) + '/' + site.assigned;
  }

  function refreshCampSheet(full) {
    if (!campSheet || !world) return;
    const site = MB.campSite(world, campSheet.id);
    if (!site) return;
    const body = campSheet.body;
    const base = MB.campFoundation(world, site);
    if (full || campSheet.ready !== site.ready || campSheet.level !== campLevel(site) || campSheet.base !== base) {
      campSheet.ready = site.ready;
      campSheet.level = campLevel(site);
      campSheet.base = base;
      const live = site.id === 'canteen' ? canteenMenuHtml : site.kind === 'dorm' ? dormHtml : site.kind === 'lounge' ? loungeHtml : site.kind === 'light' ? lightHtml : site.kind === 'reactor' ? reactorHtml : salesHtml;
      body.innerHTML = base ? campFoundationHtml(site)
        : !site.ready
          ? campBuildHtml(site) + (campRebuilding(site) ? live(site) : '')
          : live(site) + campUpgradesHtml(site);
      applySheetInfo(body);
      return;
    }
    // The foundation's start button and the building's upgrades follow the coins and tokens.
    if (base) {
      morphHtml(body, campFoundationHtml(site));
      applySheetInfo(body);
      return;
    }
    const upgrades = body.querySelector('[data-camp-upgrades]');
    if (upgrades && site.ready) morphHtml(upgrades, campUpgradesInner(site));
    if (!site.ready) {
      const workers = MB.workerCount(world);
      body.querySelector('[data-camp-field="built"]').textContent = site.built;
      body.querySelector('[data-camp-field="bar"]').style.width = Math.round(site.built / site.total * 100) + '%';
      body.querySelector('[data-camp-field="note"]').textContent = campCrewNote(site);
      const slider = body.querySelector('[data-camp-field="crew"]');
      if (Number(slider.max) !== workers) slider.max = String(workers);
      body.querySelector('[data-camp-field="of"]').textContent = 'из ' + workers;
    } else if (site.id === 'canteen') {
      body.querySelector('[data-camp-field="fed"]').textContent = canteenFedText();
    } else {
      // In place: the buttons stay the same elements, so a press and a purchase flash survive the ticks.
      morphHtml(body, (site.kind === 'dorm' ? dormHtml : site.kind === 'lounge' ? loungeHtml : site.kind === 'light' ? lightHtml : site.kind === 'reactor' ? reactorHtml : salesHtml)(site) + campUpgradesHtml(site));
      applySheetInfo(body);
    }
  }

  // Brings `el`'s children to `html` touching only what differs: same tags keep their elements (the
  // attributes and texts are updated), anything else is replaced.
  function morphHtml(el, html) {
    const next = document.createElement(el.tagName);
    next.innerHTML = html;
    morphChildren(el, next);
  }

  function morphChildren(el, next) {
    const want = Array.prototype.slice.call(next.childNodes);
    for (let i = 0; i < want.length; i++) {
      const have = el.childNodes[i];
      const node = want[i];
      if (!have) {
        el.appendChild(node);
      } else if (have.nodeType !== node.nodeType || have.nodeName !== node.nodeName) {
        el.replaceChild(node, have);
      } else if (node.nodeType === 3 || node.nodeType === 8) {
        if (have.nodeValue !== node.nodeValue) have.nodeValue = node.nodeValue;
      } else {
        const keep = have.hidden;
        for (let a = have.attributes.length - 1; a >= 0; a--) {
          const name = have.attributes[a].name;
          if (!node.hasAttribute(name)) have.removeAttribute(name);
        }
        for (let a = 0; a < node.attributes.length; a++) {
          const attr = node.attributes[a];
          if (have.getAttribute(attr.name) !== attr.value) have.setAttribute(attr.name, attr.value);
        }
        // «i» texts keep their folded state (applySheetInfo sets it after).
        if (have.classList.contains('sheet-info')) have.hidden = keep;
        morphChildren(have, node);
      }
    }
    while (el.childNodes.length > want.length) el.removeChild(el.lastChild);
  }

  // What a camp building does once it stands (the «i» of its sheet and its foundation).
  function campWhatHtml(site) {
    return site.id === 'canteen'
      ? '<p>Когда столовая будет готова, голодные рабочие будут быстро обедать у неё и до следующего обеда получать бафф блюда.</p>'
      : site.kind === 'dorm'
        ? '<p>Когда бытовки будут готовы, рабочие, кому хватит коек, будут спать в них — рядом со стройкой, а не в дальних вагончиках, и на ' +
          Math.round((1 - MB.dormSleepScale(campaign)) * 100) + '% меньше. Коек: ' + (MB.DORM.beds || 3) + ' за уровень.</p>'
        : site.kind === 'lounge'
          ? '<p>Когда зона отдыха будет готова, рабочие будут ходить курить к ней — у стройки, а не в 10–20 клетках от здания, и перекур там на ' +
            Math.round((1 - (MB.LOUNGE.smokeScale || 1)) * 100) + '% короче. Мест: ' + (MB.LOUNGE.seats || 2) + ' за уровень; кому не хватило, идёт курить на обычное место.</p>'
        : site.kind === 'light'
          ? '<p>Две прожекторные мачты по бокам здания. Каждая готовая мачта снимает ' + Math.round(MB.lightReliefPerLevel(campaign) * 100) +
            '% ночного штрафа за свой уровень. Мачты строятся отдельно, у каждой свой ползунок рабочих.</p>'
        : site.kind === 'reactor'
          ? '<p>Когда реактор будет готов, магическая сфера на его вершине начнёт копить ману для заклинаний: +' + MB.REACTOR_SITE.manaPerLevel +
            ' в минуту за уровень. Пока его нет, маны нет. На перестройке прежний уровень продолжает давать ману.</p>'
          : '<p>Когда офис продаж будет готов, он сам будет приносить монеты стройки — раз в ' + MB.SALES.payoutSeconds + ' секунд. Доход прокачивается в самом офисе за монеты, его уровень — здесь же, в окне здания.</p>';
  }

  function campBuildHtml(site) {
    const workers = MB.workerCount(world);
    const pct = Math.round(site.built / site.total * 100);
    const what = campWhatHtml(site);
    return '<div class="sheet-info">' + what +
      '<p>Строят только рабочие, техника не помогает; кубы городка денег не приносят. Рабочий уходит на эту стройку, когда возвращается к столу за планом, ' +
      'а снятый с неё возвращается к основному зданию после текущей ходки.</p></div>' +
      campRebuildHtml(site) +
      '<div class="canteen-progress"><span>Кубы <b data-camp-field="built">' + site.built + '</b>/' + site.total + '</span>' +
      '<i><b data-camp-field="bar" style="width:' + pct + '%"></b></i></div>' +
      '<label class="canteen-crew"><span class="canteen-crew-head">Рабочие <span><b data-camp-field="value">' + site.assigned + '</b> <small data-camp-field="of">из ' + workers + '</small></span></span>' +
      '<input type="range" data-camp-field="crew" min="0" max="' + workers + '" step="1" value="' + site.assigned + '">' +
      '<p class="canteen-note" data-camp-field="note">' + UI.escapeHtml(campCrewNote(site)) + '</p></label>';
  }

  // The site line of a camp building (both lighting masts are the one «Освещение»).
  function campLine(site) {
    return CAMP_NODES[site.kind || site.id];
  }

  // A foundation: what the building gives and «Начать стройку» for a token and the coins of level 1.
  function campFoundationHtml(site) {
    const kind = campLine(site);
    const cost = MB.upgradeCost(kind, 0, campaign);
    const need = MB.TOKENS.campStart || 1;
    const tokens = campaign.tokens || 0;
    const coinsShortBy = campaign.freePurchases ? 0 : Math.max(0, cost - campaign.coins);
    const short = tokens < need || coinsShortBy > 0;
    const shortText = tokens < need ? 'Нет жетона: жетоны даются в начале каждой стройки' : 'Не хватает ' + formatCompact(coinsShortBy) + ' монет';
    const form = site.target ? MB.campForm(site.kind, 1) : null;
    return '<p class="camp-foundation-lead">Основание готово' + (form ? ' · дальше «' + UI.escapeHtml(form.name) + '»' : '') + '</p>' + campWhatHtml(site) +
      '<button type="button" class="buy-btn wide camp-start' + (short ? ' short' : '') + '" data-camp-start="' + kind + '"' +
      (short ? ' aria-disabled="true" data-short="' + UI.escapeHtml(shortText) + '"' : '') + '>' +
      '<span>Начать стройку</span><img class="currency-icon camp-token" src="icons/icon-gate-token.jpg" alt="жетон">' + need +
      ' <img class="currency-icon" src="icons/icon-coins.jpg?v=2" alt="монеты">' + (campaign.freePurchases ? '0' : formatCompact(cost)) + '</button>' +
      '<p class="canteen-note">Жетонов на этой стройке: ' + tokens + '. Ими же открываются проходы графа улучшений.</p>';
  }

  // The ready building's own upgrades: the next form (a rebuild, up to the personnel centre's limit)
  // and its upgrades (opened in the personnel centre), all for the site's coins.
  function campUpgradesHtml(site) {
    return '<div class="camp-upgrades" data-camp-upgrades>' + campUpgradesInner(site) + '</div>';
  }

  function campUpgradesInner(site) {
    const session = window.MicroBuildersBalance.session;
    const line = campLine(site);
    const icons = window.MicroBuildersUpgradeIcons || {};
    let html = '<h3 class="camp-upgrades-head">Улучшения здания</h3>';
    const level = campaign.purchases[line] || 0;
    if (level < session[line].max) {
      const next = MB.campForm(site.kind, level + 1);
      const name = 'Уровень ' + (level + 1) + (next ? ' · «' + next.name + '»' : '');
      html += siteUpgradeCapped(line)
        ? campUpgradeRow(line, name, CAP_TEXTS[line] ? capText(line) : 'Откроется в центре персонала', icons, true)
        : campUpgradeRow(line, name, 'Перестройка: пока новое здание строится, работает старое', icons, false);
    }
    Object.keys(MB.CAMP_UPGRADE_OF).forEach(function (kind) {
      if (MB.CAMP_UPGRADE_OF[kind] !== line) return;
      const spec = session[kind];
      const open = Meta.sessionLineOpen(meta, kind);
      const owned = campaign.purchases[kind] || 0;
      const info = !open ? 'Откройте в центре персонала' : 'Ур. ' + owned + '/' + spec.max + ' · ' + upgradeLabel(kind);
      html += campUpgradeRow(kind, spec.name, info, icons, !open);
    });
    return html;
  }

  function campUpgradeRow(kind, name, info, icons, locked) {
    const spec = window.MicroBuildersBalance.session[kind];
    const level = campaign.purchases[kind] || 0;
    const maxed = level >= spec.max;
    const cost = maxed ? 0 : MB.upgradeCost(kind, level, campaign);
    // The 3rd and 5th levels of a building ask tokens too (logic.js → campLevelTokens).
    const tokens = maxed ? 0 : MB.campLevelTokens(kind, level + 1);
    const tokensShort = tokens > (campaign.tokens || 0);
    const coinsShort = !campaign.freePurchases && campaign.coins < cost;
    const button = locked || maxed
      ? '<small class="camp-up-state">' + (maxed ? 'Максимум' : '🔒') + '</small>'
      : buyButtonHtml({ attrs: 'data-camp-buy="' + kind + '"', icon: 'icons/icon-coins.jpg?v=2',
        price: (campaign.freePurchases ? '0' : formatCompact(cost)) + (tokens ? ' <img class="currency-icon" src="icons/icon-gate-token.jpg" alt="жетоны">' + tokens : ''),
        have: campaign.freePurchases ? cost : campaign.coins, cost: cost, short: coinsShort || tokensShort,
        shortText: tokensShort ? 'Нужно жетонов: ' + tokens + ', есть ' + (campaign.tokens || 0) : 'Не хватает ' + formatCompact(Math.max(0, cost - campaign.coins)) + ' монет' });
    return '<div class="camp-up' + (locked ? ' locked' : '') + '" data-camp-row="' + kind + '"><img src="icons/' + (icons[kind] || 'icon-up-speed.jpg') + '" alt="">' +
      '<span><b>' + UI.escapeHtml(name) + '</b><small>' + UI.escapeHtml(info) + '</small></span>' + button + '</div>';
  }

  // «Строим «Кафе»»: what goes up and that the canteen keeps serving meanwhile.
  function campRebuildHtml(site) {
    if (!site.target) return '';
    const form = MB.campForm(site.kind, site.target);
    return '<p class="canteen-wallet">' + (campRebuilding(site) ? 'Перестройка' : 'Стройка') + ' · ' + UI.escapeHtml(form.name) + ' · ур. ' + site.target + '</p>' +
      (campRebuilding(site) ? '<div class="sheet-info"><p>Во время перестройки сохраняется эффект прежнего уровня. Назначьте рабочих, чтобы завершить новый.</p></div>' : '');
  }

  // The state of a camp building at a glance: a row of small stat chips (label over value).
  function campStatsHtml(items) {
    return '<div class="camp-stats">' + items.map(function (item) {
      return '<span class="camp-stat"><small>' + item[0] + '</small><b>' + item[1] + '</b></span>';
    }).join('') + '</div>';
  }

  // A site-coin price on a buy button (the coin, as the HUD shows it).
  function percentLess(scale) {
    return '−' + Math.round((1 - (scale || 1)) * 100) + '%';
  }

  // The dorm: beds, who sleeps there tonight.
  function dormHtml(site) {
    return '<div class="sheet-info"><p>Когда рабочий выбился из сил, он идёт спать в бытовки, если там есть свободная койка: рядом со стройкой, а сон на ' +
      Math.round((1 - MB.dormSleepScale(campaign)) * 100) + '% короче. Кому коек не хватило, уходит в дальние вагончики. Уровень бытовок — прокачка «Бытовки» стройки, ' +
      'выше 1-го — «Уровни бытовок» в центре персонала.</p></div>' +
      campStatsHtml([['Уровень', site.form || 0], ['Спят', MB.dormSleepers(world) + '/' + MB.dormBeds(world)], ['Сон', percentLess(MB.dormSleepScale(campaign))]]);
  }

  // The lounge: seats, who smokes there now, how many found no seat.
  function loungeHtml(site) {
    return '<div class="sheet-info"><p>Рабочий идёт на перекур к зоне отдыха — рядом со стройкой, а перекур тут на ' +
      Math.round((1 - (MB.LOUNGE.smokeScale || 1)) * 100) + '% короче. Позвавший на перекур ведёт сюда и свою компанию. Если все места заняты, ' +
      'рабочий идёт курить на обычное место, подальше от стройки. Уровень зоны отдыха — прокачка «Зона отдыха» стройки, ' +
      'выше 1-го — «Уровни зоны отдыха» в центре персонала.</p>' +
      (site.turnedAway > 0 ? '<p>Без места ушли за стройку: ' + site.turnedAway + '.</p>' : '') + '</div>' +
      campStatsHtml([['Уровень', site.form || 0], ['Курят', MB.loungeSmokers(world) + '/' + MB.loungeSeats(world)], ['Перекур', percentLess(MB.LOUNGE.smokeScale)]]);
  }

  // The lighting masts: what is left of the night penalty.
  // The site reactor: mana a minute and the store by the level of the form that stands.
  function reactorHtml(site) {
    return '<div class="sheet-info"><p>Пока реактор стоит, на стройке копится мана для заклинаний. Каждый уровень — больше маны в минуту и больше запас. ' +
      'Уровень — прокачка «Реактор» стройки; заклинания изучаются в реакторе штаба.</p></div>' +
      campStatsHtml([['Уровень', site.form || 0], ['Мана', '+' + Math.round(campaign.manaRate || 0) + '/мин'], ['Запас', Math.floor(campaign.mana || 0) + '/' + Math.round(campaign.manaMax || 0)]]);
  }

  function lightHtml(site) {
    const masts = (world.lights || []).filter(function (mast) { return mast.form >= 1; }).length;
    return '<div class="sheet-info"><p>Ночью мачты светят прожекторами на здание. Каждая готовая мачта снимает ' + Math.round(MB.lightReliefPerLevel(campaign) * 100) +
      '% ночного штрафа за свой уровень (две мачты 5-го уровня — весь штраф). Уровень — прокачка «Освещение» стройки, выше 1-го — «Уровни освещения» в центре персонала.</p></div>' +
      campStatsHtml([['Уровень', site.form || 0], ['Мачты', masts + '/' + (world.lights || []).length], ['Ночью', '−' + environmentEffects('').nightSlow + '%']]);
  }

  // The canteen's menu: a row a building level (MB.CANTEEN_ROWS) — the dish of the day, a pastry to take
  // away (Кафе), the seasonal dishes that work by themselves (Бистро), the second dish (Ресторан), the
  // chef's signature (Гранд-ресторан). A row above the standing level shows where it opens.
  // A dish name in quotes, unless it already holds its own (Ужин «Грузчик»).
  function dishTitle(id) {
    const name = MB.DISH[id] ? MB.DISH[id].name : id;
    return name.indexOf('«') >= 0 ? name : '«' + name + '»';
  }

  const CANTEEN_MENU = [
    { slot: 'dish', row: 'day', level: 'day', title: 'Блюдо дня', hint: 'одно блюдо всем до следующего обеда' },
    { slot: 'snack', row: 'snack', level: 'snack', title: 'С собой', hint: 'перекус на месте, когда снова проголодается' },
    { kitchen: true, level: 'kitchen', title: 'Кухня' },
    { slot: 'dish2', row: 'day', level: 'dish2', title: 'Второе блюдо', hint: 'одинаковые эффекты — сильнейший' },
    { slot: 'signature', row: 'signature', level: 'signature', title: 'Ультимативное', hint: 'блюдо шефа со своим правилом', kitchenLevel: 5 },
    { slot: 'grand', row: 'grand', level: 'grand', title: 'Гранд-обед', hint: 'меню гранд-обеда', kitchenLevel: 5 },
  ];

  // The kitchen block of the canteen window: its level and staff, the chef, the secret dishes, the grand
  // dinners — and the button that gives workers to it.
  function kitchenHtml() {
    const K = MB.KITCHEN;
    const kitchen = MB.kitchenOf(world);
    const level = MB.canteenBuiltLevel(world);
    const chef = MB.chefLevel(world);
    const next = K.chefLevels[chef];
    const power = Math.round((MB.chefPower(world) - 1) * 100);
    let html = '<div class="kitchen-box"><img src="icons/icon-kitchen.jpg" alt=""><div>';
    html += '<b>Кухня ур. ' + kitchen.level + '/' + K.staff.length + (kitchen.level ? ' · на кухне ' + kitchen.staff.length : '') + '</b>';
    html += kitchen.level ? '<small>Шеф-повар ур. ' + chef + (next ? ' · опыт ' + Math.floor(kitchen.xp) + '/' + next : '') + ' · блюда +' + power + '%</small>'
      : '<small>Шеф растёт с каждым обедом и усиливает блюда. Рабочие кухни не строят до сдачи</small>';
    html += '</div>';
    if (kitchen.level < K.staff.length) {
      const need = MB.kitchenStaffNeeded(world);
      const ok = MB.kitchenOpenable(world);
      html += '<button type="button" class="kitchen-buy' + (ok ? '' : ' short') + '" data-kitchen-buy' + (ok ? '' : ' aria-disabled="true"') + '>' +
        (kitchen.level ? 'Расширить' : 'Открыть') + '<small>' + (!ok && need > 0 ? 'мало рабочих' : need > 0 ? need + ' ' + UI.plural(need, 'рабочий', 'рабочих', 'рабочих') : 'без рабочих') + '</small></button>';
    }
    html += '</div>';
    if (kitchen.level && campaign.foremen && campaign.foremen.feast && kitchen.level === 1) html += '<p class="canteen-note">«Повар артели» встал на кухню вместо рабочих</p>';
    if (level >= (MB.CANTEEN_ROWS.secrets || 4) && kitchen.level) {
      const secrets = MB.CANTEEN.dishes.filter(function (dish) { return dish.secret; });
      const left = secrets.filter(function (dish) { return (campaign.canteenDishes || []).indexOf(dish.id) < 0; });
      const found = secrets.length - left.length;
      // The chance this meal finds any of the dishes still unknown.
      const factor = (campaign.discoveryMultiplier || 1) * (K.discovery[kitchen.level - 1] || 1);
      const chance = 1 - left.reduce(function (miss, dish) { return miss * (1 - Math.min(1, (dish.chance || 0) * factor)); }, 1);
      html += '<div class="kitchen-line"><img src="icons/icon-secret-book.jpg" alt=""><span>Секретные блюда: <b>' + found + ' из ' + secrets.length + '</b> · шанс за обед ' +
        (chance * 100).toFixed(2).replace('.', ',') + '% · множитель ×' + (campaign.discoveryMultiplier || 1).toFixed(4).replace('.', ',') + '</span></div>';
    }
    if (MB.grandReady(world)) {
      const left = (K.grandCubes || 200) - (world.grandCubes || 0);
      const stacks = Object.keys(world.grandStacks || {}).map(function (effect) {
        return '+' + Math.round(world.grandStacks[effect] * 100) + '% ' + (GRAND_EFFECTS[effect] || effect);
      }).join(', ');
      html += '<div class="kitchen-line"><img src="icons/icon-grand-dinner.jpg" alt=""><span>Гранд-обед через <b>' + left + '</b> ' + UI.plural(left, 'куб', 'куба', 'кубов') +
        (world.grandDinners ? ' · было ' + world.grandDinners + (stacks ? ' · ' + stacks : '') : '') + '</span></div>';
    }
    return html;
  }

  function canteenMenuHtml(canteen) {
    const owned = campaign.canteenDishes || [];
    const level = MB.canteenBuiltLevel(world);
    const power = MB.campBoost(campaign, 'chef');
    let html = '<div class="sheet-info"><p>Проголодавшись, рабочий идёт в столовую: есть место — обедает и получает блюда меню до следующего обеда; нет — работает голодным, на пределе уходит обедать в город.</p>' +
      (canteen.turnedAway > 0 ? '<p>Без места за стройку: ' + canteen.turnedAway + '.</p>' : '') + '</div>' +
      campStatsHtml([['Уровень', level], ['Мест', MB.canteenSeats(world)], ['Обед', Math.round(campaign.canteenMealSeconds) + ' с'],
        ['С блюдом', '<span data-camp-field="fed">' + canteenFedText() + '</span>']]);
    const kitchenLevel = MB.kitchenOf(world).level;
    CANTEEN_MENU.forEach(function (menu) {
      const opens = MB.CANTEEN_ROWS[menu.level] || 1;
      const formOpen = Math.max(1, level) >= opens;
      const open = formOpen && (!menu.kitchenLevel || kitchenLevel >= menu.kitchenLevel);
      const form = MB.campForm('canteen', opens);
      const lock = !formOpen ? 'с ' + opens + '-го уровня' + (form ? ' «' + UI.escapeHtml(form.name) + '»' : '') : 'нужна кухня ' + menu.kitchenLevel + '-го уровня';
      html += '<h4 class="canteen-row' + (open ? '' : ' locked') + '">' + menu.title + ' <small>' + (open ? menu.hint || '' : lock) + '</small></h4>';
      if (menu.kitchen) {
        if (formOpen) html += kitchenHtml();
        return;
      }
      if (!open) return;
      const dishes = MB.CANTEEN.dishes.filter(function (dish) { return dish.row === menu.row && owned.indexOf(dish.id) >= 0; });
      let tiles = '';
      if (menu.slot === 'snack') {
        tiles += '<li><button type="button" class="canteen-dish' + (!canteen.snack ? ' on' : '') + '" data-slot="snack" data-dish=""><b>Без выпечки</b><span>Каждый голод — в столовую</span><small>' +
          (!canteen.snack ? 'Сейчас' : 'Выбрать') + '</small></button></li>';
      }
      dishes.forEach(function (dish) {
        const ready = Math.max(1, level) >= (dish.level || 1);
        const on = canteen[menu.slot] === dish.id;
        const state = !ready ? 'с ' + dish.level + '-го ур.' : on ? 'Готовят' : dish.secret ? 'Секрет шефа' : 'Выбрать';
        tiles += '<li><button type="button" class="canteen-dish has-icon' + (on ? ' on' : '') + (ready ? '' : ' locked') + '"' +
          (!ready ? ' disabled' : ' data-slot="' + menu.slot + '" data-dish="' + dish.id + '"') + '>' +
          '<img class="dish-icon" src="icons/icon-dish-' + dish.id + '.jpg" alt="">' +
          '<b>' + UI.escapeHtml(dish.name) + '</b><span>' + UI.escapeHtml(MB.dishText(dish.id, power)) + '</span><small>' + state + '</small></button></li>';
      });
      html += tiles ? '<ul class="canteen-dishes">' + tiles + '</ul>' : '<p class="canteen-note">Блюда этой строки изучаются в центре персонала</p>';
    });
    const missing = MB.CANTEEN.dishes.filter(function (dish) { return !dish.secret && owned.indexOf(dish.id) < 0; }).length;
    if (missing > 0) html += '<p class="canteen-note camp-more">Ещё ' + missing + ' ' + UI.plural(missing, 'блюдо', 'блюда', 'блюд') + ' — в центре персонала</p>';
    return html;
  }

  // The sales office: income now, the next payout and its two upgrades for site coins.
  function salesHtml(sales) {
    const rate = MB.salesRate(world);
    const left = Math.max(0, MB.SALES.payoutSeconds - sales.clock);
    const mult = MB.salesMultiplier(world);
    const rows = ['managers', 'showroom'].map(function (kind) {
      const spec = MB.SALES.upgrades[kind];
      const offer = MB.salesOffer(world, kind);
      const level = sales.upgrades[kind];
      let effect;
      if (kind === 'managers') {
        effect = offer ? '+' + formatRate(offer.gain) + '/с · окупится за ' + MB.formatClock(offer.payback) : '';
      } else {
        const perCube = (spec.perCube * mult).toFixed(3).replace(/0+$/, '').replace('.', ',');
        effect = offer ? '+' + perCube + '/с за куб здания' : '';
      }
      const tail = offer
        ? buyButtonHtml({ attrs: 'data-buy-sales="' + kind + '"', icon: 'icons/icon-coins.jpg?v=2', price: UI.escapeHtml(formatCompact(offer.cost)),
          have: campaign.freePurchases ? Infinity : campaign.coins, cost: offer.cost })
        : '<small>Максимум</small>';
      return '<li class="canteen-dish" data-sales="' + kind + '"><b>' + UI.escapeHtml(spec.name) + ' <em>' + level + '/' + spec.max + '</em></b>' + (effect ? '<span>' + UI.escapeHtml(effect) + '</span>' : '') + tail + '</li>';
    }).join('');
    return '<div class="sheet-info"><p>Офис приносит монеты стройки сам, раз в ' + MB.SALES.payoutSeconds + ' секунд: ' + MB.SALES.levelRate +
      ' в секунду за уровень офиса, «Менеджеры» и «Шоу-рум» — доход за каждый построенный куб основного здания, поэтому большое здание к концу приносит больше.</p>' +
      '<p>Уровень офиса — прокачка «Офис продаж» стройки: каждый уровень — ещё +' + MB.SALES.levelRate + ' в секунду и +' + Math.round(MB.SALES.levelBonus * 100) +
      '% ко всему доходу офиса. Уровни выше разрешает прокачка «Уровни офиса продаж» в центре персонала.</p></div>' +
      '<p class="sheet-info">Всего принёс: ' + UI.escapeHtml(formatShort(sales.earned)) + '</p>' +
      campStatsHtml([['Уровень', MB.salesBuiltLevel(world) + (mult > 1 ? ' <i>×' + mult.toFixed(1).replace('.', ',') + '</i>' : '')],
        ['Доход', '<img class="currency-icon" src="icons/icon-coins.jpg?v=2" alt="">+' + UI.escapeHtml(formatRate(rate)) + '/с'], ['Выплата', 'через ' + Math.ceil(left) + ' с']]) +
      '<ul class="canteen-dishes">' + rows + '</ul>';
  }

  function onCampInput(event) {
    const slider = event.target.closest('[data-camp-field="crew"]');
    if (!slider || !campSheet) return;
    const site = MB.campSite(world, campSheet.id);
    MB.setCampCrew(world, campSheet.id, Number(slider.value));
    campSheet.body.querySelector('[data-camp-field="value"]').textContent = site.assigned;
    campSheet.body.querySelector('[data-camp-field="note"]').textContent = campCrewNote(site);
    paintCampSigns();
  }

  function onCampClick(event) {
    if (!campSheet) return;
    const kitchenBuy = event.target.closest('[data-kitchen-buy]');
    if (kitchenBuy) {
      if (!MB.buyKitchen(world)) {
        shake(kitchenBuy);
        UI.toast({ text: 'Не хватает свободных рабочих без ранга бригадира: нужно ' + MB.kitchenStaffNeeded(world), icon: 'icons/icon-kitchen.jpg', tone: 'warn', key: 'kitchen-short', duration: 2200 });
        return;
      }
      consumeEvents();
      refreshCampSheet(true);
      saveLive({ awaySince: null });
      return;
    }
    const dish = event.target.closest('[data-dish]');
    if (dish && world.canteen && MB.setCanteenSlot(world, dish.dataset.slot || 'dish', dish.dataset.dish)) {
      refreshCampSheet(true);
      paintCampSigns();
      saveLive({ awaySince: null });
      return;
    }
    const start = event.target.closest('[data-camp-start]');
    if (start) {
      startCampBuilding(start);
      return;
    }
    const campBuy = event.target.closest('[data-camp-buy]');
    if (campBuy) {
      buyCampUpgrade(campBuy);
      return;
    }
    const buy = event.target.closest('[data-buy-sales]');
    if (!buy) return;
    const kind = buy.dataset.buySales;
    const offer = MB.salesOffer(world, kind);
    if (!offer) return;
    const free = campaign.freePurchases;
    if (!MB.buySalesUpgrade(world, kind)) {
      if (!free && campaign.coins < offer.cost) {
        shake(buy);
        coinsShort(offer.cost);
      }
      return;
    }
    refreshCampSheet(true);
    paintCampSigns();
    paintHud();
    saveLive({ awaySince: null });
    buyFlash('[data-sales="' + kind + '"]', free ? 0 : offer.cost);
  }

  // «Начать стройку» on a foundation: a token and the coins of level 1; the blue blueprint goes up.
  function startCampBuilding(button) {
    const kind = button.dataset.campStart;
    const cost = MB.upgradeCost(kind, 0, campaign);
    if (!MB.startCamp(campaign, world, kind)) {
      shake(button);
      UI.toast({ text: button.dataset.short || 'Сейчас не начать', icon: 'icons/icon-gate-token.jpg', tone: 'warn', key: 'camp-start-short', duration: 2200 });
      return;
    }
    tone(620, 0.12);
    consumeEvents();
    refreshSimEstimate();
    hudDirty = true;
    paintHud();
    refreshCampSheet(true);
    paintCampSigns();
    saveLive({ awaySince: null });
    if (!campaign.freePurchases && cost > 0) floatCoins('−' + formatShort(cost), 'spend');
    UI.toast({ text: 'Стройка начата', icon: 'icons/icon-gate-token.jpg', tone: 'good', key: 'camp-start' });
  }

  // A level or an upgrade of a camp building bought in its window.
  function buyCampUpgrade(button) {
    const kind = button.dataset.campBuy;
    if (!world || campaign.status !== 'play') return;
    const cost = MB.upgradeCost(kind, campaign.purchases[kind], campaign);
    if (!MB.buyUpgrade(campaign, world, kind)) {
      if (button.getAttribute('aria-disabled') === 'true') buyShort(button, 'icons/icon-coins.jpg?v=2');
      return;
    }
    tone(680, 0.09);
    consumeEvents();
    refreshSimEstimate();
    hudDirty = true;
    paintHud();
    refreshCampSheet(true);
    paintCampSigns();
    saveLive({ awaySince: null });
    buyFlash('[data-camp-row="' + kind + '"]', campaign.freePurchases ? 0 : cost);
  }

  // Menu «Перемотать на уровень»: the story up to this level done, the HQ buildings that open by then
  // built (Meta.devFastForward), then straight into the level with the prefilled crew.
  function fastForwardTo(index) {
    if (contractLocked()) return;
    Meta.devFastForward(meta, index);
    // What the rewind bought is not the playtest's: noted as one event, the purchase scan starts anew.
    journalNote('jump', { level: index + 1 });
    journalLevels = journalLevelsNow();
    // An HQ site whose building the jump has just finished is gone: nothing to save on leaving it.
    if (liveKey && !Meta.site(meta, liveKey)) liveKey = null;
    requestRun({ mode: 'campaign', levelIndex: index, reason: 'jump' });
    syncCity();
    UI.toast({ text: 'Уровень ' + (index + 1) + ': прошлые уровни пройдены, здания штаба до него построены', icon: 'hq', key: 'jump-done' });
  }

  // ---------- playtest journal and report (menu ☰ → «Отчёт плейтеста», docs/gdd/16-ux-flow.md) ----------
  // meta.journal: the company's active seconds (the page on screen), the seconds at each tempo and the
  // playtest's events at those seconds — runs started, finished, failed and abandoned, the first
  // purchase on a site, rewinds. Purchases and new foremen come from a diff of their levels once a
  // second, so the panels, the HQ, chests and the school need no hooks of their own (JOURNAL_CAP and
  // the scan's state are declared before boot(): a restored site can finish during it).
  function journalNote(type, data) {
    const events = meta.journal.events;
    events.push(Object.assign({ t: Math.round(meta.journal.active), type: type }, data));
    if (events.length > JOURNAL_CAP) events.splice(0, events.length - JOURNAL_CAP);
  }

  function tickJournal(dt) {
    if (document.visibilityState === 'hidden') return;
    const journal = meta.journal;
    const seconds = Math.min(dt, 1);
    journal.active += seconds;
    journal.tempo[timeScale] = (journal.tempo[timeScale] || 0) + seconds;
    journalScanIn -= seconds;
    if (journalScanIn > 0) return;
    journalScanIn = 1;
    const levels = journalLevelsNow();
    if (journalLevels) {
      Object.keys(levels).forEach(function (key) {
        const was = journalLevels[key] || 0;
        if (levels[key] > was) journalNote(key.indexOf('card:') === 0 ? 'card' : 'buy', { what: key, from: was, to: levels[key] });
      });
    }
    journalLevels = levels;
  }

  // What the company has bought or been granted, as «kind:id» → level.
  function journalLevelsNow() {
    const levels = {};
    const add = function (prefix, map, field) {
      Object.keys(map || {}).forEach(function (id) {
        const value = field ? map[id] && map[id][field] : map[id];
        if (value > 0) levels[prefix + id] = value;
      });
    };
    add('office:', meta.office);
    add('tech:', meta.tech);
    add('personnel:', meta.personnel);
    add('dish:', meta.cookbook);
    add('school:', meta.school.upgrades);
    add('booster:', meta.supply.boosters);
    add('training:', meta.training.upgrades);
    add('spell:', meta.reactor.spells);
    add('plot:', meta.plots);
    add('hq:', meta.hq);
    ['capacityLevel', 'intervalLevel', 'rewardLevel', 'capitalLevel'].forEach(function (id) { if (meta.exchange[id] > 0) levels['exchange:' + id] = meta.exchange[id]; });
    if (meta.supply.slots > 0) levels['supply:slots'] = meta.supply.slots;
    add('card:', meta.cards, 'level');
    return levels;
  }

  // A run as the journal keeps it (a campaign or a site snapshot): mode, name, story number, tier.
  function journalRun(c) {
    const run = { mode: c.runMode, name: Meta.siteName(c.runMode, c.levelIndex, c.runPayload) };
    if (c.runMode !== 'hq') run.level = c.levelIndex + 1;
    if (c.runMode === 'school' && c.runPayload) run.tier = c.runPayload.tier;
    if (c.runMode === 'contract' && c.runPayload) run.contract = c.runPayload.contractIndex + 1;
    return run;
  }

  // The site's losses (ledgerLosses) in whole percents, the zero ones dropped.
  function journalLosses(shares) {
    const percents = {};
    Object.keys(shares || {}).forEach(function (key) {
      const value = Math.round(shares[key] * 100);
      if (value > 0) percents[key] = value;
    });
    return percents;
  }

  // The loss a purchase answers (LOSS_LINES): a technology by its first line, a personnel line by its id.
  function journalLoss(what) {
    const cut = what.indexOf(':');
    const kind = what.slice(0, cut);
    const id = what.slice(cut + 1);
    if (kind === 'tech' && Meta.TECH[id] && Meta.TECH[id].opens) return LOSS_LINES[Meta.TECH[id].opens[0]] || null;
    if (kind === 'personnel') return LOSS_LINES[id] || null;
    return null;
  }

  function journalWhat(what, to) {
    const cut = what.indexOf(':');
    const kind = what.slice(0, cut);
    const id = what.slice(cut + 1);
    const name = function (spec) { return spec && spec.name ? '«' + spec.name + '»' : id; };
    const level = to > 1 ? ' → ур. ' + to : '';
    if (kind === 'office') return 'Офис: ' + name(Meta.OFFICE[id]) + level;
    if (kind === 'tech') return (Meta.TECH[id] && Meta.TECH[id].center === 'personnel' ? 'Центр персонала: ' : 'Техцентр: ') + name(Meta.TECH[id]);
    if (kind === 'personnel') return 'Центр персонала: ' + name(Meta.PERSONNEL_UPGRADES[id]) + level;
    if (kind === 'dish') return 'Блюдо ' + name(MB.DISH[id]);
    if (kind === 'school') return 'Школа: ' + name(Meta.SCHOOL.upgrades[id]) + level;
    if (kind === 'booster') return 'Снабжение: ' + name(Meta.BOOSTERS[id]) + level;
    if (kind === 'training') return 'Учебный центр: ' + name(Meta.TRAINING_UPGRADES[id]) + level;
    if (kind === 'spell') return 'Реактор: ' + name(Meta.SPELLS[id]) + level;
    if (kind === 'plot') return 'Штаб: участок ' + name(Meta.PROJECTS[id]);
    if (kind === 'hq') return 'Штаб: построено ' + name(Meta.PROJECTS[id]);
    if (kind === 'exchange') return 'Биржа: ' + name(Meta.EXCHANGE_UPGRADES[id]) + level;
    if (kind === 'supply') return 'Снабжение: слотов бустеров ' + to;
    if (kind === 'card') return 'Бригадир ' + name(Meta.CARDS[id]) + (to > 1 ? ' → ур. ' + to : ' — новый');
    return what;
  }

  function journalRunText(run) {
    if (run.mode === 'campaign') return 'Заказ ' + run.level + ' «' + run.name + '»';
    if (run.mode === 'hq') return 'Штаб «' + run.name + '»';
    if (run.mode === 'school') return 'Школа «' + run.name + '»' + (run.tier ? ', ступень ' + run.tier : '');
    if (run.mode === 'contract') return 'Контракт ' + (run.contract || '') + ' «' + run.name + '»';
    if (run.mode === 'exchange') return 'Биржа «' + run.name + '»';
    return '«' + run.name + '»';
  }

  // «1:05:09» from an hour, «4:07» below it.
  function reportClock(seconds) {
    const whole = Math.max(0, Math.round(seconds));
    const two = function (n) { return (n < 10 ? '0' : '') + n; };
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor(whole % 3600 / 60);
    return (hours ? hours + ':' + two(minutes) : String(minutes)) + ':' + two(whole % 60);
  }

  // The report: text to paste into a chat or a task, and the journal itself for a closer look.
  function playtestReport() {
    const journal = meta.journal;
    const events = journal.events;
    const intro = window.MicroBuildersBalance.tuning.intro;
    const lines = [];
    lines.push('Отчёт плейтеста MicroBuilders · ' + new Date().toLocaleString('ru-RU'));
    lines.push('Журнал с ' + new Date(journal.since).toLocaleString('ru-RU') + ' · активная игра ' + reportClock(journal.active) + ' (страница на экране)');
    const tempo = [['0', 'пауза'], ['1', '×1'], ['5', '×5'], ['20', '×20']].filter(function (row) { return journal.tempo[row[0]] > 0; });
    if (journal.active > 0 && tempo.length) {
      lines.push('Скорость: ' + tempo.map(function (row) { return row[1] + ' — ' + Math.round(journal.tempo[row[0]] / journal.active * 100) + '%'; }).join(' · '));
    }
    lines.push('Сюжет: сдано ' + meta.campaignLevel + ' из ' + MB.LEVELS.length + ' · капитал ' + formatCompact(meta.capital) + ' · печати ' + meta.seals + ' · бригадиров ' + ownedCards().length);
    const firstSite = events.find(function (e) { return e.type === 'first-buy'; });
    const firstHq = events.find(function (e) { return e.type === 'buy'; });
    const session = window.MicroBuildersBalance.session;
    lines.push('Первая покупка на стройке: ' + (firstSite ? reportClock(firstSite.t) + ' — «' + (session[firstSite.kind] ? session[firstSite.kind].name : firstSite.kind) + '» (' + journalRunText(firstSite) + ')' : 'нет'));
    lines.push('Первая покупка в штабе: ' + (firstHq ? reportClock(firstHq.t) + ' — ' + journalWhat(firstHq.what, firstHq.to) : 'нет'));

    lines.push('', 'Стройки (время от начала журнала; длительность — время самой стройки):');
    const starts = {};
    const open = {};
    const runKey = function (e) { return e.mode + ':' + (e.level || e.name) + ':' + (e.tier || ''); };
    events.forEach(function (e) {
      if (e.type === 'start') {
        starts[runKey(e)] = e.t;
        open[runKey(e)] = e;
      }
      if (e.type === 'jump') lines.push('  ' + reportClock(e.t) + '  перемотка на уровень ' + e.level);
      if (e.type !== 'done' && e.type !== 'fail' && e.type !== 'abandon') return;
      const from = starts[runKey(e)];
      delete starts[runKey(e)];
      delete open[runKey(e)];
      let line = '  ' + (from !== undefined ? reportClock(from) + ' → ' : '') + reportClock(e.t) + '  ' + journalRunText(e);
      if (e.type === 'fail') line += ' — время вышло' + (e.offline ? ' без игрока' : '');
      else if (e.type === 'abandon') line += ' — брошено';
      else if (e.mode === 'school') line += e.win ? ' — победа' : ' — без победы';
      if (e.sim) line += ' · ' + UI.formatDuration(e.sim) + (e.offline ? ' (достроено без игрока)' : '');
      const losses = LOSSES.filter(function (loss) { return e.losses && e.losses[loss[0]]; });
      if (losses.length) line += ' · ' + losses.map(function (loss) { return loss[1] + ' ' + e.losses[loss[0]] + '%'; }).join(' · ');
      if (e.buys) line += ' · покупок ' + e.buys;
      lines.push(line);
    });
    // Runs still going (or left behind by a rewind): started, not finished.
    Object.keys(open).forEach(function (key) { lines.push('  ' + reportClock(open[key].t) + ' → …  ' + journalRunText(open[key]) + ' — не сдано'); });

    lines.push('', 'Проблемы стройки → первый ответ:');
    [['Перекур', 'Перекуры', intro.smokeFromLevel], ['Обед', 'Голод', intro.hungerFromLevel], ['Сон', 'Усталость', intro.nightFromLevel], ['night', 'Ночь', intro.nightFromLevel]].forEach(function (row) {
      // The problem's own order started in the journal; else the first later one (a rewind skipped it), or
      // none — reached before the journal began, or not reached yet.
      const start = events.find(function (e) { return e.type === 'start' && e.mode === 'campaign' && e.level >= row[2]; });
      const exact = !!start && start.level === row[2];
      const answer = events.find(function (e) { return e.type === 'buy' && journalLoss(e.what) === row[0]; });
      let line = '  ' + row[1] + ' — с заказа ' + row[2];
      if (exact) line += ' (' + reportClock(start.t) + ')';
      else if (start) line += ' (в журнале — с заказа ' + start.level + ', ' + reportClock(start.t) + ')';
      else line += meta.campaignLevel + 1 >= row[2] ? ' (до начала журнала)' : ' (ещё не дошли)';
      line += ' → ';
      if (!answer) line += 'ответ не куплен';
      else {
        line += journalWhat(answer.what, answer.to) + ' в ' + reportClock(answer.t);
        if (exact) line += answer.t < start.t ? ', заранее' : ', через ' + UI.formatDuration(answer.t - start.t);
      }
      lines.push(line);
    });

    lines.push('', 'Покупки и бригадиры по времени:');
    events.forEach(function (e) {
      if (e.type === 'buy' || e.type === 'card') lines.push('  ' + reportClock(e.t) + '  ' + journalWhat(e.what, e.to));
    });
    return { text: lines.join('\n'), data: { game: 'MicroBuilders', reportAt: new Date().toISOString(), campaignLevel: meta.campaignLevel, journal: journal } };
  }

  function openPlaytestReport() {
    const report = playtestReport();
    UI.overlay.open({
      id: 'playtest-report',
      type: 'screen',
      kicker: 'Инструмент плейтеста',
      title: 'Отчёт плейтеста',
      body: '<p class="playtest-note">Текст — для чата или задачи, JSON — весь журнал компании.</p><pre class="playtest-report">' + UI.escapeHtml(report.text) + '</pre>',
      actions: [
        { label: 'Скопировать', primary: true, close: false, onClick: function () { copyReport(report.text); } },
        { label: 'Скачать JSON', close: false, onClick: function () { downloadReport(report.data); } },
      ],
    });
  }

  function copyReport(text) {
    const done = function () { UI.toast({ text: 'Отчёт скопирован', icon: 'check', tone: 'good', key: 'report-copy' }); };
    // Without the clipboard API (an http page, an old browser): select the text and copy it.
    const fallback = function () {
      const pre = document.querySelector('#overlay-root .playtest-report');
      const selection = window.getSelection();
      const range = document.createRange();
      if (!pre) return;
      range.selectNodeContents(pre);
      selection.removeAllRanges();
      selection.addRange(range);
      if (document.execCommand('copy')) done();
      else UI.toast({ text: 'Текст выделен — скопируйте его вручную', icon: 'lock', tone: 'warn', key: 'report-copy' });
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  function downloadReport(data) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'microbuilders-playtest-' + stamp + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- camera (docs/tech/camera.md, «Подключение в game.js») ----------
  // Camera key of the site on screen: its slot, run and level, so a view is never restored on another site.
  function siteCameraKey() {
    if (!campaign) return 'site:none';
    const payload = campaign.runPayload;
    return 'site:' + Meta.siteKey(campaign.runMode) + ':' + campaign.runMode + ':' + (payload && payload.projectId ? payload.projectId : campaign.levelIndex);
  }

  // Site bounds for the level just built, with what is already built (offline progress, restores).
  // The camera lands at home; launches, switches and returns then fly in or restore their own view.
  // While the city is on screen the city camera stays; hideCity brings the site view back.
  function setSiteCamera(level, cx, cz) {
    siteBuiltTop = 0;
    for (let i = 0; i < world.blocks.length; i++) {
      if (world.blocks[i].built) siteBuiltTop = Math.max(siteBuiltTop, world.blocks[i].y + 1);
    }
    const bounds = MicroBuildersCamera.siteBounds(level, cx, cz);
    bounds.key = siteCameraKey();
    bounds.builtTop = siteBuiltTop;
    // The camp stands round the site, partly further out than the mines: zoomed out, the pan reaches
    // every camp building (the reactor stands furthest).
    let campReach = 0;
    (world.camp || []).forEach(function (site) {
      if (site.box) campReach = Math.max(campReach, Math.hypot((site.box.x0 + site.box.x1) / 2 - bounds.center.x, (site.box.z0 + site.box.z1) / 2 - bounds.center.z));
    });
    if (campReach > 0) bounds.panRadius = Math.max(Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2, bounds.reach, campReach) + 2;
    cameraController.setBounds(bounds);
    cameraController.setActivity({ builtTop: siteBuiltTop });
    if (cityRoot.visible) cameraController.setMode('city');
    else cameraController.frameHome();
  }

  // The view the player left on this site, if any (switches and returns from the HQ).
  function restoreSiteCamera(opts) {
    const saved = cameraStates.site[siteCameraKey()];
    return !!saved && cameraController.restoreState(saved, opts);
  }

  // Entering a new site (or one without a remembered view): a short fly-in onto its home.
  function introSiteCamera() {
    delete cameraStates.site[siteCameraKey()];
    if (cityRoot.visible) return;
    refreshSafeArea({ snap: true });
    cameraController.frameHome({ intro: true });
  }

  // Auto-follow of the growing floor: the top of the highest placed cube, reported only when it rises.
  function noteBuiltTop(blocks) {
    let top = siteBuiltTop;
    for (let i = 0; i < blocks.length; i++) top = Math.max(top, blocks[i].y + 1);
    if (top === siteBuiltTop) return;
    siteBuiltTop = top;
    cameraController.setActivity({ builtTop: top });
  }

  // Sun, shadow box, fog and ground sized from the active camera bounds (site or city) and the
  // zoom range, so zooming out to maxDistance never greys the building. Re-run after resize and
  // safe-area changes: maxDistance depends on the screen shape.
  function applySceneLighting() {
    const info = cameraController.getBounds();
    if (!info) return;
    const reach = info.radius + 6;
    const cx = info.center.x;
    const cz = info.center.z;
    sun.target.position.set(cx, 0, cz);
    // The sun's direction follows the clock (updateSky); its distance keeps the old rig's.
    lightRig.reach = reach * 1.39;
    lightRig.box = reach;
    lightRig.half = 0;
    sun.shadow.camera.left = -reach;
    sun.shadow.camera.right = reach;
    sun.shadow.camera.top = reach;
    sun.shadow.camera.bottom = -reach;
    sun.shadow.camera.far = Math.max(160, reach * 2.8);
    sun.shadow.camera.updateProjectionMatrix();
    // The fog in clear weather; updateSky thickens it in snow and rain.
    lightRig.fogNear = cameraController.maxDistance + reach * 0.5;
    lightRig.fogFar = lightRig.fogNear + reach * 3;
    updateSky(0, skyView.time);
    // The grass disc reaches past the farthest zoom, and its texture keeps the same grain.
    const ground = Math.min(175, Math.max(90, cameraController.maxDistance + reach + 30)) / 90;
    grass.scale.set(ground, ground, 1);
    grass.material.map.repeat.set(18 * ground, 18 * ground);
  }

  // Тени по видимой области: квадрат карты теней (сторона 2·half) — вокруг точки, куда смотрит камера, чуть дальше
  // её, по дальности камеры; издали — вся площадка, как в applySceneLighting. Вблизи тени в 2–3 раза чётче.
  // Центр привязан к текселю карты в осях света: тени не дрожат, пока камера едет.
  function fitShadow() {
    const box = lightRig.box;
    if (!(box > 0)) return;
    const d = cameraController.radius;
    const half = Math.min(box, Math.max(12, d * 1.2 + 6));
    let x = 0;
    let y = 0;
    if (half < box * 0.95) {
      camera.getWorldDirection(shadowFocus);
      const flat = Math.hypot(shadowFocus.x, shadowFocus.z) || 1;
      const ahead = d * 0.3 / flat;
      shadowFocus.set(camera.position.x + shadowFocus.x * (d + ahead), 0, camera.position.z + shadowFocus.z * (d + ahead));
      sun.updateMatrixWorld();
      shadowProbe.position.copy(sun.position);
      shadowProbe.lookAt(sun.target.position);
      shadowProbe.updateMatrixWorld();
      shadowFocus.applyMatrix4(shadowProbe.matrixWorldInverse);
      const texel = 2 * half / sun.shadow.mapSize.x;
      x = Math.round(shadowFocus.x / texel) * texel;
      y = Math.round(shadowFocus.y / texel) * texel;
    }
    if (half === lightRig.half && x === lightRig.x && y === lightRig.y) return;
    lightRig.half = half;
    lightRig.x = x;
    lightRig.y = y;
    const cam = sun.shadow.camera;
    cam.left = x - half;
    cam.right = x + half;
    cam.top = y + half;
    cam.bottom = y - half;
    cam.updateProjectionMatrix();
  }

  // Free band between the top HUD and the dock / nav (or, in the HQ, between the company wallet and
  // the card) in stage px. Bars spanning half the stage count at the top and bottom; narrower ones
  // (the landscape nav rail, the city card as a side sheet) are side insets, so the scene centres
  // right of them. In the HQ it also records the wallet pills and the site chip for the signs.
  function measureSafeArea() {
    const body = document.body;
    const area = { top: 0, bottom: 0, left: 0, right: 0 };
    cityCovers = [];
    if (!body.classList.contains('playing') || body.classList.contains('interface-hidden')) return area;
    const scale = MicroBuildersStage.scale() || 1;
    const viewRect = view.getBoundingClientRect();
    const minWidth = MicroBuildersStage.width() * 0.5;
    const city = currentScreen === 'hq' && cityRoot.visible;
    function bar(selector, wide) {
      const el = document.querySelector(selector);
      if (!el || el.hidden) return null;
      const rect = el.getBoundingClientRect();
      if (rect.height < 1 || rect.width < 1 || (wide && rect.width / scale < minWidth)) return null;
      return rect;
    }
    function cover(rect) {
      if (rect && rect.width >= 1) {
        cityCovers.push({
          left: (rect.left - viewRect.left) / scale, right: (rect.right - viewRect.left) / scale,
          top: (rect.top - viewRect.top) / scale, bottom: (rect.bottom - viewRect.top) / scale,
        });
      }
    }
    (city ? ['#city-wallet', '#site-chip'] : ['#hud .top']).forEach(function (selector) {
      const rect = bar(selector, false);
      if (rect) area.top = Math.max(area.top, (rect.bottom - viewRect.top) / scale);
    });
    // A camp building's sheet rises from the bottom over the site: the scene centres above it, as
    // above the upgrade sheet (its height, so its rise animation does not shift the band).
    const sheet = !city && document.querySelector('#overlay-root .overlay.canteen-sheet .overlay-card');
    if (sheet) {
      const rect = sheet.getBoundingClientRect();
      if (rect.height >= 1) area.bottom = Math.max(area.bottom, rect.height / scale);
    }
    (city ? ['#city-card', '#app-nav'] : ['#hud .bottom', '#app-nav']).forEach(function (selector) {
      const rect = bar(selector, false);
      if (!rect) return;
      if (rect.width / scale >= minWidth) {
        area.bottom = Math.max(area.bottom, (viewRect.bottom - rect.top) / scale);
      } else if (selector === '#hud .bottom') {
        // A collapsed dock in a corner is not a bar.
      } else if ((rect.left + rect.right) / 2 < (viewRect.left + viewRect.right) / 2) {
        area.left = Math.max(area.left, (rect.right - viewRect.left) / scale);
      } else {
        area.right = Math.max(area.right, (viewRect.right - rect.left) / scale);
      }
    });
    if (city) {
      // The wallet bar spans the stage; only its pills cover anything.
      const pills = document.querySelectorAll('#city-wallet .pill');
      if (pills.length && bar('#city-wallet', false)) {
        const first = pills[0].getBoundingClientRect();
        const last = pills[pills.length - 1].getBoundingClientRect();
        cover({ left: first.left, right: last.right, top: Math.min(first.top, last.top), bottom: Math.max(first.bottom, last.bottom), width: last.right - first.left });
      }
      cover(bar('#site-chip', false));
    }
    ['top', 'bottom', 'left', 'right'].forEach(function (side) { area[side] = Math.max(0, Math.round(area[side])); });
    return area;
  }

  function refreshSafeArea(opts) {
    safeAreaQueued = false;
    const area = measureSafeArea();
    const key = area.top + ',' + area.bottom + ',' + area.left + ',' + area.right;
    if (key === safeAreaKey && !(opts && opts.snap)) return;
    safeAreaKey = key;
    cameraController.setSafeArea(area, opts);
    applySceneLighting();
  }

  function queueSafeArea() {
    if (safeAreaQueued) return;
    safeAreaQueued = true;
    Promise.resolve().then(function () { if (safeAreaQueued) refreshSafeArea(); });
  }

  // The HUD bars resize (dock collapse, panels, the city card) and body classes switch layouts
  // (city view, hidden interface, title, away): both re-measure the band once per change.
  function watchSafeArea() {
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(queueSafeArea);
      ['#hud .top', '#hud .bottom', '#app-nav', '#city-wallet', '#site-chip', '#city-card'].forEach(function (selector) {
        const el = document.querySelector(selector);
        if (el) observer.observe(el);
      });
    }
    if (window.MutationObserver) {
      new MutationObserver(queueSafeArea).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // «◎» while the camera is away from home: back to the site, in the HQ to the whole quarter. A lot
  // card has its own «×» for that (and the reveal flight is not the player's), so the HQ shows it
  // only over the overview card.
  function paintCameraButton() {
    const button = document.getElementById('camera-home');
    const city = currentScreen === 'hq' && cityRoot.visible;
    const cityFree = city && !cityBuilding && !cityReveal;
    const show = !!campaign && campaign.status !== 'title' && (currentScreen === 'build' || cityFree) &&
      !cameraController.isWorkerView() && !cameraController.isTracking() && cameraController.isAwayFromHome();
    if (button.hidden === !show) return;
    button.hidden = !show;
    const label = city ? 'Весь квартал' : 'Вернуть камеру';
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function recenterCamera() {
    if (currentScreen === 'hq' && cityRoot.visible) {
      closeCityCard();
      return;
    }
    cameraController.frameHome({ animate: true });
    paintCameraButton();
  }

  function onCameraInteract(kind) {
    // Double tap / F in the HQ: the controller flies back to the quarter, the lot card goes with it.
    if (kind === 'home' && currentScreen === 'hq' && cityRoot.visible && cityBuilding && !cityReveal) clearCitySelection();
  }



  // Табличка над рудником: какой материал здесь берут (саму груду руды рисует art/quarry.js).
  function addMineLabel(mine) {
    const label = makeLabel(MB.MATERIAL[mine.materialId].name);
    label.position.set(mine.x + 0.5, 2.7, mine.z + 0.5);
    levelRoot.add(label);
  }

  // Клетки хозяйства стройки вне здания (городок и мачты света, вертолётная площадка, площадка дронов и погрузчиков
  // у первого рудника, двор сборки фигур дронами, столы планирования): стены карьера (art/quarry.js) обходят их рамку.
  function quarryCells(level) {
    const cells = [];
    const add = function (x, z) { cells.push({ x: x, z: z }); };
    (world.camp || []).forEach(function (site) {
      add(site.x - 1, site.z - 1);
      add(site.x + site.w + 2, site.z + site.d);
    });
    (level.elevators || []).forEach(function (pad) {
      add(pad.x, pad.z);
      add(pad.x + 3, pad.z + 3);
    });
    const mine = level.mines[0];
    if (mine) {
      // logic.js dronePad: x + 2,5 … + 6,4, z − 2,5 … − 3,8; погрузчики — у того же рудника.
      add(mine.x + 1, mine.z - 7);
      add(mine.x + 9, mine.z + 1);
      // logic.js yardOrigin: x + 8 + слот × (ширина + 3), z + 6 — два слота по 5 клеток.
      if (campaign.devGroups.all === true || campaign.purchases.engineers > 0 || Meta.sessionLineOpen(meta, 'engineers')) {
        add(mine.x + 29, mine.z + 12);
      }
    }
    world.builders.forEach(function (builder) { add(builder.homeCell[0], builder.homeCell[2]); });
    return cells;
  }

  // Снег, мокрая земля и жара (weatherSurface) поверх своего шейдера материала карьера и травы (тени облаков, зерно,
  // затенение у стен): оба onBeforeCompile по очереди, ключ программы — погода и вид поверхности.
  function quarrySurface(material, kind) {
    const look = {
      grass: [0.9, 0, 1], ground: [0.85, 0.12, 0.35], soil: [0.85, -0.08, 0.8], rock: [0.55, 0.15, 0], stone: [0.6, 0.2, 0], ore: [0.45, 0.25, 0],
    }[kind] || [0.85, 0.12, 0.35];
    const own = material.onBeforeCompile;
    weatherSurface(material, look[0], look[1], look[2]);
    const weather = material.onBeforeCompile;
    const key = material.customProgramCacheKey() + '|' + kind;
    // Тон главы (chapterTint) — порода и земля или трава; руда держит цвет своего материала. Снег не красится.
    const tint = kind === 'ore' ? null : kind === 'grass' ? chapterTint.grass : chapterTint.rock;
    material.onBeforeCompile = function (shader, renderer) {
      own.call(this, shader, renderer);
      weather.call(this, shader, renderer);
      if (!tint) return;
      shader.uniforms.uChapterTint = tint;
      shader.fragmentShader = 'uniform vec4 uChapterTint;\n' + shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) * uChapterTint.rgb, uChapterTint.a * (1.0 - snowAmt));');
    };
    material.customProgramCacheKey = function () { return key; };
  }

  // Heat dust lying low over the site: three flat layers just above the ground (the lowest the
  // thickest) of drifting noise, so the dust creeps along the ground with the wind and thins out at
  // the site's edge. Shown only in the heat (updateSky).
  function addGroundDust(cx, cz, padRadius) {
    groundDust.layers = [];
    groundDust.center.value.set(cx, 0, cz);
    groundDust.radius.value = padRadius * 1.25;
    const heights = [0.12, 0.45, 0.95];
    for (let i = 0; i < heights.length; i++) {
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: PRECIP.time, uLight: PRECIP.light, uAmount: groundDust.amount, uCenter: groundDust.center,
          uRadius: groundDust.radius, uLayer: { value: i },
        },
        vertexShader: 'varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: [
          'uniform float uTime; uniform float uLight; uniform float uAmount; uniform vec3 uCenter; uniform float uRadius; uniform float uLayer;',
          'varying vec3 vWorld;',
          'float dh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
          'float dn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
          '  return mix(mix(dh(i), dh(i + vec2(1.0, 0.0)), f.x), mix(dh(i + vec2(0.0, 1.0)), dh(i + vec2(1.0, 1.0)), f.x), f.y); }',
          'float dfbm(vec2 p){ return dn(p) * 0.55 + dn(p * 2.1 + 7.0) * 0.3 + dn(p * 4.3 + 3.0) * 0.15; }',
          'void main(){',
          '  vec2 p = vWorld.xz * 0.11 + uLayer * 5.3;',
          '  vec2 drift = vec2(uTime * 0.32, uTime * 0.11) * (0.7 + uLayer * 0.45);',
          '  float n = dfbm(p - drift) * 0.7 + dfbm(p * 2.2 + drift * 1.5 + 11.0) * 0.4;',
          '  float dust = smoothstep(0.36, 0.82, n);',
          '  float edge = 1.0 - smoothstep(0.6, 1.0, length(vWorld.xz - uCenter.xz) / uRadius);',
          '  float a = dust * edge * uAmount * (0.62 - uLayer * 0.16);',
          '  if (a <= 0.004) discard;',
          '  gl_FragColor = vec4(vec3(0.97, 0.89, 0.74) * uLight, a);',
          '}',
        ].join('\n'),
      });
      const layer = new THREE.Mesh(new THREE.PlaneGeometry(padRadius * 2.6, padRadius * 2.6), material);
      layer.rotation.x = -Math.PI / 2;
      layer.position.set(cx, heights[i], cz);
      layer.renderOrder = 3;
      layer.visible = false;
      levelRoot.add(layer);
      groundDust.layers.push(layer);
    }
  }


  function syncSticks() {
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      const homeKey = MB.cellKey(builder.homeCell[0], builder.homeCell[1], builder.homeCell[2]);
      if (builder.trade !== 'engineer' && !planningDesks.has(homeKey)) {
        addPlanningDesk(builder.homeCell);
        planningDesks.add(homeKey);
      }
      if (stickViews.has(builder)) continue;
      if (builder.trade === 'engineer') addDronePad(builder.homeCell);
      const look = rankLook(builder.expertiseRank);
      const group = builder.trade === 'engineer' ? createDrone() : createStick(builder, look ? look.size : 1);
      group.userData.builder = builder;
      levelRoot.add(group);
      stickViews.set(builder, {
        group: group,
        badge: createWorkerBadge(builder.trade === 'engineer'),
        load: { kg: 0, capacity: 0, fill: 0, overload: 1 },
        gait: 0,
        carryVersion: -1,
        carryCap: -1,
        carryColor: 0,
        lastTripCoins: 0,
        capitalCoins: 0,
        planEvent: null, // the 'plan' event waiting for its trip in the same batch
      });
    }
  }

  function syncVehicles() {
    for (let i = 0; i < world.vehicles.length; i++) {
      const vehicle = world.vehicles[i];
      if (vehicleViews.has(vehicle)) continue;
      const group = vehicle.kind === 'heli' ? createHeliView() : createVehicleView();
      group.userData.displayX = vehicle.cell[0] + 0.5;
      group.userData.displayZ = vehicle.cell[2] + 0.5;
      group.position.set(group.userData.displayX, 0, group.userData.displayZ);
      levelRoot.add(group);
      vehicleViews.set(vehicle, group);
    }
  }

  function vehicleBox(parent, material, size, position) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function vehicleCylinder(parent, material, radius, length, position, axis) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14), material);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Mobile crane: chassis with steering front wheels, cab, rotating turret with a telescopic boom,
  // outriggers that drop to the ground while lifting, and a hook on a cable.
  function createVehicleView() {
    const group = new THREE.Group();
    const m = machineMat;
    vehicleBox(group, m.dark, [1.1, 0.18, 1.9], [0, 0.36, 0]);
    vehicleBox(group, m.yellow, [1.16, 0.3, 1.5], [0, 0.6, -0.1]);
    vehicleBox(group, m.stripe, [1.18, 0.06, 0.06], [0, 0.48, 0.66]);
    vehicleBox(group, m.yellow, [0.52, 0.5, 0.56], [-0.3, 0.98, 0.58]);
    vehicleBox(group, m.dark, [0.56, 0.05, 0.6], [-0.3, 1.25, 0.58]);
    vehicleBox(group, m.glass, [0.46, 0.32, 0.02], [-0.3, 1.02, 0.865]);
    vehicleBox(group, m.glass, [0.02, 0.3, 0.42], [-0.565, 1.02, 0.58]);
    vehicleBox(group, m.dark, [1.0, 0.36, 0.3], [0, 0.72, -0.86]);
    vehicleCylinder(group, m.dark, 0.035, 0.42, [0.42, 1.0, -0.62], 'y');
    const lights = [];
    for (let side = -1; side <= 1; side += 2) {
      lights.push(vehicleBox(group, m.light, [0.14, 0.08, 0.03], [side * 0.42, 0.6, 0.855]));
    }
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0xff8a1c, emissive: 0xff6a00, emissiveIntensity: 0.2 })
    );
    MicroBuildersPost.mark(beacon.material); // маячок мигает со свечением (art/post.js)
    beacon.position.set(-0.3, 1.31, 0.58);
    group.add(beacon);
    const wheels = [];
    const steer = [];
    for (let end = -1; end <= 1; end += 2) {
      for (let side = -1; side <= 1; side += 2) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.6, 0.27, end * 0.62);
        const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.2, 16), m.tyre);
        tyre.rotation.z = Math.PI / 2;
        tyre.castShadow = true;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.21, 10), m.steel);
        rim.rotation.z = Math.PI / 2;
        const spin = new THREE.Group();
        spin.add(tyre, rim);
        pivot.add(spin);
        group.add(pivot);
        wheels.push(spin);
        if (end > 0) steer.push(pivot);
      }
    }
    const outriggers = [];
    for (let end = -1; end <= 1; end += 2) {
      for (let side = -1; side <= 1; side += 2) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.6, 0.42, end * 0.9);
        const beam = vehicleBox(leg, m.yellow, [0.3, 0.08, 0.1], [side * 0.15, 0, 0]);
        const foot = vehicleBox(leg, m.dark, [0.08, 0.36, 0.08], [side * 0.28, -0.18, 0]);
        const pad = vehicleBox(leg, m.dark, [0.18, 0.03, 0.18], [side * 0.28, -0.36, 0]);
        leg.userData = { side: side, beam: beam, foot: foot, pad: pad };
        group.add(leg);
        outriggers.push(leg);
      }
    }
    // Tower crane rig: turret → vertical mast → horizontal jib (with counter-jib) → trolley → cable → hook.
    const turret = new THREE.Group();
    turret.position.set(MB.CRANE.turretX, MB.CRANE.turretY, MB.CRANE.turretZ);
    group.add(turret);
    vehicleCylinder(turret, m.dark, 0.3, 0.12, [0, 0.06, 0], 'y');
    vehicleBox(turret, m.yellow, [0.4, 0.3, 0.44], [0, 0.27, -0.04]);
    const mast = vehicleBox(turret, m.yellow, [0.2, 1, 0.2], [0, 0.5, 0]);
    const mastInner = vehicleBox(turret, m.steel, [0.13, 1, 0.13], [0, 0.5, 0]);
    const head = new THREE.Group();
    turret.add(head);
    vehicleBox(head, m.dark, [0.26, 0.16, 0.26], [0, 0.04, 0]);
    const jib = vehicleBox(head, m.yellow, [0.16, 0.14, 1], [0, 0.12, 0.5]);
    vehicleBox(head, m.yellow, [0.14, 0.12, 0.55], [0, 0.12, -0.3]);
    vehicleBox(head, m.dark, [0.26, 0.2, 0.18], [0, 0.08, -0.55]);
    const trolley = vehicleBox(head, m.dark, [0.2, 0.08, 0.16], [0, 0.02, 1]);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), m.dark);
    head.add(cable);
    const hook = new THREE.Group();
    vehicleBox(hook, m.yellow, [0.22, 0.16, 0.14], [0, 0.04, 0]);
    vehicleBox(hook, m.dark, [0.05, 0.16, 0.05], [0, -0.1, 0]);
    head.add(hook);
    const payload = new THREE.Group();
    payload.visible = false;
    hook.add(payload);
    group.userData = {
      wheels: wheels,
      steer: steer,
      outriggers: outriggers,
      deploy: 0,
      steerAngle: 0,
      lastHeading: 0,
      turret: turret,
      mast: mast,
      mastInner: mastInner,
      head: head,
      jib: jib,
      trolley: trolley,
      cable: cable,
      hook: hook,
      beacon: beacon,
      payload: payload,
      payloadSignature: '',
      target: new THREE.Vector3(),
      payloadQuaternion: new THREE.Quaternion(),
      displayX: 0,
      displayZ: 0,
      heading: 0,
    };
    return group;
  }

  // Cargo helicopter: tilting body with canopy, tail boom and tail rotor, skids, two-blade main
  // rotor; the winch cable hangs from the fixed mount so the hook math stays level.
  function createHeliView() {
    const group = new THREE.Group();
    const m = machineMat;
    const body = new THREE.Group();
    group.add(body);
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.9, 6, 14), m.heli);
    hull.rotation.x = Math.PI / 2;
    hull.position.set(0, 0.45, 0.05);
    hull.castShadow = true;
    body.add(hull);
    const belly = vehicleBox(body, m.heliWhite, [0.5, 0.12, 1.1], [0, 0.18, 0.05]);
    belly.castShadow = true;
    const canopy = vehicleBox(body, m.glass, [0.5, 0.26, 0.34], [0, 0.56, 0.58]);
    canopy.rotation.x = -0.35;
    vehicleBox(body, m.heliWhite, [0.52, 0.04, 0.5], [0, 0.72, 0.32]);
    const boomTail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 1.3, 10), m.heli);
    boomTail.rotation.x = Math.PI / 2;
    boomTail.position.set(0, 0.55, -1.0);
    boomTail.castShadow = true;
    body.add(boomTail);
    vehicleBox(body, m.heliWhite, [0.04, 0.42, 0.26], [0, 0.78, -1.58]);
    vehicleBox(body, m.heli, [0.5, 0.04, 0.16], [0, 0.6, -1.45]);
    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.07, 0.72, -1.6);
    vehicleBox(tailRotor, m.dark, [0.02, 0.5, 0.06], [0, 0, 0]);
    vehicleBox(tailRotor, m.dark, [0.02, 0.06, 0.5], [0, 0, 0]);
    body.add(tailRotor);
    for (let side = -1; side <= 1; side += 2) {
      vehicleCylinder(body, m.dark, 0.03, 1.3, [side * 0.34, 0.02, 0.05], 'z');
      vehicleBox(body, m.dark, [0.03, 0.2, 0.03], [side * 0.3, 0.1, 0.35]);
      vehicleBox(body, m.dark, [0.03, 0.2, 0.03], [side * 0.3, 0.1, -0.25]);
    }
    vehicleCylinder(body, m.dark, 0.06, 0.18, [0, 0.86, 0.05], 'y');
    const rotor = new THREE.Group();
    rotor.position.set(0, 0.96, 0.05);
    vehicleBox(rotor, m.dark, [2.7, 0.025, 0.12], [0, 0, 0]);
    vehicleBox(rotor, m.dark, [0.12, 0.025, 2.7], [0, 0, 0]);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.35, 32), m.blur);
    disc.rotation.x = -Math.PI / 2;
    rotor.add(disc);
    body.add(rotor);
    vehicleBox(body, m.dark, [0.16, 0.12, 0.16], [0, 0.08, 0.05]);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), m.dark);
    cable.position.y = 0.2;
    group.add(cable);
    const hook = new THREE.Group();
    vehicleBox(hook, m.yellow, [0.22, 0.14, 0.14], [0, 0.04, 0]);
    vehicleBox(hook, m.dark, [0.05, 0.16, 0.05], [0, -0.1, 0]);
    group.add(hook);
    const payload = new THREE.Group();
    payload.position.y = -0.8;
    payload.visible = false;
    group.add(payload);
    group.userData = {
      wheels: [],
      body: body,
      rotor: rotor,
      tailRotor: tailRotor,
      cable: cable,
      hook: hook,
      payload: payload,
      payloadSignature: '',
      target: new THREE.Vector3(),
      payloadQuaternion: new THREE.Quaternion(),
      displayX: 0,
      displayZ: 0,
      heading: 0,
      pitch: 0,
      roll: 0,
      lastHeading: 0,
      heli: true,
    };
    return group;
  }

  function sceneRoots() {
    if (!yardRoot) {
      yardRoot = new THREE.Group();
      levelRoot.add(yardRoot);
    }
    if (!elevatorRoot) {
      elevatorRoot = new THREE.Group();
      levelRoot.add(elevatorRoot);
    }
  }

  // Air taxis (logic.js → activateTaxis, stepTaxis): a helipad with an «H» by the mines and, on it,
  // small yellow open-top flying cabs with a chequered stripe and four rotors. A cab flies up, across
  // and down; it leans into the flight, its rotors spin up before take-off, dust puffs off the ground.
  function syncTaxis() {
    if (!world) return;
    sceneRoots();
    while (elevatorRoot.children.length > 0) {
      const child = elevatorRoot.children[0];
      child.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
      });
      elevatorRoot.remove(child);
    }
    taxiView = null;
    const pad = world.taxiPad;
    if (!pad || !world.taxis || world.taxis.length === 0) return;
    const kit = taxiParts();
    const group = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 3), [kit.concrete, kit.concrete, kit.helipad, kit.concrete, kit.concrete, kit.concrete]);
    slab.position.set(pad.x + 1.5, 0.05, pad.z + 1.5);
    slab.receiveShadow = true;
    group.add(slab);
    [[0, 0], [3, 0], [0, 3], [3, 3]].forEach(function (c) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), kit.padLight);
      light.position.set(pad.x + c[0] + (c[0] ? -0.12 : 0.12), 0.14, pad.z + c[1] + (c[1] ? -0.12 : 0.12));
      group.add(light);
    });
    taxiView = { group: group, cabs: [], time: 0 };
    world.taxis.forEach(function (taxi) {
      const cab = taxiModel(kit);
      cab.position.set(taxi.pos[0], taxi.pos[1] + 0.1, taxi.pos[2]);
      cab.rotation.y = taxi.heading;
      group.add(cab);
      taxiView.cabs.push({ group: cab, yaw: taxi.heading, lean: 0, spin: 0, state: taxi.state, y: taxi.pos[1] });
    });
    elevatorRoot.add(group);
  }

  // A cab: an open yellow tub (a worker rides standing in it, his load on his back), a windscreen,
  // a chequered stripe, skids, four arms with spinning rotors and blinking side lights.
  function taxiModel(kit) {
    const cab = new THREE.Group();
    const body = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.74), kit.dark);
    floor.position.y = 0.16;
    body.add(floor);
    [[0, 0.34], [0, -0.34]].forEach(function (p) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.07), [kit.yellow, kit.yellow, kit.yellow, kit.yellow, kit.chequer, kit.chequer]);
      side.position.set(p[0], 0.33, p[1]);
      side.castShadow = true;
      body.add(side);
    });
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.74), kit.yellow);
    back.position.set(-0.42, 0.37, 0);
    back.castShadow = true;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.74), kit.yellow);
    nose.position.set(0.44, 0.31, 0);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.66), kit.glass);
    glass.position.set(0.44, 0.6, 0);
    glass.rotation.z = -0.35;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.3), kit.lamp);
    lamp.position.set(0.53, 0.33, 0);
    body.add(back, nose, glass, lamp);
    [-0.24, 0.24].forEach(function (z) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.05), kit.dark);
      skid.position.set(0, 0.02, z);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), kit.dark);
      strut.position.set(0, 0.08, z);
      body.add(skid, strut);
    });
    const rotors = [];
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c, i) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), kit.dark);
      arm.position.set(c[0] * 0.5, 0.52, c[1] * 0.42);
      arm.rotation.y = Math.atan2(-c[1], c[0]) + (c[0] * c[1] > 0 ? 0 : 0);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), kit.dark);
      hub.position.set(c[0] * 0.66, 0.56, c[1] * 0.54);
      const rotor = new THREE.Group();
      rotor.position.copy(hub.position).setY(0.61);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.01, 20), kit.blur);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.015, 0.06), kit.dark);
      rotor.add(disc, blade);
      const nav = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), c[1] > 0 ? kit.navGreen : kit.navRed);
      nav.position.set(c[0] * 0.72, 0.52, c[1] * 0.6);
      body.add(arm, hub, rotor, nav);
      rotors.push(rotor);
    });
    cab.add(body);
    cab.scale.setScalar(0.86);
    cab.userData.body = body;
    cab.userData.rotors = rotors;
    return cab;
  }

  function taxiParts() {
    if (taxiKit) return taxiKit;
    const h = document.createElement('canvas');
    h.width = 128;
    h.height = 128;
    let ctx = h.getContext('2d');
    ctx.fillStyle = '#5b6066';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#f2b91f';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(40, 32, 14, 64);
    ctx.fillRect(74, 32, 14, 64);
    ctx.fillRect(40, 57, 48, 14);
    const helipad = new THREE.CanvasTexture(h);
    helipad.colorSpace = THREE.SRGBColorSpace;
    helipad.anisotropy = 4;
    helipad.userData.shared = true;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 16;
    ctx = c.getContext('2d');
    ctx.fillStyle = '#f2b91f';
    ctx.fillRect(0, 0, 64, 16);
    ctx.fillStyle = '#1f1f1f';
    for (let x = 0; x < 64; x += 8) {
      ctx.fillRect(x, (x / 8) % 2 === 0 ? 4 : 8, 4, 4);
      ctx.fillRect(x + 4, (x / 8) % 2 === 0 ? 8 : 4, 4, 4);
    }
    const chequer = new THREE.CanvasTexture(c);
    chequer.colorSpace = THREE.SRGBColorSpace;
    chequer.magFilter = THREE.NearestFilter;
    chequer.userData.shared = true;
    taxiKit = {
      yellow: machineMat.yellow,
      dark: machineMat.dark,
      glass: machineMat.glass,
      lamp: machineMat.light,
      chequer: new THREE.MeshStandardMaterial({ map: chequer, roughness: 0.45, metalness: 0.2 }),
      helipad: new THREE.MeshStandardMaterial({ map: helipad, roughness: 0.85 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0x8f8b84, roughness: 0.92 }),
      padLight: new THREE.MeshStandardMaterial({ color: 0x9ff0ff, emissive: 0x5fd8ff, emissiveIntensity: 0.8 }),
      blur: new THREE.MeshBasicMaterial({ color: 0xdfe6ea, transparent: true, opacity: 0.22, depthWrite: false }),
      navRed: new THREE.MeshStandardMaterial({ color: 0xff4a3a, emissive: 0xff2a1a, emissiveIntensity: 1 }),
      navGreen: new THREE.MeshStandardMaterial({ color: 0x5dff7a, emissive: 0x2aff4a, emissiveIntensity: 1 }),
    };
    return taxiKit;
  }

  // Every frame: each cab follows its logic position, turns towards where it flies, leans into the
  // flight, bobs while hovering; rotors idle on the pad, spin up to board and fly; dust off the ground.
  function updateTaxis(dt) {
    if (!taxiView || !world || !world.taxis) return;
    const kit = taxiParts();
    taxiView.time += dt;
    const blink = Math.sin(taxiView.time * 5) > 0.3;
    kit.navRed.emissiveIntensity = blink ? 1.4 : 0.2;
    kit.navGreen.emissiveIntensity = blink ? 0.2 : 1.4;
    kit.padLight.emissiveIntensity = 0.5 + 0.4 * Math.sin(taxiView.time * 2.4);
    world.taxis.forEach(function (taxi, i) {
      const view = taxiView.cabs[i];
      if (!view) return;
      const cab = view.group;
      const flying = taxi.state === 'carry' || taxi.state === 'return';
      const airborne = taxi.pos[1] > 0.05 || (flying && taxi.leg > 0);
      const hover = airborne && timeScale !== 20 ? Math.sin(taxiView.time * 3.3 + i) * 0.05 : 0;
      cab.position.set(taxi.pos[0], taxi.pos[1] + 0.1 + hover, taxi.pos[2]);
      // Heading: the cab's nose is its +x; turns smoothly.
      let turn = (taxi.heading - Math.PI / 2) - view.yaw;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      view.yaw += turn * Math.min(1, dt * 6);
      cab.rotation.y = view.yaw;
      // Leaning into the flight across, levelling off for the climb and the descent.
      const across = flying && taxi.leg === 1 ? 1 : 0;
      view.lean += (across * 0.22 - view.lean) * Math.min(1, dt * 4);
      cab.userData.body.rotation.z = -view.lean;
      // Booked: idling slowly while its passenger walks up.
      const target = taxi.state === 'parked' ? 0 : taxi.state === 'booked' ? 6 : taxi.state === 'boarding' || taxi.state === 'alighting' ? 18 : 40;
      view.spin += (target - view.spin) * Math.min(1, dt * 2);
      const rotors = cab.userData.rotors;
      for (let r = 0; r < rotors.length; r++) rotors[r].rotation.y += (r % 2 ? -1 : 1) * view.spin * dt;
      // Dust as it lifts off or sets down on the ground.
      if (dt > 0 && taxi.pos[1] < 1.2 && flying && (taxi.leg === 0 || taxi.leg === 2) && Math.random() < dt * 14) {
        burst(taxi.pos[0], 0.1, taxi.pos[2], 0xcbb894, 2);
      }
      view.state = taxi.state;
    });
  }

  // A worker with a taxi (logic: phase 'taxi'): a hop into the tub from the pad, the flight standing
  // in it, a hop out at the drop. → world position and yaw, or null.
  function taxiRide(builder) {
    const taxi = builder.taxi;
    if (!taxi || !taxiView) return null;
    const view = taxiView.cabs[taxi.index];
    if (!view) return null;
    const cab = view.group;
    cab.updateMatrixWorld();
    taxiSeat.set(-0.06, 0.18, 0);
    cab.localToWorld(taxiSeat);
    const u = Math.min(1, taxi.t / MB.TAXI.board);
    // A hop faces where he jumps; in the tub he looks ahead with the cab.
    const hop = function (a, b, t) {
      const yaw = Math.abs(b[0] - a[0]) + Math.abs(b[2] - a[2]) > 0.05 ? Math.atan2(b[0] - a[0], b[2] - a[2]) : view.yaw + Math.PI / 2;
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * 0.55, z: a[2] + (b[2] - a[2]) * t, yaw: yaw };
    };
    const seat = [taxiSeat.x, taxiSeat.y, taxiSeat.z];
    if (taxi.state === 'boarding') return hop([builder.cell[0] + 0.5, builder.cell[1], builder.cell[2] + 0.5], seat, u);
    if (taxi.state === 'alighting' && taxi.drop) return hop(seat, [taxi.drop[0] + 0.5, taxi.drop[1], taxi.drop[2] + 0.5], u);
    if (builder.taxiRiding) return { x: seat[0], y: seat[1], z: seat[2], yaw: view.yaw + Math.PI / 2 };
    return null;
  }

  function yardGroup(vehicle) {
    sceneRoots();
    let group = yardRoot.getObjectByName('yard-' + vehicle.index);
    if (!group) {
      group = new THREE.Group();
      group.name = 'yard-' + vehicle.index;
      yardRoot.add(group);
    }
    return group;
  }

  function openYard(event) {
    const group = yardGroup(event.vehicle);
    while (group.children.length > 0) {
      const piece = group.children[0];
      group.remove(piece);
      disposeObject(piece);
    }
    const yard = event.yard;
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.8 });
    const post = new THREE.BoxGeometry(0.12, 1.2, 0.12);
    const corners = [
      [yard.x, yard.z],
      [yard.x + yard.width, yard.z],
      [yard.x, yard.z + yard.width],
      [yard.x + yard.width, yard.z + yard.width],
    ];
    for (let i = 0; i < corners.length; i++) {
      const mesh = new THREE.Mesh(post, wood);
      mesh.position.set(corners[i][0], 0.6, corners[i][1]);
      group.add(mesh);
    }
  }

  function addYardBoard(event) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.08, 0.92),
      new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.9 })
    );
    mesh.position.set(event.x + 0.5, event.y + 0.04, event.z + 0.5);
    mesh.name = 'deck-' + event.vehicle;
    yardRoot.add(mesh);
  }

  function addYardCube(event) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      blockSurface(event.materialId, false)
    );
    mesh.position.set(event.x + 0.5, event.y + 0.5, event.z + 0.5);
    mesh.name = 'pattern-' + event.vehicle;
    mesh.userData.rest = mesh.position.clone();
    yardRoot.add(mesh);
  }

  function clearYardRig(vehicle) {
    if (!yardRoot) return;
    const fence = yardRoot.getObjectByName('yard-' + vehicle.index);
    if (fence) {
      yardRoot.remove(fence);
      disposeObject(fence);
    }
    for (let i = yardRoot.children.length - 1; i >= 0; i--) {
      const child = yardRoot.children[i];
      if (child.name !== 'deck-' + vehicle.index) continue;
      yardRoot.remove(child);
      disposeObject(child);
    }
  }

  function clearYard(vehicle) {
    clearYardRig(vehicle);
    if (!yardRoot) return;
    // Pattern cubes wear the cached block surface: only their own box is freed.
    for (let i = yardRoot.children.length - 1; i >= 0; i--) {
      const child = yardRoot.children[i];
      if (child.name !== 'pattern-' + vehicle.index) continue;
      yardRoot.remove(child);
      child.geometry.dispose();
    }
  }

  function patternMeshes(vehicle) {
    if (!yardRoot) return [];
    const meshes = [];
    for (let i = 0; i < yardRoot.children.length; i++) {
      const child = yardRoot.children[i];
      if (child.name === 'pattern-' + vehicle.index) meshes.push(child);
    }
    return meshes;
  }

  function mountWorld(group, vehicle) {
    return group.localToWorld(new THREE.Vector3(0, 0.05, 0));
  }

  function patternAnchor(vehicle, atDest) {
    const x = atDest ? vehicle.destMinX : vehicle.yard.x;
    const y = atDest ? vehicle.destMinY : 0;
    const z = atDest ? vehicle.destMinZ : vehicle.yard.z;
    return new THREE.Vector3(
      x + vehicle.patternSpanX / 2 + 0.5,
      y + vehicle.patternMaxY + 1,
      z + vehicle.patternSpanZ / 2 + 0.5
    );
  }

  function smoothStep(t) {
    const x = t < 0 ? 0 : t > 1 ? 1 : t;
    return x * x * (3 - 2 * x);
  }

  function hookWorld(group, vehicle) {
    if (vehicle.kind === 'heli') {
      const mount = mountWorld(group, vehicle);
      const stow = mount.clone();
      stow.y -= window.MicroBuildersBalance.tuning.machines.stowDrop;
      if (!vehicle.yard) return stow;
      const yard = patternAnchor(vehicle, false);
      const dest = patternAnchor(vehicle, true);
      const hung = mount.clone();
      hung.y -= vehicle.cableLength;
      if (vehicle.phase === 'hook') return stow.lerp(yard, smoothStep(vehicle.hookT));
      if (vehicle.phase === 'lift' || (vehicle.carried && vehicle.phase !== 'lower')) return hung;
      if (vehicle.phase === 'lower') return hung.lerp(dest, smoothStep(vehicle.hookT));
      return stow;
    }
    return group.userData.hook.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.12, 0));
  }

  function drawLink(group, cable, hook, fromWorld, toWorld) {
    group.updateWorldMatrix(true, false);
    const a = group.worldToLocal(fromWorld.clone());
    const b = group.worldToLocal(toWorld.clone());
    cable.position.copy(a).lerp(b, 0.5);
    cable.scale.set(1, Math.max(a.distanceTo(b), 0.05), 1);
    cable.quaternion.identity();
    const dir = b.clone().sub(a);
    if (dir.lengthSq() > 0.0001) {
      cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
    if (hook) hook.position.copy(b);
  }

  function pinPattern(vehicle, hookPoint) {
    const meshes = patternMeshes(vehicle);
    if (!vehicle.yard || meshes.length === 0) return;
    const anchor = patternAnchor(vehicle, false);
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      const rest = mesh.userData.rest || mesh.position;
      if (!vehicle.carried) {
        mesh.position.copy(rest);
      } else {
        mesh.position.set(
          hookPoint.x + (rest.x - anchor.x),
          hookPoint.y + (rest.y - anchor.y),
          hookPoint.z + (rest.z - anchor.z)
        );
      }
    }
  }

  function patternTop(meshes) {
    let top = meshes[0].position.clone();
    for (let i = 1; i < meshes.length; i++) {
      if (meshes[i].position.y > top.y) top = meshes[i].position.clone();
    }
    let x = 0;
    let z = 0;
    for (let i = 0; i < meshes.length; i++) {
      x += meshes[i].position.x;
      z += meshes[i].position.z;
    }
    top.x = x / meshes.length;
    top.z = z / meshes.length;
    top.y += 0.45;
    return top;
  }

  function syncVehiclePayload(group, vehicle) {
    const payload = group.userData.payload;
    const signature = vehicle.plan.map(function (block) { return block.id; }).join(',');
    if (signature === group.userData.payloadSignature) return;
    group.userData.payloadSignature = signature;
    while (payload.children.length > 0) payload.remove(payload.children[0]);
    const anchor = vehicle.payloadHookBlock;
    for (let i = 0; i < vehicle.plan.length; i++) {
      const block = vehicle.plan[i];
      const voxel = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        blockSurface(block.materialId, false)
      );
      voxel.position.set(block.x - anchor.x, block.y - anchor.y, block.z - anchor.z);
      voxel.castShadow = true;
      voxel.receiveShadow = true;
      payload.add(voxel);
    }
  }

  function updatePatternGhosts() {
    const slots = [];
    if (world) {
      for (let v = 0; v < world.vehicles.length; v++) {
        const vehicle = world.vehicles[v];
        if (!vehicle.yard || vehicle.phase !== 'assemble') continue;
        for (let i = 0; i < vehicle.pattern.length; i++) {
          if (!vehicle.pattern[i].done) slots.push(vehicle.pattern[i]);
        }
      }
    }
    const signature = slots.map(function (slot) { return slot.block.id; }).join(',');
    if (signature === patternGhostSignature) return;
    patternGhostSignature = signature;
    while (patternGhosts.children.length > 0) patternGhosts.remove(patternGhosts.children[0]);
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const fill = new THREE.Mesh(patternGhostGeometry, patternGhostFill);
      fill.position.set(slot.wx + 0.5, slot.wy + 0.5, slot.wz + 0.5);
      fill.renderOrder = 2;
      const edge = new THREE.LineSegments(patternGhostEdges, patternGhostLine);
      edge.position.copy(fill.position);
      patternGhosts.add(fill, edge);
    }
  }

  function updateVehicles(realDt) {
    updatePatternGhosts();
    const visualDt = realDt * Math.min(4, Math.sqrt(Math.max(timeScale, 0)));
    vehicleViews.forEach(function (group, vehicle) {
      const t = vehicle.segmentT;
      const targetX = vehicle.kind === 'heli'
        ? vehicle.cell[0] + 0.5
        : vehicle.from[0] + (vehicle.to[0] - vehicle.from[0]) * t + 0.5;
      const targetZ = vehicle.kind === 'heli'
        ? vehicle.cell[2] + 0.5
        : vehicle.from[2] + (vehicle.to[2] - vehicle.from[2]) * t + 0.5;
      const previousX = group.userData.displayX;
      const previousZ = group.userData.displayZ;
      group.userData.displayX = targetX;
      group.userData.displayZ = targetZ;
      const moved = Math.hypot(targetX - previousX, targetZ - previousZ);
      const altitude = vehicle.kind === 'heli' ? vehicle.altitude : 0;
      group.position.set(targetX, altitude, targetZ);
      if (vehicle.headingReady) group.rotation.y = vehicle.heading;
      const turn = vehicle.headingReady ? angleBetween(group.userData.lastHeading, vehicle.heading) : 0;
      group.userData.lastHeading = vehicle.headingReady ? vehicle.heading : group.userData.lastHeading;
      if (vehicle.kind === 'heli') {
        updateHeliView(group, vehicle, visualDt, moved, turn);
        heliFx(group, vehicle, realDt);
        return;
      }
      updateLoaderView(group, vehicle, visualDt, moved, turn);
      loaderFx(group, vehicle, realDt, moved);
    });
    // Кучка из самосвала коснулась земли — клубок пыли; у кучи он молотит на холостых — сизый выхлоп.
    const time = clock.elapsedTime;
    const hit = MicroBuildersVehicles.animateTruck(time);
    if (hit && timeScale > 0 && timeScale < 5) fx.dust(hit.x, 0.25, hit.z);
    const exhaust = timeScale > 0 && timeScale < 5 && MicroBuildersVehicles.truckExhaust(time);
    if (exhaust) fx.smoke(exhaust.x, exhaust.y, exhaust.z);
  }

  // Кран-машина (art/fx.js): сизый выхлоп из трубы — на ходу и под грузом чаще; на ходу пыль из-под задних колёс.
  // Только на ×1–×4.
  function loaderFx(group, vehicle, realDt, moved) {
    if (timeScale <= 0 || timeScale >= 5) return;
    const data = group.userData;
    const driving = moved > 0.002;
    data.smokeT = (data.smokeT === undefined ? Math.random() : data.smokeT) - realDt;
    if (data.smokeT <= 0) {
      const busy = driving || vehicle.phase === 'hook' || vehicle.phase === 'lift' || vehicle.phase === 'lower' || vehicle.phase === 'build';
      data.smokeT = busy ? 0.4 + Math.random() * 0.2 : 1.2 + Math.random() * 0.6;
      vehicleFxPoint.set(0.42, 1.24, -0.62).applyMatrix4(group.matrixWorld);
      fx.smoke(vehicleFxPoint.x, vehicleFxPoint.y, vehicleFxPoint.z);
    }
    data.dustT = (data.dustT || 0) - realDt;
    if (driving && data.dustT <= 0) {
      data.dustT = 0.1;
      const dx = Math.sin(group.rotation.y);
      const dz = Math.cos(group.rotation.y);
      for (let side = -1; side <= 1; side += 2) {
        vehicleFxPoint.set(side * 0.6, 0, -0.62).applyMatrix4(group.matrixWorld);
        fx.trail(vehicleFxPoint.x, 0, vehicleFxPoint.z, dx, dz);
      }
    }
  }

  // Вертолёт у земли: поток от винта поднимает пыль кольцом, тем гуще, чем он ниже (выше 4 клеток — нет).
  function heliFx(group, vehicle, realDt) {
    if (timeScale <= 0 || timeScale >= 5 || vehicle.altitude > 4) return;
    const data = group.userData;
    data.dustT = (data.dustT || 0) - realDt;
    if (data.dustT > 0) return;
    data.dustT = 0.2 + 0.15 * Math.max(0, vehicle.altitude - 1);
    fx.dust(group.position.x, 0.05, group.position.z);
  }

  function angleBetween(from, to) {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function approach(current, target, rate) {
    return current + (target - current) * Math.min(1, rate);
  }

  function updateHeliView(group, vehicle, dt, moved, turn) {
    const data = group.userData;
    const frameDt = Math.max(dt, 1e-3);
    const speed = timeScale === 0 ? 0 : moved / frameDt;
    const maxSpeed = MB.upgradeValue(world.campaign, 'heliSpeed', world.campaign.purchases.heliSpeed);
    data.pitch = approach(data.pitch, Math.min(0.28, speed / Math.max(maxSpeed, 1) * 0.28), dt * 3);
    data.roll = approach(data.roll, Math.max(-0.3, Math.min(0.3, -turn / frameDt * 0.12)), dt * 3);
    data.body.rotation.set(data.pitch, 0, data.roll, 'YXZ');
    const bob = timeScale === 20 ? 0 : Math.sin(performance.now() * 0.0021 + vehicle.index) * 0.05;
    data.body.position.y = bob;
    data.rotor.rotation.y += dt * 26;
    data.tailRotor.rotation.x += dt * 38;
    const point = hookWorld(group, vehicle);
    pinPattern(vehicle, point);
    drawLink(group, data.cable, data.hook, mountWorld(group, vehicle), point);
    data.payload.visible = false;
  }

  function updateLoaderView(group, vehicle, dt, moved, turn) {
    const data = group.userData;
    const frameDt = Math.max(dt, 1e-3);
    for (let i = 0; i < data.wheels.length; i++) data.wheels[i].rotation.x += moved / 0.27;
    data.steerAngle = approach(data.steerAngle, Math.max(-0.5, Math.min(0.5, turn / frameDt * 0.35)), dt * 6);
    for (let i = 0; i < data.steer.length; i++) data.steer[i].rotation.y = data.steerAngle;
    const lifting = vehicle.phase === 'hook' || vehicle.phase === 'lift' || vehicle.phase === 'lower' ||
      vehicle.phase === 'fold' || vehicle.phase === 'build';
    data.deploy = approach(data.deploy, lifting ? 1 : 0, dt * 3);
    for (let i = 0; i < data.outriggers.length; i++) {
      const leg = data.outriggers[i];
      leg.userData.beam.position.x = leg.userData.side * (0.15 + 0.22 * data.deploy);
      leg.userData.foot.position.x = leg.userData.side * (0.28 + 0.44 * data.deploy);
      leg.userData.pad.position.x = leg.userData.foot.position.x;
      leg.userData.foot.position.y = -0.1 - 0.08 * data.deploy;
      leg.userData.pad.position.y = -0.2 - 0.16 * data.deploy;
    }
    const busy = vehicle.phase === 'drive' || lifting;
    data.beacon.material.emissiveIntensity = busy ? (Math.sin(performance.now() * 0.012) > 0 ? 1.4 : 0.15) : 0.15;

    poseCrane(group, MB.cranePose(vehicle));
    group.updateMatrixWorld(true);
    const hookPoint = hookWorld(group, vehicle);
    const patternJob = !!vehicle.yard && (vehicle.carried || vehicle.phase === 'lift' || vehicle.phase === 'lower');
    if (patternJob) pinPattern(vehicle, hookPoint);
    if (vehicle.payloadReady && !vehicle.yard) syncVehiclePayload(group, vehicle);
    data.payload.visible = vehicle.payloadReady && !vehicle.yard;
    if (data.payload.visible) {
      data.hook.getWorldQuaternion(data.payloadQuaternion);
      data.payload.quaternion.copy(data.payloadQuaternion.invert());
    }
  }

  // Lay the crane out from a logic pose: mast height, jib swing and reach, cable length.
  function poseCrane(group, pose) {
    const data = group.userData;
    const top = Math.max(0.5, pose.mast - MB.CRANE.turretY);
    data.mast.scale.y = Math.min(top, 1.4);
    data.mast.position.y = data.mast.scale.y / 2;
    data.mastInner.scale.y = top;
    data.mastInner.position.y = top / 2;
    data.turret.rotation.y = pose.yaw;
    data.turret.position.set(MB.CRANE.turretX + (pose.shiftX || 0), MB.CRANE.turretY, MB.CRANE.turretZ + (pose.shiftZ || 0));
    data.head.position.y = top;
    data.jib.scale.z = pose.reach + 0.1;
    data.jib.position.z = (pose.reach + 0.1) / 2;
    data.trolley.position.z = pose.reach;
    data.cable.scale.y = Math.max(0.05, pose.cable);
    data.cable.position.set(0, -pose.cable / 2, pose.reach);
    data.hook.position.set(0, -pose.cable - 0.12, pose.reach);
  }

  // Стол планирования рабочего: доски на жёлтых козлах с чертежом (art/vehicles.js desk).
  function addPlanningDesk(cell) {
    MicroBuildersVehicles.desk(cell[0] + 0.5, cell[2] + 0.5, levelRoot);
  }

  function focusWorker(builder) {
    if (cameraController.isWorkerView()) cameraController.setWorkerView(false);
    selectedBuilder = builder === selectedBuilder ? null : builder;
    // The camera centres on the selected worker (closer than the site view; turn, tilt and zoom stay
    // free) and goes back to the site when the card closes.
    if (selectedBuilder) cameraController.setTrack(selectedWorkerPoint);
    else cameraController.clearTrack();
    workerPlanSignature = '';
    stickViews.forEach(function (viewState, candidate) {
      // Drones have no selection ring (they are not selectable).
      const ring = viewState.group.userData.selection;
      if (ring) ring.visible = candidate === selectedBuilder;
    });
    if (!selectedBuilder) clearWorkerPlan();
    updateWorkerViewButton();
    MicroBuildersWorkerLog.paint(world, selectedBuilder);
    paintWorkerCard();
  }

  function selectWorker(event) {
    if (currentScreen === 'hq') {
      pickCity(event);
      return;
    }
    const rect = view.getBoundingClientRect();
    workerPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    workerRaycaster.setFromCamera(workerPointer, camera);
    const targets = [];
    stickViews.forEach(function (viewState, builder) {
      if (builder.trade !== 'engineer') targets.push(viewState.group);
    });
    const hits = workerRaycaster.intersectObjects(targets, true);
    let builder = null;
    if (hits.length > 0) {
      let object = hits[0].object;
      while (object && !object.userData.builder) object = object.parent;
      if (object) builder = object.userData.builder;
    }
    const camp = builder ? null : pickCampView();
    if (camp) {
      openCamp(camp.site.id);
      return;
    }
    focusWorker(builder);
  }

  // Where the camera looks while a worker is selected: his figure, at chest height.
  function selectedWorkerPoint() {
    const view = selectedBuilder ? stickViews.get(selectedBuilder) : null;
    if (!view || !view.group) return null;
    return { x: view.group.position.x, y: view.group.position.y + 0.8, z: view.group.position.z };
  }

  // ---- selected worker: built cubes between the camera and him turn see-through ----
  // A wide ray (XRAY_RADIUS) from the eye to the worker: every built cube near it but the ones right
  // around him (his floor stays) is hidden in its instanced mesh and drawn as its own copy that fades
  // to see-through in XRAY_FADE seconds, and back before the cube returns. The ray is recounted ten
  // times a second, the fades run every frame.
  function xrayMaterial(materialId) {
    let material = xray.materials[materialId];
    if (!material) {
      material = surfaceClone(blockSurface(materialId, false));
      material.transparent = true;
      material.depthWrite = false;
      xray.materials[materialId] = material;
    }
    return material;
  }

  function updateWorkerXray(dt) {
    if (currentScreen !== 'build' || cityRoot.visible || !world) {
      if (xray.hidden.size) clearXray();
      return;
    }
    const view = selectedBuilder ? stickViews.get(selectedBuilder) : null;
    xray.clock -= dt;
    if (xray.clock <= 0) {
      xray.clock = 0.1;
      const want = view ? xrayBlocks(view) : null;
      xray.hidden.forEach(function (entry, block) { entry.dir = want && want.has(block) ? 1 : -1; });
      if (want) want.forEach(function (block) { if (!xray.hidden.has(block)) hideXray(block); });
    }
    // Fades: t 0 — the cube as it is, 1 — see-through.
    xray.hidden.forEach(function (entry, block) {
      entry.t = Math.min(1, Math.max(0, entry.t + entry.dir * dt / XRAY_FADE));
      const k = entry.t * entry.t * (3 - 2 * entry.t);
      entry.mesh.material.opacity = 1 - (1 - XRAY_OPACITY) * k;
      if (entry.dir < 0 && entry.t <= 0) unhideXray(block, entry);
    });
  }

  // Built cubes in the wide ray from the eye to the worker (not the last 1.3 cells before him).
  function xrayBlocks(view) {
    const a = camera.position;
    const bx = view.group.position.x;
    const by = view.group.position.y + 0.8;
    const bz = view.group.position.z;
    const abx = bx - a.x;
    const aby = by - a.y;
    const abz = bz - a.z;
    const want = new Set();
    const len2 = abx * abx + aby * aby + abz * abz;
    if (len2 < 1e-6) return want;
    const tMax = Math.max(0, 1 - 1.3 / Math.sqrt(len2));
    const r = XRAY_RADIUS + 0.5;
    const minX = Math.min(a.x, bx) - r;
    const maxX = Math.max(a.x, bx) + r;
    const minY = Math.min(a.y, by) - r;
    const maxY = Math.max(a.y, by) + r;
    const minZ = Math.min(a.z, bz) - r;
    const maxZ = Math.max(a.z, bz) + r;
    const r2 = XRAY_RADIUS * XRAY_RADIUS;
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (!block.built || block.feature || block.glassOf !== undefined) continue;
      const cx = block.x + 0.5;
      const cy = block.y + 0.5;
      const cz = block.z + 0.5;
      if (cx < minX || cx > maxX || cy < minY || cy > maxY || cz < minZ || cz > maxZ) continue;
      const t = ((cx - a.x) * abx + (cy - a.y) * aby + (cz - a.z) * abz) / len2;
      if (t <= 0 || t >= tMax) continue;
      const px = a.x + abx * t - cx;
      const py = a.y + aby * t - cy;
      const pz = a.z + abz * t - cz;
      if (px * px + py * py + pz * pz <= r2) want.add(block);
    }
    return want;
  }

  function hideXray(block) {
    const record = blockViews.get(block.id);
    if (!record || !record.solid) return;
    setBlockVisualScale(record, 0.001, 0.001);
    if (!xray.geometry) xray.geometry = Blocks.geometry(0.98, 0.07);
    // Its own material: every cube fades on its own clock.
    const mesh = new THREE.Mesh(xray.geometry, surfaceClone(xrayMaterial(block.materialId)));
    mesh.material.opacity = 1;
    mesh.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
    mesh.renderOrder = 2;
    levelRoot.add(mesh);
    xray.hidden.set(block, { mesh: mesh, t: 0, dir: 1 });
  }

  function unhideXray(block, entry) {
    const record = blockViews.get(block.id);
    if (record) setBlockVisualScale(record, 1, 0.001);
    levelRoot.remove(entry.mesh);
    entry.mesh.material.dispose();
    xray.hidden.delete(block);
  }

  // At once (leaving the site view); a deselected worker fades the cubes back instead.
  function clearXray() {
    xray.hidden.forEach(function (entry, block) { unhideXray(block, entry); });
  }

  // Old «Следовать» button state (the card has no such button now; the debug follow still uses it).
  function updateWorkerViewButton() {
    const follow = document.getElementById('worker-card-follow');
    if (!follow) return;
    const on = cameraController.isWorkerView();
    follow.classList.toggle('on', on);
    follow.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // ---------- status icons (docs/gdd/16-ux-flow.md §6) ----------

  // One canvas holds every glyph twice (plain and with the hunger pip) plus the lone pip. Each cell
  // gets its own SpriteMaterial over a clone of the texture: the clones share the canvas, so it is
  // uploaded once and nothing is ever repainted.
  function badgeMaterials() {
    if (badgeAtlas) return badgeAtlas;
    const cols = 8;
    const rows = 4;
    const canvas = document.createElement('canvas');
    canvas.width = cols * 128;
    canvas.height = rows * 128;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const materials = {};
    let cell = 0;
    function addCell(kind, pip) {
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      cell += 1;
      context.save();
      context.translate(col * 128, row * 128);
      drawBadgeCell(context, kind, pip);
      context.restore();
      const map = texture.clone();
      map.repeat.set(1 / cols, 1 / rows);
      map.offset.set(col / cols, 1 - (row + 1) / rows);
      return new THREE.SpriteMaterial({ map: map, transparent: true, depthTest: false, depthWrite: false });
    }
    Object.keys(BADGE_COLORS).forEach(function (kind) {
      materials[kind] = [addCell(kind, false), addCell(kind, true)];
    });
    materials.hunger = [null, addCell('', true)];
    texture.needsUpdate = true;
    badgeAtlas = { texture: texture, materials: materials };
    return badgeAtlas;
  }

  function drawBadgeCell(context, kind, pip) {
    context.save();
    // A margin inside every cell keeps the mipmaps of neighbouring glyphs apart.
    context.translate(64, 64);
    context.scale(0.92, 0.92);
    context.translate(-64, -64);
    if (kind) {
      context.beginPath();
      context.arc(64, 64, 48, 0, Math.PI * 2);
      context.fillStyle = BADGE_COLORS[kind];
      context.fill();
      drawNeedGlyph(context, kind);
      // The faint track under the progress ring (the ring itself is a mesh, see createWorkerBadge).
      context.beginPath();
      context.arc(64, 64, 56, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(255,248,238,0.28)';
      context.lineWidth = 8;
      context.stroke();
    }
    if (pip) {
      context.beginPath();
      context.arc(104, 24, 14, 0, Math.PI * 2);
      context.fillStyle = '#ff3b3b';
      context.fill();
      context.strokeStyle = '#fff8ee';
      context.lineWidth = 4;
      context.stroke();
    }
    context.restore();
  }

  function drawNeedGlyph(context, kind) {
    if (kind === 'meal') {
      context.fillStyle = '#c0392b';
      context.beginPath();
      context.arc(64, 58, 18, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#2f8f46';
      context.beginPath();
      context.ellipse(78, 44, 10, 6, -0.7, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#6b3a16';
      context.lineWidth = 4;
      context.lineCap = 'butt';
      context.beginPath();
      context.moveTo(64, 42);
      context.lineTo(64, 32);
      context.stroke();
    } else if (kind === 'rest') {
      context.fillStyle = '#f7f3ea';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '800 58px Manrope, sans-serif';
      context.fillText('Z', 48, 74);
      context.font = '800 34px Manrope, sans-serif';
      context.fillText('z', 84, 46);
    } else if (kind === 'haul') {
      context.fillStyle = '#e9d3a8';
      context.beginPath();
      context.moveTo(64, 34);
      context.lineTo(92, 48);
      context.lineTo(64, 62);
      context.lineTo(36, 48);
      context.closePath();
      context.fill();
      context.fillStyle = '#c99b5c';
      context.beginPath();
      context.moveTo(36, 48);
      context.lineTo(64, 62);
      context.lineTo(64, 94);
      context.lineTo(36, 80);
      context.closePath();
      context.fill();
      context.fillStyle = '#a5753c';
      context.beginPath();
      context.moveTo(92, 48);
      context.lineTo(64, 62);
      context.lineTo(64, 94);
      context.lineTo(92, 80);
      context.closePath();
      context.fill();
    } else if (kind === 'fetch') {
      context.strokeStyle = '#c9a26b';
      context.lineWidth = 7;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(46, 90);
      context.lineTo(80, 44);
      context.stroke();
      context.strokeStyle = '#d9dde2';
      context.lineWidth = 8;
      context.beginPath();
      context.arc(80, 70, 34, -2.3, -0.75);
      context.stroke();
    } else if (kind === 'build') {
      context.strokeStyle = '#c9a26b';
      context.lineWidth = 8;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(48, 92);
      context.lineTo(76, 52);
      context.stroke();
      context.save();
      context.translate(78, 48);
      context.rotate(0.6);
      context.fillStyle = '#d9dde2';
      context.fillRect(-22, -9, 44, 18);
      context.restore();
    } else if (kind === 'plan') {
      context.fillStyle = '#f4efe6';
      context.fillRect(42, 36, 44, 56);
      context.fillStyle = '#8a6a2b';
      context.fillRect(54, 30, 20, 10);
      context.fillStyle = '#7a8a80';
      context.fillRect(50, 52, 28, 5);
      context.fillRect(50, 64, 28, 5);
      context.fillRect(50, 76, 18, 5);
    } else if (kind === 'front') {
      // Grey hourglass: no free cubes, the worker waits at the desk.
      context.fillStyle = '#ece8e0';
      context.fillRect(40, 30, 48, 8);
      context.fillRect(40, 90, 48, 8);
      context.beginPath();
      context.moveTo(46, 38);
      context.lineTo(82, 38);
      context.lineTo(66, 64);
      context.lineTo(82, 90);
      context.lineTo(46, 90);
      context.lineTo(62, 64);
      context.closePath();
      context.fillStyle = '#c9c4ba';
      context.fill();
      context.fillStyle = '#8f8a80';
      context.beginPath();
      context.moveTo(52, 90);
      context.lineTo(76, 90);
      context.lineTo(64, 76);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(54, 42);
      context.lineTo(74, 42);
      context.lineTo(64, 56);
      context.closePath();
      context.fill();
    } else if (kind === 'path') {
      // Road barrier: the way ahead is closed for now.
      context.fillStyle = '#3a2a1c';
      context.fillRect(38, 58, 8, 36);
      context.fillRect(82, 58, 8, 36);
      context.fillStyle = '#f4efe6';
      context.fillRect(28, 46, 72, 18);
      context.fillStyle = '#d64535';
      for (let i = 0; i < 4; i++) {
        context.beginPath();
        context.moveTo(32 + i * 18, 64);
        context.lineTo(42 + i * 18, 46);
        context.lineTo(50 + i * 18, 46);
        context.lineTo(40 + i * 18, 64);
        context.closePath();
        context.fill();
      }
    } else if (kind === 'lost' || kind === 'lostShort') {
      context.fillStyle = '#fff8ee';
      context.fillRect(57, 30, 14, 44);
      context.beginPath();
      context.arc(64, 90, 8, 0, Math.PI * 2);
      context.fill();
    } else if (kind === 'overload') {
      // Kettlebell: a wide handle loop over a round body on a flat foot.
      context.strokeStyle = '#f4efe6';
      context.lineWidth = 8;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(64, 52, 17, Math.PI * 0.82, Math.PI * 2.18);
      context.stroke();
      context.fillStyle = '#f4efe6';
      context.beginPath();
      context.ellipse(64, 76, 25, 21, 0, 0, Math.PI * 2);
      context.fill();
      context.fillRect(48, 90, 32, 7);
    } else {
      context.fillStyle = '#f4efe6';
      context.fillRect(30, 68, 54, 14);
      context.fillStyle = '#e07a32';
      context.fillRect(80, 68, 16, 14);
      context.fillStyle = 'rgba(255,255,255,0.92)';
      context.beginPath();
      context.arc(74, 46, 12, 0, Math.PI * 2);
      context.arc(96, 30, 8, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Per worker: the icon sprite (a shared atlas material), the progress ring (own geometry, drawn
  // partly with drawRange) and a text label made on first use. They live in badgeRoot, outside the
  // worker group, so the lean and scale of the body do not tilt them.
  function createWorkerBadge(drone) {
    const atlas = badgeMaterials();
    const group = new THREE.Group();
    const icon = new THREE.Sprite(atlas.materials.plan[0]);
    icon.renderOrder = 40;
    // Radii match the track drawn in the atlas cell (56 ± 4 px of 128, scaled by 0.92).
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.374, 0.431, BADGE_RING_SEGMENTS, 1, Math.PI / 2, Math.PI * 2),
      badgeRingMaterial
    );
    ring.scale.x = -1; // clockwise from the top
    ring.renderOrder = 41;
    ring.visible = false;
    ring.geometry.setDrawRange(0, 0);
    group.add(icon, ring);
    group.visible = false;
    badgeRoot.add(group);
    return {
      group: group,
      icon: icon,
      ring: ring,
      label: null,
      labelText: '',
      size: drone ? 0.6 : BADGE_SIZE,
      lift: drone ? 0.72 : 1.62,
      shown: '',
      shownT: BADGE_HOLD,
      pending: '',
      pendingT: 0,
      changes: 0,
      segments: 0,
      pop: 1,
      alertUntil: 0,
    };
  }

  // What the worker is about, as one icon kind ('' — plain walking: no icon).
  function workerIntent(builder, load, badge) {
    const phase = builder.phase;
    const purpose = phase === 'walk' ? builder.walkPurpose : '';
    if (badge.alertUntil > fxTime) return 'lost';
    if (phase === 'recover' || purpose === 'recover') return builder.escapeKind === 'short' ? 'lostShort' : 'lost';
    if (phase === 'meal' || purpose === 'meal') return 'meal';
    if (phase === 'break') return builder.breakKind === 'smoke' ? 'smoke' : 'rest';
    if (purpose === 'smoke') return 'smoke';
    if (purpose === 'sleep') return 'rest';
    if (builder.smokeCall && builder.smokeCall.until >= campaign.levelElapsed) return 'smoke';
    if (phase === 'idle' && builder.waitReason === 'path') return 'path';
    if ((phase === 'plan' || phase === 'idle') && builder.waitReason === 'front') return 'front';
    if (phase === 'plan') return 'plan';
    if (phase === 'mine' || phase === 'campFetch') return 'fetch';
    if (phase === 'place') return 'haul';
    if (phase === 'erect' || phase === 'passage' || phase === 'campBuild') return 'build';
    // In an air taxi the load does not slow him.
    if (phase === 'taxi') return '';
    if (builder.carry.length > 0 && load.overload > 1.05) return 'overload';
    return '';
  }

  function droneIntent(builder) {
    if (builder.phase === 'place') return 'haul';
    if (builder.phase === 'pick') return 'fetch';
    return '';
  }

  // Game seconds the current plan, pick or cube takes in full (a cube: all its mini-cubes, as its ring).
  function predictedSeconds(builder, kind) {
    const per = builder.actionT + builder.timer;
    if (kind === 'haul' && builder.trade !== 'engineer' && builder.carry[0]) return per * MB.pourTotal(builder.carry[0]);
    return per;
  }

  // Hysteresis: a new kind must hold BADGE_PENDING real seconds and the shown one must have been up
  // BADGE_HOLD seconds. Urgent kinds (overload, no path, lost) skip the wait, but whatever has just
  // appeared or gone stays BADGE_PENDING (an urgent icon BADGE_HOLD): otherwise a worker inching along
  // a scaffold route would strobe between «Ждёт проход», the kettlebell and nothing.
  function settleBadge(badge, want, dt) {
    badge.shownT += dt;
    if (want === badge.shown || want !== badge.pending) {
      badge.pending = want;
      badge.pendingT = 0;
    } else {
      badge.pendingT += dt;
    }
    const urgent = BADGE_URGENT[want] && badge.shownT >= (BADGE_URGENT[badge.shown] ? BADGE_HOLD : BADGE_PENDING);
    if (want !== badge.shown &&
        (urgent || (badge.pendingT >= BADGE_PENDING && badge.shownT >= BADGE_HOLD))) {
      badge.shown = want;
      badge.shownT = 0;
      badge.pendingT = 0;
      badge.pop = 0;
      badge.changes += 1;
    }
    return badge.shown;
  }

  // Far from the camera icons are dots: only urgent ones stay, kept at a readable size; close up
  // (worker view) they stop growing.
  function updateBadgeLod() {
    // The follow view keeps the orbit radius saved: there the eye is as far as the followed worker.
    const followed = cameraController.isWorkerView() && selectedBuilder ? stickViews.get(selectedBuilder) : null;
    const distance = Math.max(1, followed ? camera.position.distanceTo(followed.group.position) : cameraController.radius);
    const px = BADGE_SIZE * MicroBuildersStage.height() / (2 * distance * Math.tan(camera.fov * Math.PI / 360));
    badgeLodState.urgentOnly = px < BADGE_LOD_PX;
    badgeLodState.scale = px < BADGE_MIN_PX ? BADGE_MIN_PX / px : px > BADGE_MAX_PX ? BADGE_MAX_PX / px : 1;
    badgeLodState.px = px * badgeLodState.scale;
  }

  function updateBadge(viewState, builder, want, dt, load) {
    const badge = viewState.badge;
    // At ×20 only urgent icons, and the others go at once; while paused (dt 0) everything stays.
    if (timeScale === 20 && !BADGE_URGENT[want]) want = '';
    if (timeScale === 20 && badge.shown && !BADGE_URGENT[badge.shown]) {
      badge.shown = '';
      badge.shownT = BADGE_PENDING;
      badge.changes += 1;
    }
    // Hunger past hungerDebuffFrom (where it starts to slow him) is a status of its own, like a smoke
    // break: the meal icon when nothing else is shown (no pip on other icons).
    if (BADGE_PREDICTABLE[want] && predictedSeconds(builder, want) / Math.max(1, timeScale) < BADGE_QUICK) want = '';
    const hungry = builder.trade !== 'engineer' && timeScale !== 20 && MB.hungerFill(builder) >= MB.BALANCE.hungerDebuffFrom;
    const hungerOnly = !want && hungry;
    if (hungerOnly) want = 'meal';
    const kind = dt > 0 ? settleBadge(badge, want, dt) : badge.shown;
    const selected = builder === selectedBuilder;
    if (!kind || !levelRoot.visible || viewState.indoors || (badgeLodState.urgentOnly && !BADGE_URGENT[kind] && !selected)) {
      if (badge.group.visible) badge.group.visible = false;
      return;
    }
    const material = badgeAtlas.materials[kind][0];
    if (badge.icon.material !== material) badge.icon.material = material;
    if (kind === 'meal' && builder.phase !== 'meal') {
      // Hungry or on the way to eat: just the icon, no timer ring.
      badge.ring.visible = false;
      paintBadgeLabel(badge, '', false);
    } else if (kind === want) {
      // While a new state is pending the ring and the label hold still.
      measureBadge(badge, builder, kind, load, selected);
    }
    if (dt > 0 && badge.pop < 1) badge.pop = Math.min(1, badge.pop + dt / 0.15);
    const size = badge.size * badgeLodState.scale;
    const shown = size * (0.7 + 0.3 * badge.pop);
    badge.group.scale.set(shown, shown, shown);
    // The bottom of the icon stays just over the head whatever its size.
    const p = viewState.group.position;
    badge.group.position.set(p.x, p.y + badge.lift + (size - badge.size) / 2, p.z);
    if (badge.labelText) placeBadgeLabel(badge, kind, selected);
    badge.group.visible = true;
  }

  // Labels stay readable (BADGE_LABEL_PX tall on screen) however small the icon is; on small icons
  // only the urgent ones («×1,6», «Ждёт проход») and the selected worker's keep theirs.
  function placeBadgeLabel(badge, kind, selected) {
    const iconPx = badgeLodState.px * badge.size / BADGE_SIZE;
    const show = selected || !!BADGE_URGENT[kind] || iconPx >= BADGE_LABEL_MIN_PX;
    if (badge.label.visible !== show) badge.label.visible = show;
    if (!show) return;
    const height = Math.max(0.55, BADGE_LABEL_PX / iconPx);
    if (Math.abs(badge.label.scale.y - height) > 0.01) {
      badge.label.scale.set(height * 4, height, 1);
      badge.label.position.y = 0.52 + height / 2;
    }
  }

  // The ring (whole-cube progress for a grid ≥ 2 cube, «3/8») on every timed action; the selected
  // worker also gets whole seconds left on actions of at least BADGE_SECONDS_MIN real seconds.
  function measureBadge(badge, builder, kind, load, selected) {
    const scale = Math.max(1, timeScale);
    let ratio = -1;
    let duration = 0;
    let left = 0;
    let text = '';
    let warn = false;
    if (kind === 'haul' && builder.trade !== 'engineer' && builder.carry[0]) {
      const block = builder.carry[0];
      const total = MB.pourTotal(block);
      const per = builder.actionT + builder.timer;
      const part = per > 0 ? Math.min(1, builder.actionT / per) : 0;
      duration = per * total;
      ratio = (block.poured + part) / total;
      // Seconds left for the pieces of this cube in hand (a big cube takes several trips).
      let inHand = 0;
      while (inHand < builder.carry.length && builder.carry[inHand] === block) inHand += 1;
      left = (inHand - part) * per;
      if (total > 1) text = block.poured + '/' + total;
    } else if (kind === 'overload') {
      text = '×' + formatFactor(load.overload);
      warn = true;
    } else if (kind === 'path') {
      text = 'Ждёт проход';
      warn = true;
    } else if (kind !== 'front' && kind !== 'lost' && kind !== 'lostShort' && BADGE_TIMED_PHASES[builder.phase] && builder.timer > 0) {
      duration = builder.actionT + builder.timer;
      ratio = builder.actionT / duration;
      left = builder.timer;
    }
    // The ring shows on every timed action, however quick; the seconds only on long ones.
    const ring = ratio >= 0 && duration > 0;
    const long = ring && duration / scale >= BADGE_SECONDS_MIN - 0.01;
    if (selected && long && left / scale >= 1) text = (text ? text + ' · ' : '') + Math.ceil(left / scale) + ' с';
    const segments = ring ? Math.round(Math.min(1, Math.max(0, ratio)) * BADGE_RING_SEGMENTS) : 0;
    if (segments !== badge.segments) {
      badge.segments = segments;
      badge.ring.geometry.setDrawRange(0, segments * 6);
    }
    badge.ring.visible = segments > 0;
    paintBadgeLabel(badge, text, warn);
  }

  // A small canvas made on first use, repainted only when its text changes.
  function paintBadgeLabel(badge, text, warn) {
    if (badge.labelText === text) return;
    badge.labelText = text;
    if (!text) {
      if (badge.label) badge.label.visible = false;
      return;
    }
    if (!badge.label) {
      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 48;
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: map, transparent: true, depthTest: false, depthWrite: false }));
      label.scale.set(2.2, 0.55, 1); // placeBadgeLabel sizes it to the screen
      label.position.set(0, 0.8, 0);
      label.renderOrder = 42;
      label.userData.canvas = canvas;
      badge.group.add(label);
      badge.label = label;
    }
    const canvas = badge.label.userData.canvas;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, 192, 48);
    context.font = '800 27px Manrope, sans-serif';
    const width = Math.min(188, context.measureText(text).width + 22);
    context.fillStyle = warn ? 'rgba(179,38,30,0.94)' : 'rgba(32,28,24,0.84)';
    context.beginPath();
    context.roundRect(96 - width / 2, 4, width, 40, 20);
    context.fill();
    context.fillStyle = '#fff8ee';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 96, 25);
    badge.label.material.map.needsUpdate = true;
    badge.label.visible = true;
  }

  // The cubes in hands: as many pre-made slots as the load fills by weight (never more than the
  // pieces carried), one size per material grid, so the stack never jumps.
  function paintCarryStack(viewState, builder, load, inHands) {
    const slots = viewState.group.userData.carry.children;
    // The back holds what is left once the cube in the hands (all its mini-cubes) is taken off.
    const back = inHands ? builder.carry.filter(function (block) { return block !== inHands; }) : builder.carry;
    const length = back.length;
    const fill = builder.carry.length > 0 ? load.fill * length / builder.carry.length : 0;
    const count = length === 0 ? 0 : Math.min(length, CARRY_SLOTS, Math.max(1, Math.ceil(fill * CARRY_SLOTS - 0.001)));
    const size = count > 0 && MB.MATERIAL[back[0].materialId].grid >= 2 ? 0.18 : 0.26;
    for (let i = 0; i < CARRY_SLOTS; i++) {
      const cube = slots[i];
      cube.visible = i < count;
      if (i >= count) continue;
      const materialId = back[Math.min(length - 1, Math.floor(i * length / count))].materialId;
      cube.material = blockSurface(materialId, false);
      cube.scale.setScalar(size);
      const lone = i === count - 1 && count % 2 === 1;
      cube.position.set(lone ? 0 : ((i % 2) - 0.5) * (size + 0.03), Math.floor(i / 2) * (size + 0.03), 0);
    }
    if (count > 0) viewState.carryColor = MB.MATERIAL[back[0].materialId].color;
  }

  function clearWorkerViews() {
    for (let i = badgeRoot.children.length - 1; i >= 0; i--) {
      const group = badgeRoot.children[i];
      group.traverse(function (object) {
        // The ring geometry and the label are the worker's own; icon materials are shared.
        if (object.isMesh) object.geometry.dispose();
        if (object.userData.canvas) {
          object.material.map.dispose();
          object.material.dispose();
        }
      });
      badgeRoot.remove(group);
    }
    for (let i = 0; i < fxFloats.length; i++) retireFx(fxFloats[i]);
    for (let i = 0; i < fxChips.length; i++) retireFx(fxChips[i]);
    fxAggregate.coins = 0;
    fxAggregate.t = 0;
    paintWorkerCard();
  }

  // ---------- world-anchored feedback (#fx-layer) ----------

  function fxShown() {
    return currentScreen === 'build' && levelRoot.visible && !document.body.classList.contains('interface-hidden');
  }

  // Stage px of a world point into fxPoint; false when it is behind the camera or off screen.
  function fxProject(x, y, z) {
    fxPoint.set(x, y, z).project(camera);
    if (fxPoint.z < -1 || fxPoint.z > 1 || Math.abs(fxPoint.x) > 1.05 || Math.abs(fxPoint.y) > 1.05) return false;
    fxPoint.x = (fxPoint.x + 1) / 2 * MicroBuildersStage.width();
    fxPoint.y = (1 - fxPoint.y) / 2 * MicroBuildersStage.height();
    return true;
  }

  function makeFx(className) {
    const el = document.createElement('div');
    el.className = className;
    el.hidden = true;
    const icon = document.createElement('img');
    icon.alt = '';
    icon.hidden = true;
    const text = document.createElement('b');
    const caption = document.createElement('small');
    el.append(icon, text, caption);
    document.getElementById('fx-layer').appendChild(el);
    return {
      el: el,
      icon: icon,
      iconSrc: '',
      text: text.appendChild(document.createTextNode('')),
      caption: caption.appendChild(document.createTextNode('')),
      captionEl: caption,
      base: className,
      tone: '',
      life: 0,
      t: 0,
      x: 0,
      y: 0,
      z: 0,
      rise: 0,
      big: false,
      builder: null,
      width: 0,
      height: 0,
    };
  }

  function retireFx(fx) {
    fx.life = 0;
    fx.builder = null;
    if (!fx.el.hidden) fx.el.hidden = true;
  }

  function dressFx(fx, text, tone, caption) {
    if (fx.tone !== tone) {
      fx.tone = tone;
      fx.el.className = fx.base + ' fx-' + tone;
    }
    const src = FX_ICONS[tone] || '';
    if (fx.iconSrc !== src) {
      fx.iconSrc = src;
      if (src) fx.icon.src = src;
      fx.icon.hidden = !src;
    }
    fx.text.data = text;
    fx.caption.data = caption || '';
    fx.captionEl.hidden = !caption;
    fx.width = 0; // measured again once it is on screen
  }

  // A rising number at a world point. At most FX_FLOAT_MAX at once (the oldest is recycled); none
  // at ×20, off screen, behind the camera or with the interface hidden.
  function floatAt(x, y, z, text, tone, caption, delay) {
    if (timeScale === 20 || !fxShown() || !fxProject(x, y, z)) return;
    let slot = null;
    let oldest = null;
    for (let i = 0; i < fxFloats.length; i++) {
      const fx = fxFloats[i];
      if (fx.life <= 0) {
        if (!slot) slot = fx;
      } else if (!oldest || fx.t / fx.life > oldest.t / oldest.life) {
        oldest = fx;
      }
    }
    if (!slot && fxFloats.length < FX_FLOAT_MAX) {
      slot = makeFx('fx-float');
      fxFloats.push(slot);
    }
    if (!slot) slot = oldest;
    const coin = tone === 'coin';
    slot.serial = (slot.serial || 0) + 1;
    slot.icon.style.visibility = '';
    // Coins: the «+N» pops, then its coin icon itself leaves for the counter and the number stays a
    // little longer.
    if (coin) {
      const serial = slot.serial;
      const target = slot;
      setTimeout(function () { launchFloatCoin(target, serial); }, ((delay || 0) + 0.55) * 1000);
    }
    slot.t = -(delay || 0);
    slot.life = coin ? 1.9 : 2;
    slot.rise = coin ? 46 : 60;
    slot.big = !coin;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    dressFx(slot, text, tone, caption);
  }

  // From the floater's own coin icon: hide it there and send coins from exactly that spot.
  function launchFloatCoin(slot, serial) {
    if (slot.serial !== serial || slot.life <= 0 || slot.icon.hidden || !fxShown()) return;
    const rect = slot.icon.getBoundingClientRect();
    if (rect.width < 1) return;
    const scale = MicroBuildersStage.scale();
    const base = document.body.getBoundingClientRect();
    slot.icon.style.visibility = 'hidden';
    flyCoins((rect.left + rect.width / 2 - base.left) / scale, (rect.top + rect.height / 2 - base.top) / scale, 0, rect.width / scale);
  }

  // Three coin icons fly from a stage point into the coin pill, the first at the size it left with,
  // two smaller ones trailing; the pill pops as each lands. Pooled <img>s in #fx-layer, at most 18.
  function flyCoins(x, y, delay, size) {
    const layer = document.getElementById('fx-layer');
    const pill = document.querySelector('#coins .currency-icon') || document.getElementById('coins');
    if (!layer || !pill || !layer.animate) return;
    const pool = flyCoins.pool || (flyCoins.pool = []);
    const scale = MicroBuildersStage.scale();
    const base = document.body.getBoundingClientRect();
    const target = pill.getBoundingClientRect();
    const tx = (target.left + target.width / 2 - base.left) / scale - 9;
    const ty = (target.top + target.height / 2 - base.top) / scale - 9;
    for (let i = 0; i < 3; i++) {
      let coin = null;
      for (let j = 0; j < pool.length; j++) if (!pool[j].busy) { coin = pool[j]; break; }
      if (!coin) {
        if (pool.length >= 18) return;
        const el = document.createElement('img');
        el.className = 'fly-coin';
        el.alt = '';
        el.src = 'icons/icon-coins.jpg?v=2';
        layer.appendChild(el);
        coin = { el: el, busy: false };
        pool.push(coin);
      }
      coin.busy = true;
      const sx = x - 9;
      const sy = y - 9;
      const start = (size || 18) / 18 * (i === 0 ? 1 : 0.7);
      // A soft arc: up and a little sideways first, then into the counter.
      const mx = sx + (tx - sx) * 0.35 + (i - 1) * 14;
      const my = Math.min(sy, ty) - 36 - i * 6;
      const anim = coin.el.animate([
        { opacity: i === 0 ? 1 : 0, transform: 'translate(' + sx + 'px, ' + sy + 'px) scale(' + start.toFixed(2) + ')' },
        { opacity: 1, transform: 'translate(' + mx.toFixed(1) + 'px, ' + my.toFixed(1) + 'px) scale(' + (start * 0.95).toFixed(2) + ')', offset: 0.4 },
        { opacity: 1, transform: 'translate(' + tx + 'px, ' + ty + 'px) scale(0.85)' },
      ], { duration: 820, delay: delay + i * 90, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'both' });
      anim.onfinish = function () {
        coin.busy = false;
        coin.el.style.opacity = '0';
        anim.cancel();
        pulseCoins();
      };
    }
  }

  // A one-line chip over a worker for 1.6 s (plan taken, why the trip left, abandon). Only for
  // workers on screen, at most FX_CHIP_MAX at once; the selected worker always gets his.
  function chipFor(builder, text, tone) {
    if (fxChipLog) fxChipLog.push(text);
    if (timeScale === 20 || !fxShown()) return;
    const viewState = stickViews.get(builder);
    if (!viewState) return;
    const selected = builder === selectedBuilder;
    const p = viewState.group.position;
    if (!fxProject(p.x, p.y + 2.3, p.z) && !selected) return;
    let slot = null;
    let free = null;
    let oldest = null;
    let active = 0;
    for (let i = 0; i < fxChips.length; i++) {
      const chip = fxChips[i];
      if (chip.life <= 0) {
        if (!free) free = chip;
        continue;
      }
      active += 1;
      if (chip.builder === builder) slot = chip;
      if (chip.builder !== selectedBuilder && (!oldest || chip.t > oldest.t)) oldest = chip;
    }
    if (!slot) {
      if (active >= FX_CHIP_MAX) {
        if (!selected || !oldest) return;
        slot = oldest;
      } else if (free) {
        slot = free;
      } else {
        slot = makeFx('fx-chip');
        fxChips.push(slot);
      }
    }
    slot.builder = builder;
    slot.t = 0;
    slot.life = 1.6;
    dressFx(slot, text, tone, '');
  }

  // After the camera moved: rings face it, floaters and chips follow their anchors on screen.
  function updateWorldFx(realDt) {
    fxTime += realDt;
    stickViews.forEach(function (viewState) {
      const badge = viewState.badge;
      if (badge.group.visible) badge.group.quaternion.copy(camera.quaternion);
    });
    if (fxAggregate.coins > 0) {
      fxAggregate.t += realDt;
      if (fxAggregate.t >= FX_AGGREGATE_SECONDS || timeScale !== 5) flushFxAggregate();
    }
    if (fxFloats.length === 0 && fxChips.length === 0) return;
    const shown = fxShown();
    const layer = document.getElementById('fx-layer');
    if (layer.hidden === shown) layer.hidden = !shown;
    camera.updateMatrixWorld();
    fxTop = cameraController.getSafeArea().top + 4;
    // Oldest first: a newer number that would cover an older one is placed under it.
    fxOrder.length = 0;
    for (let i = 0; i < fxFloats.length; i++) {
      const fx = fxFloats[i];
      if (fx.life <= 0) continue;
      fx.t += realDt;
      if (fx.t >= fx.life || !shown) retireFx(fx);
      else if (fx.t < 0) {
        if (!fx.el.hidden) fx.el.hidden = true;
      } else fxOrder.push(fx);
    }
    fxOrder.sort(function (a, b) { return b.t - a.t; });
    let placed = 0;
    for (let i = 0; i < fxOrder.length; i++) {
      if (placeFx(fxOrder[i], fxOrder[i].x, fxOrder[i].y, fxOrder[i].z, placed, false)) placed += 1;
    }
    for (let i = 0; i < fxChips.length; i++) {
      const chip = fxChips[i];
      if (chip.life <= 0) continue;
      chip.t += realDt;
      const viewState = chip.builder && stickViews.get(chip.builder);
      if (chip.t >= chip.life || !shown || !viewState) retireFx(chip);
      else if (placeFx(chip, viewState.group.position.x, viewState.group.position.y + 2.3, viewState.group.position.z, placed, true)) placed += 1;
    }
  }

  // Positions one floater or chip (stage px, kept inside the screen). One that overlaps a box placed
  // before it in this frame moves above it (chips, `up`) or below it (numbers).
  function placeFx(fx, x, y, z, stackIndex, up) {
    if (!fxProject(x, y, z)) {
      if (!fx.el.hidden) fx.el.hidden = true;
      return false;
    }
    if (fx.el.hidden) fx.el.hidden = false;
    if (!fx.width) {
      fx.width = fx.el.offsetWidth || 1;
      fx.height = fx.el.offsetHeight;
    }
    const u = fx.t / fx.life;
    const rise = fx.rise * (1 - (1 - u) * (1 - u) * (1 - u));
    const half = fx.width / 2;
    let sx = Math.min(Math.max(fxPoint.x, half + 4), MicroBuildersStage.width() - half - 4);
    // Never under the top HUD bars: a chip of a worker up there waits at their edge.
    let sy = Math.max(fxPoint.y - rise, fxTop + fx.height);
    for (let i = 0; i < stackIndex; i++) {
      const other = fxStack[i];
      if (Math.abs(other.x - sx) < other.half + half + 4 && sy > other.y - other.height - 2 && sy - fx.height < other.y + 2) {
        // Chips stack upward, but not under the top HUD: there they go below instead.
        const above = other.y - other.height - 3;
        sy = up && above - fx.height >= fxTop ? above : other.y + fx.height + 3;
      }
    }
    const slot = fxStack[stackIndex] || (fxStack[stackIndex] = {});
    slot.x = sx;
    slot.y = sy;
    slot.half = half;
    slot.height = fx.height;
    // Big floaters (luck, finds) start a little larger and settle.
    const pop = fx.big ? 1 + 0.35 * Math.pow(Math.max(0, 1 - u * 5), 2) : 1;
    fx.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) +
      'px,0) translate(-50%,-100%) scale(' + pop.toFixed(3) + ')';
    fx.el.style.opacity = (u < 0.08 ? u / 0.08 : u > 0.72 ? (1 - u) / 0.28 : 1).toFixed(2);
    return true;
  }

  // At ×5 plain coin floaters merge for FX_AGGREGATE_SECONDS into one at the latest spot.
  function floatWorldCoins(x, y, z, coins) {
    if (coins <= 0) return;
    if (timeScale !== 5) {
      floatAt(x, y, z, '+' + formatCompact(coins), 'coin');
      return;
    }
    fxAggregate.coins += coins;
    fxAggregate.x = x;
    fxAggregate.y = y;
    fxAggregate.z = z;
  }

  function flushFxAggregate() {
    const coins = fxAggregate.coins;
    fxAggregate.coins = 0;
    fxAggregate.t = 0;
    floatAt(fxAggregate.x, fxAggregate.y, fxAggregate.z, '+' + formatCompact(coins), 'coin');
  }

  function floatLucky(x, y, z, multiplier, coins) {
    floatAt(x, y, z, 'Удача ×' + multiplier + '! +' + formatCompact(coins), 'lucky');
    burst(x, y - 0.4, z, 0xffd34a, 16);
  }

  // A find follows the trip's coins by a moment, so the two numbers do not cover each other.
  function floatCapital(x, y, z, value) {
    floatAt(x, y, z, 'Находка! +' + value + ' капитала', 'capital', 'в казну компании', 0.45);
    burst(x, y - 0.5, z, 0xf2c75c, 6);
  }

  // The view's events from the logic (docs/tech/workers.md «Данные для вида»).
  function onWorkerEvent(event) {
    const builder = world.builders[event.builder];
    const viewState = builder && stickViews.get(builder);
    if (!viewState) return;
    if (event.type === 'plan') {
      // A plan is one trip, and the trip usually leaves in the same step: then the trip's chip
      // says both. Alone only when he first goes to eat or smoke.
      if (timeScale === 20 || !fxShown()) return;
      viewState.planEvent = event;
      if (!tripFollows(event)) {
        const kind = tripChipKind(event, null, builder);
        chipFor(builder, tripChipText(kind, event, null), TRIP_CHIP_TONES[kind] || 'plan');
        viewState.planEvent = null;
      }
    } else if (event.type === 'trip') {
      const plan = viewState.planEvent;
      viewState.planEvent = null;
      const kind = tripChipKind(plan, event, builder);
      chipFor(builder, tripChipText(kind, plan, event), TRIP_CHIP_TONES[kind] || 'plan');
    } else if (event.type === 'tripDone') {
      floatTrip(viewState, event);
    } else if (event.type === 'abandon') {
      // The cubes fall out of his hands: a burst, «!» for 2 s and the reason.
      viewState.badge.alertUntil = fxTime + 2;
      burst(event.x + 0.5, event.y + 0.8, event.z + 0.5, viewState.carryColor || 0xd9534f, 10);
      chipFor(builder, event.kind === 'stall' ? 'Стройка встала — назад к столу' : 'Нет пути — назад к столу', 'bad');
    }
  }

  function tripFollows(plan) {
    const events = world.events;
    for (let i = events.indexOf(plan) + 1; i < events.length; i++) {
      if (events[i].type === 'trip' && events[i].builder === plan.builder) return true;
    }
    return false;
  }

  // What sized this trip (plan = one trip, docs/gdd/02 «План и ноша»): a heavy cube carried in
  // parts, one mini-cube over the carry, cubes waiting for support, or the plan's own reason
  // ('count' «План работ», 'weight' «Ноша», 'front' no free cubes nearby).
  function tripChipKind(plan, trip, builder) {
    if (trip) {
      if (trip.parts > 0) return 'parts';
      if (trip.limit === 'heavy' || trip.limit === 'order') return trip.limit;
    }
    const reason = (plan ? plan.reason : trip.planReason) || 'count';
    if (reason !== 'heavy') return reason;
    // A plan alone: one cube heavier than the carry goes in parts unless a single piece is too.
    const block = builder.plan[0];
    return block && MB.carryWeight(campaign, block.materialId) > stickViews.get(builder).load.capacity ? 'heavy' : 'split';
  }

  function tripChipText(kind, plan, trip) {
    const weight = trip ? fxKg(trip.kg) + '/' + fxKg(trip.capacity) + ' кг' : '';
    if (kind === 'parts') return 'Несёт частями: ' + trip.part + ' из ' + trip.parts + ' · ' + weight;
    if (kind === 'heavy') return 'Один тяжёлый кубик · перегруз' + (trip ? ' ×' + formatFactor(trip.overload) : '');
    if (kind === 'order') return 'Ждут опоры: часть плана позже';
    if (kind === 'split') return 'Тяжёлый куб · несёт частями';
    // The plan counts mini-cubes; while each is a whole cube (grid 1) it reads as cubes.
    const cubes = plan ? plan.cubes : trip.cubes;
    const minis = plan ? (plan.minis || cubes) : (trip.minis || cubes);
    const count = minis === cubes
      ? cubes + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов')
      : minis + ' ' + UI.plural(minis, 'мини-куб', 'мини-куба', 'мини-кубов');
    if (kind === 'front') return 'План: ' + minis + ' из ' + (plan ? plan.limit : MB.planCubeLimit(campaign)) + ' · мало свободных кубов';
    if (kind === 'weight') {
      // A big next cube can stop a light load: «полна» would be wrong then.
      if (trip && trip.kg < trip.capacity * 0.8) return 'План: ' + count + ' · следующий не влез · ' + weight;
      return 'План: ' + count + ' · ноша полна';
    }
    return 'План: ' + count + (trip ? ' · ' + weight : '');
  }

  // Per trip: «+1 240» at the last cube (luck: «Удача ×3! +3 720» with a gold burst), and the
  // trip's capital coins as one find.
  function floatTrip(viewState, event) {
    viewState.lastTripCoins = event.coins;
    const finds = viewState.capitalCoins;
    viewState.capitalCoins = 0;
    const x = event.x + 0.5;
    const y = event.y + 1.1;
    const z = event.z + 0.5;
    // The coins already floated cube by cube (onPlace); the trip only adds its capital find.
    if (finds > 0) floatCapital(x, y, z, finds);
  }

  function noteCapitalCoin(index) {
    const builder = world.builders[index];
    const viewState = builder && stickViews.get(builder);
    if (viewState) viewState.capitalCoins += 1;
  }

  // Office capital finds (Meta.onBlocksPlaced → finds [{block, value}]).
  function floatFinds(finds) {
    if (!finds) return;
    for (let i = 0; i < finds.length; i++) {
      const block = finds[i].block;
      floatCapital(block.x + 0.5, block.y + 1.1, block.z + 0.5, finds[i].value);
    }
  }

  function floatDronePlace(event) {
    const block = event.block;
    const x = block.x + 0.5;
    const y = block.y + 1.1;
    const z = block.z + 0.5;
    if (event.lucky && event.gained > 0) floatLucky(x, y, z, event.luckyMultiplier, event.gained);
    else floatWorldCoins(x, y, z, event.gained);
    if (event.capitalCoin) floatCapital(x, y, z, 1);
  }

  function floatVehicleBatch(event, x, y, z) {
    if (event.luckyCount > 0 && event.gained > 0) floatLucky(x, y + 0.8, z, event.luckyMultiplier, event.gained);
    else floatWorldCoins(x, y + 0.8, z, event.gained);
    if (event.capitalCoins > 0) floatCapital(x, y + 0.8, z, event.capitalCoins);
  }

  // Jackpot coins float at the cube. Golden finds float as capital in onForemanEvent;
  // the centred popup names either event and shows its payout.
  function floatForeman(event) {
    if (event.card !== 'golden' && !event.jackpot) return;
    const block = event.block;
    if (event.gained > 0) floatAt(block.x + 0.5, block.y + 1.2, block.z + 0.5, '+' + formatCompact(event.gained), 'gold');
    burst(block.x + 0.5, block.y + 0.8, block.z + 0.5, 0xffd34a, 18);
  }

  function fxKg(value) {
    return String(value >= 20 ? Math.round(value) : Math.round(value * 10) / 10).replace('.', ',');
  }

  function formatFactor(value) {
    return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
  }

  // ---------- worker card (§6) ----------

  function workerCardNodes() {
    if (workerCard.nodes) return workerCard.nodes;
    const nodes = { card: document.getElementById('worker-card'), planWidth: '', loadWidth: '', bottom: '', tight: false, legendHeight: 0 };
    ['title', 'status', 'plan', 'load', 'xp', 'limit', 'info'].forEach(function (key) {
      const el = document.getElementById('worker-card-' + key);
      el.textContent = '';
      nodes[key] = el.appendChild(document.createTextNode(''));
    });
    nodes.needs = document.getElementById('worker-card-needs');
    nodes.limitRow = document.getElementById('worker-card-limit');
    nodes.legend = document.getElementById('worker-card-legend');
    nodes.planBar = document.getElementById('worker-card-plan-bar');
    nodes.planMeter = document.getElementById('worker-card-plan-meter');
    nodes.loadBar = document.getElementById('worker-card-load-bar');
    nodes.loadMeter = document.getElementById('worker-card-load-meter');
    nodes.xpBar = document.getElementById('worker-card-xp-bar');
    nodes.xpMeter = document.getElementById('worker-card-xp-meter');
    document.getElementById('worker-card-close').addEventListener('click', function () { focusWorker(null); });

    workerCard.nodes = nodes;
    return nodes;
  }

  function setNodeText(node, text) {
    if (node.data !== text) node.data = text;
  }

  function setBarWidth(nodes, key, share) {
    const width = Math.round(Math.min(1, Math.max(0, share)) * 100) + '%';
    if (nodes[key + 'Width'] === width) return;
    nodes[key + 'Width'] = width;
    nodes[key + 'Bar'].style.width = width;
  }

  // The selected worker's card: built once, its text nodes refreshed on the HUD tick (4 Hz).
  function paintWorkerCard() {
    const nodes = workerCardNodes();
    const builder = selectedBuilder;
    const viewState = builder ? stickViews.get(builder) : null;
    const show = !!viewState && currentScreen === 'build' && !!campaign && campaign.status !== 'title';
    if (nodes.card.hidden === show) nodes.card.hidden = !show;
    if (!show) return;
    const load = viewState.load;
    const rank = builder.expertiseRank;
    const title = rank ? (rank < 1 ? 'Младший' : rank > 1 ? 'Старший' : 'Средний') + ' рабочий' : 'Рабочий';
    // «Учебный центр»: his rank in the title, experience to the next one on its own bar.
    const grade = MB.workerRankInfo(builder, campaign);
    if (builder.trade === 'engineer') grade.on = false;
    setNodeText(nodes.title, title + ' ' + workerNumber(builder) + (grade.on ? ' · ' + grade.rank + ' разряд' : '') +
      (rank || grade.rank > 1 ? ' · скорость ' + Math.round(builder.timeEfficiency * 100) + '%' : ''));
    if (nodes.xpMeter.hidden === grade.on) nodes.xpMeter.hidden = !grade.on;
    if (grade.on) {
      setNodeText(nodes.xp, 'Опыт: ' + Math.floor(grade.xp) + (grade.next !== null ? ' / ' + grade.next + ' до ' + (grade.rank + 1) + ' разряда'
        : grade.rank < MB.TRAINING_RANKS.length ? ' · потолок ' + grade.cap + ' разряда (учебный центр)' : ' · высший разряд'));
      setBarWidth(nodes, 'xp', grade.next !== null ? (grade.xp - grade.from) / Math.max(1, grade.next - grade.from) : 1);
    }
    setNodeText(nodes.status, workerStatusText(builder, load));
    // Each layer comes with what it explains: the plan once «План работ» makes it more than one cube,
    // the load once weight can limit a trip (a plan of several cubes, a cube heavier than the carry).
    const limit = MB.planCubeLimit(campaign);
    const planOn = limit > 1;
    if (nodes.planMeter.hidden === planOn) nodes.planMeter.hidden = !planOn;
    if (planOn) {
      const left = MB.planMinis(builder);
      setNodeText(nodes.plan, left > 0 ? 'План: ' + left + ' из ' + limit : 'План: нет');
      setBarWidth(nodes, 'plan', left / limit);
    }
    const over = builder.carry.length > 0 && load.overload > 1.05;
    const loadOn = planOn || over || heavyCubeHere(load.capacity);
    if (nodes.loadMeter.hidden === loadOn) nodes.loadMeter.hidden = !loadOn;
    if (loadOn) {
      setNodeText(nodes.load, 'Ноша: ' + fxKg(load.kg) + ' / ' + fxKg(load.capacity) + ' кг' +
        (over ? ' · Перегруз ×' + formatFactor(load.overload) : ''));
      setBarWidth(nodes, 'load', load.fill);
      if (nodes.loadMeter.classList.contains('over') !== over) nodes.loadMeter.classList.toggle('over', over);
    }
    const limitText = workerLimitText(builder);
    setNodeText(nodes.limit, limitText);
    if (nodes.limitRow.hidden === !!limitText) nodes.limitRow.hidden = !limitText;
    const needs = workerNeedsText(builder);
    if (nodes.needsHtml !== needs) {
      nodes.needsHtml = needs;
      nodes.needs.innerHTML = needs;
    }
    setNodeText(nodes.info, workerDetailsText(builder, viewState));
    const area = cameraController.getSafeArea();
    const bottom = Math.round(area.bottom + 8) + 'px';
    if (nodes.bottom !== bottom) {
      nodes.bottom = bottom;
      nodes.card.style.bottom = bottom;
    }
    // A low band (landscape phones) has no room for the legend: it goes first.
    if (!nodes.tight) nodes.legendHeight = nodes.legend.offsetHeight + 5;
    const room = MicroBuildersStage.height() - area.top - area.bottom - 16;
    const tight = nodes.card.offsetHeight + (nodes.tight ? nodes.legendHeight : 0) > room;
    if (tight !== nodes.tight) {
      nodes.tight = tight;
      nodes.card.classList.toggle('tight', tight);
    }
  }

  // A cube of this site heavier than the carry: it goes in parts or slows the worker down.
  function heavyCubeHere(capacity) {
    const mines = world.level.mines;
    for (let i = 0; i < mines.length; i++) {
      const id = mines[i].materialId;
      if (MB.carryWeight(campaign, id) * Math.pow(MB.MATERIAL[id].grid || 1, 3) > capacity) return true;
    }
    return false;
  }

  // «i» of the card: the trip's pay (once there is one), the smoking habit and its effect, the dish.
  function workerDetailsText(builder, viewState) {
    const lines = [];
    const current = builder.tripPours > 0;
    const coins = current ? builder.tripCoins : viewState.lastTripCoins;
    if (coins > 0) lines.push('За ходку: +' + formatCompact(coins) + (current && builder.tripLucky > 0 ? ' · удача ×' + builder.tripLuckyMultiplier : ''));
    if (MB.needOpen(campaign, 'smoke')) {
      const habit = Math.round(builder.habit || 0);
      lines.push('Привычка к перекурам: ' + habit + ' из ' + MB.SMOKING.habitCap + (habit > 0
        ? ' · чаще на ' + Math.round(MB.SMOKING.habitInterval * habit * 100) + '%, дольше на ' + Math.round(MB.SMOKING.habitDuration * habit * 100) + '%' : ''));
    }
    if (builder.dish && MB.DISH[builder.dish]) lines.push('Блюдо: ' + MB.DISH[builder.dish].name + ' · ' + MB.dishText(builder.dish, builder.dishPower));
    return lines.join('\n');
  }

  // 40 с, 8 мин, 1 ч 5 мин: a wait in words.
  function waitWords(seconds) {
    const s = Math.ceil(seconds);
    if (s < 60) return s + ' с';
    const minutes = Math.ceil(s / 60);
    return minutes < 60 ? minutes + ' мин' : Math.floor(minutes / 60) + ' ч ' + (minutes % 60) + ' мин';
  }

  // What sized his current (or last) trip; a heavy cube says which part he carries.
  function workerLimitText(builder) {
    if (!builder.tripLimit) return '';
    // While the plan is one cube every trip is limited by it: the line would say nothing.
    if (builder.tripLimit === 'plan' && MB.planCubeLimit(campaign) <= 1) return '';
    const split = builder.haulSplit;
    if (split) return 'Несёт куб частями: ' + split.trip + ' из ' + split.trips;
    return MicroBuildersWorkerLog.tripLimitText(builder.tripLimit);
  }

  // Workers are numbered among builders only (drones share the builders array).
  function workerNumber(builder) {
    let number = 0;
    for (let i = 0; i < world.builders.length; i++) {
      if (world.builders[i].trade !== 'engineer') number += 1;
      if (world.builders[i] === builder) break;
    }
    return number;
  }

  function uniqueCubes(list) {
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].built || list.indexOf(list[i]) !== i) continue;
      count += 1;
    }
    return count;
  }

  function workerStatusText(builder, load) {
    const phase = builder.phase;
    const purpose = phase === 'walk' ? builder.walkPurpose : '';
    if (builder.kitchen) return 'На кухне столовой';
    if (phase === 'recover' || purpose === 'recover') return 'Нет пути — возвращается к столу';
    if (phase === 'meal') return builder.mealPlace === 'canteen' ? (builder.grandDue ? 'Гранд-обед' : 'Обедает в столовой') : 'Обед';
    if (purpose === 'meal') return builder.mealPlace === 'canteen' ? 'Идёт в столовую' : 'Идёт обедать';
    if (phase === 'campFetch') return 'Берёт материал для городка';
    if (phase === 'campBuild' && builder.camp) return 'Строит: ' + CAMP_NAMES[builder.camp.id].toLowerCase() + ' · ' + builder.camp.built + '/' + builder.camp.total;
    if (purpose === 'campFetch' || (builder.camp && purpose === 'route' && !(builder.campCarry > 0))) return 'Идёт за материалом для городка';
    if (builder.camp && purpose === 'route') return 'Несёт материал на стройку городка';
    if (builder.camp && phase === 'idle' && builder.waitReason === 'front') return 'Ждёт, пока поставят куб под его кубом';
    if (phase === 'break' && builder.breakKind === 'sleep') return (builder.sleepPlace === 'dorm' ? 'Спит в бытовке · ' : 'Спит · ') + MB.formatClock(Math.ceil(builder.timer));
    if (phase === 'break') return builder.breakKind === 'rest' ? 'Отдых' : builder.smokePlace === 'lounge' ? 'Перекур в зоне отдыха' : 'Перекур';
    if (purpose === 'sleep') return builder.sleepPlace === 'dorm' ? 'Идёт в бытовки' : 'Идёт спать';
    if (purpose === 'smoke') {
      const where = builder.smokePlace === 'lounge' ? ' в зону отдыха' : '';
      return builder.carry.length > 0 ? 'Идёт на перекур' + where + ' с кубами' : 'Идёт на перекур' + where;
    }
    if (phase === 'idle' && builder.waitReason === 'path') return 'Ждёт проход';
    if ((phase === 'plan' || phase === 'idle') && builder.waitReason === 'front') return 'Ждёт: нет свободных кубов';
    if (phase === 'plan') return 'Получает план';
    if (phase === 'mine' && builder.mineQueue[0]) return 'Набирает: ' + MB.MATERIAL[builder.mineQueue[0].materialId].name;
    if (phase === 'place' && builder.carry[0]) {
      const total = MB.pourTotal(builder.carry[0]);
      return total > 1 ? 'Кладёт куб ' + builder.carry[0].poured + '/' + total : 'Кладёт куб';
    }
    if (phase === 'erect') return 'Ставит леса';
    if (phase === 'passage') return 'Пробивает проход';
    if (phase === 'taxi') return builder.taxiRiding ? 'Летит на аэротакси' : 'Садится в аэротакси';
    if (purpose === 'taxi') return 'Идёт с грузом к аэротакси';
    if (builder.carry.length > 0) {
      const cubes = uniqueCubes(builder.carry);
      return 'Несёт ' + cubes + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов') + (load.overload > 1.05 ? ' · идёт медленнее' : '');
    }
    if (purpose === 'mine') return 'Идёт к карьеру';
    if (purpose === 'out') return 'Возвращается к столу';
    return MicroBuildersWorkerLog.statusOf(builder);
  }

  // Compact scales in words: «обед через 8 мин», «перекур через 2 мин», «сон через 39 мин» (the time
  // to the break at the rate now; sleep counts the night ahead); the tick on the bar marks where the
  // work penalty begins, the penalty itself follows the words.
  function workerNeedsText(builder) {
    const purpose = builder.phase === 'walk' ? builder.walkPurpose : '';
    const clock = function (need) {
      const seconds = MB.needSecondsLeft(builder, world, need);
      if (!(seconds < Infinity)) return 'не скоро';
      return seconds > 0 ? 'через ' + waitWords(seconds) : 'сейчас';
    };
    const hunger = MB.hungerFill(builder);
    const fatigue = MB.fatigueFill(builder);
    const smoke = Math.min(1, (builder.smokeNeed || 0) / Math.max(1, builder.smokeThreshold || 1));
    const eating = builder.phase === 'meal' || purpose === 'meal';
    const sleeping = (builder.phase === 'break' && builder.breakKind === 'sleep') || purpose === 'sleep';
    const smoking = (builder.phase === 'break' && builder.breakKind === 'smoke') || purpose === 'smoke';
    const called = builder.smokeCall && builder.smokeCall.until >= campaign.levelElapsed;
    // Only the needs this level has (tuning.intro: smoking from level 3, hunger from 5, sleep from 7).
    const rows = [
      MB.needOpen(campaign, 'hunger') &&
        ['personnel', 'Голод', hunger, eating ? 'обедает' : 'обед ' + clock('hunger'), eating ? 0 : MB.hungerDebuff(builder), MB.BALANCE.hungerDebuffFrom],
      MB.needOpen(campaign, 'smoke') && ['smoke', 'Перекур', smoke, smoking ? 'на перекуре' : called ? 'зовут на перекур' : 'перекур ' + clock('smoke'), 0, 0],
      MB.needOpen(campaign, 'night') &&
        ['moon', 'Усталость', fatigue, sleeping ? 'спит' : 'сон ' + clock('fatigue'), sleeping ? 0 : MB.fatigueDebuff(builder), MB.SLEEP.debuffFrom],
    ].filter(Boolean);
    return rows.map(function (row) {
      const pct = Math.round(Math.max(0, row[2]) * 100);
      const penalty = row[4] > 0 ? ' −' + Math.round(row[4] * 100) + '%' : '';
      const label = row[1] + ': ' + pct + '% · ' + row[3] + (penalty ? ' · работа' + penalty : '');
      return '<span class="worker-need' + (penalty ? ' warn' : '') + '" aria-label="' + UI.escapeHtml(label) + '" title="' + UI.escapeHtml(label) + '">' +
        ICONS[row[0]] + '<span>' + row[3] + (penalty ? '<b>работа' + penalty + '</b>' : '') + '</span><i><b style="width:' + pct + '%"></b>' +
        (row[5] ? '<em style="left:' + Math.round(row[5] * 100) + '%"></em>' : '') + '</i></span>';
    }).join('');
  }

  function rankLook(rank) {
    if (!rank) return null;
    return rank < 1 ? RANK_LOOKS.junior : rank > 1 ? RANK_LOOKS.senior : RANK_LOOKS.middle;
  }

  // A worker: the figure of worker-model.js in his rank's clothes (looks by the hiring order), with
  // the pickaxe and the cigarette in the right hand, the load on the back, the cube in the hands, the
  // shadow, the selection ring and a hit sphere for taps.
  function createStick(builder, size) {
    const group = WorkerModel.create({ shirt: builder.shirt, rank: builder.rank, seed: builder.index });
    const rightArm = group.userData.rightArm;
    const pick = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), workerMat.handle);
    const headPick = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), workerMat.pick);
    headPick.position.y = 0.18;
    pick.add(handle, headPick);
    pick.position.set(0.02, -0.28, 0.04);
    pick.rotation.z = 0.7;
    rightArm.add(pick);
    pick.visible = false;
    const cigarette = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6),
      new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.6 })
    );
    const cigaretteTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 5),
      new THREE.MeshStandardMaterial({ color: 0xe07a32, emissive: 0xe07a32, emissiveIntensity: 0.4 })
    );
    cigaretteTip.position.y = 0.08;
    cigarette.add(cigaretteTip);
    cigarette.position.set(0.03, -0.34, 0.05);
    cigarette.rotation.z = 1.1;
    cigarette.visible = false;
    rightArm.add(cigarette);
    // The load rides on the back as a stack (the worker faces +z); one cube goes to the hands to set.
    const carry = new THREE.Group();
    carry.position.set(0, 0.4, -0.27);
    const hand = new THREE.Mesh(carryGeometry, workerMat.cloth);
    hand.castShadow = true;
    hand.visible = false;
    hand.position.set(0, 0.42, 0.3);
    // Carry slots are made once; paintCarryStack only shows, sizes and dresses them.
    for (let i = 0; i < CARRY_SLOTS; i++) {
      const cube = new THREE.Mesh(carryGeometry, workerMat.cloth);
      cube.castShadow = true;
      cube.visible = false;
      carry.add(cube);
    }
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    const selection = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdf55, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false })
    );
    selection.rotation.x = -Math.PI / 2;
    selection.position.y = 0.025;
    selection.visible = false;
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
    );
    hit.position.y = 0.5;
    group.add(shadow, carry, hand, selection, hit);
    group.scale.setScalar(STICK_SCALE * (size || 1));
    group.rotation.order = 'YXZ';
    Object.assign(group.userData, { pick: pick, cigarette: cigarette, carry: carry, hand: hand, selection: selection });
    return group;
  }

  // Compact construction quadcopter: body with a winch, four arms with spinning rotors, skids and
  // nav lights. The sling (cable + cube) is kept level while the body tilts in flight.
  function createDrone() {
    const group = new THREE.Group();
    group.rotation.order = 'YXZ';
    const m = machineMat;
    const shell = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4, metalness: 0.25 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: 0.45, metalness: 0.2 });
    const body = new THREE.Group();
    group.add(body);
    vehicleBox(body, shell, [0.34, 0.12, 0.42], [0, 0, 0]);
    vehicleBox(body, orange, [0.36, 0.04, 0.12], [0, 0.07, 0.1]);
    vehicleBox(body, m.dark, [0.16, 0.08, 0.16], [0, -0.09, 0]);
    vehicleBox(body, m.glass, [0.14, 0.06, 0.04], [0, 0.01, 0.22]);
    const rotors = [];
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + i * Math.PI / 2;
      const x = Math.sin(angle) * 0.34;
      const z = Math.cos(angle) * 0.34;
      const arm = vehicleBox(body, m.dark, [0.04, 0.03, 0.36], [x / 2, 0.02, z / 2]);
      arm.rotation.y = angle;
      vehicleCylinder(body, m.dark, 0.035, 0.07, [x, 0.05, z], 'y');
      const rotor = new THREE.Group();
      rotor.position.set(x, 0.1, z);
      vehicleBox(rotor, m.dark, [0.3, 0.01, 0.035], [0, 0, 0]);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), m.blur);
      disc.rotation.x = -Math.PI / 2;
      rotor.add(disc);
      body.add(rotor);
      rotors.push(rotor);
    }
    for (let side = -1; side <= 1; side += 2) {
      vehicleBox(body, m.dark, [0.02, 0.12, 0.02], [side * 0.12, -0.12, 0.1]);
      vehicleBox(body, m.dark, [0.02, 0.12, 0.02], [side * 0.12, -0.12, -0.1]);
      vehicleBox(body, m.dark, [0.025, 0.025, 0.34], [side * 0.12, -0.18, 0]);
    }
    const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshBasicMaterial({ color: 0x4dff7a }));
    navGreen.position.set(0.18, 0, 0.18);
    const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff4d4d }));
    navRed.position.set(-0.18, 0, 0.18);
    body.add(navGreen, navRed);
    const sling = new THREE.Group();
    group.add(sling);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.02), m.dark);
    cable.visible = false;
    sling.add(cable);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), blockSurface(MB.MATERIALS[0].id, false));
    cube.visible = false;
    cube.castShadow = true;
    sling.add(cube);
    group.userData = {
      drone: true,
      body: body,
      rotors: rotors,
      sling: sling,
      cable: cable,
      cube: cube,
      cubeMaterial: '',
      pitch: 0,
      lastX: 0,
      lastZ: 0,
    };
    return group;
  }

  function addDronePad(cell) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.05, 1.05),
      new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.85 })
    );
    base.position.y = 0.025;
    base.receiveShadow = true;
    group.add(base);
    const mark = new THREE.MeshStandardMaterial({ color: 0xf2c75c, roughness: 0.6 });
    const bars = [[0.08, 0.46, -0.16, 0], [0.08, 0.46, 0.16, 0], [0.3, 0.08, 0, 0]];
    for (let i = 0; i < bars.length; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(bars[i][0], 0.012, bars[i][1]), mark);
      bar.position.set(bars[i][2], 0.056, bars[i][3]);
      group.add(bar);
    }
    group.position.set(cell[0], 0, cell[2]);
    levelRoot.add(group);
  }

  // Cable length below the drone for the current job step (lowering to rocks, slots and blocks).
  function droneSling(builder) {
    const total = Math.max(builder.actionT + builder.timer, 0.001);
    const p = builder.actionT / total;
    const carry = 0.5;
    if (builder.phase === 'pick') {
      const reach = Math.max(carry, builder.cell[1] - 1.1);
      const down = smoothStep(p / 0.35);
      const up = smoothStep((p - 0.65) / 0.35);
      return { length: carry + (reach - carry) * (down - up), cube: p > 0.4 };
    }
    if (builder.phase === 'drop' && builder.yardSlot) {
      const reach = Math.max(carry, builder.cell[1] - (builder.yardSlot.wy + 1) - 0.12);
      return { length: carry + (reach - carry) * smoothStep(p / 0.9), cube: true };
    }
    if (builder.phase === 'place' && builder.droneBlock) {
      const reach = Math.max(carry, builder.cell[1] - (builder.droneBlock.y + 1) - 0.12);
      return { length: carry + (reach - carry) * smoothStep(p / 0.15), cube: true };
    }
    return { length: carry, cube: builder.carryingCube === true };
  }

  function updateDroneView(viewState, builder, time, dt) {
    const group = viewState.group;
    const data = group.userData;
    const frozen = timeScale === 0;
    const airborne = builder.phase !== 'home' || builder.cell[1] > 0.45;
    const bob = airborne && timeScale !== 20 ? Math.sin(time * 3.1 + builder.index * 1.7) * 0.035 : 0;
    group.position.set(builder.cell[0], builder.cell[1] + bob, builder.cell[2]);
    data.lastX = builder.cell[0];
    data.lastZ = builder.cell[2];
    group.rotation.y = builder.heading || 0;
    const speedShare = builder.phase === 'fly' ? Math.min(1, (builder.currentSpeed || 0) / 6) : 0;
    data.pitch += (speedShare * 0.32 - data.pitch) * 0.15;
    data.body.rotation.x = data.pitch;
    const spin = frozen ? 0 : airborne ? 1.1 : 0.12;
    for (let i = 0; i < data.rotors.length; i++) data.rotors[i].rotation.y += i % 2 === 0 ? spin : -spin;
    // The load hangs level and square to the grid whatever way the drone faces.
    data.sling.rotation.y = -group.rotation.y;
    const sling = droneSling(builder);
    const material = builder.droneBlock ? builder.droneBlock.materialId : builder.carryMaterial;
    const showCube = sling.cube && material;
    data.cable.visible = airborne && (showCube || builder.phase === 'pick');
    data.cable.scale.y = sling.length;
    data.cable.position.y = -0.14 - sling.length / 2;
    data.cube.visible = !!showCube;
    if (showCube) {
      if (data.cubeMaterial !== material) {
        data.cubeMaterial = material;
        data.cube.material = blockSurface(material, false);
      }
      data.cube.position.y = -0.14 - sling.length - 0.45;
    }
    updateBadge(viewState, builder, droneIntent(builder), dt, viewState.load);
  }

  // realDt drives the status icons and the stride: both stand still while the game is paused.
  function updateSticks(time, realDt) {
    const dt = timeScale === 0 ? 0 : realDt || 0;
    if (cheerT > 0) cheerT -= realDt || 0;
    // The cabs first: a worker riding one stands where it is now.
    updateTaxis(dt);
    badgeRoot.visible = levelRoot.visible;
    workerPlan.visible = levelRoot.visible;
    updateBadgeLod();
    stickViews.forEach(function (viewState, builder) {
      const group = viewState.group;
      if (builder.trade === 'engineer') {
        updateDroneView(viewState, builder, time, dt);
        return;
      }
      const pos = MB.builderPosition(builder, world, viewState.pos || (viewState.pos = {}));
      const t = pos.mode === 'ride' ? 0 : builder.segmentT;
      // With an air taxi: hopping in, flying standing in its tub, hopping out.
      const ride = builder.phase === 'taxi' ? taxiRide(builder) : null;
      const x = pos.x;
      // Onto or off a cube the body follows a climbing / hopping curve, not the logic's straight line.
      const y = pos.mode === 'climb'
        ? builder.from[1] + (builder.to[1] - builder.from[1]) * climbLift(pos.climb) + climbDip(pos.climb)
        : pos.mode === 'descend'
          ? builder.from[1] + jumpHeight(pos.climb, builder.to[1] - builder.from[1]) + jumpDip(pos.climb)
          : pos.y;
      const z = pos.z;
      // On a ladder he stands in front of it, facing the wall it hangs on; elsewhere a worker with
      // no floor under him clings to the nearest wall.
      const w0 = mastDir(builder.from[0], builder.from[1], builder.from[2]);
      const w1 = mastDir(builder.to[0], builder.to[1], builder.to[2]);
      const wall = w1 || w0;
      const hanging = builder.phase !== 'walk' && !!wall && hangingAt(builder.cell);
      const cling = wall || ride ? NO_SHIFT : clingShift(builder.to);
      const nudgeX = ((w0 ? w0[0] : 0) + ((w1 ? w1[0] : 0) - (w0 ? w0[0] : 0)) * t) * LADDER_STAND;
      const nudgeZ = ((w0 ? w0[1] : 0) + ((w1 ? w1[1] : 0) - (w0 ? w0[1] : 0)) * t) * LADDER_STAND;
      const sit = builder.phase === 'break' && builder.breakKind === 'rest' ? 0.12 : 0;
      if (ride) group.position.set(ride.x, ride.y, ride.z);
      else group.position.set(x + 0.5 + cling[0] + nudgeX, y - sit, z + 0.5 + cling[1] + nudgeZ);
      let yawTarget = viewState.yaw === undefined ? group.rotation.y : viewState.yawTarget;
      if (ride) {
        yawTarget = ride.yaw;
      } else if ((pos.mode === 'ladder' || hanging) && wall) {
        yawTarget = Math.atan2(wall[0], wall[1]);
      } else {
        const faceDx = builder.faceX + 0.5 - group.position.x;
        const faceDz = builder.faceZ + 0.5 - group.position.z;
        if (faceDx * faceDx + faceDz * faceDz > 0.0004) yawTarget = Math.atan2(faceDx, faceDz);
      }
      // He turns at a limited speed instead of snapping (visual only: the logic's timing is untouched).
      viewState.yawTarget = yawTarget;
      if (viewState.yaw === undefined || timeScale === 20) viewState.yaw = yawTarget;
      else if (dt > 0) {
        let turn = yawTarget - viewState.yaw;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        const step = TURN_SPEED * dt * Math.max(1, timeScale);
        viewState.yaw += Math.abs(turn) <= step ? turn : Math.sign(turn) * step;
      }
      group.rotation.y = viewState.yaw;
      // Asleep in the dorm: inside, out of sight.
      viewState.indoors = builder.sleepPlace === 'dorm' && builder.phase === 'break' && builder.breakKind === 'sleep';
      if (group.visible === viewState.indoors) group.visible = !viewState.indoors;
      trackFootprints(viewState, builder, group, y, pos.mode);
      // In the heat a worker sweats: now and then drops fly off his head (about every 3 s).
      if (weatherView.heat > 0.3 && dt > 0 && Math.random() < dt * 0.35 * weatherView.heat) {
        burst(group.position.x, group.position.y + 1.05, group.position.z, 0xa8dcff, 2);
      }
      const moving = builder.phase === 'walk';
      const load = MB.carryLoad(builder, world, viewState.load);
      const carrying = builder.carry.length > 0;
      const fill = carrying ? Math.min(load.fill, 1) : 0;
      const heavy = carrying && load.overload > 1;
      // A fuller load leans the worker forward and shortens and slows his stride; overload more so.
      if (moving && dt > 0 && timeScale !== 20) viewState.gait += dt * (heavy ? 5 : 11 - 4 * fill);
      const step = Math.sin(viewState.gait + builder.index);
      const swing = timeScale === 20
        ? 0
        : moving
          ? step * (heavy ? 0.4 : 0.75 - 0.25 * fill)
          : Math.sin(time * 2 + builder.index) * 0.04;
      group.rotation.x = carrying ? 0.04 + 0.1 * fill + (heavy ? 0.12 : 0) : 0;
      group.userData.carry.position.y = heavy ? 0.34 : 0.4;
      if (heavy && moving && timeScale !== 20) group.position.y -= Math.abs(step) * 0.05;
      // A light walk bounces: up as the legs pass each other, down on each step.
      else if (moving && timeScale !== 20 && pos.mode === 'walk') group.position.y += (1 - Math.abs(step)) * 0.035;
      group.userData.leftLeg.rotation.x = swing;
      group.userData.rightLeg.rotation.x = -swing;
      if (builder.phase === 'mine') {
        group.userData.rightArm.rotation.x = timeScale === 20
          ? -0.6
          : -0.6 + Math.sin(builder.actionT * 16) * 1.05;
        group.userData.leftArm.rotation.x = 0.35;
        if (timeScale !== 20 && Math.sin(builder.actionT * 16) > 0.92) {
          const ore = builder.mineQueue[0].materialId;
          burst(builder.faceX + 0.5, 0.7, builder.faceZ + 0.5, MB.MATERIAL[ore].color, 2);
          // Удар кирки (art/fx.js strike): по руде металла — искры к рабочему, по камню — пыль у кончика.
          const ax = builder.faceX + 0.5 - group.position.x;
          const az = builder.faceZ + 0.5 - group.position.z;
          const reach = Math.hypot(ax, az) || 1;
          if (timeScale < 5) {
            fx.strike('pick', MicroBuildersFx.kind({ materialId: ore }), group.position.x + ax / reach * 0.42, 0.45,
              group.position.z + az / reach * 0.42, ax / reach, az / reach, MB.MATERIAL[ore].color);
          }
        }
      } else if (builder.phase === 'campFetch') {
        group.userData.rightArm.rotation.x = timeScale === 20 ? -0.6 : -0.6 + Math.sin(builder.actionT * 16) * 1.05;
        group.userData.leftArm.rotation.x = 0.35;
      } else if (builder.phase === 'campBuild') {
        const shake = timeScale === 20 ? 0 : Math.sin(builder.actionT * 18) * 0.06;
        group.userData.rightArm.rotation.x = -1.6 + shake;
        group.userData.leftArm.rotation.x = -1.6 - shake;
      } else if (builder.phase === 'plan') {
        group.userData.rightArm.rotation.x = -1.05;
        group.userData.leftArm.rotation.x = -1.05;
      } else if (hanging) {
        // On a ladder, not climbing: hands on the rails, feet on a rung; setting the next ladder
        // piece, the right hand works above his head.
        const work = builder.phase === 'erect' && timeScale !== 20 ? Math.sin(builder.actionT * 14) : 0;
        group.userData.rightArm.rotation.x = builder.phase === 'erect' ? -2.75 + work * 0.35 : -2.45;
        group.userData.leftArm.rotation.x = -2.35;
        group.userData.rightLeg.rotation.x = -0.45;
        group.userData.leftLeg.rotation.x = -0.65;
        group.rotation.x = 0.12;
        if (timeScale === 1 && builder.phase === 'erect' && work > 0.92) {
          burst(group.position.x, builder.cell[1] + 1.4, group.position.z, 0xc2a36b, 2);
        }
      } else if (builder.phase === 'place') {
        // Both hands hold the cube that crumbles into the build.
        const shake = timeScale === 20 ? 0 : Math.sin(builder.actionT * 18) * 0.06;
        group.userData.rightArm.rotation.x = -1.25 + shake;
        group.userData.leftArm.rotation.x = -1.25 - shake;
      } else if (builder.phase === 'erect' || builder.phase === 'assist') {
        group.userData.rightArm.rotation.x = -1.15;
        group.userData.leftArm.rotation.x = -0.45;
        if (timeScale === 1 && builder.phase === 'erect' && Math.sin(builder.actionT * 14) > 0.92) {
          burst(builder.faceX + 0.5, builder.cell[1] + 0.9, builder.faceZ + 0.5, 0xc2a36b, 2);
          fx.strike('hammer', 'wood', builder.faceX + 0.5, builder.cell[1] + 0.9, builder.faceZ + 0.5,
            Math.sin(group.rotation.y), Math.cos(group.rotation.y), 0xc2a36b);
        }
      } else if (moving && pos.mode === 'ladder') {
        // Hand over hand: one full arm-and-leg cycle per rung floor, in step with the height, so
        // it never runs ahead of the climb; a little chest-to-the-ladder lean and bob.
        const phase = (builder.from[1] + (builder.to[1] - builder.from[1]) * pos.climb) * Math.PI * 2 + builder.index;
        const k = timeScale === 20 ? 0 : Math.sin(phase);
        group.userData.rightArm.rotation.x = -2.5 + 0.5 * k;
        group.userData.leftArm.rotation.x = -2.5 - 0.5 * k;
        group.userData.rightLeg.rotation.x = -0.55 - 0.45 * k;
        group.userData.leftLeg.rotation.x = -0.55 + 0.45 * k;
        group.rotation.x = 0.12;
        group.position.y += 0.03 * Math.abs(Math.cos(phase));
      } else if (moving && pos.mode === 'climb') {
        poseClimbUp(group, timeScale === 20 ? 0.5 : pos.climb);
      } else if (moving && pos.mode === 'descend') {
        poseJumpDown(group, timeScale === 20 ? 0.6 : pos.climb);
      } else if (heavy) {
        // Bent under the load on the back, hands on the straps.
        const strain = timeScale === 20 ? 0 : Math.sin(time * 34 + builder.index) * 0.05;
        group.userData.leftArm.rotation.x = 0.3 + strain;
        group.userData.rightArm.rotation.x = 0.3 - strain;
      } else if (builder.carry.length > 0) {
        group.userData.leftArm.rotation.x = -swing * 0.55;
        group.userData.rightArm.rotation.x = swing * 0.55;
      } else {
        group.userData.leftArm.rotation.x = -swing * 0.85;
        group.userData.rightArm.rotation.x = swing * 0.85;
      }
      if (builder.phase === 'meal') {
        group.userData.leftArm.rotation.x = -2.15;
        group.userData.rightArm.rotation.x = -2.15;
      } else if (builder.phase === 'break' && builder.breakKind === 'sleep') {
        // Asleep on his back in the trailer camp, breathing slowly.
        const breath = timeScale === 20 ? 0 : Math.sin(builder.actionT * 1.6 + builder.index) * 0.04;
        group.rotation.x = -Math.PI / 2;
        group.position.y += 0.14;
        group.userData.leftArm.rotation.x = 0.08 + breath;
        group.userData.rightArm.rotation.x = 0.08 + breath;
        group.userData.leftLeg.rotation.x = 0;
        group.userData.rightLeg.rotation.x = 0;
      } else if (builder.phase === 'break' && builder.breakKind === 'rest') {
        group.userData.leftArm.rotation.x = 0.4;
        group.userData.rightArm.rotation.x = 0.4;
        group.userData.leftLeg.rotation.x = 1.15;
        group.userData.rightLeg.rotation.x = 1.15;
      } else if (builder.phase === 'break' && builder.breakKind === 'smoke') {
        const drag = timeScale === 20 ? 0 : Math.sin(builder.actionT * 3.2);
        group.userData.rightArm.rotation.x = -2.15 - drag * 0.28;
        group.userData.leftArm.rotation.x = 0.12;
        if (timeScale !== 20 && drag > 0.92 && Math.random() < 0.5) {
          // Дымок сигареты — светлый клубок, тает вверх (art/fx.js puff).
          fx.puff(group.position.x, group.position.y + 1.05, group.position.z, 0xe4e0d8);
        }
      }
      // Сдача объекта (celebrate): бригада подпрыгивает и машет руками; спящие и на лестнице — нет.
      if (cheerT > 0 && timeScale !== 20 && !hanging && pos.mode !== 'ladder' &&
        !(builder.phase === 'break' && builder.breakKind === 'sleep')) {
        const hop = Math.abs(Math.sin(cheerT * 7 + builder.index * 0.9));
        const fade = Math.min(1, cheerT / 0.4);
        group.position.y += hop * 0.2 * fade;
        group.userData.leftArm.rotation.x = -2.6 - 0.35 * hop;
        group.userData.rightArm.rotation.x = -2.6 + 0.35 * hop;
      }
      group.userData.cigarette.visible = builder.phase === 'break' && builder.breakKind === 'smoke';
      updateHandCube(viewState, builder, group, dt);
      updateBadge(viewState, builder, workerIntent(builder, load, viewState.badge), dt, load);
      group.userData.pick.visible = builder.phase === 'mine' || builder.phase === 'campFetch';
      // carryVersion changes with every change of the carry; the capacity with a new trip.
      // The cube being set is in the hands, not on the back: the stack shrinks as placing starts.
      const inHands = builder.phase === 'place' ? builder.carry[0] || null : null;
      if (viewState.carryVersion !== builder.carryVersion || viewState.carryHand !== inHands ||
          (carrying && viewState.carryCap !== load.capacity)) {
        viewState.carryVersion = builder.carryVersion;
        viewState.carryHand = inHands;
        viewState.carryCap = load.capacity;
        paintCarryStack(viewState, builder, load, inHands);
      }
    });
  }

  function updateWorkerPlan(time) {
    if (!selectedBuilder) return;
    const pieces = [];
    if (selectedBuilder.routeId >= 0) {
      const route = world.routes[selectedBuilder.routeId];
      for (let i = route.stepIndex; i < route.steps.length; i++) {
        const piece = route.steps[i].piece;
        if (piece && !piece.built && !piece.removed && !pieces.includes(piece)) pieces.push(piece);
      }
    }
    if (selectedBuilder.erectPiece && !pieces.includes(selectedBuilder.erectPiece)) {
      pieces.push(selectedBuilder.erectPiece);
    }
    const planBlocks = [];
    const seenPlan = new Set();
    for (let i = 0; i < selectedBuilder.plan.length; i++) {
      const block = selectedBuilder.plan[i];
      if (block.built || seenPlan.has(block.id)) continue;
      seenPlan.add(block.id);
      planBlocks.push(block);
    }
    const carryCounts = new Map();
    for (let i = 0; i < selectedBuilder.carry.length; i++) {
      const block = selectedBuilder.carry[i];
      if (block.built) continue;
      if (!carryCounts.has(block)) carryCounts.set(block, 0);
      carryCounts.set(block, carryCounts.get(block) + 1);
      if (!seenPlan.has(block.id)) {
        seenPlan.add(block.id);
        planBlocks.push(block);
      }
    }
    const routeCells = selectedRouteCells(selectedBuilder);
    const signature = selectedBuilder.index + '|' +
      planBlocks.map(function (block) {
        const hauled = carryCounts.has(block) ? carryCounts.get(block) : 0;
        return block.id + ':' + block.poured + ':' + hauled;
      }).join(',') + '|' +
      pieces.map(function (piece) { return piece.id; }).join(',') + '|' +
      routeCells.map(function (cell) { return cell[0] + ':' + cell[1] + ':' + cell[2]; }).join(',');
    const planChanged = signature !== workerPlanSignature;
    if (planChanged) {
      workerPlanSignature = signature;
      rebuildWorkerPlan(planBlocks, carryCounts, pieces, routeCells);
    }
    if (timeScale === 20) return;
    const wave = Math.sin(time * 5) * 0.13;
    workerPlan.traverse(function (object) {
      if (object.material && object.userData.blink !== undefined) {
        object.material.opacity = object.userData.blink + wave;
      }
    });
  }

  function selectedRouteCells(builder) {
    if (builder.routeId < 0) return [];
    const route = world.routes[builder.routeId];
    if (!route || route.complete) return [];
    const cells = [builder.cell];
    for (let i = route.stepIndex; i < route.steps.length; i++) {
      const cell = route.steps[i].cell;
      const prev = cells[cells.length - 1];
      if (prev[0] === cell[0] && prev[1] === cell[1] && prev[2] === cell[2]) continue;
      cells.push(cell);
    }
    return cells;
  }

  function addRouteLine(cells) {
    if (cells.length < 2) return;
    const positions = new Float32Array(cells.length * 3);
    for (let i = 0; i < cells.length; i++) {
      positions[i * 3] = cells[i][0] + 0.5;
      positions[i * 3 + 1] = cells[i][1] + 0.5;
      positions[i * 3 + 2] = cells[i][2] + 0.5;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
      color: 0x3dce67,
      transparent: true,
      opacity: 1,
      depthTest: false,
    }));
    line.renderOrder = 30;
    workerPlan.add(line);
  }

  function rebuildWorkerPlan(blocks, carryCounts, pieces, routeCells) {
    clearWorkerPlan();
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const total = MB.pourTotal(block);
      const hauled = carryCounts.has(block) ? carryCounts.get(block) : 0;
      let color = 0x4c8dff;
      let blink = 0.22;
      if (hauled > 0 && hauled < total - block.poured) {
        color = 0xf2c14a;
        blink = 0.36;
      } else if (hauled > 0) {
        color = 0x3dce67;
        blink = 0.36;
      }
      addWorkerPlanBox(
        block.x + 0.5,
        block.y + 0.5,
        block.z + 0.5,
        0.94,
        0.94,
        0.94,
        color,
        blink
      );
    }
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].deck) addWorkerPlanDeck(pieces[i]);
      else addWorkerPlanLadder(pieces[i]);
    }
    addRouteLine(routeCells);
  }

  function addWorkerPlanDeck(deck) {
    addWorkerPlanBox(deck.x + 0.5, deck.y + 0.07, deck.z + 0.5, 0.94, 0.1, 0.94, 0x4ce6e0, 0.25);
  }

  function addWorkerPlanLadder(piece) {
    const perpX = -piece.oz;
    const perpZ = piece.ox;
    const out = 0.14;
    const spread = 0.11;
    const x1 = piece.x + 0.5 + piece.ox * out + perpX * spread;
    const z1 = piece.z + 0.5 + piece.oz * out + perpZ * spread;
    const x2 = piece.x + 0.5 + piece.ox * out - perpX * spread;
    const z2 = piece.z + 0.5 + piece.oz * out - perpZ * spread;
    addWorkerPlanBox(x1, piece.y + 0.5, z1, 0.055, 1, 0.055, 0xffc84a, 0.25);
    addWorkerPlanBox(x2, piece.y + 0.5, z2, 0.055, 1, 0.055, 0xffc84a, 0.25);
    const spanX = x2 - x1;
    const spanZ = z2 - z1;
    const span = Math.hypot(spanX, spanZ);
    for (let i = 1; i <= 4; i++) {
      const rung = addWorkerPlanBox(
        (x1 + x2) * 0.5,
        piece.y + i / 5,
        (z1 + z2) * 0.5,
        0.045,
        span,
        0.045,
        0xffc84a,
        0.25
      );
      rung.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(spanX, 0, spanZ).normalize()
      );
    }
  }

  function addWorkerPlanBox(x, y, z, sx, sy, sz, color, blink) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: blink,
        depthWrite: false,
        depthTest: false,
      })
    );
    mesh.position.set(x, y, z);
    mesh.userData.blink = blink;
    mesh.renderOrder = 20;
    workerPlan.add(mesh);
    return mesh;
  }

  function clearWorkerPlan() {
    while (workerPlan.children.length > 0) {
      const child = workerPlan.children[workerPlan.children.length - 1];
      child.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
      workerPlan.remove(child);
    }
  }

  function updateFeatures(deltaTime, elapsedTime) {
    const walkers = [];
    stickViews.forEach(function (viewState, builder) {
      if (builder.phase === 'walk') walkers.push(builder);
    });
    Features.update(featureState, deltaTime, elapsedTime, walkers);
  }

  function clingShift(cell) {
    if (cell[1] === 0) return [0, 0];
    const index = world.index;
    if (!index.inside(cell[0], cell[1] - 1, cell[2])) return [0, 0];
    if (world.solidGrid[index.id(cell[0], cell[1] - 1, cell[2])] === 1) return [0, 0];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < dirs.length; i++) {
      const x = cell[0] + dirs[i][0];
      const z = cell[2] + dirs[i][1];
      if (!index.inside(x, cell[1], z)) continue;
      if (world.solidGrid[index.id(x, cell[1], z)] === 1) return [dirs[i][0] * 0.26, dirs[i][1] * 0.26];
    }
    return [0, 0];
  }

  // The wall a ladder at this cell (or the one he stands on below) hangs on: [ox, oz] or null.
  function mastDir(x, y, z) {
    const upper = world.rungByKey.get(MB.cellKey(x, y, z));
    if (upper && upper.built && !upper.removed) return upper.dir || (upper.dir = [upper.ox, upper.oz]);
    const lower = world.rungByKey.get(MB.cellKey(x, y - 1, z));
    if (lower && lower.built && !lower.removed) return lower.dir || (lower.dir = [lower.ox, lower.oz]);
    return null;
  }

  // No floor under him: he is on the ladder itself.
  function hangingAt(cell) {
    if (cell[1] === 0) return false;
    const index = world.index;
    if (!index.inside(cell[0], cell[1] - 1, cell[2])) return false;
    const below = index.id(cell[0], cell[1] - 1, cell[2]);
    return world.solidGrid[below] !== 1 && world.deckGrid[index.id(cell[0], cell[1], cell[2])] !== 1;
  }


  function onScaffold(event) {
    if (timeScale === 1) {
      burst(event.x + 0.5, event.y + 0.45, event.z + 0.5, 0xc2a36b, 4);
      tone(210, 0.045);
    }
  }

  // A piece cracked (half its durability gone) or broke: dust, and a creak when it breaks.
  // «Учебный центр»: a worker passed a rank — his helmet takes its colour, a pop over him.
  function onRankUp(event) {
    const view = stickViews.get(event.builder);
    if (!view || !view.group.userData.body) return;
    WorkerModel.dress(view.group, event.rank);
    if (timeScale !== 1) return;
    const p = view.group.position;
    const spec = MB.TRAINING_RANKS[event.rank - 1];
    burst(p.x, p.y + 0.9, p.z, spec ? parseInt(spec.helmet, 16) : 0xffd24a, 10);
    floatAt(p.x, p.y + 1.3, p.z, event.rank + ' разряд!', 'gold');
    tone(660 + event.rank * 60, 0.1);
  }

  // The cafe's pastry eaten on the spot: crumbs and its name over the worker.
  function onSnack(event) {
    const builder = world.builders[event.builder];
    const view = builder ? stickViews.get(builder) : null;
    if (!view || timeScale !== 1) return;
    const p = view.group.position;
    burst(p.x, p.y + 0.8, p.z, 0xe0a85a, 5);
    floatAt(p.x, p.y + 1.2, p.z, MB.DISH[event.dish] ? MB.DISH[event.dish].name : 'Перекус', 'gold');
  }

  // «Торт «Наполеон»»: its moment — everyone who ate it works faster for a while.
  function onTorte() {
    UI.toast({ text: 'Торт «Наполеон»: у всех, кто его ел, +25% ко всему на 40 с', icon: 'icons/icon-dish-napoleon.jpg', tone: 'good', key: 'torte', duration: 2600 });
  }

  // A crack (tuning.scaffold.crackShare of the durability left) and a break float over the piece.
  function onScaffoldWear(event) {
    if (timeScale !== 1) return;
    burst(event.x + 0.5, event.y + 0.45, event.z + 0.5, event.broken ? 0x8a6a48 : 0xb59a72, event.broken ? 8 : 3);
    if (event.broken) tone(120, 0.08);
    const crack = (window.MicroBuildersBalance.tuning.scaffold || {}).crackShare || 0.5;
    floatAt(event.x + 0.5, event.y + 1, event.z + 0.5, event.broken ? 'Леса сломались' : 'Износ лесов ' + Math.round((1 - crack) * 100) + '%', 'wear',
      event.broken ? 'чинят, как новые' : '');
  }

  // Wear on view: a cracked piece goes darker with dark crack lines, a broken one darker still under
  // a red-and-white tape cross. Broken pieces stay on view until repaired.
  function paintScaffoldWear(id) {
    const piece = scaffoldPieceById.get(id);
    if (!piece) return;
    const state = piece.broken ? 'broken' : piece.cracked ? 'cracked' : 'ok';
    const tint = WEAR_TINT[state];
    const tilt = wearTilt(piece, WEAR_TILT[state]);
    const list = scaffoldLookup.get(id) || [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item.owner !== id) continue;
      item.mesh.setColorAt(item.index, tint);
      item.mesh.setMatrixAt(item.index, tilt ? wearMatrix.multiplyMatrices(tilt, item.matrix) : item.matrix);
      scaffoldDirty.add(item.mesh);
    }
    showScaffoldMarks(scaffoldCrackLookup.get(id), state !== 'ok', tilt);
    showScaffoldMarks(scaffoldTapeLookup.get(id), state === 'broken', tilt);
  }

  function showScaffoldMarks(list, visible, tilt) {
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!visible) item.mesh.setMatrixAt(item.index, hiddenScaffoldMatrix);
      else item.mesh.setMatrixAt(item.index, tilt ? wearMatrix.multiplyMatrices(tilt, item.matrix) : item.matrix);
      scaffoldDirty.add(item.mesh);
    }
  }

  // The lean of a worn piece by `angle`: a ladder (or frame) turns about its foot by the wall so its
  // top comes off the wall; a deck turns about one edge so the opposite one drops (the edge — steady
  // per cell). Null when it stands straight.
  const wearMatrix = new THREE.Matrix4();
  const wearPivot = new THREE.Matrix4();
  const wearTurn = new THREE.Matrix4();
  const wearAxis = new THREE.Vector3();
  function wearTilt(piece, angle) {
    if (!angle) return null;
    let px;
    let py;
    let pz;
    if (piece.deck) {
      const side = ((piece.x * 7 + piece.z * 13 + piece.y * 3) % 4 + 4) % 4;
      const sx = side === 0 ? 1 : side === 1 ? -1 : 0;
      const sz = side === 2 ? 1 : side === 3 ? -1 : 0;
      px = piece.x + 0.5 - sx * 0.5;
      py = piece.y + 0.06;
      pz = piece.z + 0.5 - sz * 0.5;
      wearAxis.set(sz, 0, -sx);
    } else {
      const out = piece.ladder ? 0.14 : 0.26;
      px = piece.x + 0.5 + piece.ox * out;
      py = piece.y;
      pz = piece.z + 0.5 + piece.oz * out;
      wearAxis.set(-piece.oz, 0, piece.ox);
    }
    wearTurn.makeRotationAxis(wearAxis.normalize(), angle);
    wearPivot.makeTranslation(px, py, pz);
    const tilt = new THREE.Matrix4().multiplyMatrices(wearPivot, wearTurn);
    return tilt.multiply(wearPivot.makeTranslation(-px, -py, -pz));
  }

  function revealScaffold(id) {
    const list = scaffoldLookup.get(id);
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      item.mesh.setMatrixAt(item.index, item.matrix);
      scaffoldDirty.add(item.mesh);
    }
  }

  function flushScaffold() {
    scaffoldDirty.forEach(function (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    scaffoldDirty.clear();
  }

  function clearScaffoldView() {
    for (let i = 0; i < scaffoldMeshes.length; i++) {
      const mesh = scaffoldMeshes[i];
      levelRoot.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.dispose();
    }
    scaffoldMeshes = [];
    scaffoldLookup = new Map();
    scaffoldCrackLookup = new Map();
    scaffoldTapeLookup = new Map();
    scaffoldPieceById = new Map();
  }

  function refreshScaffoldView() {
    const started = performance.now();
    buildScaffoldView();
    const all = world.scaffoldPieces.concat(world.scaffoldDecks);
    for (let i = 0; i < all.length; i++) {
      const piece = all[i];
      if (piece.removed || !(piece.built || piece.broken)) continue;
      revealScaffold(piece.id);
      if (piece.cracked || piece.broken) paintScaffoldWear(piece.id);
    }
    flushScaffold();
    MicroBuildersProfiler.add('scaffoldView', performance.now() - started);
  }

  // Deck floors of the five scaffold types, painted once on 64×64 canvases (steady pseudo-random grain).
  function scaffoldFloorTextures() {
    if (scaffoldFloors) return scaffoldFloors;
    let seed = 7;
    const rnd = function () {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    function floor(paint) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      paint(canvas.getContext('2d'));
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    }
    // Chequer plate: raised ticks in alternating diagonals, lit from the top-left.
    function chequer(g, base, light, dark) {
      g.fillStyle = base;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        for (let x = 0; x < 64; x += 8) {
          g.save();
          g.translate(x + 4, y + 4);
          g.rotate((x + y) % 16 === 0 ? Math.PI / 4 : -Math.PI / 4);
          g.fillStyle = dark;
          g.fillRect(-3, 0, 6, 1.6);
          g.fillStyle = light;
          g.fillRect(-3, -1.4, 6, 1.4);
          g.restore();
        }
      }
    }
    function edge(g, width) {
      g.beginPath();
      g.rect(0, 0, 64, 64);
      g.rect(width, width, 64 - 2 * width, 64 - 2 * width);
    }
    scaffoldFloors = [
      floor(function (g) {
        // Wood: four boards, grain, dark gaps and nail heads.
        const tones = ['#c39058', '#b07b45', '#c79a63', '#a9753f'];
        for (let b = 0; b < 4; b++) {
          const y = b * 16;
          g.fillStyle = tones[b];
          g.fillRect(0, y, 64, 16);
          g.fillStyle = 'rgba(92, 56, 24, 0.32)';
          for (let k = 0; k < 5; k++) g.fillRect(0, y + 2 + Math.floor(rnd() * 11), 64, 1);
          g.fillStyle = '#5a391b';
          g.fillRect(0, y + 15, 64, 1);
          g.fillRect(Math.floor(8 + rnd() * 48), y, 1, 15);
          g.fillStyle = '#3e2812';
          g.fillRect(3, y + 7, 2, 2);
          g.fillRect(59, y + 7, 2, 2);
        }
      }),
      floor(function (g) {
        // Concrete: four slabs, speckles, seams.
        g.fillStyle = '#aaa79f';
        g.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 700; i++) {
          g.fillStyle = rnd() < 0.5 ? 'rgba(70, 68, 62, 0.28)' : 'rgba(232, 229, 220, 0.32)';
          g.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1);
        }
        g.fillStyle = '#76736c';
        g.fillRect(31, 0, 2, 64);
        g.fillRect(0, 31, 64, 2);
        g.fillRect(0, 0, 64, 1);
        g.fillRect(0, 0, 1, 64);
      }),
      floor(function (g) {
        // Painted plywood: green paint, lighter anti-slip dots, a darker painted rim.
        g.fillStyle = '#3d9862';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#62b985';
        for (let y = 4; y < 64; y += 8) {
          for (let x = (y / 8) % 2 ? 8 : 4; x < 64; x += 8) g.fillRect(x - 1, y - 1, 2, 2);
        }
        g.fillStyle = '#2a7046';
        edge(g, 3);
        g.fill('evenodd');
      }),
      floor(function (g) {
        // Chequer plate, a yellow-black hazard edge.
        chequer(g, '#9da4ab', '#cfd5da', '#686f76');
        g.save();
        edge(g, 7);
        g.clip('evenodd');
        g.fillStyle = '#1e1e1e';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#f2c230';
        for (let k = -64; k < 128; k += 12) {
          g.beginPath();
          g.moveTo(k, 0);
          g.lineTo(k + 6, 0);
          g.lineTo(k + 70, 64);
          g.lineTo(k + 64, 64);
          g.closePath();
          g.fill();
        }
        g.restore();
      }),
      floor(function (g) {
        // Dark chequer plate, a red edge.
        chequer(g, '#4a5058', '#727a83', '#2c3036');
        g.fillStyle = '#c8262e';
        edge(g, 5);
        g.fill('evenodd');
      }),
    ];
    return scaffoldFloors;
  }

  function buildScaffoldView() {
    clearScaffoldView();
    const pieces = world.scaffoldPieces.filter(function (piece) { return !piece.removed; });
    const decks = world.scaffoldDecks.filter(function (deck) { return !deck.removed; });
    if (pieces.length === 0 && decks.length === 0) return;
    const poles = [];
    const rungs = [];
    const braces = [];
    const plates = [];
    const planks = [];
    const rails = [];
    const posts = [];
    const couplers = [];
    const cracks = [];
    const tapes = [];
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    // The type of what is stamped now (MB.scaffoldTier by its level): each type has its own look.
    let tier = 1;
    function stamp(list, id, px, py, pz, sx, sy, sz, dx, dy, dz, also) {
      dummy.position.set(px, py, pz);
      dummy.scale.set(sx, sy, sz);
      if (dx === 0 && dz === 0 && dy >= 0) dummy.quaternion.identity();
      else {
        dir.set(dx, dy, dz).normalize();
        dummy.quaternion.setFromUnitVectors(up, dir);
      }
      dummy.updateMatrix();
      list.push({ id: id, also: also || '', tier: tier, matrix: dummy.matrix.clone() });
    }
    // A bar from one point to another (crack lines, tape strips).
    function bar(list, id, ax, ay, az, bx, by, bz, radius) {
      stamp(list, id, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, radius, Math.hypot(bx - ax, by - ay, bz - az), radius,
        bx - ax, by - ay, bz - az);
    }
    // A steady pseudo-random 0…1 per cell and salt, so crack lines differ between pieces.
    function jitter(x, y, z, salt) {
      const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + salt * 4.581) * 43758.5453;
      return h - Math.floor(h);
    }
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      tier = MB.scaffoldTier(piece.y);
      scaffoldPieceById.set(piece.id, piece);
      const ox = piece.ox;
      const oz = piece.oz;
      const perpX = -oz;
      const perpZ = ox;
      const ladder = piece.ladder;
      const spread = ladder ? 0.11 : 0.17;
      const out = ladder ? 0.14 : 0.26;
      const x1 = piece.x + 0.5 + ox * out + perpX * spread;
      const z1 = piece.z + 0.5 + oz * out + perpZ * spread;
      const x2 = piece.x + 0.5 + ox * out - perpX * spread;
      const z2 = piece.z + 0.5 + oz * out - perpZ * spread;
      const radius = ladder ? 0.032 : 0.048;
      stamp(poles, piece.id, x1, piece.y + 0.5, z1, radius, 1, radius, 0, 1, 0);
      stamp(poles, piece.id, x2, piece.y + 0.5, z2, radius, 1, radius, 0, 1, 0);
      stamp(couplers, piece.id, x1, piece.y + 1, z1, 0.075, 0.075, 0.075, 0, 1, 0);
      stamp(couplers, piece.id, x2, piece.y + 1, z2, 0.075, 0.075, 0.075, 0, 1, 0);
      const spanX = x2 - x1;
      const spanZ = z2 - z1;
      const span = Math.hypot(spanX, spanZ);
      const rungCount = ladder ? 4 : 2;
      for (let r = 1; r <= rungCount; r++) {
        stamp(rungs, piece.id, (x1 + x2) / 2, piece.y + r / (rungCount + 1), (z1 + z2) / 2, 0.018, span, 0.018, spanX, 0, spanZ);
      }
      stamp(rungs, piece.id, (x1 + x2) / 2, piece.y + 1, (z1 + z2) / 2, 0.028, span, 0.028, spanX, 0, spanZ);
      if (!ladder && piece.y % 2 === 0) {
        stamp(braces, piece.id, (x1 + x2) / 2, piece.y + 0.5, (z1 + z2) / 2, 0.02, Math.hypot(spanX, 1, spanZ), 0.02, spanX, 1, spanZ);
        stamp(braces, piece.id, (x1 + x2) / 2, piece.y + 0.5, (z1 + z2) / 2, 0.02, Math.hypot(spanX, 1, spanZ), 0.02, -spanX, 1, -spanZ);
      }
      if (piece.y === 0) {
        const plateX = Math.abs(perpX) * 0.34 + 0.22;
        const plateZ = Math.abs(perpZ) * 0.34 + 0.22;
        stamp(plates, piece.id, (x1 + x2) / 2, 0.025, (z1 + z2) / 2, plateX, 0.05, plateZ, 0, 1, 0);
      }
      // Cracks: a split along each pole; the tape: a cross over the ladder, off the wall.
      for (let side = 0; side < 2; side++) {
        const px = side === 0 ? x1 : x2;
        const pz = side === 0 ? z1 : z2;
        const at = piece.y + 0.2 + jitter(piece.x, piece.y, piece.z, side) * 0.45;
        // A kinked split: up the pole, then a short jag aside.
        const cx = px - ox * radius;
        const cz = pz - oz * radius;
        const jag = (side === 0 ? 1 : -1) * 0.07;
        bar(cracks, piece.id, cx, at, cz, cx + perpX * jag, at + 0.2, cz + perpZ * jag, radius * 0.8);
        bar(cracks, piece.id, cx + perpX * jag, at + 0.2, cz + perpZ * jag, cx, at + 0.36, cz, radius * 0.8);
      }
      const fx = -ox * 0.06;
      const fz = -oz * 0.06;
      bar(tapes, piece.id, x1 + fx, piece.y + 0.1, z1 + fz, x2 + fx, piece.y + 0.9, z2 + fz, 0.042);
      bar(tapes, piece.id, x2 + fx, piece.y + 0.1, z2 + fz, x1 + fx, piece.y + 0.9, z1 + fz, 0.042);
    }
    const deckAt = new Set();
    const ladderBy = new Map();
    for (let i = 0; i < decks.length; i++) {
      deckAt.add(decks[i].x + ':' + decks[i].y + ':' + decks[i].z);
    }
    for (let i = 0; i < pieces.length; i++) {
      if (!pieces[i].ladder) continue;
      const key = pieces[i].x + ':' + (pieces[i].y + 1) + ':' + pieces[i].z;
      deckAt.add(key);
      ladderBy.set(key, pieces[i]);
    }
    function hasConnectedSide(x, y, z) {
      if (deckAt.has(x + ':' + y + ':' + z)) return true;
      if (!world.index.inside(x, y, z)) return false;
      if (world.solidGrid[world.index.id(x, y, z)] === 1) return true;
      if (y === 0) return true;
      if (!world.index.inside(x, y - 1, z)) return false;
      return world.solidGrid[world.index.id(x, y - 1, z)] === 1;
    }
    function layRail(id, y, x0, z0, x1, z1) {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const mx = (x0 + x1) * 0.5;
      const mz = (z0 + z1) * 0.5;
      const len = Math.hypot(dx, dz);
      stamp(braces, id, mx, y + 0.88, mz, 0.024, len, 0.024, dx, 0, dz);
      stamp(rails, id, mx, y + 0.5, mz, 0.018, len, 0.018, dx, 0, dz);
      stamp(posts, id, x0, y + 0.46, z0, 0.028, 0.86, 0.028, 0, 1, 0);
      stamp(posts, id, x1, y + 0.46, z1, 0.028, 0.86, 0.028, 0, 1, 0);
    }
    for (let i = 0; i < decks.length; i++) {
      const deck = decks[i];
      tier = MB.scaffoldTier(deck.y);
      scaffoldPieceById.set(deck.id, deck);
      const east = hasConnectedSide(deck.x + 1, deck.y, deck.z);
      const west = hasConnectedSide(deck.x - 1, deck.y, deck.z);
      const north = hasConnectedSide(deck.x, deck.y, deck.z + 1);
      const south = hasConnectedSide(deck.x, deck.y, deck.z - 1);
      const minX = deck.x + 0.5 - (west ? 0.48 : 0.32);
      const maxX = deck.x + 0.5 + (east ? 0.48 : 0.32);
      const minZ = deck.z + 0.5 - (south ? 0.48 : 0.32);
      const maxZ = deck.z + 0.5 + (north ? 0.48 : 0.32);
      const px = (minX + maxX) * 0.5;
      const pz = (minZ + maxZ) * 0.5;
      const lenX = maxX - minX;
      const lenZ = maxZ - minZ;
      const ladder = ladderBy.get(deck.x + ':' + deck.y + ':' + deck.z);
      if (ladder) {
        const holeX = ladder.ox !== 0 ? 0.416 : 0.52;
        const holeZ = ladder.oz !== 0 ? 0.416 : 0.52;
        const holeCenterX = deck.x + 0.5 + ladder.ox * 0.14;
        const holeCenterZ = deck.z + 0.5 + ladder.oz * 0.14;
        const holeMinX = holeCenterX - holeX * 0.5;
        const holeMaxX = holeCenterX + holeX * 0.5;
        const holeMinZ = holeCenterZ - holeZ * 0.5;
        const holeMaxZ = holeCenterZ + holeZ * 0.5;
        stamp(planks, deck.id, (minX + holeMinX) * 0.5, deck.y + 0.055, pz, holeMinX - minX, 0.045, lenZ, 0, 1, 0);
        stamp(planks, deck.id, (holeMaxX + maxX) * 0.5, deck.y + 0.055, pz, maxX - holeMaxX, 0.045, lenZ, 0, 1, 0);
        stamp(planks, deck.id, holeCenterX, deck.y + 0.055, (minZ + holeMinZ) * 0.5, holeX, 0.045, holeMinZ - minZ, 0, 1, 0);
        stamp(planks, deck.id, holeCenterX, deck.y + 0.055, (holeMaxZ + maxZ) * 0.5, holeX, 0.045, maxZ - holeMaxZ, 0, 1, 0);
      } else {
        stamp(planks, deck.id, px, deck.y + 0.055, pz, lenX, 0.045, lenZ, 0, 1, 0);
      }
      if (!east) layRail(deck.id, deck.y, maxX, minZ, maxX, maxZ);
      if (!west) layRail(deck.id, deck.y, minX, minZ, minX, maxZ);
      if (!north) layRail(deck.id, deck.y, minX, maxZ, maxX, maxZ);
      if (!south) layRail(deck.id, deck.y, minX, minZ, maxX, minZ);
      // Cracks: three dark lines over the boards; the tape: a cross from corner to corner.
      for (let c = 0; c < 3; c++) {
        const cx = minX + (0.2 + 0.6 * jitter(deck.x, deck.y, deck.z, c)) * lenX;
        const cz = minZ + (0.2 + 0.6 * jitter(deck.x, deck.y, deck.z, c + 7)) * lenZ;
        const angle = jitter(deck.x, deck.y, deck.z, c + 13) * Math.PI;
        const half = 0.12 + 0.06 * jitter(deck.x, deck.y, deck.z, c + 21);
        bar(cracks, deck.id, cx - Math.cos(angle) * half, deck.y + 0.085, cz - Math.sin(angle) * half,
          cx + Math.cos(angle) * half, deck.y + 0.085, cz + Math.sin(angle) * half, 0.02);
      }
      // The tape: a cordon round the deck at waist height, seen from any side.
      const tx0 = minX + 0.03;
      const tx1 = maxX - 0.03;
      const tz0 = minZ + 0.03;
      const tz1 = maxZ - 0.03;
      const ty = deck.y + 0.6;
      bar(tapes, deck.id, tx0, ty, tz0, tx1, ty, tz0, 0.04);
      bar(tapes, deck.id, tx0, ty, tz1, tx1, ty, tz1, 0.04);
      bar(tapes, deck.id, tx0, ty, tz0, tx0, ty, tz1, 0.04);
      bar(tapes, deck.id, tx1, ty, tz0, tx1, ty, tz1, 0.04);
    }
    const byFloor = new Map();
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      let list = byFloor.get(piece.y);
      if (!list) {
        list = [];
        byFloor.set(piece.y, list);
      }
      list.push(piece);
    }
    function bayPoint(piece) {
      const ladder = piece.ladder;
      const out = ladder ? 0.14 : 0.26;
      return [piece.x + 0.5 + piece.ox * out, piece.z + 0.5 + piece.oz * out];
    }
    byFloor.forEach(function (list) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          tier = MB.scaffoldTier(a.y);
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          if (dx !== 0 && dz !== 0) continue;
          const dist = Math.abs(dx) + Math.abs(dz);
          if (dist === 0 || dist > 2) continue;
          let blocked = false;
          for (let k = 0; k < list.length; k++) {
            const c = list[k];
            if (c === a || c === b) continue;
            if (a.x === b.x && c.x === a.x && c.z > Math.min(a.z, b.z) && c.z < Math.max(a.z, b.z)) blocked = true;
            if (a.z === b.z && c.z === a.z && c.x > Math.min(a.x, b.x) && c.x < Math.max(a.x, b.x)) blocked = true;
          }
          if (blocked) continue;
          const pa = bayPoint(a);
          const pb = bayPoint(b);
          const mx = (pa[0] + pb[0]) / 2;
          const mz = (pa[1] + pb[1]) / 2;
          const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
          stamp(rungs, a.id, mx, a.y + 1, mz, 0.026, len, 0.026, pb[0] - pa[0], 0, pb[1] - pa[1], b.id);
          if (a.y % 2 === 0) {
            stamp(braces, a.id, mx, a.y + 0.5, mz, 0.018, Math.hypot(pb[0] - pa[0], 1, pb[1] - pa[1]), 0.018, pb[0] - pa[0], 1, pb[1] - pa[1], b.id);
          }
        }
      }
    });
    const stripes = document.createElement('canvas');
    stripes.width = 4;
    stripes.height = 32;
    const stripePaint = stripes.getContext('2d');
    for (let band = 0; band < 8; band++) {
      stripePaint.fillStyle = band % 2 === 0 ? '#e8242a' : '#ffffff';
      stripePaint.fillRect(0, band * 4, 4, 4);
    }
    const stripeTex = new THREE.CanvasTexture(stripes);
    stripeTex.magFilter = THREE.NearestFilter;
    // Five types by height: wood, galvanised steel, blue frames, yellow system scaffolding, heavy dark
    // steel. Frame — poles, rungs, rails, posts, couplers; brace — the diagonals; deck — its floor.
    const floors = scaffoldFloorTextures();
    const looks = SCAFFOLD_LOOKS.map(function (look, i) {
      return {
        timber: !!look.timber,
        frame: new THREE.MeshStandardMaterial({ color: look.frame, roughness: look.rough, metalness: look.metal }),
        brace: new THREE.MeshStandardMaterial({ color: look.brace, roughness: 0.55, metalness: Math.min(0.3, look.metal) }),
        deck: new THREE.MeshStandardMaterial({ map: floors[i], color: 0xffffff, roughness: look.deckRough, metalness: look.deckMetal }),
      };
    });
    // Снег и мокрость на настилах, как на земле (weatherSurface): шапка на досках лесов.
    looks.forEach(function (set) { weatherSurface(set.deck, 0.9, -0.05); });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x6d7680, roughness: 0.6, metalness: 0.4 });
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1, metalness: 0 });
    const tapeMat = new THREE.MeshStandardMaterial({ map: stripeTex, color: 0xffffff, roughness: 0.7, metalness: 0,
      emissive: 0x401010, emissiveIntensity: 0.6 });
    function lookSet(tierIndex) {
      return looks[Math.min(looks.length, Math.max(1, tierIndex)) - 1];
    }
    function lookOf(kind, tierIndex) {
      if (kind === 'plate') return plateMat;
      return lookSet(tierIndex)[kind];
    }
    function hide(mesh, i) {
      mesh.setMatrixAt(i, hiddenScaffoldMatrix);
    }
    // One instanced mesh per kind and type. Every instance starts hidden (revealScaffold shows a built
    // piece) and white (paintScaffoldWear tints a worn one; `owner` — the piece whose wear it shows).
    // `bar`: a tube kind — the wooden type gets square timber (a 2×1×2 box, the same size as the tube).
    function makeInstances(geometry, kind, parts, bar) {
      const byTier = new Map();
      for (let i = 0; i < parts.length; i++) {
        if (!byTier.has(parts[i].tier)) byTier.set(parts[i].tier, []);
        byTier.get(parts[i].tier).push(parts[i]);
      }
      let first = true;
      byTier.forEach(function (list, tierIndex) {
        const timber = bar && lookSet(tierIndex).timber;
        const shape = timber ? new THREE.BoxGeometry(2, 1, 2) : first ? geometry : geometry.clone();
        if (!timber) first = false;
        const mesh = new THREE.InstancedMesh(shape, lookOf(kind, tierIndex), list.length);
        mesh.frustumCulled = false;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        for (let i = 0; i < list.length; i++) {
          const item = { mesh: mesh, index: i, matrix: list[i].matrix, owner: list[i].id };
          addLookup(scaffoldLookup, list[i].id, item);
          if (list[i].also) addLookup(scaffoldLookup, list[i].also, item);
          hide(mesh, i);
          mesh.setColorAt(i, WEAR_TINT.ok);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        levelRoot.add(mesh);
        scaffoldMeshes.push(mesh);
      });
    }
    // Wear marks: hidden until paintScaffoldWear shows them.
    function makeMarks(geometry, material, parts, lookup) {
      if (parts.length === 0) return;
      const mesh = new THREE.InstancedMesh(geometry, material, parts.length);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      for (let i = 0; i < parts.length; i++) {
        addLookup(lookup, parts[i].id, { mesh: mesh, index: i, matrix: parts[i].matrix });
        hide(mesh, i);
      }
      mesh.instanceMatrix.needsUpdate = true;
      levelRoot.add(mesh);
      scaffoldMeshes.push(mesh);
    }
    function addLookup(lookup, id, item) {
      let list = lookup.get(id);
      if (!list) {
        list = [];
        lookup.set(id, list);
      }
      list.push(item);
    }
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 6), 'frame', poles, true);
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 5), 'frame', rungs, true);
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 5), 'brace', braces, true);
    makeInstances(new THREE.BoxGeometry(1, 1, 1), 'plate', plates);
    makeInstances(new THREE.BoxGeometry(1, 1, 1), 'deck', planks);
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 5), 'frame', rails, true);
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 5), 'frame', posts, true);
    makeInstances(new THREE.SphereGeometry(1, 6, 5), 'frame', couplers);
    makeMarks(new THREE.BoxGeometry(1, 1, 1), crackMat, cracks, scaffoldCrackLookup);
    makeMarks(new THREE.CylinderGeometry(1, 1, 1, 6), tapeMat, tapes, scaffoldTapeLookup);
  }

  function ensurePour(block) {
    let record = pourViews.get(block.id);
    if (record) return record;
    const n = MB.pourGrid(block);
    const total = n * n * n;
    const span = pourSpan(block);
    const cell = span / n;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(cell * 0.92, cell * 0.92, cell * 0.92),
      blockSurface(block.materialId, false),
      total
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const origin = (1 - span) * 0.5;
    const support = pourSupport(block);
    for (let i = 0; i < total; i++) {
      const coord = pourCell(support, i, n);
      dummy.position.set(
        block.x + origin + (coord.x + 0.5) * cell,
        block.y + origin + (coord.y + 0.5) * cell,
        block.z + origin + (coord.z + 0.5) * cell
      );
      dummy.quaternion.identity();
      dummy.scale.setScalar(i < block.poured ? 1 : 0.001);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    levelRoot.add(mesh);
    record = { mesh: mesh, particles: n, block: block, support: support };
    pourViews.set(block.id, record);
    return record;
  }

  // A cube under construction grows out of what holds it: the floor (ground or a cube below), else a
  // built side neighbour, else the ceiling — never out of thin air. Same support rule as placing.
  function pourSupport(block) {
    if (block.y === 0 || supportsPour(block.x, block.y - 1, block.z)) return POUR_FLOOR;
    for (let i = 0; i < POUR_SIDES.length; i++) {
      const side = POUR_SIDES[i];
      if (supportsPour(block.x + side[0], block.y, block.z + side[2])) return side;
    }
    if (supportsPour(block.x, block.y + 1, block.z)) return POUR_CEILING;
    return POUR_FLOOR;
  }

  function supportsPour(x, y, z) {
    const block = world.blockByKey.get(MB.cellKey(x, y, z));
    return !!(block && block.built && Features.canSupportSolid(block));
  }

  // Mini-cube `index` of a pour: layers go away from the support, inside a side layer rows go bottom-up.
  function pourCell(support, index, n) {
    const c = MB.pourCoord(index, n);
    const far = n - 1 - c.y;
    if (support[1] !== 0) return { x: c.x, y: support[1] < 0 ? c.y : far, z: c.z };
    if (support[0] !== 0) return { x: support[0] < 0 ? c.y : far, y: c.z, z: c.x };
    return { x: c.x, y: c.z, z: support[2] < 0 ? c.y : far };
  }

  // A growing mini-cube rises from the face toward its support (floor, side or ceiling) and widens a
  // bit, so a cube being built never hangs in the air.
  // Window glass goes over its wall cube, a touch bigger so it shows.
  function pourSpan(block) {
    return block.glassOf !== undefined ? 1.02 : 0.96;
  }

  function setPourScale(record, block, index, scale) {
    const n = record.particles;
    const span = pourSpan(block);
    const cell = span / n;
    const origin = (1 - span) * 0.5;
    const support = record.support;
    const coord = pourCell(support, index, n);
    const shift = cell * 0.92 * 0.5;
    const grow = scale >= 1 ? 1 : Math.max(0.001, scale);
    dummy.position.set(
      block.x + origin + (coord.x + 0.5) * cell + support[0] * shift * (1 - grow),
      block.y + origin + (coord.y + 0.5) * cell + support[1] * shift * (1 - grow),
      block.z + origin + (coord.z + 0.5) * cell + support[2] * shift * (1 - grow)
    );
    dummy.quaternion.identity();
    const wide = grow < 0.01 ? 0.001 : 0.55 + 0.45 * grow;
    dummy.scale.set(support[0] ? grow : wide, support[1] ? grow : wide, support[2] ? grow : wide);
    dummy.updateMatrix();
    record.mesh.setMatrixAt(index, dummy.matrix);
    record.mesh.instanceMatrix.needsUpdate = true;
  }

  function clearPour(blockId) {
    const record = pourViews.get(blockId);
    if (!record) return;
    record.mesh.geometry.dispose();
    levelRoot.remove(record.mesh);
    pourViews.delete(blockId);
  }

  function updatePours() {
    if (!world) return;
    const active = new Set();
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'engineer' || builder.phase !== 'place') continue;
      const block = builder.carry[0];
      if (!block || block.poured >= MB.pourTotal(block)) continue;
      active.add(block.id);
      const record = ensurePour(block);
      // An instant pour («Оконщица») has no time at all: the mini-cube is simply full.
      const span = builder.actionT + builder.timer;
      setPourScale(record, block, block.poured, span > 0 ? builder.actionT / span : 1);
    }
    pourViews.forEach(function (record, blockId) {
      if (!active.has(blockId) && !record.block.built && record.block.poured === 0) clearPour(blockId);
    });
  }

  // A placed cube bumps once over its full size (its pours already grew it); off at ×5 and ×20.
  function popBlock(id) {
    if (timeScale !== 1 || pops.length >= 32 || !blockViews.has(id)) return;
    pops.push({ id: id, t: 0 });
  }

  function updatePops(dt) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const pop = pops[i];
      pop.t += timeScale > 1 ? 1 : dt;
      const record = blockViews.get(pop.id);
      const u = pop.t / 0.36;
      const settled = u >= 1 || !record;
      const scale = settled ? 1 : 1 + 0.12 * Math.sin(Math.PI * u) * (1 - 0.5 * u);
      if (record) setBlockVisualScale(record, scale, 0.001);
      if (settled) pops.splice(i, 1);
    }
  }

  function settleAcceleratedVisuals() {
    for (let i = 0; i < pops.length; i++) {
      setBlockVisualScale(blockViews.get(pops[i].id), 1, 0.001);
    }
    pops.length = 0;
    fx.clear();
    ghostMaterials.forEach(function (material) {
      material.opacity = 0.24;
    });
    workerPlan.traverse(function (object) {
      if (object.material) object.material.opacity = 0.25;
    });
    document.getElementById('coins').classList.remove('tick');
  }

  // Копия материала блока со своим onBeforeCompile и defines: Material.clone их не переносит, а без них
  // атлас фактуры (block-materials.js) растянулся бы на всю грань.
  function surfaceClone(material) {
    const copy = material.clone();
    copy.onBeforeCompile = material.onBeforeCompile;
    copy.defines = Object.assign({}, material.defines);
    return copy;
  }

  // Смена стройки: в кэше block-materials.js остаются крупные фактуры только её материалов (мелкие фактуры кубов
  // вне здания — blockSurface — живут всегда: они вчетверо легче).
  function keepBlockTextures(ids) {
    Blocks.keep(ids);
  }

  // Затенение в стыках: маска занятых клеток вокруг каждого блока здания (ниже земли — сплошное: нижний ряд
  // темнеет у земли, здание стоит, а не парит) и соседи по граням — второй канал.
  function refreshBlockAo() {
    aoDirty = false;
    if (!world) return;
    const index = world.index;
    const grid = world.solidGrid;
    for (let m = 0; m < solidMeshes.length; m++) {
      const blocks = solidMeshes[m].userData.blocks;
      const attr = solidMeshes[m].geometry.attributes.mbNb;
      if (!blocks || !attr) continue;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        let mask = 0;
        for (let k = 0; k < AO_NEIGHBORS.length; k++) {
          const d = AO_NEIGHBORS[k];
          const x = block.x + d[0];
          const y = block.y + d[1];
          const z = block.z + d[2];
          if (y < 0 || (index.inside(x, y, z) && grid[index.id(x, y, z)] === 1)) mask |= d[3];
        }
        let sides = 0;
        for (let k = 0; k < AO_SIDES.length; k++) {
          const d = AO_SIDES[k];
          const x = block.x + d[0];
          const y = block.y + d[1];
          const z = block.z + d[2];
          if (y < 0 || (index.inside(x, y, z) && grid[index.id(x, y, z)] === 1)) sides |= 1 << k;
        }
        attr.array[i * 2] = mask;
        attr.array[i * 2 + 1] = sides;
      }
      attr.needsUpdate = true;
    }
    MicroBuildersQuarry.occlusion(index, grid);
  }

  // Раз в кадр: изменилось число непоставленных — пересчёт яруса; мерцание клеток, к которым несут блок.
  function updateGhosts() {
    if (!world || !ghostGlass) return;
    if (world.remaining !== ghostRemaining) {
      ghostRemaining = world.remaining;
      refreshGhosts();
    }
    updateGhostDensity();
  }

  // Ярус, который сейчас строят (высота блока-фокуса — самый ранний готовый к укладке), — рамка и еле заметное
  // стекло; остальные непоставленные блоки — бледный силуэт цели: с первых секунд видно, что строим.
  // Двери и окна — только на ярусе.
  function refreshGhosts() {
    if (!world || !ghostGlass) return;
    const focus = MB.focusBlock(world);
    const tier = focus ? focus.y : -1;
    closeTier(tier);
    if (tier === ghostTier) return;
    ghostTier = tier;
    ghostBlocks = [];
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      const record = blockViews.get(block.id);
      if (!record) continue;
      const shown = !block.built && tier >= 0;
      if (record.ghost) {
        setInstanceScale(record.ghost, record.ghostIndex, shown ? 1 : 0.001);
        if (shown) ghostBlocks.push(block);
      }
      if (record.ghostObject) record.ghostObject.visible = ghostsOn && shown && block.y === tier;
    }
    ghostKinds = new Uint8Array(ghostBlocks.length);
    for (let i = 0; i < ghostBlocks.length; i++) ghostKinds[i] = paintGhost(ghostBlocks[i]);
  }

  // Ярус закрыт: фокус стройки ушёл выше, и все блоки прежнего яруса стоят. Кромка яруса вспыхивает,
  // по низу идёт волна пыли, камера чуть вздрагивает. Только читает мир.
  function closeTier(tier) {
    const prev = fxTier;
    fxTier = tier;
    if (prev < 0 || tier <= prev || timeScale === 20) return;
    const list = [];
    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.y !== prev || b.feature) continue;
      if (!b.built) return;
      for (let d = 0; d < 4; d++) {
        const nx = d === 0 ? 1 : d === 1 ? -1 : 0;
        const nz = d === 2 ? 1 : d === 3 ? -1 : 0;
        if (world.blockByKey.has(MB.cellKey(b.x + nx, prev, b.z + nz))) continue;
        list.push(b.x + 0.5 + nx * 0.5, b.z + 0.5 + nz * 0.5, nx, nz);
      }
    }
    const f = world.level.footprint;
    fx.tier(list, prev, (f.minX + f.maxX) / 2 + 0.5, (f.minZ + f.maxZ) / 2 + 0.5);
    shake(0.3);
    sfx('tier');
  }

  // Тряска камеры (сила 0…1): сдвиг кадра гаснет за ~0,5 с; на ×5 и выше и в городе её нет.
  function shake(power) {
    if (timeScale >= 5) return;
    shakeAmp = Math.max(shakeAmp, power);
    shakeT = 0;
  }

  function applyShake(dt) {
    if (shakeAmp <= 0) return;
    shakeT += dt;
    const k = shakeAmp * Math.exp(-shakeT * 7);
    if (k < 0.01 || cityRoot.visible) {
      shakeAmp = 0;
      return;
    }
    const info = cameraController.getBounds();
    const d = (info ? info.radius : 10) * 0.012;
    camera.position.x += Math.sin(shakeT * 61) * k * d;
    camera.position.y += Math.sin(shakeT * 47 + 1.3) * k * d * 0.7;
  }

  // Поза рабочего или машины на земле для следов (art/ambient.js): дроны и вертолёты в воздухе — следов нет.
  const ambientEnv = { wet: 0, dust: 0, night: 0 };
  function groundPose(entity, out) {
    const t = entity.segmentT;
    out[0] = entity.from[0] + (entity.to[0] - entity.from[0]) * t;
    out[1] = entity.kind === 'heli' || entity.trade === 'engineer' ? 9 : entity.from[1] + (entity.to[1] - entity.from[1]) * t;
    out[2] = entity.from[2] + (entity.to[2] - entity.from[2]) * t;
    return out;
  }

  // Финал (сдача): три залпа конфетти, флажок на вершине, волна блеска снизу вверх, тряска и аккорд.
  function celebrate() {
    if (!world || timeScale === 20) return;
    const f = world.level.footprint;
    const radius = Math.max(f.maxX - f.minX, f.maxZ - f.minZ) / 2 + 1;
    const cx = (f.minX + f.maxX) / 2 + 0.5;
    const cz = (f.minZ + f.maxZ) / 2 + 0.5;
    fx.confetti(cx, f.maxY + 1.5, cz, radius);
    // Древко — на самом высоком блоке, ближайшем к центру.
    let top = null;
    let best = Infinity;
    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (!b.built) continue;
      const score = -b.y * 1000 + Math.abs(b.x + 0.5 - cx) + Math.abs(b.z + 0.5 - cz);
      if (score < best) {
        best = score;
        top = b;
      }
    }
    if (top) fx.flag(top.x + 0.5, top.y + 1, top.z + 0.5, Math.min(2.5, Math.max(1, radius / 5)));
    glintT = 0;
    cheerT = CHEER;
    shake(0.6);
    sfx('complete');
  }

  // Волна блеска по зданию снизу вверх один раз при сдаче; на ×20 её нет. Только вид.
  function updateGlint(dt) {
    if (glintT < 0 || !world) return;
    glintT = timeScale === 20 ? 99 : glintT + dt;
    Blocks.glint((glintT - GLINT_START) / GLINT_SWEEP, world.level.footprint);
    if (glintT > GLINT_START + GLINT_SWEEP) {
      glintT = -1;
      Blocks.glint(-1, world.level.footprint);
    }
  }

  function ghostKind(block) {
    return block.reserved || block.owner !== -1 ? 1 : block.y === ghostTier ? 0 : 2;
  }

  function ghostNeighbor(block, d) {
    const x = block.x + d[0];
    const y = block.y + d[1];
    const z = block.z + d[2];
    if (!world.index.inside(x, y, z)) return null;
    const nb = world.blockGrid[world.index.id(x, y, z)];
    return nb && !nb.built && !nb.feature ? nb : null;
  }

  // Вид и маска соседей своей группы (ярус или силуэт) — в цвет экземпляра призрака; возвращает вид.
  function paintGhost(block) {
    const kind = ghostKind(block);
    const tierCell = block.y === ghostTier;
    let mask = 0;
    for (let i = 0; i < GHOST_NB.length; i++) {
      const nb = ghostNeighbor(block, GHOST_NB[i]);
      if (nb && (nb.y === ghostTier) === tierCell) mask |= GHOST_NB[i][3];
    }
    const record = blockViews.get(block.id);
    record.ghost.setColorAt(record.ghostIndex, ghostData.setRGB(kind, mask, 0));
    record.ghost.instanceColor.needsUpdate = true;
    return kind;
  }

  // Кроме ×20; только читает мир. Клетка, к которой несут блок (бронь рабочего или машины), мерцает своим кубом;
  // блок встал — соседям пересчитываем маску, чтобы рамка группы сомкнулась вокруг него.
  function updateGhostDensity() {
    if (timeScale === 20) return;
    ghostGlass.userData.time.value = performance.now() / 1000;
    for (let i = 0; i < ghostBlocks.length; i++) {
      const block = ghostBlocks[i];
      if (ghostKinds[i] === 3) continue;
      if (block.built) {
        ghostKinds[i] = 3;
        for (let k = 0; k < GHOST_NB.length; k++) {
          const nb = ghostNeighbor(block, GHOST_NB[k]);
          if (nb) paintGhost(nb);
        }
        continue;
      }
      if (ghostKind(block) !== ghostKinds[i]) ghostKinds[i] = paintGhost(block);
    }
  }

  function setBlockVisualScale(record, solidScale, ghostScale) {
    // Set glass turns its wall cube into the window: the cube itself goes.
    if (record.wall && solidScale >= 1) setInstanceScale(record.wall.solid, record.wall.index, 0.001);
    if (record.solid) setInstanceScale(record.solid, record.index, solidScale);
    if (record.ghost) setInstanceScale(record.ghost, record.ghostIndex, ghostScale);
    if (record.feature) record.feature.scale.setScalar(solidScale);
    if (record.ghostObject) record.ghostObject.scale.setScalar(ghostScale);
  }

  function setInstanceScale(mesh, index, scale) {
    mesh.getMatrixAt(index, dummy.matrix);
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Крошка из общего пула (art/fx.js); зовут укладка машин, леса и молния.
  function burst(x, y, z, color, count) {
    if (timeScale === 20) return;
    fx.chips(x, y, z, color, count);
  }

  // ---- climbing onto and off a cube (MB.builderPosition modes 'climb' / 'descend', c = 0..1) ----

  function climbStage(c, from, to) {
    const t = Math.min(1, Math.max(0, (c - from) / (to - from)));
    return t * t * (3 - 2 * t);
  }

  // Share of the step's height reached at c going up: a short reach (barely rising), the pull-up,
  // then the step over the edge.
  function climbLift(c) {
    return 0.04 * climbStage(c, 0, 0.2) + 0.86 * climbStage(c, 0.2, 0.78) + 0.1 * climbStage(c, 0.78, 1);
  }

  // A little crouch before the pull-up.
  function climbDip(c) {
    return -0.06 * Math.sin(Math.PI * Math.min(1, c / 0.2));
  }

  // Jumping off a cube: a crouch (0–0.25), then a parabola from the edge with a small hop up
  // (apex 0.15) to the landing at 0.85, then the knees give (0.85–1). Height relative to the start (dy < 0).
  function jumpHeight(c, dy) {
    if (c <= 0.25) return 0;
    if (c >= 0.85) return dy;
    const apex = 0.15;
    const q = (c - 0.25) / 0.6;
    const b = 2 * apex + Math.sqrt(4 * apex * apex - 4 * apex * dy);
    return (dy - b) * q * q + b * q;
  }

  function jumpDip(c) {
    if (c < 0.25) return -0.12 * climbStage(c, 0, 0.25);
    if (c < 0.32) return -0.12 * (1 - climbStage(c, 0.25, 0.32));
    if (c < 0.85) return 0;
    return -0.14 * Math.sin(Math.PI * (c - 0.85) / 0.15);
  }

  // The jump's body: knees bend and arms swing back, the push-off straightens him with the arms
  // swinging up, legs tuck a little in the air and reach for the ground, the landing bends the knees.
  function poseJumpDown(group, c) {
    const crouch = climbStage(c, 0, 0.25);
    const push = climbStage(c, 0.25, 0.36);
    const air = climbStage(c, 0.36, 0.85);
    const land = c > 0.85 ? Math.sin(Math.PI * (c - 0.85) / 0.15) : 0;
    const legs = -1.0 * crouch * (1 - push) - 0.5 * push * (1 - air) - 0.2 * air - 0.9 * land;
    group.userData.leftLeg.rotation.x = legs - 0.15 * push * (1 - air);
    group.userData.rightLeg.rotation.x = legs + 0.15 * push * (1 - air);
    const arms = 0.6 * crouch * (1 - push) - 1.8 * push * (1 - air) - 1.2 * air * (1 - land) - 0.7 * land;
    group.userData.rightArm.rotation.x = arms;
    group.userData.leftArm.rotation.x = arms;
    group.rotation.x = 0.3 * crouch * (1 - push) + 0.08 + 0.22 * land;
  }

  // Up a cube face: both hands go up onto the edge, he pulls himself up with a knee over the edge
  // and the arms pushing down, then the trailing leg steps up and he straightens.
  function poseClimbUp(group, c) {
    const reach = climbStage(c, 0, 0.2);
    const pull = climbStage(c, 0.2, 0.78);
    const mount = climbStage(c, 0.78, 1);
    const arms = -1 - 1.9 * reach + 2.3 * pull + 0.3 * mount;
    group.userData.rightArm.rotation.x = arms - 0.12 * reach * (1 - pull);
    group.userData.leftArm.rotation.x = arms + 0.12 * reach * (1 - pull);
    group.userData.rightLeg.rotation.x = -0.4 * reach * (1 - pull) - 1.6 * pull * (1 - mount);
    group.userData.leftLeg.rotation.x = 0.25 * pull * (1 - mount) - 1.0 * Math.sin(Math.PI * mount);
    group.rotation.x = 0.06 + 0.12 * reach * (1 - pull) + 0.3 * pull * (1 - mount);
  }

  // The cube in a placing worker's hands shrinks as the cube he builds grows, and crumbles into
  // mini-cubes flying over (none at ×20, where the fill is instant anyway).
  function updateHandCube(viewState, builder, group, dt) {
    const hand = group.userData.hand;
    const block = builder.phase === 'place' ? builder.carry[0] : null;
    if (!block || block.built) {
      hand.visible = false;
      return;
    }
    const total = MB.pourTotal(block);
    const step = builder.actionT + builder.timer > 0 ? builder.actionT / (builder.actionT + builder.timer) : 0;
    const left = 1 - Math.min(1, (block.poured + step) / total);
    const size = MB.MATERIAL[block.materialId].grid >= 2 ? 0.3 : 0.26;
    hand.visible = left > 0.02;
    if (hand.material !== blockSurface(block.materialId, false)) hand.material = blockSurface(block.materialId, false);
    hand.scale.setScalar(size * (0.25 + 0.75 * left));
    if (timeScale === 20 || dt <= 0 || !levelRoot.visible) return;
    viewState.flyClock = (viewState.flyClock || 0) + dt;
    if (viewState.flyClock < 0.09) return;
    viewState.flyClock = 0;
    // From the hands (0.42 up, 0.3 ahead, × the figure scale) to the mini-cube being poured.
    const yaw = group.rotation.y;
    const n = MB.pourGrid(block);
    const pour = pourViews.get(block.id);
    const support = pour ? pour.support : POUR_FLOOR;
    const coord = pourCell(support, Math.min(block.poured, total - 1), n);
    const cell = 0.96 / n;
    // Aim at the part of the mini-cube next to its support.
    const aim = function (k) { return support[k] ? 0.5 + 0.2 * support[k] : 0.2 + Math.random() * 0.6; };
    emitFlyCube(
      group.position.x + Math.sin(yaw) * 0.3 * group.scale.x, group.position.y + 0.42 * group.scale.x, group.position.z + Math.cos(yaw) * 0.3 * group.scale.x,
      block.x + 0.02 + (coord.x + aim(0)) * cell,
      block.y + 0.02 + (coord.y + aim(1)) * cell,
      block.z + 0.02 + (coord.z + aim(2)) * cell,
      MB.MATERIAL[block.materialId].color
    );
  }

  function emitFlyCube(x0, y0, z0, x1, y1, z1, color) {
    if (!flyMesh) {
      flyMesh = new THREE.InstancedMesh(carryGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }), FLY_SLOTS);
      flyMesh.frustumCulled = false;
      dummy.position.set(0, -50, 0);
      dummy.quaternion.identity();
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      for (let i = 0; i < FLY_SLOTS; i++) {
        flyMesh.setMatrixAt(i, dummy.matrix);
        flyMesh.setColorAt(i, flyColor.setHex(0xffffff));
        flyCubes.push({ life: 0, x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, spin: 0 });
      }
      scene.add(flyMesh);
    }
    let slot = -1;
    for (let i = 0; i < FLY_SLOTS; i++) {
      if (flyCubes[i].life <= 0) {
        slot = i;
        break;
      }
    }
    if (slot < 0) return;
    const fly = flyCubes[slot];
    fly.life = 1;
    fly.x0 = x0; fly.y0 = y0; fly.z0 = z0;
    fly.x1 = x1; fly.y1 = y1; fly.z1 = z1;
    fly.spin = Math.random() * 6;
    flyMesh.setColorAt(slot, flyColor.setHex(color));
    flyMesh.instanceColor.needsUpdate = true;
  }

  // Each flight lasts 0.3 s along a low arc and shrinks as it lands.
  function updateFlyCubes(dt) {
    if (!flyMesh) return;
    let changed = false;
    for (let i = 0; i < FLY_SLOTS; i++) {
      const fly = flyCubes[i];
      if (fly.life <= 0) continue;
      fly.life -= timeScale === 20 ? 1 : dt / 0.3;
      const u = 1 - Math.max(0, fly.life);
      if (fly.life <= 0) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0.001);
      } else {
        dummy.position.set(
          fly.x0 + (fly.x1 - fly.x0) * u,
          fly.y0 + (fly.y1 - fly.y0) * u + Math.sin(Math.PI * u) * 0.35,
          fly.z0 + (fly.z1 - fly.z0) * u
        );
        dummy.scale.setScalar(0.085 * (1 - 0.45 * u));
      }
      dummy.rotation.set(fly.spin * u, fly.spin * u * 0.7, 0);
      dummy.updateMatrix();
      flyMesh.setMatrixAt(i, dummy.matrix);
      changed = true;
    }
    dummy.rotation.set(0, 0, 0); // dummy is shared: other users expect no rotation
    if (changed) flyMesh.instanceMatrix.needsUpdate = true;
    flyMesh.visible = levelRoot.visible;
  }

  // «Айда курить!»: a ring on the caller's floor grows out to the call radius and fades; a puff of
  // smoke over his head. Whoever heard it shows the smoke icon until he goes.
  function onSmokeCall(event) {
    if (currentScreen !== 'build') return;
    burst(event.x + 0.5, event.y + 1.5, event.z + 0.5, 0xe9e4da, 4);
    let ring = callRings.find(function (item) { return item.life <= 0; });
    if (!ring) {
      if (callRings.length >= 10) return;
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1, 48),
        new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 3;
      scene.add(mesh);
      ring = { mesh: mesh, life: 0, radius: 1 };
      callRings.push(ring);
    }
    ring.life = 1;
    ring.radius = event.radius;
    ring.mesh.position.set(event.x + 0.5, event.y + 0.06, event.z + 0.5);
    ring.mesh.scale.setScalar(0.3);
    ring.mesh.visible = true;
  }

  function updateCallRings(dt) {
    for (let i = 0; i < callRings.length; i++) {
      const ring = callRings[i];
      if (ring.life <= 0) continue;
      ring.life -= dt / 0.9;
      if (ring.life <= 0 || !levelRoot.visible) {
        ring.life = 0;
        ring.mesh.visible = false;
        continue;
      }
      const t = 1 - ring.life;
      ring.mesh.scale.setScalar(0.3 + (ring.radius - 0.3) * (1 - Math.pow(1 - t, 2)));
      ring.mesh.material.opacity = 0.75 * ring.life;
    }
  }

  function updateSparks(dt) {
    fx.update(dt);
  }

  // ---- lightning (a storm's strike, MB.strikeLightning → the 'lightning' event) ----
  // The bolt: a jagged white-blue line from the clouds into the top of the struck cube, with a
  // couple of branches; it flickers and is gone in half a second, the sky flashes with it. Every
  // knocked-out cube cracks into 2×2×2 pieces glowing hot along the cracks, then they burst away
  // from the strike with some chips, tumble, bounce off the ground or the roof and shrink away. The
  // cubes are back as ghosts of the plan at once. Real time, so it reads at any speed.

  function lightningMeshes() {
    if (lightningFx.bolt) return;
    const geometry = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    function make(color, opacity) {
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }), BOLT_SEGMENTS);
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    }
    lightningFx.bolt = make(0xf2f6ff, 1);
    lightningFx.glow = make(0x7f9dff, 0.35);
    const shards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), SHARD_LIMIT);
    shards.castShadow = true;
    shards.frustumCulled = false;
    shards.count = 0;
    dummy.position.set(0, -50, 0);
    dummy.scale.setScalar(0.001);
    dummy.quaternion.identity();
    dummy.updateMatrix();
    for (let i = 0; i < SHARD_LIMIT; i++) {
      shards.setMatrixAt(i, dummy.matrix);
      shards.setColorAt(i, SHARD_HOT);
    }
    scene.add(shards);
    lightningFx.shardMesh = shards;
  }

  // The bolt's points: from high above, a little off to the side, down to (x, y, z), split in halves
  // with the middle pushed aside (less at every split).
  function boltPath(x, y, z, height, spread) {
    let points = [new THREE.Vector3(x + (Math.random() - 0.5) * spread, y + height, z + (Math.random() - 0.5) * spread), new THREE.Vector3(x, y, z)];
    let push = height * 0.16;
    for (let level = 0; level < 5; level++) {
      const next = [points[0]];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        next.push(new THREE.Vector3(
          (a.x + b.x) / 2 + (Math.random() - 0.5) * push,
          (a.y + b.y) / 2 + (Math.random() - 0.5) * push * 0.3,
          (a.z + b.z) / 2 + (Math.random() - 0.5) * push
        ), b);
      }
      points = next;
      push *= 0.55;
    }
    return points;
  }

  function setBoltSegments(lines) {
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    let n = 0;
    lines.forEach(function (line) {
      for (let i = 1; i < line.points.length && n < BOLT_SEGMENTS; i++) {
        const a = line.points[i - 1];
        const b = line.points[i];
        dir.subVectors(b, a);
        const length = dir.length();
        if (length < 1e-4) continue;
        dummy.position.addVectors(a, b).multiplyScalar(0.5);
        dummy.quaternion.setFromUnitVectors(up, dir.multiplyScalar(1 / length));
        dummy.scale.set(line.width, length, line.width);
        dummy.updateMatrix();
        lightningFx.bolt.setMatrixAt(n, dummy.matrix);
        dummy.scale.set(line.width * 4, length, line.width * 4);
        dummy.updateMatrix();
        lightningFx.glow.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
    });
    lightningFx.bolt.count = n;
    lightningFx.glow.count = n;
    lightningFx.bolt.instanceMatrix.needsUpdate = true;
    lightningFx.glow.instanceMatrix.needsUpdate = true;
  }

  function onLightning(event) {
    lightningMeshes();
    const target = event.block;
    const x = target.x + 0.5;
    const y = target.y + 1;
    const z = target.z + 0.5;
    // The cubes go back into the plan: ghosts again, no pour, no see-through copy.
    event.blocks.forEach(function (block) {
      clearPour(block.id);
      cubeCoins.delete(block.id);
      const entry = xray.hidden.get(block);
      if (entry) {
        levelRoot.remove(entry.mesh);
        entry.mesh.material.dispose();
        xray.hidden.delete(block);
      }
      for (let i = pops.length - 1; i >= 0; i--) if (pops[i].id === block.id) pops.splice(i, 1);
      const record = blockViews.get(block.id);
      if (record) setBlockVisualScale(record, 0.001, 1);
      shatterCube(block, x, y - 0.5, z);
    });
    // The bolt with two branches off its lower half.
    const main = boltPath(x, y, z, 34, 10);
    const lines = [{ points: main, width: 0.07 }];
    for (let b = 0; b < 2; b++) {
      const from = main[Math.floor(main.length * (0.35 + Math.random() * 0.4))];
      const end = new THREE.Vector3(from.x + (Math.random() - 0.5) * 9, Math.max(y + 1, from.y - 4 - Math.random() * 6), from.z + (Math.random() - 0.5) * 9);
      const branch = boltPath(end.x, end.y, end.z, from.y - end.y, 0);
      branch[0] = from;
      lines.push({ points: branch.slice(0, 1 + Math.floor(branch.length * 0.7)), width: 0.035 });
    }
    setBoltSegments(lines);
    lightningFx.boltAge = 0;
    weatherView.flash = 1;
    weatherView.lastFlash = clock.elapsedTime;
    burst(x, y + 0.1, z, 0xfff1b8, 16);
    if (timeScale !== 20) {
      tone(1400, 0.05);
      tone(58, 0.9);
    }
    const count = event.blocks.length;
    UI.toast({
      text: 'Молния выбила ' + count + ' ' + UI.plural(count, 'куб', 'куба', 'кубов') + ' — они снова в плане',
      icon: 'storm',
      tone: 'warn',
      priority: 1,
      key: 'lightning',
    });
  }

  // 2×2×2 pieces of the cube where they sit, plus a few chips; each flies off on its own once the
  // crack has opened.
  function shatterCube(block, sx, sy, sz) {
    const color = new THREE.Color(MB.MATERIAL[block.materialId].color);
    const cx = block.x + 0.5;
    const cy = block.y + 0.5;
    const cz = block.z + 0.5;
    const away = new THREE.Vector3(cx - sx, cy - sy, cz - sz);
    if (away.lengthSq() < 1e-6) away.set(Math.random() - 0.5, 0.3, Math.random() - 0.5);
    away.normalize();
    for (let i = 0; i < 12; i++) {
      const piece = i < 8;
      const ox = piece ? ((i & 1) ? 0.24 : -0.24) : (Math.random() - 0.5) * 0.8;
      const oy = piece ? ((i & 2) ? 0.24 : -0.24) : (Math.random() - 0.5) * 0.8;
      const oz = piece ? ((i & 4) ? 0.24 : -0.24) : (Math.random() - 0.5) * 0.8;
      const kick = 2.2 + Math.random() * 2.4;
      addShard({
        x: cx + ox, y: cy + oy, z: cz + oz,
        ox: ox, oy: oy, oz: oz,
        vx: away.x * kick + ox * 5 + (Math.random() - 0.5) * 1.5,
        vy: 2.5 + Math.random() * 3 + Math.max(0, away.y) * kick + oy * 3,
        vz: away.z * kick + oz * 5 + (Math.random() - 0.5) * 1.5,
        size: piece ? 0.44 : 0.1 + Math.random() * 0.12,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        spin: (piece ? 4 : 9) * (0.5 + Math.random()),
        angle: 0,
        age: -Math.random() * 0.05,
        life: SHARD_LIFE * (0.8 + Math.random() * 0.4),
        color: color,
        rest: false,
      });
    }
  }

  function addShard(shard) {
    const list = lightningFx.shards;
    if (list.length >= SHARD_LIMIT) list.shift();
    list.push(shard);
  }

  // Top of what is under (x, z) at height y: a built solid cube or the ground.
  function shardFloor(x, y, z) {
    if (!world) return 0;
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    for (let cy = Math.min(Math.floor(y), world.index.maxY); cy >= 0; cy--) {
      if (!world.index.inside(cx, cy, cz)) continue;
      if (world.solidGrid[world.index.id(cx, cy, cz)] === 1) return cy + 1;
    }
    return 0;
  }

  function updateLightningFx(dt) {
    if (!lightningFx.bolt) return;
    if (lightningFx.boltAge < 1) {
      lightningFx.boltAge += dt;
      const t = lightningFx.boltAge;
      const k = t < 0.07 ? 1 : t < 0.13 ? 0.25 : t < 0.22 ? 0.95 : Math.max(0, 1 - (t - 0.22) / 0.3);
      lightningFx.bolt.visible = k > 0;
      lightningFx.glow.visible = k > 0;
      lightningFx.bolt.material.opacity = k;
      lightningFx.glow.material.opacity = 0.35 * k;
    }
    const list = lightningFx.shards;
    const mesh = lightningFx.shardMesh;
    if (!list.length && mesh.count === 0) return;
    const color = new THREE.Color();
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const shard = list[i];
      shard.age += dt;
      if (shard.age >= shard.life) continue;
      const crack = Math.max(0, Math.min(1, shard.age / SHARD_CRACK));
      let px = shard.x;
      let py = shard.y;
      let pz = shard.z;
      if (shard.age < SHARD_CRACK) {
        // The crack opens: the pieces part a little where they sit.
        px += shard.ox * 0.25 * crack;
        py += shard.oy * 0.25 * crack;
        pz += shard.oz * 0.25 * crack;
      } else if (!shard.rest) {
        const step = Math.min(dt, 0.05);
        shard.vy -= 15 * step;
        shard.x += shard.vx * step;
        shard.y += shard.vy * step;
        shard.z += shard.vz * step;
        shard.angle += shard.spin * step;
        const floor = shardFloor(shard.x, shard.y + shard.size, shard.z) + shard.size / 2;
        if (shard.y < floor && shard.vy < 0) {
          shard.y = floor;
          shard.vy = -shard.vy * 0.32;
          shard.vx *= 0.55;
          shard.vz *= 0.55;
          shard.spin *= 0.5;
          if (Math.abs(shard.vy) < 0.6) shard.rest = true;
        }
        px = shard.x;
        py = shard.y;
        pz = shard.z;
      }
      const fade = Math.min(1, (shard.life - shard.age) / 0.6);
      dummy.position.set(px, py, pz);
      dummy.quaternion.setFromAxisAngle(shard.axis, shard.angle);
      dummy.scale.setScalar(Math.max(0.001, shard.size * fade));
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      // Hot along the cracks, cooling down as it flies.
      const heat = Math.max(0, 1 - Math.max(0, shard.age - SHARD_CRACK * 0.5) / 0.5);
      color.copy(shard.color).lerp(SHARD_HOT, heat * 0.85);
      mesh.setColorAt(n, color);
      n += 1;
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].age >= list[i].life) list.splice(i, 1);
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // Session HUD (docs/gdd/16-ux-flow.md §5): every 0.25 s from frame() (`fromTick`) and right after
  // any change. Away from the site (HQ, panels) only the nav and the site state are painted (the
  // panels and the HQ have their own wallets); the dock is rebuilt only when hudDirty or the coins
  // crossed a card price.
  function paintHud(fromTick) {
    if (!fromTick) hudDirty = true;
    refreshNav();
    paintSiteState();
    if (currentScreen !== 'build') {
      hudDirty = true; // the dock is rebuilt on the way back
      return;
    }
    const level = world.level;
    const total = level.blocks.length;
    const done = total - world.remaining;
    if (campaign.status !== 'title') applyEnvironmentView(Meta.applyEnvironment(meta, campaign));
    paintLevelStrip(level, done, total);
    paintDayClock();
    paintCoinRate();
    paintMana();
    paintTokens();
    paintCampButton();
    paintIntroHud();
    paintLossStrip();
    if (!fromTick) snapCoins();
    setText('total-time', UI.formatDuration(campaign.totalElapsed));
    paintDock();
    const pick = document.getElementById('level-pick');
    const wanted = String(level.index);
    if (pick.value !== wanted) pick.value = wanted;
    document.getElementById('level-prev').disabled = level.index === 0;
    document.getElementById('level-next').disabled = level.index === MB.LEVELS.length - 1;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el.textContent !== text) el.textContent = text;
  }

  // Short money for HUD captions: «840», «1,2 тыс», «24 тыс», then formatCompact («3,2 млн»).
  function formatShort(value) {
    const number = Math.round(value);
    if (number < 1000 || number >= 1e4) return formatCompact(number);
    return (number / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '') + ' тыс';
  }

  // ---- coins: counter tween, «+1 240» once a second, «−1,2 тыс» on a purchase, the rate ----

  // Every frame: the counter runs to campaign.coins in 0.4 s and gains add up into one «+N» per
  // second. A drop (a purchase, another site) snaps at once.
  function tickHudFx(dt) {
    if (!campaign || !world) return;
    const c = hudCoins;
    const coins = campaign.coins;
    if (c.campaign !== campaign) {
      snapCoins();
      return;
    }
    if (coins < c.to) {
      snapCoins();
    } else if (coins > c.to) {
      if (c.gain === 0) c.gainSince = 0;
      c.gain += coins - c.to;
      c.from = c.shown;
      c.to = coins;
      c.t = 0;
    }
    if (c.t < 1 && dt > 0) {
      c.t = Math.min(1, c.t + dt / 0.4);
      const k = 1 - Math.pow(1 - c.t, 3);
      c.shown = c.from + (c.to - c.from) * k;
      paintCoinValue();
    }
    if (c.gain > 0) {
      c.gainSince += dt;
      if (c.gainSince >= 1) {
        // Gains are shown where they are earned (the «+N» over the cubes and the coins flying up),
        // not repeated under the pill.
        c.gain = 0;
      }
    }
  }

  // An explicit repaint shows the exact coins (gains already counted keep their «+N»).
  function snapCoins() {
    const c = hudCoins;
    if (!campaign) return;
    if (c.campaign !== campaign) c.gain = 0;
    else if (campaign.coins > c.to) c.gain += campaign.coins - c.to;
    c.campaign = campaign;
    c.shown = c.from = c.to = campaign.coins;
    c.t = 1;
    paintCoinValue();
  }

  function paintCoinValue() {
    setText('coin-value', formatCompact(hudCoins.shown));
  }

  // The pill pops on income, at most 4 times a second, as a Web Animation (no forced reflow).
  function pulseCoins() {
    const now = performance.now();
    if (now - hudCoins.pulseAt < 250) return;
    hudCoins.pulseAt = now;
    const coins = document.getElementById('coins');
    if (coins.animate) {
      coins.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
    }
  }

  // «+1 240» / «−1,2 тыс» floating out under the coin pill (at most three at a time); `hostId` —
  // another wallet's float spot ('wallet-fx' under the HQ panel wallet).
  function floatCoins(text, kind, hostId) {
    const host = document.getElementById(hostId || 'coin-fx');
    if (!host) return;
    if (hostId === 'wallet-fx') {
      // Under the capital pill of the panel wallet (both sit in the panel head).
      const pill = document.querySelector('#panel-wallet .pill');
      if (!pill) return;
      host.style.left = (pill.offsetLeft + 26) + 'px';
      host.style.top = (pill.offsetTop + pill.offsetHeight + 4) + 'px';
    }
    const tag = document.createElement('span');
    tag.className = 'coin-float ' + kind;
    tag.textContent = text;
    host.appendChild(tag);
    while (host.childNodes.length > 3) host.removeChild(host.firstChild);
    if (!tag.animate) {
      setTimeout(function () { tag.remove(); }, 1000);
      return;
    }
    // Gains rise, spends sink.
    const from = kind === 'spend' ? -4 : 8;
    const to = kind === 'spend' ? 14 : -10;
    const anim = tag.animate([
      { opacity: 0, transform: 'translateY(' + from + 'px) scale(0.9)' },
      { opacity: 1, transform: 'translateY(' + (from * 0.6 + to * 0.4) + 'px) scale(1.06)', offset: 0.18 },
      { opacity: 1, transform: 'translateY(' + (from * 0.2 + to * 0.8) + 'px) scale(1)', offset: 0.7 },
      { opacity: 0, transform: 'translateY(' + to + 'px) scale(1)' },
    ], { duration: kind === 'spend' ? 1200 : 1000, easing: 'ease-out' });
    anim.onfinish = function () { tag.remove(); };
  }

  // «+2,4 тыс/мин»: pay over the last minute of level time; until 15 s of history exist, the
  // session simulator's estimate for the current upgrades.
  function paintCoinRate() {
    const rate = coinRate;
    const now = campaign.levelElapsed;
    const earned = campaign.coinsEarned || 0;
    const samples = rate.samples;
    if (rate.campaign !== campaign || (samples.length && now < samples[samples.length - 1].t)) {
      rate.campaign = campaign;
      samples.length = 0;
    }
    const last = samples[samples.length - 1];
    if (!last || now - last.t >= 1) samples.push({ t: now, e: earned });
    while (samples.length > 2 && now - samples[1].t >= 60) samples.shift();
    const first = samples[0];
    let perMinute = 0;
    if (first && now - first.t >= 15) perMinute = (earned - first.e) / (now - first.t) * 60;
    else if (simEstimate && campaign.status === 'play') perMinute = simEstimate.coinsPerMinute;
    const text = perMinute >= 1 ? '+' + formatShort(perMinute) + '/мин' : '';
    if (text !== rate.text) {
      rate.text = text;
      setText('coin-rate', text);
    }
  }

  // ---- the level strip: «Ур. 7 · Медный знак», crew, progress with chests, floors and cubes ----

  function paintLevelStrip(level, done, total) {
    const mode = campaign.runMode;
    let kicker = '';
    let urgent = false;
    if (timedMode(mode)) {
      const left = Math.max(0, trialLimit(campaign) - campaign.levelElapsed);
      kicker = (mode === 'school' ? 'Школа · ступень ' + campaign.runPayload.tier : 'Контракт') + ' · осталось ' + MB.formatClock(Math.ceil(left));
      urgent = left < 60;
      if (urgent && left > 0 && campaign.status === 'play' && !contractWarned.has(campaign)) {
        contractWarned.add(campaign);
        UI.toast({ text: mode === 'school' ? 'Минута до конца испытания!' : 'Минута до конца контракта!', icon: 'clock', tone: 'bad', priority: 3, duration: 3200, key: 'contract-minute' });
      }
    } else if (mode === 'exchange') {
      kicker = 'Заказ биржи';
    } else if (mode === 'hq') {
      kicker = 'Стройка штаба';
    }
    const kickerEl = document.getElementById('level-kicker');
    if (kickerEl.hidden !== !kicker) {
      kickerEl.hidden = !kicker;
      document.body.classList.toggle('hud-kicker', !!kicker);
    }
    setText('level-kicker', kicker);
    kickerEl.classList.toggle('urgent', urgent);
    setText('level-number', mode === 'campaign' ? 'Ур. ' + level.number : '');
    setText('level-title', hudLevelTitle());
    paintCrewStrip();
    const width = (done / total * 100).toFixed(2) + '%';
    const fill = document.getElementById('bar-fill');
    if (fill.style.width !== width) fill.style.width = width;
    setText('level-pct', percentOf(done, total) + '%');
    setText('focus-label', floorText(done, total));
    setText('block-count', done.toLocaleString('ru-RU') + ' / ' + total.toLocaleString('ru-RU'));
    const storyChest = mode === 'campaign' && Meta.chestsOpen(level.index);
    document.getElementById('level-strip').classList.toggle('no-chests', !storyChest);
    paintChest(document.getElementById('chest-25'), 25, done, storyChest);
    paintChest(document.getElementById('chest-50'), 50, done, storyChest);
  }

  function hudLevelTitle() {
    return campaign.runMode === 'hq' ? Meta.PROJECTS[campaign.runPayload.projectId].name : world.level.name;
  }

  // Under the bar only a state worth saying: done or stopped (floors are not written — clean strip).
  function floorText(done, total) {
    if (world.blocked) return 'Строительство остановлено';
    return done >= total ? 'Готово' : '';
  }

  // Up to five small portraits of the run's crew; a trigger flashes its card (pulseCrew).
  function paintCrewStrip() {
    const crew = (campaign.crew || []).filter(function (id) { return !!Meta.CARDS[id]; }).slice(0, 5);
    const signature = crew.join(',');
    if (signature === crewSignature) return;
    crewSignature = signature;
    document.getElementById('crew-strip').innerHTML = crew.map(function (id) {
      const card = Meta.CARDS[id];
      return '<span class="crew-chip rarity-' + card.rarity + '" data-card="' + id + '" title="' + UI.escapeHtml(card.name) + '">' +
        '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt=""></span>';
    }).join('');
  }

  function pulseCrew(id) {
    const chip = document.querySelector('#crew-strip [data-card="' + id + '"]');
    if (!chip || !chip.animate) return;
    chip.animate([
      { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 224, 138, 0)' },
      { transform: 'scale(1.35)', boxShadow: '0 0 0 4px rgba(255, 224, 138, 0.85)', offset: 0.3 },
      { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 224, 138, 0)' },
    ], { duration: 700, easing: 'ease-out' });
  }

  // ---- the time of day: the sky and the day clock ----

  function wrapHours(hours) {
    return ((hours % 24) + 24) % 24;
  }

  function skyEase(x) {
    const t = Math.max(0, Math.min(1, x));
    return t * t * (3 - 2 * t);
  }

  function blendLooks(a, b, t) {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const out = {};
    SKY_COLORS.forEach(function (key) {
      out[key] = [0, 1, 2].map(function (i) { return a[key][i] + (b[key][i] - a[key][i]) * t; });
    });
    SKY_LEVELS.forEach(function (key) { out[key] = a[key] + (b[key] - a[key]) * t; });
    return out;
  }

  // stages: [[progress, look], …] from 0 to 1; eased between neighbours, so each look holds a beat.
  function blendStages(progress, stages) {
    for (let i = 1; i < stages.length; i++) {
      if (progress <= stages[i][0]) {
        const from = stages[i - 1];
        return blendLooks(from[1], stages[i][1], skyEase((progress - from[0]) / (stages[i][0] - from[0])));
      }
    }
    return stages[stages.length - 1][1];
  }

  // The look at this moment: night → (dawn) predawn blue, pink sunrise, soft morning → the full day
  // → golden afternoon light in its last 1.5 h → (dusk) orange sunset, mauve twilight → night.
  function skyLook(clock) {
    const L = SKY_LOOKS;
    if (clock.phase === 'night') return L.night;
    if (clock.phase === 'dawn') return blendStages(clock.progress, [[0, L.night], [0.35, L.predawn], [0.6, L.sunrise], [1, L.morning]]);
    if (clock.phase === 'dusk') return blendStages(clock.progress, [[0, L.afternoon], [0.5, L.sunset], [0.8, L.twilight], [1, L.night]]);
    const ENV = MicroBuildersSim.ENVIRONMENT;
    const span = 24 - wrapHours(ENV.nightToHour - ENV.nightFromHour) - ENV.dawnHours - ENV.duskHours;
    const morning = blendLooks(L.morning, L.day, skyEase(clock.progress * span / 1.5));
    return blendLooks(L.afternoon, morning, skyEase((1 - clock.progress) * span / 1.5));
  }

  // A direction degrees round from the noon sun and degrees up.
  function skyDirection(azimuth, elevation, out) {
    const a = SUN_NOON + azimuth * Math.PI / 180;
    const e = elevation * Math.PI / 180;
    return out.set(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a));
  }

  // The sun is up from the middle of dawn to the middle of dusk on an arc round the noon direction,
  // then passes under the horizon back to its rising side. → [azimuth, elevation] in degrees.
  function sunPosition(hour) {
    const ENV = MicroBuildersSim.ENVIRONMENT;
    const rise = ENV.nightToHour + ENV.dawnHours / 2;
    const set = ENV.nightFromHour - ENV.duskHours / 2;
    const day = wrapHours(set - rise) || 24;
    const since = wrapHours(hour - rise);
    if (since <= day) {
      const u = since / day;
      return [(u * 2 - 1) * SUN_SWEEP, Math.sin(Math.PI * u) * SUN_PEAK];
    }
    const n = (since - day) / Math.max(1e-6, 24 - day);
    return [SUN_SWEEP + n * (360 - 2 * SUN_SWEEP), -Math.sin(Math.PI * n) * 30];
  }

  // The clock the sky shows: the site's, or a fixed 13:00 over the company quarter and the title.
  function skySeconds() {
    if (!cityRoot.visible && campaign && world && campaign.status !== 'title') return campaign.levelElapsed;
    return middaySeconds();
  }

  // 13:00 on the site clock: the company quarter, the title and the sites before the night opens
  // (MB.needOpen 'night') stay in this light.
  function middaySeconds() {
    const ENV = MicroBuildersSim.ENVIRONMENT;
    return (13 - ENV.startHour) * ENV.hourSeconds;
  }

  function mixRgb(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  // The weather's share in the look at a moment of the site (WEATHER_LOOKS), cross-faded at the
  // phase boundaries with the neighbouring phase.
  function weatherChannels(site, seconds) {
    const P = MicroBuildersSim.ENVIRONMENT.weatherPhaseSeconds;
    const index = Math.floor(seconds / P);
    const into = seconds - index * P;
    const at = function (i) { return WEATHER_LOOKS[MicroBuildersSim.weatherAt(site, (i + 0.5) * P)] || WEATHER_LOOKS['']; };
    const here = at(index);
    let other = here;
    let w = 1;
    if (into < WEATHER_FADE / 2) {
      other = at(index - 1);
      w = skyEase(0.5 + into / WEATHER_FADE);
    } else if (P - into < WEATHER_FADE / 2) {
      other = at(index + 1);
      w = skyEase(0.5 + (P - into) / WEATHER_FADE);
    }
    const out = {};
    WEATHER_CHANNELS.forEach(function (key) { out[key] = other[key] + (here[key] - other[key]) * w; });
    return out;
  }

  function settleGround(site, t, dt) {
    if (dt <= 0) return;
    const ch = weatherChannels(site, t);
    const thaw = 1 + 3 * ch.heat;
    const hot = MicroBuildersSim.weatherAt(site, t + dt / 2) === 'heat' ? 1 : 0;
    weatherView.dry = Math.max(0, Math.min(1, weatherView.dry + Math.sign(hot - weatherView.dry) * Math.min(Math.abs(hot - weatherView.dry), dt / DRY_TURN)));
    const melting = ch.snow <= 0.05 && weatherView.cover > 0 ? 1 : 0;
    weatherView.melt += (melting - weatherView.melt) * Math.min(1, dt / 20);
    weatherView.snowSum += ch.snow * dt;
    weatherView.cover = Math.max(0, Math.min(1, weatherView.cover + dt * (ch.snow > 0.05 ? ch.snow / SNOW_BUILD : -thaw / SNOW_MELT)));
    weatherView.wet = Math.max(0, Math.min(1, weatherView.wet + dt * (ch.rain > 0.05 ? ch.rain / WET_BUILD : -thaw / WET_DRY)));
  }

  // Snow and wet on the ground of this site now: stepped with the site clock; a new site, a jump or
  // a return after a while is counted over the last 10 minutes of the site in 5-second steps.
  function stepGround(site, seconds) {
    if (weatherView.world !== world || weatherView.site !== site || seconds < weatherView.seconds || seconds - weatherView.seconds > 60) {
      weatherView.world = world;
      weatherView.site = site;
      weatherView.cover = 0;
      weatherView.wet = 0;
      weatherView.melt = 0;
      weatherView.dry = 0;
      weatherView.snowSum = 0;
      clearFootprints();
      for (let t = Math.max(0, seconds - 600); t < seconds; t += 5) settleGround(site, t, Math.min(5, seconds - t));
    } else {
      settleGround(site, weatherView.seconds, seconds - weatherView.seconds);
    }
    weatherView.seconds = seconds;
  }

  // Overcast greys the sky and the light and hides the sun, the moon and the stars (a storm darkens
  // them further); heat bleaches the sky pale and warm under a white-hot sun (by day only).
  function weatherLook(base, ch) {
    if (ch.clouds <= 0.001 && ch.heat <= 0.001) return base;
    const look = blendLooks(base, base, 0.5);
    const grey = function (c, k) {
      const l = c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15;
      return [l * 0.96 * k, l * k, l * 1.05 * k];
    };
    const overcast = ch.clouds;
    const dark = 1 - 0.4 * ch.storm;
    ['top', 'horizon', 'fog', 'hemiSky'].forEach(function (key) { look[key] = mixRgb(look[key], grey(look[key], dark), overcast * 0.8); });
    look.sunColor = mixRgb(look.sunColor, grey(look.sunColor, 1), overcast * 0.6);
    look.sun *= 1 - 0.7 * overcast;
    look.glow *= 1 - overcast;
    look.stars *= 1 - overcast;
    look.moon *= 1 - 0.9 * overcast;
    look.hemi *= 1 - 0.08 * overcast - 0.14 * ch.storm;
    const heat = ch.heat * Math.min(1, base.sun / 1.2);
    if (heat > 0) {
      look.top = mixRgb(look.top, [0.74, 0.8, 0.84], 0.5 * heat);
      look.horizon = mixRgb(look.horizon, [0.99, 0.9, 0.7], 0.55 * heat);
      look.fog = mixRgb(look.fog, [0.92, 0.86, 0.72], 0.55 * heat);
      look.sunColor = mixRgb(look.sunColor, [1, 0.96, 0.86], 0.5 * heat);
      look.sun *= 1 + 0.12 * heat;
      look.glow += 0.3 * heat;
    }
    return look;
  }

  // A storm flashes lightning: each 7-second window of the site may hold one flash at a pseudo-random
  // moment, at most one per 1.5 s of real time (so ×20 does not strobe); a flash fades in 0.45 s
  // with a second flicker.
  function stormFlash(seconds, storm, realDt, time) {
    weatherView.flash = Math.max(0, weatherView.flash - realDt / 0.45);
    if (storm > 0.5) {
      const window7 = Math.floor(seconds / 7);
      if (window7 !== weatherView.flashWindow) {
        const r = Math.sin(window7 * 12.9898) * 43758.5453;
        weatherView.flashWindow = window7;
        weatherView.flashAt = (window7 + (r - Math.floor(r))) * 7;
        weatherView.flashArmed = (r * 3.1 - Math.floor(r * 3.1)) < 0.6;
      }
      if (weatherView.flashArmed && seconds >= weatherView.flashAt && time - weatherView.lastFlash > 1.5) {
        weatherView.flashArmed = false;
        weatherView.lastFlash = time;
        weatherView.flash = 1;
      }
    }
    const f = weatherView.flash;
    return f > 0.75 ? 1 : f > 0.55 ? 0.25 : f > 0.3 ? 0.7 * f : 0.4 * f;
  }

  // Every frame: the dome, fog, hemisphere light and the sun (direction, color, strength) at this
  // moment of the day, under this weather. The directional light turns from the sun to the moon
  // through the twilight, while it is faint, and never comes lower than LIGHT_LOW, so shadows stay
  // readable. Weather: precipitation, snow and wet on the ground, clouds, lightning, heat haze; the
  // company quarter and the title stay clear.
  function updateSky(realDt, time) {
    skyView.time = time;
    const seconds = skySeconds();
    const onSite = !cityRoot.visible && !!campaign && !!world && campaign.status !== 'title';
    const site = onSite ? campaign.levelIndex : -1;
    const ch = onSite ? weatherChannels(site, seconds) : WEATHER_LOOKS[''];
    if (onSite) stepGround(site, seconds);
    const clock = MicroBuildersSim.dayClock(onSite && !MB.needOpen(campaign, 'night') ? middaySeconds() : seconds);
    const base = skyLook(clock);
    const look = weatherLook(base, ch);
    skyView.look = look;
    skyView.weather = ch;
    const flash = onSite ? stormFlash(seconds, ch.storm, realDt, time) : 0;
    const sunAt = sunPosition(clock.hour);
    skyDirection(sunAt[0], sunAt[1], sunDir);
    skyDirection(sunAt[0], Math.max(LIGHT_LOW, sunAt[1]), lightDir);
    skyDirection(MOON_SIDE, MOON_LIGHT_HIGH, moonDir);
    lightDir.lerp(moonDir, look.moonLight).normalize();
    skyDirection(MOON_SIDE, MOON_SKY_HIGH, moonDir);
    const uniforms = sky.material.uniforms;
    uniforms.uTop.value.fromArray(look.top);
    uniforms.uHorizon.value.fromArray(look.horizon);
    uniforms.uSunDir.value.copy(sunDir);
    uniforms.uSunColor.value.fromArray(look.sunColor);
    uniforms.uGlow.value = look.glow;
    uniforms.uMoonDir.value.copy(moonDir);
    uniforms.uMoon.value = look.moon;
    uniforms.uStars.value = look.stars;
    uniforms.uClouds.value = ch.clouds;
    const cloud = look.horizon[0] * 0.3 + look.horizon[1] * 0.55 + look.horizon[2] * 0.15;
    uniforms.uCloudColor.value.set(cloud * 0.95, cloud * 0.97, cloud * 1.02).multiplyScalar(1.05 - 0.45 * ch.storm);
    uniforms.uTime.value = time;
    uniforms.uFlash.value = flash;
    skyColor.setRGB(look.fog[0], look.fog[1], look.fog[2], THREE.SRGBColorSpace);
    scene.fog.color.copy(skyColor);
    renderer.setClearColor(skyColor, 1);
    // Snow and rain shorten the view, the heat hazes the distance a little.
    const precip = Math.max(ch.snow, ch.rain);
    scene.fog.near = lightRig.fogNear * (1 - 0.3 * precip);
    scene.fog.far = lightRig.fogFar * (1 - 0.4 * precip - 0.12 * ch.heat);
    hemi.color.setRGB(look.hemiSky[0], look.hemiSky[1], look.hemiSky[2], THREE.SRGBColorSpace);
    hemi.groundColor.setRGB(look.hemiGround[0], look.hemiGround[1], look.hemiGround[2], THREE.SRGBColorSpace);
    hemi.intensity = (look.hemi + 1.6 * flash) * LIGHT_GAIN.hemi;
    sun.color.setRGB(look.sunColor[0], look.sunColor[1], look.sunColor[2], THREE.SRGBColorSpace);
    sun.intensity = look.sun * LIGHT_GAIN.sun;
    if (lightRig.reach > 0) sun.position.copy(sun.target.position).addScaledVector(lightDir, lightRig.reach);
    // Ground: snow cover and wet (visual only).
    weatherGround.uSnow.value = onSite ? weatherView.cover : 0;
    weatherGround.uWet.value = onSite ? weatherView.wet : 0;
    weatherGround.uMelt.value = onSite ? weatherView.melt : 0;
    weatherGround.uDry.value = onSite ? weatherView.dry : 0;
    // Здание под погодой (block-materials.js): снег шапками на верхних гранях, в дождь блоки мокрые.
    Blocks.weather.snow.value = weatherGround.uSnow.value;
    Blocks.weather.wet.value = weatherGround.uWet.value;
    groundDust.amount.value = onSite ? ch.heat : 0;
    for (let i = 0; i < groundDust.layers.length; i++) groundDust.layers[i].visible = onSite && ch.heat > 0.01;
    weatherView.heat = onSite ? ch.heat : 0;
    footprints.material.uniforms.uSnowSum.value = weatherView.snowSum;
    footprints.visible = onSite && weatherView.cover > 0.001;
    // Precipitation ahead of the camera; the storm slants the rain.
    PRECIP.time.value = time;
    camera.getWorldDirection(skyAhead);
    PRECIP.center.value.copy(camera.position).addScaledVector(skyAhead, 14);
    PRECIP.snowAmount.value = ch.snow;
    PRECIP.rainAmount.value = ch.rain;
    PRECIP.wind.value.set(1.2 + 5 * ch.storm, 0, 0.6 + 2.5 * ch.storm);
    PRECIP.light.value = Math.min(1, 0.3 + 0.5 * look.hemi + 0.25 * look.sun) + 0.6 * flash;
    PRECIP.px.value = renderer.getPixelRatio();
    PRECIP.dustAmount.value = ch.heat * (0.4 + 0.6 * Math.min(1, base.sun / 1.2));
    heatDust.visible = ch.heat > 0.01;
    snowfall.visible = ch.snow > 0.01;
    rainfall.visible = ch.rain > 0.01;
    weatherView.haze = ch.heat * Math.min(1, base.sun / 1.2);
  }

  // The heat haze pass (see haze): after the scene is drawn.
  function renderHaze(time) {
    if (weatherView.haze <= 0.01) return;
    renderer.getDrawingBufferSize(haze.size);
    if (!haze.texture || haze.texture.image.width !== haze.size.x || haze.texture.image.height !== haze.size.y) {
      if (haze.texture) haze.texture.dispose();
      haze.texture = new THREE.FramebufferTexture(haze.size.x, haze.size.y);
      haze.material.uniforms.tMap.value = haze.texture;
    }
    renderer.copyFramebufferToTexture(haze.origin, haze.texture);
    haze.material.uniforms.uTime.value = time;
    haze.material.uniforms.uHaze.value = weatherView.haze;
    haze.material.uniforms.uAspect.value = haze.size.x / Math.max(1, haze.size.y);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(haze.scene, haze.camera);
    renderer.autoClear = autoClear;
  }

  // Ground materials under the weather: snow whitens them in patches (mix — how white: grass and earth
  // fully, tree crowns partly; bias — later or sooner than the grass: crowns shed it first, the
  // trodden site earth melts sooner), a melting edge is dark slush, rain darkens them and makes them
  // glossy. Uniforms are shared (weatherGround), so one write a frame updates all of them.
  function weatherSurface(material, mix, bias, dry) {
    const lift = (bias || 0).toFixed(2);
    const scorch = (dry || 0).toFixed(2);
    material.onBeforeCompile = function (shader) {
      shader.uniforms.uSnow = weatherGround.uSnow;
      shader.uniforms.uWet = weatherGround.uWet;
      shader.uniforms.uMelt = weatherGround.uMelt;
      shader.uniforms.uDry = weatherGround.uDry;
      shader.vertexShader = 'varying vec3 vSnowWorld;\n' + shader.vertexShader.replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vec4 snowWorld = vec4(transformed, 1.0);',
        '#ifdef USE_INSTANCING',
        'snowWorld = instanceMatrix * snowWorld;',
        '#endif',
        'vSnowWorld = (modelMatrix * snowWorld).xyz;',
      ].join('\n'));
      shader.fragmentShader = 'uniform float uSnow;\nuniform float uWet;\nuniform float uMelt;\nuniform float uDry;\nvarying vec3 vSnowWorld;\n' +
        SNOW_FIELD_GLSL + shader.fragmentShader
        .replace('#include <map_fragment>', [
          '#include <map_fragment>',
          'float snowGrain = 1.0;',
          '#ifdef USE_MAP',
          'snowGrain = 0.82 + 0.18 * fract(sin(dot(floor(vMapUv * 96.0), vec2(12.9898, 78.233))) * 43758.5453);',
          '#endif',
          'float snowN = snowField(vSnowWorld.xz) + ' + lift + ';',
          'float snowC = snowLevel(uSnow);',
          'float snowAmt = smoothstep(snowN - 0.05, snowN + 0.05, snowC);',
          'float slush = smoothstep(snowN - 0.24, snowN - 0.04, snowC) * (1.0 - snowAmt) * uMelt;',
          'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.97), clamp(snowAmt * ' + mix.toFixed(2) + ' * snowGrain, 0.0, 1.0));',
          'diffuseColor.rgb *= 1.0 - 0.34 * slush;',
          'diffuseColor.rgb *= 1.0 - 0.38 * uWet * (1.0 - snowAmt);',
          'float dryAmt = smoothstep(0.0, 1.0, uDry) * ' + scorch + ';',
          'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.5, 1.18, 0.42) + vec3(0.12, 0.08, 0.0), dryAmt * (1.0 - snowAmt));',
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.42, max(uWet * (1.0 - snowAmt), slush * 0.8));');
    };
    material.customProgramCacheKey = function () { return 'weather' + mix + '|' + lift + '|' + scorch; };
  }

  // A print where a worker walking on snowy ground has stepped (trackFootprints).
  function addFootprint(x, z, yaw) {
    const index = footState.next;
    footState.next = (footState.next + 1) % FOOTPRINTS;
    footDummy.position.set(x, 0.035, z);
    footDummy.rotation.set(0, yaw, 0);
    footDummy.updateMatrix();
    footprints.setMatrixAt(index, footDummy.matrix);
    footprints.count = Math.max(footprints.count, index + 1);
    // Upload only the changed print, not the whole ring.
    footprints.instanceMatrix.addUpdateRange(index * 16, 16);
    footprints.instanceMatrix.needsUpdate = true;
    const born = footprints.geometry.getAttribute('aBorn');
    born.array[index] = weatherView.snowSum;
    born.addUpdateRange(index, 1);
    born.needsUpdate = true;
  }

  function clearFootprints() {
    const born = footprints.geometry.getAttribute('aBorn');
    born.array.fill(-1e9);
    born.needsUpdate = true;
    footprints.count = 0;
    footState.next = 0;
  }

  // Every FOOT_STEP cells of a walk on the ground while there is snow: a print, left and right in turn,
  // a little to the side of his path. A jump (a new site, ×20) starts the trail anew.
  function trackFootprints(viewState, builder, group, y, mode) {
    if (weatherGround.uSnow.value < 0.08 || builder.phase !== 'walk' || mode !== 'walk' || y > 0.05) {
      viewState.footAt = null;
      return;
    }
    const x = group.position.x;
    const z = group.position.z;
    const at = viewState.footAt;
    if (!at) {
      viewState.footAt = { x: x, z: z };
      return;
    }
    const dx = x - at.x;
    const dz = z - at.z;
    const d = Math.hypot(dx, dz);
    if (d < FOOT_STEP) return;
    at.x = x;
    at.z = z;
    if (d > 4) return;
    const yaw = Math.atan2(dx, dz);
    viewState.footSide = viewState.footSide === 1 ? -1 : 1;
    const side = 0.065 * viewState.footSide;
    addFootprint(x + Math.cos(yaw) * side, z - Math.sin(yaw) * side, yaw);
  }

  // «08:00»: game time (a minute of the site is an hour).
  function clockText(hour) {
    const minutes = Math.floor(wrapHours(hour) * 60 + 1e-6) % 1440;
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  // The 24-hour ring: noon at the top, midnight at the bottom.
  function dialAngle(hour) {
    return (wrapHours(hour) - 12) / 24 * 360;
  }

  function dialArc(fromHour, toHour) {
    const span = wrapHours(toHour - fromHour);
    if (span <= 0) return '';
    const a0 = dialAngle(fromHour) * Math.PI / 180;
    const a1 = a0 + span / 24 * Math.PI * 2;
    const point = function (a) { return (18 + 14 * Math.sin(a)).toFixed(2) + ' ' + (18 - 14 * Math.cos(a)).toFixed(2); };
    return 'M' + point(a0) + 'A14 14 0 ' + (span > 12 ? 1 : 0) + ' 1 ' + point(a1);
  }

  // Night navy, dawn pink, the day gold, sunset and twilight orange — redrawn when the hours change.
  function paintDialArcs() {
    const ENV = MicroBuildersSim.ENVIRONMENT;
    const key = [ENV.nightFromHour, ENV.nightToHour, ENV.dawnHours, ENV.duskHours].join('|');
    if (key === skyView.dial) return;
    skyView.dial = key;
    const morning = ENV.nightToHour + ENV.dawnHours;
    const evening = ENV.nightFromHour - ENV.duskHours;
    document.getElementById('dial-night').setAttribute('d', dialArc(ENV.nightFromHour, ENV.nightToHour));
    document.getElementById('dial-dawn').setAttribute('d', dialArc(ENV.nightToHour, morning));
    document.getElementById('dial-day').setAttribute('d', dialArc(morning, evening));
    document.getElementById('dial-dusk').setAttribute('d', dialArc(evening, ENV.nightFromHour));
  }

  // The time of day on the dial and as text; before the night opens (levels 1–6, tuning.intro) only a
  // sun: no day and night, no time. The weather is not shown here — it comes as a surprise.
  function paintDayClock() {
    const night = MB.needOpen(campaign, 'night');
    const dial = document.getElementById('day-dial');
    dial.classList.toggle('no-night', !night);
    const marker = document.getElementById('dial-marker');
    const time = document.getElementById('level-time');
    time.hidden = !night;
    if (!night) {
      dial.classList.remove('is-night');
      const center = 'translate(18 18) scale(1.7) translate(-18 -4)';
      if (marker.getAttribute('transform') !== center) marker.setAttribute('transform', center);
      return;
    }
    const clock = MicroBuildersSim.dayClock(campaign.levelElapsed);
    paintDialArcs();
    dial.classList.toggle('is-night', clock.night);
    const turn = 'rotate(' + dialAngle(clock.hour).toFixed(1) + ' 18 18)';
    if (marker.getAttribute('transform') !== turn) marker.setAttribute('transform', turn);
    setText('level-time', clockText(clock.hour));
  }

  // «Закат · 18:40 — ночь в 20:00, через 1:20» (the wait in site time: minutes at ×1).
  function dayPhaseLine(clock) {
    const ENV = MicroBuildersSim.ENVIRONMENT;
    const name = { night: 'Ночь', dawn: 'Рассвет', day: 'День', dusk: clock.progress < 0.5 ? 'Закат' : 'Сумерки' }[clock.phase];
    const next = {
      night: ['рассвет', ENV.nightToHour],
      dawn: ['день', ENV.nightToHour + ENV.dawnHours],
      day: ['закат', ENV.nightFromHour - ENV.duskHours],
      dusk: ['ночь', ENV.nightFromHour],
    }[clock.phase];
    return name + ' · ' + next[0] + ' через ' + MB.formatClock(Math.ceil(clock.untilChange));
  }

  // Night and weather effects of this run: the base penalties, softened by the office's night
  // relief, or the boosts of «Ночной прораб» / «Метеоролог» (as Meta.applyEnvironment applies them).
  function environmentEffects(weather) {
    const ENV = MicroBuildersSim.ENVIRONMENT;
    const foremen = campaign.foremen || {};
    const relief = Meta.nightRelief(campaign);
    const nightWork = ENV.nightWork + (1 - ENV.nightWork) * relief;
    const kind = weather && weather !== 'Ясно' ? MicroBuildersSim.weatherAt(campaign.levelIndex, campaign.levelElapsed) : '';
    const bad = kind ? ENV.kinds[kind] : null;
    const slowed = bad && !foremen.meteo;
    const less = function (factor) { return slowed && Number.isFinite(factor) ? Math.round((1 - factor) * 100) : 0; };
    return {
      kind: kind,
      nightSlow: foremen.nightBoost ? 0 : Math.round((1 - nightWork) * 100),
      nightFast: foremen.nightBoost ? Math.round(foremen.nightBoost.value * 100) : 0,
      weatherSlow: bad ? less(bad.work) : 0,
      weatherMove: bad ? less(bad.move) : 0,
      weatherWalk: bad ? less(bad.walk) : 0,
      weatherDeck: bad ? less(bad.deck) : 0,
      weatherFloor: slowed && bad.floorStep > 0 ? Math.round((MB.BALANCE.deckFloorStep + bad.floorStep) * 100) : 0,
      weatherCarry: bad ? less(bad.carry) : 0,
      // Need rates: how many times faster hunger, the smoke wish and fatigue fill (×2 — «голод ×2»).
      weatherHunger: slowed && bad.hungerRate > 1 ? bad.hungerRate : 0,
      weatherSmoke: slowed && bad.smokeRate > 1 ? bad.smokeRate : 0,
      weatherFatigue: slowed && bad.fatigueRate > 1 ? bad.fatigueRate : 0,
      lightning: !!bad && bad.lightning > 0,
      weatherFast: bad && foremen.meteo ? Math.round(foremen.meteo.value * 100) : 0,
    };
  }

  function nightLine(effects) {
    if (effects.nightFast > 0) return 'Ночью · работа +' + effects.nightFast + '%';
    return 'Ночью · работа −' + effects.nightSlow + '%';
  }

  // One decision-relevant effect; the complete mechanics stay behind «i».
  function weatherSummary(effects) {
    if (effects.lightning) return 'молнии с ' + MicroBuildersSim.ENVIRONMENT.lightning.minFloor + '-го этажа';
    if (effects.weatherFast > 0) return 'работа +' + effects.weatherFast + '%';
    const times = function (rate) { return '×' + String(Math.round(rate * 100) / 100).replace('.', ','); };
    if (effects.weatherHunger > 0) return 'голод ' + times(effects.weatherHunger);
    if (effects.weatherSmoke > 0) return 'перекуры ' + times(effects.weatherSmoke);
    if (effects.weatherFatigue > 0) return 'усталость ' + times(effects.weatherFatigue);
    if (effects.weatherSlow > 0) return 'работа −' + effects.weatherSlow + '%';
    if (effects.weatherWalk > 0) return 'ходьба −' + effects.weatherWalk + '%';
    if (effects.weatherMove > 0) return 'ходьба −' + effects.weatherMove + '%';
    return '';
  }

  // Each weather its own: «ходьба −30%, на настилах ещё −20% и −6% за этаж (наледь), голод ×2
  // (холод)» (snow),
  // «укладка −22%, ходьба и подъёмы −7%» (heat), «укладка −30%, ноша −30% (мокрый материал)» (rain),
  // «молнии выбивают кубы с 5-го этажа» (storm).
  function weatherEffect(effects) {
    const strikes = effects.lightning ? 'молнии выбивают кубы с ' + MicroBuildersSim.ENVIRONMENT.lightning.minFloor + '-го этажа' : '';
    if (effects.weatherFast > 0) return 'Метеоролог: работа +' + effects.weatherFast + '%' + (strikes ? ', но ' + strikes : '');
    const parts = [];
    if (effects.weatherSlow > 0) parts.push('укладка −' + effects.weatherSlow + '%');
    if (effects.weatherMove > 0) parts.push('ходьба и подъёмы −' + effects.weatherMove + '%');
    if (effects.weatherWalk > 0) parts.push('ходьба −' + effects.weatherWalk + '%');
    if (effects.weatherDeck > 0 || effects.weatherFloor > 0) {
      const deck = [];
      if (effects.weatherDeck > 0) deck.push('−' + effects.weatherDeck + '%');
      if (effects.weatherFloor > 0) deck.push('−' + effects.weatherFloor + '% за этаж');
      parts.push('на настилах ещё ' + deck.join(' и ') + (effects.kind === 'snow' ? ' (наледь)' : ''));
    }
    if (effects.weatherCarry > 0) parts.push('ноша −' + effects.weatherCarry + '%' + (effects.kind === 'rain' ? ' (мокрый материал)' : ''));
    const times = function (rate) { return '×' + String(Math.round(rate * 100) / 100).replace('.', ','); };
    if (effects.weatherHunger > 0) parts.push('голод ' + times(effects.weatherHunger) + (effects.kind === 'snow' ? ' (холод)' : ''));
    if (effects.weatherSmoke > 0) parts.push('тянет курить ' + times(effects.weatherSmoke));
    if (effects.weatherFatigue > 0) parts.push('усталость ' + times(effects.weatherFatigue));
    if (strikes) parts.push(strikes);
    return parts.join(', ');
  }

  // «Закат · 18:40 — ночь в 20:00, через 1:20», the night penalty, the weather, «Стройка идёт
  // 1 ч 02 мин», speed.
  function paintDayPop() {
    const pop = document.getElementById('day-pop');
    if (pop.hidden || !campaign || !world) return;
    const elapsed = campaign.levelElapsed;
    const weather = envView.campaign === campaign ? envView.weather : 'Ясно';
    const effects = environmentEffects(weather);
    // Before the night opens: no phase of the day and no night lines. No forecast: the weather is a surprise.
    const night = MB.needOpen(campaign, 'night');
    const phase = document.getElementById('day-pop-phase');
    phase.hidden = !night;
    document.getElementById('day-pop-night').hidden = !night;
    if (night) {
      setText('day-pop-phase', dayPhaseLine(MicroBuildersSim.dayClock(elapsed)));
      setText('day-pop-night', nightLine(effects));
    }
    const summary = weatherSummary(effects);
    setText('day-pop-weather', weather + (summary ? ' · ' + summary : ''));
    setText('day-pop-details', (weatherEffect(effects) || 'Ясная погода без штрафов.') + (night
      ? ' Ночью усталость ×' + String(MB.SLEEP.nightFatigue).replace('.', ',') + '. Освещение снижает ночной штраф к работе.' : ''));
    const help = { snow: 'Снег: Полевая кухня сокращает путь на обед.', rain: 'Дождь: Зона отдыха сокращает перекуры и путь к ним.',
      heat: 'Жара: Бытовки сокращают сон и путь к нему.', storm: 'Шторм: молнии повреждают верхние этажи.' };
    setText('day-pop-help', help[effects.kind] || '');

    let time = 'Стройка идёт ' + formatSpan(elapsed);
    if (timedMode(campaign.runMode)) {
      time += ' · осталось ' + MB.formatClock(Math.ceil(Math.max(0, trialLimit(campaign) - elapsed)));
    }
    setText('day-pop-time', time);
  }

  // Night and weather changes during the run get a toast («Наступила ночь — бригада медленнее на
  // 28%», «Погода наладилась»); a new site starts quiet. The sky follows the clock every frame
  // (updateSky).
  function applyEnvironmentView(value) {
    const fresh = envView.campaign !== campaign;
    if (!fresh && envView.night === value.night && envView.weather === value.weather) return;
    const wasNight = envView.night;
    const wasWeather = envView.weather;
    envView.campaign = campaign;
    envView.night = value.night;
    envView.weather = value.weather;
    if (fresh || campaign.status !== 'play') return;
    const effects = environmentEffects(value.weather);
    if (value.night !== wasNight) {
      const text = value.night ? nightLine(effects).replace('Ночью', 'Ночь') : 'Рассвет · ночной штраф снят';
      UI.toast({ text: text, icon: value.night ? 'moon' : 'sun', tone: value.night ? 'info' : 'good', priority: 1, key: 'env-day' });
    }
    if (value.weather !== wasWeather) {
      const bad = value.weather !== 'Ясно';
      UI.toast({
        text: value.weather + (bad && weatherSummary(effects) ? ' · ' + weatherSummary(effects) : ''),
        icon: bad ? WEATHER_ICONS[value.weather] : 'sun',
        tone: bad ? 'warn' : 'good',
        priority: 1,
        key: 'env-weather',
      });
    }
  }

  // ---- the upgrade dock ----

  function paintDock() {
    const coins = campaign.coins;
    const taxiLow = taxiTooLow('elevators');
    const stale = hudDirty || dockRange.campaign !== campaign || coins < dockRange.low || coins >= dockRange.high || dockRange.taxiLow !== taxiLow;
    if (stale) {
      hudDirty = false;
      dockRange.campaign = campaign;
      dockRange.taxiLow = taxiLow;
      let low = 0;
      let high = Infinity;
      document.querySelectorAll('#upgrade-dock .upgrade-group').forEach(function (column) {
        let any = false;
        // The closed line of this tab that the tech center opens soonest stays as a locked card naming
        // its technology («Ноша» — «Грузовые ремни»), so the player knows where the next line comes from.
        let beacon = null;
        let beaconNode = '';
        const closed = [];
        column.querySelectorAll('.upgrade').forEach(function (button) {
          const kind = button.id.slice(3);
          const open = upgradeLineOpen(kind, button.dataset.group);
          if (!open) {
            closed.push(button);
            const node = dockLockNode(kind, button.dataset.group);
            if (node && (!beaconNode || Meta.TECH[node].from < Meta.TECH[beaconNode].from)) {
              beacon = button;
              beaconNode = node;
            }
            return;
          }
          if (button.hidden) button.hidden = false;
          any = true;
          const cost = MB.upgradeCost(kind, campaign.purchases[kind], campaign);
          paintUpgrade(kind, upgradeLabel(kind), cost);
          if (campaign.freePurchases || campaign.purchases[kind] >= window.MicroBuildersBalance.session[kind].max) return;
          if (cost <= coins) low = Math.max(low, cost);
          else high = Math.min(high, cost);
        });
        // A tab with nothing open yet stays hidden, beacon and all.
        closed.forEach(function (button) {
          const shown = any && button === beacon;
          if (button.hidden === shown) button.hidden = !shown;
          if (shown) paintLockedUpgrade(button.id.slice(3), beaconNode);
        });
        if (column.hidden === any) column.hidden = !any;
      });
      // Repaint again once the coins reach the next price or drop under a bought one.
      dockRange.low = low;
      dockRange.high = high;
      window.MicroBuildersSyncUpgradeTabs();
    }
    paintDockFill(coins);
    paintUpgradeGraph();
    paintAdvanced();
    paintRepeatBuys();
  }

  // ---------- «Продвинутые улучшения» on the site (docs/gdd/29-tokens-draft.md) ----------
  // A second graph in the «Улучшения» sheet (the ★ button in its head, shown once the tech center has
  // researched an advanced technology): the centre pass for the site's coins (session line `advanced`),
  // around it a star of key nodes, ADVANCED.tokens each (MB.buyAdvanced). Under the star a card says
  // what the tapped node does and holds its button; opening the star picks the next step by itself
  // (the centre while it is shut, then the first node that can be opened).

  // The star itself (upgrade-graph.js): the centre and a ring of key nodes.
  function advancedGraphOf(root, onSelect) {
    const graph = window.MicroBuildersGraph.create({
      root: root, tree: ADVANCED_TREE, gates: ADVANCED_GATES, ring: 106,
      icon: function (id) { return ADVANCED_NODES[id] ? ADVANCED_NODES[id].icon : ADVANCED.icon; },
      name: function (id) { return ADVANCED_NODES[id] ? ADVANCED_NODES[id].name : ADVANCED.name; },
      onSelect: onSelect,
    });
    ADVANCED.nodes.forEach(function (node) { graph.nodes[node.id].classList.add('is-ultimate'); });
    return graph;
  }

  function advancedAvailable() {
    return !!world && (campaign.advancedOpen || []).length > 0;
  }

  function advancedCenterCost() {
    return MB.upgradeCost('advanced', 0, campaign);
  }

  // What the star offers right now: the centre for coins, nodes for tokens.
  function advancedReadyCount() {
    if (!advancedAvailable()) return 0;
    if (!(campaign.purchases.advanced > 0)) return campaign.coins >= advancedCenterCost() ? 1 : 0;
    if ((campaign.tokens || 0) < ADVANCED.tokens) return 0;
    return ADVANCED.nodes.filter(function (node) { return MB.advancedOpenable(campaign, node.id); }).length;
  }

  // The next step: the shut centre, else the first node that can be opened now.
  function advancedNextPick() {
    if (!(campaign.purchases.advanced > 0)) return 'advanced';
    const next = ADVANCED.nodes.find(function (node) { return MB.advancedOpenable(campaign, node.id); });
    return next ? next.id : null;
  }

  function pickAdvanced(id) {
    advancedPick = id;
    advancedGraph.select(id);
    paintAdvancedTip(true);
  }

  function setAdvancedView(on) {
    advancedOn = on;
    if (on && !advancedGraph) {
      document.getElementById('advanced-graph').classList.add('advanced-star');
      advancedGraph = advancedGraphOf(document.getElementById('advanced-graph'), function (id) { pickAdvanced(id); });
    }
    document.getElementById('upgrade-sheet').classList.toggle('advanced-on', on);
    document.getElementById('upgrade-graph').hidden = on;
    document.getElementById('advanced-graph').hidden = !on;
    document.getElementById('advanced-tip').hidden = !on;
    if (on) document.getElementById('graph-tip').hidden = true;
    document.getElementById('upgrade-sheet-title').textContent = on ? ADVANCED.name : 'Улучшения';
    document.getElementById('advanced-toggle').firstChild.textContent = on ? '← Граф' : '★ Продвинутые';
    if (!on) {
      if (advancedGraph) advancedGraph.select(null);
      return;
    }
    paintAdvanced();
    pickAdvanced(advancedNextPick());
    advancedGraph.centre();
  }
  document.getElementById('advanced-toggle').addEventListener('click', function () { setAdvancedView(!advancedOn); });

  function paintAdvanced() {
    const toggle = document.getElementById('advanced-toggle');
    const available = advancedAvailable();
    if (toggle.hidden === available) toggle.hidden = !available;
    if (!available && advancedOn) setAdvancedView(false);
    // «Улучшения» counts what the star offers too (ui.js keeps its own count in data-graph).
    const ready = advancedReadyCount();
    toggle.classList.toggle('has-ready', ready > 0 && !advancedOn);
    const badge = document.getElementById('upgrades-ready');
    const total = (Number(badge.dataset.graph) || 0) + ready;
    if (badge.hidden === (total > 0)) badge.hidden = total === 0;
    if (total > 0 && badge.textContent !== String(total)) badge.textContent = String(total);
    if (!advancedOn) return;
    const center = campaign.purchases.advanced > 0;
    const tokens = campaign.tokens || 0;
    advancedViews = { advanced: center ? 'owned' : 'available' };
    ADVANCED.nodes.forEach(function (node) {
      advancedViews[node.id] = MB.advancedOwned(campaign, node.id) ? 'owned' : !MB.advancedResearched(campaign, node.id) ? 'office' :
        center ? 'available' : 'sealed';
    });
    advancedGraph.paint(advancedViews);
    advancedGraph.nodes.advanced.classList.toggle('is-ready', !center && campaign.coins >= advancedCenterCost());
    ADVANCED.nodes.forEach(function (node) {
      const el = advancedGraph.nodes[node.id];
      const view = advancedViews[node.id];
      el.classList.toggle('is-sealed', view === 'sealed');
      el.classList.toggle('is-buyable', view === 'available');
      el.classList.toggle('is-ready', view === 'available' && tokens >= ADVANCED.tokens);
      el.classList.toggle('is-short', view === 'available' && tokens < ADVANCED.tokens);
    });
    paintAdvancedTip(false);
  }

  // The card under the star: the tapped node (icon, name, state, what it does, its button), or how the
  // star works while nothing is tapped. Redrawn when its state changes.
  function paintAdvancedTip(force) {
    const tip = document.getElementById('advanced-tip');
    const id = advancedPick;
    const view = id ? advancedViews[id] : '';
    const tokens = campaign.tokens || 0;
    const key = id + ':' + view + ':' + tokens + ':' + (campaign.coins >= advancedCenterCost());
    if (!force && key === advancedTipKey) return;
    advancedTipKey = key;
    const researched = (campaign.advancedOpen || []).length;
    const bought = ADVANCED.nodes.filter(function (node) { return MB.advancedOwned(campaign, node.id); }).length;
    let icon = ADVANCED.icon;
    let name = ADVANCED.name;
    let state = '';
    let text = '';
    let action = '';
    if (!id) {
      state = 'Открыто узлов: ' + bought + ' · изучено в техцентре: ' + researched + ' из ' + ADVANCED.nodes.length;
      text = 'Узел ★ — ' + ADVANCED.tokens + ' жетона, работает до конца этой стройки.';
    } else if (id === 'advanced') {
      const cost = advancedCenterCost();
      state = view === 'owned' ? 'Открыт · узлы — по ' + ADVANCED.tokens + ' жетона' : 'Центр · за монеты стройки';
      text = view === 'owned' ? 'Узлы ★ вокруг, изученные в техцентре, — по ' + ADVANCED.tokens + ' жетона до конца стройки.' :
        'С открытым центром узлы ★ вокруг берутся за жетоны. Изучено в техцентре: ' + researched + ' из ' + ADVANCED.nodes.length + '.';
      if (view !== 'owned') {
        action = buyButtonHtml({ attrs: 'data-advanced-center', icon: 'icons/icon-coins.jpg?v=2', price: formatShort(cost), have: campaign.coins, cost: cost,
          aria: 'Открыть центр за ' + formatShort(cost) + ' монет', shortText: 'Не хватает ' + formatCompact(Math.max(0, cost - campaign.coins)) + ' монет' });
      }
    } else {
      const node = ADVANCED_NODES[id];
      icon = node.icon;
      name = '★ ' + node.name;
      text = node.text;
      if (view === 'owned') state = 'Работает на этой стройке';
      else if (view === 'office') state = 'Изучите в техцентре: вкладка «★ Продвинутые технологии»';
      else if (view === 'sealed') state = 'Сначала откройте центр звезды';
      else {
        state = 'Жетонов у вас: ' + tokens;
        action = buyButtonHtml({ attrs: 'data-advanced-node="' + id + '"', icon: 'icons/icon-gate-token.jpg', price: String(ADVANCED.tokens), have: tokens,
          cost: ADVANCED.tokens, aria: 'Открыть за ' + ADVANCED.tokens + ' жетона', shortText: 'Не хватает жетонов: нужно ' + ADVANCED.tokens + ', есть ' + tokens });
      }
    }
    tip.innerHTML = '<div class="adv-card' + (view === 'owned' ? ' is-owned' : view === 'office' || view === 'sealed' ? ' is-locked' : '') + '">' +
      '<img class="adv-card-icon" src="icons/' + icon + '" alt="">' +
      '<div class="adv-card-head"><b>' + UI.escapeHtml(name) + '</b><small>' + UI.escapeHtml(state) + '</small></div>' +
      (action ? '<div class="adv-card-buy">' + action + '</div>' : '') + '<p class="adv-card-text">' + UI.escapeHtml(text) + '</p></div>';
  }

  document.getElementById('advanced-tip').addEventListener('click', function (event) {
    const button = event.target.closest('[data-advanced-center], [data-advanced-node]');
    if (!button || !world || campaign.status !== 'play') return;
    const center = button.hasAttribute('data-advanced-center');
    if (button.getAttribute('aria-disabled') === 'true') {
      buyShort(button, center ? 'icons/icon-coins.jpg?v=2' : 'icons/icon-gate-token.jpg');
      return;
    }
    if (center) {
      const cost = advancedCenterCost();
      if (!MB.buyUpgrade(campaign, world, 'advanced')) {
        buyShort(button, 'icons/icon-coins.jpg?v=2');
        return;
      }
      tone(760, 0.12);
      consumeEvents();
      refreshSimEstimate();
      UI.toast({ text: 'Центр открыт: ключевые узлы ★ — по ' + ADVANCED.tokens + ' жетона', icon: 'icons/' + ADVANCED.icon, tone: 'good', key: 'advanced-open' });
    } else {
      const id = button.dataset.advancedNode;
      if (!MB.buyAdvanced(campaign, world, id)) {
        buyShort(button, 'icons/icon-gate-token.jpg');
        return;
      }
      tone(880, 0.14);
      world.events = world.events.filter(function (event) { return event.type !== 'advanced'; });
      UI.toast({ text: '★ «' + ADVANCED_NODES[id].name + '»: ' + ADVANCED_NODES[id].text, icon: 'icons/' + ADVANCED_NODES[id].icon, tone: 'good', key: 'advanced-node' });
      const el = advancedGraph.nodes[id];
      if (el && el.animate) {
        el.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.35)', filter: 'brightness(1.8)' }, { transform: 'scale(1)', filter: 'brightness(1)' }],
          { duration: 700, easing: 'ease-out' });
      }
    }
    hudDirty = true;
    paintHud();
    saveLive({ awaySince: null });
    // The centre bought — the next step is a node; a node bought — its card says it works now.
    if (center) pickAdvanced(advancedNextPick());
    else paintAdvancedTip(true);
  });

  // The graph shows the same lines as the cards: open or not, level, affordable, what opens a closed one.
  // Tokens of this site (2 a construction): the graph's passes and the camp buildings' starts.
  function paintTokens() {
    const tokens = campaign.tokens || 0;
    setText('token-value', String(tokens));
    document.getElementById('tokens').classList.toggle('empty', tokens === 0);
  }

  // ---- gradual HUD and the first meetings (docs/gdd/16-ux-flow.md, «Постепенное раскрытие») ----

  // Tokens pay for passes of the graph, camp buildings and advanced nodes: the pill shows once one of
  // them can take a token (a pass whose block the tech centre has opened, the camp, the advanced
  // graph) or a token has been spent.
  function tokensInPlay() {
    if (Object.keys(campaign.gates || {}).length > 0 || advancedAvailable()) return true;
    if (!document.getElementById('camp-btn').hidden) return true;
    const gates = window.MicroBuildersBalance.gates || {};
    return Object.keys(gates).some(function (id) { return MB.gateResearched(campaign, id, devLineOpen); });
  }

  // «Об уровне» comes with the first site problems (from the third story order, LEVEL_INFO_FROM), with
  // a dot until it is opened once; the token pill comes with the first use of tokens.
  function paintIntroHud() {
    const tokens = document.getElementById('tokens');
    const tokensOn = tokensInPlay();
    if (tokens.hidden === tokensOn) tokens.hidden = !tokensOn;
    const info = document.getElementById('level-info-toggle');
    const infoOn = meta.campaignLevel >= LEVEL_INFO_FROM;
    if (info.hidden === infoOn) info.hidden = !infoOn;
    info.classList.toggle('has-news', infoOn && !meta.flags.levelInfo);
  }

  function techName(id) {
    return Meta.TECH[id] ? Meta.TECH[id].name : id;
  }

  // «Прожекторы» в центре персонала и «Каски с фонарями» в техцентре: names grouped by where they are
  // researched (center: 'personnel' — the personnel centre, the rest — the tech centre).
  function techWhere(ids) {
    const groups = [];
    ids.forEach(function (id) {
      const place = Meta.TECH[id] && Meta.TECH[id].center === 'personnel' ? 'в центре персонала' : 'в техцентре';
      let group = groups.find(function (item) { return item.place === place; });
      if (!group) groups.push(group = { place: place, names: [] });
      group.names.push('«' + techName(id) + '»');
    });
    return groups.map(function (group) { return group.names.join(' и ') + ' ' + group.place; }).join(' и ');
  }

  // «Время на: перекуры 7% · обед 4% · ремонт лесов 2%» under the progress: what the site's problems
  // have taken of the crew's time so far (world.timeLedger, counted as «Об уровне → Тайминги» counts
  // it). It shows with the first loss; a tap opens the timings.
  function paintLossStrip() {
    const strip = document.getElementById('loss-strip');
    const parts = [];
    if (world && campaign.status === 'play') {
      const shares = siteLosses();
      LOSSES.forEach(function (loss) {
        const share = shares[loss[0]] || 0;
        if (share >= 0.005) parts.push('<b>' + loss[1] + ' ' + Math.round(share * 100) + '%</b>');
      });
    }
    const html = parts.length ? '<span>Время на</span>' + parts.join('') : '';
    if (strip.dataset.html === html) return;
    strip.dataset.html = html;
    strip.innerHTML = html;
    if (strip.hidden === !!html) {
      strip.hidden = !html;
      queueSafeArea();
    }
  }

  // Shares of the crew's time on the live site by loss (LOSSES): the need states and the scaffold
  // repairs (a sub-state of the scaffold and the camp rows).
  function siteLosses() {
    return ledgerLosses(world ? world.timeLedger : null);
  }

  function ledgerLosses(ledger) {
    const seconds = {};
    let total = 0;
    Object.keys(ledger || {}).forEach(function (name) {
      Object.keys(ledger[name]).forEach(function (sub) {
        const value = ledger[name][sub];
        total += value;
        if (NEED_STATES.indexOf(name) >= 0) seconds[name] = (seconds[name] || 0) + value;
        if (sub === 'Ремонт лесов') seconds[sub] = (seconds[sub] || 0) + value;
      });
    });
    const shares = {};
    if (total > 0) Object.keys(seconds).forEach(function (key) { shares[key] = seconds[key] / total; });
    return shares;
  }

  // The technology that answers the biggest loss of a site (shares by LOSSES key, from 2% of the
  // crew's time) and passes `accept` (default: open to research now) — the cheapest of its answers; a
  // loss nothing answers yet gives way to the next one. { id, key, share } or null.
  function lossCounter(shares, accept) {
    const ok = accept || function (id) { return Meta.techUnlocked(meta, id); };
    const keys = Object.keys(shares).filter(function (key) { return shares[key] >= 0.02; }).sort(function (a, b) { return shares[b] - shares[a]; });
    for (let i = 0; i < keys.length; i++) {
      const ids = Meta.TECH_ORDER.filter(function (id) {
        const spec = Meta.TECH[id];
        return !!spec.opens && LOSS_LINES[spec.opens[0]] === keys[i] && ok(id);
      }).sort(function (a, b) { return Meta.techCost(a) - Meta.techCost(b); });
      if (ids.length) return { id: ids[0], key: keys[i], share: shares[keys[i]] };
    }
    return null;
  }

  function techPlace(id) {
    const center = Meta.TECH[id].center;
    return center === 'personnel' ? 'в центре персонала' : center === 'reactor' ? 'в реакторе' : 'в техцентре';
  }

  // «На этой стройке: перекуры 7% времени бригады» on a counter-technology (LOSS_LINES).
  function techLossText(id) {
    const key = LOSS_LINES[Meta.TECH[id] && Meta.TECH[id].opens ? Meta.TECH[id].opens[0] : ''];
    if (!key || !world || !campaign || campaign.status !== 'play') return '';
    if (key === 'night') {
      if (!MB.needOpen(campaign, 'night')) return '';
      return 'Ночью на этой стройке: работа −' + environmentEffects('').nightSlow + '%';
    }
    const share = siteLosses()[key] || 0;
    if (share < 0.005) return '';
    const loss = LOSSES.find(function (row) { return row[0] === key; });
    return 'На этой стройке: ' + loss[1] + ' ' + Math.round(share * 100) + '% времени бригады';
  }

  function techLossHtml(id) {
    const text = techLossText(id);
    return text ? '<p class="tech-loss">' + UI.escapeHtml(text) + '</p>' : '';
  }

  // «Об уровне → Тайминги»: where the crew's time goes on this site.
  function openTimings() {
    if (!meta.flags.levelInfo) {
      meta.flags.levelInfo = true;
      Meta.save(meta);
      // The dot goes at once, as on a tap of «i» (the HUD tick would take it off later).
      document.getElementById('level-info-toggle').classList.remove('has-news');
    }
    setLevelInfo(true);
    setLevelInfoTab('time');
  }

  // A pass of the graph opened for tokens («Открыть за 1 жетон» in its tip).
  function openGate(id) {
    if (!world || campaign.status !== 'play') return false;
    const gate = (window.MicroBuildersBalance.gates || {})[id];
    if (!MB.buyGate(campaign, id, devLineOpen)) {
      if (gate && !MB.gatePassed(campaign, id) && !MB.gateResearched(campaign, id, devLineOpen)) {
        const needs = gateEntryTechs(id);
        UI.toast({ text: 'Проход «' + gate.name + '» закрыт: изучите в техцентре хотя бы одну технологию его блока' + (needs ? ' — начните с ' + needs : ''),
          icon: 'lock', tone: 'warn', key: 'gate-empty', duration: 2600 });
      } else if (gate && MB.gateOpenable(campaign, id, devLineOpen)) {
        UI.toast({ text: 'Не хватает жетонов: нужно ' + (gate.tokens || 1) + ', есть ' + (campaign.tokens || 0), icon: 'icons/icon-gate-token.jpg', tone: 'warn', key: 'tokens-short', duration: 2200 });
      }
      return false;
    }
    tone(760, 0.12);
    UI.toast({ text: 'Проход «' + gate.name + '» открыт', icon: 'icons/icon-gate-token.jpg', tone: 'good', key: 'gate-open' });
    const pill = document.getElementById('tokens');
    pill.classList.remove('pulse');
    void pill.offsetWidth;
    pill.classList.add('pulse');
    hudDirty = true;
    paintHud();
    saveLive({ awaySince: null });
    return true;
  }
  window.MicroBuildersUpgradeGraph.onGate = openGate;

  // The tip of a tapped line: the site's estimate (MicroBuildersSim, as «Об уровне» counts the income)
  // with one more level of it — «до сдачи ~6 мин → ~5 мин»; a line that does not speed the site up
  // shows its income instead («доход ~1,2 тыс → ~1,4 тыс монет/мин»). Nothing when the model sees no gain.
  window.MicroBuildersUpgradeGraph.impact = function (kind) {
    const session = window.MicroBuildersBalance.session[kind];
    const summary = world ? simSummaries.get(world.level) : null;
    if (!summary || !simEstimate || campaign.status !== 'play' || !session || campaign.purchases[kind] >= session.max) return '';
    const level = campaign.purchases[kind];
    let next = null;
    campaign.purchases[kind] = level + 1;
    try {
      next = MicroBuildersSim.estimate(summary, campaign);
    } finally {
      campaign.purchases[kind] = level;
    }
    const now = simEstimate;
    const faster = now.cubesPerMinute > 0 ? next.cubesPerMinute / now.cubesPerMinute - 1 : 0;
    if (faster > 0.01 && world.remaining > 0) {
      const was = waitWords(world.remaining / now.cubesPerMinute * 60);
      const will = waitWords(world.remaining / next.cubesPerMinute * 60);
      return was === will ? 'стройка быстрее на ' + Math.max(1, Math.round(faster * 100)) + '%' : 'до сдачи ~' + was + ' → ~' + will;
    }
    if (next.coinsPerMinute > now.coinsPerMinute * 1.01) {
      return 'доход ~' + formatRate(now.coinsPerMinute) + ' → ~' + formatRate(next.coinsPerMinute) + ' монет/мин';
    }
    return '';
  };

  // A line the dev panel's group switch opens (upgradeLineOpen): its pass counts as researched.
  function devLineOpen(kind) {
    const button = document.getElementById('up-' + kind);
    return !!button && campaign.devGroups[button.dataset.group] === true;
  }

  // «Дроны» — the tech center's technologies that open the way into a pass's block (logic.js →
  // gateEntries): every other technology of the block comes after one of them.
  function gateEntryTechs(id) {
    const lines = MB.gateEntries(id);
    return Meta.TECH_ORDER.filter(function (tech) {
      const spec = Meta.TECH[tech];
      return !spec.center && (spec.opens || []).some(function (kind) { return lines.indexOf(kind) >= 0; });
    }).map(function (tech) { return '«' + Meta.TECH[tech].name + '»'; }).join(' или ');
  }

  function paintUpgradeGraph() {
    const session = window.MicroBuildersBalance.session;
    const gates = window.MicroBuildersBalance.gates || {};
    Object.keys(gates).forEach(function (id) {
      const s = graphStates[id] || (graphStates[id] = {});
      s.passed = MB.gatePassed(campaign, id);
      // Nothing of its block researched in the tech center: shut, nothing behind it shows.
      s.researched = MB.gateResearched(campaign, id, devLineOpen);
      if (!s.researched && s.needs === undefined) s.needs = gateEntryTechs(id);
      s.cost = gates[id].tokens || 1;
      s.ready = !s.passed && MB.gateOpenable(campaign, id, devLineOpen) && (campaign.tokens || 0) >= s.cost;
    });
    Object.keys(session).forEach(function (kind) {
      const button = document.getElementById('up-' + kind);
      if (!button) return;
      const group = button.dataset.group;
      const open = upgradeLineOpen(kind, group);
      const s = graphStates[kind] || (graphStates[kind] = {});
      s.state = open ? 'open' : 'office';
      s.level = campaign.purchases[kind];
      s.maxed = s.level >= session[kind].max;
      s.ready = open && button.classList.contains('ready');
      s.lockText = open ? '' : upgradeLockText(kind, group);
    });
    window.MicroBuildersUpgradeGraph.paint(graphStates);
  }

  function upgradeLockText(kind, group) {
    if (taxiTooLow(kind) && Meta.sessionLineOpen(meta, kind)) {
      return 'когда здание поднимется до ' + MB.TAXI_FLOORS + ' этажей (сейчас ' + (MB.TAXI_FLOORS - MB.taxiFloorsShort(world)) + ')';
    }
    if (DRONE_GATED_GROUPS.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return 'после первого дрона';
    const source = Meta.SESSION_LINE[kind];
    const tech = techOf(source);
    if (tech) return 'в техцентре: «' + Meta.TECH[tech].name + '»';
    if (source && source.indexOf('hq:') === 0 && Meta.PROJECTS[source.slice(3)]) return 'после постройки «' + Meta.PROJECTS[source.slice(3)].name + '»';
    return '';
  }

  // The cost pill fills up as the coins save up toward the price.
  function paintDockFill(coins) {
    const cards = document.querySelectorAll('#upgrade-dock .upgrade:not([hidden])');
    for (let i = 0; i < cards.length; i++) {
      const button = cards[i];
      const cost = Number(button.dataset.cost);
      const fill = !cost || button.classList.contains('ready') ? '100%' : Math.min(100, Math.floor(coins / cost * 100)) + '%';
      if (button.dataset.fill === fill) continue;
      button.dataset.fill = fill;
      button.querySelector('em').style.setProperty('--fill', fill);
    }
  }

  // Big values drop their decimals («298,7» → «299») so the pair fits a card.
  function upgradeNumber(value, digits, trim) {
    const text = value.toFixed(Math.abs(value) >= 100 ? 0 : digits).replace('.', ',');
    return trim && text.indexOf(',') >= 0 ? text.replace(/0+$/, '').replace(/,$/, '') : text;
  }

  // «было → станет единица» with meta applied: «12 → 18 кг», «×1,2 → ×1,4», «2,0 → 2,5 кг/с».
  // A maxed line shows only its value.
  function upgradeLabel(kind) {
    const level = campaign.purchases[kind];
    const maxed = level >= window.MicroBuildersBalance.session[kind].max;
    let current = MB.upgradeValue(campaign, kind, level);
    let next = MB.upgradeValue(campaign, kind, level + 1);
    if (kind === 'gather' || kind === 'droneBuild') {
      const foremen = campaign.foremen || {};
      const scale = kind === 'gather'
        ? campaign.metaPickupSpeed * (foremen.droneGather ? foremen.droneGather.value : 1)
        : campaign.metaPlaceSpeed * (foremen.machines ? foremen.machines.second : 1);
      current *= scale;
      next *= scale;
    }
    let digits = 2;
    let trim = true;
    let prefix = '';
    let unit = '';
    if (kind === 'builders' || kind === 'vehicles') {
      const count = kind === 'builders' ? campaign.builderCount : campaign.vehicleCount;
      next = count + next - current;
      current = count;
      digits = 0;
    } else if (kind === 'scaffold') {
      current = MB.SCAFFOLD.erectSeconds / current;
      next = MB.SCAFFOLD.erectSeconds / next;
      digits = 1;
      trim = false;
      unit = ' с';
    } else if (CAP_TEXTS[kind] || kind === 'reactor') {
      digits = 0;
      prefix = 'ур. ';
    } else if (kind === 'speed' || kind === 'gather' || kind === 'droneBuild' || kind === 'pickup') {
      digits = 1;
      trim = false;
      unit = ' кг/с';
    } else if (kind === 'horizontal' || kind === 'vertical' || kind === 'loaderSpeed' || kind === 'heliSpeed' || kind === 'droneSpeed') {
      digits = 1;
      trim = false;
      unit = ' м/с';
    } else if (kind === 'elevatorSpeed') {
      // The air taxi's speed: how many times its first level (the formula is seconds, less is faster).
      const base = MB.upgradeValue(campaign, 'elevatorSpeed', 0);
      current = base / current;
      next = base / next;
      digits = 2;
      prefix = '×';
    } else if (kind === 'boomSpeed') {
      trim = false;
      unit = ' с';
    } else if (kind === 'carry' || kind === 'loaderMass' || kind === 'heliMass') {
      digits = 0;
      unit = ' кг';
    } else if (kind === 'cubeCapital') {
      digits = 0; prefix = '+'; unit = ' кап./находку';
    } else if (kind === 'loungeSeats' || kind === 'dormBeds') {
      digits = 0;
      prefix = '+';
      const count = maxed ? current : next;
      unit = kind === 'loungeSeats' ? ' ' + UI.plural(count, 'место', 'места', 'мест') : ' ' + UI.plural(count, 'койка', 'койки', 'коек');
    } else if (kind === 'freeBuy' || kind === 'triplePay' || kind === 'floorPay') {
      current *= 100;
      next *= 100;
      digits = 1;
      unit = '%';
    } else if (kind === 'plan') {
      digits = 0;
      unit = ' ' + UI.plural(maxed ? current : next, 'мини-куб', 'мини-куба', 'мини-кубов');
    } else if (kind === 'vehicleHeight' || kind === 'elevatorHeight') {
      digits = 0;
      unit = ' эт.';
    } else if (kind === 'engineers' || kind === 'helicopters' || kind === 'elevators' || kind === 'patternHeight' || kind === 'bucket' || kind === 'vehicleReach' || kind === 'heliWidth' || kind === 'heliHeight') {
      digits = 0;
    } else if (kind === 'satiety' || kind === 'hireXp' || kind === 'tokenBuy') {
      digits = 0;
      prefix = '+';
      unit = kind === 'satiety' ? ' с сытости' : kind === 'hireXp' ? ' опыта' : ' ' + UI.plural(maxed ? current : next, 'жетон', 'жетона', 'жетонов');
    } else if (kind === 'mealFast' || kind === 'sleepFast') {
      digits = 0;
      prefix = '−';
      unit = ' с';
    } else if (kind === 'deckWalk' || kind === 'nightGear' || kind === 'winterGear' || kind === 'rainTents' || kind === 'heatGear' || kind === 'rankFast') {
      // The share of a penalty taken away (rankFast — of the experience a rank asks).
      if (kind === 'rankFast') {
        current = 1 - current;
        next = 1 - next;
      }
      current *= 100;
      next *= 100;
      digits = 0;
      prefix = '−';
      unit = kind === 'rankFast' ? '% опыта' : '% штрафа';
    } else if (kind === 'willpower' || kind === 'cubeGift') {
      current *= 100;
      next *= 100;
      digits = 0;
      unit = '%';
    } else {
      prefix = '×';
    }
    const now = prefix + upgradeNumber(current, digits, trim);
    return maxed ? now + unit : now + ' → ' + prefix + upgradeNumber(next, digits, trim) + unit;
  }

  // Unaffordable and maxed cards stay tappable (aria-disabled) so a tap can say why.
  function paintUpgrade(kind, label, cost) {
    const max = window.MicroBuildersBalance.session[kind].max;
    const level = campaign.purchases[kind];
    const maxed = level >= max;
    // A camp building's level above what the personnel centre allows waits for its upgrade there.
    const capped = !maxed && siteUpgradeCapped(kind);
    setUpgradeLabel(kind, label);
    setText(kind + '-cost', maxed ? 'Максимум' : capped ? 'Центр персонала' : campaign.freePurchases ? '0' : formatCompact(cost));
    // The level sits as a small number in the icon's corner (none before the first level).
    setText(kind + '-level', level > 0 ? String(level) : '');
    const button = document.getElementById('up-' + kind);
    if (button.classList.contains('locked')) {
      button.classList.remove('locked');
      button.title = '';
    }
    const ready = (campaign.freePurchases || campaign.coins >= cost) && campaign.status !== 'won' && !maxed && !capped;
    if (CAP_TEXTS[kind]) button.title = capped ? capText(kind) : '';
    button.classList.toggle('ready', ready);
    button.classList.toggle('maxed', maxed);
    const disabled = ready ? 'false' : 'true';
    if (button.getAttribute('aria-disabled') !== disabled) button.setAttribute('aria-disabled', disabled);
    button.dataset.cost = maxed ? '' : String(cost);
    if (button.disabled) button.disabled = false;
  }

  // «33 → 39 кг» with the value after the purchase in green.
  function setUpgradeLabel(kind, label) {
    const el = document.getElementById(kind + '-label');
    if (!el || (el.dataset.raw === label && el.textContent === label)) return;
    el.dataset.raw = label;
    const parts = label.split(' → ');
    if (parts.length === 2) el.innerHTML = UI.escapeHtml(parts[0]) + ' → <b class="up-next">' + UI.escapeHtml(parts[1]) + '</b>';
    else el.textContent = label;
  }

  // The technology that opens a closed dock line (Meta.SESSION_LINE), or '' when an HQ building
  // opens it, nothing does yet, or its machine tab still waits for the first drone.
  function dockLockNode(kind, group) {
    if (taxiTooLow(kind)) return '';
    if (DRONE_GATED_GROUPS.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return '';
    if (MB.lineGated(campaign, kind)) return '';
    return techOf(Meta.SESSION_LINE[kind]);
  }

  // 'tech:routes' → 'routes'; '' for any other source.
  function techOf(source) {
    return source && source.indexOf('tech:') === 0 ? source.slice(5) : '';
  }

  // A closed line as a locked card: «Ноша · «Грузовые ремни» · 🔒 Техцентр». A tap says it in full.
  function paintLockedUpgrade(kind, node) {
    const button = document.getElementById('up-' + kind);
    setText(kind + '-label', '«' + Meta.TECH[node].name + '»');
    setText(kind + '-level', '');
    setText(kind + '-cost', 'Техцентр');
    button.classList.remove('ready', 'maxed');
    button.classList.add('locked');
    if (button.getAttribute('aria-disabled') !== 'true') button.setAttribute('aria-disabled', 'true');
    button.dataset.cost = '';
    button.title = upgradeName(kind) + ' откроется в техцентре: «' + Meta.TECH[node].name + '»';
  }

  // A bought level: the card flashes gold and «−1,2 тыс» floats from the coin counter; a level that
  // cost nothing flashes green «Бесплатно!» («Подарок!» from «Подрядчик»).
  function onUpgradeEvent(event) {
    hudDirty = true;
    const button = document.getElementById('up-' + event.kind);
    if (event.free) {
      flashCard(button, event.freeBy === 'gift' ? 'Подарок!' : 'Бесплатно!', 'free');
      return;
    }
    flashCard(button, '', 'paid');
    if (!campaign.freePurchases && event.cost > 0) floatCoins('−' + formatShort(event.cost), 'spend');
  }

  function flashCard(button, label, kind) {
    if (!button || !button.animate) return;
    const glow = kind === 'free' ? '143, 227, 159' : '255, 214, 120';
    button.animate([
      { boxShadow: '0 0 0 3px rgba(' + glow + ', 1), 0 0 24px rgba(' + glow + ', 0.9)', filter: 'brightness(1.4)' },
      { boxShadow: '0 3px 0 rgba(0, 0, 0, 0.35)', filter: 'brightness(1)' },
    ], { duration: 650, easing: 'ease-out' });
    if (!label) return;
    const tag = document.createElement('b');
    tag.className = 'upgrade-flash';
    tag.textContent = label;
    button.appendChild(tag);
    const anim = tag.animate([
      { opacity: 0, transform: 'translate(-50%, -30%) scale(0.6)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.18 },
      { opacity: 1, transform: 'translate(-50%, -62%) scale(1)', offset: 0.75 },
      { opacity: 0, transform: 'translate(-50%, -95%) scale(1)' },
    ], { duration: 1200, easing: 'ease-out' });
    anim.onfinish = function () { tag.remove(); };
  }

  // ---------- purchase buttons (docs/tech/interface.md «Кнопка покупки») ----------
  // One price pill for every upgrade bought outside the dock (building sheets, HQ panels), as the
  // dock's own: green when it can be bought; dark with a gold fill of what is saved up when not —
  // still tappable, the tap shakes it and says what is short; pressed it sinks; a purchase flashes
  // its card gold and «−N» floats from the wallet. Locked (no technology, no copies) — grey, disabled.
  // spec: { attrs (data-… of the action), price (html after the icon), icon, have, cost, short
  // (overrides have < cost), shortText (the tap's toast), label, aria, locked, wide }
  function buyButtonHtml(spec) {
    const short = !spec.locked && (spec.short !== undefined ? spec.short : spec.have < spec.cost);
    const fill = short ? Math.max(0, Math.min(99, Math.floor((spec.have || 0) / Math.max(1, spec.cost) * 100))) : 100;
    return '<button type="button" class="buy-btn' + (short ? ' short' : '') + (spec.wide ? ' wide' : '') + '" ' + spec.attrs +
      (spec.aria ? ' aria-label="' + UI.escapeHtml(spec.aria) + '"' : '') +
      (spec.locked ? ' disabled' : short ? ' aria-disabled="true" data-short="' + UI.escapeHtml(spec.shortText || 'Не хватает') + '"' : '') +
      ' style="--fill:' + fill + '%">' + (spec.label ? '<span>' + UI.escapeHtml(spec.label) + '</span>' : '') +
      '<img class="currency-icon" src="' + spec.icon + '" alt="">' + spec.price + '</button>';
  }

  // A tap on a price not saved up yet.
  function buyShort(button, icon) {
    shake(button);
    UI.toast({ text: button.dataset.short || 'Не хватает', icon: icon, tone: 'warn', key: 'buy-short', duration: 1800 });
  }

  // After the re-render: the card with `selector` flashes and «−N» floats from the wallet.
  function buyFlash(selector, spent, hostId) {
    const el = document.querySelector(selector);
    flashCard(el && el.closest('.canteen-dish, .meta-card'), '', 'paid');
    if (spent > 0) floatCoins('−' + formatShort(spent), 'spend', hostId);
    tone(680, 0.09);
  }

  // Office capital finds (Meta.onBlocksPlaced) go straight to the treasury; the session HUD shows
  // no company currencies, and chests announce themselves in paintChest.
  function showPlacementRewards(result) {
    (result.expertise || []).forEach(function (change) {
      UI.toast({ text: Meta.CARDS[change.id].name + ': экспертиза ' + change.level,
        icon: 'icons/icon-foreman-' + change.id + '.jpg?v=3', key: 'expertise:' + change.id, duration: 2400 });
      hudDirty = true;
    });
    return result;
  }

  // ---- chests 25% / 50% ----

  function paintChest(el, threshold, done, storyChest) {
    const claimed = meta.claimedChests[world.level.index + ':' + threshold] === 1;
    const ready = storyChest && !claimed && done * 100 >= world.level.blocks.length * threshold;
    if (el.hidden === storyChest) el.hidden = !storyChest;
    el.classList.toggle('ready', ready);
    el.classList.toggle('claimed', claimed);
    el.classList.toggle('locked', storyChest && !ready && !claimed);
    el.disabled = claimed;
    if (ready) announceChest(el, threshold);
    if (claimed && chestToasts[threshold]) {
      chestToasts[threshold].close();
      chestToasts[threshold] = null;
    }
  }

  // A chest that just got ready bounces and says so once per run: «Сундук 25% готов!» · «Открыть».
  function announceChest(el, threshold) {
    let announced = chestAnnounced.get(campaign);
    if (!announced) {
      announced = [];
      chestAnnounced.set(campaign, announced);
    }
    if (announced.indexOf(threshold) >= 0 || currentScreen !== 'build' || UI.overlay.count() > 0) return;
    announced.push(threshold);
    if (el.animate) {
      el.animate([
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: 'translate(-50%, -78%) scale(1.3)', offset: 0.35 },
        { transform: 'translate(-50%, -50%) scale(0.92)', offset: 0.7 },
        { transform: 'translate(-50%, -50%) scale(1)' },
      ], { duration: 700, iterations: 3, easing: 'ease-out' });
    }
    tone(660, 0.08);
    setTimeout(function () { tone(990, 0.1); }, 110);
    const owner = campaign;
    chestToasts[threshold] = UI.toast({
      text: 'Сундук ' + threshold + '% готов!',
      icon: 'icons/icon-chest-' + threshold + '.jpg',
      className: 'toast-chest',
      tone: 'gold',
      priority: 2,
      duration: 6000,
      key: 'chest-' + threshold,
      action: { label: 'Открыть', onClick: function () { if (campaign === owner) openChest(threshold); } },
    });
  }

  // A tap on a chest opens it; a closed one says when it opens: «Откроется на 25% стройки».
  function tapChest(threshold) {
    if (!world || campaign.runMode !== 'campaign' || !Meta.chestsOpen(world.level.index)) return;
    if (meta.claimedChests[world.level.index + ':' + threshold] === 1) return;
    if ((world.level.blocks.length - world.remaining) * 100 < world.level.blocks.length * threshold) {
      shake(document.getElementById('chest-' + threshold));
      UI.toast({ text: 'Откроется на ' + threshold + '% стройки', icon: 'icons/icon-chest-' + threshold + '.jpg', className: 'toast-chest', key: 'chest-locked', duration: 1800 });
      return;
    }
    openChest(threshold);
  }

  function openChest(threshold) {
    const reward = Meta.claimChest(meta, world.level.index, threshold);
    if (!reward) return;
    tone(523, 0.08);
    showChestReveal('chest-' + threshold, 'Сундук ' + threshold + '%', 'Сундук открыт', chestPrizes(reward));
    paintHud();
  }

  function chestPrizes(reward) {
    return '<div class="chest-prizes">' +
      '<div class="prize-fly prize-capital"><img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt=""><b>+' + reward.capital + '</b><small>капитала</small></div>' +
      (reward.card ? cardPrize(reward) : '') + '</div>' +
      '<p class="complete-note">Капитал уже в казне компании.</p>';
  }

  // The crew of a running order is locked, so the very first card (level 3) starts with the next one.
  function cardPrize(card) {
    const note = card.first ? '' : ' · ' + (card.isNew ? 'новый!' : '+1 копия');
    return '<div class="prize-fly prize-card rarity-' + card.rarity + '"><img src="icons/icon-foreman-' + card.cardId + '.jpg?v=3" alt=""><b>' + card.cardName +
      '</b><small>' + card.rarityName + note + '</small>' +
      (card.first ? '<small class="prize-note">Первый бригадир! Выйдет на смену со следующего заказа</small>' : '') + '</div>';
  }

  // Chest and recruit reveals are windows of the overlay system; two at once wait in the queue.
  function showChestReveal(id, kicker, title, html) {
    UI.overlay.open({
      id: id,
      type: 'dialog',
      className: 'chest-reveal',
      queue: true,
      kicker: kicker,
      title: title,
      body: html,
      actions: [{ label: 'Забрать', primary: true }],
    });
  }

  // source: 'recruiting' (the recruiting center), 'chest25' / 'chest50'.
  function showCardReveal(card, source) {
    const recruit = source === 'recruiting';
    showChestReveal(recruit ? 'recruit-reveal' : 'chest-card', recruit ? 'Новый бригадир' : 'Сундук ' + (source === 'chest25' ? 25 : 50) + '%',
      recruit ? 'Бригадир нанят' : 'Сундук открыт', '<div class="chest-prizes">' + cardPrize(card) + '</div>');
  }

  // Level info sheet: every material of the level with cube weight and built / total counts,
  // heaviest first.
  function paintLevelInfo() {
    const panel = document.getElementById('level-info');
    if (!world || panel.hidden) return;
    const level = world.level;
    const counts = new Map();
    const byWeight = level.materialIds.slice().sort(function (a, b) { return MB.MATERIAL[b].weight - MB.MATERIAL[a].weight; });
    for (let i = 0; i < byWeight.length; i++) {
      counts.set(byWeight[i], { total: 0, built: 0 });
    }
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (!counts.has(block.materialId)) counts.set(block.materialId, { total: 0, built: 0 });
      const count = counts.get(block.materialId);
      count.total += 1;
      if (block.built) count.built += 1;
    }
    let totalCubes = 0;
    let builtCubes = 0;
    let totalMass = 0;
    let builtMass = 0;
    let rows = '';
    counts.forEach(function (count, materialId) {
      if (count.total === 0) return;
      const material = MB.MATERIAL[materialId];
      totalCubes += count.total;
      builtCubes += count.built;
      totalMass += count.total * material.weight;
      builtMass += count.built * material.weight;
      const done = count.built === count.total;
      rows += '<li' + (done ? ' class="done"' : '') + '>' +
        '<i style="background:#' + material.color.toString(16).padStart(6, '0') + '"></i>' +
        '<span class="level-info-name"><b>' + material.name + '</b><small>' + (material.accent ? 'отделка · ' : '') +
        material.weight.toLocaleString('ru-RU') + ' кг за куб</small></span>' +
        '<span class="level-info-count"><b>' + count.built + '</b> / ' + count.total + '</span>' +
        '<span class="level-info-bar"><em style="width:' + (count.built / count.total * 100) + '%"></em></span>' +
        '</li>';
    });
    const title = document.querySelector('[data-overlay="level-info"] .overlay-head h2');
    if (title && title.textContent !== hudLevelTitle()) title.textContent = hudLevelTitle();
    if (!document.getElementById('level-info-time').hidden) paintLevelTimings();
    document.getElementById('level-info-summary').innerHTML =
      '<span>Построено <b>' + builtCubes + ' / ' + totalCubes + '</b> кубов</span>' +
      '<span>Масса <b>' + builtMass.toLocaleString('ru-RU') + ' / ' + totalMass.toLocaleString('ru-RU') + '</b> кг</span>' +
      '<span>Стройка идёт <b>' + UI.formatDuration(campaign.levelElapsed) + '</b></span>';
    document.getElementById('level-info-rows').innerHTML = rows;
    if (!simEstimate) refreshSimEstimate();
    document.getElementById('level-info-sim').innerHTML =
      '<span class="sim-coins"><img class="currency-icon" src="icons/icon-coins.jpg?v=2" alt=""><b>' +
      formatRate(simEstimate.coinsPerMinute) + '</b> монет/мин</span>' +
      '<span><b>' + formatRate(simEstimate.massPerMinute) + '</b> кг/мин</span>';
  }

  function setLevelInfoTab(tab) {
    const buttons = document.querySelectorAll('#level-info-tabs button');
    for (let i = 0; i < buttons.length; i++) buttons[i].classList.toggle('on', buttons[i].dataset.tab === tab);
    document.getElementById('level-info-main').hidden = tab !== 'main';
    document.getElementById('level-info-time').hidden = tab !== 'time';
    paintLevelInfo();
  }

  // «По прокачкам»: which session upgrades shorten each category of logic's timeCategories.
  const TIME_CATEGORY_UPGRADES = {
    'Горизонтальное движение': ['horizontal'],
    'Подъёмы и спуски': ['vertical'],
    'Аэротакси': ['elevatorSpeed', 'elevators'],
    'Перегруз': ['carry', 'lightCarry'],
    'Набор материала': ['pickup'],
    'Укладка': ['speed'],
    'Леса и проходы': ['scaffold'],
    'План работ': ['plan'],
    'Перекур': ['smokeRare', 'smokeShort', 'lounge', 'loungeSeats', 'smokePath'],
    'Обед': ['kitchen', 'portions'],
    'Сон': ['dorm', 'dormBeds', 'dormSleep'],
    'Городок': ['kitchen', 'campPrefab'],
  };

  function setTimeCategories(on) {
    try {
      if (on) window.localStorage.setItem(TIME_CATEGORIES_KEY, '1');
      else window.localStorage.removeItem(TIME_CATEGORIES_KEY);
    } catch (error) { /* private mode: the choice lasts until reload */ }
    paintLevelInfo();
  }

  // «Тайминги»: worker-seconds per state and sub-state from logic's time ledger, biggest first;
  // with «По прокачкам» the same seconds come from the category ledger instead.
  function paintLevelTimings() {
    const byUpgrade = document.getElementById('level-time-categories').checked;
    const ledger = byUpgrade ? world.timeCategories : world.timeLedger;
    document.getElementById('level-info-time-label').textContent = byUpgrade
      ? 'Время рабочих по прокачкам, сумма по бригаде'
      : 'Время рабочих по состояниям, сумма по бригаде';
    const states = [];
    let total = 0;
    Object.keys(ledger).forEach(function (name) {
      const subs = Object.keys(ledger[name]).map(function (sub) {
        return { name: sub, seconds: ledger[name][sub] };
      }).sort(function (a, b) { return b.seconds - a.seconds; });
      let seconds = 0;
      for (let i = 0; i < subs.length; i++) seconds += subs[i].seconds;
      total += seconds;
      states.push({ name: name, seconds: seconds, subs: subs });
    });
    states.sort(function (a, b) { return b.seconds - a.seconds; });
    let crew = 0;
    for (let i = 0; i < world.builders.length; i++) if (world.builders[i].trade !== 'engineer') crew += 1;
    document.getElementById('level-info-time-summary').innerHTML =
      '<span>Стройка идёт <b>' + formatSpan(campaign.levelElapsed) + '</b></span>' +
      '<span>Рабочих <b>' + crew + '</b></span>' +
      '<span>Всего <b>' + formatSpan(total) + '</b> рабочего времени</span>';
    const share = function (seconds) {
      return total > 0 ? (seconds / total * 100).toFixed(1).replace('.', ',') + '%' : '—';
    };
    let rows = '';
    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      let subs = '';
      for (let j = 0; j < state.subs.length; j++) {
        const sub = state.subs[j];
        subs += '<li><b>' + sub.name + '</b><span>' + formatSpan(sub.seconds) + '</span><em>' + share(sub.seconds) + '</em></li>';
      }
      const upgrades = byUpgrade ? TIME_CATEGORY_UPGRADES[state.name] : null;
      const hint = upgrades
        ? '<small>' + (upgrades.length > 1 ? 'Прокачки: ' : 'Прокачка: ') + upgrades.map(upgradeName).join(', ') + '</small>'
        : '';
      rows += '<li>' +
        '<div class="level-time-head"><b>' + state.name + '</b><span>' + formatSpan(state.seconds) + '</span><em>' + share(state.seconds) + '</em>' + hint + '</div>' +
        '<div class="level-time-bar"><i style="width:' + (total > 0 ? state.seconds / total * 100 : 0) + '%"></i></div>' +
        '<ul class="level-time-sub">' + subs + '</ul>' +
        '</li>';
    }
    document.getElementById('level-info-time-rows').innerHTML = rows || '<li>Рабочие ещё не начали</li>';
  }

  // Durations: «45 с», «12 мин 05 с», «2 ч 07 мин».
  function formatSpan(seconds) {
    const whole = Math.round(seconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor(whole % 3600 / 60);
    const rest = whole % 60;
    const pad = function (value) { return (value < 10 ? '0' : '') + value; };
    if (hours > 0) return hours + ' ч ' + pad(minutes) + ' мин';
    if (minutes > 0) return minutes + ' мин ' + pad(rest) + ' с';
    return rest + ' с';
  }

  function refreshSimEstimate() {
    simElapsed = 0;
    if (!world) return;
    let summary = simSummaries.get(world.level);
    if (!summary) {
      summary = MicroBuildersSim.summarizeLevel(world.level);
      simSummaries.set(world.level, summary);
    }
    simEstimate = MicroBuildersSim.estimate(summary, campaign);
  }

  // Big idle numbers: 9 999 as is, then «12,5 тыс», «3,2 млн», «1,6 млрд», «4 трлн».
  function formatCompact(value) {
    const COMPACT_UNITS = [[1e12, 'трлн'], [1e9, 'млрд'], [1e6, 'млн'], [1e4, 'тыс']];
    const number = Math.round(value);
    for (let i = 0; i < COMPACT_UNITS.length; i++) {
      const unit = COMPACT_UNITS[i];
      const divisor = unit[0] === 1e4 ? 1e3 : unit[0];
      if (number >= unit[0]) {
        const scaled = number / divisor;
        const digits = scaled >= 100 ? 0 : 1;
        return scaled.toFixed(digits).replace('.', ',').replace(/,0$/, '') + ' ' + unit[1];
      }
    }
    return number.toLocaleString('ru-RU');
  }

  function formatRate(value) {
    if (value >= 100) return formatCompact(value);
    return value.toFixed(1).replace('.', ',');
  }

  // «Об уровне» is a window of the overlay system around the #level-info content. Between openings
  // the content waits hidden in the page, so the HUD tick finds it by id while the window is open.
  function setLevelInfo(open) {
    const content = document.getElementById('level-info');
    if (!open) {
      UI.overlay.close('level-info');
      return;
    }
    UI.overlay.open({
      id: 'level-info',
      type: 'sheet',
      className: 'level-info-window',
      kicker: 'Об уровне',
      title: hudLevelTitle(),
      body: function (bodyEl) {
        content.hidden = false;
        bodyEl.appendChild(content);
      },
      onClose: function () {
        content.hidden = true;
        document.body.appendChild(content);
      },
    });
    paintLevelInfo();
  }

  // Start card: one line under the HUD for a few seconds, a tap dismisses it.
  // «Ур. 9 · Цитадель · 442 куба», «Контракт 4 · Цитадель · лимит 18:00», «Стройка штаба · Биржа — …».
  function showBanner() {
    const level = world.level;
    const cubes = level.blocks.length;
    const size = '· ' + cubes.toLocaleString('ru-RU') + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов');
    let spec = { title: 'Ур. ' + level.number + ' · ' + level.name, text: size };
    if (campaign.runMode === 'hq') {
      const project = Meta.PROJECTS[campaign.runPayload.projectId];
      spec = {
        title: 'Стройка штаба · ' + project.name,
        text: (project.opened ? '— откроет ' + project.opened + '. ' : '— ') + 'Основной заказ подождёт.',
      };
    } else if (campaign.runMode === 'contract') {
      spec = { title: siteKicker('contract', campaign.levelIndex) + ' · ' + level.name, text: '· лимит ' + MB.formatClock(Meta.contractLimitSeconds(meta)) };
    } else if (campaign.runMode === 'school') {
      spec = { title: 'Школа · ' + level.name, text: 'Ступень ' + campaign.runPayload.tier + ' · лимит ' + MB.formatClock(trialLimit(campaign)) };
    } else if (campaign.runMode === 'exchange') {
      spec = { title: 'Заказ биржи · ' + level.name, text: size };
    }
    if (bannerToast) bannerToast.close();
    bannerToast = UI.toast(Object.assign(spec, { icon: 'build', className: 'toast-banner', priority: 2, duration: 3200, key: 'start-banner' }));
  }

  // ---------- completion ----------
  // A finished site is settled at once, wherever it finished (live or while the player was away):
  // chests nobody opened are claimed first (Meta.onLevelComplete stops reporting them), the rewards
  // are paid, and the slot keeps the site as 'complete' with the reward summary. So a finished site
  // is never restored as a running one and is never paid twice.
  function settleCompletion(key, c, w, offline) {
    const chests = [];
    if (c.runMode === 'campaign' && Meta.chestsOpen(w.level.index)) {
      [25, 50].forEach(function (threshold) {
        const prize = Meta.claimChest(meta, w.level.index, threshold);
        if (prize) chests.push(Object.assign({ threshold: threshold }, prize));
      });
    }
    const reward = Meta.onLevelComplete(meta, c, w);
    reward.key = key;
    reward.chests = chests;
    reward.runMode = c.runMode;
    reward.levelIndex = c.levelIndex;
    reward.projectId = c.runPayload && c.runPayload.projectId || null;
    reward.contractNumber = c.runMode === 'contract' && c.runPayload ? c.runPayload.contractIndex + 1 : 0;
    reward.name = Meta.siteName(c.runMode, c.levelIndex, c.runPayload);
    // Contracts count real time in levelElapsed; other runs add the time they were built without the player.
    reward.levelElapsed = c.levelElapsed + (c.awayElapsed || 0);
    reward.offline = !!offline;
    reward.autoCompleted = w.autoCompleted || 0;
    reward.total = w.blocks.length;
    reward.stats = Object.assign({}, w.stats);
    reward.timeShares = timeShares(w.timeLedger);
    reward.losses = ledgerLosses(w.timeLedger);
    reward.last = c.runMode === 'campaign' && c.levelIndex >= MB.LEVELS.length - 1;
    // The next story order offers these purchases again («Как в прошлый раз»); none — no offer.
    if (c.runMode === 'campaign') meta.lastBuys = (c.buyLog || []).slice();
    c.status = 'complete';
    w.completed = true;
    Meta.saveSite(meta, key, c, w, { status: 'complete', reward: reward });
    journalNote('done', Object.assign(journalRun(c), { sim: Math.round(reward.levelElapsed), offline: !!offline, buys: (c.buyLog || []).length,
      losses: journalLosses(reward.losses), crew: (c.crew || []).slice(), win: c.runMode === 'school' ? !!reward.diplomas : undefined }));
    return reward;
  }

  // Where the crew's time went on a finished site (the states of «Об уровне → Тайминги»): shares of
  // the whole, biggest first.
  function timeShares(ledger) {
    let total = 0;
    const rows = Object.keys(ledger || {}).map(function (name) {
      let seconds = 0;
      Object.keys(ledger[name]).forEach(function (sub) { seconds += ledger[name][sub]; });
      total += seconds;
      return [name, seconds];
    });
    if (!(total > 0)) return [];
    return rows.map(function (row) { return [row[0], row[1] / total]; }).sort(function (a, b) { return b[1] - a[1]; });
  }

  // «Дальше: «Реже перекуры» в техцентре: перекуры — 11% времени бригады · капитал 120 / 300»: the
  // finished site's biggest loss that an open technology answers comes first (lossCounter); otherwise
  // the cheapest HQ lot or technology open now — one the HQ can pay already («Хватает на …»), else the
  // cheapest one with what is saved up for it.
  function nextGoalHtml(reward) {
    const counter = lossCounter(reward.losses || {});
    if (counter) {
      const loss = LOSSES.find(function (row) { return row[0] === counter.key; });
      return goalHtml({ name: Meta.TECH[counter.id].name, where: techPlace(counter.id), capital: Meta.techCost(counter.id), seals: Meta.techSeals(counter.id),
        rareShort: false, rare: [], why: loss[1] + ' — ' + Math.round(counter.share * 100) + '% времени бригады' });
    }
    const goals = [];
    Object.keys(Meta.PROJECTS).forEach(function (id) {
      if (cityState(id) !== 'plot') return;
      const project = Meta.PROJECTS[id];
      const rare = Object.keys(project.rare || {}).filter(function (key) { return (meta.rare[key] || 0) < project.rare[key]; }).map(function (key) {
        return Meta.RARE_NAMES[key].toLowerCase() + ' <b>' + (meta.rare[key] || 0) + ' / ' + project.rare[key] + '</b>';
      });
      goals.push({ name: project.name, where: 'в штабе', capital: project.capital || 0, seals: project.seals || 0, rareShort: rare.length > 0, rare: rare });
    });
    Meta.TECH_ORDER.forEach(function (id) {
      const center = Meta.TECH[id].center;
      if (center === 'advanced' || !Meta.techUnlocked(meta, id)) return;
      goals.push({ name: Meta.TECH[id].name, where: techPlace(id), capital: Meta.techCost(id), seals: Meta.techSeals(id), rareShort: false, rare: [] });
    });
    if (goals.length === 0) return '';
    const byPrice = function (a, b) { return a.capital - b.capital || a.seals - b.seals; };
    const ready = goals.filter(goalPaid).sort(byPrice);
    return goalHtml(ready.length ? ready[0] : goals.sort(byPrice)[0]);
  }

  function goalPaid(goal) {
    return !goal.rareShort && meta.capital >= goal.capital && meta.seals >= goal.seals;
  }

  function goalHtml(goal) {
    const head = '«' + UI.escapeHtml(goal.name) + '» ' + goal.where + (goal.why ? ': ' + UI.escapeHtml(goal.why) : '');
    if (goalPaid(goal)) return '<p class="complete-goal"><span>Хватает на</span>' + head + '</p>';
    return '<p class="complete-goal"><span>Дальше</span>' + head +
      ' · капитал <b>' + formatCompact(meta.capital) + ' / ' + formatCompact(goal.capital) + '</b>' +
      (goal.seals > meta.seals ? ' · печати <b>' + meta.seals + ' / ' + goal.seals + '</b>' : '') +
      goal.rare.map(function (part) { return ' · ' + part; }).join('') + '</p>';
  }

  // The three biggest shares and every need that took at least 1% (NEED_STATES: what the player can fix).
  function completeTimeLine(reward) {
    const shares = reward.timeShares || [];
    if (shares.length === 0) return '';
    const picked = shares.slice(0, 3).concat(shares.slice(3).filter(function (row) {
      return NEED_STATES.indexOf(row[0]) >= 0 && row[1] >= 0.01;
    }));
    return '<p class="complete-time"><span>Куда ушло время бригады</span>' + picked.map(function (row) {
      return '<b' + (NEED_STATES.indexOf(row[0]) >= 0 ? ' class="need"' : '') + '>' + UI.escapeHtml(row[0].toLowerCase()) + ' ' +
        Math.max(1, Math.round(row[1] * 100)) + '%</b>';
    }).join('') + '</p>';
  }

  function onLiveComplete() {
    celebrate();
    const reward = settleCompletion(liveKey || Meta.siteKey(campaign.runMode), campaign, world, false);
    syncCity();
    paintHud();
    // На ×1 камера сперва облетает готовое здание (конфетти, флажок и волна блеска на виду), потом окно.
    if (timeScale >= 5 || document.visibilityState === 'hidden') {
      openCompleteDialog(reward);
      return;
    }
    cameraController.frameHome({ animate: true, seconds: COMPLETE_SWEEP, azimuth: cameraController.getView().azimuth + 0.8 });
    setTimeout(function () { openCompleteDialog(reward); }, COMPLETE_SWEEP * 1000);
  }

  function rewardTile(icon, value, label, extraClass) {
    return '<div class="reward-tile' + (extraClass ? ' ' + extraClass : '') + '"><img src="' + icon + '" alt=""><b>' + value + '</b><small>' + label + '</small></div>';
  }

  function cardTile(card) {
    const note = card.milestone ? 'За ' + card.milestone + ' ' + UI.plural(card.milestone, 'победу', 'победы', 'побед') + ' · ' + (card.isNew ? 'новый!' : '+1 копия') : card.first ? 'Первый бригадир! Выйдет на смену со следующего заказа' : (card.isNew ? 'новый!' : '+1 копия');
    return '<div class="reward-tile card rarity-' + card.rarity + '"><img src="icons/icon-foreman-' + card.cardId + '.jpg?v=3" alt=""><b>' +
      UI.escapeHtml(card.cardName) + '</b><small>' + card.rarityName + ' · ' + note + '</small></div>';
  }

  function rewardTiles(reward) {
    const tiles = [];
    if (reward.runMode === 'hq') {
      tiles.push('<div class="reward-tile building">' + ICONS.hq + '<b>' + UI.escapeHtml(reward.name) + '</b><small>новое здание в штабе</small></div>');
    }
    if (reward.capital > 0) tiles.push(rewardTile('icons/icon-capital.jpg?v=2', '+' + formatCompact(reward.capital), 'капитала'));
    if (reward.seals > 0) tiles.push(rewardTile('icons/icon-seals.jpg?v=2', '+' + reward.seals, UI.plural(reward.seals, 'печать', 'печати', 'печатей')));
    if (reward.rare && rareInPlay()) tiles.push(rewardTile('icons/icon-rare-' + reward.rare.key + '.jpg?v=2', '+' + reward.rare.amount, Meta.RARE_NAMES[reward.rare.key]));
    if (reward.diplomas > 0) tiles.push(rewardTile('icons/icon-diplomas.svg', '+' + reward.diplomas, UI.plural(reward.diplomas, 'диплом', 'диплома', 'дипломов')));
    if (reward.smallChest) tiles.push(rewardTile('icons/icon-chest-25.jpg', 'Малый сундук', '1 бригадир'));
    (reward.milestoneCards || []).forEach(function (card) { tiles.push(cardTile(card)); });
    if (reward.card) tiles.push(cardTile(reward.card));
    (reward.chests || []).forEach(function (chest) {
      tiles.push(rewardTile('icons/icon-chest-' + chest.threshold + '.jpg', 'Сундук ' + chest.threshold + '%',
        '+' + chest.capital + ' капитала', 'chest'));
      if (chest.card) tiles.push(cardTile(chest));
    });
    if (reward.carryCoins > 0) tiles.push(rewardTile('icons/icon-coins.jpg?v=2', '+' + formatCompact(reward.carryCoins), 'монет на следующий заказ'));
    return tiles;
  }

  // «Объект сдан!» (docs/gdd/16-ux-flow.md §9): reward tiles, the time, statistics under «Подробнее».
  // `queue` waits for the windows already open (the return window first).
  function openCompleteDialog(reward, opts) {
    const options = opts || {};
    const key = reward.key;
    const story = reward.runMode === 'campaign';
    const onScreen = key === liveKey;
    const stats = reward.stats || {};
    const details = [
      ['Лестницы', stats.ladders], ['Настилы', stats.decks],
      ['Леса сломались', stats.scaffoldBreaks || 0], ['Ремонты лесов', stats.scaffoldRepairs || 0],
      ['Дополнительные двери', stats.additionalDoors],
      ['Вертикальные люки', stats.verticalHatches], ['Машиной построено', stats.vehicleBlocks],
    ].filter(function (row) { return row[1] !== undefined; });
    if (reward.autoCompleted > 0) details.push(['Достроено автоматически', reward.autoCompleted + ' ' + UI.plural(reward.autoCompleted, 'куб', 'куба', 'кубов')]);
    // From the third story order: where the crew's time went; every story order: what the capital goes to.
    const early = story && reward.levelIndex < LEVEL_INFO_FROM;
    const goal = story ? nextGoalHtml(reward) : '';
    const body = '<p class="complete-name">' + UI.escapeHtml(reward.name) + '</p>' +
      '<div class="reward-tiles">' + rewardTiles(reward).join('') + '</div>' +
      '<div class="complete-meta"><span class="complete-chip">' + ICONS.clock + 'Время ' + UI.formatDuration(reward.levelElapsed || 0) + '</span>' +
      (reward.offline ? '<span class="complete-chip">Достроено без вас</span>' : '') + '</div>' +
      (early ? '' : completeTimeLine(reward)) + goal +
      (details.length ? '<details class="complete-details"><summary>Подробнее</summary><ul>' + details.map(function (row) {
        return '<li><span>' + row[0] + '</span><b>' + row[1] + '</b></li>';
      }).join('') + '</ul></details>' : '');
    const actions = [];
    let note = '';
    if (!onScreen && contractRunning()) {
      // Another site finished during a contract: its rewards are in, the next step waits for the contract.
      actions.push({ label: 'Понятно', primary: true });
      note = '<p class="complete-note">' + (story ? 'Следующий заказ — после контракта.' : 'Посмотреть можно после контракта.') + '</p>';
    } else if (story) {
      actions.push(reward.last
        ? { label: 'Итог кампании', primary: true, onClick: openSummary }
        : { label: 'Следующий заказ', primary: true, onClick: goNext });
      actions.push(onScreen
        ? { label: 'В штаб', onClick: function () { openScreen('hq'); } }
        : { label: 'Позже' });
    } else if (onScreen && reward.runMode === 'school') {
      actions.push({ label: 'Вернуться в школу', primary: true, onClick: function () { finishSite(key, { toHq: true }); openScreen('recruiting', { silent: true }); } });
    } else if (onScreen) {
      actions.push({ label: 'Вернуться на основную стройку', primary: true, onClick: function () { finishSite(key); } });
      actions.push({ label: reward.runMode === 'hq' ? 'Смотреть в штабе' : 'В штаб', onClick: function () {
        finishSite(key, { toHq: true, building: reward.projectId });
      } });
    } else {
      actions.push({ label: 'Понятно', primary: true });
      if (reward.runMode === 'hq') {
        actions.push({ label: 'Смотреть в штабе', onClick: function () {
          cityBuilding = reward.projectId;
          openScreen('hq');
        } });
      }
    }
    UI.overlay.open({
      id: 'complete-' + key,
      queue: !!options.queue,
      kicker: siteKicker(reward.runMode, reward.levelIndex, reward.contractNumber),
      title: 'Объект сдан!',
      body: body + note,
      actions: actions,
      onClose: function () {
        // A side or HQ site finished while the player was elsewhere: nothing to come back to.
        if (!story && key !== liveKey) {
          const snap = Meta.site(meta, key);
          if (snap && snap.status === 'complete') Meta.clearSite(meta, key);
        }
      },
    });
  }

  function onNextCta() {
    if (!campaign || campaign.status !== 'complete') return;
    if (campaign.runMode !== 'campaign') finishSite(liveKey);
    else if (campaign.levelIndex >= MB.LEVELS.length - 1) openSummary();
    else goNext();
  }

  // Leave a finished side or HQ site: its slot is emptied and the main site takes the screen.
  function finishSite(key, opts) {
    const options = opts || {};
    const snap = Meta.site(meta, key);
    if (key !== 'campaign' && snap && snap.status === 'complete') Meta.clearSite(meta, key);
    if (key === liveKey) {
      liveKey = null;
      switchSite(Meta.activeSite(meta), options);
    } else if (options.toHq) {
      cityBuilding = options.building || null;
      openScreen('hq');
    }
  }

  function openBlocked(event) {
    const total = world.level.blocks.length;
    UI.overlay.open({
      id: 'blocked',
      kicker: 'Строительство остановлено',
      title: 'Нет достижимых кубов',
      body: '<p>Осталось ' + event.remaining + ' из ' + total + ' ' + UI.plural(total, 'куба', 'кубов', 'кубов') + ' (' + formatPercent(event.remaining / total) +
        '). Автозавершение применяется, только когда осталось менее 2%.</p>',
      actions: campaign.runMode === 'school' ? [{ label: 'Закрыть', primary: true }, { label: 'Бросить испытание', danger: true, onClick: confirmAbandon }] : [{ label: 'Перезапустить заказ', primary: true, onClick: restartRun }, { label: 'Закрыть' }],
    });
  }

  function goNext() {
    const snap = Meta.site(meta, 'campaign');
    const nextIndex = snap ? snap.levelIndex + 1 : meta.campaignLevel;
    if (nextIndex >= MB.LEVELS.length) {
      openSummary();
      return;
    }
    requestRun({ mode: 'campaign', levelIndex: nextIndex, reason: 'next' });
  }

  // Dev level picker.
  function jumpTo(index) {
    if (!campaign || campaign.status === 'title' || !world) return;
    if (index < 0 || index >= MB.LEVELS.length) return;
    if (index === world.level.index && campaign.status === 'play' && campaign.runMode === 'campaign') return;
    requestRun({ mode: 'campaign', levelIndex: index, reason: 'jump' });
  }

  function fillLevelPick() {
    const select = document.getElementById('level-pick');
    for (let i = 0; i < MB.LEVELS.length; i++) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = MB.LEVELS[i].number + '. ' + MB.LEVELS[i].name;
      select.appendChild(option);
    }
  }

  // ---------- company quarter (Штаб) ----------
  // A boulevard from the camera into the distance (docs/gdd/16-ux-flow.md §8): lots in two columns in
  // unlock order, every facade facing the camera, the buildings that are not in the game yet behind
  // one fence at the far end. A lot shows bare soil while locked, a blue silhouette of the real voxel
  // building once it can be bought, the built cubes inside a fence while under construction and the
  // full building (the same blocks, doors and windows as its HQ level) once it works. Names and
  // states are DOM signs above the lots, projected once per frame while the city is on screen.

  function cityBox(parent, material, size, position) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cityFlat(parent, material, width, depth, x, z, y) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cityRowZ(row) {
    return -row * CITY_GRID.rowPitch;
  }

  // Front of the expansion zone: the avenue ends at its gate.
  function cityZoneFront() {
    return cityRowZ(CITY_ZONE_ROW) + CITY_LOT.depth / 2 + 0.6;
  }

  // Centre of a lot (or of the expansion zone) and the height of its roof.
  function cityLotSpot(id) {
    if (id === 'expansion') return { x: 0, z: cityRowZ(CITY_ZONE_ROW), top: 2.4 };
    const spec = cityRecords.get(id).spec;
    const level = MB.HQ_LEVELS[id];
    return { x: spec.col * CITY_GRID.colX, z: cityRowZ(spec.row), top: level ? level.footprint.maxY + 1 : 1 };
  }

  function cityIcon(id) {
    const keys = { office: 'office', tech: 'gear', personnel: 'personnel', exchange: 'exchange', recruiting: 'foremen', garage: 'truck', contracts: 'contract', supply: 'truck', reactor: 'storm', training: 'foremen', expansion: 'crane' };
    return ICONS[keys[id]] || ICONS.hq;
  }

  function buildCity() {
    // Past the fog in every direction, also with the view shifted beside a side sheet.
    cityFlat(cityRoot, cityMat.lawn, 600, 600, 0, -18, 0);
    Meta.CITY.forEach(function (spec) {
      if (spec.zone || !MB.HQ_LEVELS[spec.id]) return;
      cityRecords.set(spec.id, makeCityLot(spec));
    });
    buildCityStreets();
    buildCityGreenery();
    cityDecor.expansion = makeCityExpansion();
    cityDecor.ring = makeCityRing();
    cityDecor.cars = [];
    const colors = [0xd8402f, 0x2f6fed, 0xf2b91f, 0xf4f1ea];
    const span = CITY_AVENUE.near - cityZoneFront();
    for (let i = 0; i < colors.length; i++) {
      const car = makeCityCar(colors[i]);
      car.userData.lane = i % 2 === 0 ? 1 : -1;
      car.userData.speed = 3.2 + i * 0.6;
      car.userData.z = cityZoneFront() + ((i * 0.29 + 0.1) % 1) * span;
      cityRoot.add(car);
      cityDecor.cars.push(car);
    }
    buildCitySigns();
    syncCity();
  }

  // The avenue from the camera to the expansion gate, a paved forecourt in front of every row.
  function buildCityStreets() {
    const far = cityZoneFront();
    const near = CITY_AVENUE.near;
    const length = near - far;
    const mid = (near + far) / 2;
    const half = CITY_AVENUE.width / 2;
    cityFlat(cityRoot, cityMat.asphalt, CITY_AVENUE.width, length, 0, mid, 0.03);
    for (let side = -1; side <= 1; side += 2) {
      cityBox(cityRoot, cityMat.walk, [CITY_AVENUE.walk, 0.12, length], [side * (half + CITY_AVENUE.walk / 2), 0.06, mid]);
      cityBox(cityRoot, cityMat.curb, [0.12, 0.14, length], [side * half, 0.07, mid]);
    }
    for (let z = far + 1.5; z < near - 1; z += 3) cityFlat(cityRoot, cityMat.lane, 0.12, 1.4, 0, z, 0.04);
    const width = CITY_GRID.colX * 2 + CITY_LOT.width;
    for (let row = 0; row < CITY_ZONE_ROW; row++) {
      const z = cityRowZ(row) + CITY_LOT.depth / 2 + 1.1;
      cityBox(cityRoot, cityMat.walk, [width, 0.1, 2.2], [0, 0.05, z]);
      for (let side = -1; side <= 1; side += 2) cityRoot.add(makeCityLamp(side * (half + CITY_AVENUE.walk + 0.3), z + 1.2, side));
    }
  }

  // Structured greenery: a hedge behind every lot, trees between the rows along the avenue and two
  // straight alleys on the outer edges of the quarter.
  function buildCityGreenery() {
    const random = seededRandom(97);
    cityRecords.forEach(function (record) {
      const x = record.spec.col * CITY_GRID.colX;
      cityBox(cityRoot, cityMat.hedge, [CITY_LOT.width - 0.4, 0.7, 0.6], [x, 0.35, cityRowZ(record.spec.row) - CITY_LOT.depth / 2 - 0.4]);
    });
    for (let row = 0; row < CITY_ZONE_ROW; row++) {
      const z = cityRowZ(row) - CITY_LOT.depth / 2 - 1.3;
      for (let side = -1; side <= 1; side += 2) {
        cityRoot.add(makeCityTree(side * (CITY_AVENUE.width / 2 + 0.5), z, 0.62, row * 2 + (side > 0 ? 1 : 0)));
      }
    }
    const outer = CITY_GRID.colX + CITY_LOT.width / 2 + 2.6;
    for (let z = CITY_AVENUE.near - 4; z > cityRowZ(CITY_ZONE_ROW) - CITY_LOT.depth; z -= 4.4) {
      for (let side = -1; side <= 1; side += 2) {
        cityRoot.add(makeCityTree(side * (outer + random() * 0.4), z, 0.85 + random() * 0.25, Math.round(z) + side * 3));
        cityRoot.add(makeCityTree(side * (outer + 3.4 + random() * 0.6), z - 2.2, 0.9 + random() * 0.3, Math.round(z) + side * 5));
      }
    }
  }

  function seededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  function makeCityTree(x, z, size, seed) {
    const group = new THREE.Group();
    cityBox(group, cityMat.trunk, [0.32, 1.1, 0.32], [0, 0.55, 0]);
    const leaves = cityMat.leaves[Math.abs(seed) % cityMat.leaves.length];
    cityBox(group, leaves, [1.6, 1.2, 1.6], [0, 1.6, 0]);
    cityBox(group, leaves, [1.1, 0.8, 1.1], [0, 2.5, 0]);
    group.position.set(x, 0, z);
    group.scale.setScalar(size);
    group.rotation.y = (Math.abs(seed) % 7) * 0.4;
    return group;
  }

  // A street lamp; `side` turns its arm over the avenue.
  function makeCityLamp(x, z, side) {
    const group = new THREE.Group();
    cityBox(group, cityMat.pole, [0.12, 2.6, 0.12], [0, 1.3, 0]);
    cityBox(group, cityMat.pole, [0.5, 0.08, 0.12], [-side * 0.2, 2.6, 0]);
    cityBox(group, cityMat.bulb, [0.22, 0.14, 0.22], [-side * 0.42, 2.52, 0]);
    group.position.set(x, 0, z);
    return group;
  }

  function makeCityCar(color) {
    const group = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.3 });
    cityBox(group, body, [0.9, 0.36, 1.7], [0, 0.38, 0]);
    cityBox(group, body, [0.8, 0.32, 0.9], [0, 0.72, -0.1]);
    cityBox(group, machineMat.glass, [0.82, 0.24, 0.92], [0, 0.73, -0.1]);
    cityBox(group, machineMat.light, [0.7, 0.08, 0.04], [0, 0.4, 0.86]);
    for (let side = -1; side <= 1; side += 2) {
      for (let end = -1; end <= 1; end += 2) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10), machineMat.tyre);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.45, 0.18, end * 0.55);
        group.add(wheel);
      }
    }
    return group;
  }

  // A lot: soil or paving, the HQ building in voxels (solid + blueprint silhouette), a site fence.
  // Every HQ level has its door at local +z, so with no rotation the facade faces the camera.
  function makeCityLot(spec) {
    const lot = new THREE.Group();
    lot.position.set(spec.col * CITY_GRID.colX, 0, cityRowZ(spec.row));
    lot.userData.buildingId = spec.id;
    cityRoot.add(lot);
    const soil = cityFlat(lot, cityMat.soil, CITY_LOT.width, CITY_LOT.depth, 0, 0, 0.05);
    const paving = cityFlat(lot, cityMat.paving, CITY_LOT.width, CITY_LOT.depth, 0, 0, 0.06);
    const record = { id: spec.id, spec: spec, lot: lot, soil: soil, paving: paving, blocks: [], solids: [], ghosts: [], features: [], fence: makeCityFence(lot, CITY_LOT.width, CITY_LOT.depth, 0), reveal: -1, total: 0 };
    addCityBuilding(record, MB.HQ_LEVELS[spec.id]);
    return record;
  }

  function addCityBuilding(record, level) {
    const fp = level.footprint;
    const inner = new THREE.Group();
    inner.position.set(-(fp.minX + fp.maxX + 1) / 2, 0.06, -(fp.minZ + fp.maxZ + 1) / 2);
    record.lot.add(inner);
    const byMaterial = {};
    const order = level.blocks.slice().sort(function (a, b) { return a.y - b.y || a.z - b.z || a.x - b.x; });
    order.forEach(function (block) {
      if (!byMaterial[block.materialId]) byMaterial[block.materialId] = [];
      byMaterial[block.materialId].push(block);
    });
    const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    // Кладка как на стройке (block-materials.js): куб с фаской, затенение в стыках, рисунок только на части граней —
    // стена читается сплошной кладкой, а не сеткой плиток. Соседи — все клетки здания (окна и двери — стена с проёмом).
    const filled = new Set();
    level.blocks.forEach(function (block) {
      if (!block.feature || block.feature === 'window' || block.feature === 'door') filled.add(MB.cellKey(block.x, block.y, block.z));
    });
    const has = function (x, y, z) { return y < 0 || filled.has(MB.cellKey(x, y, z)); };
    const tint = new THREE.Color();
    Object.keys(byMaterial).forEach(function (materialId) {
      const list = byMaterial[materialId];
      const shape = cityBlockGeometry().clone();
      shape.setAttribute('mbNb', new THREE.InstancedBufferAttribute(new Float32Array(list.length * 2), 2));
      shape.setAttribute('mbLook', new THREE.InstancedBufferAttribute(new Float32Array(list.length), 1));
      const solid = new THREE.InstancedMesh(shape, cityBlockMaterial(materialId), list.length);
      const ghost = new THREE.InstancedMesh(geometry, cityMat.blueprint, list.length);
      solid.castShadow = true;
      solid.receiveShadow = true;
      solid.userData.buildingId = ghost.userData.buildingId = record.id;
      list.forEach(function (block, index) {
        const look = Blocks.look(block.x, block.y, block.z);
        let mask = 0;
        for (let k = 0; k < AO_NEIGHBORS.length; k++) {
          const d = AO_NEIGHBORS[k];
          if (has(block.x + d[0], block.y + d[1], block.z + d[2])) mask |= d[3];
        }
        let sides = 0;
        for (let k = 0; k < AO_SIDES.length; k++) {
          const d = AO_SIDES[k];
          if (has(block.x + d[0], block.y + d[1], block.z + d[2])) sides |= 1 << k;
        }
        shape.attributes.mbNb.array[index * 2] = mask;
        shape.attributes.mbNb.array[index * 2 + 1] = sides;
        shape.attributes.mbLook.array[index] = look.mask;
        solid.setColorAt(index, tint.setScalar(look.tint));
        record.blocks.push({ block: block, solid: solid, ghost: ghost, index: index, order: order.indexOf(block), turn: look.turn });
      });
      inner.add(solid, ghost);
      record.solids.push(solid);
      record.ghosts.push(ghost);
    });
    const byKey = new Map();
    level.blocks.forEach(function (block) { byKey.set(MB.cellKey(block.x, block.y, block.z), block); });
    const state = Features.createState();
    record.featureState = state;
    level.blocks.forEach(function (block) {
      if (!block.feature) return;
      const feature = Features.build(block, {
        parent: inner,
        getBlock: function (x, y, z) { return byKey.get(MB.cellKey(x, y, z)); },
        blocks: level.blocks,
      }, state);
      feature.traverse(function (object) { object.userData.buildingId = record.id; });
      record.features.push({ block: block, object: feature, order: order.indexOf(block) });
    });
    record.total = level.blocks.length;
  }

  // Orange-and-white site fence around a width × depth box; `gate` leaves an opening that wide in
  // the front (+z) side.
  function makeCityFence(parent, width, depth, gate) {
    const fence = new THREE.Group();
    const halfW = width / 2 - 0.3;
    const halfD = depth / 2 - 0.3;
    for (let i = -halfW; i <= halfW + 0.01; i += 1.2) {
      [-halfD, halfD].forEach(function (z, k) {
        if (k === 1 && Math.abs(i) < gate / 2) return;
        cityBox(fence, (Math.round(i / 1.2) + k) % 2 ? cityMat.fence : cityMat.fenceWhite, [1.1, 0.28, 0.06], [i, 0.42, z]);
      });
    }
    for (let i = -halfD; i <= halfD + 0.01; i += 1.2) {
      [-halfW, halfW].forEach(function (x, k) {
        cityBox(fence, (Math.round(i / 1.2) + k) % 2 ? cityMat.fence : cityMat.fenceWhite, [0.06, 0.28, 1.1], [x, 0.42, i]);
      });
    }
    fence.visible = false;
    parent.add(fence);
    return fence;
  }

  // The buildings that are not in the game yet: one fenced field with a gate at the end of the
  // avenue, a crane and building materials — «Скоро · ещё N зданий».
  function makeCityExpansion() {
    const group = new THREE.Group();
    const width = CITY_GRID.colX * 2 + CITY_LOT.width;
    const depth = CITY_LOT.depth + 1;
    group.position.set(0, 0, cityRowZ(CITY_ZONE_ROW));
    group.userData.buildingId = 'expansion';
    cityRoot.add(group);
    cityFlat(group, cityMat.soil, width, depth, 0, 0, 0.05);
    makeCityFence(group, width, depth, CITY_AVENUE.width + 0.4).visible = true;
    for (let side = -1; side <= 1; side += 2) cityBox(group, cityMat.pole, [0.22, 1.4, 0.22], [side * (CITY_AVENUE.width / 2 + 0.3), 0.7, depth / 2 - 0.3]);
    // Tower crane over the field.
    cityBox(group, machineMat.yellow, [0.4, 6.2, 0.4], [5.5, 3.1, -1.5]);
    cityBox(group, machineMat.yellow, [9, 0.3, 0.3], [3.2, 6.1, -1.5]);
    cityBox(group, machineMat.dark, [1.4, 0.7, 0.7], [7.8, 5.9, -1.5]);
    cityBox(group, machineMat.dark, [0.04, 2.4, 0.04], [0.6, 4.8, -1.5]);
    // Stacks of material and pallets.
    [[-7, 1.5], [-5.6, 1.6], [-7.6, -1.6], [3, 2], [8, 1.8]].forEach(function (spot, i) {
      const height = 0.5 + (i % 3) * 0.35;
      cityBox(group, i % 2 ? cityMat.crate : machineMat.steel, [1.2, height, 1.1], [spot[0], height / 2 + 0.05, spot[1]]);
    });
    return group;
  }

  // Gold outline around the selected lot.
  function makeCityRing() {
    const ring = new THREE.Group();
    const w = CITY_LOT.width + 0.6;
    const d = CITY_LOT.depth + 0.6;
    [[w, 0.24, 0, d / 2], [w, 0.24, 0, -d / 2], [0.24, d, w / 2, 0], [0.24, d, -w / 2, 0]].forEach(function (part) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(part[0], 0.05, part[1]), cityMat.ring);
      strip.position.set(part[2], 0.12, part[3]);
      ring.add(strip);
    });
    ring.visible = false;
    cityRoot.add(ring);
    return ring;
  }

  function placeCityRing() {
    const ring = cityDecor.ring;
    if (!ring) return;
    const id = cityBuilding;
    ring.visible = !!id && (id === 'expansion' || cityRecords.has(id));
    if (!ring.visible) return;
    const spot = cityLotSpot(id);
    const zone = id === 'expansion';
    ring.position.set(spot.x, 0, spot.z);
    ring.scale.set(zone ? (CITY_GRID.colX * 2 + CITY_LOT.width + 0.6) / (CITY_LOT.width + 0.6) : 1, 1, zone ? (CITY_LOT.depth + 1.6) / (CITY_LOT.depth + 0.6) : 1);
  }

  // Ids of HQ blocks already built: the HQ site on screen, or its saved slot.
  function cityBuiltIds(id) {
    if (liveKey === 'hq' && campaign && campaign.runPayload && campaign.runPayload.projectId === id && world) {
      return new Set(world.blocks.filter(function (block) { return block.built; }).map(function (block) { return block.id; }));
    }
    const saved = Meta.site(meta, 'hq');
    return new Set(saved && saved.runPayload && saved.runPayload.projectId === id ? saved.builtIds : []);
  }

  function cityBuildPercent(id) {
    if (liveKey === 'hq' && campaign && campaign.runPayload && campaign.runPayload.projectId === id && world) {
      return percentOf(world.blocks.length - world.remaining, world.blocks.length);
    }
    const saved = Meta.site(meta, 'hq');
    return saved && saved.runPayload && saved.runPayload.projectId === id ? percentOf(saved.built, saved.total) : 0;
  }

  // Кубы зданий квартала: общая геометрия с фаской и материал на материал блока (затенение в стыках, мелкая фактура).
  function cityBlockGeometry() {
    if (!cityShape) cityShape = Blocks.geometry(0.98, 0.07);
    return cityShape;
  }

  function cityBlockMaterial(materialId) {
    if (!cityMaterials[materialId]) cityMaterials[materialId] = Blocks.material(materialId, 0, true, true);
    return cityMaterials[materialId];
  }

  // turn — поворот куба вокруг вертикали четвертями (Blocks.look): фактура соседних кубов не повторяется.
  function setCityInstance(mesh, index, block, scale, turn) {
    dummy.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
    dummy.rotation.set(0, turn || 0, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  function showCityBlocks(record, built, silhouette, revealT) {
    record.blocks.forEach(function (item) {
      const isBuilt = built === true || (built && built.has(item.block.id));
      let scale = isBuilt ? 1 : 0;
      if (isBuilt && revealT >= 0) {
        const start = item.order / record.total * 0.8;
        const u = Math.max(0, Math.min(1, (revealT - start) / 0.2));
        scale = 1 - Math.pow(1 - u, 3);
      }
      const glassId = item.block.glassId;
      const glazed = glassId !== undefined && (built === true || (built && built.has(glassId)));
      setCityInstance(item.solid, item.index, item.block, item.block.feature || glazed ? 0.0001 : Math.max(scale, 0.0001), item.turn);
      setCityInstance(item.ghost, item.index, item.block, !isBuilt && silhouette && item.block.glassOf === undefined ? 1 : 0.0001);
    });
    record.solids.forEach(function (mesh) { mesh.instanceMatrix.needsUpdate = true; });
    record.ghosts.forEach(function (mesh) { mesh.instanceMatrix.needsUpdate = true; });
    record.features.forEach(function (item) {
      const isBuilt = built === true || (built && built.has(item.block.id));
      let scale = isBuilt ? 1 : 0.001;
      if (isBuilt && revealT >= 0) scale = revealT >= item.order / record.total * 0.8 + 0.2 ? 1 : 0.001;
      item.object.scale.setScalar(scale);
    });
    // Детали особых блоков — общие InstancedMesh (art/features.js): перенести новые масштабы в экземпляры.
    if (record.featureState) Features.sync(record.featureState);
  }

  function syncCity() {
    cityRecords.forEach(function (record, id) {
      const state = cityState(id);
      const open = state !== 'locked';
      record.paving.visible = open;
      record.soil.visible = !open;
      record.fence.visible = state === 'building';
      // A building the player has not seen yet stays empty until its reveal grows it (showCity).
      const waiting = !meta.citySeen[id] || (cityReveal && cityReveal.id === id);
      if (state === 'live') showCityBlocks(record, true, false, record.reveal >= 0 ? record.reveal : (waiting ? 0 : -1));
      else if (state === 'building') showCityBlocks(record, cityBuiltIds(id), true, -1);
      else showCityBlocks(record, null, state === 'plot' || state === 'ready', -1);
    });
    paintCitySigns();
    placeCityRing();
  }

  // ---- what to do next, prices ----

  function cityIdsByUnlock() {
    return Array.from(cityRecords.keys()).sort(function (a, b) { return Meta.PROJECTS[a].unlock - Meta.PROJECTS[b].unlock; });
  }

  // What the company still lacks to buy the plot: ['70 капитала', '3 печатей'] (empty when it can).
  function cityShortfall(id) {
    const project = Meta.PROJECTS[id];
    const missing = [];
    const capital = project.capital - meta.capital;
    const seals = (project.seals || 0) - meta.seals;
    if (capital > 0) missing.push(capital.toLocaleString('ru-RU') + ' капитала');
    if (seals > 0) missing.push(seals + ' ' + UI.plural(seals, 'печати', 'печатей', 'печатей'));
    if (project.rare) {
      Object.keys(project.rare).forEach(function (key) {
        const need = project.rare[key] - (meta.rare[key] || 0);
        if (need > 0) missing.push(need + ' · ' + Meta.RARE_NAMES[key].toLowerCase());
      });
    }
    return missing;
  }

  function joinAnd(parts) {
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' и ' + parts[parts.length - 1] : parts.join('');
  }

  // The step the arrow points at, in unlock order: the HQ site under way, a bought plot, then the
  // first plot the company can pay for (capital and seals, like Meta.buyPlot).
  function cityNextStep() {
    if (meta.hqSite && cityRecords.has(meta.hqSite.id)) return meta.hqSite.id;
    const ids = cityIdsByUnlock();
    for (let i = 0; i < ids.length; i++) if (cityState(ids[i]) === 'ready') return ids[i];
    for (let i = 0; i < ids.length; i++) if (cityState(ids[i]) === 'plot' && cityShortfall(ids[i]).length === 0) return ids[i];
    return null;
  }

  // The line of the default card: the next step, or what the next building waits for.
  function cityAdvice() {
    const next = cityNextStep();
    if (next) {
      const name = Meta.PROJECTS[next].name;
      const state = cityState(next);
      if (state === 'building') return { id: next, html: '<b>Идёт стройка:</b> «' + UI.escapeHtml(name) + '» · ' + cityBuildPercent(next) + '%' };
      if (state === 'ready') return { id: next, html: '<b>Можно строить:</b> ' + UI.escapeHtml(name) };
      return { id: next, html: '<b>Можно купить участок:</b> ' + UI.escapeHtml(name) };
    }
    const ids = cityIdsByUnlock();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const state = cityState(id);
      if (state === 'live') continue;
      const project = Meta.PROJECTS[id];
      const reason = state === 'locked' ? 'с уровня ' + (project.unlock + 1) : 'не хватает ' + joinAnd(cityShortfall(id));
      return { id: id, html: '<b>Дальше:</b> ' + UI.escapeHtml(project.name) + ' — ' + reason };
    }
    return null;
  }

  // Can the company buy anything in the office right now (the «!» on its sign)?
  function officeAffordable() {
    return Object.keys(Meta.OFFICE).some(function (id) {
      const level = meta.office[id];
      if (!Meta.officeUnlocked(meta, id) || level >= Meta.OFFICE[id].max) return false;
      return meta.capital >= Meta.officeCost(id, level) && meta.seals >= Meta.officeSeals(id, level);
    });
  }

  // Can the company open the next technology right now (the «!» on the tech center's sign)?
  function techAffordable() {
    return Meta.TECH_CENTER_ORDER.concat(Meta.ADVANCED_TECHS).some(function (id) {
      return Meta.techUnlocked(meta, id) && meta.capital >= Meta.techCost(id) && meta.seals >= Meta.techSeals(id);
    });
  }

  function schoolAffordable() {
    return meta.hq.recruiting > 0 && Object.keys(Meta.SCHOOL.upgrades).some(function (id) {
      const price = Meta.schoolUpgradeCost(meta, id);
      return price && !Meta.schoolUpgradeReason(meta, id) && meta.capital >= price.capital && meta.diplomas >= price.diplomas;
    });
  }

  function contractReadyNow() {
    return Meta.contractReady(meta) && Date.now() >= (meta.contract.cooldownUntil || 0);
  }

  // Session lines a building opens, by name; a whole dock tab is named as the tab.
  // form 'acc' — «Открывает: вкладку …», 'nom' — «Открыто: вкладка …».
  function cityOpensNames(id, form) {
    const opens = Meta.PROJECTS[id].opens || [];
    const names = [];
    (window.MicroBuildersUpgradeGroups || []).forEach(function (group) {
      const items = group.items.filter(function (item) { return opens.indexOf(item[0]) >= 0; });
      if (!items.length) return;
      if (items.length === group.items.length && items.length > 2) names.push((form === 'acc' ? 'вкладку' : 'вкладка') + ' «' + group.title + '»');
      else items.forEach(function (item) { names.push(item[1]); });
    });
    return names;
  }

  function cityGives(id) {
    const project = Meta.PROJECTS[id];
    const parts = [];
    const lines = cityOpensNames(id, 'acc');
    if (lines.length) parts.push('Открывает на стройке: ' + lines.join(', '));
    if (project.gives) parts.push(project.gives);
    if (project.rewardSeals && !(meta.hq[id] > 0)) parts.push('При постройке: +' + project.rewardSeals + ' ' + UI.plural(project.rewardSeals, 'печать', 'печати', 'печатей'));
    return parts.join('. ');
  }

  // ---- floating signs ----

  function buildCitySigns() {
    const layer = document.getElementById('city-signs');
    layer.innerHTML = '';
    layer.hidden = true;
    citySigns.clear();
    cityRecords.forEach(function (record, id) { citySigns.set(id, makeCitySign(layer, id)); });
    citySigns.set('expansion', makeCitySign(layer, 'expansion'));
  }

  function makeCitySign(layer, id) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'city-sign';
    el.dataset.id = id;
    el.hidden = true;
    layer.appendChild(el);
    // Anchored over the back edge of the roof: from the boulevard's raised camera the sign then
    // sits above the building, not over its facade.
    const spot = cityLotSpot(id);
    const back = id === 'expansion' ? 0 : CITY_LOT.depth / 2 - 1.2;
    return { id: id, el: el, anchor: new THREE.Vector3(spot.x, spot.top + 0.9, spot.z - back), key: '', x: NaN, y: NaN, z: '', shown: false, visible: false, tail: 0, w: 0, h: 0, sx: 0, sy: 0, depth: 0 };
  }

  function priceChip(icon, alt, need, have) {
    return '<span class="city-price ' + (have >= need ? 'ok' : 'short') + '"><img src="icons/icon-' + icon + '.jpg?v=2" alt="' + alt + '">' + formatCompact(need) + '</span>';
  }

  // Badges of a working building: «!» in the office, «Найм готов», the number of orders, «Контракт готов».
  function cityBadges(id) {
    if (id === 'office' && officeAffordable()) return ['<em class="city-badge alert" title="Есть прокачки по карману">!</em>'];
    if (id === 'tech' && techAffordable()) return ['<em class="city-badge alert" title="Можно открыть новую прокачку">!</em>'];
    if (id === 'recruiting' && schoolAffordable()) return ['<em class="city-badge">Обучение доступно</em>'];
    if (id === 'recruiting' && Meta.refreshRecruiting(meta).stock > 0) return ['<em class="city-badge">Найм готов</em>'];
    const special = id === 'exchange' ? Meta.specialOrder(meta) : null;
    if (special && !special.done) return ['<em class="city-badge alert" title="Спецзаказ дня: печати">★</em>'];
    if (id === 'exchange' && meta.exchange.orders.length > 0) {
      const count = meta.exchange.orders.length;
      return ['<em class="city-badge">' + count + ' ' + UI.plural(count, 'заказ', 'заказа', 'заказов') + '</em>'];
    }
    if (id === 'contracts' && contractReadyNow()) return ['<em class="city-badge">Контракт готов</em>'];
    return [];
  }

  function citySignView(id) {
    if (id === 'expansion') {
      const count = Meta.CITY.filter(function (spec) { return spec.zone === 'expansion'; }).length;
      const text = 'Скоро · ещё ' + count + ' ' + UI.plural(count, 'здание', 'здания', 'зданий');
      return { cls: 'is-soon', label: 'Зона расширения: ' + text, html: '<span class="city-sign-main">' + ICONS.crane + '<b>' + text + '</b></span>' };
    }
    const spec = cityRecords.get(id).spec;
    const project = Meta.PROJECTS[id];
    const state = cityState(id);
    const name = UI.escapeHtml(spec.sign);
    let icon = cityIcon(id);
    let extra = '';
    let line = '';
    let cls = 'is-' + state;
    let label = project.name;
    if (state === 'live') {
      extra = '<i class="city-dot" aria-hidden="true"></i>' + cityBadges(id).join('');
      label += ': работает';
    } else if (state === 'building') {
      const pct = cityBuildPercent(id);
      line = '<span class="city-sign-line">Стройка ' + pct + '%</span><span class="city-sign-bar"><i style="width:' + pct + '%"></i></span>';
      label += ': стройка ' + pct + '%';
    } else if (state === 'ready') {
      line = '<span class="city-sign-line">Можно строить</span>';
      label += ': можно строить';
    } else if (state === 'plot') {
      const can = cityShortfall(id).length === 0;
      cls += can ? ' is-afford' : '';
      line = '<span class="city-sign-line">' + priceChip('capital', 'капитал', project.capital, meta.capital) +
        (project.seals ? priceChip('seals', 'печати', project.seals, meta.seals) : '') +
        (project.rare ? Object.keys(project.rare).map(function (key) { return priceChip('rare-' + key, Meta.RARE_NAMES[key], project.rare[key], meta.rare[key] || 0); }).join('') : '') + '</span>';
      label += can ? ': можно купить участок' : ': участок, не хватает ресурсов';
    } else {
      icon = ICONS.lock;
      line = '<span class="city-sign-line">с уровня ' + (project.unlock + 1) + '</span>';
      label += ': откроется с уровня ' + (project.unlock + 1);
    }
    return { cls: cls, label: label, html: '<span class="city-sign-main">' + icon + '<b>' + name + '</b>' + extra + '</span>' + line };
  }

  // The arrow: the next step, otherwise the building to save up for (never a locked one).
  function cityArrowTarget() {
    const advice = cityAdvice();
    return advice && cityState(advice.id) !== 'locked' ? advice.id : null;
  }

  function paintCitySigns() {
    const next = cityArrowTarget();
    citySigns.forEach(function (sign, id) {
      const view = citySignView(id);
      const cls = 'city-sign ' + view.cls + (id === next ? ' is-next' : '') + (id === cityBuilding ? ' is-selected' : '');
      const html = view.html + (id === next ? '<span class="city-sign-next" aria-hidden="true">' + ICONS.chevron + '</span>' : '');
      const key = cls + '|' + html;
      if (sign.key === key) return;
      sign.key = key;
      sign.el.className = cls;
      sign.el.innerHTML = html;
      sign.el.setAttribute('aria-label', view.label);
      sign.w = 0; // measured again on its next placement
    });
  }

  // Locked lots far ahead keep quiet: only the next two to open show «с уровня N», and the expansion
  // teaser waits until at most one lot of the quarter is still locked.
  function quietCitySigns() {
    const locked = [];
    citySigns.forEach(function (sign, id) { if (id !== 'expansion' && cityState(id) === 'locked') locked.push(id); });
    locked.sort(function (a, b) { return Meta.PROJECTS[a].unlock - Meta.PROJECTS[b].unlock; });
    const quiet = new Set(locked.slice(2));
    if (locked.length > 1) quiet.add('expansion');
    return quiet;
  }

  // Signs follow their lots on screen (stage px), nearer ones on top; a lot off screen hides its
  // sign. A sign that would cover a nearer one slides sideways or climbs above it, whichever moves
  // it less (the far rows crowd on wide screens); with no room a locked or «Скоро» sign steps
  // aside. Signs never show under the wallet and the site chip or past the screen edges.
  function placeCitySigns() {
    const layer = document.getElementById('city-signs');
    const visible = cityRoot.visible && currentScreen === 'hq';
    if (layer.hidden === visible) layer.hidden = !visible;
    if (!visible) return;
    const width = MicroBuildersStage.width();
    const height = MicroBuildersStage.height();
    camera.updateMatrixWorld();
    const shown = [];
    const quiet = quietCitySigns();
    citySigns.forEach(function (sign) {
      citySignPoint.copy(sign.anchor).project(camera);
      sign.visible = !quiet.has(sign.id) &&
        citySignPoint.z > -1 && citySignPoint.z < 1 && Math.abs(citySignPoint.x) < 1 && citySignPoint.y < 1 && citySignPoint.y > -1.05;
      if (!sign.visible) return;
      if (!sign.w) {
        if (!sign.shown) {
          sign.shown = true;
          sign.el.hidden = false;
        }
        sign.w = sign.el.offsetWidth;
        sign.h = sign.el.offsetHeight + (sign.el.classList.contains('is-next') ? 26 : 0) + 8;
      }
      sign.depth = citySignPoint.z;
      sign.sx = Math.round((citySignPoint.x + 1) / 2 * width);
      sign.sy = Math.round((1 - citySignPoint.y) / 2 * height);
      shown.push(sign);
    });
    shown.sort(function (a, b) { return a.depth - b.depth; });
    const minTop = cameraController.getSafeArea().top;
    const placed = [];
    function hitAt(sign, x, y) {
      return placed.find(function (other) {
        return Math.abs(other.x - x) * 2 < other.w + sign.w + 4 && y > other.y - other.h && y - sign.h < other.y;
      });
    }
    function covered(sign, x, y) {
      const top = y - sign.h + 8;
      return top < 0 || cityCovers.some(function (cover) {
        return x + sign.w / 2 > cover.left && x - sign.w / 2 < cover.right && y > cover.top && top < cover.bottom;
      });
    }
    shown.forEach(function (sign) {
      const half = sign.w / 2;
      let x = Math.min(Math.max(sign.sx, half + 4), width - half - 4);
      let y = sign.sy;
      const hit = hitAt(sign, x, y);
      if (hit) {
        let best = null;
        // Sideways off the nearer sign, as far as the tail can still point at the lot.
        const side = hit.x + (sign.sx >= hit.x ? 1 : -1) * ((hit.w + sign.w) / 2 + 3);
        if (Math.abs(side - sign.sx) <= half - 14 && side >= half + 4 && side <= width - half - 4 && !hitAt(sign, side, y)) {
          best = { x: side, y: y, move: Math.abs(side - x) };
        }
        // Up above it, only within the free band.
        let up = y;
        let upHit = hit;
        for (let pass = 0; upHit && pass < placed.length; pass++) {
          up = upHit.y - upHit.h - 2;
          upHit = hitAt(sign, x, up);
        }
        if (!upHit && up - sign.h >= minTop && (!best || y - up < best.move)) best = { x: x, y: up, move: y - up };
        if (best) {
          x = best.x;
          y = best.y;
        } else if (sign.id === 'expansion' || cityState(sign.id) === 'locked') {
          sign.visible = false;
          return;
        }
      }
      if (covered(sign, x, y)) {
        sign.visible = false;
        return;
      }
      placed.push({ x: x, y: y, w: sign.w, h: sign.h });
      if (x !== sign.x || y !== sign.y) {
        sign.x = x;
        sign.y = y;
        sign.el.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -100%)';
      }
      // The tail keeps pointing at the lot when the sign moved sideways.
      const tail = Math.max(-(half - 12), Math.min(half - 12, sign.sx - x));
      if (tail !== sign.tail) {
        sign.tail = tail;
        sign.el.style.setProperty('--tail', tail + 'px');
      }
      const z = String(Math.round((1 - sign.depth) * 2000));
      if (sign.z !== z) {
        sign.z = z;
        sign.el.style.zIndex = z;
      }
    });
    citySigns.forEach(function (sign) {
      if (sign.shown === sign.visible) return;
      sign.shown = sign.visible;
      sign.el.hidden = !sign.visible;
    });
  }

  // ---- animation, showing and leaving the city ----

  function tickCityBuild(dt) {
    if (!cityRoot.visible) return;
    if (cityDecor.cars) {
      const far = cityZoneFront();
      const near = CITY_AVENUE.near;
      cityDecor.cars.forEach(function (car) {
        const lane = car.userData.lane;
        // Right-hand traffic: the right lane drives away from the camera, the left one towards it.
        car.userData.z -= lane * car.userData.speed * dt;
        if (car.userData.z < far) car.userData.z += near - far;
        if (car.userData.z > near) car.userData.z -= near - far;
        const edge = Math.min(car.userData.z - far, near - car.userData.z);
        car.position.set(lane * CITY_AVENUE.width / 4, 0, car.userData.z);
        car.rotation.y = lane > 0 ? Math.PI : 0;
        car.scale.setScalar(Math.max(0.001, Math.min(1, edge / 1.5)));
      });
    }
    if (cityDecor.ring && cityDecor.ring.visible) {
      cityDecor.ring.userData.t = (cityDecor.ring.userData.t || 0) + dt;
      cityMat.ring.opacity = 0.6 + Math.sin(cityDecor.ring.userData.t * Math.PI * 3) * 0.3;
    }
    if (cityReveal) {
      cityReveal.t += dt;
      const record = cityRecords.get(cityReveal.id);
      if (cityReveal.phase === 'fly' && cityReveal.t >= 0.9) {
        cityReveal.phase = 'grow';
        record.reveal = 0;
      } else if (cityReveal.phase === 'grow' && record.reveal < 0) {
        finishCityReveal();
      }
    }
    cityRecords.forEach(function (record) {
      if (record.reveal < 0) return;
      record.reveal += dt / 2.2;
      if (record.reveal >= 1.05) record.reveal = -1;
      showCityBlocks(record, true, false, record.reveal);
    });
  }

  // A working building the player has not seen yet (the one asked for first).
  function cityFreshBuilding() {
    if (cityBuilding && cityRecords.has(cityBuilding) && meta.hq[cityBuilding] > 0 && !meta.citySeen[cityBuilding]) return cityBuilding;
    const ids = cityIdsByUnlock();
    for (let i = 0; i < ids.length; i++) if (meta.hq[ids[i]] > 0 && !meta.citySeen[ids[i]]) return ids[i];
    return null;
  }

  // A building finished while the HQ is already open (a catch-up, «Смотреть в штабе» from there):
  // its reveal starts as soon as no window covers the city.
  function revealFreshBuilding() {
    if (cityReveal || document.body.classList.contains('has-modal')) return;
    const fresh = cityFreshBuilding();
    if (fresh) startCityReveal(fresh);
  }

  // A new building: the camera flies to its lot, it grows cube by cube, then its card «Новое здание: …».
  function startCityReveal(id) {
    meta.citySeen[id] = true;
    Meta.save(meta);
    cityReveal = { id: id, phase: 'fly', t: 0 };
    cityBuilding = id;
    cityNewBuilding = null;
    syncCity();
    paintCityCard();
    flyToCityLot(id, 0.9);
  }

  function finishCityReveal() {
    const id = cityReveal.id;
    cityReveal = null;
    cityRecords.get(id).reveal = -1;
    // Other buildings finished meanwhile appear at once.
    cityRecords.forEach(function (record, other) {
      if (meta.hq[other] > 0 && !meta.citySeen[other]) meta.citySeen[other] = true;
    });
    Meta.save(meta);
    cityBuilding = id;
    cityNewBuilding = id;
    syncCity();
    paintCityCard();
  }

  function flyToCityLot(id, seconds) {
    const spot = cityLotSpot(id);
    const zone = id === 'expansion';
    cameraController.flyTo({
      target: { x: spot.x, y: Math.max(1, spot.top * 0.4), z: spot.z + 0.5 },
      distance: cameraController.homeDistance * (zone ? 0.62 : 0.5),
      azimuth: 0,
      polar: 0.98,
    }, seconds);
  }

  // Entering the HQ shows the whole quarter. Opening and closing a building's window over the
  // city (office, exchange, recruiting) keeps the camera where it is.
  function showCity() {
    if (cityRoot.visible) {
      syncCity();
      paintCityWallet();
      placeCitySigns();
      revealFreshBuilding();
      return;
    }
    if (world && campaign && campaign.status !== 'title') cameraStates.site[siteCameraKey()] = cameraController.saveState();
    if (cameraController.isWorkerView()) cameraController.setWorkerView(false);
    levelRoot.visible = false;
    grass.visible = false;
    cityRoot.visible = true;
    cityRefreshKey = '';
    cameraController.setMode('city', cityCameraBounds());
    paintCityWallet();
    paintSiteChip(); // its height is part of the band measured below
    syncCity();
    paintCityCard();
    refreshSafeArea({ snap: true });
    cameraController.frameHome();
    applySceneLighting();
    revealFreshBuilding();
    if (!cityReveal && cityBuilding) selectCityLot(cityBuilding);
    placeCitySigns();
  }

  function hideCity() {
    const wasCity = cityRoot.visible;
    cityRoot.visible = false;
    levelRoot.visible = true;
    grass.visible = true;
    if (!wasCity) return;
    if (cityReveal) {
      cityRecords.get(cityReveal.id).reveal = -1;
      cityReveal = null;
    }
    cityBuilding = null;
    cityNewBuilding = null;
    placeCitySigns();
    paintCityWallet();
    placeCityRing();
    cameraStates.city = cameraController.saveState();
    if (!cameraController.setMode('site')) return;
    // Back from the city: the view the player left on this site, otherwise its home.
    refreshSafeArea({ snap: true });
    if (!world || !restoreSiteCamera()) cameraController.frameHome();
    applySceneLighting();
  }

  // The quarter's camera box; a wide (landscape) screen looks more from above, otherwise the far
  // rows squeeze into a thin strip and their signs overlap.
  function cityCameraBounds() {
    const wide = MicroBuildersStage.width() > MicroBuildersStage.height();
    return Object.assign({}, CITY_CAMERA, { polar: wide ? 0.62 : 0.85 });
  }

  // A tap in the city: only lots and the expansion zone count (trees, lamps and cars do not).
  function pickCity(event) {
    const rect = view.getBoundingClientRect();
    workerPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    workerRaycaster.setFromCamera(workerPointer, camera);
    const targets = [];
    cityRecords.forEach(function (record) { targets.push(record.lot); });
    if (cityDecor.expansion) targets.push(cityDecor.expansion);
    const hits = workerRaycaster.intersectObjects(targets, true);
    let id = null;
    if (hits.length > 0) {
      let object = hits[0].object;
      while (object && !object.userData.buildingId) object = object.parent;
      if (object) id = object.userData.buildingId;
    }
    if (id) {
      selectCityLot(id);
    } else if (cityBuilding && !cityReveal) {
      // Empty ground closes the card; the camera stays («◎» brings the quarter back).
      clearCitySelection();
      paintCameraButton();
    }
  }

  // Tap on a lot or its sign, «Показать»: the camera flies to it, the lot lights up, its card opens.
  function selectCityLot(id) {
    if (!id || (id !== 'expansion' && !cityRecords.has(id)) || !cityRoot.visible || cityReveal) return;
    if (cityNewBuilding !== id) cityNewBuilding = null;
    cityBuilding = id;
    paintCitySigns();
    placeCityRing();
    // The card first: it re-measures the band, and the close-up distance comes from the band above
    // this lot's card (not the card shown before).
    paintCityCard();
    flyToCityLot(id, 0.6);
    paintCameraButton();
  }

  // The overview card again: no selected lot, no outline.
  function clearCitySelection() {
    cityBuilding = null;
    cityNewBuilding = null;
    paintCitySigns();
    placeCityRing();
    paintCityCard();
  }

  function closeCityCard() {
    if (cityReveal) return;
    cameraController.frameHome({ animate: true });
    clearCitySelection();
    paintCameraButton();
  }

  // Currencies, timers and the HQ site change under an open city: signs, card and wallet follow.
  function refreshCity() {
    if (!cityRoot.visible || currentScreen !== 'hq') return;
    revealFreshBuilding();
    const recruit = meta.hq.recruiting > 0 ? Meta.refreshRecruiting(meta) : null;
    const saved = Meta.site(meta, 'hq');
    const key = [
      meta.capital, meta.seals, meta.campaignLevel, JSON.stringify(meta.rare), JSON.stringify(meta.hq), JSON.stringify(meta.plots),
      meta.hqSite ? meta.hqSite.id : '', saved ? saved.built : 0, liveKey === 'hq' && world ? world.remaining : 0,
      recruit ? recruit.stock + ':' + Math.floor((recruit.nextAt - Date.now()) / 60000) : '',
      meta.exchange.orders.length, contractReadyNow() ? 1 : 0, officeAffordable() ? 1 : 0, schoolAffordable() ? 1 : 0, meta.diplomas, liveKey,
    ].join('|');
    if (key === cityRefreshKey) return;
    cityRefreshKey = key;
    syncCity();
    paintCityCard();
    paintCityWallet();
  }

  // ---- company wallet and the building card ----

  function paintCityWallet() {
    const wallet = document.getElementById('city-wallet');
    const show = currentScreen === 'hq' && cityRoot.visible;
    if (wallet.hidden === show) wallet.hidden = !show;
    if (!show) return;
    const items = [['capital', 'Капитал', meta.capital]];
    // Seals and diplomas once there are some or their building stands; rare resources once something
    // spends them (no row of zeros, no currency before its first use).
    if (meta.seals > 0 || meta.hq.tech > 0) items.push(['seals', 'Печати', meta.seals]);
    if (meta.diplomas > 0 || meta.hq.recruiting > 0) items.push(['diplomas', 'Дипломы', meta.diplomas]);
    if (rareInPlay()) {
      Object.keys(meta.rare).forEach(function (key) {
        if (meta.rare[key] > 0) items.push(['rare-' + key, Meta.RARE_NAMES[key], meta.rare[key]]);
      });
    }
    if (meta.hq.training > 0) items.push(['training', 'Опыт учебного центра', Meta.trainingXp(meta)]);
    const html = items.map(function (item) {
      const file = item[0] === 'diplomas' ? 'diplomas.svg' : item[0] === 'training' ? 'training-xp.jpg' : item[0] + '.jpg?v=2';
      const icon = '<img class="game-icon currency-icon" src="icons/icon-' + file + '" alt="' + item[1] + '">';
      return '<span class="pill" title="' + item[1] + '">' + icon + '<b>' + formatCompact(item[2]) + '</b></span>';
    }).join('');
    if (html === cityWalletHtml) return;
    cityWalletHtml = html;
    wallet.innerHTML = html;
    queueSafeArea(); // the pills' span is a cover for the signs
  }

  // Rare resources are paid from the first order but spent only by the supply, the exchange and the
  // reactor: till one of them stands they are kept quietly (no wallet pill, no reward tile).
  function rareInPlay() {
    return meta.hq.supply > 0 || meta.hq.exchange > 0 || meta.hq.reactor > 0;
  }

  function cityCardHead(icon, kicker, title, chip, closable) {
    return '<header class="city-card-head"><span class="city-card-icon">' + icon + '</span>' +
      '<div class="city-card-titles"><p class="kicker">' + kicker + '</p><h3>' + title + '</h3>' +
      (chip ? '<span class="city-chip ' + chip.tone + '">' + chip.text + '</span>' : '') + '</div>' +
      (closable ? '<button type="button" class="city-card-close" data-action="city-close" aria-label="Закрыть">×</button>' : '') + '</header>';
  }

  function cityStateChip(id, state) {
    const project = Meta.PROJECTS[id];
    if (state === 'live') return { text: 'Работает', tone: 'ok' };
    if (state === 'building') return { text: 'Стройка · ' + cityBuildPercent(id) + '%', tone: 'warn' };
    if (state === 'ready') return { text: 'Участок куплен', tone: 'info' };
    if (state === 'plot') return cityShortfall(id).length ? { text: 'Не хватает ресурсов', tone: 'bad' } : { text: 'Можно купить', tone: 'info' };
    return { text: 'Откроется с уровня ' + (project.unlock + 1), tone: 'muted' };
  }

  // «Капитал 250 (есть 180)» per currency of the plot price.
  function cityCostRows(id) {
    const project = Meta.PROJECTS[id];
    const rows = [['capital', 'Капитал', project.capital, meta.capital]];
    if (project.seals) rows.push(['seals', 'Печати', project.seals, meta.seals]);
    if (project.rare) Object.keys(project.rare).forEach(function (key) { rows.push(['rare-' + key, Meta.RARE_NAMES[key], project.rare[key], meta.rare[key] || 0]); });
    return '<ul class="city-cost">' + rows.map(function (row) {
      return '<li class="' + (row[3] >= row[2] ? 'ok' : 'short') + '"><img class="currency-icon" src="icons/icon-' + row[0] + '.jpg?v=2" alt="">' +
        '<span>' + row[1] + ' <b>' + row[2].toLocaleString('ru-RU') + '</b></span><small>(есть ' + row[3].toLocaleString('ru-RU') + ')</small></li>';
    }).join('') + '</ul>';
  }

  // The one main button of a lot card; a button that cannot be pressed says why.
  function cityAction(id, state) {
    const other = meta.hqSite && meta.hqSite.id !== id ? Meta.PROJECTS[meta.hqSite.id].name : '';
    if (state === 'plot') {
      if (other) return { label: 'Сначала достройте «' + other + '»', disabled: true };
      const missing = cityShortfall(id);
      if (missing.length) return { label: 'Не хватает ' + joinAnd(missing), disabled: true };
      return { label: 'Купить участок и строить', action: 'take-build' };
    }
    if (state === 'ready') return other ? { label: 'Сначала достройте «' + other + '»', disabled: true } : { label: 'Начать стройку', action: 'take-build' };
    if (state === 'building') return { label: liveKey === 'hq' ? 'Вернуться на стройку' : 'Продолжить стройку', action: 'take-build' };
    if (state === 'locked') return { label: 'Откроется с уровня ' + (Meta.PROJECTS[id].unlock + 1), disabled: true };
    if (id === 'office') return { label: 'Открыть отделы', action: 'city-open', note: officeAffordable() ? 'Есть прокачки, на которые хватает капитала' : '' };
    if (id === 'tech') {
      const opened = Meta.TECH_ORDER.filter(function (tech) { return meta.tech[tech] > 0; }).length;
      return { label: 'Открыть техцентр', action: 'city-open', note: 'Открыто технологий: ' + opened + ' из ' + Meta.TECH_ORDER.length };
    }
    if (id === 'exchange') {
      const count = meta.exchange.orders.length;
      return { label: 'Открыть биржу', action: 'city-open', note: 'Заказы на бирже: ' + count + ' из ' + Meta.exchangeCapacity(meta) };
    }
    if (id === 'recruiting') return { label: 'Открыть школу', action: 'city-open', note: 'Попытки сегодня: ' + Meta.schoolAttempts(meta).left + ' / 5' };
    if (id === 'contracts') return { label: 'Открыть контракты', action: 'city-contracts' };
    if (id === 'training') return { label: 'Открыть учебный центр', action: 'city-open', note: 'Опыт центра ' + formatCompact(Meta.trainingXp(meta)) + (Meta.trainingUpgradeLevel(meta, 'onsite') > 0 ? ' · разряды до ' + Meta.trainingStats(meta).cap : ' · опыт рабочих ещё не включён') };
    if (id === 'supply') return { label: 'Открыть снабжение', action: 'city-open', note: 'Бустеров открыто: ' + Object.keys(Meta.BOOSTERS).filter(function (b) { return Meta.boosterLevel(meta, b) > 0; }).length + ' из ' + Object.keys(Meta.BOOSTERS).length };
    if (id === 'reactor') return { label: 'Открыть реактор', action: 'city-open', note: 'Заклинаний изучено: ' + Object.keys(Meta.SPELLS).filter(function (s) { return Meta.spellLevel(meta, s) > 0; }).length + ' из ' + Object.keys(Meta.SPELLS).length };
    if (id === 'personnel') {
      const owned = Meta.DISHES.filter(function (dish) { return Meta.dishOwned(meta, dish.id); }).length;
      return { label: 'Открыть центр персонала', action: 'city-cookbook',
        note: 'Кухня до ур. ' + Meta.canteenMaxLevel(meta) + ' · блюда ' + owned + '/' + Meta.DISHES.length };
    }
    return null;
  }

  function cityActionHtml(id, action) {
    if (!action) return '';
    return '<button type="button" class="primary city-action"' + (action.action ? ' data-action="' + action.action + '" data-id="' + id + '"' : '') +
      (action.disabled ? ' disabled' : '') + '>' + UI.escapeHtml(action.label) + '</button>' +
      (action.note ? '<p class="city-note">' + UI.escapeHtml(action.note) + '</p>' : '');
  }

  function cityLotCard(id) {
    const project = Meta.PROJECTS[id];
    const state = cityState(id);
    const fresh = cityNewBuilding === id && state === 'live';
    let html = cityCardHead(cityIcon(id), fresh ? 'Новое здание' : 'Штаб', UI.escapeHtml(fresh ? 'Новое здание: ' + project.name : project.name), cityStateChip(id, state), true);
    if (fresh) {
      const lines = cityOpensNames(id, 'nom');
      html += '<p class="city-opened"><b>Открыто:</b> ' + UI.escapeHtml(project.opened || project.text) + '</p>' +
        (lines.length ? '<p class="city-opened"><b>На стройке:</b> ' + UI.escapeHtml(lines.join(', ')) + '</p>' : '');
    } else {
      html += '<section class="city-gives"><h4>Что даёт</h4><p>' + UI.escapeHtml(cityGives(id)) + '</p></section>';
    }
    if (state === 'plot' || state === 'locked') html += cityCostRows(id);
    if (state === 'building') {
      const pct = cityBuildPercent(id);
      html += '<div class="city-progress"><i style="width:' + pct + '%"></i></div>';
    }
    return html + cityActionHtml(id, cityAction(id, state));
  }

  function cityZoneCard() {
    const specs = Meta.CITY.filter(function (spec) { return spec.zone === 'expansion'; });
    return cityCardHead(ICONS.crane, 'Штаб', 'Зона расширения', { text: 'Скоро', tone: 'muted' }, true) +
      '<ul class="city-soon">' + specs.map(function (spec) {
        const project = Meta.PROJECTS[spec.id];
        return '<li><b>' + UI.escapeHtml(project.name) + '</b><span>' + UI.escapeHtml(project.text) + '</span></li>';
      }).join('') + '</ul><p class="city-note">Здания появятся в следующих обновлениях.</p>';
  }

  // Nothing selected: how far the quarter is and the next step with «Показать».
  function cityOverviewCard() {
    const ids = cityIdsByUnlock();
    const built = ids.filter(function (id) { return meta.hq[id] > 0; }).length;
    const advice = cityAdvice();
    let html = cityCardHead(ICONS.hq, 'Штаб', 'Построено ' + built + ' из ' + ids.length, null, false);
    if (advice) {
      html += '<div class="city-next-row"><p class="city-next">' + advice.html + '</p>' +
        '<button type="button" class="primary city-action" data-action="city-show" data-id="' + advice.id + '">Показать</button></div>';
    } else {
      html += '<p class="city-next">Все здания построены. Новые появятся в зоне расширения.</p>';
    }
    // The chip leads back to the site on screen; the main order gets its own way back.
    const main = Meta.site(meta, 'campaign');
    if (liveKey && liveKey !== 'campaign' && main) {
      html += '<button type="button" class="city-text-btn" data-action="site-switch" data-id="campaign">Основная стройка · ' + UI.escapeHtml(main.name) + ' ›</button>';
    }
    return html;
  }

  // The bottom sheet of the city: a lot's card, the expansion zone, or the overview.
  function paintCityCard() {
    const card = document.getElementById('city-card');
    const show = currentScreen === 'hq' && cityRoot.visible && !cityReveal;
    if (card.hidden === show) card.hidden = !show;
    const focus = show && (cityBuilding === 'expansion' || cityRecords.has(cityBuilding)) ? cityBuilding : null;
    if (show) {
      const html = focus === 'expansion' ? cityZoneCard() : focus ? cityLotCard(focus) : cityOverviewCard();
      card.classList.toggle('is-overview', !focus);
      if (html !== cityCardHtml) {
        cityCardHtml = html;
        card.innerHTML = html;
      }
    }
    // Back and Escape close a lot card; the overview card is the quarter itself and stays.
    UI.layer.set('city-card', focus ? closeCityCard : null);
    refreshSafeArea();
  }

  function onCityCardAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'city-close') {
      closeCityCard();
    } else if (action === 'city-show') {
      selectCityLot(id);
    } else if (action === 'city-open' || action === 'city-contracts') {
      openBuildingPanel(id);
    } else if (action === 'city-cookbook') {
      openBuildingPanel('personnel');
    } else if (action === 'take-build') {
      takeBuild(id);
    } else if (action === 'site-switch') {
      switchSite(id);
    }
  }

  // Something new among the foremen: an unseen card or one ready to level up.
  function foremenNews() {
    return Object.keys(Meta.CARDS).some(function (id) {
      return (meta.cards[id].level > 0 && meta.cardsSeen[id] !== true) || foremanCanUpgrade(id);
    });
  }

  // Why a nav tab is still closed, '' when it is open. Tabs never disappear (§9): a closed one shows
  // a lock and says this in a toast.
  function navLock(screen) {
    if (screen === 'foremen' && !Object.keys(Meta.CARDS).some(function (id) { return meta.cards[id].level > 0; })) {
      return 'Появится с первым бригадиром';
    }
    if (screen === 'exchange' && !(meta.hq.exchange > 0)) return 'Откроется после постройки Биржи';
    // Contracts open with the story (Meta.contractBoardOpen), long before the contract bureau.
    if (screen === 'contract' && !Meta.contractBoardOpen(meta)) return 'Откроется после заказа 2';
    return '';
  }

  function refreshNav() {
    document.querySelectorAll('#app-nav [data-screen]').forEach(function (button) {
      const lock = navLock(button.dataset.screen);
      if (button.classList.contains('locked') !== !!lock) {
        button.classList.toggle('locked', !!lock);
        button.setAttribute('aria-disabled', lock ? 'true' : 'false');
      }
      if (button.title !== lock) button.title = lock;
    });
    document.querySelector('#app-nav [data-screen="foremen"]').classList.toggle('has-news', !navLock('foremen') && foremenNews());
    // «Стройка» says where it leads: the site the player builds now.
    const snap = Meta.site(meta, Meta.activeSite(meta));
    setText('nav-site', snap ? snap.name : '');
    // The nav is the quarter's: hidden on the site (it has the «Штаб» button) and while nothing
    // behind it is open yet.
    const anyOpen = !navLock('foremen') || !navLock('exchange') || !navLock('contract');
    document.body.classList.toggle('nav-off', currentScreen === 'build' || !anyOpen);
    const hqButton = document.getElementById('hq-btn');
    hqButton.classList.toggle('locked', contractRunning());
    // The very first level has no way out: the quarter opens with its reward.
    hqButton.hidden = !!(campaign && world && campaign.runMode === 'campaign' && world.level.index === 0 && campaign.status === 'play');
    hqButton.classList.toggle('has-news', currentScreen === 'build' && hqNews());
  }

  // Something waits in the quarter: a new or upgradable foreman, a buildable plot or a finished-to-
  // start building, an affordable office line, a recruit, an exchange order, a ready contract.
  function hqNews() {
    if (!navLock('foremen') && foremenNews()) return true;
    const next = cityRecords.size ? cityNextStep() : null;
    if (next && cityState(next) !== 'building') return true;
    if (meta.hq.office > 0 && officeAffordable()) return true;
    if (schoolAffordable() || (meta.hq.recruiting > 0 && Meta.schoolHasUpgrade(meta, 'recruiting') && meta.recruit && meta.recruit.stock > 0)) return true;
    if (meta.hq.exchange > 0 && meta.exchange.orders.length > 0) return true;
    return Meta.contractBoardOpen(meta) && contractReadyNow();
  }

  function isPanel(screen) {
    return PANEL_SCREENS.indexOf(screen) >= 0;
  }

  // A working HQ building's own panel, from its card: the office, recruiting, contracts and the
  // exchange (the same screen as its nav tab). × comes back to this card. False: no panel (yet).
  function openBuildingPanel(id) {
    const screen = { office: 'office', tech: 'tech', exchange: 'exchange', recruiting: 'recruiting', contracts: 'contract', personnel: 'personnel', supply: 'supply', reactor: 'reactor', training: 'training' }[id];
    if (!screen || !(meta.hq[id] > 0)) return false;
    cityBuilding = id;
    return openScreen(screen);
  }

  // ×, Back and Escape of a company panel: back where it was opened from — the site, or the quarter
  // with the same lot card.
  function closePanel() {
    if (!isPanel(currentScreen)) return;
    if (panelReturn.screen === 'hq') {
      cityBuilding = panelReturn.building;
      openScreen('hq');
    } else {
      openScreen('build');
    }
  }

  // Back inside «Бригадиры» goes from a card's detail to the grid first.
  function onPanelBack() {
    if (currentScreen === 'foremen' && foremanFocus) {
      showForemanGrid();
      UI.layer.set('panel', onPanelBack);
    } else {
      closePanel();
    }
  }

  // Every screen change goes through here. Leaving the build screen leaves the site (it goes on
  // without the player); coming back catches every site up and shows the return window.
  // opts.silent: no leave / return (launches, restores and the boot do their own).
  function openScreen(screen, opts) {
    const from = currentScreen;
    const silent = !!(opts && opts.silent);
    if (!silent && from === 'build' && screen !== 'build' && contractLocked()) return false;
    // A panel's × leads back where the first panel was opened (panel to panel keeps it).
    if (isPanel(screen) && !isPanel(from)) panelReturn = { screen: from, building: from === 'hq' ? cityBuilding : null };
    // Before showScreen: the HQ and the site measure the free band for the camera there, and
    // `away` hides or shows the dock and the site chip.
    document.body.classList.toggle('away', screen !== 'build');
    // A new visit of the tech centre picks its node anew (the losses may have moved), a tapped one stays.
    if (screen === 'tech' && from !== 'tech' && techAuto) techSelected = null;
    showScreen(screen);
    paintSiteChip();
    if (silent) return true;
    if (from === 'build' && screen !== 'build') leaveSite();
    else if (from !== 'build' && screen === 'build') returnToSite();
    return true;
  }

  // Chip «Цитадель · 63% · без вас ›» while the player is in the HQ or a panel.
  function paintSiteChip() {
    const chip = document.getElementById('site-chip');
    const show = currentScreen !== 'build' && !!liveKey && !!world && !!campaign && campaign.status !== 'title';
    chip.hidden = !show;
    if (!show) return;
    const done = world.blocks.length - world.remaining;
    const state = campaign.status === 'complete' ? 'сдан' : 'без вас';
    const pct = percentOf(done, world.blocks.length);
    document.getElementById('site-chip-text').textContent =
      Meta.siteName(campaign.runMode, campaign.levelIndex, campaign.runPayload) + ' · ' + pct + '% · ' + state;
    // The thin bar along the chip's bottom edge.
    chip.style.setProperty('--site-pct', pct + '%');
    chip.classList.toggle('is-done', campaign.status === 'complete');
  }

  // Sticky «Следующий заказ ▸» on a finished site, the contract lock and the run-specific menu items.
  function paintSiteState() {
    const complete = !!liveKey && campaign.status === 'complete';
    document.body.classList.toggle('site-complete', complete);
    const cta = document.getElementById('next-cta');
    cta.hidden = !complete;
    if (complete) {
      cta.textContent = campaign.runMode !== 'campaign' ? 'На основную стройку ▸'
        : (campaign.levelIndex >= MB.LEVELS.length - 1 ? 'Итог кампании ▸' : 'Следующий заказ ▸');
    }
    document.body.classList.toggle('contract-lock', contractRunning());
    document.getElementById('restart').hidden = timedMode(campaign.runMode) || campaign.status === 'title' || campaign.status === 'complete';
    const abandon = document.getElementById('abandon-run');
    const side = liveKey === 'side' && campaign.status === 'play';
    abandon.hidden = !side;
    if (side) abandon.textContent = campaign.runMode === 'school' ? 'Бросить испытание' : campaign.runMode === 'contract' ? 'Бросить контракт' : 'Бросить заказ биржи';
  }

  function showScreen(screen) {
    const changed = screen !== currentScreen;
    if (changed) {
      // «новый» on a card goes when its detail opens or the player leaves the tab.
      if (currentScreen === 'foremen') markForemenSeen();
      foremanFocus = null;
    }
    currentScreen = screen;
    refreshNav();
    // The office, the tech center and recruiting belong to the quarter: its tab stays lit.
    const tab = screen === 'office' || screen === 'tech' || screen === 'recruiting' ? 'hq' : screen;
    document.querySelectorAll('#app-nav [data-screen]').forEach(function (button) {
      button.classList.toggle('on', button.dataset.screen === tab);
    });
    const panel = document.getElementById('meta-panel');
    const panelScreen = isPanel(screen);
    document.body.classList.toggle('city-view', screen === 'hq');
    document.body.classList.toggle('panel-open', panelScreen);
    if (screen !== 'hq') {
      hideCity();
      document.getElementById('city-card').hidden = true;
      UI.layer.set('city-card', null);
    }
    panel.classList.toggle('hidden', !panelScreen);
    if (screen === 'hq') {
      showCity();
      paintCityCard();
    }
    if (panelScreen) {
      if (changed) panel.scrollTop = 0;
      renderMetaScreen();
    }
    UI.layer.set('panel', panelScreen ? onPanelBack : null);
  }

  // Header of each company panel: kicker and title (the × and the wallet are the same for all).
  function panelHead(screen) {
    if (screen === 'foremen') {
      const ids = Object.keys(Meta.CARDS);
      const owned = ids.filter(function (id) { return meta.cards[id].level > 0; }).length;
      return { kicker: 'Ваши карты · ' + owned + ' из ' + ids.length, title: 'Бригадиры' };
    }
    if (screen === 'exchange') return { kicker: 'Штаб · старые заказы', title: 'Биржа' };
    if (screen === 'contract') return { kicker: 'Штаб · заказы на время', title: 'Контракты' };
    if (screen === 'office') return { kicker: 'Штаб · отделы', title: 'Главный офис' };
    if (screen === 'tech') return { kicker: 'Штаб · новые прокачки', title: 'Технологический центр' };
    if (screen === 'personnel') return { kicker: 'Штаб · городок и столовая', title: 'Центр персонала' };
    if (screen === 'supply') return { kicker: 'Штаб · бустеры на заказ', title: 'Снабжение' };
    if (screen === 'training') return { kicker: 'Штаб · опыт и разряды рабочих', title: 'Учебный центр' };
    if (screen === 'reactor') return { kicker: 'Штаб · техно-магия', title: 'Реактор' };
    return { kicker: 'Штаб · бригадиры', title: 'Школа бригадиров' };
  }

  function renderMetaScreen() {
    if (!isPanel(currentScreen)) return;
    const content = document.getElementById('meta-content');
    content.innerHTML = '';
    const side = Meta.site(meta, 'side');
    if (currentScreen === 'exchange' && side && side.status === 'play' && side.runMode === 'exchange') {
      content.insertAdjacentHTML('beforeend',
        '<article class="meta-card panel-wide"><h3>Идёт заказ биржи · ' + UI.escapeHtml(side.name) + '</h3>' +
        '<p>' + percentOf(side.built, side.total) + '% готово. Основная стройка строится без вас.</p>' +
        '<button data-action="continue-order">К заказу</button><button data-action="abandon">Бросить заказ</button></article>'
      );
    }
    if (currentScreen === 'foremen') renderForemen(content);
    if (currentScreen === 'exchange') renderExchange(content);
    if (currentScreen === 'contract') renderContract(content);
    if (currentScreen === 'office') renderOffice(content);
    if (currentScreen === 'tech') renderTech(content);
    if (currentScreen === 'recruiting') renderRecruiting(content);
    if (currentScreen === 'personnel') renderPersonnel(content);
    if (currentScreen === 'supply') renderSupply(content);
    if (currentScreen === 'training') renderTraining(content);
    if (currentScreen === 'reactor') renderReactor(content);
    const head = panelHead(currentScreen);
    setText('meta-kicker', head.kicker);
    setText('meta-title', head.title);
    paintPanelWallet(!!content.querySelector('img[src*="icon-seals"]'));
    panelKey = panelSignature();
  }

  // Only the currencies this panel spends or pays: capital, seals once the player has some or a
  // price here asks for them, the rare resources the exchange pays out (no rows of zeros).
  function paintPanelWallet(sealsShown) {
    const items = [];
    items.push(['capital', 'Капитал', meta.capital]);
    if (currentScreen === 'recruiting') items.push(['diplomas', 'Дипломы', meta.diplomas]);
    if (currentScreen === 'training') items.push(['training', 'Опыт центра', Meta.trainingXp(meta)]);
    if (currentScreen !== 'recruiting' && (meta.seals > 0 || sealsShown)) items.push(['seals', 'Печати', meta.seals]);
    if (currentScreen === 'exchange' || currentScreen === 'supply' || currentScreen === 'reactor') {
      // Boosters and spells are paid in them: the ones the company has (no row of zeros).
      Object.keys(meta.rare).forEach(function (key) {
        if (meta.rare[key] > 0) items.push(['rare-' + key, Meta.RARE_NAMES[key], meta.rare[key]]);
      });
    }
    const wallet = document.getElementById('panel-wallet');
    wallet.hidden = items.length === 0;
    wallet.innerHTML = items.map(function (item) {
      const file = item[0] === 'diplomas' ? 'diplomas.svg' : item[0] === 'training' ? 'training-xp.jpg' : item[0] + '.jpg?v=2';
      const icon = '<img class="game-icon currency-icon" src="icons/icon-' + file + '" alt="' + item[1] + '">';
      return '<span class="pill" title="' + item[1] + '">' + icon + '<b>' + formatCompact(item[2]) + '</b></span>';
    }).join('');
  }

  // What an open panel shows that changes by itself: the wallet, recruits, orders, cooldowns and
  // the minute-rounded waits («новый через 12 мин»).
  function panelSignature() {
    const now = Date.now();
    function minutes(at) {
      return at > now ? Math.ceil((at - now) / 60000) : 0;
    }
    if (currentScreen === 'exchange' && meta.hq.exchange > 0) Meta.fillExchange(meta);
    const recruit = meta.hq.recruiting > 0 ? Meta.refreshRecruiting(meta) : null;
    const side = Meta.site(meta, 'side');
    return [
      currentScreen, officeTab, personnelTab, personnelInfo, JSON.stringify(meta.personnel), JSON.stringify(meta.cookbook), schoolTab, meta.diplomas, JSON.stringify(meta.school), currentScreen === 'recruiting' ? minutes(Meta.schoolAttempts(meta).resetAt) : '', foremanFocus, meta.capital, meta.seals, JSON.stringify(meta.rare),
      currentScreen === 'foremen' ? JSON.stringify(meta.cards) : '',
      recruit ? recruit.stock + ':' + minutes(recruit.nextAt) : '',
      meta.exchange.orders.length, minutes(meta.exchange.nextOrderAt),
      meta.contract.index, minutes(meta.contract.cooldownUntil), Meta.contractReady(meta) ? 1 : 0,
      side ? side.runMode + ':' + side.status + ':' + side.built : '',
      JSON.stringify(meta.supply), JSON.stringify(meta.reactor), JSON.stringify(meta.training),
    ].join('|');
  }

  // Panels stay live while open (§9): checked about once a second, re-rendered only when the
  // signature changed, at the same scroll position.
  function refreshPanel(force) {
    if (!isPanel(currentScreen)) return;
    const now = performance.now();
    if (!force && now - panelCheckedAt < 1000) return;
    panelCheckedAt = now;
    if (panelSignature() === panelKey) return;
    rerenderPanel();
  }

  function rerenderPanel() {
    const panel = document.getElementById('meta-panel');
    const scroll = panel.scrollTop;
    renderMetaScreen();
    panel.scrollTop = scroll;
  }

  // Why a capital / seal price cannot be paid: «Не хватает 120 капитала · нужно ещё 2 печати».
  function shortfallText(capital, seals) {
    const parts = [];
    if (meta.capital < capital) parts.push('Не хватает ' + formatCompact(capital - meta.capital) + ' капитала');
    if (meta.seals < seals) {
      const need = seals - meta.seals;
      parts.push((parts.length ? 'нужно' : 'Нужно') + ' ещё ' + need + ' ' + UI.plural(need, 'печать', 'печати', 'печатей'));
    }
    return parts.join(' · ');
  }

  function reasonHtml(text) {
    return text ? '<small class="panel-reason">' + UI.escapeHtml(text) + '</small>' : '';
  }

  function cityState(id) {
    if (meta.hq[id] > 0) return 'live';
    const project = Meta.PROJECTS[id];
    if (!project || !project.live || meta.campaignLevel < project.unlock) return 'locked';
    if (meta.hqSite && meta.hqSite.id === id) return 'building';
    if (meta.plots[id] === 1) return 'ready';
    return 'plot';
  }

  // The office's topics as a grid of chips (Meta.OFFICE_SECTIONS); a green number — lines of the topic
  // that can be bought now.
  function renderOffice(content) {
    // A topic shows once one of its lines is open (its closed beacons come with it).
    const open = Meta.OFFICE_SECTIONS.filter(function (section) {
      return Meta.officeChain(section).some(function (id) { return Meta.officeUnlocked(meta, id); });
    });
    const tabs = open.length ? open : Meta.OFFICE_SECTIONS;
    if (tabs.indexOf(officeTab) < 0) officeTab = tabs[0];
    let html = '<div class="office-tabs office-topics">';
    tabs.forEach(function (section) {
      const ready = Meta.officeChain(section).filter(function (id) {
        const level = meta.office[id];
        return Meta.officeUnlocked(meta, id) && level < Meta.OFFICE[id].max &&
          meta.capital >= Meta.officeCost(id, level) && meta.seals >= Meta.officeSeals(id, level);
      }).length;
      html += '<button type="button" data-action="office-tab" data-id="' + section + '"' +
        (officeTab === section ? ' class="on"' : '') + '>' + section + (ready ? '<i class="topic-ready">' + ready + '</i>' : '') + '</button>';
    });
    html += '</div>';
    const rows = Meta.officeChain(officeTab);
    let lockedShown = 0;
    let hiddenCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i];
      const spec = Meta.OFFICE[id];
      const level = meta.office[id];
      if (!Meta.officeUnlocked(meta, id)) {
        // Beacons: the next two closed lines of the tab and the story level that opens them.
        if (lockedShown >= 2) {
          hiddenCount += 1;
          continue;
        }
        lockedShown += 1;
        html += lockedCard(spec.name, 'Откроется с уровня ' + ((spec.level || 0) + 1));
        continue;
      }
      const maxed = level >= spec.max;
      const cost = Meta.officeCost(id, level);
      const seals = Meta.officeSeals(id, level);
      const now = officeValueText(spec, Meta.officeValue(id, level), level, Meta.officeValue2(id, level));
      const next = maxed ? '' : ' → <b class="value-next">' + officeValueText(spec, Meta.officeValue(id, level + 1), level + 1, Meta.officeValue2(id, level + 1)) + '</b>';
      html += compactUpgradeCard({
        id: id, name: spec.name, icon: officeIcon(id), className: 'office-item', level: level, max: spec.max,
        body: '<p>' + UI.escapeHtml(spec.text) + ': ' + now + next + '</p>',
        action: 'office', capital: cost, seals: seals, status: maxed ? 'Максимум' : '',
      });
    }
    if (hiddenCount > 0) html += '<p class="tech-more panel-wide office-more">Ещё ' + hiddenCount + ' ' + UI.plural(hiddenCount, 'улучшение', 'улучшения', 'улучшений') + '</p>';
    content.insertAdjacentHTML('beforeend', html);
  }

  // One compact card for office upgrades, technologies and the next locked office lines.
  function compactUpgradeCard(spec) {
    const level = spec.level === undefined ? '' : ' <small>' + spec.level + ' / ' + spec.max + '</small>';
    const icon = spec.iconMarkup || '<img class="game-icon" src="icons/' + spec.icon + '" alt="">';
    let html = '<article class="meta-card office-upgrade compact-upgrade ' + spec.className + '"' +
      (spec.action ? ' data-buy="' + spec.action + ':' + spec.id + '"' : '') + '>' + icon +
      '<div class="upgrade-copy"><h3>' + UI.escapeHtml(spec.name) + level + '</h3>' + spec.body + '</div>';
    if (spec.status) {
      html += '<div class="upgrade-purchase"><small class="upgrade-status">' + UI.escapeHtml(spec.status) + '</small></div>';
    } else if (spec.action) {
      const capitalShort = meta.capital < spec.capital;
      const sealsShort = meta.seals < spec.seals;
      const diplomasShort = meta.diplomas < (spec.diplomas || 0);
      const xpShort = Meta.trainingXp(meta) < (spec.trainingXp || 0);
      const label = (spec.action === 'office' || spec.action === 'personnel' ? 'Улучшить' : 'Изучить') + ' «' + spec.name + '»: ' + spec.capital.toLocaleString('ru-RU') + ' капитала' +
        (spec.seals ? ' и ' + spec.seals + ' ' + UI.plural(spec.seals, 'печать', 'печати', 'печатей') : '') +
        (spec.diplomas ? ' и ' + spec.diplomas + ' ' + UI.plural(spec.diplomas, 'диплом', 'диплома', 'дипломов') : '') +
        (spec.trainingXp ? ' и ' + spec.trainingXp + ' опыта центра' : '');
      html += '<div class="upgrade-purchase">';
      if (spec.diplomas > 0) html += '<small class="upgrade-price' + (diplomasShort ? ' short' : '') + '"><img class="currency-icon" src="icons/icon-diplomas.svg" alt="дипломы">' + spec.diplomas + '</small>';
      if (spec.seals > 0) html += '<small class="upgrade-price upgrade-seals' + (sealsShort ? ' short' : '') + '"><img class="currency-icon" src="icons/icon-seals.jpg?v=2" alt="печати">' + spec.seals + '</small>';
      if (spec.trainingXp > 0) html += '<small class="upgrade-price upgrade-xp' + (xpShort ? ' short' : '') + '"><img class="currency-icon" src="icons/icon-training-xp.jpg" alt="опыт центра">' + formatCompact(spec.trainingXp) + '</small>';
      const short = capitalShort || sealsShort || diplomasShort || xpShort;
      html += buyButtonHtml({ attrs: 'data-action="' + spec.action + '" data-id="' + spec.id + '"', aria: label, icon: 'icons/icon-capital.jpg?v=2',
        price: spec.capital.toLocaleString('ru-RU'), have: meta.capital, cost: spec.capital, short: short, locked: spec.disabled,
        shortText: [shortfallText(spec.capital, spec.seals || 0), diplomasShort ? 'Не хватает дипломов: ' + ((spec.diplomas || 0) - meta.diplomas) : '',
          xpShort ? 'Не хватает опыта центра: ' + formatCompact((spec.trainingXp || 0) - Meta.trainingXp(meta)) : ''].filter(Boolean).join(' · ') }) + '</div>';
    }
    if (spec.prerequisite) html += '<small class="upgrade-prerequisite">' + UI.escapeHtml(spec.prerequisite) + '</small>';
    else if (spec.action && !spec.status && meta.seals < (spec.seals || 0) && sealSources()) {
      html += '<small class="upgrade-prerequisite">Печати: есть ' + meta.seals + ' из ' + spec.seals + ' · дают ' + UI.escapeHtml(sealSources()) + '</small>';
    }
    return html + '</article>';
  }

  // Where seals come from now: contracts, the exchange's special order, the first build of an HQ
  // building that pays seals (the tech centre).
  function sealSources() {
    const list = [];
    if (Meta.contractBoardOpen(meta)) list.push('контракты');
    if (meta.hq.exchange > 0) list.push('спецзаказ биржи');
    Object.keys(Meta.PROJECTS).forEach(function (id) {
      if (Meta.PROJECTS[id].rewardSeals > 0 && !(meta.hq[id] > 0)) list.push('постройка «' + Meta.PROJECTS[id].name + '»');
    });
    return list.join(', ');
  }

  // The open technology that waits for the fewest more seals (the contracts' seals have a target).
  function sealGoal() {
    let best = null;
    Meta.TECH_ORDER.forEach(function (id) {
      if (!Meta.techUnlocked(meta, id)) return;
      const need = Meta.techSeals(id) - meta.seals;
      if (need > 0 && (!best || need < best.need)) best = { id: id, need: need };
    });
    return best;
  }

  // ---------- техцентр: the site's upgrade graph (upgrade-graph.js), one technology per node ----------
  // The same radial tree as «Улучшения» on the site, so a technology sits exactly where its line
  // sits. Shown like there, one step deep: what is researched (dim, a check), what can be researched
  // now (bright, the red dot once the price is saved up) or waits for an HQ building (a lock), and one
  // node past those as «?». Gates are the site's passes (a token there): drawn, never researched here.
  // The tapped node's card, or why it cannot be researched, goes under the graph.
  let techGraph = null; // built on the first visit; the same nodes are re-attached on every render
  let techGraphScroll = null; // { x, y } where the player left the graph; null — centre on the root
  let techSelected = null; // the tapped graph node, kept across panel re-renders
  let techAuto = true; // techSelected is techDefault()'s pick, not a tap: a new visit picks again
  let techViews = {};
  let techByKind = null;

  // Graph node → the technology that opens it (the camp's techs live in their centers: `center`).
  function techKinds() {
    if (techByKind) return techByKind;
    techByKind = {};
    const inTree = {};
    window.MicroBuildersBalance.upgradeTree.forEach(function (pair) { inTree[pair[0]] = true; });
    Meta.TECH_ORDER.forEach(function (id) {
      const spec = Meta.TECH[id];
      const kind = spec.opens && spec.opens[0];
      if (!spec.center && kind && inTree[kind]) techByKind[kind] = id;
    });
    return techByKind;
  }

  function techNodeIcon(kind) {
    return (window.MicroBuildersUpgradeIcons || {})[kind] || 'icon-up-speed.jpg';
  }

  function techGraphRoot() {
    if (techGraph) return techGraph.root;
    const box = document.createElement('div');
    box.className = 'tech-graph panel-wide';
    box.addEventListener('scroll', function () { techGraphScroll = { x: box.scrollLeft, y: box.scrollTop }; }, { passive: true });
    techGraph = window.MicroBuildersGraph.create({
      root: box,
      tree: window.MicroBuildersBalance.upgradeTree,
      gates: window.MicroBuildersBalance.gates,
      icon: techNodeIcon,
      name: function (kind) { return techKinds()[kind] ? Meta.TECH[techKinds()[kind]].name : upgradeName(kind); },
      onSelect: selectTechNode,
    });
    return box;
  }

  // Views as on the site graph: a node past a researched line (or past a pass behind one) shows its
  // own state, one past a researchable line is a «?», the rest is hidden.
  function paintTechGraph() {
    const gates = window.MicroBuildersBalance.gates || {};
    const byKind = techKinds();
    techViews = {};
    window.MicroBuildersBalance.upgradeTree.forEach(function (pair) {
      const kind = pair[0];
      const id = byKind[kind];
      const above = pair[1] ? techViews[pair[1]] : 'owned';
      const reached = above === 'owned' || above === 'pass';
      let view = 'hidden';
      if (gates[kind]) view = reached ? 'pass' : above === 'available' ? 'preview' : 'hidden';
      else if (id && meta.tech[id] > 0) view = 'owned';
      else if (reached && id && Meta.techUnlocked(meta, id)) view = 'available';
      // Prerequisites met but an HQ building is missing (or a line the tech center does not open).
      else if (reached && (!id || Meta.missingTechPrerequisites(meta, id).length === 0)) view = 'office';
      else if (reached || above === 'available') view = 'preview';
      techViews[kind] = view;
    });
    techGraph.paint(techViews);
    Object.keys(byKind).forEach(function (kind) {
      const id = byKind[kind];
      const open = techViews[kind] === 'available';
      techGraph.nodes[kind].classList.toggle('is-open', open);
      techGraph.nodes[kind].classList.toggle('is-ready', open && meta.capital >= Meta.techCost(id) && meta.seals >= Meta.techSeals(id));
    });
    if (techSelected && techViews[techSelected] === 'hidden') techSelected = null;
    if (!techSelected) {
      techSelected = techDefault();
      techAuto = true;
    }
    techGraph.select(techSelected);
  }

  // The node shown under the graph before any tap: the answer to the live site's biggest loss, else
  // one that can be paid now, else the cheapest open one, else the first waiting for an HQ building
  // (why it is closed) — the card is never empty.
  function techDefault() {
    const byKind = techKinds();
    const of = function (view) { return Object.keys(byKind).filter(function (kind) { return techViews[kind] === view; }); };
    const price = function (kind) { return Meta.techCost(byKind[kind]); };
    // The answer to the live site's biggest loss first (its card names the loss), then by price.
    const counter = world && campaign && campaign.status === 'play' ? lossCounter(siteLosses(), function (id) {
      const kind = Meta.TECH[id].opens[0];
      return byKind[kind] === id && techViews[kind] === 'available';
    }) : null;
    if (counter) return Meta.TECH[counter.id].opens[0];
    const open = of('available');
    const ready = open.filter(function (kind) { return meta.capital >= price(kind) && meta.seals >= Meta.techSeals(byKind[kind]); });
    const pool = ready.length ? ready : open.length ? open : of('office');
    return pool.sort(function (a, b) { return price(a) - price(b); })[0] || null;
  }

  // The nearest line above (passes skipped), for «Откроется после «…»».
  function techParentName(kind) {
    const gates = window.MicroBuildersBalance.gates || {};
    let parent = techGraph.parent[kind];
    while (parent && gates[parent]) parent = techGraph.parent[parent];
    if (!parent) return '';
    return techKinds()[parent] ? Meta.TECH[techKinds()[parent]].name : upgradeName(parent);
  }

  // A short line about a node that is not researched here and now; data-buy lets the purchase flash
  // land on it (a bought node turns into «Уже изучено»).
  function techTipHtml(id, title, text) {
    return '<article class="meta-card tech-tip"' + (id ? ' data-buy="tech:' + id + '"' : '') + '><h3>' + UI.escapeHtml(title) + '</h3>' +
      '<p>' + UI.escapeHtml(text) + '</p></article>';
  }

  // Under the graph: the tapped node — a researchable one as the HQ's usual card with its price and
  // «Изучить», anything else as a short line why not.
  function techPickHtml() {
    const kind = techSelected;
    const view = kind ? techViews[kind] : 'hidden';
    if (!kind || view === 'hidden') return '<p class="tech-hint">Все доступные технологии изучены</p>';
    const gate = (window.MicroBuildersBalance.gates || {})[kind];
    const id = techKinds()[kind];
    if (view === 'preview') return techTipHtml('', '?', 'Откроется после «' + techParentName(kind) + '»');
    if (gate) {
      // On the site a pass opens only once something of its block is researched here.
      const researched = MB.gateEntries(kind).some(function (line) { return Meta.sessionLineOpen(meta, line); });
      const needs = researched ? '' : gateEntryTechs(kind);
      return techTipHtml('', 'Проход «' + gate.name + '»', gate.text + '. Открывается на стройке за жетон' +
        (researched ? '' : ', когда здесь изучена хотя бы одна технология его блока' + (needs ? ' — начните с ' + needs : '')));
    }
    const line = upgradeName(kind);
    if (!id) return techTipHtml('', line, 'Открывается не в техцентре');
    const spec = Meta.TECH[id];
    if (view === 'owned') return techTipHtml(id, spec.name, 'Уже изучено · на стройке: «' + line + '»');
    if (view === 'office') {
      const project = spec.requiresProject && !(meta.hq[spec.requiresProject] > 0) ? spec.requiresProject : !(meta.hq.tech > 0) ? 'tech' : '';
      const loss = techLossText(id);
      return techTipHtml(id, spec.name, (Meta.PROJECTS[project] ? 'Нужно здание «' + Meta.PROJECTS[project].name + '»' : 'Пока закрыто') +
        ' · на стройке откроет «' + line + '»' + (loss ? '. ' + loss : ''));
    }
    // Most texts only repeat «Открывает на стройке «…»» (with an older line name): kept when they say more.
    const text = /^Открывает на стройке «[^»]*»$/.test(spec.text) ? '' : '<p>' + UI.escapeHtml(spec.text) + '</p>';
    return compactUpgradeCard({
      id: id, name: spec.name, icon: techNodeIcon(kind), className: 'tech-upgrade',
      body: '<p class="tech-opens">На стройке откроет: <b>«' + UI.escapeHtml(line) + '»</b></p>' + text + techLossHtml(id),
      action: 'tech', capital: Meta.techCost(id), seals: Meta.techSeals(id), disabled: !Meta.techUnlocked(meta, id),
    });
  }

  function selectTechNode(kind) {
    // Researched nodes are dim and not picked (a bought node keeps its «Уже изучено» card, though).
    if (kind && techViews[kind] === 'owned') return;
    techSelected = kind || techDefault();
    techAuto = !kind;
    techGraph.select(techSelected);
    const pick = document.getElementById('tech-pick');
    if (pick) pick.innerHTML = techPickHtml();
  }

  // ---------- техцентр: «Продвинутые технологии» (docs/gdd/29-tokens-draft.md) ----------
  // The second tab: the site's advanced star (the same graph as in the «Улучшения» sheet) — the centre
  // pass, bought on the site for coins, and the key nodes around it, researched here for capital and
  // seals from story level ADVANCED.unlockLevel; on the site each costs ADVANCED.tokens tokens.

  function techAdvancedRoot() {
    if (techAdvancedGraph) return techAdvancedGraph.root;
    const box = document.createElement('div');
    box.className = 'tech-graph panel-wide advanced-star';
    techAdvancedGraph = advancedGraphOf(box, function (id) {
      techAdvancedPick = id;
      techAdvancedGraph.select(id);
      const pick = document.getElementById('tech-pick');
      if (pick) pick.innerHTML = techAdvancedPickHtml();
    });
    return box;
  }

  // Before the story level everything is shut (a lock); then the researched nodes are dim with a check,
  // the researchable bright (a red dot once the price is saved up), those waiting for an HQ building locked.
  function paintTechAdvanced() {
    const open = Meta.advancedUnlocked(meta);
    techAdvancedViews = { advanced: open ? 'pass' : 'office' };
    ADVANCED.nodes.forEach(function (node) {
      techAdvancedViews[node.id] = !open ? 'office' : meta.tech[node.id] > 0 ? 'owned' : Meta.techUnlocked(meta, node.id) ? 'available' : 'office';
    });
    techAdvancedGraph.paint(techAdvancedViews);
    ADVANCED.nodes.forEach(function (node) {
      const el = techAdvancedGraph.nodes[node.id];
      const available = techAdvancedViews[node.id] === 'available';
      el.classList.toggle('is-open', available);
      el.classList.toggle('is-ready', available && meta.capital >= Meta.techCost(node.id) && meta.seals >= Meta.techSeals(node.id));
    });
    techAdvancedGraph.select(techAdvancedPick);
  }

  // The first node to research (or the centre while the tab is shut) — the card is never empty.
  function techAdvancedDefault() {
    if (!Meta.advancedUnlocked(meta)) return 'advanced';
    const next = ADVANCED.nodes.find(function (node) { return Meta.techUnlocked(meta, node.id); });
    return next ? next.id : 'advanced';
  }

  function techAdvancedPickHtml() {
    const id = techAdvancedPick;
    const level = ADVANCED.unlockLevel;
    if (!id) return '<p class="tech-hint">Узлы ★ — сильнейшие улучшения стройки</p>';
    const view = techAdvancedViews[id];
    const researched = ADVANCED.nodes.filter(function (node) { return meta.tech[node.id] > 0; }).length;
    if (id === 'advanced') {
      return techTipHtml('', ADVANCED.name, view === 'office'
        ? 'Откроются на ' + level + '-м уровне основной кампании (сейчас ' + ((meta.campaignLevel || 0) + 1) + '-й). Двенадцать сильнейших улучшений стройки.'
        : 'Изучено ' + researched + ' из ' + ADVANCED.nodes.length + '. На стройке: «Улучшения» → ★ Продвинутые — центр за монеты стройки, вокруг узлы по ' + ADVANCED.tokens + ' жетона.');
    }
    const node = ADVANCED_NODES[id];
    if (!Meta.advancedUnlocked(meta)) return techTipHtml(id, '★ ' + node.name, node.text + '. Откроется на ' + level + '-м уровне основной кампании.');
    if (view === 'owned') return techTipHtml(id, '★ ' + node.name, node.text + '. Изучено.');
    if (view === 'office') {
      const project = Meta.TECH[id].requiresProject;
      return techTipHtml(id, '★ ' + node.name, node.text + '. ' + (project && Meta.PROJECTS[project] ? 'Нужно здание «' + Meta.PROJECTS[project].name + '».' : 'Пока закрыто.'));
    }
    return compactUpgradeCard({
      id: id, name: '★ ' + node.name, icon: node.icon, className: 'tech-upgrade',
      body: '<p>' + UI.escapeHtml(node.text) + '</p>',
      action: 'tech', capital: Meta.techCost(id), seals: Meta.techSeals(id), disabled: !Meta.techUnlocked(meta, id),
    });
  }

  // A researchable advanced technology whose price is saved up: a dot on the tab.
  function advancedTechReady() {
    return Meta.ADVANCED_TECHS.some(function (id) {
      return Meta.techUnlocked(meta, id) && meta.capital >= Meta.techCost(id) && meta.seals >= Meta.techSeals(id);
    });
  }

  function renderTechAdvanced(content) {
    const researched = ADVANCED.nodes.filter(function (node) { return meta.tech[node.id] > 0; }).length;
    content.insertAdjacentHTML('beforeend', '<p class="tech-legend panel-wide">' + (Meta.advancedUnlocked(meta)
      ? 'Изучено <b>' + researched + ' из ' + ADVANCED.nodes.length + '</b> · капитал и печати здесь, на стройке — центр за монеты и узлы по ' + ADVANCED.tokens + ' жетона'
      : 'С ' + ADVANCED.unlockLevel + '-го уровня основной кампании') + '</p>');
    const box = techAdvancedRoot();
    content.appendChild(box);
    if (!techAdvancedPick || (techAdvancedPick !== 'advanced' && meta.tech[techAdvancedPick] > 0 && Meta.advancedUnlocked(meta))) techAdvancedPick = techAdvancedDefault();
    paintTechAdvanced();
    content.insertAdjacentHTML('beforeend', '<div class="tech-pick panel-wide" id="tech-pick">' + techAdvancedPickHtml() + '</div>');
  }

  function renderTech(content) {
    content.insertAdjacentHTML('beforeend', '<div class="office-tabs tech-tabs"><button type="button" data-action="tech-tab" data-id="graph"' + (techTab === 'graph' ? ' class="on"' : '') +
      '>Граф стройки</button><button type="button" data-action="tech-tab" data-id="advanced"' + (techTab === 'advanced' ? ' class="on"' : '') + '>★ Продвинутые' +
      (techTab !== 'advanced' && advancedTechReady() ? '<i class="advanced-dot on"></i>' : '') + '</button></div>');
    if (techTab === 'advanced') {
      renderTechAdvanced(content);
      return;
    }
    content.insertAdjacentHTML('beforeend', '<p class="tech-legend panel-wide">Тусклые — изучено · Яркие — можно изучить · ? — откроется следом · ⬡ — проход, открывается на стройке за жетон</p>');
    const box = techGraphRoot();
    content.appendChild(box);
    paintTechGraph();
    // First visit: «План работ» in the middle; after that the graph stays where the player left it.
    if (techGraphScroll) {
      box.scrollLeft = techGraphScroll.x;
      box.scrollTop = techGraphScroll.y;
    } else {
      techGraph.centre();
    }
    content.insertAdjacentHTML('beforeend', '<div class="tech-pick panel-wide" id="tech-pick">' + techPickHtml() + '</div>');
  }

  // ---------- центр персонала: пределы зданий городка, столовая, кулинарная книга ----------
  function personnelCard(id, name, icon, level, max, body, missingTech) {
    const maxed = level >= max;
    return compactUpgradeCard({
      id: id, name: name, icon: icon, className: 'personnel-upgrade', level: level, max: max, body: body,
      action: 'personnel', capital: maxed ? 0 : Meta.personnelCost(id, level), seals: maxed ? 0 : Meta.personnelSeals(id, level),
      disabled: !!missingTech, status: maxed ? 'Максимум' : '',
      prerequisite: !maxed && missingTech ? 'Сначала откройте «' + Meta.TECH[missingTech].name + '» на вкладке «Городок»' : '',
    });
  }

  // A tech researched outside the tech center (center: personnel — a camp building or its upgrade,
  // reactor — the site reactor): the same purchase as there, for capital and seals.
  function centerTechCard(id) {
    const spec = Meta.TECH[id];
    const owned = meta.tech[id] > 0;
    const missing = Meta.missingTechPrerequisites(meta, id).map(function (before) { return '«' + Meta.TECH[before].name + '»'; });
    if (spec.requiresProject && !(meta.hq[spec.requiresProject] > 0)) missing.push('здание «' + Meta.PROJECTS[spec.requiresProject].name + '»');
    const line = window.MicroBuildersBalance.session[spec.opens[0]];
    return compactUpgradeCard({
      id: id, name: spec.name, icon: officeIcon(id), className: 'tech-upgrade' + (owned ? ' tech-owned' : ''),
      body: '<p>' + (MB.CAMP_LINES[spec.opens[0]] ? 'На стройке: основание здания, старт за жетон' : 'На стройке: «' + UI.escapeHtml(line ? line.name : spec.opens[0]) + '» в окне здания') + '</p>' +
        (owned ? '' : techLossHtml(id)),
      action: 'tech', capital: Meta.techCost(id), seals: Meta.techSeals(id), disabled: !Meta.techUnlocked(meta, id),
      status: owned ? 'Открыто' : '',
      prerequisite: !owned && missing.length ? 'Сначала ' + missing.join(', ') : '',
    });
  }

  // ---------- «Учебный центр»: worker ranks (docs/gdd/26-builder-school-draft.md) ----------

  // Rank colours as CSS (balance meta.training.ranks[].helmet).
  function rankSwatch(rank) {
    const spec = MB.TRAINING_RANKS[Math.max(0, rank - 1)];
    return '<i class="rank-swatch" style="background:linear-gradient(#' + (spec ? spec.helmet : 'f5c53a') + ' 50%, #' + (spec ? spec.suit || spec.helmet : 'd2b56e') + ' 50%)"></i>';
  }

  // The centre: its experience (a currency from the workers' cubes), the rank ladder, then the
  // programs — each for capital and the centre's experience.
  function renderTraining(content) {
    const stats = Meta.trainingStats(meta);
    let html = '<article class="meta-card panel-wide training-intro">' +
      '<img class="training-hero" src="icons/icon-hq-training.jpg" alt="">' +
      '<p class="training-note"><img class="currency-icon" src="icons/icon-training-xp.jpg" alt="">Каждый целый куб, поставленный рабочим на любой стройке, даёт центру 1 опыт. Кубы дронов и техники опыта не дают. Программы стоят капитал и опыт центра.</p>';
    html += '<ol class="training-ranks">';
    MB.TRAINING_RANKS.forEach(function (spec, i) {
      const rank = i + 1;
      const open = stats.on && rank <= stats.cap;
      html += '<li class="' + (open ? 'open' : 'closed') + '">' + rankSwatch(rank) + '<b>' + rank + '</b>' +
        '<span>×' + formatFactor(1 + (spec.work - 1) * stats.power) + '</span><small>' + (rank === 1 ? 'старт' : spec.xp + ' оп.') + '</small></li>';
    });
    html += '</ol></article>';
    Meta.TRAINING.upgrades.forEach(function (spec) {
      const owned = Meta.trainingUpgradeLevel(meta, spec.id);
      const cost = Meta.trainingCost(meta, spec.id);
      const xp = Meta.trainingXpCost(meta, spec.id);
      const needOnsite = spec.id !== 'onsite' && Meta.trainingUpgradeLevel(meta, 'onsite') <= 0;
      html += compactUpgradeCard({
        id: spec.id, name: spec.name, icon: 'icon-training-' + spec.id + '.jpg', className: 'training-upgrade',
        level: owned, max: spec.max, body: '<p>' + UI.escapeHtml(trainingEffect(spec, owned, stats)) + '</p>',
        action: cost !== null ? 'training' : '', capital: cost || 0, seals: 0, trainingXp: xp || 0,
        disabled: needOnsite, status: cost === null ? 'Максимум' : '',
        prerequisite: cost !== null && needOnsite ? 'Сначала «Обучение на объекте»' : '',
      });
    });
    content.insertAdjacentHTML('beforeend', html);
  }

  // «до 3 разряда → 4», «опыт +20% → +30%»: what a program does now and after the next level.
  function trainingEffect(spec, level, stats) {
    const maxed = level >= spec.max;
    const arrow = function (now, then) { return maxed ? now : now + ' → ' + then; };
    if (spec.id === 'onsite') return level > 0 ? 'Включено: опыт за кубы, разряды до 3-го' : spec.text;
    if (spec.id === 'ladder') return 'Потолок разряда: ' + arrow(stats.cap, Math.min(MB.TRAINING_RANKS.length, stats.cap + 1));
    if (spec.id === 'plan') return 'Опыт рабочих: ' + arrow('+' + Math.round(level * spec.value * 100) + '%', '+' + Math.round((level + 1) * spec.value * 100) + '%');
    if (spec.id === 'power') return 'Прибавка разряда: ' + arrow('×' + formatFactor(1 + level * spec.value), '×' + formatFactor(1 + (level + 1) * spec.value));
    if (spec.id === 'intern') return 'Нанятые приходят с опытом: ' + arrow(level * spec.value, (level + 1) * spec.value);
    if (spec.id === 'prepared') return 'Стартовые рабочие приходят ' + arrow(stats.startRank + '-м разрядом', (stats.startRank + 1) + '-м разрядом');
    return spec.text;
  }

  // ---------- «Снабжение»: boosters (docs/gdd/21-mech-draft.md) ----------
  const RARE_ORDER = ['residential', 'industrial', 'highrise', 'landmark'];

  function rareIcon(key) {
    return 'icons/icon-rare-' + key + '.jpg?v=2';
  }

  // «+2 строителей на старте» for a level of a booster (its first level when not opened yet).
  function boosterEffect(spec, level) {
    return '+' + spec.amounts[Math.max(0, Math.min(spec.amounts.length, level) - 1)] + ' ' + spec.text;
  }

  // The panel: slots, then every booster by resource — open / raise for capital; each use costs one
  // of its rare resource before a construction.
  function renderSupply(content) {
    let html = '<article class="meta-card panel-wide supply-intro"><p>Бустеров на заказ: <b>' + Meta.supplySlots(meta) + '</b> · каждый — ' +
      Meta.SUPPLY.useCost + ' редкий ресурс своего типа перед стартом</p>';
    const slotCost = Meta.supplySlotCost(meta);
    if (slotCost !== null) {
      html += buyButtonHtml({ attrs: 'data-action="supply-slot" data-id="slot"', label: 'Ещё слот', icon: 'icons/icon-capital.jpg?v=2', wide: true,
        price: slotCost.toLocaleString('ru-RU'), have: meta.capital, cost: slotCost, shortText: shortfallText(slotCost, 0) });
    }
    html += '</article>';
    // Boosters of a resource the company has (or one already opened); the rest wait for their resource.
    const later = {};
    RARE_ORDER.forEach(function (key) {
      Meta.SUPPLY.boosters.filter(function (spec) { return spec.resource === key; }).forEach(function (spec) {
        if (!(meta.rare[key] > 0) && !(Meta.boosterLevel(meta, spec.id) > 0)) {
          later[key] = (later[key] || 0) + 1;
          return;
        }
        const level = Meta.boosterLevel(meta, spec.id);
        const cost = Meta.boosterCost(meta, spec.id);
        const next = cost !== null ? ' → <b class="value-next">' + UI.escapeHtml(boosterEffect(spec, level + 1)) + '</b>' : '';
        html += compactUpgradeCard({
          id: spec.id, action: cost !== null ? 'booster' : '', name: spec.name, className: 'booster-item', icon: spec.icon,
          level: level, max: spec.amounts.length,
          body: '<p>' + (level > 0 ? UI.escapeHtml(boosterEffect(spec, level)) + next : 'Откроет: ' + UI.escapeHtml(boosterEffect(spec, 1))) + '</p>' +
            '<small class="booster-use"><img class="currency-icon" src="' + rareIcon(key) + '" alt="">' + Meta.SUPPLY.useCost + ' · ' + UI.escapeHtml(Meta.RARE_NAMES[key]) + '</small>',
          status: cost === null ? 'Максимум' : '', capital: cost || 0, seals: 0,
        });
      });
    });
    Object.keys(later).forEach(function (key) {
      html += '<p class="tech-more panel-wide">Ещё ' + later[key] + ' ' + UI.plural(later[key], 'бустер', 'бустера', 'бустеров') + ' — за ресурс «' +
        UI.escapeHtml(Meta.RARE_NAMES[key]) + '»</p>';
    });
    content.insertAdjacentHTML('beforeend', html);
  }

  // The chosen boosters go on the new site: paid now, free levels of their lines (as a purchase that
  // costs nothing) or more rare resource at the hand-over («Связи в мэрии»).
  function applyBoosters(ids) {
    campaign.boosters = [];
    campaign.boosterRare = 0;
    if (!ids.length || !Meta.spendBoosters(meta, ids)) return;
    const free = campaign.freePurchases;
    campaign.freePurchases = true;
    ids.forEach(function (id) {
      const spec = Meta.BOOSTERS[id];
      const amount = spec.amounts[Math.max(0, Meta.boosterLevel(meta, id) - 1)];
      campaign.boosters.push(id);
      if (spec.kind === 'rare') campaign.boosterRare += amount;
      else for (let n = 0; n < amount; n++) MB.buyUpgrade(campaign, world, spec.line);
    });
    campaign.freePurchases = free;
    world.events = world.events.filter(function (event) { return event.type !== 'upgrade'; });
    UI.toast({ text: 'Бустеры: ' + ids.map(function (id) { return Meta.BOOSTERS[id].name; }).join(', '), icon: 'icons/' + Meta.BOOSTERS[ids[0]].icon, tone: 'good', key: 'boosters-on' });
  }

  // ---------- reactor: techno-magic (draft) ----------
  function renderReactor(content) {
    let html = '<article class="meta-card panel-wide"><p>Реактор на стройке открывается здесь; потом на каждой стройке он стоит основанием — стройку начинают за жетон и монеты, его уровни покупаются в окне реактора. Пока он стоит, копится мана — ' +
      Meta.REACTOR.manaPerLevel + ' в минуту за уровень. Заклинания изучаются и усиливаются редкими ресурсами своей школы, применяются кнопкой маны на стройке.</p></article>';
    Meta.centerTechs('reactor').forEach(function (id) { html += centerTechCard(id); });
    RARE_ORDER.forEach(function (key) {
      Meta.REACTOR.spells.filter(function (spell) { return spell.school === key; }).forEach(function (spell) {
        const level = Meta.spellLevel(meta, spell.id);
        const cost = Meta.spellCost(meta, spell.id);
        const have = meta.rare[key] || 0;
        const button = cost === null ? '<small class="upgrade-status">Максимум</small>'
          : buyButtonHtml({ attrs: 'data-action="spell" data-id="' + spell.id + '"', icon: rareIcon(key), price: String(cost), have: have, cost: cost,
            shortText: 'Не хватает: ' + Meta.RARE_NAMES[key].toLowerCase() + ' ' + (cost - have) });
        html += '<article class="meta-card office-upgrade compact-upgrade spell-item" data-buy="spell:' + spell.id + '"><img class="game-icon" src="icons/' + spell.icon + '" alt="">' +
          '<div class="upgrade-copy"><h3>' + UI.escapeHtml(spell.name) + ' <small>' + level + ' / ' + spell.learn.length + '</small></h3>' +
          '<p>' + UI.escapeHtml(spellText(spell, Math.max(1, level))) + ' · ' + spell.mana + ' маны</p></div>' +
          '<div class="upgrade-purchase">' + button + '</div></article>';
      });
    });
    content.insertAdjacentHTML('beforeend', html);
  }

  function spellText(spell, level) {
    const power = spell.power[Math.max(0, Math.min(spell.power.length, level) - 1)];
    if (spell.id === 'haste') return 'бригада ×' + String(power).replace('.', ',') + ' на ' + spell.seconds + ' с';
    if (spell.id === 'summon') return '+' + power + ' ' + UI.plural(power, 'рабочий', 'рабочих', 'рабочих') + ' до конца стройки';
    if (spell.id === 'telekinesis') return power + ' кубов встают сами';
    if (spell.id === 'clearSky') return 'без непогоды ' + Math.round(spell.seconds * power) + ' с';
    if (spell.id === 'noon') return 'ночь без штрафа ' + Math.round(spell.seconds * power) + ' с';
    if (spell.id === 'goldRush') return 'монеты за кубы ×' + String(power).replace('.', ',') + ' на ' + spell.seconds + ' с';
    return spell.text;
  }

  // Mana of a summon grows with each one on this site.
  function spellMana(spell) {
    const uses = (campaign.spellUses && campaign.spellUses[spell.id]) || 0;
    return Math.round(spell.mana * Math.pow(spell.growth || 1, uses));
  }

  // When a running spell ends (site seconds; 0 — it has no duration or never ran).
  function spellUntil(id) {
    if (id === 'haste') return campaign.spellHasteUntil || 0;
    if (id === 'clearSky') return campaign.spellClearUntil || 0;
    if (id === 'noon') return campaign.spellNoonUntil || 0;
    if (id === 'goldRush') return campaign.spellGoldUntil || 0;
    return 0;
  }

  // How long one cast of a spell works at this level (0 — it acts at once).
  function spellSpan(spell, level) {
    if (!spell.seconds) return 0;
    const power = spell.power[Math.max(0, Math.min(spell.power.length, level) - 1)];
    return spell.id === 'clearSky' || spell.id === 'noon' ? spell.seconds * power : spell.seconds;
  }

  function spellLeft(id) {
    return Math.max(0, spellUntil(id) - campaign.levelElapsed);
  }

  // «1:05» for the spell book timers.
  function shortClock(seconds) {
    const whole = Math.max(0, Math.ceil(seconds));
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }

  function paintMana() {
    const button = document.getElementById('mana-btn');
    const on = !!campaign && campaign.manaRate > 0 && campaign.status === 'play';
    if (button.hidden === on) button.hidden = !on;
    if (!on) return;
    setText('mana-value', String(Math.floor(campaign.mana || 0)));
    const pct = Math.round((campaign.mana || 0) / (campaign.manaMax || 100) * 100) + '%';
    if (button.dataset.fill !== pct) {
      button.dataset.fill = pct;
      button.style.setProperty('--mana', pct);
    }
    // A spell at work: the button glows in its rhythm.
    const casting = Meta.REACTOR.spells.some(function (spell) { return spellLeft(spell.id) > 0; });
    if (button.classList.contains('casting') !== casting) button.classList.toggle('casting', casting);
    refreshSpells();
  }

  // The spell book: the mana store on top, then every spell of the reactor — learned ones to cast,
  // the rest locked until the HQ reactor teaches them.
  function spellsHtml() {
    const mana = campaign.mana || 0;
    const max = Math.round(campaign.manaMax || 0);
    const rate = campaign.manaRate || 0;
    const pct = max > 0 ? Math.min(100, mana / max * 100) : 0;
    const toFull = rate > 0 && mana < max ? (max - mana) / rate * 60 : 0;
    const state = rate <= 0 ? 'Реактор перестраивается — мана не копится'
      : toFull > 0 ? 'Полный запас через ' + shortClock(toFull) : 'Запас полон — самое время колдовать';
    return '<div class="mana-panel' + (toFull > 0 ? '' : ' full') + '">' +
      '<div class="mana-crystal"><img src="icons/icon-mana.jpg" alt=""></div>' +
      '<div class="mana-meter"><p><b>' + Math.floor(mana) + '</b><em>/ ' + max + ' маны</em><span>+' + Math.round(rate) + ' в минуту</span></p>' +
      '<i class="mana-bar"><b style="width:' + pct.toFixed(1) + '%"></b></i><small>' + state + '</small></div></div>' +
      '<div class="spell-grid">' + Meta.REACTOR.spells.map(spellCardHtml).join('') + '</div>' +
      '<p class="spell-foot">Изучаются и усиливаются в реакторе штаба за редкие ресурсы своей школы.</p>';
  }

  function spellCardHtml(spell) {
    const level = (campaign.spellLevels || {})[spell.id] || 0;
    const left = level > 0 ? spellLeft(spell.id) : 0;
    const span = spellSpan(spell, level);
    let pips = '';
    for (let i = 0; i < spell.learn.length; i++) pips += '<i' + (i < level ? ' class="on"' : '') + '></i>';
    let foot = '<small class="spell-lock">Изучите в реакторе штаба</small>';
    if (level > 0) {
      const cost = spellMana(spell);
      foot = buyButtonHtml({
        attrs: 'data-spell="' + spell.id + '"', icon: 'icons/icon-mana.jpg', price: String(cost), have: campaign.mana || 0, cost: cost, wide: true,
        label: left > 0 ? 'Продлить' : '', shortText: 'Мало маны: ещё ' + Math.ceil(cost - (campaign.mana || 0)),
      });
    }
    const style = '--school:' + SPELL_SCHOOLS[spell.school] + (left > 0 && span > 0 ? ';--left:' + Math.min(100, left / span * 100).toFixed(1) + '%' : '');
    return '<article class="spell-card' + (level > 0 ? '' : ' locked') + (left > 0 ? ' active' : '') + '" data-spell-card="' + spell.id + '" style="' + style + '">' +
      '<div class="spell-art"><img src="icons/' + spell.icon + '" alt="">' +
      '<img class="spell-school" src="' + rareIcon(spell.school) + '" alt="" title="' + UI.escapeHtml(Meta.RARE_NAMES[spell.school]) + '">' +
      (left > 0 ? '<span class="spell-timer">' + shortClock(left) + '</span>' : '') + '</div>' +
      '<b class="spell-name">' + UI.escapeHtml(spell.name) + '</b>' +
      '<span class="spell-pips" aria-label="Уровень ' + level + ' из ' + spell.learn.length + '">' + pips + '</span>' +
      '<span class="spell-effect">' + UI.escapeHtml(spellText(spell, Math.max(1, level))) + '</span>' +
      (spell.growth && level > 0 ? '<span class="spell-note">следующий дороже ×' + String(spell.growth).replace('.', ',') + '</span>' : '') +
      foot + '</article>';
  }

  function refreshSpells() {
    if (spellSheet) morphHtml(spellSheet.body, spellsHtml());
  }

  function openSpells() {
    UI.overlay.open({
      id: 'spells',
      type: 'sheet',
      kicker: 'Техно-магия',
      title: 'Книга заклинаний',
      className: 'spells-sheet',
      body: function (body) {
        spellSheet = { body: body };
        body.innerHTML = spellsHtml();
        body.addEventListener('click', function (event) {
          const button = event.target.closest('[data-spell]');
          if (!button) {
            const locked = event.target.closest('.spell-card.locked');
            if (locked) {
              shake(locked);
              UI.toast({ text: 'Это заклинание изучается в реакторе штаба', icon: 'lock', key: 'spell-locked', duration: 1600 });
            }
            return;
          }
          if (button.getAttribute('aria-disabled') === 'true') {
            buyShort(button, 'icons/icon-mana.jpg');
            return;
          }
          const card = button.closest('.spell-card');
          if (!castSpell(button.dataset.spell)) return;
          card.classList.add('cast');
          flashCard(card, '', 'free');
          // A moment to see the card flare, then back to the site to watch it work.
          setTimeout(function () { UI.overlay.close('spells'); }, 420);
        });
      },
      onClose: function () {
        spellSheet = null;
      },
    });
  }

  // A spell goes off: mana paid, its effect on the site at once or for a while (logic.js and
  // meta.js → environment read the campaign.spell* fields). Cast again while it works, it lasts longer.
  function castSpell(id) {
    const spell = Meta.SPELLS[id];
    const level = (campaign.spellLevels || {})[id] || 0;
    if (!spell || level <= 0 || !world || campaign.status !== 'play') return false;
    const cost = spellMana(spell);
    if ((campaign.mana || 0) < cost) return false;
    campaign.mana -= cost;
    campaign.spellUses = campaign.spellUses || {};
    campaign.spellUses[id] = (campaign.spellUses[id] || 0) + 1;
    const power = spell.power[Math.min(spell.power.length, level) - 1];
    const until = Math.max(campaign.levelElapsed, spellUntil(id)) + spellSpan(spell, level);
    if (id === 'haste') { campaign.spellHasteUntil = until; campaign.spellHaste = power; }
    if (id === 'clearSky') campaign.spellClearUntil = until;
    if (id === 'noon') campaign.spellNoonUntil = until;
    if (id === 'goldRush') { campaign.spellGoldUntil = until; campaign.spellGold = power; }
    if (id === 'summon') {
      const free = campaign.freePurchases;
      campaign.freePurchases = true;
      for (let n = 0; n < power; n++) MB.buyUpgrade(campaign, world, 'builders');
      campaign.freePurchases = free;
    }
    if (id === 'telekinesis') MB.applyOfflineBlocks(world, power);
    consumeEvents();
    paintHud();
    tone(880, 0.12);
    UI.toast({ text: spell.name + ': ' + spellText(spell, level), icon: 'icons/' + spell.icon, tone: 'good', key: 'spell-cast' });
    return true;
  }

  function renderPersonnel(content) {
    let html = '<div class="office-tabs personnel-tabs">';
    PERSONNEL_TABS.forEach(function (tab) {
      html += '<button type="button" data-action="personnel-tab" data-id="' + tab[0] + '"' + (personnelTab === tab[0] ? ' class="on"' : '') + '>' + tab[1] + '</button>';
    });
    html += '<button type="button" class="info-btn personnel-info-btn' + (personnelInfo ? ' on' : '') + '" data-action="personnel-info" aria-label="Как это работает" aria-expanded="' + personnelInfo + '">i</button></div>';
    if (personnelInfo) html += '<div class="meta-card panel-wide personnel-info">' + PERSONNEL_INFO[personnelTab].map(function (text) { return '<p>' + UI.escapeHtml(text) + '</p>'; }).join('') + '</div>';
    if (personnelTab === 'camp') {
      // Per building: open it (capital + seals), then its level limit and its upgrades (techs with `after`).
      PERSONNEL_CAMP.forEach(function (item) {
        const spec = Meta.PERSONNEL_UPGRADES[item.line];
        if (!spec) return;
        html += '<h3 class="personnel-building panel-wide">' + UI.escapeHtml(CAP_TEXTS[item.node][0]) + ' <small>' + item.hint + '</small></h3>';
        if (!(meta.tech[item.tech] > 0)) {
          html += centerTechCard(item.tech);
          return;
        }
        const level = meta.personnel[item.line] || 0;
        const cap = 1 + level;
        const body = '<p>Уровни здания на стройке · до ур. ' + cap + (level >= spec.max ? '' : ' → <b class="value-next">' + (cap + 1) + '</b>') + '</p>';
        html += personnelCard(item.line, CAP_TEXTS[item.node][1], officeIcon(item.node), level, spec.max, body, '');
        Meta.centerTechs('personnel').forEach(function (id) {
          const kind = Meta.TECH[id].opens[0];
          if (MB.CAMP_UPGRADE_OF[kind] === item.node) html += centerTechCard(id);
        });
      });
    } else if (personnelTab === 'canteen') {
      const kitchen = meta.tech.kitchen > 0 ? '' : 'kitchen';
      const seats = meta.personnel.seats || 0;
      const seatsSpec = Meta.PERSONNEL_UPGRADES.seats;
      html += personnelCard('seats', seatsSpec.name, officeIcon('seats'), seats, seatsSpec.max,
        '<p>+' + seats + (seats >= seatsSpec.max ? '' : ' → <b class="value-next">+' + (seats + 1) + '</b>') + ' ' + UI.plural(seats + 1, 'место', 'места', 'мест') + '</p>', kitchen);
      const meal = meta.personnel.meal || 0;
      const mealSpec = Meta.PERSONNEL_UPGRADES.meal;
      const now = Meta.canteenMealSeconds(meta);
      const next = Math.max(MB.CANTEEN.minMealSeconds || 10, now - 1);
      html += personnelCard('meal', mealSpec.name, officeIcon('meal'), meal, mealSpec.max,
        '<p>Обед ' + now + ' с' + (meal >= mealSpec.max ? '' : ' → <b class="value-next">' + next + ' с</b>') + '</p>', kitchen);
    } else {
      // The cookbook by the canteen level that serves the dishes: «Кафе и выше», …
      const ROW_TITLES = { day: 'Блюдо дня', snack: 'С собой', signature: 'Ультимативное', grand: 'Гранд-обед' };
      // The dishes of the canteen levels open now and of the next one; the rest come with the canteen.
      const reach = Meta.canteenMaxLevel(meta) + 1;
      let later = 0;
      let heading = '';
      Meta.DISHES.slice().sort(function (a, b) { return (a.level || 1) - (b.level || 1); }).forEach(function (dish) {
        const owned = Meta.dishOwned(meta, dish.id);
        if (!owned && (dish.level || 1) > reach) {
          later += 1;
          return;
        }
        const form = MB.campForm('canteen', dish.level || 1);
        const head = (form ? form.name : 'Столовая') + (dish.level > 1 ? ' и выше' : '') + ' · ' + (dish.secret ? 'секреты шефа' : dish.level === 4 ? 'второе' : ROW_TITLES[dish.row || 'day'].toLowerCase());
        if (head !== heading) {
          heading = head;
          html += '<h3 class="exchange-heading">' + UI.escapeHtml(head) + '</h3>';
        }
        if (dish.secret) {
          html += compactUpgradeCard({
            id: dish.id, name: owned ? dish.name : 'Секретное блюдо', icon: owned ? 'icon-dish-' + dish.id + '.jpg' : 'icon-secret-book.jpg',
            className: 'personnel-dish' + (owned ? ' tech-owned' : ''),
            body: '<p>' + (owned ? UI.escapeHtml(MB.dishText(dish.id)) : 'Откроет шеф-повар на кухне Ресторана: шанс на каждом обеде') + '</p>',
            status: owned ? 'Найдено' : '?',
          });
          return;
        }
        html += compactUpgradeCard({
          id: dish.id, name: dish.name, icon: 'icon-dish-' + dish.id + '.jpg', className: 'personnel-dish' + (owned ? ' tech-owned' : ''),
          body: '<p>' + UI.escapeHtml(MB.dishText(dish.id)) + '</p>',
          action: 'dish', capital: dish.capital, seals: 0, status: owned ? 'Изучено' : '',
        });
      });
      if (later > 0) html += '<p class="tech-more panel-wide">Ещё ' + later + ' ' + UI.plural(later, 'блюдо', 'блюда', 'блюд') + ' — с ростом столовой</p>';
    }
    content.insertAdjacentHTML('beforeend', html);
  }

  // Capital price with the seal part when there is one.
  function priceHtml(capital, seals) {
    return '<img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt="капитал">' + capital.toLocaleString('ru-RU') +
      (seals > 0 ? ' <img class="currency-icon" src="icons/icon-seals.jpg?v=2" alt="печати">' + seals : '');
  }

  function lockedCard(name, note) {
    return compactUpgradeCard({
      name: name, className: 'office-locked',
      iconMarkup: '<svg class="office-lock" viewBox="0 0 48 48" aria-hidden="true"><rect x="11" y="22" width="26" height="18" rx="4"></rect><path d="M16 22v-7a8 8 0 0 1 16 0v7"></path></svg>',
      body: '<small class="upgrade-lock-note">' + UI.escapeHtml(note) + '</small>',
    });
  }

  // Office values in player units: +2 рабочих, ×1,3, 12%, 2 500 монет.
  function officeValueText(spec, value, level, value2) {
    // Counters and bonuses that do nothing at level 0.
    if (level <= 0 && ['every', 'crane', 'seconds', 'perFloor', 'minus', 'hours'].indexOf(spec.format) >= 0) return 'нет';
    if (spec.format === 'every') return 'каждые ' + Math.round(value) + ' ' + UI.plural(Math.round(value), 'куб', 'куба', 'кубов');
    if (spec.format === 'crane') return value2 + ' ' + UI.plural(value2, 'куб', 'куба', 'кубов') + ' каждые ' + Math.round(value);
    if (spec.format === 'seconds') return Math.round(value) + ' с';
    if (spec.format === 'less') return '−' + Math.round((1 - value) * 100) + '%';
    if (spec.format === 'perFloor') return '+' + (value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '% за этаж';
    if (spec.format === 'minus') return '−' + value;
    if (spec.format === 'hours') return '+' + value + ' ч';
    if (spec.format === 'skip') return Math.round(value).toLocaleString('ru-RU') + ' монет';
    if (spec.format === 'plus') return '+' + value;
    if (spec.format === 'mult') return '×' + value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    if (spec.format === 'percent') return (value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%';
    if (spec.format === 'coins') return Math.round(value).toLocaleString('ru-RU');
    return String(value);
  }

  function officeIcon(id) {
    const names = {
      plan: 'icon-office-planning.jpg',
      crew: 'icon-office-crew.jpg',
      speed: 'icon-office-speed.jpg',
      carry: 'icon-office-carry.jpg',
      routes: 'icon-office-routes.jpg',
      heights: 'icon-office-heights.jpg',
      harness: 'icon-up-carry.jpg',
      capitalChance: 'icon-office-capital-chance.jpg',
      startCoins: 'icon-office-start-coins.jpg',
      income: 'icon-office-income.jpg',
      capitalValue: 'icon-office-capital-value.jpg',
      offline: 'icon-office-offline.jpg',
      foremanSlots: 'icon-office-foreman-slots.jpg',
      recruitDesk: 'icon-office-recruit.jpg',
      morningRush: 'icon-office-morning-rush.jpg',
      lightStep: 'icon-office-light-step.jpg',
      climbTraining: 'icon-office-climb.jpg',
      cargoPaths: 'icon-office-cargo-paths.jpg',
      endurance: 'icon-office-endurance.jpg',
      scaffoldCrew: 'icon-office-scaffold-crew.jpg',
      safetyGear: 'icon-office-safety.jpg',
      geodesy: 'icon-office-geodesy.jpg',
      dietPlan: 'icon-office-diet.jpg',
      nightShift: 'icon-office-night-shift.jpg',
      healthyCrew: 'icon-office-healthy.jpg',
      shortBreaks: 'icon-office-short-breaks.jpg',
      soundSleep: 'icon-office-sleep.jpg',
      weatherReport: 'icon-office-weather.jpg',
      hqRods: 'icon-office-rods.jpg',
      starterLoader: 'icon-office-starter-loader.jpg',
      mechanics: 'icon-office-mechanics.jpg',
      droneGatherers: 'icon-office-drone-gather.jpg',
      craneCrew: 'icon-office-crane.jpg',
      heavyMount: 'icon-office-heavy-mount.jpg',
      bulkBuying: 'icon-office-bulk-buying.jpg',
      tenderDept: 'icon-office-tender.jpg',
      stainedGlass: 'icon-office-glass.jpg',
      luckyDeals: 'icon-office-lucky.jpg',
      contractorGifts: 'icon-office-gifts.jpg',
      exchangeRep: 'icon-office-exchange-rep.jpg',
      handoverBonus: 'icon-office-handover.jpg',
      surveys: 'icon-office-surveys.jpg',
      goldReserve: 'icon-office-gold-reserve.jpg',
      campPrefabs: 'icon-office-camp-prefabs.jpg',
      cookSchool: 'icon-office-cook-school.jpg',
      kitchenStaff: 'icon-office-kitchen-staff.jpg',
      dispatch: 'icon-office-dispatch.jpg',
      tokenReserve: 'icon-office-token-reserve.jpg',
      pickSkill: 'icon-office-pick-skill.jpg',
      // Technologies show the icon of the site line they open.
      machines: 'icon-up-drones.jpg',
      loaders: 'icon-up-vehicles.jpg',
      tools: 'icon-up-pickup.jpg',
      rigging: 'icon-up-light-carry.jpg',
      lifts: 'icon-up-elevators.jpg',
      cubeBonus: 'icon-up-cube-pay.jpg',
      rates: 'icon-up-pay-multiplier.jpg',
      capitalLines: 'icon-up-cube-capital.jpg',
      bonuses: 'icon-up-free-buy.jpg',
      aviation: 'icon-up-helicopters.jpg',
      builders: 'icon-up-builders.jpg',
      scaffold: 'icon-up-scaffold.jpg',
      kitchen: 'icon-up-kitchen.jpg',
      sales: 'icon-up-sales.jpg',
      dorm: 'icon-up-dorm.jpg',
      lounge: 'icon-up-lounge.jpg',
      light: 'icon-up-light.jpg',
      smokeRare: 'icon-up-smoke-rare.jpg',
      smokeShort: 'icon-up-smoke-short.jpg',
      floorPay: 'icon-up-floor-pay.jpg',
      droneBuild: 'icon-up-drone-build.jpg',
      gather: 'icon-up-gather.jpg',
      droneSpeed: 'icon-up-drone-speed.jpg',
      elevatorHeight: 'icon-up-elevator-height.jpg',
      elevatorSpeed: 'icon-up-elevator-speed.jpg',
      loaderMass: 'icon-up-loader-mass.jpg',
      bucket: 'icon-up-bucket.jpg',
      vehicleHeight: 'icon-up-vehicle-height.jpg',
      vehicleReach: 'icon-up-vehicle-reach.jpg',
      patternHeight: 'icon-up-pattern-height.jpg',
      loaderSpeed: 'icon-up-loader-speed.jpg',
      boomSpeed: 'icon-up-boom-speed.jpg',
      triplePay: 'icon-up-triple-pay.jpg',
      triplePower: 'icon-up-triple-power.jpg',
      heliMass: 'icon-up-heli-mass.jpg',
      heliWidth: 'icon-up-heli-width.jpg',
      heliHeight: 'icon-up-heli-height.jpg',
      heliSpeed: 'icon-up-heli-speed.jpg',
      campPrefab: 'icon-up-camp-prefab.jpg',
      portions: 'icon-up-portions.jpg',
      chef: 'icon-up-chef.jpg',
      salesAds: 'icon-up-sales-ads.jpg',
      lightPower: 'icon-up-light-power.jpg',
      loungeSeats: 'icon-up-lounge-seats.jpg',
      smokePath: 'icon-up-smoke-path.jpg',
      dormBeds: 'icon-up-dorm-beds.jpg',
      dormSleep: 'icon-up-dorm-sleep.jpg',
      // The techs of the camp buildings (personnel centre) and of the site reactor (HQ reactor).
      salesOffice: 'icon-up-sales.jpg',
      floodlights: 'icon-up-light.jpg',
      dormitory: 'icon-up-dorm.jpg',
      reactorSite: 'icon-reactor-core.jpg',
      // Centre of personnel: canteen seats and the shorter meal.
      seats: 'icon-pc-seats.jpg',
      meal: 'icon-pc-meal.jpg',
    };
    return names[id] || 'icon-office-speed.jpg';
  }

  // «Бригадиры» (docs/gdd/16-ux-flow.md §4): who works where — crews are locked per site and picked
  // in the briefing — then the collection: cards on sites first, then ones ready to level up, owned,
  // droppable and still locked. A tap opens the card (effect now → next level, upgrade).
  function renderForemen(content) {
    const sites = Meta.cardSites(meta, null);
    if (foremanFocus) {
      content.insertAdjacentHTML('beforeend', foremanDetail(foremanFocus, sites));
      return;
    }
    let html = '';
    const runs = Meta.activeRuns(meta);
    if (runs.length) {
      html += '<article class="meta-card crew-sites"><h3>Сейчас на объектах</h3>';
      runs.forEach(function (run) {
        html += '<div class="crew-site"><p><small>' + siteLabel(run.runMode) + '</small><b>' + UI.escapeHtml(run.name) + '</b></p><div class="crew-faces">' +
          (run.crew.length ? run.crew.map(function (id) {
            return '<button type="button" class="crew-face rarity-' + Meta.CARDS[id].rarity + '" data-action="foreman-open" data-id="' + id + '" aria-label="' + Meta.CARDS[id].name + '">' +
              '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt=""><b class="foreman-level">' + meta.cards[id].level + '</b></button>';
          }).join('') : '<span class="crew-none">Без бригадиров</span>') + '</div></div>';
      });
      html += '<p class="crew-lock-note">' + ICONS.lock + '<span>Состав закреплён до сдачи объекта. Сменить бригадиров можно перед следующим заказом.</span></p></article>';
    }
    html += '<div class="foreman-grid">';
    // Of the cards not owned yet the three nearest show: in chests first, then the fewest wins needed.
    const nearest = new Set(Object.keys(Meta.CARDS).filter(function (id) { return !(meta.cards[id].level > 0); }).sort(function (a, b) {
      return (Meta.cardInPool(meta, b) ? 1 : 0) - (Meta.cardInPool(meta, a) ? 1 : 0) || Meta.CARDS[a].unlockWins - Meta.CARDS[b].unlockWins;
    }).slice(0, 3));
    let hidden = 0;
    Object.keys(Meta.CARDS).map(function (id) {
      const card = meta.cards[id];
      let group = 4;
      if (card.level > 0 && sites[id]) group = 0;
      else if (card.level > 0 && foremanCanUpgrade(id)) group = 1;
      else if (card.level > 0) group = 2;
      else if (Meta.cardInPool(meta, id)) group = 3;
      return { id: id, group: group };
    }).sort(function (a, b) {
      return a.group - b.group || RARITY_ORDER[Meta.CARDS[b.id].rarity] - RARITY_ORDER[Meta.CARDS[a.id].rarity] || Meta.CARDS[a.id].unlockWins - Meta.CARDS[b.id].unlockWins;
    }).forEach(function (item) {
      const id = item.id;
      const spec = Meta.CARDS[id];
      const card = meta.cards[id];
      const owned = card.level > 0;
      // Own cards always; of the others the three nearest, the rest behind «Все бригадиры».
      if (!owned && !foremenAll && !nearest.has(id)) {
        hidden += 1;
        return;
      }
      const classes = ['foreman-tile', 'rarity-' + spec.rarity];
      if (item.group === 0) classes.push('equipped');
      if (owned && foremanCanUpgrade(id)) classes.push('ready');
      if (!owned) classes.push(Meta.cardInPool(meta, id) ? 'missing' : 'locked');
      const need = Meta.cardCopiesRequired(card);
      const maxed = card.level >= Meta.cardMaxLevel(id);
      let footer = '';
      if (owned) {
        footer = maxed ? '<i class="foreman-copies full"><span style="width:100%"></span></i>'
          : '<i class="foreman-copies"><span style="width:' + Math.min(100, card.copies / need * 100) + '%"></span></i>';
      } else {
        footer = '<small>' + (Meta.cardInPool(meta, id) ? 'В сундуках' : 'Побед в испытаниях: ' + spec.unlockWins) + '</small>';
      }
      html += '<button type="button" class="' + classes.join(' ') + '" data-action="foreman-open" data-id="' + id + '">' +
        '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt="">' +
        (owned ? '<b class="foreman-level">' + card.level + '</b>' : '') +
        (owned && meta.cardsSeen[id] !== true ? '<em class="foreman-new">новый</em>' : '') +
        '<strong>' + spec.name + '</strong><span class="foreman-short">' + foremanEffect(id, card.level, true) + '</span>' +
        (owned ? '<small class="foreman-expertise-label">Экспертиза ' + Meta.expertiseLevel(card) + '</small>' : '') + footer + '</button>';
    });
    html += '</div>';
    if (hidden > 0) {
      html += '<button type="button" class="foreman-back foremen-all" data-action="foremen-all">Все бригадиры · ещё ' + hidden + '</button>';
    }
    content.insertAdjacentHTML('beforeend', html);
  }

  // A card's detail: it counts as seen now; the grid's scroll is kept for «← Бригадиры».
  function openForemanDetail(id) {
    const panel = document.getElementById('meta-panel');
    if (!foremanFocus) foremanGridScroll = panel.scrollTop;
    foremanFocus = id;
    if (meta.cards[id].level > 0 && meta.cardsSeen[id] !== true) {
      meta.cardsSeen[id] = true;
      Meta.save(meta);
    }
    renderMetaScreen();
    panel.scrollTop = 0;
  }

  function showForemanGrid() {
    foremanFocus = null;
    renderMetaScreen();
    document.getElementById('meta-panel').scrollTop = foremanGridScroll;
  }

  // Leaving «Бригадиры»: the «новый» marks have been looked at.
  function markForemenSeen() {
    let changed = false;
    Object.keys(Meta.CARDS).forEach(function (id) {
      if (meta.cards[id].level > 0 && meta.cardsSeen[id] !== true) {
        meta.cardsSeen[id] = true;
        changed = true;
      }
    });
    if (changed) Meta.save(meta);
  }

  function foremanCanUpgrade(id) {
    const card = meta.cards[id];
    return card.level > 0 && card.level < Meta.cardMaxLevel(id) && card.copies >= Meta.cardCopiesRequired(card) &&
      meta.capital >= Meta.cardUpgradeCost(card, id) && meta.seals >= Meta.cardSeals(card);
  }

  // Why «Повысить» is off: copies first, then capital, then seals.
  function foremanUpgradeBlock(id) {
    const card = meta.cards[id];
    const copies = Meta.cardCopiesRequired(card) - card.copies;
    if (copies > 0) return 'Нужно ещё ' + copies + ' ' + UI.plural(copies, 'копия', 'копии', 'копий');
    const capital = Meta.cardUpgradeCost(card, id) - meta.capital;
    if (capital > 0) return 'Не хватает ' + formatCompact(capital) + ' капитала';
    const seals = Meta.cardSeals(card) - meta.seals;
    if (seals > 0) return 'Нужно ещё ' + seals + ' ' + UI.plural(seals, 'печать', 'печати', 'печатей');
    return '';
  }

  // Effect text with values: the current one and, if the card can still level up, the next one in
  // green — «Укладка +30% → +40%», «Каждые 94 → 86 кубов — +1 рабочий». Cards not hired yet show
  // their first level. `short` is the compact line of the grid tile; `passive` the card's passive;
  // `plain` — the current value only (the briefing: what this crew does now); `element` — the card
  // works in its element on this order: the main value as it works there (Meta.nicheValue).
  function foremanEffect(id, level, short, passive, plain, element) {
    const spec = Meta.CARDS[id];
    const shown = passive ? Meta.expertiseLevel(meta.cards[id]) : Math.max(1, level);
    const maximum = passive ? Meta.FOREMEN.expertise.levels.length : Meta.cardMaxLevel(id);
    const nextLevel = !plain && level > 0 && shown < maximum ? shown + 1 : 0;
    function text(format, at) {
      const now = foremanValueText(format, at(shown));
      const next = nextLevel ? foremanValueText(format, at(nextLevel)) : now;
      return '<b class="value-now">' + now + '</b>' +
        (next !== now ? ' → <b class="value-next">' + next + '</b>' : '');
    }
    if (passive) {
      function passiveValue(l) {
        return spec.passive.startCoinMinutes ? Meta.passiveStartCoins(meta, id, l) : Meta.cardPassive(id, l);
      }
      const format = spec.passive.startCoinMinutes ? 'number' : spec.passive.format;
      if (shown === 0) {
        const first = spec.passive.effect === 'startBuilders' ? expertiseWorkerText(1)
          : spec.passive.line.replace('{p}', foremanValueText(format, passiveValue(1)))
            .replace('{p2}', foremanValueText(spec.passive.format2, Meta.cardPassive(id, 1, true)));
        return '<b class="value-next">' + first + '</b>';
      }
      if (spec.passive.effect === 'startBuilders') {
        return '<b class="value-now">' + expertiseWorkerText(shown) + '</b>' +
          (nextLevel ? ' → <b class="value-next">' + expertiseWorkerText(nextLevel) + '</b>' : '');
      }
      return spec.passive.line.replace('{p}', text(format, passiveValue))
        .replace('{p2}', spec.passive.formula2 ? text(spec.passive.format2, function (l) { return Meta.cardPassive(id, l, true); }) : '');
    }
    const template = short ? spec.short : spec.line;
    return template
      .replace('{v2}', spec.formula2 ? text(spec.format2 || spec.format, function (l) { return Meta.cardValue(id, l, true); }) : '')
      .replace('{v}', text(spec.format, function (l) { return element ? elementValue(spec, Meta.cardValue(id, l)) : Meta.cardValue(id, l); }));
  }

  // A card's main value in its element, in whole percents as the crew chips round it (crewChips).
  function elementValue(spec, value) {
    const boosted = Meta.nicheValue(spec, value);
    if (spec.format === 'less%') return 1 - Math.round((1 - boosted) * 100) / 100;
    if (spec.format === 'plus%') return 1 + Math.round((boosted - 1) * 100) / 100;
    if (spec.format === 'plus%r' || spec.format === 'pct') return Math.round(boosted * 100) / 100;
    return boosted;
  }

  function expertiseWorkerText(level) {
    const ranks = Meta.expertiseWorkers(level);
    if (!ranks.length) return 'Нет дополнительных рабочих';
    const senior = ranks.filter(function (rank) { return rank === 1.2; }).length;
    const parts = [];
    if (senior) parts.push(senior + ' ' + UI.plural(senior, 'старший', 'старших', 'старших'));
    if (level % 3) parts.push(level % 3 === 1 ? '1 младший' : '1 средний');
    return '+' + parts.join(' + ') + ' на старте';
  }

  function foremanExpertise(id, plain) {
    const progress = Meta.expertiseProgress(meta.cards[id]);
    const next = progress.level < progress.max;
    const experience = function (value) { return Math.floor(value).toLocaleString('ru-RU'); };
    const card = meta.cards[id];
    return '<section class="foreman-expertise' + (progress.level ? '' : ' dormant') + '">' +
      '<div class="foreman-expertise-head"><strong>Экспертиза <span>' + progress.level + ' / ' + progress.max + '</span></strong>' +
      '<span>' + (next ? experience(progress.current) + ' / ' + experience(progress.required) : 'Максимум') + '</span></div>' +
      '<i class="foreman-expertise-bar"><span style="width:' + (progress.fraction * 100).toFixed(2) + '%"></span></i>' +
      (!Meta.schoolHasUpgrade(meta, 'expertise') ? '<small class="school-lock">Опыт: изучите «Производственная практика» в школе</small>' : '') +
      '<small class="foreman-passive-scope">Для всех строек' + (progress.level ? '' : ' · с ур. 1') + '</small>' +
      '<p class="foreman-passive">' + foremanEffect(id, card.level, false, true, plain) + '</p>' +
      '<details class="foreman-help"><summary aria-label="Как развивать бригадира">i</summary><div>' +
      '<p>Звёзды усиливают способность в бригаде и набор опыта' + (card.level ? ' — сейчас ×' + Meta.cardExperienceMultiplier(card.level) : '') + '.</p>' +
      '<p>Экспертиза растёт за кубы в бригаде, в том числе оффлайн. Пассивка действует на всех стройках.</p>' +
      (id === 'shift' ? '<p>Рабочие: младший 80% → средний 100% → старший 120%.</p>' : '') +
      '<p>Стартовые бонусы — со следующего заказа.</p></div></details></section>';
  }

  function foremanValueText(format, value) {
    const percent = function (number) { return number.toLocaleString('ru-RU', { maximumFractionDigits: 1 }); };
    if (format === 'startCoins') return Meta.startCoinBonus(meta, value).toLocaleString('ru-RU');
    if (format === 'plus%') return '+' + percent((value - 1) * 100) + '%';
    if (format === 'pct') return percent(value * 100) + '%';
    if (format === 'plus%r') return '+' + percent(value * 100) + '%';
    if (format === 'less%') return percent((1 - value) * 100) + '%';
    if (format === 'sec') return Math.round(value) + ' с';
    if (format === 'mult') return '×' + value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    if (format === 'number') return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
    return String(Math.round(value));
  }

  // The card in the «Бригадиры» screen: where it works (crews are not changed here), the upgrade.
  function foremanDetail(id, sites) {
    const spec = Meta.CARDS[id];
    const card = meta.cards[id];
    const owned = card.level > 0;
    const need = Meta.cardCopiesRequired(card);
    const maxed = card.level >= Meta.cardMaxLevel(id);
    const cost = Meta.cardUpgradeCost(card, id);
    const seals = Meta.cardSeals(card);
    const where = owned ? (sites[id] ? 'Работает ' + placesText(sites[id]) : 'Не назначен')
      : (Meta.cardInPool(meta, id) ? 'В сундуках, контрактах и школе' : 'Побед в испытаниях: ' + spec.unlockWins);
    let upgrade = '';
    if (owned && !maxed) {
      const can = foremanCanUpgrade(id);
      upgrade = '<div class="foreman-upgrade"><span class="foreman-copy-count' + (card.copies >= need ? ' ready' : '') + '">Копии ' + card.copies + ' / ' + need + '</span>' +
        buyButtonHtml({ attrs: 'data-action="card-upgrade" data-id="' + id + '"', label: 'Повысить', icon: 'icons/icon-capital.jpg?v=2', wide: true,
          price: priceHtml(cost, seals).replace(/^<img[^>]*>/, ''), have: meta.capital, cost: cost, short: !can, locked: card.copies < need,
          shortText: foremanUpgradeBlock(id) }) + '</div>';
      if (!can && card.copies >= need) upgrade += reasonHtml(foremanUpgradeBlock(id));
    }
    return '<button type="button" class="foreman-back" data-action="foreman-back">← Бригадиры</button>' +
      '<article class="meta-card foreman-detail rarity-' + spec.rarity + (owned ? '' : ' missing') + '">' +
      '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt="">' +
      '<b class="rarity-mark">' + Meta.RARITY_NAMES[spec.rarity] + '</b>' +
      '<div class="foreman-heading"><h3>' + spec.name + '</h3>' +
      (owned ? '<span class="foreman-star-level">Ур. ' + card.level + ' / ' + Meta.cardMaxLevel(id) + '</span>' : '') + '</div>' +
      '<div class="foreman-context"><span>' + where + '</span></div>' +
      '<div class="foreman-ability"><p class="foreman-effect">' + foremanEffect(id, card.level) + '</p>' + upgrade + '</div>' +
      foremanExpertise(id) + '</article>';
  }

  // School departments share the existing recruiting building and panel.
  function renderRecruiting(content) {
    const attempts = Meta.schoolAttempts(meta);
    let html = '<div class="office-tabs school-tabs" role="tablist" aria-label="Школа бригадиров">' +
      [['trials', 'Испытания'], ['training', 'Обучение'], ['recruit', 'Найм']].map(function (tab) {
        const on = schoolTab === tab[0];
        return '<button type="button" role="tab" aria-selected="' + on + '"' + (on ? ' class="on"' : '') + ' data-action="school-tab" data-id="' + tab[0] + '">' + tab[1] + '</button>';
      }).join('') + '</div>';
    if (schoolTab === 'trials') {
      // One row of pills: attempts left (with the refill wait once some are used) and what the next win brings.
      const milestone = Meta.schoolMilestoneCards(meta);
      html += '<div class="school-summary"><span>Попытки <b>' + attempts.left + ' / ' + attempts.limit + '</b>' +
        (attempts.left < attempts.limit ? ' · ' + ICONS.clock + formatWait(attempts.resetAt - Date.now()) : '') + '</span>' +
        (milestone.length ? '<span class="next">За победу: ' + milestone.map(function (id) { return UI.escapeHtml(Meta.CARDS[id].name); }).join(', ') + '</span>' : '') +
        '<button type="button" class="info-btn school-info" data-action="school-info" aria-label="Бригадиры за победы">i</button></div>';
      Object.keys(Meta.SCHOOL.bosses).forEach(function (id) {
        const boss = Meta.schoolBoss(meta, id);
        const lock = Meta.schoolBossLock(meta, id);
        const icon = '<img class="game-icon school-icon" src="icons/icon-school-' + id + '.jpg" alt="">';
        if (lock) {
          html += '<article class="meta-card school-trial locked">' + icon + '<div><h3>' + UI.escapeHtml(boss.name) + '</h3><small>' + ICONS.lock + lock + '</small></div></article>';
          return;
        }
        const side = Meta.site(meta, 'side');
        const active = sideBusy() && side.runMode === 'school' && side.runPayload && side.runPayload.bossId === id;
        const disabled = boss.complete || attempts.left <= 0 || sideBusy();
        html += '<article class="meta-card school-trial">' + icon + '<div><h3>' + UI.escapeHtml(boss.name) + '</h3><small>' +
          (boss.complete ? 'Все ступени пройдены' : 'Ступень ' + boss.tier + ' · ' + ICONS.clock + MB.formatClock(boss.limit)) + '</small>' +
          // The tier's limit is reckoned for the company after referenceLevel story orders (metasim).
          (!boss.complete && boss.referenceLevel > (meta.campaignLevel || 0)
            ? '<small class="school-early">Рассчитана на штаб после ' + boss.referenceLevel + ' ' + UI.plural(boss.referenceLevel, 'заказа', 'заказов', 'заказов') +
              ' · сдано ' + (meta.campaignLevel || 0) + '</small>' : '') +
          (boss.complete ? '' : '<p class="school-reward"><img src="icons/icon-diplomas.svg" alt="дипломы">+' + boss.diplomas +
            '<img src="icons/icon-chest-25.jpg" alt="Малый сундук" title="Малый сундук"></p>') + '</div>' +
          '<button data-action="' + (active ? 'school-resume' : 'school-trial') + '" data-id="' + id + '"' + (disabled && !active ? ' disabled' : '') + '>' +
          (active ? 'Продолжить' : boss.complete ? 'Пройдено' : sideBusy() ? 'Слот занят' : attempts.left <= 0 ? 'Нет попыток' : 'Начать') + '</button></article>';
      });
    } else if (schoolTab === 'training') {
      Object.keys(Meta.SCHOOL.upgrades).forEach(function (id) {
        const spec = Meta.SCHOOL.upgrades[id];
        const level = Meta.schoolUpgradeLevel(meta, id);
        const price = Meta.schoolUpgradeCost(meta, id);
        const reason = Meta.schoolUpgradeReason(meta, id);
        html += compactUpgradeCard({ id: id, action: price ? 'school-upgrade' : '', name: spec.name,
          iconMarkup: '<img class="game-icon" src="icons/icon-diplomas.svg" alt="">',
          className: 'school-upgrade', level: level, max: spec.max, body: '<p>' + schoolUpgradeText(id, level) + '</p>',
          capital: price ? price.capital : 0, diplomas: price ? price.diplomas : 0, seals: 0,
          status: price ? '' : 'Изучено', disabled: !!reason, prerequisite: price ? reason : '' });
      });
    } else if (!Meta.schoolHasUpgrade(meta, 'recruiting')) {
      html += lockedCard('Найм', 'Откроется программой «Приёмная комиссия» в «Обучении»');
    } else {
      const recruit = Meta.refreshRecruiting(meta);
      const cap = Meta.recruitCapacity(meta);
      html += '<article class="meta-card school-trial"><div><h3>Кандидаты ' + recruit.stock + ' / ' + cap + '</h3><small>' +
        (recruit.stock < cap ? 'Новый через ' + formatWait(recruit.nextAt - Date.now()) : 'Все места заняты') + '</small></div><button data-action="recruit"' + (recruit.stock > 0 ? '' : ' disabled') + '>Нанять</button></article>';
      if (Meta.schoolHasUpgrade(meta, 'profile')) {
        const preferred = meta.school.preferredCard;
        html += '<article class="meta-card school-focus"><h3>Профильный поиск · ×' + (1 + Meta.schoolUpgradeLevel(meta, 'profile')) + '</h3>' +
          '<label><select id="school-focus" aria-label="Профильный бригадир"><option value="">Любой</option>' + Object.keys(Meta.CARDS).filter(function (id) { return Meta.cardInPool(meta, id); }).map(function (id) {
            return '<option value="' + id + '"' + (id === preferred ? ' selected' : '') + '>' + UI.escapeHtml(Meta.CARDS[id].name) + ' · ' + Meta.RARITY_NAMES[Meta.CARDS[id].rarity] + '</option>';
          }).join('') + '</select></label></article>';
        const cost = Meta.targetRecruitCost(meta);
        if (Meta.schoolHasUpgrade(meta, 'targeted')) html += '<article class="meta-card school-trial"><div><h3>Персональное приглашение</h3>' +
          (cost ? '<p class="school-reward"><img src="icons/icon-capital.jpg?v=2" alt="капитал">' + formatCompact(cost.capital) + '<img src="icons/icon-diplomas.svg" alt="дипломы">' + cost.diplomas + '</p>' : '<small>Выберите бригадира в поиске</small>') +
          '</div><button data-action="school-target"' + (!cost || recruit.stock <= 0 || meta.capital < cost.capital || meta.diplomas < cost.diplomas ? ' disabled' : '') + '>Пригласить</button></article>';
      }
    }
    content.insertAdjacentHTML('beforeend', html);
    const focus = content.querySelector('#school-focus');
    if (focus) focus.addEventListener('change', function () { Meta.setRecruitFocus(meta, focus.value); renderMetaScreen(); });
  }

  // «i» on the trials tab: which foreman joins the pool after how many trial wins in total.
  function showSchoolUnlocks() {
    const wins = Meta.schoolTotalWins(meta);
    const ids = Object.keys(Meta.CARDS).sort(function (a, b) { return Meta.CARDS[a].unlockWins - Meta.CARDS[b].unlockWins; });
    const next = ids.find(function (id) { return Meta.CARDS[id].unlockWins > wins; });
    const rows = ids.map(function (id) {
      const spec = Meta.CARDS[id];
      const state = spec.unlockWins <= wins ? 'open' : id === next ? 'next' : '';
      // The frame colour of the portrait tells the rarity.
      return '<tr class="' + state + '"><td>' + spec.unlockWins + '</td><td><span class="school-unlock-name">' +
        '<img class="rarity-' + spec.rarity + '" src="icons/icon-foreman-' + id + '.jpg?v=3" alt="" title="' + Meta.RARITY_NAMES[spec.rarity] + '">' +
        UI.escapeHtml(spec.name) + '</span></td></tr>';
    }).join('');
    UI.overlay.open({
      id: 'school-unlocks',
      type: 'sheet',
      kicker: 'Школа · побед: ' + wins,
      title: 'Бригадиры за победы',
      body: '<table class="school-unlocks"><thead><tr><th>Побед</th><th>Бригадир</th></tr></thead><tbody>' + rows + '</tbody></table>',
    });
  }

  function schoolUpgradeText(id, level) {
    const spec = Meta.SCHOOL.upgrades[id];
    const next = Math.min(spec.max, level + 1);
    function change(before, after) {
      return before + (next > level ? ' → <b class="value-next">' + after + '</b>' : '');
    }
    if (id === 'mentoring') return 'Опыт учеников до ' + change('×' + foremanValueText('number', 1 + level * 0.4), '×' + foremanValueText('number', 1 + next * 0.4));
    if (id === 'practice') return 'Опыт на испытаниях ' + change('+' + level * 10 + '%', '+' + next * 10 + '%');
    if (id === 'recruitStock') return 'Запас кандидатов ' + change(Meta.FOREMEN.recruiting.stock + level, Meta.FOREMEN.recruiting.stock + next);
    if (id === 'recruitSpeed') return 'Кандидат каждые ' + change(UI.formatDuration(Meta.FOREMEN.recruiting.hours * 3600 / (1 + level * 0.15)), UI.formatDuration(Meta.FOREMEN.recruiting.hours * 3600 / (1 + next * 0.15)));
    if (id === 'profile') return 'Вес выбранной карты ' + change('×' + (1 + level), '×' + (1 + next)) + ' внутри редкости';
    return UI.escapeHtml(spec.text);
  }

  // Exchange: the board of old orders (reward and one button each), then its upgrades.
  function renderExchange(content) {
    if (meta.hq.exchange === 0) {
      content.insertAdjacentHTML('beforeend', '<article class="meta-card"><h3>Биржа не построена</h3><p>Её участок — в штабе.</p></article>');
      return;
    }
    Meta.fillExchange(meta);
    const capacity = Meta.exchangeCapacity(meta);
    const orders = meta.exchange.orders.slice().sort(function (a, b) { return a.levelIndex - b.levelIndex; });
    const side = Meta.site(meta, 'side');
    const sideRun = sideBusy();
    let html = '';
    const special = Meta.specialOrder(meta);
    if (special) html += specialOrderHtml(special, side, sideRun);
    html += '<p class="exchange-status">Заказы ' + orders.length + ' / ' + capacity +
      (orders.length < capacity ? ' · новый через ' + formatWait(meta.exchange.nextOrderAt - Date.now()) : '') + '</p>';
    orders.forEach(function (order) {
      const level = MB.LEVELS[order.levelIndex];
      const reward = Meta.exchangeReward(meta, order.levelIndex);
      const active = sideRun && side.runMode === 'exchange' && side.runPayload && side.runPayload.orderId === order.id;
      let button = '<button data-action="order" data-id="' + order.id + '">Взять</button>';
      if (active) button = '<button data-action="continue-order">Продолжить</button>';
      else if (sideRun) button = '<button disabled>Идёт другой заказ</button>';
      html += '<article class="meta-card exchange-order"><div><h3>' + level.name + '</h3>' +
        '<small>Заказ ' + (order.levelIndex + 1) + ' · ' + cubesText(level.blocks.length) + '</small>' +
        '<p class="exchange-reward"><img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt="капитал">' +
        reward.capital.toLocaleString('ru-RU') + ' <img class="currency-icon" src="icons/icon-rare-' + reward.rare + '.jpg?v=2" alt="' +
        Meta.RARE_NAMES[reward.rare] + '">+' + reward.rareAmount + '</p></div>' + button + '</article>';
    });
    if (orders.length === 0) html += '<article class="meta-card"><p>Заказы разобраны. Новый придёт через ' + formatWait(meta.exchange.nextOrderAt - Date.now()) + '.</p></article>';
    html += '<h3 class="exchange-heading">Улучшения биржи</h3>';
    let lockedShown = false;
    Object.keys(Meta.EXCHANGE_UPGRADES).sort(function (a, b) {
      return Meta.EXCHANGE_UPGRADES[a].from - Meta.EXCHANGE_UPGRADES[b].from;
    }).forEach(function (kind) {
      const spec = Meta.EXCHANGE_UPGRADES[kind];
      if (!Meta.exchangeUnlocked(meta, kind)) {
        if (!lockedShown) {
          const after = Meta.EXCHANGE_UPGRADES[spec.after];
          const level = spec.afterLevel || 1;
          html += lockedCard(spec.name, 'Откроется после «' + after.name + '»' + (level > 1 ? ' ' + level + ' ур.' : ''));
        }
        lockedShown = true;
        return;
      }
      const level = meta.exchange[kind];
      const maxed = level >= spec.max;
      const cost = Meta.exchangeUpgradeCost(meta, kind);
      const seals = Meta.exchangeSeals(kind, level);
      const short = meta.capital < cost || meta.seals < seals;
      const now = exchangeValueText(spec, Meta.exchangeValue(meta, kind, level));
      const next = maxed ? '' : ' → <b class="value-next">' + exchangeValueText(spec, Meta.exchangeValue(meta, kind, level + 1)) + '</b>';
      html += '<article class="meta-card office-upgrade"><div><h3>' + spec.name + ' <small>' + level + ' / ' + spec.max + '</small></h3>' +
        '<p>' + spec.text + ': ' + now + next + '</p>' +
        (maxed ? '<button disabled>Максимум</button>'
          : buyButtonHtml({ attrs: 'data-action="exchange-upgrade" data-id="' + kind + '"', label: 'Улучшить', icon: 'icons/icon-capital.jpg?v=2', wide: true,
            price: priceHtml(cost, seals).replace(/^<img[^>]*>/, ''), have: meta.capital, cost: cost, short: short, shortText: shortfallText(cost, seals) }) +
            (short ? reasonHtml(shortfallText(cost, seals)) : '')) +
        '</div></article>';
    });
    content.insertAdjacentHTML('beforeend', html);
  }

  // «Спецзаказ дня» (Meta.specialOrder): a gold card on top of the board, the size of the others —
  // the building, capital and seals; done, its button counts down to the next one (00:00 UTC).
  function specialOrderHtml(special, side, sideRun) {
    const level = MB.LEVELS[special.levelIndex];
    const reward = Meta.specialReward(meta, special.levelIndex);
    const active = sideRun && side.runMode === 'exchange' && side.runPayload && side.runPayload.special;
    let button = '<button data-action="order" data-id="special">Взять</button>';
    if (active) button = '<button data-action="continue-order">Продолжить</button>';
    else if (special.done) button = '<button disabled>' + ICONS.clock + formatWait(Meta.nextUtcDay(Date.now()) - Date.now()) + '</button>';
    else if (sideRun) button = '<button disabled>Идёт другой заказ</button>';
    return '<article class="meta-card exchange-order exchange-special' + (special.done ? ' done' : '') + '"><div>' +
      '<h3>★ ' + level.name + '</h3><small>' + (special.done ? 'Выполнен · новый через' : 'Спецзаказ дня') + '</small>' +
      '<p class="exchange-reward"><img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt="капитал">' + reward.capital.toLocaleString('ru-RU') +
      ' <img class="currency-icon" src="icons/icon-seals.jpg?v=2" alt="печати">+' + reward.seals + '</p>' +
      '</div>' + button + '</article>';
  }

  // «43 куба», «1 240 кубов».
  function cubesText(count) {
    return count.toLocaleString('ru-RU') + ' ' + UI.plural(count, 'куб', 'куба', 'кубов');
  }

  function exchangeValueText(spec, value) {
    if (spec.format === 'wait') return formatWait(value * 60000);
    return officeValueText(spec, value);
  }

  // «2 ч», «1 ч 36 мин», «12 мин», «меньше минуты».
  function formatWait(ms) {
    const minutes = Math.ceil(Math.max(0, ms) / 60000);
    if (minutes < 1) return 'меньше минуты';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return rest + ' мин';
    return hours + ' ч' + (rest ? ' ' + rest + ' мин' : '');
  }

  // Contracts: one at a time, in order. Building, time limit and reward come from the calibrated list.
  function renderContract(content) {
    const contract = Meta.currentContract(meta);
    if (!contract) {
      content.insertAdjacentHTML('beforeend', '<article class="meta-card"><h3>Все контракты выполнены</h3></article>');
      return;
    }
    const level = MB.LEVELS[contract.level];
    const ready = Meta.contractReady(meta);
    const cooling = Date.now() < meta.contract.cooldownUntil;
    const side = Meta.site(meta, 'side');
    const active = sideBusy() && side.runMode === 'contract';
    let button = '<button data-action="contract">Начать</button>';
    if (active) button = '<button data-action="continue-order">Продолжить</button>';
    else if (!ready) button = '<button disabled>Откроется после заказа ' + (contract.level + 1) + '</button>';
    else if (cooling) button = '<button disabled>Перезарядка ' + formatWait(meta.contract.cooldownUntil - Date.now()) + '</button>';
    else if (sideBusy()) button = '<button disabled>Идёт заказ биржи</button>';
    content.insertAdjacentHTML('beforeend',
      '<article class="meta-card exchange-order"><div><h3>Контракт ' + (meta.contract.index + 1) + ' · ' + level.name + '</h3>' +
      '<small>Лимит ' + MB.formatClock(contract.limit) + ' · ' + cubesText(level.blocks.length) + '</small>' +
      '<p class="exchange-reward"><img class="currency-icon" src="icons/icon-seals.jpg?v=2" alt="печати">+' + contract.seals +
      ' <img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt="капитал">' + contract.capital.toLocaleString('ru-RU') + '</p></div>' +
      button + '</article>' + contractGoalHtml(contract) +
      '<p class="exchange-status">Стройка с нуля · таймер идёт и без вас · не успели — перезарядка 5 мин</p>'
    );
  }

  // «Печати: 1 · «Здоровый сон» ждёт ещё 1»: the technology this contract's seals bring closer.
  function contractGoalHtml(contract) {
    const goal = sealGoal();
    if (!goal) return '';
    const name = Meta.TECH[goal.id].name;
    return '<p class="contract-goal"><img class="currency-icon" src="icons/icon-seals.jpg?v=2" alt="печати"><span>Печатей ' + meta.seals + ' · «' + UI.escapeHtml(name) + '» ждёт ещё ' +
      goal.need + (contract.seals >= goal.need ? ' — хватит этого контракта' : '') + '</span></p>';
  }

  // A lot in the HQ: go back to its running site, start a bought plot, or buy the plot (confirmed).
  // Buying and starting the project happen only when the run actually starts (spec.prepare).
  function takeBuild(id) {
    const hqSite = Meta.site(meta, 'hq');
    if (hqSite && hqSite.status === 'play' && hqSite.runPayload && hqSite.runPayload.projectId === id) {
      cityBuilding = null;
      switchSite('hq');
      return;
    }
    const spec = { mode: 'hq', levelIndex: 0, payload: { projectId: id }, reason: 'hq' };
    if (meta.hqSite && meta.hqSite.id === id) {
      requestRun(spec);
      return;
    }
    if (meta.plots[id] === 1) {
      spec.prepare = function () { return Meta.startHqProject(meta, id); };
      requestRun(spec);
      return;
    }
    const project = Meta.PROJECTS[id];
    const parts = [project.capital + ' капитала'];
    if (project.seals) parts.push(project.seals + ' ' + UI.plural(project.seals, 'печать', 'печати', 'печатей'));
    if (project.rare) Object.keys(project.rare).forEach(function (key) { parts.push(project.rare[key] + ' · ' + Meta.RARE_NAMES[key].toLowerCase()); });
    const price = parts.length > 2 ? parts.slice(0, -1).join(', ') + ' и ' + parts[parts.length - 1] : parts.join(' и ');
    UI.overlay.open({
      id: 'confirm-plot',
      kicker: project.name,
      title: 'Купить участок за ' + price + '?',
      body: '<p>Стройка здания начнётся сразу. ' + (liveKey ? 'Текущая стройка продолжит без вас.' : '') + '</p>',
      actions: [
        { label: 'Купить и строить', primary: true, onClick: function () {
          spec.prepare = function () {
            return (meta.plots[id] === 1 || Meta.buyPlot(meta, id)) && Meta.startHqProject(meta, id);
          };
          requestRun(spec);
        } },
        { label: 'Отмена' },
      ],
    });
  }

  function onMetaAction(event) {
    const button = event.target.closest('[data-action]');
    if (button && button.dataset.action === 'spell' && !button.disabled && button.getAttribute('aria-disabled') !== 'true') {
      const id = button.dataset.id;
      if (Meta.learnSpell(meta, id)) {
        if (campaign && campaign.status !== 'title') Meta.applyLive(meta, campaign);
        rerenderPanel();
        buyFlash('[data-buy="spell:' + id + '"]', 0);
        UI.toast({ text: 'Изучено: «' + Meta.SPELLS[id].name + '» · ур. ' + Meta.spellLevel(meta, id), icon: 'icons/icon-mana.jpg', tone: 'good', key: 'spell-learn' });
      }
      return;
    }
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (button.disabled) return;
    // A price not saved up yet (buyButtonHtml): shake and say what is short.
    if (button.classList.contains('buy-btn') && button.getAttribute('aria-disabled') === 'true') {
      buyShort(button, 'icons/icon-capital.jpg?v=2');
      return;
    }
    const capitalBefore = meta.capital;
    if (action === 'school-tab') { schoolTab = id; renderMetaScreen(); return; }
    if (action === 'tech-tab') { techTab = id; renderMetaScreen(); return; }
    if (action === 'school-info') { showSchoolUnlocks(); return; }
    if (action === 'school-resume') { switchSite('side'); return; }
    if (action === 'school-trial') {
      const boss = Meta.schoolBoss(meta, id);
      if (!boss || boss.complete || sideBusy() || Meta.schoolAttempts(meta).left <= 0) return;
      const spec = { mode: 'school', levelIndex: 0, reason: 'school', payload: { bossId: id, tier: boss.tier, limit: boss.limit, diplomas: boss.diplomas } };
      spec.prepare = function () { const payload = Meta.startSchoolTrial(meta, id); if (!payload) return false; spec.payload = payload; return true; };
      requestRun(spec);
      return;
    }
    if (action === 'school-upgrade') {
      Meta.buySchoolUpgrade(meta, id);
      renderMetaScreen();
      syncCity();
      if (meta.capital < capitalBefore) buyFlash('[data-buy="school-upgrade:' + id + '"]', capitalBefore - meta.capital, 'wallet-fx');
      return;
    }
    if (action === 'school-target') { const card = Meta.claimRecruit(meta, true); if (card) showCardReveal(card, 'recruiting'); renderMetaScreen(); return; }
    // Moving inside a panel starts at the top (the grid remembers its place for «← Бригадиры»).
    if (action === 'foreman-open') {
      openForemanDetail(id);
      return;
    }
    if (action === 'foreman-back') {
      showForemanGrid();
      return;
    }
    if (action === 'foremen-all') {
      foremenAll = true;
      renderMetaScreen();
      return;
    }
    if (action === 'office-tab') {
      officeTab = id;
      renderMetaScreen();
      document.getElementById('meta-panel').scrollTop = 0;
      return;
    }
    if (action === 'personnel-tab') {
      personnelTab = id;
      renderMetaScreen();
      document.getElementById('meta-panel').scrollTop = 0;
      return;
    }
    if (action === 'personnel-info') {
      personnelInfo = !personnelInfo;
      renderMetaScreen();
      return;
    }
    if (action === 'personnel' && Meta.buyPersonnel(meta, id)) {
      if (campaign && campaign.status !== 'title') Meta.applyLive(meta, campaign);
      refreshCity();
    }
    if (action === 'dish' && Meta.buyDish(meta, id)) {
      if (campaign && campaign.status !== 'title') Meta.applyLive(meta, campaign);
      UI.toast({ text: 'Изучено блюдо «' + MB.DISH[id].name + '»', icon: 'hq', tone: 'good', key: 'dish-new' });
    }
    if (action === 'tech' && Meta.buyTech(meta, id)) {
      Meta.applyLive(meta, campaign);
      hudDirty = true;
      paintHud();
      UI.toast({ text: 'Открыто: «' + Meta.TECH[id].name + '»', icon: 'gear', tone: 'good', key: 'tech-open' });
    }
    if (action === 'office' && Meta.buyOffice(meta, id)) {
      Meta.applyLive(meta, campaign);
      paintHud();
      // Crews are locked per run: a new foreman slot shows up in the next briefing.
      if (id === 'foremanSlots' && Meta.activeRuns(meta).length) UI.toast({ text: 'Новый слот бригадира — со следующего заказа', icon: 'foremen', tone: 'good', key: 'crew-slot-new' });
    }
    if (action === 'recruit') {
      const card = Meta.claimRecruit(meta);
      if (card) showCardReveal(card, 'recruiting');
    }
    if (action === 'card-upgrade') {
      // The running crews keep their cards; the new level counts at once where the card works.
      if (Meta.upgradeCard(meta, id) && campaign && campaign.crew) Meta.applyLive(meta, campaign);
    }
    if (action === 'exchange-upgrade') Meta.buyExchangeUpgrade(meta, id);
    if (action === 'booster') Meta.buyBooster(meta, id);
    if (action === 'training' && Meta.buyTraining(meta, id)) {
      // The cap, the power and the hires change at once on the running site.
      if (campaign && campaign.status !== 'title') {
        Meta.applyLive(meta, campaign);
        if (world) MB.refreshRanks(world);
      }
      refreshCity();
    }
    if (action === 'supply-slot') Meta.buySupplySlot(meta);
    if (action === 'abandon') {
      confirmAbandon();
      return;
    }
    if (action === 'order' && id === 'special') {
      const special = Meta.specialOrder(meta);
      if (!special || special.done || sideBusy()) return;
      cityBuilding = null;
      requestRun({ mode: 'exchange', levelIndex: special.levelIndex, payload: { orderId: 'special', special: true, day: special.day }, reason: 'order' });
      return;
    }
    if (action === 'order') {
      const order = meta.exchange.orders.find(function (item) { return item.id === id; });
      if (!order || sideBusy()) return;
      cityBuilding = null;
      requestRun({ mode: 'exchange', levelIndex: order.levelIndex, payload: { orderId: order.id }, reason: 'order' });
      return;
    }
    if (action === 'continue-order') {
      cityBuilding = null;
      switchSite('side');
      return;
    }
    if (action === 'contract') {
      if (!Meta.contractReady(meta) || Date.now() < meta.contract.cooldownUntil) return;
      if (sideBusy()) return;
      requestRun({ mode: 'contract', levelIndex: Meta.contractLevelIndex(meta), payload: { contractIndex: meta.contract.index }, reason: 'contract' });
      return;
    }
    // A purchase re-renders in place: the card the player pressed stays under the finger.
    rerenderPanel();
    paintHud();
    if (meta.capital < capitalBefore && button.classList.contains('buy-btn')) {
      buyFlash('[data-buy="' + action + ':' + id + '"], [data-action="' + action + '"][data-id="' + id + '"]', capitalBefore - meta.capital, 'wallet-fx');
    }
  }

  // ---------- one launcher for every new run ----------
  // spec: { mode: 'campaign' | 'hq' | 'contract' | 'exchange', levelIndex, payload, reason ('boot',
  // 'next', 'restart', 'jump', 'contract', 'order', 'hq'), prepare () → false cancels the start
  // (side effects such as buying a plot run only after the player confirmed) }.
  // Restores of existing sites never come here: they go through switchSite / enterSites.
  function requestRun(spec) {
    if (spec.mode === 'school' && (!spec.prepare || spec.reason !== 'school')) return;
    if (contractLocked()) return;
    openBriefing(spec, function (crew, boosters) { launchRun(spec, crew, boosters || []); });
  }

  // ---------- briefing before every new run (docs/gdd/16-ux-flow.md §4) ----------
  // A full-screen window: what the order is (size, rewards, the contract limit) and who goes. The
  // crew is a draft until «Начать стройку»: Cancel changes nothing (spec.prepare — buying a plot —
  // runs only in launchRun). Any owned card can go: the same card may work on several sites at
  // once, a small label only reminds where it already works. HQ buildings go without foremen.
  // onConfirm(crew): card ids, locked for the run.
  function openBriefing(spec, onConfirm) {
    const key = Meta.siteKey(spec.mode);
    // The order's character (Meta.orderRoles): its foremen work in their element, «Автоподбор» takes them first.
    const niches = Meta.orderNiches(spec.mode, spec.levelIndex || 0);
    const roles = Meta.orderRoles(spec.mode, spec.levelIndex || 0);
    if (spec.reason === 'jump') {
      // Dev level picker: straight in with the prefilled crew.
      onConfirm(prefillCrew(spec.mode, roles));
      return;
    }
    const state = { spec: spec, key: key, niches: niches, roles: roles, elsewhere: Meta.cardSites(meta, key), crew: prefillCrew(spec.mode, roles), boosters: [], body: null, handle: null, hold: 0, held: false, press: null };
    briefing = state;
    // Without a crew to pick it is just the entry to the site: a small bottom sheet over the scene.
    const withCrew = briefingHasCrew(spec);
    UI.overlay.open({
      id: 'briefing',
      type: withCrew ? 'screen' : 'sheet',
      className: withCrew ? 'briefing' : 'briefing briefing-compact',
      kicker: briefingKicker(spec),
      title: Meta.siteName(spec.mode, spec.levelIndex || 0, spec.payload || null),
      // The boot without a site has nothing behind the briefing to go back to.
      closable: spec.reason !== 'boot' && !(campaign && campaign.status === 'title'),
      body: function (body, handle) {
        state.body = body;
        state.handle = handle;
        body.addEventListener('click', function (event) { onBriefingClick(state, event); });
        body.addEventListener('pointerdown', function (event) { onBriefingPress(state, event); });
        body.addEventListener('pointermove', function (event) {
          if (state.press && Math.abs(event.clientX - state.press[0]) + Math.abs(event.clientY - state.press[1]) > 12) stopBriefingPress(state);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
          body.addEventListener(type, function () { stopBriefingPress(state); });
        });
        body.addEventListener('contextmenu', function (event) {
          if (event.target.closest('[data-brief="card"]')) event.preventDefault();
        });
        const away = briefingAwayLine(key);
        const foot = handle.el && handle.el.querySelector('.overlay-actions');
        if (foot && away) foot.insertAdjacentHTML('afterbegin', '<p class="briefing-away">' + ICONS.clock + '<span>' + away + '</span></p>');
        paintBriefing(state);
      },
      actions: [{ id: 'briefing-start', label: 'Начать стройку', primary: true, onClick: function () { confirmBriefing(state, onConfirm); } }],
      onClose: function (reason) {
        if (briefing === state) briefing = null;
        stopBriefingPress(state);
        UI.overlay.close('briefing-card');
        if (reason !== 'action') cancelBriefing();
      },
    });
  }

  function confirmBriefing(state, onConfirm) {
    const crew = briefingHasCrew(state.spec) ? state.crew.slice() : [];
    if (briefingHasCrew(state.spec)) {
      // «Как в прошлый раз» and the next prefill of this mode.
      Meta.saveCrewPreset(meta, state.spec.mode, crew);
    }
    onConfirm(crew, briefingBoosters(state.spec).length ? state.boosters.slice() : []);
  }

  // Cancelled with nothing running behind the briefing (a failed contract, no site): the HQ.
  function cancelBriefing() {
    if (currentScreen !== 'build' || (liveKey && campaign && campaign.status !== 'failed')) return;
    cityBuilding = null;
    document.body.classList.add('playing');
    openScreen('hq', { silent: true });
  }

  function ownedCards() {
    return Object.keys(Meta.CARDS).filter(function (id) { return meta.cards[id].level > 0; });
  }

  // The crew block is shown when the player owns a card and the run takes foremen (not HQ buildings).
  function briefingHasCrew(spec) {
    return Meta.modeHasCrew(spec.mode) && ownedCards().length > 0;
  }

  // «на основной стройке и на контракте» for the slots a card works on.
  function placesText(keys) {
    return keys.map(function (key) {
      const snap = Meta.site(meta, key);
      return CREW_PLACES[snap ? snap.runMode : 'campaign'] || CREW_PLACES.campaign;
    }).join(' и ');
  }

  function runLevel(spec) {
    return spec.mode === 'school' ? MB.schoolLevel(spec.payload && spec.payload.bossId, spec.payload && spec.payload.tier) : spec.mode === 'hq' ? MB.HQ_LEVELS[spec.payload && spec.payload.projectId] : MB.LEVELS[spec.levelIndex || 0];
  }

  function briefingKicker(spec) {
    if (spec.mode !== 'contract') return siteKicker(spec.mode, spec.levelIndex || 0);
    const number = spec.payload ? spec.payload.contractIndex + 1 : meta.contract.index + 1;
    return 'Контракт ' + number + ' · лимит ' + MB.formatClock(Meta.contractLimitSeconds(meta));
  }

  // The site on screen keeps building without the player once this run starts.
  function briefingAwayLine(key) {
    if (!liveKey || liveKey === key || !campaign || campaign.status !== 'play') return '';
    return siteLabel(campaign.runMode) + ' продолжит без вас — ' + Math.round(Meta.offlineEfficiency(meta) * 100) + '% скорости';
  }

  // The mode's preset; a mode that never had a crew (the first contract or exchange order) gets the
  // strongest cards instead. HQ buildings: nobody.
  // The last crew of this mode, its free slots filled by «Автоподбор» (a card won since, one in its
  // element on this order first): the slots are never empty while cards are owned.
  function prefillCrew(mode, roles) {
    if (!Meta.modeHasCrew(mode)) return [];
    const preset = Meta.cleanCrew(meta, Meta.crewOf(meta, mode));
    const free = Meta.foremanSlots(meta) - preset.length;
    if (free <= 0) return preset;
    return preset.concat(autoCrew(roles).filter(function (id) { return preset.indexOf(id) < 0; }).slice(0, free));
  }

  // «Автоподбор»: the strongest owned cards in every slot — in their element on this order first
  // (roles: Meta.orderRoles), then rarity, then level.
  function autoCrew(roles) {
    const fit = function (id) { return roles && roles.indexOf(Meta.CARDS[id].role) >= 0 ? 1 : 0; };
    return ownedCards().sort(function (a, b) {
      return fit(b) - fit(a) || RARITY_ORDER[Meta.CARDS[b].rarity] - RARITY_ORDER[Meta.CARDS[a].rarity] ||
        meta.cards[b].level - meta.cards[a].level || Meta.CARDS[a].unlockWins - Meta.CARDS[b].unlockWins;
    }).slice(0, Meta.foremanSlots(meta));
  }

  function paintBriefing(state) {
    const body = state.body;
    if (!body) return;
    const spec = state.spec;
    const level = runLevel(spec);
    const withCrew = briefingHasCrew(spec);
    let html = '<section class="briefing-order">' + (level ? briefingFacts(spec, level) : '') + briefingRewards(spec) + '</section>';
    if (withCrew) html += briefingCrew(state) + briefingCards(state, ownedCards());
    html += briefingBoostersHtml(state);
    const scroll = body.scrollTop;
    body.innerHTML = html;
    body.scrollTop = scroll;
    const start = state.handle && state.handle.el ? state.handle.el.querySelector('#briefing-start span') : null;
    if (start) start.textContent = withCrew && state.crew.length === 0 ? 'Начать без бригадиров' : 'Начать стройку';
  }

  function briefingFacts(spec, level) {
    const cubes = level.blocks.length;
    const rows = {};
    level.blocks.forEach(function (block) { rows[block.y] = true; });
    const floors = Object.keys(rows).length;
    let html = '<div class="briefing-facts">' +
      '<span class="briefing-chip">' + ICONS.build + cubes.toLocaleString('ru-RU') + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов') + '</span>' +
      '<span class="briefing-chip">' + floors + ' ' + UI.plural(floors, 'этаж', 'этажа', 'этажей') + '</span>';
    if (timedMode(spec.mode)) {
      html += '<span class="briefing-chip limit">' + ICONS.clock + 'Лимит ' + MB.formatClock(spec.mode === 'school' ? spec.payload.limit : Meta.contractLimitSeconds(meta)) + '</span>';
    }
    html += '</div>' + briefingNiches(spec);
    if (spec.mode === 'school') html += '<p class="briefing-note">Попытка спишется после старта. Таймер идёт без пауз, в том числе оффлайн. При поражении опыт сохраняется.</p>';
    if (spec.mode === 'contract') html += '<p class="briefing-note">Таймер идёт и без вас. Уйти с контракта можно, только бросив его.</p>';
    return html;
  }

  // «Характер заказа: Высотки — 18 эт., обычно 14 · Тяжёлые кубы — 19 кг на куб, обычно 13»: what the
  // order stands out by among its neighbouring levels (Meta.orderNiches). Foremen of that role work in
  // their element here (their cards say «в стихии»).
  function briefingNiches(spec) {
    const niches = Meta.orderNiches(spec.mode, spec.levelIndex || 0);
    if (niches.length === 0) return '';
    const number = function (value) { return value >= 100 ? Math.round(value).toLocaleString('ru-RU') : fxKg(value); };
    const text = function (niche) {
      const value = number(niche.value);
      if (niche.key === 'openings') return value + ' ' + UI.plural(niche.value, 'проём', 'проёма', 'проёмов');
      if (niche.key === 'weather') return value + ' ' + UI.plural(niche.value, 'плохая фаза', 'плохие фазы', 'плохих фаз') + ' погоды из 4';
      if (niche.key === 'build') return Math.round(niche.value) + ' мин, обычно ' + Math.round(niche.usual);
      const unit = { floors: ' эт.', kg: ' кг на куб', way: ' кл. до карьера', cubes: ' ' + UI.plural(niche.value, 'куб', 'куба', 'кубов') }[niche.key];
      return value + unit + ', обычно ' + number(niche.usual);
    };
    return '<p class="briefing-traits"><span>Характер заказа:</span> ' + niches.map(function (niche) {
      return UI.escapeHtml(niche.role + ' — ' + text(niche));
    }).join(' · ') + '</p>';
  }

  // «Награда» block: icons and amounts only (the icons name the currencies); chests are the site's
  // own business and are not promised here.
  function briefingRewards(spec) {
    const items = [];
    const img = function (src) { return '<img src="' + src + '" alt="">'; };
    const add = function (icon, text) {
      items.push('<span class="briefing-reward">' + icon + '<b>' + text + '</b></span>');
    };
    let note = '';
    if (spec.mode === 'campaign') {
      const reward = Meta.storyReward(meta, spec.levelIndex || 0);
      if (reward.capital > 0) add(img('icons/icon-capital.jpg?v=2'), '+' + formatCompact(reward.capital));
      if (reward.seals > 0) add(img('icons/icon-seals.jpg?v=2'), '+' + reward.seals);
      if (reward.done) note = 'Награда за этот объект уже получена.';
    } else if (spec.mode === 'exchange' && spec.payload && spec.payload.special) {
      const reward = Meta.specialReward(meta, spec.levelIndex || 0);
      add(img('icons/icon-seals.jpg?v=2'), '+' + reward.seals);
      if (reward.capital > 0) add(img('icons/icon-capital.jpg?v=2'), '+' + formatCompact(reward.capital));
    } else if (spec.mode === 'exchange') {
      const reward = Meta.exchangeReward(meta, spec.levelIndex || 0);
      add(img('icons/icon-rare-' + reward.rare + '.jpg?v=2'), '+' + reward.rareAmount);
      if (reward.capital > 0) add(img('icons/icon-capital.jpg?v=2'), '+' + formatCompact(reward.capital));
    } else if (spec.mode === 'contract') {
      const contract = Meta.currentContract(meta);
      if (contract) {
        add(img('icons/icon-seals.jpg?v=2'), '+' + contract.seals);
        if (contract.capital > 0) add(img('icons/icon-capital.jpg?v=2'), '+' + formatCompact(contract.capital));
        if ((meta.contract.index + 1) % Meta.FOREMEN.contractEvery === 0) add(ICONS.foremen, '+1');
      }
    } else if (spec.mode === 'school') {
      add(img('icons/icon-diplomas.svg'), '+' + spec.payload.diplomas);
      add(img('icons/icon-chest-25.jpg'), 'Малый сундук · 1 бригадир');
      Meta.schoolMilestoneCards(meta).forEach(function (id) {
        add(img('icons/icon-foreman-' + id + '.jpg?v=3'), '+1 ' + UI.escapeHtml(Meta.CARDS[id].name));
      });
    } else if (spec.mode === 'hq') {
      const project = Meta.PROJECTS[spec.payload && spec.payload.projectId];
      add(ICONS.hq, 'Новое здание');
      if (project) {
        note = project.text;
        if (project.rewardSeals && !(meta.hq[spec.payload.projectId] > 0)) add(img('icons/icon-seals.jpg?v=2'), '+' + project.rewardSeals);
      }
    }
    if (items.length === 0 && !note) return '';
    return '<div class="briefing-prize"><p class="briefing-prize-label">Награда</p>' +
      (items.length ? '<div class="briefing-rewards">' + items.join('') + '</div>' : '') +
      (note ? '<p class="briefing-note">' + UI.escapeHtml(note) + '</p>' : '') + '</div>';
  }

  function briefingCrew(state) {
    const slots = Meta.foremanSlots(meta);
    const maxSlots = Meta.foremanSlotsMax();
    let html = '<section class="briefing-crew">';
    html += '<h3 class="briefing-label">Бригадиры на этот заказ <b>· ' + state.crew.length + ' / ' + slots + '</b></h3><div class="briefing-slots">';
    for (let i = 0; i < maxSlots; i++) {
      const id = state.crew[i];
      if (i >= slots) {
        html += '<button type="button" class="briefing-slot locked" data-brief="slot-locked" aria-label="Слот закрыт">' + ICONS.lock + '</button>';
      } else if (id) {
        html += '<button type="button" class="briefing-slot filled rarity-' + Meta.CARDS[id].rarity + '" data-brief="slot" data-id="' + id + '" aria-label="Убрать «' + Meta.CARDS[id].name + '»">' +
          (i === 0 && Meta.schoolHasUpgrade(meta, 'mentoring') ? '<small class="mentor-label">Наставник</small>' : '') + '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt=""><b class="foreman-level">' + meta.cards[id].level + '</b><i class="briefing-x" aria-hidden="true">×</i></button>';
      } else {
        html += '<button type="button" class="briefing-slot empty" data-brief="slot-empty" aria-label="Свободный слот">+</button>';
      }
    }
    html += '</div>';
    if (Meta.schoolHasUpgrade(meta, 'mentoring')) html += '<p class="briefing-hint">Первый слот — Наставник. Повышает опыт бригадиров с меньшей экспертизой; свой опыт не теряет.</p>';
    if (slots < maxSlots) html += '<p class="briefing-hint">' + ICONS.lock + '<span>Ещё слот — «Штат управления» в офисе</span></p>';
    const chips = crewChips(state.spec.mode, state.crew, state.roles);
    if (chips.length) html += '<div class="briefing-effects">' + chips.map(function (chip) { return '<span class="briefing-effect">' + chip + '</span>'; }).join('') + '</div>';
    html += '<p class="briefing-lock">' + ICONS.lock + '<span>После старта состав не меняется до сдачи объекта</span></p>';
    const preset = Meta.cleanCrew(meta, Meta.crewOf(meta, state.spec.mode));
    html += '<div class="briefing-tools"><button type="button" class="ghost-btn" data-brief="auto">Автоподбор</button>' +
      '<button type="button" class="ghost-btn" data-brief="last"' + (preset.length ? '' : ' disabled') + '>Как в прошлый раз</button></div>';
    return html + '</section>';
  }

  // Owned cards only: in the crew → the rest (rarity, level). A card that already works on another
  // site is not taken from there; the label only reminds where else it works.
  function briefingCards(state, owned) {
    const inCrew = function (id) { return state.crew.indexOf(id) >= 0; };
    const order = owned.slice().sort(function (a, b) {
      if (inCrew(a) !== inCrew(b)) return inCrew(a) ? -1 : 1;
      if (inCrew(a)) return state.crew.indexOf(a) - state.crew.indexOf(b);
      return RARITY_ORDER[Meta.CARDS[b].rarity] - RARITY_ORDER[Meta.CARDS[a].rarity] ||
        meta.cards[b].level - meta.cards[a].level || Meta.CARDS[a].unlockWins - Meta.CARDS[b].unlockWins;
    });
    let html = '<section class="briefing-cards"><h3 class="briefing-label">Ваши бригадиры</h3><div class="foreman-grid briefing-grid">';
    order.forEach(function (id) {
      const spec = Meta.CARDS[id];
      const classes = ['foreman-tile', 'briefing-tile', 'rarity-' + spec.rarity];
      if (inCrew(id)) classes.push('equipped');
      // The character this card is in its element on (a long build for «Разгон» and «Ночь», and so on).
      const niche = (state.niches || []).find(function (item) { return item.roles.indexOf(spec.role) >= 0; });
      const element = !!niche;
      if (element) classes.push('in-element');
      const also = state.elsewhere[id];
      html += '<button type="button" class="' + classes.join(' ') + '" data-brief="card" data-id="' + id + '">' +
        // In the crew: a green frame and a check in the portrait's bottom-right corner (off the face).
        '<span class="briefing-face"><img src="icons/icon-foreman-' + id + '.jpg?v=3" alt="">' +
        (inCrew(id) ? '<i class="briefing-check" aria-label="В бригаде">' + ICONS.check + '</i>' : '') + '</span>' +
        '<b class="foreman-level">' + meta.cards[id].level + '</b>' +
        '<span class="briefing-i" data-brief="info" data-id="' + id + '" role="button" aria-label="Подробнее">i</span>' +
        '<strong>' + spec.name + '</strong><span class="foreman-short">' + foremanEffect(id, meta.cards[id].level, true, false, true, element) + '</span>' +
        (element ? '<small class="briefing-element">' + UI.escapeHtml(niche.role) + ': в стихии, +' + Math.round((Meta.FOREMEN.nicheBonus || 0) * 100) + '%</small>' : '') +
        (also ? '<small class="briefing-also">Ещё ' + placesText(also) + '</small>' : '') + '</button>';
    });
    return html + '</div></section>';
  }

  // Total effect of a crew: summed numbers first, then the cards whose effect is a trigger.
  function crewChips(mode, crew, roles) {
    const bonus = Meta.equippedBonuses(meta, mode, crew, roles);
    const chips = [];
    const up = function (value, label) {
      const pct = Math.round((value - 1) * 100);
      if (pct > 0) chips.push(label + ' +' + pct + '%');
    };
    up(bonus.placeSpeed, 'Укладка');
    up(bonus.carryScale, 'Ноша');
    up(bonus.movement, 'Ходьба');
    up(bonus.climb, 'Подъём');
    up(bonus.pickupSpeed, 'Набор');
    up(bonus.scaffold, 'Леса');
    up(bonus.coinMultiplier, 'Доход');
    up(bonus.hunger, 'Сытость');
    up(bonus.smoke, 'Реже перекуры');
    up(bonus.smokeShort, 'Перекуры короче');
    if (bonus.heightPenalty < 1) chips.push('Штраф высоты −' + Math.round((1 - bonus.heightPenalty) * 100) + '%');
    if (bonus.nightRelief > 0) chips.push('Ночной штраф −' + Math.round(bonus.nightRelief * 100) + '%');
    const builders = Math.round(bonus.startBuilders);
    if (builders > 0) chips.push(expertiseWorkerText(Meta.expertiseLevel(meta.cards.shift)));
    if (bonus.skipMinutes > 0) chips.push('+' + Meta.startCoinBonus(meta, bonus.skipMinutes).toLocaleString('ru-RU') + ' монет на старте');
    if (bonus.startCoinGrant > 0) chips.push('+' + bonus.startCoinGrant.toLocaleString('ru-RU') + ' монет от коллекции на старте');
    if (bonus.plan > 0) chips.push('План +' + Math.round(bonus.plan));
    if (bonus.capitalChance > 0) chips.push('Шанс находки +' + Math.round(bonus.capitalChance * 100) + '%');
    if (bonus.findValueBonus > 0) chips.push('Находки +' + bonus.findValueBonus + ' капитала');
    if (bonus.orderCapitalMultiplier > 1) chips.push('Капитал за заказ +' + Math.round((bonus.orderCapitalMultiplier - 1) * 100) + '%');
    Object.keys(bonus.triggers).forEach(function (effect) {
      const id = bonus.triggers[effect].card;
      if (!Meta.CARDS[id]) return;
      const main = Meta.CARDS[id].effect === effect;
      // A trigger card in its element: its chip shows the stronger number, as the card does.
      const element = main && !!roles && roles.indexOf(Meta.CARDS[id].role) >= 0;
      chips.push(foremanEffect(id, meta.cards[id].level, main, !main, true, element));
    });
    return chips;
  }

  function onBriefingClick(state, event) {
    const el = event.target.closest('[data-brief]');
    if (state.held) {
      // The long press already opened the card.
      state.held = false;
      return;
    }
    if (!el || el.disabled) return;
    const id = el.dataset.id;
    const action = el.dataset.brief;
    if (action === 'info') openBriefingCard(state, id);
    else if (action === 'card') tapBriefingCard(state, id);
    else if (action === 'slot') removeFromCrew(state, id);
    else if (action === 'slot-empty') {
      const grid = state.body.querySelector('.briefing-cards');
      if (grid && grid.scrollIntoView) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'slot-locked') {
      UI.toast({ text: 'Ещё слот — «Штат управления» в офисе', icon: 'lock', key: 'crew-slot' });
    } else if (action === 'auto') {
      const next = autoCrew(state.roles);
      if (next.join(',') === state.crew.join(',')) {
        UI.toast({ text: 'Сильнейший состав уже выбран', icon: 'foremen', key: 'crew-auto' });
        return;
      }
      state.crew = next;
      paintBriefing(state);
    } else if (action === 'last') {
      state.crew = Meta.cleanCrew(meta, Meta.crewOf(meta, state.spec.mode));
      paintBriefing(state);
    } else if (action === 'booster') {
      toggleBriefingBooster(state, el, id);
    }
  }

  // The boosters opened in «Снабжение» that can go on this run (none for HQ buildings and dev jumps).
  function briefingBoosters(spec) {
    if (!(meta.hq.supply > 0) || spec.reason === 'jump' || spec.mode === 'hq') return [];
    return Meta.SUPPLY.boosters.filter(function (b) { return Meta.boosterLevel(meta, b.id) > 0; });
  }

  // Boosters whose line answers an order's character (Meta.orderNiches): lit in the briefing.
  const NICHE_BOOSTERS = { 'Высотки': ['ladders', 'scaffolds'], 'Тяжёлые кубы': ['carry', 'pallets', 'pickaxe'], 'Далёкие карьеры': ['boots'],
    'Огромные здания': ['crew', 'droneRent', 'loaderRent'], 'Долгая стройка': ['thermos'], 'Короткий заказ': ['crew'] };

  // «Бустеры на заказ · 1 / 2»: the opened boosters as cards, up to the slots; the choice is paid in
  // launchRun (Meta.spendBoosters). Those that suit the order's character are lit and say which.
  function briefingBoostersHtml(state) {
    const opened = briefingBoosters(state.spec);
    if (opened.length === 0) return '';
    const slots = Meta.supplySlots(meta);
    let html = '<section class="briefing-boosters"><h3 class="briefing-label">Бустеры на заказ <b>· ' + state.boosters.length + ' / ' + slots + '</b></h3><div class="booster-grid">';
    opened.forEach(function (b) {
      const block = Meta.boosterBlock(meta, b.id);
      const on = state.boosters.indexOf(b.id) >= 0;
      const fits = (state.niches || []).filter(function (niche) { return (NICHE_BOOSTERS[niche.role] || []).indexOf(b.id) >= 0; }).map(function (niche) { return niche.role; });
      html += '<button type="button" class="booster-card' + (on ? ' on' : '') + (block ? ' blocked' : '') + (fits.length ? ' in-element' : '') + '" data-brief="booster" data-id="' + b.id + '"' + (block ? ' aria-disabled="true"' : '') + '>' +
        (fits.length ? '<em class="booster-fit">' + UI.escapeHtml(fits.join(', ')) + '</em>' : '') +
        '<img class="game-icon" src="icons/' + b.icon + '" alt=""><b>' + UI.escapeHtml(b.name) + '</b>' +
        '<span>' + UI.escapeHtml(boosterEffect(b, Meta.boosterLevel(meta, b.id))) + '</span>' +
        '<small><img class="currency-icon" src="' + rareIcon(b.resource) + '" alt="">' + Meta.SUPPLY.useCost + ' <em>есть ' + (meta.rare[b.resource] || 0) + '</em></small>' +
        (block ? '<i>' + UI.escapeHtml(block) + '</i>' : '') + '</button>';
    });
    html += '</div>';
    if (opened.length < Meta.SUPPLY.boosters.length) html += '<p class="camp-more">Ещё ' + (Meta.SUPPLY.boosters.length - opened.length) + ' бустеров — в «Снабжении»</p>';
    return html + '</section>';
  }

  function toggleBriefingBooster(state, button, id) {
    if (button.getAttribute('aria-disabled') === 'true') {
      shake(button);
      UI.toast({ text: Meta.boosterBlock(meta, id), icon: 'lock', key: 'booster-block', duration: 1600 });
      return;
    }
    const at = state.boosters.indexOf(id);
    const slots = Meta.supplySlots(meta);
    if (at >= 0) state.boosters.splice(at, 1);
    else if (state.boosters.length < slots) state.boosters.push(id);
    else {
      shake(button);
      UI.toast({ text: 'Слотов: ' + slots + ' — сначала снимите другой бустер', icon: 'lock', key: 'booster-slots', duration: 1600 });
      return;
    }
    paintBriefing(state);
  }

  // Long press on a card opens its details (like the «i» corner).
  function onBriefingPress(state, event) {
    stopBriefingPress(state);
    state.held = false;
    const tile = event.target.closest('[data-brief="card"]');
    if (!tile || (event.button !== undefined && event.button !== 0)) return;
    state.press = [event.clientX, event.clientY];
    state.hold = setTimeout(function () {
      state.hold = 0;
      state.press = null;
      state.held = true;
      openBriefingCard(state, tile.dataset.id);
    }, 450);
  }

  function stopBriefingPress(state) {
    if (state.hold) clearTimeout(state.hold);
    state.hold = 0;
    state.press = null;
  }

  function tapBriefingCard(state, id) {
    if (state.crew.indexOf(id) >= 0) {
      removeFromCrew(state, id);
      return;
    }
    if (state.crew.length >= Meta.foremanSlots(meta)) {
      crewFull(state);
      return;
    }
    state.crew.push(id);
    paintBriefing(state);
  }

  function removeFromCrew(state, id) {
    state.crew = state.crew.filter(function (cardId) { return cardId !== id; });
    paintBriefing(state);
  }

  function crewFull(state) {
    const row = state.body ? state.body.querySelector('.briefing-slots') : null;
    if (row) {
      row.classList.remove('shake');
      void row.offsetWidth;
      row.classList.add('shake');
    }
    UI.toast({ text: 'Все места заняты — уберите кого-нибудь', icon: 'foremen', tone: 'warn', key: 'crew-full' });
  }

  function openBriefingCard(state, id) {
    const spec = Meta.CARDS[id];
    const card = meta.cards[id];
    const inCrew = state.crew.indexOf(id) >= 0;
    const also = state.elsewhere[id];
    const status = (inCrew ? 'В бригаде' : 'Не выбран') + (also ? ' · ещё ' + placesText(also) : '');
    const action = inCrew
      ? { label: 'Убрать из бригады', primary: true, onClick: function () { removeFromCrew(state, id); } }
      : { label: 'В бригаду', primary: true, onClick: function () { tapBriefingCard(state, id); } };
    UI.overlay.open({
      id: 'briefing-card',
      type: 'sheet',
      className: 'briefing-card-sheet',
      kicker: Meta.RARITY_NAMES[spec.rarity] + ' · уровень ' + card.level,
      title: spec.name,
      body: '<div class="briefing-card rarity-' + spec.rarity + '"><img src="icons/icon-foreman-' + id + '.jpg?v=3" alt="">' +
        '<p class="foreman-effect">' + foremanEffect(id, card.level, false, false, true) + '</p>' +
        foremanExpertise(id, true) +
        '<p class="briefing-card-status">' + status + '</p></div>',
      actions: [action, { label: 'Закрыть' }],
    });
  }

  // Start `spec` on its slot and put it on screen; the site that was on screen goes on without the
  // player. `crew` (card ids from the briefing, locked until the run ends; null — the mode's preset).
  function launchRun(spec, crew, boosters) {
    if (spec.prepare && spec.prepare() === false) {
      UI.toast({ text: 'Не получилось начать: не хватает ресурсов', icon: 'hq', tone: 'bad' });
      syncCity();
      if (currentScreen === 'hq') paintCityCard();
      return false;
    }
    const key = Meta.siteKey(spec.mode);
    UI.overlay.close('title');
    const chosen = Array.isArray(crew) ? crew : null;
    if (liveKey && liveKey !== key && world && campaign) {
      if (campaign.status === 'play') {
        const prev = Meta.site(meta, liveKey);
        saveLive({ awaySince: prev && prev.awaySince ? prev.awaySince : Date.now() });
      } else if (campaign.status === 'complete' && liveKey !== 'campaign') {
        Meta.clearSite(meta, liveKey);
      }
    }
    const freePurchases = document.getElementById('free-purchases').checked;
    disposeLevel();
    campaign = MB.createCampaign();
    Meta.configureNewCampaign(meta, campaign, spec.mode, spec.levelIndex || 0, spec.payload || null, chosen);
    campaign.freePurchases = freePurchases;
    world = MB.startLevel(campaign);
    applyBoosters(boosters || []);
    liveKey = key;
    Meta.saveSite(meta, key, campaign, world, { status: 'play', awaySince: null, awayBank: 0, reward: null });
    Meta.setActiveSite(meta, key);
    journalNote('start', journalRun(campaign));
    timeScale = 1;
    paintTempo();
    cityBuilding = null;
    document.body.classList.add('playing');
    openScreen('build', { silent: true });
    buildLevelView();
    introSiteCamera();
    showBanner();
    paintHud();
    syncCity();
    return true;
  }

  // ---------- presence: away and return ----------
  function siteLabel(runMode) {
    if (runMode === 'hq') return 'Стройка штаба';
    if (runMode === 'school') return 'Испытание школы';
    if (runMode === 'contract') return 'Контракт';
    if (runMode === 'exchange') return 'Заказ биржи';
    return 'Основная стройка';
  }

  function siteKicker(runMode, levelIndex, contractNumber) {
    if (runMode === 'hq') return 'Стройка штаба';
    if (runMode === 'exchange') return 'Заказ биржи';
    if (runMode === 'school') return 'Школа бригадиров';
    if (runMode === 'contract') return 'Контракт ' + (contractNumber || meta.contract.index + 1);
    return 'Заказ ' + (levelIndex + 1);
  }

  function percentOf(done, total) {
    return total > 0 ? Math.floor(done / total * 100) : 0;
  }

  function sideBusy() {
    const side = Meta.site(meta, 'side');
    return !!side && side.status === 'play';
  }

  // The speed row in the day clock's popover and the «×5» / «⏸» tag on the clock itself.
  function paintTempo() {
    document.querySelectorAll('.tempo button[data-tempo]').forEach(function (button) {
      button.classList.toggle('on', Number(button.dataset.tempo) === timeScale);
    });
    const tag = document.getElementById('day-tempo');
    tag.hidden = timeScale === 1;
    tag.classList.toggle('paused', timeScale === 0);
    tag.innerHTML = timeScale === 0 ? ICONS.pause : '×' + timeScale;
  }

  function simSummary(level) {
    let summary = simSummaries.get(level);
    if (!summary) {
      summary = MicroBuildersSim.summarizeLevel(level);
      simSummaries.set(level, summary);
    }
    return summary;
  }

  // Rebuild a site from its snapshot without a view (MB.startLevel only). A finished site comes back
  // finished, so it can never complete (and pay) a second time.
  function restoreSiteWorld(snap) {
    const c = MB.createCampaign();
    Meta.restoreCampaign(meta, c, snap);
    c.freePurchases = document.getElementById('free-purchases').checked;
    const w = MB.startLevel(c);
    Meta.applySiteRuntime(c, w, snap);
    const paid = c.runMode === 'campaign' && meta.completed.indexOf(c.levelIndex) >= 0;
    if (snap.status === 'complete' || (w.remaining === 0 && paid)) {
      c.status = 'complete';
      w.completed = true;
    }
    w.events.length = 0;
    return { campaign: c, world: w };
  }

  // Swap the world on screen for a restored one (the view is rebuilt from scratch).
  function adoptSite(key, restored) {
    const same = liveKey === key && !!world;
    const view = same && cameraController.getView ? cameraController.getView() : null;
    // The snapshot keeps the time ledger (to 0,1 s); the same site rebuilt keeps its own exact one and
    // the dev categories «По прокачкам».
    if (same) {
      restored.world.timeLedger = world.timeLedger;
      restored.world.timeCategories = world.timeCategories;
    }
    disposeLevel();
    campaign = restored.campaign;
    world = restored.world;
    liveKey = key;
    buildLevelView();
    // The same site rebuilt by a catch-up keeps the view; another site gets the view the player left
    // there, or flies in. In the HQ the city camera stays (hideCity restores the site view later).
    if (cityRoot.visible) return;
    if (view) cameraController.setView(view);
    else if (!restoreSiteCamera()) introSiteCamera();
  }

  // What a site does without the player: the session simulator's mass rate × «Удалённый контроль»
  // for the absence (at most offlineCapHours), placed as whole cubes in build order. A contract's
  // clock runs on real time, so it only builds within the time it had left.
  function catchUpWorld(key, c, w, seconds) {
    const capSeconds = Meta.offlineCapSeconds(meta);
    const efficiency = Meta.offlineEfficiency(meta);
    const contract = timedMode(c.runMode);
    const limit = contract ? trialLimit(c) : 0;
    let work = Math.min(seconds, capSeconds);
    if (contract) work = Math.min(work, Math.max(0, limit - c.levelElapsed));
    const total = w.blocks.length;
    const before = total - w.remaining;
    const coinsBefore = c.coins;
    let built = [];
    let worked = 0;
    // The workers' share of the offline cubes (sim.js → builderShare): drones and machines give no experience.
    let workerShare = 0;
    if (work > 0 && w.remaining > 0 && c.status === 'play') {
      // Needs, night and weather over the session so far plus the time away: hours of offline work
      // reach the steady state of the needs, not the warm-up of a fresh short build (sim.js → warmUp).
      const estimate = MicroBuildersSim.estimate(simSummary(w.level), Object.assign({}, c, { environmentSeconds: (c.levelElapsed || 0) + work }));
      const rate = estimate.massPerMinute / 60 * efficiency;
      workerShare = estimate.builderShare || 0;
      built = MB.applyOfflineMass(w, rate * work);
      worked = work;
      if (w.completed && rate > 0) {
        // Finished early: only the time the last cubes needed counts toward the order's time.
        let mass = 0;
        for (let i = 0; i < built.length; i++) mass += MB.MATERIAL[built[i].materialId].weight;
        worked = Math.min(work, mass / rate);
      }
    }
    // Capital: the cubes' own pay plus the office find rolls. The 'autofill' event carries the same
    // capital, so the events are dropped here (consumeEvents would count it a second time).
    let capital = 0;
    for (let i = 0; i < built.length; i++) capital += built[i].capitalPay || 0;
    meta.capital += capital;
    capital += Meta.onBlocksPlaced(meta, c, w, built, { offline: true }).capital;
    // «Учебный центр»: offline cubes — 1 experience a whole cube of the workers' share, to the workers
    // (evenly) and to the centre.
    MB.shareWorkerXp(w, built, workerShare);
    Meta.addTrainingXp(meta, built.length * workerShare);
    w.events.length = 0;
    const after = total - w.remaining;
    let elapsed = 0;
    if (contract) {
      elapsed = w.completed ? worked : seconds;
      c.levelElapsed += elapsed;
      c.totalElapsed += elapsed;
    } else if (built.length > 0) {
      c.awayElapsed = (c.awayElapsed || 0) + worked;
    }
    const chests = [];
    if (c.runMode === 'campaign' && Meta.chestsOpen(c.levelIndex) && !w.completed) {
      [25, 50].forEach(function (threshold) {
        if (before * 100 < total * threshold && after * 100 >= total * threshold) chests.push(threshold);
      });
    }
    return {
      key: key,
      runMode: c.runMode,
      name: Meta.siteName(c.runMode, c.levelIndex, c.runPayload),
      seconds: seconds,
      capped: !contract && seconds > capSeconds,
      before: before,
      after: after,
      total: total,
      blocks: built.length,
      coins: Math.max(0, c.coins - coinsBefore),
      capital: capital,
      elapsed: elapsed,
      completed: !!w.completed,
      failed: contract && !w.completed && c.levelElapsed >= limit,
      timeLeft: contract ? Math.max(0, limit - c.levelElapsed) : 0,
      chests: chests,
    };
  }

  // Bring every running site up to now and show the active one. opts:
  //   seconds  — length of the absence (the return window title), company — Meta.claimAway result;
  //   stay     — keep the current screen (the page came back while the player was in the HQ);
  //   toHq / building — land in the HQ (the active site stays «без игрока»).
  // Short gaps are never lost: a site off screen keeps its away mark until a catch-up actually builds
  // something, and the site on screen banks its short absences (awayBank) until they add up.
  function enterSites(opts) {
    const options = opts || {};
    const now = Date.now();
    const activeKey = Meta.activeSite(meta);
    const report = { seconds: options.seconds || 0, sites: [], company: options.company || null, completions: [], failed: null };
    let activeCatchUp = null;
    let activeBank = 0;
    SITE_KEYS.forEach(function (slot) {
      const snap = Meta.site(meta, slot);
      if (!snap || snap.status !== 'play') return;
      const active = slot === activeKey;
      const contract = timedMode(snap.runMode);
      const away = snap.awaySince ? Math.max(0, (now - snap.awaySince) / 1000) : (slot === liveKey && world ? 0 : Math.max(0, (now - snap.savedAt) / 1000));
      const seconds = (contract ? 0 : snap.awayBank || 0) + away;
      // Rebuilding the site on screen restarts its workers: only a real absence is worth it there.
      const onScreen = slot === liveKey && !!world && campaign.status === 'play';
      const threshold = snap.runMode === 'school' ? 0 : !active ? INACTIVE_CATCH_UP_SECONDS : (onScreen && !contract ? ACTIVE_CATCH_UP_SECONDS : 1);
      if (active) activeBank = contract ? 0 : Math.min(seconds, Meta.offlineCapSeconds(meta));
      if (seconds < threshold) return;
      const restored = restoreSiteWorld(snap);
      const result = catchUpWorld(slot, restored.campaign, restored.world, seconds);
      if (active) activeCatchUp = { restored: restored, result: result };
      if (result.completed) {
        report.completions.push(settleCompletion(slot, restored.campaign, restored.world, true));
      } else if (!result.failed && (result.blocks > 0 || result.elapsed > 0)) {
        Meta.saveSite(meta, slot, restored.campaign, restored.world, { awaySince: now, awayBank: 0 });
      }
      if (active && result.blocks > 0) activeBank = 0;
      if (result.blocks > 0 || result.completed || result.failed) report.sites.push(result);
      if (result.failed) {
        report.failed = result;
        journalNote('fail', Object.assign(journalRun(restored.campaign), { sim: Math.round(restored.campaign.levelElapsed), offline: true }));
      }
    });
    let toHq = !!options.toHq;
    if (report.failed) {
      // Time ran out while the player was away: the contract is gone, the player lands in the HQ.
      if (report.failed.runMode === 'school') Meta.failSchoolTrial(meta);
      else Meta.failContract(meta);
      if (liveKey === 'side') liveKey = null;
      toHq = true;
    }
    const key = Meta.activeSite(meta);
    const snap = Meta.site(meta, key);
    if (!snap) {
      // Nothing left to show (no main order yet): the next story order.
      requestRun({ mode: 'campaign', levelIndex: meta.campaignLevel, reason: 'next' });
    } else if (activeCatchUp && activeCatchUp.result.key === key &&
        (activeCatchUp.result.blocks > 0 || activeCatchUp.result.completed || liveKey !== key || !world)) {
      adoptSite(key, activeCatchUp.restored);
    } else if (liveKey !== key || !world) {
      adoptSite(key, restoreSiteWorld(snap));
    } else if (activeCatchUp && activeCatchUp.result.elapsed > 0) {
      // Nothing was built, but the contract clock ran on.
      campaign.levelElapsed = activeCatchUp.restored.campaign.levelElapsed;
      campaign.totalElapsed = activeCatchUp.restored.campaign.totalElapsed;
    }
    // A different site may have trained a collection passive after this site's restore.
    if (campaign && campaign.crew) Meta.applyLive(meta, campaign);
    document.body.classList.add('playing');
    // Back on the site: the absence is over; what it did not turn into cubes yet stays in the bank.
    if (snap && !toHq && !options.stay && campaign.status === 'play') saveLive({ awaySince: null, awayBank: key === activeKey ? activeBank : 0 });
    if (toHq) {
      cityBuilding = options.building || null;
      openScreen('hq', { silent: true });
    } else if (!options.stay) {
      openScreen('build', { silent: true });
    } else {
      paintSiteChip();
    }
    paintHud();
    showReturnReport(report);
    if (report.failed) openContractFailed(true, report.failed.runMode);
    report.completions.forEach(function (reward) { openCompleteDialog(reward, { queue: true }); });
    return report;
  }

  // Put another existing site on screen (no briefing). The site that was on screen goes on without
  // the player; the target and the others catch up first. opts: toHq / building — land in the HQ.
  function switchSite(key, opts) {
    const options = opts || {};
    const snap = Meta.site(meta, key);
    if (!snap) {
      requestRun({ mode: 'campaign', levelIndex: meta.campaignLevel, reason: 'next' });
      return;
    }
    if (key === liveKey && world) {
      if (options.toHq) {
        cityBuilding = options.building || null;
        openScreen('hq');
      } else {
        openScreen('build');
      }
      return;
    }
    if (contractLocked()) return;
    if (liveKey && world && campaign.status === 'play') {
      const prev = Meta.site(meta, liveKey);
      saveLive({ awaySince: prev && prev.awaySince ? prev.awaySince : Date.now() });
    }
    liveKey = null;
    timeScale = 1;
    paintTempo();
    Meta.setActiveSite(meta, key);
    const seconds = snap.status === 'play' ? Math.max(0, (Date.now() - (snap.awaySince || snap.savedAt)) / 1000) : 0;
    enterSites({ seconds: seconds, company: Meta.claimAway(meta, snap.awaySince || Date.now(), false), toHq: options.toHq, building: options.building });
  }

  // The player turned to another screen: the live site goes on «без игрока» from now on.
  function leaveSite() {
    if (timeScale !== 1) {
      timeScale = 1;
      paintTempo();
    }
    if (!liveKey || !world || campaign.status !== 'play') return;
    saveLive({ awaySince: Date.now() });
    const efficiency = Math.round(Meta.offlineEfficiency(meta) * 100);
    UI.toast({
      title: '«' + Meta.siteName(campaign.runMode, campaign.levelIndex, campaign.runPayload) + '» строится без вас',
      text: '· ' + efficiency + '% скорости',
      icon: 'clock',
      key: 'away-leave',
    });
  }

  // Back on the build screen from the HQ or a panel.
  function returnToSite() {
    const key = Meta.activeSite(meta);
    const snap = Meta.site(meta, key);
    if (!snap || !world || campaign.status === 'title') return;
    const since = snap.status === 'play' && snap.awaySince ? snap.awaySince : 0;
    const company = Meta.claimAway(meta, since || Date.now(), false);
    enterSites({ seconds: since ? (Date.now() - since) / 1000 : 0, company: company });
  }

  // The page goes to the background or away (tab switch, app switch, close): the absence starts now.
  function markAbsent() {
    if (!meta) return;
    if (!hiddenAt) hiddenAt = Date.now();
    if (!meta.hiddenAt) meta.hiddenAt = hiddenAt;
    if (currentScreen === 'build' && liveKey && world && campaign.status === 'play') {
      const snap = Meta.site(meta, liveKey);
      saveLive({ awaySince: snap && snap.awaySince ? snap.awaySince : hiddenAt });
    } else {
      Meta.save(meta);
    }
  }

  // The page is back. After a real absence (30+ s) everything catches up like a cold start; a
  // contract's clock always catches up, it runs on real time.
  function onPageVisible() {
    if (!meta || !hiddenAt) return;
    const since = meta.hiddenAt || hiddenAt;
    const seconds = Math.max(0, (Date.now() - since) / 1000);
    hiddenAt = 0;
    if (!liveKey || !campaign || campaign.status === 'title') {
      meta.hiddenAt = null;
      Meta.save(meta);
      return;
    }
    const company = Meta.claimAway(meta, since, true);
    if (seconds < RESUME_CATCH_UP_SECONDS && !contractRunning()) {
      // A short background trip: the site stays as it is, the time goes to its bank.
      if (currentScreen === 'build' && campaign.status === 'play') bankLiveAbsence();
      return;
    }
    enterSites({ seconds: seconds, company: company, stay: currentScreen !== 'build' });
  }

  // The site on screen is looked at again without a catch-up: its absence goes to the bank.
  function bankLiveAbsence() {
    const snap = Meta.site(meta, liveKey);
    if (!snap) return;
    const away = snap.awaySince ? Math.max(0, (Date.now() - snap.awaySince) / 1000) : 0;
    saveLive({ awaySince: null, awayBank: Math.min((snap.awayBank || 0) + away, Meta.offlineCapSeconds(meta)) });
  }

  // Dev: pretend the page spent `seconds` in the background, then bring it back.
  function simulateAway(seconds) {
    markAbsent();
    const shift = seconds * 1000;
    hiddenAt -= shift;
    meta.hiddenAt = hiddenAt;
    SITE_KEYS.forEach(function (key) {
      const snap = Meta.site(meta, key);
      if (!snap) return;
      if (snap.awaySince) snap.awaySince -= shift;
      snap.savedAt -= shift;
    });
    Meta.save(meta);
    onPageVisible();
  }

  // ---------- return window ----------
  function returnRow(icon, html, extraClass) {
    return '<li' + (extraClass ? ' class="' + extraClass + '"' : '') + '>' + icon + '<span>' + html + '</span></li>';
  }

  function countUp(value, suffix, compact) {
    return '<span data-count="' + value + '"' + (compact ? ' data-compact="1"' : '') + ' data-suffix="' + UI.escapeHtml(suffix) + '">+0' + UI.escapeHtml(suffix) + '</span>';
  }

  function returnSiteCard(result) {
    const from = percentOf(result.before, result.total);
    const to = result.completed ? 100 : percentOf(result.after, result.total);
    const rows = [];
    // A failed contract's cubes and coins are gone with it; only capital finds stay with the company.
    if (result.blocks > 0 && !result.failed) rows.push(returnRow(ICONS.build, countUp(result.blocks, ' ' + UI.plural(result.blocks, 'куб', 'куба', 'кубов'))));
    if (result.coins > 0 && !result.failed) rows.push(returnRow('<img src="icons/icon-coins.jpg?v=2" alt="">', countUp(Math.round(result.coins), ' монет', true)));
    if (result.capital > 0) rows.push(returnRow('<img src="icons/icon-capital.jpg?v=2" alt="">', countUp(result.capital, ' капитала', true)));
    result.chests.forEach(function (threshold) {
      rows.push(returnRow('<img src="icons/icon-chest-' + threshold + '.jpg" alt="">', 'Сундук ' + threshold + '% готов'));
    });
    if (result.completed) rows.push(returnRow(ICONS.hq, 'Объект достроен — награда ждёт', 'note'));
    else if (result.failed) rows.push(returnRow(ICONS.clock, result.runMode === 'school' ? 'Время вышло — испытание проиграно' : 'Время вышло — контракт провален', 'bad'));
    else if (timedMode(result.runMode)) rows.push(returnRow(ICONS.clock, 'Осталось ' + MB.formatClock(result.timeLeft)));
    return '<article class="return-site"><p class="kicker">' + siteLabel(result.runMode) + '</p><h3>' + UI.escapeHtml(result.name) + '</h3>' +
      '<div class="return-bar"><i class="gain" style="width:' + from + '%" data-to="' + to + '"></i><i class="was" style="width:' + from + '%"></i></div>' +
      '<div class="return-pct"><span>' + from + '% → <b>' + to + '%</b></span></div>' +
      '<ul class="return-rows">' + rows.join('') + '</ul></article>';
  }

  function companyRows(company) {
    if (!company) return [];
    const rows = [];
    if (company.recruitsNew > 0) rows.push(returnRow(ICONS.foremen, 'Кандидаты в школе: ' + company.recruits));
    if (company.ordersNew > 0) {
      rows.push(returnRow(ICONS.exchange, 'Биржа: +' + company.ordersNew + ' ' + UI.plural(company.ordersNew, 'заказ', 'заказа', 'заказов')));
    }
    if (company.contractReady) rows.push(returnRow(ICONS.contract, 'Контракт снова доступен'));
    return rows;
  }

  // «С возвращением!» (docs/gdd/16-ux-flow.md §3) after a minute or more away, or when a site
  // finished or failed; a shorter absence that built something gets a toast.
  function showReturnReport(report) {
    const rows = companyRows(report.company);
    const blocks = report.sites.reduce(function (sum, item) { return sum + item.blocks; }, 0);
    const big = report.seconds >= RETURN_DIALOG_SECONDS || report.completions.length > 0 || !!report.failed;
    if (big && (report.sites.length > 0 || rows.length > 0)) {
      openReturnDialog(report, rows);
      return;
    }
    if (blocks > 0) {
      UI.toast({ title: 'Без вас:', text: '+' + blocks + ' ' + UI.plural(blocks, 'куб', 'куба', 'кубов'), icon: 'build', tone: 'good', key: 'away-gain' });
    }
  }

  function openReturnDialog(report, rows) {
    const efficiency = Math.round(Meta.offlineEfficiency(meta) * 100);
    const hours = Math.round(Meta.offlineCapSeconds(meta) / 3600);
    const capped = report.sites.some(function (item) { return item.capped; });
    const body = (report.sites.length ? '<div class="return-sites">' + report.sites.map(returnSiteCard).join('') + '</div>' : '') +
      (rows.length ? '<section class="return-company"><h4>Компания</h4><ul class="return-rows">' + rows.join('') + '</ul></section>' : '') +
      '<p class="return-note' + (capped ? ' capped' : '') + '">' + (capped
        ? 'Лимит ' + hours + ' ч исчерпан — прокачайте «Удалённый контроль»'
        : 'Без вас бригада работает на ' + efficiency + '% скорости. Лимит — ' + hours + ' ч за отлучку.') + '</p>';
    UI.overlay.open({
      id: 'return',
      kicker: 'С возвращением!',
      title: 'Вас не было ' + UI.formatDuration(report.seconds),
      body: body,
      actions: [{ label: 'Продолжить', primary: true, onClick: ensureAudio }],
      onOpen: function (handle) { animateReturn(handle.body); },
    });
  }

  // Bars grow from «before» to «after» and the numbers run up.
  function animateReturn(root) {
    setTimeout(function () {
      root.querySelectorAll('.return-bar .gain').forEach(function (bar) { bar.style.width = bar.dataset.to + '%'; });
    }, 80);
    const counters = root.querySelectorAll('[data-count]');
    if (counters.length === 0) return;
    const started = performance.now();
    function step(now) {
      const t = Math.min(1, (now - started) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      counters.forEach(function (el) {
        const value = Number(el.dataset.count) * eased;
        el.textContent = '+' + (el.dataset.compact ? formatCompact(value) : Math.round(value).toLocaleString('ru-RU')) + el.dataset.suffix;
      });
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- contract failure, campaign end ----------
  function failLiveContract() {
    UI.overlay.close('blocked');
    const mode = campaign.runMode;
    journalNote('fail', Object.assign(journalRun(campaign), { sim: Math.round(campaign.levelElapsed) }));
    if (mode === 'school') Meta.failSchoolTrial(meta);
    else Meta.failContract(meta);
    campaign.status = 'failed';
    liveKey = null;
    openContractFailed(false, mode);
  }

  function openContractFailed(away, mode) {
    const school = mode === 'school';
    const toMain = { label: 'Вернуться на основную стройку', primary: true, onClick: function () { switchSite(Meta.activeSite(meta)); } };
    const toHq = { label: 'В штаб', onClick: function () { switchSite(Meta.activeSite(meta), { toHq: true }); } };
    UI.overlay.open({
      id: 'contract-failed',
      queue: !!away,
      closable: !!away,
      kicker: school ? 'Школа бригадиров' : 'Контракт ' + (meta.contract.index + 1),
      title: school ? 'Испытание проиграно' : 'Контракт провален',
      body: school ? '<p>Время вышло. Попытка потрачена; полученный опыт сохраняется.</p>' : away
        ? '<p>Время вышло, пока вас не было. Перезарядка 5 мин.</p>'
        : '<p>Время вышло. Перезарядка 5 мин. Прогресс этой стройки пропал.</p>',
      actions: school ? [{ label: 'Вернуться в школу', primary: true, onClick: function () { switchSite(Meta.activeSite(meta), { toHq: true }); openScreen('recruiting', { silent: true }); } }] : away ? [{ label: 'Понятно', primary: true }] : [toMain, toHq],
    });
  }

  function applyGhostVisibility() {
    for (let i = 0; i < ghostMeshes.length; i++) ghostMeshes[i].visible = ghostsOn;
    ghostTier = NaN; // призраки дверей и окон тоже следуют переключателю
    refreshGhosts();
  }

  function openSummary() {
    UI.overlay.open({
      id: 'summary',
      kicker: 'Кампания',
      title: 'Кампания завершена',
      body: '<p>Все ' + MB.LEVELS.length + ' объектов сданы. Штаб, биржа и контракты остаются доступны.</p>',
      actions: [{ label: 'В штаб', primary: true, onClick: function () { openScreen('hq'); } }],
    });
  }

  // Frees what an object tree holds on the GPU: geometries, materials and the canvas textures painted
  // for it (mine labels, camp name boards…). Textures of shared caches carry userData.shared and stay;
  // a freed canvas texture that is drawn again is simply uploaded again by three.js.
  function disposeObject(root, freed) {
    const done = freed || new Set();
    root.traverse(function (object) {
      if (object.geometry && !done.has(object.geometry)) {
        done.add(object.geometry);
        object.geometry.dispose();
      }
      const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      for (let i = 0; i < materials.length; i++) {
        const material = materials[i];
        if (done.has(material)) continue;
        done.add(material);
        disposeCanvasTextures(material, done);
        material.dispose();
      }
    });
  }

  function disposeCanvasTextures(material, done) {
    const free = function (texture) {
      if (!texture || !texture.isCanvasTexture || texture.userData.shared || done.has(texture)) return;
      done.add(texture);
      texture.dispose();
    };
    Object.keys(material).forEach(function (key) { free(material[key]); });
    if (material.uniforms) Object.keys(material.uniforms).forEach(function (key) { free(material.uniforms[key] && material.uniforms[key].value); });
  }

  function disposeLevel() {
    if (cameraController.isWorkerView()) cameraController.setWorkerView(false);
    // A new site: no worker focus, no see-through cubes (their meshes go with levelRoot below).
    cameraController.clearTrack(true);
    xray.hidden.clear();
    selectedBuilder = null;
    workerPlanSignature = '';
    updateWorkerViewButton();
    clearWorkerPlan();
    clearWorkerViews();
    stickViews.clear();
    vehicleViews.clear();
    planningDesks.clear();
    blockViews.clear();
    pourViews.clear();
    cubeCoins.clear();
    pops.length = 0;
    solidMeshes = [];
    ghostMaterials = [];
    ghostMeshes = [];
    ghostGlass = null;
    ghostBlocks = [];
    ghostKinds = new Uint8Array(0);
    fx.clear();
    fxTier = -1;
    if (glintT >= 0 && world) Blocks.glint(-1, world.level.footprint);
    glintT = -1;
    Features.reset(featureState);
    scaffoldLookup = new Map();
    scaffoldCrackLookup = new Map();
    scaffoldTapeLookup = new Map();
    scaffoldPieceById = new Map();
    scaffoldMeshes = [];
    scaffoldDirty.clear();
    const freed = new Set();
    for (let i = levelRoot.children.length - 1; i >= 0; i--) {
      const child = levelRoot.children[i];
      disposeObject(child, freed);
      levelRoot.remove(child);
    }
    yardRoot = null;
    elevatorRoot = null;
    taxiView = null;
    campViews = {};
    const signs = document.getElementById('site-signs');
    if (signs) signs.innerHTML = '';
  }

  function resize() {
    MicroBuildersStage.fit();
    renderer.setPixelRatio(renderPixelRatio());
    cameraController.resize(MicroBuildersStage.width(), MicroBuildersStage.height());
    renderer.setSize(MicroBuildersStage.width(), MicroBuildersStage.height());
    // The layout of the HUD changes with the screen shape: new band, zoom range, fog and shadows.
    if (cityRoot.visible) cameraController.setMode('city', cityCameraBounds());
    refreshSafeArea({ snap: true });
    applySceneLighting();
    placeCitySigns();
  }

  function grassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    // Тот же тон сухой травы, что по краям земли в art/quarry.js, чтобы не было шва: солома, олива, редкая зелень.
    context.fillStyle = '#9a9a62';
    context.fillRect(0, 0, 256, 256);
    // Soft lighter and darker blotches first (wrapped so the tile stays seamless), then blades.
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 30 + Math.random() * 50;
      const tint = i % 2 === 0 ? 'rgba(176, 164, 108, 0.35)' : 'rgba(110, 120, 66, 0.3)';
      for (let ox = -256; ox <= 256; ox += 256) {
        for (let oy = -256; oy <= 256; oy += 256) {
          const g = context.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, tint);
          g.addColorStop(1, 'rgba(0, 0, 0, 0)');
          context.fillStyle = g;
          context.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }
    const blades = ['164,154,98', '120,128,74', '182,166,112', '132,112,78', '104,116,64'];
    for (let i = 0; i < 1400; i++) {
      context.fillStyle = 'rgba(' + blades[i % blades.length] + ',0.55)';
      context.fillRect(Math.random() * 255, Math.random() * 254, 1 + Math.random(), 2 + Math.random() * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18, 18);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(28, 22, 16, 0.78)';
    roundRect(context, 8, 8, 240, 48, 16);
    context.fill();
    context.fillStyle = '#f6efe4';
    context.font = '700 28px Manrope, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 34);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
    sprite.center.set(0.5, 0);
    sprite.scale.set(2.15, 0.54, 1);
    return sprite;
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function formatSeconds(value) {
    return value.toFixed(1).replace('.', ',') + ' с';
  }

  function formatSpeed(value) {
    return value.toFixed(1).replace('.', ',') + ' м/с';
  }

  function formatPercent(value) {
    return (value * 100).toFixed(1).replace('.', ',') + '%';
  }

  function ensureAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }

  // ---------- background music: a soft generative loop, no files ----------
  // 84 BPM in eighths, four bars Cmaj7 – Am7 – Fmaj7 – G6: a pad per bar, bass on 1 and 3, a plucked
  // arpeggio that drops a few notes by a fixed pattern (so loops differ a little), a quiet shaker on
  // the off-beats and a soft kick on the bar. Scheduled ahead on the audio clock.
  function startMusic() {
    if (music || !audioCtx) return;
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    gain.connect(audioCtx.destination);
    const length = Math.floor(audioCtx.sampleRate * 0.06);
    const noise = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    music = { gain: gain, step: 0, next: audioCtx.currentTime + 0.1, noise: noise, timer: 0 };
    music.timer = setInterval(scheduleMusic, 100);
    setMusicVolume();
  }

  function setMusicVolume() {
    if (!music) return;
    music.gain.gain.setTargetAtTime(soundOn ? 1 : 0, audioCtx.currentTime, 0.4);
  }

  function midiFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function musicNote(type, note, at, length, level, attack) {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = midiFreq(note);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(level, at + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(env);
    env.connect(music.gain);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }

  function scheduleMusic() {
    if (!music || audioCtx.state !== 'running') return;
    const CHORDS = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 64]];
    const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
    const eighth = 60 / 84 / 2;
    while (music.next < audioCtx.currentTime + 0.3) {
      const at = music.next;
      const step = music.step;
      const beat = step % 8;
      const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
      if (beat === 0) {
        for (let i = 1; i < 4; i++) musicNote('sine', chord[i], at, eighth * 9, 0.035, 0.6);
        musicNote('sine', chord[0] - 12, at, eighth * 3, 0.05, 0.02);
        // soft kick
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        osc.frequency.setValueAtTime(110, at);
        osc.frequency.exponentialRampToValueAtTime(45, at + 0.18);
        env.gain.setValueAtTime(0.07, at);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
        osc.connect(env);
        env.connect(music.gain);
        osc.start(at);
        osc.stop(at + 0.25);
      }
      if (beat === 4) musicNote('triangle', chord[0] - 12, at, eighth * 3, 0.045, 0.02);
      // The arpeggio skips a note now and then by a fixed 37-step pattern: loops vary, never repeat exactly.
      if ((step * 7 + 3) % 37 > 8) musicNote('triangle', chord[ARP[beat]] + 12, at, eighth * 1.8, 0.022, 0.01);
      if (beat % 2 === 1) {
        const hat = audioCtx.createBufferSource();
        const filter = audioCtx.createBiquadFilter();
        const env = audioCtx.createGain();
        hat.buffer = music.noise;
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        env.gain.value = 0.018;
        hat.connect(filter);
        filter.connect(env);
        env.connect(music.gain);
        hat.start(at);
      }
      music.step += 1;
      music.next += eighth;
    }
  }

  // Шина эффектов и фон заводятся при первом звуке после жеста (audioCtx создаёт ensureAudio).
  function sfxInit() {
    if (sfxBus || !audioCtx) return;
    sfxBus = audioCtx.createGain();
    sfxBus.gain.value = 0.25; // умеренно: пик укладки ≈ 0,08 на выходе, tone() — 0,035
    sfxBus.connect(audioCtx.destination);
    // Белый шум 0,3 с — основа глухих ударов и шуршания.
    sfxNoise = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.3), audioCtx.sampleRate);
    const data = sfxNoise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // Гул техники: две пилы с биением через lowpass, громкость 0 — её ведёт updateAudio.
    humGain = audioCtx.createGain();
    humGain.gain.value = 0;
    const humFilter = audioCtx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 170;
    humOsc = audioCtx.createOscillator();
    humOsc2 = audioCtx.createOscillator();
    humOsc.type = humOsc2.type = 'sawtooth';
    humOsc.frequency.value = 48;
    humOsc2.frequency.value = 50;
    humOsc.connect(humFilter);
    humOsc2.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(sfxBus);
    humOsc.start();
    humOsc2.start();
    // Ветер: петля шума 2 с через широкий bandpass.
    const wind = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const windData = wind.getChannelData(0);
    for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;
    const windSource = audioCtx.createBufferSource();
    windSource.buffer = wind;
    windSource.loop = true;
    windFilter = audioCtx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 450;
    windFilter.Q.value = 0.7;
    windGain = audioCtx.createGain();
    windGain.gain.value = 0;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(sfxBus);
    windSource.start();
  }

  // Фон раз в 0,1 с: гул техники — сумма 1/(1+(d/12)²) по машинам от камеры, на ходу громче и выше; ветер — медленные
  // порывы, сильнее в дождь и шторм. Гул молчит на паузе, на ×5 и выше и вне стройки.
  function updateAudio(dt) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    sfxInit();
    audioWait -= dt;
    if (audioWait > 0) return;
    audioWait = 0.1;
    humNear = 0;
    humMove = 0;
    const onSite = currentScreen === 'build' && !cityRoot.visible && !!campaign && campaign.status === 'play';
    if (soundOn && onSite && timeScale > 0 && timeScale < 5) vehicleViews.forEach(humSum);
    const now = audioCtx.currentTime;
    const t = clock.elapsedTime;
    const move = humNear > 0 ? humMove / humNear : 0;
    humGain.gain.setTargetAtTime(Math.min(1, humNear) * (0.35 + 0.65 * move) * 0.1, now, 0.3);
    humOsc.frequency.setTargetAtTime(44 + 14 * move, now, 0.4);
    humOsc2.frequency.setTargetAtTime(46 + 15 * move, now, 0.4);
    const w = skyView.weather;
    const gust = 0.6 + 0.4 * Math.sin(t * 0.23) * Math.sin(t * 0.071 + 1);
    const wind = soundOn && onSite ? (0.03 + 0.05 * (w ? Math.max(w.rain, w.storm, w.snow * 0.6) : 0)) * gust : 0;
    windGain.gain.setTargetAtTime(wind, now, 0.5);
    windFilter.frequency.setTargetAtTime(380 + 220 * gust, now, 0.5);
  }

  function humSum(group, vehicle) {
    const d = group.position.distanceTo(camera.position) / 12;
    const k = 1 / (1 + d * d);
    humNear += k;
    if (vehicle.from[0] !== vehicle.to[0] || vehicle.from[2] !== vehicle.to[2]) humMove += k;
  }

  // Стук металла: [звон, Гц; затухание, с; пик; обертон ×; пик обертона; форма звона; пик лязга].
  const SFX_METAL = {
    tin: [880, 0.14, 0.1, 2.4, 0.04, 'triangle', 0.08],
    copper: [587, 0.24, 0.11, 2, 0.04, 'triangle', 0.07],
    bronze: [523, 0.36, 0.1, 2.76, 0.05, 'sine', 0.06],
    silver: [1175, 0.32, 0.08, 2, 0.04, 'sine', 0.06],
    iron: [392, 0.18, 0.12, 2.9, 0.05, 'triangle', 0.1],
    gold: [880, 0.32, 0.1, 1.5, 0.05, 'sine', 0.04],
  };
  // Металл материала по виду его фактуры: медь, бронза и латунь, серебро и платина, железо и титан, золото, прочая сталь.
  const SFX_METAL_OF = {
    'ladder-copper': 'copper', 'ladder-bronze': 'bronze', 'ladder-brass': 'bronze', 'ladder-orichalcum': 'bronze',
    'ladder-silver': 'silver', 'ladder-silver-pure': 'silver', 'ladder-steel-mirror': 'silver',
    'ladder-iron': 'iron', 'ladder-steel-hard': 'iron', 'ladder-meteor-iron': 'iron', 'ladder-titanium': 'iron', 'ladder-osmium': 'iron',
    'ladder-gold': 'gold', 'ladder-sun-gold': 'gold',
  };

  // Синтез-звук без файлов: 'place:<класс>' (stone, metal, gold, glass, wood — MicroBuildersFx.kind), 'tier', 'complete'.
  // Одно имя не чаще своего промежутка; укладка на ×5 и выше — не чаще 8 в секунду.
  function sfx(name, materialId) {
    if (!soundOn || !audioCtx || audioCtx.state !== 'running') return;
    sfxInit();
    const cls = name.indexOf('place:') === 0 ? name.slice(6) : '';
    const key = cls ? 'place' : name;
    const now = audioCtx.currentTime;
    const since = sfxLast[key] === undefined ? 9 : now - sfxLast[key];
    const gap = key === 'place' ? (timeScale >= 5 ? 0.125 : 0.06) : key === 'complete' ? 1.5 : key === 'tier' ? 0.3 : 0.05;
    if (since < gap) return;
    sfxLast[key] = now;
    if (cls) {
      // Комбо: укладки чаще раза в 0,6 с поднимают тон на полутон, до +7.
      sfxCombo = since < 0.6 ? Math.min(7, sfxCombo + 1) : 0;
      const p = Math.pow(2, sfxCombo / 12);
      if (cls === 'stone') {
        voice('sine', 150 * p, 70 * p, 0, 0.14, 0.3);
        noise('lowpass', 900, 0, 0.08, 0.2);
      } else if (cls === 'wood') {
        voice('triangle', 330 * p, 240 * p, 0, 0.06, 0.22);
        noise('bandpass', 1800, 0, 0.04, 0.25);
      } else if (cls === 'glass') {
        voice('sine', 1568 * p, 1568 * p, 0, 0.3, 0.1);
        voice('sine', 2349 * p, 2349 * p, 0, 0.22, 0.05);
      } else {
        const m = SFX_METAL[SFX_METAL_OF[materialId] || (cls === 'gold' ? 'gold' : 'tin')];
        voice('sine', 140 * p, 90 * p, 0, 0.08, 0.15);
        voice(m[5], m[0] * p, m[0] * 0.97 * p, 0, m[1], m[2]);
        voice('sine', m[0] * m[3] * p, m[0] * m[3] * 0.98 * p, 0, m[1] * 0.6, m[4]);
        noise('highpass', 3000, 0, 0.025, m[6]);
      }
    } else if (name === 'tier') {
      voice('triangle', 523, 523, 0, 0.18, 0.2);
      voice('triangle', 784, 784, 0.09, 0.3, 0.2);
      noise('lowpass', 600, 0, 0.25, 0.2);
    } else if (name === 'complete') {
      const notes = [523, 659, 784, 1047];
      for (let i = 0; i < notes.length; i++) voice('triangle', notes[i], notes[i], i * 0.08, i === 3 ? 1.4 : 1, 0.15);
    }
  }

  // Один голос: осциллятор с частотой f0 → f1 за dur, пик peak, затухание; at — задержка, с.
  function voice(type, f0, f1, at, dur, peak) {
    const t = audioCtx.currentTime + at;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Шум через фильтр: lowpass — глухо, bandpass — сухо, highpass — звон.
  function noise(filter, freq, at, dur, peak) {
    const t = audioCtx.currentTime + at;
    const source = audioCtx.createBufferSource();
    source.buffer = sfxNoise;
    const biquad = audioCtx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.value = freq;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(biquad);
    biquad.connect(gain);
    gain.connect(sfxBus);
    source.start(t);
    source.stop(t + dur + 0.02);
  }

  function tone(freq, duration) {
    if (!soundOn || !audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  }
})();
