// Фактуры квартала штаба кодом на видеокарте — тем же способом, что textures.js (высота → альбедо, нормаль, ORM):
// асфальт бульвара, плиты тротуаров, брусчатка площадок и участков, листва живой изгороди. Рецепт — три функции
// GLSL: H(uv) → x — высота в метрах, yzw — маски; A(uv, h, cav) → альбедо (линейное); RM(uv, h, cav) →
// шероховатость и металл. tile — сколько метров в плитке фактуры (геометрия делит свои координаты на него).
import * as THREE from 'three';
import { NOISE } from './glsl.js?v=45127fe';

const RECIPES = {};

// Асфальт: щебень заполнителя 5–15 мм (вытерт до камня местами), песок, редкие волосяные трещины сеткой,
// заплаты свежего асфальта (темнее и глаже) со швом по краю, масляные пятна.
RECIPES.asphalt = {
  tile: [4.0, 4.0], cav: 220, ao: 0.9, big: true, glsl: `
  vec4 H(vec2 uv) {
    vec4 a = voronoi(uv * 300.0, vec2(300.0));
    float ra = 0.32 + 0.35 * fract(a.z * 13.7);
    float stone = step(0.42, a.z) * sat(1.0 - a.x / ra);
    vec4 b = voronoi(uv * 700.0 + 3.1, vec2(700.0));
    float fine = step(0.5, b.z) * sat(1.0 - b.x * 2.4);
    float patchN = fbm(uv * 2.0 + 4.3, vec2(2.0), 5);
    float patchM = smoothstep(0.2, 0.24, patchN);
    float seam = 1.0 - smoothstep(0.0, 0.012, abs(patchN - 0.22));
    vec4 c = voronoi(uv * 5.0 + 1.7, vec2(5.0));
    float zone = sat(fbm(uv * 3.0 + 9.0, vec2(3.0), 4) * 3.0 - 0.35) * (1.0 - patchM);
    float wig = fbm(uv * 60.0, vec2(60.0), 3) * 0.035;
    float crack = (1.0 - smoothstep(0.004, 0.016, abs(c.w + wig))) * zone;
    crack = max(crack, seam * 0.8);
    float h = (0.0028 * stone + 0.0011 * fine) * (1.0 - 0.65 * patchM) + 0.0007 * gnoise(uv * 160.0, vec2(160.0)) - 0.004 * crack;
    return vec4(h, stone * (1.0 - patchM), crack, patchM);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float big = fbm(uv * 3.0 + 1.0, vec2(3.0), 5);
    vec3 bind = mix(vec3(0.24, 0.24, 0.25), vec3(0.31, 0.305, 0.3), sat(big + 0.5));
    bind = mix(bind, bind * 0.86, h.w);
    float sid = fract(h.y * 91.7 + floor(uv.x * 300.0) * 0.37 + floor(uv.y * 300.0) * 0.71);
    vec3 st = mix(vec3(0.42, 0.41, 0.39), vec3(0.55, 0.52, 0.47), sid);
    st = mix(st, vec3(0.33, 0.32, 0.33), step(0.8, sid));
    vec3 c = mix(bind, st, h.y * 0.75);
    float oil = smoothstep(0.42, 0.58, fbm(uv * 4.0 + 17.0, vec2(4.0), 5)) * (1.0 - h.w);
    c *= 1.0 - 0.08 * oil;
    c = mix(c, vec3(0.12, 0.12, 0.12), h.z * 0.7);
    c *= 1.0 - 0.4 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) {
    float oil = smoothstep(0.42, 0.58, fbm(uv * 4.0 + 17.0, vec2(4.0), 5)) * (1.0 - h.w);
    return vec2(0.9 - 0.14 * h.y - 0.2 * oil - 0.06 * h.w, 0.0);
  }
  `,
};

// Плиты тротуара: бетон 0,5 × 0,5 м, шов 6 мм с песком, у каждой плиты свой тон и чуть свой наклон, сколы по
// кромкам, пятна, редкий мох в швах.
RECIPES.slabs = {
  tile: [2.0, 2.0], cav: 260, ao: 0.9, glsl: `
  vec4 H(vec2 uv) {
    vec2 p = uv * 4.0; vec2 cell = floor(p); vec2 f = fract(p);
    vec2 cm = mod(cell, vec2(4.0));
    vec2 e = min(f, 1.0 - f) * 0.5;
    float chip = smoothstep(0.55, 0.8, gnoise(uv * 90.0, vec2(90.0))) * 0.006;
    float edge = min(e.x, e.y) - chip;
    float body = smoothstep(0.003, 0.008, edge);
    vec2 tilt = (hash22(cm + 7.0) - 0.5) * 0.006;
    float h = body * (0.006 + dot(f - 0.5, tilt)) + body * 0.0005 * gnoise(uv * 400.0, vec2(400.0));
    return vec4(h, body, hash12(cm + 3.0), 0.0);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = mix(vec3(0.6, 0.585, 0.55), vec3(0.7, 0.68, 0.64), h.z);
    c *= 0.9 + 0.12 * fbm(uv * 9.0, vec2(18.0), 4);
    float stain = smoothstep(0.3, 0.55, fbm(uv * 2.0 + 5.0, vec2(2.0), 5));
    c = mix(c, c * vec3(0.78, 0.76, 0.72), stain * 0.6);
    vec3 joint = mix(vec3(0.42, 0.38, 0.31), vec3(0.22, 0.27, 0.13), smoothstep(0.25, 0.5, fbm(uv * 6.0 + 2.0, vec2(12.0), 4)));
    c = mix(joint, c, h.y);
    c *= 1.0 - 0.4 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(mix(0.97, 0.86, h.y), 0.0); }
  `,
};

// Брусчатка: вибропрессованный камень 200 × 100 мм вперевязку, шов 4 мм; серый с вкраплениями графитового и
// тёплого, фаска по кромкам, вытертые серединки, песок в швах.
RECIPES.pavers = {
  tile: [1.6, 1.6], cav: 300, ao: 0.9, big: true, glsl: `
  vec4 H(vec2 uv) {
    vec2 p = uv * vec2(8.0, 16.0);
    float row = floor(p.y);
    p.x += mod(row, 2.0) * 0.5;
    vec2 cell = floor(p); vec2 f = fract(p);
    vec2 e = min(f, 1.0 - f) * vec2(0.2, 0.1);
    float edge = min(e.x, e.y);
    float body = smoothstep(0.0015, 0.0035, edge);
    float bevel = smoothstep(0.0015, 0.007, edge);
    vec2 cm = mod(cell, vec2(8.0, 16.0));
    float id = hash12(cm + 1.0);
    float h = body * (0.004 + 0.002 * bevel + (hash12(cm + 9.0) - 0.5) * 0.0015) + body * 0.0004 * gnoise(uv * 500.0, vec2(500.0));
    return vec4(h, body, id, bevel);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float id = h.z;
    // светлый песочно-серый камень (как мощение участков оригинала), партии чуть разного тона, редкие тёмные
    vec3 c = mix(vec3(0.66, 0.62, 0.55), vec3(0.72, 0.68, 0.61), fract(id * 7.1));
    c = mix(c, vec3(0.6, 0.56, 0.5), step(0.86, id) * 0.8);
    c *= 0.94 + 0.08 * gnoise(uv * 260.0, vec2(260.0));
    c *= 0.95 + 0.06 * fbm(uv * 3.0 + 2.0, vec2(3.0), 4);
    c *= mix(0.95, 1.02, h.w);
    vec3 joint = vec3(0.5, 0.46, 0.39);
    c = mix(joint, c, h.y);
    c *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(mix(0.96, 0.8 + 0.08 * h.w, h.y), 0.0); }
  `,
};

// Листва стриженой изгороди (самшит, бирючина): три слоя мелких листьев 2–3 см, глубокие тёмные просветы.
RECIPES.hedge = {
  tile: [1.0, 1.0], cav: 140, ao: 1.0, glsl: `
  vec4 H(vec2 uv) {
    float best = -1.0, id = 0.0;
    for (int L = 0; L < 3; L++) {
      float sc = L == 0 ? 34.0 : (L == 1 ? 47.0 : 61.0);
      vec2 p = uv * sc; vec2 i = floor(p); vec2 f = fract(p);
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 o = vec2(float(x), float(y));
        vec3 hs = hash32(mod(i + o, vec2(sc)) + float(L) * 17.0);
        vec2 cp = o + hs.xy - f;
        float ang = hs.z * 6.2832; vec2 d = vec2(cos(ang), sin(ang));
        float a = dot(cp, d), b = dot(cp, vec2(-d.y, d.x));
        float r = a * a / 0.36 + b * b / 0.1;
        if (r < 1.0) {
          float hv = (1.0 - r) * 0.5 + 0.5 - float(L) * 0.28;
          if (hv > best) { best = hv; id = fract(hs.z * 7.3 + float(L) * 0.31); }
        }
      }
    }
    float h = best > 0.0 ? 0.012 * best : -0.006;
    return vec4(h, step(0.0, best), id, sat(best));
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = mix(vec3(0.17, 0.29, 0.09), vec3(0.27, 0.4, 0.13), h.z);
    c = mix(c, vec3(0.38, 0.45, 0.16), step(0.9, h.z) * 0.8);
    c *= 0.7 + 0.45 * h.w;
    c *= 0.85 + 0.25 * fbm(uv * 4.0, vec2(4.0), 4);
    c = mix(vec3(0.03, 0.045, 0.02), c, h.y);
    c *= 1.0 - 0.5 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(mix(1.0, 0.62, h.y), 0.0); }
  `,
};

// метров в плитке фактур квартала (развёртка геометрии делит на них)
export const CITY_TILES = Object.fromEntries(Object.entries(RECIPES).map(function ([k, r]) { return [k, r.tile]; }));

const PASS_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const PASS_COMMON = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tH;
uniform vec2 uTexel;
uniform vec2 uTileM;
uniform float uCavK;
uniform float uAoK;
float cavity(vec2 uv) {
  float h = texture2D(tH, uv).x; float s = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 o = vec2(cos(a), sin(a)) * uTexel;
    s += texture2D(tH, uv + o * 3.0).x + texture2D(tH, uv + o * 10.0).x;
  }
  return (s / 16.0 - h) * uCavK;
}
`;
function passMaterial(recipe, kind, uniforms) {
  let main;
  if (kind === 'height') main = 'void main() { gl_FragColor = H(vUv); }';
  else if (kind === 'albedo') main = 'void main() { vec4 h = texture2D(tH, vUv); gl_FragColor = vec4(A(vUv, h, cavity(vUv)), 1.0); }';
  else if (kind === 'normal') main = `void main() {
    float hl = texture2D(tH, vUv - vec2(uTexel.x, 0.0)).x, hr = texture2D(tH, vUv + vec2(uTexel.x, 0.0)).x;
    float hd = texture2D(tH, vUv - vec2(0.0, uTexel.y)).x, hu = texture2D(tH, vUv + vec2(0.0, uTexel.y)).x;
    vec2 texM = uTileM * uTexel;
    vec3 n = normalize(vec3(-(hr - hl) / (2.0 * texM.x), -(hu - hd) / (2.0 * texM.y), 1.0));
    gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
  }`;
  else main = `void main() {
    vec4 h = texture2D(tH, vUv); float cav = cavity(vUv);
    vec2 rm = RM(vUv, h, cav);
    float ao = clamp(1.0 - max(cav, 0.0) * uAoK, 0.3, 1.0);
    gl_FragColor = vec4(ao, clamp(rm.x, 0.04, 1.0), clamp(rm.y, 0.0, 1.0), 1.0);
  }`;
  return new THREE.ShaderMaterial({ uniforms, vertexShader: PASS_VERTEX, fragmentShader: NOISE + PASS_COMMON + recipe.glsl + main, depthTest: false, depthWrite: false });
}

// size — сторона «больших» фактур (на телефоне 512: квартал — фон, памяти фактур на телефоне мало).
export function createCityTextures(renderer, size) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  scene.add(quad);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const sets = {};
  function target(n, srgb) {
    const rt = new THREE.WebGLRenderTarget(n, n, {
      type: THREE.UnsignedByteType, colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace, generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, depthBuffer: false,
    });
    rt.texture.anisotropy = aniso;
    return rt;
  }
  function draw(material, rt) { quad.material = material; renderer.setRenderTarget(rt); renderer.render(scene, camera); }
  function make(name) {
    const recipe = RECIPES[name];
    const n = recipe.big ? size : Math.max(256, size / 2);
    const targets = { albedo: target(n, true), normal: target(n, false), orm: target(n, false) };
    const h = new THREE.WebGLRenderTarget(n, n, { type: THREE.HalfFloatType, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false });
    const uniforms = { tH: { value: h.texture }, uTexel: { value: new THREE.Vector2(1 / n, 1 / n) }, uTileM: { value: new THREE.Vector2(recipe.tile[0], recipe.tile[1]) },
      uCavK: { value: recipe.cav }, uAoK: { value: recipe.ao } };
    const mats = ['height', 'albedo', 'normal', 'orm'].map(function (kind) { return passMaterial(recipe, kind, uniforms); });
    const prev = renderer.getRenderTarget();
    draw(mats[0], h); draw(mats[1], targets.albedo); draw(mats[2], targets.normal); draw(mats[3], targets.orm);
    renderer.setRenderTarget(prev);
    mats.forEach(function (m) { m.dispose(); });
    h.dispose();
    sets[name] = { tile: recipe.tile, map: targets.albedo.texture, normalMap: targets.normal.texture, ormMap: targets.orm.texture, targets };
    return sets[name];
  }
  return {
    get: function (name) { return sets[name] || make(name); },
    tile: function (name) { return RECIPES[name].tile; },
    dispose: function () { Object.keys(sets).forEach(function (k) { Object.values(sets[k].targets).forEach(function (t) { t.dispose(); }); }); quad.geometry.dispose(); },
  };
}
