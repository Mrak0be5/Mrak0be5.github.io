// Фильтрует обезличенную выгрузку Adjust прямо в браузере, без API-ключа.
import {number} from './data.js';
let current;
const chunks=new Map();

async function dataset(force = false) {
  if (!current || force) {
    const manifestURL=new URL('./snapshot.json',import.meta.url);manifestURL.searchParams.set('v',Date.now());
    const pending = fetch(manifestURL,{cache:'no-store'}).then(async response => {
      if (!response.ok) throw Error('Не удалось загрузить данные Adjust. Повторите обновление.');
      const data=await response.json();
      if (data.version!==1 || (!Array.isArray(data.rows)&&!Array.isArray(data.shards)) || !Array.isArray(data.columns)) throw Error('Неверный формат выгрузки Adjust.');
      return data;
    });
    current=pending;
    try { return await pending; } catch(error) { if(current===pending)current=null;throw error; }
  }
  return current;
}

export function matches(value,op,condition) {
  const text=String(value??'').toLowerCase(), target=String(condition).toLowerCase(), list=target.split(',');
  switch(op) {
    case 'in':return list.includes(text);
    case 'not_in':return !list.includes(text);
    case 'contains':return text.toLocaleLowerCase().includes(target.toLocaleLowerCase());
    case 'exclude':return !text.toLocaleLowerCase().includes(target.toLocaleLowerCase());
    case 'starts_with':return text.startsWith(target);
    case 'not_starts_with':return !text.startsWith(target);
    case 'ends_with':return text.endsWith(target);
    case 'not_ends_with':return !text.endsWith(target);
    default:{const n=number(value),t=number(target);if(n===null||t===null)return false;return {lt:n<t,lte:n<=t,gt:n>t,gte:n>=t,eq:n===t,ne:n!==t}[op]===true;}
  }
}

export function buildReport(data,body) {
  const params={...data.catalog.defaults,...body.parameters};
  const dimensions=body.dimensions, metrics=body.metrics;
  if (!Array.isArray(dimensions)||!dimensions.length||dimensions.length>8||!Array.isArray(metrics)||!metrics.length||metrics.length>80) throw Error('Проверьте выбранные поля отчёта.');
  const dims=new Set(data.catalog.filters.dimensions.map(x=>x.id)), fields=new Set(data.catalog.filters.attributes.map(x=>x.id));
  if(dimensions.some(x=>!dims.has(x))||metrics.some(x=>!fields.has(x)))throw Error('Поле не входит в опубликованную выгрузку.');
  for(const [key,value] of Object.entries(data.catalog.defaults))if(key!=='iap_revenue_mode'&&String(params[key])!==String(value))throw Error('Этот параметр зафиксирован при выгрузке: '+key+'.');
  const share=Number(/^GROSS_(100|85|70|60)$/.exec(params.iap_revenue_mode)?.[1]);
  if(!share)throw Error('Выберите поддерживаемую комиссию.');
  const [start,end]=String(params.date_period).split(':');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw Error('Проверьте период.');
  if(start<data.range[0]||end>data.range[1])throw Error(`Доступный период выгрузки: ${data.range[0]} — ${data.range[1]}.`);
  const index=Object.fromEntries(data.columns.map((x,i)=>[x,i])), dimFilters=[], numeric=[];
  const value=(row,field)=>data.dictionaries?.[field] ? data.dictionaries[field][row[index[field]]] : row[index[field]];
  for(const [key,value] of Object.entries(params)) {
    if(value==='')continue;
    if(!key.includes('__')){if(!(key in data.catalog.defaults)&&key!=='date_period')throw Error('Параметр не входит в выгрузку: '+key);continue;}
    const split=key.lastIndexOf('__'),field=key.slice(0,split),op=key.slice(split+2);
    if(dims.has(field)&&['in','not_in','contains','exclude','starts_with','not_starts_with','ends_with','not_ends_with'].includes(op))dimFilters.push([field,op,value]);
    else if(fields.has(field)&&['lt','lte','gt','gte','eq','ne'].includes(op)&&number(value)!==null)numeric.push([field,op,value]);
    else throw Error('Неизвестный фильтр: '+field);
  }
  const rows=data.rows.filter(row=>value(row,'day')>=start&&value(row,'day')<=end&&dimFilters.every(([field,op,target])=>matches(value(row,field),op,target)));
  const additive=data.additive, fraction=share/70;
  const iap=new Set(data.iap_metrics), ratioMetrics=data.ratios||{};
  function group(groupDimensions,requested,groupRows=rows) {
    const groups=new Map();
    for(const row of groupRows) {
      const key=JSON.stringify(groupDimensions.map(field=>value(row,field)??''));
      if(!groups.has(key))groups.set(key,{keys:groupDimensions.map(field=>value(row,field)??''),sum:{},seen:{}});
      if(groups.size>50000)throw Error('В отчёте больше 50 000 строк. Добавьте фильтры, сократите период или число группировок.');
      const item=groups.get(key);
      for(const field of additive){const value=number(row[index[field]]);if(value!==null){item.sum[field]=(item.sum[field]||0)+value;item.seen[field]=true;}}
    }
    return [...groups.values()].map(item=>{
      const result=Object.fromEntries(groupDimensions.map((field,i)=>[field,item.keys[i]]));
      for(const field of additive)result[field]=item.seen[field]?item.sum[field]*(iap.has(field)?fraction:1):null;
      for(const [field,[numerator,denominator]] of Object.entries(ratioMetrics)){const parts=(Array.isArray(numerator)?numerator:[numerator]).map(key=>result[key]);const n=parts.every(x=>x!==null&&x!==undefined)?parts.reduce((a,b)=>a+b,0):null,d=result[denominator];result[field]=n!==null&&d>0?n/d:null;}
      for(const field of requested)if(!(field in result))result[field]=null;
      return Object.fromEntries([...groupDimensions,...requested].map(field=>[field,result[field]]));
    });
  }
  const allMetrics=[...new Set([...metrics,...data.summary_metrics])];
  const nativeRows=!dimFilters.length&&data.native_daily_rows?.filter(row=>value(row,'day')>=start&&value(row,'day')<=end);
  const totals=group([],allMetrics,nativeRows||rows)[0]||Object.fromEntries(allMetrics.map(x=>[x,null]));
  const tableMetrics=[...new Set([...metrics,...numeric.map(x=>x[0])])];
  const filtered=group(dimensions,tableMetrics).filter(row=>numeric.every(([field,op,target])=>matches(row[field],op,target)));
  const keys=new Set(filtered.map(row=>JSON.stringify(dimensions.map(field=>row[field]))));
  const tableTotals=numeric.length?(group([],allMetrics,rows.filter(row=>keys.has(JSON.stringify(dimensions.map(field=>value(row,field)??'')))))[0]||Object.fromEntries(allMetrics.map(x=>[x,null]))):totals;
  const table=filtered.map(row=>Object.fromEntries([...dimensions,...metrics].map(field=>[field,row[field]])));
  const warnings=data.warnings||[];
  return {table:{rows:table,totals:tableTotals, data_warnings:warnings},summary:{rows:group(['app_token'],allMetrics),totals},trend:{rows:group(['day'],allMetrics,nativeRows||rows),totals},parameters:params,generated_at:data.generated_at,
    notice:`Автоматическая выгрузка Adjust на ${new Date(data.generated_at).toLocaleString('ru-RU')}. Детальные суммы могут отличаться на копейки из-за округления строк Adjust.${numeric.length?' Числовые условия относятся к таблице детализации; карточки, когорты и график показывают сегмент до порога.':''}`};
}

export async function snapshotRequest(url,options={}) {
  const body=options.body?JSON.parse(options.body):{};
  const data=await dataset(body.force===true);
  if(url==='/api/catalog')return data.catalog;
  if(url==='/api/dashboard'){
    const [start,end]=String(body.parameters?.date_period||'').split(':');
    const appFilters=Object.entries(body.parameters||{}).filter(([key])=>key.startsWith('app_token__'));
    const selected=(data.shards||[]).filter(shard=>shard.range[0]<=end&&shard.range[1]>=start&&(!shard.app_token||appFilters.every(([key,value])=>matches(shard.app_token,key.slice('app_token__'.length),value))));
    const rows=[];
    try { for(let offset=0;offset<selected.length;offset+=6){
      const parts=await Promise.all(selected.slice(offset,offset+6).map(shard=>{
        if(!chunks.has(shard.file))chunks.set(shard.file,fetch(new URL('./'+shard.file,import.meta.url)).then(async response=>{if(!response.ok){const error=Error('Не удалось загрузить часть выгрузки. Повторите обновление.');error.status=response.status;throw error;}return response.json();}).catch(error=>{chunks.delete(shard.file);throw error;}));
        return chunks.get(shard.file);
      }));
      for(const part of parts)for(const row of part)rows.push(row);
    }} catch(error) {
      // Открытая вкладка могла сохранить манифест предыдущей публикации.
      if(error.status===404&&!options.reloaded){current=null;return snapshotRequest(url,{...options,reloaded:true});}
      throw error;
    }
    // Держим ограниченное число периодов в памяти вкладки.
    if(chunks.size>20)for(const key of chunks.keys())if(!selected.some(shard=>shard.file===key))chunks.delete(key);
    return buildReport({...data,rows},body);
  }
  throw Error('Страница не найдена.');
}
