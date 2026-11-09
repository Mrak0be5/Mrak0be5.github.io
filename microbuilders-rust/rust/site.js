// Хозяйство площадки в реалистичном виде: карьер-подкова с уступами и плато (site-quarry.js), на плато — забор
// с сигнальной лентой, мачты освещения, башенный кран, городок бытовок и миниатюры прошлых строек; во дворе —
// техника компании, у въезда — самосвал и поддоны с блоками (site-props.js, site-crane.js, site-truck.js).
// Раскладка — формулы оригинала (site-layout.js: art/quarry.js, art/props.js, art/vehicles.js, game.js
// quarryCells), мир вида ×2. Модуль вида (scene.js → LOADERS): create(ctx) → { group, build(world), clear(),
// update(dt, info) }; heightAt(x, z) — высота карьера под точкой (м), debug() — раскладка для снимков.
// Неподвижное — одна слитая геометрия на материал; подвижное (поворотная часть крана, крюк, самосвал) — свои меши.
import * as THREE from 'three';
import { layout } from './site-layout.js?v=45127fe';
import { createKit, Pile, disposeTree } from './site-kit.js?v=45127fe';
import { buildQuarry } from './site-quarry.js?v=45127fe';
import { fence, masts, cabins, minis, machines, pallets } from './site-props.js?v=45127fe';
import { buildCrane } from './site-crane.js?v=45127fe';
import { buildTruck } from './site-truck.js?v=45127fe';
import { buildAmbient } from './site-ambient.js?v=45127fe';
import { familyOf, familyMaterial, familyTile, tintOf } from './families.js?v=45127fe';

export function create(ctx) {
  const group = new THREE.Group();
  group.name = 'site';
  const kit = createKit(ctx);
  const B = ctx.B;
  // материал кладки семейства (общий с двором и зданием)
  const family = function (fam) { return familyMaterial(ctx.mats, fam); };
  family.tile = familyTile;
  let built = null, blink = 0, lastError = null;
  const timings = {};

  // Ошибка сборки одной площадки не выключает модуль (scene.js fail() выключил бы его до перезагрузки): площадка
  // остаётся без хозяйства, следующая собирается заново; ошибка — в debug() и консоли.
  function build(world) {
    clear();
    if (!world || !world.level) return;
    try { buildSite(world); lastError = null; } catch (e) {
      lastError = String((e && e.stack) || e);
      console.error('site: площадка не собрана', e);
      clear();
    }
  }
  function buildSite(world) {
    const t0 = performance.now();
    const MB = B.MB;
    const lay = layout(world, B.campaign, B.meta, MB, window.MicroBuildersMeta);
    const quarry = buildQuarry(kit, ctx, lay, MB);
    group.add(quarry.group);
    const t1 = performance.now();
    const h = quarry.heightAt;
    const P = new Pile(kit);
    // грязь от земли под предметом: на плато — пыль у низа, техника и поддоны во дворе — по колёса в грязи
    P.ground = h;
    P.mudK = 0.35;
    fence(P, kit, lay, h);
    masts(P, kit, lay, h);
    cabins(P, kit, lay, h);
    P.mudK = 0;
    minis(P, kit, lay, MB);
    P.mudK = 1;
    machines(P, kit, lay, h);
    P.mudK = 0.55;
    pallets(P, kit, lay, MB, h);
    P.mudK = 0.4;
    const crane = buildCrane(P, kit, lay, h, family);
    const still = P.build(family);
    still.name = 'site-static';
    group.add(still, crane.group);
    const truck = buildTruck(kit, lay, MB, family, familyOf, tintOf, h);
    group.add(truck.group);
    const ambient = buildAmbient(kit, ctx, lay, quarry);
    group.add(ambient.group);
    ctx.linkSkyTree(group);
    built = { lay: lay, quarry: quarry, crane: crane, truck: truck, ambient: ambient };
    // лес вида (nature.js, группа 'forest') строится раз на запуск по кругу поляны: деревья и кусты, что попали
    // в след карьера (плато с хозяйством на больших площадках уходит за 120 м), — убрать до следующей площадки
    cutNature(ctx.scene ? [ctx.scene.getObjectByName('forest')] : [], quarry.covers);
    timings.quarry = Math.round(t1 - t0);
    timings.props = Math.round(performance.now() - t1);
  }

  // Экземпляры леса в следе карьера — в ноль (матрица без масштаба); исходные матрицы — у себя, до clear().
  const cut = [];
  let cutCount = 0;
  function restoreNature() {
    cut.forEach(function (c) { c.mesh.instanceMatrix.array.set(c.orig); c.mesh.instanceMatrix.needsUpdate = true; });
    cut.length = 0;
    cutCount = 0;
  }
  const _w = new THREE.Vector3();
  function cutNature(roots, covers) {
    roots.forEach(function (root) {
      if (!root) return;
      root.updateMatrixWorld(true);
      root.traverse(function (o) {
        if (!o.isInstancedMesh) return;
        const a = o.instanceMatrix.array;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const top = o.geometry.boundingBox.max.y;
        let rec = null;
        for (let i = 0; i < o.count; i++) {
          _w.set(a[i * 16 + 12], a[i * 16 + 13], a[i * 16 + 14]).applyMatrix4(o.matrixWorld);
          // запас — крона: ~0,22 высоты экземпляра (ось y матрицы), не меньше 1,5 м
          const sy = Math.hypot(a[i * 16 + 4], a[i * 16 + 5], a[i * 16 + 6]);
          if (!covers(_w.x, _w.z, Math.max(1.5, Math.min(4, 0.22 * sy * top)))) continue;
          if (!rec) { rec = { mesh: o, orig: a.slice() }; cut.push(rec); }
          for (let k = 0; k < 12; k++) a[i * 16 + k] = 0;
          cutCount++;
        }
        if (rec) o.instanceMatrix.needsUpdate = true;
      });
    });
    if (cutCount && ctx.markGI) ctx.markGI();
  }

  function clear() {
    restoreNature();
    if (built) { built.crane.dispose(); built.truck.dispose(); }
    group.children.slice().forEach(function (o) { group.remove(o); disposeTree(o); });
    built = null;
  }

  function update(dt, info) {
    if (!built || info.mode !== 'site') return;
    // кран стоит на паузе игры; самосвал — по часам оригинала (зеркало)
    built.crane.update(info.tempo > 0 ? dt : 0);
    built.truck.update(dt, info);
    built.ambient.update(dt, info);
    // прожекторы мачт и фары — в сумерки и ночью; красные огни крана мигают
    const on = THREE.MathUtils.smoothstep(info.night || 0, 0.3, 0.6);
    kit.own.lamp.emissiveIntensity = 22 * on;
    kit.own.winlit.emissiveIntensity = 5 * on;
    blink += dt;
    kit.own.redlamp.emissiveIntensity = (blink % 1.6 < 0.9 ? 9 : 1.5) * Math.max(on, 0.08);
  }

  // Раскладка для снимков и проверок (RustDebug.plugin('site').debug()).
  function debug() {
    if (!built) return lastError ? { error: lastError } : null;
    const L = built.lay, S = L.S;
    let calls = 0, tris = 0;
    group.traverse(function (o) {
      if (!o.isMesh || !o.geometry.index) return;
      calls++;
      tris += (o.geometry.index.count / 3) * (o.isInstancedMesh ? o.count : 1);
    });
    return { frame: [S.x0, S.x1, S.z0, S.z1], scale: S.scale, top: S.top, crane: [L.crane.x, L.crane.y, L.crane.z], cabins: [L.cabins.x, L.cabins.y, L.cabins.z],
      truck: [L.supply.truck.x, L.supply.truck.z], minis: L.minis.length, machines: L.machines.filter(function (m) { return m.tier <= L.tier; }).map(function (m) { return m.kind; }),
      meshes: calls, tris: Math.round(tris), timings: timings, hCrane: built.quarry.heightAt(L.crane.x * 2, L.crane.z * 2), ambient: built.ambient.state(),
      reach: built.quarry.reach, natureCut: cutCount, error: lastError };
  }

  return { group: group, build: build, clear: clear, update: update, debug: debug,
    heightAt: function (x, z) { return built ? built.quarry.heightAt(x, z) : 0; } };
}
