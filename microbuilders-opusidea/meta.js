(function (root) {
  const STORAGE_KEY = 'microbuilders.meta.v1';
  const EXCHANGE_INTERVAL_MS = 2 * 60 * 60 * 1000;

  const RARE_KEYS = ['residential', 'industrial', 'highrise', 'landmark'];
  const RARE_NAMES = {
    residential: 'Жилой ресурс',
    industrial: 'Промышленный ресурс',
    highrise: 'Высотный ресурс',
    landmark: 'Ресурс памятников',
  };

  // Foremen: cards, drop chances, pity and upgrade costs live in balance.json → meta → foremen.
  const FOREMEN = root.MicroBuildersBalance.meta.foremen;
  const CARDS = FOREMEN.cards;
  const RARITIES = ['common', 'rare', 'epic', 'legendary'];
  const RARITY_NAMES = {
    common: 'Обычная',
    rare: 'Редкая',
    epic: 'Эпическая',
    legendary: 'Легендарная',
  };

  // Office, technologies, exchange upgrades and HQ projects come from balance.json → meta: the wanted
  // purchase time (minutes of active play), value formula, maximum and the prices calibrated for that
  // time (metasim.js → calibrate). An office line opens with the story level the scenario reaches by
  // `unlockShare` (default: half) of its first smoothed purchase minute (`level`, written by
  // calibration). Technologies follow the session graph branches; an exchange upgrade opens after the
  // previous one (`after`).
  const META_BALANCE = root.MicroBuildersBalance.meta;
  const SCHOOL = META_BALANCE.school;
  const OFFICE = META_BALANCE.office;
  // The office's topics (balance meta.office[id].section): a row of tabs in the office window.
  const OFFICE_SECTIONS = ['Бригада', 'Движение', 'Быт', 'Техника', 'Монеты', 'Капитал', 'Городок', 'Штаб'];
  const OFFICE_ROWS = {};
  OFFICE_SECTIONS.forEach(function (section) {
    OFFICE_ROWS[section] = Object.keys(OFFICE)
      .filter(function (id) { return OFFICE[id].section === section; })
      .sort(function (x, y) { return (OFFICE[x].level || 0) - (OFFICE[y].level || 0) || OFFICE[x].from - OFFICE[y].from; });
  });
  const TECH = META_BALANCE.tech;
  const TECH_ORDER = Object.keys(TECH).sort(function (x, y) {
    const minute = function (spec) { return spec.initiallyOwned ? 0 : spec.pricedTimings && spec.pricedTimings.length ? spec.pricedTimings[0] : spec.from; };
    return minute(TECH[x]) - minute(TECH[y]);
  });
  // The tech center shows the techs of the site graph; the camp buildings and their upgrades are
  // researched in the personnel centre (`center: 'personnel'`), the site reactor in the HQ reactor
  // (`center: 'reactor'`). The same purchase (buyTech) everywhere.
  const TECH_CENTER_ORDER = TECH_ORDER.filter(function (id) { return !TECH[id].center; });
  function centerTechs(center) {
    return TECH_ORDER.filter(function (id) { return TECH[id].center === center; });
  }
  // «Продвинутые технологии» — a tab of the tech center: the key nodes around the site's advanced
  // centre, researched from story level `requiresLevel` (balance advanced.unlockLevel).
  const ADVANCED_TECHS = centerTechs('advanced');
  function advancedUnlocked(state) {
    const level = (root.MicroBuildersBalance.advanced || {}).unlockLevel || 0;
    return state.hq.tech > 0 && (state.campaignLevel || 0) + 1 >= level;
  }

  const formulaCache = {};
  function evalFormula(formula, x) {
    let fn = formulaCache[formula];
    if (!fn) {
      fn = new Function('x', 'Math', 'return (' + formula.replace(/\^/g, '**') + ');');
      formulaCache[formula] = fn;
    }
    return fn(x, Math);
  }

  // Coins the reference session spends in its first `minutes` (session prices by their minutes):
  // «Аванс заказчика» hands them out at the start, so an order skips its first minutes.
  let skipQueue = null;
  function skipCoins(minutes) {
    if (!skipQueue) {
      skipQueue = [];
      const session = root.MicroBuildersBalance.session;
      Object.keys(session).forEach(function (kind) {
        (session[kind].prices || []).forEach(function (price, i) {
          skipQueue.push({ minute: session[kind].pricedTimings[i], price: price });
        });
      });
      skipQueue.sort(function (a, b) { return a.minute - b.minute; });
    }
    let coins = 0;
    for (let i = 0; i < skipQueue.length && skipQueue[i].minute <= minutes; i++) coins += skipQueue[i].price;
    return coins;
  }

  // The extra starting coins a crew adds on top of the current office advance. Convert the
  // combined reference time first: prices grow, so separately converted bonuses are not additive.
  function startCoinBonus(state, minutes) {
    const officeMinutes = OFFICE.startCoins.skipStep * state.office.startCoins;
    return skipCoins(officeMinutes + minutes) - skipCoins(officeMinutes);
  }

  // Value of an office line at a given level (unlock nodes: 0 or 1).
  function officeValue(id, level) {
    const spec = OFFICE[id];
    if (spec.skipStep) return skipCoins(spec.skipStep * level);
    if (!spec.formula) return level > 0 ? 1 : 0;
    return evalFormula(spec.formula, level);
  }

  // The second number of a two-part office line («Крановщики»: cubes the crane sets).
  function officeValue2(id, level) {
    const spec = OFFICE[id];
    return spec.formula2 ? evalFormula(spec.formula2, level) : 0;
  }

  // Office lines with a `hook` (docs/gdd/31-office-lines-draft.md): `stat` — a meta stat of metaStats
  // (multiplied; `combine: 'add'` adds, `'share'` stacks as shares of a penalty taken away),
  // `trigger` — joins the foremen's trigger of that name (logic.js reads campaign.foremen; `card` is the
  // foreman whose ability it is: the view finds the effect by it), `effect` — read by the site through
  // campaign.office (officeEffects). A line at level 0 does nothing.
  const OFFICE_EFFECTS = { fatigue: 1, weather: 0, lightning: 1, discount: 0, sales: 1, glass: 1, exchange: 1, handover: 1, camp: 1, chef: 1, kitchenStaff: 0, offlineHours: 0, tokens: 0 };
  const OFFICE_ADDED_EFFECTS = { weather: 1, discount: 1, kitchenStaff: 1, offlineHours: 1, tokens: 1 };

  function officeEffects(state) {
    const result = Object.assign({}, OFFICE_EFFECTS);
    Object.keys(OFFICE).forEach(function (id) {
      const hook = OFFICE[id].hook, level = state.office[id] || 0;
      if (!hook || !hook.effect || level <= 0) return;
      const value = officeValue(id, level);
      if (OFFICE_ADDED_EFFECTS[hook.effect]) result[hook.effect] += value;
      else result[hook.effect] *= value;
    });
    return result;
  }

  // Office stats and triggers on top of the cards' (metaStats).
  function applyOfficeHooks(state, stats) {
    Object.keys(OFFICE).forEach(function (id) {
      const hook = OFFICE[id].hook, level = state.office[id] || 0;
      if (!hook || level <= 0) return;
      const value = officeValue(id, level);
      if (hook.stat) {
        if (hook.stat === 'vehicles' && !(state.tech.loaders > 0)) return;
        if (hook.combine === 'add') stats[hook.stat] += value;
        else if (hook.combine === 'share') stats[hook.stat] = 1 - (1 - stats[hook.stat]) * (1 - value);
        else stats[hook.stat] *= value;
      } else if (hook.trigger) {
        const second = officeValue2(id, level);
        const now = stats.triggers[hook.trigger];
        if (!now) {
          stats.triggers[hook.trigger] = { value: value, second: hook.trigger === 'machines' ? value : second, factor: hook.factor || 1, card: hook.card, office: id };
        } else if (hook.combine === 'every') {
          // Two counters at once: as often as both together.
          now.value = 1 / (1 / now.value + 1 / value);
          now.second = Math.max(now.second || 0, second);
        } else if (hook.combine === 'mult') {
          now.value *= value;
          if (hook.trigger === 'machines') now.second = (now.second || 1) * value;
        } else now.value += value;
      }
    });
  }

  // An exchange upgrade is open once the one before it has `afterLevel` levels.
  function lineUnlocked(levels, spec) {
    return !spec.after || levels[spec.after] >= (spec.afterLevel || 1);
  }

  // The quarter (game.js draws it, docs/gdd/16-ux-flow.md §8): a boulevard from the camera into
  // the distance, two columns of lots (col −1 left, +1 right of the avenue), rows in unlock order,
  // every facade facing the camera. Buildings that are not in the game yet (zone: 'expansion') wait
  // together behind one fence at the far end. sign — short name on the floating sign, accent — its colour.
  const CITY = [
    { id: 'office', sign: 'Офис', accent: '#e0a860' },
    { id: 'recruiting', sign: 'Школа', accent: '#7cc29a' },
    { id: 'tech', sign: 'Техцентр', accent: '#8f8cf0' },
    { id: 'personnel', sign: 'Персонал', accent: '#d9805a' },
    { id: 'exchange', sign: 'Биржа', accent: '#6fa3d8' },
    { id: 'garage', sign: 'Гараж', accent: '#e9c04a' },
    { id: 'contracts', sign: 'Контракты', accent: '#d07aa0' },
    { id: 'supply', sign: 'Снабжение', accent: '#c9a26a' },
    { id: 'reactor', sign: 'Реактор', accent: '#4fe3d2' },
    { id: 'training', sign: 'Учебный центр', accent: '#5fb3e6' },
    { id: 'materials', zone: 'expansion', sign: 'Лаборатория' },
    { id: 'clinic', zone: 'expansion', sign: 'Клиника' },
    { id: 'logistics', zone: 'expansion', sign: 'Логистика' },
    { id: 'weather', zone: 'expansion', sign: 'Аварийная служба' },
    { id: 'subcontract', zone: 'expansion', sign: 'Субподряд' },
  ];
  // The lots stand in unlock order (projects[id].unlock — the story level): two columns along the
  // boulevard, left then right, row by row from the camera.
  CITY.filter(function (spec) { return !spec.zone; })
    .sort(function (a, b) { return (META_BALANCE.projects[a.id].unlock || 0) - (META_BALANCE.projects[b.id].unlock || 0); })
    .forEach(function (spec, i) {
      spec.row = Math.floor(i / 2);
      spec.col = i % 2 ? 1 : -1;
    });

  // Which meta node opens each session upgrade: '' — open from the start, 'tech:<id>' — a technology
  // of the tech center, or 'hq:<project>' — a built HQ building. Each graph node has its own
  // technology; the three basic ones are already owned at the start.
  const SESSION_LINE = {};
  TECH_ORDER.forEach(function (id) {
    (TECH[id].opens || []).forEach(function (kind) { SESSION_LINE[kind] = 'tech:' + id; });
  });
  Object.keys(META_BALANCE.projects).forEach(function (id) {
    (META_BALANCE.projects[id].opens || []).forEach(function (kind) { SESSION_LINE[kind] = 'hq:' + id; });
  });

  // text — one line about the building; gives — «Что даёт» on its card (lines it opens on the site
  // are added from balance meta.projects[id].opens by game.js); opened — what the completion card
  // says it opened. live: false — no HQ level yet («Скоро» in the expansion zone).
  const PROJECTS = {
    office: { name: 'Главный офис', unlock: 1, capital: 20, text: 'Простой первый штаб. Внутри три отдела прокачек.', gives: 'Три отдела постоянных прокачек для всех строек', opened: 'отделы постоянных прокачек', live: true },
    tech: { name: 'Технологический центр', unlock: 3, capital: 40, text: 'Открывает новые прокачки стройки по веткам развития', gives: 'Все технологии стройки: ноша, маршруты, дроны, погрузчики, лифты и вертолёты — по веткам развития', opened: 'новые прокачки стройки', live: true },
    exchange: { name: 'Биржа', unlock: 12, capital: 200, text: 'Повторные старые заказы', gives: 'Повторные старые заказы за редкие ресурсы', opened: 'старые заказы', live: true },
    recruiting: { name: 'Школа бригадиров', unlock: 2, capital: 5, text: 'Испытания, обучение и найм бригадиров', gives: 'Бригадиры в сундуках, экспертиза, наставничество и испытания за дипломы', opened: 'школа бригадиров', live: true },
    garage: { name: 'Гараж', unlock: 26, capital: 900, text: 'Даёт дополнительную машину на старте после открытия технологии «Погрузчики»', gives: 'Машина на старте каждой стройки после открытия «Погрузчиков» в техцентре', opened: 'машина на старте после открытия «Погрузчиков»', live: true },
    materials: { name: 'Лаборатория материалов', unlock: 30, capital: 1600, text: 'Мелкая сетка и редкие материалы', live: false },
    logistics: { name: 'Логистический центр', unlock: 36, capital: 2800, text: 'Высота, лифты и краны', live: false },
    contracts: { name: 'Контрактное бюро', unlock: 42, capital: 5000, text: 'Испытания на время', gives: 'Контракты: испытания на время за печати', opened: 'контрактная ветка', live: true },
    subcontract: { name: 'Агентство субподряда', unlock: 50, capital: 9000, text: 'Автоматизация старых заказов', live: false },
    personnel: { name: 'Центр персонала', unlock: 10, capital: 80, text: 'Строительный городок: столовая, офис продаж, бытовки, зона отдыха и освещение на стройках, кулинарная книга', gives: 'Строительный городок на стройках: технологии «Полевая кухня» (столовая), «Офис продаж», «Бытовки», «Зона отдыха» и «Прожекторы» в техцентре, уровни этих зданий, кулинарная книга', opened: 'строительный городок и кулинарная книга', live: true },
    clinic: { name: 'Клиника', unlock: 32, capital: 1900, text: 'Травмы и лечение', live: false },
    supply: { name: 'Снабжение', unlock: 6, capital: 60, text: 'Бустеры перед стартом стройки', gives: 'Бустеры: перед стартом стройки — бонусы на этот заказ за редкий ресурс; новые бустеры и усиления за капитал', opened: 'бустеры перед стартом стройки', live: true },
    reactor: { name: 'Реактор', unlock: 19, capital: 2500, text: 'Техно-магия: мана на стройках и заклинания', gives: 'Техно-магия: на стройках копится мана, заклинания изучаются за редкие ресурсы', opened: 'техно-магия', live: true },
    training: { name: 'Учебный центр', unlock: 8, capital: 100, text: 'Опыт и разряды рабочих на стройках', gives: 'Рабочие на стройках копят опыт за свои кубы и растут в разрядах; каждый куб рабочего — опыт центру', opened: 'опыт и разряды рабочих', live: true },
    weather: { name: 'Аварийная служба', unlock: 44, capital: 6000, text: 'Погода, поломки и восстановление', live: false },
  };
  Object.keys(PROJECTS).forEach(function (id) {
    const tuned = META_BALANCE.projects[id];
    PROJECTS[id].opens = tuned && tuned.opens ? tuned.opens.slice() : [];
    if (!tuned) return;
    PROJECTS[id].unlock = tuned.unlock;
    if (tuned.capital !== undefined) PROJECTS[id].capital = tuned.capital;
    PROJECTS[id].seals = tuned.seals || 0;
    PROJECTS[id].rewardSeals = tuned.rewardSeals || 0;
    // Rare resources of the price (the reactor): { residential: 5, … }.
    PROJECTS[id].rare = tuned.rare ? Object.assign({}, tuned.rare) : null;
  });

  function createState() {
    return {
      version: 2,
      techTreeVersion: 2,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      campaignLevel: 0,
      capital: 0,
      seals: 0,
      diplomas: 0,
      school: createSchoolState(),
      rare: { residential: 0, industrial: 0, highrise: 0, landmark: 0 },
      // Кулинарная книга центра персонала: dishes the canteens of every site can cook («Каша» is free).
      cookbook: { kasha: 1 },
      // Центр персонала: «Места в столовой» and «Короче обед» levels (balance.json → canteen.upgrades).
      personnel: { level: 0, seats: 0, meal: 0, sales: 0, dorm: 0, lounge: 0, light: 0 },
      completed: [],
      claimedChests: {},
      office: Object.keys(OFFICE).reduce(function (office, id) { office[id] = 0; return office; }, {}),
      tech: TECH_ORDER.reduce(function (tech, id) { tech[id] = TECH[id].initiallyOwned ? 1 : 0; return tech; }, {}),
      hq: {
        office: 0,
        tech: 0,
        exchange: 0,
        recruiting: 0,
        garage: 0,
        materials: 0,
        logistics: 0,
        contracts: 0,
        subcontract: 0,
        personnel: 0,
        clinic: 0,
        weather: 0,
        supply: 0,
        reactor: 0,
        training: 0,
      },
      plots: {
        office: 0,
        tech: 0,
        personnel: 0,
        exchange: 0,
        recruiting: 0,
        garage: 0,
        materials: 0,
        logistics: 0,
        contracts: 0,
        subcontract: 0,
        clinic: 0,
        weather: 0,
        supply: 0,
        reactor: 0,
        training: 0,
      },
      // «Снабжение»: booster levels (0 — not opened) and extra slots bought; reactor: spell levels.
      supply: { boosters: {}, slots: 0 },
      reactor: { spells: {} },
      // «Учебный центр»: its experience (a point for every cube a worker sets) and program levels.
      training: { xp: 0, upgrades: {} },
      cards: Object.keys(CARDS).reduce(function (cards, id) {
        cards[id] = { copies: 0, level: 0, experience: 0 };
        return cards;
      }, {}),
      cardPity: { epic: 0, legendary: 0 },
      cardsSeen: {},
      recruit: { stock: 0, nextAt: 0 },
      carryCoins: 0,
      // Crew presets: the crew last started per run mode («Как в прошлый раз» and the briefing's
      // prefill). The crew of a running site lives in its snapshot (sites.<key>.crew), locked.
      // HQ buildings are built without foremen, so they have no preset.
      equipped: [],
      contractEquipped: [],
      crewPresets: { exchange: [], school: [] },
      hqSite: null,
      citySeen: {},
      exchange: {
        capacity: 5,
        capacityLevel: 0,
        intervalLevel: 0,
        rewardLevel: 0,
        capitalLevel: 0,
        orders: [],
        nextOrderAt: Date.now(),
      },
      contract: {
        index: 0,
        cooldownUntil: 0,
      },
      // Construction sites (docs/gdd/16-ux-flow.md §1): the story order, an HQ building and a side
      // order (contract or exchange) each keep their own snapshot; `activeSite` is the one on screen.
      sites: { campaign: null, hq: null, side: null },
      activeSite: 'campaign',
      // The page went into the background at this time (null while it is on screen): the next claim
      // counts the absence from here, because every save moves lastSeenAt.
      hiddenAt: null,
      // levelInfo: «Об уровне» was opened once (its button keeps a dot till then).
      flags: { levelInfo: false },
      settings: { sound: true },
      // The playtest report (menu ☰ → «Отчёт плейтеста», game.js → playtestReport): active seconds of
      // the company (the page on screen), seconds at each tempo and the events at that time. The game
      // itself never reads it.
      journal: createJournal(),
    };
  }

  function createJournal() {
    return { since: Date.now(), active: 0, tempo: {}, events: [] };
  }

  const SITE_KEYS = ['campaign', 'hq', 'side'];

  function siteKey(runMode) {
    if (runMode === 'hq') return 'hq';
    if (runMode === 'contract' || runMode === 'exchange' || runMode === 'school') return 'side';
    return 'campaign';
  }

  function siteLevel(runMode, levelIndex, payload) {
    const MB = root.MicroBuilders;
    if (runMode === 'hq') return payload && MB.HQ_LEVELS[payload.projectId] || null;
    if (runMode === 'school') return payload && MB.schoolLevel(payload.bossId, payload.tier) || null;
    return MB.LEVELS[levelIndex] || null;
  }

  function siteName(runMode, levelIndex, payload) {
    if (runMode === 'hq') return payload && PROJECTS[payload.projectId] ? PROJECTS[payload.projectId].name : 'Штаб';
    const level = siteLevel(runMode, levelIndex, payload);
    return level ? level.name : '';
  }

  // Save format v1 kept up to three runs in session / suspendedSession / hqSession; v2 puts them into
  // named slots. Runs once (version check) and also rescues the orphan left by older bugs: the main
  // run sitting in suspendedSession while session is empty.
  function migrateSites(state) {
    const sites = { campaign: null, hq: null, side: null };
    function put(snap) {
      if (!snap || !snap.builtIds) return;
      const key = siteKey(snap.runMode);
      const level = siteLevel(snap.runMode, snap.levelIndex, snap.runPayload);
      if (!level) return;
      const total = level.blocks.length;
      const complete = snap.builtIds.length >= total;
      // Finished runs were paid when they finished: a finished side or HQ run has nothing left to show.
      if (complete && key !== 'campaign') return;
      const prev = sites[key];
      // Two story runs (the old «Заново» bug, which could turn a contract into a story run that is
      // ahead of the story): keep the one at the player's story level, else the one further along.
      if (prev) {
        const fits = function (run, done) {
          return run.levelIndex === state.campaignLevel || (done && run.levelIndex + 1 === state.campaignLevel);
        };
        const prevFits = fits(prev, prev.status === 'complete');
        const snapFits = fits(snap, complete);
        if (prevFits && !snapFits) return;
        if (prevFits === snapFits && prev.levelIndex >= snap.levelIndex) return;
      }
      sites[key] = Object.assign({}, snap, {
        key: key,
        status: complete ? 'complete' : 'play',
        name: siteName(snap.runMode, snap.levelIndex, snap.runPayload),
        total: total,
        built: snap.builtIds.length,
        coinsEarned: snap.coinsEarned || 0,
        // v1 had two crews: contracts had their own, every other run used the story one.
        crew: (snap.runMode === 'contract' ? state.contractEquipped || [] : state.equipped || []).slice(),
        foreman: { cubes: 0, floorStack: 0, bonusBuilders: 0 },
        awaySince: null,
        awayBank: 0,
        awayElapsed: 0,
        reward: null,
      });
    }
    put(state.session);
    put(state.suspendedSession);
    put(state.hqSession);
    state.sites = sites;
    const activeKey = state.session ? siteKey(state.session.runMode) : 'campaign';
    state.activeSite = sites[activeKey] ? activeKey : 'campaign';
    delete state.session;
    delete state.suspendedSession;
    delete state.hqSession;
    delete state.offlineReport;
    state.version = 2;
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return createState();
    const state = JSON.parse(raw);
    const fresh = createState();
    if (!state.school) state.school = fresh.school;
    if (!state.cookbook) state.cookbook = fresh.cookbook;
    if (!state.personnel) state.personnel = fresh.personnel;
    if (state.personnel.level === undefined) state.personnel.level = 0;
    if (state.personnel.sales === undefined) state.personnel.sales = 0;
    if (state.personnel.dorm === undefined) state.personnel.dorm = 0;
    if (state.personnel.lounge === undefined) state.personnel.lounge = 0;
    if (state.personnel.light === undefined) state.personnel.light = 0;
    if (state.diplomas === undefined) state.diplomas = 0;
    if (!state.supply) state.supply = fresh.supply;
    if (!state.reactor) state.reactor = fresh.reactor;
    if (!state.journal) state.journal = fresh.journal;
    if (!state.training) state.training = fresh.training;
    Object.keys(fresh.hq).forEach(function (id) { if (state.hq[id] === undefined) state.hq[id] = 0; });
    Object.keys(fresh.cards).forEach(function (id) {
      if (!state.cards[id]) state.cards[id] = fresh.cards[id];
    });
    Object.keys(fresh.office).forEach(function (id) {
      if (state.office[id] === undefined) state.office[id] = 0;
    });
    if (!state.tech) state.tech = {};
    if (state.techTreeVersion !== 2) {
      // Preserve every line previously unlocked by a bundled technology or the personnel HQ.
      const bundles = {
        heights: ['scaffold'], rates: ['floorPay'],
        machines: ['droneBuild', 'gather', 'droneSpeed'],
        loaders: ['loaderMass', 'bucket', 'patternHeight', 'vehicleHeight', 'vehicleReach', 'loaderSpeed', 'boomSpeed'],
        lifts: ['elevatorHeight', 'elevatorSpeed'],
        bonuses: ['triplePay', 'triplePower'], aviation: ['heliMass', 'heliWidth', 'heliHeight', 'heliSpeed'],
      };
      Object.keys(bundles).forEach(function (id) {
        if (state.tech[id] > 0) bundles[id].forEach(function (child) { state.tech[child] = 1; });
      });
      if (state.hq.personnel > 0) ['kitchen', 'smokeRare', 'smokeShort'].forEach(function (id) { state.tech[id] = 1; });
      state.techTreeVersion = 2;
    }
    if (state.tech.capitalChance > 0) {
      state.tech.capitalLines = 1;
      const refund = META_BALANCE.retiredResearchRefunds && META_BALANCE.retiredResearchRefunds.capitalChance || { capital: 0, seals: 0 };
      state.capital += refund.capital;
      state.seals = (state.seals || 0) + refund.seals;
    }
    TECH_ORDER.forEach(function (id) {
      if (state.tech[id] === undefined || TECH[id].initiallyOwned) state.tech[id] = fresh.tech[id];
    });
    Object.keys(state.tech).forEach(function (id) { if (!TECH[id]) delete state.tech[id]; });
    if (!state.plots) state.plots = {};
    Object.keys(fresh.plots).forEach(function (id) {
      if (state.plots[id] === undefined) state.plots[id] = state.hq[id] > 0 ? 1 : 0;
    });
    if (!state.contractEquipped) state.contractEquipped = [];
    state.crewPresets = Object.assign({}, fresh.crewPresets, state.crewPresets || {});
    if (!state.cardPity) state.cardPity = { epic: 0, legendary: 0 };
    if (!state.cardsSeen) state.cardsSeen = {};
    if (!state.recruit) state.recruit = { stock: 0, nextAt: 0 };
    if (!state.carryCoins) state.carryCoins = 0;
    if (state.hqSite === undefined) state.hqSite = null;
    if (!state.citySeen) state.citySeen = {};
    if (!state.version || state.version < 2) migrateSites(state);
    if (!state.sites) state.sites = fresh.sites;
    SITE_KEYS.forEach(function (key) {
      if (state.sites[key] === undefined) state.sites[key] = null;
      if (state.sites[key]) pruneSessionPurchases(state.sites[key].purchases);
    });
    if (SITE_KEYS.indexOf(state.activeSite) < 0) state.activeSite = 'campaign';
    if (state.hiddenAt === undefined) state.hiddenAt = null;
    // An older company far enough in the story has had «Об уровне» on screen all along: no dot.
    const flags = state.flags || {};
    state.flags = Object.assign({}, fresh.flags, flags);
    if (flags.levelInfo === undefined) state.flags.levelInfo = (state.campaignLevel || 0) >= 3;
    state.settings = Object.assign({}, fresh.settings, state.settings || {});
    lockSiteCrews(state);
    return state;
  }

  // Every site keeps the crew it started with (older saves: the preset of its mode). The same card
  // may work on several sites at once; HQ buildings have no foremen.
  function lockSiteCrews(state) {
    SITE_KEYS.forEach(function (key) {
      const snap = state.sites[key];
      if (!snap) return;
      snap.crew = siteCrew(state, snap.runMode, snap.crew || crewOf(state, snap.runMode));
    });
  }

  function save(state) {
    state.lastSeenAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clearSave() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Price of the next level (level → level + 1).
  function officeCost(kind, level) {
    const prices = OFFICE[kind].prices;
    if (prices && prices.length > 0) return prices[Math.min(level, prices.length - 1)];
    return Math.round(10 * Math.pow(2, level));
  }

  // Value of a foreman's effect at a level (formula2 — the second number of two-part effects).
  function cardValue(id, level, second) {
    const spec = CARDS[id];
    return evalFormula(second ? spec.formula2 : spec.formula, level);
  }

  // Expertise has one baked XP ladder for every rarity. Star level only changes XP earned.
  function expertiseLevel(card) {
    const rows = FOREMEN.expertise.levels;
    const experience = card.experience || 0;
    let level = 0;
    while (level < rows.length && experience >= rows[level].experience) level++;
    return level;
  }

  function expertiseProgress(card) {
    const level = expertiseLevel(card);
    const rows = FOREMEN.expertise.levels;
    const previous = level ? rows[level - 1].experience : 0;
    const next = rows[level];
    return { level: level, max: rows.length, experience: card.experience || 0,
      current: next ? (card.experience || 0) - previous : 0,
      required: next ? next.experience - previous : 0,
      fraction: next ? Math.min(1, ((card.experience || 0) - previous) / (next.experience - previous)) : 1 };
  }

  function cardExperienceMultiplier(level) {
    if (level <= 0) return 0;
    const multipliers = FOREMEN.expertise.starMultipliers;
    return multipliers[Math.min(Math.floor(level), multipliers.length) - 1];
  }

  // Every three expertise levels finish one senior worker; the next worker grows junior → senior.
  function expertiseWorkers(level) {
    const ranks = [];
    for (let i = 0; i < Math.floor(level / 3); i++) ranks.push(1.2);
    if (level % 3) ranks.push(level % 3 === 1 ? 0.8 : 1);
    return ranks;
  }

  function cardPassive(id, level, second) {
    const passive = CARDS[id].passive;
    if (passive.effect === 'startBuilders') return expertiseWorkers(level).length;
    return second ? (passive.formula2 ? evalFormula(passive.formula2, level) : 0) : evalFormula(passive.formula, level);
  }

  // Interpolate actual coins, not reference minutes: skipCoins is a staircase of purchase prices.
  function passiveStartCoins(state, id, level, extraMinutes) {
    if (level <= 0) return 0;
    const range = CARDS[id].passive.startCoinMinutes;
    const base = OFFICE.startCoins.skipStep * state.office.startCoins + (extraMinutes || 0);
    const first = skipCoins(base + range[0]) - skipCoins(base);
    const last = skipCoins(base + range[1]) - skipCoins(base);
    return Math.round(first + (last - first) * (level - 1) / (FOREMEN.expertise.maxLevel - 1));
  }

  function gainForemanExperience(state, campaign, world, blocks, offline) {
    const tuning = FOREMEN.expertise;
    if (!schoolHasUpgrade(state, 'expertise') || !tuning.levels.length || !modeHasCrew(campaign.runMode) || (offline && !tuning.offline)) return [];
    let base = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block.built || block.experiencePaid) continue;
      block.experiencePaid = true;
      base += Math.cbrt(root.MicroBuilders.MATERIAL[block.materialId].weight);
    }
    if (!base) return [];
    const changed = [];
    const maximum = tuning.levels[tuning.levels.length - 1].experience;
    const crew = campaign.crew || [];
    // Read levels before this batch, so a mentor's own level-up cannot reorder XP within the batch.
    const mentorLevels = crew.map(function (id) { return state.cards[id] ? expertiseLevel(state.cards[id]) : 0; });
    crew.forEach(function (id, index) {
      if (crew.indexOf(id) !== index || !CARDS[id]) return;
      const card = state.cards[id];
      if (!card || card.level <= 0) return;
      const before = expertiseLevel(card);
      const mentorship = mentoringMultiplier(state, mentorLevels[0] || 0, mentorLevels[index] || 0, index);
      const practice = campaign.runMode === 'school' ? 1 + schoolUpgradeLevel(state, 'practice') * SCHOOL.practiceXPPerLevel : 1;
      card.experience = Math.min(maximum, (card.experience || 0) + base * cardExperienceMultiplier(card.level) * mentorship * practice);
      const after = expertiseLevel(card);
      if (after > before) changed.push({ id: id, before: before, level: after });
    });
    if (changed.length) applyCardStats(state, campaign);
    return changed;
  }

  function cardMaxLevel(id) {
    return FOREMEN.maxLevel[CARDS[id].rarity];
  }

  function cardUpgradeCost(card, id) {
    return FOREMEN.upgradeCapital[CARDS[id].rarity] * card.level * card.level;
  }

  function cardCopiesRequired(card) {
    return card.level + 1;
  }

  // Card availability follows unique school victories, never campaign progress.
  function cardInPool(state, id) {
    return schoolTotalWins(state) >= CARDS[id].unlockWins;
  }

  function foremanSlots(state) {
    return officeValue('foremanSlots', state.office.foremanSlots);
  }

  function foremanSlotsMax() {
    return officeValue('foremanSlots', OFFICE.foremanSlots.max);
  }

  // The crew preset of a run mode: what the last run of that mode started with (the briefing
  // prefills it). Story orders use `equipped`, contracts `contractEquipped` (older saves and the
  // balance tools set these two directly), exchange orders `crewPresets.exchange`. HQ buildings are
  // built without foremen: always an empty crew.
  function crewOf(state, mode) {
    if (mode === 'contract') return state.contractEquipped;
    if (mode === 'hq') return [];
    if (mode === 'exchange' || mode === 'school') {
      if (!state.crewPresets) state.crewPresets = {};
      if (!state.crewPresets[mode]) state.crewPresets[mode] = [];
      return state.crewPresets[mode];
    }
    return state.equipped;
  }

  // Whether a run of this mode takes foremen at all.
  function modeHasCrew(mode) {
    return mode !== 'hq';
  }

  // The crew a run of `mode` really gets.
  function siteCrew(state, mode, crew) {
    return modeHasCrew(mode) ? cleanCrew(state, crew) : [];
  }

  // Owned cards only, each once, no more than the slots.
  function cleanCrew(state, crew) {
    const out = [];
    const slots = foremanSlots(state);
    (crew || []).forEach(function (id) {
      if (out.length >= slots || out.indexOf(id) >= 0) return;
      if (!CARDS[id] || !state.cards[id] || state.cards[id].level <= 0) return;
      out.push(id);
    });
    return out;
  }

  // The briefing confirmed: this crew is the mode's preset from now on.
  function saveCrewPreset(state, mode, crew) {
    if (!modeHasCrew(mode)) return;
    const preset = crewOf(state, mode);
    preset.length = 0;
    cleanCrew(state, crew).forEach(function (id) { preset.push(id); });
    save(state);
  }

  // Where cards work now: { cardId: [siteKey…] } over running sites. A card may work on several
  // sites at once; the briefing only hints at it («Ещё на основной стройке»). `exceptKey` — the slot
  // a new run is about to take over.
  function cardSites(state, exceptKey) {
    const where = {};
    SITE_KEYS.forEach(function (key) {
      const snap = site(state, key);
      if (key === exceptKey || !snap || snap.status !== 'play') return;
      (snap.crew || []).forEach(function (id) { (where[id] = where[id] || []).push(key); });
    });
    return where;
  }

  // Running sites that take foremen, with their crews (the «Сейчас на объектах» block).
  function activeRuns(state) {
    return SITE_KEYS.map(function (key) { return site(state, key); }).filter(function (snap) {
      return !!snap && snap.status === 'play' && modeHasCrew(snap.runMode);
    }).map(function (snap) {
      return { key: snap.key, runMode: snap.runMode, levelIndex: snap.levelIndex, runPayload: snap.runPayload, name: snap.name, crew: (snap.crew || []).slice() };
    });
  }

  // Main abilities come from the locked crew; expertise passives come from the hired collection.
  // Plain effects become session multipliers or additions; the rest are `triggers` — counters and
  // conditions the construction logic runs (logic.js → foremen).
  const MULTIPLIERS = { place: 'placeSpeed', carry: 'carryScale', move: 'movement', climb: 'climb', scaffold: 'scaffold',
    income: 'coinMultiplier', pickup: 'pickupSpeed', height: 'heightPenalty', hunger: 'hunger', smoke: 'smoke', smokeShort: 'smokeShort', orderCapital: 'orderCapitalMultiplier' };
  const SUMS = { skip: 'skipMinutes', startBuilders: 'startBuilders', plan: 'plan', capChance: 'capitalChance', findValue: 'findValueBonus' };

  // ---------- the order's character (docs/gdd/05: the foremen's «Золотой век») ----------
  // What a story level stands out by among its neighbours (median of three levels before and after):
  // floors ×1.2 and 3 more «Высотки» (5 floors among 4 is no tower), a cube's mass ×1.3 «Тяжёлые
  // кубы», the way from a cube to its quarry ×1.2 «Далёкие карьеры», cubes ×1.5 «Огромные здания»,
  // the reference player's own build (meta.planBuildMinutes) ×1.5 and 5 minutes more «Долгая стройка»,
  // ×0.6 and 5 minutes less «Короткий заказ»; windows and doors from 40 and a tenth of the cubes «Окна
  // и двери»; a story forecast bad in three weather phases of four «Непогода» (two of four is every
  // other late order). At most two, the strongest first: [{ role, roles, key, value, usual }] — `role`
  // names the character, `roles` are the foremen's roles in their element there (nicheValue, nicheRoles).
  // Rule: character, shape key, ratio to the usual (below 1 — at most that share), least difference.
  const NICHE_RULES = [
    ['Высотки', 'floors', 1.2, 3], ['Тяжёлые кубы', 'kg', 1.3, 0], ['Далёкие карьеры', 'way', 1.2, 0], ['Огромные здания', 'cubes', 1.5, 0],
    ['Долгая стройка', 'build', 1.5, 5], ['Короткий заказ', 'build', 0.6, 5],
  ];
  // Characters where machines carry the work once the reference player has drones or loaders (meta.plan).
  const NICHE_MACHINES = ['Тяжёлые кубы', 'Огромные здания', 'Далёкие карьеры'];
  const levelShapes = [];
  const nicheCache = {};
  let machinesFrom = null;

  // The foremen's roles in their element on a character: its own name; on a long build «Разгон» (more
  // lunches and cubes for the accelerators) and from the night on «Ночь»; on a short one «Старт»; and
  // «Техника» with big, heavy or far cubes once machines are in the reference plan.
  function nicheRoles(character, levelIndex) {
    if (character === 'Долгая стройка') {
      return levelIndex + 1 >= ((root.MicroBuildersBalance.tuning || {}).intro || {}).nightFromLevel ? ['Разгон', 'Ночь'] : ['Разгон'];
    }
    if (character === 'Короткий заказ') return ['Старт'];
    if (NICHE_MACHINES.indexOf(character) >= 0 && machinesBy(levelIndex)) return [character, 'Техника'];
    return [character];
  }

  function machinesBy(levelIndex) {
    if (machinesFrom === null) {
      const plan = META_BALANCE.plan || {};
      machinesFrom = Infinity;
      Object.keys(plan).forEach(function (key) {
        if (plan[key].some(function (item) { return item === 'tech:droneBuild' || item === 'tech:loaders'; })) machinesFrom = Math.min(machinesFrom, Number(key));
      });
    }
    return levelIndex >= machinesFrom;
  }

  function levelShape(index) {
    if (levelShapes[index]) return levelShapes[index];
    const MB = root.MicroBuilders;
    const level = MB.LEVELS[index];
    const rows = {};
    let kg = 0;
    let way = 0;
    let openings = 0;
    level.blocks.forEach(function (block) {
      rows[block.y] = true;
      const material = MB.MATERIAL[block.materialId];
      if (material) kg += material.cell * Math.pow(material.grid || 1, 3);
      const mine = level.minesByMaterial[block.materialId] || level.mines[0];
      if (mine) way += Math.hypot(block.x - mine.x, block.z - mine.z);
      if (block.feature === 'door' || block.feature === 'window') openings += 1;
    });
    const n = Math.max(1, level.blocks.length);
    levelShapes[index] = { floors: Object.keys(rows).length, cubes: level.blocks.length, kg: kg / n, way: way / n, openings: openings,
      build: (META_BALANCE.planBuildMinutes || {})[index + 1] || 0 };
    return levelShapes[index];
  }

  function median(list) {
    const sorted = list.slice().sort(function (a, b) { return a - b; });
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Story orders, contracts and exchange orders build story levels; HQ buildings and school trials have
  // no character. The weather counts for story orders only (the others are clear, sim.js → forecast).
  function orderNiches(mode, levelIndex) {
    const levels = root.MicroBuilders.LEVELS;
    if ((mode !== 'campaign' && mode !== 'contract' && mode !== 'exchange') || !levels[levelIndex]) return [];
    const key = (mode === 'campaign' ? 'c' : 'o') + levelIndex;
    if (nicheCache[key]) return nicheCache[key];
    const me = levelShape(levelIndex);
    const near = [];
    for (let i = Math.max(0, levelIndex - 3); i <= Math.min(levels.length - 1, levelIndex + 3); i++) {
      if (i !== levelIndex) near.push(levelShape(i));
    }
    const found = [];
    NICHE_RULES.forEach(function (rule) {
      // The build's length is the story order's: a contract or an exchange order is built by the company of its day.
      if (rule[1] === 'build' && mode !== 'campaign') return;
      const value = me[rule[1]];
      const around = near.map(function (shape) { return shape[rule[1]]; }).filter(function (v) { return v > 0; });
      const usual = around.length ? median(around) : 0;
      if (!(usual > 0) || !(value > 0)) return;
      const more = rule[2] >= 1;
      if (more ? value >= usual * rule[2] && value - usual >= rule[3] : value <= usual * rule[2] && usual - value >= rule[3]) {
        found.push({ role: rule[0], key: rule[1], value: value, usual: usual, score: more ? value / usual / rule[2] : usual * rule[2] / value });
      }
    });
    if (me.openings >= 40 && me.openings >= me.cubes * 0.1) {
      found.push({ role: 'Окна и двери', key: 'openings', value: me.openings, usual: 0, score: me.openings / me.cubes * 10 });
    }
    const sim = root.MicroBuildersSim;
    if (mode === 'campaign' && sim && sim.forecast) {
      const bad = sim.forecast(levelIndex).filter(Boolean).length;
      if (bad >= 3) found.push({ role: 'Непогода', key: 'weather', value: bad, usual: 0, score: bad / 3 });
    }
    found.sort(function (a, b) { return b.score - a.score; });
    nicheCache[key] = found.slice(0, 2).map(function (niche) { return Object.assign(niche, { roles: nicheRoles(niche.role, levelIndex) }); });
    return nicheCache[key];
  }

  // The foremen's roles in their element on this order, each once.
  function orderRoles(mode, levelIndex) {
    const roles = [];
    orderNiches(mode, levelIndex).forEach(function (niche) {
      niche.roles.forEach(function (role) { if (roles.indexOf(role) < 0) roles.push(role); });
    });
    return roles;
  }

  // A foreman in his element works FOREMEN.nicheBonus stronger: a bonus share grows, a penalty
  // shrinks, an interval («every N cubes») shortens. His second value stays.
  function nicheValue(spec, value) {
    const k = 1 + (FOREMEN.nicheBonus || 0);
    if (spec.effect === 'crane') return value / k;
    if (spec.format === 'less%') return Math.max(0.05, 1 - (1 - value) * k);
    if (spec.format === 'plus%' || spec.format === 'mult') return 1 + (value - 1) * k;
    return value * k;
  }

  function applyForemanEffect(result, effect, value, second, spec, id) {
    if (MULTIPLIERS[effect]) result[MULTIPLIERS[effect]] *= value;
    else if (SUMS[effect]) result[SUMS[effect]] += value;
    else if (effect === 'nightRelief') result.nightRelief = Math.max(result.nightRelief, value);
    else if (result.triggers[effect] && (effect === 'lucky' || effect === 'overload')) {
      // Two cards with the same chance or penalty stack: chances add up, penalties multiply.
      if (effect === 'lucky') result.triggers.lucky.value += value;
      else result.triggers.overload.value *= value;
    } else {
      result.triggers[effect] = { value: value, second: second || 0, factor: spec.factor || 1, card: id };
    }
  }

  // `crew` (card ids) — the crew of one run; without it, the preset of `mode` (balance tools). `roles` —
  // the order's character (orderRoles): a card of that role works in his element (nicheValue).
  function equippedBonuses(state, mode, crew, roles) {
    const result = {
      placeSpeed: 1,
      carryScale: 1,
      movement: 1,
      climb: 1,
      skipMinutes: 0,
      scaffold: 1,
      coinMultiplier: 1,
      pickupSpeed: 1,
      heightPenalty: 1,
      hunger: 1,
      smoke: 1,
      smokeShort: 1,
      nightRelief: 0,
      startBuilders: 0,
      workerRanks: [],
      startCoinGrant: 0,
      plan: 0,
      capitalChance: 0,
      findValueBonus: 0,
      orderCapitalMultiplier: 1,
      triggers: {},
    };
    const list = Array.isArray(crew) ? crew : crewOf(state, mode);
    for (let i = 0; i < list.length; i++) {
      const id = list[i];
      if (!CARDS[id] || !state.cards[id]) continue;
      const level = state.cards[id].level;
      if (level <= 0) continue;
      const spec = CARDS[id];
      const second = spec.formula2 ? cardValue(id, level, true) : 0;
      const inElement = !!roles && roles.indexOf(spec.role) >= 0;
      applyForemanEffect(result, spec.effect, inElement ? nicheValue(spec, cardValue(id, level)) : cardValue(id, level), second, spec, id);
      if (spec.effect === 'height') result.climb *= second;
      if (spec.effect === 'carry' && second) result.plan += second;
    }
    // Expertise passives belong to the whole hired collection, including HQ construction.
    Object.keys(CARDS).forEach(function (id) {
      if (!state.cards[id] || state.cards[id].level <= 0) return;
      const spec = CARDS[id];
      const expertise = expertiseLevel(state.cards[id]);
      if (!spec.passive || expertise <= 0) return;
      if (spec.passive.startCoinMinutes) result.startCoinGrant += passiveStartCoins(state, id, expertise, result.skipMinutes);
      else applyForemanEffect(result, spec.passive.effect, cardPassive(id, expertise), cardPassive(id, expertise, true), spec, id);
      if (spec.passive.effect === 'startBuilders') result.workerRanks = result.workerRanks.concat(expertiseWorkers(expertise));
    });
    return result;
  }

  // Everything the meta adds to a session: office lines, HQ buildings and equipped foremen.
  // The campaign simulator (metasim.js) reads the same numbers. `crew` — the run's own crew
  // (campaign.crew); without it the preset of `mode`.
  function metaStats(state, mode, crew, roles) {
    const card = equippedBonuses(state, mode, crew, roles);
    const office = state.office;
    const stats = {
      builders: 1 + officeValue('crew', office.crew) + card.startBuilders,
      workerRanks: card.workerRanks,
      vehicles: state.hq.garage > 0 && state.tech.loaders > 0 ? 1 : 0,
      // «Аванс заказчика» and «Снабженец» both skip the first minutes of the reference session.
      startCoins: Math.round(skipCoins(OFFICE.startCoins.skipStep * office.startCoins + card.skipMinutes)) + card.startCoinGrant,
      placeSpeed: officeValue('speed', office.speed) * card.placeSpeed,
      pickupSpeed: officeValue('pickSkill', office.pickSkill) * card.pickupSpeed,
      carryScale: officeValue('carry', office.carry) * card.carryScale,
      carry: 0,
      movement: card.movement,
      climb: card.climb,
      scaffold: card.scaffold,
      plan: card.plan + officeValue('plan', office.plan),
      nightRelief: card.nightRelief,
      heightPenalty: card.heightPenalty,
      hunger: card.hunger,
      smoke: card.smoke,
      smokeShort: card.smokeShort,
      coinMultiplier: officeValue('income', office.income) * card.coinMultiplier,
      offline: officeValue('offline', office.offline),
      capitalChance: officeValue('capitalChance', office.capitalChance) + card.capitalChance,
      capitalValue: officeValue('capitalValue', office.capitalValue) + card.findValueBonus,
      orderCapitalMultiplier: card.orderCapitalMultiplier,
      triggers: card.triggers,
    };
    applyOfficeHooks(state, stats);
    stats.office = officeEffects(state);
    return stats;
  }

  // `crew` — the crew picked in the briefing (locked until the run ends); without it the mode's
  // preset (balance tools, dev jumps). HQ buildings get no crew.
  function configureNewCampaign(state, campaign, runMode, levelIndex, payload, crew) {
    campaign.crew = siteCrew(state, runMode, Array.isArray(crew) ? crew : crewOf(state, runMode));
    const stats = metaStats(state, runMode, campaign.crew, orderRoles(runMode, levelIndex));
    campaign.levelIndex = levelIndex;
    campaign.runMode = runMode;
    campaign.runPayload = payload;
    // Story level number the needs and the night open by (logic.js → needOpen): a story order's own,
    // for HQ buildings, contracts and the exchange the one the player has reached.
    campaign.storyLevel = runMode === 'campaign' ? levelIndex + 1 : (state.campaignLevel || 0) + 1;
    campaign.metaBuilders = stats.builders;
    // Tokens of this construction (balance.tokens.start): the graph's passes and the camp buildings' starts.
    campaign.tokens = ((root.MicroBuildersBalance.tokens || {}).start || 0) + stats.office.tokens;
    campaign.gates = {};
    campaign.advanced = {};
    // Builders the meta gives at the start; anything above it was recruited during the run.
    campaign.baseMetaBuilders = stats.builders;
    campaign.metaWorkerRanks = stats.workerRanks.slice();
    campaign.resumeWorkerXp = [];
    campaign.builderCount = campaign.metaBuilders;
    campaign.metaVehicles = stats.vehicles;
    campaign.vehicleCount = campaign.metaVehicles;
    // «Казначей» carries part of the last order's coins into this one.
    campaign.coins = stats.startCoins + (state.carryCoins || 0);
    state.carryCoins = 0;
    campaign.coinsEarned = 0;
    campaign.coinRewardRemainder = 0;
    applyCardStats(state, campaign);
    campaign.bonusDrones = campaign.foremen.startDrones ? Math.round(campaign.foremen.startDrones.value) : 0;
    campaign.resumeBuiltIds = [];
  }

  // Live meta numbers: applied at the start of a run, on restore and after an office purchase or a
  // card upgrade. The run's own crew (campaign.crew) counts, never the preset, so a purchase in the
  // middle of a run re-applies the same crew with the new numbers.
  function applyCardStats(state, campaign) {
    const stats = metaStats(state, campaign.runMode, campaign.crew, orderRoles(campaign.runMode, campaign.levelIndex));
    campaign.metaPlaceSpeed = stats.placeSpeed;
    campaign.metaPickupSpeed = stats.pickupSpeed;
    campaign.metaHeightPenalty = stats.heightPenalty;
    campaign.metaClimb = stats.climb;
    campaign.metaHunger = stats.hunger;
    campaign.metaCarryScale = stats.carryScale;
    campaign.metaCarry = stats.carry;
    campaign.metaMovement = stats.movement;
    campaign.metaScaffold = stats.scaffold;
    campaign.metaPlan = stats.plan;
    campaign.metaNightRelief = stats.nightRelief;
    campaign.metaCoinMultiplier = stats.coinMultiplier;
    campaign.metaCapitalChance = stats.capitalChance;
    campaign.metaCapitalValue = stats.capitalValue;
    campaign.metaSmoke = stats.smoke;
    campaign.metaSmokeShort = stats.smokeShort;
    // The office's own effects (officeEffects): fatigue, weather, lightning, discount, the sales office,
    // windows, the camp, the chef and the kitchen.
    campaign.office = stats.office;
    // Techno-magic: the spells learned in the HQ reactor (mana comes from the site's reactor, logic.js).
    campaign.spellLevels = Object.assign({}, state.reactor ? state.reactor.spells : {});
    campaign.foremen = stats.triggers;
    // «Механик» needs drones; «Подрядчик» gifts levels of upgrades that are already open.
    if (!sessionLineOpen(state, 'engineers')) {
      delete campaign.foremen.machines;
      delete campaign.foremen.startDrones;
    }
    campaign.foremanKinds = Object.keys(root.MicroBuildersBalance.session).filter(function (kind) {
      return sessionLineOpen(state, kind);
    });
    campaign.kitchenUnlocked = sessionLineOpen(state, 'kitchen');
    // «Продвинутые технологии» researched in the tech center: their key nodes can be bought on the site.
    campaign.advancedOpen = ADVANCED_TECHS.filter(function (id) { return state.tech[id] > 0; });
    // «Учебный центр»: worker experience and the rank ladder (logic.js → gainWorkerXp).
    campaign.training = trainingStats(state);
    // The canteen stands on every site but HQ buildings once the personnel centre works.
    campaign.canteenOpen = state.hq.personnel > 0 && campaign.runMode !== 'hq';
    campaign.canteenDishes = DISHES.filter(function (dish) { return dishOwned(state, dish.id); }).map(function (dish) { return dish.id; });
    campaign.discoveryMultiplier = state.kitchenMultiplier || 1;
    campaign.canteenSeatBonus = state.personnel.seats || 0;
    campaign.canteenMaxLevel = 1 + (state.personnel.level || 0);
    campaign.canteenMealSeconds = canteenMealSeconds(state);
    // The sales office stands on every site but HQ buildings once the personnel centre works; the
    // site's «Офис продаж» builds it, meta «Уровни офиса продаж» lets it go higher.
    campaign.salesOpen = state.hq.personnel > 0 && campaign.runMode !== 'hq';
    campaign.salesMaxLevel = 1 + (state.personnel.sales || 0);
    // Dorm, lounge and lighting masts: the same, «Бытовки» / «Зона отдыха» / «Освещение» on the
    // site, meta levels above 1.
    campaign.dormOpen = campaign.salesOpen;
    campaign.dormMaxLevel = 1 + (state.personnel.dorm || 0);
    campaign.loungeOpen = campaign.salesOpen;
    campaign.loungeMaxLevel = 1 + (state.personnel.lounge || 0);
    campaign.lightOpen = campaign.salesOpen;
    campaign.lightMaxLevel = 1 + (state.personnel.light || 0);
    // The reactor stands on every site but HQ buildings once the HQ reactor is built («Реактор» on the site).
    campaign.reactorOpen = state.hq.reactor > 0 && campaign.runMode !== 'hq';
    campaign.siteNightRelief = 0;
    campaign.environmentWorkMultiplier = 1;
    campaign.environmentMoveMultiplier = 1;
    campaign.environmentWalkMultiplier = 1;
    campaign.environmentDeckMultiplier = 1;
    campaign.environmentFloorStep = 0;
    campaign.environmentCarryMultiplier = 1;
    campaign.environmentLightning = 0;
    campaign.environmentHungerRate = 1;
    campaign.environmentSmokeRate = 1;
    campaign.environmentFatigueRate = 1;
    const builders = window.MicroBuildersBalance.tuning.builders;
    campaign.mealInterval = 240;
    campaign.mealAwaySeconds = builders.mealSeconds;
    campaign.mealKitchenSeconds = builders.mealKitchenSeconds;
    campaign.smokeInterval = 120;
    campaign.smokeSeconds = builders.smokeSeconds;
  }

  // ---------- construction sites ----------
  // A site snapshot: what restoreCampaign + MB.startLevel + applySiteRuntime need to rebuild the run,
  // plus what the HQ shows without loading it (name, built / total). `status` is 'play' or
  // 'complete' (rewards already paid, `reward` keeps the summary for the completion window).
  // `awaySince` — when the player stopped looking at this site (null while it is live on screen);
  // `awayBank` — seconds of earlier absences too short to catch up yet (they add to the next one);
  // `awayElapsed` — seconds this run was built without the player (part of its completion time);
  // `stats` — the run's construction counters (the «Подробнее» list of the completion window).
  function site(state, key) {
    return state.sites && state.sites[key] || null;
  }

  // The site the game shows: the saved active slot, else the first one that exists.
  function activeSite(state) {
    if (site(state, state.activeSite)) return state.activeSite;
    for (let i = 0; i < SITE_KEYS.length; i++) {
      if (site(state, SITE_KEYS[i])) return SITE_KEYS[i];
    }
    return 'campaign';
  }

  function setActiveSite(state, key) {
    state.activeSite = key;
    save(state);
  }

  function clearSite(state, key) {
    state.sites[key] = null;
    // The main run takes over when there is one (activeSite() looks up the slots in that order).
    if (state.activeSite === key) state.activeSite = activeSite(state);
    save(state);
  }

  function saveSite(state, key, campaign, world, extra) {
    const prev = site(state, key);
    const options = extra || {};
    const builtIds = [];
    for (let i = 0; i < world.blocks.length; i++) {
      if (world.blocks[i].built) builtIds.push(world.blocks[i].id);
    }
    const base = campaign.baseMetaBuilders !== undefined ? campaign.baseMetaBuilders : campaign.metaBuilders;
    const status = options.status || (campaign.status === 'complete' || world.completed ? 'complete' : 'play');
    const snap = {
      key: key,
      runMode: campaign.runMode,
      runPayload: campaign.runPayload,
      levelIndex: campaign.levelIndex,
      status: status,
      name: siteName(campaign.runMode, campaign.levelIndex, campaign.runPayload),
      total: world.blocks.length,
      built: builtIds.length,
      coins: campaign.coins,
      coinsEarned: campaign.coinsEarned || 0,
      coinRewardRemainder: campaign.coinRewardRemainder || 0,
      builderCount: campaign.builderCount,
      startMetaBuilders: base,
      workerRanks: (campaign.metaWorkerRanks || []).slice(),
      // Experience of the workers in their hiring order («Учебный центр»).
      workerXp: root.MicroBuilders.workerXpList(world),
      vehicleCount: campaign.vehicleCount,
      purchases: Object.assign({}, campaign.purchases),
      tokens: campaign.tokens || 0,
      gates: Object.assign({}, campaign.gates),
      advanced: Object.assign({}, campaign.advanced),
      totalElapsed: campaign.totalElapsed,
      levelElapsed: campaign.levelElapsed,
      builtIds: builtIds,
      crew: (campaign.crew || crewOf(state, campaign.runMode)).slice(),
      foreman: {
        cubes: world.foremanCubes || 0,
        floorStack: world.floorStack || 0,
        bonusBuilders: Math.max(0, campaign.metaBuilders - base),
      },
      stats: Object.assign({}, world.stats),
      timeLedger: copyLedger(world.timeLedger),
      camp: root.MicroBuilders.campState(world),
      awayElapsed: campaign.awayElapsed || 0,
      boosters: (campaign.boosters || []).slice(),
      boosterRare: campaign.boosterRare || 0,
      // The player's purchases in their order (game.js → «Как в прошлый раз»).
      buyLog: (campaign.buyLog || []).slice(),
      mana: campaign.mana || 0,
      spellUses: Object.assign({}, campaign.spellUses || {}),
      savedAt: Date.now(),
      awaySince: options.awaySince !== undefined ? options.awaySince : (prev ? prev.awaySince : null),
      awayBank: options.awayBank !== undefined ? options.awayBank : (prev ? prev.awayBank || 0 : 0),
      reward: options.reward !== undefined ? options.reward : (prev && status === 'complete' ? prev.reward : null),
    };
    state.sites[key] = snap;
    save(state);
    return snap;
  }

  // Where the crew's time went, by state and sub-state (logic.js → world.timeLedger), to 0,1 s: the
  // line «Куда ушло время бригады» of the finish window counts the whole site, across reloads too.
  function copyLedger(ledger) {
    const out = {};
    Object.keys(ledger || {}).forEach(function (name) {
      const subs = out[name] = {};
      Object.keys(ledger[name]).forEach(function (sub) { subs[sub] = Math.round(ledger[name][sub] * 10) / 10; });
    });
    return out;
  }

  // Old name: snapshot the run into its own slot.
  function snapshotSession(state, campaign, world) {
    return saveSite(state, siteKey(campaign.runMode), campaign, world);
  }

  // Meta side of a restore (before MB.startLevel). Returns seconds since the snapshot was written.
  // Old site snapshots may contain upgrades removed from the current balance.
  // A site saved before a pass was added keeps its lines open: a pass with a level bought behind it
  // counts as passed.
  function passBoughtBlocks(gates, purchases) {
    const balance = root.MicroBuildersBalance;
    const children = {};
    balance.upgradeTree.forEach(function (edge) { if (edge[1]) (children[edge[1]] = children[edge[1]] || []).push(edge[0]); });
    function bought(kind) {
      return (purchases[kind] || 0) > 0 || (children[kind] || []).some(bought);
    }
    Object.keys(balance.gates || {}).forEach(function (id) { if (!gates[id] && bought(id)) gates[id] = 1; });
    return gates;
  }

  function pruneSessionPurchases(purchases) {
    if (purchases && purchases.capitalChance !== undefined) {
      purchases.cubeCapital = Math.min(root.MicroBuildersBalance.session.cubeCapital.max,
        (purchases.cubeCapital || 0) + (purchases.capitalChance || 0));
      delete purchases.capitalChance;
    }
    Object.keys(purchases || {}).forEach(function (kind) {
      if (!root.MicroBuildersBalance.session[kind]) delete purchases[kind];
    });
  }

  function restoreCampaign(state, campaign, snap) {
    const session = snap || site(state, activeSite(state));
    // The crew is the site's own, locked at its start (older snapshots: the preset of the mode).
    campaign.crew = siteCrew(state, session.runMode, session.crew || crewOf(state, session.runMode));
    const stats = metaStats(state, session.runMode, campaign.crew, orderRoles(session.runMode, session.levelIndex));
    campaign.levelIndex = session.levelIndex;
    campaign.runMode = session.runMode;
    campaign.runPayload = session.runPayload;
    campaign.coins = session.coins;
    campaign.coinsEarned = session.coinsEarned || 0;
    campaign.coinRewardRemainder = session.coinRewardRemainder || 0;
    campaign.builderCount = session.builderCount;
    campaign.vehicleCount = session.vehicleCount;
    campaign.purchases = Object.assign(campaign.purchases, session.purchases);
    // A site saved before the tokens keeps its graph open: its passes count as passed.
    campaign.tokens = session.tokens === undefined ? 0 : session.tokens;
    campaign.advanced = Object.assign({}, session.advanced);
    campaign.gates = session.gates ? passBoughtBlocks(Object.assign({}, session.gates), campaign.purchases) : Object.keys(root.MicroBuildersBalance.gates || {}).reduce(function (all, id) { all[id] = 1; return all; }, {});
    pruneSessionPurchases(campaign.purchases);
    campaign.baseMetaBuilders = session.startMetaBuilders === undefined ? stats.builders : session.startMetaBuilders;
    campaign.metaWorkerRanks = (session.workerRanks || []).slice();
    campaign.resumeWorkerXp = (session.workerXp || []).slice();
    // «Вербовщик» recruits stay until the order is done.
    campaign.metaBuilders = campaign.baseMetaBuilders + (session.foreman ? session.foreman.bonusBuilders || 0 : 0);
    campaign.metaVehicles = stats.vehicles;
    campaign.totalElapsed = session.totalElapsed;
    campaign.levelElapsed = session.levelElapsed;
    campaign.awayElapsed = session.awayElapsed || 0;
    campaign.boosters = (session.boosters || []).slice();
    campaign.boosterRare = session.boosterRare || 0;
    campaign.buyLog = (session.buyLog || []).slice();
    campaign.mana = session.mana || 0;
    campaign.spellUses = Object.assign({}, session.spellUses || {});
    applyCardStats(state, campaign);
    campaign.bonusDrones = campaign.foremen.startDrones ? Math.round(campaign.foremen.startDrones.value) : 0;
    campaign.resumeBuiltIds = session.builtIds.slice();
    return (Date.now() - session.savedAt) / 1000;
  }

  // Run state that MB.startLevel resets (call right after it): clocks, foreman counters and construction stats.
  function applySiteRuntime(campaign, world, snap) {
    campaign.levelElapsed = snap.levelElapsed;
    campaign.totalElapsed = snap.totalElapsed;
    if (snap.foreman) {
      world.foremanCubes = snap.foreman.cubes || 0;
      world.floorStack = snap.foreman.floorStack || 0;
    }
    if (snap.stats) Object.assign(world.stats, snap.stats);
    if (snap.timeLedger) world.timeLedger = copyLedger(snap.timeLedger);
    // Camp buildings (older snapshots kept only the canteen).
    if (snap.camp) root.MicroBuilders.restoreCamp(world, snap.camp);
    else if (snap.canteen) root.MicroBuilders.restoreCamp(world, { canteen: snap.canteen });
  }

  function offlineEfficiency(state) {
    return officeValue('offline', state.office.offline);
  }

  // «Диспетчерская» of the office: hours on top of the profile's.
  function offlineCapSeconds(state) {
    return (META_BALANCE.profile.offlineCapHours + (state ? officeEffects(state).offlineHours : 0)) * 3600;
  }

  // The rare resource of a story building: its type (balance meta.rareTypes — houses, works,
  // towers, landmarks).
  function categoryForLevel(levelIndex) {
    const types = META_BALANCE.rareTypes || [];
    return RARE_KEYS.indexOf(types[levelIndex]) >= 0 ? types[levelIndex] : RARE_KEYS[levelIndex % RARE_KEYS.length];
  }

  // Guaranteed capital for handing over a story level: grows with the square root of its mass, so
  // heavier buildings pay more without the economy exploding with the material ladder.
  function levelMass(level) {
    if (level.totalMass === undefined) {
      let mass = 0;
      for (let i = 0; i < level.blocks.length; i++) mass += root.MicroBuilders.MATERIAL[level.blocks[i].materialId].weight;
      level.totalMass = mass;
    }
    return level.totalMass;
  }

  function levelCapital(level) {
    return Math.max(10, Math.round(META_BALANCE.capital.levelBonus * Math.sqrt(levelMass(level))));
  }

  // One find roll per completed whole cube. Value is a fixed integer from office,
  // collection passives and the current session upgrade, never mass or height.
  function findAmount(stats, campaign) {
    const level = campaign && campaign.purchases ? campaign.purchases.cubeCapital || 0 : 0;
    return Math.max(1, Math.round(stats.capitalValue + root.MicroBuildersSim.sessionValue('cubeCapital', level)));
  }

  function findValue(state, block, campaign) {
    return findAmount(metaStats(state, campaign && campaign.runMode, campaign && campaign.crew), campaign);
  }

  function findPayout(stats, campaign, multiplier) {
    // «Ценные находки» (a site line): every find is worth more.
    const line = campaign && campaign.purchases ? root.MicroBuilders.lineValue(campaign, 'findValue') : 1;
    let value = findAmount(stats, campaign) * (multiplier || 1) * line;
    const prospector = stats.triggers.prospector;
    if (prospector && Math.random() < prospector.value) value *= 2;
    return value;
  }

  function capitalRoll(state, block, mode, crew, campaign) {
    const stats = metaStats(state, mode, crew);
    // «Золотая уха» (the canteen's signature): a cube of a worker who ate it is a likelier find.
    const boost = block && block.findBoost ? block.findBoost : 1;
    if (stats.capitalChance <= 0 || Math.random() >= Math.min(1, stats.capitalChance * boost)) return 0;
    return findPayout(stats, campaign, 1);
  }

  // A contract pays ordinary completion capital (×1), with the same company passive
  // as other orders. Exchange alone retains its explicit board reward upgrade.
  function orderCapital(state, levelIndex, mode) {
    const base = levelCapital(root.MicroBuilders.LEVELS[levelIndex]);
    const company = metaStats(state, mode || 'campaign').orderCapitalMultiplier;
    // The office: «Премия за сдачу» for story and exchange orders (a contract pays its own ×1),
    // «Биржевая репутация» for exchange orders only.
    const office = officeEffects(state);
    const handover = mode === 'contract' ? 1 : office.handover;
    const exchange = mode === 'exchange' ? exchangeValue(state, 'capitalLevel') * office.exchange : 1;
    return Math.round(base * company * handover * exchange);
  }

  // ---------- foreman drops ----------
  // A drop rolls the rarity by the source's weights (balance → foremen → drops) among rarities that
  // already have cards in the pool, with pity: an epic at least every `pity.epic` drops and a
  // legendary every `pity.legendary`. The card is then picked evenly within the rarity.
  function rarityPool(state, rarity) {
    return Object.keys(CARDS).filter(function (id) {
      return CARDS[id].rarity === rarity && cardInPool(state, id);
    });
  }

  function rollCard(state, source, preferredId) {
    const pity = state.cardPity || (state.cardPity = { epic: 0, legendary: 0 });
    const open = {};
    RARITIES.forEach(function (rarity) { open[rarity] = rarityPool(state, rarity); });
    // Pity counts only while cards of that rarity can actually drop.
    if (open.epic.length > 0) pity.epic += 1;
    if (open.legendary.length > 0) pity.legendary += 1;
    let rarity = null;
    if (open.legendary.length > 0 && pity.legendary >= FOREMEN.pity.legendary) rarity = 'legendary';
    else if (open.epic.length > 0 && pity.epic >= FOREMEN.pity.epic) rarity = 'epic';
    else {
      const weights = FOREMEN.drops[source];
      let total = 0;
      RARITIES.forEach(function (r) { if (open[r].length > 0) total += weights[r]; });
      let roll = Math.random() * total;
      for (let i = RARITIES.length - 1; i >= 0 && !rarity; i--) {
        if (open[RARITIES[i]].length === 0) continue;
        roll -= weights[RARITIES[i]];
        if (roll < 0) rarity = RARITIES[i];
      }
      if (!rarity) rarity = 'common';
    }
    if (rarity === 'legendary') pity.legendary = 0;
    if (rarity === 'legendary' || rarity === 'epic') pity.epic = 0;
    const pool = open[rarity];
    const focus = preferredId && pool.indexOf(preferredId) >= 0 ? schoolUpgradeLevel(state, 'profile') : 0;
    const pick = Math.floor(Math.random() * (pool.length + focus));
    return grantCard(state, pick < pool.length ? pool[pick] : preferredId);
  }

  function grantCard(state, id) {
    const card = state.cards[id];
    const isNew = card.level === 0;
    if (isNew) card.level = 1;
    else card.copies += 1;
    return {
      cardId: id,
      cardName: CARDS[id].name,
      rarity: CARDS[id].rarity,
      rarityName: RARITY_NAMES[CARDS[id].rarity],
      isNew: isNew,
    };
  }

  // School: recruiting is one of the school's departments.
  function recruitPeriod(state) {
    return FOREMEN.recruiting.hours * 3600 * 1000 / (1 + schoolUpgradeLevel(state, 'recruitSpeed') * 0.15);
  }

  function recruitCapacity(state) {
    return FOREMEN.recruiting.stock + schoolUpgradeLevel(state, 'recruitStock');
  }

  function refreshRecruiting(state) {
    const recruit = state.recruit || (state.recruit = { stock: 0, nextAt: 0 });
    if (!schoolHasUpgrade(state, 'recruiting')) return recruit;
    const period = recruitPeriod(state), capacity = recruitCapacity(state);
    const now = Date.now();
    if (!recruit.nextAt) recruit.nextAt = now + period;
    while (recruit.stock < capacity && now >= recruit.nextAt) {
      recruit.stock += 1;
      recruit.nextAt += period;
    }
    if (recruit.stock >= capacity) recruit.nextAt = Math.max(recruit.nextAt, now);
    return recruit;
  }

  function claimRecruit(state, targeted) {
    if (!schoolHasUpgrade(state, 'recruiting')) return null;
    const recruit = refreshRecruiting(state);
    if (recruit.stock <= 0) return null;
    const preferred = state.school.preferredCard;
    if (targeted) {
      const price = targetRecruitCost(state);
      if (!price || state.capital < price.capital || state.diplomas < price.diplomas) return null;
      state.capital -= price.capital;
      state.diplomas -= price.diplomas;
    }
    if (recruit.stock >= recruitCapacity(state)) recruit.nextAt = Date.now() + recruitPeriod(state);
    recruit.stock -= 1;
    const card = targeted ? grantCard(state, preferred) : rollCard(state, 'recruiting', preferred);
    save(state);
    return card;
  }

  // ---------- school ----------
  function createSchoolState() {
    return { upgrades: Object.keys(SCHOOL.upgrades).reduce(function (out, id) { out[id] = 0; return out; }, {}),
      wins: { tower: 0, foundation: 0, monument: 0 }, bestSeconds: {},
      attempts: { day: '', used: 0 }, nextRunId: 1, activeAttempt: null, preferredCard: '' };
  }

  function schoolUpgradeLevel(state, id) {
    return state.school && state.school.upgrades[id] || 0;
  }

  function schoolHasUpgrade(state, id) {
    return state.hq.recruiting > 0 && schoolUpgradeLevel(state, id) > 0;
  }

  function schoolTotalWins(state) {
    return Object.keys(SCHOOL.bosses).reduce(function (sum, id) { return sum + (state.school && state.school.wins[id] || 0); }, 0);
  }

  function schoolUpgradeCost(state, id) {
    const spec = SCHOOL.upgrades[id], level = schoolUpgradeLevel(state, id);
    return spec && level < spec.max ? { capital: spec.capital[level], diplomas: spec.diplomas[level] } : null;
  }

  function schoolUpgradeReason(state, id) {
    const spec = SCHOOL.upgrades[id];
    if (!spec) return 'Нет такой программы';
    if (!state.hq.recruiting) return 'Сначала постройте школу бригадиров';
    if (state.campaignLevel + 1 < spec.level) return 'Откроется с уровня ' + spec.level;
    if (spec.after && !schoolHasUpgrade(state, spec.after)) return 'Сначала изучите «' + SCHOOL.upgrades[spec.after].name + '»';
    return '';
  }

  function buySchoolUpgrade(state, id) {
    const price = schoolUpgradeCost(state, id);
    if (!price || schoolUpgradeReason(state, id) || state.capital < price.capital || state.diplomas < price.diplomas) return false;
    const recruit = refreshRecruiting(state), now = Date.now(), oldPeriod = recruitPeriod(state);
    state.capital -= price.capital;
    state.diplomas -= price.diplomas;
    state.school.upgrades[id] += 1;
    if (id === 'recruiting') recruit.nextAt = now + recruitPeriod(state);
    // Preserve the fraction already earned, so buying speed never erases the wait.
    if (id === 'recruitSpeed' && recruit.nextAt > now) recruit.nextAt = now + (recruit.nextAt - now) * recruitPeriod(state) / oldPeriod;
    save(state);
    return true;
  }

  function mentoringMultiplier(state, mentorLevel, pupilLevel, slotIndex) {
    if (slotIndex === 0 || !schoolHasUpgrade(state, 'expertise')) return 1;
    const gap = Math.max(0, Math.min(SCHOOL.mentoringGapCap, mentorLevel - pupilLevel));
    return 1 + gap * schoolUpgradeLevel(state, 'mentoring') * SCHOOL.mentoringPerGapPerLevel;
  }

  function setRecruitFocus(state, id) {
    if (!schoolHasUpgrade(state, 'profile') || (id && (!CARDS[id] || !cardInPool(state, id)))) return false;
    state.school.preferredCard = id;
    save(state);
    return true;
  }

  function targetRecruitCost(state) {
    const id = state.school.preferredCard;
    if (!schoolHasUpgrade(state, 'targeted') || !id || !CARDS[id] || !cardInPool(state, id)) return null;
    return { capital: SCHOOL.targetHireCapital[CARDS[id].rarity], diplomas: SCHOOL.targetHireDiplomas[CARDS[id].rarity] };
  }

  function schoolAttempts(state, now) {
    now = now === undefined ? Date.now() : now;
    const date = new Date(now);
    const stamp = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    const attempts = state.school.attempts;
    // Local midnight; moving the clock backwards cannot refill today's attempts.
    if (stamp > attempts.day) { attempts.day = stamp; attempts.used = 0; }
    const reset = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    return { used: attempts.used, left: Math.max(0, SCHOOL.dailyAttempts - attempts.used), limit: SCHOOL.dailyAttempts, resetAt: reset };
  }

  function schoolBoss(state, id) {
    const spec = SCHOOL.bosses[id];
    if (!spec) return null;
    const won = state.school.wins[id] || 0, tier = won + 1;
    const row = SCHOOL.tables && SCHOOL.tables[id] && SCHOOL.tables[id][Math.min(tier, SCHOOL.maxTier) - 1];
    if (!row) throw new Error('Missing calibrated school tier: ' + id + ':' + tier);
    return Object.assign({}, row, { id: id, name: spec.name, tier: tier, won: won, complete: won >= SCHOOL.maxTier });
  }

  // Why a trial is still closed ('' — open): balance → school → bosses → requires {boss, tier}.
  function schoolBossLock(state, id) {
    const need = SCHOOL.bosses[id] && SCHOOL.bosses[id].requires;
    if (!need || (state.school.wins[need.boss] || 0) >= need.tier) return '';
    return 'Откроется после ' + need.tier + '-й ступени «' + SCHOOL.bosses[need.boss].name + '»';
  }

  function schoolMilestoneCards(state) {
    const wins = schoolTotalWins(state);
    return Object.keys(CARDS).filter(function (id) { return CARDS[id].unlockWins === wins + 1; });
  }

  function startSchoolTrial(state, id) {
    const boss = schoolBoss(state, id), side = site(state, 'side');
    if (!state.hq.recruiting || !boss || boss.complete || schoolBossLock(state, id) || (side && side.status === 'play') || state.school.activeAttempt || schoolAttempts(state).left <= 0) return null;
    const payload = { bossId: id, tier: boss.tier, limit: boss.limit, diplomas: boss.diplomas, runId: state.school.nextRunId++ };
    state.school.attempts.used += 1;
    state.school.activeAttempt = Object.assign({}, payload);
    save(state);
    return payload;
  }

  function schoolLimitSeconds(campaign) {
    return campaign && campaign.runMode === 'school' && campaign.runPayload ? campaign.runPayload.limit : 0;
  }

  function failSchoolTrial(state) {
    state.school.activeAttempt = null;
    const side = site(state, 'side');
    if (side && side.runMode === 'school') clearSite(state, 'side');
    else save(state);
  }

  function completeSchoolTrial(state, campaign) {
    const p = campaign.runPayload, active = state.school.activeAttempt;
    if (!p || !active || p.runId !== active.runId || p.bossId !== active.bossId || p.tier !== active.tier || campaign.levelElapsed > active.limit + 1e-6) return null;
    const boss = schoolBoss(state, p.bossId);
    if (!boss || p.tier !== boss.tier) return null;
    const milestoneIds = schoolMilestoneCards(state);
    state.school.activeAttempt = null;
    state.school.wins[p.bossId] = p.tier;
    state.school.bestSeconds[p.bossId] = Math.min(state.school.bestSeconds[p.bossId] || Infinity, campaign.levelElapsed);
    state.diplomas += active.diplomas;
    // Guaranteed milestone copies are separate from the small chest's random card.
    const milestoneCards = milestoneIds.map(function (id) {
      return Object.assign(grantCard(state, id), { milestone: schoolTotalWins(state) });
    });
    return { diplomas: active.diplomas, milestoneCards: milestoneCards, card: rollCard(state, 'school'), tier: p.tier, bossId: p.bossId, smallChest: true };
  }

  // `finds` lists every capital find by block ({block, value}) so the view can float it there.
  function onBlocksPlaced(state, campaign, world, blocks, options) {
    const expertise = gainForemanExperience(state, campaign, world, blocks, !!(options && options.offline));
    // The kitchen's discovery multiplier (the chef's secret dishes): every cube anywhere adds √(its mass) ×
    // multiplierPerMass — a very slow climb from 1 over the whole game.
    const perMass = ((root.MicroBuildersBalance.canteen || {}).kitchen || {}).multiplierPerMass || 0;
    if (perMass > 0) {
      let grow = 0;
      for (let i = 0; i < blocks.length; i++) grow += Math.sqrt(root.MicroBuilders.MATERIAL[blocks[i].materialId].weight);
      state.kitchenMultiplier = (state.kitchenMultiplier || 1) + grow * perMass;
      campaign.discoveryMultiplier = state.kitchenMultiplier;
    }
    let capital = 0;
    const finds = [];
    for (let i = 0; i < blocks.length; i++) {
      const value = capitalRoll(state, blocks[i], campaign.runMode, campaign.crew, campaign);
      if (value <= 0) continue;
      capital += value;
      finds.push({ block: blocks[i], value: value });
    }
    state.capital += capital;

    const rewards = [];
    if (campaign.runMode === 'campaign' && state.completed.indexOf(world.level.index) === -1 && chestsOpen(world.level.index)) {
      const done = world.level.blocks.length - world.remaining;
      const thresholds = [25, 50];
      for (let i = 0; i < thresholds.length; i++) {
        const threshold = thresholds[i];
        const key = world.level.index + ':' + threshold;
        if (done * 100 >= world.level.blocks.length * threshold && state.claimedChests[key] !== 1) {
          rewards.push(threshold);
        }
      }
    }
    return { capital: capital, rewards: rewards, finds: finds, expertise: expertise };
  }

  // What handing over a story level pays the first time (the briefing shows it before the start).
  function storyReward(state, levelIndex) {
    if (!root.MicroBuilders.LEVELS[levelIndex] || state.completed.indexOf(levelIndex) >= 0) return { capital: 0, seals: 0, done: true };
    // The first level pays exactly for the office plot and its first upgrade.
    return { capital: levelIndex === 0 ? PROJECTS.office.capital + firstOfficePrice() : orderCapital(state, levelIndex, 'campaign'),
      seals: storySeals(levelIndex), done: false };
  }

  // Seals of a story order's first hand-over (balance → meta.storySeals): from the order `from`, `base`
  // and one more every `per` orders. The meta plan buys technologies without counting seals; contracts,
  // the exchange's special order and the tech centre alone pay 40–60% of what its purchases ask
  // (docs/gdd/30-seals-draft.md).
  function storySeals(levelIndex) {
    const spec = META_BALANCE.storySeals;
    const n = levelIndex + 1;
    if (!spec || n < spec.from) return 0;
    return spec.base + Math.floor(n / spec.per);
  }

  function onLevelComplete(state, campaign, world) {
    const result = { capital: 0, seals: 0, rare: null, text: '', card: null };
    const treasurer = campaign.foremen && campaign.foremen.treasurer;
    if (treasurer) {
      state.carryCoins = Math.round((campaign.coinsEarned || 0) * treasurer.value);
      result.carryCoins = state.carryCoins;
    }
    if (campaign.runMode === 'campaign') {
      if (state.completed.indexOf(world.level.index) === -1) {
        const reward = storyReward(state, world.level.index);
        state.completed.push(world.level.index);
        result.capital = reward.capital;
        state.capital += result.capital;
        result.seals = reward.seals;
        state.seals += result.seals;
        // The first hand-over of a story building: one of its rare resource.
        result.rare = { key: categoryForLevel(world.level.index), amount: 1 };
      }
      const nextLevel = world.level.index + 1;
      if (nextLevel < root.MicroBuilders.LEVELS.length && nextLevel > state.campaignLevel) {
        state.campaignLevel = nextLevel;
      }
      result.text = 'Сюжетный заказ завершён';
    }
    if (campaign.runMode === 'exchange' && campaign.runPayload && campaign.runPayload.special) {
      // «Спецзаказ дня»: seals instead of the rare resource; the regular board is untouched.
      const reward = specialReward(state, world.level.index);
      result.seals = reward.seals;
      result.capital = reward.capital;
      state.seals += result.seals;
      state.capital += result.capital;
      const special = state.exchange.special;
      if (special && special.day === campaign.runPayload.day) special.done = true;
      result.text = 'Спецзаказ выполнен';
    } else if (campaign.runMode === 'exchange') {
      const reward = exchangeReward(state, world.level.index);
      result.rare = { key: reward.rare, amount: reward.rareAmount };
      result.capital = reward.capital;
      state.capital += result.capital;
      const orderId = campaign.runPayload.orderId;
      state.exchange.orders = state.exchange.orders.filter(function (order) { return order.id !== orderId; });
      state.exchange.nextOrderAt = Date.now() + exchangeInterval(state);
      result.text = 'Старый заказ выполнен';
    }
    if (campaign.runMode === 'contract') {
      const contract = currentContract(state);
      result.seals = contract ? contract.seals : 1;
      result.capital = contract ? contract.capital : 0;
      result.rare = { key: categoryForLevel(world.level.index), amount: 1 };
      state.seals += result.seals;
      state.capital += result.capital;
      state.contract.index += 1;
      if (state.contract.index % FOREMEN.contractEvery === 0) result.card = rollCard(state, 'contract');
      result.text = 'Контракт пройден';
    }
    // «Связи в мэрии»: more of the same resource; then the rare reward goes to the company.
    if (result.rare) {
      result.rare.amount += campaign.boosterRare || 0;
      state.rare[result.rare.key] = (state.rare[result.rare.key] || 0) + result.rare.amount;
    }
    if (campaign.runMode === 'school') {
      const schoolReward = completeSchoolTrial(state, campaign);
      if (schoolReward) Object.assign(result, schoolReward, { text: 'Испытание пройдено' });
    }
    if (campaign.runMode === 'hq') {
      const projectId = campaign.runPayload.projectId;
      const done = completeHqBuilding(state, projectId);
      result.seals = done.seals;
      if (done.card) result.card = done.card;
      result.text = PROJECTS[projectId].name + ' построен';
    }
    // «Премия за сдачу» (a site line): the hand-over capital is bigger.
    const bonus = campaign.purchases ? root.MicroBuilders.lineValue(campaign, 'handoverPay') : 1;
    if (result.capital > 0 && bonus > 1) {
      const extra = Math.round(result.capital * (bonus - 1));
      state.capital += extra;
      result.capital += extra;
    }
    // The site slot is the game's business (it keeps the finished site until the player moves on).
    save(state);
    return result;
  }

  // The first office purchase the scenario wants right after the first level (balance → meta).
  function firstOfficePrice() {
    return officeCost(META_BALANCE.firstPurchase, 0);
  }

  // ---------- exchange of old orders ----------
  // Board upgrades: balance.json → meta → exchange (values, opening times, calibrated prices).
  const EXCHANGE_UPGRADES = META_BALANCE.exchange;

  function exchangeValue(state, kind, level) {
    return evalFormula(EXCHANGE_UPGRADES[kind].formula, level === undefined ? state.exchange[kind] : level);
  }

  function exchangeUnlocked(state, kind) {
    return lineUnlocked(state.exchange, EXCHANGE_UPGRADES[kind]);
  }

  function exchangeCapacity(state) {
    return exchangeValue(state, 'capacityLevel');
  }

  function exchangeInterval(state) {
    return exchangeValue(state, 'intervalLevel') * 60000;
  }

  // What an order pays: the story bonus of that level × «Капитал за заказ», and a rare resource of
  // its building type.
  function exchangeReward(state, levelIndex) {
    return {
      capital: orderCapital(state, levelIndex, 'exchange'),
      rare: categoryForLevel(levelIndex),
      rareAmount: exchangeValue(state, 'rewardLevel'),
    };
  }

  function addExchangeOrder(state) {
    const candidates = state.completed.filter(function (levelIndex) {
      return !state.exchange.orders.some(function (order) { return order.levelIndex === levelIndex; });
    });
    if (candidates.length === 0) return false;
    const levelIndex = candidates[Math.floor(Math.random() * candidates.length)];
    state.exchange.orders.push({ id: Date.now() + ':' + levelIndex + ':' + state.exchange.orders.length, levelIndex: levelIndex });
    return true;
  }

  // ---------- «Спецзаказ дня» ----------
  // One order a day on top of the exchange board, outside its slots and flow: an old order like the
  // others, but it pays seals (balance meta.exchangeSpecial.seals) instead of the rare resource. Days
  // are UTC: a new one comes at 00:00 UTC; done, its card counts down to that.
  const SPECIAL_ORDER = META_BALANCE.exchangeSpecial || { seals: 3 };

  function utcDay(time) {
    return new Date(time).toISOString().slice(0, 10);
  }

  // The next 00:00 UTC after `time` (ms).
  function nextUtcDay(time) {
    const date = new Date(time);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  }

  // Today's special order (rolled from the finished story buildings the first time it is asked for
  // on a new UTC day), or null before the exchange stands.
  function specialOrder(state) {
    if (!(state.hq.exchange > 0) || state.completed.length === 0) return null;
    const today = utcDay(Date.now());
    const special = state.exchange.special;
    if (!special || special.day !== today) {
      state.exchange.special = { day: today, levelIndex: state.completed[Math.floor(Math.random() * state.completed.length)], done: false };
      save(state);
    }
    return state.exchange.special;
  }

  function specialReward(state, levelIndex) {
    return { capital: orderCapital(state, levelIndex, 'exchange'), seals: SPECIAL_ORDER.seals };
  }

  // A new exchange opens with a full board; after that an empty slot refills once per interval.
  function fillExchange(state) {
    if (state.hq.exchange === 0) return;
    const exchange = state.exchange;
    const capacity = exchangeCapacity(state);
    const now = Date.now();
    if (!exchange.stocked) {
      while (exchange.orders.length < capacity && addExchangeOrder(state)) { /* fill the board */ }
      exchange.stocked = true;
      exchange.nextOrderAt = now + exchangeInterval(state);
    }
    while (exchange.orders.length < capacity && now >= exchange.nextOrderAt) {
      if (!addExchangeOrder(state)) break;
      exchange.nextOrderAt += exchangeInterval(state);
    }
    if (exchange.orders.length >= capacity) exchange.nextOrderAt = Math.max(exchange.nextOrderAt, now);
    save(state);
  }

  // «Золотой прораб»: a golden cube always brings a capital find.
  function goldenFind(state, block, campaign, multiplier) {
    const stats = metaStats(state, campaign && campaign.runMode, campaign && campaign.crew);
    const value = findPayout(stats, campaign, multiplier || CARDS.golden.factor || 3);
    state.capital += value;
    return value;
  }

  // The company side of an absence that started at `since` (ms). Recruiting, exchange orders and
  // contract cooldowns run on the wall clock; refresh them for the return report. Sites are caught
  // up by the game (it needs the session simulator).
  function claimAway(state, since, offline) {
    const now = Date.now();
    const from = since || now;
    const seconds = Math.max(0, (now - from) / 1000);
    const recruitBefore = state.recruit ? state.recruit.stock : 0;
    const recruit = refreshRecruiting(state);
    const ordersBefore = state.exchange.orders.length;
    if (state.hq.exchange > 0) fillExchange(state);
    const cooldown = state.contract.cooldownUntil || 0;
    state.hiddenAt = null;
    save(state);
    return {
      seconds: seconds,
      offline: !!offline,
      recruitsNew: Math.max(0, recruit.stock - recruitBefore),
      recruits: recruit.stock,
      ordersNew: Math.max(0, state.exchange.orders.length - ordersBefore),
      contractReady: contractReady(state) && cooldown > from && cooldown <= now,
    };
  }

  // Old name: the cold-boot claim (absence since the page was hidden or last saved).
  function claimOffline(state) {
    return claimAway(state, state.hiddenAt || state.lastSeenAt, true);
  }

  function buyOffice(state, kind) {
    const level = state.office[kind];
    const cost = officeCost(kind, level);
    const seals = officeSeals(kind, level);
    if (!officeUnlocked(state, kind)) return false;
    if (state.capital < cost || state.seals < seals) return false;
    if (level >= OFFICE[kind].max) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.office[kind] += 1;
    save(state);
    return true;
  }

  function sessionLineOpen(state, kind) {
    const source = SESSION_LINE[kind];
    if (source === '') return true;
    if (source === undefined) return false;
    if (source.indexOf('hq:') === 0) return state.hq[source.slice(3)] > 0;
    if (source.indexOf('tech:') === 0) return state.tech[source.slice(5)] > 0;
    return false;
  }

  // An office line opens with its story level (`level` — completed story levels, set by the
  // calibration from half the line's first smoothed purchase minute).
  function officeUnlocked(state, id) {
    return state.campaignLevel >= (OFFICE[id].level || 0);
  }

  // ---------- tech center ----------
  // Display order follows target purchase times; availability follows the shared session graph.
  const SESSION_PARENTS = {};
  root.MicroBuildersBalance.upgradeTree.forEach(function (pair) { SESSION_PARENTS[pair[0]] = pair[1]; });

  function techPrerequisites(id) {
    const required = new Set();
    // Camp upgrades are off the site graph: `after` names the tech they follow (portions → kitchen).
    if (TECH[id].after && TECH[TECH[id].after]) required.add(TECH[id].after);
    (TECH[id].opens || []).forEach(function (kind) {
      let parent = SESSION_PARENTS[kind];
      const visited = new Set();
      while (parent && !visited.has(parent)) {
        visited.add(parent);
        const source = SESSION_LINE[parent];
        if (source && source !== 'tech:' + id) {
          if (source.indexOf('tech:') === 0) required.add(source.slice(5));
          break;
        }
        parent = SESSION_PARENTS[parent];
      }
    });
    return Array.from(required);
  }

  function missingTechPrerequisites(state, id) {
    return techPrerequisites(id).filter(function (before) { return !(state.tech[before] > 0); });
  }

  function techUnlocked(state, id) {
    const spec = TECH[id];
    if (spec && spec.center === 'advanced' && !advancedUnlocked(state)) return false;
    return !!spec && (spec.center ? true : state.hq.tech > 0) && !(state.tech[id] > 0) &&
      (!spec.requiresProject || state.hq[spec.requiresProject] > 0) && missingTechPrerequisites(state, id).length === 0;
  }

  function techCost(id) {
    return TECH[id].prices && TECH[id].prices.length ? TECH[id].prices[0] : 0;
  }

  function techSeals(id) {
    if (TECH[id].initiallyOwned) return 0;
    return Math.max(1, sealCost(TECH[id], 0));
  }

  function buyTech(state, id) {
    if (!techUnlocked(state, id)) return false;
    const cost = techCost(id);
    const seals = techSeals(id);
    if (state.capital < cost || state.seals < seals) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.tech[id] = 1;
    save(state);
    return true;
  }

  function contractBoardOpen(state) {
    return state.campaignLevel >= 2 || state.hq.contracts > 0;
  }

  // HQ buildings still to build (live ones only) in unlock order, up to `count` (default 3).
  function upcomingProjects(state, count) {
    return Object.keys(PROJECTS)
      .filter(function (id) { return PROJECTS[id].live && !(state.hq[id] > 0); })
      .sort(function (x, y) { return PROJECTS[x].unlock - PROJECTS[y].unlock; })
      .slice(0, count || 3);
  }

  function officeChain(section) {
    const rows = OFFICE_ROWS[section];
    return rows;
  }

  function buyPlot(state, id) {
    const project = PROJECTS[id];
    if (!project.live || state.hq[id] > 0 || state.plots[id] === 1) return false;
    if (state.campaignLevel < project.unlock) return false;
    if (state.capital < project.capital || state.seals < (project.seals || 0)) return false;
    if (project.rare && Object.keys(project.rare).some(function (key) { return (state.rare[key] || 0) < project.rare[key]; })) return false;
    state.capital -= project.capital;
    state.seals -= project.seals || 0;
    if (project.rare) Object.keys(project.rare).forEach(function (key) { state.rare[key] -= project.rare[key]; });
    state.plots[id] = 1;
    save(state);
    return true;
  }

  // Both HQ completion paths use the built flag to pay a building's reward only once.
  // A finished HQ building: its seal reward once; the school also brings the first foreman.
  function completeHqBuilding(state, id) {
    const first = !(state.hq[id] > 0);
    const seals = first ? PROJECTS[id].rewardSeals || 0 : 0;
    state.seals += seals;
    state.hq[id] = 1;
    state.plots[id] = 1;
    state.hqSite = null;
    if (id === 'exchange') fillExchange(state);
    const card = first && id === 'recruiting' ? grantFirstCard(state) : null;
    return { seals: seals, card: card };
  }

  function finishCityBuilding(state) {
    const done = completeHqBuilding(state, state.hqSite.id);
    save(state);
    return done;
  }

  function startHqProject(state, id) {
    if (state.hqSite && state.hqSite.id === id) return true;
    const project = PROJECTS[id];
    if (!project.live || state.hqSite) return false;
    if (state.hq[id] > 0 || state.plots[id] !== 1) return false;
    state.hqSite = { id: id, levelIndex: 0, parts: 0 };
    save(state);
    return true;
  }

  // Chests open from the 2nd story level. Foreman drops require the school's chestCards research;
  // the first chest after studying guarantees Shift if no foreman has been hired from another source.
  function chestsOpen(levelIndex) {
    return levelIndex + 1 >= FOREMEN.intro.chestsFromLevel;
  }

  // The company's first foreman (balance → foremen → intro.firstCard, 0 wins in the school table).
  // The crew of the running level is locked: the card goes to the story preset and starts working
  // with the next order (its briefing comes prefilled). Null once the company has any foreman.
  function grantFirstCard(state) {
    if (Object.keys(CARDS).some(function (id) { return state.cards[id].level > 0; })) return null;
    const intro = FOREMEN.intro;
    const card = grantCard(state, intro.firstCard);
    const preset = crewOf(state, 'campaign');
    card.equipped = preset.indexOf(intro.firstCard) < 0 && preset.length < foremanSlots(state);
    if (card.equipped) preset.push(intro.firstCard);
    card.first = true;
    return card;
  }

  function chestCard(state, levelIndex, threshold) {
    if (!schoolHasUpgrade(state, 'chestCards')) return null;
    return grantFirstCard(state) || rollCard(state, threshold === 25 ? 'chest25' : 'chest50');
  }

  function claimChest(state, levelIndex, threshold) {
    const key = levelIndex + ':' + threshold;
    if (!chestsOpen(levelIndex) || state.claimedChests[key] === 1) return null;
    state.claimedChests[key] = 1;
    const share = META_BALANCE.capital.chestShares[threshold === 25 ? 0 : 1];
    const capital = Math.max(5, Math.round(orderCapital(state, levelIndex, 'campaign') * share));
    state.capital += capital;
    const card = chestCard(state, levelIndex, threshold);
    save(state);
    return Object.assign({ capital: capital, card: !!card }, card || {});
  }

  // After an office purchase or a card upgrade: the running crew gets the new numbers at once
  // (start-of-run bonuses such as extra builders wait for the next order).
  function applyLive(state, campaign) {
    applyCardStats(state, campaign);
  }

  function upgradeCard(state, id) {
    const card = state.cards[id];
    const copies = cardCopiesRequired(card);
    const cost = cardUpgradeCost(card, id);
    if (card.level <= 0 || card.level >= cardMaxLevel(id)) return false;
    const seals = cardSeals(card);
    if (card.copies < copies || state.capital < cost || state.seals < seals) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.cards[id].copies -= copies;
    state.cards[id].level += 1;
    save(state);
    return true;
  }

  function exchangeUpgradeCost(state, kind) {
    const prices = EXCHANGE_UPGRADES[kind].prices;
    if (prices && prices.length > 0) return prices[Math.min(state.exchange[kind], prices.length - 1)];
    return Math.round(100 * Math.pow(3, state.exchange[kind]));
  }

  function buyExchangeUpgrade(state, kind) {
    const cost = exchangeUpgradeCost(state, kind);
    const seals = exchangeSeals(kind, state.exchange[kind]);
    if (!exchangeUnlocked(state, kind)) return false;
    if (state.capital < cost || state.seals < seals || state.exchange[kind] >= EXCHANGE_UPGRADES[kind].max) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.exchange[kind] += 1;
    if (kind === 'capacityLevel') state.exchange.capacity = exchangeCapacity(state);
    fillExchange(state);
    return true;
  }

  // ---------- contracts ----------
  // The list is calibrated by the campaign simulator (balance.json → meta → contracts): contract k is
  // meant for day k/3 of the reference player — its building, time limit and reward.
  function currentContract(state) {
    const contract = META_BALANCE.contracts.list[state.contract.index];
    return contract ? Object.assign({}, contract, { capital: orderCapital(state, contract.level, 'contract') }) : null;
  }

  function contractLevelIndex(state) {
    const contract = currentContract(state);
    return contract ? contract.level : 0;
  }

  function contractLimitSeconds(state) {
    const contract = currentContract(state);
    return contract ? contract.limit : 0;
  }

  // A contract opens once its building is part of the company's history (a finished story level).
  function contractReady(state) {
    const contract = currentContract(state);
    return !!contract && state.completed.indexOf(contract.level) >= 0;
  }

  // ---------- cookbook (центр персонала → кулинарная книга) ----------
  // Dishes of the site canteen (balance.json → canteen.dishes): bought once for capital, then every
  // canteen can serve them. Prices by the timing of each dish (metasim.js → 'dish:<id>', `capital`).
  const DISHES = root.MicroBuildersBalance.canteen ? root.MicroBuildersBalance.canteen.dishes : [];

  // A dish the company knows: free ones from the start, bought ones from the cookbook, the chef's secret
  // dishes once a kitchen found them (discoverDish).
  function dishOwned(state, id) {
    const dish = DISHES.find(function (item) { return item.id === id; });
    if (!dish) return false;
    if (dish.secret) return !!(state.cookbook && state.cookbook[id]);
    return !(dish.capital > 0) || !!(state.cookbook && state.cookbook[id]);
  }

  function discoverDish(state, id) {
    const dish = DISHES.find(function (item) { return item.id === id; });
    if (!dish || !dish.secret || dishOwned(state, id)) return false;
    state.cookbook[id] = 1;
    save(state);
    return true;
  }

  // Центр персонала: «Уровни столовой» (the site's «Полевая кухня» may go one level higher),
  // «Места в столовой» (+1 seat in every canteen a level) and «Короче обед» (−1 s a level).
  // Prices are a draft: base × growth^level, rounded to two significant digits.
  const CANTEEN_SPEC = root.MicroBuildersBalance.canteen || { mealSeconds: 50, seats: 2, minMealSeconds: 10, upgrades: {} };
  const SALES_SPEC = root.MicroBuildersBalance.sales || {};
  const DORM_SPEC = root.MicroBuildersBalance.dorm || {};
  const LOUNGE_SPEC = root.MicroBuildersBalance.lounge || {};
  const LIGHT_SPEC = root.MicroBuildersBalance.light || {};
  const PERSONNEL_UPGRADES = Object.assign({}, CANTEEN_SPEC.upgrades || {}, SALES_SPEC.meta ? { sales: SALES_SPEC.meta } : {},
    DORM_SPEC.meta ? { dorm: DORM_SPEC.meta } : {}, LOUNGE_SPEC.meta ? { lounge: LOUNGE_SPEC.meta } : {},
    LIGHT_SPEC.meta ? { light: LIGHT_SPEC.meta } : {});

  // Camp building levels are priced by the campaign simulator (spec.prices, metasim.js → 'pc:<id>');
  // seats and the shorter meal by base × growth^level.
  function personnelCost(kind, level) {
    const spec = PERSONNEL_UPGRADES[kind];
    if (!spec || level >= spec.max) return Infinity;
    if (spec.prices && spec.prices.length) return spec.prices[Math.min(level, spec.prices.length - 1)];
    const raw = spec.base * Math.pow(spec.growth, level);
    const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1));
    return Math.round(raw / step) * step;
  }

  // Seats of a canteen of `level` (the site's «Полевая кухня» level) with the meta bonus.
  function canteenSeats(state, level) {
    return (CANTEEN_SPEC.seats || 2) * Math.max(1, level || 1) + (state.personnel ? state.personnel.seats : 0);
  }

  function canteenMaxLevel(state) {
    return 1 + (state.personnel ? state.personnel.level || 0 : 0);
  }

  function canteenMealSeconds(state) {
    const level = state.personnel ? state.personnel.meal : 0;
    return Math.max(CANTEEN_SPEC.minMealSeconds || 10, CANTEEN_SPEC.mealSeconds - level);
  }

  // Seals of a level of a camp building in the personnel centre (spec.seals by level; 0 for seats, meal).
  function personnelSeals(kind, level) {
    const spec = PERSONNEL_UPGRADES[kind];
    if (!spec || !spec.seals || level >= spec.max) return 0;
    return spec.seals[Math.min(level, spec.seals.length - 1)] || 0;
  }

  function buyPersonnel(state, kind) {
    const spec = PERSONNEL_UPGRADES[kind];
    if (!spec || !(state.hq.personnel > 0)) return false;
    const level = state.personnel[kind] || 0;
    const cost = personnelCost(kind, level);
    const seals = personnelSeals(kind, level);
    if (level >= spec.max || state.capital < cost || (state.seals || 0) < seals) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.personnel[kind] = level + 1;
    save(state);
    return true;
  }

  function buyDish(state, id) {
    const dish = DISHES.find(function (item) { return item.id === id; });
    if (!dish || dish.secret || dishOwned(state, id) || !(state.hq.personnel > 0)) return false;
    if (state.capital < dish.capital) return false;
    state.capital -= dish.capital;
    state.cookbook[id] = 1;
    save(state);
    return true;
  }

  // Dev (menu «Перемотать на уровень»): the company as the reference player has it on reaching
  // `levelIndex` (0-based). Every earlier story level is done, and the meta is what the reference
  // campaign bought after levels 1…levelIndex (balance.json → meta.plan, from the campaign
  // simulator): office lines, technologies and exchange upgrades are set to exactly those levels,
  // HQ buildings of the plan are built (with their one-time rewards; none is torn down). Capital,
  // seals, foremen, the school and the personnel centre stay as they are.
  function devFastForward(state, levelIndex) {
    state.completed = [];
    for (let i = 0; i < levelIndex; i++) state.completed.push(i);
    state.campaignLevel = levelIndex;
    const office = {}, tech = {}, exchange = {}, personnel = {}, training = {}, hq = [], dishes = [];
    const plan = META_BALANCE.plan || {};
    for (let n = 1; n <= levelIndex; n++) {
      (plan[n] || []).forEach(function (entry) {
        if (entry.indexOf('hq:') === 0) hq.push(entry.slice(3));
        else if (entry.indexOf('tech:') === 0) tech[entry.slice(5)] = 1;
        else if (entry.indexOf('ex:') === 0) exchange[entry.slice(3)] = (exchange[entry.slice(3)] || 0) + 1;
        else if (entry.indexOf('pc:') === 0) personnel[entry.slice(3)] = (personnel[entry.slice(3)] || 0) + 1;
        else if (entry.indexOf('tr:') === 0) training[entry.slice(3)] = (training[entry.slice(3)] || 0) + 1;
        else if (entry.indexOf('dish:') === 0) dishes.push(entry.slice(5));
        else office[entry] = (office[entry] || 0) + 1;
      });
    }
    // Camp building levels of the personnel centre the plan bought (seats and the meal stay).
    Object.keys(personnel).forEach(function (id) {
      if (PERSONNEL_UPGRADES[id]) state.personnel[id] = Math.max(state.personnel[id] || 0, Math.min(personnel[id], PERSONNEL_UPGRADES[id].max));
    });
    Object.keys(state.office).forEach(function (id) {
      state.office[id] = Math.min(office[id] || 0, OFFICE[id] ? OFFICE[id].max : Infinity);
    });
    // Training centre programs of the plan (its experience stays as it is).
    Object.keys(training).forEach(function (id) {
      if (TRAINING_UPGRADES[id]) state.training.upgrades[id] = Math.max(trainingUpgradeLevel(state, id), Math.min(training[id], TRAINING_UPGRADES[id].max));
    });
    TECH_ORDER.forEach(function (id) { state.tech[id] = TECH[id].initiallyOwned || tech[id] ? 1 : 0; });
    // Cookbook dishes of the plan (the chef's secret ones stay as found).
    dishes.forEach(function (id) { state.cookbook[id] = 1; });
    Object.keys(EXCHANGE_UPGRADES).forEach(function (kind) {
      state.exchange[kind] = Math.min(exchange[kind] || 0, EXCHANGE_UPGRADES[kind].max);
    });
    state.exchange.capacity = exchangeCapacity(state);
    const running = state.hqSite;
    hq.forEach(function (id) {
      if (PROJECTS[id] && PROJECTS[id].live && !(state.hq[id] > 0)) completeHqBuilding(state, id);
    });
    state.hqSite = running && !(state.hq[running.id] > 0) ? running : null;
    if (!state.hqSite && state.sites.hq) state.sites.hq = null;
    if (state.activeSite === 'hq' && !state.sites.hq) state.activeSite = 'campaign';
    if (state.hq.exchange > 0) fillExchange(state);
    save(state);
  }

  // ---------- seals ----------
  // The tech center pays 2 starter seals on completion; further seals come from contracts.
  // Every technology and the key nodes cost capital and seals.
  function sealCost(spec, level) {
    if (!spec || !spec.seals) return 0;
    return spec.seals[Math.min(level, spec.seals.length - 1)] || 0;
  }

  function officeSeals(id, level) {
    return sealCost(OFFICE[id], level);
  }

  function exchangeSeals(kind, level) {
    return sealCost(EXCHANGE_UPGRADES[kind], level);
  }

  // Foremen: raising a card from level L costs L − 1 seals (level 1 → 2 is free).
  function cardSeals(card) {
    return Math.max(0, card.level - (META_BALANCE.foremen ? META_BALANCE.foremen.freeLevels : 1));
  }

  // A failed or abandoned contract: 5 minutes of cooldown, its site slot is emptied (the other sites
  // are untouched, so the main run is never lost).
  function failContract(state) {
    state.contract.cooldownUntil = Date.now() + 5 * 60 * 1000;
    const side = site(state, 'side');
    if (side && side.runMode === 'contract') clearSite(state, 'side');
    else save(state);
  }

  // Night and weather of the site now: the schedule and multipliers live in sim.js (ENVIRONMENT),
  // so the simulator averages exactly what the game applies.
  // How much of the night penalty is gone: the office's relief and the site's lighting masts.
  function nightRelief(campaign) {
    // «Ночная бригада» (advanced): no night penalty on this site.
    if (root.MicroBuilders.advancedOwned(campaign, 'advNight')) return 1;
    // «Каски с фонарями» (a site line) takes its share of the penalty too.
    const helmets = campaign.purchases ? root.MicroBuilders.lineValue(campaign, 'nightGear') : 0;
    return Math.min(1, (campaign.metaNightRelief || 0) + (campaign.siteNightRelief || 0) + helmets);
  }

  function environment(state, campaign) {
    // «Ясное небо» clears the weather, «Полуденное солнце» takes the night penalty away, for a while.
    // «Всепогодные» (advanced): the weather never acts on this site.
    const clear = (campaign.spellClearUntil || 0) > campaign.levelElapsed || root.MicroBuilders.advancedOwned(campaign, 'advWeather');
    const noon = (campaign.spellNoonUntil || 0) > campaign.levelElapsed;
    const value = root.MicroBuildersSim.environmentAt(clear ? -1 : campaign.levelIndex, campaign.levelElapsed, noon ? 1 : nightRelief(campaign),
      !root.MicroBuilders.needOpen(campaign, 'night'));
    value.kind = value.weather;
    value.weather = value.weather ? root.MicroBuildersSim.ENVIRONMENT.kinds[value.weather].name : 'Ясно';
    return value;
  }

  // Each weather hits its own thing (sim.js → environmentAt): snow the walking (and the decks more)
  // and the hunger (cold), heat the work and walking, rain the setting and the carry, a storm strikes
  // lightning in the top.
  function applyEnvironment(state, campaign) {
    const value = environment(state, campaign);
    campaign.badWeather = value.weather !== 'Ясно';
    // «Ночной прораб»: at night the crew is faster than by day; «Метеоролог»: bad weather speeds it
    // up and takes away its slowdowns — but not the storm's lightning.
    const foremen = campaign.foremen || {};
    if (value.night && foremen.nightBoost) {
      value.work *= (1 + foremen.nightBoost.value) / (root.MicroBuildersSim.ENVIRONMENT.nightWork + (1 - root.MicroBuildersSim.ENVIRONMENT.nightWork) * nightRelief(campaign));
      value.move = Math.max(value.move, 1);
    }
    if (campaign.badWeather && foremen.meteo) {
      const night = value.night && !foremen.nightBoost ? root.MicroBuildersSim.ENVIRONMENT.nightWork + (1 - root.MicroBuildersSim.ENVIRONMENT.nightWork) * nightRelief(campaign) : 1;
      value.work = night * (1 + foremen.meteo.value);
      value.move = Math.max(value.move, 1 + foremen.meteo.value / 2);
      value.walk = 1;
      value.deck = 1;
      value.floorStep = 0;
      value.carry = 1;
      value.hungerRate = 1;
      value.smokeRate = 1;
      value.fatigueRate = 1;
    }
    // Weather gear (site lines «Зимняя спецовка», «Тенты над раствором», «Вода и панамы»): each takes its
    // share of its own weather's slowdowns and need rates away; the night stays.
    const gear = { snow: 'winterGear', rain: 'rainTents', heat: 'heatGear' }[value.kind];
    const gearShare = gear && campaign.purchases ? Math.min(1, root.MicroBuilders.lineValue(campaign, gear)) : 0;
    // «Метеосводка» of the office: a share of any bad weather's slowdowns, on top of the gear.
    const officeShare = campaign.badWeather && campaign.office ? Math.min(1, campaign.office.weather || 0) : 0;
    const share = 1 - (1 - gearShare) * (1 - officeShare);
    if (share > 0) {
      const night = value.night ? root.MicroBuildersSim.ENVIRONMENT.nightWork + (1 - root.MicroBuildersSim.ENVIRONMENT.nightWork) * nightRelief(campaign) : 1;
      const weatherWork = value.work / night;
      value.work = night * (1 - (1 - weatherWork) * (1 - share));
      ['walk', 'deck', 'carry'].forEach(function (key) { if (value[key] < 1) value[key] = 1 - (1 - value[key]) * (1 - share); });
      if (value.move < 1 && !value.night) value.move = 1 - (1 - value.move) * (1 - share);
      value.floorStep = (value.floorStep || 0) * (1 - share);
      ['hungerRate', 'smokeRate', 'fatigueRate'].forEach(function (key) { if (value[key] > 1) value[key] = 1 + (value[key] - 1) * (1 - share); });
    }
    // For the canteen's seasonal dishes (logic.js → seasonOn): the weather kind, the night and its factors.
    const relief = nightRelief(campaign);
    const sim = root.MicroBuildersSim.ENVIRONMENT;
    campaign.environmentKind = value.kind || '';
    campaign.environmentNight = !!value.night;
    campaign.environmentNightWork = value.night ? sim.nightWork + (1 - sim.nightWork) * relief : 1;
    campaign.environmentNightMove = value.night ? sim.nightMove + (1 - sim.nightMove) * relief : 1;
    campaign.environmentWorkMultiplier = value.work;
    campaign.environmentMoveMultiplier = value.move;
    campaign.environmentWalkMultiplier = value.walk;
    campaign.environmentDeckMultiplier = value.deck;
    campaign.environmentFloorStep = value.floorStep;
    campaign.environmentCarryMultiplier = value.carry;
    campaign.environmentLightning = value.lightning;
    campaign.environmentHungerRate = value.hungerRate;
    campaign.environmentSmokeRate = value.smokeRate;
    campaign.environmentFatigueRate = value.fatigueRate;
    return value;
  }

  // ---------- «Учебный центр»: worker experience and ranks (docs/gdd/26-builder-school-draft.md) ----------
  // Every cube a worker sets gives the centre a point of experience — its own currency: a program
  // costs capital and that experience together.
  const TRAINING = META_BALANCE.training || { ranks: [{ xp: 0, work: 1 }], baseRankCap: 3, upgrades: [] };
  const TRAINING_UPGRADES = {};
  TRAINING.upgrades.forEach(function (spec) { TRAINING_UPGRADES[spec.id] = spec; });

  function addTrainingXp(state, amount) {
    if (!(state.hq.training > 0) || !(amount > 0)) return;
    state.training.xp = (state.training.xp || 0) + amount;
  }

  function trainingXp(state) {
    return Math.floor((state.training && state.training.xp) || 0);
  }

  function trainingUpgradeLevel(state, id) {
    return (state.training && state.training.upgrades[id]) || 0;
  }

  // A price by level: the list, or base × growth^level to two significant digits.
  function trainingPrice(list, base, growth, level) {
    if (list) return list[Math.min(level, list.length - 1)];
    if (!base) return 0;
    const raw = base * Math.pow(growth, level);
    const scale = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1));
    return Math.round(raw / scale) * scale;
  }

  // Capital for the next level of a program (null at the top).
  function trainingCost(state, id) {
    const spec = TRAINING_UPGRADES[id];
    const level = trainingUpgradeLevel(state, id);
    return level >= spec.max ? null : trainingPrice(spec.prices, spec.base, spec.growth, level);
  }

  // The centre's experience for the next level of a program (null at the top).
  function trainingXpCost(state, id) {
    const spec = TRAINING_UPGRADES[id];
    const level = trainingUpgradeLevel(state, id);
    return level >= spec.max ? null : trainingPrice(spec.xpPrices, spec.xpBase, spec.xpGrowth, level);
  }

  function buyTraining(state, id) {
    const cost = trainingCost(state, id);
    const xp = trainingXpCost(state, id);
    if (!(state.hq.training > 0) || cost === null || state.capital < cost || trainingXp(state) < xp) return false;
    if (id !== 'onsite' && trainingUpgradeLevel(state, 'onsite') <= 0) return false;
    state.capital -= cost;
    state.training.xp -= xp;
    state.training.upgrades[id] = trainingUpgradeLevel(state, id) + 1;
    save(state);
    return true;
  }

  // What the site reads (logic.js → gainWorkerXp, spawnBuilder): off until «Обучение на объекте».
  function trainingStats(state) {
    const on = state.hq.training > 0 && trainingUpgradeLevel(state, 'onsite') > 0;
    const value = function (id) { return (TRAINING_UPGRADES[id] && TRAINING_UPGRADES[id].value) || 0; };
    return {
      on: on,
      cap: on ? Math.min(TRAINING.ranks.length, TRAINING.baseRankCap + trainingUpgradeLevel(state, 'ladder')) : 1,
      xpScale: 1 + value('plan') * trainingUpgradeLevel(state, 'plan'),
      power: 1 + value('power') * trainingUpgradeLevel(state, 'power'),
      hireXp: value('intern') * trainingUpgradeLevel(state, 'intern'),
      startRank: 1 + trainingUpgradeLevel(state, 'prepared'),
    };
  }

  // ---------- «Снабжение»: boosters (docs/gdd/21-mech-draft.md) ----------
  // Capital opens a booster and raises its level (balance meta.supply.boosters: unlock, upgrades);
  // each use before a construction costs its rare resource (useCost). Slots: how many go at once.
  const SUPPLY = META_BALANCE.supply || { useCost: 1, slots: { base: 1, prices: [] }, boosters: [] };
  const BOOSTERS = {};
  SUPPLY.boosters.forEach(function (spec) { BOOSTERS[spec.id] = spec; });
  const REACTOR = META_BALANCE.reactor || { manaPerMinute: 0, manaMax: 100, spells: [] };
  const SPELLS = {};
  REACTOR.spells.forEach(function (spec) { SPELLS[spec.id] = spec; });

  function boosterLevel(state, id) {
    return (state.supply && state.supply.boosters[id]) || 0;
  }

  // Capital for the next level of a booster (the first opens it); null at the top.
  function boosterCost(state, id) {
    const spec = BOOSTERS[id];
    const level = boosterLevel(state, id);
    if (level >= spec.amounts.length) return null;
    return level === 0 ? spec.unlock : spec.upgrades[level - 1];
  }

  function buyBooster(state, id) {
    const cost = boosterCost(state, id);
    if (!(state.hq.supply > 0) || cost === null || state.capital < cost) return false;
    state.capital -= cost;
    state.supply.boosters[id] = boosterLevel(state, id) + 1;
    save(state);
    return true;
  }

  function supplySlots(state) {
    return SUPPLY.slots.base + ((state.supply && state.supply.slots) || 0);
  }

  function supplySlotCost(state) {
    const bought = (state.supply && state.supply.slots) || 0;
    return bought < SUPPLY.slots.prices.length ? SUPPLY.slots.prices[bought] : null;
  }

  function buySupplySlot(state) {
    const cost = supplySlotCost(state);
    if (!(state.hq.supply > 0) || cost === null || state.capital < cost) return false;
    state.capital -= cost;
    state.supply.slots = ((state.supply && state.supply.slots) || 0) + 1;
    save(state);
    return true;
  }

  // Why a booster cannot go on this order ('' — it can): not opened, its line still closed, no resource.
  function boosterBlock(state, id) {
    const spec = BOOSTERS[id];
    if (boosterLevel(state, id) <= 0) return 'Не открыт';
    if (spec.kind === 'line' && !sessionLineOpen(state, spec.line)) return 'Линия ещё не открыта';
    if ((state.rare[spec.resource] || 0) < SUPPLY.useCost) return 'Нет ресурса';
    return '';
  }

  // Pays for the boosters chosen before a construction; false if any cannot go (nothing is paid).
  function spendBoosters(state, ids) {
    if (ids.length > supplySlots(state)) return false;
    const need = {};
    for (let i = 0; i < ids.length; i++) {
      const spec = BOOSTERS[ids[i]];
      if (!spec || boosterLevel(state, ids[i]) <= 0) return false;
      need[spec.resource] = (need[spec.resource] || 0) + SUPPLY.useCost;
    }
    if (Object.keys(need).some(function (key) { return (state.rare[key] || 0) < need[key]; })) return false;
    Object.keys(need).forEach(function (key) { state.rare[key] -= need[key]; });
    save(state);
    return true;
  }

  // ---------- reactor: techno-magic spells ----------
  function spellLevel(state, id) {
    return (state.reactor && state.reactor.spells[id]) || 0;
  }

  // Rare resource (of the spell's school) for its next level; null at the top.
  function spellCost(state, id) {
    const spec = SPELLS[id];
    const level = spellLevel(state, id);
    return level < spec.learn.length ? spec.learn[level] : null;
  }

  function learnSpell(state, id) {
    const spec = SPELLS[id];
    const cost = spellCost(state, id);
    if (!(state.hq.reactor > 0) || cost === null || (state.rare[spec.school] || 0) < cost) return false;
    state.rare[spec.school] -= cost;
    state.reactor.spells[id] = spellLevel(state, id) + 1;
    save(state);
    return true;
  }

  root.MicroBuildersMeta = {
    nightRelief: nightRelief,
    CARDS: CARDS,
    SCHOOL: SCHOOL,
    schoolHasUpgrade: schoolHasUpgrade,
    schoolUpgradeLevel: schoolUpgradeLevel,
    schoolTotalWins: schoolTotalWins,
    schoolUpgradeCost: schoolUpgradeCost,
    schoolUpgradeReason: schoolUpgradeReason,
    buySchoolUpgrade: buySchoolUpgrade,
    mentoringMultiplier: mentoringMultiplier,
    schoolAttempts: schoolAttempts,
    schoolBoss: schoolBoss,
    schoolMilestoneCards: schoolMilestoneCards,
    schoolBossLock: schoolBossLock,
    startSchoolTrial: startSchoolTrial,
    schoolLimitSeconds: schoolLimitSeconds,
    failSchoolTrial: failSchoolTrial,
    recruitPeriod: recruitPeriod,
    recruitCapacity: recruitCapacity,
    setRecruitFocus: setRecruitFocus,
    targetRecruitCost: targetRecruitCost,
    FOREMEN: FOREMEN,
    RARITIES: RARITIES,
    cardValue: cardValue,
    cardPassive: cardPassive,
    passiveStartCoins: passiveStartCoins,
    expertiseLevel: expertiseLevel,
    expertiseProgress: expertiseProgress,
    expertiseWorkers: expertiseWorkers,
    cardExperienceMultiplier: cardExperienceMultiplier,
    gainForemanExperience: gainForemanExperience,
    cardMaxLevel: cardMaxLevel,
    cardInPool: cardInPool,
    rollCard: rollCard,
    refreshRecruiting: refreshRecruiting,
    claimRecruit: claimRecruit,
    goldenFind: goldenFind,
    RARITY_NAMES: RARITY_NAMES,
    OFFICE: OFFICE,
    OFFICE_ROWS: OFFICE_ROWS,
    TECH: TECH,
    TECH_ORDER: TECH_ORDER,
    techUnlocked: techUnlocked,
    techPrerequisites: techPrerequisites,
    missingTechPrerequisites: missingTechPrerequisites,
    techCost: techCost,
    techSeals: techSeals,
    buyTech: buyTech,
    CITY: CITY,
    PROJECTS: PROJECTS,
    RARE_NAMES: RARE_NAMES,
    RARE_KEYS: RARE_KEYS,
    SUPPLY: SUPPLY,
    BOOSTERS: BOOSTERS,
    REACTOR: REACTOR,
    SPELLS: SPELLS,
    boosterLevel: boosterLevel,
    boosterCost: boosterCost,
    buyBooster: buyBooster,
    supplySlots: supplySlots,
    TRAINING: TRAINING,
    TRAINING_UPGRADES: TRAINING_UPGRADES,
    addTrainingXp: addTrainingXp,
    trainingXp: trainingXp,
    trainingUpgradeLevel: trainingUpgradeLevel,
    trainingCost: trainingCost,
    trainingXpCost: trainingXpCost,
    buyTraining: buyTraining,
    trainingStats: trainingStats,
    supplySlotCost: supplySlotCost,
    buySupplySlot: buySupplySlot,
    boosterBlock: boosterBlock,
    spendBoosters: spendBoosters,
    spellLevel: spellLevel,
    spellCost: spellCost,
    learnSpell: learnSpell,
    createState: createState,
    load: load,
    save: save,
    clearSave: clearSave,
    officeCost: officeCost,
    cardUpgradeCost: cardUpgradeCost,
    cardCopiesRequired: cardCopiesRequired,
    foremanSlots: foremanSlots,
    officeUnlocked: officeUnlocked,
    sessionLineOpen: sessionLineOpen,
    SESSION_LINE: SESSION_LINE,
    TECH_CENTER_ORDER: TECH_CENTER_ORDER,
    ADVANCED_TECHS: ADVANCED_TECHS,
    advancedUnlocked: advancedUnlocked,
    centerTechs: centerTechs,
    personnelSeals: personnelSeals,
    officeValue: officeValue,
    metaStats: metaStats,
    levelCapital: levelCapital,
    orderCapital: orderCapital,
    levelMass: levelMass,
    findValue: findValue,
    contractBoardOpen: contractBoardOpen,
    upcomingProjects: upcomingProjects,
    startHqProject: startHqProject,
    finishCityBuilding: finishCityBuilding,
    buyPlot: buyPlot,
    officeChain: officeChain,
    claimChest: claimChest,
    chestsOpen: chestsOpen,
    applyLive: applyLive,
    configureNewCampaign: configureNewCampaign,
    crewOf: crewOf,
    SITE_KEYS: SITE_KEYS,
    siteKey: siteKey,
    siteName: siteName,
    site: site,
    activeSite: activeSite,
    setActiveSite: setActiveSite,
    saveSite: saveSite,
    clearSite: clearSite,
    snapshotSession: snapshotSession,
    restoreCampaign: restoreCampaign,
    applySiteRuntime: applySiteRuntime,
    offlineEfficiency: offlineEfficiency,
    offlineCapSeconds: offlineCapSeconds,
    officeValue2: officeValue2,
    officeEffects: officeEffects,
    OFFICE_SECTIONS: OFFICE_SECTIONS,
    categoryForLevel: categoryForLevel,
    onBlocksPlaced: onBlocksPlaced,
    onLevelComplete: onLevelComplete,
    fillExchange: fillExchange,
    claimAway: claimAway,
    claimOffline: claimOffline,
    buyOffice: buyOffice,
    buildProject: startHqProject,
    upgradeCard: upgradeCard,
    exchangeUpgradeCost: exchangeUpgradeCost,
    EXCHANGE_UPGRADES: EXCHANGE_UPGRADES,
    exchangeValue: exchangeValue,
    exchangeUnlocked: exchangeUnlocked,
    skipCoins: skipCoins,
    startCoinBonus: startCoinBonus,
    exchangeCapacity: exchangeCapacity,
    exchangeReward: exchangeReward,
    specialOrder: specialOrder,
    specialReward: specialReward,
    nextUtcDay: nextUtcDay,
    buyExchangeUpgrade: buyExchangeUpgrade,
    contractLevelIndex: contractLevelIndex,
    contractLimitSeconds: contractLimitSeconds,
    currentContract: currentContract,
    contractReady: contractReady,
    officeSeals: officeSeals,
    exchangeSeals: exchangeSeals,
    cardSeals: cardSeals,
    failContract: failContract,
    foremanSlotsMax: foremanSlotsMax,
    cleanCrew: cleanCrew,
    modeHasCrew: modeHasCrew,
    saveCrewPreset: saveCrewPreset,
    cardSites: cardSites,
    activeRuns: activeRuns,
    equippedBonuses: equippedBonuses,
    storyReward: storyReward,
    storySeals: storySeals,
    orderNiches: orderNiches,
    orderRoles: orderRoles,
    nicheValue: nicheValue,
    applyEnvironment: applyEnvironment,
    DISHES: DISHES,
    PERSONNEL_UPGRADES: PERSONNEL_UPGRADES,
    personnelCost: personnelCost,
    buyPersonnel: buyPersonnel,
    canteenSeats: canteenSeats,
    canteenMaxLevel: canteenMaxLevel,
    canteenMealSeconds: canteenMealSeconds,
    dishOwned: dishOwned,
    buyDish: buyDish,
    discoverDish: discoverDish,
    devFastForward: devFastForward,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
