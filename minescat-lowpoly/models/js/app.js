// Котик-шахтёр Low Poly — 3D models page (models-web lane).
// manifest.json (tools/models_export.py) + glb/<id>.glb (no images, no normals) + concepts/<key>.webp.
// Look = MinesCatLP/Lit: final = albedo x (ambient + key x NdotL x shadow) + albedo x emit x strength + rim; flat shading;
// palette = one 256x256 atlas rebuilt here from manifest.palette.swatches (alpha = emit), so no PNG ships.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const LP = (window.__lp = { ready: false, thumbs: 0, thumbsTotal: 0, errors: [], opened: null, version: 1 });
window.addEventListener('error', (e) => LP.errors.push(String(e.message || e)));
window.addEventListener('unhandledrejection', (e) => LP.errors.push('promise: ' + String((e.reason && e.reason.message) || e.reason)));

const $ = (s, r = document) => r.querySelector(s);
const DEG = Math.PI / 180;
const KEY_DIR = new THREE.Vector3(-0.41, 0.866, -0.287).normalize(); // Unity sun (60, 125, 0) -> three, camera at +Z
const CAM_AZ = -24 * DEG, CAM_EL = 30 * DEG, FOV = 30;
const STYLE = {
  sand: { bg: 0xdcb05a, ground: 0xd1a34f },
  dark: { bg: 0x1b1c22, ground: 0x30313a },
};
const CLIP_RU = {
  none: 'Без анимации', Idle: 'Покой', Work: 'Работа', Ready: 'Готово', NoPower: 'Без энергии', Roll: 'Едет',
  Full: 'Полная', LoadPop: 'Загрузка', Spill: 'Высыпание', Approach: 'Герой рядом', Unlock: 'Открытие',
  Unboard: 'Снятие досок', Lantern_Sway: 'Покачивание', Near: 'Покупатель рядом', Spin: 'Вращение', Break: 'Разрушение',
  Sway: 'Покачивание', Pulse: 'Импульс', Yaw: 'Поворот стрелки', Run: 'Бег', Walk: 'Шаг', SwingHammer: 'Удар молотом', Swing: 'Удар',
  Mine: 'Добыча', Attack: 'Атака', Hit: 'Получил удар', Die: 'Гибель', Death: 'Гибель', Victory: 'Победа', Jump: 'Прыжок',
  Dig: 'Копает', Carry: 'Несёт', Celebrate: 'Радость', Stun: 'Оглушён', Spawn: 'Появление', Taunt: 'Дразнит',
  ClimbDown: 'Спуск по верёвке', Found: 'Находка', HeroConfirm: 'Выбран героем', HeroSelectBoy: 'Выбор: Барсик',
  HeroSelectGirl: 'Выбор: Муся', HitReact: 'Получил удар', Interact: 'Взаимодействие', PortalEnter: 'Вход в портал',
  PortalExit: 'Выход из портала', Respawn: 'Возрождение', RunHeavy: 'Бег с грузом', SwingPickaxe: 'Удар киркой',
  UnloadOre: 'Выгрузка руды', Telegraph: 'Замах', Laser: 'Лазер', RageStep: 'Ярость', Roar: 'Рык', Board: 'Заколачивание',
  Enter: 'Вход', Exit: 'Выход', Open: 'Открыть', Collect: 'Сбор', ProcessStart: 'Старт переработки', ProcessDone: 'Готово',
};
const STAGE_RU = ['Целый', 'Трещина 1', 'Трещина 2', 'Трещина 3'];

const state = { man: null, assets: [], byId: new Map(), tab: 'all', palette: null, gltf: new Map(), shown: [] };
const timeU = { value: 0 };
const loader = new GLTFLoader();

// ---------- helpers ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const fmtInt = (n) => n.toLocaleString('ru-RU');
const fmtKB = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ');
const clipName = (n) => String(n).replace(/^.*@/, '');
const clipLabel = (k) => CLIP_RU[clipName(k)] || clipName(k);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const inBack = (x) => { const c = 1.70158; return (c + 1) * x * x * x - c * x * x; };

// ---------- palette ----------
function hexRgb(h) {
  const v = parseInt(String(h).replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function buildPalette(pal) {
  const S = pal.size || 256, C = pal.cell || 16, G = pal.gutter || 2, inner = C - 2 * G, per = S / C;
  const data = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) { data[i * 4] = 255; data[i * 4 + 2] = 255; }
  for (const sw of pal.swatches) {
    const [id, lo, hi, emit] = sw;
    const col = id % per, row = Math.floor(id / per);
    const l = hexRgb(lo), h = hexRgb(hi), a = Math.round(clamp01(+emit || 0) * 255);
    for (let y = 0; y < C; y++) {             // y from the cell bottom (Blender v up)
      const k = Math.min(Math.max(y - G, 0), inner - 1);
      const t = (k + 0.5) / inner;
      const dy = S - 1 - (row * C + y);         // data row 0 = top = glTF v 0 (flipY false)
      for (let x = 0; x < C; x++) {
        const o = (dy * S + col * C + x) * 4;
        data[o] = Math.round(l[0] + (h[0] - l[0]) * t);
        data[o + 1] = Math.round(l[1] + (h[1] - l[1]) * t);
        data[o + 2] = Math.round(l[2] + (h[2] - l[2]) * t);
        data[o + 3] = a;
      }
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

// ---------- material (MinesCatLP/Lit in three) ----------
function slotFlags(name = '') {
  return {
    portal: /portal/i.test(name), fire: /fire/i.test(name), unlit: /unlit/i.test(name), two: /_2S/i.test(name),
    guard: /guard/i.test(name), spent: /spent/i.test(name),
  };
}
function makeMat(slot, rim) {
  const f = slotFlags(slot);
  const m = new THREE.MeshLambertMaterial({ map: state.palette, flatShading: true });
  m.name = slot;
  m.side = f.portal || f.two ? THREE.DoubleSide : THREE.FrontSide;
  if (f.fire) { m.transparent = true; m.blending = THREE.AdditiveBlending; m.depthWrite = false; }
  const tint = f.guard ? new THREE.Color(1, 0.6, 0.54) : f.spent ? new THREE.Color(0.7, 0.7, 0.7) : new THREE.Color(1, 1, 1);
  const u = {
    uEmit: { value: f.portal ? 4 : f.fire ? 5 : f.unlit ? 0 : 3 },
    uGlow: { value: 1 },
    uUnlit: { value: f.portal || f.unlit ? 1 : 0 },
    uPulse: { value: f.portal ? 0.2 : 0 },
    uRim: { value: rim ? 0.15 : 0 },
    uTint: { value: tint },
    uTime: timeU,
  };
  m.userData.u = u;
  m.userData.flags = f;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 lpuv1;\nuniform float uTime;\nuniform float uPulse;\nvarying float vLpPulse;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvLpPulse = 1.0 - uPulse + uPulse * sin( 6.28318530718 * ( 0.75 * uTime - 2.0 * lpuv1.x ) );');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uEmit;\nuniform float uGlow;\nuniform float uUnlit;\nuniform float uRim;\nuniform vec3 uTint;\nvarying float vLpPulse;')
      .replace('#include <map_fragment>', 'vec4 lpTex = texture2D( map, vMapUv );\n\tfloat lpEmit = lpTex.a;\n\tdiffuseColor.rgb *= lpTex.rgb * uTint;')
      .replace(/vec3 outgoingLight = [^;]+;/, [
        'vec3 lpLit = mix( reflectedLight.directDiffuse + reflectedLight.indirectDiffuse, diffuseColor.rgb, uUnlit );',
        '\tvec3 outgoingLight = lpLit + diffuseColor.rgb * ( lpEmit * uEmit * uGlow );',
        '\toutgoingLight += pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 3.0 ) * uRim * vec3( 1.0, 0.896, 0.672 );',
        '\toutgoingLight *= vLpPulse;',
      ].join('\n'));
    if (!sh.fragmentShader.includes('lpLit')) LP.errors.push('shader patch failed: outgoingLight');
  };
  m.customProgramCacheKey = () => 'lp-lit-v1';
  return m;
}

// ---------- model instances ----------
async function getGltf(a) {
  let p = state.gltf.get(a.id);
  if (!p) {
    p = loader.loadAsync(a.glb).then((g) => {
      g.scene.traverse((o) => {
        if (o.isMesh && o.geometry.attributes.uv1 && !o.geometry.attributes.lpuv1) o.geometry.setAttribute('lpuv1', o.geometry.attributes.uv1);
      });
      return g;
    });
    state.gltf.set(a.id, p);
  }
  return p;
}
function nodeByName(root, name) {
  if (!name) return null;
  return root.getObjectByName(name) || root.getObjectByName(String(name).replace(/[.:/[\]]/g, '')) ||
    root.getObjectByName(String(name).replace(/\.\d{3}$/, '')) || null;
}
function instantiate(a, g, own) {
  const root = SkeletonUtils.clone(g.scene);
  const rim = a.cat === 'chars' || a.cat === 'enemies';
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const slot = (o.material && o.material.name) || 'M_Palette';
    o.material = makeMat(slot, rim);
    const f = o.material.userData.flags;
    o.castShadow = !(f.portal || f.fire || f.unlit);
    o.receiveShadow = true;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    if (own) o.geometry = o.geometry.clone();
    meshes.push(o);
  });
  const inst = { a, root, meshes, own, ownGeo: own, animations: g.animations || [], touched: new Set(), glowed: new Set(), stage: 0 };
  applyView(inst);
  return inst;
}
// the game's look: cats wear Hat_Miner on the Head_Hat bone (lamp lens on), upright in model space, tilted back 12 deg
const HAT_ID = 'Hat_Miner';
async function hatFor(a) {
  const h = a.fur && state.byId.get(HAT_ID);
  if (!h) return null;
  try { return await getGltf(h); } catch (e) { LP.errors.push('hat: ' + e.message); return null; }
}
function attachHat(inst, g) {
  const bone = g && nodeByName(inst.root, 'Head_Hat');
  if (!bone) return null;
  const hat = g.scene.clone(true);
  hat.name = '__hat';
  hat.traverse((o) => {
    if (!o.isMesh) return;
    o.material = makeMat((o.material && o.material.name) || 'M_Palette', true);
    o.castShadow = true; o.receiveShadow = true;
    o.geometry = o.geometry.clone();
    o.userData.hatMesh = true;
    inst.meshes.push(o);
  });
  const off = nodeByName(hat, 'Lens_Off');
  if (off) off.visible = false;
  inst.root.updateMatrixWorld(true);
  const bq = bone.getWorldQuaternion(new THREE.Quaternion()), rq = inst.root.getWorldQuaternion(new THREE.Quaternion());
  hat.quaternion.copy(bq.invert().multiply(rq)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -12 * DEG));
  const bs = bone.getWorldScale(new THREE.Vector3()), rs = inst.root.getWorldScale(new THREE.Vector3());
  hat.scale.set(rs.x / (bs.x || 1), rs.y / (bs.y || 1), rs.z / (bs.z || 1));
  bone.add(hat);
  inst.own = true;     // hat geometry is a private clone: dispose it with the instance
  inst.hat = hat;
  return hat;
}
function disposeInst(inst) {
  if (!inst) return;
  inst.root.removeFromParent();
  for (const m of inst.meshes) {
    m.material.dispose();
    if (inst.own && (m.userData.hatMesh || inst.ownGeo !== false)) m.geometry.dispose();
  }
  inst.root.traverse((o) => { if (o.userData.socketMarker) { o.geometry.dispose(); o.material.dispose(); } });
}

// base pose cache + absolute transforms
function base(inst, o) {
  if (!o.userData.b) o.userData.b = { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), v: o.visible };
  inst.touched.add(o);
  return o.userData.b;
}
function resetAll(inst) {
  for (const o of inst.touched) {
    const b = o.userData.b;
    o.position.copy(b.p); o.quaternion.copy(b.q); o.scale.copy(b.s); o.visible = b.v;
  }
  for (const m of inst.glowed) m.material.userData.u.uGlow.value = 1;
  if (inst.mixer) { inst.mixer.stopAllAction(); }
  inst.root.traverse((o) => { if (o.isBone && o.userData.b) { o.quaternion.copy(o.userData.b.q); o.position.copy(o.userData.b.p); } });
  applyStageVisibility(inst);
}
const _q = new THREE.Quaternion();
function rotAbout(inst, o, axis, ang, pivot) {
  const b = base(inst, o);
  _q.setFromAxisAngle(axis, ang);
  o.quaternion.copy(_q).multiply(b.q);
  o.position.copy(b.p).sub(pivot).applyQuaternion(_q).add(pivot);
}
function pivotOf(o) {
  o.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  o.traverse((m) => {
    if (!m.isMesh) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
  });
  const c = box.isEmpty() ? o.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
  return o.parent ? o.parent.worldToLocal(c) : c;
}
function setGlow(inst, o, v) {
  if (!o) return;
  o.traverse((m) => { if (m.isMesh) { m.material.userData.u.uGlow.value = v; inst.glowed.add(m); } });
}

// ---------- view modes ----------
function stageNames(a) {
  const p = a.props || {};
  return { stages: (p.stages || []).map((s) => s.mesh), flying: (p.flying || []).map((s) => s.mesh) };
}
function applyStageVisibility(inst) {
  if (inst.a.view !== 'stages') return;
  const { stages, flying } = stageNames(inst.a);
  stages.forEach((n, i) => { const o = nodeByName(inst.root, n); if (o) { base(inst, o); o.visible = i === inst.stage; } });
  flying.forEach((n) => { const o = nodeByName(inst.root, n); if (o) { base(inst, o); o.visible = false; } });
}
function topParts(inst) {
  const out = [];
  for (const c of inst.root.children) {
    let has = false;
    c.traverse((o) => { if (o.isMesh) has = true; });
    if (has) out.push(c);
  }
  if (out.length === 1 && !out[0].isMesh) { // single wrapper node: use its mesh children
    const inner = out[0].children.filter((c) => { let h = false; c.traverse((o) => { if (o.isMesh) h = true; }); return h; });
    if (inner.length > 1) return inner;
  }
  return out;
}
function applyView(inst) {
  const a = inst.a;
  if (a.view === 'stages') {
    // flying parts keep their socket origins: remember them hidden in the base pose
    const { stages, flying } = stageNames(a);
    for (const n of [...stages, ...flying]) { const o = nodeByName(inst.root, n); if (o) { o.userData.b = null; base(inst, o); } }
    applyStageVisibility(inst);
  } else if (a.view === 'row') {
    const parts = topParts(inst);
    inst.root.updateMatrixWorld(true);
    const boxes = parts.map((p) => new THREE.Box3().setFromObject(p));
    const sizes = boxes.map((b) => b.getSize(new THREE.Vector3()));
    const gap = 0.25 * Math.max(...sizes.map((s) => Math.max(s.x, s.z)), 0.1);
    const total = sizes.reduce((s, v) => s + v.x, 0) + gap * (parts.length - 1);
    let x = -total / 2;
    parts.forEach((p, i) => {
      const c = boxes[i].getCenter(new THREE.Vector3());
      const tgt = x + sizes[i].x / 2;
      const local = p.parent.worldToLocal(new THREE.Vector3(tgt, c.y, 0));
      const cur = p.parent.worldToLocal(c.clone());
      p.position.add(local.sub(cur));
      x += sizes[i].x + gap;
    });
    for (const p of parts) { p.userData.b = null; base(inst, p); }
  }
}
function visibleBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(), tmp = new THREE.Box3();
  root.traverseVisible((o) => {
    if (!o.isMesh || o.userData.socketMarker) return;
    if (o.isSkinnedMesh) {
      o.skeleton.update();
      o.computeBoundingBox();
      tmp.copy(o.boundingBox).applyMatrix4(o.matrixWorld);
    } else {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    }
    box.union(tmp);
  });
  if (box.isEmpty()) box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
  return box;
}

// ---------- fur presets (whole-cell UV shift, like the game's furset offsets) ----------
function furCounts(inst) {
  const sets = state.man.fur_presets || [];
  const cnt = Object.fromEntries(sets.map((s) => [s.id, 0]));
  for (const m of inst.meshes) {
    const uv = m.geometry.attributes.uv;
    if (!uv) continue;
    const src = m.geometry.userData.uv0 || uv.array;
    for (let i = 0; i < uv.count; i++) {
      const id = cellOf(src[i * 2], src[i * 2 + 1]);
      for (const s of sets) if (id >= s.base && id <= s.base + 4) cnt[s.id]++;
    }
  }
  return cnt;
}
function cellOf(u, v) {
  const col = Math.min(15, Math.max(0, Math.floor(u * 16)));
  const rowTop = Math.min(15, Math.max(0, Math.floor(v * 16)));
  return (15 - rowTop) * 16 + col;
}
function applyFur(inst, presetId) {
  const sets = state.man.fur_presets || [];
  const to = sets.find((s) => s.id === presetId);
  if (!to) return;
  for (const m of inst.meshes) {
    const uv = m.geometry.attributes.uv;
    if (!uv) continue;
    if (!m.geometry.userData.uv0) m.geometry.userData.uv0 = uv.array.slice();
    const src = m.geometry.userData.uv0, dst = uv.array;
    for (let i = 0; i < uv.count; i++) {
      const u = src[i * 2], v = src[i * 2 + 1];
      const id = cellOf(u, v);
      let nu = u, nv = v;
      for (const s of sets) {
        if (id >= s.base && id <= s.base + 4) {
          const nid = to.base + (id - s.base);
          const pr = Math.floor(id / 16), npr = Math.floor(nid / 16);
          nu = u + ((nid % 16) - (id % 16)) / 16;
          nv = v + (pr - npr) / 16;
          break;
        }
      }
      dst[i * 2] = nu; dst[i * 2 + 1] = nv;
    }
    uv.needsUpdate = true;
  }
  inst.fur = presetId;
}

// ---------- animations (real GLB clips + procedural ones from props.json roles) ----------
function buildClips(inst) {
  const a = inst.a, R = inst.root, p = a.props || {}, r = p.roles || {};
  const N = (n) => nodeByName(R, n);
  const list = [];
  const add = (key, fn, note) => list.push({ key, label: clipLabel(key), fn, note: note || 'процедурно, по описанию клипа из props.json' });
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

  // real FBX clips in the art lane's order (manifest clips), loop flags from <Rig>.clips.json
  const mc = new Map((a.clips || []).map((c, i) => [c.name, Object.assign({ i }, c)]));
  const real = inst.animations.slice().sort((x, y) => ((mc.get(x.name) || { i: 99 }).i - (mc.get(y.name) || { i: 99 }).i));
  for (const c of real) {
    const m = mc.get(c.name) || {};
    const once = m.loop === false;
    list.push({ key: c.name, label: clipLabel(c.name), clip: c, once,
      note: 'клип из FBX (скелетная анимация' + (once ? ', разовый: повтор с паузой' : ', цикл') + ')' });
  }

  if (/^Portal_/.test(a.id) && r.spin) {
    const sw = N(r.spin[0]);
    const swPiv = sw && pivotOf(sw);
    const edge = N(r.spin[0] + 'Edge');
    const sense = /counter/i.test(r.spin_sense || '') ? 1 : -1;
    const pad = N(r.pad);
    const ov = (r.overlay || []).map(N).filter(Boolean);
    const spin = (t, k = 1) => { if (sw) rotAbout(inst, sw, Z, sense * 30 * DEG * k * t, swPiv); };
    add('Idle', (t) => spin(t));
    add('Approach', (t) => { spin(t, 1.5); if (pad) { const b = base(inst, pad); pad.scale.copy(b.s).multiplyScalar(1.06); } });
    if (ov.length && /Grate/.test(ov[0].name)) {
      const order = (r.overlay_stagger || r.overlay).map((n) => (N(n) || {}).name);
      add('Unlock', (t) => {
        spin(t);
        const T = t % 2.8;
        for (const o of ov) {
          const b = base(inst, o);
          const k = Math.max(0, order.indexOf(o.name));
          const x = clamp01((T - 0.4 - k * 2 / 30) / 0.6);
          o.position.copy(b.p); o.position.y -= 2 * Math.max(0, inBack(x));
          o.visible = x < 1;
        }
        if (edge) setGlow(inst, edge, 0.35 + 0.65 * clamp01((T - 0.4) / 1.0));
      });
    } else if (ov.length) {
      add('Unboard', (t) => {
        spin(t);
        const T = t % 2.4;
        ov.forEach((o, i) => {
          const b = base(inst, o);
          const x = clamp01((T - 0.5 - i * 0.07) / 0.6);
          const side = i % 2 ? 1 : -1;
          o.position.copy(b.p);
          o.position.x += side * 1.2 * x;
          o.position.y += 1.0 * x - 1.6 * x * x;
          o.quaternion.copy(b.q).premultiply(_q.setFromAxisAngle(Z, side * x * 2.5));
          o.scale.copy(b.s).multiplyScalar(1 - Math.max(0, (x - 0.66) / 0.34));
          o.visible = x < 1;
        });
      });
    }
  }

  if (r.wheels) {
    const ws = r.wheels.map(N).filter(Boolean);
    const piv = ws.map(pivotOf);
    const body = N(r.body);
    const bodyPiv = body && pivotOf(body);
    const bodyBottom = body && (() => { const bb = new THREE.Box3().setFromObject(body); return body.parent.worldToLocal(new THREE.Vector3(bb.max.x, bb.min.y, (bb.min.z + bb.max.z) / 2)); })();
    const pile = N('Pile');
    const bodyAll = [body, pile].filter(Boolean);
    const spinWheels = (ang) => ws.forEach((w, i) => { const ax = X.clone().applyQuaternion(base(inst, w).q); rotAbout(inst, w, ax, ang, piv[i]); });
    add('Roll', (t) => {
      spinWheels((1.2 * t) / (r.wheel_radius || 0.25));
      for (const o of bodyAll) { const b = base(inst, o); o.position.copy(b.p); o.position.y += 0.015 * Math.abs(Math.sin(t * Math.PI * 4)); }
    });
    add('Full', (t) => { for (const o of bodyAll) rotAbout(inst, o, Z, 1 * DEG * Math.sin(t * Math.PI * 6), bodyPiv); });
    add('LoadPop', (t) => {
      const x = (t % 1.2) / 0.3;
      const s = x >= 1 ? 1 : x < 0.4 ? 1 - 0.05 * (x / 0.4) : x < 0.7 ? 0.95 + 0.08 * ((x - 0.4) / 0.3) : 1.03 - 0.03 * ((x - 0.7) / 0.3);
      for (const o of bodyAll) { const b = base(inst, o); o.scale.set(b.s.x * (2 - s) ** 0.5, b.s.y * s, b.s.z * (2 - s) ** 0.5); }
    });
    if (bodyBottom) add('Spill', (t) => {
      const x = (t % 2.0) / 0.8;
      const ang = x >= 1 ? 0 : -25 * DEG * Math.sin(Math.PI * x);
      for (const o of bodyAll) rotAbout(inst, o, Z, ang, bodyBottom);
    });
  }

  if (a.id === 'Bld_Generator') {
    const core = N('Bld_Generator_Core'), cap = N((r.spin || [])[0]);
    const capPiv = cap && pivotOf(cap);
    const tanks = (r.squash || []).map(N).filter(Boolean);
    add('Idle', (t) => setGlow(inst, core, 0.5 + 0.05 * Math.sin(t * Math.PI * 2)));
    add('Work', (t) => {
      if (cap) rotAbout(inst, cap, Y, 60 * DEG * t, capPiv);
      setGlow(inst, core, 0.85 + 0.15 * Math.sin(t * Math.PI * 6));
      tanks.forEach((o, i) => { const b = base(inst, o); const k = 0.02 * Math.sin(t * Math.PI * 2 + i * Math.PI); o.scale.set(b.s.x * (1 - k / 2), b.s.y * (1 + k), b.s.z * (1 - k / 2)); });
    });
    add('NoPower', (t) => { const n = Math.sin(Math.floor(t * 9) * 12.9898) * 43758.5453; setGlow(inst, core, 0.1 + 0.2 * (n - Math.floor(n))); });
  }

  if (a.id === 'Bld_Reworker') {
    const glow = N('Bld_Reworker_Glow'), nut = N((r.spin || [])[0]);
    const nutPiv = nut && pivotOf(nut);
    const gems = (r.gems || []).map(N).filter(Boolean);
    const belt = (r.belt || []).map(N).filter(Boolean);
    const beltStep = belt.length > 1 ? base(inst, belt[1]).p.clone().sub(base(inst, belt[0]).p) : null;
    const body = inst.root;
    const bodyB = () => base(inst, body);
    add('Idle', (t) => { setGlow(inst, glow, 0.25); const b = bodyB(); body.scale.copy(b.s).multiplyScalar(1 + 0.008 * Math.sin(t * Math.PI * 2 / 3)); });
    add('Work', (t) => {
      if (nut) rotAbout(inst, nut, Z, 60 * DEG * t, nutPiv);
      if (beltStep) belt.forEach((o, i) => {
        const ph = (i + (t % 1)) % belt.length; // cubes advance one slot per loop, the last wraps to the first
        const b0 = base(inst, belt[0]), b = base(inst, o);
        o.position.copy(b0.p).addScaledVector(beltStep, ph);
        const edge = Math.min(ph / 0.25, (belt.length - ph) / 0.25, 1);
        o.scale.copy(b.s).multiplyScalar(Math.max(0.01, edge));
      });
      const b = bodyB(); body.scale.set(b.s.x, b.s.y * (1 + 0.012 * Math.sin(t * Math.PI * 4)), b.s.z);
      setGlow(inst, glow, 0.8 + 0.2 * Math.sin(t * Math.PI * 6));
    });
    add('Ready', (t) => {
      const b = bodyB(); body.quaternion.copy(b.q).premultiply(_q.setFromAxisAngle(Z, 2.5 * DEG * Math.sin(t * Math.PI * 3)));
      setGlow(inst, glow, 0.15);
      gems.forEach((g, i) => { const gb = base(inst, g); g.position.copy(gb.p); g.position.y += 0.05 * Math.sin(t * Math.PI * 2 + i); });
    });
  }

  if (a.id === 'Bld_BlackMarket') {
    const cloth = N('Bld_BlackMarket_Cloth'), coin = N('Bld_BlackMarket_Coin');
    const hinge = cloth && (() => { const bb = new THREE.Box3().setFromObject(cloth); const c = bb.getCenter(new THREE.Vector3()); c.y = bb.max.y; return cloth.parent.worldToLocal(c); })();
    add('Idle', (t) => { if (cloth) rotAbout(inst, cloth, X, 3 * DEG * Math.sin(t * Math.PI), hinge); });
    add('Near', (t) => {
      if (cloth) rotAbout(inst, cloth, X, 3 * DEG * Math.sin(t * Math.PI), hinge);
      const g = (t % 1.2) / 0.3;
      setGlow(inst, coin, 8 / 3 + (g < 1 ? 1.2 * (1 - g) : 0));
    });
  }

  if (r.sway) {
    add('Lantern_Sway', (t) => {
      const b = base(inst, R);
      const w = (t * Math.PI * 2) / 2.4;
      R.quaternion.copy(b.q).premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(3 * DEG * Math.sin(w), 0, 2 * DEG * Math.sin(w - Math.PI / 2))));
    });
  }

  if (r.yaw) {
    const arrow = N(r.yaw[0]);
    if (arrow) add('Yaw', (t) => rotAbout(inst, arrow, Y, 40 * DEG * Math.sin(t * 1.2), new THREE.Vector3(0, 0, 0)),
      'процедурно: стрелка поворачивается к следующему тайлу дороги');
  }

  if (a.id === 'Thread_Pulse') {
    add('Pulse', (t) => setGlow(inst, R, 0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI * 1.5))));
  }

  if (a.anim === 'coin') {
    add('Spin', (t) => {
      const b = base(inst, R);
      R.quaternion.copy(b.q).premultiply(_q.setFromAxisAngle(Y, t * 120 * DEG));
      R.position.copy(b.p); R.position.y += 0.04 + 0.04 * Math.sin(t * Math.PI * 1.6);
    });
  }

  if (a.view === 'stages') {
    const { stages, flying } = stageNames(a);
    const fly = flying.map(N);
    const center = (() => { const o = N(stages[0]); return o ? pivotOf(o) : new THREE.Vector3(); })();
    add('Break', (t) => {
      const T = t % 4.0, s = Math.min(3, Math.floor(T / 0.95));
      inst.stage = s;
      applyStageVisibility(inst);
      (p.flying || []).forEach((f, i) => {
        const o = fly[i];
        if (!o) return;
        const b = base(inst, o);
        const x = (T - f.stage * 0.95) / 0.7;
        if (f.stage > s || x < 0 || x > 1) { o.visible = false; return; }
        const dir = b.p.clone().sub(center); dir.y = 0;
        if (dir.lengthSq() < 1e-6) dir.set(0.3, 0, 0.2);
        dir.normalize();
        o.visible = true;
        o.position.copy(b.p).addScaledVector(dir, 0.9 * x);
        o.position.y += 1.1 * x - 1.6 * x * x;
        o.quaternion.copy(b.q).premultiply(_q.setFromAxisAngle(new THREE.Vector3(dir.z, 0, -dir.x), x * 4));
        o.scale.copy(b.s).multiplyScalar(1 - Math.max(0, (x - 0.7) / 0.3));
      });
    }, 'процедурно: стадии трещин и вылет осколков, как в props.json');
  }

  if (!inst.animations.length && a.bones > 0) {
    const bones = [];
    R.traverse((o) => { if (o.isBone) bones.push(o); });
    const pick = (re) => bones.filter((b) => re.test(b.name));
    const spine = pick(/spine|chest/i), head = pick(/^head$/i), tail = pick(/tail/i), ears = pick(/^ear/i), hips = pick(/^hips$/i), arms = pick(/upperarm/i);
    for (const b of bones) { b.userData.b = { p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone(), v: true }; }
    const rot = (b, x, y, z) => b.quaternion.copy(b.userData.b.q).multiply(_q.setFromEuler(new THREE.Euler(x, y, z)));
    add('Sway', (t) => {
      const w = t * Math.PI * 2;
      spine.forEach((b, i) => rot(b, 1.5 * DEG * Math.sin(w * 0.5 + i * 0.4), 0, 2.5 * DEG * Math.sin(w * 0.4 + i * 0.5)));
      head.forEach((b) => rot(b, 3 * DEG * Math.sin(w * 0.33), 7 * DEG * Math.sin(w * 0.22), 2 * DEG * Math.sin(w * 0.5)));
      tail.forEach((b, i) => rot(b, 0, 0, (6 + 4 * i) * DEG * Math.sin(w * 0.6 - i * 0.7)));
      ears.forEach((b, i) => rot(b, (Math.sin(w * 0.9 + i * 2) > 0.97 ? 10 : 0) * DEG, 0, 0));
      arms.forEach((b, i) => rot(b, 2 * DEG * Math.sin(w * 0.5 + i * Math.PI), 0, 0));
      hips.forEach((b) => { b.position.copy(b.userData.b.p); });
    }, 'процедурное покачивание костей: клипы для этой модели ещё не готовы');
  }

  list.push({ key: 'none', label: CLIP_RU.none, fn: null, note: '' });
  return list;
}
function defaultClip(inst, clips) {
  if (inst.a.view === 'stages') return clips.find((c) => c.key === 'none');
  return clips.find((c) => /(^|@)Idle$/.test(c.key)) || clips[0];
}

// ---------- stage (scene, lights, ground) ----------
function makeStage(shadowSize) {
  const scene = new THREE.Scene();
  const amb = new THREE.AmbientLight(0x8c8f99, Math.PI);
  const key = new THREE.DirectionalLight(0xffe9c7, 0.85 * Math.PI);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  if ('intensity' in key.shadow) key.shadow.intensity = 0.6;
  const fill = new THREE.DirectionalLight(0xfff1de, 0.35 * Math.PI);
  const groundMat = new THREE.MeshLambertMaterial({ color: STYLE.sand.ground });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(amb, key, key.target, fill, fill.target, ground);
  scene.background = new THREE.Color(STYLE.sand.bg);
  scene.fog = new THREE.Fog(STYLE.sand.bg, 10, 40);
  const st = { scene, amb, key, fill, ground, groundMat, dark: false, r: 1 };
  st.setStyle = (dark) => {
    st.dark = dark;
    const s = dark ? STYLE.dark : STYLE.sand;
    scene.background.setHex(s.bg);
    scene.fog.color.setHex(s.bg);
    groundMat.color.setHex(s.ground);
  };
  return st;
}
// viewer framing (fix r1 W15): the 8 bbox corners, seen from the default orbit elevation at FIT_AZ azimuths, must stay inside
// |ndc x| <= lim.x and |ndc y| <= lim.y; the smallest such distance is found by bisection (the old bounding-sphere fit used the
// vertical fov only, so in the portrait phone stage wide or long models, e.g. the 0.08 x 0.22 m peg, ran off the sides).
const FIT_AZ = 24;
const orbitDir = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
function boxCorners(box) {
  const out = [];
  for (let i = 0; i < 8; i++) out.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  return out;
}
// worst |ndc| / lim over the corners for a camera at distance d from c along the orbit (az, el); Infinity = a corner behind the eye
const _cam = new THREE.PerspectiveCamera();
const _v = new THREE.Vector3();
function fitWorst(camera, corners, c, d, el, lim, azs) {
  _cam.fov = camera.fov; _cam.aspect = camera.aspect; _cam.near = 1e-4; _cam.far = 1e4;
  const tv = Math.tan((camera.fov * DEG) / 2), th = tv * camera.aspect;
  let w = 0;
  for (const az of azs) {
    _cam.position.copy(c).addScaledVector(orbitDir(az, el), d);
    _cam.lookAt(c);
    _cam.updateMatrixWorld(true);
    const inv = _cam.matrixWorldInverse;
    for (const p of corners) {
      _v.copy(p).applyMatrix4(inv);
      const z = -_v.z;
      if (z <= 1e-6) return Infinity;
      w = Math.max(w, Math.abs(_v.x / (z * th)) / lim.x, Math.abs(_v.y / (z * tv)) / lim.y);
    }
  }
  return w;
}
function fitDistance(camera, box, c, r, lim) {
  const corners = boxCorners(box);
  const azs = Array.from({ length: FIT_AZ }, (_, k) => CAM_AZ + (k * 2 * Math.PI) / FIT_AZ);
  const half = Math.min((camera.fov * DEG) / 2, Math.atan(Math.tan((camera.fov * DEG) / 2) * camera.aspect));
  let lo = r * 0.2, hi = (r / Math.sin(half * Math.min(lim.x, lim.y))) * 1.5;
  for (let k = 0; k < 8 && fitWorst(camera, corners, c, hi, CAM_EL, lim, azs) > 1; k++) hi *= 1.6;
  for (let k = 0; k < 28; k++) {
    const m = 0.5 * (lo + hi);
    if (fitWorst(camera, corners, c, m, CAM_EL, lim, azs) > 1) lo = m; else hi = m;
  }
  return hi;
}
// usable share of the stage half-width / half-height: 56 css px side lanes for the prev / next buttons, 7 % top / bottom
function fitLimits(w, h) {
  const lx = w > 0 ? (w / 2 - 56) / (w / 2) : 0.86;
  return { x: Math.min(0.88, Math.max(0.5, lx)), y: 0.86 };
}
function fitStage(st, camera, box, controls, tight, lim) {
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(sphere.radius, 0.05);
  const c = sphere.center;
  const d = lim ? fitDistance(camera, box, c, r, lim) : (r / Math.sin((camera.fov * DEG) / 2)) * (tight ? 0.98 : 1.12);
  const dir = orbitDir(CAM_AZ, CAM_EL);
  camera.position.copy(c).addScaledVector(dir, d);
  camera.near = d / 50; camera.far = d * 30;
  camera.updateProjectionMatrix();
  camera.lookAt(c);
  if (controls) {
    controls.target.copy(c);
    controls.minDistance = Math.min(r * 0.7, d * 0.5); controls.maxDistance = d * 4;
    controls.update();
  }
  st.r = r;
  st.key.position.copy(c).addScaledVector(KEY_DIR, r * 6);
  st.key.target.position.copy(c);
  const sc = st.key.shadow.camera;
  sc.left = -r * 1.6; sc.right = r * 1.6; sc.top = r * 1.6; sc.bottom = -r * 1.6;
  sc.near = r * 0.5; sc.far = r * 12;
  sc.updateProjectionMatrix();
  st.key.shadow.normalBias = 0.01 * r;
  const gy = Math.min(0, box.min.y) - 0.002 * r;
  st.ground.position.set(c.x, gy, c.z);
  st.ground.scale.setScalar(Math.max(r * 60, d * 10));
  st.scene.fog.near = d * 1.4;
  st.scene.fog.far = d * 5;
}
function placeFill(st, camera, target) {
  const back = camera.position.clone().sub(target).normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const dir = back.multiplyScalar(Math.cos(35 * DEG)).addScaledVector(up, Math.sin(35 * DEG)).normalize();
  st.fill.position.copy(target).addScaledVector(dir, st.r * 6);
  st.fill.target.position.copy(target);
}

// ---------- thumbnails ----------
const TH = {};
function initThumbs() {
  TH.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  TH.renderer.setPixelRatio(1);
  TH.renderer.setSize(300, 300, false);
  TH.renderer.outputColorSpace = THREE.SRGBColorSpace;
  TH.renderer.toneMapping = THREE.NoToneMapping;
  TH.renderer.shadowMap.enabled = true;
  TH.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  TH.stage = makeStage(1024);
  TH.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
}
async function renderThumb(a) {
  const g = await getGltf(a);
  const hg = await hatFor(a);
  const inst = instantiate(a, g, false);
  attachHat(inst, hg);
  const clips = buildClips(inst);
  const dc = defaultClip(inst, clips);
  timeU.value = 0.6;
  if (dc && dc.fn) dc.fn(0.6);
  TH.stage.scene.add(inst.root);
  const box = visibleBox(inst.root);
  fitStage(TH.stage, TH.camera, box, null, true);
  placeFill(TH.stage, TH.camera, box.getCenter(new THREE.Vector3()));
  TH.renderer.render(TH.stage.scene, TH.camera);
  const url = await new Promise((res) => TH.renderer.domElement.toBlob((b) => res(b ? URL.createObjectURL(b) : null), 'image/webp', 0.88));
  disposeInst(inst);
  return url;
}
async function renderAllThumbs() {
  const todo = state.assets.slice();
  LP.thumbsTotal = todo.length;
  // prefetch GLBs a few at a time, render in order
  let next = 0;
  const pre = () => { while (next < todo.length && next < LP.thumbs + 8) getGltf(todo[next++]).catch(() => {}); };
  for (const a of todo) {
    pre();
    try {
      const url = await renderThumb(a);
      a._thumb = url;
      document.querySelectorAll(`img.th[data-id="${a.id}"]`).forEach((im) => { im.src = url; im.classList.remove('wait'); });
    } catch (e) {
      LP.errors.push('thumb ' + a.id + ': ' + e.message);
      document.querySelectorAll(`img.th[data-id="${a.id}"]`).forEach((im) => { im.classList.remove('wait'); im.alt = 'нет превью'; });
    }
    LP.thumbs++;
    await new Promise((r) => setTimeout(r, 0));
  }
}

// ---------- grid ----------
function catName(id) {
  const c = (state.man.categories || []).find((x) => x[0] === id);
  return c ? c[1] : id;
}
function tabsFade() {
  const nav = $('#tabs');
  const max = nav.scrollWidth - nav.clientWidth;
  const more = nav.scrollLeft < max - 2;
  nav.classList.toggle('fl', nav.scrollLeft > 2);
  nav.classList.toggle('fr', more);
  $('#tabsmore').hidden = !more;
}
function initTabs() {
  const nav = $('#tabs');
  nav.addEventListener('scroll', tabsFade, { passive: true });
  window.addEventListener('resize', tabsFade);
  $('#tabsmore').addEventListener('click', () => nav.scrollBy({ left: Math.max(120, nav.clientWidth * 0.7), behavior: 'smooth' }));
}
function buildTabs() {
  const nav = $('#tabs');
  const keep = nav.scrollLeft;
  nav.textContent = '';
  const cats = [['all', 'Все'], ...state.man.categories];
  for (const [id, name] of cats) {
    const n = id === 'all' ? state.assets.length : state.assets.filter((a) => a.cat === id).length;
    if (id !== 'all' && n === 0 && !(state.man.pending || []).some((p) => p.cat === id)) continue;
    const b = el('button', 'tab' + (state.tab === id ? ' on' : ''));
    b.dataset.tab = id;
    b.append(document.createTextNode(name), el('span', 'n', String(n)));
    b.addEventListener('click', () => { state.tab = id; buildTabs(); buildGrid(); });
    nav.append(b);
  }
  nav.scrollLeft = keep;
  tabsFade();
}
function card(a) {
  const c = el('button', 'card');
  c.dataset.id = a.id;
  c.title = a.name + ' — ' + a.id;
  const img = el('img', 'th' + (a._thumb ? '' : ' wait'));
  img.dataset.id = a.id;
  img.alt = a.name;
  img.width = 300; img.height = 300;
  if (a._thumb) img.src = a._thumb;
  const tags = el('div', 'tags');
  if (a.pilot_tag) tags.append(el('span', 'tag pilot', 'пилот'));
  if ((a.clips || []).length) tags.append(el('span', 'tag anim', 'анимации'));
  const meta = el('div', 'meta');
  meta.append(el('div', 'nm', a.name));
  const sub = el('div', 'sub');
  sub.append(el('span', null, fmtInt(a.tris) + ' ' + plural(a.tris, 'треугольник', 'треугольника', 'треугольников')));
  if (a.bones) sub.append(el('span', null, a.bones + ' ' + plural(a.bones, 'кость', 'кости', 'костей')));
  meta.append(sub);
  c.append(img, tags, meta);
  c.addEventListener('click', () => openViewer(a.id));
  return c;
}
function pendingCard(p) {
  const c = el('div', 'card pending');
  c.title = p.name + ' — модель в работе';
  let img;
  if (p.concept) {
    img = el('img', 'th');
    img.alt = p.name; img.width = 300; img.height = 300;
    img.src = 'concepts/' + p.concept + '.webp';
  } else {
    img = el('div', 'th empty', '?');
  }
  const tags = el('div', 'tags');
  tags.append(el('span', 'tag wip', 'в работе'));
  const meta = el('div', 'meta');
  meta.append(el('div', 'nm', p.name), el('div', 'sub', p.concept ? 'пока только концепт' : 'модель ещё не готова'));
  c.append(img, tags, meta);
  return c;
}
function buildGrid() {
  const g = $('#grid');
  g.textContent = '';
  const cats = state.tab === 'all' ? state.man.categories.map((c) => c[0]) : [state.tab];
  state.shown = [];
  for (const cid of cats) {
    const items = state.assets.filter((a) => a.cat === cid);
    const pend = (state.man.pending || []).filter((p) => p.cat === cid);
    if (!items.length && !pend.length) continue;
    if (state.tab === 'all') g.append(el('h2', 'sec-title', catName(cid)));
    for (const a of items) { g.append(card(a)); state.shown.push(a.id); }
    for (const p of pend) g.append(pendingCard(p));
  }
}

// ---------- viewer ----------
const V = { open: false, inst: null, clips: [], clip: null, clipT0: 0, t: 0, opts: { rotate: true, hat: true, concept: false, dark: false, wire: false, sockets: false }, token: 0 };
function initViewer() {
  const canvas = $('#vcanvas');
  V.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  V.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  V.renderer.outputColorSpace = THREE.SRGBColorSpace;
  V.renderer.toneMapping = THREE.NoToneMapping;
  V.renderer.shadowMap.enabled = true;
  V.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  V.stage = makeStage(2048);
  V.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
  V.controls = new OrbitControls(V.camera, canvas);
  V.controls.enableDamping = true;
  V.controls.dampingFactor = 0.08;
  V.controls.autoRotate = true;
  V.controls.autoRotateSpeed = 1.6;
  V.controls.maxPolarAngle = 89 * DEG;
  V.clock = new THREE.Clock();
  const ro = new ResizeObserver(resizeViewer);
  ro.observe($('#vstage'));
  $('#vclose').addEventListener('click', closeViewer);
  $('#vprev').addEventListener('click', () => step(-1));
  $('#vnext').addEventListener('click', () => step(1));
  $('#vconcept').addEventListener('click', () => $('#vconcept').classList.toggle('big'));
  document.querySelectorAll('.toggles .chip').forEach((b) => b.addEventListener('click', () => toggleOpt(b.dataset.opt)));
  window.addEventListener('keydown', (e) => {
    if (!V.open) return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });
}
function resizeViewer() {
  const box = $('#vstage').getBoundingClientRect();
  if (!box.width || !box.height) return;
  V.renderer.setSize(box.width, box.height, false);
  const was = V.camera.aspect;
  V.camera.aspect = box.width / box.height;
  V.camera.updateProjectionMatrix();
  // the framing depends on the stage shape (fix r1 W15): refit after a real change (rotation, window resize)
  if (V.inst && V.framedAspect && Math.abs(V.camera.aspect / V.framedAspect - 1) > 0.02) frameViewer();
}
function step(d) {
  const ids = state.shown.length ? state.shown : state.assets.map((a) => a.id);
  const i = ids.indexOf(V.id);
  const n = ids[(i + d + ids.length) % ids.length];
  if (n) openViewer(n);
}
function syncToggles() {
  document.querySelectorAll('.toggles .chip').forEach((b) => {
    const k = b.dataset.opt;
    if (k in V.opts) b.classList.toggle('on', !!V.opts[k]);
  });
  const a = state.byId.get(V.id);
  const cb = document.querySelector('.toggles .chip[data-opt="concept"]');
  if (cb) cb.hidden = !(a && a.concept);
  const hb = document.querySelector('.toggles .chip[data-opt="hat"]');
  if (hb) hb.hidden = !(V.inst && V.inst.hat);
}
function toggleOpt(k, val) {
  if (k === 'reset') { if (V.inst) frameViewer(); return; }
  V.opts[k] = val == null ? !V.opts[k] : !!val;
  applyOpts();
  syncToggles();
}
function applyOpts() {
  V.controls.autoRotate = V.opts.rotate;
  V.stage.setStyle(V.opts.dark);
  $('#viewer').classList.toggle('dark', V.opts.dark);
  const a = state.byId.get(V.id);
  const fig = $('#vconcept');
  fig.hidden = !(V.opts.concept && a && a.concept);
  if (!fig.hidden) { const im = fig.querySelector('img'); const src = 'concepts/' + a.concept + '.webp'; if (!im.src.endsWith(src)) im.src = src; }
  if (V.inst) {
    for (const m of V.inst.meshes) m.material.wireframe = V.opts.wire;
    V.inst.root.traverse((o) => { if (o.userData.socketMarker) o.visible = V.opts.sockets; });
    if (V.inst.hat) V.inst.hat.visible = V.opts.hat;
  }
}
function addSocketMarkers(inst, r) {
  const geo = new THREE.OctahedronGeometry(Math.max(0.02, r * 0.03));
  for (const n of inst.a.sockets || []) {
    const o = nodeByName(inst.root, n);
    if (!o || o.isMesh) continue;
    const m = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ color: 0x29e0ff, depthTest: false, transparent: true, opacity: 0.9 }));
    m.userData.socketMarker = true;
    m.renderOrder = 999;
    m.visible = V.opts.sockets;
    const ws = o.getWorldScale(new THREE.Vector3());
    m.scale.set(1 / (ws.x || 1), 1 / (ws.y || 1), 1 / (ws.z || 1));
    o.add(m);
  }
  geo.dispose();
}
function frameViewer() {
  const box = visibleBox(V.inst.root);
  const sb = $('#vstage').getBoundingClientRect();
  fitStage(V.stage, V.camera, box, V.controls, false, fitLimits(sb.width, sb.height));
  V.framedAspect = V.camera.aspect;
  V.framedBox = box;
}
async function openViewer(id) {
  const a = state.byId.get(id);
  if (!a) return;
  const token = ++V.token;
  V.id = id;
  LP.opened = null;
  const wasOpen = V.open;
  V.open = true;
  $('#viewer').hidden = false;
  document.body.style.overflow = 'hidden';
  if (location.hash !== '#m=' + id) history.replaceState(null, '', '#m=' + id);
  resizeViewer();
  fillPanel(a, null);
  $('#vloading').hidden = false;
  $('#vloading').textContent = 'Загрузка…';
  if (!wasOpen) { V.clock.getDelta(); requestAnimationFrame(loop); }
  let g;
  try { g = await getGltf(a); } catch (e) {
    if (token === V.token) $('#vloading').textContent = 'Не удалось загрузить модель';
    LP.errors.push('open ' + id + ': ' + e.message);
    return;
  }
  const hg = await hatFor(a);
  if (token !== V.token) return;
  disposeInst(V.inst);
  if (V.inst && V.inst.mixer) V.inst.mixer.stopAllAction();
  const inst = instantiate(a, g, !!a.fur);
  attachHat(inst, hg);
  V.inst = inst;
  V.stage.scene.add(inst.root);
  if (inst.animations.length) inst.mixer = new THREE.AnimationMixer(inst.root);
  V.clips = buildClips(inst);
  if (a.fur) {
    const cnt = furCounts(inst);
    inst.fur = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0][0];
  }
  frameViewer();
  addSocketMarkers(inst, V.stage.r);
  setClip(defaultClip(inst, V.clips).key);
  fillPanel(a, inst);
  applyOpts();
  syncToggles();
  $('#vloading').hidden = true;
  LP.opened = id;
}
function closeViewer() {
  V.open = false;
  V.token++;
  $('#viewer').hidden = true;
  document.body.style.overflow = '';
  if (V.inst) { if (V.inst.mixer) V.inst.mixer.stopAllAction(); disposeInst(V.inst); V.inst = null; }
  history.replaceState(null, '', location.pathname + location.search);
  LP.opened = null;
  const c = document.querySelector(`.card[data-id="${V.id}"]`);
  if (c) c.focus({ preventScroll: false });
}
function setClip(key) {
  const inst = V.inst;
  if (!inst) return;
  const c = V.clips.find((x) => x.key === key) || V.clips[V.clips.length - 1];
  resetAll(inst);
  V.clip = c;
  V.clipT0 = V.t;
  V.holdUntil = 0;
  if (c.clip && inst.mixer) {
    const act = inst.mixer.clipAction(c.clip);
    if (c.once) { act.reset().setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.play(); }
    else act.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    V.act = act;
  } else V.act = null;
  document.querySelectorAll('#vclips .chip').forEach((b) => b.classList.toggle('on', b.dataset.key === c.key));
  $('#vnote').textContent = c.note ? 'Анимация «' + c.label + '»: ' + c.note + '.' : '';
}
function setStage(s) {
  const inst = V.inst;
  if (!inst) return;
  if (V.clip && V.clip.key === 'Break') setClip('none');
  inst.stage = s;
  applyStageVisibility(inst);
  document.querySelectorAll('#vstages .chip').forEach((b) => b.classList.toggle('on', +b.dataset.s === s));
  fillParts(inst.a, inst);
}
function setFur(id) {
  if (!V.inst) return;
  applyFur(V.inst, id);
  document.querySelectorAll('#vfur .chip').forEach((b) => b.classList.toggle('on', b.dataset.fur === id));
}
function fillParts(a, inst) {
  const ul = $('#vparts .parts');
  ul.textContent = '';
  for (const p of a.parts || []) {
    const li = el('li');
    let hid = false;
    if (inst) { const o = nodeByName(inst.root, p.name); hid = !!(o && !o.visible); }
    if (hid) li.className = 'hid';
    li.append(el('span', null, p.name + (hid ? ' (скрыта)' : '')), el('span', null, fmtInt(p.tris) + ' △'));
    ul.append(li);
  }
  $('#vparts').hidden = !(a.parts || []).length;
}
function fillPanel(a, inst) {
  $('#vname').textContent = a.name;
  const bd = $('#vbadges');
  bd.textContent = '';
  bd.append(el('span', 'tag', catName(a.cat)));
  if (a.pilot_tag) { const t = el('span', 'tag pilot', 'пилот'); t.title = 'черновая модель: финальная ещё в работе'; bd.append(t); }
  bd.append(el('span', 'tag id', a.id));
  const dl = $('#vstats');
  dl.textContent = '';
  const lo = a.bbox[0], hi = a.bbox[1];
  const dims = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]].map((v) => v.toFixed(2).replace('.', ',')).join(' × ') + ' м';
  const rows = [
    ['Треугольники', fmtInt(a.tris)],
    ['Частей', String((a.parts || []).length)],
  ];
  if (a.bones) rows.push(['Кости', String(a.bones)]);
  rows.push(['Клипы из FBX', String((a.clips || []).length)]);
  rows.push(['Габариты (Ш×Г×В)', dims]);
  rows.push(['Файл GLB', fmtKB(a.bytes)]);
  rows.push(['Источник', a.pilot_copy ? 'пилотный FBX (копия уже в Unity)' : a.src === 'pilot' ? 'пилотный FBX' : 'финальный FBX (Unity)']);
  for (const [k, v] of rows) dl.append(el('dt', null, k), el('dd', null, v));

  const cw = $('#vclips .chips');
  cw.textContent = '';
  if (inst) {
    for (const c of V.clips) {
      const b = el('button', 'chip' + (V.clip && V.clip.key === c.key ? ' on' : ''), c.label);
      b.dataset.key = c.key;
      if (c.clip) b.title = c.key;
      b.addEventListener('click', () => setClip(c.key));
      cw.append(b);
    }
  }
  $('#vclips').hidden = !inst || V.clips.length <= 1;

  const sw = $('#vstages .chips');
  sw.textContent = '';
  $('#vstages').hidden = a.view !== 'stages';
  if (a.view === 'stages') {
    STAGE_RU.forEach((n, i) => {
      const b = el('button', 'chip' + (inst && inst.stage === i ? ' on' : ''), n);
      b.dataset.s = i;
      b.addEventListener('click', () => setStage(i));
      sw.append(b);
    });
  }

  const fw = $('#vfur .chips');
  fw.textContent = '';
  $('#vfur').hidden = !a.fur;
  if (a.fur) {
    for (const f of state.man.fur_presets || []) {
      const b = el('button', 'chip' + (inst && inst.fur === f.id ? ' on' : ''));
      b.dataset.fur = f.id;
      const s = el('span', 'sw');
      s.style.background = f.colors && f.colors.length > 1 ? `linear-gradient(135deg, ${f.colors.join(', ')})` : f.swatch;
      b.append(s, document.createTextNode(f.name));
      b.addEventListener('click', () => setFur(f.id));
      fw.append(b);
    }
  }
  fillParts(a, inst);
  if (!inst) $('#vnote').textContent = '';
}
function loop() {
  if (!V.open) return;
  requestAnimationFrame(loop);
  const dt = Math.min(V.clock.getDelta(), 0.1);
  V.t += dt;
  timeU.value = V.t;
  const inst = V.inst;
  if (inst) {
    const ct = V.t - V.clipT0;
    if (inst.mixer) {
      inst.mixer.update(dt);
      // one-shot clips (Death, Swing..): hold the last pose 0.8 s, then replay
      if (V.act && V.clip && V.clip.once && !V.act.isRunning()) {
        if (!V.holdUntil) V.holdUntil = V.t + 0.8;
        else if (V.t > V.holdUntil) { V.holdUntil = 0; V.act.reset().play(); }
      }
    }
    if (V.clip && V.clip.fn) V.clip.fn(ct);
  }
  V.controls.update(dt);
  placeFill(V.stage, V.camera, V.controls.target);
  V.renderer.render(V.stage.scene, V.camera);
}

// ---------- test hooks (headless QA: tools/models_shots.py) ----------
LP.open = (id) => openViewer(id).then(() => LP.opened);
LP.close = () => closeViewer();
LP.setClip = (k) => setClip(k);
LP.clips = () => V.clips.map((c) => c.key);
LP.setFur = (id) => setFur(id);
LP.setStage = (s) => setStage(s);
LP.setOpt = (k, v) => toggleOpt(k, v);
LP.setTab = (t) => { state.tab = t; buildTabs(); buildGrid(); };
// fix r1 W15: projected bbox of the open model at n orbit azimuths (current distance / elevation / target): worst margin to the
// stage edges in css px (l/r/t/b), and to the prev/next button lanes (56 px each side)
LP.fitCheck = (n = 12) => {
  if (!V.inst || !V.framedBox) return null;
  const sb = $('#vstage').getBoundingClientRect();
  const W = sb.width, H = sb.height, c = V.controls.target;
  const off = V.camera.position.clone().sub(c);
  const d = off.length(), el = Math.asin(off.y / d), az0 = Math.atan2(off.x, off.z);
  const corners = boxCorners(V.framedBox);
  const cam = V.camera.clone();
  let l = 1e9, r = 1e9, t = 1e9, b = 1e9;
  for (let k = 0; k < n; k++) {
    cam.position.copy(c).addScaledVector(orbitDir(az0 + (k * 2 * Math.PI) / n, el), d);
    cam.lookAt(c);
    cam.updateMatrixWorld(true);
    for (const p of corners) {
      const q = p.clone().project(cam);
      const x = ((q.x + 1) / 2) * W, y = ((1 - q.y) / 2) * H;
      l = Math.min(l, x); r = Math.min(r, W - x); t = Math.min(t, y); b = Math.min(b, H - y);
    }
  }
  const size = V.framedBox.getSize(new THREE.Vector3());
  const R = (v) => Math.round(v);
  return { stage: [R(W), R(H)], size: [+size.x.toFixed(3), +size.y.toFixed(3), +size.z.toFixed(3)], d: +d.toFixed(3),
    margin: { l: R(l), r: R(r), t: R(t), b: R(b) }, minEdge: R(Math.min(l, r, t, b)), minLane: R(Math.min(l, r) - 56) };
};
LP.orbit = (deg) => {
  const c = V.controls.target, off = V.camera.position.clone().sub(c);
  off.applyAxisAngle(new THREE.Vector3(0, 1, 0), deg * DEG);
  V.camera.position.copy(c).add(off);
  V.camera.lookAt(c);
  V.controls.update();
};
LP.probe = () => {
  // share of non-background pixels and their mean / near-black share, from the viewer canvas
  const c = V.renderer.domElement;
  const w = 200, h = Math.max(1, Math.round((200 * c.height) / c.width));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(c, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const bg = new THREE.Color(V.stage.scene.background).convertLinearToSRGB();
  const gr = new THREE.Color(V.stage.groundMat.color).convertLinearToSRGB();
  let n = 0, lum = 0, black = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const dbg = Math.abs(r - bg.r * 255) + Math.abs(g - bg.g * 255) + Math.abs(b - bg.b * 255);
    const dgr = Math.abs(r - gr.r * 255) + Math.abs(g - gr.g * 255) + Math.abs(b - gr.b * 255);
    if (dbg < 60 || dgr < 70) continue;
    n++;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum += l;
    if (l < 25) black++;
  }
  return { cover: +(n / (w * h)).toFixed(3), mean: n ? Math.round(lum / n) : 0, black: n ? +(black / n).toFixed(3) : 0 };
};

// ---------- boot ----------
async function boot() {
  try {
    const res = await fetch('manifest.json', { cache: 'no-cache' });
    const man = await res.json();
    state.man = man;
    state.assets = man.assets || [];
    for (const a of state.assets) state.byId.set(a.id, a);
    state.palette = buildPalette(man.palette);
    const t = man.totals || {};
    const built = man.built_utc ? new Date(man.built_utc) : null;
    const dubai = built ? new Date(built.getTime() + 4 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') + ' (Дубай)' : '';
    const n = t.models || state.assets.length;
    const pend = (man.pending || []).length;
    $('#stats').textContent = `${n} ${plural(n, 'модель', 'модели', 'моделей')} · ${fmtInt(t.tris || 0)} треугольников · все модели вместе ${fmtKB(t.glb_bytes || 0)}` +
      (pend ? ` · ещё ${pend} в работе` : '') + (dubai ? ` · сборка ${dubai}` : '');
    initThumbs();
    initViewer();
    initTabs();
    buildTabs();
    buildGrid();
    LP.ready = true;
    const m = location.hash.match(/^#m=(.+)$/);
    if (m && state.byId.has(decodeURIComponent(m[1]))) openViewer(decodeURIComponent(m[1]));
    renderAllThumbs();
  } catch (e) {
    LP.errors.push('boot: ' + e.message);
    $('#stats').textContent = 'Не удалось загрузить модели: ' + e.message;
  }
}
boot();
