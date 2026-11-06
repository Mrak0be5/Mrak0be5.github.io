// Пути рабочих: сетка 0,5 м на каждом этаже (слой 0 — земля и верх фундаментов, слой k — готовые перекрытия).
// Стены — преграды на рёбрах клеток здания (проёмы проходимы), переходы между слоями — готовые лестницы.
// Сетка выровнена по зданию: линии стен совпадают с границами клеток навигации.
import * as THREE from 'three';
import { GRID, STORY, PLINTH, STAIR } from './pieces.js?v=bb4fe98';

const C = 0.5;

// Двоичная куча для открытого списка A*: [приоритет, слой, i, j].
function heap() {
  const a = [];
  return {
    get size() { return a.length; },
    push(x) { a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; const t = a[p]; a[p] = a[i]; a[i] = t; i = p; } },
    pop() {
      const top = a[0], last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < a.length && a[l][0] < a[m][0]) m = l;
          if (r < a.length && a[r][0] < a[m][0]) m = r;
          if (m === i) break;
          const t = a[m]; a[m] = a[i]; a[i] = t; i = m;
        }
      }
      return top;
    },
  };
}

export function createNav(plan, extent, heightAt) {
  const half = Math.ceil(extent / C) * C;
  const ox = -half + (((plan.ox % C) + C) % C), oz = -half + (((plan.oz % C) + C) % C);
  const N = Math.round((2 * half) / C);
  const layers = plan.def.stories + 1;
  const walk = [];
  for (let l = 0; l < layers; l++) walk.push(new Uint8Array(N * N).fill(l === 0 ? 1 : 0));
  const blockX = [], blockZ = []; // запрет перехода (i,j)→(i+1,j) и (i,j)→(i,j+1)
  for (let l = 0; l < layers; l++) { blockX.push(new Uint8Array(N * N)); blockZ.push(new Uint8Array(N * N)); }
  const links = []; // лестницы: { from: [l,i,j], to: [l,i,j], points: [Vector3] }
  const floorY = new Float32Array(N * N); // высота слоя 0 (земля или верх фундамента)
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) floorY[j * N + i] = heightAt(ox + (i + 0.5) * C, oz + (j + 0.5) * C);

  function cellOf(x, z) { return [Math.floor((x - ox) / C), Math.floor((z - oz) / C)]; }
  function center(i, j) { return [ox + (i + 0.5) * C, oz + (j + 0.5) * C]; }
  function inside(i, j) { return i >= 0 && j >= 0 && i < N && j < N; }
  function layerY(l, i, j) { return l === 0 ? floorY[j * N + i] : PLINTH + l * STORY; }

  function block(x, z) { const c = cellOf(x, z); if (inside(c[0], c[1])) walk[0][c[1] * N + c[0]] = 0; }

  // Стена на ребре: запрет перехода через её линию, кроме проёма.
  function setWall(piece, openings, on) {
    const l = piece.type === 'parapet' ? piece.level : piece.level;
    if (l >= layers) return;
    const e = piece.edge;
    const L = GRID;
    const v = on ? 1 : 0;
    const openAt = function (xl) { return openings.some(function (o) { return o.y0 < 0.2 && xl > o.x0 + 0.05 && xl < o.x1 - 0.05; }); };
    if (e.axis === 'x') {
      const z = plan.oz + e.j * GRID;
      const jj = Math.round((z - oz) / C);
      for (let k = 0; k < L / C; k++) {
        const x = plan.ox + e.i * GRID + (k + 0.5) * C;
        const xl = piece.outward >= 0 ? x - (plan.ox + e.i * GRID) : plan.ox + (e.i + 1) * GRID - x;
        const ii = Math.floor((x - ox) / C);
        if (!inside(ii, jj - 1) || !inside(ii, jj)) continue;
        blockZ[l][(jj - 1) * N + ii] = openAt(xl) ? 0 : v;
      }
    } else {
      const x = plan.ox + e.i * GRID;
      const ii = Math.round((x - ox) / C);
      for (let k = 0; k < L / C; k++) {
        const z = plan.oz + e.j * GRID + (k + 0.5) * C;
        const xl = piece.outward < 0 ? z - (plan.oz + e.j * GRID) : plan.oz + (e.j + 1) * GRID - z;
        const jj = Math.floor((z - oz) / C);
        if (!inside(ii - 1, jj) || !inside(ii, jj)) continue;
        blockX[l][jj * N + ii - 1] = openAt(xl) ? 0 : v;
      }
    }
  }

  // Готовый фундамент — слой 0 на его верху; готовое перекрытие — слой этажа.
  function setFloor(piece, on) {
    const cx = plan.ox + piece.cell[0] * GRID, cz = plan.oz + piece.cell[1] * GRID;
    for (let a = 0; a < GRID / C; a++) for (let b = 0; b < GRID / C; b++) {
      const c = cellOf(cx + (a + 0.5) * C, cz + (b + 0.5) * C);
      if (!inside(c[0], c[1])) continue;
      if (piece.type === 'foundation') floorY[c[1] * N + c[0]] = on ? PLINTH : heightAt(cx + (a + 0.5) * C, cz + (b + 0.5) * C);
      else if (piece.level < layers) walk[piece.level][c[1] * N + c[0]] = on ? 1 : 0;
    }
  }

  function setStairs(piece, frame) {
    const loc = [[0.775, 0, -0.15], [0.775, 0, 0.2], [0.775, STORY / 2, STAIR.landing[0]], [1.5, STORY / 2, 2.6], [2.225, STORY / 2, STAIR.landing[0]], [2.225, STORY, 0.2], [2.225, STORY, -0.15]];
    const pts = loc.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(frame); });
    const a = cellOf(pts[0].x, pts[0].z), b = cellOf(pts[pts.length - 1].x, pts[pts.length - 1].z);
    links.push({ from: [piece.level, a[0], a[1]], to: [piece.level + 1, b[0], b[1]], points: pts });
    // площадь лестницы на нижнем этаже непроходима (кроме входа)
    const cx = plan.ox + piece.cell[0] * GRID, cz = plan.oz + piece.cell[1] * GRID;
    for (let q = 0; q < GRID / C; q++) for (let w = 0; w < GRID / C; w++) {
      const c = cellOf(cx + (q + 0.5) * C, cz + (w + 0.5) * C);
      if (inside(c[0], c[1]) && piece.level === 0) walk[0][c[1] * N + c[0]] = 0;
    }
  }

  function passable(l, i, j, ni, nj) {
    if (!inside(ni, nj) || !walk[l][nj * N + ni]) return false;
    const di = ni - i, dj = nj - j;
    if (di !== 0 && dj !== 0) return passable(l, i, j, ni, j) && passable(l, i, j, i, nj) && passable(l, ni, j, ni, nj) && passable(l, i, nj, ni, nj);
    if (di === 1) return !blockX[l][j * N + i];
    if (di === -1) return !blockX[l][j * N + ni];
    if (dj === 1) return !blockZ[l][j * N + i];
    if (dj === -1) return !blockZ[l][nj * N + i];
    return true;
  }

  // Ближайшая проходимая клетка слоя у точки (для стоянки у детали).
  function nearestWalkable(l, x, z, maxR = 6) {
    const c = cellOf(x, z);
    for (let r = 0; r <= maxR; r++) {
      let best = null, bd = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = c[0] + di, j = c[1] + dj;
        if (!inside(i, j) || !walk[l][j * N + i]) continue;
        const p = center(i, j);
        const d = Math.hypot(p[0] - x, p[1] - z);
        if (d < bd) { bd = d; best = [i, j]; }
      }
      if (best) return best;
    }
    return null;
  }

  // A* по слоям; возвращает точки мира (с высотой) или null.
  function find(from, to) {
    const start = [from.l].concat(nearestWalkable(from.l, from.x, from.z) || []);
    const goal = [to.l].concat(nearestWalkable(to.l, to.x, to.z) || []);
    if (start.length < 3 || goal.length < 3) return null;
    const key = function (l, i, j) { return (l * N + j) * N + i; };
    const open = heap();
    open.push([0, start[0], start[1], start[2]]);
    const g = new Map(), came = new Map();
    g.set(key(start[0], start[1], start[2]), 0);
    const h = function (l, i, j) { return Math.hypot(i - goal[1], j - goal[2]) + Math.abs(l - goal[0]) * 4; };
    let found = null, iter = 0, near = null, nearH = 1e9;
    const closed = new Set();
    while (open.size && iter++ < 80000) {
      const cur = open.pop();
      const l = cur[1], i = cur[2], j = cur[3];
      const ck = key(l, i, j);
      if (closed.has(ck)) continue;
      closed.add(ck);
      const hh = l === goal[0] ? Math.hypot(i - goal[1], j - goal[2]) : 1e9;
      if (hh < nearH) { nearH = hh; near = ck; }
      if (l === goal[0] && i === goal[1] && j === goal[2]) { found = ck; break; }
      const gc = g.get(ck);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (!passable(l, i, j, ni, nj)) continue;
        const nk = key(l, ni, nj);
        const ng = gc + (di && dj ? 1.4142 : 1);
        if (ng < (g.has(nk) ? g.get(nk) : 1e9)) { g.set(nk, ng); came.set(nk, { k: ck, link: null }); open.push([ng + h(l, ni, nj), l, ni, nj]); }
      }
      links.forEach(function (lk) {
        [[lk.from, lk.to, false], [lk.to, lk.from, true]].forEach(function (pair) {
          const a = pair[0], b = pair[1];
          if (a[0] !== l || a[1] !== i || a[2] !== j) return;
          if (!walk[b[0]][b[2] * N + b[1]]) return;
          const nk = key(b[0], b[1], b[2]);
          const ng = gc + 12;
          if (ng < (g.has(nk) ? g.get(nk) : 1e9)) { g.set(nk, ng); came.set(nk, { k: ck, link: lk, rev: pair[2] }); open.push([ng + h(b[0], b[1], b[2]), b[0], b[1], b[2]]); }
        });
      });
    }
    // цель заперта — до ближайшей достижимой клетки, если она не дальше 2,5 м
    if (found === null) { if (near !== null && nearH * C <= 2.5) found = near; else return null; }
    const out = [];
    let k = found;
    while (k !== undefined) {
      const l = Math.floor(k / (N * N)), rem = k - l * N * N, j = Math.floor(rem / N), i = rem - j * N;
      const c = came.get(k);
      const p = center(i, j);
      out.push(new THREE.Vector3(p[0], layerY(l, i, j), p[1]));
      if (c && c.link) {
        const pts = c.rev ? c.link.points : c.link.points.slice().reverse();
        pts.forEach(function (q) { out.push(q.clone()); });
      }
      k = c ? c.k : undefined;
    }
    out.reverse();
    return smooth(out);
  }

  // Срезать углы: из точки сразу к дальней видимой (на одном уровне высоты).
  function smooth(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    let a = 0;
    while (a < pts.length - 1) {
      let b = pts.length - 1;
      for (; b > a + 1; b--) { if (Math.abs(pts[b].y - pts[a].y) < 0.01 && clear(pts[a], pts[b])) break; }
      out.push(pts[b]);
      a = b;
    }
    return out;
  }
  function clear(p, q) {
    const l = Math.max(0, Math.round((p.y - PLINTH) / STORY));
    const steps = Math.ceil(p.distanceTo(q) / (C * 0.35));
    let pc = cellOf(p.x, p.z);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const c = cellOf(p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t);
      if (c[0] !== pc[0] || c[1] !== pc[1]) {
        const lay = p.y > PLINTH + STORY - 0.5 ? Math.min(layers - 1, l) : 0;
        if (!passable(lay, pc[0], pc[1], c[0], c[1])) return false;
        pc = c;
      }
    }
    return true;
  }

  function layerAt(y) { return y > PLINTH + STORY * 0.6 ? Math.min(layers - 1, Math.round((y - PLINTH) / STORY)) : 0; }
  function groundY(x, z) { const c = cellOf(x, z); return inside(c[0], c[1]) ? floorY[c[1] * N + c[0]] : heightAt(x, z); }

  return { find, setWall, setFloor, setStairs, block, nearestWalkable, center, layerAt, groundY, N, C };
}
