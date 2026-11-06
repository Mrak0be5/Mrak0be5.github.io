// Интерфейс стройки: карточка объекта с прогрессом, монеты, часы, темп, качество, три прокачки, тосты,
// всплывающие «+монеты» у уложенного элемента, окно «Объект сдан!».
import * as THREE from 'three';
import { UPGRADES, upgradeCost } from './site.js?v=9f85320';
import { BUILDINGS } from './blueprints.js?v=9f85320';

const fmt = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' '); };

const COIN = '<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="9" fill="#e9b949" stroke="#9a6d12" stroke-width="1.6"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#b9861d" stroke-width="1.3"/></svg>';
const ICONS = {
  crew: '<svg viewBox="0 0 24 24" class="ico"><path d="M6 11a6 6 0 0 1 12 0z" fill="#f2c41a"/><rect x="4.5" y="10.6" width="15" height="2.2" rx="1" fill="#d9a40f"/><circle cx="12" cy="15.6" r="3.2" fill="#d9a58a"/><path d="M6 22c.8-3 3.2-4.4 6-4.4s5.2 1.4 6 4.4z" fill="#f2741a"/></svg>',
  speed: '<svg viewBox="0 0 24 24" class="ico"><rect x="10.5" y="9" width="3" height="13" rx="1.2" fill="#8a6a46"/><rect x="5" y="4" width="14" height="5" rx="1.2" fill="#8a9096"/></svg>',
  carry: '<svg viewBox="0 0 24 24" class="ico"><path d="M3 9h13l-2 7H6z" fill="#4c7a45"/><circle cx="16.5" cy="18" r="2.6" fill="#222"/><path d="M15 10l6-4" stroke="#8a9096" stroke-width="2"/></svg>',
};

export function createUI(root, api) {
  root.innerHTML = `
    <div class="card" id="obj">
      <div class="obj-name" id="obj-name"></div>
      <div class="obj-blurb" id="obj-blurb"></div>
      <div class="bar"><div id="obj-bar"></div></div>
      <div class="obj-count" id="obj-count"></div>
    </div>
    <div class="top-right">
      <div class="pill coins">${COIN}<span id="coins">0</span></div>
      <div class="pill clock"><span id="clock-ico"></span><span id="clock">10:00</span></div>
      <div class="pill tempo" id="tempo">
        <button data-t="1" class="on">×1</button><button data-t="5">×5</button><button data-t="20">×20</button>
      </div>
      <button class="pill btn" id="sound" title="Звук"></button>
      <button class="pill btn" id="quality"></button>
    </div>
    <div class="watch hidden" id="watch"></div>
    <div class="ups" id="ups"></div>
    <div class="toasts" id="toasts"></div>
    <div class="pops" id="pops"></div>
    <div class="overlay hidden" id="done">
      <div class="dialog">
        <div class="dlg-title">Объект сдан!</div>
        <div class="dlg-name" id="done-name"></div>
        <div class="dlg-gain">${COIN}<span id="done-gain"></span></div>
        <button class="cta" id="done-next">Следующий объект ▸</button>
      </div>
    </div>`;
  const $ = function (id) { return root.querySelector('#' + id); };
  const ups = $('ups');
  Object.keys(UPGRADES).forEach(function (k) {
    const b = document.createElement('button');
    b.className = 'up';
    b.dataset.k = k;
    b.innerHTML = `${ICONS[k]}<div class="up-text"><div class="up-name">${UPGRADES[k].name}</div><div class="up-lvl"></div></div><div class="up-cost">${COIN}<span></span></div>`;
    b.addEventListener('click', function () { if (api.buy(k)) flash(b); else shake(b); });
    ups.appendChild(b);
  });
  $('tempo').addEventListener('click', function (e) {
    const t = e.target.closest('button');
    if (!t) return;
    api.setTempo(Number(t.dataset.t));
    $('tempo').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === t); });
  });
  $('quality').addEventListener('click', function () { api.cycleQuality(); });
  $('sound').addEventListener('click', function () { api.toggleSound(); });
  $('done-next').addEventListener('click', function () { $('done').classList.add('hidden'); api.next(); });

  function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  const toasts = $('toasts');
  function toast(text, gain, ms) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = text + (gain ? ` <b>+${fmt(gain)}</b>` : '');
    toasts.appendChild(t);
    while (toasts.children.length > 3) toasts.removeChild(toasts.firstChild);
    const life = ms || 2200;
    setTimeout(function () { t.classList.add('out'); }, life);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, life + 600);
  }

  // всплывающие монеты у элемента
  const pops = $('pops');
  const pool = [];
  for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'pop'; pops.appendChild(d); pool.push({ el: d, t: 1, pos: new THREE.Vector3() }); }
  let popI = 0;
  function pop(pos, gain) {
    const p = pool[popI++ % pool.length];
    p.pos.copy(pos); p.t = 0;
    p.el.textContent = '+' + gain;
  }
  const v = new THREE.Vector3();
  function updatePops(dt, camera, w, h) {
    pool.forEach(function (p) {
      if (p.t >= 1) { p.el.style.opacity = 0; return; }
      p.t += dt / 1.1;
      v.copy(p.pos); v.y += 0.4 + p.t * 0.6;
      v.project(camera);
      if (v.z > 1) { p.el.style.opacity = 0; return; }
      p.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
      p.el.style.opacity = String(Math.min(1, (1 - p.t) * 2.2));
    });
  }

  function update(state) {
    $('coins').textContent = fmt(state.coins);
    const h = Math.floor(state.hour), m = Math.floor((state.hour - h) * 60);
    $('clock').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    $('clock-ico').textContent = state.hour > 5.6 && state.hour < 20.4 ? '☀' : '☾';
    $('quality').innerHTML = '<span class="q-ico">⚙</span><span class="q-txt">Качество: ' + state.qualityName + '</span>';
    $('sound').textContent = state.sound ? '🔊' : '🔇';
    const pr = state.progress;
    $('obj-bar').style.width = (pr.total ? (pr.placed / pr.total) * 100 : 0).toFixed(1) + '%';
    $('obj-count').textContent = 'Деталей ' + pr.pieces + ' из ' + pr.totalPieces + ' · ' + Math.round(pr.total ? (pr.placed / pr.total) * 100 : 0) + '%';
    ups.querySelectorAll('.up').forEach(function (b) {
      const k = b.dataset.k;
      const lvl = state.upgrades[k];
      const max = UPGRADES[k].max;
      const cost = upgradeCost(k, lvl);
      b.querySelector('.up-lvl').textContent = lvl >= max ? 'максимум' : (k === 'crew' ? 'рабочих: ' + state.workers : 'ур. ' + lvl + ' из ' + max);
      b.querySelector('.up-cost span').textContent = lvl >= max ? '—' : fmt(cost);
      b.disabled = lvl >= max;
      b.classList.toggle('cant', lvl < max && state.coins < cost);
    });
  }

  function setBuilding(index) {
    const def = BUILDINGS[index];
    $('obj-name').textContent = def.name;
    $('obj-blurb').textContent = def.blurb;
  }

  function complete(name, gain) {
    $('done-name').textContent = name;
    $('done-gain').textContent = '+' + fmt(gain);
    $('done').classList.remove('hidden');
  }

  // подпись над кадром, пока камера следит за рабочим (null — убрать)
  function watch(text) {
    const el = $('watch');
    el.classList.toggle('hidden', !text);
    if (text) el.textContent = text;
  }

  return { update, setBuilding, toast, pop, updatePops, complete, watch, root };
}
