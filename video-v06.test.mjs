import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as M from './model.mjs';
import * as components from './design-system/components.mjs';
import {createPreviewData} from './preview-fixtures.mjs';
const user=id=>M.USERS.find(u=>u.id===id),op=user('a'),pm=user('pm2');
function fixture(){const db=createPreviewData();return {db,r:db.deliveryItems[0],act:(i,u,a,d={})=>M.updateCoop(db,user(u),'preview-video-'+i,a,d)};}
function harness(){
 let stored=JSON.stringify(createPreviewData()),fail=false,onWrite=null,activeForm=null;const events={},message={textContent:'',dataset:{}};
 const root={querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(k,h,c)=>{if(!c&&!events[k])events[k]=h;}};
 const storage={getItem:key=>key===M.KEY?stored:null,setItem:(key,value)=>{assert.equal(key,M.KEY);onWrite?.(activeForm);if(fail)throw Error('QuotaExceededError');stored=value;}};
 let source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^document\.getElementById\('account'\).*\n/m,'');
 const ctx=vm.createContext({...M,...components,console,crypto,URL,structuredClone,setTimeout:()=>1,clearTimeout(){},businessStorage:storage,viewStorage:undefined,isFollowupDemo:false,
 document:{getElementById:id=>id==='crm-preview'?root:id==='crm-content'?{}:message},FormData:class{constructor(f){this.values=f.values;}get(k){return this.values[k]??null;}getAll(k){return this.values[k]||[];}}});
 vm.runInContext(source+"\nuser=USERS.find(u=>u.id==='a');render=()=>{};panel=(title,body)=>globalThis.lastPanel={title,body};coopDetail=()=>{};globalThis.readDB=()=>db;",ctx);
 return {ctx,message,dispatchForm:form=>events.submit({preventDefault(){},target:form}),onWrite:fn=>onWrite=fn,setFailure:v=>fail=v,stored:()=>JSON.parse(stored),as(id){vm.runInContext('user=USERS.find(u=>u.id==='+JSON.stringify(id)+')',ctx);},html(i){return vm.runInContext('deliveryBriefPanel(db.deliveryItems['+i+'])+deliveryStagePanels(db.deliveryItems['+i+'])',ctx);},submit(kind,i,values={}){const button={disabled:false};const form={dataset:{kind,id:'preview-video-'+i},values,querySelectorAll:()=>[button]};activeForm=form;events.submit({preventDefault(){},target:form});return {form,button};},click(action,i){const b={dataset:{action,coopId:'preview-video-'+i},disabled:false,matches:()=>false,hasAttribute:()=>false};events.click({target:{closest:s=>s==='button'?b:null}});return b;}};
}
test('Brief save does not advance; only owner sends; sibling unchanged',()=>{
 const {db,r,act}=fixture(),sibling=JSON.stringify(db.deliveryItems[1]);
 act(0,'a','deliveryBrief',{briefUrl:'https://example.com/new',briefDescription:'owner'});assert.equal(r.status,'待填写客户 Brief');
 act(0,'pm2','deliveryBrief',{briefDescription:'PM'});assert.equal(r.status,'待填写客户 Brief');assert.throws(()=>act(0,'pm2','briefSent'));assert.throws(()=>act(0,'b','deliveryBrief'));
 act(0,'a','briefSent');assert.equal(r.status,'脚本待提交');assert.equal(JSON.stringify(db.deliveryItems[1]),sibling);assert.throws(()=>act(0,'a','briefSent'));assert.equal(M.allowedActions(db,op,r).deliveryBrief,false);
});
test('optional preparation has independent permissions, accepts code OR link, never gates script',()=>{
 const {db,act}=fixture();act(1,'a','scriptSubmit',{url:'https://example.com/script'});assert.equal(db.deliveryItems[1].status,'脚本待送客户');
 act(0,'pm2','preparationPm',{inviteCode:'TEST'});assert.equal(db.orders[0].preparation.inviteCode,'TEST');assert.equal(db.deliveryItems[0].status,'待填写客户 Brief');
 act(0,'a','preparation',{registrationEmail:'test@example.com'});assert.throws(()=>act(0,'a','preparationPm',{inviteCode:'BAD'}));assert.throws(()=>act(0,'pm2','preparation',{registrationEmail:'x@example.com'}));
 act(0,'pm2','preparationPm',{inviteLink:'https://example.com/invite'});assert.throws(()=>act(0,'pm2','preparationPm',{inviteLink:'javascript:alert(1)'}));
});
test('script and draft workflow has only the two feedback results and no extra approval',()=>{
 const {db,act}=fixture();act(1,'a','scriptSubmit',{url:'https://example.com/s'});assert.throws(()=>act(1,'pm2','scriptApprove'));act(1,'pm2','scriptSend');act(1,'pm2','scriptReturn');assert.equal(db.deliveryItems[1].status,'脚本待修改');act(1,'a','scriptRevisionDone');act(1,'pm2','scriptSend');act(1,'pm2','scriptPass');assert.equal(db.deliveryItems[1].status,'视频待提交');
 act(1,'a','videoSubmit',{url:'https://example.com/v'});act(1,'pm2','videoSend');act(1,'pm2','videoReturn');act(1,'a','videoSubmit',{url:'https://example.com/v2'});act(1,'pm2','videoSend');act(1,'pm2','videoPass');assert.equal(db.deliveryItems[1].status,'待发布');
});
test('submitted script can be corrected, preserves state and exposes PM notification; draft replacement stays unavailable',()=>{
 const {db,act}=fixture();act(3,'a','scriptLink',{url:'https://example.com/revised'});assert.equal(db.deliveryItems[3].status,'脚本待客户反馈');assert.ok(db.deliveryItems[3].scriptLinkUpdatedAt);assert.equal(M.updatedInfo(db.deliveryItems[3]).label,'脚本链接已更新');assert.throws(()=>act(3,'pm2','scriptLink',{url:'https://example.com/other'}));assert.throws(()=>act(7,'a','videoSubmit',{url:'https://example.com/replaced'}));
 const h=harness();h.ctx.readDB().deliveryItems[3].scriptLinkUpdatedAt=new Date().toISOString();h.as('pm2');assert.match(h.html(3),/链接已更新/);h.as('a');assert.doesNotMatch(h.html(7),/data-kind="videoSubmit"/);
});
test('publication resubmission and acceptance are single-video, completed stays visible and read only',()=>{
 const {db,act}=fixture();const sibling=JSON.stringify(db.deliveryItems[8]);act(9,'a','publish',{url:'https://example.com/p'});assert.equal(db.deliveryItems[9].status,'待验收');assert.equal(db.deliveryItems[9].acceptedAt,undefined);act(9,'pm2','returnPublish');act(9,'a','publish',{url:'https://example.com/p2'});act(9,'pm2','accept');assert.equal(db.deliveryItems[9].status,'已完成');assert.ok(db.deliveryItems[9].acceptedAt);assert.throws(()=>act(9,'pm2','accept'));assert.equal(JSON.stringify(db.deliveryItems[8]),sibling);
 for(const id of ['a','pm2','admin']){assert.ok(Object.values(M.allowedActions(db,user(id),db.deliveryItems[9])).every(v=>!v));assert.ok(M.selectOrders(M.deliveryContext(db),user(id),{queue:'all'}).some(r=>r.id===db.deliveryItems[9].id));}
});
test('explicit team-view PM sees record but no business approvals, acceptance or editable forms',()=>{
 const {db}=fixture(),team=user('pm1');assert.equal(M.visibleCoops(M.deliveryContext(db),team).length,13);assert.equal(M.selectOrders(M.deliveryContext(db),team,{queue:'all'}).length,13);
 for(const r of db.deliveryItems)assert.deepEqual(M.allowedActions(db,team,r),{});
 const h=harness();h.as('pm1');for(let i=0;i<13;i++)assert.doesNotMatch(h.html(i),/data-action=|<form/);
});
test('role buttons follow business authority and completed is read only',()=>{
 const h=harness();assert.match(h.html(0),/已发送 Brief/);h.as('pm2');assert.doesNotMatch(h.html(0),/data-action="briefSent"/);assert.match(h.html(0),/data-kind="deliveryBrief"/);assert.match(h.html(3),/可以推进拍摄/);assert.match(h.html(7),/可以推进发布/);assert.match(h.html(10),/验收通过/);assert.match(h.html(10),/退回备注（选填）/);assert.doesNotMatch(h.html(10),/name="reason"[^>]*required/);assert.doesNotMatch(h.html(12),/<form|data-action=/);assert.match(h.html(12),/默认只读/);
});
test('failed Brief save rolls back, preserves input, unlocks retry without changing sibling',()=>{
 const h=harness(),before=JSON.stringify(h.ctx.readDB());h.setFailure(true);const {form,button}=h.submit('deliveryBrief',0,{briefUrl:'https://example.com/retry',briefDescription:'Keep me'});assert.equal(JSON.stringify(h.ctx.readDB()),before);assert.equal(form.values.briefDescription,'Keep me');assert.equal(button.disabled,false);assert.equal(form.dataset.busy,undefined);assert.match(h.message.textContent,/保存失败/);h.setFailure(false);h.submit('deliveryBrief',0,form.values);assert.equal(h.stored().deliveryItems[0].brief.description,'Keep me');assert.equal(h.stored().deliveryItems[0].status,'待填写客户 Brief');
});
test('failed action restores status; repeated button cannot create duplicate transition',()=>{
 const h=harness();h.setFailure(true);let b=h.click('briefSent',0);assert.equal(h.ctx.readDB().deliveryItems[0].status,'待填写客户 Brief');assert.equal(b.disabled,false);h.setFailure(false);h.click('briefSent',0);h.click('briefSent',0);assert.equal(h.stored().deliveryItems[0].events.filter(e=>e.action==='briefSent').length,1);
});
test('failed script, publication and acceptance saves roll back; repeated successful form is rejected by state',()=>{
 const h=harness();for(const [kind,i,data,role] of [['scriptSubmit',1,{url:'https://example.com/s'},'a'],['publish',9,{url:'https://example.com/p'},'a'],['accept',10,{},'pm2']]){
 h.as(role);const before=JSON.stringify(h.ctx.readDB());h.setFailure(true);h.submit(kind,i,data);assert.equal(JSON.stringify(h.ctx.readDB()),before);h.setFailure(false);h.submit(kind,i,data);const saved=JSON.stringify(h.ctx.readDB());h.submit(kind,i,data);assert.equal(JSON.stringify(h.ctx.readDB()),saved);
 }
});
test('preview storage never reads old keys or clears records',()=>{
 assert.notEqual(M.KEY,'solbridge-crm-projects-v2');const source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');assert.doesNotMatch(source,/getItem\('solbridge-crm-100-v1'\)|applyConfirmedCreatorReset\(cleared\)/);assert.equal(createPreviewData().deliveryItems.length,13);
});

test('submitting disables controls during persistence and rejects a second busy submission',()=>{
 const h=harness();let writes=0;
 h.onWrite(form=>{writes++;assert.equal(form.dataset.busy,'true');assert.equal(form.querySelectorAll()[0].disabled,true);h.dispatchForm(form);});
 const {form,button}=h.submit('deliveryBrief',0,{briefDescription:'one write'});assert.equal(writes,1);assert.equal(button.disabled,false);assert.equal(form.dataset.busy,undefined);
});
