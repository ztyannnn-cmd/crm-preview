// Synthetic review records only. No profile, customer or saved browser data is read.
import {
 USERS,CREATOR_RESET_VERSION,upgrade,addProject,submitPackage,updateCoop,
 submitNegotiationQuote,recordCustomerOffer,createPackageOrder
} from './model.mjs';

export function createFollowupPreviewData(){
 const pm=USERS.find(u=>u.id==='pm1'),operator=USERS.find(u=>u.id==='a');
 const db={
  version:2,creatorResetVersion:CREATOR_RESET_VERSION,creators:[],campaigns:[],
  collaborations:[],orders:[],deliveryItems:[],proposalDrafts:[],tasks:[],
  followUps:[],savedViews:[],previewKind:'followup-isolated'
 };
 const projects=[
  ['演示 · Tripo 秋季创作计划','模拟客户 · Tripo','英语地区创作者，展示 3D 创作流程'],
  ['演示 · Flora 产品体验','模拟客户 · Flora','生活方式与科技内容，展示日常使用场景'],
  ['演示 · Orbit 品牌合作','模拟客户 · Orbit','旅行与户外内容，覆盖英语和德语地区']
 ].map(([name,client,requirements])=>addProject(db,pm,{name,client,requirements,members:[operator.id]}));
 const samples=[
  {slug:'northlight',name:'Northlight Studio',country:'美国',language:'英语',creatorType:'创意设计',platform:'YouTube',followers:128000,views:42000,project:0,cost:1600,quote:2400,state:'review',hours:26},
  {slug:'olive',name:'Olive Everyday',country:'英国',language:'英语',creatorType:'生活方式',platform:'Instagram',followers:86000,views:31000,project:1,cost:850,quote:1300,state:'draft',hours:4},
  {slug:'pixel',name:'Pixel Workshop',country:'加拿大',language:'英语',creatorType:'科技测评',platform:'YouTube',followers:216000,views:74000,project:0,cost:2200,quote:3200,state:'customer',hours:18},
  {slug:'milo',name:'Milo Makes',country:'美国',language:'英语',creatorType:'创意设计',platform:'TikTok',followers:174000,views:52000,project:0,cost:900,quote:1500,state:'negotiate',hours:6},
  {slug:'sage',name:'Sage & City',country:'澳大利亚',language:'英语',creatorType:'生活方式',platform:'Instagram',followers:64000,views:18000,project:1,cost:700,quote:1100,state:'returned',hours:2},
  {slug:'lena',name:'Lena Outdoors',country:'德国',language:'德语',creatorType:'旅行户外',platform:'YouTube',followers:152000,views:46000,project:2,cost:1800,quote:2600,state:'ready',hours:9},
  {slug:'atlas',name:'Atlas in Motion',country:'英国',language:'英语',creatorType:'旅行户外',platform:'TikTok',followers:310000,views:118000,project:2,cost:2400,quote:3600,state:'ordered',hours:48},
  {slug:'noon',name:'Noon Notes',country:'美国',language:'英语',creatorType:'科技测评',platform:'Instagram',followers:97000,views:26000,project:1,cost:1000,quote:1600,state:'closed',hours:72}
 ];
 const createdAt=Date.now();
 for(const [index,sample] of samples.entries()){
  const id='followup-demo-creator-'+sample.slug;
  const account={id:id+'-account',platform:sample.platform,handle:'@demo.'+sample.slug,url:'https://example.test/creators/'+sample.slug,followers:sample.followers,views:sample.views,updatedAt:new Date(createdAt-86400000).toISOString()};
  db.creators.push({
   id,name:sample.name+' · 模拟',createdBy:operator.id,
   country:sample.country,language:sample.language,creatorType:sample.creatorType,
   contact:sample.slug+'@example.test',platform:sample.platform,handle:account.handle,
   profile:account.url,followers:sample.followers,views:sample.views,er:(3.2+index*.3).toFixed(1),
   accounts:[account]
  });
  submitPackage(db,operator,id,{
   campaignId:projects[sample.project].id,reviewPmId:pm.id,targetCountry:sample.country,
   total:sample.cost,currency:'USD',rights:'品牌可用于自有社媒 30 天',
   reason:'独立演示样例：内容方向与项目受众匹配，用于评审提报跟进交互。',
   cooperationNotes:'合成数据，仅供前端评审；不代表真实达人或客户。',
   items:[{platform:sample.platform,type:sample.platform==='YouTube'?'专属视频':sample.platform==='Instagram'?'Reel':'短视频',quantity:index===6?2:1,publicationPlatforms:[sample.platform]}]
  });
 }
 for(const [index,sample] of samples.entries()){
  // submitPackage uses an atomic copy, so retrieve each current record afterwards.
  const record=db.collaborations.find(r=>r.creatorId==='followup-demo-creator-'+sample.slug);
  const act=(user,action,data={})=>updateCoop(db,user,record.id,action,data);
  record.previewScenario=sample.state;
  record.date=new Date(createdAt+(7+index)*86400000).toISOString().slice(0,10);
  if(sample.state==='returned'){
   act(pm,'reject',{reason:'请补充近期同类内容案例，并说明品牌露出形式。'});
  }else if(sample.state!=='review'){
   act(pm,'approve',{clientQuote:sample.quote,quoteNote:'模拟报价草稿，正式提交后才进入客户反馈。'});
   if(sample.state!=='draft'){
    submitNegotiationQuote(db,pm,record.id,sample.quote,'模拟正式报价，已提交本轮合作方案。');
    if(sample.state==='negotiate'){
     recordCustomerOffer(db,pm,record.id,1200,'客户希望将本轮预算调整至 USD 1,200，请运营沟通达人。');
    }
    if(['ready','ordered'].includes(sample.state)){
     act(pm,'customerAccept',{clientPrice:sample.quote,reason:'模拟客户接受当前方案与报价。'});
     act(operator,'confirm',{final:sample.cost,rights:record.rights,date:record.date});
     if(sample.state==='ordered')createPackageOrder(db,operator,record.id);
    }
    if(sample.state==='closed'){
     act(pm,'decline',{reason:'模拟客户调整本次投放方向，本轮合作结束。'});
    }
   }
  }
  // Keep model-created histories and acceptance relationships consistent while
  // giving reviewers meaningful recent-update / 12-hour-stay examples.
  shiftDates(record,-sample.hours*3600000);
  for(const order of db.orders.filter(o=>o.proposalId===record.id))shiftDates(order,-sample.hours*3600000);
  for(const item of db.deliveryItems.filter(v=>v.proposalId===record.id))shiftDates(item,-sample.hours*3600000);
 }
 upgrade(db);
 return db;
}

function shiftDates(value,offset){
 if(!value||typeof value!=='object')return;
 for(const key of Object.keys(value)){
  const current=value[key];
  if(typeof current==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(current)&&Number.isFinite(Date.parse(current)))value[key]=new Date(Date.parse(current)+offset).toISOString();
  else if(current&&typeof current==='object')shiftDates(current,offset);
 }
}
