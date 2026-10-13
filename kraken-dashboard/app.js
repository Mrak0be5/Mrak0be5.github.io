import { RETENTION_DAYS, PLAYTIME_DAYS, validDay, dateUTC, shiftDay, daysBetween, filterRows, sumMetric, ratio, kpis, comparison, timeline, groupAcquisition, cohortTable, eventTable, makeCSV, normalizeData, countryName, networkName, adKey, adName } from './logic.mjs?v=20261013-expand';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const today = () => dateUTC(Date.now());
const titles = {
  overview: ['Обзор', 'Ключевые показатели игры в одном пространстве.'],
  acquisition: ['Привлечение', 'Сети, кампании и страны: от установки до дохода.'],
  campaigns: ['Кампании', 'Название рекламной кампании и её показатели.'],
  creatives: ['Креативы', 'Показатели каждого объявления с названием рекламной кампании.'],
  cohorts: ['Когорты', 'Удержание и накопительный доход по дате установки.'],
  events: ['События', 'Действия игроков за выбранный период.'],
  status: ['Данные и источник', 'Свежесть снимка, доступность метрик и покрытие отчёта.'],
};
const metricLabels = { installs: 'Установки', sessions: 'Сессии', daus: 'DAU', revenue: 'Доход IAP', ad_revenue: 'Доход от рекламы', revenue_total: 'Общий доход', revenue_events: 'Количество покупок', rewarded_count: 'Ревардеды', ad_impressions: 'Все рекламные показы', ads_per_dau: 'Реклам / активного игрока в сутки', cost: 'Расходы сетей', network_cost: 'Затраты из API сетей', network_installs: 'Установки из API сетей', clicks: 'Клики', impressions: 'Показы', cpi: 'CPI по установкам Adjust', cpi_network: 'CPI по данным сети', income_cost: 'Доход / расходы' };
const state = { data: null, section: 'overview', loading: false, failed: false, filters: { start: shiftDay(today(), -30), end: shiftDay(today(), -1), os: '', network: '', country: '', campaign: '', creative: '' }, searches: {}, sorts: {}, expandedCampaigns: new Set(), group: 'network', chartMetric: 'installs', cohortMode: 'retention', tableRows: [], tableColumns: [], request: 0 };
const acquisitionSection = () => ['acquisition','campaigns','creatives'].includes(state.section);
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
function shortDay(day) { return validDay(day) ? dateFormat.format(new Date(day + 'T00:00:00Z')) : '—'; }
function stamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(parsed) + ' UTC' : 'Дата не указана';
}
function format(value, type = 'integer', compact = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (type === 'duration') {
    const seconds = Math.max(0, Math.round(value)), minutes = Math.floor(seconds / 60);
    return minutes >= 60 ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин` : `${minutes} мин ${seconds % 60} с`;
  }
  let options = { maximumFractionDigits: type === 'integer' ? 0 : 2 };
  if (type === 'money' || type === 'money_per_user') options = { ...options, style: 'currency', currency: /^[A-Z]{3}$/.test(state.data?.currency || '') ? state.data.currency : 'USD', maximumFractionDigits: type === 'money_per_user' ? 4 : 2, minimumFractionDigits: type === 'money_per_user' ? 4 : 2 };
  if (type === 'percent') options = { style: 'percent', maximumFractionDigits: 1 };
  if (compact) options = { ...options, notation: 'compact', maximumFractionDigits: 1 };
  try { return new Intl.NumberFormat('ru-RU', options).format(value) + (type === 'multiplier' ? '×' : ''); }
  catch { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value); }
}
const moneyMetrics = ['revenue', 'ad_revenue', 'revenue_total', 'cost', 'cpi', 'cpi_network'];
const metricType = id => id.startsWith('ltv_') ? 'money_per_user' : moneyMetrics.includes(id) || id.startsWith('revenue_total_d') ? 'money' : /^(playtime|time_spent)_d/.test(id) ? 'duration' : id.startsWith('ads_per_') ? 'decimal' : id === 'income_cost' ? 'multiplier' : /^d\d+$/.test(id) ? 'percent' : 'integer';
function label(id) {
  const unit = /^(playtime|ads_per_user|ltv|ltv_ad|ltv_iap|cohort_users)_d(\d+)$/.exec(id);
  if (unit) return ({playtime:'Плейтайм / игрока',ads_per_user:'Реклам / игрока',ltv:'LTV / игрока',ltv_ad:'LTV рекламы',ltv_iap:'LTV IAP',cohort_users:'Игроков в расчёте'}[unit[1]]) + ' D' + unit[2];
  const cohort = /^(cohort_size|retained_users|revenue_total|ad_revenue_total|time_spent|ad_impressions_total_in_cohort|all_revenue_total_in_cohort|ad_revenue_total_in_cohort|revenue_total_in_cohort)_d(\d+)$/.exec(id);
  if (cohort) return ({cohort_size:'Размер когорты',retained_users:'Активные игроки',revenue_total:'Общий доход',ad_revenue_total:'Рекламный доход',time_spent:'Время всех игроков',ad_impressions_total_in_cohort:'Рекламные показы зрелой когорты',all_revenue_total_in_cohort:'Общий доход зрелой когорты',ad_revenue_total_in_cohort:'Рекламный доход зрелой когорты',revenue_total_in_cohort:'Доход IAP зрелой когорты'}[cohort[1]]) + ' D' + cohort[2];
  return Object.hasOwn(metricLabels, id) ? metricLabels[id] : state.data?.metrics.find(metric => metric.id === id)?.label || id;
}
function empty(title, body, action = '') { return `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">⌁</span><h2>${esc(title)}</h2><p>${esc(body)}</p>${action}</div>`; }
function panel(title, subtitle, body, tools = '') { return `<section class="panel"><div class="panel-heading"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>${tools}</div>${body}</section>`; }
function source() { return state.filters.network || state.filters.country || state.filters.campaign || state.filters.creative ? 'acquisition' : 'daily'; }
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
  const rows = ['daily', 'acquisition', 'cohorts', 'event_rows', 'spend_rows'].flatMap(key => state.data[key] || []);
  const values = key => [...new Set(rows.map(row => row[key]).filter(value => typeof value === 'string' && value))].sort((a, b) => a.localeCompare(b, 'ru')).map(value => [value, value]);
  fillSelect('#os-filter', values('os_name'), 'Все платформы');
  const networks = [...new Set(rows.filter(row=>row.network || row.partner_name).map(networkName))].sort((a,b)=>a.localeCompare(b,'ru'));
  fillSelect('#network-filter', networks.map(name=>[name,name]), 'Все сети');
  for (const level of ['campaign','creative']) {
    const entries = new Map();
    for (const row of rows) if (row[level+'_id'] || row[level+'_name']) entries.set(adKey(row,level),adName(row,level)+' · '+networkName(row));
    fillSelect('#'+level+'-filter',[...entries].sort((a,b)=>a[1].localeCompare(b[1],'ru')),level==='campaign'?'Все кампании':'Все креативы');
  }
  const countries = new Map();
  for (const row of rows) { const code = row.country_code || row.country; if (typeof code === 'string' && code) countries.set(code, `${countryName(row)}${row.country_code ? ' · ' + String(row.country_code).toUpperCase() : ''}`); }
  fillSelect('#country-filter', [...countries].sort((a, b) => a[1].localeCompare(b[1], 'ru')), 'Все страны');
  for (const [id, key] of [['#os-filter', 'os'], ['#network-filter', 'network'], ['#country-filter', 'country'], ['#campaign-filter','campaign'], ['#creative-filter','creative']]) state.filters[key] = $(id).value;
}
function updateMeta() {
  const { start, end, network, country, campaign, creative } = state.filters;
  $('#range-label').textContent = `${shortDay(start)} — ${shortDay(end)} · ${daysBetween(start, end).length} дней`;
  $('#incomplete-label').hidden = !(start <= today() && end >= today());
  $('#segment-label').hidden = !(network || country || campaign || creative);
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
    ['installs', 'Установки', '↓', 'integer'], ['cost', 'Расходы сетей', '↗', 'money'], ['cpi', 'CPI по установкам Adjust', '↓', 'money'],
    ['cpi_network', 'CPI по данным сети', '↓', 'money'],
    ['revenue_total', 'Общий доход', '$', 'money'],
    ['ad_revenue', 'Доход от рекламы', '▣', 'money'], ['revenue', 'Доход IAP', '◇', 'money'],
    ['revenue_events', 'Количество покупок', '▤', 'integer'], ['rewarded_count', 'Ревардеды', '▶', 'integer'],
    ['ad_impressions', 'Все рекламные показы', '◫', 'integer'],
    ['daus', 'Средний DAU', '◉', 'decimal'], ['ads_per_dau', 'Реклам / активного игрока в сутки', '◫', 'decimal'],
  ];
  return `<div class="kpi-grid">${configs.map(([id, title, icon, type]) => {
    const value = values[id], before = previous?.[id];
    let delta = '<span>Нет доступного сравнения</span>';
    if (['cost', 'cpi', 'cpi_network'].includes(id) && value === null) delta = `<span>${esc(state.data.spend?.status === 'missing' ? 'Adjust не передал затраты сетей' : id.startsWith('cpi') ? 'Нет затрат или платных установок' : 'Нет данных о расходах')}</span>`;
    if (id === 'rewarded_count' && value === null) delta = state.data.engagement?.rewarded_event_id ? '<span>Нет данных за период</span>' : '<span>Нет отдельного события в Adjust</span>';
    if (value !== null && before !== null && before !== undefined && before > 0 && $('#incomplete-label').hidden) {
      const change = (value - before) / before;
      const better = ['cost', 'cpi', 'cpi_network'].includes(id) ? change < 0 : change > 0;
      delta = `<span class="change ${change === 0 ? '' : better ? 'up' : 'down'}">${change > 0 ? '+' : ''}${esc(format(change, 'percent'))}</span><span>к предыдущему периоду</span>`;
    }
    const note = id === 'cost' ? 'Затраты той же игры · Octopus RPG + TEST1' : id === 'cpi' ? 'Расходы / платные установки Adjust' : id === 'cpi_network' ? 'Расходы / установки, сообщённые сетью' : id === 'ads_per_dau' ? 'Показы / сумма DAU за дни периода' : id === 'daus' ? 'Среднее по календарным дням' : id === 'rewarded_count' ? 'Завершённые просмотры rewarded' : id === 'ad_impressions' ? 'Все форматы · не только rewarded' : id === 'revenue_events' ? 'События оплаты, переданные в Adjust' : id === 'revenue' ? 'Покупки в приложении · USD' : id === 'ad_revenue' ? 'Доход от показов рекламы · USD' : id === 'revenue_total' ? 'IAP + рекламный доход' : '';
    return `<article class="kpi ${id === 'revenue_total' ? 'featured' : ''}" data-kpi="${id}" title="${esc(id === 'rewarded_count' ? state.data.engagement?.rewarded_note || note : note || label(id))}"><div class="kpi-top"><span>${esc(title)}</span><span class="kpi-icon" aria-hidden="true">${icon}</span></div><div class="kpi-value">${esc(format(value, type))}</div><div class="kpi-bottom">${delta}</div>${note ? `<div class="kpi-bottom" style="margin-top:9px">${esc(note)}</div>` : ''}</article>`;
  }).join('')}</div>`;
}
function playerPanel() {
  const values = kpis(state.data, state.filters);
  const columns = [['cohort_users','Игроков в расчёте'],['playtime','Плейтайм / игрока'],['ads_per_user','Реклам / игрока'],['ltv_ad','LTV рекламы'],['ltv_iap','LTV IAP'],['ltv','LTV всего']];
  return panel('На одного игрока · D0 / D1 / D7', 'Плейтайм — за день N. Реклама и LTV — накопительно от установки до дня N.',
    `<div class="table-scroll player-table" role="region" aria-label="Показатели на игрока по зрелым когортам" tabindex="0"><table><caption class="sr-only">Средние показатели на одного установившего игрока</caption><thead><tr><th scope="col">День после установки</th>${columns.map(([,name])=>`<th scope="col">${esc(name)}</th>`).join('')}</tr></thead><tbody>${PLAYTIME_DAYS.map(day=>`<tr><th scope="row">D${day}</th>${columns.map(([prefix])=>{
      const id=prefix+'_d'+day, value=values[id];
      return `<td data-unit="${id}" title="${esc(value === null ? `Нет завершённых когорт или данных D${day}` : label(id))}">${esc(format(value,metricType(id)))}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div><p class="table-note">Суммы делятся на число игроков в зрелых когортах, включая неактивных. Все рекламные форматы. Реклам на активного игрока в сутки: <strong>${esc(format(values.ads_per_dau,'decimal'))}</strong>. «—» означает отсутствие зрелой когорты или данных.</p>`, '<button class="text-button" data-action="cohorts">По дате установки ↗</button>');
}
function chart(series, chartId, type = 'integer') {
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
    svg += `<line class="gridline" x1="${left}" x2="${width - right}" y1="${py}" y2="${py}"/><text x="${left - 12}" y="${py + 4}" text-anchor="end">${esc(format(value, type, true))}</text>`;
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
      const text = `${shortDay(days[index])} ${days[index].slice(0, 4)} · UTC\n${item.label}: ${format(value, type)}`;
      svg += `<circle class="point" cx="${x(index)}" cy="${y(value)}" r="4" style="fill:${item.color}" tabindex="${focusFirst ? '0' : '-1'}" role="img" aria-label="${esc(text)}" data-tooltip="${esc(text)}"><title>${esc(text)}</title></circle>`;
      focusFirst = false;
    }
  }
  svg += '</svg>';
  return `<div class="chart">${svg}</div><div class="chart-legend">${series.map(item => `<span><i class="legend-dot" style="background:${item.color}" aria-hidden="true"></i>${esc(item.label)}</span>`).join('')}</div>`;
}
const acquisitionColumns = [
  { key: 'name', label: 'Источник', type: 'text' }, ...['installs', 'cost', 'cpi', 'cpi_network', 'network_installs', ...PLAYTIME_DAYS.map(day=>'playtime_d'+day), 'ads_per_user_d0', 'ltv_d0', 'ltv_d1', 'ltv_d7', 'ad_revenue', 'revenue', 'revenue_events', 'ad_impressions', 'revenue_total', 'income_cost', 'sessions', 'clicks', 'impressions'].map(key => ({ key, label: label(key), type: metricType(key) })),
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
  const sort = state.sorts[state.section] || { key: state.section === 'events' ? 'count' : acquisitionSection() ? 'installs' : 'day', direction: 'desc' };
  return rows.sort((a, b) => {
    const aa = a[sort.key], bb = b[sort.key];
    if (aa === null || aa === undefined) return bb === null || bb === undefined ? 0 : 1;
    if (bb === null || bb === undefined) return -1;
    const result = typeof aa === 'number' && typeof bb === 'number' ? aa - bb : String(aa).localeCompare(String(bb), 'ru', { numeric: true });
    return sort.direction === 'asc' ? result : -result;
  });
}
function tableRow(row, columns, child = false) {
  return `<tr${child ? ` class="creative-row" data-parent-campaign="${esc(row.campaign_key)}"` : row.creatives ? ` data-campaign="${esc(row.entity_key)}"` : ''}>${columns.map(column => {
    const value = row[column.key], dimension = child && column.key === 'name' ? 'creative' : column.dimension;
    let content = column.type === 'entity' && /не передан[а]?$/.test(String(value)) ? esc(value) : column.type === 'entity' ? `<button class="text-button" data-entity="${esc(row.entity_key)}" data-dimension="${esc(dimension)}" title="${esc('Выбрать '+value)}">${esc(value)}</button>` : column.type === 'text' ? esc(value || '—') : column.type === 'day' ? esc(validDay(value) ? `${shortDay(value)} ${value.slice(0, 4)}` : value) : esc(format(value, column.type));
    if (column.key === 'name' && row.creatives) {
      const expanded = state.expandedCampaigns.has(row.entity_key);
      content = `<div class="campaign-name"><button class="campaign-toggle" data-expand-campaign="${esc(row.entity_key)}" aria-expanded="${expanded}" aria-label="${esc((expanded ? 'Свернуть' : 'Развернуть')+' кампанию '+row.name)}"><span class="campaign-arrow" aria-hidden="true">›</span></button><div>${content}<small class="entity-detail">Креативов: ${row.creatives.length}</small></div></div>`;
    } else if (column.key === 'name' && child) {
      content = `<div class="creative-name">${content}<small class="entity-detail">Креатив · ${esc(row.adgroup_name)}<br>ID: ${esc(row.creative_id || 'не передан')}</small></div>`;
    }
    if (column.heat) {
      const maturity = row['mature' + column.key.slice(1)];
      content = `<span class="heat-cell ${value === null ? 'unknown' : ''}" style="--heat:${value === null ? 0 : Math.round(Math.min(1, Math.max(0, value)) * 48 + 8)}%" title="${value === null ? maturity ? 'Данные недоступны или размер когорты неизвестен' : 'Когорта ещё не созрела или дата снимка неизвестна' : esc('Удержание: ' + format(value, 'percent'))}">${content}</span>`;
    }
    return `<td>${content}</td>`;
  }).join('')}</tr>`;
}
function renderTable() {
  const target = $('#table-body');
  if (!target) return;
  const rows = visibleRows(), columns = state.tableColumns;
  const childCount = rows.reduce((total,row)=>total+(state.expandedCampaigns.has(row.entity_key) ? row.creatives?.length || 0 : 0),0);
  $('#table-count').textContent = `${rows.length} из ${state.tableRows.length} ${columns[0]?.dimension === 'campaign' ? 'кампаний' : 'строк'}${childCount ? ' · креативов: '+childCount : ''}`;
  $('#export-button').disabled = !rows.length || !$('#filter-error').hidden;
  if (!rows.length) {
    target.innerHTML = empty(state.tableRows.length ? 'Ничего не найдено' : 'Нет строк за этот период', state.tableRows.length ? 'Попробуйте другой поисковый запрос.' : 'Измените период или фильтры. Пустой набор данных не означает нулевую активность.');
    return;
  }
  const sort = state.sorts[state.section] || { key: state.section === 'events' ? 'count' : acquisitionSection() ? 'installs' : 'day', direction: 'desc' };
  target.innerHTML = `<div class="table-scroll" role="region" aria-label="${esc(titles[state.section][0])}: таблица, прокручивается по горизонтали" tabindex="0"><table><caption class="sr-only">${esc(titles[state.section][0])} за ${esc(state.filters.start)} — ${esc(state.filters.end)}</caption><thead><tr>${columns.map(column => `<th scope="col" aria-sort="${sort.key === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}"><button class="sort-button" data-sort="${esc(column.key)}" aria-pressed="${sort.key === column.key}" aria-label="Сортировать: ${esc(column.label)}"><span>${esc(column.label)}</span><span class="sort-arrow" aria-hidden="true">${sort.key === column.key ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}</span></button></th>`).join('')}</tr></thead><tbody>${rows.map(row => tableRow(row,columns)+(state.expandedCampaigns.has(row.entity_key) ? (row.creatives || []).map(child=>tableRow(child,columns,true)).join('') : '')).join('')}</tbody></table></div>`;
}
function dailyTableRows() {
  const src = source(), data = state.data, rows = filterRows(data[src], state.filters);
  if (!rows.length) return [];
  const metrics = ['installs', 'sessions', ...(src === 'daily' ? ['daus'] : []), 'revenue', 'ad_revenue', 'revenue_events', 'ad_impressions', 'rewarded_count', 'revenue_total', 'cost'];
  const series = Object.fromEntries(metrics.map(id => [id, new Map(timeline(data, state.filters, id).map(point => [point.day, point.value]))]));
  const cohorts = new Map(cohortTable(data,state.filters).map(row=>[row.day,row]));
  return daysBetween(state.filters.start, state.filters.end).map(day => {
    const result = {day,...cohorts.get(day),...Object.fromEntries(metrics.map(id=>[id,series[id].get(day)??null]))};
    const values = kpis(data,{...state.filters,start:day,end:day});
    result.cpi = values.cpi;
    result.cpi_network = values.cpi_network;
    result.network_installs = values.network_installs;
    result.ads_per_dau = ratio(result.ad_impressions,result.daus);
    return result;
  });
}
function overview() {
  const data = state.data, src = source(), rows = filterRows(data[src], state.filters);
  const metrics = ['installs', 'sessions', ...(src === 'daily' ? ['daus','ads_per_dau'] : []), 'cost', 'cpi', 'cpi_network', 'revenue_total', 'ad_revenue', 'revenue', 'revenue_events', 'ad_impressions', 'rewarded_count'];
  if (!metrics.includes(state.chartMetric)) state.chartMetric = 'installs';
  const switcher = `<div class="panel-tools"><label for="chart-metric">Метрика</label><select id="chart-metric">${metrics.map(id => `<option value="${id}" ${state.chartMetric === id ? 'selected' : ''}>${esc(label(id))}</option>`).join('')}</select></div>`;
  const incomeChart = panel('Реклама и IAP — доходы отдельно', 'Доход за день · USD', chart([
    { label: 'Доход от рекламы', color: 'var(--accent)', values: timeline(data, state.filters, 'ad_revenue') },
    { label: 'Доход IAP', color: 'var(--blue)', values: timeline(data, state.filters, 'revenue') },
  ], 'income-chart', 'money'));
  const metricChart = panel('Динамика активности', 'Ежедневные значения · UTC', chart([{ label: label(state.chartMetric), color: 'var(--accent)', values: timeline(data, state.filters, state.chartMetric) }], 'activity-chart', metricType(state.chartMetric)), switcher);
  const summary = panel('Структура дохода', 'Значения за выбранный период', `<dl class="summary-list">${['revenue', 'ad_revenue', 'revenue_total', 'sessions'].map(id => `<div><dt>${esc(label(id))}</dt><dd>${esc(format(sumMetric(data, src, rows, id), metricType(id)))}</dd></div>`).join('')}<div><dt>Средний DAU</dt><dd>${esc(format(kpis(data,state.filters).daus,'decimal'))}</dd></div><div><dt>CTR · клики / показы</dt><dd>${esc(format(ratio(sumMetric(data, src, rows, 'clicks'), sumMetric(data, src, rows, 'impressions')), 'percent'))}</dd></div></dl>`);
  const networks = groupAcquisition(data, state.filters, 'network').filter(row => row.installs !== null).sort((a, b) => b.installs - a.installs).slice(0, 5);
  const maximum = Math.max(1, ...networks.map(row => row.installs));
  const topNetworks = panel('Ведущие сети', 'По установкам · первые 5', networks.length ? `<div class="bar-list">${networks.map(row => `<div class="bar-row"><div class="bar-label"><span>${esc(row.name)}</span><span>${esc(format(row.installs))}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, row.installs) / maximum * 100}%"></div></div></div>`).join('')}</div>` : empty('Сети недоступны', 'Нет доступных данных об установках по сетям.'), '<button class="text-button" data-action="acquisition">Все источники ↗</button>');
  const columns = [{ key: 'day', label: 'День · UTC', type: 'day' }, ...['installs', 'cost', 'cpi', 'cpi_network', 'network_installs', ...PLAYTIME_DAYS.map(day=>'playtime_d'+day), 'ads_per_user_d0', 'ltv_d0', 'ltv_d1', 'ltv_d7', ...(src === 'daily' ? ['daus','ads_per_dau'] : []), 'ad_revenue', 'revenue', 'revenue_events', 'ad_impressions', 'rewarded_count', 'revenue_total', 'sessions'].map(key => ({ key, label: label(key), type: metricType(key) }))];
  return kpiCards() + playerPanel() + incomeChart + metricChart + `<div class="two-columns">${summary}${topNetworks}</div>` + tableShell('Данные по дням', 'Активность дня и показатели игроков, установивших игру в этот день', dailyTableRows(), columns, 'Плейтайм, реклама на игрока и LTV относятся к дате установки в строке. Остальные показатели — к календарному дню активности. LTV включает накопленные доходы рекламы и IAP. Реклам / активного игрока = показы за день / DAU. CPI исключает Organic и неизвестные источники. Незрелые когорты и отсутствующие затраты показаны как «—».');
}
function acquisition() {
  const dimension = state.section==='campaigns' ? 'campaign' : state.section==='creatives' ? 'creative' : state.group;
  const entity = ['campaign','creative'].includes(dimension);
  const tools = state.section==='acquisition' ? `<div class="panel-tools"><label for="group-by">Группировка</label><select id="group-by">${[['network','По сети'],['campaign','По кампании'],['creative','По креативу'],['country','По стране']].map(([id,name])=>`<option value="${id}" ${dimension===id?'selected':''}>${name}</option>`).join('')}</select></div>` : '';
  const columns = acquisitionColumns.map(column => column.key === 'name' ? { ...column, label: { network: 'Сеть', campaign: 'Кампания / креатив', creative:'Название креатива', country: 'Страна' }[dimension], ...(entity?{type:'entity',dimension}:{}) } : column);
  if (entity) columns.splice(1,0,{key:'network_name',label:'Сеть',type:'text'}, ...(dimension==='creative'?[{key:'campaign_name',label:'Рекламная кампания',type:'text'},{key:'adgroup_name',label:'Группа объявлений',type:'text'},{key:'creative_id',label:'ID объявления',type:'text'}]:[{key:'campaign_id',label:'ID кампании',type:'text'}]));
  const rows = groupAcquisition(state.data, state.filters, dimension);
  if (dimension === 'campaign') {
    const creatives = groupAcquisition(state.data,state.filters,'creative');
    for (const row of rows) row.creatives = creatives.filter(creative=>creative.campaign_key === row.entity_key).sort((a,b)=>(b.installs || 0)-(a.installs || 0) || a.name.localeCompare(b.name,'ru'));
  }
  return kpiCards() + playerPanel() + tableShell(dimension==='creative'?'Показатели по каждому креативу':dimension==='campaign'?'Рекламные кампании':'Источники привлечения', dimension==='campaign' ? 'Нажмите стрелку слева от кампании, чтобы увидеть её креативы и показатели' : 'Затраты, CPI, плейтайм, рекламы на игрока и LTV', rows, columns, (dimension==='campaign' ? 'Стрелка раскрывает креативы, сохраняя фильтры и итоги кампании. CSV этого раздела содержит итоги кампаний; данные объявлений экспортируются в «Креативах». ' : '')+'Нажмите на название кампании или креатива, чтобы выбрать его во всех разделах. Facebook включает Facebook, Instagram и Off-Facebook. CPI Adjust и CPI сети используют разные счётчики установок. Одинаковые названия с разными ID учитываются отдельно. «Не передан» — данные без привязки из Adjust; расходы между креативами не распределяются предположительно.', tools);
}
function cohorts() {
  const mode = state.cohortMode;
  const values = mode === 'unit'
    ? PLAYTIME_DAYS.flatMap(n => ['playtime','ads_per_user','ltv'].map(prefix=>({key:prefix+'_d'+n,label:label(prefix+'_d'+n),type:metricType(prefix+'_d'+n)})))
    : mode === 'playtime'
    ? PLAYTIME_DAYS.map(n => ({key:'playtime_d'+n,label:'Плейтайм D'+n,type:'duration'}))
    : mode === 'revenue' ? [0,...RETENTION_DAYS].map(n => ({key:'revenue_total_d'+n,label:'Доход D'+n,type:'money'}))
    : RETENTION_DAYS.map(n => ({key:'d'+n,label:'Удержание D'+n,type:'percent',heat:true}));
  const columns = [{key:'day',label:'Дата установки · UTC',type:'day'},{key:'installs',label:'Установки',type:'integer'},...values];
  const tools = `<div class="panel-tools"><label for="cohort-mode">Показатель</label><select id="cohort-mode">${[['unit','Плейтайм, реклама и LTV / игрока'],['retention','Удержание'],['revenue','Накопительный доход'],['playtime','Плейтайм на игрока']].map(([id,name])=>`<option value="${id}" ${mode===id?'selected':''}>${name}</option>`).join('')}</select></div>`;
  const title = mode === 'unit' ? 'Плейтайм, реклама и LTV на игрока' : mode === 'playtime' ? 'Средний плейтайм на игрока' : mode === 'revenue' ? 'Накопительный доход когорт' : 'Удержание по когортам';
  const note = mode === 'unit' ? 'Для D0/D1/D7 плейтайм считается за соответствующий день, реклама и LTV — накопительно с установки. Делитель — размер зрелой когорты, включая неактивных игроков. LTV = доход рекламы + доход IAP на игрока. CSV сохраняет время в секундах.' : mode === 'playtime' ? 'D0 — первые 24 часа, D1 — часы 24–48, D7 — часы 168–192 после установки. Время показывается за конкретный день, не накопительно. Суммарные секунды делятся на размер зрелой когорты, включая неактивных игроков. В CSV время хранится в секундах.' : mode === 'revenue' ? 'Доход Dn накопительный: включает IAP и рекламу от установки до дня N. Значения показываются после завершения дня N к дате снимка.' : 'Удержание Dn = активные игроки дня N / соответствующий размер когорты. Незрелые когорты и недоступные значения показаны как «—».';
  return tableShell(title,'Группировка по дате установки · фильтры платформы, сети и страны',cohortTable(state.data,state.filters),columns,note,tools);
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
    ['spend', 'Источник затрат и CPI', data.spend?.note || 'Затраты сетей из Adjust'],
  ];
  const datasets = [['daily', 'Дневная активность', 'День + платформа'], ['acquisition', 'Привлечение', 'День + платформа + сеть + кампания + страна'], ['cohorts', 'Когорты', 'Дата установки + платформа + сеть + страна'], ['spend_rows', 'Расходы сетей', 'Та же игра · Octopus RPG и TEST1 без повторного сложения'], ['event_rows', 'События', 'День + платформа + сеть + страна']];
  state.tableColumns = [{ key: 'name', label: 'Параметр', type: 'text' }, { key: 'value', label: 'Значение', type: 'text' }];
  state.tableRows = entries.map(([, name, value]) => ({ name, value }));
  state.tableRows.push(...datasets.map(([key, name]) => ({ name: 'Строки: ' + name, value: data[key]?.length || 0 })));
  for (const key of ['daily', 'acquisition', 'cohorts', 'spend', 'events']) state.tableRows.push({ name: 'Доступные метрики: ' + ({daily:'Активность',acquisition:'Привлечение',cohorts:'Когорты',spend:'Расходы сетей',events:'События'}[key]), value: Array.isArray(data.availability?.[key]) ? data.availability[key].map(label).join(', ') : 'Не указана' });
  $('#export-button').disabled = !$('#filter-error').hidden;
  const parsed = Date.parse(data.generated_at), interval = typeof data.refresh?.interval_hours === 'number' && data.refresh.interval_hours > 0 ? data.refresh.interval_hours : 6;
  const stale = Number.isFinite(parsed) && Date.now() - parsed > interval * 3600000;
  return `<div class="status-grid">${panel('Опубликованный снимок', 'Файл данных читается напрямую с GitHub Pages', `<dl class="summary-list">${entries.map(([, name, value]) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`)}${panel('Наборы данных', 'Количество строк во всём снимке, без фильтров', `<ul class="source-list">${datasets.map(([key, name, description]) => `<li><div>${esc(name)}<small>${esc(description)}</small></div><span class="pill">${format((data[key]?.length || 0))} строк</span></li>`).join('')}</ul>`)}<section class="panel wide"><div class="panel-heading"><div><h2>Доступность метрик</h2><p>Метрики, доступные в текущем отчёте</p></div></div>${['daily', 'acquisition', 'cohorts', 'spend', 'events'].map(key => `<div class="notice"><strong>${esc({ daily: 'Дневная активность', acquisition: 'Привлечение', cohorts: 'Когорты', spend: 'Расходы сетей', events: 'События' }[key])}</strong></div><div class="available-metrics">${Array.isArray(data.availability?.[key]) && data.availability[key].length ? data.availability[key].map(id => `<span class="pill">${esc(key === 'events' ? data.events.find(event => event.id === id)?.label || id : label(id))}</span>`).join('') : '<span class="source-path">Нет доступных метрик</span>'}</div>`).join('')}</section><section class="panel wide"><div class="notice"><strong>${stale ? 'Снимок старше ожидаемого интервала' : 'Обновление данных на ПК'}</strong><p>${esc(data.refresh?.note || 'Данные обновляются каждые 6 часов, пока ПК включён.')} Кнопка «Обновить» загружает опубликованный файл и не запускает сборщик. ${stale ? 'ПК мог быть выключен; текущие данные не следует считать актуальными.' : ''}</p></div><div class="notice"><strong>Публичный агрегированный отчёт</strong><p>Отчёт содержит только агрегированную статистику Octopus RPG. API-ключ хранится защищённо на основном ПК. Расходы берутся из рекламных сетей; все даты — UTC.${data.timezone && data.timezone !== 'UTC' ? ' Внимание: снимок указывает другой часовой пояс; интерфейс ожидает UTC.' : ''}</p></div></section></div>`;
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
  $('#content').innerHTML = ({ overview, acquisition, campaigns:acquisition, creatives:acquisition, cohorts, events, status }[state.section])();
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
  state.filters = { start, end, os: $('#os-filter').value, network: $('#network-filter').value, country: $('#country-filter').value, campaign:$('#campaign-filter').value, creative:$('#creative-filter').value };
  render();
}
function exportCSV() {
  if ($('#export-button').disabled) return;
  const rows = state.section === 'status' ? state.tableRows : visibleRows();
  const csv = makeCSV(state.tableColumns.map(column => column.type === 'duration' ? {...column,label:column.label+' (сек)'} : column), rows), blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
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
for (const id of ['#os-filter', '#network-filter', '#country-filter', '#campaign-filter', '#creative-filter']) $(id).addEventListener('change',()=>{if(id==='#campaign-filter')$('#creative-filter').value='';changeFilters();});
$('#reset-button').addEventListener('click', () => {
  $('#preset').value = '30';
  setPreset('30');
  for (const id of ['#os-filter', '#network-filter', '#country-filter', '#campaign-filter', '#creative-filter']) $(id).value = '';
  state.searches = {}; state.sorts = {}; state.expandedCampaigns.clear(); state.group = 'network'; state.chartMetric = 'installs'; state.cohortMode = 'retention';
  changeFilters();
});
$('#info-button').addEventListener('click', () => $('#info-dialog').showModal());
for (const id of ['#close-info', '#done-info']) $(id).addEventListener('click', () => $('#info-dialog').close());
$('#info-dialog').addEventListener('click', event => { if (event.target === $('#info-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action], [data-sort], [data-entity], [data-expand-campaign]');
  if (!button) return;
  if (button.dataset.action === 'retry') load();
  if (button.dataset.action === 'acquisition') location.hash = 'acquisition';
  if (button.dataset.action === 'cohorts') { state.cohortMode = 'unit'; location.hash = 'cohorts'; }
  if (button.dataset.expandCampaign) {
    const key = button.dataset.expandCampaign, scroll = $('#table-body .table-scroll');
    const position = {left:scroll.scrollLeft,top:scroll.scrollTop};
    if (state.expandedCampaigns.has(key)) state.expandedCampaigns.delete(key); else state.expandedCampaigns.add(key);
    renderTable();
    $('#table-body .table-scroll').scrollTo(position);
    document.querySelector(`[data-expand-campaign="${CSS.escape(key)}"]`)?.focus({preventScroll:true});
  }
  if (button.dataset.entity) {
    const dimension=button.dataset.dimension;
    if (dimension==='campaign') $('#creative-filter').value='';
    $('#'+dimension+'-filter').value=button.dataset.entity;
    changeFilters();
  }
  if (button.dataset.sort) {
    const old = state.sorts[state.section] || { key: acquisitionSection() ? 'installs' : state.section === 'events' ? 'count' : 'day', direction: 'desc' };
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
