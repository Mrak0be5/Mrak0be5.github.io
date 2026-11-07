// Хозяйство стройки кубами: мачты освещения на прицепах с генераторами (ночь с 10-го уровня). Всё — из тех
// же примитивов и материалов, что и остальная сцена.
import * as THREE from 'three';
import { Batch, roundedBox, boxUV, cylinder, quad } from './geo.js?v=360d748';

const W = new THREE.Color(1, 1, 1);
function M(x, y, z, ry = 0, rx = 0, rz = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
}

const UP = new THREE.Vector3(0, 1, 0);
// Цилиндр geo.cylinder (ось +y от 0 до длины) от точки a к точке b.
function tube(p, mat, a, b, r, c) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(UP, d.divideScalar(len)), new THREE.Vector3(1, 1, 1));
  p.put(mat, cylinder(r, r, len, 10), m, c);
}

// Мачта освещения на прицепе: корпус генератора, колёса, четыре выносные опоры, телескопическая мачта 6,9 м,
// перекладина с четырьмя светодиодными прожекторами (лицевые стёкла — в glow, они светятся ночью).
// Смотрит на точку (ax, az). Возвращает центр прожекторов.
function lightTower(p, glow, x, z, ax, az) {
  const base = M(x, 0, z, Math.atan2(ax - x, az - z));
  const at = function (lx, ly, lz, rx) { return base.clone().multiply(M(lx, ly, lz, 0, rx || 0, 0)); };
  const wp = function (lx, ly, lz) { return new THREE.Vector3(lx, ly, lz).applyMatrix4(base); };
  const yellow = new THREE.Color(0.86, 0.58, 0.07);
  p.put('blacksteel', boxUV(roundedBox(0.9, 0.09, 2.0, 0.01), 1, 1), at(0, 0.4, 0), W);
  p.put('paintworn', boxUV(roundedBox(0.86, 0.74, 1.25, 0.05, 4), 1, 1), at(0, 0.82, -0.2), yellow);
  p.put('paint', boxUV(roundedBox(0.7, 0.05, 0.92, 0.02, 3), 1, 1), at(0, 1.21, -0.2), new THREE.Color(0.18, 0.18, 0.18));
  p.put('blacksteel', boxUV(roundedBox(0.5, 0.3, 0.02, 0.005), 1, 1), at(0, 0.86, 0.46), new THREE.Color(0.35, 0.35, 0.36));
  tube(p, 'blacksteel', wp(0, 0.4, 0.95), wp(0, 0.34, 1.75), 0.03, W);
  [-1, 1].forEach(function (sd) {
    p.put('rubber', cylinder(0.26, 0.26, 0.15, 18), base.clone().multiply(M(sd > 0 ? 0.47 : -0.62, 0.26, -0.15, 0, 0, -Math.PI / 2)), W);
    p.put('steel', cylinder(0.11, 0.11, 0.155, 12), base.clone().multiply(M(sd > 0 ? 0.47 : -0.625, 0.26, -0.15, 0, 0, -Math.PI / 2)), new THREE.Color(0.7, 0.7, 0.7));
    [-1, 1].forEach(function (fb) {
      const a = wp(sd * 0.4, 0.55, -0.2 + fb * 0.62), b = wp(sd * 1.05, 0.04, -0.2 + fb * 1.3);
      tube(p, 'blacksteel', a, b, 0.028, W);
      p.put('blacksteel', boxUV(roundedBox(0.2, 0.03, 0.2, 0.005), 1, 1), M(b.x, 0.015, b.z), W);
    });
  });
  tube(p, 'tube', wp(0, 1.2, -0.66), wp(0, 3.6, -0.66), 0.07, W);
  tube(p, 'tube', wp(0, 3.5, -0.66), wp(0, 5.5, -0.66), 0.056, W);
  tube(p, 'tube', wp(0, 5.4, -0.66), wp(0, 6.95, -0.66), 0.044, W);
  p.put('blacksteel', cylinder(0.085, 0.085, 0.08, 12), M(wp(0, 3.5, -0.66).x, 3.5, wp(0, 3.5, -0.66).z), W);
  p.put('blacksteel', cylinder(0.07, 0.07, 0.08, 12), M(wp(0, 5.4, -0.66).x, 5.4, wp(0, 5.4, -0.66).z), W);
  tube(p, 'blacksteel', wp(-1.0, 6.92, -0.62), wp(1.0, 6.92, -0.62), 0.035, W);
  [-0.72, -0.24, 0.24, 0.72].forEach(function (lx) {
    const m = at(lx, 6.92, -0.52, 0.62);
    p.put('blacksteel', boxUV(roundedBox(0.44, 0.3, 0.09, 0.012), 1, 1), m, W);
    glow.add(quad(0.38, 0.24), m.clone().multiply(M(-0.19, -0.12, 0.047)), W, 0);
  });
  return wp(0, 6.85, -0.3);
}

class Pile {
  constructor() { this.batches = new Map(); }
  put(mat, prim, m, c) { let b = this.batches.get(mat); if (!b) { b = new Batch(); this.batches.set(mat, b); } b.add(prim, m, c || W, 0); }
  build(mats) {
    const g = new THREE.Group();
    this.batches.forEach(function (b, mat) {
      const mesh = new THREE.Mesh(b.geometry(), mats[mat]);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
    });
    return g;
  }
}

// Мачты света стройки кубами (ночь с 10-го уровня): по диагонали от здания f (м: x0, x1, z0, z1, h),
// прожекторы бьют в середину высоты стен. night(k) включает их в сумерки, lights — для теней и GI.
export function createLights(f, mats, opts = {}) {
  const p = new Pile();
  const glow = new Batch();
  const group = new THREE.Group();
  group.name = 'lights';
  const fcx = (f.x0 + f.x1) / 2, fcz = (f.z0 + f.z1) / 2;
  const off = 4 + Math.max(f.x1 - f.x0, f.z1 - f.z0) * 0.08;
  const heads = [[f.x0 - off, f.z1 + off], [f.x1 + off, f.z0 - off]].map(function (t) { return lightTower(p, glow, t[0], t[1], fcx, fcz); });
  group.add(p.build(mats));
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x161616, emissive: 0xfff3e4, emissiveIntensity: 0, roughness: 0.35 });
  group.add(new THREE.Mesh(glow.geometry(), lampMat));
  const reach = Math.max(75, Math.hypot(f.x1 - f.x0, f.z1 - f.z0) * 1.6);
  const spots = heads.map(function (h, i) {
    const sp = new THREE.SpotLight(0xfff1df, 0, reach, 0.64, 0.55, 2);
    sp.position.copy(h);
    sp.target.position.set(fcx, Math.min(f.h * 0.4, 6), fcz);
    if (i === 0 && opts.shadowSize) {
      sp.castShadow = true;
      sp.shadow.mapSize.set(opts.shadowSize, opts.shadowSize);
      sp.shadow.bias = -0.0004;
      sp.shadow.normalBias = 0.025;
      sp.shadow.radius = -3;
      sp.shadow.camera.near = 0.5;
      sp.shadow.camera.far = reach * 0.7;
      sp.shadow.autoUpdate = false;
    }
    group.add(sp, sp.target);
    return sp;
  });
  function night(k) {
    const on = THREE.MathUtils.smoothstep(k, 0.15, 0.55);
    spots.forEach(function (sp) { sp.intensity = 150 * on; sp.angle = on > 0.001 ? 0.64 : 0.005; if (sp.castShadow) sp.shadow.autoUpdate = on > 0.01; });
    lampMat.emissiveIntensity = 26 * on;
  }
  night(0);
  return { group, lights: spots, night };
}
