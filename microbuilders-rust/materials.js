// Материалы деталей. Фактуры — из textures.js (альбедо, нормаль, ORM), оттенок элемента — цвет вершин.
// Вставка «грязь»: у земли — брызги и тёмный подтёк (у основания стен и фундаментов), на вертикальных
// гранях — редкие потёки. Считается в мировых координатах, шов между деталями не виден.
import * as THREE from 'three';

const GRIME_VERTEX_HEAD = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
`;
const GRIME_VERTEX = /* glsl */ `
{
  vec4 wp4 = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  wp4 = instanceMatrix * wp4;
  #endif
  wp4 = modelMatrix * wp4;
  vWPos = wp4.xyz;
  vWNrm = normalize(mat3(modelMatrix) * objectNormal);
}
`;
const GRIME_FRAGMENT_HEAD = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
uniform float uGrime;
uniform float uGround;
uniform float uWear;
// Помещения под готовой крышей: рассеянный свет неба туда почти не доходит.
uniform vec4 uRoomXZ[6];
uniform vec3 uRoomY[6];
float roomShade() {
  float k = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 b = uRoomXZ[i];
    if (b.z <= b.x) continue;
    vec2 q = vWPos.xz;
    float inx = step(b.x, q.x) * step(q.x, b.z) * step(b.y, q.y) * step(q.y, b.w);
    float iny = step(uRoomY[i].x, vWPos.y) * step(vWPos.y, uRoomY[i].y);
    k = max(k, inx * iny * uRoomY[i].z);
  }
  return k;
}
float gHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float gNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;
const GRIME_FRAGMENT = /* glsl */ `
float mbGrime = 0.0;
{
  float n = gNoise(vWPos.xz * 2.3 + vWPos.y * 0.7) * 0.6 + gNoise(vWPos.xz * 9.0 - vWPos.y * 3.0) * 0.4;
  float ground = 1.0 - smoothstep(0.0, 0.35 + 0.45 * n, vWPos.y - uGround);
  float side = 1.0 - abs(vWNrm.y);
  float streak = smoothstep(0.6, 0.95, gNoise(vec2(dot(vWPos.xz, vec2(7.3, 5.1)), vWPos.y * 0.3))) * side;
  mbGrime = clamp(ground * 0.85 + streak * 0.3, 0.0, 1.0) * uGrime;
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.6, 0.53, 0.45), mbGrime);
}
// Износ краски (бетономешалка, мачты, тачки, трубы): сколы до тёмного металла и брызги раствора с грязью
// снизу. Шум — в плоскости, ближе всего к грани (без растяжений на боках).
float mbChip = 0.0, mbCrust = 0.0;
if (uWear > 0.0) {
  vec3 an = abs(vWNrm);
  vec2 wq = an.y > max(an.x, an.z) ? vWPos.xz : (an.x > an.z ? vWPos.zy : vWPos.xy);
  float cn = gNoise(wq * 31.0) * 0.55 + gNoise(wq * 97.0) * 0.3 + gNoise(wq * 7.0) * 0.15;
  // сколы — мелкие и редкие, вытянутые царапины по крупному шуму
  float scr = gNoise(vec2(dot(wq, vec2(0.8, 0.6)) * 140.0, dot(wq, vec2(-0.6, 0.8)) * 9.0));
  mbChip = max(smoothstep(0.76, 0.79, cn), smoothstep(0.86, 0.9, scr) * 0.7) * uWear;
  float sn = gNoise(wq * 13.0 + 5.0) * 0.6 + gNoise(wq * 53.0 + 2.0) * 0.4;
  float low = 1.0 - smoothstep(0.05, 1.1, vWPos.y - uGround);
  mbCrust = smoothstep(0.6, 0.67, sn) * low * uWear;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.17, 0.16, 0.15), mbChip);
  diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.48, 0.46, 0.42), vec3(0.3, 0.25, 0.19), step(0.5, gNoise(wq * 4.0 + 9.0))), mbCrust);
}
`;

// Общие для всех материалов коробки помещений: x0, z0, x1, z1 и (y низа, y верха, сила 0..1).
export const ROOMS = {
  xz: Array.from({ length: 6 }, function () { return new THREE.Vector4(0, 0, 0, 0); }),
  y: Array.from({ length: 6 }, function () { return new THREE.Vector3(0, 0, 0); }),
};

function withGrime(material, strength, wear) {
  material.userData.grime = { value: strength };
  material.userData.ground = { value: 0.0 };
  material.userData.wear = { value: wear || 0 };
  material.onBeforeCompile = function (shader) {
    shader.uniforms.uGrime = material.userData.grime;
    shader.uniforms.uGround = material.userData.ground;
    shader.uniforms.uWear = material.userData.wear;
    shader.uniforms.uRoomXZ = { value: ROOMS.xz };
    shader.uniforms.uRoomY = { value: ROOMS.y };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GRIME_VERTEX_HEAD)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + GRIME_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GRIME_FRAGMENT_HEAD)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + GRIME_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 1.0, mbGrime * 0.35);\nroughnessFactor = mix(mix(roughnessFactor, 0.42, mbChip), 0.95, mbCrust);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.75, mbChip) * (1.0 - mbCrust);')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n{ float rs = 1.0 - 0.82 * roomShade(); reflectedLight.indirectDiffuse *= rs; reflectedLight.indirectSpecular *= rs; }');
  };
  material.customProgramCacheKey = function () { return 'grime3'; };
  return material;
}

export function createMaterials(textures, quality) {
  const mats = {};

  function textured(name, opts = {}) {
    const t = textures.get(name);
    const m = new THREE.MeshStandardMaterial({
      map: t.map,
      normalMap: t.normalMap,
      roughnessMap: t.ormMap,
      metalnessMap: t.ormMap,
      aoMap: t.ormMap,
      aoMapIntensity: 1,
      roughness: 1,
      metalness: opts.metal ? 1 : 0,
      vertexColors: true,
      side: opts.side || THREE.FrontSide,
      envMapIntensity: opts.env || 1,
    });
    if (opts.normalScale) m.normalScale.set(opts.normalScale, opts.normalScale);
    return withGrime(m, opts.grime === undefined ? 1 : opts.grime);
  }

  mats.planks = textured('planks');
  mats.bark = textured('bark', { grime: 0.6 });
  mats.birch = textured('birch', { grime: 0.3 });
  mats.stone = textured('stone', { normalScale: 1.5 });
  mats.mortar = textured('mortar');
  mats.concrete = textured('concrete');
  mats.zinc = textured('zinc', { metal: true, side: THREE.DoubleSide, grime: 0.6 });
  mats.paintsheet = textured('paintsheet', { metal: true, side: THREE.DoubleSide, grime: 0.6 });
  mats.steelplate = textured('steelplate', { metal: true, grime: 0.7 });
  mats.diamond = textured('diamond', { metal: true, grime: 0.5 });
  mats.shingles = textured('shingles', { grime: 0 });
  mats.slate = textured('slate', { grime: 0 });
  mats.rope = textured('rope', { grime: 0.3 });
  // гвозди, болты, петли, сварка — без фактур
  mats.steel = withGrime(new THREE.MeshStandardMaterial({ color: 0x55585c, metalness: 0.9, roughness: 0.42, vertexColors: true }), 0.4);
  mats.blacksteel = withGrime(new THREE.MeshStandardMaterial({ color: 0x232323, metalness: 0.75, roughness: 0.55, vertexColors: true }), 0.4, 0.5);
  mats.tube = withGrime(new THREE.MeshStandardMaterial({ color: 0x5d6268, metalness: 0.55, roughness: 0.5, vertexColors: true }), 0.6, 0.7);
  mats.string = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.8, vertexColors: true });
  mats.paint = withGrime(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.0, vertexColors: true }), 0.5);
  // крашеный металл техники: сколы и брызги раствора
  mats.paintworn = withGrime(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0, vertexColors: true }), 0.5, 1);
  mats.rubber = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.85, metalness: 0.0, vertexColors: true });

  if (quality.glass === 'physical') {
    mats.glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.006, ior: 1.52,
      envMapIntensity: 1.2, side: THREE.DoubleSide, attenuationColor: new THREE.Color(0xd9efe8), attenuationDistance: 0.4,
    });
  } else {
    mats.glass = new THREE.MeshStandardMaterial({
      color: 0x96acb5, metalness: 0.1, roughness: 0.06, transparent: true, opacity: 0.32, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
    });
  }

  // стекло под дождём не темнеет (WET_FRAGMENT, world.js)
  mats.glass.defines = Object.assign(mats.glass.defines || {}, { MB_DRY: '' });
  mats.tile = function (name) { return textures.get(name).tile; };
  return mats;
}
