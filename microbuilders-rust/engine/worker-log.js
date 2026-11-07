(function (root) {
  const button = document.getElementById('worker-log-toggle');
  const panel = document.getElementById('worker-log');
  let onSelect = function () {};
  let latest = null;
  // Set by record(), which runs inside stepWorld: the panel is repainted on the next HUD tick,
  // never from inside the simulation.
  let dirty = true;
  const failures = new WeakMap();
  // Cards are built once per worker and only their text is updated, so clicks are not lost.
  const views = new Map();
  let viewsWorld = null;

  const TRIP_LIMIT_TEXT = {
    carry: 'Ходку ограничила ноша',
    heavy: 'Один тяжёлый кубик · перегруз',
    plan: 'Ходку ограничил план',
    front: 'Мало свободных кубов рядом',
    order: 'Часть плана ждёт опоры',
  };

  function uniqueCount(list) {
    const seen = new Set();
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      const block = list[i];
      if (block.built || seen.has(block.id)) continue;
      seen.add(block.id);
      count += 1;
    }
    return count;
  }

  function statusOf(builder) {
    const planLeft = root.MicroBuilders.planMinis(builder);
    if (builder.phase === 'meal') return 'Обед';
    if (builder.phase === 'walk' && builder.walkPurpose === 'meal') return 'Идёт есть';
    if (builder.phase === 'walk' && builder.walkPurpose === 'smoke') return 'Идёт на перекур';
    if (builder.phase === 'walk' && builder.walkPurpose === 'sleep') return 'Идёт спать';
    if (builder.phase === 'break' && builder.breakKind === 'sleep') return 'Спит';
    if (builder.phase === 'break' && builder.breakKind === 'rest') return 'Отдых';
    if (builder.phase === 'break' && builder.breakKind === 'smoke') return 'Перекур';
    if (builder.phase === 'plan') {
      if (builder.waitReason === 'front') return 'Ждёт: нет свободных кубов';
      return planLeft > 0 ? 'Обновляет план' : 'Получает план';
    }
    if (builder.phase === 'recover') return 'Аварийный возврат';
    if (builder.phase === 'idle') {
      if (builder.waitReason === 'path') return 'Ждёт проход';
      if (builder.waitReason === 'front') return 'Ждёт: нет свободных кубов';
      if (builder.carry.length > 0) return 'С грузом, ждёт место';
      return planLeft > 0 ? 'Ждёт следующую ходку' : 'Получает план';
    }
    if (builder.phase === 'mine') return 'Набирает в карьере';
    if (builder.phase === 'campFetch') return 'Берёт материал для столовой';
    if (builder.phase === 'campBuild') return 'Строит столовую';
    if (builder.phase === 'place') return 'Кладёт куб';
    if (builder.phase === 'erect') return 'Ставит леса';
    if (builder.phase === 'passage') return 'Пробивает проход';
    if (builder.phase === 'walk' && builder.walkPurpose === 'mine') return 'Идёт к карьеру';
    if (builder.phase === 'walk' && builder.walkPurpose === 'out') {
      return planLeft > 0 ? 'Идёт к столу' : 'Идёт за новым планом';
    }
    if (builder.phase === 'walk' && builder.walkPurpose === 'recover') return builder.escapeKind === 'short' ? 'Аварийный выход' : 'Аварийный план';
    if (builder.phase === 'walk' && builder.walkPurpose === 'erect') return 'Идёт к лесам';
    if (builder.phase === 'walk' && builder.walkPurpose === 'route') {
      return builder.carry.length > 0 ? 'Несёт к месту' : 'Идёт по маршруту';
    }
    if (builder.phase === 'walk' && builder.walkPurpose === 'place') return 'Идёт ставить';
    if (builder.phase === 'walk') return 'Идёт';
    return builder.phase;
  }

  function linesOf(builder, world) {
    const api = root.MicroBuilders;
    const planLeft = api.planMinis(builder);
    const limit = api.planCubeLimit(world.campaign);
    const carryCubes = uniqueCount(builder.carry);
    const load = api.carryLoad(builder, world);
    const lines = [];
    lines.push(planLeft > 0
      ? 'План: осталось ' + planLeft + ' из ' + Math.max(planLeft, builder.planTaken) + ' · лимит ' + limit
      : 'План: нет, получить план');
    let carry = 'Ноша: ' + carryCubes + ' ' + cubeWord(carryCubes) + ' · ' + formatKg(load.kg) + ' / ' + formatKg(load.capacity) + ' кг';
    if (load.overload > 1) carry += ' · перегруз ×' + formatKg(load.overload);
    lines.push(carry);
    if (builder.tripLimit && (builder.carry.length > 0 || builder.mineQueue.length > 0)) {
      lines.push(TRIP_LIMIT_TEXT[builder.tripLimit] + ' · взял ' + formatKg(builder.tripKg) + ' кг');
    }
    if (builder.tripPours > 0) {
      let pay = 'За ходку: +' + builder.tripCoins;
      if (builder.tripLucky > 0) pay += ' · удача ×' + builder.tripLuckyMultiplier + ' (' + builder.tripLucky + ')';
      if (builder.tripCapital > 0) pay += ' · капитал +' + builder.tripCapital;
      lines.push(pay);
    }
    if (builder.phase === 'place' && builder.carry[0]) {
      const block = builder.carry[0];
      lines.push('Кладёт ' + api.MATERIAL[block.materialId].name + ' ' + block.poured + ' / ' + api.pourTotal(block));
    }
    if (builder.mineQueue.length > 0) lines.push('Очередь руды: ' + builder.mineQueue.length);
    if (builder.erectPiece && !builder.erectPiece.removed) lines.push('Леса в работе');
    if (builder.routeId >= 0) lines.push('Маршрут построен');
    if (builder.blockedWalkAttempts > 0) lines.push('Проход закрыт, ищет обход');
    lines.push('Клетка ' + builder.cell[0] + ', ' + builder.cell[1] + ', ' + builder.cell[2]);
    lines.push(
      needText(builder, world, 'hunger', 'Голод') +
      ' · ' + needText(builder, world, 'fatigue', 'усталость') +
      ' · ' + needText(builder, world, 'smoke', 'перекур')
    );
    return lines;
  }

  function formatKg(value) {
    return String(Math.round(value * 10) / 10).replace('.', ',');
  }

  function cubeWord(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'куб';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'куба';
    return 'кубов';
  }

  // «Голод 310/750, 7:20»: points of the need's scale and the time to its top at the rate now.
  function needText(builder, world, need, label) {
    const api = root.MicroBuilders;
    const state = api.needState(builder, world, need);
    const left = api.needSecondsLeft(builder, world, need);
    return label + ' ' + Math.round(state.points) + '/' + Math.round(state.max) + ', ' + (left > 0 ? formatTime(left) : 'пора');
  }

  function formatTime(seconds) {
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const rest = whole % 60;
    return minutes + ':' + (rest < 10 ? '0' : '') + rest;
  }

  function failureList(builder) {
    if (!failures.has(builder)) failures.set(builder, []);
    return failures.get(builder);
  }

  const noop = function () {};
  if (!button || !panel) {
    // The dev markup is not on the page: keep the API the simulation and game.js call.
    root.MicroBuildersWorkerLog = {
      paint: noop,
      record: noop,
      bind: noop,
      isDirty: function () { return false; },
      statusOf: statusOf,
      tripLimitText: function (limit) { return TRIP_LIMIT_TEXT[limit] || ''; },
    };
    return;
  }

  const failureModal = document.createElement('div');
  failureModal.className = 'worker-failures-modal';
  failureModal.hidden = true;
  failureModal.innerHTML =
    '<section role="dialog" aria-modal="true" aria-labelledby="worker-failures-title">' +
      '<header><b id="worker-failures-title"></b><button type="button" aria-label="Закрыть">×</button></header>' +
      '<div class="worker-failures-modal-list"></div>' +
    '</section>';
  document.body.appendChild(failureModal);

  function closeFailureModal() {
    failureModal.hidden = true;
  }

  failureModal.querySelector('button').addEventListener('click', closeFailureModal);
  failureModal.addEventListener('click', function (event) {
    if (event.target === failureModal) closeFailureModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !failureModal.hidden) closeFailureModal();
  });

  button.addEventListener('click', function () {
    const open = panel.hidden;
    panel.hidden = !open;
    button.classList.toggle('on', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.textContent = open ? 'Скрыть рабочих' : 'Рабочие';
    if (open && latest) {
      dirty = true;
      paint(latest.world, latest.selected);
    }
  });

  function openFailureModal(view) {
    const snapshot = failureList(view.builder).map(function (failure) {
      return { time: failure.time, reason: failure.reason };
    });
    failureModal.querySelector('#worker-failures-title').textContent =
      'Срывы плана · Рабочий ' + view.number;
    const list = failureModal.querySelector('.worker-failures-modal-list');
    list.textContent = '';
    if (snapshot.length === 0) {
      const empty = document.createElement('small');
      empty.textContent = 'Срывов пока нет';
      list.appendChild(empty);
    } else {
      for (let i = snapshot.length - 1; i >= 0; i--) {
        const row = document.createElement('small');
        row.textContent = formatTime(snapshot[i].time) + ' · ' + snapshot[i].reason;
        list.appendChild(row);
      }
    }
    failureModal.hidden = false;
  }

  function createView(builder) {
    const card = document.createElement('div');
    card.className = 'worker-log-card';
    const title = document.createElement('b');
    const swatch = document.createElement('i');
    swatch.style.background = '#' + builder.shirt.toString(16).padStart(6, '0');
    title.appendChild(swatch);
    const name = document.createTextNode('');
    title.appendChild(name);
    card.appendChild(title);
    const state = document.createElement('em');
    card.appendChild(state);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'worker-failures-toggle';
    card.appendChild(toggle);
    const view = { builder: builder, card: card, name: name, state: state, rows: [], toggle: toggle, number: 0, failures: -1 };
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      openFailureModal(view);
    });
    card.addEventListener('click', function () {
      onSelect(builder);
    });
    return view;
  }

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function updateView(view, world, number, selected) {
    const builder = view.builder;
    view.number = number;
    view.card.classList.toggle('on', selected);
    const name = 'Рабочий ' + number;
    if (view.name.nodeValue !== name) view.name.nodeValue = name;
    setText(view.state, statusOf(builder));
    const lines = linesOf(builder, world);
    for (let i = 0; i < lines.length; i++) {
      let row = view.rows[i];
      if (!row) {
        row = document.createElement(i < 2 ? 'span' : 'small');
        view.card.insertBefore(row, view.toggle);
        view.rows.push(row);
      }
      // ui.css gives these rows display:block, which beats the [hidden] attribute.
      row.style.display = '';
      setText(row, lines[i]);
    }
    for (let i = lines.length; i < view.rows.length; i++) view.rows[i].style.display = 'none';
    const count = failureList(builder).length;
    if (count !== view.failures) {
      view.failures = count;
      view.toggle.textContent = 'Срывы плана (' + count + ')';
    }
  }

  function paint(world, selected) {
    if (!latest || latest.world !== world || latest.selected !== selected) latest = { world: world, selected: selected };
    if (panel.hidden || !world) return;
    if (world !== viewsWorld) {
      views.clear();
      panel.textContent = '';
      viewsWorld = world;
    }
    // Numbered by crew order; drones share world.builders but are not workers.
    let number = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'engineer') continue;
      number += 1;
      let view = views.get(builder);
      if (!view) {
        view = createView(builder);
        views.set(builder, view);
        panel.appendChild(view.card);
      }
      updateView(view, world, number, builder === selected);
    }
    dirty = false;
  }

  root.MicroBuildersWorkerLog = {
    paint: paint,
    // Called by logic.js from inside stepWorld: no DOM work here.
    record: function (builder, world, reason) {
      const history = failureList(builder);
      history.push({ time: world.campaign.levelElapsed, reason: reason });
      if (history.length > 10) history.shift();
      dirty = true;
    },
    bind: function (select) {
      onSelect = select;
    },
    isDirty: function () {
      return dirty;
    },
    statusOf: statusOf,
    tripLimitText: function (limit) { return TRIP_LIMIT_TEXT[limit] || ''; },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
