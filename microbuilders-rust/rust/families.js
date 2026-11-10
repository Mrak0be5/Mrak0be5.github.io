// Семейства материалов оригинала: материал (MB.MATERIAL) задаёт только цвет и массу — по имени видно, камень
// это, кирпич, дерево или металл. Семейство → кладка (рецепт textures.js), её средний тон (тон материала
// делится на него — получается оттенок вершин) и высота ряда (недостроенная деталь растёт рядами).
// Общие для здания, двора и ноши рабочих.
import { TEXTURE_TILES as TILE, TEXTURE_POM as POM } from './textures.js?v=ff29707';
import { adoptSky, linkSky } from './world.js?v=ff29707';
import * as THREE from 'three';

// клетка логики, м
export const CELL = 2;

const FAMILY_RULES = [
  ['glass', /^glass$/],
  ['brick', /brick|clinker|terracotta|tile-/],
  ['wood', /pine|oak|larch|walnut|teak|mahogany|sandal|rosewood|wood|cedar|ash|tree|root/],
  ['metal', /steel|iron|bronze|copper|silver|gold|titan|brass|platinum|mithril|orichalc|iridium|osmium|adamant|neutron/],
  ['concrete', /concrete/],
  ['marble', /marble|alabaster|onyx/],
];
export function familyOf(MB, id) {
  const m = MB.MATERIAL[id];
  if (m && m.accent) return 'gem';
  const name = id.replace('ladder-', '');
  for (let i = 0; i < FAMILY_RULES.length; i++) if (FAMILY_RULES[i][1].test(name)) return FAMILY_RULES[i][0];
  return 'stone';
}

const NEUTRAL = [0.6, 0.6, 0.6];
export const FAMILY_TEX = {
  stone: { mat: 'ashlar', base: NEUTRAL, course: 2 / 6 },
  brick: { mat: 'brick', base: NEUTRAL, course: 2 / 27 },
  wood: { mat: 'logs', base: NEUTRAL, course: 0.2 },
  metal: { mat: 'riveted', base: NEUTRAL, course: 0.5 },
  concrete: { mat: 'formwork', base: NEUTRAL, course: 0.5 },
  marble: { mat: 'marble', base: [0.7, 0.7, 0.7], course: 1 },
  gem: { mat: 'paint', base: [1, 1, 1], course: 0.5 },
  // стекло стеной (не окном) в уровнях 1–12 не встречается — на всякий случай гладкий блок
  glass: { mat: 'paint', base: [1, 1, 1], course: 0.5 },
  // перекрытия (building.js): дощатый пол у деревянных стен, рифлёный лист у стальных
  floor: { mat: 'planks', base: [0.45, 0.33, 0.22], course: 0.2 },
  deck: { mat: 'diamond', base: [0.5, 0.5, 0.5], course: 0.6 },
  // рамки деталей (building.js): тёсаный камень у кладки, тёмный брус у сруба
  trim: { mat: 'dressed', base: NEUTRAL, course: 0.5 },
  beam: { mat: 'planks', base: [0.45, 0.33, 0.22], course: 0.2 },
};

const _c = new THREE.Color();
export function tintOf(MB, id, family) {
  const m = MB.MATERIAL[id];
  return tintHex(m ? m.color : 0x888888, family);
}
// Оттенок вершин для цвета hex (sRGB) на кладке семейства family.
export function tintHex(hex, family) {
  _c.setHex(hex).convertSRGBToLinear();
  const base = FAMILY_TEX[family].base;
  const lin = [Math.pow(base[0], 2.2), Math.pow(base[1], 2.2), Math.pow(base[2], 2.2)];
  return [Math.min(2.2, _c.r / lin[0]), Math.min(2.2, _c.g / lin[1]), Math.min(2.2, _c.b / lin[2])];
}

// Параллакс кладки деталей (building.js): швы, кромки и стяжки уходят вглубь при взгляде вскользь. Грани
// деталей — по осям мира, развёртка — как FACES в building.js: оси u и v грани берутся из её нормали. Высота —
// в альфе нормали со знаком (textures.js, pom). Вблизи (до 9 м) и только на плоских гранях; выборки —
// textureGrad по исходным координатам (на скачках смещения мип-уровень не прыгает).
const POM_HEAD = /* glsl */ `
uniform vec2 uPomTile;
uniform float uPomRange;
`;
const POM_BLOCK = /* glsl */ `
vec2 mbUv = vMapUv;
vec2 mbDx = dFdx(vMapUv), mbDy = dFdy(vMapUv);
{
  vec3 an = abs(vWNrm);
  float flatF = step(0.985, max(an.x, max(an.y, an.z)));
  float pk = flatF * (1.0 - smoothstep(4.0, 9.0, length(cameraPosition - vWPos)));
  if (pk > 0.01) {
    vec3 U, W;
    if (an.x > an.y && an.x > an.z) { U = vec3(0.0, 0.0, -sign(vWNrm.x)); W = vec3(0.0, 1.0, 0.0); }
    else if (an.y > an.z) { U = vec3(1.0, 0.0, 0.0); W = vec3(0.0, 0.0, -sign(vWNrm.y)); }
    else { U = vec3(sign(vWNrm.z), 0.0, 0.0); W = vec3(0.0, 1.0, 0.0); }
    vec3 Vw = normalize(cameraPosition - vWPos);
    float vn = max(dot(Vw, normalize(vWNrm)), 0.25);
    vec2 per = -vec2(dot(Vw, U) / uPomTile.x, dot(Vw, W) / uPomTile.y) / vn * pk;
    float range = 2.0 * uPomRange;
    const int ST = 12;
    float stepD = range / float(ST);
    float t = 0.0, tPrev = 0.0, dPrev = 0.0;
    float dep = (1.0 - textureGrad(normalMap, mbUv, mbDx, mbDy).a) * range;
    for (int i = 0; i < ST; i++) {
      if (t >= dep) break;
      tPrev = t; dPrev = dep;
      t += stepD;
      dep = (1.0 - textureGrad(normalMap, vMapUv + per * t, mbDx, mbDy).a) * range;
    }
    float a0 = dPrev - tPrev, a1 = dep - t;
    float tHit = mix(tPrev, t, clamp(a0 / max(a0 - a1, 1e-5), 0.0, 1.0));
    mbUv = vMapUv + per * tHit;
  }
}
`;
function pomChunk(name, from, to) { return THREE.ShaderChunk[name].split(from).join(to); }

// Материал кладки семейства (кэш по набору материалов). Цвет материала оригинала (цвет вершин) — только по
// кладке: швы (альфа фактуры 0) остаются цвета раствора. pom — с параллаксом (детали здания на «Максимуме»
// и «Ультре»).
const FAMILY_MATS = new WeakMap();
export function familyMaterial(mats, family, pom) {
  let set = FAMILY_MATS.get(mats);
  if (!set) { set = {}; FAMILY_MATS.set(mats, set); }
  const recipe = FAMILY_TEX[family].mat;
  const depth = pom ? POM[recipe] || 0 : 0;
  const key = family + (depth ? ':pom' : '');
  if (set[key]) return set[key];
  const src = mats[recipe];
  // правки неба (мокрое, снег, G-буфер) — раньше параллакса: он заменяет normal_fragment_maps, к которому они
  // цепляются, и подключённый после материал остался бы без снега и мокрого
  linkSky(src);
  const m = adoptSky(src.clone(), src);
  m.vertexColors = true;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  const tile = TILE[recipe] || [2, 2];
  m.onBeforeCompile = function (shader, renderer) {
    prev.call(this, shader, renderer);
    const uv = depth ? 'mbUv' : 'vMapUv';
    const look = depth ? 'textureGrad(map, mbUv, mbDx, mbDy)' : 'texture2D(map, vMapUv)';
    if (depth) {
      shader.uniforms.uPomTile = { value: new THREE.Vector2(tile[0], tile[1]) };
      shader.uniforms.uPomRange = { value: depth };
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + POM_HEAD)
        .replace('#include <map_fragment>', POM_BLOCK + pomChunk('map_fragment', 'texture2D( map, vMapUv )', 'textureGrad( map, mbUv, mbDx, mbDy )'))
        .replace('#include <roughnessmap_fragment>', pomChunk('roughnessmap_fragment', 'texture2D( roughnessMap, vRoughnessMapUv )', 'textureGrad( roughnessMap, mbUv, mbDx, mbDy )'))
        .replace('#include <metalnessmap_fragment>', pomChunk('metalnessmap_fragment', 'texture2D( metalnessMap, vMetalnessMapUv )', 'textureGrad( metalnessMap, mbUv, mbDx, mbDy )'))
        .replace('#include <normal_fragment_maps>', pomChunk('normal_fragment_maps', 'texture2D( normalMap, vNormalMapUv )', 'textureGrad( normalMap, mbUv, mbDx, mbDy )'))
        .replace('#include <aomap_fragment>', pomChunk('aomap_fragment', 'texture2D( aoMap, vAoMapUv )', 'textureGrad( aoMap, mbUv, mbDx, mbDy )'));
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #if defined( USE_COLOR ) && defined( USE_MAP )
        diffuseColor.rgb *= mix(vec3(1.0), vColor, ${look}.a);
        diffuseColor.a = opacity;
        // крупные пятна (повтор фактуры не читается) и пыль, осевшая на верхние грани; в мировых координатах —
        // детали стыкуются без шва
        float mbM = gNoise(vWPos.xz * 0.23 + vWPos.y * 0.17) * 0.6 + gNoise(vWPos.xz * 0.9 - vWPos.y * 0.6) * 0.4;
        diffuseColor.rgb *= 0.9 + 0.2 * mbM;
        float mbTop = smoothstep(0.55, 0.9, vWNrm.y) * (0.35 + 0.45 * gNoise(vWPos.xz * 3.1));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.46, 0.42, 0.37), mbTop * 0.3);
      #else
        #include <color_fragment>
      #endif`);
  };
  m.customProgramCacheKey = function () { return prevKey.call(this) + '|joint2' + (depth ? '|pom1' : ''); };
  // сразу с небом и выходами G-буфера (без них кадр «Максимума» не видит деталь, пока её не подключит обход сцены)
  linkSky(m);
  set[key] = m;
  return m;
}
export function familyTile(family) { return TILE[FAMILY_TEX[family].mat] || [2, 2]; }
