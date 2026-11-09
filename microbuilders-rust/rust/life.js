// Жизнь вокруг стройки: погода (ясно → облачно → дождь → сохнет), капли дождя, пыль из-под ног, крошка
// и пыль от ударов кирки, пыль кладки, искры по стали, дым сигарет, дым генераторов мачт ночью, мошкара
// у прожекторов, птицы, пар дыхания и следы на снегу. События движений — очередь фигуры w.fx (people.js).
// Всё кодом, без файлов текстур.
import * as THREE from 'three';
import { CLOUD, WEATHER, linkSky } from './world.js?v=9f2863b';
import { ATMO } from './atmosphere.js?v=9f2863b';

// выходы G-буфера у собственных шейдеров: прозрачное не трогает буферы под собой
const GB_OUT = /* glsl */ `
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
void gbZero() { gNormal = vec4(0.0); gInfo = vec4(0.0); gVelocity = vec4(0.0); gAlbedo = vec4(0.0); gIndirect = vec4(0.0); }
`;

// ---------- дождь ----------
// 14 000 штрихов в коробке 44 × 26 × 44 м вокруг камеры; положение — из номера капли и времени (без CPU),
// длина — по скорости падения (выдержка кадра), свет — небо и прожекторы.
const RAIN_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime, uRain;
uniform vec3 uCam, uWindR;
varying float vA;
varying vec2 vQ;
varying vec3 vW;
void main() {
  vec3 box = vec3(44.0, 26.0, 44.0);
  float fall = 9.0 + aSeed.w * 2.0;
  vec3 p = aSeed.xyz * box + vec3(uWindR.x, -fall, uWindR.z) * uTime;
  p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
  vec3 v = normalize(vec3(uWindR.x, -fall, uWindR.z));
  vec3 toCam = normalize(cameraPosition - p);
  vec3 side = normalize(cross(v, toCam)) * 0.011;
  float len = 0.7;
  vec3 w = p + side * position.x + v * (position.y * len);
  vW = w;
  vQ = position.xy;
  // редеет вдали, у камеры не мешает
  float d = length(p - cameraPosition);
  vA = uRain * smoothstep(0.6, 2.5, d) * (1.0 - smoothstep(14.0, 22.0, d)) * step(aSeed.w, uRain * 1.05);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const RAIN_FRAG = GB_OUT + /* glsl */ `
uniform vec3 uSky, uSpotPos[2], uSpotCol[2], uSpotDir[2];
uniform vec2 uSpotCos[2];
varying float vA;
varying vec2 vQ;
varying vec3 vW;
layout(location = 0) out highp vec4 outColor;
void main() {
  float a = vA * (1.0 - abs(vQ.x) * 2.0) * smoothstep(0.0, 0.25, vQ.y + 0.5) * (1.0 - smoothstep(0.25, 0.5, vQ.y));
  if (a <= 0.002) discard;
  vec3 c = uSky * 2.2;
  for (int k = 0; k < 2; k++) {
    vec3 lv = uSpotPos[k] - vW; float dl = length(lv); vec3 l = lv / max(dl, 1e-3);
    float cone = smoothstep(uSpotCos[k].x, uSpotCos[k].y, dot(-l, uSpotDir[k]));
    c += uSpotCol[k] * cone / max(dl * dl, 1.0) * 0.9;
  }
  outColor = vec4(c * a * 0.6, a * 0.35);
  gbZero();
}
`;

function rain(count) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  g.instanceCount = count;
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uTime: WEATHER.time, uRain: WEATHER.rain, uCam: { value: new THREE.Vector3() }, uWindR: { value: new THREE.Vector3(1.3, 0, 0.6) },
      uSky: { value: new THREE.Vector3(0.3, 0.32, 0.35) },
      uSpotPos: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uSpotCol: { value: [new THREE.Vector3(), new THREE.Vector3()] },
      uSpotDir: { value: [new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -1, 0)] }, uSpotCos: { value: [new THREE.Vector2(1, 1), new THREE.Vector2(1, 1)] },
    },
    vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.userData.noGI = true;
  return mesh;
}

// ---------- снег ----------
// 9 000 хлопьев в коробке 40 × 22 × 40 м вокруг камеры: падают 0,8–1,5 м/с и кружат; мягкие диски 2,5–4 см
// (мельче на экране не видно). Свет — небо и солнце (рассеянный), ночью — прожекторы.
const SNOW_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime, uSnowK;
uniform vec3 uCam, uWindR;
varying float vA;
varying vec2 vQ;
varying vec3 vW;
void main() {
  vec3 box = vec3(40.0, 22.0, 40.0);
  float fall = 0.8 + aSeed.w * 0.7;
  vec3 swirl = vec3(sin(uTime * (0.6 + aSeed.x) + aSeed.y * 40.0), 0.0, cos(uTime * (0.5 + aSeed.z) + aSeed.x * 40.0)) * 0.35;
  vec3 p = aSeed.xyz * box + vec3(uWindR.x * 0.4, -fall, uWindR.z * 0.4) * uTime + swirl;
  p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
  vec3 toCam = normalize(cameraPosition - p);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 up = cross(toCam, right);
  float size = 0.025 + aSeed.w * 0.015;
  vec3 w = p + (right * position.x + up * position.y) * size;
  vW = w;
  vQ = position.xy;
  float d = length(p - cameraPosition);
  vA = uSnowK * smoothstep(1.8, 4.5, d) * (1.0 - smoothstep(14.0, 20.0, d)) * step(aSeed.w, uSnowK * 1.05);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const SNOW_FRAG = GB_OUT + /* glsl */ `
uniform vec3 uSky, uSun, uSpotPos[2], uSpotCol[2], uSpotDir[2];
uniform vec2 uSpotCos[2];
varying float vA;
varying vec2 vQ;
varying vec3 vW;
layout(location = 0) out highp vec4 outColor;
void main() {
  float a = vA * (1.0 - smoothstep(0.15, 0.5, length(vQ)));
  if (a <= 0.002) discard;
  vec3 c = uSky * 2.6 + uSun;
  for (int k = 0; k < 2; k++) {
    vec3 lv = uSpotPos[k] - vW; float dl = length(lv); vec3 l = lv / max(dl, 1e-3);
    float cone = smoothstep(uSpotCos[k].x, uSpotCos[k].y, dot(-l, uSpotDir[k]));
    c += uSpotCol[k] * cone / max(dl * dl, 1.0) * 0.9;
  }
  outColor = vec4(c * a * 0.9, a * 0.8);
  gbZero();
}
`;

function snow(count) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  g.instanceCount = count;
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uTime: WEATHER.time, uSnowK: WEATHER.snowfall, uCam: { value: new THREE.Vector3() }, uWindR: { value: new THREE.Vector3(1.3, 0, 0.6) },
      uSky: { value: new THREE.Vector3(0.3, 0.32, 0.35) }, uSun: { value: new THREE.Vector3() },
      uSpotPos: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uSpotCol: { value: [new THREE.Vector3(), new THREE.Vector3()] },
      uSpotDir: { value: [new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -1, 0)] }, uSpotCos: { value: [new THREE.Vector2(1, 1), new THREE.Vector2(1, 1)] },
    },
    vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.userData.noGI = true;
  return mesh;
}

// ---------- частицы: пыль, дым, мошкара, крошка, искры ----------
const PART_VERT = /* glsl */ `
attribute vec4 aPos;   // xyz, размер
attribute vec4 aCol;   // rgb (альбедо или свечение), прозрачность
attribute float aKind; // 0 пыль, 1 дым, 2 мошка (светится), 3 крошка (твёрдая, падает), 4 искра
varying vec2 vQ;
varying vec4 vCol;
varying float vKind;
varying vec3 vW;
void main() {
  vec3 toCam = normalize(cameraPosition - aPos.xyz);
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 u = cross(toCam, r);
  vec3 w = aPos.xyz + (r * position.x + u * position.y) * aPos.w;
  vQ = position.xy * 2.0; vCol = aCol; vKind = aKind; vW = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const PART_FRAG = GB_OUT + /* glsl */ `
uniform vec3 uSunDir, uSunCol, uSky;
varying vec2 vQ;
varying vec4 vCol;
varying float vKind;
varying vec3 vW;
layout(location = 0) out highp vec4 outColor;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float r = length(vQ);
  if (r > 1.0) discard;
  float a;
  vec3 c;
  if (vKind > 3.5) {
    // искра: горячее ядро и ореол
    a = (1.0 - smoothstep(0.0, 1.0, r)) * vCol.a;
    c = vCol.rgb * (18.0 * (1.0 - smoothstep(0.0, 0.35, r)) + 4.0);
  } else if (vKind > 2.5) {
    // крошка: угловатый осколок, освещён как земля
    float ang = atan(vQ.y, vQ.x);
    float edge = 0.62 + 0.3 * h(vec2(floor(ang * 1.2 + 3.0), floor(vW.x * 50.0 + vW.z * 31.0)));
    if (r > edge) discard;
    a = vCol.a;
    vec3 V = normalize(vW - cameraPosition);
    c = vCol.rgb * (uSunCol * (0.55 + 0.6 * (0.5 + 0.5 * vQ.y)) + uSky * 1.6);
  } else if (vKind > 1.5) {
    a = (1.0 - smoothstep(0.0, 1.0, r)) * vCol.a;
    c = vCol.rgb * 6.0;
  } else {
    float n = h(floor((vQ + vW.xz) * 5.0)) * 0.3 + 0.7;
    a = (1.0 - smoothstep(0.2, 1.0, r)) * vCol.a * n;
    vec3 V = normalize(vW - cameraPosition);
    float fwd = pow(max(dot(V, uSunDir), 0.0), 6.0);
    c = vCol.rgb * (uSunCol * (0.25 + 1.8 * fwd) + uSky);
  }
  outColor = vec4(c * a, a);
  gbZero();
}
`;

function ss(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
// Math.random — через вызов: вид подменяет его своим генератором на время кадра (main.js → asView)
function RND() { return Math.random(); }

// ветер для шлейфа из труб, м/с (по направлению ветра травы и дождя)
const PLUME = [0.9, 0.75, 0.4];
function particles(max) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const P = new Float32Array(max * 4), Cc = new Float32Array(max * 4), K = new Float32Array(max);
  const aP = new THREE.InstancedBufferAttribute(P, 4), aC = new THREE.InstancedBufferAttribute(Cc, 4), aK = new THREE.InstancedBufferAttribute(K, 1);
  aP.setUsage(THREE.DynamicDrawUsage); aC.setUsage(THREE.DynamicDrawUsage); aK.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aPos', aP); g.setAttribute('aCol', aC); g.setAttribute('aKind', aK);
  g.instanceCount = 0;
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3() }, uSky: { value: new THREE.Vector3() } },
    vertexShader: PART_VERT, fragmentShader: PART_FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.userData.noGI = true;
  // частица: x y z, скорость, возраст, жизнь, размер, рост, цвет, прозрачность, вид; floor — пол для крошки и искр
  const list = [];
  function emit(kind, x, y, z, vx, vy, vz, life, size, grow, r, gg, b, a, floor) {
    if (list.length >= max) list.shift();
    const p = { kind, x, y, z, vx, vy, vz, age: 0, life, size, grow, r, g: gg, b, a, floor: floor === undefined ? -1e9 : floor, plume: false };
    list.push(p);
    return p;
  }
  function update(dt) {
    let n = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) { list.splice(i, 1); continue; }
    }
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.kind >= 3) {
        // крошка и искры летят по баллистике, отскакивают от пола и гаснут
        p.vy -= 9.8 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < p.floor) { p.y = p.floor; p.vy = Math.abs(p.vy) * (p.kind === 4 ? 0.35 : 0.22); p.vx *= 0.45; p.vz *= 0.45; }
      } else if (p.plume) {
        // дым трубы: поднимается и уходит по ветру длинным шлейфом
        const k = 1 - Math.exp(-dt * 0.5);
        p.vx += (PLUME[0] - p.vx) * k; p.vy += (PLUME[1] - p.vy) * k; p.vz += (PLUME[2] - p.vz) * k;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      } else {
        const drag = p.kind === 2 ? 0 : Math.exp(-dt * 1.6);
        p.vx *= drag; p.vz *= drag; if (p.kind !== 2) p.vy = p.vy * drag + (p.kind === 1 ? 0.35 : 0.05) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
      const t = p.age / p.life;
      // дым трубы гуще всего у самого верха трубы и редеет к концу шлейфа
      const fade = p.kind === 2 ? 1 : p.kind === 3 ? 1 - ss(t, 0.75, 1) : p.kind === 4 ? (1 - t) * (1 - t) : p.plume ? ss(t, 0, 0.03) * (1 - t) * 1.2 : Math.sin(Math.min(1, t * 1.2) * Math.PI);
      P[n * 4] = p.x; P[n * 4 + 1] = p.y; P[n * 4 + 2] = p.z; P[n * 4 + 3] = p.size + p.grow * p.age;
      Cc[n * 4] = p.r; Cc[n * 4 + 1] = p.g; Cc[n * 4 + 2] = p.b; Cc[n * 4 + 3] = p.a * fade;
      K[n] = p.kind;
      n++;
    }
    g.instanceCount = n;
    aP.needsUpdate = aC.needsUpdate = aK.needsUpdate = true;
    aP.addUpdateRange && aP.addUpdateRange(0, n * 4);
  }
  return { mesh, emit, update, list };
}

// ---------- птицы ----------
// Несколько стай ходят кругами над лесом; крылья машут в вершинном шейдере (V из двух треугольников).
// ---------- следы на снегу ----------
// Отпечатки ботинок, где рабочие идут по заснеженной земле: кольцо из n штук (один InstancedMesh), левый —
// в середине опоры левой ноги, правый — правой (фаза шага people.js). Подошва 29 × 11 см: пятка, свод уже,
// широкая подушечка, носок; в ямке темнее, к краю светлее, поперёк — грунтозацепы. Снегопад заметает след
// за ~2 игровых часа (светлеет до цвета снега), без снега следов нет.
function footprints(n) {
  const W = 32, H = 64, px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = Math.abs((i + 0.5) / W * 2 - 1), v = (j + 0.5) / H;  // v: 0 — пятка, 1 — носок
    let hw;
    if (v < 0.14) hw = 0.78 * Math.sqrt(Math.max(0, 1 - Math.pow((0.14 - v) / 0.14, 2)));
    else if (v < 0.34) hw = 0.78;
    else if (v < 0.5) hw = 0.78 - 0.16 * Math.sin(Math.PI * (v - 0.34) / 0.16);
    else if (v < 0.8) hw = 0.78 + 0.2 * ss(v, 0.5, 0.72);
    else hw = 0.98 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.8) / 0.2, 2)));
    const k = (i + j * W) * 4;
    if (u >= hw) { px[k] = px[k + 1] = px[k + 2] = 255; px[k + 3] = 0; continue; }
    const deep = Math.min(1, (hw - u) / 0.3) * (v > 0.34 && v < 0.5 ? 0.55 : 1);
    const lug = (v < 0.34 || v > 0.5) && Math.sin(v * 80) > 0.25 ? 1 : 0;
    const c = 1 - 0.28 * deep - 0.07 * lug * deep;
    px[k] = px[k + 1] = px[k + 2] = Math.round(c * 255);
    px[k + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, W, H, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));  // носок — вперёд (+z)
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.32, 0.37, 0.48), map: tex, alphaTest: 0.5, roughness: 0.88, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mat.defines = { MB_DRY: '' };
  linkSky(mat);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.name = 'footprints';
  mesh.count = 0;
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const col = new THREE.Color(1, 1, 1), born = new Float32Array(n);
  for (let i = 0; i < n; i++) mesh.setColorAt(i, col);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), p = new THREE.Vector3(), nrm = new THREE.Vector3();
  const sc = new THREE.Vector3(0.13, 1, 0.32), Y = new THREE.Vector3(0, 1, 0);
  let head = 0, clock = 0;
  // ground(x, z) — высота земли: след лежит на ней и наклонён по склону бугра
  function add(x, z, yaw, t, ground) {
    const e = 0.15, h = ground ? ground(x, z) : 0;
    if (ground) nrm.set(ground(x - e, z) - ground(x + e, z), 2 * e, ground(x, z - e) - ground(x, z + e)).normalize(); else nrm.copy(Y);
    q.setFromAxisAngle(Y, yaw).premultiply(qt.setFromUnitVectors(Y, nrm));
    m4.compose(p.set(x, h + 0.015, z), q, sc);
    mesh.setMatrixAt(head, m4);
    mesh.setColorAt(head, col.setRGB(1, 1, 1));
    born[head] = t;
    head = (head + 1) % n;
    mesh.count = Math.min(n, mesh.count + 1);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }
  // t — снегопад в игровых секундах (полный снег); след светлеет к цвету снега
  function update(t, dt) {
    clock += dt;
    if (clock < 0.3 || !mesh.count) return;
    clock = 0;
    for (let i = 0; i < mesh.count; i++) {
      const f = 1 + 1.1 * Math.min(1, Math.max(0, (t - born[i]) / 240));
      mesh.setColorAt(i, col.setRGB(f, f, f));
    }
    mesh.instanceColor.needsUpdate = true;
  }
  return { mesh, add, update };
}

function birds() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, -0.36, 0, -0.04, 0, 0, -0.1, 0, 0, 0.12, 0, 0, -0.1, 0.36, 0, -0.04], 3));
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = function (shader) {
    shader.uniforms.uFlap = WEATHER.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uFlap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.3;\n#else\nfloat ph = 0.0;\n#endif\ntransformed.y += abs(transformed.x) * sin(uFlap * 11.0 + ph) * 0.9;');
  };
  m.customProgramCacheKey = function () { return 'bird1'; };
  const n = 18;
  const mesh = new THREE.InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.userData.noGI = true;
  const flocks = [[60, -40, 46, 0.12], [-80, 70, 62, -0.09], [20, 120, 38, 0.15]];
  const dummy = new THREE.Object3D();
  function update(t) {
    for (let i = 0; i < n; i++) {
      const f = flocks[i % 3], k = Math.floor(i / 3);
      const a = t * f[3] + k * 0.08;
      const R = 70 + k * 3;
      dummy.position.set(f[0] + Math.cos(a) * R + Math.sin(k * 7.1) * 3, f[2] + Math.sin(t * 0.3 + k) * 2, f[1] + Math.sin(a) * R + Math.cos(k * 5.3) * 3);
      dummy.rotation.set(0, -a + (f[3] > 0 ? 0 : Math.PI), Math.sin(t + k) * 0.2);
      dummy.scale.setScalar(1.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}

// ---------- погода ----------
// Каждый второй день под вечер (15:30–17:00) — ливень, до и после — облака густеют и редеют; сырость копится
// под дождём и сохнет часа три. ?weather=rain|clear — для проверки.
export function createLife(scene, quality, opts) {
  const group = new THREE.Group();
  group.name = 'life';
  const R = quality.rain === 0 ? null : rain(quality.taa ? 14000 : 5000);
  const SN = snow(quality.taa ? 9000 : 3500);
  group.add(SN);
  const P = particles(quality.taa ? 900 : 300);
  const B = birds();
  const FP = quality.taa ? footprints(640) : null;
  if (R) group.add(R);
  group.add(P.mesh, B.mesh);
  if (FP) group.add(FP.mesh);
  scene.add(group);
  let forced = opts.weather || null;
  let day = 0, lastHour = null, cover = 0.27, wet = 0, rainK = 0, snowK = 0, snowCover = 0;
  const tmp = new THREE.Vector3();
  let dustClock = 0, smokeClock = 0, mothClock = 0, chimneyClock = 0, breathClock = 0, snowClock = 0;
  function plan(hour) {
    if (forced === 'rain') return { cover: 0.82, rain: 1 };
    if (forced === 'snow') return { cover: 0.78, rain: 0, snow: 1 };
    if (forced === 'clear') return { cover: 0.18, rain: 0 };
    if (day % 2 === 1) {
      const build = THREE.MathUtils.smoothstep(hour, 13.0, 15.3) * (1 - THREE.MathUtils.smoothstep(hour, 17.2, 19.0));
      const shower = THREE.MathUtils.smoothstep(hour, 15.4, 15.8) * (1 - THREE.MathUtils.smoothstep(hour, 16.7, 17.1));
      return { cover: 0.27 + 0.55 * build, rain: shower };
    }
    return { cover: 0.27, rain: 0 };
  }
  // dt — реальные секунды (частицы), sim — игровые (погода)
  function update(dt, sim, time, hour, sky, workers, lights) {
    if (lastHour !== null && hour < lastHour - 12) day++;
    lastHour = hour;
    const p = plan(hour);
    const k = 1 - Math.exp(-sim * 0.5);
    cover += (p.cover - cover) * k;
    rainK += (p.rain - rainK) * (1 - Math.exp(-sim * 0.8));
    snowK += ((p.snow || 0) - snowK) * (1 - Math.exp(-sim * 0.25));
    // снег ложится за ~2 мин снегопада, тает ~10 мин
    snowCover = Math.max(0, Math.min(1, snowCover + (snowK > 0.2 ? sim / 120 * snowK : -sim / 600)));
    WEATHER.snow.value = snowCover * 0.9;
    WEATHER.snowfall.value = snowK;
    // под дождём мокнет за ~15 мин игры, сохнет ~3 ч (игровой час — 40 с при ×1)
    wet = Math.max(0, Math.min(1, wet + (rainK > 0.2 ? sim / 40 * 4 * rainK : -sim / 40 / 3)));
    if (forced === 'rain') wet = Math.max(wet, 0.85);
    CLOUD.cover.value = cover;
    WEATHER.wet.value = wet;
    WEATHER.rain.value = rainK;
    WEATHER.time.value = time;
    // дымка: под облаками и утром гуще
    const morning = THREE.MathUtils.smoothstep(hour, 4.8, 6.2) * (1 - THREE.MathUtils.smoothstep(hour, 7.4, 9.0));
    ATMO.haze.value = 6 + 7 * (cover - 0.27) + 10 * morning + 6 * rainK;
    const st = sky.state;
    if (R) {
      const u = R.material.uniforms;
      u.uCam.value.copy(opts.camera.position);
      const sk = ATMO.irradiance.value ? 1 : 1;
      u.uSky.value.set(0.35, 0.37, 0.4).multiplyScalar(sk * (1 - st.night * 0.95) * 0.6 + 0.01);
      const spots = (lights || []).filter(function (l) { return l.isSpotLight; });
      for (let i = 0; i < 2; i++) {
        const sp = spots[i];
        if (!sp || sp.intensity < 0.01) { u.uSpotCol.value[i].set(0, 0, 0); continue; }
        sp.getWorldPosition(u.uSpotPos.value[i]);
        sp.target.getWorldPosition(tmp);
        u.uSpotDir.value[i].copy(tmp).sub(u.uSpotPos.value[i]).normalize();
        u.uSpotCol.value[i].set(sp.color.r, sp.color.g, sp.color.b).multiplyScalar(sp.intensity);
        u.uSpotCos.value[i].set(Math.cos(sp.angle), Math.cos(sp.angle * (1 - sp.penumbra)));
      }
      R.visible = rainK > 0.01;
    }
    {
      const u = SN.material.uniforms;
      u.uCam.value.copy(opts.camera.position);
      u.uSky.value.set(0.35, 0.37, 0.4).multiplyScalar((1 - st.night * 0.95) * 0.6 + 0.01);
      u.uSun.value.set(sky.sun.color.r, sky.sun.color.g, sky.sun.color.b).multiplyScalar(sky.sun.intensity * 0.03);
      const spots = (lights || []).filter(function (l) { return l.isSpotLight; });
      for (let i = 0; i < 2; i++) {
        const sp = spots[i];
        if (!sp || sp.intensity < 0.01) { u.uSpotCol.value[i].set(0, 0, 0); continue; }
        sp.getWorldPosition(u.uSpotPos.value[i]);
        sp.target.getWorldPosition(tmp);
        u.uSpotDir.value[i].copy(tmp).sub(u.uSpotPos.value[i]).normalize();
        u.uSpotCol.value[i].set(sp.color.r, sp.color.g, sp.color.b).multiplyScalar(sp.intensity);
        u.uSpotCos.value[i].set(Math.cos(sp.angle), Math.cos(sp.angle * (1 - sp.penumbra)));
      }
      SN.visible = snowK > 0.01;
    }
    // пыль: из-под колёс тачек и ног на сухой земле, днём; дым генераторов и мошкара — ночью
    const pu = P.mesh.material.uniforms;
    pu.uSunDir.value.copy(st.sunDir);
    pu.uSunCol.value.set(sky.sun.color.r, sky.sun.color.g, sky.sun.color.b).multiplyScalar(sky.sun.intensity * 0.06);
    pu.uSky.value.set(0.08, 0.09, 0.1).multiplyScalar(1 - st.night * 0.9);
    dustClock += dt; smokeClock += dt; mothClock += dt;
    // на снегу из-под ног — снежная пыль, не земляная
    const snowy = snowCover > 0.3;
    if (dustClock > 0.12 && wet < 0.3) {
      dustClock = 0;
      (workers || []).forEach(function (w) {
        if (w.state !== 'walk' || !w.anim || w.anim.speed < 0.4) return;
        const barrow = w.barrowState === 'push';
        if (Math.random() > (barrow ? 0.7 : 0.25)) return;
        const hx = Math.sin(w.heading || 0), hz = Math.cos(w.heading || 0);
        const ox = barrow ? hx * 1.45 : (Math.random() - 0.5) * 0.3, oz = barrow ? hz * 1.45 : (Math.random() - 0.5) * 0.3;
        if (snowy) P.emit(0, w.pos.x + ox, w.pos.y + 0.04, w.pos.z + oz, (Math.random() - 0.5) * 0.3, 0.1 + Math.random() * 0.08, (Math.random() - 0.5) * 0.3,
          0.9 + Math.random() * 0.5, 0.05, 0.18, 0.86, 0.88, 0.92, 0.12);
        else P.emit(0, w.pos.x + ox, w.pos.y + 0.06, w.pos.z + oz, (Math.random() - 0.5) * 0.4, 0.12 + Math.random() * 0.1, (Math.random() - 0.5) * 0.4,
          1.6 + Math.random(), 0.12, 0.35, 0.55, 0.47, 0.38, 0.16 * (1 - wet * 3));
      });
    }
    if (st.night > 0.4 && lights) {
      const spots = lights.filter(function (l) { return l.isSpotLight; });
      if (smokeClock > 0.35) {
        smokeClock = 0;
        spots.forEach(function (sp) {
          // выхлоп генератора — под мачтой, у кожуха
          sp.getWorldPosition(tmp);
          P.emit(1, tmp.x, 1.35, tmp.z, 0.1 + Math.random() * 0.1, 0.5, 0.05, 5, 0.12, 0.45, 0.32, 0.32, 0.33, 0.22);
        });
      }
      if (mothClock > 0.05) {
        mothClock = 0;
        spots.forEach(function (sp) {
          if (P.list.filter(function (q) { return q.kind === 2; }).length > 90) return;
          sp.getWorldPosition(tmp);
          const a = Math.random() * 6.28, r = 0.4 + Math.random() * 1.6;
          P.emit(2, tmp.x + Math.cos(a) * r, tmp.y - 0.2 - Math.random() * 1.2, tmp.z + Math.sin(a) * r, Math.cos(a + 1.6) * 1.2, (Math.random() - 0.5) * 0.6, Math.sin(a + 1.6) * 1.2,
            1.2 + Math.random() * 1.5, 0.012, 0, 1.0, 0.95, 0.85, 0.9);
        });
      }
    }
    // дым из готовых труб: клубы растут и сносятся ветром; у большого цеха — гуще и темнее
    chimneyClock += dt;
    if (chimneyClock > 0.12 && opts.chimneys) {
      chimneyClock = 0;
      opts.chimneys().forEach(function (c) {
        const g = c.big ? 0.17 : 0.27;
        P.emit(1, c.x + (RND() - 0.5) * 0.25, c.y + 0.05, c.z + (RND() - 0.5) * 0.25, 0.2 + RND() * 0.2, 0.9 + RND() * 0.4, 0.1 + RND() * 0.1,
          c.big ? 9 : 6, c.big ? 0.45 : 0.3, c.big ? 0.7 : 0.45, g, g, g + 0.015, (c.big ? 0.6 : 0.45) * (1 - 0.6 * rainK)).plume = true;
      });
    }
    // в снег на морозе виден пар дыхания: облачко у рта раз в 2,5–3,5 с у ближних к камере рабочих
    breathClock += dt;
    if (snowK > 0.3 && breathClock > 0.25) {
      breathClock = 0;
      (workers || []).forEach(function (w) {
        if (!w.group || !w.group.visible || !w.pos) return;
        if (w.pos.distanceToSquared(opts.camera.position) > 600) return;
        w.breath = (w.breath === undefined ? RND() * 3 : w.breath) - 0.25;
        if (w.breath > 0) return;
        w.breath = 2.5 + RND();
        const hx = Math.sin(w.heading || 0), hz = Math.cos(w.heading || 0);
        const lying = w.anim && w.anim.action === 'sleep', low = w.anim && (w.anim.action === 'eat' || w.anim.action === 'rest');
        const y = w.pos.y + (lying ? 0.3 : low ? 1.1 : 1.58);
        for (let i = 0; i < 2; i++) P.emit(1, w.pos.x + hx * 0.16, y, w.pos.z + hz * 0.16, hx * (0.25 + RND() * 0.1), 0.03, hz * (0.25 + RND() * 0.1),
          1.2 + RND() * 0.5, 0.03, 0.16, 0.82, 0.85, 0.9, 0.12);
      });
    }
    // следы: середина опоры левой ноги — фаза шага 2πk, правой — 2πk + π (people.js); у ближних к камере
    if (FP) {
      snowClock += sim * snowK;
      FP.mesh.visible = FP.mesh.count > 0 && WEATHER.snow.value > 0.3;
      (workers || []).forEach(function (w) {
        if (!w.anim || !w.pos) return;
        const half = Math.floor((w.anim.phase || 0) / Math.PI);
        const was = w.stepHalf;
        w.stepHalf = half;
        if (was === undefined || half === was || snowCover < 0.35 || !w.group || !w.group.visible) return;
        if (w.pos.y > 0.25 || w.anim.speed < 0.05 || w.anim.action === 'climb' || w.pos.distanceToSquared(opts.camera.position) > 2500) return;
        const h = w.heading || 0, left = half % 2 === 0 ? 1 : -1;
        FP.add(w.pos.x + Math.cos(h) * 0.1 * left, w.pos.z - Math.sin(h) * 0.1 * left, h + 0.07 * left, snowClock, opts.ground);
      });
      FP.update(snowClock, dt);
    }
    (workers || []).forEach(function (w) {
      if (!w.fx || !w.fx.length) return;
      for (let i = 0; i < w.fx.length; i++) { burst(w.fx[i], w); if (opts.onFx) opts.onFx(w.fx[i]); }
      w.fx.length = 0;
    });
    P.update(dt);
    B.update(time);
    B.mesh.visible = st.night < 0.5 && rainK < 0.5;
  }
  // Эффект события движения: удар кирки — осколки цвета породы и облачко пыли; блок лёг — пыль раствора;
  // постукивание — пыль, по стали — искры; выдох — дым сигареты; приземление — пыль из-под ног.
  function burst(e, w) {
    const col = e.color || [0.55, 0.5, 0.44];
    const dry = 1 - Math.min(1, wet * 2);
    if (e.type === 'impact') {
      for (let i = 0; i < 9; i++) {
        const a = RND() * 6.283, s = 1.2 + RND() * 2.2;
        const k = 0.75 + RND() * 0.4;
        P.emit(3, e.x, e.y + 0.04, e.z, Math.cos(a) * s * 0.6, 1.4 + RND() * 2.4, Math.sin(a) * s * 0.6, 0.9 + RND() * 0.8,
          0.008 + RND() * 0.014, 0, col[0] * k, col[1] * k, col[2] * k, 1, e.y - 0.02);
      }
      for (let i = 0; i < 3; i++) P.emit(0, e.x + (RND() - 0.5) * 0.15, e.y + 0.05, e.z + (RND() - 0.5) * 0.15, (RND() - 0.5) * 0.5, 0.25 + RND() * 0.2, (RND() - 0.5) * 0.5,
        1.3 + RND(), 0.09, 0.45, col[0] * 0.9 + 0.08, col[1] * 0.9 + 0.07, col[2] * 0.9 + 0.06, 0.22 * dry);
    } else if (e.type === 'place') {
      for (let i = 0; i < 2; i++) P.emit(0, e.x + (RND() - 0.5) * 0.2, e.y + 0.02, e.z + (RND() - 0.5) * 0.2, (RND() - 0.5) * 0.25, 0.12, (RND() - 0.5) * 0.25,
        1.1 + RND() * 0.6, 0.06, 0.3, 0.62, 0.6, 0.56, 0.16 * dry);
      if (RND() < 0.6) P.emit(3, e.x, e.y + 0.02, e.z, (RND() - 0.5) * 0.8, 0.6 + RND() * 0.8, (RND() - 0.5) * 0.8, 0.8, 0.007, 0, 0.6, 0.58, 0.54, 1, e.y - 0.5);
    } else if (e.type === 'tap') {
      if (e.metal) {
        for (let i = 0; i < 10; i++) {
          const a = RND() * 6.283, s = 0.8 + RND() * 2.4;
          P.emit(4, e.x, e.y, e.z, Math.cos(a) * s, 0.6 + RND() * 2.2, Math.sin(a) * s, 0.25 + RND() * 0.4, 0.006 + RND() * 0.006, 0, 1.0, 0.55 + RND() * 0.2, 0.16, 1, e.y - 1.2);
        }
      } else if (RND() < 0.7) {
        P.emit(0, e.x, e.y + 0.02, e.z, (RND() - 0.5) * 0.2, 0.1, (RND() - 0.5) * 0.2, 0.9 + RND() * 0.5, 0.045, 0.22, 0.62, 0.6, 0.56, 0.12 * dry);
      }
    } else if (e.type === 'exhale') {
      for (let i = 0; i < 4; i++) P.emit(1, e.x, e.y, e.z, (e.dx || 0) * (0.22 + RND() * 0.15) + (RND() - 0.5) * 0.06, 0.04 + RND() * 0.04, (e.dz || 0) * (0.22 + RND() * 0.15) + (RND() - 0.5) * 0.06,
        2.2 + RND() * 1.2, 0.025, 0.2 + RND() * 0.08, 0.72, 0.74, 0.78, 0.2);
    } else if (e.type === 'land') {
      for (let i = 0; i < 4; i++) {
        const a = RND() * 6.283;
        P.emit(0, e.x + Math.cos(a) * 0.15, e.y, e.z + Math.sin(a) * 0.15, Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5, 1.2 + RND() * 0.5, 0.08, 0.35, 0.55, 0.47, 0.38, 0.15 * dry);
      }
    }
  }
  // деталь встала: пыль раствора поползла с её верха (стена — вдоль оси, плита и массив — по клетке)
  function puff(x, y, z, kind) {
    const dry = 1 - Math.min(1, wet * 2);
    if (dry <= 0.05) return;
    const n = kind === 'wall' || kind === 'pillar' ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const ox = (RND() - 0.5) * (kind === 'wall' ? 1.6 : 1.8), oz = (RND() - 0.5) * (kind === 'wall' ? 1.6 : 1.8);
      P.emit(0, x + ox, y + 0.03, z + oz, ox * 0.25, 0.1 + RND() * 0.1, oz * 0.25, 1.6 + RND(), 0.12, 0.42, 0.6, 0.57, 0.52, 0.12 * dry);
    }
  }
  return {
    group, update, puff,
    state: function () { return { day, cover, wet, rain: rainK, snow: snowK, snowCover, forced, prints: FP ? FP.mesh.count : -1 }; },
    // погода логики или принудительная (съёмка, проверки): 'rain' | 'snow' | 'clear' | null — по расписанию
    force: function (mode, instant) {
      forced = mode || null;
      if (instant) { const p = plan(lastHour || 12); cover = p.cover; rainK = p.rain; snowK = p.snow || 0; if (mode === 'rain') wet = 0.9; if (mode === 'clear') wet = 0; if (mode === 'snow') snowCover = 0.85; }
    },
  };
}
