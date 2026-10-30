import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createFollowupPreviewData} from './followup-preview-fixtures.mjs';
import {
 USERS,KEY,upgrade,visibleCoops,proposalStatus,nextStep,clientQuoteHistory,
 customerAcceptanceFor,isProposalOverdue,createPackageOrder,updateCoop
} from './model.mjs';

function checkStorageInIsolatedProcess(script){
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{
  cwd:new URL('.',import.meta.url),encoding:'utf8'
 });
 assert.equal(result.status,0,result.stderr||result.stdout);
}

test('follow-up demo never accesses browser storage and keeps business/view writes separate',()=>{
 checkStorageInIsolatedProcess(`
  import assert from 'node:assert/strict';
  globalThis.location={search:'?demo=followup'};
  for(const name of ['localStorage','sessionStorage'])Object.defineProperty(globalThis,name,{get(){throw Error('Real browser storage was accessed');}});
  const {isFollowupDemo,businessStorage,viewStorage}=await import('./preview-store.mjs');
  assert.equal(isFollowupDemo,true);
  assert.equal(businessStorage.getItem('${KEY}'),null);
  businessStorage.setItem('${KEY}','synthetic');
  viewStorage.setItem('${KEY}','view');
  assert.equal(businessStorage.getItem('${KEY}'),'synthetic');
  assert.equal(viewStorage.getItem('${KEY}'),'view');
  businessStorage.setItem(42,0);
  assert.equal(businessStorage.getItem('42'),'0');
  businessStorage.removeItem('${KEY}');
  assert.equal(businessStorage.getItem('${KEY}'),null);
  assert.equal(viewStorage.getItem('${KEY}'),'view');
 `);
});

test('normal mode preserves existing storage objects without reading or writing saved data',()=>{
 checkStorageInIsolatedProcess(`
  import assert from 'node:assert/strict';
  globalThis.location={search:'?demo=other'};
  const untouched={getItem(){throw Error('Unexpected read');},setItem(){throw Error('Unexpected write');},removeItem(){throw Error('Unexpected removal');}};
  Object.defineProperty(globalThis,'localStorage',{value:untouched});
  Object.defineProperty(globalThis,'sessionStorage',{value:{...untouched}});
  const {isFollowupDemo,businessStorage,viewStorage}=await import('./preview-store.mjs');
  assert.equal(isFollowupDemo,false);
  assert.equal(businessStorage,globalThis.localStorage);
  assert.equal(viewStorage,globalThis.sessionStorage);
 `);
});

test('storage selection can be imported in Node without a location',()=>{
 checkStorageInIsolatedProcess(`
  import assert from 'node:assert/strict';
  delete globalThis.location;
  Object.defineProperty(globalThis,'localStorage',{value:undefined});
  Object.defineProperty(globalThis,'sessionStorage',{value:undefined});
  const {isFollowupDemo,businessStorage,viewStorage}=await import('./preview-store.mjs');
  assert.equal(isFollowupDemo,false);
  assert.equal(businessStorage,undefined);
  assert.equal(viewStorage,undefined);
 `);
});

test('blocked browser-storage getters do not reject module loading or hide the business error',()=>{
 checkStorageInIsolatedProcess(`
  import assert from 'node:assert/strict';
  globalThis.location={search:''};
  const existing={getItem(){return 'saved';}};
  Object.defineProperty(globalThis,'localStorage',{value:existing,configurable:true});
  Object.defineProperty(globalThis,'sessionStorage',{get(){throw Error('View storage blocked');}});
  const optional=await import('./preview-store.mjs?blocked-view');
  assert.equal(optional.businessStorage,existing);
  assert.equal(optional.viewStorage,undefined);
  assert.equal(optional.businessStorage.getItem('key'),'saved');
  const denied=new Error('Business storage blocked');
  Object.defineProperty(globalThis,'localStorage',{get(){throw denied;}});
  const blocked=await import('./preview-store.mjs?blocked-business');
  assert.equal(blocked.viewStorage,undefined);
  for(const method of ['getItem','setItem','removeItem'])assert.throws(()=>blocked.businessStorage[method]('key','value'),error=>error===denied);
 `);
});

test('synthetic follow-up records cover the eight review scenarios with valid role actions',()=>{
 const db=createFollowupPreviewData(),pm=USERS.find(u=>u.id==='pm1'),operator=USERS.find(u=>u.id==='a');
 const rows=Object.fromEntries(db.collaborations.map(record=>[record.previewScenario,record]));
 assert.equal(db.creators.length,8);
 assert.equal(db.campaigns.length,3);
 assert.equal(db.collaborations.length,8);
 assert.equal(visibleCoops(db,pm).length,8);
 assert.equal(visibleCoops(db,operator).length,8);
 assert.equal(visibleCoops(db,USERS.find(u=>u.id==='b')).length,0);
 for(const profile of db.creators){
  assert.match(profile.name,/模拟/);
  assert.match(profile.contact,/@example\.test$/);
  assert.match(profile.accounts[0].url,/^https:\/\/example\.test\//);
  assert.ok(profile.country&&profile.language&&profile.creatorType&&profile.displayCode);
 }
 assert.equal(nextStep(db,pm,rows.review).action,'approve');
 assert.equal(nextStep(db,pm,rows.draft).action,'negotiationQuote');
 assert.equal(clientQuoteHistory(rows.draft).length,0);
 assert.ok(rows.draft.clientQuoteDraft.amount>0);
 assert.equal(nextStep(db,pm,rows.customer).action,'customerOffer');
 assert.equal(clientQuoteHistory(rows.customer).length,1);
 assert.equal(nextStep(db,operator,rows.negotiate).action,'creatorQuoteReply');
 assert.equal(nextStep(db,operator,rows.returned).action,'acknowledgeRejection');
 assert.equal(proposalStatus(rows.returned),'待运营处理');
 assert.equal(nextStep(db,operator,rows.ready).action,'createOrder');
 assert.ok(customerAcceptanceFor(rows.ready));
 assert.equal(proposalStatus(rows.ordered),'订单已创建');
 assert.equal(proposalStatus(rows.closed),'客户不合作');
 assert.equal(nextStep(db,pm,rows.closed).action,null);
 assert.equal(db.orders.length,1);
 assert.equal(db.deliveryItems.length,2);
 assert.equal(db.collaborations.filter(r=>isProposalOverdue(r)).length,2);
 assert.equal(upgrade(db),false);
});

test('review fixtures remain operable through existing model actions and independent across loads',()=>{
 const db=createFollowupPreviewData(),other=createFollowupPreviewData();
 const pm=USERS.find(u=>u.id==='pm1'),operator=USERS.find(u=>u.id==='a');
 const review=db.collaborations.find(r=>r.previewScenario==='review');
 const ready=db.collaborations.find(r=>r.previewScenario==='ready');
 updateCoop(db,pm,review.id,'approve',{clientQuote:2400});
 assert.equal(review.status,'待 PM 反馈');
 const order=createPackageOrder(db,operator,ready.id);
 assert.equal(ready.orderId,order.id);
 assert.equal(createPackageOrder(db,operator,ready.id).id,order.id);
 assert.equal(db.orders.length,2);
 assert.equal(other.orders.length,1);
 assert.equal(other.collaborations.find(r=>r.previewScenario==='review').status,'待 PM 审核');
 assert.equal(other.collaborations.find(r=>r.previewScenario==='ready').orderId,undefined);
});
