import {completeFixture,projectFixture} from './test-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.mjs';
const [pm,,op,other]=M.USERS;
const terms={total:550,currency:'USD',rights:'品牌使用 30 天',items:[{platform:'Instagram',type:'Reel',quantity:2,publicationPlatforms:['YouTube']},{platform:'YouTube',type:'专属视频',quantity:1}]};
function setup(){const db=completeFixture();M.upgrade(db);const p=projectFixture(db,pm,{name:'Package',client:'Client',requirements:'',members:[op.id,other.id]});const r=M.submitCreator(db,op,db.creators[0].id,{campaignId:p.id,initial:550,rights:terms.rights,reason:''});M.enablePackage(db,op,r.id,terms);return {db,r,act:(u,a,d={})=>M.updateCoop(db,u,r.id,a,d)};}
function confirm(f){f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:800});f.act(op,'confirm',{final:550,rights:terms.rights,date:'2026-11-01'});}
test('Package same-version acceptance completes directly and creates exactly one order with three independent items',()=>{
 const f=setup();assert.throws(()=>f.act(op,'createOrder'));confirm(f);assert.equal(f.r.status,'合作确认完成');assert.equal(M.isConfirmed(f.r),true);assert.throws(()=>f.act(op,'finalConfirm'));assert.throws(()=>f.act(pm,'finalConfirm'));assert.equal(f.r.proposalVersions[0].confirmations[0].by,pm.id);assert.equal(f.r.proposalVersions[0].confirmations[0].at,f.r.customerAcceptedAt);const order=f.act(op,'createOrder');assert.equal(f.db.orders.length,1);assert.equal(f.db.deliveryItems.length,3);assert.equal(order.total,550);assert.equal(order.currency,'USD');assert.equal(f.act(op,'createOrder').id,order.id);assert.throws(()=>f.act(other,'createOrder'));
 const [first,second]=f.db.deliveryItems;M.updateCoop(f.db,op,first.id,'preparation',{registrationEmail:'creator@example.com'});M.updateCoop(f.db,op,first.id,'briefSent');const before=JSON.stringify(second);
 for(const key of ['script','video']){M.updateCoop(f.db,op,first.id,key+'Submit',{url:'https://example.com/'+key,description:'V1'});assert.throws(()=>M.updateCoop(f.db,op,first.id,key+'Approve'));for(const action of ['Send','Pass'])M.updateCoop(f.db,pm,first.id,key+action);}
 assert.equal(first.publications.length,2);assert.throws(()=>M.updateCoop(f.db,op,first.id,'publish',{url:'https://example.com/published'}));M.updateCoop(f.db,op,first.id,'publish',{publicationLinks:Object.fromEntries(first.publications.map(p=>[p.id,'https://example.com/'+p.platform]))});M.updateCoop(f.db,pm,first.id,'accept');assert.equal(JSON.stringify(second),before);assert.equal(second.status,'待填写客户 Brief');assert.deepEqual(M.orderProgress(f.db,order.id),{total:3,scripts:1,videos:1,published:1,accepted:1});assert.throws(()=>M.updateCoop(f.db,other,second.id,'scriptSubmit',{url:'https://example.com/x',description:'x'}));
 M.addNote(f.db,op,second.id,'已催稿');assert.equal(second.status,'待填写客户 Brief');assert.equal(second.notes.length,1);assert.equal(f.r.notes,undefined);
});
test('Package changes preserve old terms, clear approvals and allow later rounds',()=>{
 const f=setup();confirm(f);const old=JSON.stringify(f.r.proposalVersions[0]);
 for(let i=0;i<3;i++)f.act(op,'packageRevision',{...terms,total:600+i,reason:'调整范围'});
 assert.equal(JSON.stringify(f.r.proposalVersions[0]),old);assert.equal(f.r.proposalVersions.length,4);assert.equal(f.r.creatorVersionId,undefined);assert.equal(f.r.status,'待 PM 审核');assert.throws(()=>f.act(pm,'finalConfirm'));f.act(op,'packageRevision',{...terms,reason:'第四轮'});assert.equal(f.r.proposalVersions.length,5);assert.equal(f.db.orders,undefined);
});
test('invalid Package terms do not alter records and legacy records remain readable',()=>{
 const f=setup(),before=JSON.stringify(f.r);assert.throws(()=>f.act(op,'packageRevision',{...terms,items:[{platform:'Instagram',quantity:-1,type:'Reel'}],reason:'invalid'}));assert.equal(JSON.stringify(f.r),before);const context=M.deliveryContext(f.db);assert(!context.collaborations.some(x=>x.id===f.r.id));assert(context.collaborations.some(x=>x.legacyConfirmed));
});

test('account filters use the same platform account, prevent duplicate identity and preserve CreatorID',()=>{
 const f=setup(),c=f.db.creators[0],id=c.id;M.saveCreatorProfile(f.db,op,id,{name:'Two platforms',country:'美国',contact:'public@example.com',accounts:[{platform:'Instagram',handle:'@small',url:'https://instagram.com/small',followers:1000},{platform:'TikTok',handle:'@large',url:'https://tiktok.com/@large',followers:100000}]});assert.equal(c.id,id);assert.equal(M.matchesAccount(c,'Instagram',50000),false);assert.equal(M.matchesAccount(c,'TikTok',50000),true);assert(M.creatorResults(f.db,op,'@large').some(x=>x.id===id));assert.throws(()=>M.saveCreatorProfile(f.db,other,id,{accounts:[]}));
});
test('drafts, preparation and followups never advance approval; reminders survive serialization',()=>{
 const f=setup();confirm(f);const order=f.act(op,'createOrder'),item=f.db.deliveryItems[0];M.updateCoop(f.db,op,item.id,'briefSent');const before=item.status;
 M.updateCoop(f.db,op,item.id,'preparation',{registrationEmail:'creator@example.com'});M.updateCoop(f.db,op,item.id,'scriptDraft',{description:'Not ready'});assert.equal(item.status,before);assert.equal(item.deliverables.script.length,0);
 M.updateCoop(f.db,op,item.id,'preparation',{registrationEmail:'public@example.com'});M.updateCoop(f.db,pm,item.id,'preparationPm',{inviteCode:'ABC123',inviteLink:'https://example.com/invite',briefSent:true});assert.equal(item.status,before);assert.equal(order.preparation.briefSent,true);assert.equal(item.preparation,undefined);
 M.addFollowUp(f.db,op,item.id,{channel:'邮件',communicatedAt:'2026-10-09T12:00:00',body:'催稿',nextAt:'2026-10-08T12:00:00'});assert.equal(item.status,before);assert.equal(f.db.tasks.length,1);
 const restored=JSON.parse(JSON.stringify(f.db));assert.equal(M.inQueue(M.deliveryContext(restored),op,restored.deliveryItems[0],'overdue'),true);M.updateReminder(restored,op,restored.tasks[0].id,'complete');assert.equal(M.inQueue(M.deliveryContext(restored),op,restored.deliveryItems[0],'overdue'),false);assert.equal(restored.deliveryItems[0].status,before);
});
test('repeat proposals keep the existing in-flight guard and historical currency totals stay separate',()=>{
 const f=setup();assert.throws(()=>M.submitCreator(f.db,op,f.r.creatorId,{campaignId:f.r.campaignId,initial:100,rights:'x'}));assert.throws(()=>M.submitCreator(f.db,op,f.r.creatorId,{campaignId:f.r.campaignId,initial:100,rights:'x',independent:true}),/在途提报/);const next={...f.r,id:'historical-record'};
 const stats=M.summary(f.db,op,[{...f.r,final:550,clientPrice:800,currency:'USD'},{...next,final:100,clientPrice:150,currency:'CNY'}]);assert.deepEqual(stats.marginByCurrency,{USD:250,CNY:50});assert.equal(stats.margin,50);
});

test('client quotations are PM scoped, separate from confirmation and invalidated by currency changes',()=>{
 const f=setup();
 assert.equal(f.r.submittedBy,op.id);
 assert.throws(()=>M.setClientQuote(f.db,op,f.r.id,750),/仅项目 PM/);
 assert.throws(()=>M.setClientQuote(f.db,M.USERS[1],f.r.id,750),/仅项目 PM/);
 for(const value of [-1,0,Infinity,'invalid'])assert.throws(()=>M.setClientQuote(f.db,pm,f.r.id,value));
 M.setClientQuote(f.db,pm,f.r.id,750);assert.equal(f.r.clientQuote,750);assert.equal(f.r.clientPrice,undefined);assert.equal(f.r.status,'待 PM 审核');assert.equal(M.stageOf(f.r),'提报审核');assert.equal(f.r.events.at(-1).status,'待 PM 审核');assert.equal(M.canSubmitNegotiationQuote(f.db,pm,f.r),false);assert.throws(()=>f.act(pm,'customerAccept',{clientPrice:800}));f.act(pm,'approve',{clientQuote:1000});
 f.act(pm,'agree',{clientPrice:800});f.act(op,'confirm',{final:550,rights:terms.rights,date:'2026-11-01'});f.act(op,'packageRevision',{...terms,currency:'EUR',reason:'币种调整'});
 assert.equal(f.r.clientQuote,null);assert.equal(f.r.clientQuoteNeedsReview,true);assert.equal(f.r.clientPrice,null);
 M.setClientQuote(f.db,pm,f.r.id,900);assert.equal(f.r.clientQuoteNeedsReview,false);assert.equal(f.r.clientQuote,900);
 f.r.ownerId=other.id;assert.equal(f.r.submittedBy,op.id);
});

test('initiator and formal submitters can edit shared basic data but viewers cannot',()=>{
 const f=setup(),c=f.db.creators.find(c=>c.id===f.r.creatorId);
 M.saveCreatorProfile(f.db,op,c.id,{notes:'submitter edit'});
 assert.equal(c.notes,'submitter edit');
 const viewer={id:'unrelated',role:'operator'};
 assert.throws(()=>M.saveCreatorProfile(f.db,viewer,c.id,{notes:'overwrite'}),/正式提报人/);
 assert.equal(c.notes,'submitter edit');
});

test('client quote saves do not advance empty quotes or regress later stages',()=>{
 const f=setup();M.setClientQuote(f.db,pm,f.r.id,'');assert.equal(f.r.status,'待 PM 审核');
 M.setClientQuote(f.db,pm,f.r.id,750);assert.equal(f.r.status,'待 PM 审核');
 f.act(pm,'approve',{clientQuote:1000});M.setClientQuote(f.db,pm,f.r.id,800);assert.equal(f.r.status,'议价待客户确认');
 assert.equal(M.allowedActions(f.db,pm,f.r).agree,true);
 f.act(pm,'agree',{clientPrice:800});const status=f.r.status;
 M.setClientQuote(f.db,pm,f.r.id,900);assert.equal(f.r.status,status);
});

test('proposal codes are six characters, unique, stable and searchable without changing IDs',()=>{
 const f=setup(),id=f.r.id;
 assert.match(f.r.proposalCode,/^[A-HJ-NP-Z2-9]{6}$/);
 const code=f.r.proposalCode,copy=JSON.parse(JSON.stringify(f.db));
 M.upgrade(copy);assert.equal(copy.collaborations.find(r=>r.id===id).proposalCode,code);
 assert.ok(M.selectOrders(f.db,pm,{q:code.toLowerCase(),queue:'all'}).some(r=>r.id===id));
 const rows={collaborations:[{id:'one',proposalCode:code},{id:'two',proposalCode:code},{id:'three'}]};
 M.ensureProposalCodes(rows);assert.equal(new Set(rows.collaborations.map(r=>r.proposalCode)).size,3);
 assert.equal(rows.collaborations[0].proposalCode,code);assert.deepEqual(rows.collaborations.map(r=>r.id),['one','two','three']);
 assert.equal(M.ensureProposalCodes(rows),false);
});

test('three quote rounds preserve replies, authors, notes and allow a fourth with history',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});
 M.setClientQuote(f.db,pm,f.r.id,1000,'第一轮');
 assert.equal(f.r.status,'议价待客户确认');
 assert.throws(()=>M.addCreatorQuoteReply(f.db,other,f.r.id,350),/仅负责运营/);
 M.recordCustomerOffer(f.db,pm,f.r.id,850);
 M.addCreatorQuoteReply(f.db,op,f.r.id,350,'达人接受两条');
 assert.equal(f.r.status,'待 PM 反馈');
 M.setClientQuote(f.db,pm,f.r.id,900,'第二轮');
 assert.equal(f.r.status,'议价待客户确认');
 M.recordCustomerOffer(f.db,pm,f.r.id,800);
 M.addCreatorQuoteReply(f.db,op,f.r.id,300,'最终回价');
 M.setClientQuote(f.db,pm,f.r.id,800,'第三轮');
 const before=JSON.stringify(f.r);
 M.setClientQuote(f.db,pm,f.r.id,700,'第四轮');assert.notEqual(JSON.stringify(f.r),before);
 assert.deepEqual(f.r.clientQuotes.map(q=>[q.round,q.amount,q.by]),[[1,1000,pm.id],[2,900,pm.id],[3,800,pm.id],[4,700,pm.id]]);
 assert.equal(f.r.creatorQuoteReplies[1].note,'最终回价');
 assert.ok(f.r.clientQuotes.every(q=>Number.isFinite(Date.parse(q.at))));
 const copy=JSON.parse(JSON.stringify(f.r));assert.deepEqual(M.clientQuoteHistory(copy),f.r.clientQuotes);
});
test('existing client quote becomes round one and survives a currency revision',()=>{
 const f=setup();f.r.clientQuote=750;
 f.r.events.push({action:'clientQuote',by:pm.id,at:'2026-10-12T10:00:00Z'});
 f.act(pm,'approve',{clientQuote:1000});
 M.setClientQuote(f.db,pm,f.r.id,800,'新报价');
 assert.deepEqual(f.r.clientQuotes.map(q=>q.amount),[750,800]);
 assert.equal(f.r.clientQuotes[0].by,pm.id);
 f.act(pm,'agree',{clientPrice:800});f.act(op,'confirm',{final:550,rights:terms.rights,date:'2026-11-01'});
 f.act(op,'packageRevision',{...terms,currency:'EUR',reason:'币种调整'});
 assert.equal(f.r.clientQuotes[0].currency,'USD');
 M.setClientQuote(f.db,pm,f.r.id,900);assert.equal(f.r.clientQuotes[2].currency,'EUR');
});

test('not submitted filter selects rejected proposals and retains project scope',()=>{
 const f=setup();f.act(pm,'reject',{reason:'受众不匹配'});
 const rows=M.selectOrders(f.db,pm,{stage:'不提报',queue:'all'});
 assert.ok(rows.some(r=>r.id===f.r.id));assert.ok(rows.every(r=>r.status==='不予提报'));
 assert.equal(M.selectOrders(f.db,pm,{stage:'不提报',campaignFilter:'missing',queue:'all'}).length,0);
});

test('responsible operator can reopen a rejected proposal without duplicating records or losing history',()=>{
 const f=setup(),id=f.r.id,code=f.r.proposalCode;
 f.act(pm,'reject',{reason:'画像不符合'});
 const count=f.db.collaborations.length;
 assert.throws(()=>f.act(other,'reopenSubmission'));
 assert.throws(()=>f.act(pm,'reopenSubmission'));
 f.act(op,'reopenSubmission',{...terms,reason:'已补充资料'});
 assert.equal(f.r.status,'待 PM 审核');assert.equal(f.r.id,id);assert.equal(f.r.proposalCode,code);
 assert.equal(f.db.collaborations.length,count);assert.equal(f.r.closedAt,null);
 assert.equal(f.r.events.at(-1).previousRejection.reason,'画像不符合');
 assert.ok(f.r.events.some(e=>e.action==='reject'&&e.reason==='画像不符合'));
 assert.equal(M.isPending(f.db,pm,f.r),true);
 assert.throws(()=>f.act(op,'reopenSubmission'));
});

test('rejection acknowledgement clears operator inbox and resubmission validates and versions edited terms',()=>{
 const f=setup();f.act(pm,'reject',{reason:'地区不符'});
 assert.equal(M.inQueue(f.db,op,f.r,'mine'),true);
 assert.equal(M.inQueue(f.db,other,f.r,'mine'),false);
 assert.throws(()=>f.act(pm,'acknowledgeRejection'));
 f.act(op,'acknowledgeRejection');assert.equal(M.inQueue(f.db,op,f.r,'mine'),false);
 assert.equal(M.inQueue(f.db,op,f.r,'all'),true);assert.equal(f.r.status,'不予提报');
 const before=JSON.stringify(f.r);assert.throws(()=>f.act(op,'reopenSubmission',{...terms,total:0}));assert.equal(JSON.stringify(f.r),before);
 assert.throws(()=>f.act(op,'reopenSubmission',{...terms,reason:'结束后不可重开'}));
 const g=setup();g.act(pm,'reject',{reason:'地区不符'});Object.assign(f,g);f.act(op,'reopenSubmission',{...terms,total:700,cooperationNotes:'修改后提报',reason:'已补充资料'});
 assert.equal(f.r.proposalVersions.at(-1).total,700);assert.equal(f.r.proposalVersions[0].total,550);
 assert.equal(f.r.status,'待 PM 审核');assert.equal(M.inQueue(f.db,pm,f.r,'mine'),true);
 f.act(pm,'reject',{reason:'再次不通过'});assert.equal(M.inQueue(f.db,op,f.r,'mine'),true);
});

test('PM records customer offers for three rounds and assigns only the responsible operator',()=>{
 const f=setup();assert.throws(()=>M.submitNegotiationQuote(f.db,pm,f.r.id,1000));f.act(pm,'approve',{clientQuote:1000});
 for(let round=1;round<=3;round++){
  M.submitNegotiationQuote(f.db,pm,f.r.id,1100-round*100,'对客');
  assert.equal(f.r.status,'议价待客户确认');
  assert.throws(()=>M.submitNegotiationQuote(f.db,pm,f.r.id,900));
  assert.throws(()=>M.recordCustomerOffer(f.db,other,f.r.id,700));
  const before=JSON.stringify(f.r);assert.throws(()=>M.recordCustomerOffer(f.db,pm,f.r.id,0));assert.equal(JSON.stringify(f.r),before);
  M.recordCustomerOffer(f.db,pm,f.r.id,800-round*100,'客户预算');
  assert.equal(f.r.status,'待运营议价');assert.equal(M.stageOf(f.r),'待议价');assert.ok(M.selectOrders(f.db,op,{stage:'待议价',queue:'mine'}).some(x=>x.id===f.r.id));assert.equal(M.inQueue(f.db,op,f.r,'mine'),true);assert.equal(M.isPending(f.db,pm,f.r),false);
  assert.equal(M.isPending(f.db,other,f.r),false);assert.equal(f.r.clientPrice,undefined);
  assert.throws(()=>M.recordCustomerOffer(f.db,pm,f.r.id,500));
  M.addCreatorQuoteReply(f.db,op,f.r.id,400,'运营回价');
  assert.equal(f.r.status,'待 PM 反馈');assert.throws(()=>M.addCreatorQuoteReply(f.db,op,f.r.id,300));
 }
 assert.equal(M.canSubmitNegotiationQuote(f.db,pm,f.r),true);
 assert.deepEqual(f.r.customerOffers.map(x=>x.round),[1,2,3]);assert.equal(f.r.clientQuotes.length,3);
});

test('negotiation stays in progress through operator replies and later client reviews',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});M.submitNegotiationQuote(f.db,pm,f.r.id,1000);
 assert.equal(M.stageOf(f.r),'待议价');
 M.recordCustomerOffer(f.db,pm,f.r.id,800);assert.equal(M.stageOf(f.r),'待议价');
 M.addCreatorQuoteReply(f.db,op,f.r.id,500);assert.equal(f.r.status,'待 PM 反馈');assert.equal(M.stageOf(f.r),'待议价');
 assert.ok(M.selectOrders(f.db,pm,{stage:'待议价',queue:'mine'}).some(r=>r.id===f.r.id));
 M.submitNegotiationQuote(f.db,pm,f.r.id,900);assert.equal(f.r.status,'议价待客户确认');assert.equal(M.stageOf(f.r),'待议价');
 assert.equal(M.stageOf(JSON.parse(JSON.stringify(f.r))),'待议价');
});

test('PM can accept cooperation early and transfer to operator without confirming creator',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});M.submitNegotiationQuote(f.db,pm,f.r.id,1000);
 assert.throws(()=>f.act(op,'customerAccept',{clientPrice:800}));
 const before=JSON.stringify(f.r);assert.throws(()=>f.act(pm,'customerAccept',{clientPrice:0}));assert.equal(JSON.stringify(f.r),before);
 f.act(pm,'customerAccept',{clientPrice:900,reason:'客户邮件确认'});
 assert.equal(f.r.status,'待达人确认');assert.equal(M.stageOf(f.r),'合作确认');assert.equal(f.r.clientPrice,900);
 assert.equal(M.isPending(f.db,op,f.r),true);assert.equal(M.isPending(f.db,pm,f.r),false);
 assert.equal(M.isConfirmed(f.r),false);assert.equal(f.r.clientQuotes.length,1);
 assert.equal(f.r.customerAcceptanceNote,'客户邮件确认');assert.throws(()=>f.act(pm,'customerAccept',{clientPrice:800}));
});
test('customer cooperation acceptance remains available after all three rounds',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});for(let i=0;i<3;i++){M.submitNegotiationQuote(f.db,pm,f.r.id,1000);M.recordCustomerOffer(f.db,pm,f.r.id,800);M.addCreatorQuoteReply(f.db,op,f.r.id,700);}
 f.act(pm,'customerAccept',{clientPrice:850});assert.equal(f.r.status,'待达人确认');assert.equal(f.r.clientPrice,850);
});

test('PM edits proposal without resetting negotiation and retains work until customer acceptance',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});M.submitNegotiationQuote(f.db,pm,f.r.id,1000);
 const old=JSON.stringify(f.r.proposalVersions[0]),quotes=JSON.stringify(f.r.clientQuotes);
 assert.throws(()=>f.act(op,'editCustomerProposal',terms));
 assert.throws(()=>f.act(pm,'editCustomerProposal',{...terms,total:900}));f.act(pm,'editCustomerProposal',{...terms,total:550,items:[{platform:'Instagram',type:'Reel',quantity:3}],cooperationNotes:'三条总价'});
 assert.equal(f.r.status,'待 PM 反馈');
 assert.equal(JSON.stringify(f.r.clientQuotes),quotes);
 assert.equal(JSON.stringify(f.r.proposalVersions[0]),old);
 assert.equal(f.r.proposalVersions.at(-1).items[0].quantity,3);
 const saved=JSON.stringify(f.r);
 assert.throws(()=>f.act(pm,'editCustomerProposal',{...terms,total:-1}));
 assert.throws(()=>f.act(pm,'editCustomerProposal',{...terms,currency:'EUR'}));
 assert.equal(JSON.stringify(f.r),saved);
 f.act(pm,'customerAccept',{clientPrice:1200});
 assert.equal(f.r.status,'待达人确认');
 assert.equal(f.r.preliminaryVersionId,f.r.proposalVersions.at(-1).id);
 assert.equal(f.r.initial,550);
 assert.equal(f.r.clientPrice,1200);
 assert.equal(M.allowedActions(f.db,op,f.r).confirm,true);
 assert.throws(()=>f.act(pm,'editCustomerProposal',terms));
});

test('PM review cannot be bypassed by a draft quotation and all retained steps have the correct owner',()=>{
 const f=setup();M.setClientQuote(f.db,pm,f.r.id,1000,'草稿');
 assert.equal(f.r.status,'待 PM 审核');assert.equal(M.nextStep(f.db,pm,f.r).action,'approve',{clientQuote:1000});
 assert.throws(()=>M.submitNegotiationQuote(f.db,pm,f.r.id,1000));assert.throws(()=>f.act(pm,'agree',{clientPrice:1000}));
 f.act(pm,'approve',{clientQuote:1000});assert.equal(M.nextStep(f.db,pm,f.r).action,'negotiationQuote');assert.equal(M.isPending(f.db,op,f.r),false);
 M.submitNegotiationQuote(f.db,pm,f.r.id,900);assert.equal(M.nextStep(f.db,pm,f.r).action,'customerOffer');
 M.recordCustomerOffer(f.db,pm,f.r.id,800);assert.equal(M.nextStep(f.db,op,f.r).action,'creatorQuoteReply');
 assert.throws(()=>f.act(pm,'customerAccept',{clientPrice:800}));assert.equal(M.isPending(f.db,pm,f.r),false);
 M.addCreatorQuoteReply(f.db,op,f.r.id,550);f.act(pm,'customerAccept',{clientPrice:800});
 assert.equal(M.nextStep(f.db,op,f.r).action,'confirmAndCreateOrder');assert.equal(M.isPending(f.db,pm,f.r),false);
 f.act(op,'confirm',{final:550,rights:terms.rights,date:'2026-11-01'});assert.equal(M.nextStep(f.db,op,f.r).action,'createOrder');
});

test('the third quotation round can finish with acceptance or rejection without a fourth quote',()=>{
 for(const finalAction of ['customerAccept','decline']){
  const f=setup();f.act(pm,'approve',{clientQuote:1000});
  for(let i=0;i<3;i++){M.submitNegotiationQuote(f.db,pm,f.r.id,1000-i*50);M.recordCustomerOffer(f.db,pm,f.r.id,800);M.addCreatorQuoteReply(f.db,op,f.r.id,550);}
  assert.equal(M.canSubmitNegotiationQuote(f.db,pm,f.r),true);assert.equal(M.allowedActions(f.db,pm,f.r).feedback,true);
  f.act(pm,'feedback');assert.equal(f.r.status,'议价待客户确认');assert.equal(M.canRecordCustomerOffer(f.db,pm,f.r),false);
  f.act(pm,finalAction,{clientPrice:850,reason:'客户最终反馈'});assert.equal(f.r.status,finalAction==='decline'?'客户不合作':'待达人确认');
  assert.equal(f.r.clientQuotes.length,3);assert.equal(f.r.customerOffers.length,3);
 }
});

test('old final-confirmation records recover real same-version acceptance and never fabricate customer approval',()=>{
 for(const genuine of [true,false]){
  const f=setup();f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:800});
  const acceptanceAt=f.r.customerAcceptedAt,version=f.r.proposalVersions.at(-1);
  delete f.r.customerAcceptance;delete f.r.customerAcceptedAt;delete f.r.customerAcceptedBy;
  f.r.status='待客户最终确认';f.r.creatorVersionId=version.id;f.r.creatorConfirmedAt='2026-11-01T10:00:00Z';
  if(!genuine)f.r.events=f.r.events.filter(e=>e.action!=='agree');
  const history=JSON.stringify(f.r.events);assert.equal(M.upgrade(f.db),true);assert.equal(f.r.status,'待达人确认');assert.equal(JSON.stringify(f.r.events),history);
  assert.equal(M.isConfirmed(f.r),false);assert.equal(M.upgrade(f.db),false);assert.throws(()=>f.act(op,'createOrder'));
  if(genuine){assert.equal(M.customerAcceptanceFor(f.r).at,acceptanceAt);f.act(op,'confirm',{final:550,rights:terms.rights,date:'2026-11-01'});assert.equal(f.r.proposalVersions.at(-1).confirmations.find(c=>c.party==='client').at,acceptanceAt);}
  else{const before=JSON.stringify(f.r);assert.throws(()=>f.act(op,'confirm',{final:550,rights:terms.rights,date:'2026-11-01'}),/缺少当前方案/);assert.equal(JSON.stringify(f.r),before);assert.equal(M.allowedActions(f.db,pm,f.r).agree,true);f.act(pm,'agree',{clientPrice:800});f.act(op,'confirm',{final:550,rights:terms.rights,date:'2026-11-01'});}
  assert.equal(f.r.status,'合作确认完成');assert.equal(f.r.clientVersionId,version.id);assert.equal(f.r.creatorVersionId,version.id);
 }
});

test('a revised Package invalidates current acceptance while preserving its immutable history',()=>{
 const f=setup();confirm(f);const version=f.r.proposalVersions[0],history=JSON.stringify(version);
 f.act(op,'packageRevision',{...terms,total:600,reason:'新权益'});
 assert.equal(JSON.stringify(version),history);assert.equal(M.customerAcceptanceFor(f.r),null);assert.equal(f.r.customerAcceptance,undefined);
 assert.equal(f.r.customerAcceptedAt,undefined);assert.equal(f.r.creatorConfirmedAt,undefined);assert.equal(M.isConfirmed(f.r),false);
 assert.throws(()=>f.act(op,'createOrder'));f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:900});
 f.act(op,'confirm',{final:600,rights:terms.rights,date:'2026-11-01'});assert.equal(f.r.clientVersionId,f.r.proposalVersions.at(-1).id);
 assert.equal(JSON.stringify(version),history);
});


test('package margin uses the current package total and the accepted customer price or a valid quote',()=>{
 const f=setup();f.act(op,'packageRevision',{...terms,reason:'运营调整',total:100,items:[{platform:'Instagram',type:'Reel',quantity:2}]});
 assert.deepEqual(M.packagePricing(f.r),{cost:100,clientPrice:null,margin:null,currency:'USD',quantity:2});
 M.setClientQuote(f.db,pm,f.r.id,900);assert.equal(M.packagePricing(f.r).margin,800);
 M.setClientQuote(f.db,pm,f.r.id,'');assert.equal(M.packagePricing(f.r).margin,null);
 M.setClientQuote(f.db,pm,f.r.id,850);f.r.clientQuoteNeedsReview=true;assert.equal(M.packagePricing(f.r).clientPrice,null);
 f.r.clientQuoteNeedsReview=false;f.r.clientQuotes.at(-1).currency='EUR';assert.equal(M.packagePricing(f.r).clientPrice,null);
 f.r.clientQuotes.at(-1).currency='USD';f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:80});
 assert.deepEqual(M.packagePricing(f.r),{cost:100,clientPrice:80,margin:-20,currency:'USD',quantity:2});
 // A previous version's accepted price cannot silently survive a new package.
 f.act(op,'packageRevision',{...terms,total:150,reason:'调整合作内容'});
 assert.equal(f.r.clientPrice,80);assert.equal(M.packagePricing(f.r).clientPrice,850);assert.equal(M.packagePricing(f.r).margin,700);
});

test('a two-video package allocates 100 cost and 900 accepted revenue into independent 50/450/400 rows',()=>{
 const f=setup();f.act(op,'packageRevision',{...terms,reason:'运营调整',total:100,items:[{platform:'Instagram',type:'Reel',quantity:2,publicationPlatforms:['YouTube']}]});
 f.act(pm,'approve',{clientQuote:1000});M.submitNegotiationQuote(f.db,pm,f.r.id,950);f.act(pm,'customerAccept',{clientPrice:900});
 f.act(op,'confirm',{final:100,rights:terms.rights,date:'2026-11-01'});
 assert.deepEqual(M.packagePricing(f.r),{cost:100,clientPrice:900,margin:800,currency:'USD',quantity:2});
 assert.throws(()=>f.act(pm,'createOrder'));const order=f.act(op,'createOrder');
 assert.deepEqual(order.pricing,{cost:100,clientPrice:900,margin:800,currency:'USD',quantity:2});
 assert.equal(order.clientPrice,900);assert.equal(order.margin,800);assert.equal(f.db.deliveryItems.length,2);
 for(const item of f.db.deliveryItems){assert.deepEqual(M.packagePricing(item),{cost:50,clientPrice:450,margin:400,currency:'USD',quantity:1});assert.equal(item.initial,50);assert.equal(item.final,50);assert.equal(item.clientQuote,450);assert.equal(M.margin(item),400);assert.equal(item.publications.length,2);}
 const snapshot=JSON.stringify({order,items:f.db.deliveryItems});
 f.r.proposalVersions.at(-1).total=500;f.r.clientPrice=1500;f.r.customerAcceptance.clientPrice=1500;
 assert.equal(f.act(op,'createOrder'),order);assert.equal(JSON.stringify({order,items:f.db.deliveryItems}),snapshot);
});

test('per-video cent remainders preserve the complete package totals and negative margins',()=>{
 for(const [cost,price] of [[100,900.01],[0.02,0.01],[0.1,0.3]]){
  const f=setup();f.act(op,'packageRevision',{...terms,reason:'运营调整',total:cost});f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:price});f.act(op,'confirm',{final:cost,rights:terms.rights,date:'2026-11-01'});
  const order=f.act(op,'createOrder'),items=f.db.deliveryItems;
  assert.equal(items.reduce((sum,item)=>sum+Math.round(item.final*100),0),Math.round(cost*100));
  assert.equal(items.reduce((sum,item)=>sum+Math.round(item.clientPrice*100),0),Math.round(price*100));
  assert.equal(items.reduce((sum,item)=>sum+Math.round(M.margin(item)*100),0),Math.round(order.margin*100));
  if(cost===100){assert.deepEqual(items.map(item=>item.final),[33.34,33.33,33.33]);assert.deepEqual(items.map(item=>item.clientPrice),[300.01,300,300]);}
 }
 assert.equal(M.margin({final:0.1,clientPrice:0.3}),0.2);
});

test('order pricing validation fails without creating partial orders or video rows',()=>{
 for(const mutate of [f=>{f.r.customerAcceptance.clientPrice=null;},f=>{f.r.customerAcceptance.currency='EUR';},f=>{f.r.proposalVersions.at(-1).items[0].quantity=0;},f=>{f.r.proposalVersions.at(-1).total=Number.MAX_VALUE;}]){
  const f=setup();confirm(f);mutate(f);const before=JSON.stringify(f.db);
  assert.throws(()=>f.act(op,'createOrder'));assert.equal(JSON.stringify(f.db),before);
 }
});

test('upgrade backfills only proven unpriced video orders and preserves established financial values',()=>{
 const legacy=()=>{const f=setup();confirm(f);const order=f.act(op,'createOrder');delete order.pricing;delete order.clientPrice;delete order.margin;for(const item of f.db.deliveryItems)for(const key of ['initial','final','clientQuote','clientPrice','currency'])delete item[key];return {f,order};};
 const {f,order}=legacy();M.upgrade(f.db);
 assert.equal(order.pricing.clientPrice,800);assert.equal(f.db.deliveryItems[0].currency,'USD');assert.equal(f.db.deliveryItems[0].final,183.34);
 const before=JSON.stringify(f.db);assert.equal(M.upgrade(f.db),false);assert.equal(JSON.stringify(f.db),before);
 const unsafe=legacy();unsafe.f.r.customerAcceptance.versionId='different-version';delete unsafe.f.r.preliminaryVersionId;M.upgrade(unsafe.f.db);assert.equal(unsafe.order.pricing,undefined);assert.equal(unsafe.f.db.deliveryItems[0].final,undefined);
 const priced=legacy();priced.f.db.deliveryItems[0].final=123;M.upgrade(priced.f.db);assert.equal(priced.f.db.deliveryItems[0].final,123);assert.equal(priced.f.db.deliveryItems[1].final,undefined);
});


test('operator creates an allocated order directly from customer acceptance and repeats stay idempotent',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:900});
 assert.deepEqual(M.nextStep(f.db,op,f.r),{action:'confirmAndCreateOrder',label:'创建订单'});
 assert.equal(M.allowedActions(f.db,op,f.r).confirmAndCreateOrder,true);
 const before=JSON.stringify(f.db);
 for(const user of [pm,other])assert.throws(()=>f.act(user,'confirmAndCreateOrder'));
 assert.equal(JSON.stringify(f.db),before);
 const order=f.act(op,'confirmAndCreateOrder',{paymentTerms:'30 days'});
 assert.equal(f.r.status,'已创建订单');assert.equal(M.stageOf(f.r),'合作确认完成');assert.equal(f.r.orderId,order.id);
 assert.equal(order.paymentTerms,'30 days');assert.equal(f.r.date,'');assert(f.db.deliveryItems.every(item=>item.date===''));assert.equal(f.db.deliveryItems.length,3);assert.equal(f.db.deliveryItems[0].final,183.34);assert.equal(f.db.deliveryItems[0].clientPrice,300);
 assert.deepEqual(f.r.events.slice(-2).map(event=>event.action),['confirm','createOrder']);
 assert.deepEqual(f.r.proposalVersions.at(-1).confirmations.map(item=>item.party),['client','creator']);
 assert.equal(M.nextStep(f.db,op,f.r).action,null);
 const created=JSON.stringify(f.db);assert.equal(f.act(op,'confirmAndCreateOrder'),order);assert.equal(f.act(op,'createOrder'),order);assert.equal(JSON.stringify(f.db),created);
});

test('combined creation validates all terms atomically, including failures after creator confirmation',()=>{
 for(const mode of ['invalid-date','invalid-existing-date','changed-cost','invalid-saved-cost','changed-rights','invalid-customer-price','mismatched-currency','invalid-quantity','missing-acceptance']){
  const f=setup();f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:900});
  const input={};
  if(mode==='invalid-existing-date')f.r.date='2026-02-31';
  if(mode==='invalid-saved-cost')f.r.proposalVersions.at(-1).total=0;
  if(mode==='invalid-date')input.date='2026-02-31';
  if(mode==='changed-cost')input.final=600;
  if(mode==='changed-rights')input.rights='different rights';
  if(mode==='invalid-customer-price')f.r.customerAcceptance.clientPrice=0;
  if(mode==='mismatched-currency')f.r.customerAcceptance.currency='EUR';
  if(mode==='invalid-quantity')f.r.proposalVersions.at(-1).items[0].quantity=0;
  if(mode==='missing-acceptance'){delete f.r.customerAcceptance;delete f.r.preliminaryVersionId;}
  const before=JSON.stringify(f.db);
  assert.throws(()=>f.act(op,'confirmAndCreateOrder',input),mode);assert.equal(JSON.stringify(f.db),before,mode);
  assert.equal(f.r.confirmedAt,undefined);assert.equal(f.r.proposalVersions.at(-1).confirmations.filter(x=>x.party==='creator').length,0);assert.equal(f.db.orders,undefined);
 }
});

test('administrators cannot bypass responsible-operator creation and old confirmed proposals retain the separate recovery action',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:900});
 assert.throws(()=>f.act(M.USERS.find(user=>user.role==='admin'),'confirmAndCreateOrder'),/负责运营/);const order=f.act(op,'confirmAndCreateOrder');
 assert.equal(f.r.status,'已创建订单');assert.equal(f.db.deliveryItems.length,3);assert.equal(order.total,550);
 const old=setup();confirm(old);assert.equal(old.r.status,'合作确认完成');assert.equal(M.nextStep(old.db,op,old.r).action,'createOrder');assert.equal(M.allowedActions(old.db,op,old.r).confirmAndCreateOrder,false);
 const before=JSON.stringify(old.r);M.upgrade(old.db);assert.equal(JSON.stringify(old.r),JSON.stringify({...JSON.parse(before),proposalFlowVersion:4}));assert.equal(old.db.orders,undefined);
 old.act(op,'createOrder');assert.equal(old.r.status,'已创建订单');
});

test('migration renames created-order progress only when an order is linked and preserves audits',()=>{
 for(const previous of ['订单已创建','合作确认完成']){
  const f=setup();confirm(f);const order=f.act(op,'createOrder');f.r.status=previous;f.r.proposalFlowVersion=4;
  const before=JSON.stringify({orders:f.db.orders,items:f.db.deliveryItems,events:f.r.events,versions:f.r.proposalVersions});
  assert.equal(M.upgrade(f.db),true);assert.equal(f.r.status,'已创建订单');assert.equal(f.r.orderId,order.id);
  assert.equal(JSON.stringify({orders:f.db.orders,items:f.db.deliveryItems,events:f.r.events,versions:f.r.proposalVersions}),before);
  assert.equal(M.upgrade(f.db),false);
 }
 const f=setup();confirm(f);f.r.proposalFlowVersion=4;assert.equal(M.upgrade(f.db),false);assert.equal(f.r.status,'合作确认完成');assert.equal(f.db.orders,undefined);
 f.db.savedViews=[{id:'old',config:{status:'订单已创建',stage:'合作确认完成'}}];assert.equal(M.upgrade(f.db),true);assert.equal(f.db.savedViews[0].config.status,'已创建订单');assert.equal(f.db.savedViews[0].config.stage,'合作确认完成');assert.equal(M.upgrade(f.db),false);
 assert(!M.statuses.includes('订单已创建'));assert(M.statuses.includes('已创建订单'));
});


test('direct order creation preserves existing schedules and only the combined action permits unscheduled confirmation',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:900});f.r.date='2026-12-15';
 const order=f.act(op,'confirmAndCreateOrder');
 assert.equal(f.r.date,'2026-12-15');assert.equal(order.total,550);assert(f.db.deliveryItems.every(item=>item.date==='2026-12-15'));
 const legacy=setup();legacy.act(pm,'approve',{clientQuote:1000});legacy.act(pm,'agree',{clientPrice:900});
 const before=JSON.stringify(legacy.db);
 assert.throws(()=>legacy.act(op,'confirm',{final:550,rights:terms.rights,date:''}),/发布日期/);
 assert.equal(JSON.stringify(legacy.db),before);
 legacy.act(op,'confirmAndCreateOrder');assert.equal(legacy.r.date,'');assert(legacy.db.deliveryItems.every(item=>item.date===''));
});

test('Brief starts each video independently and email is optional parallel preparation',()=>{
 const f=setup();confirm(f);const order=f.act(op,'createOrder'),item=f.db.deliveryItems[0];
 assert.equal(M.deliveryStatus(f.db,item),'待填写客户 Brief');assert.equal(M.nextStep(f.db,op,item).action,'briefSent');
 assert.throws(()=>M.updateCoop(f.db,op,item.id,'scriptSubmit',{url:'https://example.com/s'}));
 for(const email of ['', 'invalid'])assert.throws(()=>M.updateCoop(f.db,op,item.id,'preparation',{registrationEmail:email}));
 assert.throws(()=>M.updateCoop(f.db,other,item.id,'preparation',{registrationEmail:'user@example.com'}));
 M.updateCoop(f.db,op,item.id,'preparation',{registrationEmail:' user@example.com '});assert.equal(order.preparation.registrationEmail,'user@example.com');
 assert(f.db.deliveryItems.every(r=>r.status==='待填写客户 Brief'));
 M.updateCoop(f.db,op,item.id,'briefSent');assert.equal(f.db.deliveryItems[1].status,'待填写客户 Brief');
 M.updateCoop(f.db,op,item.id,'scriptSubmit',{url:'https://example.com/script'});assert.equal(M.deliveryStatus(f.db,item),'待 PM 同步客户（脚本）');
 M.updateCoop(f.db,pm,item.id,'scriptSend');M.updateCoop(f.db,pm,item.id,'scriptReturn');assert.equal(M.deliveryStatus(f.db,item),'脚本待运营处理');
});

test('delivery progress maps audit states into Brief, script, draft, publication and completed',()=>{
 const db={orders:[]};
 const cases=[['待填写客户 Brief','待填写客户 Brief','Brief'],['脚本待提交','待提交脚本','脚本阶段'],['脚本待送客户','待 PM 同步客户（脚本）','脚本阶段'],['脚本待客户反馈','等待客户反馈（脚本）','脚本阶段'],['脚本待修改','脚本待运营处理','脚本阶段'],['视频待提交','待提交草稿','视频阶段'],['视频待送客户','待 PM 同步客户（草稿）','视频阶段'],['视频待客户反馈','等待客户反馈（草稿）','视频阶段'],['视频待修改','草稿待运营处理','视频阶段'],['待发布','待发布','发布阶段'],['待验收','待 PM 验收','发布阶段'],['已完成','已完成','已完成']];
 for(const [status,label,stage] of cases){assert.equal(M.deliveryStatus(db,{status}),label);assert.equal(M.deliveryStage(db,{status}),stage);}
});

test('delivery stay counts the current progress run and ignores non-progress updates',()=>{
 const at=h=>new Date(Date.UTC(2026,9,13,h)).toISOString();
 const db={orders:[{id:'o',createdAt:at(0),preparation:{}}]};
 const r={orderId:'o',status:'脚本待提交',events:[],deliverables:{script:[]}};
 assert.equal(M.deliveryStayHours(db,r,Date.parse(at(3))),3);
 db.orders[0].preparation.registrationEmail='a@example.com';
 r.events=[{action:'preparation',status:'脚本待提交',at:at(1)},{action:'note',status:'脚本待提交',at:at(2)},{action:'preparation',status:'脚本待提交',at:at(3)}];
 assert.equal(M.deliveryStayHours(db,r,Date.parse(at(4))),4);
 r.status='脚本待客户反馈';r.events.push({action:'scriptSubmit',status:'脚本待 PM 初审',at:at(4)},{action:'scriptApprove',status:'脚本待送客户',at:at(5)},{action:'scriptSend',status:'脚本待客户反馈',at:at(6)});
 assert.equal(M.deliveryStayHours(db,r,Date.parse(at(7))),1);
 r.events.push({action:'scriptReturn',status:'脚本待修改',at:at(7)},{action:'scriptSubmit',status:'脚本待 PM 初审',at:at(8)});r.status='脚本待 PM 初审';
 assert.equal(M.deliveryStayHours(db,r,Date.parse(at(9))),1);
 assert.equal(M.deliveryStayHours(db,r,Date.parse(at(7))),0);
 assert.equal(M.deliveryStayHours({}, {status:'脚本待提交'},Date.parse(at(9))),null);
});

test('ten-character alphanumeric order codes are unique, stable and preserve internal links',()=>{
 const db={orders:[{id:'old-a',orderCode:'1234567890'},{id:'old-b',orderCode:'A2BC345678'},{id:'old-c',orderCode:'A2BC345678'}]};
 assert.equal(M.ensureOrderCodes(db),true);
 assert(db.orders.every(o=>/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{10}$/.test(o.orderCode)));
 assert.equal(new Set(db.orders.map(o=>o.orderCode)).size,3);
 assert.equal(db.orders[1].orderCode,'A2BC345678');assert.equal(M.ensureOrderCodes(db),false);
 const f=setup();confirm(f);const order=f.act(op,'createOrder');
 assert.match(order.orderCode,/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{10}$/);
 assert(f.db.deliveryItems.every(r=>r.orderId===order.id&&M.orderNumber(f.db,r.orderId)===order.orderCode));
 assert.equal(M.selectOrders(M.deliveryContext(f.db),op,{q:order.orderCode}).length,3);
 const restored=JSON.parse(JSON.stringify(f.db));assert.equal(M.ensureOrderCodes(restored),false);
 assert.equal(M.orderNumber(restored,order.id),order.orderCode);
});

test('each delivery row receives its own persistent searchable ID within a shared order',()=>{
 const f=setup();confirm(f);const order=f.act(op,'createOrder'),rows=f.db.deliveryItems;
 assert.equal(new Set(rows.map(M.deliveryNumber)).size,3);
 for(const row of rows){
  assert.match(row.deliveryCode,/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{10}$/);
  assert.equal(row.orderId,order.id);
  assert.deepEqual(M.selectOrders(M.deliveryContext(f.db),op,{q:row.deliveryCode}).map(r=>r.id),[row.id]);
 }
 const saved=JSON.stringify(rows.map(r=>[r.id,r.deliveryCode,r.orderId]));
 assert.equal(M.ensureDeliveryCodes(f.db),false);
 assert.equal(JSON.stringify(rows.map(r=>[r.id,r.deliveryCode,r.orderId])),saved);
 delete rows[0].deliveryCode;rows[2].deliveryCode=rows[1].deliveryCode;
 assert.equal(M.ensureDeliveryCodes(f.db),true);assert.equal(new Set(rows.map(M.deliveryNumber)).size,3);
 const restored=JSON.parse(JSON.stringify(f.db));assert.equal(M.ensureDeliveryCodes(restored),false);
});

test('creator then client confirmation completes cooperation before an order or any video exists',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});M.submitNegotiationQuote(f.db,pm,f.r.id,900);M.recordCustomerOffer(f.db,pm,f.r.id,800);M.addCreatorQuoteReply(f.db,op,f.r.id,400);
 assert.throws(()=>f.act(pm,'confirmCreator'));assert.throws(()=>f.act(other,'confirmCreator'));
 f.act(op,'confirmCreator');assert.equal(f.r.status,'待客户确认');assert.equal(M.proposalStageOf(f.r),'合作确认');assert(!M.isConfirmed(f.r));assert.equal(M.nextStep(f.db,pm,f.r).action,'negotiationQuote');assert.throws(()=>f.act(op,'createOrder'));
 f.act(pm,'customerAccept',{clientPrice:800});assert.equal(M.proposalStageOf(f.r),'已完成');assert.equal(M.proposalStatus(f.r),'价格已确认（待创建订单）');assert(M.isConfirmed(f.r));assert.equal(f.db.orders,undefined);assert.equal(f.db.deliveryItems,undefined);assert.equal(M.proposalStayHours(f.r),null);
 assert.deepEqual(M.packagePricing(f.r),{cost:400,clientPrice:800,margin:400,currency:'USD',quantity:3});
 assert(M.selectOrders(f.db,op,{cooperation:true,stage:'已完成',status:'价格已确认（待创建订单）'},[f.r]).includes(f.r));
 const order=f.act(op,'createOrder');assert.equal(M.proposalStatus(f.r),'订单已创建');assert.equal(order.total,400);assert.equal(order.terms.total,400);assert.equal(f.db.deliveryItems.length,3);
 assert(f.db.deliveryItems.every(v=>v.status==='待填写客户 Brief'));assert.equal(M.proposalStageOf(f.r),'已完成');assert.equal(f.act(op,'createOrder'),order);
 assert(M.selectOrders(f.db,op,{cooperation:true,stage:'合作确认完成',status:'已创建订单'},[f.r]).includes(f.r));
});

test('a changed customer plan invalidates both confirmations and cannot use a prior version counteroffer',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});M.submitNegotiationQuote(f.db,pm,f.r.id,1000);M.recordCustomerOffer(f.db,pm,f.r.id,800);M.addCreatorQuoteReply(f.db,op,f.r.id,400);f.act(op,'confirmCreator');
 f.act(pm,'agree',{clientPrice:800});const old=JSON.stringify(f.r.proposalVersions[0]);
 f.act(op,'packageRevision',{...terms,total:600,reason:'New version'});assert(!M.isConfirmed(f.r));assert.equal(f.r.creatorVersionId,undefined);assert.equal(f.r.customerAcceptance,undefined);assert.equal(JSON.stringify(f.r.proposalVersions[0]),old);
 f.act(pm,'approve',{clientQuote:1000});f.act(pm,'agree',{clientPrice:1000});f.act(op,'confirmCreator');assert.equal(f.r.final,600);assert.equal(M.proposalStageOf(f.r),'已完成');
});

test('editing terms returns work to PM until customer accepts the current version',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});M.submitNegotiationQuote(f.db,pm,f.r.id,900);
 f.act(op,'packageRevision',{...terms,total:600,reason:'运营调整'});assert.equal(f.r.status,'待 PM 审核');f.act(pm,'approve',{clientQuote:1000});assert.equal(M.nextStep(f.db,op,f.r).action,null);
 assert(!M.allowedActions(f.db,op,f.r).confirmAndCreateOrder);
 f.act(pm,'customerAccept',{clientPrice:1000});assert.equal(M.proposalStageOf(f.r),'合作确认');assert.equal(M.nextStep(f.db,op,f.r).action,'confirmAndCreateOrder');
 const order=f.act(op,'confirmAndCreateOrder');assert.equal(M.proposalStageOf(f.r),'已完成');assert.equal(order.total,600);
});

test('cooperation cancellation maps to one terminal stage and preserves the original reason and quote history',()=>{
 for(const action of ['reject','decline','creatorDecline','cancel']){
  const f=setup();if(action!=='reject')f.act(pm,'approve',{clientQuote:1000});const user=action==='creatorDecline'?op:pm;
  const before=JSON.stringify(f.r.proposalVersions);assert.throws(()=>f.act(user,action,{reason:' '}));f.act(user,action,{reason:'Client changed scope'});
  assert.equal(M.proposalStageOf(f.r),action==='reject'?'提报审核':'已取消');if(action==='reject')f.act(op,'acknowledgeRejection');assert.equal(f.r.closeReason,'Client changed scope');assert.equal(JSON.stringify(f.r.proposalVersions),before);assert.equal(f.db.orders,undefined);
  assert(M.selectOrders(f.db,op,{cooperation:true,stage:'已取消'},[f.r]).includes(f.r));assert.throws(()=>f.act(op,'confirmCreator'));
 }
});

test('approval requires a positive draft quote and never creates a quote round',()=>{
 const f=setup(),before=JSON.stringify(f.db);
 for(const value of [undefined,'',0,-1,'bad',Infinity]){
  assert.throws(()=>f.act(pm,'approve',{clientQuote:value}),/对客报价/);
  assert.equal(JSON.stringify(f.db),before);
 }
 assert.throws(()=>f.act(op,'approve',{clientQuote:900}));
 f.act(pm,'approve',{clientQuote:900,quoteNote:'2条视频，90天授权'});
 assert.equal(M.proposalStageOf(f.r),'谈价中');assert.equal(M.proposalStatus(f.r),'待 PM 反馈');
 assert.equal(f.r.clientQuoteDraft.amount,900);assert.equal(f.r.clientQuoteDraft.note,'2条视频，90天授权');
 assert.equal(f.r.clientQuoteDraft.versionId,f.r.proposalVersions.at(-1).id);
 assert.equal(M.clientQuoteHistory(f.r).length,0);assert.equal(f.r.clientQuote,undefined);
 assert(!M.allowedActions(f.db,pm,f.r).customerAccept);assert(!M.allowedActions(f.db,op,f.r).confirmAndCreateOrder);
 const restored=JSON.parse(JSON.stringify(f.db));assert.equal(restored.collaborations.find(r=>r.id===f.r.id).clientQuoteDraft.amount,900);
 M.submitNegotiationQuote(f.db,pm,f.r.id,950,'正式条件');
 assert.equal(f.r.clientQuoteDraft,undefined);assert.equal(M.clientQuoteHistory(f.r).length,1);
 assert.equal(M.clientQuoteHistory(f.r)[0].amount,950);assert.equal(M.proposalStatus(f.r),'待客户报价');
 assert(M.selectOrders(f.db,pm,{cooperation:true,status:'待客户报价'},[f.r]).includes(f.r));
 assert.equal(M.selectOrders(f.db,pm,{cooperation:true,status:'议价待客户确认'},[f.r]).length,0);
 M.recordCustomerOffer(f.db,pm,f.r.id,850);assert.equal(M.proposalStatus(f.r),'待运营议价');
 M.addCreatorQuoteReply(f.db,op,f.r.id,100);assert.equal(M.proposalStatus(f.r),'待 PM 反馈');
 assert.equal(M.nextStep(f.db,op,f.r).action,null);assert.equal(M.nextStep(f.db,pm,f.r).action,'negotiationQuote');
 M.submitNegotiationQuote(f.db,pm,f.r.id,900);assert.equal(M.proposalStatus(f.r),'议价待客户确认');
 assert(M.selectOrders(f.db,pm,{cooperation:true,status:'议价待客户确认'},[f.r]).includes(f.r));
});

test('customer accepts before three rounds and one-click creation uses the latest negotiated creator cost',()=>{
 const f=setup();f.act(op,'packageRevision',{...terms,reason:'运营调整',total:200,items:[{platform:'Instagram',type:'Reel',quantity:2}]});
 f.act(pm,'approve',{clientQuote:1000});M.submitNegotiationQuote(f.db,pm,f.r.id,1000);
 M.recordCustomerOffer(f.db,pm,f.r.id,900);M.addCreatorQuoteReply(f.db,op,f.r.id,100);
 f.act(pm,'customerAccept',{clientPrice:900});
 assert.equal(M.proposalStageOf(f.r),'合作确认');assert.equal(M.proposalStatus(f.r),'待达人确认');
 assert.equal(M.nextStep(f.db,op,f.r).action,'confirmAndCreateOrder');assert.equal(M.isPending(f.db,pm,f.r),false);
 assert.equal(M.packagePricing(f.r).cost,100);assert.equal(M.packagePricing(f.r).margin,800);
 const order=f.act(op,'confirmAndCreateOrder');
 assert.equal(M.proposalStageOf(f.r),'已完成');assert.equal(M.proposalStatus(f.r),'订单已创建');
 assert.equal(order.total,100);assert.equal(order.clientPrice,900);assert.equal(order.margin,800);
 assert.equal(f.db.deliveryItems.length,2);
 for(const item of f.db.deliveryItems){assert.equal(item.final,50);assert.equal(item.clientPrice,450);assert.equal(M.margin(item),400);}
 assert.equal(f.act(op,'confirmAndCreateOrder').id,order.id);assert.equal(f.db.deliveryItems.length,2);
});

test('creator-first legacy confirmation can resume a new quote without carrying stale acceptance into an order',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1100});M.submitNegotiationQuote(f.db,pm,f.r.id,1100);M.recordCustomerOffer(f.db,pm,f.r.id,1500,'two videos');M.addCreatorQuoteReply(f.db,op,f.r.id,700);f.act(op,'confirmCreator');
 const history=JSON.stringify(f.r.proposalVersions),before=JSON.stringify(f.r);
 assert(M.canSubmitNegotiationQuote(f.db,pm,f.r));assert(!M.canSubmitNegotiationQuote(f.db,op,f.r));assert(!M.canSubmitNegotiationQuote(f.db,M.USERS[1],f.r));assert(!M.canRecordCustomerOffer(f.db,pm,f.r));
 for(const value of [0,-1,Infinity,'invalid'])assert.throws(()=>M.submitNegotiationQuote(f.db,pm,f.r.id,value));assert.equal(JSON.stringify(f.r),before);
 M.submitNegotiationQuote(f.db,pm,f.r.id,1200);assert.equal(f.r.status,'议价待客户确认');assert.equal(f.r.creatorVersionId,undefined);assert.equal(f.r.creatorAcceptance,undefined);assert.equal(JSON.stringify(f.r.proposalVersions),history);assert.equal(f.r.clientQuotes.length,2);assert(M.canRecordCustomerOffer(f.db,pm,f.r));
 M.recordCustomerOffer(f.db,pm,f.r.id,1000);assert.equal(f.r.status,'待运营议价');assert.equal(f.r.customerOffers.at(-1).round,2);
 M.addCreatorQuoteReply(f.db,op,f.r.id,600);f.act(pm,'customerAccept',{clientPrice:1000});assert.equal(f.r.status,'待达人确认');assert(!M.isConfirmed(f.r));assert(!M.canSubmitNegotiationQuote(f.db,pm,f.r));assert(!M.canRecordCustomerOffer(f.db,pm,f.r));
 const order=f.act(op,'confirmAndCreateOrder');assert.equal(order.total,600);assert.equal(f.db.deliveryItems.length,3);assert(!M.canSubmitNegotiationQuote(f.db,pm,f.r));
});

test('legacy pending customer permits an unrecorded counteroffer and permits later quotation rounds',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1000});
 for(let i=0;i<3;i++){M.submitNegotiationQuote(f.db,pm,f.r.id,1000-i*100);if(i<2){M.recordCustomerOffer(f.db,pm,f.r.id,700);M.addCreatorQuoteReply(f.db,op,f.r.id,600);}}
 // Older saved records may have creator acceptance while awaiting the final customer reply.
 f.r.status='待客户确认';f.r.creatorVersionId=f.r.proposalVersions.at(-1).id;f.r.creatorAcceptance={versionId:f.r.creatorVersionId};
 assert(M.canSubmitNegotiationQuote(f.db,pm,f.r));assert(M.canRecordCustomerOffer(f.db,pm,f.r));assert(!M.canRecordCustomerOffer(f.db,op,f.r));
 const before=JSON.stringify(f.r);assert.throws(()=>M.recordCustomerOffer(f.db,pm,f.r.id,Infinity));assert.throws(()=>M.submitNegotiationQuote(f.db,pm,f.r.id,Infinity));assert.equal(JSON.stringify(f.r),before);
 M.recordCustomerOffer(f.db,pm,f.r.id,750);assert.equal(f.r.creatorVersionId,undefined);assert.equal(f.r.status,'待运营议价');assert.equal(f.r.clientQuotes.length,3);
});

test('assigned operator corrects accepted video quantities without reopening PM confirmation',()=>{
 const f=setup();f.act(pm,'approve',{clientQuote:1200});M.submitNegotiationQuote(f.db,pm,f.r.id,1200);f.act(pm,'customerAccept',{clientPrice:1200});
 const accepted=JSON.stringify(M.customerAcceptanceFor(f.r)),price=M.packagePricing(f.r),version=f.r.proposalVersions.at(-1).id;
 assert(M.allowedActions(f.db,op,f.r).correctVideoQuantity);assert(!M.allowedActions(f.db,pm,f.r).correctVideoQuantity);assert(!M.allowedActions(f.db,other,f.r).correctVideoQuantity);
 const before=JSON.stringify(f.r);
 for(const quantities of [[0,1],[1.5,1],[101,1],[2],['2',1],[2,1]])assert.throws(()=>f.act(op,'correctVideoQuantity',{quantities,reason:'已核实'}));
 assert.throws(()=>f.act(op,'correctVideoQuantity',{quantities:[3,1],reason:''}));assert.throws(()=>f.act(other,'correctVideoQuantity',{quantities:[3,1],reason:'已核实'}));assert.equal(JSON.stringify(f.r),before);
 f.act(op,'correctVideoQuantity',{quantities:[3,1],reason:'客户已同意三条 Instagram，录入少一条'});
 assert.equal(f.r.status,'待达人确认');assert.equal(f.r.proposalVersions.at(-1).id,version);assert.equal(JSON.stringify(M.customerAcceptanceFor(f.r)),accepted);assert.deepEqual(M.packagePricing(f.r),{...price,quantity:4});
 const correction=f.r.quantityCorrections.at(-1);assert.equal(correction.before[0].quantity,2);assert.equal(correction.after[0].quantity,3);assert.equal(correction.by,op.id);assert.deepEqual(f.r.proposalVersions.at(-1).items[0].publicationPlatforms,correction.before[0].publicationPlatforms);
 const order=f.act(op,'confirmAndCreateOrder');assert.equal(f.db.deliveryItems.length,4);assert.equal(order.total,550);assert(!M.allowedActions(f.db,op,f.r).correctVideoQuantity);assert.throws(()=>f.act(op,'correctVideoQuantity',{quantities:[2,1],reason:'创建后不可补正'}));
});
