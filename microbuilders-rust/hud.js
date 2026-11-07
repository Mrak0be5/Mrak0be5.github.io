// HUD оригинала: ui.js создаёт DOM, движок E единолично меняет экономику.
// opts: getTempo(), setTempo(n), project(x, y, z) → экранные пиксели,
// onNext(), onRestart(), onLevel(index), toggleSound(), soundOn(), cycleQuality(), qualityName().
// paint(true) — периодический опрос; paint() — после команды; tick(dt) — реальные секунды кадра.
// Подписка E.on установлена здесь; повторно передавать события в HUD не нужно.
export function createHud(E, opts) {
  opts = opts || {};
  const MB = E.MB, Meta = E.Meta, UI = window.MicroBuildersUI;
  const Sim = window.MicroBuildersSim;
  const graph = window.MicroBuildersUpgradeGraph;
  const DRONE_GATED_GROUPS = ['loaders', 'helicopters'];
  const skyView = { dial: '' };
  const session = E.balance.session, gates = E.balance.gates || {};
  const cards = Array.from(document.querySelectorAll('#upgrade-dock .upgrade'));
  const columns = Array.from(document.querySelectorAll('#upgrade-dock .upgrade-group'));
  const graphStates = {};
  const hudCoins = { campaign: null, shown: 0, from: 0, to: 0, t: 1, pulseAt: -Infinity };
  const summaries = new WeakMap();
  const samples = [];
  const chestToasts = {};
  const announced = new Set();
  const floats = [];
  const layer = document.createElement('div');
  layer.id = 'rust-hud-fx';
  layer.setAttribute('aria-hidden', 'true');
  document.getElementById('fx-layer').appendChild(layer);
  let campaign = null, world = null, meta = null;
  let hudDirty = true, simDirty = true, simEstimate = null;
  let dockLow = 0, dockHigh = Infinity, taxiLow = false, dockStatus = '';
  let bannerOwner = null, bannerToast = null, completedOwner = null;
  let pendingGain = 0, pendingBlock = null, floatClock = 0;

  document.body.classList.add('rust-hud', 'playing', 'nav-off');
  // У каркаса остаются только работающие в этом этапе элементы стройки.
  ['hq-btn', 'camp-btn', 'mana-btn', 'level-info-toggle', 'loss-strip', 'crew-strip',
    'repeat-buys', 'advanced-toggle', 'advanced-graph', 'advanced-tip', 'app-nav',
    'silhouette', 'tilt', 'hide-interface', 'interface-toggle', 'reset-company',
    'playtest-report', 'abandon-run'].forEach(function (id) { document.getElementById(id).hidden = true; });
  document.querySelectorAll('#settings-menu .menu-jump, #settings-menu .menu-danger-label, .dev-only').forEach(function (el) { el.hidden = true; });
  document.querySelector('#day-pop .tempo').classList.remove('playtest-tool');
  document.getElementById('day-tempo').classList.remove('playtest-tool');

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el.textContent !== text) el.textContent = text;
  }

  function dirty() {
    hudDirty = true;
    simDirty = true;
  }

  function sync() {
    meta = E.meta;
    world = E.world;
    if (campaign === E.campaign) return;
    campaign = E.campaign;
    dirty();
    samples.length = 0;
    announced.clear();
    Object.keys(chestToasts).forEach(function (key) { chestToasts[key].close(); delete chestToasts[key]; });
    floats.length = 0;
    layer.replaceChildren();
    document.getElementById('coin-fx').replaceChildren();
    pendingGain = 0;
    pendingBlock = null;
    floatClock = 0;
    UI.overlay.close('rust-complete');
    UI.overlay.close('rust-restart');
    graph.close();
  }

  function summary() {
    let value = summaries.get(world.level);
    if (!value) {
      value = Sim.summarizeLevel(world.level);
      summaries.set(world.level, value);
    }
    return value;
  }

  function refreshEstimate() {
    if (!simDirty) return;
    simDirty = false;
    simEstimate = Sim.estimate(summary(), campaign);
  }

  function paint(fromTick) {
    sync();
    if (!world || !campaign) return;
    if (!fromTick) hudDirty = true;
    refreshEstimate();
    paintLevelStrip();
    paintDayClock();
    paintDayPop();
    paintTempo();
    paintCoinRate();
    paintTokens();
    if (!fromTick || hudCoins.campaign !== campaign) snapCoins();
    setText('total-time', UI.formatDuration(campaign.totalElapsed || campaign.levelElapsed));
    paintDock();
    paintSettings();
    const complete = campaign.status === 'complete';
    const cta = document.getElementById('next-cta');
    cta.hidden = !complete || UI.overlay.isOpen('rust-complete');
    cta.textContent = E.chapterDone ? 'Глава пройдена' : 'Следующий заказ ▸';
    if (complete && completedOwner !== campaign) openCompleteDialog();
  }

  function paintLevelStrip() {
    const level = world.level, total = level.blocks.length;
    const done = total - world.remaining;
    setText('level-number', 'Ур. ' + level.number);
    setText('level-title', level.name);
    setText('level-pct', (total ? Math.floor(done / total * 100) : 0) + '%');
    document.getElementById('bar-fill').style.width = (total ? done / total * 100 : 0).toFixed(2) + '%';
    setText('focus-label', world.blocked ? 'Строительство остановлено' : done >= total ? 'Готово' : '');
    setText('block-count', done.toLocaleString('ru-RU') + ' / ' + total.toLocaleString('ru-RU'));
    const chests = campaign.runMode === 'campaign' && Meta.chestsOpen(level.index);
    document.getElementById('level-strip').classList.toggle('no-chests', !chests);
    [25, 50].forEach(function (threshold) {
      const el = document.getElementById('chest-' + threshold);
      const claimed = (meta.claimedChests || {})[level.index + ':' + threshold] === 1;
      const ready = chests && E.chestsReady.indexOf(threshold) >= 0;
      el.hidden = !chests;
      el.disabled = claimed;
      el.classList.toggle('ready', ready);
      el.classList.toggle('claimed', claimed);
      el.classList.toggle('locked', chests && !ready && !claimed);
      if (ready) announceChest(threshold);
      else if (chestToasts[threshold]) { chestToasts[threshold].close(); delete chestToasts[threshold]; }
    });
  }

  function announceChest(threshold) {
    if (announced.has(threshold) || UI.overlay.count() > 0) return;
    announced.add(threshold);
    const owner = campaign;
    chestToasts[threshold] = UI.toast({ text: 'Сундук ' + threshold + '% готов!',
      icon: 'icons/icon-chest-' + threshold + '.jpg', tone: 'gold', className: 'toast-chest',
      key: 'chest-' + threshold, priority: 2, duration: 6000,
      action: { label: 'Открыть', onClick: function () { if (E.campaign === owner) E.openChest(threshold); } } });
  }

  function tapChest(threshold) {
    if (!world || campaign.status !== 'play') return;
    if (E.openChest(threshold)) return;
    const el = document.getElementById('chest-' + threshold);
    if (el.disabled || el.hidden) return;
    shake(el);
    UI.toast({ text: 'Откроется на ' + threshold + '% стройки', icon: 'icons/icon-chest-' + threshold + '.jpg',
      key: 'chest-locked', className: 'toast-chest', duration: 1800 });
  }

  function paintTokens() {
    const tokens = campaign.tokens || 0;
    setText('token-value', String(tokens));
    document.getElementById('tokens').classList.toggle('empty', tokens === 0);
  }

  function paintDock() {
    const coins = campaign.coins;
    const lowTaxi = E.taxiTooLow('elevators');
    if (hudDirty || coins < dockLow || coins >= dockHigh || taxiLow !== lowTaxi || dockStatus !== campaign.status) {
      hudDirty = false;
      taxiLow = lowTaxi;
      dockStatus = campaign.status;
      dockLow = 0;
      dockHigh = Infinity;
      columns.forEach(function (column) {
        let any = false, beacon = null, beaconNode = '';
        const closed = [];
        column.querySelectorAll('.upgrade').forEach(function (button) {
          const kind = button.id.slice(3);
          if (!session[kind]) { button.hidden = true; return; }
          if (!E.lineOpen(kind)) {
            closed.push(button);
            const node = dockLockNode(kind, button.dataset.group);
            if (node && (!beaconNode || Meta.TECH[node].from < Meta.TECH[beaconNode].from)) {
              beacon = button;
              beaconNode = node;
            }
            return;
          }
          any = true;
          button.hidden = false;
          const cost = E.cost(kind);
          paintUpgrade(kind, upgradeLabel(kind), cost);
          if (campaign.freePurchases || E.maxed(kind)) return;
          if (cost <= coins) dockLow = Math.max(dockLow, cost);
          else dockHigh = Math.min(dockHigh, cost);
        });
        closed.forEach(function (button) {
          button.hidden = !(any && button === beacon);
          if (!button.hidden) paintLockedUpgrade(button.id.slice(3), beaconNode);
        });
        column.hidden = !any;
      });
      window.MicroBuildersSyncUpgradeTabs();
    }
    paintDockFill(coins);
    paintUpgradeGraph();
  }

  function paintUpgrade(kind, label, cost) {
    const level = campaign.purchases[kind], maxed = E.maxed(kind);
    const parent = E.parentOf(kind);
    const parentReady = !parent || campaign.purchases[parent] > 0 || campaign.devGroups.all === true;
    const ready = campaign.status === 'play' && !maxed && parentReady && (campaign.freePurchases || campaign.coins >= cost);
    setUpgradeLabel(kind, label);
    setText(kind + '-cost', maxed ? 'Максимум' : campaign.freePurchases ? '0' : formatCompact(cost));
    setText(kind + '-level', level > 0 ? String(level) : '');
    const button = document.getElementById('up-' + kind);
    button.classList.remove('locked');
    button.classList.toggle('ready', ready);
    button.classList.toggle('maxed', maxed);
    button.title = parentReady ? '' : 'Сначала прокачайте «' + upgradeName(parent) + '»';
    button.setAttribute('aria-disabled', String(!ready));
    button.dataset.cost = maxed ? '' : String(cost);
    button.disabled = false;
  }

  function upgradeName(kind) {
    const el = document.getElementById(kind + '-name');
    return el ? el.dataset.name : kind;
  }

  function tapUpgrade(kind) {
    sync();
    if (!campaign || campaign.status !== 'play') return;
    if (E.buy(kind)) { paint(); return; }
    const button = document.getElementById('up-' + kind);
    shake(button);
    if (!E.lineOpen(kind)) {
      UI.toast({ text: button.title || upgradeName(kind) + ' откроется ' + upgradeLockText(kind, button.dataset.group),
        icon: 'lock', key: 'upgrade-locked', duration: 2400 });
    } else if (E.maxed(kind)) {
      UI.toast({ text: upgradeName(kind) + ': максимальный уровень', icon: 'lock', key: 'upgrade-max', duration: 1600 });
    } else if (button.title) {
      UI.toast({ text: button.title, icon: 'lock', key: 'upgrade-parent', duration: 1800 });
    } else if (campaign.coins < E.cost(kind)) coinsShort(E.cost(kind));
  }

  function coinsShort(cost) {
    UI.toast({ text: 'Не хватает ' + formatShort(cost - campaign.coins), icon: 'icons/icon-coins.jpg?v=2',
      tone: 'warn', key: 'upgrade-short', duration: 1600 });
    const coins = document.getElementById('coins');
    coins.classList.add('short');
    clearTimeout(coins.shortTimer);
    coins.shortTimer = setTimeout(function () { coins.classList.remove('short'); }, 600);
  }

  function paintUpgradeGraph() {
    Object.keys(gates).forEach(function (id) {
      const s = graphStates[id] || (graphStates[id] = {});
      s.passed = MB.gatePassed(campaign, id);
      s.researched = MB.gateResearched(campaign, id);
      s.needs = s.researched ? '' : gateEntryTechs(id);
      s.cost = gates[id].tokens || 1;
      s.ready = campaign.status === 'play' && !s.passed && MB.gateOpenable(campaign, id) && (campaign.tokens || 0) >= s.cost;
    });
    // Контроллер ui.js ожидает состояние для каждого узла дерева.
    E.balance.upgradeTree.forEach(function (pair) {
      const kind = pair[0];
      if (gates[kind]) return;
      const button = document.getElementById('up-' + kind);
      const group = button ? button.dataset.group : '';
      const open = E.lineOpen(kind);
      const s = graphStates[kind] || (graphStates[kind] = {});
      s.state = open ? 'open' : 'office';
      s.level = campaign.purchases[kind] || 0;
      s.maxed = !!session[kind] && s.level >= session[kind].max;
      s.ready = open && !!button && !button.hidden && button.classList.contains('ready');
      s.lockText = open ? '' : upgradeLockText(kind, group);
    });
    graph.paint(graphStates);
  }

  graph.onGate = function (id) {
    sync();
    if (!campaign || campaign.status !== 'play' || !gates[id]) return false;
    const gate = gates[id];
    if (!E.openGate(id)) {
      const researched = MB.gateResearched(campaign, id);
      UI.toast({ text: !researched ? 'Проход «' + gate.name + '» закрыт: изучите в техцентре хотя бы одну технологию его блока — начните с ' + gateEntryTechs(id)
        : 'Не хватает жетонов: нужно ' + (gate.tokens || 1) + ', есть ' + (campaign.tokens || 0),
      icon: researched ? 'icons/icon-gate-token.jpg' : 'lock', tone: 'warn', key: 'tokens-short', duration: 2600 });
      return false;
    }
    dirty();
    UI.toast({ text: 'Проход «' + gate.name + '» открыт', icon: 'icons/icon-gate-token.jpg', tone: 'good', key: 'gate-open' });
    paint();
    return true;
  };

  graph.impact = function (kind) {
    sync();
    if (!world || campaign.status !== 'play' || !session[kind] || E.maxed(kind)) return '';
    refreshEstimate();
    const purchases = Object.assign({}, campaign.purchases);
    const level = purchases[kind] || 0;
    purchases[kind] = level + 1;
    const nextCampaign = Object.assign({}, campaign, { purchases: purchases });
    // Симулятор читает численность из кампании, а не только из уровня покупки.
    if (kind === 'builders') nextCampaign.builderCount += MB.upgradeValue(campaign, kind, level + 1) - MB.upgradeValue(campaign, kind, level);
    if (kind === 'vehicles') nextCampaign.vehicleCount += MB.upgradeValue(campaign, kind, level + 1) - MB.upgradeValue(campaign, kind, level);
    const next = Sim.estimate(summary(), nextCampaign), now = simEstimate;
    const faster = now.cubesPerMinute > 0 ? next.cubesPerMinute / now.cubesPerMinute - 1 : 0;
    if (faster > 0.01 && world.remaining > 0) {
      const was = waitWords(world.remaining / now.cubesPerMinute * 60);
      const will = waitWords(world.remaining / next.cubesPerMinute * 60);
      return was === will ? 'стройка быстрее на ' + Math.max(1, Math.round(faster * 100)) + '%' : 'до сдачи ~' + was + ' → ~' + will;
    }
    if (next.coinsPerMinute > now.coinsPerMinute * 1.01) return 'доход ~' + formatShort(now.coinsPerMinute) + ' → ~' + formatShort(next.coinsPerMinute) + ' монет/мин';
    return '';
  };

  function wrapHours(hour) { return (hour % 24 + 24) % 24; }

  function paintDayPop() {
    if (document.getElementById('day-pop').hidden) return;
    const night = MB.needOpen(campaign, 'night');
    const weather = E.environment ? E.environment.weather : 'Ясно';
    const effects = environmentEffects(weather);
    document.getElementById('day-pop-phase').hidden = !night;
    document.getElementById('day-pop-night').hidden = !night;
    if (night) {
      setText('day-pop-phase', dayPhaseLine(Sim.dayClock(campaign.levelElapsed)));
      setText('day-pop-night', nightLine(effects));
    }
    const detail = weatherSummary(effects);
    setText('day-pop-weather', weather + (detail ? ' · ' + detail : ''));
    setText('day-pop-details', (weatherEffect(effects) || 'Ясная погода без штрафов.') + (night
      ? ' Ночью усталость ×' + String(MB.SLEEP.nightFatigue).replace('.', ',') + '. Освещение снижает ночной штраф к работе.' : ''));
    setText('day-pop-help', '');
    setText('day-pop-time', 'Стройка идёт ' + UI.formatDuration(campaign.levelElapsed));
  }

  function paintTempo() {
    const tempo = opts.getTempo ? opts.getTempo() : 1;
    document.querySelectorAll('#day-pop button[data-tempo]').forEach(function (button) {
      button.classList.toggle('on', Number(button.dataset.tempo) === tempo);
      button.setAttribute('aria-pressed', String(Number(button.dataset.tempo) === tempo));
      button.disabled = !opts.setTempo;
    });
    const tag = document.getElementById('day-tempo');
    tag.hidden = tempo === 1;
    tag.classList.toggle('paused', tempo === 0);
    tag.innerHTML = tempo === 0 ? window.MicroBuildersIcons.pause : '×' + tempo;
  }

  function paintSettings() {
    const sound = typeof opts.soundOn === 'function' ? opts.soundOn() : opts.soundOn;
    const quality = typeof opts.qualityName === 'function' ? opts.qualityName() : opts.qualityName;
    setText('mute', 'Звук: ' + (sound ? 'вкл' : 'выкл'));
    setText('quality', 'Графика: ' + (quality || 'авто'));
    document.getElementById('mute').disabled = !opts.toggleSound;
    document.getElementById('quality').disabled = !opts.cycleQuality;
    document.getElementById('restart').disabled = !world;
  }

  function showStart() {
    sync();
    if (!world || campaign.status !== 'play' || bannerOwner === campaign) return;
    bannerOwner = campaign;
    if (bannerToast) bannerToast.close();
    const cubes = world.level.blocks.length;
    bannerToast = UI.toast({ title: 'Ур. ' + world.level.number + ' · ' + world.level.name,
      text: '· ' + cubes.toLocaleString('ru-RU') + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов'),
      icon: 'build', className: 'toast-banner', priority: 2, duration: 3200, key: 'start-banner' });
  }

  function rewardTile(icon, value, label) {
    const art = icon.charAt(0) === '<' ? icon : '<img src="' + icon + '" alt="">';
    return '<div class="reward-tile">' + art + '<b>' + UI.escapeHtml(value) + '</b><small>' + UI.escapeHtml(label) + '</small></div>';
  }

  function cardTile(card) {
    return rewardTile('icons/icon-foreman-' + card.cardId + '.jpg?v=3', card.cardName,
      card.rarityName + ' · ' + (card.first ? 'Первый бригадир! Выйдет на смену со следующего заказа' : card.isNew ? 'новый!' : '+1 копия'));
  }

  function rewardTiles(reward) {
    const tiles = [];
    if (reward.capital > 0) tiles.push(rewardTile('icons/icon-capital.jpg?v=2', '+' + formatCompact(reward.capital), 'капитала'));
    (reward.chests || []).forEach(function (chest) {
      tiles.push(rewardTile('icons/icon-chest-' + chest.threshold + '.jpg', 'Сундук ' + chest.threshold + '%', '+' + chest.capital + ' капитала'));
      if (chest.card) tiles.push(cardTile(chest));
    });
    if (reward.card) tiles.push(cardTile(reward.card));
    (reward.milestoneCards || []).forEach(function (card) { tiles.push(cardTile(card)); });
    tiles.push(rewardTile(window.MicroBuildersIcons.clock, UI.formatDuration(reward.levelElapsed || 0), 'время стройки'));
    return tiles.join('');
  }

  function openCompleteDialog() {
    if (!world || campaign.status !== 'complete') return;
    completedOwner = campaign;
    const owner = campaign;
    const reward = E.reward || { name: world.level.name, levelElapsed: campaign.levelElapsed };
    const actions = E.chapterDone ? [
      { label: 'Повторить уровень', onClick: function () { if (E.campaign === owner) restart(); } },
      { label: 'Начать главу заново', primary: true, onClick: function () {
        if (E.campaign !== owner) return;
        if (opts.onLevel) opts.onLevel(0); else E.start(0);
      } }
    ] : [{ label: 'Следующий заказ ▸', primary: true, onClick: function () { if (E.campaign === owner) next(); } }];
    UI.overlay.open({ id: 'rust-complete', type: 'dialog', queue: true,
      kicker: 'Заказ ' + (campaign.levelIndex + 1), title: E.chapterDone ? 'Глава пройдена' : 'Объект сдан!',
      body: '<p class="complete-name">' + UI.escapeHtml(reward.name || world.level.name) + '</p>' +
        (E.chapterDone ? '<p>Все 12 заказов главы сданы!</p>' : '') + '<div class="reward-tiles">' + rewardTiles(reward) + '</div>',
      actions: actions,
      onOpen: function () { document.getElementById('next-cta').hidden = true; },
      onClose: function () { if (E.campaign === owner) document.getElementById('next-cta').hidden = false; } });
  }

  function next() { if (opts.onNext) opts.onNext(); else E.next(); }
  function restart() { if (opts.onRestart) opts.onRestart(); else E.restart(); }

  function confirmRestart() {
    if (!world) return;
    document.getElementById('settings-menu').hidden = true;
    document.getElementById('settings-toggle').classList.remove('on');
    document.getElementById('settings-toggle').setAttribute('aria-expanded', 'false');
    UI.layer.set('hud-pop', null);
    const owner = campaign;
    UI.overlay.open({ id: 'rust-restart', type: 'dialog', title: 'Начать заказ заново?',
      body: '<p>Прокачки и монеты этой стройки начнутся с нуля.</p>',
      actions: [{ label: 'Отмена' }, { label: 'Начать заново', primary: true, danger: true,
        onClick: function () { if (E.campaign === owner) restart(); } }] });
  }

  function snapCoins() {
    hudCoins.campaign = campaign;
    hudCoins.shown = hudCoins.from = hudCoins.to = campaign.coins;
    hudCoins.t = 1;
    paintCoinValue();
  }

  function paintCoinRate() {
    const now = campaign.levelElapsed, earned = campaign.coinsEarned || 0;
    if (samples.length && now < samples[samples.length - 1].t) samples.length = 0;
    const last = samples[samples.length - 1];
    if (!last || now - last.t >= 1) samples.push({ t: now, e: earned });
    while (samples.length > 2 && now - samples[1].t >= 60) samples.shift();
    const first = samples[0];
    const rate = campaign.status !== 'play' ? 0 : first && now - first.t >= 15
      ? (earned - first.e) / (now - first.t) * 60 : simEstimate.coinsPerMinute;
    setText('coin-rate', rate >= 1 ? '+' + formatShort(rate) + '/мин' : '');
  }

  function tick(dt) {
    sync();
    if (!world || !campaign) return;
    dt = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, 0.25));
    const c = hudCoins, coins = campaign.coins;
    if (c.campaign !== campaign || coins < c.to) snapCoins();
    else if (coins > c.to) { c.from = c.shown; c.to = coins; c.t = 0; }
    if (c.t < 1) {
      c.t = Math.min(1, c.t + dt / 0.4);
      c.shown = c.from + (c.to - c.from) * (1 - Math.pow(1 - c.t, 3));
      paintCoinValue();
    }
    floatClock += dt;
    if (pendingGain > 0 && pendingBlock && floatClock >= 0.15) {
      floatClock = 0;
      if (opts.project) {
        const el = document.createElement('span');
        el.className = 'fx-float';
        el.textContent = '+' + formatShort(pendingGain);
        layer.appendChild(el);
        floats.push({ el: el, x: pendingBlock.x + 0.5, y: pendingBlock.y + 1, z: pendingBlock.z + 0.5, age: 0 });
        while (floats.length > 10) floats.shift().el.remove();
      }
      pendingGain = 0;
      pendingBlock = null;
    }
    if (!floats.length) return;
    const rect = layer.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const sx = layer.offsetWidth / rect.width, sy = layer.offsetHeight / rect.height;
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.age += dt;
      if (f.age >= 1.2) { f.el.remove(); floats.splice(i, 1); continue; }
      const point = opts.project(f.x, f.y, f.z);
      f.el.hidden = !point || !point.visible;
      if (f.el.hidden) continue;
      f.el.style.transform = 'translate(' + ((point.x - rect.left) * sx) + 'px,' + ((point.y - rect.top) * sy - f.age * 28) + 'px) translate(-50%, -100%)';
      f.el.style.opacity = String(Math.min(1, f.age * 10, (1.2 - f.age) * 3));
    }
  }

  function onEvent(event, extra) {
    sync();
    extra = extra || {};
    if (event.type === 'siteStart') { paint(); showStart(); return; }
    if (!world || !campaign) return;
    if (event.type === 'upgrade') {
      dirty();
      onUpgradeEvent(event);
      if (event.free) UI.toast({ text: event.freeBy === 'gift' ? 'Подарок!' : 'Бесплатно!', tone: 'good', key: 'free-upgrade' });
      paint();
    }
    if (event.type === 'chestReady') announceChest(event.threshold);
    if (event.type === 'chestOpen') {
      const prize = event.prize;
      UI.toast({ title: 'Сундук открыт', text: '+' + prize.capital + ' капитала' + (prize.card ? ' · ' + prize.cardName : ''),
        icon: 'icons/icon-chest-' + event.threshold + '.jpg', tone: 'gold', key: 'chest-open-' + event.threshold, priority: 2 });
      paint();
    }
    const capital = (event.capital || 0) + (extra.placed ? extra.placed.capital || 0 : 0) + (extra.found || 0);
    if (capital > 0) UI.toast({ text: '+' + formatShort(capital) + ' капитала · Капитал уже в казне компании.',
      icon: 'icons/icon-capital.jpg?v=2', tone: 'gold', key: 'capital-find', duration: 2000 });
    if ((event.type === 'place' || event.type === 'pour' || event.type === 'vehiclePlaceBatch') && event.gained > 0) {
      pulseCoins();
      pendingGain += event.gained;
      pendingBlock = event.block || (event.blocks && event.blocks[event.blocks.length - 1]);
    }
    if (event.type === 'complete') {
      dirty();
      UI.toast({ text: 'Объект сдан!', icon: 'check', tone: 'good', key: 'site-complete', priority: 3 });
      paint();
    }
  }

  function formatCompact(value) {
    const COMPACT_UNITS = [[1e12, 'трлн'], [1e9, 'млрд'], [1e6, 'млн'], [1e4, 'тыс']];
    const number = Math.round(value);
    for (let i = 0; i < COMPACT_UNITS.length; i++) {
      const unit = COMPACT_UNITS[i];
      const divisor = unit[0] === 1e4 ? 1e3 : unit[0];
      if (number >= unit[0]) {
        const scaled = number / divisor;
        const digits = scaled >= 100 ? 0 : 1;
        return scaled.toFixed(digits).replace('.', ',').replace(/,0$/, '') + ' ' + unit[1];
      }
    }
    return number.toLocaleString('ru-RU');
  }

  function formatShort(value) {
    const number = Math.round(value);
    if (number < 1000 || number >= 1e4) return formatCompact(number);
    return (number / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '') + ' тыс';
  }

  function waitWords(seconds) {
    const s = Math.ceil(seconds);
    if (s < 60) return s + ' с';
    const minutes = Math.ceil(s / 60);
    return minutes < 60 ? minutes + ' мин' : Math.floor(minutes / 60) + ' ч ' + (minutes % 60) + ' мин';
  }

  function upgradeNumber(value, digits, trim) {
    const text = value.toFixed(Math.abs(value) >= 100 ? 0 : digits).replace('.', ',');
    return trim && text.indexOf(',') >= 0 ? text.replace(/0+$/, '').replace(/,$/, '') : text;
  }

  function upgradeLabel(kind) {
    const level = campaign.purchases[kind];
    const maxed = level >= E.balance.session[kind].max;
    let current = MB.upgradeValue(campaign, kind, level);
    let next = MB.upgradeValue(campaign, kind, level + 1);
    if (kind === 'gather' || kind === 'droneBuild') {
      const foremen = campaign.foremen || {};
      const scale = kind === 'gather'
        ? campaign.metaPickupSpeed * (foremen.droneGather ? foremen.droneGather.value : 1)
        : campaign.metaPlaceSpeed * (foremen.machines ? foremen.machines.second : 1);
      current *= scale;
      next *= scale;
    }
    let digits = 2;
    let trim = true;
    let prefix = '';
    let unit = '';
    if (kind === 'builders' || kind === 'vehicles') {
      const count = kind === 'builders' ? campaign.builderCount : campaign.vehicleCount;
      next = count + next - current;
      current = count;
      digits = 0;
    } else if (kind === 'scaffold') {
      current = MB.SCAFFOLD.erectSeconds / current;
      next = MB.SCAFFOLD.erectSeconds / next;
      digits = 1;
      trim = false;
      unit = ' с';
    } else if (kind === 'speed' || kind === 'gather' || kind === 'droneBuild' || kind === 'pickup') {
      digits = 1;
      trim = false;
      unit = ' кг/с';
    } else if (kind === 'horizontal' || kind === 'vertical' || kind === 'loaderSpeed' || kind === 'heliSpeed' || kind === 'droneSpeed') {
      digits = 1;
      trim = false;
      unit = ' м/с';
    } else if (kind === 'elevatorSpeed') {
      const base = MB.upgradeValue(campaign, 'elevatorSpeed', 0);
      current = base / current;
      next = base / next;
      digits = 2;
      prefix = '×';
    } else if (kind === 'boomSpeed') {
      trim = false;
      unit = ' с';
    } else if (kind === 'carry' || kind === 'loaderMass' || kind === 'heliMass') {
      digits = 0;
      unit = ' кг';
    } else if (kind === 'cubeCapital') {
      digits = 0; prefix = '+'; unit = ' кап./находку';
    } else if (kind === 'freeBuy' || kind === 'triplePay' || kind === 'floorPay') {
      current *= 100;
      next *= 100;
      digits = 1;
      unit = '%';
    } else if (kind === 'plan') {
      digits = 0;
      unit = ' ' + UI.plural(maxed ? current : next, 'мини-куб', 'мини-куба', 'мини-кубов');
    } else if (kind === 'vehicleHeight' || kind === 'elevatorHeight') {
      digits = 0;
      unit = ' эт.';
    } else if (kind === 'engineers' || kind === 'helicopters' || kind === 'elevators' || kind === 'patternHeight' || kind === 'bucket' || kind === 'vehicleReach' || kind === 'heliWidth' || kind === 'heliHeight') {
      digits = 0;
    } else if (kind === 'satiety' || kind === 'hireXp' || kind === 'tokenBuy') {
      digits = 0;
      prefix = '+';
      unit = kind === 'satiety' ? ' с сытости' : kind === 'hireXp' ? ' опыта' : ' ' + UI.plural(maxed ? current : next, 'жетон', 'жетона', 'жетонов');
    } else if (kind === 'mealFast' || kind === 'sleepFast') {
      digits = 0;
      prefix = '−';
      unit = ' с';
    } else if (kind === 'deckWalk' || kind === 'nightGear' || kind === 'winterGear' || kind === 'rainTents' || kind === 'heatGear' || kind === 'rankFast') {
      if (kind === 'rankFast') {
        current = 1 - current;
        next = 1 - next;
      }
      current *= 100;
      next *= 100;
      digits = 0;
      prefix = '−';
      unit = kind === 'rankFast' ? '% опыта' : '% штрафа';
    } else if (kind === 'willpower' || kind === 'cubeGift') {
      current *= 100;
      next *= 100;
      digits = 0;
      unit = '%';
    } else {
      prefix = '×';
    }
    const now = prefix + upgradeNumber(current, digits, trim);
    return maxed ? now + unit : now + ' → ' + prefix + upgradeNumber(next, digits, trim) + unit;
  }

  function setUpgradeLabel(kind, label) {
    const el = document.getElementById(kind + '-label');
    if (!el || (el.dataset.raw === label && el.textContent === label)) return;
    el.dataset.raw = label;
    const parts = label.split(' → ');
    if (parts.length === 2) el.innerHTML = UI.escapeHtml(parts[0]) + ' → <b class="up-next">' + UI.escapeHtml(parts[1]) + '</b>';
    else el.textContent = label;
  }

  function dockLockNode(kind, group) {
    if (E.taxiTooLow(kind)) return '';
    if (DRONE_GATED_GROUPS.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return '';
    if (MB.lineGated(campaign, kind)) return '';
    return techOf(Meta.SESSION_LINE[kind]);
  }

  function techOf(source) {
    return source && source.indexOf('tech:') === 0 ? source.slice(5) : '';
  }

  function paintLockedUpgrade(kind, node) {
    const button = document.getElementById('up-' + kind);
    setText(kind + '-label', '«' + Meta.TECH[node].name + '»');
    setText(kind + '-level', '');
    setText(kind + '-cost', 'Техцентр');
    button.classList.remove('ready', 'maxed');
    button.classList.add('locked');
    if (button.getAttribute('aria-disabled') !== 'true') button.setAttribute('aria-disabled', 'true');
    button.dataset.cost = '';
    button.title = upgradeName(kind) + ' откроется в техцентре: «' + Meta.TECH[node].name + '»';
  }

  function upgradeLockText(kind, group) {
    if (E.taxiTooLow(kind) && Meta.sessionLineOpen(meta, kind)) {
      return 'когда здание поднимется до ' + MB.TAXI_FLOORS + ' этажей (сейчас ' + (MB.TAXI_FLOORS - MB.taxiFloorsShort(world)) + ')';
    }
    if (DRONE_GATED_GROUPS.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return 'после первого дрона';
    const source = Meta.SESSION_LINE[kind];
    const tech = techOf(source);
    if (tech) return 'в техцентре: «' + Meta.TECH[tech].name + '»';
    if (source && source.indexOf('hq:') === 0 && Meta.PROJECTS[source.slice(3)]) return 'после постройки «' + Meta.PROJECTS[source.slice(3)].name + '»';
    return '';
  }

  function gateEntryTechs(id) {
    const lines = MB.gateEntries(id);
    return Meta.TECH_ORDER.filter(function (tech) {
      const spec = Meta.TECH[tech];
      return !spec.center && (spec.opens || []).some(function (kind) { return lines.indexOf(kind) >= 0; });
    }).map(function (tech) { return '«' + Meta.TECH[tech].name + '»'; }).join(' или ');
  }

  function paintDockFill(coins) {
    const cards = document.querySelectorAll('#upgrade-dock .upgrade:not([hidden])');
    for (let i = 0; i < cards.length; i++) {
      const button = cards[i];
      const cost = Number(button.dataset.cost);
      const fill = !cost || button.classList.contains('ready') ? '100%' : Math.min(100, Math.floor(coins / cost * 100)) + '%';
      if (button.dataset.fill === fill) continue;
      button.dataset.fill = fill;
      button.querySelector('em').style.setProperty('--fill', fill);
    }
  }

  function shake(el) {
    if (!el || !el.animate) return;
    el.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' },
    ], { duration: 320, easing: 'ease-out' });
  }

  function paintCoinValue() {
    setText('coin-value', formatCompact(hudCoins.shown));
  }

  function pulseCoins() {
    const now = performance.now();
    if (now - hudCoins.pulseAt < 250) return;
    hudCoins.pulseAt = now;
    const coins = document.getElementById('coins');
    if (coins.animate) {
      coins.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
    }
  }

  function floatCoins(text, kind) {
    const host = document.getElementById('coin-fx');
    if (!host) return;
    const tag = document.createElement('span');
    tag.className = 'coin-float ' + kind;
    tag.textContent = text;
    host.appendChild(tag);
    while (host.childNodes.length > 3) host.removeChild(host.firstChild);
    if (!tag.animate) {
      setTimeout(function () { tag.remove(); }, 1000);
      return;
    }
    const from = kind === 'spend' ? -4 : 8;
    const to = kind === 'spend' ? 14 : -10;
    const anim = tag.animate([
      { opacity: 0, transform: 'translateY(' + from + 'px) scale(0.9)' },
      { opacity: 1, transform: 'translateY(' + (from * 0.6 + to * 0.4) + 'px) scale(1.06)', offset: 0.18 },
      { opacity: 1, transform: 'translateY(' + (from * 0.2 + to * 0.8) + 'px) scale(1)', offset: 0.7 },
      { opacity: 0, transform: 'translateY(' + to + 'px) scale(1)' },
    ], { duration: kind === 'spend' ? 1200 : 1000, easing: 'ease-out' });
    anim.onfinish = function () { tag.remove(); };
  }

  function onUpgradeEvent(event) {
    hudDirty = true;
    const button = document.getElementById('up-' + event.kind);
    if (event.free) {
      flashCard(button, event.freeBy === 'gift' ? 'Подарок!' : 'Бесплатно!', 'free');
      return;
    }
    flashCard(button, '', 'paid');
    if (!campaign.freePurchases && event.cost > 0) floatCoins('−' + formatShort(event.cost), 'spend');
  }

  function flashCard(button, label, kind) {
    if (!button || !button.animate) return;
    const glow = kind === 'free' ? '143, 227, 159' : '255, 214, 120';
    button.animate([
      { boxShadow: '0 0 0 3px rgba(' + glow + ', 1), 0 0 24px rgba(' + glow + ', 0.9)', filter: 'brightness(1.4)' },
      { boxShadow: '0 3px 0 rgba(0, 0, 0, 0.35)', filter: 'brightness(1)' },
    ], { duration: 650, easing: 'ease-out' });
    if (!label) return;
    const tag = document.createElement('b');
    tag.className = 'upgrade-flash';
    tag.textContent = label;
    button.appendChild(tag);
    const anim = tag.animate([
      { opacity: 0, transform: 'translate(-50%, -30%) scale(0.6)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.18 },
      { opacity: 1, transform: 'translate(-50%, -62%) scale(1)', offset: 0.75 },
      { opacity: 0, transform: 'translate(-50%, -95%) scale(1)' },
    ], { duration: 1200, easing: 'ease-out' });
    anim.onfinish = function () { tag.remove(); };
  }

  function clockText(hour) {
    const minutes = Math.floor(wrapHours(hour) * 60 + 1e-6) % 1440;
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  function dialAngle(hour) {
    return (wrapHours(hour) - 12) / 24 * 360;
  }

  function dialArc(fromHour, toHour) {
    const span = wrapHours(toHour - fromHour);
    if (span <= 0) return '';
    const a0 = dialAngle(fromHour) * Math.PI / 180;
    const a1 = a0 + span / 24 * Math.PI * 2;
    const point = function (a) { return (18 + 14 * Math.sin(a)).toFixed(2) + ' ' + (18 - 14 * Math.cos(a)).toFixed(2); };
    return 'M' + point(a0) + 'A14 14 0 ' + (span > 12 ? 1 : 0) + ' 1 ' + point(a1);
  }

  function paintDialArcs() {
    const ENV = Sim.ENVIRONMENT;
    const key = [ENV.nightFromHour, ENV.nightToHour, ENV.dawnHours, ENV.duskHours].join('|');
    if (key === skyView.dial) return;
    skyView.dial = key;
    const morning = ENV.nightToHour + ENV.dawnHours;
    const evening = ENV.nightFromHour - ENV.duskHours;
    document.getElementById('dial-night').setAttribute('d', dialArc(ENV.nightFromHour, ENV.nightToHour));
    document.getElementById('dial-dawn').setAttribute('d', dialArc(ENV.nightToHour, morning));
    document.getElementById('dial-day').setAttribute('d', dialArc(morning, evening));
    document.getElementById('dial-dusk').setAttribute('d', dialArc(evening, ENV.nightFromHour));
  }

  function paintDayClock() {
    const night = MB.needOpen(campaign, 'night');
    const dial = document.getElementById('day-dial');
    dial.classList.toggle('no-night', !night);
    const marker = document.getElementById('dial-marker');
    const time = document.getElementById('level-time');
    time.hidden = !night;
    if (!night) {
      dial.classList.remove('is-night');
      const center = 'translate(18 18) scale(1.7) translate(-18 -4)';
      if (marker.getAttribute('transform') !== center) marker.setAttribute('transform', center);
      return;
    }
    const clock = Sim.dayClock(campaign.levelElapsed);
    paintDialArcs();
    dial.classList.toggle('is-night', clock.night);
    const turn = 'rotate(' + dialAngle(clock.hour).toFixed(1) + ' 18 18)';
    if (marker.getAttribute('transform') !== turn) marker.setAttribute('transform', turn);
    setText('level-time', clockText(clock.hour));
  }

  function dayPhaseLine(clock) {
    const ENV = Sim.ENVIRONMENT;
    const name = { night: 'Ночь', dawn: 'Рассвет', day: 'День', dusk: clock.progress < 0.5 ? 'Закат' : 'Сумерки' }[clock.phase];
    const next = {
      night: ['рассвет', ENV.nightToHour],
      dawn: ['день', ENV.nightToHour + ENV.dawnHours],
      day: ['закат', ENV.nightFromHour - ENV.duskHours],
      dusk: ['ночь', ENV.nightFromHour],
    }[clock.phase];
    return name + ' · ' + next[0] + ' через ' + MB.formatClock(Math.ceil(clock.untilChange));
  }

  function environmentEffects(weather) {
    const ENV = Sim.ENVIRONMENT;
    const foremen = campaign.foremen || {};
    const relief = Meta.nightRelief(campaign);
    const nightWork = ENV.nightWork + (1 - ENV.nightWork) * relief;
    const kind = weather && weather !== 'Ясно' ? Sim.weatherAt(campaign.levelIndex, campaign.levelElapsed) : '';
    const bad = kind ? ENV.kinds[kind] : null;
    const slowed = bad && !foremen.meteo;
    const less = function (factor) { return slowed && Number.isFinite(factor) ? Math.round((1 - factor) * 100) : 0; };
    return {
      kind: kind,
      nightSlow: foremen.nightBoost ? 0 : Math.round((1 - nightWork) * 100),
      nightFast: foremen.nightBoost ? Math.round(foremen.nightBoost.value * 100) : 0,
      weatherSlow: bad ? less(bad.work) : 0,
      weatherMove: bad ? less(bad.move) : 0,
      weatherWalk: bad ? less(bad.walk) : 0,
      weatherDeck: bad ? less(bad.deck) : 0,
      weatherFloor: slowed && bad.floorStep > 0 ? Math.round((MB.BALANCE.deckFloorStep + bad.floorStep) * 100) : 0,
      weatherCarry: bad ? less(bad.carry) : 0,
      weatherHunger: slowed && bad.hungerRate > 1 ? bad.hungerRate : 0,
      weatherSmoke: slowed && bad.smokeRate > 1 ? bad.smokeRate : 0,
      weatherFatigue: slowed && bad.fatigueRate > 1 ? bad.fatigueRate : 0,
      lightning: !!bad && bad.lightning > 0,
      weatherFast: bad && foremen.meteo ? Math.round(foremen.meteo.value * 100) : 0,
    };
  }

  function nightLine(effects) {
    if (effects.nightFast > 0) return 'Ночью · работа +' + effects.nightFast + '%';
    return 'Ночью · работа −' + effects.nightSlow + '%';
  }

  function weatherSummary(effects) {
    if (effects.lightning) return 'молнии с ' + Sim.ENVIRONMENT.lightning.minFloor + '-го этажа';
    if (effects.weatherFast > 0) return 'работа +' + effects.weatherFast + '%';
    const times = function (rate) { return '×' + String(Math.round(rate * 100) / 100).replace('.', ','); };
    if (effects.weatherHunger > 0) return 'голод ' + times(effects.weatherHunger);
    if (effects.weatherSmoke > 0) return 'перекуры ' + times(effects.weatherSmoke);
    if (effects.weatherFatigue > 0) return 'усталость ' + times(effects.weatherFatigue);
    if (effects.weatherSlow > 0) return 'работа −' + effects.weatherSlow + '%';
    if (effects.weatherWalk > 0) return 'ходьба −' + effects.weatherWalk + '%';
    if (effects.weatherMove > 0) return 'ходьба −' + effects.weatherMove + '%';
    return '';
  }

  function weatherEffect(effects) {
    const strikes = effects.lightning ? 'молнии выбивают кубы с ' + Sim.ENVIRONMENT.lightning.minFloor + '-го этажа' : '';
    if (effects.weatherFast > 0) return 'Метеоролог: работа +' + effects.weatherFast + '%' + (strikes ? ', но ' + strikes : '');
    const parts = [];
    if (effects.weatherSlow > 0) parts.push('укладка −' + effects.weatherSlow + '%');
    if (effects.weatherMove > 0) parts.push('ходьба и подъёмы −' + effects.weatherMove + '%');
    if (effects.weatherWalk > 0) parts.push('ходьба −' + effects.weatherWalk + '%');
    if (effects.weatherDeck > 0 || effects.weatherFloor > 0) {
      const deck = [];
      if (effects.weatherDeck > 0) deck.push('−' + effects.weatherDeck + '%');
      if (effects.weatherFloor > 0) deck.push('−' + effects.weatherFloor + '% за этаж');
      parts.push('на настилах ещё ' + deck.join(' и ') + (effects.kind === 'snow' ? ' (наледь)' : ''));
    }
    if (effects.weatherCarry > 0) parts.push('ноша −' + effects.weatherCarry + '%' + (effects.kind === 'rain' ? ' (мокрый материал)' : ''));
    const times = function (rate) { return '×' + String(Math.round(rate * 100) / 100).replace('.', ','); };
    if (effects.weatherHunger > 0) parts.push('голод ' + times(effects.weatherHunger) + (effects.kind === 'snow' ? ' (холод)' : ''));
    if (effects.weatherSmoke > 0) parts.push('тянет курить ' + times(effects.weatherSmoke));
    if (effects.weatherFatigue > 0) parts.push('усталость ' + times(effects.weatherFatigue));
    if (strikes) parts.push(strikes);
    return parts.join(', ');
  }

  cards.forEach(function (button) { button.addEventListener('click', function () { tapUpgrade(button.id.slice(3)); }); });
  [25, 50].forEach(function (threshold) { document.getElementById('chest-' + threshold).addEventListener('click', function () { tapChest(threshold); }); });
  document.querySelectorAll('#day-pop button[data-tempo]').forEach(function (button) {
    button.addEventListener('click', function () { if (opts.setTempo) opts.setTempo(Number(button.dataset.tempo)); paintTempo(); });
  });
  document.getElementById('day-clock').addEventListener('click', function () { if (world) paintDayPop(); });
  document.getElementById('settings-toggle').addEventListener('click', paintSettings);
  document.getElementById('mute').addEventListener('click', function () { if (opts.toggleSound) opts.toggleSound(); paintSettings(); });
  document.getElementById('quality').addEventListener('click', function () { if (opts.cycleQuality) opts.cycleQuality(); paintSettings(); });
  document.getElementById('restart').addEventListener('click', confirmRestart);
  document.getElementById('next-cta').addEventListener('click', function () {
    if (!campaign || campaign.status !== 'complete') return;
    if (E.chapterDone) openCompleteDialog(); else next();
  });
  E.on(onEvent);
  paint();
  return { paint: paint, tick: tick, showStart: showStart, dirty: dirty };
}
