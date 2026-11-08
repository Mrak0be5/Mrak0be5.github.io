// Двор стройки оригинала: карьеры материалов (level.mines, клетки глыб rocks) и столы планирования
// рабочих (builder.homeCell). Карьер — место набора, не препятствие (logic.js): глыбы не выходят из своих
// клеток. Камень, песчаник, гранит, мрамор — каменоломня из колотых блоков; кирпич, брус, сталь, бетон —
// поддоны с пачками той же кладки, что у кубов; стекло — стеклоблоки. Клетка — 2 м.
import * as THREE from 'three';
import { rng, stone, roundedBox, boxUV, cylinder, Batch } from './geo.js?v=f4726a0';
import { TEXTURE_TILES as TILE } from './textures.js?v=f4726a0';
import { CELL, familyOf, familyMaterial, familyTile, tintOf } from './families.js?v=f4726a0';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
const _col = new THREE.Color();
// средний тон фактуры камня (textures.js → stone): материал оригинала делится на него — оттенок глыб
const ROCK_BASE = [0.5, 0.47, 0.43];

function rockTint(MB, id) {
  const m = MB.MATERIAL[id];
  _col.setHex(m ? m.color : 0x999999).convertSRGBToLinear();
  return new THREE.Color(Math.min(2.2, _col.r / Math.pow(ROCK_BASE[0], 2.2)), Math.min(2.2, _col.g / Math.pow(ROCK_BASE[1], 2.2)), Math.min(2.2, _col.b / Math.pow(ROCK_BASE[2], 2.2)));
}

export function createYard(ctx) {
  const { E, mats } = ctx;
  const MB = E.MB;
  const group = new THREE.Group();
  group.name = 'yard';
  let world = null;
  const desks = new Set();
  const deskTop = boxUV(roundedBox(1.3, 0.05, 0.75, 0.01, 3), TILE.planks[0], TILE.planks[1]);
  const deskLeg = boxUV(roundedBox(0.06, 0.84, 0.06, 0.008, 3), TILE.planks[0], TILE.planks[1]);
  const pallet = boxUV(roundedBox(1.6, 0.14, 1.6, 0.012, 3), TILE.planks[0], TILE.planks[1]);
  const glassBlock = boxUV(roundedBox(0.4, 0.4, 0.4, 0.03, 3), 0.4, 0.4);

  function build(w) {
    clear();
    world = w;
    const r = rng(w.level.index * 31 + 7);
    w.level.mines.forEach(function (mine) {
      const family = familyOf(MB, mine.materialId);
      if (family === 'stone' || family === 'marble') quarry(mine, r);
      else stockpile(mine, family, r);
      tools(mine, family, r);
    });
    rubble(w, r);
    syncDesks();
  }

  function clear() {
    group.children.slice().forEach(function (o) { group.remove(o); o.traverse(function (c) { if (c.geometry) c.geometry.dispose(); }); });
    desks.clear();
    world = null;
  }

  // Столбы карьера: сколько ярусов глыб над клеткой (верхние клетки rocks лежат на нижних).
  function columns(mine) {
    const levels = new Map();
    mine.rocks.forEach(function (cell) {
      const k = cell.x + ',' + cell.z;
      levels.set(k, Math.max(levels.get(k) || 0, cell.y + 1));
    });
    return levels;
  }

  // Каменоломня: колотые блоки 1,6–1,9 м друг на друге, у подножия — отколотые куски.
  function quarry(mine, r) {
    const color = rockTint(MB, mine.materialId);
    const batch = new Batch();
    columns(mine).forEach(function (n, key) {
      const xz = key.split(',').map(Number);
      const cx = (xz[0] + 0.5) * CELL, cz = (xz[1] + 0.5) * CELL;
      let y = 0;
      for (let level = 0; level < n; level++) {
        const w = CELL * (0.78 + r() * 0.12), d = CELL * (0.78 + r() * 0.12), h = CELL * (0.55 + r() * 0.2);
        const p = stone(w, h, d, Math.floor(r() * 24), TILE.stone, r(), r());
        _e.set((r() - 0.5) * 0.05, (r() - 0.5) * 0.4, (r() - 0.5) * 0.05);
        _m.compose(_p.set(cx + (r() - 0.5) * 0.2, y + h / 2 - 0.03, cz + (r() - 0.5) * 0.2), _q.setFromEuler(_e), _s.set(1, 1, 1));
        batch.add(p, _m, color);
        y += h - 0.05;
      }
      for (let k = 0; k < 3; k++) {
        const sz = 0.18 + r() * 0.3;
        const q = stone(sz, sz * 0.6, sz * 0.8, Math.floor(r() * 24), TILE.stone, r(), r());
        const a = r() * Math.PI * 2, dd = CELL * (0.5 + r() * 0.12);
        _m.compose(_p.set(cx + Math.cos(a) * dd, sz * 0.22, cz + Math.sin(a) * dd), _q.setFromEuler(_e.set(0, r() * 6, 0)), _s.set(1, 1, 1));
        batch.add(q, _m, color);
      }
    });
    const mesh = new THREE.Mesh(batch.geometry(), mats.stone);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Штабель: на клетке — поддоны с пачками той же кладки, что у кубов этого материала (кирпич, брус, листы,
  // блоки), ярус на клетку по высоте; стекло — стеклоблоки 40 см.
  function stockpile(mine, family, r) {
    const glass = family === 'glass';
    const tint = glass ? [1, 1, 1] : tintOf(MB, mine.materialId, family);
    const color = new THREE.Color(tint[0], tint[1], tint[2]);
    const tile = glass ? [0.4, 0.4] : familyTile(family);
    const bundles = new Batch(), pallets = new Batch();
    columns(mine).forEach(function (n, key) {
      const xz = key.split(',').map(Number);
      const cx = (xz[0] + 0.5) * CELL, cz = (xz[1] + 0.5) * CELL;
      let y = 0;
      for (let level = 0; level < n; level++) {
        _q.setFromEuler(_e.set(0, (r() - 0.5) * 0.08, 0));
        _m.compose(_p.set(cx, y + 0.07, cz), _q, _s.set(1, 1, 1));
        pallets.add(pallet, _m, null);
        y += 0.14;
        if (glass) {
          // стеклоблоки рядами 3 × 3, два-три ряда
          const rows = 2 + Math.floor(r() * 2);
          for (let ly = 0; ly < rows; ly++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
            _m.compose(_p.set(cx + (i - 1) * 0.43, y + 0.2 + ly * 0.41, cz + (j - 1) * 0.43), _q, _s.set(1, 1, 1));
            bundles.add(glassBlock, _m, null);
          }
          y += rows * 0.41;
          continue;
        }
        const w = 1.32 + r() * 0.14, h = 0.95 + r() * 0.15;
        const geo = boxUV(roundedBox(w, h, w, 0.01, 3), tile[0], tile[1], r(), r());
        _m.compose(_p.set(cx + (r() - 0.5) * 0.1, y + h / 2, cz + (r() - 0.5) * 0.1), _q, _s.set(1, 1, 1));
        bundles.add(geo, _m, color);
        y += h;
      }
    });
    const mesh = new THREE.Mesh(bundles.geometry(), glass ? mats.glass : familyMaterial(mats, family));
    mesh.castShadow = !glass;
    mesh.receiveShadow = true;
    group.add(mesh);
    const pm = new THREE.Mesh(pallets.geometry(), mats.planks);
    pm.castShadow = pm.receiveShadow = true;
    group.add(pm);
  }

  // Хозяйство у карьера — с дальней от здания стороны (рабочие подходят со стороны здания, к standX/Z): у кладки —
  // оцинкованное корыто с раствором и мастерком, ведро, мешки цемента на поддоне; у каменоломни — щебень и ведро;
  // у стали и дерева — ящик с инструментом. Не препятствия: логика их не знает, стоят в стороне.
  const tub = boxUV(roundedBox(0.92, 0.26, 0.62, 0.03, 2), TILE.zinc[0], TILE.zinc[1]);
  const mortarTop = boxUV(roundedBox(0.84, 0.02, 0.54, 0.008, 2), TILE.mortar[0], TILE.mortar[1]);
  const bucket = cylinder(0.13, 0.15, 0.3, 14, true);
  const bag = boxUV(roundedBox(0.52, 0.13, 0.34, 0.05, 3), 1, 1);
  const lowPallet = boxUV(roundedBox(1.0, 0.12, 0.8, 0.01, 2), TILE.planks[0], TILE.planks[1]);
  const box = boxUV(roundedBox(0.56, 0.22, 0.26, 0.015, 2), 1, 1);
  function tools(mine, family, r) {
    if (!mine.rocks || !mine.rocks.length) return;
    let mx = 0, mz = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    mine.rocks.forEach(function (c) { mx += c.x; mz += c.z; x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); z0 = Math.min(z0, c.z); z1 = Math.max(z1, c.z); });
    mx = (mx / mine.rocks.length + 0.5) * CELL; mz = (mz / mine.rocks.length + 0.5) * CELL;
    const len = Math.hypot(mx, mz) || 1, ox = mx / len, oz = mz / len;
    const rad = Math.max(x1 - x0 + 1, z1 - z0 + 1) * CELL * 0.5;
    const px = mx + ox * (rad + 1.1), pz = mz + oz * (rad + 1.1);
    const yaw = Math.atan2(ox, oz) + (r() - 0.5) * 0.6;
    const zinc = new Batch(), mortar = new Batch(), paint = new Batch(), wood = new Batch();
    const place = function (batch, geo, lx, ly, lz, ry, color) {
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      _q.setFromEuler(_e.set(0, yaw + ry, 0));
      _m.compose(_p.set(px + lx * c + lz * sn, ly, pz - lx * sn + lz * c), _q, _s.set(1, 1, 1));
      batch.add(geo, _m, color);
    };
    const masonry = family === 'brick' || family === 'concrete' || family === 'stone' || family === 'marble';
    if (family === 'brick' || family === 'concrete') {
      place(zinc, tub, 0, 0.13, 0, 0.1, null);
      place(mortar, mortarTop, 0, 0.235, 0, 0.1, null);
      place(wood, lowPallet, 1.15, 0.06, 0.1, -0.2, null);
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) place(paint, bag, 1.15 + (i % 2) * 0.05 - 0.02, 0.18 + i * 0.12, 0.1 + (i % 2 ? 0.06 : -0.04), -0.2 + (r() - 0.5) * 0.3, new THREE.Color(0.74, 0.68, 0.55));
    }
    if (masonry) place(paint, bucket, -0.7, 0, 0.35, 0, new THREE.Color(0.08, 0.08, 0.09));
    if (family === 'stone' || family === 'marble') {
      const color = rockTint(MB, mine.materialId);
      const rub = new Batch();
      for (let i = 0; i < 9; i++) {
        const sz = 0.08 + r() * 0.16;
        const q = stone(sz, sz * 0.6, sz * 0.8, Math.floor(r() * 24), TILE.stone, r(), r());
        place(rub, q, (r() - 0.5) * 1.2, sz * 0.22, (r() - 0.5) * 0.9, r() * 6, color);
      }
      const m = new THREE.Mesh(rub.geometry(), mats.stone);
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
    if (family === 'metal' || family === 'wood') place(paint, box, 0, 0.11, 0, 0.3, family === 'metal' ? new THREE.Color(0.62, 0.08, 0.06) : new THREE.Color(0.1, 0.22, 0.5));
    [[zinc, mats.zinc], [mortar, mats.mortar], [paint, mats.paint], [wood, mats.planks]].forEach(function (bm) {
      if (!bm[0].vcount) return;
      const m = new THREE.Mesh(bm[0].geometry(), bm[1]);
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    });
  }

  // Мусор стройки у цоколя: обломки кладки и сколы цвета материалов здания полосой 0,3–2 м от фундамента
  // (чаще у углов), несколько обрезков доски. Лежат на земле, рабочие ходят сквозь — как трава.
  function rubble(w, r) {
    const fp = w.level.footprint;
    if (!fp) return;
    const x0 = fp.minX * CELL, x1 = (fp.maxX + 1) * CELL, z0 = fp.minZ * CELL, z1 = (fp.maxZ + 1) * CELL;
    const ids = [];
    w.level.blocks.forEach(function (b) { if (b.y <= 1 && b.glassOf === undefined && ids.indexOf(b.materialId) < 0) ids.push(b.materialId); });
    if (!ids.length) return;
    const batch = new Batch(), wood = new Batch();
    const per = Math.round(((x1 - x0) + (z1 - z0)) * 6);
    for (let i = 0; i < per; i++) {
      const side = Math.floor(r() * 4), t = r();
      const off = 0.3 + Math.pow(r(), 1.8) * 1.7;
      let x, z;
      if (side === 0) { x = x0 + t * (x1 - x0); z = z0 - off; }
      else if (side === 1) { x = x0 + t * (x1 - x0); z = z1 + off; }
      else if (side === 2) { x = x0 - off; z = z0 + t * (z1 - z0); }
      else { x = x1 + off; z = z0 + t * (z1 - z0); }
      const id = ids[Math.floor(r() * ids.length)];
      const fam = familyOf(MB, id);
      if (fam === 'wood' || r() < 0.06) {
        const len = 0.25 + r() * 0.5;
        const g = boxUV(roundedBox(0.09 + r() * 0.06, 0.02, len, 0.004, 2), TILE.planks[0], TILE.planks[1], r(), r());
        _q.setFromEuler(_e.set((r() - 0.5) * 0.1, r() * 6.28, (r() - 0.5) * 0.1));
        _m.compose(_p.set(x, 0.012, z), _q, _s.set(1, 1, 1));
        wood.add(g, _m, null);
        continue;
      }
      const sz = 0.03 + Math.pow(r(), 2) * 0.12;
      const q = stone(sz, sz * (0.5 + r() * 0.3), sz * (0.7 + r() * 0.4), Math.floor(r() * 24), TILE.stone, r(), r());
      _q.setFromEuler(_e.set((r() - 0.5) * 0.6, r() * 6.28, (r() - 0.5) * 0.6));
      _m.compose(_p.set(x, sz * 0.18, z), _q, _s.set(1, 1, 1));
      batch.add(q, _m, rockTint(MB, id));
    }
    const m = new THREE.Mesh(batch.geometry(), mats.stone);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    if (wood.vcount) {
      const mw = new THREE.Mesh(wood.geometry(), mats.planks);
      mw.castShadow = mw.receiveShadow = true;
      group.add(mw);
    }
  }

  // Стол планирования у дома рабочего: столешница на козлах, развёрнутый чертёж, камень-прижим.
  function desk(cell) {
    const g = new THREE.Group();
    const x = (cell[0] + 0.5) * CELL, z = (cell[2] + 0.5) * CELL;
    const top = new THREE.Mesh(new THREE.BufferGeometry(), mats.planks);
    const b = new Batch();
    _m.compose(_p.set(0, 0.86, 0), _q.identity(), _s.set(1, 1, 1));
    b.add(deskTop, _m, null);
    [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]].forEach(function (l) {
      _m.compose(_p.set(l[0], 0.42, l[1]), _q.identity(), _s.set(1, 1, 1));
      b.add(deskLeg, _m, null);
    });
    top.geometry = b.geometry();
    top.castShadow = top.receiveShadow = true;
    g.add(top);
    const sheet = new THREE.PlaneGeometry(0.9, 0.6);
    sheet.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(sheet.attributes.position.count * 3).fill(1), 3));
    const plan = new THREE.Mesh(sheet, mats.blueprint || new THREE.MeshStandardMaterial({ color: 0x8fb3d6, roughness: 0.9 }));
    plan.rotation.x = -Math.PI / 2;
    plan.rotation.z = 0.08;
    plan.position.set(0, 0.89, 0);
    plan.receiveShadow = true;
    g.add(plan);
    // рабочий у стола стоит в своей клетке лицом к +z (logic.js → plan: faceZ = homeCell + 1): стол — перед ним
    g.position.set(x, 0, z + 0.6);
    g.rotation.y = Math.PI;
    group.add(g);
  }

  function syncDesks() {
    if (!world) return;
    world.builders.forEach(function (bld) {
      if (bld.trade === 'engineer') return;
      const key = bld.homeCell.join(',');
      if (desks.has(key)) return;
      desks.add(key);
      desk(bld.homeCell);
    });
  }

  return { group, build, clear, update: syncDesks };
}
