import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from './model.mjs';
import * as components from './design-system/components.mjs';
import {completeFixture,projectFixture} from './test-fixtures.mjs';

// Run the actual app handlers against synthetic data and an in-memory store.
// Control validity is supplied by the harness; browser-native focus/layout needs browser QA.
function harness(role='operator'){
 const db=completeFixture();model.upgrade(db);
 db.collaborations=[];db.orders=[];db.deliveryItems=[];db.proposalDrafts=[];
 const actor=model.USERS.find(u=>u.role===role),pm=model.USERS.find(u=>u.role==='pm');
 const project=projectFixture(db,pm,{name:'Creator detail test',client:'Synthetic',requirements:'',members:['a']});
 const creator=db.creators[0];
 Object.assign(creator,{createdBy:actor.id,initiatorIds:[actor.id],contact:'profile@example.test',country:'美国',language:'英语',creatorType:'生活方式',accounts:[{platform:'YouTube',handle:'@synthetic',url:'https://youtube.com/@synthetic',followers:1000,views:500}]});
 let stored=JSON.stringify(db),writes=0;
 const listeners={},message={dataset:{},textContent:''},content={querySelector:()=>null,querySelectorAll:()=>[]};
 const root={querySelector:()=>null,querySelectorAll:()=>[],addEventListener(kind,handler,capture=false){(listeners[kind]??=[]).push({handler,capture});}};
 const context=vm.createContext({...model,...components,console,crypto,URL,structuredClone,setTimeout:()=>1,clearTimeout(){},
  businessStorage:{getItem:()=>stored,setItem(_key,value){stored=value;writes++;}},viewStorage:undefined,isFollowupDemo:false,
  document:{getElementById:id=>id==='crm-preview'?root:id==='crm-content'?content:message},
  FormData:class{
   constructor(form){this.fields=form.elements.filter(el=>el.name&&!el.disabled&&(el.type!=='checkbox'||el.checked));}
   get(name){return this.fields.find(el=>el.name===name)?.value??null;}
   getAll(name){return this.fields.filter(el=>el.name===name).map(el=>el.value);}
  }
 });
 const source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'')
  .replace(/^document\.getElementById\('account'\).*\n/m,'');
 vm.runInContext(source+'\nrender=()=>{};showSaveToast=()=>{};globalThis.readDB=()=>db;',context);
 context.actorId=actor.id;
 vm.runInContext('user=USERS.find(u=>u.id===actorId);',context);
 return {context,creatorId:creator.id,projectId:project.id,actor,root,content,message,listeners,
  run:code=>vm.runInContext(code,context),stored:()=>JSON.parse(stored),writes:()=>writes,
  dispatch(kind,target,extra={}){
   let stopped=false;
   const event={target,...extra,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){stopped=true;}};
   for(const {handler} of [...(listeners[kind]||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){handler(event);if(stopped)break;}
   return event;
  }
 };
}

function proposalForm(h,values={}){
 const notes={open:false},error={dataset:{},textContent:'',hidden:true};
 const editButton={dataset:{editCreatorProfile:h.creatorId},textContent:'编辑资料',focus(){this.focused=true;},scrollIntoView(){}};
 const profilePanel={scrollIntoView(){},querySelector:()=>editButton};
 const fields=Object.fromEntries(Object.entries({
  campaignId:h.projectId,reviewPmId:'pm1',compactProposal:'2',deliveryPlatform0:'YouTube',type0:'dedicated',
  quantity0:'1',total:'100',currency:'USD',rights:'',cooperationNotes:'',...values
 }).map(([name,value])=>[name,{name,value,type:name==='cooperationNotes'?'textarea':'text',disabled:false,validity:{valid:true},dataset:{},
  matches:()=>false,removeAttribute(){},setCustomValidity(){},setAttribute(){},focus(){},
  closest(selector){return selector==='form'?form:selector==='details'?notes:null;}
 }]));
 const buttons=[{disabled:false},{disabled:false}],regions={innerHTML:''},addDelivery={hidden:false};
 const rows=Array.from({length:3},(_,i)=>({hidden:i>0,querySelectorAll:()=>['deliveryPlatform','type','quantity'].map(name=>fields[name+i]).filter(Boolean)}));
 const form={dataset:{kind:'submit',id:h.creatorId},elements:Object.values(fields),
  querySelector(selector){
   if(selector==='[data-form-error]')return error;
   if(selector==='.creator-proposal-notes')return notes;
   if(selector==='[data-region-fields]')return regions;
   if(selector==='[data-add-delivery="next"]')return addDelivery;
   if(selector==='[data-delivery-row][hidden]')return rows.find(row=>row.hidden)||null;
   const row=selector.match(/^\[data-delivery-row="([0-2])"\]$/);if(row)return rows[Number(row[1])];
   return fields[selector.match(/(?:^|\s)(?:input|textarea|select)?\[name="([^"]+)"\]$/)?.[1]]||null;
  },
  querySelectorAll:selector=>selector==='button'?buttons:Object.values(fields),
  matches:selector=>selector==='form'||selector.includes('.creator-proposal-form'),
  closest:selector=>selector==='.creator-detail-page'?profilePanel:null,
  reportValidity:()=>true
 };
 const find=selector=>selector==='form[data-kind="submit"]'?form:selector.includes('data-edit-creator-profile')?editButton:selector==='.creator-summary-panel'?profilePanel:null;
 h.content.querySelector=find;h.root.querySelector=find;
 h.context.testForm=form;h.context.testCreatorId=h.creatorId;
 h.run("creatorPageId=testCreatorId;creatorSubmitOpen=true;page='creators';");
 return {form,fields,notes,error,editButton,buttons,rows};
}

test('proposal form has no duplicate profile controls and the top profile retains its editing entry',()=>{
 const h=harness(),html=h.context.submissionForm(h.creatorId);
 assert.doesNotMatch(html,/name="(?:contact|country|language|creatorType)"|creator-submission-profile/);
 assert.match(h.context.creatorProfileBody(h.creatorId),/data-edit-creator-profile=/);
 assert.match(html,/<button type="button" data-save-proposal-draft>保存草稿<\/button>/);
 assert.match(html,/<button type="submit" class="primary">提交提报<\/button><\/div><\/form>$/);
});

test('submission snapshots the current saved profile and ignores stale profile values in FormData',()=>{
 const h=harness(),current=h.context.readDB().creators[0];
 Object.assign(current,{contact:'latest@example.test',country:'加拿大',language:'法语',creatorType:'科技'});
 const expected=structuredClone(current),ui=proposalForm(h,{contact:'old@example.test',country:'美国',language:'英语',creatorType:'旧分类'});
 h.dispatch('submit',ui.form);
 const db=h.stored(),proposal=db.collaborations.at(-1);
 assert(proposal,ui.error.textContent||h.message.textContent);
 assert.deepEqual(proposal.submissionSnapshot,expected);
 assert.deepEqual(db.creators[0],expected);
 assert.equal(proposal.status,'待 PM 审核');
 assert.equal(ui.form.dataset.committed,'true');
});

test('missing required or model-invalid current profile blocks submission and points to the top editor without writes',()=>{
 for(const invalid of [{creatorType:''},{country:''},{language:''},{contact:'review@example'}]){
  const h=harness(),ui=proposalForm(h);
  Object.assign(h.context.readDB().creators[0],invalid);
  const before=JSON.stringify(h.context.readDB()),writes=h.writes();
  assert.equal(h.context.validateCreatorSubmissionProfile(ui.form),false);
  assert.match(ui.error.textContent,/达人类型|国家|语言|有效联系邮箱/);
  assert.equal(ui.editButton.focused,true);
  assert.equal(h.dispatch('submit',ui.form).defaultPrevented,true);
  assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(h.writes(),writes);
  assert.equal(h.context.readDB().collaborations.length,0);
 }
});

test('a missing profile never grants editing permission to another project member',()=>{
 const h=harness(),ui=proposalForm(h);
 Object.assign(h.context.readDB().creators[0],{createdBy:'b',initiatorIds:['b'],creatorType:''});
 const before=JSON.stringify(h.context.readDB()),writes=h.writes();
 assert.equal(model.canEditCreator(h.context.readDB(),h.actor,h.context.readDB().creators[0]),false);
 assert.doesNotMatch(h.context.creatorProfileBody(h.creatorId),/data-edit-creator-profile=/);
 h.dispatch('submit',ui.form);
 assert.match(ui.error.textContent,/发起人|管理员/);
 assert.equal(h.context.readDB().collaborations.length,0);
 assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(h.writes(),writes);
});

test('operators and PMs can submit a saved profile with either supported creator type',()=>{
 for(const role of ['operator','pm'])for(const creatorType of ['AI工具','3D建模']){
  const h=harness(role),ui=proposalForm(h,role==='pm'?{clientQuote:'150'}:{});
  h.context.readDB().creators[0].creatorType=creatorType;
  assert.equal(h.context.validateCreatorSubmissionProfile(ui.form),true);
  h.dispatch('submit',ui.form);
  const db=h.stored(),proposal=db.collaborations.at(-1);
  assert(proposal,ui.error.textContent||h.message.textContent);
  assert.equal(db.creators[0].creatorType,creatorType);
  assert.equal(proposal.submissionSnapshot.creatorType,creatorType);
  assert.equal(ui.form.dataset.committed,'true');
  if(role==='pm'){
   assert.equal(proposal.selfManagedPmId,h.actor.id);
   assert.equal(proposal.clientQuoteDraft,undefined);
   assert.equal(model.clientQuoteHistory(proposal).length,1);
   assert.equal(model.clientQuoteHistory(proposal)[0].amount,150);
   assert.equal(model.proposalStatus(proposal),'待客户报价');
  }else assert.equal(proposal.status,'待 PM 审核');
 }
});

test('both profile editors require one creator type choice and preserve existing values',()=>{
 const h=harness();
 h.run('panel=(title,body)=>{globalThis.lastEditor=body;};');
 for(const value of ['', 'AI工具', '3D建模', '生活方式']){
  const creator=h.context.readDB().creators[0];creator.creatorType=value;
  h.context.editCreator(h.creatorId,true);
  for(const html of [h.context.lastEditor,h.context.creatorDrawerBody(creator,'basic')]){
   const select=html.match(/<select\b[^>]*name="creatorType"[^>]*>[\s\S]*?<\/select>/)?.[0];
   assert(select,'The creator type editor should render a select');
   assert.match(select,/<select\b[^>]*\srequired(?:\s|>)/);
   assert.match(select,/<select\b[^>]*aria-required="true"/);
   assert.doesNotMatch(select,/<select\b[^>]*\bmultiple\b/);
   assert.match(html,/<label>达人类型 \*<select\b/);
   const entries=[...select.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(([,attributes,label])=>({
    attributes,label,value:attributes.match(/\bvalue="([^"]*)"/)?.[1]
   }));
   assert.deepEqual(entries.filter(entry=>! /\bhidden\b/.test(entry.attributes)).map(entry=>entry.value),['','AI工具','3D建模']);
   assert.equal(entries.find(entry=>entry.value==='').label,'请选择达人类型');
   const selected=entries.filter(entry=>/\bselected\b/.test(entry.attributes));
   assert.equal(selected.length,1);assert.equal(selected[0].value,value);
   assert.doesNotMatch(selected[0].attributes,/\bdisabled\b/,'Saving another field must not drop the existing type');
   if(value==='生活方式')assert.match(selected[0].attributes,/\bhidden\b/);
  }
 }
});

test('legacy draft profile values survive restore and resave while business fields and notes recover independently',()=>{
 const h=harness(),ui=proposalForm(h),db=h.context.readDB(),profileBefore=JSON.stringify(db.creators[0]);
 const legacy=[
  {name:'contact',value:'draft@example.test',type:'email'},
  {name:'country',value:'英国',type:'text'},
  {name:'language',value:'德语',type:'text'},
  {name:'creatorType',value:'旧类型',type:'text'}
 ];
 const fields=[...legacy,
  {name:'campaignId',value:h.projectId,type:'select-one'},
  {name:'total',value:'225',type:'number'},
  {name:'cooperationNotes',value:'保留旧合作备注',type:'textarea'}
 ];
 const draft=model.saveProposalDraft(db,h.actor,h.creatorId,h.projectId,fields);
 h.context.restoreSubmissionDraft({id:h.creatorId,fields:draft.fields});
 assert.equal(ui.fields.total.value,'225');assert.equal(ui.fields.cooperationNotes.value,'保留旧合作备注');
 assert.equal(ui.notes.open,true);
 assert.deepEqual(JSON.parse(JSON.stringify(ui.form.creatorLegacyProfileFields)),legacy);
 assert.match(ui.editButton.textContent,/草稿待核对/);
 const captured=h.context.captureSubmissionDraft();
 assert.deepEqual(JSON.parse(JSON.stringify(captured.fields.filter(f=>legacy.some(old=>old.name===f.name)))),legacy);
 ui.fields.total.value='300';h.context.persistSubmissionDraft();
 const saved=h.stored().proposalDrafts;
 assert.equal(saved.length,1);assert.equal(saved[0].id,draft.id);
 assert.equal(saved[0].fields.find(f=>f.name==='total').value,'300');
 assert.deepEqual(saved[0].fields.filter(f=>legacy.some(old=>old.name===f.name)),legacy);
 assert.equal(JSON.stringify(h.context.readDB().creators[0]),profileBefore);
 assert.equal(h.stored().collaborations.length,0);
});

test('opening and cancelling the top editor preserves pending proposal values for both close and Escape',()=>{
 const h=harness(),ui=proposalForm(h,{total:'275',cooperationNotes:'尚未保存的合作备注'});
 const before=JSON.stringify(h.context.readDB()),writes=h.writes(),find=h.root.querySelector;
 let drawerOpen=false;
 const drawer={remove(){drawerOpen=false;}},main={inert:false},header={inert:false};
 h.root.querySelector=selector=>selector==='.detail-drawer'?(drawerOpen?drawer:null):selector==='main'?main:selector==='header'?header:find(selector);
 h.context.document.body={style:{}};
 h.context.window={scrollTo(){}};
 h.context.openTestDrawer=()=>{drawerOpen=true;};
 h.run("panel=(title,body)=>{drawerDirty=false;globalThis.lastEditor=body;openTestDrawer();};showDraftLeaveDialog=()=>{throw Error('Opening or cancelling profile edit must preserve the proposal');};pageDirty=true;");
 const edit={dataset:{editCreatorProfile:h.creatorId},matches:()=>false,hasAttribute:()=>false};
 const close={dataset:{},matches:()=>false,hasAttribute:name=>name==='data-close'};
 const target=button=>({closest:selector=>selector==='button'?button:null});
 for(const kind of ['click','keydown']){
  h.dispatch('click',target(edit));
  assert.equal(drawerOpen,true);
  assert.match(h.context.lastEditor,/data-kind="creatorSubmissionProfile"/);
  assert.match(h.context.lastEditor,/name="creatorType"/);
  h.run('drawerDirty=true;');h.context.confirm=()=>false;
  const dispatch=()=>kind==='click'?h.dispatch('click',target(close)):h.dispatch('keydown',{matches:()=>false},{key:'Escape'});
  assert.equal(dispatch().defaultPrevented,true);assert.equal(drawerOpen,true);
  assert.equal(h.run('pageDirty&&drawerDirty'),true);
  h.context.confirm=()=>true;dispatch();
  assert.equal(drawerOpen,false);
  assert.equal(h.run('pageDirty&&!drawerDirty'),true);
  const captured=h.context.captureSubmissionDraft();
  assert.equal(captured.fields.find(field=>field.name==='total').value,'275');
  assert.equal(captured.fields.find(field=>field.name==='cooperationNotes').value,'尚未保存的合作备注');
 }
 assert.equal(JSON.stringify(h.context.readDB()),before);assert.equal(h.writes(),writes);
});

test('incomplete drafts can save while resubmission, completed and unavailable forms omit new-draft controls',()=>{
 const h=harness(),ui=proposalForm(h,{total:'0'});
 h.context.readDB().creators[0].creatorType='';
 ui.form.reportValidity=()=>{throw Error('Saving an incomplete draft must not validate a formal submission');};
 const button={dataset:{},matches:()=>false,hasAttribute:name=>name==='data-save-proposal-draft'};
 const target={closest:selector=>selector==='button'?button:null};
 h.dispatch('click',target);
 assert.equal(h.stored().proposalDrafts.length,1);
 assert.equal(h.stored().proposalDrafts[0].fields.find(f=>f.name==='total').value,'0');
 assert.equal(h.stored().creators[0].creatorType,'');
 assert.equal(h.stored().collaborations.length,0);
 const db=h.context.readDB();db.creators[0].creatorType='生活方式';
 const record=model.submitPackage(db,h.actor,h.creatorId,{
  campaignId:h.projectId,total:100,currency:'USD',items:[{platform:'YouTube',type:'dedicated',quantity:1}],rights:''
 });
 record.status='不予提报';record.closeReason='需调整';
 h.context.recordId=record.id;h.run('resubmissionId=recordId;');
 const resubmission=h.context.submissionForm(h.creatorId);
 assert.match(resubmission,/data-kind="reopenSubmission"/);assert.match(resubmission,/提交复审/);
 assert.doesNotMatch(resubmission,/data-save-proposal-draft/);
 h.run('submittedProposalId=recordId;');
 assert.doesNotMatch(h.context.submissionForm(h.creatorId),/<form|data-save-proposal-draft/);
 h.run("submittedProposalId='';resubmissionId='';user={id:'no-project',role:'operator'};");
 const unavailable=h.context.submissionForm(h.creatorId);
 assert.match(unavailable,/暂无可提报项目/);assert.doesNotMatch(unavailable,/<form|data-save-proposal-draft/);
});

test('PM detail submission records its required customer quote as R1 and skips proposal review',()=>{
 const h=harness('pm'),html=h.context.submissionForm(h.creatorId);
 assert.match(html,/免提报审核/);assert.match(html,/<button type="submit" class="primary">提交提报<\/button>/);
 assert.match(html,/对客报价（与方案同币种）/);assert.doesNotMatch(html,/对客报价草稿/);
 assert.match(html,/<input[^>]*name="clientQuote"[^>]*required/);
 assert.doesNotMatch(html,/name="reviewPmId"|name="targetCountry"/);
 const ui=proposalForm(h,{clientQuote:'150'});
 h.dispatch('submit',ui.form);
 const proposal=h.stored().collaborations.at(-1);
 assert(proposal, h.message.textContent);
 assert.equal(model.proposalStatus(proposal),'待客户报价');
 assert.equal(proposal.selfManagedPmId,h.actor.id);assert.equal(proposal.reviewPmId,h.actor.id);
 assert.equal(proposal.clientQuoteDraft,undefined);
 const quotes=model.clientQuoteHistory(proposal);
 assert.equal(quotes.length,1);assert.equal(quotes[0].round,1);assert.equal(quotes[0].amount,150);
 assert.equal(quotes[0].by,h.actor.id);assert.equal(quotes[0].currency,'USD');
 assert.equal(model.canSubmitNegotiationQuote(h.context.readDB(),h.actor,proposal),false);
 assert.equal(model.canRecordCustomerOffer(h.context.readDB(),h.actor,proposal),true);
 assert.doesNotMatch(h.context.clientQuotePanel(proposal),/data-kind="negotiationQuote"|对客报价草稿/);
 assert.equal(model.customerAcceptanceFor(proposal),null);assert.equal(proposal.submissionApprovedAt,undefined);
 assert.equal(ui.form.dataset.committed,'true');assert(ui.buttons.every(button=>!button.disabled));
 h.dispatch('submit',ui.form);
 assert.equal(h.stored().collaborations.length,1);
 assert.equal(model.clientQuoteHistory(h.stored().collaborations[0]).length,1);
});


test('every saved account requires finite non-negative metrics before a new proposal can commit',()=>{
 const metrics=[['followers','粉丝量'],['views','均播']];
 for(const role of ['operator','pm'])for(const [key,label] of metrics)for(const value of [undefined,null,'','  ',NaN,Infinity,-1]){
  const h=harness(role),ui=proposalForm(h,role==='pm'?{clientQuote:'150'}:{}),db=h.context.readDB();
  db.creators[0].accounts.push({platform:'YouTube',handle:'@second',url:'https://youtube.com/@second',followers:2000,views:800,[key]:value});
  const before=structuredClone(db),writes=h.writes();
  assert.equal(h.context.validateCreatorSubmissionProfile(ui.form),false);
  assert.match(ui.error.textContent,new RegExp('@second.*'+label));
  h.dispatch('submit',ui.form);
  assert.deepEqual(structuredClone(db),before);assert.equal(h.writes(),writes);
  for(const submit of [model.submitCreator,model.submitPackage]){
   assert.throws(()=>submit(db,h.actor,h.creatorId,{campaignId:h.projectId,initial:100,total:100,currency:'USD',items:[{platform:'YouTube',type:'dedicated',quantity:1}]}),new RegExp(label));
   assert.deepEqual(structuredClone(db),before);
  }
 }
 const h=harness(),db=h.context.readDB();db.creators[0].accounts=[];
 const before=structuredClone(db);
 assert.throws(()=>model.submitCreator(db,h.actor,h.creatorId,{campaignId:h.projectId,initial:100}),/添加.*账号/);
 assert.deepEqual(structuredClone(db),before);
});

test('zero metrics are real values and are captured in the submitted profile snapshot',()=>{
 for(const role of ['operator','pm']){
  const h=harness(role),ui=proposalForm(h,role==='pm'?{clientQuote:'150'}:{});
  Object.assign(h.context.readDB().creators[0].accounts[0],{followers:0,views:0});
  h.dispatch('submit',ui.form);
  const record=h.stored().collaborations.at(-1);
  assert(record,ui.error.textContent||h.message.textContent);
  assert.equal(record.submissionSnapshot.accounts[0].followers,0);
  assert.equal(record.submissionSnapshot.accounts[0].views,0);
 }
});

test('reopening checks current account metrics and preserves rejection history on failure',()=>{
 const h=harness(),db=h.context.readDB(),terms={campaignId:h.projectId,total:100,currency:'USD',items:[{platform:'YouTube',type:'dedicated',quantity:1}],rights:''};
 const record=model.submitPackage(db,h.actor,h.creatorId,terms),pm=model.USERS.find(u=>u.id===record.reviewPmId);
 model.updateCoop(db,pm,record.id,'reject',{reason:'请补充最新数据'});
 const account=db.creators[0].accounts[0];account.views=null;
 const before=structuredClone(db);
 assert.throws(()=>model.updateCoop(db,h.actor,record.id,'reopenSubmission',{...terms,reason:'重新提报'}),/均播/);
 assert.deepEqual(structuredClone(db),before);
 const ui=proposalForm(h);ui.form.dataset.kind='reopenSubmission';ui.form.dataset.id=record.id;
 h.dispatch('submit',ui.form);
 assert.match(ui.error.textContent,/均播/);assert.equal(ui.editButton.focused,true);assert.deepEqual(structuredClone(db),before);
 account.views=750;
 model.updateCoop(db,h.actor,record.id,'reopenSubmission',{...terms,reason:'已补充最新均播'});
 assert.equal(record.status,'待 PM 审核');assert.equal(record.proposalVersions.length,2);
 assert.equal(record.events.at(-1).previousRejection.reason,'请补充最新数据');
});

function profileEditorForm(h){
 const creator=h.context.readDB().creators[0],accountRows=Array.from(h.context.creatorEditorAccounts(creator));
 const values={name:creator.name,country:creator.country,language:creator.language,contact:creator.contact,creatorType:creator.creatorType};
 accountRows.forEach((account,i)=>{for(const key of ['handle','url','followers','views'])values[key+i]=account[key]??'';});
 const labels={},fields=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,{name,value:String(value),type:'text',disabled:false,required:false,matches:()=>false,dataset:{},
  setAttribute(key,value){this[key]=value;},removeAttribute(key){delete this[key];},
  closest(selector){return selector==='label'?(labels[name]??={firstChild:{textContent:''}}):selector==='form'?form:selector==='[data-profile-account]'?rows.find(row=>row.fields.includes(this)):null;}
 }]));
 const rows=accountRows.map((_,i)=>({fields:['handle','url','followers','views'].map(key=>fields[key+i]),querySelector(selector){return fields[selector.match(/name\^="([^"]+)"/)?.[1]+i];}}));
 const error={dataset:{},textContent:'',hidden:true},buttons=[{disabled:false}];
 const form={dataset:{kind:'creatorSubmissionProfile',id:h.creatorId},elements:Object.values(fields),
  matches:selector=>selector==='form',querySelector:selector=>selector==='[data-form-error]'?error:null,
  querySelectorAll:selector=>selector==='[data-profile-account]'?rows:selector==='button'?buttons:Object.values(fields),
  reportValidity:()=>Object.values(fields).every(field=>!field.required||field.value.trim()!=='')};
 h.run('close=()=>{};creatorDetail=()=>{};');
 return {form,fields,rows,error,labels};
}

test('the submission profile editor saves both metrics for multiple accounts on the same platform',()=>{
 const h=harness(),creator=h.context.readDB().creators[0];
 creator.accounts=[{id:'account-primary',platform:'YouTube',handle:'@primary',url:'https://youtube.com/@primary',followers:1000,views:500},
  {id:'account-secondary',platform:'YouTube',handle:'@secondary',url:'https://youtube.com/@secondary',followers:2000,views:800}];
 h.run('panel=(title,body)=>{globalThis.lastEditor=body;};');h.context.editCreator(h.creatorId,true);
 const sections=[...h.context.lastEditor.matchAll(/<section[^>]*data-profile-account[^>]*>([\s\S]*?)<\/section>/g)].map(match=>match[1]);
 assert.equal(sections.length,4);
 for(const section of sections){
  const existing=section.includes('@primary')||section.includes('@secondary');
  const metrics=[...section.matchAll(/<input[^>]*name="(?:followers|views)\d+"[^>]*>/g)].map(match=>match[0]);
  assert.equal(metrics.length,2);assert.equal(metrics.every(field=>/\srequired(?:\s|>)/.test(field)),existing);
 }
 const ui=profileEditorForm(h),rows=Array.from(h.context.creatorEditorAccounts(creator));
 const first=rows.findIndex(row=>row.id==='account-primary'),second=rows.findIndex(row=>row.id==='account-secondary');
 ui.fields['followers'+first].value='1100';ui.fields['views'+first].value='600';
 ui.fields['followers'+second].value='2100';ui.fields['views'+second].value='900';
 h.dispatch('submit',ui.form);
 const saved=h.stored().creators[0].accounts;
 assert.equal(saved.length,2,ui.error.textContent||h.message.textContent);
 assert.deepEqual(saved.map(({id,followers,views})=>({id,followers,views})),[
  {id:'account-primary',followers:1100,views:600},{id:'account-secondary',followers:2100,views:900}]);
 const reloaded=JSON.parse(JSON.stringify(h.stored()));model.validateSubmissionProfile(reloaded.creators[0]);
});

test('profile metric requirements follow added or removed accounts and block incomplete saves',()=>{
 const h=harness(),ui=profileEditorForm(h),rows=Array.from(h.context.creatorEditorAccounts(h.context.readDB().creators[0]));
 const existing=rows.findIndex(row=>row.handle),empty=rows.findIndex(row=>!row.handle&&!row.url);
 ui.fields['views'+existing].value='';const before=structuredClone(h.context.readDB()),writes=h.writes();
 h.dispatch('submit',ui.form);assert.equal(ui.fields['views'+existing].required,true);
 assert.deepEqual(structuredClone(h.context.readDB()),before);assert.equal(h.writes(),writes);
 ui.fields['handle'+empty].value='@new-account';h.dispatch('input',ui.fields['handle'+empty]);
 assert.equal(ui.fields['followers'+empty].required,true);assert.equal(ui.fields['views'+empty].required,true);
 assert.match(ui.labels['views'+empty].firstChild.textContent,/均播 \*/);
 ui.fields['handle'+empty].value='';h.dispatch('input',ui.fields['handle'+empty]);
 assert.equal(ui.fields['followers'+empty].required,false);assert.equal(ui.fields['views'+empty].required,false);
});

test('proposal drafts still save while account metrics are incomplete',()=>{
 const h=harness(),ui=proposalForm(h),account=h.context.readDB().creators[0].accounts[0];
 account.followers=null;account.views=null;
 const button={dataset:{},matches:()=>false,hasAttribute:name=>name==='data-save-proposal-draft'};
 h.dispatch('click',{closest:selector=>selector==='button'?button:null});
 assert.equal(h.stored().proposalDrafts.length,1);assert.equal(h.stored().collaborations.length,0);
 assert.equal(h.stored().creators[0].accounts[0].followers,null);assert.equal(h.stored().creators[0].accounts[0].views,null);
});
