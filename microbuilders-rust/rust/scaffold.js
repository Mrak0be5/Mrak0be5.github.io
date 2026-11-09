// Леса оригинала (world.scaffoldPieces — лестничные мачты, world.scaffoldDecks — настилы; game.js
// объединяет их так же): рамные леса пролётом в клетку 2 м. Мачта — пролёт с лестницей у стены (ox, oz),
// настил — стальной щит на уровне пола клетки с перилами, толщина уходит вниз от опорной плоскости.
// Износ: трещина — погнутые, в ленте; поломка — щита нет; снятые (removed) не рисуются. Детали настоящих
// лесов: хомуты на узлах, диагональные связи по наружным граням, опорные пятки на подкладных досках у земли,
// бортовые доски по краю настила.
import * as THREE from 'three';
import { roundedBox, boxUV, cylinder, Batch } from './geo.js?v=9f2863b';
import { CELL } from './families.js?v=9f2863b';
import { TEXTURE_TILES as TILE } from './textures.js?v=9f2863b';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
const WHITE = new THREE.Color(1, 1, 1), CRACK = new THREE.Color(1.25, 0.72, 0.3), DARK = new THREE.Color(0.62, 0.62, 0.64);
const UP = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();

export function createScaffold(ctx) {
  const { E, mats } = ctx;
  const group = new THREE.Group();
  group.name = 'scaffold';
  let world = null;
  let signature = '';
  let meshes = [];
  const tube = cylinder(0.024, 0.024, 1, 8, false);
  // хомут на узле, опорная пятка со стержнем, подкладная доска, бортовая доска настила
  const clamp = roundedBox(0.075, 0.085, 0.075, 0.012, 2);
  const foot = roundedBox(0.15, 0.012, 0.15, 0.003, 2);
  const sole = boxUV(roundedBox(0.24, 0.045, CELL - 0.02, 0.006, 2), TILE.planks[0], TILE.planks[1]);
  const toe = boxUV(roundedBox(CELL - 0.24, 0.15, 0.028, 0.004, 2), TILE.planks[0], TILE.planks[1]);
  // щит настила в натуральную величину (фактура рифлёного листа — в метрах)
  const plate = boxUV(roundedBox(CELL - 0.06, 0.06, CELL - 0.06, 0.01, 3), TILE.diamond[0], TILE.diamond[1]);

  function build(w) { clear(); world = w; signature = ''; }
  function clear() {
    meshes.forEach(function (m) { group.remove(m); m.geometry.dispose(); });
    meshes = [];
    world = null;
  }

  // Труба от a до b (заготовка — от 0 до 1 по y).
  function pipe(batch, ax, ay, az, bx, by, bz, color) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
    _q.setFromUnitVectors(UP, _d.set(dx / len, dy / len, dz / len));
    _m.compose(_p.set(ax, ay, az), _q, _s.set(1, len, 1));
    batch.add(tube, _m, color);
  }

  function frame(batch, x0, y0, z0, color, ox, oz, parts) {
    // четыре стойки и связи по верху
    const xs = [x0 + 0.1, x0 + CELL - 0.1], zs = [z0 + 0.1, z0 + CELL - 0.1];
    xs.forEach(function (x) { zs.forEach(function (z) { pipe(batch, x, y0, z, x, y0 + CELL, z, color); }); });
    pipe(batch, xs[0], y0 + CELL, zs[0], xs[1], y0 + CELL, zs[0], color);
    pipe(batch, xs[0], y0 + CELL, zs[1], xs[1], y0 + CELL, zs[1], color);
    pipe(batch, xs[0], y0 + CELL, zs[0], xs[0], y0 + CELL, zs[1], color);
    pipe(batch, xs[1], y0 + CELL, zs[0], xs[1], y0 + CELL, zs[1], color);
    // хомуты на верхних узлах
    xs.forEach(function (x) { zs.forEach(function (z) {
      _m.compose(_p.set(x, y0 + CELL - 0.02, z), _q.identity(), _s.set(1, 1, 1));
      parts.add(clamp, _m, DARK);
    }); });
    // диагонали по граням, кроме грани к зданию (ox, oz); направление чередуется по ярусу
    const flip = (Math.round(y0 / CELL) & 1) === 1;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      if (d[0] === ox && d[1] === oz) return;
      if (d[0]) {
        const x = d[0] > 0 ? xs[1] : xs[0];
        pipe(batch, x, y0 + 0.08, flip ? zs[1] : zs[0], x, y0 + CELL - 0.08, flip ? zs[0] : zs[1], color);
      } else {
        const z = d[1] > 0 ? zs[1] : zs[0];
        pipe(batch, flip ? xs[1] : xs[0], y0 + 0.08, z, flip ? xs[0] : xs[1], y0 + CELL - 0.08, z, color);
      }
    });
    // у земли: пятки на подкладных досках
    if (y0 < 0.01) {
      xs.forEach(function (x) { zs.forEach(function (z) {
        _m.compose(_p.set(x, 0.051, z), _q.identity(), _s.set(1, 1, 1));
        parts.add(foot, _m, DARK);
      }); });
    }
  }

  function rebuild() {
    meshes.forEach(function (m) { group.remove(m); m.geometry.dispose(); });
    meshes = [];
    const tubes = new Batch(), plates = new Batch(), parts = new Batch(), boards = new Batch();
    const list = world.scaffoldPieces.concat(world.scaffoldDecks);
    list.forEach(function (piece) {
      if (!piece.built || piece.removed) return;
      const x0 = piece.x * CELL, y0 = piece.y * CELL, z0 = piece.z * CELL;
      const color = piece.cracked ? CRACK : WHITE;
      frame(tubes, x0, y0, z0, color, piece.ox || 0, piece.oz || 0, parts);
      if (y0 < 0.01) {
        // подкладные доски под парами стоек
        [x0 + 0.1, x0 + CELL - 0.1].forEach(function (x) {
          _m.compose(_p.set(x, 0.0225, z0 + CELL / 2), _q.identity(), _s.set(1, 1, 1));
          boards.add(sole, _m, null);
        });
      }
      if (piece.ladder) {
        // лестница у стены: тетивы и ступени через 0,3 м
        const cx = x0 + CELL / 2 + piece.ox * 0.28 * CELL, cz = z0 + CELL / 2 + piece.oz * 0.28 * CELL;
        const sx = piece.oz !== 0 ? 0.22 : 0, sz = piece.ox !== 0 ? 0.22 : 0;
        pipe(tubes, cx - sx, y0, cz - sz, cx - sx, y0 + CELL, cz - sz, color);
        pipe(tubes, cx + sx, y0, cz + sz, cx + sx, y0 + CELL, cz + sz, color);
        for (let k = 1; k < 7; k++) pipe(tubes, cx - sx, y0 + k * 0.3, cz - sz, cx + sx, y0 + k * 0.3, cz + sz, color);
      }
      if (piece.deck && !piece.broken) {
        // щит настила: верх — на полу клетки, толщина вниз
        _m.compose(_p.set(x0 + CELL / 2, y0 - 0.03, z0 + CELL / 2), _q.identity(), _s.set(1, 1, 1));
        plates.add(plate, _m, color);
        // перила с трёх сторон (без стороны к зданию ox, oz)
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          if (d[0] === piece.ox && d[1] === piece.oz) return;
          const ax = x0 + CELL / 2 + d[0] * (CELL / 2 - 0.1) - d[1] * (CELL / 2 - 0.1), az = z0 + CELL / 2 + d[1] * (CELL / 2 - 0.1) - d[0] * (CELL / 2 - 0.1);
          const bx = x0 + CELL / 2 + d[0] * (CELL / 2 - 0.1) + d[1] * (CELL / 2 - 0.1), bz = z0 + CELL / 2 + d[1] * (CELL / 2 - 0.1) + d[0] * (CELL / 2 - 0.1);
          pipe(tubes, ax, y0 + 1.0, az, bx, y0 + 1.0, bz, color);
          pipe(tubes, ax, y0 + 0.5, az, bx, y0 + 0.5, bz, color);
          // бортовая доска по краю щита
          _q.setFromEuler(_e.set(0, d[0] ? Math.PI / 2 : 0, 0));
          _m.compose(_p.set((ax + bx) / 2 + d[0] * 0.02, y0 + 0.075, (az + bz) / 2 + d[1] * 0.02), _q, _s.set(1, 1, 1));
          boards.add(toe, _m, null);
        });
      }
    });
    if (tubes.vcount) {
      const m = new THREE.Mesh(tubes.geometry(), mats.tube);
      m.castShadow = m.receiveShadow = true;
      meshes.push(m);
    }
    if (plates.vcount) {
      const m = new THREE.Mesh(plates.geometry(), mats.diamond);
      m.castShadow = m.receiveShadow = true;
      meshes.push(m);
    }
    if (parts.vcount) {
      const m = new THREE.Mesh(parts.geometry(), mats.steel);
      m.castShadow = m.receiveShadow = true;
      meshes.push(m);
    }
    if (boards.vcount) {
      const m = new THREE.Mesh(boards.geometry(), mats.planks);
      m.castShadow = m.receiveShadow = true;
      meshes.push(m);
    }
    meshes.forEach(function (m) { group.add(m); });
  }

  // Пересобрать, когда поменялся набор стоящих элементов или их износ.
  function update() {
    if (!world) return;
    let sig = '';
    const list = world.scaffoldPieces.concat(world.scaffoldDecks);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.built && !p.removed) sig += p.id + (p.cracked ? 'c' : '') + (p.broken ? 'b' : '') + ';';
    }
    if (sig === signature) return false;
    signature = sig;
    rebuild();
    return true;
  }

  return { group, build, clear, update };
}
