import test from 'node:test';
import assert from 'node:assert/strict';
import {startPreview} from './preview-entry.mjs';

test('default entry preserves the existing local preview bootstrap', async () => {
 const loaded = [];
 await startPreview({search:'?demo=followup', load:async path => loaded.push(path)});
 assert.deepEqual(loaded, ['./preview-bootstrap.mjs?v=20261021-proposal-compact']);
});

test('backend entry uses only the API and backend UI, never imports local storage or fixtures', async () => {
 const loaded = [], content = {}, root = {}, api = {};
 let mounted;
 await startPreview({search:'?backend=1&demo=followup', document:{getElementById:id => id === 'crm-content' ? content : root}, load:async path => {
  loaded.push(path);
  if (path === '/integration/crm-api.mjs') return {createCrmClient:() => api};
  return {mountCreatorBackend:async options => {mounted = options;}};
 }});
 assert.deepEqual(loaded, ['/integration/crm-api.mjs', './creator-backend.mjs?v=20261022']);
 assert.deepEqual(mounted, {api, root, content});
});

test('backend failure offers retry and does not fall back to local save', async () => {
 let retry, attempts = 0;
 const content = {querySelector:() => ({addEventListener:(_name, listener) => {retry = listener;}})};
 const loaded = [];
 const options = {search:'?backend=1', document:{getElementById:() => content}, load:async path => {
  loaded.push(path);
  if (path.startsWith('/integration/')) {attempts++; throw Error('unavailable');}
  return {};
 }};
 await startPreview(options);
 assert.match(content.innerHTML, /暂时无法连接后端/);
 await retry();
 assert.equal(attempts, 2);
 assert(loaded.every(path => !path.includes('bootstrap') && !path.includes('store')));
});
