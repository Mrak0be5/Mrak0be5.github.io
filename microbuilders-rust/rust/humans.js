// Рабочие на модели MakeHuman (CC0, rust/assets/workers, сборка — tools/makehuman): тело, лицо, кисти, глаза,
// брови, ресницы, короткие волосы; одежда — оболочки, построенные скриптом Blender из тела. Цвета, кожа, ткань,
// грязь, комбинезон разряда (нагрудник, лямки, ленты, нашивки, наколенники — cw-ranks.js → dress) — кодом
// (шейдеры ниже); на «Телефоне» части — одной сеткой (opts.merge). Анимация — прежняя процедурная (people.js): она вращает
// «ведущий» скелет из 20 костей, кости MakeHuman (53) получают те же повороты в мировом смысле (перенос позы):
// T_mh = W_ведущей × R_покоя_mh, локальный — относительно уже посчитанного родителя. Пальцы (15 на кисть) сгибаются
// к ладони по хвату (grip): кулак — инструмент, щепоть — сигарета, ладонь — опора на стол.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { linkSky } from './world.js?v=9f2863b';

// бригада — мужские модели (как фигурки оригинала); женская (d) в сборке есть, но не грузится
const VARIANTS = ['a', 'b', 'c'];

// ---------- загрузка ----------
// В офлайн-файле (сборка build_rust.py --offline) модели вшиты в window.MB_ASSETS как data:-ссылки; иначе — рядом
// с модулем (у страницы своя база ссылок — корень игры).
function src(path) { return (typeof window !== 'undefined' && window.MB_ASSETS && window.MB_ASSETS[path]) || new URL(path, import.meta.url).href; }
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
      const hips = meta.variants[v].joints && meta.variants[v].joints.hips;
      if (hips) g.scene.traverse(function (o) { if (o.isMesh && o.material && o.material.name === 'pants') drapeCrotch(o.geometry, hips[1]); });
    }).catch(function () { return null; });
  }));
  if (!Object.keys(out).length) return null;
  return { variants: out, map: meta.bone_map, fingers: meta.fingers };
}

// Брюки спецовки у паха: одежда модели MakeHuman облегает тело — в паху рельеф анатомии, брюки как трико, и на солнце
// выпуклость под ремнём светилась жёлтым треугольником. Перед брюк от пояса до шага — как у мешковатого
// комбинезона: середина не выступает над бёдрами (|x| ≈ 0,07) больше чем на 4 мм, впадина между бёдрами под шагом
// закрыта тканью-перемычкой (уходит назад плавно). Нормали затронутых вершин пересчитаны, двойники на швах — общей
// нормалью. Один раз на загруженную модель (сетка общая у клонов, у слитой сетки «Телефона» — тоже).
function drapeCrotch(geo, hy) {
  if (geo.userData.draped) return;
  geo.userData.draped = true;
  const P = geo.attributes.position, N = geo.attributes.normal, I = geo.index;
  if (!P || !N || !I) return;
  // перед бедра у |x| ≈ 0,07 по высоте (ячейки 1 см)
  const y0 = hy - 0.22, ref = new Float32Array(28).fill(-9);
  for (let i = 0; i < P.count; i++) {
    const ax = Math.abs(P.getX(i)), k = Math.round((P.getY(i) - y0) / 0.01);
    if (ax > 0.06 && ax < 0.08 && P.getZ(i) > 0 && k >= 0 && k < ref.length) ref[k] = Math.max(ref[k], P.getZ(i));
  }
  for (let k = 0; k < ref.length; k++) if (ref[k] < -1) ref[k] = k ? ref[k - 1] : 0.1;
  const zRef = function (y) { const f = THREE.MathUtils.clamp((y - y0) / 0.01, 0, ref.length - 1), i = Math.min(ref.length - 2, Math.floor(f)), t = f - i; return ref[i] * (1 - t) + ref[i + 1] * t; };
  const ss = THREE.MathUtils.smoothstep, moved = new Uint8Array(P.count);
  let any = false;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = Math.abs(x);
    if (z < 0.02 || ax > 0.09 || y < hy - 0.2 || y > hy + 0.03) continue;
    const wy = ss(y, hy - 0.2, hy - 0.15) * (1 - ss(y, hy, hy + 0.03)), wx = 1 - ss(ax, 0.06, 0.09);
    const zr = zRef(y);
    let zt = Math.min(z, zr + 0.004);
    if (y < hy - 0.05) zt = Math.max(zt, zr - 0.008 - 0.12 * (hy - 0.05 - y));
    const nz = z + (zt - z) * wy * wx;
    if (Math.abs(nz - z) < 1e-5) continue;
    P.setZ(i, nz);
    moved[i] = 1; any = true;
  }
  if (!any) return;
  // нормали: вершины треугольников, задевших сдвинутые, — заново (площадь граней), двойники по месту — вместе
  const key = function (i) { return Math.round(P.getX(i) * 1e4) + ',' + Math.round(P.getY(i) * 1e4) + ',' + Math.round(P.getZ(i) * 1e4); };
  const touch = new Uint8Array(P.count);
  for (let t = 0; t < I.count; t += 3) {
    const a = I.getX(t), b = I.getX(t + 1), c = I.getX(t + 2);
    if (moved[a] || moved[b] || moved[c]) touch[a] = touch[b] = touch[c] = 1;
  }
  const acc = new Map(), va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let t = 0; t < I.count; t += 3) {
    const a = I.getX(t), b = I.getX(t + 1), c = I.getX(t + 2);
    if (!touch[a] && !touch[b] && !touch[c]) continue;
    va.fromBufferAttribute(P, a); vb.fromBufferAttribute(P, b); vc.fromBufferAttribute(P, c);
    e1.subVectors(vb, va); e2.subVectors(vc, va); e1.cross(e2);
    [a, b, c].forEach(function (i) { if (!touch[i]) return; const k = key(i); const n = acc.get(k) || acc.set(k, new THREE.Vector3()).get(k); n.add(e1); });
  }
  for (let i = 0; i < P.count; i++) {
    if (!touch[i]) continue;
    const n = acc.get(key(i));
    if (!n || n.lengthSq() < 1e-12) continue;
    va.copy(n).normalize();
    // на краю зоны — вперемешку с прежней нормалью (граница без ступеньки)
    if (!moved[i]) va.lerp(e2.fromBufferAttribute(N, i), 0.5).normalize();
    N.setXYZ(i, va.x, va.y, va.z);
  }
  P.needsUpdate = true; N.needsUpdate = true;
  geo.computeBoundingSphere();
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
uniform float uRough, uKind, uBeard, uHairCut, uHairTilt, uHelmet, uMous, uEyeY;
uniform vec3 uEyeL, uEyeR, uIris;
// разряд (cw-ranks.js): ленты, наколенники, нашивки; суставы левой руки и ноги в покое (правые — зеркально)
uniform float uTape, uKnee, uBadge, uStar, uNeckY, uTuck;
uniform vec3 uTrim, uShirt, uDark, uBadgeCol, uStarCol, uStarCol2, uSh, uEl, uKn, uAn;
// доля вдоль отрезка a→b и расстояние до его оси
vec2 hSeg(vec3 p, vec3 a, vec3 b) { vec3 ab = b - a; float t = dot(p - a, ab) / dot(ab, ab); return vec2(t, length(p - a - ab * clamp(t, 0.0, 1.0))); }
// поясок ширины 2w вокруг c, края мягкие
float hBand(float t, float c, float w) { return 1.0 - smoothstep(w * 0.75, w, abs(t - c)); }
// пятиконечная звезда (расстояние со знаком, iq): радиус r, глубина лучей rf
float hStar(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-0.809016994375, -0.587785252292);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
`;
// uKind: 0 кожа, 1 глаза, 2 волосы/брови/ресницы, 3 куртка, 4 брюки, 5 ботинки, 6 перчатки, 7 жилет
const HUMAN_MAP = /* glsl */ `
vec3 hc = uBase;
float hr = uRough;
float hEmit = 0.0;
vec3 q = vRest;
// срез под каской — по плоскости её края (каска наклонена назад: спереди выше, сзади ниже); без каски (сон) — нет
float hCut = uHelmet > 0.5 ? uHairCut + q.z * uHairTilt : 99.0;
#ifdef MB_MERGED
// «Телефон», слитая сетка: каска (вид 8, цвет разряда, на голове — пока не снята) и ремень (вид 9, цвет вершин)
if (uShowPart < 0.5) discard;
if (uKind > 7.5) {
  if (uKind < 8.5) {
    float dirt = (1.0 - smoothstep(0.0, 0.05, vGear.y)) * smoothstep(0.35, 0.7, hN(vGear * 55.0));
    hc = mix(uBase * (0.94 + 0.1 * hN(vGear * 300.0)), vec3(0.24, 0.2, 0.15), dirt * 0.4);
    hr = 0.32 + 0.4 * dirt;
  } else { hc = vTint; hr = 0.6; }
} else
#endif
if (uKind < 0.5) {
  // кожа под каской не рисуется (у крупной головы лоб проступал сквозь купол)
  if (q.y > hCut) discard;
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
  // усы (лицо оригинала 'moustache'): по верхней губе, к уголкам рта ниже и тоньше, ямка под носом, волоски вниз
  float mx = abs(q.x), mTop = -0.05 - 0.25 * mx, mBot = -0.066 - 0.2 * mx;
  float mBand = smoothstep(mBot - 0.003, mBot + 0.002, fy) * (1.0 - smoothstep(mTop - 0.003, mTop + 0.002, fy));
  mBand *= 1.0 - 0.4 * (1.0 - smoothstep(0.0, 0.006, mx)) * (1.0 - smoothstep(mTop - 0.009, mTop - 0.002, fy));
  float mous = uMous * face * (1.0 - smoothstep(0.018, 0.034, mx)) * mBand * smoothstep(0.085, 0.1, q.z)
    * (0.55 + 0.45 * smoothstep(0.3, 0.7, hN(q * vec3(2600.0, 320.0, 2600.0))));
  hc = mix(hc, uAlt * 0.7, mous * 0.9);
  hr = mix(hr, 0.8, mous);
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
  // волосы (вид 2; брови и ресницы — 2,25: их не режем) под каской не рисуются (иначе прядь торчит сквозь каску);
  // перед ухом (ухо — z 0,01…0,04) остаются только бакенбарды: виски от глаза до уха под полями, в тени каски,
  // читались чёрной повязкой поперёк лица
  if (uKind < 2.1 && (q.y > hCut || (uHelmet > 0.5 && q.z > 0.052 && q.y > uEyeY - 0.05))) discard;
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
  // грязь: на брюках — светлая пыль, на ботинках — тёмная налипшая (иначе тёмная кожа ботинок светлеет до войлока)
  if (uKind > 3.5 && uKind < 6.5) hc = mix(hc, uKind > 4.5 && uKind < 5.5 ? vec3(0.07, 0.055, 0.04) : vec3(0.2, 0.16, 0.12), mud * 0.5);
  vec3 pa = vec3(abs(q.x), q.y, q.z);
  // светоотражающая лента (разряд 2+): серебристая, на свету горит (световозвращение)
  vec3 trim = uTrim * (0.92 + 0.1 * hN(q * 600.0));
  if (uKind < 3.5) {
    // подол куртки заправлен под ремень: ниже ремня он торчал из-под пряжки светлыми зубцами поверх брюк; рукава
    // (в покое кисти у бёдер, |x| > 0,3) не режем: под одеждой тела нет, срез у запястья был бы дырой насквозь
    if (q.y < uTuck && pa.x < 0.26) discard;
    // куртка комбинезона: лента на рукаве выше локтя, ворот рубашки своего цвета у шеи
    vec2 s = hSeg(pa, uSh, uEl);
    float arm = step(-0.05, s.x) * step(s.x, 1.05) * step(s.y, 0.12);
    float tape = uTape * arm * hBand(s.x, 0.6, 0.085);
    // ворот — узкой каймой у самой шеи (шире — пятно цвета рубашки ложилось на спину)
    float collar = smoothstep(uNeckY - 0.024, uNeckY - 0.014, q.y) * (1.0 - smoothstep(0.062, 0.07, length(q.xz - vec2(0.0, -0.005)))) * (1.0 - arm);
    hc = mix(hc, uShirt * (0.88 + 0.2 * weave), collar);
    hc = mix(hc, trim, tape);
    hr = mix(hr, 0.3, tape);
    hEmit = 0.06 * tape;
  } else if (uKind < 4.5) {
    // штанины: лента ниже колена, наколенники (разряд 4+) — резина
    vec2 s = hSeg(pa, uKn, uAn);
    float leg = step(-0.05, s.x) * step(s.x, 1.05) * step(s.y, 0.13);
    float tape = uTape * leg * hBand(s.x, 0.42, 0.075);
    vec3 kd = (pa - uKn - vec3(0.0, 0.012, 0.05)) / vec3(0.07, 0.085, 0.06);
    float pad = uKnee * (1.0 - smoothstep(0.85, 1.0, length(kd))) * step(uKn.z, q.z);
    hc = mix(hc, trim, tape);
    hr = mix(hr, 0.3, tape);
    hEmit = 0.06 * tape;
    hc = mix(hc, vec3(0.13, 0.14, 0.15) * (0.9 + 0.2 * hN(q * 300.0)), pad);
    hr = mix(hr, 0.55, pad);
  } else if (uKind > 6.5) {
    // Комбинезон оригинала поверх куртки: нагрудник с карманом и лямки через плечи (темнее), пуговицы на лямках,
    // нашивка цвета рубашки справа на нагруднике. Разряд 2+: светоотражающий пояс вокруг груди и ленты по лямкам на
    // спине; 4+: круглая нашивка со звездой на спине; 6+: звезда на кармане нагрудника. Нижний край оболочки — зубцами
    // у тазового сустава, под ремнём: светлее брюк, он торчал из-под пряжки треугольниками — заправлен под ремень.
    if (q.y < uTuck) discard;
    float front = smoothstep(0.0, 0.02, q.z);
    float topY = uNeckY - 0.2;
    float bib = front * (1.0 - smoothstep(0.105, 0.115, pa.x)) * (1.0 - smoothstep(topY - 0.004, topY + 0.004, q.y));
    float strapF = front * (1.0 - smoothstep(0.017, 0.022, abs(pa.x - 0.085))) * smoothstep(topY - 0.01, topY, q.y);
    float strapB = (1.0 - front) * (1.0 - smoothstep(0.017, 0.022, abs(pa.x - 0.07)));
    float back = (1.0 - front) * (1.0 - smoothstep(uNeckY - 0.43, uNeckY - 0.41, q.y));
    float panel = clamp(bib + strapF + strapB + back, 0.0, 1.0);
    hc = mix(hc, uDark * (0.88 + 0.2 * weave) * (0.9 + 0.18 * wear), panel);
    // карман на нагруднике: темнее, клапан строчкой
    vec2 pk = vec2(q.x, q.y - (topY - 0.075));
    float pocket = front * (1.0 - smoothstep(0.042, 0.046, abs(pk.x))) * (1.0 - smoothstep(0.034, 0.038, abs(pk.y)));
    float flap = pocket * (1.0 - smoothstep(0.002, 0.004, abs(pk.y - 0.018)));
    hc *= 1.0 - 0.12 * pocket - 0.25 * flap;
    // пуговицы лямок
    float btn = front * (1.0 - smoothstep(0.009, 0.012, length(vec2(pa.x - 0.085, q.y - topY - 0.006))));
    hc = mix(hc, vec3(0.62, 0.6, 0.55), btn);
    hr = mix(hr, 0.28, btn);
    // нашивка цвета рубашки
    vec2 pp = vec2(q.x + 0.068, q.y - (topY - 0.032));
    float patchK = front * (1.0 - smoothstep(0.018, 0.021, max(abs(pp.x), abs(pp.y))));
    hc = mix(hc, uShirt * (0.9 + 0.15 * weave), patchK);
    // ленты: пояс по груди, по лямкам на спине
    float band = hBand(q.y, uNeckY - 0.36, 0.022);
    float stripB = (1.0 - front) * hBand(pa.x, 0.07, 0.012) * smoothstep(uNeckY - 0.43, uNeckY - 0.41, q.y);
    float tape = uTape * clamp(band + stripB, 0.0, 1.0);
    hc = mix(hc, trim, tape);
    hr = mix(hr, 0.3, tape);
    hEmit = 0.06 * tape;
    vec2 bp = vec2(q.x, q.y - (uNeckY - 0.21));
    float disc = uBadge * (1.0 - smoothstep(0.038, 0.042, length(bp))) * (1.0 - front);
    float star = disc * (1.0 - smoothstep(-0.002, 0.002, hStar(bp, 0.026, 0.45)));
    hc = mix(hc, uBadgeCol, disc);
    hc = mix(hc, uStarCol, star);
    hr = mix(hr, 0.35, star);
    float fs = uStar * front * (1.0 - smoothstep(-0.002, 0.002, hStar(pk + vec2(0.0, 0.004), 0.024, 0.45)));
    hc = mix(hc, uStarCol2, fs);
    hr = mix(hr, 0.25, fs);
    // плечи и пройма выше нагрудника: оболочка комбинезона там не нужна (под ней — та же куртка), а её край
    // привязан к груди и не идёт за плечом — при поднятой руке торчал над плечом тонкой дугой
    if (pa.x > 0.112 && q.y > topY + 0.01 && strapF + strapB + tape + disc < 0.2) discard;
  }
}
diffuseColor.rgb = hc;
`;
const HUMAN_NORMAL = /* glsl */ `
if (uKind < 0.5) normal = hBump(normal, vRest, 900.0, 0.05);
else if (uKind > 2.5 && uKind < 7.5) normal = hBump(normal, vRest, 700.0, 0.12);
`;

function humanMaterial(kind, base, alt, rough, extra) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0 });
  m.defines = kind === 0 ? { MB_SKIN: '', MB_TRANSLUCENT: '', MB_CLOTH: '' } : kind === 1 ? {} : { MB_CLOTH: '' };
  const u = Object.assign({
    uBase: { value: new THREE.Color(base) }, uAlt: { value: new THREE.Color(alt || base) }, uRough: { value: rough }, uKind: { value: kind },
    uBeard: { value: 0 }, uHairCut: { value: 99 }, uHairTilt: { value: 0 }, uHelmet: { value: 1 }, uMous: { value: 0 }, uEyeY: { value: 1.674 }, uEyeL: { value: new THREE.Vector3() }, uEyeR: { value: new THREE.Vector3() }, uIris: { value: new THREE.Color(0x4a2e1c) },
  }, RANK_DEFAULT, extra || {});
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

// Одна сетка на рабочего («Телефон»): части модели — одной геометрией с номером части в вершине (aPart), цвета,
// шероховатость и вид части — массивами униформ (общие объекты цвета с материалами частей: dress красит их же).
// Без просвечивания кожи (MB_SKIN, MB_TRANSLUCENT) — на телефоне его нет и в остальном кадре.
function mergedMaterial(parts, mats, rankU) {
  const n = parts.length;
  const sk = mats.skin.userData.u, ey = mats.eyes.userData.u;
  const u = Object.assign({}, RANK_DEFAULT, rankU, {
    uBases: { value: parts.map(function (p) { return p.m.userData.u.uBase.value; }) },
    uRoughs: { value: parts.map(function (p) { return p.m.userData.u.uRough.value; }) },
    uKinds: { value: parts.map(function (p) { return p.m.userData.u.uKind.value; }) },
    uShows: { value: parts.map(function (p) { return p.show === undefined ? 1 : p.show; }) },
    uAlt: sk.uAlt, uBeard: sk.uBeard, uHairCut: sk.uHairCut, uHairTilt: sk.uHairTilt, uHelmet: sk.uHelmet, uMous: sk.uMous, uEyeY: sk.uEyeY, uEyeL: ey.uEyeL, uEyeR: ey.uEyeR, uIris: ey.uIris,
  });
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });
  m.defines = { MB_CLOTH: '', MB_MERGED: '' };
  m.userData.u = u;
  const head = HUMAN_FRAG_HEAD
    .replace('uniform vec3 uBase, uAlt;', 'uniform vec3 uBases[' + n + '], uAlt;')
    .replace('uniform float uRough, uKind, uBeard,', 'uniform float uRoughs[' + n + '], uKinds[' + n + '], uShows[' + n + '], uBeard,')
    + 'varying float vPart;\nvarying vec3 vTint, vGear;\n#define uBase uBases[int(vPart + 0.5)]\n#define uRough uRoughs[int(vPart + 0.5)]\n#define uKind uKinds[int(vPart + 0.5)]\n#define uShowPart uShows[int(vPart + 0.5)]\n';
  m.onBeforeCompile = function (shader) {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + HUMAN_VERT_HEAD + 'attribute float aPart;\nattribute vec3 aTint, aGear;\nvarying float vPart;\nvarying vec3 vTint, vGear;\n')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + HUMAN_VERT + 'vPart = aPart;\nvTint = aTint;\nvGear = aGear;\n');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + head)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + HUMAN_MAP)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = hr;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + HUMAN_NORMAL)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * hEmit;');
  };
  m.customProgramCacheKey = function () { return 'human-merged2-' + n; };
  linkSky(m);
  return m;
}
// Части одной геометрией: положение, нормаль, кости и веса, номер части; морф моргания (у частей без него — нули).
// extras — снаряжение «Телефона» в той же сетке: { geo, part, bone } — сетка в осях модели в покое (bone — номер
// кости скелета, вес 1; без него — свои кости и веса сетки), цвет вершин — в aTint, оси самой сетки — в aGear.
function mergedGeometry(list, extras) {
  const items = list.map(function (o, k) { return { geo: o.geometry, part: k }; }).concat(extras || []);
  let nv = 0, ni = 0;
  items.forEach(function (it) { const g = it.geo; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), part = new Float32Array(nv);
  const tint = new Float32Array(nv * 3).fill(1), gear = new Float32Array(nv * 3);
  const morph = list.some(function (o) { return o.geometry.morphAttributes.position && o.geometry.morphAttributes.position.length; }) ? new Float32Array(nv * 3) : null;
  const index = new Uint32Array(ni);
  let vo = 0, io = 0, relative = true;
  list.forEach(function (o) { const M = o.geometry.morphAttributes.position && o.geometry.morphAttributes.position[0]; if (M) relative = o.geometry.morphTargetsRelative; });
  items.forEach(function (it) {
    const g = it.geo, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    const C = it.part >= list.length ? g.attributes.color : null, Gp = g.attributes.aRest;
    const M = g.morphAttributes.position && g.morphAttributes.position[0];
    for (let i = 0; i < P.count; i++) {
      const v = vo + i;
      pos[v * 3] = P.getX(i); pos[v * 3 + 1] = P.getY(i); pos[v * 3 + 2] = P.getZ(i);
      nrm[v * 3] = N.getX(i); nrm[v * 3 + 1] = N.getY(i); nrm[v * 3 + 2] = N.getZ(i);
      if (it.bone !== undefined) { si[v * 4] = it.bone; sw[v * 4] = 1; }
      else {
        si[v * 4] = SI.getX(i); si[v * 4 + 1] = SI.getY(i); si[v * 4 + 2] = SI.getZ(i); si[v * 4 + 3] = SI.getW(i);
        sw[v * 4] = SW.getX(i); sw[v * 4 + 1] = SW.getY(i); sw[v * 4 + 2] = SW.getZ(i); sw[v * 4 + 3] = SW.getW(i);
      }
      part[v] = it.part;
      if (C) { tint[v * 3] = C.getX(i); tint[v * 3 + 1] = C.getY(i); tint[v * 3 + 2] = C.getZ(i); }
      if (Gp) { gear[v * 3] = Gp.getX(i); gear[v * 3 + 1] = Gp.getY(i); gear[v * 3 + 2] = Gp.getZ(i); }
      if (morph && M) { morph[v * 3] = M.getX(i); morph[v * 3 + 1] = M.getY(i); morph[v * 3 + 2] = M.getZ(i); }
      else if (morph && !relative) { morph[v * 3] = pos[v * 3]; morph[v * 3 + 1] = pos[v * 3 + 1]; morph[v * 3 + 2] = pos[v * 3 + 2]; }
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) index[io + i] = g.index.getX(i) + vo;
    else for (let i = 0; i < P.count; i++) index[io + i] = vo + i;
    io += g.index ? g.index.count : P.count;
    vo += P.count;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  geo.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
  geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
  geo.setAttribute('aGear', new THREE.BufferAttribute(gear, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  if (morph) { geo.morphAttributes.position = [new THREE.BufferAttribute(morph, 3)]; geo.morphTargetsRelative = relative; }
  geo.computeBoundingSphere();
  return geo;
}

const KIND = { skin: 0, eyes: 1, brows: 2, lashes: 2, hair: 2, jacket: 3, pants: 4, boots: 5, gloves: 6, vest: 7 };
// общее у всех рабочих одной модели (ключ — загруженная модель): слитая сетка «Телефона», снаряжение на коже и сетка
// поиска ближайших вершин одежды
const MERGED = new WeakMap(), MERGED_GEAR = new WeakMap(), SKIN_GEAR = new WeakMap(), SKIN_GRID = new WeakMap();
const NO_SKIN = new THREE.BufferGeometry();

// Вершины одежды модели в ячейках 3 см: положение, кости и веса — для весов снаряжения на коже.
function clothGrid(V, parts, names) {
  let grid = SKIN_GRID.get(V);
  if (grid) return grid;
  const C = 0.03, cells = new Map(), pts = [];
  names.forEach(function (name) {
    const g = parts[name];
    if (!g || !g.attributes.skinIndex) return;
    const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    for (let i = 0; i < P.count; i++) {
      const k = pts.length;
      pts.push({ x: P.getX(i), y: P.getY(i), z: P.getZ(i), j: [SI.getX(i), SI.getY(i), SI.getZ(i), SI.getW(i)], w: [SW.getX(i), SW.getY(i), SW.getZ(i), SW.getW(i)] });
      const key = Math.floor(pts[k].x / C) + ',' + Math.floor(pts[k].y / C) + ',' + Math.floor(pts[k].z / C);
      (cells.get(key) || cells.set(key, []).get(key)).push(k);
    }
  });
  grid = { C, cells, pts };
  SKIN_GRID.set(V, grid);
  return grid;
}
// Кости и веса в точке: три ближайшие вершины одежды, вклад — обратно расстоянию; out — 4 кости и 4 веса.
const _acc = new Map();
function skinAt(grid, x, y, z, j, w) {
  const C = grid.C, cx = Math.floor(x / C), cy = Math.floor(y / C), cz = Math.floor(z / C);
  const best = [];
  for (let r = 1; r <= 5 && best.length < 3; r++) {
    best.length = 0;
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) {
      const list = grid.cells.get((cx + a) + ',' + (cy + b) + ',' + (cz + c));
      if (!list) continue;
      for (let k = 0; k < list.length; k++) {
        const p = grid.pts[list[k]], d = Math.hypot(p.x - x, p.y - y, p.z - z);
        if (best.length < 3) { best.push({ p, d }); best.sort(function (u, v) { return u.d - v.d; }); }
        else if (d < best[2].d) { best[2] = { p, d }; best.sort(function (u, v) { return u.d - v.d; }); }
      }
    }
  }
  _acc.clear();
  best.forEach(function (e) {
    const f = 1 / (e.d + 0.004);
    for (let k = 0; k < 4; k++) if (e.p.w[k] > 0) _acc.set(e.p.j[k], (_acc.get(e.p.j[k]) || 0) + e.p.w[k] * f);
  });
  const top = Array.from(_acc.entries()).sort(function (u, v) { return v[1] - u[1]; }).slice(0, 4);
  const sum = top.reduce(function (s, e) { return s + e[1]; }, 0) || 1;
  for (let k = 0; k < 4; k++) { j[k] = top[k] ? top[k][0] : 0; w[k] = top[k] ? top[k][1] / sum : 0; }
}
// униформы разряда у материалов без ткани разряда (кожа, глаза, волосы) — общие заглушки
const RANK_DEFAULT = rankUniforms();
function rankUniforms() {
  return {
    uTape: { value: 0 }, uKnee: { value: 0 }, uBadge: { value: 0 }, uStar: { value: 0 }, uNeckY: { value: 1.54 }, uTuck: { value: 0 },
    uTrim: { value: new THREE.Color(0xeef3f8) }, uShirt: { value: new THREE.Color(0x2f6fed) }, uDark: { value: new THREE.Color(0x6f6a54) }, uBadgeCol: { value: new THREE.Color() }, uStarCol: { value: new THREE.Color() },
    uStarCol2: { value: new THREE.Color() }, uSh: { value: new THREE.Vector3(0.186, 1.435, -0.005) }, uEl: { value: new THREE.Vector3(0.368, 1.2, -0.005) },
    uKn: { value: new THREE.Vector3(0.123, 0.52, 0.005) }, uAn: { value: new THREE.Vector3(0.13, 0.098, -0.012) },
  };
}

// ---------- рабочий ----------
// look — workerLook (people.js): цвета областей; driver — 20 костей ведущего скелета (имена как в BONES).
// opts.merge — одна сетка на рабочего (телефон).
export function makeHuman(humans, look, seed, driver, boneNames, opts) {
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
  // ткань разряда (куртка, брюки, нагрудник): одни униформы на три материала; суставы — этой модели
  const rankU = rankUniforms();
  const J = meta.joints || {};
  if (J.upperArmL) rankU.uSh.value.fromArray(J.upperArmL);
  if (J.foreArmL) rankU.uEl.value.fromArray(J.foreArmL);
  if (J.shinL) rankU.uKn.value.fromArray(J.shinL);
  if (J.footL) rankU.uAn.value.fromArray(J.footL);
  if (J.neck) rankU.uNeckY.value = J.neck[1];
  // ремень — на 4,5 см выше тазового сустава, лента 4,2 см (people.js → beltY): подол куртки кончается под ним
  if (J.hips) rankU.uTuck.value = J.hips[1] + 0.03;
  const mats = {
    skin: humanMaterial(0, skin, new THREE.Color(hair).lerp(new THREE.Color(skin), 0.35).getHex(), 0.52),
    eyes: humanMaterial(1, 0xffffff, 0, 0.06),
    brows: humanMaterial(2.25, hair, 0, 0.85),
    lashes: humanMaterial(2.25, 0x120c08, 0, 0.7),
    hair: humanMaterial(2, hair, 0, 0.72),
    jacket: humanMaterial(3, C[1], 0, 0.86, rankU),
    pants: humanMaterial(4, C[4], 0, 0.88, rankU),
    boots: humanMaterial(5, 0x2a1f17, 0, 0.62),
    gloves: humanMaterial(6, C[6], 0, 0.8),
    vest: humanMaterial(7, C[2], 0, 0.7, rankU),
  };
  // лицо оригинала: 0 гладкое (лёгкая щетина), 1 щетина, 2 борода, 3 усы (и лёгкая щетина)
  mats.skin.userData.u.uBeard.value = female ? 0 : (look.face === 0 ? 0.35 : look.face === 1 ? 0.75 : look.face === 3 ? 0.4 : 1.0);
  mats.skin.userData.u.uMous.value = !female && look.face === 3 ? 1 : 0;
  // под каской волосы и кожа не рисуются: выше плоскости края каски (её ставит people.js → helmetCut, по
  // посадке каски); иначе пряди и лоб проступают сквозь купол. Срез у кожи и волос общий; uHelmet 0 — каска снята.
  const cut = { uHairCut: { value: meta.height_head_top - 0.1 }, uHairTilt: { value: 0 }, uHelmet: { value: 1 } };
  Object.assign(mats.skin.userData.u, cut);
  Object.assign(mats.hair.userData.u, cut);
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
    o.userData.part = name;
    o.castShadow = name !== 'lashes' && name !== 'eyes';
    o.receiveShadow = true;
    o.frustumCulled = false;
    meshes.push(o);
  });
  // части для обмеров (пояс, рация — people.js): имя → геометрия покоя
  const parts = {};
  meshes.forEach(function (o) { parts[o.userData.part] = o.geometry; });
  // все скелеты клона (освободить их фактуры костей — dispose)
  const skeletons = new Set();
  meshes.forEach(function (o) { if (o.skeleton) skeletons.add(o.skeleton); });
  let merged = null;
  // части одного скина: те же кости (у клонов SkeletonUtils у каждой части свой объект скелета)
  const sameSkin = meshes.length > 1 && meshes.every(function (o) {
    return o.isSkinnedMesh && o.skeleton.bones.length === meshes[0].skeleton.bones.length && o.skeleton.bones.every(function (b, i) { return b === meshes[0].skeleton.bones[i]; });
  });
  // Части — один скин модели (обратные матрицы те же): один скелет на рабочего вместо десяти — одна фактура костей
  // и один пересчёт матриц за кадр, а не по каждой части.
  if (sameSkin) {
    const first = meshes[0], inv0 = first.skeleton.boneInverses;
    const same = function (sk) { return sk.boneInverses.every(function (m, i) { const a = m.elements, b = inv0[i].elements; for (let k = 0; k < 16; k++) if (Math.abs(a[k] - b[k]) > 1e-5) return false; return true; }); };
    meshes.forEach(function (o) { if (o !== first && o.skeleton !== first.skeleton && same(o.skeleton)) o.bind(first.skeleton, o.bindMatrix); });
  }
  // «Телефон»: каска (цвет разряда) и три ремня (простой, с подсумком, золотой) — части той же слитой сетки
  // (mergeGear), видна та, что у разряда (gearShow): каска и ремень без своих вызовов отрисовки
  const helmetColor = new THREE.Color(look.helmet || 0xf2c41a);
  const pseudo = function (kind, color) { return { userData: { u: { uBase: { value: color || new THREE.Color(1, 1, 1) }, uRough: { value: 0.6 }, uKind: { value: kind } } } }; };
  const GEAR_PARTS = [pseudo(8, helmetColor), pseudo(9), pseudo(9), pseudo(9)];
  let partMeshes = null;
  if (opts && opts.merge && sameSkin) {
    const first = meshes[0];
    partMeshes = meshes.slice();
    // слитая сетка — общая у всех рабочих этой модели (одна на модель, не на рабочего)
    let mg = MERGED.get(V);
    if (!mg) { mg = mergedGeometry(meshes); MERGED.set(V, mg); }
    merged = new THREE.SkinnedMesh(mg, mergedMaterial(meshes.map(function (o) { return { m: o.material }; }).concat(GEAR_PARTS.map(function (m) { return { m: m, show: 0 }; })), mats, rankU));
    merged.name = 'worker-merged';
    first.parent.add(merged);
    merged.position.copy(first.position); merged.quaternion.copy(first.quaternion); merged.scale.copy(first.scale);
    merged.bind(first.skeleton, first.bindMatrix);
    merged.bindMode = first.bindMode;
    merged.castShadow = true; merged.receiveShadow = true; merged.frustumCulled = false;
    merged.userData.part = 'merged';
    merged.userData.partNames = meshes.map(function (o) { return o.userData.part; });
    meshes.forEach(function (o) { o.removeFromParent(); });
    meshes.length = 0;
    meshes.push(merged);
  }
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
  // Одежда разряда (cw-ranks.js → outfitOf): комбинезон цвета разряда (нагрудник темнее), перчатки, ленты с 2-го,
  // наколенники и нашивка на спине с 4-го, звезда на нагруднике с 6-го; ворот и нашивка — цвет рубашки рабочего.
  function dress(o, shirt) {
    mats.jacket.userData.u.uBase.value.setHex(o.suit);
    mats.pants.userData.u.uBase.value.setHex(shade(o.suit, 0.9));
    mats.vest.userData.u.uBase.value.setHex(o.suit);
    rankU.uDark.value.setHex(o.suitDark);
    mats.gloves.userData.u.uBase.value.setHex(o.glove);
    mats.gloves.userData.u.uRough.value = o.top ? 0.35 : 0.8;
    if (merged) {
      const i = merged.userData.partNames.indexOf('gloves');
      if (i >= 0) merged.material.userData.u.uRoughs.value[i] = mats.gloves.userData.u.uRough.value;
    }
    rankU.uTape.value = o.tier >= 2 ? 1 : 0;
    rankU.uKnee.value = o.tier >= 4 ? 1 : 0;
    rankU.uBadge.value = o.tier >= 4 ? 1 : 0;
    rankU.uStar.value = o.tier >= 6 ? 1 : 0;
    rankU.uTrim.value.setHex(o.trim);
    rankU.uBadgeCol.value.setHex(o.suitLight);
    rankU.uStarCol.value.setHex(o.top ? 0xffcf4a : o.helmet);
    rankU.uStarCol2.value.setHex(o.top ? 0xffcf4a : 0xffd36b);
    if (shirt !== undefined) rankU.uShirt.value.setHex(shirt);
  }
  // Снаряжение на коже (ремень с подсумком): сетка (её оси + offset = оси модели в покое) получает кости и веса
  // одежды в точке-якоре anchor(x, y, z, out) — гнётся вместе с телом (присед, сидя на ящике), а не висит на тазе
  // жёстко. Сетка с весами — общая у модели (key — вид сетки). Возвращает сетку для skinnedSlot.
  const ref = meshes[0];
  const _a = new THREE.Vector3(), _j = [0, 0, 0, 0], _w = [0, 0, 0, 0];
  function skinGear(geo, key, anchor, offset) {
    let cache = SKIN_GEAR.get(V);
    if (!cache) { cache = new Map(); SKIN_GEAR.set(V, cache); }
    let g = cache.get(key);
    if (g) return g;
    const grid = clothGrid(V, parts, ['pants', 'vest', 'jacket']);
    g = geo.clone();
    if (offset) g.translate(offset[0], offset[1], offset[2]);
    const P = g.attributes.position, n = P.count;
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      anchor(P.getX(i), P.getY(i), P.getZ(i), _a);
      skinAt(grid, _a.x, _a.y, _a.z, _j, _w);
      for (let k = 0; k < 4; k++) { si[i * 4 + k] = _j[k]; sw[i * 4 + k] = _w[k]; }
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    g.computeBoundingSphere();
    cache.set(key, g);
    return g;
  }
  // пустой меш снаряжения на коже (сетку ставит people.js → dress)
  function skinnedSlot(material) {
    const m = new THREE.SkinnedMesh(NO_SKIN, material);
    ref.parent.add(m);
    m.position.copy(ref.position); m.quaternion.copy(ref.quaternion); m.scale.copy(ref.scale);
    m.bind(ref.skeleton, ref.bindMatrix);
    m.bindMode = ref.bindMode;
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    m.visible = false;
    return m;
  }
  // Свои ресурсы рабочего: материалы и фактуры костей (сетки общие у модели — не трогаем).
  function dispose() {
    Object.keys(mats).forEach(function (k) { mats[k].dispose(); });
    if (merged) merged.material.dispose();
    skeletons.forEach(function (sk) { sk.dispose(); });
    if (ref.skeleton) ref.skeleton.dispose();
  }
  // срез волос и кожи под каской: плоскость y = y0 + z · tilt (оси модели); без каски (on = false) — весь череп
  function helmetCut(y0, tilt) { cut.uHairCut.value = y0; cut.uHairTilt.value = tilt; }
  function helmetOn(on) { cut.uHelmet.value = on ? 1 : 0; }
  // Снаряжение в слитой сетке «Телефона» (people.js): pieces — [каска, ремень 1, ремень 3+, ремень 7] в осях модели в
  // покое ({ geo, bone }: bone — имя кости MakeHuman для жёсткой части); сетка с ними — общая у модели (один раз).
  function mergeGear(pieces) {
    if (!merged) return false;
    let full = MERGED_GEAR.get(V);
    if (!full) {
      const skel = merged.skeleton.bones, base = partMeshes.length;
      full = mergedGeometry(partMeshes, pieces.map(function (p, k) {
        return { geo: p.geo, part: base + k, bone: p.bone ? Math.max(0, skel.indexOf(bones[p.bone])) : undefined };
      }).filter(function (x) { return !!x.geo; }));
      MERGED_GEAR.set(V, full);
    }
    merged.geometry = full;
    return true;
  }
  // видимость частей снаряжения: каска (на голове) и ремень (0 — нет, 1–3 — вид)
  function gearShow(helmet, belt, helmetHex) {
    if (!merged) return;
    const sh = merged.material.userData.u.uShows.value, base = partMeshes.length;
    sh[base] = helmet ? 1 : 0;
    for (let k = 1; k <= 3; k++) sh[base + k] = belt === k ? 1 : 0;
    if (helmetHex !== undefined) helmetColor.setHex(helmetHex);
  }
  return { scene, meshes, parts, retarget, blink, grip, dress, meta, variant: v, head: meta.height_head_top, eyeY: mats.skin.userData.u.uEyeY.value,
    bones: bones, map: humans.map, skinGear, skinnedSlot, helmetCut, helmetOn, mergeGear, gearShow, merged: !!merged, dispose };
}
function shade(hex, k) { const c = new THREE.Color(hex); c.r *= k; c.g *= k; c.b *= k; return c.getHex(); }
