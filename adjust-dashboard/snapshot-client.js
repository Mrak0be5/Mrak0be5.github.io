// Расчёты выполняются в Worker, чтобы большие таблицы не блокировали интерфейс.
const worker=new Worker(new URL('./snapshot-worker.js',import.meta.url),{type:'module'});
const pending=new Map();let sequence=0,broken=false;
worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;pending.delete(data.id);data.error?task.reject(Error(data.error)):task.resolve(data.result);};
worker.onerror=()=>{broken=true;for(const task of pending.values())task.reject(Error('Не удалось обработать выгрузку. Обновите страницу.'));pending.clear();};
export function snapshotRequest(url,options={}) {
  if(broken)return Promise.reject(Error('Не удалось обработать выгрузку. Обновите страницу.'));
  return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});worker.postMessage({id,url,options:{body:options.body}});});
}
