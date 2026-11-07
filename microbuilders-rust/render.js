// Кадр «Максимума» и «Ультра» — свой конвейер вместо EffectComposer:
// 1) сцена одним проходом в G-буфер (цвет HDR, нормаль и шероховатость, доля рассеянного света, скорость),
//    проекция каждый кадр сдвинута на долю пикселя (последовательность Халтона);
// 2) движущиеся объекты (рабочие, тачки, ноша) — второй проход только скорости, с прошлыми матрицами и костями;
// 3) затенение углов GTAO по G-буферу — гасит только рассеянный свет; объёмный свет и блик солнца;
// 4) временное сглаживание (TAA): история в разрешении экрана, перепроекция по скорости или глубине,
//    отсечение по соседям в YCoCg; разрешение счёта может быть ниже экрана (динамическое разрешение);
// 5) свечение каскадом уменьшенных копий (без порога, доля энергии), автоэкспозиция по средней яркости,
//    тонмаппинг AgX со своим «взглядом» (контраст и насыщенность), резкость, виньетка, зерно.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { VolumePass, QUAD_VERT, FLARE_GLSL, FINISH } from './post.js?v=0c1cc5f';
import { createClouds } from './clouds.js?v=0c1cc5f';
import { createGI } from './gi.js?v=0c1cc5f';

// Корни движущихся объектов: их меши дорисовывают скорость (слой 2).
export const DYNAMIC = new Set();
export function markDynamic(obj) { DYNAMIC.add(obj); return obj; }
const DYN_LAYER = 2;

function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
const JITTER = Array.from({ length: 8 }, function (_, i) { return [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]; });

function quad(fragmentShader, uniforms, defines) {
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: QUAD_VERT, fragmentShader, defines: defines || {}, depthTest: false, depthWrite: false });
  return { m, q: new FullScreenQuad(m), u: m.uniforms };
}
function target(w, h, opts) {
  return new THREE.WebGLRenderTarget(w, h, Object.assign({ type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }, opts || {}));
}

// GTAO по готовому G-буферу: только расчёт и шумоподавление, без вывода в кадр.
class GBufferAO extends GTAOPass {
  constructor(scene, camera, scale, depthTexture, normalTexture) {
    super(scene, camera, 16, 16);
    this.scale = scale;
    this.setGBuffer(depthTexture, normalTexture);
  }
  setSize(w, h) {
    const sc = w * h > 4.2e6 ? Math.min(this.scale, 0.5) : this.scale;
    super.setSize(Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
  }
  compute(renderer) {
    const cam = this.camera, g = this.gtaoMaterial.uniforms;
    g.cameraNear.value = cam.near;
    g.cameraFar.value = cam.far;
    g.cameraProjectionMatrix.value.copy(cam.projectionMatrix);
    g.cameraProjectionMatrixInverse.value.copy(cam.projectionMatrixInverse);
    g.cameraWorldMatrix.value.copy(cam.matrixWorld);
    this.renderPass(renderer, this.gtaoMaterial, this.gtaoRenderTarget, 0xffffff, 1.0);
    this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(cam.projectionMatrixInverse);
    this.renderPass(renderer, this.pdMaterial, this.pdRenderTarget, 0xffffff, 1.0);
    return this.pdRenderTarget.texture;
  }
}

// ---------- скорость движущихся объектов ----------
// Те же преобразования, что у основного прохода (для глубины), плюс прошлые матрица объекта и кости.
const VELOCITY_VERT = /* glsl */ `
#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
uniform mat4 uPrevModel, uCurVP, uPrevVP;
uniform highp sampler2D uPrevBones;
uniform float uHasPrevBones;
out vec4 vCur;
out vec4 vPrev;
mat4 prevBone(const in float i) {
  int size = textureSize(uPrevBones, 0).x;
  int j = int(i) * 4;
  int x = j % size, y = j / size;
  return mat4(texelFetch(uPrevBones, ivec2(x, y), 0), texelFetch(uPrevBones, ivec2(x + 1, y), 0),
              texelFetch(uPrevBones, ivec2(x + 2, y), 0), texelFetch(uPrevBones, ivec2(x + 3, y), 0));
}
void main() {
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  vec3 restPos = transformed;
  #include <skinning_vertex>
  #include <project_vertex>
  vec4 wCur, wPrev;
  #ifdef USE_SKINNING
    // кость уже в мировых координатах (bindMatrixInverse и модель сокращаются)
    vec4 sv = bindMatrix * vec4(restPos, 1.0);
    wCur = modelMatrix * vec4(transformed, 1.0);
    if (uHasPrevBones > 0.5) {
      mat4 a = prevBone(skinIndex.x), b = prevBone(skinIndex.y), c = prevBone(skinIndex.z), d = prevBone(skinIndex.w);
      wPrev = a * sv * skinWeight.x + b * sv * skinWeight.y + c * sv * skinWeight.z + d * sv * skinWeight.w;
      wPrev /= max(wPrev.w, 1e-6);
    } else wPrev = wCur;
  #else
    wCur = modelMatrix * vec4(transformed, 1.0);
    wPrev = uPrevModel * vec4(transformed, 1.0);
  #endif
  vCur = uCurVP * wCur;
  vPrev = uPrevVP * wPrev;
}
`;
const VELOCITY_FRAG = /* glsl */ `
in vec4 vCur;
in vec4 vPrev;
layout(location = 3) out highp vec4 outVelocity;
void main() {
  vec2 c = vCur.xy / vCur.w, p = vPrev.xy / vPrev.w;
  outVelocity = vec4((c - p) * 0.5, 0.0, 1.0);
}
`;

// ---------- отражения в экране (лужи, стёкла, мокрое) ----------
// Половинное разрешение, только гладкие поверхности (шероховатость < 0,4): луч отражения по глубине
// 28 шагами с уточнением, цвет попадания — из прошлого кадра (история сглаживания) по перепроекции.
const SSR_FRAG = /* glsl */ `
uniform sampler2D tDepth, tNormal, tPrev;
uniform mat4 uProj, uInvProj, uViewInv, uPrevVP;
uniform float uFrame;
varying vec2 vUv;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
vec3 viewPos(vec2 uv, float d) { vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return v.xyz / v.w; }
void main() {
  float d = texture2D(tDepth, vUv).x;
  vec4 nr = texture2D(tNormal, vUv);
  if (d >= 1.0 || nr.a > 0.4) { gl_FragColor = vec4(0.0); return; }
  vec3 N = normalize(nr.rgb * 2.0 - 1.0);
  vec3 P = viewPos(vUv, d);
  vec3 V = normalize(P);
  vec3 R = normalize(reflect(V, N));
  if (R.z > 0.35) { gl_FragColor = vec4(0.0); return; }
  float jit = fract(ign(gl_FragCoord.xy) + uFrame * 0.618034);
  float t = 0.04 + jit * 0.08, hitT = -1.0;
  vec2 hitUV = vec2(0.0);
  float prevT = 0.0;
  for (int i = 0; i < 28; i++) {
    vec3 Q = P + R * t;
    vec4 c = uProj * vec4(Q, 1.0);
    vec2 uv = c.xy / c.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 || c.w <= 0.0) break;
    float sd = textureLod(tDepth, uv, 0.0).x;
    float sz = viewPos(uv, sd).z;
    float th = 0.15 + t * 0.06;
    if (Q.z <= sz && Q.z > sz - th && sd < 1.0) {
      // уточнение делением пополам
      float a = prevT, b = t;
      for (int k = 0; k < 5; k++) {
        float m = 0.5 * (a + b);
        vec3 Qm = P + R * m;
        vec4 cm = uProj * vec4(Qm, 1.0);
        vec2 um = cm.xy / cm.w * 0.5 + 0.5;
        if (Qm.z <= viewPos(um, textureLod(tDepth, um, 0.0).x).z) b = m; else a = m;
      }
      vec4 cb = uProj * vec4(P + R * b, 1.0);
      hitUV = cb.xy / cb.w * 0.5 + 0.5;
      hitT = b;
      break;
    }
    prevT = t;
    t *= 1.22;
    t += 0.03;
  }
  if (hitT < 0.0) { gl_FragColor = vec4(0.0); return; }
  // цвет — из прошлого кадра
  vec3 W = (uViewInv * vec4(viewPos(hitUV, textureLod(tDepth, hitUV, 0.0).x), 1.0)).xyz;
  vec4 pc = uPrevVP * vec4(W, 1.0);
  vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  vec3 col = textureLod(tPrev, puv, 0.0).rgb;
  vec2 e = min(hitUV, 1.0 - hitUV);
  float conf = smoothstep(0.0, 0.08, min(e.x, e.y)) * (1.0 - smoothstep(0.1, 0.4, nr.a)) * (1.0 - smoothstep(-0.1, 0.35, R.z)) * (1.0 - smoothstep(18.0, 30.0, hitT));
  gl_FragColor = vec4(min(col, vec3(60.0)), conf);
}
`;

// ---------- размытие в движении ----------
// После сглаживания: 9 выборок вдоль скорости пикселя (выдержка — половина кадра), передний план с малой
// скоростью не размазывается по движущемуся фону. Неподвижная камера и предметы — без затрат.
const MBLUR_FRAG = /* glsl */ `
uniform sampler2D tColor, tVelocity, tDepth;
uniform mat4 uInvVP, uPrevVP, uCurVP;
uniform vec2 uRTexel, uOTexel, uJitter;
uniform float uShutter, uMaxPx;
varying vec2 vUv;
vec2 motion(vec2 uvJ, float d) {
  vec4 vel = textureLod(tVelocity, uvJ, 0.0);
  if (vel.a > 0.5) return vel.xy;
  vec4 wp = uInvVP * vec4(uvJ * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  wp /= wp.w;
  vec4 pc = uPrevVP * wp, cc = uCurVP * wp;
  return (cc.xy / cc.w - pc.xy / pc.w) * 0.5;
}
void main() {
  vec2 uvJ = vUv + uJitter;
  float d0 = texture2D(tDepth, uvJ).x;
  vec2 v = motion(uvJ, d0) * uShutter;
  float px = length(v / uOTexel);
  vec3 c0 = texture2D(tColor, vUv).rgb;
  if (px < 0.6) { gl_FragColor = vec4(c0, 1.0); return; }
  if (px > uMaxPx) v *= uMaxPx / px;
  vec3 sum = c0; float ws = 1.0;
  for (int i = 0; i < 8; i++) {
    float t = (float(i) + 0.5) / 8.0 - 0.5;
    vec2 uv = vUv + v * t;
    float d = textureLod(tDepth, uv + uJitter, 0.0).x;
    // ближе и почти неподвижно — не размазывать
    float w = d < d0 - 0.0005 ? clamp(length(motion(uv + uJitter, d) * uShutter / uOTexel) / max(px, 1.0), 0.0, 1.0) : 1.0;
    sum += textureLod(tColor, uv, 0.0).rgb * w; ws += w;
  }
  gl_FragColor = vec4(sum / ws, 1.0);
}
`;

// ---------- смешение света ----------
const COMPOSE_FRAG = FLARE_GLSL + /* glsl */ `
uniform sampler2D tColor, tInfo, tAO, tVol, tCloud, tDepth, tAlbedo, tIndirect, tGI, tSSR, tNormal;
uniform mat4 uInvProj;
uniform vec2 uTexel, uVolTexel;
uniform float uAO, uVol, uCloud, uGI, uSSR;
varying vec2 vUv;
bool bad(vec3 c) {
  uvec3 u = floatBitsToUint(c) & uvec3(0x7fffffffu);
  return any(greaterThanEqual(u, uvec3(0x7f800000u))) || any(lessThan(c, vec3(0.0)));
}
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  if (bad(c)) {
    vec3 s = vec3(0.0); float n = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982;
      vec3 q = texture2D(tColor, vUv + vec2(cos(a), sin(a)) * uTexel * 1.5).rgb;
      if (!bad(q)) { s += q; n += 1.0; }
    }
    c = n > 0.0 ? s / n : vec3(0.0);
  }
  c = min(c, vec3(300.0));
  // объёмные облака — только на небе (дальше любого предмета)
  if (uCloud > 0.5 && texture2D(tDepth, vUv).x >= 1.0) {
    vec4 cl = texture2D(tCloud, vUv);
    c = c * cl.a + cl.rgb;
  }
  {
    // рассеянный свет окружения (из G-буфера) заменяется: × доля открытого неба (конусы по вокселям) +
    // отражённый свет от поверхностей вокруг, всё × затенение углов; отражения окружения — по тем же долям
    vec4 info = texture2D(tInfo, vUv);
    float ao = uAO > 0.5 ? mix(1.0, texture2D(tAO, vUv).r, info.g) : 1.0;
    vec4 gi = uGI > 0.5 ? texture2D(tGI, vUv) : vec4(0.0, 0.0, 0.0, 1.0);
    vec3 ind = texture2D(tIndirect, vUv).rgb;
    vec3 alb = texture2D(tAlbedo, vUv).rgb;
    vec3 indNew = (ind * gi.a + alb * gi.rgb * 0.3183099) * ao;
    c = max(c + indNew - ind, vec3(0.0));
    float so = min(ao, mix(1.0, gi.a, 0.7));
    vec3 specEnv = c * info.r;
    c *= 1.0 - info.r * (1.0 - so);
    // отражения в экране заменяют отражение окружения там, где луч нашёл поверхность
    if (uSSR > 0.5) {
      vec4 r = texture2D(tSSR, vUv);
      if (r.a > 0.01) {
        vec4 nr = texture2D(tNormal, vUv);
        vec3 N = normalize(nr.rgb * 2.0 - 1.0);
        vec4 vp = uInvProj * vec4(vUv * 2.0 - 1.0, texture2D(tDepth, vUv).x * 2.0 - 1.0, 1.0);
        vec3 V = normalize(-vp.xyz / vp.w);
        float F0 = max(info.b, 0.02);
        float F = (F0 + (1.0 - F0) * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0)) * (1.0 - nr.a) * (1.0 - nr.a);
        c = max(c + r.a * (r.rgb * F - specEnv * so), vec3(0.0));
      }
    }
  }
  if (uVol > 0.5) {
    c += texture2D(tVol, vUv).rgb * 0.36 + (texture2D(tVol, vUv + vec2(uVolTexel.x, 0.0)).rgb + texture2D(tVol, vUv - vec2(uVolTexel.x, 0.0)).rgb
       + texture2D(tVol, vUv + vec2(0.0, uVolTexel.y)).rgb + texture2D(tVol, vUv - vec2(0.0, uVolTexel.y)).rgb) * 0.16;
  }
  c += lensFlare(tColor, vUv, uTexel);
  gl_FragColor = vec4(c, 1.0);
}
`;

// ---------- временное сглаживание ----------
const TAA_FRAG = /* glsl */ `
uniform sampler2D tColor, tHistory, tVelocity, tDepth;
uniform vec2 uRTexel, uJitter;
uniform mat4 uInvVP, uPrevVP, uCurVP;
uniform float uReset, uFeedback;
varying vec2 vUv;
vec3 toY(vec3 c) { return vec3(dot(c, vec3(0.25, 0.5, 0.25)), dot(c, vec3(0.5, 0.0, -0.5)), dot(c, vec3(-0.25, 0.5, -0.25))); }
vec3 fromY(vec3 y) { return vec3(y.x + y.y - y.z, y.x + y.z, y.x - y.y - y.z); }
// обратимое сжатие яркости (Karis): яркие точки не мерцают
vec3 tm(vec3 c) { return c / (1.0 + max(c.r, max(c.g, c.b))); }
vec3 itm(vec3 c) { return c / max(1e-4, 1.0 - max(c.r, max(c.g, c.b))); }
vec3 history(vec2 uv) {
  // Catmull-Rom за 5 выборок (Jimenez): история не мылится
  vec2 size = vec2(textureSize(tHistory, 0));
  vec2 pos = uv * size, c = floor(pos - 0.5) + 0.5, f = pos - c;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2, t0 = (c - 1.0) / size, t3 = (c + 2.0) / size, t12 = (c + w2 / w12) / size;
  vec3 r = texture2D(tHistory, vec2(t12.x, t0.y)).rgb * (w12.x * w0.y) + texture2D(tHistory, vec2(t0.x, t12.y)).rgb * (w0.x * w12.y)
         + texture2D(tHistory, t12).rgb * (w12.x * w12.y) + texture2D(tHistory, vec2(t3.x, t12.y)).rgb * (w3.x * w12.y)
         + texture2D(tHistory, vec2(t12.x, t3.y)).rgb * (w12.x * w3.y);
  float ws = w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  return max(r / ws, vec3(0.0));
}
vec3 clipBox(vec3 lo, vec3 hi, vec3 h, vec3 c) {
  vec3 center = 0.5 * (hi + lo), ext = 0.5 * (hi - lo) + 1e-4;
  vec3 v = h - center;
  vec3 a = abs(v / ext);
  float m = max(a.x, max(a.y, a.z));
  return m > 1.0 ? center + v / m : h;
}
void main() {
  vec2 uvJ = vUv + uJitter;
  // скорость — у ближайшего к камере соседа (края движущихся предметов не тянут фон)
  float dmin = 1.0; vec2 best = uvJ;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = uvJ + vec2(float(x), float(y)) * uRTexel;
    float d = texture2D(tDepth, o).x;
    if (d < dmin) { dmin = d; best = o; }
  }
  vec4 vel = texture2D(tVelocity, best);
  vec2 motion;
  if (vel.a > 0.5) motion = vel.xy;
  else {
    vec4 wp = uInvVP * vec4(best * 2.0 - 1.0, dmin * 2.0 - 1.0, 1.0);
    wp /= wp.w;
    vec4 pc = uPrevVP * wp, cc = uCurVP * wp;
    motion = (cc.xy / cc.w - pc.xy / pc.w) * 0.5;
  }
  vec2 prevUV = vUv - motion;
  vec3 m1 = vec3(0.0), m2 = vec3(0.0), cur = vec3(0.0), lo = vec3(1e9), hi = vec3(-1e9);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 s = toY(tm(texture2D(tColor, uvJ + vec2(float(x), float(y)) * uRTexel).rgb));
    if (x == 0 && y == 0) cur = s;
    m1 += s; m2 += s * s; lo = min(lo, s); hi = max(hi, s);
  }
  m1 /= 9.0; m2 /= 9.0;
  vec3 sig = sqrt(max(m2 - m1 * m1, 0.0));
  float speed = length(motion / uRTexel);
  float g = mix(1.25, 0.85, clamp(speed / 8.0, 0.0, 1.0));
  vec3 bl = max(lo, m1 - g * sig), bh = min(hi, m1 + g * sig);
  vec3 h = toY(tm(history(prevUV)));
  h = clipBox(bl, bh, h, cur);
  float w = mix(uFeedback, 0.22, clamp(speed / 24.0, 0.0, 1.0));
  if (uReset > 0.5 || prevUV.x < 0.0 || prevUV.y < 0.0 || prevUV.x > 1.0 || prevUV.y > 1.0) w = 1.0;
  vec3 r = mix(h, cur, w);
  gl_FragColor = vec4(itm(fromY(r)), 1.0);
}
`;

// ---------- свечение ----------
// Уменьшение 13 выборками (Jimenez), на первом шаге — среднее Кариса против светлячков; увеличение «шатром».
const DOWN_FRAG = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uKaris; varying vec2 vUv;
vec3 k(vec3 c) { return c / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722)) * uKaris); }
void main() {
  vec2 t = uTexel;
  vec3 a = texture2D(tSrc, vUv + t * vec2(-2.0, 2.0)).rgb, b = texture2D(tSrc, vUv + t * vec2(0.0, 2.0)).rgb, c = texture2D(tSrc, vUv + t * vec2(2.0, 2.0)).rgb;
  vec3 d = texture2D(tSrc, vUv + t * vec2(-2.0, 0.0)).rgb, e = texture2D(tSrc, vUv).rgb, f = texture2D(tSrc, vUv + t * vec2(2.0, 0.0)).rgb;
  vec3 g = texture2D(tSrc, vUv + t * vec2(-2.0, -2.0)).rgb, h = texture2D(tSrc, vUv + t * vec2(0.0, -2.0)).rgb, i = texture2D(tSrc, vUv + t * vec2(2.0, -2.0)).rgb;
  vec3 j = texture2D(tSrc, vUv + t * vec2(-1.0, 1.0)).rgb, l = texture2D(tSrc, vUv + t * vec2(1.0, 1.0)).rgb;
  vec3 m = texture2D(tSrc, vUv + t * vec2(-1.0, -1.0)).rgb, n = texture2D(tSrc, vUv + t * vec2(1.0, -1.0)).rgb;
  vec3 o = k(e) * 0.125 + (k(a) + k(c) + k(g) + k(i)) * 0.03125 + (k(b) + k(d) + k(f) + k(h)) * 0.0625 + (k(j) + k(l) + k(m) + k(n)) * 0.125;
  gl_FragColor = vec4(min(o, vec3(200.0)), 1.0);
}
`;
const UP_FRAG = /* glsl */ `
uniform sampler2D tLow, tHigh; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  vec2 t = uTexel;
  vec3 s = texture2D(tLow, vUv).rgb * 4.0
    + (texture2D(tLow, vUv + vec2(t.x, 0.0)).rgb + texture2D(tLow, vUv - vec2(t.x, 0.0)).rgb + texture2D(tLow, vUv + vec2(0.0, t.y)).rgb + texture2D(tLow, vUv - vec2(0.0, t.y)).rgb) * 2.0
    + texture2D(tLow, vUv + t).rgb + texture2D(tLow, vUv - t).rgb + texture2D(tLow, vUv + vec2(t.x, -t.y)).rgb + texture2D(tLow, vUv + vec2(-t.x, t.y)).rgb;
  gl_FragColor = vec4(texture2D(tHigh, vUv).rgb + s / 16.0, 1.0);
}
`;

// ---------- экспозиция ----------
const LUM_FRAG = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  float s = 0.0;
  for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++) {
    vec3 c = texture2D(tSrc, vUv + (vec2(float(x), float(y)) - 0.5) * uTexel * 0.5).rgb;
    s += log(max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4));
  }
  // середина кадра важнее краёв, небо у верхнего края — меньше
  vec2 q = vUv - vec2(0.5, 0.45);
  float w = max(0.05, 1.0 - dot(q, q) * 2.6);
  gl_FragColor = vec4(s * 0.25 * w, w, 0.0, 1.0);
}
`;
const ADAPT_FRAG = /* glsl */ `
uniform sampler2D tLum, tPrev; uniform float uDt, uReset; varying vec2 vUv;
void main() {
  vec4 a = textureLod(tLum, vec2(0.5), 8.0);
  float L = exp(a.r / max(a.g, 1e-5));
  float p = texture2D(tPrev, vec2(0.5)).r;
  float k = 1.0 - exp(-uDt * (L > p ? 2.0 : 1.1));
  float r = (uReset > 0.5 || p <= 0.0) ? L : p + (L - p) * k;
  gl_FragColor = vec4(r, L, 0.0, 1.0);
}
`;

// ---------- тонмаппинг ----------
// AgX (как в three r160) с «взглядом» в логарифмическом пространстве: степень (контраст) и насыщенность.
const OUTPUT_FRAG = /* glsl */ `
uniform sampler2D tHDR, tBloom, tAdapt;
uniform float uBloom, uExposure, uKey, uAdapt, uLookPow, uLookSat, uSat;
uniform vec2 uAdaptRange;
uniform vec3 uTint;
varying vec2 vUv;
const mat3 SRGB_TO_REC2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
const mat3 REC2020_TO_SRGB = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
const mat3 AGX_IN = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
const mat3 AGX_OUT = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
vec3 agxContrast(vec3 x) { vec3 x2 = x * x; vec3 x4 = x2 * x2; return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
vec3 agx(vec3 color) {
  color = SRGB_TO_REC2020 * color;
  color = AGX_IN * color;
  color = max(color, 1e-10);
  color = log2(color);
  color = (color + 12.47393) / (4.026069 + 12.47393);
  color = clamp(color, 0.0, 1.0);
  color = agxContrast(color);
  float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = pow(max(color, 0.0), vec3(uLookPow));
  l = pow(max(l, 0.0), uLookPow);
  color = l + uLookSat * (color - l);
  color = AGX_OUT * color;
  color = pow(max(vec3(0.0), color), vec3(2.2));
  color = REC2020_TO_SRGB * color;
  return clamp(color, 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
void main() {
  vec3 c = texture2D(tHDR, vUv).rgb;
  c = mix(c, texture2D(tBloom, vUv).rgb * BLOOM_NORM, uBloom);
  c *= uTint;
  float lc = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(lc), c, uSat), 0.0);
  float e = uExposure;
  if (uAdapt > 0.0) {
    float L = texture2D(tAdapt, vec2(0.5)).r;
    e *= mix(1.0, clamp(pow(uKey / max(L * uExposure, 1e-5), 0.5), uAdaptRange.x, uAdaptRange.y), uAdapt);
  }
  gl_FragColor = vec4(srgb(agx(c * e)), 1.0);
}
`;

export function createRender(renderer, scene, camera, quality, opts = {}) {
  const gl = renderer.getContext();
  const S = { w: 1, h: 1, pr: 1, scale: 1, rw: 1, rh: 1, ow: 1, oh: 1 };
  let frame = 0, reset = true;
  const prevVP = new THREE.Matrix4(), curVP = new THREE.Matrix4(), invVP = new THREE.Matrix4(), P0 = new THREE.Matrix4();
  const lastCam = new THREE.Vector3(1e9, 0, 0), lastDir = new THREE.Vector3(), camDir = new THREE.Vector3();

  // G-буфер: цвет HDR, нормаль+шероховатость, сведения (доля рассеянного, маска, F0, номер), скорость
  const gbuf = new THREE.WebGLMultipleRenderTargets(1, 1, 6, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  gbuf.texture[0].minFilter = gbuf.texture[0].magFilter = THREE.LinearFilter;
  gbuf.texture[2].type = THREE.UnsignedByteType;
  gbuf.texture[4].type = THREE.UnsignedByteType;
  gbuf.depthTexture = new THREE.DepthTexture(1, 1, THREE.FloatType);
  gbuf.texture.forEach(function (t, i) { t.name = ['color', 'normal', 'info', 'velocity', 'albedo', 'indirect'][i]; t.generateMipmaps = false; });
  const DRAW_ALL = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4, gl.COLOR_ATTACHMENT5];
  const DRAW_VEL = [gl.NONE, gl.NONE, gl.NONE, gl.COLOR_ATTACHMENT3, gl.NONE, gl.NONE];

  let ao = null;
  if (quality.ao > 0) {
    ao = new GBufferAO(scene, camera, quality.ao, gbuf.depthTexture, gbuf.texture[1]);
    ao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: quality.aoSamples || 16, distanceFallOff: 1.0 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 16 });
  }
  const volume = quality.volume && opts.sky ? new VolumePass(camera, null, opts, quality) : null;
  const clouds = quality.clouds && opts.sky ? createClouds(renderer) : null;
  const gi = quality.gi && opts.sky ? createGI(renderer) : null;

  const comp = target(1, 1);
  const ssrRT = target(1, 1), mbRT = target(1, 1);
  const hist = [target(1, 1), target(1, 1)];
  const ldr = target(1, 1, { type: THREE.UnsignedByteType });
  const LEVELS = 6;
  const down = [], up = [];
  for (let i = 0; i < LEVELS; i++) { down.push(target(1, 1)); if (i < LEVELS - 1) up.push(target(1, 1)); }
  const lum = target(64, 64, { minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true });
  const adapt = [target(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }), target(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })];
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  black.needsUpdate = true;
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;

  const C = quad(COMPOSE_FRAG, {
    tColor: { value: gbuf.texture[0] }, tInfo: { value: gbuf.texture[2] }, tAO: { value: white }, tVol: { value: black },
    tCloud: { value: black }, tDepth: { value: gbuf.depthTexture }, uCloud: { value: clouds ? 1 : 0 },
    tAlbedo: { value: gbuf.texture[4] }, tIndirect: { value: gbuf.texture[5] }, tGI: { value: black }, uGI: { value: 0 },
    tSSR: { value: ssrRT.texture }, tNormal: { value: gbuf.texture[1] }, uSSR: { value: quality.ssr ? 1 : 0 }, uInvProj: { value: new THREE.Matrix4() },
    uTexel: { value: new THREE.Vector2() }, uVolTexel: { value: new THREE.Vector2() }, uAO: { value: ao ? 1 : 0 }, uVol: { value: volume ? 1 : 0 },
    uSunUV: { value: new THREE.Vector2() }, uFlare: { value: 0 }, uAspect: { value: 1 }, uSunCol: { value: new THREE.Vector3() },
  });
  const T = quad(TAA_FRAG, {
    tColor: { value: comp.texture }, tHistory: { value: null }, tVelocity: { value: gbuf.texture[3] }, tDepth: { value: gbuf.depthTexture },
    uRTexel: { value: new THREE.Vector2() }, uJitter: { value: new THREE.Vector2() },
    uInvVP: { value: invVP }, uPrevVP: { value: prevVP }, uCurVP: { value: curVP }, uReset: { value: 1 }, uFeedback: { value: 0.1 },
  });
  const R = quality.ssr ? quad(SSR_FRAG, {
    tDepth: { value: gbuf.depthTexture }, tNormal: { value: gbuf.texture[1] }, tPrev: { value: null },
    uProj: { value: new THREE.Matrix4() }, uInvProj: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() }, uPrevVP: { value: prevVP }, uFrame: { value: 0 },
  }) : null;
  const MB = quality.mblur ? quad(MBLUR_FRAG, {
    tColor: { value: null }, tVelocity: { value: gbuf.texture[3] }, tDepth: { value: gbuf.depthTexture },
    uInvVP: { value: invVP }, uPrevVP: { value: prevVP }, uCurVP: { value: curVP },
    uRTexel: { value: new THREE.Vector2() }, uOTexel: { value: new THREE.Vector2() }, uJitter: { value: new THREE.Vector2() },
    uShutter: { value: 0.5 }, uMaxPx: { value: 36 },
  }) : null;
  const D = quad(DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uKaris: { value: 0 } });
  const U = quad(UP_FRAG, { tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const L = quad(LUM_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2(1 / 64, 1 / 64) } });
  const A = quad(ADAPT_FRAG, { tLum: { value: lum.texture }, tPrev: { value: null }, uDt: { value: 1 / 60 }, uReset: { value: 1 } });
  const O = quad('#define BLOOM_NORM ' + (1 / LEVELS).toFixed(6) + '\n' + OUTPUT_FRAG, {
    tHDR: { value: null }, tBloom: { value: black }, tAdapt: { value: null },
    uBloom: { value: 0.045 }, uExposure: { value: 1 }, uKey: { value: 0.3 }, uAdapt: { value: 1 }, uAdaptRange: { value: new THREE.Vector2(0.72, 1.55) },
    uLookPow: { value: 1.12 }, uLookSat: { value: 1.18 }, uTint: { value: new THREE.Vector3(1.02, 1.0, 0.97) }, uSat: { value: 1.03 },
  });
  const F = quad(FINISH.fragmentShader, THREE.UniformsUtils.clone(FINISH.uniforms));
  F.u.uSharpen.value = 0.26;

  // скорость движущихся объектов
  const velMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uPrevModel: { value: new THREE.Matrix4() }, uCurVP: { value: curVP }, uPrevVP: { value: prevVP }, uPrevBones: { value: black }, uHasPrevBones: { value: 0 } },
    vertexShader: VELOCITY_VERT, fragmentShader: VELOCITY_FRAG,
    depthWrite: false, depthFunc: THREE.LessEqualDepth, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  velMat.onBeforeRender = function (r, s, c, g, object) {
    const u = this.uniforms;
    u.uPrevModel.value.copy(object.userData.prevMW || object.matrixWorld);
    const sk = object.isSkinnedMesh ? object.skeleton : null;
    const pb = sk ? prevBones.get(sk) : null;
    if (pb) { u.uPrevBones.value = pb; u.uHasPrevBones.value = 1; }
    else { u.uPrevBones.value = black; u.uHasPrevBones.value = 0; }
    this.uniformsNeedUpdate = true;
  };
  const dynMeshes = [];
  const skeletons = new Set();
  const prevBones = new WeakMap();
  function collectDynamic() {
    dynMeshes.length = 0;
    DYNAMIC.forEach(function (root) {
      root.traverse(function (o) { if (o.isMesh) { o.layers.enable(DYN_LAYER); dynMeshes.push(o); } });
    });
  }
  function velocityPass() {
    collectDynamic();
    if (!dynMeshes.length) return;
    scene.overrideMaterial = velMat;
    camera.layers.set(DYN_LAYER);
    gl.drawBuffers(DRAW_VEL);
    renderer.render(scene, camera);
    gl.drawBuffers(DRAW_ALL);
    camera.layers.set(0);
    scene.overrideMaterial = null;
  }
  // после кадра: прошлые матрицы и кости — для следующего
  function storePrev() {
    skeletons.clear();
    dynMeshes.forEach(function (o) {
      if (!o.userData.prevMW) o.userData.prevMW = new THREE.Matrix4();
      o.userData.prevMW.copy(o.matrixWorld);
      if (o.isSkinnedMesh && o.skeleton.boneTexture) skeletons.add(o.skeleton);
    });
    skeletons.forEach(function (sk) {
      const src = sk.boneTexture.image;
      let t = prevBones.get(sk);
      if (!t || t.image.width !== src.width) {
        t = new THREE.DataTexture(new Float32Array(src.data.length), src.width, src.height, THREE.RGBAFormat, THREE.FloatType);
        prevBones.set(sk, t);
      }
      t.image.data.set(src.data);
      t.needsUpdate = true;
    });
  }

  function setSize(w, h, pr, scale) {
    S.w = w; S.h = h; S.pr = pr; S.scale = scale;
    S.ow = Math.max(1, Math.round(w * pr)); S.oh = Math.max(1, Math.round(h * pr));
    S.rw = Math.max(1, Math.round(S.ow * scale)); S.rh = Math.max(1, Math.round(S.oh * scale));
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    gbuf.setSize(S.rw, S.rh);
    gbuf.depthTexture.image.width = S.rw; gbuf.depthTexture.image.height = S.rh;
    comp.setSize(S.rw, S.rh);
    if (ao) ao.setSize(S.rw, S.rh);
    if (volume) volume.setSize(S.rw, S.rh);
    if (clouds) clouds.setSize(S.rw, S.rh);
    if (gi) gi.setSize(S.rw, S.rh);
    if (hist[0].width !== S.ow || hist[0].height !== S.oh) { hist[0].setSize(S.ow, S.oh); hist[1].setSize(S.ow, S.oh); reset = true; }
    ldr.setSize(S.ow, S.oh);
    ssrRT.setSize(Math.max(1, S.rw >> 1), Math.max(1, S.rh >> 1));
    mbRT.setSize(S.ow, S.oh);
    if (MB) { MB.u.uRTexel.value.set(1 / S.rw, 1 / S.rh); MB.u.uOTexel.value.set(1 / S.ow, 1 / S.oh); }
    let bw = S.ow, bh = S.oh;
    for (let i = 0; i < LEVELS; i++) {
      bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
      down[i].setSize(bw, bh);
      if (i < LEVELS - 1) up[i].setSize(bw, bh);
    }
    C.u.uTexel.value.set(1 / S.rw, 1 / S.rh);
    C.u.uVolTexel.value.set(2 / S.rw, 2 / S.rh);
    C.u.uAspect.value = S.rw / S.rh;
    T.u.uRTexel.value.set(1 / S.rw, 1 / S.rh);
    F.u.uTexel.value.set(1 / S.ow, 1 / S.oh);
  }
  const sz = new THREE.Vector2();
  renderer.getSize(sz);
  setSize(sz.x, sz.y, renderer.getPixelRatio(), 1);

  function draw(pass, rt) { renderer.setRenderTarget(rt); pass.q.render(renderer); }

  let cur = 0, ad = 0, lastTime = 0;
  function render(time) {
    const dt = Math.min(0.25, Math.max(1 / 240, time - lastTime || 1 / 60));
    lastTime = time;
    frame++;
    // скачок камеры (переход к зданию, отладка) — история с нуля
    camera.updateMatrixWorld();
    camera.getWorldDirection(camDir);
    if (lastCam.distanceTo(camera.position) > 6 || camDir.dot(lastDir) < 0.9) reset = true;
    lastCam.copy(camera.position); lastDir.copy(camDir);

    // сдвиг проекции на долю пикселя
    P0.copy(camera.projectionMatrix);
    curVP.multiplyMatrices(P0, camera.matrixWorldInverse);
    if (reset) prevVP.copy(curVP);
    const j = JITTER[frame % JITTER.length];
    const jx = (j[0] * 2) / S.rw, jy = (j[1] * 2) / S.rh;
    camera.projectionMatrix.elements[8] -= jx;
    camera.projectionMatrix.elements[9] -= jy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    invVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();

    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(gbuf);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    velocityPass();

    C.u.tAO.value = ao ? ao.compute(renderer) : white;
    if (volume) {
      volume.prepare(renderer, gbuf.depthTexture);
      const vu = volume.comp.uniforms;
      C.u.tVol.value = volume.low.texture;
      C.u.uFlare.value = vu.uFlare.value; C.u.uSunUV.value.copy(vu.uSunUV.value); C.u.uSunCol.value.copy(vu.uSunCol.value);
    }
    if (clouds) C.u.tCloud.value = clouds.render(gbuf.depthTexture, camera, invVP, opts.sky, time, prevVP, reset);
    C.u.uInvProj.value.copy(camera.projectionMatrixInverse);
    if (R) {
      R.u.tPrev.value = hist[cur].texture;
      R.u.uProj.value.copy(camera.projectionMatrix);
      R.u.uInvProj.value.copy(camera.projectionMatrixInverse);
      R.u.uViewInv.value.copy(camera.matrixWorld);
      R.u.uFrame.value = frame % 64;
      draw(R, ssrRT);
      C.u.uSSR.value = reset ? 0 : 1;
    }
    if (gi) {
      gi.update(time, opts.sky, opts.lights ? opts.lights() : []);
      C.u.tGI.value = gi.trace(gbuf.depthTexture, gbuf.texture[1], invVP, camera);
      C.u.uGI.value = 1;
    }
    draw(C, comp);

    // сглаживание
    const prev = hist[cur], next = hist[1 - cur];
    T.u.tHistory.value = prev.texture;
    T.u.uJitter.value.set(jx * 0.5, jy * 0.5);
    T.u.uReset.value = reset ? 1 : 0;
    draw(T, next);
    cur = 1 - cur;
    let frameTex = next.texture;
    if (MB && !reset) {
      MB.u.tColor.value = next.texture;
      MB.u.uJitter.value.set(jx * 0.5, jy * 0.5);
      // выдержка — половина кадра при 60 к/с (при меньшей частоте — не длиннее)
      MB.u.uShutter.value = 0.5 * Math.min(1, (1 / 60) / Math.max(dt, 1 / 240));
      draw(MB, mbRT);
      frameTex = mbRT.texture;
    }

    // свечение
    let src = frameTex;
    for (let i = 0; i < LEVELS; i++) {
      D.u.tSrc.value = src;
      D.u.uTexel.value.set(1 / (i === 0 ? S.ow : down[i - 1].width), 1 / (i === 0 ? S.oh : down[i - 1].height));
      D.u.uKaris.value = i === 0 ? 1 : 0;
      draw(D, down[i]);
      src = down[i].texture;
    }
    let low = down[LEVELS - 1].texture;
    for (let i = LEVELS - 2; i >= 0; i--) {
      U.u.tLow.value = low; U.u.tHigh.value = down[i].texture;
      U.u.uTexel.value.set(1 / down[i + 1].width, 1 / down[i + 1].height);
      draw(U, up[i]);
      low = up[i].texture;
    }

    // экспозиция
    L.u.tSrc.value = frameTex;
    draw(L, lum);
    A.u.tPrev.value = adapt[ad].texture;
    A.u.uDt.value = dt;
    A.u.uReset.value = frame < 3 ? 1 : 0;
    draw(A, adapt[1 - ad]);
    ad = 1 - ad;

    O.u.tHDR.value = frameTex;
    O.u.tBloom.value = low;
    O.u.uBloom.value = THREE.MathUtils.lerp(0.04, 0.075, opts.sky ? opts.sky.state.night : 0);
    O.u.tAdapt.value = adapt[ad].texture;
    O.u.uExposure.value = renderer.toneMappingExposure;
    draw(O, ldr);
    F.u.tDiffuse.value = ldr.texture;
    F.u.uTime.value = time;
    draw(F, null);

    renderer.autoClear = autoClear;
    camera.projectionMatrix.copy(P0);
    camera.projectionMatrixInverse.copy(P0).invert();
    prevVP.copy(curVP);
    storePrev();
    reset = false;
  }

  // программы основного прохода собираются под G-буфер (без тонмаппинга, линейный цвет)
  function compile() {
    renderer.setRenderTarget(gbuf);
    renderer.compile(scene, camera);
    renderer.setRenderTarget(null);
  }

  function readAdapt() {
    const px = new Float32Array(4);
    renderer.readRenderTargetPixels(adapt[ad], 0, 0, 1, 1, px);
    return { adapted: px[0], current: px[1], exposure: renderer.toneMappingExposure };
  }

  return {
    taa: true, gbuf, ao, volume, clouds, gi, setSize, render, compile, readAdapt,
    output: O.u, finish: F.u, taaUniforms: T.u, size: S,
    resetHistory: function () { reset = true; },
    dispose: function () {
      [gbuf, comp, ldr, lum, ssrRT, mbRT].concat(hist, down, up, adapt).forEach(function (t) { t.dispose(); });
      [C, T, D, U, L, A, O, F, R, MB].forEach(function (p) { if (p) { p.m.dispose(); p.q.dispose(); } });
      if (ao) ao.dispose();
      if (volume) volume.dispose();
      if (clouds) clouds.dispose();
      if (gi) gi.dispose();
    },
  };
}
