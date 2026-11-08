import {
  acceptAssignment,
  appendOwnerMessage,
  declineAssignment,
  deleteDirectLead,
  expireAssignment,
  getOwnerProjection,
  listAdminLeads,
  listOwnerProjections,
  listOwnerThreads,
  listThread,
  mapLegacyAssignmentSlots,
  offerAssignment,
  reassignMarketplaceLead,
  revokeAssignment,
  submitDirect,
  submitMarketplace,
  updateOwnerCrm,
  type AccessDeps,
} from "./access";
import { syntheticCrmSnapshot } from "./fixtures";
import type {
  Actor,
  AdminLeadVisibility,
  BusinessId,
  CrmSnapshot,
  DirectSubmitInput,
  LeadId,
  MarketplaceSubmitInput,
  OwnerLeadProjection,
  SubmissionReceipt,
  ThreadMessage,
  VendorLeadState,
} from "./types";

export interface LeadDirectory {
  listOwnerProjections(actor: Actor, businessId: BusinessId): Promise<OwnerLeadProjection[]>;
  getOwnerProjection(actor: Actor, businessId: BusinessId, leadId: LeadId): Promise<OwnerLeadProjection | null>;
  updateOwnerCrm(actor: Actor, businessId: BusinessId, leadId: LeadId, patch: unknown): Promise<OwnerLeadProjection>;
  listThread(actor: Actor, businessId: BusinessId, leadId: LeadId): Promise<ThreadMessage[]>;
  listOwnerThreads(actor: Actor, businessId: BusinessId): Promise<Array<{ projection: OwnerLeadProjection; messages: ThreadMessage[] }>>;
  appendOwnerMessage(actor: Actor, businessId: BusinessId, leadId: LeadId, body: string): Promise<ThreadMessage>;
  deleteDirectLead(actor: Actor, businessId: BusinessId, leadId: LeadId): Promise<void>;
  acceptAssignment(actor: Actor, businessId: BusinessId, leadId: LeadId): Promise<OwnerLeadProjection>;
  declineAssignment(actor: Actor, businessId: BusinessId, leadId: LeadId): Promise<OwnerLeadProjection>;
  listAdminLeads(actor: Actor): Promise<AdminLeadVisibility[]>;
  offerAssignment(actor: Actor, leadId: LeadId, businessId: BusinessId): Promise<VendorLeadState>;
  revokeAssignment(actor: Actor, leadId: LeadId, businessId: BusinessId): Promise<VendorLeadState>;
  expireAssignment(actor: Actor, leadId: LeadId, businessId: BusinessId): Promise<VendorLeadState>;
  reassignMarketplaceLead(actor: Actor, leadId: LeadId, fromBusinessId: BusinessId, toBusinessId: BusinessId): Promise<{ revoked: VendorLeadState; offered: VendorLeadState }>;
  mapLegacyAssignmentSlots(actor: Actor, leadId: LeadId): Promise<VendorLeadState[]>;
  submitDirect(actor: Actor, input: DirectSubmitInput): Promise<SubmissionReceipt>;
  submitMarketplace(actor: Actor, input: MarketplaceSubmitInput): Promise<SubmissionReceipt>;
}

export type MockLeadDirectory = LeadDirectory & {
  readSnapshot(): CrmSnapshot;
};

function ids(): () => string {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}

export function createMockLeadDirectory(
  initial: CrmSnapshot = syntheticCrmSnapshot(),
  overrides: Partial<AccessDeps> = {},
): MockLeadDirectory {
  let snapshot = structuredClone(initial);
  const deps: AccessDeps = {
    now: overrides.now ?? (() => "2026-11-08T18:00:00.000Z"),
    newId: overrides.newId ?? ids(),
  };
  return {
    readSnapshot: () => structuredClone(snapshot),
    async listOwnerProjections(actor, businessId) {
      return listOwnerProjections(actor, snapshot, businessId);
    },
    async getOwnerProjection(actor, businessId, leadId) {
      return getOwnerProjection(actor, snapshot, businessId, leadId);
    },
    async updateOwnerCrm(actor, businessId, leadId, patch) {
      const next = updateOwnerCrm(actor, snapshot, businessId, leadId, patch, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async listThread(actor, businessId, leadId) {
      return listThread(actor, snapshot, businessId, leadId);
    },
    async listOwnerThreads(actor, businessId) {
      return listOwnerThreads(actor, snapshot, businessId);
    },
    async appendOwnerMessage(actor, businessId, leadId, body) {
      const next = appendOwnerMessage(actor, snapshot, businessId, leadId, body, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async deleteDirectLead(actor, businessId, leadId) {
      const next = deleteDirectLead(actor, snapshot, businessId, leadId);
      snapshot = next.snapshot;
    },
    async acceptAssignment(actor, businessId, leadId) {
      const next = acceptAssignment(actor, snapshot, businessId, leadId, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async declineAssignment(actor, businessId, leadId) {
      const next = declineAssignment(actor, snapshot, businessId, leadId, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async listAdminLeads(actor) {
      return listAdminLeads(actor, snapshot);
    },
    async offerAssignment(actor, leadId, businessId) {
      const next = offerAssignment(actor, snapshot, leadId, businessId, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async revokeAssignment(actor, leadId, businessId) {
      const next = revokeAssignment(actor, snapshot, leadId, businessId, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async expireAssignment(actor, leadId, businessId) {
      const next = expireAssignment(actor, snapshot, leadId, businessId, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async reassignMarketplaceLead(actor, leadId, fromBusinessId, toBusinessId) {
      const next = reassignMarketplaceLead(actor, snapshot, leadId, fromBusinessId, toBusinessId, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async mapLegacyAssignmentSlots(actor, leadId) {
      const next = mapLegacyAssignmentSlots(actor, snapshot, leadId, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async submitDirect(_actor, input) {
      const next = submitDirect(snapshot, input, deps);
      snapshot = next.snapshot;
      return next.result;
    },
    async submitMarketplace(_actor, input) {
      const next = submitMarketplace(snapshot, input, deps);
      snapshot = next.snapshot;
      return next.result;
    },
  };
}
