import {DEFAULTS,BASE_METRICS,COHORT_METRICS,LABELS,escapeHTML as e,number,derived,toCSV,normalize,presetDates,sortRows} from './data.js';
import {API_BASE,PUBLIC_MODE,SNAPSHOT_MODE} from './config.js';

const $ = selector => document.querySelector(selector);
if (PUBLIC_MODE) {
  $('.workspace div').innerHTML = 'Публичный дашборд<small>Данные Adjust</small>';
  $('.lock').setAttribute('aria-label','Публичный');
  $('.private-note').textContent = SNAPSHOT_MODE ? 'Данные Adjust · ключ хранится на ПК' : 'Живые данные · ключ хранится на сервере';
  $('.private-badge').textContent = '◉ Публичный доступ';
}
const STORAGE = 'adjust-workspace-v1';
const VIEWS = {
  overview:{name:'Обзор',title:'Обзор эффективности',description:'Закупка, выручка и результат — в одном отчёте.',table:'Эффективность по сетям',dimensions:['network'],metrics:BASE_METRICS},
  acquisition:{name:'Привлечение',title:'Привлечение пользователей',description:'Оцените кампании и найдите эффективные источники роста.',table:'Эффективность кампаний',dimensions:['network','campaign'],metrics:BASE_METRICS},
  cohorts:{name:'Когорты',title:'Когортная аналитика',description:'Удержание и накопленная выручка пользователей после установки.',table:'Когорты по сетям',dimensions:['network'],metrics:COHORT_METRICS},
  constructor:{name:'Конструктор отчёта',title:'Ваш отчёт, ваши правила',description:'Соберите нужные измерения, метрики и условия.',table:'Детализация отчёта',dimensions:['network'],metrics:BASE_METRICS}
};
const MULTI = [
  ['apps','app_token__in','Приложения'],['os_names','os_name__in','Операционные системы'],['countries','country_code__in','Страны'],['networks','network__in','Рекламные сети']
];
const SETTINGS = [
  ['currency','currencies','Валюта',[]],['utc_offset','utc_offset','Часовой пояс',[]],
  ['attribution_types','attribution_types','Тип атрибуции',[]],['attribution_source','attribution_source','Источник атрибуции',['dynamic','first']],
  ['reattributed','reattributed','Реатрибуция',['all','true','false']],['cohort_maturity','cohort_maturity','Зрелость когорт',['mature','immature']],
  ['ad_spend_mode','ad_spend_mode','Расходы',['network','adjust']],['sandbox','sandbox','Окружение',['false','true']],
  ['iap_revenue_mode','iap_revenue_mode','Выручка IAP',['GROSS_100','GROSS_85','GROSS_70','GROSS_60']],
  ['ad_revenue_sources','ad_revenue_sources','Источник рекламной выручки',['applovin_max_sdk']],
  ['subscription_revenue_mode','subscription_revenue_mode','Выручка подписок',[]],
  ['skad_time_adjustment','skad_time_adjustment','Окно SKAdNetwork',[]],
  ['period_over_period','period_over_period','Сравнение периодов',[]]
];
const OPTION_LABELS = {GROSS_100:'Без комиссии · 100%',GROSS_85:'Комиссия 15% · NET 85%',GROSS_70:'Комиссия 30% · NET 70%',GROSS_60:'Комиссия 40% · NET 60%',applovin_max_sdk:'AppLovin MAX SDK',dynamic:'Динамический',first:'Первый источник',all:'Все',true:'Да',false:'Нет',mature:'Зрелые',immature:'Незрелые',network:'По данным сетей',adjust:'По данным Adjust'};
const OPS = {__in:'В списке',__not_in:'Не в списке',__contains:'Содержит',__exclude:'Не содержит',__starts_with:'Начинается с',__not_starts_with:'Не начинается с',__ends_with:'Заканчивается на',__not_ends_with:'Не заканчивается на',__lt:'< Меньше',__lte:'≤ Не больше',__gt:'> Больше',__gte:'≥ Не меньше',__eq:'= Равно',__ne:'≠ Не равно'};
const state = {catalog:null,dimensions:[],metrics:[],view:'overview',report:null,snapshot:null,error:'',warnings:[],busy:false,dirty:false,sort:{key:'',direction:-1},page:0,controller:null,request:0,editorKind:'',editorSelection:[],revision:0};
let saved = {};
try { const raw = JSON.parse(localStorage.getItem(STORAGE) || '{}'); if (raw && typeof raw === 'object') saved = raw; } catch { /* Настройки недоступны; отчёты работают без хранилища. */ }
const dates = Array.isArray(saved.dates) && saved.dates.length === 2 && saved.dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) ? saved.dates : presetDates('30');
$('#date-start').value = dates[0];$('#date-end').value = dates[1];
if (saved.theme === 'dark') document.documentElement.dataset.theme = 'dark';
updateTheme();
function label(id) { return LABELS[id] || [...(state.catalog?.attributes || []),...(state.catalog?.dimensions || [])].find(x => x.id === id)?.name || id; }
function options(items, selected, ownLabels = false) { const values=String(selected).split(',');return items.map(item => `<option value="${e(item.id)}" ${values.includes(item.id) ? 'selected' : ''}>${e(ownLabels ? item.name : OPTION_LABELS[item.id] || item.name)}</option>`).join(''); }
function settingValue(key) { const select=$(`[name="${key}"]`);return select?.multiple ? [...select.options].filter(x=>x.selected).map(x=>x.value).filter(Boolean).join(',') : select?.value || ''; }
function setSetting(select,value) { const values=String(value).split(',');for(const item of values)if(item && ![...select.options].some(x=>x.value===item))select.add(new Option(OPTION_LABELS[item]||item,item));if(select.multiple){for(const option of select.options)option.selected=values.includes(option.value);}else select.value=String(value); }
function empty(title,description = '') { return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">◫</span><strong>${e(title)}</strong><span>${e(description)}</span></div>`; }
function format(value,key,compact = false) {
  const n = number(value);if (n === null) return '—';
  const meta = state.catalog?.attributes.find(x => x.id === key);
  const formatting = String(meta?.formatting || '').toLowerCase();
  const percent = /(?:^|_)(?:roas|roi|ctr|retention|retention_rate|conversion_rate|rate)(?:_|$)/.test(key) || key === 'net_roas' || /percent/.test(formatting);
  const count = formatting==='integer' || /_(?:events|users)$|revenue_events|revenue_users|purchases|payers|buyers|_count|cohort_size/.test(key);
  const monetary = !percent && !count && (/revenue|cost|spend|profit|cpi|cpa|ecpm|arpu|arppu/.test(key) || /currency|money/.test(formatting));
  const display = percent && key !== 'net_roas' ? n * 100 : n;
  const currency = state.snapshot?.parameters.currency || 'USD';
  try {
    if (monetary) return new Intl.NumberFormat('ru-RU',{style:'currency',currency,maximumFractionDigits:compact && Math.abs(n)>10000 ? 0 : 2,notation:compact && Math.abs(n)>=1000000 ? 'compact' : 'standard'}).format(n);
    return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:percent ? 2 : Number.isInteger(display) ? 0 : 2,notation:compact && Math.abs(display)>=1000000 ? 'compact' : 'standard'}).format(display) + (percent ? '%' : '');
  } catch { return n.toLocaleString('ru-RU',{maximumFractionDigits:2}); }
}
function save() {
  if (!state.catalog) {
    try { localStorage.setItem(STORAGE,JSON.stringify({...saved,theme:document.documentElement.dataset.theme})); } catch {}
    return;
  }
  const parameters = {};
  for (const [,key] of MULTI) parameters[key] = Array.from(document.querySelectorAll(`[data-multi="${key}"] option:checked`),x => x.value);
  for (const [key] of SETTINGS) parameters[key] = settingValue(key);
  for (const key of ['campaign__contains','adgroup__contains','creative__contains']) parameters[key] = $(`[name="${key}"]`).value;
  try {localStorage.setItem(STORAGE,JSON.stringify({theme:document.documentElement.dataset.theme,dates:[$('#date-start').value,$('#date-end').value],parameters,conditions:readConditions(false),view:state.view,dimensions:state.dimensions,metrics:state.metrics}));} catch { /* Приватный режим может запрещать localStorage. */ }
}
function updateTheme() { $('#theme-toggle span').textContent = document.documentElement.dataset.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'; }
$('#theme-toggle').addEventListener('click',() => {document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';updateTheme();save();});
function markDirty() {state.revision++;state.dirty = true;updateChips();renderNotices();save();}
function buildFilters() {
  const filters = state.catalog.filters;
  $('#main-filters').innerHTML = MULTI.map(([source,key,title]) => {
    const values = normalize(filters[source]);
    const selected = Array.isArray(saved.parameters?.[key]) ? saved.parameters[key] : [];
    return `<div><span class="filter-caption">${e(title)}</span><details class="multi-filter"><summary><span data-selection-label="${key}">Все</span></summary><div class="multi-popover"><input type="search" data-multi-search="${key}" placeholder="Поиск…" aria-label="Поиск: ${e(title)}"><select multiple data-multi="${key}" aria-label="${e(title)}">${values.map(item => `<option value="${e(item.id)}" ${selected.includes(item.id) ? 'selected' : ''}>${e(item.name)}</option>`).join('')}</select><button type="button" class="multi-clear" data-clear="${key}">Очистить выбор</button><p>${values.length ? 'Несколько значений: Ctrl / ⌘ + клик. На телефоне — системный выбор.' : 'Список недоступен в каталоге.'}</p></div></details></div>`;
  }).join('');
  $('#advanced-filters').innerHTML = SETTINGS.map(([key,source,title,fallback]) => {
    let items = normalize(filters[source]);
    if (!items.length) items = normalize(fallback);
    if (SNAPSHOT_MODE) items = normalize(state.catalog.snapshot.settings[key] || []);
    if (!SNAPSHOT_MODE && key === 'ad_revenue_sources' && !items.some(x => x.id === 'all')) items.unshift({id:'all',name:'Все источники рекламы'});
    const stored = String(saved.parameters?.[key] ?? state.catalog.defaults[key] ?? DEFAULTS[key] ?? '');
    const value = SNAPSHOT_MODE && !stored.split(',').every(part=>items.some(x=>x.id===part)) ? String(state.catalog.defaults[key] ?? '') : stored;
    for(const part of value.split(',').filter(Boolean)) if(!items.some(x=>x.id===part))items.unshift({id:part,name:part});
    const multiple=['attribution_types','ad_revenue_sources'].includes(key)&&(!SNAPSHOT_MODE||items.length>1);
    return `<label ${SNAPSHOT_MODE&&!items.length?'style="display:none"':''}>${e(title)}${multiple ? ' · мультивыбор' : ''}<select name="${key}" ${SNAPSHOT_MODE && items.length<2 ? 'disabled title="Параметр зафиксирован в автоматической выгрузке"' : ''} ${multiple ? 'multiple size="3"' : ''} ${key === 'sandbox' ? 'aria-description="Да — тестовые данные, Нет — рабочие"' : ''}>${!value && !multiple ? '<option value="">По умолчанию API</option>' : ''}${options(key === 'sandbox' ? items.map(item => ({...item,name:item.id === 'true' ? 'Тестовое' : item.id === 'false' ? 'Рабочее' : item.name})) : items,value,key === 'sandbox')}</select></label>`;
  }).join('');
  for (const [key] of SETTINGS) {
    const select=$(`[name="${key}"]`),value=saved.parameters?.[key] ?? state.catalog.defaults[key] ?? DEFAULTS[key] ?? '';
    setSetting(select,SNAPSHOT_MODE && !String(value).split(',').every(part=>[...select.options].some(x=>x.value===part)) ? state.catalog.defaults[key] ?? '' : value);
  }
  for (const key of ['campaign__contains','adgroup__contains','creative__contains']) $(`[name="${key}"]`).value = typeof saved.parameters?.[key] === 'string' ? saved.parameters[key] : '';
  $('#main-filters').addEventListener('input',event => {if (event.target.matches('[data-multi-search]')) {
    const select = $(`[data-multi="${event.target.dataset.multiSearch}"]`), search = event.target.value.toLocaleLowerCase('ru');
    for (const option of select.options) option.hidden = !option.textContent.toLocaleLowerCase('ru').includes(search);
  }});
  $('#main-filters').addEventListener('change',event => {if (event.target.matches('[data-multi]')) {selectionLabels();markDirty();}});
  $('#main-filters').addEventListener('click',event => {const key = event.target.dataset.clear;if (!key) return;for (const option of $(`[data-multi="${key}"]`).options) option.selected = false;selectionLabels();markDirty();});
  for (const item of Array.isArray(saved.conditions) ? saved.conditions : []) addCondition(item);
  selectionLabels();updateChips();
}
function selectionLabels() {
  for (const [,key] of MULTI) {
    const selected = [...$(`[data-multi="${key}"]`).options].filter(x=>x.selected);
    $(`[data-selection-label="${key}"]`).textContent = selected.length === 1 ? selected[0].textContent : selected.length ? `Выбрано: ${selected.length}` : 'Все';
  }
}
function updateChips() {
  const current = Object.fromEntries(SETTINGS.map(([key]) => [key,settingValue(key)]));
  const mode = current.iap_revenue_mode || DEFAULTS.iap_revenue_mode;
  const match = /^GROSS_(\d+)$/.exec(mode);
  const commission = match ? `Комиссия сторов ${100-Number(match[1])}%` : `IAP: ${mode}`;
  const source = current.ad_revenue_sources || DEFAULTS.ad_revenue_sources;
  $('#parameter-chips').innerHTML = `<span class="chip">${e(commission)}</span><span class="chip">${e(source.split(',').map(x=>OPTION_LABELS[x]||x).join(' + '))}</span><span class="chip neutral">${e(current.currency || 'USD')} · UTC${e(current.utc_offset || '+00:00')}</span>${current.sandbox === 'true' ? '<span class="chip">Тестовое окружение</span>' : ''}`;
}
function conditionFields() {return [...state.catalog.dimensions,...state.catalog.attributes].filter((x,i,a) => a.findIndex(y => y.id === x.id) === i);}
function addCondition(initial = {}) {
  const row = document.createElement('div');row.className = 'condition-row';
  row.innerHTML = `<label>Поле<select data-condition-field><option value="">Выберите поле</option>${conditionFields().map(x => `<option value="${e(x.id)}">${e(label(x.id))} (${e(x.id)})</option>`).join('')}</select></label><label>Оператор<select data-condition-op>${Object.entries(OPS).map(([id,name]) => `<option value="${id}">${e(name)}</option>`).join('')}</select></label><label>Значение<input data-condition-value placeholder="Список через запятую" autocomplete="off"></label><button type="button" class="icon-button" aria-label="Удалить условие">×</button>`;
  row.querySelector('[data-condition-field]').value = initial.field || '';
  row.querySelector('[data-condition-op]').value = initial.op in OPS ? initial.op : '__in';
  const updateOperators=()=>{const field=row.querySelector('[data-condition-field]').value, select=row.querySelector('[data-condition-op]'), old=select.value;const numeric=state.catalog.attributes.some(x=>x.id===field);select.innerHTML=Object.entries(OPS).filter(([id])=>numeric ? /^__(lt|lte|gt|gte|eq|ne)$/.test(id) : !/^__(lt|lte|gt|gte|eq|ne)$/.test(id)).map(([id,name])=>`<option value="${id}">${e(name)}</option>`).join('');if([...select.options].some(x=>x.value===old))select.value=old;};
  row.querySelector('[data-condition-field]').addEventListener('change',updateOperators);updateOperators();
  row.querySelector('input').value = typeof initial.value === 'string' ? initial.value : '';
  row.querySelector('button').addEventListener('click',() => {row.remove();markDirty();updateConditionCount();});
  $('#conditions').append(row);updateConditionCount();
}
function updateConditionCount() { $('#conditions-count').textContent = document.querySelectorAll('.condition-row').length ? `${document.querySelectorAll('.condition-row').length} условий` : ''; }
function readConditions(validate = true) {
  return [...document.querySelectorAll('.condition-row')].map(row => {
    const field = row.querySelector('[data-condition-field]').value, op = row.querySelector('[data-condition-op]').value, value = row.querySelector('input').value.trim();
    if (validate && (!field || !value)) throw new Error('Заполните поле и значение каждого дополнительного условия или удалите пустое условие.');
    if (validate && /^__(lt|lte|gt|gte|eq|ne)$/.test(op) && number(value) === null) throw new Error(`Условие «${label(field)}» требует число с точкой в качестве разделителя.`);
    return {field,op,value};
  });
}
function parameters() {
  const start = $('#date-start').value, end = $('#date-end').value;
  if (!start || !end || start > end) throw new Error('Проверьте даты: начало периода должно быть не позднее окончания.');
  const result = {date_period:`${start}:${end}`};
  for (const [,key] of MULTI) {const values = [...$(`[data-multi="${key}"]`).options].filter(x=>x.selected).map(x => x.value);if (values.length) result[key] = values.join(',');}
  for (const [key] of SETTINGS) {const value = settingValue(key);if (value) result[key] = value;}
  for (const key of ['campaign__contains','adgroup__contains','creative__contains']) {const value = $(`[name="${key}"]`).value.trim();if (value) result[key] = value;}
  for (const {field,op,value} of readConditions()) {const key = field + op;if (key in result) throw new Error(`Условие ${key} уже задано. Объедините значения в одном условии.`);result[key] = value;}
  return result;
}
function setView(view,restore = false) {
  state.view = view in VIEWS ? view : 'overview';const config = VIEWS[state.view];
  for (const button of document.querySelectorAll('[data-view]')) {const active = button.dataset.view === state.view;button.classList.toggle('active',active);if (active) button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  $('#view-title').textContent = config.title;$('#view-description').textContent = config.description;$('#breadcrumb-view').textContent = config.name;
  $('#date-label').textContent = state.view === 'cohorts' ? 'Дата установки' : 'Активность по календарным дням';
  const desiredDimensions = restore && Array.isArray(saved.dimensions) ? saved.dimensions : config.dimensions;
  const desiredMetrics = restore && Array.isArray(saved.metrics) ? saved.metrics : config.metrics;
  state.dimensions = desiredDimensions.filter(id => state.catalog.dimensions.some(x => x.id === id));
  state.metrics = desiredMetrics.filter(id => state.catalog.attributes.some(x => x.id === id));
  state.warnings = desiredMetrics.filter(id => !state.metrics.includes(id)).length && (!SNAPSHOT_MODE || restore && Array.isArray(saved.metrics)) ? ['Недоступные в каталоге метрики исключены: ' + desiredMetrics.filter(id => !state.metrics.includes(id)).map(label).join(', ')] : [];
  updateEditorCounts();state.dirty = true;save();loadReport();
}
function updateEditorCounts() {$('#dimensions-count').textContent = state.dimensions.length;$('#metrics-count').textContent = state.metrics.length;}
async function requestJSON(url,options = {}) {
  if (SNAPSHOT_MODE) return (await import('./snapshot-client.js')).snapshotRequest(url,options);
  let response;
  try { response = await fetch(API_BASE + url,{credentials:'same-origin',cache:'no-store',...options}); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Не удалось связаться с сервером. Проверьте подключение и повторите запрос.'); }
  let body;try {body = await response.json();} catch {throw new Error(response.ok ? 'Сервер вернул ответ в неизвестном формате.' : `Сервер недоступен (HTTP ${response.status}).`);}
  if (!response.ok || body?.error) {const err = new Error(typeof body?.error === 'string' ? body.error : `Ошибка сервера (HTTP ${response.status}).`);err.details = body?.details;throw err;}
  if (!body || typeof body !== 'object') throw new Error('Сервер вернул пустой ответ.');
  return body;
}
async function loadCatalog() {
  state.error = '';setBusy(true);renderNotices();
  try {
    const raw = await requestJSON('/api/catalog');
    if (!raw.filters || typeof raw.filters !== 'object') throw new Error('Каталог фильтров недоступен: неверный ответ API.');
    state.catalog = {...raw,filters:raw.filters,defaults:{...DEFAULTS,...raw.defaults},dimensions:normalize(raw.filters.dimensions),attributes:normalize(raw.filters.attributes)};
    $('#connection').innerHTML = `${SNAPSHOT_MODE ? 'Данные Adjust' : raw.connected === true ? 'Подключено к Adjust' : 'Соединение не подтверждено'}<small>${SNAPSHOT_MODE ? 'Автоматическая выгрузка' : 'Adjust Reporting API'}</small>`;
    $('#connection-dot').classList.toggle('connected',raw.connected === true);
    if (SNAPSHOT_MODE) for(const id of ['date-start','date-end']) {
      const input=$('#'+id);input.min=raw.snapshot.range[0];input.max=raw.snapshot.range[1];
      if(input.value<input.min)input.value=input.min;if(input.value>input.max)input.value=input.max;
    }
    if (SNAPSHOT_MODE) {const full=document.querySelector('[data-preset="90"]');if(full){full.dataset.preset='available';full.textContent='Весь период';}}
    buildFilters();for (const id of ['edit-dimensions','edit-metrics','apply','refresh']) $('#'+id).disabled = false;
    setBusy(false);setView(saved.view || 'overview',true);
  } catch(error) {state.error = error.message;setBusy(false);renderNotices(true);$('#connection').innerHTML = 'Нет подключения<small>Каталог не загружен</small>';}
}
function setBusy(busy) {
  state.busy = busy;$('#report').setAttribute('aria-busy',String(busy));$('#report').classList.toggle('report-loading',busy);
  $('#refresh').disabled = busy || !state.catalog;$('#apply').disabled = busy || !state.catalog;
  $('#refresh').innerHTML = busy ? '<span aria-hidden="true">◌</span> Загрузка…' : '<span aria-hidden="true">↻</span> Обновить';
}
async function loadReport(force = false) {
  let params;
  state.controller?.abort();const requestId = ++state.request;
  try {
    params = parameters();
    state.metrics = state.metrics.filter(id => state.catalog.attributes.some(x => x.id === id));
    state.dimensions = state.dimensions.filter(id => state.catalog.dimensions.some(x => x.id === id));
    if (!state.metrics.length) throw new Error('Выберите хотя бы одну доступную метрику в редакторе «Метрики».');
  } catch(error) {state.error = error.message;setBusy(false);renderNotices();return;}
  state.error = '';state.controller = new AbortController();setBusy(true);renderNotices();
  const revision = state.revision;
  const snapshot = {view:state.view,dimensions:[...state.dimensions],metrics:[...state.metrics],parameters:{...params}};
  try {
    const report = await requestJSON('/api/dashboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({parameters:params,dimensions:snapshot.dimensions,metrics:snapshot.metrics,force}),signal:state.controller.signal});
    if (requestId !== state.request) return;
    if (!report.summary && !report.table && !report.trend) throw new Error('В ответе отсутствуют разделы отчёта.');
    state.report = report;state.snapshot = {...snapshot,parameters:{...params,...report.parameters}};
    state.dirty = state.revision !== revision;state.sort = {key:'',direction:-1};state.page = 0;
    const effective = state.snapshot.parameters;
    for (const [key] of SETTINGS) if (!state.dirty && effective[key] != null) {
      const select = $(`[name="${key}"]`),value = String(effective[key]);
      setSetting(select,value);
    }
    updateChips();renderReport();save();
  } catch(error) {if (error.name === 'AbortError') return;state.error = error.message;}
  finally {if (requestId === state.request) {setBusy(false);renderNotices();}}
}
function sectionError(section) {
  if (!section) return 'Раздел не получен от API.';
  if (section.error) return typeof section.error === 'string' ? section.error : section.error.message || 'Ошибка загрузки раздела.';
  return '';
}
function renderNotices(catalogError = false) {
  const messages = [];
  if (state.busy) messages.push('<div class="notice info" role="status">Получаем реальные данные Adjust…</div>');
  if (state.error) messages.push(`<div class="notice error" role="alert">${e(state.error)}${catalogError ? '<button class="button small" id="retry-catalog">Повторить подключение</button>' : ''}</div>`);
  if (state.report && (state.error || state.dirty || state.busy)) messages.push(`<div class="notice warning">${state.error ? 'Обновление не выполнено. Показаны предыдущие данные' : state.busy ? 'До окончания загрузки показаны предыдущие данные' : 'Настройки изменены. Показан предыдущий отчёт — примените фильтры'}: ${e(state.snapshot.parameters.date_period)} · ${e(VIEWS[state.snapshot.view].name)}. Подписи и CSV относятся к этому отчёту.</div>`);
  for (const warning of state.warnings) messages.push(`<div class="notice warning">${e(warning)}</div>`);
  for (const key of ['summary','trend','table']) {
    if (!state.report) break;
    const section = state.report[key], error = sectionError(section);
    if (error) messages.push(`<div class="notice error">${{summary:'Итоги',trend:'Динамика',table:'Таблица'}[key]}: ${e(error)}</div>`);
    for (const warning of Array.isArray(section?.warnings) ? section.warnings : []) messages.push(`<div class="notice warning">${e(typeof warning === 'string' ? warning : warning.message || JSON.stringify(warning))}</div>`);
  }
  if (state.report?.notice) messages.push(`<div class="notice info">${e(state.report.notice)}</div>`);
  if (SNAPSHOT_MODE && state.report && Date.now()-Date.parse(state.report.generated_at)>8*3600000) messages.push('<div class="notice warning">Данные не обновлялись более 8 часов. Следующее обновление выполнится, когда основной ПК будет подключён к сети.</div>');
  if (state.snapshot?.parameters.date_period?.split(':')[1] >= new Date().toISOString().slice(0,10)) messages.push('<div class="notice info">Период включает сегодня: данные текущего дня ещё неполные.</div>');
  const warnings = new Set();
  for (const key of ['summary','trend','table']) for (const warning of state.report?.[key]?.data_warnings || []) {
    const message = typeof warning === 'string' ? warning : warning.title || warning.message || warning.body || warning.slug || '';
    if (message) warnings.add(message);
  }
  for (const warning of warnings) messages.push(`<div class="notice warning">Adjust: ${e(warning)}</div>`);
  $('#notifications').innerHTML = messages.join('');
  $('#retry-catalog')?.addEventListener('click',loadCatalog);
}
function renderReport() {
  const report = state.report;
  $('#table-title').textContent = report ? VIEWS[state.snapshot.view].table : 'Детализация отчёта';
  const timestamp = report?.generated_at ? new Date(report.generated_at) : null;
  $('#report-time').textContent = timestamp && Number.isFinite(timestamp.getTime()) ? `Данные на ${timestamp.toLocaleString('ru-RU')} · ${state.snapshot.parameters.date_period}` : report ? `Отчёт за ${state.snapshot.parameters.date_period} · время обновления не указано` : 'Отчёт ещё не загружен';
  renderKPIs();renderRevenue();
  $('.trend-panel .panel-heading .muted').textContent=state.snapshot?.view==='cohorts'?'По дате установки':'По календарным дням';
  $('.revenue-panel .panel-heading .muted').textContent=state.snapshot?.view==='cohorts'?'Накопленный доход зрелой когорты D7':'По итогам выбранного периода';
  const previous = $('#trend-metric').value;
  $('#trend-metric').innerHTML = (state.snapshot?.metrics || []).map(id => `<option value="${e(id)}">${e(label(id))}</option>`).join('');
  if ([...$('#trend-metric').options].some(x => x.value === previous)) $('#trend-metric').value = previous;
  renderTrend();renderTable();
}
function renderKPIs() {
  const section = state.report?.summary;
  const totals = !sectionError(section) && section?.totals && typeof section.totals === 'object' ? section.totals : {};
  const costMetric = state.snapshot?.parameters.ad_spend_mode === 'network' ? 'network_cost' : 'cost';
  const d = derived(totals,costMetric), currency = state.snapshot?.parameters.currency || 'USD';
  const mode = state.snapshot?.parameters.iap_revenue_mode || DEFAULTS.iap_revenue_mode;
  const share = /^GROSS_(\d+)$/.exec(mode)?.[1];
  let cards = [
    ['Установки',totals.installs,'installs','За выбранный период','↓'],
    ['Расход на закупку',d.cost,costMetric,`Источник: ${OPTION_LABELS[state.snapshot?.parameters.ad_spend_mode] || 'по настройкам API'}`,'↗'],
    [`IAP ${share && share !== '100' ? 'NET' : share === '100' ? 'GROSS' : ''}`,totals.revenue,'revenue',share ? `После комиссии ${100-Number(share)}%` : mode,'◇'],
    ['Рекламная выручка',totals.ad_revenue,'ad_revenue','Без комиссии сторов','◈'],
    ['Общая выручка',d.net,'revenue','IAP + реклама · без повторной комиссии','∑',true],
    ['Выручка / расход',d.roas,'net_roas','Активность периода / расход × 100%','↗',true],
    ['После закупки',d.profit,'profit','Общая выручка − расход на закупку','±'],
    ['Сессии',totals.sessions,'sessions','За выбранный период','◷']
  ];
  if (state.snapshot?.view === 'cohorts') cards = state.snapshot.metrics.map(id => [label(id),totals[id],id,SNAPSHOT_MODE ? 'Зрелые когорты · по данным Adjust' : 'Итог когорты из Adjust','◷']);
  $('#kpis').innerHTML = cards.map(([name,value,key,description,symbol,accent]) => `<article class="kpi ${accent ? 'accent' : ''}"><p class="kpi-label">${e(name)}<span class="kpi-symbol" aria-hidden="true">${symbol}</span></p><p class="kpi-value">${e(format(value,key,true))}</p><p class="kpi-sub">${number(value) === null ? 'Нет данных для расчёта' : e(description)}</p></article>`).join('');
  $('#kpis').setAttribute('aria-label',`Итоговые показатели, валюта ${currency}`);
}
function renderRevenue() {
  const summary = state.report?.summary, target = $('#revenue-chart');
  if (sectionError(summary)) {target.innerHTML = empty('Итоговая выручка недоступна','Нужны итоги IAP и рекламной выручки.');return;}
  const cohort=state.snapshot?.view==='cohorts';
  const {iap,ads,net} = derived(cohort ? {revenue:summary.totals?.revenue_total_in_cohort_d7,ad_revenue:summary.totals?.ad_revenue_total_in_cohort_d7} : summary.totals);
  if (iap === null || ads === null) {target.innerHTML = empty('Недостаточно данных','Для диаграммы нужны доходы от покупок и рекламы.');return;}
  const canChart = iap >= 0 && ads >= 0 && net > 0;
  const circumference = 2 * Math.PI * 61;
  const mode = state.snapshot.parameters.iap_revenue_mode;
  target.innerHTML = `<div class="revenue-body">${canChart ? `<svg class="donut" viewBox="0 0 150 150" role="img" aria-label="Доли выручки: IAP ${(iap/net*100).toFixed(1)}%, реклама ${(ads/net*100).toFixed(1)}%"><circle class="donut-track" cx="75" cy="75" r="61" fill="none" stroke-width="18"/><circle cx="75" cy="75" r="61" fill="none" stroke="#48bca4" stroke-width="18"/><circle cx="75" cy="75" r="61" fill="none" stroke="var(--accent)" stroke-width="18" stroke-dasharray="${iap/net*circumference} ${circumference}"/><text x="75" y="71" text-anchor="middle" transform="rotate(90 75 75)" fill="var(--ink)" style="font-size:17px;font-weight:650">100%</text><text x="75" y="89" text-anchor="middle" transform="rotate(90 75 75)" fill="var(--muted)" style="font-size:9px">вся выручка</text></svg>` : `<div class="empty-state" style="min-height:130px;padding:10px"><strong>${net === 0 ? 'Выручка равна нулю' : 'Есть отрицательные значения'}</strong><span>Доли не рассчитываются</span></div>`}<div class="revenue-lines"><div class="revenue-line"><span class="swatch"></span><span>IAP ${mode === 'GROSS_100' ? 'GROSS' : /^GROSS_/.test(mode) ? 'NET' : e(mode || '')}</span><strong>${e(format(iap,'revenue'))}</strong></div><div class="revenue-line"><span class="swatch ads"></span><span>Реклама</span><strong>${e(format(ads,'ad_revenue'))}</strong></div><p class="muted">${canChart ? `IAP ${(iap/net*100).toLocaleString('ru-RU',{maximumFractionDigits:1})}% · реклама ${(ads/net*100).toLocaleString('ru-RU',{maximumFractionDigits:1})}%` : 'Точные значения показаны без диаграммы.'}</p></div><div class="revenue-total"><span>Общая выручка</span><strong>${e(format(net,'revenue'))}</strong></div></div>`;
}
function renderTrend() {
  const trend = state.report?.trend,target = $('#trend-chart'),metric = $('#trend-metric').value;
  if (sectionError(trend)) {target.innerHTML = empty('Динамика недоступна',state.report ? 'Не удалось получить этот раздел отчёта.' : 'Выберите фильтры и загрузите отчёт.');return;}
  const rows = Array.isArray(trend.rows) ? trend.rows.filter(row => row && /^\d{4}-\d{2}-\d{2}$/.test(String(row.day))).sort((a,b) => a.day.localeCompare(b.day)) : [];
  const points = rows.map(row => number(row[metric]));
  if (!metric || !rows.length || points.every(x => x === null)) {target.innerHTML = empty('Нет значений для графика','Выберите другую метрику или измените период.');return;}
  const values = points.filter(x => x !== null),lo = Math.min(0,...values),maximum = Math.max(...values,0),hi = maximum === lo ? lo+1 : maximum,span = hi-lo;
  const W=720,H=245,L=72,R=22,T=18,B=39,plotW=W-L-R,plotH=H-T-B;
  const startTime = Date.parse(rows[0].day),endTime = Date.parse(rows.at(-1).day),daySpan=endTime-startTime;
  const x = i => daySpan ? L+(Date.parse(rows[i].day)-startTime)/daySpan*plotW : L+plotW/2;
  const y = v => T+(hi-v)/span*plotH;
  let segments = [], segment=[];
  points.forEach((value,i) => {
    if (value === null || (i>0 && Date.parse(rows[i].day)-Date.parse(rows[i-1].day)>86400000)) {if (segment.length) segments.push(segment);segment=[];}
    if (value !== null) segment.push([x(i),y(value)]);
  });if (segment.length) segments.push(segment);
  const path = segments.map(segment => segment.map(([a,b],i) => `${i?'L':'M'}${a.toFixed(2)},${b.toFixed(2)}`).join(' ')).join(' ');
  const area = segments.filter(s => s.length>1).map(segment => `M${segment[0][0]},${y(0)} ${segment.map(([a,b]) => `L${a},${b}`).join(' ')} L${segment.at(-1)[0]},${y(0)} Z`).join(' ');
  const tickIndexes = [...new Set([0,Math.floor((rows.length-1)/3),Math.floor((rows.length-1)*2/3),rows.length-1])];
  const grid = Array.from({length:4},(_,i) => {const value = lo+span*i/3,cy=y(value);return `<line class="chart-gridline" x1="${L}" x2="${W-R}" y1="${cy}" y2="${cy}"/><text x="${L-10}" y="${cy+4}" text-anchor="end">${e(format(value,metric,true))}</text>`;}).join('');
  target.innerHTML = `<div class="chart-legend"><span><span class="legend-dot"></span>${e(label(metric))}</span><span>Пропуски не заменяются нулями</span></div><svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="trend-title trend-description"><title id="trend-title">${e(label(metric))}: динамика по дням</title><desc id="trend-description">${e(rows[0].day)} — ${e(rows.at(-1).day)}. Отсутствующие значения отображаются разрывами. Значения доступны при наведении на точки.</desc><defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".17"/><stop offset="100%" stop-color="var(--accent)" stop-opacity=".01"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#trend-fill)"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>${points.map((value,i) => value === null ? '' : `<circle cx="${x(i)}" cy="${y(value)}" r="${points.length>40 ? 2 : 3.5}" fill="var(--accent)"><title>${e(rows[i].day)}: ${e(format(value,metric))}</title></circle>`).join('')}${tickIndexes.map(i => `<text x="${x(i)}" y="${H-12}" text-anchor="${i === 0 ? 'start' : i === rows.length-1 ? 'end' : 'middle'}">${e(rows[i].day.slice(8))}.${e(rows[i].day.slice(5,7))}</text>`).join('')}</svg>`;
}
function tableColumns() {return state.snapshot ? [...state.snapshot.dimensions,...state.snapshot.metrics].filter((x,i,a) => a.indexOf(x) === i) : [];}
function tableRows() {
  const table = state.report?.table;
  if (sectionError(table) || !Array.isArray(table.rows)) return [];
  const query = $('#table-search').value.trim().toLocaleLowerCase('ru');
  let rows = table.rows.filter(row => row && typeof row === 'object' && !Array.isArray(row));
  if (query) rows = rows.filter(row => tableColumns().some(id => String(row[id] ?? '').toLocaleLowerCase('ru').includes(query)));
  return state.sort.key ? sortRows(rows,state.sort.key,state.sort.direction,state.snapshot.metrics.includes(state.sort.key)) : rows;
}
function cell(value,id) {
  if (state.snapshot.metrics.includes(id)) return format(value,id);
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
function renderTable() {
  const target = $('#table-container'),table = state.report?.table,rows = tableRows(),columns = tableColumns();
  const error = sectionError(table);
  const pages = Math.ceil(rows.length/25);state.page = Math.min(state.page,Math.max(0,pages-1));
  $('#row-count').textContent = `${rows.length.toLocaleString('ru-RU')} строк${$('#table-search').value ? ' по вашему поиску' : ''}`;
  $('#export').disabled = !rows.length;
  $('#page-prev').disabled = state.page <= 0;$('#page-next').disabled = state.page >= pages-1;
  $('#page-label').textContent = `${pages ? state.page+1 : 0} / ${pages}`;
  $('#table-note').textContent = table?.pagination ? 'Показаны полученные от API строки; сервер сообщает о пагинации.' : '25 строк на страницу · итоги из Adjust';
  if (error) {target.innerHTML = empty(state.report ? 'Таблица недоступна' : 'Здесь появятся данные отчёта',state.report ? 'Не удалось получить строки от API.' : 'Выберите приложения, период и нажмите «Применить фильтры».');return;}
  if (!rows.length) {target.innerHTML = empty($('#table-search').value ? 'Ничего не найдено' : 'За этот период нет данных',$('#table-search').value ? 'Попробуйте другой запрос.' : 'Измените фильтры или выберите другой период.');return;}
  const totals = table.totals && typeof table.totals === 'object' ? table.totals : null;
  target.innerHTML = `<table><caption class="sr-only">${e(VIEWS[state.snapshot.view].table)} · ${e(state.snapshot.parameters.date_period)}</caption><thead><tr>${columns.map(id => `<th scope="col" ${state.sort.key === id ? `aria-sort="${state.sort.direction === 1 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-sort="${e(id)}" aria-label="Сортировать: ${e(label(id))}">${e(label(id))}<span aria-hidden="true">${state.sort.key === id ? state.sort.direction === 1 ? '↑' : '↓' : '↕'}</span></button></th>`).join('')}</tr></thead><tbody>${rows.slice(state.page*25,state.page*25+25).map(row => `<tr>${columns.map(id => `<td title="${e(cell(row[id],id))}">${e(cell(row[id],id))}</td>`).join('')}</tr>`).join('')}</tbody>${totals && Object.keys(totals).length ? `<tfoot><tr>${columns.map((id,i) => `<td>${i===0 && state.snapshot.dimensions.includes(id) ? 'Итого по отчёту' : state.snapshot.metrics.includes(id) ? e(cell(totals[id],id)) : '—'}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
}
function openEditor(kind) {
  state.editorKind = kind;state.editorSelection = [...state[kind]];
  $('#editor-title').textContent = kind === 'metrics' ? 'Метрики отчёта' : 'Измерения отчёта';
  $('#editor-search').value = '';renderEditor();$('#editor-dialog').showModal();
}
function renderEditor() {
  const items = state.editorKind === 'metrics' ? state.catalog.attributes : state.catalog.dimensions;
  const query = $('#editor-search').value.trim().toLocaleLowerCase('ru');
  const shown = items.filter(x => `${label(x.id)} ${x.name} ${x.id} ${x.description || ''}`.toLocaleLowerCase('ru').includes(query));
  let section;
  $('#editor-list').innerHTML = shown.length ? shown.map(item => {
    let heading = '';if (item.section && item.section !== section) {section = item.section;heading = `<p class="editor-section">${e(section)}</p>`;}
    return `${heading}<label class="editor-option"><input type="checkbox" value="${e(item.id)}" ${state.editorSelection.includes(item.id) ? 'checked' : ''}><span><strong>${e(label(item.id))}</strong><small>${e(item.id)}${item.name !== label(item.id) ? ` · ${e(item.name)}` : ''}</small>${item.description ? `<small>${e(item.description)}</small>` : ''}</span></label>`;
  }).join('') : empty('Поля не найдены','Попробуйте другой поисковый запрос.');
  $('#editor-selected').textContent = `Выбрано: ${state.editorSelection.length}`;
}
$('#editor-list').addEventListener('change',event => {
  const {value,checked} = event.target;
  state.editorSelection = checked ? [...new Set([...state.editorSelection,value])] : state.editorSelection.filter(id => id !== value);
  $('#editor-selected').textContent = `Выбрано: ${state.editorSelection.length}`;
});
$('#editor-search').addEventListener('input',renderEditor);
$('#editor-dialog form').addEventListener('submit',event => {
  if (!event.submitter) {event.preventDefault();return;}
  if (event.submitter.value !== 'save') return;
  const limit=state.editorKind==='metrics'?80:8;
  if (!state.editorSelection.length || state.editorSelection.length>limit) {event.preventDefault();$('#editor-selected').textContent = `Выберите от 1 до ${limit} полей`;return;}
  state[state.editorKind] = [...state.editorSelection];state.warnings = [];updateEditorCounts();save();loadReport();
});
$('#edit-dimensions').addEventListener('click',() => openEditor('dimensions'));
$('#edit-metrics').addEventListener('click',() => openEditor('metrics'));
$('#trend-metric').addEventListener('change',renderTrend);
$('#table-search').addEventListener('input',() => {state.page=0;renderTable();});
$('#table-container').addEventListener('click',event => {
  const button = event.target.closest('[data-sort]');if (!button) return;
  const key = button.dataset.sort;state.sort = {key,direction:state.sort.key === key ? -state.sort.direction : state.snapshot.metrics.includes(key) ? -1 : 1};state.page = 0;renderTable();
});
$('#page-prev').addEventListener('click',() => {state.page--;renderTable();});
$('#page-next').addEventListener('click',() => {state.page++;renderTable();});
$('#export').addEventListener('click',() => {
  const rows = tableRows();if (!rows.length) return;
  const text = toCSV(tableColumns(),rows,label),blob = new Blob([text],{type:'text/csv;charset=utf-8;'}),url = URL.createObjectURL(blob);
  const a = document.createElement('a');a.href=url;a.download=`adjust-${state.snapshot.view}-${state.snapshot.parameters.date_period.replace(':','_')}.csv`;a.click();setTimeout(() => URL.revokeObjectURL(url),1000);
});
$('#navigation').addEventListener('click',event => {const button = event.target.closest('[data-view]');if (button && state.catalog) setView(button.dataset.view);});
$('#refresh').addEventListener('click',() => loadReport(true));
$('#filters-form').addEventListener('submit',event => {event.preventDefault();save();loadReport();});
$('#filters-form').addEventListener('change',event => {if (!event.target.matches('[data-multi]')) markDirty();if (event.target.type === 'date') for (const b of document.querySelectorAll('[data-preset]')) b.classList.remove('selected');});
$('#filters-form').addEventListener('input',event => {if (event.target.matches('.text-filters input,[data-condition-value]')) markDirty();});
$('#add-condition').addEventListener('click',() => {addCondition();markDirty();});
for (const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click',() => {
  const [start,end] = button.dataset.preset==='available' ? state.catalog.snapshot.range : presetDates(button.dataset.preset);$('#date-start').value=start;$('#date-end').value=end;
  for (const other of document.querySelectorAll('[data-preset]')) other.classList.toggle('selected',other === button);markDirty();
});
$('#reset').addEventListener('click',() => {
  const [start,end] = presetDates('30');$('#date-start').value=start;$('#date-end').value=end;
  for (const select of document.querySelectorAll('[data-multi]')) for (const option of select.options) option.selected=false;
  for (const [key] of SETTINGS) {const select = $(`[name="${key}"]`),value = String(state.catalog.defaults[key] ?? '');setSetting(select,value);}
  for (const input of document.querySelectorAll('.text-filters input')) input.value='';
  $('#conditions').replaceChildren();updateConditionCount();selectionLabels();
  for (const button of document.querySelectorAll('[data-preset]')) button.classList.toggle('selected',button.dataset.preset==='30');markDirty();
});
document.addEventListener('click',event => {for (const details of document.querySelectorAll('.multi-filter[open]')) if (!details.contains(event.target)) details.open=false;});
document.addEventListener('keydown',event => {if (event.key === 'Escape') for (const details of document.querySelectorAll('.multi-filter[open]')) details.open=false;});
for (const button of document.querySelectorAll('[data-preset]')) {
  const range = presetDates(button.dataset.preset);
  button.classList.toggle('selected',range[0] === dates[0] && range[1] === dates[1]);
}
renderReport();loadCatalog();
