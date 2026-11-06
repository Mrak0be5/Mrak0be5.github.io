// Атмосфера по Хиллеру (2020): рассеяние Рэлея (воздух), Ми (дымка) и поглощение озоном в сферической
// атмосфере Земли. Таблицы на видеокарте: пропускание до верха атмосферы (256×64, один раз), многократное
// рассеяние (32×32, один раз), вид неба из точки камеры (192×108, каждый кадр) и освещённость от неба (1×1).
// Небо, дымка вдали (воздушная перспектива), цвет солнца у земли и окружение для отражений берутся из одних
// таблиц — закат, сумерки и синева гор согласованы. Расстояния в шейдерах — в километрах.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const ATMO = {
  skyView: { value: null }, transmittance: { value: null }, multi: { value: null }, irradiance: { value: null },
  camR: { value: 6360.3 }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunIllum: { value: 20 },
  haze: { value: 6 }, alt: { value: 0.3 }, nightSky: { value: new THREE.Vector3(0, 0, 0) },
  // таблица дымки для вершин (без текстур): яркость неба по 16 азимутам × 4 высотам и пропускание до верха
  apSky: { value: Array.from({ length: 64 }, function () { return new THREE.Vector3(); }) },
  apTinf: { value: Array.from({ length: 4 }, function () { return new THREE.Vector3(1, 1, 1); }) },
};
export const AP_EL = [0.03, 0.12, 0.3, 0.7];

// Общие части для всех шейдеров (материалы, небо, облака).
export const ATMO_GLSL = /* glsl */ `
#ifndef MB_ATMO
#define MB_ATMO
const float ATM_RG = 6360.0, ATM_RT = 6460.0;
const vec3 ATM_RAY = vec3(5.802e-3, 13.558e-3, 33.1e-3);
const float ATM_RAY_H = 8.0;
const float ATM_MIE_S = 3.996e-3, ATM_MIE_E = 4.40e-3, ATM_MIE_H = 1.2;
const vec3 ATM_OZO = vec3(0.650e-3, 1.881e-3, 0.085e-3);
uniform sampler2D tSkyView, tTransmit, tMulti, tSkyIrr;
uniform float uCamR, uSunIllum, uHaze, uAltKm;
uniform vec3 uSunDirA, uNightSky;
float atmRay(vec3 ro, vec3 rd, float R) {
  float b = dot(ro, rd), c = dot(ro, ro) - R * R, d = b * b - c;
  if (d < 0.0) return -1.0;
  d = sqrt(d);
  float t0 = -b - d, t1 = -b + d;
  return t0 > 0.0 ? t0 : (t1 > 0.0 ? t1 : -1.0);
}
vec2 atmTransmitUV(float r, float mu) {
  float H = sqrt(ATM_RT * ATM_RT - ATM_RG * ATM_RG);
  float rho = sqrt(max(0.0, r * r - ATM_RG * ATM_RG));
  float disc = r * r * (mu * mu - 1.0) + ATM_RT * ATM_RT;
  float d = max(0.0, -r * mu + sqrt(max(disc, 0.0)));
  float dmin = ATM_RT - r, dmax = rho + H;
  return vec2((d - dmin) / max(dmax - dmin, 1e-4), rho / H);
}
vec3 atmTransmit(float r, float mu) { return textureLod(tTransmit, atmTransmitUV(r, mu), 0.0).rgb; }
// координаты таблицы вида неба для направления (y — вверх), азимут — от солнца
vec2 atmSkyUV(vec3 dir, float r) {
  float vh = sqrt(max(r * r - ATM_RG * ATM_RG, 0.0));
  float beta = acos(clamp(vh / r, -1.0, 1.0));
  float zha = 3.14159265 - beta;
  float ang = acos(clamp(dir.y, -1.0, 1.0));
  float v;
  if (ang < zha) { float c = 1.0 - ang / zha; c = 1.0 - sqrt(max(c, 0.0)); v = c * 0.5; }
  else { float c = (ang - zha) / max(beta, 1e-4); v = sqrt(max(c, 0.0)) * 0.5 + 0.5; }
  vec2 s = uSunDirA.xz, d = dir.xz;
  float ls = length(s), ld = length(d);
  float lc = (ls > 1e-4 && ld > 1e-4) ? dot(s, d) / (ls * ld) : 1.0;
  float u = sqrt(clamp(-lc * 0.5 + 0.5, 0.0, 1.0));
  return vec2(u, v);
}
// яркость неба по направлению (уже с яркостью солнца)
vec3 atmSky(vec3 dir) { return textureLod(tSkyView, atmSkyUV(dir, uCamR), 0.0).rgb * uSunIllum; }
// Воздушная перспектива: пропускание на пути камера → точка (экспоненциальная плотность, плоский слой) и
// добавка дымки: яркость неба в том же направлении × доля пути (у горизонта — по горизонту).
vec3 atmPathT(float h0, float mu, float d) {
  float fR, fM;
  if (abs(mu) < 1e-3) { fR = exp(-h0 / ATM_RAY_H) * d; fM = exp(-h0 / ATM_MIE_H) * d; }
  else {
    fR = ATM_RAY_H * exp(-h0 / ATM_RAY_H) * (1.0 - exp(-mu * d / ATM_RAY_H)) / mu;
    fM = ATM_MIE_H * exp(-h0 / ATM_MIE_H) * (1.0 - exp(-mu * d / ATM_MIE_H)) / mu;
  }
  return exp(-(ATM_RAY * fR + vec3(ATM_MIE_E * uHaze) * fM));
}
#endif
`;

// Воздушная перспектива для вершин материалов — без текстур (у рельефа заняты все 16 блоков): небо по
// таблице uApSky (16 азимутов × 4 высоты), её раз в 0,2 с считывает createAtmosphere.
export const AP_GLSL = /* glsl */ `
#ifndef MB_AP
#define MB_AP
const vec3 AP_RAY = vec3(5.802e-3, 13.558e-3, 33.1e-3);
uniform vec3 uApSky[64];
uniform vec3 uApTinf[4];
uniform float uHaze, uAltKm;
uniform vec3 uNightSky;
vec3 apPathT(float h0, float mu, float d) {
  float fR, fM;
  if (abs(mu) < 1e-3) { fR = exp(-h0 / 8.0) * d; fM = exp(-h0 / 1.2) * d; }
  else {
    fR = 8.0 * exp(-h0 / 8.0) * (1.0 - exp(-mu * d / 8.0)) / mu;
    fM = 1.2 * exp(-h0 / 1.2) * (1.0 - exp(-mu * d / 1.2)) / mu;
  }
  return exp(-(AP_RAY * fR + vec3(4.40e-3 * uHaze) * fM));
}
// пропускание T и добавка S на пути от камеры до точки (цвет = цвет · T + S)
void atmAerial(vec3 camPos, vec3 worldPos, out vec3 T, out vec3 S) {
  vec3 v = worldPos - camPos;
  float dm = length(v);
  T = vec3(1.0); S = vec3(0.0);
  if (dm < 1.0) return;
  vec3 dir = v / dm;
  float h0 = max(uAltKm + camPos.y * 0.001, 0.0);
  T = apPathT(h0, dir.y, dm * 0.001);
  // высота: 0,03 / 0,12 / 0,3 / 0,7 → 0..3
  float el = max(dir.y, 0.03);
  float fe = el < 0.12 ? (el - 0.03) / 0.09 : el < 0.3 ? 1.0 + (el - 0.12) / 0.18 : 2.0 + clamp((el - 0.3) / 0.4, 0.0, 1.0);
  int e0 = int(floor(fe)); int e1 = min(e0 + 1, 3); float we = fe - float(e0);
  float az = atan(dir.z, dir.x) * 2.546479 + 16.0;  // 16 / 2π
  float fa = mod(az, 16.0);
  int a0 = int(floor(fa)); int a1 = (a0 + 1) - ((a0 + 1) / 16) * 16; float wa = fa - float(a0);
  vec3 Linf = mix(mix(uApSky[e0 * 16 + a0], uApSky[e0 * 16 + a1], wa), mix(uApSky[e1 * 16 + a0], uApSky[e1 * 16 + a1], wa), we);
  vec3 Tinf = mix(uApTinf[e0], uApTinf[e1], we);
  S = Linf * (1.0 - T) / max(1.0 - Tinf, vec3(0.02)) + uNightSky * (1.0 - T.g);
}
#endif
`;

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const MEDIUM = /* glsl */ `
// границы циклов — из uniform: компилятор D3D не разворачивает длинные циклы (первый запуск быстрее)
uniform int uN1, uN2;
struct Med { vec3 sR; float sM; vec3 ext; };
Med medium(float h) {
  float dR = exp(-h / ATM_RAY_H), dM = exp(-h / ATM_MIE_H) * uHaze, dO = max(0.0, 1.0 - abs(h - 25.0) / 15.0);
  Med m; m.sR = ATM_RAY * dR; m.sM = ATM_MIE_S * dM; m.ext = m.sR + vec3(ATM_MIE_E * dM) + ATM_OZO * dO;
  return m;
}
float phaseR(float c) { return 3.0 / (16.0 * 3.14159265) * (1.0 + c * c); }
float phaseM(float c, float g) {
  // Корнетт — Шенкс
  float g2 = g * g;
  return 3.0 / (8.0 * 3.14159265) * ((1.0 - g2) * (1.0 + c * c)) / ((2.0 + g2) * pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5));
}
`;

const TRANSMIT_FRAG = /* glsl */ `
varying vec2 vUv;
void main() {
  float H = sqrt(ATM_RT * ATM_RT - ATM_RG * ATM_RG);
  float rho = H * vUv.y;
  float r = sqrt(rho * rho + ATM_RG * ATM_RG);
  float dmin = ATM_RT - r, dmax = rho + H;
  float d = dmin + vUv.x * (dmax - dmin);
  float mu = d < 1e-4 ? 1.0 : clamp((H * H - rho * rho - d * d) / (2.0 * r * d), -1.0, 1.0);
  vec3 ro = vec3(0.0, r, 0.0), rd = vec3(sqrt(max(0.0, 1.0 - mu * mu)), mu, 0.0);
  float t = max(0.0, atmRay(ro, rd, ATM_RT));
  vec3 tau = vec3(0.0);
  int N = uN1;
  float dt = t / float(N);
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * (float(i) + 0.5) * dt;
    tau += medium(length(p) - ATM_RG).ext * dt;
  }
  gl_FragColor = vec4(exp(-tau), 1.0);
}
`;

// многократное рассеяние: интеграл по сфере 64 направлений, второй порядок и геометрический ряд (f_ms)
const MULTI_FRAG = /* glsl */ `
varying vec2 vUv;
void main() {
  float cs = vUv.x * 2.0 - 1.0;
  float r = ATM_RG + max(0.01, vUv.y * (ATM_RT - ATM_RG));
  vec3 sun = vec3(0.0, cs, sqrt(max(0.0, 1.0 - cs * cs)));
  vec3 ro = vec3(0.0, r, 0.0);
  vec3 L2 = vec3(0.0), fms = vec3(0.0);
  for (int i = 0; i < uN1; i++) for (int j = 0; j < uN1; j++) {
    float ct = 1.0 - 2.0 * (float(i) + 0.5) / 8.0;
    float st = sqrt(max(0.0, 1.0 - ct * ct));
    float ph = 6.2831853 * (float(j) + 0.5) / 8.0;
    vec3 rd = vec3(st * cos(ph), ct, st * sin(ph));
    float tg = atmRay(ro, rd, ATM_RG);
    float tt = atmRay(ro, rd, ATM_RT);
    float tmax = tg > 0.0 ? tg : tt;
    int N = uN2;
    float dt = max(tmax, 0.0) / float(N);
    vec3 T = vec3(1.0), Lp = vec3(0.0), fp = vec3(0.0);
    for (int k = 0; k < N; k++) {
      vec3 p = ro + rd * (float(k) + 0.5) * dt;
      float pr = length(p);
      Med m = medium(pr - ATM_RG);
      vec3 Ts = exp(-m.ext * dt);
      vec3 up = p / pr;
      float mus = dot(up, sun);
      float shadow = atmRay(p, sun, ATM_RG) > 0.0 ? 0.0 : 1.0;
      vec3 S = (m.sR + m.sM) * atmTransmit(pr, mus) * shadow / (4.0 * 3.14159265);
      vec3 sc = m.sR + m.sM;
      Lp += T * (S - S * Ts) / max(m.ext, vec3(1e-7));
      fp += T * (sc - sc * Ts) / max(m.ext, vec3(1e-7));
      T *= Ts;
    }
    if (tg > 0.0) {
      vec3 gp = ro + rd * tg;
      vec3 n = normalize(gp);
      Lp += T * atmTransmit(ATM_RG, dot(n, sun)) * max(dot(n, sun), 0.0) * 0.2 / 3.14159265;
    }
    L2 += Lp / 64.0;
    fms += fp / 64.0;
  }
  gl_FragColor = vec4(L2 / max(1.0 - fms, vec3(1e-3)), 1.0);
}
`;

// вид неба из камеры: 30 шагов по лучу, рассеяние солнца с фазами и многократное из таблицы
const SKYVIEW_FRAG = /* glsl */ `
varying vec2 vUv;
vec3 multi(float r, float mus) { return textureLod(tMulti, vec2(mus * 0.5 + 0.5, (r - ATM_RG) / (ATM_RT - ATM_RG)), 0.0).rgb; }
void main() {
  float r = uCamR;
  float vh = sqrt(max(r * r - ATM_RG * ATM_RG, 0.0));
  float beta = acos(clamp(vh / r, -1.0, 1.0));
  float zha = 3.14159265 - beta;
  float vz;
  if (vUv.y < 0.5) { float c = 1.0 - 2.0 * vUv.y; c = 1.0 - c * c; vz = cos(zha * c); }
  else { float c = vUv.y * 2.0 - 1.0; vz = cos(zha + beta * c * c); }
  float lc = -((vUv.x * vUv.x) * 2.0 - 1.0);
  float sv = sqrt(max(0.0, 1.0 - vz * vz));
  vec3 rd = vec3(sv * lc, vz, sv * sqrt(max(0.0, 1.0 - lc * lc)));
  float sy = clamp(uSunDirA.y, -1.0, 1.0);
  vec3 sun = vec3(sqrt(max(0.0, 1.0 - sy * sy)), sy, 0.0);
  vec3 ro = vec3(0.0, r, 0.0);
  float tg = atmRay(ro, rd, ATM_RG), tt = atmRay(ro, rd, ATM_RT);
  float tmax = tg > 0.0 ? tg : tt;
  tmax = min(max(tmax, 0.0), 1200.0);
  float c = dot(rd, sun);
  float pR = phaseR(c), pM = phaseM(c, 0.8);
  vec3 L = vec3(0.0), T = vec3(1.0);
  int N = uN1;
  float prev = 0.0;
  for (int i = 0; i < N; i++) {
    float t1 = tmax * pow((float(i) + 1.0) / float(N), 2.0);
    float dt = t1 - prev;
    vec3 p = ro + rd * (prev + 0.5 * dt);
    prev = t1;
    float pr = length(p);
    Med m = medium(pr - ATM_RG);
    vec3 Ts = exp(-m.ext * dt);
    vec3 up = p / pr;
    float mus = dot(up, sun);
    float shadow = atmRay(p, sun, ATM_RG) > 0.0 ? 0.0 : 1.0;
    vec3 Tsun = atmTransmit(pr, mus) * shadow;
    vec3 S = (m.sR * pR + m.sM * pM) * Tsun + (m.sR + m.sM) * multi(pr, mus);
    L += T * (S - S * Ts) / max(m.ext, vec3(1e-7));
    T *= Ts;
  }
  gl_FragColor = vec4(L, 1.0);
}
`;

// освещённость горизонтальной площадки от неба (без солнца): 64 направления по верхней полусфере
const IRR_FRAG = /* glsl */ `
varying vec2 vUv;
void main() {
  vec3 E = vec3(0.0);
  for (int i = 0; i < uN1; i++) for (int j = 0; j < uN1; j++) {
    float u1 = (float(i) + 0.5) / 8.0, u2 = (float(j) + 0.5) / 8.0;
    float rr = sqrt(u1), ph = 6.2831853 * u2;
    vec3 d = vec3(rr * cos(ph), sqrt(max(0.0, 1.0 - u1)), rr * sin(ph));
    E += textureLod(tSkyView, atmSkyUV(d, uCamR), 0.0).rgb;
  }
  // косинусная выборка: E = π · среднее
  gl_FragColor = vec4(E / 64.0 * 3.14159265, 1.0);
}
`;

// таблица для вершин: столбцы 0..15 — небо по азимутам, 16 — пропускание до верха; строки — высоты AP_EL
const APTABLE_FRAG = /* glsl */ `
varying vec2 vUv;
void main() {
  int col = int(floor(vUv.x * 17.0)), row = int(floor(vUv.y * 4.0));
  float el = row == 0 ? 0.03 : row == 1 ? 0.12 : row == 2 ? 0.3 : 0.7;
  if (col == 16) { gl_FragColor = vec4(atmTransmit(uCamR, el), 1.0); return; }
  float a = (float(col)) / 16.0 * 6.2831853;
  float c = sqrt(max(0.0, 1.0 - el * el));
  gl_FragColor = vec4(atmSky(vec3(cos(a) * c, el, sin(a) * c)), 1.0);
}
`;

export function createAtmosphere(renderer) {
  const make = function (w, h, frag, n1, n2) {
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    rt.texture.generateMipmaps = false;
    const m = new THREE.ShaderMaterial({
      uniforms: Object.assign(uniforms(), { uN1: { value: n1 || 1 }, uN2: { value: n2 || 1 } }),
      vertexShader: VERT, fragmentShader: ATMO_GLSL + MEDIUM + frag, depthTest: false, depthWrite: false,
    });
    return { rt, m, q: new FullScreenQuad(m) };
  };
  const transmit = make(256, 64, TRANSMIT_FRAG, 40);
  const multi = make(32, 32, MULTI_FRAG, 8, 20);
  const view = make(192, 108, SKYVIEW_FRAG, 32);
  const irr = make(1, 1, IRR_FRAG, 8);
  const ap = make(17, 4, APTABLE_FRAG);
  ap.rt.texture.type = THREE.FloatType;
  ap.rt.texture.minFilter = ap.rt.texture.magFilter = THREE.NearestFilter;
  const apBuf = new Float32Array(17 * 4 * 4);
  ATMO.transmittance.value = transmit.rt.texture;
  ATMO.multi.value = multi.rt.texture;
  ATMO.skyView.value = view.rt.texture;
  ATMO.irradiance.value = irr.rt.texture;
  function draw(p) {
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(p.rt);
    p.q.render(renderer);
    renderer.setRenderTarget(prev);
  }
  draw(transmit);
  draw(multi);

  // То же пропускание на процессоре — цвет солнца у земли (для источника света).
  function medium(h, out) {
    const dR = Math.exp(-h / 8), dM = Math.exp(-h / 1.2) * ATMO.haze.value, dO = Math.max(0, 1 - Math.abs(h - 25) / 15);
    out[0] = 5.802e-3 * dR + 4.4e-3 * dM + 0.65e-3 * dO;
    out[1] = 13.558e-3 * dR + 4.4e-3 * dM + 1.881e-3 * dO;
    out[2] = 33.1e-3 * dR + 4.4e-3 * dM + 0.085e-3 * dO;
  }
  const ext = [0, 0, 0];
  function sunTransmit(dir, out) {
    const r = 6360 + ATMO.alt.value;
    // луч от земли к солнцу до верха атмосферы; ниже горизонта — тень Земли
    const mu = dir.y, b = r * mu, c = r * r - 6460 * 6460;
    const t = -b + Math.sqrt(Math.max(0, b * b - c));
    const g = r * r - 6360 * 6360, dg = b * b - g;
    if (mu < 0 && dg > 0 && -b - Math.sqrt(dg) > 0) { out[0] = out[1] = out[2] = 0; return out; }
    const N = 48, dt = t / N;
    let tr = 0, tg = 0, tb = 0;
    for (let i = 0; i < N; i++) {
      const s = (i + 0.5) * dt;
      const px = Math.sqrt(Math.max(0, 1 - mu * mu)) * s, py = r + mu * s;
      medium(Math.hypot(px, py) - 6360, ext);
      tr += ext[0] * dt; tg += ext[1] * dt; tb += ext[2] * dt;
    }
    out[0] = Math.exp(-tr); out[1] = Math.exp(-tg); out[2] = Math.exp(-tb);
    return out;
  }

  const lastSun = new THREE.Vector3(9, 9, 9), apSun = new THREE.Vector3(9, 9, 9);
  let lastR = 0, apClock = -1;
  // вид неба — когда солнце сдвинулось или камера сильно поднялась; таблица дымки — не чаще 5 раз в секунду
  function update(sunDir, camY, now) {
    ATMO.sunDir.value.copy(sunDir);
    const r = 6360 + ATMO.alt.value + Math.max(0, camY) * 0.001;
    ATMO.camR.value = r;
    if (lastSun.distanceToSquared(sunDir) < 2e-7 && Math.abs(lastR - r) < 0.002) return false;
    lastSun.copy(sunDir); lastR = r;
    draw(view);
    draw(irr);
    const t = now === undefined ? performance.now() / 1000 : now;
    if (apClock < 0 || t - apClock > 0.2 || apSun.distanceToSquared(sunDir) > 4e-4) {
      apClock = t; apSun.copy(sunDir);
      draw(ap);
      renderer.readRenderTargetPixels(ap.rt, 0, 0, 17, 4, apBuf);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 16; col++) {
          const k = (row * 17 + col) * 4;
          ATMO.apSky.value[row * 16 + col].set(apBuf[k], apBuf[k + 1], apBuf[k + 2]);
        }
        const k = (row * 17 + 16) * 4;
        ATMO.apTinf.value[row].set(apBuf[k], apBuf[k + 1], apBuf[k + 2]);
      }
    }
    return true;
  }
  return { update, sunTransmit, transmit, multi, view, irr, ap };
}

// uniform-объекты таблицы дымки для вершин материалов
export function apUniforms() {
  return { uApSky: ATMO.apSky, uApTinf: ATMO.apTinf, uHaze: ATMO.haze, uAltKm: ATMO.alt, uNightSky: ATMO.nightSky };
}
// Общие uniform-объекты атмосферы для любого шейдера.
export function uniforms() {
  return {
    tSkyView: ATMO.skyView, tTransmit: ATMO.transmittance, tMulti: ATMO.multi, tSkyIrr: ATMO.irradiance,
    uCamR: ATMO.camR, uSunIllum: ATMO.sunIllum, uHaze: ATMO.haze, uAltKm: ATMO.alt, uSunDirA: ATMO.sunDir, uNightSky: ATMO.nightSky,
  };
}
