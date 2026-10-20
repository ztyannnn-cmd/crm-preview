import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedWorkspaceFixture} from './test-fixtures.mjs';
import {USERS} from './model.mjs';

test('shared fixtures provide six synthetic roles and explicit read-only team relationships',()=>{
 const {primary:w}=createSharedWorkspaceFixture();
 assert.equal(Object.keys(w.actors).length,6);
 assert.equal(w.actors.operatorA.role,'operator');assert.equal(w.actors.operatorB.role,'operator');assert.equal(w.actors.admin.role,'admin');
 assert.equal(w.actors.directPm.id,w.teamRelations[0].directPmId);
 assert.notEqual(w.actors.directPm.id,w.state.campaigns[0].pmId);
 assert(!w.projectAssignments.some(a=>a.employeeId===w.actors.directPm.id));
 assert(w.projectAssignments.some(a=>a.employeeId===w.actors.selfPm.id));
 assert(w.state.creators.every(c=>c.contact.endsWith('@example.test')));
});
test('two workspaces and repeated fixture calls have disjoint identities and independent data',()=>{
 const first=createSharedWorkspaceFixture(),second=createSharedWorkspaceFixture();
 assert.deepEqual(first,second);
 const ids=new Set(Object.values(first.primary.actors).map(a=>a.id));
 assert(Object.values(first.secondary.actors).every(a=>!ids.has(a.id)));
 first.primary.state.creators[0].name='Changed in isolated test';
 first.primary.actors.operatorA.enabled=false;
 assert.notEqual(first.primary.state.creators[0].name,second.primary.state.creators[0].name);
 assert.equal(second.primary.actors.operatorA.enabled,true);
 assert.notEqual(first.primary.id,first.secondary.id);
});
test('business samples distinguish private drafts, quotations and same-version confirmations',()=>{
 const w=createSharedWorkspaceFixture().primary,db=w.state;
 assert.equal(db.proposalDrafts.length,2);
 assert.equal(db.proposalDrafts[0].creatorId,db.proposalDrafts[1].creatorId);
 assert.notEqual(db.proposalDrafts[0].ownerId,db.proposalDrafts[1].ownerId);
 const confirmed=db.collaborations.find(p=>p.id===w.scenarios.confirmedId);
 assert.equal(confirmed.customerAcceptance.versionId,confirmed.proposalVersions[0].id);
 assert.equal(confirmed.creatorAcceptance.versionId,confirmed.proposalVersions[0].id);
 assert.equal(confirmed.customerAcceptance.clientPriceMinor,'15001');
 const self=db.collaborations.find(p=>p.id===w.scenarios.selfId);
 assert.equal(self.ownerId,self.reviewPmId);assert.equal(self.ownerId,self.selfManagedPmId);
 assert.equal(self.clientQuotes.length,0);assert.equal(self.reviewHistory.length,0);assert.equal(self.customerAcceptance,undefined);
 assert.equal(db.orders.length,0);
});
test('constructing shared test data never changes the legacy global identity directory',()=>{
 const before=JSON.stringify(USERS);createSharedWorkspaceFixture();
 assert.equal(JSON.stringify(USERS),before);
});
