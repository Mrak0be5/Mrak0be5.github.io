// Звук стройки кодом (WebAudio, без файлов): днём ветер порывами и птицы, ночью сверчки; от событий укладки —
// удар молотка, стук камня и шорох мастерка, шуруповёрт, звон листа, шорох верёвки; сдача детали и здания —
// короткий сигнал. Громкость и панорама — по положению события относительно камеры. Браузер разрешает звук
// только после касания или нажатия: контекст создаётся на первом из них. Вкл/выкл — localStorage 'rust.sound'.
import * as THREE from 'three';

export function createAudio() {
  let ctx = null, master = null, noise = null, windGain = null, windFilter = null, rainGain = null;
  let enabled = true;
  try { enabled = localStorage.getItem('rust.sound') !== '0'; } catch (e) { /* без хранилища — включён */ }
  let birdT = 2, cricketT = 1, budget = 0;
  const dir = new THREE.Vector3(), right = new THREE.Vector3();

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    // общий шум 2 с (слегка «розовый»: сумма белого и сглаженного)
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.35 + b * 2.2; }
    // ветер: шум → полоса, громкость и тон плывут порывами
    const src = ctx.createBufferSource();
    src.buffer = noise; src.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.5;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    src.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
    src.start();
    // дождь: тот же шум выше по тону — шуршание капель
    const rs = ctx.createBufferSource();
    rs.buffer = noise; rs.loop = true; rs.playbackRate.value = 1.7;
    const rf = ctx.createBiquadFilter();
    rf.type = 'highpass'; rf.frequency.value = 1400; rf.Q.value = 0.3;
    rainGain = ctx.createGain(); rainGain.gain.value = 0;
    rs.connect(rf); rf.connect(rainGain); rainGain.connect(master);
    rs.start();
  }

  function setEnabled(on) {
    enabled = !!on;
    try { localStorage.setItem('rust.sound', enabled ? '1' : '0'); } catch (e) { /* без хранилища */ }
    if (master) master.gain.setTargetAtTime(enabled ? 0.8 : 0, ctx.currentTime, 0.05);
    if (enabled) start();
    return enabled;
  }

  // огибающая: быстро вверх, экспоненциально вниз
  function env(g, t0, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }
  function burst(t0, out, type, freq, q, peak, attack, decay, offset) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    env(g, t0, peak, attack, decay);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t0, offset === undefined ? Math.random() * 1.5 : offset, attack + decay + 0.05);
  }
  function tone(t0, out, type, f0, f1, peak, attack, decay) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + attack + decay);
    const g = ctx.createGain();
    env(g, t0, peak, attack, decay);
    o.connect(g); g.connect(out);
    o.start(t0); o.stop(t0 + attack + decay + 0.05);
  }
  // выход с громкостью и панорамой по месту события
  function spot(pos, camera, level) {
    const out = ctx.createGain();
    let pan = 0, k = level;
    if (pos && camera) {
      dir.copy(pos).sub(camera.position);
      const dist = dir.length();
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      pan = THREE.MathUtils.clamp(dir.dot(right) / Math.max(dist, 1), -0.9, 0.9);
      k *= 1 / (1 + dist / 7);
    }
    out.gain.value = k;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; out.connect(p); p.connect(master); } else out.connect(master);
    return out;
  }

  // action: hammer | lay | screw | tie | work-high; kind — материал
  function play(action, kind, pos, camera) {
    if (!ctx || !enabled || budget > 6) return;
    budget++;
    const t = ctx.currentTime + 0.005;
    const out = spot(pos, camera, 1);
    const v = 0.9 + Math.random() * 0.2;
    if (kind === 'stones' || action === 'lay') {
      // мастерок по раствору, потом стук камня о камень
      if (Math.random() < 0.6) burst(t, out, 'highpass', 2600, 0.7, 0.07, 0.02, 0.16);
      burst(t + 0.18, out, 'bandpass', 1500 * v, 3, 0.5, 0.002, 0.05);
      burst(t + 0.2, out, 'bandpass', 2300 * v, 4, 0.25, 0.002, 0.03);
      tone(t + 0.18, out, 'sine', 95 * v, 70, 0.35, 0.003, 0.09);
    } else if (action === 'screw' || kind === 'sheets' || kind === 'plates') {
      // шуруповёрт: пила с затуханием тона, щелчок муфты; лист отзывается металлом
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(150 * v, t);
      o.frequency.linearRampToValueAtTime(230 * v, t + 0.12);
      o.frequency.linearRampToValueAtTime(190 * v, t + 0.38);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
      const g = ctx.createGain(); env(g, t, 0.16, 0.02, 0.38);
      o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 0.45);
      burst(t + 0.4, out, 'bandpass', 3200, 5, 0.18, 0.001, 0.02);
      if (kind === 'sheets') [520, 1180, 1730].forEach(function (fr, i) { tone(t + 0.41, out, 'sine', fr * v, fr * v * 0.99, 0.05 / (i + 1), 0.002, 0.5); });
    } else if (action === 'tie' || kind === 'sticks') {
      burst(t, out, 'bandpass', 900 * v, 0.8, 0.2, 0.03, 0.22);
      burst(t + 0.12, out, 'bandpass', 1400 * v, 1, 0.12, 0.02, 0.16);
    } else {
      // молоток: щелчок по шляпке, звон бойка, глухой отзвук доски
      burst(t, out, 'bandpass', 2400 * v, 1.6, 0.55, 0.001, 0.035);
      tone(t, out, 'triangle', 1900 * v, 1700 * v, 0.08, 0.001, 0.09);
      tone(t, out, 'sine', 170 * v, 120, 0.45, 0.002, 0.11);
    }
  }
  function chime(notes, level) {
    if (!ctx || !enabled) return;
    const out = spot(null, null, level);
    const t = ctx.currentTime + 0.01;
    notes.forEach(function (f, i) { tone(t + i * 0.09, out, 'sine', f, f, 0.22, 0.005, 0.6); tone(t + i * 0.09, out, 'sine', f * 2, f * 2, 0.05, 0.005, 0.35); });
  }
  function bird() {
    const out = spot(null, null, 0.05 + Math.random() * 0.05);
    const base = 2400 + Math.random() * 2000;
    let t0 = ctx.currentTime + 0.02;
    const n = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      tone(t0, out, 'sine', base * (0.9 + Math.random() * 0.3), base * (1.15 + Math.random() * 0.4), 0.6, 0.01, 0.08);
      t0 += 0.08 + Math.random() * 0.07;
    }
  }
  function crickets() {
    const out = spot(null, null, 0.03);
    const t0 = ctx.currentTime + 0.02;
    const f = 4200 + Math.random() * 600;
    for (let i = 0; i < 4; i++) tone(t0 + i * 0.045, out, 'sine', f, f, 0.5, 0.004, 0.025);
  }

  function update(dt, night, rain) {
    budget = Math.max(0, budget - dt * 24);
    if (!ctx || !enabled) return;
    const t = ctx.currentTime;
    rainGain.gain.setTargetAtTime(0.16 * (rain || 0), t, 0.8);
    const gust = 0.5 + 0.3 * Math.sin(t * 0.23) + 0.2 * Math.sin(t * 0.61 + 1.3);
    windGain.gain.setTargetAtTime(0.05 + 0.08 * gust, t, 0.6);
    windFilter.frequency.setTargetAtTime(330 + 420 * gust, t, 0.6);
    birdT -= dt; cricketT -= dt;
    if (birdT <= 0) { birdT = 1.5 + Math.random() * 5; if (night < 0.3 && !(rain > 0.4)) bird(); }
    if (cricketT <= 0) { cricketT = 0.4 + Math.random() * 1.2; if (night > 0.6) crickets(); }
  }

  return {
    start, update, play, setEnabled,
    enabled: function () { return enabled; },
    piece: function () { chime([660, 990], 0.25); },
    complete: function () { chime([523, 659, 784, 1047], 0.4); },
  };
}
