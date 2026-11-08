// Объёмные кучевые облака (для конвейера render.js): слой 1,5–3,2 км, форма — трёхмерный шум Перлина —
// Ворли (64³) с размыванием краёв мелким шумом Ворли (32³), обе текстуры рисуются на видеокарте при запуске.
// Где облака — та же карта покрытия, что даёт их тень на земле (world.js cloudCover/cloudN): тень совпадает
// с облаком. Свет: путь к солнцу 6 шагами, многократное рассеяние октавами (Вреннинге), две фазы
// Хеньи — Гринстейна (серебряный край к солнцу), рассеянный свет неба сверху и земли снизу. Дальние облака
// тонут в дымке (воздушная перспектива из atmosphere.js). Счёт — в половинном разрешении, только по пикселям
// неба, начало луча дрожит каждый кадр — шум убирает временное сглаживание.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ATMO_GLSL, uniforms as atmoUniforms } from './atmosphere.js?v=f4726a0';
import { CLOUD, CLOUD_GLSL } from './world.js?v=f4726a0';

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

// бесшовный шум: решётка с периодом
const NOISE3 = /* glsl */ `
uniform int uOne, uOct;
vec3 h33(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float worley(vec3 p, float period) {
  vec3 id = floor(p), f = fract(p);
  float d = 1e9;
  for (int z = -uOne; z <= uOne; z++) for (int y = -uOne; y <= uOne; y++) for (int x = -uOne; x <= uOne; x++) {
    vec3 o = vec3(float(x), float(y), float(z));
    vec3 r = o + h33(mod(id + o, period)) - f;
    d = min(d, dot(r, r));
  }
  return 1.0 - clamp(sqrt(d), 0.0, 1.0);
}
float wfbm(vec3 p, float f) { return worley(p * f, f) * 0.625 + worley(p * f * 2.0, f * 2.0) * 0.25 + worley(p * f * 4.0, f * 4.0) * 0.125; }
float grad3(vec3 id, vec3 f, float period) {
  vec3 g = h33(mod(id, period)) * 2.0 - 1.0;
  return dot(normalize(g + 1e-4), f);
}
float perlin(vec3 p, float period) {
  vec3 id = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = grad3(id, f, period), n100 = grad3(id + vec3(1, 0, 0), f - vec3(1, 0, 0), period);
  float n010 = grad3(id + vec3(0, 1, 0), f - vec3(0, 1, 0), period), n110 = grad3(id + vec3(1, 1, 0), f - vec3(1, 1, 0), period);
  float n001 = grad3(id + vec3(0, 0, 1), f - vec3(0, 0, 1), period), n101 = grad3(id + vec3(1, 0, 1), f - vec3(1, 0, 1), period);
  float n011 = grad3(id + vec3(0, 1, 1), f - vec3(0, 1, 1), period), n111 = grad3(id + vec3(1, 1, 1), f - vec3(1, 1, 1), period);
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float pfbm(vec3 p, float f) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < uOct; i++) { s += a * perlin(p * f, f); f *= 2.0; a *= 0.5; }
  return s;
}
float remap(float v, float l0, float h0, float l1, float h1) { return l1 + (v - l0) * (h1 - l1) / (h0 - l0); }
`;
const SHAPE_FRAG = NOISE3 + /* glsl */ `
uniform float uZ; varying vec2 vUv;
void main() {
  vec3 p = vec3(vUv, uZ);
  float pf = clamp(pfbm(p, 4.0) * 1.35 + 0.5, 0.0, 1.0);
  float w = wfbm(p, 4.0);
  float pw = clamp(remap(pf, w - 1.0, 1.0, 0.0, 1.0), 0.0, 1.0);
  gl_FragColor = vec4(pw, wfbm(p, 4.0), wfbm(p, 8.0), wfbm(p, 16.0));
}
`;
const DETAIL_FRAG = NOISE3 + /* glsl */ `
uniform float uZ; varying vec2 vUv;
void main() {
  vec3 p = vec3(vUv, uZ);
  gl_FragColor = vec4(wfbm(p, 2.0), wfbm(p, 4.0), wfbm(p, 8.0), 1.0);
}
`;
// карта покрытия вокруг камеры (60 × 60 км): та же функция, что у тени облаков на земле. Только крупные
// октавы — мелкое покрытие, вытянутое по высоте слоя, давало вертикальные полосы; мелкую форму даёт 3D-шум.
const WEATHER_FRAG = CLOUD_GLSL + /* glsl */ `
uniform vec2 uCenter; uniform float uSpan; varying vec2 vUv;
void main() {
  vec2 xz = uCenter + (vUv - 0.5) * uSpan;
  gl_FragColor = vec4(cloudCover(cloudN(cloudUV(xz), 2)), 0.0, 0.0, 1.0);
}
`;
const MARCH_FRAG = CLOUD_GLSL + ATMO_GLSL + /* glsl */ `
uniform sampler2D tDepth, tWeather;
uniform highp sampler3D tShape, tDetail;
uniform mat4 uInvVP;
uniform vec3 uCam, uWind, uSunCol;
uniform vec2 uCenter;
uniform float uSpan, uBase, uTop, uExt, uFrame, uNight, uMoon, uMS, uCoverMax;
uniform int uLight;
uniform vec3 uMoonDir;
varying vec2 vUv;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (12.566370614 * pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5)); }
float remap(float v, float l0, float h0, float l1, float h1) { return l1 + (v - l0) * (h1 - l1) / (h0 - l0); }
float weather(vec2 xz) { return textureLod(tWeather, (xz - uCenter) / uSpan + 0.5, 0.0).r; }
float density(vec3 p, bool cheap) {
  float hf = (p.y - uBase) / (uTop - uBase);
  if (hf < 0.0 || hf > 1.0) return 0.0;
  float cover = weather(p.xz);
  if (cover < 0.01) return 0.0;
  vec4 s = textureLod(tShape, p * (1.0 / 3400.0) + uWind, 0.0);
  float low = s.g * 0.625 + s.b * 0.25 + s.a * 0.125;
  float base = remap(s.r, -(1.0 - low), 1.0, 0.0, 1.0);
  // кучевые: плоское дно, округлый верх; плотнее при большем покрытии
  float grad = smoothstep(0.0, 0.07, hf) * smoothstep(1.0, 0.3 + 0.35 * cover, hf);
  // покрытие с карты — до 0,55: внутри облачного пятна видна ячеистая форма шума, а не сплошная масса
  float cv = cover * uCoverMax;
  float c = remap(base * grad, 1.0 - cv, 1.0, 0.0, 1.0) * cv;
  if (c <= 0.0) return 0.0;
  if (cheap) return c;
  vec3 d = textureLod(tDetail, p * (1.0 / 520.0) + uWind * 4.0, 0.0).rgb;
  float hfn = d.r * 0.625 + d.g * 0.25 + d.b * 0.125;
  float dm = mix(hfn, 1.0 - hfn, clamp(hf * 5.0, 0.0, 1.0));
  return max(remap(c, dm * 0.32, 1.0, 0.0, 1.0), 0.0);
}
void main() {
  float d = texture2D(tDepth, vUv).x;
  if (d < 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(wp.xyz / wp.w - uCam);
  if (rd.y < 0.012) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float t0 = (uBase - uCam.y) / rd.y, t1 = (uTop - uCam.y) / rd.y;
  if (t0 > 70000.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  t1 = min(t1, t0 + 18000.0);
  // шагов — по длине пути в слое: сверху мелко (до 25 м), у горизонта до 96 шагов по ~190 м
  int N = int(clamp((t1 - t0) / 25.0, 40.0, 96.0));
  float stp = (t1 - t0) / float(N);
  float t = t0 + stp * fract(ign(gl_FragCoord.xy) + uFrame * 0.618034);
  float cs = dot(rd, uSunDirA);
  // две фазы: вперёд (серебряный край) и назад; октавы многократного рассеяния — шире и слабее
  float ph0 = mix(hg(cs, 0.8), hg(cs, -0.3), 0.3), ph1 = mix(hg(cs, 0.4), hg(cs, -0.15), 0.3), ph2 = 0.0796;
  vec3 ambTop = atmSky(vec3(0.0, 1.0, 0.0)) * 0.9 + uNightSky * 2.0;
  vec3 ambBot = atmSky(normalize(vec3(rd.x, 0.05, rd.z))) * 0.35 + uNightSky;
  vec3 sunL = uSunCol * uSunIllum;
  vec3 moonL = vec3(0.55, 0.62, 0.8) * uMoon;
  float cm = dot(rd, uMoonDir);
  vec3 L = vec3(0.0);
  float T = 1.0, tw = 0.0, ws = 0.0;
  for (int i = 0; i < 96; i++) {
    if (i >= N) break;
    vec3 p = uCam + rd * t;
    float dn = density(p, false);
    if (dn > 0.002) {
      float sig = dn * uExt;
      // путь к солнцу: 6 шагов (последние — без мелкого шума)
      float od = 0.0;
      for (int j = 0; j < uLight; j++) {
        float ls = 70.0 * pow(1.7, float(j));
        od += density(p + uSunDirA * ls, j > 2) * ls * 0.55;
      }
      od *= uExt;
      float hf = clamp((p.y - uBase) / (uTop - uBase), 0.0, 1.0);
      // октавы многократного рассеяния; uMS — добавка за счёт многих отражений внутри облака (альбедо ~0,99)
      vec3 Ls = sunL * uMS * (ph0 * exp(-od) + 0.5 * ph1 * exp(-od * 0.5) + 0.25 * ph2 * exp(-od * 0.25));
      // «пудра»: внутри плотного облака освещённая кромка темнее (тёмные края к солнцу)
      Ls *= 1.0 - 0.6 * exp(-dn * 6.0);
      Ls += moonL * hg(cm, 0.6) * exp(-od * 0.5);
      vec3 La = mix(ambBot, ambTop, hf) * (0.65 + 0.35 * hf);
      vec3 S = (Ls + La) * sig;
      float e = exp(-sig * stp);
      L += T * (S - S * e) / sig;
      float a = T * (1.0 - e);
      tw += t * a; ws += a;
      T *= e;
      if (T < 0.015) break;
    }
    t += stp;
  }
  if (ws > 0.0) {
    // воздушная перспектива до средней глубины облака
    float tm = tw / ws;
    float h0 = max(uAltKm + uCam.y * 0.001, 0.0);
    vec3 Tap = atmPathT(h0, rd.y, tm * 0.001);
    vec3 Tinf = atmTransmit(uCamR, rd.y);
    vec3 Sap = atmSky(rd) * (1.0 - Tap) / max(1.0 - Tinf, vec3(0.02));
    L = L * Tap + Sap * (1.0 - T);
  }
  gl_FragColor = vec4(L, T);
}
`;

// Накопление облаков по кадрам (половинное разрешение): прошлый кадр — по направлению луча (облака далеко),
// смешение 1:8, ограничение по соседям — без следов при повороте камеры.
const ACCUM_FRAG = /* glsl */ `
uniform sampler2D tCur, tPrev;
uniform mat4 uInvVP, uPrevVP;
uniform vec3 uCam;
uniform vec2 uTexel;
uniform float uReset;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tCur, vUv);
  vec4 lo = c, hi = c;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec4 s = texture2D(tCur, vUv + vec2(float(x), float(y)) * uTexel);
    lo = min(lo, s); hi = max(hi, s);
  }
  vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 d = normalize(wp.xyz / wp.w - uCam);
  vec4 pc = uPrevVP * vec4(uCam + d * 5000.0, 1.0);
  vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  if (uReset > 0.5 || pc.w <= 0.0 || puv.x < 0.0 || puv.y < 0.0 || puv.x > 1.0 || puv.y > 1.0) { gl_FragColor = c; return; }
  vec4 h = clamp(texture2D(tPrev, puv), lo, hi);
  gl_FragColor = mix(h, c, 0.125);
}
`;

function noise3D(renderer, size, frag) {
  const rt = new THREE.WebGL3DRenderTarget(size, size, size, { depthBuffer: false });
  const tex = rt.texture;
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  const m = new THREE.ShaderMaterial({ uniforms: { uZ: { value: 0 }, uOne: { value: 1 }, uOct: { value: 5 } }, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
  const q = new FullScreenQuad(m);
  const prev = renderer.getRenderTarget();
  for (let z = 0; z < size; z++) {
    m.uniforms.uZ.value = (z + 0.5) / size;
    renderer.setRenderTarget(rt, z);
    q.render(renderer);
  }
  renderer.setRenderTarget(prev);
  m.dispose(); q.dispose();
  return rt;
}

export function createClouds(renderer) {
  const shape = noise3D(renderer, 64, SHAPE_FRAG);
  const detail = noise3D(renderer, 32, DETAIL_FRAG);
  const SPAN = 60000;
  const weather = new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const wm = new THREE.ShaderMaterial({
    uniforms: { uCloudTime: CLOUD.time, uCloudCover: CLOUD.cover, uCloudSun: CLOUD.sun, uCloudShadow: CLOUD.shadow, uCenter: { value: new THREE.Vector2() }, uSpan: { value: SPAN } },
    vertexShader: VERT, fragmentShader: WEATHER_FRAG, depthTest: false, depthWrite: false,
  });
  const wq = new FullScreenQuad(wm);
  const out = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const mm = new THREE.ShaderMaterial({
    uniforms: Object.assign({
      uCloudTime: CLOUD.time, uCloudCover: CLOUD.cover, uCloudSun: CLOUD.sun, uCloudShadow: CLOUD.shadow,
      tDepth: { value: null }, tWeather: { value: weather.texture }, tShape: { value: shape.texture }, tDetail: { value: detail.texture },
      uInvVP: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector3() },
      uSunCol: { value: new THREE.Vector3(1, 1, 1) }, uCenter: wm.uniforms.uCenter, uSpan: { value: SPAN }, uMS: { value: 2.5 }, uCoverMax: { value: 0.58 }, uLight: { value: 6 },
      uBase: { value: 1500 }, uTop: { value: 3200 }, uExt: { value: 0.035 }, uFrame: { value: 0 }, uNight: { value: 0 },
      uMoon: { value: 0 }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    }, atmoUniforms()),
    vertexShader: VERT, fragmentShader: MARCH_FRAG, depthTest: false, depthWrite: false,
  });
  const mq = new FullScreenQuad(mm);
  const hist = [out.clone(), out.clone()];
  const am = new THREE.ShaderMaterial({
    uniforms: { tCur: { value: out.texture }, tPrev: { value: null }, uInvVP: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() },
      uCam: { value: new THREE.Vector3() }, uTexel: { value: new THREE.Vector2() }, uReset: { value: 1 } },
    vertexShader: VERT, fragmentShader: ACCUM_FRAG, depthTest: false, depthWrite: false,
  });
  const aq = new FullScreenQuad(am);
  let hc = 0, resetHist = true;
  let frame = 0;
  const lastCenter = new THREE.Vector2(1e9, 0);
  let lastTime = -1e9;

  function setSize(w, h) {
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    out.setSize(hw, hh); hist[0].setSize(hw, hh); hist[1].setSize(hw, hh);
    am.uniforms.uTexel.value.set(1 / hw, 1 / hh);
    resetHist = true;
  }

  // invVP — обратная (сдвинутая) проекция кадра, prevVP — прошлого; sky — createSky (цвет солнца, ночь, луна)
  function render(depthTexture, camera, invVP, sky, time, prevVP, reset) {
    const u = mm.uniforms;
    // карта покрытия: при сдвиге камеры на километр или раз в 2 с (облака плывут)
    const c = wm.uniforms.uCenter.value;
    if (Math.abs(camera.position.x - lastCenter.x) > 1000 || Math.abs(camera.position.z - lastCenter.y) > 1000 || Math.abs(time - lastTime) > 2) {
      c.set(Math.round(camera.position.x / 500) * 500, Math.round(camera.position.z / 500) * 500);
      lastCenter.copy(c); lastTime = time;
      renderer.setRenderTarget(weather);
      wq.render(renderer);
    }
    u.tDepth.value = depthTexture;
    u.uInvVP.value.copy(invVP);
    u.uCam.value.copy(camera.position);
    // ветер: форма медленно плывёт вместе с картой покрытия
    u.uWind.value.set(time * 0.0055 * 1100 / 3400, 0, time * 0.002 * 1100 / 3400);
    const st = sky.state;
    u.uSunCol.value.set(st.sunColor.r, st.sunColor.g, st.sunColor.b).multiplyScalar(THREE.MathUtils.smoothstep(st.sunDir.y, -0.06, 0.06));
    u.uNight.value = st.night;
    u.uMoon.value = 0.06 * st.night;
    u.uMoonDir.value.copy(sky.uniforms.uMoonDir.value);
    u.uFrame.value = frame++ % 64;
    renderer.setRenderTarget(out);
    mq.render(renderer);
    const a = am.uniforms;
    a.tPrev.value = hist[hc].texture;
    a.uInvVP.value.copy(invVP);
    if (prevVP) a.uPrevVP.value.copy(prevVP);
    a.uCam.value.copy(camera.position);
    a.uReset.value = resetHist || reset || !prevVP ? 1 : 0;
    resetHist = false;
    renderer.setRenderTarget(hist[1 - hc]);
    aq.render(renderer);
    hc = 1 - hc;
    return hist[hc].texture;
  }
  function dispose() { [shape, detail, weather, out].concat(hist).forEach(function (t) { t.dispose(); }); [wm, mm, am].forEach(function (m) { m.dispose(); }); [wq, mq, aq].forEach(function (q) { q.dispose(); }); }
  return { render, setSize, dispose, texture: out.texture, weather, shape, detail };
}
