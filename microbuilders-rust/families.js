// Семейства материалов оригинала: материал (MB.MATERIAL) задаёт только цвет и массу — по имени видно, камень
// это, кирпич, дерево или металл. Семейство → кладка (рецепт textures.js), её средний тон (тон материала
// делится на него — получается оттенок вершин) и высота ряда (недостроенная деталь растёт рядами).
// Общие для здания, двора и ноши рабочих.
import { TEXTURE_TILES as TILE } from './textures.js?v=0c1cc5f';
import { adoptSky, linkSky } from './world.js?v=0c1cc5f';
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
  trim: { mat: 'concrete', base: NEUTRAL, course: 0.5 },
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

// Материал кладки семейства (кэш по набору материалов). Цвет материала оригинала (цвет вершин) — только по
// кладке: швы (альфа фактуры 0) остаются цвета раствора.
const FAMILY_MATS = new WeakMap();
export function familyMaterial(mats, family) {
  let set = FAMILY_MATS.get(mats);
  if (!set) { set = {}; FAMILY_MATS.set(mats, set); }
  if (set[family]) return set[family];
  const src = mats[FAMILY_TEX[family].mat];
  const m = adoptSky(src.clone(), src);
  m.vertexColors = true;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (shader, renderer) {
    prev.call(this, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #if defined( USE_COLOR ) && defined( USE_MAP )
        diffuseColor.rgb *= mix(vec3(1.0), vColor, texture2D(map, vMapUv).a);
        diffuseColor.a = opacity;
      #else
        #include <color_fragment>
      #endif`);
  };
  m.customProgramCacheKey = function () { return prevKey.call(this) + '|joint1'; };
  // сразу с небом и выходами G-буфера (без них кадр «Максимума» не видит деталь, пока её не подключит обход сцены)
  linkSky(m);
  set[family] = m;
  return m;
}
export function familyTile(family) { return TILE[FAMILY_TEX[family].mat] || [2, 2]; }
