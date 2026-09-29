"use strict";
// World rendering into the 256x160 pixel buffer. Works headless too (sim screenshots).

let camX = 0, camY = 0;
const worldToScreen = (x, y) => [x - camX, y - camY];
const TRAIL = [hx("#f0ffff"), hx("#8ef0ff"), hx("#3aa8e0"), hx("#1a5a9a")];
const METEOR = makeSprite(["..oo..", ".oOOo.", "oOYYOo", "oOYYOo", ".oOOo.", "..oo.."], { o: hx("#a02a1a"), O: hx("#ff6a1a"), Y: hx("#ffe060") });
const ROCKSPR = makeSprite([".kkk.", "kKKkk", "kKkkk", ".kkk."], { K: hx("#9a8a88"), k: hx("#5e4e4c") });
const GUT = makeSprite([".rR.", "rRRr", ".rr."], { r: hx("#8a1a2a"), R: hx("#e04a5a") });
const BLOB_G = makeSprite([".gG.", "gGGg", ".gg."], { g: hx("#3aa82a"), G: hx("#9aff6a") });
const SPIKE = makeSprite(["..W..", "..W..", ".WwW.", ".WwW.", "WwwbW", "wwbbw"], { W: WHITE, w: hx("#bff6ff"), b: hx("#6ab8d8") });

function drawWorld() {
  const sm = G.shake > 0 ? G.shakeMag : 0;
  let fx_ = P.x, fy_ = P.y - 14;
  const B = G.boss;
  if (B && !B.dying) {
    const c = bossCircles(B)[0];
    fx_ += clamp((c.x - P.x) * 0.3, -W / 2 + 70, W / 2 - 70);
    fy_ += clamp((c.y - 10 - P.y) * 0.3, -H / 2 + 60, H / 2 - 70);
  }
  G.camX = G.camX === undefined ? fx_ : lerp(G.camX, fx_, 0.08);
  G.camY = G.camY === undefined ? fy_ : lerp(G.camY, fy_, 0.08);
  camX = Math.round(clamp(G.camX - W / 2, 0, AW - W) + (sm ? rnd(-sm, sm) : 0));
  camY = Math.round(clamp(G.camY - H / 2, 0, AH - H) + (sm ? rnd(-sm, sm) : 0));
  const A = G.arena;
  for (let y = 0; y < H; y++) {
    const ay = clamp(y + camY, 0, AH - 1), row = ay * AW;
    for (let x = 0; x < W; x++) pix[y * W + x] = A.d[row + clamp(x + camX, 0, AW - 1)];
  }
  for (const f of G.fx) if (f.kind === "cracks") drawCracks(f);
  for (const p of G.puddles) {
    const [sx, sy] = worldToScreen(p.x, p.y);
    const col = p.col === "lava" ? hx("#ff6a1a") : hx("#6ae03a");
    fillEllipseDither(sx, sy, p.r, p.r * 0.6, col, 0.5 + 0.2 * Math.sin(G.t * 8 + p.x), p.life < 1 && (G.t * 8) % 1 < 0.5);
    if (Math.random() < 0.3) put(sx + rnd(-p.r, p.r) * 0.7, sy + rnd(-p.r, p.r) * 0.4, p.col === "lava" ? hx("#ffe060") : hx("#caff9a"));
  }
  if (P.w.aura) drawAura();
  for (const t of G.tele) drawTele(t);
  for (const r of G.rings) {
    const [sx, sy] = worldToScreen(r.x, r.y), c = r.col || GOLD;
    ellipseRing(sx, sy, r.r, r.r * 0.6, r.t < 0.15 ? WHITE : c);
    ellipseRing(sx, sy, r.r * 0.8, r.r * 0.48, r.col ? mix(r.col, WHITE, 0.4) : PALE, 3);
  }
  for (const f of G.fx) if (f.kind === "quake") {
    const [sx, sy] = worldToScreen(f.x, f.y);
    fillEllipseDither(sx, sy, f.R, f.R * 0.6, hx("#8a5a2a"), 0.35 * (1 - f.t / f.life), false);
  }
  for (const pl of G.piles) {
    const [sx, sy] = worldToScreen(pl.x, pl.y), sh = pl.t > 1.8 ? Math.round(Math.sin(G.t * 40)) : 0;
    blitFeet(SPR.bonepile, sx + sh, sy);
  }
  for (const d of G.drops) {
    const [sx, sy] = worldToScreen(d.x, d.y);
    if (sx < -6 || sx > W + 6 || sy < -6 || sy > H + 6) continue;
    const bob = Math.round(Math.sin(d.t * 5) * 1.2);
    darken(sx, sy + 1); darken(sx - 1, sy + 1); darken(sx + 1, sy + 1);
    blitFeet(d.kind === "heart" ? SPR.heart : d.kind === "big" ? SPR.bigmeat : SPR.meat, sx, sy - 1 + bob);
    if ((d.t * 1.3 + d.x * 0.1) % 1 < 0.12) { put(sx + 1, sy - 5 + bob, WHITE); put(sx, sy - 6 + bob, WHITE); put(sx + 2, sy - 6 + bob, WHITE); put(sx + 1, sy - 7 + bob, WHITE); }
  }
  if (G.chest) {
    const c = G.chest, [sx, sy] = worldToScreen(c.x, c.y);
    const drop = c.t < 0.5 && !c.opened ? (1 - c.t / 0.5) * 60 : 0;
    shadowEllipse(sx, sy + 1, 14, 3);
    if (!c.opened && Math.floor(G.t * 4) % 2) fillEllipseDither(sx, sy - 8, 20, 14, c.big ? GOLD : PALE, 0.25);
    blitFeet(c.opened ? SPR.chestOpen : SPR.chest, sx + (!c.opened && c.t > 0.5 ? Math.round(Math.sin(G.t * 20) * 0.6) : 0), sy - drop, { scale: c.big ? 1.8 : 1.3 });
    if (!c.opened && c.t > 0.6) text(c.big ? "TREASURE!" : "CHEST", sx - textW(c.big ? "TREASURE!" : "CHEST") / 2, sy - 34 + Math.sin(G.t * 4) * 2, GOLD);
  }
  const actors = [];
  for (const e of G.enemies) actors.push({ y: e.y, e });
  actors.push({ y: P.y, p: true });
  if (G.boss) actors.push({ y: G.boss.K.fixed ? G.boss.y - 30 : G.boss.y, b: true });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) { if (a.e) drawEnemy(a.e); else if (a.p) drawPlayer(); else drawBoss(); }
  for (const s of G.saws) { const L = new Layer(), [sx, sy] = worldToScreen(s.x, s.y); sawDisc(L, sx, sy, s.spin, P.evo.boomer ? 6 : 5); L.draw(); }
  for (const l of G.lobs) drawLob(l);
  for (const s of G.shots) drawShot(s);
  for (const f of G.fx) drawFx(f);
  for (const p of G.parts) {
    const [sx, sy] = worldToScreen(p.x, p.y - p.z);
    if (p.bone) { blit(SPR.bone, sx - 3, sy - 2); continue; }
    put(sx, sy, p.c);
    if (!p.spark && p.z > 3) put(sx, sy + 1, p.c);
  }
  for (const p of G.pops) {
    if (p.t > p.life * 0.7 && Math.floor(p.t * 14) % 2) continue;
    const [sx, sy] = worldToScreen(p.x, p.y - p.t * 16);
    text(p.s, sx - textW(p.s, p.k) / 2, sy, p.col, p.k);
  }
  drawWeather();
}
function drawCracks(f) {
  const r = seeded(Math.floor(f.seed)), [sx, sy] = worldToScreen(f.x, f.y), c = mix(hx(BIOMES[G.CH.key].crack), BLACK, 0.35);
  const fade = f.t > f.life - 1 ? (f.life - f.t) : 1;
  if (fade < 0.5 && Math.floor(G.t * 10) % 2) return;
  for (let k = 0; k < 9; k++) {
    let x = sx, y = sy;
    const a = k * 0.7 + r() * 0.4, len = f.R * 0.4 + r() * f.R * 0.4;
    for (let j = 0; j < len; j++) { x += Math.cos(a) + (r() - 0.5) * 0.8; y += Math.sin(a) * 0.6; put(x, y, c); }
  }
}
function drawAura() {
  const R = auraR(), [sx, sy] = worldToScreen(P.x, P.y - 4), col = P.evo.plague ? hx("#b0ff5a") : hx("#8ac04a");
  for (let y = Math.floor(sy - R * 0.62); y <= sy + R * 0.62; y++)
    for (let x = Math.floor(sx - R); x <= sx + R; x++) {
      const d = ((x - sx) / R) ** 2 + ((y - sy) / (R * 0.62)) ** 2;
      if (d > 1) continue;
      const wave = (x * 3 + y * 5 + Math.floor(G.t * 6)) % 11 === 0;
      if (wave || (d > 0.85 && (x + y + Math.floor(G.t * 8)) % 4 === 0)) tint(x, y, col, 0.55);
    }
  for (let i = 0; i < 4; i++) {
    const a = G.t * 1.3 + i * 1.57, k = (G.t * 0.7 + i * 0.25) % 1;
    put(sx + Math.cos(a) * R * 0.7, sy + Math.sin(a) * R * 0.4 - k * 10, col);
  }
}
function drawTele(t) {
  const k = clamp(t.t / t.dur, 0, 1), col = t.col || RED;
  const blink = k > 0.7 && Math.floor(G.t * 16) % 2;
  if (t.shape === "circle") {
    const [sx, sy] = worldToScreen(t.x, t.y);
    fillEllipseDither(sx, sy, t.r, t.r * 0.62, col, 0.15 + k * 0.5, false);
    ellipseRing(sx, sy, t.r, t.r * 0.62, blink ? WHITE : col);
    ellipseRing(sx, sy, t.r * k, t.r * 0.62 * k, col, 2);
    if (t.fall && k > 0.55) {
      const h = (1 - (k - 0.55) / 0.45) * 90;
      if (t.fall === "bone") blit(SPR.bone, sx - 3, sy - 2 - h);
      else { blitFeet(METEOR, sx + h * 0.4, sy - h, { scale: 1.4 }); for (let i = 1; i < 5; i++) put(sx + h * 0.4 + i * 2, sy - h - 4 - i * 3, hx("#ffa02a")); }
    }
  } else if (t.shape === "band" || t.shape === "vband") {
    const vert = t.shape === "vband";
    const x0 = vert ? t.x - t.w / 2 - camX : 0, y0 = vert ? 0 : t.y - t.h / 2 - camY;
    const w = vert ? t.w : W, h = vert ? H : t.h;
    for (let y = Math.floor(y0); y < y0 + h; y++) for (let x = Math.floor(x0); x < x0 + w; x++)
      if (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] < 16 * (0.12 + k * 0.45)) tint(x, y, col, 0.6);
    const c = blink ? WHITE : col;
    if (vert) { line(x0, 0, x0, H, c); line(x0 + w, 0, x0 + w, H, c); } else { line(0, y0, W, y0, c); line(0, y0 + h, W, y0 + h, c); }
  } else if (t.shape === "line") {
    const [x1, y1] = worldToScreen(t.x1, t.y1), [x2, y2] = worldToScreen(t.x2, t.y2);
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1))), nx = -(y2 - y1) / n, ny = (x2 - x1) / n;
    for (let i = 0; i <= n; i += 1) {
      const cx = x1 + (x2 - x1) * i / n, cy = y1 + (y2 - y1) * i / n;
      for (let o = -t.w / 2; o <= t.w / 2; o++) {
        const x = Math.round(cx + nx * o), y = Math.round(cy + ny * o);
        if (Math.abs(o) > t.w / 2 - 1) put(x, y, blink ? WHITE : col);
        else if (i / n < k + 0.02 && BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] < 9) tint(x, y, col, 0.6);
      }
    }
  }
}
function drawLob(l) {
  const k = clamp(l.at / l.dur, 0, 1), x = lerp(l.x0, l.x, k), y = lerp(l.y0, l.y, k) - Math.sin(Math.PI * k) * l.hgt;
  const [sx, sy] = worldToScreen(x, y), [gx, gy] = worldToScreen(lerp(l.x0, l.x, k), lerp(l.y0, l.y, k));
  darken(gx, gy); darken(gx + 1, gy);
  const spr = l.col === "rock" ? ROCKSPR : l.col === "bone" ? SPR.bone : l.col === "poison" ? BLOB_G : GUT;
  blit(spr, sx - spr.w / 2, sy - spr.h / 2, { scale: l.col === "rock" ? 2 : 1 });
}
function drawShot(s) {
  const [sx, sy] = worldToScreen(s.x, s.y);
  if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) return;
  const c = shotColor(s.col);
  if (s.col === "bone") { blit(SPR.bone, sx - 3, sy - 2); return; }
  for (const [a, b] of [[-1, 0], [2, 0], [0, -1], [0, 2], [1, -1], [1, 2], [-1, 1], [2, 1]]) put(sx + a, sy + b, INK);
  put(sx, sy, WHITE); put(sx + 1, sy, c); put(sx, sy + 1, c); put(sx + 1, sy + 1, c);
  put(sx - Math.sign(s.vx), sy - Math.sign(s.vy), mix(c, BLACK, 0.3));
}
function drawFx(f) {
  const k = f.t / f.life;
  if (f.kind === "boom") {
    const [sx, sy] = worldToScreen(f.x, f.y), r = f.R * easeOut(Math.min(1, k * 2));
    fillEllipseDither(sx, sy, r, r * 0.65, k < 0.4 ? hx("#ffe060") : hx("#ff6a1a"), 0.7 * (1 - k), false);
    ellipseRing(sx, sy, r, r * 0.65, k < 0.3 ? WHITE : hx("#ff9a2a"));
  } else if (f.kind === "spike") {
    const [sx, sy] = worldToScreen(f.x, f.y);
    blitFeet(SPIKE, sx, sy + Math.round(k > 0.7 ? (k - 0.7) * 20 : 0), { scale: 1.4 });
  } else if (f.kind === "vine" || f.kind === "lavawave") {
    const y0 = f.y - f.h / 2 - camY, col = f.kind === "vine" ? [hx("#2a7030"), hx("#6ac04a")] : [hx("#ff6a1a"), hx("#ffe060")];
    for (let y = Math.floor(y0); y < y0 + f.h; y++) for (let x = 0; x < W; x++)
      if ((x + y * 3 + Math.floor(G.t * 30)) % 5 < 2) put(x, y, col[(x + y) % 2]);
  } else if (f.kind === "vinev" || f.kind === "lavawavev") {
    const x0 = f.x - f.w / 2 - camX, col = f.kind === "vinev" ? [hx("#2a7030"), hx("#6ac04a")] : [hx("#ff6a1a"), hx("#ffe060")];
    for (let y = 0; y < H; y++) for (let x = Math.floor(x0); x < x0 + f.w; x++)
      if ((x * 3 + y + Math.floor(G.t * 30)) % 5 < 2) put(x, y, col[(x + y) % 2]);
  }
}
function drawEnemy(e) {
  const [sx, sy] = worldToScreen(e.x, e.y);
  if (sx < -30 || sx > W + 30 || sy < -10 || sy > H + 60) return;
  const sc = e.scale * e.shrink;
  if (!e.T.fly) shadowEllipse(sx, sy + 1, 5 * sc, 1.6 * sc);
  else shadowEllipse(sx, sy + 6, 4, 1.3);
  if (e.state === "aim") drawTele({ shape: "line", x1: e.x, y1: e.y, x2: e.x + e.cdx * 90, y2: e.y + e.cdy * 90, w: 12, t: e.st, dur: 0.75 });
  const fr = e.spr[Math.floor(e.walkT) % e.spr.length];
  const lift = e.T.fly ? Math.round(Math.sin(G.t * 4 + e.wob) * 2) - 5 : -Math.round(e.z || 0);
  blitFeet(fr, sx, sy + lift, { scale: sc, flip: e.face < 0, flash: e.flash > 0 ? WHITE : (e.stun > 0 && Math.floor(G.t * 10) % 2 ? CYAN : 0) });
  if (e.elite && e.hp < e.maxHp && !e.grabbed) {
    const w = 14, x0 = Math.round(sx - w / 2), y0 = Math.round(sy - e.h - 4);
    rect(x0 - 1, y0 - 1, w + 2, 4, INK); rect(x0, y0, w, 2, hx("#3a1418")); rect(x0, y0, Math.round(w * e.hp / e.maxHp), 2, RED);
  }
  if (e.stun > 0) for (let i = 0; i < 3; i++) put(sx + Math.cos(G.t * 6 + i * 2.1) * 6, sy - e.h - 2 + Math.sin(G.t * 6 + i * 2.1) * 2, GOLD);
}
function drawArm(L, root, hand, s, skin = SKIN) {
  const r = Math.max(1.8, 2.7 * s);
  for (let i = 0; i <= 8; i++) disc(L, lerp(root[0], hand[0], i / 8), lerp(root[1], hand[1], i / 8), r, skin.S);
  for (let i = 0; i <= 8; i++) {
    const x = lerp(root[0], hand[0], i / 8), y = lerp(root[1], hand[1], i / 8);
    L.set(x, y - r + 0.6, skin.k); L.set(x, y + r - 0.4, skin.s);
  }
  disc(L, hand[0], hand[1], Math.max(2.2, 3 * s), skin.k);
}
function bloodTrail(cx, cy, rx, ry, a, cols, len = 24) {
  for (let k = 1; k < len; k++) {
    const b = a - k * 0.045, fade = 1 - k / len;
    const c = cols[k < 4 ? 0 : k < 12 ? 1 : k < 19 ? 2 : 3];
    const x = cx + Math.cos(b) * rx, y = cy + Math.sin(b) * ry, r = 2.4 * fade + 0.3;
    for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
      if ((xx - x) ** 2 + ((yy - y) * 1.2) ** 2 <= r * r) put(xx, yy, c);
  }
}
function drawPlayer() {
  const s = P.scale;
  const [sx, sy] = worldToScreen(P.x, P.y);
  const bob = P.moving ? Math.round(Math.abs(Math.sin(P.walkT * Math.PI))) : (Math.floor(G.t * 2) % 2);
  shadowEllipse(sx, sy + 1, 13 * s, 3.5 * s);
  const bx = sx, by = sy - BUTCHER_BELLY_UP * s - bob;
  const back = new Layer(), front = new Layer();
  const handL = [bx - 16 * s, by - s], handR = [bx + 16 * s, by - s];
  const H = P.hook;
  if (H) {
    const [hx_, hy_] = worldToScreen(H.x, H.y);
    const hand = H.side > 0 ? handR : handL;
    if (H.phase === "eat") { handL[0] = bx + H.side * 6 * s; handL[1] = by + 2 * s; handR[0] = bx + H.side * 14 * s; handR[1] = by - 4 * s; }
    else {
      const a = Math.atan2(hy_ - by, hx_ - bx);
      hand[0] = bx + Math.cos(a) * 18 * s; hand[1] = by + Math.sin(a) * 12 * s;
      chainLine(front, hand, [hx_, hy_], H.phase === "pull" ? 0 : 2);
      if (H.phase !== "pull") cleaver(front, hx_, hy_, Math.atan2(hy_ - hand[1], hx_ - hand[0]) + (H.phase === "fly" ? H.t * 14 : 0), 1.3);
    }
  }
  if (P.w.cleaver) {
    const n = cleaverCount(), rx = orbitRx(), ry = rx * 0.62, sz = cleaverSize();
    for (let i = 0; i < n; i++) bloodTrail(bx, by, rx, ry, P.ang + i * Math.PI * 2 / n, BLOOD, P.evo.razor ? 24 : 18);
    for (let i = 0; i < n; i++) {
      const a = P.ang + i * Math.PI * 2 / n, cx = bx + Math.cos(a) * rx, cy = by + Math.sin(a) * ry;
      const L = Math.sin(a) < 0 ? back : front;
      chainLine(L, Math.cos(a) < 0 ? handL : handR, [cx - Math.cos(a) * 5, cy - Math.sin(a) * 5], 1);
      cleaver(L, cx, cy, Math.atan2((cy - by) * rx / ry, cx - bx) + 0.35, sz);
    }
  }
  if (P.w.sword) {
    const rx = 58 * Math.sqrt(s), ry = rx * 0.62;
    for (const off of P.evo.twin ? [0, Math.PI] : [0]) {
      const a = P.ang2 + off;
      bloodTrail(bx, by, rx * 1.22, ry * 1.22, a, TRAIL, 26);
      const hx_ = bx + Math.cos(a) * rx, hy_ = by + Math.sin(a) * ry, ang = Math.atan2((hy_ - by) * rx / ry, hx_ - bx);
      chainLine(back, [bx + 3 * s, by - 9 * s], [hx_ - Math.cos(ang) * 6, hy_ - Math.sin(ang) * 6], 5);
      sword(Math.sin(a) < 0 ? back : front, [hx_, hy_], ang, 24 + 2 * P.w.sword);
    }
  }
  back.draw();
  const legs = P.moving ? [1, 0, 2, 0][Math.floor(P.walkT * 2) % 4] : 0;
  const justHit = P.hitT > 0 && G.mode === "play", blink = !justHit && P.inv > 0 && P.inv < 0.6 && Math.floor(P.inv * 20) % 2 && G.mode === "play";
  if (!blink) {
    blitFeet(SPR.butcher[P.mouth + legs], sx, sy - bob, { scale: s, flip: P.face < 0, flash: justHit ? WHITE : 0 });
    const arms = new Layer();
    drawArm(arms, [bx - 8 * s, by - 6 * s], handL, s);
    drawArm(arms, [bx + 8 * s, by - 6 * s], handR, s);
    arms.draw(INK, justHit ? WHITE : 0);
  }
  front.draw();
  if (H && (H.phase === "pull" || H.phase === "eat")) {
    const e = H.target, [ex, ey] = worldToScreen(e.x, e.y);
    blitFeet(e.spr[0], ex, ey, { scale: e.scale * e.shrink, flip: H.side > 0, flash: e.flash > 0 ? WHITE : 0 });
  }
  if (P.slowT > 0) for (let i = 0; i < 4; i++) put(sx + Math.cos(G.t * 3 + i * 1.6) * 10 * s, sy - 20 * s + Math.sin(G.t * 3 + i * 1.6) * 5, CYAN);
}

// weather in screen space
const WX = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() }));
function drawWeather() {
  const B = BIOMES[G.CH.key], dt = 1 / 60;
  for (const w of WX) {
    if (B.weather === "leaves") { w.x += (8 + w.s * 10) * dt + Math.sin(G.t * 2 + w.s * 6) * 0.2; w.y += (14 + w.s * 12) * dt; }
    else if (B.weather === "snow") { w.x += Math.sin(G.t + w.s * 6) * 0.25; w.y += (10 + w.s * 14) * dt; }
    else if (B.weather === "rain") { w.x -= 60 * dt; w.y += 190 * dt; }
    else if (B.weather === "sand") { w.x += (70 + w.s * 50) * dt; w.y += Math.sin(G.t * 3 + w.s * 9) * 0.2; }
    else if (B.weather === "embers") { w.y -= (12 + w.s * 16) * dt; w.x += Math.sin(G.t * 2 + w.s * 7) * 0.3; }
    else if (B.weather === "fog") { w.x += (6 + w.s * 6) * dt; }
    if (w.y > H) { w.y = -2; w.x = Math.random() * W; }
    if (w.y < -3) { w.y = H + 1; w.x = Math.random() * W; }
    if (w.x > W) { w.x = -2; } if (w.x < -3) { w.x = W + 1; }
    const c = B.fx[Math.floor(w.s * B.fx.length)];
    if (B.weather === "rain") { put(w.x, w.y, c); put(w.x - 0.4, w.y - 2, c); put(w.x - 0.8, w.y - 4, c); }
    else if (B.weather === "fog") { for (let i = 0; i < 6; i++) tint(w.x + i, w.y + (i % 2), c, 0.25); }
    else { put(w.x, w.y, c); if (B.weather === "leaves" && w.s > 0.5) put(w.x + 1, w.y, c); }
  }
}
