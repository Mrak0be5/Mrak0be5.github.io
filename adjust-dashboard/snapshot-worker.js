import {snapshotRequest} from './snapshot.js';
self.onmessage=async({data:{id,url,options}})=>{try{self.postMessage({id,result:await snapshotRequest(url,options)});}catch(error){self.postMessage({id,error:error.message||'Не удалось обработать данные.'});}};
