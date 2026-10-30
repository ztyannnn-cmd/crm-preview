// Choose the data source before importing any module that touches browser storage.
// Backend mode never imports the local model, fixtures, store or app.
export async function startPreview({
 search = globalThis.location?.search || '',
 load = specifier => import(specifier),
 document = globalThis.document
} = {}) {
 const backend = new URLSearchParams(search).get('backend') === '1';
 if (!backend) {
  const result = await load('./preview-bootstrap.mjs?v=20261021-proposal-compact');
  const destination = globalThis.location?.hash?.slice(1);
  if (['followup','delivery','projects'].includes(destination)) document?.querySelector('[data-page="'+destination+'"]')?.click();
  return result;
 }
 const root = document.getElementById('crm-preview');
 const content = document.getElementById('crm-content');
 content.textContent = '正在连接达人管理后端…';
 try {
  const [{createCrmClient}, {mountCreatorBackend}] = await Promise.all([
   load('/integration/crm-api.mjs'), load('./creator-backend.mjs?v=20261022')
  ]);
  return await mountCreatorBackend({api:createCrmClient(), root, content});
 } catch {
  content.innerHTML = '<section class="backend-start-error" role="alert"><h1>暂时无法连接后端</h1><p>请确认本地后端与预览代理已启动，然后重试。当前页面没有保存任何达人资料。</p><button type="button" data-retry-backend>重新连接</button> <a href="./#creators">返回本地预览</a></section>';
  content.querySelector('[data-retry-backend]').addEventListener('click', () => startPreview({search, load, document}));
 }
}

if (typeof document !== 'undefined') void startPreview();
