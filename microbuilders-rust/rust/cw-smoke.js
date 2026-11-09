// Табачный дым бригады: тонкая струйка с тлеющего кончика сигареты (встаёт почти отвесно, расплывается, тает и
// уходит по ветру) и клуб над головой зовущего «Айда курить!». Выдох клубом у рта рисует life.js по событию
// фигуры 'exhale'. Все клубки — один InstancedBufferGeometry (один вызов отрисовки): квадрат лицом к камере, в
// шейдере — рваный клубок из шума, освещённый как объём (сторона к солнцу светлее, против солнца — просвет края).
// Порядок — от дальних к ближним (смешивание «поверх», premultiplied). G-буфер под дымом не трогается: выходы 1–5 —
// нули при смешивании, где альфа источника 0; на «Телефоне» (кадр прямо в холст) тон-маппинг и sRGB — в шейдере.
// Свет и камера для сортировки — ctx.sky и ctx.camera, если scene.js их передал; иначе камера — та, которой рисуют
// кадр (onBeforeRender), солнце — направленный свет сцены с тенью.
import * as THREE from 'three';

const TOBACCO = [0.72, 0.75, 0.79], CLOUD = [0.76, 0.76, 0.73];
// ветер у земли, м/с (как у пыли и дыма стройки)
const WIND = [0.55, 0.04, 0.3];

const VERT = /* glsl */ `
attribute vec4 aPos;   // xyz, радиус
attribute vec4 aCol;   // альбедо, прозрачность
attribute vec2 aMisc;  // зерно шума, поворот
varying vec2 vQ;
varying vec4 vCol;
varying float vSeed;
varying vec3 vW, vR, vU, vF;
void main() {
  vec3 P = aPos.xyz;
  vec3 F = normalize(cameraPosition - P);
  vec3 R = cross(vec3(0.0, 1.0, 0.0), F);
  R = dot(R, R) < 1e-6 ? vec3(1.0, 0.0, 0.0) : normalize(R);
  vec3 U = cross(F, R);
  float c = cos(aMisc.y), s = sin(aMisc.y);
  vec3 R2 = R * c + U * s;
  U = U * c - R * s;
  R = R2;
  vec2 q = position.xy * 2.0;
  vec3 w = P + (R * q.x + U * q.y) * aPos.w;
  vQ = q; vCol = aCol; vSeed = aMisc.x; vW = w; vR = R; vU = U; vF = F;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const FRAG = /* glsl */ `
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
uniform vec3 uSun, uSunDir, uSky;
varying vec2 vQ;
varying vec4 vCol;
varying float vSeed;
varying vec3 vW, vR, vU, vF;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  float r = length(vQ);
  if (r >= 1.0) discard;
  vec2 p = vQ * 1.5 + vSeed * 37.0;
  float n = vn(p) * 0.55 + vn(p * 2.13 + 7.1) * 0.3 + vn(p * 4.7 - 3.3) * 0.15;
  float dens = 1.0 - smoothstep(0.1, 0.95, r + (n - 0.5) * 0.9);
  if (dens <= 0.003) discard;
  float a = dens * vCol.a;
  float z = sqrt(max(0.0, 1.0 - r * r));
  vec3 N = normalize(vR * vQ.x + vU * vQ.y + vF * (z + 0.3));
  float wrap = clamp(dot(N, uSunDir) * 0.6 + 0.4, 0.0, 1.0);
  vec3 V = normalize(vW - cameraPosition);
  float fwd = pow(max(dot(V, uSunDir), 0.0), 6.0) * (1.0 - dens * 0.55);
  vec3 col = vCol.rgb * (uSun * (0.08 + 0.55 * wrap + 1.7 * fwd) + uSky * (0.75 + 0.35 * N.y));
  #ifdef TONE_MAPPING
  col = toneMapping(col);
  #endif
  col = linearToOutputTexel(vec4(col, 1.0)).rgb;
  outColor = vec4(col * a, a);
  gNormal = vec4(0.0); gInfo = vec4(0.0); gVelocity = vec4(0.0); gAlbedo = vec4(0.0); gIndirect = vec4(0.0);
}
`;

function ss(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

export function createSmoke(ctx, max) {
  max = max || 220;
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aM = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
  [aP, aC, aM].forEach(function (a) { a.setUsage(THREE.DynamicDrawUsage); });
  g.setAttribute('aPos', aP); g.setAttribute('aCol', aC); g.setAttribute('aMisc', aM);
  g.instanceCount = 0;
  const uniforms = { uSun: { value: new THREE.Vector3(3, 3, 3) }, uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() }, uSky: { value: new THREE.Vector3(0.4, 0.45, 0.55) } };
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'cw-smoke';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.visible = false;
  mesh.userData.noGI = true;
  // «Высокая» (post.js): затенение углов рисует сцену своим материалом — без нашего вершинного шейдера
  mesh.userData.noAO = true;
  let cam = ctx && ctx.camera ? ctx.camera : null, scene = null, sun = null;
  mesh.onBeforeRender = function (renderer, s, c) { if (!ctx || !ctx.camera) cam = c; scene = s; };

  // клубок: место, скорость (м/с), жизнь (с), радиус и рост (м/√с), цвет (линейный), прозрачность, задержка (с),
  // всплытие (м/с², по умолчанию — тёплый клуб выдоха)
  const list = [];
  const R = Math.random;
  function emit(x, y, z, vx, vy, vz, life, size, grow, col, a, wait, lift) {
    if (list.length >= max) list.shift();
    list.push({ x, y, z, vx, vy, vz, age: 0, life, size: size * (0.75 + R() * 0.5), grow: grow * (0.8 + R() * 0.4), col, a, wait: wait || 0,
      seed: R(), rot: R() * 6.283, spin: (R() - 0.5) * 0.8, d: 0, lift: lift === undefined ? 0.55 : lift });
  }
  // струйка с кончика: тонкая, встаёт почти отвесно на 30–50 см, расплывается и тает (с всплытием клуба выдоха
  // поднималась на 2–3 м ровной верёвкой — издали торчала над курилкой белыми нитями)
  function wisp(p) {
    emit(p.x, p.y + 0.004, p.z, (R() - 0.5) * 0.015, 0.06 + R() * 0.03, (R() - 0.5) * 0.015, 1.1 + R() * 0.5, 0.007, 0.075, TOBACCO, 0.13, 0, 0.16);
  }
  // клуб: облачко над головой зовущего (n клубков)
  function puff(x, y, z, dx, dz, n) {
    for (let i = 0; i < n; i++) {
      emit(x + (R() - 0.5) * 0.08, y + R() * 0.05, z + (R() - 0.5) * 0.08, dx * (0.2 + R() * 0.15) + (R() - 0.5) * 0.08, 0.06 + R() * 0.06,
        dz * (0.2 + R() * 0.15) + (R() - 0.5) * 0.08, 1.6 + R() * 0.9, 0.035, 0.15 + R() * 0.05, CLOUD, 0.26, i * 0.05);
    }
  }
  // свет: небо вида, если его дали (солнце, ночью — луна, что ярче); иначе — направленный свет сцены
  const _d = new THREE.Vector3(), _s = new THREE.Vector3();
  function light() {
    let color = null, intensity = 0;
    if (ctx && ctx.sky && ctx.sky.sun && ctx.sky.state) {
      const S = ctx.sky.sun, M = ctx.sky.moon;
      _s.copy(ctx.sky.state.sunDir);
      if (M && M.intensity > S.intensity) { color = M.color; intensity = M.intensity; _d.subVectors(M.position, M.target.position).normalize(); }
      else { color = S.color; intensity = S.intensity; _d.copy(_s); }
    } else {
      if (!sun && scene) scene.traverse(function (o) { if (!sun && o.isDirectionalLight && o.castShadow) sun = o; });
      if (!sun) return;
      color = sun.color; intensity = sun.intensity;
      _d.subVectors(sun.position, sun.target.position).normalize();
    }
    uniforms.uSunDir.value.copy(_d);
    uniforms.uSun.value.set(color.r, color.g, color.b).multiplyScalar(intensity / Math.PI);
    const day = ss((ctx && ctx.sky && ctx.sky.state ? _s : _d).y, -0.1, 0.25);
    uniforms.uSky.value.set(0.42, 0.52, 0.7).multiplyScalar(0.12 + 0.88 * day).addScalar(0.004);
  }
  const byDepth = function (u, v) { return v.d - u.d; };
  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) { list[i].age += dt; if (list[i].age >= list[i].wait + list[i].life) list.splice(i, 1); }
    if (!list.length) { g.instanceCount = 0; mesh.visible = false; return; }
    light();
    const cp = cam ? cam.position : null;
    const k = 1 - Math.exp(-0.9 * dt);
    const live = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s.age < s.wait) continue;
      // воздух тормозит до скорости ветра; всплытие гаснет вместе с подъёмом
      s.vx += (WIND[0] - s.vx) * k; s.vz += (WIND[2] - s.vz) * k;
      s.vy = (s.vy + s.lift * dt) * Math.exp(-0.45 * dt);
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      s.rot += s.spin * dt;
      s.d = cp ? (s.x - cp.x) * (s.x - cp.x) + (s.y - cp.y) * (s.y - cp.y) + (s.z - cp.z) * (s.z - cp.z) : 0;
      live.push(s);
    }
    if (cp && live.length > 1) live.sort(byDepth);
    const P = aP.array, C = aC.array, M = aM.array;
    for (let j = 0; j < live.length; j++) {
      const s = live[j], age = s.age - s.wait, t = age / s.life;
      const fade = ss(t, 0, 0.12) * (1 - ss(t, 0.35, 1));
      P[j * 4] = s.x; P[j * 4 + 1] = s.y; P[j * 4 + 2] = s.z; P[j * 4 + 3] = s.size + s.grow * Math.sqrt(age);
      C[j * 4] = s.col[0]; C[j * 4 + 1] = s.col[1]; C[j * 4 + 2] = s.col[2]; C[j * 4 + 3] = s.a * fade;
      M[j * 2] = s.seed; M[j * 2 + 1] = s.rot;
    }
    g.instanceCount = live.length;
    mesh.visible = live.length > 0;
    aP.needsUpdate = aC.needsUpdate = aM.needsUpdate = true;
  }
  function clear() { list.length = 0; g.instanceCount = 0; mesh.visible = false; }
  return { mesh, wisp, puff, update, clear };
}
