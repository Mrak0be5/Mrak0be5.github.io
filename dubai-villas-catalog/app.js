(() => {
  'use strict';

  const STORAGE_KEY = 'dubai-villas.notes.v1';
  const SHARED_STORAGE_KEY = 'dubai-villas.shared.v1';
  const TOGGLES_STORAGE_KEY = 'dubai-villas.toggles.v1';
  const CLIENT_STORAGE_KEY = 'dubai-villas.client.v1';
  const AUTHOR_STORAGE_KEY = 'dubai-villas.author.v1';
  // Общее состояние: снимок всех отметок и комментариев в textdb.dev + живая лента изменений в ntfy (хранит 12 ч).
  const CLOUD_STATE_URL = 'https://textdb.dev/api/data/5b1c1c09-5455-4708-88ae-64e5835ea873';
  const CLOUD_STREAM_URL = 'https://ntfy.sh/dubai_villas_krivsunov_comments_v1';
  const INITIAL_SHARED_SEED = {
    war4_6br_tayyab_pdf: { owner: { id: 'owner', author: 'Автор подборки', text: 'Круто, надо посмотреть обязательно. ВДруг все таки зеленом там и вид нормальный', updatedAt: 1000 } },
    samantha_ji_gardenhall500: { owner: { id: 'owner', author: 'Автор подборки', text: 'Второй свет нормалексный ваще', updatedAt: 1000 } },
    polo: { owner: { id: 'owner', author: 'Автор подборки', text: 'красивенько, чисьенько, аккуратненько', updatedAt: 1000 } }
  };
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_NOTE = 20000;
  const MAX_ENTRIES = 10000;
  const $ = (id) => document.getElementById(id);
  const strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const statuses = { selected: 'Выбрано', review: 'На рассмотрении', rejected: 'Отказано', unavailable: 'Недоступно', historical: 'Архив' };
  const types = { villa: 'Вилла', townhouse: 'Таунхаус', linked: 'Смежная вилла', unknown: 'Тип не указан' };
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const validId = (value) => typeof value === 'string' && value.length > 0 && value.length <= 256 && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
  const isTestNote = (value) => typeof value === 'string' && /Проверка заметки <script>|Импортированная проверка|Заметка из другой вкладки|Новая версия другой вкладки|Моя правка после другой вкладки/.test(value);
  let notes = Object.create(null);
  let sharedComments = Object.create(null);
  let sharedToggles = Object.create(null);
  let boundEntryIds = Object.create(null);
  let clientId = 'guest';
  let authorName = '';
  let storageReadable = true;
  let savedToDevice = true;
  let savedSnapshot = null;
  let noteSequence = 0;
  let lastOpener = null;
  let galleryDialog = null;
  const publishTimers = new Map();
  let cloudSyncTimer = null;
  let cloudSyncRunning = false;
  let cloudSyncAgain = false;
  let cloudOkAt = 0;
  const noteFields = new Set();
  const toggleWidgets = new Set();

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }

  function imageUrl(value) {
    const source = text(value);
    if (/^(?:\.\/)?(?:assets|gallery|videos)\//.test(source)) {
      try {
        const path = decodeURIComponent(source.split(/[?#]/)[0]);
        if (!source.includes('\\') && !path.includes('\\') && !path.split('/').includes('..') && !/[\u0000-\u001f\u007f]/.test(source + path)) return source;
      } catch { return ''; }
      return '';
    }
    return safeUrl(source);
  }

  function externalLink(label, href, className = 'button button-quiet') {
    const link = el('a', className, label);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function documentUrl(value) {
    const source = text(value);
    if (/^materials\/[a-z0-9_-]+\.pdf$/i.test(source)) return source;
    return safeUrl(source);
  }

  let notifyTimer = 0;
  function notify(message, error = false) {
    const node = $('notification');
    node.textContent = message;
    node.className = error ? 'toast toast-error' : 'toast';
    node.hidden = false;
    clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => { node.hidden = true; }, error ? 9000 : 4500);
  }

  function storageWarning(message) {
    $('storage-warning').textContent = message;
    $('storage-warning').hidden = false;
  }

  function validateNotes(payload) {
    if (!object(payload) || payload.version !== 1 || !object(payload.notes)) throw new Error('Ожидается JSON экспорта заметок версии 1 с объектом notes.');
    if (own(payload, 'exportedAt') && (typeof payload.exportedAt !== 'string' || payload.exportedAt.length > 64 || !Number.isFinite(Date.parse(payload.exportedAt)))) throw new Error('Некорректная дата экспорта.');
    const entries = Object.entries(payload.notes);
    if (entries.length > MAX_ENTRIES) throw new Error('В файле слишком много записей. Допустимо до 10 000.');
    const result = Object.create(null);
    for (const [id, note] of entries) {
      if (!validId(id) || typeof note !== 'string' || note.length > MAX_NOTE) throw new Error('Некорректная запись: нужен стабильный ID и текст до 20 000 символов.');
      if (note.trim()) result[id] = note;
    }
    checkSize(result);
    return result;
  }

  function checkSize(value) {
    if (Object.keys(value).length > MAX_ENTRIES || new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), notes: value }, null, 2)]).size > MAX_BYTES) throw new Error('Общий объём заметок превышает 2 МБ или 10 000 записей. Существующие заметки не изменены.');
  }

  function readNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      savedSnapshot = raw;
      if (raw) {
        if (new Blob([raw]).size > MAX_BYTES) throw new Error('Слишком большой объём заметок.');
        notes = validateNotes(JSON.parse(raw));
      }
    } catch {
      storageReadable = false;
      savedToDevice = false;
      storageWarning('Не удалось прочитать хранилище браузера. Его содержимое не перезаписывается. Новые заметки останутся в этой вкладке: сохраните их через «Экспорт JSON» до закрытия страницы.');
    }
    updateNotesCount();
  }

  function commitNotes(next) {
    checkSize(next);
    if (storageReadable) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const current = raw ? validateNotes(JSON.parse(raw)) : Object.create(null);
        const merged = Object.assign(Object.create(null), current);
        for (const id of new Set([...Object.keys(notes), ...Object.keys(next)])) {
          if (notes[id] === next[id]) continue;
          if (own(next, id)) merged[id] = next[id];
          else delete merged[id];
        }
        checkSize(merged);
        const serialized = JSON.stringify({ version: 1, notes: merged });
        localStorage.setItem(STORAGE_KEY, serialized);
        notes = merged;
        savedSnapshot = serialized;
        savedToDevice = true;
        $('storage-warning').hidden = true;
      } catch {
        notes = next;
        savedToDevice = false;
        storageWarning('Браузер не смог сохранить заметки на устройстве. Они доступны в этой вкладке. Экспортируйте JSON до закрытия страницы.');
      }
    } else {
      notes = next;
      savedToDevice = false;
    }
    refreshNoteFields();
    updateNotesCount();
  }

  function pauseForStorageConflict() {
    storageReadable = false;
    savedToDevice = false;
    storageWarning('Заметки изменились в другой вкладке. Чтобы не перезаписать другую версию, запись на устройство приостановлена. Экспортируйте текущие заметки, обновите страницу и импортируйте файл: тексты будут объединены.');
  }

  function currentAuthor() {
    return text(authorName).slice(0, 40) || 'Автор комментария';
  }

  function normalizeSharedEntry(rawEntry, fallbackId = '') {
    if (!object(rawEntry)) return null;
    const id = validId(rawEntry.id) ? rawEntry.id : (validId(fallbackId) ? fallbackId : '');
    if (!id) return null;
    const rawText = typeof rawEntry.text === 'string' ? rawEntry.text.slice(0, MAX_NOTE) : '';
    if (isTestNote(rawText)) return null;
    const updatedAt = typeof rawEntry.updatedAt === 'number' && Number.isFinite(rawEntry.updatedAt)
      ? rawEntry.updatedAt
      : (typeof rawEntry.updatedAt === 'string' && Number.isFinite(Date.parse(rawEntry.updatedAt)) ? Date.parse(rawEntry.updatedAt) : 1000);
    const deleted = !!rawEntry.deleted || !rawText.trim();
    return {
      id,
      author: text(rawEntry.author).slice(0, 40) || 'Автор комментария',
      text: deleted ? '' : rawText.trim(),
      updatedAt,
      clientId: text(rawEntry.clientId).slice(0, 64),
      deleted
    };
  }

  // Ключи для одинакового у всех выбора при равном времени правки: побеждает больший ключ.
  const commentKey = (entry) => JSON.stringify([entry.deleted ? 1 : 0, entry.text, entry.author, entry.clientId]);
  const toggleKey = (entry) => `${entry.viewed ? 1 : 0}${entry.rent ? 1 : 0}${entry.top ? 1 : 0}${entry.archived ? 1 : 0}|${entry.author}`;

  function mergeSharedEntry(propertyId, rawEntry, fallbackId = '') {
    if (!validId(propertyId)) return false;
    const entry = normalizeSharedEntry(rawEntry, fallbackId);
    if (!entry) return false;
    if (!own(sharedComments, propertyId)) sharedComments[propertyId] = Object.create(null);
    const existing = sharedComments[propertyId][entry.id];
    if (existing) {
      if (entry.updatedAt <= 1000 || existing.updatedAt > entry.updatedAt) return false;
      if (existing.updatedAt === entry.updatedAt && commentKey(entry) <= commentKey(existing)) return false;
    }
    sharedComments[propertyId][entry.id] = entry;
    return true;
  }

  function mergeSharedMap(rawMap) {
    if (!object(rawMap)) return false;
    let changed = false;
    for (const [propertyId, entries] of Object.entries(rawMap)) {
      if (!validId(propertyId)) continue;
      if (Array.isArray(entries)) {
        for (const item of entries) if (mergeSharedEntry(propertyId, item)) changed = true;
      } else if (object(entries)) {
        for (const [entryId, item] of Object.entries(entries)) if (mergeSharedEntry(propertyId, item, entryId)) changed = true;
      }
    }
    return changed;
  }

  function normalizeToggleEntry(rawToggle) {
    if (!object(rawToggle)) return null;
    const viewed = !!rawToggle.viewed;
    const rent = !!rawToggle.rent;
    const top = !!rawToggle.top;
    const archived = !!rawToggle.archived;
    const updatedAt = typeof rawToggle.updatedAt === 'number' && Number.isFinite(rawToggle.updatedAt) ? rawToggle.updatedAt : 1000;
    const author = text(rawToggle.author).slice(0, 40);
    return { viewed, rent, top, archived, updatedAt, author };
  }

  function mergeToggleEntry(propertyId, rawToggle) {
    if (!validId(propertyId)) return false;
    const entry = normalizeToggleEntry(rawToggle);
    if (!entry) return false;
    const existing = sharedToggles[propertyId];
    if (existing) {
      if (entry.updatedAt <= 1000 || existing.updatedAt > entry.updatedAt) return false;
      if (existing.updatedAt === entry.updatedAt && toggleKey(entry) <= toggleKey(existing)) return false;
    }
    sharedToggles[propertyId] = entry;
    return true;
  }

  function mergeToggleMap(rawMap) {
    if (!object(rawMap)) return false;
    let changed = false;
    for (const [propertyId, item] of Object.entries(rawMap)) {
      if (mergeToggleEntry(propertyId, item)) changed = true;
    }
    return changed;
  }

  function getPropertyToggle(property) {
    const id = property.id;
    if (own(sharedToggles, id)) return sharedToggles[id];
    return {
      viewed: !!property.viewedDefault,
      rent: !!property.rentDefault,
      top: false,
      archived: false,
      updatedAt: 1000,
      author: ''
    };
  }

  // Архив: последний показанный набор архивных id — чтобы перерисовать выборку, когда архив меняют на другом устройстве.
  let lastArchiveSig = '';
  function archiveSig() { return properties.filter((p) => getPropertyToggle(p).archived).map((p) => p.id).join(','); }
  function archiveChanged() { return archiveSig() !== lastArchiveSig; }

  function saveSharedToLocal() {
    try {
      localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify({ version: 1, sharedComments, sharedToggles }));
      localStorage.setItem(TOGGLES_STORAGE_KEY, JSON.stringify({ version: 1, sharedToggles }));
    } catch {}
  }

  function getVisibleSharedComments(propertyId) {
    if (!validId(propertyId) || !own(sharedComments, propertyId)) return [];
    return Object.values(sharedComments[propertyId])
      .filter((entry) => entry && !entry.deleted && entry.text && entry.text.trim() && !isTestNote(entry.text))
      .sort((a, b) => (a.updatedAt - b.updatedAt) || a.id.localeCompare(b.id));
  }

  function totalSharedCommentsCount() {
    let total = 0;
    for (const propertyId of Object.keys(sharedComments)) if (!propertyId.startsWith('vote:')) total += getVisibleSharedComments(propertyId).length;
    return total;
  }

  function getActiveEntryId(propertyId) {
    if (own(boundEntryIds, propertyId) && validId(boundEntryIds[propertyId])) return boundEntryIds[propertyId];
    boundEntryIds[propertyId] = clientId;
    return clientId;
  }

  function isOwnSharedEntry(propertyId, entry) {
    if (!entry) return false;
    if (entry.clientId && entry.clientId === clientId) return true;
    if (own(boundEntryIds, propertyId) && boundEntryIds[propertyId] === entry.id) return true;
    if (own(notes, propertyId) && notes[propertyId].trim() && notes[propertyId].trim() === entry.text.trim()) return true;
    return false;
  }

  function updateNotesCount() {
    const count = Object.keys(notes).length;
    const sharedTotal = totalSharedCommentsCount();
    if (count) {
      $('notes-count').textContent = `Заметок: ${count} · Общих комментариев: ${sharedTotal} (видны всем)`;
    } else if (sharedTotal) {
      $('notes-count').textContent = `Общих комментариев: ${sharedTotal} · сохраняются для всех`;
    } else {
      $('notes-count').textContent = 'Все комментарии и переключатели сохраняются автоматически и видны всем';
    }
    updateCommentBadges();
    updateVoteWidgets();
  }

  function formatCommentTime(timestamp) {
    if (typeof timestamp !== 'number' || timestamp <= 1000000000000) return 'сохранено в подборке';
    try {
      return new Date(timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  function renderSharedList(field) {
    const items = getVisibleSharedComments(field.id);
    const signature = JSON.stringify(items.map((item) => [item.id, item.author, item.text, item.updatedAt, isOwnSharedEntry(field.id, item)]));
    if (field.lastSignature === signature) return items.length;
    field.lastSignature = signature;
    field.list.replaceChildren();
    field.list.hidden = items.length === 0;
    for (const item of items) {
      const ownEntry = isOwnSharedEntry(field.id, item);
      const cardNode = el('div', ownEntry ? 'shared-comment-item is-own' : 'shared-comment-item');
      const meta = el('div', 'shared-comment-meta');
      const authorWrap = el('span', 'shared-comment-author', item.author || 'Участник');
      if (ownEntry) authorWrap.append(el('span', 'shared-comment-tag', 'Вы'));
      const right = el('span', 'shared-comment-right');
      const timeLabel = formatCommentTime(item.updatedAt);
      if (timeLabel && timeLabel !== 'сохранено в подборке') right.append(el('span', 'shared-comment-time', timeLabel));
      const editBtn = el('button', 'shared-comment-delete', 'Изм.');
      editBtn.type = 'button';
      editBtn.title = 'Изменить комментарий';
      editBtn.setAttribute('aria-label', 'Изменить комментарий');
      editBtn.addEventListener('click', () => {
        boundEntryIds[field.id] = item.id;
        const next = Object.assign(Object.create(null), notes);
        next[field.id] = item.text;
        try { commitNotes(next); } catch {}
        field.input.focus();
      });
      right.append(editBtn);
      const del = el('button', 'shared-comment-delete', '×');
      del.type = 'button';
      del.title = 'Удалить комментарий';
      del.setAttribute('aria-label', 'Удалить комментарий');
      del.addEventListener('click', () => deleteSharedComment(field.id, item.id));
      right.append(del);
      meta.append(authorWrap, right);
      const body = el('p', 'shared-comment-text', item.text);
      cardNode.append(meta, body);
      field.list.append(cardNode);
    }
    return items.length;
  }

  function refreshNoteFields() {
    for (const field of noteFields) {
      if (!field.input.isConnected) { noteFields.delete(field); continue; }
      const value = notes[field.id] || '';
      if (field.input.value !== value) field.input.value = value;
      const sharedCount = renderSharedList(field);
      const hasAny = !!value.trim() || sharedCount > 0;
      field.block.classList.toggle('has-note', hasAny);
      field.badge.hidden = !hasAny;
      field.badge.textContent = sharedCount > 1 ? `${sharedCount}` : 'Есть';
      field.status.textContent = !savedToDevice ? 'Не сохранено · экспортируйте JSON' : (hasAny ? 'Видно всем' : 'Автосохранение');
      field.status.classList.toggle('error', !savedToDevice);
      if (field.addBtn) field.addBtn.hidden = !value.trim();
      if (field.actionsRow) field.actionsRow.hidden = !value.trim();
    }
  }

  function applySharedChanges(cChanged, tChanged) {
    if (!cChanged && !tChanged) return;
    saveSharedToLocal();
    if (cChanged) {
      refreshNoteFields();
      updateNotesCount();
    }
    if (tChanged) {
      refreshToggleWidgets();
      if ($('filter-viewed') && ($('filter-viewed').value || $('filter-rent').value || $('filter-top').value || archiveChanged())) render();
    }
  }

  // В облако уходят только настоящие правки: записи со временем 1000 — это значения по умолчанию из каталога.
  function cloudSnapshot() {
    const toggles = {};
    for (const [id, entry] of Object.entries(sharedToggles)) if (entry.updatedAt > 1000) toggles[id] = entry;
    const comments = {};
    for (const [id, entries] of Object.entries(sharedComments)) {
      for (const [entryId, entry] of Object.entries(entries)) {
        if (entry.updatedAt <= 1000) continue;
        if (!own(comments, id)) comments[id] = {};
        comments[id][entryId] = entry;
      }
    }
    return { version: 2, updatedAt: Date.now(), sharedToggles: toggles, sharedComments: comments };
  }

  // После слияния локальное состояние не старее облачного; любое отличие значит, что в облаке не хватает наших правок.
  function localAheadOf(remote) {
    const remoteToggles = object(remote.sharedToggles) ? remote.sharedToggles : {};
    for (const [id, entry] of Object.entries(sharedToggles)) {
      if (entry.updatedAt <= 1000) continue;
      const other = own(remoteToggles, id) ? normalizeToggleEntry(remoteToggles[id]) : null;
      if (!other || other.updatedAt !== entry.updatedAt || toggleKey(other) !== toggleKey(entry)) return true;
    }
    const remoteComments = object(remote.sharedComments) ? remote.sharedComments : {};
    for (const [id, entries] of Object.entries(sharedComments)) {
      const remoteEntries = own(remoteComments, id) && object(remoteComments[id]) ? remoteComments[id] : {};
      for (const [entryId, entry] of Object.entries(entries)) {
        if (entry.updatedAt <= 1000) continue;
        const other = own(remoteEntries, entryId) ? normalizeSharedEntry(remoteEntries[entryId], entryId) : null;
        if (!other || other.updatedAt !== entry.updatedAt || commentKey(other) !== commentKey(entry)) return true;
      }
    }
    return false;
  }

  function setCloudStatus(ok) {
    if (ok) cloudOkAt = Date.now();
    const dot = $('sync-dot');
    if (!dot) return;
    dot.classList.toggle('is-offline', !ok);
    const time = cloudOkAt ? new Date(cloudOkAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' }) : '';
    const label = ok ? `Отметки и комментарии синхронизированы для всех в ${time} (Дубай)`
      : `Нет связи с общим хранилищем${time ? `, последняя синхронизация в ${time}` : ''}. Изменения сохранены на устройстве и уйдут всем, когда связь появится`;
    dot.parentElement.title = label;
    if ($('sync-state')) $('sync-state').textContent = ok ? ` · синхронизировано в ${time}` : ' · нет связи, отметки уйдут позже';
  }

  // Прочитать облачный снимок, влить его и, если у нас есть правки, которых там нет, записать объединённый снимок.
  async function syncCloudState() {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
    if (cloudSyncRunning) {
      cloudSyncAgain = true;
      return;
    }
    cloudSyncRunning = true;
    try {
      const resp = await fetch(CLOUD_STATE_URL, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      let remote = {};
      try { remote = JSON.parse((await resp.text()).trim() || '{}'); } catch {}
      if (!object(remote)) remote = {};
      applySharedChanges(mergeSharedMap(remote.sharedComments), mergeToggleMap(remote.sharedToggles));
      if (localAheadOf(remote)) {
        const body = JSON.stringify(cloudSnapshot());
        // textdb.dev принимает только точный тип text/plain; application/json — запасной путь.
        let put = await fetch(CLOUD_STATE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body });
        if (!put.ok) put = await fetch(CLOUD_STATE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if (!put.ok) throw new Error(`HTTP ${put.status}`);
      }
      setCloudStatus(true);
    } catch {
      setCloudStatus(false);
    } finally {
      cloudSyncRunning = false;
      if (cloudSyncAgain) {
        cloudSyncAgain = false;
        scheduleCloudSync(300);
      }
    }
  }

  function scheduleCloudSync(delay = 400) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(syncCloudState, delay);
  }

  async function publishEntryToCloud(propertyId, entryId) {
    if (!validId(propertyId) || !own(sharedComments, propertyId) || !own(sharedComments[propertyId], entryId)) return;
    const entry = sharedComments[propertyId][entryId];
    if (!entry || isTestNote(entry.text)) return;
    scheduleCloudSync();
    try {
      await fetch(CLOUD_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'comment', propertyId, entry })
      });
    } catch {}
  }

  async function publishToggleToCloud(propertyId) {
    if (!validId(propertyId) || !own(sharedToggles, propertyId)) return;
    const toggle = sharedToggles[propertyId];
    scheduleCloudSync();
    try {
      await fetch(CLOUD_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'toggle', propertyId, toggle })
      });
    } catch {}
  }

  function scheduleCloudPublish(propertyId, entryId, immediate = false) {
    const key = `${propertyId}::${entryId}`;
    if (publishTimers.has(key)) clearTimeout(publishTimers.get(key));
    if (immediate) {
      publishTimers.delete(key);
      publishEntryToCloud(propertyId, entryId);
      return;
    }
    publishTimers.set(key, setTimeout(() => {
      publishTimers.delete(key);
      publishEntryToCloud(propertyId, entryId);
    }, 600));
  }

  function syncLocalNoteToShared(propertyId, rawValue, immediate = false) {
    if (!validId(propertyId) || isTestNote(rawValue)) return;
    const entryId = getActiveEntryId(propertyId);
    const trimmed = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!trimmed) {
      if (own(sharedComments, propertyId) && own(sharedComments[propertyId], entryId) && !sharedComments[propertyId][entryId].deleted) {
        mergeSharedEntry(propertyId, {
          id: entryId,
          author: currentAuthor(),
          text: '',
          updatedAt: Date.now(),
          clientId,
          deleted: true
        });
        saveSharedToLocal();
        refreshNoteFields();
        updateNotesCount();
        scheduleCloudPublish(propertyId, entryId, immediate);
      }
      return;
    }
    const existing = own(sharedComments, propertyId) ? sharedComments[propertyId][entryId] : null;
    const authorLabel = existing && existing.id === 'owner' && !text(authorName) ? existing.author : currentAuthor();
    const changed = mergeSharedEntry(propertyId, {
      id: entryId,
      author: authorLabel,
      text: trimmed,
      updatedAt: Date.now(),
      clientId,
      deleted: false
    });
    if (changed) {
      saveSharedToLocal();
      refreshNoteFields();
      updateNotesCount();
      scheduleCloudPublish(propertyId, entryId, immediate);
    }
  }

  function deleteSharedComment(propertyId, entryId) {
    if (!validId(propertyId) || !validId(entryId)) return;
    const existing = own(sharedComments, propertyId) ? sharedComments[propertyId][entryId] : null;
    if (!existing) return;
    mergeSharedEntry(propertyId, {
      id: entryId,
      author: existing.author || currentAuthor(),
      text: '',
      updatedAt: Date.now(),
      clientId,
      deleted: true
    });
    saveSharedToLocal();
    if (own(notes, propertyId) && (getActiveEntryId(propertyId) === entryId || notes[propertyId].trim() === existing.text.trim())) {
      const next = Object.assign(Object.create(null), notes);
      delete next[propertyId];
      try { commitNotes(next); } catch {}
    } else {
      refreshNoteFields();
      updateNotesCount();
    }
    scheduleCloudPublish(propertyId, entryId, true);
  }

  function addSeparateComment(propertyId, inputNode) {
    if (!validId(propertyId)) return;
    const val = inputNode.value.trim();
    if (!val || isTestNote(val)) return;
    syncLocalNoteToShared(propertyId, val, true);
    boundEntryIds[propertyId] = `${clientId}_${Date.now().toString(36)}`;
    const next = Object.assign(Object.create(null), notes);
    delete next[propertyId];
    try { commitNotes(next); } catch {}
    notify('Комментарий опубликован в общую ленту. Поле очищено — при желании можно добавить ещё один комментарий.');
  }

  function noteBlock(property) {
    const block = el('div', 'notes-block');
    const heading = el('div', 'note-heading');
    const label = el('label', '', 'Комментарии');
    const badge = el('span', 'note-badge', 'Есть');
    badge.hidden = true;
    label.append(badge);
    const list = el('div', 'shared-comments-list');
    list.hidden = true;
    const input = el('textarea');
    const status = el('span', 'note-status');
    const actionsRow = el('div', 'note-actions');
    const addBtn = el('button', 'note-add-button', '+ Ещё комментарий');
    addBtn.type = 'button';
    addBtn.hidden = true;
    actionsRow.hidden = true;
    const inputId = `note-${++noteSequence}`;
    label.htmlFor = inputId;
    input.id = inputId;
    input.maxLength = MAX_NOTE;
    input.rows = 2;
    input.placeholder = 'Написать комментарий (виден всем)…';
    input.setAttribute('aria-label', `Ваш комментарий: ${property.title}`);
    status.id = `${inputId}-status`;
    status.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', status.id);
    if (!property.noteId) {
      input.disabled = true;
      input.placeholder = 'Для сохранения нужен уникальный идентификатор объекта';
      status.textContent = 'Заметки пока недоступны';
    } else {
      input.value = notes[property.noteId] || '';
      const fieldRecord = { id: property.noteId, input, status, block, badge, list, addBtn, actionsRow, lastSignature: '' };
      const sharedCount = renderSharedList(fieldRecord);
      const hasAny = !!input.value.trim() || sharedCount > 0;
      block.classList.toggle('has-note', hasAny);
      badge.hidden = !hasAny;
      badge.textContent = sharedCount > 1 ? `${sharedCount}` : 'Есть';
      status.textContent = !savedToDevice ? 'Не сохранено · экспортируйте JSON' : (hasAny ? 'Видно всем' : 'Автосохранение');
      status.classList.toggle('error', !savedToDevice);
      addBtn.hidden = !input.value.trim();
      actionsRow.hidden = !input.value.trim();
      noteFields.add(fieldRecord);
      input.addEventListener('input', () => {
        const next = Object.assign(Object.create(null), notes);
        if (input.value.trim()) next[property.noteId] = input.value;
        else delete next[property.noteId];
        try {
          commitNotes(next);
          syncLocalNoteToShared(property.noteId, input.value, false);
        } catch (error) {
          input.value = notes[property.noteId] || '';
          status.textContent = 'Изменение не сохранено: лимит объёма';
          status.classList.add('error');
          notify(error.message, true);
        }
      });
      input.addEventListener('change', () => syncLocalNoteToShared(property.noteId, input.value, true));
      addBtn.addEventListener('click', () => addSeparateComment(property.noteId, input));
    }
    heading.append(label, status);
    actionsRow.append(addBtn);
    block.append(heading, list, input, actionsRow);
    return block;
  }

  function media(src, alt, eager = false) {
    const box = el('div', 'media');
    const placeholder = el('div', 'media-placeholder');
    placeholder.append(el('span', '', '◇'), el('p', '', 'Фото пока нет'));
    box.append(placeholder);
    const url = imageUrl(src);
    if (url) {
      const img = el('img');
      img.alt = alt;
      img.loading = eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('load', () => { placeholder.hidden = true; });
      img.addEventListener('error', () => {
        img.remove();
        placeholder.hidden = false;
      }, { once: true });
      img.src = url;
      box.append(img);
    }
    return box;
  }

  function videoElement(item, label, controls = false) {
    const video = el('video');
    video.controls = controls;
    video.playsInline = true;
    video.preload = 'metadata';
    video.muted = true;
    video.defaultMuted = true;
    if (item.poster) video.poster = item.poster;
    if (controls) video.setAttribute('aria-label', label);
    else { video.tabIndex = -1; video.setAttribute('aria-hidden', 'true'); }
    video.src = item.src;
    return video;
  }

  function mediaPreview(item, label, eager = false, thumbnail = false) {
    if (item.type !== 'video') return media(thumbnail && item.thumb ? item.thumb : item.src, label, eager);
    const box = media(item.poster || '', label, eager);
    box.classList.add('video-preview');
    box.querySelector('.media-placeholder p').textContent = 'Видео';
    if (!item.poster && !thumbnail) box.append(videoElement(item, label));
    const play = el('span', 'play-indicator', '▶');
    play.setAttribute('aria-hidden', 'true');
    box.append(play);
    return box;
  }

  function pauseVideos(container) {
    container.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.muted = true;
      video.removeAttribute('src');
      video.load();
    });
  }

  function syncDialogScroll() {
    document.body.classList.toggle('dialog-open', $('property-dialog').open || !!(galleryDialog && galleryDialog.open));
  }

  function openGallery(property, startIndex, opener) {
    if (!property.media.length) return;
    if (galleryDialog) galleryDialog.close();
    const dialog = el('dialog', 'gallery-dialog');
    galleryDialog = dialog;
    dialog.setAttribute('aria-labelledby', 'gallery-title');
    const top = el('div', 'dialog-top');
    const heading = el('h2', 'gallery-title', property.title);
    heading.id = 'gallery-title';
    const close = el('button', 'close-button', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть галерею');
    top.append(heading, close);
    const counter = el('p', 'gallery-counter');
    counter.setAttribute('role', 'status');
    counter.setAttribute('aria-live', 'polite');
    counter.setAttribute('aria-atomic', 'true');
    const viewport = el('div', 'gallery-viewport');
    const stage = el('div', 'gallery-stage');
    const previous = el('button', 'gallery-nav', '‹');
    const next = el('button', 'gallery-nav', '›');
    previous.type = next.type = 'button';
    previous.setAttribute('aria-label', 'Предыдущее фото или видео');
    next.setAttribute('aria-label', 'Следующее фото или видео');
    previous.disabled = next.disabled = property.media.length < 2;
    viewport.append(previous, stage, next);
    const caption = el('p', 'gallery-caption');
    const thumbnails = el('div', 'gallery-thumbnails');
    thumbnails.setAttribute('role', 'group');
    thumbnails.setAttribute('aria-label', 'Все видео и фотографии');
    let current = startIndex;
    const buttons = property.media.map((item, index) => {
      const button = el('button', item.dh ? 'gallery-thumbnail is-dh' : 'gallery-thumbnail');
      button.type = 'button';
      button.setAttribute('aria-label', `${item.type === 'video' ? 'Видео' : 'Фото'} · ${index + 1} из ${property.media.length}: ${item.caption || property.title}`);
      button.append(mediaPreview(item, '', false, true), el('span', 'thumbnail-number', String(index + 1)));
      button.addEventListener('click', () => show(index));
      thumbnails.append(button);
      return button;
    });

    function show(index) {
      pauseVideos(stage);
      current = (index + property.media.length) % property.media.length;
      const item = property.media[current];
      const label = item.caption || property.title;
      const kind = item.type === 'video' ? 'Видео' : 'Фото';
      const message = el('p', 'gallery-media-error', `${kind} не удалось загрузить. Выберите другой материал.`);
      message.hidden = true;
      message.setAttribute('role', 'status');
      let node;
      if (item.type === 'video') node = videoElement(item, label, true);
      else {
        node = el('img');
        node.alt = label;
        node.decoding = 'async';
        node.referrerPolicy = 'no-referrer';
      }
      node.addEventListener('error', () => { message.hidden = false; node.hidden = true; }, { once: true });
      if (item.type !== 'video') node.src = item.src;
      stage.replaceChildren(node, message);
      counter.textContent = `${kind} · ${current + 1} из ${property.media.length}`;
      caption.textContent = item.caption || `${kind}: ${property.title}`;
      buttons.forEach((button, i) => {
        button.setAttribute('aria-current', String(i === current));
        button.tabIndex = i === current ? 0 : -1;
      });
      const active = buttons[current];
      thumbnails.scrollLeft = active.offsetLeft - thumbnails.offsetLeft - (thumbnails.clientWidth - active.offsetWidth) / 2;
    }

    close.addEventListener('click', () => { pauseVideos(stage); dialog.close(); });
    previous.addEventListener('click', () => show(current - 1));
    next.addEventListener('click', () => show(current + 1));
    dialog.addEventListener('keydown', (event) => {
      if (event.target.closest('video') || event.altKey || event.ctrlKey || event.metaKey) return;
      const targets = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: property.media.length - 1 };
      if (!own(targets, event.key)) return;
      event.preventDefault();
      show(targets[event.key]);
      if (thumbnails.contains(event.target)) buttons[current].focus({ preventScroll: true });
    });
    let touchStart = null;
    stage.addEventListener('touchstart', (event) => {
      touchStart = event.touches.length === 1 && !event.target.closest('video') ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    stage.addEventListener('touchend', (event) => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
    stage.addEventListener('touchcancel', () => { touchStart = null; });
    dialog.addEventListener('cancel', () => pauseVideos(stage));
    dialog.addEventListener('close', () => {
      pauseVideos(stage);
      dialog.remove();
      if (galleryDialog === dialog) galleryDialog = null;
      syncDialogScroll();
      if (!galleryDialog && opener && opener.isConnected) opener.focus({ preventScroll: true });
    });
    dialog.append(top, counter, viewport, caption, galleryCategoryBar(property, buttons, show), thumbnails);
    document.body.append(dialog);
    dialog.showModal();
    syncDialogScroll();
    show(startIndex);
    close.focus({ preventScroll: true });
  }

  const catalog = object(window.VILLA_CATALOG) ? window.VILLA_CATALOG : {};
  const rawProperties = Array.isArray(catalog.properties) ? catalog.properties.filter((item) => object(item) && item.status !== 'unavailable') : [];
  const idCounts = new Map();
  for (const item of rawProperties) if (validId(item.id)) idCounts.set(item.id, (idCounts.get(item.id) || 0) + 1);
  const properties = rawProperties.map((item, index) => {
    const status = own(statuses, item.status) ? item.status : 'review';
    const pictures = (Array.isArray(item.images) ? item.images : []).filter(object).map((picture) => ({ src: imageUrl(picture.src), thumb: imageUrl(picture.thumb), caption: text(picture.caption) })).filter((picture) => picture.src);
    const videos = (Array.isArray(item.videos) ? item.videos : []).filter(object).map((video) => ({ src: imageUrl(video.src), caption: text(video.caption), poster: imageUrl(video.poster), type: 'video' })).filter((video) => video.src);
    const cover = imageUrl(item.cover) || (pictures[0] && pictures[0].src) || '';
    if (cover && !pictures.some((picture) => picture.src === cover)) pictures.unshift({ src: cover, caption: '' });
    return {
      ...item,
      index,
      title: text(item.title) || 'Объект без названия',
      area: text(item.area),
      agent: text(item.agent),
      noteId: validId(item.id) && idCounts.get(item.id) === 1 ? item.id : '',
      status,
      statusLabel: text(item.statusLabel) || (own(statuses, item.status) ? statuses[status] : 'Статус не указан'),
      type: own(types, item.type) ? item.type : 'unknown',
      price: number(item.price),
      priceLabel: text(item.priceLabel),
      priceNote: text(item.priceNote),
      ceilingHeightM: typeof item.ceilingHeightM === 'number' ? item.ceilingHeightM : 3.0,
      ceilingMaxM: typeof item.ceilingMaxM === 'number' ? item.ceilingMaxM : 3.0,
      ceiling: text(item.ceiling),
      ceilingEstimateNote: text(item.ceilingEstimateNote),
      projectType: text(item.projectType),
      doubleHeight: text(item.doubleHeight) || 'no',
      doubleHeightLabel: text(item.doubleHeightLabel) || 'Без второго света',
      waterView: text(item.waterView) || 'no',
      waterViewLabel: text(item.waterViewLabel) || 'Без вида на воду',
      pool: text(item.pool) || 'no',
      poolLabel: text(item.poolLabel) || 'Без своего бассейна',
      viewedDefault: !!item.viewedDefault,
      rentDefault: !!item.rentDefault,
      model3d: object(item.model3d) && /^villa3d\/[a-z0-9_-]+\.js$/i.test(text(item.model3d.module)) ? {
        module: text(item.model3d.module),
        poster: /^villa3d\/[a-z0-9_-]+\.webp$/i.test(text(item.model3d.poster)) ? text(item.model3d.poster) : '',
        note: text(item.model3d.note),
        interior: !!item.model3d.interior,
        walk: !!item.model3d.walk,
        site: safeUrl(text(item.model3d.site))
      } : null,
      cover,
      images: pictures,
      videos,
      media: [...videos, ...pictures.map((picture) => ({ ...picture, type: 'image' }))],
      documents: (Array.isArray(item.documents) ? item.documents : []).filter(object).map((doc) => ({ href: documentUrl(doc.href), label: text(doc.label) || 'PDF с фотографиями' })).filter((doc) => doc.href),
      description: text(item.description),
      facts: strings(item.facts),
      caveats: strings(item.caveats),
      missing: strings(item.missing),
      listingUrl: safeUrl(item.listingUrl),
      detailPage: /^properties\/[a-z0-9_-]+\.html$/i.test(text(item.detailPage)) ? text(item.detailPage) : '',
      mapUrl: safeUrl(item.mapUrl),
      locationLabel: text(item.locationLabel),
      agentPhone: text(item.agentPhone),
      search: [
        item.title, item.area, item.agent, item.agentPhone, item.statusLabel,
        item.description, item.locationLabel, item.ceiling, item.ceilingEstimateNote,
        item.projectType, item.doubleHeightLabel, item.waterViewLabel, item.poolLabel,
        item.listingUrl, ...strings(item.facts), ...strings(item.caveats)
      ].filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase('ru-RU')
    };
  });

  const AED_PER_USD = 3.6725;
  const GENERIC_PRICE_NOTE = 'Заявленная цена; актуальные условия уточняются.';
  const statusTabs = [
    ['', 'Все'],
    ['active', 'Актуальные'],
    ['selected', 'Выбрано'],
    ['review', 'На рассмотрении'],
    ['rejected', 'Отказ'],
    ['historical', 'Архив']
  ];
  const standalone = rawProperties.length === 1 && !!document.querySelector('base');
  const state = { status: '', view: 'grid', onlyNew: false };
  let visibleList = properties;
  let currentDetail = null;
  let pushedHash = false;
  const ICONS = {
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>',
    chat: '<path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6z"/>',
    link: '<path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/>',
    doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    page: '<path d="M4 12h14M13 6l6 6-6 6"/>'
  };

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('icon');
    svg.innerHTML = ICONS[name];
    return svg;
  }

  function iconLink(name, label, href, className = 'button button-quiet') {
    const link = externalLink('', href, className);
    link.append(icon(name), el('span', '', label));
    return link;
  }

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const dubaiDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' });
  const fullDate = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric' });

  function isRecentArthur(property, now = Date.now()) {
    const offered = Date.parse(property.offeredAt);
    const age = now - offered;
    return property.sourceAgentId === 'arthur' && Number.isFinite(offered) && age >= 0 && age < DAY_MS;
  }

  function addedDateLabel(value, now = Date.now()) {
    const added = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+04:00` : value);
    if (!Number.isFinite(added)) return 'дата неизвестна';
    const day = (date) => Date.parse(dubaiDate.format(date) + 'T00:00:00Z');
    const days = Math.round((day(now) - day(added)) / DAY_MS);
    return days === 0 ? 'сегодня' : days === 1 ? 'вчера' : days === 2 ? 'позавчера' : fullDate.format(added);
  }

  function addedDateLine(property) {
    const line = el('p', 'added-date');
    const date = el('time', '', addedDateLabel(property.addedAt));
    if (property.addedAt) {
      date.dateTime = property.addedAt;
      date.title = `Добавлено на сайт: ${property.addedAt} · даты по Дубаю`;
    }
    line.append('Добавлено на сайт: ', date);
    return line;
  }

  function formatPhone(raw) {
    const clean = text(raw);
    const digits = clean.replace(/\D/g, '');
    const uae = digits.match(/^971(\d{2})(\d{3})(\d{4})$/);
    if (uae) return `+971 ${uae[1]} ${uae[2]} ${uae[3]}`;
    if (digits.length >= 8) return `+${digits}`;
    return clean;
  }

  function whatsappUrl(raw) {
    const digits = text(raw).replace(/\D/g, '');
    return digits.length >= 8 ? `https://wa.me/${digits}` : '';
  }

  function sourceSiteName(url) {
    if (!url) return '';
    try {
      const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
      if (host.includes('propertyfinder')) return 'Property Finder';
      if (host.includes('bayut')) return 'Bayut';
      if (host.includes('keyzee')) return 'Keyzee Homes';
      return host;
    } catch { return 'сайт объявления'; }
  }

  function noLinkSourceLabel(property) {
    if (property.videos.length && property.images.length) return 'Ссылки на сайт нет — только фото и видео риэлтора';
    if (property.videos.length) return 'Ссылки на сайт нет — только видео риэлтора';
    if (property.documents.length) return 'Ссылки на сайт нет — только PDF и фото риэлтора';
    if (property.images.length) return 'Ссылки на сайт нет — только фото риэлтора';
    return 'Ссылки на сайт нет — только фото/видео риэлтора (переписка)';
  }

  function agentContactLine(property) {
    const line = el('p', 'card-agent');
    const name = property.agent || 'Риэлтор не указан';
    const wa = whatsappUrl(property.agentPhone);
    const formatted = formatPhone(property.agentPhone);
    if (wa) {
      line.append(el('span', '', `Риэлтор: ${name} · `));
      line.append(externalLink(`WhatsApp ${formatted} ↗`, wa, 'inline-ext-link wa-link'));
    } else if (property.agent === 'Артур') {
      line.append(el('span', '', 'Риэлтор: Артур · WhatsApp (группа) · '));
      line.append(externalLink('TG @Art_Real_Estate ↗', 'https://t.me/Art_Real_Estate', 'inline-ext-link wa-link'));
    } else {
      line.append(el('span', '', `Риэлтор: ${name} · WhatsApp не указан`));
    }
    return line;
  }

  function sourceOriginLine(property) {
    const line = el('p', 'card-source');
    if (property.listingUrl) {
      const site = sourceSiteName(property.listingUrl);
      line.append(el('span', '', 'Откуда взят: '));
      line.append(externalLink(`Сайт ${site} ↗`, property.listingUrl, 'inline-ext-link source-site-link'));
    } else {
      line.append(el('span', 'source-no-link', noLinkSourceLabel(property)));
    }
    return line;
  }

  function usdLabel(aed) {
    return `≈ ${format.format(Math.round(aed / AED_PER_USD / 1000))} тыс. $ в год`;
  }

  function commentCount(property) {
    return property.noteId ? getVisibleSharedComments(property.noteId).length : 0;
  }

  function mediaSummary(property) {
    const parts = [];
    if (property.videos.length) parts.push(`${property.videos.length} видео`);
    if (property.images.length) parts.push(`${property.images.length} фото`);
    return parts.join(' · ');
  }

  function statusText(property) {
    return property.status === 'rejected' && !/отказ/i.test(property.statusLabel) ? `Отказ · ${property.statusLabel}` : property.statusLabel;
  }

  function badges(property, withType = false) {
    const group = el('div', 'badges');
    if (isRecentArthur(property)) {
      const badge = el('span', 'badge new-badge', 'Новое · Артур · 24 ч');
      badge.dataset.offeredAt = property.offeredAt;
      group.append(badge);
    }
    group.append(el('span', `badge status-${property.status}`, statusText(property)));
    if ((withType && property.type !== 'unknown') || property.type === 'townhouse' || property.type === 'linked') group.append(el('span', 'badge type-badge', types[property.type]));
    return group;
  }

  function priceBlock(property, detail = false) {
    const block = el('div', detail ? 'price-block detail-price' : 'price-block');
    if (property.price !== null) {
      block.append(el('p', 'price', property.priceLabel || `${format.format(property.price)} AED / год`), el('p', 'price-usd', usdLabel(property.price)));
    } else {
      block.append(el('p', 'price price-unknown', property.priceLabel || 'Цена не указана'));
    }
    if (property.priceNote && (detail || property.priceNote !== GENERIC_PRICE_NOTE)) block.append(el('p', 'price-note', property.priceNote));
    return block;
  }

  function precision(property) {
    if (!property.mapUrl && !property.geo) return 'Местоположение на карте не указано';
    const labels = { exact: 'Точка: точный объект', entrance: 'Точка: въезд, не точный дом', listing: 'Точка: из объявления', cluster: 'Точка: квартал, не точный дом', area: 'Точка: район, не точный дом' };
    const prec = property.geo ? property.geo.precision : property.mapPrecision;
    return own(labels, prec) ? labels[prec] : 'Точность точки не подтверждена';
  }

  function specItems(property) {
    const items = [];
    const bedrooms = number(property.bedrooms);
    const bathrooms = number(property.bathrooms);
    const plot = number(property.plotM2);
    const bua = number(property.buaM2);
    if (bedrooms !== null) items.push(`${format.format(bedrooms)} ${plural(bedrooms, 'спальня', 'спальни', 'спален')}`);
    if (bathrooms !== null) items.push(`${format.format(bathrooms)} ${plural(bathrooms, 'санузел', 'санузла', 'санузлов')}`);
    if (plot !== null) items.push(`участок ${format.format(plot)} м²`);
    if (bua !== null) items.push(`дом ${format.format(bua)} м²`);
    return items;
  }

  function specifications(property) {
    const list = el('ul', 'specs');
    const items = specItems(property);
    for (const value of items) list.append(el('li', '', value));
    if (!items.length) list.append(el('li', 'specs-empty', 'Метраж и спальни уточняются'));
    return list;
  }

  function featureChips(property) {
    const wrap = el('div', 'feature-chips');
    const ceilingChip = el('span', 'feature-chip chip-ceiling', `↕ Потолки: ${property.ceiling || `~${property.ceilingHeightM} м`}`);
    if (property.ceilingEstimateNote) ceilingChip.title = property.ceilingEstimateNote;
    wrap.append(ceilingChip);

    const dhClass = property.doubleHeight === 'no' || property.doubleHeight === 'unknown' ? 'chip-double-no' : 'chip-double-yes';
    const dhPrefix = property.doubleHeight === 'no' || property.doubleHeight === 'unknown' ? '' : '☀ ';
    const dhChip = el('span', `feature-chip ${dhClass}`, `${dhPrefix}${property.doubleHeightLabel}`);
    if (property.ceilingEstimateNote) dhChip.title = property.ceilingEstimateNote;
    wrap.append(dhChip);

    const wClass = { yes: 'chip-water-yes', partial: 'chip-water-partial', golf: 'chip-water-golf' }[property.waterView] || 'chip-water-no';
    const wPrefix = { yes: '≈ ', partial: '≈ ', golf: '⛳ ' }[property.waterView] || '';
    wrap.append(el('span', `feature-chip ${wClass}`, `${wPrefix}${property.waterViewLabel}`));

    const pClass = property.pool === 'private' ? 'chip-pool-private' : (property.pool === 'community' ? 'chip-pool-community' : 'chip-pool-no');
    const pPrefix = property.pool === 'private' || property.pool === 'community' ? '🏊 ' : '';
    wrap.append(el('span', `feature-chip ${pClass}`, `${pPrefix}${property.poolLabel}`));
    return wrap;
  }

  function updateSingleToggleWidget(widget) {
    const stateObj = getPropertyToggle(widget.property);
    const viewed = !!stateObj.viewed;
    const rent = !!stateObj.rent;
    widget.viewedBtn.setAttribute('aria-checked', String(viewed));
    widget.viewedLabel.textContent = viewed ? '✓ Смотрели' : 'Не смотрели';
    widget.viewedBtn.title = viewed ? 'Нажмите, чтобы отметить «Не смотрели»' : 'Нажмите, чтобы отметить «Смотрели»';

    widget.rentBtn.setAttribute('aria-checked', String(rent));
    widget.rentLabel.textContent = rent ? '★ Снимаем!' : 'Не снимаем';
    widget.rentBtn.title = rent ? 'Нажмите, чтобы переключить на «Не снимаем»' : 'Нажмите, чтобы переключить на «Снимаем!»';

    const top = !!stateObj.top;
    widget.topBtn.setAttribute('aria-checked', String(top));
    widget.topLabel.textContent = top ? '🔥 В ТОПЕ' : '☆ Добавить в ТОП';
    widget.topBtn.title = top ? 'Нажмите, чтобы убрать из топа' : 'Нажмите, чтобы добавить в топ';

    if (widget.hostCard) {
      widget.hostCard.classList.toggle('is-viewed', viewed);
      widget.hostCard.classList.toggle('is-renting', rent);
      widget.hostCard.classList.toggle('is-top', top);
      widget.hostCard.classList.toggle('is-archived', !!stateObj.archived);
    }
    const archived = !!stateObj.archived;
    widget.archiveBtn.setAttribute('aria-pressed', String(archived));
    widget.archiveBtn.textContent = archived ? '↩ Вернуть из архива' : '📦 В АРХИВ';
    widget.archiveBtn.title = archived ? 'Вернуть объект в общую выборку' : 'Убрать объект из общей выборки; найти его можно фильтром «В архиве»';
  }

  function refreshToggleWidgets() {
    for (const widget of toggleWidgets) {
      if (!widget.root.isConnected) {
        toggleWidgets.delete(widget);
        continue;
      }
      updateSingleToggleWidget(widget);
    }
    renderStats();
    if (state.status === 'top') render();
    else if ($('status-tabs')) renderStatusTabs(baseFilter());
  }

  function handleToggleFlip(property, field) {
    const current = getPropertyToggle(property);
    const nextViewed = field === 'viewed' ? !current.viewed : !!current.viewed;
    const nextRent = field === 'rent' ? !current.rent : !!current.rent;
    const nextTop = field === 'top' ? !current.top : !!current.top;
    const nextArchived = field === 'archived' ? !current.archived : !!current.archived;
    mergeToggleEntry(property.id, {
      viewed: nextViewed,
      rent: nextRent,
      top: nextTop,
      archived: nextArchived,
      updatedAt: Date.now(),
      author: currentAuthor()
    });
    saveSharedToLocal();
    refreshToggleWidgets();
    if (field === 'archived' || $('filter-viewed').value || $('filter-rent').value || $('filter-top').value) {
      render();
    }
    if (field === 'archived') notify(nextArchived ? `«${property.title}» — в архиве. Найти: фильтр «В архиве».` : `«${property.title}» возвращён из архива.`);
    publishToggleToCloud(property.id);
  }

  function decisionToggles(property, hostCard = null) {
    const root = el('div', 'decision-toggles');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', `Отметки по объекту: ${property.title}`);

    const viewedBtn = el('button', 'toggle-switch toggle-viewed');
    viewedBtn.type = 'button';
    viewedBtn.setAttribute('role', 'switch');
    viewedBtn.dataset.toggle = 'viewed';
    const viewedTrack = el('span', 'switch-track');
    viewedTrack.append(el('span', 'switch-thumb'));
    const viewedLabel = el('span', 'switch-label');
    viewedBtn.append(viewedTrack, viewedLabel);

    const rentBtn = el('button', 'toggle-switch toggle-rent');
    rentBtn.type = 'button';
    rentBtn.setAttribute('role', 'switch');
    rentBtn.dataset.toggle = 'rent';
    const rentTrack = el('span', 'switch-track');
    rentTrack.append(el('span', 'switch-thumb'));
    const rentLabel = el('span', 'switch-label');
    rentBtn.append(rentTrack, rentLabel);

    const topBtn = el('button', 'toggle-switch toggle-top');
    topBtn.type = 'button';
    topBtn.setAttribute('role', 'switch');
    topBtn.dataset.toggle = 'top';
    const topTrack = el('span', 'switch-track');
    topTrack.append(el('span', 'switch-thumb'));
    const topLabel = el('span', 'switch-label');
    topBtn.append(topTrack, topLabel);

    const archiveBtn = el('button', 'archive-toggle');
    archiveBtn.type = 'button';
    archiveBtn.dataset.toggle = 'archived';
    const widget = { property, root, viewedBtn, viewedLabel, rentBtn, rentLabel, topBtn, topLabel, archiveBtn, hostCard };
    updateSingleToggleWidget(widget);
    toggleWidgets.add(widget);

    viewedBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handleToggleFlip(property, 'viewed');
    });
    rentBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handleToggleFlip(property, 'rent');
    });
    topBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handleToggleFlip(property, 'top');
    });
    archiveBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handleToggleFlip(property, 'archived');
    });

    root.append(topBtn, viewedBtn, rentBtn, archiveBtn);
    return root;
  }

  function openButton(label, property, className) {
    const button = el('button', className, label);
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => openDetail(property, button));
    return button;
  }

  function commentBadge(property, className) {
    const badge = el('span', className);
    badge.dataset.commentsFor = property.noteId || '';
    fillCommentBadge(badge, commentCount(property));
    return badge;
  }

  function fillCommentBadge(badge, count) {
    badge.hidden = count === 0;
    badge.textContent = `✎ ${count}`;
    badge.title = `${count} ${plural(count, 'комментарий', 'комментария', 'комментариев')}`;
  }

  function updateCommentBadges() {
    document.querySelectorAll('[data-comments-for]').forEach((badge) => {
      fillCommentBadge(badge, badge.dataset.commentsFor ? getVisibleSharedComments(badge.dataset.commentsFor).length : 0);
    });
  }

  function quickLinks(property) {
    const group = el('div', 'quick-links');
    const wa = whatsappUrl(property.agentPhone);
    if (property.mapUrl) group.append(iconLink('pin', 'Карта', property.mapUrl, 'chip-link'));
    if (property.listingUrl) group.append(iconLink('link', 'Сайт', property.listingUrl, 'chip-link'));
    else if (property.documents.length) group.append(iconLink('doc', 'PDF', property.documents[0].href, 'chip-link'));
    return group;
  }

  function cover(property, eager) {
    const button = el('button', 'cover-button');
    button.type = 'button';
    button.setAttribute('aria-label', property.media.length ? `Открыть галерею: ${property.title}. Видео: ${property.videos.length}, фото: ${property.images.length}` : `Подробнее: ${property.title}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => property.media.length ? openGallery(property, 0, button) : openDetail(property, button));
    button.append(property.media.length ? mediaPreview(property.media[0], property.title, eager) : media('', property.title));
    const top = el('div', 'cover-top');
    top.append(badges(property), changeBadge(property), commentBadge(property, 'cover-comments'));
    button.append(top);
    if (property.media.length) button.append(el('span', 'cover-count', mediaSummary(property)));
    return button;
  }

  const SAT_PREC_SHORT = { exact: 'точный дом', house_likely: 'вероятный дом', street: 'улица', entrance: 'въезд в комьюнити', listing: 'точка объявления', cluster: 'квартал, дом не установлен', area: 'район, дом не установлен' };

  function satImages(property) {
    const s = property.satellite;
    return s && Array.isArray(s.images) ? s.images.filter((shot) => shot && typeof shot.src === 'string' && shot.src) : [];
  }

  function satButton(property, className = '') {
    const shots = satImages(property);
    const button = el('button', `sat-big-button ${className}`.trim());
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', `Со спутника: ${property.title}`);
    if (shots.length) {
      const img = el('img');
      img.src = shots[0].src; img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
      button.append(img);
    } else button.classList.add('is-empty');
    const textBox = el('span', 'sat-big-text');
    textBox.append(el('span', 'sat-big-label', '🛰 СО СПУТНИКА'));
    textBox.append(el('span', 'sat-big-sub', property.geo ? (SAT_PREC_SHORT[property.geo.precision] || property.geo.precision) : 'место дома не найдено'));
    button.append(textBox);
    button.addEventListener('click', (event) => { event.stopPropagation(); openSatellite(property, button); });
    return button;
  }

  function openSatellite(property, opener) {
    if (galleryDialog) galleryDialog.close();
    const s = property.satellite || {};
    const dialog = el('dialog', 'gallery-dialog sat-dialog');
    galleryDialog = dialog;
    dialog.setAttribute('aria-labelledby', 'sat-dialog-title');
    const top = el('div', 'dialog-top');
    const heading = el('h2', 'gallery-title', `Со спутника · ${property.title}`);
    heading.id = 'sat-dialog-title';
    const close = el('button', 'close-button', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть');
    top.append(heading, close);
    const body = el('div', 'sat-dialog-body');
    const facts = [];
    if (property.geo) facts.push(`Точка: ${SAT_PREC_SHORT[property.geo.precision] || property.geo.precision}`);
    if (s.check && !['cluster_ok', 'entrance', 'unknown'].includes(s.check)) facts.push(SAT_CHECK[s.check] || s.check);
    if (s.imageryDate) facts.push(`снимок Esri ${s.imageryDate}`);
    if (facts.length) body.append(el('p', 'sat-dialog-facts', facts.join(' · ')));
    const shots = satImages(property);
    if (shots.length) {
      const grid = el('div', 'sat-dialog-shots');
      for (const shot of shots) {
        const link = el('a', 'sat-dialog-shot');
        link.href = shot.src; link.target = '_blank'; link.rel = 'noopener';
        const img = el('img'); img.src = shot.src; img.decoding = 'async'; img.alt = text(shot.caption) || 'Спутниковый снимок';
        link.append(img, el('span', '', text(shot.caption)));
        grid.append(link);
      }
      body.append(grid);
    } else {
      body.append(el('p', 'sat-dialog-empty', 'Точное место этой виллы пока не найдено, поэтому снимков нет.'));
    }
    const known = (v) => (v && !/^(неизвестно|не установлено|не определено|нет данных)\.?$/i.test(String(v).trim()) ? v : '');
    const rows = [['Сад выходит на', known(s.gardenFacing)], ['Сзади', known(s.backs)], ['Стройка рядом', known(s.construction)], ['Дороги', known(s.roads)], ['Соседи', known(s.neighbors)]].filter((r) => r[1]);
    if (rows.length) body.append(factRows(rows));
    if (s.notes) body.append(el('p', 'sat-dialog-notes', s.notes));
    const links = el('p', 'sat-links sat-dialog-links');
    if (property.geo && Number.isFinite(property.geo.lat)) {
      const ll = `${property.geo.lat.toFixed(6)},${property.geo.lng.toFixed(6)}`;
      const g = el('a', 'button', 'Открыть в Google Maps (спутник)'); g.href = `https://www.google.com/maps/@${ll},19z/data=!3m1!1e3`; g.target = '_blank'; g.rel = 'noopener';
      const q = el('a', 'button button-quiet', `Координаты ${ll}`); q.href = `https://www.google.com/maps/search/?api=1&query=${ll}`; q.target = '_blank'; q.rel = 'noopener';
      links.append(g, q);
    } else if (property.area) {
      const g = el('a', 'button button-quiet', `Район на Google Maps: ${property.area}`); g.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.area + ', Dubai')}`; g.target = '_blank'; g.rel = 'noopener';
      links.append(g);
    }
    if (links.childNodes.length) body.append(links);
    body.append(el('p', 'aside-note', 'Снимки Esri World Imagery (0,5 м). Отметка — проверенная точка; если указан квартал или район, точный дом не установлен. Снимок мог устареть.'));
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (galleryDialog === dialog) galleryDialog = null;
      syncDialogScroll();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    });
    dialog.append(top, body);
    document.body.append(dialog);
    dialog.showModal();
    syncDialogScroll();
    close.focus({ preventScroll: true });
  }

  // --- 3D-модель виллы: three.js и модуль модели грузятся только по кнопке ---
  const MODEL3D_VIEWS = { start: 'Общий вид', street: 'С улицы', back: 'Сзади', pool: 'У бассейна', golf: 'С гольфа', top: 'Сверху', gf: 'План 1-го этажа', ff: 'План 2-го этажа' };

  function model3dButton(property, className = '') {
    const button = el('button', `sat-big-button model3d-button ${className}`.trim());
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', `3D-модель: ${property.title}`);
    if (property.model3d.poster) {
      const img = el('img');
      img.src = property.model3d.poster; img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
      button.append(img);
    } else button.classList.add('is-empty');
    const textBox = el('span', 'sat-big-text');
    textBox.append(el('span', 'sat-big-label', '🧊 3D-МОДЕЛЬ'), el('span', 'sat-big-sub', property.model3d.walk ? 'дом, участок, пролёт и прогулка от 1-го лица' : property.model3d.interior ? 'дом, участок и пролёт по комнатам' : 'дом и участок — покрутить'));
    button.append(textBox);
    button.addEventListener('click', (event) => { event.stopPropagation(); openModel3d(property, button); });
    return button;
  }

  function openModel3d(property, opener) {
    if (galleryDialog) galleryDialog.close();
    const dialog = el('dialog', 'gallery-dialog model3d-dialog');
    galleryDialog = dialog;
    dialog.setAttribute('aria-labelledby', 'model3d-title');
    const top = el('div', 'dialog-top');
    const heading = el('h2', 'gallery-title', `3D-модель · ${property.title}`);
    heading.id = 'model3d-title';
    const close = el('button', 'close-button', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть');
    if (property.model3d.site) { // отдельный сайт виллы: 360° тур, рендеры, инструменты 3D
      const site = externalLink('🌐 Сайт виллы: 360° тур и рендеры', property.model3d.site, 'button button-quiet model3d-site');
      top.append(heading, site, close);
    } else top.append(heading, close);
    const stage = el('div', 'model3d-stage');
    const status = el('p', 'model3d-status', 'Загружаю 3D-модель…');
    stage.append(status);
    const bar = el('div', 'model3d-bar');
    const note = el('p', 'aside-note model3d-note', property.model3d.note || 'Модель приблизительная, по фото.');
    const hint = el('p', 'aside-note model3d-note', 'Вращать — мышью или пальцем, приближать — колесом или щипком, сдвигать — правой кнопкой или двумя пальцами.');
    let viewer = null;
    let tourButton = null;
    let tourStop = null;
    let walkUI = null;
    const tourLabel = el('div', 'model3d-tour-label');
    const tourText = el('span', 'model3d-tour-text');
    const tourBar = el('span', 'model3d-tour-progress');
    const tourFill = el('span');
    tourBar.append(tourFill);
    tourLabel.append(tourText, tourBar);
    tourLabel.hidden = true;
    tourLabel.setAttribute('aria-live', 'polite');
    function updateWalk(info) { // прогулка от первого лица: кнопки, подпись комнаты, подсказка по управлению
      if (!walkUI) return;
      const on = !!info.active;
      dialog.classList.toggle('is-walking', on);
      walkUI.button.textContent = on ? '✕ Выйти из прогулки' : '🚶 Прогулка от 1-го лица';
      walkUI.button.setAttribute('aria-pressed', String(on));
      walkUI.exit.hidden = !on;
      walkUI.help.hidden = !on;
      walkUI.help.textContent = info.coarse ? 'Левым пальцем — идти (джойстик), правым — смотреть по сторонам'
        : info.locked ? 'Мышь — смотреть · W A S D или стрелки — идти · Shift — быстрее · Esc — выйти'
          : 'Нажмите на модель, чтобы смотреть мышью · W A S D или стрелки — идти · Esc — выйти';
      tourLabel.hidden = !on;
      tourBar.hidden = on;
      if (on) tourText.textContent = info.room || '';
    }
    function updateTour(info) { // состояние пролёта по дому: кнопки, подпись комнаты, полоска хода
      if (!tourButton) return;
      tourButton.textContent = info.state === 'playing' ? '⏸ Пауза' : info.state === 'paused' ? '▶ Продолжить' : '▶ Пролёт по дому';
      tourButton.setAttribute('aria-pressed', String(info.state !== 'idle'));
      tourStop.hidden = info.state === 'idle';
      tourLabel.hidden = info.state === 'idle';
      tourText.textContent = info.state === 'paused' ? `${info.label || 'Пауза'} · пауза, можно осмотреться` : (info.label || '');
      tourFill.style.width = `${Math.round(Math.min(1, info.progress) * 100)}%`;
    }
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('cancel', (event) => { // Esc во время прогулки выводит из неё, окно остаётся
      if (viewer && viewer.walk && viewer.walk.active) { event.preventDefault(); viewer.walk.stop(); }
    });
    dialog.addEventListener('close', () => {
      if (viewer) viewer.dispose();
      viewer = null;
      dialog.remove();
      if (galleryDialog === dialog) galleryDialog = null;
      syncDialogScroll();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    });
    dialog.append(top, stage, bar, note, hint);
    document.body.append(dialog);
    dialog.showModal();
    syncDialogScroll();
    close.focus({ preventScroll: true });
    if (location.protocol === 'file:') { // модули three.js браузер не грузит из файла на диске
      status.textContent = '3D-модель открывается на сайте каталога — в копии на диске браузер её не загружает.';
      const online = el('a', 'button', 'Открыть на сайте');
      online.href = `https://sites.aimulticast.org/dubai-villas-catalog~KJ65hnqEnPa5Zd2H/properties/${encodeURIComponent(property.id)}.html`;
      online.target = '_blank';
      online.rel = 'noopener';
      bar.append(online);
      return;
    }
    const release = (document.querySelector('meta[name="catalog-release"]') || {}).content || ''; // свежие модули после выкладки
    const v = release ? `?v=${encodeURIComponent(release)}` : '';
    Promise.all([import(`./villa3d/viewer.js${v}`), import(`./${property.model3d.module}${v}`)]).then(([lib, model]) => {
      if (!dialog.open) return;
      status.remove();
      viewer = lib.mount(stage, model.build, { onTour: updateTour, onWalk: updateWalk });
      if (viewer.tour || viewer.walk) stage.append(tourLabel);
      if (viewer.walk) {
        const box = el('div', 'model3d-walk');
        const button = el('button', 'button model3d-tour-button', '🚶 Прогулка от 1-го лица');
        button.type = 'button';
        button.setAttribute('aria-pressed', 'false');
        const spawn = el('select', 'model3d-spawn');
        spawn.setAttribute('aria-label', 'Откуда начать прогулку');
        for (const s of viewer.walk.spawns) { const o = el('option', '', s.label); o.value = s.name; spawn.append(o); }
        button.addEventListener('click', () => (viewer.walk.active ? viewer.walk.stop() : viewer.walk.start(spawn.value)));
        spawn.addEventListener('change', () => { if (viewer.walk.active) viewer.walk.start(spawn.value); });
        box.append(button, spawn);
        bar.append(box);
        const exit = el('button', 'model3d-walk-exit', '✕ Выйти');
        exit.type = 'button';
        exit.hidden = true;
        exit.addEventListener('click', () => viewer.walk.stop());
        const help = el('p', 'model3d-walk-help', '');
        help.hidden = true;
        stage.append(exit, help);
        walkUI = { button, exit, help };
        hint.textContent += ' Прогулка: компьютер — мышь и W A S D (Shift — быстрее), телефон — джойстик слева и взгляд пальцем справа; по лестнице поднимаетесь сами.';
      }
      if (viewer.tour) {
        tourButton = el('button', 'button model3d-tour-button', '▶ Пролёт по дому');
        tourButton.type = 'button';
        tourButton.setAttribute('aria-pressed', 'false');
        tourButton.addEventListener('click', () => {
          const tour = viewer.tour;
          if (tour.state === 'playing') tour.pause();
          else if (tour.state === 'paused') tour.resume();
          else tour.start();
        });
        tourStop = el('button', 'button button-quiet', '■ Выйти из пролёта');
        tourStop.type = 'button';
        tourStop.hidden = true;
        tourStop.addEventListener('click', () => viewer.tour.stop());
        bar.append(tourButton, tourStop);
        hint.textContent += ` Пролёт по дому — около ${Math.round(viewer.tour.duration / 10) * 10} секунд; нажмите на модель, чтобы остановиться и осмотреться, кнопка «Продолжить» ведёт дальше.`;
      }
      for (const name of viewer.views) {
        const button = el('button', 'button button-quiet', MODEL3D_VIEWS[name] || name);
        button.type = 'button';
        button.addEventListener('click', () => viewer.setView(name));
        bar.append(button);
      }
      const spin = el('button', 'button button-quiet', '⟳ Вращение');
      spin.type = 'button';
      spin.setAttribute('aria-pressed', 'false');
      spin.addEventListener('click', () => {
        viewer.setAutoRotate(!viewer.autoRotate);
        spin.setAttribute('aria-pressed', String(viewer.autoRotate));
      });
      bar.append(spin);
    }).catch((error) => {
      status.textContent = `3D-модель не загрузилась (${error.message}). Нужен браузер с поддержкой WebGL.`;
    });
  }

  function card(property, index) {
    const article = el('article', `property-card is-${property.status}`);
    article.dataset.id = property.id;
    const main = el('div', 'card-main');
    const title = el('h3', 'card-title');
    title.append(openButton(property.title, property, 'title-button'));
    const meta = el('p', 'card-meta');
    meta.append(el('span', 'card-area', property.area || 'Район не указан'));
    main.append(
      priceBlock(property),
      marketBadge(property),
      title,
      decisionToggles(property, article),
      meta,
      addedDateLine(property),
      agentContactLine(property),
      sourceOriginLine(property),
      specifications(property),
      featureChips(property),
      criteriaRow(property),
      driveLine(property)
    );
    if (property.ceilingEstimateNote) {
      const ceilBox = el('p', 'ceiling-summary');
      ceilBox.append(el('strong', '', 'Оценка потолков по проекту и фото: '), el('span', '', property.ceilingEstimateNote));
      ceilBox.title = property.ceilingEstimateNote;
      main.append(ceilBox);
    }
    if (property.description) main.append(el('p', 'description card-description', property.description));
    if (property.caveats.length) main.append(el('p', 'caveat', property.caveats[0] + (property.caveats.length > 1 ? ` · ещё ${property.caveats.length - 1} в карточке` : '')));
    const actions = el('div', 'card-actions');
    actions.append(openButton('Подробнее', property, 'button card-open'), quickLinks(property));
    main.append(satButton(property));
    if (property.model3d) main.append(model3dButton(property));
    main.append(actions, cardSocial(property), brokerBlock(property));
    article.append(cover(property, index < 3), main, noteBlock(property));
    return article;
  }

  function listHeader() {
    const head = el('div', 'list-head');
    head.setAttribute('aria-hidden', 'true');
    ['Объект', 'Цена', 'Спальни', 'Участок', 'Дом', 'Статус', ''].forEach((label) => head.append(el('span', '', label)));
    return head;
  }

  function listRow(property, index) {
    const row = el('article', `list-row is-${property.status}`);
    row.dataset.id = property.id;
    const thumb = el('button', 'list-thumb');
    thumb.type = 'button';
    thumb.tabIndex = -1;
    thumb.setAttribute('aria-hidden', 'true');
    const first = property.media[0];
    thumb.append(first ? mediaPreview(first, '', index < 8, true) : media('', ''));
    thumb.addEventListener('click', () => openDetail(property, row.querySelector('.title-button')));
    const name = el('div', 'list-name');
    const title = el('h3', 'list-title');
    title.append(openButton(property.title, property, 'title-button'));
    name.append(
      title,
      addedDateLine(property),
      el('p', 'list-sub', [property.area || 'Район не указан', property.ceiling ? `Потолки ${property.ceiling}` : '', property.waterViewLabel].filter(Boolean).join(' · ')),
      decisionToggles(property, row)
    );
    const price = el('div', 'list-price');
    if (property.price !== null) price.append(el('strong', '', format.format(property.price)), el('span', '', ` AED · ${usdLabel(property.price).replace(' в год', '')}`));
    else price.append(el('span', 'muted', property.priceLabel || 'Цена не указана'));
    const beds = number(property.bedrooms);
    const plot = number(property.plotM2);
    const bua = number(property.buaM2);
    const cell = (value, label) => {
      const node = el('span', value === null ? 'list-num is-empty' : 'list-num', value === null ? '—' : value);
      node.dataset.label = label;
      return node;
    };
    row.append(thumb, name, price,
      cell(beds === null ? null : format.format(beds), 'спальни'),
      cell(plot === null ? null : `${format.format(plot)} м²`, 'участок'),
      cell(bua === null ? null : `${format.format(bua)} м²`, 'дом'),
      badges(property), commentBadge(property, 'list-comments'));
    row.addEventListener('click', (event) => {
      if (event.target.closest('a, button, input, textarea, select')) return;
      openDetail(property, row.querySelector('.title-button'));
    });
    return row;
  }

  function detailSection(parent, heading, values, className = '') {
    if (!values.length) return;
    const section = el('section', `detail-section ${className}`.trim());
    const list = el('ul');
    section.append(el('h3', '', heading));
    values.forEach((value) => list.append(el('li', '', value)));
    section.append(list);
    parent.append(section);
  }

  function mosaic(property) {
    const wrap = el('div', 'mosaic');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Фото и видео объекта');
    if (!property.media.length) {
      wrap.classList.add('is-empty');
      wrap.append(media('', '', true));
      return wrap;
    }
    const shown = property.media.slice(0, 5);
    wrap.classList.add(`count-${shown.length}`);
    shown.forEach((item, index) => {
      const button = el('button', 'mosaic-item');
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'dialog');
      const kind = item.type === 'video' ? 'Видео' : 'Фото';
      button.setAttribute('aria-label', `Открыть ${kind.toLowerCase()} ${index + 1} из ${property.media.length}: ${item.caption || property.title}`);
      button.append(mediaPreview(item, item.caption || property.title, index === 0, index > 0));
      const rest = property.media.length - shown.length;
      if (item.dh) button.append(el('span', 'mosaic-dh', '☀ двусветный объём'));
      if (index === shown.length - 1 && rest > 0) button.append(el('span', 'mosaic-more', `+${rest}`));
      button.addEventListener('click', () => openGallery(property, index, button));
      wrap.append(button);
    });
    const all = el('button', 'mosaic-all', `Все материалы · ${mediaSummary(property)}`);
    all.type = 'button';
    all.addEventListener('click', () => openGallery(property, 0, all));
    wrap.append(all);
    return wrap;
  }

  function propertyLink(property) {
    if (property.detailPage) return new URL(property.detailPage, document.baseURI).href;
    return `${location.origin}${location.pathname}${location.search}#${encodeURIComponent(property.id)}`;
  }

  function buildDetail(property, container) {
    container.replaceChildren();
    const head = el('header', 'detail-head');
    const title = el('h2', 'detail-title', property.title);
    title.id = 'detail-title';
    head.append(badges(property, true), title, addedDateLine(property), el('p', 'detail-location', [property.area || 'Район не указан', property.projectType || '', property.agent ? `агент ${property.agent}` : ''].filter(Boolean).join(' · ')));
    container.append(head, mosaic(property));

    const layout = el('div', 'detail-layout');
    const mainCol = el('div', 'detail-main');
    const aside = el('aside', 'detail-aside');

    const toggleCard = el('div', 'aside-card');
    toggleCard.append(el('p', 'aside-label', 'Ваши отметки (видны всем)'), decisionToggles(property));
    aside.append(toggleCard, satButton(property, 'sat-big-detail'));
    if (property.model3d) aside.append(model3dButton(property, 'sat-big-detail'));

    const priceCard = el('div', 'aside-card');
    priceCard.append(priceBlock(property, true));
    const facts = el('dl', 'detail-facts');
    const rows = [
      ['Спальни', number(property.bedrooms) === null ? '—' : format.format(property.bedrooms), false],
      ['Санузлы', number(property.bathrooms) === null ? '—' : format.format(property.bathrooms), false],
      ['Участок', number(property.plotM2) === null ? '—' : `${format.format(property.plotM2)} м²`, false],
      ['Дом', number(property.buaM2) === null ? '—' : `${format.format(property.buaM2)} м²`, false],
      ['Высота потолков', text(property.ceiling) || '—', true],
      ['Второй свет', text(property.doubleHeightLabel) || '—', true],
      ['Вид на озеро / воду', text(property.waterViewLabel) || '—', true],
      ['Бассейн', text(property.poolLabel) || '—', false],
      ['Тип', types[property.type], false]
    ];
    for (const [label, value, fullRow] of rows) {
      const classes = [];
      if (value === '—') classes.push('is-empty');
      if (fullRow) classes.push('full-row');
      const row = el('div', classes.join(' '));
      row.append(el('dt', '', label), el('dd', '', value));
      facts.append(row);
    }
    priceCard.append(facts);

    const contact = el('div', 'aside-card');
    const wa = whatsappUrl(property.agentPhone);
    contact.append(el('p', 'aside-label', 'Риэлтор и источник'), el('p', 'aside-agent', property.agent || 'Не указан'));
    if (wa) contact.append(iconLink('chat', `WhatsApp ${formatPhone(property.agentPhone)}`, wa, 'button button-wa'));
    else if (property.agent === 'Артур') contact.append(iconLink('chat', 'TG @Art_Real_Estate (группа WhatsApp)', 'https://t.me/Art_Real_Estate', 'button button-wa'));
    else contact.append(el('p', 'aside-note', 'WhatsApp не сохранён'));
    const links = el('div', 'aside-links');
    if (property.mapUrl) links.append(iconLink('pin', 'Открыть на карте', property.mapUrl));
    if (property.listingUrl) links.append(iconLink('link', `Сайт · ${sourceSiteName(property.listingUrl)}`, property.listingUrl));
    property.documents.forEach((doc) => links.append(iconLink('doc', doc.label, doc.href)));
    contact.append(links, el('p', 'aside-note', [property.locationLabel, precision(property)].filter(Boolean).join(' · ')));
    if (!property.listingUrl) contact.append(el('p', 'aside-note', noLinkSourceLabel(property)));
    aside.append(priceCard, contact, ...detailAsideExtras(property));

    const description = el('section', 'detail-section');
    description.append(el('h3', '', 'Описание'), el('p', 'description', property.description || 'Описание пока не предоставлено.'));
    mainCol.append(description);

    if (property.ceilingEstimateNote || property.projectType) {
      const ceilingSec = el('section', 'detail-section is-ceiling-box');
      ceilingSec.append(
        el('h3', '', 'Высота потолков и второй свет'),
        el('p', 'ceiling-headline', `Потолки: ${property.ceiling}. ${property.doubleHeightLabel}.`),
        el('p', '', [
          property.ceilingEstimateNote,
          `Вид: ${property.waterViewLabel}. Бассейн: ${property.poolLabel}.`
        ].filter(Boolean).join('\n'))
      );
      if (property.ceilingSources && property.ceilingSources.length) {
        const list = el('ul', 'ceiling-sources');
        property.ceilingSources.forEach((s) => list.append(el('li', '', s)));
        ceilingSec.append(el('p', 'aside-label', 'Источники'), list, el('p', 'aside-note', 'Застройщики высоту потолков не публикуют. Цифры — оценка по фото (двери, кухонные пеналы, ярусы окон), слова агентов и ваши отзывы. Норма Dubai Building Code — не меньше 2,7 м в жилых комнатах. Точно — только рулеткой на просмотре.'));
      }
      mainCol.append(ceilingSec);
    }

    detailSection(mainCol, 'Что известно', property.facts);
    detailSection(mainCol, 'Обратить внимание', property.caveats, 'is-caveats');
    detailSection(mainCol, 'Что ещё уточнить', property.missing);
    if (text(property.requestState)) detailSection(mainCol, 'Уточнения у агента', [text(property.requestState)]);
    if (strings(property.possibleDuplicateIds).length) detailSection(mainCol, 'Проверка предложения', ['Возможно, этот же объект есть в подборке повторно. Совпадение ещё не подтверждено.']);
    if (text(property.sourceNote)) detailSection(mainCol, 'Примечание к источнику', [text(property.sourceNote)]);
    const comments = el('section', 'detail-section detail-comments');
    comments.append(el('h3', '', 'Комментарии'), noteBlock(property));
    detailMainExtras(property, mainCol);
    mainCol.append(comments);

    layout.append(mainCol, aside);
    container.append(layout);
    initDetailMap(property, container);
    markSeen(property);
  }

  function updateDialogNav() {
    const index = visibleList.indexOf(currentDetail);
    const inList = index !== -1;
    $('prev-property').disabled = !inList || visibleList.length < 2;
    $('next-property').disabled = !inList || visibleList.length < 2;
    $('dialog-position').textContent = inList ? `${index + 1} из ${visibleList.length}` : '';
    $('dialog-heading').textContent = currentDetail ? currentDetail.title : '';
  }

  function openDetail(property, opener, options = {}) {
    if (!options.keepOpener) lastOpener = opener || lastOpener;
    currentDetail = property;
    if (galleryDialog) galleryDialog.close();
    pauseVideos($('detail-content'));
    for (const field of noteFields) if (!field.input.isConnected) noteFields.delete(field);
    buildDetail(property, $('detail-content'));
    updateDialogNav();
    const hash = `#${encodeURIComponent(property.id)}`;
    if (location.hash !== hash) {
      if (options.replace || $('property-dialog').open) history.replaceState(history.state, '', hash);
      else if (!options.fromHistory) { history.pushState({ villa: property.id }, '', hash); pushedHash = true; }
    }
    if (!$('property-dialog').open) $('property-dialog').showModal();
    $('property-dialog').scrollTop = 0;
    document.body.classList.add('dialog-open');
    if (!options.keepFocus) $('close-dialog').focus({ preventScroll: true });
  }

  function stepDetail(delta) {
    const index = visibleList.indexOf(currentDetail);
    if (index === -1 || visibleList.length < 2) return;
    openDetail(visibleList[(index + delta + visibleList.length) % visibleList.length], null, { replace: true, keepOpener: true, keepFocus: true });
  }

  function fillFilter(id, field, allLabel) {
    const counts = new Map();
    for (const property of properties) {
      const k = property[field] || '';
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const values = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'ru'));
    const select = $(id);
    select.replaceChildren(new Option(allLabel, ''));
    values.forEach((value) => {
      const label = value || (field === 'area' ? 'Район не указан' : 'Агент не указан');
      select.add(new Option(`${label} (${counts.get(value)})`, value || '∅'));
    });
    return values;
  }

  fillFilter('area', 'area', 'Все районы');
  fillFilter('agent', 'agent', 'Все агенты');

  function matchesStatus(property, status) {
    if (!status) return true;
    if (status === 'active') return property.status === 'selected' || property.status === 'review';
    if (status === 'changed') return !!property.change;
    if (status === 'top') return !!getPropertyToggle(property).top;
    return property.status === status;
  }

  function matchesPriceFilter(property, priceFilter) {
    if (!priceFilter) return true;
    const p = property.price;
    if (priceFilter === 'unknown') return p === null;
    if (p === null) return false;
    if (priceFilter === 'up-400') return p <= 400000;
    if (priceFilter === 'up-450') return p <= 450000;
    if (priceFilter === 'up-500') return p <= 500000;
    if (priceFilter === 'up-550') return p <= 550000;
    if (priceFilter === 'up-600') return p <= 600000;
    if (priceFilter === 'up-700') return p <= 700000;
    if (priceFilter === 'up-800') return p <= 800000;
    if (priceFilter === 'up-900') return p <= 900000;
    if (priceFilter === 'up-1000') return p <= 1000000;
    if (priceFilter === '600-1000') return p >= 600000 && p <= 1000000;
    if (priceFilter === 'from-800') return p >= 800000;
    if (priceFilter === '400-550') return p >= 400000 && p <= 550000;
    if (priceFilter === 'from-500') return p >= 500000;
    return true;
  }

  function matchesCeilingFilter(property, ceilingFilter) {
    if (!ceilingFilter) return true;
    const rooms = property.ceilTypical || 0;
    const living = Math.max(property.ceilLiving || 0, rooms);
    const dhHall = property.doubleHeight === 'yes';
    const m = ceilingFilter.match(/^rooms-(\d+(?:\.\d+)?)$/);
    if (m) return rooms >= Number(m[1]) - 0.001;
    if (ceilingFilter === 'living-3.4') return living >= 3.4 || dhHall;
    if (ceilingFilter === 'living-4') return living >= 4 || dhHall;
    if (ceilingFilter === 'double') return dhHall && (property.ceilDh || 0) >= 5.5;
    if (ceilingFilter === 'known') return rooms > 0 && !property.ceilAnalog;
    return true;
  }

  function matchesWaterFilter(property, waterFilter) {
    if (!waterFilter) return true;
    if (waterFilter === 'direct') return property.waterView === 'yes';
    if (waterFilter === 'yes') return property.waterView === 'yes' || property.waterView === 'partial';
    if (waterFilter === 'water-or-golf') return ['yes', 'partial', 'golf'].includes(property.waterView);
    if (waterFilter === 'golf') return property.waterView === 'golf';
    if (waterFilter === 'no') return property.waterView === 'no';
    return true;
  }

  function matchesDoubleHeightFilter(property, dhFilter) {
    if (!dhFilter) return true;
    if (dhFilter === 'any-yes') return property.doubleHeight !== 'no' && property.doubleHeight !== 'unknown';
    return property.doubleHeight === dhFilter;
  }

  function matchesPoolFilter(property, poolFilter) {
    if (!poolFilter) return true;
    if (poolFilter === 'any') return property.pool === 'private' || property.pool === 'community';
    if (poolFilter === 'no') return property.pool === 'no' || property.pool === 'community';
    return property.pool === poolFilter;
  }

  // Новые фильтры 09.11: подборка, стиль, мебель, стройка рядом.
  const NEW_BATCH = 'pf-1m-20261109';
  const areaSet = new Set();
  function propertyFurnished(property) {
    const raw = (text(property.furnished) || text(property.listing && property.listing.furnished)).toLowerCase();
    return ['no', 'yes', 'partly'].includes(raw) ? raw : 'unknown';
  }
  function propertyConstruction(property) {
    if (['none', 'risk', 'unknown'].includes(property.construction)) return property.construction;
    const c = property.criteria && property.criteria.noConstruction;
    const mark = Array.isArray(c) ? c[0] : (object(c) ? c.v : c);
    return mark === 'yes' ? 'none' : (mark === 'no' ? 'risk' : 'unknown');
  }
  function matchesExtraFilters(property) {
    const v = (id) => ($(id) ? $(id).value : '');
    const nf = v('filter-new');
    if (nf === 'batch' && property.newBatch !== NEW_BATCH) return false;
    if (nf === 'arthur1109' && property.newBatch !== 'arthur-20261109') return false;
    if (nf === 'unseen' && property.change !== 'new') return false;
    const st = v('filter-style');
    if (st === 'modern' && property.style !== 'modern') return false;
    if (st === 'modern-or-renovated' && !['modern', 'renovated'].includes(property.style)) return false;
    if (st === 'classic' && property.style !== 'classic') return false;
    const fu = v('filter-furnished');
    const f = propertyFurnished(property);
    if (fu === 'no' && f !== 'no') return false;
    if (fu === 'no-or-partly' && !['no', 'partly'].includes(f)) return false;
    if (fu === 'yes' && !['yes', 'partly'].includes(f)) return false;
    const co = v('filter-construction');
    const c = propertyConstruction(property);
    if (co === 'none' && c !== 'none') return false;
    if (co === 'not-risk' && c === 'risk') return false;
    if (co === 'risk' && c !== 'risk') return false;
    return true;
  }

  // Районы кнопками (09.11): можно выбрать несколько; число — сколько объектов в районе с учётом архива.
  function renderAreaChips() {
    const box = $('area-chips');
    if (!box) return;
    const inArchive = ($('filter-archive') && $('filter-archive').value) === 'yes';
    const counts = new Map();
    for (const p of properties) {
      if (!!getPropertyToggle(p).archived !== inArchive) continue;
      const a = p.area || '∅';
      counts.set(a, (counts.get(a) || 0) + 1);
    }
    for (const a of areaSet) if (!counts.has(a)) counts.set(a, 0);
    box.replaceChildren();
    const all = el('button', 'area-chip', 'Все районы');
    all.type = 'button';
    all.setAttribute('aria-pressed', String(!areaSet.size));
    all.addEventListener('click', () => { areaSet.clear(); render(); });
    box.append(all);
    for (const [a, n] of [...counts].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))) {
      const b = el('button', 'area-chip', a === '∅' ? 'Район не указан' : a);
      b.type = 'button';
      b.append(el('span', 'n', String(n)));
      b.setAttribute('aria-pressed', String(areaSet.has(a)));
      b.addEventListener('click', () => { if (areaSet.has(a)) areaSet.delete(a); else areaSet.add(a); render(); });
      box.append(b);
    }
  }

  function baseFilter() {
    const query = $('search').value.trim().toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean);
    const area = $('area').value;
    const agent = $('agent').value;
    const beds = Number($('beds').value) || 0;
    const viewedFilter = $('filter-viewed').value;
    const rentFilter = $('filter-rent').value;
    const topFilter = $('filter-top').value;
    const priceFilter = $('filter-price').value;
    const ceilingFilter = $('filter-ceiling').value;
    const waterFilter = $('filter-water').value;
    const dhFilter = $('filter-double-height').value;
    const poolFilter = $('filter-pool').value;
    const withComments = $('with-comments').checked;

    return properties.filter((property) => {
      if (state.onlyNew && !isRecentArthur(property)) return false;
      if (!query.every((word) => property.search.includes(word))) return false;
      if (area && (property.area || '∅') !== area) return false;
      if (areaSet.size && !areaSet.has(property.area || '∅')) return false;
      if (agent && (property.agent || '∅') !== agent) return false;
      if (beds && (number(property.bedrooms) || 0) < beds) return false;
      if (withComments && commentCount(property) === 0) return false;

      const tState = getPropertyToggle(property);
      if (viewedFilter === 'yes' && !tState.viewed) return false;
      if (viewedFilter === 'no' && tState.viewed) return false;
      if (rentFilter === 'yes' && !tState.rent) return false;
      if (rentFilter === 'no' && tState.rent) return false;
      if (topFilter === 'yes' && !tState.top) return false;
      if (topFilter === 'no' && tState.top) return false;

      if (!matchesPriceFilter(property, priceFilter)) return false;
      if (!matchesCeilingFilter(property, ceilingFilter)) return false;
      if (!matchesWaterFilter(property, waterFilter)) return false;
      if (!matchesDoubleHeightFilter(property, dhFilter)) return false;
      if (!matchesPoolFilter(property, poolFilter)) return false;
      if (!matchesExtraFilters(property)) return false;
      // Архив скрыт из общей выборки; виден только с фильтром «В архиве».
      if ((($('filter-archive') && $('filter-archive').value) === 'yes') !== !!tState.archived) return false;
      if ($('filter-criteria') && !matchesCriteriaFilter(property, $('filter-criteria').value)) return false;
      return true;
    });
  }

  const sorters = {
    'price-asc': (p) => p.price === null ? null : p.price,
    'price-desc': (p) => p.price === null ? null : -p.price,
    'ceiling-desc': (p) => -(p.ceilingMaxM * 10 + p.ceilingHeightM),
    'plot-desc': (p) => number(p.plotM2) === null ? null : -p.plotM2,
    'bua-desc': (p) => number(p.buaM2) === null ? null : -p.buaM2,
    'beds-desc': (p) => number(p.bedrooms) === null ? null : -p.bedrooms,
    'media-desc': (p) => -p.media.length,
    'match-desc': (p) => { const s = criteriaScore(p); return -(s.yes * 10 - s.no * 15); },
    'votes-desc': (p) => -voteScore(p),
    'market-asc': (p) => { const i = marketInfo(p); return i ? i.diff : null; },
    'origin-asc': (p) => p.originMin
  };

  const FILTER_SELECT_IDS = [
    'area', 'filter-top', 'filter-viewed', 'filter-rent', 'filter-price',
    'filter-ceiling', 'filter-water', 'filter-double-height',
    'filter-pool', 'filter-archive', 'filter-new', 'filter-style', 'filter-furnished', 'filter-construction', 'agent', 'beds'
  ];

  // ===== Данные из открытых источников (enrich.js): критерии, рынок, карта, дорога, голоса, сравнение, просмотры =====
  const enrich = object(window.VILLA_ENRICH) ? window.VILLA_ENRICH : {};
  const enrichProps = object(enrich.properties) ? enrich.properties : {};
  const CATEGORY_LABELS = { living: 'Зал', facade: 'Фасад', kitchen: 'Кухня', bedroom: 'Спальни', bathroom: 'Ванные', garden: 'Сад', pool: 'Бассейн', view: 'Вид', plan: 'Планы', render: 'Рендеры', other: 'Другое' };
  const CRITERIA = [
    ['detached', 'Отдельная'], ['doubleHeight', '2-й свет'], ['view', 'Вид'], ['ceiling', 'Потолки 2,6+'],
    ['noNeighborView', 'Не в соседа'], ['noConstruction', 'Без стройки'], ['plot', 'Участок'], ['condition', 'Новая/ремонт']
  ];
  const CRIT_MARK = { yes: '✓', no: '✗', unknown: '?' };
  const BUDGET_AED = 1000000;
  const VOTE_PREFIX = 'vote:';
  const SEEN_SLOT = 'dubai-villas.seen.v1';
  const SEEN_RESET_SLOT = 'dubai-villas.seen-reset.v1';
  const COMPARE_SLOT = 'dubai-villas.compare.v1';
  const ORIGIN_SLOT = 'dubai-villas.origin.v1';
  const ORIGIN_TIMES_SLOT = 'dubai-villas.origin-times.v1';
  const STATUS_COLORS = { selected: '#3f7a40', review: '#c79a35', rejected: '#a85a41', unavailable: '#8d8f88', historical: '#8d8f88' };
  const NEARBY_LABELS = [['golf', 'Гольф-поле'], ['water', 'Вода / озеро'], ['park', 'Парк'], ['supermarket', 'Супермаркет'], ['highway', 'Крупная трасса'], ['construction', 'Стройка (OSM)']];
  const destinations = Array.isArray(enrich.destinations) ? enrich.destinations.filter((d) => object(d) && text(d.key)) : [];
  const voteWidgets = new Set();
  let compareIds = [];
  let origin = null;
  let pickingOrigin = false;
  let catalogMap = null;
  let catalogLayer = null;

  for (const property of properties) {
    const extra = object(enrichProps[property.id]) ? enrichProps[property.id] : {};
    property.geo = object(extra.geo) && Number.isFinite(extra.geo.lat) && Number.isFinite(extra.geo.lng) ? extra.geo : null;
    property.market = object(extra.market) && Number.isFinite(extra.market.median) ? extra.market : null;
    property.nearby = object(extra.nearby) ? extra.nearby : null;
    property.satellite = object(extra.satellite) ? extra.satellite : null;
    if (property.geo) property.mapUrl = `https://www.google.com/maps/search/?api=1&query=${property.geo.lat},${property.geo.lng}`;
    property.drive = object(extra.drive) ? extra.drive : null;
    property.listing = object(extra.listing) ? extra.listing : null;
    property.criteria = object(extra.criteria) ? extra.criteria : null;
    property.viewings = (Array.isArray(extra.viewings) ? extra.viewings : []).filter((v) => object(v) && Number.isFinite(Date.parse(v.at)));
    property.houseType = text(extra.houseType);
    property.typeNote = text(extra.typeNote);
    property.originMin = null;
    applyCeilingResearch(property, extra.ceilings);
    const photos = object(extra.photos) ? extra.photos : {};
    property.media = property.media.map((item) => {
      const info = photos[item.type === 'video' ? item.poster : item.src];
      return object(info) ? { ...item, cat: text(info.cat), dh: !!info.dh, best: !!info.best } : item;
    });
    const best = property.media.findIndex((item) => item.best && item.type !== 'video');
    if (best > 0) property.media.unshift(...property.media.splice(best, 1));
    const listing = property.listing;
    if (listing) {
      if (number(property.buaM2) === null && number(listing.buaM2)) { property.buaM2 = listing.buaM2; property.buaSource = 'по объявлению PF'; }
      if (number(property.plotM2) === null && number(listing.plotM2) && listing.plotM2 !== listing.buaM2) { property.plotM2 = listing.plotM2; property.plotSource = 'по объявлению PF'; }
      if (number(property.bedrooms) === null && /^\d+$/.test(String(listing.bedrooms || ''))) property.bedrooms = Number(listing.bedrooms);
      if (number(property.bathrooms) === null && /^\d+$/.test(String(listing.bathrooms || ''))) property.bathrooms = Number(listing.bathrooms);
    }
    property.search += ` ${[property.houseType, property.typeNote].filter(Boolean).join(' ').toLocaleLowerCase('ru-RU')}`;
  }

  function applyCeilingResearch(property, c) {
    if (!object(c)) return;
    const range = (r) => (Array.isArray(r) && r.length === 2 ? `${r[0].toFixed(1).replace('.', ',')}–${r[1].toFixed(1).replace('.', ',')} м` : '');
    const mid = (r) => (Array.isArray(r) && r.length === 2 ? Math.round(((r[0] + r[1]) / 2) * 100) / 100 : null);
    const num = (v) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '');
    property.ceilTypical = Number.isFinite(c.typicalBest) ? c.typicalBest : mid(c.typical);
    property.ceilLiving = Number.isFinite(c.livingBest) ? c.livingBest : (mid(c.living) || property.ceilTypical);
    property.ceilDh = Array.isArray(c.dhHeight) ? mid(c.dhHeight) : null;
    property.ceilAnalog = !!c.analog;
    const parts = [];
    if (property.ceilTypical) parts.push(`комнаты ≈${num(property.ceilTypical)} м${range(c.typical) ? ` (${range(c.typical)})` : ''}`);
    if (property.ceilLiving && c.dh !== 'yes' && c.dh !== 'hall' && property.ceilLiving !== property.ceilTypical) parts.push(`гостиная ≈${num(property.ceilLiving)} м`);
    property.ceiling = (parts.join(' · ') || 'нет данных') + (c.analog ? ' · по аналогам' : '');
    property.ceilingHeightM = property.ceilTypical || 0;
    property.ceilingMaxM = Math.max(0, ...[c.typical, c.living, c.dhHeight].filter(Array.isArray).map((r) => r[1]));
    const dh = range(c.dhHeight) ? ` ~${range(c.dhHeight)}` : '';
    const labels = { yes: `Двусветная гостиная${dh}`, hall: `Двусветный зал-холл${dh}`, foyer: `Двусвет только у лестницы/входа${dh}`, vaulted: `Высокий скатный потолок в гостиной${dh}`, no: 'Без второго света', unknown: 'Второй свет: не установлено' };
    property.doubleHeight = c.dh === 'hall' ? 'yes' : (['yes', 'foyer', 'vaulted', 'no', 'unknown'].includes(c.dh) ? c.dh : 'unknown');
    property.doubleHeightLabel = labels[c.dh] || labels.unknown;
    const conf = { high: 'высокая', medium: 'средняя', low: 'низкая' }[c.confidence] || 'низкая';
    property.ceilingEstimateNote = `${text(c.note)} Основание: ${text(c.basis)}. Уверенность: ${conf}.`;
    property.ceilingSources = strings(c.sources);
    property.ceilingConfidence = conf;
    property.search += ` ${property.ceiling} ${property.doubleHeightLabel}`.toLocaleLowerCase('ru-RU');
    const crit = property.criteria = object(property.criteria) ? { ...property.criteria } : {};
    if (Array.isArray(c.typical) && c.typical[0] >= 2.6) crit.ceiling = ['yes', `оценка по фото ~${range(c.typical)}`];
    if (c.dh === 'yes' || c.dh === 'hall') crit.doubleHeight = ['yes', property.doubleHeightLabel];
    else if (c.dh === 'foyer' || c.dh === 'no' || c.dh === 'vaulted') crit.doubleHeight = ['no', { foyer: 'двусвет только у лестницы/входа, зал одноэтажный', vaulted: 'высокий скатный потолок, но не второй свет' }[c.dh] || 'по фото двусвета нет'];
  }

  statusTabs.splice(1, 0, ['top', '🔥 ТОП']);
  statusTabs.push(['changed', 'Новое']);
  FILTER_SELECT_IDS.push('filter-criteria');

  // --- Критерии пользователя ---
  function criteriaList(property) {
    const list = CRITERIA.map(([key, label]) => {
      const raw = property.criteria && Array.isArray(property.criteria[key]) ? property.criteria[key] : null;
      const v = raw && ['yes', 'no', 'unknown'].includes(raw[0]) ? raw[0] : 'unknown';
      return { key, label, v, note: raw && text(raw[1]) ? text(raw[1]) : 'Нет данных' };
    });
    list.push({ key: 'budget', label: 'Бюджет', v: property.price === null ? 'unknown' : (property.price <= BUDGET_AED ? 'yes' : 'no'), note: property.price === null ? 'Цена не подтверждена' : `Лимит ${format.format(BUDGET_AED)} AED в год ($160 тыс.)` });
    return list;
  }

  function criteriaScore(property) {
    const list = criteriaList(property);
    return { list, yes: list.filter((c) => c.v === 'yes').length, no: list.filter((c) => c.v === 'no').length, total: list.length };
  }

  function criteriaRow(property) {
    const { list, yes, no, total } = criteriaScore(property);
    const row = el('div', 'crit-row');
    row.setAttribute('aria-label', `Критерии: подходит ${yes} из ${total}, не подходит ${no}`);
    const score = el('span', `crit-score${no ? ' has-no' : ''}`, `${yes}/${total}`);
    score.title = `Подходит ${yes} из ${total}, не подходит ${no}, неизвестно ${total - yes - no}`;
    row.append(score);
    for (const c of list) {
      if (c.v === 'unknown') continue;
      const chip = el('span', `crit crit-${c.v}`, `${CRIT_MARK[c.v]} ${c.label}`);
      chip.title = c.note;
      row.append(chip);
    }
    const unknown = list.filter((c) => c.v === 'unknown');
    if (unknown.length) {
      const more = el('span', 'crit-more', `? ${unknown.length}`);
      more.title = `Неизвестно: ${unknown.map((c) => c.label).join(', ')}`;
      row.append(more);
    }
    return row;
  }

  function matchesCriteriaFilter(property, value) {
    if (!value) return true;
    const { yes, no } = criteriaScore(property);
    if (value === 'no-fails') return no === 0;
    if (value === 'strong') return no === 0 && yes >= 6;
    return true;
  }

  // --- Рынок аренды ---
  function marketInfo(property) {
    const m = property.market;
    if (!m || property.price === null) return null;
    return { ...m, diff: Math.round((property.price / m.median - 1) * 100) };
  }

  function marketBadge(property) {
    const info = marketInfo(property);
    if (!info) return document.createTextNode('');
    const kind = info.diff <= -3 ? 'below' : (info.diff >= 3 ? 'above' : 'even');
    const label = kind === 'even' ? 'На уровне рынка' : `${info.diff > 0 ? '+' : '−'}${Math.abs(info.diff)}% к рынку`;
    const badge = el('p', `market-badge market-${kind}`, label);
    badge.title = `Медиана ${format.format(info.median)} AED по ${info.n} объявлениям Property Finder (${info.scope}${info.bedrooms ? `, ${info.bedrooms} спален` : ''})`;
    return badge;
  }

  function marketCard(property) {
    const card = el('div', 'aside-card market-card');
    const m = property.market;
    card.append(el('p', 'aside-label', 'Рынок аренды'));
    if (!m) {
      card.append(el('p', 'aside-note', 'Сопоставимых объявлений не нашлось.'));
      return card;
    }
    card.append(el('p', 'market-median', `Медиана ${format.format(m.median)} AED`), el('p', 'aside-note', `${m.n} объявлений · ${m.scope}${m.bedrooms ? ` · ${m.bedrooms} спален` : ' · все спальни'}`));
    const info = marketInfo(property);
    if (info) {
      const lo = Math.min(m.p25, property.price) * 0.94;
      const hi = Math.max(m.p75, property.price) * 1.06;
      const pos = (v) => `${(((v - lo) / (hi - lo)) * 100).toFixed(1)}%`;
      const bar = el('div', 'market-bar');
      bar.setAttribute('aria-hidden', 'true');
      const range = el('span', 'market-range');
      range.style.left = pos(m.p25);
      range.style.width = `calc(${pos(m.p75)} - ${pos(m.p25)})`;
      const median = el('span', 'market-med');
      median.style.left = pos(m.median);
      const mine = el('span', 'market-me');
      mine.style.left = pos(property.price);
      bar.append(range, median, mine);
      card.append(bar, el('p', 'aside-note', `Средняя половина объявлений: ${format.format(m.p25)}–${format.format(m.p75)} AED. Эта вилла: ${info.diff > 0 ? '+' : (info.diff < 0 ? '−' : '')}${Math.abs(info.diff)}% к медиане.`));
    }
    const contracts = property.listing && Array.isArray(property.listing.contracts) ? property.listing.contracts.filter(object) : [];
    if (contracts.length) {
      card.append(el('p', 'aside-label market-contracts-title', 'Договоры аренды похожих домов'));
      const list = el('ul', 'market-contracts');
      for (const c of contracts.slice(0, 6)) {
        const date = Number.isFinite(Date.parse(c.date)) ? new Date(c.date).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }) : '';
        list.append(el('li', '', `${date} — ${format.format(c.aed)} AED${number(c.m2) ? ` · ${format.format(c.m2)} м²` : ''}`));
      }
      card.append(list, el('p', 'aside-note', 'Зарегистрированные договоры (DLD) из объявления Property Finder.'));
    }
    card.append(el('p', 'aside-note', `Источник: ${text(m.source) || 'объявления Property Finder'}. Это цены объявлений, не сделок.`));
    return card;
  }

  // --- Голоса семьи (хранятся в той же общей ленте, что и комментарии) ---
  function getVotes(property) {
    const key = `${VOTE_PREFIX}${property.id}`;
    if (!own(sharedComments, key)) return [];
    return Object.values(sharedComments[key]).filter((entry) => entry && !entry.deleted && (entry.text === '+1' || entry.text === '-1'));
  }

  function myVote(property) {
    const mine = getVotes(property).find((entry) => entry.id === clientId);
    return mine ? (mine.text === '+1' ? 1 : -1) : 0;
  }

  function voteScore(property) {
    return getVotes(property).reduce((sum, entry) => sum + (entry.text === '+1' ? 1 : -1), 0);
  }

  function setVote(property, value) {
    const key = `${VOTE_PREFIX}${property.id}`;
    const next = myVote(property) === value ? 0 : value;
    mergeSharedEntry(key, { id: clientId, author: currentAuthor(), text: next ? (next > 0 ? '+1' : '-1') : '', updatedAt: Date.now(), clientId, deleted: !next });
    saveSharedToLocal();
    updateVoteWidgets();
    scheduleCloudPublish(key, clientId, true);
  }

  function fillVoteWidget(widget) {
    const votes = getVotes(widget.property);
    const ups = votes.filter((entry) => entry.text === '+1');
    const downs = votes.filter((entry) => entry.text === '-1');
    const mine = myVote(widget.property);
    widget.up.textContent = `👍 ${ups.length}`;
    widget.down.textContent = `👎 ${downs.length}`;
    widget.up.setAttribute('aria-pressed', String(mine > 0));
    widget.down.setAttribute('aria-pressed', String(mine < 0));
    widget.up.title = ups.length ? `За: ${ups.map((entry) => entry.author).join(', ')}` : 'Нравится';
    widget.down.title = downs.length ? `Против: ${downs.map((entry) => entry.author).join(', ')}` : 'Не нравится';
    widget.up.setAttribute('aria-label', `Нравится, голосов: ${ups.length}`);
    widget.down.setAttribute('aria-label', `Не нравится, голосов: ${downs.length}`);
  }

  function voteWidget(property) {
    const root = el('div', 'votes');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', `Голоса: ${property.title}`);
    const up = el('button', 'vote vote-up');
    const down = el('button', 'vote vote-down');
    up.type = down.type = 'button';
    up.addEventListener('click', (event) => { event.stopPropagation(); setVote(property, 1); });
    down.addEventListener('click', (event) => { event.stopPropagation(); setVote(property, -1); });
    root.append(up, down);
    const widget = { property, root, up, down };
    fillVoteWidget(widget);
    voteWidgets.add(widget);
    return root;
  }

  function updateVoteWidgets() {
    for (const widget of voteWidgets) {
      if (!widget.root.isConnected) { voteWidgets.delete(widget); continue; }
      fillVoteWidget(widget);
    }
  }

  // --- Новое и изменившееся с прошлого визита ---
  const changeSignature = (p) => [p.status, p.statusLabel, p.price, p.media.length].join('|');
  let seenMap = null;
  if (!standalone) {
    try { seenMap = JSON.parse(localStorage.getItem(SEEN_SLOT) || 'null'); } catch { seenMap = null; }
    if (!object(seenMap)) {
      seenMap = {};
      for (const p of properties) seenMap[p.id] = changeSignature(p);
      try { localStorage.setItem(SEEN_SLOT, JSON.stringify(seenMap)); } catch {}
    }
    // Разовый сброс «Нового» по просьбе владельца: всё, кроме newReset.keep, считается просмотренным.
    const reset = object(catalog.newReset) ? catalog.newReset : null;
    let resetDone = '';
    try { resetDone = localStorage.getItem(SEEN_RESET_SLOT) || ''; } catch {}
    if (reset && text(reset.id) && resetDone !== text(reset.id)) {
      const keep = new Set(strings(reset.keep));
      for (const p of properties) {
        if (keep.has(p.id)) delete seenMap[p.id];
        else seenMap[p.id] = changeSignature(p);
      }
      try { localStorage.setItem(SEEN_SLOT, JSON.stringify(seenMap)); localStorage.setItem(SEEN_RESET_SLOT, text(reset.id)); } catch {}
    }
    for (const p of properties) {
      if (!own(seenMap, p.id)) { p.change = 'new'; continue; }
      if (seenMap[p.id] === changeSignature(p)) { p.change = null; continue; }
      const [status, label, price, mediaCount] = String(seenMap[p.id]).split('|');
      const parts = [];
      if (status !== p.status || label !== p.statusLabel) parts.push('статус');
      if (price !== String(p.price)) parts.push('цена');
      if (mediaCount !== String(p.media.length)) parts.push('фото');
      p.change = 'changed';
      p.changeNote = parts.join(', ');
    }
  }

  function changeBadge(property) {
    if (!property.change) return document.createTextNode('');
    const badge = el('span', 'badge change-badge', property.change === 'new' ? 'Новое' : `Изменилось${property.changeNote ? `: ${property.changeNote}` : ''}`);
    badge.dataset.changeFor = property.id;
    return badge;
  }

  function markSeen(property) {
    if (!seenMap || !property.change) return;
    seenMap[property.id] = changeSignature(property);
    property.change = null;
    try { localStorage.setItem(SEEN_SLOT, JSON.stringify(seenMap)); } catch {}
    document.querySelectorAll(`[data-change-for="${CSS.escape(property.id)}"]`).forEach((node) => node.remove());
    renderChangesNotice();
  }

  function renderChangesNotice() {
    const box = $('changes-notice');
    if (!box) return;
    const fresh = properties.filter((p) => p.change === 'new').length;
    const changed = properties.filter((p) => p.change === 'changed').length;
    box.hidden = standalone || !(fresh + changed);
    if (box.hidden) return;
    box.replaceChildren(el('span', '', `С вашего прошлого визита: ${[fresh ? `новых ${fresh}` : '', changed ? `изменилось ${changed}` : ''].filter(Boolean).join(', ')}.`));
    const show = el('button', 'text-button', 'Показать');
    show.type = 'button';
    show.addEventListener('click', () => { state.status = 'changed'; render(); $('catalog').scrollIntoView({ block: 'start' }); });
    const clear = el('button', 'text-button', 'Отметить всё просмотренным');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      for (const p of properties) { seenMap[p.id] = changeSignature(p); p.change = null; }
      try { localStorage.setItem(SEEN_SLOT, JSON.stringify(seenMap)); } catch {}
      if (state.status === 'changed') state.status = '';
      render();
    });
    box.append(show, clear);
  }

  // --- Сравнение ---
  try {
    const saved = JSON.parse(localStorage.getItem(COMPARE_SLOT) || '[]');
    if (Array.isArray(saved)) compareIds = saved.filter((id) => properties.some((p) => p.id === id)).slice(0, 4);
  } catch {}

  function saveCompare() {
    try { localStorage.setItem(COMPARE_SLOT, JSON.stringify(compareIds)); } catch {}
    updateCompareUI();
  }

  function toggleCompare(property) {
    if (compareIds.includes(property.id)) compareIds = compareIds.filter((id) => id !== property.id);
    else if (compareIds.length >= 4) { notify('Сравнивать можно до 4 вилл. Уберите одну из сравнения.'); return; }
    else compareIds.push(property.id);
    saveCompare();
  }

  function compareToggle(property) {
    const button = el('button', 'compare-toggle');
    button.type = 'button';
    button.dataset.compareFor = property.id;
    button.addEventListener('click', (event) => { event.stopPropagation(); toggleCompare(property); });
    fillCompareToggle(button);
    return button;
  }

  function fillCompareToggle(button) {
    const on = compareIds.includes(button.dataset.compareFor);
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? '✓ В сравнении' : '⇄ Сравнить';
  }

  function updateCompareUI() {
    document.querySelectorAll('[data-compare-for]').forEach(fillCompareToggle);
    const tray = $('compare-tray');
    if (!tray) return;
    tray.hidden = standalone || compareIds.length === 0;
    $('compare-count').textContent = `Сравнение: ${compareIds.length} из 4`;
    $('compare-open').disabled = compareIds.length < 2;
  }

  function driveText(property, key) {
    const d = property.drive && object(property.drive[key]) ? property.drive[key] : null;
    return d ? `${property.geo && roughPoint(property.geo) ? '≈' : ''}${d.min} мин · ${format.format(d.km)} км` : '—';
  }

  function openCompare() {
    const list = compareIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean);
    if (list.length < 2) return;
    const table = el('table', 'compare-table');
    const head = el('tr');
    head.append(el('th', 'compare-corner', ''));
    for (const p of list) {
      const th = el('th');
      const thumb = el('button', 'compare-thumb');
      thumb.type = 'button';
      thumb.append(p.media[0] ? mediaPreview(p.media[0], '', true, true) : media('', ''));
      thumb.addEventListener('click', () => { $('compare-dialog').close(); openDetail(p, null); });
      const remove = el('button', 'compare-remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Убрать из сравнения: ${p.title}`);
      remove.addEventListener('click', () => { toggleCompare(p); if (compareIds.length < 2) $('compare-dialog').close(); else openCompare(); });
      th.append(thumb, el('span', 'compare-title', p.title), remove);
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const body = el('tbody');
    const yesNo = (c) => `${CRIT_MARK[c.v]} ${c.note}`;
    const rows = [
      ['Статус', (p) => statusText(p)],
      ['Цена', (p) => p.price === null ? (p.priceLabel || 'Цена не указана') : `${format.format(p.price)} AED · ${usdLabel(p.price).replace(' в год', '')}`],
      ['К рынку', (p) => { const i = marketInfo(p); return i ? `${i.diff > 0 ? '+' : (i.diff < 0 ? '−' : '')}${Math.abs(i.diff)}% (медиана ${format.format(i.median)})` : '—'; }],
      ['Район', (p) => p.area || '—'],
      ['Спальни', (p) => number(p.bedrooms) === null ? '—' : format.format(p.bedrooms)],
      ['Санузлы', (p) => number(p.bathrooms) === null ? '—' : format.format(p.bathrooms)],
      ['Участок', (p) => number(p.plotM2) === null ? '—' : `${format.format(p.plotM2)} м²`],
      ['Дом', (p) => number(p.buaM2) === null ? '—' : `${format.format(p.buaM2)} м²`],
      ['Потолки', (p) => p.ceiling || (p.ceilingHeightM ? `~${p.ceilingHeightM} м` : '—')],
      ['Второй свет', (p) => p.doubleHeightLabel || '—'],
      ['Вид', (p) => p.waterViewLabel || '—'],
      ['Бассейн', (p) => p.poolLabel || '—'],
      ...CRITERIA.map(([key, label]) => [`Критерий: ${label}`, (p) => yesNo(criteriaList(p).find((c) => c.key === key))]),
      ['Критерии итого', (p) => { const s = criteriaScore(p); return `${s.yes} из ${s.total} ✓, ${s.no} ✗`; }],
      ...destinations.map((d) => [`До ${d.name}`, (p) => driveText(p, d.key)]),
      ['До моей точки', (p) => p.originMin === null ? '—' : `${p.originMin} мин`],
      ['Голоса', (p) => { const v = getVotes(p); return `👍 ${v.filter((e) => e.text === '+1').length} · 👎 ${v.filter((e) => e.text === '-1').length}`; }],
      ['Отметки', (p) => { const t = getPropertyToggle(p); return [t.top ? '🔥 Топ' : '', t.viewed ? '✓ Смотрели' : 'Не смотрели', t.rent ? '★ Снимаем' : ''].filter(Boolean).join(' · '); }],
      ['Брокер', (p) => p.agent || '—']
    ];
    for (const [label, value] of rows) {
      const tr = el('tr');
      tr.append(el('th', '', label));
      for (const p of list) tr.append(el('td', /^✗/.test(value(p)) ? 'is-no' : (/^✓/.test(value(p)) ? 'is-yes' : ''), value(p)));
      body.append(tr);
    }
    table.append(thead, body);
    $('compare-content').replaceChildren(table);
    if (!$('compare-dialog').open) $('compare-dialog').showModal();
    syncDialogScroll();
  }

  // --- Дорога и «моя точка» ---
  function driveLine(property) {
    if (!property.drive && property.originMin === null) return document.createTextNode('');
    const parts = [];
    if (property.originMin !== null) parts.push(`моя точка ${property.originMin} мин`);
    for (const key of ['marina', 'dxb']) {
      const d = property.drive && object(property.drive[key]) ? property.drive[key] : null;
      const name = (destinations.find((x) => x.key === key) || {}).name || key;
      if (d) parts.push(`${name} ${d.min} мин`);
    }
    const line = el('p', 'drive-line', `🚗 ${property.geo && roughPoint(property.geo) ? '≈ ' : ''}${parts.join(' · ')}`);
    line.title = 'На машине без пробок (OSRM). «≈» — от центра района, точный адрес неизвестен.';
    return line;
  }

  function originKey(o) { return o ? `${o.lat.toFixed(4)},${o.lng.toFixed(4)}` : ''; }

  function applyOriginTimes(times) {
    for (const p of properties) p.originMin = object(times) && Number.isFinite(times[p.id]) ? times[p.id] : null;
  }

  async function computeOriginTimes() {
    if (!origin) { applyOriginTimes(null); return; }
    const pts = properties.filter((p) => p.geo);
    try {
      const cached = JSON.parse(localStorage.getItem(ORIGIN_TIMES_SLOT) || 'null');
      if (object(cached) && cached.key === originKey(origin) && cached.n === pts.length) { applyOriginTimes(cached.times); return; }
    } catch {}
    const coords = [`${origin.lng.toFixed(6)},${origin.lat.toFixed(6)}`, ...pts.map((p) => `${p.geo.lng.toFixed(6)},${p.geo.lat.toFixed(6)}`)].join(';');
    try {
      const resp = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration`);
      const data = await resp.json();
      if (data.code !== 'Ok') throw new Error(data.code);
      const times = {};
      pts.forEach((p, i) => { const sec = data.durations[0][i + 1]; if (Number.isFinite(sec)) times[p.id] = Math.round(sec / 60); });
      applyOriginTimes(times);
      try { localStorage.setItem(ORIGIN_TIMES_SLOT, JSON.stringify({ key: originKey(origin), n: pts.length, times })); } catch {}
    } catch {
      notify('Не удалось посчитать время до вашей точки: сервис маршрутов не ответил. Попробуйте позже.', true);
    }
  }

  function updateOriginControls() {
    if (!$('origin-status')) return;
    $('pick-origin').textContent = pickingOrigin ? 'Кликните по карте…' : (origin ? 'Сменить мою точку' : 'Задать мою точку');
    $('pick-origin').setAttribute('aria-pressed', String(pickingOrigin));
    $('clear-origin').hidden = !origin;
    $('origin-status').textContent = origin ? 'Время до вашей точки — на карточках и в сравнении. Точка хранится только в этом браузере.' : 'Отметьте свой дом или офис — посчитаем время в пути до каждой виллы. Точка хранится только в этом браузере.';
  }

  // --- Карта ---
  function leafletReady() { return typeof window.L === 'object' && window.L && typeof window.L.map === 'function'; }

  function baseLayers() {
    return {
      'Схема': window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }),
      'Спутник': window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Снимки © Esri' })
    };
  }

  function popupNode(property) {
    const box = el('div', 'map-popup');
    if (property.media[0]) box.append(mediaPreview(property.media[0], '', true, true));
    box.append(el('strong', '', property.title), el('span', '', property.price === null ? (property.priceLabel || 'Цена не указана') : `${format.format(property.price)} AED / год`), el('span', 'muted', `${statusText(property)} · ${property.geo.source}`));
    const open = el('button', 'button', 'Открыть');
    open.type = 'button';
    open.addEventListener('click', () => openDetail(property, null));
    box.append(open);
    return box;
  }

  function renderMapView(list) {
    const box = $('map-view');
    if (!box) return;
    const on = state.view === 'map';
    box.hidden = !on;
    $('property-grid').hidden = on;
    if (!on) return;
    updateOriginControls();
    const canvas = $('catalog-map');
    if (!leafletReady()) { canvas.textContent = 'Карта не загрузилась: нужен доступ в интернет.'; return; }
    if (!catalogMap) {
      catalogMap = window.L.map(canvas, { scrollWheelZoom: true });
      const layers = baseLayers();
      layers['Схема'].addTo(catalogMap);
      window.L.control.layers(layers).addTo(catalogMap);
      catalogLayer = window.L.layerGroup().addTo(catalogMap);
      catalogMap.on('click', async (event) => {
        if (!pickingOrigin) return;
        pickingOrigin = false;
        origin = { lat: event.latlng.lat, lng: event.latlng.lng };
        try { localStorage.setItem(ORIGIN_SLOT, JSON.stringify(origin)); } catch {}
        updateOriginControls();
        await computeOriginTimes();
        render();
      });
    }
    catalogLayer.clearLayers();
    const points = [];
    let missing = 0;
    list.forEach((p, i) => {
      if (!p.geo) { missing++; return; }
      const area = roughPoint(p.geo);
      const jitter = p.geo.precision === 'area' ? ((i % 5) - 2) * 0.0009 : 0;
      const ll = [p.geo.lat + jitter, p.geo.lng - jitter];
      const color = STATUS_COLORS[p.status] || '#8d8f88';
      const marker = window.L.circleMarker(ll, { radius: area ? 8 : 10, color: area ? color : '#ffffff', weight: 2, fillColor: color, fillOpacity: area ? 0.35 : 0.95, dashArray: area ? '3' : null });
      marker.bindTooltip(`${p.title}${p.price === null ? '' : ` · ${format.format(Math.round(p.price / 1000))} тыс.`}`);
      marker.bindPopup(() => popupNode(p), { minWidth: 220 });
      marker.addTo(catalogLayer);
      points.push(ll);
    });
    if (origin) {
      window.L.marker([origin.lat, origin.lng], { title: 'Моя точка' }).addTo(catalogLayer).bindTooltip('Моя точка');
      points.push([origin.lat, origin.lng]);
    }
    $('map-note').textContent = `${points.length - (origin ? 1 : 0)} вилл на карте${missing ? `, без координат: ${missing}` : ''}. Яркие точки — дом, въезд или объявление, бледные — центр квартала или района.`;
    setTimeout(() => {
      catalogMap.invalidateSize();
      if (points.length) catalogMap.fitBounds(points, { padding: [36, 36], maxZoom: 15 });
      else catalogMap.setView([25.1, 55.25], 11);
    }, 30);
  }

  function sunLines(lat) {
    const r = Math.PI / 180;
    const rise = (decl) => Math.acos(Math.sin(decl * r) / Math.cos(lat * r)) / r;
    const summer = rise(23.44);
    const winter = rise(-23.44);
    return [
      { az: summer, label: 'Восход летом', color: '#f2b632' }, { az: 360 - summer, label: 'Закат летом', color: '#e06a2a' },
      { az: winter, label: 'Восход зимой', color: '#f7d774' }, { az: 360 - winter, label: 'Закат зимой', color: '#c9542a' },
      { az: 180, label: 'Полдень зимой — с юга', color: '#ffe08a' }
    ];
  }

  function destPoint(lat, lng, az, meters) {
    const r = Math.PI / 180;
    return [lat + (meters * Math.cos(az * r)) / 111320, lng + (meters * Math.sin(az * r)) / (111320 * Math.cos(lat * r))];
  }

  function roughPoint(geo) { return geo.precision === 'area' || geo.precision === 'cluster' || geo.precision === 'unknown'; }

  const SAT_CHECK = {
    house_ok: 'в точке вилла, совпадающая с фото',
    house_plausible: 'в точке вилла, по снимку правдоподобна',
    house_near: 'точка рядом с домом, на улице',
    cluster_ok: 'точка в центре квартала, дом не установлен',
    entrance: 'точка у въезда в комьюнити',
    mismatch: 'в точке объявления другой дом — точное место неизвестно'
  };

  function satelliteSection(property) {
    const s = property.satellite;
    if (!s) return null;
    const sec = el('section', 'detail-section');
    sec.append(el('h3', '', `Со спутника${s.imageryDate ? ` (снимок ${s.imageryDate})` : ''}`));
    const known = (v) => (v && v !== 'неизвестно' ? v : '');
    sec.append(factRows([
      ['Проверка точки', SAT_CHECK[s.check] || s.check],
      ['Сад выходит на', known(s.gardenFacing)],
      ['Сзади', known(s.backs)],
      ['Стройка рядом', s.construction],
      ['Дороги', s.roads],
      ['Соседи', s.neighbors]
    ]));
    if (s.notes) sec.append(el('p', '', s.notes));
    if (Array.isArray(s.images) && s.images.length) {
      const shots = el('div', 'sat-shots');
      for (const shot of s.images) {
        if (!shot || typeof shot.src !== 'string') continue;
        const link = el('a', 'sat-shot');
        link.href = shot.src; link.target = '_blank'; link.rel = 'noopener';
        const img = el('img'); img.src = shot.src; img.loading = 'lazy'; img.alt = text(shot.caption) || 'Спутниковый снимок';
        link.append(img, el('span', '', text(shot.caption)));
        shots.append(link);
      }
      sec.append(shots);
    }
    if (property.geo && Number.isFinite(property.geo.lat)) {
      const ll = `${property.geo.lat.toFixed(6)},${property.geo.lng.toFixed(6)}`;
      const links = el('p', 'sat-links');
      const g = el('a', '', 'Google Maps (спутник)'); g.href = `https://www.google.com/maps/@${ll},19z/data=!3m1!1e3`; g.target = '_blank'; g.rel = 'noopener';
      const q = el('a', '', `Координаты ${ll}`); q.href = `https://www.google.com/maps/search/?api=1&query=${ll}`; q.target = '_blank'; q.rel = 'noopener';
      links.append(g, document.createTextNode(' · '), q);
      sec.append(links);
    }
    sec.append(el('p', 'aside-note', 'Разбор снимков Esri World Imagery (0,5 м). Снимок мог устареть: стройка за год могла закончиться или начаться.'));
    return sec;
  }

  function initDetailMap(property, container) {
    const box = container.querySelector('.detail-map');
    if (!box || !property.geo) return;
    if (!leafletReady()) { box.textContent = 'Карта не загрузилась: нужен доступ в интернет.'; return; }
    setTimeout(() => {
      if (!box.isConnected || box.dataset.ready) return;
      box.dataset.ready = '1';
      const { lat, lng, precision: prec } = property.geo;
      const map = window.L.map(box, { scrollWheelZoom: false });
      const layers = baseLayers();
      layers['Спутник'].addTo(map);
      window.L.control.layers(layers).addTo(map);
      map.setView([lat, lng], prec === 'area' ? 15 : (prec === 'cluster' ? 17 : 18));
      if (roughPoint(property.geo)) window.L.circle([lat, lng], { radius: prec === 'area' ? 300 : 150, color: '#f6e3b0', weight: 2, fill: false, dashArray: '5' }).addTo(map).bindTooltip(prec === 'area' ? 'Район: точный дом неизвестен' : 'Квартал: точный дом неизвестен');
      else window.L.circleMarker([lat, lng], { radius: 8, color: '#ffffff', weight: 2, fillColor: '#a85a41', fillOpacity: 1 }).addTo(map);
      if (!roughPoint(property.geo)) {
        for (const s of sunLines(lat)) {
          window.L.polyline([[lat, lng], destPoint(lat, lng, s.az, 70)], { color: s.color, weight: 4, opacity: 0.95 }).addTo(map).bindTooltip(s.label);
        }
      }
      map.invalidateSize();
    }, 80);
  }

  // --- Просмотры ---
  function formatViewing(at) {
    return new Date(at).toLocaleString('ru-RU', { timeZone: 'Asia/Dubai', weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  function dubaiDay(at) { return new Date(at).toLocaleDateString('ru-RU', { timeZone: 'Asia/Dubai' }); }

  function travelMinutes(a, b) {
    const m = enrich.matrix;
    if (!object(m) || !Array.isArray(m.ids) || !Array.isArray(m.min)) return null;
    const i = m.ids.indexOf(a.id);
    const j = m.ids.indexOf(b.id);
    return i < 0 || j < 0 ? null : m.min[i][j];
  }

  function upcomingViewings() {
    const from = Date.now() - 2 * 3600 * 1000;
    return properties.flatMap((p) => p.viewings.filter((v) => v.state !== 'cancelled' && Date.parse(v.at) >= from).map((v) => ({ p, v, t: Date.parse(v.at) }))).sort((a, b) => a.t - b.t);
  }

  function icsEscape(value) { return String(value).replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n'); }

  function icsStamp(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

  function downloadIcs(items, filename) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Villas Dubai//RU', 'CALSCALE:GREGORIAN'];
    for (const { p, v, t } of items) {
      lines.push('BEGIN:VEVENT', `UID:${p.id}-${t}@dubai-villas`, `DTSTAMP:${icsStamp(Date.now())}`, `DTSTART:${icsStamp(t)}`, `DTEND:${icsStamp(t + 45 * 60 * 1000)}`,
        `SUMMARY:${icsEscape(`Просмотр: ${p.title}`)}`, `LOCATION:${icsEscape([p.area, p.geo ? `${p.geo.lat.toFixed(5)}, ${p.geo.lng.toFixed(5)}` : ''].filter(Boolean).join(' · '))}`,
        `DESCRIPTION:${icsEscape([p.agent ? `Брокер: ${p.agent}${p.agentPhone ? ` ${formatPhone(p.agentPhone)}` : ''}` : '', text(v.note), propertyLink(p)].filter(Boolean).join('\n'))}`);
      if (p.geo) lines.push(`GEO:${p.geo.lat.toFixed(6)};${p.geo.lng.toFixed(6)}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    const link = el('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderViewings() {
    const box = $('viewings');
    if (!box) return;
    const items = upcomingViewings();
    box.hidden = standalone || !items.length;
    if (box.hidden) return;
    const head = el('div', 'viewings-head');
    head.append(el('h2', '', 'Ближайшие просмотры'));
    const all = el('button', 'button button-quiet', 'Все в календарь (.ics)');
    all.type = 'button';
    all.addEventListener('click', () => downloadIcs(items, 'villa-viewings.ics'));
    head.append(all);
    const list = el('div', 'viewings-list');
    items.forEach((item, i) => {
      const { p, v, t } = item;
      const row = el('article', 'viewing-card');
      row.append(el('p', 'viewing-time', formatViewing(t)));
      const title = el('h3', 'viewing-title');
      title.append(openButton(p.title, p, 'title-button'));
      row.append(title, el('p', 'viewing-sub', [p.area, p.agent ? `брокер ${p.agent}` : ''].filter(Boolean).join(' · ')));
      const prev = items[i - 1];
      if (prev && dubaiDay(prev.t) === dubaiDay(t)) {
        const min = travelMinutes(prev.p, p);
        if (min !== null) row.append(el('p', 'viewing-travel', `🚗 от предыдущего ≈ ${min} мин без пробок · окно ${Math.round((t - prev.t) / 60000)} мин`));
      }
      if (text(v.note)) row.append(el('p', 'viewing-note', text(v.note)));
      const ics = el('button', 'text-button', '+ в календарь');
      ics.type = 'button';
      ics.addEventListener('click', () => downloadIcs([item], `viewing-${p.id}.ics`));
      row.append(ics);
      list.append(row);
    });
    box.replaceChildren(head, list);
  }

  // --- Галерея: разделы и второй свет ---
  function galleryCategoryBar(property, buttons, show) {
    const counts = {};
    for (const item of property.media) {
      const key = item.type === 'video' ? 'video' : item.cat;
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    const dh = property.media.filter((item) => item.dh).length;
    if (Object.keys(counts).length < 2 && !dh) return document.createTextNode('');
    const bar = el('div', 'gallery-cats');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Разделы фотографий');
    const make = (key, label, count, test) => {
      const chip = el('button', 'gallery-cat', `${label} · ${count}`);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(key === ''));
      chip.addEventListener('click', () => {
        bar.querySelectorAll('.gallery-cat').forEach((node) => node.setAttribute('aria-pressed', String(node === chip)));
        let first = -1;
        buttons.forEach((button, index) => {
          const ok = test(property.media[index]);
          button.hidden = !ok;
          if (ok && first < 0) first = index;
        });
        if (first >= 0) show(first);
      });
      bar.append(chip);
    };
    make('', 'Все', property.media.length, () => true);
    if (dh) make('dh', '☀ Двусветный объём', dh, (item) => item.dh);
    if (counts.video) make('video', 'Видео', counts.video, (item) => item.type === 'video');
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      if (counts[key]) make(key, label, counts[key], (item) => item.type !== 'video' && item.cat === key);
    }
    return bar;
  }

  // --- Окно объекта: дополнительные блоки ---
  function brokerBlock(property) {
    const wa = whatsappUrl(property.agentPhone);
    const block = el('div', 'card-broker');
    block.append(el('p', 'broker-name', property.agent || 'Брокер не указан'));
    if (wa) block.append(iconLink('chat', `WhatsApp ${formatPhone(property.agentPhone)}`, wa, 'button button-wa'));
    else if (property.agent === 'Артур') block.append(el('p', 'broker-note', 'Группа в WhatsApp с Артуром · TG @Art_Real_Estate'));
    else block.append(el('p', 'broker-note', 'WhatsApp не сохранён'));
    return block;
  }

  function cardSocial(property) {
    const row = el('div', 'card-social');
    row.append(voteWidget(property), compareToggle(property));
    return row;
  }

  function criteriaCard(property) {
    const card = el('div', 'aside-card');
    const { list, yes, no, total } = criteriaScore(property);
    card.append(el('p', 'aside-label', `Ваши критерии · ${yes} из ${total} ✓${no ? ` · ${no} ✗` : ''}`));
    const ul = el('ul', 'crit-list');
    for (const c of list) {
      const li = el('li', `crit-item crit-${c.v}`);
      li.append(el('span', 'crit-mark', CRIT_MARK[c.v]), el('span', 'crit-label', c.label), el('span', 'crit-note', c.note));
      ul.append(li);
    }
    card.append(ul);
    return card;
  }

  function detailAsideExtras(property) {
    const social = el('div', 'aside-card');
    social.append(el('p', 'aside-label', 'Голоса семьи и сравнение'), cardSocial(property));
    return [social, criteriaCard(property), marketCard(property)];
  }

  function factRows(rows) {
    const dl = el('dl', 'detail-facts extra-facts');
    for (const [label, value] of rows) {
      if (value === null || value === undefined || value === '') continue;
      const row = el('div');
      const dd = el('dd');
      if (value instanceof Node) dd.append(value); else dd.textContent = value;
      row.append(el('dt', '', label), dd);
      dl.append(row);
    }
    return dl;
  }

  function detailMainExtras(property, mainCol) {
    const geoSec = el('section', 'detail-section');
    geoSec.append(el('h3', '', 'Расположение и окружение'));
    if (property.geo) {
      geoSec.append(el('div', 'detail-map'));
      const precLabels = { exact: 'точный дом', house_likely: 'вероятный дом — выбран по спутнику и фото', street: 'улица, дом не установлен', entrance: 'въезд в комьюнити', listing: 'точка из объявления', cluster: 'центр квартала — точный дом неизвестен', area: 'центр района — точный дом неизвестен' };
      geoSec.append(el('p', 'aside-note', `Точка: ${precLabels[property.geo.precision] || property.geo.precision} (${property.geo.source}).${!roughPoint(property.geo) ? ' Цветные лучи — откуда солнце: восход и закат летом и зимой, зимний полдень с юга. Летом в полдень солнце почти в зените.' : ''}`));
      if (property.nearby) {
        const rows = NEARBY_LABELS.map(([key, label]) => {
          const n = object(property.nearby[key]) ? property.nearby[key] : null;
          return [label, n ? `${n.m < 1000 ? `${format.format(n.m)} м` : `${format.format(Math.round(n.m / 100) / 10)} км`}${n.name ? ` · ${n.name}` : ''}` : (key === 'construction' ? 'нет в радиусе 1 км' : 'нет поблизости')];
        });
        geoSec.append(factRows(rows), el('p', 'aside-note', `Расстояния по OpenStreetMap${roughPoint(property.geo) ? ' от центра квартала или района' : ''}. Стройки в OSM обновляются с опозданием — проверяйте на месте и по спутнику.`));
      }
    } else {
      geoSec.append(el('p', '', 'Координат пока нет.'));
    }
    if (property.drive || property.originMin !== null) {
      const rows = destinations.map((d) => [`До ${d.name}`, driveText(property, d.key)]);
      if (property.originMin !== null) rows.unshift(['До моей точки', `${property.originMin} мин`]);
      geoSec.append(el('h4', 'detail-subhead', 'Дорога на машине без пробок'), factRows(rows));
    }
    mainCol.append(geoSec);
    const satSec = satelliteSection(property);
    if (satSec) mainCol.append(satSec);

    const listing = property.listing;
    if (listing) {
      const sec = el('section', 'detail-section');
      sec.append(el('h3', '', 'Из объявления Property Finder'));
      const yes = (v) => (v === true ? 'да' : (v === false ? 'нет' : ''));
      const furnished = { YES: 'с мебелью', NO: 'без мебели', PARTLY: 'частично' }[String(listing.furnished || '').toUpperCase()] || '';
      const date = (v) => (v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
      sec.append(factRows([
        ['Опубликовано', date(listing.listedDate)], ['Свободна с', date(listing.availableFrom)], ['Мебель', furnished],
        ['Площадь дома', number(listing.buaM2) ? `${format.format(listing.buaM2)} м²` : ''],
        ['Участок', number(listing.plotM2) && listing.plotM2 !== listing.buaM2 ? `${format.format(listing.plotM2)} м²` : ''],
        ['Ремонт (upgraded)', yes(listing.upgraded)], ['Ландшафт', yes(listing.landscaped)], ['Цену снижали', listing.priceDrop ? 'да' : ''],
        ['Объявление активно', yes(listing.available)]
      ]));
      const amenities = strings(listing.amenities);
      if (amenities.length) {
        const chips = el('div', 'amenity-chips');
        amenities.forEach((a) => chips.append(el('span', 'amenity', a)));
        sec.append(chips);
      }
      const links = el('div', 'detail-links');
      if (safeUrl(listing.permitUrl)) links.append(iconLink('doc', 'Проверить разрешение DLD', listing.permitUrl));
      strings(listing.floorPlans).map(safeUrl).filter(Boolean).forEach((url, i) => links.append(iconLink('doc', `Планировка ${i + 1}`, url)));
      if (links.childNodes.length) sec.append(links);
      mainCol.append(sec);
    }

    if (property.houseType || property.typeNote) {
      const sec = el('section', 'detail-section');
      sec.append(el('h3', '', 'Тип дома'));
      if (property.houseType) sec.append(el('p', 'house-type', property.houseType));
      if (property.typeNote) sec.append(el('p', 'description', property.typeNote));
      mainCol.append(sec);
    }

    if (property.viewings.length) {
      const sec = el('section', 'detail-section');
      sec.append(el('h3', '', 'Просмотры'));
      const ul = el('ul');
      const states = { planned: 'запланирован', done: 'прошёл', cancelled: 'отменён' };
      for (const v of property.viewings) ul.append(el('li', '', `${formatViewing(v.at)} — ${states[v.state] || v.state || 'запланирован'}${text(v.note) ? ` · ${text(v.note)}` : ''}`));
      sec.append(ul);
      const future = property.viewings.filter((v) => v.state !== 'cancelled' && Date.parse(v.at) > Date.now()).map((v) => ({ p: property, v, t: Date.parse(v.at) }));
      if (future.length) {
        const ics = el('button', 'button button-quiet', 'Добавить в календарь (.ics)');
        ics.type = 'button';
        ics.addEventListener('click', () => downloadIcs(future, `viewing-${property.id}.ics`));
        sec.append(ics);
      }
      mainCol.append(sec);
    }
  }

  // --- Офлайн ---
  function registerOffline() {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') { if ($('save-offline')) $('save-offline').hidden = true; return; }
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (object(data) && data.type === 'precache-progress') {
        notify(data.done >= data.total ? `Готово: ${data.total} файлов сохранено, каталог откроется без интернета.` : `Сохраняю для офлайна: ${data.done} из ${data.total}…`);
      }
    });
    if ($('save-offline')) $('save-offline').addEventListener('click', async () => {
      const reg = await navigator.serviceWorker.ready;
      const urls = new Set();
      for (const link of document.querySelectorAll('link[rel="stylesheet"], script[src]')) urls.add(new URL(link.href || link.src, document.baseURI).href);
      urls.add(new URL('index.html', document.baseURI).href);
      for (const p of properties.filter((x) => matchesStatus(x, 'active'))) {
        if (p.detailPage) urls.add(new URL(p.detailPage, document.baseURI).href);
        p.media.forEach((item, i) => {
          if (item.thumb) urls.add(new URL(item.thumb, document.baseURI).href);
          if (item.poster) urls.add(new URL(item.poster, document.baseURI).href);
          if (item.type !== 'video' && i < 12) urls.add(new URL(item.src, document.baseURI).href);
        });
      }
      reg.active.postMessage({ type: 'precache', urls: [...urls] });
      notify(`Сохраняю для офлайна: ${urls.size} файлов…`);
    });
  }

  function activeFilterCount() {
    let count = 0;
    for (const id of FILTER_SELECT_IDS) {
      const node = $(id);
      if (node && node.value) count++;
    }
    if (state.onlyNew) count++;
    if (areaSet.size) count++;
    if ($('with-comments').checked) count++;
    if ($('sort').value !== 'source') count++;
    return count;
  }

  function renderStatusTabs(base) {
    const tabs = $('status-tabs');
    tabs.replaceChildren();
    for (const [value, label] of statusTabs) {
      const count = base.filter((property) => matchesStatus(property, value)).length;
      if (value === 'changed' ? !count : (value && value !== 'active' && value !== 'top' && !properties.some((property) => property.status === value))) continue;
      const button = el('button', `status-tab${value ? ` tab-${value}` : ''}`);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(state.status === value));
      button.append(el('span', '', label), el('span', 'tab-count', String(count)));
      button.addEventListener('click', () => {
        state.status = value;
        if ($('status')) $('status').value = value;
        render();
      });
      tabs.append(button);
    }
  }

  function renderStats() {
    const stats = $('stats');
    if (!stats) return;
    stats.replaceChildren();
    const viewedCount = properties.filter((p) => getPropertyToggle(p).viewed).length;
    const rentCount = properties.filter((p) => getPropertyToggle(p).rent).length;
    const topCount = properties.filter((p) => getPropertyToggle(p).top).length;
    const quickTop = $('quick-top');
    if (quickTop) {
      quickTop.setAttribute('aria-pressed', String($('filter-top').value === 'yes'));
      quickTop.setAttribute('aria-label', `Только ТОП: ${topCount} объектов`);
      $('quick-top-count').textContent = String(topCount);
    }
    const quickNew = $('quick-new');
    if (quickNew) {
      const newCount = properties.filter((p) => isRecentArthur(p)).length;
      quickNew.setAttribute('aria-pressed', String(state.onlyNew));
      quickNew.setAttribute('aria-label', `Новые предложения Артура за последние 24 часа: ${newCount} объектов`);
      $('quick-new-count').textContent = String(newCount);
    }
    const quickArchive = $('quick-archive');
    if (quickArchive) {
      quickArchive.setAttribute('aria-pressed', String(!!$('filter-archive') && $('filter-archive').value === 'yes'));
      $('quick-archive-count').textContent = String(properties.filter((p) => getPropertyToggle(p).archived).length);
    }
    const quickArthur = $('quick-arthur1109');
    if (quickArthur) {
      quickArthur.setAttribute('aria-pressed', String(!!$('filter-new') && $('filter-new').value === 'arthur1109'));
      $('quick-arthur1109-count').textContent = String(properties.filter((p) => p.newBatch === 'arthur-20261109').length);
    }
    const quickBatch = $('quick-batch');
    if (quickBatch) {
      quickBatch.setAttribute('aria-pressed', String(!!$('filter-new') && $('filter-new').value === 'batch'));
      $('quick-batch-count').textContent = String(properties.filter((p) => p.newBatch === NEW_BATCH).length);
    }
    const waterCount = properties.filter((p) => p.waterView === 'yes').length;
    const dhCount = properties.filter((p) => p.doubleHeight === 'yes').length;
    const items = [
      ['Объектов', String(properties.length)],
      ['✓ Смотрели', String(viewedCount)],
      ['🔥 Топ', String(topCount)],
      ['★ Снимаем', String(rentCount)],
      ['Двусветный зал', String(dhCount)],
      ['У воды/озера', String(waterCount)]
    ];
    for (const [label, value] of items) {
      const row = el('div');
      row.append(el('dt', '', label), el('dd', '', value));
      stats.append(row);
    }
  }

  function syncUrl() {
    if (standalone) return;
    const params = new URLSearchParams();
    if ($('search').value.trim()) params.set('q', $('search').value.trim());
    if (state.status) params.set('status', state.status);
    if (state.onlyNew) params.set('new', '1');
    if (areaSet.size) params.set('areas', [...areaSet].join('|'));
    for (const id of FILTER_SELECT_IDS) {
      if ($(id) && $(id).value) params.set(id, $(id).value);
    }
    if ($('sort').value !== 'source') params.set('sort', $('sort').value);
    if ($('with-comments').checked) params.set('comments', '1');
    if (state.view !== 'grid') params.set('view', state.view);
    const query = params.toString();
    const next = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(history.state, '', next);
  }

  function readUrl() {
    const params = new URLSearchParams(location.search);
    $('search').value = params.get('q') || '';
    const status = params.get('status') || '';
    state.status = statusTabs.some(([value]) => value === status) ? status : '';
    if ($('status')) $('status').value = state.status;
    for (const id of [...FILTER_SELECT_IDS, 'sort']) {
      const node = $(id);
      const value = params.get(id);
      if (node && value && [...node.options].some((option) => option.value === value)) node.value = value;
    }
    state.onlyNew = params.get('new') === '1';
    areaSet.clear();
    for (const a of (params.get('areas') || '').split('|')) if (a) areaSet.add(a);
    $('with-comments').checked = params.get('comments') === '1';
    state.view = ['list', 'map'].includes(params.get('view')) ? params.get('view') : 'grid';
  }

  function render() {
    for (const id of [...FILTER_SELECT_IDS, 'status', 'sort']) {
      const node = $(id);
      if (node) node.classList.toggle('is-filtered', !!(node.value && node.value !== 'source'));
    }
    lastArchiveSig = archiveSig();
    renderAreaChips();
    const base = baseFilter();
    const filtered = base.filter((property) => matchesStatus(property, state.status));
    const sortKey = sorters[$('sort').value];
    if (sortKey) filtered.sort((a, b) => {
      const x = sortKey(a);
      const y = sortKey(b);
      if (x === null && y === null) return a.index - b.index;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x - y) || a.index - b.index;
    });
    visibleList = filtered;
    renderStatusTabs(base);
    renderStats();
    const grid = $('property-grid');
    grid.classList.toggle('is-list', state.view === 'list');
    grid.replaceChildren();
    for (const field of noteFields) if (!field.input.isConnected) noteFields.delete(field);
    for (const widget of toggleWidgets) if (!widget.root.isConnected) toggleWidgets.delete(widget);
    const fragment = document.createDocumentFragment();
    if (state.view === 'list' && filtered.length) fragment.append(listHeader());
    filtered.forEach((property, index) => fragment.append(state.view === 'list' ? listRow(property, index) : card(property, index)));
    grid.append(fragment);
    document.querySelectorAll('.view-toggle button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    const extra = activeFilterCount();
    $('filters-active').hidden = !extra;
    $('filters-active').textContent = String(extra);
    const filteredAny = !!($('search').value.trim() || state.status || extra);
    $('result-count').textContent = `${filtered.length} из ${properties.length}`;
    $('catalog-heading').textContent = filteredAny ? 'Результаты' : 'Все объекты';
    $('reset-filters').hidden = !filteredAny;
    $('empty-state').hidden = filtered.length !== 0;
    $('empty-title').textContent = properties.length ? 'По этим условиям ничего не найдено' : 'Предложения ещё не добавлены';
    $('empty-description').textContent = $('filter-top').value === 'yes' && !properties.some((p) => getPropertyToggle(p).top) ? 'Сначала отметьте понравившиеся виллы переключателем «ТОП» на карточках. Затем нажмите «★ ТОП», чтобы оставить только их.' : properties.length ? 'Попробуйте другой запрос или сбросьте фильтры. Архивные и отклонённые объекты тоже остаются в каталоге.' : 'Когда появятся данные, здесь будут все объекты, фотографии и точки на карте.';
    $('empty-reset').hidden = !properties.length;
    renderMapView(filtered);
    renderChangesNotice();
    updateCompareUI();
    if ($('property-dialog').open) updateDialogNav();
    syncUrl();
  }

  function resetFilters() {
    $('filters').reset();
    state.onlyNew = false;
    state.status = '';
    if ($('status')) $('status').value = '';
    render();
  }

  function openFromHash(fromHistory) {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch {}
    const property = id && properties.find((item) => item.id === id);
    if (property) {
      if (currentDetail !== property || !$('property-dialog').open) openDetail(property, null, { fromHistory });
    } else if ($('property-dialog').open) {
      pushedHash = false;
      $('property-dialog').close();
    }
  }

  $('filters').addEventListener('submit', (event) => event.preventDefault());
  $('search').addEventListener('input', render);
  if ($('quick-top')) $('quick-top').addEventListener('click', () => {
    $('filter-top').value = $('filter-top').value === 'yes' ? '' : 'yes';
    render();
  });
  if ($('quick-archive')) $('quick-archive').addEventListener('click', () => {
    if ($('filter-archive')) $('filter-archive').value = $('filter-archive').value === 'yes' ? '' : 'yes';
    render();
  });
  if ($('quick-arthur1109')) $('quick-arthur1109').addEventListener('click', () => {
    if ($('filter-new')) $('filter-new').value = $('filter-new').value === 'arthur1109' ? '' : 'arthur1109';
    render();
  });
  if ($('quick-batch')) $('quick-batch').addEventListener('click', () => {
    if ($('filter-new')) $('filter-new').value = $('filter-new').value === 'batch' ? '' : 'batch';
    render();
  });
  if ($('quick-new')) $('quick-new').addEventListener('click', () => {
    state.onlyNew = !state.onlyNew;
    render();
  });
  [...FILTER_SELECT_IDS, 'sort', 'with-comments'].forEach((id) => {
    const node = $(id);
    if (node) node.addEventListener('change', render);
  });
  if ($('status')) {
    $('status').addEventListener('change', () => {
      state.status = $('status').value;
      render();
    });
  }
  document.querySelectorAll('.view-toggle button').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
  $('filters-toggle').addEventListener('click', () => {
    const open = $('filters-toggle').getAttribute('aria-expanded') !== 'true';
    $('filters-toggle').setAttribute('aria-expanded', String(open));
    $('toolbar').classList.toggle('filters-open', open);
  });
  $('reset-filters').addEventListener('click', resetFilters);
  $('empty-reset').addEventListener('click', resetFilters);
  $('prev-property').addEventListener('click', () => stepDetail(-1));
  $('next-property').addEventListener('click', () => stepDetail(1));
  $('copy-link').addEventListener('click', async () => {
    if (!currentDetail) return;
    const url = propertyLink(currentDetail);
    try { await navigator.clipboard.writeText(url); notify('Ссылка на объект скопирована'); }
    catch { notify(`Ссылка: ${url}`); }
  });
  $('property-dialog').addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || galleryDialog) return;
    if (event.target.closest('input, textarea, select, video, [contenteditable]')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepDetail(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); stepDetail(1); }
  });
  $('close-dialog').addEventListener('click', () => $('property-dialog').close());
  $('property-dialog').addEventListener('close', () => {
    if (galleryDialog) galleryDialog.close();
    pauseVideos($('detail-content'));
    syncDialogScroll();
    $('detail-content').replaceChildren();
    currentDetail = null;
    for (const field of noteFields) if (!field.input.isConnected) noteFields.delete(field);
    for (const widget of toggleWidgets) if (!widget.root.isConnected) toggleWidgets.delete(widget);
    if (location.hash) {
      if (pushedHash) history.back();
      else history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    }
    pushedHash = false;
    const target = lastOpener && lastOpener.isConnected ? lastOpener : null;
    if (target) target.focus({ preventScroll: true });
  });
  $('property-dialog').addEventListener('click', (event) => {
    if (event.target !== $('property-dialog')) return;
    const rect = $('property-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('property-dialog').close();
  });
  window.addEventListener('popstate', () => { pushedHash = false; openFromHash(true); });
  $('to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      $('to-top').hidden = window.scrollY < 1200;
      $('toolbar').classList.toggle('is-stuck', $('toolbar').getBoundingClientRect().top <= 0.5 && window.scrollY > 0);
    });
  }, { passive: true });

  $('export-notes').addEventListener('click', () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), notes, sharedToggles };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = el('a');
    link.href = url;
    link.download = `villa-notes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify('Файл заметок и переключателей подготовлен для скачивания.');
  });

  $('import-notes').addEventListener('click', () => $('notes-file').click());
  $('notes-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const button = $('import-notes');
    button.disabled = true;
    try {
      if (!file.size || file.size > MAX_BYTES) throw new Error('Выберите непустой JSON-файл размером не более 2 МБ.');
      let payload;
      try { payload = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); }
      catch { throw new Error('Файл не удалось прочитать как JSON. Используйте файл, созданный через «Экспорт JSON».'); }
      const imported = validateNotes(payload);
      if (object(payload.sharedToggles) && mergeToggleMap(payload.sharedToggles)) {
        saveSharedToLocal();
        refreshToggleWidgets();
        scheduleCloudSync();
      }
      const merged = Object.assign(Object.create(null), notes);
      let added = 0;
      let conflicts = 0;
      for (const [id, value] of Object.entries(imported)) {
        if (!own(merged, id)) { merged[id] = value; added++; }
        else if (merged[id] !== value && !merged[id].includes(value)) {
          const combined = `${merged[id]}\n\n—— Импортированная заметка ——\n${value}`;
          if (combined.length > MAX_NOTE) throw new Error('После объединения один из комментариев превысит 20 000 символов. Импорт отменён; существующие заметки не изменены.');
          merged[id] = combined;
          conflicts++;
        }
      }
      commitNotes(merged);
      for (const [id, value] of Object.entries(merged)) {
        if (!isTestNote(value)) syncLocalNoteToShared(id, value, true);
      }
      notify(`Импорт завершён. Добавлено: ${added}; объединено: ${conflicts}.`);
    } catch (error) { notify(error.message || 'Не удалось импортировать заметки. Существующие записи не изменены.', true); }
    finally { event.target.value = ''; button.disabled = false; }
  });

  window.addEventListener('storage', (event) => {
    if ((event.key === SHARED_STORAGE_KEY || event.key === TOGGLES_STORAGE_KEY) && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (object(parsed)) {
          if (mergeSharedMap(parsed.sharedComments)) {
            refreshNoteFields();
            updateNotesCount();
          }
          if (mergeToggleMap(parsed.sharedToggles)) {
            refreshToggleWidgets();
            if ($('filter-top').value || $('filter-viewed').value || $('filter-rent').value || archiveChanged()) render();
          }
        }
      } catch {}
      return;
    }
    if ((event.key === STORAGE_KEY && event.newValue !== savedSnapshot) || event.key === null) {
      if (!savedToDevice) {
        pauseForStorageConflict();
        refreshNoteFields();
        return;
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null && Object.keys(notes).length) {
          savedToDevice = false;
          storageWarning('Хранилище браузера очищено в другой вкладке. Ваши заметки пока доступны здесь: экспортируйте их до закрытия страницы.');
        } else {
          notes = raw ? validateNotes(JSON.parse(raw)) : Object.create(null);
          savedSnapshot = raw;
          storageReadable = true;
          savedToDevice = true;
          updateNotesCount();
        }
      } catch { pauseForStorageConflict(); }
      refreshNoteFields();
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (!savedToDevice && Object.keys(notes).length) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  const updatedDate = new Date(text(catalog.updatedAt));
  if (text(catalog.updatedAt) && Number.isFinite(updatedDate.getTime())) {
    $('updated-at').dateTime = updatedDate.toISOString();
    $('updated-at').textContent = ` · обновлено ${updatedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Dubai' })}`;
    $('updated-at').hidden = false;
  }

  function initSharedState() {
    for (const prop of properties) {
      mergeToggleEntry(prop.id, {
        viewed: !!prop.viewedDefault,
        rent: !!prop.rentDefault,
        top: false,
        updatedAt: 1000,
        author: ''
      });
    }
    mergeSharedMap(INITIAL_SHARED_SEED);
    if (object(catalog.sharedComments)) mergeSharedMap(catalog.sharedComments);
    if (object(catalog.sharedToggles)) mergeToggleMap(catalog.sharedToggles);
    // Разовая отправка старых объявлений в архив (09.11): время фиксировано, поздние ручные отметки сильнее.
    if (object(catalog.archiveAll) && Number.isFinite(catalog.archiveAll.at)) {
      for (const id of strings(catalog.archiveAll.ids)) {
        const prop = properties.find((p) => p.id === id);
        if (!prop) continue;
        const cur = getPropertyToggle(prop);
        mergeToggleEntry(id, { ...cur, archived: true, updatedAt: catalog.archiveAll.at, author: 'Архив 09.11' });
      }
    }
    try {
      const savedClient = localStorage.getItem(CLIENT_STORAGE_KEY);
      if (validId(savedClient)) clientId = savedClient;
      else {
        clientId = `u_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
        localStorage.setItem(CLIENT_STORAGE_KEY, clientId);
      }
    } catch {
      clientId = `u_${Math.random().toString(36).slice(2, 10)}`;
    }
    try {
      const savedAuthor = localStorage.getItem(AUTHOR_STORAGE_KEY);
      if (typeof savedAuthor === 'string') authorName = savedAuthor.trim().slice(0, 40);
    } catch {}
    if ($('author-name')) {
      $('author-name').value = authorName;
      $('author-name').addEventListener('input', () => {
        authorName = $('author-name').value.trim().slice(0, 40);
        try { localStorage.setItem(AUTHOR_STORAGE_KEY, authorName); } catch {}
        for (const [propId, val] of Object.entries(notes)) {
          if (val && val.trim() && !isTestNote(val)) syncLocalNoteToShared(propId, val, false);
        }
      });
    }
    try {
      const rawShared = localStorage.getItem(SHARED_STORAGE_KEY);
      if (rawShared) {
        const parsed = JSON.parse(rawShared);
        if (object(parsed)) {
          mergeSharedMap(parsed.sharedComments);
          mergeToggleMap(parsed.sharedToggles);
        }
      }
    } catch {}
    try {
      const rawToggles = localStorage.getItem(TOGGLES_STORAGE_KEY);
      if (rawToggles) {
        const parsed = JSON.parse(rawToggles);
        if (object(parsed)) mergeToggleMap(parsed.sharedToggles);
      }
    } catch {}
  }

  function reconcileLocalNotesWithShared() {
    let anyChanged = false;
    for (const [propId, val] of Object.entries(notes)) {
      if (!validId(propId) || !val || !val.trim() || isTestNote(val)) continue;
      const trimmed = val.trim();
      const existingList = getVisibleSharedComments(propId);
      const matched = existingList.find((item) => item.text.trim() === trimmed);
      if (matched) {
        boundEntryIds[propId] = matched.id;
      } else {
        const entryId = getActiveEntryId(propId);
        if (mergeSharedEntry(propId, { id: entryId, author: currentAuthor(), text: trimmed, updatedAt: Date.now(), clientId, deleted: false })) {
          anyChanged = true;
          scheduleCloudPublish(propId, entryId, false);
        }
      }
    }
    if (anyChanged) saveSharedToLocal();
  }

  function mergeStreamMessage(msg) {
    if (!object(msg)) return [false, false];
    if (msg.type === 'comment' && validId(msg.propertyId)) return [mergeSharedEntry(msg.propertyId, msg.entry), false];
    if (msg.type === 'toggle' && validId(msg.propertyId)) return [false, mergeToggleEntry(msg.propertyId, msg.toggle)];
    if (msg.type === 'snapshot') return [mergeSharedMap(msg.sharedComments), mergeToggleMap(msg.sharedToggles)];
    return [false, false];
  }

  // Правки за последние 12 ч из ленты: так в снимок попадут и изменения из вкладок со старой версией сайта.
  async function pullStreamBacklog() {
    let cChanged = false;
    let tChanged = false;
    try {
      const resp = await fetch(`${CLOUD_STREAM_URL}/json?poll=1&since=all`, { cache: 'no-store' });
      if (resp.ok) {
        for (const line of (await resp.text()).split('\n')) {
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (!evt || evt.event !== 'message' || typeof evt.message !== 'string') continue;
            const [c, t] = mergeStreamMessage(JSON.parse(evt.message));
            cChanged = cChanged || c;
            tChanged = tChanged || t;
          } catch {}
        }
      }
    } catch {}
    applySharedChanges(cChanged, tChanged);
  }

  function startCloudSync() {
    if (typeof fetch !== 'function') return;
    pullStreamBacklog().finally(syncCloudState);
    // Лента досылает всё с момента открытия страницы: события, пришедшие до подключения или во время обрыва, не теряются.
    const streamSince = Math.floor(Date.now() / 1000) - 10;
    let stream = null;
    function openStream() {
      if (typeof EventSource !== 'function') return;
      try {
        stream = new EventSource(`${CLOUD_STREAM_URL}/sse?since=${streamSince}`);
        stream.addEventListener('message', (event) => {
          try {
            const evt = JSON.parse(event.data);
            if (!evt || typeof evt.message !== 'string') return;
            const [c, t] = mergeStreamMessage(JSON.parse(evt.message));
            applySharedChanges(c, t);
            // Чужую правку дописывает в снимок первый открытый браузер (с разбросом, чтобы не писать хором).
            if ((c || t) && !cloudSyncTimer) scheduleCloudSync(1500 + Math.random() * 3500);
          } catch {}
        });
      } catch {}
    }
    openStream();
    setInterval(() => {
      if (stream && stream.readyState === EventSource.CLOSED) openStream();
      if (document.visibilityState !== 'hidden') syncCloudState();
    }, 90000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' || cloudSyncTimer) syncCloudState();
    });
    window.addEventListener('online', () => syncCloudState());
  }

  initSharedState();
  readNotes();
  reconcileLocalNotesWithShared();
  updateNotesCount();
  renderStats();
  if (standalone) {
    document.body.classList.add('standalone');
    $('toolbar').hidden = true;
    $('catalog').hidden = true;
    $('standalone-detail').hidden = false;
    currentDetail = properties[0];
    buildDetail(properties[0], $('standalone-detail'));
  } else {
    readUrl();
    try { origin = JSON.parse(localStorage.getItem(ORIGIN_SLOT) || 'null'); } catch { origin = null; }
    if (!object(origin) || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) origin = null;
    render();
    renderViewings();
    openFromHash(true);
    if (origin) computeOriginTimes().then(() => render());
    $('pick-origin').addEventListener('click', () => { pickingOrigin = !pickingOrigin; updateOriginControls(); });
    $('clear-origin').addEventListener('click', () => {
      origin = null;
      try { localStorage.removeItem(ORIGIN_SLOT); } catch {}
      applyOriginTimes(null);
      render();
    });
    $('compare-open').addEventListener('click', openCompare);
    $('compare-clear').addEventListener('click', () => { compareIds = []; saveCompare(); });
    $('close-compare').addEventListener('click', () => $('compare-dialog').close());
    $('compare-dialog').addEventListener('close', syncDialogScroll);
  }
  $('print-detail').addEventListener('click', () => window.print());
  let recentIds = properties.filter((p) => isRecentArthur(p)).map((p) => p.id).join(',');
  function refreshDates() {
    const next = properties.filter((p) => isRecentArthur(p)).map((p) => p.id).join(',');
    if (next !== recentIds) {
      recentIds = next;
      if (!standalone && state.onlyNew) render();
      else renderStats();
    }
    for (const date of document.querySelectorAll('.added-date time[datetime]')) date.textContent = addedDateLabel(date.dateTime);
    for (const badge of document.querySelectorAll('.new-badge[data-offered-at]')) {
      if (!isRecentArthur({ sourceAgentId: 'arthur', offeredAt: badge.dataset.offeredAt })) badge.remove();
    }
  }
  setInterval(refreshDates, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshDates(); });
  registerOffline();
  startCloudSync();
})();
