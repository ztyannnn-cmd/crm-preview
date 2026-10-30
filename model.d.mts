// Transitional types for the existing JavaScript business model used by Fastify.
export type CrmState = Record<string, any>;
export type CrmActor = {id:string;role:'admin'|'pm'|'operator';directPmId?:string};
export function validateSubmissionProfile(profile:any):void;
export function packageTerms(input:any):{total:number;currency:string;items:any[];rights:string;cooperationNotes:string};
export function submitPackage(db:CrmState,u:CrmActor,id:string,input:any):any;
export function saveProposalDraft(db:CrmState,u:CrmActor,id:string,project:string,fields:any):any;
export function visibleCoops(db:CrmState,u:CrmActor):any[];
export function deliveryContext(db:CrmState):CrmState;
export function updateCoop(db:CrmState,u:CrmActor,id:string,action:string,data:any):any;
export function transferRegionalWork(db:CrmState,u:CrmActor,data:any):any;
export function transferOperatorWork(db:CrmState,u:CrmActor,data:any):any;
export function correctOrderPricing(db:CrmState,u:CrmActor,id:string,data:any):any;
export function setClientQuote(db:CrmState,u:CrmActor,id:string,value:any,note?:string):any;
export function submitNegotiationQuote(db:CrmState,u:CrmActor,id:string,value:any,note?:string):any;
export function recordCustomerOffer(db:CrmState,u:CrmActor,id:string,value:any,note?:string):any;
export function addCreatorQuoteReply(db:CrmState,u:CrmActor,id:string,value:any,note?:string):any;

export function saveOrderSplit(db:CrmState,u:CrmActor,id:string,side:string,amounts:any[]):any;

export function pmHandoffResults(db:CrmState,u:CrmActor):any[];
