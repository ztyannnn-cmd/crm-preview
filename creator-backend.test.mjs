import test from 'node:test';
import assert from 'node:assert/strict';
import {safeProfileUrl,creatorAccounts,filterCreators,creatorBodyFromValues,createCreatorWorkspace} from './creator-backend.mjs';

const operator = {id:'operator-a',displayName:'测试运营 A',role:'operator'};
const other = {id:'operator-b',displayName:'测试运营 B',role:'operator'};
const values = () => ({name:'接口测试达人',contact:'creator@example.test',country:'美国',language:'英语',creatorType:'生活方式',platform:'YouTube',handle:'@creator',url:'https://www.youtube.com/@creator'});
const profile = (id='creator-a',overrides={}) => ({id,...values(),accounts:[{platform:'YouTube',handle:'@creator',url:'https://www.youtube.com/@creator'}],...overrides});
const error = (message,status=0,code='NETWORK_ERROR') => Object.assign(Error(message),{status,code});
function deferred() {
 let resolve,reject;
 const promise = new Promise((yes,no) => {resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
function harness() {
 const calls={actors:0,me:0,creators:0,login:[],create:[],operations:0};
 const data={session:operator,rows:[profile()],readFailure:null,writeFailure:null};
 const api={
  async actors() {calls.actors++;return [operator,other];},
  async me() {calls.me++;if (!data.session) throw error('需要登录',401,'AUTH_REQUIRED');return data.session;},
  async creators() {calls.creators++;if (data.readFailure) throw data.readFailure;return structuredClone(data.rows);},
  async login(id) {calls.login.push(id);data.session=[operator,other].find(actor => actor.id===id);return data.session;},
  operation() {return Object.freeze({key:'operation-'+(++calls.operations)});},
  async createCreator(body,operation) {
   calls.create.push({body,operation});
   if (data.writeFailure) throw data.writeFailure;
   const id='created-'+calls.create.length;
   data.rows.push({id,...body,accounts:[{platform:body.platform,handle:body.handle,url:body.url}]});
   return {type:'creator',id,replayed:false};
  }
 };
 const updates=[];
 const workspace=createCreatorWorkspace(api,state => updates.push({me:state.me?.id,ids:state.creators.map(row => row.id),busy:state.busy,loading:state.loading}));
 return {api,calls,data,workspace,updates};
}
async function openReadyForm(h) {
 await h.workspace.start();
 h.workspace.openForm();
 Object.assign(h.workspace.state.form.values,values());
 h.workspace.state.form.dirty=true;
 return h.workspace.state.form;
}

test('profile links permit HTTP(S) but reject script URLs, credentials and relative paths',() => {
 assert.equal(safeProfileUrl('https://www.youtube.com/@creator'),'https://www.youtube.com/@creator');
 assert.equal(safeProfileUrl('http://example.test/path'),'http://example.test/path');
 for (const input of ['javascript:alert(1)','data:text/html,test','//example.test/path','/creator','https://name:secret@example.test',null,'']) assert.equal(safeProfileUrl(input),'');
});

test('server accounts take priority and missing account data falls back to top-level fields',() => {
 const account={platform:'Instagram',handle:'@other',url:'https://instagram.com/other/'};
 assert.deepEqual(creatorAccounts(profile('a',{accounts:[null,{},account]})),[account]);
 assert.deepEqual(creatorAccounts(profile('b',{accounts:[]})),[{platform:'YouTube',handle:'@creator',url:'https://www.youtube.com/@creator'}]);
 assert.deepEqual(creatorAccounts({accounts:null,platform:null,handle:null,url:null}),[]);
});

test('creator filters combine search, platform and country across server account DTOs',() => {
 const rows=[profile('a',{name:'ALPHA',contact:'one@example.test',country:'美国',accounts:[{platform:'YouTube',handle:'@alpha',url:'https://youtube.com/@alpha'},{platform:'TikTok',handle:'@second',url:'https://tiktok.com/@second'}]}),profile('b',{name:'Beta',contact:'two@example.test',country:'英国'}),{id:'c',name:null,contact:null,country:null,accounts:null}];
 assert.deepEqual(filterCreators(rows,{q:'  alpha  '}).map(row=>row.id),['a']);
 assert.deepEqual(filterCreators(rows,{q:'SECOND',platform:'TikTok',country:'美国'}).map(row=>row.id),['a']);
 assert.deepEqual(filterCreators(rows,{q:'TWO@EXAMPLE.TEST'}).map(row=>row.id),['b']);
 assert.deepEqual(filterCreators(rows,{q:'youtube.com/@alpha'}).map(row=>row.id),['a']);
 assert.deepEqual(filterCreators(rows,{q:'alpha',country:'英国'}),[]);
 assert.equal(filterCreators(rows).length,3);
 assert.equal(rows[0].name,'ALPHA');
});

test('create payload trims and includes only the eight accepted fields',() => {
 const input={...values(),name:'  接口测试达人  ',handle:'',contact:' creator@example.test ',followers:1200,ownerId:'injected'};
 const result=creatorBodyFromValues(input);
 assert.deepEqual(Object.keys(result),['name','contact','country','language','creatorType','platform','handle','url']);
 assert.equal(result.name,'接口测试达人');
 assert.equal(result.contact,'creator@example.test');
 assert.equal(result.handle,'');
 assert.equal(input.name,'  接口测试达人  ');
});

test('create payload rejects missing required data, invalid platform/email/URL and overlong text',() => {
 for (const key of ['name','contact','country','language','creatorType','platform','url']) assert.throws(() => creatorBodyFromValues({...values(),[key]:' '}));
 for (const change of [{contact:'invalid'},{platform:'Twitch'},{url:'javascript:alert(1)'},{url:'https://user:pass@example.test'},{name:'x'.repeat(121)},{handle:'x'.repeat(121)},{country:'x'.repeat(81)}]) assert.throws(() => creatorBodyFromValues({...values(),...change}));
});

test('start restores a server session and actor list without selecting a new identity',async () => {
 const h=harness();
 await h.workspace.start();
 assert.equal(h.workspace.state.me.id,operator.id);
 assert.deepEqual(h.workspace.state.actors,[operator,other]);
 assert.deepEqual(h.calls.login,[]);
 assert.equal(h.workspace.state.creators.length,1);
 h.data.session=null;
 await h.workspace.start();
 assert.equal(h.workspace.state.me,null);
 assert.deepEqual(h.workspace.state.creators,[]);
 assert.deepEqual(h.calls.login,[]);
});

test('PM and admin roles cannot open a create form',async () => {
 for (const role of ['pm','admin']) {
  const h=harness();h.data.session={...operator,role};
  await h.workspace.start();h.workspace.openForm();
  assert.equal(h.workspace.state.form,null);
  assert.equal(h.calls.create.length,0);
 }
});

test('successful creation is confirmed by a fresh server read before clearing the form',async () => {
 const h=harness();await openReadyForm(h);
 await h.workspace.save();
 assert.equal(h.calls.create.length,1);
 assert.equal(h.calls.creators,2);
 assert.equal(h.workspace.state.creators.length,2);
 assert.equal(h.workspace.state.form,null);
 assert.equal(h.workspace.state.pending,null);
 assert.match(h.workspace.state.notice,/已保存/);
});

test('failed create keeps the input and reuses the operation on retry',async () => {
 const h=harness();const form=await openReadyForm(h);
 h.data.writeFailure=error('网络中断');
 await h.workspace.save();
 const pending=h.workspace.state.pending;
 assert.equal(h.workspace.state.form,form);
 assert.deepEqual(form.values,values());
 assert.equal(h.workspace.state.busy,false);
 assert.match(h.workspace.state.error,/网络中断/);
 h.data.writeFailure=null;
 await h.workspace.save();
 assert.equal(h.calls.operations,1);
 assert.equal(h.calls.create[0].operation,pending.operation);
 assert.equal(h.calls.create[1].operation,pending.operation);
 assert.equal(h.workspace.state.form,null);
});

test('changing the create body after failure generates a new operation',async () => {
 const h=harness();await openReadyForm(h);h.data.writeFailure=error('网络中断');
 await h.workspace.save();
 const original=h.workspace.state.pending.operation;
 h.workspace.state.form.values.name='另一位测试达人';
 await h.workspace.save();
 assert.equal(h.calls.operations,2);
 assert.notEqual(h.workspace.state.pending.operation,original);
 assert.equal(h.calls.create[1].body.name,'另一位测试达人');
});

test('a confirmed write followed by a failed GET is retried only as a read',async () => {
 const h=harness();const form=await openReadyForm(h);
 h.data.readFailure=error('列表网络失败');
 await h.workspace.save();
 assert.equal(h.calls.create.length,1);
 assert.equal(form.committedId,'created-1');
 assert.equal(h.workspace.state.form,form);
 assert.equal(form.dirty,false);
 assert.match(h.workspace.state.error,/已保存，列表刷新失败/);
 assert.equal(h.workspace.state.pending,null);
 h.data.readFailure=null;
 await h.workspace.save();
 assert.equal(h.calls.create.length,1);
 assert.equal(h.calls.operations,1);
 assert.equal(h.workspace.state.form,null);
 assert(h.workspace.state.creators.some(row => row.id==='created-1'));
});

test('a committed result absent from the refreshed list cannot trigger another create',async () => {
 const h=harness();await openReadyForm(h);
 h.api.createCreator=async (body,operation) => {h.calls.create.push({body,operation});return {id:'not-yet-visible'};};
 await h.workspace.save();
 assert.equal(h.workspace.state.form.committedId,'not-yet-visible');
 await h.workspace.save();
 assert.equal(h.calls.create.length,1);
 assert.match(h.workspace.state.error,/已保存/);
});

test('401 clears visible server records but preserves input and operation for same-account login',async () => {
 const h=harness();const form=await openReadyForm(h);
 h.data.writeFailure=error('登录已过期',401,'AUTH_REQUIRED');
 await h.workspace.save();
 const pending=h.workspace.state.pending;
 assert.equal(h.workspace.state.me,null);
 assert.deepEqual(h.workspace.state.creators,[]);
 assert.equal(h.workspace.state.form,form);
 assert.deepEqual(form.values,values());
 h.data.writeFailure=null;
 await h.workspace.login(operator.id);
 assert.equal(h.workspace.state.form,form);
 assert.equal(h.workspace.state.pending,pending);
 await h.workspace.save();
 assert.equal(h.calls.create[1].operation,h.calls.create[0].operation);
 assert.equal(h.calls.operations,1);
});

test('switching employees requires explicit discard and immediately clears old records, filters and detail',async () => {
 const h=harness();const form=await openReadyForm(h);
 h.workspace.state.filters={q:'private',platform:'YouTube',country:'美国'};
 h.workspace.state.detailId='creator-a';
 await assert.rejects(h.workspace.login(other.id),/确认放弃/);
 assert.equal(h.workspace.state.form,form);
 assert.equal(h.workspace.state.me.id,operator.id);
 const gate=deferred();
 h.api.login=async id => {h.calls.login.push(id);await gate.promise;h.data.session=other;h.data.rows=[profile('creator-b')];return other;};
 const switching=h.workspace.login(other.id,{discard:true});
 assert.equal(h.workspace.state.form,null);
 assert.equal(h.workspace.state.pending,null);
 assert.equal(h.workspace.state.me,null);
 assert.deepEqual(h.workspace.state.creators,[]);
 assert.equal(h.workspace.state.detailId,'');
 assert.deepEqual(h.workspace.state.filters,{q:'',platform:'',country:''});
 gate.resolve();await switching;
 assert.equal(h.workspace.state.me.id,other.id);
 assert.deepEqual(h.workspace.state.creators.map(row=>row.id),['creator-b']);
});

test('a cookie identity change before save is rejected without posting as the wrong employee',async () => {
 const h=harness();const form=await openReadyForm(h);h.data.session=other;
 await h.workspace.save();
 assert.equal(h.calls.create.length,0);
 assert.equal(h.workspace.state.me,null);
 assert.equal(h.workspace.state.form,form);
 assert.match(h.workspace.state.error,/账号已变化/);
});

test('concurrent save clicks issue one POST and keep account switching disabled until it completes',async () => {
 const h=harness();await openReadyForm(h);
 const gate=deferred(),entered=deferred();
 const create=h.api.createCreator;
 h.api.createCreator=async (...args) => {entered.resolve();await gate.promise;return create(...args);};
 const first=h.workspace.save();await entered.promise;
 assert.equal(h.workspace.state.busy,true);
 await h.workspace.save();
 await h.workspace.login(other.id,{discard:true});
 assert.deepEqual(h.calls.login,[]);
 gate.resolve();await first;
 assert.equal(h.calls.create.length,1);
 assert.equal(h.calls.operations,1);
 assert.equal(h.workspace.state.busy,false);
});

test('a superseded startup response cannot overwrite the newer successful session',async () => {
 const h=harness();const gate=deferred();let attempts=0;
 h.api.actors=async () => {attempts++;if (attempts===1) {await gate.promise;return [operator];}return [other];};
 const stale=h.workspace.start();
 h.data.session=other;h.data.rows=[profile('newer')];
 await h.workspace.start();
 gate.resolve();await stale;
 assert.equal(h.workspace.state.me.id,other.id);
 assert.deepEqual(h.workspace.state.actors,[other]);
 assert.deepEqual(h.workspace.state.creators.map(row=>row.id),['newer']);
 assert.equal(h.workspace.state.loading,false);
});
