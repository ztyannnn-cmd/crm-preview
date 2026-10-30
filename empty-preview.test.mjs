import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createEmptyPreviewData} from './empty-preview-fixtures.mjs';
import {createFollowupPreviewData} from './followup-preview-fixtures.mjs';
import {KEY,USERS,upgrade,addProject,submitPackage} from './model.mjs';

const bootstrap=readFileSync(new URL('./preview-bootstrap.mjs',import.meta.url),'utf8')
 .replace(/^import .*;$/gm,'')
 .replace(/await import\([^;]+\);/,'await startApp();');

function boot(values,isFollowupDemo=false){
 const writes=[],errors=[];
 const context={
  KEY,isFollowupDemo,createEmptyPreviewData,createFollowupPreviewData,
  businessStorage:{getItem:key=>values.get(key)??null,setItem(key,value){writes.push(key);values.set(key,value);}},
  startApp:async()=>{},
  document:{getElementById:()=>({set textContent(value){errors.push(value);}})}
 };
 return runInNewContext('(async()=>{'+bootstrap+'})()',context).then(()=>({writes,errors}));
}

test('empty preview retains simulation accounts and never seeds business records during upgrade',()=>{
 const accounts=structuredClone(USERS),db=createEmptyPreviewData(),before=JSON.stringify(db);
 assert.equal(upgrade(db),false);
 assert.equal(upgrade(db),false);
 assert.equal(JSON.stringify(db),before);
 for(const key of ['creators','campaigns','collaborations','orders','deliveryItems','proposalDrafts','tasks','followUps','savedViews'])assert.deepEqual(db[key],[]);
 assert.deepEqual(USERS,accounts);
 db.creators.push({id:'independent'});
 assert.equal(createEmptyPreviewData().creators.length,0);
});

test('normal bootstrap starts empty and preserves manually added data on subsequent loads',async()=>{
 const values=new Map(),first=await boot(values);
 assert.deepEqual(first.errors,[]);
 assert.deepEqual(first.writes,[KEY]);
 const db=JSON.parse(values.get(KEY));
 assert.equal(db.creators.length,0);
 assert.equal(db.campaigns.length,0);
 const pm=USERS.find(u=>u.id==='pm1'),operator=USERS.find(u=>u.id==='a');
 const project=addProject(db,pm,{name:'Manual test project',client:'Test client',requirements:'',members:[operator.id]});
 db.creators.push({id:'manual-test-creator',name:'Manual test creator',contact:'manual@example.test',country:'美国',language:'英语',creatorType:'AI工具',createdBy:operator.id,accounts:[{platform:'YouTube',handle:'@manual-test',url:'https://example.test/manual-test',followers:1000,views:500}]});
 submitPackage(db,operator,'manual-test-creator',{
  campaignId:project.id,total:100,currency:'USD',rights:'品牌使用 30 天',
  items:[{platform:'YouTube',type:'专属视频',quantity:1}]
 });
 upgrade(db);
 const saved=JSON.stringify(db);
 values.set(KEY,saved);
 const second=await boot(values),restored=JSON.parse(values.get(KEY));
 assert.deepEqual(second.errors,[]);
 assert.deepEqual(second.writes,[]);
 assert.equal(values.get(KEY),saved);
 assert.equal(upgrade(restored),false);
 assert.equal(restored.creators.length,1);
 assert.equal(restored.campaigns.length,1);
 assert.equal(restored.collaborations.length,1);
 assert.equal(restored.collaborations[0].id,db.collaborations[0].id);
});

test('explicit follow-up demo keeps eight samples and existing saved values are never overwritten',async()=>{
 const demo=new Map(),result=await boot(demo,true);
 assert.deepEqual(result.errors,[]);
 assert.equal(JSON.parse(demo.get(KEY)).collaborations.length,8);
 for(const existing of ['unreadable saved data',JSON.stringify(createEmptyPreviewData())]){
  const values=new Map([[KEY,existing]]),loaded=await boot(values);
  assert.deepEqual(loaded.writes,[]);
  assert.equal(values.get(KEY),existing);
 }
});
