"use strict";
// Autoplayer for balance runs (node sim) and ?bot=1 in the browser. Plays like a decent, not perfect, human.

const BOT = {
  skill: 1,          // 0..1: how well it reads telegraphs (reaction), lower = sloppier
  reaction: 0.25,    // seconds before it notices a new telegraph
  noticed: new WeakMap(),
  wander: 0,
  inputVector() {
    const v = { x: 0, y: 0 };
    const add = (x, y, w) => { v.x += x * w; v.y += y * w; };
    const now = G.t;
    // telegraphs: get out of anything that will fire soon
    let danger = 0;
    for (const t of G.tele) {
      if (!this.noticed.has(t)) this.noticed.set(t, now);
      if (now - this.noticed.get(t) < this.reaction * (2 - this.skill)) continue;
      if (!t.dmg) { if (t.shape !== "line") continue; }
      const urgency = 0.6 + clamp(t.t / t.dur, 0, 1);
      if (t.shape === "circle") {
        const dx = P.x - t.x, dy = (P.y - t.y) * 1.3, d = Math.hypot(dx, dy) || 0.01;
        if (d < t.r + 12) { add(dx / d, dy / d / 1.3, 6 * urgency); danger++; }
      } else if (t.shape === "band") {
        const dy = P.y - t.y;
        if (Math.abs(dy) < t.h / 2 + 10) { add(0, dy >= 0 ? 1 : -1, 6 * urgency); danger++; if (P.y < INSET.t + 20) add(0, 1, 6); if (P.y > AH - INSET.b - 20) add(0, -1, 6); }
      } else if (t.shape === "vband") {
        const dx = P.x - t.x;
        if (Math.abs(dx) < t.w / 2 + 10) { add(dx >= 0 ? 1 : -1, 0, 6 * urgency); danger++; if (P.x < INSET.l + 20) add(1, 0, 6); if (P.x > AW - INSET.r - 20) add(-1, 0, 6); }
      } else if (t.shape === "line") {
        const d = segDist(P.x, P.y, t.x1, t.y1, t.x2, t.y2);
        if (d < t.w / 2 + 14) {
          const lx = t.x2 - t.x1, ly = t.y2 - t.y1, l = Math.hypot(lx, ly) || 1, nx = -ly / l, ny = lx / l;
          const side = (P.x - t.x1) * nx + (P.y - t.y1) * ny >= 0 ? 1 : -1;
          add(nx * side, ny * side, 7 * urgency); danger++;
        }
      }
    }
    // charging yetis
    for (const e of G.enemies) if (e.state === "aim" || e.state === "dash") {
      const x2 = e.x + e.cdx * 110, y2 = e.y + e.cdy * 110;
      if (segDist(P.x, P.y, e.x, e.y, x2, y2) < 18) { const nx = -e.cdy, ny = e.cdx, side = (P.x - e.x) * nx + (P.y - e.y) * ny >= 0 ? 1 : -1; add(nx * side, ny * side, 4); }
    }
    for (const p of G.puddles) {
      const dx = P.x - p.x, dy = P.y - p.y, d = Math.hypot(dx / p.r, dy / (p.r * 0.6));
      if (d < 1.4) add(dx / (Math.hypot(dx, dy) || 1), dy / (Math.hypot(dx, dy) || 1), 3);
    }
    // bullets coming at us
    for (const s of G.shots) {
      const dx = P.x - s.x, dy = P.y - 8 - s.y, d = Math.hypot(dx, dy);
      if (d > 55) continue;
      const sp = Math.hypot(s.vx, s.vy) || 1, closing = (dx * s.vx + dy * s.vy) / (d * sp);
      if (closing < 0.6) continue;
      const nx = -s.vy / sp, ny = s.vx / sp, side = dx * nx + dy * ny >= 0 ? 1 : -1;
      add(nx * side, ny * side, 2.2 * this.skill * (1 - d / 60) + 0.3);
    }
    // enemies: keep them at the edge of the cleaver orbit
    const orbit = P.w.cleaver ? orbitRx() : 20;
    let nearest = null, nd = 1e9, crowd = 0;
    for (const e of G.enemies) {
      if (e.grabbed) continue;
      const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 0.01;
      if (d < nd) { nd = d; nearest = e; }
      if (d < 60) crowd++;
      const danger_r = e.elite ? orbit * 0.75 : orbit * 0.55;
      if (d < danger_r) add(dx / d, dy / d, (e.elite ? 2.2 : 1) * (danger_r - d) / danger_r * 2.2);
    }
    // boss spacing
    const B = G.boss;
    if (B && !B.dying) {
      const c = B.K.contactCircle ? B.K.contactCircle(B) : bossCircles(B)[0];
      const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 0.01;
      let want = c.r + orbit * 0.8;
      if (B.kind === "dark") want = Math.max(want, 62);
      if (B.dashing || (B.atk && B.atk.name === "whirl")) want = 80;
      if (B.kind === "ship") want = 30;
      if (d < want) add(dx / d, dy / d, 2.5 * (want - d) / want + 0.3);
      else if (danger === 0 && d > want + 15) add(-dx / d, -dy / d, 0.8);
    } else if (nearest && danger === 0 && crowd < 6 && nd > orbit + 6) add(-(P.x - nearest.x) / nd, -(P.y - nearest.y) / nd, 0.55);
    if (crowd > 10) {
      // surrounded: head for the emptiest direction
      let bx = 0, by = 0;
      for (const e of G.enemies) { const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1; if (d < 70) { bx += dx / d; by += dy / d; } }
      const l = Math.hypot(bx, by) || 1; add(bx / l, by / l, 1.2);
    }
    // loot when calm
    if (danger === 0) {
      if (G.chest && !G.chest.opened) { const dx = G.chest.x - P.x, dy = G.chest.y - P.y, d = Math.hypot(dx, dy) || 1; add(dx / d, dy / d, 2.5); }
      let best = null, bd = 60;
      for (const d of G.drops) { const dd = Math.hypot(d.x - P.x, d.y - P.y); if (dd < bd && (d.kind !== "heart" || P.hp < P.maxHp * 0.8)) { bd = dd; best = d; } }
      if (best) add((best.x - P.x) / bd, (best.y - P.y) / bd, best.kind === "heart" ? 1.5 : 0.7);
    }
    // walls
    const m = 22;
    if (P.x < INSET.l + m) add(1, 0, (INSET.l + m - P.x) / m * 2.5);
    if (P.x > AW - INSET.r - m) add(-1, 0, (P.x - (AW - INSET.r - m)) / m * 2.5);
    if (P.y < INSET.t + m) add(0, 1, (INSET.t + m - P.y) / m * 2.5);
    if (P.y > AH - INSET.b - m) add(0, -1, (P.y - (AH - INSET.b - m)) / m * 2.5);
    // idle drift so it never freezes in a corner
    this.wander += 0.02;
    add(Math.cos(this.wander), Math.sin(this.wander * 0.7), 0.08);
    const l = Math.hypot(v.x, v.y);
    return l > 0.12 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 };
  },
  act() {
    if (P.hook || P.hookCd > 0 || P.pulled) return;
    let best = null, bs = -1;
    for (const e of G.enemies) {
      if (e.grabbed) continue;
      const d = Math.hypot(e.x - P.x, e.y - P.y);
      if (d > 115) continue;
      const eatable = !e.elite || e.hp < e.maxHp * 0.35;
      const score = (eatable ? 2 : 0.6) * (e.xp + 1) + (P.hp < P.maxHp * 0.6 && eatable ? 3 : 0) - d / 60;
      if (score > bs) { bs = score; best = e; }
    }
    if (!best && G.boss && !G.boss.dying && !G.boss.untouchable) {
      const c = bossCircles(G.boss)[0];
      if (Math.hypot(c.x - P.x, c.y - P.y) < 150) best = G.boss;
    }
    if (best) tryHook(best);
  },
  choose(cards) {
    const score = c => {
      if (c.kind === "evo") return 100;
      if (c.kind === "feast") return P.hp < P.maxHp * 0.5 ? 14 : 6;
      if (c.kind === "snack") return P.hp < P.maxHp * 0.5 ? 10 : 2;
      if (c.kind === "plus2") return 9;
      const wt = { cleaver: 9, sword: 10, aura: 7, slam: 6, grenade: 6, saw: 6, might: 8, meaty: 7, armor: 7, regen: 6, speed: 5, glutton: 5, magnet: 4, hook: 3 };
      let s = wt[c.key] || 1;
      if (c.kind === "weapon" && c.isNew) s -= ownedWeapons().length >= 4 ? 4 : 0;
      for (const k in EVOS) {
        const E = EVOS[k];
        if (!P.evo[k] && c.key === E.passive && P.p[E.passive] === 0 && P.w[E.weapon] >= UPG[E.weapon].max - 1) s += 5;
      }
      if (c.key === "meaty" && P.hp < P.maxHp * 0.5) s += 3;
      return s + Math.random() * 1.5;
    };
    let bi = 0, bs = -1e9;
    cards.forEach((c, i) => { const s = score(c); if (s > bs) { bs = s; bi = i; } });
    return bi;
  },
};
