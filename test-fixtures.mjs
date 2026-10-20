import {migrate,addProject} from './model.mjs';
export function completeFixture(){const db=migrate();for(const c of db.creators)Object.assign(c,{contact:c.contact||'fixture@example.test',creatorType:c.creatorType||'生活方式'});return db;}
export function projectFixture(db,u,input){const p=addProject(db,u,input);if(u.role==='admin')p.pmId='pm1';return p;}

// Shared-mode test data only. Never install these identities in model.USERS,
// localStorage, server startup or a public authentication endpoint.
export function createSharedWorkspaceFixture() {
 const at='2026-10-20T00:00:00.000Z';
 function workspace(scope,environmentUuid) {
  const id=name=>`fixture-${scope}-${name}`,workspaceId=id('workspace'),companyId=id('company');
  const roles={operatorA:'operator',operatorB:'operator',reviewPm:'pm',directPm:'pm',selfPm:'pm',admin:'admin'};
  const actors=Object.fromEntries(Object.entries(roles).map(([key,role])=>[key,{id:id(key),role,displayName:`Synthetic ${scope} ${key}`,companyId,workspaceId,enabled:true,authVersion:1}]));
  actors.operatorA.directPmId=actors.directPm.id;
  const project={id:id('project'),version:1,name:`Synthetic ${scope} project`,client:'Synthetic client',pmId:actors.reviewPm.id,pmIds:[actors.reviewPm.id,actors.selfPm.id],members:[actors.operatorA.id,actors.operatorB.id,actors.selfPm.id]};
  const creators=['draft','pending','negotiating','confirmed','self'].map(name=>({id:id('creator-'+name),name:`Synthetic ${scope} creator ${name}`,contact:`${scope}-${name}@example.test`,country:'Synthetic country',language:'Synthetic language',creatorType:'Synthetic creator',accounts:[{platform:'YouTube',handle:`@synthetic-${scope}-${name}`,url:`https://example.test/${scope}/${name}`}],version:1}));
  function proposal(kind,owner,status) {
   const creator=creators.find(c=>c.id===id('creator-'+kind)),proposalId=id('proposal-'+kind),versionId=proposalId+'-scheme-1';
   const self=owner===actors.selfPm;
   return {id:proposalId,version:1,creatorId:creator.id,campaignId:project.id,ownerId:owner.id,submittedBy:owner.id,reviewPmId:self?owner.id:actors.reviewPm.id,...(self?{selfManagedPmId:owner.id}:{}),status,currency:'USD',submittedAt:at,
    submissionSnapshot:{creator:structuredClone(creator),ownerId:owner.id,campaignId:project.id,at},
    proposalVersions:[{id:versionId,version:1,currency:'USD',costMinor:'10001',items:[{platform:'YouTube',type:'dedicated',quantity:2,publicationPlatforms:['YouTube']}],rights:'',by:owner.id,at}],
    clientQuotes:[],events:[{action:self?'pmSelfSubmit':'submit',by:owner.id,at,status}],reviewHistory:[]};
  }
  const pending=proposal('pending',actors.operatorA,'待 PM 审核');
  const negotiating=proposal('negotiating',actors.operatorA,'议价待客户确认');
  negotiating.clientQuotes.push({id:id('client-quote'),versionId:negotiating.proposalVersions[0].id,round:1,amountMinor:'15001',currency:'USD',by:actors.reviewPm.id,at});
  const confirmed=proposal('confirmed',actors.operatorA,'合作确认完成'),versionId=confirmed.proposalVersions[0].id;
  confirmed.clientQuotes.push({id:id('accepted-quote'),versionId,round:1,amountMinor:'15001',currency:'USD',by:actors.reviewPm.id,at});
  confirmed.customerAcceptance={versionId,clientPriceMinor:'15001',currency:'USD',by:actors.reviewPm.id,at};
  confirmed.creatorAcceptance={versionId,costMinor:'10001',currency:'USD',by:actors.operatorA.id,at};
  confirmed.clientVersionId=versionId;confirmed.creatorVersionId=versionId;
  const self=proposal('self',actors.selfPm,'待 PM 反馈');
  self.clientQuoteDraft={versionId:self.proposalVersions[0].id,amountMinor:'15001',currency:'USD',by:actors.selfPm.id,at};
  const drafts=[actors.operatorA,actors.operatorB].map(owner=>({id:id('draft-'+owner.id),version:1,ownerId:owner.id,creatorId:creators[0].id,campaignId:project.id,fields:[{name:'cooperationNotes',value:`Synthetic incomplete draft ${owner.id}`}],updatedAt:at}));
  return {id:workspaceId,companyId,environment:'test',environmentUuid,actors,
   workspaceAccess:Object.values(actors).map(actor=>({workspaceId,employeeId:actor.id})),
   projectAssignments:[['operatorA','operator'],['operatorB','operator'],['reviewPm','reviewer'],['selfPm','selfProposer']].map(([key,duty])=>({workspaceId,campaignId:project.id,employeeId:actors[key].id,duty,version:1})),
   teamRelations:[{workspaceId,operatorId:actors.operatorA.id,directPmId:actors.directPm.id}],
   state:{version:2,workspaceId,creators,campaigns:[project],proposalDrafts:drafts,collaborations:[pending,negotiating,confirmed,self],orders:[],deliveryItems:[],users:[{id:actors.operatorA.id,directPmId:actors.directPm.id}]},
   scenarios:{pendingId:pending.id,negotiatingId:negotiating.id,confirmedId:confirmed.id,selfId:self.id}};
 }
 return {primary:workspace('primary','11111111-1111-4111-8111-111111111111'),secondary:workspace('secondary','22222222-2222-4222-8222-222222222222')};
}
