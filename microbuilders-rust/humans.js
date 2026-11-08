// Рабочие на модели MakeHuman (CC0, rust/assets/workers, сборка — tools/makehuman): тело, лицо, кисти, глаза,
// брови, ресницы, короткие волосы; одежда — оболочки, построенные скриптом Blender из тела. Цвета, кожа, ткань,
// грязь, жилет с лентами — кодом (шейдеры ниже). Анимация — прежняя процедурная (people.js): она вращает
// «ведущий» скелет из 20 костей, кости MakeHuman (53) получают те же повороты в мировом смысле (перенос позы):
// T_mh = W_ведущей × R_покоя_mh, локальный — относительно уже посчитанного родителя. Пальцы (15 на кисть) сгибаются
// к ладони по хвату (grip): кулак — инструмент, щепоть — сигарета, ладонь — опора на стол.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { linkSky } from './world.js?v=f4726a0';

const VARIANTS = ['a', 'b', 'c', 'd'];

// ---------- загрузка ----------
// В офлайн-файле (сборка build_rust.py --offline) модели вшиты в window.MB_ASSETS как data:-ссылки.
function src(path) { return (typeof window !== 'undefined' && window.MB_ASSETS && window.MB_ASSETS[path]) || path; }
export async function loadHumans(lod1) {
  let meta;
  try {
    const res = await fetch(src('assets/workers/meta.json'));
    if (!res.ok) return null;
    meta = await res.json();
  } catch (e) { return null; }
  const loader = new GLTFLoader();
  const out = {};
  await Promise.all(VARIANTS.map(function (v) {
    if (!meta.variants[v]) return null;
    const name = 'assets/workers/worker-' + v + (lod1 ? '-lod1' : '') + '.glb';
    // в офлайн-файле вшиты только полные модели
    const url = typeof window !== 'undefined' && window.MB_ASSETS && !window.MB_ASSETS[name] ? src(name.replace('-lod1', '')) : src(name);
    return loader.loadAsync(url).then(function (g) {
      out[v] = { scene: g.scene, meta: meta.variants[v] };
    }).catch(function () { return null; });
  }));
  if (!Object.keys(out).length) return null;
  return { variants: out, map: meta.bone_map, fingers: meta.fingers };
}

// ---------- материалы ----------
const HUMAN_VERT_HEAD = /* glsl */ `
varying vec3 vRest;
`;
const HUMAN_VERT = /* glsl */ `
vRest = position;
`;
const HUMAN_FRAG_HEAD = /* glsl */ `
varying vec3 vRest;
float hH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float hN(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hH(i), hH(i + vec3(1, 0, 0)), f.x), mix(hH(i + vec3(0, 1, 0)), hH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hH(i + vec3(0, 0, 1)), hH(i + vec3(1, 0, 1)), f.x), mix(hH(i + vec3(0, 1, 1)), hH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// бугорки из шума — нормаль в видовом пространстве
vec3 hBump(vec3 nrm, vec3 p, float freq, float k) {
  float e = 0.35 / freq;
  float n0 = hN(p * freq);
  vec3 g = vec3(hN((p + vec3(e, 0.0, 0.0)) * freq) - n0, hN((p + vec3(0.0, e, 0.0)) * freq) - n0, hN((p + vec3(0.0, 0.0, e)) * freq) - n0);
  return normalize(nrm - (viewMatrix * vec4(g, 0.0)).xyz * k);
}
uniform vec3 uBase, uAlt;
uniform float uRough, uKind, uBeard, uHairCut, uEyeY;
uniform vec3 uEyeL, uEyeR, uIris;
`;
// uKind: 0 кожа, 1 глаза, 2 волосы/брови/ресницы, 3 куртка, 4 брюки, 5 ботинки, 6 перчатки, 7 жилет
const HUMAN_MAP = /* glsl */ `
vec3 hc = uBase;
float hr = uRough;
float hEmit = 0.0;
vec3 q = vRest;
if (uKind < 0.5) {
  // кожа под каской не рисуется (у крупной головы лоб проступал сквозь купол)
  if (q.y > uHairCut) discard;
  // кожа: мелкая пятнистость, румянец на скулах, щетина от подбородка до верхней губы. Высоты черт — от линии
  // глаз (по профилю моделей: кончик носа −4 см, губы −7, подбородок −10…−12 см)
  float fy = q.y - uEyeY;
  float m = hN(q * 180.0) * 0.6 + hN(q * 45.0) * 0.4;
  hc *= 0.92 + 0.14 * m;
  float face = smoothstep(-0.125, -0.1, fy) * smoothstep(0.03, 0.09, q.z);
  float cheek = face * smoothstep(0.075, 0.02, abs(abs(q.x) - 0.045)) * smoothstep(-0.06, -0.035, fy) * (1.0 - smoothstep(-0.015, 0.0, fy));
  hc = mix(hc, hc * vec3(1.08, 0.86, 0.82), cheek * 0.45);
  float jaw = face * (1.0 - smoothstep(-0.06, -0.048, fy)) * smoothstep(-0.12, -0.105, fy);
  float lip = smoothstep(0.012, 0.0, abs(fy + 0.072)) * smoothstep(0.03, 0.0, abs(q.x)) * smoothstep(0.08, 0.1, q.z);
  float stub = jaw * (1.0 - lip) * uBeard * (0.55 + 0.45 * step(0.45, hN(q * 900.0)));
  hc = mix(hc, uAlt, stub * 0.75);
  hc = mix(hc, hc * vec3(0.92, 0.72, 0.7), lip * 0.6);
  hr = mix(hr, 0.38, face * 0.4);
} else if (uKind < 1.5) {
  // глаз: радужка и зрачок там, куда смотрит глазное яблоко (+Z), склера с прожилками
  vec3 c = q.x > 0.0 ? uEyeL : uEyeR;
  vec3 d = normalize(q - c);
  float fz = d.z;
  float iris = smoothstep(0.86, 0.885, fz);
  float pupil = smoothstep(0.962, 0.97, fz);
  vec3 scl = vec3(0.84, 0.8, 0.76) * (0.94 + 0.08 * hN(q * 2000.0));
  float ir = hN(vec3(atan(d.y, d.x) * 8.0, fz * 40.0, 0.0));
  vec3 ic = uIris * (0.7 + 0.6 * ir) * (0.8 + 0.4 * smoothstep(0.885, 0.95, fz));
  hc = mix(scl, ic, iris);
  hc = mix(hc, vec3(0.015), pupil);
  hr = 0.06;
} else if (uKind < 2.5) {
  // волосы под каской не рисуются (иначе прядь торчит сквозь каску)
  if (q.y > uHairCut) discard;
  hc *= 0.85 + 0.3 * hN(q * vec3(900.0, 120.0, 900.0));
} else {
  // ткань: плетение и потёртости; грязь снизу (брюки, ботинки), на коленях и локтях
  float weave = hN(q * 1400.0) * 0.5 + hN(q * 380.0) * 0.5;
  hc *= 0.88 + 0.2 * weave;
  float wear = hN(q * 30.0);
  hc *= 0.9 + 0.18 * wear;
  float low = 1.0 - smoothstep(0.08, 0.6, q.y);
  float knee = smoothstep(0.07, 0.0, abs(q.y - 0.5)) * smoothstep(0.0, 0.06, q.z);
  float mud = clamp(low * 0.8 + knee * 0.6, 0.0, 1.0) * smoothstep(0.35, 0.65, hN(q * 22.0) + 0.25);
  if (uKind > 3.5 && uKind < 6.5) hc = mix(hc, vec3(0.2, 0.16, 0.12), mud * (uKind > 4.5 && uKind < 5.5 ? 0.6 : 0.5));
  if (uKind > 6.5) {
    // жилет: светоотражающие ленты — два пояса и лямки через плечи
    float band = smoothstep(0.026, 0.02, abs(q.y - 1.13)) + smoothstep(0.026, 0.02, abs(q.y - 1.27));
    float strap = smoothstep(0.028, 0.02, abs(abs(q.x) - 0.095)) * smoothstep(1.27, 1.3, q.y);
    float tape = clamp(band + strap, 0.0, 1.0);
    hc = mix(hc, vec3(0.78, 0.8, 0.8), tape);
    hr = mix(hr, 0.32, tape);
    // флуоресцентная краска немного «светится» в рассеянном свете
    hEmit = 0.05 * (1.0 - tape);
  }
}
diffuseColor.rgb = hc;
`;
const HUMAN_NORMAL = /* glsl */ `
if (uKind < 0.5) normal = hBump(normal, vRest, 900.0, 0.05);
else if (uKind > 2.5) normal = hBump(normal, vRest, 700.0, 0.12);
`;

function humanMaterial(kind, base, alt, rough, extra) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0 });
  m.defines = kind === 0 ? { MB_SKIN: '', MB_TRANSLUCENT: '', MB_CLOTH: '' } : kind === 1 ? {} : { MB_CLOTH: '' };
  const u = Object.assign({
    uBase: { value: new THREE.Color(base) }, uAlt: { value: new THREE.Color(alt || base) }, uRough: { value: rough }, uKind: { value: kind },
    uBeard: { value: 0 }, uHairCut: { value: 99 }, uEyeY: { value: 1.674 }, uEyeL: { value: new THREE.Vector3() }, uEyeR: { value: new THREE.Vector3() }, uIris: { value: new THREE.Color(0x4a2e1c) },
  }, extra || {});
  m.userData.u = u;
  m.onBeforeCompile = function (shader) {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + HUMAN_VERT_HEAD)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + HUMAN_VERT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + HUMAN_FRAG_HEAD + (kind === 0 ? 'vec3 mbTranslucent(vec3 L, vec3 V, vec3 N) { return vec3(0.9, 0.35, 0.25) * max(-dot(N, L), 0.0) * 0.12 * RECIPROCAL_PI; }\n' : ''))
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + HUMAN_MAP)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = hr;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + HUMAN_NORMAL)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * hEmit;');
  };
  m.customProgramCacheKey = function () { return 'human1-' + kind; };
  linkSky(m);
  return m;
}

const KIND = { skin: 0, eyes: 1, brows: 2, lashes: 2, hair: 2, jacket: 3, pants: 4, boots: 5, gloves: 6, vest: 7 };

// ---------- рабочий ----------
// look — workerLook (people.js): цвета областей; driver — 20 костей ведущего скелета (имена как в BONES).
export function makeHuman(humans, look, seed, driver, boneNames) {
  const keys = Object.keys(humans.variants);
  // крепкие — b, пожилые — c, иногда женщина — d
  let v = look.build === 1 && humans.variants.b ? 'b' : keys[seed % keys.length];
  if (v === 'b' && look.build !== 1) v = 'a';
  const V = humans.variants[v] || humans.variants[keys[0]];
  const scene = cloneSkinned(V.scene);
  const meta = V.meta;
  const C = look.colors;
  const skin = new THREE.Color(C[0]).lerp(new THREE.Color(0x9c7a68), 0.18).getHex(), hair = C[9];
  const female = v === 'd';
  const mats = {
    skin: humanMaterial(0, skin, new THREE.Color(hair).lerp(new THREE.Color(skin), 0.35).getHex(), 0.52),
    eyes: humanMaterial(1, 0xffffff, 0, 0.06),
    brows: humanMaterial(2, hair, 0, 0.85),
    lashes: humanMaterial(2, 0x120c08, 0, 0.7),
    hair: humanMaterial(2, hair, 0, 0.72),
    jacket: humanMaterial(3, C[1], 0, 0.86),
    pants: humanMaterial(4, C[4], 0, 0.88),
    boots: humanMaterial(5, 0x2a1f17, 0, 0.62),
    gloves: humanMaterial(6, C[6], 0, 0.8),
    vest: humanMaterial(7, C[2], 0, 0.62),
  };
  mats.skin.userData.u.uBeard.value = female ? 0 : (look.face === 0 ? 0.35 : look.face === 1 ? 0.75 : 1.0);
  // под каской волосы и кожа не рисуются: всё выше 10 см от макушки (чуть выше края каски спереди — каска
  // наклонена назад, её край спереди на 10,7 см ниже макушки); иначе пряди и лоб проступают сквозь купол
  mats.hair.userData.u.uHairCut.value = meta.height_head_top - 0.1;
  mats.skin.userData.u.uHairCut.value = meta.height_head_top - 0.1;
  mats.eyes.userData.u.uIris.value.set(look.iris || 0x4a2e1c);
  const meshes = [];
  scene.traverse(function (o) {
    if (!o.isMesh) return;
    const name = o.material && o.material.name;
    const m = mats[name] || mats.jacket;
    if (name === 'eyes') {
      // центры глазных яблок — по вершинам (левый +X, правый −X)
      const p = o.geometry.attributes.position;
      const L = new THREE.Vector3(), R = new THREE.Vector3();
      let nl = 0, nr = 0;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x > 0) { L.x += x; L.y += p.getY(i); L.z += p.getZ(i); nl++; } else { R.x += x; R.y += p.getY(i); R.z += p.getZ(i); nr++; } }
      if (nl) mats.eyes.userData.u.uEyeL.value.copy(L.multiplyScalar(1 / nl)).setZ(L.z - 0.004);
      if (nr) mats.eyes.userData.u.uEyeR.value.copy(R.multiplyScalar(1 / nr)).setZ(R.z - 0.004);
      if (nl && nr) mats.skin.userData.u.uEyeY.value = (L.y + R.y) / 2;
    }
    o.material = m;
    o.castShadow = name !== 'lashes' && name !== 'eyes';
    o.receiveShadow = true;
    o.frustumCulled = false;
    meshes.push(o);
  });
  // кости MakeHuman: покой в пространстве модели, порядок — от корня
  const bones = {};
  scene.traverse(function (o) { if (o.isBone) bones[o.name] = o; });
  scene.updateMatrixWorld(true);
  const order = [];
  const restW = {}, restL = {}, restP = {};
  const inv = new THREE.Matrix4().copy(scene.matrixWorld).invert();
  const tmpM = new THREE.Matrix4();
  (function walk(o) {
    if (o.isBone) {
      order.push(o);
      tmpM.multiplyMatrices(inv, o.matrixWorld);
      restW[o.name] = new THREE.Quaternion().setFromRotationMatrix(tmpM);
      restP[o.name] = new THREE.Vector3().setFromMatrixPosition(tmpM);
      restL[o.name] = o.quaternion.clone();
    }
    o.children.forEach(walk);
  })(scene);
  // Сгиб пальцев: ось каждой фаланги — поперёк пальца и нормали ладони, в осях покоя кости. Нормаль ладони —
  // куда пальцы уже чуть согнуты в покое (иначе — к телу). curl[кость] — { axis, max, finger, side }.
  const curl = {};
  const MAX = { thumb: [0.35, 0.55, 0.5], index: [1.25, 1.45, 0.9], middle: [1.3, 1.5, 0.95], ring: [1.3, 1.5, 0.95], pinky: [1.25, 1.45, 0.9] };
  const F = humans.fingers || {};
  ['l', 'r'].forEach(function (side) {
    const hand = F[side] && bones[side === 'l' ? humans.map.handL : humans.map.handR];
    if (!hand || !restP[hand.name]) return;
    const H = restP[hand.name], n = new THREE.Vector3();
    ['index', 'middle', 'ring'].forEach(function (f) {
      const c = F[side][f];
      if (!c || !restP[c[0]] || !restP[c[2]]) return;
      const d0 = restP[c[1]].clone().sub(restP[c[0]]).normalize(), d1 = restP[c[2]].clone().sub(restP[c[1]]).normalize();
      n.add(d1.sub(d0.clone().multiplyScalar(d1.dot(d0))));
    });
    if (n.lengthSq() < 1e-6 || n.x * Math.sign(H.x) > 0.5 * n.length()) n.set(-Math.sign(H.x), 0, 0);
    n.normalize();
    Object.keys(F[side]).forEach(function (f) {
      const chain = F[side][f];
      chain.forEach(function (name, k) {
        if (!restP[name] || !restW[name]) return;
        const next = chain[k + 1] && restP[chain[k + 1]] ? restP[chain[k + 1]] : null;
        const prev = k > 0 && restP[chain[k - 1]] ? restP[chain[k - 1]] : H;
        const dir = (next ? next.clone().sub(restP[name]) : restP[name].clone().sub(prev)).normalize();
        const axis = dir.clone().cross(n);
        if (axis.lengthSq() < 1e-6) return;
        axis.normalize().applyQuaternion(restW[name].clone().invert());
        curl[name] = { axis, max: (MAX[f] || MAX.index)[k], finger: f, side };
      });
    });
  });
  // хват: amount 0..1 (0,25 — расслабленная кисть), style — fist (кулак), pinch (щепоть: указательный и большой
  // мягче), flat (ладонь), point (указательный прямой)
  const STYLE = {
    fist: { thumb: 1, index: 1, middle: 1, ring: 1, pinky: 1 },
    pinch: { thumb: 0.8, index: 0.55, middle: 0.95, ring: 1, pinky: 1 },
    flat: { thumb: 0.15, index: 0.08, middle: 0.08, ring: 0.1, pinky: 0.12 },
    point: { thumb: 0.7, index: 0.05, middle: 1, ring: 1, pinky: 1 },
  };
  const hold = { l: { amount: 0.25, style: 'fist' }, r: { amount: 0.25, style: 'fist' } };
  const _c = new THREE.Quaternion();
  function grip(l, styleL, r, styleR) {
    hold.l.amount = l; hold.l.style = styleL || 'fist';
    hold.r.amount = r; hold.r.style = styleR || 'fist';
  }
  // соответствие: кость MakeHuman → индекс ведущей
  const map = humans.map, toDriver = {};
  Object.keys(map).forEach(function (k) { const i = boneNames.indexOf(k); if (i >= 0) toDriver[map[k]] = i; });
  const pelvis = bones[map.hips];
  const pelvisRest = pelvis ? pelvis.position.clone() : null;
  // сдвиг таза ведущего скелета — в осях родителя таза MakeHuman (Root повёрнут на −90° по X: Z-вверх Blender),
  // иначе присед и сон уводили тело вперёд вместо вниз
  const pelvisBasis = pelvis && pelvis.parent && restW[pelvis.parent.name] ? restW[pelvis.parent.name].clone().invert() : new THREE.Quaternion();
  const hipsRest = driver[boneNames.indexOf('hips')].position.clone();
  const W = boneNames.map(function () { return new THREE.Quaternion(); });
  const T = {};
  order.forEach(function (b) { T[b.name] = new THREE.Quaternion(); });
  const parentIdx = driver.map(function (b) { return b.parent && b.parent.isBone ? driver.indexOf(b.parent) : -1; });
  const _q = new THREE.Quaternion(), _p = new THREE.Quaternion();
  const spineI = boneNames.indexOf('spine'), hipsI = boneNames.indexOf('hips');
  function retarget() {
    // мировые повороты ведущих костей (в пространстве рабочего)
    for (let i = 0; i < driver.length; i++) {
      const pi = parentIdx[i];
      if (pi < 0) W[i].copy(driver[i].quaternion);
      else W[i].multiplyQuaternions(W[pi], driver[i].quaternion);
    }
    for (let k = 0; k < order.length; k++) {
      const b = order[k];
      const parent = b.parent && b.parent.isBone ? b.parent : null;
      const di = toDriver[b.name];
      const t = T[b.name];
      if (di !== undefined) t.multiplyQuaternions(W[di], restW[b.name]);
      else if (b.name === 'spine_01' && parent) {
        // половина поворота поясницы
        _q.multiplyQuaternions(T[parent.name], restL[b.name]);
        _p.multiplyQuaternions(W[spineI], restW[b.name]);
        t.copy(_q).slerp(_p, 0.5);
      } else if (parent) {
        t.multiplyQuaternions(T[parent.name], restL[b.name]);
        const cu = curl[b.name];
        if (cu) {
          const h = hold[cu.side], st = STYLE[h.style] || STYLE.fist;
          t.multiply(_c.setFromAxisAngle(cu.axis, cu.max * h.amount * st[cu.finger]));
        }
      } else t.copy(restW[b.name]);
      if (parent) b.quaternion.copy(_q.copy(T[parent.name]).invert().multiply(t));
      else b.quaternion.copy(restL[b.name]);
    }
    if (pelvis) pelvis.position.copy(pelvisRest).add(_v.copy(driver[hipsI].position).sub(hipsRest).applyQuaternion(pelvisBasis));
  }
  const _v = new THREE.Vector3();
  // моргание: морф «blink» (если есть) — раз в 3–6 с на 0,15 с
  let blinkT = 2 + (seed % 7) * 0.5, blinkK = 0;
  function blink(dt) {
    blinkT -= dt;
    if (blinkT < 0) { blinkK = 0.16; blinkT = 3 + ((seed * 7 + Math.floor(blinkK * 100)) % 30) / 10; }
    let w = 0;
    if (blinkK > 0) { blinkK -= dt; w = Math.sin(Math.max(0, blinkK) / 0.16 * Math.PI); }
    for (let i = 0; i < meshes.length; i++) {
      const m = meshes[i];
      if (m.morphTargetInfluences && m.morphTargetInfluences.length) m.morphTargetInfluences[0] = w;
    }
  }
  return { scene, meshes, retarget, blink, grip, meta, variant: v, head: meta.height_head_top };
}
