// This mode has its own server DTO state. Do not import model, fixtures or browser stores.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields = ['name','contact','country','language','creatorType','platform','handle','url'];
const limits = {name:120,contact:254,country:80,language:80,creatorType:100,platform:30,handle:120,url:1000};
const platforms = ['YouTube','Instagram','TikTok'];
export function safeProfileUrl(value) {
 try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function creatorAccounts(creator) {
 const accounts = Array.isArray(creator.accounts) ? creator.accounts.filter(a => a && (a.url || a.handle || a.platform)) : [];
 return accounts.length ? accounts : (creator.platform || creator.url || creator.handle ? [{platform:creator.platform,handle:creator.handle,url:creator.url}] : []);
}
export function filterCreators(creators, {q='',platform='',country=''} = {}) {
 const query = q.trim().toLocaleLowerCase();
 return creators.filter(c => (!country || c.country === country) && (!platform || creatorAccounts(c).some(a => a.platform === platform)) && (!query || [c.id,c.name,c.contact,...creatorAccounts(c).flatMap(a => [a.handle,a.url])].some(v => String(v || '').toLocaleLowerCase().includes(query))));
}
export function creatorBodyFromValues(values) {
 const body = Object.fromEntries(fields.map(key => [key,String(values[key] ?? '').trim()]));
 for (const key of fields) {
  if (key !== 'handle' && !body[key]) throw Error('请填写所有必填资料。');
  if (body[key].length > limits[key]) throw Error('字段内容过长，请缩短后重试。');
 }
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contact)) throw Error('请填写有效的联系邮箱。');
 if (!platforms.includes(body.platform)) throw Error('请选择支持的平台。');
 if (!safeProfileUrl(body.url)) throw Error('主页链接必须是有效的 http 或 https 地址，且不能包含账号密码。');
 return body;
}
export function createCreatorWorkspace(api, changed = () => {}) {
 const state = {me:null,actors:[],creators:[],busy:false,loading:false,error:'',notice:'',form:null,pending:null,detailId:'',filters:{q:'',platform:'',country:''}};
 let epoch = 0;
 const notify = () => changed(state);
 const fail = error => {
  state.error = error.message || '请求失败，请保留输入后重试。';
  if (error.status === 401 || ['AUTH_REQUIRED','CSRF_INVALID'].includes(error.code)) {
   state.me = null; state.creators = []; state.detailId = '';
  }
 };
 async function readCreators(expectedId) {
  const me = await api.me();
  if (expectedId && me.id !== expectedId) {
   const error = Error('登录账号已变化，请重新登录原账号后继续。'); error.status = 401; throw error;
  }
  const rows = await api.creators();
  if (!Array.isArray(rows)) throw Error('达人列表返回格式异常，请重试。');
  return {me, rows};
 }
 const actions = {
  state,
  async start() {
   const ticket = ++epoch; state.loading = true; state.error = ''; notify();
   try {
    const actors = await api.actors(); if (ticket !== epoch) return;
    state.actors = Array.isArray(actors) ? actors : [];
    try { const result = await readCreators(); if (ticket !== epoch) return; state.me = result.me; state.creators = result.rows; }
    catch (error) { if (error.status !== 401) throw error; state.me = null; state.creators = []; }
   } catch (error) { if (ticket === epoch) fail(error); }
   finally { if (ticket === epoch) {state.loading = false; notify();} }
  },
  async login(employeeId, {discard = false} = {}) {
   if (state.busy || state.loading || !employeeId) return;
   if (state.form && state.form.ownerId !== employeeId && !discard) throw Error('请先确认放弃当前表单。');
   const ticket = ++epoch;
   if (discard) {state.form = null; state.pending = null;}
   state.me = null; state.creators = []; state.detailId = ''; state.filters = {q:'',platform:'',country:''};
   state.loading = true; state.error = ''; state.notice = ''; notify();
   try {
    const me = await api.login(employeeId);
    const result = await readCreators(me.id);
    if (ticket !== epoch) return;
    state.me = result.me; state.creators = result.rows;
   } catch (error) {if (ticket === epoch) fail(error);}
   finally {if (ticket === epoch) {state.loading = false; notify();}}
  },
  openForm() {
   if (state.me?.role !== 'operator' || state.busy || state.loading) return;
   state.form = {ownerId:state.me.id,values:Object.fromEntries(fields.map(key => [key,''])),committedId:null,dirty:false};
   state.pending = null; state.error = ''; state.notice = ''; notify();
  },
  closeForm() {if (!state.busy) {state.form = null; state.pending = null; state.error = ''; notify();}},
  async refresh() {
   if (state.loading || state.busy) return;
   const expectedId = state.form?.ownerId || state.me?.id;
   const ticket = ++epoch; state.loading = true; state.error = ''; notify();
   try {
    const result = await readCreators(expectedId);
    if (ticket !== epoch) return;
    state.me = result.me; state.creators = result.rows;
    if (state.form?.committedId) {
     if (!result.rows.some(c => c.id === state.form.committedId)) throw Error('已保存，但当前列表尚未读到新记录，请再次刷新。');
     state.notice = '达人已保存至后端，列表已更新。'; state.form = null; state.pending = null;
    }
   } catch (error) {if (ticket === epoch) fail(error);}
   finally {if (ticket === epoch) {state.loading = false; notify();}}
  },
  async save() {
   if (state.busy || state.loading || !state.form || !state.me) return;
   if (state.form.committedId) return actions.refresh();
   const form = state.form; let body;
   try {body = creatorBodyFromValues(form.values);} catch(error) {fail(error); notify(); return;}
   if (state.me.id !== form.ownerId) {state.error = '请重新登录填写此表单的账号。'; notify(); return;}
   const signature = JSON.stringify([form.ownerId,body]);
   if (!state.pending || state.pending.signature !== signature) state.pending = {signature,operation:api.operation()};
   const ticket = ++epoch; state.busy = true; state.error = ''; state.notice = ''; notify();
   try {
    const me = await api.me();
    if (me.id !== form.ownerId) {const error = Error('登录账号已变化，请重新登录原账号后继续。'); error.status = 401; throw error;}
    const result = await api.createCreator(body,state.pending.operation);
    if (!result?.id) throw Error('保存结果不完整，请保留输入后重试。');
    form.committedId = result.id; form.dirty = false; state.pending = null;
    state.notice = '已保存至后端，正在刷新列表…';
    const fresh = await readCreators(form.ownerId);
    if (ticket !== epoch) return;
    state.me = fresh.me; state.creators = fresh.rows;
    if (!fresh.rows.some(c => c.id === result.id)) throw Error('已保存，但当前列表尚未读到新记录，请刷新列表。');
    state.filters = {q:'',platform:'',country:''}; state.form = null;
    state.notice = '达人已保存至后端，刷新页面后仍可查看。';
   } catch (error) {if (ticket === epoch) {fail(error); if (form.committedId) state.error = '已保存，列表刷新失败。请点击“刷新列表”，不要重复新增。 ' + state.error;}}
   finally {if (ticket === epoch) {state.busy = false; notify();}}
  }
 };
 return actions;
}

export async function mountCreatorBackend({api,root,content}) {
 const doc = root.ownerDocument;
 root.dataset.backendMode = 'true'; root.setAttribute('aria-label','达人管理后端联调');
 doc.title = 'SOLBRIDGE · 达人管理';
 const oldTitle = doc.getElementById('crm-title'); if (oldTitle) oldTitle.closest('.row').hidden = true;
 const feedback = doc.getElementById('crm-feedback'); if (feedback) feedback.hidden = true;
 const account = root.querySelector('.account-switch');
 let restoreFocus = null;
 const workspace = createCreatorWorkspace(api,render), state = workspace.state;
 const roleName = role => ({operator:'运营',pm:'PM',admin:'管理员'}[role] || role);
 const options = (items,value,placeholder='全部') => '<option value="">'+escape(placeholder)+'</option>'+items.map(item => '<option value="'+escape(item)+'"'+(value===item?' selected':'')+'>'+escape(item)+'</option>').join('');
 const actorOptions = () => '<option value="">请选择开发员工</option>'+state.actors.map(actor => '<option value="'+escape(actor.id)+'"'+((state.me?.id || state.form?.ownerId)===actor.id?' selected':'')+'>'+escape(actor.displayName)+' · '+escape(roleName(actor.role))+'</option>').join('');
 const loginBox = () => '<div class="backend-login-controls"><label>开发员工<select data-backend-actor aria-label="开发员工"'+(state.loading || state.busy?' disabled':'')+'>'+actorOptions()+'</select></label><button type="button" data-backend-login'+(state.loading || state.busy?' disabled':'')+'>'+ (state.loading?'连接中…':state.me?'切换账号':'登录') +'</button></div>';
 const profileLink = a => safeProfileUrl(a.url) ? '<a href="'+escape(safeProfileUrl(a.url))+'" target="_blank" rel="noopener noreferrer">'+escape(a.handle || a.platform || '查看主页')+' ↗</a>' : escape(a.handle || '主页未提供');
 const accountsHtml = creator => creatorAccounts(creator).map(a => '<div class="resource-platform-row"><span class="resource-platform-label" data-platform="'+escape(a.platform)+'">'+escape(a.platform || '平台未提供')+'</span><div class="resource-platform-content">'+profileLink(a)+'</div></div>').join('') || '账号未提供';
 function message() {return (state.error?'<p class="backend-error" role="alert">'+escape(state.error)+'</p>':'')+(state.notice?'<p class="backend-notice" role="status">'+escape(state.notice)+'</p>':'');}
 function details(creator) {
  return '<section class="creator-detail-page"><button data-backend-back>← 返回达人列表</button><section class="creator-summary-panel"><div class="creator-summary-heading"><div class="creator-summary-title"><h1>'+escape(creator.name)+'</h1></div></div><small class="backend-record-id">CreatorID · '+escape(creator.id)+'</small><dl class="creator-summary-facts">'+[['国家',creator.country],['语言',creator.language],['达人类型',creator.creatorType],['邮箱',creator.contact]].map(([label,value]) => '<div><dt>'+label+'</dt><dd>'+escape(value || '未提供')+'</dd></div>').join('')+'</dl><div class="creator-summary-accounts resource-platform-stack">'+accountsHtml(creator)+'</div></section><p class="backend-scope">当前支持查看与新增。资料编辑、删除、多账号和粉丝／均播数据暂未接入；提报流程仍在本地预览中。</p></section>';
 }
 function list() {
  const rows = filterCreators(state.creators,state.filters);
  const countries = [...new Set(state.creators.map(c => c.country).filter(Boolean))].sort();
  return '<section class="operator-creator-list"><section class="ds-toolbar" aria-label="筛选达人"><label>搜索达人<input data-backend-search value="'+escape(state.filters.q)+'" placeholder="名称、邮箱、账号或主页"></label><label>平台<select data-backend-filter="platform">'+options(platforms,state.filters.platform)+'</select></label><label>国家<select data-backend-filter="country">'+options(countries,state.filters.country)+'</select></label><button data-backend-clear>清空筛选</button></section><div class="list-result-actions"><span>共 <strong>'+rows.length+'</strong> 位达人 · 当前员工可见</span><div><button data-backend-refresh'+(state.loading?' disabled':'')+'>'+ (state.loading?'读取中…':'刷新列表') +'</button> '+(state.me.role==='operator'?'<button class="primary" data-backend-new'+(state.loading?' disabled':'')+'>＋ 新增达人</button>':'<span class="backend-muted">当前角色可查看达人</span>')+'</div></div><div class="order-scroll"><table class="creator-resource-table creator-sectioned-table" aria-label="后端达人列表"><thead><tr>'+['达人信息','平台账号','联系方式','操作'].map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+rows.map(c => '<tr><td><div class="resource-overview-block"><button class="resource-name" data-backend-detail="'+escape(c.id)+'">'+escape(c.name || '未命名')+'</button><small class="backend-record-id">'+escape(c.id)+'</small><dl class="resource-basic-facts"><div><dt>国家</dt><dd>'+escape(c.country || '未提供')+'</dd></div><div><dt>语言</dt><dd>'+escape(c.language || '未提供')+'</dd></div><div><dt>类型</dt><dd>'+escape(c.creatorType || '未提供')+'</dd></div></dl></div></td><td><div class="resource-platform-stack">'+accountsHtml(c)+'</div><small class="backend-muted">粉丝／均播：暂未提供</small></td><td><div class="resource-contact-block backend-email">'+escape(c.contact || '未提供')+'</div></td><td><button data-backend-detail="'+escape(c.id)+'">查看详情</button></td></tr>').join('')+'</tbody></table></div>'+(!rows.length?'<div class="ds-empty">'+(state.creators.length?'没有符合条件的达人，可清空筛选。':'当前员工暂无可见达人。')+'</div>':'')+'</section>';
 }
 function formHtml() {
  const f = state.form, locked = state.busy || state.loading || Boolean(f.committedId);
  const labels = {name:'达人名称',contact:'联系邮箱',country:'国家',language:'语言',creatorType:'达人类型',platform:'平台',handle:'账号（选填）',url:'主页链接'};
  const controls = fields.map(key => '<label>'+labels[key]+(key==='handle'?'':' *')+(key==='platform'?'<select name="platform" aria-label="平台 *" required>'+options(platforms,f.values.platform,'请选择平台')+'</select>':'<input name="'+key+'" value="'+escape(f.values[key])+'" type="'+(key==='contact'?'email':key==='url'?'url':'text')+'" maxlength="'+limits[key]+'"'+(key==='handle'?'':' required')+'>')+'</label>').join('');
  return '<dialog class="backend-creator-dialog" aria-labelledby="backend-form-title"><form data-backend-form><div class="backend-dialog-heading"><h2 id="backend-form-title">新增达人</h2><button type="button" data-backend-close aria-label="关闭新增达人"'+(state.busy?' disabled':'')+'>×</button></div><p class="backend-muted">保存至当前员工的后端资料库。当前支持一个主账号。</p>'+message()+(state.me?'':'<p>登录已失效，请重新登录原员工继续，已填写内容仍保留。</p>'+loginBox())+'<fieldset class="backend-form-grid"'+(locked?' disabled':'')+'>'+controls+'</fieldset><div class="backend-dialog-actions"><button type="button" data-backend-close'+(state.busy?' disabled':'')+'>关闭</button>'+(f.committedId?'<button type="button" class="primary" data-backend-refresh'+(state.loading?' disabled':'')+'>刷新列表</button>':'<button type="submit" class="primary"'+(state.busy || state.loading || !state.me?' disabled':'')+'>'+(state.busy?'保存中…':'保存到后端')+'</button>')+'</div></form></dialog>';
 }
 function render() {
  const previous = content.querySelector('dialog'); if (previous?.open) previous.close();
  account.innerHTML = '<small>本地联调 · 模拟员工</small>'+loginBox();
  root.querySelectorAll('header nav [data-page]').forEach(button => {
   const creator = button.dataset.page==='creators'; button.setAttribute('aria-pressed',String(creator));
   button.textContent = ({creators:'达人管理',followup:'提报跟进',delivery:'视频交付',projects:'项目管理'}[button.dataset.page] || button.dataset.page)+(creator?'':' · 本地预览');
  });
  const creator = state.creators.find(c => c.id===state.detailId);
  content.innerHTML = '<div class="backend-mode-bar"><span><i></i>后端联调 · 数据保存至本机文件</span><a href="./#creators" data-backend-local>返回本地预览</a></div><section class="ds-page-header"><div class="ds-title-row"><h1>达人管理</h1><span class="backend-muted">'+escape(state.me ? state.me.displayName+' · '+roleName(state.me.role) : '尚未登录')+'</span></div></section>'+(!state.form?message():'')+(!state.me?'<section class="backend-login-panel"><h2>'+(state.loading?'正在连接…':'登录后查看达人')+'</h2><p>请选择上方的开发员工登录。只显示该员工在后端有权查看的资料。</p>'+(!state.loading?'<button data-backend-reconnect>重新连接</button>':'')+'</section>':(creator?details(creator):list()))+'<p class="backend-scope">已接入列表、筛选、详情和新增。编辑、删除、多账号及指标保存暂未提供；当前未连接云数据库。</p>'+(state.form?formHtml():'');
  const dialog = content.querySelector('dialog');
  if (dialog) {dialog.addEventListener('cancel',event => {event.preventDefault(); closeForm();}); dialog.showModal();}
  else if (restoreFocus) {content.querySelector(restoreFocus)?.focus(); restoreFocus = null;}
 }
 function mayLeave() {
  if (state.busy) return false;
  return !state.form || (!state.form.dirty && !state.pending) || globalThis.confirm('当前资料尚未确认完成。离开将放弃本页输入；若刚才发生网络异常，请先重试确认保存结果。是否离开？');
 }
 function closeForm() {if (mayLeave()) {restoreFocus='[data-backend-new]'; workspace.closeForm();}}
 root.addEventListener('input',event => {
  if (event.target.matches('[data-backend-search]')) {
   const start=event.target.selectionStart; state.filters.q=event.target.value; render();
   const search=content.querySelector('[data-backend-search]'); search.focus(); search.setSelectionRange(start,start);
  } else if (event.target.closest('[data-backend-form]') && fields.includes(event.target.name)) {
   state.form.values[event.target.name]=event.target.value; state.form.dirty=true;
  }
 });
 root.addEventListener('change',event => {
  if (event.target.dataset.backendFilter) {state.filters[event.target.dataset.backendFilter]=event.target.value; render();}
  if (event.target.closest('[data-backend-form]') && fields.includes(event.target.name)) {state.form.values[event.target.name]=event.target.value; state.form.dirty=true;}
 });
 root.addEventListener('click',async event => {
  const target=event.target.closest('button,a'); if (!target) return;
  if (target.hasAttribute('data-backend-login')) {
   event.preventDefault();
   const id=target.closest('.backend-login-controls').querySelector('[data-backend-actor]').value;
   if (!id) return;
   const discard=Boolean(state.form && state.form.ownerId!==id);
   if (discard && !mayLeave()) return;
   await workspace.login(id,{discard});
  } else if (target.hasAttribute('data-backend-new')) workspace.openForm();
  else if (target.hasAttribute('data-backend-close')) closeForm();
  else if (target.hasAttribute('data-backend-refresh')) await workspace.refresh();
  else if (target.hasAttribute('data-backend-reconnect')) await workspace.start();
  else if (target.hasAttribute('data-backend-clear')) {state.filters={q:'',platform:'',country:''}; render();}
  else if (target.hasAttribute('data-backend-detail')) {state.detailId=target.dataset.backendDetail; render();}
  else if (target.hasAttribute('data-backend-back')) {state.detailId=''; render();}
  else if (target.hasAttribute('data-backend-local') || target.dataset.page) {
   event.preventDefault(); if (!mayLeave()) return;
   if (target.dataset.page==='creators') {state.detailId=''; render();return;}
   const url=new URL(globalThis.location.href); url.searchParams.delete('backend'); url.hash=target.dataset.page || 'creators'; globalThis.location.assign(url.href);
  }
 });
 root.addEventListener('submit',async event => {
  if (!event.target.matches('[data-backend-form]')) return;
  event.preventDefault(); if (!event.target.reportValidity()) return;
  for (const key of fields) state.form.values[key]=event.target.elements.namedItem(key).value;
  await workspace.save();
 });
 globalThis.addEventListener('beforeunload',event => {if (state.busy || state.form?.dirty || state.pending) {event.preventDefault(); event.returnValue='';}});
 await workspace.start();
 return workspace;
}
