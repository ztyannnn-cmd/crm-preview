import {KEY} from './model.mjs';
import {createEmptyPreviewData} from './empty-preview-fixtures.mjs';
import {createFollowupPreviewData} from './followup-preview-fixtures.mjs';
import {businessStorage,isFollowupDemo} from './preview-store.mjs';
// Only initialize the dedicated preview key; never clear or read the original Demo key.
try{
 if(!businessStorage.getItem(KEY))businessStorage.setItem(KEY,JSON.stringify(isFollowupDemo?createFollowupPreviewData():createEmptyPreviewData()));
 await import('./app.mjs?v=20261021-proposal-compact');
}catch(error){document.getElementById('crm-content').textContent='模拟预览初始化失败：'+error.message;}
