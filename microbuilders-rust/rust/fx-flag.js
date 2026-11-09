// Флаг на сданном здании (fx.js ← вызов flag оригинала): стальной флагшток на опорной плите с болтами,
// медное навершие, блок и фал; полотнище поднимают по флагштоку и оно разворачивается по ветру. Волна ткани —
// в вершинном шейдере (материал вида, linkSky): бегущая от флагштока волна двух частот, амплитуда растёт к
// свободному краю, нормаль — по производным волны; тень полотнища — с той же волной (свой материал глубины).
// Солнце за полотнищем — ткань просвечивает. Флагшток и фурнитура — одна геометрия (цвет вершин), ткань —
// вторая: два вызова отрисовки. Размер — как у оригинала: древко 1,6 клетки × scale (3,2 м при scale 1).
import * as THREE from 'three';
import { linkSky } from './world.js?v=45127fe';
import { DYNAMIC } from './render.js?v=45127fe';
import { cylinder, roundedBox, Batch } from './geo.js?v=45127fe';

const POLE = 3.2;                  // высота флагштока, м (scale 1)
const CLOTH_W = 1.8, CLOTH_H = 1.2; // полотнище, м
const HOIST = 0.05;                // от оси флагштока до края полотнища
const TOP = POLE - 0.07;           // верх полотнища

const WAVE_GLSL = /* glsl */ `
uniform float uFlagT, uFlagAmp;
// место и нормаль ткани: волна от флагштока (u = 0) к свободному краю (u = 1)
vec3 flagWave(vec3 p, out vec3 n, out float fold) {
  float u = clamp((p.x - ${HOIST.toFixed(3)}) / ${CLOTH_W.toFixed(3)}, 0.0, 1.0);
  float v = p.y;
  // длинная волна (~1,35 м) и рябь (~0,7 м) бегут от флагштока, у верха и низа — со сдвигом фазы; размах к
  // свободному краю — до пятой части длины полотнища, как у флага на хорошем ветру
  float ph1 = uFlagT * 6.2 - u * 8.4 + v * 1.1;
  float ph2 = uFlagT * 10.5 - u * 16.0 + v * 3.0 + 1.3;
  float wv = sin(ph1) * 0.72 + sin(ph2) * 0.28;
  float A = uFlagAmp * (0.05 + 0.3 * u);
  float dzdu = uFlagAmp * 0.3 * wv + A * (-8.4 * cos(ph1) * 0.72 - 16.0 * cos(ph2) * 0.28);
  float dzdv = A * (1.1 * cos(ph1) * 0.72 + 3.0 * cos(ph2) * 0.28);
  vec3 q = p;
  q.z += A * wv;
  // волна забирает ширину, без ветра край провисает
  q.x -= u * uFlagAmp * 0.12;
  q.y -= u * u * (0.2 - 0.15 * uFlagAmp);
  n = normalize(vec3(-dzdu / ${CLOTH_W.toFixed(3)}, -dzdv, 1.0));
  fold = wv * smoothstep(0.0, 0.35, u) * uFlagAmp;
  return q;
}
`;

// Полотнище: красное с белым рукавом у флагштока (люверсы), подрубленный край, нити ткани.
function clothTexture() {
  const W = 512, H = 344;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#a01c15';
  g.fillRect(0, 0, W, H);
  // крупная неровность окраски и нити
  for (let i = 0; i < 1400; i++) {
    const y = Math.random() * H;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,90,70,0.05)' : 'rgba(60,0,0,0.06)';
    g.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * W;
    g.fillStyle = 'rgba(40,0,0,0.04)';
    g.fillRect(x, 0, 1, H);
  }
  // подгиб по краям — темнее, строчка
  g.fillStyle = 'rgba(70,6,4,0.45)';
  g.fillRect(0, 0, W, 9); g.fillRect(0, H - 9, W, 9); g.fillRect(W - 9, 0, 9, H);
  g.strokeStyle = 'rgba(255,200,190,0.35)';
  g.setLineDash([5, 4]);
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(0, 11); g.lineTo(W - 11, 11); g.lineTo(W - 11, H - 11); g.lineTo(0, H - 11); g.stroke();
  // рукав из белой парусины и два люверса
  g.setLineDash([]);
  g.fillStyle = '#e9e4d8';
  g.fillRect(0, 0, 30, H);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(28, 0, 3, H);
  [26, H - 26].forEach(function (y) {
    g.fillStyle = '#9a8f78'; g.beginPath(); g.arc(14, y, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a342b'; g.beginPath(); g.arc(14, y, 4, 0, Math.PI * 2); g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// флагшток, плита с болтами, навершие, блок, утка и фал — одна геометрия с цветом вершин
function poleGeometry() {
  const b = new Batch();
  const m = new THREE.Matrix4();
  const steel = new THREE.Color(0.62, 0.64, 0.67), dark = new THREE.Color(0.3, 0.31, 0.33), bolt = new THREE.Color(0.5, 0.5, 0.52);
  const brass = new THREE.Color(0.95, 0.68, 0.32), rope = new THREE.Color(0.86, 0.83, 0.76);
  b.add(roundedBox(0.34, 0.03, 0.34, 0.006, 3), m.makeTranslation(0, 0.015, 0), dark);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) { b.add(cylinder(0.013, 0.013, 0.022, 6), m.makeTranslation(s[0] * 0.125, 0.03, s[1] * 0.125), bolt); });
  b.add(cylinder(0.055, 0.05, 0.14, 12), m.makeTranslation(0, 0.03, 0), dark);
  b.add(cylinder(0.036, 0.027, POLE, 12), m.makeTranslation(0, 0.03, 0), steel);
  b.add(cylinder(0.04, 0.04, 0.05, 12), m.makeTranslation(0, POLE - 0.02, 0), dark);
  const ball = new THREE.SphereGeometry(0.06, 14, 10);
  b.add({ pos: ball.attributes.position.array, nrm: ball.attributes.normal.array, uv: ball.attributes.uv.array, index: ball.index.array }, m.makeTranslation(0, POLE + 0.085, 0), brass);
  // утка для фала на высоте руки и фал от неё к блоку (по стороне полотнища)
  b.add(roundedBox(0.025, 0.1, 0.03, 0.006, 3), m.makeTranslation(0.045, 1.15, 0), dark);
  b.add(cylinder(0.0045, 0.0045, POLE - 1.2, 4, false), m.makeTranslation(0.05, 1.12, 0.006), rope);
  b.add(cylinder(0.0045, 0.0045, POLE - 1.2, 4, false), m.makeTranslation(0.05, 1.12, -0.006), rope);
  return b.geometry();
}

function ss(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function outBack(u) { const k = u - 1; return 1 + 2.7 * k * k * k + 1.7 * k * k; }

export function createFlag(opts) {
  const group = new THREE.Group();
  group.name = 'fx-flag';
  group.visible = false;
  const uFlagT = { value: 0 }, uFlagAmp = { value: 0 };
  const uSunV = { value: new THREE.Vector3(0, 1, 0) }, uSunCol = { value: new THREE.Vector3() };

  const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.32, vertexColors: true });
  linkSky(poleMat);
  const pole = new THREE.Mesh(poleGeometry(), poleMat);
  pole.castShadow = !!opts.shadows;
  pole.receiveShadow = true;
  pole.userData.noGI = true;

  const clothGeo = new THREE.PlaneGeometry(CLOTH_W, CLOTH_H, 30, 16).translate(HOIST + CLOTH_W / 2, TOP - CLOTH_H / 2, 0);
  clothGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(clothGeo.attributes.position.count * 3).fill(1), 3));
  const clothMat = new THREE.MeshStandardMaterial({ map: clothTexture(), roughness: 0.82, metalness: 0, side: THREE.DoubleSide, vertexColors: true });
  clothMat.onBeforeCompile = function (shader) {
    Object.assign(shader.uniforms, { uFlagT, uFlagAmp, uFlagSunV: uSunV, uFlagSunCol: uSunCol });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vFlagFold;\n' + WAVE_GLSL)
      .replace('#include <beginnormal_vertex>', 'vec3 flagN;\nfloat flagFold;\nvec3 flagP = flagWave(position, flagN, flagFold);\nvFlagFold = flagFold;\nvec3 objectNormal = flagN;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif')
      .replace('#include <begin_vertex>', 'vec3 transformed = flagP;');
    // складки: впадина волны (со стороны взгляда) темнее — рассеянный свет в неё не доходит; солнце за полотнищем —
    // ткань просвечивает (тонкий ламберт с обратной стороны)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uFlagSunV, uFlagSunCol;\nvarying float vFlagFold;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat flagF = vFlagFold * (gl_FrontFacing ? 1.0 : -1.0);\ndiffuseColor.rgb *= 1.0 + flagF * (flagF > 0.0 ? 0.22 : 0.6);')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directDiffuse += diffuseColor.rgb * uFlagSunCol * (max(0.0, dot(-normal, uFlagSunV)) * 0.3);');
  };
  clothMat.customProgramCacheKey = function () { return 'fxflag4'; };
  linkSky(clothMat);
  const cloth = new THREE.Mesh(clothGeo, clothMat);
  cloth.name = 'fx-flag-cloth';
  cloth.castShadow = !!opts.shadows;
  cloth.receiveShadow = true;
  cloth.userData.noGI = true;
  // затенение углов (post.js) рисует нормали своим материалом — плоское полотнище без волны дало бы чужую тень
  cloth.userData.noAO = true;
  cloth.frustumCulled = false;
  if (opts.shadows) {
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    depth.onBeforeCompile = function (shader) {
      shader.uniforms.uFlagT = uFlagT; shader.uniforms.uFlagAmp = uFlagAmp;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + WAVE_GLSL)
        .replace('#include <begin_vertex>', 'vec3 flagN;\nfloat flagFold;\nvec3 transformed = flagWave(position, flagN, flagFold);');
    };
    depth.customProgramCacheKey = function () { return 'fxflagdepth3'; };
    cloth.customDepthMaterial = depth;
  }
  // полотнище поднимают по флагштоку: свой узел, сдвиг по высоте
  const hoist = new THREE.Group();
  hoist.add(cloth);
  group.add(pole, hoist);

  let t = -1, dyn = false;
  function show(x, y, z, scale, yaw) {
    group.position.set(x, y, z);
    group.rotation.set(0, yaw, 0);
    group.scale.setScalar(scale);
    group.visible = true;
    t = 0;
    uFlagT.value = Math.random() * 10;
    pole.scale.set(1, 0.001, 1);
    hoist.position.y = -(POLE - CLOTH_H - 0.4);
    cloth.visible = false;
    if (!dyn) { DYNAMIC.add(group); dyn = true; }
  }
  // из списка движущихся (render.js): и слой скорости долой — иначе проход скорости рисовал бы его со старой матрицей
  function still() {
    if (!dyn) return;
    DYNAMIC.delete(group);
    group.traverse(function (o) { o.layers.disable(2); });
    dyn = false;
  }
  function hide() {
    group.visible = false;
    t = -1;
    still();
  }
  // Подъём: флагшток выдвигается за 0,55 с (с отскоком), полотнище идёт вверх с 0,35 до 1,7 с и разворачивается.
  function update(dt) {
    if (t < 0) return;
    t += dt;
    uFlagT.value += dt;
    pole.scale.y = Math.max(0.001, t < 0.55 ? outBack(t / 0.55) : 1);
    const u = ss(t, 0.35, 1.7);
    cloth.visible = t > 0.3;
    hoist.position.y = -(1 - u) * (POLE - CLOTH_H - 0.4);
    // порывы ветра
    const gust = 0.86 + 0.1 * Math.sin(uFlagT.value * 0.63) + 0.05 * Math.sin(uFlagT.value * 1.9 + 1.1);
    uFlagAmp.value = (0.3 + 0.7 * ss(t, 1.1, 2.2)) * gust;
    // скорость для сглаживания кадра — только пока движется весь флаг
    if (t > 2) still();
  }
  const _v = new THREE.Vector3();
  function light(sky, camera) {
    if (t < 0) return;
    _v.copy(sky.state.sunDir).transformDirection(camera.matrixWorldInverse);
    uSunV.value.copy(_v);
    uSunCol.value.set(sky.sun.color.r, sky.sun.color.g, sky.sun.color.b).multiplyScalar(sky.sun.intensity / Math.PI);
  }
  return {
    group, show, hide, update, light,
    state: function () { return t < 0 ? null : { t: Math.round(t * 100) / 100, amp: Math.round(uFlagAmp.value * 100) / 100, pos: group.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }), scale: group.scale.x, top: group.position.y + POLE * group.scale.x }; },
  };
}
