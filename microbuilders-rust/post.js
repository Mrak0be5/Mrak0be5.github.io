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

// NaN и бесконечность в HDR (редкие пиксели травы) свечение размазывает в чёрные пятна: заменить нулём,
// выбросы ограничить.
const SANITIZE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      if (!(c.r < 1e4) || !(c.g < 1e4) || !(c.b < 1e4) || !(c.r >= 0.0) || !(c.g >= 0.0) || !(c.b >= 0.0)) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = vec4(min(c.rgb, vec3(300.0)), c.a);
    }`,
};

const GRADE = {
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

const FINISH = {
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

export function createPost(renderer, scene, camera, quality) {
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const ratio = renderer.getPixelRatio();
  const target = new THREE.WebGLRenderTarget(size.x * ratio, size.y * ratio, { type: THREE.HalfFloatType, samples: quality.msaa });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(ratio);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(SANITIZE));

  let ao = null;
  if (quality.ao > 0) {
    ao = new AOPass(scene, camera, quality.ao);
    ao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: quality.ao >= 1 ? 16 : 12, distanceFallOff: 1.0 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 16 });
    ao.blendIntensity = 1.0;
    composer.addPass(ao);
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

  function setSize(w, h, r) {
    renderer.setPixelRatio(r);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(r);
    composer.setSize(w, h);
    finish.uniforms.uTexel.value.set(1 / (w * r), 1 / (h * r));
  }
  setSize(size.x, size.y, ratio);

  return {
    composer, ao, bloom, grade, finish, setSize,
    render(time) { finish.uniforms.uTime.value = time; composer.render(); },
    dispose() { composer.passes.forEach(function (p) { if (p.dispose) p.dispose(); }); target.dispose(); },
  };
}
