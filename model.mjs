const legacyStatuses=['待 PM 审核','待对客提报','已提报待客户反馈','待运营议价','待 PM 反馈','已反馈待客户确认','确认合作待补充信息','待发布','已发布待验收','已验收','不提报','不合作'];
const countries=['美国','英国','加拿大','澳大利亚','德国'];const platforms=['TikTok','YouTube','Instagram'];const names=['Mia','Alex','Luna','Nora','Oliver','Emma','Leo','Chloe','Noah','Sofia','Ethan','Ava','Liam','Isla','Mason','Ella','Lucas','Grace','Theo','Ruby'];const types=['Travels','Studio','Daily','Kitchen','Fitness'];
function seed(){return Array.from({length:100},(_,i)=>{const initial=3000+(i*700)%22000,status=i===0?'待运营议价':i===1?'确认合作待补充信息':i===2?'已提报待客户反馈':legacyStatuses[i%legacyStatuses.length];return {id:'creator-'+i,name:i<3?['Mia Travels','Alex Studio','Luna Daily'][i]:names[i%20]+' '+types[Math.floor(i/20)],handle:i<3?['@mia.travels','@alex.studio','@luna.daily'][i]:'@'+names[i%20].toLowerCase()+'.'+types[Math.floor(i/20)].toLowerCase()+'.'+(i+1),platform:platforms[i%3],country:countries[i%5],language:i%5===4?'德语':'英语',followers:25000+i*5300,views:15000+i*1900,er:(2+(i%40)/10).toFixed(1),initial:i===0?12000:i===1?10000:i===2?6500:initial,status,rights:'视频 1 条，品牌使用权 30 天',date:'2026-10-'+String(1+i%28).padStart(2,'0'),final:['待发布','已发布待验收','已验收'].includes(status)?initial-500:null,history:['待 PM 反馈','已反馈待客户确认','确认合作待补充信息','待发布','已发布待验收','已验收'].includes(status)?[{quote:i===1?9000:initial-500,rights:'视频 1 条，品牌使用权 30 天'}]:[],url:['已发布待验收','已验收'].includes(status)?'https://example.com/video/'+(i+1):'',distribution:''};});}

export const USERS=[{id:'pm1',name:'PM · AJ',role:'pm'},{id:'pm2',name:'PM · seven',role:'pm'},{id:'a',name:'运营 · Tia',role:'operator'},{id:'b',name:'运营 · Jennie',role:'operator'},{id:'c',name:'运营 C · 小周',role:'operator',selectable:false}];
USERS.push({id:'admin',name:'超级管理员',role:'admin'});
// Keep historical identities for attribution, but expose only active simulation views.
export const VIEW_USERS=[USERS.find(u=>u.id==='admin'),...USERS.filter(u=>u.role!=='admin'&&u.selectable!==false)];
export const KEY='solbridge-video-v06-preview-only';
export {countries,platforms};
export function migrate(old=seed()){
 const campaigns=[{id:'p1',name:'Tripo',client:'Tripo',requirements:'生活方式与旅行类达人',pmId:'pm1',members:['a','b']},{id:'p2',name:'Flora',client:'Flora',requirements:'科技类达人',pmId:'pm1',members:['b','c']},{id:'p3',name:'Orbit 品牌推广',client:'Orbit',requirements:'英语地区达人',pmId:'pm2',members:['a','c']}];
 const pool=Array.isArray(old)&&old.length?old:seed();
 const creators=pool.map((r,i)=>({...r,id:r.id||'creator-'+i,createdBy:['a','b','c','pm1','pm2'][i%5]}));
 const collaborations=creators.map((r,i)=>{const p=campaigns[i%3];return {...r,id:'coop-'+i,creatorId:r.id,campaignId:p.id,ownerId:p.members[i%p.members.length],submittedAt:'2026-09-23T09:00:00.000Z',events:[]};});
 // Keep business history in collaboration records, not the shared creator profile.
 creators.forEach(r=>{for(const k of ['initial','status','rights','date','final','history','url','distribution'])delete r[k];});
 return {version:2,creators,campaigns,collaborations};
}
// Region routing is enabled per project when an administrator saves its first rule.
export const reviewPm=(db,r)=>r.reviewPmId||db.campaigns.find(p=>p.id===r.campaignId)?.pmId;
export function setRegionPm(db,u,projectId,region,pmId){
 if(u.role!=='admin')throw Error('仅超级管理员可以配置地区 PM');
 const p=db.campaigns.find(x=>x.id===projectId);region=String(region||'').trim();
 if(!p)throw Error('项目不存在');
 if(!region||region.length>60)throw Error('请填写目标地区');
 if(!USERS.some(x=>x.id===pmId&&x.role==='pm'&&x.selectable!==false))throw Error('请选择有效 PM');
 const at=new Date().toISOString(),old=p.regionPm?.[region]||null;
 if(old===pmId)return;
 // Freeze existing assignments before enabling new routing; never infer target market from creator country.
 for(const r of [...db.collaborations,...(db.orders||[]),...(db.deliveryItems||[])].filter(x=>x.campaignId===projectId))if(!r.reviewPmId)r.reviewPmId=p.pmId;
 p.regionPm={...(p.regionPm||{}),[region]:pmId};
 (p.assignmentHistory??=[]).push({kind:'rule',region,from:old,to:pmId,by:u.id,at});
}
export function regionalCandidates(db,u,projectId,region,fromPm){
 if(u.role!=='admin')throw Error('仅超级管理员可以交接业务');
 return db.collaborations.filter(r=>r.campaignId===projectId&&(r.targetCountry||'')===region).filter(r=>{
  const items=(db.deliveryItems||[]).filter(x=>x.proposalId===r.id);
  return items.length?items.some(x=>stageOf(x)!=='已结束'&&reviewPm(db,x)===fromPm):!r.orderId&&(stageOf(r)!=='已结束'||r.status==='不予提报'&&!r.rejectionAcknowledgedAt)&&reviewPm(db,r)===fromPm;
 });
}
export function transferRegionalWork(db,u,{projectId,region,fromPm,toPm,reason,ids}){
 if(u.role!=='admin')throw Error('仅超级管理员可以交接业务');
 if(!USERS.some(x=>x.id===toPm&&x.role==='pm'&&x.selectable!==false)||toPm===fromPm)throw Error('请选择不同的有效接手 PM');
 if(!String(reason||'').trim())throw Error('请填写交接原因');
 const p=db.campaigns.find(x=>x.id===projectId);if(!p)throw Error('项目不存在');
 const rows=regionalCandidates(db,u,projectId,region,fromPm);
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!rows.some(r=>r.id===id)))throw Error('待交接记录已变化，请重新预览');
 const at=new Date().toISOString();
 for(const r of rows.filter(r=>ids.includes(r.id))){
  const related=[...(r.orderId?[]:[r]),...(db.orders||[]).filter(x=>x.proposalId===r.id&&reviewPm(db,x)===fromPm),...(db.deliveryItems||[]).filter(x=>x.proposalId===r.id&&stageOf(x)!=='已结束'&&reviewPm(db,x)===fromPm)];
  for(const task of (db.tasks||[]).filter(t=>related.some(x=>x.id===t.objectId)&&t.ownerId===fromPm&&t.status==='open')){task.ownerId=toPm;(task.history??=[]).push({action:'transfer',from:fromPm,to:toPm,by:u.id,at});}
  for(const record of related){record.reviewPmId=toPm;(record.assignmentHistory??=[]).push({from:fromPm,to:toPm,by:u.id,at,reason:String(reason).trim()});}
 }
 (p.assignmentHistory??=[]).push({kind:'transfer',region,from:fromPm,to:toPm,by:u.id,at,reason:String(reason).trim(),ids:[...ids]});
 return ids.length;
}
export const canProject=(p,u)=>u.role==='admin'||p.pmId===u.id||Object.values(p.regionPm||{}).includes(u.id)||p.members.includes(u.id);
export const projectsFor=(db,u)=>db.campaigns.filter(p=>canProject(p,u)||u.role==='pm'&&db.collaborations.some(r=>r.campaignId===p.id&&(reviewPm(db,r)===u.id||directPm(db,r.ownerId)===u.id)));
export const visibleCoops=(db,u)=>db.collaborations.filter(c=>{const p=db.campaigns.find(p=>p.id===c.campaignId);return p&&(u.role==='admin'||u.role==='pm'&&(reviewPm(db,c)===u.id||directPm(db,c.ownerId)===u.id||c.proposalId&&db.previewTeamPm?.[c.ownerId]===u.id)||canProject(p,u)&&c.ownerId===u.id||u.role==='operator'&&(!!c.proposalId||!c.proposalVersions&&isConfirmed(c))&&formerOwner(c,u.id));});
export const creatorResults=(db,u,q='')=>db.creators.filter(c=>q.trim()?(c.id+' '+(c.displayCode||'')+' '+c.name+' '+socialAccounts(c).map(a=>a.handle+' '+a.url).join(' ')).toLowerCase().includes(q.trim().toLowerCase()):u.role==='admin'||creatorInitiators(c).includes(u.id));
export function addProject(db,u,input){if(!['pm','admin'].includes(u.role))throw Error('只有 PM 可以新建项目');const p={id:crypto.randomUUID(),name:input.name.trim(),client:input.client.trim(),requirements:input.requirements.trim(),pmId:u.id,members:[...new Set(input.members)].filter(id=>USERS.some(u=>u.id===id&&u.role==='operator'))};if(!p.name||!p.client)throw Error('请填写项目名称和客户');db.campaigns.push(p);return p;}
// Existing assignments are the evidence; never guess from profile authors or creation dates.
export function repeatPermission(db,u,creatorId,campaignId){
 const rows=db.collaborations.filter(r=>r.creatorId===creatorId&&r.campaignId===campaignId);
 const orders=(db.orders||[]).filter(r=>r.creatorId===creatorId&&r.campaignId===campaignId);
 const contracted=rows.filter(r=>r.orderId||isConfirmed(r));
 if(!orders.length&&!contracted.length){
  // Q02: preserve the existing in-flight duplicate guard pending business confirmation.
  return rows.length?{allowed:false,message:'该达人已在此项目有在途提报'}:{allowed:true};
 }
 const items=(db.deliveryItems||[]).filter(r=>r.creatorId===creatorId&&r.campaignId===campaignId);
 if(contracted.some(r=>r.orderId&&!orders.some(o=>o.id===r.orderId)))return {allowed:false,message:'该达人已在该项目有合作；订单归属证据缺失，请先明确负责人'};
 const owners=new Set([...orders.map(o=>{const videos=items.filter(v=>v.orderId===o.id);return videos.length?videos.map(v=>v.ownerId):[o.ownerId];}).flat(),...contracted.filter(r=>!orders.some(o=>o.proposalId===r.id)).map(r=>r.ownerId)]);
 if(owners.size!==1||owners.has(undefined))return {allowed:false,message:'该达人已在该项目有合作；当前归属存在歧义，请先明确负责人'};
 return owners.has(u.id)?{allowed:true}:{allowed:false,message:'该达人已在该项目有合作'};
}
export function projectReviewers(p){return [...new Set(p?.pmIds||[p?.pmId,...Object.values(p?.regionPm||{})])].filter(id=>USERS.some(u=>u.id===id&&u.role==='pm'&&u.selectable!==false));}
export function validateSubmissionProfile(c){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c?.contact||'').trim()))throw Error('请填写有效联系邮箱');
 for(const [key,label] of [['country','国家'],['language','语言'],['creatorType','达人类型']])if(!String(c?.[key]||'').trim())throw Error('请填写'+label);
 const accounts=socialAccounts(c);if(!accounts.length)throw Error('请先添加达人平台账号');
 for(const account of accounts){
  const identity=[account.platform,account.handle].filter(Boolean).join(' ');
  for(const [key,label] of [['followers','粉丝量'],['views','均播']]){
   const value=account[key];
   if(value==null||typeof value==='string'&&!value.trim())throw Error('请填写 '+identity+' 的'+label);
   if(!Number.isFinite(value)||value<0)throw Error(identity+' 的'+label+'必须为非负数');
  }
 }
}
export const isSelfManagedPm=(db,u,r)=>Boolean(r&&u.role==='pm'&&r.selfManagedPmId===u.id&&r.ownerId===u.id&&reviewPm(db,r)===u.id);
export const canOwnWork=(db,u,r)=>Boolean(r&&(u.role==='operator'&&r.ownerId===u.id||isSelfManagedPm(db,u,r)));
export function submitCreator(db,u,creatorId,input){
 const p=db.campaigns.find(p=>p.id===input.campaignId),profile=db.creators.find(c=>c.id===creatorId);
 if(!['operator','admin','pm'].includes(u.role)||!p||!canProject(p,u))throw Error('请由已加入项目的负责运营提报');
 if(!profile)throw Error('达人不存在');validateSubmissionProfile(profile);
 const permission=repeatPermission(db,u,creatorId,p.id);if(!permission.allowed)throw Error(permission.message);
 if(!Number.isFinite(input.initial)||!(input.initial>0))throw Error('请填写有效报价');
 const targetCountry=String(input.targetCountry||'').trim(),reviewPmId=u.role==='pm'?u.id:input.reviewPmId||(p.regionPm?p.regionPm[targetCountry]:p.pmId);
 if(u.role!=='pm'&&p.regionPm&&(!targetCountry||!p.regionPm[targetCountry]))throw Error('此目标地区尚未配置 PM，请联系超级管理员');
 if(u.role!=='pm'&&!projectReviewers(p).includes(reviewPmId))throw Error('请选择项目名单内的审核 PM');
 const at=new Date().toISOString(),c={id:crypto.randomUUID(),creatorId,campaignId:p.id,targetCountry,reviewPmId,ownerId:u.id,submittedBy:u.id,initial:input.initial,rights:String(input.rights||'').trim(),reason:input.reason,status:'待 PM 审核',submittedAt:at,submissionSnapshot:structuredClone(profile),history:[],final:null,date:'',url:'',distribution:'',events:[],flowVersion:3,updatedAt:at};
 if(u.role==='pm'){c.selfManagedPmId=u.id;c.status='待 PM 反馈';c.events.push({action:'pmSelfSubmit',by:u.id,at,status:c.status});}
 const codeState={collaborations:[...db.collaborations,c],issuedProposalCodes:db.issuedProposalCodes};ensureProposalCodes(codeState);db.issuedProposalCodes=codeState.issuedProposalCodes;db.collaborations.push(c);return c;
}
export function saveProposalDraft(db,u,creatorId,campaignId,fields){
 if(!['operator','pm'].includes(u.role)||!db.creators.some(c=>c.id===creatorId)||!projectsFor(db,u).some(p=>p.id===campaignId))throw Error('无法保存此项目草稿');
 const drafts=db.proposalDrafts??=[],existing=drafts.find(d=>d.ownerId===u.id&&d.creatorId===creatorId&&d.campaignId===campaignId);
 const draft=existing||{id:crypto.randomUUID(),ownerId:u.id,creatorId,campaignId};
 Object.assign(draft,{fields:structuredClone(fields),updatedAt:new Date().toISOString()});if(!existing)drafts.push(draft);return draft;
}
export function submitPackage(db,u,creatorId,input){
 const terms=packageTerms(input),draft=structuredClone(db),r=submitCreator(draft,u,creatorId,{...input,initial:terms.total});
 enablePackage(draft,u,r.id,terms);
 if(isSelfManagedPm(draft,u,r))submitNegotiationQuote(draft,u,r.id,input.clientQuote,input.quoteNote);
 draft.proposalDrafts=(draft.proposalDrafts||[]).filter(d=>!(d.ownerId===u.id&&d.creatorId===creatorId&&d.campaignId===input.campaignId));
 Object.assign(db,draft);return r;
}
export const directPm=(db,ownerId)=>db.users?.find(u=>u.id===ownerId)?.directPmId||USERS.find(u=>u.id===ownerId)?.directPmId;
export const formerOwner=(r,id)=>(r.ownerHistory||[]).some(h=>h.from===id);

const cents=value=>{if(!Number.isFinite(value)||value<0)return null;const result=Math.round((value+Number.EPSILON)*100);return Number.isSafeInteger(result)?result:null;};
const moneyAmount=value=>{const amount=cents(value);return amount===null?null:amount/100;};
export function margin(r){if(r.effectivePricing)return r.effectivePricing.margin;const price=cents(r.clientPrice),cost=cents(r.final);return price!==null&&cost!==null?(price-cost)/100:null;}
// Proposals carry package totals; delivery records carry the allocated video amounts.
export function packagePricing(r){
 if(r.effectivePricing)return structuredClone(r.effectivePricing);
 const v=r.proposalVersions?.at(-1),currency=v?.currency||r.currency||'CNY';
 const cost=moneyAmount(v?(isConfirmed(r)&&r.creatorVersionId===v.id?r.final:currentCreatorCost(r)):Number.isFinite(r.final)?r.final:r.initial);
 const quantity=v?v.items.reduce((n,item)=>n+item.quantity,0):1;
 const acceptance=v?customerAcceptanceFor(r):null;
 const acceptedPrice=v?(acceptance&&(!acceptance.currency||acceptance.currency===currency)?acceptance.clientPrice:null):r.clientPrice;
 const latest=clientQuoteHistory(r).at(-1);
 const clientPrice=moneyAmount(acceptedPrice)??(Number.isFinite(r.clientQuote)&&r.clientQuote>0&&!r.clientQuoteNeedsReview&&latest?.currency===currency?moneyAmount(latest.amount):null);
 return {cost,clientPrice,margin:cost!==null&&clientPrice!==null?(cents(clientPrice)-cents(cost))/100:null,currency,quantity};
}
export function setMembers(db,u,id,members){const p=db.campaigns.find(p=>p.id===id);if(!p||!(u.role==='admin'||p.pmId===u.id))throw Error('无权管理成员');if(members.some(id=>!USERS.some(u=>u.id===id&&u.role==='operator')))throw Error('请选择有效运营');if(db.collaborations.some(c=>c.campaignId===id&&p.members.includes(c.ownerId)&&!members.includes(c.ownerId)))throw Error('该运营仍有合作订单，交接规则待确认，暂不可移除');p.members=[...new Set(members)];}

export const proposalStages=['全部','提报审核','谈价中','合作确认','已完成','已取消'];
export const proposalStatuses=['待 PM 审核','待正式对客报价','待运营处理','待运营议价','待 PM 反馈','待客户报价','议价待客户确认','待达人确认','待客户确认','价格已确认（待创建订单）','订单已创建','合作已确认（历史记录）','不予提报','客户不合作','达人不合作','其他原因取消'];
// Public cooperation progress is separate from a video's production/acceptance state.
export function proposalStatus(r){
 if(r.orderId)return '订单已创建';
 if(r.selfManagedPmId&&r.status==='待 PM 反馈'&&!clientQuoteHistory(r).length)return '待正式对客报价';
 if(r.status==='不予提报'&&!r.rejectionAcknowledgedAt)return '待运营处理';
 if(!r.proposalId&&!r.proposalVersions&&isConfirmed(r)&&!['不予提报','客户不合作','达人不合作','合作取消'].includes(r.status))return r.orderId?'订单已创建':'合作已确认（历史记录）';
 if(r.status==='议价待客户确认'&&clientQuoteHistory(r).length===1)return '待客户报价';
 return ({'合作确认完成':'价格已确认（待创建订单）','已创建订单':'订单已创建','合作取消':'其他原因取消'})[r.status]||r.status;
}
export function proposalStageOf(r){
 if(r.orderId)return '已完成';
 if(r.status==='不予提报'&&!r.rejectionAcknowledgedAt)return '提报审核';
 if(['不予提报','客户不合作','达人不合作','合作取消'].includes(r.status))return '已取消';
 if(r.orderId||['合作确认完成','已创建订单'].includes(r.status)||!r.proposalId&&!r.proposalVersions&&isConfirmed(r))return '已完成';
 if(['待达人确认','待客户确认'].includes(r.status))return '合作确认';
 return ({'待议价':'谈价中','合作确认完成':'已完成','已结束':isConfirmed(r)?'已完成':'已取消'})[stageOf(r)]||stageOf(r);
}
export function proposalFilter(value,kind='status'){
 return kind==='stage'?({'待议价':'谈价中','客户筛选':'谈价中','客户最终确认':'合作确认','合作确认完成':'已完成','已结束':'已取消','不提报':'已取消'})[value]||value:proposalStatus({status:proposalProgress(value)});
}
export const stages=['全部','提报审核','待议价','合作确认','脚本制作','视频制作','发布验收','合作确认完成','已结束'];
const stageStates={
 '提报审核':['待 PM 审核'],
 '待议价':['待运营议价','待 PM 反馈','议价待客户确认'],
 '合作确认':['待达人确认','待客户确认'],
 '脚本制作':['脚本待提交','脚本待 PM 初审','脚本待送客户','脚本待客户反馈','脚本待修改'],
 '视频制作':['视频待提交','视频待 PM 初审','视频待送客户','视频待客户反馈','视频待修改'],
 '发布验收':['待发布','待验收','待补充发布资料'],
 '合作确认完成':['合作确认完成','已创建订单'],
 '已结束':['已完成','不予提报','客户不合作','达人不合作','合作取消']
};
export const statuses=Object.values(stageStates).flat();
export const stageOf=r=>r.status==='待填写客户 Brief'?'脚本制作':Object.keys(stageStates).find(s=>stageStates[s].includes(r.status))||'已结束';
const proposalProgress=status=>({'待运营补充':'待 PM 审核','待对客提报':'待 PM 反馈','已提报待客户反馈':'议价待客户确认','待客户审核':'议价待客户确认','待客户反馈':'议价待客户确认','已反馈待客户确认':'议价待客户确认','待运营还价':'待运营议价','确认合作待补充信息':'待达人确认','待客户最终确认':'待达人确认','订单已创建':'已创建订单','不提报':'不予提报','不合作':'客户不合作'})[status]||status;
const isProposalRecord=r=>!r.proposalId&&(Boolean(r.proposalVersions)||!isConfirmed(r));
// Read status-entry evidence, never a generic edit or note timestamp.
export function proposalStayHours(r,now=Date.now()){
 if(!r||r.proposalId||r.orderId||!Number.isFinite(now))return null;
 const current=proposalProgress(r.status),active=['待 PM 审核','待运营议价','待 PM 反馈','议价待客户确认','待达人确认','待客户确认'];
 if(!active.includes(current))return null;
 const unchanged=new Set(['note','schedule','price','editCustomerProposal','correctVideoQuantity','acknowledgeRejection','followUp','followup','clientQuoteNote']);
 const targets={submit:'待 PM 审核',resubmit:'待 PM 审核',reopenSubmission:'待 PM 审核',packageRevision:'待 PM 审核',approve:'待 PM 反馈',quote:'待 PM 反馈',propose:'待 PM 反馈',creatorQuoteReply:'待 PM 反馈',customerOffer:'待运营议价',negotiate:'待运营议价',feedback:'议价待客户确认',sent:'议价待客户确认',agree:'待达人确认',customerAccept:'待达人确认',confirmCreator:'待客户确认',confirm:'合作确认完成',reject:'不予提报',decline:'客户不合作',creatorDecline:'达人不合作'};
 const events=(r.events||[]).filter(e=>!unchanged.has(e.action)&&(e.status||targets[e.action])).map(e=>({...e,status:proposalProgress(e.status||targets[e.action]),time:Date.parse(e.at)}));
 if(r.resubmittedAt&&!events.some(e=>['resubmit','reopenSubmission'].includes(e.action)))events.push({action:'reopenSubmission',status:'待 PM 审核',time:Date.parse(r.resubmittedAt)});
 // The append order remains the only available ordering for an invalid timestamp.
 if(events.every(e=>Number.isFinite(e.time)))events.sort((a,b)=>a.time-b.time);
 let progress=r.legacyStatus&&r.legacyStatus!=='待 PM 审核'?null:'待 PM 审核',entered=progress?Date.parse(r.submittedAt):NaN,lastTransition=-Infinity;
 for(const e of events){
  if(e.status!==progress||['resubmit','reopenSubmission'].includes(e.action)){
   progress=e.status;entered=e.time;if(Number.isFinite(e.time))lastTransition=e.time;
  }else if(!Number.isFinite(entered)&&['submit','packageRevision'].includes(e.action))entered=e.time;
 }
 if(progress!==current||!Number.isFinite(entered)){
  const fallback={'待 PM 审核':[r.resubmittedAt],'待 PM 反馈':[r.submissionApprovedAt,...(r.creatorQuoteReplies||[]).map(x=>x.at),...(r.history||[]).map(x=>x.at)],'待运营议价':(r.customerOffers||[]).map(x=>x.at),'议价待客户确认':(r.clientQuotes||[]).map(x=>x.at),'待达人确认':[r.customerAcceptedAt,r.customerAcceptance?.at],'待客户确认':[r.creatorConfirmedAt]}[current]||[];
  const times=fallback.map(x=>Date.parse(x)).filter(time=>Number.isFinite(time)&&time>=lastTransition);
  if(!times.length)return null;entered=Math.max(...times);
 }
 return Math.max(0,(now-entered)/3600000);
}
export const isProposalOverdue=(r,now=Date.now())=>{const hours=proposalStayHours(r,now);return hours!==null&&hours>12;};
// Public delivery progress groups preserve the detailed review audit states.
export const deliveryStages=['全部','Brief','脚本阶段','视频阶段','发布阶段','已完成'];
export const deliveryStatuses=['待填写客户 Brief','待提交脚本','待 PM 同步客户（脚本）','等待客户反馈（脚本）','脚本待运营处理','待提交草稿','待 PM 同步客户（草稿）','等待客户反馈（草稿）','草稿待运营处理','待发布','待 PM 验收','待运营处理（验收）','已完成'];
export function deliveryStatus(db,r){
 return ({'待填写客户 Brief':'待填写客户 Brief','脚本待提交':'待提交脚本','脚本待 PM 初审':'待 PM 同步客户（脚本）','脚本待送客户':'待 PM 同步客户（脚本）','脚本待客户反馈':'等待客户反馈（脚本）','脚本待修改':'脚本待运营处理','视频待提交':'待提交草稿','视频待 PM 初审':'待 PM 同步客户（草稿）','视频待送客户':'待 PM 同步客户（草稿）','视频待客户反馈':'等待客户反馈（草稿）','视频待修改':'草稿待运营处理','待补充发布资料':'待运营处理（验收）','待验收':'待 PM 验收'})[r.status]||r.status;
}
export function deliveryStage(db,r){
 const s=r.status;
 return s==='待填写客户 Brief'?'Brief':s.startsWith('脚本')?'脚本阶段':s.startsWith('视频')?'视频阶段':['待发布','待验收','待补充发布资料'].includes(s)?'发布阶段':s==='已完成'?'已完成':'已结束';
}
// Count time in the current public progress, not time since the last edit.
export function deliveryStayHours(db,r,now=Date.now()){
 const order=(db.orders||[]).find(o=>o.id===r.orderId);
 const events=[...(r.events||[])].filter(e=>Number.isFinite(Date.parse(e.at))).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 let entered=Date.parse(order?.createdAt||r.confirmedAt||r.submittedAt||'');
 let progress=r.status==='待填写客户 Brief'||events.some(e=>e.action==='briefSent')?'待填写客户 Brief':'待提交脚本';
 for(const e of events){
  // Notes, reminders, drafts and scheduling never change progress.
  if(['note','schedule','scriptDraft','videoDraft'].includes(e.action))continue;
  const next=e.status?deliveryStatus(db,{status:e.status}):progress;
  if(next!==progress){progress=next;entered=Date.parse(e.at);}
 }
 if(progress!==deliveryStatus(db,r)||!Number.isFinite(entered)||!Number.isFinite(now))return null;
 return Math.max(0,(now-entered)/3600000);
}
const validClientQuote=r=>Boolean(Number(r.clientQuote)>0&&!r.clientQuoteNeedsReview&&clientQuoteHistory(r).at(-1)?.currency===(r.currency||'CNY'));
// A prior PM acceptance must identify the same Package version. Old histories are
// evidence only when they contain an actual acceptance action; a status is not approval.
export function customerAcceptanceFor(r){
 const v=r.proposalVersions?.at(-1);if(!v)return null;
 const saved=r.customerAcceptance;
 if(saved?.versionId===v.id&&saved.by&&Number.isFinite(Date.parse(saved.at)))return saved;
 if(r.preliminaryVersionId!==v.id)return null;
 const e=(r.events||[]).filter(e=>['agree','customerAccept'].includes(e.action)&&e.by&&Number.isFinite(Date.parse(e.at))&&(!v.at||Date.parse(e.at)>=Date.parse(v.at))).at(-1);
 return e?{versionId:v.id,by:r.customerAcceptedBy||e.by,at:r.customerAcceptedAt||e.at,clientPrice:r.clientPrice,note:r.customerAcceptanceNote||e.reason||''}:null;
}
function clearPackageAcceptance(r){for(const key of ['clientQuoteDraft','creatorVersionId','clientVersionId','preliminaryVersionId','confirmedAt','creatorConfirmedAt','creatorAcceptance','customerAcceptedAt','customerAcceptedBy','customerAcceptanceNote','customerAcceptance'])delete r[key];r.final=null;}
function ensureRecordCodes(records,key){
 const valid=c=>/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{10}$/.test(c||'');
 const orders=records,used=new Set(orders.map(o=>o[key]).filter(valid)),seen=new Set();let changed=false;
 const limit=36n**8n;
 for(const order of orders){
  if(valid(order[key])&&!seen.has(order[key])){seen.add(order[key]);continue;}
  let hash=0n;for(const char of order.id)hash=(hash*131n+BigInt(char.charCodeAt(0)))%limit;
  const encode=value=>String.fromCharCode(65+Number(value%26n))+String(value%10n)+value.toString(36).toUpperCase().padStart(8,'0');
  let code=encode(hash);
  while(used.has(code)){hash=(hash+1n)%limit;code=encode(hash);}
  order[key]=code;used.add(code);seen.add(code);changed=true;
 }
 return changed;
}
export const ensureOrderCodes=db=>ensureRecordCodes(db.orders||[],'orderCode');
export const ensureDeliveryCodes=db=>ensureRecordCodes([...(db.deliveryItems||[]),...(db.collaborations||[]).filter(r=>!r.proposalVersions&&isConfirmed(r))],'deliveryCode');
export const deliveryNumber=r=>r.deliveryCode||r.id;
export const orderNumber=(db,id)=>(db.orders||[]).find(o=>o.id===id)?.orderCode||id;

export function upgrade(db){
 let changed=ensureCreatorCodes(db);
 if(ensureProposalCodes(db))changed=true;
 if(ensureOrderCodes(db))changed=true;
 // Rename only the original sample projects; retain IDs, membership and linked records.
 for(const [id,oldName,oldClient,name] of [['p1','Aurora 新品推广','Aurora','Tripo'],['p2','Nova 秋季推广','Nova','Flora']]){
  const project=db.campaigns.find(p=>p.id===id);
  if(!project)continue;
  if(project.name===oldName){project.name=name;changed=true;}
  if(project.client===oldClient){project.client=name;changed=true;}
 }
 const mapping={'已提报待客户反馈':'待客户反馈','已反馈待客户确认':'议价待客户确认','确认合作待补充信息':'待达人确认','已发布待验收':'待验收','已验收':'已完成','不提报':'不予提报','不合作':'客户不合作'};
 for(const r of db.collaborations){
  if(['订单已创建','合作确认完成'].includes(r.status)&&(r.orderId||(db.orders||[]).some(order=>order.proposalId===r.id))){r.status='已创建订单';changed=true;}
  if(r.flowVersion!==3){changed=true;r.legacyStatus=r.status;r.legacyFlow=true;r.legacyConfirmed=['待发布','已发布待验收','已验收'].includes(r.status);r.status=mapping[r.status]||r.status;r.flowVersion=3;}
  if(r.proposalFlowVersion===4)continue;
  changed=true;const previous=r.status;
  const simple={'待运营补充':'待 PM 审核','待对客提报':'待 PM 反馈','待客户审核':'议价待客户确认','待客户反馈':'议价待客户确认','待运营还价':'待运营议价','待客户最终确认':'待达人确认'};
  r.status=simple[previous]||previous;
  // Early prototypes could submit a quote before recording review approval. Only
  // a quote event which actually advanced the workflow recovers that approved path.
  if(previous==='待 PM 审核'&&(r.events||[]).some(e=>e.action==='clientQuote'&&['待客户审核','待客户反馈','议价待客户确认'].includes(e.status)))r.status='议价待客户确认';
  if(r.proposalVersions){const acceptance=customerAcceptanceFor(r);if(acceptance&&!r.customerAcceptance)r.customerAcceptance=acceptance;}
  r.proposalFlowVersion=4;
 }
 for(const view of db.savedViews||[]){if(view.config?.status==='订单已创建'){view.config.status='已创建订单';changed=true;}if(view.config?.stage==='谈价中'){view.config.stage='待议价';changed=true;}}
 if(backfillOrderPricing(db))changed=true;
 if(ensureDeliveryCodes(db))changed=true;
 return changed;
}
export const isConfirmed=r=>Boolean(r.confirmedAt||r.legacyConfirmed);
export function allowedActions(db,u,r){
 const p=db.campaigns.find(p=>p.id===r.campaignId);
 if(!p||!(u.role==='admin'||u.role==='pm'&&reviewPm(db,r)===u.id||canProject(p,u)&&r.ownerId===u.id))return {};
 const pm=u.role==='admin'||u.role==='pm'&&reviewPm(db,r)===u.id,op=u.role==='admin'||r.ownerId===u.id,s=r.status,open=stageOf(r)!=='已结束';
 const negotiating=['待 PM 反馈','议价待客户确认'].includes(s),recovery=Boolean(r.proposalVersions&&['待达人确认','待客户确认'].includes(s)&&!customerAcceptanceFor(r));
 const a={editCustomerProposal:pm&&!r.orderId&&!isConfirmed(r)&&!!r.proposalVersions&&['待 PM 审核','待 PM 反馈','待运营议价','议价待客户确认','待客户确认'].includes(s),customerAccept:pm&&!r.orderId&&!isConfirmed(r)&&validClientQuote(r)&&(negotiating||recovery),reopenSubmission:op&&s==='不予提报'&&!r.orderId&&!r.rejectionAcknowledgedAt,acknowledgeRejection:op&&s==='不予提报'&&!r.rejectionAcknowledgedAt,approve:pm&&!r.selfManagedPmId&&s==='待 PM 审核',reject:pm&&!r.selfManagedPmId&&s==='待 PM 审核',agree:pm&&(negotiating||recovery),negotiate:pm&&s==='议价待客户确认',decline:pm&&(negotiating||recovery),quote:op&&s==='待运营议价',propose:op&&s==='待达人确认',feedback:pm&&s==='待 PM 反馈'&&(!r.proposalVersions||validClientQuote(r)),confirm:op&&s==='待达人确认',creatorDecline:op&&['待议价','合作确认'].includes(stageOf(r)),publish:op&&['待发布','待补充发布资料'].includes(s),accept:pm&&s==='待验收',returnPublish:pm&&s==='待验收',cancel:pm&&isConfirmed(r)&&open,price:u.role==='admin'&&isConfirmed(r)};
 for(const type of ['脚本','视频']){const key=type==='脚本'?'script':'video';a[key+'Submit']=op&&[type+'待提交',type+'待修改'].includes(s);a[key+'Approve']=false;a[key+'Return']=pm&&s===type+'待客户反馈';a[key+'Send']=pm&&[type+'待 PM 初审',type+'待送客户'].includes(s);a[key+'Pass']=pm&&s===type+'待客户反馈';}
 if(r.orderId&&r.proposalId){a.price=false;a.cancel=false;}
 a.scriptRevisionDone=op&&s==='脚本待修改'&&validURL(r.deliverables?.script?.at(-1)?.url);
 a.scriptLink=op&&open&&s!=='待填写客户 Brief'&&!!r.deliverables?.script?.length;
 a.deliveryBrief=(u.role==='pm'&&reviewPm(db,r)===u.id||u.role==='operator'&&r.ownerId===u.id)&&s==='待填写客户 Brief'&&!!r.orderId&&!!r.proposalId;
 a.briefSent=canOwnWork(db,u,r)&&s==='待填写客户 Brief';
 a.cooperationLetter=op&&open&&!!r.orderId&&!!r.proposalId;
 for(const key of ['script','video'])a[key+'Remark']=(pm||op)&&open&&isConfirmed(r)&&!!r.deliverables?.[key]?.length;
 a.preparationPm=u.role==='pm'&&reviewPm(db,r)===u.id&&open&&!!r.orderId&&!!r.proposalId;
 a.schedule=op&&isConfirmed(r)&&!r.proposalVersions&&open;for(const key of ['script','video'])a[key+'Draft']=a[key+'Submit'];
 if(r.proposalVersions){
  a.negotiate=a.quote=a.propose=false;
  a.packageRevision=op&&!r.orderId&&open;
  a.confirmAndCreateOrder=canOwnWork(db,u,r)&&s==='待达人确认'&&!r.orderId&&!!customerAcceptanceFor(r);
  a.correctVideoQuantity=a.confirmAndCreateOrder;
  a.createOrder=canOwnWork(db,u,r)&&s==='合作确认完成';
  a.confirmCreator=(u.role==='admin'||canOwnWork(db,u,r))&&!r.orderId&&(s==='待达人确认'||s==='待 PM 反馈'&&!!r.submissionApprovedAt&&(r.creatorQuoteReplies||[]).some(x=>x.versionId===r.proposalVersions.at(-1).id))&&r.creatorVersionId!==r.proposalVersions.at(-1).id;
  a.cancel=(pm||op)&&!r.orderId&&open;a.price=false;
  a.negotiationQuote=canSubmitNegotiationQuote(db,u,r);a.customerOffer=canRecordCustomerOffer(db,u,r);a.creatorQuoteReply=canReplyCreatorQuote(db,u,r);
 }
 if(r.proposalId){const businessPm=u.role==='pm'&&reviewPm(db,r)===u.id,owner=canOwnWork(db,u,r);
  for(const key of ['script','video']){for(const suffix of ['Submit','Draft'])a[key+suffix]&&=owner;for(const suffix of ['Send','Pass','Return'])a[key+suffix]&&=businessPm;}
  a.scriptRevisionDone&&=owner;a.scriptLink&&=owner;a.publish&&=owner;a.schedule&&=owner;a.accept&&=businessPm;a.returnPublish&&=businessPm;
  if(!open)for(const key of Object.keys(a))a[key]=false;
 }
 if(r.orderId&&!r.proposalId)for(const key of Object.keys(a))a[key]=false;
 return a;
}
const actionLabels={confirmCreator:'确认达人合作',acknowledgeRejection:'处理不提报反馈',confirmAndCreateOrder:'创建订单',createOrder:'创建订单',approve:'审核提报',negotiationQuote:'提交对客报价',customerOffer:'登记客户还价',creatorQuoteReply:'提交运营议价',customerAccept:'登记客户同意合作',agree:'登记客户反馈',quote:'提交达人回价',feedback:'反馈客户并更新进度',confirm:'确认达人合作',scriptSubmit:'提交脚本',scriptApprove:'审核脚本',scriptSend:'同步给客户',scriptPass:'登记脚本客户反馈',videoSubmit:'提交视频',videoApprove:'审核视频',videoSend:'同步给客户',videoPass:'登记视频客户反馈',publish:'提交发布资料',accept:'登记客户验收'};
export function nextStep(db,u,r){const a=allowedActions(db,u,r);if(r.status==='待填写客户 Brief')return {action:a.briefSent?'briefSent':a.deliveryBrief?'deliveryBrief':null,label:a.briefSent?'保存 Brief 后记录已发送':a.deliveryBrief?'填写并保存 Brief，等待负责运营发送':'等待负责运营填写并发送 Brief'};if(deliveryStatus(db,r)==='待补充邮箱')return {action:a.schedule?'preparation':null,label:a.schedule?'补充平台注册邮箱':'等待运营补充平台注册邮箱'};for(const [action,label] of Object.entries(actionLabels))if(a[action]&&!(r.proposalVersions&&['confirm','confirmCreator'].includes(action)))return {action,label};if(u.role==='pm'&&a.preparationPm){const p=db.orders.find(o=>o.id===r.orderId).preparation||{};if(!p.inviteCode&&!p.inviteLink)return {action:'preparationPm',label:'按需填写邀请码或邀请链接'};}let label=r.proposalVersions&&r.orderId?'前往视频交付处理':'等待 PM 处理';if(stageOf(r)==='已结束')label=r.status==='不予提报'&&!r.rejectionAcknowledgedAt?'等待运营处理审核意见':'流程已结束';else if(r.status==='合作确认完成')label='双方价格已确认，等待运营创建订单';else if(r.status==='待客户确认')label='等待 PM 登记客户同意';else if(r.status==='待达人确认')label=r.proposalVersions?'等待运营创建订单':'等待运营确认达人合作';else if(r.status==='待运营议价')label='等待运营议价';else if(/待提交|待修改/.test(r.status))label='等待运营'+r.status.replace('待','');else if(/待客户反馈|议价待客户确认/.test(r.status))label='等待客户反馈，由 PM 登记';else if(['待发布','待补充发布资料'].includes(r.status))label='等待运营提交发布资料';else if(r.status==='待验收')label='等待客户验收，由 PM 登记';return {action:null,label};}
export const isPending=(db,u,r)=>Boolean(nextStep(db,u,r).action);
export function inQueue(db,u,r,queue){
 if(!visibleCoops(db,u).some(x=>x.id===r.id))return false;
 const tasks=(db.tasks||[]).filter(t=>t.objectId===r.id&&t.ownerId===u.id&&t.status==='open');
 if(queue==='today')return tasks.some(t=>new Date(t.dueAt).toDateString()===new Date().toDateString());
 if(queue==='overdue')return isProposalRecord(r)?isProposalOverdue(r):tasks.some(t=>Date.parse(t.dueAt)<Date.now());
 if(queue==='all')return true;
 if(queue==='mine')return isPending(db,u,r)||tasks.length>0;
 return !(r.proposalVersions&&r.orderId)&&(stageOf(r)!=='已结束'||r.status==='不予提报'&&!r.rejectionAcknowledgedAt)&&!isPending(db,u,r);
}

const positive=(v,label)=>{if(!Number.isFinite(v)||v<=0)throw Error('请填写有效的'+label);};
const required=(v,label)=>{if(!String(v||'').trim())throw Error('请填写'+label);};
const validURL=v=>{try{return ['http:','https:'].includes(new URL(v).protocol);}catch{return false;}};
export const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
function currentCreatorCost(r){
 const v=r.proposalVersions?.at(-1);
 const reply=(r.creatorQuoteReplies||[]).filter(x=>x.currency===v.currency&&(x.versionId?x.versionId===v.id:Number.isFinite(Date.parse(x.at))&&Date.parse(x.at)>=Date.parse(v.at))).at(-1);
 return reply?moneyAmount(reply.amount):moneyAmount(v.total);
}
function completePackageAgreement(r,at){
 const v=r.proposalVersions.at(-1),acceptance=customerAcceptanceFor(r),creator=r.creatorAcceptance;
 if(!acceptance||r.creatorVersionId!==v.id||creator?.versionId!==v.id)return false;
 positive(acceptance.clientPrice,'客户确认价格');if(acceptance.currency&&acceptance.currency!==v.currency)throw Error('双方确认币种不一致');
 r.clientVersionId=v.id;r.final=creator.cost;r.confirmedAt=at;r.status='合作确认完成';
 return true;
}
function confirmPackageCreator(r,u,at){
 const v=r.proposalVersions.at(-1),cost=currentCreatorCost(r);positive(cost,'最终合作价');if(r.date&&!validDate(r.date))throw Error('请填写有效发布日期');
 r.creatorVersionId=v.id;r.creatorConfirmedAt=at;r.creatorAcceptance={versionId:v.id,cost,currency:v.currency,by:u.id,at};
 (v.confirmations??=[]).push({party:'creator',by:u.id,at,cost});
 if(!completePackageAgreement(r,at))r.status='待客户确认';
}
function confirmCooperation(c,u,data,at,allowUnscheduled=false){
 positive(data.final,'最终报价');
 if(!c.proposalVersions)required(data.rights,'最终权益');
 if(!(allowUnscheduled&&data.date==='')&&!validDate(data.date))throw Error('请填写有效发布日期');
 const latestPackage=c.proposalVersions?.at(-1),agreed=latestPackage?{quote:currentCreatorCost(c),rights:latestPackage.rights}:c.history?.at(-1);
 const rights=String(data.rights??'').trim();
 if(agreed&&(data.final!==agreed.quote||rights!==String(agreed.rights??c.rights).trim()))throw Error('最终条件与客户确认的回价不一致，请先提交条件变更');
 if(!agreed&&(data.final!==c.initial||rights!==String(c.rights??'').trim()))throw Error('条件有变化，请先提交条件变更');
 if(latestPackage){
  const acceptance=customerAcceptanceFor(c);
  if(!acceptance)throw Error('缺少当前方案的客户确认，请由 PM 登记客户同意合作');
  c.date=data.date||'';c.rights=data.rights;
  const confirmations=latestPackage.confirmations??=[];
  if(!confirmations.some(x=>x.party==='client'&&x.by===acceptance.by&&x.at===acceptance.at))confirmations.push({party:'client',by:acceptance.by,at:acceptance.at});
  confirmPackageCreator(c,u,at);
 }else Object.assign(c,{final:data.final,rights:data.rights,date:data.date,confirmedAt:at,status:'脚本待提交'});
}
export function updateCoop(db,u,id,action,data={}){
 const item=(db.deliveryItems||[]).find(x=>x.id===id);
 if(item&&action==='preparationSync'){
  if(!allowedActions(db,u,item).schedule)throw Error('无权同步平台注册邮箱');
  const draft=structuredClone(db),source=draft.deliveryItems.find(v=>v.id===id);
  updateCoop(draft,u,id,'preparation',data);
  const email=draft.orders.find(o=>o.id===source.orderId).preparation.registrationEmail;
  let syncedVideos=draft.deliveryItems.filter(v=>v.orderId===source.orderId&&v.id!==id).length;
  for(const order of draft.orders){
   if(order.id===source.orderId||order.creatorId!==source.creatorId||order.campaignId!==source.campaignId)continue;
   const videos=draft.deliveryItems.filter(v=>v.orderId===order.id);
   if(!videos.length||!videos.every(v=>allowedActions(draft,u,v).schedule))continue;
   const p=order.preparation||{};
   updateCoop(draft,u,videos[0].id,'preparation',{registrationEmail:email,accessReady:p.accessReady,briefSent:p.briefSent,inviteCode:p.inviteCode,preparationNotes:p.notes});
   syncedVideos+=videos.length;
  }
  db.orders=draft.orders;db.deliveryItems=draft.deliveryItems;
  return {syncedVideos};
 }
 if(item&&action==='briefSent'){
  if(!allowedActions(db,u,item).briefSent)throw Error('仅负责运营可记录已发送 Brief');
  const at=new Date().toISOString();item.status='脚本待提交';item.briefSentAt=at;item.updatedAt=at;(item.events??=[]).push({action,by:u.id,at,status:item.status});return item;
 }
 if(item&&['deliveryBrief','cooperationLetter'].includes(action)){
  if(!allowedActions(db,u,item)[action])throw Error('当前账号无权编辑此项');
  const order=db.orders.find(o=>o.id===item.orderId);if(!order)throw Error('订单不存在');
  const at=new Date().toISOString();
  if(action==='deliveryBrief'){
   const url=String(data.briefUrl||'').trim();if(url&&!validURL(url))throw Error('请填写有效的 Brief 链接');
   item.brief={url,description:String(data.briefDescription||'').trim(),by:u.id,at};
   item.updatedAt=at;(item.events??=[]).push({action,by:u.id,at,status:item.status});return item;
  }else{
   if(!['sent','unsent'].includes(data.cooperationLetter))throw Error('请选择合作信发送状态');
   order.preparation={...order.preparation,cooperationLetterSent:data.cooperationLetter==='sent',cooperationLetterUpdatedAt:at,cooperationLetterBy:u.id};
  }
  (order.events??=[]).push({action,by:u.id,at});
  for(const video of db.deliveryItems.filter(v=>v.orderId===order.id)){video.updatedAt=at;(video.events??=[]).push({action,by:u.id,at,status:video.status});}
  return order;
 }
 if(item&&action==='preparationPm'){
  if(!allowedActions(db,u,item).preparationPm)throw Error('仅业务审核 PM 可填写邀请信息');
  const order=db.orders.find(o=>o.id===item.orderId),inviteCode=String(data.inviteCode||'').trim(),inviteLink=String(data.inviteLink||'').trim();
  if(!inviteCode&&!inviteLink)throw Error('请填写邀请码或邀请链接');
  if(inviteLink&&!validURL(inviteLink))throw Error('请填写有效的邀请链接');
  const at=new Date().toISOString();
  order.preparation={...order.preparation,inviteCode,inviteLink,accessReady:data.accessReady===undefined?order.preparation.accessReady:Boolean(data.accessReady),briefSent:data.briefSent===undefined?order.preparation.briefSent:Boolean(data.briefSent),notes:data.preparationNotes==null?order.preparation.notes:String(data.preparationNotes),pmPreparedAt:at,pmPreparedBy:u.id};
  (order.events??=[]).push({action,by:u.id,at});
  for(const video of db.deliveryItems.filter(v=>v.orderId===order.id)){video.updatedAt=at;(video.events??=[]).push({action,by:u.id,at,status:video.status});}
  return order;
 }
 if(item&&action==='preparation'){
  if(!allowedActions(db,u,item).schedule)throw Error('无权修改交付准备');
  const order=(db.orders||[]).find(o=>o.id===item.orderId);if(!order)throw Error('订单不存在');
  const registrationEmail=String(data.registrationEmail||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationEmail))throw Error('请填写有效的平台注册邮箱');
  order.preparation={...order.preparation,registrationEmail};
  const at=new Date().toISOString();(order.events??=[]).push({action,by:u.id,at});for(const video of db.deliveryItems.filter(v=>v.orderId===order.id)){video.updatedAt=at;(video.events??=[]).push({action,by:u.id,at,status:video.status});}return order;
 }
 if(item)return updateCoop({...db,deliveryItems:[],collaborations:[item]},u,id,action,data);
 if(action==='confirmAndCreateOrder')return confirmAndCreatePackageOrder(db,u,id,data);
 if(action==='createOrder')return createPackageOrder(db,u,id,data);
 if(action==='packageRevision')return revisePackage(db,u,id,data);

 const r=visibleCoops(db,u).find(r=>r.id===id);if(!r||!allowedActions(db,u,r)[action])throw Error('当前账号或状态不允许此操作');
 const c=structuredClone(r),at=new Date().toISOString(),reason=String(data.reason||'').trim();
 const requireReason=()=>required(reason,'原因或修改意见');
 if(action==='price'){requireReason();(c.priceCorrections??=[]).push({before:{cost:r.final,clientPrice:r.clientPrice},after:{cost:r.final,clientPrice:data.clientPrice},by:u.id,at,reason,businessDate:r.confirmedAt||r.submittedAt});}
 if(['agree','price','customerAccept'].includes(action)){positive(data.clientPrice,'客户确认价格');c.clientPrice=data.clientPrice;}
 if(action==='scriptLink'){if(!validURL(data.url))throw Error('请填写有效的 HTTP 或 HTTPS 脚本链接');c.deliverables.script.at(-1).url=data.url;c.scriptLinkUpdatedAt=at;}
 if(action==='scriptRevisionDone'){c.status='脚本待送客户';if(c.drafts)delete c.drafts.script;}
 if(action==='schedule'){if(!validDate(data.date))throw Error('请填写有效计划日期');c.date=data.date;}
 if(action==='correctVideoQuantity'){
  requireReason();const v=c.proposalVersions.at(-1),quantities=data.quantities;
  if(!Array.isArray(quantities)||quantities.length!==v.items.length||quantities.some(q=>!Number.isInteger(q)||q<1||q>100))throw Error('每项视频数量需为 1 至 100 的整数');
  if(quantities.every((q,i)=>q===v.items[i].quantity))throw Error('视频数量未发生变化');
  const before=structuredClone(v.items);
  v.items=v.items.map((item,i)=>({...item,quantity:quantities[i]}));
  (c.quantityCorrections??=[]).push({id:crypto.randomUUID(),versionId:v.id,before,after:structuredClone(v.items),by:u.id,at,reason,customerAcceptance:structuredClone(customerAcceptanceFor(c))});
 }
 if(action==='editCustomerProposal'){const terms=packageTerms(data);if(cents(terms.total)!==cents(c.proposalVersions.at(-1).total))throw Error('审核 PM 不能修改达人侧报价');if(terms.currency!==c.currency)throw Error('编辑方案时请保留原币种');c.proposalVersions.push({id:crypto.randomUUID(),version:c.proposalVersions.at(-1).version+1,...terms,by:u.id,source:u.role,at,reason:'PM 更新合作方案'});c.initial=terms.total;c.rights=terms.rights;clearPackageAcceptance(c);if(c.status!=='待 PM 审核')c.status='待 PM 反馈';}
 if(['customerAccept','agree'].includes(action)){c.status='待达人确认';c.customerAcceptedAt=at;c.customerAcceptedBy=u.id;c.customerAcceptanceNote=reason;if(c.proposalVersions){const versionId=c.proposalVersions.at(-1).id;c.preliminaryVersionId=versionId;c.customerAcceptance={versionId,by:u.id,at,clientPrice:data.clientPrice,currency:c.proposalVersions.at(-1).currency,note:reason};c.clientVersionId=versionId;(c.proposalVersions.at(-1).confirmations??=[]).push({party:'client',by:u.id,at,clientPrice:data.clientPrice});completePackageAgreement(c,at);}}
 if(action==='reopenSubmission'){validateSubmissionProfile(db.creators.find(profile=>profile.id===r.creatorId));required(reason,'复审补充说明');const terms=packageTerms(data);c.proposalVersions=[...(c.proposalVersions||[]),{id:crypto.randomUUID(),version:(c.proposalVersions?.length||0)+1,...terms,by:u.id,source:u.role,at,reason:'不提报后重新提交'}];c.initial=terms.total;c.currency=terms.currency;c.rights=terms.rights;c.reason=String(data.reason||'');c.status='待 PM 审核';c.closedAt=null;c.closeReason='';c.resubmittedAt=at;c.rejectionAcknowledgedAt=null;clearPackageAcceptance(c);delete c.submissionApprovedAt;}
 if(action==='acknowledgeRejection'){c.rejectionAcknowledgedAt=at;c.closedAt=at;}
 if(action==='approve'){
  if(c.proposalVersions){const amount=Number(data.clientQuote);positive(amount,'对客报价');c.clientQuoteDraft={amount,currency:c.currency,versionId:c.proposalVersions.at(-1).id,note:String(data.quoteNote||'').trim(),by:u.id,at};}
  (c.reviewHistory??=[]).push({decision:'approved',by:u.id,at});c.status='待 PM 反馈';c.submissionApprovedAt=at;c.submissionApprovedBy=u.id;
 }
 if(action==='negotiate'){positive(data.target,'议价目标');required(data.rights,'权益');c.target=data.target;c.targetRights=data.rights;c.status='待运营议价';}
 if(['quote','propose'].includes(action)){positive(data.quote,'达人回价');required(data.rights,'权益');(c.history??=[]).push({quote:data.quote,rights:data.rights,at,operator:u.id});c.status='待 PM 反馈';}
 if(action==='feedback')c.status='议价待客户确认';
 if(action==='confirm')confirmCooperation(c,u,data,at);
 if(action==='confirmCreator')confirmPackageCreator(c,u,at);
 for(const [key,type] of [['script','脚本'],['video','视频']]){
  if(action===key+'Draft'){if(data.url&&!validURL(data.url))throw Error('链接格式不正确');(c.drafts??={})[key]={url:String(data.url||''),description:String(data.description||''),by:u.id,at};}
  if(action===key+'Submit'){if(!validURL(data.url))throw Error('请填写有效的 HTTP 或 HTTPS 交付链接');const list=(c.deliverables??={})[key]??=[];list.push({version:list.length+1,url:data.url,description:data.description,submittedBy:u.id,submittedAt:at,reviews:[]});c.status=type+'待送客户';if(c.drafts)delete c.drafts[key];}
  if(action===key+'Remark'){
   const body=String(data.remark||'').trim();required(body,'备注');if(body.length>1000)throw Error('备注不能超过 1000 字');
   ((c.deliveryRemarks??={})[key]??=[]).push({id:crypto.randomUUID(),body,by:u.id,at,progress:deliveryStatus(db,c)});
  }
  if([key+'Return',key+'Send',key+'Pass'].includes(action)){
   const latest=c.deliverables?.[key]?.at(-1);if(!latest)throw Error('缺少稿件链接');
   if(action===key+'Return'){latest.returnedAt=at;c.returnNote=reason;c.status=type+'待修改';}
   if(action===key+'Send'){latest.sentAt=at;c.status=type+'待客户反馈';}
   if(action===key+'Pass'){latest.approvedAt=at;c.status=key==='script'?'视频待提交':'待发布';}
  }
 }
 if(action==='publish'){if(c.publications){const links=data.publicationLinks||{};c.publications=c.publications.map(p=>{if(!validURL(links[p.id]))throw Error('请补齐各平台发布链接');return {...p,url:links[p.id],status:'submitted'};});data={...data,url:c.publications[0].url};}if(!validURL(data.url)||data.distribution&&!validURL(data.distribution))throw Error('请填写有效发布或分发链接');if(!c.legacyFlow&&!c.deliverables?.video?.at(-1)?.approvedAt)throw Error('视频尚未获客户通过');Object.assign(c,{url:data.url,distribution:data.distribution||'',publishedAt:c.publishedAt||at,status:'待验收'});}
 if(action==='returnPublish'){c.publishFeedback=reason;c.status='待补充发布资料';}
 if(action==='accept'){if(c.publications)c.publications.forEach(p=>p.status='accepted');c.status='已完成';c.acceptedAt=at;}
 const closed={reject:'不予提报',decline:'客户不合作',creatorDecline:'达人不合作',cancel:'合作取消'};
 if(closed[action]){requireReason();c.status=closed[action];c.closeReason=reason;c.closedAt=at;if(action==='reject'){c.rejectionAcknowledgedAt=null;c.closedAt=null;(c.reviewHistory??=[]).push({decision:'rejected',reason,by:u.id,at});}}
 c.updatedAt=at;(c.events??=[]).push({action,by:u.id,at,status:c.status,reason,...(action==='reopenSubmission'?{previousRejection:{reason:r.closeReason,closedAt:r.closedAt}}:{})});for(const key of Object.keys(r))if(!Object.hasOwn(c,key))delete r[key];Object.assign(r,c);return r;
}
export function updatedInfo(r){const dates=[r.updatedAt,...(r.events||[]).map(e=>e.at)].filter(v=>Number.isFinite(Date.parse(v)));return dates.length?{at:dates.sort((a,b)=>Date.parse(b)-Date.parse(a))[0],label:r.events?.at(-1)?.action==='scriptLink'?'脚本链接已更新':'最近更新'}:{at:r.submittedAt||'',label:'提报时间'};}
export function metricMatches(r,key){return key==='all'||key==='cooperationCompleted'&&proposalStageOf(r)==='已完成'||key==='confirmed'&&isConfirmed(r)||key==='effective'&&isConfirmed(r)&&r.status!=='合作取消'||key==='production'&&['脚本制作','视频制作'].includes(stageOf(r))||key==='published'&&Boolean(r.url)||key==='accepted'&&r.status==='已完成'||key==='negotiating'&&['待运营议价','待 PM 反馈','议价待客户确认'].includes(r.status)||key==='priced'&&margin(r)!==null;}
export function summary(db,u,rows){if(u.role==='operator')rows=rows.filter(r=>r.ownerId===u.id);const known=rows.filter(r=>margin(r)!==null),marginByCurrency={};for(const r of known){const currency=r.currency||'CNY';marginByCurrency[currency]=(marginByCurrency[currency]||0)+margin(r);}return {marginByCurrency,total:rows.length,pending:rows.filter(r=>isPending(db,u,r)).length,...Object.fromEntries(['confirmed','effective','production','published','accepted','negotiating','cooperationCompleted'].map(k=>[k,rows.filter(r=>metricMatches(r,k)).length])),margin:marginByCurrency.CNY??null,known:known.length,missing:rows.length-known.length};}
export const projectMetrics=summary;
export const sortOrders=(db,u,rows)=>[...rows].sort((a,b)=>Number(isPending(db,u,b))-Number(isPending(db,u,a))||(Date.parse(updatedInfo(b).at)||0)-(Date.parse(updatedInfo(a).at)||0)||a.id.localeCompare(b.id));
export function selectOrders(db,u,f={},source=visibleCoops(db,u)){
 const {q='',platform='全部',country='全部',owner='全部',campaignFilter='全部',stage='全部',status='全部',queue='all',metric='all',sort='pending',cooperation=false}=f,visible=new Set(visibleCoops(db,u).map(r=>r.id));
 const rows=source.filter(r=>{const c=db.creators.find(c=>c.id===r.creatorId);return visible.has(r.id)&&c&&(r.id+' '+(r.deliveryCode||'')+' '+(r.orderId?orderNumber(db,r.orderId):'')+' '+(r.proposalCode||'')+' '+c.id+' '+(c.displayCode||'')+' '+c.name+' '+socialAccounts(c).map(a=>a.handle+' '+a.url).join(' ')).toLowerCase().includes(q.trim().toLowerCase())&&(platform==='全部'||c.platform===platform)&&(country==='全部'||c.country===country)&&(owner==='全部'||r.ownerId===owner)&&(campaignFilter==='全部'||r.campaignId===campaignFilter)&&(stage==='全部'||(stage==='不提报'?r.status==='不予提报':(cooperation?proposalStageOf(r):stageOf(r))===(cooperation?proposalFilter(stage,'stage'):stage)))&&(status==='全部'||(cooperation?proposalStatus(r):r.status)===(cooperation?proposalFilter(status):status))&&inQueue(db,u,r,queue)&&(metric==='pending'?isPending(db,u,r):metricMatches(r,metric));});
 return sort==='recent'?[...rows].sort((a,b)=>(Date.parse(updatedInfo(b).at)||0)-(Date.parse(updatedInfo(a).at)||0)||a.id.localeCompare(b.id)):sortOrders(db,u,rows);
}
export function calendarOrders(rows,month){return {scheduled:rows.filter(r=>validDate(r.date)&&r.date.slice(0,7)===month),unscheduled:rows.filter(r=>isConfirmed(r)&&!validDate(r.date)&&r.status!=='合作取消')};}
export const canNote=(db,u,r)=>visibleCoops(r.orderId&&r.proposalId?deliveryContext(db):db,u).some(c=>c.id===r.id)&&(u.role==='admin'||r.ownerId===u.id||reviewPm(db,r)===u.id);
export function addNote(db,u,id,body){const item=(db.deliveryItems||[]).find(x=>x.id===id);if(item)return addNote({...db,deliveryItems:[],collaborations:[item]},u,id,body);const r=db.collaborations.find(r=>r.id===id);if(!r||!canNote(db,u,r))throw Error('无权添加该订单的跟进备注');body=String(body??'').trim();if(!body||body.length>1000)throw Error('请填写 1–1000 字的跟进备注');const note={id:crypto.randomUUID(),authorId:u.id,body,createdAt:new Date().toISOString()};(r.notes??=[]).push(note);r.updatedAt=note.createdAt;(r.events??=[]).push({action:'note',by:u.id,at:note.createdAt,status:r.status});return note;}
export const savedViewsFor=(db,u)=>(db.savedViews||[]).filter(v=>v.userId===u.id);
export function saveView(db,u,name,config={},id){name=String(name??'').trim();if(!name||name.length>40)throw Error('视图名称需为 1–40 字');const owned=savedViewsFor(db,u);if(owned.some(v=>v.name===name&&v.id!==id))throw Error('已有同名视图');if(id){const view=owned.find(v=>v.id===id);if(!view)throw Error('无权修改此视图');view.name=name;return view;}const clean={};for(const key of ['q','platform','country','owner','campaignFilter','stage','status','queue','sort','view','showPrices'])if(['string','boolean'].includes(typeof config[key]))clean[key]=config[key];const view={id:crypto.randomUUID(),userId:u.id,name,config:clean};(db.savedViews??=[]).push(view);return view;}
export function deleteView(db,u,id){if(!savedViewsFor(db,u).some(v=>v.id===id))throw Error('无权删除此视图');db.savedViews=db.savedViews.filter(v=>v.id!==id);}


// New Package entities are additive; legacy collaborations stay untouched.
export function packageTerms(data){
 const total=Number(data.total);positive(total,'Package 总价');
 const currency=String(data.currency||'CNY').toUpperCase();
 if(!['CNY','USD','EUR','GBP'].includes(currency))throw Error('请选择支持的币种');
 const items=(data.items||[]).map(x=>({platform:x.platform,type:String(x.type||'').trim(),quantity:Number(x.quantity),publicationPlatforms:[...new Set([x.platform,...(x.publicationPlatforms||[])])]}));
 if(!items.length||items.some(x=>x.publicationPlatforms.some(p=>!platforms.includes(p))||!platforms.includes(x.platform)||!x.type||!Number.isInteger(x.quantity)||x.quantity<1)||items.reduce((n,x)=>n+x.quantity,0)>100)throw Error('请填写平台、内容类型与视频数量（合计 1–100）');
 return {total,currency,items,rights:String(data.rights||'').trim(),cooperationNotes:String(data.cooperationNotes||'').trim()};
}
export function enablePackage(db,u,id,data){
 const r=visibleCoops(db,u).find(x=>x.id===id);
 if(!r||r.ownerId!==u.id&&u.role!=='admin'||!(r.status==='待 PM 审核'||isSelfManagedPm(db,u,r)&&r.status==='待 PM 反馈')||r.proposalVersions)throw Error('无法初始化此提报的方案');
 const terms=packageTerms(data),at=new Date().toISOString();
 r.proposalVersions=[{id:crypto.randomUUID(),version:1,...terms,by:u.id,source:u.role,at,reason:'初始提报'}];
 r.initial=terms.total;r.rights=terms.rights;r.currency=terms.currency;
 return r;
}
export function revisePackage(db,u,id,data){
 const r=visibleCoops(db,u).find(x=>x.id===id);
 if(!r||!allowedActions(db,u,r).packageRevision)throw Error('无法调整方案，最多三轮议价，或订单已经创建');
 const terms=packageTerms(data);required(data.reason,'方案修改说明');
 const at=new Date().toISOString();if(r.currency!==terms.currency){r.clientQuotes??=clientQuoteHistory(r);r.clientPrice=null;r.clientQuote=null;r.clientQuoteNeedsReview=true;}r.proposalVersions.push({id:crypto.randomUUID(),version:r.proposalVersions.length+1,...terms,by:u.id,source:u.role,at,reason:String(data.reason)});
 r.rights=terms.rights;r.currency=terms.currency;r.status=isSelfManagedPm(db,u,r)?'待 PM 反馈':'待 PM 审核';
 clearPackageAcceptance(r);delete r.submissionApprovedAt;delete r.submissionApprovedBy;
 r.updatedAt=at;(r.events??=[]).push({action:'packageRevision',by:u.id,at,status:r.status,reason:data.reason});return r;
}
function allocation(total,quantity){
 const units=cents(total);
 if(units===null||units<=0||!Number.isInteger(quantity)||quantity<1||quantity>100)throw Error('请核实订单总价与视频数量');
 const base=Math.floor(units/quantity),remainder=units%quantity;
 return Array.from({length:quantity},(_,i)=>(base+(i<remainder?1:0))/100);
}
function orderPricing(terms,acceptance){
 const cost=moneyAmount(terms.total),clientPrice=moneyAmount(acceptance?.clientPrice),currency=terms.currency;
 const quantity=(terms.items||[]).reduce((n,spec)=>n+spec.quantity,0);
 if(!['CNY','USD','EUR','GBP'].includes(currency)||acceptance?.currency&&acceptance.currency!==currency||cost===null||clientPrice===null||cost<=0||clientPrice<=0)throw Error('请核实已确认的合作价格、客户价格及币种');
 allocation(cost,quantity);allocation(clientPrice,quantity);
 return {cost,clientPrice,margin:(cents(clientPrice)-cents(cost))/100,currency,quantity};
}
function allocateItems(items,pricing){
 const costs=allocation(pricing.cost,pricing.quantity),prices=allocation(pricing.clientPrice,pricing.quantity);
 items.forEach((item,index)=>Object.assign(item,{initial:costs[index],final:costs[index],clientQuote:prices[index],clientPrice:prices[index],currency:pricing.currency}));
}
function backfillOrderPricing(db){
 let changed=false;
 for(const order of db.orders||[]){
  const items=(db.deliveryItems||[]).filter(item=>item.orderId===order.id);
  let pricing=order.pricing;
  if(!pricing){
   const proposal=db.collaborations.find(r=>r.id===order.proposalId),acceptance=proposal&&customerAcceptanceFor(proposal);
   // Reconstruct only from the version and acceptance that predate this order.
   if(!order.terms||order.terms.id!==order.versionId||!acceptance||acceptance.versionId!==order.versionId||!(Date.parse(acceptance.at)<=Date.parse(order.createdAt)))continue;
   try{pricing=orderPricing(order.terms,acceptance);}catch{continue;}
   if(items.length!==pricing.quantity||Number.isFinite(order.clientPrice)&&order.clientPrice!==pricing.clientPrice)continue;
   order.pricing=pricing;order.clientPrice=pricing.clientPrice;order.margin=pricing.margin;changed=true;
  }
  // Never replace historical video financial values, including zero allocations.
  if(items.length!==pricing.quantity||items.some(item=>['initial','final','clientPrice','clientQuote'].some(key=>item[key]!=null)||item.currency&&item.currency!==pricing.currency))continue;
  try{allocateItems(items,pricing);changed=true;}catch{}
 }
 return changed;
}
export function confirmAndCreatePackageOrder(db,u,id,data={}){
 const r=visibleCoops(db,u).find(x=>x.id===id);
 if(!canOwnWork(db,u,r))throw Error('仅负责运营或自提 PM 可以创建订单');
 const existing=(db.orders||[]).find(order=>order.proposalId===id);if(existing)return existing;
 if(!allowedActions(db,u,r).confirmAndCreateOrder)throw Error('尚未完成当前方案的客户确认');
 // Both steps validate on a working copy; failures cannot leave a half-confirmed proposal.
 const draft=structuredClone(db),confirmed=draft.collaborations.find(x=>x.id===id),v=confirmed.proposalVersions.at(-1),at=new Date().toISOString();
 const confirmation={final:Object.hasOwn(data,'final')?data.final:currentCreatorCost(confirmed),rights:Object.hasOwn(data,'rights')?data.rights:v.rights,date:Object.hasOwn(data,'date')?data.date:confirmed.date||''};
 confirmCooperation(confirmed,u,confirmation,at,true);
 confirmed.updatedAt=at;(confirmed.events??=[]).push({action:'confirm',by:u.id,at,status:confirmed.status,reason:String(data.reason||'').trim()});
 const order=createPackageOrder(draft,u,id,data);
 const items=draft.deliveryItems.filter(item=>item.orderId===order.id);
 for(const key of Object.keys(r))if(!Object.hasOwn(confirmed,key))delete r[key];Object.assign(r,confirmed);
 (db.orders??=[]).push(order);(db.deliveryItems??=[]).push(...items);
 return order;
}
export function createPackageOrder(db,u,id,data={}){
 const r=visibleCoops(db,u).find(x=>x.id===id);
 if(!canOwnWork(db,u,r))throw Error('仅负责运营或自提 PM 可以创建订单');
 const existing=(db.orders||[]).find(o=>o.proposalId===id);if(existing)return existing;
 if(!allowedActions(db,u,r).createOrder)throw Error('方案尚未最终确认');
 const v=r.proposalVersions.at(-1),acceptance=customerAcceptanceFor(r);
 if(r.creatorVersionId!==v.id||r.clientVersionId!==v.id||!acceptance)throw Error('双方确认版本不一致');
 if(cents(v.total)===null)throw Error('请核实方案总价');
 const terms=packageTerms({...v,total:r.final}),pricing=orderPricing(terms,acceptance);
 const at=new Date().toISOString(),order={id:crypto.randomUUID(),proposalId:id,creatorId:r.creatorId,campaignId:r.campaignId,reviewPmId:reviewPm(db,r),...(r.selfManagedPmId?{selfManagedPmId:r.selfManagedPmId}:{}),targetCountry:r.targetCountry||'',ownerId:r.ownerId,versionId:v.id,terms:{...structuredClone(v),total:pricing.cost},total:pricing.cost,clientPrice:pricing.clientPrice,margin:pricing.margin,currency:pricing.currency,pricing,paymentTerms:String(data.paymentTerms||''),preparation:{},createdAt:at};
 let index=0;const items=terms.items.flatMap(spec=>Array.from({length:spec.quantity},()=>({id:crypto.randomUUID(),orderId:order.id,proposalId:id,creatorId:r.creatorId,campaignId:r.campaignId,reviewPmId:reviewPm(db,r),...(r.selfManagedPmId?{selfManagedPmId:r.selfManagedPmId}:{}),targetCountry:r.targetCountry||'',ownerId:r.ownerId,name:'Video '+(++index),publications:spec.publicationPlatforms.map(platform=>({id:crypto.randomUUID(),platform,url:'',status:'pending'})),platform:spec.platform,contentType:spec.type,status:'待填写客户 Brief',confirmedAt:at,submittedAt:at,updatedAt:at,date:r.date||'',history:[],events:[],notes:[],deliverables:{script:[],video:[]},rights:v.rights,url:'',distribution:''})));
 allocateItems(items,pricing);
 (db.orders??=[]).push(order);ensureOrderCodes(db);(db.deliveryItems??=[]).push(...items);ensureDeliveryCodes(db);r.orderId=order.id;r.status='已创建订单';r.updatedAt=at;(r.events??=[]).push({action:'createOrder',by:u.id,at,status:r.status});return order;
}
export function deliveryContext(db){return {...db,collaborations:[...db.collaborations.filter(r=>!r.proposalVersions&&isConfirmed(r)),...(db.deliveryItems||[])]};}
export function orderProgress(db,id){const items=(db.deliveryItems||[]).filter(x=>x.orderId===id);return {total:items.length,scripts:items.filter(x=>x.deliverables.script.some(v=>v.approvedAt)).length,videos:items.filter(x=>x.deliverables.video.some(v=>v.approvedAt)).length,published:items.filter(x=>x.url).length,accepted:items.filter(x=>x.status==='已完成').length};}

export function socialAccounts(c){return c.accounts|| (c.platform?[{id:c.id+':legacy',platform:c.platform,handle:c.handle||'',url:c.profile||'',followers:c.followers??null,views:c.views??null,updatedAt:null}]:[]);}
export function matchesAccount(c,platform='全部',minimum=0){return socialAccounts(c).some(a=>(platform==='全部'||a.platform===platform)&&(minimum<=0||Number(a.followers)>=minimum))||(platform==='全部'&&minimum<=0);}
export function canEditCreator(db,u,c){return Boolean(c&&(u.role==='admin'||creatorInitiators(c).includes(u.id)||db.collaborations.some(r=>r.creatorId===c.id&&(r.submittedBy||r.ownerId)===u.id)));}
export function saveCreatorProfile(db,u,id,data){
 const c=db.creators.find(x=>x.id===id);if(!canEditCreator(db,u,c))throw Error('仅发起人、正式提报人或管理员可以编辑达人');
 const previous=socialAccounts(c);
 const accounts=(data.accounts||previous).map(a=>({...a,handle:String(a.handle||'').trim(),url:String(a.url||'').trim()})).filter(a=>a.handle||a.url);
 const changed=accounts.filter(a=>JSON.stringify(a)!==JSON.stringify(previous.find(b=>b.id===a.id)));
 if(changed.some(a=>!platforms.includes(a.platform)||!a.handle||!validURL(a.url)||a.followers!==null&&(!Number.isFinite(a.followers)||a.followers<0)))throw Error('账号需包含平台、Handle、有效主页链接和非负粉丝量');
 const accountKey=a=>{const url=new URL(a.url);return url.hostname.toLowerCase().replace(/^www\./,'')+url.pathname.replace(/\/+$/,'').toLowerCase();};
 for(const a of changed){if(db.creators.some(other=>other.id!==id&&socialAccounts(other).some(b=>b.platform===a.platform&&(b.handle.toLowerCase()===a.handle.toLowerCase()||b.url&&validURL(b.url)&&accountKey(b)===accountKey(a)))))throw Error('此社媒账号已关联其他达人，请核实身份，不能按昵称合并');}
 if(changed.some(a=>a.views!=null&&(!Number.isFinite(a.views)||a.views<0)))throw Error('均播必须为非负数');
 const at=new Date().toISOString();
 if(data.accounts)c.accounts=accounts.map(a=>{const old=previous.find(b=>b.id===a.id);return {...a,id:a.id||crypto.randomUUID(),creatorId:id,updatedAt:!old||old.followers!==a.followers||old.views!==a.views?at:old.updatedAt};});
 for(const key of ['name','country','language','contact','creatorType','notes'])if(Object.hasOwn(data,key))c[key]=String(data[key]||'').trim();
 c.updatedAt=at;return c;
}

export function workObject(db,u,id){return visibleCoops(db,u).find(x=>x.id===id)||visibleCoops(deliveryContext(db),u).find(x=>x.id===id);}
export function addFollowUp(db,u,id,data){
 const r=workObject(db,u,id);if(!r)throw Error('无权跟进此对象');
 required(data.body,'沟通内容');required(data.channel,'沟通渠道');
 if(!Number.isFinite(Date.parse(data.communicatedAt)))throw Error('请填写实际沟通时间');
 if(data.nextAt&&!Number.isFinite(Date.parse(data.nextAt)))throw Error('请填写有效提醒时间');
 if(data.link&&!validURL(data.link))throw Error('请填写有效附件或消息链接');
 const at=new Date().toISOString(),record={id:crypto.randomUUID(),objectId:id,objectType:r.proposalId?'deliverable':'proposal',type:String(data.type||'沟通'),channel:String(data.channel),contact:String(data.contact||''),communicatedAt:data.communicatedAt,body:String(data.body),result:String(data.result||''),link:String(data.link||''),by:u.id,createdAt:at};
 (db.followUps??=[]).push(record);
 if(data.nextAt)(db.tasks??=[]).push({id:crypto.randomUUID(),objectId:id,type:'跟进提醒',ownerId:u.id,createdAt:at,dueAt:data.nextAt,status:'open',history:[{action:'created',by:u.id,at}]});return record;
}
export function updateReminder(db,u,id,action,dueAt){
 const task=(db.tasks||[]).find(t=>t.id===id);if(!task||!workObject(db,u,task.objectId)||(task.ownerId!==u.id&&u.role!=='admin'))throw Error('无权修改此提醒');
 if(!['complete','cancel','reschedule'].includes(action)||task.status!=='open')throw Error('提醒已结束或操作无效');
 const at=new Date().toISOString();if(action==='reschedule'){if(!Number.isFinite(Date.parse(dueAt)))throw Error('请输入有效时间');task.dueAt=dueAt;}else{task.status=action==='complete'?'completed':'cancelled';task.completedAt=at;}
 task.history.push({action,by:u.id,at,dueAt:task.dueAt});return task;
}

export function canSetClientQuote(db,u,r){return Boolean(r&&!r.orderId&&(!r.status||stageOf(r)!=='已结束')&&(u.role==='admin'||u.role==='pm'&&reviewPm(db,r)===u.id));}
export function clientQuoteHistory(r){
 if(r.clientQuotes)return r.clientQuotes;
 if(!(Number(r.clientQuote)>0))return [];
 const event=(r.events||[]).filter(e=>e.action==='clientQuote').at(-1);
 return [{id:'legacy-client-quote',round:1,amount:Number(r.clientQuote),currency:r.currency||'CNY',note:'',by:event?.by||'',at:event?.at||'',legacy:true}];
}
export function setClientQuote(db,u,id,value,note=''){
 const r=db.collaborations.find(x=>x.id===id);
 if(!canSetClientQuote(db,u,r))throw Error('仅项目 PM 或管理员可以填写对客报价');
 const amount=value===''||value==null?null:Number(value);
 if(amount!==null&&(!Number.isFinite(amount)||amount<=0))throw Error('对客报价需为大于 0 的金额');
 const quotes=clientQuoteHistory(r).map(q=>({...q}));
 if(amount!==null)quotes.push({id:crypto.randomUUID(),round:quotes.length+1,amount,currency:r.currency||'CNY',note:String(note||'').trim(),by:u.id,at:new Date().toISOString()});
 const resume=amount!==null&&canResumeCustomerNegotiation(r);
 if(resume)clearPackageAcceptance(r);
 r.clientQuotes=quotes;
 if(amount!==null)delete r.clientQuoteDraft;
 r.clientQuote=amount;r.clientQuoteNeedsReview=false;r.updatedAt=new Date().toISOString();
 // Approval drafts live separately in clientQuoteDraft and do not count as rounds.
 // A submitted quote advances an approved proposal to customer feedback.
 if(amount!==null&&(r.status==='待 PM 反馈'||resume))r.status='议价待客户确认';
 (r.events??=[]).push({action:'clientQuote',by:u.id,at:r.updatedAt,status:r.status,reason:amount===null?'清空对客报价':'更新对客报价：'+r.currency+' '+amount});return r;
}


// Shared resources may only be deleted before any project history exists.
export function creatorDeleteReason(db,u,c){
 if(!c)return '达人不存在';
 if(u.role!=='admin'&&c.createdBy!==u.id)return '仅发起人或管理员可以删除';
 if(['collaborations','orders','deliveryItems'].some(key=>(db[key]||[]).some(r=>r.creatorId===c.id)))return '已关联提报或合作记录，不可删除';
 return '';
}
export function deleteCreators(db,u,ids){
 const unique=[...new Set(ids)];
 if(!unique.length)throw Error('请先选择达人');
 for(const id of unique){const reason=creatorDeleteReason(db,u,db.creators.find(c=>c.id===id));if(reason)throw Error(reason);}
 const selected=new Set(unique);
 db.creators=db.creators.filter(c=>!selected.has(c.id));
 return unique.length;
}


// One-time reset explicitly confirmed for this local prototype on 2026-10-12.
export const CREATOR_RESET_VERSION='20261012-user-confirmed-clear-v1';
export function applyConfirmedCreatorReset(db){
 if(db.creatorResetVersion===CREATOR_RESET_VERSION)return false;
 for(const key of ['creators','collaborations','orders','deliveryItems','followUps','tasks'])db[key]=[];
 db.creatorResetVersion=CREATOR_RESET_VERSION;
 return true;
}


export function ensureCreatorCodes(db){
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',version='random-v1';
 const valid=v=>typeof v==='string'&&/^[A-HJ-NP-Z2-9]{5}$/.test(v)&&/[A-Z]/.test(v)&&/[2-9]/.test(v);
 const migrate=db.creatorCodeVersion!==version;
 const used=new Set([...(db.issuedCreatorCodes||[]),...db.creators.map(c=>c.displayCode)].filter(Boolean)),seen=new Set(),updates=[];
 for(const c of db.creators){
  if(!migrate&&valid(c.displayCode)&&!seen.has(c.displayCode)){seen.add(c.displayCode);continue;}
  let code;
  for(let attempt=0;attempt<10000;attempt++){
   const bytes=crypto.getRandomValues(new Uint8Array(5));
   const candidate=Array.from(bytes,b=>alphabet[b&31]).join('');
   if(valid(candidate)&&!used.has(candidate)){code=candidate;break;}
  }
  if(!code)throw Error('暂时无法生成唯一达人编号，请重试');
  used.add(code);seen.add(code);updates.push([c,code]);
 }
 if(!migrate&&!updates.length)return false;
 for(const [c,code] of updates)c.displayCode=code;
 db.creatorCodeVersion=version;db.issuedCreatorCodes=[...used];delete db.nextCreatorCode;
 return true;
}


export function creatorInitiators(c){return [...new Set([c?.createdBy,...(c?.initiatorIds||[])].filter(Boolean))];}
export function addCreatorInitiator(db,u,id){
 const c=db.creators.find(c=>c.id===id);if(!c)throw Error('达人不存在');
 if(db.collaborations.some(r=>r.creatorId===id)||(db.orders||[]).some(r=>r.creatorId===id)||(db.deliveryItems||[]).some(r=>r.creatorId===id))throw Error('该达人已正式提报，请打开已有档案');
 c.initiatorIds=[...new Set([...creatorInitiators(c),u.id])];
 return c;
}

export function ensureProposalCodes(db){
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const valid=v=>typeof v==='string'&&/^[A-HJ-NP-Z2-9]{6}$/.test(v)&&/[A-Z]/.test(v)&&/[2-9]/.test(v);
 const used=new Set([...(db.issuedProposalCodes||[]),...db.collaborations.map(r=>r.proposalCode)].filter(Boolean)),seen=new Set(),updates=[];
 for(const r of db.collaborations){
  if(valid(r.proposalCode)&&!seen.has(r.proposalCode)){seen.add(r.proposalCode);continue;}
  let code;
  for(let attempt=0;attempt<10000;attempt++){
   const candidate=Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>alphabet[b&31]).join('');
   if(valid(candidate)&&!used.has(candidate)){code=candidate;break;}
  }
  if(!code)throw Error('暂时无法生成唯一提报编号，请重试');
  used.add(code);seen.add(code);updates.push([r,code]);
 }
 if(!updates.length)return false;
 for(const [r,code] of updates)r.proposalCode=code;
 db.issuedProposalCodes=[...used];return true;
}

export function canReplyCreatorQuote(db,u,r){return Boolean(r&&(u.role==='admin'||canOwnWork(db,u,r)&&projectsFor(db,u).some(p=>p.id===r.campaignId))&&r.status==='待运营议价'&&!r.orderId&&!isConfirmed(r)&&clientQuoteHistory(r).length);}
export function addCreatorQuoteReply(db,u,id,value,note=''){
 const r=db.collaborations.find(x=>x.id===id);
 if(!canReplyCreatorQuote(db,u,r))throw Error('仅负责运营可在议价期间提交达人回价');
 const amount=Number(value);if(!Number.isFinite(amount)||amount<=0)throw Error('达人回价需为大于 0 的金额');
 const at=new Date().toISOString();
 (r.creatorQuoteReplies??=[]).push({id:crypto.randomUUID(),round:clientQuoteHistory(r).length,amount,currency:r.currency||'CNY',note:String(note||'').trim(),by:u.id,at,versionId:r.proposalVersions?.at(-1)?.id});
 r.updatedAt=at;r.status='待 PM 反馈';
 (r.events??=[]).push({action:'creatorQuoteReply',by:u.id,at,status:r.status,reason:'达人回价：'+(r.currency||'CNY')+' '+amount});return r;
}

// Older creator-first proposals must still allow negotiation until the customer accepts.
function canResumeCustomerNegotiation(r){return Boolean(r?.proposalVersions&&r.status==='待客户确认'&&!r.orderId&&!isConfirmed(r)&&!customerAcceptanceFor(r));}
export function canRecordCustomerOffer(db,u,r){const latest=r&&clientQuoteHistory(r).at(-1);return Boolean(latest&&validClientQuote(r)&&canSetClientQuote(db,u,r)&&!r.orderId&&!isConfirmed(r)&&!customerAcceptanceFor(r)&&(r.status==='议价待客户确认'||canResumeCustomerNegotiation(r))&&!(r.customerOffers||[]).some(x=>x.quoteId===latest.id));}
export function canSubmitNegotiationQuote(db,u,r){return canSetClientQuote(db,u,r)&&!r.orderId&&!isConfirmed(r)&&!customerAcceptanceFor(r)&&(r.status==='待 PM 反馈'||canResumeCustomerNegotiation(r));}
export function submitNegotiationQuote(db,u,id,value,note=''){
 const r=db.collaborations.find(x=>x.id===id);
 if(!r||!canSubmitNegotiationQuote(db,u,r))throw Error('当前阶段不可对客报价，请等待客户或运营反馈');
 if(!(Number(value)>0))throw Error('请输入有效的对客报价');
 return setClientQuote(db,u,id,value,note);
}
export function recordCustomerOffer(db,u,id,value,note=''){
 const r=db.collaborations.find(x=>x.id===id);
 if(!canRecordCustomerOffer(db,u,r))throw Error('仅负责 PM 可在议价待客户确认时登记本轮客户还价');
 const amount=Number(value);if(!Number.isFinite(amount)||amount<=0)throw Error('客户还价需为大于 0 的金额');
 const latest=clientQuoteHistory(r).at(-1),at=new Date().toISOString();
 if(canResumeCustomerNegotiation(r))clearPackageAcceptance(r);
 r.clientQuotes??=clientQuoteHistory(r).map(x=>({...x}));
 (r.customerOffers??=[]).push({id:crypto.randomUUID(),quoteId:latest.id,round:latest.round,amount,currency:latest.currency,note:String(note||'').trim(),by:u.id,at});
 r.status='待运营议价';r.updatedAt=at;
 (r.events??=[]).push({action:'customerOffer',by:u.id,at,status:r.status,reason:'客户还价：'+latest.currency+' '+amount+(note?'；'+String(note):'')});return r;
}

// Explicit operator handoff; historical actors and accepted videos are immutable.
export function transferOperatorWork(db,u,{ids,toOwner,reason}){
 if(u.role!=='admin')throw Error('仅超级管理员可以交接业务');
 if(!USERS.some(u=>u.id===toOwner&&u.role==='operator')||!String(reason||'').trim())throw Error('请选择接手运营并填写交接原因');
 const records=[...db.collaborations,...(db.deliveryItems||[])],selected=(ids||[]).map(id=>records.find(r=>r.id===id));
 if(!selected.length||selected.some(r=>!r||stageOf(r)==='已结束'&&!(r.status==='不予提报'&&!r.rejectionAcknowledgedAt)||r.orderId&&!r.proposalId)||new Set(ids).size!==ids.length)throw Error('只能交接指定未结束提报或未验收视频');
 if(selected.some(r=>!db.campaigns.find(p=>p.id===r.campaignId)?.members.includes(toOwner)))throw Error('接手运营未加入项目');
 const at=new Date().toISOString();
 const assign=r=>{if(!r||r.ownerId===toOwner)return;(r.ownerHistory??=[]).push({from:r.ownerId,to:toOwner,by:u.id,at,reason:String(reason).trim()});r.ownerId=toOwner;};
 for(const r of selected)assign(r);
 // Promote the formal handoff to the package only when every video has the same owner.
 // Partial handoffs retain their per-video authority; accepted videos never move implicitly.
 for(const orderId of new Set(selected.map(r=>r.orderId).filter(Boolean))){
  const videos=(db.deliveryItems||[]).filter(v=>v.orderId===orderId);
  if(videos.length&&videos.every(v=>v.ownerId===toOwner)){const order=db.orders.find(o=>o.id===orderId);assign(order);assign(db.collaborations.find(r=>r.id===order?.proposalId));}
 }
 return selected.length;
}
export function correctOrderPricing(db,u,orderId,{cost,clientPrice,reason}){
 if(u.role!=='admin')throw Error('仅超级管理员可以纠错订单金额');required(String(reason||'').trim(),'纠错原因');
 const order=db.orders?.find(o=>o.id===orderId);if(!order)throw Error('订单不存在');
 const items=db.deliveryItems.filter(i=>i.orderId===orderId),pricing=orderPricing({...order.terms,total:cost},{clientPrice,currency:order.currency});
 if(items.length!==pricing.quantity)throw Error('视频数量与订单不一致');
 const before={pricing:structuredClone(order.pricing),total:order.total,clientPrice:order.clientPrice,items:items.map(i=>({id:i.id,final:i.final,clientPrice:i.clientPrice}))};
 allocateItems(items,pricing);Object.assign(order,{pricing,total:pricing.cost,clientPrice:pricing.clientPrice,margin:pricing.margin});
 const proposal=db.collaborations.find(r=>r.id===order.proposalId);if(proposal)proposal.effectivePricing=structuredClone(pricing);
 (order.priceCorrections??=[]).push({by:u.id,at:new Date().toISOString(),reason:String(reason).trim(),before,after:{pricing:structuredClone(pricing),items:items.map(i=>({id:i.id,final:i.final,clientPrice:i.clientPrice}))},businessDate:order.createdAt});return order;
}

// Keep the exported entrypoint for older clients, but never accept manual prices.
export function saveOrderSplit(db,u,id,side,amounts){
 throw Error('视频价格按合作总价和视频数量自动均分，不支持手工拆分');
}

export function pmHandoffResults(db,u){return db.campaigns.flatMap(p=>(p.assignmentHistory||[]).filter(h=>h.kind==='transfer'&&(u.role==='admin'||h.from===u.id||h.to===u.id)).map(h=>({projectId:p.id,from:h.from,to:h.to,by:h.by,at:h.at,reason:h.reason,ids:structuredClone(h.ids)})));}
