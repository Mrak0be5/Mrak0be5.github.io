// Картинка после рендера: MSAA в HalfFloat → затенение углов GTAO → мягкое свечение ярких бликов →
// цветокоррекция (баланс белого, насыщенность) → тонмаппинг AgX и sRGB (OutputPass) → резкость, виньетка,
// зерно → SMAA, если MSAA нет. Небо, деревья-карточки и трава в затенение углов не попадают (userData.noAO).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

class AOPass extends GTAOPass {
  constructor(scene, camera, scale) {
    super(scene, camera, 16, 16);
    this.scale = scale;
  }
  overrideVisibility() {
    super.overrideVisibility();
    this.scene.traverse(function (o) { if (o.userData.noAO) o.visible = false; });
  }
  // на больших экранах (больше 4 млн пикселей) затенение углов считается вдвое реже по каждой оси
  setSize(w, h) {
    const sc = w * h > 4.2e6 ? Math.min(this.scale, 0.5) : this.scale;
    super.setSize(Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
  }
}

// NaN и бесконечность в HDR свечение размазало бы в чёрные пятна. Проверка — по битам числа: сравнения с NaN
// компилятор вправе упростить, и на D3D прежняя проверка срабатывала на целых пикселях травы (чёрные точки).
// Битый пиксель заменяется средним целых соседей, выбросы ограничены.
export const SANITIZE = {
  uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;
    bool bad(vec3 c) {
      uvec3 u = floatBitsToUint(c) & uvec3(0x7fffffffu);
      return any(greaterThanEqual(u, uvec3(0x7f800000u))) || any(lessThan(c, vec3(0.0)));
    }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      if (bad(c)) {
        vec3 s = vec3(0.0); float n = 0.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.7853982;
          vec3 q = texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * uTexel * 1.5).rgb;
          if (!bad(q)) { s += q; n += 1.0; }
        }
        c = n > 0.0 ? s / n : vec3(0.0);
      }
      gl_FragColor = vec4(min(c, vec3(300.0)), 1.0);
    }`,
};

export const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTint: { value: new THREE.Vector3(1.02, 1.0, 0.97) }, uSat: { value: 1.04 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec3 uTint; uniform float uSat; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb * uTint;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = max(mix(vec3(l), col, uSat), 0.0);
      gl_FragColor = vec4(col, c.a);
    }`,
};

export const FINISH = {
  uniforms: {
    tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) }, uTime: { value: 0 },
    uGrain: { value: 0.018 }, uVignette: { value: 0.22 }, uSharpen: { value: 0.18 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uTime, uGrain, uVignette, uSharpen; varying vec2 vUv;
    float h(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec3 n = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb
             + texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
      c += (c - n * 0.25) * uSharpen;
      vec2 q = (vUv - 0.5) * vec2(1.0, 0.8);
      c *= mix(1.0, 1.0 - smoothstep(0.25, 0.85, length(q) * 1.15), uVignette);
      float g = h(vUv * vec2(1931.0, 1171.0) + fract(uTime) * 61.0) - 0.5;
      c += g * uGrain * (0.4 + 0.6 * (1.0 - dot(c, vec3(0.333))));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

// ---------- объёмный свет и блик солнца ----------
// Рассеяние в приземной дымке (плотность спадает с высотой): луч от камеры до поверхности (глубина — из прохода
// затенения углов) 28 шагами в половинном разрешении; солнце — с тенью ближней и дальней карт (лучи сквозь лес
// и проёмы), ночью — прожекторы с конусом и тенью первой мачты. Затем смешение с кадром и блик солнца в объективе
// (ореол, слабая звезда, призраки к центру кадра); видимость солнца — по яркости его диска в кадре.
export const SCATTER_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tDepth;
uniform mat4 uProjInv, uViewInv;
uniform vec3 uCam;
uniform sampler2D tSun, tFar, tSpot;
uniform mat4 uSunM, uFarM, uSpotM;
uniform vec3 uSunDir, uSunCol;
uniform float uSunOn, uFarOn, uSpotOn, uSpotShadow;
uniform vec3 uSpotPos[2], uSpotDir[2], uSpotCol[2];
uniform vec2 uSpotCos[2];
uniform float uDensity, uHeight, uMax, uFrame;
varying vec2 vUv;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (12.566370614 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float inMap(vec3 sc) { return step(0.0, sc.x) * step(sc.x, 1.0) * step(0.0, sc.y) * step(sc.y, 1.0) * step(sc.z, 1.0); }
float sunShadow(vec3 p) {
  float s = 1.0;
  vec4 sc = uSunM * vec4(p, 1.0); sc.xyz /= sc.w;
  if (inMap(sc.xyz) > 0.5) s = step(sc.z - 0.0015, unpackRGBAToDepth(texture2D(tSun, sc.xy)));
  else if (uFarOn > 0.5) {
    vec4 fc = uFarM * vec4(p, 1.0); fc.xyz /= fc.w;
    if (inMap(fc.xyz) > 0.5) s = step(fc.z - 0.002, unpackRGBAToDepth(texture2D(tFar, fc.xy)));
  }
  return s;
}
float spotShadow(vec3 p) {
  float s = 1.0;
  vec4 sc = uSpotM * vec4(p, 1.0); sc.xyz /= sc.w;
  if (inMap(sc.xyz) > 0.5) s = step(sc.z - 0.003, unpackRGBAToDepth(texture2D(tSpot, sc.xy)));
  return s;
}
void main() {
  float d = texture2D(tDepth, vUv).x;
  vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  v /= v.w;
  vec3 wp = (uViewInv * vec4(v.xyz, 1.0)).xyz;
  vec3 rd = wp - uCam;
  float len = length(rd);
  rd /= len;
  len = min(len, uMax);
  const int N = 28;
  float stp = len / float(N);
  float j = fract(ign(gl_FragCoord.xy) + uFrame * 0.618034);
  float cs = dot(rd, uSunDir);
  float phSun = mix(hg(cs, 0.6), hg(cs, -0.15), 0.25);
  vec3 L = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < N; i++) {
    vec3 p = uCam + rd * ((float(i) + j) * stp);
    float sigma = uDensity * exp(-max(p.y, 0.0) / uHeight);
    vec3 S = vec3(0.0);
    if (uSunOn > 0.5) S += uSunCol * phSun * sunShadow(p);
    if (uSpotOn > 0.5) {
      for (int k = 0; k < 2; k++) {
        vec3 lv = uSpotPos[k] - p;
        float dl = length(lv);
        vec3 l = lv / dl;
        float cone = smoothstep(uSpotCos[k].x, uSpotCos[k].y, dot(-l, uSpotDir[k]));
        if (cone <= 0.0) continue;
        float sh = (k == 0 && uSpotShadow > 0.5) ? spotShadow(p) : 1.0;
        S += uSpotCol[k] * cone * sh * hg(dot(l, rd), 0.45) / max(dl * dl, 0.5);
      }
    }
    L += T * sigma * S * stp;
    T *= exp(-sigma * stp);
  }
  gl_FragColor = vec4(L, 1.0);
}
`;
// Блик солнца: видимость — доля ярких пикселей его диска (за кронами и стенами блик гаснет).
export const FLARE_GLSL = /* glsl */ `
uniform vec2 uSunUV;
uniform float uFlare, uAspect;
uniform vec3 uSunCol;
vec3 lensFlare(sampler2D scene, vec2 uv, vec2 texel) {
  vec3 fl = vec3(0.0);
  if (uFlare > 0.0) {
    float vis = 0.0;
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5236;
      vec2 o = vec2(cos(a), sin(a)) * texel * (2.0 + float(i - (i / 3) * 3) * 2.0);
      vec3 s = texture2D(scene, uSunUV + o).rgb;
      vis += step(18.0, max(s.r, max(s.g, s.b)));
    }
    vis /= 12.0;
    if (vis > 0.0) {
      vec2 asp = vec2(uAspect, 1.0);
      vec2 dv = (uv - uSunUV) * asp;
      float ds = length(dv);
      fl = uSunCol * (0.5 * exp(-ds * ds / 0.003) + 0.06 * exp(-ds / 0.11));
      fl += uSunCol * 0.045 * pow(abs(cos(atan(dv.y, dv.x) * 3.0)), 48.0) * exp(-ds / 0.16);
      vec2 toC = vec2(0.5) - uSunUV;
      for (int k = 0; k < 4; k++) {
        vec2 gp = uSunUV + toC * (1.1 + float(k) * 0.9);
        float r = 0.022 + 0.018 * float(k);
        float gd = length((uv - gp) * asp);
        vec3 tint = k == 0 ? vec3(0.45, 0.85, 0.55) : k == 1 ? vec3(0.95, 0.62, 0.3) : k == 2 ? vec3(0.45, 0.55, 1.0) : vec3(0.75);
        fl += uSunCol * tint * 0.012 * (1.0 - smoothstep(r * 0.55, r, gd));
      }
      fl *= vis * uFlare;
    }
  }
  return fl;
}
`;
const COMPOSITE_FRAG = FLARE_GLSL + /* glsl */ `
uniform sampler2D tDiffuse, tVol;
uniform vec2 uVolTexel, uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  vec3 v = texture2D(tVol, vUv).rgb * 0.36 + (texture2D(tVol, vUv + vec2(uVolTexel.x, 0.0)).rgb + texture2D(tVol, vUv - vec2(uVolTexel.x, 0.0)).rgb
         + texture2D(tVol, vUv + vec2(0.0, uVolTexel.y)).rgb + texture2D(tVol, vUv - vec2(0.0, uVolTexel.y)).rgb) * 0.16;
  c += v + lensFlare(tDiffuse, vUv, uTexel);
  gl_FragColor = vec4(c, 1.0);
}
`;
export const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

export class VolumePass extends Pass {
  constructor(camera, ao, opts, quality) {
    super();
    this.camera = camera; this.ao = ao; this.opts = opts; this.quality = quality;
    this.frame = 0;
    this.low = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    white.needsUpdate = true;
    this.white = white;
    this.scatter = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
        tSun: { value: white }, tFar: { value: white }, tSpot: { value: white },
        uSunM: { value: new THREE.Matrix4() }, uFarM: { value: new THREE.Matrix4() }, uSpotM: { value: new THREE.Matrix4() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3() },
        uSunOn: { value: 0 }, uFarOn: { value: 0 }, uSpotOn: { value: 0 }, uSpotShadow: { value: 0 },
        uSpotPos: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uSpotDir: { value: [new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -1, 0)] },
        uSpotCol: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uSpotCos: { value: [new THREE.Vector2(1, 1), new THREE.Vector2(1, 1)] },
        uDensity: { value: 0.001 }, uHeight: { value: 28 }, uMax: { value: 120 }, uFrame: { value: 0 },
      },
      vertexShader: QUAD_VERT, fragmentShader: SCATTER_FRAG, depthTest: false, depthWrite: false,
    });
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tVol: { value: null }, uVolTexel: { value: new THREE.Vector2() }, uTexel: { value: new THREE.Vector2() },
        uSunUV: { value: new THREE.Vector2() }, uFlare: { value: 0 }, uAspect: { value: 1 }, uSunCol: { value: new THREE.Vector3() },
      },
      vertexShader: QUAD_VERT, fragmentShader: COMPOSITE_FRAG, depthTest: false, depthWrite: false,
    });
    this.scatterQuad = new FullScreenQuad(this.scatter);
    this.compQuad = new FullScreenQuad(this.comp);
    this.sunNDC = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
  }
  setSize(w, h) {
    this.low.setSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    this.comp.uniforms.uVolTexel.value.set(2 / w, 2 / h);
    this.comp.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.comp.uniforms.uAspect.value = w / h;
  }
  // рассеяние в this.low (половинное разрешение) и параметры блика в this.comp.uniforms
  prepare(renderer, depthTexture) {
    const u = this.scatter.uniforms, cu = this.comp.uniforms, cam = this.camera, sky = this.opts.sky;
    const sun = sky.sun, st = sky.state;
    u.tDepth.value = depthTexture;
    u.uProjInv.value.copy(cam.projectionMatrixInverse);
    u.uViewInv.value.copy(cam.matrixWorld);
    u.uCam.value.copy(cam.position);
    u.uSunDir.value.copy(st.sunDir);
    const sunOn = sun.intensity > 0.01 && sun.shadow.map;
    u.uSunOn.value = sunOn ? 1 : 0;
    u.uSunCol.value.set(sun.color.r, sun.color.g, sun.color.b).multiplyScalar(sun.intensity);
    if (sunOn) { u.tSun.value = sun.shadow.map.texture; u.uSunM.value.copy(sun.shadow.matrix); }
    const far = sky.farSun;
    u.uFarOn.value = far && far.shadow.map ? 1 : 0;
    if (u.uFarOn.value) { u.tFar.value = far.shadow.map.texture; u.uFarM.value.copy(far.shadow.matrix); }
    const spots = (this.opts.lights ? this.opts.lights() : []).filter(function (l) { return l.isSpotLight; });
    let spotOn = 0;
    for (let k = 0; k < 2; k++) {
      const sp = spots[k];
      if (!sp || sp.intensity < 0.01) { u.uSpotCol.value[k].set(0, 0, 0); continue; }
      spotOn = 1;
      sp.getWorldPosition(u.uSpotPos.value[k]);
      sp.target.getWorldPosition(this.tmp);
      u.uSpotDir.value[k].copy(this.tmp).sub(u.uSpotPos.value[k]).normalize();
      u.uSpotCol.value[k].set(sp.color.r, sp.color.g, sp.color.b).multiplyScalar(sp.intensity);
      u.uSpotCos.value[k].set(Math.cos(sp.angle), Math.cos(sp.angle * (1 - sp.penumbra)));
    }
    u.uSpotOn.value = spotOn;
    const s0 = spots[0];
    u.uSpotShadow.value = spotOn && s0 && s0.castShadow && s0.shadow.map ? 1 : 0;
    if (u.uSpotShadow.value) { u.tSpot.value = s0.shadow.map.texture; u.uSpotM.value.copy(s0.shadow.matrix); }
    // днём — тонкая дымка, ночью влажный воздух гуще: видны конусы прожекторов
    u.uDensity.value = THREE.MathUtils.lerp(0.0009, 0.016, st.night);
    u.uFrame.value = this.frame++ % 64;
    renderer.setRenderTarget(this.low);
    this.scatterQuad.render(renderer);
    // блик солнца
    this.sunNDC.copy(cam.position).addScaledVector(st.sunDir, 1000).project(cam);
    const inView = this.sunNDC.z < 1 && Math.abs(this.sunNDC.x) < 1.2 && Math.abs(this.sunNDC.y) < 1.2;
    cu.uFlare.value = this.quality.flare && inView && sunOn ? 1 : 0;
    cu.uSunUV.value.set(this.sunNDC.x * 0.5 + 0.5, this.sunNDC.y * 0.5 + 0.5);
    cu.uSunCol.value.set(sun.color.r, sun.color.g, sun.color.b).multiplyScalar(Math.min(1, sun.intensity / 18) * 1.6);
  }
  render(renderer, writeBuffer, readBuffer) {
    this.prepare(renderer, this.ao.depthTexture);
    const cu = this.comp.uniforms;
    cu.tDiffuse.value = readBuffer.texture;
    cu.tVol.value = this.low.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.compQuad.render(renderer);
  }
  dispose() { this.low.dispose(); this.scatter.dispose(); this.comp.dispose(); this.scatterQuad.dispose(); this.compQuad.dispose(); this.white.dispose(); }
}

export function createPost(renderer, scene, camera, quality, opts = {}) {
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const ratio = renderer.getPixelRatio();
  const target = new THREE.WebGLRenderTarget(size.x * ratio, size.y * ratio, { type: THREE.HalfFloatType, samples: quality.msaa });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(ratio);
  composer.addPass(new RenderPass(scene, camera));
  const sanitize = new ShaderPass(SANITIZE);
  composer.addPass(sanitize);

  let ao = null;
  if (quality.ao > 0) {
    ao = new AOPass(scene, camera, quality.ao);
    ao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: quality.aoSamples || (quality.ao >= 1 ? 16 : 12), distanceFallOff: 1.0 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 16 });
    ao.blendIntensity = 1.0;
    composer.addPass(ao);
  }
  let volume = null;
  if (quality.volume && ao && opts.sky) {
    volume = new VolumePass(camera, ao, opts, quality);
    composer.addPass(volume);
  }
  let bloom = null;
  if (quality.bloom) {
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.14, 0.5, 7.0);
    composer.addPass(bloom);
  }
  const grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FINISH);
  composer.addPass(finish);
  if (!quality.msaa) composer.addPass(new SMAAPass(size.x * ratio, size.y * ratio));

  // холст (размер и чёткость) ведёт игра — здесь только цели кадра (r — их плотность пикселей)
  function setSize(w, h, r) {
    composer.setPixelRatio(r);
    composer.setSize(w, h);
    finish.uniforms.uTexel.value.set(1 / (w * r), 1 / (h * r));
    sanitize.uniforms.uTexel.value.set(1 / (w * r), 1 / (h * r));
  }
  setSize(size.x, size.y, ratio);

  return {
    composer, ao, volume, bloom, grade, finish, setSize,
    render(time) {
      finish.uniforms.uTime.value = time;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      composer.render();
    },
    dispose() { composer.passes.forEach(function (p) { if (p.dispose) p.dispose(); }); target.dispose(); },
  };
}
