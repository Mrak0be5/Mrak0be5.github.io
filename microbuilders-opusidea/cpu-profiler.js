(function () {
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  let batch = 0;
  let frames = 0;
  let batchCpu = 0;
  let totalCpu = 0;
  let maxCpu = 0;
  let measuring = false;
  let worstCpu = 0;
  // One record per 60 frames while a site plays without a window: the last 10 minutes are kept
  // (a long session must not grow the list, nor the table rebuilt from it, without end).
  const MAX_RECORDS = 600;
  const records = [];
  function createMetrics() {
    return {
      simulation: 0,
      worldStep: 0,
      scheduler: 0,
      path: 0,
      scaffoldSearch: 0,
      eventView: 0,
      scaffoldView: 0,
      effectsView: 0,
      workersView: 0,
      planView: 0,
      featuresView: 0,
      cameraView: 0,
      render: 0,
      hudView: 0,
    };
  }
  function createCounts() {
    return {
      assignments: 0,
      pathSearches: 0,
      aStarSearches: 0,
      scaffoldExpansions: 0,
      invalidations: 0,
      drawCalls: 0,
      triangles: 0,
    };
  }
  let frameMetrics = createMetrics();
  let frameCounts = createCounts();
  let batchMetrics = createMetrics();
  let batchMetricMax = createMetrics();
  let batchCounts = createCounts();
  let globalMetrics = createMetrics();
  let globalMetricMax = createMetrics();
  let globalCounts = createCounts();
  let frameAStarPeak = null;
  let batchAStarPeak = null;
  let globalAStarPeak = null;
  window.MicroBuildersProfiler = {
    add: function (name, milliseconds) {
      frameMetrics[name] += milliseconds;
    },
    count: function (name, value) {
      frameCounts[name] += value;
    },
    astar: function (info) {
      if (!frameAStarPeak || info.duration > frameAStarPeak.duration) {
        frameAStarPeak = info;
      }
    },
  };
  const style = document.createElement('style');
  style.textContent = `
    #cpu-profiler-toggle {
      position: fixed;
      top: 14px;
      left: 112px;
      z-index: 10001;
      width: 52px;
      height: 34px;
      padding: 0;
      border: 1px solid rgba(118, 210, 255, 0.58);
      border-radius: 999px;
      background: rgba(27, 38, 44, 0.9);
      color: #bcecff;
      font: 800 11px Manrope, sans-serif;
      cursor: pointer;
      backdrop-filter: blur(8px);
    }
    #cpu-profiler-panel {
      position: fixed;
      top: 56px;
      left: 12px;
      z-index: 10001;
      width: 460px;
      max-width: calc(100vw - 24px);
      max-height: min(560px, calc(100vh - 72px));
      padding: 14px;
      overflow-y: auto;
      border: 1px solid rgba(118, 210, 255, 0.35);
      border-radius: 16px;
      background: rgba(24, 29, 31, 0.94);
      color: #eef8fb;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(12px);
      font: 700 11px Manrope, sans-serif;
    }
    #cpu-profiler-panel[hidden] {
      display: none;
    }
    #cpu-profiler-panel h3 {
      margin: 0 0 5px;
      color: #bcecff;
      font-size: 14px;
    }
    #cpu-profiler-summary {
      margin-bottom: 10px;
      color: #d4e2e6;
      line-height: 1.5;
    }
    #cpu-profiler-breakdown {
      margin-bottom: 10px;
      color: #9fb4ba;
      line-height: 1.55;
    }
    #cpu-profiler-head,
    .cpu-profiler-row {
      display: grid;
      grid-template-columns: 1.15fr 0.9fr 0.9fr 0.9fr;
      gap: 8px;
      align-items: center;
    }
    #cpu-profiler-head {
      padding: 7px 8px;
      color: #80969d;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 9px;
    }
    #cpu-profiler-rows {
      max-height: min(330px, calc(100vh - 280px));
      overflow-y: auto;
    }
    .cpu-profiler-row {
      padding: 7px 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      font-variant-numeric: tabular-nums;
    }
    #cpu-profiler-head span:not(:first-child),
    .cpu-profiler-row span:not(:first-child) {
      text-align: right;
    }
  `;
  document.head.appendChild(style);
  const toggle = document.createElement('button');
  toggle.id = 'cpu-profiler-toggle';
  toggle.className = 'dev-only';
  toggle.type = 'button';
  toggle.textContent = 'CPU';
  const panel = document.createElement('aside');
  panel.id = 'cpu-profiler-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <h3>CPU · глобально и по 60 кадров</h3>
    <div id="cpu-profiler-summary">Запустите смену для замера</div>
    <div id="cpu-profiler-breakdown"></div>
    <div id="cpu-profiler-head"><span>Кадры</span><span>Сумма</span><span>Среднее</span><span>Пик</span></div>
    <div id="cpu-profiler-rows"></div>
  `;
  document.body.append(toggle, panel);
  const summary = panel.querySelector('#cpu-profiler-summary');
  const breakdown = panel.querySelector('#cpu-profiler-breakdown');
  const rows = panel.querySelector('#cpu-profiler-rows');
  toggle.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) render();
  });

  function formatAStar(info) {
    if (!info) return 'нет';
    return info.duration.toFixed(1) + ' мс · ' + info.type +
      ' · ' + (info.success ? 'найден' : 'не найден') +
      ' · целей ' + info.goals +
      ' · раскрыто ' + info.expansions +
      ' · добавлено ' + info.pushes +
      ' · очередь ' + info.maxOpen +
      ' · шагов ' + info.steps +
      ' · поворотов ' + info.turns +
      ' · лесов ' + info.scaffoldSteps +
      ' · цена ' + info.cost.toFixed(1) +
      ' · предел ' + (Number.isFinite(info.maxCost) ? info.maxCost.toFixed(1) : 'нет') +
      ' · раскрытия ' + info.expansionBudget +
      ' · старт ' + info.start +
      (info.targetId >= 0 ? ' · куб ' + info.targetId : '');
  }

  function render() {
    // The table is rebuilt only while it is on screen (toggling it open renders it).
    if (panel.hidden) return;
    if (records.length === 0) {
      summary.textContent = 'Запустите смену для замера';
      breakdown.textContent = '';
      rows.replaceChildren();
      return;
    }
    const latest = records[records.length - 1];
    summary.textContent =
      'Всего ' + latest.total.toFixed(2) + ' мс · интервалов ' + records.length +
      ' · худший пик ' + worstCpu.toFixed(2) + ' мс';
    const intervalMetrics = Object.keys(latest.metrics).map(function (name) {
      return name + ' ' + latest.metrics[name].toFixed(1) + '/' + latest.metricMax[name].toFixed(1) + ' мс';
    });
    const intervalCounts = Object.keys(latest.counts).map(function (name) {
      return name + ' ' + latest.counts[name];
    });
    const otherWorld = globalMetrics.worldStep -
      globalMetrics.scheduler -
      globalMetrics.path -
      globalMetrics.scaffoldSearch;
    const otherEvents = globalMetrics.eventView - globalMetrics.scaffoldView;
    const viewPreparation =
      globalMetrics.effectsView +
      globalMetrics.workersView +
      globalMetrics.planView +
      globalMetrics.featuresView +
      globalMetrics.cameraView;
    const otherFrame =
      totalCpu -
      globalMetrics.simulation -
      viewPreparation -
      globalMetrics.render -
      globalMetrics.hudView;
    const simulationParts = [
      'всего ' + globalMetrics.simulation.toFixed(1),
      'ядро мира ' + globalMetrics.worldStep.toFixed(1),
      'планирование ' + globalMetrics.scheduler.toFixed(1),
      'пути ' + globalMetrics.path.toFixed(1),
      'маршруты ' + globalMetrics.scaffoldSearch.toFixed(1),
      'прочее ядро ' + otherWorld.toFixed(1),
      'события ' + globalMetrics.eventView.toFixed(1),
      'геометрия лесов ' + globalMetrics.scaffoldView.toFixed(1),
      'прочие события ' + otherEvents.toFixed(1),
    ];
    const viewParts = [
      'эффекты ' + globalMetrics.effectsView.toFixed(1),
      'рабочие ' + globalMetrics.workersView.toFixed(1),
      'план рабочего ' + globalMetrics.planView.toFixed(1),
      'особые блоки ' + globalMetrics.featuresView.toFixed(1),
      'камера ' + globalMetrics.cameraView.toFixed(1),
      'WebGL ' + globalMetrics.render.toFixed(1),
      'HUD ' + globalMetrics.hudView.toFixed(1),
      'прочий кадр ' + otherFrame.toFixed(1),
    ];
    const globalCountParts = Object.keys(globalCounts).map(function (name) {
      return name + ' ' + globalCounts[name];
    });
    const globalPeaks = Object.keys(globalMetricMax).map(function (name) {
      return name + ' ' + globalMetricMax[name].toFixed(1);
    });
    breakdown.innerHTML =
      '<strong>Симуляция, мс:</strong> ' + simulationParts.join(' · ') +
      '<br><strong>Кадр, мс:</strong> ' + viewParts.join(' · ') +
      '<br><strong>Пики задач, мс:</strong> ' + globalPeaks.join(' · ') +
      '<br><strong>Худший A*:</strong> ' + formatAStar(globalAStarPeak) +
      '<br><strong>A* последних 60:</strong> ' + formatAStar(latest.astarPeak) +
      '<br><strong>Глобальные вызовы:</strong> ' + globalCountParts.join(' · ') +
      '<br><strong>Последние 60:</strong> ' + intervalMetrics.concat(intervalCounts).join(' · ');
    rows.innerHTML = records.slice().reverse().map(function (record) {
      const color = record.max >= 16 ? '#ff8c82' : record.max >= 8 ? '#ffd166' : '#9ee6bd';
      return '<div class="cpu-profiler-row">' +
        '<span>' + record.first + '–' + record.last + '</span>' +
        '<span>' + record.sum.toFixed(2) + '</span>' +
        '<span>' + record.average.toFixed(3) + '</span>' +
        '<span style="color:' + color + '">' + record.max.toFixed(2) + '</span>' +
        '</div>';
    }).join('');
  }

  window.requestAnimationFrame = function (callback) {
    return nativeRequestAnimationFrame(function (timestamp) {
      const started = performance.now();
      callback(timestamp);
      const elapsed = performance.now() - started;
      // Paused while a window of MicroBuildersUI is open (body.has-modal).
      const active = document.body.classList.contains('playing') &&
        !document.body.classList.contains('has-modal');
      if (!active) {
        measuring = false;
        frameMetrics = createMetrics();
        frameCounts = createCounts();
        frameAStarPeak = null;
        return;
      }
      if (!measuring) {
        batch = 0;
        frames = 0;
        batchCpu = 0;
        totalCpu = 0;
        maxCpu = 0;
        worstCpu = 0;
        records.length = 0;
        batchMetrics = createMetrics();
        batchMetricMax = createMetrics();
        batchCounts = createCounts();
        globalMetrics = createMetrics();
        globalMetricMax = createMetrics();
        globalCounts = createCounts();
        batchAStarPeak = null;
        globalAStarPeak = null;
        measuring = true;
        render();
      }
      frames += 1;
      Object.keys(frameMetrics).forEach(function (name) {
        batchMetrics[name] += frameMetrics[name];
        globalMetrics[name] += frameMetrics[name];
        if (frameMetrics[name] > batchMetricMax[name]) {
          batchMetricMax[name] = frameMetrics[name];
        }
        if (frameMetrics[name] > globalMetricMax[name]) {
          globalMetricMax[name] = frameMetrics[name];
        }
      });
      Object.keys(frameCounts).forEach(function (name) {
        batchCounts[name] += frameCounts[name];
        globalCounts[name] += frameCounts[name];
      });
      if (frameAStarPeak && (!batchAStarPeak || frameAStarPeak.duration > batchAStarPeak.duration)) {
        batchAStarPeak = frameAStarPeak;
      }
      if (frameAStarPeak && (!globalAStarPeak || frameAStarPeak.duration > globalAStarPeak.duration)) {
        globalAStarPeak = frameAStarPeak;
      }
      frameMetrics = createMetrics();
      frameCounts = createCounts();
      frameAStarPeak = null;
      batchCpu += elapsed;
      totalCpu += elapsed;
      if (elapsed > maxCpu) maxCpu = elapsed;
      if (frames < 60) return;
      batch += 1;
      const firstFrame = (batch - 1) * 60 + 1;
      const lastFrame = batch * 60;
      if (maxCpu > worstCpu) worstCpu = maxCpu;
      records.push({
        first: firstFrame,
        last: lastFrame,
        sum: batchCpu,
        average: batchCpu / frames,
        max: maxCpu,
        total: totalCpu,
        metrics: batchMetrics,
        metricMax: batchMetricMax,
        counts: batchCounts,
        astarPeak: batchAStarPeak,
      });
      if (records.length > MAX_RECORDS) records.shift();
      // The console line once a second is for development (?dev=1).
      if (document.body.classList.contains('dev-mode')) console.log(
        '[MicroBuilders CPU] кадры ' + firstFrame + '-' + lastFrame +
        ': сумма ' + batchCpu.toFixed(2) + ' мс' +
        ' | среднее ' + (batchCpu / frames).toFixed(3) + ' мс' +
        ' | максимум ' + maxCpu.toFixed(2) + ' мс' +
        ' | всего ' + totalCpu.toFixed(2) + ' мс'
      );
      render();
      frames = 0;
      batchCpu = 0;
      maxCpu = 0;
      batchMetrics = createMetrics();
      batchMetricMax = createMetrics();
      batchCounts = createCounts();
      batchAStarPeak = null;
    });
  };
})();
