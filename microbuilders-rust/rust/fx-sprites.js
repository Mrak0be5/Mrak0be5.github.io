// Мягкие частицы эффектов стройки (fx.js): пыль кладки и приземления, волна пыли яруса, дым выхлопа, искры по
// металлу, блики стекла и золота. Все виды — один InstancedBufferGeometry (один вызов отрисовки): спрайт лицом
// к камере, форма и свет — в шейдере. Пыль и дым — клубок с шумом, освещённый как объём: сторона к солнцу
// светлее, против солнца — просвет; быстрый клуб смазан вдоль скорости (пелена из шва), вблизи прозрачнее, с
// зума игрока гуще и крупнее; искра — горячий штрих по скорости, блик — четырёхлучевая звёздочка.
// Физика на CPU: сопротивление воздуха (пыль и дым сносит ветром), всплытие или тяжесть, отскок искр от пола,
// задержка появления (волна по ярусу). Порядок — от дальних к ближним (смешивание «поверх»). Тень: в тени
// здания (shade(x, y, z) — луч к солнцу по сетке клеток, fx.js) клуб освещён только небом, блик гаснет; луч
// у каждой частицы — раз в несколько кадров, свет меняется плавно.
// Прозрачное не трогает G-буфер под собой: выходы 1–5 — нули при смешивании с premultiplied alpha. На «Телефоне»
// кадр идёт прямо в холст (mobile.js) — тогда тон-маппинг и sRGB делает сам шейдер (TONE_MAPPING от three.js).
import * as THREE from 'three';

export const DUST = 0, SMOKE = 1, SPARK = 2, GLINT = 3;
// ветер у земли, м/с (по направлению ветра травы и шлейфа труб)
export const WIND = [0.55, 0.04, 0.3];

export const GB_OUT = /* glsl */ `
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
void gbZero() { gNormal = vec4(0.0); gInfo = vec4(0.0); gVelocity = vec4(0.0); gAlbedo = vec4(0.0); gIndirect = vec4(0.0); }
`;
// конец фрагмента: цвет без premultiply (HDR) → холст «Телефона» или линейная цель кадра; add — свечение поверх
export const FX_OUT = /* glsl */ `
void fxOut(vec3 col, float a, float add) {
  #ifdef TONE_MAPPING
  col = toneMapping(col);
  #endif
  col = linearToOutputTexel(vec4(col, 1.0)).rgb;
  outColor = vec4(col * a, a * (1.0 - add));
  gbZero();
}
`;

const VERT = /* glsl */ `
attribute vec4 aPos;   // xyz, радиус
attribute vec4 aCol;   // альбедо (пыль, дым) или цвет свечения; прозрачность
attribute vec4 aMisc;  // вид, зерно шума, поворот, приплюснутость (пыль у земли стелется)
attribute vec4 aVel;   // скорость: штрих искры; у клуба — относительно воздуха (смаз); w — пол под клубом
attribute float aLit;  // доля прямого солнца (0 — в тени здания)
uniform float uFar;    // насколько крупнее клуб с зума игрока (на маленьком экране — больше)
varying vec2 vQ;
varying float vLit;
varying vec4 vCol;
varying vec2 vKS;
varying vec3 vW;
varying vec3 vR;
varying vec3 vU;
varying vec3 vF;
varying vec2 vFloor;
void main() {
  vec3 P = aPos.xyz;
  float s = aPos.w;
  vec3 F = normalize(cameraPosition - P);
  vec3 R = cross(vec3(0.0, 1.0, 0.0), F);
  R = dot(R, R) < 1e-6 ? vec3(1.0, 0.0, 0.0) : normalize(R);
  vec3 U = cross(F, R);
  vec2 q = position.xy * 2.0;
  vec3 w;
  if (aMisc.x > 1.5 && aMisc.x < 2.5) {
    // искра — штрих вдоль скорости на экране (выдержка ~1/40 с)
    vec3 v = aVel.xyz - F * dot(aVel.xyz, F);
    float len = length(v);
    vec3 dir = len > 1e-4 ? v / len : U;
    vec3 side = normalize(cross(dir, F));
    w = P + side * q.x * s + dir * q.y * (s + len * 0.04);
    R = side; U = dir;
  } else {
    float dist = length(cameraPosition - P);
    // блик не больше ~1,7° поля зрения: вблизи не расплывается в диск
    if (aMisc.x > 2.5) s = min(s, dist * 0.03);
    // клуб с зума игрока чуть крупнее: читается, хоть и мелок на экране
    else s *= 1.0 + uFar * smoothstep(12.0, 50.0, dist);
    float c = cos(aMisc.z), sn = sin(aMisc.z);
    vec3 R2 = R * c + U * sn;
    U = U * c - R * sn;
    R = R2;
    w = P + (R * q.x + U * q.y) * s;
    if (aMisc.x < 1.5) {
      // быстрый клуб (пыль, выбитая из шва) смазан вдоль скорости — пелена, а не шар; затих — снова клубок
      vec3 v = aVel.xyz - F * dot(aVel.xyz, F);
      float len = length(v);
      if (len > 0.05) { vec3 dir = v / len; w += dir * dot(w - P, dir) * min(len * 0.5, 1.4); }
    }
    w.y = P.y + (w.y - P.y) * (1.0 - aMisc.w);
  }
  vQ = q; vCol = aCol; vKS = aMisc.xy; vW = w; vR = R; vU = U; vF = F; vLit = aLit;
  // пол под клубом и высота мягкого низа: спрайт гаснет к линии, где уходит в землю или плиту (без жёсткого среза)
  vFloor = vec2(aVel.w, max(0.08, s * 0.25));
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

const FRAG = GB_OUT + /* glsl */ `
uniform vec3 uSun, uSunDir, uSky;
varying vec2 vQ;
varying vec4 vCol;
varying vec2 vKS;
varying vec3 vW;
varying vec3 vR;
varying vec3 vU;
varying vec3 vF;
varying float vLit;
varying vec2 vFloor;
layout(location = 0) out highp vec4 outColor;
` + FX_OUT + /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  float r = length(vQ);
  if (r >= 1.0) discard;
  float kind = vKS.x;
  vec3 col;
  float a, add = 0.0;
  if (kind > 2.5) {
    // блик: мягкий центр и четыре тонких луча
    vec2 q = abs(vQ);
    float rays = max(0.0, 1.0 - q.x * 16.0) * (1.0 - q.y) + max(0.0, 1.0 - q.y * 16.0) * (1.0 - q.x);
    // в тени здания солнцу нечего отражать: блик слабее (но виден — деталь встала)
    a = (exp(-r * 9.0) * 1.1 + rays * rays) * vCol.a * (0.4 + 0.6 * vLit);
    col = vCol.rgb * 16.0;
    add = 1.0;
  } else if (kind > 1.5) {
    // искра: белое ядро, оранжевый ореол
    float core = 1.0 - smoothstep(0.0, 0.55, r);
    a = (1.0 - smoothstep(0.15, 1.0, r)) * vCol.a;
    col = mix(vCol.rgb, vec3(1.0, 0.92, 0.75), core * core) * (3.0 + 20.0 * core * core);
    add = 1.0;
  } else {
    // пыль и дым: рваный клубок (три октавы шума в осях частицы), свет — как у объёма
    vec2 p = vQ * 1.5 + vKS.y * 37.0;
    float n = vnoise(p) * 0.55 + vnoise(p * 2.13 + 7.1) * 0.3 + vnoise(p * 4.7 - 3.3) * 0.15;
    float dens = 1.0 - smoothstep(0.12, 0.95, r + (n - 0.5) * 0.95);
    if (dens <= 0.003) discard;
    // вблизи клуб прозрачнее (видна пелена), с зума игрока гуще — читается
    a = dens * vCol.a * mix(0.78, 1.35, smoothstep(8.0, 40.0, length(vW - cameraPosition)));
    a *= smoothstep(0.0, vFloor.y, vW.y - vFloor.x);
    if (a <= 0.002) discard;
    float z = sqrt(max(0.0, 1.0 - r * r));
    vec3 N = normalize(vR * vQ.x + vU * vQ.y + vF * (z + 0.3));
    float wrap = clamp(dot(N, uSunDir) * 0.6 + 0.4, 0.0, 1.0);
    vec3 V = normalize(vW - cameraPosition);
    // просвет: солнце за клубком — светится край и редкая часть
    float fwd = pow(max(dot(V, uSunDir), 0.0), 6.0) * (1.0 - dens * 0.55);
    // полупрозрачный клуб рассеивает меньше света, чем твёрдая поверхность того же цвета
    col = vCol.rgb * (uSun * (vLit * (0.08 + 0.55 * wrap + 1.7 * fwd)) + uSky * (0.75 + 0.35 * N.y));
  }
  fxOut(col, a, add);
}
`;

// поля частицы
const F = 23;
const X = 0, Y = 1, Z = 2, VX = 3, VY = 4, VZ = 5, AGE = 6, LIFE = 7, WAIT = 8, SIZE = 9, GROW = 10,
  R = 11, G = 12, B = 13, A = 14, KIND = 15, SEED = 16, ROT = 17, SPIN = 18, GRAV = 19, DRAG = 20, FLOOR = 21, LIT = 22;
const SHADE_EVERY = 6;   // луч к солнцу у частицы — раз в столько кадров

function ss(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// max — сколько частиц сразу (при переполнении новая вытесняет ту, что и так вот-вот растает); shade(x, y, z) →
// 0..1 — прямое солнце в точке; far — прибавка размера клуба с зума игрока (0,5 — ×1,5)
export function createSprites(max, shade, far) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aM = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aV = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aL = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
  const attrs = [aP, aC, aM, aV, aL];
  attrs.forEach(function (a) { a.setUsage(THREE.DynamicDrawUsage); });
  g.setAttribute('aPos', aP); g.setAttribute('aCol', aC); g.setAttribute('aMisc', aM); g.setAttribute('aVel', aV); g.setAttribute('aLit', aL);
  g.instanceCount = 0;
  const uniforms = { uSun: { value: new THREE.Vector3(3, 3, 3) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSky: { value: new THREE.Vector3(0.4, 0.45, 0.55) }, uFar: { value: far === undefined ? 0.5 : far } };
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'fx-sprites';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.userData.noGI = true;
  // «Высокая» (post.js): затенение углов рисует сцену своим материалом нормалей — без нашего вершинного шейдера
  // экземпляры легли бы квадратом 1 × 1 м в начало координат; прозрачному затенение углов и не нужно
  mesh.userData.noAO = true;

  const d = new Float32Array(max * F);
  let n = 0;
  const order = new Uint16Array(max), depth = new Float32Array(max);
  const byDepth = function (a, b) { return depth[b] - depth[a]; };
  const _c = new THREE.Color();

  // Частица: вид, место, скорость (м/с), жизнь (с), радиус и рост (м/√с), цвет (hex sRGB или [r, g, b] линейный),
  // прозрачность, задержка появления (с), пол (м).
  function emit(kind, x, y, z, vx, vy, vz, life, size, grow, color, alpha, wait, floor) {
    if (n >= max) remove(dying());
    const o = n * F;
    n++;
    if (typeof color === 'number') { _c.setHex(color); d[o + R] = _c.r; d[o + G] = _c.g; d[o + B] = _c.b; }
    else { d[o + R] = color[0]; d[o + G] = color[1]; d[o + B] = color[2]; }
    d[o + X] = x; d[o + Y] = y; d[o + Z] = z; d[o + VX] = vx; d[o + VY] = vy; d[o + VZ] = vz;
    d[o + AGE] = 0; d[o + LIFE] = life; d[o + WAIT] = wait || 0; d[o + SIZE] = size; d[o + GROW] = grow;
    d[o + A] = alpha; d[o + KIND] = kind; d[o + SEED] = Math.random(); d[o + ROT] = Math.random() * 6.283;
    // клубы разной величины
    if (kind <= SMOKE) { const k = 0.7 + Math.random() * 0.6; d[o + SIZE] *= k; d[o + GROW] *= 0.8 + Math.random() * 0.4; }
    d[o + SPIN] = kind <= SMOKE ? (Math.random() - 0.5) * 0.8 : 0;
    // всплытие (+) или тяжесть (−), м/с²; сопротивление, 1/с
    d[o + GRAV] = kind === SPARK ? -9.8 : kind === SMOKE ? 0.55 : kind === DUST ? 0.1 : 0;
    d[o + DRAG] = kind === SPARK ? 0.35 : kind === SMOKE ? 0.9 : kind === DUST ? 2.4 : 0;
    d[o + FLOOR] = floor === undefined ? -1e9 : floor;
    d[o + LIT] = shade && kind !== SPARK ? shade(x, y, z) : 1;
    return o;
  }
  function remove(i) {
    n--;
    if (i !== n) d.copyWithin(i * F, n * F, n * F + F);
  }
  // кому осталось жить меньше всех (с задержкой появления): её место — новой
  function dying() {
    let k = 0, best = Infinity;
    for (let i = 0; i < n; i++) {
      const o = i * F, left = d[o + WAIT] + d[o + LIFE] - d[o + AGE];
      if (left < best) { best = left; k = i; }
    }
    return k;
  }

  const P = aP.array, C = aC.array, M = aM.array, V = aV.array, L = aL.array;
  let frame = 0;
  function update(dt, camera) {
    const cam = camera.position;
    frame++;
    const ease = Math.min(1, dt * 6);
    for (let i = n - 1; i >= 0; i--) {
      const o = i * F;
      d[o + AGE] += dt;
      if (d[o + AGE] >= d[o + WAIT] + d[o + LIFE]) { remove(i); continue; }
      if (d[o + AGE] < d[o + WAIT]) continue;
      const kind = d[o + KIND];
      if (kind === SPARK) {
        d[o + VY] += d[o + GRAV] * dt;
        const k = 1 - Math.min(1, d[o + DRAG] * dt);
        d[o + VX] *= k; d[o + VY] *= k; d[o + VZ] *= k;
        d[o + X] += d[o + VX] * dt; d[o + Y] += d[o + VY] * dt; d[o + Z] += d[o + VZ] * dt;
        if (d[o + Y] < d[o + FLOOR]) { d[o + Y] = d[o + FLOOR]; d[o + VY] = Math.abs(d[o + VY]) * 0.32; d[o + VX] *= 0.5; d[o + VZ] *= 0.5; }
      } else if (kind <= SMOKE) {
        // воздух тормозит до скорости ветра; всплытие гаснет вместе с подъёмом
        const k = 1 - Math.exp(-d[o + DRAG] * dt);
        d[o + VX] += (WIND[0] - d[o + VX]) * k;
        d[o + VZ] += (WIND[2] - d[o + VZ]) * k;
        d[o + VY] = (d[o + VY] + d[o + GRAV] * dt) * Math.exp(-d[o + DRAG] * 0.5 * dt);
        d[o + X] += d[o + VX] * dt; d[o + Y] += d[o + VY] * dt; d[o + Z] += d[o + VZ] * dt;
        d[o + ROT] += d[o + SPIN] * dt;
        // низ клуба — у пола: клуб растёт — вспухает вверх, пол не прорезает (тот же радиус, что в отрисовке)
        const low = d[o + FLOOR] + (d[o + SIZE] + d[o + GROW] * Math.sqrt(d[o + AGE] - d[o + WAIT])) * 0.45;
        if (d[o + Y] < low) { d[o + Y] = low; if (d[o + VY] < 0) d[o + VY] = 0; }
      }
      // солнце: клуб выплывает из тени здания или заходит в неё
      if (shade && kind !== SPARK && (i + frame) % SHADE_EVERY === 0) d[o + LIT] += (shade(d[o + X], d[o + Y], d[o + Z]) - d[o + LIT]) * Math.min(1, ease * SHADE_EVERY);
    }
    // видимые — от дальних к ближним
    let m = 0;
    for (let i = 0; i < n; i++) {
      const o = i * F;
      if (d[o + AGE] < d[o + WAIT]) continue;
      const dx = d[o + X] - cam.x, dy = d[o + Y] - cam.y, dz = d[o + Z] - cam.z;
      depth[i] = dx * dx + dy * dy + dz * dz;
      order[m++] = i;
    }
    if (m > 1) order.subarray(0, m).sort(byDepth);
    for (let j = 0; j < m; j++) {
      const o = order[j] * F;
      const kind = d[o + KIND];
      const age = d[o + AGE] - d[o + WAIT];
      const t = age / d[o + LIFE];
      let fade, size = d[o + SIZE];
      if (kind === DUST) { fade = ss(t, 0, 0.1) * Math.pow(1 - t, 1.4); size += d[o + GROW] * Math.sqrt(age); }
      else if (kind === SMOKE) { fade = ss(t, 0, 0.12) * (1 - ss(t, 0.35, 1)); size += d[o + GROW] * Math.sqrt(age); }
      else if (kind === SPARK) fade = (1 - t) * (1 - t);
      else { fade = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75; fade *= fade; size *= 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, t * 1.3)); }
      P[j * 4] = d[o + X]; P[j * 4 + 1] = d[o + Y]; P[j * 4 + 2] = d[o + Z]; P[j * 4 + 3] = size;
      C[j * 4] = d[o + R]; C[j * 4 + 1] = d[o + G]; C[j * 4 + 2] = d[o + B]; C[j * 4 + 3] = d[o + A] * fade;
      M[j * 4] = kind; M[j * 4 + 1] = d[o + SEED]; M[j * 4 + 2] = d[o + ROT];
      M[j * 4 + 3] = kind === DUST ? 0.42 * (1 - ss(d[o + Y] - d[o + FLOOR], 0.15, 1.6)) : 0;
      if (kind <= SMOKE) { V[j * 4] = d[o + VX] - WIND[0]; V[j * 4 + 1] = d[o + VY] - WIND[1]; V[j * 4 + 2] = d[o + VZ] - WIND[2]; }
      else { V[j * 4] = d[o + VX]; V[j * 4 + 1] = d[o + VY]; V[j * 4 + 2] = d[o + VZ]; }
      V[j * 4 + 3] = Math.max(-1e4, d[o + FLOOR]);
      L[j] = d[o + LIT];
    }
    g.instanceCount = m;
    mesh.visible = m > 0;
    if (m > 0) attrs.forEach(function (a) { a.needsUpdate = true; });
  }

  // свет: солнце (как ламберт — сила / π), небо, направление на солнце
  function light(sky) {
    const s = sky.sun, st = sky.state;
    uniforms.uSunDir.value.copy(st.sunDir);
    uniforms.uSun.value.set(s.color.r, s.color.g, s.color.b).multiplyScalar(s.intensity / Math.PI);
    const day = ss(st.sunDir.y, -0.1, 0.25);
    uniforms.uSky.value.set(0.42, 0.52, 0.7).multiplyScalar(0.12 + 0.88 * day).addScalar(0.004);
  }

  return { mesh, emit, update, light, clear: function () { n = 0; g.instanceCount = 0; mesh.visible = false; }, count: function () { return n; } };
}
