import {KEY} from './model.mjs';
import {createPreviewData} from './preview-fixtures.mjs';
// Only initialize the dedicated preview key; never clear or read the original Demo key.
try{
 if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(createPreviewData()));
 await import('./app.mjs?v=20261019-pm-self-managed');
}catch(error){document.getElementById('crm-content').textContent='模拟预览初始化失败：'+error.message;}
