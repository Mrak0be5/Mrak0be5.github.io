"""Выгружает настоящие данные Adjust для автономного сайта. Ключ остаётся на ПК."""
import datetime as dt
import hashlib
import json
import math
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import server

PRIVATE = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'AdjustDashboard'
OUTPUT = PRIVATE / 'publication' / 'site'
DIMENSIONS = ['day', 'app_token', 'os_name', 'country_code', 'network', 'campaign', 'adgroup', 'creative']
ACTIVITY = ['installs', 'sessions', 'network_cost', 'cost', 'revenue', 'ad_revenue', 'ad_impressions', 'revenue_events', 'clicks', 'impressions']
COHORT = ['cohort_size_d1', 'cohort_size_d7', 'retained_users_d1', 'retained_users_d7', 'revenue_total_in_cohort_d7', 'ad_revenue_total_in_cohort_d7', 'roas_d7']
RATIOS = {'retention_rate_d1': ['retained_users_d1', 'cohort_size_d1'], 'retention_rate_d7': ['retained_users_d7', 'cohort_size_d7']}
IAP = ['revenue', 'revenue_total_in_cohort_d7']
ROAS_DAYS = [0, 1, 2, 3, 7, 14, 30]


def roas_fields(day):
    return [f'revenue_total_d{day}', f'ad_revenue_total_d{day}', f'mature_based_virtual_metric_cost_d{day}']


def fill_cohort_zeros(record):
    # В разреженных строках расходов Adjust возвращает null для выручки; нативный агрегат при расходе > 0 считает её нулевой.
    for day in ROAS_DAYS:
        iap, ads, cost = roas_fields(day)
        if (numeric(record.get(cost)) or 0) > 0:
            for field in (iap, ads):
                if record.get(field) is None:
                    record[field] = 0
    return record


def daily_report(params, metrics):
    for attempt in range(3):
        try:
            return server.report(params, ['day'], metrics, force=True)
        except server.APIError as error:
            if error.status not in {429, 502, 503, 504} or attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))


def add_cohort_roas(data):
    """Сохраняет аддитивные числители и нативные расходы зрелых когорт для всех фильтров."""
    extra = [field for day in ROAS_DAYS for field in roas_fields(day)]
    old_columns = list(data['columns'])
    columns = old_columns + [field for field in extra if field not in old_columns]
    dictionaries = data['dictionaries']
    lookups = {key: {value: i for i, value in enumerate(values)} for key, values in dictionaries.items()}

    def key(row):
        return tuple(dictionaries[field][row[old_columns.index(field)]] for field in DIMENSIONS)

    def encode(record):
        fill_cohort_zeros(record)
        result = []
        for field in DIMENSIONS:
            value = str(record.get(field) or '')
            if value not in lookups[field]:
                lookups[field][value] = len(dictionaries[field])
                dictionaries[field].append(value)
            result.append(lookups[field][value])
        result.extend(numeric(record.get(field)) for field in columns[len(DIMENSIONS):])
        return result

    shards, projects, periods = [], {}, {}
    for shard in data['shards']:
        periods.setdefault(tuple(shard['range']), []).append(shard)
    for period, parts in periods.items():
        shard = {'range': list(period)}
        first, last = [dt.date.fromisoformat(value) for value in shard['range']]
        print(json.dumps({'stage': 'cohort_roas', 'period': shard['range']}), flush=True)
        original = [row for part in parts for row in json.loads((OUTPUT / part['file']).read_text(encoding='utf-8'))]
        records = {key(row): dict(zip(old_columns, row)) for row in original}
        # Значения измерений в прежних строках закодированы; API возвращает строки.
        for values, record in records.items():
            record.update(zip(DIMENSIONS, values))
            project = projects.setdefault(record['app_token'], {'revenue': 0, 'cost': 0})
            project['revenue'] += (numeric(record.get('revenue')) or 0) + (numeric(record.get('ad_revenue')) or 0)
            project['cost'] += numeric(record.get('network_cost')) or 0
            for field in extra:
                record[field] = 0
        batches = [[field for day in ROAS_DAYS[i:i + 2] for field in roas_fields(day)] for i in range(0, len(ROAS_DAYS), 2)]
        with ThreadPoolExecutor(max_workers=2) as pool:
            reports = list(pool.map(lambda metrics: collect(first, last, metrics), batches))
        for report in reports:
            for row in report['rows']:
                values = tuple(str(row.get(field) or '') for field in DIMENSIONS)
                if values not in records:
                    records[values] = dict(zip(DIMENSIONS, values), **{field: 0 for field in extra})
                records[values].update(row)
        # Без явного network_cost Adjust не подмешивает строки Ad Spend в виртуальные расходы по когортам.
        costs = [roas_fields(day)[2] for day in ROAS_DAYS]
        expense_report = collect(first, last, ['network_cost'] + costs)
        for record in records.values():
            record.update(dict.fromkeys(costs, 0))
        for row in expense_report['rows']:
            values = tuple(str(row.get(field) or '') for field in DIMENSIONS)
            if values not in records:
                records[values] = dict(zip(DIMENSIONS, values), **{field: 0 for field in extra})
            records[values].update({field: row.get(field) for field in costs})
        rows = [encode(record) for record in records.values()]
        raw = json.dumps(rows, separators=(',', ':'), allow_nan=False).encode()
        filename = f'data/{first}_{last}_{hashlib.sha256(raw).hexdigest()[:12]}.json'
        write_json(OUTPUT / filename, rows)
        shards.append({'file': filename, 'range': shard['range'], 'rows': len(rows), 'bytes': len(raw)})

    params = dict(server.DEFAULTS, date_period=':'.join(data['range']), format_dates='false')
    metrics = extra + [f'{kind}_d{day}' for day in ROAS_DAYS for kind in ('roas_iap', 'roas_ad')]
    native = daily_report(params, metrics)
    # Сверяем формулу с нативным ROAS; исходные коэффициенты API округлены до 4 знаков.
    for row in native['rows']:
        for day in ROAS_DAYS:
            iap, ads, cost = [numeric(row.get(field)) for field in roas_fields(day)]
            expected = [numeric(row.get(f'{kind}_d{day}')) for kind in ('roas_iap', 'roas_ad')]
            if cost and all(value is not None for value in [iap, ads] + expected):
                assert math.isclose((iap + ads) / cost, sum(expected), rel_tol=.0002, abs_tol=.00011), f'ROAS D{day} не совпал с Adjust.'
    by_day = {row['day']: row for row in native['rows']}
    daily = []
    for row in data.get('native_daily_rows', []):
        record = dict(zip(old_columns, row))
        record.update(zip(DIMENSIONS, key(row)))
        record.update({field: by_day.get(record['day'], {}).get(field) for field in extra})
        daily.append(encode(record))
    data.update(columns=columns, shards=shards, native_daily_rows=daily,
                additive=list(dict.fromkeys(data['additive'] + extra)),
                iap_metrics=list(dict.fromkeys(data['iap_metrics'] + [roas_fields(day)[0] for day in ROAS_DAYS])))
    for day in ROAS_DAYS:
        iap, ads, cost = roas_fields(day)
        data['ratios'][f'roas_d{day}'] = [[iap, ads], cost]
    fields = {f'roas_d{day}' for day in ROAS_DAYS}
    attributes = data['catalog']['filters']['attributes']
    known = {item['id'] for item in attributes}
    attributes.extend({'id': field, 'name': f'Когортный ROAS {field.split("_")[-1].upper()}', 'section': 'Когортный ROAS'} for field in sorted(fields - known))
    data['summary_metrics'] = list(dict.fromkeys(data['summary_metrics'] + list(fields)))
    data['catalog']['snapshot']['roas_days'] = ROAS_DAYS
    candidates = {key: value for key, value in projects.items() if value['revenue'] > 0 and value['cost'] > 0}
    if candidates:
        data['catalog']['snapshot']['default_project'] = max(candidates, key=lambda key: candidates[key]['cost'])
    data['cohort_roas_generated_at'] = server.now()
    return data


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode()
    if server.TOKEN and server.TOKEN.encode() in raw:
        raise RuntimeError('Секрет обнаружен в файле выгрузки. Публикация остановлена.')
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_bytes(raw)
    temp.replace(path)
    return raw


def numeric(value):
    try:
        return float(value) if value is not None and str(value).strip() and math.isfinite(float(value)) else None
    except (ValueError, TypeError):
        return None


def cache_path(start, end, metrics):
    name = hashlib.sha256(json.dumps([str(start), str(end), metrics]).encode()).hexdigest()[:20] + '.json'
    return PRIVATE / 'publication' / 'cache' / name


def combine(parts, metrics):
    totals = {}
    for metric in metrics:
        values = [numeric(part.get('totals', {}).get(metric)) for part in parts]
        totals[metric] = sum(values) if metric != 'roas_d7' and all(value is not None for value in values) else None
    return {'rows': [row for part in parts for row in part['rows']], 'totals': totals,
            'data_warnings': [warning for part in parts for warning in part.get('data_warnings', [])]}


def cached_report(start, end, metrics):
    cache = cache_path(start, end, metrics)
    age = time.time() - cache.stat().st_mtime if cache.exists() else float('inf')
    # Когорты D30 продолжают созревать весь месяц; их обновляем каждый час.
    recent_days = 32 if any('mature_based_virtual_metric_cost' in metric for metric in metrics) else 14
    ttl = 3500 if (dt.date.today() - end).days < recent_days else 23 * 3600
    if age < ttl:
        return json.loads(cache.read_text(encoding='utf-8'))
    if start < end:
        midpoint = start + (end - start) // 2
        left = cached_report(start, midpoint, metrics)
        if left is not None:
            right = cached_report(midpoint + dt.timedelta(days=1), end, metrics)
            if right is not None:
                result = combine([left, right], metrics)
                write_json(cache, result)
                return result
    return None


def collect(start, end, metrics):
    cache = cache_path(start, end, metrics)
    saved = cached_report(start, end, metrics)
    if saved is not None:
        return saved
    params = dict(server.DEFAULTS, date_period=f'{start}:{end}', format_dates='false')
    for attempt in range(3):
        try:
            result = server.report(params, DIMENSIONS, metrics, force=True)
            # Для денежных и счётных метрик проверяем сохранение нативного итога.
            for metric in metrics:
                if metric == 'roas_d7':
                    continue
                expected = numeric(result.get('totals', {}).get(metric))
                values = [numeric(row.get(metric)) for row in result['rows']]
                actual = sum(value for value in values if value is not None)
                # Денежные строки API округлены до 4 знаков; учитываем верхнюю границу погрешности суммы.
                monetary = ('revenue' in metric and metric != 'revenue_events') or 'cost' in metric
                tolerance = max(.0001, sum(value is not None for value in values) * .000051) if monetary else .000001
                if expected is not None and not math.isclose(actual, expected, rel_tol=1e-9, abs_tol=tolerance):
                    raise RuntimeError(f'Итоги {metric} не совпали с суммой детальных строк. Выгрузка не опубликована.')
            write_json(cache, result)
            return result
        except server.APIError as error:
            if error.status in {413, 502, 504} and start < end:
                midpoint = start + (end - start) // 2
                parts = [collect(start, midpoint, metrics), collect(midpoint + dt.timedelta(days=1), end, metrics)]
                result = combine(parts, metrics)
                write_json(cache, result)
                return result
            if error.status not in {429, 502, 503, 504} or attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))


def export(days=49):
    if not server.TOKEN:
        server.TOKEN = server.crypt((PRIVATE / 'adjust.dpapi').read_bytes()).decode().strip()
    cat = server.catalog()
    end = dt.datetime.now(dt.timezone.utc).date()
    start = end - dt.timedelta(days=days - 1)
    columns = DIMENSIONS + ACTIVITY + [metric for metric in COHORT if metric != 'roas_d7']
    dictionaries = {dimension: [] for dimension in DIMENSIONS}
    lookups = {dimension: {} for dimension in DIMENSIONS}
    all_shards, warnings, row_count = [], [], 0
    cursor = end
    with ThreadPoolExecutor(max_workers=2) as pool:
        while cursor >= start:
            first = max(start, cursor - dt.timedelta(days=6))
            print(json.dumps({'stage': 'collect', 'period': f'{first}:{cursor}'}), flush=True)
            futures = [pool.submit(collect, first, cursor, metrics) for metrics in (ACTIVITY, COHORT)]
            reports = [future.result() for future in futures]
            merged = {}
            for report in reports:
                for warning in report.get('data_warnings', []):
                    if warning not in warnings:
                        warnings.append(warning)
                for row in report['rows']:
                    key = tuple(str(row.get(dimension) or '') for dimension in DIMENSIONS)
                    if key not in merged:
                        merged[key] = dict(zip(DIMENSIONS, key))
                    merged[key].update(row)
            rows = []
            for record in merged.values():
                row = []
                for dimension in DIMENSIONS:
                    value = str(record.get(dimension) or '')
                    if value not in lookups[dimension]:
                        lookups[dimension][value] = len(dictionaries[dimension])
                        dictionaries[dimension].append(value)
                    row.append(lookups[dimension][value])
                row.extend(numeric(record.get(metric)) for metric in columns[len(DIMENSIONS):])
                rows.append(row)
            raw = json.dumps(rows, separators=(',', ':'), allow_nan=False).encode()
            filename = f'data/{first}_{cursor}_{hashlib.sha256(raw).hexdigest()[:12]}.json'
            write_json(OUTPUT / filename, rows)
            all_shards.append({'file': filename, 'range': [str(first), str(cursor)], 'rows': len(rows), 'bytes': len(raw)})
            row_count += len(rows)
            print(json.dumps({'stage': 'saved', 'rows': len(rows), 'bytes': len(raw)}), flush=True)
            cursor = first - dt.timedelta(days=1)
    ratios = dict(RATIOS)
    fields = set(columns) - set(DIMENSIONS)
    fields.update(ratios)
    filters = cat['filters']
    filters['dimensions'] = [item for item in filters['dimensions'] if item['id'] in DIMENSIONS]
    filters['attributes'] = [item for item in filters['attributes'] if item['id'] in fields]
    filters.pop('events', None)
    settings = {key: [value] for key, value in server.DEFAULTS.items()}
    settings['iap_revenue_mode'] = ['GROSS_100', 'GROSS_85', 'GROSS_70', 'GROSS_60']
    cat.update(snapshot={'range': [str(start), str(end)], 'settings': settings}, connected=True)
    data = {'version': 1, 'generated_at': server.now(), 'range': [str(start), str(end)], 'catalog': cat,
            'columns': columns, 'dictionaries': dictionaries, 'shards': all_shards,
            'additive': columns[len(DIMENSIONS):], 'ratios': ratios, 'iap_metrics': IAP,
            'summary_metrics': ACTIVITY + [metric for metric in COHORT if metric != 'roas_d7'], 'warnings': warnings}
    print(json.dumps({'stage': 'native_daily_totals'}), flush=True)
    daily = daily_report(dict(server.DEFAULTS, date_period=f'{start}:{end}', format_dates='false'), ACTIVITY + COHORT)
    daily_rows = []
    for record in daily['rows']:
        row = []
        for dimension in DIMENSIONS:
            value = str(record.get(dimension) or '')
            if value not in lookups[dimension]:
                lookups[dimension][value] = len(dictionaries[dimension])
                dictionaries[dimension].append(value)
            row.append(lookups[dimension][value])
        row.extend(numeric(record.get(metric)) for metric in columns[len(DIMENSIONS):])
        daily_rows.append(row)
    data['native_daily_rows'] = daily_rows
    add_cohort_roas(data)
    write_json(OUTPUT / 'snapshot.json', data)
    # Удаляем только собственные устаревшие части после успешной сборки новой версии.
    active = {Path(shard['file']).name for shard in data['shards']}
    for path in (OUTPUT / 'data').glob('*.json'):
        if path.name not in active:
            path.unlink()
    result = {'ok': True, 'days': days, 'rows': sum(shard['rows'] for shard in data['shards']), 'shards': len(data['shards']), 'dimensions': len(filters['dimensions']),
              'metrics': len(filters['attributes']), 'bytes': sum(shard['bytes'] for shard in data['shards']), 'generated_at': data['generated_at'], 'roas_validated': True}
    (PRIVATE / 'publication' / 'export_check.json').write_text(json.dumps(result), encoding='utf-8')
    print(json.dumps(result), flush=True)
    return result


if __name__ == '__main__':
    import argparse
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=49)
    parser.add_argument('--cohorts-only', action='store_true')
    args = parser.parse_args()
    if args.cohorts_only:
        server.TOKEN = server.crypt((PRIVATE / 'adjust.dpapi').read_bytes()).decode().strip()
        data = json.loads((OUTPUT / 'snapshot.json').read_text(encoding='utf-8'))
        add_cohort_roas(data)
        write_json(OUTPUT / 'snapshot.json', data)
        active = {Path(shard['file']).name for shard in data['shards']}
        for path in (OUTPUT / 'data').glob('*.json'):
            if path.name not in active:
                path.unlink()
        print(json.dumps({'ok': True, 'cohort_roas': ROAS_DAYS, 'rows': sum(shard['rows'] for shard in data['shards'])}), flush=True)
    else:
        export(args.days)
