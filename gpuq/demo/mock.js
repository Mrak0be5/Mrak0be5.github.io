// Условные данные для показа панели без службы (?mock=1): без настоящих картинок и сети.
// ?scene=b — вторая сцена: зависшая аренда, переполненная видеопамять и ожидание места для тяжёлой задачи.
const T0 = Date.now() / 1000;
const SCENE = new URLSearchParams(location.search).get('scene') || 'a';
const STILL = new URLSearchParams(location.search).has('still');
const cancelled = new Set();
let bumped = '';
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function art(i, w, h) {
  const hue = (i * 47) % 360, hue2 = (hue + 40 + (i % 5) * 25) % 360;
  const cx = 30 + (i * 13) % 40, cy = 35 + (i * 7) % 25;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(w)}' height='${Math.round(h)}' viewBox='0 0 ${w} ${h}'>
<defs><linearGradient id='g' x1='0' y1='0' x2='0.4' y2='1'><stop offset='0' stop-color='hsl(${hue},55%,62%)'/><stop offset='1' stop-color='hsl(${hue2},45%,18%)'/></linearGradient>
<radialGradient id='s' cx='${cx}%' cy='${cy}%' r='45%'><stop offset='0' stop-color='hsl(${(hue + 180) % 360},80%,85%)' stop-opacity='.9'/><stop offset='1' stop-color='hsl(${hue},60%,50%)' stop-opacity='0'/></radialGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/><rect width='100%' height='100%' fill='url(#s)'/>
<path d='M0 ${h * .78} Q ${w * .3} ${h * .62} ${w * .55} ${h * .74} T ${w} ${h * .7} V ${h} H 0Z' fill='hsl(${hue2},35%,12%)' opacity='.85'/>
<circle cx='${w * (.25 + (i % 4) * .15)}' cy='${h * .32}' r='${Math.min(w, h) * .07}' fill='hsl(${hue},80%,88%)' opacity='.8'/>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const CARDS = ['RTX 5090', 'RTX 4090'];
const SCRIPTS = ['train_lora.py', 'whisper_batch.py', 'sdxl_batch.py', 'blender_render.cmd', 'llm_eval.py'];
const MODELS = ['sd_xl_base_1.0', 'juggernautXL_v9', 'flux1-dev-fp8'];
const PROMPTS = ['A lighthouse on a cliff at dusk, volumetric light, film grain, wide shot.',
  'Macro photo of a mechanical watch movement, shallow depth of field, studio lighting.',
  'A quiet harbor town in the rain, neon reflections on wet stone, cinematic.'];

const gallery = [];
for (let i = 0; i < 72; i++) {
  const portrait = i % 3 !== 0;
  const w = portrait ? 832 : 1216, h = portrait ? 1216 : 832;
  const card = CARDS[i % 4 === 3 ? 0 : 1];
  const done = T0 - 40 - i * 190 - (i % 4) * 30;
  gallery.push({
    id: 'job' + i, card, what: '', chat_title: '', task: i % 2 ? 'sdxl_batch.py' : 'ComfyUI', done_ts: done, duration_seconds: 9 + (i % 5) * 3,
    via: i % 6 === 0 ? 'lease' : 'queue', exact: true,
    meta: { kind: 'image', model: MODELS[i % 3], w, h, steps: i % 3 === 2 ? 24 : 30, loras: i % 2 ? ['detail_tweaker'] : [], lora_w: i % 2 ? [0.6] : [], app: i % 2 ? 'Python' : 'ComfyUI' },
    prompt_text: PROMPTS[i % PROMPTS.length],
    media: [{ url: art(i, w > h ? 1664 : 1152, (w > h ? 1664 : 1152) * h / w), filename: `result_${String(i).padStart(5, '0')}_.png`, type: 'image', thumb: art(i, 300, 300 * h / w) }],
  });
}

function dashboard() {
  const t = Date.now() / 1000, k = (t - T0) % 24;
  const progress = Math.min(.97, k / 24);
  const b = SCENE === 'b';
  const TRAIN = { kind: 'other', app: 'Terminal' };
  const workers = [
    { name: 'RTX 5090', online: true, kind: 'ПК', busy: true, state: 'аренда',
      reason: b ? 'Карту делят раннеры: lora-train, whisper-batch; памяти мало — задания идут на другую карту'
        : 'Карту делят раннеры: lora-train, whisper-batch; памяти хватает — задание очереди сядет рядом',
      used_mb: (b ? 30300 : 27400) + Math.sin(t) * 120, util: b ? 4 + Math.sin(t) : 96 + Math.sin(t / 3) * 3, temp: b ? 44 : 71 + Math.sin(t / 9), power: b ? 96 : 538 + Math.sin(t / 2) * 14,
      power_limit: 575, total_mb: 32607, gpu_name: 'NVIDIA GeForce RTX 5090', job_id: null, what: '', task: 'train_lora.py', chat_title: '', meta: TRAIN, via: 'lease', apps: [],
      stats: { today: { done: 41, errors: 0, images: 0, videos: 0, gen_seconds: 0, lease_seconds: 41200, busy_pct_24h: 78 }, week: { done: 205 }, last_done_ts: t - 50 } },
    { name: 'RTX 4090', online: true, kind: 'ПК', busy: true, state: 'генерация', reason: 'Считает задание очереди', used_mb: (b ? 24350 : 17800) + Math.sin(t) * 200, util: b ? 97 : 98 + Math.sin(t / 3), temp: b ? 79 : 66 + Math.sin(t / 7),
      power: b ? 212 : 408 + Math.sin(t) * 12, power_limit: 450, total_mb: 24564, gpu_name: 'NVIDIA GeForce RTX 4090', job_id: 'run1', what: '', task: 'ComfyUI', chat_title: '',
      meta: { kind: 'image', model: MODELS[0], w: 1024, h: 1024, steps: 30, loras: ['detail_tweaker'], lora_w: [0.6], app: 'ComfyUI' }, via: 'queue', apps: [],
      stats: { today: { done: 118, errors: 1, images: 118, videos: 0, gen_seconds: 15400, lease_seconds: 9200, busy_pct_24h: 63 }, week: { done: 702, avg_seconds: 14 }, last_done_ts: t - 20 } },
  ];
  const prompt = PROMPTS[0];
  const jobs = [
    { id: 'run1', pool: 'krea', state: 'running', card: 'RTX 4090', submit_ts: t - k - 3, start_ts: t - k, done_ts: null, chat_title: '', estimated_seconds: 24, remaining_seconds: Math.max(1, 24 - k), progress,
      wait_seconds: 3, position: null, meta: workers[1].meta, what: '', prompt, media: [], task: 'ComfyUI', preview_ts: STILL ? 1 : Math.floor(k / 2) + 1, step: STILL ? 18 : Math.min(30, Math.floor(k * 1.2) + 1), steps: 30 },
    { id: 'q1', pool: 'krea', state: 'queued', card: null, planned_card: 'RTX 4090', submit_ts: t - 40, chat_title: '', task: 'sdxl_batch.py', estimated_seconds: 24, starts_in_seconds: Math.max(1, 24 - k),
      wait_seconds: 40, position: 1, meta: { kind: 'image', model: MODELS[1], w: 832, h: 1216, steps: 30, app: 'Python' }, prompt: PROMPTS[1], media: [] },
    { id: 'q2', pool: 'krea', state: 'queued', card: null, planned_card: 'RTX 4090', submit_ts: t - 38, chat_title: '', task: 'sdxl_batch.py', estimated_seconds: 24, starts_in_seconds: 48 - k,
      wait_seconds: 38, position: 2, meta: { kind: 'image', model: MODELS[1], w: 832, h: 1216, steps: 30, app: 'Python' }, media: [] },
    { id: 'q3', pool: 'krea', state: 'queued', card: null, planned_card: 'RTX 4090', submit_ts: t - 36, chat_title: '', task: 'ComfyUI', estimated_seconds: 31, starts_in_seconds: 72 - k,
      wait_seconds: 36, position: 3, meta: { kind: 'image', model: MODELS[2], w: 1216, h: 832, steps: 24, app: 'ComfyUI' }, media: [] },
    ...gallery.slice(0, 12).map((g, i) => ({ id: g.id, pool: 'krea', state: i === 6 ? 'error' : 'done', card: g.card, submit_ts: g.done_ts - 30, start_ts: g.done_ts - g.duration_seconds, done_ts: g.done_ts,
      error: i === 6 ? 'CUDA out of memory: задание вернулось в очередь и выполнено повторно' : null, chat_title: '', task: g.task, meta: g.meta, what: '',
      media: i === 6 ? [] : g.media.map(m => ({ url: m.url, filename: m.filename, type: m.type })), duration_seconds: g.duration_seconds, prompt_text: g.prompt_text })),
  ];
  const lk = (t - T0) % 5400;
  const foreign = [
    { id: 'foreign:l1', card: 'RTX 5090', task: 'train_lora.py', what: 'Python', chat_title: '', start_ts: t - 3180 - lk % 60, done_ts: null, duration_seconds: 3180, state: 'running', foreign: true, via: 'lease',
      meta: Object.assign({}, TRAIN, { vram_mb: 22000 }), estimated_seconds: 5400, remaining_seconds: 2200, progress: .59, prompt: '', count: 1, media: [] },
    { id: 'foreign:l2', card: 'RTX 5090', task: 'whisper_batch.py', what: 'Python', chat_title: '', start_ts: t - 840, done_ts: null, duration_seconds: 840, state: 'running', foreign: true, via: 'lease',
      meta: Object.assign({}, TRAIN, { vram_mb: 4000 }), estimated_seconds: 1500, remaining_seconds: 660, progress: .56, prompt: '', count: 1, media: [] },
  ];
  const notices = b ? [
    { id: 'resource:s1', state: 'lease_stuck', ts: t - 400, message: 'Аренда «whisper-batch» держит 4,2 ГБ на RTX 5090, а карта простаивает 15 мин — задача, похоже, зависла (PID 14872)', card: 'RTX 5090' },
    { id: 'resource:o1', state: 'vram_overflow', ts: t - 120, message: 'Переполнена видеопамять RTX 4090: занято 23,8 из 24 ГБ, загрузка 97 % при 212 из 450 Вт уже 7 мин — задачи ждут память и почти не считают; аренды: lora-train 22 ГБ, sdxl-batch 14 ГБ', card: 'RTX 4090' },
    { id: 'job0', state: 'done', ts: t - 40, what: 'sd_xl_base_1.0 · 1024×1024', card: 'RTX 4090' },
  ] : [
    { id: 'job0', state: 'done', ts: t - 40, what: 'sd_xl_base_1.0 · 1024×1024', card: 'RTX 4090' },
    { id: 'job6', state: 'error', ts: t - 1100, what: 'juggernautXL_v9 · 832×1216', card: 'RTX 4090' },
    { id: 'resource:1', state: 'free', ts: t - 2600, message: 'Освобождено 4,6 ГБ на RTX 4090: ComfyUI простаивал 10 мин', card: 'RTX 4090' },
    { id: 'resource:2', state: 'bypass', ts: t - 5400, message: 'Мимо очереди: blender_render.cmd на RTX 4090 (без аренды)', card: 'RTX 4090' },
  ];
  for (const id of cancelled) { const i = jobs.findIndex(j => j.id === id); if (i >= 0) jobs.splice(i, 1); }
  if (bumped) {
    const q = jobs.filter(j => j.state === 'queued' && j.pool === 'krea').sort((a, c) => (a.id === bumped ? -1 : c.id === bumped ? 1 : a.position - c.position));
    q.forEach((j, i) => { j.position = i + 1; });
  }
  const pc = { ts: t, cpu: (b ? 91 : 38) + Math.sin(t / 5) * 7, cores: 32, ram_total_gb: 64, ram_free_gb: b ? 4.1 : 21.4, commit_limit_gb: 110, commit_free_gb: b ? 21 : 52,
    unity: [], blender: b ? [{ pid: 5 }] : [], unity_limit: 4, heavy_limit: 2 };
  const slots = { unity_max: 4, heavy_max: 2, bound: {}, held: b ? [{ kind: 'heavy', owner: 'blender_render', pid: 11 }] : [],
    waiting: b ? [{ kind: 'heavy', owner: 'ffmpeg_encode', why: 'мало RAM: свободно 4,1 ГБ, нужно 10 ГБ' }] : [] };
  return {
    jobs, workers, foreign, notices, api: 2, ts: t, pc, slots,
    alerts: b ? [{ ts: t - 120, job_id: '', message: 'Переполнена видеопамять RTX 4090: задачи ждут память и почти не считают. Освободите память или уменьшите заявки.' }] : [],
    bypass_top: [{ script: 'blender_render.cmd', chat_title: '', card: 'RTX 4090', count: 1, duration_seconds: 412, path: 'D:\\Projects\\render\\blender_render.cmd' }],
    idle_comfy: [],
    summary: { queued: 3, running: 1, done_today: 159, eta_all: 96 },
  };
}

function history(hours) {
  const t1 = Date.now() / 1000, t0 = t1 - hours * 3600, cards = {};
  CARDS.forEach((name, ci) => {
    const points = [];
    let busy = false;
    for (let t = Math.ceil(t0 / 60) * 60; t <= t1; t += 60) {
      if (rnd() < (busy ? .03 : .025 + ci * .004)) busy = !busy;
      points.push({ ts: t, util: busy ? 70 + rnd() * 29 : rnd() * 6, used_mb: 4000, temp: busy ? 68 : 38, power: busy ? 420 : 40, state: busy ? (ci === 0 ? 'аренда' : 'генерация') : 'простой' });
    }
    const busyN = points.filter(p => p.state !== 'простой').length;
    cards[name] = { points, summary: { busy_seconds: busyN * 60, idle_seconds: (points.length - busyN) * 60, offline_seconds: 0, busy_pct: 100 * busyN / points.length } };
  });
  return { cards, hours, ts: t1 };
}

function report(days) {
  const k = days === 1 ? 1 : days === 7 ? 6.6 : 27;
  return {
    days, ts: Date.now() / 1000, observed_seconds: Math.round(82800 * k),
    devices: {
      'RTX 5090': { busy_hours: 17.2 * k, idle_hours: 5.8 * k, offline_hours: 0, busy_pct: 74.7, observed_seconds: 82800 * k },
      'RTX 4090': { busy_hours: 14.1 * k, idle_hours: 8.9 * k, offline_hours: 0, busy_pct: 61.3, observed_seconds: 82800 * k },
    },
    pools: { krea: { jobs: Math.round(118 * k), gpu_seconds: Math.round(15400 * k) } },
    top_chats: [],
    top_scripts: SCRIPTS.map((s, i) => ({ script: s, gpu_seconds: Math.round((41200 - i * 7600) * k) })),
    bypass: { jobs: Math.round(3 * k), gpu_seconds: Math.round(1900 * k) }, unity_runs: 0, model_hits: 96, model_swaps: 7,
    waits: { queue: { count: 118, p50: 3, p90: 21, max: 140, over_minute: 2 }, lease: { count: 24, p50: 0, p90: 9, max: 310, over_minute: 1 },
      lease_top: [{ owner: 'sdxl-batch', wait_seconds: 310 }], queued_now: { jobs: 3, oldest_seconds: 40 } },
  };
}

export default {
  refUrl: (name, i) => art(200 + i * 7 + (name || '').length, 240, 320),
  // Превью шага: тот же кадр всё резче и светлее с каждым шагом.
  previewUrl: j => art(3, 104, 152).replace(encodeURIComponent("fill='url(#s)'"), encodeURIComponent(`fill='url(#s)' opacity='${Math.min(1, (j.step || 1) / (j.steps || 30)).toFixed(2)}'`)),
  async post(path, body) {
    await new Promise(r => setTimeout(r, 60));
    if (path === '/gpuq/bump') { bumped = body.id; return { ok: true }; }
    if (path === '/queue') { for (const id of body.delete || []) cancelled.add(id); return {}; }
    throw new Error('mock: ' + path);
  },
  async get(path) {
    await new Promise(r => setTimeout(r, 60));
    const u = new URL(path, 'http://x');
    if (u.pathname === '/gpuq/dashboard') return dashboard();
    if (u.pathname === '/gpuq/history') return history(+u.searchParams.get('hours') || 24);
    if (u.pathname === '/gpuq/report') return report(+u.searchParams.get('days') || 7);
    if (u.pathname === '/gpuq/gallery') {
      const off = +u.searchParams.get('offset') || 0, lim = +u.searchParams.get('limit') || 48;
      const card = u.searchParams.get('card'), kind = u.searchParams.get('kind');
      const list = gallery.filter(g => (!card || g.card === card) && (!kind || g.meta.kind === kind));
      return { items: list.slice(off, off + lim), has_more: off + lim < list.length, ts: Date.now() / 1000 };
    }
    throw new Error('mock: ' + path);
  },
};
