// Жизнь вокруг стройки: погода (ясно → облачно → дождь → сохнет), капли дождя, пыль из-под тачек и ног,
// дым генераторов мачт ночью, мошкара у прожекторов, птицы. Всё кодом, без текстур.
import * as THREE from 'three';
import { CLOUD, WEATHER } from './world.js?v=9f85320';
import { ATMO } from './atmosphere.js?v=9f85320';

// выходы G-буфера у собственных шейдеров: прозрачное не трогает буферы под собой
const GB_OUT = /* glsl */ `
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
void gbZero() { gNormal = vec4(0.0); gInfo = vec4(0.0); gVelocity = vec4(0.0); gAlbedo = vec4(0.0); gIndirect = vec4(0.0); }
`;

// ---------- дождь ----------
// 14 000 штрихов в коробке 44 × 26 × 44 м вокруг камеры; положение — из номера капли и времени (без CPU),
// длина — по скорости падения (выдержка кадра), свет — небо и прожекторы.
const RAIN_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime, uRain;
uniform vec3 uCam, uWindR;
varying float vA;
varying vec2 vQ;
varying vec3 vW;
void main() {
  vec3 box = vec3(44.0, 26.0, 44.0);
  float fall = 9.0 + aSeed.w * 2.0;
  vec3 p = aSeed.xyz * box + vec3(uWindR.x, -fall, uWindR.z) * uTime;
  p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
  vec3 v = normalize(vec3(uWindR.x, -fall, uWindR.z));
  vec3 toCam = normalize(cameraPosition - p);
  vec3 side = normalize(cross(v, toCam)) * 0.011;
  float len = 0.7;
  vec3 w = p + side * position.x + v * (position.y * len);
  vW = w;
  vQ = position.xy;
  // редеет вдали, у камеры не мешает
  float d = length(p - cameraPosition);
  vA = uRain * smoothstep(0.6, 2.5, d) * (1.0 - smoothstep(14.0, 22.0, d)) * step(aSeed.w, uRain * 1.05);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const RAIN_FRAG = GB_OUT + /* glsl */ `
uniform vec3 uSky, uSpotPos[2], uSpotCol[2], uSpotDir[2];
uniform vec2 uSpotCos[2];
varying float vA;
varying vec2 vQ;
varying vec3 vW;
layout(location = 0) out highp vec4 outColor;
void main() {
  float a = vA * (1.0 - abs(vQ.x) * 2.0) * smoothstep(0.0, 0.25, vQ.y + 0.5) * (1.0 - smoothstep(0.25, 0.5, vQ.y));
  if (a <= 0.002) discard;
  vec3 c = uSky * 2.2;
  for (int k = 0; k < 2; k++) {
    vec3 lv = uSpotPos[k] - vW; float dl = length(lv); vec3 l = lv / max(dl, 1e-3);
    float cone = smoothstep(uSpotCos[k].x, uSpotCos[k].y, dot(-l, uSpotDir[k]));
    c += uSpotCol[k] * cone / max(dl * dl, 1.0) * 0.9;
  }
  outColor = vec4(c * a * 0.6, a * 0.35);
  gbZero();
}
`;

function rain(count) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  g.instanceCount = count;
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uTime: WEATHER.time, uRain: WEATHER.rain, uCam: { value: new THREE.Vector3() }, uWindR: { value: new THREE.Vector3(1.3, 0, 0.6) },
      uSky: { value: new THREE.Vector3(0.3, 0.32, 0.35) },
      uSpotPos: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uSpotCol: { value: [new THREE.Vector3(), new THREE.Vector3()] },
      uSpotDir: { value: [new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -1, 0)] }, uSpotCos: { value: [new THREE.Vector2(1, 1), new THREE.Vector2(1, 1)] },
    },
    vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.userData.noGI = true;
  return mesh;
}

// ---------- частицы: пыль, дым, мошкара ----------
const PART_VERT = /* glsl */ `
attribute vec4 aPos;   // xyz, размер
attribute vec4 aCol;   // rgb (альбедо или свечение), прозрачность
attribute float aKind; // 0 пыль, 1 дым, 2 мошка (светится)
varying vec2 vQ;
varying vec4 vCol;
varying float vKind;
varying vec3 vW;
void main() {
  vec3 toCam = normalize(cameraPosition - aPos.xyz);
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 u = cross(toCam, r);
  vec3 w = aPos.xyz + (r * position.x + u * position.y) * aPos.w;
  vQ = position.xy * 2.0; vCol = aCol; vKind = aKind; vW = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const PART_FRAG = GB_OUT + /* glsl */ `
uniform vec3 uSunDir, uSunCol, uSky;
varying vec2 vQ;
varying vec4 vCol;
varying float vKind;
varying vec3 vW;
layout(location = 0) out highp vec4 outColor;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float r = length(vQ);
  if (r > 1.0) discard;
  float a;
  vec3 c;
  if (vKind > 1.5) {
    a = (1.0 - smoothstep(0.0, 1.0, r)) * vCol.a;
    c = vCol.rgb * 6.0;
  } else {
    float n = h(floor((vQ + vW.xz) * 5.0)) * 0.3 + 0.7;
    a = (1.0 - smoothstep(0.2, 1.0, r)) * vCol.a * n;
    vec3 V = normalize(vW - cameraPosition);
    float fwd = pow(max(dot(V, uSunDir), 0.0), 6.0);
    c = vCol.rgb * (uSunCol * (0.25 + 1.8 * fwd) + uSky);
  }
  outColor = vec4(c * a, a);
  gbZero();
}
`;

function particles(max) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const P = new Float32Array(max * 4), Cc = new Float32Array(max * 4), K = new Float32Array(max);
  const aP = new THREE.InstancedBufferAttribute(P, 4), aC = new THREE.InstancedBufferAttribute(Cc, 4), aK = new THREE.InstancedBufferAttribute(K, 1);
  aP.setUsage(THREE.DynamicDrawUsage); aC.setUsage(THREE.DynamicDrawUsage); aK.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aPos', aP); g.setAttribute('aCol', aC); g.setAttribute('aKind', aK);
  g.instanceCount = 0;
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3() }, uSky: { value: new THREE.Vector3() } },
    vertexShader: PART_VERT, fragmentShader: PART_FRAG,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.userData.noGI = true;
  // частица: x y z, скорость, возраст, жизнь, размер, рост, цвет, прозрачность, вид
  const list = [];
  function emit(kind, x, y, z, vx, vy, vz, life, size, grow, r, gg, b, a) {
    if (list.length >= max) list.shift();
    list.push({ kind, x, y, z, vx, vy, vz, age: 0, life, size, grow, r, g: gg, b, a });
  }
  function update(dt) {
    let n = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) { list.splice(i, 1); continue; }
    }
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const drag = p.kind === 2 ? 0 : Math.exp(-dt * 1.6);
      p.vx *= drag; p.vz *= drag; if (p.kind !== 2) p.vy = p.vy * drag + (p.kind === 1 ? 0.35 : 0.05) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = p.age / p.life;
      const fade = p.kind === 2 ? 1 : Math.sin(Math.min(1, t * 1.2) * Math.PI) ;
      P[n * 4] = p.x; P[n * 4 + 1] = p.y; P[n * 4 + 2] = p.z; P[n * 4 + 3] = p.size + p.grow * p.age;
      Cc[n * 4] = p.r; Cc[n * 4 + 1] = p.g; Cc[n * 4 + 2] = p.b; Cc[n * 4 + 3] = p.a * fade;
      K[n] = p.kind;
      n++;
    }
    g.instanceCount = n;
    aP.needsUpdate = aC.needsUpdate = aK.needsUpdate = true;
    aP.addUpdateRange && aP.addUpdateRange(0, n * 4);
  }
  return { mesh, emit, update, list };
}

// ---------- птицы ----------
// Несколько стай ходят кругами над лесом; крылья машут в вершинном шейдере (V из двух треугольников).
function birds() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, -0.36, 0, -0.04, 0, 0, -0.1, 0, 0, 0.12, 0, 0, -0.1, 0.36, 0, -0.04], 3));
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = function (shader) {
    shader.uniforms.uFlap = WEATHER.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uFlap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.3;\n#else\nfloat ph = 0.0;\n#endif\ntransformed.y += abs(transformed.x) * sin(uFlap * 11.0 + ph) * 0.9;');
  };
  m.customProgramCacheKey = function () { return 'bird1'; };
  const n = 18;
  const mesh = new THREE.InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.userData.noGI = true;
  const flocks = [[60, -40, 46, 0.12], [-80, 70, 62, -0.09], [20, 120, 38, 0.15]];
  const dummy = new THREE.Object3D();
  function update(t) {
    for (let i = 0; i < n; i++) {
      const f = flocks[i % 3], k = Math.floor(i / 3);
      const a = t * f[3] + k * 0.08;
      const R = 70 + k * 3;
      dummy.position.set(f[0] + Math.cos(a) * R + Math.sin(k * 7.1) * 3, f[2] + Math.sin(t * 0.3 + k) * 2, f[1] + Math.sin(a) * R + Math.cos(k * 5.3) * 3);
      dummy.rotation.set(0, -a + (f[3] > 0 ? 0 : Math.PI), Math.sin(t + k) * 0.2);
      dummy.scale.setScalar(1.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}

// ---------- погода ----------
// Каждый второй день под вечер (15:30–17:00) — ливень, до и после — облака густеют и редеют; сырость копится
// под дождём и сохнет часа три. ?weather=rain|clear — для проверки.
export function createLife(scene, quality, opts) {
  const group = new THREE.Group();
  group.name = 'life';
  const R = quality.rain === 0 ? null : rain(quality.taa ? 14000 : 5000);
  const P = particles(quality.taa ? 900 : 300);
  const B = birds();
  if (R) group.add(R);
  group.add(P.mesh, B.mesh);
  scene.add(group);
  let forced = opts.weather || null;
  let day = 0, lastHour = null, cover = 0.27, wet = 0, rainK = 0;
  const tmp = new THREE.Vector3();
  let dustClock = 0, smokeClock = 0, mothClock = 0;
  function plan(hour) {
    if (forced === 'rain') return { cover: 0.82, rain: 1 };
    if (forced === 'clear') return { cover: 0.18, rain: 0 };
    if (day % 2 === 1) {
      const build = THREE.MathUtils.smoothstep(hour, 13.0, 15.3) * (1 - THREE.MathUtils.smoothstep(hour, 17.2, 19.0));
      const shower = THREE.MathUtils.smoothstep(hour, 15.4, 15.8) * (1 - THREE.MathUtils.smoothstep(hour, 16.7, 17.1));
      return { cover: 0.27 + 0.55 * build, rain: shower };
    }
    return { cover: 0.27, rain: 0 };
  }
  // dt — реальные секунды (частицы), sim — игровые (погода)
  function update(dt, sim, time, hour, sky, workers, lights) {
    if (lastHour !== null && hour < lastHour - 12) day++;
    lastHour = hour;
    const p = plan(hour);
    const k = 1 - Math.exp(-sim * 0.5);
    cover += (p.cover - cover) * k;
    rainK += (p.rain - rainK) * (1 - Math.exp(-sim * 0.8));
    // под дождём мокнет за ~15 мин игры, сохнет ~3 ч (игровой час — 40 с при ×1)
    wet = Math.max(0, Math.min(1, wet + (rainK > 0.2 ? sim / 40 * 4 * rainK : -sim / 40 / 3)));
    if (forced === 'rain') wet = Math.max(wet, 0.85);
    CLOUD.cover.value = cover;
    WEATHER.wet.value = wet;
    WEATHER.rain.value = rainK;
    WEATHER.time.value = time;
    // дымка: под облаками и утром гуще
    const morning = THREE.MathUtils.smoothstep(hour, 4.8, 6.2) * (1 - THREE.MathUtils.smoothstep(hour, 7.4, 9.0));
    ATMO.haze.value = 6 + 7 * (cover - 0.27) + 10 * morning + 6 * rainK;
    const st = sky.state;
    if (R) {
      const u = R.material.uniforms;
      u.uCam.value.copy(opts.camera.position);
      const sk = ATMO.irradiance.value ? 1 : 1;
      u.uSky.value.set(0.35, 0.37, 0.4).multiplyScalar(sk * (1 - st.night * 0.95) * 0.6 + 0.01);
      const spots = (lights || []).filter(function (l) { return l.isSpotLight; });
      for (let i = 0; i < 2; i++) {
        const sp = spots[i];
        if (!sp || sp.intensity < 0.01) { u.uSpotCol.value[i].set(0, 0, 0); continue; }
        sp.getWorldPosition(u.uSpotPos.value[i]);
        sp.target.getWorldPosition(tmp);
        u.uSpotDir.value[i].copy(tmp).sub(u.uSpotPos.value[i]).normalize();
        u.uSpotCol.value[i].set(sp.color.r, sp.color.g, sp.color.b).multiplyScalar(sp.intensity);
        u.uSpotCos.value[i].set(Math.cos(sp.angle), Math.cos(sp.angle * (1 - sp.penumbra)));
      }
      R.visible = rainK > 0.01;
    }
    // пыль: из-под колёс тачек и ног на сухой земле, днём; дым генераторов и мошкара — ночью
    const pu = P.mesh.material.uniforms;
    pu.uSunDir.value.copy(st.sunDir);
    pu.uSunCol.value.set(sky.sun.color.r, sky.sun.color.g, sky.sun.color.b).multiplyScalar(sky.sun.intensity * 0.06);
    pu.uSky.value.set(0.08, 0.09, 0.1).multiplyScalar(1 - st.night * 0.9);
    dustClock += dt; smokeClock += dt; mothClock += dt;
    if (dustClock > 0.12 && wet < 0.3) {
      dustClock = 0;
      (workers || []).forEach(function (w) {
        if (w.state !== 'walk' || !w.anim || w.anim.speed < 0.4) return;
        const barrow = w.barrowState === 'push';
        if (Math.random() > (barrow ? 0.7 : 0.25)) return;
        const hx = Math.sin(w.heading || 0), hz = Math.cos(w.heading || 0);
        const ox = barrow ? hx * 1.45 : (Math.random() - 0.5) * 0.3, oz = barrow ? hz * 1.45 : (Math.random() - 0.5) * 0.3;
        P.emit(0, w.pos.x + ox, w.pos.y + 0.06, w.pos.z + oz, (Math.random() - 0.5) * 0.4, 0.12 + Math.random() * 0.1, (Math.random() - 0.5) * 0.4,
          1.6 + Math.random(), 0.12, 0.35, 0.55, 0.47, 0.38, 0.16 * (1 - wet * 3));
      });
    }
    if (st.night > 0.4 && lights) {
      const spots = lights.filter(function (l) { return l.isSpotLight; });
      if (smokeClock > 0.35) {
        smokeClock = 0;
        spots.forEach(function (sp) {
          // выхлоп генератора — под мачтой, у кожуха
          sp.getWorldPosition(tmp);
          P.emit(1, tmp.x, 1.35, tmp.z, 0.1 + Math.random() * 0.1, 0.5, 0.05, 5, 0.12, 0.45, 0.32, 0.32, 0.33, 0.22);
        });
      }
      if (mothClock > 0.05) {
        mothClock = 0;
        spots.forEach(function (sp) {
          if (P.list.filter(function (q) { return q.kind === 2; }).length > 90) return;
          sp.getWorldPosition(tmp);
          const a = Math.random() * 6.28, r = 0.4 + Math.random() * 1.6;
          P.emit(2, tmp.x + Math.cos(a) * r, tmp.y - 0.2 - Math.random() * 1.2, tmp.z + Math.sin(a) * r, Math.cos(a + 1.6) * 1.2, (Math.random() - 0.5) * 0.6, Math.sin(a + 1.6) * 1.2,
            1.2 + Math.random() * 1.5, 0.012, 0, 1.0, 0.95, 0.85, 0.9);
        });
      }
    }
    P.update(dt);
    B.update(time);
    B.mesh.visible = st.night < 0.5 && rainK < 0.5;
  }
  return {
    group, update,
    state: function () { return { day, cover, wet, rain: rainK, forced }; },
    // принудительная погода (съёмка ролика, проверки): 'rain' | 'clear' | null — по расписанию
    force: function (mode, instant) {
      forced = mode || null;
      if (instant) { const p = plan(lastHour || 12); cover = p.cover; rainK = p.rain; if (mode === 'rain') wet = 0.9; if (mode === 'clear') wet = 0; }
    },
  };
}
