import {completeFixture,projectFixture} from './test-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from './model.mjs';
import * as components from './design-system/components.mjs';

// Exercise the real event handlers with a failing storage adapter. No browser
// storage or production records are touched by these tests.
function harness(sessionStorage) {
  const db=completeFixture();model.upgrade(db);db.creatorResetVersion=model.CREATOR_RESET_VERSION;
  const admin=model.USERS.find(u=>u.role==='admin');
  const p=projectFixture(db,admin,{name:'Persistence test',client:'Test',requirements:'',members:['a']});
  const r=model.submitCreator(db,admin,db.creators[0].id,{campaignId:p.id,initial:1000,rights:'video',reason:''});
  model.updateCoop(db,admin,r.id,'approve',{clientQuote:1000});
  model.updateCoop(db,admin,r.id,'agree',{clientPrice:1500});
  model.updateCoop(db,admin,r.id,'confirm',{final:1000,rights:'video',date:'2026-10-20'});
  let stored=JSON.stringify(db),fail=false;
  const handlers={},listeners={},registrations={},message={dataset:{},textContent:''};
  const root={querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(kind,handler,capture=false)=>{handlers[kind]=handler;(listeners[kind]??=[]).push(handler);(registrations[kind]??=[]).push({handler,capture});}};
  const storage={getItem:()=>stored,setItem:(_key,value)=>{if(fail)throw Error('QuotaExceededError');stored=value;}};
  let source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
  source=source.replace(/^import .*;\n/gm,'').replace(/^document\.getElementById\('account'\).*\n/m,'');
  const context=vm.createContext({...model,...components,console,crypto,URL,structuredClone,setTimeout:()=>1,clearTimeout:()=>{},localStorage:storage,sessionStorage,
    document:{getElementById:id=>id==='crm-preview'?root:id==='crm-content'?{}:message},
    FormData:class{constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}getAll(key){return this.values[key]||[];}}
  });
  vm.runInContext(source+"\nuser=USERS.find(u=>u.role==='admin');render=()=>{};panel=(title,body)=>{globalThis.lastPanel={title,body};};globalThis.drawCoop=coopDetail;coopDetail=()=>{};globalThis.readDB=()=>db;",context);
  return {id:r.id,context,message,dispatchFull(kind,event){let stopped=false;event.stopImmediatePropagation=()=>{stopped=true;};for(const {handler} of [...(registrations[kind]||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){handler(event);if(stopped)break;}},dispatch:(kind,event)=>listeners[kind][0](event),stored:()=>JSON.parse(stored),setFailure:v=>fail=v,
    clickAction(action,id=r.id,button){button??={dataset:{action,coopId:id},disabled:false,matches:()=>false,hasAttribute:()=>false};listeners.click[0]({target:{closest:selector=>selector==='button'?button:null}});return button;},
    submit(kind,values,id=r.id){const button={disabled:false};const form={dataset:{kind,id},values,querySelectorAll:()=>[button]};listeners.submit[0]({preventDefault(){},target:form});return {form,button};}
  };
}

test('failed content save rolls back status and version while preserving inputs for retry',()=>{
  const h=harness(),before=JSON.stringify(h.context.readDB());h.setFailure(true);
  const values={url:'https://example.com/script',description:'Keep this draft'};
  const {form,button}=h.submit('scriptSubmit',values);
  assert.equal(JSON.stringify(h.context.readDB()),before);
  assert.equal(h.stored().collaborations.find(r=>r.id===h.id).status,'脚本待提交');
  assert.equal(form.values.description,'Keep this draft');assert.equal(button.disabled,false);
  assert.equal(form.dataset.busy,undefined);assert.match(h.message.textContent,/保存失败/);
  h.setFailure(false);h.submit('scriptSubmit',values);
  const saved=h.stored().collaborations.find(r=>r.id===h.id);
  assert.equal(saved.status,'脚本待送客户');assert.equal(saved.deliverables.script.length,1);
});

test('failed note save does not leave phantom notes or timestamps',()=>{
  const h=harness(),before=JSON.stringify(h.context.readDB());h.setFailure(true);
  const {form,button}=h.submit('note',{body:'Retain this note'});
  assert.equal(JSON.stringify(h.context.readDB()),before);
  assert.equal(form.values.body,'Retain this note');assert.equal(button.disabled,false);
  h.setFailure(false);h.submit('note',form.values);
  assert.equal(h.stored().collaborations.find(r=>r.id===h.id).notes.length,1);
});

test('delivery page renders confirmed records and respects account visibility',()=>{
 const h=harness();
 h.context.PageHeader=({title})=>title;h.context.FilterBar=x=>x;
 vm.runInContext("page='delivery';queue='all';globalThis.deliveryIDs=()=>deliveryRows().map(r=>r.id);globalThis.drawDelivery=()=>{renderDelivery();return content.innerHTML;};",h.context);
 const db=h.context.readDB();
 assert(h.context.deliveryIDs().includes(h.id));
 const pending=db.collaborations.find(r=>!model.isConfirmed(r));
 assert(!h.context.deliveryIDs().includes(pending.id));
 const html=h.context.drawDelivery();assert.match(html,/视频交付/);assert.match(html,/历史交付/);
 vm.runInContext("user=USERS.find(u=>u.id==='b');",h.context);
 assert(!h.context.deliveryIDs().includes(h.id));
});


test('Package submission form persists terms and failed order creation rolls back all generated items',()=>{
 const h=harness(),initial=h.stored(),campaignId=initial.collaborations.find(r=>r.id===h.id).campaignId;
 h.submit('submit',{campaignId,total:'550',currency:'USD',rights:'30 days',reason:'Package',quantity0:'0',quantity1:'1',type1:'Dedicated',quantity2:'2',type2:'Reel',publication2:['YouTube']},initial.creators[1].id);
 const proposal=h.stored().collaborations.at(-1);assert(proposal.proposalVersions);assert.equal(proposal.proposalVersions[0].total,550);assert.equal(proposal.proposalVersions[0].items.length,2);
 h.submit('approve',{clientQuote:'1000'},proposal.id);
 h.submit('agree',{clientPrice:'800'},proposal.id);h.submit('confirm',{final:'550',rights:'30 days',date:'2026-11-01'},proposal.id);
 h.context.orderProposalId=proposal.id;vm.runInContext("db.collaborations.find(r=>r.id===orderProposalId).ownerId='a';user=USERS.find(u=>u.id==='a');",h.context);const beforeOrder=JSON.stringify(h.context.readDB());
 h.setFailure(true);h.submit('createOrder',{},proposal.id);assert.equal(JSON.stringify(h.context.readDB()),beforeOrder);assert.equal(h.context.readDB().orders,undefined);assert.equal(h.context.readDB().deliveryItems,undefined);assert.equal(h.stored().collaborations.at(-1).status,'合作确认完成');
 h.setFailure(false);h.submit('createOrder',{},proposal.id);const saved=h.stored();assert.equal(saved.orders.length,1);assert.equal(saved.deliveryItems.length,3);assert.equal(saved.orders[0].currency,'USD');
 h.submit('preparation',{registrationEmail:'creator@example.com'},saved.deliveryItems[0].id);model.updateCoop(h.context.readDB(),model.USERS.find(u=>u.id==='a'),saved.deliveryItems[0].id,'briefSent');h.submit('scriptDraft',{description:'draft only'},saved.deliveryItems[0].id);assert.equal(h.stored().deliveryItems[0].status,'脚本待提交');assert.equal(h.stored().deliveryItems[0].drafts.script.description,'draft only');
});


test('table renderers expose cooperation drawers and creator page targets',()=>{
 const h=harness();
 const html=vm.runInContext("orders([db.collaborations.find(r=>r.id==='"+h.id+"')])",h.context);
 assert.match(html,new RegExp('data-detail-row data-coop="'+h.id+'"'));
 assert.match(html,/tabindex="0" aria-haspopup="dialog"/);
 vm.runInContext("queue='all';renderDelivery();globalThis.deliveryHTML=content.innerHTML;renderCreatorTable();globalThis.creatorHTML=content.innerHTML;",h.context);
 assert.match(h.context.deliveryHTML,/data-detail-row data-coop=/);assert.match(h.context.creatorHTML,/data-detail-row data-creator=/);
});
test('row clicks and keyboard activation open the matching drawer without hijacking nested controls',()=>{
 const h=harness(),opened=[];h.context.opened=opened;
 vm.runInContext("coopDetail=id=>opened.push('coop:'+id);creatorDetail=id=>opened.push('creator:'+id);submission=id=>opened.push('submit:'+id);openCreatorPage=id=>opened.push('page:'+id);",h.context);
 const element=(dataset,row=false)=>({dataset,classList:{contains:()=>false},matches:selector=>row&&selector.includes('tr[data-detail-row]'),hasAttribute:()=>false,focus(){this.focused=true;}});
 const row=element({coop:h.id},true),cell={closest:selector=>selector==='tr[data-detail-row]'?row:null};
 h.dispatch('click',{target:cell});assert.deepEqual(opened,['coop:'+h.id]);assert.equal(row.focused,true);
 const creatorRow=element({creatorPage:'creator-1'},true);h.dispatch('click',{target:{closest:selector=>selector==='tr[data-detail-row]'?creatorRow:null}});assert.equal(opened.at(-1),'page:creator-1');
 const button=element({submitCreator:'creator-1'});h.dispatch('click',{target:{closest:selector=>selector==='button'?button:selector==='tr[data-detail-row]'?row:null}});assert.equal(opened.at(-1),'submit:creator-1');
 const count=opened.length;for(const tag of ['a','input','select','textarea','label','summary'])h.dispatch('click',{target:{closest:selector=>selector.includes(tag)&&selector.startsWith('a,')?{}:selector==='tr[data-detail-row]'?row:null}});assert.equal(opened.length,count);
 let prevented=false;row.click=()=>h.dispatch('click',{target:cell});h.dispatch('keydown',{key:'Enter',target:row,preventDefault(){prevented=true;}});assert(prevented);assert.equal(opened.at(-1),'coop:'+h.id);
 h.context.getSelection=()=>({toString:()=> 'selected text'});h.dispatch('click',{target:cell});assert.equal(opened.length,count+1);
});

test('creator lists share presentation across roles, preserve identities and render independent account values',()=>{
 const h=harness();
 vm.runInContext("user=USERS.find(u=>u.id==='a');db.creators[0].accounts=[{platform:'Instagram',handle:'@one',url:'https://instagram.com/one',followers:0},{platform:'Instagram',handle:'@two',url:'',followers:50000},{platform:'TikTok',handle:'',url:'',followers:null}];globalThis.drawCreators=()=>{renderCreatorTable();return content.innerHTML;};",h.context);
 const before=JSON.stringify(h.context.readDB()),html=h.context.drawCreators();
 assert.match(html,/operator-creator-list/);assert.match(html,/平台账号/);assert.match(html,/resource-platform-stack/);assert.match(html,/@one/);assert.match(html,/@two/);assert.match(html,/粉丝 0/);assert.match(html,/均播 —/);assert.doesNotMatch(html,/<th scope="col">Instagram<\/th>/);
 assert.equal((html.match(/data-detail-row data-creator="creator-0"/g)||[]).length,1);
 assert.match(html,/data-new-creator/);assert.match(html,/data-submit-creator="creator-0"/);assert.match(html,/data-filter="minimumFollowers"/);assert.match(html,/data-filter="platform"/);assert.match(html,/data-filter="country"/);
 assert.equal(JSON.stringify(h.context.readDB()),before);
 vm.runInContext("platform='TikTok';minimumFollowers=50000;",h.context);assert.doesNotMatch(h.context.drawCreators(),/data-detail-row data-creator="creator-0"/);
 vm.runInContext("user=USERS.find(u=>u.role==='pm');platform='全部';minimumFollowers=0;",h.context);
 const pmHTML=h.context.drawCreators();assert.match(pmHTML,/operator-creator-list/);assert.match(pmHTML,/creator-resource-table/);assert.doesNotMatch(pmHTML,/data-detail-row data-creator="creator-0"/);
});

test('workspace filters, view mode and scroll isolate modules and accounts without touching business storage',()=>{
 const h=harness(),before=JSON.stringify(h.stored()),session=new Map();
 h.context.sessionStorage={setItem:(k,v)=>session.set(k,v)};
 h.context.window={scrollY:320};
 vm.runInContext("page='creators';q='Mia';platform='Instagram';minimumFollowers=50000;rememberWorkspace();page='delivery';restoreWorkspace();globalThis.deliveryDefault=workspaceState();q='Video';view='group';queue='all';rememberWorkspace();page='creators';restoreWorkspace();globalThis.creatorState=workspaceState();user=USERS.find(u=>u.id==='a');restoreWorkspace();globalThis.otherUser=workspaceState();",h.context);
 assert.equal(h.context.deliveryDefault.q,'');assert.equal(h.context.deliveryDefault.queue,'mine');
 assert.equal(h.context.creatorState.q,'Mia');assert.equal(h.context.creatorState.platform,'Instagram');assert.equal(h.context.creatorState.minimumFollowers,50000);
 assert.equal(h.context.otherUser.q,'');
 const states=JSON.parse(session.get('solbridge-video-v06-preview-views'));assert.equal(states['admin/creators'].scroll,320);assert.equal(states['admin/delivery'].view,'group');
 assert.equal(JSON.stringify(h.stored()),before);
 h.context.sessionStorage.setItem=()=>{throw Error('session unavailable');};assert.doesNotThrow(()=>vm.runInContext('rememberWorkspace()',h.context));
});

test('proposal and delivery filters retain the source cooperation while using independent stage mappings',()=>{
 const h=harness();
 vm.runInContext("page='followup';globalThis.proposalIDs=proposalRows().map(x=>x.id);globalThis.proposalStates=moduleStatuses();globalThis.proposalStages=moduleStages();page='delivery';globalThis.deliveryStates=moduleStatuses();",h.context);
 assert(h.context.proposalIDs.includes(h.id));assert(!h.context.proposalStates.includes('脚本待提交'));assert(!h.context.proposalStages.includes('视频制作'));
 assert.deepEqual(Array.from(h.context.proposalStages),['全部','提报审核','谈价中','合作确认','已完成','已取消']);
 assert.deepEqual(Array.from(h.context.proposalStates).sort(),model.proposalStatuses.slice().sort());
 const controls=vm.runInContext("page='followup';moreFilters=true;followupControls([],[],[])",h.context);
 assert.deepEqual([...controls.matchAll(/data-stage="([^"]+)"/g)].map(x=>x[1]),['全部','提报审核','谈价中','合作确认','已完成','已取消']);
 assert.doesNotMatch(controls,/客户筛选|客户最终确认|待运营补充|待对客提报|待客户审核|待客户反馈|待运营还价/);
 assert(h.context.deliveryStates.includes('待提交脚本'));assert(!h.context.deliveryStates.includes('待 PM 审核'));
});

test('PM and operator drawers carry the simplified proposal flow through confirmation and order creation',()=>{
 const h=harness(),db=h.context.readDB(),project=db.campaigns.find(p=>p.id===db.collaborations.find(r=>r.id===h.id).campaignId);
 project.pmId='pm1';
 vm.runInContext("user=USERS.find(u=>u.id==='a');page='followup';",h.context);
 h.submit('submit',{campaignId:project.id,total:'100',currency:'USD',rights:'one video',reason:'Role flow',quantity0:'1',type0:'视频',quantity1:'0',quantity2:'0'},db.creators[1].id);
 const id=h.stored().collaborations.at(-1).id;
 const current=()=>h.stored().collaborations.find(r=>r.id===id);
 let body='';h.context.panel=(_title,html)=>{body=html;};
 const as=account=>{vm.runInContext('user=USERS.find(u=>u.id==='+JSON.stringify(account)+');',h.context);};
 const drawer=account=>{as(account);h.context.drawCoop(id);assert.doesNotMatch(body,/data-(?:kind|action)="(?:sent|returnSubmission|resubmit|finalConfirm)"/);return body;};
 assert.equal(current().status,'待 PM 审核');
 assert.match(drawer('pm1'),/data-kind="approve"/);assert.match(body,/审核通过并保存报价/);
 assert.doesNotMatch(drawer('a'),/data-kind="approve"|data-kind="negotiationQuote"|data-kind="creatorQuoteReply"/);
 as('pm1');h.submit('approve',{clientQuote:'1000'},id);assert.equal(current().status,'待 PM 反馈');
 assert.match(drawer('pm1'),/data-kind="negotiationQuote"/);assert.match(body,/<option value="decline">/);
 assert.doesNotMatch(drawer('a'),/data-kind="negotiationQuote"/);assert.match(body,/<option value="creatorDecline">/);
 as('pm1');h.submit('negotiationQuote',{clientQuote:'150',quoteNote:'First customer quote'},id);
 assert.equal(current().status,'议价待客户确认');assert.match(drawer('pm1'),/data-kind="customerOffer"/);
 assert.doesNotMatch(drawer('a'),/data-kind="creatorQuoteReply"/);
 as('pm1');h.submit('customerOffer',{clientQuote:'125',quoteNote:'Customer counter'},id);
 assert.equal(current().status,'待运营议价');assert.match(drawer('a'),/data-kind="creatorQuoteReply"/);
 assert.doesNotMatch(drawer('pm1'),/data-kind="creatorQuoteReply"/);
 as('a');h.submit('creatorQuoteReply',{clientQuote:'100',quoteNote:'Creator accepts unchanged package'},id);
 assert.equal(current().status,'待 PM 反馈');assert.match(drawer('pm1'),/data-kind="negotiationQuote"/);
 assert.doesNotMatch(drawer('a'),/data-kind="creatorQuoteReply"/);
 as('pm1');h.submit('customerAccept',{clientPrice:'125',reason:'Client accepts'},id);
 assert.equal(current().status,'待达人确认');assert.doesNotMatch(drawer('pm1'),/data-action="confirmAndCreateOrder"/);
 const pending=JSON.stringify(h.context.readDB());h.clickAction('confirmAndCreateOrder',id);assert.equal(JSON.stringify(h.context.readDB()),pending);
 assert.match(drawer('a'),/data-action="confirmAndCreateOrder"/);assert.match(body,/>创建订单<\/button>/);
 assert.doesNotMatch(body,/data-kind="confirmAndCreateOrder"|data-kind="confirm"|data-show-creator-confirmation|type="date"|确认创建|>达人已确认合作<\/button>/);
 as('a');h.clickAction('confirmAndCreateOrder',id);assert.equal(model.proposalStageOf(current()),'已完成');assert(current().orderId);
 assert.equal(current().status,'已创建订单');assert.match(drawer('a'),/合作订单：/);
 assert.doesNotMatch(body,/data-order-deliveries=|前往视频交付/);
 assert.doesNotMatch(body,/data-action="confirmAndCreateOrder"|data-action="createOrder"/);
 assert.equal(h.stored().deliveryItems.filter(r=>r.proposalId===id).length,1);
});

test('package margin becomes two independent video prices through the order creation button',()=>{
 const h=harness(),db=h.context.readDB(),project=db.campaigns.find(p=>p.id===db.collaborations.find(r=>r.id===h.id).campaignId);
 project.pmId='pm1';
 const as=account=>vm.runInContext('user=USERS.find(u=>u.id==='+JSON.stringify(account)+');',h.context);
 as('a');
 h.submit('submit',{campaignId:project.id,total:'100',currency:'USD',rights:'Package rights',quantity0:'2',type0:'视频',quantity1:'0',quantity2:'0'},db.creators[1].id);
 const id=h.stored().collaborations.at(-1).id,current=()=>h.context.readDB().collaborations.find(r=>r.id===id);
 as('pm1');h.submit('approve',{clientQuote:'1000'},id);h.submit('negotiationQuote',{clientQuote:'900',quoteNote:'Two videos'},id);
 const finance=h.context.proposalFinance(current());
 assert.match(finance,/合作总价<\/span><strong>USD 100<\/strong>/);
 assert.doesNotMatch(finance,/对客报价/);
 assert.match(finance,/合作margin<\/span><strong>USD 800<\/strong>/);
 assert.doesNotMatch(h.context.packageHistory(current()),/data-action="createOrder"/);
 h.submit('customerAccept',{clientPrice:'900',reason:'Customer accepts both videos'},id);
 as('a');
 assert.match(h.context.customerAcceptancePanel(current()),/data-action="confirmAndCreateOrder"/);
 as('b');assert.doesNotMatch(h.context.customerAcceptancePanel(current()),/data-action="confirmAndCreateOrder"/);
 as('a');
 h.clickAction('confirmAndCreateOrder',id);
 assert.equal(current().status,'已创建订单');
 const items=h.stored().deliveryItems.filter(r=>r.proposalId===id);
 assert.equal(items.length,2);assert.equal(new Set(items.map(r=>r.id)).size,2);
 for(const item of items){assert.equal(item.final,50);assert.equal(item.clientPrice,450);assert.equal(model.margin(item),400);assert.equal(item.date,'');}
 assert.match(h.context.proposalFinance(current()),/合作margin<\/span><strong>USD 800<\/strong>/);
 assert.doesNotMatch(h.context.packageHistory(current()),/data-action="createOrder"/);
 h.context.orderId=current().orderId;
 const table=vm.runInContext("page='delivery';queue='all';deliveryOrderId=orderId;view='list';showPrices=true;renderDelivery();content.innerHTML",h.context);
 assert.match(table,/<th>合作价格<\/th><th>对客报价<\/th><th>Margin<\/th>/);
 assert.equal((table.match(/<td class="numeric">USD 50<\/td><td class="numeric">USD 450<\/td><td class="numeric">USD 400<\/td>/g)||[]).length,2);
 h.context.deliveryDetail(items[0].id);
 const detail=h.context.lastPanel.body;
 assert.match(detail,/aria-label="单条视频价格"/);
 assert.match(detail,/合作价 · 单条<\/span><strong>USD 50<\/strong>/);
 assert.match(detail,/对客价 · 单条<\/span><strong>USD 450<\/strong>/);
 assert.match(detail,/Margin · 单条<\/span><strong>USD 400<\/strong>/);
});

test('repeat proposal confirmation follows the selected project and respects visible cooperation details',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 h.context.creatorId=r.creatorId;h.context.projectId=r.campaignId;
 const repeated=vm.runInContext('existingProposals(creatorId,projectId)',h.context),fresh=vm.runInContext("existingProposals(creatorId,'not-an-existing-project')",h.context);
 assert.doesNotMatch(repeated,/name="independent"/);assert.match(repeated,/查看原提报/);assert.doesNotMatch(fresh,/name="independent"/);
 const opened=[];h.context.opened=opened;
 vm.runInContext("page='creators';coopDetail=id=>opened.push(id);",h.context);
 const button={dataset:{originalProposal:r.id},matches:()=>false,hasAttribute:()=>false};
 h.dispatch('click',{target:{closest:selector=>selector==='button'?button:null}});
 assert.deepEqual(opened,[r.id]);assert.equal(vm.runInContext('page',h.context),'followup');
});

test('proposal and delivery drawers stay in their own modules after obsolete cross-module controls are dispatched',()=>{
 const h=harness(),db=h.context.readDB(),projectId=db.collaborations.find(r=>r.id===h.id).campaignId;
 h.submit('submit',{campaignId:projectId,total:'550',currency:'USD',rights:'Package',quantity0:'2',type0:'视频',quantity1:'0',quantity2:'0'},db.creators[1].id);
 const proposalId=h.stored().collaborations.at(-1).id;
 h.submit('approve',{clientQuote:'1000'},proposalId);h.submit('agree',{clientPrice:'800'},proposalId);h.submit('confirm',{final:'550',rights:'Package',date:'2026-11-01'},proposalId);h.context.orderProposalId=proposalId;vm.runInContext("db.collaborations.find(r=>r.id===orderProposalId).ownerId='a';user=USERS.find(u=>u.id==='a');",h.context);h.submit('createOrder',{},proposalId);
 const proposal=h.context.readDB().collaborations.find(r=>r.id===proposalId),item=h.context.readDB().deliveryItems.find(r=>r.proposalId===proposalId);
 h.context.proposalId=proposalId;h.context.deliveryItemId=item.id;
 vm.runInContext("page='followup';q='proposal search';view='board';queue='all';",h.context);
 h.context.drawCoop(proposalId);
 const packageBody=h.context.lastPanel.body;
 assert.match(packageBody,new RegExp(model.orderNumber(h.context.readDB(),proposal.orderId)));
 assert.doesNotMatch(packageBody,/data-order-deliveries=|前往视频交付|已验收 \d+ 条|data-tab=|跟进备注/);
 const click=dataset=>h.dispatch('click',{target:{closest:selector=>selector==='button'?{dataset,matches:()=>false,hasAttribute:key=>key==='data-module-return'&&'moduleReturn' in dataset}:null}});
 const workspace=()=>vm.runInContext('JSON.stringify({page,q,view,queue,dialog})',h.context);
 const proposalWorkspace=workspace();
 click({orderDeliveries:proposal.orderId});click({moduleReturn:true});
 assert.equal(workspace(),proposalWorkspace);
 vm.runInContext("page='delivery';q='delivery search';view='list';queue='all';",h.context);
 h.context.deliveryDetail(item.id,'跟进记录');
 assert.equal(vm.runInContext('tab',h.context),'交付物');
 const deliveryBody=h.context.lastPanel.body;
 assert.doesNotMatch(deliveryBody,/data-original-proposal=|查看所属订单\s*\/\s*提报方案|data-order-deliveries=|data-module-return|data-tab=|跟进备注|结构化跟进与提醒/);
 const deliveryWorkspace=workspace();
 click({originalProposal:proposalId});
 h.context.openRelatedProposal(proposalId);
 h.context.drawCoop(proposalId);
 assert.equal(workspace(),deliveryWorkspace);
 assert.equal(h.context.lastPanel.body,deliveryBody);
});

test('return stack restores page, tab, filter and drawer scroll; frozen peers skip inaccessible records',()=>{
 const h=harness(),opened=[],scrolled=[];
 h.context.opened=opened;h.context.window={scrollY:150,scrollTo:(_x,y)=>scrolled.push(y)};
 h.context.content={querySelectorAll:()=>[]};
 // Existing harness root is the source of drawer state; keep DOM effects observable.
 vm.runInContext("globalThis.testRoot=root;globalThis.testContent=content;",h.context);
 const body={scrollTop:87};h.context.testRoot.querySelector=sel=>sel==='.profile-main'?body:null;
 h.context.testContent.querySelectorAll=()=>[];
 vm.runInContext("page='creators';q='Mia';dialog={kind:'creator',id:'creator-0'};tab='合作资料';drawerPeers=[{kind:'creator',id:'creator-0'},{kind:'creator',id:'creator-5'}];drawerStack=[drawerFrame()];page='followup';q='changed';showObject=(d,t)=>opened.push({id:d.id,tab:t});returnToSource();globalThis.returned={page,q,peers:drawerPeers,depth:drawerStack.length};",h.context);
 assert.equal(h.context.returned.page,'creators');assert.equal(h.context.returned.q,'Mia');assert.equal(body.scrollTop,87);assert.equal(scrolled.at(-1),150);assert.equal(opened[0].id,'creator-0');assert.equal(h.context.returned.depth,0);
 vm.runInContext("drawerPeers=[{kind:'creator',id:'missing'},{kind:'creator',id:'creator-5'}];openPeer(0);openPeer(1);",h.context);
 assert.equal(opened.length,2);assert.equal(opened[1].id,'creator-5');
 assert.equal(vm.runInContext('drawerNavigation()',h.context),'');
 h.context.navigationBaseId=h.id;
 vm.runInContext("page='followup';user=USERS.find(u=>u.id==='a');const navigationBase=db.collaborations.find(r=>r.id===navigationBaseId);db.collaborations.push(...[['nav-first','a'],['nav-hidden','b'],['nav-last','a']].map(([id,ownerId])=>({...structuredClone(navigationBase),id,ownerId})));dialog={kind:'coop',id:'nav-first'};drawerPeers=['nav-first','nav-hidden','nav-last'].map(id=>({kind:'coop',id}));showObject=(d,t)=>{opened.push({id:d.id,tab:t});dialog=d;};",h.context);
 // The rendered list can change while the drawer retains its original peer order.
 h.context.testContent.querySelectorAll=()=>[{dataset:{coop:'nav-last'}},{dataset:{coop:'nav-first'}}];
 const peerButtons=html=>[...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
 const first=vm.runInContext('drawerPeerNavigation()',h.context),buttons=peerButtons(first);
 assert.match(first,/class="drawer-peer-actions"/);assert.equal(buttons.length,2);
 for(const [index,label] of ['上一条','下一条'].entries()){
  assert.match(buttons[index][1],new RegExp('aria-label="'+label+'"'));assert.match(buttons[index][1],new RegExp('title="'+label+'"'));
  assert.match(buttons[index][2],/<svg\b/);assert.equal(buttons[index][2].replace(/<[^>]*>/g,'').trim(),'');
 }
 assert.match(buttons[0][1],/\bdisabled\b/);assert.match(buttons[1][1],/data-peer="2"/);assert.doesNotMatch(buttons[1][1],/\bdisabled\b/);
 assert.doesNotMatch(first,/关闭后返回|<small|\d+\s*\/\s*\d+/);
 const count=opened.length;vm.runInContext('openPeer(1)',h.context);assert.equal(opened.length,count);
 const next={dataset:{peer:'2'},matches:()=>false,hasAttribute:()=>false};h.dispatch('click',{target:{closest:selector=>selector==='button'?next:null}});
 assert.equal(opened.at(-1).id,'nav-last');
 const last=peerButtons(vm.runInContext('drawerPeerNavigation()',h.context));
 assert.match(last[0][1],/data-peer="0"/);assert.doesNotMatch(last[0][1],/\bdisabled\b/);assert.match(last[1][1],/\bdisabled\b/);
 const back=vm.runInContext('drawerStack=[drawerFrame()];drawerNavigation()',h.context);
 assert.match(back,/data-drawer-back/);assert.match(back,/返回上一步/);assert.doesNotMatch(back,/data-peer|关闭后返回|\d+\s*\/\s*\d+/);
 assert.equal(vm.runInContext('drawerStack=[];drawerPeers=[dialog];drawerPeerNavigation()',h.context),'');
});

test('unsaved guard only blocks destructive navigation and preserves dirty state when cancelled',()=>{
 const h=harness();h.context.confirm=()=>false;
 const button=dataset=>({dataset,hasAttribute:key=>key==='data-close'&&dataset.close===true});
 h.context.testButton=button({});assert.equal(vm.runInContext('losesDrawerInput(testButton)',h.context),false);
 h.context.testButton=button({tab:'跟进记录'});assert.equal(vm.runInContext('losesDrawerInput(testButton)',h.context),true);
 vm.runInContext("tab='跟进记录';",h.context);assert.equal(vm.runInContext('losesDrawerInput(testButton)',h.context),false);
 h.context.testButton=button({close:true});assert.equal(vm.runInContext('losesDrawerInput(testButton)',h.context),true);
 assert.equal(vm.runInContext('drawerDirty=true;confirmDiscard()',h.context),false);assert.equal(vm.runInContext('drawerDirty',h.context),true);
 h.context.confirm=()=>true;assert.equal(vm.runInContext('confirmDiscard()',h.context),true);assert.equal(vm.runInContext('drawerDirty',h.context),false);
});

test('submitted proposal form ignores a second dispatch after successful persistence',()=>{
 const h=harness(),db=h.context.readDB(),campaignId=db.collaborations.find(x=>x.id===h.id).campaignId;
 const values={campaignId,total:'550',currency:'USD',rights:'30 days',quantity0:'1',type0:'video',quantity1:'0',quantity2:'0'};
 const {form}=h.submit('submit',values,db.creators[1].id),count=h.stored().collaborations.length;
 assert.equal(form.dataset.committed,'true');h.dispatch('submit',{preventDefault(){},target:form});assert.equal(h.stored().collaborations.length,count);
});

test('delivery waiting labels name the next actor instead of linking back to the same module',()=>{
 const h=harness(),db=h.context.readDB(),record=db.collaborations.find(x=>x.id===h.id),operator=model.USERS.find(x=>x.id===record.ownerId)||model.USERS.find(x=>x.id==='a');
 const r={...record,ownerId:operator.id,orderId:'order-test',proposalId:'proposal-test',status:'脚本待 PM 初审'};
 // Use a real operator member to exercise the non-reviewer branch.
 r.ownerId='a';const a=model.USERS.find(x=>x.id==='a');
 assert.equal(model.nextStep(db,a,r).label,'等待 PM 处理');
});

test('capture-phase navigation cancellation prevents the real handler from replacing dirty content',()=>{
 const h=harness(),opened=[];let prevented=false,prompts=0;
 h.context.opened=opened;h.context.confirm=()=>{prompts++;return false;};
 vm.runInContext("creatorDetail=id=>opened.push(id);",h.context);
 const form={dataset:{kind:'publish'}},input={dataset:{},value:'https://example.com/unsaved',matches:()=>false,closest:selector=>selector==='.detail-drawer'?{}:selector==='form'?form:null};
 h.dispatchFull('input',{target:input});
 assert.equal(form.dataset.dirty,'true');assert.equal(vm.runInContext('drawerDirty',h.context),true);
 const b={dataset:{creator:'creator-1'},hasAttribute:()=>false},target={closest:selector=>selector==='button'?b:null};
 h.dispatchFull('click',{target,preventDefault(){prevented=true;}});
 assert(prevented);assert.equal(prompts,1);assert.equal(opened.length,0);assert.equal(vm.runInContext('drawerDirty',h.context),true);
 const closeButton={dataset:{close:''},hasAttribute:key=>key==='data-close'};
 h.dispatchFull('click',{target:{closest:selector=>selector==='button'?closeButton:null},preventDefault(){prevented=true;}});
 assert.equal(prompts,2);assert.equal(input.value,'https://example.com/unsaved');assert.equal(vm.runInContext('drawerDirty',h.context),true);
 const summaryTarget={closest:selector=>selector.startsWith('a,')?{}:null};
 h.dispatchFull('click',{target:summaryTarget,preventDefault(){throw Error('Expanding details must not be blocked');}});assert.equal(prompts,2);
});

test('invalid delivery form keeps inputs and points to the field needed for a successful retry',()=>{
 const h=harness();let focused=false;const input={name:'url',value:'',validity:{valid:true},setAttribute(k,v){this[k]=v;},focus(){focused=true;}};
 h.context.invalidForm={querySelectorAll:()=>[input]};
 vm.runInContext("focusInvalidField(invalidForm,'请填写有效的 HTTP 或 HTTPS 交付链接')",h.context);
 assert(focused);assert.equal(input['aria-invalid'],'true');assert.equal(input['aria-describedby'],'dialog-message');
});

test('empty project membership renders actionable submission guidance and no form',()=>{
 const h=harness();vm.runInContext("user={id:'no-project',role:'operator',name:'No project'};globalThis.emptySubmission=submissionForm('creator-0');",h.context);
 assert.match(h.context.emptySubmission,/暂无可提报项目/);assert.doesNotMatch(h.context.emptySubmission,/<form/);
});


test('removed followup tab requests fall back to proposal content without rendering notes',()=>{
 const h=harness();let rendered='';h.context.panel=(_title,body)=>{rendered=body;};
 h.context.drawCoop(h.id,'跟进记录');
 assert.match(rendered,/quote-panel/);assert.doesNotMatch(rendered,/data-tab="跟进记录"|跟进备注|结构化跟进与提醒|data-kind="note"/);
 assert.equal(vm.runInContext('tab',h.context),'合作资料');
 h.context.drawCoop(h.id,'合作资料');
 assert.doesNotMatch(rendered,/class="operation-panel"/);assert.doesNotMatch(rendered,/提报编号|progress-track/);
 assert.doesNotMatch(rendered,/<dt>关闭原因<\/dt>/);
});

test('proposal rows omit next-step column for every account and keep row detail access',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 const c=db.creators.find(x=>x.id===r.creatorId);c.accounts=[{platform:'Instagram',handle:'@multi',url:'',followers:100},{platform:'YouTube',handle:'@channel',url:'',followers:200}];
 for(const account of model.USERS){
  for(const prices of [false,true]){
   vm.runInContext(`user=USERS.find(u=>u.id===${JSON.stringify(account.id)});showPrices=${prices};`,h.context);
   const html=h.context.orders([r]);
   assert.match(html,/Instagram \/ YouTube/);assert.doesNotMatch(html,/下一步|next-action/);
   assert.equal((html.match(/<th scope=/g)||[]).length,prices?9:7);
   assert.equal((html.match(/<td[ >]/g)||[]).length,prices?9:7);
   assert.match(html,/<th scope="col">最近更新<\/th><th scope="col">停留时间（小时）<\/th>/);
   assert.match(html,/data-detail-row/);assert.match(html,/查看提报/);
  }
 }
});


test('reload restores each module, account, filters and project context without reopening drawers',()=>{
 for(const module of ['creators','followup','delivery','projects']){
  const values=new Map(),session={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const first=harness(session),before=first.stored();
  vm.runInContext(`user=USERS.find(u=>u.role==='pm');page='${module}';campaignId=projectsFor(db,user)[0].id;projectTab='members';projectView='board';q='Isla';view=page==='delivery'?'group':'board';queue='all';dialog={kind:'creator',id:db.creators[0].id};rememberWorkspace();`,first.context);
  const saved=JSON.parse(values.get('solbridge-crm-location-v1'));
  const second=harness(session);
  const restored=vm.runInContext('restoreLocation();restoreWorkspace();({userId:user.id,page,campaignId,projectTab,projectView,q,view,queue,dialog})',second.context);
  assert.equal(restored.userId,saved.userId);assert.equal(restored.page,module);
  assert.equal(restored.projectTab,'members');assert.equal(restored.projectView,'board');assert(restored.campaignId);
  assert.equal(restored.q,'Isla');assert.equal(restored.queue,'all');assert.equal(restored.view,module==='delivery'?'group':'board');assert.equal(restored.dialog,null);
  assert.deepEqual(first.stored(),before);
 }
});

test('saved session filters for removed proposal stages restore to their retained equivalents',()=>{
 for(const module of ['followup','projects'])for(const previousStage of ['客户筛选','谈价中']){
  const values=new Map(),session={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const first=harness(session),before=first.stored();
  vm.runInContext(`page='${module}';stage='${previousStage}';status='待客户审核';q='Isla';view='board';queue='all';rememberWorkspace();`,first.context);
  const restored=harness(session);
  const state=vm.runInContext('restoreLocation();restoreWorkspace();({page,stage,status,q,view,queue})',restored.context);
  assert.equal(state.page,module);assert.equal(state.stage,'谈价中');assert.equal(state.status,'议价待客户确认');
  assert.equal(state.q,'Isla');assert.equal(state.view,'board');assert.equal(state.queue,'all');
  const final=vm.runInContext("applyWorkspace({stage:'客户最终确认',status:'待客户最终确认'});({stage,status})",restored.context);
  assert.equal(final.stage,'合作确认');assert.equal(final.status,'待达人确认');
  assert.deepEqual(first.stored(),before);
 }
});

test('refresh falls back safely for missing, corrupt and inaccessible session state',()=>{
 for(const raw of [undefined,'{broken','null','[]',JSON.stringify({userId:'removed',page:'invalid'})]){
  const h=harness({getItem:k=>k==='solbridge-crm-location-v1'?raw:'{}',setItem:()=>{}});
  const state=vm.runInContext('restoreLocation();restoreWorkspace();({userId:user.id,page})',h.context);
  assert.equal(state.userId,model.USERS[0].id);assert.equal(state.page,'followup');
 }
 const h=harness({getItem:()=>{throw Error('unavailable');},setItem:()=>{throw Error('unavailable');}});
 assert.doesNotThrow(()=>vm.runInContext('restoreLocation();restoreWorkspace();rememberWorkspace()',h.context));
 vm.runInContext("page='projects';applyWorkspace({campaignId:'removed-project',campaignFilter:'removed-project',projectTab:'invalid',projectView:'invalid',q:{bad:true}})",h.context);
 assert.equal(vm.runInContext('campaignId',h.context),'');assert.equal(vm.runInContext('campaignFilter',h.context),'全部');assert.equal(vm.runInContext('projectTab',h.context),'orders');assert.equal(vm.runInContext('q',h.context),'');
 assert.doesNotThrow(()=>vm.runInContext('applyWorkspace(null)',h.context));
});

test('refresh restores page and nested table scroll positions with invalid offsets ignored',()=>{
 const h=harness(),positions=[{scrollLeft:0},{scrollLeft:0}];let y;
 h.context.window={scrollTo:(_x,value)=>{y=value;}};
 h.context.scrollElements=positions;
 vm.runInContext('content.querySelectorAll=()=>scrollElements;restoreScroll({scroll:360,scrolls:[120,45]})',h.context);
 assert.equal(y,360);assert.deepEqual(positions.map(x=>x.scrollLeft),[120,45]);
 vm.runInContext('restoreScroll({scroll:-1,scrolls:["bad",null]})',h.context);
 assert.equal(y,0);assert.deepEqual(positions.map(x=>x.scrollLeft),[0,0]);
});

test('creator routes preserve list state and render missing records safely',()=>{
 const h=harness();h.context.window={scrollY:240,scrollTo(){},location:{hash:'#creators',pathname:'/index.html',search:''},history:{pushState(_a,_b,url){h.context.window.location.hash=url;}}};
 vm.runInContext("content.querySelectorAll=()=>[];page='creators';q='Isla';country='澳大利亚';openCreatorPage('creator-53');",h.context);
 assert.equal(h.context.window.location.hash,'#creators/creator-53');
 assert.equal(vm.runInContext('creatorPageId',h.context),'creator-53');
 vm.runInContext("renderCreatorPage();globalThis.profileHTML=content.innerHTML;q='changed';backToCreators();",h.context);
 assert.match(h.context.profileHTML,/均播/);assert.match(h.context.profileHTML,/data-creators-back/);
 assert.equal(vm.runInContext('q',h.context),'Isla');assert.equal(vm.runInContext('creatorPageId',h.context),'');
 vm.runInContext("creatorPageId='missing';renderCreatorPage();globalThis.missingHTML=content.innerHTML;",h.context);assert.match(h.context.missingHTML,/达人不存在/);
 assert.equal(vm.runInContext("creatorRoute('#creators/a%2Fb')",h.context),'a/b');
});

test('client quote saves are permission checked and roll back on storage failure',()=>{
 const h=harness(),before=JSON.stringify(h.context.readDB());h.setFailure(true);
 const {form}=h.submit('clientQuote',{clientQuote:'1800'});assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(form.values.clientQuote,'1800');
 h.setFailure(false);h.submit('clientQuote',form.values);assert.equal(h.stored().collaborations.find(r=>r.id===h.id).clientQuote,1800);assert.equal(h.stored().collaborations.find(r=>r.id===h.id).clientPrice,1500);
 vm.runInContext("user=USERS.find(u=>u.role==='operator');",h.context);h.submit('clientQuote',{clientQuote:'1'});assert.equal(h.stored().collaborations.find(r=>r.id===h.id).clientQuote,1800);assert.match(h.message.textContent,/仅项目 PM/);
});

test('submission quote input belongs only to project PM and admins',()=>{
 const h=harness();h.context.pid=h.context.readDB().collaborations.find(r=>r.id===h.id).campaignId;
 assert.match(vm.runInContext('submissionQuoteField(pid)',h.context),/name="clientQuote"/);
 vm.runInContext("user=USERS.find(u=>u.role==='operator');",h.context);assert.equal(vm.runInContext('submissionQuoteField(pid)',h.context),'');
 vm.runInContext("globalThis.facts=creatorSubmissionFacts(db.creators[0]);",h.context);assert.match(h.context.facts,/达人昵称/);assert.match(h.context.facts,/邮箱/);assert.match(h.context.facts,/均播/);
});

test('creator profile rendering uses current records and does not mix project quotations',()=>{
 const h=harness();vm.runInContext("globalThis.id=db.creators[0].id;db.creators[0].name='Updated creator';db.creators[0].accounts=[{platform:'Instagram',handle:'@one',url:'https://instagram.com/one',followers:0,views:0}];globalThis.body=creatorProfileBody(id);",h.context);
 assert.match(h.context.body,/Updated creator/);assert.match(h.context.body,/粉丝 0/);assert.match(h.context.body,/均播 0/);assert.doesNotMatch(h.context.body,/name="clientQuote"/);
});

test('submission opens the creator page, carries a reloadable route and never opens a drawer',()=>{
 const h=harness();h.context.window={scrollY:0,scrollTo(){},history:{pushState(_a,_b,url){h.context.route=url;}}};
 vm.runInContext("page='creators';db.collaborations=[];content.querySelectorAll=()=>[];panel=()=>{throw Error('submission must not open drawer');};openObject('submit','creator-0');renderCreatorPage();globalThis.html=content.innerHTML;",h.context);
 assert.equal(h.context.route,'#creators/creator-0/submit');assert.equal(vm.runInContext("creatorRoute('#creators/creator-0/submit')",h.context),'creator-0');
 assert.match(h.context.html,/data-kind="submit"/);assert.match(h.context.html,/submission-message/);
 assert(h.context.html.indexOf('data-kind="submit"')<h.context.html.lastIndexOf('<h3>关联合作'));
});

test('new creator clears hiding filters after persistence and does not create a collaboration',()=>{
 const h=harness(),count=h.context.readDB().collaborations.length;
 vm.runInContext("q='nonmatching';country='德国';platform='TikTok';minimumFollowers=500000;",h.context);
 h.submit('creator',{handle:'@new_record',profile:'https://instagram.com/new_record',contact:'creator@example.com',name:'New record',platform:'Instagram',country:'美国',language:'英语',followers:'0',views:'0'});
 assert.equal(h.stored().creators.at(-1).name,'New record');assert.equal(h.stored().collaborations.length,count);
 assert.equal(vm.runInContext('q',h.context),'');assert.equal(vm.runInContext('minimumFollowers',h.context),0);
 assert.equal(vm.runInContext('country',h.context),'全部');
});

test('page proposal save failure preserves input and dirty state, retry retains submitted status',()=>{
 const h=harness();const creator=h.context.readDB().creators[1],project=h.context.readDB().campaigns.at(-1);
 vm.runInContext("pageDirty=true;creatorSubmitOpen=true;",h.context);h.setFailure(true);
 const values={campaignId:project.id,total:'100',rights:'one video',currency:'USD',quantity0:'1',type0:'视频',quantity1:'0',quantity2:'0',reason:'keep me'};
 const result=h.submit('submit',values,creator.id);assert.equal(result.form.values.reason,'keep me');assert.equal(vm.runInContext('pageDirty',h.context),true);assert.match(h.message.textContent,/保存失败/);
 h.setFailure(false);h.submit('submit',values,creator.id);assert.equal(vm.runInContext('creatorSubmitOpen',h.context),true);assert.equal(vm.runInContext('pageDirty',h.context),false);
 assert.equal(h.stored().collaborations.at(-1).creatorId,creator.id);
});

test('page dirty guard cancels navigation without clearing input state',()=>{
 const h=harness();h.context.confirm=()=>false;vm.runInContext('pageDirty=true;',h.context);
 assert.equal(vm.runInContext('confirmDiscard()',h.context),false);assert.equal(vm.runInContext('pageDirty',h.context),true);
 h.context.confirm=()=>true;assert.equal(vm.runInContext('confirmDiscard()',h.context),true);assert.equal(vm.runInContext('pageDirty',h.context),false);
});

test('failed creator creation preserves filters and duplicate accounts do not add records',()=>{
 const h=harness(),count=h.stored().creators.length;
 const values={handle:'@retry_new',profile:'https://instagram.com/retry_new',contact:'creator@example.com',name:'Retry new',platform:'Instagram',country:'美国',language:'英语',followers:'0',views:'0'};
 vm.runInContext("q='keep filter';country='德国';",h.context);h.setFailure(true);h.submit('creator',values);
 assert.equal(h.stored().creators.length,count);assert.equal(vm.runInContext('q',h.context),'keep filter');assert.equal(vm.runInContext('country',h.context),'德国');
 h.setFailure(false);h.submit('creator',values);assert.equal(h.stored().creators.length,count+1);
 h.submit('creator',values);assert.equal(h.stored().creators.length,count+1);assert.equal(model.creatorInitiators(h.stored().creators.at(-1)).length,1);
});

test('creator detail hides proposal form until requested and can preserve a pending form across renders',()=>{
 const h=harness();vm.runInContext("content.querySelectorAll=()=>[];creatorPageId='creator-0';creatorSubmitOpen=false;renderCreatorPage();globalThis.html=content.innerHTML;",h.context);
 assert.doesNotMatch(h.context.html,/data-kind="submit"/);
 vm.runInContext("creatorSubmitOpen=true;renderCreatorPage();globalThis.expanded=content.innerHTML;",h.context);assert.match(h.context.expanded,/data-kind="submit"/);
 const fields=[{name:'campaignId',value:'project-test',type:'select-one'},{name:'total',value:'333',type:'number'},{name:'independent',value:'on',type:'checkbox',checked:true}];
 const form={dataset:{id:'creator-0'},elements:fields};h.context.draftForm=form;
 const draft=vm.runInContext("content.querySelector=()=>draftForm;captureSubmissionDraft()",h.context);
 assert.equal(draft.fields[1].value,'333');assert.equal(draft.fields[2].checked,true);
});


test('single creator saves before asking whether to propose, failure never opens success prompt',()=>{
 const h=harness(),before=h.stored(),values={handle:'@modal_test',profile:'https://instagram.com/modal_test',contact:'modal@example.com',name:'Modal creator',platform:'Instagram',country:'美国',language:'英语',followers:'',views:''};
 h.setFailure(true);const failed=h.submit('creator',values);
 assert.equal(h.context.lastPanel,undefined);assert.equal(h.stored().creators.length,before.creators.length);assert.equal(failed.form.values.name,'Modal creator');
 h.setFailure(false);h.submit('creator',values);
 assert.equal(h.stored().creators.length,before.creators.length+1);assert.equal(h.stored().collaborations.length,before.collaborations.length);
 assert.equal(h.context.lastPanel.title,'达人已保存');assert.match(h.context.lastPanel.body,/是否立即提报到项目/);assert.match(h.context.lastPanel.body,/暂不提报/);assert.match(h.context.lastPanel.body,/data-submit-creator/);
 assert.equal(vm.runInContext('drawerDirty',h.context),false);
});

test('saved creator without project membership has an explanation and no proposal action',()=>{
 const h=harness();vm.runInContext("user=USERS.find(u=>u.role==='operator');db.campaigns=[];creatorSavedPrompt(db.creators[0].id);",h.context);
 assert.match(h.context.lastPanel.body,/暂无可参与项目/);assert.doesNotMatch(h.context.lastPanel.body,/data-submit-creator/);
});

test('compact drawer hides empty submitters, renders only basics and keeps editing scoped',()=>{
 const h=harness();
 const html=vm.runInContext("db.collaborations=[];creatorDrawerBody(db.creators[0])",h.context);
 assert.doesNotMatch(html,/提报人|关联合作|creator-kpis/);assert.match(html,/账号信息/);assert.match(html,/编辑基础信息/);
});
test('drawer basic save rolls back on storage failure and preserves account metrics',()=>{
 const h=harness(),before=structuredClone(h.context.readDB().creators[0]);h.setFailure(true);
 const values={country:'泰国',language:'泰语',creatorType:'KOL',contact:'test@example.com',notes:'keep this'};
 h.submit('creatorBasic',values,before.id);assert.deepEqual(h.stored().creators[0],before);assert.match(h.message.textContent,/保存失败/);
 vm.runInContext('creatorDetail=()=>{};',h.context);h.setFailure(false);h.submit('creatorBasic',values,before.id);
 assert.equal(h.stored().creators[0].notes,'keep this');assert.deepEqual(h.stored().creators[0].accounts,before.accounts);
});
test('duplicate proposal warns without creating another record and never leaks quotation',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id),before=db.collaborations.length;
 h.context.cid=r.creatorId;h.context.pid=r.campaignId;
 vm.runInContext("user=USERS.find(u=>u.id==='a');checkExistingProposal(cid,pid)",h.context);
 assert.match(h.message.textContent,/该达人已在该项目有合作/);assert.doesNotMatch(h.message.textContent,/查看原提报|报价/);
 assert.equal(db.collaborations.length,before);
});

test('intake recognizes channel tabs and rejects content links and lookalike domains',()=>{
 const h=harness();
 const a=vm.runInContext("parseCreatorProfile('https://www.youtube.com/@SkymanCG/videos?view=0')",h.context);
 assert.equal(a.handle,'@SkymanCG');assert.equal(a.url,'https://youtube.com/@SkymanCG');
 for(const url of ['https://youtube.com/watch?v=x','https://youtube.com/shorts/x','https://youtube.com.evil.example/@abc'])assert.throws(()=>vm.runInContext('parseCreatorProfile('+JSON.stringify(url)+')',h.context));
});
test('intake saves multiple independent account metrics atomically and retries without duplicates',()=>{
 const h=harness(),count=h.stored().creators.length;
 const values={name:'Multi platform',contact:'multi@example.com',country:'美国',language:'英语',accountsJSON:JSON.stringify([{url:'https://www.tiktok.com/@multi_test',followers:'123',views:'0'},{url:'https://www.youtube.com/@MultiTest/videos',followers:'',views:'42'}])};
 h.setFailure(true);h.submit('creator',values);assert.equal(h.stored().creators.length,count);assert.match(h.message.textContent,/保存失败/);
 h.setFailure(false);h.submit('creator',values);const c=h.stored().creators.at(-1);assert.equal(c.accounts.length,2);assert.equal(c.accounts[0].views,0);assert.equal(c.accounts[1].followers,null);assert.equal(c.accounts[1].views,42);
 h.submit('creator',values);assert.equal(h.stored().creators.length,count+1);
});

test('bulk deletion is atomic, permission checked and protects project history',()=>{
 const db=completeFixture(),u=model.USERS.find(u=>u.id==='a');
 db.creators.push({id:'free1',name:'One',createdBy:'a'},{id:'free2',name:'Two',createdBy:'a'},{id:'other',name:'Other',createdBy:'b'});
 const before=JSON.stringify(db);
 assert.throws(()=>model.deleteCreators(db,u,['free1','other']),/发起人/);
 assert.equal(JSON.stringify(db),before);
 assert.throws(()=>model.deleteCreators(db,u,['free1',db.creators[0].id]),/关联/);
 assert.equal(JSON.stringify(db),before);
 assert.throws(()=>model.deleteCreators(db,u,['free1','missing']),/不存在/);
 assert.equal(JSON.stringify(db),before);
 db.orders=[{creatorId:'free2'}];
 assert.throws(()=>model.deleteCreators(db,u,['free1','free2']),/关联/);
 db.orders=[];
 assert.equal(model.deleteCreators(db,u,['free1','free2','free1']),2);
 assert(db.creators.some(c=>c.id==='other'));
 assert.equal(db.collaborations.length,100);
});

test('bulk delete cancellation and storage failure preserve records and selection',()=>{
 const h=harness();
 vm.runInContext("db.creators.push({id:'free',name:'Test',createdBy:user.id});selectedCreators.add('free');globalThis.confirm=()=>false;renderOperatorCreatorList=()=>{};globalThis.bulkButton={hasAttribute:k=>k==='data-delete-creators'};",h.context);
 vm.runInContext('handleWorkspaceClick(bulkButton)',h.context);
 assert(h.context.readDB().creators.some(c=>c.id==='free'));
 vm.runInContext('globalThis.confirm=()=>true',h.context);h.setFailure(true);
 assert.throws(()=>vm.runInContext('handleWorkspaceClick(bulkButton)',h.context),/保存失败/);
 assert(h.context.readDB().creators.some(c=>c.id==='free'));
 assert.equal(vm.runInContext('selectedCreators.size',h.context),1);
 h.setFailure(false);vm.runInContext('handleWorkspaceClick(bulkButton)',h.context);
 assert(!h.stored().creators.some(c=>c.id==='free'));
 assert.equal(vm.runInContext('selectedCreators.size',h.context),0);
});

test('creator bulk selection is limited to current results and cleared when scope changes',()=>{
 const h=harness();
 vm.runInContext("db.creators.push({id:'free',name:'FindMe',createdBy:user.id});selectedCreators.add('free');creatorSelectionScope=JSON.stringify([user.id,q,platform,country,minimumFollowers]);renderOperatorCreatorList();",h.context);
 assert.equal(vm.runInContext('selectedCreators.size',h.context),1);
 assert.match(vm.runInContext('content.innerHTML',h.context),/data-select-creator="free" aria-label="选择 FindMe" checked/);
 vm.runInContext("q='no-match';renderOperatorCreatorList()",h.context);
 assert.equal(vm.runInContext('selectedCreators.size',h.context),0);
});


test('confirmed reset clears creator work once and preserves projects and subsequent additions',()=>{
 const db=completeFixture();
 db.orders=[{id:'order'}];db.deliveryItems=[{id:'video'}];db.followUps=[{id:'note'}];db.tasks=[{id:'task'}];
 db.savedViews=[{id:'view'}];
 const projects=JSON.stringify(db.campaigns),users=JSON.stringify(model.USERS);
 assert.equal(model.applyConfirmedCreatorReset(db),true);
 for(const key of ['creators','collaborations','orders','deliveryItems','followUps','tasks'])assert.deepEqual(db[key],[]);
 assert.equal(JSON.stringify(db.campaigns),projects);
 assert.equal(JSON.stringify(model.USERS),users);
 assert.equal(db.savedViews.length,1);
 db.creators.push({id:'new',name:'New'});
 const restored=JSON.parse(JSON.stringify(db));
 assert.equal(model.applyConfirmedCreatorReset(restored),false);
 assert.equal(restored.creators[0].id,'new');
});


test('new creator requires country and language and converts k metrics without changing zero or blanks',()=>{
 const h=harness();
 const values={name:'K units',contact:'k@example.com',country:'美国',language:'英语',metricsUnit:'k',accountsJSON:JSON.stringify([{url:'https://tiktok.com/@units_test',followers:'12.5',views:'0'},{url:'https://youtube.com/@UnitsTest',followers:'',views:'1.001'}])};
 const initial=h.context.readDB().creators.length;
 h.submit('creator',{...values,country:''});assert.equal(h.context.readDB().creators.length,initial);assert.match(h.message.textContent,/请选择国家/);
 h.submit('creator',{...values,language:''});assert.equal(h.context.readDB().creators.length,initial);assert.match(h.message.textContent,/请选择语言/);
 h.submit('creator',values);
 const creator=h.stored().creators.find(c=>c.name==='K units');
 assert.equal(creator.accounts[0].followers,12500);assert.equal(creator.accounts[0].views,0);
 assert.equal(creator.accounts[1].followers,null);assert.equal(creator.accounts[1].views,1001);
 assert.equal(vm.runInContext("intakeMetricValue('1.001','k')",h.context),1001);
 assert.throws(()=>vm.runInContext("intakeMetricValue('-1','k')",h.context));
 assert.throws(()=>vm.runInContext("intakeMetricValue('0.0001','k')",h.context));
});


test('save toast expires after five seconds and a new save restarts its timer',()=>{
 const h=harness(),toast={hidden:true,textContent:''},jobs=new Map();let sequence=0;
 h.context.document.getElementById=id=>id==='crm-save-toast'?toast:null;
 h.context.setTimeout=(fn,delay)=>{assert.equal(delay,5000);jobs.set(++sequence,fn);return sequence;};
 h.context.clearTimeout=id=>jobs.delete(id);
 vm.runInContext("showSaveToast('第一次保存')",h.context);
 assert.equal(toast.hidden,false);assert.equal(toast.textContent,'第一次保存');
 vm.runInContext("showSaveToast('第二次保存')",h.context);
 assert.equal(jobs.size,1);assert.equal(toast.textContent,'第二次保存');
 [...jobs.values()][0]();
 assert.equal(toast.hidden,true);assert.equal(toast.textContent,'');
});

test('five-character creator codes stay unique and stable without changing relationship IDs',()=>{
 const db=completeFixture(),ids=db.creators.map(c=>c.id),links=JSON.stringify(db.collaborations);
 assert.equal(model.ensureCreatorCodes(db),true);
 const codes=db.creators.map(c=>c.displayCode);
 assert(codes.every(code=>/^[A-Z0-9]{5}$/.test(code)));
 assert.equal(new Set(codes).size,codes.length);
 assert.equal(model.ensureCreatorCodes(db),false);
 assert.deepEqual(db.creators.map(c=>c.id),ids);
 assert.equal(JSON.stringify(db.collaborations),links);
 const removed=db.creators.pop().displayCode;
 db.creators.push({id:'new',name:'New'});
 model.ensureCreatorCodes(db);
 assert.notEqual(db.creators.at(-1).displayCode,removed);
 assert.equal(model.creatorResults(db,model.USERS[0],db.creators.at(-1).displayCode).at(-1).id,'new');
});


test('sequential creator codes migrate once to mixed random codes and survive reload',()=>{
 const db=completeFixture();db.creators.forEach((c,i)=>c.displayCode=String(i+1).padStart(5,'0'));
 const old=db.creators.map(c=>c.displayCode);
 model.ensureCreatorCodes(db);
 const codes=db.creators.map(c=>c.displayCode);
 assert(codes.every(c=>/^[A-HJ-NP-Z2-9]{5}$/.test(c)&&/[A-Z]/.test(c)&&/[2-9]/.test(c)));
 assert(codes.every(c=>!old.includes(c)));
 const reload=JSON.parse(JSON.stringify(db));assert.equal(model.ensureCreatorCodes(reload),false);
 assert.deepEqual(reload.creators.map(c=>c.displayCode),codes);
 reload.creators[1].displayCode=reload.creators[0].displayCode;
 assert.equal(model.ensureCreatorCodes(reload),true);
 assert.equal(new Set(reload.creators.map(c=>c.displayCode)).size,reload.creators.length);
});

test('drawer adds accounts without replacing old metrics, handles duplicates and retries storage failure',()=>{
 const h=harness();
 vm.runInContext("creatorDetail=()=>{};globalThis.creatorID=db.creators[0].id;",h.context);
 const id=h.context.creatorID,before=JSON.stringify(model.socialAccounts(h.context.readDB().creators[0]));
 const values={profile:'https://www.youtube.com/@ExtraAccount/videos',followers:'12.5',views:'0'};
 h.setFailure(true);h.submit('creatorAccountAdd',values,id);
 assert.equal(JSON.stringify(model.socialAccounts(h.context.readDB().creators[0])),before);
 assert.match(h.message.textContent,/保存失败/);
 h.setFailure(false);h.submit('creatorAccountAdd',values,id);
 const accounts=model.socialAccounts(h.stored().creators[0]);
 assert.deepEqual(accounts.slice(0,-1).map(({creatorId,...account})=>account),JSON.parse(before));
 assert.equal(accounts.at(-1).platform,'YouTube');assert.equal(accounts.at(-1).followers,12500);assert.equal(accounts.at(-1).views,0);
 h.submit('creatorAccountAdd',values,id);
 assert.match(h.message.textContent,/已添加/);assert.equal(model.socialAccounts(h.stored().creators[0]).length,accounts.length);
 const other=h.context.readDB().creators[1].id;
 h.submit('creatorAccountAdd',values,other);
 assert.match(h.message.textContent,/其他达人/);
});

test('drawer account addition obeys creator edit permissions',()=>{
 const h=harness();
 vm.runInContext("user=USERS.find(u=>u.id==='pm2');globalThis.creatorID=db.creators[0].id;globalThis.drawerBody=creatorDrawerBody(db.creators[0],'add-account');",h.context);
 assert.doesNotMatch(h.context.drawerBody,/data-kind="creatorAccountAdd"/);
 const before=JSON.stringify(h.context.readDB());
 h.submit('creatorAccountAdd',{profile:'https://tiktok.com/@no_permission',followers:'1',views:'2'},h.context.creatorID);
 assert.match(h.message.textContent,/无权/);assert.equal(JSON.stringify(h.context.readDB()),before);
});

test('compact proposal restricts types and platforms while retaining distribution and quantities',()=>{
 const h=harness();
 vm.runInContext("globalThis.creator={accounts:[{platform:'Instagram',handle:'@one',url:'https://instagram.com/one'},{platform:'TikTok',handle:'@two',url:'https://tiktok.com/@two'}]};globalThis.compactHTML=creatorProposalFields(creator);",h.context);
 assert.match(h.context.compactHTML,/dedicated/);assert.match(h.context.compactHTML,/integration/);assert.match(h.context.compactHTML,/reel/);assert.match(h.context.compactHTML,/short/);
 assert.match(h.context.compactHTML,/<option value="YouTube" disabled/);assert.doesNotMatch(h.context.compactHTML,/name="publication/);
 h.context.values={compactProposal:'1',quantity0:'2',type0:'integration',publication0:['Instagram'],total:'100',rights:'video'};
 vm.runInContext("globalThis.data={get:k=>values[k]??null,getAll:k=>values[k]||[]};validateCompactProposal(data,creator);globalThis.parsed=packageData(data);",h.context);
 assert.equal(h.context.parsed.items.length,1);assert.equal(h.context.parsed.items[0].quantity,2);
 assert.equal(h.context.parsed.items[0].publicationPlatforms[0],'Instagram');
 h.context.values.type0='视频';assert.throws(()=>vm.runInContext('validateCompactProposal(data,creator)',h.context),/内容类型/);
 h.context.values.type0='short';h.context.values.publication0=['YouTube'];
 assert.throws(()=>vm.runInContext('validateCompactProposal(data,creator)',h.context),/补充/);
 h.context.values={compactProposal:'1'};assert.throws(()=>vm.runInContext('validateCompactProposal(data,creator)',h.context),/至少/);
});


test('platform selectors serialize cooperation notes separately from creator notes',()=>{
 const h=harness();
 h.context.values={compactProposal:'2',deliveryPlatform0:'Instagram',quantity0:'1',type0:'reel',publication0:['YouTube'],cooperationNotes:'同步分发到 YouTube 一条',rights:'video',total:'100',currency:'USD'};
 vm.runInContext("globalThis.parsed=packageData({get:k=>values[k]??null,getAll:k=>values[k]||[]});",h.context);
 const data=JSON.parse(JSON.stringify(h.context.parsed));
 assert.equal(data.items[0].platform,'Instagram');assert.deepEqual(data.items[0].publicationPlatforms,[]);
 const db=completeFixture(),admin=model.USERS.find(u=>u.role==='admin');
 db.creators[0].notes='达人长期资料备注';
 const r=model.submitCreator(db,admin,db.creators[0].id,{campaignId:db.campaigns[1].id,initial:100,rights:'video'});
 model.enablePackage(db,admin,r.id,data);
 assert.equal(r.proposalVersions[0].cooperationNotes,'同步分发到 YouTube 一条');
 assert.equal(db.creators[0].notes,'达人长期资料备注');
 assert.deepEqual(r.proposalVersions[0].items[0].publicationPlatforms,['Instagram']);
 assert.equal(JSON.parse(JSON.stringify(r)).proposalVersions[0].cooperationNotes,data.cooperationNotes);
});

test('new proposal saves USD and optional rights without client quote or recommendation controls',()=>{
 const h=harness();
 vm.runInContext("globalThis.creator=db.creators[0];creator.accounts=[{platform:'Instagram',handle:'@proposal',url:'https://instagram.com/proposal',followers:null,views:null}];globalThis.proposalHTML=submissionForm(creator.id);",h.context);
 assert.match(h.context.proposalHTML,/方案总价（USD）/);
 assert.match(h.context.proposalHTML,/type="hidden" name="currency" value="USD"/);
 assert.doesNotMatch(h.context.proposalHTML,/<select name="currency"|name="clientQuote"|name="reason"/);
 const db=h.context.readDB(),creator=h.context.creator;
 const project=db.campaigns.find(p=>!db.collaborations.some(r=>r.creatorId===creator.id&&r.campaignId===p.id));
 h.submit('submit',{campaignId:project.id,compactProposal:'2',deliveryPlatform0:'Instagram',quantity0:'1',type0:'reel',total:'100',currency:'USD',rights:'',cooperationNotes:'分发要求'},creator.id);
 const r=h.stored().collaborations.find(r=>r.creatorId===creator.id&&r.campaignId===project.id);
 assert(r);assert.equal(r.currency,'USD');assert.equal(r.rights,'');
 assert.equal(r.proposalVersions[0].rights,'');assert.equal(r.proposalVersions[0].cooperationNotes,'分发要求');
 assert.equal(r.reason,'');
});


test('refresh never restores a retired simulation view',()=>{
 const h=harness({getItem:k=>k==='solbridge-crm-location-v1'?JSON.stringify({userId:'c',page:'projects'}):'{}',setItem:()=>{}});
 const result=vm.runInContext('restoreLocation();({id:user.id,page})',h.context);
 assert.equal(result.id,'pm1');assert.equal(result.page,'projects');
});

test('regional config save failure rolls back assignments and leaves input available',()=>{
 const h=harness(),projectId=h.context.readDB().collaborations.find(r=>r.id===h.id).campaignId;
 const before=JSON.stringify(h.context.readDB());h.setFailure(true);
 const {form,button}=h.submit('regionRule',{region:'美国',pmId:'pm1'},projectId);
 assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(form.values.region,'美国');assert.equal(button.disabled,false);assert.match(h.message.textContent,/保存失败/);
 h.setFailure(false);vm.runInContext('showSaveToast=()=>{}',h.context);h.submit('regionRule',form.values,projectId);
 assert.equal(h.stored().campaigns.find(p=>p.id===projectId).regionPm['美国'],'pm1');
});
test('regional page and entry are available only in administrator view',()=>{
 const h=harness();
 const adminHtml=vm.runInContext("campaignId='';renderProjects(projectsFor(db,user));content.innerHTML",h.context);
 assert.match(adminHtml,/地区 PM 分工与交接/);
 const pmHtml=vm.runInContext("user=USERS.find(u=>u.id==='pm1');campaignId='';renderProjects(projectsFor(db,user));content.innerHTML",h.context);
 assert.doesNotMatch(pmHtml,/地区 PM 分工与交接/);
 vm.runInContext("applyWorkspace({projectTab:'regional'})",h.context);assert.equal(vm.runInContext('projectTab',h.context),'orders');
});

test('duplicate unsubmitted intake shares the creator, preserves profile and rolls back failed membership save',()=>{
 const h=harness(),values={profile:'https://instagram.com/shared_intake',contact:'shared@example.com',name:'Original',country:'美国',language:'英语',followers:'100',views:'20'};
 h.submit('creator',values);
 const original=h.stored().creators.at(-1),count=h.stored().creators.length;
 vm.runInContext("user=USERS.find(u=>u.id==='a')",h.context);
 h.setFailure(true);h.submit('creator',{...values,name:'Do not overwrite'});
 assert(!model.creatorInitiators(h.context.readDB().creators.at(-1)).includes('a'));
 h.setFailure(false);h.submit('creator',{...values,name:'Do not overwrite'});
 const shared=h.stored().creators.at(-1);
 assert.equal(h.stored().creators.length,count);assert.equal(shared.id,original.id);assert.equal(shared.displayCode,original.displayCode);
 assert.equal(shared.name,'Original');assert.deepEqual(shared.accounts,original.accounts);
 const user=model.USERS.find(u=>u.id==='a');
 assert(model.creatorResults(h.stored(),user).some(c=>c.id===shared.id));assert(model.canEditCreator(h.stored(),user,shared));
 h.submit('creator',values);assert.equal(model.creatorInitiators(h.stored().creators.at(-1)).filter(id=>id==='a').length,1);
 vm.runInContext("db.collaborations.push({id:'formal',creatorId:db.creators.at(-1).id,submittedBy:'a',ownerId:'a'});user=USERS.find(u=>u.id==='b')",h.context);
 h.submit('creator',values);
 assert.match(h.message.innerHTML,/已正式提报/);assert(!model.creatorInitiators(h.context.readDB().creators.at(-1)).includes('b'));
});

test('package quote timeline shows the original submission without spending a PM round and gives operators accurate waiting guidance',()=>{
 const h=harness(),db=h.context.readDB(),project=db.campaigns.find(p=>p.id===db.collaborations.find(r=>r.id===h.id).campaignId);
 project.pmId='pm1';
 const pm=model.USERS.find(u=>u.id==='pm1'),operator=model.USERS.find(u=>u.id==='a');
 const terms={total:550,currency:'USD',rights:'90天授权',items:[{platform:'Instagram',type:'reel',quantity:2}]};
 const r=model.submitCreator(db,operator,db.creators[1].id,{campaignId:project.id,initial:550,rights:terms.rights,reason:''});
 model.enablePackage(db,operator,r.id,terms);
 r.proposalVersions[0].at='2026-10-12T03:04:00.000Z';
 const original=JSON.stringify(r.proposalVersions[0]),stamp=new Date(r.proposalVersions[0].at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const as=account=>vm.runInContext('user=USERS.find(u=>u.id==='+JSON.stringify(account.id)+');',h.context);
 const initialCard=html=>(html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g)||[]).find(entry=>entry.includes('>提报报价</span>'));
 const badges=html=>[...html.matchAll(/<span class="quote-badge">([^<]+)<\/span>/g)].map(x=>x[1]);
 as(operator);
 const pending=h.context.clientQuotePanel(r);assert(initialCard(pending));assert.match(initialCard(pending),/USD 550/);assert(initialCard(pending).includes(stamp));assert.deepEqual(badges(pending),['提报报价']);
 assert.match(initialCard(pending),/class="quote-time"/);assert(initialCard(pending).includes(operator.name));
 assert.equal(model.clientQuoteHistory(r).length,0);
 model.updateCoop(db,pm,r.id,'approve',{clientQuote:1000});
 const waiting=h.context.clientQuotePanel(r);assert.match(waiting,/等待 PM 与客户沟通。/);assert.doesNotMatch(waiting,/data-kind="(?:negotiationQuote|customerOffer)"/);
 as(pm);const firstRound=h.context.clientQuotePanel(r);assert.match(firstRound,/data-kind="negotiationQuote"/);assert.match(firstRound,/对客报价草稿 · USD · R1/);assert.doesNotMatch(firstRound,/对客报价 · USD · R2/);
 model.updateCoop(db,operator,r.id,'packageRevision',{reason:'运营调整',...terms,total:750,items:[{platform:'Instagram',type:'reel',quantity:3}]});
 const beforeRender=JSON.stringify(db),revised=h.context.clientQuotePanel(r);
 assert.match(initialCard(revised),/USD 550/);assert(initialCard(revised).includes(stamp));assert.doesNotMatch(initialCard(revised),/USD 750/);
 assert.equal(JSON.stringify(r.proposalVersions[0]),original);assert.equal(model.clientQuoteHistory(r).length,0);assert.match(revised,/等待 PM 审核提报/);assert.equal(JSON.stringify(db),beforeRender);
 model.updateCoop(db,pm,r.id,'approve',{clientQuote:1000});model.submitNegotiationQuote(db,pm,r.id,1000);model.recordCustomerOffer(db,pm,r.id,800);model.addCreatorQuoteReply(db,operator,r.id,750);
 as(operator);const replied=h.context.clientQuotePanel(r);
 assert.match(replied,/等待 PM 与客户沟通。/);assert.doesNotMatch(replied,/data-kind="(?:negotiationQuote|customerOffer|creatorQuoteReply)"/);
 assert.deepEqual(badges(replied),['对客报价 R1','客户还价 R1','运营回价 R1']);assert.equal(model.clientQuoteHistory(r).length,1);
 as(pm);assert.match(h.context.clientQuotePanel(r),/对客报价 · USD · R2/);
});

test('quote timeline renders role-specific composers, escaped notes and the round limit',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 r.status='待 PM 审核';delete r.confirmedAt;delete r.customerAcceptedAt;
 const pm=model.USERS.find(u=>u.id===model.reviewPm(db,r));
 model.updateCoop(db,pm,r.id,'approve',{clientQuote:1000});model.submitNegotiationQuote(db,pm,r.id,1000,'<script>test</script>');
 const html=h.context.clientQuotePanel(r);
 assert.match(html,/对客报价 R1/);assert.match(html,/&lt;script&gt;/);assert.match(html,/data-kind="customerOffer"/);assert.doesNotMatch(html,/data-kind="negotiationQuote"/);
 r.ownerId=model.USERS.find(u=>u.role==='operator').id;
 model.recordCustomerOffer(db,pm,r.id,800,'客户预算');
 vm.runInContext(`user=USERS.find(u=>u.id===${JSON.stringify(r.ownerId)});`,h.context);
 assert.match(h.context.clientQuotePanel(r),/data-kind="creatorQuoteReply"/);
 const operator=model.USERS.find(u=>u.id===r.ownerId);
 model.addCreatorQuoteReply(db,operator,r.id,800);
 vm.runInContext("user=USERS.find(u=>u.role==='admin');",h.context);
 for(const [quote,counter] of [[900,750],[800,700]]){
  model.submitNegotiationQuote(db,pm,r.id,quote);
  if(r.clientQuotes.length===3){
   const awaitingCounter=h.context.clientQuotePanel(r);
   assert.match(awaitingCounter,/第 3 轮对客报价/);assert.match(awaitingCounter,/data-kind="customerOffer"/);assert.doesNotMatch(awaitingCounter,/data-kind="negotiationQuote"/);
  }
  model.recordCustomerOffer(db,pm,r.id,counter);model.addCreatorQuoteReply(db,operator,r.id,counter);
 }
 for(const record of [...r.clientQuotes,...r.customerOffers,...r.creatorQuoteReplies])record.at='2026-10-13T08:00:00.000Z';
 assert.equal(r.status,'待 PM 反馈');const full=h.context.clientQuotePanel(r);assert.doesNotMatch(full,/已报满/);assert.match(full,/data-kind="negotiationQuote"/);assert.match(full,/data-kind="customerAccept"/);
 assert.deepEqual([...full.matchAll(/<span class="quote-badge">([^<]+)<\/span>/g)].map(x=>x[1]),[3].flatMap(round=>['对客报价 R'+round,'客户还价 R'+round,'运营回价 R'+round]));
 model.updateCoop(db,pm,r.id,'feedback');
 assert.equal(r.status,'议价待客户确认');const awaitingDecision=h.context.clientQuotePanel(r);
 assert.match(awaitingDecision,/等待客户回复/);assert.doesNotMatch(awaitingDecision,/请登记客户愿意接受的价格|data-kind="(?:customerOffer|negotiationQuote)"/);assert.match(awaitingDecision,/data-kind="customerAccept"/);
});

test('pending proposal rejection requires a reason, respects roles and preserves failure inputs',()=>{
 const h=harness(),r=h.context.readDB().collaborations.find(x=>x.id===h.id);r.status='待 PM 审核';
 assert.match(h.context.submissionDecisionPanel(r),/data-kind="reject"/);
 vm.runInContext("user=USERS.find(u=>u.role==='operator');",h.context);
 assert.equal(h.context.submissionDecisionPanel(r),'');
 h.submit('reject',{reason:'不符合'});assert.equal(h.context.readDB().collaborations.find(x=>x.id===h.id).status,'待 PM 审核');
 vm.runInContext("user=USERS.find(u=>u.role==='admin');",h.context);
 h.submit('reject',{reason:'   '});assert.equal(h.context.readDB().collaborations.find(x=>x.id===h.id).status,'待 PM 审核');
 h.setFailure(true);const {form}=h.submit('reject',{reason:'受众地区不匹配'});
 assert.equal(form.values.reason,'受众地区不匹配');assert.equal(h.context.readDB().collaborations.find(x=>x.id===h.id).status,'待 PM 审核');
 h.setFailure(false);h.submit('reject',form.values);
 const saved=h.stored().collaborations.find(x=>x.id===h.id);
 assert.equal(saved.status,'不予提报');assert.equal(model.stageOf(saved),'已结束');assert.equal(saved.closeReason,'受众地区不匹配');
 assert.match(h.context.submissionDecisionPanel(saved),/受众地区不匹配/);
 assert.doesNotMatch(h.context.clientQuotePanel(saved),/<form/);
 assert.equal(saved.events.at(-1).reason,'受众地区不匹配');
});

test('operator rejection inbox offers both choices and resubmission form prefills existing terms',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 r.status='不予提报';r.closeReason='画像不符合';r.closedAt=new Date().toISOString();
 r.ownerId=model.USERS.find(u=>u.role==='operator').id;
 r.proposalVersions=[{version:1,total:550,currency:'USD',rights:'180天授权',cooperationNotes:'保留备注',items:[{platform:'Instagram',type:'reel',quantity:2,publicationPlatforms:['Instagram']}]}];
 vm.runInContext(`user=USERS.find(u=>u.id===${JSON.stringify(r.ownerId)});page='followup';queue='mine';resubmissionId=${JSON.stringify(r.id)};`,h.context);
 const row=h.context.orders([r]);assert.match(row,/画像不符合/);assert.doesNotMatch(row,/data-resubmit-proposal|acknowledgeRejection/);
 const drawer=h.context.submissionDecisionPanel(r);assert.match(drawer,/data-resubmit-proposal/);assert.match(drawer,/acknowledgeRejection/);
 const form=h.context.submissionForm(r.creatorId);assert.match(form,/data-kind="reopenSubmission"/);assert.match(form,/value="550"/);assert.match(form,/180天授权/);assert.match(form,/保留备注/);assert.match(form,/value="2"/);
 assert.equal(r.status,'不予提报');
});

test('operator creates an order on one click, preserves an existing date, and retries failed persistence without duplicates',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 delete r.confirmedAt;r.status='待达人确认';r.ownerId='a';r.customerAcceptedAt=new Date().toISOString();
 r.proposalVersions=[{id:'latest',version:2,total:900,currency:'USD',rights:'',items:[{platform:'Instagram',type:'reel',quantity:3}]}];
 r.preliminaryVersionId='latest';r.date='2026-11-01';
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);
 const html=h.context.customerAcceptancePanel(r);
 assert.match(html,/data-action="confirmAndCreateOrder"/);
 assert.match(html,/未填写报价详情/);
 assert.match(html,/>创建订单<\/button>/);
 assert.doesNotMatch(html,/data-show-creator-confirmation|creator-confirmation-form|<form|type="date"|确认创建/);
 const before=JSON.stringify(h.context.readDB());
 h.setFailure(true);const failed=h.clickAction('confirmAndCreateOrder');
 assert.equal(JSON.stringify(h.context.readDB()),before);
 assert.equal(failed.disabled,false);assert.match(h.message.textContent,/保存失败/);
 h.setFailure(false);h.clickAction('confirmAndCreateOrder',h.id,failed);assert.equal(model.proposalStageOf(h.context.readDB().collaborations.find(x=>x.id===h.id)),'已完成');
 const saved=h.context.readDB().collaborations.find(x=>x.id===h.id);
 assert.equal(saved.status,'已创建订单');
 assert.equal(saved.creatorVersionId,'latest');
 assert.equal(saved.clientVersionId,'latest');assert(saved.confirmedAt);assert.equal(saved.final,900);assert.equal(saved.date,'2026-11-01');
 assert.equal(h.stored().orders.length,1);assert.equal(h.stored().deliveryItems.length,3);
 assert(h.stored().deliveryItems.every(item=>item.date==='2026-11-01'));
 assert.match(h.context.packageHistory(saved),/合作订单：/);
 assert.doesNotMatch(h.context.packageHistory(saved),/data-order-deliveries=|前往视频交付/);
 assert.doesNotMatch(h.context.packageHistory(saved),/data-action="createOrder"/);
 assert.doesNotMatch(h.context.customerAcceptancePanel(saved),/data-action="confirmAndCreateOrder"/);
 const created=JSON.stringify(h.stored());
 h.clickAction('confirmAndCreateOrder',h.id,failed);
 h.clickAction('confirmAndCreateOrder');
 assert.equal(JSON.stringify(h.stored()),created);
 assert.equal(h.stored().orders.length,1);assert.equal(h.stored().deliveryItems.length,3);
});

test('missing historical customer confirmation exposes PM recovery before operator confirmation',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 Object.assign(r,{status:'待达人确认',ownerId:'a',reviewPmId:'pm1',events:[],proposalVersions:[{id:'unconfirmed-version',version:1,total:900,currency:'USD',rights:'',items:[{platform:'Instagram',type:'reel',quantity:1}]}],preliminaryVersionId:'unconfirmed-version'});
 for(const key of ['confirmedAt','customerAcceptedAt','customerAcceptedBy','customerAcceptance'])delete r[key];
 db.campaigns.find(p=>p.id===r.campaignId).pmId='pm1';
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);
 const operator=h.context.customerAcceptancePanel(r);
 assert.match(operator,/客户确认记录待补充/);assert.doesNotMatch(operator,/客户已确认合作|data-action="confirmAndCreateOrder"/);
 h.clickAction('confirmAndCreateOrder');assert.equal(h.context.readDB().collaborations.find(x=>x.id===h.id).status,'待达人确认');
 vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);
 const pm=h.context.customerAcceptancePanel(h.context.readDB().collaborations.find(x=>x.id===h.id));
 assert.match(pm,/补登客户确认/);assert.match(pm,/data-kind="agree"/);
 h.submit('agree',{clientPrice:'1100',reason:'Actual customer confirmation'});
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);
 assert.match(h.context.customerAcceptancePanel(h.context.readDB().collaborations.find(x=>x.id===h.id)),/data-action="confirmAndCreateOrder"/);
 h.clickAction('confirmAndCreateOrder');
 assert.equal(h.stored().collaborations.find(x=>x.id===h.id).status,'已创建订单');
});

test('proposal stay column and overdue queue share the twelve-hour rule across visible roles',t=>{
 const fixedNow=Date.parse('2026-10-13T12:00:00.000Z');t.mock.method(Date,'now',()=>fixedNow);
 const h=harness(),db=h.context.readDB(),sample=db.collaborations.find(r=>r.id===h.id),project=db.campaigns.find(p=>p.id===sample.campaignId);
 project.pmId='pm1';project.members=['a','b'];
 const ago=hours=>new Date(fixedNow-hours*3600000).toISOString();
 const proposal=(id,hours,extra={})=>({id,creatorId:sample.creatorId,campaignId:project.id,ownerId:'a',reviewPmId:'pm1',status:'待 PM 审核',initial:100,currency:'USD',clientPrice:null,history:[],notes:[],events:hours==null?[]:[{action:'submit',status:'待 PM 审核',at:ago(hours),by:'a'}],submittedAt:hours==null?'':ago(hours),updatedAt:hours==null?'':ago(hours),proposalVersions:[{id:id+'-v1',version:1,total:100,currency:'USD',rights:'',items:[{platform:'Instagram',type:'reel',quantity:1}]}],...extra});
 const rows=[proposal('age-overdue',13.25),proposal('age-boundary',12),proposal('age-recent',2.5),proposal('age-unknown',null),proposal('age-created',48,{status:'已创建订单',orderId:'existing-order',confirmedAt:ago(48)}),proposal('age-ended',48,{status:'不予提报'}),proposal('age-other-owner',15,{ownerId:'b'}),proposal('age-note',13,{updatedAt:ago(1),events:[{action:'submit',status:'待 PM 审核',at:ago(13),by:'a'},{action:'note',status:'待 PM 审核',at:ago(1),by:'a'}]})];
 const delivery=proposal('age-delivery',24,{proposalVersions:undefined,orderId:'delivery-order',proposalId:'age-created',status:'脚本待提交',confirmedAt:ago(24)});
 db.collaborations=[...rows,delivery];db.tasks=[];
 h.context.fixedNow=fixedNow;
 vm.runInContext("Date.now=()=>fixedNow;reset();page='followup';queue='all';user=USERS.find(u=>u.id==='a');",h.context);
 const tableRow=(html,id)=>[...html.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(m=>m[0]).find(row=>row.includes('data-coop="'+id+'"'));
 const stayCell=row=>row.match(/<td\b([^>]*\bproposal-stay\b[^>]*)>([\s\S]*?)<\/td>/);
 for(const prices of [false,true]){
  h.context.prices=prices;
  const html=vm.runInContext("showPrices=prices;orders(selectOrders(db,user,criteria(),proposalRows()))",h.context);
  assert.match(html,/<th scope="col">最近更新<\/th><th scope="col">停留时间（小时）<\/th>/);
  const headers=(html.match(/<th\b/g)||[]).length;
  assert.equal(headers,prices?9:7);assert.equal((tableRow(html,'age-overdue').match(/<td\b/g)||[]).length,headers);
  const overdue=stayCell(tableRow(html,'age-overdue')),boundary=stayCell(tableRow(html,'age-boundary'));
  assert.equal(overdue[2],'13.3');assert.match(overdue[1],/\bis-overdue\b/);
  assert.equal(boundary[2],'12.0');assert.doesNotMatch(boundary[1],/\bis-overdue\b/);
  assert.equal(stayCell(tableRow(html,'age-recent'))[2],'2.5');assert.equal(stayCell(tableRow(html,'age-note'))[2],'13.0');
  for(const id of ['age-unknown','age-created','age-ended']){const cell=stayCell(tableRow(html,id));assert.equal(cell[2],'—');assert.doesNotMatch(cell[1],/\bis-overdue\b/);}
  assert.equal(tableRow(html,'age-other-owner'),undefined);assert.equal(tableRow(html,'age-delivery'),undefined);
 }
 for(const [account,ids] of [['a',['age-note','age-overdue']],['pm1',['age-note','age-other-owner','age-overdue']]]){
  h.context.account=account;
  const result=vm.runInContext("user=USERS.find(u=>u.id===account);queue='overdue';(()=>{const overdueSource=proposalRows(),overdueRows=selectOrders(db,user,criteria(),overdueSource);return {ids:overdueRows.map(r=>r.id),controls:followupControls(overdueSource,overdueRows,overdueRows),table:orders(overdueRows)};})()",h.context);
  assert.deepEqual(Array.from(result.ids).sort(),ids);
  assert.match(result.controls,new RegExp('data-queue="overdue"[^>]*>已逾期 <b>'+ids.length+'<\\/b>'));
  assert.equal((result.table.match(/data-detail-row data-coop=/g)||[]).length,ids.length);
 }
 const operator=model.USERS.find(u=>u.id==='a');
 assert.equal(model.inQueue(db,operator,delivery,'overdue'),false);
 db.tasks.push({id:'delivery-reminder',objectId:delivery.id,ownerId:'a',status:'open',dueAt:ago(1)});
 assert.equal(model.inQueue(db,operator,delivery,'overdue'),true);
});

test('proposal clock refresh preserves active work and restores non-input focus without saving business data',()=>{
 const h=harness(),before=JSON.stringify(h.stored());
 vm.runInContext("page='followup';globalThis.refreshCount=0;render=()=>{refreshCount++;};globalThis.clockRoot=root;globalThis.clockContent=content;",h.context);
 h.context.refreshProposalClock();assert.equal(h.context.refreshCount,1);
 for(const flag of ['pageDirty','drawerDirty']){
  vm.runInContext(flag+'=true;',h.context);h.context.refreshProposalClock();assert.equal(h.context.refreshCount,1);vm.runInContext(flag+'=false;',h.context);
 }
 h.context.document.hidden=true;h.context.refreshProposalClock();assert.equal(h.context.refreshCount,1);h.context.document.hidden=false;
 h.context.clockRoot.querySelector=selector=>selector==='.detail-drawer'?{}:null;
 h.context.refreshProposalClock();assert.equal(h.context.refreshCount,1);h.context.clockRoot.querySelector=()=>null;
 h.context.document.activeElement={matches:()=>true};h.context.refreshProposalClock();assert.equal(h.context.refreshCount,1);
 h.context.document.activeElement=undefined;
 vm.runInContext("page='delivery';",h.context);h.context.refreshProposalClock();assert.equal(h.context.refreshCount,1);
 vm.runInContext("page='followup';",h.context);
 const focused={matches:()=>false,attributes:[{name:'data-queue',value:'overdue'}]},restored=[];
 h.context.document.activeElement=focused;h.context.clockContent.contains=element=>element===focused;
 h.context.clockContent.querySelectorAll=()=>[{getAttribute:name=>name==='data-queue'?'overdue':null,focus:options=>restored.push(options.preventScroll)}];
 h.context.refreshProposalClock();assert.equal(h.context.refreshCount,2);assert.deepEqual(restored,[true]);
 assert.equal(JSON.stringify(h.stored()),before);
});

test('delivery stage filters and queue counts stay within visible delivery records',()=>{
 const h=harness();
 vm.runInContext("page='delivery';queue='all';stage='全部';",h.context);
 const all=vm.runInContext('deliveryRows()',h.context);
 assert(all.some(r=>r.id===h.id));
 vm.runInContext("stage='视频阶段';",h.context);
 assert(vm.runInContext('deliveryRows()',h.context).every(r=>model.deliveryStage(h.context.readDB(),r)==='视频阶段'));
 assert(vm.runInContext("deliveryRows({stage:'全部'})",h.context).some(r=>r.id===h.id));
 const html=vm.runInContext('deliveryControls(deliveryRows())',h.context);
 assert.match(html,/aria-label="交付阶段"/);assert.doesNotMatch(html,/data-view=|data-view-settings|视图设置/);
 assert(!html.includes('提报审核'));assert(!html.includes('delivery-overview'));
});

test('delivery always renders the list even with a saved alternate view',()=>{
 const h=harness();
 const html=vm.runInContext("page='delivery';queue='all';view='list';showPrices=false;renderDelivery();content.innerHTML",h.context);
 assert.match(html,/<th>交付阶段<\/th><th>具体进度<\/th><th>最近更新<\/th><th>停留时间（小时）<\/th>/);
 assert(!html.includes('<th>Margin</th>'));
 vm.runInContext("applyWorkspace({view:'calendar',queue:'all'});renderDelivery();",h.context);
 assert.equal(vm.runInContext('view',h.context),'calendar');
 assert.match(vm.runInContext('content.innerHTML',h.context),/aria-label="视频交付列表"/);
 assert.doesNotMatch(vm.runInContext('content.innerHTML',h.context),/calendar-panel|data-view=|data-view-settings/);
});

test('delivery drawer separates basics and progressively reveals stage panels',()=>{
 const {h,item,draw}=progressiveDeliveryHarness();let body=draw();
 assert(body.indexOf('aria-label="交付基础信息"')<body.indexOf('aria-label="交付操作"'));
 assert.match(body,/data-workflow-section="delivery-script"/);assert.match(body,/data-kind="scriptSubmit"/);assert.doesNotMatch(body,/data-kind="videoSubmit"|data-kind="publish"/);
 item.status='视频待提交';body=draw();assert.match(body,/data-workflow-section="delivery-video"/);assert.match(body,/data-kind="videoSubmit"/);assert.doesNotMatch(body,/data-kind="scriptSubmit"/);
 item.status='待发布';assert.match(draw(),/data-kind="publish"/);assert.match(draw(),/data-kind="schedule"/);
});

test('delivery shows only latest link and directs modification feedback to the document',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 r.status='视频待修改';r.deliverables={script:[],video:[{version:1,url:'https://example.com/v1',description:'第一稿',submittedBy:'a',submittedAt:'2026-10-13T01:00:00Z',reviews:[]},{version:2,url:'https://example.com/v2',description:'第二稿',submittedBy:'a',submittedAt:'2026-10-13T02:00:00Z',reviews:[{action:'videoReturn',by:'pm1',source:'PM 初审',reason:'修改开头 <script>',at:'2026-10-13T03:00:00Z'}]}]};
 h.context.deliveryDetail(r.id);const body=h.context.lastPanel.body;
 assert.match(body,/需要修改/);assert.doesNotMatch(body,/修改开头|较早审核记录|历史稿件/);
 assert.match(body,/https:\/\/example.com\/v2/);assert.doesNotMatch(body,/https:\/\/example.com\/v1/);
 assert(body.indexOf('最新视频')<body.indexOf('data-kind="videoSubmit"'));
 assert.doesNotMatch(body,/<details class="delivery-stage-block/);
});

function progressiveDeliveryHarness(){
 const h=harness(),db=h.context.readDB(),original=db.collaborations.find(r=>r.id===h.id);
 const item={...original,id:'progressive-video-1',orderId:'progressive-order',proposalId:'progressive-proposal',name:'Video 1',ownerId:'a',reviewPmId:'pm1',deliverables:{script:[],video:[]}};
 db.orders=[{id:item.orderId,preparation:{},createdAt:original.confirmedAt}];
 db.deliveryItems=[item,{...structuredClone(item),id:'progressive-video-2',name:'Video 2'}];
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);
 return {h,item,draw(id=item.id){h.context.deliveryDetail(id);return h.context.lastPanel.body;}};
}

test('drawer task distinguishes actionable work, another role waiting and completed orders without navigation',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 r.status='待 PM 审核';delete r.confirmedAt;r.ownerId='a';r.reviewPmId='pm1';
 vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);
 assert.match(h.context.workflowTodo(r),/待你处理.*审核当前提报/);
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);
 const waiting=h.context.workflowTodo(r);assert.match(waiting,/is-waiting/);assert.match(waiting,/负责处理：PM · AJ/);assert.doesNotMatch(waiting,/待你处理/);
 r.orderId='completed-order';r.proposalVersions=[{}];r.status='已创建订单';
 const complete=h.context.workflowTodo(r);assert.match(complete,/合作订单已创建/);assert.doesNotMatch(complete,/data-page=|前往视频交付|待你处理/);
});

test('older quote rounds are hidden while current round and authorized composer remain together',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id),pm=model.USERS.find(u=>u.id===model.reviewPm(db,r)),op=model.USERS.find(u=>u.id==='a');
 r.status='待 PM 审核';delete r.confirmedAt;delete r.customerAcceptedAt;r.ownerId=op.id;
 model.updateCoop(db,pm,r.id,'approve',{clientQuote:1000});model.submitNegotiationQuote(db,pm,r.id,1500,'首轮');model.recordCustomerOffer(db,pm,r.id,1000);model.addCreatorQuoteReply(db,op,r.id,1100);
 model.submitNegotiationQuote(db,pm,r.id,1300,'最新轮次');model.recordCustomerOffer(db,pm,r.id,1200);
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);
 const html=h.context.clientQuotePanel(r);
 assert.doesNotMatch(html,/quote-history|历史报价|对客报价 R1/);
 assert.match(html,/最新轮次/);assert.match(html,/data-kind="creatorQuoteReply"/);assert.match(html,/客户还价 R2/);
 assert.equal(model.clientQuoteHistory(r).length,2);
 vm.runInContext("user=USERS.find(u=>u.role==='pm');",h.context);
 assert.doesNotMatch(h.context.clientQuotePanel(r),/data-kind="creatorQuoteReply"/);
});

test('delivery folds cooperation details and binds sync controls to latest link',()=>{
 const {h,item,draw}=progressiveDeliveryHarness(),db=h.context.readDB();
 db.orders[0].terms={rights:'已确认授权',cooperationNotes:'已确认合作备注'};db.orders[0].preparation={registrationEmail:'creator@example.com',inviteCode:'READY',inviteLink:'https://example.com/invite'};
 item.platform='Instagram';item.contentType='reel';item.status='视频待 PM 初审';item.reviewPmId='pm1';item.ownerId='a';
 item.deliverables.video=[1,2].map(version=>({version,url:'https://example.com/v'+version,description:'V'+version,submittedBy:'a',submittedAt:'2026-10-13T01:00:00Z',reviews:version===1?[{action:'videoReturn',by:'pm1',source:'PM 初审',reason:'旧稿修改意见',at:'2026-10-13T02:00:00Z'}]:[]}));
 vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);
 const body=draw(),task=body.indexOf('aria-label="交付操作"');
 assert(body.indexOf('已确认授权')<task);assert(body.indexOf('aria-label="单条视频价格"')<task);
 assert(body.indexOf('data-current-draft="video"')<body.indexOf('data-action="videoSend"'));
 assert.doesNotMatch(body,/data-action="videoApprove"|旧稿修改意见|delivery-older-versions/);
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);
 assert.doesNotMatch(draw(),/data-action="videoSend"/);assert.match(draw(),/等待 PM 同步客户/);
 item.status='视频待修改';assert.match(draw(),/需要修改/);assert.match(draw(),/data-kind="videoSubmit"/);
});

test('progressive delivery reveals only saved and approved steps through publication',()=>{
 const {h,item,draw}=progressiveDeliveryHarness(),db=h.context.readDB(),op=model.USERS.find(u=>u.id==='a'),pm=model.USERS.find(u=>u.id==='pm1');
 assert.match(draw(),/data-kind="scriptSubmit"/);assert.match(draw(),/可选 · 与主流程并行/);
 for(const key of ['script','video']){
  model.updateCoop(db,op,item.id,key+'Submit',{url:'https://example.com/'+key});
  assert.doesNotMatch(draw(),new RegExp('data-kind="'+key+'Submit"'));
  model.updateCoop(db,pm,item.id,key+'Send');model.updateCoop(db,pm,item.id,key+'Return');
  assert.match(draw(),/请按在线文档意见处理后重新提交审核/);
  model.updateCoop(db,op,item.id,key+'Submit',{url:'https://example.com/'+key+'2'});
  model.updateCoop(db,pm,item.id,key+'Send');model.updateCoop(db,pm,item.id,key+'Pass');
 }
 assert.match(draw(),/data-kind="publish"/);assert.doesNotMatch(draw('progressive-video-2'),/data-kind="publish"/);
 model.updateCoop(db,op,item.id,'publish',{url:'https://example.com/p'});vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);
 assert.match(draw(),/data-action="accept"/);model.updateCoop(db,pm,item.id,'accept');assert.doesNotMatch(draw(),/data-action="accept"|data-kind="publish"/);
});

test('progressive delivery respects viewer permissions and restores persisted progress',()=>{
 const {h,item,draw}=progressiveDeliveryHarness();vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);
 assert.match(draw(),/data-kind="preparationPm"/);assert.doesNotMatch(draw(),/data-kind="preparation"|data-kind="scriptSubmit"/);
 h.submit('preparationPm',{inviteCode:'CODE'},item.id);const before=draw();vm.runInContext('db=JSON.parse(JSON.stringify(db));',h.context);assert.equal(draw(),before);
});

test('email sync overwrites matching editable orders and rolls back the entire batch on save failure',()=>{
 const {h,item,draw}=progressiveDeliveryHarness(),db=h.context.readDB();
 const add=(id,overrides={},prep={})=>{db.orders.push({id,creatorId:item.creatorId,campaignId:item.campaignId,...overrides,preparation:prep});db.deliveryItems.push({...structuredClone(item),id:id+'-video',orderId:id,...overrides});};
 add('matching',{}, {inviteCode:'KEEP',briefSent:true});
 add('filled',{}, {registrationEmail:'existing@example.com'});
 add('different-project',{campaignId:'another-project'});
 add('different-creator',{creatorId:'another-creator'});
 const body=draw();assert.match(body,/data-kind="preparation"/);
 const firstStep=body.slice(body.indexOf('data-delivery-step="0"'));
 assert.doesNotMatch(firstStep,/delivery-stage-state|delivery-stage-hint|当前处理人/);
 const before=JSON.stringify(db);h.setFailure(true);
 const failed=h.submit('preparationSync',{registrationEmail:'sync@example.com'},item.id);
 assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(failed.form.values.registrationEmail,'sync@example.com');
 h.setFailure(false);h.submit('preparationSync',{registrationEmail:'sync@example.com'},item.id);
 const stored=h.stored(),orders=Object.fromEntries(stored.orders.map(o=>[o.id,o]));
 assert.equal(orders['progressive-order'].preparation.registrationEmail,'sync@example.com');
 assert.equal(orders.matching.preparation.registrationEmail,'sync@example.com');
 assert.equal(orders.matching.preparation.inviteCode,'KEEP');assert.equal(orders.matching.preparation.briefSent,true);
 assert.equal(orders.filled.preparation.registrationEmail,'sync@example.com');
 assert.equal(orders['different-project'].preparation.registrationEmail,undefined);
 assert.equal(orders['different-creator'].preparation.registrationEmail,undefined);
 const responsible=model.USERS.find(u=>u.id==='a');
 const result=model.updateCoop(h.context.readDB(),responsible,item.id,'preparationSync',{registrationEmail:'sync@example.com'});
 assert.equal(result.syncedVideos,3); // Source sibling and both editable matching orders.
 assert.throws(()=>model.updateCoop(h.context.readDB(),model.USERS.find(u=>u.role==='pm'),item.id,'preparationSync',{registrationEmail:'bad@example.com'}));
});


test('PM invitation handoff is role scoped, shared by order, and transactional',()=>{
 const {h,item,draw}=progressiveDeliveryHarness(),db=h.context.readDB();
 db.deliveryItems.forEach(r=>{r.reviewPmId='pm1';r.ownerId='a';});
 const pm=model.USERS.find(u=>u.id==='pm1'),op=model.USERS.find(u=>u.id==='a');
 model.updateCoop(db,pm,item.id,'preparationPm',{inviteCode:'ABC'});
 delete db.orders[0].preparation.inviteCode;
 h.submit('preparation',{registrationEmail:'creator@example.com'},item.id);
 const current=h.context.readDB();
 assert.equal(model.nextStep(current,pm,current.deliveryItems[0]).action,'preparationPm');
 assert.throws(()=>model.updateCoop(current,op,item.id,'preparationPm',{inviteCode:'ABC',inviteLink:'https://example.com/invite'}));
 vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);
 assert.match(draw(),/name="inviteLink"/);assert.doesNotMatch(draw(),/data-kind="preparation"/);
 const values={inviteCode:'ABC123',inviteLink:'https://example.com/invite',accessReady:'on'};
 const before=JSON.stringify(h.context.readDB());h.setFailure(true);const failed=h.submit('preparationPm',values,item.id);
 assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(failed.form.values.inviteLink,values.inviteLink);
 h.setFailure(false);h.submit('preparationPm',{...values,inviteLink:'javascript:alert(1)'},item.id);
 assert.equal(JSON.stringify(h.context.readDB()),before);
 h.submit('preparationPm',values,item.id);
 const stored=h.context.readDB(),prep=stored.orders[0].preparation;
 assert.equal(prep.inviteCode,'ABC123');assert.equal(prep.inviteLink,values.inviteLink);assert.equal(prep.registrationEmail,'creator@example.com');
 assert.match(draw('progressive-video-2'),/ABC123/);
 assert.equal(model.nextStep(stored,pm,stored.deliveryItems[0]).action,null);
 model.updateCoop(stored,op,item.id,'preparation',{registrationEmail:'new@example.com',inviteCode:'overwrite'});
 assert.equal(stored.orders[0].preparation.inviteCode,'ABC123');
 vm.runInContext("user=USERS.find(u=>u.id==='"+op.id+"');",h.context);
 assert.doesNotMatch(draw(),/name="inviteCode"|name="inviteLink"/);assert.match(draw(),/ABC123/);
});

test('single-video drawer identifies each sibling and never targets the other video actions',()=>{
 const {h,item,draw}=progressiveDeliveryHarness(),db=h.context.readDB(),other=db.deliveryItems[1];
 db.orders[0].preparation={registrationEmail:'shared@example.com',inviteCode:'ready',inviteLink:'https://example.com/invite'};
 db.orders[0].terms={rights:'订单授权',cooperationNotes:'订单备注'};
 item.ownerId=other.ownerId='a';item.reviewPmId=other.reviewPmId='pm1';
 item.status='视频待修改';item.deliverables.video=[{version:1,url:'https://example.com/first',description:'仅第一条退回',reviews:[{action:'videoReturn',source:'PM 初审',by:'pm1',reason:'第一条请修改',at:'2026-10-14T01:00:00Z'}]}];
 other.status='脚本待提交';
 vm.runInContext("user=USERS.find(u=>u.id==='a');panel=(title,body,header)=>{globalThis.lastPanel={title,body,header};};",h.context);
 const before=JSON.stringify(db),first=draw();
 assert.match(h.context.lastPanel.header,/Video 1/);assert.doesNotMatch(h.context.lastPanel.header,/Video 2|@example.com/);
 assert.doesNotMatch(first,/第一条请修改/);assert.match(first,/请按在线文档意见处理后重新提交审核/);assert.match(first,new RegExp('data-kind="videoSubmit" data-id="'+item.id+'"'));
 assert.doesNotMatch(first,new RegExp('data-id="'+other.id+'"'));assert.match(first,/订单授权/);
 const second=draw(other.id);assert.match(h.context.lastPanel.header,/Video 2/);assert.doesNotMatch(h.context.lastPanel.header,/Video 1/);
 assert.match(second,new RegExp('data-kind="scriptSubmit" data-id="'+other.id+'"'));assert.doesNotMatch(second,/第一条请修改|data-kind="videoSubmit"/);
 assert.match(second,/data-drawer-disclosure="preparation"/);assert.equal(JSON.stringify(db),before);
});

test('drawer redraw restores the active section position, expanded history and input focus only for the same record',()=>{
 const h=harness();vm.runInContext("dialog={kind:'coop',id:'same-video'};",h.context);
 let body,focused=false;
 const field={name:'description',matches:()=>false,focus(options){focused=options.preventScroll;}};
 const section={dataset:{workflowSection:'delivery-2'},getBoundingClientRect:()=>({top:960-body.scrollTop,bottom:1200-body.scrollTop}),querySelector:()=>null};
 const history={dataset:{drawerDisclosure:'video-history'},open:false};
 const f={dataset:{kind:'videoSubmit'},querySelectorAll:()=>[field],querySelector:()=>field};
 body={scrollTop:0,getBoundingClientRect:()=>({top:100}),querySelectorAll:selector=>selector.startsWith('details')?[history]:selector==='form'?[f]:[section]};
 h.context.document.getElementById('crm-preview').querySelector=selector=>selector.includes('.profile-main')?body:null;
 h.context.restoreWorkflowDrawer({id:'same-video',scroll:740,section:'delivery-2',offset:60,form:'videoSubmit',name:'description',disclosures:[['video-history',true]]});
 assert.equal(body.scrollTop,800);assert.equal(history.open,true);assert(focused);
 body.scrollTop=0;history.open=false;focused=false;
 h.context.restoreWorkflowDrawer({id:'other-video',scroll:740,disclosures:[['video-history',true]]});
 assert.equal(body.scrollTop,0);assert.equal(history.open,false);assert.equal(focused,false);
});

test('failed workflow submission reports locally while preserving the draft and rolling back business state',()=>{
 const h=harness(),before=JSON.stringify(h.context.readDB());h.setFailure(true);
 const error={dataset:{},textContent:'',hidden:true},button={disabled:false};
 const f={dataset:{kind:'scriptSubmit',id:h.id},values:{url:'https://example.com/script',description:'Keep local draft'},matches:s=>s==='form',querySelector:()=>error,querySelectorAll:s=>s==='button'?[button]:[]};
 h.dispatch('submit',{preventDefault(){},target:f});
 assert.match(error.textContent,/保存失败/);assert.equal(error.hidden,false);assert.equal(h.message.textContent,'');
 assert.equal(f.values.description,'Keep local draft');assert.equal(button.disabled,false);assert.equal(f.dataset.busy,undefined);
 assert.equal(JSON.stringify(h.context.readDB()),before);
});

test('newly actionable PM invitation work remains expanded after a delivery review redraw',()=>{
 const h=harness();vm.runInContext("dialog={kind:'coop',id:'same-video'};",h.context);
 const preparation={dataset:{drawerDisclosure:'preparation'},open:true};
 const body={scrollTop:0,querySelector:()=>({textContent:'填写邀请码和邀请链接'}),querySelectorAll:selector=>selector.startsWith('details')?[preparation]:[]};
 h.context.document.getElementById('crm-preview').querySelector=()=>body;
 h.context.restoreWorkflowDrawer({id:'same-video',scroll:0,task:'审核当前视频',disclosures:[['preparation',false]]});
 assert.equal(preparation.open,true);
 h.context.restoreWorkflowDrawer({id:'same-video',scroll:0,task:'填写邀请码和邀请链接',disclosures:[['preparation',false]]});
 assert.equal(preparation.open,false);
});

test('drawer return focus uses record identity instead of the common row marker after list redraws',()=>{
 const h=harness(),row={attributes:[{name:'data-detail-row',value:''},{name:'data-coop',value:'video-two'}]};
 assert.deepEqual([...h.context.drawerFocusKey(row)],['data-coop','video-two']);
 assert.deepEqual([...h.context.drawerFocusKey({attributes:[{name:'data-detail-row',value:''},{name:'data-creator-page',value:'creator-two'}]})],['data-creator-page','creator-two']);
 assert.equal(h.context.drawerFocusKey({attributes:[{name:'data-detail-row',value:''}]}),undefined);
});

test('completed cooperation opens an optional order modal without creating anything or bypassing roles',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 Object.assign(r,{status:'合作确认完成',ownerId:'a',reviewPmId:'pm1',proposalVersions:[{id:'confirmed',version:1,total:100,currency:'USD',rights:'',items:[{platform:'Instagram',type:'reel',quantity:2}]}],creatorVersionId:'confirmed',clientVersionId:'confirmed',customerAcceptance:{versionId:'confirmed',by:'pm1',at:new Date().toISOString(),clientPrice:900,currency:'USD'},final:100});
 vm.runInContext("user=USERS.find(u=>u.id==='a');page='followup';",h.context);
 const before=JSON.stringify(h.context.readDB());assert.match(h.context.cooperationStageControl(r),/data-offer-order=/);
 h.context.offerOrder(h.id);assert.match(h.context.lastPanel.body,/暂不创建/);assert.match(h.context.lastPanel.body,/data-action="createOrder"/);assert.equal(JSON.stringify(h.context.readDB()),before);
 vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);h.context.offerOrder(h.id);assert.match(h.context.lastPanel.body,/负责运营/);assert.doesNotMatch(h.context.lastPanel.body,/data-action="createOrder"/);
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);h.context.offerOrder(h.id);h.setFailure(true);h.clickAction('createOrder');assert.equal(JSON.stringify(h.context.readDB()),before);assert.match(h.message.textContent,/保存失败/);
 h.setFailure(false);h.clickAction('createOrder');const saved=h.stored();assert.equal(saved.orders.length,1);assert.equal(saved.deliveryItems.length,2);assert.equal(model.proposalStageOf(saved.collaborations.find(x=>x.id===h.id)),'已完成');assert.doesNotMatch(h.context.cooperationStageControl(saved.collaborations.find(x=>x.id===h.id)),/data-offer-order/);
 h.clickAction('createOrder');assert.equal(h.stored().orders.length,1);
});

test('completed modern and legacy cooperations remain searchable once per proposal without leaking other owners or adding video rows',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id),creator=db.creators.find(x=>x.id===r.creatorId);
 creator.name='@code_wars_official';Object.assign(r,{ownerId:'a',reviewPmId:'pm1',status:'视频待 PM 初审'});
 const modern={...structuredClone(r),id:'modern-completed',status:'已创建订单',orderId:'retained-order',proposalVersions:[{id:'retained-version',version:1,total:100,currency:'USD',items:[{platform:'Instagram',type:'reel',quantity:3}]}]};
 const privateRow={...structuredClone(modern),id:'other-owner',ownerId:'b'},video={...structuredClone(r),id:'video-only',proposalId:modern.id,orderId:modern.orderId};
 db.collaborations=[r,modern,privateRow,video];db.deliveryItems=[video];
 vm.runInContext("user=USERS.find(u=>u.id==='a');page='followup';q='code_wars_official';queue='all';stage='已完成';",h.context);
 const before=JSON.stringify(db),rows=vm.runInContext('selectOrders(db,user,criteria(),proposalRows())',h.context);
 assert.deepEqual(Array.from(rows,x=>x.id).sort(),[h.id,modern.id].sort());assert(rows.every(x=>model.proposalStageOf(x)==='已完成'));
 const table=h.context.orders(rows);assert.equal((table.match(/data-detail-row/g)||[]).length,2);assert.match(table,/合作已确认（历史记录）/);assert.match(table,/订单已创建/);assert.doesNotMatch(table,/video-only|other-owner/);
 assert(!model.allowedActions(db,model.USERS.find(x=>x.id==='a'),r).createOrder);assert.doesNotMatch(h.context.cooperationStageControl(r),/data-offer-order/);
 for(const status of ['脚本待提交','视频待客户反馈','待发布','待验收','已完成']){r.status=status;assert.equal(model.proposalStageOf(r),'已完成');assert.equal(model.proposalStatus(r),'合作已确认（历史记录）');}r.status='视频待 PM 初审';
 assert.equal(JSON.stringify(db),before);assert.equal(db.deliveryItems.length,1);
});

test('completed stage leaves a pending-only filter and restores it consistently on reload without clearing search or project',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 vm.runInContext("page='followup';queue='mine';status='待 PM 审核';q='code_wars_official';campaignFilter='"+r.campaignId+"';",h.context);
 const before=JSON.stringify(db),b={dataset:{stage:'已完成'},matches:()=>false,hasAttribute:()=>false};h.dispatch('click',{target:{closest:s=>s==='button'?b:null}});
 const read=()=>vm.runInContext('({queue,stage,status,q,campaignFilter})',h.context);
 assert.deepEqual(JSON.parse(JSON.stringify(read())),{queue:'all',stage:'已完成',status:'全部',q:'code_wars_official',campaignFilter:r.campaignId});
 vm.runInContext("applyWorkspace({stage:'已完成',queue:'mine',status:'待 PM 审核',q:'code_wars_official'})",h.context);assert.equal(read().queue,'all');assert.equal(read().status,'全部');assert.equal(read().q,'code_wars_official');assert.equal(JSON.stringify(db),before);
});

test('a successful order creation keeps its completed proposal in the followup list and does not alter filters on failed persistence',()=>{
 const h=harness(),db=h.context.readDB();
 const r=db.collaborations.find(x=>x.id===h.id);delete r.confirmedAt;r.status='待 PM 审核';
 model.enablePackage(db,model.USERS.find(x=>x.role==='admin'),r.id,{total:100,currency:'USD',rights:'',items:[{platform:'Instagram',type:'reel',quantity:2}]});
 model.updateCoop(db,model.USERS.find(x=>x.role==='admin'),r.id,'approve',{clientQuote:900});model.updateCoop(db,model.USERS.find(x=>x.role==='admin'),r.id,'agree',{clientPrice:900});
 r.ownerId='a';vm.runInContext("user=USERS.find(u=>u.id==='a');page='followup';queue='mine';stage='合作确认';",h.context);h.setFailure(true);h.clickAction('confirmAndCreateOrder');assert.equal(vm.runInContext('queue',h.context),'mine');assert.equal(vm.runInContext('stage',h.context),'合作确认');
 h.setFailure(false);h.clickAction('confirmAndCreateOrder');assert.equal(vm.runInContext('queue',h.context),'all');
 const rows=vm.runInContext('selectOrders(db,user,criteria(),proposalRows())',h.context);assert(rows.some(x=>x.id===h.id));assert.equal(model.proposalStageOf(rows.find(x=>x.id===h.id)),'已完成');assert.equal(h.stored().deliveryItems.length,2);
});

test('PM approval saves an editable draft, preserves rejected input on failure, and submission starts the first round',()=>{
 const h=harness(),db=h.context.readDB(),project=db.campaigns.find(p=>p.id===db.collaborations.find(r=>r.id===h.id).campaignId);
 const admin=model.USERS.find(u=>u.role==='admin');
 const r=model.submitCreator(db,admin,db.creators[1].id,{campaignId:project.id,initial:100,rights:''});
 model.enablePackage(db,admin,r.id,{total:100,currency:'USD',rights:'90天授权',items:[{platform:'Instagram',type:'reel',quantity:2}]});
 const current=()=>h.context.readDB().collaborations.find(x=>x.id===r.id);
 const panel=h.context.submissionDecisionPanel(r);assert.match(panel,/data-kind="approve"/);assert.match(panel,/name="clientQuote"[^>]*required/);assert.doesNotMatch(panel,/data-action="approve"/);
 const before=JSON.stringify(h.context.readDB());h.submit('approve',{},r.id);assert.equal(JSON.stringify(h.context.readDB()),before);
 const values={clientQuote:'900',quoteNote:'2条，90天授权'};
 h.setFailure(true);const failed=h.submit('approve',values,r.id);assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(failed.form.values.clientQuote,'900');assert.equal(failed.button.disabled,false);
 h.setFailure(false);h.submit('approve',values,r.id);
 assert.equal(current().status,'待 PM 反馈');assert.equal(model.clientQuoteHistory(current()).length,0);
 const composer=h.context.clientQuotePanel(current());assert.match(composer,/对客报价草稿/);assert.match(composer,/value="900"/);assert.match(composer,/value="2条，90天授权"/);assert.doesNotMatch(composer,/data-kind="customerAccept"|data-action="confirmCreator"/);
 h.submit('negotiationQuote',{clientQuote:'950',quoteNote:'修改后的正式报价'},r.id);
 assert.equal(model.clientQuoteHistory(current()).length,1);assert.equal(current().clientQuoteDraft,undefined);assert.equal(model.proposalStatus(current()),'待客户报价');
 assert.match(h.context.workflowDrawerHeader(current()),/待客户报价/);
 assert.equal(model.clientQuoteHistory(current())[0].amount,950);
});


test('per-video Brief saves independently before optional email and owner records sending',()=>{
 const {h,item,draw}=progressiveDeliveryHarness(),db=h.context.readDB();item.status='待填写客户 Brief';db.deliveryItems[1].status='待填写客户 Brief';
 assert.match(draw(),/data-kind="deliveryBrief"/);assert.match(draw(),/已发送 Brief/);
 const values={briefUrl:'https://example.com/brief',briefDescription:'本条要求'},before=JSON.stringify(db);
 h.setFailure(true);const failed=h.submit('deliveryBrief',values,item.id);assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(failed.form.values.briefUrl,values.briefUrl);
 h.setFailure(false);h.submit('deliveryBrief',{briefUrl:'javascript:alert(1)'},item.id);assert.equal(JSON.stringify(h.context.readDB()),before);
 h.submit('deliveryBrief',values,item.id);assert.match(draw(),/本条要求/);assert.doesNotMatch(draw('progressive-video-2'),/本条要求/);
 vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);assert.match(draw(),/data-kind="deliveryBrief"/);assert.doesNotMatch(draw(),/data-action="briefSent"/);
 const current=h.context.readDB();model.updateCoop(current,model.USERS.find(u=>u.id==='a'),item.id,'briefSent');assert.equal(current.deliveryItems[0].status,'脚本待提交');assert.equal(current.deliveryItems[1].status,'待填写客户 Brief');assert.equal(current.orders[0].preparation.registrationEmail,undefined);
});

test('latest-link remarks append per video and survive failure, role changes and reload',()=>{
 const {h,item,draw}=progressiveDeliveryHarness(),db=h.context.readDB();db.deliveryItems.forEach(r=>{r.ownerId='a';r.reviewPmId='pm1';});
 const admin=model.USERS.find(u=>u.role==='admin');model.updateCoop(db,model.USERS.find(u=>u.id==='a'),item.id,'preparation',{registrationEmail:'new@example.com'});
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);h.submit('scriptSubmit',{url:'https://example.com/script'},item.id);
 assert.match(draw(),/等待 PM 同步客户/);assert.doesNotMatch(draw(),/data-action="scriptApprove"/);
 const before=JSON.stringify(h.context.readDB());h.setFailure(true);const failed=h.submit('scriptRemark',{remark:'运营追加'},item.id);
 assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(failed.form.values.remark,'运营追加');
 h.setFailure(false);h.submit('scriptRemark',{remark:'运营追加'},item.id);
 vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);h.submit('scriptRemark',{remark:'PM 追加 <script>'},item.id);
 const current=h.context.readDB();assert.equal(current.deliveryItems[0].deliveryRemarks.script.length,2);assert.equal(current.deliveryItems[1].deliveryRemarks,undefined);
 assert.equal(current.deliveryItems[0].status,'脚本待送客户');assert.match(draw(),/PM 追加 &lt;script&gt;/);
 assert.throws(()=>model.updateCoop(current,model.USERS.find(u=>u.id==='pm2'),item.id,'scriptRemark',{remark:'无权'}));
 assert.throws(()=>model.updateCoop(current,admin,item.id,'videoRemark',{remark:'尚无视频'}));
 vm.runInContext('db=JSON.parse(JSON.stringify(db));',h.context);assert.match(draw(),/运营追加/);assert.match(draw(),/PM 追加 &lt;script&gt;/);
});

test('legacy creator-first proposal shows next quotation and retains acceptance with safe failed-save recovery',()=>{
 const h=harness(),db=h.context.readDB(),admin=model.USERS.find(u=>u.role==='admin'),p=db.campaigns.at(-1);
 const r=model.submitCreator(db,admin,db.creators[1].id,{campaignId:p.id,initial:500,rights:''});model.enablePackage(db,admin,r.id,{total:500,currency:'USD',items:[{platform:'Instagram',type:'reel',quantity:1}],rights:''});
 model.updateCoop(db,admin,r.id,'approve',{clientQuote:1100});model.submitNegotiationQuote(db,admin,r.id,1100);model.recordCustomerOffer(db,admin,r.id,1500);model.addCreatorQuoteReply(db,admin,r.id,700);model.updateCoop(db,admin,r.id,'confirmCreator');
 const html=h.context.clientQuotePanel(r);assert.match(html,/继续对客报价/);assert.match(html,/data-kind="negotiationQuote"/);assert.match(html,/<details class="customer-acceptance">/);assert.match(html,/客户接受报价/);assert.doesNotMatch(html,/<h4>客户确认<\/h4>|达人已确认方案，待客户确认。/);
 const before=JSON.stringify(db);h.setFailure(true);const {form}=h.submit('negotiationQuote',{clientQuote:'1200',quoteNote:'next round'},r.id);assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(form.values.clientQuote,'1200');
 h.setFailure(false);h.submit('negotiationQuote',form.values,r.id);const saved=h.context.readDB().collaborations.find(x=>x.id===r.id);assert.equal(saved.status,'议价待客户确认');assert.equal(saved.clientQuotes.length,2);assert.match(h.context.clientQuotePanel(saved),/录入客户还价/);
});

test('cancellation shares one reason field and records the selected business outcome',()=>{
 for(const [cancelType,status] of [['decline','客户不合作'],['creatorDecline','达人不合作'],['cancel','合作取消']]){
  const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);r.status='议价待客户确认';r.final=null;delete r.confirmedAt;r.proposalVersions=[{id:'cancel-fixture',currency:'USD',total:1000,items:[{platform:'TikTok',type:'reel',quantity:1}]}];
  const html=h.context.proposalEndPanel(r);assert.equal((html.match(/<textarea/g)||[]).length,1);assert.equal((html.match(/<form/g)||[]).length,1);assert.match(html,/请选择取消类型/);
  h.submit('cancelCooperation',{cancelType,reason:'测试取消原因'});assert.equal(h.context.readDB().collaborations.find(x=>x.id===h.id).status,status);
 }
});
test('cancellation rejects missing or forged choices and preserves a failed-save draft',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);r.status='议价待客户确认';r.final=null;delete r.confirmedAt;r.proposalVersions=[{id:'cancel-fixture',currency:'USD',total:1000,items:[{platform:'TikTok',type:'reel',quantity:1}]}];
 const before=JSON.stringify(db);
 for(const values of [{cancelType:'',reason:'reason'},{cancelType:'approve',reason:'reason'},{cancelType:'decline',reason:' '}]){h.submit('cancelCooperation',values);assert.equal(JSON.stringify(h.context.readDB()),before);}
 h.setFailure(true);const values={cancelType:'decline',reason:'保留原因'};const {form,button}=h.submit('cancelCooperation',values);assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(form.values.reason,'保留原因');assert.equal(button.disabled,false);
});

test('compact customer acceptance retains PM handoff and operator order creation end to end',()=>{
 const h=harness(),db=h.context.readDB(),admin=model.USERS.find(u=>u.role==='admin');
 const p=projectFixture(db,model.USERS[0],{name:'Compact acceptance',client:'Test',requirements:'',members:['a']});
 const r=model.submitCreator(db,model.USERS.find(u=>u.id==='a'),db.creators[1].id,{campaignId:p.id,initial:100,rights:''});
 model.enablePackage(db,admin,r.id,{total:100,currency:'USD',items:[{platform:'Instagram',type:'reel',quantity:1}],rights:''});
 vm.runInContext("user=USERS.find(u=>u.id==='pm1');",h.context);
 h.submit('approve',{clientQuote:'900'},r.id);h.submit('negotiationQuote',{clientQuote:'900'},r.id);
 const current=()=>h.context.readDB().collaborations.find(x=>x.id===r.id);
 const html=h.context.customerAcceptancePanel(current());assert.doesNotMatch(html,/<h4>客户确认<\/h4>|class="confirmation-status"/);assert.match(html,/客户接受报价/);assert.match(html,/name="clientPrice"/);assert.match(html,/确认并移交运营/);
 assert.match(html,/报价详情（选填）/);assert.doesNotMatch(html,/<textarea[^>]*required|请先修改上方方案/);
 const quoteDetails='2条，分发YouTube\n180天版权\n<script>alert("quote")</script>';
 h.submit('customerAccept',{clientPrice:'900',reason:quoteDetails},r.id);assert.equal(current().status,'待达人确认');
 assert.equal(h.stored().collaborations.find(x=>x.id===r.id).customerAcceptance.note,quoteDetails);
 assert.equal(current().proposalVersions.at(-1).items[0].quantity,1);assert.equal(current().proposalVersions.at(-1).rights,'');
 vm.runInContext("user=USERS.find(u=>u.id==='a');",h.context);const operatorPanel=h.context.customerAcceptancePanel(current());assert.match(operatorPanel,/data-action="confirmAndCreateOrder"/);
 assert.match(operatorPanel,/报价详情/);assert.match(operatorPanel,/2条，分发YouTube\n180天版权/);assert.match(operatorPanel,/&lt;script&gt;/);assert.doesNotMatch(operatorPanel,/<script>/);
 assert.match(h.context.customerProposalEditor(current(),current().proposalVersions.at(-1)),/补正视频数量/);
 const before=JSON.stringify(h.context.readDB());h.setFailure(true);const values={quantity0:'2',reason:'客户确认两条，修正录入'};h.submit('correctVideoQuantity',values,r.id);assert.equal(JSON.stringify(h.context.readDB()),before);
 h.setFailure(false);h.submit('correctVideoQuantity',values,r.id);assert.equal(current().status,'待达人确认');assert.equal(current().proposalVersions.at(-1).items[0].quantity,2);assert.match(h.context.customerAcceptancePanel(current()),/将生成 2 条视频/);
 assert.equal(current().customerAcceptance.note,quoteDetails);assert.equal(current().customerAcceptance.clientPrice,900);
 h.clickAction('confirmAndCreateOrder',r.id);assert.equal(model.proposalStatus(current()),'订单已创建');
 const saved=h.context.readDB(),items=saved.deliveryItems.filter(x=>x.orderId===current().orderId);assert.equal(items.length,2);assert.equal(saved.orders.find(x=>x.id===current().orderId).total,100);for(const item of items){assert.equal(item.final,50);assert.equal(item.clientPrice,450);assert.equal(model.margin(item),400);}
});


test('script revision button preserves link and rolls back when saving fails',()=>{
 const h=harness();h.submit('scriptSubmit',{url:'https://example.com/live-doc'});
 h.clickAction('scriptSend');h.clickAction('scriptReturn');
 h.context.deliveryDetail(h.id);let body=h.context.lastPanel.body;
 assert.match(body,/data-action="scriptRevisionDone"/);assert.doesNotMatch(body,/data-kind="scriptSubmit"/);
 assert.match(body,/更换链接/);assert.match(body,/脚本文档/);
 const before=JSON.stringify(h.context.readDB());h.setFailure(true);h.clickAction('scriptRevisionDone');
 assert.equal(JSON.stringify(h.context.readDB()),before);assert.match(h.message.textContent,/保存失败/);
 h.setFailure(false);h.clickAction('scriptRevisionDone');
 const r=h.context.readDB().collaborations.find(r=>r.id===h.id);
 assert.equal(r.status,'脚本待送客户');assert.equal(r.deliverables.script.length,1);
 assert.equal(r.deliverables.script[0].url,'https://example.com/live-doc');
 h.context.deliveryDetail(h.id);body=h.context.lastPanel.body;
 assert.match(body,/已完成修改/);assert.match(body,/已同步客户/);
});


test('delivery action reminders are shown only to the authorized executor',()=>{
 const h=harness(),db=h.context.readDB(),r=db.collaborations.find(x=>x.id===h.id);
 r.ownerId='a';r.reviewPmId='pm1';
 r.deliverables={script:[{url:'https://example.com/script',version:1,reviews:[]}],video:[{url:'https://example.com/video',version:1,reviews:[]}]};
 for(const status of ['脚本待修改','视频待修改','待补充发布资料']){
  r.status=status;r.publishFeedback='补充正确发布链接';
  for(const [role,expected] of [['a',true],['pm1',false],['b',false]]){
   vm.runInContext('user=USERS.find(u=>u.id==='+JSON.stringify(role)+');',h.context);
   const html=vm.runInContext('deliveryStagePanels(db.collaborations.find(r=>r.id==='+JSON.stringify(h.id)+'))',h.context);
   assert.equal(/class="delivery-resubmit-note"|发布资料修改意见：/.test(html),expected,status+' '+role);
   if(role==='pm1')assert.match(html,/查看文档|查看视频|发布链接/);
  }
 }
});

test('V061 manual draft save reuses the same record and quota failure retains inputs and page',()=>{
 const h=harness(),state=h.context.readDB(),creator=state.creators[1],project=state.campaigns.at(-1);
 const fields=[{name:'campaignId',value:project.id,type:'select-one'},{name:'total',value:'0',type:'number'},{name:'creatorType',value:'',type:'text'}];
 const form={dataset:{kind:'submit',id:creator.id},elements:fields};h.context.testDraftForm=form;h.context.testCreatorId=creator.id;
 vm.runInContext("creatorPageId=testCreatorId;creatorSubmitOpen=true;pageDirty=true;content.querySelector=()=>testDraftForm;user=USERS.find(u=>u.id==='a');persistSubmissionDraft();",h.context);
 const saved=h.stored().proposalDrafts[0];assert.equal(saved.fields.find(x=>x.name==='total').value,'0');assert.equal(vm.runInContext('pageDirty',h.context),false);
 fields[1].value='125';vm.runInContext('pageDirty=true;persistSubmissionDraft();',h.context);assert.equal(h.stored().proposalDrafts.length,1);assert.equal(h.stored().proposalDrafts[0].id,saved.id);
 h.setFailure(true);fields[1].value='200';vm.runInContext('pageDirty=true;',h.context);assert.throws(()=>vm.runInContext('persistSubmissionDraft()',h.context),/保存失败/);
 assert.equal(h.stored().proposalDrafts[0].fields.find(x=>x.name==='total').value,'125');assert.equal(fields[1].value,'200');assert.equal(vm.runInContext('pageDirty&&creatorSubmitOpen',h.context),true);
});

test('V061 validation focus excludes hidden and disabled controls',()=>{
 const h=harness(),hidden={disabled:true,type:'text',validity:{valid:false},focus(){throw Error('disabled control was focused');}},amount={name:'total',value:'0',type:'number',validity:{valid:true},setAttribute(){},focus(){this.focused=true;}};
 h.context.focusForm={dataset:{kind:'submit'},querySelectorAll:()=>[hidden,amount]};vm.runInContext("focusInvalidField(focusForm,'请填写有效的Package 总价')",h.context);assert.equal(amount.focused,true);
});

test('V061 selected followup draft and project change restore the exact project without duplicating drafts',()=>{
 const h=harness(),db=h.context.readDB(),u=model.USERS.find(u=>u.id==='a'),creator=db.creators[1],first=db.campaigns[0],second=db.campaigns.at(-1);
 const a=model.saveProposalDraft(db,u,creator.id,first.id,[{name:'campaignId',value:first.id},{name:'total',value:'100'}]);const b=model.saveProposalDraft(db,u,creator.id,second.id,[{name:'campaignId',value:second.id},{name:'total',value:'200'}]);a.updatedAt='2026-10-18T00:00:00Z';b.updatedAt='2026-10-19T00:00:00Z';
 h.context.selectedDraftId=a.id;h.context.selectedCreatorId=creator.id;h.context.otherProjectId=second.id;vm.runInContext("user=USERS.find(u=>u.id==='a');activeDraftId=selectedDraftId;",h.context);
 assert.equal(vm.runInContext('draftForCreator(selectedCreatorId).id',h.context),a.id);assert.equal(vm.runInContext('draftForCreator(selectedCreatorId,otherProjectId).id',h.context),b.id);assert.match(h.context.draftList(),new RegExp('data-draft-id="'+a.id+'"'));assert.equal(db.proposalDrafts.length,2);
});
