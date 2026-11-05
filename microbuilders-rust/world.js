// Мир вокруг стройки: небо (модель Прихама из three/examples Sky + облака, звёзды, луна), солнце и луна,
// окружение для отражений из того же неба (PMREM), дымка цвета горизонта, рельеф с выровненной площадкой,
// карта покрытия земли (глина, щебень, колеи, трава) и горы на горизонте.
import * as THREE from 'three';
import { NOISE } from './glsl.js?v=83604fc';
import { rng } from './geo.js?v=83604fc';

// ---------- облака и их тень ----------
// Облака — слой на высоте 1,4 км: небо рисует их с перспективой, а каждый материал сцены (linkSky) получает
// тень облака на луче к солнцу. Общие значения — одни объекты uniform на все программы.
export const CLOUD = {
  time: { value: 0 }, cover: { value: 0.27 }, sun: { value: new THREE.Vector3(0, 1, 0) }, shadow: { value: 1 },
  fogSun: { value: new THREE.Color(0, 0, 0) },
};
const CLOUD_GLSL = /* glsl */ `
uniform float uCloudTime;
uniform float uCloudCover;
uniform vec3 uCloudSun;
uniform float uCloudShadow;
float cHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float cNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(cHash(i), cHash(i + vec2(1.0, 0.0)), u.x), mix(cHash(i + vec2(0.0, 1.0)), cHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec2 cloudUV(vec2 xz) { return xz * (1.0 / 1100.0) + vec2(uCloudTime * 0.0055, uCloudTime * 0.002); }
float cloudN(vec2 q, int oct) {
  float n = 0.0, a = 0.55;
  for (int i = 0; i < 6; i++) { if (i >= oct) break; n += a * (cNoise(q) * 2.0 - 1.0); q = q * 2.07 + vec2(13.1, 7.3); a *= 0.5; }
  return n;
}
float cloudCover(float n) { return smoothstep(0.62 - uCloudCover, 0.95 - uCloudCover * 0.8, n * 0.5 + 0.5); }
// доля прямого солнца в точке w: облако на луче к солнцу (мягкая тень — без мелких октав)
float cloudShadow(vec3 w) {
  if (uCloudShadow < 0.01 || uCloudSun.y < 0.03) return 1.0;
  vec2 xz = w.xz + uCloudSun.xz * ((1400.0 - w.y) / uCloudSun.y);
  // у горизонта луч к облаку уходит за километры, в дымку: тень слабее
  return 1.0 - 0.8 * cloudCover(cloudN(cloudUV(xz), 4)) * uCloudShadow * smoothstep(0.03, 0.3, uCloudSun.y);
}
`;

// Тень облаков меняется на сотнях метров — её хватает считать в вершинах (дешевле, чем в каждом пикселе 4K).
const LINK_VERTEX = /* glsl */ `
{
  vec4 sw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  sw = instanceMatrix * sw;
  #endif
  vSkyW = (modelMatrix * sw).xyz;
  vCloud = cloudShadow(vSkyW);
}
`;
// Прямой свет направленных источников — с тенью облаков; у листвы и травы (MB_TRANSLUCENT) ещё и свет насквозь.
const LIGHTS_BEGIN = (function () {
  const src = THREE.ShaderChunk.lights_fragment_begin;
  const k = src.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
  const tail = src.slice(k);
  const j = tail.indexOf('RE_Direct( directLight, geometryPosition');
  return src.slice(0, k) + tail.slice(0, j) + `directLight.color *= mbCloud;
		#ifdef MB_TRANSLUCENT
		reflectedLight.directDiffuse += directLight.color * material.diffuseColor * mbTranslucent( directLight.direction, geometryViewDir, geometryNormal );
		#endif
		` + tail.slice(j);
})();
// Дымка: к солнцу — светлее и теплее (рассеяние вперёд), как ореол у горизонта на закате.
const FOG_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
  float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  float fogSun = pow( max( dot( normalize( vSkyW - cameraPosition ), uCloudSun ), 0.0 ), 6.0 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor + uFogSun * fogSun, fogFactor );
#endif
`;

// Подключить материал к небу: тень облаков, дымка к солнцу. Свой onBeforeCompile материала сохраняется.
export function linkSky(material) {
  if (!material || material.userData.skyLinked) return false;
  if (!(material.isMeshStandardMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial)) return false;
  material.userData.skyLinked = true;
  const proto = THREE.Material.prototype;
  const prev = material.onBeforeCompile !== proto.onBeforeCompile ? material.onBeforeCompile : null;
  const prevKey = material.customProgramCacheKey !== proto.customProgramCacheKey ? material.customProgramCacheKey : null;
  const baseKey = prevKey ? prevKey.call(material) : prev ? prev.toString() : '';
  material.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    Object.assign(shader.uniforms, { uCloudTime: CLOUD.time, uCloudCover: CLOUD.cover, uCloudSun: CLOUD.sun, uCloudShadow: CLOUD.shadow, uFogSun: CLOUD.fogSun });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkyW;\nvarying float vCloud;\n' + CLOUD_GLSL)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + LINK_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkyW;\nvarying float vCloud;\nuniform vec3 uFogSun;\nuniform vec3 uCloudSun;')
      .replace('#include <lights_fragment_begin>', 'float mbCloud = vCloud;\n' + LIGHTS_BEGIN)
      .replace('#include <fog_fragment>', FOG_FRAGMENT);
  };
  material.customProgramCacheKey = function () { return baseKey + '|sky2'; };
  material.needsUpdate = true;
  return true;
}
// Все материалы объекта (и потомков).
export function linkSkyTree(root) {
  let n = 0;
  root.traverse(function (o) {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (linkSky(m)) n++; });
  });
  return n;
}

// ---------- небо ----------

const SKY_VERTEX = /* glsl */ `
uniform vec3 sunPosition;
uniform float rayleigh;
uniform float turbidity;
uniform float mieCoefficient;
varying vec3 vWorldPosition;
varying vec3 vSunDirection;
varying float vSunfade;
varying vec3 vBetaR;
varying vec3 vBetaM;
varying float vSunE;
const vec3 up = vec3(0.0, 1.0, 0.0);
const float e = 2.71828182845904523536028747135266249775724709369995957;
const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
const vec3 MieConst = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);
const float cutoffAngle = 1.6110731556870734;
const float steepness = 1.5;
const float EE = 1000.0;
float sunIntensity(float zenithAngleCos) {
  zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
  return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
}
vec3 totalMie(float T) { float c = (0.2 * T) * 10E-18; return 0.434 * c * MieConst; }
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w * 0.99999;
  vSunDirection = normalize(sunPosition);
  vSunE = sunIntensity(dot(vSunDirection, up));
  vSunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);
  float rayleighCoefficient = rayleigh - (1.0 * (1.0 - vSunfade));
  vBetaR = totalRayleigh * rayleighCoefficient;
  vBetaM = totalMie(turbidity) * mieCoefficient;
}
`;

const SKY_FRAGMENT = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vSunDirection;
varying float vSunfade;
varying vec3 vBetaR;
varying vec3 vBetaM;
varying float vSunE;
uniform float mieDirectionalG;
uniform float uTime;
uniform float uNight;
uniform vec3 uMoonDir;
uniform vec3 uSunColor;
uniform float uGain;
const vec3 up = vec3(0.0, 1.0, 0.0);
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const float sunAngularDiameterCos = 0.99995;
const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
const float ONE_OVER_FOURPI = 0.07957747154594767;
float rayleighPhase(float cosTheta) { return THREE_OVER_SIXTEENPI * (1.0 + pow(cosTheta, 2.0)); }
float hgPhase(float cosTheta, float g) {
  float g2 = pow(g, 2.0);
  float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
  return ONE_OVER_FOURPI * ((1.0 - g2) * inverse);
}
vec3 skyColor(vec3 direction, bool disk) {
  float zenithAngle = acos(max(0.0, dot(up, direction)));
  float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / PI), -1.253));
  float sR = rayleighZenithLength * inverse;
  float sM = mieZenithLength * inverse;
  vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));
  float cosTheta = dot(direction, vSunDirection);
  float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
  vec3 betaRTheta = vBetaR * rPhase;
  float mPhase = hgPhase(cosTheta, mieDirectionalG);
  vec3 betaMTheta = vBetaM * mPhase;
  vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));
  Lin *= mix(vec3(1.0), pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0));
  vec3 L0 = vec3(0.1) * Fex;
  if (disk) {
    float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
    L0 += (vSunE * 19000.0 * Fex) * sundisk;
  }
  vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
  return pow(texColor, vec3(1.0 / (1.2 + (1.2 * vSunfade))));
}
void main() {
  vec3 direction = normalize(vWorldPosition - cameraPosition);
  vec3 col = skyColor(direction, true);
  // облака: слой на высоте 1,4 км с перспективой (вдали мельче), освещённый солнцем: края к солнцу светлее,
  // плотная середина снизу темнее; к горизонту тают в дымке
  if (direction.y > 0.0 && uCloudCover > 0.0) {
    float t = (1400.0 - cameraPosition.y) / max(direction.y, 0.01);
    vec2 cp = cloudUV(cameraPosition.xz + direction.xz * t);
    float n = cloudN(cp, 6);
    float cover = cloudCover(n);
    float dens = smoothstep(0.62 - uCloudCover, 1.15 - uCloudCover * 0.8, n * 0.5 + 0.5);
    float n2 = cloudN(cp + vSunDirection.xz * 0.12, 6);
    float lit = clamp(0.55 + (n - n2) * 2.2, 0.0, 1.0);
    vec3 horizon = skyColor(normalize(vec3(direction.x, 0.04, direction.z)), false);
    float lum = dot(horizon, vec3(0.2126, 0.7152, 0.0722));
    vec3 base = mix(horizon, vec3(lum), 0.55) * 1.05;
    float phase = hgPhase(dot(direction, vSunDirection), 0.55) * 3.0;
    // освещённая сторона — в 2–3 раза ярче неба, плотный низ — серый
    vec3 cloud = base * (0.55 + 0.45 * lit - 0.25 * dens) + uSunColor * (0.3 + 0.85 * lit) * (0.4 + phase) * (1.0 - uNight);
    cloud = mix(cloud, vec3(0.012, 0.015, 0.024), uNight * 0.9);
    float fade = smoothstep(0.03, 0.3, direction.y) * (1.0 - smoothstep(16000.0, 42000.0, t));
    col = mix(col, cloud, cover * fade * 0.96);
  }
  // ночь: глубокая синь, звёзды и луна
  col += vec3(0.0015, 0.0025, 0.006) * uNight;
  if (uNight > 0.01 && direction.y > 0.0) {
    vec3 d = direction * 420.0;
    vec3 id = floor(d);
    float h = hash13(id);
    if (h > 0.9965) {
      vec3 c = id + 0.5 + (vec3(hash13(id + 1.7), hash13(id + 3.1), hash13(id + 5.3)) - 0.5) * 0.6;
      float s = 1.0 - smoothstep(0.0, 0.35, length(d - c));
      float tw = 0.75 + 0.25 * sin(uTime * 2.0 + h * 400.0);
      col += vec3(0.9, 0.92, 1.0) * s * tw * (h - 0.9965) * 900.0 * uNight * smoothstep(0.0, 0.2, direction.y);
    }
    float md = dot(direction, uMoonDir);
    float disc = smoothstep(0.99985, 0.99992, md);
    col += vec3(1.1, 1.08, 1.0) * disc * uNight;
    col += vec3(0.03, 0.035, 0.05) * pow(max(md, 0.0), 300.0) * uNight;
  }
  // диск солнца ярче предела HalfFloat: без ограничения в отражениях выходит бесконечность
  gl_FragColor = vec4(min(col * uGain, vec3(40.0)), 1.0);
}
`;

function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunPosition: { value: new THREE.Vector3(0, 1, 0) },
      rayleigh: { value: 2.2 },
      turbidity: { value: 2.0 },
      mieCoefficient: { value: 0.004 },
      mieDirectionalG: { value: 0.82 },
      uTime: { value: 0 },
      uCloudTime: CLOUD.time, uCloudCover: CLOUD.cover, uCloudSun: CLOUD.sun, uCloudShadow: CLOUD.shadow,
      uNight: { value: 0 },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uGain: { value: 1 },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: NOISE + CLOUD_GLSL + SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

// Тот же расчёт на процессоре: цвет неба у горизонта для дымки и цвет солнца у земли.
// Солнце в «люксах» сцены: прямой свет в 4–6 раз сильнее рассеянного от неба (яркость неба ~1–2), как в жизни.
const SUN = 18;
const totalRayleigh = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
const MieConst = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];
function skyParams(u, sunDir) {
  const sunE = 1000 * Math.max(0, 1 - Math.exp(-((1.6110731556870734 - Math.acos(Math.max(-1, Math.min(1, sunDir.y)))) / 1.5)));
  const sunfade = 1 - Math.min(1, Math.max(0, 1 - Math.exp((sunDir.y * 400000) / 450000)));
  const rc = u.rayleigh.value - (1 - sunfade);
  const c = 0.2 * u.turbidity.value * 10e-18;
  const betaR = totalRayleigh.map(function (v) { return v * rc; });
  const betaM = MieConst.map(function (v) { return 0.434 * c * v * u.mieCoefficient.value; });
  return { sunE, sunfade, betaR, betaM };
}
function airMass(y) {
  const z = Math.acos(Math.max(0, y));
  return 1 / (Math.cos(z) + 0.15 * Math.pow(93.885 - (z * 180) / Math.PI, -1.253));
}
function skyRadiance(u, sunDir, dir, out) {
  const P = skyParams(u, sunDir);
  const m = airMass(dir.y);
  const cosT = dir.x * sunDir.x + dir.y * sunDir.y + dir.z * sunDir.z;
  const rPhase = 0.05968310365946075 * (1 + Math.pow(cosT * 0.5 + 0.5, 2));
  const g = u.mieDirectionalG.value, g2 = g * g;
  const mPhase = 0.07957747154594767 * (1 - g2) / Math.pow(1 - 2 * g * cosT + g2, 1.5);
  const k = Math.min(1, Math.max(0, Math.pow(1 - sunDir.y, 5)));
  for (let i = 0; i < 3; i++) {
    const fex = Math.exp(-(P.betaR[i] * 8400 + P.betaM[i] * 1250) * m);
    const ratio = (P.betaR[i] * rPhase + P.betaM[i] * mPhase) / (P.betaR[i] + P.betaM[i]);
    let lin = Math.pow(P.sunE * ratio * (1 - fex), 1.5);
    lin *= 1 + (Math.pow(P.sunE * ratio * fex, 0.5) - 1) * k;
    const tex = (lin + 0.1 * fex) * 0.04 + [0, 0.0003, 0.00075][i];
    out[i] = Math.pow(tex, 1 / (1.2 + 1.2 * P.sunfade));
  }
  return out;
}
function sunTransmittance(u, sunDir, out) {
  const P = skyParams(u, sunDir);
  const m = airMass(sunDir.y);
  for (let i = 0; i < 3; i++) out[i] = Math.exp(-(P.betaR[i] * 8400 + P.betaM[i] * 1250) * m);
  return out;
}

// ---------- рельеф ----------

function fbm2(fn, x, z, oct) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * fn(x * f + i * 17.3, z * f - i * 9.1); f *= 2.03; a *= 0.5; }
  return s;
}
function noise2Factory(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, function (_, i) { return i; });
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  return function (x, z) {
    const X = Math.floor(x), Z = Math.floor(z);
    const fx = x - X, fz = z - Z;
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
    function gd(i, j, dx, dz) { const g = grad[perm[(perm[(X + i) & 255] + Z + j) & 255] & 7]; return g[0] * dx + g[1] * dz; }
    const a = gd(0, 0, fx, fz), b = gd(1, 0, fx - 1, fz), c = gd(0, 1, fx, fz - 1), d = gd(1, 1, fx - 1, fz - 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 1.2;
  };
}

export function createTerrain(seed, flatRadius) {
  const n1 = noise2Factory(seed), n2 = noise2Factory(seed + 1), n3 = noise2Factory(seed + 2);
  function heightAt(x, z) {
    const r = Math.hypot(x, z);
    const hills = fbm2(n1, x / 220, z / 220, 5) * 26 + fbm2(n2, x / 70, z / 70, 4) * 4.5;
    const ridge = Math.pow(1 - Math.abs(n3(x / 400, z / 400)), 3) * 18;
    const w = THREE.MathUtils.smoothstep(r, flatRadius, flatRadius + 55);
    const bumps = fbm2(n2, x / 6, z / 6, 3) * 0.08;
    return (hills + ridge - 8) * w + bumps * (1 - w * 0.5);
  }
  return { heightAt, noise: n1, noise2: n2 };
}

// Карта покрытия земли вокруг стройки: R — глина, G — щебень, B — колеи и утоптанная земля, A — трава.
export function splatMap(terrain, layout, size = 512, span = 240) {
  const data = new Uint8Array(size * size * 4);
  const n = terrain.noise, n2 = terrain.noise2;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1) - 0.5) * span, z = (j / (size - 1) - 0.5) * span;
      const nn = fbm2(n, x / 9, z / 9, 4);
      const nf = fbm2(n2, x / 2.2, z / 2.2, 3);
      // площадка: овал вокруг здания с неровной кромкой
      const dx = (x - layout.site.x) / layout.site.rx, dz = (z - layout.site.z) / layout.site.rz;
      const site = 1 - THREE.MathUtils.smoothstep(Math.hypot(dx, dz) + nn * 0.18 + nf * 0.05, 0.85, 1.05);
      // двор со щебнем
      const yx = (x - layout.yard.x) / layout.yard.rx, yz = (z - layout.yard.z) / layout.yard.rz;
      const yard = 1 - THREE.MathUtils.smoothstep(Math.hypot(yx, yz) + nn * 0.2 + nf * 0.06, 0.7, 1.0);
      // дорога от края к двору
      let road = 0;
      layout.roads.forEach(function (rd) {
        const ax = rd[0][0], az = rd[0][1], bx = rd[1][0], bz = rd[1][1];
        const vx = bx - ax, vz = bz - az; const l2 = vx * vx + vz * vz;
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
        const d = Math.hypot(x - ax - vx * t, z - az - vz * t);
        road = Math.max(road, 1 - THREE.MathUtils.smoothstep(d + nn * 0.6, rd[2] * 0.7, rd[2]));
      });
      // колеи по дороге
      let rut = 0;
      layout.roads.forEach(function (rd) {
        const ax = rd[0][0], az = rd[0][1], bx = rd[1][0], bz = rd[1][1];
        const vx = bx - ax, vz = bz - az; const l = Math.hypot(vx, vz);
        const t = ((x - ax) * vx + (z - az) * vz) / (l * l);
        if (t < 0 || t > 1) return;
        const side = ((x - ax) * -vz + (z - az) * vx) / l;
        const tr = Math.min(Math.abs(side - 0.95), Math.abs(side + 0.95));
        rut = Math.max(rut, 1 - THREE.MathUtils.smoothstep(tr + nf * 0.08, 0.12, 0.32));
      });
      const dirt = Math.max(site * (0.75 + 0.25 * nf), road * 0.55);
      const gravel = Math.max(yard * (0.8 + 0.2 * nf), road * 0.75 * (0.6 + 0.4 * nn));
      const worn = Math.max(rut, site * 0.25);
      const grass = Math.max(0, Math.min(1, 1 - Math.max(dirt, gravel) * 1.3 + nn * 0.4));
      const k = (j * size + i) * 4;
      data[k] = Math.round(Math.min(1, dirt) * 255);
      data[k + 1] = Math.round(Math.min(1, gravel) * 255);
      data[k + 2] = Math.round(Math.min(1, worn) * 255);
      data[k + 3] = Math.round(grass * 255);
    }
  }
  // Вторая карта — луг: R сухость травы, G высота травы, B лесная подстилка под кронами (addCanopy),
  // A сырость (лужи в колеях и низинах площадки). По ней одинаково красятся земля и травинки.
  const meadow = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1) - 0.5) * span, z = (j / (size - 1) - 0.5) * span;
      const k = (j * size + i) * 4;
      const grass = data[k + 3] / 255, dirt = data[k] / 255, rut = data[k + 2] / 255;
      const dryBig = fbm2(n, x / 38 + 40, z / 38 - 12, 4), dryFine = fbm2(n2, x / 7 - 3, z / 7 + 9, 3);
      const dry = THREE.MathUtils.clamp(0.35 + dryBig * 1.1 + dryFine * 0.35, 0, 1);
      // у кромки площадки трава вытоптана и низкая, дальше — по пятнам: где по колено, где по щиколотку
      const edge = THREE.MathUtils.smoothstep(grass, 0.25, 0.95);
      const patch = THREE.MathUtils.clamp(0.7 + fbm2(n2, x / 13 + 7, z / 13 - 5, 3) * 0.9, 0.25, 1.0);
      const height = edge * patch;
      const low = fbm2(n2, x / 3.2 + 21, z / 3.2 + 4, 3);
      const wet = Math.max(rut * THREE.MathUtils.smoothstep(low, 0.12, 0.3), dirt * THREE.MathUtils.smoothstep(low, 0.2, 0.34) * 0.85);
      meadow[k] = Math.round(dry * 255);
      meadow[k + 1] = Math.round(height * 255);
      meadow[k + 2] = 0;
      meadow[k + 3] = Math.round(THREE.MathUtils.clamp(wet, 0, 1) * 255);
    }
  }
  function dataTexture(arr) {
    const tex = new THREE.DataTexture(arr, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }
  const tex = dataTexture(data), meadowTex = dataTexture(meadow);
  function read(arr, x, z, out) {
    const u = x / span + 0.5, v = z / span + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    const k = (Math.round(v * (size - 1)) * size + Math.round(u * (size - 1))) * 4;
    out[0] = arr[k] / 255; out[1] = arr[k + 1] / 255; out[2] = arr[k + 2] / 255; out[3] = arr[k + 3] / 255;
    return out;
  }
  function sample(x, z) { return read(data, x, z, [0, 0, 0, 0]) || [0, 0, 0, 1]; }
  // вне карты — открытый луг средней сухости
  function sampleMeadow(x, z) { return read(meadow, x, z, [0, 0, 0, 0]) || [0.45, 1, 0, 0]; }
  // Подстилка под кронами: круг радиуса r вокруг каждого дерева, мягкий край.
  function addCanopy(trees) {
    trees.forEach(function (t) {
      const r = t[2];
      const i0 = Math.max(0, Math.floor(((t[0] - r) / span + 0.5) * (size - 1))), i1 = Math.min(size - 1, Math.ceil(((t[0] + r) / span + 0.5) * (size - 1)));
      const j0 = Math.max(0, Math.floor(((t[1] - r) / span + 0.5) * (size - 1))), j1 = Math.min(size - 1, Math.ceil(((t[1] + r) / span + 0.5) * (size - 1)));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = (i / (size - 1) - 0.5) * span, z = (j / (size - 1) - 0.5) * span;
        const d = Math.hypot(x - t[0], z - t[1]) / r;
        if (d >= 1) continue;
        const k = (j * size + i) * 4 + 2;
        meadow[k] = Math.max(meadow[k], Math.round((1 - THREE.MathUtils.smoothstep(d, 0.45, 1)) * 255));
      }
    });
    meadowTex.needsUpdate = true;
  }
  return { texture: tex, meadow: meadowTex, span, sample, sampleMeadow, addCanopy };
}

// ---------- тропы ----------
// Карта вытоптанности вокруг стройки (64 × 64 м, 256²): ноги рабочих и колёса тачек её накапливают; земля по ней
// темнее и глаже, трава ниже. Копится на процессоре, в текстуру уходит не чаще двух раз в секунду.
export function createWear(span = 64, size = 256) {
  const data = new Float32Array(size * size);
  const bytes = new Uint8Array(size * size);
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const cell = span / size;
  let dirty = false, clock = 0;
  function add(x, z, amount, radius) {
    const ci = (x / span + 0.5) * size, cj = (z / span + 0.5) * size, rr = radius / cell;
    const i0 = Math.max(0, Math.floor(ci - rr)), i1 = Math.min(size - 1, Math.ceil(ci + rr));
    const j0 = Math.max(0, Math.floor(cj - rr)), j1 = Math.min(size - 1, Math.ceil(cj + rr));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i + 0.5 - ci, j + 0.5 - cj) / rr;
      if (d >= 1) continue;
      const k = j * size + i;
      data[k] = Math.min(1, data[k] + amount * (1 - d * d));
    }
    dirty = true;
  }
  function update(dt) {
    clock += dt;
    if (!dirty || clock < 0.5) return;
    clock = 0; dirty = false;
    for (let k = 0; k < data.length; k++) bytes[k] = data[k] * 255;
    texture.needsUpdate = true;
  }
  function fade(k) { for (let i = 0; i < data.length; i++) data[i] *= k; dirty = true; }
  return { texture, span, add, update, fade };
}

const TERRAIN_FRAGMENT_HEAD = /* glsl */ `
varying vec3 vWPos;
uniform sampler2D tSplat; uniform sampler2D tMeadow; uniform float uSplatSpan;
uniform sampler2D tWear; uniform float uWearSpan;
uniform sampler2D tGrassA, tGrassN, tGrassO, tDirtA, tDirtN, tDirtO, tGravelA, tGravelN, tGravelO;
uniform float uDetail;
float tHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float tNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1, 0)), u.x), mix(tHash(i + vec2(0, 1)), tHash(i + vec2(1, 1)), u.x), u.y); }
// Две выборки с поворотом и сдвигом, смешанные по крупному шуму: повтор плитки не читается.
vec4 tri(sampler2D t, vec2 uv, float k) {
  vec4 a = texture2D(t, uv);
  if (uDetail < 0.5) return a;
  vec2 uv2 = mat2(0.8, -0.6, 0.6, 0.8) * uv * 0.71 + 0.37;
  vec4 b = texture2D(t, uv2);
  return mix(a, b, k);
}
`;

const TERRAIN_MAP = /* glsl */ `
vec2 wxz = vWPos.xz;
vec4 sp = texture2D(tSplat, wxz / uSplatSpan + 0.5);
vec2 eu = wxz / uSplatSpan + 0.5;
float inside = step(0.0, eu.x) * step(eu.x, 1.0) * step(0.0, eu.y) * step(eu.y, 1.0);
sp = mix(vec4(0.0, 0.0, 0.0, 1.0), sp, inside);
vec4 md = mix(vec4(0.45, 1.0, 0.0, 0.0), texture2D(tMeadow, eu), inside);
float macro = tNoise(wxz * 0.035) * 0.6 + tNoise(wxz * 0.11) * 0.4;
float k = smoothstep(0.3, 0.7, tNoise(wxz * 0.07 + 3.0));
vec4 gA = tri(tGrassA, wxz / 4.0, k), dA = tri(tDirtA, wxz / 4.0, k), vA = tri(tGravelA, wxz / 2.0, k);
vec4 gO = tri(tGrassO, wxz / 4.0, k), dO = tri(tDirtO, wxz / 4.0, k), vO = tri(tGravelO, wxz / 2.0, k);
// смешивание по маскам с учётом рельефа плитки (впадины щебня принимают глину раньше)
float wDirt = sp.r, wGravel = sp.g;
float hv = vO.r; float hd = dO.r;
wGravel = clamp(wGravel * 1.4 - (1.0 - hv) * 0.5 + 0.1, 0.0, 1.0) * step(0.02, sp.g);
float wGrass = clamp(1.0 - wDirt - wGravel, 0.0, 1.0);
float sum = wDirt + wGravel + wGrass + 1e-4;
wDirt /= sum; wGravel /= sum; wGrass /= sum;
vec3 alb = gA.rgb * wGrass + dA.rgb * wDirt + vA.rgb * wGravel;
// утоптано и колеи: темнее и глаже
alb *= 1.0 - sp.b * 0.28;
// крупные пятна; трава — сочная или сухая по карте луга (тот же оттенок у травинок над ней)
alb *= 0.86 + 0.28 * macro;
alb = mix(alb, alb * mix(vec3(0.84, 1.0, 0.74), vec3(1.42, 1.2, 0.62), md.r), wGrass);
// под кронами — хвойная подстилка
vec3 litter = mix(vec3(0.07, 0.048, 0.03), vec3(0.115, 0.078, 0.046), tNoise(wxz * 1.7) * 0.6 + tNoise(wxz * 7.0) * 0.4);
alb = mix(alb, litter, md.b * 0.88 * (1.0 - wDirt * 0.7));
// сырая глина темнее, в низинах колей и площадки — лужи (гладкие, в них отражается небо)
float damp = smoothstep(0.08, 0.6, md.a) * (1.0 - wGrass);
float puddle = smoothstep(0.66, 0.82, md.a) * clamp(wDirt + sp.b * 0.6, 0.0, 1.0) * (1.0 - wGrass);
// тропы и колея: утоптанная земля темнее и глаже, на траве — вытертая до земли полоса
float wear = smoothstep(0.04, 0.75, texture2D(tWear, wxz / uWearSpan + 0.5).r);
alb = mix(alb, mix(dA.rgb * 0.82, alb, 1.0 - wGrass), wear * 0.85);
alb *= 1.0 - 0.2 * wear * (1.0 - wGrass);
alb *= mix(1.0, 0.6, damp);
alb = mix(alb, alb * 0.32, puddle);
diffuseColor.rgb = alb;
float tRough = gO.g * wGrass + dO.g * wDirt + vO.g * wGravel;
tRough = mix(tRough, tRough * 0.82, sp.b);
tRough = mix(tRough, 0.42, damp * 0.7);
tRough = mix(tRough, tRough * 0.8, wear);
tRough = mix(tRough, 0.03, puddle);
float tAo = gO.r * wGrass + dO.r * wDirt + vO.r * wGravel;
`;

const TERRAIN_NORMAL = /* glsl */ `
{
  vec3 nG = tri(tGrassN, wxz / 4.0, k).xyz * 2.0 - 1.0;
  vec3 nD = tri(tDirtN, wxz / 4.0, k).xyz * 2.0 - 1.0;
  vec3 nV = tri(tGravelN, wxz / 2.0, k).xyz * 2.0 - 1.0;
  vec3 tn = normalize(mix(nG * wGrass + nD * wDirt + nV * wGravel, vec3(0.0, 0.0, 1.0), max(puddle, wear * 0.4)));
  vec3 T = normalize((viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  T = normalize(T - normal * dot(normal, T));
  vec3 B = cross(T, normal);
  normal = normalize(mat3(T, B, normal) * tn);
}
`;

export function terrainMaterial(textures, splat, quality, wear) {
  const g = textures.get('grass'), d = textures.get('dirt'), v = textures.get('gravel');
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  m.onBeforeCompile = function (shader) {
    Object.assign(shader.uniforms, {
      tSplat: { value: splat.texture }, tMeadow: { value: splat.meadow }, uSplatSpan: { value: splat.span },
      tGrassA: { value: g.map }, tGrassN: { value: g.normalMap }, tGrassO: { value: g.ormMap },
      tDirtA: { value: d.map }, tDirtN: { value: d.normalMap }, tDirtO: { value: d.ormMap },
      tGravelA: { value: v.map }, tGravelN: { value: v.normalMap }, tGravelO: { value: v.ormMap },
      uDetail: { value: quality.terrainDetail },
      tWear: { value: wear.texture }, uWearSpan: { value: wear.span },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + TERRAIN_FRAGMENT_HEAD)
      .replace('#include <map_fragment>', TERRAIN_MAP)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', TERRAIN_NORMAL)
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= tAo; reflectedLight.indirectSpecular *= tAo;');
  };
  m.customProgramCacheKey = function () { return 'terrain3'; };
  return m;
}

export function terrainMesh(terrain, material, size = 1400, seg = 280) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) p[i + 1] = terrain.heightAt(p[i], p[i + 2]);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Горы на горизонте: кольцо 1,1–3 км, лес внизу, скалы и снег выше; тонет в дымке.
export function mountains(seed) {
  const n = noise2Factory(seed + 9);
  const segA = 360, segR = 12;
  const pos = [], col = [], idx = [];
  const forest = new THREE.Color(0x1f2a1c), rock = new THREE.Color(0x5b5a58), snow = new THREE.Color(0xe8ecf0);
  for (let j = 0; j <= segR; j++) {
    const t = j / segR;
    const r = 1100 + t * 2200;
    for (let i = 0; i <= segA; i++) {
      const a = (i / segA) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const ridge = Math.pow(1 - Math.abs(n(Math.cos(a) * 3 + 10, Math.sin(a) * 3 + t * 2.5)), 2.2);
      const big = (n(Math.cos(a) * 1.3, Math.sin(a) * 1.3) * 0.5 + 0.5);
      const h = (40 + 380 * ridge * big + 90 * n(Math.cos(a) * 9, Math.sin(a) * 9 + t * 5)) * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) - (t > 0.95 ? (t - 0.95) * 4000 : 0);
      pos.push(x, h - 10, z);
      const c = forest.clone();
      if (h > 210) c.lerp(rock, Math.min(1, (h - 210) / 90));
      if (h > 360) c.lerp(snow, Math.min(1, (h - 360) / 50));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < segR; j++) for (let i = 0; i < segA; i++) {
    const a = j * (segA + 1) + i, b = a + segA + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  m.name = 'mountains';
  m.userData.noAO = true;
  return m;
}

// ---------- небо, свет, сутки ----------

export function createSky(renderer, scene, quality) {
  const material = skyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), material);
  sky.name = 'sky';
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  sky.userData.noAO = true;
  scene.add(sky);

  // Для окружения — та же сфера малого радиуса в отдельной сцене.
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), material);
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadow, quality.shadow);
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2.5;
  sun.shadow.blurSamples = 16;
  scene.add(sun);
  scene.add(sun.target);

  const moon = new THREE.DirectionalLight(0x9db4ff, 0);
  scene.add(moon);
  scene.add(moon.target);

  scene.fog = new THREE.FogExp2(0xb8c4cc, 0.00045);

  const sunDir = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  const lastEnvDir = new THREE.Vector3(9, 9, 9);
  const rgb = [0, 0, 0];
  const tmpDir = new THREE.Vector3();
  const state = { hour: 9, night: 0, sunDir, sunColor: new THREE.Color(), envDirty: true, exposure: 1 };

  // Солнце: восход в 5:30 на востоке (+x), в 13:00 на высоте 52° на юге (+z), закат в 20:30 на западе.
  function sunPosition(hour, out) {
    const h = ((hour % 24) + 24) % 24;
    let elev, az;
    if (h >= 5.5 && h <= 20.5) {
      const day = (h - 5.5) / 15;
      elev = Math.sin(day * Math.PI) * THREE.MathUtils.degToRad(52);
      az = THREE.MathUtils.degToRad(100 - 200 * day);
    } else {
      const night = ((h - 20.5 + 24) % 24) / 9;
      elev = -Math.sin(night * Math.PI) * THREE.MathUtils.degToRad(25);
      az = THREE.MathUtils.degToRad(-100 - 160 * night);
    }
    out.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
    return out;
  }

  function update(hour, time, focus) {
    state.hour = hour;
    sunPosition(hour, sunDir);
    moonDir.copy(sunDir).multiplyScalar(-1);
    moonDir.y = Math.abs(moonDir.y) * 0.8 + 0.25;
    moonDir.normalize();
    const u = material.uniforms;
    u.sunPosition.value.copy(sunDir).multiplyScalar(400000);
    u.uTime.value = time;
    u.uMoonDir.value.copy(moonDir);
    const night = 1 - THREE.MathUtils.smoothstep(sunDir.y, -0.12, 0.04);
    state.night = night;
    u.uNight.value = night;

    sunTransmittance(u, sunDir, rgb);
    const lift = THREE.MathUtils.smoothstep(sunDir.y, -0.02, 0.12);
    state.sunColor.setRGB(rgb[0], rgb[1], rgb[2], THREE.LinearSRGBColorSpace);
    u.uSunColor.value.copy(state.sunColor);
    sun.color.copy(state.sunColor);
    // Источники не прячутся (visible), а гаснут: иначе меняется их число и все шейдеры пересобираются
    // на рассвете и закате. Ночью карта теней солнца не перерисовывается.
    sun.intensity = SUN * lift;
    sun.shadow.autoUpdate = lift > 0.001;
    moon.intensity = 0.35 * night;
    CLOUD.time.value = time;
    CLOUD.sun.value.copy(sunDir);
    CLOUD.fogSun.value.copy(state.sunColor).multiplyScalar(0.6 * lift * (1 - night));

    const r = 60;
    sun.position.copy(focus).addScaledVector(sunDir, r);
    sun.target.position.copy(focus);
    moon.position.copy(focus).addScaledVector(moonDir, r);
    moon.target.position.copy(focus);

    // дымка: средний цвет неба у горизонта
    const fog = [0, 0, 0];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      tmpDir.set(Math.cos(a), 0.035, Math.sin(a)).normalize();
      skyRadiance(u, sunDir, tmpDir, rgb);
      fog[0] += rgb[0] / 8; fog[1] += rgb[1] / 8; fog[2] += rgb[2] / 8;
    }
    const nf = night;
    // дымка темнее неба у горизонта: в ней свет рассеян, но земля и горы её не подсвечивают
    const fk = 0.72;
    scene.fog.color.setRGB(fog[0] * fk * (1 - nf) + 0.004 * nf, fog[1] * fk * (1 - nf) + 0.006 * nf, fog[2] * fk * (1 - nf) + 0.011 * nf, THREE.LinearSRGBColorSpace);

    state.exposure = THREE.MathUtils.lerp(0.42, 0.95, THREE.MathUtils.smoothstep(-sunDir.y, -0.25, 0.02)) * THREE.MathUtils.lerp(1, 1.9, night);
    if (lastEnvDir.distanceTo(sunDir) > 0.012 || state.envDirty) refreshEnv();
  }

  function refreshEnv() {
    lastEnvDir.copy(sunDir);
    state.envDirty = false;
    const prev = envRT;
    envRT = pmrem.fromScene(envScene, 0.0, 0.1, 200);
    scene.environment = envRT.texture;
    if (prev) prev.dispose();
  }

  function follow(camera) { sky.position.copy(camera.position); }

  // Квадрат карты теней — по площадке (центр и радиус в метрах).
  function fitShadow(center, radius) {
    const c = sun.shadow.camera;
    c.left = -radius; c.right = radius; c.top = radius; c.bottom = -radius;
    c.near = 1; c.far = 160;
    c.updateProjectionMatrix();
  }

  return { sky, sun, moon, material, update, follow, fitShadow, refreshEnv, state, pmrem, sunPosition };
}
