// GpuQ — сайт: вкладки, копирование, меню, появление блоков и иллюстрация «без диспетчера / с GpuQ». Без внешних библиотек.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Меню на узких экранах ----------
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  if (menuBtn) {
    const close = () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  // ---------- Вкладки (ARIA, стрелки, Home/End) ----------
  $$('[role=tablist]').forEach(list => {
    const tabs = $$('[role=tab]', list);
    const show = tab => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const pane = document.getElementById(t.getAttribute('aria-controls'));
        if (pane) pane.hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t));
      t.addEventListener('keydown', e => {
        const k = e.key;
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(k)) return;
        e.preventDefault();
        const n = k === 'Home' ? tabs[0] : k === 'End' ? tabs[tabs.length - 1] : tabs[(i + (k === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        n.focus(); show(n);
      });
    });
  });

  // ---------- Копирование ----------
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* запасной путь ниже */ }
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  const live = $('#live');
  $$('.copy').forEach(btn => btn.addEventListener('click', async () => {
    const text = btn.dataset.copy || btn.closest('.code')?.querySelector('pre')?.innerText || '';
    const ok = await copyText(text.trim());
    const label = btn.getAttribute('aria-label');
    btn.classList.add(ok ? 'done' : 'fail');
    btn.setAttribute('aria-label', ok ? 'Скопировано' : 'Не удалось скопировать: выделите текст вручную');
    if (live) live.textContent = ok ? 'Скопировано' : 'Не удалось скопировать: выделите текст вручную';
    btn.focus();   // запасной путь удаляет временное поле и сбрасывает фокус
    setTimeout(() => { btn.classList.remove('done', 'fail'); btn.setAttribute('aria-label', label); if (live) live.textContent = ''; }, 1800);
  }));

  // ---------- Появление блоков при прокрутке ----------
  const reveal = $$('.reveal');
  if (reveal.length && 'IntersectionObserver' in window && !reduce.matches) {
    const io = new IntersectionObserver(items => {
      for (const it of items) if (it.isIntersecting) { it.target.classList.add('in'); io.unobserve(it.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    reveal.forEach(r => io.observe(r));
  } else reveal.forEach(r => r.classList.add('in'));

  // ---------- Иллюстрация: четыре задачи на карте с 24 ГБ ----------
  // Модель, а не замер. Без диспетчера все стартуют сразу, а при переполнении видеопамяти все идут медленнее (скорость падает
  // по условной формуле, в диапазоне «в 2–5 раз», о котором пишет автор). С GpuQ задача ждёт, пока свободно size + запас; скорость нормальная.
  // Порядок ожидания в модели строгий (по очереди прихода), у настоящей службы — нет: место получает тот, кто первым спросит.
  const host = $('#sims');
  if (!host) return;
  const CAP = 24, RESERVE = 2, SPAN = 34, STEP = 0.1, HOLD = 4;
  const TASKS = [
    { name: 'train', size: 14, at: 0, work: 21, color: '#3987e5' },
    { name: 'render', size: 8, at: 2, work: 9, color: '#e0608f' },
    { name: 'sdxl', size: 8, at: 5, work: 8, color: '#25b04f' },
    { name: 'whisper', size: 4, at: 8, work: 6, color: '#e1a014' },
  ];
  const speedOf = used => used <= CAP ? 1 : Math.max(.22, .9 - (used - CAP) * .08);

  function simulate(mode) {
    const frames = [], running = [], waiting = [], arrived = new Set();
    let finished = 0, finishT = null;
    for (let i = 0; i < 1200; i++) {
      const t = Math.round(i * STEP * 10) / 10;
      for (const task of TASKS) if (!arrived.has(task.name) && t >= task.at) { arrived.add(task.name); waiting.push(task); }
      const usedNow = () => running.reduce((s, r) => s + r.task.size, 0);
      while (waiting.length && (mode === 'free' || usedNow() + waiting[0].size + RESERVE <= CAP)) {
        const task = waiting.shift();
        running.push({ task, left: task.work });
      }
      const used = usedNow(), speed = mode === 'free' ? speedOf(used) : 1;
      frames.push({
        t, used, speed, finishT,
        running: running.map(r => r.task),
        waiting: waiting.map(w => ({ task: w, why: `свободно ${CAP - used} ГБ, нужно ${w.size} + запас ${RESERVE}` })),
      });
      for (let k = running.length - 1; k >= 0; k--) {
        running[k].left -= STEP * speed;
        if (running[k].left <= 1e-9) { running.splice(k, 1); finished++; if (finished === TASKS.length) finishT = Math.round((t + STEP) * 10) / 10; }
      }
      if (finishT !== null) break;
    }
    // последний кадр: все задачи завершены, на нём «готово»; без него кадр-повтор навсегда оставил бы последнюю задачу в работе
    frames.push({ t: finishT, used: 0, speed: 1, finishT, running: [], waiting: [] });
    return { frames, finishT };
  }

  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  function build(mode) {
    const bad = mode === 'free';
    const root = mk('div', 'sim ' + (bad ? 'bad' : 'good'));
    root.setAttribute('aria-hidden', 'true');
    const head = mk('div', 'sim-head'), title = mk('h3', '', bad ? 'Без диспетчера' : 'С GpuQ');
    const chip = mk('span', 'chip ok', 'Всё помещается');
    head.append(title, chip);
    const track = mk('div', 'track');
    const ram = mk('div', 'ramzone'); ram.style.left = (CAP / SPAN * 100) + '%';
    track.append(ram);
    if (!bad) {
      const res = mk('div', 'reserve'); res.style.left = ((CAP - RESERVE) / SPAN * 100) + '%'; res.style.width = (RESERVE / SPAN * 100) + '%';
      track.append(res);
    }
    const axis = mk('div', 'axis');
    const edge = mk('span', '', bad ? 'край видеопамяти · ' + CAP + ' ГБ' : 'запас ' + RESERVE + ' ГБ · край ' + CAP + ' ГБ');
    edge.style.right = ((SPAN - CAP) / SPAN * 100 + 0.6) + '%';
    const zero = mk('span', '', '0'); zero.style.left = '2px';
    const ramLabel = mk('span', '', 'RAM ПК'); ramLabel.style.right = '2px'; ramLabel.style.color = '#ff8f86';
    axis.append(zero, edge, ramLabel);
    const body = mk('div', 'sim-body');
    const runBox = mk('div', 'sim-list'), waitBox = mk('div', 'sim-list');
    runBox.append(mk('h4', '', 'Считаются'), mk('ul'));
    waitBox.append(mk('h4', '', bad ? 'Итог' : 'Ждут'), mk('ul'));
    body.append(runBox, waitBox);
    const speed = mk('div', 'speed');
    const row = mk('div', 'speed-row'); row.append(mk('span', '', 'Скорость задач'), mk('b', '', 'нормальная'));
    const bar = mk('div', 'speed-bar'); bar.append(mk('i'));
    speed.append(row, bar);
    const reason = mk('p', 'reason');
    root.append(head, track, axis, body, speed, reason);
    return { root, chip, track, runList: $('ul', runBox), waitList: $('ul', waitBox), waitTitle: $('h4', waitBox), speed, speedWord: $('b', row), speedFill: $('i', bar), reason, blocks: new Map(), mode };
  }

  const sims = ['free', 'queue'].map(mode => Object.assign(simulate(mode), { mode, ui: build(mode) }));
  const LOOP = Math.ceil(Math.max(...sims.map(s => s.finishT)) + HOLD);
  sims.forEach(s => host.append(s.ui.root));

  function render(sim, frame) {
    const { ui, mode } = sim, bad = mode === 'free';
    // блоки на полосе: стопкой слева направо в порядке старта
    let offset = 0;
    const live = new Set();
    for (const task of frame.running) {
      live.add(task.name);
      let b = ui.blocks.get(task.name);
      if (!b) {
        b = mk('div', 'blk enter'); b.style.background = task.color;
        b.append(document.createTextNode(task.name), mk('small', '', task.size + ' ГБ'));
        b.style.left = (offset / SPAN * 100) + '%'; b.style.width = (task.size / SPAN * 100) + '%';
        ui.track.append(b); ui.blocks.set(task.name, b);
        requestAnimationFrame(() => requestAnimationFrame(() => b.classList.remove('enter')));
      }
      b.style.left = (offset / SPAN * 100) + '%'; b.style.width = (task.size / SPAN * 100) + '%';
      offset += task.size;
    }
    for (const [name, b] of ui.blocks) if (!live.has(name)) { ui.blocks.delete(name); b.classList.add('enter'); setTimeout(() => b.remove(), 450); }

    const over = Math.max(0, frame.used - CAP), sp = frame.speed;
    const done = sim.finishT !== null && frame.t >= sim.finishT;
    ui.chip.className = 'chip ' + (over ? 'warn' : 'ok');
    ui.chip.textContent = done ? `Всё готово за ${Math.round(sim.finishT)} усл. с` : over ? `${over} ГБ ушли в RAM` : (frame.waiting.length ? 'Очередь работает' : 'Всё помещается');
    ui.root.classList.toggle('hot', !!over);
    ui.speed.classList.toggle('slow', sp < .95 && !done);
    ui.speedFill.style.width = Math.round((done ? 1 : sp) * 100) + '%';
    ui.speedWord.textContent = done ? 'готово' : sp >= .95 ? 'нормальная' : 'падает';

    const run = frame.running.map(task => { const li = mk('li'), i = mk('i'); i.style.background = task.color; li.append(i, `${task.name} · ${task.size} ГБ`); return li; });
    ui.runList.replaceChildren(...(run.length ? run : [mk('li', 'none', done ? 'все четыре готовы' : 'пока никого')]));
    if (bad) {
      ui.waitTitle.textContent = 'Итог';
      const li = mk('li', over ? '' : 'none', over ? `занято ${frame.used} ГБ из ${CAP}: ${over} ГБ вытеснены в оперативную` : 'всё в видеопамяти');
      ui.waitList.replaceChildren(li);
      ui.reason.textContent = over ? 'Часть видеопамяти вытесняется в RAM: карта «занята на 100 %», но задачи идут медленнее и заканчиваются позже.' : '';
    } else {
      ui.waitTitle.textContent = 'Ждут';
      const wl = frame.waiting.map(w => { const li = mk('li', 'wait'), i = mk('i'); i.style.background = w.task.color; li.append(i, `${w.task.name} · ${w.task.size} ГБ`); return li; });
      ui.waitList.replaceChildren(...(wl.length ? wl : [mk('li', 'none', 'очередь пуста')]));
      ui.reason.textContent = frame.waiting.length ? `${frame.waiting[0].task.name}: ${frame.waiting[0].why}` : '';
    }
  }

  let clock = 0, last = performance.now(), playing = !reduce.matches, raf = 0;
  const toggle = $('#simToggle'), restart = $('#simRestart');
  const draw = () => {
    const c = ((clock % LOOP) + LOOP) % LOOP;
    sims.forEach(s => render(s, s.frames[Math.max(0, Math.min(Math.floor(c / STEP + 1e-6), s.frames.length - 1))]));
  };
  const tick = now => {
    const dt = Math.max(0, Math.min(0.25, (now - last) / 1000)); last = now;   // метка кадра бывает чуть раньше performance.now()
    if (playing) { clock += dt; draw(); }
    raf = requestAnimationFrame(tick);
  };
  const setPlaying = on => {
    playing = on; last = performance.now();
    toggle.textContent = on ? 'Пауза' : 'Играть';
    toggle.setAttribute('aria-pressed', String(!on));
  };
  toggle.addEventListener('click', () => setPlaying(!playing));
  restart.addEventListener('click', () => { clock = 0; sims.forEach(s => { s.ui.blocks.forEach(b => b.remove()); s.ui.blocks.clear(); }); draw(); });
  // Анимация идёт, только пока блок виден на экране.
  new IntersectionObserver(items => {
    const visible = items.some(i => i.isIntersecting);
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: .05 }).observe(host);
  // ?t=9.5 — остановить на нужной секунде (для снимков); с «уменьшением движения» показываем самый показательный момент без анимации.
  const forced = new URLSearchParams(location.search).get('t');
  if (forced !== null && isFinite(+forced)) { clock = +forced; setPlaying(false); draw(); }
  else if (reduce.matches) { clock = 9.5; setPlaying(false); draw(); } else { clock = 0; draw(); setPlaying(true); }
})();
