import {completeFixture,projectFixture} from './test-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.mjs';
const aj=M.USERS.find(x=>x.id==='pm1'),seven=M.USERS.find(x=>x.id==='pm2'),tia=M.USERS.find(x=>x.id==='a'),jennie=M.USERS.find(x=>x.id==='b'),admin=M.USERS.find(x=>x.role==='admin');
function setup(){const db=completeFixture();M.upgrade(db);const p=projectFixture(db,aj,{name:'Regional',client:'Test',requirements:'',members:['a','b']});return {db,p};}
const submit=(db,p,u,i=0,region='美国')=>M.submitCreator(db,u,db.creators[i].id,{campaignId:p.id,targetCountry:region,initial:550,rights:'video'});
test('routing is project + target region, independent of submitter; rule changes only affect new work',()=>{
 const {db,p}=setup();M.setRegionPm(db,admin,p.id,'美国',aj.id);
 const first=submit(db,p,tia),second=submit(db,p,jennie,1);assert.equal(first.reviewPmId,aj.id);assert.equal(second.reviewPmId,aj.id);
 assert.throws(()=>submit(db,p,tia,2,'英国'),/尚未配置/);
 M.setRegionPm(db,admin,p.id,'美国',seven.id);const third=submit(db,p,tia,2);
 assert.equal(first.reviewPmId,aj.id);assert.equal(third.reviewPmId,seven.id);
 assert(!M.allowedActions(db,aj,third).approve);assert(M.allowedActions(db,seven,third).approve);
 assert(M.canSetClientQuote(db,seven,third));assert(!M.canSetClientQuote(db,aj,third));
 assert(!M.visibleCoops(db,aj).some(x=>x.id===third.id));assert(M.projectsFor(db,seven).some(x=>x.id===p.id));
 const other=projectFixture(db,aj,{name:'Other',client:'Other',requirements:'',members:['a']});M.setRegionPm(db,admin,other.id,'美国',aj.id);
 assert.equal(submit(db,other,tia).reviewPmId,aj.id);
 assert.throws(()=>M.setRegionPm(db,aj,p.id,'美国',seven.id),/仅超级管理员/);
});
test('handoff transfers full package, PM reminders and permissions, preserving audits and rejecting stale previews',()=>{
 const {db,p}=setup();M.setRegionPm(db,admin,p.id,'美国',aj.id);const r=submit(db,p,tia);
 M.enablePackage(db,tia,r.id,{total:550,currency:'USD',items:[{platform:'Instagram',type:'Reel',quantity:2}],rights:'video'});
 M.updateCoop(db,aj,r.id,'approve',{clientQuote:1000});
 M.updateCoop(db,aj,r.id,'agree',{clientPrice:800});M.updateCoop(db,tia,r.id,'confirm',{final:550,rights:'video',date:'2026-11-01'});M.updateCoop(db,tia,r.id,'createOrder');
 const audit=JSON.stringify(r.events),item=db.deliveryItems[0];assert.equal(item.reviewPmId,aj.id);
 M.addFollowUp(db,aj,item.id,{type:'沟通',channel:'邮件',body:'follow up',communicatedAt:new Date().toISOString(),nextAt:'2026-11-01T10:00:00Z'});
 const input={projectId:p.id,region:'美国',fromPm:aj.id,toPm:seven.id,reason:'人员调整',ids:[r.id]};
 assert.throws(()=>M.transferRegionalWork(db,tia,input),/仅超级管理员/);
 assert.throws(()=>M.transferRegionalWork(db,admin,{...input,ids:['missing']}),/重新预览/);
 assert.equal(M.transferRegionalWork(db,admin,input),1);
 assert.equal(JSON.stringify(r.events),audit);assert.equal(db.orders[0].reviewPmId,seven.id);assert(db.deliveryItems.every(x=>x.reviewPmId===seven.id));assert.equal(db.tasks[0].ownerId,seven.id);
 M.updateCoop(db,tia,item.id,'preparation',{registrationEmail:'creator@example.com'});M.updateCoop(db,tia,item.id,'briefSent');M.updateCoop(db,tia,item.id,'scriptSubmit',{url:'https://example.com/script',description:'new'});
 assert.throws(()=>M.updateCoop(db,aj,item.id,'scriptSend'),/不允许/);M.updateCoop(db,seven,item.id,'scriptSend');
 assert.throws(()=>M.transferRegionalWork(db,admin,input),/重新预览/);
});
test('enabling routing preserves legacy assignment and closed work is excluded from handoff',()=>{
 const {db,p}=setup(),r=submit(db,p,tia);delete r.reviewPmId;delete r.targetCountry;
 M.setRegionPm(db,admin,p.id,'美国',seven.id);assert.equal(r.reviewPmId,aj.id);assert.equal(r.targetCountry,undefined);
 assert(M.regionalCandidates(db,admin,p.id,'',aj.id).includes(r));r.status='不予提报';r.rejectionAcknowledgedAt=new Date().toISOString();assert.equal(M.regionalCandidates(db,admin,p.id,'',aj.id).length,0);
});
