// Orc Armory: a viewer for one character GLB whose top-level nodes are parts (body, hair, every piece of gear).
// Parts can be switched off / soloed and show their triangle / vertex counts; shading modes include geometry normals,
// the normal map, the textures and "texture x normals" (a custom shader), and a texture gallery with channels.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODELS = [
  { id: 'rig', label: 'Риг: исходный', title: 'Орчиха-воительница', sub: 'риг Tripo + 6 анимаций', file: '../models/orc-outfit-anim.glb', bytes: 28996340 },
  { id: 'rigfix', label: 'Риг: исправленный', title: 'Орчиха-воительница', sub: 'копия с исправленными весами', file: '../models/orc-outfit-anim-rigfix.glb', bytes: 28996340 },
  { id: 'rigfix2', label: 'Риг: + кости', title: 'Орчиха-воительница', sub: 'кости наплечников, повязок и волос', file: '../models/orc-outfit-anim-rigfix2.glb', bytes: 0 },
  { id: 'rigfix3', label: 'Риг: + физика', title: 'Орчиха-воительница', sub: 'новая юбка · физика ткани, меха, волос и подвесок', file: '../models/orc-outfit-anim-rigfix5.glb', bytes: 0 },
  { id: 'cascadeur', label: 'Cascadeur', title: 'Орчиха-воительница', sub: 'AutoPhysics Cascadeur · ровные тайминги · физика v2', file: '../models/orc-outfit-anim-rigfix6.glb', bytes: 0 },
];
const MODEL = MODELS.find((m) => m.id === new URLSearchParams(location.search).get('m')) || MODELS[0];
const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const kfmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `${n}`);

// ---------- renderer, scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#stage').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotateSpeed = 1.2;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const sun = new THREE.DirectionalLight(0xfff4e8, 1.6);
sun.position.set(2.2, 4.5, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 12 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const floor = new THREE.Mesh(new THREE.CircleGeometry(2.6, 96),
  new THREE.MeshStandardMaterial({ color: 0x2a2e3a, roughness: 0.92, transparent: true, alphaMap: radialTexture(), depthWrite: false }));
floor.rotation.x = -Math.PI / 2;
const catcher = new THREE.Mesh(new THREE.CircleGeometry(2.6, 96), new THREE.ShadowMaterial({ opacity: 0.42 }));
catcher.rotation.x = -Math.PI / 2;
catcher.position.y = 0.001;
catcher.receiveShadow = true;
const ring = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 128), new THREE.MeshBasicMaterial({ color: 0xff7a45, transparent: true, opacity: 0.18, depthWrite: false }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.002;
scene.add(floor, catcher, ring);
const root = new THREE.Group();
scene.add(root);

// ---------- parts ----------
const GEAR = { Pauldron: 'Наплечник', Bracer: 'Наруч', Boot: 'Ботинок' };
const NAMED = { Orc_Base: ['Тело', '', 'Тело'], Skirt_T: ['Юбка', '', 'Юбка'] };
const COLORS = ['#ff7a45', '#ffd166', '#5ad28c', '#4cc9f0', '#7b8cff', '#c77dff', '#ff5d8f', '#2ec4b6', '#f4a261', '#e9c46a'];
function describe(name) {
  if (NAMED[name]) { const [n, side, group] = NAMED[name]; return { name: n, side, group }; }
  let m = /^(Pauldron|Bracer|Boot)_T_([RL])$/.exec(name);
  if (m) return { name: GEAR[m[1]], side: m[2] === 'R' ? 'правый' : 'левый', group: 'Броня' };
  m = /^Hair_(\d+)/.exec(name);
  if (m) return { name: 'Волосы', side: '', group: 'Волосы' };
  return { name, side: '', group: 'Прочее' };
}
const parts = [];
const meshes = [];
let total = { tris: 0, verts: 0, quads: 0, lone: 0, polys: 0 };
const state = { mode: 'pbr', nStrength: 1, useNmap: true, mulLayer: 0, mulStrength: 1, mapKind: 'map', channel: 0, sel: null, solo: null };

// ---------- shading ----------
const VS = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying vec3 vN; varying vec3 vPos; varying vec2 vUv;
void main() {
  vUv = uv;
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  vPos = wp.xyz;
  vN = normalize(mat3(modelMatrix) * objectNormal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FS = /* glsl */ `
uniform sampler2D uMap; uniform sampler2D uNormal; uniform sampler2D uTex;
uniform bool uHasMap; uniform bool uHasNormal; uniform bool uHasTex; uniform bool uTexSRGB; uniform bool uUseNormalMap;
uniform int uMode; uniform int uLayer; uniform int uChannel;
uniform float uStrength; uniform float uNormalScale; uniform vec2 uNScale; uniform vec3 uCam;
varying vec3 vN; varying vec3 vPos; varying vec2 vUv;
vec3 toSRGB(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
vec3 perturb(vec3 N) {                                   // tangent space from screen derivatives (no tangents needed)
  vec3 q0 = dFdx(vPos), q1 = dFdy(vPos);
  vec2 st0 = dFdx(vUv), st1 = dFdy(vUv);
  vec3 q1p = cross(q1, N), q0p = cross(N, q0);
  vec3 T = q1p * st0.x + q0p * st1.x, B = q1p * st0.y + q0p * st1.y;
  float det = max(dot(T, T), dot(B, B));
  float s = det == 0.0 ? 0.0 : inversesqrt(det);
  vec3 m = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
  m.xy *= uNScale * uNormalScale;
  return normalize(T * (m.x * s) + B * (m.y * s) + N * m.z);
}
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  if (uHasNormal && uUseNormalMap) N = perturb(N);
  vec3 nCol = uHasNormal ? texture2D(uNormal, vUv).rgb : vec3(0.5, 0.5, 1.0);
  vec3 c;
  if (uMode == 0) c = N * 0.5 + 0.5;                                      // world-space normals
  else if (uMode == 1) c = nCol;                                          // the normal map as it is stored
  else if (uMode == 3) {                                                  // one texture / one channel
    vec4 t = uHasTex ? texture2D(uTex, vUv) : vec4(0.3, 0.3, 0.3, 1.0);
    vec4 d = vec4(uTexSRGB ? toSRGB(t.rgb) : t.rgb, t.a);
    c = uChannel == 0 ? d.rgb : vec3(uChannel == 1 ? d.r : uChannel == 2 ? d.g : uChannel == 3 ? d.b : d.a);
  } else {                                                                // texture x (light by normals | normals | normal map)
    vec3 base = uHasMap ? toSRGB(texture2D(uMap, vUv).rgb) : vec3(0.72);
    vec3 V = normalize(uCam - vPos);
    vec3 L = normalize(V + vec3(0.35, 0.55, 0.2));
    vec3 layer = uLayer == 0 ? vec3(0.16 + 0.84 * max(dot(N, L), 0.0)) : uLayer == 1 ? N * 0.5 + 0.5 : nCol;
    c = mix(base, base * layer, uStrength);
  }
  gl_FragColor = vec4(c, 1.0);
}`;
const MODES = [
  { id: 'pbr', name: 'PBR', sw: 'radial-gradient(circle at 30% 30%, #f3d2b3, #8a5a3c 60%, #2a1b12)' },
  { id: 'albedo', name: 'Текстура', sw: 'linear-gradient(135deg, #c0392b, #7a8a3a, #6b4a35)' },
  { id: 'normals', name: 'Нормали', sw: 'linear-gradient(135deg, #8080ff, #ff8080, #80ff80)' },
  { id: 'nmap', name: 'Normal map', sw: 'linear-gradient(135deg, #8080ff, #7f7fff 40%, #a3a3ff)' },
  { id: 'mul', name: 'Текстура × нормали', sw: 'linear-gradient(135deg, #3a2a20, #c98f5a, #8080ff)' },
  { id: 'clay', name: 'Глина', sw: 'radial-gradient(circle at 30% 30%, #f4efe8, #a8a29a 60%, #4a4640)' },
  { id: 'maps', name: 'Карты', sw: 'conic-gradient(#e33, #3e3, #33e, #e33)' },
  { id: 'id', name: 'Цвет частей', sw: 'conic-gradient(#ff7a45, #ffd166, #5ad28c, #4cc9f0, #c77dff, #ff7a45)' },
];
const SHADER_MODE = { normals: 0, nmap: 1, mul: 2, maps: 3 };
const MAP_KINDS = [['map', 'Цвет', true, 0], ['normalMap', 'Нормали', false, 0], ['roughnessMap', 'Roughness', false, 2],
                   ['metalnessMap', 'Metalness', false, 3], ['aoMap', 'AO', false, 1]];
const shaderMats = [];

function matFor(mesh, mode) {
  const u = mesh.userData;
  const o = u.orig;
  u.mats ??= {};
  if (mode === 'pbr') return o;
  if (u.mats[mode]) return u.mats[mode];
  let m;
  if (mode === 'albedo') m = new THREE.MeshBasicMaterial({ map: o.map, color: o.map ? 0xffffff : o.color, side: o.side });
  else if (mode === 'clay') m = new THREE.MeshStandardMaterial({ color: 0xcfc8be, roughness: 0.6, normalMap: o.normalMap, normalScale: o.normalScale.clone(), side: o.side });
  else if (mode === 'id') m = new THREE.MeshStandardMaterial({ color: u.part.color, roughness: 0.55, side: o.side });
  else {
    if (u.mats.shader) return u.mats.shader;
    m = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, side: o.side,
      uniforms: {
        uMap: { value: o.map }, uHasMap: { value: !!o.map }, uNormal: { value: o.normalMap }, uHasNormal: { value: !!o.normalMap },
        uNScale: { value: o.normalScale ? o.normalScale.clone() : new THREE.Vector2(1, 1) }, uTex: { value: null }, uHasTex: { value: false },
        uTexSRGB: { value: false }, uUseNormalMap: { value: true }, uMode: { value: 0 }, uLayer: { value: 0 }, uChannel: { value: 0 },
        uStrength: { value: 1 }, uNormalScale: { value: 1 }, uCam: { value: camera.position },
      },
    });
    m.userData.orig = o;
    shaderMats.push(m);
    u.mats.shader = m;
    return m;
  }
  u.mats[mode] = m;
  return m;
}
function syncShaders() {
  const kind = MAP_KINDS.find((k) => k[0] === state.mapKind);
  for (const m of shaderMats) {
    const U = m.uniforms, o = m.userData.orig;
    U.uMode.value = SHADER_MODE[state.mode] ?? 0;
    U.uLayer.value = state.mulLayer;
    U.uStrength.value = state.mulStrength;
    U.uNormalScale.value = state.nStrength;
    U.uUseNormalMap.value = state.useNmap;
    const t = o[kind[0]] || null;
    U.uTex.value = t; U.uHasTex.value = !!t; U.uTexSRGB.value = kind[2];
    U.uChannel.value = state.channel;
  }
  for (const mesh of meshes) {
    const o = mesh.userData.orig;
    if (o.normalMap) o.normalScale.copy(mesh.userData.nScale).multiplyScalar(state.useNmap ? state.nStrength : 0);
    const clay = mesh.userData.mats?.clay;
    if (clay && clay.normalMap) clay.normalScale.copy(o.normalScale);
  }
}
function applyMode() {
  for (const mesh of meshes) mesh.material = matFor(mesh, state.mode);
  syncShaders();
  for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === state.mode);
  buildOptions();
}

// ---------- UI: modes and options ----------
function seg(items, value, onPick) {
  const d = document.createElement('div');
  d.className = 'seg';
  for (const [v, label] of items) {
    const b = document.createElement('button');
    b.textContent = label;
    b.classList.toggle('on', v === value);
    b.onclick = () => { onPick(v); for (const x of d.children) x.classList.toggle('on', x === b); };
    d.append(b);
  }
  return d;
}
function row(label, el) {
  const r = document.createElement('div');
  r.className = 'row';
  if (label) { const s = document.createElement('span'); s.textContent = label; r.append(s); }
  r.append(el);
  return r;
}
function slider(label, min, max, step, value, onInput) {
  const l = document.createElement('label');
  l.className = 'slider';
  l.innerHTML = `${label} <input type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output>${(+value).toFixed(2)}</output>`;
  const i = l.querySelector('input'), o = l.querySelector('output');
  i.oninput = () => { o.textContent = (+i.value).toFixed(2); onInput(+i.value); };
  return l;
}
function toggle(label, value, onChange) {
  const l = document.createElement('label');
  l.className = 'switch';
  l.innerHTML = `<input type="checkbox" ${value ? 'checked' : ''}><i></i>${label}`;
  l.querySelector('input').onchange = (e) => onChange(e.target.checked);
  return l;
}
function note(text) { const p = document.createElement('p'); p.className = 'note'; p.textContent = text; return p; }
const withN = () => meshes.filter((m) => m.userData.orig.normalMap).map((m) => m.userData.part).filter((p, i, a) => a.indexOf(p) === i);
function buildOptions() {
  const box = $('#mode-opts');
  box.innerHTML = '';
  const nParts = withN().map((p) => p.label).join(', ') || 'нет';
  const nmapCtl = () => [toggle('Normal map включена', state.useNmap, (v) => { state.useNmap = v; syncShaders(); }),
    slider('Сила normal map', 0, 2, 0.05, state.nStrength, (v) => { state.nStrength = v; syncShaders(); })];
  if (state.mode === 'pbr' || state.mode === 'clay') box.append(...nmapCtl(), note(`Normal map есть у: ${nParts}.`));
  if (state.mode === 'normals') box.append(...nmapCtl(), note('Цвет = направление нормали в мире: X → красный, Y (вверх) → зелёный, Z (вперёд) → синий.'));
  if (state.mode === 'nmap') box.append(note(`Normal map как она хранится в текстуре. Есть у: ${nParts}; остальные — плоский синий (0.5, 0.5, 1).`));
  if (state.mode === 'mul') {
    box.append(row('Умножать текстуру на', seg([[0, 'Свет по нормалям'], [1, 'Цвет нормалей'], [2, 'Normal map']], state.mulLayer, (v) => { state.mulLayer = v; syncShaders(); })),
      slider('Сила умножения', 0, 1, 0.05, state.mulStrength, (v) => { state.mulStrength = v; syncShaders(); }), ...nmapCtl());
  }
  if (state.mode === 'maps') {
    box.append(row('Карта', seg(MAP_KINDS.map((k) => [k[0], k[1]]), state.mapKind, (v) => {
      state.mapKind = v; state.channel = MAP_KINDS.find((k) => k[0] === v)[3]; syncShaders(); buildOptions();
    })), row('Канал', seg([[0, 'RGB'], [1, 'R'], [2, 'G'], [3, 'B'], [4, 'A']], state.channel, (v) => { state.channel = v; syncShaders(); })),
    note('Roughness и Metalness у glTF лежат в одной текстуре (G и B), AO — в R. Части без карты — серые.'));
  }
  if (state.mode === 'id') box.append(note('Каждая часть — своим цветом, как точки в списке слева.'));
}
function buildModes() {
  const box = $('#modes');
  MODES.forEach((m, i) => {
    const b = document.createElement('button');
    b.dataset.mode = m.id;
    b.innerHTML = `<span class="sw" style="background:${m.sw}"></span>${m.name}<span class="k">${i + 1}</span>`;
    b.onclick = () => { state.mode = m.id; applyMode(); };
    box.append(b);
  });
}

// ---------- UI: parts ----------
// GLB meshes are triangulated; Blender writes every quad as two consecutive triangles sharing an edge (lone triangles
// of a mixed mesh sit in between). Pairing them back gives the modeller's polycount: a quad = 1 polygon.
function quadTopo(g) {
  const idx = g.index && g.index.array;
  const tris = idx ? idx.length / 3 : g.attributes.position.count / 3;
  if (!idx) return { quads: 0, lone: tris, lines: null };
  let quads = 0, lone = 0;
  const seen = new Set(), lines = [];
  const add = (a, b) => { const k = a < b ? a * 4294967296 + b : b * 4294967296 + a; if (!seen.has(k)) { seen.add(k); lines.push(a, b); } };
  for (let t = 0; t < tris;) {
    const A = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]];
    const B = t + 1 < tris ? [idx[t * 3 + 3], idx[t * 3 + 4], idx[t * 3 + 5]] : [];
    const shared = A.filter((v) => B.includes(v));
    const isQuad = shared.length === 2;
    for (const T of isQuad ? [A, B] : [A]) for (let i = 0; i < 3; i++) {
      const a = T[i], b = T[(i + 1) % 3];
      if (!(isQuad && shared.includes(a) && shared.includes(b))) add(a, b);   // the diagonal is not an edge
    }
    if (isQuad) { quads++; t += 2; } else { lone++; t += 1; }
  }
  return { quads, lone, lines };
}
function partCounts(obj) {
  let tris = 0, verts = 0, quads = 0, lone = 0;
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    verts += g.attributes.position.count;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    const q = o.userData.topo || (o.userData.topo = quadTopo(g));
    quads += q.quads; lone += q.lone;
  });
  const x = obj.userData;                                   // exact counts from Blender (glTF node extras), if exported
  if (Number.isFinite(x.poly_faces)) return { tris: Math.round(tris), verts, quads: x.poly_quads, lone: x.poly_tris, ngons: x.poly_ngons || 0, polys: x.poly_faces, exact: true };
  return { tris: Math.round(tris), verts, quads, lone, ngons: 0, polys: quads + lone, exact: false };
}
function setVisible(p, on) {
  p.visible = on;
  p.obj.visible = on;
}
function refreshParts() {
  let vp = 0, vq = 0, vl = 0;
  for (const p of parts) {
    const show = state.solo ? p === state.solo : p.visible;
    p.obj.visible = show;
    if (show) { vp += p.polys; vq += p.quads; vl += p.lone; }
    p.li.classList.toggle('hidden', !show);
    p.li.classList.toggle('sel', p === state.sel);
    p.li.querySelector('input').checked = show;
    p.li.querySelector('.p-solo').classList.toggle('on', p === state.solo);
  }
  $('#totals').innerHTML =
    `<div class="stat visible"><small>Видно сейчас, полигонов</small><b>${fmt(vp)}</b><span>${fmt(vq)} квад. · ${fmt(vl)} треуг. · ${Math.round((vp / total.polys) * 100)}%</span></div>` +
    `<div class="stat"><small>Вся модель, полигонов</small><b>${fmt(total.polys)}</b><span>${fmt(total.quads)} квад. · ${fmt(total.lone)} треуг.</span></div>`;
  const groups = [...new Set(parts.map((p) => p.group))];
  const gbox = $('#groups');
  gbox.innerHTML = '';
  for (const g of groups) {
    const ps = parts.filter((p) => p.group === g);
    const on = ps.some((p) => p.visible);
    const b = document.createElement('button');
    b.className = on ? '' : 'off';
    b.textContent = `${on ? '●' : '○'} ${g}`;
    b.title = `${on ? 'Скрыть' : 'Показать'}: ${g} (${fmt(ps.reduce((s, p) => s + p.polys, 0))} полигонов)`;
    b.onclick = () => { state.solo = null; for (const p of ps) setVisible(p, !on); refreshParts(); };
    gbox.append(b);
  }
  updateCard();
}
function buildParts() {
  const ul = $('#parts');
  ul.innerHTML = '';
  for (const p of parts) {
    const li = document.createElement('li');
    li.className = 'part';
    const pct = (p.polys / total.polys) * 100;
    li.innerHTML = `<span class="tgl"><input type="checkbox" checked title="Показать / скрыть"><i></i></span>
      <div class="p-main"><div class="p-name"><span class="dot" style="background:${p.color}"></span>${p.name}${p.side ? ` <span class="side">${p.side}</span>` : ''}<span class="pct">${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%</span></div>
      <div class="p-nums"><span><b>${fmt(p.polys)}</b> полигонов</span></div>
      <div class="p-sub">${fmt(p.quads)} квадов · ${fmt(p.lone)} треуг.${p.ngons ? ` · ${fmt(p.ngons)} n-гонов` : ''}</div>
      <div class="p-bar"><i style="width:${Math.max(pct, 0.5).toFixed(1)}%"></i></div></div>
      <button class="p-solo ghost" title="Оставить только эту часть">◎</button>`;
    li.querySelector('input').onchange = (e) => { if (state.solo) { state.solo = null; for (const q of parts) q.visible = q.obj.visible; } setVisible(p, e.target.checked); refreshParts(); };
    li.querySelector('.p-solo').onclick = (e) => { e.stopPropagation(); state.solo = state.solo === p ? null : p; refreshParts(); frame(true); };
    li.querySelector('.p-main').onclick = () => select(state.sel === p ? null : p);
    li.onmouseenter = () => hover(p, true);
    li.onmouseleave = () => hover(p, false);
    p.li = li;
    ul.append(li);
  }
  $('#all-on').onclick = () => { state.solo = null; for (const p of parts) setVisible(p, true); refreshParts(); };
  $('#all-off').onclick = () => { state.solo = null; for (const p of parts) setVisible(p, false); refreshParts(); };
}

// highlight overlays (share the geometry)
const hlMat = new THREE.MeshBasicMaterial({ color: 0xff7a45, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1 });
const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1 });
const wireSkinMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.13, depthWrite: false });
const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false });
function overlay(mesh, key, mat) {
  if (!mesh.userData[key]) {
    let o;
    if (mesh.isSkinnedMesh) {                                // animated: the overlay must be skinned by the same skeleton
      o = new THREE.SkinnedMesh(mesh.geometry, key === 'wire' ? wireSkinMat : mat);
      o.bind(mesh.skeleton, mesh.bindMatrix);
    } else if (key === 'wire') {                            // the quad edges (no diagonals), the real topology
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', mesh.geometry.attributes.position);
      lg.setIndex(mesh.userData.topo.lines || []);
      o = new THREE.LineSegments(lg, mat);
    } else o = new THREE.Mesh(mesh.geometry, mat);
    o.raycast = () => {}; o.visible = false; mesh.add(o); mesh.userData[key] = o;
  }
  return mesh.userData[key];
}
function hover(p, on) { for (const m of p.meshes) overlay(m, 'hov', hoverMat).visible = on && p !== state.sel; }
function select(p) {
  state.sel = p;
  for (const q of parts) for (const m of q.meshes) overlay(m, 'hl', hlMat).visible = q === p;
  refreshParts();
  buildTextures();
  if (p) p.li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function updateCard() {
  const c = $('#part-card');
  const p = state.sel;
  if (!p) { c.hidden = true; return; }
  const mats = new Set(), texs = texturesOf([p]);
  for (const m of p.meshes) mats.add(m.userData.orig);
  c.hidden = false;
  c.innerHTML = `<h3><span class="dot" style="background:${p.color}"></span>${p.name}${p.side ? ` <span style="color:var(--dim);font-weight:400">${p.side}</span>` : ''}</h3>
    <div class="kv"><span>Полигоны (квад = 1)</span><b>${fmt(p.polys)}</b><span>из них квадов</span><b>${fmt(p.quads)}</b>
    <span>из них треугольников</span><b>${fmt(p.lone)}</b>${p.ngons ? `<span>из них n-гонов</span><b>${fmt(p.ngons)}</b>` : ''}<span>Вершины</span><b>${fmt(p.verts)}</b>
    <span>Доля модели</span><b>${((p.polys / total.polys) * 100).toFixed(1)}%</b><span>В движке (треуг.)</span><b>${fmt(p.tris)}</b>
    <span>Материалы / текстуры</span><b>${mats.size} / ${texs.length}</b>
    <span>Узел в GLB</span><b>${p.obj.name}</b></div>
    <div class="row-btns"><button id="c-vis">${p.obj.visible ? 'Скрыть' : 'Показать'}</button><button id="c-solo">${state.solo === p ? 'Показать все' : 'Только она'}</button><button id="c-frame">Вписать</button></div>`;
  $('#c-vis').onclick = () => { state.solo = null; setVisible(p, !p.obj.visible); refreshParts(); };
  $('#c-solo').onclick = () => { state.solo = state.solo === p ? null : p; refreshParts(); frame(true); };
  $('#c-frame').onclick = () => frameBox(new THREE.Box3().setFromObject(p.obj), true);
}

// ---------- textures ----------
const TEX_KINDS = [['map', 'Цвет'], ['normalMap', 'Нормали'], ['roughnessMap', 'ORM'], ['metalnessMap', 'ORM'], ['aoMap', 'AO'], ['emissiveMap', 'Свечение']];
function texturesOf(ps) {
  const seen = new Map();
  for (const p of ps) for (const m of p.meshes) {
    const o = m.userData.orig;
    for (const [k, label] of TEX_KINDS) {
      const t = k === 'normalMap' ? m.userData.nMap : o[k];
      if (!t || !t.image) continue;
      if (!seen.has(t.uuid)) seen.set(t.uuid, { t, label, parts: new Set() });
      seen.get(t.uuid).parts.add(p.name);
    }
  }
  return [...seen.values()];
}
function drawTo(canvas, img, max) {
  const k = Math.min(1, max / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * k); canvas.height = Math.round(img.height * k);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
}
function buildTextures() {
  const box = $('#textures');
  box.innerHTML = '';
  const list = texturesOf(state.sel ? [state.sel] : parts);
  $('#tex-scope').textContent = state.sel ? state.sel.label : `все части · ${list.length}`;
  for (const e of list) {
    const f = document.createElement('figure');
    const cv = document.createElement('canvas');
    drawTo(cv, e.t.image, 192);
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<b>${e.label}</b> ${e.t.image.width}² · ${[...e.parts].join(', ')}`;
    f.append(cv, cap);
    f.onclick = () => openLightbox(e);
    box.append(f);
  }
}
// lightbox with channels, zoom, pan
const lb = { img: null, full: null, s: 1, x: 0, y: 0 };
function openLightbox(e) {
  $('#lightbox').hidden = false;
  $('#lb-title').textContent = `${e.label} · ${e.t.image.width}×${e.t.image.height} · ${[...e.parts].join(', ')}`;
  const src = document.createElement('canvas');
  drawTo(src, e.t.image, 2048);
  lb.full = src.getContext('2d').getImageData(0, 0, src.width, src.height);
  const chBox = $('#lb-ch');
  chBox.innerHTML = '';
  chBox.append(...seg([[0, 'RGB'], [1, 'R'], [2, 'G'], [3, 'B'], [4, 'A']], 0, showChannel).children);
  showChannel(0);
  fitLightbox();
}
function showChannel(ch) {
  const cv = $('#lb-canvas'), d = lb.full;
  cv.width = d.width; cv.height = d.height;
  const out = new ImageData(new Uint8ClampedArray(d.data), d.width, d.height);
  if (ch) {
    const a = out.data;
    for (let i = 0; i < a.length; i += 4) { const v = a[i + ch - 1]; a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255; }
  }
  cv.getContext('2d').putImageData(out, 0, 0);
}
function lbApply() { $('#lb-canvas').style.transform = `translate(${lb.x}px, ${lb.y}px) scale(${lb.s})`; }
function fitLightbox() {
  const v = $('#lb-view').getBoundingClientRect(), cv = $('#lb-canvas');
  lb.s = Math.min(v.width / cv.width, v.height / cv.height) * 0.95;
  lb.x = (v.width - cv.width * lb.s) / 2; lb.y = (v.height - cv.height * lb.s) / 2;
  lbApply();
}
(() => {
  const view = $('#lb-view');
  view.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = view.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const k = Math.exp(-e.deltaY * 0.0015);
    lb.x = mx - (mx - lb.x) * k; lb.y = my - (my - lb.y) * k; lb.s *= k;
    lbApply();
  }, { passive: false });
  let drag = null;
  view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX - lb.x, y: e.clientY - lb.y }; view.classList.add('drag'); });
  addEventListener('pointermove', (e) => { if (drag) { lb.x = e.clientX - drag.x; lb.y = e.clientY - drag.y; lbApply(); } });
  addEventListener('pointerup', () => { drag = null; view.classList.remove('drag'); });
  view.addEventListener('dblclick', fitLightbox);
  $('#lb-close').onclick = () => { $('#lightbox').hidden = true; };
})();

// ---------- camera ----------
const VIEWS = { front: [0, 0.05, 1], back: [0, 0.05, -1], left: [-1, 0.05, 0], right: [1, 0.05, 0], three: [0.72, 0.28, 0.72], top: [0, 1, 0.0001] };
let tween = null;
function frameBox(box, animate, dir) {
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const d = camera.position.clone().sub(controls.target).normalize();
  const v = dir ? new THREE.Vector3(...dir).normalize() : d.lengthSq() ? d : new THREE.Vector3(0, 0, 1);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const fit = Math.max(s.y, s.x / camera.aspect, s.z / camera.aspect) / 2 / Math.tan(fov / 2) * 1.18 + s.length() * 0.15;
  const to = c.clone().add(v.multiplyScalar(fit));
  if (!animate) { camera.position.copy(to); controls.target.copy(c); return; }
  tween = { t0: performance.now(), p0: camera.position.clone(), c0: controls.target.clone(), p1: to, c1: c };
}
function visibleBox() {
  const b = new THREE.Box3();
  for (const p of parts) if (p.obj.visible) b.expandByObject(p.obj);
  return b;
}
function frame(animate, dir) { frameBox(visibleBox(), animate, dir); }

// ---------- load ----------
async function fetchProgress(url, bytes) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const len = +r.headers.get('content-length') || bytes;
  const reader = r.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    $('#load-bar').style.width = `${Math.min(100, (got / len) * 100)}%`;
    $('#load-text').textContent = `Загрузка модели… ${(got / 1048576).toFixed(1)} / ${(len / 1048576).toFixed(1)} МБ`;
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}
async function load() {
  const buf = await fetchProgress(MODEL.file, MODEL.bytes);
  $('#load-text').textContent = 'Распаковка…';
  const gltf = await new GLTFLoader().parseAsync(buf, '');
  const g = gltf.scene;
  const box = new THREE.Box3().setFromObject(g);
  const c = box.getCenter(new THREE.Vector3());
  g.position.set(-c.x, -box.min.y, -c.z);
  root.add(g);
  root.updateMatrixWorld(true);
  const hasMesh = (o) => { let m = false; o.traverse((x) => { if (x.isMesh) m = true; }); return m; };
  const hasBone = (o) => { let b = false; o.traverse((x) => { if (x.isBone) b = true; }); return b; };
  // a rigged model: the parts are the meshes under the armature node
  const list = g.children.flatMap((o) => (hasBone(o) && !o.isMesh ? o.children.filter((c) => !c.isBone && hasMesh(c)) : [o])).filter(hasMesh);
  setupAnimations(g, gltf.animations);
  for (const o of list) {
    const d = describe(o.name);
    const p = { obj: o, ...d, label: d.side ? `${d.name} ${d.side}` : d.name, visible: true, meshes: [], ...partCounts(o), top: new THREE.Box3().setFromObject(o).max.y };
    o.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      m.material = mat;
      m.userData.orig = mat;
      m.userData.part = p;
      m.userData.nMap = mat.normalMap;
      m.userData.nScale = mat.normalScale ? mat.normalScale.clone() : new THREE.Vector2(1, 1);
      meshes.push(m);
      p.meshes.push(m);
    });
    parts.push(p);
  }
  parts.sort((a, b) => (Math.abs(a.top - b.top) > 0.02 ? b.top - a.top : a.obj.name.localeCompare(b.obj.name)));
  parts.forEach((p, i) => { p.color = COLORS[i % COLORS.length]; });
  total = parts.reduce((s, p) => ({ tris: s.tris + p.tris, verts: s.verts + p.verts, quads: s.quads + p.quads, lone: s.lone + p.lone, polys: s.polys + p.polys }),
    { tris: 0, verts: 0, quads: 0, lone: 0, polys: 0 });
  const size = box.getSize(new THREE.Vector3());
  const texCount = texturesOf(parts).length;
  $('#model-sub').textContent = `${MODEL.title} · ${MODEL.sub}`;
  const sw = $('#model-switch');
  sw.innerHTML = '';
  for (const m of MODELS) {
    const b = document.createElement('button');
    b.textContent = m.label;
    b.classList.toggle('on', m === MODEL);
    b.onclick = () => { if (m !== MODEL) location.search = `?m=${m.id}`; };
    sw.append(b);
  }
  $('#chips').innerHTML = [[fmt(total.polys), 'полигонов'], [fmt(total.quads), 'квадов'], [fmt(total.verts), 'верш.'], [parts.length, 'частей'], [texCount, 'текстур'],
    [`${(buf.byteLength / 1048576).toFixed(1)} МБ`, 'GLB'], [`${size.y.toFixed(2)} м`, 'рост']].map(([v, l]) => `<span class="chip"><b>${v}</b> ${l}</span>`).join('');
  buildParts();
  refreshParts();
  buildTextures();
  applyMode();
  sun.target.position.set(0, size.y / 2, 0);
  frame(false, VIEWS.front);
  $('#loader').classList.add('done');
}

// ---------- controls ----------
buildModes();
for (const b of document.querySelectorAll('#dock [data-cam]')) b.onclick = () => frame(true, VIEWS[b.dataset.cam]);
$('#frame').onclick = () => frame(true);
$('#shot').onclick = () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = `orc-armory-${state.mode}.png`;
  a.click();
};
$('#full').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
$('#wire').onchange = (e) => { for (const m of meshes) overlay(m, 'wire', wireMat).visible = e.target.checked; };
$('#shadows').onchange = (e) => { catcher.visible = e.target.checked; sun.castShadow = e.target.checked; };
$('#floor').onchange = (e) => { floor.visible = ring.visible = e.target.checked; };
$('#spin').onchange = (e) => { controls.autoRotate = e.target.checked; };
for (const [id, apply] of [['env', (v) => { scene.environmentIntensity = v; }], ['sun', (v) => { sun.intensity = v; }], ['exposure', (v) => { renderer.toneMappingExposure = v; }]]) {
  const i = $(`#${id}`), o = i.parentElement.querySelector('output');
  const f = () => { o.textContent = (+i.value).toFixed(2); apply(+i.value); };
  i.oninput = f; f();
}
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') return;
  if (e.key === 'Escape') { if (!$('#lightbox').hidden) $('#lightbox').hidden = true; else select(null); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= MODES.length) { state.mode = MODES[n - 1].id; applyMode(); return; }
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'ц') $('#wire').click();
  if (k === 't' || k === 'е') $('#spin').click();
  if (k === 'f' || k === 'а') frame(true);
});
// click on the model selects the part (a drag does not)
const ray = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects(meshes.filter((m) => m.userData.part.obj.visible), false)[0];
  select(hit ? (hit.object.userData.part === state.sel ? null : hit.object.userData.part) : null);
});

// ---------- loop ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
// ---------- animation ----------
const ANIM_LABELS = { idle: 'Стойка', walk: 'Ходьба', run: 'Бег', slash: 'Удар', cheer: 'Победа', rig_test: 'Тест рига' };
const ANIM_ORDER = ['idle', 'walk', 'run', 'slash', 'cheer', 'rig_test'];
const anim = { mixer: null, clips: [], action: null, playing: true, speed: 1 };
const clock = new THREE.Clock();
function setupAnimations(g, clips) {
  const sec = $('#anim-sec');
  if (!clips || !clips.length) { sec.hidden = true; return; }
  anim.mixer = new THREE.AnimationMixer(g);
  anim.clips = [...clips].sort((a, b) => (ANIM_ORDER.indexOf(a.name) + 99) % 99 - (ANIM_ORDER.indexOf(b.name) + 99) % 99);
  const box = $('#anims');
  box.innerHTML = '';
  for (const c of anim.clips) {
    const b = document.createElement('button');
    b.dataset.clip = c.name;
    b.innerHTML = `<span>${ANIM_LABELS[c.name] || c.name}</span><small>${c.duration.toFixed(1)} с</small>`;
    if (c.name === 'rig_test') b.classList.add('test');
    b.onclick = () => playClip(c.name);
    box.append(b);
  }
  const rest = document.createElement('button');
  rest.innerHTML = '<span>Поза покоя</span><small>A-поза</small>';
  rest.onclick = () => playClip(null);
  box.append(rest);
  $('#anim-play').onclick = () => { anim.playing = !anim.playing; updAnimUI(); };
  $('#anim-speed').oninput = (e) => { anim.speed = +e.target.value; $('#anim-speed-out').textContent = `${anim.speed.toFixed(2)}×`; };
  $('#anim-scrub').oninput = (e) => {
    if (!anim.action) return;
    anim.playing = false;
    anim.action.time = +e.target.value * anim.action.getClip().duration;
    anim.mixer.update(0);
    updAnimUI();
  };
  sec.hidden = false;
  playClip(anim.clips.find((c) => c.name === 'idle') ? 'idle' : anim.clips[0].name);
}
function playClip(name) {
  if (anim.action) anim.action.stop();
  anim.action = null;
  if (name) {
    anim.action = anim.mixer.clipAction(anim.clips.find((c) => c.name === name));
    anim.action.reset().play();
    anim.playing = true;
  } else anim.mixer.stopAllAction();
  anim.mixer.update(0);
  for (const b of document.querySelectorAll('#anims button')) b.classList.toggle('on', (b.dataset.clip || null) === name);
  updAnimUI();
}
function updAnimUI() {
  const a = anim.action;
  $('#anim-play').innerHTML = anim.playing ? '❚❚' : '▶';
  $('#anim-play').disabled = !a;
  if (a) {
    const d = a.getClip().duration, t = a.time % d;
    $('#anim-scrub').value = d ? t / d : 0;
    $('#anim-time').textContent = `${t.toFixed(1)} / ${d.toFixed(1)} с`;
  } else { $('#anim-scrub').value = 0; $('#anim-time').textContent = 'поза покоя'; }
}

function loop(now) {
  const dt = clock.getDelta();
  if (anim.mixer && anim.action && anim.playing) { anim.mixer.update(dt * anim.speed); updAnimUI(); }
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / 450), e = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    controls.target.lerpVectors(tween.c0, tween.c1, e);
    if (k >= 1) tween = null;
  }
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(loop);
window.armory = { state, parts, applyMode, select, frame, refreshParts, setMode: (m) => { state.mode = m; applyMode(); }, anim, playClip };
load().catch((err) => { $('#load-text').textContent = `Ошибка: ${err.message}`; console.error(err); });
