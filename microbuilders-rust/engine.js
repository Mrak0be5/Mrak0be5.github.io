// Движок оригинала MicroBuilders в прототипе: logic.js, balance.js, levels.js, meta.js и их соседи из корня
// репозитория грузятся как есть (порядок — index.html оригинала), прототип только рисует их мир. Здесь —
// обвязка, которую в оригинале держит game.js: жизнь заказа (старт, сундуки, сдача, следующий), разбор
// событий с их экономикой, шаг кадра, сохранение и команды для HUD и тестов. Кадр, события и покупки —
// те же функции и в том же порядке, что game.js → frame(), consumeEvents(), buy(), settleCompletion().
//
// Штаб в этом этапе ведёт эталонный план оригинала: перед заказом N мета становится такой, какой её
// купил эталонный игрок к этому уровню (Meta.devFastForward, balance.json → meta.plan). Без штаба на
// стройке открыты только «Рабочие», «Скорость» и «План» — оригинал задуман со штабом.

// Файлы оригинала в порядке index.html (рендер оригинала — game.js, art/*, worker-model.js — не нужен).
// meta.js — со своим ключом хранилища: основная игра и прототип живут на одном домене.
export const ENGINE_SCRIPTS = ['balance.js', 'upgrade-graph.js', 'ui.js', 'build-pattern-editor.js', 'levels.js', 'feature-blocks.js',
  'logic.js', 'meta.js', 'sim.js', 'worker-log.js'];
export const STORAGE_FROM = "'microbuilders.meta.v1'";
export const STORAGE_TO = "'microbuilders-rust.meta.v1'";
// ui.js сажает интерфейс на ПК в рамку телефона; прототип — во всё окно, рамка только по ?frame=1.
export const FRAME_FROM = "const framed = frameParam === '1' || frameParam === 'land' || (frameParam !== '0' && desktop);";
export const FRAME_TO = "const framed = frameParam === '1' || frameParam === 'land';";
// Правки текста файлов оригинала при загрузке (сборка сайта делает те же замены заранее).
export const PATCHES = { 'meta.js': [[STORAGE_FROM, STORAGE_TO]], 'ui.js': [[FRAME_FROM, FRAME_TO]] };
// Первая глава прототипа: уровни 1–12 (индексы 0–11).
export const LAST_LEVEL = 11;

// Загрузить движок в браузере (один раз). base — папка с файлами оригинала (в репозитории — '../',
// в сборке сайта — 'engine/'); офлайн-файл вшивает их тексты сам, уже с правками (window.MB_ENGINE_TEXTS).
let loading = null;
export function loadEngine(THREE, base) {
  if (loading) return loading;
  window.THREE = THREE;
  loading = (async function () {
    if (window.MB_ENGINE_TEXTS) {
      // встроенный скрипт выполняется сразу при вставке — по порядку, после window.THREE
      window.MB_ENGINE_TEXTS.forEach(function (text) {
        const script = document.createElement('script');
        script.text = text;
        document.head.appendChild(script);
      });
    } else {
      for (const name of ENGINE_SCRIPTS) {
        const url = base + name + (window.MB_ENGINE_VERSION ? '?v=' + window.MB_ENGINE_VERSION : '');
        if (PATCHES[name]) {
          let text = await (await fetch(url)).text();
          PATCHES[name].forEach(function (pair) {
            if (text.indexOf(pair[0]) < 0) throw new Error(name + ': не найдено место правки «' + pair[0].slice(0, 40) + '…»');
            text = text.replace(pair[0], pair[1]);
          });
          await addScript(URL.createObjectURL(new Blob([text + '\n//# sourceURL=' + url], { type: 'text/javascript' })));
        } else {
          await addScript(url);
        }
      }
    }
    return { MB: window.MicroBuilders, Meta: window.MicroBuildersMeta, Sim: window.MicroBuildersSim, balance: window.MicroBuildersBalance };
  })();
  return loading;
}

function addScript(src) {
  return new Promise(function (resolve, reject) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = function () { reject(new Error('не загрузился ' + src)); };
    document.head.appendChild(script);
  });
}

// Обвязка заказа. opts: MB, Meta, Sim, balance (из loadEngine), groups — [{id, items: [[kind, name]]}]
// (ui.js → MicroBuildersUpgradeGroups: группа карточки решает «Погрузчики/Вертолёты только после дрона»),
// lastLevel. Слушатели on(fn) получают каждое событие мира после его экономики: fn(event, extra).
export function createEngine(opts) {
  const MB = opts.MB, Meta = opts.Meta, balance = opts.balance;
  const lastLevel = opts.lastLevel === undefined ? LAST_LEVEL : opts.lastLevel;
  const groupOf = {};
  (opts.groups || []).forEach(function (group) { group.items.forEach(function (item) { groupOf[item[0]] = group.id; }); });
  const treeParent = {};
  balance.upgradeTree.forEach(function (pair) { treeParent[pair[0]] = pair[1] || null; });
  const GATES = balance.gates || {};
  // game.js → DRONE_GATED_GROUPS: погрузчики и вертолёты — после первого дрона.
  const DRONE_GATED = ['loaders', 'helicopters'];
  const listeners = [];
  let saveClock = 0;

  const E = {
    MB: MB, Meta: Meta, balance: balance, lastLevel: lastLevel,
    meta: null, campaign: null, world: null, key: null,
    environment: null,
    // сундуки этого заказа, до которых дошла стройка и которые ещё не открыты: [25, 50]
    chestsReady: [],
    // итог сданного заказа (окно «Объект сдан!»)
    reward: null,
    // глава пройдена: сдан последний уровень прототипа
    chapterDone: false,
    stats: { autoCompleted: 0, abandons: 0, recovers: 0 },
    on: function (fn) { listeners.push(fn); return function () { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
  };

  // ---------- мета: эталонный штаб ----------
  // devFastForward переписывает список сданных и уровень кампании под эталон; сданное игроком сохраняем
  // (повтор раннего уровня не должен заплатить второй раз за уже сданные).
  function referenceMeta(levelIndex) {
    const completed = E.meta.completed.slice();
    const reached = E.meta.campaignLevel || 0;
    Meta.devFastForward(E.meta, levelIndex);
    completed.forEach(function (i) { if (E.meta.completed.indexOf(i) < 0) E.meta.completed.push(i); });
    E.meta.completed.sort(function (a, b) { return a - b; });
    E.meta.campaignLevel = Math.max(reached, levelIndex);
    Meta.save(E.meta);
  }

  // ---------- жизнь заказа ----------
  E.boot = function () {
    E.meta = Meta.load();
    const snap = Meta.site(E.meta, 'campaign');
    if (snap && snap.runMode === 'campaign' && snap.levelIndex <= lastLevel) {
      restore(snap);
      return E;
    }
    E.start(Math.min(E.meta.campaignLevel || 0, lastLevel));
    return E;
  };

  // Новый заказ: новая кампания (сессионные прокачки с нуля), мета эталона, площадка (game.js → launchRun).
  E.start = function (levelIndex) {
    levelIndex = Math.max(0, Math.min(lastLevel, levelIndex | 0));
    referenceMeta(levelIndex);
    const campaign = MB.createCampaign();
    Meta.configureNewCampaign(E.meta, campaign, 'campaign', levelIndex, null);
    const world = MB.startLevel(campaign);
    world.events.length = 0;
    setSite(campaign, world);
    E.reward = null;
    E.chapterDone = false;
    E.key = Meta.siteKey('campaign');
    Meta.saveSite(E.meta, E.key, campaign, world, { status: 'play', awaySince: null, awayBank: 0, reward: null });
    Meta.setActiveSite(E.meta, E.key);
    emit({ type: 'siteStart', levelIndex: levelIndex });
    return world;
  };

  // Площадка из снимка (game.js → restoreSiteWorld): готовые кубы, покупки, время, городок. Рабочие
  // начинают ходки заново; без догоняющей стройки «без игрока» (оффлайн — следующий этап).
  function restore(snap) {
    referenceMeta(snap.levelIndex);
    const campaign = MB.createCampaign();
    Meta.restoreCampaign(E.meta, campaign, snap);
    const world = MB.startLevel(campaign);
    Meta.applySiteRuntime(campaign, world, snap);
    const paid = E.meta.completed.indexOf(campaign.levelIndex) >= 0;
    if (snap.status === 'complete' || (world.remaining === 0 && paid)) {
      campaign.status = 'complete';
      world.completed = true;
      E.reward = snap.reward || null;
      E.chapterDone = campaign.levelIndex >= lastLevel;
    }
    world.events.length = 0;
    setSite(campaign, world);
    E.key = snap.key || 'campaign';
    emit({ type: 'siteStart', levelIndex: campaign.levelIndex, restored: true });
  }

  function setSite(campaign, world) {
    E.campaign = campaign;
    E.world = world;
    E.environment = Meta.applyEnvironment(E.meta, campaign);
    E.chestsReady = [];
    E.stats = { autoCompleted: 0, abandons: 0, recovers: 0 };
    // сундуки, до которых стройка уже дошла (восстановление)
    noteChests(Meta.onBlocksPlaced(E.meta, campaign, world, []));
  }

  E.next = function () {
    if (!E.campaign || E.campaign.status !== 'complete') return false;
    if (E.campaign.levelIndex >= lastLevel) { E.chapterDone = true; return false; }
    E.start(E.campaign.levelIndex + 1);
    return true;
  };

  E.restart = function () {
    if (!E.campaign) return false;
    E.start(E.campaign.levelIndex);
    return true;
  };

  E.save = function (extra) {
    if (!E.world || !E.campaign || E.campaign.status === 'title') return null;
    return Meta.saveSite(E.meta, E.key, E.campaign, E.world, Object.assign({ awaySince: null }, extra || {}));
  };

  // ---------- кадр (game.js → frame) ----------
  // realDt — секунды кадра; tempo — ×1/×5/×20 (0 — пауза); present — игрок смотрит на стройку.
  E.step = function (realDt, tempo, present) {
    const campaign = E.campaign, world = E.world;
    if (!world || campaign.status !== 'play' || present === false) return false;
    const dt = Math.min(realDt, 0.05);
    MB.beginFrame(world);
    let budget = dt * (tempo === undefined ? 1 : tempo);
    let guard = 0;
    while (budget > 0 && guard < 40) {
      const slice = Math.min(budget, 0.05);
      MB.stepWorld(world, slice);
      budget -= slice;
      guard += 1;
    }
    E.environment = Meta.applyEnvironment(E.meta, campaign);
    E.consume();
    saveClock += dt;
    if (saveClock >= 5 && campaign.status === 'play') {
      saveClock = 0;
      E.save();
    }
    return true;
  };

  // ---------- события (game.js → consumeEvents: экономика здесь, отклик — у слушателей) ----------
  E.consume = function () {
    const world = E.world, campaign = E.campaign, meta = E.meta;
    const events = world.events;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const extra = {};
      // Капитал события (находка за мини-куб — у pour; tripDone несёт capitalFound только для показа).
      if (event.capital) meta.capital += event.capital;
      if (event.type === 'place') {
        // «Учебный центр»: целый куб, поставленный рабочим, — 1 опыт центру.
        if (!event.drone) Meta.addTrainingXp(meta, 1);
        extra.placed = Meta.onBlocksPlaced(meta, campaign, world, [event.block]);
        noteChests(extra.placed);
      }
      if (event.type === 'vehiclePlaceBatch') {
        extra.placed = Meta.onBlocksPlaced(meta, campaign, world, event.blocks);
        noteChests(extra.placed);
      }
      if (event.type === 'autofill') {
        extra.expertise = Meta.gainForemanExperience(meta, campaign, world, event.blocks, false);
        E.stats.autoCompleted += event.blocks ? event.blocks.length : 0;
      }
      if (event.type === 'foreman' && event.card === 'golden' && event.block) {
        extra.found = Meta.goldenFind(meta, event.block, campaign, event.findMultiplier);
      }
      if (event.type === 'secretDish') Meta.discoverDish(meta, event.dish);
      if (event.type === 'abandon') E.stats.abandons += 1;
      if (event.type === 'complete') extra.reward = settle();
      for (let k = 0; k < listeners.length; k++) listeners[k](event, extra);
    }
    events.length = 0;
  };

  function emit(event) {
    for (let k = 0; k < listeners.length; k++) listeners[k](event, {});
  }

  // Сундуки, до которых дошла стройка (Meta.onBlocksPlaced → rewards: пороги 25 / 50).
  function noteChests(placed) {
    (placed && placed.rewards || []).forEach(function (threshold) {
      if (E.chestsReady.indexOf(threshold) < 0) {
        E.chestsReady.push(threshold);
        emit({ type: 'chestReady', threshold: threshold });
      }
    });
  }

  E.openChest = function (threshold) {
    if (!E.world || E.chestsReady.indexOf(threshold) < 0) return null;
    const prize = Meta.claimChest(E.meta, E.world.level.index, threshold);
    E.chestsReady.splice(E.chestsReady.indexOf(threshold), 1);
    if (prize) emit({ type: 'chestOpen', threshold: threshold, prize: prize });
    return prize;
  };

  // Сдача (game.js → settleCompletion): неоткрытые сундуки открываются, награда, снимок «сдан».
  function settle() {
    const c = E.campaign, w = E.world;
    const chests = [];
    if (c.runMode === 'campaign' && Meta.chestsOpen(w.level.index)) {
      [25, 50].forEach(function (threshold) {
        const prize = Meta.claimChest(E.meta, w.level.index, threshold);
        if (prize) chests.push(Object.assign({ threshold: threshold }, prize));
      });
    }
    E.chestsReady = [];
    const reward = Meta.onLevelComplete(E.meta, c, w);
    reward.key = E.key;
    reward.chests = chests;
    reward.runMode = c.runMode;
    reward.levelIndex = c.levelIndex;
    reward.name = Meta.siteName(c.runMode, c.levelIndex, c.runPayload);
    reward.levelElapsed = c.levelElapsed + (c.awayElapsed || 0);
    reward.autoCompleted = w.autoCompleted || 0;
    reward.total = w.blocks.length;
    reward.stats = Object.assign({}, w.stats);
    reward.last = c.levelIndex >= lastLevel;
    if (c.runMode === 'campaign') E.meta.lastBuys = (c.buyLog || []).slice();
    c.status = 'complete';
    w.completed = true;
    Meta.saveSite(E.meta, E.key, c, w, { status: 'complete', reward: reward });
    E.reward = reward;
    E.chapterDone = reward.last;
    return reward;
  }

  // ---------- прокачки (game.js → upgradeLineOpen, buy) ----------
  E.taxiTooLow = function (kind) {
    return kind === 'elevators' && !!E.world && !(E.campaign.purchases.elevators > 0) && MB.taxiFloorsShort(E.world) > 0;
  };

  E.lineOpen = function (kind) {
    const campaign = E.campaign;
    if (!campaign) return false;
    if (E.taxiTooLow(kind)) return false;
    const group = groupOf[kind];
    if (campaign.devGroups.all === true || campaign.devGroups[group] === true) return true;
    if (MB.lineGated(campaign, kind)) return false;
    if (DRONE_GATED.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return false;
    return Meta.sessionLineOpen(E.meta, kind);
  };

  // Ближайшая линия выше по графу (проходы — не линии): ui.js → MicroBuildersUpgradeGraph.parent.
  E.parentOf = function (kind) {
    let parent = treeParent[kind] || null;
    while (parent && GATES[parent]) parent = treeParent[parent] || null;
    return parent;
  };

  E.cost = function (kind) {
    return MB.upgradeCost(kind, E.campaign.purchases[kind], E.campaign);
  };

  E.maxed = function (kind) {
    return E.campaign.purchases[kind] >= balance.session[kind].max;
  };

  // Купить можно, если линия открыта, у родителя есть уровень и хватает монет (сама цена — MB.buyUpgrade).
  E.buy = function (kind) {
    const campaign = E.campaign;
    if (!E.world || campaign.status !== 'play' || !balance.session[kind]) return false;
    if (!E.lineOpen(kind)) return false;
    const parent = E.parentOf(kind);
    if (parent && campaign.purchases[parent] < 1 && campaign.devGroups.all !== true) return false;
    if (!MB.buyUpgrade(campaign, E.world, kind)) return false;
    (campaign.buyLog || (campaign.buyLog = [])).push(kind);
    E.consume();
    return true;
  };

  // Проход графа за жетоны (game.js → openGate; исследование — у меты).
  E.openGate = function (id) {
    if (!E.world || E.campaign.status !== 'play') return false;
    if (!MB.buyGate(E.campaign, id)) return false;
    E.save();
    return true;
  };

  // Постройка городка: 1 жетон и монеты первого уровня (logic.js → startCamp).
  E.startCamp = function (kind) {
    if (!E.world || E.campaign.status !== 'play') return false;
    if (!MB.startCamp(E.campaign, E.world, kind)) return false;
    (E.campaign.buyLog || (E.campaign.buyLog = [])).push(kind);
    E.consume();
    return true;
  };

  // Жадный покупатель для проверок: сначала проходы и постройки городка, затем самая дешёвая
  // доступная прокачка — пока хватает монет. Проверяет проходимость, а не качество баланса.
  E.greedy = function () {
    if (!E.world || E.campaign.status !== 'play') return 0;
    let bought = 0;
    Object.keys(GATES).forEach(function (id) { if (MB.gateOpenable(E.campaign, id) && E.openGate(id)) bought += 1; });
    Object.keys(MB.CAMP_LINES || {}).forEach(function (kind) {
      if (MB.campStartable(E.campaign, kind) && E.cost(kind) <= E.campaign.coins && E.startCamp(kind)) bought += 1;
    });
    for (let guard = 0; guard < 50; guard++) {
      let best = null, bestCost = Infinity;
      Object.keys(balance.session).forEach(function (kind) {
        if ((MB.CAMP_LINES || {})[kind] || kind === 'advanced') return;
        if (!E.lineOpen(kind) || E.maxed(kind)) return;
        const parent = E.parentOf(kind);
        if (parent && !(E.campaign.purchases[parent] > 0)) return;
        const cost = E.cost(kind);
        if (cost < bestCost) { bestCost = cost; best = kind; }
      });
      if (!best || bestCost > E.campaign.coins || !E.buy(best)) break;
      bought += 1;
    }
    return bought;
  };

  return E;
}
