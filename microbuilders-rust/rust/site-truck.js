// Самосвал у въезда (art/vehicles.js truck): стоит кузовом к стройке и изредка разгружается — кузов поднимается,
// блоки съезжают и падают на землю, кузов опускается и снова «загружен». Ход кузова и блоков — зеркало самосвала
// оригинала (его группа в levelRoot: наклон кузова и матрицы восьми блоков ×2), так пыль и выхлоп эффектов
// оригинала совпадают с видом; без него — тот же цикл по своим часам. Машина: рама, кабина со стёклами, решёткой,
// фарами и зеркалами, бак, ящик, выхлопная труба с кожухом, шесть колёс с протектором, крылья; кузов из стального
// листа с рёбрами и козырьком, гидроцилиндр подъёма.
import * as THREE from 'three';
import { CELL } from './families.js?v=ff29707';
import { Pile, M, mul, hex, WHITE, wheel } from './site-kit.js?v=ff29707';
import { markDynamic, DYNAMIC } from './render.js?v=ff29707';

const C = CELL;
const V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
const YELLOW = hex(0xecc040), YELLOW_D = hex(0xc9a030), DARK = hex(0x2a2c2f), STEEL = hex(0x9aa1a8);
const DUMP = { period: 24, up: 16, top: 17.6, slide: 17.8, down: 20.2, flat: 21.6, refill: 22.6 };
const TILT = 0.85;

export function buildTruck(kit, lay, MB, family, familyOf, tintOf, heightAt) {
  const t = lay.supply.truck;
  const group = new THREE.Group();
  group.name = 'truck';
  // на земле двора (самая низкая из точек под колёсами — колёса не висят)
  const gy = heightAt ? Math.min(heightAt(t.x * C, t.z * C), heightAt(t.x * C + 1.6, t.z * C + 1.6), heightAt(t.x * C - 1.6, t.z * C - 1.6)) : 0;
  group.position.set(t.x * C, gy, t.z * C);
  group.rotation.y = t.turn;
  const at = function (x, y, z, ry, rx, rz) { return M(x * C, y * C, z * C, ry, rx, rz); };
  // детали — в осях машины; грязь — от земли под ней (колёса и низ рамы — в грязи)
  const ground = function () { return gy; };
  const P = new Pile(kit);
  P.ground = ground;
  P.mudK = 1;
  // рама, бампер с полосами, решётка, фары
  P.put('blacksteel', kit.box(0.9 * C, 0.22 * C, 2.7 * C, 0.02), at(0, 0.5, 0));
  [-1, 1].forEach(function (e) { P.put('blacksteel', kit.box(0.08 * C, 0.16 * C, 2.9 * C, 0.01), at(e * 0.4, 0.46, -0.05)); });
  P.put('blacksteel', kit.box(1.24 * C, 0.16 * C, 0.08 * C, 0.015), at(0, 0.5, 1.4));
  for (let i = 0; i < 8; i++) P.put('paint', kit.box(0.06 * C, 0.1 * C, 0.01 * C, 0), at(-0.53 + i * 0.152, 0.5, 1.442, 0, 0, 0.6), i % 2 ? DARK : YELLOW);
  // кабина
  P.put('paint', kit.box(1.2 * C, 0.74 * C, 0.8 * C, 0.05), at(0, 1.09, 0.95), YELLOW);
  P.put('paint', kit.box(1.26 * C, 0.06 * C, 0.86 * C, 0.02), at(0, 1.49, 0.95), YELLOW_D);
  P.put('pane', quadP(1.04 * C, 0.32 * C), at(-0.52, 1.07, 1.352), WHITE);
  [-1, 1].forEach(function (e) {
    P.put('pane', quadP(0.48 * C, 0.3 * C), mul(at(e * 0.602, 1.08, e > 0 ? 1.24 : 0.76), M(0, 0, 0, e * Math.PI / 2)), WHITE);
    // зеркала на кронштейнах
    P.put('blacksteel', kit.box(0.17 * C, 0.02 * C, 0.02 * C, 0), at(e * 0.68, 1.32, 1.28));
    P.put('blacksteel', kit.box(0.17 * C, 0.02 * C, 0.02 * C, 0), at(e * 0.68, 1.1, 1.28));
    P.put('blacksteel', kit.box(0.05 * C, 0.26 * C, 0.12 * C, 0.01), at(e * 0.78, 1.21, 1.28));
    P.put('pane', quadP(0.1 * C, 0.22 * C), mul(at(e * 0.78 + 0.05, 1.1, 1.217), M(0, 0, 0, Math.PI)), WHITE);
    // подножка и крыло над передним колесом
    P.put('diamond', kit.tbox('diamond', 0.12 * C, 0.025 * C, 0.3 * C, 0.004), at(e * 0.58, 0.62, 0.95));
    P.put('paintworn', kit.box(0.3 * C, 0.04 * C, 0.84 * C, 0.015), at(e * 0.55, 0.78, 0.86), DARK);
  });
  P.put('blacksteel', kit.box(0.5 * C, 0.22 * C, 0.02 * C, 0.004), at(0, 0.88, 1.356));
  for (let k = 0; k < 4; k++) P.put('steel', kit.box(0.46 * C, 0.018 * C, 0.012 * C, 0), at(0, 0.8 + k * 0.055, 1.368), hex(0x6d7378));
  [-1, 1].forEach(function (e) {
    P.put('blacksteel', kit.box(0.17 * C, 0.12 * C, 0.02 * C, 0.004), at(e * 0.43, 0.86, 1.358));
    P.put('lamp', quadP(0.13 * C, 0.08 * C), at(e * 0.43 - 0.065, 0.82, 1.37), WHITE);
  });
  // бак, ящик, выхлоп
  P.put('steel', kit.cyl(0.13 * C, 0.13 * C, 0.42 * C, 16), at(0.56, 0.6, 0.03, 0, Math.PI / 2, 0), STEEL);
  P.put('paintworn', kit.box(0.32 * C, 0.22 * C, 0.28 * C, 0.01), at(-0.56, 0.6, 0.2), DARK);
  P.put('blacksteel', kit.cyl(0.038 * C, 0.042 * C, 0.62 * C, 12), at(-0.56, 1.0, 0.48));
  P.put('steel', kit.cyl(0.054 * C, 0.054 * C, 0.26 * C, 12), at(-0.56, 1.07, 0.48), hex(0xb0b3b6));
  P.put('blacksteel', kit.cyl(0.05 * C, 0.05 * C, 0.03 * C, 12), at(-0.56, 1.6, 0.48));
  // колёса и задние крылья
  [-1, 1].forEach(function (e) {
    // задняя тележка: два моста, колёса не внахлёст (у оригинала стилизованно сдвинуты)
    [0.86, -0.4, -1.18].forEach(function (z) { wheel(P, kit, at(e * 0.55, 0.36, z), 0.36 * C, 0.26 * C, e, { tread: 'chevron', rim: hex(0x8e8f8a), nuts: 10 }); });
    P.put('paintworn', kit.box(0.32 * C, 0.03 * C, 1.66 * C, 0.01), at(e * 0.55, 0.76, -0.79), DARK);
    P.put('rubber', kit.box(0.3 * C, 0.22 * C, 0.015 * C, 0), at(e * 0.55, 0.63, -1.6));
    P.put('blacksteel', kit.box(0.04 * C, 0.04 * C, 0.3 * C, 0), at(e * 0.45, 0.74, -1.46));
  });
  const body = P.build(family);
  group.add(body);
  // кузов: шарнир сзади на раме
  const bed = new THREE.Group();
  bed.position.set(0, 0.76 * C, -1.5 * C);
  group.add(bed);
  // кузов поднимается — грязь от земли поползла бы по нему: у кузова её нет (брызги — на раме и колёсах)
  const Q = new Pile(kit);
  // те же клоны материалов, что у рамы (одна программа шейдера), но без своей грязи
  Q.ground = ground; Q.mudK = 0;
  const bat = function (x, y, z) { return M(x * C, y * C, z * C); };
  Q.put('steelplate', kit.tbox('steelplate', 1.24 * C, 0.06 * C, 2.0 * C, 0.01), bat(0, 0.04, 1.0));
  Q.put('paintworn', kit.box(1.24 * C, 0.06 * C, 2.0 * C, 0.015), bat(0, 0.0, 1.0), YELLOW);
  [-1, 1].forEach(function (e) {
    // борта — краска без крупных сколов (сколы и брызги — на рёбрах и кромках)
    Q.put('paint', kit.box(0.05 * C, 0.5 * C, 2.0 * C, 0.01), bat(e * 0.62, 0.3, 1.0), YELLOW);
    Q.put('paintworn', kit.box(0.08 * C, 0.06 * C, 2.02 * C, 0.012), bat(e * 0.62, 0.56, 1.0), YELLOW_D);
    for (let k = 0; k < 4; k++) Q.put('paintworn', kit.box(0.035 * C, 0.44 * C, 0.06 * C, 0.006), bat(e * 0.66, 0.28, 0.25 + k * 0.5), YELLOW_D);
    Q.put('paintworn', kit.box(0.06 * C, 0.08 * C, 2.0 * C, 0.01), bat(e * 0.45, -0.06, 1.0), DARK);
  });
  Q.put('paint', kit.box(1.3 * C, 0.95 * C, 0.07 * C, 0.015), bat(0, 0.5, 1.96), YELLOW);
  Q.put('paintworn', kit.box(1.3 * C, 0.04 * C, 0.44 * C, 0.01), bat(0, 0.96, 2.14), YELLOW_D);
  for (let k = 0; k < 3; k++) Q.put('paintworn', kit.box(1.24 * C, 0.05 * C, 0.04 * C, 0.006), bat(0, 0.2 + k * 0.3, 2.0), YELLOW_D);
  Q.put('paintworn', kit.box(1.18 * C, 0.1 * C, 0.06 * C, 0.01), bat(0, 0.06, 0.02), YELLOW_D);
  Q.build(family, bed);
  // гидроцилиндр: корпус на раме перед кузовом, шток — к передней стенке кузова
  const R = new Pile(kit);
  R.ground = ground; R.mudK = 0;
  R.put('blacksteel', kit.cyl(0.07 * C, 0.07 * C, 1, 12), new THREE.Matrix4());
  const barrel = R.build(family);
  R.put('steel', kit.cyl(0.045 * C, 0.045 * C, 1, 10), new THREE.Matrix4(), hex(0xd6d8da));
  const rod = R.build(family);
  group.add(barrel, rod);
  const ramBase = V(0, 0.62 * C, 0.3 * C), ramTop = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // блоки груза: 8 кубов 1 м материала уровня
  const fam = familyOf(MB, t.materialId);
  const tint = tintOf(MB, t.materialId, fam);
  const geo = new THREE.BoxGeometry(0.5 * C * 0.96, 0.5 * C * 0.96, 0.5 * C * 0.96);
  const tile = family.tile ? family.tile(fam) : [2, 2];
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.96 / tile[0], uv.getY(i) * 0.96 / tile[1]);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  const blocks = new THREE.InstancedMesh(geo, family(fam), 8);
  blocks.castShadow = blocks.receiveShadow = true;
  blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const col = new THREE.Color(tint[0], tint[1], tint[2]);
  for (let k = 0; k < 8; k++) blocks.setColorAt(k, col);
  blocks.frustumCulled = false;
  group.add(blocks);
  markDynamic(group);

  // своё время (если оригинала нет): тот же цикл, что animateTruck
  const slots = [];
  for (let k = 0; k < 8; k++) {
    const jitter = Math.sin(k * 12.9898) * 0.04;
    slots.push({ x: ((k & 1) - 0.5) * 0.54 + jitter, y: 0.33 + (k >> 2) * 0.5, z: 0.73 + ((k >> 1) & 1) * 0.54, turn: jitter * 3 });
  }
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
  let orig = null, searched = 0, own = 0;
  function findOrig(root) {
    if (!root) return null;
    for (let i = 0; i < root.children.length; i++) {
      const g = root.children[i];
      if (!g.isGroup || g.userData.phase === undefined) continue;
      const b = g.children.find(function (o) { return o.isGroup; });
      const bl = g.children.find(function (o) { return o.isInstancedMesh && o.count === 8; });
      if (b && bl) return { group: g, bed: b, blocks: bl };
    }
    return null;
  }
  function ram() {
    bed.updateMatrix();
    ramTop.set(0, -0.05 * C, 1.8 * C).applyMatrix4(bed.matrix);
    const d = new THREE.Vector3().subVectors(ramTop, ramBase);
    const len = d.length();
    _q.setFromUnitVectors(up, d.normalize());
    const bl = Math.min(len, 0.55 * C);
    barrel.position.copy(ramBase); barrel.quaternion.copy(_q); barrel.scale.set(1, bl, 1);
    rod.position.copy(ramBase); rod.quaternion.copy(_q); rod.scale.set(1, len, 1);
  }
  function update(dt, info) {
    if (!orig && searched < 240 && info && info.origScene) { searched++; orig = findOrig(info.origScene.children[0]); }
    if (orig && orig.group.parent) {
      bed.rotation.x = orig.bed.rotation.x;
      bed.position.y = orig.bed.position.y * C;
      for (let k = 0; k < 8; k++) {
        orig.blocks.getMatrixAt(k, _m);
        _m.decompose(_p, _q, _s);
        _p.multiplyScalar(C);
        _m.compose(_p, _q, _s);
        blocks.setMatrixAt(k, _m);
      }
    } else {
      // без оригинала: кузов поднимается и опускается, блоки — в кузове (съезд не считаем)
      own += dt;
      const tt = own % DUMP.period;
      const drop = Math.min(1, Math.max(0, (tt - DUMP.down) / (DUMP.flat - DUMP.down)));
      const tilt = tt < DUMP.up ? 0 : tt < DUMP.top ? (tt - DUMP.up) / (DUMP.top - DUMP.up) * TILT : tt < DUMP.down ? TILT : (1 - drop * drop) * TILT;
      bed.rotation.x = -tilt;
      bed.updateMatrix();
      for (let k = 0; k < 8; k++) {
        const sl = slots[k];
        const show = tt < DUMP.slide || tt >= DUMP.refill ? 1 : 0.001;
        _m.compose(_p.set(sl.x * C, sl.y * C, sl.z * C), _q.setFromEuler(_e.set(0, sl.turn, 0)), _s.setScalar(show));
        _m.premultiply(bed.matrix);
        blocks.setMatrixAt(k, _m);
      }
    }
    blocks.instanceMatrix.needsUpdate = true;
    ram();
  }
  update(0, null);
  function dispose() { DYNAMIC.delete(group); }
  return { group: group, update: update, dispose: dispose };
}

function quadP(w, h) {
  return {
    pos: new Float32Array([0, 0, 0, w, 0, 0, w, h, 0, 0, h, 0]),
    nrm: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uv: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    index: new Uint16Array([0, 1, 2, 0, 2, 3]),
  };
}
