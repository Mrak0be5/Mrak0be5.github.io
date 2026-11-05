// Стройка: детали чертежа, их этапы (прутья → уровень), зависимости как в Rust (стены на фундаменте,
// перекрытие на каркасе стен, стены этажа на перекрытии, крыша на каркасе верхних стен), рабочие и их ходки:
// склад → взять ношу → дойти (по сетке путей, через двери и лестницы) → при надобности приставная лестница →
// уложить элементы по одному (молоток, мастерок, шуруповёрт) → назад. Монеты — за каждый элемент.
import * as THREE from 'three';
import { buildPiece, GRID, STORY, PLINTH, TIERS, TIER_NAMES } from './pieces.js?v=3ae8fc6';
import { BUILDINGS, planBuilding } from './blueprints.js?v=3ae8fc6';
import { createNav } from './nav.js?v=3ae8fc6';
import { createYard, ladder } from './props.js?v=3ae8fc6';
import { animateWorker } from './people.js?v=3ae8fc6';
import { ROOMS } from './materials.js?v=3ae8fc6';
import { rng } from './geo.js?v=3ae8fc6';

const VALUE = { sticks: 1, planks: 3, stones: 4, sheets: 9, plates: 14, box: 20 };
const CAP = { sticks: 6, planks: 6, stones: 6, sheets: 2, plates: 2, box: 1 };
const SPEED = { null: 1.5, sticks: 1.35, planks: 1.3, stones: 1.15, sheets: 1.1, plates: 1.0, box: 1.0 };
// время укладки одного элемента (с) на ×1 — короче, чем в pieces.js: прототип показывает темп стройки
const WORK_SCALE = 0.55;
const ACTION = { sticks: 'tie', planks: 'hammer', stones: 'lay', sheets: 'screw', plates: 'screw', box: 'hammer' };
export const UPGRADES = {
  crew: { name: 'Нанять рабочего', max: 8, base: 90, k: 1.5 },
  speed: { name: 'Инструмент получше', max: 8, base: 120, k: 1.6 },
  carry: { name: 'Тачки и ремни', max: 6, base: 100, k: 1.65 },
};

export function upgradeCost(kind, level) { const u = UPGRADES[kind]; return Math.round(u.base * Math.pow(u.k, level)); }

export function createSite(ctx) {
  const { scene, mats, terrain, factory } = ctx;
  const S = {
    index: 0, plan: null, built: [], nav: null, yard: null, group: null,
    coins: 0, earned: 0, workers: [], upgrades: { crew: 0, speed: 0, carry: 0 },
    done: false, total: 0, placed: 0, piecesDone: 0, events: [],
  };
  const r = rng(99);
  let ladderCache = {};

  function emit(type, data) {
    if (S.recordEvents) S.events.push(Object.assign({ type }, data || {}));
    if (ctx.onEvent) ctx.onEvent(type, data || {});
  }

  // ---------- здание ----------

  function start(index) {
    dispose();
    S.index = index % BUILDINGS.length;
    S.plan = planBuilding(BUILDINGS[S.index]);
    S.group = new THREE.Group();
    S.group.name = 'building';
    S.built = S.plan.pieces.map(function (p) {
      const b = buildPiece(p, mats);
      b.stage = 0; b.lock = null; b.done = false; b.framed = false; b.fail = 0;
      b.stages.forEach(function (st) { st.reveal(0); });
      S.group.add(b.group);
      return b;
    });
    S.total = S.built.reduce(function (s, b) { return s + b.stages.reduce(function (a, st) { return a + st.elements.length; }, 0); }, 0);
    S.placed = 0; S.piecesDone = 0; S.done = false;
    S.yard = createYard(S.plan, terrain, mats, 5 + S.index);
    S.group.add(S.yard.group);
    scene.add(S.group);
    S.nav = createNav(S.plan, 40, function (x, z) { return terrain.heightAt(x, z); });
    S.yard.blocked.forEach(function (c) {
      for (let dx = -c[2]; dx <= c[2]; dx += 0.25) for (let dz = -c[2]; dz <= c[2]; dz += 0.25) if (dx * dx + dz * dz <= c[2] * c[2]) S.nav.block(c[0] + dx, c[1] + dz);
    });
    S.byFoundation = {}; S.byWall = {}; S.byFloor = {}; S.byStairs = {};
    S.built.forEach(function (b) {
      const p = b.piece;
      if (p.type === 'foundation') S.byFoundation[p.cell.join(',')] = b;
      if (p.type === 'wall' || p.type === 'gable' || p.type === 'parapet') S.byWall[[p.type, p.edge.axis, p.edge.i, p.edge.j, p.level].join(',')] = b;
      if (p.type === 'floor') S.byFloor[p.cell.join(',') + ',' + p.level] = b;
      if (p.type === 'stairs') S.byStairs[p.cell.join(',') + ',' + p.level] = b;
    });
    // рабочие — к бытовке
    S.workers.forEach(function (w, i) { placeWorker(w, i); w.state = 'idle'; w.task = null; w.wait = 0.3 * i; });
    updateRooms();
    emit('start', { index: S.index, name: BUILDINGS[S.index].name });
  }

  function dispose() {
    if (S.group) {
      scene.remove(S.group);
      S.group.traverse(function (o) { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    }
    S.workers.forEach(function (w) { if (w.ladder && w.ladder.parent) w.ladder.parent.remove(w.ladder); w.ladderObj = null; });
    ladderCache = {};
    S.group = null;
  }

  function updateRooms() {
    const f = S.plan.footprint;
    const roofs = S.built.filter(function (b) { return b.piece.type === 'roof' || (b.piece.type === 'floor' && b.piece.roofFloor); });
    const k = roofs.length ? roofs.filter(function (b) { return b.done; }).length / roofs.length : 0;
    ROOMS.xz[0].set(f.x0 + 0.02, f.z0 + 0.02, f.x1 - 0.02, f.z1 - 0.02);
    ROOMS.y[0].set(0.2, S.plan.topY + 0.15, k * k);
    for (let i = 1; i < 6; i++) ROOMS.xz[i].set(0, 0, 0, 0);
  }

  // ---------- зависимости ----------

  const cellExists = function (i, j) { return i >= 0 && j >= 0 && i < S.plan.W && j < S.plan.D; };
  function foundationDone(i, j) { const b = S.byFoundation[i + ',' + j]; return !b || b.done; }
  function floorDone(i, j, l) { const b = S.byFloor[i + ',' + j + ',' + l]; return b ? b.done : false; }
  function stairsUnder(i, j, l) { const b = S.byStairs[i + ',' + j + ',' + (l - 1)]; return b ? b.done : false; }
  function adjacentCells(e) { return e.axis === 'x' ? [[e.i, e.j - 1], [e.i, e.j]] : [[e.i - 1, e.j], [e.i, e.j]]; }
  function wallFramed(type, e, l) { const b = S.byWall[[type, e.axis, e.i, e.j, l].join(',')]; return !b || b.framed; }

  function ready(b) {
    const p = b.piece;
    if (b.done || b.lock) return false;
    if (b.stage > 0) return true;
    if (p.type === 'foundation') return true;
    if (p.type === 'wall') {
      const cells = adjacentCells(p.edge).filter(function (c) { return cellExists(c[0], c[1]); });
      if (p.level === 0) return cells.every(function (c) { return foundationDone(c[0], c[1]); });
      const under = cells.some(function (c) { return floorDone(c[0], c[1], p.level) || stairsUnder(c[0], c[1], p.level); });
      return under && wallFramed('wall', p.edge, p.level - 1);
    }
    if (p.type === 'stairs') return p.level === 0 ? foundationDone(p.cell[0], p.cell[1]) : floorDone(p.cell[0], p.cell[1], p.level);
    if (p.type === 'floor') {
      return S.built.every(function (o) { return o.piece.type !== 'wall' || o.piece.level !== p.level - 1 || !o.piece.exterior || o.framed; });
    }
    if (p.type === 'gable') return wallFramed('wall', p.edge, p.level - 1);
    if (p.type === 'roof') {
      return S.built.every(function (o) {
        const q = o.piece;
        if (q.type === 'gable') return o.framed;
        if (q.type === 'wall' && q.level === S.plan.def.stories - 1 && q.exterior) return o.framed;
        return true;
      });
    }
    if (p.type === 'parapet') {
      return adjacentCells(p.edge).some(function (c) { return cellExists(c[0], c[1]) && floorDone(c[0], c[1], p.level); });
    }
    return true;
  }

  function rank(b) { return b.piece.level * 10 + b.piece.order + (b.stage > 0 ? 0.5 : 0); }

  // ---------- где стоять у элемента ----------

  const _v = new THREE.Vector3();
  function standFor(b, el, w) {
    const p = b.piece;
    const out = { layer: 0, x: 0, z: 0, y: 0, ladder: null, face: el.pos };
    if (p.type === 'wall' || p.type === 'gable' || p.type === 'parapet') {
      const lx = Math.min(2.6, Math.max(0.4, el.local.x));
      const side = p.exterior ? 1 : (w && w.side) || 1;
      _v.set(lx, 0, side * 0.8).applyMatrix4(p.frame);
      if (p.exterior) {
        out.layer = 0; out.x = _v.x; out.z = _v.z;
        const gy = S.nav.groundY(_v.x, _v.z);
        out.y = gy;
        const need = el.pos.y - gy;
        if (need > 1.75) {
          const base = new THREE.Vector3(lx, 0, 1.05).applyMatrix4(p.frame); base.y = gy;
          const top = new THREE.Vector3(lx, 0, 0.32).applyMatrix4(p.frame); top.y = el.pos.y + 0.6;
          out.ladder = { base, top, stand: el.pos.y - 1.35 };
        }
      } else {
        out.layer = p.level; out.x = _v.x; out.z = _v.z; out.y = PLINTH + p.level * STORY;
        if (el.pos.y - out.y > 1.8) {
          const base = new THREE.Vector3(lx, 0, side * 0.9).applyMatrix4(p.frame); base.y = out.y;
          const top = new THREE.Vector3(lx, 0, side * 0.22).applyMatrix4(p.frame); top.y = el.pos.y + 0.6;
          out.ladder = { base, top, stand: el.pos.y - 1.35 };
        }
      }
    } else if (p.type === 'foundation') {
      const cx = p.frame.elements[12] + GRID / 2, cz = p.frame.elements[14] + GRID / 2;
      const dx = el.pos.x - cx, dz = el.pos.z - cz;
      const l = Math.hypot(dx, dz) || 1;
      out.x = el.pos.x + (dx / l) * 0.7; out.z = el.pos.z + (dz / l) * 0.7;
      out.y = S.nav.groundY(out.x, out.z);
    } else if (p.type === 'floor') {
      out.layer = p.level - 1; out.x = el.pos.x; out.z = el.pos.z;
      out.y = out.layer === 0 ? PLINTH : PLINTH + out.layer * STORY;
      const need = el.pos.y - out.y;
      if (need > 1.9) out.ladder = { base: new THREE.Vector3(el.pos.x + 0.45, out.y, el.pos.z), top: new THREE.Vector3(el.pos.x + 0.12, el.pos.y, el.pos.z), stand: el.pos.y - 1.85 };
    } else if (p.type === 'roof') {
      const lx = Math.min(p.roof.x0 + p.roof.len - 0.4, Math.max(p.roof.x0 + 0.4, el.local.x));
      const base = new THREE.Vector3(lx, -0.6, -0.4).applyMatrix4(p.frame);
      const eave = new THREE.Vector3(lx, 0.25, 0.05).applyMatrix4(p.frame);
      const gy = S.nav.groundY(base.x, base.z);
      base.y = gy;
      out.x = base.x; out.z = base.z; out.y = gy;
      const onRoof = new THREE.Vector3(lx, Math.max(0.35, el.local.y - 0.55), 0.05).applyMatrix4(p.frame);
      out.ladder = { base, top: eave.clone().add(new THREE.Vector3(0, 0.5, 0)), stand: eave.y - 0.15, roof: onRoof };
    } else if (p.type === 'stairs') {
      out.layer = p.level; out.y = PLINTH + p.level * STORY;
      out.x = el.pos.x; out.z = el.pos.z;
      if (el.pos.y - out.y > 1.7) out.ladder = { base: new THREE.Vector3(el.pos.x, out.y, el.pos.z + 0.4), top: new THREE.Vector3(el.pos.x, el.pos.y + 0.5, el.pos.z + 0.1), stand: el.pos.y - 1.3 };
    }
    return out;
  }

  // ---------- рабочие ----------

  function placeWorker(w, i) {
    const c = S.yard.center;
    const a = i * 2.39;
    w.pos.set(c.x + 4.2 + Math.cos(a) * 1.6, 0, c.z - 2.2 + Math.sin(a) * 1.2);
    w.pos.y = S.nav.groundY(w.pos.x, w.pos.z);
    w.heading = r() * Math.PI * 2;
    w.setCarry(null);
    w.climbing = false;
    w.onLadder = 0;
  }

  function addWorker() {
    const w = factory.create(1000 + S.workers.length * 7919, mats);
    w.id = S.workers.length;
    w.pos = new THREE.Vector3();
    w.state = 'idle'; w.task = null; w.wait = 0;
    w.path = null; w.pathI = 0;
    scene.add(w.group);
    S.workers.push(w);
    if (S.plan) placeWorker(w, w.id);
    return w;
  }

  function capacity(kind) {
    const c = CAP[kind] || 1;
    const up = S.upgrades.carry;
    return kind === 'sheets' || kind === 'plates' || kind === 'box' ? c + Math.floor(up / 2) : c + up;
  }

  function workSpeed() { return Math.pow(1.18, S.upgrades.speed) / WORK_SCALE; }

  function pickTask(w) {
    let best = null, bestScore = 1e9;
    for (let i = 0; i < S.built.length; i++) {
      const b = S.built[i];
      if (b.fail > 0 || !ready(b)) continue;
      const st = b.stages[b.stage];
      const el = st.elements[st.revealed];
      if (!el) continue;
      const score = rank(b) * 100 + el.pos.distanceTo(w.pos) * 0.5;
      if (score < bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  function goTo(w, target, layer, then) {
    const from = { l: S.nav.layerAt(w.pos.y), x: w.pos.x, z: w.pos.z };
    const path = S.nav.find(from, { l: layer, x: target.x, z: target.z });
    if (!path) return false;
    path.push(new THREE.Vector3(target.x, target.y, target.z));
    w.path = path; w.pathI = 0; w.then = then;
    w.state = 'walk';
    return true;
  }

  function beginTrip(w, b) {
    const st = b.stages[b.stage];
    const kind = st.carry;
    const left = st.elements.length - st.revealed;
    b.lock = w.id;
    w.task = { b, kind, count: Math.min(capacity(kind), left) };
    const spot = S.yard.stacks[kind] || S.yard.stacks.planks;
    const tgt = new THREE.Vector3(spot.x, S.nav.groundY(spot.x, spot.z), spot.z);
    if (!goTo(w, tgt, 0, 'pickup')) { release(w, true); }
  }

  function release(w, failed) {
    if (w.task && w.task.b.lock === w.id) {
      w.task.b.lock = null;
      if (failed) w.task.b.fail = 6;
    }
    w.task = null;
    w.setCarry(null);
    w.state = 'idle';
    w.wait = 0.5;
  }

  function nextElement(w) {
    const b = w.task.b;
    const st = b.stages[b.stage];
    return st.elements[st.revealed];
  }

  function headToWork(w) {
    const el = nextElement(w);
    if (!el) { finishTrip(w); return; }
    const s = standFor(w.task.b, el, w);
    w.stand = s;
    const tgt = s.ladder ? s.ladder.base : new THREE.Vector3(s.x, s.y, s.z);
    if (!goTo(w, tgt, s.layer, 'arrive')) {
      // изнутри стена не достаётся — с другой стороны
      if (!w.task.b.piece.exterior && w.side !== -1) { w.side = -1; headToWork(w); return; }
      release(w, true);
    }
  }

  function finishTrip(w) {
    const b = w.task.b;
    const st = b.stages[b.stage];
    w.setCarry(null);
    if (w.onLadder > 0.01) { w.state = 'descend'; return; }
    hideLadder(w);
    if (st.revealed < st.elements.length && !b.done) { beginTrip(w, b); return; }
    b.lock = null;
    w.task = null;
    w.state = 'idle';
    w.wait = 0.2;
  }

  function getLadder(len) {
    const key = Math.round(len * 2) / 2;
    return ladder(Math.max(2.0, key), mats);
  }
  function showLadder(w, L) {
    hideLadder(w);
    const len = L.base.distanceTo(L.top);
    const obj = getLadder(len);
    obj.position.copy(L.base);
    const dir = L.top.clone().sub(L.base).normalize();
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    S.group.add(obj);
    w.ladderObj = obj;
  }
  function hideLadder(w) { if (w.ladderObj) { w.ladderObj.parent && w.ladderObj.parent.remove(w.ladderObj); w.ladderObj.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); w.ladderObj = null; } }

  function placeElement(w) {
    const b = w.task.b;
    const st = b.stages[b.stage];
    st.reveal(st.revealed + 1);
    S.placed++;
    const gain = Math.round((VALUE[st.carry] || 2) * (1 + TIERS.indexOf(b.piece.tier) * 0.35));
    S.coins += gain; S.earned += gain;
    emit('place', { gain, kind: st.carry, pos: st.elements[st.revealed - 1].pos, action: w.anim.action });
    w.task.count--;
    if (st.carry && w.carryKind) w.setCarry(w.task.count > 0 ? st.carry : null, w.task.count);
    if (st.done) stageDone(b);
  }

  function stageDone(b) {
    const st = b.stages[b.stage];
    if (b.stage === 0) {
      b.framed = true;
      if (b.piece.type === 'wall' || b.piece.type === 'gable' || b.piece.type === 'parapet') S.nav.setWall(b.piece, b.openings || [], true);
    }
    if (b.stage < b.stages.length - 1) { b.stage++; return; }
    b.done = true;
    if (b.stages.length > 1) b.stages[0].hide();
    S.piecesDone++;
    const p = b.piece;
    if (p.type === 'foundation' || p.type === 'floor') S.nav.setFloor(p, true);
    if (p.type === 'stairs') S.nav.setStairs(p, p.frame);
    const gain = 10 * (1 + TIERS.indexOf(p.tier));
    S.coins += gain; S.earned += gain;
    emit('piece', { piece: p, gain, name: pieceName(p) });
    S.built.forEach(function (o) { o.fail = 0; });
    if (p.type === 'roof' || p.roofFloor) updateRooms();
    if (S.piecesDone === S.built.length) {
      S.done = true;
      const bonus = 400 * (S.index + 1);
      S.coins += bonus; S.earned += bonus;
      emit('complete', { index: S.index, name: BUILDINGS[S.index].name, bonus });
      // стройка сдана: кто на лестнице — спускается, остальные отдыхают
      S.workers.forEach(function (w) {
        if (w.task && w.task.b.lock === w.id) w.task.b.lock = null;
        w.task = null; w.resume = false;
        if (w.onLadder > 0.01 && w.stand && w.stand.ladder) { w.setCarry(null); w.state = 'descend'; }
        else if (w.state !== 'descend') { w.setCarry(null); w.state = 'idle'; w.wait = 1; }
      });
    }
  }

  function pieceName(p) {
    const n = { foundation: 'Фундамент', wall: p.opening === 'door' ? 'Дверной проём' : p.opening === 'window' ? 'Стена с окном' : p.opening === 'garage' ? 'Ворота' : 'Стена', floor: p.roofFloor ? 'Кровля' : 'Перекрытие', roof: 'Скат крыши', gable: 'Фронтон', stairs: 'Лестница', parapet: 'Парапет' }[p.type];
    return n + ' · ' + TIER_NAMES[p.tier];
  }

  // ---------- шаг ----------

  function stepWorker(w, dt) {
    const a = w.anim;
    a.speed = 0;
    if (w.state === 'idle') {
      a.action = 'idle';
      w.wait -= dt;
      if (w.wait <= 0 && !S.done) {
        const b = pickTask(w);
        if (b) { w.side = 1; beginTrip(w, b); } else w.wait = 0.6 + r() * 0.6;
      }
    } else if (w.state === 'walk') {
      const tgt = w.path[w.pathI];
      const dx = tgt.x - w.pos.x, dz = tgt.z - w.pos.z, dy = tgt.y - w.pos.y;
      const d = Math.hypot(dx, dz);
      const sp = SPEED[w.carryKind] || 1.3;
      const step = sp * dt;
      if (d <= step || d < 0.02) {
        w.pos.set(tgt.x, tgt.y, tgt.z);
        w.pathI++;
        if (w.pathI >= w.path.length) { w.path = null; arrive(w); }
      } else {
        w.pos.x += (dx / d) * step; w.pos.z += (dz / d) * step;
        w.pos.y += dy * Math.min(1, step / Math.max(d, 0.001));
        turnTo(w, Math.atan2(dx, dz), dt);
        a.speed = sp;
      }
      a.action = 'walk';
    } else if (w.state === 'pickup') {
      a.action = 'pick';
      w.timer -= dt;
      if (w.timer <= 0) {
        w.setCarry(w.task.kind, w.task.count);
        headToWork(w);
      }
    } else if (w.state === 'climb' || w.state === 'descend') {
      const L = w.stand.ladder;
      const up = w.state === 'climb';
      const target = up ? Math.max(0, L.stand - L.base.y) : 0;
      const dir = Math.sign(target - w.onLadder);
      w.onLadder += dir * 0.55 * dt;
      a.action = 'climb';
      a.climb = w.onLadder;
      if ((dir >= 0 && w.onLadder >= target) || (dir < 0 && w.onLadder <= target)) {
        w.onLadder = target;
        if (up) {
          if (L.roof) { w.roofFrom = w.pos.clone(); w.state = 'roofwalk'; w.roofT = 0; }
          else beginWork(w);
        } else {
          hideLadder(w);
          w.pos.copy(L.base);
          if (w.resume && w.task) { w.resume = false; headToWork(w); }
          else if (w.task) finishTrip(w); else w.state = 'idle';
        }
      }
      if (L) {
        const t = THREE.MathUtils.clamp(w.onLadder / Math.max(0.1, L.top.y - L.base.y), 0, 1);
        const p = L.base.clone().lerp(L.top, t);
        const out = L.base.clone().sub(L.top); out.y = 0; out.normalize().multiplyScalar(0.28);
        w.pos.set(p.x + out.x, L.base.y + w.onLadder, p.z + out.z);
        turnTo(w, Math.atan2(-out.x, -out.z), dt * 3);
      }
    } else if (w.state === 'roofwalk') {
      const L = w.stand.ladder;
      w.roofT = Math.min(1, w.roofT + dt * 0.6);
      w.pos.copy(w.roofFrom).lerp(L.roof, w.roofT);
      a.speed = 0.8;
      a.action = 'walk';
      turnTo(w, Math.atan2(w.stand.face.x - w.pos.x, w.stand.face.z - w.pos.z), dt);
      if (w.roofT >= 1) beginWork(w);
    } else if (w.state === 'work') {
      const el = nextElement(w);
      if (!el) { finishTrip(w); return; }
      a.action = w.stand.ladder && !w.stand.ladder.roof && w.onLadder > 0.2 ? 'work-high' : (ACTION[w.task.kind] || 'hammer');
      if (el.objects && el.objects.length) a.action = 'hammer';
      if (el.pos.y - w.pos.y > 1.6 && !w.stand.ladder) a.action = 'work-high';
      turnTo(w, Math.atan2(el.pos.x - w.pos.x, el.pos.z - w.pos.z), dt);
      w.timer -= dt * workSpeed();
      if (w.timer <= 0) {
        placeElement(w);
        if (!w.task) return;
        const next = nextElement(w);
        if (w.task.count <= 0 || !next || w.task.b.done) {
          if (w.onLadder > 0.01) {
            if (w.stand.ladder && w.stand.ladder.roof) { w.pos.copy(w.stand.ladder.top); w.pos.y = w.stand.ladder.base.y + w.onLadder; }
            w.state = 'descend';
            w.setCarry(null);
          } else finishTrip(w);
          return;
        }
        // следующий элемент далеко — подойти (по крыше — пройти по скату)
        const s = standFor(w.task.b, next, w);
        if (s.ladder && s.ladder.roof && w.stand.ladder && w.stand.ladder.roof && Math.hypot(s.x - w.stand.x, s.z - w.stand.z) < 1.0) {
          if (s.ladder.roof.distanceTo(w.stand.ladder.roof) > 0.6) { s.ladder.top = w.stand.ladder.top; w.stand = s; w.roofFrom = w.pos.clone(); w.roofT = 0; w.state = 'roofwalk'; return; }
          w.timer = next.work;
          return;
        }
        const far = Math.hypot(s.x - w.stand.x, s.z - w.stand.z) > 1.0 || (!!s.ladder !== !!w.stand.ladder) || (s.ladder && w.stand.ladder && Math.abs(s.ladder.stand - w.stand.ladder.stand) > 0.5);
        if (far) {
          if (w.onLadder > 0.01) { w.state = 'descend'; w.resume = true; return; }
          w.stand = s;
          const tgt = s.ladder ? s.ladder.base : new THREE.Vector3(s.x, s.y, s.z);
          if (!goTo(w, tgt, s.layer, 'arrive')) release(w, true);
          return;
        }
        w.timer = next.work;
      }
    }
  }

  function beginWork(w) {
    const el = nextElement(w);
    if (!el) { finishTrip(w); return; }
    w.state = 'work';
    w.timer = el.work;
  }

  function arrive(w) {
    if (w.then === 'pickup') { w.state = 'pickup'; w.timer = 0.9; return; }
    const s = w.stand;
    if (s && s.ladder) {
      showLadder(w, s.ladder);
      w.onLadder = 0;
      w.state = 'climb';
      return;
    }
    beginWork(w);
  }

  function turnTo(w, target, dt) {
    let d = target - w.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    w.heading += d * Math.min(1, dt * 8);
  }

  function step(dt, time) {
    if (!S.plan) return;
    const n = Math.max(1, Math.ceil(dt / 0.05));
    const h = dt / n;
    for (let k = 0; k < n; k++) {
      S.workers.forEach(function (w) { stepWorker(w, h); });
      S.built.forEach(function (b) { if (b.fail > 0) b.fail -= h; });
    }
  }

  // Двери открываются, когда рядом рабочий.
  function updateDoors(dt) {
    S.built.forEach(function (b) {
      if (!b.doors.length) return;
      b.doors.forEach(function (d) {
        if (!d.pivot && !d.slats) return;
        const near = S.workers.some(function (w) { return Math.hypot(w.pos.x - d.world.x, w.pos.z - d.world.z) < 1.6 && Math.abs(w.pos.y - d.world.y) < 2; });
        d.target = near ? 1 : 0;
        const sp = d.kind === 'roll' ? 0.7 : 2.2;
        d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), sp * dt);
        if (d.kind === 'swing') d.pivot.rotation.y = d.open * 1.7;
        else if (d.update) d.update();
      });
    });
  }

  function render(dt, time) {
    S.workers.forEach(function (w) {
      w.group.position.copy(w.pos);
      w.group.rotation.y = w.heading;
      animateWorker(w, dt, time);
    });
    updateDoors(dt);
  }

  // ---------- команды ----------

  function buy(kind) {
    const lvl = S.upgrades[kind];
    if (lvl >= UPGRADES[kind].max) return false;
    const cost = upgradeCost(kind, lvl);
    if (S.coins < cost) return false;
    S.coins -= cost;
    S.upgrades[kind]++;
    if (kind === 'crew') addWorker();
    emit('upgrade', { kind, level: S.upgrades[kind] });
    return true;
  }

  // Отладка: мгновенно уложить долю здания (по порядку зависимостей).
  function jump(fraction) {
    const list = S.built.slice().sort(function (a, b) { return rank(a) - rank(b) || a.piece.id - b.piece.id; });
    const n = Math.round(list.length * fraction);
    list.slice(0, n).forEach(function (b) {
      while (!b.done) {
        const st = b.stages[b.stage];
        S.placed += st.elements.length - st.revealed;
        st.reveal(st.elements.length);
        stageDone(b);
      }
    });
  }

  return {
    S, start, step, render, buy, addWorker, jump, standFor, upgradeCost,
    progress: function () { return { placed: S.placed, total: S.total, pieces: S.piecesDone, totalPieces: S.built.length }; },
  };
}
