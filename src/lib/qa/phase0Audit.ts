/**
 * Read-only Phase 0 census from 2026-11-08.
 * These numbers are audit observations. They are not seed data.
 * No customer, owner, or lead contact fields are stored here.
 */
export const PHASE0_AUDIT = {
  source: "phase0-audit-observation" as const,
  importable: false as const,
  observedOn: "2026-11-08",
  production: {
    url: "https://foodxmobile.com",
    commit: "7314f8bd1cd506c4c697a41c60748f237a5ce157",
    supabaseHost: "akhmgnjmhvvmprvnwusp",
    deploymentId: "02375315-0d81-481b-9278-809ade0c6026",
  },
  doNotTarget: ["https://truckhub.lovable.app"],
  businesses: {
    all: 9,
    published: 7,
    unpublished: 2,
    demo: 6,
    nonDemo: 3,
    publishedDemo: 6,
    publishedNonDemo: 1,
    withOwner: 2,
  },
  leads: {
    all: 6,
    direct: 5,
    marketplaceNullBusiness: 1,
    marketplaceAssignmentSlotsOnThatRow: 2,
    directDemo: 4,
    directNonDemo: 1,
  },
  bookingsTable: 0,
  eventImportQueue: {
    all: 219,
    pendingReview: 219,
    publishedAt: 0,
  },
  outreach: {
    rows: 9,
    notContacted: 6,
    claimed: 3,
  },
  other: {
    businessEvents: 10,
    vendorLeadPreferences: 0,
    claimRequests: 3,
    leadMessages: 2,
    depositRequests: 0,
    eventSources: 2,
  },
  absentLive: [
    "business_outreach.crm_state",
    "set_business_outreach_crm_state",
    "review_event_import",
  ],
  /**
   * Phase 0 did not publish a single business-listing-review count.
   * Do not infer one by reusing the outreach total or the 219 event-import rows.
   */
  businessListingReviewCount: null as null,
};

export function phase0ArithmeticGaps(audit: typeof PHASE0_AUDIT = PHASE0_AUDIT): string[] {
  const gaps: string[] = [];
  const businesses = audit.businesses;
  if (businesses.published + businesses.unpublished !== businesses.all) gaps.push("business publication split");
  if (businesses.demo + businesses.nonDemo !== businesses.all) gaps.push("business demo split");
  if (businesses.publishedDemo + businesses.publishedNonDemo !== businesses.published) gaps.push("published demo split");
  const leads = audit.leads;
  if (leads.direct + leads.marketplaceNullBusiness !== leads.all) gaps.push("lead channel split");
  if (leads.directDemo + leads.directNonDemo !== leads.direct) gaps.push("direct lead demo split");
  if (audit.outreach.notContacted + audit.outreach.claimed !== audit.outreach.rows) gaps.push("outreach status split");
  if (audit.eventImportQueue.pendingReview !== audit.eventImportQueue.all) gaps.push("event import pending split");
  if (audit.bookingsTable !== 0) gaps.push("bookings table observation");
  return gaps;
}
