"use strict";
// Mini-bosses and bosses: stats, attack patterns, procedural drawing.

const BONES = [hx("#fff8e6"), hx("#d8ccb0"), hx("#a09078"), hx("#5a4e44")];
const EYE = hx("#ff3a2a"), EYE2 = hx("#ffd8a8");
const CROWN = makeSprite(["Y.Y.Y", "YYYYY", "yRyRy"], { Y: hx("#ffe04a"), y: hx("#c08a1a"), R: hx("#e02030") });
const TROLL_PAL = { fur: [hx("#f4f8ff"), hx("#c4d4ea"), hx("#8aa2c4")], belly: [hx("#ffffff"), hx("#e0ecf8"), hx("#b8cce4")],
  face: [hx("#9ab8f0"), hx("#6a8ad0"), hx("#4a64a8")], dark: [hx("#8aa2c4"), hx("#5a6a8a"), hx("#3a4a6a")], eye: hx("#ffe04a") };
const GOLEM_PAL = { fur: [hx("#9a8a88"), hx("#5e4e4c"), hx("#3a2e2e")], belly: [hx("#7a6a68"), hx("#4a3a38"), hx("#2a2020")],
  face: [hx("#6a5a58"), hx("#4a3a38"), hx("#2a2020")], dark: [hx("#4a3a38"), hx("#2a2020"), hx("#1a1212")], eye: hx("#ffe04a"), lava: true };
const PLANT_G = [hx("#9ae05a"), hx("#4aa83a"), hx("#2a7030")];
const SHIP = [hx("#e8ecf8"), hx("#9ea4b8"), hx("#5a6070")];
const GLASS = [hx("#d8fcff"), hx("#6ad8f0"), hx("#2a8ab0")];
const DARK_SKIN = { k: hx("#c8b0d8"), S: hx("#9a80b0"), s: hx("#6a5080") };

// ---------------------------------------------------------------- framework
function spawnBoss(kind) {
  const K = BOSSES[kind];
  const hpMul = 1;
  const B = {
    kind, K, name: K.name, mini: !!K.mini, hp: K.hp * hpMul, maxHp: K.hp * hpMul, t: 0, cd: 2.2, atk: null, flash: 0, hitCd: {},
    face: -1, stun: 0, phase2: false, entering: K.mini ? 0.9 : 1.6, dying: false, deathT: 0, z: 0,
  };
  if (K.mini) { const p = spawnPoint(90); B.x = p.x; B.y = p.y; }
  else { B.x = AW / 2; B.y = INSET.t + 2; }
  K.init && K.init(B);
  G.boss = B;
  return B;
}
function bossCircles(B) { return B.K.circles(B); }
function updateBoss(dt) {
  const B = G.boss, K = B.K;
  B.t += dt; B.flash = Math.max(0, B.flash - dt); B.flashCd = (B.flashCd || 0) - dt;
  for (const k in B.hitCd) B.hitCd[k] -= dt;
  if (B.dying) {
    B.deathT += dt;
    if (Math.random() < 0.5) { const c = bossCircles(B)[0]; blood(c.x + rnd(-12, 12), c.y + rnd(-10, 10), 3, 1.2, 8); if (!B.mini) sparks(c.x + rnd(-14, 14), c.y + rnd(-14, 14), 3, pick([GOLD, WHITE, RED]), 60); }
    if (B.deathT > (B.mini ? 0.9 : 2.0)) finishBoss(B);
    return;
  }
  if (B.entering > 0) {
    B.entering -= dt;
    if (!B.mini && K.enter) K.enter(B, dt);
    else if (!B.mini) B.y += 28 * dt;
    return;
  }
  if (!B.phase2 && B.hp < B.maxHp * 0.5) {
    B.phase2 = true;
    popup("ENRAGED!", B.x, B.y - 60, RED, 2, 1.4);
    shake(0.3, 2); sfx("warning");
    K.onPhase2 && K.onPhase2(B);
  }
  if (B.stun > 0) { B.stun -= dt; }
  else K.update(B, dt);
  if (K.contact && !B.untouchable) {
    const c = K.contactCircle ? K.contactCircle(B) : bossCircles(B)[0];
    if (Math.hypot(P.x - c.x, P.y - 6 - c.y) < c.r + 5 * P.scale) hurtPlayer(K.contact * (B.dashing ? 1.5 : 1), B, B.kind);
  }
  if (!K.fixed) clampArena(B, 6);
}
function bossDefeated() {
  const B = G.boss;
  if (!B || B.dying) return;
  B.dying = true; B.deathT = 0; B.atk = null; B.dashing = false; B.untouchable = true;
  G.tele = G.tele.filter(t => t.keep);
  if (P.pulled) P.pulled = null;
  shake(0.6, 3); sfx("bossdie"); buzz(200);
  banner(B.mini ? "MINI-BOSS DOWN!" : "BOSS DEFEATED!", GOLD, 2.2, B.name);
  if (!B.mini) G.bossTime = B.t;
}
function finishBoss(B) {
  const c = bossCircles(B)[0];
  blood(c.x, c.y, 30, 2, 12);
  bones(c.x, c.y + 10, B.mini ? 4 : 10);
  gainXp(Math.round((B.mini ? 30 : 90) * (1 + G.ch * 0.4)));
  popup("+" + Math.round((B.mini ? 30 : 90) * (1 + G.ch * 0.4)) + "XP", c.x, c.y - 20, PALE, 2, 1.5);
  dropChest(B.x, B.y + 4, !B.mini);
  G.boss = null;
  G.vacuum = 3;
  if (!B.mini) {
    G.phase = "done";
    for (const e of G.enemies) { e.hp = 0; killEnemy(e); }
    G.enemies = [];
    G.shots = []; G.puddles = [];
  }
}
function faceP(B) { B.face = P.x > B.x ? 1 : -1; }
function chase(B, dt, spd, keep = 0) {
  const dx = P.x - B.x, dy = P.y - B.y, d = Math.hypot(dx, dy) || 1;
  if (d > keep + 6) { B.x += dx / d * spd * dt; B.y += dy / d * spd * dt; B.walking = true; }
  else if (d < keep - 10) { B.x -= dx / d * spd * 0.6 * dt; B.y -= dy / d * spd * 0.6 * dt; B.walking = true; }
  else B.walking = false;
  faceP(B);
  return d;
}
function nextAttack(B, list, cd) {
  B.cd -= 0;
  const name = typeof list === "function" ? list() : pick(list);
  B.atk = { name, t: 0, step: 0 };
  B.cdBase = cd;
  return B.atk;
}
function endAttack(B, cd) { B.atk = null; B.cd = cd * (B.phase2 ? 0.7 : 1) * rnd(0.85, 1.2); B.dashing = false; }
function summon(B, type, n, rad = 30) {
  for (let i = 0; i < n && G.enemies.length < 80; i++) {
    const a = i / n * Math.PI * 2 + Math.random() * 0.3, o = { x: B.x + Math.cos(a) * rad, y: B.y + Math.sin(a) * rad * 0.7 };
    clampArena(o, 4);
    spawnEnemy(type, o.x, o.y);
    dust(o.x, o.y, 5, PALE);
  }
  sfx("summon");
}
function ringShots(x, y, n, sp, dmg, col, off = 0) {
  for (let i = 0; i < n; i++) shoot(x, y, off + i / n * Math.PI * 2, sp, dmg, col, 2.5);
  sfxThrottled("pew", 0.05);
}
// shared: telegraphed charge along a line
function chargeAtk(B, dt, a, o) {
  if (a.step === 0) {
    const dx = P.x - B.x, dy = P.y - B.y, d = Math.hypot(dx, dy) || 1;
    a.dx = dx / d; a.dy = dy / d; a.len = o.len;
    a.tele = tele("line", { x1: B.x, y1: B.y, x2: B.x + a.dx * a.len, y2: B.y + a.dy * a.len, w: o.w, src: B.kind + ":charge" }, o.aim, 0, null, RED);
    a.step = 1; faceP(B);
  } else if (a.step === 1) {
    a.tele.x1 = B.x; a.tele.y1 = B.y; a.tele.x2 = B.x + a.dx * a.len; a.tele.y2 = B.y + a.dy * a.len;
    if (a.t >= o.aim) { a.step = 2; a.t = 0; B.dashing = true; sfx("whoosh"); a.gone = 0; }
  } else if (a.step === 2) {
    const s = o.speed * dt;
    B.x += a.dx * s; B.y += a.dy * s; a.gone += s;
    if (Math.random() < 0.6) dust(B.x, B.y, 1, PALE);
    const edge = B.x <= INSET.l + 7 || B.x >= AW - INSET.r - 7 || B.y <= INSET.t + 7 || B.y >= AH - INSET.b - 7;
    if (a.gone >= a.len || edge) { a.step = 3; a.t = 0; B.dashing = false; shake(0.15, 2); o.onEnd && o.onEnd(B); }
  } else if (a.step === 3) {
    if (a.t > o.rest) return true;
  }
  return false;
}

// ---------------------------------------------------------------- drawing helpers
function drawSkeletonKing(B, sx, sy) {
  const K = 1.3, br = Math.sin(B.t * 5.7) * 0.7, a = B.atk || {};
  const p = (rx, ry) => [sx + rx * K, sy + ry * K];
  const flash = B.flash > 0 || (B.dying && Math.floor(B.deathT * 12) % 2) ? WHITE : 0;
  const both = a.both || 0, raise = a.raise || 0;
  const layers = [];
  for (const side of [-1, 1]) {
    const L = new Layer();
    const step = B.walking ? Math.sin(B.t * 8 + (side > 0 ? Math.PI : 0)) * 2 : 0;
    bline(L, p(6 * side, -22), p(8 * side, -11 + step * 0.3), 1.7, BONES);
    bline(L, p(8 * side, -11 + step * 0.3), p(8 * side + step, -2), 1.5, BONES);
    blob(L, ...p(9 * side + step, 0), 3.2, 1.8, BONES);
    layers.push(L);
  }
  let L = new Layer();
  blob(L, ...p(0, -22), 8.5 * K, 3.6 * K, BONES);
  for (const side of [-1, 1]) disc(L, ...p(3.5 * side, -22), 1.3 * K, BONES[3]);
  layers.push(L);
  L = new Layer();
  for (let yy = -38; yy < -23; yy += 3) disc(L, ...p(0, yy + br * 0.5), 1.8, BONES[1]);
  for (let i = 0; i < 5; i++) {
    const yy = -40 + i * 2.8 + br, hw = 10.5 - Math.abs(i - 1.2) * 1.3;
    for (let xi = -Math.floor(hw * K); xi <= hw * K; xi++) {
      const xr = xi / K;
      if (Math.abs(xr) < 1.2) continue;
      const [x, yw] = p(xr, yy + (xr / hw) ** 2 * 2.6);
      L.set(x, yw, xr < 0 ? BONES[0] : BONES[1]); L.set(x, yw + 1, xr < 0 ? BONES[1] : BONES[2]);
    }
  }
  bline(L, p(-12, -42 + br), p(12, -42 + br), 1.1, BONES);
  layers.push(L);
  const arm = (side, up, fist) => {
    const A = new Layer(), sh = p(12 * side, -42 + br);
    let el, fi;
    if (fist) { fi = fist; el = [(sh[0] + fi[0]) / 2 + 4 * side, Math.min(sh[1], fi[1]) - 10]; }
    else { el = [lerp(p(19 * side, -30)[0], p(18 * side, -54)[0], up), lerp(p(19 * side, -30)[1], p(18 * side, -54)[1], up)];
      fi = [lerp(p(20 * side, -18)[0], p(14 * side, -68)[0], up), lerp(p(20 * side, -18)[1], p(14 * side, -68)[1], up)]; }
    bline(A, sh, el, 1.8, BONES); bline(A, el, fi, 1.6, BONES);
    blob(A, fi[0], fi[1], 3.8 * K, 3.4 * K, BONES);
    return A;
  };
  const armL = arm(-1, both, null);
  const fistW = a.fist ? worldToScreen(a.fist[0], a.fist[1]) : null;
  const armR = arm(1, Math.max(raise, both), fistW);
  const S = new Layer(), sk = p(0, -52 + br), jaw = (Math.floor(B.t * 2.5) % 2 || a.name) ? 2 : 0;
  blob(S, sk[0], sk[1], 8.5 * K, 7.8 * K, BONES);
  blob(S, sk[0], sk[1] + 8 * K + jaw, 5.6 * K, 2.6 * K, BONES);
  for (const side of [-1, 1]) {
    const ex = sk[0] + 3.4 * K * side, ey = sk[1] + 0.5 * K;
    disc(S, ex, ey, 2.6 * K, BONES[3]); disc(S, ex, ey, 1.1, EYE);
    if (Math.floor(B.t * 6) % 3) S.set(ex - 1, ey - 1, EYE2);
  }
  S.set(sk[0], sk[1] + 4 * K, BONES[3]); S.set(sk[0] - 1, sk[1] + 4 * K, BONES[3]);
  for (let k = -4; k <= 4; k++) S.set(sk[0] + k * 1.3, sk[1] + 6.2 * K + jaw * 0.5, k % 2 ? WHITE : BONES[3]);
  for (const l of layers) l.draw(INK, flash, true);
  armL.draw(INK, flash, true);
  S.draw(INK, flash, true);
  blit(CROWN, sk[0] - 4, sk[1] - 13 * K, { scale: 1.6 });
  armR.draw(INK, flash, true);
}
function drawBruteBoss(B, sx, sy, pal, s = 1) {
  const a = B.atk || {}, flash = B.flash > 0 || (B.dying && Math.floor(B.deathT * 12) % 2) ? WHITE : 0;
  const L = new Layer(), q = (x, y) => [sx + x * s, sy + y * s];
  const step = B.walking || B.dashing ? Math.sin(B.t * 9) * 2 : 0;
  for (const side of [-1, 1]) {
    const k = side > 0 ? step : -step;
    blob(L, ...q(9 * side, -6 + Math.min(0, k)), 5.5 * s, 5.5 * s, pal.fur);
    blob(L, ...q(10 * side, -1 + Math.min(0, k)), 5 * s, 2.3 * s, pal.dark);
  }
  blob(L, ...q(0, -25), 17 * s, 16 * s, pal.fur);
  blob(L, ...q(1, -21), 9 * s, 9 * s, pal.belly);
  const up = a.raise || 0;
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = q(15 * side, -33);
    let fist = q(22 * side, -12 + Math.sin(B.t * 3 + side) * 1.5);
    if (up) fist = [lerp(fist[0], q(13 * side, -60)[0], up), lerp(fist[1], q(13 * side, -60)[1], up)];
    if (B.dashing) fist = q(21 * side, -33);
    arms.push([sh, fist]);
  }
  for (const [sh, fist] of arms) { bline(L, sh, fist, 4 * s, pal.fur); blob(L, fist[0], fist[1], 5.5 * s, 5 * s, pal.dark); }
  blob(L, ...q(0, -44), 10 * s, 8 * s, pal.fur);
  blob(L, ...q(0, -42), 7 * s, 5 * s, pal.face);
  L.draw(INK, flash, true);
  const eye = flash ? WHITE : pal.eye;
  const [hx0, hy0] = q(0, -44);
  put(hx0 - 3 * s, hy0, eye); put(hx0 + 3 * s, hy0, eye); put(hx0 - 3 * s + 1, hy0, eye); put(hx0 + 3 * s - 1, hy0, eye);
  line(hx0 - 5 * s, hy0 - 2, hx0 - 1, hy0 - 1, INK); line(hx0 + 1, hy0 - 1, hx0 + 5 * s, hy0 - 2, INK);
  line(hx0 - 3 * s, hy0 + 4 * s, hx0 + 3 * s, hy0 + 4 * s, INK);
  for (const side of [-1, 1]) { put(hx0 + 4 * s * side, hy0 + 3 * s, WHITE); put(hx0 + 4 * s * side, hy0 + 2 * s, WHITE); put(hx0 + 4 * s * side, hy0 + 1 * s, WHITE); }
  for (const side of [-1, 1]) { line(hx0 + 7 * s * side, hy0 - 5 * s, hx0 + 10 * s * side, hy0 - 11 * s, pal.dark[0]); put(hx0 + 10 * s * side, hy0 - 12 * s, WHITE); }
  if (pal.lava) {
    const glow = Math.floor(B.t * 6) % 2 ? hx("#ffc03a") : hx("#ff6a1a");
    const [bx, by] = q(0, -25);
    for (const [dx, dy] of [[-6, -4], [-5, -3], [-4, -1], [-4, 0], [4, -6], [5, -5], [6, -3], [0, 5], [1, 6], [2, 7], [-2, 8], [8, 2], [9, 3]])
      put(bx + dx * s, by + dy * s, glow);
    put(hx0 - 3 * s, hy0, glow); put(hx0 + 3 * s, hy0, glow);
  }
  if (B.stunned) for (let i = 0; i < 3; i++) put(sx + Math.cos(B.t * 6 + i * 2.1) * 9, hy0 - 12 + Math.sin(B.t * 6 + i * 2.1) * 2, GOLD);
}
function hydraHeads(B) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const base = [B.x + (i - 1) * 17, B.y - 20 - (i === 1 ? 4 : 0)];
    let hp_ = [base[0] + Math.sin(B.t * 1.3 + i * 2) * 10 + (i - 1) * 8, base[1] - 28 + Math.cos(B.t * 1.1 + i) * 5];
    const st = B.strikes && B.strikes[i];
    if (st && st.t >= 0) {
      const k = st.t < 0.18 ? easeOut(st.t / 0.18) : st.t < 0.5 ? 1 : Math.max(0, 1 - (st.t - 0.5) / 0.3);
      hp_ = [lerp(hp_[0], st.x, k), lerp(hp_[1], st.y - 6, k)];
    }
    out.push({ base, head: hp_, open: st && st.t >= 0 && st.t < 0.2 ? 3 : Math.floor(B.t * 3 + i) % 3 === 0 ? 2 : 0 });
  }
  return out;
}
function drawHydra(B) {
  const flash = B.flash > 0 || (B.dying && Math.floor(B.deathT * 12) % 2) ? WHITE : 0;
  const rise = B.entering > 0 ? easeOut(1 - B.entering / 1.6) : 1;
  const [sx, sy] = worldToScreen(B.x, B.y);
  fillEllipseDither(sx, sy + 2, 34, 12, hx("#3a7a8a"), 0.7, false);
  const L = new Layer();
  blob(L, sx, sy - 10 * rise, 26, 15 * rise, PLANT_G);
  for (const [dx, dy] of [[-12, -14], [-4, -18], [8, -15], [15, -9], [-17, -6], [3, -8]]) disc(L, sx + dx, sy + dy * rise, 1.6, hx("#e04a6a"));
  for (let k = -5; k <= 5; k++) L.set(sx + k * 4, sy - 1, WHITE);
  L.draw(INK, flash, true);
  if (rise < 1) return;
  for (const h of hydraHeads(B)) {
    const N = new Layer(), [bx, by] = worldToScreen(h.base[0], h.base[1]), [hx_, hy_] = worldToScreen(h.head[0], h.head[1]);
    const cx = bx + (hx_ - bx) * 0.3, cy = Math.min(by, hy_) - 14;
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, x = (1 - t) ** 2 * bx + 2 * (1 - t) * t * cx + t * t * hx_, y = (1 - t) ** 2 * by + 2 * (1 - t) * t * cy + t * t * hy_;
      disc(N, x, y, 3.4 - t, i % 3 ? PLANT_G[1] : PLANT_G[2]);
      N.set(x - 1, y - 2, PLANT_G[0]);
    }
    N.draw(INK, flash, true);
    const Hh = new Layer(), o = h.open;
    blob(Hh, hx_, hy_ - 2 - o, 7, 4.5, PLANT_G);
    blob(Hh, hx_, hy_ + 3 + o, 6, 3, PLANT_G);
    for (let x = -5; x <= 5; x++) for (let y = 0; y <= o + 1; y++) Hh.set(hx_ + x, hy_ + y, hx("#a02040"));
    for (let x = -5; x <= 5; x += 2) { Hh.set(hx_ + x, hy_ + 1 - o * 0, WHITE); Hh.set(hx_ + x + 1, hy_ + o + 1, WHITE); }
    Hh.set(hx_ - 3, hy_ - 5 - o, GOLD); Hh.set(hx_ + 3, hy_ - 5 - o, GOLD);
    Hh.draw(INK, flash, true);
  }
}
function drawShip(B) {
  const [sx, sy] = worldToScreen(B.x, B.y), h = B.hover;
  const flash = B.flash > 0 || (B.dying && Math.floor(B.deathT * 12) % 2) ? WHITE : 0;
  shadowEllipse(sx, sy, 40, 9);
  if (B.tractor > 0) {
    for (let y = Math.floor(sy - h + 6); y < sy + 4; y++) {
      const k = (y - (sy - h)) / h, w = 10 + k * 34;
      for (let x = Math.floor(sx - w); x <= sx + w; x++)
        if (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] < 5 + ((y + Math.floor(G.t * 20)) % 6 < 2 ? 4 : 0)) tint(x, y, hx("#8aff9a"), 0.55);
    }
    ellipseRing(sx, sy, 44, 18, hx("#8aff9a"), 3, Math.floor(G.t * 10));
  }
  const L = new Layer(), y0 = sy - h + Math.sin(G.t * 2) * 2;
  blob(L, sx, y0 - 13, 18, 12, GLASS);
  blob(L, sx, y0, 50, 12, SHIP);
  blob(L, sx, y0 + 7, 22, 5, [SHIP[1], SHIP[2], hx("#3a3e4a")]);
  for (let x = -38; x <= 38; x += 2) L.set(sx + x, y0 + 6, SHIP[2]);
  L.draw(INK, flash, true);
  for (const [dx, dy] of [[-4, -16], [3, -16], [-1, -19], [0, -14]]) put(sx + dx, y0 + dy, hx("#2a5a2a"));
  put(sx - 4, y0 - 16, hx("#8ae05a")); put(sx + 3, y0 - 16, hx("#8ae05a"));
  if (B.phase2) { put(sx - 4, y0 - 16, RED); put(sx + 3, y0 - 16, RED); }
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, lx = sx + Math.cos(a) * 42, ly = y0 + Math.sin(a) * 8 + 1;
    const on = (i + Math.floor(G.t * 8)) % 3 === 0;
    const c = B.phase2 ? (on ? RED : hx("#6a1010")) : (on ? GOLD : hx("#5a4a20"));
    put(lx, ly, c); put(lx + 1, ly, c);
  }
  if (B.beamFx) for (const b of B.beamFx) {
    const k = b.t / 0.35, [bx] = worldToScreen(b.x, 0);
    for (let y = 0; y < H; y++) for (let x = Math.floor(bx - b.w / 2 * (1 - k * 0.5)); x <= bx + b.w / 2 * (1 - k * 0.5); x++)
      put(x, y, Math.abs(x - bx) < 2 ? WHITE : hx("#ff6ad0"));
  }
}
function drawDark(B, sx, sy) {
  const s = 1.7, a = B.atk || {}, flash = B.flash > 0 || (B.dying && Math.floor(B.deathT * 12) % 2) ? WHITE : 0;
  shadowEllipse(sx, sy + 1, 13 * s, 3.5 * s);
  const bx = sx, by = sy - BUTCHER_BELLY_UP * s;
  const back = new Layer(), front = new Layer();
  const handL = [bx - 16 * s, by - s], handR = [bx + 16 * s, by - s];
  const n = B.cleavers || 3, rx = 46, ry = rx * 0.62;
  for (let i = 0; i < n; i++) {
    const ang = B.cang + i * Math.PI * 2 / n;
    bloodTrail(bx, by, rx, ry, ang, [hx("#d08aff"), hx("#9a4ae0"), hx("#6a2aa0"), hx("#3e1266")], 16);
  }
  for (let i = 0; i < n; i++) {
    const ang = B.cang + i * Math.PI * 2 / n, cx = bx + Math.cos(ang) * rx, cy = by + Math.sin(ang) * ry;
    const Lt = Math.sin(ang) < 0 ? back : front;
    chainLine(Lt, Math.cos(ang) < 0 ? handL : handR, [cx - Math.cos(ang) * 5, cy - Math.sin(ang) * 5], 1);
    cleaver(Lt, cx, cy, Math.atan2((cy - by) * rx / ry, cx - bx) + 0.35, 1.3);
  }
  if (a.name === "hook" && a.hookPos) {
    const [hx_, hy_] = worldToScreen(a.hookPos[0], a.hookPos[1]);
    const hand = hx_ > bx ? handR : handL;
    chainLine(front, hand, [hx_, hy_], 2);
    cleaver(front, hx_, hy_, a.t * 12, 1.4);
  }
  back.draw(INK, flash, true);
  const legs = B.walking || B.dashing ? [1, 0, 2, 0][Math.floor(B.t * 8) % 4] : 0;
  blitFeet(SPR.dark[(a.name === "hook" ? "open" : "idle") + legs], sx, sy, { scale: s, flip: B.face < 0, flash });
  const arms = new Layer();
  const arm = (root, hand) => {
    for (let i = 0; i <= 8; i++) disc(arms, lerp(root[0], hand[0], i / 8), lerp(root[1], hand[1], i / 8), 2.7 * s * 0.8, DARK_SKIN.S);
    disc(arms, hand[0], hand[1], 3 * s * 0.8, DARK_SKIN.k);
  };
  arm([bx - 8 * s, by - 6 * s], handL); arm([bx + 8 * s, by - 6 * s], handR);
  arms.draw(INK, flash, true);
  front.draw(INK, flash, true);
}
function drawMini(B, sprKey, scale, extra) {
  const [sx, sy] = worldToScreen(B.x, B.y);
  const flash = B.flash > 0 || (B.dying && Math.floor(B.deathT * 12) % 2) ? WHITE : 0;
  const fade = B.untouchable && !B.dying && B.blinkT !== undefined ? 0.35 : 0;
  shadowEllipse(sx, sy + 1, 7 * scale, 2.2 * scale);
  const spr = SPR[sprKey][Math.floor(B.t * (B.walking || B.dashing ? 8 : 2)) % 2];
  const lift = B.z || 0;
  if (extra && extra.before) extra.before(sx, sy);
  if (!fade) blitFeet(spr, sx, sy - lift, { scale, flip: B.face < 0, flash, dither: true });
  else if (Math.floor(G.t * 20) % 2) blitFeet(spr, sx, sy - lift, { scale, flip: B.face < 0, flash: CYAN });
  if (extra && extra.after) extra.after(sx, sy - lift);
}

// ---------------------------------------------------------------- the roster
const BOSSES = {
  // ============ CHAPTER 1
  chief: {
    name: "GOBLIN CHIEF", mini: true, hp: 520, contact: 12,
    circles: B => [{ x: B.x, y: B.y - 18, r: 13 }],
    update(B, dt) {
      const a = B.atk;
      if (!a) {
        chase(B, dt, 17);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, ["charge", "charge", "cry"]);
        return;
      }
      a.t += dt;
      if (a.name === "charge") {
        if (chargeAtk(B, dt, a, { len: 150, w: 20, aim: 0.8, speed: 190, rest: 0.6 })) endAttack(B, 2.2);
      } else if (a.name === "cry") {
        a.raise = Math.min(1, a.t / 0.4);
        if (a.t > 0.7 && !a.done) { a.done = true; summon(B, "goblin", B.phase2 ? 7 : 5); if (B.phase2) summon(B, "brute", 1, 20); shake(0.2, 1); }
        if (a.t > 1.1) endAttack(B, 2.6);
      }
    },
    draw(B) { drawMini(B, "brute", 2.3, { after: (sx, sy) => blit(CROWN, sx - 5, sy - SPR.brute[0].h * 2.3 - 4, { scale: 2 }) }); },
  },
  skeleton: {
    name: "SKELETON KING", hp: 2000, contact: 14,
    circles: B => [{ x: B.x, y: B.y - 46, r: 14 }, { x: B.x, y: B.y - 22, r: 11 }],
    contactCircle: B => ({ x: B.x, y: B.y - 12, r: 10 }),
    update(B, dt) {
      const a = B.atk;
      if (!a) {
        chase(B, dt, 13, 40);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, () => pick(G.enemies.length < 30 ? ["slam", "slam", "rain", "summon"] : ["slam", "rain"]));
        return;
      }
      a.t += dt;
      if (a.name === "slam") {
        if (a.step === 0) { a.tx = P.x; a.ty = P.y; tele("circle", { x: a.tx, y: a.ty, r: 28, src: "skel:slam" }, 1.1, 26, () => { shake(0.4, 3); slamFx(a.tx, a.ty, 28); }); a.step = 1; faceP(B); }
        a.raise = a.t < 1.1 ? Math.min(1, a.t / 0.7) : 0;
        if (a.t >= 1.1 && a.t < 1.55) a.fist = [a.tx, a.ty - 4]; else a.fist = null;
        if (a.t > 1.6) {
          if (B.phase2 && !a.again) { a.again = true; a.t = 0; a.step = 0; a.fist = null; return; }
          endAttack(B, 2.0);
        }
      } else if (a.name === "rain") {
        a.both = Math.min(1, a.t / 0.5);
        if (a.step === 0) {
          const n = B.phase2 ? 9 : 6;
          for (let i = 0; i < n; i++) {
            const x = i === 0 ? P.x : P.x + rnd(-50, 50), y = i === 0 ? P.y : P.y + rnd(-35, 35);
            tele("circle", { x, y, r: 12, fall: "bone", src: "skel:rain" }, 1.0 + i * 0.1, 16, t => { bones(t.x, t.y, 2); dust(t.x, t.y, 6, PALE); sfxThrottled("stomp", 0.08); });
          }
          a.step = 1;
        }
        if (a.t > 1.9) endAttack(B, 2.0);
      } else if (a.name === "summon") {
        a.both = Math.min(1, a.t / 0.4);
        if (a.t > 0.8 && !a.done) { a.done = true; summon(B, "goblin", 5); if (B.phase2) summon(B, "brute", 1, 20); }
        if (a.t > 1.2) endAttack(B, 2.2);
      }
    },
    draw(B) { const [sx, sy] = worldToScreen(B.x, B.y); shadowEllipse(sx, sy + 1, 20, 5); drawSkeletonKing(B, sx, sy); },
  },
  // ============ CHAPTER 2
  alpha: {
    name: "YETI ALPHA", mini: true, hp: 1500, contact: 14,
    circles: B => [{ x: B.x, y: B.y - 20, r: 14 }],
    update(B, dt) {
      const a = B.atk;
      if (!a) {
        chase(B, dt, 18);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, ["charge", "charge", "roar"]);
        return;
      }
      a.t += dt;
      if (a.name === "charge") {
        if (chargeAtk(B, dt, a, { len: 150, w: 22, aim: 0.75, speed: 200, rest: 0.5,
          onEnd: b => ringShots(b.x, b.y - 14, b.phase2 ? 16 : 12, 55, 9, "ice", Math.random()) })) endAttack(B, 2.2);
      } else if (a.name === "roar") {
        if (a.t > 0.6 && !a.done) {
          a.done = true; shake(0.3, 2); sfx("roar");
          G.rings.push({ x: B.x, y: B.y, r: 0, R: 75, t: 0, col: CYAN });
          if (Math.hypot(P.x - B.x, P.y - B.y) < 75) { P.slowT = 1.6; popup("FROZEN!", P.x, P.y - 50, CYAN, 1, 1); }
          summon(B, "ice", B.phase2 ? 6 : 4);
        }
        if (a.t > 1.1) endAttack(B, 2.4);
      }
    },
    draw(B) { drawMini(B, "yeti", 2.2, { before: (sx, sy) => { if (Math.floor(G.t * 4) % 2) fillEllipseDither(sx, sy - 18, 22, 22, CYAN, 0.12); } }); },
  },
  troll: {
    name: "FROST TROLL", hp: 5500, contact: 16,
    circles: B => [{ x: B.x, y: B.y - 25, r: 17 }, { x: B.x, y: B.y - 45, r: 9 }],
    contactCircle: B => ({ x: B.x, y: B.y - 12, r: 14 }),
    update(B, dt) {
      const a = B.atk;
      B.stunned = false;
      if (!a) {
        chase(B, dt, 16, 20);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, ["charge", "spikes", "stomp", "charge"]);
        return;
      }
      a.t += dt;
      if (a.name === "charge") {
        const done = chargeAtk(B, dt, a, { len: 175, w: 26, aim: 0.85, speed: 210, rest: 0.9 });
        if (a.step === 3) B.stunned = true;
        if (done) endAttack(B, 1.8);
      } else if (a.name === "spikes") {
        if (a.step === 0) {
          a.step = 1;
          const rings = B.phase2 ? [30, 52, 74, 96] : [30, 55, 80];
          rings.forEach((rad, k) => {
            const n = 8 + k * 2, off = k * 0.3;
            for (let i = 0; i < n; i++) {
              const ang = off + i / n * Math.PI * 2;
              tele("circle", { x: B.x + Math.cos(ang) * rad, y: B.y + Math.sin(ang) * rad * 0.7, r: 9, src: "troll:spike" }, 0.7 + k * 0.22, 18,
                t => G.fx.push({ kind: "spike", x: t.x, y: t.y, t: 0, life: 0.5 }));
            }
          });
        }
        a.raise = Math.min(1, a.t / 0.4) * (a.t < 0.8 ? 1 : 0);
        if (a.t > 1.6) endAttack(B, 2.0);
      } else if (a.name === "stomp") {
        if (a.step === 0) {
          a.step = 1;
          tele("circle", { x: B.x, y: B.y, r: 48, src: "troll:stomp" }, 1.1, 26, () => {
            shake(0.4, 3); slamFx(B.x, B.y, 48);
            if (B.phase2) ringShots(B.x, B.y - 10, 16, 52, 9, "ice", Math.random());
          });
        }
        a.raise = a.t < 1.1 ? Math.min(1, a.t / 0.7) : 0;
        if (a.t > 1.6) endAttack(B, 2.0);
      }
    },
    draw(B) { const [sx, sy] = worldToScreen(B.x, B.y); shadowEllipse(sx, sy + 1, 22, 5); drawBruteBoss(B, sx, sy, TROLL_PAL, 1); },
  },
  // ============ CHAPTER 3
  lizking: {
    name: "LIZARD KING", mini: true, hp: 3600, contact: 11,
    circles: B => [{ x: B.x, y: B.y - 16, r: 13 }],
    update(B, dt) {
      const a = B.atk;
      if (!a) {
        chase(B, dt, 24, 30);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, ["dash", "dash", "spit"]);
        return;
      }
      a.t += dt;
      if (a.name === "dash") {
        if (chargeAtk(B, dt, a, { len: 115, w: 16, aim: 0.7, speed: 240, rest: 0.4 })) {
          if (B.hp < B.maxHp * 0.3 && !a.again) { a.again = true; a.step = 0; a.t = 0; return; }
          endAttack(B, 1.8);
        }
      } else if (a.name === "spit") {
        if (a.step === 0) {
          a.step = 1;
          const n = B.phase2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const tx = P.x + (i ? rnd(-40, 40) : 0), ty = P.y + (i ? rnd(-28, 28) : 0);
            tele("circle", { x: tx, y: ty, r: 13, src: "liz:spit" }, 0.9, 8, null, hx("#8aff5a"));
            lob(B.x, B.y - 20, tx, ty, 0.9, 30, "poison", l => puddle(l.x, l.y, 14, 4, 7));
          }
          sfx("spit");
        }
        if (a.t > 1.2) endAttack(B, 2.0);
      }
    },
    draw(B) { drawMini(B, "lizard", 2.4, { after: (sx, sy) => blit(CROWN, sx - 4, sy - 44, { scale: 1.6 }) }); },
  },
  hydra: {
    name: "SWAMP HYDRA", hp: 11000, contact: 10, fixed: true,
    init(B) { B.x = AW / 2; B.y = INSET.t + 46; B.strikes = [null, null, null]; },
    enter(B) {},
    circles: B => {
      const out = [{ x: B.x, y: B.y - 8, r: 24 }];
      if (B.entering <= 0) for (const h of hydraHeads(B)) out.push({ x: h.head[0], y: h.head[1], r: 9 });
      return out;
    },
    contactCircle: B => ({ x: B.x, y: B.y - 4, r: 22 }),
    update(B, dt) {
      for (const s of B.strikes) if (s) s.t += dt;
      const d = Math.hypot(P.x - B.x, P.y - B.y);
      if (d < 30) { const a = Math.atan2(P.y - B.y, P.x - B.x); P.x = B.x + Math.cos(a) * 30; P.y = B.y + Math.sin(a) * 30; }
      const a = B.atk;
      if (!a) {
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, () => pick(G.enemies.length < 30 ? ["bite", "bite", "spit", "vines", "summon"] : ["bite", "spit", "vines"]));
        return;
      }
      a.t += dt;
      if (a.name === "bite") {
        if (a.step === 0) {
          a.step = 1;
          for (let i = 0; i < 3; i++) {
            const delay = 0.85 + i * 0.4;
            setTimeoutG(i * 0.4, () => {
              const tx = P.x, ty = P.y;
              tele("circle", { x: tx, y: ty, r: 15, src: "hydra:bite" }, 0.9, 18, () => { sfx("chomp"); shake(0.12, 1); });
              B.strikes[i] = { x: tx, y: ty, t: -0.85 };
            });
          }
        }
        if (a.t > 2.6) { B.strikes = [null, null, null]; endAttack(B, 1.8); }
      } else if (a.name === "spit") {
        if (a.step === 0) {
          a.step = 1;
          for (let i = 0; i < 4; i++) {
            const tx = P.x + (i ? rnd(-45, 45) : 0), ty = P.y + (i ? rnd(-30, 30) : 0);
            tele("circle", { x: tx, y: ty, r: 15, src: "hydra:spit" }, 1.0, 8, null, hx("#8aff5a"));
            lob(B.x + rnd(-10, 10), B.y - 40, tx, ty, 1.0, 40, "poison", l => puddle(l.x, l.y, 15, 4.5, 8));
          }
          sfx("spit");
        }
        if (a.t > 1.4) endAttack(B, 1.8);
      } else if (a.name === "vines") {
        if (a.step === 0) {
          a.step = 1;
          tele("band", { y: P.y, h: 22, src: "hydra:vine" }, 1.2, 22, t => G.fx.push({ kind: "vine", y: t.y, h: 22, t: 0, life: 0.45 }), hx("#4aa83a"));
          if (B.phase2) tele("vband", { x: P.x, w: 22, src: "hydra:vine" }, 1.45, 22, t => G.fx.push({ kind: "vinev", x: t.x, w: 22, t: 0, life: 0.45 }), hx("#4aa83a"));
        }
        if (a.t > 1.8) endAttack(B, 2.0);
      } else if (a.name === "summon") {
        if (a.t > 0.5 && !a.done) { a.done = true; summon(B, "lizard", 3, 40); if (B.phase2) summon(B, "plant", 2, 55); }
        if (a.t > 0.9) endAttack(B, 1.6);
      }
    },
    draw(B) { drawHydra(B); },
  },
  // ============ CHAPTER 4
  knight: {
    name: "BONE KNIGHT", mini: true, hp: 5200, contact: 14,
    circles: B => [{ x: B.x, y: B.y - 18, r: 14 }],
    update(B, dt) {
      const a = B.atk;
      if (!a) {
        chase(B, dt, 18);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, () => pick(G.enemies.length < 30 ? ["whirl", "throw", "raise"] : ["whirl", "throw"]));
        return;
      }
      a.t += dt;
      if (a.name === "whirl") {
        if (a.step === 0) { a.step = 1; tele("circle", { x: B.x, y: B.y, r: 36, src: "knight:whirl" }, 0.9, 22, () => { shake(0.2, 2); sfx("whoosh"); }); }
        if (a.t > 0.9) { B.dashing = true; B.spin = true; chase(B, dt, B.phase2 ? 70 : 55); }
        if (a.t > 2.2) { B.spin = false; endAttack(B, 2.0); }
      } else if (a.name === "throw") {
        if (a.step === 0) {
          a.step = 1;
          const n = B.phase2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const tx = P.x + (i ? rnd(-40, 40) : 0), ty = P.y + (i ? rnd(-28, 28) : 0);
            tele("circle", { x: tx, y: ty, r: 11, src: "knight:bone" }, 0.9, 14);
            lob(B.x, B.y - 24, tx, ty, 0.9, 34, "bone", l => { bones(l.x, l.y, 1); dust(l.x, l.y, 4, PALE); });
          }
        }
        if (a.t > 1.2) endAttack(B, 1.8);
      } else if (a.name === "raise") {
        if (a.t > 0.6 && !a.done) { a.done = true; summon(B, "skel", B.phase2 ? 6 : 4, 34); }
        if (a.t > 1.0) endAttack(B, 2.0);
      }
    },
    draw(B) {
      if (B.spin) B.face = Math.floor(G.t * 16) % 2 ? 1 : -1;
      drawMini(B, "skel", 2.5, { after: (sx, sy) => {
        blit(CROWN, sx - 4, sy - 40, { scale: 1.6 });
        if (B.spin) ellipseRing(sx, sy - 14, 30, 18, Math.floor(G.t * 12) % 2 ? WHITE : METAL[1], 2, Math.floor(G.t * 20));
      } });
    },
  },
  dark: {
    name: "DARK BUTCHER", hp: 15000, contact: 12,
    init(B) { B.cang = 0; B.cleavers = 3; },
    onPhase2(B) { B.cleavers = 5; },
    circles: B => [{ x: B.x, y: B.y - 26, r: 15 }],
    contactCircle: B => ({ x: B.x, y: B.y - 12, r: 12 }),
    update(B, dt) {
      B.cang += dt * (B.phase2 ? 3.2 : 2.5);
      const n = B.cleavers, rx = 46, ry = rx * 0.62, by = B.y - BUTCHER_BELLY_UP * 1.7;
      for (let i = 0; i < n; i++) {
        const ang = B.cang + i * Math.PI * 2 / n, cx = B.x + Math.cos(ang) * rx, cy = by + Math.sin(ang) * ry;
        if (Math.hypot(P.x - cx, P.y - 10 * P.scale - cy) < 7 + 5 * P.scale) hurtPlayer(12, { x: cx, y: cy }, "dark:cleaver");
      }
      const a = B.atk;
      if (!a) {
        chase(B, dt, 22, 72);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, () => pick(G.enemies.length < 30 ? ["hook", "hook", "dash", "summon"] : ["hook", "dash"]));
        return;
      }
      a.t += dt;
      if (a.name === "hook") {
        if (a.step === 0) {
          a.step = 1; faceP(B);
          const dx = P.x - B.x, dy = P.y - B.y, d = Math.hypot(dx, dy) || 1;
          a.dx = dx / d; a.dy = dy / d; a.len = Math.min(170, d + 40);
          a.tl = tele("line", { x1: B.x, y1: B.y - 20, x2: B.x + a.dx * a.len, y2: B.y - 20 + a.dy * a.len, w: 12, src: "dark:hook" }, 0.8, 0, t => {
            a.fly = 0;
            if (teleHitsPlayer(t)) { B.onPulled = () => { hurtPlayer(22, B, "dark:chomp"); popup("CHOMP!", P.x, P.y - 50, RED, 2, 1); sfx("chomp"); }; P.inv = 0; P.pulled = B; popup("HOOKED!", P.x, P.y - 40, RED, 1, 0.8); }
          }, RED);
        }
        if (a.t >= 0.8) { const k = Math.min(1, (a.t - 0.8) / 0.18) * (a.t > 1.25 ? Math.max(0, 1 - (a.t - 1.25) / 0.25) : 1); a.hookPos = [B.x + a.dx * a.len * k, B.y - 20 + a.dy * a.len * k]; }
        if (a.t > 1.6 && !P.pulled) endAttack(B, 1.6);
      } else if (a.name === "dash") {
        a.n = a.n || 0;
        if (chargeAtk(B, dt, a, { len: 95, w: 16, aim: 0.45, speed: 230, rest: 0.15 })) {
          a.n++;
          if (a.n < 3) { a.step = 0; a.t = 0; } else endAttack(B, 1.8);
        }
      } else if (a.name === "summon") {
        if (a.t > 0.5 && !a.done) { a.done = true; summon(B, "skel", 3, 36); summon(B, "bat", B.phase2 ? 5 : 3, 30); }
        if (a.t > 0.9) endAttack(B, 1.6);
      }
    },
    draw(B) { const [sx, sy] = worldToScreen(B.x, B.y); drawDark(B, sx, sy); },
  },
  // ============ CHAPTER 5
  magma: {
    name: "MAGMA KING", mini: true, hp: 6200, contact: 14,
    circles: B => [{ x: B.x, y: B.y - 12 - (B.z || 0), r: 16 }],
    onPhase2(B) { summon(B, "slime", 5, 30); },
    update(B, dt) {
      const a = B.atk;
      if (!a) {
        chase(B, dt, 16);
        B.z = Math.abs(Math.sin(B.t * 5)) * 2;
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, ["jump", "jump", "spit"]);
        return;
      }
      a.t += dt;
      if (a.name === "jump") {
        if (a.step === 0) {
          a.step = 1; a.x0 = B.x; a.y0 = B.y; a.tx = P.x; a.ty = P.y;
          tele("circle", { x: a.tx, y: a.ty, r: 28, src: "magma:jump" }, 1.0, 24, () => { shake(0.35, 3); slamFx(a.tx, a.ty, 28); puddle(a.tx, a.ty, 18, 5, 8, "lava"); });
          B.untouchable = true;
        }
        const k = Math.min(1, a.t / 1.0);
        B.x = lerp(a.x0, a.tx, k); B.y = lerp(a.y0, a.ty, k); B.z = Math.sin(k * Math.PI) * 55;
        if (a.t >= 1.0) { B.z = 0; B.untouchable = false; }
        if (a.t > 1.4) {
          if (B.phase2 && !a.again) { a.again = true; a.step = 0; a.t = 0; return; }
          endAttack(B, 1.8);
        }
      } else if (a.name === "spit") {
        if (a.t > 0.4 && !a.done) { a.done = true; ringShots(B.x, B.y - 12, B.phase2 ? 12 : 8, 50, 10, "fire", Math.random()); }
        if (a.t > 0.8) endAttack(B, 1.8);
      }
    },
    draw(B) {
      const [sx, sy] = worldToScreen(B.x, B.y);
      if (B.z > 4) shadowEllipse(sx, sy + 1, 20, 5);
      drawMini(B, "slime", 3, { after: (x, y) => blit(CROWN, x - 4, y - 30, { scale: 1.8 }) });
    },
  },
  golem: {
    name: "LAVA GOLEM", hp: 20000, contact: 18,
    circles: B => [{ x: B.x, y: B.y - 30, r: 21 }, { x: B.x, y: B.y - 56, r: 11 }],
    contactCircle: B => ({ x: B.x, y: B.y - 14, r: 16 }),
    update(B, dt) {
      const a = B.atk;
      if (!a) {
        chase(B, dt, 12, 30);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, ["meteors", "wave", "rock", "slam", "meteors"]);
        return;
      }
      a.t += dt;
      if (a.name === "meteors") {
        a.raise = Math.min(1, a.t / 0.5) * (a.t < 1 ? 1 : 0);
        if (a.step === 0) {
          a.step = 1;
          const n = B.phase2 ? 11 : 7;
          for (let i = 0; i < n; i++) {
            const x = i === 0 ? P.x : P.x + rnd(-60, 60), y = i === 0 ? P.y : P.y + rnd(-40, 40);
            tele("circle", { x, y, r: 13, fall: "meteor", src: "golem:meteor" }, 1.0 + i * 0.09, 20, t => {
              shake(0.12, 2); sparks(t.x, t.y, 8, hx("#ffc03a"), 60); puddle(t.x, t.y, 10, B.phase2 ? 5 : 3, 7, "lava"); sfxThrottled("boom", 0.05);
            });
          }
        }
        if (a.t > 2.1) endAttack(B, 1.8);
      } else if (a.name === "wave") {
        if (a.step === 0) {
          a.step = 1;
          tele("band", { y: P.y, h: 24, src: "golem:wave" }, 1.2, 26, t => G.fx.push({ kind: "lavawave", y: t.y, h: 24, t: 0, life: 0.5 }), hx("#ff6a1a"));
          if (B.phase2) tele("vband", { x: P.x, w: 24, src: "golem:wave" }, 1.5, 26, t => G.fx.push({ kind: "lavawavev", x: t.x, w: 24, t: 0, life: 0.5 }), hx("#ff6a1a"));
        }
        a.raise = Math.min(1, a.t / 0.6) * (a.t < 1.2 ? 1 : 0);
        if (a.t > 1.9) endAttack(B, 1.8);
      } else if (a.name === "rock") {
        if (a.step === 0) {
          a.step = 1;
          const n = B.phase2 ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const tx = P.x + (i ? rnd(-45, 45) : 0), ty = P.y + (i ? rnd(-30, 30) : 0);
            tele("circle", { x: tx, y: ty, r: 17, src: "golem:rock" }, 1.0, 22, t => { shake(0.2, 2); dust(t.x, t.y, 10, hx("#8a7a78")); });
            lob(B.x, B.y - 50, tx, ty, 1.0, 50, "rock", null);
          }
        }
        if (a.t > 1.3) endAttack(B, 1.6);
      } else if (a.name === "slam") {
        if (a.step === 0) { a.step = 1; tele("circle", { x: B.x, y: B.y, r: 52, src: "golem:slam" }, 1.15, 28, () => { shake(0.45, 3); slamFx(B.x, B.y, 52); }); }
        a.raise = a.t < 1.15 ? Math.min(1, a.t / 0.7) : 0;
        if (a.t > 1.7) endAttack(B, 2.0);
      }
    },
    draw(B) { const [sx, sy] = worldToScreen(B.x, B.y); shadowEllipse(sx, sy + 1, 26, 6); drawBruteBoss(B, sx, sy, GOLEM_PAL, 1.22); },
  },
  // ============ CHAPTER 6
  commander: {
    name: "ALIEN COMMANDER", mini: true, hp: 8500, contact: 10,
    circles: B => [{ x: B.x, y: B.y - 16, r: 13 }],
    update(B, dt) {
      const a = B.atk;
      if (!a) {
        chase(B, dt, 20, 70);
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, () => pick(G.enemies.length < 30 ? ["blink", "triple", "drones"] : ["blink", "triple"]));
        return;
      }
      a.t += dt;
      if (a.name === "blink") {
        if (a.step === 0) { a.step = 1; B.untouchable = true; B.blinkT = 0; sfx("blink"); }
        if (a.step === 1 && a.t > 0.45) {
          a.step = 2;
          const ang = Math.random() * Math.PI * 2, o = { x: P.x + Math.cos(ang) * 70, y: P.y + Math.sin(ang) * 50 };
          clampArena(o, 10); B.x = o.x; B.y = o.y; faceP(B);
          sparks(B.x, B.y - 16, 12, hx("#ff6ad0"), 60);
        }
        if (a.step === 2 && a.t > 0.75) { a.step = 3; B.untouchable = false; B.blinkT = undefined; ringShots(B.x, B.y - 16, B.phase2 ? 20 : 16, 60, 9, "laser", Math.random()); }
        if (a.t > 1.2) endAttack(B, 1.6);
      } else if (a.name === "triple") {
        const shots = B.phase2 ? 4 : 3;
        const k = Math.floor(a.t / 0.28);
        if (k > (a.fired || 0) - 1 && (a.fired || 0) < shots && a.t > 0.3) {
          a.fired = (a.fired || 0) + 1;
          const ang = Math.atan2(P.y - 8 - (B.y - 16), P.x - B.x);
          for (const o of [-0.25, 0, 0.25]) shoot(B.x, B.y - 16, ang + o, 85, 9, "laser");
          sfxThrottled("pew", 0.05);
        }
        if (a.t > 0.3 + shots * 0.28 + 0.3) endAttack(B, 1.6);
      } else if (a.name === "drones") {
        if (a.t > 0.5 && !a.done) { a.done = true; summon(B, "drone", B.phase2 ? 5 : 3, 25); }
        if (a.t > 0.8) endAttack(B, 1.6);
      }
    },
    draw(B) { drawMini(B, "alien", 2.5, { after: (sx, sy) => { blit(CROWN, sx - 4, sy - 38, { scale: 1.6 }); } }); },
  },
  ship: {
    name: "MOTHERSHIP", hp: 28000, contact: 0,
    init(B) { B.hover = 130; B.tractor = 0; B.beamFx = []; B.x = AW / 2; B.y = INSET.t + 60; },
    enter(B, dt) { B.hover = Math.max(42, B.hover - 60 * dt); },
    circles: B => [{ x: B.x, y: B.y - 6, r: 36 }],
    onPhase2(B) { banner("ENRAGED!", RED, 1.6, "THE SHIP IS ANGRY"); summon(B, "drone", 4, 40); },
    update(B, dt) {
      B.beamFx = B.beamFx.filter(b => (b.t += dt) < 0.35);
      if (B.tractor > 0) {
        B.tractor -= dt;
        const dx = B.x - P.x, dy = B.y - P.y, d = Math.hypot(dx, dy);
        if (Math.hypot(dx / 44, dy / 18) < 1.6 && d > 3) { P.x += dx / d * 30 * dt; P.y += dy / d * 30 * dt; B.tick = (B.tick || 0) - dt; if (B.tick <= 0) { B.tick = 0.5; hurtPlayer(6, null, "ship:tractor"); } }
      }
      const a = B.atk;
      if (!a) {
        const dx = P.x - B.x, dy = P.y - 10 - B.y, d = Math.hypot(dx, dy) || 1;
        if (d > 20) { B.x += dx / d * 20 * dt; B.y += dy / d * 20 * dt; }
        B.cd -= dt;
        if (B.cd <= 0) nextAttack(B, () => pick(G.enemies.length < 30 ? ["beams", "rings", "tractor", "drones", "beams", "rings"] : ["beams", "rings", "tractor"]));
        return;
      }
      a.t += dt;
      if (a.name === "beams") {
        if (a.step === 0) {
          a.step = 1;
          const xs = B.phase2 ? [-110, -66, -22, 22, 66, 110] : [-44, 0, 44];
          xs.forEach((ox, i) => tele("vband", { x: P.x + ox, w: 14, src: "ship:beam" }, 1.0 + i * 0.18, 24, t => { B.beamFx.push({ x: t.x, w: 14, t: 0 }); sfxThrottled("laser", 0.05); shake(0.1, 1); }, hx("#ff6ad0")));
        }
        if (a.t > 2.0) endAttack(B, 1.6);
      } else if (a.name === "rings") {
        const waves = B.phase2 ? 4 : 2;
        const k = Math.floor(a.t / 0.55);
        if (a.t > 0.3 && (a.fired || 0) < waves && k >= (a.fired || 0)) {
          a.fired = (a.fired || 0) + 1;
          ringShots(B.x, B.y - 6, B.phase2 ? 20 : 16, B.phase2 ? 58 : 48, 10, "laser", a.fired * 0.2);
        }
        if (a.t > 0.3 + waves * 0.55 + 0.4) endAttack(B, 1.6);
      } else if (a.name === "tractor") {
        if (a.step === 0) { a.step = 1; B.tractor = 2.4; sfx("charge"); }
        if (a.t > 2.6) endAttack(B, 1.4);
      } else if (a.name === "drones") {
        if (a.t > 0.4 && !a.done) { a.done = true; summon(B, "drone", B.phase2 ? 5 : 3, 36); }
        if (a.t > 0.8) endAttack(B, 1.4);
      }
    },
    draw(B) { drawShip(B); },
  },
};
function drawBoss() { const B = G.boss; if (B) B.K.draw(B); }

// small scheduler on game time (bites that start one after another)
function setTimeoutG(delay, fn) { G.fx.push({ kind: "timer", t: 0, life: delay + 0.001, fn, fired: false }); }
function slamFx(x, y, R) {
  G.rings.push({ x, y, r: 0, R, t: 0, col: RED });
  dust(x, y, 14, PALE);
  G.fx.push({ kind: "cracks", x, y, R, t: 0, life: 8, seed: Math.random() * 1000, ground: true });
  sfx("slam");
}
