# Комментарии к сайтам на sites.aimulticast.org. Сайт отправляет комментарий в очередь ntfy.sh, этот скрипт
# (запускает .github/workflows/comments.yml на master раз в 10 минут) переносит новые в <сайт>.json рядом.
# Очередь хранит сообщения 12 часов. Удалить комментарий: убрать его запись из "comments", "ingested" не трогать.
import json, re, time, urllib.request
from pathlib import Path

SITES = {'butcher-landscape': 'bh-landscape-cm-nwk23eg5'}  # сайт → очередь ntfy
KEEP = 2 * 86400  # id сообщений очереди помним двое суток: перенесённые и удалённые не возвращаются


def clean(s, n):
    return re.sub(r'[\x00-\x08\x0b-\x1f\x7f]', '', s)[:n].strip() if isinstance(s, str) else ''


for site, topic in SITES.items():
    path = Path(__file__).with_name(site + '.json')
    data = json.loads(path.read_text('utf-8')) if path.exists() else {}
    comments, seen = data.get('comments', []), data.get('ingested', {})
    try:
        req = urllib.request.Request(f'https://ntfy.sh/{topic}/json?poll=1&since=all', headers={'User-Agent': 'site-comments'})
        lines = urllib.request.urlopen(req, timeout=60).read().decode('utf-8').splitlines()
    except OSError as e:
        print(f'::warning::{site}: очередь недоступна: {e}')
        continue
    added = 0
    for m in map(json.loads, lines):
        if m.get('event') != 'message' or m['id'] in seen:
            continue
        seen[m['id']] = m['time']
        try:
            c = json.loads(m.get('message', ''))
        except ValueError:
            continue
        if not isinstance(c, dict) or c.get('site') != site:
            continue
        cid, wid, p, text = c.get('cid'), c.get('id'), c.get('p'), clean(c.get('text'), 1000)
        if not (isinstance(cid, str) and re.fullmatch(r'[0-9a-f-]{36}', cid) and isinstance(wid, str)
                and re.fullmatch(r'w\d{3}', wid) and p in ('ios', 'android', 'orig') and text):
            continue
        comments.append({'cid': cid, 'nid': m['id'], 'id': wid, 'p': p, 'name': clean(c.get('name'), 40), 'text': text, 't': m['time']})
        added += 1
    old = int(time.time()) - KEEP
    seen = {k: t for k, t in seen.items() if t > old}
    comments.sort(key=lambda c: c['t'])
    path.write_text(json.dumps({'comments': comments, 'ingested': seen}, ensure_ascii=False, indent=1) + '\n', 'utf-8')
    print(f'{site}: новых {added}, всего {len(comments)}')
