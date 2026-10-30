import test from 'node:test';
import assert from 'node:assert/strict';
import {KEY} from './model.mjs';
import {clearPreviewData,restorePreviewData,previewBackups,previewCounts,VIEW_KEYS} from './preview-data-tools.mjs';

function storage(initial={}){
 const map=new Map(Object.entries(initial));
 return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};
}
const original=JSON.stringify({version:2,creators:[{id:'existing'}],campaigns:[],collaborations:[],privateField:'preserved'});

test('explicit reset backs up exact data and views, clears only CRM, and restore keeps both snapshots',()=>{
 const local=storage({[KEY]:original,unrelated:'keep'}),session=storage({[VIEW_KEYS[0]]:'{"pm1/followup":{}}',[VIEW_KEYS[1]]:'{"page":"followup"}',unrelated:'keep'});
 const id=clearPreviewData(local,session);
 assert.equal(previewBackups(local).length,1);
 assert.equal(previewBackups(local)[0].data,original);
 assert.ok(previewCounts(local).every(row=>row.count===0));
 assert.equal(local.getItem('unrelated'),'keep');assert.equal(session.getItem('unrelated'),'keep');
 for(const key of VIEW_KEYS)assert.equal(session.getItem(key),null);
 const blank=local.getItem(KEY);
 restorePreviewData(local,session,id);
 assert.equal(local.getItem(KEY),original);
 assert.equal(session.getItem(VIEW_KEYS[0]),'{"pm1/followup":{}}');
 assert.equal(previewBackups(local)[0].data,blank);
});
test('failed backup or backup index prevents clearing existing data',()=>{
 for(const failingPart of [':backup:',':backups']){
  const local=storage({[KEY]:original}),write=local.setItem;
  local.setItem=(key,value)=>{if(key.includes(failingPart))throw Error('quota');write(key,value);};
  assert.throws(()=>clearPreviewData(local,storage()),/quota/);
  assert.equal(local.getItem(KEY),original);
 }
});
test('failed data write preserves original and leaves a verified recovery backup',()=>{
 const local=storage({[KEY]:original}),write=local.setItem;
 local.setItem=(key,value)=>{if(key===KEY)throw Error('write failed');write(key,value);};
 assert.throws(()=>clearPreviewData(local,storage()),/write failed/);
 assert.equal(local.getItem(KEY),original);
 assert.equal(previewBackups(local)[0].data,original);
});
test('first empty setup remains restorable without deleting the storage key',()=>{
 const local=storage(),session=storage();
 const id=clearPreviewData(local,session);
 restorePreviewData(local,session,id);
 assert.equal(JSON.parse(local.getItem(KEY)).version,2);
 assert.ok(previewCounts(local).every(row=>row.count===0));
});
