// Природа вокруг стройки: трава кустиками с ветром (инстансы по секторам, чтобы отсекались вне кадра),
// ели из ветвей-карточек (хвоя рисуется кодом на canvas) и валуны. Трава и хвоя не попадают в затенение углов
// (userData.noAO): у карточек нет объёма, GTAO затемнил бы их прямоугольниками.
import * as THREE from 'three';
import { rng, stone, cylinder, Batch } from './geo.js?v=360d748';
import { TEXTURE_TILES as TILE } from './textures.js?v=360d748';
import { WEATHER } from './world.js?v=360d748';

// ---------- трава ----------

// Кустик из травинок (вблизи 9 по 4 сегмента); flowers — у трёх травинок на макушке цветок (жёлтый, белый
// или лиловый). Вдали травинок и сегментов меньше, а сами они шире (widen), чтобы кустик не редел.
// Травинка односторонняя: изнанку рисует DoubleSide, нормаль там отражается относительно вертикали (createGrass).
function clumpGeometry(r, flowers, blades = 9, segs = 4, widen = 1) {
  const pos = [], nrm = [], col = [], tt = [], idx = [];
  for (let b = 0; b < blades; b++) {
    const a = r() * Math.PI * 2, d = r() * 0.09;
    const bx = Math.cos(a) * d, bz = Math.sin(a) * d;
    const h = 0.22 + r() * 0.38;
    const w = (0.012 + r() * 0.01) * widen;
    const face = r() * Math.PI * 2;
    const lean = 0.08 + r() * 0.22;
    const lx = Math.cos(a) * lean, lz = Math.sin(a) * lean;
    const dry = r() < 0.07;
    const base = pos.length / 3;
    const fx = Math.cos(face), fz = Math.sin(face);
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const ww = w * (1 - t * 0.92);
      const cx = bx + lx * t * t, cz = bz + lz * t * t, cy = h * t * (1 - 0.15 * t * lean * 3);
      for (let k = -1; k <= 1; k += 2) {
        pos.push(cx + fx * ww * k, cy, cz + fz * ww * k);
        // нормаль: больше вверх — мягкий свет с обеих сторон
        const nx = -fz, nz = fx;
        const l = Math.hypot(nx * 0.45, 1, nz * 0.45);
        nrm.push((nx * 0.45) / l, 1 / l, (nz * 0.45) / l);
        const root = 1 - t;
        let c;
        if (dry) c = [0.2 - 0.12 * root, 0.17 - 0.1 * root, 0.075 - 0.05 * root];
        else c = [0.04 + 0.062 * t, 0.066 + 0.1 * t, 0.016 + 0.022 * t];
        const v = 0.85 + r() * 0.3;
        col.push(c[0] * v, c[1] * v, c[2] * v);
        tt.push(t);
      }
    }
    for (let s = 0; s < segs; s++) {
      const a0 = base + s * 2;
      idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
    }
    if (flowers && b < 3) {
      // цветок: звёздочка из пяти лепестков на макушке, смотрит вверх
      const tx = bx + lx, tz = bz + lz, ty = h * (1 - 0.45 * lean) + 0.004;
      const pc = [[0.78, 0.56, 0.02], [0.82, 0.8, 0.74], [0.32, 0.17, 0.5]][Math.floor(r() * 3)];
      const fr = 0.014 + r() * 0.008;
      const c0 = pos.length / 3;
      pos.push(tx, ty + 0.003, tz); nrm.push(0, 1, 0); col.push(pc[0] * 0.6, pc[1] * 0.5, pc[2] * 0.4); tt.push(1);
      for (let k = 0; k < 10; k++) {
        const an = (k / 10) * Math.PI * 2, rr = k % 2 ? fr * 0.35 : fr;
        pos.push(tx + Math.cos(an) * rr, ty, tz + Math.sin(an) * rr); nrm.push(0, 1, 0); col.push(pc[0], pc[1], pc[2]); tt.push(1);
      }
      for (let k = 0; k < 10; k++) idx.push(c0, c0 + 1 + ((k + 1) % 10), c0 + 1 + k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
  g.setIndex(idx);
  return g;
}

// Свет насквозь (против солнца) для тонкой травы и хвои: сильнее у кончиков.
const TRANSLUCENT_FRAG = /* glsl */ `
varying float vTip;
uniform float uTranslucent;
vec3 mbTranslucent(vec3 L, vec3 V, vec3 N) {
  float back = pow(max(dot(-V, L), 0.0), 3.0);
  return vec3(back * uTranslucent * (0.3 + 0.7 * vTip) * RECIPROCAL_PI);
}
`;

// Трава кустиками-инстансами по секторам (отсекаются вне кадра). Плотность плавно падает от площадки,
// кустики вдали шире — граница не читается; высота и сухость — по карте луга, как у земли под ними:
// у кромки площадки трава вытоптана, под кронами её почти нет. Изредка — цветы.
// clear — радиус поляны (м): трава до clear + 62 м, вблизи гуще так же, как на поляне 34 м.
export function createGrass(terrain, splat, center, density, seed = 3, wear = null, clear = 34) {
  const group = new THREE.Group();
  group.name = 'grass';
  if (density <= 0) return { group, update() {} };
  const r = rng(seed);
  const time = { value: 0 };
  const wind = { value: new THREE.Vector2(0.8, 0.45) };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  // мокрая трава темнеет, но не блестит плёнкой (как ткань): у травинок на просвет иначе серебрится вся поляна
  mat.defines = { MB_TRANSLUCENT: '', MB_CLOTH: '' };
  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.uniforms.uTranslucent = { value: 1.5 };
    shader.uniforms.tWear = { value: wear ? wear.texture : null };
    shader.uniforms.uSnow = WEATHER.snow;
    shader.uniforms.uSnowF = WEATHER.snow;
    shader.uniforms.uWearSpan = { value: wear ? wear.span : 1 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aT;\nuniform float uTime;\nuniform vec2 uWind;\nvarying float vTip;\nuniform sampler2D tWear;\nuniform float uWearSpan;\nuniform float uSnow;')
      .replace('#include <project_vertex>', `
        vTip = aT;
        #ifdef USE_INSTANCING
        // на тропе трава примята
        transformed.y *= 1.0 - 0.75 * texture2D(tWear, instanceMatrix[3].xz / uWearSpan + 0.5).r;
        // под снегом трава примята и видна только верхушками
        transformed.y *= 1.0 - 0.55 * uSnow;
        #endif
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
        #endif
        float tip = aT * aT;
        vec2 wp = mvPosition.xz;
        float gust = sin(uTime * 1.7 + dot(wp, vec2(0.32, 0.21))) * 0.55 + sin(uTime * 3.3 + dot(wp, vec2(-0.9, 1.3))) * 0.22 + sin(uTime * 0.6 + wp.x * 0.05) * 0.4;
        mvPosition.xz += uWind * (0.5 + gust) * tip * 0.14;
        mvPosition.y -= tip * 0.025 * (0.6 + gust);
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
    // изнанка: three.js перевернул нормаль целиком, а травинке нужна та же «вверх» с обратной стороны
    // (отражение относительно вертикали), иначе со спины она чёрная; изнанка чуть темнее
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + TRANSLUCENT_FRAG)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= gl_FrontFacing ? 1.0 : 0.9;\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.8, 0.84), uSnowF * 0.5 * (1.0 - vTip));')
      .replace('varying float vTip;', 'varying float vTip;\nuniform float uSnowF;')
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        if (!gl_FrontFacing) { vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); normal -= 2.0 * dot(normal, upV) * upV; }`);
  };
  mat.customProgramCacheKey = function () { return 'grass5'; };
  // кольца: вблизи 9 травинок по 4 сегмента, дальше по 2 сегмента, у края 6 травинок пошире
  const LOD = [[9, 4, 1], [9, 2, 1], [6, 2, 1.25]];
  const geos = LOD.map(function (l, ri) {
    const sd = seed + ri * 10;
    return [rng(sd + 1), rng(sd + 2), rng(sd + 3), rng(sd + 4)].map(function (rr, gi) { return clumpGeometry(rr, gi === 3, l[0], l[1], l[2]); });
  });
  // плотность по радиусу — доля от ближней: до RF — вся, дальше (RF/r)^1.7, у края кольца — к нулю
  const R0 = 6, RF = 16, R1 = clear + 62;
  const densOf = function (r1) { return function (rr) { return (rr < RF ? 1 : Math.pow(RF / rr, 1.7)) * (1 - THREE.MathUtils.smoothstep(rr, r1 - 18, r1)); }; };
  const dens = densOf(R1);
  const ringsOf = function (r1) { return [[R0, 20], [20, 44], [44, r1]]; };
  const weightsOf = function (r1) {
    const d = densOf(r1);
    return ringsOf(r1).map(function (ring) {
      let s = 0;
      for (let rr = ring[0]; rr < ring[1]; rr += 0.5) s += d(rr + 0.25) * 2 * Math.PI * (rr + 0.25) * 0.5;
      return s;
    });
  };
  const sum = function (w) { return w.reduce(function (a, b) { return a + b; }, 0); };
  const rings = ringsOf(R1);
  const weight = weightsOf(R1);
  const total = sum(weight);
  const sectors = 18;
  // 70 000 пучков — на поляне 34 м (до 96 м); на большой — больше, ближние кольца не редеют
  const target = Math.round(70000 * density * total / sum(weightsOf(96)));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color(), lush = new THREE.Color(0.84, 1.0, 0.74), dryT = new THREE.Color(1.42, 1.2, 0.62);
  rings.forEach(function (ring, ri) {
    const peak = dens(ring[0]);
    for (let si = 0; si < sectors; si++) {
      const a0 = (si / sectors) * Math.PI * 2, a1 = ((si + 1) / sectors) * Math.PI * 2;
      const n = Math.round((target * weight[ri]) / total / sectors);
      const lists = [[], [], [], []];
      let made = 0;
      for (let k = 0; k < n * 6 && made < n; k++) {
        const a = a0 + r() * (a1 - a0);
        const rr = Math.sqrt(ring[0] * ring[0] + r() * (ring[1] * ring[1] - ring[0] * ring[0]));
        if (r() * peak > dens(rr)) continue;
        const x = center[0] + Math.cos(a) * rr, z = center[1] + Math.sin(a) * rr;
        const sp = splat.sample(x, z);
        if (sp[3] < 0.35 + r() * 0.4) continue;
        const md = splat.sampleMeadow(x, z);
        if (r() < md[2] * 0.9) continue;
        made++;
        const y = terrain.heightAt(x, z);
        q.setFromAxisAngle(up, r() * Math.PI * 2);
        const sc = 0.7 + r() * 0.65;
        const wide = rr < RF ? 1 : Math.pow(rr / RF, 0.55);
        const tall = (0.32 + 0.8 * md[1]) * (0.85 + r() * 0.4);
        s.set(sc * wide, sc * tall, sc * wide);
        m.compose(p.set(x, y - 0.02, z), q, s);
        const flower = rr > 10 && md[0] < 0.55 && r() < 0.035;
        const gi = flower ? 3 : Math.floor(r() * 3);
        tint.copy(lush).lerp(dryT, THREE.MathUtils.clamp(md[0] + (r() - 0.5) * 0.18, 0, 1)).multiplyScalar(0.88 + r() * 0.2);
        lists[gi].push([m.clone(), tint.clone()]);
      }
      lists.forEach(function (list, gi) {
        if (!list.length) return;
        const mesh = new THREE.InstancedMesh(geos[ri][gi], mat, list.length);
        list.forEach(function (it, i) { mesh.setMatrixAt(i, it[0]); mesh.setColorAt(i, it[1]); });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        mesh.userData.noAO = true;
        group.add(mesh);
      });
    }
  });
  return { group, material: mat, update(t) { time.value = t; } };
}

// ---------- ели ----------

// Канвас → DataTexture: цвет непрозрачных пикселей растекается в прозрачные (альфа остаётся 0). Иначе мипмапы
// подмешивают чёрный фон, и края карточек хвои и листвы вдали темнеют.
function bleedTexture(c, threshold, passes = 10) {
  const w = c.width, h = c.height;
  const d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let filled = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) filled[i] = d[i * 4 + 3] > 8 ? 1 : 0;
  for (let pass = 0; pass < passes; pass++) {
    const next = filled.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (filled[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!filled[j]) continue;
        r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++;
      }
      if (n) { d[i * 4] = r / n; d[i * 4 + 1] = g / n; d[i * 4 + 2] = b / n; next[i] = 1; }
    }
    filled = next;
  }
  // Мипмапы — свои: при обычном усреднении альфа падает ниже порога alphaTest, и листва вдали пропадает.
  // На каждом уровне альфа масштабируется так, чтобы доля пикселей выше порога была как на исходном.
  const levels = [{ data: new Uint8Array(d.buffer.slice(0)), width: w, height: h }];
  const coverage = function (a, k) { let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i] * k > threshold * 255) n++; return n / (a.length / 4); };
  const base = coverage(levels[0].data, 1);
  while (levels[levels.length - 1].width > 1 || levels[levels.length - 1].height > 1) {
    const src = levels[levels.length - 1];
    const lw = Math.max(1, src.width >> 1), lh = Math.max(1, src.height >> 1);
    const out = new Uint8Array(lw * lh * 4), alpha = new Float32Array(lw * lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const acc = [0, 0, 0, 0];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const sx = Math.min(src.width - 1, x * 2 + dx), sy = Math.min(src.height - 1, y * 2 + dy);
        const j = (sy * src.width + sx) * 4;
        for (let c = 0; c < 4; c++) acc[c] += src.data[j + c] / 4;
      }
      const i = (y * lw + x) * 4;
      out[i] = acc[0]; out[i + 1] = acc[1]; out[i + 2] = acc[2];
      alpha[y * lw + x] = acc[3];
      out[i + 3] = acc[3];
    }
    let lo = 0.5, hi = 8;
    for (let it = 0; it < 18; it++) { const mid = (lo + hi) / 2; if (coverage(out, mid) < base) lo = mid; else hi = mid; }
    for (let i = 0; i < alpha.length; i++) out[i * 4 + 3] = Math.min(255, alpha[i] * hi);
    levels.push({ data: out, width: lw, height: lh });
  }
  const tex = new THREE.DataTexture(levels[0].data, w, h, THREE.RGBAFormat);
  tex.mipmaps = levels;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = true;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function needleTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const r = rng(77);
  g.clearRect(0, 0, 512, 256);
  // веточка: центральный побег и боковые, хвоя — короткими штрихами
  function sprig(x0, y0, x1, y1, len, width) {
    g.strokeStyle = 'rgb(70,52,36)';
    g.lineWidth = width;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 1.6);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      for (let side = -1; side <= 1; side += 2) {
        const a = ang + side * (0.6 + r() * 0.5);
        const l = len * (0.6 + r() * 0.5) * (1 - t * 0.45);
        const shade = 0.75 + r() * 0.5;
        const tipBoost = t > 0.82 ? 1.35 : 1;
        g.strokeStyle = `rgb(${Math.round(34 * shade * tipBoost)},${Math.round(62 * shade * tipBoost)},${Math.round(30 * shade)})`;
        g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    }
  }
  sprig(8, 128, 500, 128 + (r() - 0.5) * 14, 26, 5);
  for (let i = 0; i < 16; i++) {
    const t = 0.05 + i * 0.058;
    const x = 8 + 490 * t, y = 128 + (r() - 0.5) * 6;
    const side = i % 2 ? 1 : -1;
    const len = (1 - t) * 150 + 50;
    sprig(x, y, x + len * 0.7, y + side * len * 0.6, 18, 2.4);
    if (r() < 0.6) sprig(x + len * 0.3, y + side * len * 0.25, x + len * 0.55, y + side * len * 0.75, 13, 1.6);
  }
  return bleedTexture(c, 0.42);
}

// Листва берёзы и кустов: веточки с листьями 5–7 см (по краю жилка), редкие желтеющие листья.
function leafTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const r = rng(91);
  function leaf(x, y, a, len) {
    const w = len * (0.42 + r() * 0.12);
    const shade = 0.7 + r() * 0.55;
    const yellow = r() < 0.1;
    const R = Math.round((yellow ? 128 : 60) * shade), G = Math.round((yellow ? 136 : 102) * shade), B = Math.round((yellow ? 46 : 32) * shade);
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = `rgb(${R},${G},${B})`;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -w, len, 0); g.quadraticCurveTo(len * 0.5, w, 0, 0); g.fill();
    g.strokeStyle = `rgb(${Math.round(R * 0.72)},${Math.round(G * 0.72)},${Math.round(B * 0.72)})`;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.9, 0); g.stroke();
    g.restore();
  }
  function twig(x0, y0, ang, len, depth) {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    g.strokeStyle = 'rgb(84,66,50)';
    g.lineWidth = Math.max(1, 3 - depth);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const n = Math.round(len / 13);
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      [-1, 1].forEach(function (sd) { if (r() < 0.85) leaf(x, y, ang + sd * (0.6 + r() * 0.6), 19 + r() * 12); });
    }
    if (depth < 2) for (let k = 0; k < 3; k++) {
      const t = 0.25 + r() * 0.6;
      twig(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), len * (0.45 + r() * 0.2), depth + 1);
    }
  }
  twig(6, 128, 0, 440, 0);
  twig(10, 96, 0.12, 400, 1);
  twig(10, 160, -0.12, 400, 1);
  return bleedTexture(c, 0.45);
}

// Карточки лиственной кроны в эллипсоиде (rx, ry) вокруг центра (0, cy, 0): ближе к краю гуще, внутри темнее;
// нормали — от центра кроны (мягкий объёмный свет). Обе стороны карточки — свои треугольники.
function leafCrown(r, n, cy, rx, ry, size, lean) {
  const pos = [], nrm = [], uv = [], col = [], idx = [];
  const d = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), t = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    d.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (d.lengthSq() > 1 || d.lengthSq() < 0.01) { k--; continue; }
    d.normalize();
    const dist = Math.pow(r(), 0.35);
    const p = new THREE.Vector3(d.x * rx * dist + lean.x * (d.y * ry * dist + cy), cy + d.y * ry * dist, d.z * rx * dist + lean.z * (d.y * ry * dist + cy));
    const nn = new THREE.Vector3(d.x / rx, d.y / ry + 0.25, d.z / rx).normalize();
    t.set(r() - 0.5, r() - 0.5, r() - 0.5);
    u.crossVectors(nn, t);
    if (u.lengthSq() < 1e-6) u.crossVectors(nn, t.set(0.3, 1, 0.2));
    u.normalize();
    v.crossVectors(nn, u).normalize();
    const sz = size * (0.75 + r() * 0.5);
    const shade = (0.62 + 0.38 * dist) * (0.85 + r() * 0.3);
    const b0 = pos.length / 3;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c, i) {
      pos.push(p.x + (u.x * c[0] + v.x * c[1]) * sz * 0.5, p.y + (u.y * c[0] + v.y * c[1]) * sz * 0.5, p.z + (u.z * c[0] + v.z * c[1]) * sz * 0.5);
      nrm.push(nn.x, nn.y, nn.z);
      uv.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0);
      col.push(shade, shade, shade * 0.95);
    });
    idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Берёза: тонкий слегка изогнутый белый ствол, узкая крона в верхних двух третях.
function birchGeometry(r, height) {
  const trunk = new THREE.CylinderGeometry(0.045, 0.15 * (height / 15), height * 0.96, 10, 10, false);
  trunk.translate(0, height * 0.48, 0);
  const bend = (r() - 0.5) * 0.5, phase = r() * 6.28;
  const lean = new THREE.Vector3(Math.sin(phase) * bend / height, 0, Math.cos(phase) * bend * 0.6 / height);
  const tp = trunk.attributes.position.array;
  for (let i = 0; i < tp.length; i += 3) { const y = tp[i + 1]; tp[i] += lean.x * y; tp[i + 2] += lean.z * y; }
  trunk.computeVertexNormals();
  trunk.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(trunk.attributes.position.count * 3).fill(1), 3));
  const tuv = trunk.attributes.uv.array;
  for (let i = 0; i < tuv.length; i += 2) { tuv[i] *= (Math.PI * 2 * 0.12) / TILE.birch[0]; tuv[i + 1] *= height / TILE.birch[1]; }
  const cards = leafCrown(r, 115, height * 0.68, 1.9 + r() * 0.8, height * 0.31, 1.45, lean);
  return { cards, trunk };
}

const CARD_UV = [[0, 0], [0, 1], [1, 1], [1, 0]];

function spruceGeometry(r, height) {
  const cards = { pos: [], nrm: [], uv: [], col: [], idx: [] };
  const trunk = new THREE.CylinderGeometry(0.02, 0.24 * (height / 16), height * 0.97, 9, 6, false);
  trunk.translate(0, height / 2, 0);
  trunk.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(trunk.attributes.position.count * 3).fill(1), 3));
  const tuv = trunk.attributes.uv.array;
  for (let i = 0; i < tuv.length; i += 2) { tuv[i] *= (Math.PI * 2 * 0.2) / TILE.bark[0]; tuv[i + 1] *= height / (TILE.bark[1] * 4); }
  const start = 1.2 + r() * 1.2;
  for (let y = start; y < height - 0.2; y += 0.38 + r() * 0.12) {
    const t = (y - start) / (height - start);
    const len = Math.pow(1 - t, 0.85) * (2.6 + r() * 0.6) + 0.35;
    const n = 8 + Math.floor(r() * 3);
    const az0 = r() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const az = az0 + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.5;
      const droop = 0.25 + t * -0.1 + r() * 0.25;
      const w = len * (0.75 + r() * 0.25);
      // карточка от ствола наружу, ширина — поперёк
      const dir = new THREE.Vector3(Math.cos(az) * Math.cos(droop), -Math.sin(droop), Math.sin(az) * Math.cos(droop));
      const side = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az));
      const tilt = (r() - 0.5) * 0.6;
      side.applyAxisAngle(dir, tilt);
      const base = new THREE.Vector3(0, y, 0);
      const corners = [
        base.clone().addScaledVector(side, -w / 2), base.clone().addScaledVector(side, w / 2),
        base.clone().addScaledVector(dir, len).addScaledVector(side, w / 2), base.clone().addScaledVector(dir, len).addScaledVector(side, -w / 2),
      ];
      const b0 = cards.pos.length / 3;
      const tint = 0.8 + r() * 0.35;
      corners.forEach(function (c, i) {
        cards.pos.push(c.x, c.y, c.z);
        // нормаль «шара»: от оси дерева наружу и вверх — объёмный мягкий свет
        const nn = new THREE.Vector3(c.x, (c.y - height * 0.45) * 0.35 + 0.5, c.z).normalize();
        cards.nrm.push(nn.x, nn.y, nn.z);
        cards.uv.push(CARD_UV[i][0], CARD_UV[i][1]);
        const dark = 0.75 + 0.25 * t;
        cards.col.push(tint * dark, tint * dark, tint * dark * 0.95);
      });
      cards.idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
    }
  }
  // верхушка: три вертикальные карточки вокруг побега
  for (let k = 0; k < 3; k++) {
    const az = (k / 3) * Math.PI;
    const dx = Math.cos(az) * 0.45, dz = Math.sin(az) * 0.45;
    const y0 = height - 2.2, y1 = height + 0.25;
    const b0 = cards.pos.length / 3;
    [[-dx, y0, -dz], [dx, y0, dz], [dx * 0.1, y1, dz * 0.1], [-dx * 0.1, y1, -dz * 0.1]].forEach(function (c, i) {
      cards.pos.push(c[0], c[1], c[2]);
      cards.nrm.push(0, 1, 0);
      cards.uv.push(i < 2 ? 0.05 : 0.95, i === 0 || i === 3 ? 0.15 : 0.85);
      cards.col.push(0.95, 0.95, 0.9);
    });
    cards.idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(cards.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(cards.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(cards.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cards.col, 3));
  g.setIndex(cards.idx);
  g.computeBoundingSphere();
  return { cards: g, trunk };
}

// ---------- дальний лес: снимки деревьев ----------
// Каждая ель и берёза снимается сбоку с четырёх сторон в атлас (цвет с прозрачностью и нормаль кроны).
// Деревья дальше ближнего пояса — карточки, повёрнутые к камере вокруг вертикали (к солнцу — в карте тени);
// у каждого экземпляра свой вид из четырёх, свет — по нормали из атласа, как у кроны «шаром».
const BAKE_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vCol; varying vec3 vN;
void main() {
  vUv = uv; vCol = color; vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BAKE_FRAG = /* glsl */ `
uniform sampler2D map; uniform float uMode, uTex, uAlphaTest; uniform vec3 uColor;
varying vec2 vUv; varying vec3 vCol; varying vec3 vN;
void main() {
  vec4 t = uTex > 0.5 ? texture2D(map, vUv) : vec4(1.0);
  if (t.a < uAlphaTest) discard;
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  gl_FragColor = uMode < 0.5 ? vec4(t.rgb * vCol * uColor, 1.0) : vec4(n * 0.5 + 0.5, 1.0);
}`;
const VIEWS = 4, CW = 128, CH = 256;
function bakeImpostors(renderer, items) {
  const W = VIEWS * CW, H = items.length * CH;
  const opts = { type: THREE.UnsignedByteType, depthBuffer: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true };
  const colorRT = new THREE.WebGLRenderTarget(W, H, opts), normalRT = new THREE.WebGLRenderTarget(W, H, opts);
  colorRT.texture.colorSpace = THREE.NoColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const mk = function (map, color, alphaTest) {
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, uMode: { value: 0 }, uTex: { value: map ? 1 : 0 }, uColor: { value: new THREE.Color(color) }, uAlphaTest: { value: alphaTest } },
      vertexShader: BAKE_VERT, fragmentShader: BAKE_FRAG, vertexColors: true, side: THREE.DoubleSide,
    });
  };
  const prevTarget = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  const prevAuto = renderer.autoClear;
  renderer.autoClear = false;
  const sizes = [];
  [[colorRT, 0], [normalRT, 1]].forEach(function (pass) {
    const rt = pass[0];
    renderer.setRenderTarget(rt);
    renderer.setClearColor(pass[1] ? 0x8080ff : 0x000000, 0);
    renderer.clear();
    items.forEach(function (it, row) {
      const mats = [mk(it.map, it.color, it.alphaTest), mk(null, it.trunkColor, 0)];
      mats.forEach(function (m) { m.uniforms.uMode.value = pass[1]; });
      const crown = new THREE.Mesh(it.cards, mats[0]), trunk = new THREE.Mesh(it.trunk, mats[1]);
      scene.add(crown, trunk);
      const box = new THREE.Box3().setFromObject(crown).union(new THREE.Box3().setFromObject(trunk));
      const half = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) * 1.02;
      const top = box.max.y * 1.01;
      sizes[row] = [half * 2, top];
      for (let v = 0; v < VIEWS; v++) {
        const a = (v / VIEWS) * Math.PI * 2;
        cam.left = -half; cam.right = half; cam.top = top; cam.bottom = 0;
        cam.position.set(Math.sin(a) * 40, 0, Math.cos(a) * 40);
        cam.lookAt(0, 0, 0);
        cam.updateProjectionMatrix();
        rt.viewport.set(v * CW, row * CH, CW, CH);
        rt.scissor.set(v * CW, row * CH, CW, CH);
        rt.scissorTest = true;
        renderer.setRenderTarget(rt);
        renderer.clearDepth();
        renderer.render(scene, cam);
      }
      scene.remove(crown, trunk);
      mats.forEach(function (m) { m.dispose(); });
    });
    rt.viewport.set(0, 0, W, H); rt.scissor.set(0, 0, W, H); rt.scissorTest = false;
  });
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  renderer.autoClear = prevAuto;
  return { color: colorRT.texture, normal: normalRT.texture, sizes, rows: items.length };
}

const IMP_VERT_HEAD = /* glsl */ `
attribute vec2 aCell;
attribute vec2 aSize;
uniform vec2 uCellSize;
varying vec3 vImpR;
varying vec3 vImpF;
`;
// карточка: вокруг вертикали к камере (в карте тени камера — у солнца); матрица экземпляра — без поворота
const IMP_VERT = /* glsl */ `
vec3 impO = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
vec3 impF = cameraPosition - impO; impF.y = 0.0;
impF = length(impF) > 1e-3 ? normalize(impF) : vec3(0.0, 0.0, 1.0);
vec3 impR = vec3(impF.z, 0.0, -impF.x);
vImpR = impR; vImpF = impF;
transformed = impR * (position.x * aSize.x) + vec3(0.0, position.y * aSize.y, 0.0);
`;
const IMP_FRAG_HEAD = /* glsl */ `
uniform sampler2D tImpN;
varying vec3 vImpR;
varying vec3 vImpF;
vec3 mbTranslucent(vec3 L, vec3 V, vec3 N) { return vec3(pow(max(dot(-V, L), 0.0), 4.0) * 0.7 * RECIPROCAL_PI); }
`;
const IMP_NORMAL = /* glsl */ `
{
  vec3 tn = texture2D(tImpN, vMapUv).xyz * 2.0 - 1.0;
  vec3 wn = normalize(vImpR * tn.x + vec3(0.0, 1.0, 0.0) * tn.y + vImpF * tn.z);
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
}
`;
function impostorMaterials(atlas, taa) {
  const cell = new THREE.Vector2(1 / VIEWS, 1 / atlas.rows);
  const patchV = function (shader) {
    shader.uniforms.uCellSize = { value: cell };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + IMP_VERT_HEAD)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + IMP_VERT)
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (aCell + uv) * uCellSize;\n#endif');
  };
  const m = new THREE.MeshStandardMaterial({ map: atlas.color, roughness: 0.9, metalness: 0, alphaTest: 0.36, side: THREE.DoubleSide });
  // затенение углов по перекрытым карточкам дало бы чёрный лес — у снимков его нет
  m.defines = { MB_TRANSLUCENT: '', MB_NOAO: '' };
  m.onBeforeCompile = function (shader) {
    patchV(shader);
    shader.uniforms.tImpN = { value: atlas.normal };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + IMP_FRAG_HEAD)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + IMP_NORMAL);
  };
  m.customProgramCacheKey = function () { return 'impostor1'; };
  const d = new THREE.MeshDepthMaterial({ map: atlas.color, alphaTest: 0.45, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  d.onBeforeCompile = patchV;
  d.customProgramCacheKey = function () { return 'impostor1d'; };
  return { m, d };
}

// clear — радиус поляны (м): лес начинается в 14 м за её краем.
export function createForest(terrain, splat, mats, quality, msaa, seed = 11, renderer = null, taa = false, clear = 34) {
  const group = new THREE.Group();
  group.name = 'forest';
  const r = rng(seed);
  const tex = needleTexture();
  const needles = new THREE.MeshStandardMaterial({
    map: tex, alphaTest: 0.42, vertexColors: true, roughness: 0.86, metalness: 0,
    alphaToCoverage: msaa > 0,
  });
  // против солнца хвоя на краях кроны слегка просвечивает
  needles.defines = { MB_TRANSLUCENT: '' };
  needles.onBeforeCompile = function (shader) {
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      vec3 mbTranslucent(vec3 L, vec3 V, vec3 N) { return vec3(pow(max(dot(-V, L), 0.0), 4.0) * 0.8 * RECIPROCAL_PI); }`);
  };
  needles.customProgramCacheKey = function () { return 'needles1'; };
  const depth = new THREE.MeshDepthMaterial({ map: tex, alphaTest: 0.42, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  const variants = [12.5, 14.5, 17, 19.5, 22.5].map(function (h, i) { return spruceGeometry(rng(seed + 10 + i), h); });
  // листва берёз и кустов: против солнца просвечивает сильнее хвои
  const leafTex = leafTexture();
  const leaves = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, vertexColors: true, roughness: 0.72, metalness: 0, alphaToCoverage: msaa > 0 });
  leaves.defines = { MB_TRANSLUCENT: '' };
  leaves.onBeforeCompile = function (shader) {
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      vec3 mbTranslucent(vec3 L, vec3 V, vec3 N) { return vec3((pow(max(dot(-V, L), 0.0), 3.0) * 1.3 + max(-dot(N, L), 0.0) * 0.35) * RECIPROCAL_PI); }`);
  };
  leaves.customProgramCacheKey = function () { return 'leaves1'; };
  const leafDepth = new THREE.MeshDepthMaterial({ map: leafTex, alphaTest: 0.45, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  const birches = [12, 14.5, 17].map(function (h, i) { return birchGeometry(rng(seed + 40 + i), h); });
  const birchLists = birches.map(function () { return []; });
  // ближний пояс (от края поляны + 14 м, 77 м шириной) — настоящие деревья, гуще; дальше — снимки
  const inner = clear + 14;
  const NEAR = renderer ? inner + 77 : Math.max(308, inner + 160);
  const count = Math.round((renderer ? 900 : 720) * quality);
  const lists = variants.map(function () { return []; });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let placed = 0, tries = 0;
  const canopy = [];
  while (placed < count && tries < count * 20) {
    tries++;
    const a = r() * Math.PI * 2;
    const rr = inner + Math.pow(r(), 0.7) * (NEAR - inner);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const cluster = terrain.noise(x / 60, z / 60) * 0.5 + 0.5;
    if (r() > cluster * 1.3 - 0.1) continue;
    const sp = splat.sample(x, z);
    if (sp[0] > 0.2 || sp[1] > 0.2) continue;
    const y = terrain.heightAt(x, z);
    q.setFromAxisAngle(up, r() * Math.PI * 2);
    const sc = 0.65 + r() * 0.6;
    s.set(sc * (0.9 + r() * 0.2), sc, sc * (0.9 + r() * 0.2));
    m.compose(p.set(x, y - 0.1, z), q, s);
    // берёзы — рощами в ближнем поясе леса
    if (rr < inner + 122 && terrain.noise2(x / 45 + 3, z / 45 - 7) > 0.12 && r() < 0.75) {
      const c = new THREE.Color(0.95 + r() * 0.2, 1.0 + r() * 0.15, 0.78 + r() * 0.15);
      birchLists[Math.floor(r() * birches.length)].push([m.clone(), c]);
      canopy.push([x, z, 2.2 * sc]);
      placed++;
      continue;
    }
    // оттенок кроны: от сизой до желтоватой, молодые светлее
    const hue = r();
    const c = new THREE.Color(0.86 + hue * 0.2, 0.9 + r() * 0.16, 0.8 + (1 - hue) * 0.28).multiplyScalar(0.82 + r() * 0.3);
    lists[Math.floor(r() * variants.length)].push([m.clone(), c]);
    canopy.push([x, z, 2.7 * sc]);
    placed++;
  }
  if (splat.addCanopy) splat.addCanopy(canopy);
  variants.forEach(function (v, i) {
    const list = lists[i];
    if (!list.length) return;
    const crowns = new THREE.InstancedMesh(v.cards, needles, list.length);
    const trunks = new THREE.InstancedMesh(v.trunk, mats.bark, list.length);
    list.forEach(function (it, k) { crowns.setMatrixAt(k, it[0]); crowns.setColorAt(k, it[1]); trunks.setMatrixAt(k, it[0]); trunks.setColorAt(k, new THREE.Color(0.34, 0.29, 0.25)); });
    crowns.customDepthMaterial = depth;
    crowns.castShadow = true; crowns.receiveShadow = true;
    trunks.castShadow = true; trunks.receiveShadow = true;
    crowns.userData.noAO = true;
    crowns.computeBoundingSphere(); trunks.computeBoundingSphere();
    group.add(crowns, trunks);
  });
  birches.forEach(function (v, i) {
    const list = birchLists[i];
    if (!list.length) return;
    const crowns = new THREE.InstancedMesh(v.cards, leaves, list.length);
    const trunks = new THREE.InstancedMesh(v.trunk, mats.birch, list.length);
    list.forEach(function (it, k) { crowns.setMatrixAt(k, it[0]); crowns.setColorAt(k, it[1]); trunks.setMatrixAt(k, it[0]); trunks.setColorAt(k, new THREE.Color(0.86, 0.85, 0.83)); });
    crowns.customDepthMaterial = leafDepth;
    crowns.castShadow = true; crowns.receiveShadow = true;
    trunks.castShadow = true; trunks.receiveShadow = true;
    crowns.userData.noAO = true;
    crowns.computeBoundingSphere(); trunks.computeBoundingSphere();
    group.add(crowns, trunks);
  });
  group.add(bushes(terrain, splat, leaves, leafDepth, quality, seed + 60, clear));
  group.add(clearing(terrain, splat, mats, seed + 70, clear));
  if (renderer) group.add(farForest(renderer, terrain, splat, variants, birches, tex, leafTex, quality, seed + 90, NEAR, taa));
  return { group };
}

// Дальний лес: тысячи деревьев-снимков от ближнего пояса до 680 м — густо, с полянами и опушками.
function farForest(renderer, terrain, splat, variants, birches, needleTex, leafTex, quality, seed, near, taa) {
  const items = variants.map(function (v) { return { cards: v.cards, trunk: v.trunk, map: needleTex, color: 0xffffff, trunkColor: 0x3a3029, alphaTest: 0.42 }; })
    .concat(birches.map(function (v) { return { cards: v.cards, trunk: v.trunk, map: leafTex, color: 0xffffff, trunkColor: 0xd8d6d0, alphaTest: 0.45 }; }));
  const atlas = bakeImpostors(renderer, items);
  const M = impostorMaterials(atlas, taa);
  const r = rng(seed);
  const count = Math.round(26000 * quality);
  const cells = [], sizes = [], cols = [], mats4 = [];
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let tries = 0;
  while (cells.length < count && tries < count * 6) {
    tries++;
    const a = r() * Math.PI * 2;
    const rr = near + Math.sqrt(r()) * (680 - near);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    // лес сплошной, кроме полян и болотин (крупный шум) и редкого края у ближнего пояса
    const cluster = terrain.noise(x / 140, z / 140) * 0.5 + 0.5;
    const edge = THREE.MathUtils.smoothstep(rr, near, near + 60);
    if (r() > (cluster * 1.6 - 0.25) * (0.5 + 0.5 * edge)) continue;
    const sp = splat.sample(x, z);
    if (sp[0] > 0.2 || sp[1] > 0.2) continue;
    const y = terrain.heightAt(x, z);
    const birch = rr < 330 && terrain.noise2(x / 60 + 3, z / 60 - 7) > 0.18 && r() < 0.6;
    const row = birch ? variants.length + Math.floor(r() * birches.length) : Math.floor(r() * variants.length);
    const s = 0.65 + r() * 0.6;
    m.compose(p.set(x, y - 0.15, z), q, sc.set(s, s, s));
    mats4.push(m.clone());
    cells.push(Math.floor(r() * VIEWS), row);
    sizes.push(atlas.sizes[row][0], atlas.sizes[row][1]);
    const hue = r();
    cols.push(birch ? new THREE.Color(0.95 + r() * 0.2, 1.0, 0.82) : new THREE.Color(0.86 + hue * 0.2, 0.9 + r() * 0.16, 0.8 + (1 - hue) * 0.28).multiplyScalar(0.8 + r() * 0.3));
  }
  const g = new THREE.PlaneGeometry(1, 1);
  g.translate(0, 0.5, 0);
  const n = mats4.length;
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(cells), 2));
  g.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(sizes), 2));
  const mesh = new THREE.InstancedMesh(g, M.m, n);
  mats4.forEach(function (mm, i) { mesh.setMatrixAt(i, mm); mesh.setColorAt(i, cols[i]); });
  mesh.customDepthMaterial = M.d;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.name = 'far-forest';
  return mesh;
}

// Кусты: по опушке гуще, на лугу — редкими островками; не на площадке и не на дороге.
function bushes(terrain, splat, leaves, leafDepth, quality, seed, clear) {
  const r = rng(seed);
  const geos = [leafCrown(rng(seed + 1), 30, 0.7, 1.0, 0.72, 0.72, new THREE.Vector3()), leafCrown(rng(seed + 2), 22, 0.55, 0.8, 0.6, 0.6, new THREE.Vector3())];
  const lists = [[], []];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const count = Math.round(260 * quality);
  for (let k = 0, n = 0; k < count * 12 && n < count; k++) {
    const a = r() * Math.PI * 2, rr = clear - 12 + Math.pow(r(), 0.8) * 110;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const sp = splat.sample(x, z);
    if (sp[3] < 0.8 || sp[0] + sp[1] > 0.05) continue;
    const md = splat.sampleMeadow(x, z);
    const edge = terrain.noise(x / 60, z / 60) * 0.5 + 0.5;
    if (r() > 0.25 + edge * 0.6 + md[2] * 0.5) continue;
    const sc = 0.6 + r() * 0.9;
    q.setFromAxisAngle(up, r() * Math.PI * 2);
    s.set(sc * (0.9 + r() * 0.3), sc * (0.75 + r() * 0.4), sc * (0.9 + r() * 0.3));
    m.compose(p.set(x, terrain.heightAt(x, z) - 0.05, z), q, s);
    lists[r() < 0.6 ? 0 : 1].push([m.clone(), new THREE.Color(0.9 + r() * 0.2, 0.95 + r() * 0.15, 0.75 + r() * 0.2).multiplyScalar(0.85 + r() * 0.2)]);
    n++;
  }
  const g = new THREE.Group();
  geos.forEach(function (geo, i) {
    if (!lists[i].length) return;
    const mesh = new THREE.InstancedMesh(geo, leaves, lists[i].length);
    lists[i].forEach(function (it, k) { mesh.setMatrixAt(k, it[0]); mesh.setColorAt(k, it[1]); });
    mesh.customDepthMaterial = leafDepth;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.noAO = true;
    mesh.computeBoundingSphere();
    g.add(mesh);
  });
  return g;
}

// Следы вырубки у поляны: пни (кора по бокам, светлый спил сверху) и брёвна на траве.
function clearing(terrain, splat, mats, seed, clear) {
  const r = rng(seed);
  const bark = new Batch(), wood = new Batch();
  const W = new THREE.Color(1, 1, 1), cut = new THREE.Color(0.95, 0.82, 0.62);
  const spot = function (r0, r1) {
    for (let k = 0; k < 60; k++) {
      const a = r() * Math.PI * 2, rr = r0 + r() * (r1 - r0);
      const x = Math.cos(a) * rr + 1.5, z = Math.sin(a) * rr + 1.5;
      const sp = splat.sample(x, z);
      if (sp[0] + sp[1] < 0.05 && sp[3] > 0.7) return [x, z];
    }
    return null;
  };
  for (let i = 0; i < 8; i++) {
    const at = spot(clear - 17, clear - 4);
    if (!at) continue;
    const rad = 0.17 + r() * 0.16, h = 0.28 + r() * 0.25, y = terrain.heightAt(at[0], at[1]) - 0.05;
    const m = new THREE.Matrix4().makeRotationY(r() * 6.3).setPosition(at[0], y, at[1]);
    bark.add(cylinder(rad * 1.12, rad, h, 12, false, TILE.bark), m, W, 0);
    const top = new THREE.CircleGeometry(rad * 0.97, 14).rotateX(-Math.PI / 2);
    wood.add({ pos: top.attributes.position.array, nrm: top.attributes.normal.array, uv: top.attributes.uv.array, index: top.index.array }, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, h - 0.005, 0)), cut, 0);
  }
  for (let i = 0; i < 4; i++) {
    const at = spot(clear - 14, clear);
    if (!at) continue;
    const rad = 0.16 + r() * 0.14, len = 2.5 + r() * 3.5, y = terrain.heightAt(at[0], at[1]) + rad * 0.8;
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, r() * 6.3, Math.PI / 2, 'YXZ')).setPosition(at[0], y, at[1]);
    m.multiply(new THREE.Matrix4().makeTranslation(0, -len / 2, 0));
    bark.add(cylinder(rad, rad * 0.85, len, 12, false, TILE.bark), m, W, 0);
    [0, len].forEach(function (yy, e) {
      const disc = new THREE.CircleGeometry(e ? rad * 0.83 : rad * 0.98, 14).rotateX(e ? -Math.PI / 2 : Math.PI / 2);
      wood.add({ pos: disc.attributes.position.array, nrm: disc.attributes.normal.array, uv: disc.attributes.uv.array, index: disc.index.array }, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, yy, 0)), cut, 0);
    });
  }
  const g = new THREE.Group();
  [[bark, mats.bark], [wood, mats.planks]].forEach(function (b) {
    if (!b[0].vcount) return;
    const mesh = new THREE.Mesh(b[0].geometry(), b[1]);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
  });
  return g;
}

// ---------- валуны ----------

export function createRocks(terrain, splat, mats, seed = 21, clear = 34) {
  const group = new THREE.Group();
  const r = rng(seed);
  const mesh = new THREE.Group();
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const rr = clear - 8 + Math.pow(r(), 0.8) * 110;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const sp = splat.sample(x, z);
    if (sp[1] > 0.3) continue;
    const w = 0.5 + Math.pow(r(), 2) * 2.4;
    const p = stone(w, w * (0.45 + r() * 0.3), w * (0.6 + r() * 0.4), Math.floor(r() * 24), TILE.stone, r(), r());
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(p.nrm, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(p.uv, 2));
    const col = new Float32Array(p.pos.length);
    const k = 0.8 + r() * 0.25;
    for (let j = 0; j < col.length; j += 3) { col[j] = k * 0.95; col[j + 1] = k * 0.95; col[j + 2] = k * 0.92; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(p.index), 1));
    const rock = new THREE.Mesh(g, mats.stone);
    rock.position.set(x, terrain.heightAt(x, z) - w * 0.12, z);
    rock.rotation.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3);
    rock.castShadow = rock.receiveShadow = true;
    mesh.add(rock);
  }
  group.add(mesh);
  return { group };
}
