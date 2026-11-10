// Поддоны, которые кран (site-crane.js) поставил на настилы лесов: стоят у каменщиков и убывают сверху — по укладке
// рядом того же материала (события логики pour/place) и со временем (не дольше 40 с игры). Взяли всё — пустой
// деревянный поддон ещё стоит EMPTY с, потом оседает и тает (FADE с); вышло время с остатком груза — оседает и
// тает сразу. Первые HOLD с после посадки поддон не трогают: на нём ещё траверса, крановщик отцепляет. Снят
// настил (леса разобрали), в клетку поддона пошла кладка — поддон убирается сразу. Все поставленные поддоны — одна
// куча (по мешу на материал), пересборка — когда что-то поменялось; тающий — свой меш на FADE с.
// Другим модулям (например, «Запас у места работы»; через site.js — RustDebug.plugin('site')):
//   list() — поставленные поддоны (поля — info ниже); consume(id, n) — взять n единиц груза сверху (→ осталось,
//   −1 — нет такого); claim(true[, reach[, keep]]) — убылью управляет другой модуль (своя убыль по укладке и времени
//   выключается, поддон исчезает, когда взято всё, или через keep с игры после готовности — по умолчанию 90; ненужный
//   модуль снимает сам — expire(id): оседает и тает с грузом, или возвращает крану — recall(id): кран забирает его на
//   склад, site-crane.js → recalled(), lift(id)); reach — в скольких м от точки
//   стойки каменщика его модуль берёт с поддона крана (по умолчанию 1,25 — кран ставит поддон в клетку, откуда кладут);
//   on(fn) — слушать события.
// События (одни и те же — слушателям on(fn) сразу и в эффекты модулей ctx.B.fx → call(name, [arg]) в следующем
// кадре): 'craneDelivery' — поставил (arg — info, ready: false), 'craneReady' — траверса снята, можно брать (info),
// 'craneUpdate' — после готовности убыло (consume, укладка рядом, время; arg — info: left, top, next, unit),
// 'craneCleared' — убран для других модулей ({ id, why: 'used' | 'deck' | 'site' }): пуст, вышло время, настил
// сняли, смена площадки. Пустой поддон после 'craneCleared' ещё виден (EMPTY с), но в list() его уже нет.
import * as THREE from 'three';
import { Pile, M } from './site-kit.js?v=ff29707';
import { putCargo, cargoTop } from './cr-cargo.js?v=ff29707';
import { familyOf } from './families.js?v=ff29707';

// пауза до начала расхода (с игры): посадка → отцепка траверсы (цепи ослаблены 2 с, траверса вверх на 0,6 м — ~1,8 с)
export const HOLD = 4;
// пустой поддон стоит (с игры), потом оседает и тает (с)
export const EMPTY = 20, FADE = 0.6;

export function createStock(kit, ctx, family, MB) {
  const group = new THREE.Group();
  group.name = 'crane-stock';
  const pallets = [];
  const listeners = [];
  // тающие: { mesh, k } — свой меш, оседает и сжимается
  const fading = [];
  // keep — сколько с игры после готовности ждёт поддон, пока убылью ведёт другой модуль (claim(true, reach, keep))
  let planner = null, seq = 0, claimed = false, reach = 0, keep = 90, dirty = false, clock = 0, built = null;

  function bind(w, p) { planner = p; }
  const r2 = function (v) { return Math.round(v * 1000) / 1000; };
  // Поддон для других модулей. x, y, z — середина низа поддона (м вида), yaw — поворот (длинная сторона — вдоль
  // оси x поддона), side — от середины клетки настила к поддону (наружу: рабочим — другая половина клетки),
  // top — верх груза (м вида), next — середина верхней единицы груза (её берут следующей; null — пусто),
  // unit — её размер [w, h, d] (м, в осях поддона), ready — можно брать, t — когда поставлен (с игры от сборки
  // площадки), age — сколько стоит (с игры), mason — номер рабочего (world.builders), к которому везли, blockId — деталь
  // логики, под кладку которой везли (null — нет).
  function info(p) {
    const u = p.left > 0 ? p.spec.units[p.left - 1] : null;
    const cs = Math.cos(p.yaw), sn = Math.sin(p.yaw);
    return { id: p.id, materialId: p.materialId, family: p.fam, deck: p.deck.id, cell: p.cell.slice(), x: r2(p.x), y: r2(p.y), z: r2(p.z),
      yaw: r2(p.yaw), side: p.side.slice(), left: p.left, total: p.total, ready: p.age >= HOLD, top: r2(p.y + cargoTop(p.spec, p.left)),
      next: u ? [r2(p.x + u.x * cs + u.z * sn), r2(p.y + u.y), r2(p.z - u.x * sn + u.z * cs)] : null, unit: u ? [u.w, u.h, u.d] : null,
      t: r2(p.t), age: r2(p.age), mason: p.mason, blockId: p.block ? p.block.id : null };
  }
  function emit(name, arg) {
    for (let i = 0; i < listeners.length; i++) { try { listeners[i]({ type: name, pallet: arg }); } catch (e) { console.error('crane stock:', e); } }
    if (ctx.B && ctx.B.fx) ctx.B.fx(name, [arg]);
  }
  function add(o) {
    const p = {
      id: 'crane-' + (++seq), spec: o.spec, total: o.spec.units.length, left: o.spec.units.length, used: 0,
      x: o.x, y: o.y, z: o.z, yaw: o.yaw, deck: o.deck, cell: [o.deck.x, o.deck.y, o.deck.z], side: o.side || [0, 0],
      materialId: o.materialId, fam: o.spec.fam, mason: o.mason === undefined ? null : o.mason, block: o.block || null,
      t: clock, age: 0, ready: false, drain: 0, life: 22 + ((seq * 7919) % 13), empty: -1,
    };
    pallets.push(p);
    dirty = true;
    emit('craneDelivery', info(p));
    return p;
  }
  // убрать сразу (настил сняли, смена площадки) или оседая (fade); пустой — сначала постоит (empty ≥ 0: уже убран
  // для других модулей)
  function remove(p, why, fade) {
    const i = pallets.indexOf(p);
    if (i < 0) return;
    pallets.splice(i, 1);
    dirty = true;
    if (p.empty < 0) emit('craneCleared', { id: p.id, why: why });
    if (fade) {
      const P = new Pile(kit);
      putCargo(P, kit, p.spec, new THREE.Matrix4(), p.left);
      const mesh = P.build(family);
      mesh.name = 'crane-stock-fade';
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = p.yaw;
      group.add(mesh);
      if (ctx.linkSkyTree) ctx.linkSkyTree(mesh);
      fading.push({ mesh: mesh, k: 1 });
    }
  }
  function live(p) { return p.empty < 0; }
  // Клетка поддона занята кладкой или настил снят.
  function gone(p) {
    if (!planner) return false;
    if (!planner.deckLive(p.deck)) return true;
    const b = planner.blockAt(p.cell[0], p.cell[1], p.cell[2]);
    return !!b && (b.built || b.poured > 0 || b.reserved);
  }
  // Осталось единиц: взятые (used: укладка рядом, consume) и убыль со временем после паузы (drain — пока убыль
  // своя: claim её останавливает, не возвращая взятое).
  function leftOf(p) { return Math.max(0, p.total - Math.floor(p.used + p.drain + 1e-9)); }
  function update(gdt, dt) {
    clock += gdt;
    for (let i = pallets.length - 1; i >= 0; i--) {
      const p = pallets[i];
      p.age += gdt;
      if (gone(p)) { remove(p, 'deck'); continue; }
      if (p.empty >= 0) {
        // пустой: постоит и уйдёт
        p.empty += gdt;
        if (p.empty > EMPTY) remove(p, 'used', true);
        continue;
      }
      if (!claimed && p.age >= HOLD) p.drain += gdt / p.life * p.total;
      if (!p.ready && p.age >= HOLD) { p.ready = true; emit('craneReady', info(p)); }
      setLeft(p, leftOf(p));
      if (p.left <= 0) { p.empty = 0; emit('craneCleared', { id: p.id, why: 'used' }); }
      else if (p.age - HOLD > (claimed ? keep : 40)) remove(p, 'used', true);
    }
    // тающие — по часам кадра dt (и на паузе не висят наполовину: доводятся)
    const fdt = dt === undefined ? gdt : dt;
    for (let i = fading.length - 1; i >= 0 && fdt > 0; i--) {
      const f = fading[i];
      f.k -= fdt / FADE;
      if (f.k <= 0) { group.remove(f.mesh); f.mesh.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); fading.splice(i, 1); continue; }
      const s = 0.6 + 0.4 * f.k;
      f.mesh.scale.set(s, f.k, s);
    }
    if (dirty) rebuild();
  }
  function setLeft(p, left) {
    if (left === p.left) return;
    p.left = left;
    dirty = true;
    if (p.ready && left > 0) emit('craneUpdate', info(p));
  }
  // Укладка рядом тем же материалом (ярус ±1, до 3 клеток) — каменщик берёт с поддона (когда траверса снята).
  function event(e) {
    if (claimed || !e || (e.type !== 'pour' && e.type !== 'place') || !e.block) return;
    const b = e.block;
    const fam = familyOf(MB, b.materialId);
    pallets.forEach(function (p) {
      if (p.age < HOLD || !live(p) || p.fam !== fam || Math.abs(b.y - p.cell[1]) > 1 || Math.max(Math.abs(b.x - p.cell[0]), Math.abs(b.z - p.cell[2])) > 3) return;
      p.used += 0.5;
    });
  }
  function rebuild() {
    dirty = false;
    if (built) { group.remove(built); built.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); built = null; }
    if (!pallets.length) return;
    const P = new Pile(kit);
    pallets.forEach(function (p) { putCargo(P, kit, p.spec, M(p.x, p.y, p.z, p.yaw), p.left); });
    built = P.build(family);
    built.name = 'crane-stock-pile';
    group.add(built);
    if (ctx.linkSkyTree) ctx.linkSkyTree(built);
  }
  function find(id) { for (let i = 0; i < pallets.length; i++) if (pallets[i].id === id) return pallets[i]; return null; }
  function consume(id, n) {
    const p = find(id);
    if (!p || !live(p)) return -1;
    p.used += n === undefined ? 1 : Math.max(0, n);
    setLeft(p, leftOf(p));
    return p.left;
  }
  // Снять поддон с грузом (никому не нужен — модуль запаса): оседает и тает, как по сроку.
  function expire(id) {
    const p = find(id);
    if (!p || !live(p)) return false;
    remove(p, 'stale', true);
    return true;
  }
  // Модуль запаса вернул поддон крану (с него никто не берёт): кран заберёт его на склад (site-crane.js → recalled,
  // lift); пока не застропили — стоит, как стоял (и с него можно брать).
  function recall(id) {
    const p = find(id);
    if (!p || !live(p)) return false;
    p.recall = true;
    return true;
  }
  // возвращённые крану, готовые (траверса снята): [{ info, deck, spec }]
  function recalled() {
    const out = [];
    pallets.forEach(function (p) { if (live(p) && p.recall && p.age >= HOLD) out.push({ info: info(p), deck: p.deck, spec: p.spec }); });
    return out;
  }
  // Кран застропил поддон на настиле: с настила — на крюк (без оседания). → { left, yaw } или null.
  function lift(id) {
    const p = find(id);
    if (!p || !live(p)) return null;
    const o = { left: p.left, yaw: p.yaw };
    remove(p, 'back', false);
    return o;
  }
  function near(x, y, z, r) {
    for (let i = 0; i < pallets.length; i++) {
      const p = pallets[i];
      if (Math.abs(p.y - y) < 0.5 && Math.hypot(p.x - x, p.z - z) < r) return true;
    }
    return false;
  }
  function dispose() {
    pallets.forEach(function (p) { if (live(p)) emit('craneCleared', { id: p.id, why: 'site' }); });
    pallets.length = 0;
    listeners.length = 0;
    if (built) { group.remove(built); built.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); built = null; }
    fading.forEach(function (f) { group.remove(f.mesh); f.mesh.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); });
    fading.length = 0;
  }
  return {
    group: group, bind: bind, add: add, update: update, event: event, near: near, dispose: dispose, consume: consume, expire: expire,
    recall: recall, recalled: recalled, lift: lift,
    // с грузом (пустые и тающие — не в счёт)
    count: function () { return pallets.filter(live).length; },
    list: function () { return pallets.filter(live).map(info); },
    get: function (id) { const p = find(id); return p && live(p) ? info(p) : null; },
    // для проверок: все поставленные, с пустыми ([id, left, empty с]) и тающие
    all: function () { return { pallets: pallets.map(function (p) { return [p.id, p.left, Math.round(p.empty * 10) / 10]; }), fading: fading.length }; },
    // r — с поддона крана берут в r м от точки стойки (кран ставит поддон в эту досягаемость; 0 — по умолчанию модуля
    // запаса, REACH 1,25 м)
    // k — сколько с поддон ждёт после готовности, пока захвачено (по умолчанию 90; модуль сам снимает ненужные — expire)
    claim: function (on, r, k) { claimed = !!on; if (r !== undefined) reach = +r || 0; if (k !== undefined) keep = +k || 90; return claimed; },
    reach: function () { return reach || undefined; },
    // сколько с игры поддон ждёт после готовности (потом тает): убылью ведёт другой модуль — дольше
    life: function () { return claimed ? Math.min(90, keep) : 40; },
    on: function (fn) { listeners.push(fn); return function () { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
  };
}
