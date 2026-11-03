# Комментарии к сайтам на sites.aimulticast.org. Сайт отправляет в очередь ntfy.sh комментарии и отметки «исправлено»,
# этот скрипт (запускает .github/workflows/comments.yml на master раз в час) переносит новые в <сайт>.json рядом.
# Очередь хранит сообщения 12 часов. Удалить комментарий: убрать его запись из "comments", "ingested" не трогать.
import json, re, time, urllib.request
from pathlib import Path

SITES = {'butcher-landscape': 'bh-landscape-cm-nwk23eg5'}  # сайт → очередь ntfy
KEEP = 2 * 86400  # id сообщений очереди помним двое суток: перенесённые и удалённые не возвращаются
CID = re.compile(r'[0-9a-f-]{36}')


def clean(s, n):
    return re.sub(r'[\x00-\x08\x0b-\x1f\x7f]', '', s)[:n].strip() if isinstance(s, str) else ''


for site, topic in SITES.items():
    path = Path(__file__).with_name(site + '.json')
    data = json.loads(path.read_text('utf-8')) if path.exists() else {}
    comments, states, seen = data.get('comments', []), data.get('states', {}), data.get('ingested', {})
    try:
        req = urllib.request.Request(f'https://ntfy.sh/{topic}/json?poll=1&since=all', headers={'User-Agent': 'site-comments'})
        lines = urllib.request.urlopen(req, timeout=60).read().decode('utf-8').splitlines()
    except OSError as e:
        print(f'::warning::{site}: очередь недоступна: {e}')
        continue
    added = marked = 0
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
        if c.get('kind') == 'state':  # отметка «исправлено» или снятие отметки: последняя по времени
            target, done = c.get('target'), c.get('done')
            if isinstance(target, str) and CID.fullmatch(target) and isinstance(done, bool) and states.get(target, {}).get('t', 0) <= m['time']:
                states[target] = {'done': done, 'name': clean(c.get('name'), 40), 't': m['time'], 'nid': m['id']}
                marked += 1
            continue
        cid, wid, p, text = c.get('cid'), c.get('id'), c.get('p'), clean(c.get('text'), 1000)
        if not (isinstance(cid, str) and CID.fullmatch(cid) and isinstance(wid, str) and re.fullmatch(r'[0-9a-f]{8}', wid)
                and p in ('ios', 'android', 'orig') and text):
            continue
        v = c.get('v') if isinstance(c.get('v'), str) and re.fullmatch(r'[0-9a-f]{0,12}', c.get('v')) else ''
        comments.append({'cid': cid, 'nid': m['id'], 'id': wid, 'p': p, 'v': v, 'name': clean(c.get('name'), 40), 'text': text, 't': m['time']})
        added += 1
    old = int(time.time()) - KEEP
    seen = {k: t for k, t in seen.items() if t > old}
    comments.sort(key=lambda c: c['t'])
    path.write_text(json.dumps({'comments': comments, 'states': states, 'ingested': seen}, ensure_ascii=False, indent=1) + '\n', 'utf-8')
    print(f'{site}: новых {added}, отметок {marked}, всего {len(comments)}')
