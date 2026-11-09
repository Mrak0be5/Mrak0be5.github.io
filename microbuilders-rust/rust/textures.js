// PBR-фактуры кодом на видеокарте. У каждого рецепта три функции GLSL:
//   H(uv)              → x — высота рельефа в метрах, yzw — маски для цвета и шероховатости;
//   A(uv, h, cav)      → альбедо (линейное);
//   RM(uv, h, cav)     → шероховатость и металличность.
// Проходы: высота (HalfFloat) → альбедо (sRGB8 с мипмапами), нормаль из высоты (наклон в метрах на метр,
// физически верная крутизна), ORM (R — затенение впадин, G — шероховатость, B — металл, как в glTF).
// tile — сколько метров укладывается в фактуру по u и v: геометрия сама делит на это свои координаты.
import * as THREE from 'three';
import { NOISE } from './glsl.js?v=45127fe';

const RECIPES = {};

// Доски: атлас из 8 досок 3 × 0,2 м (строка — одна доска). Сосна, поздние годичные слои, сучки, усушечные
// трещины, серая выветренность, плесень у кромок.
RECIPES.planks = {
  tile: [3.0, 1.6], cav: 900, ao: 0.9, glsl: `
  vec4 H(vec2 uv) {
    float r = floor(uv.y * 8.0); float ly = fract(uv.y * 8.0); float x = uv.x * 15.0;
    vec2 s = hash22(vec2(r, 7.0)) * 100.0;
    float warp = fbm(vec2(x * 0.32, ly * 1.4) + s, vec2(1e4), 4);
    float rc = (ly - 0.5) * (2.0 + 1.6 * hash11(r + 0.5)) + warp * 0.95 + 0.22 * sin(x * 0.55 + s.x);
    float knot = 0.0, kwarp = 0.0;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      if (hash11(r * 2.3 + fk * 4.1) > 0.6) continue;
      vec2 kp = vec2(hash11(r * 3.1 + fk) * 15.0, 0.15 + 0.7 * hash11(r * 7.7 + fk * 1.3));
      float kr = 0.035 + 0.07 * hash11(r * 1.9 + fk * 5.1);
      vec2 d = vec2((x - kp.x) * 1.0, ly - kp.y);
      float dist = length(d);
      kwarp += exp(-dist * dist / (kr * kr * 7.0)) * 1.4;
      knot = max(knot, 1.0 - smoothstep(kr * 0.65, kr, dist));
    }
    rc += kwarp;
    float ring = fract(rc * 6.5);
    float late = smoothstep(0.5, 0.88, ring) * (1.0 - smoothstep(0.9, 1.0, ring));
    float fiber = gnoise(vec2(x * 40.0, ly * 110.0) + s, vec2(1e4)) * 0.5 + gnoise(vec2(x * 130.0, ly * 420.0) + s, vec2(1e4)) * 0.3;
    float crack = 0.0;
    for (int c = 0; c < 2; c++) {
      float fc = float(c);
      float cy = 0.12 + 0.76 * hash11(r * 5.3 + fc * 2.7);
      float cx0 = hash11(r * 9.1 + fc * 3.3) * 12.0; float len = 1.0 + 3.5 * hash11(r * 4.4 + fc);
      float along = smoothstep(cx0, cx0 + 0.4, x) * (1.0 - smoothstep(cx0 + len - 0.4, cx0 + len, x));
      float wob = 0.005 * sin(x * 7.0 + s.y + fc * 3.0) + 0.003 * gnoise(vec2(x * 3.0, fc), vec2(1e4));
      crack = max(crack, along * (1.0 - smoothstep(0.0, 0.007 * (0.5 + along), abs(ly - cy - wob))));
    }
    float edge = smoothstep(0.0, 0.035, ly) * smoothstep(0.0, 0.035, 1.0 - ly);
    float saw = 0.5 + 0.5 * sin(x * 260.0 + ly * 30.0 * sin(x * 0.7));
    float h = 0.00035 * late + 0.00012 * fiber - 0.0014 * crack + 0.0005 * knot - 0.0018 * (1.0 - edge) + 0.00004 * saw;
    return vec4(h, late, knot, crack);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float r = floor(uv.y * 8.0); float ly = fract(uv.y * 8.0); float x = uv.x * 15.0;
    float fresh = hash11(r * 3.7 + 0.2);
    vec3 pine = mix(vec3(0.62, 0.46, 0.29), vec3(0.71, 0.55, 0.37), hash11(r * 1.1));
    vec3 lateC = pine * vec3(0.70, 0.58, 0.47);
    vec3 grey = vec3(0.47, 0.45, 0.42) * (0.88 + 0.22 * hash11(r * 8.3));
    float weather = sat(0.15 + 0.6 * (1.0 - fresh) + 0.45 * fbm(vec2(x * 0.35, ly * 2.0) + r * 13.0, vec2(1e4), 4));
    vec3 c = mix(pine, lateC, h.y * 0.9);
    c *= 0.9 + 0.1 * gnoise(vec2(x * 28.0, ly * 95.0) + r, vec2(1e4));
    c = mix(c, grey * (0.92 + 0.12 * h.y), weather * 0.8);
    c = mix(c, vec3(0.28, 0.17, 0.10), h.z * 0.92);
    c *= 1.0 - 0.65 * h.w;
    c *= 1.0 - 0.35 * sat(cav * 2.5);
    float mold = sat(fbm(vec2(x * 1.4, ly * 5.0) + r * 7.0, vec2(1e4), 5) * 1.6 - 0.3) * (1.0 - smoothstep(0.0, 0.3, min(ly, 1.0 - ly)));
    c = mix(c, vec3(0.30, 0.31, 0.26), mold * 0.55);
    float spot = sat(fbm(vec2(x * 4.0, ly * 12.0) + r * 3.0, vec2(1e4), 4) * 2.5 - 0.9);
    c *= 1.0 - 0.25 * spot;
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.74 + 0.1 * h.y + 0.12 * h.w + 0.05 * sat(cav), 0.0); }
  `,
};

// Кора жердей (сосна, ель): продольные волокна и тонкие трещины, светлые чечевички, сучки, лишайник.
// u — по окружности (период 1), v — вдоль, 0,5 м на период.
RECIPES.bark = {
  tile: [0.25, 0.5], cav: 700, ao: 0.8, glsl: `
  vec4 H(vec2 uv) {
    float streak = fbm(vec2(uv.x * 24.0, uv.y * 2.0), vec2(24.0, 2.0), 5);
    float crack = smoothstep(0.62, 0.9, gnoise(vec2(uv.x * 36.0, uv.y * 3.0), vec2(36.0, 3.0)) * 0.5 + 0.5);
    vec4 l = voronoi(uv * vec2(10.0, 30.0), vec2(10.0, 30.0));
    float lent = (1.0 - smoothstep(0.05, 0.16, l.x)) * step(0.72, l.z);
    vec4 kn = voronoi(uv * vec2(3.0, 2.0), vec2(3.0, 2.0));
    float knot = (1.0 - smoothstep(0.04, 0.12, kn.x)) * step(0.82, kn.z);
    float h = 0.0004 * streak - 0.0008 * crack + 0.0002 * lent + 0.0007 * knot;
    return vec4(h, crack, lent, knot);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float streak = fbm(vec2(uv.x * 24.0, uv.y * 2.0), vec2(24.0, 2.0), 5);
    vec3 base = mix(vec3(0.43, 0.37, 0.30), vec3(0.56, 0.50, 0.42), sat(streak * 1.2 + 0.5));
    base = mix(base, vec3(0.25, 0.20, 0.16), h.y * 0.7);
    base = mix(base, vec3(0.66, 0.60, 0.50), h.z * 0.45);
    base = mix(base, vec3(0.30, 0.20, 0.13), h.w * 0.8);
    float lich = sat(fbm(uv * vec2(5.0, 6.0) + 4.0, vec2(5.0, 6.0), 5) * 2.4 - 0.7);
    base = mix(base, vec3(0.55, 0.57, 0.45), lich * 0.4);
    base *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(base);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.84, 0.0); }
  `,
};

// Камень (известняк-ракушечник): волнистая поверхность, зерно, слоистость, редкие волосяные трещины, мелкие
// каверны, железистые разводы и лишайник.
RECIPES.stone = {
  tile: [2.0, 2.0], cav: 260, ao: 1.0, big: true, glsl: `
  vec4 H(vec2 uv) {
    float big = fbm(uv * 3.0, vec2(3.0), 5);
    float med = fbm(uv * 14.0 + 3.1, vec2(14.0), 5);
    float small = fbm(uv * 60.0 + 7.7, vec2(60.0), 4);
    float grain = gnoise(uv * 300.0, vec2(300.0)) * 0.6 + gnoise(uv * 700.0, vec2(700.0)) * 0.4;
    vec4 pit = voronoi(uv * 140.0, vec2(140.0));
    float pits = (1.0 - smoothstep(0.0, 0.35, pit.x)) * step(0.82, pit.z) * smoothstep(-0.2, 0.3, small);
    float h = 0.010 * big + 0.004 * med + 0.0015 * small + 0.00045 * grain - 0.0012 * pits;
    return vec4(h, pits, small, big);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 a = vec3(0.58, 0.55, 0.49), b = vec3(0.46, 0.44, 0.41), w = vec3(0.62, 0.53, 0.41);
    float m = sat(fbm(uv * 6.0 + 7.0, vec2(6.0), 5) * 1.2 + 0.5);
    vec3 col = mix(b, a, m);
    col = mix(col, w, sat(fbm(uv * 3.0 + 11.0, vec2(3.0), 5) * 1.5) * 0.45);
    float g1 = gnoise(uv * 520.0, vec2(520.0));
    col *= 0.92 + 0.14 * smoothstep(-0.6, 0.6, g1);
    // зерно мягкое: редкие тёмные и светлые крупинки размыты шумом, без «перца»
    float sp = gnoise(uv * 900.0, vec2(900.0)) * 0.5 + 0.5;
    col *= 1.0 - 0.12 * smoothstep(0.82, 0.95, sp) + 0.08 * (1.0 - smoothstep(0.05, 0.18, sp));
    // следы тёски: тонкие параллельные бороздки по слоям
    float tool = smoothstep(0.55, 0.95, abs(sin((uv.x * 0.6 + uv.y) * 260.0 + 3.0 * gnoise(uv * 20.0, vec2(20.0)))));
    col *= 1.0 - 0.05 * tool * sat(fbm(uv * 4.0 + 31.0, vec2(4.0), 4) + 0.6);
    float iron = sat(fbm(uv * vec2(5.0, 2.5) + 5.0, vec2(5.0, 2.5), 6) * 1.8 - 0.65);
    col = mix(col, vec3(0.50, 0.38, 0.27), iron * 0.35);
    float dirt = sat(fbm(uv * 9.0 + 2.0, vec2(9.0), 5) * 2.0 - 0.3);
    col *= 1.0 - 0.18 * dirt;
    float lich = sat(fbm(uv * 12.0 + 21.0, vec2(12.0), 5) * 2.8 - 1.2);
    col = mix(col, vec3(0.60, 0.61, 0.48), lich * 0.35);
    col *= 1.0 - 0.35 * h.y;
    col *= 1.0 - 0.45 * sat(cav * 2.0);
    return srgb(col);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.9 + 0.05 * h.y, 0.0); }
  `,
};

// Раствор кладки: песчаная крупка, тёмные зёрна.
RECIPES.mortar = {
  tile: [1.0, 1.0], cav: 600, ao: 0.8, glsl: `
  vec4 H(vec2 uv) {
    float g = fbm(uv * 30.0, vec2(30.0), 5);
    vec4 v = voronoi(uv * 160.0, vec2(160.0));
    float grain = (1.0 - smoothstep(0.1, 0.45, v.x));
    return vec4(0.0006 * g + 0.00025 * grain, grain, v.z, g);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = vec3(0.52, 0.50, 0.47) * (0.9 + 0.14 * h.w);
    c = mix(c, vec3(0.40, 0.38, 0.35), h.y * step(0.7, h.z) * 0.8);
    c = mix(c, vec3(0.75, 0.72, 0.66), h.y * step(h.z, 0.15) * 0.6);
    c *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.93, 0.0); }
  `,
};

// Бетон: поры, заполнитель, пятна воды и высолы.
RECIPES.concrete = {
  tile: [3.0, 3.0], cav: 500, ao: 0.9, big: true, glsl: `
  vec4 H(vec2 uv) {
    float big = fbm(uv * 3.0, vec2(3.0), 6);
    vec4 por = voronoi(uv * 140.0, vec2(140.0));
    float pores = (1.0 - smoothstep(0.0, 0.16, por.x)) * step(0.7, por.z);
    vec4 agg = voronoi(uv * 60.0, vec2(60.0));
    float aggr = smoothstep(0.35, 0.0, agg.x) * step(0.55, agg.z);
    float grain = gnoise(uv * 500.0, vec2(500.0));
    float h = 0.0012 * big - 0.0012 * pores + 0.00025 * aggr + 0.00005 * grain;
    return vec4(h, pores, aggr, big);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = vec3(0.56, 0.55, 0.53);
    c *= 0.9 + 0.14 * sat(fbm(uv * 5.0 + 3.0, vec2(5.0), 6) + 0.5);
    float stain = sat(fbm(uv * vec2(2.0, 1.0) + 9.0, vec2(2.0, 1.0), 6) * 1.8 - 0.25);
    c = mix(c, vec3(0.42, 0.40, 0.37), stain * 0.5);
    float salt = sat(fbm(uv * 4.0 + 17.0, vec2(4.0), 5) * 2.5 - 0.95);
    c = mix(c, vec3(0.70, 0.69, 0.66), salt * 0.4);
    c = mix(c, c * vec3(0.92, 0.88, 0.84), h.z * 0.7);
    c *= 1.0 - 0.28 * h.y;
    // следы опалубки и разводы затирки
    float board = smoothstep(0.0, 0.02, abs(fract(uv.y * 6.0) - 0.5) - 0.48);
    c *= 1.0 - 0.04 * board;
    c *= 0.97 + 0.06 * sat(fbm(vec2(uv.x * 2.0 + uv.y * 7.0, uv.y * 2.0 - uv.x * 5.0) + 41.0, vec2(2.0), 4) + 0.5);
    c *= 1.0 - 0.25 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.9 + 0.05 * h.y, 0.0); }
  `,
};

// Оцинкованный профлист: кристаллы цинка, тусклые пятна окисла, ржавчина снизу и потёками сверху вниз.
RECIPES.zinc = {
  tile: [3.0, 3.0], cav: 400, ao: 0.6, big: true, glsl: `
  float rustMask(vec2 uv) {
    float n = fbm(uv * vec2(4.0, 3.0) + 2.0, vec2(4.0, 3.0), 6);
    float streak = fbm(vec2(uv.x * 36.0, uv.y * 1.0) + 5.0, vec2(36.0, 1.0), 4);
    float bottom = 1.0 - smoothstep(0.0, 0.3, uv.y);
    return sat(n * 1.6 + bottom * 0.75 + streak * 0.55 - 0.42);
  }
  vec4 H(vec2 uv) {
    float rm = rustMask(uv);
    vec4 sp = voronoi(uv * vec2(110.0), vec2(110.0));
    float pit = gnoise(uv * 400.0, vec2(400.0));
    float h = 0.00025 * rm * (0.6 + 0.4 * fbm(uv * 60.0, vec2(60.0), 4)) + 0.00003 * pit;
    return vec4(h, rm, sp.z, sat(fbm(uv * 6.0 + 9.0, vec2(6.0), 5) + 0.4));
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 zinc = vec3(0.55, 0.57, 0.59) * (0.9 + 0.12 * h.z);
    vec3 oxid = vec3(0.46, 0.48, 0.49);
    vec3 rust = mix(vec3(0.46, 0.23, 0.10), vec3(0.28, 0.14, 0.07), sat(fbm(uv * 30.0, vec2(30.0), 4) + 0.5));
    vec3 c = mix(zinc, oxid, sat(h.w * 1.2 - 0.3));
    float streak = sat(fbm(vec2(uv.x * 50.0, uv.y * 1.5) + 1.0, vec2(50.0, 1.5), 4) * 1.5);
    c *= 1.0 - 0.18 * streak;
    c = mix(c, rust, smoothstep(0.15, 0.7, h.y));
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) {
    float r = smoothstep(0.15, 0.7, h.y);
    return vec2(mix(0.38 + 0.18 * h.w, 0.88, r), mix(0.85, 0.05, r) - 0.15 * h.w);
  }
  `,
};

// Крашеный профлист (краска «под кирпич»): сколы до цинка, ржавые подтёки, выгоревшая краска сверху.
RECIPES.paintsheet = {
  tile: [3.0, 3.0], cav: 400, ao: 0.6, big: true, glsl: `
  vec4 H(vec2 uv) {
    float chip = sat(fbm(uv * 9.0 + 3.0, vec2(9.0), 6) * 2.4 - 0.75);
    float bottom = 1.0 - smoothstep(0.0, 0.25, uv.y);
    float rust = sat(fbm(uv * vec2(5.0, 2.0) + 8.0, vec2(5.0, 2.0), 5) * 1.6 + bottom * 0.8 - 0.65);
    float h = 0.00012 * (1.0 - chip) + 0.0002 * rust;
    return vec4(h, chip, rust, fbm(uv * 3.0, vec2(3.0), 5));
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 paint = vec3(0.47, 0.17, 0.12) * (0.92 + 0.12 * h.w);
    float fade = sat(uv.y * 0.6 + fbm(uv * 2.0 + 4.0, vec2(2.0), 4) * 0.4);
    paint = mix(paint, vec3(0.56, 0.33, 0.28), fade * 0.35);
    vec3 c = mix(paint, vec3(0.6, 0.62, 0.63), smoothstep(0.3, 0.6, h.y));
    c = mix(c, vec3(0.36, 0.18, 0.08), smoothstep(0.2, 0.6, h.z));
    float streak = sat(fbm(vec2(uv.x * 46.0, uv.y * 1.2) + 2.0, vec2(46.0, 1.2), 4) * 1.4);
    c *= 1.0 - 0.15 * streak;
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) {
    float bare = smoothstep(0.3, 0.6, h.y) * (1.0 - smoothstep(0.2, 0.6, h.z));
    return vec2(mix(0.62, 0.42, bare) + 0.25 * smoothstep(0.2, 0.6, h.z), bare * 0.85);
  }
  `,
};

// Бронеплиты: тёмная краска, сколы до стали, царапины, ржавчина по кромкам.
RECIPES.steelplate = {
  tile: [2.0, 2.0], cav: 400, ao: 0.6, big: true, glsl: `
  vec4 H(vec2 uv) {
    float chip = sat(fbm(uv * 7.0 + 1.0, vec2(7.0), 6) * 2.6 - 1.05);
    float scratch = 0.0;
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      vec2 dir = normalize(hash22(vec2(fi, 3.0)) - 0.5);
      vec2 q = vec2(dot(uv, dir), dot(uv, vec2(-dir.y, dir.x))) * vec2(3.0, 160.0);
      float n = gnoise(vec2(q.x * 1.5, floor(q.y)), vec2(1e4));
      scratch = max(scratch, step(0.78, n) * (1.0 - abs(fract(q.y) - 0.5) * 2.0) * hash12(vec2(floor(q.y), fi)));
    }
    float rust = sat(fbm(uv * 5.0 + 6.0, vec2(5.0), 6) * 2.0 - 0.7);
    float h = 0.00015 * (1.0 - chip) - 0.00006 * scratch + 0.00025 * rust;
    return vec4(h, chip, scratch, rust);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 paint = vec3(0.21, 0.23, 0.20) * (0.88 + 0.18 * sat(fbm(uv * 3.0, vec2(3.0), 5) + 0.5));
    vec3 steel = vec3(0.50, 0.50, 0.49);
    vec3 c = mix(paint, steel, smoothstep(0.35, 0.65, h.y));
    c = mix(c, c * 1.45, h.z * 0.5);
    c = mix(c, vec3(0.33, 0.17, 0.08), smoothstep(0.2, 0.65, h.w));
    c *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) {
    float bare = smoothstep(0.35, 0.65, h.y) * (1.0 - smoothstep(0.2, 0.65, h.w));
    return vec2(mix(0.62, 0.35, bare) - 0.1 * h.z + 0.25 * smoothstep(0.2, 0.65, h.w), bare * 0.95 + h.z * 0.3);
  }
  `,
};

// Рифлёный стальной лист (просечные «чечевицы» вперемешку): пол металлического яруса и ступени.
RECIPES.diamond = {
  tile: [0.6, 0.6], cav: 300, ao: 0.6, glsl: `
  vec4 H(vec2 uv) {
    vec2 p = uv * 20.0; vec2 i = floor(p); vec2 f = fract(p) - 0.5;
    float flip = mod(i.x + i.y, 2.0);
    float a = flip > 0.5 ? 0.785 : -0.785;
    vec2 q = vec2(cos(a) * f.x - sin(a) * f.y, sin(a) * f.x + cos(a) * f.y);
    float d = length(q / vec2(0.36, 0.09));
    float bump = sat(1.0 - d);
    float wear = sat(fbm(uv * 4.0, vec2(4.0), 5) * 2.0 + 0.2);
    float rust = sat(fbm(uv * 3.0 + 4.0, vec2(3.0), 5) * 2.4 - 0.9);
    float h = 0.0016 * sqrt(bump) + 0.00015 * rust;
    return vec4(h, bump, wear, rust);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = vec3(0.50, 0.51, 0.52) * (0.85 + 0.2 * h.z);
    c = mix(c, vec3(0.66, 0.66, 0.66), h.y * h.z * 0.5);
    c = mix(c, vec3(0.32, 0.17, 0.08), smoothstep(0.2, 0.7, h.w));
    c *= 1.0 - 0.35 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) {
    float r = smoothstep(0.2, 0.7, h.w);
    return vec2(mix(0.5 - 0.15 * h.y * h.z, 0.85, r), mix(0.92, 0.1, r));
  }
  `,
};

// Деревянная дранка: строки по 0,4 м (низ — комель), ширина плашек неровная, щели, мох у комля.
RECIPES.shingles = {
  tile: [3.0, 1.6], cav: 700, ao: 0.9, glsl: `
  vec4 H(vec2 uv) {
    float r = floor(uv.y * 4.0); float ly = fract(uv.y * 4.0); float xm = uv.x * 3.0;
    float w = xm / 0.15 + 0.6 * vnoise(vec2(xm * 2.0 + r * 9.0, r), vec2(1e4));
    float id = floor(w); float f = fract(w);
    float gap = 1.0 - smoothstep(0.0, 0.05, min(f, 1.0 - f));
    float grain = gnoise(vec2(f * 14.0 + id * 3.0, ly * 1.5 + id), vec2(1e4)) * 0.6 + gnoise(vec2(f * 50.0 + id, ly * 4.0), vec2(1e4)) * 0.3;
    float split = step(0.75, hash11(id * 1.7 + r * 5.0)) * (1.0 - smoothstep(0.0, 0.02, abs(f - 0.3 - 0.4 * hash11(id + r)))) * (1.0 - smoothstep(0.2, 0.6, ly));
    float butt = 1.0 - smoothstep(0.0, 0.03, ly - 0.02 * hash11(id * 3.3 + r));
    float h = 0.006 * (1.0 - ly) + 0.0003 * grain - 0.003 * gap - 0.002 * split - 0.002 * butt;
    return vec4(h, gap, hash11(id * 5.31 + r * 1.7), split);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float ly = fract(uv.y * 4.0); float xm = uv.x * 3.0;
    vec3 wood = mix(vec3(0.46, 0.40, 0.34), vec3(0.58, 0.47, 0.36), h.z);
    wood = mix(wood, vec3(0.42, 0.42, 0.41), sat(0.4 + 0.5 * h.z - 0.3 * ly));
    float grain = gnoise(vec2(xm * 120.0, ly * 6.0), vec2(1e4));
    wood *= 0.9 + 0.08 * grain;
    float moss = sat(fbm(vec2(xm * 3.0, uv.y * 12.0) + 2.0, vec2(1e4), 5) * 2.2 - 0.35) * (1.0 - smoothstep(0.0, 0.35, ly));
    wood = mix(wood, vec3(0.30, 0.36, 0.17), moss * 0.6);
    wood *= 1.0 - 0.75 * h.y;
    wood *= 1.0 - 0.5 * h.w;
    wood *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(wood);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.84 + 0.1 * h.y, 0.0); }
  `,
};

// Сланцевые плитки кровли: строки по 0,4 м, сколотые кромки, слоистая поверхность.
RECIPES.slate = {
  tile: [3.0, 1.6], cav: 600, ao: 0.9, glsl: `
  vec4 H(vec2 uv) {
    float r = floor(uv.y * 4.0); float ly = fract(uv.y * 4.0); float xm = uv.x * 3.0;
    float w = (xm + r * 0.13) / 0.25 + 0.3 * vnoise(vec2(xm * 3.0 + r * 5.0, r), vec2(1e4));
    float id = floor(w); float f = fract(w);
    float gap = 1.0 - smoothstep(0.0, 0.03, min(f, 1.0 - f));
    float flake = ridged(vec2(f * 4.0 + id * 7.0, ly * 3.0), vec2(1e4), 5);
    float chip = (1.0 - smoothstep(0.0, 0.06, ly - 0.03 * gnoise(vec2(f * 12.0 + id, r), vec2(1e4))));
    float h = 0.004 * (1.0 - ly) + 0.0005 * flake - 0.003 * gap - 0.0015 * chip;
    return vec4(h, gap, hash11(id * 3.7 + r), flake);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = mix(vec3(0.24, 0.25, 0.27), vec3(0.33, 0.33, 0.35), h.z);
    c *= 0.88 + 0.2 * h.w;
    float lich = sat(fbm(uv * vec2(9.0, 18.0) + 3.0, vec2(1e4), 5) * 2.5 - 1.0);
    c = mix(c, vec3(0.62, 0.62, 0.48), lich * 0.4);
    c *= 1.0 - 0.7 * h.y;
    c *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.62 + 0.25 * (1.0 - h.w), 0.0); }
  `,
};

// Земля стройки: суглинок, комья, камешки, соломинки; влажные пятна темнее.
RECIPES.dirt = {
  tile: [4.0, 4.0], cav: 300, ao: 1.0, big: true, hscale: 0.02, glsl: `
  // соломинки и щепки: короткие отрезки в редких ячейках (без контуров ячеек)
  float straw(vec2 uv, float sc) {
    vec2 p = uv * sc; vec2 i = floor(p); vec2 f = fract(p); float m = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec3 hs = hash32(mod(i + o, vec2(sc)) + 17.0);
      if (hs.z > 0.14) continue;
      vec2 cp = o + hs.xy - f;
      float ang = hs.z * 45.0; vec2 dir = vec2(cos(ang), sin(ang));
      float along = dot(cp, dir), across = dot(cp, vec2(-dir.y, dir.x));
      m = max(m, step(abs(along), 0.45 + 0.4 * hs.x) * (1.0 - smoothstep(0.012, 0.03, abs(across))));
    }
    return m;
  }
  vec4 H(vec2 uv) {
    float big = fbm(uv * 3.0, vec2(3.0), 6);
    float clump = fbm(uv * 16.0 + 3.1, vec2(16.0), 4);
    float clod = sat(clump * 1.7 + 0.15);
    vec4 pb = voronoi(uv * 55.0, vec2(55.0));
    float peb = step(0.9, pb.z) * sat(1.0 - pb.x * (1.6 + 2.0 * fract(pb.z * 13.0)));
    float fine = gnoise(uv * 400.0, vec2(400.0));
    float h = 0.006 * big + 0.0045 * clod + 0.004 * sqrt(peb) + 0.0003 * fine;
    return vec4(h, peb, clod, big);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 soil = mix(vec3(0.31, 0.25, 0.19), vec3(0.42, 0.35, 0.27), sat(fbm(uv * 5.0 + 2.0, vec2(5.0), 5) + 0.5));
    float damp = sat(fbm(uv * 2.0 + 8.0, vec2(2.0), 5) * 2.0 - 0.1);
    soil = mix(soil, soil * vec3(0.66, 0.62, 0.58), damp * 0.6);
    soil *= 0.9 + 0.14 * h.z;
    vec3 pc = mix(vec3(0.44, 0.42, 0.39), vec3(0.52, 0.46, 0.38), hash12(floor(uv * 55.0)));
    soil = mix(soil, pc, h.y);
    soil = mix(soil, vec3(0.6, 0.5, 0.31), straw(uv, 20.0) * 0.65);
    soil *= 1.0 - 0.35 * sat(cav * 2.0);
    return srgb(soil);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) {
    float damp = sat(fbm(uv * 2.0 + 8.0, vec2(2.0), 5) * 2.0 - 0.1);
    return vec2(0.92 - 0.12 * damp - 0.15 * h.y, 0.0);
  }
  `,
};

// Щебень: угловатые камни 3–5 см (не в каждой ячейке) и 1,5–2,5 см в промежутках, грани — плато с фаской
// по расстоянию до границы ячейки; между ними пыль и песок, на камнях — налёт пыли. Породы разного цвета.
RECIPES.gravel = {
  tile: [2.0, 2.0], cav: 250, ao: 1.0, big: true, hscale: 0.022, glsl: `
  vec4 H(vec2 uv) {
    // контуры камней искажены шумом, размер в ячейке разный, камни — выпуклые; заняты не все ячейки
    vec2 w = uv + 0.011 * vec2(gnoise(uv * 60.0, vec2(60.0)), gnoise(uv * 60.0 + 7.3, vec2(60.0)));
    vec4 a = voronoi(w * 40.0, vec2(40.0));
    float ra = 0.26 + 0.3 * fract(a.z * 17.3);
    float da = step(0.5, a.z) * sqrt(sat(1.0 - (a.x / ra) * (a.x / ra)));
    vec4 b = voronoi(w * 95.0 + 3.7, vec2(95.0));
    float rb = 0.3 + 0.25 * fract(b.z * 23.1);
    float db = step(0.45, b.z) * (1.0 - step(0.01, da)) * sqrt(sat(1.0 - (b.x / rb) * (b.x / rb)));
    float sand = gnoise(uv * 520.0, vec2(520.0)) * 0.5 + 0.5;
    float h = 0.014 * da + 0.006 * db + 0.0015 * sand;
    float id = da > 0.01 ? a.z : (db > 0.01 ? b.z : 0.0);
    return vec4(h, id, sat(da * 1.3 + db), sand);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float id = h.y, m = h.z;
    vec3 c = vec3(0.47, 0.46, 0.44);
    c = mix(c, vec3(0.56, 0.52, 0.46), step(0.55, fract(id * 7.3)));
    c = mix(c, vec3(0.33, 0.34, 0.35), step(0.8, fract(id * 13.1)));
    c = mix(c, vec3(0.62, 0.61, 0.58), step(0.93, fract(id * 29.7)));
    c = mix(c, vec3(0.5, 0.42, 0.34), step(0.95, fract(id * 41.9)));
    c *= 0.85 + 0.3 * fract(id * 51.3);
    c *= 0.9 + 0.15 * gnoise(uv * 700.0, vec2(700.0));
    vec3 dust = mix(vec3(0.35, 0.32, 0.28), vec3(0.43, 0.4, 0.35), h.w);
    c = mix(c, dust, 0.28 * (1.0 - smoothstep(0.35, 0.9, m)));
    c = mix(dust, c, sat(m * 1.8));
    c *= 1.0 - 0.45 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.8 - 0.12 * h.z, 0.0); }
  `,
};

// Трава как фактура земли (под объёмной травой и вдали): три слоя травинок разного наклона, сухие стебли,
// клевер, просветы земли.
RECIPES.grass = {
  tile: [4.0, 4.0], cav: 250, ao: 1.0, big: true, hscale: 0.02, glsl: `
  vec2 blades(vec2 uv, float sc, float seed) {
    vec2 p = uv * sc; vec2 per = vec2(sc); vec2 i = floor(p); vec2 f = fract(p);
    float m = 0.0, kind = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 c = mod(i + o, per);
      vec3 hs = hash32(c + seed);
      vec2 cp = o + hs.xy - f;
      float ang = hs.z * 6.2832;
      vec2 dir = vec2(cos(ang), sin(ang));
      float along = dot(cp, dir); float across = dot(cp, vec2(-dir.y, dir.x));
      float len = 0.75 + 0.4 * hs.x;
      float w = 0.09 * (1.0 - sat(abs(along) / len));
      float b = step(abs(along), len) * (1.0 - smoothstep(w * 0.4, w, abs(across)));
      if (b * (0.5 + 0.5 * hs.y) > m) { m = b * (0.5 + 0.5 * hs.y); kind = hs.x; }
    }
    return vec2(m, kind);
  }
  vec4 H(vec2 uv) {
    vec2 a = blades(uv, 60.0, 1.0), b = blades(uv, 95.0, 7.0), c = blades(uv, 140.0, 13.0);
    float m = max(a.x, max(b.x * 0.9, c.x * 0.8));
    float kind = a.x >= m ? a.y : (b.x * 0.9 >= m ? b.y : c.y);
    vec4 cl = voronoi(uv * 90.0, vec2(90.0));
    float clover = sat(fbm(uv * 6.0 + 3.0, vec2(6.0), 5) * 2.5 - 0.6) * sat(1.0 - cl.x * 2.0);
    float h = 0.006 * m + 0.004 * clover + 0.002 * fbm(uv * 8.0, vec2(8.0), 4);
    return vec4(h, m, kind, clover);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float dryZone = sat(fbm(uv * 3.0 + 5.0, vec2(3.0), 5) * 1.8 + 0.1);
    vec3 green = mix(vec3(0.26, 0.38, 0.14), vec3(0.36, 0.46, 0.18), h.z);
    vec3 dry = mix(vec3(0.58, 0.55, 0.32), vec3(0.50, 0.44, 0.27), h.z);
    vec3 blade = mix(green, dry, sat(dryZone * 0.6 + step(0.86, h.z) * 0.7));
    vec3 soil = vec3(0.24, 0.20, 0.15);
    vec3 c = mix(soil, blade, sat(h.y * 1.4 + 0.15));
    c = mix(c, vec3(0.24, 0.40, 0.15), h.w * 0.85);
    c *= 1.0 - 0.45 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.82, 0.0); }
  `,
};

// Кора берёзы: белая с розоватыми отслоениями, чёрные чечевички — короткие поперечные штрихи, чёрные пятна.
// u — вокруг ствола, v — вдоль.
RECIPES.birch = {
  tile: [0.25, 0.5], cav: 600, ao: 0.7, glsl: `
  vec4 H(vec2 uv) {
    vec2 p = uv * vec2(6.0, 22.0);
    vec2 i = floor(p); vec2 f = fract(p);
    float len = 0.25 + 0.5 * hash12(mod(i, vec2(6.0, 22.0)) * 1.7);
    float on = step(0.55, hash12(mod(i, vec2(6.0, 22.0)) + 3.1));
    float dash = on * (1.0 - smoothstep(0.04, 0.12, abs(f.y - 0.5))) * step(abs(f.x - 0.5), len * 0.5);
    float peel = smoothstep(0.55, 0.8, fbm(uv * vec2(4.0, 10.0), vec2(4.0, 10.0), 4) * 0.5 + 0.5);
    float h = 0.0006 * (1.0 - dash) + 0.0004 * peel + 0.0002 * gnoise(uv * vec2(60.0, 200.0), vec2(60.0, 200.0));
    return vec4(h, dash, peel, 0.0);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = mix(vec3(0.84, 0.83, 0.78), vec3(0.92, 0.9, 0.86), gnoise(uv * vec2(8.0, 30.0), vec2(8.0, 30.0)) * 0.5 + 0.5);
    c = mix(c, vec3(0.78, 0.69, 0.61), h.z * 0.35);
    c = mix(c, vec3(0.08, 0.07, 0.06), h.y * 0.9);
    float blot = smoothstep(0.62, 0.7, fbm(uv * vec2(2.0, 5.0) + 11.0, vec2(2.0, 5.0), 5) * 0.5 + 0.5);
    c = mix(c, vec3(0.1, 0.09, 0.08), blot * 0.85);
    c *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.72 + 0.15 * h.y, 0.0); }
  `,
};

// Пенька: обмотки и связки (тонкая скрутка нитей).
RECIPES.rope = {
  tile: [0.08, 0.08], cav: 400, ao: 0.6, glsl: `
  vec4 H(vec2 uv) {
    float t = fract((uv.x + uv.y * 3.0) * 4.0);
    float strand = sin(t * 3.14159);
    float fib = gnoise(vec2(uv.x * 80.0, uv.y * 20.0), vec2(80.0, 20.0));
    return vec4(0.0008 * strand + 0.0001 * fib, strand, fib, 0.0);
  }
  vec3 A(vec2 uv, vec4 h, float cav) { vec3 c = vec3(0.62, 0.52, 0.36) * (0.75 + 0.3 * h.y) * (0.95 + 0.1 * h.z); return srgb(c); }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.9, 0.0); }
  `,
};

// ---------- кладка кубов: семейства материалов оригинала ----------
// Тон нейтральный (около 0,6): цвет даёт материал оригинала через цвет вершин. Швы (альфа альбедо = 0, J)
// остаются своего цвета — раствор, джут, затирка. Ряды кратны высоте куба 2 м.

// Кирпич, ложковая перевязка: 4 кирпича × 8 рядов на плитку, кирпич 250 × 64 мм, шов 10 мм (27 рядов на куб).
RECIPES.brick = {
  tile: [1.04, 0.592593], cav: 160, ao: 0.8, pom: 0.008, mask: true, glsl: `
  const vec2 BRICK_M = vec2(0.26, 0.0740741);
  vec2 brickId(vec2 uv, out vec2 f) {
    vec2 p = uv * vec2(4.0, 8.0);
    float row = floor(p.y);
    p.x += 0.5 * mod(row, 2.0);
    f = fract(p);
    return vec2(mod(floor(p.x), 4.0), mod(row, 8.0));
  }
  vec4 H(vec2 uv) {
    vec2 f; vec2 id = brickId(uv, f);
    float r = hash12(id + 0.37);
    vec2 m = f * BRICK_M;
    vec2 e2 = min(m, BRICK_M - m) - 0.005;
    float e = min(e2.x, e2.y);
    float brick = step(0.0, e);
    float bev = sqrt(sat(e / 0.004));
    float chip = step(0.86, hash12(id + 5.1)) * (1.0 - smoothstep(0.0, 0.03, length(min(m, BRICK_M - m))));
    float face = 0.0007 * fbm(uv * vec2(40.0, 64.0) + r * 17.0, vec2(40.0, 64.0), 4) + 0.0005 * (r - 0.5);
    float mortar = -0.006 + 0.0007 * fbm(uv * vec2(80.0, 128.0), vec2(80.0, 128.0), 3);
    float h = mix(mortar, face - 0.0015 * (1.0 - bev) - 0.004 * chip, brick);
    return vec4(h, brick * (1.0 - chip * 0.6), r, e);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float r = h.z;
    vec3 brick = vec3(0.62) * (0.84 + 0.3 * r) * vec3(1.0 + 0.05 * (hash11(r * 91.0) - 0.5), 1.0, 1.0 - 0.06 * (hash11(r * 37.0) - 0.5));
    brick *= 1.0 - 0.32 * step(0.93, hash11(r * 53.0 + 2.0));
    brick *= 0.9 + 0.16 * sat(fbm(uv * vec2(24.0, 40.0) + r * 9.0, vec2(24.0, 40.0), 5) + 0.5);
    float sp = gnoise(uv * vec2(400.0, 640.0), vec2(400.0, 640.0)) * 0.5 + 0.5;
    brick *= 1.0 - 0.1 * smoothstep(0.8, 0.95, sp);
    vec3 mortar = vec3(0.60, 0.58, 0.54) * (0.88 + 0.16 * sat(fbm(uv * vec2(60.0, 100.0), vec2(60.0, 100.0), 4) + 0.5));
    vec3 col = mix(mortar, brick, h.y);
    float dirt = sat(fbm(uv * vec2(2.0, 3.0) + 5.0, vec2(2.0, 3.0), 5) * 1.6 - 0.2);
    col *= 1.0 - 0.15 * dirt;
    col *= 1.0 - 0.25 * sat(cav * 2.0);
    return srgb(col);
  }
  float J(vec2 uv, vec4 h) { return h.y; }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(mix(0.95, 0.86 + 0.06 * h.z, h.y), 0.0); }
  `,
};

// Тёсаный камень: ряды по 1/3 м (6 на куб), в ряду 3–5 камней разной длины, шов 7 мм; лицо чуть выпуклое,
// кромки со сколами, следы тёски, железистые пятна.
RECIPES.ashlar = {
  tile: [2.0, 2.0], cav: 160, ao: 0.9, pom: 0.013, big: true, mask: true, glsl: `
  float ashJit(float row, float k, float n) { return (hash12(vec2(row, mod(k + n, n))) - 0.5) * 0.4; }
  vec4 ashlar(vec2 uv) {
    float row = floor(uv.y * 6.0);
    float fy = fract(uv.y * 6.0);
    float n = 3.0 + floor(hash11(row * 7.13 + 1.7) * 3.0);
    float x = fract(uv.x + hash11(row * 3.71 + 0.3));
    float k = floor(x * n);
    float b0 = (k + ashJit(row, k, n)) / n;
    float b1 = (k + 1.0 + ashJit(row, k + 1.0, n)) / n;
    if (x < b0) { k -= 1.0; b1 = b0; b0 = (k + ashJit(row, k, n)) / n; }
    else if (x >= b1) { k += 1.0; b0 = b1; b1 = (k + 1.0 + ashJit(row, k + 1.0, n)) / n; }
    float ex = min(x - b0, b1 - x) * 2.0, ey = min(fy, 1.0 - fy) * (2.0 / 6.0);
    float id = hash12(vec2(row, mod(k + n, n)) + 0.73);
    return vec4(min(ex, ey) - 0.0035, id, (x - b0) / (b1 - b0), fy);
  }
  vec4 H(vec2 uv) {
    vec4 a = ashlar(uv);
    float stone = step(0.0, a.x);
    float bev = sqrt(sat(a.x / 0.012));
    float bulge = 0.004 * sin(PI * sat(a.z)) * sin(PI * a.w);
    float rough = 0.0025 * fbm(uv * 8.0 + a.y * 31.0, vec2(8.0), 6) + 0.0006 * gnoise(uv * 200.0, vec2(200.0));
    float h = mix(-0.012 + 0.001 * fbm(uv * 60.0, vec2(60.0), 3), bulge + rough - 0.006 * (1.0 - bev), stone);
    return vec4(h, stone, a.y, fbm(uv * 3.0 + 4.0, vec2(3.0), 5));
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 st = vec3(0.6) * (0.86 + 0.26 * h.z) * vec3(1.0 + 0.05 * (h.z - 0.5), 1.0, 1.0 - 0.06 * (h.z - 0.5));
    st *= 0.9 + 0.16 * sat(fbm(uv * 10.0 + h.z * 7.0, vec2(10.0), 5) + 0.5);
    st *= 0.94 + 0.1 * (gnoise(uv * 600.0, vec2(600.0)) * 0.5 + 0.5);
    float iron = sat(fbm(uv * vec2(5.0, 3.0) + 5.0, vec2(5.0, 3.0), 6) * 1.8 - 0.7);
    st = mix(st, st * vec3(1.08, 0.94, 0.8), iron * 0.5);
    vec3 mortar = vec3(0.62, 0.6, 0.56) * (0.86 + 0.18 * sat(fbm(uv * 40.0, vec2(40.0), 4) + 0.5));
    vec3 col = mix(mortar, st, h.y);
    col *= 1.0 - 0.14 * sat(h.w * 1.6 - 0.1);
    col *= 1.0 - 0.45 * sat(cav * 2.0);
    return srgb(col);
  }
  float J(vec2 uv, vec4 h) { return h.y; }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(mix(0.95, 0.88, h.y), 0.0); }
  `,
};

// Брус 200 мм (10 рядов на куб): фаска, между рядами джут, стыки брусьев вразбежку; годичные слои вдоль
// бруса, сучки, усушечные трещины.
RECIPES.logs = {
  tile: [2.0, 2.0], cav: 220, ao: 0.8, pom: 0.013, big: true, mask: true, glsl: `
  vec4 H(vec2 uv) {
    float row = floor(uv.y * 10.0);
    float fy = fract(uv.y * 10.0);
    float ey = min(fy, 1.0 - fy) * 0.2;
    float jx = fract(uv.x - hash11(row * 5.3 + 0.7));
    float ex = min(jx, 1.0 - jx) * 2.0;
    float e = min(ey, ex);
    float wood = step(0.004, ey) * step(0.002, ex);
    float bev = sat(e / 0.012);
    float grain = fbm(vec2(uv.x * 3.0, uv.y * 160.0) + row * 3.3, vec2(3.0, 160.0), 5);
    float h = mix(-0.01, -0.012 * (1.0 - sqrt(bev)) + 0.0004 * grain, wood);
    return vec4(h, wood, hash11(row * 9.1 + 0.2), grain);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    float row = floor(uv.y * 10.0);
    float rings = sin((uv.y * 10.0 + 0.4 * fbm(vec2(uv.x * 2.0, uv.y * 20.0) + row, vec2(2.0, 20.0), 4)) * 60.0);
    vec3 w = vec3(0.6) * (0.86 + 0.25 * h.z);
    w *= 0.9 + 0.08 * rings + 0.06 * h.w;
    vec4 kn = voronoi(vec2(uv.x * 6.0, uv.y * 10.0), vec2(6.0, 10.0));
    float knot = (1.0 - smoothstep(0.0, 0.12, kn.x)) * step(0.82, kn.z);
    w *= 1.0 - 0.45 * knot;
    float crack = smoothstep(0.92, 0.99, abs(gnoise(vec2(uv.x * 4.0, uv.y * 300.0), vec2(4.0, 300.0)))) * step(0.6, hash11(row * 2.7));
    w *= 1.0 - 0.4 * crack;
    vec3 jute = vec3(0.46, 0.38, 0.27) * (0.8 + 0.3 * sat(fbm(uv * vec2(40.0, 400.0), vec2(40.0, 400.0), 4) + 0.5));
    vec3 col = mix(jute, w, h.y);
    col *= 1.0 - 0.35 * sat(cav * 2.0);
    return srgb(col);
  }
  float J(vec2 uv, vec4 h) { return h.y; }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(mix(0.95, 0.72 + 0.1 * h.w, h.y), 0.0); }
  `,
};

// Стальные листы 1 × 0,5 м вразбежку на заклёпках (18 мм через 10 см, в 3 см от кромки), шов 4 мм; окалина,
// ржавые потёки из-под заклёпок.
RECIPES.riveted = {
  tile: [2.0, 2.0], cav: 400, ao: 0.7, pom: 0.006, glsl: `
  vec4 H(vec2 uv) {
    vec2 p = uv * vec2(2.0, 4.0);
    float row = floor(p.y);
    p.x += 0.5 * mod(row, 2.0);
    vec2 f = fract(p);
    vec2 m = f * vec2(1.0, 0.5);
    vec2 e2 = min(m, vec2(1.0, 0.5) - m);
    float plate = step(0.002, min(e2.x, e2.y));
    float dh = length(vec2(fract(m.x / 0.1) * 0.1 - 0.05, min(m.y, 0.5 - m.y) - 0.03));
    float dv = length(vec2(min(m.x, 1.0 - m.x) - 0.03, fract(m.y / 0.1) * 0.1 - 0.05));
    float rd = min(dh, dv);
    float rivet = sqrt(sat(1.0 - (rd / 0.009) * (rd / 0.009))) * 0.005;
    float id = hash12(vec2(mod(floor(p.x), 2.0), row));
    float oil = 0.0015 * sin(PI * f.x) * sin(PI * f.y) * (id - 0.3);
    float h = mix(-0.003, oil + rivet + 0.00015 * fbm(uv * 50.0, vec2(50.0), 3), plate);
    return vec4(h, plate, id, step(rd, 0.009));
  }
  float rustOf(vec2 uv, vec4 h) {
    float streak = sat(fbm(vec2(uv.x * 30.0, uv.y * 3.0) + 7.0, vec2(30.0, 3.0), 4) * 2.2 - 0.9);
    return sat(streak * 0.6 + h.w * 0.5) * 0.45;
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = vec3(0.6) * (0.9 + 0.16 * h.z);
    c *= 0.92 + 0.12 * sat(fbm(uv * 6.0 + h.z * 5.0, vec2(6.0), 5) + 0.5);
    c *= 1.0 - 0.12 * sat(fbm(uv * 14.0 + 3.0, vec2(14.0), 4) * 2.0 - 0.3);
    c = mix(c, vec3(0.42, 0.22, 0.1), rustOf(uv, h));
    c = mix(vec3(0.12), c, h.y);
    c *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) {
    float r = rustOf(uv, h);
    return vec2(mix(0.5 + 0.15 * h.z, 0.85, r), (1.0 - r) * h.y);
  }
  `,
};

// Монолит в щитовой опалубке: щиты 1 × 0,5 м (заливка ярусами по полметра), рёбра стыков, конусы стяжек,
// раковины, разводы фанеры.
RECIPES.formwork = {
  tile: [2.0, 2.0], cav: 500, ao: 0.9, pom: 0.013, glsl: `
  vec4 H(vec2 uv) {
    vec2 p = uv * vec2(2.0, 4.0);
    vec2 m = fract(p) * vec2(1.0, 0.5);
    vec2 e2 = min(m, vec2(1.0, 0.5) - m);
    float seam = 1.0 - smoothstep(0.0, 0.002, min(e2.x, e2.y));
    float tie = 1.0 - smoothstep(0.008, 0.014, min(length(m - vec2(0.25, 0.25)), length(m - vec2(0.75, 0.25))));
    vec4 por = voronoi(uv * 180.0, vec2(180.0));
    float pores = (1.0 - smoothstep(0.0, 0.18, por.x)) * step(0.82, por.z);
    float lift = hash12(floor(p) + 0.3);
    float h = 0.0006 * fbm(uv * 4.0, vec2(4.0), 5) + 0.0006 * seam - 0.012 * tie - 0.0015 * pores;
    return vec4(h, pores, lift, tie);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = vec3(0.6) * (0.9 + 0.12 * h.z);
    c *= 0.94 + 0.1 * sat(fbm(vec2(uv.x * 6.0, uv.y * 24.0) + h.z * 3.0, vec2(6.0, 24.0), 4) + 0.5);
    c *= 1.0 - 0.15 * sat(fbm(uv * vec2(2.0, 1.0) + 9.0, vec2(2.0, 1.0), 6) * 1.6 - 0.3);
    c *= 1.0 - 0.35 * h.y - 0.4 * h.w;
    c *= 1.0 - 0.25 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.88 + 0.06 * h.y, 0.0); }
  `,
};

// Мрамор: полированные плиты 1 × 1 м, шов 2 мм, прожилки.
RECIPES.marble = {
  tile: [2.0, 2.0], cav: 200, ao: 0.6, mask: true, glsl: `
  vec4 H(vec2 uv) {
    vec2 p = uv * 2.0;
    vec2 m = fract(p);
    vec2 e2 = min(m, 1.0 - m);
    float slab = step(0.001, min(e2.x, e2.y));
    return vec4(mix(-0.002, 0.0, slab), slab, hash12(floor(p) + 0.2), 0.0);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec2 q = uv * 2.0 + h.z * 7.0;
    float w = fbm(q * 1.5, vec2(3.0), 6);
    float vein = 1.0 - smoothstep(0.0, 0.06, abs(sin((q.x + q.y * 0.6 + w * 2.5) * PI)));
    float fine = 1.0 - smoothstep(0.0, 0.03, abs(sin((q.x * 1.7 - q.y + fbm(q * 3.0 + 5.0, vec2(6.0), 5) * 3.0) * 2.0 * PI)));
    vec3 c = vec3(0.7) * (0.92 + 0.1 * sat(fbm(q * 4.0, vec2(8.0), 5) + 0.5));
    c *= 1.0 - 0.35 * vein - 0.15 * fine;
    c = mix(vec3(0.55, 0.54, 0.52), c, h.y);
    return srgb(c);
  }
  float J(vec2 uv, vec4 h) { return h.y; }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(mix(0.7, 0.14, h.y), 0.0); }
  `,
};

// Тёсаный камень обрамлений (рамки панелей, стойки, пояса фундамента, сливы, подоконники): известняк мелкой
// тёски — бороздки зубатки под 30° (целые частоты — плитка без шва), пологая волна, поры, пятна сырости.
// Тон нейтральный (около 0,6): цвет даёт рамка детали (building.js → trimHex).
RECIPES.dressed = {
  tile: [1.0, 1.0], cav: 260, ao: 0.8, glsl: `
  vec4 H(vec2 uv) {
    float g = sin(2.0 * PI * (40.0 * uv.x + 23.0 * uv.y) + 1.6 * fbm(uv * 6.0, vec2(6.0), 3)) * 0.5 + 0.5;
    g *= 0.55 + 0.45 * fbm(uv * 3.0 + 2.0, vec2(3.0), 4);
    vec4 pit = voronoi(uv * 90.0, vec2(90.0));
    float pits = (1.0 - smoothstep(0.0, 0.3, pit.x)) * step(0.86, pit.z);
    float wave = fbm(uv * 4.0, vec2(4.0), 5);
    float grain = gnoise(uv * 400.0, vec2(400.0));
    float h = 0.0007 * wave + 0.00014 * g + 0.00005 * grain - 0.0007 * pits;
    return vec4(h, g, pits, wave);
  }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 c = vec3(0.6) * (0.92 + 0.12 * sat(fbm(uv * 5.0 + 3.0, vec2(5.0), 5) + 0.5));
    c *= 0.97 + 0.05 * h.y;
    c *= 1.0 - 0.28 * h.z;
    float stain = sat(fbm(uv * vec2(2.0, 4.0) + 7.0, vec2(2.0, 4.0), 5) * 1.6 - 0.4);
    c *= 1.0 - 0.1 * stain;
    c *= 1.0 - 0.3 * sat(cav * 2.0);
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.84 + 0.08 * h.z, 0.0); }
  `,
};

// Чертёж на столе планирования: синька — сетка, план этажа белыми линиями (стены, проёмы, размерные линии),
// штамп в углу. Координаты — свои у листа (0..1), не мировые.
RECIPES.blueprint = {
  tile: [1.0, 1.0], cav: 0, ao: 0, glsl: `
  float rline(vec2 p, vec4 r, float w) {
    vec2 a = step(r.xy - w, p) * step(p, r.zw + w);
    vec2 b = step(r.xy + w, p) * step(p, r.zw - w);
    return a.x * a.y * (1.0 - b.x * b.y);
  }
  float seg(vec2 p, vec2 a, vec2 b, float w) {
    vec2 pa = p - a, ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return 1.0 - smoothstep(w * 0.6, w, length(pa - ba * t));
  }
  vec4 H(vec2 uv) { return vec4(0.00008 * gnoise(uv * 60.0, vec2(60.0)), 0.0, 0.0, 0.0); }
  vec3 A(vec2 uv, vec4 h, float cav) {
    vec3 paper = vec3(0.13, 0.29, 0.58) * (0.9 + 0.12 * fbm(uv * 5.0, vec2(5.0), 4));
    vec2 g = abs(fract(uv * vec2(30.0, 20.0)) - 0.5);
    float grid = 1.0 - smoothstep(0.44, 0.5, max(g.x, g.y));
    float ink = 0.18 * (1.0 - grid);
    ink = max(ink, rline(uv, vec4(0.1, 0.18, 0.62, 0.84), 0.008));
    ink = max(ink, rline(uv, vec4(0.1, 0.18, 0.36, 0.5), 0.005));
    ink = max(ink, seg(uv, vec2(0.36, 0.5), vec2(0.62, 0.5), 0.006));
    // проёмы: разрывы и дуги дверей
    ink *= 1.0 - step(0.3, uv.x) * step(uv.x, 0.38) * step(0.83, uv.y) * step(uv.y, 0.85) * 0.9;
    ink = max(ink, 1.0 - smoothstep(0.003, 0.006, abs(length(uv - vec2(0.3, 0.84)) - 0.08)) * step(uv.y, 0.84) * step(0.3, uv.x));
    // размерные линии с засечками
    ink = max(ink, seg(uv, vec2(0.1, 0.09), vec2(0.62, 0.09), 0.003));
    ink = max(ink, seg(uv, vec2(0.1, 0.06), vec2(0.1, 0.12), 0.003));
    ink = max(ink, seg(uv, vec2(0.62, 0.06), vec2(0.62, 0.12), 0.003));
    ink = max(ink, seg(uv, vec2(0.7, 0.18), vec2(0.7, 0.84), 0.003));
    // штамп и «надписи»
    ink = max(ink, rline(uv, vec4(0.74, 0.06, 0.95, 0.3), 0.004));
    vec2 tq = (uv - vec2(0.76, 0.1)) * vec2(1.0, 1.0);
    float rows = step(0.0, tq.y) * step(tq.y, 0.17) * step(0.0, tq.x) * step(tq.x, 0.17);
    ink = max(ink, rows * step(0.55, fract(tq.y * 32.0)) * step(0.4, hash12(floor(tq * vec2(40.0, 32.0)))) * 0.8);
    vec3 c = mix(paper, vec3(0.86, 0.92, 0.98), sat(ink));
    return srgb(c);
  }
  vec2 RM(vec2 uv, vec4 h, float cav) { return vec2(0.82, 0.0); }
  `,
};

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
uniform float uHScale;
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
  // в альфе альбедо — где красит цвет вершин (1) и где шов своего цвета (0): рецепты кладки с J()
  else if (kind === 'albedo') main = 'void main() { vec4 h = texture2D(tH, vUv); gl_FragColor = vec4(A(vUv, h, cavity(vUv)), ' + (recipe.mask ? 'J(vUv, h)' : '1.0') + '); }';
  else if (kind === 'normal') main = `void main() {
    float hl = texture2D(tH, vUv - vec2(uTexel.x, 0.0)).x, hr = texture2D(tH, vUv + vec2(uTexel.x, 0.0)).x;
    float hd = texture2D(tH, vUv - vec2(0.0, uTexel.y)).x, hu = texture2D(tH, vUv + vec2(0.0, uTexel.y)).x;
    vec2 texM = uTileM * uTexel;
    vec3 n = normalize(vec3(-(hr - hl) / (2.0 * texM.x), -(hu - hd) / (2.0 * texM.y), 1.0));
    // в альфе — высота: 0..1 от uHScale метров (рельеф с параллаксом земли, world.js), у кладки (pom) — со
    // знаком, ±uHScale (параллакс деталей, families.js)
    gl_FragColor = vec4(n * 0.5 + 0.5, clamp(texture2D(tH, vUv).x / uHScale` + (recipe.pom ? ' * 0.5 + 0.5' : '') + `, 0.0, 1.0));
  }`;
  else main = `void main() {
    vec4 h = texture2D(tH, vUv); float cav = cavity(vUv);
    vec2 rm = RM(vUv, h, cav);
    float ao = clamp(1.0 - max(cav, 0.0) * uAoK, 0.3, 1.0);
    gl_FragColor = vec4(ao, clamp(rm.x, 0.04, 1.0), clamp(rm.y, 0.0, 1.0), 1.0);
  }`;
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: PASS_VERTEX,
    fragmentShader: NOISE + PASS_COMMON + recipe.glsl + main,
    depthTest: false,
    depthWrite: false,
  });
}

// size — сторона «больших» фактур (2048 на ПК, 1024 на телефоне); малые вдвое меньше.
export function createTextures(renderer, { size = 2048 } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  scene.add(quad);
  const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const sets = {};

  function target(n, srgb, mips) {
    const rt = new THREE.WebGLRenderTarget(n, n, {
      type: THREE.UnsignedByteType,
      colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace,
      generateMipmaps: mips,
      minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
    });
    rt.texture.anisotropy = aniso;
    return rt;
  }

  function draw(material, rt) {
    quad.material = material;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
  }

  // Рисует (или перерисовывает после сброса контекста) набор фактур рецепта.
  function paint(name) {
    const recipe = RECIPES[name];
    const set = sets[name];
    const n = set.size;
    const h = new THREE.WebGLRenderTarget(n, n, {
      type: THREE.HalfFloatType, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false,
    });
    const uniforms = {
      tH: { value: h.texture },
      uTexel: { value: new THREE.Vector2(1 / n, 1 / n) },
      uTileM: { value: new THREE.Vector2(recipe.tile[0], recipe.tile[1]) },
      uCavK: { value: recipe.cav },
      uAoK: { value: recipe.ao },
      uHScale: { value: recipe.pom || recipe.hscale || 0.02 },
    };
    const mats = ['height', 'albedo', 'normal', 'orm'].map(function (kind) { return passMaterial(recipe, kind, uniforms); });
    const prev = renderer.getRenderTarget();
    draw(mats[0], h);
    draw(mats[1], set.targets.albedo);
    draw(mats[2], set.targets.normal);
    draw(mats[3], set.targets.orm);
    renderer.setRenderTarget(prev);
    mats.forEach(function (m) { m.dispose(); });
    h.dispose();
  }

  function make(name) {
    const recipe = RECIPES[name];
    const n = recipe.big ? size : Math.max(256, size / 2);
    const targets = { albedo: target(n, true, true), normal: target(n, false, true), orm: target(n, false, true) };
    sets[name] = {
      name, size: n, tile: recipe.tile, targets,
      map: targets.albedo.texture, normalMap: targets.normal.texture, ormMap: targets.orm.texture,
    };
    paint(name);
    return sets[name];
  }

  return {
    names: Object.keys(RECIPES),
    get(name) { return sets[name] || make(name); },
    make,
    // После webglcontextrestored три пересоздаёт пустые цели — перерисовать всё.
    repaint() { Object.keys(sets).forEach(paint); },
    dispose() {
      Object.values(sets).forEach(function (s) { Object.values(s.targets).forEach(function (t) { t.dispose(); }); });
      quad.geometry.dispose();
    },
  };
}

export const TEXTURE_TILES = Object.fromEntries(Object.entries(RECIPES).map(function ([k, r]) { return [k, r.tile]; }));
// глубина рельефа для параллакса (± м; высота в альфе нормали со знаком) — у рецептов кладки
export const TEXTURE_POM = Object.fromEntries(Object.entries(RECIPES).filter(function ([k, r]) { return r.pom; }).map(function ([k, r]) { return [k, r.pom]; }));
