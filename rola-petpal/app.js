'use strict';
const el = id => document.getElementById(id);
const local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
function log(text) { const li=document.createElement('li');li.textContent=new Date().toLocaleTimeString('ru-RU')+' · '+text;el('log').prepend(li);while(el('log').children.length>30)el('log').lastChild.remove(); }
function render(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.mac_matches) || typeof data.checked_at !== 'string' || !data.screenshot_address || !Array.isArray(data.screenshot_address.open_ports)) throw Error('Неверный формат диагностики');
  el('mode').textContent=local?'Подключён локальный пульт':'Диагностика из локального файла';
  const wifi=typeof data.wifi==='string'?data.wifi:'';
  const ssid=wifi.match(/^\s*SSID\s*:\s*(.+)$/m); const adapter=wifi.match(/^\s*Description\s*:\s*(.+)$/m);
  el('wifi').textContent=ssid?ssid[1].trim():'Нет данных';
  el('adapter').textContent=adapter?adapter[1].trim():'Нет данных';
  const hit=data.robot_now?data.robot_now.identity_matches===true:data.mac_matches.length>0;
  const api=data.file_api;
  el('ip').textContent=hit?(data.robot_now?.ip||data.mac_matches[0].trim().split(/\s+/)[0]):data.screenshot_address.ip+' (со скриншота)';
  el('ports').textContent=data.screenshot_address.open_ports.join(', ')||'Нет открытых TCP-портов';
  el('reach').textContent=hit?'Найден':'Не найден';
  el('reachDetail').textContent=hit?'MAC-адрес совпал':'Совпадение MAC не найдено';
  el('robotStatus').textContent=hit?'Робот найден в сети · API не подключён':'Робот пока не найден · API не подключён';
  el('api').textContent=api?.connected?'SD-карта · подключена':'Не подключён';
  el('api').className=api?.connected?'ok':'offline';
  el('storage').textContent='—';el('storageDetail').textContent='Нет данных SD-карты';
  el('used').textContent='—';el('pics').textContent='—';el('vids').textContent='—';el('daysCount').textContent='—';
  el('daysInfo').textContent='Подключите локальный пульт, чтобы увидеть, что снял робот.';
  if(api?.connected){
    el('robotStatus').textContent='Робот на связи · API SD-карты подключён';
    el('storage').textContent=(api.storage.free/1024**3).toLocaleString('ru-RU',{maximumFractionDigits:1})+' ГиБ';
    el('storageDetail').textContent='Свободно из '+(api.storage.total/1024**3).toLocaleString('ru-RU',{maximumFractionDigits:1})+' ГиБ';
    el('used').textContent=(api.storage.used/1024**2).toLocaleString('ru-RU',{maximumFractionDigits:1})+' МиБ';
    const pics=Number.isInteger(api.storage.pictures)?api.storage.pictures:0;
    const vids=Number.isInteger(api.storage.videos)?api.storage.videos:0;
    const days=api.recording_days.length;
    el('pics').textContent=pics.toLocaleString('ru-RU');
    el('vids').textContent=vids.toLocaleString('ru-RU');
    el('daysCount').textContent=String(days);
    el('daysInfo').textContent=(pics+vids+days===0)?'Робот пока ничего не снял — память пуста. Как только он найдёт и снимет кошку, фото и видео появятся здесь.':'Робот уже сохранил: фото — '+pics+', видео — '+vids+', дней с записями — '+days+'.';
  }
  if(data.robot_now?.error){el('reach').textContent='Нет проверки';el('reachDetail').textContent=data.robot_now.error;el('robotStatus').textContent='Связь с роботом сейчас не проверена · API не подключён';}
  el('ble').textContent=Array.isArray(data.bluetooth)?String(data.bluetooth.length):'Ошибка';
  el('checked').textContent=new Date(data.robot_now?.checked_at||data.checked_at).toLocaleString('ru-RU');
  el('message').textContent='Диагностика загружена. Доступность адреса или порта сама по себе не подтверждает подключение к API робота.';
  if(data.network_now){
    const current=data.network_now;
    el('wifi').textContent=current.connected?(current.ssid||'Подключено')+' · '+(current.signal||''):'Не подключён';
    el('adapter').textContent=current.adapter||'Нет данных';
    if(current.error){el('wifi').textContent='Не удалось проверить';el('message').textContent=current.error;}
    else if(!current.connected)el('message').textContent='UGREEN сейчас не подключён к Wi-Fi. Данные поиска ниже относятся к последнему сканированию.';
    else if(!current.expected_visible&&!hit)el('message').textContent='ПК подключён к '+current.ssid+'. Сеть робота '+current.expected_ssid+' сейчас не видна. Последний поиск: '+new Date(data.checked_at).toLocaleString('ru-RU')+'.';
  }
  if(api?.connected)el('message').textContent='Реальное соединение с API SD-карты установлено. Данные читаются напрямую с робота через UGREEN. Камера и управление движением пока не подключены.';
  log(hit?'Найден MAC-адрес робота':'MAC-адрес робота в текущей сети не найден');
  if(Number.isInteger(data.neighbors_count))log('ARP-поиск: найдено устройств — '+data.neighbors_count);
  if(Array.isArray(data.bluetooth))log('Bluetooth: обнаружено устройств — '+data.bluetooth.length);
}
async function refresh(){if(!local){el('message').textContent='Для обновления с ПК откройте локальный пульт или загрузите discovery.json.';return;}try{const response=await fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Диагностика пока не создана');render(await response.json());}catch(e){el('mode').textContent='Нет свежих данных';log(e.message);}}
el('refresh').addEventListener('click',refresh);
if(local){const scan=document.createElement('button');scan.textContent='Повторить поиск';scan.addEventListener('click',async()=>{scan.disabled=true;try{const r=await fetch('/api/scan',{method:'POST',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error(r.status===429?'Поиск уже идёт или запускался менее минуты назад':'Не удалось начать поиск');log('Начат поиск по Wi-Fi и Bluetooth. Результат появится после завершения.');}catch(e){log(e.message);}finally{setTimeout(()=>{scan.disabled=false;refresh();},60000);}});el('refresh').parentNode.append(scan);}
el('import').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>1024*1024)throw Error('Файл больше 1 МБ');render(JSON.parse(await file.text()));}catch(e){el('message').textContent=e.message;log('Ошибка импорта: '+e.message);}finally{event.target.value='';}});
if(local){el('local').textContent='Локальный пульт открыт';el('local').removeAttribute('href');refresh();setInterval(refresh,30000);}
