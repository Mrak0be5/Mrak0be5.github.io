"use strict";
// Butcher Hero: Pixel Rampage — the rules. No DOM here: the browser (ui.js) and the balance sim (sim.js) both drive it.

let sfx = () => {}, sfxThrottled = () => {}, buzz = () => {};
let music = { play() {}, stop() {} };
let saveProgress = () => {};
let onMode = () => {};
let inputVector = () => ({ x: 0, y: 0 });

// ---------------------------------------------------------------- content
// A chapter: wave A until MINI_AT, the mini-boss, wave B for WAVE_B seconds, the boss, the chest. ~5 min each, 6 chapters.
const MINI_AT = 110, WAVE_B = 90;
const SPAWN = [[1.2, 0.45], [1.05, 0.38], [0.9, 0.3], [0.85, 0.26], [0.72, 0.2], [0.65, 0.16]];   // [start, fastest] interval per chapter
const CH_HP = [1, 1.7, 2.9, 4.5, 7.6, 13.5];
const CHAPTERS = [
  { key: "forest", name: "AUTUMN FOREST", horde: "goblin", mini: "chief", boss: "skeleton",
    mix: [["goblin", 1, 0], ["brute", 0.1, 40]] },
  { key: "snow", name: "FROZEN PEAKS", horde: "ice", mini: "alpha", boss: "troll",
    mix: [["ice", 1, 0], ["goblin", 0.3, 0], ["yeti", 0.07, 25], ["brute", 0.05, 70]] },
  { key: "jungle", name: "RAIN JUNGLE", horde: "lizard", mini: "lizking", boss: "hydra",
    mix: [["lizard", 1, 0], ["goblin", 0.25, 0], ["plant", 0.1, 15], ["brute", 0.07, 60]] },
  { key: "grave", name: "CURSED GRAVEYARD", horde: "bat", mini: "knight", boss: "dark",
    mix: [["skel", 1, 0], ["bat", 0.7, 0], ["brute", 0.06, 50], ["plant", 0.05, 80]] },
  { key: "lava", name: "LAVA PITS", horde: "slime", mini: "magma", boss: "golem",
    mix: [["slime", 0.8, 0], ["imp", 0.55, 0], ["skel", 0.35, 0], ["yeti", 0.05, 70]] },
  { key: "desert", name: "ALIEN DESERT", horde: "drone", mini: "commander", boss: "ship",
    mix: [["alien", 0.7, 0], ["drone", 0.65, 0], ["lizard", 0.3, 0], ["imp", 0.12, 40]] },
];

const ETYPES = {
  goblin: { spr: "goblin", hp: 18, spd: 22, dmg: 8, xp: 1, r: 5 },
  brute: { spr: "brute", hp: 85, spd: 15, dmg: 14, xp: 5, r: 8, scale: 1.5, elite: true },
  ice: { spr: "ice", hp: 24, spd: 24, dmg: 8, xp: 1, r: 5 },
  yeti: { spr: "yeti", hp: 110, spd: 17, dmg: 12, xp: 6, r: 8, elite: true, charge: true },
  lizard: { spr: "lizard", hp: 22, spd: 32, dmg: 9, xp: 1, r: 5 },
  plant: { spr: "plant", hp: 45, spd: 0, dmg: 6, xp: 3, r: 6, shoot: { cd: 3.2, spd: 55, dmg: 9, col: "green" } },
  skel: { spr: "skel", hp: 26, spd: 21, dmg: 9, xp: 1, r: 5, revive: 0.3 },
  bat: { spr: "bat", hp: 10, spd: 46, dmg: 6, xp: 1, r: 4, fly: true, anim: 9 },
  imp: { spr: "imp", hp: 30, spd: 24, dmg: 8, xp: 2, r: 5, keep: 62, shoot: { cd: 2.5, spd: 66, dmg: 10, col: "fire" } },
  slime: { spr: "slime", hp: 40, spd: 18, dmg: 10, xp: 1, r: 6, hop: true, split: "slimelet" },
  slimelet: { spr: "slime", hp: 12, spd: 28, dmg: 6, xp: 0, r: 4, hop: true, scale: 0.6 },
  alien: { spr: "alien", hp: 36, spd: 21, dmg: 8, xp: 2, r: 5, keep: 56, shoot: { cd: 2.4, spd: 72, dmg: 9, col: "pink" } },
  drone: { spr: "drone", hp: 22, spd: 40, dmg: 7, xp: 1, r: 5, fly: true },
};

const WEAPONS = ["cleaver", "sword", "saw", "slam", "grenade", "aura"];
const PASSIVES = ["meaty", "speed", "might", "magnet", "hook", "glutton", "regen", "armor"];
const MAX_WEAPONS = 5;
const UPG = {
  cleaver: { name: "CLEAVERS", max: 6, desc: l => l === 0 ? "CHAINED CLEAVERS SPIN AROUND YOU" : (l === 2 || l === 4 || l === 5 ? "+1 CLEAVER ON A CHAIN" : "+25% CLEAVER DAMAGE") },
  sword: { name: "CHAIN SWORD", max: 5, desc: l => l === 0 ? "A SWORD ON A CHAIN BURSTS FROM YOUR BACK" : "+30% DAMAGE, SPINS FASTER, LONGER" },
  saw: { name: "SAW BLADE", max: 5, desc: l => l === 0 ? "THROWS A BUZZING SAW AT ENEMIES" : l === 3 ? "THROWS TWO SAWS" : "+1 PIERCE, +20% DMG, FASTER" },
  slam: { name: "BELLY SLAM", max: 5, desc: l => l === 0 ? "SHOCKWAVE AROUND YOU EVERY 4 SEC" : "BIGGER, HARDER, MORE OFTEN" },
  grenade: { name: "GUT GRENADE", max: 5, desc: l => l === 0 ? "LOBS EXPLODING GUTS AT ENEMIES" : l % 2 ? "+1 GRENADE PER THROW" : "+25% DAMAGE, BIGGER BLAST" },
  aura: { name: "STENCH", max: 5, desc: l => l === 0 ? "YOUR SMELL HURTS EVERYONE NEAR" : "+30% DAMAGE, WIDER CLOUD" },
  meaty: { name: "MEATY", max: 5, desc: () => "+20 MAX HP AND HEAL 20" },
  speed: { name: "FAST FEET", max: 5, desc: () => "+10% MOVE SPEED" },
  might: { name: "BUTCHER MIGHT", max: 5, desc: () => "+15% DAMAGE FOR EVERYTHING" },
  magnet: { name: "MEAT MAGNET", max: 5, desc: () => "+40% MEAT PICKUP RANGE" },
  hook: { name: "HOOK MASTER", max: 5, desc: () => "-15% HOOK COOLDOWN, +25% HOOK DMG" },
  glutton: { name: "GLUTTON", max: 5, desc: () => "EATING HEALS +6 AND GIVES +20% XP" },
  regen: { name: "REGEN", max: 5, desc: () => "+0.5 HP EVERY SECOND" },
  armor: { name: "IRON GUT", max: 5, desc: () => "-8% DAMAGE TAKEN" },
};
// evolution: weapon at max level + the partner passive -> offered in boss chests
const EVOS = {
  razor: { name: "RAZOR STORM", weapon: "cleaver", passive: "might", desc: "6 HUGE CLEAVERS, +60% DAMAGE, FASTER" },
  twin: { name: "TWIN BLADES", weapon: "sword", passive: "speed", desc: "TWO CHAIN SWORDS FROM YOUR BACK" },
  boomer: { name: "BOOMERANG SAWS", weapon: "saw", passive: "magnet", desc: "3 SAWS THAT COME BACK AND NEVER STOP" },
  quake: { name: "EARTHQUAKE", weapon: "slam", passive: "meaty", desc: "HUGE SLAMS THAT CRACK THE EARTH" },
  mortar: { name: "MEAT MORTAR", weapon: "grenade", passive: "glutton", desc: "EVERY BLAST SPLITS INTO 4 MORE" },
  plague: { name: "PLAGUE", weapon: "aura", passive: "regen", desc: "HUGE ROT CLOUD, KILLS INSIDE HEAL YOU" },
};

let G = null;   // the run
let P = null;   // the player

// ---------------------------------------------------------------- run / chapter lifecycle
function newPlayer() {
  return {
    x: AW / 2, y: AH / 2 + 30, hp: 100, maxHp: 100, lvl: 1, xp: 0, next: xpNeed(1), scale: 1, face: 1, walkT: 0, moving: false,
    inv: 0, mouth: "idle", devours: 0, kills: 0,
    w: { cleaver: 1, sword: 0, saw: 0, slam: 0, grenade: 0, aura: 0 },
    p: { meaty: 0, speed: 0, might: 0, magnet: 0, hook: 0, glutton: 0, regen: 0, armor: 0 },
    evo: {}, ang: 0, ang2: -Math.PI / 2, sawT: 1, slamT: 2, grenT: 2, auraT: 0, hookCd: 0, hook: null, regenAcc: 0, pulled: null,
  };
}
const xpNeed = l => Math.round(10 + 7 * l + l * l / 6);
function newRun(opts = {}) {
  P = newPlayer();
  G = { mode: "title", rerolls: 2, stats: { kills: 0, devours: 0, dmgTaken: 0, deaths: 0, time: 0, bossTimes: [], hits: {} },
    god: !!opts.god, clock: 0, rng: Math.random };
}
function snapshot() {
  return JSON.parse(JSON.stringify({ hp: P.hp, maxHp: P.maxHp, lvl: P.lvl, xp: P.xp, next: P.next, scale: P.scale, w: P.w, p: P.p,
    evo: P.evo, devours: P.devours, kills: P.kills, rerolls: G.rerolls, stats: G.stats }));
}
function restoreSnapshot(s) {
  const deaths = G.stats.deaths;
  P = newPlayer();
  for (const k of ["hp", "maxHp", "lvl", "xp", "next", "scale", "w", "p", "evo", "devours", "kills"]) P[k] = JSON.parse(JSON.stringify(s[k]));
  G.rerolls = s.rerolls;
  G.stats = JSON.parse(JSON.stringify(s.stats));
  G.stats.deaths = deaths;
}
function prepChapter(idx) {
  const CH = CHAPTERS[idx];
  Object.assign(G, {
    ch: idx, CH, arena: makeArena(CH.key, 1000 + idx * 77), t: 0, phase: "waveA", phaseT: 0,
    enemies: [], piles: [], drops: [], parts: [], pops: [], shots: [], lobs: [], saws: [], rings: [], tele: [], puddles: [], fx: [],
    boss: null, chest: null, banner: null, spawnT: 0.6, hordeT: 22, shake: 0, shakeMag: 0, pendingLevels: 0, chKills: 0,
  });
  P.x = AW / 2; P.y = AH / 2 + 30; P.hook = null; P.pulled = null; P.inv = 1.5; P.mouth = "idle";
}
function startChapter(idx, fromSnapshot) {
  if (fromSnapshot) restoreSnapshot(fromSnapshot);
  else if (idx > 0) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.5);
  prepChapter(idx);
  G.introT = 0;
  G.snap = snapshot();
  saveProgress(idx, G.snap);
  setMode("intro");
  music.play(idx, false);
}
function setMode(m) { G.mode = m; onMode(m); }
function playerDied() {
  G.stats.deaths++;
  P.hook = null;
  setMode("dead");
  music.stop();
  sfx("dead");
}
function retryChapter() {
  const r = Math.min(3, (G.revenge || 0) + 1), ch = G.ch;
  startChapter(ch, G.snap);
  G.revenge = r;
  banner("REVENGE x" + r, RED, 2.4, "+" + r * 15 + "% DAMAGE, -" + r * 10 + "% DAMAGE TAKEN");
}

// ---------------------------------------------------------------- derived stats
const might = () => (1 + 0.15 * P.p.might) * (1 + 0.15 * (G.revenge || 0));
const moveSpeed = () => 42 * (1 + 0.1 * P.p.speed) * (P.hook && P.hook.phase === "eat" ? 0.55 : 1) * (P.slowT > 0 ? 0.6 : 1);
const magnetR = () => 34 * (1 + 0.4 * P.p.magnet);
const hookCooldown = () => 2.6 * Math.pow(0.85, P.p.hook);
const cleaverCount = () => P.evo.razor ? 6 : [0, 2, 2, 3, 3, 4, 5][P.w.cleaver];
const cleaverDmg = () => 10 * (1 + 0.25 * ((P.w.cleaver >= 2) + (P.w.cleaver >= 4))) * might() * (P.evo.razor ? 1.6 : 1);
const cleaverSize = () => P.evo.razor ? 1.7 : 1.2;
const orbitRx = () => 30 * P.scale + 3 * cleaverCount() + (P.evo.razor ? 6 : 0);
const auraR = () => (22 + 4 * P.w.aura) * (P.evo.plague ? 1.5 : 1) * Math.sqrt(P.scale);
const chMul = () => [1, 1.25, 1.45, 1.85, 2.25, 3.4][G.ch];
const belly = (s = P.scale) => [P.x, P.y - BUTCHER_BELLY_UP * s];

// ---------------------------------------------------------------- helpers
function popup(s, x, y, col, k = 1, life = 0.8) { if (G.pops.length < 70) G.pops.push({ s, x, y, col, k, t: 0, life }); }
function banner(s, col = GOLD, life = 2.2, sub = "") { G.banner = { s, col, t: 0, life, sub }; }
function shake(t, m = 2) { if (t >= G.shake || m > G.shakeMag) { G.shake = Math.max(G.shake, t); G.shakeMag = Math.max(m, G.shake > 0 ? G.shakeMag : 0); } }
function addPart(p) { if (G.parts.length < 700) G.parts.push(p); }
function blood(x, y, n, spread = 1, h = 6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = rnd(15, 55) * spread;
    addPart({ x, y, z: h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rnd(20, 70), c: BLOOD[(Math.random() * 3) | 0], life: 2, stain: Math.random() < 0.35 });
  }
}
function sparks(x, y, n, col, sp = 50, life = 0.35) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rnd(0.4, 1) * sp;
    addPart({ x, y, z: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 0, c: col, life, spark: true });
  }
}
function dust(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rnd(10, 30);
    addPart({ x, y, z: 1, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5, vz: 0, c: col, life: 0.5, spark: true });
  }
}
function bones(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rnd(20, 50);
    addPart({ x, y, z: 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rnd(40, 80), bone: true, life: 3.5, c: 0 });
  }
}
function stainArena(x, y, c, r = 0) {
  const A = G.arena;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + 0.5) continue;
    const xx = (x + dx) | 0, yy = (y + dy) | 0;
    if (xx >= 0 && xx < AW && yy >= 0 && yy < AH) A.d[yy * AW + xx] = c;
  }
}
function clampArena(o, pad = 0) {
  o.x = clamp(o.x, INSET.l + pad, AW - INSET.r - pad);
  o.y = clamp(o.y, INSET.t + pad, AH - INSET.b - pad);
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function tele(shape, o, dur, dmg, fire, col) {
  const t = Object.assign({ shape, t: 0, dur, dmg, fire, col }, o);
  G.tele.push(t);
  return t;
}
function puddle(x, y, r, life, dmg, col = "poison") { G.puddles.push({ x, y, r, life, dmg, col, tick: 0.3, max: life }); }
function shoot(x, y, ang, sp, dmg, col, r = 2.5) { G.shots.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r, dmg, col, life: 5 }); }
function lob(x, y, tx, ty, dur, hgt, col, land) { G.lobs.push({ x0: x, y0: y, x: tx, y: ty, at: 0, dur, hgt, col, land }); }

// ---------------------------------------------------------------- damage
function hurtPlayer(dmg, from, src = "?") {
  if (P.inv > 0 || G.god || G.mode !== "play") return;
  dmg = Math.max(1, Math.round(dmg * chMul() * (1 - 0.08 * P.p.armor) * (1 - 0.1 * (G.revenge || 0))));
  P.hp -= dmg; P.inv = 0.7; P.hitT = 0.12;
  G.stats.dmgTaken += dmg;
  G.stats.hits[src] = (G.stats.hits[src] || 0) + dmg;
  popup("-" + dmg, P.x, P.y - 40 * P.scale, RED, 1);
  blood(P.x, P.y - 12, 6);
  shake(0.25, 2);
  sfx("hurt"); buzz(60);
  if (from) {
    const a = Math.atan2(P.y - from.y, P.x - from.x);
    P.x += Math.cos(a) * 6; P.y += Math.sin(a) * 6; clampArena(P, 4);
  }
  if (P.hp <= 0) { P.hp = 0; playerDied(); }
}
function hurtEnemy(e, dmg, kx = 0, ky = 0, quiet = false) {
  if (e.dead) return;
  const crit = Math.random() < 0.08;
  dmg = Math.round(dmg * (crit ? 2 : 1));
  e.hp -= dmg; e.flash = 0.09;
  if (!e.elite || crit) { e.x += kx; e.y += ky; }
  if (!quiet || crit) popup(String(dmg), e.x + rnd(-3, 3), e.y - e.h - 2, crit ? GOLD : WHITE, 1, 0.5);
  if (Math.random() < 0.4) blood(e.x, e.y - e.h / 2, 2, 0.6, e.h / 2);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e, eaten = false) {
  if (e.dead) return;
  e.dead = true; P.kills++; G.chKills++; G.stats.kills++;
  if (P.evo.plague && Math.hypot(e.x - P.x, e.y - P.y) < auraR()) P.hp = Math.min(P.maxHp, P.hp + 1);
  if (eaten) return;
  blood(e.x, e.y - e.h / 2, e.elite ? 12 : 6, e.elite ? 1.3 : 1, e.h / 2);
  if (Math.random() < 0.35) bones(e.x, e.y - 3, e.elite ? 3 : 1);
  stainArena(e.x, e.y, BLOOD[3], e.elite ? 3 : 2);
  stainArena(e.x + rnd(-3, 3), e.y + rnd(-2, 2), BLOOD[2], 1);
  if (e.xp > 0) G.drops.push({ x: e.x, y: e.y, kind: e.xp >= 5 ? "big" : "meat", xp: Math.max(1, Math.round(e.xp * (1 + G.ch * 0.2))), t: rnd(0, 6) });
  if (Math.random() < (e.elite ? 0.25 : 0.012)) G.drops.push({ x: e.x + 6, y: e.y, kind: "heart", xp: 0, t: 0 });
  if (e.T.split) for (let i = 0; i < 2; i++) spawnEnemy(e.T.split, e.x + (i ? 5 : -5), e.y + rnd(-3, 3));
  if (e.T.revive && !e.revived && Math.random() < e.T.revive) G.piles.push({ x: e.x, y: e.y, t: 0, type: e.type });
  sfxThrottled("squish", 0.07);
}
function hitsBoss(x, y, r, key, dmg, cd = 0.35) {
  const B = G.boss;
  if (!B || B.dying || B.entering > 0 || B.untouchable) return false;
  for (const c of bossCircles(B)) {
    if (Math.hypot(x - c.x, y - c.y) < r + c.r) {
      if ((B.hitCd[key] || 0) > 0) return true;
      B.hitCd[key] = cd;
      const crit = Math.random() < 0.08, d = Math.round(dmg * (crit ? 2 : 1));
      B.hp -= d; B.dmgTaken = (B.dmgTaken || 0) + d;
      if ((B.flashCd || 0) <= 0) { B.flash = 0.06; B.flashCd = 0.25; }
      popup(String(d), x + rnd(-4, 4), y - 6, crit ? GOLD : WHITE, crit ? 2 : 1, 0.6);
      if (Math.random() < 0.5) sparks(x, y, 3, WHITE, 40);
      sfxThrottled("hit", 0.06);
      if (B.hp <= 0) bossDefeated();
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- enemies
function spawnEnemy(type, x, y) {
  const T = ETYPES[type];
  const hpMul = CH_HP[G.ch] * (1 + G.t / 300);
  const sprs = SPR[T.spr], sc = T.scale || 1;
  const e = {
    type, T, x, y, hp: T.hp * hpMul, maxHp: T.hp * hpMul, spd: T.spd * rnd(0.9, 1.1), dmg: T.dmg, xp: T.xp, r: T.r * sc,
    spr: sprs, scale: sc, h: sprs[0].h * sc, elite: !!T.elite, flash: 0, stun: 0, hitCd: {}, walkT: rnd(0, 2), face: 1,
    shootCd: T.shoot ? rnd(1, T.shoot.cd) : 0, state: "walk", st: 0, wob: rnd(0, 6), shrink: 1, hopT: rnd(0, 0.8), z: 0,
  };
  G.enemies.push(e);
  return e;
}
function spawnPoint(minD = 85) {
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * Math.PI * 2, d = rnd(195, 225);
    const o = { x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d * 0.8 };
    clampArena(o, 4);
    if (Math.hypot(o.x - P.x, o.y - P.y) > minD) return o;
  }
  return { x: P.x > AW / 2 ? INSET.l + 6 : AW - INSET.r - 6, y: rnd(INSET.t + 10, AH - INSET.b - 10) };
}
function pickType() {
  const opts = G.CH.mix.filter(m => G.t >= m[2]);
  const bonus = G.phase === "waveB" ? 1.8 : 1;
  const w = opts.map(m => m[1] * (ETYPES[m[0]].elite ? bonus : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i][0]; }
  return opts[0][0];
}
function spawning(dt) {
  if (G.phase === "done") return;
  const [s0, s1] = SPAWN[G.ch];
  let interval = s0 - (s0 - s1) * Math.min(1, G.t / 200);
  if (G.phase === "waveB") interval *= 0.9;
  if (G.phase === "mini") interval *= 2.0;
  if (G.phase === "boss") interval *= 2.6;
  G.spawnT -= dt;
  if (G.spawnT <= 0 && G.enemies.length < 75) {
    const p = spawnPoint();
    spawnEnemy(pickType(), p.x, p.y);
    G.spawnT = interval;
  }
  if (G.phase === "waveA" || G.phase === "waveB") {
    G.hordeT -= dt;
    if (G.hordeT <= 0) {
      G.hordeT = 24;
      popup("HORDE!", P.x, P.y - 58, RED, 2, 1.2);
      sfx("warning");
      const n = 9 + G.ch * 2 + (G.phase === "waveB" ? 4 : 0);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, o = { x: P.x + Math.cos(a) * 150, y: P.y + Math.sin(a) * 100 };
        clampArena(o, 4);
        spawnEnemy(G.CH.horde, o.x, o.y);
      }
    }
  }
}
function updatePhase(dt) {
  G.phaseT += dt;
  if (G.phase === "waveA" && G.t >= MINI_AT) {
    G.phase = "mini"; G.phaseT = 0;
    spawnBoss(G.CH.mini);
    banner("MINI-BOSS!", GOLD, 2.2, BOSSES[G.CH.mini].name);
    sfx("warning");
  } else if (G.phase === "waveB" && G.phaseT >= WAVE_B) {
    G.phase = "boss"; G.phaseT = 0;
    spawnBoss(G.CH.boss);
    banner("WARNING!", RED, 2.6, BOSSES[G.CH.boss].name);
    sfx("warning"); music.play(G.ch, true);
  }
}
function updateEnemies(dt) {
  const list = G.enemies;
  for (const e of list) {
    e.flash = Math.max(0, e.flash - dt);
    for (const k in e.hitCd) e.hitCd[k] -= dt;
    if (e.grabbed) continue;
    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
    let mx = 0, my = 0;
    if (e.stun > 0) e.stun -= dt;
    else if (e.T.charge && e.state !== "walk") {
      e.st += dt;
      if (e.state === "aim" && e.st > 0.9) { e.state = "dash"; e.st = 0; sfx("whoosh"); }
      else if (e.state === "dash") { mx = e.cdx * 150; my = e.cdy * 150; if (e.st > 0.55) { e.state = "walk"; e.chargeCd = 3.5; } }
    } else if (e.T.keep) {
      const s = d > e.T.keep + 12 ? 1 : d < e.T.keep - 12 ? -1 : 0, side = Math.sin(G.t * 0.7 + e.wob);
      mx = dx / d * e.spd * s - dy / d * e.spd * 0.45 * side;
      my = dy / d * e.spd * s + dx / d * e.spd * 0.45 * side;
    } else if (e.T.hop) {
      e.hopT = (e.hopT + dt) % 0.9;
      if (e.hopT < 0.38) { mx = dx / d * e.spd * 2.4; my = dy / d * e.spd * 2.4; e.z = Math.sin(e.hopT / 0.38 * Math.PI) * 5; }
      else e.z = 0;
    } else if (e.spd > 0) {
      mx = dx / d * e.spd; my = dy / d * e.spd;
      if (e.T.fly) { mx += Math.cos(G.t * 3 + e.wob) * 22; my += Math.sin(G.t * 2.4 + e.wob) * 16; }
      if (e.T.charge) {
        e.chargeCd = (e.chargeCd === undefined ? 1.5 : e.chargeCd) - dt;
        if (e.chargeCd <= 0 && d < 95) { e.state = "aim"; e.st = 0; e.cdx = dx / d; e.cdy = dy / d; }
      }
    }
    e.x += mx * dt; e.y += my * dt;
    if (Math.abs(mx) > 1) e.face = mx > 0 ? 1 : -1; else if (e.spd === 0 || e.T.keep) e.face = dx > 0 ? 1 : -1;
    if (mx || my || e.T.fly) e.walkT += dt * (e.T.anim || 3);
    if (e.T.shoot && e.stun <= 0) {
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 165) {
        e.shootCd = e.T.shoot.cd * rnd(0.85, 1.2);
        shoot(e.x, e.y - e.h * 0.6, Math.atan2(dy, dx), e.T.shoot.spd, e.T.shoot.dmg, e.T.shoot.col);
        sfxThrottled("pew", 0.12);
      }
    }
    if (d < e.r + 6 * P.scale && e.z < 3) hurtPlayer(e.state === "dash" ? e.dmg * 1.4 : e.dmg, e, e.type);
  }
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.grabbed) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.grabbed) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
      if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
      const d = Math.hypot(dx, dy);
      if (d < rr && d > 0.01) {
        const push = (rr - d) / 2, ux = dx / d, uy = dy / d, wa = a.elite ? 0.3 : 1, wb = b.elite ? 0.3 : 1;
        a.x -= ux * push * wa; a.y -= uy * push * wa; b.x += ux * push * wb; b.y += uy * push * wb;
      }
    }
    clampArena(a, 2);
  }
  G.enemies = list.filter(e => !e.dead);
  for (const p of G.piles) {
    p.t += dt;
    if (p.t > 2.6) { p.done = true; const e = spawnEnemy(p.type, p.x, p.y); e.revived = true; e.hp *= 0.5; dust(p.x, p.y, 6, WHITE); }
  }
  G.piles = G.piles.filter(p => !p.done);
}

// ---------------------------------------------------------------- player
function updatePlayer(dt) {
  if (P.pulled) {
    const B = P.pulled, dx = B.x - P.x, dy = B.y - P.y, d = Math.hypot(dx, dy);
    if (d < 20 || !G.boss) { P.pulled = null; if (G.boss && d < 20 && B.onPulled) B.onPulled(); }
    else { P.x += dx / d * 170 * dt; P.y += dy / d * 170 * dt; }
  } else {
    const v = inputVector();
    const l = Math.hypot(v.x, v.y);
    P.moving = l > 0.15;
    if (P.moving) {
      const k = Math.min(1, l);
      P.x += v.x / l * k * moveSpeed() * dt; P.y += v.y / l * k * moveSpeed() * dt;
      if (Math.abs(v.x) > 0.1) P.face = v.x > 0 ? 1 : -1;
      P.walkT += dt * 5;
      G.movedOnce = (G.movedOnce || 0) + dt;
    }
  }
  clampArena(P, 4);
  P.inv = Math.max(0, P.inv - dt);
  P.hitT = Math.max(0, (P.hitT || 0) - dt);
  P.slowT = Math.max(0, (P.slowT || 0) - dt);
  P.hookCd = Math.max(0, P.hookCd - dt);
  if (P.p.regen) {
    P.regenAcc += dt * 0.5 * P.p.regen;
    if (P.regenAcc >= 1) { const h = Math.floor(P.regenAcc); P.hp = Math.min(P.maxHp, P.hp + h); P.regenAcc -= h; }
  }
  updateHook(dt);
  updateWeapons(dt);
  const mr = magnetR();
  for (const d of G.drops) {
    d.t += dt;
    const dd = Math.hypot(P.x - d.x, P.y - 6 - d.y);
    if (d.t > 20 || G.vacuum > 0) d.pull = true;
    if (dd < mr || d.pull) {
      d.pull = true;
      const sp = 150 + d.t * 30;
      d.x += (P.x - d.x) / dd * sp * dt; d.y += (P.y - 6 - d.y) / dd * sp * dt;
      if (dd < 6) {
        d.got = true;
        if (d.kind === "heart") { const h = 25; P.hp = Math.min(P.maxHp, P.hp + h); popup("+" + h + " HP", P.x, P.y - 44 * P.scale, GREEN); sfx("heal"); }
        else { gainXp(d.xp); sfxThrottled("pickup", 0.05); }
      }
    }
  }
  G.drops = G.drops.filter(d => !d.got);
  G.vacuum = Math.max(0, (G.vacuum || 0) - dt);
  if (G.drops.length > 140) { const extra = G.drops.splice(0, G.drops.length - 140); let x = 0; extra.forEach(d => x += d.xp); gainXp(x); }
  const C = G.chest;
  if (C && !C.opened) {
    C.t += dt;
    if (C.t > 5) { const dx = P.x - C.x, dy = P.y - C.y, d = Math.hypot(dx, dy) || 1; C.x += dx / d * 40 * dt; C.y += dy / d * 40 * dt; }
    if (Math.hypot(P.x - C.x, P.y - C.y) < 16) openChest();
  }
}
function gainXp(n) {
  P.xp += n;
  while (P.xp >= P.next) { P.xp -= P.next; P.lvl++; P.next = xpNeed(P.lvl); G.pendingLevels++; }
}

// ---------------------------------------------------------------- hook & devour
function handPos(side, s = P.scale) {
  const b = belly(s);
  return [b[0] + side * 16 * s, b[1] - s];
}
function tryHook(target) {
  if (P.hook || P.hookCd > 0 || !target || P.pulled) { if (P.hookCd > 0) sfx("nope"); return false; }
  const tx = target === G.boss ? bossCircles(G.boss)[0].x : target.x;
  const side = tx >= P.x ? 1 : -1;
  P.face = side;
  const h = handPos(side);
  P.hook = { phase: "fly", target, x: h[0], y: h[1], side, t: 0 };
  sfx("whoosh");
  G.hookedOnce = true;
  return true;
}
function hookTargetAt(wx, wy) {
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    if (e.grabbed || e.dead) continue;
    const d = Math.hypot(e.x - wx, e.y - e.h / 2 - wy);
    if (d < bd) { bd = d; best = e; }
  }
  if (best && bd < 24) return best;
  if (G.boss && !G.boss.dying && !G.boss.untouchable)
    for (const c of bossCircles(G.boss)) if (Math.hypot(c.x - wx, c.y - wy) < c.r + 10) return G.boss;
  if (best && bd < 60) return best;
  return null;
}
function hookNearest() {
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    if (e.grabbed) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (d < bd && d < 150) { bd = d; best = e; }
  }
  if (!best && G.boss && !G.boss.dying && !G.boss.untouchable) best = G.boss;
  return tryHook(best);
}
function updateHook(dt) {
  const H = P.hook;
  if (!H) return;
  H.t += dt;
  const tgt = H.target, isBoss = tgt === G.boss && !!G.boss;
  if (H.phase === "fly") {
    if (!isBoss && (tgt.dead || tgt.grabbed || !G.enemies.includes(tgt))) { H.phase = "back"; return; }
    const tp = isBoss ? bossCircles(tgt)[0] : { x: tgt.x, y: tgt.y - tgt.h / 2 };
    const dx = tp.x - H.x, dy = tp.y - H.y, d = Math.hypot(dx, dy), sp = 280;
    if (d < sp * dt + 4) {
      H.x = tp.x; H.y = tp.y;
      const dmg = 40 * (1 + 0.25 * P.p.hook) * might();
      if (isBoss) {
        hitsBoss(tp.x, tp.y, 4, "hook", dmg * 1.5, 0);
        H.phase = "back"; sfx("hit"); shake(0.12, 1);
      } else if (tgt.elite && tgt.hp > tgt.maxHp * 0.35) {
        hurtEnemy(tgt, dmg); tgt.stun = 1.1;
        const a = Math.atan2(P.y - tgt.y, P.x - tgt.x); tgt.x += Math.cos(a) * 18; tgt.y += Math.sin(a) * 18;
        popup("STUN", tgt.x, tgt.y - tgt.h - 8, CYAN);
        H.phase = "back"; sfx("hit"); shake(0.1, 1);
      } else {
        tgt.grabbed = true; H.phase = "pull"; H.t = 0; sfx("hit");
        blood(tgt.x, tgt.y - tgt.h / 2, 5);
        popup(tgt.elite ? "EXECUTE!" : "HOOKED!", tgt.x, tgt.y - tgt.h - 6, GOLD);
      }
    } else { H.x += dx / d * sp * dt; H.y += dy / d * sp * dt; }
    if (H.t > 1.2) H.phase = "back";
  } else if (H.phase === "pull") {
    const hold = { x: P.x + H.side * 13 * P.scale, y: P.y + 2 };
    const dx = hold.x - tgt.x, dy = hold.y - tgt.y, d = Math.hypot(dx, dy), sp = 240;
    if (d < sp * dt + 1) { tgt.x = hold.x; tgt.y = hold.y; H.phase = "eat"; H.t = 0; H.chomps = 0; }
    else { tgt.x += dx / d * sp * dt; tgt.y += dy / d * sp * dt; if (Math.random() < 0.5) dust(tgt.x, tgt.y, 1, PALE); }
    H.x = tgt.x; H.y = tgt.y - tgt.h / 2;
  } else if (H.phase === "eat") {
    tgt.x = P.x + H.side * 12 * P.scale + (Math.random() < 0.5 ? 1 : -1); tgt.y = P.y + 1;
    P.mouth = "open";
    const ct = [0.2, 0.4, 0.6];
    if (H.chomps < 3 && H.t >= ct[H.chomps]) {
      H.chomps++;
      tgt.shrink = [0.72, 0.45, 0.15][H.chomps - 1];
      sfx("chomp"); buzz(25);
      blood(P.x + H.side * 4 * P.scale, P.y, 5, 0.8, 22 * P.scale);
      if (Math.random() < 0.6) bones(P.x, P.y, 1);
      shake(0.06, 1);
    }
    if (H.chomps > 0 && H.t - ct[H.chomps - 1] < 0.08) P.mouth = "bite";
    if (H.t >= 0.78) {
      const xp = Math.max(1, Math.round((tgt.xp || 1) * 2 * (1 + G.ch * 0.2) * (1 + 0.2 * P.p.glutton)));
      const heal = 6 + 6 * P.p.glutton;
      killEnemy(tgt, true);
      P.devours++; G.stats.devours++;
      P.scale = Math.min(1.4, P.scale + 0.004);
      P.hp = Math.min(P.maxHp, P.hp + heal);
      popup("+" + xp + "XP", P.x, P.y - 48 * P.scale, PALE, 1, 0.9);
      popup("+" + heal, P.x + 14, P.y - 38 * P.scale, GREEN, 1, 0.9);
      gainXp(xp);
      P.mouth = "idle"; P.hook = null; P.hookCd = hookCooldown();
      if (!G.ateOnce) { G.ateOnce = true; popup("EAT TO GROW & HEAL!", P.x, P.y - 64, GOLD, 1, 2.2); }
      return;
    }
    H.x = tgt.x; H.y = tgt.y - tgt.h / 2;
  } else if (H.phase === "back") {
    const h = handPos(H.side), dx = h[0] - H.x, dy = h[1] - H.y, d = Math.hypot(dx, dy), sp = 340;
    if (d < sp * dt + 2) { P.hook = null; P.hookCd = hookCooldown(); return; }
    H.x += dx / d * sp * dt; H.y += dy / d * sp * dt;
  }
}

// ---------------------------------------------------------------- weapons
function hitEnemiesAt(x, y, r, key, cd, dmg, kb = 4, quiet = false) {
  let n = 0;
  for (const e of G.enemies) {
    if (e.grabbed || (e.hitCd[key] || 0) > 0) continue;
    if (Math.hypot(e.x - x, e.y - e.h / 2 - y) < e.r + r) {
      e.hitCd[key] = cd;
      const k = Math.atan2(e.y - P.y, e.x - P.x);
      hurtEnemy(e, dmg, Math.cos(k) * kb, Math.sin(k) * kb, quiet);
      n++;
    }
  }
  return n;
}
function updateWeapons(dt) {
  const b = belly();
  if (P.w.cleaver) {
    P.ang += dt * (3.2 + 0.15 * P.w.cleaver) * (P.evo.razor ? 1.3 : 1);
    const n = cleaverCount(), rx = orbitRx(), ry = rx * 0.62, dmg = cleaverDmg(), sz = cleaverSize();
    for (let i = 0; i < n; i++) {
      const a = P.ang + i * Math.PI * 2 / n, cx = b[0] + Math.cos(a) * rx, cy = b[1] + Math.sin(a) * ry;
      if (hitEnemiesAt(cx, cy, 5 * sz, "c", 0.38, dmg, 4)) sfxThrottled("slash", 0.06);
      hitsBoss(cx, cy, 5 * sz, "c" + i, dmg, 0.3);
    }
  }
  if (P.w.sword) {
    const L = P.w.sword;
    P.ang2 += dt * (2.2 + 0.25 * (L - 1));
    const rx = 58 * Math.sqrt(P.scale), ry = rx * 0.62, dmg = 22 * (1 + 0.3 * (L - 1)) * might() * (P.evo.twin ? 1.4 : 1);
    const len = 24 + 2 * L;
    for (const off of P.evo.twin ? [0, Math.PI] : [0]) {
      const a = P.ang2 + off, hx_ = b[0] + Math.cos(a) * rx, hy_ = b[1] + Math.sin(a) * ry;
      const ang = Math.atan2((hy_ - b[1]) * rx / ry, hx_ - b[0]);
      for (const u of [6, len * 0.55, len - 3]) {
        const px_ = hx_ + Math.cos(ang) * u, py_ = hy_ + Math.sin(ang) * u;
        if (hitEnemiesAt(px_, py_, 4, "s", 0.45, dmg, 6)) sfxThrottled("slash", 0.06);
        hitsBoss(px_, py_, 5, "s" + off, dmg, 0.4);
      }
    }
  }
  if (P.w.saw) {
    const L = P.w.saw;
    P.sawT -= dt;
    if (P.sawT <= 0) {
      P.sawT = 1.6 * Math.pow(0.88, L - 1);
      const n = P.evo.boomer ? 3 : L >= 4 ? 2 : 1;
      const targets = G.enemies.filter(e => !e.grabbed).sort((a, c) => dist(a, P) - dist(c, P));
      for (let i = 0; i < n; i++) {
        const t = targets[i] || (G.boss && !G.boss.dying ? bossCircles(G.boss)[0] : null);
        let a = t ? Math.atan2((t.y - (t.h ? t.h / 2 : 0)) - b[1], t.x - b[0]) : Math.random() * 6.28;
        if (!targets[i] && i > 0) a += i * 0.6;
        G.saws.push({ x: b[0], y: b[1], vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, pierce: P.evo.boomer ? 999 : 2 + L,
          dmg: 14 * (1 + 0.2 * (L - 1)) * might() * (P.evo.boomer ? 1.3 : 1), spin: 0, life: P.evo.boomer ? 2.2 : 1.6, age: 0, id: Math.random() });
      }
      sfx("saw");
    }
  }
  for (const s of G.saws) {
    s.age += dt;
    if (P.evo.boomer && s.age > 0.7) {
      const dx = P.x - s.x, dy = P.y - 10 - s.y, d = Math.hypot(dx, dy) || 1;
      s.vx += dx / d * 500 * dt; s.vy += dy / d * 500 * dt;
      const sp = Math.hypot(s.vx, s.vy); if (sp > 150) { s.vx *= 150 / sp; s.vy *= 150 / sp; }
      if (d < 8 && s.age > 1) s.life = 0;
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.spin += dt * 20; s.life -= dt;
    const key = "saw" + s.id;
    for (const e of G.enemies) {
      if (e.grabbed || (e.hitCd[key] || 0) > 0) continue;
      if (Math.hypot(e.x - s.x, e.y - e.h / 2 - s.y) < e.r + 5) {
        e.hitCd[key] = P.evo.boomer ? 0.3 : 99; s.pierce--;
        hurtEnemy(e, s.dmg, s.vx * 0.03, s.vy * 0.03);
        if (Math.random() < 0.5) sparks(s.x, s.y, 2, WHITE, 40);
      }
    }
    if (hitsBoss(s.x, s.y, 5, key, s.dmg, P.evo.boomer ? 0.3 : 99)) s.pierce -= 2;
    if (s.pierce <= 0 || s.x < INSET.l - 30 || s.x > AW - INSET.r + 30 || s.y < INSET.t - 40 || s.y > AH + 10) s.life = 0;
  }
  G.saws = G.saws.filter(s => s.life > 0);
  if (P.w.slam) {
    const L = P.w.slam;
    P.slamT -= dt;
    if (P.slamT <= 0) {
      P.slamT = P.evo.quake ? 2.5 : 4 * Math.pow(0.9, L - 1);
      const R = (30 + 5 * L) * Math.sqrt(P.scale) * (P.evo.quake ? 1.4 : 1), dmg = 18 * (1 + 0.25 * (L - 1)) * might() * (P.evo.quake ? 1.3 : 1);
      slamAt(P.x, P.y, R, dmg);
      if (P.evo.quake) G.fx.push({ kind: "quake", x: P.x, y: P.y, R: R * 0.7, t: 0, life: 1.5, tick: 0, dmg: dmg * 0.25 });
    }
  }
  for (const f of G.fx) if (f.kind === "quake") {
    f.tick -= dt;
    if (f.tick <= 0) {
      f.tick = 0.3;
      for (const e of G.enemies) if (!e.grabbed && Math.hypot(e.x - f.x, (e.y - f.y) * 1.4) < f.R) hurtEnemy(e, f.dmg, 0, 0, true);
      hitsBoss(f.x, f.y, f.R, "quake", f.dmg, 0.3);
    }
  }
  if (P.w.grenade) {
    const L = P.w.grenade;
    P.grenT -= dt;
    if (P.grenT <= 0) {
      P.grenT = 3 * Math.pow(0.9, L - 1);
      const n = 1 + Math.floor(L / 2), dmg = 30 * (1 + 0.25 * Math.floor((L - 1) / 2)) * might(), R = 18 + 2 * L;
      const pool = G.enemies.filter(e => !e.grabbed && Math.hypot(e.x - P.x, e.y - P.y) < 130);
      for (let i = 0; i < n; i++) {
        let tx, ty;
        const t = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        if (t) { tx = t.x; ty = t.y; }
        else if (G.boss && !G.boss.dying) { const c = bossCircles(G.boss)[0]; tx = c.x; ty = c.y + 10; }
        else { tx = P.x + rnd(-60, 60); ty = P.y + rnd(-40, 40); }
        lob(b[0], b[1], tx, ty, 0.6, 26, "gut", l => explode(l.x, l.y, R, dmg, P.evo.mortar ? 4 : 0));
      }
    }
  }
  if (P.w.aura) {
    P.auraT -= dt;
    if (P.auraT <= 0) {
      P.auraT = 0.5;
      const R = auraR(), dmg = 4 * (1 + 0.3 * (P.w.aura - 1)) * might() * (P.evo.plague ? 1.6 : 1);
      for (const e of G.enemies) if (!e.grabbed && Math.hypot(e.x - P.x, (e.y - P.y) * 1.3) < R) hurtEnemy(e, dmg, 0, 0, true);
      hitsBoss(P.x, P.y - 6, R * 0.8, "aura", dmg, 0.5);
    }
  }
  for (const r of G.rings) { r.t += dt; r.r = r.R * easeOut(Math.min(1, r.t / 0.3)); }
  G.rings = G.rings.filter(r => r.t < 0.45);
}
function slamAt(x, y, R, dmg) {
  G.rings.push({ x, y, r: 0, R, t: 0 });
  for (const e of G.enemies) {
    const d = Math.hypot(e.x - x, (e.y - y) * 1.4);
    if (d < R && !e.grabbed) { const a = Math.atan2(e.y - y, e.x - x); hurtEnemy(e, dmg, Math.cos(a) * 12, Math.sin(a) * 12); }
  }
  hitsBoss(x, y, R, "slam", dmg, 1);
  shake(0.15, 1); sfx("stomp"); dust(x, y, 12, PALE);
}
function explode(x, y, R, dmg, split) {
  for (const e of G.enemies) if (!e.grabbed && Math.hypot(e.x - x, (e.y - y) * 1.3) < R + e.r) hurtEnemy(e, dmg, 0, 0, true);
  hitsBoss(x, y, R, "gren" + Math.random(), dmg, 0);
  G.fx.push({ kind: "boom", x, y, R, t: 0, life: 0.35 });
  blood(x, y, 6, 1.2, 3);
  sfxThrottled("boom", 0.05);
  if (split) for (let i = 0; i < split; i++) {
    const a = i / split * Math.PI * 2 + Math.random();
    lob(x, y, x + Math.cos(a) * 22, y + Math.sin(a) * 14, 0.35, 12, "gut", l => explode(l.x, l.y, R * 0.6, dmg * 0.5, 0));
  }
}

// ---------------------------------------------------------------- projectiles, lobs, telegraphs, puddles, fx
function updateShots(dt) {
  for (const s of G.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (Math.hypot(s.x - P.x, s.y - (P.y - 10 * P.scale)) < s.r + 6 * P.scale) {
      hurtPlayer(s.dmg, s, "shot:" + s.col); s.life = 0; sparks(s.x, s.y, 5, shotColor(s.col), 40);
    }
    if (s.x < 0 || s.x > AW || s.y < 0 || s.y > AH) s.life = 0;
  }
  G.shots = G.shots.filter(s => s.life > 0);
  for (const l of G.lobs) {
    l.at += dt;
    if (l.at >= l.dur) { l.done = true; l.land && l.land(l); }
  }
  G.lobs = G.lobs.filter(l => !l.done);
  for (const t of G.tele) {
    t.t += dt;
    if (t.t >= t.dur && !t.done) {
      t.done = true;
      if (t.dmg && teleHitsPlayer(t)) hurtPlayer(t.dmg, { x: t.x !== undefined ? t.x : P.x, y: t.y !== undefined ? t.y : P.y }, "tele:" + (t.src || t.shape));
      t.fire && t.fire(t);
    }
  }
  G.tele = G.tele.filter(t => !t.done);
  for (const p of G.puddles) {
    p.life -= dt; p.tick -= dt;
    if (p.tick <= 0 && Math.hypot((P.x - p.x) / p.r, (P.y - p.y) / (p.r * 0.6)) < 1) { p.tick = 0.5; hurtPlayer(p.dmg, null, "puddle"); }
  }
  G.puddles = G.puddles.filter(p => p.life > 0);
  for (const f of G.fx) {
    f.t += dt;
    if (f.kind === "timer" && !f.fired && f.t >= f.life - 0.002) { f.fired = true; f.fn(); }
  }
  G.fx = G.fx.filter(f => f.t < f.life);
}
function teleHitsPlayer(t) {
  const px_ = P.x, py_ = P.y;
  if (t.shape === "circle") return Math.hypot(px_ - t.x, (py_ - t.y) * 1.3) < t.r + 3;
  if (t.shape === "band") return Math.abs(py_ - t.y) < t.h / 2 + 2;
  if (t.shape === "vband") return Math.abs(px_ - t.x) < t.w / 2 + 2;
  if (t.shape === "line") return segDist(px_, py_, t.x1, t.y1, t.x2, t.y2) < t.w / 2 + 3;
  return false;
}
function segDist(px_, py_, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1, l2 = vx * vx + vy * vy || 1;
  const u = clamp(((px_ - x1) * vx + (py_ - y1) * vy) / l2, 0, 1);
  return Math.hypot(px_ - (x1 + vx * u), py_ - (y1 + vy * u));
}
const SHOT_COLS = { green: "#8aff5a", pink: "#ff6ad0", ice: "#8ef0ff", fire: "#ffa02a", bone: "#f4ecd8", laser: "#ff4a8a", lava: "#ff6a1a", gut: "#c83a4a", poison: "#8aff5a", rock: "#8a7a78" };
const shotColor = c => hx(SHOT_COLS[c] || "#ffe04a");
function updateParts(dt) {
  for (const p of G.parts) {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.spark) { p.vx *= 0.9; p.vy *= 0.9; continue; }
    p.z += p.vz * dt; p.vz -= 200 * dt;
    if (p.z <= 0) {
      if (p.bone) { p.z = 0; p.vx *= 0.5; p.vy *= 0.5; p.vz = p.vz < -30 ? -p.vz * 0.3 : 0; }
      else { if (p.stain) stainArena(p.x, p.y, Math.random() < 0.5 ? BLOOD[2] : BLOOD[3]); p.life = 0; }
    }
  }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const p of G.pops) p.t += dt;
  G.pops = G.pops.filter(p => p.t < p.life);
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.life) G.banner = null; }
}

// ---------------------------------------------------------------- cards
function ownedWeapons() { return WEAPONS.filter(w => P.w[w] > 0); }
function cardFor(key) {
  if (EVOS[key]) return { key, kind: "evo", title: EVOS[key].name, desc: EVOS[key].desc, icon: EVOS[key].weapon };
  const U = UPG[key], lvl = WEAPONS.includes(key) ? P.w[key] : P.p[key];
  return { key, kind: WEAPONS.includes(key) ? "weapon" : "passive", lvl, title: U.name, desc: U.desc(lvl), icon: key, isNew: lvl === 0 };
}
function levelCards(n = 3) {
  const pool = [];
  const owned = ownedWeapons().length;
  for (const w of WEAPONS) {
    const l = P.w[w];
    if (l > 0 && l < UPG[w].max) pool.push({ key: w, wt: 1.5 });
    else if (l === 0 && owned < MAX_WEAPONS) pool.push({ key: w, wt: G.clock < 600 ? 1.3 : 1 });
  }
  for (const p of PASSIVES) if (P.p[p] < UPG[p].max) pool.push({ key: p, wt: 1 });
  const out = [];
  while (out.length < n && pool.length) {
    let r = Math.random() * pool.reduce((a, c) => a + c.wt, 0), i = 0;
    for (; i < pool.length; i++) { r -= pool[i].wt; if (r <= 0) break; }
    i = Math.min(i, pool.length - 1);
    out.push(cardFor(pool[i].key)); pool.splice(i, 1);
  }
  while (out.length < n) out.push({ key: "snack", kind: "snack", title: "MEAT SNACK", desc: "HEAL 40 HP", icon: "glutton" });
  return out;
}
function evoReady() {
  return Object.keys(EVOS).filter(k => !P.evo[k] && P.w[EVOS[k].weapon] >= UPG[EVOS[k].weapon].max && P.p[EVOS[k].passive] >= 1);
}
function rewardCards(big) {
  const out = [];
  if (big) {
    for (const k of evoReady()) if (out.length < 2) out.push(cardFor(k));
    const fresh = WEAPONS.filter(w => P.w[w] === 0);
    if (fresh.length && ownedWeapons().length < MAX_WEAPONS && out.length < 3) {
      const w = G.ch === 0 && fresh.includes("sword") ? "sword" : pick(fresh);
      out.push(cardFor(w));
    }
    const up = ownedWeapons().filter(w => P.w[w] < UPG[w].max);
    if (up.length && out.length < 3) {
      const w = pick(up);
      out.push({ key: w, kind: "plus2", title: UPG[w].name + " +2", desc: "TWO LEVELS AT ONCE", icon: w, lvl: P.w[w] });
    }
    while (out.length < 3) out.push({ key: "feast", kind: "feast", title: "FEAST", desc: "+30 MAX HP AND FULL HEAL", icon: "feast" });
    return out;
  }
  return levelCards(3);
}
function applyCard(c) {
  if (c.kind === "evo") { P.evo[c.key] = true; banner(c.title + "!", GOLD, 2.2, "EVOLUTION"); sfx("weapon"); return; }
  if (c.kind === "snack") { P.hp = Math.min(P.maxHp, P.hp + 40); return; }
  if (c.kind === "feast") { P.maxHp += 30; P.hp = P.maxHp; return; }
  if (c.kind === "plus2") { P.w[c.key] = Math.min(UPG[c.key].max, P.w[c.key] + 2); return; }
  if (WEAPONS.includes(c.key)) {
    P.w[c.key]++;
    if (c.key === "sword" && P.w.sword === 1) { banner("NEW WEAPON!", GOLD, 2, "CHAIN SWORD"); sfx("weapon"); }
  } else {
    P.p[c.key]++;
    if (c.key === "meaty") { P.maxHp += 20; P.hp = Math.min(P.maxHp, P.hp + 20); }
  }
}

// ---------------------------------------------------------------- chests
function dropChest(x, y, big) {
  const o = { x, y }; clampArena(o, 12);
  G.chest = { x: o.x, y: o.y, big, t: 0, opened: false, ot: 0 };
}
function openChest() {
  const C = G.chest;
  C.opened = true; C.ot = 0;
  sfx("chest"); buzz(40);
  sparks(C.x, C.y - 10, 20, GOLD, 70, 0.6);
  G.pendingChest = C.big ? "boss" : "mini";
  G.chestDelay = 0.8;
}

// ---------------------------------------------------------------- the tick
function update(dt) {
  if (G.mode !== "play") return;
  G.clock += dt; G.stats.time += dt;
  G.t += dt;
  G.shake = Math.max(0, G.shake - dt);
  updatePhase(dt);
  spawning(dt);
  updatePlayer(dt);
  if (G.mode !== "play") return;
  updateEnemies(dt);
  if (G.boss) updateBoss(dt);
  if (G.mode !== "play") return;
  updateShots(dt);
  updateParts(dt);
  const A = G.arena;
  if (A.base) for (let i = 0; i < 140; i++) { const k = (Math.random() * A.d.length) | 0; A.d[k] = A.base[k]; }
  if (G.pendingChest) {
    G.chestDelay -= dt;
    if (G.chestDelay <= 0) {
      const kind = G.pendingChest;
      G.pendingChest = null;
      if (kind === "mini") { P.hp = Math.min(P.maxHp, P.hp + 25); G.cards = rewardCards(false); G.chest = null; G.rewardKind = "mini"; setMode("reward"); }
      else { G.rerolls++; G.cards = rewardCards(true); G.chest = null; G.rewardKind = "boss"; setMode("reward"); }
      return;
    }
  }
  if (G.pendingLevels > 0 && !(P.hook && P.hook.phase !== "fly") && !P.pulled) {
    G.pendingLevels--;
    G.cards = levelCards(3);
    sfx("levelup");
    setMode("levelup");
  }
}
function chooseCard(i) {
  const c = G.cards[i];
  if (!c) return;
  applyCard(c);
  sfx("go");
  if (G.mode === "reward" && G.rewardKind === "boss") {
    G.stats.bossTimes.push(Math.round(G.bossTime || 0));
    if (G.ch >= CHAPTERS.length - 1) { setMode("victory"); music.play(0, false); saveProgress(-1, null); }
    else setMode("clear");
    return;
  }
  if (G.mode === "reward" && G.rewardKind === "mini") { G.phase = "waveB"; G.phaseT = 0; }
  setMode("play");
}
function reroll() {
  if (G.rerolls <= 0 || G.mode !== "levelup") return;
  G.rerolls--;
  G.cards = levelCards(3);
  sfx("go");
}
function nextChapter() { G.revenge = 0; startChapter(G.ch + 1); }
