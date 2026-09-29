"use strict";
// HUD and full-screen menus, drawn into the pixel buffer. Button rectangles are published in UI_RECTS for input.

let UI_RECTS = [];      // {x,y,w,h,id}
let JOY = null;         // {ox,oy,x,y} while the move stick is held
const STORE = "https://play.google.com/store/apps/details?id=com.multicastgames.butcher";
const HOOK_BTN = { x: W - 22, y: H - 24, r: 13 };
SPR.icons.armor = makeSprite([".MMMMM.", "MWMMMmM", "MWMMMmM", "MMMMMmM", ".MMMmM.", "..MmM..", "...M..."], { M: METAL[1], W: METAL[0], m: METAL[3] });
SPR.icons.hookbtn = makeSprite(["...MM...", "..M..M..", "......M.", ".....M..", "M...M...", ".MMM....", "mmmm...."], { M: METAL[0], m: METAL[2] });
SPR.icons.grenade = makeSprite(["...ww..", "..rRRr.", ".rRRRRr", ".rRpRRr", ".rrRRr.", "..rrr.."], { r: hx("#8a1a2a"), R: hx("#e04a5a"), p: hx("#ff9ac0"), w: WHITE });
SPR.icons.aura = makeSprite(["..g.g..", ".gGgGg.", "gGGGGGg", ".gGgGg.", "g.g.g.g"], { g: hx("#4a8a2a"), G: hx("#b0ff5a") });
SPR.icons.skull = makeSprite([".www.", "wwwww", "wKwKw", ".www.", ".w.w."], { w: hx("#f4ecd8"), K: INK });

function uiRect(x, y, w, h, id) { UI_RECTS.push({ x, y, w, h, id }); }
function panel(x, y, w, h, border, fill = hx("#1c0e14")) {
  rect(x - 1, y - 1, w + 2, h + 2, INK);
  rect(x, y, w, h, fill);
  rect(x, y, w, 1, border); rect(x, y + h - 1, w, 1, border); rect(x, y, 1, h, border); rect(x + w - 1, y, 1, h, border);
}
function button(x, y, w, h, label, id, color = "orange") {
  const C = { orange: [hx("#e08a1a"), hx("#ffc24a"), hx("#8a4a12")], green: [hx("#3fbf5a"), hx("#7ae88a"), hx("#1f7a3a")],
    grey: [hx("#5a5068"), hx("#8a809a"), hx("#342c40")], red: [hx("#c0283a"), hx("#ff6a6a"), hx("#6a1020")] }[color];
  rect(x - 1, y - 1, w + 2, h + 2, INK);
  rect(x, y, w, h, C[0]); rect(x, y, w, 2, C[1]); rect(x, y + h - 2, w, 2, C[2]);
  text(label, x + Math.round((w - textW(label)) / 2), y + Math.round((h - 5) / 2), WHITE);
  uiRect(x, y, w, h, id);
}
function bar(x, y, w, h, k, col, bg = hx("#3a1418")) {
  rect(x - 1, y - 1, w + 2, h + 2, INK); rect(x, y, w, h, bg);
  rect(x, y, Math.round(w * clamp(k, 0, 1)), h, col);
  rect(x, y, Math.round(w * clamp(k, 0, 1)), 1, mix(col, WHITE, 0.45));
}
const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

function drawIcon(key, cx, cy, scale = 2) {
  if (key === "cleaver") { const L = new Layer(); cleaver(L, cx - 4, cy + 3, -0.9, 1.4); L.draw(); return; }
  if (key === "sword") { const L = new Layer(); sword(L, [cx - 7, cy + 6], -0.8, 18); L.draw(); return; }
  if (key === "saw") { const L = new Layer(); sawDisc(L, cx, cy, G ? G.t * 3 : 0, 6); L.draw(); return; }
  if (key === "slam") { ellipseRing(cx, cy + 3, 10, 5, GOLD); ellipseRing(cx, cy + 3, 6, 3, PALE); blitFeet(SPR.butcher.idle0, cx, cy + 4, { scale: 0.45 }); return; }
  const s = SPR.icons[key] || SPR.icons.might;
  blit(s, cx - s.w * scale / 2, cy - s.h * scale / 2, { scale });
}

// ---------------------------------------------------------------- in-game HUD
function drawHUD() {
  UI_RECTS = [];
  text("LV" + P.lvl, 3, 3, WHITE);
  bar(22, 3, 62, 3, P.xp / P.next, hx("#8af0ff"), hx("#14242e"));
  text("HP", 3, 11, WHITE);
  bar(14, 11, 70, 4, P.hp / P.maxHp, P.hp > P.maxHp * 0.5 ? GREEN : P.hp > P.maxHp * 0.25 ? hx("#ffc23a") : RED);
  if (P.hp < P.maxHp * 0.25 && Math.floor(G.t * 4) % 2) text("!", 87, 10, RED);
  if (G.revenge) text("REVENGE X" + G.revenge, 3, 19, RED);
  let t = "", col = WHITE;
  if (G.phase === "waveA") { t = "MINI-BOSS " + fmt(MINI_AT - G.t); col = MINI_AT - G.t < 10 ? GOLD : WHITE; }
  else if (G.phase === "mini" || (G.boss && G.boss.mini)) { t = "KILL THE MINI-BOSS"; col = GOLD; }
  else if (G.phase === "waveB") { t = "BOSS " + fmt(WAVE_B - G.phaseT); col = WAVE_B - G.phaseT < 10 ? RED : WHITE; }
  else if (G.phase === "boss") { t = "BOSS FIGHT"; col = RED; }
  else if (G.phase === "done") { t = "GRAB THE CHEST!"; col = GOLD; }
  centered(t, 3, col);
  const chn = (G.ch + 1) + "-" + G.CH.name;
  centered(chn, 11, DIM);
  // top-right: kills, pause, mute
  blit(SPR.icons.skull, W - 64, 3);
  text(String(P.kills), W - 56, 4, WHITE);
  drawPauseBtn(); drawMuteBtn();
  // boss bar
  const B = G.boss;
  if (B && B.entering <= 0) {
    const w = B.mini ? 90 : 120, x = Math.round((W - w) / 2), y = H - 9;
    centered(B.name, y - 8, B.mini ? GOLD : WHITE);
    bar(x, y, w, 4, B.hp / B.maxHp, B.phase2 ? hx("#ff3a3a") : B.mini ? hx("#ff9a2a") : RED);
  }
  // hook button
  const hb = HOOK_BTN, ready = P.hookCd <= 0 && !P.hook;
  for (let y = -hb.r; y <= hb.r; y++) for (let x = -hb.r; x <= hb.r; x++) {
    const d = x * x + y * y;
    if (d > hb.r * hb.r) continue;
    let c = ready ? hx("#6a2a1a") : hx("#2a1a1a");
    if (!ready) { const a = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2); if (a < 1 - P.hookCd / hookCooldown()) c = hx("#4a2a1a"); }
    if (d > (hb.r - 1.5) ** 2) c = ready ? (Math.floor(G.t * 3) % 2 ? GOLD : hx("#e08a1a")) : INK;
    put(hb.x + x, hb.y + y, c);
  }
  blit(SPR.icons.hookbtn, hb.x - 5, hb.y - 6, { scale: 1 });
  text("HOOK", hb.x - 7, hb.y + hb.r + 1 > H - 6 ? hb.y - hb.r - 7 : hb.y + hb.r + 1, ready ? GOLD : DIM);
  uiRect(hb.x - hb.r - 4, hb.y - hb.r - 4, hb.r * 2 + 8, hb.r * 2 + 8, "hook");
  // move stick
  if (JOY) {
    ellipseRing(JOY.ox, JOY.oy, 16, 16, mix(WHITE, BLACK, 0.4), 3);
    const dx = JOY.x - JOY.ox, dy = JOY.y - JOY.oy, d = Math.hypot(dx, dy), k = d > 16 ? 16 / d : 1;
    const L = new Layer(); disc(L, JOY.ox + dx * k, JOY.oy + dy * k, 4, hx("#c8c0d0")); L.draw();
  }
  // banners
  if (G.banner) {
    const b = G.banner, k = b.t < 0.2 ? b.t / 0.2 : 1, y = Math.round(34 - (1 - k) * 12);
    if (!(b.t > b.life - 0.4 && Math.floor(b.t * 12) % 2)) {
      centered(b.s, y, b.col, 3);
      if (b.sub) centered(b.sub, y + 19, WHITE, 1);
    }
  }
  drawTutorial();
}
function drawPauseBtn() {
  rect(W - 11, 2, 9, 9, hx("#2a1a1a")); rect(W - 9, 4, 2, 5, WHITE); rect(W - 6, 4, 2, 5, WHITE);
  uiRect(W - 14, 0, 14, 14, "pause");
}
function drawMuteBtn() {
  const x = W - 24, y = 3, c = MUTED ? hx("#8a7a6a") : WHITE;
  rect(x - 1, y - 1, 11, 9, hx("#2a1a1a"));
  [[0, 2], [0, 3], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [2, 4], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5]].forEach(([a, b]) => put(x + a, y + b, c));
  if (MUTED) [[5, 1], [6, 2], [7, 3], [7, 1], [5, 3]].forEach(([a, b]) => put(x + a, y + b, RED));
  else [[5, 2], [5, 3], [7, 1], [7, 2], [7, 3], [7, 4]].forEach(([a, b]) => put(x + a, y + b, c));
  uiRect(W - 28, 0, 14, 14, "mute");
}
let MUTED = false;

function drawTutorial() {
  if (G.ch !== 0 || G.tutorialDone) return;
  const hand = (x, y, press) => blit(SPR.hand, x - 2, y + (press ? 3 : 6));
  if ((G.movedOnce || 0) < 0.8) {
    const k = (G.t * 0.8) % 1, x = 70 + Math.sin(k * Math.PI * 2) * 18, y = H - 56 + Math.cos(k * Math.PI * 2) * 8;
    hand(x, y, true);
    hint("DRAG ANYWHERE TO MOVE");
    return;
  }
  if (!G.hookedOnce) {
    let best = null, bd = 1e9;
    for (const e of G.enemies) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd && !e.elite) { bd = d; best = e; } }
    if (best && bd < 110) {
      const [sx, sy] = worldToScreen(best.x, best.y - best.h / 2);
      ellipseRing(sx, sy + 3, 8 + (G.t * 3 % 1) * 6, 5, GOLD);
      hand(sx, sy, Math.floor(G.t * 2) % 2);
      hint("TAP A GOBLIN TO HOOK AND EAT IT!");
    }
    return;
  }
  if (G.t > 40) G.tutorialDone = true;
}
function hint(s) {
  const w = textW(s) + 8, x = Math.round((W - w) / 2), y = H - 40;
  rectA(x, y, w, 11, hx("#140a0e"), 0.8);
  rect(x, y, w, 1, GOLD); rect(x, y + 10, w, 1, GOLD);
  text(s, x + 4, y + 3, GOLD);
}

// ---------------------------------------------------------------- full screens
function dim(k = 0.62, c = hx("#0a0408")) { rectA(0, 0, W, H, c, k); }
function drawCards(cards, y0, title) {
  const n = cards.length, w = 88, gap = 8, x0 = Math.round((W - (n * w + (n - 1) * gap)) / 2);
  cards.forEach((c, i) => {
    const x = x0 + i * (w + gap), y = y0, h = 84;
    const border = c.kind === "evo" ? (Math.floor(G.clock * 6) % 2 ? hx("#ff6ad0") : GOLD) : c.kind === "weapon" || c.kind === "plus2" ? GOLD : c.kind === "passive" ? hx("#8af0ff") : GREEN;
    panel(x, y, w, h, border);
    let tag = c.kind === "evo" ? "EVOLUTION!" : c.isNew ? "NEW!" : c.kind === "plus2" ? "+2 LEVELS" : (c.kind === "weapon" || c.kind === "passive") ? "LV " + c.lvl + ">" + (c.lvl + 1) : "";
    if (tag) text(tag, x + Math.round((w - textW(tag)) / 2), y + 4, c.isNew || c.kind === "evo" ? GOLD : DIM);
    drawIcon(c.icon, x + w / 2, y + 22, 2);
    const tl = wrap(c.title, 20);
    tl.forEach((l, j) => text(l, x + Math.round((w - textW(l)) / 2), y + 36 + j * 7, WHITE));
    wrap(c.desc, 20).slice(0, 5).forEach((l, j) => text(l, x + Math.round((w - textW(l)) / 2), y + 38 + tl.length * 7 + j * 7, PALE));
    uiRect(x, y, w, h, "card" + i);
  });
}
function drawScreen() {
  const m = G.mode;
  if (m === "levelup") {
    UI_RECTS = [];
    dim(0.55);
    centered("LEVEL UP!", 8, GOLD, 3);
    text("LV " + P.lvl, 4, 4, WHITE);
    drawCards(G.cards, 34);
    if (G.rerolls > 0) button(W / 2 - 34, H - 30, 68, 14, "REROLL (" + G.rerolls + ")", "reroll", "grey");
    return;
  }
  if (m === "reward") {
    UI_RECTS = [];
    dim(0.6);
    centered(G.rewardKind === "boss" ? "TREASURE!" : "MINI-BOSS LOOT", 8, GOLD, G.rewardKind === "boss" ? 3 : 2);
    drawCards(G.cards, 34);
    centered(G.rewardKind === "boss" ? "+1 REROLL" : "+25 HP", H - 26, G.rewardKind === "boss" ? hx("#8af0ff") : GREEN);
    return;
  }
  if (m === "intro") {
    UI_RECTS = [];
    dim(0.5);
    centered("CHAPTER " + (G.ch + 1) + " / " + CHAPTERS.length, 36, WHITE, 2);
    centered(G.CH.name, 56, GOLD, 3);
    centered("MINI-BOSS: " + BOSSES[G.CH.mini].name, 86, PALE);
    centered("BOSS: " + BOSSES[G.CH.boss].name, 96, hx("#ff8a8a"));
    if (G.ch === 0) centered("DRAG TO MOVE   TAP ENEMIES TO HOOK", 114, DIM);
    if (Math.floor((G.introT || 0) * 2) % 2 === 0) centered("TAP TO START", 134, WHITE);
    uiRect(0, 0, W, H, "start");
    return;
  }
  if (m === "clear") {
    UI_RECTS = [];
    dim(0.7);
    centered("CHAPTER CLEAR!", 16, GOLD, 3);
    const s = G.stats;
    const lines = [
      "BOSS DOWN IN " + (G.bossTime ? Math.round(G.bossTime) + "S" : "-"),
      "KILLS THIS CHAPTER " + G.chKills, "TOTAL KILLS " + s.kills + "   EATEN " + s.devours,
      "LEVEL " + P.lvl + "   HP " + Math.ceil(P.hp) + "/" + P.maxHp,
      "WEAPONS: " + ownedWeapons().map(w => UPG[w].name.split(" ")[0] + " " + P.w[w]).join(", "),
    ];
    lines.forEach((l, i) => centered(l, 48 + i * 10, i ? WHITE : PALE));
    centered("NEXT: " + CHAPTERS[G.ch + 1].name, 106, GOLD);
    centered("+50% HP BEFORE THE NEXT CHAPTER", 116, GREEN);
    button(W / 2 - 40, H - 36, 80, 16, "CONTINUE", "next", "green");
    return;
  }
  if (m === "dead") {
    UI_RECTS = [];
    dim(0.62, hx("#3a0008"));
    centered("YOU DIED", 24, RED, 4);
    const top = Object.entries(G.stats.hits).sort((a, b) => b[1] - a[1])[0];
    centered("CHAPTER " + (G.ch + 1) + ": " + G.CH.name, 58, WHITE);
    if (top) centered("HURT MOST BY: " + niceSrc(top[0]), 68, PALE);
    centered("RED ZONES HIT WHEN THEY FILL UP - STEP OUT!", 80, DIM);
    button(W / 2 - 90, 102, 84, 16, "RETRY CHAPTER", "retry", "orange");
    button(W / 2 + 6, 102, 84, 16, "GET THE GAME", "store", "green");
    button(W / 2 - 30, 130, 60, 14, "TITLE", "title", "grey");
    return;
  }
  if (m === "victory") {
    UI_RECTS = [];
    dim(0.72);
    centered("YOU ATE THE WORLD!", 12, GOLD, 3);
    const s = G.stats;
    [
      "TIME " + fmt(s.time) + "   LEVEL " + P.lvl + "   DEATHS " + s.deaths,
      "KILLS " + s.kills + "   EATEN " + s.devours,
      "BOSS TIMES: " + s.bossTimes.map(t => t + "S").join(" "),
      "EVOLUTIONS: " + (Object.keys(P.evo).map(k => EVOS[k].name).join(", ") || "NONE"),
    ].forEach((l, i) => centered(l, 42 + i * 10, i ? WHITE : PALE));
    centered("HOOK. DEVOUR. EVOLVE.", 90, GOLD, 2);
    button(W / 2 - 90, 118, 84, 16, "PLAY AGAIN", "again", "orange");
    button(W / 2 + 6, 118, 84, 16, "GET THE GAME", "store", "green");
    return;
  }
  if (m === "pause") {
    UI_RECTS = [];
    dim(0.6);
    centered("PAUSED", 30, WHITE, 3);
    button(W / 2 - 42, 70, 84, 16, "RESUME", "resume", "green");
    button(W / 2 - 42, 94, 84, 16, "RETRY CHAPTER", "retry", "orange");
    button(W / 2 - 42, 118, 84, 14, "TITLE", "title", "grey");
    drawMuteBtn();
    return;
  }
}
function niceSrc(s) {
  if (s.startsWith("tele:")) s = s.slice(5);
  if (s.startsWith("shot:")) return "PROJECTILES";
  const k = s.split(":")[0];
  if (BOSSES[k]) return BOSSES[k].name + (s.includes(":") ? " " + s.split(":")[1].toUpperCase() : "");
  if (ETYPES[k]) return k.toUpperCase() + "S";
  return s.toUpperCase();
}
function drawTitle(t, save) {
  UI_RECTS = [];
  centered("BUTCHER HERO", 20, GOLD, 4);
  centered("PIXEL RAMPAGE", 46, WHITE, 2);
  centered("6 CHAPTERS - 12 BOSSES - 30 MINUTES OF CARNAGE", 64, PALE);
  button(W / 2 - 40, 108, 80, 16, "NEW RUN", "new", "orange");
  if (save) button(W / 2 - 56, 130, 112, 14, "CONTINUE CHAPTER " + (save.ch + 1), "continue", "green");
  centered("DRAG = MOVE    TAP ENEMY / HOOK BUTTON = HOOK", H - 14, DIM);
  drawMuteBtn();
}
