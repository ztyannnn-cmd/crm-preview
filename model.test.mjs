import {completeFixture,projectFixture} from './test-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.mjs';
const [pm,pm2,a,b,c,admin]=M.USERS;
const dbInit=()=>{const db=completeFixture();M.upgrade(db);return db;};
function fixture(){const db=dbInit(),p=projectFixture(db,pm,{name:'Test',client:'Client',requirements:'Travel',members:['a','b']});const r=M.submitCreator(db,a,db.creators[0].id,{campaignId:p.id,initial:1000,rights:'one video',reason:'fit'});const act=(u,k,d={})=>M.updateCoop(db,u,r.id,k,d);return {db,p,r,act};}
function approve(f){f.act(pm,'approve');f.act(pm,'agree',{clientPrice:1500});}
function confirm(f){approve(f);f.act(a,'confirm',{final:1000,rights:'one video',date:'2026-10-20'});}
function delivery(f,k){f.act(a,k+'Submit',{url:'https://example.com/'+k,description:'V1'});assert(f.r.status.endsWith('待送客户'));assert.throws(()=>f.act(pm,k+'Approve'));f.act(pm,k+'Send');f.act(pm,k+'Pass');}

test('creator search, project membership, scoped visibility and duplicate submission',()=>{const f=fixture();assert.equal(f.db.creators.length,100);assert.equal(M.creatorResults(f.db,a).length,20);assert(M.creatorResults(f.db,a,'Alex Studio').some(x=>x.createdBy==='b'));assert.equal(M.creatorResults(f.db,a,'   ').length,20);assert.equal(M.creatorResults(f.db,admin).length,100);assert(M.projectsFor(f.db,a).includes(f.p));assert(!M.projectsFor(f.db,c).includes(f.p));assert(!M.visibleCoops(f.db,b).includes(f.r));assert(!M.visibleCoops(f.db,pm2).includes(f.r));assert(M.visibleCoops(f.db,admin).includes(f.r));assert.throws(()=>M.submitCreator(f.db,b,f.r.creatorId,{campaignId:f.p.id,initial:1000,rights:'one'}),/已在此项目/);assert.throws(()=>M.submitCreator(f.db,c,f.db.creators[1].id,{campaignId:f.p.id,initial:1000,rights:'one'}),/加入项目/);});
test('complete lifecycle requires creator confirmation and both script/video reviews',()=>{const f=fixture();approve(f);assert.equal(f.r.status,'待达人确认');assert(!M.isConfirmed(f.r));assert.equal(M.summary(f.db,pm,[f.r]).confirmed,0);assert.throws(()=>f.act(pm,'confirm',{final:1000,date:'2026-10-20',rights:'one video'}));f.act(a,'confirm',{final:1000,date:'2026-10-20',rights:'one video'});assert(M.isConfirmed(f.r));assert.equal(f.r.status,'脚本待提交');assert.throws(()=>f.act(a,'videoSubmit',{url:'https://example.com',description:'no'}));assert.throws(()=>f.act(a,'publish',{url:'https://example.com'}));delivery(f,'script');assert.equal(f.r.status,'视频待提交');delivery(f,'video');f.act(a,'publish',{url:'https://example.com/published'});assert.equal(f.r.status,'待验收');f.act(pm,'accept');assert.equal(f.r.status,'已完成');assert.equal(M.margin(f.r),500);assert(f.r.confirmedAt&&f.r.acceptedAt);assert.equal(M.summary(f.db,pm,[f.r]).accepted,1);});
test('retired submission controls are unavailable and feedback survives migration into review',()=>{const f=fixture();for(const action of ['returnSubmission','resubmit','sent','finalConfirm']){assert(!M.allowedActions(f.db,pm,f.r)[action]);assert.throws(()=>f.act(pm,action,{reason:'补充权益'}));}f.r.status='待运营补充';f.r.submissionFeedback='补充权益';f.r.events.push({action:'returnSubmission',by:pm.id,at:'2026-10-01T00:00:00Z',reason:'补充权益'});M.upgrade(f.db);assert.equal(f.r.status,'待 PM 审核');assert.equal(f.r.submissionFeedback,'补充权益');assert.equal(f.r.events.at(-1).reason,'补充权益');assert.equal(M.nextStep(f.db,pm,f.r).action,'approve');assert.equal(M.isPending(f.db,a,f.r),false);});
test('content revisions use customer sync and remarks without new review logs',()=>{const f=fixture();confirm(f);for(const k of ['script','video']){for(let i=0;i<4;i++){f.act(a,k+'Submit',{url:'https://example.com/'+i});assert.throws(()=>f.act(pm,k+'Approve'));assert.throws(()=>f.act(pm,k+'Return'));assert.throws(()=>f.act(pm,k+'Pass'));f.act(pm,k+'Send');f.act(pm,k+'Remark',{remark:'修改进度 '+i});f.act(a,k+'Remark',{remark:'正在沟通'});f.act(pm,k+'Return');}assert.equal(f.r.deliverables[k].length,4);assert(f.r.deliverables[k].every(v=>v.reviews.length===0));assert.equal(f.r.deliveryRemarks[k].length,8);assert.equal(f.r.deliveryRemarks[k][0].by,pm.id);delivery(f,k);}assert.equal(f.r.history.length,0);});
test('negotiation can exceed three rounds and changed terms require PM feedback',()=>{const f=fixture();approve(f);assert.throws(()=>f.act(a,'confirm',{final:900,rights:'one video',date:'2026-10-20'}),/条件/);f.act(a,'propose',{quote:900,rights:'one video'});f.act(pm,'feedback');for(let i=1;i<3;i++){f.act(pm,'negotiate',{target:800,rights:'one video'});f.act(a,'quote',{quote:900-i*50,rights:'one video'});f.act(pm,'feedback');}assert.equal(f.r.history.length,3);assert.equal(M.allowedActions(f.db,pm,f.r).negotiate,true);f.act(pm,'agree',{clientPrice:1200});assert.equal(M.allowedActions(f.db,a,f.r).propose,true);f.act(a,'confirm',{final:800,rights:'one video',date:'2026-10-20'});assert.equal(M.margin(f.r),400);});
test('publication returns, cancellation and all close branches retain reasons',()=>{const f=fixture();confirm(f);delivery(f,'script');delivery(f,'video');f.act(a,'publish',{url:'https://example.com/first'});f.act(pm,'returnPublish',{reason:'补充分发链接'});assert.equal(f.r.status,'待补充发布资料');f.act(a,'publish',{url:'https://example.com/first',distribution:'https://example.com/dist'});f.act(pm,'cancel',{reason:'项目取消'});const metrics=M.summary(f.db,pm,[f.r]);assert.equal(metrics.confirmed,1);assert.equal(metrics.effective,0);assert.equal(metrics.published,1);assert.equal(M.inQueue(f.db,pm,f.r,'others'),false);for(const [action,status] of [['reject','不予提报'],['decline','客户不合作'],['creatorDecline','达人不合作']]){const g=fixture();if(action!=='reject')g.act(pm,'approve');if(action==='creatorDecline')g.act(pm,'agree',{clientPrice:1200});assert.throws(()=>g.act(action==='creatorDecline'?a:pm,action,{}));g.act(action==='creatorDecline'?a:pm,action,{reason:'reason'});assert.equal(g.r.status,status);assert.equal(g.r.closeReason,'reason');}});
test('migration is idempotent and preserves IDs, links, quotes, original statuses and timestamps',()=>{const db=completeFixture();const original=structuredClone(db.collaborations);assert(M.upgrade(db));assert.equal(M.upgrade(db),false);for(let i=0;i<original.length;i++){const r=db.collaborations[i],old=original[i];for(const key of ['id','creatorId','campaignId','initial','final','history','date','url','distribution','events'])assert.deepEqual(r[key],old[key]);assert.equal(r.legacyStatus,old.status);assert.equal(r.confirmedAt,undefined);assert.equal(r.deliverables,undefined);assert.equal(M.updatedInfo(r).label,'提报时间');if(old.status==='确认合作待补充信息'){assert.equal(r.status,'待达人确认');assert(!M.isConfirmed(r));}}const r=db.collaborations.find(r=>r.status==='待发布');M.updateCoop(db,admin,r.id,'publish',{url:'https://example.com/legacy'});M.updateCoop(db,admin,r.id,'accept');assert.equal(r.status,'已完成');});
test('every progress maps to a stage with role-specific actions and no unauthorized access',()=>{const f=fixture();for(const status of M.statuses){const r={...f.r,status};assert(M.stages.includes(M.stageOf(r)));assert.deepEqual(M.allowedActions(f.db,b,r),{});assert.deepEqual(M.allowedActions(f.db,pm2,r),{});assert.equal(M.isPending(f.db,b,r),false);}confirm(f);const before=JSON.stringify(f.r);assert.throws(()=>f.act(a,'scriptSubmit',{url:'javascript:alert(1)',description:'x'}));assert.equal(JSON.stringify(f.r),before);assert.throws(()=>f.act(pm,'scriptSubmit',{url:'https://example.com',description:'x'}));});
test('notes are permission checked, bounded, append-only and do not create pending work',()=>{const f=fixture(),before=f.r.status,pending=M.nextStep(f.db,pm,f.r);assert.throws(()=>M.addNote(f.db,b,f.r.id,'secret'));assert.throws(()=>M.addNote(f.db,a,f.r.id,' '));assert.throws(()=>M.addNote(f.db,a,f.r.id,'x'.repeat(1001)));M.addNote(f.db,a,f.r.id,'运营反馈');M.addNote(f.db,pm,f.r.id,'PM 回复');M.addNote(f.db,admin,f.r.id,'管理员');assert.equal(f.r.notes.length,3);assert.equal(f.r.status,before);assert.deepEqual(M.nextStep(f.db,pm,f.r),pending);assert.equal(f.r.notes[0].authorId,a.id);assert(f.r.updatedAt);});
test('saved views isolate accounts and preserve complete query state',()=>{const f=fixture(),config={q:'Mia',stage:'脚本制作',status:'脚本待修改',queue:'others',sort:'recent',view:'calendar',showPrices:true,evil:123};const v=M.saveView(f.db,a,'本周',config);assert.equal(M.savedViewsFor(f.db,b).length,0);assert.equal(v.config.status,config.status);assert.equal(v.config.evil,undefined);assert.throws(()=>M.saveView(f.db,a,'本周',{}));assert.throws(()=>M.saveView(f.db,b,'改名',{},v.id));assert.throws(()=>M.deleteView(f.db,b,v.id));M.saveView(f.db,a,'新版',{},v.id);assert.equal(v.name,'新版');M.deleteView(f.db,a,v.id);assert.equal(M.savedViewsFor(f.db,a).length,0);});
test('shared selector, calendars and metrics respect visible rows and business filters',()=>{const f=fixture();confirm(f);const rows=M.selectOrders(f.db,a,{campaignFilter:f.p.id,queue:'mine',stage:'脚本制作',status:'脚本待提交'});assert.deepEqual(rows,[f.r]);assert.equal(M.selectOrders(f.db,b,{queue:'all'},[f.r]).length,0);assert.equal(M.selectOrders(f.db,a,{q:'NO_MATCH'}).length,0);assert.equal(M.calendarOrders(rows,'2026-10').scheduled.length,1);assert.equal(M.calendarOrders(rows,'2026-11').scheduled.length,0);assert.equal(M.calendarOrders([{...f.r,date:''}],'2026-10').unscheduled.length,1);assert.equal(M.validDate('2026-02-30'),false);const metrics=M.summary(f.db,pm,[f.r]);assert.equal(metrics.production,1);assert.equal(metrics.confirmed,1);assert.equal(metrics.accepted,0);});
test('member removal and cross-project records remain independent',()=>{const f=fixture();M.setMembers(f.db,pm,f.p.id,['a','b','c']);M.setMembers(f.db,pm,f.p.id,['a']);assert.throws(()=>M.setMembers(f.db,pm,f.p.id,[]),/交接/);assert.throws(()=>M.setMembers(f.db,pm2,f.p.id,['a']));assert.throws(()=>projectFixture(f.db,a,{name:'x',client:'x',requirements:'',members:[]}));const other=f.db.collaborations.find(r=>r.creatorId===f.r.creatorId);const old=JSON.stringify(other);confirm(f);M.updateCoop(f.db,admin,f.r.id,'price',{clientPrice:1800,reason:'录入纠错'});assert.equal(M.margin(f.r),800);assert.equal(JSON.stringify(other),old);assert.equal(f.db.creators[0].clientPrice,undefined);});
test('legacy timestamps and pending-first sorting do not fabricate changes',()=>{const db=dbInit(),r=db.collaborations[0],before=JSON.stringify(r);assert.deepEqual(M.updatedInfo(r),{at:r.submittedAt,label:'提报时间'});assert.equal(JSON.stringify(r),before);const recent={...r,id:'recent',status:'待发布',events:[{at:'2026-10-05T00:00:00Z'}]},pending={...r,id:'pending',status:'待 PM 审核'};assert.equal(M.sortOrders(db,pm,[recent,pending])[0].id,'pending');assert.equal(M.updatedInfo(recent).at,'2026-10-05T00:00:00Z');});


test('sample project rename updates existing names without changing links or custom projects',()=>{
 const db=dbInit();
 assert.equal(db.campaigns.find(p=>p.id==='p1').name,'Tripo');
 assert.equal(db.campaigns.find(p=>p.id==='p2').name,'Flora');
 const first=db.campaigns.find(p=>p.id==='p1'),second=db.campaigns.find(p=>p.id==='p2');
 first.name='Aurora 新品推广';first.client='Aurora';second.name='Nova 秋季推广';second.client='Nova';
 const records=JSON.stringify(db.collaborations),members=JSON.stringify(first.members);
 assert.equal(M.upgrade(db),true);assert.equal(first.name,'Tripo');assert.equal(first.client,'Tripo');
 assert.equal(second.name,'Flora');assert.equal(second.client,'Flora');
 assert.equal(JSON.stringify(db.collaborations),records);assert.equal(JSON.stringify(first.members),members);
 assert.equal(M.upgrade(db),false);
 first.name='Custom campaign';first.client='Custom client';M.upgrade(db);
 assert.equal(first.name,'Custom campaign');assert.equal(first.client,'Custom client');
});


test('simulation switcher exposes five renamed views without losing historical identity',()=>{
 assert.deepEqual(M.VIEW_USERS.map(u=>u.name),['超级管理员','PM · AJ','PM · seven','运营 · Tia','运营 · Jennie']);
 assert.deepEqual(M.VIEW_USERS.map(u=>u.id),['admin','pm1','pm2','a','b']);
 assert.equal(M.USERS.find(u=>u.id==='c').name,'运营 C · 小周');
});

test('proposal progress contains only the five requested stages and delivery stages retain their mappings',()=>{
 assert.deepEqual(M.proposalStages,['全部','提报审核','谈价中','合作确认','已完成','已取消']);
 const expected={'提报审核':['待 PM 审核'],'待议价':['待运营议价','待 PM 反馈','议价待客户确认'],'合作确认':['待达人确认'],'合作确认完成':['合作确认完成','已创建订单'],'已结束':['不予提报','客户不合作','达人不合作']};
 for(const [stage,states] of Object.entries(expected))for(const status of states){assert.equal(M.stageOf({status}),stage);assert(M.statuses.includes(status));}
 for(const removed of ['待运营补充','待对客提报','待客户审核','待客户反馈','待运营还价','待客户最终确认'])assert(!M.statuses.includes(removed));
 for(const [status,stage] of [['脚本待修改','脚本制作'],['视频待客户反馈','视频制作'],['待补充发布资料','发布验收'],['已完成','已结束'],['合作取消','已结束']])assert.equal(M.stageOf({status}),stage);
});

test('canonical progress migration preserves business history and remains idempotent',()=>{
 const db=dbInit(),base=db.collaborations[0],mapping={'待运营补充':'待 PM 审核','待对客提报':'待 PM 反馈','待客户审核':'议价待客户确认','待客户反馈':'议价待客户确认','待运营还价':'待运营议价','待客户最终确认':'待达人确认'};
 db.collaborations=Object.entries(mapping).map(([status],i)=>({...base,id:'migration-'+i,proposalCode:undefined,status,proposalFlowVersion:undefined,events:[{action:'historical',by:a.id,at:'2026-10-01T00:00:00Z',status}],submissionFeedback:'历史反馈',history:[{quote:900,rights:'old'}],customerOffers:[{amount:800}],creatorQuoteReplies:[{amount:850}]}));
 const history=db.collaborations.map(r=>JSON.stringify({events:r.events,history:r.history,customerOffers:r.customerOffers,creatorQuoteReplies:r.creatorQuoteReplies}));
 db.savedViews=[{id:'negotiation-view',config:{stage:'谈价中',q:'creator',queue:'mine'}}];
 assert.equal(M.upgrade(db),true);
 assert.deepEqual(db.savedViews[0].config,{stage:'待议价',q:'creator',queue:'mine'});
 Object.values(mapping).forEach((status,i)=>{const r=db.collaborations[i];assert.equal(r.status,status);assert.equal(r.submissionFeedback,'历史反馈');assert.equal(JSON.stringify({events:r.events,history:r.history,customerOffers:r.customerOffers,creatorQuoteReplies:r.creatorQuoteReplies}),history[i]);});
 const before=JSON.stringify(db);assert.equal(M.upgrade(db),false);assert.equal(JSON.stringify(db),before);
});

test('proposal stay uses exact twelve-hour boundary and never resets for notes or same-status edits',()=>{
 const start=Date.parse('2026-10-12T00:00:00Z'),r={status:'待 PM 审核',submittedAt:new Date(start).toISOString(),events:[]};
 assert.equal(M.proposalStayHours(r,start+12*3600000),12);assert.equal(M.isProposalOverdue(r,start+12*3600000),false);assert.equal(M.isProposalOverdue(r,start+12*3600000+1),true);
 r.updatedAt=new Date(start+11*3600000).toISOString();r.events=[{action:'note',status:r.status,at:r.updatedAt},{action:'editCustomerProposal',status:r.status,at:r.updatedAt},{action:'clientQuote',status:r.status,at:r.updatedAt}];
 assert.equal(M.proposalStayHours(r,start+13*3600000),13);assert.equal(M.proposalStayHours(r,start-3600000),0);
 assert.equal(M.proposalStayHours(r,NaN),null);assert.equal(M.isProposalOverdue(r,NaN),false);
});

test('proposal stay tracks the most recent reentry into the specific progress with legacy aliases',()=>{
 const at=h=>new Date(Date.parse('2026-10-12T00:00:00Z')+h*3600000).toISOString(),r={status:'待 PM 反馈',submittedAt:at(0),events:[
  {action:'approve',status:'待对客提报',at:at(1)},
  {action:'clientQuote',status:'待客户审核',at:at(2)},
  {action:'note',status:'待客户审核',at:at(3)},
  {action:'customerOffer',status:'待运营还价',at:at(4)},
  {action:'creatorQuoteReply',status:'待 PM 反馈',at:at(5)},
  {action:'editCustomerProposal',status:'待 PM 反馈',at:at(6)}]};
 assert.equal(M.proposalStayHours(r,Date.parse(at(18))),13);
 r.status='议价待客户确认';r.events.push({action:'clientQuote',status:'议价待客户确认',at:at(8)},{action:'clientQuote',status:'议价待客户确认',at:at(10)},{action:'note',status:'议价待客户确认',at:at(19)});
 assert.equal(M.proposalStayHours(r,Date.parse(at(20))),12);assert.equal(M.isProposalOverdue(r,Date.parse(at(20))),false);
 r.status='待 PM 审核';r.events.push({action:'reject',status:'不予提报',at:at(21)},{action:'reopenSubmission',status:'待 PM 审核',at:at(22)});
 assert.equal(M.proposalStayHours(r,Date.parse(at(24))),2);
});

test('proposal stay uses only reliable fallback evidence and excludes completed proposals',()=>{
 const now=Date.parse('2026-10-13T00:00:00Z'),at='2026-10-12T06:00:00Z';
 assert.equal(M.proposalStayHours({status:'待 PM 反馈',submittedAt:at,updatedAt:at},now),null);
 assert.equal(M.proposalStayHours({status:'待 PM 反馈',updatedAt:at,events:[{action:'note',status:'待 PM 反馈',at}]},now),null);
 assert.equal(M.proposalStayHours({status:'待 PM 反馈',submissionApprovedAt:at},now),18);
 assert.equal(M.proposalStayHours({status:'待运营还价',customerOffers:[{at}]},now),18);
 assert.equal(M.proposalStayHours({status:'待达人确认',customerAcceptedAt:at},now),18);
 assert.equal(M.proposalStayHours({status:'待 PM 审核',submittedAt:'invalid'},now),null);
 assert.equal(M.proposalStayHours({status:'待运营议价',submittedAt:at,events:[{action:'customerOffer',status:'待运营议价',at:'invalid'}]},now),null);
 for(const status of ['不予提报','客户不合作','达人不合作','已创建订单','订单已创建','已完成','合作取消']){const r={status,submittedAt:at};assert.equal(M.proposalStayHours(r,now),null);assert.equal(M.isProposalOverdue(r,now),false);}
 assert.equal(M.proposalStayHours({status:'待 PM 审核',submittedAt:at,orderId:'order'},now),null);
 assert.equal(M.proposalStayHours({status:'待 PM 审核',submittedAt:at,proposalId:'parent'},now),null);
});

test('overdue proposals remain visible across their allowed views independently of task ownership',t=>{
 const now=Date.parse('2026-10-13T00:00:00Z');t.mock.method(Date,'now',()=>now);
 const f=fixture();f.r.submittedAt='2026-10-12T10:00:00Z';
 assert.equal(M.isPending(f.db,a,f.r),false);assert.equal(M.inQueue(f.db,a,f.r,'overdue'),true);assert.equal(M.inQueue(f.db,pm,f.r,'overdue'),true);assert.equal(M.inQueue(f.db,admin,f.r,'overdue'),true);
 assert.equal(M.inQueue(f.db,b,f.r,'overdue'),false);assert.equal(M.inQueue(f.db,pm2,f.r,'overdue'),false);
 assert.deepEqual(M.selectOrders(f.db,a,{campaignFilter:f.p.id,queue:'overdue'}),[f.r]);
 f.r.events.push({action:'approve',status:'待 PM 反馈',at:'2026-10-12T23:00:00Z'});f.r.status='待 PM 反馈';
 assert.equal(M.inQueue(f.db,a,f.r,'overdue'),false);assert.equal(M.inQueue(f.db,pm,f.r,'overdue'),false);
 f.db.tasks=[{id:'old',objectId:f.r.id,ownerId:a.id,status:'open',dueAt:'2026-10-01T00:00:00Z'}];
 assert.equal(M.inQueue(f.db,a,f.r,'overdue'),false);
 for(const status of ['不予提报','已创建订单']){f.r.status=status;assert.equal(M.inQueue(f.db,a,f.r,'overdue'),false);}
});

test('video delivery keeps its personal reminder overdue rules after proposal timing is introduced',t=>{
 const now=Date.parse('2026-10-13T00:00:00Z');t.mock.method(Date,'now',()=>now);
 const f=fixture();confirm(f);f.r.submittedAt='2026-10-01T00:00:00Z';
 assert.equal(M.inQueue(f.db,a,f.r,'overdue'),false);
 f.db.tasks=[{id:'reminder',objectId:f.r.id,ownerId:a.id,status:'open',dueAt:'2026-10-12T10:00:00Z'}];
 assert.equal(M.inQueue(f.db,a,f.r,'overdue'),true);assert.equal(M.inQueue(f.db,pm,f.r,'overdue'),false);
 f.db.tasks[0].status='done';assert.equal(M.inQueue(f.db,a,f.r,'overdue'),false);
});


test('live script revisions reuse the document with role checks and independent link updates',()=>{
 const f=fixture();confirm(f);f.act(a,'scriptSubmit',{url:'https://example.com/doc'});
 f.act(pm,'scriptSend');f.act(pm,'scriptReturn');
 assert.throws(()=>f.act(pm,'scriptRevisionDone'));assert.throws(()=>f.act(b,'scriptRevisionDone'));
 const before=JSON.stringify(f.r);assert.throws(()=>f.act(a,'scriptLink',{url:'javascript:alert(1)'}));assert.equal(JSON.stringify(f.r),before);
 f.act(a,'scriptLink',{url:'https://example.com/new-doc'});assert.equal(f.r.status,'脚本待修改');
 for(let i=0;i<2;i++){
  f.act(a,'scriptRevisionDone');assert.equal(f.r.status,'脚本待送客户');assert.equal(f.r.deliverables.script.length,1);
  assert.equal(f.r.deliverables.script[0].url,'https://example.com/new-doc');
  assert.throws(()=>f.act(a,'scriptRevisionDone'));f.act(pm,'scriptSend');
  f.act(a,'scriptLink',{url:'https://example.com/new-doc'});assert.equal(f.r.status,'脚本待客户反馈');assert.ok(f.r.scriptLinkUpdatedAt);
  if(i===0)f.act(pm,'scriptReturn');else f.act(pm,'scriptPass');
 }
 assert.equal(f.r.status,'视频待提交');
 assert.equal(f.r.events.filter(e=>e.action==='scriptRevisionDone').length,2);
});

test('V061 former operator can read handed-off videos without receiving their performance',()=>{
 const db=completeFixture(),p=projectFixture(db,pm,{name:'History',client:'Test',requirements:'',members:['a','b']});
 const r=M.submitCreator(db,a,db.creators[0].id,{campaignId:p.id,initial:1000,rights:'video'});M.updateCoop(db,pm,r.id,'approve');M.updateCoop(db,pm,r.id,'agree',{clientPrice:1500});M.updateCoop(db,a,r.id,'confirm',{final:1000,rights:'video',date:'2026-10-20'});
 M.transferOperatorWork(db,admin,{ids:[r.id],toOwner:'b',reason:'运营交接'});assert(M.visibleCoops(db,a).some(v=>v.id===r.id));assert.deepEqual(M.allowedActions(db,a,r),{});assert.equal(M.summary(db,a,[r]).margin, null);assert.equal(M.summary(db,b,[r]).margin,500);assert.equal(r.submittedBy,'a');assert.equal(r.ownerHistory[0].from,'a');
});
