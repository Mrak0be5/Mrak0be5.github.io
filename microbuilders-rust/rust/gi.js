// Отражённый свет (GI) вокруг стройки — трассировка конусов по вокселям (Crassin 2011), для render.js.
// Объём 128 × 48 × 128 вокселей над зданием (от 40 × 15 × 40 м при вокселе 0,31 м — по размеру здания, setExtent).
// Каждый воксель хранит шесть граней (±X, ±Y, ±Z):
// стена тоньше вокселя освещена снаружи и тёмная внутри — свет не просачивается в комнаты.
// 1) Процессор раскладывает треугольники здания, склада и рельефа по вокселям (точки на треугольнике):
//    грань — по нормали, цвет — среднее альбедо материала × цвет вершин, плотность — по площади.
// 2) Видеокарта освещает грани: солнце с тенью из его карты, рассеянный свет неба, прожекторы ночью;
//    затем уменьшенные копии (mip) — для широких конусов.
// 3) Для каждого пикселя (половина разрешения): пять конусов по полусфере нормали — свет от освещённых
//    поверхностей вокруг (тёплый подсвет от земли, цвет от стен) и доля открытого неба.
import * as THREE from 'three';
import { seasonGrass } from './world.js?v=9f2863b';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ATMO } from './atmosphere.js?v=9f2863b';

const NX = 128, NY = 48, NZ = 128;
// размер объёма меняет setExtent (воксель кубический, сетка та же)
const SIZE = new THREE.Vector3(40, 15, 40);
let VOX = SIZE.x / NX;
const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const INJECT_FRAG = /* glsl */ `
#include <packing>
uniform highp sampler3D tAlb;
uniform sampler2D tSun, tSpot, tSkyIrr;
uniform mat4 uSunM, uSpotM;
uniform vec3 uMin, uSunDir, uSunCol, uMoonCol, uMoonDir;
uniform float uVox, uLayer, uSunOn, uSpotShadow, uSunIllum, uSkyK;
uniform vec3 uSpotPos[2], uSpotDir[2], uSpotCol[2];
uniform vec2 uSpotCos[2];
varying vec2 vUv;
float inMap(vec3 sc) { return step(0.0, sc.x) * step(sc.x, 1.0) * step(0.0, sc.y) * step(sc.y, 1.0) * step(sc.z, 1.0); }
float shadowAt(sampler2D map, mat4 m, vec3 p, float bias) {
  vec4 sc = m * vec4(p, 1.0); sc.xyz /= sc.w;
  if (inMap(sc.xyz) < 0.5) return 1.0;
  return step(sc.z - bias, unpackRGBAToDepth(texture2D(map, sc.xy)));
}
void main() {
  ivec3 tc = ivec3(int(gl_FragCoord.x), int(gl_FragCoord.y), int(uLayer));
  vec4 a = texelFetch(tAlb, tc, 0);
  if (a.a <= 0.0) { gl_FragColor = vec4(0.0); return; }
  int face = tc.x / ${NX};
  int ix = tc.x - face * ${NX};
  vec3 N = face == 0 ? vec3(1, 0, 0) : face == 1 ? vec3(-1, 0, 0) : face == 2 ? vec3(0, 1, 0) : face == 3 ? vec3(0, -1, 0) : face == 4 ? vec3(0, 0, 1) : vec3(0, 0, -1);
  vec3 p = uMin + (vec3(float(ix), float(tc.y), float(tc.z)) + 0.5) * uVox;
  vec3 E = vec3(0.0);
  float nl = dot(N, uSunDir);
  if (uSunOn > 0.5 && nl > 0.0) E += uSunCol * nl * shadowAt(tSun, uSunM, p + N * uVox * 0.55 + uSunDir * uVox * 0.3, 0.0015);
  // рассеянный свет неба: на верх грани больше, на низ меньше (без затенения — его ослабляет uSkyK)
  vec3 sky = texture2D(tSkyIrr, vec2(0.5)).rgb * uSunIllum;
  E += sky * (0.5 + 0.5 * N.y) * uSkyK;
  E += uMoonCol * max(dot(N, uMoonDir), 0.0);
  for (int k = 0; k < 2; k++) {
    vec3 lv = uSpotPos[k] - p;
    float dl = length(lv);
    vec3 l = lv / max(dl, 1e-3);
    float cone = smoothstep(uSpotCos[k].x, uSpotCos[k].y, dot(-l, uSpotDir[k]));
    float ln = dot(N, l);
    if (cone <= 0.0 || ln <= 0.0) continue;
    float sh = (k == 0 && uSpotShadow > 0.5) ? shadowAt(tSpot, uSpotM, p + N * uVox * 0.55, 0.003) : 1.0;
    E += uSpotCol[k] * cone * ln * sh / max(dl * dl, 1.0);
  }
  gl_FragColor = vec4(a.rgb * E / 3.14159265, a.a);
}
`;

const TRACE_FRAG = /* glsl */ `
uniform sampler2D tDepth, tNormal;
uniform highp sampler3D tRad;
uniform mat4 uInvVP;
uniform mat3 uViewToWorld;
uniform vec3 uMin, uSize, uRes;
uniform float uVox, uFrame, uOn;
uniform int uSteps;
varying vec2 vUv;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
vec4 vox(vec3 q, vec3 d, float lod) {
  vec3 uvw = (q - uMin) / uSize;
  float hx = 0.5 * exp2(lod) / uRes.x;
  uvw.x = clamp(uvw.x, hx, 1.0 - hx);
  vec3 w = d * d;
  // конус, идущий по +X, видит грани, обращённые к −X (номер 1), и т.д.
  float fx = d.x > 0.0 ? 1.0 : 0.0, fy = d.y > 0.0 ? 3.0 : 2.0, fz = d.z > 0.0 ? 5.0 : 4.0;
  vec4 sx = textureLod(tRad, vec3((fx + uvw.x) / 6.0, uvw.y, uvw.z), lod);
  vec4 sy = textureLod(tRad, vec3((fy + uvw.x) / 6.0, uvw.y, uvw.z), lod);
  vec4 sz = textureLod(tRad, vec3((fz + uvw.x) / 6.0, uvw.y, uvw.z), lod);
  return vec4(sx.rgb * w.x + sy.rgb * w.y + sz.rgb * w.z, max(sx.a, max(sy.a, sz.a)));
}
vec4 cone(vec3 p, vec3 d, float tanHalf) {
  vec3 c = vec3(0.0);
  float a = 0.0, t = uVox * 1.1;
  for (int i = 0; i < uSteps; i++) {
    float diam = max(uVox, 2.0 * t * tanHalf);
    vec3 q = p + d * t;
    vec3 uvw = (q - uMin) / uSize;
    if (any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)))) break;
    vec4 s = vox(q, d, log2(diam / uVox));
    c += (1.0 - a) * s.rgb;
    a += (1.0 - a) * s.a;
    if (a > 0.96) break;
    t += diam * 0.55;
  }
  return vec4(c, a);
}
void main() {
  if (uOn < 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float d = texture2D(tDepth, vUv).x;
  if (d >= 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec3 p = wp.xyz / wp.w;
  vec3 rel = (p - uMin) / uSize;
  vec3 edge = min(rel, 1.0 - rel) * uSize;
  float fade = smoothstep(0.0, 3.0, min(edge.x, min(edge.y + 3.0, edge.z)));
  if (fade <= 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec3 n = normalize(uViewToWorld * (texture2D(tNormal, vUv).rgb * 2.0 - 1.0));
  vec3 o = p + n * uVox * 0.9;
  vec3 up = abs(n.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(up, n)), t2 = cross(n, t1);
  float ang = ign(gl_FragCoord.xy + uFrame * 7.13) * 1.5707963;
  float ca = cos(ang), sa = sin(ang);
  vec3 a1 = t1 * ca + t2 * sa, a2 = -t1 * sa + t2 * ca;
  // середина 60°, четыре боковых 45° под 45° к нормали; веса — по косинусу
  vec4 c0 = cone(o, n, 0.577);
  vec4 c1 = cone(o, normalize(n + a1), 0.414);
  vec4 c2 = cone(o, normalize(n - a1), 0.414);
  vec4 c3 = cone(o, normalize(n + a2), 0.414);
  vec4 c4 = cone(o, normalize(n - a2), 0.414);
  vec3 E = c0.rgb * 0.28 + (c1.rgb + c2.rgb + c3.rgb + c4.rgb) * 0.18;
  float V = (1.0 - c0.a) * 0.28 + ((1.0 - c1.a) + (1.0 - c2.a) + (1.0 - c3.a) + (1.0 - c4.a)) * 0.18;
  E *= 3.14159265 / 1.0;
  gl_FragColor = vec4(E * fade, mix(1.0, V, fade));
}
`;

// средний цвет текстуры (линейный): самая мелкая копия на видеокарте
const AVG_FRAG = 'uniform sampler2D tMap; varying vec2 vUv; void main() { gl_FragColor = vec4(textureLod(tMap, vec2(0.5), 14.0).rgb, 1.0); }';

export function createGI(renderer) {
  const gl = renderer.getContext();
  const min = new THREE.Vector3(-12, -1.5, -14.5);
  const albData = new Uint8Array(NX * 6 * NY * NZ * 4);
  const alb = new THREE.Data3DTexture(albData, NX * 6, NY, NZ);
  alb.format = THREE.RGBAFormat;
  alb.type = THREE.UnsignedByteType;
  alb.minFilter = alb.magFilter = THREE.NearestFilter;
  alb.unpackAlignment = 1;
  alb.needsUpdate = true;
  const rad = new THREE.WebGL3DRenderTarget(NX * 6, NY, NZ, { depthBuffer: false });
  rad.texture.format = THREE.RGBAFormat;
  rad.texture.type = THREE.HalfFloatType;
  rad.texture.minFilter = THREE.LinearMipmapLinearFilter;
  rad.texture.magFilter = THREE.LinearFilter;
  rad.texture.generateMipmaps = false;
  rad.texture.wrapS = rad.texture.wrapT = rad.texture.wrapR = THREE.ClampToEdgeWrapping;

  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;
  const im = new THREE.ShaderMaterial({
    uniforms: {
      tAlb: { value: alb }, tSun: { value: white }, tSpot: { value: white }, tSkyIrr: ATMO.irradiance, uSunIllum: ATMO.sunIllum,
      uSunM: { value: new THREE.Matrix4() }, uSpotM: { value: new THREE.Matrix4() },
      uMin: { value: min }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3() },
      uMoonCol: { value: new THREE.Vector3() }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uVox: { value: VOX }, uLayer: { value: 0 }, uSunOn: { value: 0 }, uSpotShadow: { value: 0 }, uSkyK: { value: 0.35 },
      uSpotPos: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uSpotDir: { value: [new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -1, 0)] },
      uSpotCol: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uSpotCos: { value: [new THREE.Vector2(1, 1), new THREE.Vector2(1, 1)] },
    },
    vertexShader: VERT, fragmentShader: INJECT_FRAG, depthTest: false, depthWrite: false,
  });
  const iq = new FullScreenQuad(im);
  const out = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const tm = new THREE.ShaderMaterial({
    uniforms: {
      tDepth: { value: null }, tNormal: { value: null }, tRad: { value: rad.texture }, uInvVP: { value: new THREE.Matrix4() },
      uViewToWorld: { value: new THREE.Matrix3() }, uMin: { value: min }, uSize: { value: SIZE.clone() }, uRes: { value: new THREE.Vector3(NX, NY, NZ) },
      uVox: { value: VOX }, uFrame: { value: 0 }, uOn: { value: 0 }, uSteps: { value: 11 },
    },
    vertexShader: VERT, fragmentShader: TRACE_FRAG, depthTest: false, depthWrite: false,
  });
  const tq = new FullScreenQuad(tm);

  // ---------- средние цвета материалов ----------
  const avgRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.FloatType, depthBuffer: false });
  const avgM = new THREE.ShaderMaterial({ uniforms: { tMap: { value: null } }, vertexShader: VERT, fragmentShader: AVG_FRAG, depthTest: false, depthWrite: false });
  const avgQ = new FullScreenQuad(avgM);
  const avgBuf = new Float32Array(4);
  const texAvg = new WeakMap(), matAvg = new WeakMap();
  function textureAverage(tex) {
    if (texAvg.has(tex)) return texAvg.get(tex);
    avgM.uniforms.tMap.value = tex;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(avgRT);
    avgQ.render(renderer);
    renderer.readRenderTargetPixels(avgRT, 0, 0, 1, 1, avgBuf);
    renderer.setRenderTarget(prev);
    const c = [avgBuf[0], avgBuf[1], avgBuf[2]];
    texAvg.set(tex, c);
    return c;
  }
  function materialAlbedo(m) {
    if (matAvg.has(m)) return matAvg.get(m);
    let c = [0.5, 0.5, 0.5];
    if (m.color) c = [m.color.r, m.color.g, m.color.b];
    if (m.map) { const t = textureAverage(m.map); c = [c[0] * t[0], c[1] * t[1], c[2] * t[2]]; }
    // металл почти не рассеивает
    const k = 1 - 0.8 * (m.metalness || 0);
    c = [c[0] * k, c[1] * k, c[2] * k];
    const e = m.emissive && m.emissiveIntensity > 0 ? 1 : 0;
    const r = { c, skip: !!(m.transparent && m.opacity < 0.5) || m.transmission > 0.5, emissive: e };
    matAvg.set(m, r);
    return r;
  }

  // ---------- раскладка по вокселям ----------
  // суммы по (воксель, грань) — открытая адресация в типизированных массивах (камней — сотни тысяч треугольников)
  const HCAP = 1 << 20, HMASK = HCAP - 1;
  const hKeys = new Int32Array(HCAP), hVals = new Float32Array(HCAP * 4);
  const occ = new Float32Array(NX * NY * NZ);
  function push(key, r, g, b, w) {
    let h = (Math.imul(key, 0x9E3779B1) >>> 12) & HMASK;
    while (hKeys[h] !== -1 && hKeys[h] !== key) h = (h + 1) & HMASK;
    hKeys[h] = key;
    const k = h * 4;
    hVals[k] += r * w; hVals[k + 1] += g * w; hVals[k + 2] += b * w; hVals[k + 3] += w;
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3();
  const _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _im = new THREE.Matrix4();
  function sample(p, n, r, g, b, w) {
    const ix = Math.floor((p.x - min.x) / VOX), iy = Math.floor((p.y - min.y) / VOX), iz = Math.floor((p.z - min.z) / VOX);
    if (ix < 0 || iy < 0 || iz < 0 || ix >= NX || iy >= NY || iz >= NZ) return;
    const v = ix + NX * (iy + NY * iz);
    occ[v] += w;
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    if (ax > 0.05) push(v * 6 + (n.x > 0 ? 0 : 1), r, g, b, w * ax);
    if (ay > 0.05) push(v * 6 + (n.y > 0 ? 2 : 3), r, g, b, w * ay);
    if (az > 0.05) push(v * 6 + (n.z > 0 ? 4 : 5), r, g, b, w * az);
  }
  function triangle(a, b, c, r, g, bl) {
    _e1.subVectors(b, a); _e2.subVectors(c, a);
    _n.crossVectors(_e1, _e2);
    const area2 = _n.length();
    if (area2 < 1e-10) return;
    _n.multiplyScalar(1 / area2);
    const area = area2 * 0.5;
    // точки на треугольнике — примерно по четыре на грань вокселя
    const n = Math.min(64, Math.max(1, Math.ceil(Math.sqrt(area / (VOX * VOX * 0.25)))));
    const w = area / (n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
      const u = (i + 0.33) / n, v = (j + 0.33) / n;
      _p.copy(a).addScaledVector(_e1, u).addScaledVector(_e2, v);
      sample(_p, _n, r, g, bl, w * 2);
    }
  }
  function addMesh(mesh) {
    const g = mesh.geometry;
    if (!g || !g.attributes.position) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const pos = g.attributes.position, col = g.attributes.color, idx = g.index;
    const start = g.drawRange.start, total = idx ? idx.count : pos.count;
    const count = Math.min(total - start, g.drawRange.count);
    if (count <= 0) return;
    const inst = mesh.isInstancedMesh ? mesh.count : 1;
    for (let k = 0; k < inst; k++) {
      _m.copy(mesh.matrixWorld);
      if (mesh.isInstancedMesh) { mesh.getMatrixAt(k, _im); _m.multiply(_im); }
      const groups = g.groups.length ? g.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
      groups.forEach(function (gr) {
        const m = mats[gr.materialIndex] || mats[0];
        if (!m || !m.visible) return;
        const A = materialAlbedo(m);
        if (A.skip) return;
        const s0 = Math.max(start, gr.start), s1 = Math.min(start + count, gr.start + gr.count);
        for (let t = s0; t + 2 < s1; t += 3) {
          const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
          _a.fromBufferAttribute(pos, i0).applyMatrix4(_m);
          _b.fromBufferAttribute(pos, i1).applyMatrix4(_m);
          _c.fromBufferAttribute(pos, i2).applyMatrix4(_m);
          let r = A.c[0], gg = A.c[1], b = A.c[2];
          if (col && m.vertexColors) {
            r *= (col.getX(i0) + col.getX(i1) + col.getX(i2)) / 3;
            gg *= (col.getY(i0) + col.getY(i1) + col.getY(i2)) / 3;
            b *= (col.getZ(i0) + col.getZ(i1) + col.getZ(i2)) / 3;
          }
          triangle(_a, _b, _c, r, gg, b);
        }
      });
    }
  }

  let ground = null;
  function setGround(terrain, splat) { ground = { terrain, splat }; dirty = true; }
  // рельеф: поверхность — грань +Y с цветом луга/глины/щебня, ниже — сплошная тёмная толща
  function addGround() {
    if (!ground) return;
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) {
      const x = min.x + (ix + 0.5) * VOX, z = min.z + (iz + 0.5) * VOX;
      const h = ground.terrain.heightAt(x, z);
      const top = Math.floor((h - min.y) / VOX);
      const sp = ground.splat.sample(x, z);
      const dirt = sp[0], grav = sp[1], grass = Math.max(0, 1 - dirt - grav);
      const gc = seasonGrass();
      const r = dirt * 0.3 + grav * 0.4 + grass * gc[0], g = dirt * 0.22 + grav * 0.38 + grass * gc[1], b = dirt * 0.15 + grav * 0.34 + grass * gc[2];
      for (let iy = 0; iy <= Math.min(top, NY - 1); iy++) {
        const v = ix + NX * (iy + NY * iz);
        occ[v] += 10;
        if (iy === top) push(v * 6 + 2, r, g, b, 4);
      }
    }
  }

  let roots = function () { return []; }, exclude = null;
  function bind(o) { roots = o.roots || roots; exclude = o.exclude || null; dirty = true; }
  function setCenter(x, z) { min.set(x - SIZE.x / 2, -1.5, z - SIZE.z / 2); dirty = true; }
  // Объём под здание: воксель v метров, объём NX·v × NY·v × NZ·v (центр — setCenter после).
  function setExtent(v) {
    VOX = v;
    SIZE.set(NX * v, NY * v, NZ * v);
    im.uniforms.uVox.value = v;
    tm.uniforms.uVox.value = v;
    tm.uniforms.uSize.value.copy(SIZE);
    dirty = true;
  }

  let dirty = true, lastBuild = -1e9, injected = false;
  function build() {
    hKeys.fill(-1);
    hVals.fill(0);
    occ.fill(0);
    addGround();
    const skip = new Set();
    if (exclude) exclude.forEach(function (r) { r.traverse(function (o) { skip.add(o); }); });
    roots().forEach(function (root) {
      root.updateMatrixWorld();
      root.traverseVisible(function (o) {
        if (!o.isMesh || skip.has(o) || o.userData.noGI || o.isSkinnedMesh) return;
        addMesh(o);
      });
    });
    // средний цвет и покрытие каждой грани
    albData.fill(0);
    const faceArea = VOX * VOX;
    for (let h = 0; h < HCAP; h++) {
      const key = hKeys[h];
      if (key < 0) continue;
      const k = h * 4;
      const w = hVals[k + 3];
      if (w <= 0) continue;
      const r = hVals[k], g = hVals[k + 1], b = hVals[k + 2];
      const v = Math.floor(key / 6), f = key - v * 6;
      const cover = Math.min(1, w / (faceArea * 0.6));
      const ix = v % NX, iy = Math.floor(v / NX) % NY, iz = Math.floor(v / (NX * NY));
      const t = ((iz * NY + iy) * NX * 6 + f * NX + ix) * 4;
      albData[t] = Math.min(255, (r / w) * cover * 255);
      albData[t + 1] = Math.min(255, (g / w) * cover * 255);
      albData[t + 2] = Math.min(255, (b / w) * cover * 255);
    }
    // плотность вокселя — во все шесть граней
    for (let v = 0; v < occ.length; v++) {
      if (occ[v] <= 0) continue;
      const a = Math.min(255, Math.round(Math.min(1, occ[v] / (faceArea * 0.8)) * 255));
      const ix = v % NX, iy = Math.floor(v / NX) % NY, iz = Math.floor(v / (NX * NY));
      const base = ((iz * NY + iy) * NX * 6 + ix) * 4 + 3;
      for (let f = 0; f < 6; f++) albData[base + f * NX * 4] = a;
    }
    alb.needsUpdate = true;
    injected = false;
  }

  const lastSun = new THREE.Vector3(9, 9, 9);
  let injClock = -1e9;
  const tmp = new THREE.Vector3();
  function inject(sky, lights) {
    const u = im.uniforms, sun = sky.sun, st = sky.state;
    const sunOn = sun.intensity > 0.01 && sun.shadow.map;
    u.uSunOn.value = sunOn ? 1 : 0;
    u.uSunDir.value.copy(st.sunDir);
    u.uSunCol.value.set(sun.color.r, sun.color.g, sun.color.b).multiplyScalar(sun.intensity);
    if (sunOn) { u.tSun.value = sun.shadow.map.texture; u.uSunM.value.copy(sun.shadow.matrix); }
    const moon = sky.moon;
    u.uMoonCol.value.set(moon.color.r, moon.color.g, moon.color.b).multiplyScalar(moon.intensity);
    u.uMoonDir.value.copy(sky.uniforms.uMoonDir.value);
    const spots = (lights || []).filter(function (l) { return l.isSpotLight; });
    u.uSpotShadow.value = 0;
    for (let k = 0; k < 2; k++) {
      const sp = spots[k];
      if (!sp || sp.intensity < 0.01) { u.uSpotCol.value[k].set(0, 0, 0); continue; }
      sp.getWorldPosition(u.uSpotPos.value[k]);
      sp.target.getWorldPosition(tmp);
      u.uSpotDir.value[k].copy(tmp).sub(u.uSpotPos.value[k]).normalize();
      u.uSpotCol.value[k].set(sp.color.r, sp.color.g, sp.color.b).multiplyScalar(sp.intensity);
      u.uSpotCos.value[k].set(Math.cos(sp.angle), Math.cos(sp.angle * (1 - sp.penumbra)));
      if (k === 0 && sp.castShadow && sp.shadow.map) { u.uSpotShadow.value = 1; u.tSpot.value = sp.shadow.map.texture; u.uSpotM.value.copy(sp.shadow.matrix); }
    }
    const prev = renderer.getRenderTarget();
    for (let z = 0; z < NZ; z++) {
      u.uLayer.value = z;
      renderer.setRenderTarget(rad, z);
      iq.render(renderer);
    }
    renderer.setRenderTarget(prev);
    // уменьшенные копии объёма
    const p = renderer.properties.get(rad.texture);
    if (p.__webglTexture) {
      renderer.state.bindTexture(gl.TEXTURE_3D, p.__webglTexture);
      gl.generateMipmap(gl.TEXTURE_3D);
      renderer.state.bindTexture(gl.TEXTURE_3D, null);
    }
    injected = true;
  }

  // каждый кадр: пересборка (не чаще раза в 2 с, если стройка изменилась), освещение (солнце сдвинулось,
  // ночь — раз в 0,5 с), трассировка конусов в половинном разрешении
  let frame = 0;
  function update(time, sky, lights) {
    if (dirty && time - lastBuild > 2) { dirty = false; lastBuild = time; build(); }
    const moved = lastSun.distanceToSquared(sky.state.sunDir) > 2e-6;
    if (!injected || moved || time - injClock > 0.5) {
      lastSun.copy(sky.state.sunDir); injClock = time;
      inject(sky, lights);
    }
  }
  const _rot = new THREE.Matrix3();
  function trace(depthTexture, normalTexture, invVP, camera) {
    const u = tm.uniforms;
    u.tDepth.value = depthTexture;
    u.tNormal.value = normalTexture;
    u.uInvVP.value.copy(invVP);
    u.uViewToWorld.value.setFromMatrix4(camera.matrixWorld);
    u.uFrame.value = frame++ % 64;
    u.uOn.value = injected ? 1 : 0;
    renderer.setRenderTarget(out);
    tq.render(renderer);
    return out.texture;
  }
  function setSize(w, h) { out.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1)); }
  function markDirty() { dirty = true; }
  function dispose() { [rad, out, avgRT].forEach(function (t) { t.dispose(); }); alb.dispose(); [im, tm, avgM].forEach(function (m) { m.dispose(); }); [iq, tq, avgQ].forEach(function (q) { q.dispose(); }); }
  return { update, trace, setSize, bind, setGround, setCenter, setExtent, markDirty, dispose, texture: out.texture, min, size: SIZE, build };
}
