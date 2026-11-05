// Общая библиотека GLSL: хеши, периодические шумы, fbm, Ворони. Периодические — для бесшовных фактур:
// решётка берётся по модулю периода per (целые клетки на плитку).
export const NOISE = /* glsl */ `
#define PI 3.14159265359
float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3 sat3(vec3 x) { return clamp(x, 0.0, 1.0); }
vec3 srgb(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash32(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }

float vnoise(vec2 p, vec2 per) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(mod(i, per)), b = hash12(mod(i + vec2(1.0, 0.0), per));
  float c = hash12(mod(i + vec2(0.0, 1.0), per)), d = hash12(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float gnoise(vec2 p, vec2 per) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 g00 = hash22(mod(i, per)) * 2.0 - 1.0;
  vec2 g10 = hash22(mod(i + vec2(1.0, 0.0), per)) * 2.0 - 1.0;
  vec2 g01 = hash22(mod(i + vec2(0.0, 1.0), per)) * 2.0 - 1.0;
  vec2 g11 = hash22(mod(i + vec2(1.0, 1.0), per)) * 2.0 - 1.0;
  float a = dot(g00, f), b = dot(g10, f - vec2(1.0, 0.0));
  float c = dot(g01, f - vec2(0.0, 1.0)), d = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.414;
}

float fbm(vec2 p, vec2 per, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 9; i++) {
    if (i >= oct) break;
    s += a * gnoise(p, per);
    p *= 2.0; per *= 2.0; a *= 0.5;
  }
  return s;
}

float ridged(vec2 p, vec2 per, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 9; i++) {
    if (i >= oct) break;
    s += a * (1.0 - abs(gnoise(p, per)));
    p *= 2.0; per *= 2.0; a *= 0.5;
  }
  return s;
}

// x — расстояние до ближайшей точки, y — до второй, z — хеш клетки, w — расстояние до границы клеток.
vec4 voronoi(vec2 p, vec2 per) {
  vec2 i = floor(p); vec2 f = fract(p);
  float F1 = 8.0, F2 = 8.0; vec2 bc = vec2(0.0); vec2 br = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 c = mod(i + o, per);
    vec2 r = o + hash22(c) - f;
    float d = dot(r, r);
    if (d < F1) { F2 = F1; F1 = d; bc = c; br = r; } else if (d < F2) { F2 = d; }
  }
  float ed = 8.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 c = mod(i + o, per);
    vec2 r = o + hash22(c) - f;
    vec2 dr = r - br;
    if (dot(dr, dr) > 0.00001) ed = min(ed, dot(0.5 * (br + r), normalize(dr)));
  }
  return vec4(sqrt(F1), sqrt(F2), hash12(bc * 1.37 + 0.11), ed);
}

// Непериодические 3D-шумы (мир, небо, ткань).
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise3(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i), n100 = hash13(i + vec3(1, 0, 0)), n010 = hash13(i + vec3(0, 1, 0)), n110 = hash13(i + vec3(1, 1, 0));
  float n001 = hash13(i + vec3(0, 0, 1)), n101 = hash13(i + vec3(1, 0, 1)), n011 = hash13(i + vec3(0, 1, 1)), n111 = hash13(i + vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float fbm3(vec3 p, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * (vnoise3(p) * 2.0 - 1.0); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
`;
