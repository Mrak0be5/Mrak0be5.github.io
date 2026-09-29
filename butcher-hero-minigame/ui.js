"use strict";
// Browser shell: input, audio, music, saving, the main loop.

const Q = new URLSearchParams(location.search);
const BOTPLAY = Q.has("bot"), SPEED = +(Q.get("speed") || 1), SAVE_KEY = "bhpx_save_v1";
let keys = {}, lastT = 0, acc = 0, titleT = 0, botWait = 0, pointers = new Map();

// ---------------------------------------------------------------- saving
saveProgress = (idx, snap) => {
  try { if (idx < 0) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, JSON.stringify({ ch: idx, snap })); } catch (e) { }
};
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }

// ---------------------------------------------------------------- input
inputVector = () => {
  if (BOTPLAY) return BOT.inputVector();
  let x = 0, y = 0;
  if (keys.ArrowLeft || keys.KeyA) x -= 1;
  if (keys.ArrowRight || keys.KeyD) x += 1;
  if (keys.ArrowUp || keys.KeyW) y -= 1;
  if (keys.ArrowDown || keys.KeyS) y += 1;
  if (JOY) {
    const dx = JOY.x - JOY.ox, dy = JOY.y - JOY.oy, d = Math.hypot(dx, dy);
    if (d > 2) { const k = Math.min(1, d / 14); x += dx / d * k; y += dy / d * k; }
  }
  return { x, y };
};
function toArt(e) {
  const r = screenCv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
function hitRect(p) { for (let i = UI_RECTS.length - 1; i >= 0; i--) { const r = UI_RECTS[i]; if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) return r.id; } return null; }
function uiAction(id) {
  if (!id) return false;
  if (id === "mute") { MUTED = !MUTED; if (masterGain) masterGain.gain.value = MUTED ? 0 : 1; return true; }
  if (id === "pause") { if (G.mode === "play") { setMode("pause"); music.pause(true); } return true; }
  if (id === "resume") { setMode("play"); music.pause(false); return true; }
  if (id === "hook") { if (G.mode === "play") hookNearest(); return true; }
  if (id.startsWith("card")) { chooseCard(+id.slice(4)); return true; }
  if (id === "reroll") { reroll(); return true; }
  if (id === "next") { nextChapter(); return true; }
  if (id === "retry") { retryChapter(); return true; }
  if (id === "store") { window.open(STORE, "_blank"); return true; }
  if (id === "title" || id === "again") { goTitle(); return true; }
  if (id === "start") { setMode("play"); return true; }
  if (id === "new") { saveProgress(-1); newRun({ god: Q.has("god") }); startChapter(+(Q.get("ch") || 0)); return true; }
  if (id === "continue") { const s = loadSave(); if (s) { newRun({ god: Q.has("god") }); startChapter(s.ch, s.snap); } return true; }
  return false;
}
screenCv.addEventListener("pointerdown", e => {
  e.preventDefault();
  unlockAudio();
  const p = toArt(e);
  const id = hitRect(p);
  if (G.mode !== "play") { uiAction(id); return; }
  if (id === "hook" || id === "pause" || id === "mute") { uiAction(id); return; }
  if (!JOY) { JOY = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y, t0: performance.now(), moved: false }; try { screenCv.setPointerCapture(e.pointerId); } catch (err) { } }
  else pointers.set(e.pointerId, { x: p.x, y: p.y, t0: performance.now() });
});
screenCv.addEventListener("pointermove", e => {
  if (JOY && e.pointerId === JOY.id) {
    const p = toArt(e); JOY.x = p.x; JOY.y = p.y;
    if (Math.hypot(p.x - JOY.ox, p.y - JOY.oy) > 5) JOY.moved = true;
  }
});
function endPointer(e) {
  const p = toArt(e);
  if (JOY && e.pointerId === JOY.id) {
    const quick = performance.now() - JOY.t0 < 260 && !JOY.moved;
    JOY = null;
    if (quick && G.mode === "play") tapHook(p);
    return;
  }
  const t = pointers.get(e.pointerId);
  if (t) { pointers.delete(e.pointerId); if (performance.now() - t.t0 < 300 && G.mode === "play") tapHook(p); }
}
function tapHook(p) {
  const tgt = hookTargetAt(p.x + camX, p.y + camY);
  if (tgt) tryHook(tgt); else hookNearest();
}
screenCv.addEventListener("pointerup", endPointer);
screenCv.addEventListener("pointercancel", e => { if (JOY && e.pointerId === JOY.id) JOY = null; pointers.delete(e.pointerId); });
addEventListener("keydown", e => {
  keys[e.code] = true;
  unlockAudio();
  if (G.mode === "play") {
    if (e.code === "Space" || e.code === "KeyJ") hookNearest();
    if (e.code === "KeyP" || e.code === "Escape") uiAction("pause");
  } else if (G.mode === "levelup" || G.mode === "reward") {
    if (["Digit1", "Digit2", "Digit3"].includes(e.code)) chooseCard(+e.code.slice(5) - 1);
    if (e.code === "KeyR") reroll();
  } else if (G.mode === "intro" && (e.code === "Space" || e.code === "Enter")) setMode("play");
  else if (G.mode === "clear" && (e.code === "Space" || e.code === "Enter")) nextChapter();
  else if (G.mode === "pause" && (e.code === "KeyP" || e.code === "Escape")) uiAction("resume");
  if (e.code === "KeyM") uiAction("mute");
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
});
addEventListener("keyup", e => { keys[e.code] = false; });
document.addEventListener("visibilitychange", () => { if (document.hidden && G && G.mode === "play" && !BOTPLAY) uiAction("pause"); });

// ---------------------------------------------------------------- audio
let audio = null, masterGain = null, lastSfx = {};
function unlockAudio() {
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); masterGain = audio.createGain(); masterGain.connect(audio.destination); masterGain.gain.value = MUTED ? 0 : 1; }
    catch (e) { audio = null; }
    if (audio && G && G.mode !== "title" && G.ch !== undefined) music.play(G.ch, G.phase === "boss");
    else if (audio) music.play(0, false);
  }
  if (audio && audio.state === "suspended") audio.resume();
}
function tone(freq, dur, type = "square", vol = 0.12, slideTo = null, delay = 0, dest) {
  const t0 = audio.currentTime + delay, o = audio.createOscillator(), g = audio.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest || masterGain); o.start(t0); o.stop(t0 + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, vol = 0.2, freq = 1200, delay = 0, q = 0.8, dest) {
  if (!noiseBuf) { const n = audio.sampleRate; noiseBuf = audio.createBuffer(1, n, n); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = audio.currentTime + delay, s = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
  f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.buffer = noiseBuf; s.connect(f).connect(g).connect(dest || masterGain); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
}
sfx = name => {
  if (!audio || MUTED) return;
  switch (name) {
    case "go": tone(660, 0.06, "square", 0.05); break;
    case "tick": tone(880, 0.03, "square", 0.03); break;
    case "nope": tone(140, 0.1, "square", 0.05, 90); break;
    case "whoosh": noise(0.22, 0.18, 900, 0, 0.6); break;
    case "slash": noise(0.07, 0.12, 2600, 0, 1.5); break;
    case "hit": noise(0.1, 0.22, 1800); tone(180, 0.12, "square", 0.07, 60); break;
    case "chomp": tone(220, 0.07, "square", 0.12, 90); noise(0.1, 0.25, 700, 0.03); break;
    case "squish": noise(0.12, 0.16, 500); tone(90, 0.1, "sawtooth", 0.05, 50); break;
    case "pickup": tone(988 + Math.random() * 60, 0.05, "square", 0.03); break;
    case "heal": [660, 880, 1100].forEach((f, i) => tone(f, 0.08, "triangle", 0.07, null, i * 0.05)); break;
    case "charge": tone(200, 0.45, "sawtooth", 0.05, 900); break;
    case "levelup": [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.07, null, i * 0.07)); break;
    case "weapon": [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, "square", 0.07, null, i * 0.07)); noise(0.4, 0.15, 3000, 0.1); break;
    case "warning": [0, 1, 2, 3].forEach(i => tone(i % 2 ? 330 : 440, 0.2, "square", 0.07, null, i * 0.22)); break;
    case "stomp": tone(70, 0.3, "sine", 0.35, 35); noise(0.2, 0.2, 200); break;
    case "slam": tone(60, 0.55, "sine", 0.45, 25); noise(0.45, 0.35, 250, 0, 0.5); break;
    case "boom": tone(80, 0.3, "sine", 0.25, 30); noise(0.3, 0.25, 400, 0, 0.6); break;
    case "hurt": tone(300, 0.25, "sawtooth", 0.1, 80); noise(0.2, 0.25, 600, 0.02); break;
    case "crit": tone(1200, 0.08, "square", 0.08); tone(80, 0.5, "sine", 0.4, 30, 0.05); break;
    case "saw": noise(0.15, 0.1, 3500, 0, 3); break;
    case "pew": tone(900, 0.1, "square", 0.04, 300); break;
    case "laser": tone(1400, 0.25, "sawtooth", 0.06, 200); break;
    case "spit": noise(0.15, 0.2, 800, 0, 2); break;
    case "roar": tone(110, 0.6, "sawtooth", 0.12, 60); noise(0.5, 0.2, 300); break;
    case "summon": tone(300, 0.3, "triangle", 0.08, 600); break;
    case "blink": tone(1800, 0.15, "sine", 0.08, 400); break;
    case "bones": for (let i = 0; i < 6; i++) noise(0.04, 0.22, 2500 + i * 300, i * 0.06, 4); break;
    case "chest": [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.18, "triangle", 0.09, null, i * 0.08)); break;
    case "bossdie": tone(200, 1.2, "sawtooth", 0.15, 30); noise(1.2, 0.35, 300, 0, 0.5); break;
    case "win": [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, "square", 0.07, null, i * 0.12)); break;
    case "dead": [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, "square", 0.07, null, i * 0.2)); break;
  }
};
sfxThrottled = (name, gap) => {
  const now = performance.now();
  if (now - (lastSfx[name] || 0) < gap * 1000) return;
  lastSfx[name] = now; sfx(name);
};
buzz = ms => { if (!MUTED && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } };

// ---------------------------------------------------------------- music: tiny 3-track sequencer per chapter
const SONGS = [
  { bpm: 132, bass: [45, 0, 45, 0, 48, 0, 50, 0, 45, 0, 45, 0, 52, 0, 50, 48], lead: [69, 72, 76, 72, 69, 72, 77, 76, 69, 72, 76, 79, 77, 76, 72, 69] },
  { bpm: 116, bass: [40, 0, 40, 0, 43, 0, 47, 0, 38, 0, 38, 0, 42, 0, 45, 43], lead: [64, 67, 71, 74, 76, 0, 71, 67, 62, 66, 69, 74, 72, 0, 69, 67] },
  { bpm: 140, bass: [38, 0, 50, 0, 38, 0, 48, 0, 41, 0, 53, 0, 43, 0, 55, 0], lead: [74, 0, 72, 74, 77, 0, 76, 74, 72, 0, 69, 72, 74, 0, 72, 69] },
  { bpm: 110, bass: [36, 0, 36, 0, 39, 0, 43, 0, 34, 0, 34, 0, 38, 0, 41, 39], lead: [72, 0, 75, 0, 79, 78, 75, 0, 70, 0, 74, 0, 77, 75, 74, 0] },
  { bpm: 150, bass: [40, 40, 0, 40, 41, 0, 40, 0, 43, 43, 0, 43, 41, 0, 40, 0], lead: [76, 77, 76, 0, 79, 77, 76, 74, 76, 0, 72, 74, 76, 0, 77, 0] },
  { bpm: 128, bass: [40, 0, 41, 0, 40, 0, 43, 0, 40, 0, 41, 0, 44, 0, 43, 41], lead: [76, 77, 80, 77, 76, 0, 73, 76, 77, 80, 82, 80, 77, 76, 73, 72] },
];
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
music = {
  song: null, boss: false, step: 0, next: 0, timer: null, paused: false, gain: null,
  play(i, boss) {
    this.song = SONGS[i % SONGS.length]; this.boss = boss; this.step = 0; this.paused = false;
    if (!audio) return;
    if (!this.gain) { this.gain = audio.createGain(); this.gain.gain.value = 0.55; this.gain.connect(masterGain); }
    this.next = audio.currentTime + 0.05;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 30);
  },
  stop() { this.song = null; },
  pause(p) { this.paused = p; },
  tick() {
    if (!audio || !this.song || this.paused || MUTED) { if (audio) this.next = audio.currentTime + 0.05; return; }
    const S = this.song, spb = 60 / (S.bpm * (this.boss ? 1.15 : 1)) / 2;
    while (this.next < audio.currentTime + 0.12) {
      const i = this.step % 16, d = this.next - audio.currentTime;
      if (S.bass[i]) tone(midi(S.bass[i]), spb * 0.9, "triangle", 0.09, null, d, this.gain);
      if (S.lead[i] && (this.step % 32 >= 16 || this.boss || i % 2 === 0)) tone(midi(S.lead[i] + (this.boss && this.step % 64 >= 32 ? 12 : 0)), spb * 0.6, "square", 0.028, null, d, this.gain);
      if (i % 4 === 0 || (this.boss && i % 2 === 0)) tone(120, 0.12, "sine", 0.14, 40, d, this.gain);
      if (i % 2 === 1) noise(0.03, 0.035, 7000, d, 1, this.gain);
      this.step++; this.next += spb;
    }
  },
};

// ---------------------------------------------------------------- title scene
function goTitle() {
  newRun({ god: Q.has("god") });
  prepChapter(0);
  G.mode = "title";
  P.x = AW / 2; P.y = AH / 2 + 10;
  for (let i = 0; i < 6; i++) { const e = spawnEnemy("goblin", P.x + Math.cos(i) * 90, P.y + Math.sin(i) * 55); e.spd = 6; }
  music.play(0, false);
}
function titleTick(dt) {
  G.t += dt; titleT += dt;
  P.ang += dt * 3.4; P.walkT += dt * 3; P.moving = false;
  for (const e of G.enemies) {
    const a = Math.atan2(P.y - e.y, P.x - e.x) + 1.2;
    e.x += Math.cos(a) * 10 * dt; e.y += Math.sin(a) * 7 * dt; e.walkT += dt * 3; e.face = Math.cos(a) > 0 ? 1 : -1;
  }
}

// ---------------------------------------------------------------- loop
function present() {
  octx.putImageData(frameImg, 0, 0);
  const s = Math.min(innerWidth / W, innerHeight / H), k = s >= 2 ? Math.floor(s) : s;
  const cw = Math.round(W * k), ch = Math.round(H * k);
  if (screenCv.width !== cw || screenCv.height !== ch) { screenCv.width = cw; screenCv.height = ch; }
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(octx.canvas, 0, 0, cw, ch);
}
function loop(now) {
  const dt = Math.min(0.05, (now - (lastT || now)) / 1000) * SPEED;
  lastT = now;
  const m = G.mode;
  if (m === "title") {
    titleTick(dt);
    drawWorld();
    rectA(0, 0, W, H, hx("#0a0408"), 0.35);
    drawTitle(titleT, loadSave());
    if (BOTPLAY && titleT > 1) uiAction("new");
  } else {
    if (m === "play") {
      acc += dt;
      let n = 0;
      while (acc >= 1 / 60 && n++ < 8) { if (BOTPLAY) BOT.act(); update(1 / 60); acc -= 1 / 60; if (G.mode !== "play") { acc = 0; break; } }
    } else acc = 0;
    if (m === "intro") { G.introT = (G.introT || 0) + dt; if (G.introT > (BOTPLAY ? 1.5 : 60)) setMode("play"); }
    if (BOTPLAY && (m === "levelup" || m === "reward" || m === "clear" || m === "dead")) {
      botWait += dt;
      if (botWait > 0.6) { botWait = 0; if (m === "clear") nextChapter(); else if (m === "dead") retryChapter(); else chooseCard(BOT.choose(G.cards)); }
    }
    drawWorld();
    drawHUD();
    if (G.mode !== "play") drawScreen();
  }
  present();
  requestAnimationFrame(loop);
}
goTitle();
requestAnimationFrame(loop);
