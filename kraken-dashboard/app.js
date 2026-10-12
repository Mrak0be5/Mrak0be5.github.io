import { RETENTION_DAYS, validDay, dateUTC, shiftDay, daysBetween, filterRows, sumMetric, ratio, kpis, comparison, timeline, groupAcquisition, cohortTable, eventTable, makeCSV, normalizeData, countryName } from './logic.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const today = () => dateUTC(Date.now());
const titles = {
  overview: ['Обзор', 'Ключевые показатели игры в одном пространстве.'],
  acquisition: ['Привлечение', 'Сети, кампании и страны: от установки до дохода.'],
  cohorts: ['Когорты', 'Удержание и накопительный доход по дате установки.'],
  events: ['События', 'Действия игроков за выбранный период.'],
  status: ['Данные и источник', 'Свежесть снимка, доступность метрик и покрытие отчёта.'],
};
const metricLabels = { installs: 'Установки', sessions: 'Сессии', daus: 'DAU', revenue: 'Доход IAP', ad_revenue: 'Рекламный доход', revenue_total: 'Общий доход', cost: 'Расходы сетей', clicks: 'Клики', impressions: 'Показы', cpi: 'CPI платных установок', income_cost: 'Доход / расходы' };
const state = { data: null, section: 'overview', loading: false, failed: false, filters: { start: shiftDay(today(), -30), end: shiftDay(today(), -1), os: '', network: '', country: '' }, searches: {}, sorts: {}, group: 'network', chartMetric: 'installs', cohortMode: 'retention', tableRows: [], tableColumns: [], request: 0 };
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
function shortDay(day) { return validDay(day) ? dateFormat.format(new Date(day + 'T00:00:00Z')) : '—'; }
function stamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(parsed) + ' UTC' : 'Дата не указана';
}
function format(value, type = 'integer', compact = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  let options = { maximumFractionDigits: type === 'integer' ? 0 : 2 };
  if (type === 'money') options = { ...options, style: 'currency', currency: /^[A-Z]{3}$/.test(state.data?.currency || '') ? state.data.currency : 'USD', maximumFractionDigits: 2 };
  if (type === 'percent') options = { style: 'percent', maximumFractionDigits: 1 };
  if (compact) options = { ...options, notation: 'compact', maximumFractionDigits: 1 };
  try { return new Intl.NumberFormat('ru-RU', options).format(value) + (type === 'multiplier' ? '×' : ''); }
  catch { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value); }
}
const moneyMetrics = ['revenue', 'ad_revenue', 'revenue_total', 'cost', 'cpi'];
const metricType = id => moneyMetrics.includes(id) || id.startsWith('revenue_total_d') ? 'money' : id === 'income_cost' ? 'multiplier' : /^d\d+$/.test(id) ? 'percent' : 'integer';
function label(id) {
  const cohort = /^(cohort_size|retained_users|revenue_total|ad_revenue_total)_d(\d+)$/.exec(id);
  if (cohort) return ({cohort_size:'Размер когорты',retained_users:'Активные игроки',revenue_total:'Общий доход',ad_revenue_total:'Рекламный доход'}[cohort[1]]) + ' D' + cohort[2];
  return Object.hasOwn(metricLabels, id) ? metricLabels[id] : state.data?.metrics.find(metric => metric.id === id)?.label || id;
}
function empty(title, body, action = '') { return `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">⌁</span><h2>${esc(title)}</h2><p>${esc(body)}</p>${action}</div>`; }
function panel(title, subtitle, body, tools = '') { return `<section class="panel"><div class="panel-heading"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>${tools}</div>${body}</section>`; }
function source() { return state.filters.network || state.filters.country ? 'acquisition' : 'daily'; }
function setPreset(value) {
  if (value !== 'custom') { state.filters.end = shiftDay(today(), -1); state.filters.start = shiftDay(state.filters.end, -(Number(value) - 1)); }
  $('#start-date').value = state.filters.start;
  $('#end-date').value = state.filters.end;
}
function fillSelect(selector, entries, initial) {
  const select = $(selector), selected = select.value;
  select.innerHTML = `<option value="">${esc(initial)}</option>` + entries.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('');
  select.value = entries.some(([value]) => value === selected) ? selected : '';
}
function populateFilters() {
  const rows = ['daily', 'acquisition', 'cohorts', 'event_rows'].flatMap(key => state.data[key]);
  const values = key => [...new Set(rows.map(row => row[key]).filter(value => typeof value === 'string' && value))].sort((a, b) => a.localeCompare(b, 'ru')).map(value => [value, value]);
  fillSelect('#os-filter', values('os_name'), 'Все платформы');
  fillSelect('#network-filter', values('network'), 'Все сети');
  const countries = new Map();
  for (const row of rows) { const code = row.country_code || row.country; if (typeof code === 'string' && code) countries.set(code, `${countryName(row)}${row.country_code ? ' · ' + String(row.country_code).toUpperCase() : ''}`); }
  fillSelect('#country-filter', [...countries].sort((a, b) => a[1].localeCompare(b[1], 'ru')), 'Все страны');
  for (const [id, key] of [['#os-filter', 'os'], ['#network-filter', 'network'], ['#country-filter', 'country']]) state.filters[key] = $(id).value;
}
function updateMeta() {
  const { start, end, network, country } = state.filters;
  $('#range-label').textContent = `${shortDay(start)} — ${shortDay(end)} · ${daysBetween(start, end).length} дней`;
  $('#incomplete-label').hidden = !(start <= today() && end >= today());
  $('#segment-label').hidden = !(network || country);
  $('#currency-label').textContent = state.data?.currency || 'USD';
  const coverage = state.data?.range;
  $('#coverage-label').textContent = state.data && (!validDay(coverage?.start) || !validDay(coverage?.end)) ? 'Покрытие снимка не указано' : state.data && (start < coverage.start || end > coverage.end) ? 'Часть периода вне покрытия снимка' : '';
}
async function load() {
  if (state.loading) return;
  state.loading = true;
  state.failed = false;
  const request = ++state.request;
  $('#refresh-button').disabled = true;
  $('#content').setAttribute('aria-busy', 'true');
  $('#global-state').innerHTML = `<div class="state-banner"><span class="loading-indicator" aria-hidden="true"></span><div><strong>Загружаем снимок</strong><p>${state.data ? 'Пока отображается предыдущий успешно загруженный снимок.' : 'Получаем опубликованную аналитику игры.'}</p></div></div>`;
  $('#snapshot-status').textContent = 'Загрузка…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('./data.json?cache=' + Date.now(), { cache: 'no-store', signal: controller.signal, credentials: 'omit' });
    if (!response.ok) throw new Error(response.status === 404 ? 'Отчёт ещё не опубликован.' : `Не удалось прочитать снимок (HTTP ${response.status}).`);
    const data = normalizeData(await response.json());
    if (request !== state.request) return;
    state.data = data;
    $('#global-state').innerHTML = '';
    $('#snapshot-status').textContent = 'Снимок: ' + stamp(data.generated_at);
    $('#project-name').textContent = data.app?.name || 'Octopus RPG';
    $('#store-id').textContent = data.app?.store_id || 'com.pulsegames.octopusrpg';
    $('#refresh-note').textContent = data.refresh?.note || 'Данные обновляются каждые 6 часов, пока ПК включён.';
    populateFilters();
    $('#warnings').innerHTML = data.warnings.length ? `<details class="source-warnings"><summary>Источник данных: ${data.warnings.length} замечания</summary><div>${data.warnings.map(warning => `<div class="warning"><strong>${esc(warning.title || 'Предупреждение источника')}</strong><p>${esc(warning.body)}</p></div>`).join('')}</div></details>` : '';
    render();
  } catch (error) {
    state.failed = true;
    const message = error.name === 'AbortError' ? 'Сервер не ответил за 20 секунд. Попробуйте ещё раз.' : error instanceof SyntaxError ? 'Не удалось прочитать данные отчёта.' : error.message || 'Не удалось загрузить снимок.';
    $('#global-state').innerHTML = `<div class="state-banner error"><div><strong>${state.data ? 'Обновление не удалось' : 'Данные недоступны'}</strong><p>${esc(message)}${state.data ? ' Отображается предыдущий снимок.' : ''}</p></div><button class="button subtle" data-action="retry">Повторить</button></div>`;
    $('#snapshot-status').textContent = state.data ? 'Предыдущий снимок: ' + stamp(state.data.generated_at) : 'Снимок недоступен';
    render();
  } finally {
    clearTimeout(timeout);
    state.loading = false;
    $('#refresh-button').disabled = false;
    $('#content').setAttribute('aria-busy', 'false');
  }
}
function kpiCards() {
  const values = kpis(state.data, state.filters), previous = comparison(state.data, state.filters);
  const configs = [
    ['installs', 'Установки', '↓', 'integer'], ['revenue_total', 'Общий доход', '$', 'money'], ['cost', 'Расходы сетей', '↗', 'money'],
    ['daus', 'Средний DAU', '◉', 'decimal'], ['cpi', 'CPI платных установок', '◎', 'money'], ['income_cost', 'Доход / расходы', '÷', 'multiplier'],
  ];
  return `<div class="kpi-grid">${configs.map(([id, title, icon, type]) => {
    const value = values[id], before = previous?.[id];
    let delta = '<span>Нет доступного сравнения</span>';
    if (value !== null && before !== null && before !== undefined && before > 0 && $('#incomplete-label').hidden) {
      const change = (value - before) / before;
      const better = ['cost', 'cpi'].includes(id) ? change < 0 : change > 0;
      delta = `<span class="change ${change === 0 ? '' : better ? 'up' : 'down'}">${change > 0 ? '+' : ''}${esc(format(change, 'percent'))}</span><span>к предыдущему периоду</span>`;
    }
    const note = id === 'daus' ? 'Среднее по календарным дням' : id === 'income_cost' ? 'Доход активности / расходы, не когортный ROAS' : id === 'cpi' ? 'Известные сети, кроме Organic' : id === 'revenue_total' ? 'IAP + рекламный доход' : '';
    return `<article class="kpi ${id === 'revenue_total' ? 'featured' : ''}" title="${esc(note || label(id))}"><div class="kpi-top"><span>${esc(title)}</span><span class="kpi-icon" aria-hidden="true">${icon}</span></div><div class="kpi-value">${esc(format(value, type))}</div><div class="kpi-bottom">${delta}</div>${note ? `<div class="kpi-bottom" style="margin-top:9px">${esc(note)}</div>` : ''}</article>`;
  }).join('')}</div>`;
}
function chart(series, chartId, money = false) {
  const points = series.flatMap(item => item.values.filter(point => point.value !== null));
  if (!points.length) return empty('Нет доступных значений', 'Метрика недоступна или в выбранном периоде нет строк данных.');
  const days = daysBetween(state.filters.start, state.filters.end), width = 920, height = 280, left = 68, right = 16, top = 20, bottom = 42;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const maximum = Math.max(0, ...points.map(point => point.value)), minimum = Math.min(0, ...points.map(point => point.value));
  const extent = (maximum - minimum) || 1, max = maximum + extent * .12, min = minimum < 0 ? minimum - extent * .05 : 0;
  const x = index => left + (days.length === 1 ? plotWidth / 2 : index / (days.length - 1) * plotWidth);
  const y = value => top + (max - value) / (max - min) * plotHeight;
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="group" aria-labelledby="${chartId}-title ${chartId}-desc"><title id="${chartId}-title">${esc(series.map(item => item.label).join(' и '))}</title><desc id="${chartId}-desc">Данные по дням, UTC. Используйте стрелки для перехода между точками графика. Значения также доступны в таблице по дням.</desc>`;
  for (let i = 0; i <= 4; i++) {
    const value = min + (max - min) * i / 4, py = y(value);
    svg += `<line class="gridline" x1="${left}" x2="${width - right}" y1="${py}" y2="${py}"/><text x="${left - 12}" y="${py + 4}" text-anchor="end">${esc(format(value, money ? 'money' : 'integer', true))}</text>`;
  }
  const ticks = [...new Set([0, ...Array.from({ length: 5 }, (_, i) => Math.round((days.length - 1) * (i + 1) / 5))])];
  for (const index of ticks) svg += `<text x="${x(index)}" y="${height - 12}" text-anchor="${index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle'}">${esc(shortDay(days[index]))}</text>`;
  let focusFirst = true;
  for (const item of series) {
    const byDay = new Map(item.values.map(point => [point.day, point.value]));
    let path = '', connected = false;
    for (let index = 0; index < days.length; index++) {
      const value = byDay.get(days[index]);
      if (value === null || value === undefined) { connected = false; continue; }
      path += `${connected ? 'L' : 'M'}${x(index).toFixed(2)},${y(value).toFixed(2)} `;
      connected = true;
    }
    svg += `<path class="series-line" d="${path}" style="stroke:${item.color}"/>`;
    for (let index = 0; index < days.length; index++) {
      const value = byDay.get(days[index]);
      if (value === null || value === undefined) continue;
      const text = `${shortDay(days[index])} ${days[index].slice(0, 4)} · UTC\n${item.label}: ${format(value, money ? 'money' : 'integer')}`;
      svg += `<circle class="point" cx="${x(index)}" cy="${y(value)}" r="4" style="fill:${item.color}" tabindex="${focusFirst ? '0' : '-1'}" role="img" aria-label="${esc(text)}" data-tooltip="${esc(text)}"><title>${esc(text)}</title></circle>`;
      focusFirst = false;
    }
  }
  svg += '</svg>';
  return `<div class="chart">${svg}</div><div class="chart-legend">${series.map(item => `<span><i class="legend-dot" style="background:${item.color}" aria-hidden="true"></i>${esc(item.label)}</span>`).join('')}</div>`;
}
const acquisitionColumns = [
  { key: 'name', label: 'Источник', type: 'text' }, ...['installs', 'cost', 'revenue_total', 'cpi', 'income_cost', 'sessions', 'clicks', 'impressions'].map(key => ({ key, label: label(key), type: metricType(key) })),
];
function tableShell(title, subtitle, rows, columns, note = '', extraTools = '') {
  state.tableRows = rows;
  state.tableColumns = columns;
  const query = state.searches[state.section] || '';
  return panel(title, subtitle, `<div class="table-toolbar"><label class="search-box"><span class="source-path">Поиск</span><input type="search" id="table-search" value="${esc(query)}" placeholder="Найти в таблице…" aria-label="Поиск в текущей таблице"></label><span id="table-count" class="table-count"></span></div><div id="table-body"></div>${note ? `<p class="table-note">${esc(note)}</p>` : ''}`, extraTools);
}
function visibleRows() {
  const query = (state.searches[state.section] || '').toLocaleLowerCase('ru').trim();
  const rows = state.tableRows.filter(row => !query || state.tableColumns.some(column => String(row[column.key] ?? '').toLocaleLowerCase('ru').includes(query)));
  const sort = state.sorts[state.section] || { key: state.section === 'events' ? 'count' : state.section === 'acquisition' ? 'installs' : 'day', direction: 'desc' };
  return rows.sort((a, b) => {
    const aa = a[sort.key], bb = b[sort.key];
    if (aa === null || aa === undefined) return bb === null || bb === undefined ? 0 : 1;
    if (bb === null || bb === undefined) return -1;
    const result = typeof aa === 'number' && typeof bb === 'number' ? aa - bb : String(aa).localeCompare(String(bb), 'ru', { numeric: true });
    return sort.direction === 'asc' ? result : -result;
  });
}
function renderTable() {
  const target = $('#table-body');
  if (!target) return;
  const rows = visibleRows(), columns = state.tableColumns;
  $('#table-count').textContent = `${rows.length} из ${state.tableRows.length} строк`;
  $('#export-button').disabled = !rows.length || !$('#filter-error').hidden;
  if (!rows.length) {
    target.innerHTML = empty(state.tableRows.length ? 'Ничего не найдено' : 'Нет строк за этот период', state.tableRows.length ? 'Попробуйте другой поисковый запрос.' : 'Измените период или фильтры. Пустой набор данных не означает нулевую активность.');
    return;
  }
  const sort = state.sorts[state.section] || { key: state.section === 'events' ? 'count' : state.section === 'acquisition' ? 'installs' : 'day', direction: 'desc' };
  target.innerHTML = `<div class="table-scroll" role="region" aria-label="${esc(titles[state.section][0])}: таблица, прокручивается по горизонтали" tabindex="0"><table><caption class="sr-only">${esc(titles[state.section][0])} за ${esc(state.filters.start)} — ${esc(state.filters.end)}</caption><thead><tr>${columns.map(column => `<th scope="col" aria-sort="${sort.key === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}"><button class="sort-button" data-sort="${esc(column.key)}" aria-pressed="${sort.key === column.key}" aria-label="Сортировать: ${esc(column.label)}"><span>${esc(column.label)}</span><span class="sort-arrow" aria-hidden="true">${sort.key === column.key ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}</span></button></th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => {
    const value = row[column.key];
    let content = column.type === 'text' ? esc(value) : column.type === 'day' ? esc(validDay(value) ? `${shortDay(value)} ${value.slice(0, 4)}` : value) : esc(format(value, column.type));
    if (column.heat) {
      const maturity = row['mature' + column.key.slice(1)];
      content = `<span class="heat-cell ${value === null ? 'unknown' : ''}" style="--heat:${value === null ? 0 : Math.round(Math.min(1, Math.max(0, value)) * 48 + 8)}%" title="${value === null ? maturity ? 'Данные недоступны или размер когорты неизвестен' : 'Когорта ещё не созрела или дата снимка неизвестна' : esc('Удержание: ' + format(value, 'percent'))}">${content}</span>`;
    }
    return `<td>${content}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function dailyTableRows() {
  const src = source(), data = state.data, rows = filterRows(data[src], state.filters);
  if (!rows.length) return [];
  const metrics = ['installs', 'sessions', ...(src === 'daily' ? ['daus'] : []), 'revenue', 'ad_revenue', 'revenue_total', 'cost'];
  const series = Object.fromEntries(metrics.map(id => [id, new Map(timeline(data, state.filters, id).map(point => [point.day, point.value]))]));
  return daysBetween(state.filters.start, state.filters.end).map(day => ({ day, ...Object.fromEntries(metrics.map(id => [id, series[id].get(day) ?? null])) }));
}
function overview() {
  const data = state.data, src = source(), rows = filterRows(data[src], state.filters);
  const metrics = ['installs', 'sessions', ...(src === 'daily' ? ['daus'] : []), 'revenue_total'];
  if (!metrics.includes(state.chartMetric)) state.chartMetric = 'installs';
  const switcher = `<div class="panel-tools"><label for="chart-metric">Метрика</label><select id="chart-metric">${metrics.map(id => `<option value="${id}" ${state.chartMetric === id ? 'selected' : ''}>${esc(label(id))}</option>`).join('')}</select></div>`;
  const incomeChart = panel('Доход и расходы', 'Доход активности за день · расходы по сетям', chart([
    { label: 'Общий доход', color: 'var(--accent)', values: timeline(data, state.filters, 'revenue_total') },
    { label: 'Расходы сетей', color: 'var(--blue)', values: timeline(data, state.filters, 'cost') },
  ], 'income-chart', true));
  const metricChart = panel('Динамика активности', 'Ежедневные значения · UTC', chart([{ label: label(state.chartMetric), color: 'var(--accent)', values: timeline(data, state.filters, state.chartMetric) }], 'activity-chart', state.chartMetric === 'revenue_total'), switcher);
  const summary = panel('Структура дохода', 'Значения за выбранный период', `<dl class="summary-list">${['revenue', 'ad_revenue', 'revenue_total', 'sessions'].map(id => `<div><dt>${esc(label(id))}</dt><dd>${esc(format(sumMetric(data, src, rows, id), metricType(id)))}</dd></div>`).join('')}<div><dt>CTR · клики / показы</dt><dd>${esc(format(ratio(sumMetric(data, src, rows, 'clicks'), sumMetric(data, src, rows, 'impressions')), 'percent'))}</dd></div></dl>`);
  const networks = groupAcquisition(data, state.filters, 'network').filter(row => row.installs !== null).sort((a, b) => b.installs - a.installs).slice(0, 5);
  const maximum = Math.max(1, ...networks.map(row => row.installs));
  const topNetworks = panel('Ведущие сети', 'По установкам · первые 5', networks.length ? `<div class="bar-list">${networks.map(row => `<div class="bar-row"><div class="bar-label"><span>${esc(row.name)}</span><span>${esc(format(row.installs))}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, row.installs) / maximum * 100}%"></div></div></div>`).join('')}</div>` : empty('Сети недоступны', 'Нет доступных данных об установках по сетям.'), '<button class="text-button" data-action="acquisition">Все источники ↗</button>');
  const columns = [{ key: 'day', label: 'День · UTC', type: 'day' }, ...['installs', 'sessions', ...(src === 'daily' ? ['daus'] : []), 'revenue', 'ad_revenue', 'revenue_total', 'cost'].map(key => ({ key, label: label(key), type: metricType(key) }))];
  return kpiCards() + incomeChart + metricChart + `<div class="two-columns">${summary}${topNetworks}</div>` + tableShell('Данные по дням', 'Дневные суммы, используемые в графиках и экспорте', dailyTableRows(), columns, 'DAU в строке — активные пользователи за один день, суммированные по платформам. Пропущенные дни внутри заявленного покрытия считаются нулевыми только для доступных метрик непустого набора данных.');
}
function acquisition() {
  const tools = `<div class="panel-tools"><label for="group-by">Группировка</label><select id="group-by"><option value="network" ${state.group === 'network' ? 'selected' : ''}>По сети</option><option value="campaign" ${state.group === 'campaign' ? 'selected' : ''}>По кампании</option><option value="country" ${state.group === 'country' ? 'selected' : ''}>По стране</option></select></div>`;
  const columns = acquisitionColumns.map(column => column.key === 'name' ? { ...column, label: { network: 'Сеть', campaign: 'Кампания', country: 'Страна' }[state.group] } : column);
  return kpiCards() + tableShell('Источники привлечения', 'Все значения активности суммируются в выбранной группе', groupAcquisition(state.data, state.filters, state.group), columns, 'CPI использует расходы и установки по известным сетям, кроме Organic. «Доход / расходы» — отношение дохода активности к расходам за период, не когортный ROAS. Неизвестные значения показаны как «—».', tools);
}
function cohorts() {
  const revenue = state.cohortMode === 'revenue';
  const columns = [{ key: 'day', label: 'Дата установки · UTC', type: 'day' }, { key: 'installs', label: 'Установки', type: 'integer' }, ...(revenue ? [0, ...RETENTION_DAYS].map(n => ({ key: 'revenue_total_d' + n, label: 'Доход D' + n, type: 'money' })) : RETENTION_DAYS.map(n => ({ key: 'd' + n, label: 'Удержание D' + n, type: 'percent', heat: true })))];
  const tools = `<div class="panel-tools"><label for="cohort-mode">Показатель</label><select id="cohort-mode"><option value="retention" ${!revenue ? 'selected' : ''}>Удержание</option><option value="revenue" ${revenue ? 'selected' : ''}>Накопительный доход</option></select></div>`;
  return tableShell(revenue ? 'Накопительный доход когорт' : 'Удержание по когортам', 'Группировка по дате установки · фильтры платформы, сети и страны', cohortTable(state.data, state.filters), columns, revenue ? 'Доход Dn накопительный: включает IAP и рекламу от установки до дня N. Значения показываются после завершения дня N к дате снимка. Когортный ROAS не рассчитывается.' : 'Удержание Dn = активные игроки дня N / соответствующий размер когорты. День N должен завершиться к дате снимка; незрелые когорты и недоступные значения показаны как «—».', tools);
}
function events() {
  return tableShell('События игры', 'Имена из снимка источника · суммарные срабатывания за период', eventTable(state.data, state.filters), [{ key: 'name', label: 'Событие', type: 'text' }, { key: 'id', label: 'Идентификатор Adjust', type: 'text' }, { key: 'count', label: 'Срабатывания', type: 'integer' }], 'Счётчик показывает количество событий, а не уникальных игроков. Если события ещё не настроены в Adjust, таблица остаётся пустой.');
}
function status() {
  const data = state.data;
  const entries = [
    ['generated_at', 'Снимок сформирован', stamp(data.generated_at)], ['range', 'Покрытие снимка', `${data.range?.start || '—'} — ${data.range?.end || '—'}`],
    ['timezone', 'Часовой пояс', data.timezone || 'UTC'], ['currency', 'Валюта', data.currency || 'USD'],
    ['refresh', 'Интервал обновления', `${data.refresh?.interval_hours ?? 6} ч · основной ПК`],
    ['loaded', 'Источник отчёта', 'Adjust Report Service'],
  ];
  const datasets = [['daily', 'Дневная активность', 'День + платформа'], ['acquisition', 'Привлечение', 'День + платформа + сеть + кампания + страна'], ['cohorts', 'Когорты', 'Дата установки + платформа + сеть + страна'], ['event_rows', 'События', 'День + платформа + сеть + страна']];
  state.tableColumns = [{ key: 'name', label: 'Параметр', type: 'text' }, { key: 'value', label: 'Значение', type: 'text' }];
  state.tableRows = entries.map(([, name, value]) => ({ name, value }));
  state.tableRows.push(...datasets.map(([key, name]) => ({ name: 'Строки: ' + name, value: data[key].length })));
  for (const key of ['daily', 'acquisition', 'cohorts', 'events']) state.tableRows.push({ name: 'Доступные метрики: ' + ({daily:'Активность',acquisition:'Привлечение',cohorts:'Когорты',events:'События'}[key]), value: Array.isArray(data.availability?.[key]) ? data.availability[key].map(label).join(', ') : 'Не указана' });
  $('#export-button').disabled = !$('#filter-error').hidden;
  const parsed = Date.parse(data.generated_at), interval = typeof data.refresh?.interval_hours === 'number' && data.refresh.interval_hours > 0 ? data.refresh.interval_hours : 6;
  const stale = Number.isFinite(parsed) && Date.now() - parsed > interval * 3600000;
  return `<div class="status-grid">${panel('Опубликованный снимок', 'Файл данных читается напрямую с GitHub Pages', `<dl class="summary-list">${entries.map(([, name, value]) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`)}${panel('Наборы данных', 'Количество строк во всём снимке, без фильтров', `<ul class="source-list">${datasets.map(([key, name, description]) => `<li><div>${esc(name)}<small>${esc(description)}</small></div><span class="pill">${format(data[key].length)} строк</span></li>`).join('')}</ul>`)}<section class="panel wide"><div class="panel-heading"><div><h2>Доступность метрик</h2><p>Метрики, доступные в текущем отчёте</p></div></div>${['daily', 'acquisition', 'cohorts', 'events'].map(key => `<div class="notice"><strong>${esc({ daily: 'Дневная активность', acquisition: 'Привлечение', cohorts: 'Когорты', events: 'События' }[key])}</strong></div><div class="available-metrics">${Array.isArray(data.availability?.[key]) && data.availability[key].length ? data.availability[key].map(id => `<span class="pill">${esc(key === 'events' ? data.events.find(event => event.id === id)?.label || id : label(id))}</span>`).join('') : '<span class="source-path">Нет доступных метрик</span>'}</div>`).join('')}</section><section class="panel wide"><div class="notice"><strong>${stale ? 'Снимок старше ожидаемого интервала' : 'Обновление данных на ПК'}</strong><p>${esc(data.refresh?.note || 'Данные обновляются каждые 6 часов, пока ПК включён.')} Кнопка «Обновить» загружает опубликованный файл и не запускает сборщик. ${stale ? 'ПК мог быть выключен; текущие данные не следует считать актуальными.' : ''}</p></div><div class="notice"><strong>Публичный агрегированный отчёт</strong><p>Отчёт содержит только агрегированную статистику Octopus RPG. API-ключ хранится защищённо на основном ПК. Расходы берутся из рекламных сетей; все даты — UTC.${data.timezone && data.timezone !== 'UTC' ? ' Внимание: снимок указывает другой часовой пояс; интерфейс ожидает UTC.' : ''}</p></div></section></div>`;
}
function render() {
  updateMeta();
  $('#page-title').textContent = titles[state.section][0];
  $('#page-description').textContent = titles[state.section][1];
  document.querySelectorAll('[data-section]').forEach(link => {
    const active = link.dataset.section === state.section;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  state.tableRows = [];
  state.tableColumns = [];
  $('#export-button').disabled = true;
  $('#tooltip').hidden = true;
  if (!state.data) {
    $('#content').innerHTML = `<section class="panel">${empty(state.failed ? 'Снимок пока недоступен' : 'Ожидаем данные игры', 'После загрузки отчёта здесь появятся показатели, графики и таблицы игры.')}</section>`;
    return;
  }
  $('#content').innerHTML = ({ overview, acquisition, cohorts, events, status }[state.section])();
  renderTable();
}
function route() {
  const section = location.hash.slice(1);
  state.section = Object.hasOwn(titles, section) ? section : 'overview';
  render();
}
function changeFilters() {
  const start = $('#start-date').value, end = $('#end-date').value;
  const valid = validDay(start) && validDay(end) && start <= end && daysBetween(start, end).length > 0;
  $('#filter-error').hidden = valid;
  if (!valid) {
    $('#filter-error').textContent = 'Укажите корректный период: начало не позже окончания, не более 3660 дней.';
    $('#export-button').disabled = true;
    return;
  }
  state.filters = { start, end, os: $('#os-filter').value, network: $('#network-filter').value, country: $('#country-filter').value };
  render();
}
function exportCSV() {
  if ($('#export-button').disabled) return;
  const rows = state.section === 'status' ? state.tableRows : visibleRows();
  const csv = makeCSV(state.tableColumns, rows), blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `kraken-${state.section}-${state.filters.start}_${state.filters.end}.csv`;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function showTooltip(point) {
  const tooltip = $('#tooltip');
  tooltip.textContent = point.dataset.tooltip;
  tooltip.hidden = false;
  const rect = point.getBoundingClientRect(), box = tooltip.getBoundingClientRect();
  tooltip.style.left = Math.max(8, Math.min(window.innerWidth - box.width - 8, rect.left + rect.width / 2 - box.width / 2)) + 'px';
  tooltip.style.top = Math.max(8, rect.top > box.height + 16 ? rect.top - box.height - 10 : Math.min(window.innerHeight - box.height - 8, rect.bottom + 10)) + 'px';
}
try {
  const theme = localStorage.getItem('kraken-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch { /* Настройки браузера могут запретить локальное хранилище. */ }
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#theme-button').textContent = dark ? '☼' : '☾';
  $('#theme-button').setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
}
$('#theme-button').addEventListener('click', () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('kraken-theme', document.documentElement.dataset.theme); } catch { /* Тема работает и без сохранения. */ }
  updateThemeButton();
});
$('#refresh-button').addEventListener('click', load);
$('#export-button').addEventListener('click', exportCSV);
$('#filters').addEventListener('submit', event => { event.preventDefault(); changeFilters(); });
$('#preset').addEventListener('change', () => { setPreset($('#preset').value); changeFilters(); });
for (const id of ['#start-date', '#end-date']) $(id).addEventListener('change', () => { $('#preset').value = 'custom'; changeFilters(); });
for (const id of ['#os-filter', '#network-filter', '#country-filter']) $(id).addEventListener('change', changeFilters);
$('#reset-button').addEventListener('click', () => {
  $('#preset').value = '30';
  setPreset('30');
  for (const id of ['#os-filter', '#network-filter', '#country-filter']) $(id).value = '';
  state.searches = {}; state.sorts = {}; state.group = 'network'; state.chartMetric = 'installs'; state.cohortMode = 'retention';
  changeFilters();
});
$('#info-button').addEventListener('click', () => $('#info-dialog').showModal());
for (const id of ['#close-info', '#done-info']) $(id).addEventListener('click', () => $('#info-dialog').close());
$('#info-dialog').addEventListener('click', event => { if (event.target === $('#info-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action], [data-sort]');
  if (!button) return;
  if (button.dataset.action === 'retry') load();
  if (button.dataset.action === 'acquisition') location.hash = 'acquisition';
  if (button.dataset.sort) {
    const old = state.sorts[state.section] || { key: state.section === 'acquisition' ? 'installs' : state.section === 'events' ? 'count' : 'day', direction: 'desc' };
    state.sorts[state.section] = { key: button.dataset.sort, direction: old.key === button.dataset.sort && old.direction === 'desc' ? 'asc' : 'desc' };
    renderTable();
    document.querySelector(`[data-sort="${CSS.escape(button.dataset.sort)}"]`)?.focus({ preventScroll: true });
  }
});
$('#content').addEventListener('input', event => {
  if (event.target.id === 'table-search') { state.searches[state.section] = event.target.value; renderTable(); }
});
$('#content').addEventListener('change', event => {
  const id = event.target.id;
  if (id === 'group-by') state.group = event.target.value;
  else if (id === 'chart-metric') state.chartMetric = event.target.value;
  else if (id === 'cohort-mode') state.cohortMode = event.target.value;
  else return;
  render();
  $('#' + id)?.focus({ preventScroll: true });
});
$('#content').addEventListener('pointerover', event => { const point = event.target.closest('[data-tooltip]'); if (point) showTooltip(point); });
$('#content').addEventListener('pointerout', event => { if (event.target.closest('[data-tooltip]')) $('#tooltip').hidden = true; });
$('#content').addEventListener('focusin', event => { if (event.target.matches('[data-tooltip]')) showTooltip(event.target); });
$('#content').addEventListener('focusout', () => { $('#tooltip').hidden = true; });
$('#content').addEventListener('keydown', event => {
  if (event.key === 'Escape') { $('#tooltip').hidden = true; return; }
  if (!event.target.matches('[data-tooltip]') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const points = [...event.target.closest('svg').querySelectorAll('[data-tooltip]')], index = points.indexOf(event.target);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : Math.min(points.length - 1, Math.max(0, index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1)));
  points.forEach(point => point.setAttribute('tabindex', '-1'));
  points[next].setAttribute('tabindex', '0'); points[next].focus({ preventScroll: true });
});
window.addEventListener('hashchange', route);
window.addEventListener('scroll', () => { $('#tooltip').hidden = true; }, { passive: true });
window.addEventListener('resize', () => { $('#tooltip').hidden = true; }, { passive: true });
updateThemeButton(); setPreset('30'); route(); load();
