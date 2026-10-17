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
    # Недавние даты обновляются каждый час, история — каждый день.
    ttl = 3500 if (dt.date.today() - end).days < 14 else 23 * 3600
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
                monetary = metric in {'network_cost', 'cost', 'revenue', 'ad_revenue', 'revenue_total_in_cohort_d7', 'ad_revenue_total_in_cohort_d7'}
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
    columns = DIMENSIONS + ACTIVITY + [metric for metric in COHORT if metric != 'roas_d7'] + ['_roas_cost_d7']
    roas_valid, roas_checked = True, False
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
                ratio = numeric(record.get('roas_d7'))
                cohort_iap, cohort_ads = numeric(record.get('revenue_total_in_cohort_d7')), numeric(record.get('ad_revenue_total_in_cohort_d7'))
                if ratio and cohort_iap is not None and cohort_ads is not None:
                    record['_roas_cost_d7'] = (cohort_iap + cohort_ads) / ratio
                elif record['day'] <= str(end - dt.timedelta(days=7)):
                    record['_roas_cost_d7'] = numeric(record.get('network_cost'))
                else:
                    record['_roas_cost_d7'] = None
                row = []
                for dimension in DIMENSIONS:
                    value = str(record.get(dimension) or '')
                    if value not in lookups[dimension]:
                        lookups[dimension][value] = len(dictionaries[dimension])
                        dictionaries[dimension].append(value)
                    row.append(lookups[dimension][value])
                row.extend(numeric(record.get(metric)) for metric in columns[len(DIMENSIONS):])
                rows.append(row)
            native = reports[1].get('totals', {})
            expected_roas = numeric(native.get('roas_d7'))
            numerator = sum((numeric(record.get('revenue_total_in_cohort_d7')) or 0) + (numeric(record.get('ad_revenue_total_in_cohort_d7')) or 0) for record in merged.values())
            denominator = sum(numeric(record.get('_roas_cost_d7')) or 0 for record in merged.values())
            if denominator > 0:
                roas_checked = True
                if expected_roas is None or not math.isclose(numerator / denominator, expected_roas, rel_tol=.0001, abs_tol=.00001):
                    roas_valid = False
            elif numerator != 0 or expected_roas not in (None, 0):
                roas_valid = False
            raw = json.dumps(rows, separators=(',', ':'), allow_nan=False).encode()
            filename = f'data/{first}_{cursor}_{hashlib.sha256(raw).hexdigest()[:12]}.json'
            write_json(OUTPUT / filename, rows)
            all_shards.append({'file': filename, 'range': [str(first), str(cursor)], 'rows': len(rows), 'bytes': len(raw)})
            row_count += len(rows)
            print(json.dumps({'stage': 'saved', 'rows': len(rows), 'bytes': len(raw)}), flush=True)
            cursor = first - dt.timedelta(days=1)
    ratios = dict(RATIOS)
    if roas_valid and roas_checked:
        ratios['roas_d7'] = [['revenue_total_in_cohort_d7', 'ad_revenue_total_in_cohort_d7'], '_roas_cost_d7']
    fields = set(columns) - set(DIMENSIONS) - {'_roas_cost_d7'}
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
    daily = server.report(dict(server.DEFAULTS, date_period=f'{start}:{end}', format_dates='false'), ['day'], ACTIVITY + COHORT)
    daily_rows = []
    for record in daily['rows']:
        ratio = numeric(record.get('roas_d7'))
        cohort_iap, cohort_ads = numeric(record.get('revenue_total_in_cohort_d7')), numeric(record.get('ad_revenue_total_in_cohort_d7'))
        record['_roas_cost_d7'] = (cohort_iap + cohort_ads) / ratio if ratio and cohort_iap is not None and cohort_ads is not None else numeric(record.get('network_cost')) if record['day'] <= str(end - dt.timedelta(days=7)) else None
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
    write_json(OUTPUT / 'snapshot.json', data)
    # Удаляем только собственные устаревшие части после успешной сборки новой версии.
    active = {Path(shard['file']).name for shard in all_shards}
    for path in (OUTPUT / 'data').glob('*.json'):
        if path.name not in active:
            path.unlink()
    result = {'ok': True, 'days': days, 'rows': row_count, 'shards': len(all_shards), 'dimensions': len(filters['dimensions']),
              'metrics': len(filters['attributes']), 'bytes': sum(shard['bytes'] for shard in all_shards), 'generated_at': data['generated_at'], 'roas_validated': roas_valid and roas_checked}
    (PRIVATE / 'publication' / 'export_check.json').write_text(json.dumps(result), encoding='utf-8')
    print(json.dumps(result), flush=True)
    return result


if __name__ == '__main__':
    import argparse
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=49)
    args = parser.parse_args()
    export(args.days)
