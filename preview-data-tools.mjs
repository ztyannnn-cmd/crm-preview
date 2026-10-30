import {KEY} from './model.mjs';
import {createEmptyPreviewData} from './empty-preview-fixtures.mjs';

export const VIEW_KEYS=['solbridge-video-v06-preview-views','solbridge-crm-location-v1'];
const BACKUPS_KEY=KEY+':backups';
const BACKUP_PREFIX=KEY+':backup:';
const collections={creators:'达人',campaigns:'项目',collaborations:'提报',orders:'订单',deliveryItems:'视频',proposalDrafts:'提报草稿',tasks:'提醒',followUps:'跟进记录',savedViews:'已保存视图'};

export function previewCounts(storage){
 const raw=storage.getItem(KEY),db=raw?JSON.parse(raw):{};
 return Object.entries(collections).map(([key,label])=>({key,label,count:Array.isArray(db[key])?db[key].length:0}));
}
export function previewBackups(storage){
 const ids=JSON.parse(storage.getItem(BACKUPS_KEY)||'[]');
 if(!Array.isArray(ids))throw Error('备份目录格式异常，请保留当前存储。');
 return ids.filter(id=>typeof id==='string'&&id.startsWith(BACKUP_PREFIX)).map(id=>{
  const raw=storage.getItem(id);
  if(!raw)return null;
  const backup=JSON.parse(raw);
  return backup.key===KEY&&backup.schema===1?{id,...backup}:null;
 }).filter(Boolean);
}
function makeBackup(storage,session){
 const at=new Date().toISOString(),id=BACKUP_PREFIX+crypto.randomUUID();
 const snapshot={schema:1,key:KEY,at,data:storage.getItem(KEY),views:Object.fromEntries(VIEW_KEYS.map(key=>[key,session?.getItem(key)??null]))};
 const raw=JSON.stringify(snapshot),ids=previewBackups(storage).map(backup=>backup.id);
 storage.setItem(id,raw);
 if(storage.getItem(id)!==raw)throw Error('备份校验失败，未清空数据。');
 const index=JSON.stringify([id,...ids]);
 storage.setItem(BACKUPS_KEY,index);
 if(storage.getItem(BACKUPS_KEY)!==index)throw Error('备份目录保存失败，未清空数据。');
 return id;
}
function writeData(storage,session,raw,views={}){
 storage.setItem(KEY,raw);
 if(storage.getItem(KEY)!==raw)throw Error('数据保存校验失败，请从备份恢复。');
 for(const key of VIEW_KEYS){
  if(views[key]===null||views[key]===undefined)session?.removeItem(key);
  else session?.setItem(key,views[key]);
 }
}
export function clearPreviewData(storage,session){
 const backupId=makeBackup(storage,session);
 writeData(storage,session,JSON.stringify(createEmptyPreviewData()));
 return backupId;
}
export function restorePreviewData(storage,session,id){
 const backup=previewBackups(storage).find(item=>item.id===id);
 if(!backup)throw Error('找不到所选备份。');
 const raw=backup.data??JSON.stringify(createEmptyPreviewData());
 const data=JSON.parse(raw);
 if(data.version!==2||!Array.isArray(data.creators)||!Array.isArray(data.campaigns)||!Array.isArray(data.collaborations))throw Error('备份业务数据格式异常，未恢复。');
 makeBackup(storage,session);
 writeData(storage,session,raw,backup.views);
}

if(typeof document!=='undefined'){
 const counts=document.getElementById('counts'),backups=document.getElementById('backups'),message=document.getElementById('message');
 const clear=document.getElementById('clear-data'),restore=document.getElementById('restore-data');
 function render(){
  counts.replaceChildren(...previewCounts(localStorage).map(({label,count})=>{
   const row=document.createElement('li');row.textContent=label+'：'+count;return row;
  }));
  backups.replaceChildren(...previewBackups(localStorage).map(backup=>{
   const option=document.createElement('option');option.value=backup.id;option.textContent=new Date(backup.at).toLocaleString('zh-CN');return option;
  }));
  restore.disabled=!backups.options.length;
 }
 function run(action,success){
  clear.disabled=restore.disabled=true;
  try{action();render();message.textContent=success;message.dataset.state='success';}
  catch(error){message.textContent=error.message;message.dataset.state='error';}
  finally{clear.disabled=false;restore.disabled=!backups.options.length;}
 }
 clear.addEventListener('click',()=>run(()=>clearPreviewData(localStorage,sessionStorage),'已清空当前浏览器的全部 CRM 测试业务数据，并保留可恢复备份。请点击“开始测试”；其他已打开的 CRM 标签页请先刷新。'));
 restore.addEventListener('click',()=>run(()=>restorePreviewData(localStorage,sessionStorage,backups.value),'备份已恢复，恢复前的数据也已备份。请重新打开 CRM。'));
 try{render();}catch(error){message.textContent=error.message;clear.disabled=restore.disabled=true;}
}
