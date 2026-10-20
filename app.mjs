import {Button,PageHeader,MetricCard,FilterBar,DataList} from './design-system/components.mjs';
import {isSelfManagedPm,canOwnWork,pmHandoffResults,directPm,saveOrderSplit,correctOrderPricing,transferOperatorWork,saveProposalDraft,submitPackage,repeatPermission,projectReviewers,validateSubmissionProfile,proposalStageOf,proposalStatus,proposalStatuses,proposalFilter,proposalStayHours,isProposalOverdue,deliveryNumber,orderNumber,deliveryStayHours,deliveryStages,deliveryStatuses,deliveryStatus,deliveryStage,USERS,VIEW_USERS,reviewPm,setRegionPm,regionalCandidates,transferRegionalWork,KEY,creatorInitiators,addCreatorInitiator,ensureCreatorCodes,applyConfirmedCreatorReset,statuses,proposalStages,customerAcceptanceFor,countries,platforms,migrate,projectsFor,visibleCoops,creatorResults,addProject,submitCreator,updateCoop,margin,packagePricing,setMembers,allowedActions,stages,stageOf,nextStep,isPending,inQueue,updatedInfo,summary,sortOrders,upgrade,isConfirmed,selectOrders,calendarOrders,canNote,addNote,savedViewsFor,saveView,deleteView,enablePackage,deliveryContext,orderProgress,socialAccounts,matchesAccount,creatorDeleteReason,deleteCreators,canEditCreator,saveCreatorProfile,canSetClientQuote,setClientQuote,clientQuoteHistory,canRecordCustomerOffer,canSubmitNegotiationQuote,submitNegotiationQuote,recordCustomerOffer,canReplyCreatorQuote,addCreatorQuoteReply,addFollowUp,updateReminder} from './model.mjs?v=20261019-pm-self-managed';
const root=document.getElementById('crm-preview'),content=document.getElementById('crm-content');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const money=(v,currency='CNY')=>v==null?'待确认':currency+' '+Number(v).toLocaleString();const num=v=>v==null||v===''?'待补充':Intl.NumberFormat('en',{notation:'compact'}).format(v);const userName=id=>USERS.find(u=>u.id===id)?.name||id;const now=()=>new Date().toISOString();
// This branch is an isolated simulation. Never read/reset/import production browser data.
let db,storageError='';try{const saved=localStorage.getItem(KEY);db=saved?JSON.parse(saved):migrate();if(db.version!==2||!Array.isArray(db.creators))throw Error('预览数据格式异常，已保留原存储');}catch(e){storageError=e.message;db=null;}
if(!db){content.textContent='无法加载预览数据：'+storageError;throw Error(storageError);}
if(upgrade(db)){try{localStorage.setItem(KEY,JSON.stringify(db));}catch{storageError='预览数据暂时无法保存，请检查存储空间。';}}
let user=USERS[0],page='followup',campaignId='',q='',platform='全部',country='全部',status='全部',owner='全部',campaignFilter='全部',dialog=null,tab='业务进度';
let view='list',sort='pending',showPrices=false,projectTab='orders',projectView='cards',metric='all',month=new Date().toISOString().slice(0,7),creatorReturn=null,activeView='';
let resubmissionId='',submittedProposalId='',activeDraftId='';
let drawerWide=false,creatorPageId='',creatorListState=null,acceptedHash='',creatorSubmitOpen=false,pageDirty=false;
let moreFilters=false,settingsOpen=false,minimumFollowers=0,drawerDirty=false,deliveryOrderId='';
let stage='全部',queue='mine',returnFocus=null,returnKey=null,returnLabel='',returnScroll=0;
let selectedCreators=new Set(),creatorSelectionScope='';
let workspaceViews={},drawerStack=[],drawerPeers=[],moduleOrigin=null;
try{const savedViews=JSON.parse(globalThis.sessionStorage?.getItem('solbridge-video-v06-preview-views')||'{}');if(savedViews&&typeof savedViews==='object'&&!Array.isArray(savedViews))workspaceViews=savedViews;}catch{}
const C=id=>db.creators.find(c=>c.id===id),P=id=>db.campaigns.find(p=>p.id===id);const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db));drawerDirty=false;}catch{throw Error('保存失败：浏览器存储空间不足，请保留输入后重试。');}};
let saveToastTimer;
function showSaveToast(message='已保存'){
 const toast=document.getElementById('crm-save-toast');if(!toast)return;
 clearTimeout(saveToastTimer);
 toast.textContent=message;toast.hidden=false;
 saveToastTimer=setTimeout(()=>{toast.hidden=true;toast.textContent='';},5000);
}
const input=(label,name,value='',type='text',required=true)=>'<label>'+label+(required?(label.includes('*')?'':' *'):(label.includes('选填')||label.includes('草稿')?'':'（选填）'))+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required aria-required="true"':'')+(type==='number'?' min="0" step="'+(name.startsWith('quantity')?'1':'any')+'"':'')+'></label>';
const options=(values,current)=>values.map(v=>{const [id,label]=Array.isArray(v)?v:[v,v];return '<option value="'+esc(id)+'" '+(id===current?'selected':'')+'>'+esc(label)+'</option>';}).join('');
const filter=(label,key,values,val)=>'<label>'+label+'<select data-filter="'+key+'">'+options(values,val)+'</select></label>';
function card(c,r){
 const attr='data-'+(r?'coop':'creator')+'="'+esc(r?.id||c.id)+'"';
 const related=visibleCoops(db,user).filter(x=>x.creatorId===c.id);
 const projectProgress=(r?[r]:related).map(order=>'<button class="creator-project-progress" data-coop="'+esc(order.id)+'" aria-label="查看 '+esc(P(order.campaignId)?.name||'项目')+' 合作订单"><strong>'+esc(P(order.campaignId)?.name||'项目待补充')+'</strong><span>'+esc(proposalStageOf(order))+'</span><small>'+esc(proposalStatus(order))+'</small></button>').join('')||'<p class="creator-project-empty">暂无可见项目合作</p>';
 const field=(label,value)=>'<div class="creator-line"><span>'+label+'</span><span>'+esc(value||'待补充')+'</span></div>';
 let profile='';try{const u=new URL(c.profile);if(['http:','https:'].includes(u.protocol))profile=u.href;}catch{}
 return '<article class="creator-card creator-horizontal" tabindex="0" aria-label="查看 '+esc(c.name||c.handle)+' 详情" '+attr+'><section class="creator-summary"><button class="creator-title" '+attr+'>'+esc(c.name||c.handle)+'</button><div class="creator-card-platform">'+(profile?'<a href="'+esc(profile)+'" target="_blank" rel="noopener noreferrer">'+esc(c.platform||'平台待补充')+' · '+esc(c.handle)+' ↗</a>':esc(c.platform||'平台待补充'))+'</div>'+field('达人类型',c.creatorType)+field('所在国家',c.country)+field('达人语言',c.language)+field('达人 ID',c.handle)+'</section><section class="creator-project-progress-list" aria-label="关联项目与进度">'+projectProgress+'</section><section class="creator-metrics"><span class="column-caption">联系方式与数据</span><p class="creator-email" title="'+esc(c.contact||'')+'">'+esc(c.contact||'邮箱待补充')+'</p>'+field('粉丝量',num(c.followers))+field('均播',num(c.views))+field('互动率',c.er!=null&&c.er!==''?c.er+'%':'待补充')+'</section><section class="creator-ownership">'+field('发起人',creatorInitiators(c).map(userName).join('、'))+(r?field('负责运营',userName(r.ownerId))+field('提报日期',r.submittedAt.slice(0,10)):'<p class="creator-order-count">可见订单：'+related.length+' 笔</p>')+(r?'<span class="status" data-status="'+esc(r.status)+'">'+esc(proposalStatus(r))+'</span>':'')+'</section><section class="creator-actions">'+(r?(isPending(db,user,r)?'<button class="primary next-action" '+attr+'>'+esc(nextStep(db,user,r).label)+'</button>':'<small class="muted">'+esc(nextStep(db,user,r).label)+'</small>'):'<button class="primary" data-submit-creator="'+esc(c.id)+'">提报到项目</button>')+'<button '+attr+'>'+(r?'查看订单':'查看资料')+'</button></section></article>';
}
function filtered(r){const c=C(r.creatorId);return (campaignFilter==='全部'||r.campaignId===campaignFilter)&&(owner==='全部'||r.ownerId===owner)&&(status==='全部'||r.status===status)&&(c.name+' '+c.handle+' '+(c.profile||'')).toLowerCase().includes(q.trim().toLowerCase())&&(platform==='全部'||c.platform===platform)&&(country==='全部'||c.country===country);}
function toolbar(coops=false){return FilterBar('<label>搜索达人<input id="crm-search" value="'+esc(q)+'" placeholder="名称、ID 或主页链接"></label>'+filter('平台','platform',['全部',...platforms],platform)+filter('国家','country',['全部',...new Set([...countries,...db.creators.map(c=>c.country).filter(Boolean)])],country)+(coops&&['followup','delivery'].includes(page)?filter('项目','campaignFilter',['全部',...projectsFor(db,user).map(p=>[p.id,p.name])],campaignFilter):'')+(coops?filter('具体进度','status',['全部',...moduleStatuses()],status)+filter('排序','sort',[['pending','待我处理优先'],['recent','最近更新优先']],sort):'')+(coops&&['pm','admin'].includes(user.role)?filter('负责运营','owner',['全部',...USERS.map(u=>[u.id,u.name])],owner):'')+'<button data-clear>清空筛选</button>');}
const criteria=(overrides={})=>({cooperation:page!=='delivery',q,platform,country,owner,campaignFilter,stage,status,queue,sort,metric,...overrides});
function followupControls(all,base,rows){
 const hidden=[['platform','平台',platform],['country','国家',country],['status','具体进度',status],...(['pm','admin'].includes(user.role)?[['owner','负责运营',owner]]:[])].filter(x=>x[2]!=='全部');
 const saved=savedViewsFor(db,user),active=saved.find(v=>v.id===activeView),current={...criteria(),view,showPrices};
 const modified=active&&Object.keys(current).some(k=>current[k]!==({...criteria({q:'',platform:'全部',country:'全部',owner:'全部',campaignFilter:'全部',stage:'全部',status:'全部',queue:'mine',sort:'pending',metric:'all'}),view:'list',showPrices:false,...active.config})[k]);
 return '<section class="compact-controls" aria-label="提报筛选"><div class="compact-top"><div class="queue-tabs">'+[['mine','待我处理'],['others','等待他人'],['all','全部提报'],['today','今日待跟进'],['overdue','已逾期']].map(([key,label])=>'<button data-queue="'+key+'" aria-pressed="'+(queue===key)+'">'+label+' <b>'+selectOrders(db,user,criteria({queue:key,stage:'全部',metric:'all'}),all).length+'</b></button>').join('')+'</div><div class="compact-view"><div class="segmented" aria-label="查看方式">'+[['list','列表'],['board','看板'],['calendar','日历']].map(([k,l])=>'<button data-view="'+k+'" aria-pressed="'+(view===k)+'">'+l+'</button>').join('')+'</div><button data-view-settings aria-expanded="'+settingsOpen+'" aria-controls="view-settings">视图设置'+(active?' · '+esc(active.name)+(modified?' · 已修改':''):'')+'</button></div></div>'
 +'<div class="stage-tabs" aria-label="合作阶段">'+moduleStages().map(t=>'<button data-stage="'+t+'" aria-pressed="'+(stage===t)+'">'+t+' <span>'+(page==='followup'&&['已完成','已取消'].includes(t)?selectOrders(db,user,criteria({queue:'all',stage:t,status:'全部',metric:'all'}),all).length:base.filter(r=>t==='全部'||proposalStageOf(r)===t).length)+'</span></button>').join('')+'</div>'
 +'<div class="compact-search"><input id="crm-search" aria-label="搜索达人" value="'+esc(q)+'" placeholder="搜索名称、ID 或主页链接"><select data-filter="campaignFilter" aria-label="项目">'+options([['全部','全部项目'],...projectsFor(db,user).map(p=>[p.id,p.name])],campaignFilter)+'</select><button data-more-filters aria-expanded="'+moreFilters+'" aria-controls="more-filters">更多筛选'+(hidden.length?' · '+hidden.length:'')+'</button><span class="compact-result">'+rows.length+' 条提报</span>'+((q||campaignFilter!=='全部'||stage!=='全部'||hidden.length)?'<button data-clear>清空</button>':'')+'</div>'
 +(moreFilters?'<div id="more-filters" class="compact-extra">'+filter('平台','platform',['全部',...platforms],platform)+filter('国家','country',['全部',...new Set([...countries,...db.creators.map(c=>c.country).filter(Boolean)])],country)+filter('具体进度','status',['全部',...moduleStatuses()],status)+(['pm','admin'].includes(user.role)?filter('负责运营','owner',['全部',...USERS.map(u=>[u.id,u.name])],owner):'')+'</div>':'')
 +(!moreFilters&&hidden.length?'<div class="filter-chips">'+hidden.map(([k,l,v])=>'<button data-remove-filter="'+k+'" aria-label="移除'+l+'筛选">'+l+'：'+esc(k==='owner'?userName(v):v)+' ×</button>').join('')+'</div>':'')
 +(settingsOpen?'<div id="view-settings" class="compact-settings" role="region" aria-label="视图设置">'+filter('排序','sort',[['pending','待我处理优先'],['recent','最近更新优先']],sort)+(view==='list'?'<label class="inline-check"><input type="checkbox" data-prices '+(showPrices?'checked':'')+'>显示报价列</label>':'')+'<div class="compact-saved"><strong>已保存视图</strong>'+saved.map(v=>'<button data-load-view="'+esc(v.id)+'">'+esc(v.name)+'</button>').join('')+(!saved.length?'<small>暂无已保存视图</small>':'')+'</div><button data-save-view>保存当前视图</button><button data-manage-views>管理视图</button></div>':'')+'</section>';
}
function stageTabs(rows){return '<div class="stage-tabs" aria-label="合作阶段">'+proposalStages.map(t=>{const subset=rows.filter(r=>t==='全部'||proposalStageOf(r)===t),pending=subset.filter(r=>isPending(db,user,r)).length;return '<button data-stage="'+t+'" aria-pressed="'+(stage===t)+'">'+t+' <span>'+subset.length+'</span>'+(pending?'<small title="待我处理">'+pending+'</small>':'')+'</button>';}).join('')+'</div>';}
function empty(message){return '<div class="ds-empty"><strong>'+message+'</strong><p>可以调整筛选条件，或切换查看范围。</p><button data-clear>清空筛选</button></div>';}
function render(){
 const focused=document.activeElement,focusKey=focused?.dataset?.filter,priceFocused=focused?.hasAttribute?.('data-prices');
 const view=page+'/'+campaignId,same=content.dataset.view===view;
 const scrolls=[...content.querySelectorAll('.order-scroll,.ds-data-scroll,.board-scroll,.calendar-scroll')].map(el=>el.scrollLeft);
 const draft=pageDirty?captureSubmissionDraft():null;
 renderContent();restoreSubmissionDraft(draft);content.dataset.view=view;
 if(priceFocused)content.querySelector('[data-prices]')?.focus({preventScroll:true});
 if(focusKey)content.querySelector('[data-filter="'+focusKey+'"]')?.focus({preventScroll:true});
 if(same)content.querySelectorAll('.order-scroll,.ds-data-scroll,.board-scroll,.calendar-scroll').forEach((el,i)=>el.scrollLeft=scrolls[i]||0);rememberWorkspace();
}
function renderContent(){root.classList.add('ds-projects');root.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===page)));document.getElementById('crm-title').textContent={creators:'达人管理',projects:'项目管理',followup:'提报跟进',delivery:'视频交付'}[page];
 if(page==='delivery'){renderDelivery();return;}
 if(page==='projects'){renderProjects(projectsFor(db,user));return;}
 if(page==='creators'){if(creatorPageId)renderCreatorPage();else renderCreatorTable();return;}

 const all=proposalRows(),base=selectOrders(db,user,criteria({stage:'全部'}),all),rows=selectOrders(db,user,criteria(),all);
 content.innerHTML=handoffResultsPanel()+draftList()+followupControls(all,base,rows)+orderView(rows,view);
}

function reset(){selectedCreators.clear();creatorSelectionScope='';deliveryOrderId='';minimumFollowers=0;moreFilters=false;settingsOpen=false;view='list';sort='pending';showPrices=false;projectTab='orders';projectView='cards';metric='all';activeView='';creatorReturn=null;stage='全部';queue='mine';q='';platform=country=status=owner=campaignFilter='全部';campaignId='';}
function close(force=false){if(dialog?.kind==='orderPrompt'&&drawerStack.length){returnToSource();return;}const savedCreatorId=dialog?.kind==='creatorSaved'?dialog.id:null;drawerDirty=false;drawerStack=[];drawerPeers=[];if(!root.querySelector('.detail-drawer'))return;creatorReturn=null;root.querySelector('.detail-drawer').remove();root.querySelector('.drawer-backdrop')?.remove();root.querySelector('main').inert=false;root.querySelector('header').inert=false;document.body.style.overflow='';dialog=null;window.scrollTo(0,returnScroll);const target=returnFocus?.isConnected?returnFocus:returnKey?[...root.querySelectorAll('button,.creator-card,tr[data-detail-row]')].find(el=>el.getAttribute(returnKey[0])===returnKey[1]&&el.textContent===returnLabel)||[...root.querySelectorAll('button,.creator-card,tr[data-detail-row]')].find(el=>el.getAttribute(returnKey[0])===returnKey[1]):null;(target||(page==='followup'?root.querySelector('[data-view-settings]'):null)||root.querySelector('[data-page="'+page+'"]'))?.focus({preventScroll:true});returnFocus=null;if(savedCreatorId&&!force)highlightNewCreator(savedCreatorId);}
function drawerFocusKey(el){
 const attributes=[...el?.attributes||[]].filter(a=>a.name.startsWith('data-'));
 const identity=attributes.find(a=>['data-coop','data-creator','data-creator-page','data-submit-creator'].includes(a.name))||attributes.find(a=>a.name!=='data-detail-row');
 return identity?[identity.name,identity.value]:undefined;
}
function panel(title,body,compactHeader=''){
 drawerDirty=false;
 const previous=root.querySelector('.detail-drawer'),tabFocus=document.activeElement?.hasAttribute('data-tab');
 if(!previous){returnFocus=document.activeElement;returnLabel=returnFocus?.textContent||'';returnKey=drawerFocusKey(returnFocus);returnScroll=window.scrollY;}
 previous?.remove();root.querySelector('.drawer-backdrop')?.remove();
 const backdrop=document.createElement('button');backdrop.className='drawer-backdrop';backdrop.setAttribute('data-close','');backdrop.setAttribute('tabindex','-1');backdrop.setAttribute('aria-label','关闭详情');root.append(backdrop);
 const modal=['new','creatorSaved','duplicateProposal','orderPrompt'].includes(dialog?.kind);
 const el=document.createElement('section');el.className='detail-drawer'+(modal?' creator-modal'+(dialog.kind==='creatorSaved'?' creator-saved-modal':''):(drawerWide?' is-wide':''));el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',title);
 el.innerHTML='<div class="drawer-head">'+(compactHeader||'<strong>'+esc(title)+'</strong>')+'<div class="drawer-head-actions"><button data-drawer-width aria-pressed="'+drawerWide+'">'+(drawerWide?'收窄':'展开')+'</button>'+(modal?'':drawerPeerNavigation())+'<button data-close aria-label="关闭详情">✕</button></div></div>'+drawerNavigation()+'<p id="dialog-message" role="status" aria-live="polite"></p><div class="profile-main">'+body+'</div>';
 if(page==='delivery'&&dialog?.kind==='coop'){el.classList.remove('is-wide');el.querySelector('[data-drawer-width]')?.remove();}
 if(compactHeader){el.classList.add('proposal-drawer','workflow-drawer');el.classList.remove('is-wide');el.querySelector('[data-drawer-width]')?.remove();}
 const tabs=el.querySelector('.detail-tabs');if(tabs)el.insertBefore(tabs,el.querySelector('#dialog-message'));
 if(modal){el.querySelector('[data-drawer-width]')?.remove();el.querySelector('.drawer-navigation')?.remove();}
 root.append(el);root.querySelector('main').inert=true;root.querySelector('header').inert=true;document.body.style.overflow='hidden';
 ((modal?el.querySelector('input,[data-submit-creator]'):null)||(tabFocus?el.querySelector('.detail-tabs [aria-pressed="true"]'):null)||el.querySelector('[data-close]'))?.focus();
}

const safeLink=(url,label)=>{try{const u=new URL(url);if(['http:','https:'].includes(u.protocol))return '<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(label||url)+'</a>';}catch{}return esc(url||'待补充');};
const formError=()=>'<p class="workflow-form-error" data-form-error role="alert" hidden></p>';
const form=(kind,id,body,button)=>'<form autocomplete="off" data-kind="'+kind+'" data-id="'+esc(id)+'">'+formError()+'<div class="grid">'+body+'</div><div class="actions"><button class="primary">'+button+'</button></div></form>';
function workflowError(target,error){
 const f=target?.matches?.('form')?target:target?.closest?.('form');
 const inline=f?.querySelector?.('[data-form-error]')||target?.closest?.('[data-workflow-section]')?.querySelector('[data-operation-error]');
 const message=inline||document.getElementById(['submit','reopenSubmission'].includes(f?.dataset.kind)?'submission-message':'dialog-message')||document.getElementById('crm-feedback');
 message.dataset.error='true';message.textContent=error.message;if(inline)inline.hidden=false;
}
function workflowSection(key,title,body,classes=''){
 return '<section class="creator-section '+classes+'" data-workflow-section="'+key+'">'+(title?'<h3>'+title+'</h3>':'')+'<p class="workflow-form-error" data-operation-error role="alert" hidden></p>'+body+'</section>';
}
function basic(c){return '<div class="profile-hero"><span class="avatar">'+esc(c.name[0])+'</span><div><h2>'+esc(c.name)+'</h2><span class="muted">'+esc(c.handle)+'</span></div></div><div class="profile-stats"><div>粉丝量<strong>'+num(c.followers)+'</strong></div><div>均播<strong>'+num(c.views)+'</strong></div><div>互动率<strong>'+esc(c.er!=null&&c.er!==''?c.er+'%':'待补充')+'</strong></div></div><div class="grid"><p>平台：'+esc(c.platform||'待补充')+'</p><p>国家 / 语言：'+esc(c.country||'待补充')+' / '+esc(c.language||'待补充')+'</p><p>联系方式：'+esc(c.contact||'待补充')+'</p><p>主页：'+safeLink(c.profile)+'</p><p>录入人：'+esc(creatorInitiators(c).map(userName).join('、'))+'</p></div>';}
function creatorProfileBody(id,submissionHTML='',basicOnly=false){
 const c=C(id);if(!c)return;
 const related=visibleCoops(db,user).filter(r=>r.creatorId===id);
 const field=(label,value)=>'<div><dt>'+label+'</dt><dd class="'+(value?'':'is-missing')+'">'+esc(value||'待补充')+'</dd></div>';
 const metrics=[['已录入账号',socialAccounts(c).length],...(!basicOnly?[['关联合作',related.length]]:[]),['数据状态',socialAccounts(c).some(a=>a.updatedAt)?'已更新':'待更新']];
 const body='<section class="creator-summary-panel" aria-label="'+esc(c.name||c.handle)+' 概览"><div class="creator-summary-heading"><div class="creator-summary-title"><h1>'+esc(c.name||c.handle)+'</h1><span class="creator-display-code">ID '+esc(c.displayCode||c.id)+'</span><span class="platform-chip">多平台档案</span></div>'+(canEditCreator(db,user,c)?'<button data-edit-creator="'+esc(c.id)+'">编辑资料</button>':'')+'</div><dl class="creator-summary-facts">'+field('所在国家',c.country)+field('达人语言',c.language)+field('达人类型',c.creatorType)+field('发起人',creatorInitiators(c).map(userName).join('、'))+field('联系邮箱',c.contact)+'</dl><div class="creator-summary-accounts">'+socialAccounts(c).map(a=>'<div class="creator-summary-account"><strong>'+esc(a.platform)+'</strong><span class="summary-account-link">'+(a.url?safeLink(a.url,(a.handle||'主页')+' ↗'):esc(a.handle||'待补充'))+'</span><span>粉丝 '+esc(num(a.followers))+'</span><span>均播 '+esc(num(a.views))+'</span><small>更新 '+esc(a.updatedAt?new Date(a.updatedAt).toLocaleDateString('zh-CN'):'待补充')+'</small></div>').join('')+'</div><div class="creator-summary-status">'+metrics.map(([label,value])=>'<span>'+label+' <b>'+esc(value)+'</b></span>').join('')+'</div></section>'
 +submissionHTML+(basicOnly?'':'<section class="creator-section"><div class="section-heading"><h3>关联合作</h3><span>'+related.length+' 笔可见合作</span></div>'+(related.length?'<div class="creator-projects">'+related.map(r=>'<button data-coop="'+esc(r.id)+'"><span><strong>'+esc(P(r.campaignId).name)+'</strong><small>负责运营 · '+esc(userName(r.ownerId))+'</small><small>'+esc(proposalStageOf(r))+' · '+esc(nextStep(db,user,r).label)+'</small></span><span class="status" data-status="'+esc(r.status)+'">'+esc(proposalStatus(r))+'</span><span aria-hidden="true">›</span></button>').join('')+'</div>':'<p class="creator-empty">暂无你可查看的合作记录，可提报到参与的项目。</p>')+'</section>');
 return body;
}
function creatorDrawerBody(c,section=''){
 const editable=canEditCreator(db,user,c),accounts=socialAccounts(c);
 const field=(label,value,full=false)=>'<div class="'+(full?'full':'')+'"><dt>'+label+'</dt><dd>'+esc(value||'待补充')+'</dd></div>';
 const actors=[...new Set(db.collaborations.filter(r=>r.creatorId===c.id).map(r=>r.submittedBy||r.ownerId))];
 const edit=(part,label)=>editable?'<button type="button" data-creator-section="'+part+'" data-creator-id="'+esc(c.id)+'"'+(part==='basic'?' class="creator-basic-edit-icon" title="编辑基础信息" aria-label="编辑基础信息"':'')+'>'+(part==='basic'?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5M3 22h18"/></svg>':label)+'</button>':'';
 const cancel='<button type="button" data-creator-section="view" data-creator-id="'+esc(c.id)+'">取消</button>';
 let basic=field('国家',c.country)+field('语言',c.language)+field('类型',c.creatorType)+field('邮箱',c.contact,true)+field('备注',c.notes,true);
 if(section==='basic'&&editable)basic=form('creatorBasic',c.id,input('国家','country',c.country,'text',false)+input('语言','language',c.language,'text',false)+input('类型','creatorType',c.creatorType||'','text',false)+input('邮箱','contact',c.contact||'','email',false)+'<label class="full">备注<textarea name="notes" rows="2">'+esc(c.notes||'')+'</textarea></label>','保存基础信息').replace('<div class="actions">','<div class="actions">'+cancel);
 else basic='<dl class="creator-facts compact-facts">'+basic+'</dl>';
 const addAccount=section==='add-account'&&editable?form('creatorAccountAdd',c.id,'<label class="full">主页链接 *<input name="profile" data-add-account-link autocomplete="off" required placeholder="粘贴 TikTok、Instagram 或 YouTube 主页链接"></label><p class="full scope-note" data-add-account-status role="status">自动识别平台与 Handle；粉丝量、均播按 k 填写。</p>'+input('粉丝量（k）','followers','','number',false)+input('均播（k）','views','','number',false),'保存账号').replace('<div class="actions">','<div class="actions">'+cancel):'';

 return '<div class="compact-identity"><div class="compact-name"><h2>'+esc(c.name||c.handle)+'</h2><small> ID '+esc(c.displayCode||c.id)+'</small></div><dl class="compact-people">'+field('发起人',creatorInitiators(c).map(userName).join('、'))+(actors.length?field('提报人',actors.map(userName).join('、')):'')+'</dl></div><section class="creator-section compact-section compact-basic"><div class="section-heading"><h3>基础信息</h3>'+edit('basic','编辑基础信息')+'</div>'+basic+'</section><section class="creator-section compact-section"><div class="section-heading"><h3>账号信息</h3>'+edit('add-account','＋ 添加账号')+'</div>'+addAccount+accounts.map((a,i)=>{
 const header='<div class="section-heading"><strong>'+esc(a.platform)+' · '+(a.url?safeLink(a.url,(a.handle||'主页')+' ↗'):esc(a.handle||'待补充'))+'</strong>'+edit('account-'+i,'编辑')+'</div>';
 if(section==='account-'+i&&editable)return '<div class="compact-account">'+header+form('creatorAccount',c.id,'<input type="hidden" name="accountIndex" value="'+i+'">'+input('Handle','handle',a.handle)+input('主页链接','url',a.url||'','url')+input('粉丝','followers',a.followers??'','number',false)+input('均播','views',a.views??'','number',false),'保存账号').replace('<div class="actions">','<div class="actions">'+cancel)+'</div>';
 return '<div class="compact-account">'+header+'<p>粉丝 '+esc(a.followers==null?'待补充':num(a.followers))+' <span>均播 '+esc(a.views==null?'待补充':num(a.views))+'</span></p><small>数据更新：'+esc(a.updatedAt?new Date(a.updatedAt).toLocaleDateString('zh-CN'):'待补充')+'</small></div>';
 }).join('')+'</section>';
}
function creatorDetail(id,section=''){
 const c=C(id);if(!c)return;
 dialog={kind:'creator',id};panel('达人基础信息',creatorDrawerBody(c,section));
 const drawer=root.querySelector('.detail-drawer');drawer.classList.add('creator-profile-drawer');drawer.classList.remove('is-wide');drawer.querySelector('[data-drawer-width]')?.remove();
 const footer=document.createElement('div');footer.className='creator-profile-footer';footer.innerHTML='<button class="primary" data-submit-creator="'+esc(id)+'">提报</button>';drawer.append(footer);
}
function renderCreatorPage(){
 const c=C(creatorPageId);
 const back='<button data-creators-back>← 返回达人列表</button>';
 if(!c){content.innerHTML=back+'<section class="ds-empty"><h2>达人不存在</h2><p>该记录不存在或已移除。</p></section>';return;}
 content.innerHTML='<article class="creator-detail-page">'+back+'<div class="creator-page-body">'+creatorProfileBody(c.id,creatorSubmitOpen?'<section class="creator-section creator-submission" aria-label="提报到项目"><div class="section-heading"><h3>提报到项目</h3><button data-cancel-submission>收起</button></div>'+submissionForm(c.id)+'<p id="submission-message" role="status" aria-live="polite"></p></section>':'<section class="creator-section creator-submission"><div class="section-heading"><h3>提报到项目</h3><button data-submit-creator="'+esc(c.id)+'">展开提报表单</button></div></section>')+'</div></article>';
 const saved=draftForCreator(c.id);if(saved&&creatorSubmitOpen)restoreSubmissionDraft({id:c.id,fields:saved.fields});
 content.querySelectorAll('.resource-accounts').forEach(el=>el.open=true);
}
function creatorRoute(hash){if(hash==='#creators')return '';if(hash.startsWith('#creators/')){try{return decodeURIComponent(hash.slice(10).replace(/\/submit$/,''));}catch{return '__invalid__';}}return null;}
function openCreatorPage(id,submit=false,rejectedId='',draftId=''){activeDraftId=draftId;
 if(!confirmDiscard())return;
 if(!creatorPageId){creatorListState=page==='creators'?workspaceState():workspaceViews[user.id+'/creators'];rememberWorkspace();}
 resubmissionId=rejectedId;submittedProposalId='';close(true);creatorPageId=id;creatorSubmitOpen=submit;pageDirty=false;page='creators';
 const hash='#creators/'+encodeURIComponent(id)+(submit?'/submit':'');window.history.pushState(null,'',hash);acceptedHash=hash;render();window.scrollTo(0,0);if(submit)focusSubmission();
}
function backToCreators(){
 if(!confirmDiscard())return;const previous=creatorPageId;close(true);creatorPageId='';creatorSubmitOpen=false;pageDirty=false;page='creators';
 const state=creatorListState||workspaceViews[user.id+'/creators'];applyWorkspace(state);window.history.pushState(null,'','#creators');acceptedHash='#creators';render();restoreScroll(state);
 [...content.querySelectorAll('[data-creator]')].find(el=>el.dataset.creator===previous)?.focus({preventScroll:true});
}
function syncCreatorRoute(){
 const hash=window.location.hash;if(hash===acceptedHash)return;
 if(pageDirty)pendingLeave=()=>{window.location.hash=hash;};if(!confirmDiscard()){window.history.pushState(null,'',acceptedHash||window.location.pathname+window.location.search);return;}
 const id=creatorRoute(hash);close(true);creatorSubmitOpen=Boolean(id&&hash.endsWith('/submit'));pageDirty=false;
 if(id!==null){if(!creatorPageId){creatorListState=workspaceViews[user.id+'/creators']||workspaceState();}creatorPageId=id;page='creators';if(!id)applyWorkspace(creatorListState);render();if(id)window.scrollTo(0,0);else restoreScroll(creatorListState);}
 else {creatorPageId='';const target=hash.slice(1);page=['followup','delivery','projects'].includes(target)?target:'creators';const state=page==='creators'?creatorListState:workspaceViews[user.id+'/'+page];applyWorkspace(state);render();restoreScroll(state);}
 acceptedHash=hash;
}
function creatorSubmissionFacts(c){
 return '<section class="creator-section"><h3>达人信息</h3><dl class="creator-facts"><div><dt>达人昵称</dt><dd>'+esc(c.name||'待补充')+'</dd></div><div><dt>邮箱</dt><dd>'+esc(c.contact||'待补充')+'</dd></div></dl>'+platforms.filter(p=>socialAccounts(c).some(a=>a.platform===p&&(a.handle||a.url))).map(p=>'<div class="account-profile"><strong>'+p+'</strong>'+operatorAccountCell(c,p,true)+'</div>').join('')+'</section>';
}
function rejectionButtons(r){const a=allowedActions(db,user,r);return '<div class="resubmit-proposal">'+(a.reopenSubmission?'<button class="primary" data-resubmit-proposal="'+esc(r.id)+'">重新提报</button>':'')+(a.acknowledgeRejection?'<button data-action="acknowledgeRejection" data-coop-id="'+esc(r.id)+'">确认结束</button>':'')+'</div>';}
function submissionDecisionPanel(r){
 if(r.status==='不予提报')return '<section class="creator-section submission-decision"><h3>审核未通过 · 待运营处理</h3><p class="preserve-text">'+esc(r.closeReason||'原因未记录')+'</p></section>'+(allowedActions(db,user,r).reopenSubmission?rejectionButtons(r):'');
 if(!allowedActions(db,user,r).reject)return '';
 return '<section class="creator-section submission-decision" data-workflow-section="submission"><p class="workflow-form-error" data-operation-error role="alert" hidden></p>'+(allowedActions(db,user,r).approve?form('approve',r.id,'<label>整包对客报价（'+esc(r.currency||'CNY')+'） *<input name="clientQuote" type="number" min="0.01" step="0.01" required placeholder="填写报价，审核后保存为草稿"></label><label>合作条件（选填）<input name="quoteNote" maxlength="1000" placeholder="填写本次报价包含的条件"></label>','审核通过并保存报价'):'')+'<button type="button" data-show-rejection aria-expanded="false" aria-controls="rejection-reason">确认不提报</button><div id="rejection-reason" hidden>'+form('reject',r.id,'<label class="full">不提报原因 *<textarea name="reason" required maxlength="1000" rows="2" placeholder="填写不符合项目要求的原因"></textarea></label>','提交不提报原因')+'</div></section>';
}
function confirmationQuoteDetails(note){return '<div class="confirmation-quote-details"><strong>报价详情</strong><p class="preserve-text">'+esc(String(note??'').trim()||'未填写报价详情')+'</p></div>';}
function customerAcceptancePanel(r){
 const a=allowedActions(db,user,r),v=r.proposalVersions?.at(-1);
 if(v){
  const creator=r.creatorVersionId===v.id,client=customerAcceptanceFor(r),complete=creator&&Boolean(client);
  const editable=(a.customerAccept||a.agree)&&(!r.clientQuoteDraft||clientQuoteHistory(r).length>0),recovery=!client&&r.preliminaryVersionId===v.id;
  if(!client&&!creator&&!editable&&!recovery)return '';
  const title=complete?'双方已确认合作':editable?(recovery?'补登客户确认':'客户确认'):'合作确认';
  const status=complete?'达人与客户已确认当前方案。':creator?'达人已确认方案，待客户确认。':client?'客户确认总价 '+esc(money(client.clientPrice,v.currency))+'，待负责人向达人确认。':'达人与客户均待确认。';
  let body=editable&&!recovery?'':'<h4>'+title+'</h4><p class="confirmation-status">'+status+'</p>';
  if(client)body+=confirmationQuoteDetails(client.note);
  if(a.confirmAndCreateOrder)body+='<button type="button" class="primary" data-action="confirmAndCreateOrder" data-coop-id="'+esc(r.id)+'">创建订单</button><p class="scope-note">创建订单即确认达人接受当前方案，将生成 '+v.items.reduce((sum,item)=>sum+item.quantity,0)+' 条视频交付记录。</p>';
  if(editable){
   const scope=v.items.map(item=>item.platform+' '+item.type+' × '+item.quantity).join('；');
   const cost=packagePricing(r).cost;
   const reference='<p class="confirmation-scope">本次确认：'+esc(scope)+' · 合作价 '+esc(money(cost,v.currency))+(v.rights?.trim()?' · '+esc(v.rights.trim()):'')+'</p>';
   const fields='<label>客户确认总价（'+esc(v.currency||r.currency||'CNY')+'） *<input name="clientPrice" type="number" min="0.01" step="0.01" required aria-required="true" placeholder="填写客户最终接受的整包金额"></label><label>报价详情（选填）<textarea name="reason" rows="3" placeholder="填写本次报价对应的视频数量、分发要求、权益等说明"></textarea></label>';
   const editor=reference+'<p class="confirmation-hint">报价对应的数量、分发或权益要求可填写在报价详情中，由负责人核对处理；视频条数由负责人在合作详情中自行修改。</p>'+form(a.customerAccept?'customerAccept':'agree',r.id,fields,creator?'确认客户接受':(isSelfManagedPm(db,user,r)?'确认客户接受，继续确认达人并建单':'确认并移交运营'));
   body+=r.status==='待客户确认'&&!canSubmitNegotiationQuote(db,user,r)?'<div class="customer-confirmation-editor">'+editor+'</div>':'<details class="customer-acceptance"><summary>客户接受报价</summary><div class="customer-confirmation-editor">'+editor+'</div></details>';
  }
  if(!creator&&client&&!a.confirmAndCreateOrder&&!editable)body+='<p class="scope-note">等待负责人向达人确认后创建订单。</p>';
  if(recovery)body+='<p class="scope-note">当前方案的客户确认记录待补充，请由负责 PM 登记。</p>';
  if(creator&&!client&&!editable)body+='<p class="scope-note">等待负责 PM 登记客户同意当前方案。</p>';
  if(proposalStageOf(r)==='已完成')body+=r.orderId?'<p>订单已创建 · '+esc(orderNumber(db,r.orderId))+'</p>':cooperationStageControl(r)+'<p class="scope-note">双方已确认，点击“已完成”可选择是否创建订单。</p>';
  return '<section class="customer-confirmation'+(complete?' is-complete':'')+'" aria-label="合作确认">'+body+'</section>';
 }
 const missingAcceptance=r.proposalVersions&&r.status==='待达人确认'&&!customerAcceptanceFor(r);
 if(a.agree&&!a.customerAccept)return '<details class="customer-acceptance"><summary>'+ (missingAcceptance?'补登客户确认':'客户确认合作') +'</summary><p class="scope-note">'+(missingAcceptance?'历史记录缺少当前方案的客户确认，请登记实际客户确认后交运营处理。':'登记客户实际接受的价格，交由运营确认达人。')+'</p>'+form('agree',r.id,input('客户确认价格（'+(r.currency||'CNY')+'）','clientPrice',r.clientPrice??'','number')+input('确认备注','reason','','text',false),'登记客户确认并移交运营')+'</details>';
 if(missingAcceptance&&!a.customerAccept)return '<p class="scope-note">当前方案的客户确认记录待补充，请由负责 PM 登记后再确认达人合作。</p>';
 if(a.customerAccept)return '<details class="customer-acceptance"><summary>客户确认合作</summary><p class="scope-note">客户已接受价格，可直接推进合作，无需完成三轮议价。</p>'+form('customerAccept',r.id,input('客户确认价格（'+(r.currency||'CNY')+'）','clientPrice','','number')+input('确认备注','reason','','text',false),'确认合作并移交运营')+'</details>';
 if(!r.customerAcceptedAt&&!a.confirm)return '';

 const canCreate=Boolean(v&&a.confirmAndCreateOrder);
 const confirmation=canCreate?'<button type="button" class="primary" data-action="confirmAndCreateOrder" data-coop-id="'+esc(r.id)+'">创建订单</button>':!v&&a.confirm?'<div class="creator-confirmation"><button type="button" class="primary" data-show-creator-confirmation aria-expanded="false">达人已确认合作</button><div class="creator-confirmation-form" hidden><p class="scope-note">确认达人已接受当前合作条件。</p>'+form('confirm',r.id,'<input type="hidden" name="final" value="'+esc(r.initial)+'"><input type="hidden" name="rights" value="'+esc(r.rights??'')+'">'+input('预计发布日期','date',r.date||'','date'),'确认达人合作')+'</div></div>':'';
 return '<section class="customer-accepted"><strong>客户已确认合作 · '+esc(money(r.effectivePricing?.clientPrice??r.clientPrice??clientQuoteHistory(r).at(-1)?.amount??r.clientQuoteDraft?.amount,r.currency))+'</strong>'+(r.customerAcceptanceNote?'<p class="preserve-text">'+esc(r.customerAcceptanceNote)+'</p>':'')+confirmation+'</section>';
}
function proposalEndPanel(r){
 const a=allowedActions(db,user,r);
 const branches=[['decline','客户不合作'],['creatorDecline','达人不合作'],['cancel','其他原因取消']].filter(([key])=>a[key]);
 return branches.length?'<details class="alternate-actions cooperation-cancel"><summary>取消此次合作</summary>'+form('cancelCooperation',r.id,'<label class="full">取消类型 *<select name="cancelType" required><option value="">请选择取消类型</option>'+branches.map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select></label><label class="full">取消原因 *<textarea name="reason" required maxlength="1000" rows="2" placeholder="简要说明取消原因"></textarea></label>','确认取消合作')+'</details>':'';
}
function quoteProgress(r,count){
 if(r.status==='待 PM 审核')return '等待 PM 审核提报。';
 if(r.status==='待 PM 反馈')return canSubmitNegotiationQuote(db,user,r)?'可继续对客报价，或登记客户确认合作。':'等待 PM 与客户沟通。';
 if(r.status==='待运营议价')return canReplyCreatorQuote(db,user,r)?'客户还价已登记，请与达人沟通后提交回价。':'等待运营与达人沟通后回价。';
 if(r.status==='议价待客户确认')return '第 '+count+' 轮对客报价已提交，等待客户回复。';return '';
}
function clientQuotePanel(r,showProgress=true,compactTodo=false){
 const quotes=clientQuoteHistory(r),actions=allowedActions(db,user,r),currency=r.currency||'CNY';
 const rank={pm:0,customer:1,operator:2};
 const records=[...quotes.map(x=>({...x,side:'pm'})),...(r.creatorQuoteReplies||[]).map(x=>({...x,side:'operator'})),...(r.customerOffers||[]).map(x=>({...x,side:'customer'}))].sort((a,b)=>(a.round||0)-(b.round||0)||rank[a.side]-rank[b.side]||(Date.parse(a.at)||0)-(Date.parse(b.at)||0));
 const submitted=r.proposalVersions?.[0];
 if(submitted)records.unshift({side:'submission',round:0,amount:submitted.total,currency:submitted.currency,at:submitted.at,by:submitted.by||r.submittedBy||r.ownerId,note:[(submitted.items||[]).map(x=>x.quantity+' × '+x.platform+' '+x.type).join('、'),submitted.rights,submitted.cooperationNotes].filter(Boolean).join(' · ')});
 const latestRound=Math.max(0,...records.map(x=>x.round||0));
 const entries=rows=>rows.map(x=>'<article class="quote-entry '+(x.side==='operator'?'quote-reply':x.side==='customer'?'quote-customer':x.side==='submission'?'quote-submission':'')+'"><span class="quote-badge">'+(x.side==='submission'?'提报报价':x.side==='pm'?'对客报价 R'+x.round:x.side==='customer'?'客户还价 R'+x.round:'运营回价'+(x.round?' R'+x.round:''))+'</span><div class="quote-entry-body"><p><strong>'+esc(money(x.amount,x.currency))+'</strong>'+(x.note?' · <span>'+esc(x.note)+'</span>':'')+'</p><small class="quote-author">'+(x.side==='customer'?'登记人：':'操作人：')+esc(x.by?userName(x.by):'未记录')+'</small></div><small class="quote-time">'+esc(drawerStamp(x.at))+'</small></article>').join('');
 const latest=records.filter(x=>(x.round||0)===latestRound);
 const quoteDraft=r.clientQuoteDraft?.versionId===r.proposalVersions?.at(-1)?.id?r.clientQuoteDraft:null;
 const inputForm=(kind,label)=>'<form autocomplete="off" class="quote-composer" data-kind="'+kind+'" data-id="'+esc(r.id)+'">'+formError()+'<label><span>'+label+' · '+esc(currency)+' · R'+(kind==='negotiationQuote'?quotes.length+1:quotes.length)+'</span><input name="clientQuote" type="number" min="0.01" step="0.01" required value="'+esc(kind==='negotiationQuote'&&quotes.length===0?quoteDraft?.amount??'':'')+'" placeholder="填写整包金额" aria-label="'+label+'金额"></label><label><span>合作条件 / 备注（选填）</span><input name="quoteNote" maxlength="1000" value="'+esc(kind==='negotiationQuote'&&quotes.length===0?quoteDraft?.note??'':'')+'" placeholder="视频数量、授权或其他说明"></label><button class="primary" type="submit">'+(kind==='negotiationQuote'?'提交对客报价':kind==='customerOffer'?'移交运营议价':'提交达人报价')+'</button></form>';
 const counter=canRecordCustomerOffer(db,user,r)?'<details class="quote-response"><summary>录入客户还价</summary>'+inputForm('customerOffer','客户还价')+'</details>':'';
 const composer=canSubmitNegotiationQuote(db,user,r)?inputForm('negotiationQuote',quoteDraft&&!quotes.length?'对客报价草稿':r.status==='待客户确认'?'继续对客报价':'对客报价'):canReplyCreatorQuote(db,user,r)?inputForm('creatorQuoteReply','达人最新报价'):'';
 const progress=showProgress?quoteProgress(r,quotes.length):'',decisions=counter+customerAcceptancePanel(r)+proposalEndPanel(r);
 const feedback=actions.feedback&&!canSubmitNegotiationQuote(db,user,r)?'<button class="quote-feedback" data-action="feedback" data-coop-id="'+esc(r.id)+'">已反馈客户，等待最终确认</button>':'';
 return '<section class="creator-section quote-panel" data-workflow-section="quote"><div class="quote-heading"><h3>报价与议价</h3><span class="quote-round-count">对客报价 '+quotes.length+' 轮</span></div>'+(compactTodo?workflowTodo(r,false,true):'')+'<p class="workflow-form-error" data-operation-error role="alert" hidden></p>'+(r.clientQuoteNeedsReview?'<p class="scope-note">方案币种已变化，历史报价保留原币种。</p>':'')+'<div class="quote-current-round" aria-label="当前报价轮次">'+(latestRound?'<h4>第 '+latestRound+' 轮</h4>':'')+(latest.length?'<div class="quote-timeline">'+entries(latest)+'</div>':'')+(progress?'<p class="'+(quotes.length>=3?'quote-limit':!composer?'quote-waiting':'quote-progress')+'" role="status">'+esc(progress)+'</p>':'')+(composer?'<div class="quote-local-action" aria-label="本轮报价操作">'+composer+'</div>':'')+feedback+(decisions?'<div class="quote-decisions">'+decisions+'</div>':'')+'</div></section>';
}

function submission(id){if(C(id)){openCreatorPage(id,true);}}
function resubmissionFields(v){return '<h3 class="full">2 · 交付内容</h3><input type="hidden" name="compactProposal" value="3">'+platforms.map((_,i)=>{const item=v.items?.[i];return '<fieldset class="full"><div class="grid"><label>平台<select name="deliveryPlatform'+i+'">'+options(platforms,item?.platform||platforms[i])+'</select></label>'+input('内容类型','type'+i,item?.type||'reel')+input('数量（0 表示移除）','quantity'+i,item?.quantity||0,'number')+'</div>'+(item?.publicationPlatforms||[]).map(p=>'<input type="hidden" name="publication'+i+'" value="'+esc(p)+'">').join('')+'</fieldset>';}).join('')+'<h3 class="full">3 · 报价与权益</h3>'+input('方案总价','total',v.total,'number')+'<label>币种<select name="currency">'+options(['CNY','USD','EUR','GBP'],v.currency||'USD')+'</select></label>'+input('合作权益','rights',v.rights||'','text',false)+'<label class="full">合作备注<textarea name="cooperationNotes" rows="2">'+esc(v.cooperationNotes||'')+'</textarea></label>';}
function submissionForm(id){
 const done=db.collaborations.find(r=>r.id===submittedProposalId&&r.creatorId===id);if(done)return '<p role="status">已提交 · '+esc(done.proposalCode)+' · '+esc(proposalStatus(done))+'</p><button data-coop="'+esc(done.id)+'">查看提报跟进</button>';
 const rejected=db.collaborations.find(r=>r.id===resubmissionId&&r.creatorId===id);
 if(rejected&&allowedActions(db,user,rejected).reopenSubmission){const v=rejected.proposalVersions?.at(-1)||{total:rejected.initial,currency:rejected.currency,rights:rejected.rights,items:[]};return '<p class="feedback-callout">不提报原因：'+esc(rejected.closeReason||'未记录')+'</p>'+form('reopenSubmission',rejected.id,'<h3 class="full">1 · 项目信息</h3><p class="full">'+esc(P(rejected.campaignId).name)+' · '+esc(rejected.targetCountry||'未指定地区')+'</p>'+resubmissionFields(v)+input('提报说明','reason','','text',true),'提交复审');}

 const pp=projectsFor(db,user);
 return pp.length?form('submit',id,'<h3 class="full">1 · 项目信息</h3><p class="full">提报人：'+esc(userName(user.id))+'</p><label>项目 *<select name="campaignId">'+options(pp.map(p=>[p.id,p.name]),pp[0].id)+'</select></label><div class="full" data-region-fields>'+submissionRegionFields(pp[0])+'</div>'+submissionProfileFields(C(id))+creatorProposalFields(C(id))+(user.role==='pm'?input('对客报价草稿（与方案同币种）','clientQuote','','number',true):''),user.role==='pm'?'保存提报，进入正式对客报价':'提报审核').replace('</div></form>','<button type="button" data-save-proposal-draft>保存草稿</button></div></form>'):'<p>暂无可提报项目，请先由 PM 将你加入项目。</p>';
}
function focusSubmission(){const el=content.querySelector?.('.creator-submission');el?.scrollIntoView({block:'start'});el?.querySelector('select[name="campaignId"]')?.focus({preventScroll:true});}
function collapseSubmission(){
 if(!confirmDiscard())return;creatorSubmitOpen=false;pageDirty=false;
 const hash='#creators/'+encodeURIComponent(creatorPageId);window.history.replaceState(null,'',hash);acceptedHash=hash;render();
}
function captureSubmissionDraft(){
 const f=content.querySelector?.('form[data-kind="submit"]');if(!f||f.dataset.id!==creatorPageId)return null;
 return {id:f.dataset.id,fields:[...f.elements].filter(el=>el.name).map(el=>({name:el.name,value:el.value,checked:el.checked,type:el.type,disabled:el.disabled}))};
}
function restoreSubmissionDraft(draft){
 if(!draft||draft.id!==creatorPageId||!creatorSubmitOpen)return;const f=content.querySelector?.('form[data-kind="submit"]');if(!f)return;
 for(const field of draft.fields.filter(x=>/^quantity[0-2]$/.test(x.name)&&!x.disabled)){
  const index=field.name.slice(-1),row=f.querySelector('[data-delivery-row="'+index+'"]');if(!row)continue;
  row.hidden=false;row.querySelectorAll('input,select').forEach(el=>{el.disabled=el.dataset.platformAvailable==='false';});
  f.querySelector('[data-add-delivery="next"]').hidden=!f.querySelector('[data-delivery-row][hidden]');
 }
 const project=draft.fields.find(x=>x.name==='campaignId');if(project){const regions=f.querySelector('[data-region-fields]');if(regions)regions.innerHTML=submissionRegionFields(P(project.value));}
 for(const field of draft.fields){const el=[...f.elements].find(el=>el.name===field.name&&(field.type!=='checkbox'||el.value===field.value));if(el){el.value=field.value;if(field.type==='checkbox')el.checked=field.checked;}}
 f.dataset.dirty='true';
}
function creatorSavedPrompt(id){
 const c=C(id);if(!c)return;
 dialog={kind:'creatorSaved',id};drawerStack=[];drawerPeers=[];
 const available=projectsFor(db,user).length>0;
 panel('达人已保存','<div class="creator-saved-content"><span class="creator-saved-icon" aria-hidden="true">✓</span><h2>是否立即提报到项目？</h2><p><strong>'+esc(c.name||c.handle)+'</strong> · '+esc(c.handle)+'</p><p class="muted">达人已加入达人库，稍后也可以从列表中提报。</p>'+(available?'':'<p class="scope-note">暂无可参与项目，请先由 PM 将你加入项目。</p>')+'</div><div class="actions"><button data-close>'+(available?'暂不提报':'返回达人列表')+'</button>'+(available?'<button class="primary" data-submit-creator="'+esc(id)+'">去提报</button>':'')+'</div>');
}

function highlightNewCreator(id){
 const row=[...(content.querySelectorAll?.('tr[data-creator]')||[])].find(el=>el.dataset.creator===id);if(!row)return;
 row.classList.add('creator-just-added');row.scrollIntoView({block:'center'});row.focus({preventScroll:true});row.addEventListener('animationend',()=>row.classList.remove('creator-just-added'),{once:true});
}

function submissionQuoteField(campaignId){return canSetClientQuote(db,user,{campaignId})?input('对客报价（与方案同币种）','clientQuote','','number',false):'';}
function existingProposals(id,projectId){
 const all=db.collaborations.filter(r=>r.creatorId===id&&r.campaignId===projectId);
 if(!all.length)return '<p class="scope-note">该达人尚未提报到此项目。</p>';
 const mine=all.find(r=>(r.submittedBy||r.ownerId)===user.id);
 return '<div class="feedback-callout"><strong>'+ (mine?'你已提报过该达人，请通过原提报继续跟进。':'该达人已由 '+esc(userName(all[0].submittedBy||all[0].ownerId))+' 提报至「'+esc(P(projectId).name)+'」，不能重复提报。')+'</strong>'+(mine?'<p><button type="button" data-original-proposal="'+esc(mine.id)+'">查看原提报</button></p>':'')+'</div>';
}
function checkExistingProposal(id,projectId){
 if(!projectId)return false;const result=repeatPermission(db,user,id,projectId);if(result.allowed)return false;
 const message=document.getElementById('submission-message');if(message)message.textContent=result.message;return true;
}
function submissionProfileFields(c){return '<h3 class="full">正式提报资料</h3>'+[['contact','联系邮箱'],['country','国家'],['language','语言'],['creatorType','达人类型']].map(([key,label])=>input(label,key,c[key]||'',key==='contact'?'email':'text')).join('');}
function draftList(){const drafts=(db.proposalDrafts||[]).filter(d=>d.ownerId===user.id);return drafts.length?'<section class="creator-section"><h3>本人未提交草稿</h3>'+drafts.map(d=>'<button data-draft-id="'+esc(d.id)+'" data-submit-creator="'+esc(d.creatorId)+'">'+esc(C(d.creatorId)?.name)+' · '+esc(P(d.campaignId)?.name)+' · 恢复草稿</button>').join('')+'</section>':'';}
function persistSubmissionDraft(){
 const captured=captureSubmissionDraft();if(!captured)throw Error('当前没有可保存的新提报草稿');
 const before=structuredClone(db);try{const project=captured.fields.find(f=>f.name==='campaignId')?.value;saveProposalDraft(db,user,captured.id,project,captured.fields);save();pageDirty=false;}catch(e){db=before;throw e;}
}

function projectForm(id){const p=id?P(id):null;if(!['pm','admin'].includes(user.role)||p&&user.role!=='admin'&&p.pmId!==user.id)return;dialog={kind:'project',id};panel(p?'管理成员 · '+p.name:'新建 campaign',form(p?'members':'project',id||'',(p?'':input('Campaign 名称','name')+input('客户','client')+input('项目要求（选填）','requirements','','text',false))+'<fieldset class="full"><legend>参与运营</legend>'+USERS.filter(u=>u.role==='operator').map(u=>'<label class="member"><input type="checkbox" name="members" value="'+u.id+'" '+(p?.members.includes(u.id)?'checked':'')+' '+(p&&db.collaborations.some(r=>r.campaignId===p.id&&r.ownerId===u.id)?'disabled':'')+'>'+esc(u.name)+(p&&db.collaborations.some(r=>r.campaignId===p.id&&r.ownerId===u.id)?'（已有订单，不可移除）':'')+'</label>').join('')+'</fieldset>'+(p?'<p class="muted">可移除无订单的运营；已有订单的成员交接规则待确认。</p>':''),p?'保存成员':'创建 campaign'));}
function history(r){return '<h3>初始报价：'+money(r.initial,r.proposalVersions?.[0]?.currency||r.currency)+'</h3>'+r.history.map((h,i)=>'<div class="history">第 '+(i+1)+' 轮回价：'+money(h.quote)+'<p>'+esc(h.rights)+'</p></div>').join('')+'<p>最终达人报价：'+money(r.final,r.currency)+'</p>';}
function operation(r,section=''){
 const a={...allowedActions(db,user,r)};
 if(section){const keys=section==='script'?['scriptRevisionDone','scriptLink','scriptSubmit','scriptApprove','scriptSend','scriptPass','scriptReturn']:section==='video'?['videoSubmit','videoApprove','videoSend','videoPass','videoReturn']:['schedule','publish','accept','returnPublish','cancel'];for(const key of Object.keys(a))if(!keys.includes(key))a[key]=false;}
 const action=(key,label)=>'<button class="primary" data-action="'+key+'" data-coop-id="'+esc(r.id)+'">'+label+'</button>';
 const reason=(key,label)=>form(key,r.id,input('原因 / 修改意见 *','reason'),label);
 let out='';

 if(a.createOrder)out+=action('createOrder','创建订单');

 if(a.approve)out+=action('approve','审核通过，进入谈价');
 if(a.agree)out+=form('agree',r.id,input('客户确认价格（方案币种） *','clientPrice',r.clientPrice??'','number'),'客户通过，交运营确认达人');
 if(a.negotiate)out+=form('negotiate',r.id,input('客户议价目标金额 *','target','','number')+input('客户权益要求 *','rights',r.rights),'发起议价');
 if(a.quote)out+=form('quote',r.id,input('达人回价 *','quote','','number')+input('本轮权益 *','rights',r.targetRights||r.rights),'提交达人回价');
 if(a.feedback)out+=action('feedback','已反馈客户，等待确认');
 if(a.confirmAndCreateOrder&&!r.proposalVersions)out+=action('confirmAndCreateOrder','创建订单');
 if(a.confirm&&!r.proposalVersions)out+=form('confirm',r.id,input('最终达人报价 *','final',r.proposalVersions?.at(-1)?.total??r.history.at(-1)?.quote??r.initial,'number')+input('预计发布日期 *','date',r.date,'date')+input('最终合作权益 *','rights',r.history.at(-1)?.rights||r.rights),'达人已同意，确认合作');
 if(a.propose)out+='<details><summary>报价或权益有变化，需要重新协商</summary>'+form('propose',r.id,input('达人回价 *','quote','','number')+input('本轮权益 *','rights',r.history.at(-1)?.rights||r.rights),'提交条件变更给 PM')+'</details>';
 if(a.confirm&&(r.history||[]).length>=3)out+='<p class="muted">已达到三轮议价上限，可按已确认条件合作，或登记达人不合作。</p>';
 for(const [key,label] of [['script','脚本'],['video','草稿']]){
  if(key==='script'&&a.scriptRevisionDone)out+=action('scriptRevisionDone','重新提交审核');
  else if(a[key+'Submit'])out+=form(key+'Submit',r.id,input(label+'链接','url',r.drafts?.[key]?.url||r.deliverables?.[key]?.at(-1)?.url||'','url',false)+'<label class="full">补充说明（选填）<textarea name="description" rows="2">'+esc(r.drafts?.[key]?.description||'')+'</textarea></label>',r.status.endsWith('待修改')?'重新提交审核':'提交审核').replace('</div></form>','<button type="submit" data-kind="'+key+'Draft">保存草稿</button></div></form>');
  if(a[key+'Send'])out+=action(key+'Send','已同步客户');
  if(a[key+'Pass'])out+=action(key+'Pass',key==='script'?'可以推进拍摄':'可以推进发布');
  if(a[key+'Return'])out+=form(key+'Return',r.id,input('退回备注（选填）','reason','','text',false),'退回处理');
 }

 if(a.schedule)out+='<details><summary>调整计划发布日期</summary>'+form('schedule',r.id,input('计划发布日期','date',r.date,'date'),'保存排期')+'</details>';
 if(a.publish)out+=form('publish',r.id,(r.publications?r.publications.map(p=>input(p.platform+' 发布链接 *','publication-'+p.id,p.url,'url')).join(''):input('发布链接 *','url',r.url,'url')+input('分发链接（选填）','distribution',r.distribution,'url',false)),r.status==='待补充发布资料'?'重新提交验收':'提交验收');
 if(a.accept)out+=action('accept','验收通过');
 if(a.returnPublish)out+=form('returnPublish',r.id,input('退回备注（选填）','reason','','text',false),'退回处理');
 if(a.packageRevision)out+='<details class="alternate-actions"><summary>调整方案</summary><p class="scope-note">'+(isSelfManagedPm(db,user,r)?'修改会生成新版本，无需提报审核；已有确认不适用于新方案。':'修改会生成新版本并重新审核；已有确认不适用于新方案。')+'</p>'+form('packageRevision',r.id,packageFields(r.proposalVersions.at(-1))+input('修改说明 *','reason'),'保存新版本并重新审核')+'</details>';
 const branches=[['reject','不予提报'],['decline','客户不合作'],['creatorDecline','达人不合作'],['cancel','取消合作']].filter(([key])=>a[key]);
 if(branches.length)out+='<details class="alternate-actions"><summary>其他处理：退回或结束合作</summary>'+branches.map(([key,label])=>reason(key,label)).join('')+'</details>';
 return out||(section?'':'<p class="muted">'+esc(nextStep(db,user,r).label)+'</p>');
}
function drawerStamp(value){const time=Date.parse(value);return Number.isFinite(time)?new Date(time).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'时间未记录';}
function deliveryRemarks(r,key){
 const notes=r.deliveryRemarks?.[key]||[],allowed=allowedActions(db,user,r)[key+'Remark'];
 return '<details class="delivery-remarks" data-drawer-disclosure="'+key+'-remarks"><summary>备注'+(notes.length?' · '+notes.length:'')+'</summary>'+notes.map(n=>'<article class="review-entry"><small>'+esc(userName(n.by))+' · '+esc(drawerStamp(n.at))+' · '+esc(n.progress||'')+'</small><p class="preserve-text">'+esc(n.body)+'</p></article>').join('')+(allowed?form(key+'Remark',r.id,'<label class="full">追加备注<textarea name="remark" rows="2" required maxlength="1000" placeholder="记录同步情况或进度；修改意见请写在稿件文档中"></textarea></label>','添加备注'):'')+'</details>';
}
function deliveryHistory(r,only='',actions=''){
 return (only?[only]:['script','video']).map(key=>{
  const name=key==='script'?'脚本':'视频',v=r.deliverables?.[key]?.at(-1);
  if(!v)return actions;
  const linkEditor=key==='script'&&allowedActions(db,user,r).scriptLink?'<details class="delivery-link-editor" data-drawer-disclosure="script-link"><summary>更换链接</summary>'+form('scriptLink',r.id,input('脚本链接','url',v.url,'url'),'保存链接')+'</details>':'';
  const receipt=key==='script'?[...(r.events||[])].reverse().find(e=>['scriptRevisionDone','scriptSend','scriptPass'].includes(e.action)):null;
  const receiptText=receipt?'<small class="muted">'+esc(userName(receipt.by))+' '+esc(({scriptRevisionDone:'已完成修改',scriptSend:'已同步客户',scriptPass:'已确认客户通过'})[receipt.action])+' · '+esc(drawerStamp(receipt.at))+'</small>':'';
  const state=v.approvedAt?'客户已通过':r.status===name+'待修改'?'需要修改':r.status===name+'待客户反馈'?'已同步客户 · 等待反馈':'等待 PM 同步客户';
  return (key==='script'&&r.scriptLinkUpdatedAt?'<p class="scope-note" role="status">链接已更新 · '+esc(drawerStamp(r.scriptLinkUpdatedAt))+'，请业务审核 PM 核对并按需转发客户。</p>':'')+'<div class="delivery-latest" data-current-draft="'+key+'"><div class="delivery-latest-row"><div><strong>'+(key==='script'?'脚本文档':'最新'+name)+'</strong> '+safeLink(v.url,key==='script'?'查看文档 ↗':'查看'+name+' ↗')+'<small>'+esc(state)+'</small></div>'+deliveryRemarks(r,key)+'</div>'+(v.description?'<p class="muted preserve-text">'+esc(v.description)+'</p>':'')+linkEditor+receiptText+actions+'</div>';
 }).join('');
}

function notesPanel(r,showStructured=true){return (showStructured?structuredFollowUps(r):'')+'<section class="creator-section"><h3>跟进备注</h3>'+(canNote(db,user,r)?form('note',r.id,'<label class="full">跟进备注 *<textarea name="body" required maxlength="1000" rows="3" placeholder="记录反馈、阻塞原因和下一步安排"></textarea></label>','添加备注'):'')+([...(r.notes||[])].reverse().map(n=>'<article class="review-entry"><small>'+esc(userName(n.authorId))+' · '+esc(new Date(n.createdAt).toLocaleString('zh-CN'))+'</small><p class="preserve-text">'+esc(n.body)+'</p></article>').join('')||'<p class="muted">暂无跟进备注</p>')+'<h3>操作记录</h3>'+[...(r.events||[])].reverse().map(e=>'<div class="review-entry"><strong>'+esc(e.status)+'</strong><small> · '+esc(userName(e.by))+' · '+esc(new Date(e.at).toLocaleString('zh-CN'))+'</small><p class="preserve-text">'+esc(e.reason||'')+'</p></div>').join('')+'</section>';}
function workflowDrawerHeader(r,delivery=false){
 const c=C(r.creatorId),p=P(r.campaignId),status=delivery?deliveryStatus(db,r):proposalStatus(r);
 return '<div class="proposal-header"><div class="proposal-header-title"><strong>'+esc(c.name)+'</strong>'+(delivery?'<span class="workflow-video-name">'+esc(r.name||'历史交付')+'</span>':'')+'<span class="status" data-status="'+esc(status)+'">'+esc(status)+'</span></div><div class="proposal-header-meta"><span>'+esc(p.name)+'</span><span>'+esc(r.targetCountry||c.country||'地区待补充')+'</span></div><div class="proposal-header-people"><span>运营 '+esc(userName(r.ownerId).replace(/^运营[^·]*·\s*/,''))+'</span><span>PM '+esc(userName(reviewPm(db,r)).replace(/^PM\s*·\s*/,''))+'</span></div></div>';
}
function workflowTodo(r,delivery=false,compact=false){
 const a=allowedActions(db,user,r),step=nextStep(db,user,r),pm=reviewPm(db,r),count=clientQuoteHistory(r).length;
 const complete=delivery?r.status==='已完成':proposalStageOf(r)==='已完成';
 const ended=(delivery?stageOf(r)==='已结束':proposalStageOf(r)==='已取消')&&!complete;
 const returned=delivery&&(/待修改$/.test(r.status)||r.status==='待补充发布资料');
 let label=step.label,detail='',actor=pm;
 if(complete){label=delivery?'视频已完成验收':r.orderId?'合作订单已创建':'双方价格已确认，待创建订单';detail=delivery?'发布资料和审核稿件已保留，可展开查看。':r.orderId?'合作方案和报价记录已保留，可展开查看。':'合作已完成，负责运营可选择现在创建订单或稍后创建。';}
 else if(ended){label=delivery?r.status:proposalStatus(r);detail=r.closeReason||'本次合作已结束。';}
 else if(delivery){
  const state=deliveryStatus(db,r),opStage=state==='待补充邮箱'||/制作中|修改中/.test(state)||['待发布','待补充发布资料'].includes(r.status);actor=opStage?r.ownerId:pm;
  const labels={'脚本待提交':'提交脚本初稿','脚本待修改':'修改并重新提交脚本','脚本待 PM 初审':'同步给客户','脚本待送客户':'同步给客户','脚本待客户反馈':'登记脚本的客户反馈','视频待提交':'提交视频初稿','视频待修改':'修改并重新提交视频','视频待 PM 初审':'同步给客户','视频待送客户':'同步给客户','视频待客户反馈':'登记视频的客户反馈','待发布':'提交视频发布链接','待补充发布资料':'补充发布资料','待验收':'登记客户验收结果'};
  label=state==='待补充邮箱'?'补充平台注册邮箱':labels[r.status]||step.label;
  detail=returned?'按下方退回意见修改，提交后重新进入审核。':/待客户反馈/.test(r.status)?'收到客户反馈后，在当前稿件下登记通过或退回。':/待 PM 初审/.test(r.status)?'确认稿件符合合作要求，通过或填写意见退回修改。':state==='待补充邮箱'?'提交邮箱后进入脚本制作，同一订单的视频共用邮箱。':r.status==='待验收'?'核对发布链接后登记通过，或退回补充资料。':'';
  if(step.action==='preparationPm'){label='填写邀请码和邀请链接';detail='在下方“PM 邀请信息”填写；稿件流程仍按当前进度推进。';actor=pm;}
 }else{
  actor=['待运营议价','待达人确认','合作确认完成'].includes(r.status)?r.ownerId:pm;
  const labels={'待 PM 审核':'审核当前提报','待 PM 反馈':isSelfManagedPm(db,user,r)&&!count?'待正式对客报价':count>=3?'确认客户最终结果':count?'回应运营回价':'提交首轮对客报价','待运营议价':'与达人议价并提交回价','议价待客户确认':'登记客户还价或确认合作','待达人确认':'确认达人接受并创建订单','待客户确认':canSubmitNegotiationQuote(db,user,r)?'继续对客报价或登记客户确认':'登记客户同意当前方案','合作确认完成':'创建合作订单'};
  label=labels[r.status]||step.label;
  detail=r.status==='待 PM 审核'?'核对基础信息、合作内容和金额后完成审核。':r.status==='待达人确认'?'确认达人接受当前方案后，点击创建订单生成视频交付记录。':quoteProgress(r,count);
  if(step.action==='confirmAndCreateOrder'){actor=r.ownerId;label='确认达人接受并创建订单';detail='创建订单同时完成达人确认，并按视频条数生成交付记录。';}
 }
 if(compact){
  const hint=r.status==='议价待客户确认'?'等待客户回复':label;
  return '<p class="quote-status-line" aria-label="当前待办" role="status">'+esc(hint)+(!complete&&!ended?' · '+esc(userName(actor).replace(/\s*·\s*/g,' '))+' 跟进':'')+(ended&&r.closeReason?' · '+esc(r.closeReason):'')+'</p>';
 }
 const actionable=!complete&&Boolean(step.action||a.reopenSubmission),tone=complete?'complete':ended?'ended':returned?'returned':actionable?'action':'waiting';
 return '<section class="workflow-todo is-'+tone+'" aria-label="当前待办" role="status"><span class="workflow-todo-icon" aria-hidden="true">'+(complete?'✓':returned?'↺':ended?'—':'→')+'</span><div><div class="workflow-todo-heading"><strong>'+esc(complete?'已完成':ended?(delivery?'已结束':'已取消'):actionable?'待你处理':'等待处理')+'</strong><span>'+esc(label)+'</span></div>'+(detail?'<p>'+esc(detail)+'</p>':'')+(!complete&&!ended?'<small>负责处理：'+esc(userName(actor))+(actor!==user.id&&user.role!=='admin'?' · 当前为查看状态':'')+'</small>':'')+'</div></section>';
}
function workflowCreatorFacts(r,includeAccounts=true,includeEmail=true){
 const c=C(r.creatorId),accounts=socialAccounts(c).filter(a=>a.handle||a.url);
 if(!includeEmail&&!includeAccounts&&(!r.submittedBy||r.submittedBy===r.ownerId))return '';
 return '<details class="creator-section drawer-creator-facts" data-drawer-disclosure="creator-contact"><summary>'+(includeAccounts?'邮箱与平台数据':includeEmail?'联系信息':'提报信息')+'</summary><div>'+(includeEmail?'<p>联系邮箱：'+esc(c.contact||'待补充')+'</p>':'')+(r.submittedBy&&r.submittedBy!==r.ownerId?'<p>原提报人：'+esc(userName(r.submittedBy))+'</p>':'')+(includeAccounts?accounts.map(a=>'<div class="drawer-account-facts"><strong>'+esc(a.platform)+'</strong><span>'+(a.url?safeLink(a.url,a.handle||'打开主页 ↗'):esc(a.handle||'账号待补充'))+'</span><small>粉丝 '+esc(num(a.followers))+' · 均播 '+esc(num(a.views))+'</small></div>').join(''):'')+'</div></details>';
}
function proposalAccountLink(a){
 try{const u=new URL(a.url);if(['http:','https:'].includes(u.protocol))return '<a class="proposal-account-link" href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc('打开 '+(a.platform||'')+' '+(a.handle||'账号')+' 主页（新标签页）')+'" title="打开主页"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg></a>';}catch{}
 return '';
}
function proposalAccountBasics(c,extra='',sectionLabel=''){
 const accounts=socialAccounts(c).filter(a=>a.platform||a.handle||a.url);
 return '<section class="creator-section proposal-account-basics" data-workflow-section="basics"'+(sectionLabel?' aria-label="'+esc(sectionLabel)+'"':'')+'><h3>基础信息</h3>'+extra+(accounts.length?'<div class="proposal-accounts-scroll"><table class="proposal-accounts-table" aria-label="达人平台基础信息"><thead><tr>'+['平台','账号','粉丝数','均播'].map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+accounts.map(a=>'<tr><td>'+esc(a.platform||'待补充')+'</td><td><span class="proposal-account-identity"><span>'+esc(a.handle||'待补充')+'</span>'+proposalAccountLink(a)+'</span></td><td>'+esc(num(a.followers))+'</td><td>'+esc(num(a.views))+'</td></tr>').join('')+'</tbody></table></div>':'<p class="muted">暂无平台账号，请补充达人资料。</p>')+'</section>';
}
function workflowCooperation(r,delivery=false){
 if(!delivery&&r.proposalVersions)return packageHistory(r);
 const terms=delivery?(db.orders||[]).find(o=>o.id===r.orderId)?.terms:null;
 const v={items:[{platform:r.platform||C(r.creatorId).platform||'未记录',type:r.contentType||'未记录',quantity:delivery&&r.orderId?1:'未记录'}],rights:terms?.rights||r.rights||'',cooperationNotes:terms?.cooperationNotes||(!delivery?r.reason:'')||''};
 if(!delivery)return compactCooperation(v,proposalFinance(r));
 return workflowSection('cooperation','合作内容 <small>'+(delivery?'单条视频':'整包')+'</small>',proposalCooperationFields(v,!delivery)+deliveryFinance(r,delivery?'单条':'整包'),delivery?'delivery-cooperation':'package-summary');
}
function coopDetail(id,t='合作资料'){
 if(page==='delivery'){if(visibleCoops(deliveryContext(db),user).some(x=>x.id===id))deliveryDetail(id);return;}
 const r=visibleCoops(db,user).find(r=>r.id===id);if(!r)return;

 dialog={kind:'coop',id};tab='合作资料';const c=C(r.creatorId),p=P(r.campaignId);
 const compactHeader=workflowDrawerHeader(r);
 let body=r.legacyFlow?'<small class="muted">历史流程记录 · 未补造内容审核记录或合作确认时间</small>':'';
 if(tab==='合作资料'){
 body+=proposalAccountBasics(c,currentProfileFacts(c),'当前达人资料')+workflowCooperation(r)+snapshotPanel(r)+reviewHistoryPanel(r);
 if(allowedActions(db,user,r).createOrder)body+='<section class="creator-section proposal-order-actions" data-workflow-section="order"><p class="workflow-form-error" data-operation-error role="alert" hidden></p><h3>创建合作订单</h3><p class="muted">已确认当前方案，将生成 '+packagePricing(r).quantity+' 条视频交付，金额按条均分。</p><button class="primary" data-offer-order="'+esc(r.id)+'">创建订单</button></section>';
 const decision=submissionDecisionPanel(r);
 body+=decision+clientQuotePanel(r,false,true)+orderSplitPanel(r)+correctionPanel(r)+proposalHistory(r);
 }
 panel(c.name+' · '+p.name,body,compactHeader);
}
function captureWorkflowDrawer(){
 const body=root.querySelector('.workflow-drawer .profile-main');if(!body)return null;
 const active=document.activeElement,f=active?.closest?.('form');
 const section=active?.closest?.('[data-workflow-section]')||[...body.querySelectorAll('[data-workflow-section]')].find(el=>el.getBoundingClientRect().bottom>body.getBoundingClientRect().top);
 return {id:dialog?.id,scroll:body.scrollTop,task:body.querySelector('.workflow-todo,.quote-status-line')?.textContent,section:section?.dataset.workflowSection,offset:section?section.getBoundingClientRect().top-body.getBoundingClientRect().top:0,form:f?.dataset.kind,name:active?.name,disclosures:[...body.querySelectorAll('details[data-drawer-disclosure]')].map(el=>[el.dataset.drawerDisclosure,el.open])};
}
function restoreWorkflowDrawer(state){
 if(!state||state.id!==dialog?.id)return;const body=root.querySelector('.workflow-drawer .profile-main');if(!body)return;
 const disclosures=new Map(state.disclosures),taskChanged=state.task!==body.querySelector?.('.workflow-todo,.quote-status-line')?.textContent;
 for(const el of body.querySelectorAll('details[data-drawer-disclosure]')){
  if(el.dataset.drawerDisclosure==='preparation'&&el.open&&taskChanged)continue;
  if(disclosures.has(el.dataset.drawerDisclosure))el.open=disclosures.get(el.dataset.drawerDisclosure);
 }
 body.scrollTop=state.scroll;
 const section=[...body.querySelectorAll('[data-workflow-section]')].find(el=>el.dataset.workflowSection===state.section);
 if(section&&state.scroll>0)body.scrollTop+=section.getBoundingClientRect().top-body.getBoundingClientRect().top-state.offset;
 const f=[...body.querySelectorAll('form')].find(el=>el.dataset.kind===state.form),field=f&&state.name?[...f.querySelectorAll('input,textarea,select')].find(el=>el.name===state.name):null;
 const focus=field||f?.querySelector('input,textarea,select,button')||section?.querySelector('h3,h4');
 if(focus){if(focus.matches('h3,h4'))focus.tabIndex=-1;focus.focus({preventScroll:true});}
}
function keepCompletedProposalVisible(id,kind){
 if(page!=='followup'||!['confirmCreator','confirm','customerAccept','agree','confirmAndCreateOrder','createOrder'].includes(kind))return;
 const r=db.collaborations.find(x=>x.id===id);
 if(!r||proposalStageOf(r)!=='已完成')return;
 queue='all';status='全部';metric='all';if(!['全部','已完成'].includes(stage))stage='全部';
}
function refreshCoop(id,kind='',result={}){const position=captureWorkflowDrawer();save();keepCompletedProposalVisible(id,kind);if(dialog?.kind==='orderPrompt')drawerStack.pop();render();coopDetail(id,tab);restoreWorkflowDrawer(position);const r=(db.deliveryItems||[]).find(x=>x.id===id)||db.collaborations.find(x=>x.id===id);showSaveToast(kind==='preparationSync'?'邮箱已保存并覆盖同步至 '+result.syncedVideos+' 条其他视频交付。':['createOrder','confirmAndCreateOrder'].includes(kind)?'已创建订单，共生成 '+orderProgress(db,r.orderId).total+' 条视频。':kind.endsWith('Draft')?'草稿已保存，尚未提交审核。': '已保存 · '+(r.proposalId?deliveryStatus(db,r):proposalStatus(r))+'。'+(r.proposalVersions&&r.orderId?'':'下一步：'+nextStep(db,user,r).label+'。'));}
root.addEventListener('click',e=>{const b=detailClickTarget(e.target);if(!b)return;if(b.matches('tr[data-detail-row]')){if(globalThis.getSelection?.()?.toString())return;b.focus({preventScroll:true});}try{if(b.dataset.draftId){openCreatorPage(b.dataset.submitCreator,true,'',b.dataset.draftId);return;}if(b.hasAttribute('data-save-proposal-draft')){persistSubmissionDraft();showSaveToast('草稿已保存，尚未正式提交。');return;}if(b.dataset.editRegion&&user.role==='admin'){const f=root.querySelector('form[data-kind="regionRule"]');f.elements.region.value=b.dataset.editRegion;f.elements.pmId.value=b.dataset.regionPm;f.elements.pmId.focus();f.scrollIntoView({block:'center'});return;}if(b.dataset.regionProject){if(user.role!=='admin')return;switchWorkspace('projects');campaignId=b.dataset.regionProject;projectTab='regional';render();return;}if(b.dataset.handoffProject){handoffForm(b.dataset.handoffProject);return;}if(b.hasAttribute('data-drawer-width')){drawerWide=!drawerWide;root.querySelector('.detail-drawer')?.classList.toggle('is-wide',drawerWide);b.setAttribute('aria-pressed',String(drawerWide));b.textContent=drawerWide?'收窄':'展开';return;}if(b.hasAttribute('data-cancel-submission')){collapseSubmission();return;}if(b.hasAttribute('data-creators-back')){backToCreators();return;}if(b.dataset.creatorPage){openCreatorPage(b.dataset.creatorPage);return;}if(b.dataset.offerOrder){offerOrder(b.dataset.offerOrder);return;}if(handleWorkspaceClick(b))return;if(b.hasAttribute('data-clear')){metric='all';deliveryOrderId='';minimumFollowers=0;q='';platform=country=status=owner=campaignFilter=stage='全部';render();}else if(b.dataset.stage){selectCooperationStage(b.dataset.stage);render();}else if(b.dataset.queue){queue=b.dataset.queue;render();}else if(b.dataset.page){switchWorkspace(b.dataset.page);}else if(b.hasAttribute('data-close'))close();else if(b.dataset.creator)openObject('creator',b.dataset.creator);else if(b.dataset.coop){openObject('coop',b.dataset.coop);if(b.classList.contains('next-action')){const op=root.querySelector('.operation-panel');op?.scrollIntoView({block:'start'});op?.querySelector('input,button')?.focus({preventScroll:true});}}else if(b.dataset.submitCreator)openObject('submit',b.dataset.submitCreator);else if(b.dataset.project){reset();campaignId=b.dataset.project;page='projects';render();}else if(b.hasAttribute('data-projects-back')){campaignId='';render();}else if(b.hasAttribute('data-new-project'))projectForm();else if(b.dataset.members)projectForm(b.dataset.members);else if(b.hasAttribute('data-new-creator')){openCreatorIntake();}else if(b.dataset.enterCoop){const r=visibleCoops(db,user).find(r=>r.id===b.dataset.enterCoop);if(!r)return;page='projects';campaignId=r.campaignId;status=owner=campaignFilter='全部';render();coopDetail(r.id);}else if(b.dataset.tab&&dialog?.kind==='coop'){if(b.dataset.tab!==tab)coopDetail(dialog.id,b.dataset.tab);}else if(b.dataset.action){if(b.disabled)return;const snapshot=JSON.stringify(db);b.disabled=true;try{updateCoop(db,user,b.dataset.coopId,b.dataset.action,{});refreshCoop(b.dataset.coopId,b.dataset.action);}catch(error){db=JSON.parse(snapshot);b.disabled=false;throw error;}}}catch(e){workflowError(b,e);}});
root.addEventListener('change',e=>{
 if(e.target.hasAttribute('data-select-all-creators')||e.target.hasAttribute('data-select-creator')){
  const rows=creatorResults(db,user,q).filter(c=>matchesAccount(c,platform,minimumFollowers)&&(country==='全部'||c.country===country)&&!creatorDeleteReason(db,user,c));
  const ids=e.target.hasAttribute('data-select-all-creators')?rows.map(c=>c.id):rows.filter(c=>c.id===e.target.dataset.selectCreator).map(c=>c.id);
  for(const id of ids){if(e.target.checked)selectedCreators.add(id);else selectedCreators.delete(id);}
  renderOperatorCreatorList();return;
 }
 if(e.target.name==='campaignId'&&e.target.closest('form')?.dataset.kind==='submit'){const region=root.querySelector('[data-region-fields]');if(region)region.innerHTML=submissionRegionFields(P(e.target.value));const saved=draftForCreator(creatorPageId,e.target.value);if(saved){activeDraftId=saved.id;restoreSubmissionDraft({id:creatorPageId,fields:saved.fields});pageDirty=false;}return;}if(e.target.hasAttribute('data-prices')){showPrices=e.target.checked;render();return;}if(e.target.id==='account'){rememberWorkspace();close(true);if(creatorPageId){creatorPageId='';creatorSubmitOpen=false;pageDirty=false;page='creators';window.history.replaceState(null,'','#creators');acceptedHash='#creators';}creatorListState=null;moduleOrigin=null;user=VIEW_USERS.find(u=>u.id===e.target.value)||USERS[0];const state=workspaceViews[user.id+'/'+page];applyWorkspace(state);document.getElementById('crm-feedback').textContent='';render();restoreScroll(state);return;}const k=e.target.dataset.filter;if(!k)return;const v=e.target.value;if(k==='deliveryQueue')queue=v;if(k==='deliveryGroup')view=v;if(k==='minimumFollowers')minimumFollowers=Number(v);if(k==='sort')sort=v;if(k==='platform')platform=v;if(k==='country')country=v;if(k==='status')status=v;if(k==='owner')owner=v;if(k==='campaignFilter')campaignFilter=v;render();});
root.addEventListener('input',e=>{if(e.target.id!=='crm-search')return;const pos=e.target.selectionStart;q=e.target.value;render();const el=document.getElementById('crm-search');el.focus();el.setSelectionRange(pos,pos);});
root.addEventListener('submit',e=>{e.preventDefault();const f=e.target;if(f.dataset.kind==='creator'&&f.querySelector?.('[data-intake-link]')&&!addIntakeLink())return;if(f.dataset.busy||f.dataset.committed)return;const localError=f.querySelector?.('[data-form-error]');if(localError){localError.hidden=true;localError.textContent='';}if(f.reportValidity&&!f.reportValidity())return;f.dataset.busy='true';const snapshot=JSON.stringify(db),d=new FormData(f),kind=e.submitter?.dataset.kind||f.dataset.kind,id=f.dataset.id;f.querySelectorAll('button').forEach(b=>b.disabled=true);let submitted,createdId;try{if(kind==='orderSplit'){saveOrderSplit(db,user,id,d.get('side'),d.getAll('splitAmount').map(Number));refreshCoop(id,kind);return;}else if(kind==='correctOrderPricing'){const r=db.collaborations.find(x=>x.id===id);correctOrderPricing(db,user,r.orderId,{cost:Number(d.get('cost')),clientPrice:Number(d.get('clientPrice')),reason:d.get('reason')});refreshCoop(id,kind);return;}else if(kind==='operatorHandoff'){transferOperatorWork(db,user,{ids:[id],toOwner:d.get('toOwner'),reason:d.get('reason')});refreshCoop(id,kind);return;}else if(kind==='correctVideoQuantity'){const r=db.collaborations.find(x=>x.id===id);updateCoop(db,user,id,kind,{quantities:(r?.proposalVersions?.at(-1)?.items||[]).map((_,i)=>Number(d.get('quantity'+i))),reason:String(d.get('reason')||'')});refreshCoop(id,kind);return;}else if(kind==='cancelCooperation'){const action=d.get('cancelType');if(!['decline','creatorDecline','cancel'].includes(action))throw Error('请选择取消类型');const reason=String(d.get('reason')||'').trim();if(!reason)throw Error('请填写取消原因');updateCoop(db,user,id,action,{reason});refreshCoop(id,action);return;}else if(kind==='regionRule'){setRegionPm(db,user,id,d.get('region'),d.get('pmId'));save();render();showSaveToast('地区分工已保存，仅影响新提报。');return;}else if(kind==='handoffPreview'){previewHandoff(id,d);return;}else if(kind==='handoffConfirm'){const count=transferRegionalWork(db,user,{projectId:id,region:String(d.get('region')||''),fromPm:d.get('fromPm'),toPm:d.get('toPm'),reason:d.get('reason'),ids:d.getAll('selectedIds')});save();close(true);render();showSaveToast('已交接 '+count+' 条合作及关联交付，历史审核记录已保留。');return;}else if(kind==='creatorAccountAdd'){
 const c=C(id);if(!canEditCreator(db,user,c))throw Error('无权编辑此达人账号');
 const account=parseCreatorProfile(String(d.get('profile')||'').trim());
 const previous=socialAccounts(c);
 if(previous.some(a=>a.platform===account.platform&&(a.handle?.toLowerCase()===account.handle.toLowerCase()||normalizeProfile(a.url)===normalizeProfile(account.url))))throw Error('该账号已添加，请直接编辑现有账号');
 account.followers=intakeMetricValue(d.get('followers'),'k');account.views=intakeMetricValue(d.get('views'),'k');
 saveCreatorProfile(db,user,id,{accounts:[...previous,account]});save();drawerDirty=false;render();creatorDetail(id);showSaveToast('账号已添加');return;
 }else if(kind==='creatorBasic'||kind==='creatorAccount'){
 const c=C(id);
 const data=kind==='creatorBasic'?Object.fromEntries(['country','language','creatorType','contact','notes'].map(k=>[k,d.get(k)])):{accounts:socialAccounts(c).map((a,i)=>i===Number(d.get('accountIndex'))?{...a,handle:d.get('handle'),url:d.get('url'),followers:d.get('followers')===''?null:Number(d.get('followers')),views:d.get('views')===''?null:Number(d.get('views'))}:a)};
 saveCreatorProfile(db,user,id,data);save();drawerDirty=false;render();creatorDetail(id);showSaveToast();return;
 }else if(kind==='creatorQuoteReply'){addCreatorQuoteReply(db,user,id,d.get('clientQuote'),d.get('quoteNote'));refreshCoop(id);return;}else if(kind==='customerOffer'){recordCustomerOffer(db,user,id,d.get('clientQuote'),d.get('quoteNote'));refreshCoop(id);return;}else if(kind==='negotiationQuote'){submitNegotiationQuote(db,user,id,d.get('clientQuote'),d.get('quoteNote'));refreshCoop(id);return;}else if(kind==='clientQuote'){setClientQuote(db,user,id,d.get('clientQuote'),d.get('quoteNote'));refreshCoop(id);return;}else if(kind==='followupRecord'){addFollowUp(db,user,id,{type:d.get('followupType'),channel:d.get('channel'),contact:d.get('contact'),communicatedAt:d.get('communicatedAt'),body:d.get('body'),result:d.get('result'),link:d.get('link'),nextAt:d.get('nextAt')});refreshCoop(id);return;}else if(kind==='reminderReschedule'){const task=updateReminder(db,user,id,'reschedule',d.get('dueAt'));refreshCoop(task.objectId);return;}else if(kind==='creatorEdit'){saveCreatorProfile(db,user,id,{name:d.get('name'),country:d.get('country'),language:d.get('language'),contact:d.get('contact'),accounts:platforms.map((platform,i)=>({...socialAccounts(C(id)).find(a=>a.platform===platform),platform,handle:d.get('handle'+i),url:d.get('url'+i),followers:d.get('followers'+i)===''?null:Number(d.get('followers'+i))})).concat(platforms.flatMap(platform=>socialAccounts(C(id)).filter(a=>a.platform===platform).slice(1)))});save();render();if(drawerStack.at(-1)?.dialog?.kind==='creator'&&drawerStack.at(-1).dialog.id===id)returnToSource();else if(creatorPageId){close(true);render();}else creatorDetail(id);showSaveToast('达人资料已保存。');return;}else if(kind==='note'){addNote(db,user,id,d.get('body'));refreshCoop(id);return;}else if(kind==='saveView'||kind==='renameView'){saveView(db,user,d.get('name'),{...criteria(),view,showPrices},kind==='renameView'?id:undefined);save();close(true);render();showSaveToast();return;}else if(kind==='project'){addProject(db,user,{name:String(d.get('name')),client:String(d.get('client')),requirements:String(d.get('requirements')),members:d.getAll('members')});}else if(kind==='members'){setMembers(db,user,id,[...d.getAll('members'),...P(id).members.filter(uid=>db.collaborations.some(r=>r.campaignId===id&&r.ownerId===uid))]);}else if(kind==='creator'){
 if(!intakeCountries.includes(d.get('country')))throw Error('请选择国家');
 if(!intakeLanguages.includes(d.get('language')))throw Error('请选择语言');
 const rows=d.get('accountsJSON')!==null?JSON.parse(d.get('accountsJSON')):[{...parseCreatorProfile(String(d.get('profile'))),followers:d.get('followers'),views:d.get('views')}];
 if(!rows.length)throw Error('请至少添加一个有效主页');
 if(d.get('accountsJSON')!==null&&Object.values(intakePending).some(a=>Object.values(a).some(v=>v!=='')))throw Error('有平台填写了指标但尚未添加主页，请补充主页或清空指标');
 const accounts=rows.map(a=>{const recognized=parseCreatorProfile(a.url);return {...recognized,followers:intakeMetricValue(a.followers,d.get('metricsUnit')),views:intakeMetricValue(a.views,d.get('metricsUnit'))};});
 if(accounts.some(a=>[a.followers,a.views].some(v=>v!==null&&(!Number.isFinite(v)||v<0||!Number.isInteger(v)))))throw Error('粉丝量和均播请填写非负整数，未知时留空');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.get('contact')).trim()))throw Error('请填写有效的联系邮箱');
 const duplicates=db.creators.filter(c=>socialAccounts(c).some(a=>accounts.some(b=>a.platform===b.platform&&(a.handle.toLowerCase()===b.handle.toLowerCase()||normalizeProfile(a.url)===normalizeProfile(b.url)))));
 if(duplicates.length>1)throw Error('这些账号分别属于不同达人，请核实后分别添加');
 const duplicate=duplicates[0];
 if(duplicate){
  if(db.collaborations.some(r=>r.creatorId===duplicate.id)||(db.orders||[]).some(r=>r.creatorId===duplicate.id)||(db.deliveryItems||[]).some(r=>r.creatorId===duplicate.id)){document.getElementById('dialog-message').innerHTML='该达人已正式提报，不能重复新增发起人。<button data-creator="'+esc(duplicate.id)+'">查看已有达人</button>';return;}
  addCreatorInitiator(db,user,duplicate.id);
  const previous=socialAccounts(duplicate),extra=accounts.filter(b=>!previous.some(a=>a.platform===b.platform&&(a.handle.toLowerCase()===b.handle.toLowerCase()||normalizeProfile(a.url)===normalizeProfile(b.url))));
  if(extra.length)saveCreatorProfile(db,user,duplicate.id,{accounts:[...previous,...extra]});
  createdId=duplicate.id;
 }else{
 createdId=crypto.randomUUID();const primary=accounts[0],at=new Date().toISOString();
 db.creators.push({id:createdId,createdBy:user.id,name:String(d.get('name')||'').trim()||primary.handle,handle:primary.handle,platform:primary.platform,country:String(d.get('country')||''),language:String(d.get('language')||''),profile:primary.url,contact:String(d.get('contact')).trim(),followers:primary.followers,views:primary.views,er:'',accounts:accounts.map(a=>({...a,id:crypto.randomUUID(),creatorId:createdId,updatedAt:a.followers!==null||a.views!==null?at:null}))});
 ensureCreatorCodes(db);
 }
 }else if(kind==='submit'){validateCompactProposal(d,C(id));if(checkExistingProposal(id,String(d.get('campaignId'))))return;const profile={...C(id),...Object.fromEntries(['contact','country','language','creatorType'].map(k=>[k,String(d.get(k)??C(id)[k]??'').trim()]))};validateSubmissionProfile(profile);Object.assign(C(id),profile);submitted=submitPackage(db,user,id,{...packageData(d),campaignId:String(d.get('campaignId')),targetCountry:String(d.get('targetCountry')||''),reviewPmId:String(d.get('reviewPmId')||''),...(user.role==='pm'?{clientQuote:Number(d.get('clientQuote'))}:{}),reason:String(d.get('reason')||'')});}else{const result=updateCoop(db,user,id,kind,{...packageData(d),registrationEmail:d.get('registrationEmail'),briefUrl:d.get('briefUrl'),briefDescription:d.get('briefDescription'),cooperationLetter:d.get('cooperationLetter'),remark:d.get('remark'),accessReady:d.get('accessReady')===null?undefined:d.get('accessReady')==='on',briefSent:d.get('briefSent')===null?undefined:d.get('briefSent')==='on',inviteCode:d.get('inviteCode'),inviteLink:d.get('inviteLink'),preparationNotes:d.get('preparationNotes'),publicationLinks:Object.fromEntries(((db.deliveryItems||[]).find(x=>x.id===id)?.publications||[]).map(p=>[p.id,String(d.get('publication-'+p.id)||'')])),initial:Number(d.get('initial')),description:String(d.get('description')||''),quote:Number(d.get('quote')),final:Number(d.get('final')),clientPrice:Number(d.get('clientPrice')),clientQuote:Number(d.get('clientQuote')),quoteNote:String(d.get('quoteNote')||''),target:Number(d.get('target')),rights:String(d.get('rights')||''),reason:String(d.get('reason')||''),date:String(d.get('date')||''),url:String(d.get('url')||''),distribution:String(d.get('distribution')||'')});if(kind==='reopenSubmission'){save();f.dataset.committed='true';pageDirty=false;resubmissionId='';creatorSubmitOpen=false;switchWorkspace('followup');queue='all';stage='提报审核';render();coopDetail(id);showSaveToast('已重新提报，等待 PM 审核。');return;}refreshCoop(id,kind,result);return;}save();f.dataset.committed='true';if(kind==='submit'){pageDirty=false;submittedProposalId=submitted.id;creatorSubmitOpen=true;if(typeof window!=='undefined'&&window.history){const hash='#creators/'+encodeURIComponent(id);window.history.replaceState(null,'',hash);acceptedHash=hash;}}close();if(createdId){creatorPageId='';creatorSubmitOpen=false;page='creators';reset();if(typeof window!=='undefined'&&window.history){window.history.replaceState(null,'','#creators');acceptedHash='#creators';}}render();if(createdId)highlightNewCreator(createdId);showSaveToast(submitted?'已提报到 '+P(submitted.campaignId).name+(submitted.selfManagedPmId?'，待正式对客报价。':'，等待 PM 审核。'):'已保存。');if(createdId)creatorSavedPrompt(createdId);}catch(error){db=JSON.parse(snapshot);workflowError(f,error);focusInvalidField(f,error.message);}finally{delete f.dataset.busy;f.querySelectorAll('button').forEach(b=>b.disabled=false);}});
root.addEventListener('keydown',e=>{if(e.target.matches('.creator-card,tr[data-detail-row]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.click();return;}if(e.key==='Escape'&&settingsOpen&&!root.querySelector('.detail-drawer')){settingsOpen=false;render();root.querySelector('[data-view-settings]')?.focus();return;}const p=root.querySelector('.detail-drawer');if(!p)return;if(e.key==='Escape')close();if(e.key==='Tab'){const els=[...p.querySelectorAll('button,input,select,textarea,a[href],summary')].filter(x=>!x.disabled&&x.getClientRects().length);if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus();}}});
if(storageError)document.getElementById('crm-feedback').textContent=storageError;


function detailRowAttributes(kind,id,label){return 'data-detail-row data-'+kind+'="'+esc(id)+'" tabindex="0" aria-haspopup="dialog" aria-label="'+esc(label)+'"';}
function detailClickTarget(target){
 if(target.closest('a,input,select,textarea,label,summary,[contenteditable="true"]'))return null;
 return target.closest('button')||target.closest('.creator-card')||target.closest('tr[data-detail-row]');
}
function accountSummary(c){return [...new Set(socialAccounts(c).map(a=>a.platform))].join(' / ')||'平台待补充';}
function proposalVideoTags(r,c){
 const items=r.proposalVersions?.at(-1)?.items;
 const entries=items?.length?items:[{platform:r.platform||accountSummary(c),type:r.contentType}];
 return '<div class="proposal-video-groups">'+entries.map(i=>'<div class="delivery-video-tags"><span>'+esc(i.platform||'平台待补充')+'</span><span>'+esc(i.type||'类型待补充')+(i.quantity>1?' × '+esc(i.quantity):'')+'</span></div>').join('')+'</div>';
}
function cooperationStageControl(r){
 const stage=proposalStageOf(r);
 return stage==='已完成'&&r.proposalVersions&&!r.orderId?'<button type="button" class="cooperation-complete" data-offer-order="'+esc(r.id)+'" aria-label="已完成，选择是否创建订单">已完成</button>':esc(stage);
}
function offerOrder(id){
 const r=visibleCoops(db,user).find(x=>x.id===id);
 if(!r||!r.proposalVersions||proposalStageOf(r)!=='已完成')return;
 if(r.orderId){coopDetail(id);return;}
 if(root.querySelector('.detail-drawer'))drawerStack.push(drawerFrame());
 dialog={kind:'orderPrompt',id};
 const canCreate=allowedActions(db,user,r).createOrder;
 panel('是否创建订单？','<section class="creator-saved-content"><h2>合作已完成，是否现在创建订单？</h2><p>'+esc(C(r.creatorId).name)+' · '+esc(P(r.campaignId).name)+'</p><p>双方已确认当前方案及价格。创建订单后将生成 '+packagePricing(r).quantity+' 条独立视频交付。</p>'+(!canCreate?'<p class="scope-note">请由负责运营创建订单。</p>':'')+'</section><div class="actions"><button data-close>暂不创建</button>'+(canCreate?'<button class="primary" data-action="createOrder" data-coop-id="'+esc(id)+'">创建订单</button>':'')+'</div>');
}
function recordStatus(r){const value=page==='delivery'?deliveryStatus(db,r):proposalStatus(r);return '<span class="status" data-status="'+esc(value)+'">'+esc(value)+'</span>';}
function listStage(r){return page==='delivery'?deliveryStage(db,r):proposalStageOf(r);}
function orders(rows){
 return '<div class="order-scroll"><table class="orders proposal-table proposal-list'+(showPrices?' has-prices':'')+'" aria-label="提报跟进列表"><thead><tr>'+['达人 / 提报编号','项目 / 视频','负责运营','合作阶段','具体进度',...(showPrices?['达人最新报价','客户最新报价']:[]),'最近更新','停留时间（小时）'].map(t=>'<th scope="col">'+t+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>{
 const c=C(r.creatorId),step=nextStep(db,user,r),time=updatedInfo(r),stay=proposalStayHours(r),overdue=isProposalOverdue(r);
 return '<tr '+detailRowAttributes('coop',r.id,'查看提报 · '+c.name)+' class="'+(step.action?'has-task':'')+'"><td><button class="creator-title" data-creator="'+esc(c.id)+'">'+esc(c.name)+'</button><small class="record-id" title="'+esc(r.id)+'">'+esc(r.proposalCode||r.id)+'</small></td><td class="delivery-project-cell"><strong class="delivery-project-name" title="'+esc(P(r.campaignId).name)+'">'+esc(P(r.campaignId).name)+'</strong>'+proposalVideoTags(r,c)+'</td><td>'+esc(userName(r.ownerId))+'</td><td>'+cooperationStageControl(r)+'</td><td>'+recordStatus(r)+(page==='followup'&&queue==='mine'&&allowedActions(db,user,r).acknowledgeRejection?'<small>'+esc(r.closeReason)+'</small>':'')+'</td>'+(showPrices?'<td class="numeric">'+money(r.effectivePricing?.cost??r.final??r.creatorQuoteReplies?.filter(x=>x.versionId===r.proposalVersions?.at(-1)?.id).at(-1)?.amount??r.proposalVersions?.at(-1)?.total??r.history.at(-1)?.quote??r.initial,r.currency)+'<small>'+(r.final!=null?'最终报价':r.proposalVersions?'方案 V'+r.proposalVersions.at(-1).version:r.history.length?'第 '+r.history.length+' 轮回价':'初始报价')+'</small></td><td class="numeric">'+money(r.effectivePricing?.clientPrice??r.clientPrice??clientQuoteHistory(r).at(-1)?.amount??r.clientQuoteDraft?.amount,r.currency)+'</td>':'')+'<td><small>'+esc(time.at?new Date(time.at).toLocaleString('zh-CN'):'待补充')+'</small><small>'+esc(time.label)+'</small></td><td class="numeric proposal-stay'+(overdue?' is-overdue':'')+'" title="当前具体进度的停留时长，超过 12 小时计入已逾期">'+(stay===null?'—':stay.toFixed(1))+'</td></tr>';
 }).join('')+'</tbody></table></div>';
}

function orderAction(r){const step=nextStep(db,user,r),delivery=page==='delivery';return (step.action?'<button class="next-action" data-coop="'+esc(r.id)+'">'+esc(step.label)+'</button>':'<small>'+esc(r.proposalVersions&&r.orderId?'已创建订单':step.label)+'</small>')+'<button class="text-button" data-coop="'+esc(r.id)+'">'+(delivery?'查看视频详情':page==='followup'?'查看提报':'查看合作')+'</button>';}
function board(rows){return '<div class="board-scroll">'+[...moduleStages().slice(1),...(page==='delivery'&&rows.some(r=>deliveryStage(db,r)==='已结束')?['已结束']:[])].map(st=>{const rr=rows.filter(r=>listStage(r)===st);return '<section class="board-column"><h3>'+st+' <span>'+rr.length+'</span></h3>'+rr.map(r=>'<article class="board-card"><button class="creator-title" data-coop="'+esc(r.id)+'">'+esc(C(r.creatorId).name)+'</button><small>'+esc(P(r.campaignId).name)+'</small><small>'+esc(userName(r.ownerId))+'</small><span class="status" data-status="'+esc(page==='delivery'?deliveryStatus(db,r):proposalStatus(r))+'">'+esc(page==='delivery'?deliveryStatus(db,r):proposalStatus(r))+'</span><p>'+money(r.effectivePricing?.cost??r.final??r.creatorQuoteReplies?.filter(x=>x.versionId===r.proposalVersions?.at(-1)?.id).at(-1)?.amount??r.proposalVersions?.at(-1)?.total??r.history.at(-1)?.quote??r.initial,r.currency)+'</p>'+orderAction(r)+'</article>').join('')+(!rr.length?'<p class="muted">暂无订单</p>':'')+'</section>';}).join('')+'</div>';}
function calendar(rows){const {scheduled,unscheduled}=calendarOrders(rows,month),[y,m]=month.split('-').map(Number),offset=(new Date(y,m-1,1).getDay()+6)%7,days=new Date(y,m,0).getDate();let cells='';for(let i=0;i<Math.ceil((offset+days)/7)*7;i++){const d=i-offset+1,date=month+'-'+String(d).padStart(2,'0'),inside=d>0&&d<=days;cells+='<div class="calendar-day '+(inside?'':'outside')+'">'+(inside?'<span>'+d+'</span>'+scheduled.filter(r=>r.date===date).map(r=>'<button data-coop="'+esc(r.id)+'"><strong>'+esc(C(r.creatorId).name)+'</strong><small>'+esc(proposalStatus(r))+'</small></button>').join(''):'')+'</div>';}
 return '<section class="calendar-panel"><div class="calendar-heading"><h2>'+y+' 年 '+m+' 月</h2><div><button data-month="-1" aria-label="上个月">←</button><button data-month="today">今天</button><button data-month="1" aria-label="下个月">→</button></div></div><p class="muted">按预计发布日期展示 · 当前月 '+scheduled.length+' 笔 · 保留当前筛选条件</p><div class="calendar-scroll"><div class="calendar-grid">'+['一','二','三','四','五','六','日'].map(d=>'<div class="weekday">周'+d+'</div>').join('')+cells+'</div></div><div class="unscheduled"><h3>未排期 · '+unscheduled.length+'</h3><p class="muted">已确认合作但尚无有效发布日期</p>'+unscheduled.map(r=>'<button data-coop="'+esc(r.id)+'">'+esc(C(r.creatorId).name)+' · '+esc(P(r.campaignId).name)+'</button>').join('')+'</div></section>';}
function orderView(rows,type){if(type==='calendar')return calendar(rows);if(type==='board')return board(rows);return rows.length?orders(rows):empty(queue==='mine'?'当前没有符合条件的待办':'暂无符合条件的订单');}
function manageViews(){dialog={kind:'views'};panel('管理常用视图',savedViewsFor(db,user).map(v=>'<div class="saved-view-row"><strong>'+esc(v.name)+'</strong><button data-rename-view="'+esc(v.id)+'">重命名</button><button data-delete-view="'+esc(v.id)+'">删除</button></div>').join('')||'<p>尚未保存视图。在提报跟进中设置筛选后，点击“保存当前视图”。</p>');}
async function copyCreatorEmail(email){
 try{
  if(!globalThis.navigator?.clipboard?.writeText)throw Error('Clipboard unavailable');
  await navigator.clipboard.writeText(email);
  showSaveToast('邮箱已复制');
 }catch{showSaveToast('复制失败，请重试或手动复制邮箱');}
}
function handleWorkspaceClick(b){
 if(b.dataset?.resubmitProposal){const r=db.collaborations.find(r=>r.id===b.dataset.resubmitProposal);if(r&&allowedActions(db,user,r).reopenSubmission)openCreatorPage(r.creatorId,true,r.id);return true;}

 if(b.hasAttribute('data-show-creator-confirmation')){const area=b.closest('.creator-confirmation').querySelector('.creator-confirmation-form');area.hidden=!area.hidden;b.setAttribute('aria-expanded',String(!area.hidden));if(!area.hidden)area.querySelector('input[type="date"]').focus();return true;}
 if(b.hasAttribute('data-show-rejection')){const area=b.closest('.submission-decision').querySelector('#rejection-reason');area.hidden=false;b.setAttribute('aria-expanded','true');area.querySelector('textarea').focus();return true;}

 if(b.hasAttribute('data-copy-email')){void copyCreatorEmail(b.dataset.copyEmail);return true;}

 if(b.dataset?.addDelivery!=null||b.dataset?.removeDelivery!=null){
  const adding=b.dataset.addDelivery!=null,index=b.dataset.addDelivery??b.dataset.removeDelivery;
  const box=b.closest('[data-proposal-deliverables]'),row=index==='next'?box.querySelector('[data-delivery-row][hidden]'):box.querySelector('[data-delivery-row="'+index+'"]');if(!row)return true;
  if(b.disabled)return true;
  row.hidden=!adding;
  row.querySelectorAll('input,select').forEach(el=>{el.disabled=!adding||el.dataset.platformAvailable==='false';});
  box.querySelector('[data-add-delivery="next"]').hidden=!box.querySelector('[data-delivery-row][hidden]');
  if(adding)row.querySelector('select').focus();
  if(b.closest('.detail-drawer'))drawerDirty=true;else pageDirty=true;
  return true;
 }

 if(b.hasAttribute('data-clear-creator-selection')){selectedCreators.clear();renderOperatorCreatorList();return true;}
 if(b.hasAttribute('data-delete-creators')){
  const ids=[...selectedCreators];if(!ids.length)return true;
  const names=ids.map(id=>C(id)?.name||id);
  if(!globalThis.confirm('确认删除选中的 '+ids.length+' 位达人？\n'+names.slice(0,8).join('、')+(names.length>8?' 等':'')+'\n删除后无法恢复。'))return true;
  const snapshot=JSON.stringify(db);
  try{const count=deleteCreators(db,user,ids);save();selectedCreators.clear();renderOperatorCreatorList();showSaveToast('已删除 '+count+' 位达人。');}
  catch(error){db=JSON.parse(snapshot);throw error;}
  return true;
 }

 if(b.dataset.intakeRemove!=null){const removed=intakeAccounts.splice(Number(b.dataset.intakeRemove),1)[0],field=root.querySelector('[data-intake-link]');if(field&&removed){try{if(parseCreatorProfile(field.value.trim()).url.toLowerCase()===removed.url.toLowerCase()){field.value='';field.removeAttribute('aria-invalid');root.querySelector('[data-intake-status]').textContent='已移除账号，可粘贴其他主页链接。';}}catch{}}drawerDirty=true;renderIntakeAccounts();return true;}
 if(b.dataset.creatorSection){if(!confirmDiscard())return true;creatorDetail(b.dataset.creatorId,b.dataset.creatorSection==='view'?'':b.dataset.creatorSection);return true;}
 if(b.dataset.reminderAction){const snapshot=JSON.stringify(db);try{const task=updateReminder(db,user,b.dataset.reminderId,b.dataset.reminderAction);refreshCoop(task.objectId);}catch(error){db=JSON.parse(snapshot);throw error;}return true;}
 if(b.dataset.editCreator){openObject('edit',b.dataset.editCreator);return true;}
 if(b.hasAttribute('data-drawer-back')){returnToSource();return true;}
 if(b.dataset.peer){openPeer(Number(b.dataset.peer));return true;}
 if(b.dataset.originalProposal){if(page!=='delivery')openRelatedProposal(b.dataset.originalProposal);return true;}

 if(b.hasAttribute('data-more-filters')){moreFilters=!moreFilters;render();root.querySelector('[data-more-filters]').focus();}
 else if(b.hasAttribute('data-view-settings')){settingsOpen=!settingsOpen;render();root.querySelector('[data-view-settings]').focus();}
 else if(b.dataset.removeFilter){const k=b.dataset.removeFilter;if(k==='platform')platform='全部';if(k==='country')country='全部';if(k==='status')status='全部';if(k==='owner')owner='全部';render();root.querySelector('[data-more-filters]').focus();}
 else if(b.dataset.overviewStage){projectTab='orders';stage=b.dataset.overviewStage;metric='all';q='';status=owner=platform=country='全部';render();}
 else if(b.dataset.view){view=b.dataset.view;render();}
 else if(b.hasAttribute('data-return-creator'))close();
 else if(b.dataset.month){const [y,m]=month.split('-').map(Number);month=b.dataset.month==='today'?new Date().toISOString().slice(0,7):new Date(Date.UTC(y,m-1+Number(b.dataset.month),1)).toISOString().slice(0,7);render();}
 else if(b.hasAttribute('data-save-view')){dialog={kind:'saveView'};panel('保存当前视图',form('saveView','',input('视图名称 *','name'),'保存'));}
 else if(b.hasAttribute('data-manage-views'))manageViews();
 else if(b.dataset.renameView){const v=savedViewsFor(db,user).find(v=>v.id===b.dataset.renameView);if(v)panel('重命名视图',form('renameView',v.id,input('视图名称 *','name',v.name),'保存名称'));}
 else if(b.dataset.deleteView){const snapshot=JSON.stringify(db);try{deleteView(db,user,b.dataset.deleteView);save();render();manageViews();}catch(e){db=JSON.parse(snapshot);throw e;}}
 else if(b.dataset.loadView){const saved=savedViewsFor(db,user).find(v=>v.id===b.dataset.loadView);if(saved){const f=saved.config;reset();q=f.q||'';platform=f.platform||'全部';country=f.country||'全部';owner=user.role==='operator'?'全部':f.owner||'全部';campaignFilter=f.campaignFilter||'全部';stage=stages.includes(f.stage)?f.stage:'全部';status=f.status==='订单已创建'?'已创建订单':statuses.includes(f.status)?f.status:'全部';queue=['mine','others','all','today','overdue'].includes(f.queue)?f.queue:'mine';sort=f.sort==='recent'?'recent':'pending';view=['list','board','calendar'].includes(f.view)?f.view:'list';showPrices=Boolean(f.showPrices);activeView=saved.id;render();root.querySelector('[data-view-settings]')?.focus({preventScroll:true});}}
 else if(b.dataset.projectTab){projectTab=b.dataset.projectTab;render();}
 else if(b.dataset.projectView){projectView=b.dataset.projectView;render();}
 else if(b.dataset.metric){metric=b.dataset.metric;projectTab='orders';stage=status='全部';q='';owner=platform=country='全部';queue='all';render();}
 else if(b.dataset.memberOrders){owner=b.dataset.memberOrders;projectTab='orders';metric='all';stage=status=platform=country='全部';q='';render();}
 else return false;return true;
}

function parseCreatorProfile(raw){let u;try{u=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);}catch{throw Error('请粘贴完整的达人主页链接。');}if(!['http:','https:'].includes(u.protocol))throw Error('请使用 HTTP 或 HTTPS 主页链接。');const host=u.hostname.toLowerCase().replace(/^www\./,''),parts=u.pathname.split('/').filter(Boolean);const tabs=['videos','shorts','streams','featured','playlists','community','about'];if(host==='youtube.com'&&((parts[0]?.startsWith('@')&&parts.length===2&&tabs.includes(parts[1]))||(parts[0]==='channel'&&parts.length===3&&tabs.includes(parts[2]))))parts.pop();let platform,handle,kind='Handle';if(host==='tiktok.com'&&parts.length===1&&/^@[\w.]+$/.test(parts[0])){platform='TikTok';handle=parts[0];}else if(host==='instagram.com'&&parts.length===1&&!['p','reel','reels','stories','explore','accounts','direct'].includes(parts[0])&&/^[\w.]+$/.test(parts[0])){platform='Instagram';handle='@'+parts[0];}else if(host==='youtube.com'&&parts.length===1&&parts[0].startsWith('@')&&parts[0].length>1){platform='YouTube';handle=decodeURIComponent(parts[0]);}else if(host==='youtube.com'&&parts.length===2&&parts[0]==='channel'&&/^UC[\w-]+$/.test(parts[1])){platform='YouTube';handle=parts[1];kind='频道 ID';}else throw Error('未识别到支持的主页格式，请复制账号主页完整链接；视频链接和短链接暂不识别。');return {platform,handle,kind,url:'https://'+host+'/'+parts.join('/')+(platform==='Instagram'?'/':''),followers:'',views:''};}


const intakePlatforms=['TikTok','Instagram','YouTube'];
const intakeCountries=['美国','英国','加拿大','澳大利亚','德国','法国','泰国','越南','印度尼西亚','马来西亚','菲律宾','新加坡','日本','韩国'];
const intakeLanguages=['英语','中文','泰语','越南语','印度尼西亚语','马来语','菲律宾语','日语','韩语','德语','法语','西班牙语','葡萄牙语'];
let intakeAccounts=[],intakePending={};
function openCreatorIntake(){
 intakeAccounts=[];intakePending={};dialog={kind:'new'};
 const choose=(label,name,choices)=>'<label>'+label+' *<select name="'+name+'" required aria-required="true">'+options([['','请选择'+label],...choices],'')+'</select></label>';
 panel('新增达人',form('creator','','<label class="full">达人主页链接<input data-intake-link autocomplete="off" name="profile" placeholder="粘贴 TikTok、Instagram 或 YouTube 主页链接"></label><p class="full scope-note" data-intake-status role="status">识别后保留链接供核对；添加其他账号时，可替换此处链接继续识别。</p>'+input('达人名称','name','','text',false)+input('邮箱 *','contact','','email')+choose('国家','country',intakeCountries)+choose('语言','language',intakeLanguages)+'<input type="hidden" name="metricsUnit" value="k"><input type="hidden" name="accountsJSON" value="[]"><section class="full intake-platforms"><div class="section-heading"><h3>平台账号</h3><small>平台与 Handle 自动识别 · 指标单位 k（1k = 1,000）</small></div><div data-intake-accounts></div></section>','保存达人').replace('<div class="actions">','<div class="actions"><button type="button" data-close>取消</button>'));
 renderIntakeAccounts();
}
function intakeMetricValue(value,unit){
 if(value==null||value==='')return null;
 const raw=Number(value)*(unit==='k'?1000:1),rounded=Math.round(raw);
 if(!Number.isFinite(raw)||raw<0||!Number.isSafeInteger(rounded)||Math.abs(raw-rounded)>0.000001)throw Error('粉丝量和均播请填写非负数，k 单位最多保留三位小数，未知时留空');
 return rounded;
}
function syncIntakeAccounts(){const f=root.querySelector('form[data-kind="creator"]');if(f)f.querySelector('[name="accountsJSON"]').value=JSON.stringify(intakeAccounts);}
function renderIntakeAccounts(){
 const box=root.querySelector('[data-intake-accounts]');if(!box)return;
 const metrics=(a,attrs)=>'<div class="grid"><label>粉丝量（k）<input type="number" min="0" step="0.001" data-intake-metric="followers" '+attrs+' value="'+esc(a.followers??'')+'" placeholder="手动填写"></label><label>均播（k）<input type="number" min="0" step="0.001" data-intake-metric="views" '+attrs+' value="'+esc(a.views??'')+'" placeholder="手动填写"></label></div>';
 box.innerHTML=intakePlatforms.map(p=>{const rows=intakeAccounts.map((a,i)=>({...a,i})).filter(a=>a.platform===p);return '<section class="intake-platform"><div class="section-heading"><h3>'+p+'</h3><small>'+(rows.length?'已识别 '+rows.length+' 个账号':'未添加账号')+'</small></div>'+(rows.length?rows.map(a=>'<div class="intake-account"><div class="section-heading"><strong>'+safeLink(a.url,a.handle+' ↗')+'</strong><button type="button" data-intake-remove="'+a.i+'">移除</button></div>'+metrics(a,'data-intake-index="'+a.i+'"')+'</div>').join(''):'<p class="muted">识别到此平台的主页后，自动补充到这里。</p>'+metrics(intakePending[p]||{},'data-intake-platform="'+p+'"'))+'</section>';}).join('');syncIntakeAccounts();
}
function addIntakeLink(){
 const field=root.querySelector('[data-intake-link]');if(!field||!field.value.trim())return true;
 const status=root.querySelector('[data-intake-status]');
 try{const a=parseCreatorProfile(field.value.trim());field.removeAttribute('aria-invalid');if(intakeAccounts.some(b=>b.url.toLowerCase()===a.url.toLowerCase())){status.textContent='该主页已添加，不会重复添加。';return true;}
 Object.assign(a,intakePending[a.platform]||{});delete intakePending[a.platform];intakeAccounts.push(a);status.textContent='已识别 '+a.platform+' · '+a.handle;renderIntakeAccounts();return true;
 }catch(error){status.textContent=error.message;field.setAttribute('aria-invalid','true');return false;}
}
root.addEventListener('change',e=>{if(e.target.matches('[data-intake-link]'))addIntakeLink();});
function previewAddedAccount(field){
 const status=field.closest('form')?.querySelector('[data-add-account-status]');if(!status)return;
 if(!field.value.trim()){status.textContent='自动识别平台与 Handle；粉丝量、均播按 k 填写。';field.removeAttribute('aria-invalid');return;}
 try{const a=parseCreatorProfile(field.value.trim());status.textContent='已识别 '+a.platform+' · '+a.handle;field.removeAttribute('aria-invalid');}
 catch(error){status.textContent=error.message;field.setAttribute('aria-invalid','true');}
}
root.addEventListener('input',e=>{if(e.target.matches('[data-add-account-link]'))previewAddedAccount(e.target);});

root.addEventListener('paste',e=>{if(e.target.matches('[data-intake-link]'))setTimeout(addIntakeLink,0);});
root.addEventListener('keydown',e=>{if(e.target.matches('[data-intake-link]')&&e.key==='Enter'){e.preventDefault();addIntakeLink();}});
root.addEventListener('input',e=>{const el=e.target;if(!el.dataset.intakeMetric)return;const a=el.dataset.intakeIndex!=null?intakeAccounts[Number(el.dataset.intakeIndex)]:(intakePending[el.dataset.intakePlatform]??={});a[el.dataset.intakeMetric]=el.value;syncIntakeAccounts();});

function inferPlatform(url){try{const h=new URL(url).hostname.toLowerCase().replace(/^www\./,'');return h==='tiktok.com'?'TikTok':h==='instagram.com'?'Instagram':['youtube.com','m.youtube.com'].includes(h)?'YouTube':'';}catch{return '';}}
function validProfileURL(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)&&Boolean(u.hostname);}catch{return false;}}
function normalizeProfile(url){try{const u=new URL(url);return u.hostname.toLowerCase().replace(/^www\./,'')+u.pathname.replace(/\/+$/,'').toLowerCase();}catch{return '';}}

function projectSummary(rows){const m=summary(db,user,rows);return '<section class="ds-summary" aria-label="合作概览">'+[{label:'待我处理',value:m.pending,description:'需要你推进的合作订单'},{label:'议价中',value:m.negotiating,description:'运营议价、PM 反馈及客户确认中'},{label:'已完成合作',value:m.cooperationCompleted,description:'双方已确认当前方案及价格'},{label:'Margin · 按币种',value:marginText(m),description:m.known+' 笔价格齐全 · '+m.missing+' 笔待补价格'}].map(MetricCard).join('')+'</section>';}
function renderProjects(accessible){
 const rows=visibleCoops(db,user);
 if(!campaignId){content.innerHTML=projectSummary(rows)+'<div class="list-result-actions"><span class="ds-result">'+accessible.length+' 个项目</span>'+(['pm','admin'].includes(user.role)?Button({label:'新建 campaign',attribute:'data-new-project',variant:'primary'}):'')+'</div><section class="campaign-grid">'+accessible.map(p=>{const records=rows.filter(r=>r.campaignId===p.id);return '<article class="box project-card"><div class="project-card-heading"><h3>'+esc(p.name)+'</h3><span class="platform-chip">'+esc(p.client)+'</span></div><p class="project-requirements">'+esc(p.requirements||'项目要求待补充')+'</p><dl class="project-facts"><div><dt>项目负责人</dt><dd>'+esc(userName(p.pmId))+'</dd></div><div><dt>运营成员</dt><dd>'+p.members.map(userName).map(esc).join('、')+'</dd></div></dl><div class="project-counts"><span><strong>'+records.length+'</strong> 笔可见订单</span><span><strong>'+records.filter(r=>isPending(db,user,r)).length+'</strong> 笔待我处理</span></div>'+Button({label:'进入项目 →',attribute:'data-project="'+esc(p.id)+'"'})+(user.role==='admin'?'<button data-region-project="'+esc(p.id)+'">地区 PM 分工与交接</button>':'')+'</article>';}).join('')+'</section>'+(!accessible.length?'<div class="ds-empty">暂无参与的 campaign，请由 PM 添加你为项目成员。</div>':'');return;}
 const p=accessible.find(p=>p.id===campaignId);if(!p){campaignId='';render();return;}
 const scoped=rows.filter(r=>r.campaignId===p.id),base=selectOrders(db,user,criteria({stage:'全部',queue:'all',campaignFilter:'全部'}),scoped),shown=selectOrders(db,user,criteria({queue:'all',campaignFilter:'全部'}),scoped);
 const tabs='<div class="queue-tabs">'+[['orders','合作订单'],['overview','项目概览'],['members','项目成员'],...(user.role==='admin'?[['regional','地区 PM 分工']]:[])].map(([k,l])=>'<button data-project-tab="'+k+'" aria-pressed="'+(projectTab===k)+'">'+l+'</button>').join('')+'</div>';
 let body='';
 if(projectTab==='orders')body='<div class="view-toolbar"><div class="segmented">'+[['cards','达人卡片'],['list','列表'],['board','阶段看板']].map(([k,l])=>'<button data-project-view="'+k+'" aria-pressed="'+(projectView===k)+'">'+l+'</button>').join('')+'</div>'+(metric!=='all'?'<span class="scope-note">已按项目指标筛选 <button data-metric="all">查看全部订单</button></span>':'')+'</div>'+stageTabs(base)+toolbar(true)+(projectView==='cards'?DataList(shown.map(r=>card(C(r.creatorId),r)).join(''),shown.length):orderView(shown,projectView));
 if(projectTab==='overview')body=projectOverview(scoped);
 if(projectTab==='regional'&&user.role==='admin')body=regionalPanel(p);
 if(projectTab==='members')body='<p class="scope-note">仅统计当前账号可见订单；待办数量表示需要该成员处理的可见订单。</p><div class="campaign-grid">'+[p.pmId,...p.members].map(id=>{const member=USERS.find(u=>u.id===id),rr=scoped.filter(r=>id===p.pmId||r.ownerId===id),restricted=user.role==='operator'&&id!==user.id;return '<article class="box"><h3>'+esc(userName(id))+'</h3>'+(restricted?'<p class="muted">成员订单按权限隔离</p>':'<p>'+rr.length+' 笔可见订单</p><p>'+rr.filter(r=>member&&isPending(db,member,r)).length+' 笔待办</p>'+(id===p.pmId?'<button data-metric="all">查看项目订单</button>':'<button data-member-orders="'+esc(id)+'">查看负责订单</button>'))+'</article>';}).join('')+'</div>';
 content.innerHTML=PageHeader({title:p.name,description:p.client+' · '+p.requirements,back:Button({label:'← 项目列表',attribute:'data-projects-back',variant:'ghost'}),action:user.role==='admin'||p.pmId===user.id?Button({label:'管理成员',attribute:'data-members="'+esc(p.id)+'"'}):''})+tabs+body;
}
function projectOverview(rows){const m=summary(db,user,rows),metrics=[['all','提报总数',m.total,'包含已结束订单'],['pending','待我处理',m.pending,'当前账号需推进'],['cooperationCompleted','已完成合作',m.cooperationCompleted,'双方已确认当前方案及价格'],['production','制作中',m.production,'脚本或视频制作'],['published','已发布',m.published,'已有实际发布链接'],['accepted','视频验收完成',m.accepted,'客户验收通过'],['priced','Margin · 按币种',marginText(m),m.known+' 笔双方价格完整']];return '<section class="ds-summary">'+metrics.map(([key,label,value,description])=>'<button class="ds-metric metric-button" data-metric="'+key+'"><span>'+label+'</span><strong>'+value+'</strong><p>'+description+'</p></button>').join('')+'</section><section class="box"><h3>验收进度</h3><p>'+ (m.effective?m.accepted+' / '+m.effective+' · 已完成 / 有效确认合作':'暂无有效确认合作')+'</p><progress value="'+m.accepted+'" max="'+Math.max(1,m.effective)+'"></progress><small>有效确认合作不含确认后取消的订单</small></section><section class="box"><h3>阶段分布</h3><div class="stage-distribution">'+proposalStages.slice(1).map(st=>'<button data-overview-stage="'+st+'"><span>'+st+'</span><strong>'+rows.filter(r=>proposalStageOf(r)===st).length+'</strong></button>').join('')+'</div></section>';}

root.addEventListener('click',e=>{if(settingsOpen&&!e.target.closest('#view-settings,[data-view-settings],.detail-drawer')){settingsOpen=false;render();root.querySelector('[data-view-settings]')?.focus({preventScroll:true});}});

// Legacy delivery adapter: retains the original record and audit history.
// This view does not invent Package items or migrate browser data.
function deliveryRows(overrides={}){
 const f=criteria(overrides);
 return selectOrders(deliveryContext(db),user,{...f,stage:'全部',status:'全部',metric:'all',platform:'全部'}).filter(r=>(f.stage==='全部'||deliveryStage(db,r)===f.stage)&&(f.status==='全部'||deliveryStatus(db,r)===f.status)&&(platform==='全部'||(r.platform||C(r.creatorId).platform)===platform)).sort((a,b)=>a.orderId&&a.orderId===b.orderId&&isPending(db,user,a)===isPending(db,user,b)&&updatedInfo(a).at===updatedInfo(b).at?a.name.localeCompare(b.name,undefined,{numeric:true}):0);
}
function deliveryControls(rows){
 const extra=[['platform','平台',platform],['country','国家',country],['status','具体进度',status],['owner','负责运营',owner]].filter(x=>x[2]!=='全部');
 const base=deliveryRows({stage:'全部'});
 return '<section class="compact-controls delivery-controls" aria-label="视频交付筛选"><div class="compact-top"><div class="queue-tabs">'+[['mine','待我处理'],['others','等待他人'],['all','全部交付'],['today','今日待跟进'],['overdue','已逾期']].map(([key,label])=>'<button data-queue="'+key+'" aria-pressed="'+(queue===key)+'">'+label+' <b>'+deliveryRows({queue:key,stage:'全部'}).length+'</b></button>').join('')+'</div></div>'
 +'<div class="stage-tabs" aria-label="交付阶段">'+moduleStages().map(t=>'<button data-stage="'+t+'" aria-pressed="'+(stage===t)+'">'+t+' <span>'+base.filter(r=>t==='全部'||deliveryStage(db,r)===t).length+'</span></button>').join('')+'</div>'
 +'<div class="compact-search"><input id="crm-search" aria-label="搜索达人" value="'+esc(q)+'" placeholder="搜索名称、ID 或主页链接"><select data-filter="campaignFilter" aria-label="项目">'+options([['全部','全部项目'],...projectsFor(db,user).map(p=>[p.id,p.name])],campaignFilter)+'</select><button data-more-filters aria-expanded="'+moreFilters+'" aria-controls="more-filters">更多筛选'+(extra.length?' · '+extra.length:'')+'</button><span class="compact-result">'+rows.length+' 条视频交付</span>'+((q||campaignFilter!=='全部'||stage!=='全部'||extra.length)?'<button data-clear>清空筛选</button>':'')+'</div>'
 +(moreFilters?'<div id="more-filters" class="compact-extra">'+filter('平台','platform',['全部',...platforms],platform)+filter('国家','country',['全部',...new Set([...countries,...db.creators.map(c=>c.country).filter(Boolean)])],country)+filter('具体进度','status',['全部',...moduleStatuses()],status)+(['pm','admin'].includes(user.role)?filter('负责运营','owner',['全部',...USERS.filter(u=>visibleCoops(deliveryContext(db),user).some(r=>r.ownerId===u.id)).map(u=>[u.id,u.name])],owner):'')+'</div>':'')
 +(!moreFilters&&extra.length?'<div class="filter-chips">'+extra.map(([key,label,value])=>'<button data-remove-filter="'+key+'">'+label+'：'+esc(key==='owner'?userName(value):value)+' ×</button>').join('')+'</div>':'')
 +'</section>';
}
function deliveryEmpty(){
 const hasRecords=visibleCoops(deliveryContext(db),user).length>0;
 return '<section class="delivery-empty"><div class="delivery-empty-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><rect x="8" y="11" width="32" height="28" rx="5"/><path d="M8 20h32M17 11l6 9m5-9 6 9M21 26l8 4-8 4z"/></svg></div><h2>'+(hasRecords?'暂无符合条件的视频交付':'还没有视频交付任务')+'</h2><p>'+(hasRecords?'试试调整筛选条件，或切换处理范围查看其他交付。':'合作确认完成并创建订单后，视频交付任务会自动出现在这里。')+'</p><div class="delivery-empty-actions">'+(hasRecords?'<button data-clear>清空筛选</button><button class="primary" data-queue="all">查看全部交付</button>':'<button class="primary" data-page="followup">前往提报跟进 <span aria-hidden="true">→</span></button>')+'</div><div class="delivery-empty-flow"><span>合作确认</span><span aria-hidden="true">→</span><span>创建订单</span><span aria-hidden="true">→</span><span>视频交付</span></div></section>';
}

function renderDelivery(){
 const rows=deliveryRows();
 const table=items=>'<div class="order-scroll"><table class="orders proposal-table delivery-list'+(showPrices?' has-prices':'')+'" aria-label="视频交付列表"><thead><tr>'+['达人 / 交付 ID','项目 / 视频','负责运营','交付阶段','具体进度',...(showPrices?['合作价格','对客报价','Margin']:[]),'最近更新','停留时间（小时）'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+items.map(r=>{const time=updatedInfo(r),stay=deliveryStayHours(db,r);return '<tr '+detailRowAttributes('coop',r.id,'查看视频交付 · '+C(r.creatorId).name+' · '+(r.orderId?r.name:'历史交付'))+' class="'+(isPending(db,user,r)?'has-task':'')+'"><td><button class="creator-title" data-creator="'+esc(r.creatorId)+'">'+esc(C(r.creatorId).name)+'</button><small class="record-id" title="'+esc(deliveryNumber(r))+'">'+esc(deliveryNumber(r))+'</small></td><td class="delivery-project-cell"><strong class="delivery-project-name" title="'+esc(P(r.campaignId).name)+'">'+esc(P(r.campaignId).name)+'</strong><div class="delivery-video-tags"><span>'+esc(r.platform||C(r.creatorId).platform||'平台待补充')+'</span><span>'+esc(r.contentType||'类型待补充')+'</span></div></td><td>'+esc(userName(r.ownerId))+'</td><td>'+esc(deliveryStage(db,r))+'</td><td>'+recordStatus(r)+'</td>'+(showPrices?'<td class="numeric">'+esc(money(r.final??r.initial,r.currency))+'</td><td class="numeric">'+esc(money(r.effectivePricing?.clientPrice??r.clientPrice??clientQuoteHistory(r).at(-1)?.amount??r.clientQuoteDraft?.amount,r.currency))+'</td><td class="numeric">'+esc(money(margin(r),r.currency))+'</td>':'')+'<td><small>'+esc(time.at?new Date(time.at).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'待补充')+'</small><small>'+esc(time.label)+'</small></td><td class="numeric delivery-stay" title="进入当前具体进度后的停留时长">'+(stay===null?'—':stay.toFixed(1))+'</td></tr>';}).join('')+'</tbody></table></div>';
 content.innerHTML='<div class="delivery-workspace">'+deliveryControls(rows)+(rows.length?table(rows):deliveryEmpty())+'</div>';
}
function deliveryPublication(r){
 return '<div class="delivery-publication"><p>计划发布：'+esc(r.date||'未排期')+'</p><p>发布链接：'+safeLink(r.url)+'</p>'+(r.distribution?'<p>分发链接：'+safeLink(r.distribution)+'</p>':'')+(r.publications||[]).map(p=>'<p>'+esc(p.platform)+'：'+safeLink(p.url)+' · '+esc(({pending:'待发布',published:'已发布',submitted:'已发布',accepted:'已发布'})[p.status]||p.status)+'</p>').join('')+'</div>';
}
function deliveryDisclosureSummary(label,state,complete=false,actionable=false){
 const icon=complete?'<span class="delivery-complete-mark" aria-hidden="true">✓</span>':'<svg class="delivery-row-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5l3 3v10H4zM9 1.5v3h3M6 8h4M6 10.5h4"/></svg>';
 return '<summary>'+icon+'<span class="delivery-row-title">'+esc(label)+'</span><span class="muted'+(actionable?' is-actionable':'')+'">'+esc(state)+'</span><svg class="delivery-row-chevron" aria-hidden="true" viewBox="0 0 12 12" fill="none"><path d="m4.5 2.5 3.5 3.5-3.5 3.5"/></svg></summary>';
}
function completedDeliveryStage(r,key){
 const name=key==='script'?'脚本':'视频';
 return '<details class="delivery-finished" data-drawer-disclosure="'+key+'-completed">'+deliveryDisclosureSummary(name,'已通过',true)+deliveryHistory(r,key)+'</details>';
}
function deliveryBriefPanel(r){
 const order=(db.orders||[]).find(o=>o.id===r.orderId);if(!order)return '';
 const b=r.brief||order.brief||{},a=allowedActions(db,user,r);
 return '<details class="delivery-brief" data-drawer-disclosure="brief" '+(r.status==='待填写客户 Brief'?'open':'')+'>'+deliveryDisclosureSummary('Brief',r.status==='待填写客户 Brief'?'待填写／发送':r.briefSentAt?'已发送':'历史记录')+(b.url?'<p>'+safeLink(b.url,'查看 Brief ↗')+'</p>':'')+(a.deliveryBrief?form('deliveryBrief',r.id,input('Brief 链接','briefUrl',b.url,'url',false)+'<label class="full">补充说明<textarea name="briefDescription" rows="2">'+esc(b.description||'')+'</textarea></label><p class="full scope-note">保存不推进状态。</p>','保存'):'<p class="preserve-text">'+esc(b.description||'暂无补充说明')+'</p>')+(a.briefSent?'<p class="scope-note">仅记录发送结果，系统不会实际发送邮件。请先保存填写内容。</p><button class="primary" data-action="briefSent" data-coop-id="'+esc(r.id)+'">已发送 Brief</button>':'')+'</details>';
}
function deliveryStagePanels(r){
 const current=deliveryStage(db,r),done=r.status==='已完成';
 const prepare='<details class="delivery-finished" data-drawer-disclosure="preparation">'+deliveryDisclosureSummary('待补充信息','可选 · 与主流程并行')+preparationPanel(r)+'</details>';
 const groups=[['script','脚本阶段','脚本'],['video','视频阶段','草稿'],['publish','发布阶段','发布与验收']];
 const panels=groups.map(([key,stage,label])=>{
  const active=current===stage,has=key==='publish'?r.url:r.deliverables?.[key]?.length;
  if(!active&&!has)return '';
  const actions=active&&!done?operation(r,key):'';
  const resubmit=active&&r.status.endsWith('待修改')&&(key==='script'?allowedActions(db,user,r).scriptRevisionDone:allowedActions(db,user,r).videoSubmit)?'<p class="delivery-resubmit-note">请按在线文档意见处理后重新提交审核。</p>':'';
  const body=resubmit+(key==='publish'?deliveryFeedback(r)+deliveryPublication(r)+actions:deliveryHistory(r,key,actions));
  return '<section class="delivery-stage-block '+(active?'is-current':'is-completed')+'" data-workflow-section="delivery-'+key+'"><details class="delivery-current-disclosure" data-drawer-disclosure="delivery-'+key+'" '+(active?'open':'')+'>'+deliveryDisclosureSummary(label,active?deliveryStatus(db,r):done?'已完成':'已提交',done)+'<p class="workflow-form-error" data-operation-error role="alert" hidden></p>'+(r.returnNote&&active?'<p class="scope-note">退回备注：'+esc(r.returnNote)+'</p>':'')+'<div class="delivery-stage-body">'+body+'</div></details></section>';
 }).join('');
 return '<section class="delivery-interactions" aria-label="交付操作">'+(done?'<p class="scope-note">已完成 · 默认只读。验收日期：'+esc(r.acceptedAt?new Date(r.acceptedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'历史记录未提供')+'；验收金额以服务端为准。</p>':'')+prepare+panels+'</section>';
}
function deliveryDetail(id){
 const r=visibleCoops(deliveryContext(db),user).find(r=>r.id===id&&isConfirmed(r));if(!r)return;
 dialog={kind:'coop',id};tab='交付物';
 const platform=r.platform||C(r.creatorId).platform||'平台待补充',type=r.contentType||'视频';
 const basics='<section class="delivery-compact-summary" aria-label="交付基础信息"><details data-drawer-disclosure="cooperation"><summary><strong>'+esc(platform)+' · '+esc(type)+' × 1</strong><span>合作详情</span></summary>'+(r.orderId?'<p>订单编号：'+esc(orderNumber(db,r.orderId))+'</p>':'')+proposalAccountBasics(C(r.creatorId))+workflowCooperation(r,true)+workflowCreatorFacts(r,false)+'</details><small>交付 ID：'+esc(deliveryNumber(r))+'</small></section>';
 panel('视频交付 · '+C(r.creatorId).name,basics+deliveryBriefPanel(r)+deliveryStagePanels(r)+operatorHandoffPanel(r),workflowDrawerHeader(r,true));
}

const proposalTypes=['dedicated','integration','reel','short'];
function creatorProposalFields(c){
 const available=new Set(socialAccounts(c).filter(a=>a.handle&&a.url).map(a=>a.platform));
 return '<section class="full proposal-deliverables" data-proposal-deliverables><h3>2 · 交付内容</h3><input type="hidden" name="compactProposal" value="2">'+platforms.map((p,i)=>'<div class="proposal-delivery-row" data-delivery-row="'+i+'" '+(i?'hidden':'')+'><label>平台 *<select name="deliveryPlatform'+i+'" required '+(i?'disabled':'')+'><option value="">请选择平台</option>'+platforms.map(t=>'<option value="'+t+'" '+(available.has(t)?'':'disabled')+'>'+t+(available.has(t)?'':'（需先添加账号）')+'</option>').join('')+'</select></label><label>视频类型 *<select name="type'+i+'" required '+(i?'disabled':'')+'>'+options([['','请选择'],...proposalTypes],'')+'</select></label><label>数量 *<input name="quantity'+i+'" type="number" min="1" max="100" step="1" value="1" required '+(i?'disabled':'')+'></label><button type="button" data-remove-delivery="'+i+'">移除</button></div>').join('')+'<div class="proposal-platform-picker"><button type="button" data-add-delivery="next">＋ 添加交付内容</button></div><label>合作备注<textarea name="cooperationNotes" rows="2" placeholder="填写本次合作的补充要求，例如分发平台、分发视频数量"></textarea></label></section><h3 class="full">3 · 报价与权益</h3>'+input('方案总价（USD）','total','','number')+'<input type="hidden" name="currency" value="USD">'+input('合作权益','rights','','text',false);
}
function validateCompactProposal(d,c){
 if(!['1','2'].includes(d.get('compactProposal')))return;
 const data=packageData(d),available=new Set(socialAccounts(c).filter(a=>a.handle&&a.url).map(a=>a.platform));
 if(!data.items.length)throw Error('请添加至少一项交付内容');
 for(const item of data.items){
  if(!available.has(item.platform)||item.publicationPlatforms.some(p=>!available.has(p)))throw Error('请先补充合作平台的账号');
  if(!proposalTypes.includes(item.type))throw Error('请选择内容类型：dedicated、integration、reel 或 short');
  if(!Number.isInteger(item.quantity)||item.quantity<1)throw Error('交付数量必须是大于零的整数');
 }
}
function packageFields(v={}){
 return '<h3 class="full">2 · 交付内容</h3><p class="full scope-note">每条视频独立审核；分发要求请填写在合作备注中。</p>'+platforms.map((p,i)=>{const item=v.items?.find(x=>x.platform===p);return '<fieldset class="full package-platform"><legend>'+p+'</legend><div class="grid">'+input(p+' 视频数量（0 表示不合作）','quantity'+i,item?.quantity||0,'number')+input(p+' 内容类型','type'+i,item?.type||'视频','text',false)+'</div>'+platforms.filter(target=>target!==p&&item?.publicationPlatforms?.includes(target)).map(target=>'<input type="hidden" name="publication'+i+'" value="'+target+'">').join('')+'</fieldset>';}).join('')+'<h3 class="full">3 · 报价与权益</h3>'+input('方案总价','total',v.total??'','number')+'<label>币种<select name="currency">'+options(['CNY','USD','EUR','GBP'],v.currency||'CNY')+'</select></label>'+input('合作权益','rights',v.rights||'','text',false)+'<label class="full">合作备注<textarea name="cooperationNotes" rows="2">'+esc(v.cooperationNotes||'')+'</textarea></label>';
}
function packageData(d){return {cooperationNotes:String(d.get('cooperationNotes')||''),rights:String(d.get('rights')||''),total:Number(d.get('total')),currency:String(d.get('currency')||'CNY'),items:platforms.map((platform,i)=>({platform:['2','3'].includes(d.get('compactProposal'))?String(d.get('deliveryPlatform'+i)||''):platform,publicationPlatforms:d.get('compactProposal')==='2'?[]:d.getAll('publication'+i),quantity:Number(d.get('quantity'+i)),type:String(d.get('type'+i)||'')})).filter(x=>x.quantity!==0)};}
function customerProposalEditor(r,v){
 const actions=allowedActions(db,user,r);
 if(actions.correctVideoQuantity){
  const fields='<p class="full scope-note">补正客户已确认的视频数量，无需 PM 再次确认；整包价格与权益保持不变。</p>'+v.items.map((item,i)=>'<label class="full">'+esc(item.platform+' · '+item.type)+' 条数 *<input name="quantity'+i+'" type="number" min="1" max="100" step="1" required value="'+esc(item.quantity)+'"></label>').join('')+'<label class="full">补正说明 *<input name="reason" required maxlength="1000" placeholder="例如：客户已确认 2 条，原方案误录为 1 条"></label>';
  return '<details class="proposal-editor"><summary class="proposal-edit-toggle" aria-label="补正视频数量" title="补正视频数量"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M13 6l5 5"/></svg></summary>'+form('correctVideoQuantity',r.id,fields,'保存数量')+'</details>';
 }
 if(!actions.editCustomerProposal&&!actions.packageRevision)return '';
 let fields=resubmissionFields(v).replace(/<h3 class="full">.*?<\/h3>/g,'').replace(/<label>币种<select name="currency">.*?<\/select><\/label>/,'<input type="hidden" name="currency" value="'+esc(v.currency)+'">');
 const kind=actions.packageRevision?'packageRevision':'editCustomerProposal';if(kind==='editCustomerProposal')fields=fields.replace('name="total"','name="total" readonly');else fields+=input('修改说明','reason');
 return '<details class="proposal-editor"><summary class="proposal-edit-toggle" aria-label="编辑方案" title="编辑方案"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M13 6l5 5"/></svg></summary>'+form(kind,r.id,fields,'保存方案')+'</details>';
}
function proposalFinance(r){
 const p=packagePricing(r);
 return '<div class="proposal-finance" aria-label="整包价格"><div><span>合作总价</span><strong>'+esc(money(p.cost,p.currency))+'</strong></div><div><span>合作margin</span><strong'+(p.margin<0?' class="negative-margin"':'')+'>'+esc(money(p.margin,p.currency))+'</strong></div></div>';
}
function deliveryFinance(r,scope='单条'){
 const currency=r.currency||'CNY';
 return '<div class="proposal-finance" aria-label="'+(scope==='单条'?'单条视频价格':'整包价格')+'"><div><span>合作价 · '+esc(scope)+'</span><strong>'+esc(money(r.final??r.initial,currency))+'</strong></div><div><span>对客价 · '+esc(scope)+'</span><strong>'+esc(money(r.clientPrice,currency))+'</strong></div><div><span>'+(scope==='整包'?'合作margin':'Margin · '+esc(scope))+'</span><strong>'+esc(money(margin(r),currency))+'</strong></div></div>';
}
function proposalCooperationFields(v,compact=false){
 if(compact)return '<ul class="cooperation-summary-items" aria-label="合作视频">'+v.items.map(item=>'<li><span>'+esc(item.platform)+'</span><span>'+esc(item.type)+' × '+esc(item.quantity)+'</span></li>').join('')+'</ul>';
 return '<div class="proposal-accounts-scroll"><table class="proposal-cooperation-table" aria-label="合作内容"><thead><tr>'+['合作平台','视频类型','数量'].map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+v.items.map(item=>'<tr><td>'+esc(item.platform)+'</td><td>'+esc(item.type)+'</td><td>'+esc(item.quantity)+'</td></tr>').join('')+'</tbody></table></div><dl class="proposal-terms-facts"><div><dt>合作权益</dt><dd>'+esc(v.rights?.trim()||'未填写')+'</dd></div><div><dt>合作备注</dt><dd>'+esc(v.cooperationNotes?.trim()||'未填写')+'</dd></div></dl>';
}
function compactCooperation(v,finance,extra=''){
 const rights=v.rights?.trim();
 return workflowSection('cooperation','',proposalCooperationFields(v,true)+finance+(rights?'<dl class="proposal-terms-facts"><div><dt>合作权益</dt><dd>'+esc(rights)+'</dd></div></dl>':'')+extra,'package-summary cooperation-brief');
}
function packageHistory(r){
 const v=r.proposalVersions.at(-1);
 return compactCooperation(v,proposalFinance(r),customerProposalEditor(r,v)+(r.orderId?'<p class="workflow-order-number">合作订单：'+esc(orderNumber(db,r.orderId))+'</p>':''));
}
function proposalHistory(r){
 if(!r.proposalVersions||r.proposalVersions.length<2)return '';
 const terms=x=>'<p>'+x.items.map(i=>i.quantity+' × '+esc(i.platform)+' '+esc(i.type)).join(' + ')+'</p>'+(x.rights?.trim()?'<p>权益：'+esc(x.rights)+'</p>':'')+(x.cooperationNotes?'<p class="cooperation-notes">合作备注：'+esc(x.cooperationNotes)+'</p>':'');
 return '<details class="creator-section proposal-history" data-drawer-disclosure="proposal-history"><summary>历史方案 · '+(r.proposalVersions.length-1)+' 个版本</summary>'+r.proposalVersions.slice(0,-1).reverse().map(x=>'<article class="review-entry"><strong>V'+x.version+' · '+esc(money(x.total,x.currency))+'</strong>'+terms(x)+'<p>修改说明：'+esc(x.reason)+'</p><small>'+esc(userName(x.by))+' · '+esc(new Date(x.at).toLocaleString('zh-CN'))+'</small></article>').join('')+'</details>';
}

function marginText(m){return Object.entries(m.marginByCurrency||{}).map(([currency,total])=>money(total,currency)).join(' / ')||'待确认';}

function renderCreatorTable(){renderOperatorCreatorList();}
function editCreator(id){
 const c=C(id);if(!c||!canEditCreator(db,user,c))return;dialog={kind:'edit',id};
 panel('编辑达人 · '+c.name,form('creatorEdit',id,input('名称','name',c.name)+input('国家','country',c.country,'text',false)+input('语言','language',c.language,'text',false)+input('联系邮箱','contact',c.contact,'email',false)+platforms.map((p,i)=>{const a=socialAccounts(c).find(a=>a.platform===p)||{};return '<h3 class="full">'+p+'</h3>'+input('Handle','handle'+i,a.handle||'','text',false)+input('主页链接','url'+i,a.url||'','url',false)+input('粉丝量','followers'+i,a.followers??'','number',false);}).join(''),'保存达人资料'));
}

function structuredFollowUps(r){
 const records=(db.followUps||[]).filter(x=>x.objectId===r.id),tasks=(db.tasks||[]).filter(x=>x.objectId===r.id);
 return '<section class="creator-section"><h3>结构化跟进与提醒</h3>'+form('followupRecord',r.id,input('跟进类型','followupType','沟通')+input('沟通渠道','channel','邮件')+input('沟通对象','contact','','text',false)+input('实际沟通时间','communicatedAt','','datetime-local')+'<label class="full">内容<textarea name="body" required></textarea></label>'+input('沟通结果','result','','text',false)+input('附件 / 消息链接','link','','url',false)+input('下次跟进时间','nextAt','','datetime-local',false),'保存跟进（不改变审核状态）')+records.slice().reverse().map(x=>'<article class="review-entry"><strong>'+esc(x.type)+' · '+esc(x.channel)+'</strong><small>'+esc(x.communicatedAt)+' · '+esc(userName(x.by))+'</small><p>'+esc(x.body)+'</p><p>'+esc(x.result)+'</p>'+safeLink(x.link)+'</article>').join('')+'<h3>提醒</h3>'+tasks.map(t=>'<article class="review-entry"><p>'+esc(t.dueAt)+' · '+esc(userName(t.ownerId))+' · '+({open:'待跟进',completed:'已完成',cancelled:'已取消'}[t.status])+(t.status==='open'&&Date.parse(t.dueAt)<Date.now()?' · 已逾期':'')+'</p>'+(t.status==='open'&&(t.ownerId===user.id||user.role==='admin')?'<button data-reminder-action="complete" data-reminder-id="'+esc(t.id)+'">完成</button><button data-reminder-action="cancel" data-reminder-id="'+esc(t.id)+'">取消</button>'+form('reminderReschedule',t.id,input('改期','dueAt',t.dueAt,'datetime-local'),'保存改期'):'')+'</article>').join('')+'</section>';
}

// Only operations that replace the drawer can discard user input.
function losesDrawerInput(b){if(b?.dataset.tab===tab||b?.dataset.creator===dialog?.id&&dialog?.kind==='creator'||b?.dataset.coop===dialog?.id&&dialog?.kind==='coop')return false;return Boolean(b&&(b.hasAttribute('data-close')||b.hasAttribute('data-drawer-back')||b.hasAttribute('data-new-creator')||['creatorsBack','creatorPage','page','creator','coop','submitCreator','editCreator','originalProposal','peer','tab','action','offerOrder','reminderAction'].some(k=>b.dataset[k]!=null)));}
function confirmDiscard(){if(pageDirty&&content.querySelector?.('form[data-kind="submit"]')){showDraftLeaveDialog();return false;}if(!drawerDirty&&!pageDirty)return true;if(!confirm('有未保存内容，确定放弃这些修改吗？'))return false;drawerDirty=false;pageDirty=false;return true;}
root.addEventListener('input',e=>{if(e.target.closest('.detail-drawer'))drawerDirty=true;if(e.target.closest('.creator-submission'))pageDirty=true;e.target.removeAttribute?.('aria-invalid');e.target.setCustomValidity?.('');},true);
root.addEventListener('change',e=>{if(e.target.closest('.detail-drawer'))drawerDirty=true;if(e.target.closest('.creator-submission'))pageDirty=true;},true);
let pendingLeave=null;
function showDraftLeaveDialog(){if(document.getElementById('draft-leave-dialog'))return;const box=document.createElement('dialog');box.id='draft-leave-dialog';box.innerHTML='<p>有未保存的提报内容</p><p role="alert" data-leave-error></p><button data-leave-save>保存并离开</button><button data-leave-discard>放弃并离开</button><button data-leave-stay>继续编辑</button>';document.body.append(box);box.addEventListener('click',e=>{if(!e.target.closest('button'))return;if(e.target.hasAttribute('data-leave-stay')){pendingLeave=null;box.close();box.remove();return;}try{if(e.target.hasAttribute('data-leave-save'))persistSubmissionDraft();else pageDirty=false;const next=pendingLeave;pendingLeave=null;box.close();box.remove();next?.();}catch(error){box.querySelector('[data-leave-error]').textContent=error.message;}});box.addEventListener('cancel',()=>{pendingLeave=null;box.remove();});box.showModal();}
root.addEventListener('click',e=>{const b=detailClickTarget(e.target);if(pageDirty&&b&&(losesDrawerInput(b)||b.hasAttribute('data-cancel-submission')))pendingLeave=()=>b.click();if((drawerDirty&&losesDrawerInput(b)||pageDirty&&b&&!b.hasAttribute('data-close')&&(losesDrawerInput(b)||b.hasAttribute('data-cancel-submission')))&&!confirmDiscard()){e.preventDefault();e.stopImmediatePropagation();}},true);
root.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawerDirty&&!confirmDiscard()){e.preventDefault();e.stopImmediatePropagation();}},true);
root.addEventListener('change',e=>{if(e.target.id==='account'&&pageDirty)pendingLeave=()=>{e.target.value=e.target.dataset.pendingAccount;e.target.dispatchEvent(new Event('change',{bubbles:true}));};if(e.target.id==='account')e.target.dataset.pendingAccount=e.target.value;if(e.target.id==='account'&&!confirmDiscard()){e.target.value=user.id;e.preventDefault();e.stopImmediatePropagation();}},true);
root.addEventListener('submit',e=>{const dirtyForms=[...root.querySelectorAll('.detail-drawer form')].filter(f=>f.dataset.dirty==='true');if(dirtyForms.some(f=>f!==e.target)&&!confirmDiscard()){e.preventDefault();e.stopImmediatePropagation();}},true);
root.addEventListener('input',e=>{const f=e.target.closest('form');if(f)f.dataset.dirty='true';},true);
root.addEventListener('change',e=>{const f=e.target.closest('form');if(f)f.dataset.dirty='true';},true);
if(typeof window!=='undefined')window.addEventListener('beforeunload',e=>{rememberWorkspace();if(drawerDirty||pageDirty){e.preventDefault();e.returnValue='';}});

function deliveryFeedback(r){
 const permissions=allowedActions(db,user,r);
 if(r.status==='待补充发布资料')return permissions.publish? '<p class="feedback-callout">发布资料修改意见：'+esc(r.publishFeedback||'请联系负责 PM 确认修改要求')+'</p>':'';
 if(!r.status.endsWith('待修改')||!(r.status.startsWith('脚本')?(permissions.scriptRevisionDone||permissions.scriptSubmit):permissions.videoSubmit))return '';
 const key=r.status.startsWith('脚本')?'script':'video',v=r.deliverables?.[key]?.at(-1),review=v?.reviews?.filter(e=>e.action.endsWith('Return')).at(-1);
 return review?'<p class="feedback-callout">V'+v.version+' · '+esc(review.source)+'：'+esc(review.reason)+'</p>':'';
}

function preparationPanel(r){
 if(!r.orderId||!r.proposalId)return '';
 const p=(db.orders||[]).find(o=>o.id===r.orderId)?.preparation||{},a=allowedActions(db,user,r);
 const email=a.schedule?form('preparation',r.id,input('达人注册邮箱','registrationEmail',p.registrationEmail,'email'),'保存邮箱'):'<p>达人注册邮箱：'+esc(p.registrationEmail||'未填写')+'</p>';
 const invites=a.preparationPm?form('preparationPm',r.id,input('邀请码（可与链接二选一）','inviteCode',p.inviteCode,'text',false)+input('邀请链接','inviteLink',p.inviteLink,'url',false),'保存邀请信息'):'<p>邀请码：'+esc(p.inviteCode||'未填写')+'</p><p>邀请链接：'+(p.inviteLink?safeLink(p.inviteLink):'未填写')+'</p>';
 return '<div class="delivery-preparation"><p class="scope-note">按项目需要填写，不阻断 Brief、脚本或草稿。运营查看并转发邀请信息。</p>'+email+invites+'</div>';
}

// Shared creator resource list; visibility remains account-scoped in the model.
function operatorAccountCell(creator,platformName,detail=false){
 const accounts=socialAccounts(creator).filter(account=>account.platform===platformName);
 if(!accounts.length)return '<span class="resource-missing">—</span>';
 const entries=accounts.map(account=>{
  const handle=account.handle||'—';
  const identity=account.url?safeLink(account.url,account.handle||'主页 ↗'):esc(handle);
  const followers=account.followers==null||account.followers===''?'—':num(account.followers);
  return '<div class="resource-account"><div class="resource-truncate" title="'+esc(handle)+'">'+(!account.handle&&account.url?'<span>— · </span>':'')+identity+'</div><small title="'+esc(account.followers==null?'—':account.followers)+'">粉丝 '+esc(followers)+'</small>'+(detail?'<small>主页链接：'+(account.url?safeLink(account.url):'待补充')+'</small><small>均播 '+esc(num(account.views))+' · 更新 '+esc(account.updatedAt?new Date(account.updatedAt).toLocaleDateString('zh-CN'):'时间未记录')+'</small>':'')+'</div>';
 }).join('');
 return accounts.length===1?entries:'<details class="resource-accounts"><summary>'+accounts.length+' 个账号 · 展开</summary>'+entries+'</details>';
}
function creatorPeople(c){
 const submitters=[...new Set(db.collaborations.filter(r=>r.creatorId===c.id).map(r=>r.submittedBy||r.ownerId).filter(Boolean))];
 return '<div class="resource-people"><div><span>发起人：</span>'+esc(creatorInitiators(c).map(userName).join('、'))+'</div>'+(submitters.length?'<div><span>提报人：</span>'+esc(submitters.map(userName).join('、'))+'</div>':'')+'</div>';
}
function creatorPlatformIcon(platform){
 const shapes={
  Instagram:'<rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.9" r="1.2" fill="currentColor"/>',
  TikTok:'<path d="M15 3v12.5a4.5 4.5 0 1 1-4-4.47v3.03a1.5 1.5 0 1 0 1 1.44V3h3Zm0 0c.3 3.1 1.9 4.7 5 5v3c-2.1-.15-3.7-.9-5-2.1V3Z" fill="currentColor"/>',
  YouTube:'<rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor"/><path d="m10 9 6 3-6 3Z" fill="white"/>'
 };
 return '<span class="resource-platform-icon" data-platform="'+esc(platform)+'" role="img" aria-label="'+esc(platform)+'" title="'+esc(platform)+'">'+(shapes[platform]?'<svg viewBox="0 0 24 24" aria-hidden="true">'+shapes[platform]+'</svg>':esc((platform||'?').slice(0,1)))+'</span>';
}
function creatorListAccounts(c){
 const accounts=socialAccounts(c).filter(a=>a.handle||a.url);
 if(!accounts.length)return '<span class="resource-missing">—</span>';
 return '<div class="resource-platform-stack">'+accounts.map(a=>'<div class="resource-platform-row">'+creatorPlatformIcon(a.platform)+'<div class="resource-platform-content"><div class="resource-platform-handle">'+(a.url?safeLink(a.url,(a.handle||'主页')+' ↗'):esc(a.handle))+'</div><small>粉丝 '+esc(a.followers==null||a.followers===''?'—':num(a.followers))+' · 均播 '+esc(a.views==null||a.views===''?'—':num(a.views))+'</small></div></div>').join('')+'</div>';
}
function renderOperatorCreatorList(){
 const rows=creatorResults(db,user,q).filter(c=>matchesAccount(c,platform,minimumFollowers)&&(country==='全部'||c.country===country)).sort((a,b)=>a.name.localeCompare(b.name));
 const counts=new Map();for(const r of visibleCoops(db,user))counts.set(r.creatorId,(counts.get(r.creatorId)||0)+1);
 const textCell=value=>'<span class="resource-truncate" title="'+esc(value||'—')+'">'+esc(value||'—')+'</span>';
 const filters=FilterBar('<label>搜索达人<input id="crm-search" value="'+esc(q)+'" placeholder="名称、CreatorID、Handle 或主页"></label>'+filter('平台','platform',['全部',...platforms],platform)+filter('国家','country',['全部',...new Set([...countries,...db.creators.map(c=>c.country).filter(Boolean)])],country)+filter('平台粉丝下限','minimumFollowers',[[0,'不限'],[50000,'50K'],[100000,'100K'],[500000,'500K']],minimumFollowers)+'<button data-clear>清空筛选</button>').replace('筛选合作记录','筛选达人');
 const scope=JSON.stringify([user.id,q,platform,country,minimumFollowers]);
 if(scope!==creatorSelectionScope){selectedCreators.clear();creatorSelectionScope=scope;}
 const selectable=rows.filter(c=>!creatorDeleteReason(db,user,c));
 const valid=new Set(selectable.map(c=>c.id));selectedCreators=new Set([...selectedCreators].filter(id=>valid.has(id)));
 const checkbox=c=>{const reason=creatorDeleteReason(db,user,c);return '<td class="resource-select" title="'+esc(reason||'选择达人')+'"><input type="checkbox" data-select-creator="'+esc(c.id)+'" aria-label="选择 '+esc(c.name)+'" '+(reason?'disabled ':'')+(selectedCreators.has(c.id)?'checked':'')+'></td>';};
 const all='<input type="checkbox" data-select-all-creators aria-label="全选当前结果中可删除的达人" '+(!selectable.length?'disabled ':'')+(selectable.length&&selectedCreators.size===selectable.length?'checked':'')+'>';
 const columns=['select','overview','social','reach','management'];
 const table='<div class="order-scroll"><table class="creator-resource-table creator-sectioned-table" aria-label="达人资源列表"><colgroup>'+columns.map(name=>'<col class="resource-col-'+name+'">').join('')+'</colgroup><thead><tr><th scope="col" class="resource-select">'+all+'</th>'+['达人信息','平台账号','联系方式','人员与操作'].map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+rows.map(c=>'<tr '+detailRowAttributes('creator',c.id,'查看达人基础信息 · '+c.name)+(selectedCreators.has(c.id)?' class="is-selected"':'')+'>'+checkbox(c)+'<td><div class="resource-overview-block"><button class="resource-name resource-truncate" data-creator="'+esc(c.id)+'" title="'+esc(c.name)+'">'+esc(c.name||'—')+'</button><small class="resource-truncate" title="'+esc(c.displayCode||c.id)+'">CreatorID · '+esc(c.displayCode||c.id)+'</small><dl class="resource-basic-facts"><div><dt>国家</dt><dd>'+textCell(c.country)+'</dd></div><div><dt>语言</dt><dd>'+textCell(c.language)+'</dd></div></dl></div></td>'+'<td><div class="resource-social-block">'+creatorListAccounts(c)+'</div></td>'+'<td><div class="resource-contact-block">'+(c.contact?'<button type="button" class="resource-email-copy" data-copy-email="'+esc(c.contact)+'" title="'+esc(c.contact)+' · 点击复制" aria-label="复制邮箱 '+esc(c.contact)+'"><span>'+esc(c.contact)+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4"/></svg></button>':textCell(''))+'</div></td><td><div class="resource-management-block">'+creatorPeople(c)+'<div class="resource-row-actions"><button class="resource-submit" data-submit-creator="'+esc(c.id)+'">提报到项目</button>'+(counts.get(c.id)?'<small class="resource-cooperation-count">关联合作 '+counts.get(c.id)+' 条</small>':'')+'</div></div></td></tr>').join('')+'</tbody></table></div>';
 content.innerHTML='<section class="operator-creator-list">'+filters+'<div class="list-result-actions"><span class="resource-result">'+rows.length+' 位达人</span>'+Button({label:'＋ 新增达人',attribute:'data-new-creator',variant:'primary'})+'</div>'+'<div class="creator-bulk-actions"><span>已选 '+selectedCreators.size+' 位</span><button data-delete-creators '+(!selectedCreators.size?'disabled':'')+'>批量删除</button><button data-clear-creator-selection '+(!selectedCreators.size?'disabled':'')+'>取消选择</button><small>仅可删除自己发起且无提报或合作记录的达人；管理员可删除无关联记录的达人。全选仅限当前筛选结果。</small></div>'+(rows.length?table:empty('暂无符合条件的达人'))+'</section>';
 const allInput=root.querySelector('[data-select-all-creators]');if(allInput)allInput.indeterminate=selectedCreators.size>0&&selectedCreators.size<selectable.length;
}

// View preferences are scoped to the current account and module, separate from business data.
function workspaceState(){return {q,platform,country,status,owner,campaignFilter,campaignId,view,sort,showPrices,projectTab,projectView,metric,month,activeView,moreFilters,settingsOpen,minimumFollowers,stage,queue,scroll:typeof window==='undefined'?0:window.scrollY,scrolls:[...(content.querySelectorAll?.('.order-scroll,.ds-data-scroll,.board-scroll,.calendar-scroll')||[])].map(el=>el.scrollLeft)};}
function rememberWorkspace(){if(page==='creators'&&creatorPageId)return;workspaceViews[user.id+'/'+page]=workspaceState();try{globalThis.sessionStorage?.setItem('solbridge-video-v06-preview-views',JSON.stringify(workspaceViews));globalThis.sessionStorage?.setItem('solbridge-crm-location-v1',JSON.stringify({userId:user.id,page}));}catch{/* Session preferences are optional; business saves still report failures. */}}
function restoreLocation(){
 user=USERS[0];page='followup';
 try{const saved=JSON.parse(globalThis.sessionStorage?.getItem('solbridge-crm-location-v1')||'null');
 if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
 user=VIEW_USERS.find(u=>u.id===saved.userId)||USERS[0];
 if(['creators','followup','delivery','projects'].includes(saved.page))page=saved.page;
 }}catch{/* Invalid or unavailable session storage keeps the default entry. */}
}
function applyWorkspace(s={}){
 if(!s||typeof s!=='object'||Array.isArray(s))s={};
 s=Object.fromEntries(Object.entries(s).filter(([,value])=>['string','number','boolean'].includes(typeof value)));
 for(const key of ['q','platform','country','status','owner','campaignFilter','campaignId','sort','projectTab','projectView','month','activeView','deliveryOrderId','stage','queue'])if(s[key]!=null&&typeof s[key]!=='string')delete s[key];
 reset();q=s.q||'';platform=s.platform||'全部';country=s.country||'全部';status=s.status==='订单已创建'?'已创建订单':s.status||'全部';owner=s.owner||'全部';campaignFilter=s.campaignFilter||'全部';campaignId=s.campaignId||'';view=(page==='delivery'?['list','group','board','calendar']:['list','board','calendar']).includes(s.view)?s.view:'list';sort=s.sort||'pending';showPrices=Boolean(s.showPrices);projectTab=['orders','overview','members',...(user.role==='admin'?['regional']:[])].includes(s.projectTab)?s.projectTab:'orders';projectView=['cards','list','board'].includes(s.projectView)?s.projectView:'cards';metric=s.metric||'all';month=s.month||new Date().toISOString().slice(0,7);activeView=s.activeView||'';moreFilters=Boolean(s.moreFilters);settingsOpen=Boolean(s.settingsOpen);minimumFollowers=Number(s.minimumFollowers)||0;deliveryOrderId='';stage=s.stage||'全部';queue=s.queue||'mine';
 if(campaignFilter!=='全部'&&!projectsFor(db,user).some(p=>p.id===campaignFilter))campaignFilter='全部';
 if(campaignId&&!projectsFor(db,user).some(p=>p.id===campaignId))campaignId='';
 if(page!=='delivery'){status=({'待运营补充':'待 PM 审核','待对客提报':'待 PM 反馈','待客户审核':'议价待客户确认','待客户反馈':'议价待客户确认','待运营还价':'待运营议价','待客户最终确认':'待达人确认'})[status]||status;status=proposalFilter(status);stage=proposalFilter(stage,'stage');}
 if(page==='delivery'){status=status==='全部'?status:deliveryStatus(db,{status});stage=({'脚本制作':'脚本阶段','视频制作':'视频阶段','发布验收':'发布阶段'})[stage]||stage;}
 if(!moduleStatuses().includes(status))status='全部';
 if(page!=='delivery')stage=proposalFilter(stage,'stage');
 if(page==='followup'&&['已完成','已取消'].includes(stage))selectCooperationStage(stage);
 if(['followup','delivery'].includes(page)&&!moduleStages().includes(stage))stage='全部';
 if(user.role==='operator')owner='全部';
}
function restoreWorkspace(){applyWorkspace(workspaceViews[user.id+'/'+page]);}
function restoreScroll(state=workspaceViews[user.id+'/'+page]){const offset=v=>Number.isFinite(v)&&v>=0?v:0;window.scrollTo(0,offset(state?.scroll));content.querySelectorAll('.order-scroll,.ds-data-scroll,.board-scroll,.calendar-scroll').forEach((el,i)=>el.scrollLeft=offset(state?.scrolls?.[i]));}
function switchWorkspace(target){rememberWorkspace();close(true);creatorPageId='';creatorSubmitOpen=false;pageDirty=false;if(typeof window!=='undefined'){window.history?.pushState(null,'','#'+target);acceptedHash='#'+target;}moduleOrigin=null;page=target;const state=workspaceViews[user.id+'/'+page];applyWorkspace(state);render();restoreScroll(state);}
function proposalRows(){return visibleCoops(db,user).filter(r=>!r.proposalId);}
function selectCooperationStage(value){
 stage=value;
 if(page==='followup'&&['已完成','已取消'].includes(stage)){queue='all';status='全部';metric='all';}
}
function moduleStages(){return page==='delivery'?deliveryStages:proposalStages;}
function moduleStatuses(){return page==='delivery'?deliveryStatuses:proposalStatuses;}
function responsibility(r){
 if(r.proposalVersions&&r.orderId)return '<p class="task-owner">提报已完成，后续由各视频的负责运营与 PM 推进。</p>';
 if(stageOf(r)==='已结束')return '<p class="task-owner">本记录已结束，可查看历史记录。</p>';
 const pm=reviewPm(db,r),actors=USERS.filter(u=>u.role!=='admin'&&nextStep(db,u,r).action).map(u=>u.id);
 const owners=[...new Set(actors)];
 return '<p class="task-owner">当前处理人：'+esc(owners.length?owners.map(userName).join('、'):userName(pm))+(r.status.includes('客户反馈')?' · 等待客户反馈后由 PM 登记':'')+'</p>';
}
function drawerFrame(){return {page,creatorPageId,creatorSubmitOpen,state:workspaceState(),dialog:dialog?{...dialog}:null,tab,scroll:root.querySelector('.profile-main')?.scrollTop||0,peers:[...drawerPeers],origin:moduleOrigin,focus:document.activeElement?.getAttribute?.('data-coop')||document.activeElement?.getAttribute?.('data-creator')};}
function listPeers(kind){const key=kind==='creator'?'creator':'coop';return [...new Set([...(content.querySelectorAll?.('[data-detail-row][data-'+key+'],.board-card [data-coop],.calendar-day [data-coop]')||[])].map(el=>el.dataset[key]))].map(id=>({kind,id}));}
function accessibleObject(kind,id){return kind==='creator'?db.creators.some(c=>c.id===id):visibleCoops(page==='delivery'?deliveryContext(db):db,user).some(r=>r.id===id);}
function openObject(kind,id){
 if(kind==='submit'){submission(id);return;}
 if(dialog?.kind===kind&&dialog?.id===id&&root.querySelector('.detail-drawer'))return;if(!['submit','edit'].includes(kind)&&!accessibleObject(kind,id))return;
 if(root.querySelector('.detail-drawer')){drawerStack.push(drawerFrame());drawerPeers=[];}else{drawerStack=[];drawerPeers=listPeers(kind);}
 showObject({kind,id});
}
function showObject(target,t){if(target.kind==='creator')creatorDetail(target.id);else if(target.kind==='submit')submission(target.id);else if(target.kind==='edit')editCreator(target.id);else coopDetail(target.id,t);}
function drawerPeerNavigation(){
 const index=drawerPeers.findIndex(p=>p.id===dialog?.id&&p.kind===dialog?.kind),eligible=drawerPeers.map((p,i)=>({p,i})).filter(({p})=>accessibleObject(p.kind,p.id));
 if(index<0||drawerPeers.length<=1)return '';
 const prev=eligible.filter(x=>x.i<index).at(-1),next=eligible.find(x=>x.i>index);
 const button=(peer,label,path)=>'<button type="button" data-peer="'+(peer?.i??-1)+'" '+(!peer?'disabled':'')+' aria-label="'+label+'" title="'+label+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="'+path+'"/></svg></button>';
 return '<div class="drawer-peer-actions" role="group" aria-label="记录切换">'+button(prev,'上一条','m6 14 6-6 6 6')+button(next,'下一条','m6 10 6 6 6-6')+'</div>';
}
function drawerNavigation(){
 return drawerStack.length?'<div class="drawer-navigation"><button data-drawer-back>← 返回上一步</button></div>':'';
}
function openPeer(index){const target=drawerPeers[index];if(target&&accessibleObject(target.kind,target.id))showObject(target);}
function restoreFrame(frame){
 page=frame.page;creatorPageId=frame.creatorPageId||'';creatorSubmitOpen=Boolean(frame.creatorSubmitOpen);applyWorkspace(frame.state);moduleOrigin=frame.origin;render();restoreScroll(frame.state);drawerPeers=frame.peers;
 if(frame.dialog){showObject(frame.dialog,frame.tab);const body=root.querySelector('.profile-main');if(body)body.scrollTop=frame.scroll;const focus=[...root.querySelectorAll('.detail-drawer [data-coop],.detail-drawer [data-creator]')].find(el=>el.dataset.coop===frame.focus||el.dataset.creator===frame.focus);focus?.focus({preventScroll:true});}
}
function returnToSource(){const frame=drawerStack.pop();if(!frame){close(true);return;}rememberWorkspace();restoreFrame(frame);}
function openRelatedProposal(id){if(page==='delivery')return;if(!visibleCoops(db,user).some(r=>r.id===id))return;drawerStack.push(drawerFrame());rememberWorkspace();page='followup';restoreWorkspace();render();drawerPeers=[];coopDetail(id);}
function focusInvalidField(f,message){
 const candidates=[...f.querySelectorAll('input,select,textarea')].filter(x=>!x.disabled&&x.type!=='hidden');
 const named=/(报价|总价|价格)/.test(message)?['total','initial','clientPrice','final','quote']:message.includes('交付说明')?['description']:message.includes('权益')?['rights']:/(主页|URL|链接)/i.test(message)?['profile','url','url0','url1','url2']:/(数量|交付)/.test(message)?['quantity0','quantity1','quantity2']:message.includes('日期')?['date']:message.includes('邮箱')?['contact']:message.includes('国家')?['country']:message.includes('语言')?['language']:message.includes('达人类型')?['creatorType']:message.includes('审核 PM')?['reviewPmId']:message.includes('平台')?['platform']:message.includes('名称')?['name']:message.includes('Handle')||message.includes('账号')?['handle','handle0','url0','handle1','url1','handle2','url2']:[];
 const field=candidates.find(x=>x.validity&&!x.validity.valid)||candidates.find(x=>named.includes(x.name)&&!x.value)||candidates.find(x=>named.includes(x.name));
 if(field){field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',['submit','reopenSubmission'].includes(f.dataset?.kind)?'submission-message':'dialog-message');field.focus();}
}

function refreshProposalClock(){
 if(page!=='followup'||document.hidden||pageDirty||drawerDirty||root.querySelector('.detail-drawer'))return;
 const focused=document.activeElement;
 if(focused?.matches?.('input,textarea,select,[contenteditable="true"]'))return;
 const identity=content.contains?.(focused)?[...focused.attributes||[]].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]):[];
 render();
 if(identity.length)[...content.querySelectorAll('button,tr[data-detail-row],a')].find(el=>identity.every(([name,value])=>el.getAttribute(name)===value))?.focus({preventScroll:true});
}
if(typeof setInterval==='function')setInterval(refreshProposalClock,60000);
document.addEventListener?.('visibilitychange',refreshProposalClock);

restoreLocation();
document.getElementById('account').innerHTML=options(VIEW_USERS.map(u=>[u.id,u.name]),user.id);const initialView=workspaceViews[user.id+'/'+page];restoreWorkspace();if(typeof window!=='undefined'){acceptedHash=window.location.hash;const route=creatorRoute(acceptedHash);if(route!==null){page='creators';creatorListState=workspaceViews[user.id+'/creators'];applyWorkspace(creatorListState);creatorPageId=route;creatorSubmitOpen=Boolean(route&&acceptedHash.endsWith('/submit'));}window.addEventListener('hashchange',syncCreatorRoute);window.addEventListener('popstate',syncCreatorRoute);}const header=root.querySelector('header');new ResizeObserver(()=>root.style.setProperty('--header-height',header.getBoundingClientRect().height+'px')).observe(header);render();if(!creatorPageId)restoreScroll(initialView);requestAnimationFrame(()=>{if(!creatorPageId)restoreScroll(initialView);rememberWorkspace();});


function submissionRegionFields(p){
 if(user.role==='pm')return '<p>PM 本人提报 · 免提报审核，由本人负责报价、成单及最终视频验收。</p>';
 const ids=projectReviewers(p),preferred=ids.includes(directPm(db,user.id))?directPm(db,user.id):ids.includes(p?.pmId)?p.pmId:ids[0];const select='<label>审核 PM *<select name="reviewPmId" required>'+options(ids.map(id=>[id,userName(id)]),preferred)+'</select></label>';
 if(!p?.regionPm)return select;
 return select+'<label>目标地区 *<select name="targetCountry" required>'+options([['','请选择目标地区'],...Object.entries(p.regionPm).map(([region,pm])=>[region,region+' · '+userName(pm)])],'')+'</select></label><small>按项目和目标地区分配 PM，负责提报、报价、脚本、成片及验收。</small>';
}
function regionalPanel(p){
 const rules=Object.entries(p.regionPm||{}),pms=VIEW_USERS.filter(u=>u.role==='pm');
 return '<section class="box regional-panel"><div class="section-heading"><h3>地区审核分工</h3><button data-handoff-project="'+esc(p.id)+'">交接现有业务</button></div><p class="scope-note">每个地区一位主负责 PM，覆盖提报、报价、脚本、成片和验收。修改分工仅影响新提报；已有业务需单独交接。</p>'+(rules.length?'<div class="order-scroll"><table class="region-table"><thead><tr><th>目标地区</th><th>负责 PM</th><th>未完成合作</th><th>操作</th></tr></thead><tbody>'+rules.map(([region,pm])=>'<tr><td>'+esc(region)+'</td><td>'+esc(userName(pm))+'</td><td>'+db.collaborations.filter(r=>r.campaignId===p.id&&r.targetCountry===region&&stageOf(r)!=='已结束').length+'</td><td><button data-edit-region="'+esc(region)+'" data-region-pm="'+esc(pm)+'">修改负责人</button></td></tr>').join('')+'</tbody></table></div>':'<p class="regional-empty">尚未启用地区分工，现有业务由项目 PM 负责。保存第一条规则后，新提报必须选择已配置地区。</p>')+
 form('regionRule',p.id,'<label>目标地区 *<input name="region" list="region-options" placeholder="例如：美国" maxlength="60" required><datalist id="region-options">'+[...new Set([...countries,...rules.map(([r])=>r)])].map(r=>'<option value="'+esc(r)+'"></option>').join('')+'</datalist></label><label>负责 PM *<select name="pmId">'+options(pms.map(u=>[u.id,u.name]),'pm1')+'</select></label><p class="full scope-note">填写已有地区可修改负责人；不会自动转移现有业务。</p>','保存地区分工')+'</section><section class="box regional-panel"><h3>分工与交接记录</h3>'+((p.assignmentHistory||[]).length?'<div class="assignment-history">'+[...p.assignmentHistory].reverse().map(e=>'<article><strong>'+esc(e.kind==='transfer'?'业务交接 · '+e.ids.length+' 条合作':'地区分工调整')+'</strong><p>'+esc(e.region||'历史未标注地区')+' · '+esc(e.from?userName(e.from):'未配置')+' → '+esc(userName(e.to))+'</p>'+(e.reason?'<p>'+esc(e.reason)+'</p>':'')+'<small>'+esc(userName(e.by))+' · '+esc(new Date(e.at).toLocaleString('zh-CN'))+'</small></article>').join('')+'</div>':'<p class="muted">暂无调整记录</p>')+'</section>';
}
function handoffForm(id){
 if(user.role!=='admin')return;const p=P(id);if(!p)return;
 const regions=[...new Set([...Object.keys(p.regionPm||{}),...db.collaborations.filter(r=>r.campaignId===id).map(r=>r.targetCountry||'')])];
 dialog={kind:'handoff',id};panel('业务交接 · '+p.name,'<p class="scope-note">仅交接未完成合作，关联订单、视频和待办随合作一起转交。已发生的审核不改写。</p>'+form('handoffPreview',id,'<label>目标地区<select name="region">'+options(regions.map(r=>[r,r||'历史未标注地区']),regions[0])+'</select></label><label>原负责 PM<select name="fromPm">'+options(USERS.filter(u=>u.role==='pm'||u.id===p.pmId).map(u=>[u.id,u.name]),p.pmId)+'</select></label><label>接手 PM<select name="toPm">'+options(VIEW_USERS.filter(u=>u.role==='pm').map(u=>[u.id,u.name]),'pm2')+'</select></label><label class="full">交接原因 *<textarea name="reason" required rows="3" placeholder="例如：美国地区负责人调整"></textarea></label>','预览交接范围'));
}
function previewHandoff(id,d){
 const region=String(d.get('region')||''),fromPm=d.get('fromPm'),toPm=d.get('toPm'),reason=String(d.get('reason')||'').trim();
 if(!reason)throw Error('请填写交接原因');if(fromPm===toPm)throw Error('接手 PM 不能与原 PM 相同');
 const rows=regionalCandidates(db,user,id,region,fromPm),ids=rows.map(r=>r.id);
 const hidden=(name,value)=>'<input type="hidden" name="'+name+'" value="'+esc(value)+'">';
 panel('确认交接 · '+P(id).name,'<section class="coop-summary"><h3>'+rows.length+' 条未完成合作</h3><p>'+esc(region||'历史未标注地区')+' · '+esc(userName(fromPm))+' → '+esc(userName(toPm))+'</p><p>原因：'+esc(reason)+'</p></section>'+(rows.length?'<div class="assignment-history">'+rows.map(r=>'<article><strong>'+esc(C(r.creatorId)?.name||r.creatorId)+'</strong><p>'+esc(r.status)+' · '+esc(r.id)+'</p><small>'+((db.deliveryItems||[]).filter(x=>x.proposalId===r.id).length)+' 条关联视频</small></article>').join('')+'</div>'+form('handoffConfirm',id,hidden('region',region)+hidden('fromPm',fromPm)+hidden('toPm',toPm)+hidden('reason',reason)+rows.map(r=>'<label class="full"><input type="checkbox" name="selectedIds" value="'+esc(r.id)+'" checked>'+esc(C(r.creatorId)?.name)+' · '+esc(r.proposalCode||r.id)+'</label>').join(''),'确认交接 '+rows.length+' 条合作'):'<p>没有符合范围的未完成合作。</p>')+'<button data-handoff-project="'+esc(id)+'">返回修改范围</button>');
}

function orderSplitPanel(r){
 if(!r.proposalVersions||r.orderId)return '';const pricing=packagePricing(r),sides=[];
 if(user.role==='admin'||canOwnWork(db,user,r))sides.push(['cost','达人价']);
 if(user.role==='admin'||user.role==='pm'&&reviewPm(db,r)===user.id)sides.push(['clientPrice','客户价']);
 return sides.filter(([side])=>pricing[side]!=null).map(([side,label])=>'<details><summary>编辑单视频'+label+'拆分</summary><p>填写各视频金额，合计 '+esc(money(pricing[side],pricing.currency))+'。</p>'+form('orderSplit',r.id,'<input type="hidden" name="side" value="'+side+'">'+Array.from({length:pricing.quantity},(_,i)=>input('视频 '+(i+1),'splitAmount',r.priceSplits?.[side]?.amounts?.[i]??'','number')).join(''),'保存拆分')+'</details>').join('');
}
function correctionPanel(r){return user.role==='admin'&&r.orderId?'<details><summary>订单金额纠错</summary>'+form('correctOrderPricing',r.id,input('整包达人价','cost',packagePricing(r).cost,'number')+input('整包客户价','clientPrice',packagePricing(r).clientPrice,'number')+input('纠错原因','reason','','text'),'保存纠错')+'</details>':'';}
function operatorHandoffPanel(r){return user.role==='admin'&&r.status!=='已完成'?'<details><summary>交接此条视频</summary>'+form('operatorHandoff',r.id,'<label>接手运营<select name="toOwner">'+options(USERS.filter(u=>u.role==='operator'&&P(r.campaignId)?.members.includes(u.id)).map(u=>[u.id,u.name]),'')+'</select></label>'+input('交接原因','reason'),'确认交接')+'</details>':'';}

function currentProfileFacts(c){return '<dl class="creator-facts">'+[['name','达人名称'],['contact','联系邮箱'],['country','国家'],['language','语言'],['creatorType','达人类型']].map(([key,label])=>'<div><dt>'+label+'</dt><dd>'+esc(c[key]||'待补充')+'</dd></div>').join('')+'</dl>';}
function snapshotPanel(r){return '<details><summary>提交时达人资料快照</summary>'+(r.submissionSnapshot?currentProfileFacts(r.submissionSnapshot):'<p>历史快照缺失，未使用当前资料补造。</p>')+'</details>';}

function reviewHistoryPanel(r){const reviews=r.reviewHistory||(r.events||[]).filter(e=>['approve','reject'].includes(e.action)).map(e=>({...e,decision:e.action==='approve'?'approved':'rejected'}));return reviews.length?'<details><summary>审核历史</summary>'+reviews.map(e=>'<article><strong>'+(e.decision==='approved'?'通过':'未通过')+'</strong><p>'+esc(e.reason||'')+'</p><small>'+esc(userName(e.by))+' · '+esc(e.at)+'</small></article>').join('')+'</details>':'';}

function handoffResultsPanel(){const rows=pmHandoffResults(db,user);return rows.length?'<details class="creator-section"><summary>我的审核业务交接结果</summary>'+rows.map(h=>'<p>'+esc(P(h.projectId)?.name)+' · '+esc(userName(h.from))+' → '+esc(userName(h.to))+' · '+esc(h.at)+' · '+esc(h.reason)+' · '+h.ids.length+' 条</p>').join('')+'</details>':'';}

function draftForCreator(id,projectId=''){const drafts=(db.proposalDrafts||[]).filter(d=>d.ownerId===user.id&&d.creatorId===id&&(!projectId||d.campaignId===projectId)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));return (!projectId&&drafts.find(d=>d.id===activeDraftId))||drafts[0];}
