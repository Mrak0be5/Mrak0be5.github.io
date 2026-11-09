// Жизнь карьера (art/ambient.js): пылевые вихри — воронка пыли ползёт по двору 18 с и пропадает (второй — только на
// просторной площадке), и камешки, изредка скатывающиеся с уступов: срываются с верхней бровки, прыгают по стенкам
// и полкам до дна и затихают. Следы ног и колёс — у вида свои (карта троп). Вихри — частицы своим шейдером
// (как life.js: выходы G-буфера обнулены, смешивание — премультипликация), камешки — три глыбы камня.
import * as THREE from 'three';
import { stone } from './geo.js?v=9f2863b';
import { TEXTURE_TILES as TILE } from './textures.js?v=9f2863b';
import { CELL } from './families.js?v=9f2863b';
import { POOLS } from './site-kit.js?v=9f2863b';

const C = CELL;
const PER = 44;           // частиц в вихре: 10 — юбка у земли, остальные — воронка
const DEVIL_LIFE = 18;    // с
const PEBBLES = 3;

const GB_OUT = /* glsl */ `
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
void gbZero() { gNormal = vec4(0.0); gInfo = vec4(0.0); gVelocity = vec4(0.0); gAlbedo = vec4(0.0); gIndirect = vec4(0.0); }
// Цвет в цель кадра: в HDR-цель вида — как есть (тон-маппинг и sRGB делает пост), прямо в холст («Телефон»,
// mobile.js) — тон-маппинг и sRGB здесь (как fx-sprites.js FX_OUT); three задаёт TONE_MAPPING и
// linearToOutputTexel по цели рендера. Премультипликация: rgb × a.
vec3 mbOut(vec3 col) {
  #ifdef TONE_MAPPING
  col = toneMapping(col);
  #endif
  return linearToOutputTexel(vec4(col, 1.0)).rgb;
}
`;
// Частица вихра: высота по кругу (поднимается и рождается снова), угол — быстрее у земли, радиус воронки растёт
// с высотой; юбка — широкие клубы у земли. uDev: x, z, возраст 0..1, сила; uDir: курс.
const DEVIL_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform vec4 uDev[2];
uniform vec2 uDir[2];
uniform float uTime;
varying vec2 vQ;
varying float vA;
varying vec3 vW;
void main() {
  int k = aSeed.w > 0.5 ? 1 : 0;
  vec4 dv = uDev[k];
  float skirt = step(fract(aSeed.w * 2.0), 0.23);
  float hh = fract(aSeed.x + uTime * (0.09 + 0.07 * aSeed.z));
  float H = mix(7.5, 0.9, skirt);
  float h = pow(hh, 1.25) * H;
  float lean = 0.18 * h;
  float ang = aSeed.y * 6.2832 + uTime * (3.4 - 1.6 * hh) * (1.0 + 0.3 * aSeed.z);
  float rad = mix(0.22 + 1.55 * pow(hh, 1.35), 0.9 + 1.4 * hh, skirt);
  // путь вихря: середина ползёт вдоль курса, верх отстаёт и гнётся
  float wob = sin(uTime * 0.9 + aSeed.z * 3.0) * 0.25 * hh;
  vec3 c = vec3(dv.x + uDir[k].x * (-lean + wob), 0.0, dv.y + uDir[k].y * (-lean + wob));
  vec3 p = c + vec3(cos(ang) * rad, h + 0.15, sin(ang) * rad);
  vec3 toCam = normalize(cameraPosition - p);
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 u = cross(toCam, r);
  float size = mix(0.45 + 1.1 * hh, 1.3 + 0.9 * hh, skirt);
  vec3 w = p + (r * position.x + u * position.y) * size;
  vQ = position.xy * 2.0; vW = w;
  float life = smoothstep(0.0, 0.12, dv.z) * (1.0 - smoothstep(0.78, 1.0, dv.z));
  vA = dv.w * life * (1.0 - hh) * mix(0.3, 0.22, skirt) * smoothstep(0.0, 0.06, hh);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const DEVIL_FRAG = GB_OUT + /* glsl */ `
uniform vec3 uSunDir, uSunCol, uSky, uTint;
varying vec2 vQ;
varying float vA;
varying vec3 vW;
layout(location = 0) out highp vec4 outColor;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float r = length(vQ);
  if (r > 1.0 || vA < 0.002) discard;
  float n = h(floor((vQ + vW.xz) * 4.0)) * 0.35 + 0.65;
  float a = (1.0 - smoothstep(0.15, 1.0, r)) * vA * n;
  vec3 V = normalize(vW - cameraPosition);
  float fwd = pow(max(dot(V, uSunDir), 0.0), 6.0);
  vec3 c = uTint * (uSunCol * (0.3 + 1.6 * fwd) + uSky);
  outColor = vec4(mbOut(c) * a, a);
  gbZero();
}
`;

// Ночное пятно света под мачтой (у оригинала — мягкий тёплый круг на земле перед мачтой, к стройке): диск с
// радиальным спадом, прибавляется к кадру; сила — ночь.
const POOL_VERT = /* glsl */ `
attribute vec4 aPool;
varying vec2 vQ;
void main() {
  vQ = position.xy * 2.0;
  vec3 w = vec3(aPool.x + position.x * aPool.w * 2.0, aPool.y, aPool.z + position.y * aPool.w * 2.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const POOL_FRAG = GB_OUT + /* glsl */ `
uniform float uK;
varying vec2 vQ;
layout(location = 0) out highp vec4 outColor;
void main() {
  float r = length(vQ);
  if (r > 1.0) discard;
  // мягкий край: ярко у мачты, к краю — плавно в темноту (без кольца)
  float a = pow(1.0 - smoothstep(0.0, 1.0, r), 1.6) * (0.85 + 0.15 * cos(r * 9.0));
  // прибавка к кадру: в холст — после тон-маппинга (иначе на «Телефоне» пятно — тусклое линейное пятно)
  vec3 add = vec3(1.0, 0.78, 0.5) * a * uK;
  #ifdef TONE_MAPPING
  add = mbOut(add);
  #endif
  outColor = vec4(add, 0.0);
  gbZero();
}
`;

export function buildAmbient(kit, ctx, lay, quarry) {
  const S = lay.S, f = lay.level.footprint, mines = lay.level.mines;
  const group = new THREE.Group();
  group.name = 'site-ambient';
  // ---------- вихри ----------
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const wide = S.x1 - S.x0 > 28 || S.z1 - S.z0 > 28;
  const count = (wide ? 2 : 1) * PER;
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seeds[i * 4] = (i * 0.618034) % 1; seeds[i * 4 + 1] = (i * 0.7548777) % 1; seeds[i * 4 + 2] = (i * 0.5698403) % 1;
    // w: номер вихря (0 или 1) и доля юбки в дробной части
    seeds[i * 4 + 3] = (i < PER ? 0.0 : 0.51) + ((i % PER) < 10 ? 0.05 : 0.2);
  }
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  g.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uDev: { value: [new THREE.Vector4(), new THREE.Vector4()] }, uDir: { value: [new THREE.Vector2(1, 0), new THREE.Vector2(1, 0)] }, uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3() }, uSky: { value: new THREE.Vector3() }, uTint: { value: new THREE.Vector3(0.6, 0.52, 0.42) } },
    vertexShader: DEVIL_VERT, fragmentShader: DEVIL_FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const dust = new THREE.Mesh(g, mat);
  dust.frustumCulled = false;
  dust.renderOrder = 4;
  dust.userData.noGI = true;
  group.add(dust);
  const devils = [];
  for (let i = 0; i < (wide ? 2 : 1); i++) devils.push({ t: 0, wait: i ? 9 + Math.random() * 8 : 0.5, x: 0, z: 0, dx: 1, dz: 0 });
  // вихрь не заходит на стройку и к рудникам (клетки оригинала)
  function open(x, z) {
    if (x < S.x0 + 1.5 || x > S.x1 - 1.5 || z < S.z0 + 1.5 || z > S.z1 + 2) return false;
    if (x > f.minX - 2 && x < f.maxX + 3 && z > f.minZ - 2 && z < f.maxZ + 3) return false;
    for (let i = 0; i < mines.length; i++) if (Math.hypot(x - mines[i].x - 0.5, z - mines[i].z - 0.5) < 2.5) return false;
    return true;
  }
  const probe = new THREE.Vector3();
  function seen(camera, x, z) {
    if (!camera) return true;
    probe.set(x * C, 1.6, z * C).project(camera);
    return Math.abs(probe.x) < 0.8 && Math.abs(probe.y) < 0.8 && probe.z < 1;
  }
  function place(d, camera) {
    const len = 0.32 * DEVIL_LIFE;
    let found = false;
    for (let k = 0; k < 40; k++) {
      const x = S.x0 + Math.random() * (S.x1 - S.x0), z = S.z0 + Math.random() * (S.z1 - S.z0 + 3);
      const a = Math.random() * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
      if (!open(x, z) || !open(x + dx * len * 0.5, z + dz * len * 0.5) || !open(x + dx * len, z + dz * len)) continue;
      const good = seen(camera, x, z) && seen(camera, x + dx * len * 0.5, z + dz * len * 0.5);
      if (found && !good) continue;
      d.x = x; d.z = z; d.dx = dx; d.dz = dz; found = true;
      if (good) return true;
    }
    return found;
  }

  // ---------- пятна света мачт ----------
  const pg = new THREE.InstancedBufferGeometry();
  const disc = new THREE.PlaneGeometry(1, 1);
  pg.index = disc.index;
  pg.setAttribute('position', disc.attributes.position);
  const pd = new Float32Array(lay.masts.length * 4);
  POOLS.uPoolC.value.forEach(function (v) { v.set(0, 0, 0, 0); });
  lay.masts.forEach(function (m, i) {
    const away = Math.hypot(lay.cx - m.x, lay.cz - m.z) || 1;
    const x = (m.x + (lay.cx - m.x) / away * 1.2 * m.s) * C, z = (m.z + (lay.cz - m.z) / away * 1.2 * m.s) * C;
    pd.set([x, quarry.heightAt(x, z) + 0.15, z, 2.6 * m.s * C], i * 4);
    // подсветка вещей в пятне (site-kit.js POOLS): центр и радиус пятна, прожекторы — над мачтой, чуть к стройке
    if (i < 4) {
      POOLS.uPoolC.value[i].set(x, quarry.heightAt(x, z), z, 2.6 * m.s * C);
      POOLS.uPoolH.value[i].set((m.x + (lay.cx - m.x) / away * 0.25 * m.s) * C, quarry.heightAt(m.x * C, m.z * C) + 8.1 * m.s * C, (m.z + (lay.cz - m.z) / away * 0.25 * m.s) * C);
    }
  });
  pg.setAttribute('aPool', new THREE.InstancedBufferAttribute(pd, 4));
  pg.instanceCount = lay.masts.length;
  const poolMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: { uK: { value: 0 } }, vertexShader: POOL_VERT, fragmentShader: POOL_FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide,
  });
  const pools = new THREE.Mesh(pg, poolMat);
  pools.frustumCulled = false;
  pools.renderOrder = 3;
  pools.userData.noGI = true;
  pools.visible = false;
  group.add(pools);

  // ---------- камешки ----------
  const rocks = [];
  const geo = (function () {
    const p = stone(1, 0.8, 0.9, 5, TILE.stone || [2, 2], 0.3, 0.6);
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
    bg.setAttribute('normal', new THREE.Float32BufferAttribute(p.nrm, 3));
    bg.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(p.pos.length).fill(0.95), 3));
    bg.setIndex(new THREE.BufferAttribute(p.index, 1));
    return bg;
  })();
  const pebbles = new THREE.InstancedMesh(geo, ctx.mats.stone, PEBBLES);
  pebbles.count = 0;
  pebbles.castShadow = true;
  pebbles.frustumCulled = false;
  group.add(pebbles);
  const slopes = quarry.slopes;
  let pebbleAt = 3 + Math.random() * 4;
  // Профиль уступов кольца — тот же, что у сетки карьера (site-quarry.js profile): высота под расстоянием d (м)
  // от нижней бровки наружу и уклон.
  const profile = quarry.profile;
  function roll() {
    const ring = slopes[Math.floor(Math.random() * slopes.length)];
    const r = 0.1 + Math.random() * 0.14;
    const d = quarry.crestOf(ring) + 0.25;
    return { ring: ring, r: r, d: d, y: profile(ring, d)[0] + r, vd: -(0.4 + Math.random() * 0.8), vy: 0.3, ang: 0, yaw: Math.random() * 6, rest: 0, side: (Math.random() - 0.5) * 0.3 };
  }
  function step(p, dt) {
    if (p.rest > 0) { p.rest += dt; return p.rest < 3; }
    p.vy -= 9.8 * dt;
    p.d += p.vd * dt; p.y += p.vy * dt;
    const pr = profile(p.ring, p.d);
    const gy = pr[0] + p.r * 0.8;
    if (p.y < gy) {
      p.y = gy;
      // нормаль поверхности в плоскости профиля (наружу из земли): (-уклон, 1)
      const nl = Math.hypot(pr[1], 1), nd = -pr[1] / nl, ny = 1 / nl;
      const vn = p.vd * nd + p.vy * ny;
      if (vn < 0) {
        const td = p.vd - vn * nd, ty = p.vy - vn * ny;
        p.vd = td * 0.82 - vn * nd * 0.32; p.vy = ty * 0.82 - vn * ny * 0.32;
      }
      if (p.d < 0 && Math.hypot(p.vd, p.vy) < 0.25) p.rest = 0.001;
    }
    if (p.d < -4) p.rest = Math.max(p.rest, 0.001);
    p.ang += -p.vd * dt / p.r;
    return true;
  }

  const dummy = new THREE.Object3D();
  let time = 0;
  function update(dt, info) {
    const lampK = THREE.MathUtils.smoothstep(info.night || 0, 0.3, 0.6);
    poolMat.uniforms.uK.value = 0.55 * lampK;
    POOLS.uPoolK.value = lampK;
    pools.visible = lampK > 0.01;
    // на перемотке (×5 и быстрее) вихрей и камешков нет, как у оригинала
    const fast = info.tempo >= 5;
    dust.visible = !fast;
    pebbles.visible = !fast && rocks.length > 0;
    if (fast) return;
    const wdt = dt * Math.max(0, Math.min(info.tempo, 4));
    time += wdt;
    const u = mat.uniforms;
    u.uTime.value = time;
    const sky = ctx.sky;
    if (sky && sky.state) {
      u.uSunDir.value.copy(sky.state.sunDir);
      if (sky.sun) u.uSunCol.value.set(sky.sun.color.r, sky.sun.color.g, sky.sun.color.b).multiplyScalar(sky.sun.intensity * 0.06);
      u.uSky.value.set(0.08, 0.09, 0.1).multiplyScalar(1 - (info.night || 0) * 0.9);
    }
    devils.forEach(function (d, i) {
      if (d.wait > 0) {
        d.wait -= wdt;
        if (d.wait <= 0) { if (place(d, info.camera)) d.t = 0; else d.wait = 5; }
        u.uDev.value[i].set(0, 0, 0, 0);
        return;
      }
      d.t += wdt;
      const k = d.t / DEVIL_LIFE;
      if (k >= 1) { d.wait = 6 + Math.random() * 10; u.uDev.value[i].set(0, 0, 0, 0); return; }
      const x = d.x + d.dx * 0.32 * d.t, z = d.z + d.dz * 0.32 * d.t;
      u.uDev.value[i].set(x * C, z * C, k, 1);
      u.uDir.value[i].set(d.dx, d.dz);
    });
    // камешки
    pebbleAt -= wdt;
    if (pebbleAt <= 0 && slopes.length && rocks.length < PEBBLES) { pebbleAt = 4 + Math.random() * 5; rocks.push(roll()); }
    const sub = Math.min(0.1, wdt);
    for (let i = rocks.length - 1; i >= 0; i--) {
      let alive = true;
      for (let s = 0; s < 3 && alive; s++) alive = step(rocks[i], sub / 3);
      if (!alive) rocks.splice(i, 1);
    }
    for (let i = 0; i < rocks.length; i++) {
      const p = rocks[i], g0 = p.ring;
      const sink = Math.max(0, p.rest - 2) * p.r * 1.5;
      dummy.position.set(g0.x * C + g0.nx * p.d + g0.nz * p.side, p.y - sink, g0.z * C + g0.nz * p.d - g0.nx * p.side);
      dummy.rotation.set(p.ang, p.yaw, 0, 'YXZ');
      dummy.scale.set(p.r * 2, p.r * 1.6, p.r * 2);
      dummy.updateMatrix();
      pebbles.setMatrixAt(i, dummy.matrix);
    }
    pebbles.count = rocks.length;
    pebbles.visible = rocks.length > 0;
    pebbles.instanceMatrix.needsUpdate = true;
  }
  function state() {
    return { devils: devils.map(function (d) { return d.wait > 0 ? -Math.round(d.wait) : Math.round(d.t); }), pebbles: rocks.length };
  }
  return { group: group, update: update, state: state };
}
