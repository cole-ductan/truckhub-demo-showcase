/** What AdminOutreach currently sends, regardless of the live database. */
export const FRONTEND_OUTREACH_CONTRACT = {
  selectedColumn: "crm_state",
  rpc: "set_business_outreach_crm_state",
  states: ["active", "completed", "archived", "deleted"],
} as const;

/**
 * Absent from the 2026-11-08 production catalog (columns or routines).
 * This list is the catalog result, not a guess from generated types.
 */
export const LIVE_SCHEMA_ABSENT = [
  "business_outreach.crm_state",
  "business_outreach.completed_at",
  "business_outreach.archived_at",
  "business_outreach.deleted_at",
  "set_business_outreach_crm_state",
  "review_event_import",
  "enforce_archived_business_unpublished",
  "archive_business_listing",
  "reject_obvious_claim_email_typos",
  "businesses_force_archived_unpublished",
  "businesses_block_implicit_archived_restore",
] as const;

/** Tables the Phase 0 / 2026-11-08 catalog confirmed in production. */
export const CATALOG_VERIFIED_LIVE_TABLES = ["business_outreach", "event_import_queue"] as const;

/**
 * Present in generated Database types and in main migrations.
 * The 2026-11-08 catalog did not verify these routines. Do not describe them as live.
 */
export const EXPECTED_BY_GENERATED_TYPES = [
  "update_business_outreach_pipeline",
  "mark_business_ready_for_outreach",
] as const;

export type CrmState = (typeof FRONTEND_OUTREACH_CONTRACT.states)[number];

export type OutreachRecord = {
  businessId: string;
  crmState: CrmState;
};

export type CrmTransition = {
  record: OutreachRecord;
  activity: string;
  businessListingUntouched: true;
};

/**
 * Documents the proposed RPC's effect on an in-memory record.
 * It does not call a database. The business listing id is not rewritten.
 */
export function applyProposedCrmState(record: OutreachRecord, next: CrmState): CrmTransition {
  if (!FRONTEND_OUTREACH_CONTRACT.states.includes(next)) {
    throw new Error("invalid CRM state");
  }
  const labels: Record<CrmState, string> = {
    active: "CRM record restored to active queue",
    completed: "CRM record marked complete",
    archived: "CRM record archived",
    deleted: "CRM record removed from live CRM",
  };
  return {
    record: { businessId: record.businessId, crmState: next },
    activity: labels[next],
    businessListingUntouched: true,
  };
}
