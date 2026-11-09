// Общее для хозяйства площадки (site.js): «куча» деталей по материалам (Pile — одна слитая геометрия на материал,
// как props.js), примитивы с фаской и без (на «Телефоне» — простые коробки: меньше вершин), трубы от точки к точке,
// фермы, свои материалы (грунт, щебень, трава, лампы) из фактур вида. Всё в метрах вида.
import * as THREE from 'three';
import { Batch, roundedBox, boxUV, cylinder } from './geo.js?v=9f2863b';
import { TEXTURE_TILES as TILE } from './textures.js?v=9f2863b';
import { linkSky, adoptSky } from './world.js?v=9f2863b';
import * as WORLD from './world.js?v=9f2863b';

// Сезон вида (world.js SEASON, если он есть): тон породы главы (uSeRock) и перекраска луга — те же uniform-ы, что
// у рельефа, поэтому плато, полки и стенки карьера одного тона с землёй поляны (осенью — солома, а не зелень).
// Без сезона в world.js — цвет вершин по главе (site-quarry.js CHAPTER_LOOKS), как раньше.
export const SEASON_U = WORLD.SEASON && WORLD.SEASON.uniforms && WORLD.SEASON.uniforms.uSeRock ? WORLD.SEASON.uniforms : null;
const SEASON_HEAD = /* glsl */ `
uniform float uSeRecol, uSeDryBias, uSeDamp;
uniform vec3 uSeOlive, uSeStraw, uSeRust, uSeLift, uSeDirt, uSeLush, uSeDry;
uniform vec4 uSeRock;
float mbSeH(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float mbSeN(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mbSeH(i), mbSeH(i + vec2(1.0, 0.0)), u.x), mix(mbSeH(i + vec2(0.0, 1.0)), mbSeH(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;
// Как TERRAIN_MAP world.js: трава — по яркости фактуры в палитру сезона (олива — солома по сухости, рыжие пятна),
// глина — тон сезона и сырые пятна, глина и щебень — порода главы по своей яркости.
const SEASON_FRAG = /* glsl */ `
#include <color_fragment>
{
  vec2 sxz = vSkyW.xz;
#ifdef MB_SE_GRASS
  if (uSeRecol > 0.001) {
    float gl = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    gl = 0.05 + 1.1 * gl;
    float macro = mbSeN(sxz * 0.035) * 0.6 + mbSeN(sxz * 0.11) * 0.4;
    float own = clamp((diffuseColor.r - diffuseColor.g * 0.82) * 6.0 + 0.5, 0.0, 1.0);
    float dr = clamp(0.45 + uSeDryBias + (macro - 0.5) * 0.6 + (own - 0.5) * 0.5, 0.0, 1.0);
    vec3 pal = mix(uSeOlive, uSeStraw, smoothstep(0.3, 0.72, dr));
    float rustK = smoothstep(0.58, 0.82, mbSeN(sxz * 0.42 + 7.0) * 0.75 + mbSeN(sxz * 1.13 - 3.0) * 0.25 + 0.06);
    pal = mix(pal, uSeRust, rustK * 0.22 * smoothstep(0.4, 0.9, dr));
    pal *= uSeLift;
    diffuseColor.rgb = mix(diffuseColor.rgb, gl * pal, uSeRecol);
  }
  diffuseColor.rgb *= mix(uSeLush, uSeDry, 0.45);
#endif
#ifdef MB_SE_DIRT
  diffuseColor.rgb *= uSeDirt;
  diffuseColor.rgb *= mix(1.0, 0.7, uSeDamp * (0.45 + 0.9 * mbSeN(sxz * 0.31 + 4.0)));
#endif
#ifdef MB_SE_ROCK
  diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) * uSeRock.rgb, uSeRock.a);
#endif
}
`;
function seasonUniforms(shader) {
  ['uSeRecol', 'uSeDryBias', 'uSeDamp', 'uSeOlive', 'uSeStraw', 'uSeRust', 'uSeLift', 'uSeDirt', 'uSeLush', 'uSeDry', 'uSeRock'].forEach(function (k) { shader.uniforms[k] = SEASON_U[k]; });
}
// Грунт, щебень или трава карьера под сезон (до linkSky: его правки идут после этих; vSkyW — мировая точка linkSky).
function seasonGround(m, kind) {
  if (!SEASON_U) return m;
  m.defines = Object.assign({}, m.defines, kind === 'grass' ? { MB_SE_GRASS: '' } : kind === 'dirt' ? { MB_SE_DIRT: '', MB_SE_ROCK: '' } : { MB_SE_ROCK: '' });
  m.onBeforeCompile = function (shader) {
    seasonUniforms(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SEASON_HEAD)
      .replace('#include <color_fragment>', SEASON_FRAG);
  };
  m.customProgramCacheKey = function () { return 'siteSe1' + kind; };
  return m;
}

// Скала стенок карьера поверх фактуры камня (в мировых координатах, стенки стыкуются без шва): слои по 0,62 м
// своего тона, швы напластования — утопленные (мягкая тень шва, наклон граней к нему), в слое — блоки отдельности с
// наклоном своих граней, трещины между ними — узкие и неглубокие; вертикальные следы буровых скважин (полутрубы
// через 2,5–3,5 м — стенка уступа отбита взрывом), ржавые потёки от швов, второй отсчёт фактуры крупнее (без
// повтора плитки). Только на крутых гранях (полки и плато — свои материалы). mbCrack — где темнее и грубее.
const ROCK_FRAGMENT = /* glsl */ `
#include <color_fragment>
float mbCrack = 0.0;
vec3 mbTilt = vec3(0.0);
{
  vec3 an = abs(vWNrm);
  float hx = an.x > an.z ? vWPos.z : vWPos.x;
  vec3 side = normalize(vec3(an.x > an.z ? 0.0 : 1.0, 0.0, an.x > an.z ? 1.0 : 0.0));
  float steep = smoothstep(0.3, 0.65, 1.0 - an.y);
  vec2 q = vec2(hx + 0.21 * vWPos.y, vWPos.y);
  // слои неравной толщины, швы волнистые; часть швов сросшаяся (их не видно)
  float warp = gNoise(q * vec2(0.22, 0.5)) * 1.1 + gNoise(q * vec2(0.9, 1.6)) * 0.25;
  float band = vWPos.y / 0.62 + warp;
  float bi = floor(band), bf = fract(band);
  float rnd = fract(sin(bi * 12.9898 + 4.1) * 43758.5453);
  // шов виден не везде: сросшиеся швы и участки, где он затёрт пылью
  float seam = step(0.4, fract(sin(bi * 5.31 + 1.7) * 7313.1)) * smoothstep(0.2, 0.5, gNoise(vec2(hx * 0.17, bi * 3.1)));
  float dB = min(bf, 1.0 - bf) * 0.62;
  float bed = (1.0 - smoothstep(0.0, 0.02, dB)) * seam;
  float bedHalo = (1.0 - smoothstep(0.0, 0.2, dB)) * seam;
  // трещины отдельности: наклонные, кривые, не через каждый слой
  float jw = 0.9 + 1.8 * fract(sin(bi * 7.13) * 917.3);
  float jx = (q.x + (bf - 0.5) * (fract(sin(bi * 3.3) * 77.7) - 0.5) * 0.9) / jw + rnd * 3.0 + 0.45 * gNoise(q * vec2(0.8, 2.3));
  float jf = fract(jx), jid = floor(jx);
  float jon = step(0.35, fract(sin(jid * 3.71 + bi * 1.3) * 517.1));
  float dJ = min(jf, 1.0 - jf) * jw;
  float joint = (1.0 - smoothstep(0.0, 0.008 + 0.014 * fract(sin(jid * 9.1 + bi) * 133.7), dJ)) * jon;
  float jointHalo = (1.0 - smoothstep(0.0, 0.1, dJ)) * jon;
  float blk = fract(sin(jid * 1.7 + bi * 9.1) * 311.7);
  // следы скважин: полутруба 0,11 м, на части стенок
  float dq = hx / 3.0 + 0.13 * gNoise(vec2(vWPos.y * 0.25, 3.0));
  float did = floor(dq);
  float dOn = step(0.45, fract(sin(did * 4.37 + 2.1) * 911.7)) * step(0.35, gNoise(vec2(did * 1.3, vWPos.y * 0.18)));
  float dx = (fract(dq) - 0.5 - (fract(sin(did * 1.9) * 77.3) - 0.5) * 0.5) * 3.0;
  float hole = (1.0 - smoothstep(0.035, 0.06, abs(dx))) * dOn;
  mbCrack = max(max(bed, joint * 0.7), hole * 0.25) * steep;
  // мелкие сколы: грани 0,15–0,4 м своего наклона и тона, по краям — тонкие тёмные трещинки (ячейки Вороного);
  // сетка ячеек изогнута шумом и неравномерна (не мозаика из плит), часть кромок не видна (сколы сливаются)
  float chipEdge = 0.0;
#ifndef MB_ROCK_LITE
  {
    vec2 fq = vec2(hx, vWPos.y) * vec2(3.1, 3.9);
    fq += vec2(gNoise(fq * 0.37 + 3.7), gNoise(fq * 0.41 - 1.9)) * 1.3;
    vec2 fi = floor(fq), ff = fract(fq);
    float f1 = 8.0, f2 = 8.0; vec2 fid = vec2(0.0);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 r = o + vec2(gHash(fi + o), gHash(fi + o + 17.3)) - ff;
      float d = dot(r, r);
      if (d < f1) { f2 = f1; f1 = d; fid = fi + o; } else if (d < f2) f2 = d;
    }
    float c1 = gHash(fid * 1.7 + 3.1), c2 = gHash(fid * 2.3 + 7.9);
    chipEdge = (1.0 - smoothstep(0.0, 0.07, sqrt(f2) - sqrt(f1))) * steep * smoothstep(0.25, 0.6, gHash(fid * 3.1 + 1.3));
    // наклон и тон скола — слабее, чем у блоков слоя: вблизи грани сколов не складываются в мозаику плиток
    mbTilt += (side * (c1 - 0.5) * 0.3 + vec3(0.0, (c2 - 0.45) * 0.26, 0.0)) * steep;
    diffuseColor.rgb *= mix(1.0, 0.93 + 0.14 * c1, steep);
  }
#endif
  // второй отсчёт фактуры: крупные пятна тона без повтора плитки
  vec3 det = texture2D(map, vec2(hx, vWPos.y) * 0.137 + vec2(0.31, 0.17)).rgb;
  float detL = dot(det, vec3(0.333));
  diffuseColor.rgb *= mix(1.0, clamp(0.55 + detL * 1.1, 0.7, 1.3), steep * 0.8);
  // слои своего тона: часть темнее (прослои глинистого сланца), часть теплее
  diffuseColor.rgb *= mix(vec3(1.0), (0.72 + 0.46 * rnd) * (0.88 + 0.24 * blk) * mix(vec3(1.0), vec3(1.07, 1.0, 0.9), step(0.62, fract(rnd * 7.3))), steep);
  diffuseColor.rgb *= 1.0 - 0.1 * chipEdge;
  diffuseColor.rgb *= (1.0 - 0.45 * mbCrack) * (1.0 - 0.3 * bedHalo * steep) * (1.0 - 0.12 * jointHalo * steep) * (1.0 - 0.18 * hole * steep);
  mbCrack = max(mbCrack, chipEdge * 0.25);
  // ржавые и тёмные потёки вниз от швов
  float streak = smoothstep(0.55, 0.88, gNoise(vec2(hx * 2.1, vWPos.y * 0.1 + rnd))) * steep;
  float rust = smoothstep(0.6, 0.9, gNoise(vec2(hx * 1.3 + 7.0, vWPos.y * 0.07 + bi * 0.5))) * steep * (0.4 + 0.6 * smoothstep(0.0, 0.5, bf));
  diffuseColor.rgb *= 1.0 - 0.18 * streak;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.18, 0.86, 0.62), rust * 0.55);
  // у каждой глыбы слоя — свой наклон грани (скала колется блоками), у швов — завал внутрь, полутруба скважины
  float b1 = fract(sin(jid * 4.7 + bi * 2.9) * 911.1), b2 = fract(sin(jid * 6.1 + bi * 8.3) * 517.9);
  mbTilt += (side * (b1 - 0.5) * 0.7 + vec3(0.0, (b2 - 0.55) * 0.6, 0.0)) * steep;
  mbTilt += vec3(0.0, (bf - 0.5) * 0.9, 0.0) * bedHalo * steep;
  mbTilt += side * clamp(dx / 0.055, -1.0, 1.0) * 0.9 * hole * steep;
}
#ifdef MB_SE_ROCK
// порода главы (world.js SEASON uSeRock) — как глина и щебень рельефа
diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) * uSeRock.rgb, uSeRock.a);
#endif
`;
export function rockMaterial(src, lite) {
  linkSky(src);
  const m = adoptSky(src.clone(), src);
  if (lite) m.defines = Object.assign({}, m.defines, { MB_ROCK_LITE: '' });
  if (SEASON_U) m.defines = Object.assign({}, m.defines, { MB_SE_ROCK: '' });
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (shader, renderer) {
    prev.call(this, shader, renderer);
    if (SEASON_U) shader.uniforms.uSeRock = SEASON_U.uSeRock;
    if (!lite) {
      // глыбы вала и бровка в ночном пятне света мачты — освещены, как вещи (POOLS)
      Object.assign(shader.uniforms, POOLS);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + POOL_HEAD)
        .replace('#include <lights_fragment_end>', POOL_LIGHT.replace(/vMudW/g, 'vWPos'));
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n#ifdef MB_SE_ROCK\nuniform vec4 uSeRock;\n#endif')
      .replace('#include <color_fragment>', ROCK_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 1.0, mbCrack);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(normal + (viewMatrix * vec4(mbTilt, 0.0)).xyz);');
  };
  m.customProgramCacheKey = function () { return prevKey.call(this) + '|rock7' + (lite ? 'l' : ''); };
  linkSky(m);
  return m;
}

// Грязь и пыль у земли (как dirty() оригинала для техники, art/vehicles.js): у каждой вершины — высота земли под
// предметом и сила грязи (атрибут aMud, Pile ниже). Корка присохшей грязи с рваной кромкой (у самой земли — сырая
// и тёмная, выше — подсохшая, светлее), над ней — брызги пятнами; грязь матовая, металл под ней не блестит.
// Грязь материалов вида (materials.js withGrime: тёмный подтёк и корка у земли) считается от той же земли под
// предметом — на плато карьера, а не от нуля.
const MUD_VERTEX_HEAD = /* glsl */ `
attribute vec2 aMud;
varying vec3 vMudW;
varying vec2 vMud;
`;
const MUD_VERTEX = /* glsl */ `
{
  vec4 mbMw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  mbMw = instanceMatrix * mbMw;
  #endif
  vMudW = (modelMatrix * mbMw).xyz;
  vMud = aMud;
}
`;
const MUD_FRAGMENT_HEAD = /* glsl */ `
varying vec3 vMudW;
varying vec2 vMud;
float mbMudH(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float mbMudN(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mbMudH(i), mbMudH(i + vec2(1.0, 0.0)), u.x), mix(mbMudH(i + vec2(0.0, 1.0)), mbMudH(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;
const MUD_FRAGMENT = /* glsl */ `
float mbMud = 0.0;
{
  float mh = vMudW.y - vMud.x;
  // сила грязи; отрицательная — резина (на «Телефоне» она в общей краске): у неё рваная корка и на чёрном
  float mk = abs(vMud.y);
  if (mk > 0.001 && mh > -0.6) {
    // шум в плоскости грани: на боках — по горизонтали и высоте, сверху — по xz
    vec2 mq = vMudW.xz + vec2(vMudW.y * 0.61, -vMudW.y * 0.47);
    float m1 = mbMudN(mq * 2.2 + vMudW.y * 0.9);
    float m2 = mbMudN(mq * 7.1 - vMudW.y * 3.1);
    float m3 = mbMudN(mq * 23.0 + vMudW.y * 11.0);
    float m4 = mbMudN(mq * 61.0 - vMudW.y * 37.0);
    // на тёмной стали и краске (гусеницы, рамы, шасси) рваная кромка корки по высоте балки читается пятнами —
    // «камуфляжем»: там вместо кромки — плавный спад пыльной корки, грязь темнее (сырая), брызг почти нет.
    // Резина (шероховатая) — как была: корка с рваной кромкой видна и на чёрной шине.
    float darkB = (1.0 - smoothstep(0.025, 0.12, dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)))) * (1.0 - smoothstep(0.7, 0.8, roughness)) * step(0.0, vMud.y);
    // кромка корки: 0,3–0,8 м × сила, рваная (крупно и мелко)
    float top = mix(mk * (0.28 + 0.34 * m1 + 0.1 * m2 + 0.08 * m3), mk * 0.5, darkB);
    float crust = (1.0 - smoothstep(top - mix(0.06, 0.5, darkB) * mk, top, mh)) * mix(0.78 + 0.22 * m2, 0.8, darkB);
    // брызги над коркой: мелкие капли, к верху реже
    float splash = smoothstep(0.7, 0.76, m3 * 0.6 + m4 * 0.4) * (1.0 - smoothstep(top, top + 0.7 * mk, mh)) * 0.75 * (1.0 - 0.85 * darkB);
    mbMud = clamp(max(crust, splash), 0.0, 1.0);
    // у земли — сырая тёмная, выше — подсохшая бурая; пятна тона
    vec3 mbWetC = vec3(0.058, 0.04, 0.026), mbDryC = vec3(0.19, 0.135, 0.085);
    vec3 mc = mix(mbWetC, mbDryC, smoothstep(0.02, 0.45, mh) * (0.6 + 0.4 * m2) * (1.0 - 0.55 * darkB))
      * (0.8 + 0.25 * m3 * (1.0 - 0.6 * darkB) + 0.15 * m4 * (1.0 - darkB));
    diffuseColor.rgb = mix(diffuseColor.rgb, mc, mbMud);
  }
}
`;
// Ночные пятна света мачт (site-ambient.js задаёт): у оригинала — тёплый круг на земле; здесь вещи в пятне
// (балласт мачты, столбики, лента, стенки бытовок) тоже освещены — свет от прожекторов мачты по закону Ламберта
// (без источника света three: число источников не меняется, шейдеры не пересобираются). c — центр пятна и радиус,
// h — прожекторы мачты; k — сила (ночь). Только не на «Телефоне».
export const POOLS = {
  uPoolC: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
  uPoolH: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  uPoolK: { value: 0 },
};
const POOL_HEAD = /* glsl */ `
uniform vec4 uPoolC[4];
uniform vec3 uPoolH[4];
uniform float uPoolK;
`;
const POOL_LIGHT = /* glsl */ `
#include <lights_fragment_end>
if (uPoolK > 0.001) {
  for (int i = 0; i < 4; i++) {
    vec4 pc = uPoolC[i];
    if (pc.w < 0.01) continue;
    float dd = length(vMudW.xz - pc.xz) / pc.w;
    if (dd >= 1.0) continue;
    // по высоте — до 6 м над пятном (выше прожекторы светят мимо)
    float fall = pow(1.0 - smoothstep(0.0, 1.0, dd), 1.6) * (1.0 - smoothstep(2.0, 6.0, vMudW.y - pc.y));
    vec3 L = normalize((viewMatrix * vec4(uPoolH[i] - vMudW, 0.0)).xyz);
    reflectedLight.directDiffuse += uPoolK * 6.0 * fall * max(dot(normal, L), 0.0) * vec3(1.0, 0.78, 0.5) * BRDF_Lambert(material.diffuseColor);
  }
}
`;
// Клон материала вида с грязью от земли под предметом. Стёкла и лампы — без грязи (MB_DRY). pools — подсветка
// пятнами света мачт (POOLS).
export function mudMaterial(src, pools) {
  linkSky(src);
  const m = adoptSky(src.clone(), src);
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (shader, renderer) {
    prev.call(this, shader, renderer);
    if (pools) {
      Object.assign(shader.uniforms, POOLS);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + POOL_HEAD)
        .replace('#include <lights_fragment_end>', POOL_LIGHT);
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + MUD_VERTEX_HEAD)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + MUD_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + MUD_FRAGMENT_HEAD)
      .replace(/vWPos\.y - uGround/g, '(vWPos.y - vMud.x)')
      // брызги раствора materials.js (пятна серого и бурого у низа — для мешалок и тачек) на технике в своей
      // грязи — светлые пятна по чёрной раме, «камуфляж»: где своя грязь (aMud.y), их нет
      .replace('mbCrust = smoothstep(0.6, 0.67, sn) * low * uWear;', 'mbCrust = smoothstep(0.6, 0.67, sn) * low * uWear * (1.0 - abs(vMud.y));')
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + MUD_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.93, mbMud);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - mbMud;');
  };
  m.customProgramCacheKey = function () { return prevKey.call(this) + '|mud5' + (pools ? 'p' : ''); };
  return m;
}

export const WHITE = new THREE.Color(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _one = new THREE.Vector3(1, 1, 1);

// Матрица: сдвиг и поворот (порядок YXZ: сначала курс, потом наклон).
export function M(x, y, z, ry, rx, rz, s) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')),
    s ? new THREE.Vector3(s, s, s) : _one);
}
export function mul(a, b) { return a.clone().multiply(b); }
export function hex(h, k) { const c = new THREE.Color().setHex(h).convertSRGBToLinear(); if (k) c.multiplyScalar(k); return c; }

// Коробка без фаски: 24 вершины, номера граней — для boxUV.
export function flatBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const n = g.attributes.normal.array;
  const face = new Uint8Array(g.attributes.position.count);
  for (let i = 0; i < face.length; i++) {
    const x = n[i * 3], y = n[i * 3 + 1], z = n[i * 3 + 2];
    face[i] = x > 0.5 ? 0 : x < -0.5 ? 1 : y > 0.5 ? 2 : y < -0.5 ? 3 : z > 0.5 ? 4 : 5;
  }
  return { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: new Float32Array(face.length * 2), index: g.index.array, face };
}

// Набор для сборки: fine — фаски и мелочь (не «Телефон»), mats — материалы вида и свои.
export function createKit(ctx) {
  const T = ctx.textures;
  const fine = ctx.tier !== 'phone';
  // Грунт, щебень и трава карьера — те же фактуры, что у рельефа; оттенок — цвет вершин.
  function ground(name, rough) {
    const t = T.get(name);
    const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.ormMap, aoMap: t.ormMap, roughness: rough || 1, metalness: 0, vertexColors: true });
    m.userData.tile = t.tile || TILE[name];
    return m;
  }
  const own = {
    dirt: seasonGround(ground('dirt'), 'dirt'),
    gravel: seasonGround(ground('gravel'), 'gravel'),
    grass: seasonGround(ground('grass'), 'grass'),
    // стёкла прожекторов и фар: светятся ночью (night)
    lamp: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xfff1dc, emissiveIntensity: 0, roughness: 0.25, metalness: 0, vertexColors: true }),
    // стекло окон бытовок и кабин: тёмное отражающее (сквозь не видно — внутри темно)
    pane: new THREE.MeshStandardMaterial({ color: 0x0b0f12, roughness: 0.06, metalness: 0.9, envMapIntensity: 1.4, vertexColors: true }),
    // окна бытовок, где горит свет: днём — как тёмное стекло, ночью — тёплый свет изнутри
    winlit: new THREE.MeshStandardMaterial({ color: 0x0b0f12, emissive: 0xffc890, emissiveIntensity: 0, roughness: 0.08, metalness: 0.85, envMapIntensity: 1.3, vertexColors: true }),
    // заградительные огни крана: красные, горят в сумерки и ночью
    redlamp: new THREE.MeshStandardMaterial({ color: 0x301010, emissive: 0xff2010, emissiveIntensity: 0, roughness: 0.3, metalness: 0, vertexColors: true }),
    // стальной трос
    cable: new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.45, metalness: 0.85, vertexColors: true }),
  };
  own.rock = rockMaterial(ctx.mats.stone, !fine);
  own.pane.defines = { MB_DRY: '' };
  own.lamp.defines = { MB_DRY: '' };
  own.redlamp.defines = { MB_DRY: '' };
  own.winlit.defines = { MB_DRY: '' };
  function mat(key) {
    if (own[key]) return own[key];
    if (key.indexOf('fam:') === 0) return null;
    return ctx.mats[key];
  }
  function tile(key) {
    const m = mat(key);
    if (m && m.userData && m.userData.tile) return m.userData.tile;
    return TILE[key] || [1, 1];
  }
  // Брус w × h × d с фаской r (на «Телефоне» — без фаски); seg — сегментов фаски (по умолчанию 3).
  function box(w, h, d, r, seg) {
    return fine && r > 0 ? roundedBox(w, h, d, r, seg || 3) : flatBox(w, h, d);
  }
  // Брус в развёртке фактуры материала key (метры → плитка фактуры).
  function tbox(key, w, h, d, r, ou, ov, seg) {
    const t = tile(key);
    return boxUV(box(w, h, d, r, seg), t[0], t[1], ou || 0, ov || 0);
  }
  function cyl(r0, r1, len, rad, caps) { return cylinder(r0, r1, len, fine ? rad : Math.max(5, Math.round(rad * 0.6)), caps !== false); }
  // Материал с грязью от земли под предметом (mudMaterial): свои стёкла, лампы и трос — без неё.
  const MUD = {};
  function mudMat(key) {
    if (own[key] || key.indexOf('fam:') === 0) return mat(key);
    if (!MUD[key]) { const src = ctx.mats[key]; MUD[key] = src ? mudMaterial(src, fine) : null; }
    return MUD[key] || mat(key);
  }
  return { fine, mats: ctx.mats, own, mat, mudMat, tile, box, tbox, cyl, ctx, season: !!SEASON_U };
}

// «Телефон»: металл, резина, стекло и листы без фактур — в одну краску с цветом вершин (меньше вызовов отрисовки):
// ключ → [материал, множитель цвета (линейный) или null — цвет исходного материала].
const PHONE = {
  paintworn: ['paint', null], blacksteel: ['paint', null], steel: ['paint', null], tube: ['paint', null], rubber: ['paint', null],
  pane: ['paint', new THREE.Color(0.012, 0.014, 0.016)], cable: ['paint', null],
  steelplate: ['paint', new THREE.Color(0.05, 0.055, 0.05)], diamond: ['paint', new THREE.Color(0.24, 0.245, 0.25)], zinc: ['paint', new THREE.Color(0.3, 0.31, 0.32)],
};
const _c = new THREE.Color();

// Куча деталей: по Batch на материал; build → группа мешей (по одному на материал).
// ground(x, z) — земля под предметом (м); mudK — сила грязи для следующих деталей (0 — только грязь вида у земли,
// 1 — техника по колёса в грязи). Без ground — обычные материалы вида.
// Ключ с '~' на конце ('paint~') — тот же материал без тени. На «Телефоне» без тени и тонкие детали (тоньше 9 см:
// трубки, прутья, ленты, поручни) и мелочь (меньше 0,3 м): тень у них — полоска в пиксель, а треугольники в
// проходе тени — каждый кадр.
export class Pile {
  constructor(kit) { this.kit = kit; this.batches = new Map(); this.noShadow = new Set(['lamp', 'redlamp', 'pane', 'winlit']); this.ground = null; this.mudK = 0; this.gcache = new Map(); }
  groundAt(x, z) {
    const key = Math.round(x * 2) * 100003 + Math.round(z * 2);
    let g = this.gcache.get(key);
    if (g === undefined) { g = this.ground(x, z); this.gcache.set(key, g); }
    return g;
  }
  put(key, prim, m, c) {
    let ns = false;
    if (key.charCodeAt(key.length - 1) === 126) { ns = true; key = key.slice(0, -1); }
    const rubber = key === 'rubber';
    if (!this.kit.fine && !ns && !this.noShadow.has(key)) ns = thin(prim, m);
    if (!this.kit.fine && PHONE[key]) {
      const r = PHONE[key];
      const src = this.kit.mats[key];
      _c.copy(c || WHITE).multiply(r[1] || (src && src.color) || WHITE);
      c = _c;
      key = r[0];
    }
    if (ns) key += '~';
    let b = this.batches.get(key);
    if (!b) { b = new Batch(); b.mud = []; this.batches.set(key, b); }
    b.add(prim, m, c || WHITE, 0);
    // земля — под началом детали (у колеса — под ступицей), с шагом 0,5 м
    const g = this.ground ? this.groundAt(m.elements[12], m.elements[14]) : 0, k = this.ground ? this.mudK : 0;
    // у резины сила со знаком минус (MUD_FRAGMENT: корка с рваной кромкой и на чёрной шине)
    const kk = rubber ? -k : k;
    for (let i = prim.pos.length / 3; i > 0; i--) b.mud.push(g, kk);
  }
  // Цилиндр (ось +y) от точки a к точке b (Vector3, метры).
  tube(key, a, b, r, c, rad) {
    _d.subVectors(b, a);
    const len = _d.length();
    if (len < 1e-4) return;
    _q.setFromUnitVectors(UP, _d.divideScalar(len));
    this.put(key, this.kit.cyl(r, r, len, rad || 8, true), new THREE.Matrix4().compose(a, _q, _one), c);
  }
  // Брус-элемент фермы от a к b сечением w × w (по оси +y, без фаски — мелочь).
  bar(key, a, b, w, c) {
    _d.subVectors(b, a);
    const len = _d.length();
    if (len < 1e-4) return;
    _q.setFromUnitVectors(UP, _d.clone().divideScalar(len));
    _a.addVectors(a, b).multiplyScalar(0.5);
    this.put(key, flatBox(w, len, w), new THREE.Matrix4().compose(_a, _q, _one), c);
  }
  // Меши по материалам; family(key) — материал кладки для ключей 'fam:…'.
  build(family, group) {
    const g = group || new THREE.Group();
    const kit = this.kit, noShadow = this.noShadow, mud = !!this.ground;
    // маленькая часть пары «с тенью / без тени» — в большую: лишний вызов отрисовки дороже сотни треугольников
    const batches = this.batches;
    batches.forEach(function (b, name) {
      if (name.charCodeAt(name.length - 1) !== 126) return;
      const base = batches.get(name.slice(0, -1));
      if (!base || !base.vcount || !b.vcount) return;
      const small = Math.min(b.idx.length, base.idx.length) / 3;
      if (small > 1500) return;
      const into = b.idx.length > base.idx.length ? b : base, from = into === b ? base : b;
      mergeBatch(into, from);
    });
    this.batches.forEach(function (b, name) {
      if (!b.vcount) return;
      const ns = name.charCodeAt(name.length - 1) === 126, key = ns ? name.slice(0, -1) : name;
      const m = key.indexOf('fam:') === 0 ? family(key.slice(4)) : mud ? kit.mudMat(key) : kit.mat(key);
      const geo = b.geometry();
      if (mud) geo.setAttribute('aMud', new THREE.Float32BufferAttribute(b.mud, 2));
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = !ns && !noShadow.has(key);
      mesh.receiveShadow = key !== 'lamp';
      mesh.name = name;
      g.add(mesh);
    });
    this.batches.clear();
    this.gcache.clear();
    return g;
  }
}

// Дописать батч from в into (и его aMud); from опустошается.
function mergeBatch(into, from) {
  const base = into.vcount;
  for (let i = 0; i < from.pos.length; i++) into.pos.push(from.pos[i]);
  for (let i = 0; i < from.nrm.length; i++) into.nrm.push(from.nrm[i]);
  for (let i = 0; i < from.uv.length; i++) into.uv.push(from.uv[i]);
  for (let i = 0; i < from.col.length; i++) into.col.push(from.col[i]);
  for (let i = 0; i < from.idx.length; i++) into.idx.push(base + from.idx[i]);
  for (let i = 0; i < from.mud.length; i++) into.mud.push(from.mud[i]);
  into.vcount += from.vcount;
  into.ends.push([0, into.idx.length]);
  from.pos = []; from.nrm = []; from.uv = []; from.col = []; from.idx = []; from.mud = []; from.vcount = 0; from.ends = [];
}

// Тонкая или мелкая деталь (габарит заготовки в матрице, м): второй размер меньше 9 см или первый меньше 0,3 м.
const _ext = [0, 0, 0];
function thin(prim, m) {
  const p = prim.pos, e = m.elements;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  _ext[0] = (x1 - x0) * Math.hypot(e[0], e[1], e[2]);
  _ext[1] = (y1 - y0) * Math.hypot(e[4], e[5], e[6]);
  _ext[2] = (z1 - z0) * Math.hypot(e[8], e[9], e[10]);
  _ext.sort(function (a, b) { return b - a; });
  return _ext[1] < 0.09 || _ext[0] < 0.3;
}

// ---------- колёса техники ----------
// Тело вращения (ось — y, наружу — +y) из профиля [радиус, высота] в заготовку Batch; профиль — от внутренней
// стороны через беговую дорожку к наружной (нормали наружу). Кэш по ключу: у колёс одного размера — одна заготовка.
const LATHE = {};
function lathe(key, pts, seg) {
  if (LATHE[key]) return LATHE[key];
  const g = new THREE.LatheGeometry(pts.map(function (q) { return new THREE.Vector2(q[0], q[1]); }), seg);
  LATHE[key] = { pos: g.attributes.position.array, nrm: g.attributes.normal.array, uv: g.attributes.uv.array, index: g.index.array };
  return LATHE[key];
}
// Колесо в матрице m (центр ступицы, ось — x): шина со скруглёнными боковинами и протектором (ёлочка у самосвала,
// шашки у прицепов), диск — обод с закраиной, вогнутый диск, отверстия, ступица и гайки. side — куда наружная
// сторона (+1 — к +x, −1 — к −x). o: { rim — цвет диска, rr — радиус обода (доля), tread — 'chevron' | 'block' }.
export function wheel(P, kit, m, r, w, side, o) {
  o = o || {};
  const fine = kit.fine;
  const seg = fine ? 28 : 12;
  const rr = r * (o.rr || 0.6), h = r - rr;
  const rot = m.clone().multiply(M(0, 0, 0, 0, 0, -(side || 1) * Math.PI / 2));
  const tyre = lathe('t' + r.toFixed(3) + w.toFixed(3) + rr.toFixed(3) + seg, [
    [rr * 0.99, -0.42 * w], [rr + 0.12 * h, -0.48 * w], [rr + 0.5 * h, -0.5 * w], [r - 0.14 * h, -0.47 * w], [r - 0.03 * h, -0.4 * w], [r, -0.3 * w],
    [r, 0.3 * w], [r - 0.03 * h, 0.4 * w], [r - 0.14 * h, 0.47 * w], [rr + 0.5 * h, 0.5 * w], [rr + 0.12 * h, 0.48 * w], [rr * 0.99, 0.42 * w],
  ], seg);
  P.put('rubber', tyre, rot);
  if (fine && o.tread !== 'smooth') {
    // протектор: грунтозацепы по беговой дорожке
    const n = Math.max(14, Math.round(r * 30));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const at = function (y, lean, len) { return rot.clone().multiply(M(Math.sin(a) * r, y, Math.cos(a) * r, a, 0, 0)).multiply(M(0, 0, 0, 0, 0, lean)); };
      if (o.tread === 'block') {
        P.put('rubber', kit.box(r * 0.07, w * 0.26, r * 0.13, 0), at((i % 2 ? 0.16 : -0.16) * w, 0));
      } else {
        P.put('rubber', kit.box(r * 0.06, w * 0.42, r * 0.11, 0), at(0.22 * w, 0.55));
        P.put('rubber', kit.box(r * 0.06, w * 0.42, r * 0.11, 0), at(-0.22 * w, -0.55));
      }
    }
  }
  const rim = o.rim || hex(0x8e8f8a);
  // диск: закраина обода, вогнутый диск к ступице (наружная сторона)
  const disc = lathe('d' + rr.toFixed(3) + w.toFixed(3) + seg, [
    [rr, 0.36 * w], [rr * 0.95, 0.43 * w], [rr * 0.88, 0.39 * w], [rr * 0.62, 0.27 * w], [rr * 0.36, 0.27 * w], [rr * 0.33, 0.36 * w], [rr * 0.2, 0.39 * w], [0.001, 0.39 * w],
  ], seg);
  P.put('paintworn', disc, rot, rim);
  if (!fine) return;
  // гайки на ступице и отверстия в диске
  const nuts = o.nuts || 8;
  for (let i = 0; i < nuts; i++) {
    const a = i / nuts * Math.PI * 2;
    P.put('steel', kit.cyl(rr * 0.045, rr * 0.045, 0.04 * w, 6), rot.clone().multiply(M(Math.cos(a) * rr * 0.26, 0.37 * w, Math.sin(a) * rr * 0.26)), hex(0xb9bcbf));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i + 0.5) / 6 * Math.PI * 2;
    P.put('blacksteel', kit.cyl(rr * 0.085, rr * 0.085, 0.004, 10), rot.clone().multiply(M(Math.cos(a) * rr * 0.49, 0.27 * w, Math.sin(a) * rr * 0.49)));
  }
}

// Освободить геометрию группы (материалы общие — живут с модулем).
export function disposeTree(root) {
  root.traverse(function (o) {
    if (o.geometry) o.geometry.dispose();
    if (o.isInstancedMesh) o.dispose();
    // свои шейдеры (вихри, пятна света) — на каждую площадку новые
    if (o.material && o.material.isShaderMaterial) o.material.dispose();
  });
}

// Детерминированный шум 1D/2D (сглаженная решётка) для неровностей.
export function hash2(a, b) {
  let h = Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export function fbm(x, y, oct) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < (oct || 3); i++) { s += vnoise(x * f + i * 17.3, y * f - i * 9.1) * a; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
