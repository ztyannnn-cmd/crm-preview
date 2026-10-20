// Synthetic records only. These names/URLs are not customer or creator data.
import {migrate,upgrade,CREATOR_RESET_VERSION} from './model.mjs';
export function createPreviewData(){
 const db=migrate();upgrade(db);db.creatorResetVersion=CREATOR_RESET_VERSION;
 db.creators=[{id:'preview-creator',name:'模拟达人 · 视频交付验收',platform:'YouTube',country:'美国',language:'英语',accounts:[{platform:'YouTube',handle:'@preview',url:'https://example.com/creator',followers:100000,views:20000}]}];
 db.campaigns=[{id:'preview-project',name:'V0.6 视频交付测试项目',client:'模拟客户',requirements:'仅用于第一批前端交互验收',pmId:'pm2',members:['a','b']}];
 db.collaborations=[];db.orders=[];db.deliveryItems=[];db.tasks=[];db.followUps=[];
 // Explicit fixture relationship; project membership is never used to infer a direct PM.
 db.previewTeamPm={a:'pm1'};
 const states=['待填写客户 Brief','脚本待提交','脚本待送客户','脚本待客户反馈','脚本待修改','视频待提交','视频待送客户','视频待客户反馈','视频待修改','待发布','待验收','待补充发布资料','已完成'];
 const at='2026-10-19T02:00:00.000Z';
 db.orders=[{id:'preview-order',proposalId:'preview-proposal',creatorId:'preview-creator',campaignId:'preview-project',ownerId:'a',reviewPmId:'pm2',createdAt:at,preparation:{},terms:{cooperationNotes:'独立模拟测试数据，不接真实业务 API'}}];
 db.deliveryItems=states.map((status,i)=>({id:'preview-video-'+i,orderId:'preview-order',proposalId:'preview-proposal',creatorId:'preview-creator',campaignId:'preview-project',ownerId:'a',reviewPmId:'pm2',name:'模拟视频 '+(i+1),platform:'YouTube',contentType:'dedicated',status,confirmedAt:at,submittedAt:at,updatedAt:at,history:[],events:[],notes:[],publications:[],rights:'测试',currency:'USD',final:100,clientPrice:150,brief:{url:'https://example.com/brief',description:'模拟 Brief'},deliverables:{script:i>=2?[{url:'https://example.com/script',version:1,reviews:[],...(i>=5?{approvedAt:at}:{})}]:[],video:i>=6?[{url:'https://example.com/draft',version:1,reviews:[],...(i>=9?{approvedAt:at}:{})}]:[]},url:i>=10?'https://example.com/published':'',...(i===12?{acceptedAt:at}:{}),...(i===11?{publishFeedback:'模拟：请核对发布链接'}:{})}));
 // Empty publication array means a single original publication URL in this fixture.
 for(const item of db.deliveryItems)delete item.publications;
 return db;
}
