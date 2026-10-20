export type FixtureActorKey = 'operatorA' | 'operatorB' | 'reviewPm' | 'directPm' | 'selfPm' | 'admin';
export type FixtureActor = {
  id: string; role: 'operator' | 'pm' | 'admin'; displayName: string;
  companyId: string; workspaceId: string; enabled: boolean; authVersion: number; directPmId?: string;
};
export type FixtureQuote = { id: string; versionId: string; round: number; amountMinor: string; currency: string; by: string; at: string };
export type FixtureProposal = {
  id: string; version: number; creatorId: string; campaignId: string; ownerId: string; submittedBy: string;
  reviewPmId: string; selfManagedPmId?: string; status: string; currency: string; submittedAt: string;
  submissionSnapshot: { creator: FixtureCreator; ownerId: string; campaignId: string; at: string };
  proposalVersions: Array<{ id: string; version: number; currency: string; costMinor: string;
    items: Array<{ platform: string; type: string; quantity: number; publicationPlatforms: string[] }>; rights: string; by: string; at: string }>;
  clientQuotes: FixtureQuote[]; events: Array<{ action: string; by: string; at: string; status: string }>;
  reviewHistory: Array<{ decision: string; by: string; at: string }>;
  customerAcceptance?: { versionId: string; clientPriceMinor: string; currency: string; by: string; at: string };
  creatorAcceptance?: { versionId: string; costMinor: string; currency: string; by: string; at: string };
  clientVersionId?: string; creatorVersionId?: string;
  clientQuoteDraft?: { versionId: string; amountMinor: string; currency: string; by: string; at: string };
};
export type FixtureCreator = { id: string; name: string; contact: string; country: string; language: string;
  creatorType: string; version: number; accounts: Array<{ platform: string; handle: string; url: string }> };
export type SharedPayload = {
  version: number; workspaceId: string; creators: FixtureCreator[];
  campaigns: Array<{ id: string; version: number; name: string; client: string; pmId: string; pmIds: string[]; members: string[] }>;
  proposalDrafts: Array<{ id: string; version: number; ownerId: string; creatorId: string; campaignId: string;
    fields: Array<{ name: string; value: string }>; updatedAt: string }>;
  collaborations: FixtureProposal[]; orders: unknown[]; deliveryItems: unknown[]; users: Array<{ id: string; directPmId: string }>;
};
export type SharedWorkspace = {
  id: string; companyId: string; environment: 'test'; environmentUuid: string;
  actors: Record<FixtureActorKey, FixtureActor>;
  workspaceAccess: Array<{ workspaceId: string; employeeId: string }>;
  projectAssignments: Array<{ workspaceId: string; campaignId: string; employeeId: string; duty: string; version: number }>;
  teamRelations: Array<{ workspaceId: string; operatorId: string; directPmId: string }>;
  state: SharedPayload;
  scenarios: { pendingId: string; negotiatingId: string; confirmedId: string; selfId: string };
};
export function createSharedWorkspaceFixture(): { primary: SharedWorkspace; secondary: SharedWorkspace };
/** Existing legacy-model fixtures remain compatible; these are not shared identity sources. */
export function completeFixture(): Record<string, any>;
export function projectFixture(db: Record<string, any>, user: { id: string; role: string }, input: Record<string, any>): any;
