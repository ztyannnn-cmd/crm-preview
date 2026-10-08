const legacyStatuses=['待 PM 审核','待对客提报','已提报待客户反馈','待运营议价','待 PM 反馈','已反馈待客户确认','确认合作待补充信息','待发布','已发布待验收','已验收','不提报','不合作'];
const countries=['美国','英国','加拿大','澳大利亚','德国'];const platforms=['TikTok','YouTube','Instagram'];const names=['Mia','Alex','Luna','Nora','Oliver','Emma','Leo','Chloe','Noah','Sofia','Ethan','Ava','Liam','Isla','Mason','Ella','Lucas','Grace','Theo','Ruby'];const types=['Travels','Studio','Daily','Kitchen','Fitness'];
function seed(){return Array.from({length:100},(_,i)=>{const initial=3000+(i*700)%22000,status=i===0?'待运营议价':i===1?'确认合作待补充信息':i===2?'已提报待客户反馈':legacyStatuses[i%legacyStatuses.length];return {id:'creator-'+i,name:i<3?['Mia Travels','Alex Studio','Luna Daily'][i]:names[i%20]+' '+types[Math.floor(i/20)],handle:i<3?['@mia.travels','@alex.studio','@luna.daily'][i]:'@'+names[i%20].toLowerCase()+'.'+types[Math.floor(i/20)].toLowerCase()+'.'+(i+1),platform:platforms[i%3],country:countries[i%5],language:i%5===4?'德语':'英语',followers:25000+i*5300,views:15000+i*1900,er:(2+(i%40)/10).toFixed(1),initial:i===0?12000:i===1?10000:i===2?6500:initial,status,rights:'视频 1 条，品牌使用权 30 天',date:'2026-10-'+String(1+i%28).padStart(2,'0'),final:['待发布','已发布待验收','已验收'].includes(status)?initial-500:null,history:['待 PM 反馈','已反馈待客户确认','确认合作待补充信息','待发布','已发布待验收','已验收'].includes(status)?[{quote:i===1?9000:initial-500,rights:'视频 1 条，品牌使用权 30 天'}]:[],url:['已发布待验收','已验收'].includes(status)?'https://example.com/video/'+(i+1):'',distribution:''};});}

export const USERS=[{id:'pm1',name:'PM · 小王',role:'pm'},{id:'pm2',name:'PM · 小陈',role:'pm'},{id:'a',name:'运营 A · 小李',role:'operator'},{id:'b',name:'运营 B · 小张',role:'operator'},{id:'c',name:'运营 C · 小周',role:'operator'}];
USERS.push({id:'admin',name:'超级管理员',role:'admin'});
export const KEY='solbridge-crm-projects-v2';
export {countries,platforms};
export function migrate(old=seed()){
 const campaigns=[{id:'p1',name:'Aurora 新品推广',client:'Aurora',requirements:'生活方式与旅行类达人',pmId:'pm1',members:['a','b']},{id:'p2',name:'Nova 秋季推广',client:'Nova',requirements:'科技类达人',pmId:'pm1',members:['b','c']},{id:'p3',name:'Orbit 品牌推广',client:'Orbit',requirements:'英语地区达人',pmId:'pm2',members:['a','c']}];
 const pool=Array.isArray(old)&&old.length?old:seed();
 const creators=pool.map((r,i)=>({...r,id:r.id||'creator-'+i,createdBy:['a','b','c','pm1','pm2'][i%5]}));
 const collaborations=creators.map((r,i)=>{const p=campaigns[i%3];return {...r,id:'coop-'+i,creatorId:r.id,campaignId:p.id,ownerId:p.members[i%p.members.length],submittedAt:'2026-09-23T09:00:00.000Z',events:[]};});
 // Keep business history in collaboration records, not the shared creator profile.
 creators.forEach(r=>{for(const k of ['initial','status','rights','date','final','history','url','distribution'])delete r[k];});
 return {version:2,creators,campaigns,collaborations};
}
export const canProject=(p,u)=>u.role==='admin'||p.pmId===u.id||p.members.includes(u.id);
export const projectsFor=(db,u)=>db.campaigns.filter(p=>canProject(p,u));
export const visibleCoops=(db,u)=>db.collaborations.filter(c=>{const p=db.campaigns.find(p=>p.id===c.campaignId);return p&&canProject(p,u)&&(u.role==='admin'||p.pmId===u.id||c.ownerId===u.id);});
export const creatorResults=(db,u,q='')=>db.creators.filter(c=>q.trim()?(c.name+' '+c.handle+' '+(c.profile||'')).toLowerCase().includes(q.trim().toLowerCase()):u.role==='admin'||c.createdBy===u.id);
export function addProject(db,u,input){if(!['pm','admin'].includes(u.role))throw Error('只有 PM 可以新建项目');const p={id:crypto.randomUUID(),name:input.name.trim(),client:input.client.trim(),requirements:input.requirements.trim(),pmId:u.id,members:[...new Set(input.members)].filter(id=>USERS.some(u=>u.id===id&&u.role==='operator'))};if(!p.name||!p.client)throw Error('请填写项目名称和客户');db.campaigns.push(p);return p;}
export function submitCreator(db,u,creatorId,input){const p=db.campaigns.find(p=>p.id===input.campaignId);if(!p||!canProject(p,u))throw Error('你未加入该项目');if(!db.creators.some(c=>c.id===creatorId))throw Error('达人不存在');if(db.collaborations.some(c=>c.creatorId===creatorId&&c.campaignId===p.id))throw Error('该达人已在此项目中提报，请勿重复提交');if(!(input.initial>0)||!input.rights.trim())throw Error('请填写报价和权益');const c={id:crypto.randomUUID(),creatorId,campaignId:p.id,ownerId:u.id,initial:input.initial,rights:input.rights,reason:input.reason,status:'待 PM 审核',submittedAt:new Date().toISOString(),history:[],final:null,date:'',url:'',distribution:'',events:[]};c.flowVersion=3;c.updatedAt=c.submittedAt;db.collaborations.push(c);return c;}
export function margin(r){return Number.isFinite(r.clientPrice)&&Number.isFinite(r.final)?r.clientPrice-r.final:null;}
export function setMembers(db,u,id,members){const p=db.campaigns.find(p=>p.id===id);if(!p||!(u.role==='admin'||p.pmId===u.id))throw Error('无权管理成员');if(members.some(id=>!USERS.some(u=>u.id===id&&u.role==='operator')))throw Error('请选择有效运营');if(db.collaborations.some(c=>c.campaignId===id&&p.members.includes(c.ownerId)&&!members.includes(c.ownerId)))throw Error('该运营仍有合作订单，交接规则待确认，暂不可移除');p.members=[...new Set(members)];}

export const stages=['全部','提报审核','客户筛选','合作确认','脚本制作','视频制作','发布验收','已结束'];
const stageStates={
 '提报审核':['待 PM 审核','待运营补充'],
 '客户筛选':['待对客提报','待客户反馈'],
 '合作确认':['待达人确认','待运营议价','待 PM 反馈','议价待客户确认'],
 '脚本制作':['脚本待提交','脚本待 PM 初审','脚本待送客户','脚本待客户反馈','脚本待修改'],
 '视频制作':['视频待提交','视频待 PM 初审','视频待送客户','视频待客户反馈','视频待修改'],
 '发布验收':['待发布','待验收','待补充发布资料'],
 '已结束':['已完成','不予提报','客户不合作','达人不合作','合作取消']
};
export const statuses=Object.values(stageStates).flat();
export const stageOf=r=>Object.keys(stageStates).find(s=>stageStates[s].includes(r.status))||'已结束';
export function upgrade(db){
 let changed=false;
 const mapping={'已提报待客户反馈':'待客户反馈','已反馈待客户确认':'议价待客户确认','确认合作待补充信息':'待达人确认','已发布待验收':'待验收','已验收':'已完成','不提报':'不予提报','不合作':'客户不合作'};
 for(const r of db.collaborations){if(r.flowVersion===3)continue;changed=true;r.legacyStatus=r.status;r.legacyFlow=true;r.legacyConfirmed=['待发布','已发布待验收','已验收'].includes(r.status);r.status=mapping[r.status]||r.status;r.flowVersion=3;}
 return changed;
}
export const isConfirmed=r=>Boolean(r.confirmedAt||r.legacyConfirmed);
export function allowedActions(db,u,r){
 const p=db.campaigns.find(p=>p.id===r.campaignId);
 if(!p||!canProject(p,u)||!(u.role==='admin'||p.pmId===u.id||r.ownerId===u.id))return {};
 const pm=u.role==='admin'||p.pmId===u.id,op=u.role==='admin'||r.ownerId===u.id,s=r.status,open=stageOf(r)!=='已结束';
 const a={approve:pm&&s==='待 PM 审核',returnSubmission:pm&&s==='待 PM 审核',reject:pm&&s==='待 PM 审核',resubmit:op&&s==='待运营补充',sent:pm&&s==='待对客提报',agree:pm&&['待客户反馈','议价待客户确认'].includes(s),negotiate:pm&&['待客户反馈','议价待客户确认'].includes(s)&&(r.history||[]).length<3,decline:pm&&['待客户反馈','议价待客户确认'].includes(s),quote:op&&s==='待运营议价'&&(r.history||[]).length<3,propose:op&&s==='待达人确认'&&(r.history||[]).length<3,feedback:pm&&s==='待 PM 反馈',confirm:op&&s==='待达人确认',creatorDecline:op&&stageOf(r)==='合作确认',publish:op&&['待发布','待补充发布资料'].includes(s),accept:pm&&s==='待验收',returnPublish:pm&&s==='待验收',cancel:pm&&isConfirmed(r)&&open,price:pm&&isConfirmed(r)};
 for(const type of ['脚本','视频']){const key=type==='脚本'?'script':'video';a[key+'Submit']=op&&[type+'待提交',type+'待修改'].includes(s);a[key+'Approve']=pm&&s===type+'待 PM 初审';a[key+'Return']=pm&&[type+'待 PM 初审',type+'待客户反馈'].includes(s);a[key+'Send']=pm&&s===type+'待送客户';a[key+'Pass']=pm&&s===type+'待客户反馈';}
 return a;
}
const actionLabels={approve:'审核提报',resubmit:'补充并重新提报',sent:'标记对客提报',agree:'登记客户反馈',quote:'提交达人回价',feedback:'反馈客户并更新进度',confirm:'确认达人合作',scriptSubmit:'提交脚本',scriptApprove:'审核脚本',scriptSend:'标记脚本已送客户',scriptPass:'登记脚本客户反馈',videoSubmit:'提交视频',videoApprove:'审核视频',videoSend:'标记视频已送客户',videoPass:'登记视频客户反馈',publish:'提交发布资料',accept:'登记客户验收'};
export function nextStep(db,u,r){const a=allowedActions(db,u,r);for(const [action,label] of Object.entries(actionLabels))if(a[action])return {action,label};let label='等待 PM 处理';if(stageOf(r)==='已结束')label='订单已结束';else if(r.status==='待达人确认')label='等待运营确认达人合作';else if(r.status==='待运营议价')label='等待运营回价';else if(r.status==='待运营补充')label='等待运营补充提报';else if(/待提交|待修改/.test(r.status))label='等待运营'+r.status.replace('待','');else if(/待客户反馈|议价待客户确认/.test(r.status))label='等待客户反馈，由 PM 登记';else if(['待发布','待补充发布资料'].includes(r.status))label='等待运营提交发布资料';else if(r.status==='待验收')label='等待客户验收，由 PM 登记';return {action:null,label};}
export const isPending=(db,u,r)=>Boolean(nextStep(db,u,r).action);
export const inQueue=(db,u,r,queue)=>Object.keys(allowedActions(db,u,r)).length>0&&(queue==='all'||(queue==='mine'?isPending(db,u,r):stageOf(r)!=='已结束'&&!isPending(db,u,r)));
const positive=(v,label)=>{if(!Number.isFinite(v)||v<=0)throw Error('请填写有效的'+label);};
const required=(v,label)=>{if(!String(v||'').trim())throw Error('请填写'+label);};
const validURL=v=>{try{return ['http:','https:'].includes(new URL(v).protocol);}catch{return false;}};
export const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function updateCoop(db,u,id,action,data={}){
 const r=visibleCoops(db,u).find(r=>r.id===id);if(!r||!allowedActions(db,u,r)[action])throw Error('当前账号或状态不允许此操作');
 const c=structuredClone(r),at=new Date().toISOString(),reason=String(data.reason||'').trim();
 const requireReason=()=>required(reason,'原因或修改意见');
 if(['agree','price'].includes(action)){positive(data.clientPrice,'客户确认价格');c.clientPrice=data.clientPrice;}
 if(action==='agree')c.status='待达人确认';
 if(action==='approve')c.status='待对客提报';
 if(action==='sent')c.status='待客户反馈';
 if(action==='returnSubmission'){requireReason();c.submissionFeedback=reason;c.status='待运营补充';}
 if(action==='resubmit'){positive(data.initial,'报价');required(data.rights,'权益');c.initial=data.initial;c.rights=data.rights;c.reason=data.reason;c.status='待 PM 审核';}
 if(action==='negotiate'){positive(data.target,'议价目标');required(data.rights,'权益');c.target=data.target;c.targetRights=data.rights;c.status='待运营议价';}
 if(['quote','propose'].includes(action)){positive(data.quote,'达人回价');required(data.rights,'权益');(c.history??=[]).push({quote:data.quote,rights:data.rights,at,operator:u.id});c.status='待 PM 反馈';}
 if(action==='feedback')c.status='议价待客户确认';
 if(action==='confirm'){positive(data.final,'最终报价');required(data.rights,'最终权益');if(!validDate(data.date))throw Error('请填写有效发布日期');const agreed=c.history?.at(-1);if(agreed&&(data.final!==agreed.quote||data.rights.trim()!==String(agreed.rights||c.rights).trim()))throw Error('最终条件与客户确认的回价不一致，请先提交条件变更');if(!agreed&&(data.final!==c.initial||data.rights.trim()!==c.rights.trim()))throw Error('条件有变化，请先提交条件变更');Object.assign(c,{final:data.final,rights:data.rights,date:data.date,confirmedAt:at,status:'脚本待提交'});}
 for(const [key,type] of [['script','脚本'],['video','视频']]){
  if(action===key+'Submit'){if(!validURL(data.url))throw Error('请填写有效的 HTTP 或 HTTPS 交付链接');required(data.description,'交付说明');const list=(c.deliverables??={})[key]??=[];list.push({version:list.length+1,url:data.url,description:data.description,submittedBy:u.id,submittedAt:at,reviews:[]});c.status=type+'待 PM 初审';}
  if([key+'Approve',key+'Return',key+'Send',key+'Pass'].includes(action)){const latest=c.deliverables?.[key]?.at(-1);if(!latest)throw Error('缺少提交版本');if(action===key+'Return')requireReason();const source=c.status===type+'待客户反馈'?'客户反馈':'PM 初审';latest.reviews.push({action,source,by:u.id,at,reason});if(action===key+'Approve')c.status=type+'待送客户';if(action===key+'Return')c.status=type+'待修改';if(action===key+'Send')c.status=type+'待客户反馈';if(action===key+'Pass'){latest.approvedAt=at;c.status=key==='script'?'视频待提交':'待发布';}}
 }
 if(action==='publish'){if(!validURL(data.url)||data.distribution&&!validURL(data.distribution))throw Error('请填写有效发布或分发链接');if(!c.legacyFlow&&!c.deliverables?.video?.at(-1)?.approvedAt)throw Error('视频尚未获客户通过');Object.assign(c,{url:data.url,distribution:data.distribution||'',publishedAt:c.publishedAt||at,status:'待验收'});}
 if(action==='returnPublish'){requireReason();c.publishFeedback=reason;c.status='待补充发布资料';}
 if(action==='accept'){c.status='已完成';c.acceptedAt=at;}
 const closed={reject:'不予提报',decline:'客户不合作',creatorDecline:'达人不合作',cancel:'合作取消'};
 if(closed[action]){requireReason();c.status=closed[action];c.closeReason=reason;c.closedAt=at;}
 c.updatedAt=at;(c.events??=[]).push({action,by:u.id,at,status:c.status,reason,...(action==='resubmit'?{previousSubmission:{initial:r.initial,rights:r.rights,reason:r.reason}}:{})});Object.assign(r,c);return r;
}
export function updatedInfo(r){const dates=[r.updatedAt,...(r.events||[]).map(e=>e.at)].filter(v=>Number.isFinite(Date.parse(v)));return dates.length?{at:dates.sort((a,b)=>Date.parse(b)-Date.parse(a))[0],label:'最近更新'}:{at:r.submittedAt||'',label:'提报时间'};}
export function metricMatches(r,key){return key==='all'||key==='confirmed'&&isConfirmed(r)||key==='effective'&&isConfirmed(r)&&r.status!=='合作取消'||key==='production'&&['脚本制作','视频制作'].includes(stageOf(r))||key==='published'&&Boolean(r.url)||key==='accepted'&&r.status==='已完成'||key==='negotiating'&&['待运营议价','待 PM 反馈','议价待客户确认'].includes(r.status)||key==='priced'&&margin(r)!==null;}
export function summary(db,u,rows){const known=rows.filter(r=>margin(r)!==null);return {total:rows.length,pending:rows.filter(r=>isPending(db,u,r)).length,...Object.fromEntries(['confirmed','effective','production','published','accepted','negotiating'].map(k=>[k,rows.filter(r=>metricMatches(r,k)).length])),margin:known.length?known.reduce((n,r)=>n+margin(r),0):null,known:known.length,missing:rows.length-known.length};}
export const projectMetrics=summary;
export const sortOrders=(db,u,rows)=>[...rows].sort((a,b)=>Number(isPending(db,u,b))-Number(isPending(db,u,a))||(Date.parse(updatedInfo(b).at)||0)-(Date.parse(updatedInfo(a).at)||0)||a.id.localeCompare(b.id));
export function selectOrders(db,u,f={},source=visibleCoops(db,u)){
 const {q='',platform='全部',country='全部',owner='全部',campaignFilter='全部',stage='全部',status='全部',queue='all',metric='all',sort='pending'}=f,visible=new Set(visibleCoops(db,u).map(r=>r.id));
 const rows=source.filter(r=>{const c=db.creators.find(c=>c.id===r.creatorId);return visible.has(r.id)&&c&&(c.name+' '+c.handle+' '+(c.profile||'')).toLowerCase().includes(q.trim().toLowerCase())&&(platform==='全部'||c.platform===platform)&&(country==='全部'||c.country===country)&&(owner==='全部'||r.ownerId===owner)&&(campaignFilter==='全部'||r.campaignId===campaignFilter)&&(stage==='全部'||stageOf(r)===stage)&&(status==='全部'||r.status===status)&&inQueue(db,u,r,queue)&&(metric==='pending'?isPending(db,u,r):metricMatches(r,metric));});
 return sort==='recent'?[...rows].sort((a,b)=>(Date.parse(updatedInfo(b).at)||0)-(Date.parse(updatedInfo(a).at)||0)||a.id.localeCompare(b.id)):sortOrders(db,u,rows);
}
export function calendarOrders(rows,month){return {scheduled:rows.filter(r=>validDate(r.date)&&r.date.slice(0,7)===month),unscheduled:rows.filter(r=>isConfirmed(r)&&!validDate(r.date)&&r.status!=='合作取消')};}
export const canNote=(db,u,r)=>visibleCoops(db,u).some(c=>c.id===r.id)&&(u.role==='admin'||r.ownerId===u.id||db.campaigns.find(p=>p.id===r.campaignId)?.pmId===u.id);
export function addNote(db,u,id,body){const r=db.collaborations.find(r=>r.id===id);if(!r||!canNote(db,u,r))throw Error('无权添加该订单的跟进备注');body=String(body??'').trim();if(!body||body.length>1000)throw Error('请填写 1–1000 字的跟进备注');const note={id:crypto.randomUUID(),authorId:u.id,body,createdAt:new Date().toISOString()};(r.notes??=[]).push(note);r.updatedAt=note.createdAt;(r.events??=[]).push({action:'note',by:u.id,at:note.createdAt,status:r.status});return note;}
export const savedViewsFor=(db,u)=>(db.savedViews||[]).filter(v=>v.userId===u.id);
export function saveView(db,u,name,config={},id){name=String(name??'').trim();if(!name||name.length>40)throw Error('视图名称需为 1–40 字');const owned=savedViewsFor(db,u);if(owned.some(v=>v.name===name&&v.id!==id))throw Error('已有同名视图');if(id){const view=owned.find(v=>v.id===id);if(!view)throw Error('无权修改此视图');view.name=name;return view;}const clean={};for(const key of ['q','platform','country','owner','campaignFilter','stage','status','queue','sort','view','showPrices'])if(['string','boolean'].includes(typeof config[key]))clean[key]=config[key];const view={id:crypto.randomUUID(),userId:u.id,name,config:clean};(db.savedViews??=[]).push(view);return view;}
export function deleteView(db,u,id){if(!savedViewsFor(db,u).some(v=>v.id===id))throw Error('无权删除此视图');db.savedViews=db.savedViews.filter(v=>v.id!==id);}
