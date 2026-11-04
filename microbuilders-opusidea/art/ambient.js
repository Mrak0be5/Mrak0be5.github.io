// Жизнь карьера: пылевые вихри, облачка пыли из-под ботинок, тающие следы ботинок и шин, редкие камешки с террас.
// Всё — пулы: один Points на всю пыль, один InstancedMesh на следы, один на камешки (3 draw call).
// Только читает позы рабочих и машин (pose из game.js) и ничего не меняет в симуляции; на ×5 и выше выключено.
// env — погода и время суток стройки из game.js: wet — мокрая земля, dust — жара, night — ночь (0…1).
(function () {
  const DEVIL_N = 28; // частиц в вихре: 6 — юбка у земли, остальные — воронка
  const SKIRT = 6;
  const DEVILS = 2;
  const PUFFS = 96;
  const POINTS = DEVILS * DEVIL_N + PUFFS;
  const DECALS = 640;
  const PEBBLES = 3;
  const DEVIL_LIFE = 18; // с: проползти по площадке, потом пауза
  const STRIDE = 0.3; // шаг рабочего по земле, клетки: следы под рост фигурки, мельче тонули в зерне земли на дальнем зуме
  const TREAD = 0.3; // шаг отпечатка шины
  const WHEEL_X = 0.425; // полуколея погрузчика: колёса ±0.5 × SCALE 0.85 (art/vehicles.js)
  const ROCK = [0x8d8579, 0x9a9184, 0xa59c8e, 0x7f786e];
  const TIME = { value: 0 };
  const dummy = new THREE.Object3D();
  const pose = [0, 0, 0];
  const bufferSize = new THREE.Vector2();
  const probe = new THREE.Vector3();
  let puffTexture = null;
  let decalTexture = null;
  let S = null;

  // Клуб пыли: несколько мягких пятен внутри круга — рыхлый край вместо ровного диска.
  function puffMap() {
    if (puffTexture) return puffTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 14; i++) {
      const a = i * 2.399;
      const r = i ? 16 + (i % 4) * 6 : 0;
      const x = 64 + Math.cos(a) * r;
      const y = 64 + Math.sin(a) * r;
      const s = i ? 24 + (i % 3) * 7 : 44;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, 'rgba(255,255,255,' + (i ? 0.28 : 0.58) + ')');
      g.addColorStop(0.55, 'rgba(255,255,255,' + (i ? 0.14 : 0.28) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    puffTexture = new THREE.CanvasTexture(canvas);
    return puffTexture;
  }

  // Атлас следов 256×256: слева отпечаток рабочего ботинка с каблуком и протектором, справа отрезок шины погрузчика.
  function decalMap() {
    if (decalTexture) return decalTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(2, 2);
    // Мягкая вдавленная кромка вокруг следа ботинка
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    ctx.ellipse(32, 39, 21, 34, 0, 0, Math.PI * 2);
    ctx.ellipse(32, 103, 18, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    // Передняя часть подошвы и каблук
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(32, 38, 18.5, 31, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(17, 86, 30, 33, [4, 4, 14, 14]);
    ctx.fill();
    // Протектор подошвы: поперечные канавки, центральный желоб и боковые зубья
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    for (let y = 14; y < 66; y += 8) {
      ctx.fillRect(10, y, 18, 2.6);
      ctx.fillRect(36, y, 18, 2.6);
    }
    ctx.fillRect(30.5, 16, 3, 46);
    for (let y = 92; y < 114; y += 7) {
      ctx.fillRect(14, y, 36, 2.6);
    }
    ctx.globalCompositeOperation = 'source-over';
    // Колея шины: подложка, центральное ребро и грунтозацепы «ёлочкой»
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillRect(68, 0, 56, 128);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(94, 0, 4, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    for (let y = -10; y < 138; y += 14) {
      ctx.beginPath();
      ctx.moveTo(71, y);
      ctx.lineTo(92, y + 8);
      ctx.moveTo(121, y + 3);
      ctx.lineTo(100, y + 11);
      ctx.stroke();
    }
    // Концы отрезка мягкие: соседние отрезки перекрываются без тёмного шва.
    ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.16, 'rgba(0,0,0,1)');
    g.addColorStop(0.84, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(64, 0, 64, 128);
    ctx.restore();
    decalTexture = new THREE.CanvasTexture(canvas);
    decalTexture.anisotropy = 4;
    return decalTexture;
  }

  function dustMaterial() {
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 1 }, uColor: { value: new THREE.Color() } }]);
    uniforms.uMap = { value: puffMap() };
    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      fog: true,
      vertexShader: [
        'attribute float aSize;',
        'attribute float aAlpha;',
        'attribute float aRot;',
        'uniform float uScale;',
        'varying float vAlpha;',
        'varying float vRot;',
        '#include <common>',
        '#include <fog_pars_vertex>',
        'void main() {',
        '  vAlpha = aAlpha;',
        '  vRot = aRot;',
        '  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
        '  gl_Position = projectionMatrix * mvPosition;',
        '  gl_PointSize = aAlpha > 0.0 ? aSize * uScale / -mvPosition.z : 0.0;',
        '  #include <fog_vertex>',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap;',
        'uniform vec3 uColor;',
        'varying float vAlpha;',
        'varying float vRot;',
        '#include <common>',
        '#include <fog_pars_fragment>',
        'void main() {',
        '  vec2 p = gl_PointCoord - 0.5;',
        '  float c = cos( vRot );',
        '  float s = sin( vRot );',
        // Круглая маска: повёрнутые углы спрайта брали край текстуры и рисовали квадрат.
        '  float a = texture2D( uMap, mat2( c, s, -s, c ) * p + 0.5 ).a * vAlpha * ( 1.0 - smoothstep( 0.4, 0.5, length( p ) ) );',
        '  if ( a < 0.004 ) discard;',
        '  gl_FragColor = vec4( uColor, a );',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '  #include <fog_fragment>',
        '}',
      ].join('\n'),
    });
  }

  // Следы тают сами: время рождения — атрибут экземпляра, гаснут в шейдере (ботинок 7 с, шина 12 с).
  function decalShader(shader) {
    shader.uniforms.uTime = TIME;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aBorn;\nattribute float aKind;\nuniform float uTime;\nvarying float vFade;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv.x = vMapUv.x * 0.5 + aKind * 0.5;\nvFade = clamp( 1.0 - ( uTime - aBorn ) / mix( 7.0, 12.0, aKind ), 0.0, 1.0 );');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= vFade;\nif ( diffuseColor.a < 0.004 ) discard;');
  }

  // level — уровень из logic, b — рамка двора (art/quarry.js), rings/rows — профили уступов terraces().
  function build(level, b, rings, rows) {
    const group = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    const attr = function (name, size) {
      const a = new THREE.BufferAttribute(new Float32Array(POINTS * size), size).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      return a;
    };
    const points = new THREE.Points(geo, dustMaterial());
    const position = attr('position', 3);
    const size = attr('aSize', 1);
    const alpha = attr('aAlpha', 1);
    const rot = attr('aRot', 1);
    points.frustumCulled = false;
    points.renderOrder = 2;
    points.onBeforeRender = function (renderer, scene, camera) {
      S.camera = camera;
      renderer.getDrawingBufferSize(bufferSize);
      points.material.uniforms.uScale.value = bufferSize.y / (2 * Math.tan(camera.fov * Math.PI / 360));
    };
    group.add(points);

    const decalGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const born = new THREE.InstancedBufferAttribute(new Float32Array(DECALS).fill(-1e4), 1);
    const kind = new THREE.InstancedBufferAttribute(new Float32Array(DECALS), 1);
    decalGeo.setAttribute('aBorn', born);
    decalGeo.setAttribute('aKind', kind);
    const decalMaterial = new THREE.MeshStandardMaterial({
      color: 0x4d3c2c,
      map: decalMap(),
      transparent: true,
      opacity: 0.75, // 0.5 тонуло в зерне земли: след в 6 px читался лишь как редкие точки (кадр r2-site-h-trail)
      roughness: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    decalMaterial.onBeforeCompile = decalShader;
    const decals = new THREE.InstancedMesh(decalGeo, decalMaterial, DECALS);
    decals.count = 0;
    decals.visible = false;
    decals.frustumCulled = false;
    decals.receiveShadow = true;
    decals.renderOrder = 1;
    group.add(decals);

    const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), PEBBLES);
    pebbles.visible = false;
    pebbles.frustumCulled = false;
    const tint = new THREE.Color();
    for (let i = 0; i < PEBBLES; i++) pebbles.setColorAt(i, tint.setHex(ROCK[i % ROCK.length]));
    group.add(pebbles);

    // Склоны для камешков: профили, где есть хотя бы одна стенка заметной высоты.
    const slopes = [];
    for (let i = 0; i < rings.length; i++) if (rings[i][rows - 1][1] > 0.4) slopes.push(i);
    S = {
      group: group, points: points, position: position, size: size, alpha: alpha, rot: rot,
      decals: decals, born: born, kind: kind, next: 0, stamped: false,
      pebbles: pebbles, rocks: [], rings: rings, rows: rows, slopes: slopes, pebbleAt: 3 + Math.random() * 4,
      puffs: [], puffNext: 0, devils: [], walkers: new Map(), wheels: new Map(),
      f: level.footprint, b: b, mines: level.mines, base: new THREE.Color(0xdccbb0), aim: true,
    };
    for (let i = 0; i < PUFFS; i++) S.puffs.push({ age: 1, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0, grow: 1, a: 0, r: 0 });
    // Второй вихрь — только на просторном дворе; первый уже кружит при показе уровня.
    const wide = b.maxX - b.minX > 26 || b.maxZ - b.minZ > 26;
    for (let i = 0; i < (wide ? DEVILS : 1); i++) {
      const d = { t: 0, wait: i ? 9 + Math.random() * 8 : 0, x: 0, z: 0, dx: 0, dz: 0, cx: 0, cz: 0, seed: Math.random() * 10 };
      if (!i) {
        if (placeDevil(d)) d.t = 2.5;
        else d.wait = 5; // тесный двор: не крутить вихрь в точке 0,0
      }
      S.devils.push(d);
    }
    return group;
  }

  // Вихрь не заходит на стройку и рудники: здание и рабочие у груд остаются чистыми.
  function open(x, z) {
    const f = S.f;
    const b = S.b;
    if (x < b.minX + 1 || x > b.maxX || z < b.minZ + 1 || z > b.maxZ + 3) return false;
    if (x > f.minX - 2 && x < f.maxX + 3 && z > f.minZ - 2 && z < f.maxZ + 3) return false;
    for (let i = 0; i < S.mines.length; i++) if (Math.hypot(x - S.mines[i].x - 0.5, z - S.mines[i].z - 0.5) < 2) return false;
    return true;
  }

  function seen(x, z) {
    if (!S.camera) return true;
    probe.set(x, 0.8, z).project(S.camera);
    return Math.abs(probe.x) < 0.8 && Math.abs(probe.y) < 0.8;
  }

  // Двор шире кадра: из подходящих мест берём то, что видно камере (начало и середина пути), иначе первое.
  function placeDevil(d) {
    const b = S.b;
    const len = 0.32 * DEVIL_LIFE;
    let found = false;
    for (let k = 0; k < 40; k++) {
      const x = b.minX + Math.random() * (b.maxX - b.minX + 1);
      const z = b.minZ + Math.random() * (b.maxZ - b.minZ + 4);
      const a = Math.random() * Math.PI * 2;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      if (!open(x, z) || !open(x + dx * len * 0.5, z + dz * len * 0.5) || !open(x + dx * len, z + dz * len)) continue;
      const good = seen(x, z) && seen(x + dx * len * 0.5, z + dz * len * 0.5);
      if (found && !good) continue;
      d.x = x;
      d.z = z;
      d.dx = dx;
      d.dz = dz;
      found = true;
      if (good) return true;
    }
    return found;
  }

  function puff(x, y, z, s, a, life) {
    const p = S.puffs[S.puffNext];
    S.puffNext = (S.puffNext + 1) % PUFFS;
    p.age = 0;
    p.life = life;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = (Math.random() - 0.5) * 0.18;
    p.vy = 0.1 + Math.random() * 0.08;
    p.vz = (Math.random() - 0.5) * 0.18;
    p.s = s;
    p.grow = 2.2 + Math.random() * 0.6;
    p.a = a;
    p.r = Math.random() * 6.28;
  }

  function stamp(x, z, angle, w, l, k) {
    const i = S.next;
    S.next = (i + 1) % DECALS;
    S.decals.count = Math.max(S.decals.count, i + 1);
    dummy.position.set(x, 0.014, z);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(w, 1, l);
    dummy.updateMatrix();
    S.decals.setMatrixAt(i, dummy.matrix);
    S.born.array[i] = TIME.value;
    S.kind.array[i] = k;
    S.stamped = true;
  }

  // Сколько прошло по земле с прошлого кадра; null — не на земле или скачок (новый уровень, телепорт).
  function travel(map, entity, x, z, ground) {
    let t = map.get(entity);
    if (!t) {
      t = { x: x, z: z, acc: 0, side: 1, n: 0, on: false };
      map.set(entity, t);
    }
    const dx = x - t.x;
    const dz = z - t.z;
    const d = Math.hypot(dx, dz);
    const was = t.on;
    t.x = x;
    t.z = z;
    t.on = ground;
    if (!ground || !was || d > 1) {
      t.acc = 0;
      return null;
    }
    t.acc += d;
    t.dx = dx;
    t.dz = dz;
    t.d = d;
    return t;
  }

  function roll() {
    const ring = S.rings[S.slopes[Math.floor(Math.random() * S.slopes.length)]];
    const R = S.rows;
    // С первой стенки или (если она есть) со второй: тогда камешек перекатывается через полку.
    const top = ring.length >= 2 * R && ring[2 * R - 1][1] > ring[R - 1][1] + 0.3 && Math.random() < 0.5 ? 2 : 1;
    const path = [];
    for (let k = top - 1; k >= 0; k--) for (let j = R - 1; j >= 0; j--) path.push(ring[k * R + j]);
    const a = ring[R - 1];
    const e = ring[0];
    const dx = e[0] - a[0];
    const dz = e[2] - a[2];
    const d = Math.hypot(dx, dz) || 1;
    const run = 0.4 + Math.random() * 0.6;
    path.push([e[0] + dx / d * run, e[1], e[2] + dz / d * run]);
    const lens = [0];
    for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]));
    return { path: path, lens: lens, s: 0, seg: 0, v: 0.8, ang: 0, r: 0.08 + Math.random() * 0.05, rest: 0, landed: false, yaw: 0, x: 0, y: 0, z: 0 };
  }

  function updatePebble(p, dt) {
    const path = p.path;
    const last = path.length - 1;
    if (p.rest > 0 || p.s >= p.lens[last]) {
      // Докатился: полежал и ушёл в грунт.
      p.rest += dt;
      return p.rest < 3.5;
    }
    while (p.seg < last - 1 && p.s > p.lens[p.seg + 1]) p.seg++;
    const a = path[p.seg];
    const b = path[p.seg + 1];
    const len = p.lens[p.seg + 1] - p.lens[p.seg] || 0.001;
    const k = Math.min(1, (p.s - p.lens[p.seg]) / len);
    const slope = (a[1] - b[1]) / len;
    p.v = Math.min(3, Math.max(slope > 0.2 ? 0.35 : 0, p.v + (7 * slope - 1.6) * dt));
    if (p.v <= 0) p.rest = dt;
    p.s += p.v * dt;
    p.ang += p.v * dt / p.r;
    p.yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
    const hop = Math.abs(Math.sin(p.s * 7)) * 0.06 * Math.min(1, p.v / 1.5) * (slope > 0.2 ? 1 : 0.25);
    p.x = a[0] + (b[0] - a[0]) * k;
    p.y = a[1] + (b[1] - a[1]) * k + p.r + hop;
    p.z = a[2] + (b[2] - a[2]) * k;
    if (!p.landed && p.seg === last - 1) {
      p.landed = true;
      puff(p.x, 0.05, p.z, 0.22, 0.24, 1.1);
    }
    return true;
  }

  function update(dt, world, viewPose, timeScale, env) {
    if (!S || !world) return;
    S.group.visible = timeScale < 5;
    if (timeScale >= 5) {
      // Перемотка: следы не копятся, после неё отсчёт шагов начинается заново.
      S.walkers.clear();
      S.wheels.clear();
      return;
    }
    dt *= Math.max(0, timeScale); // мировое время: на паузе и замедлении пыль и следы идут вместе с рабочими
    TIME.value += dt;
    const m = env;
    // Мокрая земля не пылит; в жару вихри гуще.
    const dusty = (1 - (m ? m.wet : 0)) * (1 + 0.6 * (m ? m.dust : 0));

    // Следы ботинок и облачко пыли через шаг. Только на земле: на лесах и на ярусах здания следов нет.
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      viewPose(builder, pose);
      const t = travel(S.walkers, builder, pose[0] + 0.5, pose[2] + 0.5, builder.from[1] === 0 && builder.to[1] === 0 && pose[1] < 0.05);
      if (!t || t.acc < STRIDE) continue;
      t.acc -= STRIDE;
      t.side = -t.side;
      t.n++;
      const ux = t.dx / t.d;
      const uz = t.dz / t.d;
      const x = t.x + uz * 0.08 * t.side;
      const z = t.z - ux * 0.08 * t.side;
      stamp(x, z, Math.atan2(ux, uz) + Math.PI, 0.12, 0.2, 0);
      if (t.n % 2 === 0 && dusty > 0.05) puff(x, 0.04, z, builder.carry.length ? 0.19 : 0.15, 0.22 * Math.min(1, dusty), 0.8 + Math.random() * 0.4);
    }
    // Колея за погрузчиком: две полосы шин по ходу машины.
    for (let i = 0; i < world.vehicles.length; i++) {
      const vehicle = world.vehicles[i];
      viewPose(vehicle, pose);
      const t = travel(S.wheels, vehicle, pose[0] + 0.5, pose[2] + 0.5, pose[1] < 0.05);
      if (!t || t.acc < TREAD) continue;
      t.acc -= TREAD;
      const ux = t.dx / t.d;
      const uz = t.dz / t.d;
      const angle = Math.atan2(ux, uz);
      for (let side = -1; side <= 1; side += 2) stamp(t.x + uz * WHEEL_X * side, t.z - ux * WHEEL_X * side, angle, 0.2, TREAD * 1.25, 1);
    }
    if (S.stamped) {
      S.stamped = false;
      S.decals.visible = true;
      S.decals.instanceMatrix.needsUpdate = true;
      S.born.needsUpdate = true;
      S.kind.needsUpdate = true;
    }

    // Камешки с террас: не чаще раза в 4–9 с, не больше трёх сразу.
    S.pebbleAt -= dt;
    if (S.pebbleAt <= 0 && S.slopes.length && S.rocks.length < PEBBLES) {
      S.pebbleAt = 4 + Math.random() * 5;
      S.rocks.push(roll());
    }
    for (let i = S.rocks.length - 1; i >= 0; i--) if (!updatePebble(S.rocks[i], dt)) S.rocks.splice(i, 1);
    for (let i = 0; i < S.rocks.length; i++) {
      const p = S.rocks[i];
      const sink = Math.max(0, p.rest - 2.5) * p.r * 1.6;
      dummy.position.set(p.x, p.y - sink, p.z);
      dummy.rotation.set(p.ang, p.yaw, 0, 'YXZ');
      dummy.scale.set(p.r, p.r * 0.8, p.r);
      dummy.updateMatrix();
      S.pebbles.setMatrixAt(i, dummy.matrix);
    }
    S.pebbles.count = S.rocks.length;
    S.pebbles.visible = S.rocks.length > 0;
    S.pebbles.instanceMatrix.needsUpdate = true;

    // Пыль: вихри считаются целиком каждый кадр, облачка — пул по кругу.
    const pos = S.position.array;
    const size = S.size.array;
    const alpha = S.alpha.array;
    const rot = S.rot.array;
    const T = TIME.value;
    let live = 0;
    // Камера известна только после первого кадра: вихрь, что при постройке уровня встал у края или за кадром, переносим в кадр.
    if (S.aim && S.camera) {
      S.aim = false;
      const d = S.devils[0];
      if (d.wait <= 0 && !seen(d.cx, d.cz)) placeDevil(d);
    }
    for (let v = 0; v < DEVILS; v++) {
      const d = S.devils[v];
      let env = 0;
      if (d) {
        if (d.wait > 0) {
          d.wait -= dt;
          if (d.wait <= 0 && !placeDevil(d)) d.wait = 5;
        } else {
          d.t += dt;
          if (d.t >= DEVIL_LIFE) {
            d.t = 0;
            d.wait = 6 + Math.random() * 10;
          }
          env = (d.t < 2.5 ? d.t / 2.5 : 1) * Math.min(1, (DEVIL_LIFE - d.t) / 3) * Math.min(1, dusty);
        }
      }
      // Ползёт со скоростью 0,32 клетки/с с плавным вилянием; верх воронки отстаёт и качается.
      const go = d ? d.t * 0.32 : 0;
      const wob = d ? Math.sin(d.t * 0.6 + d.seed) * 0.5 : 0;
      const cx = d ? d.x + d.dx * go - d.dz * wob : 0;
      const cz = d ? d.z + d.dz * go + d.dx * wob : 0;
      if (d) {
        d.cx = cx;
        d.cz = cz;
      }
      for (let i = 0; i < DEVIL_N; i++) {
        const at = v * DEVIL_N + i;
        if (env <= 0) {
          alpha[at] = 0;
          continue;
        }
        live++;
        let f = 0;
        let h;
        let r;
        let ang;
        let s;
        let a;
        if (i < SKIRT) {
          h = 0.08 + 0.05 * (i % 2);
          r = 0.4 + 0.22 * ((i * 0.37) % 1) + 0.06 * Math.sin(T * 3 + i);
          ang = i * 1.05 + T * 2.4;
          s = 0.6;
          a = 0.28;
        } else {
          f = (i - SKIRT) / (DEVIL_N - SKIRT - 1);
          h = 0.12 + f * 2.1;
          r = 0.08 + f * f * 0.5 + 0.04 * Math.sin(T * 4 + i);
          ang = i * 2.4 + T * (6 - 2.5 * f);
          s = 0.26 + f * 0.6;
          a = 0.4 * (1 - f) + 0.1;
        }
        const lean = f * f;
        pos[at * 3] = cx + Math.sin(T * 0.9 + d.seed) * 0.35 * lean + Math.cos(ang) * r;
        pos[at * 3 + 1] = h;
        pos[at * 3 + 2] = cz + Math.cos(T * 0.7 + d.seed) * 0.25 * lean + Math.sin(ang) * r;
        size[at] = s;
        alpha[at] = a * env;
        rot[at] = -ang;
      }
    }
    for (let i = 0; i < PUFFS; i++) {
      const p = S.puffs[i];
      const at = DEVILS * DEVIL_N + i;
      if (p.age >= p.life) {
        alpha[at] = 0;
        continue;
      }
      live++;
      p.age += dt;
      const k = Math.min(1, p.age / p.life);
      const drag = Math.max(0, 1 - 1.5 * dt);
      p.vx *= drag;
      p.vz *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      pos[at * 3] = p.x;
      pos[at * 3 + 1] = p.y;
      pos[at * 3 + 2] = p.z;
      size[at] = p.s * (1 + (p.grow - 1) * Math.sqrt(k));
      alpha[at] = p.a * Math.pow(1 - k, 1.5) * Math.min(1, k * 6);
      rot[at] = p.r + k;
    }
    S.points.visible = live > 0;
    if (live) {
      S.position.needsUpdate = true;
      S.size.needsUpdate = true;
      S.alpha.needsUpdate = true;
      S.rot.needsUpdate = true;
      // Ночью пыль не светится сама: тон гаснет вместе со светом.
      S.points.material.uniforms.uColor.value.copy(S.base).multiplyScalar(1 - 0.75 * (m ? m.night : 0));
    }
  }

  // Для снимков: вихрь и камешек сразу, не дожидаясь паузы.
  function debug(what) {
    if (!S) return false;
    if (what === 'where') {
      const d = S.devils[0];
      const p = new THREE.Vector3(d.cx, 1, d.cz);
      if (S.camera) p.project(S.camera);
      return [+((p.x + 1) / 2).toFixed(2), +((1 - p.y) / 2).toFixed(2), d.wait > 0 ? 'wait' : +d.t.toFixed(1)];
    }
    if (what === 'stat') return { decals: S.decals.count, pebbles: S.rocks.length, slopes: S.slopes.length, devils: S.devils.map(function (d) { return d.wait > 0 ? -Math.round(d.wait) : Math.round(d.t); }) };
    if (what === 'pebble') {
      if (S.slopes.length) S.rocks.push(roll());
      return S.rocks.length;
    }
    // Вихрь в кадре: из случайных мест берём первое, что видно камере; ответ — экранные координаты 0..1.
    const d = S.devils[0];
    const p = new THREE.Vector3();
    d.wait = 0;
    d.t = 2.5;
    for (let k = 0; k < 30 && placeDevil(d); k++) {
      p.set(d.x + d.dx * 2, 0.6, d.z + d.dz * 2);
      if (S.camera) p.project(S.camera);
      if (!S.camera || (Math.abs(p.x) < 0.6 && Math.abs(p.y) < 0.6)) return [(p.x + 1) / 2, (1 - p.y) / 2];
    }
    return null;
  }

  window.MicroBuildersAmbient = { build: build, update: update, debug: debug };
})();
