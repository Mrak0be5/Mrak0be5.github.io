export const DEFAULTS = {iap_revenue_mode:'GROSS_70',ad_revenue_sources:'applovin_max_sdk',currency:'USD',utc_offset:'+00:00',ad_spend_mode:'network',attribution_source:'dynamic',reattributed:'all',cohort_maturity:'mature',sandbox:'false'};
export const BASE_METRICS = ['installs','sessions','daus','network_cost','revenue','ad_revenue','ad_impressions','revenue_events'];
export const COHORT_METRICS = ['cohort_size_d1','cohort_size_d7','retention_rate_d1','retention_rate_d7','roas_d7','revenue_total_in_cohort_d7','ad_revenue_total_in_cohort_d7'];
export const LABELS = {installs:'Установки',sessions:'Сессии',daus:'DAU',clicks:'Клики',impressions:'Показы',network_cost:'Расход по сетям',cost:'Расход выбранного источника',revenue:'Выручка IAP',ad_revenue:'Рекламная выручка',ad_impressions:'Показы рекламы',revenue_events:'Покупки',network:'Сеть',campaign:'Кампания',adgroup:'Группа объявлений',creative:'Креатив',app_token:'Приложение',os_name:'ОС',country_code:'Страна',day:'День',retention_rate_d1:'Удержание D1',retention_rate_d7:'Удержание D7',roas_d7:'ROAS D7',cohort_size_d1:'Размер когорты D1',cohort_size_d7:'Размер когорты D7',retained_users_d1:'Вернулись D1',retained_users_d7:'Вернулись D7',revenue_total_in_cohort_d7:'IAP когорты D7',ad_revenue_total_in_cohort_d7:'Реклама когорты D7'};
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function number(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function derived(totals = {}, costMetric = 'network_cost') {
  totals = totals && typeof totals === 'object' ? totals : {};
  const iap = number(totals.revenue), ads = number(totals.ad_revenue), cost = number(totals[costMetric]);
  const net = iap !== null && ads !== null ? iap + ads : null;
  return {iap,ads,cost,net,roas:net !== null && cost !== null && cost > 0 ? net / cost * 100 : null,profit:net !== null && cost !== null ? net - cost : null};
}
export function csvCell(value) {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Табличные редакторы игнорируют начальные пробелы и управляющие символы перед формулой.
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function toCSV(columns, rows, label = x => x) {
  return '\uFEFF' + [columns.map(c => csvCell(label(c))).join(';'), ...rows.map(row => columns.map(c => csvCell(row[c])).join(';'))].join('\r\n');
}
export function normalize(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => typeof item === 'object' && item !== null ? {...item,id:String(item.id ?? item.value ?? item.token ?? item.app_token ?? ''),name:String(item.name ?? item.label ?? item.id ?? item.value ?? item.token ?? item.app_token ?? '')} : {id:String(item),name:String(item)}).filter(item => item.id);
}
export function dateISO(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function presetDates(preset, now = new Date()) {
  const end = new Date(now.getFullYear(),now.getMonth(),now.getDate()), start = new Date(end);
  if (preset === 'previous') { start.setDate(1);start.setMonth(start.getMonth()-1);end.setDate(0); }
  else if (preset === 'month') start.setDate(1);
  else start.setDate(start.getDate() - Number(preset) + 1);
  return [dateISO(start),dateISO(end)];
}
export function sortRows(rows, key, direction, numeric = false) {
  return [...rows].sort((a,b) => {
    const av = numeric ? number(a[key]) : a[key], bv = numeric ? number(b[key]) : b[key];
    if (av == null) return bv == null ? 0 : 1;
    if (bv == null) return -1;
    return (numeric ? av-bv : String(av).localeCompare(String(bv),'ru',{numeric:true})) * direction;
  });
}
