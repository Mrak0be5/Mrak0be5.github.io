// Подсветка закрытого яруса (fx.js ← вызов tier оригинала): по внешним верхним кромкам яруса бежит тёплая
// вспышка — волна обходит здание за полсекунды (как волна пыли по низу), каждая кромка вспыхивает и гаснет.
// Кромки — ленты лицом к камере (ширина — от расстояния: читается и с дальнего зума), один вызов отрисовки;
// свечение поверх кадра (свечение кадра — bloom «Максимума», «Ультры» и «Высокой»), G-буфер не трогает.
import * as THREE from 'three';
import { GB_OUT, FX_OUT } from './fx-sprites.js?v=ff29707';

const MAX = 192;

const VERT = /* glsl */ `
attribute vec3 aB;      // второй конец кромки (первый — position)
attribute vec2 aS;      // доля вдоль кромки (0/1), сторона ленты (−1/1)
attribute float aD;     // задержка вспышки, с
uniform float uTime, uWidth;
varying float vT;
varying float vS;
void main() {
  vec3 A = position;
  vec3 dir = aB - A;
  float len = max(length(dir), 1e-4);
  dir /= len;
  vec3 P = A + dir * len * aS.x;
  vec3 toCam = normalize(cameraPosition - P);
  vec3 side = cross(dir, toCam);
  side = dot(side, side) < 1e-6 ? vec3(0.0, 1.0, 0.0) : normalize(side);
  float w = max(0.025, length(cameraPosition - P) * 0.0026) * uWidth;
  P += side * aS.y * w + dir * (aS.x * 2.0 - 1.0) * w * 0.5;
  vT = uTime - aD;
  vS = aS.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}
`;
const FRAG = GB_OUT + /* glsl */ `
uniform vec3 uColor;
uniform float uGain;
varying float vT;
varying float vS;
layout(location = 0) out highp vec4 outColor;
` + FX_OUT + /* glsl */ `
void main() {
  if (vT < 0.0) discard;
  float k = smoothstep(0.0, 0.05, vT) * exp(-max(vT - 0.05, 0.0) * 5.5);
  float a = k * exp(-vS * vS * 2.2);
  if (a < 0.002) discard;
  fxOut(uColor * uGain, a, 1.0);
}
`;

export function createTierGlow() {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 4 * 3), b = new Float32Array(MAX * 4 * 3), s = new Float32Array(MAX * 4 * 2), dl = new Float32Array(MAX * 4);
  const idx = new Uint16Array(MAX * 6);
  for (let i = 0; i < MAX; i++) {
    const v = i * 4;
    idx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], i * 6);
    s.set([0, -1, 0, 1, 1, -1, 1, 1], i * 8);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aB', new THREE.BufferAttribute(b, 3));
  g.setAttribute('aS', new THREE.BufferAttribute(s, 2));
  g.setAttribute('aD', new THREE.BufferAttribute(dl, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.setDrawRange(0, 0);
  const uniforms = { uTime: { value: 0 }, uWidth: { value: 1 }, uColor: { value: new THREE.Color(1.0, 0.76, 0.42) }, uGain: { value: 10 } };
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'fx-tier';
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.visible = false;
  mesh.userData.noGI = true;
  mesh.userData.noAO = true;   // свечение поверх — не в затенение углов (post.js)
  let t = 0, end = 0;

  // list — кромки [ax, ay, az, bx, by, bz, задержка, …] (мир, м); night 0..1 — ночью свет ярче и шире
  function show(list, night) {
    const n = Math.min(MAX, Math.floor(list.length / 7));
    end = 0;
    for (let i = 0; i < n; i++) {
      const o = i * 7;
      for (let k = 0; k < 4; k++) {
        const v = (i * 4 + k) * 3;
        pos[v] = list[o]; pos[v + 1] = list[o + 1]; pos[v + 2] = list[o + 2];
        b[v] = list[o + 3]; b[v + 1] = list[o + 4]; b[v + 2] = list[o + 5];
        dl[i * 4 + k] = list[o + 6];
      }
      end = Math.max(end, list[o + 6]);
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.aB.needsUpdate = true;
    g.attributes.aD.needsUpdate = true;
    g.setDrawRange(0, n * 6);
    uniforms.uGain.value = 10 + 6 * (night || 0);
    uniforms.uWidth.value = 1.6 + 0.6 * (night || 0);
    t = 0;
    end += 1.2;
    mesh.visible = n > 0;
  }
  function update(dt) {
    if (!mesh.visible) return;
    t += dt;
    uniforms.uTime.value = t;
    if (t > end) mesh.visible = false;
  }
  return { mesh, show, update, clear: function () { mesh.visible = false; } };
}
