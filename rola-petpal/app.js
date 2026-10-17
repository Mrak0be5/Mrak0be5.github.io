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
  const hit=data.mac_matches.length>0;
  el('ip').textContent=hit?data.mac_matches[0].trim().split(/\s+/)[0]:data.screenshot_address.ip+' (со скриншота)';
  el('ports').textContent=data.screenshot_address.open_ports.join(', ')||'Нет открытых TCP-портов';
  el('reach').textContent=hit?'Найден':'Не найден';
  el('reachDetail').textContent=hit?'MAC-адрес совпал':'Совпадение MAC не найдено';
  el('robotStatus').textContent=hit?'Робот найден в сети · API не подключён':'Робот пока не найден · API не подключён';
  el('ble').textContent=Array.isArray(data.bluetooth)?String(data.bluetooth.length):'Ошибка';
  el('checked').textContent=new Date(data.checked_at).toLocaleString('ru-RU');
  el('message').textContent='Диагностика загружена. Доступность адреса или порта сама по себе не подтверждает подключение к API робота.';
  log(hit?'Найден MAC-адрес робота':'MAC-адрес робота в текущей сети не найден');
  if(Array.isArray(data.bluetooth))log('Bluetooth: обнаружено устройств — '+data.bluetooth.length);
}
async function refresh(){if(!local){el('message').textContent='Для обновления с ПК откройте локальный пульт или загрузите discovery.json.';return;}try{const response=await fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Диагностика пока не создана');render(await response.json());}catch(e){el('mode').textContent='Нет свежих данных';log(e.message);}}
el('refresh').addEventListener('click',refresh);
if(local){const scan=document.createElement('button');scan.textContent='Повторить поиск';scan.addEventListener('click',async()=>{scan.disabled=true;try{const r=await fetch('/api/scan',{method:'POST',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error(r.status===429?'Поиск уже идёт или запускался менее минуты назад':'Не удалось начать поиск');log('Начат поиск по Wi-Fi и Bluetooth. Результат появится после завершения.');}catch(e){log(e.message);}finally{setTimeout(()=>{scan.disabled=false;refresh();},60000);}});el('refresh').parentNode.append(scan);}
el('import').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>1024*1024)throw Error('Файл больше 1 МБ');render(JSON.parse(await file.text()));}catch(e){el('message').textContent=e.message;log('Ошибка импорта: '+e.message);}finally{event.target.value='';}});
if(local){el('local').textContent='Локальный пульт открыт';el('local').removeAttribute('href');refresh();setInterval(refresh,30000);}
