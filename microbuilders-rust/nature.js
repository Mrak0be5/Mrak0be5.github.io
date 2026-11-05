// Природа вокруг стройки: трава кустиками с ветром (инстансы по секторам, чтобы отсекались вне кадра),
// ели из ветвей-карточек (хвоя рисуется кодом на canvas) и валуны. Трава и хвоя не попадают в затенение углов
// (userData.noAO): у карточек нет объёма, GTAO затемнил бы их прямоугольниками.
import * as THREE from 'three';
import { rng, stone } from './geo.js?v=3ae8fc6';
import { TEXTURE_TILES as TILE } from './textures.js?v=3ae8fc6';

// ---------- трава ----------

function clumpGeometry(r) {
  const pos = [], nrm = [], col = [], tt = [], idx = [];
  const blades = 9;
  for (let b = 0; b < blades; b++) {
    const a = r() * Math.PI * 2, d = r() * 0.09;
    const bx = Math.cos(a) * d, bz = Math.sin(a) * d;
    const h = 0.22 + r() * 0.38;
    const w = 0.012 + r() * 0.01;
    const face = r() * Math.PI * 2;
    const lean = 0.08 + r() * 0.22;
    const lx = Math.cos(a) * lean, lz = Math.sin(a) * lean;
    const dry = r() < 0.18;
    const base = pos.length / 3;
    const fx = Math.cos(face), fz = Math.sin(face);
    for (let s = 0; s <= 4; s++) {
      const t = s / 4;
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
        if (dry) c = [0.21 - 0.12 * root, 0.18 - 0.11 * root, 0.08 - 0.05 * root];
        else c = [0.035 + 0.07 * t, 0.06 + 0.11 * t, 0.015 + 0.025 * t];
        const v = 0.85 + r() * 0.3;
        col.push(c[0] * v, c[1] * v, c[2] * v);
        tt.push(t);
      }
    }
    // тыльная сторона — свои вершины с отражённой нормалью (иначе со спины травинка чёрная)
    const back = pos.length / 3;
    const nb = (pos.length - base * 3) / 3;
    for (let k = 0; k < nb; k++) {
      const q = (base + k) * 3;
      pos.push(pos[q], pos[q + 1], pos[q + 2]);
      nrm.push(-nrm[q], nrm[q + 1], -nrm[q + 2]);
      col.push(col[q] * 0.9, col[q + 1] * 0.9, col[q + 2] * 0.9);
      tt.push(tt[base + k]);
    }
    for (let s = 0; s < 4; s++) {
      const a0 = base + s * 2, b0 = back + s * 2;
      idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
      idx.push(b0, b0 + 2, b0 + 1, b0 + 1, b0 + 2, b0 + 3);
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

export function createGrass(terrain, splat, center, density, seed = 3) {
  const group = new THREE.Group();
  group.name = 'grass';
  if (density <= 0) return { group, update() {} };
  const r = rng(seed);
  const time = { value: 0 };
  const wind = { value: new THREE.Vector2(0.8, 0.45) };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aT;\nuniform float uTime;\nuniform vec2 uWind;')
      .replace('#include <project_vertex>', `
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
  };
  mat.customProgramCacheKey = function () { return 'grass1'; };
  const geos = [clumpGeometry(rng(seed + 1)), clumpGeometry(rng(seed + 2)), clumpGeometry(rng(seed + 3))];
  const sectors = 18, rings = [[7, 22], [22, 45], [45, 85]];
  const target = Math.round(70000 * density);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  rings.forEach(function (ring, ri) {
    const share = [0.42, 0.36, 0.22][ri];
    for (let si = 0; si < sectors; si++) {
      const a0 = (si / sectors) * Math.PI * 2, a1 = ((si + 1) / sectors) * Math.PI * 2;
      const n = Math.round((target * share) / sectors);
      const mats = [[], [], []];
      for (let k = 0; k < n * 2.2 && mats[0].length + mats[1].length + mats[2].length < n; k++) {
        const a = a0 + r() * (a1 - a0);
        const rr = Math.sqrt(ring[0] * ring[0] + r() * (ring[1] * ring[1] - ring[0] * ring[0]));
        const x = center[0] + Math.cos(a) * rr, z = center[1] + Math.sin(a) * rr;
        const sp = splat.sample(x, z);
        if (sp[3] < 0.35 + r() * 0.4) continue;
        const y = terrain.heightAt(x, z);
        q.setFromAxisAngle(up, r() * Math.PI * 2);
        const sc = 0.7 + r() * 0.65;
        s.set(sc, sc * (0.8 + r() * 0.5), sc);
        m.compose(p.set(x, y - 0.02, z), q, s);
        mats[Math.floor(r() * 3)].push(m.clone());
      }
      mats.forEach(function (list, gi) {
        if (!list.length) return;
        const mesh = new THREE.InstancedMesh(geos[gi], mat, list.length);
        list.forEach(function (mm, i) { mesh.setMatrixAt(i, mm); });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        mesh.userData.noAO = true;
        group.add(mesh);
      });
    }
  });
  return { group, update(t) { time.value = t; } };
}

// ---------- ели ----------

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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
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

export function createForest(terrain, splat, mats, quality, msaa, seed = 11) {
  const group = new THREE.Group();
  group.name = 'forest';
  const r = rng(seed);
  const tex = needleTexture();
  const needles = new THREE.MeshStandardMaterial({
    map: tex, alphaTest: 0.42, vertexColors: true, roughness: 0.86, metalness: 0,
    alphaToCoverage: msaa > 0,
  });
  const depth = new THREE.MeshDepthMaterial({ map: tex, alphaTest: 0.42, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  const variants = [14, 17.5, 21].map(function (h, i) { return spruceGeometry(rng(seed + 10 + i), h); });
  const count = Math.round(720 * quality);
  const lists = variants.map(function () { return []; });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 20) {
    tries++;
    const a = r() * Math.PI * 2;
    const rr = 48 + Math.pow(r(), 0.7) * 260;
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
    lists[Math.floor(r() * variants.length)].push(m.clone());
    placed++;
  }
  variants.forEach(function (v, i) {
    const list = lists[i];
    if (!list.length) return;
    const crowns = new THREE.InstancedMesh(v.cards, needles, list.length);
    const trunks = new THREE.InstancedMesh(v.trunk, mats.bark, list.length);
    list.forEach(function (mm, k) { crowns.setMatrixAt(k, mm); trunks.setMatrixAt(k, mm); trunks.setColorAt(k, new THREE.Color(0.34, 0.29, 0.25)); });
    crowns.customDepthMaterial = depth;
    crowns.castShadow = true; crowns.receiveShadow = true;
    trunks.castShadow = true; trunks.receiveShadow = true;
    crowns.userData.noAO = true;
    crowns.computeBoundingSphere(); trunks.computeBoundingSphere();
    group.add(crowns, trunks);
  });
  return { group };
}

// ---------- валуны ----------

export function createRocks(terrain, splat, mats, seed = 21) {
  const group = new THREE.Group();
  const r = rng(seed);
  const mesh = new THREE.Group();
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const rr = 26 + Math.pow(r(), 0.8) * 110;
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
