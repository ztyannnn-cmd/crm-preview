import {CREATOR_RESET_VERSION} from './model.mjs';

// Start manual testing with no business records. Simulation accounts stay in
// model.USERS; this factory never reads or mutates an existing workspace.
export function createEmptyPreviewData(){
 return {
  version:2,
  creatorResetVersion:CREATOR_RESET_VERSION,
  creatorCodeVersion:'random-v1',
  creators:[],
  campaigns:[],
  collaborations:[],
  orders:[],
  deliveryItems:[],
  proposalDrafts:[],
  tasks:[],
  followUps:[],
  savedViews:[],
  issuedCreatorCodes:[],
  issuedProposalCodes:[]
 };
}
