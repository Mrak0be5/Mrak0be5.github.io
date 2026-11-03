(function () {
  function svg(body) {
    return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }
  const ICONS = {
    build: svg('<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>'),
    hq: svg('<path d="M4 21V9l6-4v16M10 21V5l10 4v12M3 21h18"/><path d="M13.5 10h3M13.5 14h3M6.5 12h1M6.5 16h1"/>'),
    foremen: svg('<path d="M5 13a7 7 0 0 1 14 0z"/><path d="M3.5 13h17M12 6V4.5"/><path d="M7 16.5a5 5 0 0 0 10 0"/>'),
    exchange: svg('<path d="M4 8h13l-3-3M20 16H7l3 3"/>'),
    contract: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h5"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    pause: svg('<path d="M9 6v12M15 6v12"/>'),
    gear: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    chevron: svg('<path d="M6 9.5 12 15l6-5.5"/>'),
    // site chip and HQ signs
    pick: svg('<path d="M5 19 15 9"/><path d="M8.5 4.5Q18 6 19.5 15.5"/>'),
    office: svg('<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2h6v2M3.5 12.5h17"/>'),
    personnel: svg('<path d="M4 10h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2.5 10h19M9.5 6.5c0-1 1-1.5 1-2.5M14 6.5c0-1 1-1.5 1-2.5"/>'),
    truck: svg('<path d="M3 16.5v-10h11v10M14 9.5h4l3 3.5v3.5h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    exit: svg('<path d="M10 4H5v16h5"/><path d="M9 12h11"/><path d="M16 8l4 4-4 4"/>'),
    lock: svg('<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
    crane: svg('<path d="M7 21V4M4 21h7M7 4h13M7 4l4 4M17 4v6M15.5 12h3"/>'),
    smoke: svg('<path d="M3 14h15v4H3zM15 14v4M20 14v4M8 10c-3-3 3-3 0-6M13 10c-3-3 3-3 0-6"/>'),
    // weather badges on the day clock
    snow: svg('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>'),
    heat: svg('<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>'),
    rain: svg('<path d="M7 14.5a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 18.5 9a3.5 3.5 0 0 1-.5 5.5z"/><path d="M8 18l-1 2.5M12.5 18l-1 2.5M17 18l-1 2.5"/>'),
    storm: svg('<path d="M13.5 3 6 13.5h5L10 21l8-11h-5z"/>'),
    quake: svg('<path d="M2.5 12h3l2-5 3.5 10 3-8 2 3h5.5"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
    moon: svg('<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>'),
    chevronUp: svg('<path d="M6 14.5 12 9l6 5.5"/>'),
  };
  window.MicroBuildersIcons = ICONS;

  // Desktop browsers preview the game inside a phone frame: the page is laid out at a real phone size
  // (390×780 portrait, 9:18) and scaled to fit the window, so proportions match the phone exactly.
  // ?frame=0 — full window, ?frame=land — landscape phone (780×390), ?frame=1 — force the portrait frame.
  const PHONE_SHORT = 390;
  const PHONE_LONG = 780;
  const frameParam = new URLSearchParams(window.location.search).get('frame');
  const desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const framed = frameParam === '1' || frameParam === 'land' || (frameParam !== '0' && desktop);
  const landscapeFrame = frameParam === 'land';
  const stage = { width: window.innerWidth, height: window.innerHeight, scale: 1 };
  function fitStage() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!framed) {
      stage.width = w;
      stage.height = h;
      stage.scale = 1;
      return;
    }
    stage.width = landscapeFrame ? PHONE_LONG : PHONE_SHORT;
    stage.height = landscapeFrame ? PHONE_SHORT : PHONE_LONG;
    const margin = 24;
    stage.scale = Math.max(0.3, Math.min((w - margin * 2) / stage.width, (h - margin * 2) / stage.height));
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--stage-w', stage.width + 'px');
    rootStyle.setProperty('--stage-h', stage.height + 'px');
    rootStyle.setProperty('--stage-scale', stage.scale);
  }
  document.documentElement.classList.toggle('framed', framed);
  fitStage();
  window.MicroBuildersStage = {
    framed: framed,
    fit: fitStage,
    width: function () { return stage.width; },
    height: function () { return stage.height; },
    scale: function () { return stage.scale; },
  };
  document.body.insertAdjacentHTML('beforeend', `
<div id="vignette"></div>
<div id="fx-layer" aria-hidden="true"></div>
<div id="new-version" class="dev-only">NEW</div>
<button type="button" id="interface-toggle" class="round-btn" aria-label="Скрыть интерфейс" title="Скрыть интерфейс">${ICONS.eye}</button>
<button type="button" id="camera-home" class="round-btn" aria-label="Вернуть камеру" title="Вернуть камеру" hidden>◎</button>
<div id="worker-log" class="dev-only" hidden></div>
<section id="worker-card" hidden aria-label="Рабочий">
  <header class="worker-card-head">
    <p class="worker-card-name"><b id="worker-card-title">Рабочий</b><span class="worker-card-status" id="worker-card-status"></span></p>
    <button type="button" id="worker-info-toggle" class="info-btn" aria-label="Подробнее о рабочем" aria-expanded="false" aria-controls="worker-card-info">i</button>
    <button type="button" id="worker-card-close" class="worker-card-close" aria-label="Закрыть">×</button>
  </header>
  <div class="worker-card-meters">
    <div class="worker-card-meter" id="worker-card-plan-meter"><span id="worker-card-plan"></span><i><b id="worker-card-plan-bar"></b></i></div>
    <div class="worker-card-meter" id="worker-card-load-meter"><span id="worker-card-load"></span><i><b id="worker-card-load-bar"></b></i></div>
    <div class="worker-card-meter" id="worker-card-xp-meter" hidden><span><img src="icons/icon-training-rankup.jpg" alt=""><span id="worker-card-xp"></span></span><i><b id="worker-card-xp-bar"></b></i></div>
  </div>
  <p class="worker-card-line" id="worker-card-limit"></p>
  <div id="worker-card-needs" class="worker-needs" aria-label="Потребности"></div>
  <p class="worker-card-line worker-info" id="worker-card-info" hidden></p>
  <p class="worker-card-legend" id="worker-card-legend"><span><i class="plan"></i>синий — в плане</span><span><i class="part"></i>жёлтый — несёт часть</span><span><i class="whole"></i>зелёный — несёт весь куб</span></p>
</section>
<details class="dev-only dev-tools">
  <summary>Dev</summary>
  <div class="dev-buttons" id="dev-buttons">
    <button type="button" id="worker-log-toggle" aria-expanded="false">Рабочие</button>
  </div>
  <div class="level-bar">
    <button type="button" class="ghost-btn" id="level-prev" aria-label="Предыдущий уровень">‹</button>
    <select id="level-pick" aria-label="Уровень"></select>
    <button type="button" class="ghost-btn" id="level-next" aria-label="Следующий уровень">›</button>
    <label class="check"><input type="checkbox" id="ghost-toggle" checked>Подсветка</label>
  </div>
  <div class="scaffold-bar">
    <label class="check"><input type="checkbox" id="scaffold-toggle" checked>Леса</label>
    <label class="check">шаг<input id="scaffold-step" type="number" value="1"></label>
    <label class="check">лестница<input id="scaffold-erect" type="number" value="1.15" step="0.01">с</label>
  </div>
  <div class="plan-card">
    <label class="check"><input type="checkbox" id="scaffold-shortcut-routes" checked>Срезы</label>
    <label class="check">раскрытия<input id="scaffold-expansion-budget" type="number" value="10000" step="1000"></label>
    <label class="check">горизонталь<input id="scaffold-horizontal-price" type="number" value="1"></label>
    <label class="check">вертикаль<input id="scaffold-vertical-price" type="number" value="1"></label>
    <label class="check">ступень<input id="scaffold-ladder-price" type="number" value="6"></label>
    <label class="check">доска<input id="scaffold-deck-price" type="number" value="1"></label>
    <label class="check">аварийный проход<input id="scaffold-passage-price" type="number" value="25"></label>
    <label class="check"><input type="checkbox" id="free-purchases">Покупки бесплатно</label>
    <label class="check"><input type="checkbox" data-dev-group="all">Все прокачки сессии</label>
    <label class="check"><input type="checkbox" data-dev-group="workers">Рабочие</label>
    <label class="check"><input type="checkbox" data-dev-group="cubes">Кубы</label>
    <label class="check"><input type="checkbox" data-dev-group="economy">Экономика</label>
    <label class="check"><input type="checkbox" data-dev-group="drones">Дроны</label>
    <label class="check"><input type="checkbox" data-dev-group="loaders">Погрузчики</label>
    <label class="check"><input type="checkbox" data-dev-group="helicopters">Вертолёты</label>
    <label class="check"><input type="checkbox" data-dev-group="elevators">Аэротакси</label>
    <label class="check"><input type="checkbox" data-dev-group="site">Площадка</label>
    <button type="button" class="ghost-btn" id="build-patterns">Паттерны строительства</button>
    <button type="button" class="ghost-btn" id="material-row">Материалы</button>
  </div>
</details>
<nav id="app-nav">
  <button type="button" data-screen="build" class="on">${ICONS.build}<span>Стройка</span><small class="nav-site" id="nav-site"></small></button>
  <button type="button" data-screen="hq">${ICONS.hq}<span>Штаб</span></button>
  <button type="button" data-screen="foremen">${ICONS.foremen}<span>Бригадиры</span><i class="nav-lock" aria-hidden="true">${ICONS.lock}</i></button>
  <button type="button" data-screen="exchange">${ICONS.exchange}<span>Биржа</span><i class="nav-lock" aria-hidden="true">${ICONS.lock}</i></button>
  <button type="button" data-screen="contract">${ICONS.contract}<span>Контракты</span><i class="nav-lock" aria-hidden="true">${ICONS.lock}</i></button>
</nav>
<header id="hud">
  <div class="top">
    <div class="hud-row">
      <div class="coins pill" id="coins" title="Монеты стройки">
        <img class="game-icon currency-icon" src="icons/icon-coins.jpg?v=2" alt="Монеты стройки">
        <span class="coins-text"><b id="coin-value">0</b><small id="coin-rate"></small></span>
        <span class="coin-fx" id="coin-fx" aria-hidden="true"></span>
      </div>
      <div class="pill tokens-pill" id="tokens" title="Жетоны стройки: проходы графа и старт зданий городка">
        <img class="game-icon currency-icon" src="icons/icon-gate-token.jpg" alt="Жетоны"><b id="token-value">0</b>
      </div>
      <button type="button" id="day-clock" class="pill day-clock" aria-haspopup="true" aria-expanded="false" aria-controls="day-pop" aria-label="Время суток и скорость">
        <span class="day-dial" id="day-dial">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle class="dial-track" cx="18" cy="18" r="14"></circle>
            <path class="dial-night" id="dial-night"></path>
            <path class="dial-dawn" id="dial-dawn"></path>
            <path class="dial-day" id="dial-day"></path>
            <path class="dial-dusk" id="dial-dusk"></path>
            <g class="dial-marker" id="dial-marker">
              <circle class="dial-sun" cx="18" cy="4" r="4.4"></circle>
              <circle class="dial-moon" cx="18" cy="4" r="4.4"></circle>
              <circle class="dial-bite" cx="20.2" cy="2.6" r="3.4"></circle>
            </g>
          </svg>
        </span>
        <span class="day-clock-text"><b id="level-time">0:00</b></span>
        <em class="day-tempo playtest-tool" id="day-tempo" hidden></em>
      </button>
      <button type="button" id="settings-toggle" class="round-btn" aria-label="Меню" aria-expanded="false">${ICONS.gear}</button>
      <div id="day-pop" class="hud-pop" hidden>
        <div class="day-pop-head"><p class="day-pop-phase" id="day-pop-phase"></p><button type="button" id="weather-info-toggle" class="info-btn" aria-label="Как погода влияет на стройку" aria-expanded="false" aria-controls="day-pop-info">i</button></div>
        <p id="day-pop-night"></p>
        <p id="day-pop-weather"></p>
        <p id="day-pop-time"></p>
        <div id="day-pop-info" class="sheet-info" hidden><p id="day-pop-details"></p><p id="day-pop-help"></p></div>
        <div class="tempo playtest-tool" role="group" aria-label="Скорость времени">
          <button type="button" data-tempo="0" aria-label="Пауза">${ICONS.pause}</button>
          <button type="button" data-tempo="1" class="on">×1</button>
          <button type="button" data-tempo="5">×5</button>
          <button type="button" data-tempo="20">×20</button>
        </div>
      </div>
      <div id="settings-menu" hidden>
        <button type="button" id="mute">Звук: вкл</button>
        <button type="button" id="quality">Графика: авто</button>
        <button type="button" id="silhouette">Силуэт здания: выкл</button>
        <button type="button" id="tilt">Миниатюра: вкл</button>
        <button type="button" id="hide-interface">Скрыть интерфейс</button>
        <button type="button" id="restart">Начать заказ заново</button>
        <button type="button" id="abandon-run" hidden>Бросить заказ</button>
        <div class="times">
          <div><span>Время смены</span><b id="total-time">0:00</b></div>
        </div>
        <button type="button" id="playtest-report" class="playtest-tool">Отчёт плейтеста</button>
        <div class="menu-jump playtest-tool">
          <label for="jump-level">Перемотать на уровень</label>
          <div class="menu-jump-row">
            <input type="number" id="jump-level" min="1" step="1" inputmode="numeric" placeholder="11">
            <button type="button" id="jump-level-go">Перемотать</button>
          </div>
          <p>Пройдёт уровни до него и вкачает мету по эталонным таймингам: офис, техцентр, биржу и здания штаба.</p>
        </div>
        <p class="menu-danger-label">Опасная зона</p>
        <button type="button" id="reset-company" class="danger">Сбросить прогресс</button>
      </div>
    </div>
    <section class="level-strip" id="level-strip">
      <p class="kicker strip-kicker" id="level-kicker" hidden></p>
      <div class="strip-head">
        <h1 id="level-name"><span id="level-number"></span><span id="level-title"></span></h1>
        <div class="crew-strip" id="crew-strip"></div>
        <button type="button" id="level-info-toggle" class="info-btn" aria-label="Об уровне: материалы и тайминги">i</button>
      </div>
      <div class="strip-bar">
        <div class="bar">
          <i id="bar-fill"></i>
          <button type="button" class="progress-chest" id="chest-25" style="left:25%" data-chest="25" aria-label="Сундук 25%">
            <img src="icons/icon-chest-25.jpg" alt="">
          </button>
          <button type="button" class="progress-chest" id="chest-50" style="left:50%" data-chest="50" aria-label="Сундук 50%">
            <img src="icons/icon-chest-50.jpg" alt="">
          </button>
        </div>
        <b class="strip-pct" id="level-pct">0%</b>
      </div>
      <div class="progress-meta">
        <span id="focus-label"></span>
        <span id="block-count">0 / 0 кубов</span>
      </div>
      <button type="button" class="loss-strip" id="loss-strip" hidden aria-label="Куда уходит время бригады: тайминги"></button>
    </section>
    <button type="button" id="hq-btn" aria-label="В штаб" title="В штаб">${ICONS.exit}</button>
    <button type="button" id="mana-btn" hidden aria-label="Техно-магия: заклинания"><img src="icons/icon-mana.jpg" alt=""><b id="mana-value">0</b></button>
    <button type="button" id="camp-btn" hidden aria-label="Городок: здания стройки" title="Городок"><img src="icons/icon-gate-camp.jpg" alt=""><b id="camp-ready" hidden>0</b></button>
  </div>
  <div class="bottom">
    <button type="button" id="upgrades-open" class="upgrades-btn">${ICONS.chevronUp}<span>Улучшения</span><b id="upgrades-ready" hidden></b></button>
    <section id="upgrade-sheet" hidden>
      <header class="upgrade-sheet-head"><b id="upgrade-sheet-title">Улучшения</b><button type="button" id="repeat-buys" class="advanced-toggle repeat-buys" hidden></button><button type="button" id="advanced-toggle" class="advanced-toggle" hidden>★ Продвинутые<i class="advanced-dot"></i></button><button type="button" id="upgrades-close" class="round-btn" aria-label="Свернуть улучшения">${ICONS.chevron}</button></header>
      <div id="upgrade-graph"></div>
      <p id="graph-tip" hidden></p>
      <div id="advanced-graph" hidden></div>
      <div id="advanced-tip" hidden></div>
      <div class="dock-head">
        <div class="dock-tabs" id="upgrade-tabs" role="tablist"></div>
        <button type="button" id="dock-handle" class="dock-handle" aria-expanded="false" aria-label="Развернуть прокачки">${ICONS.chevronUp}</button>
      </div>
      <div class="dock" id="upgrade-dock"></div>
    </section>
  </div>
</header>
<button type="button" id="site-chip" hidden aria-label="Вернуться на стройку">${ICONS.pick}<span id="site-chip-text"></span><b aria-hidden="true">›</b></button>
<button type="button" id="next-cta" class="primary" hidden>Следующий заказ ▸</button>
<div id="lucky-pop" hidden aria-live="polite"><img id="lucky-pop-img" alt=""><div><b id="lucky-pop-title"></b><span id="lucky-pop-text"></span></div></div>
<div id="city-wallet" hidden></div>
<div id="city-signs"></div>
<section id="city-card" hidden></section>
<section id="level-info" hidden>
  <div class="level-info-card">
    <div class="level-info-tabs" id="level-info-tabs">
      <button type="button" data-tab="main" class="on">Обзор</button>
      <button type="button" data-tab="time">Тайминги</button>
    </div>
    <div class="level-info-pane" id="level-info-main">
      <div class="level-info-summary" id="level-info-summary"></div>
      <p class="level-info-label">Доход по текущим прокачкам</p>
      <div class="level-info-sim" id="level-info-sim"></div>
      <p class="level-info-label">Материалы</p>
      <ul class="level-info-rows" id="level-info-rows"></ul>
    </div>
    <div class="level-info-pane" id="level-info-time" hidden>
      <div class="level-info-summary" id="level-info-time-summary"></div>
      <div class="level-time-tools">
        <p class="level-info-label" id="level-info-time-label">Время рабочих по состояниям, сумма по бригаде</p>
        <label class="check"><input type="checkbox" id="level-time-categories">По прокачкам</label>
      </div>
      <ul class="level-time-rows" id="level-info-time-rows"></ul>
    </div>
  </div>
</section>
<section id="meta-panel" class="hidden" aria-labelledby="meta-title">
  <header class="panel-head">
    <div class="panel-titles">
      <p class="kicker" id="meta-kicker"></p>
      <h2 id="meta-title"></h2>
    </div>
    <button type="button" class="overlay-close" id="panel-close" aria-label="Закрыть">×</button>
    <div class="panel-wallet" id="panel-wallet" hidden></div>
    <span class="coin-fx wallet-fx" id="wallet-fx" aria-hidden="true"></span>
  </header>
  <div id="meta-content"></div>
</section>
<div id="toast-lane" aria-live="polite"></div>
<div id="overlay-root"><div class="overlay-backdrop"></div></div>
`);
  if (new URLSearchParams(window.location.search).get('dev') === '1') {
    document.body.classList.add('dev-mode');
  }
  // Playtest tools (.playtest-tool: the speed row and its label on the clock, «Отчёт плейтеста»,
  // «Перемотать на уровень») are for everyone while the game is playtested. RELEASE hides them unless
  // ?dev=1; ?release=1 shows the release look on a playtest build.
  const RELEASE = false;
  if (RELEASE || new URLSearchParams(window.location.search).get('release') === '1') {
    document.body.classList.add('release');
  }
  const upgradeGroups = [
    { id: 'workers', title: 'Рабочие', items: [
      ['builders', 'Число рабочих'],
      ['speed', 'Скорость стройки'],
      ['carry', 'Ноша'],
      ['pickup', 'Скорость набора'],
      ['horizontal', 'Горизонталь'],
      ['vertical', 'Вертикаль'],
      ['smokeRare', 'Реже перекуры'],
      ['smokeShort', 'Короче перекуры'],
      ['smokeHabit', 'Медленнее привычка'],
      ['willpower', 'Сила воли'],
      ['plan', 'План работ'],
    ]},
    { id: 'cubes', title: 'Кубы', items: [
      ['lightCarry', 'Снижение веса'],
      ['cubePay', 'Деньги за куб'],
      ['cubeCapital', 'Сортировка находок'],
      ['findValue', 'Ценные находки'],
    ]},
    { id: 'economy', title: 'Экономика', items: [
      ['payMultiplier', 'Множитель стройки'],
      ['floorPay', 'Множитель этажа'],
      ['freeBuy', 'Бесплатная покупка'],
      ['triplePay', 'Шанс удачи'],
      ['triplePower', 'Множитель удачи'],
      ['handoverPay', 'Премия за сдачу'],
      ['cubeGift', 'Подарок за куб'],
      ['tokenBuy', 'Жетон стройки'],
    ]},
    { id: 'needs', title: 'Быт', items: [
      ['satiety', 'Запас сытости'],
      ['mealFast', 'Быстрый обед'],
      ['sleepFast', 'Здоровый сон'],
      ['coffee', 'Термос с кофе'],
      ['nightGear', 'Каски с фонарями'],
    ]},
    { id: 'training', title: 'Обучение', items: [
      ['xpRate', 'Быстрое обучение'],
      ['hireXp', 'Опыт при найме'],
      ['rankFast', 'Ускоренная аттестация'],
    ]},
    { id: 'weather', title: 'Погода', items: [
      ['winterGear', 'Зимняя спецовка'],
      ['rainTents', 'Тенты над раствором'],
      ['heatGear', 'Вода и панамы'],
      ['lightningRods', 'Громоотводы'],
    ]},
    { id: 'drones', title: 'Дроны', items: [
      ['engineers', 'Число дронов'],
      ['droneSpeed', 'Скорость полёта'],
      ['gather', 'Набор дроном'],
      ['droneBuild', 'Кладка дроном'],
    ]},
    { id: 'loaders', title: 'Погрузчики', items: [
      ['vehicles', 'Число погрузчиков'],
      ['loaderSpeed', 'Скорость хода'],
      ['boomSpeed', 'Скорость стрелы'],
      ['loaderMass', 'Груз погрузчика'],
      ['patternHeight', 'Высота объекта'],
      ['bucket', 'Ковш'],
      ['vehicleHeight', 'Высота стрелы'],
      ['vehicleReach', 'Глубина стрелы'],
    ]},
    { id: 'helicopters', title: 'Вертолёты', items: [
      ['helicopters', 'Число вертолётов'],
      ['heliSpeed', 'Скорость вертолёта'],
      ['heliMass', 'Груз вертолёта'],
      ['heliWidth', 'Ширина груза'],
      ['heliHeight', 'Высота груза'],
    ]},
    { id: 'elevators', title: 'Леса и аэротакси', items: [
      ['scaffold', 'Леса и настилы'],
      ['scaffoldDurability', 'Прочный крепёж'],
      ['deckWalk', 'Уверенные настилы'],
      ['elevators', 'Аэротакси'],
      ['elevatorSpeed', 'Скорость аэротакси'],
      ['elevatorHeight', 'Потолок аэротакси'],
    ]},
    // The camp buildings, their levels and upgrades are bought in each building's window (game.js →
    // campUpgradesHtml); only the shared «Типовые проекты» stay a card here.
    { id: 'site', title: 'Городок', items: [
      ['campPrefab', 'Типовые проекты'],
    ]},
  ];
  window.MicroBuildersUpgradeGroups = upgradeGroups;
  const dock = document.getElementById('upgrade-dock');
  // Card: icon, name, value «было → станет», then the level «Ур. 4/10» and the cost pill whose fill
  // shows how much of the price is saved up (game.js paintUpgrade / paintDockFill).
  upgradeGroups.forEach(function (group) {
    const column = document.createElement('section');
    column.className = 'upgrade-group';
    column.dataset.groupId = group.id;
    const title = document.createElement('h3');
    title.textContent = group.title;
    column.appendChild(title);
    group.items.forEach(function (item) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'upgrade';
      button.id = 'up-' + item[0];
      button.dataset.group = group.id;
      const name = document.createElement('small');
      name.id = item[0] + '-name';
      name.textContent = item[1];
      name.dataset.name = item[1];
      const label = document.createElement('strong');
      label.id = item[0] + '-label';
      label.textContent = '—';
      const foot = document.createElement('span');
      foot.className = 'upgrade-foot';
      const level = document.createElement('i');
      level.className = 'upgrade-level';
      level.id = item[0] + '-level';
      const cost = document.createElement('em');
      cost.id = item[0] + '-cost';
      cost.textContent = '';
      foot.appendChild(level);
      foot.appendChild(cost);
      button.appendChild(name);
      button.appendChild(label);
      button.appendChild(foot);
      column.appendChild(button);
    });
    dock.appendChild(column);
  });
  const upgradeIcons = {
    builders: 'icon-up-builders.jpg',
    speed: 'icon-up-speed.jpg',
    carry: 'icon-up-carry.jpg',
    horizontal: 'icon-up-horizontal.jpg',
    vertical: 'icon-up-vertical.jpg',
    plan: 'icon-up-plan.jpg',
    vehicles: 'icon-up-vehicles.jpg',
    vehicleHeight: 'icon-up-vehicle-height.jpg',
    vehicleReach: 'icon-up-vehicle-reach.jpg',
    scaffold: 'icon-up-scaffold.jpg',
    kitchen: 'icon-up-kitchen.jpg',
    sales: 'icon-up-sales.jpg',
    dorm: 'icon-up-dorm.jpg',
    lounge: 'icon-up-lounge.jpg',
    light: 'icon-up-light.jpg',
    pickup: 'icon-up-pickup.jpg',
    lightCarry: 'icon-up-light-carry.jpg',
    smokeRare: 'icon-up-smoke-rare.jpg',
    smokeShort: 'icon-up-smoke-short.jpg',
    cubePay: 'icon-up-cube-pay.jpg',
    payMultiplier: 'icon-up-pay-multiplier.jpg',
    floorPay: 'icon-up-floor-pay.jpg',
    cubeCapital: 'icon-up-cube-capital.jpg',
    freeBuy: 'icon-up-free-buy.jpg',
    triplePay: 'icon-up-triple-pay.jpg',
    triplePower: 'icon-up-triple-power.jpg',
    engineers: 'icon-up-drones.jpg',
    droneBuild: 'icon-up-drone-build.jpg',
    gather: 'icon-up-gather.jpg',
    droneSpeed: 'icon-up-drone-speed.jpg',
    loaderMass: 'icon-up-loader-mass.jpg',
    bucket: 'icon-up-bucket.jpg',
    patternHeight: 'icon-up-pattern-height.jpg',
    loaderSpeed: 'icon-up-loader-speed.jpg',
    boomSpeed: 'icon-up-boom-speed.jpg',
    helicopters: 'icon-up-helicopters.jpg',
    heliMass: 'icon-up-heli-mass.jpg',
    heliWidth: 'icon-up-heli-width.jpg',
    heliHeight: 'icon-up-heli-height.jpg',
    heliSpeed: 'icon-up-heli-speed.jpg',
    elevators: 'icon-up-elevators.jpg',
    elevatorSpeed: 'icon-up-elevator-speed.jpg',
    elevatorHeight: 'icon-up-elevator-height.jpg',
    campPrefab: 'icon-up-camp-prefab.jpg',
    portions: 'icon-up-portions.jpg',
    chef: 'icon-up-chef.jpg',
    salesAds: 'icon-up-sales-ads.jpg',
    lightPower: 'icon-up-light-power.jpg',
    loungeSeats: 'icon-up-lounge-seats.jpg',
    smokePath: 'icon-up-smoke-path.jpg',
    reactor: 'icon-reactor-core.jpg',
    dormBeds: 'icon-up-dorm-beds.jpg',
    dormSleep: 'icon-up-dorm-sleep.jpg',
    // New lines of 29.10 (sheet icons/src/sheet-i.png).
    scaffoldDurability: 'icon-up-scaffold-durability.jpg',
    deckWalk: 'icon-up-deck-walk.jpg',
    smokeHabit: 'icon-up-smoke-habit.jpg',
    willpower: 'icon-up-willpower.jpg',
    satiety: 'icon-up-satiety.jpg',
    mealFast: 'icon-up-meal-fast.jpg',
    sleepFast: 'icon-up-sleep-fast.jpg',
    coffee: 'icon-up-coffee.jpg',
    nightGear: 'icon-up-night-gear.jpg',
    handoverPay: 'icon-up-handover-pay.jpg',
    findValue: 'icon-up-find-value.jpg',
    cubeGift: 'icon-up-cube-gift.jpg',
    tokenBuy: 'icon-adv-tokens.jpg',
    xpRate: 'icon-up-xp-rate.jpg',
    hireXp: 'icon-up-hire-xp.jpg',
    rankFast: 'icon-up-rank-fast.jpg',
    // sheet icons/src/sheet-j.png
    winterGear: 'icon-up-winter-gear.jpg',
    rainTents: 'icon-up-rain-tents.jpg',
    heatGear: 'icon-up-heat-gear.jpg',
    lightningRods: 'icon-up-lightning-rods.jpg',
  };
  document.querySelectorAll('.upgrade').forEach(function (button) {
    const kind = button.id.slice(3);
    const img = document.createElement('img');
    img.className = 'game-icon';
    img.alt = '';
    img.src = 'icons/' + (upgradeIcons[kind] || 'icon-up-speed.jpg');
    button.insertBefore(img, button.firstChild);
  });

  // The tech center (game.js) draws the same graph with the same icons.
  window.MicroBuildersUpgradeIcons = upgradeIcons;

  // ---------- upgrade graph (docs/gdd/02-construction-session.md «Граф прокачек») ----------
  // A tree from «План работ»: every node opens once its parent has a level. Shown: what is bought,
  // what can be bought now (or waits for the office), and one node deeper as a dim preview. The
  // layout and the nodes are upgrade-graph.js (the tech center draws the same tree).
  // [kind, parent] — parents come before their children.
  const UPGRADE_TREE = window.MicroBuildersBalance.upgradeTree;
  // Gateway nodes: empty passes to a themed block of lines («Парк техники», «Экономика», …), drawn as
  // hexagons with their own icon; never two in a row. A pass is opened with the site's tokens
  // (logic.js → buyGate; states[id] = { passed, researched, needs, ready, cost }). A pass whose block has
  // nothing researched in the tech center is shut: grey with a lock, nothing behind it shows.
  const GATES = window.MicroBuildersBalance.gates || {};
  const graphTip = document.getElementById('graph-tip');
  const cardName = {};
  upgradeGroups.forEach(function (group) { group.items.forEach(function (item) { cardName[item[0]] = item[1]; }); });
  const graph = window.MicroBuildersGraph.create({
    root: document.getElementById('upgrade-graph'),
    tree: UPGRADE_TREE,
    gates: GATES,
    icon: function (kind) { return upgradeIcons[kind] || 'icon-up-speed.jpg'; },
    name: function (kind) { return cardName[kind]; },
    onSelect: function (kind) { selectGraphNode(kind); },
  });
  const treeParent = graph.parent;
  const graphNodes = graph.nodes;
  let graphView = {};
  let graphSelected = null;
  let graphStates = null;
  // What the tip of the tapped node was written for: redrawn when its view (or a pass's state) changes.
  let graphTipKey = '';

  function graphTipKeyOf(kind) {
    const s = graphStates && graphStates[kind];
    return graphView[kind] + (GATES[kind] && s ? ':' + !!s.passed + ':' + !!s.ready + ':' + s.researched : s ? ':' + s.level : '');
  }

  function graphViewOf(kind, states) {
    const parent = treeParent[kind];
    // A gateway: passed — like a bought line; can be opened (its line has a level) — available, or
    // locked while its block has nothing researched; one step further it shows as «?».
    if (GATES[kind]) {
      const gate = states[kind] || {};
      if (gate.passed) return 'owned';
      const above = graphView[parent];
      if (above === 'owned') return gate.researched === false ? 'office' : 'available';
      return above === 'available' ? 'preview' : 'hidden';
    }
    const s = states[kind];
    const own = s.state === 'office' ? 'office' : s.level > 0 ? 'owned' : 'available';
    if (!parent || s.level > 0) return own;
    const above = graphView[parent];
    if (above === 'owned') return own;
    // One step past what can be bought now, as a «?»; nothing past a line the office still holds.
    if (above === 'available') return 'preview';
    return 'hidden';
  }

  function showGraphTip(text) {
    graphTip.textContent = text;
    graphTip.hidden = !text;
  }

  function selectGraphNode(kind) {
    if (graphSelected) {
      const card = document.getElementById('up-' + graphSelected);
      if (card) card.classList.remove('pop');
    }
    graphSelected = kind;
    graph.select(kind);
    showGraphTip('');
    graphTipKey = kind ? graphTipKeyOf(kind) : '';
    if (!kind) return;
    const view = graphView[kind];
    const s = graphStates && graphStates[kind];
    if (GATES[kind]) {
      const gate = s || {};
      const cost = GATES[kind].tokens || 1;
      const head = 'Проход «' + GATES[kind].name + '» — ' + GATES[kind].text.toLowerCase() + '.';
      if (gate.passed) showGraphTip(head + ' Открыт.');
      else if (view === 'office') {
        showGraphTip(head + ' Закрыт: изучите в техцентре хотя бы одну технологию этого блока' + (gate.needs ? ' — начните с ' + gate.needs : '') +
          ', тогда проход откроется за ' + cost + ' жетон.');
      }
      else if (view === 'available') {
        showGraphTip(head);
        graphTip.insertAdjacentHTML('beforeend', ' <button type="button" class="gate-open-btn' + (gate.ready ? '' : ' short') + '" data-gate-open="' + kind + '">' +
          'Открыть за <img src="icons/icon-gate-token.jpg" alt="жетон">' + cost + '</button>');
      } else {
        const after = ' Откроется после «' + (cardName[window.MicroBuildersUpgradeGraph.parent(kind)] || '') + '» за ' + cost + ' жетон';
        showGraphTip(head + after + (gate.researched === false
          ? ' — когда в техцентре будет изучена хотя бы одна технология этого блока' + (gate.needs ? ' (начните с ' + gate.needs + ')' : '') + '.'
          : '.'));
      }
    } else if (view === 'preview') {
      showGraphTip('Что здесь — узнаете, когда прокачаете «' + (cardName[treeParent[kind]] || '') + '»');
    } else if (view === 'office') {
      showGraphTip((cardName[kind] || '') + ' откроется ' + (s && s.lockText ? s.lockText : 'позже'));
    } else {
      document.getElementById('up-' + kind).classList.add('pop');
      // What one more level does to this site (game.js): «до сдачи ~6 мин → ~5 мин».
      const impact = window.MicroBuildersUpgradeGraph.impact ? window.MicroBuildersUpgradeGraph.impact(kind) : '';
      if (impact) showGraphTip((cardName[kind] || '') + ': ' + impact);
    }
  }

  // «Открыть за 1 жетон» in the tip of a pass (game.js sets MicroBuildersUpgradeGraph.onGate).
  graphTip.addEventListener('click', function (event) {
    const button = event.target.closest('[data-gate-open]');
    if (!button || !window.MicroBuildersUpgradeGraph.onGate) return;
    if (window.MicroBuildersUpgradeGraph.onGate(button.dataset.gateOpen)) selectGraphNode(button.dataset.gateOpen);
  });

  let graphCentred = false;
  function setUpgradeSheet(open) {
    document.getElementById('upgrade-sheet').hidden = !open;
    document.body.classList.toggle('upgrades-open', open);
    if (!open) selectGraphNode(null);
    if (open && !graphCentred) {
      // First look: the root in the middle of the sheet.
      graphCentred = true;
      graph.centre();
    }
  }
  document.getElementById('upgrades-open').addEventListener('click', function () { setUpgradeSheet(true); });
  document.getElementById('upgrades-close').addEventListener('click', function () { setUpgradeSheet(false); });

  window.MicroBuildersUpgradeGraph = {
    // The nearest line above (gateways are passes, not lines).
    parent: function (kind) {
      let parent = treeParent[kind] || null;
      while (parent && GATES[parent]) parent = treeParent[parent] || null;
      return parent;
    },
    // states[kind] = { state: 'open' | 'office', level, ready, maxed, lockText («в техцентре: «…»») }
    paint: function (states) {
      graphStates = states;
      graphView = {};
      let ready = 0;
      UPGRADE_TREE.forEach(function (pair) {
        const kind = pair[0];
        const view = graphViewOf(kind, states);
        graphView[kind] = view;
        if (GATES[kind]) {
          // A pass that can be opened now (tokens enough) pulses like an affordable line.
          const gateReady = view === 'available' && !!(states[kind] && states[kind].ready);
          if (gateReady) ready += 1;
          graphNodes[kind].classList.toggle('is-ready', gateReady);
          return;
        }
        const node = graphNodes[kind];
        const s = states[kind];
        const canBuy = (view === 'owned' || view === 'available') && s.ready;
        if (canBuy) ready += 1;
        node.classList.toggle('is-ready', canBuy);
        // Open but the coins are short: the icon dims a quarter, still in colour.
        node.classList.toggle('is-short', (view === 'owned' || view === 'available') && !canBuy && !s.maxed);
        node.classList.toggle('is-max', s.maxed);
        const level = node.firstElementChild.nextElementSibling;
        const text = view === 'owned' ? String(s.level) : '';
        if (level.textContent !== text) level.textContent = text;
      });
      // is-owned / is-preview / is-office, the links and what is hidden: upgrade-graph.js.
      if (graph.paint(graphView) && graphSelected && graphView[graphSelected] === 'hidden') selectGraphNode(null);
      // A tapped node whose view changed under the tip (a pass researched in the HQ, its line bought): new tip.
      else if (graphSelected && graphTipKeyOf(graphSelected) !== graphTipKey) selectGraphNode(graphSelected);
      // game.js → paintAdvanced adds what the advanced star offers to this count.
      const badge = document.getElementById('upgrades-ready');
      badge.dataset.graph = String(ready);
      badge.hidden = ready === 0;
      if (!badge.hidden) badge.textContent = String(ready);
    },
    close: function () { setUpgradeSheet(false); },
  };

  // Upgrade drawer: one category visible at a time; a green badge on the other tabs counts what is
  // affordable there. The handle (outside the scrolling tabs) switches one card row ↔ two.
  const tabs = document.getElementById('upgrade-tabs');
  let activeTab = upgradeGroups[0].id;
  upgradeGroups.forEach(function (group) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'dock-tab';
    tab.dataset.tab = group.id;
    tab.setAttribute('role', 'tab');
    tab.innerHTML = '<span>' + group.title + '</span><b class="dock-badge" hidden></b>';
    tabs.appendChild(tab);
  });

  function syncUpgradeTabs() {
    const columns = dock.querySelectorAll('.upgrade-group');
    let activeVisible = false;
    let firstVisible = null;
    columns.forEach(function (column) {
      const id = column.dataset.groupId;
      if (!column.hidden && !firstVisible) firstVisible = id;
      if (!column.hidden && id === activeTab) activeVisible = true;
    });
    if (!activeVisible && firstVisible) activeTab = firstVisible;
    columns.forEach(function (column) {
      const id = column.dataset.groupId;
      const tab = tabs.querySelector('[data-tab="' + id + '"]');
      const on = id === activeTab;
      tab.hidden = column.hidden;
      tab.classList.toggle('on', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      column.classList.toggle('active', on);
      const ready = on ? 0 : column.querySelectorAll('.upgrade.ready:not([hidden])').length;
      const badge = tab.querySelector('.dock-badge');
      if (badge.hidden !== (ready === 0)) badge.hidden = ready === 0;
      if (ready > 0 && badge.textContent !== String(ready)) badge.textContent = ready;
    });
  }
  window.MicroBuildersSyncUpgradeTabs = syncUpgradeTabs;
  tabs.addEventListener('click', function (event) {
    const tab = event.target.closest('[data-tab]');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    dock.scrollLeft = 0;
    syncUpgradeTabs();
  });
  syncUpgradeTabs();

  const dockHandle = document.getElementById('dock-handle');
  const DOCK_KEY = 'mb.dockExpanded';
  function setDockExpanded(expanded, remember) {
    document.body.classList.toggle('dock-expanded', expanded);
    dockHandle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    dockHandle.setAttribute('aria-label', expanded ? 'Свернуть прокачки' : 'Развернуть прокачки');
    if (!remember) return;
    try {
      localStorage.setItem(DOCK_KEY, expanded ? '1' : '0');
    } catch (error) { /* private mode: the choice lasts until reload */ }
  }
  let dockStored = null;
  try {
    dockStored = localStorage.getItem(DOCK_KEY);
  } catch (error) { /* no storage */ }
  setDockExpanded(dockStored === '1', false);
  dockHandle.addEventListener('click', function () {
    setDockExpanded(!document.body.classList.contains('dock-expanded'), true);
  });

  [['worker-info-toggle', 'worker-card-info'], ['weather-info-toggle', 'day-pop-info']].forEach(function (ids) {
    const button = document.getElementById(ids[0]);
    const panel = document.getElementById(ids[1]);
    button.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      button.classList.toggle('on', !panel.hidden);
      button.setAttribute('aria-expanded', String(!panel.hidden));
    });
  });

  // HUD popovers: the menu ☰ and the day clock. One at a time; a tap anywhere else closes them.
  const hudPops = [
    { button: document.getElementById('settings-toggle'), panel: document.getElementById('settings-menu') },
    { button: document.getElementById('day-clock'), panel: document.getElementById('day-pop') },
  ];
  function setHudPop(target) {
    hudPops.forEach(function (pop) {
      const open = pop === target;
      pop.panel.hidden = !open;
      pop.button.classList.toggle('on', open);
      pop.button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Back and Escape close an open popover first (see the layers below).
    setLayer('hud-pop', target ? function () { setHudPop(null); } : null);
  }
  hudPops.forEach(function (pop) {
    pop.button.addEventListener('click', function () { setHudPop(pop.panel.hidden ? pop : null); });
  });
  document.addEventListener('pointerdown', function (event) {
    const open = hudPops.find(function (pop) { return !pop.panel.hidden; });
    if (!open) return;
    if (open.panel.contains(event.target) || open.button.contains(event.target)) return;
    setHudPop(null);
  });
  const settingsMenu = document.getElementById('settings-menu');
  settingsMenu.addEventListener('click', function (event) {
    // «Звук», «Графика», «Силуэт здания» и «Миниатюра» stay open to show their new state; the others lead somewhere else.
    if (event.target.closest('button') && !event.target.closest('#mute, #quality, #silhouette, #tilt')) setHudPop(null);
  });
  window.MicroBuildersHudPop = {
    close: function () { setHudPop(null); },
    isOpen: function () { return hudPops.some(function (pop) { return !pop.panel.hidden; }); },
  };

  // ---------- windows: one stack over one shared backdrop ----------
  // MicroBuildersUI.overlay.open(spec) → handle. spec:
  //   id          — unique; opening an id that is already open (or queued) updates it in place
  //   type        — 'dialog' (centred card), 'sheet' (bottom sheet) or 'screen' (full screen)
  //   kicker, title, body (HTML string, a Node, or function (bodyEl, handle) that fills it)
  //   actions     — [{ label, primary, danger, hold (ms to keep pressed), close (default true),
  //                   id, disabled, onClick(handle) }]: the primary one is the wide bottom button,
  //                   the rest are text buttons
  //   closable    — default true: round × in the header, Escape, browser/Android Back
  //   backdrop    — tap outside closes (default: closable and not a 'screen')
  //   queue       — wait until no other window is open (lifecycle messages one after another)
  //   onOpen(handle), onClose(reason, handle) — reason: 'action', 'close', 'escape', 'back',
  //                   'backdrop', 'program', 'closeAll'
  //   className, domId (id attribute of the window element)
  // While anything is open: body.has-modal (HUD, nav and the scene take no input) and keys other
  // than Escape/Tab/Enter/Space do not reach the game (camera keys, 1-0 purchase hotkeys).
  const overlayRoot = document.getElementById('overlay-root');
  const backdrop = overlayRoot.querySelector('.overlay-backdrop');
  const stack = [];
  const waiting = [];
  let overlaySeq = 0;
  // Back support: while any window or layer is open the current history entry carries OVERLAY_MARK. Our own
  // history.back() (all windows closed) is in flight until its popstate arrives (backPending).
  const OVERLAY_MARK = 'microBuildersOverlay';
  // Opened from disk, Chrome refuses history entries from the frame («Unsafe attempt to load URL
  // file:///…»): there windows close only by ×, Escape and the backdrop.
  const HISTORY_BACK = location.protocol !== 'file:';
  let backPending = false;
  let backPendingTimer = 0;
  let unwindTimer = 0;
  // Layers: screens that are not windows — company panels, the HQ lot card, the HUD popovers. They
  // keep the nav and the scene live (no backdrop, no has-modal), but Back and Escape close them too:
  // windows first, then the last layer set. setLayer(id, onBack) registers one (null drops it); Back
  // drops the top one and calls its onBack, which may set the layer under it again.
  const layers = [];

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function closable(entry) {
    return entry.spec.closable !== false;
  }

  function findEntry(id) {
    for (let i = 0; i < stack.length; i++) if (stack[i].id === id) return stack[i];
    for (let i = 0; i < waiting.length; i++) if (waiting[i].id === id) return waiting[i];
    return null;
  }

  function createEntry(spec) {
    const entry = { id: spec.id || 'overlay-' + (++overlaySeq), spec: spec, el: null, closed: false };
    entry.handle = {
      id: entry.id,
      get el() { return entry.el; },
      get body() { return entry.el ? entry.el.querySelector('.overlay-body') : null; },
      isOpen: function () { return !!entry.el && !entry.closed; },
      close: function (reason) { closeEntry(entry, reason || 'program'); },
      update: function (patch) {
        Object.assign(entry.spec, patch || {});
        if (entry.el) renderEntry(entry);
      },
    };
    return entry;
  }

  function renderEntry(entry) {
    const spec = entry.spec;
    const el = entry.el;
    const type = spec.type || 'dialog';
    el.className = 'overlay overlay-' + type + (spec.className ? ' ' + spec.className : '');
    el.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'overlay-card';
    if (spec.kicker || spec.title || closable(entry)) {
      const head = document.createElement('header');
      head.className = 'overlay-head';
      head.innerHTML = '<div class="overlay-titles">' +
        (spec.kicker ? '<p class="kicker">' + escapeHtml(spec.kicker) + '</p>' : '') +
        (spec.title ? '<h2>' + escapeHtml(spec.title) + '</h2>' : '') + '</div>';
      if (closable(entry)) {
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'overlay-close';
        close.setAttribute('aria-label', 'Закрыть');
        close.textContent = '×';
        close.addEventListener('click', function () { closeEntry(entry, 'close'); });
        head.appendChild(close);
      }
      card.appendChild(head);
    }
    const body = document.createElement('div');
    body.className = 'overlay-body';
    card.appendChild(body);
    if (typeof spec.body === 'string') body.innerHTML = spec.body;
    else if (spec.body && spec.body.nodeType) body.appendChild(spec.body);
    const actions = spec.actions || [];
    if (actions.length > 0) {
      const foot = document.createElement('footer');
      foot.className = 'overlay-actions';
      actions.forEach(function (action) { foot.appendChild(actionButton(entry, action)); });
      card.appendChild(foot);
    }
    el.appendChild(card);
    if (typeof spec.body === 'function') spec.body(body, entry.handle);
  }

  function actionButton(entry, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action.primary ? 'primary overlay-primary' : 'overlay-text-btn';
    if (action.danger) button.classList.add('danger');
    if (action.id) button.id = action.id;
    if (action.disabled) button.disabled = true;
    const label = document.createElement('span');
    label.textContent = action.label;
    button.appendChild(label);
    function run() {
      const click = action.onClick ? function () { action.onClick(entry.handle); } : null;
      if (action.close !== false) closeEntry(entry, 'action', click);
      else if (click) click();
    }
    if (!action.hold) {
      button.addEventListener('click', run);
      return button;
    }
    // Hold to confirm: a fill runs across the button; letting go early cancels.
    button.classList.add('hold-btn');
    const fill = document.createElement('i');
    fill.className = 'hold-fill';
    button.insertBefore(fill, label);
    let timer = 0;
    function cancel() {
      clearTimeout(timer);
      timer = 0;
      button.classList.remove('holding');
      fill.style.transitionDuration = '0.15s';
    }
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      cancel();
      fill.style.transitionDuration = action.hold + 'ms';
      button.classList.add('holding');
      timer = setTimeout(function () {
        timer = 0;
        run();
      }, action.hold);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (type) {
      button.addEventListener(type, function () { if (timer) cancel(); });
    });
    return button;
  }

  function syncOverlays() {
    const open = stack.length > 0;
    document.body.classList.toggle('has-modal', open);
    overlayRoot.classList.toggle('open', open);
    if (open) {
      const top = stack[stack.length - 1];
      overlayRoot.insertBefore(backdrop, top.el);
      backdrop.className = 'overlay-backdrop backdrop-' + (top.spec.type || 'dialog');
      stack.forEach(function (entry, i) { entry.el.classList.toggle('is-top', i === stack.length - 1); });
    }
    syncHistory();
  }

  function markedEntry() {
    try {
      return !!(history.state && history.state[OVERLAY_MARK]);
    } catch (error) {
      return false;
    }
  }

  // One marked history entry while any window or layer is open, so Back closes the top one instead of
  // leaving the page. history.back() is asynchronous: it is deferred (an action often closes one
  // window and opens the next in the same task, and then there is nothing to unwind) and, while it
  // is in flight, no new entry is pushed — its popstate re-arms if a window opened meanwhile.
  function syncHistory() {
    if (!HISTORY_BACK || backPending) return;
    if (backArmed()) {
      clearTimeout(unwindTimer);
      if (markedEntry()) return;
      try {
        const state = {};
        state[OVERLAY_MARK] = true;
        history.pushState(state, '');
      } catch (error) { /* file:// or sandboxed frames */ }
      return;
    }
    if (!markedEntry()) return;
    clearTimeout(unwindTimer);
    unwindTimer = setTimeout(function () {
      if (backArmed() || backPending || !markedEntry()) return;
      backPending = true;
      // Safety net: a Back that never reports (no previous entry) must not block the history forever.
      backPendingTimer = setTimeout(function () {
        backPending = false;
        syncHistory();
      }, 3000);
      history.back();
    }, 0);
  }

  // Back has something to close: a window or a layer.
  function backArmed() {
    return stack.length > 0 || layers.length > 0;
  }

  function setLayer(id, onBack) {
    const index = layers.findIndex(function (layer) { return layer.id === id; });
    if (onBack && index >= 0) {
      layers[index].onBack = onBack;
      return;
    }
    if (!onBack && index < 0) return;
    if (onBack) layers.push({ id: id, onBack: onBack });
    else layers.splice(index, 1);
    syncHistory();
  }

  // Back or Escape with no window open: the top layer closes. False when there is none.
  function backLayer() {
    const top = layers.pop();
    if (!top) return false;
    top.onBack();
    syncHistory();
    return true;
  }

  function mountEntry(entry) {
    const el = document.createElement('section');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.dataset.overlay = entry.id;
    if (entry.spec.domId) el.id = entry.spec.domId;
    entry.el = el;
    renderEntry(entry);
    overlayRoot.appendChild(el);
    stack.push(entry);
    syncOverlays();
    if (entry.spec.onOpen) entry.spec.onOpen(entry.handle);
  }

  function openOverlay(spec) {
    const existing = spec.id ? findEntry(spec.id) : null;
    if (existing) {
      existing.spec = spec;
      if (existing.el) renderEntry(existing);
      return existing.handle;
    }
    const entry = createEntry(spec);
    if (spec.queue && (stack.length > 0 || waiting.length > 0)) {
      waiting.push(entry);
      return entry.handle;
    }
    mountEntry(entry);
    return entry.handle;
  }

  function closeEntry(entry, reason, then) {
    if (entry.closed) return;
    entry.closed = true;
    const queued = waiting.indexOf(entry);
    if (queued >= 0) {
      waiting.splice(queued, 1);
    } else {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
      if (entry.el && entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
      syncOverlays();
    }
    if (entry.spec.onClose) entry.spec.onClose(reason, entry.handle);
    // `then` (the pressed action) may chain a window of its own; queued windows wait behind it.
    if (then) then();
    if (stack.length === 0 && waiting.length > 0) mountEntry(waiting.shift());
  }

  function closeOverlay(id, reason) {
    const entry = findEntry(id);
    if (entry) closeEntry(entry, reason || 'program');
  }

  function closeAllOverlays() {
    waiting.slice().forEach(function (entry) { closeEntry(entry, 'closeAll'); });
    stack.slice().reverse().forEach(function (entry) { closeEntry(entry, 'closeAll'); });
  }

  function topOverlay() {
    return stack.length ? stack[stack.length - 1] : null;
  }

  backdrop.addEventListener('click', function () {
    const top = topOverlay();
    if (!top || !closable(top)) return;
    const allow = top.spec.backdrop !== undefined ? top.spec.backdrop : top.spec.type !== 'screen';
    if (allow) closeEntry(top, 'backdrop');
  });
  window.addEventListener('keydown', function (event) {
    if (stack.length === 0) return;
    if (event.key === 'Escape') {
      const top = topOverlay();
      if (closable(top)) closeEntry(top, 'escape');
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.key === 'Enter' && (tag === 'BODY' || !tag)) {
      // Enter with nothing focused takes the main action of the top window (not hold buttons).
      const primary = topOverlay().el.querySelector('.overlay-primary:not(.hold-btn):not(:disabled)');
      if (primary) {
        event.preventDefault();
        primary.click();
      }
    }
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') return;
    event.stopPropagation();
  }, true);
  // A reload while a window was open leaves the page on a marked entry whose twin belongs to the old
  // document (going back to it would reload the page): start from a plain entry instead.
  if (HISTORY_BACK && markedEntry()) {
    try {
      history.replaceState(null, '');
    } catch (error) { /* file:// or sandboxed frames */ }
  }
  window.addEventListener('popstate', function () {
    if (backPending) {
      // Our own unwind landed; a window that opened meanwhile gets its entry now.
      backPending = false;
      clearTimeout(backPendingTimer);
      syncHistory();
      return;
    }
    // Browser / Android Back: the marked entry is gone. The top window closes (one that cannot be
    // closed stays), with no window the top layer; whatever is still open is armed again so the
    // next Back stays in the game.
    const top = topOverlay();
    if (top && closable(top)) closeEntry(top, 'back');
    else if (top || !backLayer()) syncHistory();
  });

  // ---------- toasts: one lane under the top HUD ----------
  // MicroBuildersUI.toast(spec) → { close }. spec: text, title (bold lead), icon (ICONS key, HTML or
  // an image path), tone ('info' | 'good' | 'warn' | 'bad' | 'gold'), priority (0-3, default 1),
  // duration (ms, default 2600), key (same key = same toast; default title + text), action
  // ({ label, onClick }), className. At most two are visible; the same toast again bumps a «×N»
  // counter and restarts its timer instead of stacking.
  const lane = document.getElementById('toast-lane');
  const TOAST_MAX = 2;
  const shownToasts = [];
  const queuedToasts = [];
  let toastSeq = 0;

  function toastIcon(icon) {
    if (!icon) return '';
    if (ICONS[icon]) return '<span class="toast-icon">' + ICONS[icon] + '</span>';
    if (icon.charAt(0) === '<') return '<span class="toast-icon">' + icon + '</span>';
    return '<span class="toast-icon"><img src="' + escapeHtml(icon) + '" alt=""></span>';
  }

  function renderToast(entry) {
    const spec = entry.spec;
    const el = entry.el;
    el.className = 'toast tone-' + (spec.tone || 'info') + (spec.className ? ' ' + spec.className : '') + (spec.action ? ' has-action' : '');
    el.innerHTML = toastIcon(spec.icon) + '<span class="toast-text">' +
      (spec.title ? '<b>' + escapeHtml(spec.title) + '</b>' : '') +
      (spec.text ? '<span>' + escapeHtml(spec.text) + '</span>' : '') + '</span>' +
      (entry.count > 1 ? '<b class="toast-count">×' + entry.count + '</b>' : '');
    if (spec.action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'toast-action';
      button.textContent = spec.action.label;
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        hideToast(entry);
        if (spec.action.onClick) spec.action.onClick();
      });
      el.appendChild(button);
    }
  }

  function armToast(entry) {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(function () { hideToast(entry); }, entry.spec.duration || 2600);
  }

  function showToast(entry) {
    entry.el = document.createElement('div');
    entry.el.setAttribute('role', 'status');
    entry.el.addEventListener('click', function () { hideToast(entry); });
    renderToast(entry);
    lane.appendChild(entry.el);
    shownToasts.push(entry);
    armToast(entry);
  }

  function hideToast(entry) {
    const index = shownToasts.indexOf(entry);
    if (index < 0) return;
    shownToasts.splice(index, 1);
    clearTimeout(entry.timer);
    const el = entry.el;
    el.classList.add('out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    if (queuedToasts.length > 0) showToast(queuedToasts.shift());
  }

  function toast(spec) {
    const key = spec.key || (spec.title || '') + '|' + (spec.text || '');
    let entry = shownToasts.concat(queuedToasts).find(function (item) { return item.key === key; });
    if (entry) {
      entry.count += 1;
      entry.spec = Object.assign(entry.spec, spec);
      if (entry.el && shownToasts.indexOf(entry) >= 0) {
        renderToast(entry);
        armToast(entry);
      }
      return entry.handle;
    }
    entry = { key: key, spec: spec, count: 1, priority: spec.priority === undefined ? 1 : spec.priority, seq: ++toastSeq, el: null, timer: 0 };
    entry.handle = {
      close: function () {
        const queued = queuedToasts.indexOf(entry);
        if (queued >= 0) queuedToasts.splice(queued, 1);
        else hideToast(entry);
      },
    };
    if (shownToasts.length >= TOAST_MAX) {
      // A more important toast pushes out the least important visible one.
      let weakest = null;
      shownToasts.forEach(function (item) {
        if (!weakest || item.priority < weakest.priority) weakest = item;
      });
      if (weakest && weakest.priority < entry.priority) {
        queuedToasts.unshift(entry);
        hideToast(weakest);
        return entry.handle;
      }
      queuedToasts.push(entry);
      queuedToasts.sort(function (a, b) { return b.priority - a.priority || a.seq - b.seq; });
      return entry.handle;
    }
    showToast(entry);
    return entry.handle;
  }

  // Durations for people: «45 с», «12 мин», «2 ч 15 мин», «3 ч».
  function formatDuration(seconds) {
    const whole = Math.max(0, Math.round(seconds));
    if (whole < 60) return whole + ' с';
    const minutes = Math.floor(whole / 60);
    if (minutes < 60) return minutes + ' мин';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours + ' ч' + (rest ? ' ' + rest + ' мин' : '');
  }

  // Russian plural: plural(5, 'куб', 'куба', 'кубов') → 'кубов'.
  function plural(n, one, few, many) {
    const abs = Math.abs(Math.round(n)) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return few;
    return many;
  }

  window.MicroBuildersUI = {
    overlay: {
      open: openOverlay,
      close: closeOverlay,
      closeAll: closeAllOverlays,
      isOpen: function (id) { const entry = findEntry(id); return !!entry && !!entry.el && !entry.closed; },
      top: function () { const top = topOverlay(); return top ? top.id : null; },
      count: function () { return stack.length; },
      queued: function () { return waiting.length; },
    },
    // Non-window screens that Back and Escape close: set(id, onBack | null), back() → closed one?
    layer: {
      set: setLayer,
      back: backLayer,
      top: function () { return layers.length ? layers[layers.length - 1].id : null; },
    },
    toast: toast,
    escapeHtml: escapeHtml,
    formatDuration: formatDuration,
    plural: plural,
  };
})();
