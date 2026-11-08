/** What AdminOutreach currently sends, regardless of the live database. */
export const FRONTEND_OUTREACH_CONTRACT = {
  selectedColumn: "crm_state",
  rpc: "set_business_outreach_crm_state",
  states: ["active", "completed", "archived", "deleted"],
} as const;

/** Phase 0 public-routine and column inventory. Not a live probe. */
export const LIVE_SCHEMA_ABSENT = [
  "business_outreach.crm_state",
  "set_business_outreach_crm_state",
  "review_event_import",
] as const;

export const LIVE_SCHEMA_PRESENT = [
  "business_outreach",
  "update_business_outreach_pipeline",
  "mark_business_ready_for_outreach",
  "event_import_queue",
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
