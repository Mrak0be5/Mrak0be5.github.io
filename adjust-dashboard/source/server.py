"""Приватный живой дашборд Adjust. Работает на основном ПК без внешних зависимостей."""
import argparse
import ctypes
import datetime as dt
import json
import math
import mimetypes
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRIVATE = Path(os.environ.get('LOCALAPPDATA', str(ROOT))) / 'AdjustDashboard'
BASE = 'https://automate.adjust.com/reports-service/'
PORT = 18764
DEFAULTS = dict(iap_revenue_mode='GROSS_70', ad_revenue_sources='applovin_max_sdk',
                currency='USD', utc_offset='+00:00', ad_spend_mode='network',
                attribution_source='dynamic', reattributed='all', cohort_maturity='mature', sandbox='false')
FILTERS = ('apps', 'os_names', 'countries', 'networks', 'currencies', 'dimensions', 'attributes',
           'ad_revenue_sources', 'iap_revenue_mode', 'utc_offset', 'attribution_types',
           'attribution_source', 'attribution_status', 'cohort_maturity', 'ad_spend_mode',
           'store_type', 'platform', 'partners', 'channels', 'subscription_revenue_mode',
           'sdk_signature_version', 'skad_time_adjustment', 'period_over_period', 'full_cohort_periods')
DIM_OPS = {'in', 'not_in', 'contains', 'exclude', 'starts_with', 'not_starts_with', 'ends_with', 'not_ends_with'}
METRIC_OPS = {'lt', 'lte', 'gt', 'gte', 'eq', 'ne'}
cache, cache_lock = {}, threading.Lock()
upstream_gate = threading.Semaphore(2)
pace_lock = threading.Lock()
last_request = 0.0
TOKEN = ''
request_context = threading.local()


class APIError(Exception):
    def __init__(self, message, status=400, details=None):
        super().__init__(message)
        self.status, self.details = status, details


class Blob(ctypes.Structure):
    _fields_ = [('size', ctypes.c_uint32), ('data', ctypes.POINTER(ctypes.c_ubyte))]


def crypt(data, protect=False):
    buf = ctypes.create_string_buffer(data)
    inp, out = Blob(len(data), ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte))), Blob()
    if protect:
        ok = ctypes.windll.crypt32.CryptProtectData(ctypes.byref(inp), 'Adjust Dashboard', None, None, None, 1, ctypes.byref(out))
    else:
        ok = ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(inp), None, None, None, None, 1, ctypes.byref(out))
    if not ok:
        raise RuntimeError('Не удалось прочитать или сохранить ключ через Windows DPAPI.')
    try:
        return ctypes.string_at(out.data, out.size)
    finally:
        ctypes.windll.kernel32.LocalFree(out.data)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def api(endpoint, params, force=False, ttl=60):
    global last_request
    cache_key = endpoint + '?' + urllib.parse.urlencode(sorted(params.items()))
    with cache_lock:
        item = cache.get(cache_key)
        if item and not force and time.monotonic() - item[0] < ttl:
            return item[1]
    with upstream_gate:
        for attempt in range(3):
            with pace_lock:
                time.sleep(max(0, .35 - (time.monotonic() - last_request)))
                last_request = time.monotonic()
            request = urllib.request.Request(BASE + cache_key, headers={'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/json'})
            try:
                remaining = getattr(request_context, 'deadline', float('inf')) - time.monotonic()
                if remaining < 1:
                    raise APIError('Отчёт не успел загрузиться. Сократите период или число полей и повторите.', 504)
                with urllib.request.urlopen(request, timeout=min(65, remaining)) as response:
                    raw = response.read(32 * 1024 * 1024 + 1)
                    if len(raw) > 32 * 1024 * 1024:
                        raise APIError('Слишком большой отчёт. Сократите период или добавьте фильтры.', 413)
                    data = json.loads(raw) if raw else {'rows': [], 'totals': {}, 'warnings': []}
                break
            except urllib.error.HTTPError as error:
                if error.code in (429, 503, 504) and attempt < 2:
                    time.sleep(2 ** (attempt + 1))
                    continue
                try:
                    details = json.loads(error.read(16000))
                except (ValueError, OSError):
                    details = None
                messages = {401: 'Ключ Adjust не принят.', 403: 'У ключа нет доступа к этим данным.',
                            429: 'Лимит запросов Adjust. Подождите и повторите.', 400: 'Adjust не поддерживает выбранное сочетание параметров.'}
                raise APIError(messages.get(error.code, 'Adjust временно недоступен.'), error.code, details) from None
            except (urllib.error.URLError, TimeoutError):
                raise APIError('Не удалось соединиться с Adjust. Проверьте интернет и повторите.', 502) from None
            except ValueError:
                raise APIError('Adjust вернул ответ в неизвестном формате.', 502) from None
        if endpoint == 'events' and isinstance(data, list):
            data = {'events': data}
        if not isinstance(data, dict):
            raise APIError('Неожиданный формат ответа Adjust.', 502)
        with cache_lock:
            if len(cache) >= 60:
                cache.pop(min(cache, key=lambda key: cache[key][0]))
            cache[cache_key] = (time.monotonic(), data)
        return data


def catalog(force=False):
    filters = dict(api('filters_data', {'required_filters': ','.join(FILTERS)}, force, 3600))
    # attributes в Adjust — ставки и статусы объявлений; метрики берём из официального справочника.
    filters['advertising_attributes'] = filters.get('attributes', [])
    filters['attributes'] = json.loads((ROOT / 'metrics-catalog.json').read_text(encoding='utf-8'))['metrics']
    try:
        events = api('events', {'tokens_mapping': 'true'}, force, 3600).get('events', [])
        known = ids(filters['attributes'])
        filters['events'] = [{'id': event['id'], 'name': event.get('name', event['id'])} for event in events]
        for event in events:
            slug = event.get('id', '') + '_events'
            if slug not in known and re.fullmatch(r'[A-Za-z0-9_]+', slug):
                filters['attributes'].append({'id': slug, 'name': event.get('name', event['id']) + ' · События',
                                              'section': 'События приложений', 'formatting': 'integer'})
    except APIError:
        filters['events'] = []
    return {'filters': filters, 'defaults': DEFAULTS, 'generated_at': now(), 'connected': True}


def ids(items):
    return {str(item['id']) for item in items if isinstance(item, dict) and 'id' in item}


def validate(body, cat):
    if not isinstance(body, dict):
        raise APIError('Ожидается JSON объект.')
    raw = body.get('parameters', {})
    if not isinstance(raw, dict) or len(raw) > 100:
        raise APIError('Некорректные фильтры.')
    dimensions, metrics = body.get('dimensions', ['network']), body.get('metrics', ['installs', 'network_cost', 'revenue', 'ad_revenue'])
    for values, limit, name in ((dimensions, 8, 'группировок'), (metrics, 80, 'показателей')):
        if not isinstance(values, list) or not values or len(values) > limit or any(not isinstance(v, str) for v in values):
            raise APIError(f'Выберите от 1 до {limit} {name}.')
        if len(set(values)) != len(values):
            raise APIError('Повторяющиеся поля отчёта.')
    dim_ids = ids(cat.get('dimensions', []))
    metric_ids = ids(cat.get('attributes', []))
    # Событийные показатели могут отсутствовать в основном каталоге, но приходят через events.
    for value in dimensions:
        if value not in dim_ids:
            raise APIError('Неизвестная группировка: ' + value)
    for value in metrics:
        if value not in metric_ids:
            raise APIError('Недоступный показатель: ' + value)
    params = dict(DEFAULTS)
    extra_options = {'subscription_revenue_mode', 'skad_time_adjustment', 'period_over_period', 'attribution_status', 'skad_cohort_maturity'}
    for key, value in raw.items():
        if not isinstance(value, (str, bool, int, float)) or len(str(value)) > 6000:
            raise APIError('Некорректное значение фильтра: ' + str(key))
        value = str(value).lower() if isinstance(value, bool) else str(value)
        if not value:
            continue
        if key in DEFAULTS or key in extra_options or key in {'date_period', 'os_names', 'attribution_types'}:
            params[key] = value
        elif '__' in key:
            field, op = key.rsplit('__', 1)
            if (field in dim_ids and op in DIM_OPS) or (field in metric_ids and op in METRIC_OPS):
                if field in metric_ids and (not re.fullmatch(r'-?\d+(?:\.\d+)?', value) or not math.isfinite(float(value))):
                    raise APIError('Числовому фильтру нужно конечное число.')
                params[key] = value
            else:
                raise APIError('Неизвестный фильтр: ' + key)
        else:
            raise APIError('Неизвестный параметр: ' + key)
    try:
        start, end = (dt.date.fromisoformat(part) for part in params['date_period'].split(':'))
        if end < start or (end - start).days > 3660:
            raise ValueError()
    except (KeyError, ValueError):
        raise APIError('Выберите правильный период, не больше 10 лет.') from None
    allowed = {'iap_revenue_mode': ids(cat.get('iap_revenue_mode', [])) or {'GROSS_100', 'GROSS_85', 'GROSS_70', 'GROSS_60'},
               'sandbox': {'true', 'false'}, 'reattributed': {'all', 'true', 'false'},
               'attribution_source': {'first', 'dynamic'}, 'cohort_maturity': {'mature', 'immature'},
               'ad_spend_mode': {'network', 'adjust', 'mixed'}}
    for key, values in allowed.items():
        if params.get(key) not in values:
            raise APIError('Некорректный параметр: ' + key)
    if not re.fullmatch(r'[A-Z]{3}', params['currency']):
        raise APIError('Неверный код валюты.')
    offset = re.fullmatch(r'([+-])(\d{2}):(\d{2})', params['utc_offset'])
    if not offset or int(offset[2]) > 14 or int(offset[3]) not in {0, 15, 30, 45} or (int(offset[2]) == 14 and int(offset[3]) != 0):
        raise APIError('Неверный часовой пояс.')
    params.update(format_dates='false')
    return params, dimensions, metrics


def report(params, dimensions, metrics, force=False):
    result = api('report', dict(params, dimensions=','.join(dimensions), metrics=','.join(metrics)), force)
    if not isinstance(result.get('rows'), list):
        raise APIError('Adjust вернул отчёт без строк.', 502)
    if result.get('pagination'):
        # Не выдаём первую страницу за полную выборку.
        raise APIError('Слишком много строк отчёта. Сократите период, число группировок или добавьте фильтр.', 413)
    return result


def dashboard(body):
    cat = catalog()['filters']
    params, dimensions, metrics = validate(body, cat)
    force = body.get('force') is True
    # Условия на агрегатах применяются Adjust независимо в каждом разрезе.
    # Для summary/trend убираем их: иначе разные пороги выдадут несопоставимые итоги.
    base_params = {k: v for k, v in params.items() if not ('__' in k and k.rsplit('__', 1)[0] in ids(cat.get('attributes', [])))}
    table = report(params, dimensions, metrics, force)
    output = {'table': table, 'parameters': params, 'generated_at': now(), 'summary_scope': 'dimension_filters'}
    known = ids(cat.get('attributes', []))
    base_metrics = list(dict.fromkeys([*metrics, *[m for m in ('installs', 'sessions', 'daus', 'network_cost', 'cost', 'revenue', 'ad_revenue', 'ad_impressions', 'revenue_events') if m in known]]))
    cohort_days = [0, 1, 2, 3, 7, 14, 30]
    cohort_metrics = [f'{kind}_d{day}' for day in cohort_days for kind in ('roas_iap', 'roas_ad')]
    available_cohorts = [day for day in cohort_days if f'roas_iap_d{day}' in known and f'roas_ad_d{day}' in known]
    base_metrics = list(dict.fromkeys(base_metrics + [metric for metric in cohort_metrics if metric in known] +
                                    [f'mature_based_virtual_metric_cost_d{day}' for day in available_cohorts]))
    if not base_metrics:
        base_metrics = [metrics[0]]
    for name, dims in (('summary', ['app_token']), ('trend', ['day'])):
        try:
            output[name] = report(base_params, dims, base_metrics, force)
            for row in [*output[name]['rows'], output[name].get('totals', {})]:
                for day in available_cohorts:
                    values = [row.get(f'{kind}_d{day}') for kind in ('roas_iap', 'roas_ad')]
                    if all(value is not None and str(value).strip() for value in values):
                        row[f'roas_d{day}'] = sum(float(value) for value in values) if float(row.get(f'mature_based_virtual_metric_cost_d{day}') or 0) > 0 else None
        except APIError as error:
            output[name] = {'error': str(error), 'status': error.status, 'rows': [], 'totals': {}}
    if params != base_params:
        output['notice'] = 'Числовые условия применены к таблице. Карточки и график показывают весь выбранный сегмент до числового порога.'
    return output


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send(self, status, data, content_type='application/json; charset=utf-8'):
        payload = json.dumps(data, ensure_ascii=False).encode() if isinstance(data, dict) else data
        self.send_response(status)
        for key, value in {'Content-Type': content_type, 'Content-Length': str(len(payload)),
                           'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
                           'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
                           'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}.items():
            self.send_header(key, value)
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def trusted(self):
        host = self.headers.get('Host', '')
        if host not in {f'127.0.0.1:{PORT}', f'localhost:{PORT}'}:
            raise APIError('Недопустимый адрес сервера.', 403)
        origin = self.headers.get('Origin')
        if origin and origin != 'http://' + host:
            raise APIError('Запрос разрешён только из локального дашборда.', 403)
        if self.headers.get('Sec-Fetch-Site') in {'cross-site', 'same-site'}:
            raise APIError('Запрос с другого сайта запрещён.', 403)

    def dispatch(self, post=False):
        try:
            self.trusted()
            parsed = urllib.parse.urlsplit(self.path)
            if post:
                if parsed.path != '/api/dashboard':
                    raise APIError('Страница не найдена.', 404)
                if self.headers.get_content_type() != 'application/json':
                    raise APIError('Требуется application/json.', 415)
                try:
                    length = int(self.headers.get('Content-Length', '0'))
                    if not 0 < length <= 65536:
                        raise ValueError()
                    body = json.loads(self.rfile.read(length))
                except (ValueError, UnicodeError):
                    raise APIError('Неверный JSON или слишком большой запрос.', 400) from None
                self.send(200, dashboard(body))
            elif parsed.path == '/api/health':
                self.send(200, {'ok': True, 'service': 'adjust-dashboard', 'defaults': DEFAULTS})
            elif parsed.path == '/api/catalog':
                self.send(200, catalog())
            elif parsed.path == '/api/events':
                apps = urllib.parse.parse_qs(parsed.query).get('apps', [''])[0]
                if len(apps) > 6000 or (apps and not re.fullmatch(r'[A-Za-z0-9,]+', apps)):
                    raise APIError('Неверный список приложений.')
                self.send(200, api('events', {'app_token__in': apps} if apps else {}, ttl=3600))
            else:
                rel = urllib.parse.unquote(parsed.path).lstrip('/') or 'index.html'
                path = (ROOT / 'web' / rel).resolve()
                if not path.is_relative_to((ROOT / 'web').resolve()) or not path.is_file():
                    raise APIError('Страница не найдена.', 404)
                self.send(200, path.read_bytes(), mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
        except APIError as error:
            details = error.details
            if details is not None:
                details = json.loads(json.dumps(details).replace(TOKEN, '[скрыто]')) if TOKEN else details
            self.send(error.status if 400 <= error.status < 600 else 502,
                      {'error': str(error), 'status': error.status, 'details': details})
        except Exception:
            self.send(500, {'error': 'Внутренняя ошибка. Повторите запрос или перезапустите дашборд.', 'status': 500})

    def do_GET(self):
        self.dispatch()

    def do_POST(self):
        self.dispatch(True)


def main():
    global TOKEN
    parser = argparse.ArgumentParser()
    parser.add_argument('--install-key', action='store_true')
    parser.add_argument('--probe', action='store_true')
    args = parser.parse_args()
    PRIVATE.mkdir(parents=True, exist_ok=True)
    if args.install_key:
        key = sys.stdin.read().strip()
        if not re.fullmatch(r'[A-Za-z0-9_\-]{20,256}', key):
            raise RuntimeError('Некорректный ключ.')
        target = PRIVATE / 'adjust.dpapi'
        temporary = PRIVATE / 'adjust.dpapi.tmp'
        temporary.write_bytes(crypt(key.encode(), True))
        assert crypt(temporary.read_bytes()).decode() == key
        temporary.replace(target)
        print(json.dumps({'key_saved': True, 'encrypted': True, 'path': str(target)}))
        return
    TOKEN = crypt((PRIVATE / 'adjust.dpapi').read_bytes()).decode().strip()
    if args.probe:
        data = catalog()
        (PRIVATE / 'catalog.json').write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        print(json.dumps({'connected': True, 'counts': {k: len(v) if isinstance(v, list) else type(v).__name__ for k, v in data['filters'].items()},
                          'apps': [{'id': app['id'], 'name': app['name']} for app in data['filters'].get('apps', [])],
                          'catalog_path': str(PRIVATE / 'catalog.json')}, ensure_ascii=False))
        return
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    server.daemon_threads = True
    print('Adjust Dashboard: http://127.0.0.1:' + str(PORT), flush=True)
    server.serve_forever()


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    main()
