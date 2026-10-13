export const DAY = 86400000;
export const RETENTION_DAYS = [1, 3, 7, 14, 30];
export const PLAYTIME_DAYS = [0, 1, 7];
export const dateUTC = value => new Date(value).toISOString().slice(0, 10);
export const shiftDay = (day, amount) => dateUTC(Date.parse(day + 'T00:00:00Z') + amount * DAY);
export const validDay = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day + 'T00:00:00Z')) && dateUTC(day + 'T00:00:00Z') === day;
export function daysBetween(start, end) {
  if (!validDay(start) || !validDay(end) || start > end) return [];
  const length = Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1;
  if (length > 3660) return [];
  return Array.from({ length }, (_, i) => shiftDay(start, i));
}
export function previousRange(start, end) {
  const count = daysBetween(start, end).length;
  return { start: shiftDay(start, -count), end: shiftDay(start, -1) };
}
export const numeric = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['ru'], {type:'region'}) : null;
export function countryName(row) {
  const code = String(row.country_code || '').toUpperCase();
  return /^[A-Z]{2}$/.test(code) && regionNames ? regionNames.of(code) : row.country || row.country_code || 'Не указана';
}
const paidNetwork = row => typeof row.network === 'string' && row.network.trim() && !/^(organic|unknown(?: devices)?|unattributed)$/i.test(row.network.trim());
export function available(data, source, metric) {
  return Array.isArray(data.availability?.[source]) && data.availability[source].includes(metric);
}
export function filterRows(rows, filters) {
  return (Array.isArray(rows) ? rows : []).filter(row => row && validDay(row.day) && row.day >= filters.start && row.day <= filters.end &&
    (!filters.os || row.os_name === filters.os) && (!filters.network || row.network === filters.network) &&
    (!filters.country || (row.country_code || row.country) === filters.country));
}
export function sumMetric(data, source, rows, metric) {
  if (!available(data, source, metric) || !rows.length) return null;
  const values = rows.map(row => {
    if (metric === 'revenue_total' && numeric(row[metric]) === null && available(data, source, 'revenue') && available(data, source, 'ad_revenue')) {
      const iap = numeric(row.revenue), ads = numeric(row.ad_revenue);
      return iap !== null && ads !== null ? iap + ads : null;
    }
    return numeric(row[metric]);
  });
  return values.some(value => value === null) ? null : values.reduce((total, value) => total + value, 0);
}
export const ratio = (a, b) => numeric(a) !== null && numeric(b) !== null && b > 0 ? a / b : null;
export function rewardedCount(data, filters) {
  const id = data.engagement?.rewarded_event_id;
  return typeof id === 'string' ? sumMetric(data, 'events', filterRows(data.event_rows, filters), id) : null;
}
function cohortValues(data, rows) {
  const parsed = Date.parse(data.generated_at);
  const completed = Number.isFinite(parsed) ? shiftDay(dateUTC(parsed), -1) : null;
  return Object.fromEntries(PLAYTIME_DAYS.flatMap(day => {
    // Adjust считает D0 первым 24-часовым окном; ждём его конца даже для поздней установки.
    const mature = completed ? rows.filter(row => shiftDay(row.day, day + 1) <= completed) : [];
    const sum = prefix => sumMetric(data, 'cohorts', mature, prefix + '_d' + day);
    const users = sum('cohort_size');
    return [
      ['cohort_users_d' + day, users],
      ['playtime_d' + day, ratio(sum('time_spent'), users)],
      ['ads_per_user_d' + day, ratio(sum('ad_impressions_total_in_cohort'), users)],
      ['ltv_d' + day, ratio(sum('all_revenue_total_in_cohort'), users)],
      ['ltv_ad_d' + day, ratio(sum('ad_revenue_total_in_cohort'), users)],
      ['ltv_iap_d' + day, ratio(sum('revenue_total_in_cohort'), users)],
    ];
  }));
}
export const cohortKpis = (data, filters) => cohortValues(data, filterRows(data.cohorts, filters));
export function kpis(data, filters) {
  const source = filters.network || filters.country ? 'acquisition' : 'daily';
  const rows = filterRows(data[source], filters);
  const sum = id => sumMetric(data, source, rows, id);
  const revenue = sum('revenue_total'), cost = sum('cost');
  const acquisition = filterRows(data.acquisition, filters);
  const paid = acquisition.filter(paidNetwork);
  const count = daysBetween(filters.start, filters.end).length;
  const covered = validDay(data.range?.start) && validDay(data.range?.end) && filters.start >= data.range.start && filters.end <= data.range.end;
  return {
    installs: sum('installs'), revenue_total: revenue, cost,
    daus: source === 'daily' && covered ? ratio(sum('daus'), count) : null,
    cpi: ratio(sumMetric(data, 'acquisition', paid, 'cost'), sumMetric(data, 'acquisition', paid, 'installs')),
    income_cost: ratio(revenue, cost), sessions: sum('sessions'),
    revenue: sum('revenue'), ad_revenue: sum('ad_revenue'), revenue_events: sum('revenue_events'),
    ad_impressions: sum('ad_impressions'),
    ads_per_dau: source === 'daily' && covered ? ratio(sum('ad_impressions'), sum('daus')) : null,
    rewarded_count: rewardedCount(data, filters), ...cohortKpis(data, filters),
  };
}
export function comparison(data, filters) {
  const previous = previousRange(filters.start, filters.end);
  if (!validDay(data.range?.start) || !validDay(data.range?.end) || previous.start < data.range.start || filters.end > data.range.end) return null;
  return kpis(data, { ...filters, ...previous });
}
export function timeline(data, filters, metric) {
  if (['cpi','ads_per_dau'].includes(metric)) return daysBetween(filters.start,filters.end).map(day=>({day,value:kpis(data,{...filters,start:day,end:day})[metric]}));
  if (metric === 'rewarded_count') {
    const id = data.engagement?.rewarded_event_id;
    const rows = filterRows(data.event_rows, filters);
    if (!id || !available(data, 'events', id) || !rows.length) return [];
    return daysBetween(filters.start, filters.end).map(day => {
      const dayRows = rows.filter(row => row.day === day);
      const covered = day >= data.range?.start && day <= data.range?.end;
      return {day, value: dayRows.length ? sumMetric(data, 'events', dayRows, id) : covered ? 0 : null};
    });
  }
  const source = filters.network || filters.country ? 'acquisition' : 'daily';
  const rows = filterRows(data[source], filters);
  if (source !== 'daily' && metric === 'daus') return [];
  if (!available(data, source, metric) || !rows.length) return [];
  return daysBetween(filters.start, filters.end).map(day => {
    const dayRows = rows.filter(row => row.day === day);
    const covered = validDay(data.range?.start) && validDay(data.range?.end) && day >= data.range.start && day <= data.range.end;
    return { day, value: dayRows.length ? sumMetric(data, source, dayRows, metric) : covered ? 0 : null };
  });
}
export function groupAcquisition(data, filters, dimension) {
  const groups = new Map();
  for (const row of filterRows(data.acquisition, filters)) {
    const name = dimension === 'country' ? countryName(row) : row[dimension] || 'Не указан';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  const cohorts = filterRows(data.cohorts, filters);
  return [...groups].map(([name, rows]) => {
    const values = Object.fromEntries(['installs', 'sessions', 'revenue', 'ad_revenue', 'revenue_total', 'revenue_events', 'ad_impressions', 'cost', 'clicks', 'impressions'].map(id => [id, sumMetric(data, 'acquisition', rows, id)]));
    const paid = rows.filter(paidNetwork);
    const cohortRows = cohorts.filter(row => (dimension === 'country' ? countryName(row) : row[dimension] || 'Не указан') === name);
    return { name, ...values, ...cohortValues(data, cohortRows), cpi: ratio(sumMetric(data, 'acquisition', paid, 'cost'), sumMetric(data, 'acquisition', paid, 'installs')), income_cost: ratio(values.revenue_total, values.cost) };
  });
}
export function cohortTable(data, filters) {
  const groups = new Map();
  for (const row of filterRows(data.cohorts, filters)) {
    if (!groups.has(row.day)) groups.set(row.day, []);
    groups.get(row.day).push(row);
  }
  const timestamp = Date.parse(data.generated_at);
  const completedDay = Number.isFinite(timestamp) ? shiftDay(dateUTC(timestamp), -1) : null;
  return [...groups].map(([day, rows]) => {
    const result = { day, installs: sumMetric(data, 'cohorts', rows, 'installs') };
    for (const n of RETENTION_DAYS) {
      const mature = completedDay && shiftDay(day, n + 1) <= completedDay;
      result['d' + n] = mature ? ratio(sumMetric(data, 'cohorts', rows, 'retained_users_d' + n), sumMetric(data, 'cohorts', rows, 'cohort_size_d' + n)) : null;
      result['mature' + n] = Boolean(mature);
      result['revenue_total_d' + n] = mature ? sumMetric(data, 'cohorts', rows, 'revenue_total_d' + n) : null;
    }
    result.revenue_total_d0 = completedDay && shiftDay(day, 1) <= completedDay ? sumMetric(data, 'cohorts', rows, 'revenue_total_d0') : null;
    Object.assign(result, cohortValues(data, rows));
    return result;
  });
}
export function eventTable(data, filters) {
  const rows = filterRows(data.event_rows, filters);
  return (Array.isArray(data.events) ? data.events : []).filter(event => event && typeof event.id === 'string').map(event => ({
    id: event.id, name: event.label || event.id, count: sumMetric(data, 'events', rows, event.id),
  }));
}
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export const makeCSV = (columns, rows) => '\uFEFF' + [columns.map(column => csvCell(column.label)).join(','), ...rows.map(row => columns.map(column => csvCell(row[column.key])).join(','))].join('\r\n');
export function normalizeData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.schema_version !== 1) throw new Error('Неподдерживаемый формат снимка: ожидается schema_version: 1.');
  const data = { ...input };
  for (const key of ['metrics', 'daily', 'acquisition', 'cohorts', 'events', 'event_rows', 'warnings']) data[key] = Array.isArray(input[key]) ? input[key].filter(row => row && typeof row === 'object') : [];
  return data;
}

// Самопроверка чистых функций; не запускается в браузере и не создаёт данные отчёта.
export function selfCheck() {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  check(!validDay('2026-02-30') && validDay('2024-02-29'), 'Проверка календарных дат');
  check(daysBetween('2026-09-30', '2026-10-02').length === 3, 'Включительные границы периода');
  const previous = previousRange('2026-10-01', '2026-10-07');
  check(previous.start === '2026-09-24' && previous.end === '2026-09-30', 'Предыдущий равный период');
  check(ratio(0, 3) === 0 && ratio(3, 0) === null && ratio(undefined, 3) === null, 'Ноль и неизвестные значения');
  check(sumMetric({ availability: { daily: ['installs'] } }, 'daily', [], 'installs') === null, 'Пустые данные не равны нулю');
  check(csvCell(' =1+1') === '"\' =1+1"' && csvCell('a"b') === '"a""b"', 'Защита и кавычки CSV');
  check(makeCSV([{ key: 'v', label: 'Значение' }], [{ v: null }]).endsWith('\r\n""'), 'Неизвестное значение в CSV');
  return 'Самопроверка логики пройдена';
}
