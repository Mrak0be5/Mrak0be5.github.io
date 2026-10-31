// Панель очереди gpuq: устройства, очередь, галерея, история, отчёт.
// Данные — JSON API очереди того же origin (/gpuq/...); тихий режим — мост WebView2 трея.

const params = new URLSearchParams(location.search);
const MOCK = window.GPUQ_MOCK || (params.has('mock') ? (await import('./mock.js')).default : null);
const host = window.chrome && window.chrome.webview;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- Устройства ----------
// Редакция GpuQ: список карт берём у очереди (workers), а не из зашитого перечня.
const PALETTE = ['var(--c-d1)', 'var(--c-d2)', 'var(--c-d3)', 'var(--c-d4)', 'var(--c-d5)', 'var(--c-d6)'];
const shortName = n => String(n).replace(/^NVIDIA\s+/i, '').replace(/^GeForce\s+/i, '').replace(/\s+(Laptop GPU|Workstation Edition|Blackwell.*)$/i, '');
const DEVICES = [];
try {
  const first = MOCK ? await MOCK.get('/gpuq/dashboard')
    : await (await fetch('/gpuq/dashboard?limit=1', { cache: 'no-store', signal: AbortSignal.timeout(4000) })).json();
  (first.workers || []).forEach((w, i) => DEVICES.push({ name: w.name, color: PALETTE[i % PALETTE.length], short: shortName(w.name),
    kind: w.kind || 'ПК', power: w.power_limit || null }));
} catch (e) { /* очередь ещё поднимается: страница перечитается сама, как только она ответит */ }
const devOf = name => DEVICES.find(d => d.name === name) || { name: name || 'Не указано', color: 'var(--ink-3)', short: name || '—', kind: '', power: null };

const STATES = {
  'генерация': ['Генерирует', 'busy'], 'аренда': ['Работает задача', 'busy'], 'unity': ['Unity-тест', 'busy'],
  'замер': ['Замер: карта целиком', 'busy'], 'чужой процесс': ['Чужая задача', 'busy'],
  'чужой ComfyUI ждёт': ['Чужой ComfyUI ждёт', 'idle'], 'занята': ['Занята', 'warn'], 'запуск': ['Запускается', 'busy'],
  'пауза после сбоя': ['Пауза после сбоя', 'error'], 'готова': ['Готова', 'idle'], 'свободна': ['Свободна', 'idle'],
  'офлайн': ['Не в сети', 'off'], 'связь потеряна': ['Связь потеряна', 'error'], 'отправка': ['Отправляем задание', 'busy'],
  'проверка отправки': ['Проверяем отправку', 'warn'], 'отмена': ['Отменяем задание', 'warn'],
};
const REASONS = {
  'ComfyUI запустится при первом задании': 'Ждёт задание, модель загрузится при первом',
  'ComfyUI запущен и ждёт задание': 'Модель загружена, ждёт задание',
  'Возьмёт совместимое задание': 'Ждёт задание',
};
const VIA = { queue: 'Очередь', lease: 'Аренда', unity: 'Unity', farm: 'Очередь ноутбука', foreign: 'Вне очереди', app: 'Приложение' };
const ACTIVE = new Set(['queued', 'running', 'submitting', 'uncertain', 'cancelling']);

// ---------- Мелочи ----------
const $ = (sel, root = document) => root.querySelector(sel);
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs = {}) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
function icon(name) { const s = sv('svg', { 'aria-hidden': 'true' }); s.append(sv('use', { href: '#i-' + name })); return s; }
const nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const pad = n => String(n).padStart(2, '0');
const now = () => Date.now() / 1000;
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
}
function clockDur(s) {
  if (s == null) return '—';
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
}
function humanDur(s) {
  if (s == null) return '—';
  s = Math.round(s);
  if (s < 60) return `${s} с`;
  if (s < 3600) return `${Math.round(s / 60)} мин`;
  const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60);
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
const approx = s => s == null ? '' : '~' + humanDur(s);
function ago(ts) {
  if (!ts) return '';
  const s = now() - ts;
  if (s < 45) return 'только что';
  if (s < 3600) return `${Math.round(s / 60)} мин назад`;
  if (s < 86400 && new Date(ts * 1000).getDate() === new Date().getDate()) return 'в ' + clock(ts);
  return new Date(ts * 1000).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
const clock = ts => new Date(ts * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const gb = mb => mb == null ? '—' : nf1.format(mb / 1024);
const shortModel = m => String(m || '').replace(/\.(safetensors|ckpt|gguf)$/i, '').replace(/[_-](bf16|fp16|fp8\w*|int8\w*)$/i, '');
function metaText(meta, fallback) {
  meta = meta || {};
  const parts = [];
  if (meta.model) parts.push(shortModel(meta.model));
  if (meta.w && meta.h) parts.push(`${meta.w}×${meta.h}`);
  if (meta.seconds) parts.push(`${nf1.format(meta.seconds)} с`);
  else if (meta.frames) parts.push(`${meta.frames} кадр.`);
  if (meta.steps) parts.push(`${meta.steps} ${plural(meta.steps, 'шаг', 'шага', 'шагов')}`);
  if (meta.loras && meta.loras.length) parts.push(`${meta.loras.length} LoRA`);
  return parts.length ? parts.join(' · ') : (fallback || 'Граф ComfyUI');
}
const script = task => String(task || '').split(' → ')[0].replace(/^.*[\\/]/, '');
const isVideo = m => m && (m.type === 'video' || /\.(mp4|webm|mov)$/i.test(m.filename || ''));
function safeUrl(u) {
  if (typeof u !== 'string') return '';
  if (u.startsWith('/gpuq/') || (MOCK && u.startsWith('data:'))) return u;
  return '';
}
function thumbUrl(m, w) {
  if (!m) return '';
  if (m.thumb) return safeUrl(m.thumb) + (MOCK || !w ? '' : `&w=${w}`);
  return isVideo(m) ? '' : safeUrl(m.url);
}
function tween(node, value, fmt, ms = 450) {
  const from = node._v, to = value;
  node._v = to;
  if (from == null || to == null || reduce.matches || typeof to !== 'number') { node.textContent = to == null ? '—' : fmt(to); return; }
  const t0 = performance.now();
  cancelAnimationFrame(node._raf);
  const step = t => {
    const k = Math.max(0, Math.min(1, (t - t0) / ms)), e = 1 - Math.pow(1 - k, 3);
    node.textContent = fmt(from + (to - from) * e);
    if (k < 1) node._raf = requestAnimationFrame(step);
  };
  node._raf = requestAnimationFrame(step);
}

// Узлы по порядку без лишних перестановок: стоящие на месте не вынимаются, картинки и анимации не перезапускаются.
function syncChildren(parent, nodes) {
  let ref = parent.firstChild;
  for (const n of nodes) {
    if (n === ref) { ref = ref.nextSibling; continue; }
    parent.insertBefore(n, ref);
  }
  while (ref) { const next = ref.nextSibling; ref.remove(); ref = next; }
}
// Анимация появления — один раз: класс снимается, и перестановка узла её не повторяет.
function play(node, cls, ms) { if (reduce.matches) return; node.classList.add(cls); setTimeout(() => node.classList.remove(cls), ms); }
function setText(node, text) { text = text == null ? '' : String(text); if (node.textContent !== text) node.textContent = text; }
const nf2 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const GENERIC_CHAT = /^(Чат не определён|Источник не указан|Чат [0-9a-f]{8} \(сопоставление\))$/;
// Кто прислал задачу: чат, а если он не определён — программа и скрипт.
function sourceOf(j) {
  const chat = j && j.chat_title && !GENERIC_CHAT.test(j.chat_title) ? j.chat_title : '';
  const app = (j && j.meta && j.meta.app) || '';
  const scr = script(j && j.task);
  if (chat) return { kind: 'chat', text: chat, app };
  if (app) return { kind: 'app', text: app + (scr ? ' · ' + scr : ''), app };
  return { kind: 'app', text: scr || 'Источник не определён', app: '' };
}
function sourceNode(src) {
  const s = el('span', 'w-src ' + src.kind); s.append(icon(src.kind === 'chat' ? 'chat' : 'app'), el('span', '', src.text));
  s.title = src.kind === 'chat' ? 'Чат: ' + src.text + (src.app ? '\nПрограмма: ' + src.app : '') : 'Программа: ' + src.text;
  return s;
}
function refUrl(j, i) {
  if (MOCK && MOCK.refUrl) return MOCK.refUrl(((j.meta || {}).refs || [])[i], i);
  return String(j.id).startsWith('foreign:') ? `/gpuq/ref?foreign=${encodeURIComponent(j.id.slice(8))}&i=${i}&w=120`
    : `/gpuq/ref?job=${encodeURIComponent(j.id)}&i=${i}&w=120`;
}
const loraName = n => String(n).replace(/[_\-. ]*(krea2|KREA2|Krea2)[_\-. ]*/g, ' ').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || String(n);
// Миниатюра готового кадра задания очереди и адрес живого превью шага.
function jobThumb(j, w) {
  const m = (j.media || []).find(x => !isVideo(x));
  if (!m) return '';
  return MOCK ? thumbUrl(m, w) : safeUrl(String(m.url).replace('/gpuq/media?', '/gpuq/thumb?')) + `&w=${w}`;
}
const previewUrl = j => MOCK && MOCK.previewUrl ? MOCK.previewUrl(j) : `/gpuq/preview?job=${encodeURIComponent(j.id)}&t=${j.preview_ts}`;
// Живое превью: два слоя картинки — новый кадр показывается, когда уже загружен, без мигания.
function liveBox() {
  const b = el('span', 'live'); b.hidden = true;
  const a = el('img'), c = el('img', 'back'); a.alt = c.alt = '';
  b.append(a, c);
  return b;
}
function liveSrc(box, src) {
  if (box._src === src) return;
  box._src = src;
  const [a, c] = box.children, back = a.classList.contains('back') ? a : c, front = back === a ? c : a;
  back.onload = () => { if (box._src === src) { back.classList.remove('back'); front.classList.add('back'); } };
  back.src = src;
}
// Пока кадр считается — превью шага; по готовности — плавный переход в итоговый кадр, через 6 с гаснет.
function setLive(box, j, find) {
  if (j && j.preview_ts) {
    liveSrc(box, previewUrl(j));
    box._job = j.id; box._final = false; box.hidden = false;
    box.classList.remove('final');
    box.title = 'Живое превью' + (j.steps ? ` · шаг ${j.step} из ${j.steps}` : '');
    return;
  }
  if (!box._job || box._final) { if (!box._final) box.hidden = true; return; }
  const done = find(box._job), thumb = done && done.state === 'done' ? jobThumb(done, 120) : '';
  if (!thumb) { box.hidden = true; box._job = null; return; }
  box._final = true; box.classList.add('final'); box.title = 'Готово';
  liveSrc(box, thumb);
  setTimeout(() => { box.hidden = true; box._job = null; box._final = false; box.classList.remove('final'); }, 6000);
}
const stepText = j => j.steps ? `шаг ${j.step}/${j.steps}` : '';

// Время до конца по прошлым похожим генерациям — всегда числом, пусть и примерным; у пачки — и вся пачка.
function batchText(j) {
  const m = j.meta || {};
  return m.pending ? `в пачке ещё ${m.pending}` + (m.pending_eta != null ? `, всё ~${humanDur((j.remaining_seconds || 0) + m.pending_eta)}` : '') : '';
}
function etaParts(j, queued) {
  if (queued) {
    const s = j.starts_in_seconds;
    return [s == null ? 'ждёт карту' : s < 5 ? 'начнётся сейчас' : 'через ' + approx(s),
      [j.estimated_seconds ? 'займёт ' + approx(j.estimated_seconds) : '', 'в очереди ' + clockDur(j.wait_seconds)].filter(Boolean).join(' · ')];
  }
  const elapsed = j.start_ts ? now() - j.start_ts : j.duration_seconds;
  const left = j.remaining_seconds;
  const total = left != null && elapsed != null ? elapsed + left : j.estimated_seconds;
  return [left != null ? 'ещё ' + approx(left) : 'идёт',
    [[clockDur(elapsed) + (total ? ' из ~' + clockDur(total) : ''), stepText(j)].filter(Boolean).join(' · '), batchText(j)].filter(Boolean).join('\n')];
}
// Пояснение к оценке: по чему посчитано.
function etaTitle(j) {
  if (j.remaining_seconds == null) return '';
  return j.remaining_approx ? 'Идёт дольше обычного: остаток прикинут по прошлым долгим генерациям'
    : j.estimated_seconds ? 'Обычно такая генерация идёт ~' + humanDur(j.estimated_seconds) + ' (по прошлым похожим)' : 'Оценка по прошлым похожим генерациям';
}

// ---------- API ----------
async function postJSON(path, body) {
  if (MOCK) return MOCK.post(path, body);
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const text = await r.text();
  return text ? JSON.parse(text) : {};
}
async function getJSON(path, timeout = 9000) {
  if (MOCK) return MOCK.get(path);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(path, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

// ---------- Состояние ----------
const S = {
  tab: 'now', dash: null, okTs: 0, error: '', focus: '',
  traces: {}, recent: [], recentSeen: null,
  gallery: { items: [], offset: 0, more: true, loading: false, card: '', kind: '', q: '', seen: new Set(), rev: 0 },
  history: { hours: 24, data: null, list: null, offset: 0, filter: 'all', q: '', card: '' },
  report: { days: 7, data: null, tables: new Set() },
  settings: null, toasted: new Set(), openedTs: now(), dismissed: new Set(),
};

// ---------- Планировщик: опрос только видимой панели ----------
const jobs = [];
function every(ms, fn, when = () => true) { jobs.push({ ms, fn, when, last: 0, busy: false }); }
setInterval(() => {
  if (document.hidden && !params.has('smoke')) return;
  const t = Date.now();
  for (const j of jobs) {
    if (j.busy || t - j.last < j.ms || !j.when()) continue;
    j.last = t; j.busy = true;
    Promise.resolve().then(j.fn).catch(() => {}).finally(() => { j.busy = false; });
  }
}, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) for (const j of jobs) j.last = 0; });

// ---------- Шапка ----------
const tabs = [...document.querySelectorAll('.tabs [role=tab]')];
function moveInk() {
  const cur = tabs.find(t => t.dataset.tab === S.tab), ink = $('.tab-ink');
  ink.style.width = cur.offsetWidth + 'px';
  ink.style.transform = `translateX(${cur.offsetLeft}px)`;
}
function setTab(tab) {
  if (S.tab === tab) return;
  S.tab = tab;
  for (const t of tabs) t.setAttribute('aria-selected', String(t.dataset.tab === tab));
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== 'view-' + tab;
  moveInk();
  $('#main').scrollTop = 0;
  for (const j of jobs) j.last = 0;
  render();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => setTab(t.dataset.tab));
  t.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); setTab(n.dataset.tab);
  });
});
addEventListener('keydown', e => {
  if (e.target.closest('input') || lb.open) return;
  if (e.ctrlKey && /^[1-4]$/.test(e.key)) { e.preventDefault(); setTab(tabs[+e.key - 1].dataset.tab); }
  if (e.key === '/' && S.tab === 'gallery') { e.preventDefault(); $('#gSearch')?.focus(); }
});
new ResizeObserver(() => { moveInk(); if (S.tab === 'gallery') layoutGallery(); if (S.tab === 'history') drawTimeline(); }).observe(document.body);


function renderSummary() {
  const box = $('#summary'), d = S.dash;
  const age = now() - S.okTs;
  const state = S.error && age > 10 ? 'down' : age > 10 ? 'stale' : '';
  const busy = d ? d.workers.filter(w => w.busy).length : 0;
  // Готово сегодня — все генерации на всех устройствах (раннеры, ноутбуки, вне очереди), а не только задания очереди.
  const done = d ? Math.max(d.summary.done_today, d.workers.reduce((n, w) => n + (((w.stats || {}).today || {}).done || 0), 0)) : 0;
  const sig = [state, d ? busy : '', d ? d.summary.queued : '', d ? done + '/' + d.summary.done_today : ''].join('|');
  if (box._sig !== sig) {
    box._sig = sig;
    box.replaceChildren(el('span', 'conn' + (state ? ' ' + state : ''), state === 'down' ? 'Очередь не отвечает' : state === 'stale' ? 'Данные устарели' : 'Онлайн'));
    if (d) {
      const add = (label, value, opt) => { const s = el('span', opt ? 'opt' : ''); s.append(el('b', '', value), ' ' + label); box.append(s); return s; };
      add(plural(busy, 'работает', 'работают', 'работают'), String(busy));
      add('в очереди', String(d.summary.queued));
      add('готово сегодня', nf0.format(done), true).title = 'Все генерации за сегодня на всех устройствах; через очередь — ' + d.summary.done_today;
    }
  }
  if (!d) return;
  const mark = $('#brandMark');
  if (!mark.children.length) for (const dv of DEVICES) { const i = el('i'); i.style.setProperty('--dev', dv.color); mark.append(i); }
  DEVICES.forEach((dv, k) => mark.children[k].classList.toggle('on', !!d.workers.find(w => w.name === dv.name && w.busy)));
}
// ---------- Тихий режим (мост трея) ----------
const quietBtn = $('#quietBtn');
let pop = null;
function send(msg) { if (host) host.postMessage(msg); }
function renderQuiet() {
  const s = S.settings;
  quietBtn.classList.toggle('on', !!(s && s.quiet));
  $('#quietText').textContent = s ? (s.quiet ? 'Тихо' : 'Тихий режим') : 'Тихий режим';
  if (pop) fillPop();
}
function fillPop() {
  const s = S.settings || {}, has = (!!host || !!MOCK) && !!S.settings;
  pop.replaceChildren();
  pop.append(el('h3', '', 'Тихий режим'),
    el('p', 'hint', has ? 'Ночью карты работают тише: мощность ниже, вентиляторы до 50 %. При 83 °C защита снимает ограничение.'
      : 'Управление доступно в окне, открытом из трея.'));
  const sw = (on, label, note, fn, disabled) => {
    const r = el('div', 'row'), g = el('div', 'grow');
    g.append(el('p', '', label));
    if (note) g.append(el('small', '', note));
    const b = el('button', 'switch'); b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', String(!!on)); b.setAttribute('aria-label', label);
    b.disabled = !has || disabled;
    b.addEventListener('click', () => fn(!on));
    r.append(g, b); pop.append(r); return r;
  };
  const limits = (s.powerLimits || []).map((v, i) => `${DEVICES[i].short}: ${v}`).join(' · ');
  sw(s.quiet, s.quiet ? 'Включён' : 'Выключен', limits ? 'Сейчас ' + limits : '', on => send({ type: 'quiet', on }));
  const sch = s.schedule || { enabled: false, start: 0, end: 540 };
  const row = sw(sch.enabled, 'По расписанию', 'Включать и выключать в заданные часы', on => send({ type: 'schedule', enabled: on, start: sch.start, end: sch.end }));
  const times = el('div', 'times');
  const mk = v => { const i = el('input'); i.type = 'time'; i.value = `${pad(Math.floor(v / 60))}:${pad(v % 60)}`; i.disabled = !has; return i; };
  const a = mk(sch.start), b = mk(sch.end);
  const apply = () => {
    const m = i => { const [h, x] = i.value.split(':').map(Number); return h * 60 + x; };
    if (a.value && b.value) send({ type: 'schedule', enabled: sch.enabled, start: m(a), end: m(b) });
  };
  a.addEventListener('change', apply); b.addEventListener('change', apply);
  times.append('с', a, 'до', b);
  row.querySelector('.grow').append(times);
  sw(s.notify, 'Уведомления о готовности', 'Беззвучные всплывающие сообщения трея', on => send({ type: 'notify', on }));
  if (s.error) pop.append(el('p', 'err', s.error));
}
quietBtn.addEventListener('click', e => {
  e.stopPropagation();
  if (pop) return closePop();
  pop = el('div', 'pop'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Тихий режим');
  fillPop(); document.body.append(pop);
  quietBtn.setAttribute('aria-expanded', 'true');
  pop.querySelector('button:not(:disabled)')?.focus();
});
function closePop() { if (!pop) return; pop.remove(); pop = null; quietBtn.setAttribute('aria-expanded', 'false'); }
addEventListener('click', e => { if (pop && !e.target.closest('.pop')) closePop(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && pop) { closePop(); quietBtn.focus(); } });

if (host) {
  host.addEventListener('message', e => {
    const m = e.data || {};
    if (m.type === 'settings') { S.settings = m; renderQuiet(); }
    if (m.type === 'focus') { focusDevice(m.card || '', true); }
    if (m.type === 'downloaded') notify('Сохранено в «Загрузки»', m.file || '');
  });
  send({ type: 'ready' });
}

// ---------- Данные «Сейчас» ----------
async function refreshDash() {
  try {
    const d = await getJSON('/gpuq/dashboard?limit=80');
    if (!d || !Array.isArray(d.workers)) throw new Error('формат');
    S.dash = d; S.okTs = now(); S.error = '';
    if (!DEVICES.length && d.workers.length) { location.reload(); return; }
    const t = now();
    for (const w of [...d.workers, { name: 'ПК', util: d.pc && d.pc.cpu }]) {
      const tr = S.traces[w.name] || (S.traces[w.name] = []);
      if (typeof w.util === 'number') tr.push({ t, u: w.util });
      while (tr.length && tr[0].t < t - 300) tr.shift();
    }
    toastNotices(d);
  } catch (e) { S.error = String(e.message || e); }
  renderSummary();
  if (S.tab === 'now') renderNow();
}
async function refreshRecent() {
  try {
    const g = await getJSON('/gpuq/gallery?limit=18');
    const items = tilesOf(g.items || []);
    if (S.recentSeen) for (const t of items) t.fresh = !S.recentSeen.has(t.key);
    S.recentSeen = new Set([...(S.recentSeen || []), ...items.map(t => t.key)]);
    S.recent = items;
    if (S.tab === 'now') renderRecent();
  } catch (e) { /* оставляем прежний лист */ }
}
function tilesOf(items) {
  const out = [];
  for (const it of items) (it.media || []).forEach((m, i) => out.push({ key: it.id + '#' + i, job: it, media: m }));
  return out;
}

// ---------- Вид «Сейчас» ----------
const now$ = $('#view-now');
let rack, alertsBox, workList, eventsList, sheet, bypassBox;
function buildNow() {
  alertsBox = el('div', 'alerts');
  rack = el('div', 'panel rack');
  rack.setAttribute('role', 'list');
  for (const dv of DEVICES) rack.append(buildDev(dv));
  rack.append(pcRow = buildPc());
  const below = el('div', 'below');
  const left = el('section', 'panel'), right = el('section', 'panel');
  const h1 = el('div', 'section-head'); h1.append(el('h2', '', 'Работа и очередь'), el('span', 'count'));
  workList = el('ul', 'work');
  bypassBox = el('div');
  const h3 = el('div', 'subhead', 'События');
  eventsList = el('ul', 'events');
  left.append(h1, workList, bypassBox, h3, eventsList);
  const h2 = el('div', 'section-head'); h2.append(el('h2', '', 'Свежие результаты'), el('span', 'spacer'));
  const all = el('button', 'link', 'Вся галерея'); all.addEventListener('click', () => setTab('gallery'));
  h2.append(all);
  sheet = el('div', 'sheet');
  right.append(h2, sheet);
  below.append(left, right);
  now$.append(alertsBox, rack, below);
}
function buildDev(dv) {
  const row = el('article', 'dev');
  row.dataset.dev = dv.name;
  row.style.setProperty('--dev', dv.color);
  row.setAttribute('role', 'listitem');
  row.tabIndex = 0;
  const id = el('div', 'dev-id'), lamp = el('span', 'lamp'), names = el('div');
  names.append(el('h3', 'dev-name', dv.name), el('p', 'dev-sub', dv.kind));
  id.append(lamp, names);
  const main = el('div', 'dev-main');
  const st = el('p', 'dev-state'), si = el('span', 'status-icon');
  st.append(si, el('span', 'state-word', '…'), el('span', 'badge'));
  const prog = el('div', 'prog'); const track = el('div', 'prog-track'); track.append(el('div', 'prog-fill')); prog.append(track, el('span', 'prog-text num'));
  row._live = liveBox();
  main.append(row._live, st, el('p', 'dev-what'), el('p', 'dev-chat'), prog);
  const trace = el('div', 'dev-trace'), head = el('div', 'trace-head');
  head.append(el('span', 'trace-cap', 'Загрузка, 5 мин'), el('span', 'trace-val num', '—'));
  const s = sv('svg', { viewBox: '0 0 180 40', preserveAspectRatio: 'none' });
  s.append(sv('line', { class: 'trace-base', x1: 0, x2: 180, y1: 39.5, y2: 39.5 }), sv('path', { class: 'trace-area' }), sv('path', { class: 'trace-line' }),
    sv('circle', { class: 'trace-dot', r: 0 }));
  trace.append(head, s);
  const meters = el('div', 'dev-meters');
  for (const [k, label] of [['temp', 'Температура'], ['vram', 'Память'], ['power', 'Мощность']]) {
    const m = el('div', 'meter m-' + k), tr = el('span', 'm-track');
    tr.append(el('i'));
    m.append(el('span', 'm-label', label), tr, el('span', 'm-val num', '—'));
    meters.append(m);
  }
  row.append(id, main, trace, meters);
  const pick = () => focusDevice(S.focus === dv.name ? '' : dv.name);
  row.addEventListener('click', pick);
  row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  return row;
}
// Ряд «ПК»: процессор, память, Unity и Blender — видно, почему тяжёлая задача ждёт.
let pcRow = null;
function buildPc() {
  const row = el('article', 'dev pcrow');
  row.style.setProperty('--dev', 'var(--ink-3)');
  row.setAttribute('role', 'listitem');
  const id = el('div', 'dev-id'), lamp = el('span', 'lamp'), names = el('div');
  names.append(el('h3', 'dev-name', 'ПК'), el('p', 'dev-sub', 'процессор и память'));
  id.append(lamp, names);
  const main = el('div', 'dev-main'), st = el('p', 'dev-state');
  st.append(el('span', 'status-icon'), el('span', 'state-word', '…'));
  main.append(st, el('p', 'dev-what'), el('p', 'dev-chat'));
  const trace = el('div', 'dev-trace'), head = el('div', 'trace-head');
  head.append(el('span', 'trace-cap', 'Процессор, 5 мин'), el('span', 'trace-val num', '—'));
  const s = sv('svg', { viewBox: '0 0 180 40', preserveAspectRatio: 'none' });
  s.append(sv('line', { class: 'trace-base', x1: 0, x2: 180, y1: 39.5, y2: 39.5 }), sv('path', { class: 'trace-area' }), sv('path', { class: 'trace-line' }),
    sv('circle', { class: 'trace-dot', r: 0 }));
  trace.append(head, s);
  const meters = el('div', 'dev-meters');
  for (const [k, label, tip] of [['cpu', 'Процессор', ''], ['ram', 'Память', 'Занято RAM из всей'],
    ['commit', 'Выделено', 'Сколько памяти зарезервировали программы (RAM и файл подкачки). Файл подкачки растёт сам']]) {
    const m = el('div', 'meter m-' + k), tr = el('span', 'm-track');
    tr.append(el('i'));
    m.append(el('span', 'm-label', label), tr, el('span', 'm-val num', '—'));
    if (tip) m.title = tip;
    meters.append(m);
  }
  row.append(id, main, trace, meters);
  return row;
}
function updatePc(row, pc, slots) {
  const word = row.querySelector('.state-word'), si = row.querySelector('.status-icon');
  const what = row.querySelector('.dev-what'), chat = row.querySelector('.dev-chat');
  if (!pc || pc.cpu == null) { row.hidden = true; return; }
  row.hidden = false;
  const unity = pc.unity || [], blender = pc.blender || [];
  // Места выдаёт очередь (/gpuq/slot): кто держит, кто ждёт и почему.
  const sl = slots || {}, held = sl.held || [], waiting = sl.waiting || [], bound = sl.bound || {};
  const heavy = Math.max(blender.length, held.filter(h => h.kind === 'heavy').length);
  const full = unity.length >= (pc.unity_limit || 4), lowRam = pc.ram_free_gb < 6;
  const tone = full || lowRam || waiting.some(w => w.kind === 'unity') ? 'warn' : unity.length || heavy ? 'busy' : 'idle';
  const cls = 'dev pcrow ' + tone + (tone === 'busy' ? ' busy' : '');
  if (row.className !== cls) row.className = cls;
  setText(row.querySelector('.dev-sub'), (pc.cores ? `${pc.cores} ${plural(pc.cores, 'поток', 'потока', 'потоков')} · ` : '') + `${nf0.format(pc.ram_total_gb)} ГБ`);
  const usesUnity = unity.length || held.some(h => h.kind === 'unity') || waiting.some(w => w.kind === 'unity');
  const busyAny = usesUnity || heavy || held.length || waiting.length;
  setText(word, !busyAny ? 'Тяжёлых задач нет' : (usesUnity ? `Unity ${unity.length} из ${pc.unity_limit || 4} · ` : '') + `тяжёлое ${heavy} из ${pc.heavy_limit || 2}`);

  if (si._tone !== tone) { si._tone = tone; si.replaceChildren(...(tone === 'warn' ? [icon('alert')] : [])); }
  // Кто сейчас держит места; при нехватке — почему новое ждёт.
  const names = unity.map(u => bound[u.pid] || u.project + (u.batch ? '' : ' (редактор)'));
  setText(what, names.length ? 'Unity: ' + names.join(', ') : '');
  const wait = waiting.slice(0, 2).map(w => `${w.owner}${w.why ? ' — ' + w.why : ''}`).join('; ');
  setText(chat, waiting.length ? `Ждут место: ${wait}${waiting.length > 2 ? `; ещё ${waiting.length - 2}` : ''}`
    : full ? 'Мест для Unity нет: новый прогон ждёт, пока закончится один из этих'
    : lowRam ? `Свободно RAM ${nf1.format(pc.ram_free_gb)} ГБ — новые Unity и Blender ждут, нужно 6 ГБ`
    : blender.length ? `Blender: ${blender.length} ${plural(blender.length, 'процесс', 'процесса', 'процессов')}` : '');
  drawTrace(row, { name: 'ПК', util: pc.cpu });
  setMeter(row, 'cpu', pc.cpu, 100, v => nf0.format(v) + ' %', pc.cpu >= 90 ? 'hot' : '');
  const used = pc.ram_total_gb - pc.ram_free_gb;
  setMeter(row, 'ram', used, pc.ram_total_gb, null, lowRam ? 'burn' : pc.ram_free_gb < 12 ? 'hot' : '');
  setText(row.querySelector('.m-ram .m-val'), `${nf1.format(used)} / ${nf0.format(pc.ram_total_gb)} ГБ`);
  const committed = pc.commit_limit_gb - pc.commit_free_gb;
  setMeter(row, 'commit', committed, pc.commit_limit_gb, null, '');
  setText(row.querySelector('.m-commit .m-val'), `${nf0.format(committed)} / ${nf0.format(pc.commit_limit_gb)} ГБ`);
}
function focusDevice(name, fromTray) {
  if (!rack) buildNow();
  S.focus = name;
  S.gallery.card = name; S.history.card = name;
  resetGallery();
  for (const r of rack.children) r.classList.toggle('selected', r.dataset.dev === name);
  if (fromTray && name) {
    if (S.tab !== 'now') setTab('now');
    const r = rack.querySelector(`[data-dev="${CSS.escape(name)}"]`);
    if (r) { r.scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' }); r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }
  }
  renderNow();
}

function renderNow() {
  if (!rack) buildNow();
  const d = S.dash;
  renderAlerts();
  if (!d) {
    workList.replaceChildren(emptyState(S.error ? 'Очередь не отвечает' : 'Подключаемся к очереди…',
      S.error ? 'Панель повторяет запрос каждые 2 секунды.' : ''));
    return;
  }
  const byId = new Map(d.jobs.map(j => [j.id, j]));
  for (const row of rack.children) if (row !== pcRow) updateDev(row, d.workers.find(w => w.name === row.dataset.dev), byId);
  updatePc(pcRow, d.pc, d.slots);
  renderWork(d);
  renderEvents(d);
  renderRecent();
}
function emptyState(title, note) { const e = el('div', 'empty'); e.append(el('b', '', title)); if (note) e.append(el('span', '', note)); return e; }


const alertNodes = new Map();
function renderAlerts() {
  const d = S.dash, list = [];
  if (S.error && now() - S.okTs > 10) list.push({ key: 'conn', critical: true, text: 'Очередь не отвечает: ' + S.error, note: 'Данные на экране устарели. Проверка повторяется каждые 2 секунды.' });
  // Служебные заметки очереди (выгрузка моделей, обход) — в «Событиях», баннер только для того, что требует внимания.
  const notes = new Set(((d && d.notices) || []).map(n => n.message).filter(Boolean));
  if (d) for (const a of d.alerts || []) {
    const key = (a.job_id || '') + '|' + a.message;
    if (!a.message || notes.has(a.message) || S.dismissed.has(key) || (a.ts && now() - a.ts > 3600)) continue;
    list.push({ key, critical: /ошибк|сбой|потер|не удалось/i.test(a.message), text: plain(a.message), note: a.ts ? ago(a.ts) : '' });
  }
  const nodes = list.slice(0, 3).map(a => {
    let n = alertNodes.get(a.key);
    if (!n) {
      n = el('div', 'alert' + (a.critical ? ' critical' : '')); n.setAttribute('role', 'status');
      n._p = el('p'); n._small = el('small');
      const body = el('div'); body.append(n._p, n._small);
      const x = el('button', 'x'); x.setAttribute('aria-label', 'Скрыть'); x.append(icon('close'));
      x.addEventListener('click', () => { S.dismissed.add(a.key); renderAlerts(); });
      if (a.key === 'conn') x.hidden = true;
      n.append(icon('alert'), body, x);
      alertNodes.set(a.key, n);
    }
    setText(n._p, a.text); setText(n._small, a.note);
    return n;
  });
  for (const k of [...alertNodes.keys()]) if (!list.slice(0, 3).some(a => a.key === k)) alertNodes.delete(k);
  syncChildren(alertsBox, nodes);
}
function updateDev(row, w, byId) {
  const dv = devOf(row.dataset.dev);
  const word = row.querySelector('.state-word'), badge = row.querySelector('.badge'), si = row.querySelector('.status-icon');
  const what = row.querySelector('.dev-what'), chat = row.querySelector('.dev-chat'), prog = row.querySelector('.prog');
  if (!w) {
    row.className = 'dev off' + (S.focus === dv.name ? ' selected' : '');
    word.textContent = 'Нет данных'; badge.hidden = true; si.replaceChildren(); what.textContent = ''; chat.textContent = ''; prog.hidden = true;
    return;
  }
  let [label, tone] = STATES[w.state] || [w.state, w.busy ? 'busy' : 'idle'];
  if (w.state === 'чужой ComfyUI ждёт' && w.busy) tone = 'warn';
  // Ноутбук считает задание своей очереди ComfyUI — показываем его так же подробно, как у карт ПК.
  if (w.state === 'занята' && w.via === 'farm' && (w.what || (w.meta && w.meta.model))) [label, tone] = ['Генерирует', 'busy'];
  // Первые секунды после перезапуска очереди ноутбук ещё не проверен — это не «не в сети».
  if (w.state === 'офлайн' && /^Проверяем/.test(w.reason || '')) label = 'Подключаемся';
  if (!w.online) tone = 'off';
  const busy = tone === 'busy';
  const changed = row._state && row._state !== w.state && busy;
  row.className = 'dev ' + tone + (busy ? ' busy' : '') + (S.focus === dv.name ? ' selected' : '');
  if (changed && !reduce.matches) { void row.offsetWidth; row.classList.add('flash'); }
  row._state = w.state;
  word.textContent = label;
  si.replaceChildren(...(tone === 'warn' || tone === 'error' ? [icon(tone === 'error' ? 'err' : 'alert')] : []));
  const via = !busy ? '' : w.state === 'аренда' ? VIA.lease : (VIA[w.via] || '');
  badge.textContent = via; badge.hidden = !via;
  const sub = row.querySelector('.dev-sub');
  const mem = w.total_mb ? `${Math.round(w.total_mb / 1024)} ГБ` : '';
  const gpu = (w.kind === 'ноутбук' || w.kind === 'облако') && w.gpu_name ? w.gpu_name.replace(/^NVIDIA (GeForce )?/, '').replace(' Laptop GPU', '') : '';
  sub.textContent = [dv.kind, gpu, mem].filter(Boolean).join(' · ');
  const job = w.job_id ? byId.get(w.job_id) : null;
  if (busy) {
    setText(what, w.meta && w.meta.model ? metaText(w.meta) : (w.what || script(w.task) || w.reason));
    what.title = what.textContent;
    // Кто прислал: чат, а если он не определён — программа и скрипт.
    const src = sourceOf(w), sig = src.kind + '|' + src.text;
    if (chat._sig !== sig) { chat._sig = sig; chat.replaceChildren(sourceNode(src)); }
  } else {
    // Свободная карта с заметной загрузкой: её даёт рабочий стол — называем программы.
    const desk = w.apps && w.apps.length && w.util >= 20;
    setText(what, desk ? 'Ждёт задание; карту грузят ' + w.apps.join(', ') : REASONS[w.reason] || w.reason || '');
    what.title = desk ? 'Загрузку свободной карты даёт рабочий стол: ' + w.apps.join(', ') + '. Заданиям очереди это не мешает.' : '';
    const t = !w.stats ? '' : lastDoneText(w.stats);
    if (chat._sig !== t) { chat._sig = t; if (t) chat.replaceChildren(t); else chat.replaceChildren(); }
  }
  // Прогресс: у задания очереди — расчётный, у аренды и чужой задачи — сколько идёт.
  const fill = prog.querySelector('.prog-fill'), ptext = prog.querySelector('.prog-text');
  if (job && job.state === 'running') {
    prog.hidden = false;
    const known = job.progress != null;
    prog.classList.toggle('unknown', !known);
    if (known) fill.style.width = (job.progress * 100).toFixed(1) + '%';
    const el2 = job.start_ts ? now() - job.start_ts : null;
    setText(ptext, [clockDur(el2), stepText(job), job.remaining_seconds != null ? 'ещё ' + approx(job.remaining_seconds) : ''].filter(Boolean).join(' · '));
    prog.title = etaTitle(job);
  } else if (busy) {
    // Аренда, чужая задача и очередь ноутбука: остаток по прошлым таким же генерациям на этом устройстве, у пачки — и вся пачка.
    const fs = (S.dash.foreign || []).filter(x => x.card === dv.name && x.state === 'running' && x.via !== 'app');
    // Прогресс — того задания, что названо в строке устройства; остальные на карте — «рядом ещё N».
    const f = fs.find(x => x.what === w.what && x.task === w.task) || fs.find(x => w.task && x.task === w.task) || fs[0];
    prog.hidden = !f;
    if (f) {
      const known = f.progress != null;
      prog.classList.toggle('unknown', !known);
      if (known) fill.style.width = (f.progress * 100).toFixed(1) + '%';
      setText(ptext, [clockDur(f.start_ts ? now() - f.start_ts : f.duration_seconds) +
        (f.remaining_seconds != null ? ' · ещё ' + approx(f.remaining_seconds) : ''),
        batchText(f).replace('в пачке', 'пачка:'), fs.length > 1 ? `рядом ещё ${fs.length - 1}` : ''].filter(Boolean).join(' · '));
      prog.title = etaTitle(f);
    }
  } else prog.hidden = true;
  setLive(row._live, job && job.state === 'running' ? job : null, id => byId.get(id));
  drawTrace(row, w);
  setMeter(row, 'temp', w.temp, 100, v => nf0.format(v) + ' °C', w.temp >= 86 ? 'burn' : w.temp >= 80 ? 'hot' : '');
  const vram = row.querySelector('.m-vram .m-val');
  setMeter(row, 'vram', w.used_mb, w.total_mb, null, '');
  vram.textContent = w.used_mb == null ? '—' : `${gb(w.used_mb)} / ${Math.round(w.total_mb / 1024)} ГБ`;
  const limit = w.power_limit || powerLimit(dv);
  setMeter(row, 'power', w.power, limit, v => nf0.format(v) + ' Вт', '');
}
function lastDoneText(stats) {
  const t = stats.today || {};
  const parts = [];
  if (t.done) parts.push(`сегодня готово ${t.done}`);
  if (stats.last_done_ts) parts.push(`последнее ${ago(stats.last_done_ts)}`);
  return parts.join(', ');
}
function powerLimit(dv) {
  const s = S.settings, i = DEVICES.indexOf(dv);
  if (s && s.powerLimits && i >= 0 && i < 2) { const v = parseFloat(String(s.powerLimits[i]).replace(/[^\d.]/g, '')); if (v) return v; }
  return dv.power;
}
function setMeter(row, k, value, max, fmt, mod) {
  const m = row.querySelector('.m-' + k);
  m.classList.remove('hot', 'burn'); if (mod) m.classList.add(mod);
  m.querySelector('i').style.width = value != null && max ? Math.min(100, value / max * 100).toFixed(1) + '%' : '0';
  if (fmt) tween(m.querySelector('.m-val'), value == null ? null : value, fmt);
}
function drawTrace(row, w) {
  const tr = S.traces[w.name] || [], t1 = now(), W = 180, H = 40;
  const [, area, line] = row.querySelectorAll('.dev-trace path, .dev-trace line');
  const dot = row.querySelector('.trace-dot');
  tween(row.querySelector('.trace-val'), typeof w.util === 'number' ? w.util : null, v => nf0.format(v) + ' %');
  if (tr.length < 2) { line.setAttribute('d', ''); area.setAttribute('d', ''); dot.setAttribute('r', 0); return; }
  const pts = tr.map(p => [Math.max(0, ((p.t - (t1 - 300)) / 300) * W), H - 2 - (Math.min(100, Math.max(0, p.u)) / 100) * (H - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  line.setAttribute('d', d);
  area.setAttribute('d', d + `L${pts[pts.length - 1][0].toFixed(1)} ${H}L${pts[0][0].toFixed(1)} ${H}Z`);
  const last = pts[pts.length - 1];
  dot.setAttribute('cx', last[0].toFixed(1)); dot.setAttribute('cy', last[1].toFixed(1)); dot.setAttribute('r', 4);
}


const workNodes = new Map(), openPrompts = new Set();
function renderWork(d) {
  const focus = S.focus;
  const running = d.jobs.filter(j => ACTIVE.has(j.state) && j.state !== 'queued');
  const queued = d.jobs.filter(j => j.state === 'queued').sort((a, b) => (a.position || 99) - (b.position || 99));
  const others = (d.foreign || []).filter(f => f.state === 'running' && f.via !== 'app');
  let rows = [...running.map(j => ({ kind: 'run', j })), ...others.map(j => ({ kind: 'other', j })), ...queued.map(j => ({ kind: 'queue', j }))];
  if (focus) rows = rows.filter(r => (r.j.card || r.j.planned_card) === focus);
  setText($('.count', workList.parentNode), rows.length ? `${rows.length}` : '');
  if (!rows.length) {
    if (!workList._empty || workList._empty._focus !== focus) {
      workList._empty = emptyState(focus ? 'На этом устройстве сейчас ничего не идёт' : 'Очередь пуста',
        focus ? 'Нажмите на устройство ещё раз, чтобы показать все.' : 'Новые задания и аренды появятся здесь.');
      workList._empty._focus = focus;
    }
    syncChildren(workList, [workList._empty]);
  } else {
    const keys = new Set();
    const nodes = rows.map(r => {
      const key = r.kind + ':' + r.j.id;
      keys.add(key);
      const li = workNode(key);
      fillWork(li, r, key);
      return li;
    });
    for (const k of [...workNodes.keys()]) if (!keys.has(k)) workNodes.delete(k);
    syncChildren(workList, nodes);
  }
  const by = (d.bypass_top || []).filter(b => !focus || b.card === focus);
  const sig = JSON.stringify(by.slice(0, 4));
  if (bypassBox._sig === sig) return;
  bypassBox._sig = sig;
  bypassBox.replaceChildren();
  if (by.length) {
    bypassBox.append(el('div', 'subhead', 'Мимо очереди сегодня'));
    const ul = el('ul', 'events');
    for (const b of by.slice(0, 4)) {
      const li = el('li', 'warn'), body = el('div'), p = el('p', '', `${b.script} · ${devOf(b.card).short} · ${b.count} ${plural(b.count, 'запуск', 'запуска', 'запусков')}, ${humanDur(b.duration_seconds)}`);
      p.title = b.chat_title;
      body.append(p);
      // Где лежит скрипт: его и переводить на очередь.
      if (b.path) { const path = el('small', 'ev-path', '\u200e' + b.path + '\u200e'); path.title = b.path; body.append(path); }
      li.append(icon('alert'), body, el('time', '', ''));
      ul.append(li);
    }
    bypassBox.append(ul);
  }
}
function workNode(key) {
  let li = workNodes.get(key);
  if (li) return li;
  li = el('li', 'witem');
  li._pos = el('span', 'pos');
  const body = el('div', 'w-body');
  li._what = el('p', 'w-what'); li._sub = el('p', 'w-sub'); li._detail = el('div', 'w-detail'); li._prompt = el('p', 'w-prompt');
  li._ptext = el('span'); li._prompt.append(li._ptext);
  li._prompt.title = 'Нажмите, чтобы развернуть промпт';
  li._prompt.addEventListener('click', () => { const open = li._prompt.classList.toggle('open'); open ? openPrompts.add(key) : openPrompts.delete(key); });
  body.append(li._what, li._sub, li._detail, li._prompt);
  li._right = el('div', 'w-right num'); li._eta = el('b'); li._note = el('span');
  li._live = liveBox();
  // Кнопки — только у заданий очереди; отмена подтверждается вторым нажатием.
  li._acts = el('div', 'w-acts');
  li._up = actButton('up', 'Поднять', 'Поставить первым в очереди');
  li._cancel = actButton('close', 'Отменить', 'Убрать из очереди или остановить');
  li._up.addEventListener('click', e => { e.stopPropagation(); bumpJob(li._job); });
  li._cancel.addEventListener('click', e => { e.stopPropagation(); armCancel(li._cancel, () => cancelJob(li._job)); });
  li._acts.append(li._up, li._cancel);
  li._right.append(li._eta, li._note, li._acts);
  li.append(li._pos, body, li._right);
  play(li, 'enter', 420);
  workNodes.set(key, li);
  return li;
}
function fillWork(li, r, key) {
  const j = r.j, card = j.card || j.planned_card, meta = j.meta || {};
  li.style.setProperty('--dev', devOf(card).color);
  const posCls = 'pos' + (r.kind !== 'queue' ? ' run' : '');
  if (li._pos.className !== posCls) li._pos.className = posCls;
  setText(li._pos, r.kind === 'queue' ? String(j.position || '·') : '');
  setText(li._what, r.kind === 'other' && j.via === 'unity' && j.count > 1 ? `Unity-тесты × ${j.count}`
    : meta.model ? metaText(meta) : (j.what || script(j.task) || 'Задание'));
  // Устройство и источник: чат или программа.
  const src = sourceOf(j);
  const where = !card ? 'карта ещё не выбрана' : r.kind === 'queue' ? 'пойдёт на ' + devOf(card).short : devOf(card).short;
  // Раннер под арендой виден как ComfyUI вне очереди — по состоянию карты это аренда.
  const wk = r.kind === 'other' && j.via === 'foreign' ? (S.dash.workers || []).find(w => w.name === card) : null;
  const via = r.kind !== 'other' ? '' : wk && wk.state === 'аренда' ? VIA.lease : (VIA[j.via] || '');
  const subSig = [where, via, src.kind, src.text].join('|');
  if (li._sub._sig !== subSig) {
    li._sub._sig = subSig;
    li._sub.replaceChildren(el('span', 'w-dev', where));
    if (via) li._sub.append(el('span', 'badge', via));
    li._sub.append(sourceNode(src));
  }
  // Референсы и LoRA с весами; перестраиваем, только если состав изменился.
  const refs = (meta.refs || []).slice(0, 4), loras = meta.loras || [], ws = meta.lora_w || [];
  const detSig = JSON.stringify([j.id, refs, loras, ws]);
  if (li._detail._sig !== detSig) {
    li._detail._sig = detSig;
    li._detail.replaceChildren(li._live);
    refs.forEach((name, i) => {
      const b = el('button', 'ref'); b.title = 'Референс: ' + name; b.setAttribute('aria-label', 'Референс ' + name);
      const img = el('img'); img.alt = ''; img.loading = 'lazy'; img.src = refUrl(j, i);
      img.onerror = () => b.remove();
      b.append(img);
      b.addEventListener('click', e => { e.stopPropagation(); lightbox(refs.map((n, k) => ({ key: j.id + '#ref' + k, job: Object.assign({}, j, { media: [] }), media: { url: refUrl(j, k).replace(/&w=\d+/, '&w=480'), thumb: refUrl(j, k), filename: n, type: 'image' }, ref: true })), i, b); });
      li._detail.append(b);
    });
    loras.forEach((name, i) => {
      const c = el('span', 'lora'); c.title = name + (ws[i] != null ? ' · вес ' + nf2.format(ws[i]) : '');
      c.append(el('span', 'lora-name', loraName(name)));
      if (ws[i] != null) c.append(el('span', 'lora-w num', nf2.format(ws[i])));
      li._detail.append(c);
    });
  }
  setLive(li._live, r.kind === 'run' ? j : null, () => null);
  li._detail.hidden = !refs.length && !loras.length && li._live.hidden;
  const prompt = j.prompt_text || j.prompt || '';
  setText(li._ptext, prompt);
  li._prompt.hidden = !prompt;
  li._prompt.classList.toggle('open', openPrompts.has(key));
  const [main, note] = etaParts(j, r.kind === 'queue');
  setText(li._eta, main); setText(li._note, note);
  li._right.title = r.kind === 'queue' ? (j.starts_approx ? 'Старт прикинут по тому, когда освободится занятая карта' : '') : etaTitle(j);
  li.title = [src.kind === 'chat' ? 'Чат: ' + src.text : 'Источник: ' + src.text, j.task ? 'Скрипт: ' + j.task : '',
    meta.path ? 'Где лежит: ' + meta.path : ''].filter(Boolean).join('\n');
  li._job = j;
  const own = !j.foreign && (r.kind === 'queue' || r.kind === 'run');
  li._up.hidden = !(own && r.kind === 'queue' && (j.position || 1) > 1);
  li._cancel.hidden = !own;
  li._acts.hidden = li._up.hidden && li._cancel.hidden;
}
function actButton(ic, label, title) {
  const b = el('button', 'act ' + ic); b.type = 'button'; b.title = title;
  b._label = el('span', '', label); b._text = label;
  b.append(icon(ic), b._label);
  return b;
}
function armCancel(b, run) {
  clearTimeout(b._t);
  if (b.classList.contains('armed')) { b.classList.remove('armed'); setText(b._label, b._text); run(); return; }
  b.classList.add('armed'); setText(b._label, 'Точно отменить?');
  b._t = setTimeout(() => { b.classList.remove('armed'); setText(b._label, b._text); }, 4000);
}
const jobTitle = j => j.meta && j.meta.model ? metaText(j.meta) : (j.what || script(j.task) || 'Задание');
async function bumpJob(j) {
  try {
    const res = await postJSON('/gpuq/bump', { id: j.id });
    if (res && res.error) notify('Не удалось поднять', res.error, 'alert');
    else notify('Первым в очереди', jobTitle(j), 'ok');
  } catch (e) { notify('Очередь не ответила', String(e.message || e), 'err'); }
  refreshDash();
}
async function cancelJob(j) {
  try {
    await postJSON('/queue', { delete: [j.id] });
    notify(j.state === 'queued' ? 'Убрано из очереди' : 'Останавливаем задание', jobTitle(j), 'ok');
  } catch (e) { notify('Очередь не ответила', String(e.message || e), 'err'); }
  refreshDash();
}

const eventNodes = new Map();
function renderEvents(d) {
  const list = [...(d.notices || [])].filter(n => n.ts).sort((a, b) => b.ts - a.ts)
    .filter(n => !S.focus || !n.card || n.card === S.focus).slice(0, 6);
  if (!list.length) {
    if (!eventsList._empty) eventsList._empty = el('li', 'info', 'Событий за сутки пока нет.');
    syncChildren(eventsList, [eventsList._empty]);
    return;
  }
  const keys = new Set();
  syncChildren(eventsList, list.map(n => {
    const key = String(n.id);
    keys.add(key);
    let li = eventNodes.get(key);
    if (!li) {
      const [cls, ic, text] = noticeView(n);
      li = el('li', cls);
      const p = el('p', '', text); p.title = n.chat_title || '';
      li.append(icon(ic), p, el('time', 'num', clock(n.ts)));
      eventNodes.set(key, li);
    }
    return li;
  }));
  for (const k of [...eventNodes.keys()]) if (!keys.has(k)) eventNodes.delete(k);
}
function plain(text) {
  return String(text || '')
    .replace(/<urlopen error \[WinError 10061\][^>]*>/g, 'сервер не отвечает')
    .replace(/<urlopen error [^>]*>/g, 'нет связи с сервером')
    .replace(/\btimed out\b/g, 'нет ответа');
}
function noticeView(n) {
  const card = n.card ? ' — ' + devOf(n.card).short : '';
  switch (n.state) {
    case 'done': return ['ok', 'ok', `Готово: ${n.what || 'задание'}${card}`];
    case 'error': return ['bad', 'err', `Ошибка: ${n.what || 'задание'}${card}`];
    case 'free': return ['info', 'info', n.message || n.what];
    case 'free_error': return ['info', 'info', plain(n.message || n.what).replace(/^ComfyUI :(\d+): /, 'Не удалось выгрузить модель ComfyUI :$1 — ')];
    case 'bypass': case 'bypass_long': case 'lease_stuck': case 'vram_overflow': return ['warn', 'alert', n.message || n.what];
    default: return ['info', 'info', plain(n.message || n.what || n.state)];
  }
}


const shotNodes = new Map();
function renderRecent() {
  if (!sheet) return;
  const items = S.recent.filter(t => !S.focus || t.job.card === S.focus).slice(0, 12);
  if (!items.length) {
    if (!sheet._empty) sheet._empty = emptyState('Пока нет результатов', 'Готовые картинки и видео появятся здесь сразу после расчёта.');
    syncChildren(sheet, [sheet._empty]);
    return;
  }
  const keys = new Set();
  syncChildren(sheet, items.map((t, i) => {
    keys.add(t.key);
    let b = shotNodes.get(t.key);
    if (!b) { b = shot(t, 300); shotNodes.set(t.key, b); if (t.fresh) play(b, 'develop', 2700); }
    b.onclick = () => lightbox(items, i, b);
    return b;
  }));
  for (const k of [...shotNodes.keys()]) if (!keys.has(k)) shotNodes.delete(k);
}
function shot(t, w) {
  const b = el('button', 'shot');
  b.dataset.key = t.key;
  b.style.setProperty('--dev', devOf(t.job.card).color);
  const label = metaText(t.job.meta, t.job.what);
  b.setAttribute('aria-label', `${label}, ${devOf(t.job.card).short}, ${ago(t.job.done_ts)}`);
  const src = thumbUrl(t.media, w);
  if (src) { const img = el('img'); img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.src = src; img.onerror = () => img.replaceWith(el('span', 'ph', 'Нет миниатюры')); b.append(img); }
  else if (isVideo(t.media) && safeUrl(t.media.url)) {
    const v = el('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata';
    v.src = safeUrl(t.media.url) + '#t=0.5';
    b.append(v);
    b.addEventListener('pointerenter', () => v.play().catch(() => {}));
    b.addEventListener('pointerleave', () => { v.pause(); });
  } else b.append(el('span', 'ph', 'Файл'));
  if (isVideo(t.media)) { const p = el('span', 'play'); p.append(icon('play')); b.append(p); }
  const cap = el('span', 'cap', `${label} · ${ago(t.job.done_ts)}`);
  b.append(cap);
  return b;
}

// ---------- Галерея ----------
const gal$ = $('#view-gallery');
let gGrid, gMore, gObserver;
function buildGallery() {
  const f = el('div', 'filters');
  f.append(deviceChips(() => S.gallery.card, name => { S.gallery.card = name; resetGallery(); render(); }));
  const seg = el('div', 'seg');
  for (const [k, label] of [['', 'Всё'], ['image', 'Картинки'], ['video', 'Видео']]) {
    const b = el('button', '', label); b.dataset.kind = k;
    b.addEventListener('click', () => { S.gallery.kind = k; resetGallery(); render(); });
    seg.append(b);
  }
  f.append(seg);
  const s = el('label', 'search'); s.append(icon('search'));
  const inp = el('input'); inp.id = 'gSearch'; inp.type = 'search'; inp.placeholder = 'Чат, модель, LoRA, промпт'; inp.setAttribute('aria-label', 'Поиск по галерее');
  inp.addEventListener('input', () => { S.gallery.q = inp.value.trim().toLowerCase(); layoutGallery(); });
  s.append(inp); f.append(s);
  gGrid = el('div', 'justified');
  gMore = el('div', 'more');
  gal$.append(f, gGrid, gMore);
  gObserver = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) loadGallery(); }, { root: $('#main'), rootMargin: '600px' });
  gObserver.observe(gMore);
}
function deviceChips(get, set) {
  const box = el('div', 'chips');
  const mk = (name, label) => {
    const b = el('button', 'chip'); b.dataset.dev = name;
    if (name) { const dot = el('span', 'dot'); b.style.setProperty('--dev', devOf(name).color); b.append(dot); }
    b.append(label);
    b.addEventListener('click', () => set(get() === name ? '' : name));
    box.append(b);
  };
  mk('', 'Все устройства');
  for (const d of DEVICES) mk(d.name, d.short);
  box._sync = () => { for (const b of box.children) b.setAttribute('aria-pressed', String(b.dataset.dev === get())); };
  return box;
}
const tileNodes = new Map();
function resetGallery() {
  const g = S.gallery;
  g.items = []; g.offset = 0; g.more = true; g.seen = new Set(); g.rev++;
  tileNodes.clear();
  if (gGrid) { gGrid.replaceChildren(); gGrid._sig = ''; }
}
async function loadGallery() {
  const g = S.gallery;
  if (g.loading || !g.more || S.tab !== 'gallery') return;
  g.loading = true; renderGalleryMore();
  const rev = g.rev;
  try {
    const q = `/gpuq/gallery?limit=48&offset=${g.offset}` + (g.card ? '&card=' + encodeURIComponent(g.card) : '') + (g.kind ? '&kind=' + g.kind : '');
    const r = await getJSON(q);
    if (rev !== g.rev) return;
    const tiles = tilesOf(r.items || []).filter(t => !g.seen.has(t.key));
    tiles.forEach(t => g.seen.add(t.key));
    g.items.push(...tiles); g.offset += (r.items || []).length; g.more = !!r.has_more;
    layoutGallery(true);
  } catch (e) { g.error = String(e.message || e); }
  finally { if (rev === g.rev) g.loading = false; renderGalleryMore(); }
  // Если экран ещё не заполнен — подгружаем дальше.
  if (g.more && gMore.getBoundingClientRect().top < innerHeight + 400) setTimeout(loadGallery, 50);
}
async function refreshGalleryTop() {
  const g = S.gallery;
  if (S.tab !== 'gallery' || g.loading || !g.items.length || $('#main').scrollTop > 200) return;
  const q = `/gpuq/gallery?limit=24&offset=0` + (g.card ? '&card=' + encodeURIComponent(g.card) : '') + (g.kind ? '&kind=' + g.kind : '');
  const rev = g.rev;
  const r = await getJSON(q);
  if (rev !== g.rev) return;
  const fresh = tilesOf(r.items || []).filter(t => !g.seen.has(t.key));
  if (!fresh.length) return;
  fresh.forEach(t => { g.seen.add(t.key); t.fresh = true; });
  g.items.unshift(...fresh); g.offset += new Set(fresh.map(t => t.job.id)).size;
  layoutGallery();
}
function renderGalleryMore() {
  const g = S.gallery;
  gMore.replaceChildren(g.loading ? el('span', 'spinner') : g.error && !g.items.length ? emptyState('Галерея не загрузилась', g.error)
    : !g.items.length ? emptyState('Здесь пока пусто', g.card || g.kind ? 'Снимите фильтр, чтобы увидеть все результаты.' : 'Готовые картинки и видео появятся здесь.')
    : g.more ? '' : el('span', '', `Это все результаты: ${g.items.length}`));
}
function galleryVisible() {
  const g = S.gallery, q = g.q;
  if (!q) return g.items;
  return g.items.filter(t => [t.job.chat_title, t.job.what, t.job.task, t.job.prompt_text, t.job.meta && t.job.meta.model,
    ...((t.job.meta && t.job.meta.loras) || []), t.media.filename].join(' ').toLowerCase().includes(q));
}
function layoutGallery(append) {
  if (!gGrid || S.tab !== 'gallery') return;
  const items = galleryVisible();
  const W = gGrid.clientWidth || 1000, gap = 8, target = W > 1300 ? 250 : 220;
  // Раскладка меняется только с составом или шириной: без этого плитки не трогаем вовсе.
  const sig = W + '|' + items.map(t => t.key).join(',');
  if (gGrid._sig === sig) return;
  gGrid._sig = sig;
  const rows = [];
  let cur = [], sum = 0;
  for (const t of items) {
    const m = t.job.meta || {}, ar = m.w && m.h ? Math.min(2.4, Math.max(.4, m.w / m.h)) : .75;
    cur.push([t, ar]); sum += ar;
    if (sum * target + gap * (cur.length - 1) >= W) { rows.push([cur, sum, true]); cur = []; sum = 0; }
  }
  if (cur.length) rows.push([cur, sum, false]);
  const frag = [];
  rows.forEach(([row, s, full]) => {
    const h = full ? (W - gap * (row.length - 1)) / s : target;
    const r = el('div', 'jrow');
    for (const [t, ar] of row) {
      let b = tileNodes.get(t.key);
      if (!b) { b = shot(t, 480); tileNodes.set(t.key, b); play(b, t.fresh ? 'develop' : 'enter', t.fresh ? 2700 : 520); }
      b.style.width = Math.floor(h * ar) + 'px'; b.style.height = Math.floor(h) + 'px';
      b.onclick = () => lightbox(items, items.indexOf(t), b);
      r.append(b);
    }
    frag.push(r);
  });
  gGrid.replaceChildren(...frag);
}
function renderGallery() {
  if (!gGrid) buildGallery();
  $('.chips', gal$)._sync();
  for (const b of $('.seg', gal$).children) b.setAttribute('aria-pressed', String(b.dataset.kind === S.gallery.kind));
  if (!S.gallery.items.length && S.gallery.more) loadGallery(); else layoutGallery();
  renderGalleryMore();
}

// ---------- История ----------
const his$ = $('#view-history');
let tlBox, tlSvg, doneBox, hFilters;
function buildHistory() {
  hFilters = el('div', 'filters');
  const seg = el('div', 'seg');
  for (const [h, label] of [[6, '6 часов'], [24, 'Сутки'], [168, '7 дней']]) {
    const b = el('button', '', label); b.dataset.h = h;
    b.addEventListener('click', () => { S.history.hours = h; S.history.data = null; refreshHistory(); render(); });
    seg.append(b);
  }
  hFilters.append(seg);
  const tl = el('section', 'panel');
  const head = el('div', 'section-head'); head.style.padding = '14px 16px 0';
  head.append(el('h2', '', 'Занятость устройств'), el('span', 'spacer'));
  const tb = el('button', 'link table-toggle', 'Таблица'); tb.setAttribute('aria-pressed', 'false');
  tb.addEventListener('click', () => { const on = tb.getAttribute('aria-pressed') !== 'true'; tb.setAttribute('aria-pressed', String(on)); drawTimeline(); });
  head.append(tb);
  tlBox = el('div', 'timeline');
  const legend = el('div', 'legend');
  legend.append(legendItem('var(--c-d1)', 'Работает (цвет устройства)'), legendItem('var(--surface-2)', 'Простой'), legendItem('repeating-linear-gradient(45deg, #3a3c42 0 2px, transparent 2px 5px)', 'Не в сети'));
  tl.append(head, tlBox, legend);
  const list = el('section', 'panel'); list.style.marginTop = '16px';
  const lh = el('div', 'filters'); lh.style.padding = '14px 16px 0'; lh.style.marginBottom = '6px';
  const fseg = el('div', 'seg');
  for (const [k, label] of [['all', 'Все'], ['done', 'Готово'], ['error', 'Ошибки']]) {
    const b = el('button', '', label); b.dataset.f = k;
    b.addEventListener('click', () => { S.history.filter = k; renderDone(); syncHistoryFilters(); });
    fseg.append(b);
  }
  lh.append(el('h2', '', 'Завершённые задания'), fseg);
  lh.firstChild.style.cssText = 'margin:0;font:600 15px/1.2 var(--font-display)';
  lh.append(deviceChips(() => S.history.card, name => { S.history.card = name; S.history.offset = 0; S.history.list = null; refreshDone(); syncHistoryFilters(); }));
  doneBox = el('div');
  const pager = el('div', 'pager');
  const newer = el('button', 'btn', 'Новее'), older = el('button', 'btn', 'Старее');
  newer.addEventListener('click', () => { S.history.offset = Math.max(0, S.history.offset - 50); refreshDone(); });
  older.addEventListener('click', () => { S.history.offset += 50; refreshDone(); });
  pager.append(newer, older);
  list.append(lh, doneBox, pager);
  his$.append(hFilters, tl, list);
}
function legendItem(bg, label) { const s = el('span'); const i = el('i'); i.style.background = bg; s.append(i, label); return s; }
function syncHistoryFilters() {
  for (const b of $('.seg', hFilters).children) b.setAttribute('aria-pressed', String(+b.dataset.h === S.history.hours));
  for (const b of his$.querySelectorAll('[data-f]')) b.setAttribute('aria-pressed', String(b.dataset.f === S.history.filter));
  his$.querySelectorAll('.chips').forEach(c => c._sync());
}
async function refreshHistory() {
  const h = S.history.hours;
  try {
    const d = await getJSON('/gpuq/history?hours=' + h, 20000);
    if (h === S.history.hours) { S.history.data = d; if (S.tab === 'history') drawTimeline(); }
  } catch (e) { S.history.error = String(e.message || e); if (S.tab === 'history') drawTimeline(); }
}
async function refreshDone() {
  const H = S.history;
  try {
    const d = await getJSON(`/gpuq/dashboard?limit=50&offset=${H.offset}` + (H.card ? '&card=' + encodeURIComponent(H.card) : ''));
    const rows = [...d.jobs.filter(j => !ACTIVE.has(j.state)), ...(d.foreign || []).filter(f => f.state !== 'running' && f.via !== 'app')];
    rows.sort((a, b) => (b.done_ts || 0) - (a.done_ts || 0));
    H.list = rows; H.more = d.jobs.length >= 50 || (d.foreign || []).length >= 50;
  } catch (e) { H.list = H.list || []; H.listError = String(e.message || e); }
  if (S.tab === 'history') renderDone();
}
function renderDone() {
  const H = S.history;
  if (!H.list) { doneBox.replaceChildren(el('div', 'more', '')); doneBox.firstChild.append(el('span', 'spinner')); return; }
  let rows = H.list;
  if (H.filter === 'done') rows = rows.filter(r => r.state === 'done');
  if (H.filter === 'error') rows = rows.filter(r => r.state === 'error' || r.state === 'cancelled');
  const ul = el('ul', 'done-list');
  if (!rows.length) ul.append(emptyState('Здесь пусто', H.filter === 'error' ? 'Ошибок на этой странице нет.' : 'Завершённые задания появятся здесь.'));
  const tiles = [];
  for (const r of rows) {
    const li = el('li'); li.style.setProperty('--dev', devOf(r.card).color);
    const mini = el('button', 'mini'); mini.setAttribute('aria-label', 'Открыть результат');
    const m = (r.media || [])[0];
    const src = m && thumbUrl(Object.assign({ thumb: !isVideo(m) && m.url ? m.url.replace('/gpuq/media?', '/gpuq/thumb?') : '' }, m), 120);
    if (src) { const img = el('img'); img.loading = 'lazy'; img.alt = ''; img.src = src; mini.append(img); }
    else { const ic = el('span', 'ico'); ic.append(icon(m && isVideo(m) ? 'play' : r.via === 'unity' ? 'cube' : 'image')); mini.append(ic); }
    if (m) { const t = { key: r.id + '#0', job: r, media: m }; tiles.push(t); mini.addEventListener('click', () => lightbox(tiles, tiles.indexOf(t), mini)); }
    else mini.disabled = true;
    const a = el('div'); a.append(el('p', 'w-what', r.via === 'unity' && r.count > 1 ? `Unity-тесты × ${r.count}` : metaText(r.meta, r.what || script(r.task))));
    a.append(el('p', 'w-sub', sourceOf(r).text));
    const b = el('div'); const dv = el('span', 'w-dev', devOf(r.card).short); b.append(dv);
    const via = el('p', 'w-sub', VIA[r.via] || (r.foreign ? '' : 'Очередь')); b.append(via);
    const ok = r.state === 'done';
    const st = el('span', 'state-pill ' + (ok ? 'ok' : r.state === 'cancelled' ? 'mute' : 'bad'));
    st.append(icon(ok ? 'ok' : 'err'), ok ? 'Готово' : r.state === 'cancelled' ? 'Отменено' : 'Ошибка');
    if (r.error) st.title = r.error;
    const tm = el('div', 'w-right num'); tm.append(el('b', '', r.done_ts ? clock(r.done_ts) : '—'), r.duration_seconds != null ? clockDur(r.duration_seconds) : '');
    li.append(mini, a, b, st, tm);
    ul.append(li);
  }
  doneBox.replaceChildren(ul);
  const [newer, older] = his$.querySelectorAll('.pager .btn');
  newer.disabled = H.offset === 0; older.disabled = !H.more;
}
function drawTimeline() {
  if (!tlBox || S.tab !== 'history') return;
  const d = S.history.data, tableOn = his$.querySelector('.table-toggle').getAttribute('aria-pressed') === 'true';
  if (!d) { tlBox.replaceChildren(S.history.error ? emptyState('История не загрузилась', S.history.error) : el('span', 'spinner')); return; }
  const names = [...DEVICES.map(x => x.name), ...Object.keys(d.cards).filter(n => !DEVICES.find(x => x.name === n))];
  if (tableOn) {
    const t = el('table', 'data');
    const hr = el('tr'); for (const h of ['Устройство', 'Работало', 'Простой', 'Не в сети', 'Занятость']) hr.append(el('th', '', h));
    t.append(hr);
    for (const n of names) {
      const s = (d.cards[n] || {}).summary || {};
      const tr = el('tr');
      tr.append(el('td', '', devOf(n).short), el('td', 'n', humanDur(s.busy_seconds)), el('td', 'n', humanDur(s.idle_seconds)),
        el('td', 'n', humanDur(s.offline_seconds)), el('td', 'n', s.busy_pct == null ? '—' : nf1.format(s.busy_pct) + ' %'));
      t.append(tr);
    }
    tlBox.replaceChildren(t); return;
  }
  const W = tlBox.clientWidth - 32 || 900, L = 118, R = 64, rowH = 30, gapY = 12, top = 6;
  const H = top + names.length * (rowH + gapY) + 22, x0 = L, x1 = W - R, span = d.hours * 3600, t1 = d.ts, t0 = t1 - span;
  const X = t => x0 + (t - t0) / span * (x1 - x0);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': 'Занятость устройств по времени' });
  const defs = sv('defs'), pat = sv('pattern', { id: 'hatch', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pat.append(sv('rect', { width: 2, height: 5, fill: '#3a3c42' })); defs.append(pat); svg.append(defs);
  // Деления времени: по часам, по 3 часа или по дням.
  const step = d.hours <= 6 ? 3600 : d.hours <= 24 ? 3 * 3600 : 86400;
  const first = new Date(t0 * 1000); first.setMinutes(0, 0, 0);
  if (step === 86400) first.setHours(0); else first.setHours(Math.ceil(first.getHours() / (step / 3600)) * (step / 3600));
  for (let t = first.getTime() / 1000; t <= t1; t += step) {
    if (t < t0) continue;
    const x = X(t);
    svg.append(sv('line', { class: 'tl-grid', x1: x, x2: x, y1: top, y2: H - 20 }));
    const lab = sv('text', { class: 'tl-axis', x, y: H - 4, 'text-anchor': 'middle' });
    lab.textContent = step === 86400 ? new Date(t * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : clock(t);
    svg.append(lab);
  }
  names.forEach((n, i) => {
    const y = top + i * (rowH + gapY), card = d.cards[n], dv = devOf(n);
    const lab = sv('text', { class: 'tl-label', x: 0, y: y + rowH / 2 + 4 }); lab.textContent = dv.short; svg.append(lab);
    svg.append(sv('rect', { x: x0, y, width: x1 - x0, height: rowH, rx: 4, fill: 'rgba(255,255,255,.015)' }));
    if (!card) return;
    const pts = card.points || [];
    let seg = null;
    const flush = () => {
      if (!seg) return;
      const a = X(Math.max(seg.a, t0)), b = X(Math.min(seg.b, t1));
      if (b - a > .3) {
        const r = sv('rect', { x: a, y: y + (seg.k === 'busy' ? 0 : 6), width: Math.max(.8, b - a - (seg.k === 'busy' ? 1 : 0)), height: seg.k === 'busy' ? rowH : rowH - 12, rx: 2 });
        if (seg.k === 'busy') r.style.fill = dv.color;
        else r.setAttribute('class', seg.k === 'off' ? 'tl-off' : 'tl-idle');
        svg.append(r);
      }
      seg = null;
    };
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k], next = pts[k + 1];
      const kind = p.state === 'офлайн' ? 'off' : (p.util || 0) >= 20 || ['генерация', 'аренда', 'unity'].includes(p.state) ? 'busy' : 'idle';
      const end = Math.min(p.ts + 60, next ? next.ts : t1);
      if (seg && (seg.k !== kind || p.ts - seg.b > 90)) flush();
      if (!seg) seg = { k: kind, a: p.ts, b: end }; else seg.b = end;
    }
    flush();
    const pct = sv('text', { class: 'tl-pct', x: W - 2, y: y + rowH / 2 + 4, 'text-anchor': 'end' });
    const bp = card.summary && card.summary.busy_pct;
    pct.textContent = bp == null ? '—' : nf1.format(bp) + ' %';
    svg.append(pct);
  });
  const cross = sv('line', { class: 'tl-cross', y1: top, y2: H - 20, visibility: 'hidden' });
  svg.append(cross);
  const tip = $('#tooltip');
  const hit = sv('rect', { x: x0, y: 0, width: x1 - x0, height: H - 20, fill: 'transparent' });
  hit.addEventListener('pointermove', e => {
    const box = svg.getBoundingClientRect(), x = (e.clientX - box.left) * (W / box.width);
    const t = t0 + (x - x0) / (x1 - x0) * span;
    cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
    tip.replaceChildren(el('h4', '', new Date(t * 1000).toLocaleString('ru-RU', { weekday: 'short', hour: '2-digit', minute: '2-digit' })));
    for (const n of names) {
      const pts = (d.cards[n] || {}).points || [];
      const p = nearest(pts, t);
      const row = el('div', 'tt-row'), key = el('i', 'key'); key.style.setProperty('--dev', devOf(n).color);
      const val = p && Math.abs(p.ts - t) < 120 ? (p.state === 'офлайн' ? 'не в сети' : `${nf0.format(p.util || 0)} %`) : 'нет данных';
      const note = p && Math.abs(p.ts - t) < 120 && p.temp != null ? `${nf0.format(p.temp)} °C` : '';
      const name = el('span'); name.append(el('b', '', val), ' ' + devOf(n).short);
      row.append(key, name, el('span', '', note));
      tip.append(row);
    }
    placeTip(e.clientX, e.clientY);
  });
  hit.addEventListener('pointerleave', () => { tip.classList.remove('show'); cross.setAttribute('visibility', 'hidden'); });
  svg.append(hit);
  tlBox.replaceChildren(svg);
}
function nearest(pts, t) {
  let lo = 0, hi = pts.length - 1;
  if (hi < 0) return null;
  while (lo < hi) { const m = (lo + hi) >> 1; if (pts[m].ts < t) lo = m + 1; else hi = m; }
  const a = pts[lo], b = pts[lo - 1];
  return b && Math.abs(b.ts - t) < Math.abs(a.ts - t) ? b : a;
}
function placeTip(x, y) {
  const tip = $('#tooltip');
  tip.classList.add('show');
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(innerWidth - r.width - 12, x + 16) + 'px';
  tip.style.top = Math.min(innerHeight - r.height - 12, y + 14) + 'px';
}
function renderHistory() {
  if (!tlBox) buildHistory();
  syncHistoryFilters();
  drawTimeline();
  if (!S.history.list) refreshDone(); else renderDone();
}

// ---------- Отчёт ----------
const rep$ = $('#view-report');
let repBody;
function buildReport() {
  const f = el('div', 'filters'), seg = el('div', 'seg');
  for (const [k, label] of [[1, 'Сутки'], [7, '7 дней'], [30, '30 дней']]) {
    const b = el('button', '', label); b.dataset.d = k;
    b.addEventListener('click', () => { S.report.days = k; refreshReport(); for (const x of seg.children) x.setAttribute('aria-pressed', String(+x.dataset.d === k)); });
    seg.append(b);
  }
  f.append(seg);
  repBody = el('div');
  rep$.append(f, repBody);
}
async function refreshReport() {
  const days = S.report.days;
  repBody.style.opacity = S.report.data ? .55 : 1;
  try { const r = await getJSON('/gpuq/report?days=' + days); if (days === S.report.days) S.report.data = r; S.report.error = ''; }
  catch (e) { S.report.error = String(e.message || e); }
  repBody.style.opacity = 1;
  if (S.tab === 'report') renderReportBody();
}
function tile(label, value, note, dev, pct) {
  const t = el('div', 'panel tile');
  const l = el('p', 't-label');
  if (dev) { const dot = el('span', 'dot'); t.style.setProperty('--dev', devOf(dev).color); l.append(dot); }
  l.append(label);
  t.append(l, el('p', 't-value', value), el('p', 't-note', note || ''));
  if (pct != null) { const tr = el('span', 'm-track'); tr.style.display = 'block'; const i = el('i'); i.style.width = Math.min(100, pct) + '%'; tr.append(i); t.append(tr); }
  return t;
}
function waitText(w) {
  if (!w || !w.count) return ['—', 'ожидание ещё не записано'];
  return [humanDur(w.p50), `90 % — до ${humanDur(w.p90)}, максимум ${humanDur(w.max)}; дольше минуты: ${w.over_minute} из ${w.count}`];
}
function barsPanel(title, rows, key) {
  const p = el('section', 'panel bars');
  const head = el('div', 'section-head'); head.append(el('h2', '', title), el('span', 'spacer'));
  const on = S.report.tables.has(key);
  const tb = el('button', 'link', on ? 'График' : 'Таблица');
  tb.addEventListener('click', () => { on ? S.report.tables.delete(key) : S.report.tables.add(key); renderReportBody(); });
  head.append(tb); p.append(head);
  if (!rows.length) { p.append(emptyState('Нет данных за период', '')); return p; }
  const max = Math.max(...rows.map(r => r.v)) || 1;
  if (on) {
    const t = el('table', 'data'), hr = el('tr'); hr.append(el('th', '', 'Название'), el('th', '', 'GPU-часы')); t.append(hr);
    for (const r of rows) { const tr = el('tr'); tr.append(el('td', '', r.name), el('td', 'n', nf1.format(r.v / 3600))); t.append(tr); }
    p.append(t); return p;
  }
  for (const r of rows) {
    const row = el('div', 'bar-row'), name = el('span', 'b-name', r.name); name.title = r.name;
    const track = el('span', 'b-track'), fill = el('span', 'b-fill'); fill.style.width = (r.v / max * 100).toFixed(1) + '%';
    track.append(fill);
    row.append(name, track, el('span', 'b-val num', nf1.format(r.v / 3600) + ' ч'));
    row.title = `${r.name}: ${humanDur(r.v)}`;
    p.append(row);
  }
  return p;
}
function renderReportBody() {
  const r = S.report.data;
  if (!r) { repBody.replaceChildren(S.report.error ? emptyState('Отчёт не загрузился', S.report.error) : el('span', 'spinner')); return; }
  const devTiles = el('div', 'tiles');
  for (const dv of DEVICES) {
    const s = (r.devices || {})[dv.name];
    devTiles.append(tile(dv.short === '6000' ? 'RTX PRO 6000' : dv.short, s && s.busy_pct != null ? nf1.format(s.busy_pct) + ' %' : '—',
      s ? `работало ${nf1.format(s.busy_hours)} ч из ${nf1.format((s.observed_seconds || 0) / 3600)} ч наблюдения` + (s.offline_hours > .05 ? `, не в сети ${nf1.format(s.offline_hours)} ч` : '') : 'нет данных',
      dv.name, s ? s.busy_pct : null));
  }
  const w = r.waits || {}, pools = r.pools || {}, kre = pools.krea || { jobs: 0, gpu_seconds: 0 };
  const [qv, qn] = waitText(w.queue), [lv, ln] = waitText(w.lease);
  const work = el('div', 'tiles');
  work.append(
    tile('Задания очереди ждали (медиана)', qv, qn),
    tile('Аренды ждали (медиана)', lv, ln + (w.lease_top && w.lease_top[0] ? `; дольше всех — ${script(w.lease_top[0].owner)}` : '')),
    tile('Через очередь', `${kre.jobs}`, `${plural(kre.jobs, 'задание', 'задания', 'заданий')}, ${nf1.format(kre.gpu_seconds / 3600)} GPU-часов`),
    tile('Мимо очереди', `${(r.bypass || {}).jobs || 0}`, `${nf1.format(((r.bypass || {}).gpu_seconds || 0) / 3600)} GPU-часов${r.unity_runs ? `; Unity-прогонов ${r.unity_runs}` : ''}`),
  );
  const two = el('div', 'two');
  two.append(barsPanel('Скрипты по GPU-времени', (r.top_scripts || []).slice(0, 8).map(x => ({ name: x.script, v: x.gpu_seconds })), 'scripts'));
  const note = el('p', 't-note');
  note.style.margin = '14px 2px 0';
  note.textContent = `Наблюдение: ${nf1.format((r.observed_seconds || 0) / 3600)} ч. Модель не перезагружалась ${r.model_hits || 0} раз, перезагружалась ${r.model_swaps || 0}.` +
    (w.queued_now && w.queued_now.jobs ? ` Сейчас ждут ${w.queued_now.jobs}, дольше всех — ${humanDur(w.queued_now.oldest_seconds)}.` : '');
  repBody.replaceChildren(devTiles, work, two, note);
}
function renderReport() {
  if (!repBody) buildReport();
  for (const x of $('.seg', rep$).children) x.setAttribute('aria-pressed', String(+x.dataset.d === S.report.days));
  if (!S.report.data) refreshReport(); else renderReportBody();
}

// ---------- Лайтбокс ----------
const lb = { open: false };
function lightbox(list, index, from) {
  if (!list.length) return;
  closeLightbox(true);
  lb.open = true; lb.list = list; lb.i = Math.max(0, index); lb.from = from; lb.info = localStorage.getItem('gpuq.info') !== '0';
  lb.root = el('div', 'lb' + (lb.info ? '' : ' no-info'));
  lb.root.setAttribute('role', 'dialog'); lb.root.setAttribute('aria-modal', 'true'); lb.root.setAttribute('aria-label', 'Просмотр результата');
  lb.stage = el('div', 'lb-stage');
  const top = el('div', 'lb-top');
  lb.counter = el('span', 'num');
  const fullBtn = el('button', 'icon-btn'); fullBtn.setAttribute('aria-label', 'Во весь экран (F)'); fullBtn.title = 'Во весь экран (F)'; fullBtn.append(icon('expand'));
  fullBtn.addEventListener('click', () => toggleFull());
  const infoBtn = el('button', 'icon-btn'); infoBtn.setAttribute('aria-label', 'Сведения (I)'); infoBtn.title = 'Сведения (I)'; infoBtn.append(icon('panel'));
  infoBtn.addEventListener('click', () => { lb.info = !lb.info; localStorage.setItem('gpuq.info', lb.info ? '1' : '0'); lb.root.classList.toggle('no-info', !lb.info); });
  const close = el('button', 'icon-btn'); close.setAttribute('aria-label', 'Закрыть'); close.append(icon('close'));
  close.addEventListener('click', () => closeLightbox());
  top.append(lb.counter, el('span', 'spacer'), fullBtn, infoBtn, close);
  const prev = el('button', 'lb-nav lb-prev'); prev.setAttribute('aria-label', 'Предыдущий'); prev.append(icon('left'));
  const next = el('button', 'lb-nav lb-next'); next.setAttribute('aria-label', 'Следующий'); next.append(icon('right'));
  prev.addEventListener('click', e => { e.stopPropagation(); go(-1); });
  next.addEventListener('click', e => { e.stopPropagation(); go(1); });
  lb.strip = el('div', 'lb-strip');
  lb.stage.append(top, prev, next, lb.strip);
  lb.side = el('aside', 'lb-info');
  lb.root.append(lb.stage, lb.side);
  document.body.append(lb.root);
  lb.stage.addEventListener('click', e => { if (e.target === lb.stage) closeLightbox(); });
  lb.stage.addEventListener('wheel', onWheel, { passive: false });
  lb.stage.addEventListener('pointerdown', onDrag);
  show(true);
  close.focus();
}
function show(first) {
  const t = lb.list[lb.i], m = t.media;
  lb.counter.textContent = `${lb.i + 1} из ${lb.list.length}`;
  lb.z = { s: 1, x: 0, y: 0 };
  lb.media && lb.media.remove();
  let node;
  if (isVideo(m)) { node = el('video', 'lb-media'); node.controls = true; node.autoplay = true; node.loop = true; node.muted = true; node.playsInline = true; node.src = safeUrl(m.url); }
  else {
    node = el('img', 'lb-media'); node.alt = metaText(t.job.meta, t.job.what);
    const th = thumbUrl(m, 480); if (th) node.src = th;
    const full = new Image(); full.decoding = 'async'; full.src = safeUrl(m.url);
    full.onload = () => { if (lb.media === node) node.src = full.src; };
  }
  node.draggable = false;
  lb.media = node;
  lb.stage.insertBefore(node, lb.stage.firstChild.nextSibling);
  if (first && lb.from && !reduce.matches) flyFrom(node, lb.from);
  renderInfo(t);
  renderStrip();
}
function flyFrom(node, from) {
  const a = from.getBoundingClientRect();
  if (node.tagName !== 'IMG') return;
  (node.decode ? node.decode().catch(() => {}) : Promise.resolve()).then(() => requestAnimationFrame(() => {
    const b = node.getBoundingClientRect();
    if (!b.width || !a.width) return;
    const s = a.width / b.width;
    node.style.transform = `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${s})`;
    node.style.opacity = '.6';
    requestAnimationFrame(() => { node.classList.add('fly'); node.style.transform = ''; node.style.opacity = ''; setTimeout(() => node.classList.remove('fly'), 450); });
  }));
}
function renderInfo(t) {
  const j = t.job, m = t.media, meta = j.meta || {};
  lb.side.replaceChildren();
  const src = sourceOf(j);
  lb.side.append(el('h3', '', t.ref ? 'Референс' : metaText(meta, j.what)), el('p', 'chat', src.text));
  const dl = el('dl', 'facts');
  const fact = (k, v) => { if (v == null || v === '') return; dl.append(el('dt', '', k), el('dd', '', String(v))); };
  fact('Устройство', devOf(j.card).name);
  fact('Готово', j.done_ts ? ago(j.done_ts) : '');
  fact('Считалось', j.duration_seconds != null ? clockDur(j.duration_seconds) : '');
  fact('Модель', meta.model);
  fact('Размер', meta.w && meta.h ? `${meta.w}×${meta.h}` : '');
  fact('Шаги', meta.steps);
  if (meta.seconds) fact('Длина', `${nf1.format(meta.seconds)} с, ${meta.frames || '?'} кадров, ${nf1.format(meta.fps || 0)} к/с`);
  fact('LoRA', (meta.loras || []).join(', '));
  if (src.kind === 'chat' && src.app) fact('Программа', src.app);
  fact('Путь задания', VIA[j.via] || (j.foreign ? '' : 'Очередь'));
  fact('Скрипт', script(j.task));
  fact('Файл', m.filename);
  lb.side.append(dl);
  const prompt = j.prompt_text || j.prompt || '';
  if (prompt) { lb.side.append(el('div', 'subhead', 'Промпт')); lb.side.lastChild.style.borderTop = '0'; lb.side.append(el('div', 'prompt', prompt)); }
  const acts = el('div', 'lb-actions');
  const dlb = el('a', 'btn'); dlb.href = safeUrl(m.url); dlb.download = m.filename || ''; dlb.append('Скачать');
  dlb.style.cssText = 'display:inline-flex;align-items:center;gap:6px;text-decoration:none';
  acts.append(dlb);
  if (prompt && navigator.clipboard) {
    const c = el('button', 'btn', 'Копировать промпт');
    c.addEventListener('click', () => navigator.clipboard.writeText(prompt).then(() => { c.textContent = 'Скопировано'; setTimeout(() => { c.textContent = 'Копировать промпт'; }, 1600); }));
    acts.append(c);
  }
  lb.side.append(acts);
}
function renderStrip() {
  const a = Math.max(0, lb.i - 6), b = Math.min(lb.list.length, lb.i + 7);
  lb.strip.replaceChildren();
  for (let k = a; k < b; k++) {
    const t = lb.list[k], btn = el('button', k === lb.i ? 'cur' : '');
    btn.setAttribute('aria-label', `Результат ${k + 1}`);
    const src = thumbUrl(t.media, 120);
    if (src) { const img = el('img'); img.alt = ''; img.src = src; btn.append(img); }
    else { btn.append(icon('play')); btn.firstChild.style.cssText = 'width:14px;height:14px;color:#fff'; }
    btn.addEventListener('click', e => { e.stopPropagation(); lb.i = k; show(); });
    lb.strip.append(btn);
  }
}
function go(dir) { if (!lb.open) return; lb.i = (lb.i + dir + lb.list.length) % lb.list.length; show(); }
function applyZoom() { lb.media.style.transform = `translate(${lb.z.x}px, ${lb.z.y}px) scale(${lb.z.s})`; }
function onWheel(e) {
  if (!lb.media || lb.media.tagName === 'VIDEO') return;
  e.preventDefault();
  const r = lb.media.getBoundingClientRect(), k = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const s = Math.min(8, Math.max(1, lb.z.s * k)), f = s / lb.z.s;
  const cx = e.clientX - (r.left + r.width / 2), cy = e.clientY - (r.top + r.height / 2);
  lb.z.x = s === 1 ? 0 : lb.z.x - cx * (f - 1); lb.z.y = s === 1 ? 0 : lb.z.y - cy * (f - 1); lb.z.s = s;
  applyZoom();
}
function onDrag(e) {
  if (e.target !== lb.media || lb.z.s === 1) return;
  const sx = e.clientX - lb.z.x, sy = e.clientY - lb.z.y;
  lb.stage.classList.add('dragging');
  const move = ev => { lb.z.x = ev.clientX - sx; lb.z.y = ev.clientY - sy; applyZoom(); };
  const up = () => { lb.stage.classList.remove('dragging'); removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
// Полный экран: в окне трея WebView2 сообщает о нём, и трей разворачивает окно без рамки.
function toggleFull() {
  if (!lb.open) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (lb.root.requestFullscreen) lb.root.requestFullscreen().catch(() => lb.root.classList.toggle('full'));
  else lb.root.classList.toggle('full');
}
document.addEventListener('fullscreenchange', () => { if (lb.open) lb.root.classList.toggle('full', !!document.fullscreenElement); });
function closeLightbox(silent) {
  if (!lb.open) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  lb.open = false;
  lb.root.remove();
  if (!silent && lb.from && document.contains(lb.from)) lb.from.focus();
}
addEventListener('keydown', e => {
  if (!lb.open) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft') go(-1);
  else if (e.key === 'ArrowRight') go(1);
  else if (e.key === 'i' || e.key === 'ш') lb.root.querySelector('.lb-top [aria-label^="Сведения"]').click();
  else if (e.key === 'f' || e.key === 'а') toggleFull();
  else if (e.key === '0') { lb.z = { s: 1, x: 0, y: 0 }; applyZoom(); }
  else return;
  e.preventDefault();
});
addEventListener('dblclick', e => {
  if (!lb.open || e.target !== lb.media || lb.media.tagName === 'VIDEO') return;
  lb.z = lb.z.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 };
  lb.media.classList.add('fly'); applyZoom(); setTimeout(() => lb.media.classList.remove('fly'), 450);
});

// ---------- Тосты о готовности ----------
function toastNotices(d) {
  const fresh = (d.notices || []).filter(n => (n.state === 'done' || n.state === 'error') && n.ts > S.openedTs && !S.toasted.has(n.id));
  for (const n of fresh.slice(0, 3)) {
    S.toasted.add(n.id);
    const t = el('div', 'toast');
    t.setAttribute('role', 'status');
    const mini = el('span', 'mini');
    const rec = S.recent.find(x => x.job.id === n.id);
    const src = rec && thumbUrl(rec.media, 120);
    if (src) { const img = el('img'); img.alt = ''; img.src = src; mini.append(img); mini.classList.add('develop'); }
    else { const ic = el('span', 'ico'); ic.append(icon(n.state === 'done' ? 'ok' : 'err')); ic.firstChild.style.color = n.state === 'done' ? 'var(--good)' : 'var(--critical)'; mini.append(ic); }
    mini.style.setProperty('--dev', devOf(n.card).color);
    const body = el('div');
    body.append(el('p', '', n.state === 'done' ? `Готово на ${devOf(n.card).short}` : `Ошибка на ${devOf(n.card).short}`), el('small', '', n.what || n.chat_title || ''));
    t.append(mini, body);
    t.addEventListener('click', () => { dismiss(t); if (rec) lightbox([rec], 0, null); else setTab('history'); });
    $('#toasts').append(t);
    setTimeout(() => dismiss(t), 6500);
  }
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
function notify(title, note, ico = 'down') {
  const t = el('div', 'toast'), ic = el('span', 'mini'), body = el('div');
  t.setAttribute('role', 'status');
  const i = el('span', 'ico ' + ico); i.append(icon(ico)); ic.append(i);
  body.append(el('p', '', title), el('small', '', note));
  t.append(ic, body); t.addEventListener('click', () => dismiss(t));
  $('#toasts').append(t); setTimeout(() => dismiss(t), 4500);
}
function dismiss(t) { if (!t.isConnected) return; t.classList.add('out'); setTimeout(() => t.remove(), 300); }

// ---------- Отрисовка и запуск ----------
function render() {
  if (S.tab === 'now') renderNow();
  else if (S.tab === 'gallery') renderGallery();
  else if (S.tab === 'history') renderHistory();
  else renderReport();
  renderSummary();
}
// Кривые загрузки сразу не пустые: последние минуты из истории, дальше — живые замеры раз в 2 с.
getJSON('/gpuq/history?hours=0.1').then(h => {
  for (const [name, card] of Object.entries(h.cards || {})) {
    const tr = S.traces[name] || (S.traces[name] = []);
    const seedPts = (card.points || []).filter(p => typeof p.util === 'number').map(p => ({ t: p.ts, u: p.util }));
    tr.unshift(...seedPts.filter(p => !tr.length || p.t < tr[0].t - 1));
  }
}).catch(() => {});
every(2000, refreshDash);
every(6000, refreshRecent, () => S.tab === 'now' || !S.recent.length);
every(15000, refreshGalleryTop, () => S.tab === 'gallery');
every(60000, refreshHistory, () => S.tab === 'history');
every(30000, refreshDone, () => S.tab === 'history' && S.history.offset === 0);
every(60000, refreshReport, () => S.tab === 'report');
if (MOCK && MOCK.settings) S.settings = MOCK.settings;
if (params.has('still')) document.documentElement.classList.add('still');  // снимки проверок: без плавных переходов
moveInk();
if (params.get('tab')) setTab(params.get('tab')); else render();
renderQuiet();
// Для скрытых проверок: открыть лайтбокс или настройки после первой загрузки.
if (params.has('lb')) setTimeout(() => { const b = document.querySelectorAll('.shot')[(+params.get('lb') || 1) - 1]; if (b) b.click(); }, 1500);
if (params.has('pop')) setTimeout(() => quietBtn.click(), 900);
// Проверка кнопок очереди: поднять второе в очереди задание или отменить первое (двумя нажатиями).
if (params.has('act')) setTimeout(() => {
  const order = () => [...workList.querySelectorAll('.witem')].filter(li => li._job && li._job.state === 'queued').map(li => li._job.id);
  const before = order();
  const li = [...workList.querySelectorAll('.witem')].find(x => x._job && x._job.id === before[params.get('act') === 'bump' ? 1 : 0]);
  if (params.get('act') === 'bump') li._up.click(); else { li._cancel.click(); li._cancel.click(); }
  setTimeout(() => console.log('ACT ' + JSON.stringify({ before, after: order() })), 2600);
}, 1500);
// Проверка моргания: сколько раз элементы списков вынимались и вставлялись за 8 с устойчивой работы.
if (params.has('mutations')) setTimeout(() => {
  const counts = {}, watch = { work: workList, sheet, events: eventsList, alerts: alertsBox, rack };
  for (const [name, node] of Object.entries(watch)) {
    counts[name] = 0;
    new MutationObserver(list => { for (const m of list) counts[name] += m.addedNodes.length + m.removedNodes.length; }).observe(node, { childList: true });
  }
  setTimeout(() => console.log('MUTATIONS ' + JSON.stringify(counts)), 8000);
}, 3000);
window.gpuq = { S, setTab, render };  // для проверок
