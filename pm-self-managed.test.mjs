import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as M from './model.mjs';
import * as components from './design-system/components.mjs';
import {completeFixture,projectFixture} from './test-fixtures.mjs';
const [pm,otherPm,op]=M.USERS;
const terms={total:100.01,currency:'USD',items:[{platform:'YouTube',type:'专属视频',quantity:2}],rights:'30 days'};
function setup(){const db=completeFixture();M.upgrade(db);const p=projectFixture(db,pm,{name:'PM self test',client:'Synthetic',requirements:'',members:[op.id]});return {db,p,creator:db.creators[0],submit:(extra={})=>M.submitPackage(db,pm,db.creators[0].id,{...terms,campaignId:p.id,clientQuote:150.01,...extra})};}
function order(f){const r=f.submit();M.updateCoop(f.db,pm,r.id,'customerAccept',{clientPrice:150.01});return {r,order:M.updateCoop(f.db,pm,r.id,'confirmAndCreateOrder')};}
test('PM submission records its first formal customer quote atomically and keeps quotation distinct from acceptance',()=>{
 const f=setup();M.saveProposalDraft(f.db,pm,f.creator.id,f.p.id,{total:100.01,clientQuote:''});assert.equal(f.db.proposalDrafts[0].ownerId,pm.id);
 const r=f.submit({quoteNote:'首轮方案'}),quotes=M.clientQuoteHistory(r);
 assert.equal(M.proposalStatus(r),'待客户报价');assert.equal(r.reviewPmId,pm.id);assert.equal(r.selfManagedPmId,pm.id);
 assert.equal(r.submissionApprovedAt,undefined);assert.equal(r.reviewHistory,undefined);assert.equal(r.clientQuoteDraft,undefined);
 assert.equal(quotes.length,1);assert.equal(quotes[0].round,1);assert.equal(quotes[0].amount,150.01);assert.equal(quotes[0].currency,'USD');assert.equal(quotes[0].by,pm.id);assert.equal(quotes[0].note,'首轮方案');assert.ok(quotes[0].id&&quotes[0].at);
 assert.equal(f.db.proposalDrafts.length,0);assert.equal(r.events.filter(event=>event.action==='clientQuote').length,1);
 assert.equal(M.customerAcceptanceFor(r),null);assert.equal(M.canRecordCustomerOffer(f.db,pm,r),true);assert.equal(M.allowedActions(f.db,pm,r).customerAccept,true);
 const before=structuredClone(f.db);
 assert.throws(()=>M.updateCoop(f.db,pm,r.id,'approve',{clientQuote:150.01}));assert.throws(()=>M.updateCoop(f.db,pm,r.id,'confirmAndCreateOrder'));
 assert.throws(()=>M.submitNegotiationQuote(f.db,pm,r.id,150.01),/不可对客报价/);
 assert.throws(()=>f.submit(),/在途提报/);
 assert.deepEqual(f.db,before);assert.equal(M.clientQuoteHistory(r).length,1);
});
test('PM owns negotiation, automatically allocated order and every video step through final acceptance',()=>{
 const f=setup(),r=f.submit({clientQuote:160});M.recordCustomerOffer(f.db,pm,r.id,150.01);M.addCreatorQuoteReply(f.db,pm,r.id,100.01);M.submitNegotiationQuote(f.db,pm,r.id,150.01);assert.deepEqual(M.clientQuoteHistory(r).map(q=>q.round),[1,2]);M.updateCoop(f.db,pm,r.id,'customerAccept',{clientPrice:150.01});
 const o=M.updateCoop(f.db,pm,r.id,'confirmAndCreateOrder');assert.equal(o.selfManagedPmId,pm.id);assert.equal(M.updateCoop(f.db,pm,r.id,'confirmAndCreateOrder').id,o.id);assert.equal(f.db.orders.length,1);assert.deepEqual(f.db.deliveryItems.map(item=>item.final),[50.01,50]);assert.deepEqual(f.db.deliveryItems.map(item=>item.clientPrice),[75.01,75]);
 let db=JSON.parse(JSON.stringify(f.db));const [v,sibling]=db.deliveryItems;assert.equal(v.selfManagedPmId,pm.id);
 M.updateCoop(db,pm,v.id,'deliveryBrief',{briefUrl:'https://example.test/brief'});M.updateCoop(db,pm,v.id,'preparation',{registrationEmail:'creator@example.test'});M.updateCoop(db,pm,v.id,'preparationPm',{inviteCode:'TEST'});M.updateCoop(db,pm,v.id,'briefSent');const unchanged=JSON.stringify(sibling);
 M.updateCoop(db,pm,v.id,'scriptDraft',{url:'https://example.test/script'});M.updateCoop(db,pm,v.id,'scriptSubmit',{url:'https://example.test/script'});M.updateCoop(db,pm,v.id,'scriptSend');M.updateCoop(db,pm,v.id,'scriptReturn');M.updateCoop(db,pm,v.id,'scriptLink',{url:'https://example.test/script2'});M.updateCoop(db,pm,v.id,'scriptRevisionDone');M.updateCoop(db,pm,v.id,'scriptSend');M.updateCoop(db,pm,v.id,'scriptPass');
 M.updateCoop(db,pm,v.id,'videoSubmit',{url:'https://example.test/video'});M.updateCoop(db,pm,v.id,'videoSend');M.updateCoop(db,pm,v.id,'videoReturn');M.updateCoop(db,pm,v.id,'videoSubmit',{url:'https://example.test/video2'});M.updateCoop(db,pm,v.id,'videoSend');M.updateCoop(db,pm,v.id,'videoPass');M.updateCoop(db,pm,v.id,'publish',{publicationLinks:Object.fromEntries(v.publications.map(p=>[p.id,'https://example.test/published']))});M.updateCoop(db,pm,v.id,'returnPublish');M.updateCoop(db,pm,v.id,'publish',{publicationLinks:Object.fromEntries(v.publications.map(p=>[p.id,'https://example.test/published2']))});M.updateCoop(db,pm,v.id,'accept');
 assert.equal(v.status,'已完成');assert.equal(db.collaborations.find(x=>x.id===r.id).status,'已创建订单');assert.equal(JSON.stringify(sibling),unchanged);assert.ok(Object.values(M.allowedActions(db,pm,v)).every(a=>!a));assert.throws(()=>M.updateCoop(db,pm,v.id,'accept'));
});
test('self-management does not grant PM the operator permissions on ordinary or other PM records',()=>{
 const f=setup(),{r}=order(f),v=f.db.deliveryItems[0];for(const u of [otherPm,op]){assert.throws(()=>M.updateCoop(f.db,u,r.id,'createOrder'));assert.throws(()=>M.updateCoop(f.db,u,v.id,'briefSent'));assert.throws(()=>M.updateCoop(f.db,u,v.id,'scriptSubmit',{url:'https://example.test/evil'}));}
 const g=setup(),normal=M.submitPackage(g.db,op,g.creator.id,{...terms,campaignId:g.p.id,clientQuote:999});assert.equal(normal.selfManagedPmId,undefined);assert.equal(M.clientQuoteHistory(normal).length,0);M.updateCoop(g.db,pm,normal.id,'approve',{clientQuote:150.01});assert.equal(normal.clientQuoteDraft.amount,150.01);assert.equal(M.clientQuoteHistory(normal).length,0);M.submitNegotiationQuote(g.db,pm,normal.id,150.01);M.updateCoop(g.db,pm,normal.id,'customerAccept',{clientPrice:150.01});assert.throws(()=>M.updateCoop(g.db,pm,normal.id,'confirmAndCreateOrder'));M.updateCoop(g.db,op,normal.id,'confirmAndCreateOrder');const ordinary=g.db.deliveryItems[0];assert.throws(()=>M.updateCoop(g.db,pm,ordinary.id,'briefSent'));assert.throws(()=>M.updateCoop(g.db,pm,ordinary.id,'scriptSubmit',{url:'https://example.test/evil'}));
});
test('PM submission rejects missing or invalid customer quotes without writing a proposal, quote or consuming its draft',()=>{
 for(const clientQuote of [undefined,null,'','  ',0,-1,NaN,Infinity]){
  const f=setup();M.saveProposalDraft(f.db,pm,f.creator.id,f.p.id,{total:100.01,clientQuote:''});const before=structuredClone(f.db);
  assert.throws(()=>f.submit({clientQuote}),/对客报价/);assert.deepEqual(f.db,before);
 }
 const f=setup(),before=structuredClone(f.db);
 assert.throws(()=>M.submitPackage(f.db,pm,f.creator.id,{...terms,campaignId:f.p.id}),/对客报价/);assert.deepEqual(f.db,before);
});
test('invalid PM order creation stays atomic and legacy manual splits do not override automatic prices',()=>{
 const f=setup(),r=f.submit();M.updateCoop(f.db,pm,r.id,'customerAccept',{clientPrice:150.01});
 r.priceSplits={cost:{versionId:r.proposalVersions[0].id,total:100.01,amounts:[1,1]}};
 const legacy=structuredClone(r.priceSplits),snapshot=JSON.stringify(f.db);
 assert.throws(()=>M.updateCoop(f.db,pm,r.id,'confirmAndCreateOrder',{final:0}));assert.equal(JSON.stringify(f.db),snapshot);
 M.updateCoop(f.db,pm,r.id,'confirmAndCreateOrder');assert.equal(f.db.orders.length,1);
 assert.deepEqual(f.db.deliveryItems.map(item=>item.final),[50.01,50]);assert.deepEqual(f.db.deliveryItems.map(item=>item.clientPrice),[75.01,75]);assert.deepEqual(r.priceSplits,legacy);
});
test('PM scheme revisions remain exempt from proposal audit but require fresh confirmation',()=>{
 const f=setup(),r=f.submit();M.updateCoop(f.db,pm,r.id,'customerAccept',{clientPrice:150.01});M.revisePackage(f.db,pm,r.id,{...terms,total:110,reason:'Scope changed'});assert.equal(r.status,'待 PM 反馈');assert.equal(M.customerAcceptanceFor(r),null);assert.equal(M.allowedActions(f.db,pm,r).approve,false);assert.throws(()=>M.updateCoop(f.db,pm,r.id,'confirmAndCreateOrder'));
});
test('PM submission and video UI expose own quotation and delivery actions',()=>{
 const f=setup();let source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^document\.getElementById\('account'\).*\n/m,'');const root={querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 const ctx=vm.createContext({...M,...components,console,crypto,URL,structuredClone,setTimeout:()=>1,clearTimeout(){},businessStorage:{getItem:()=>JSON.stringify(f.db),setItem(){}},viewStorage:undefined,isFollowupDemo:false,document:{getElementById:id=>id==='crm-preview'?root:{}}});vm.runInContext(source+"\nuser=USERS[0];globalThis.formHTML=submissionForm(db.creators[0].id);globalThis.setDb=(value)=>db=value;",ctx);
 assert.match(ctx.formHTML,/对客报价/);assert.doesNotMatch(ctx.formHTML,/对客报价草稿/);assert.match(ctx.formHTML,/免提报审核/);assert.doesNotMatch(ctx.formHTML,/name="reviewPmId"/);
 order(f);ctx.setDb(f.db);const html=vm.runInContext('deliveryBriefPanel(db.deliveryItems[0])+deliveryStagePanels(db.deliveryItems[0])',ctx);assert.match(html,/briefSent/);assert.match(html,/deliveryBrief/);
});
