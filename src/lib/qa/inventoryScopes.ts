export const BUSINESS_REVIEW_LISTING_STATUSES = ["draft", "unclaimed"] as const;
export const BUSINESS_REVIEW_OUTREACH_STATUSES = ["not_contacted", "researching"] as const;

export const LEAD_DERIVED_BOOKING_STAGES = ["quote_sent", "pending", "booked", "completed"] as const;

export type ListingStatus = "draft" | "unclaimed" | "claimed_free" | "premium" | "archived";

export type OutreachStatus =
  | "not_contacted"
  | "researching"
  | "ready_to_contact"
  | "contacted"
  | "follow_up_needed"
  | "interested"
  | "claim_invited"
  | "claimed"
  | "not_interested"
  | "do_not_contact";

export type ScopeBusiness = {
  id: string;
  isDemo: boolean;
  isPublished: boolean;
  listingStatus: ListingStatus;
  outreachStatus: OutreachStatus | null;
};

export type ScopeLead = {
  id: string;
  businessId: string | null;
  stage: string;
};

export type ScopeWorld = {
  businesses: ScopeBusiness[];
  leads: ScopeLead[];
  bookings: { id: string }[];
  eventImportQueue: { id: string; reviewStatus: string }[];
};

const OUTREACH_HANDOFF = new Set<OutreachStatus>([
  "ready_to_contact",
  "contacted",
  "follow_up_needed",
  "interested",
  "claim_invited",
  "claimed",
  "not_interested",
  "do_not_contact",
]);

/**
 * Business listing review (/admin/listing-review).
 * Draft or unclaimed listings stay here until outreach is ready_to_contact or later.
 * This is not the event import queue.
 */
export function isBusinessListingReviewEligible(business: {
  listingStatus: string;
  outreachStatus: string | null;
}): boolean {
  const reviewListing = (BUSINESS_REVIEW_LISTING_STATUSES as readonly string[]).includes(business.listingStatus);
  if (!reviewListing) return false;
  if (!business.outreachStatus) return true;
  return (BUSINESS_REVIEW_OUTREACH_STATUSES as readonly string[]).includes(business.outreachStatus);
}

/** Published listings that are not archived. Unpublished drafts are not "active". */
export function isActiveBusiness(business: Pick<ScopeBusiness, "isPublished" | "listingStatus">): boolean {
  return business.isPublished && business.listingStatus !== "archived";
}

export function countScopes(world: ScopeWorld) {
  const businessesAll = world.businesses.length;
  const businessesDemo = world.businesses.filter((business) => business.isDemo).length;
  const businessesNonDemo = businessesAll - businessesDemo;
  const businessesPublished = world.businesses.filter((business) => business.isPublished).length;
  const businessesUnpublished = businessesAll - businessesPublished;
  const businessesActive = world.businesses.filter(isActiveBusiness).length;
  const businessListingReview = world.businesses.filter(isBusinessListingReviewEligible).length;
  const outreachRecords = world.businesses.filter((business) => business.outreachStatus !== null).length;
  const outreachHandoff = world.businesses.filter(
    (business) => business.outreachStatus !== null && OUTREACH_HANDOFF.has(business.outreachStatus),
  ).length;
  const leadsAll = world.leads.length;
  const leadsDirect = world.leads.filter((lead) => lead.businessId !== null).length;
  const leadsMarketplace = world.leads.filter((lead) => lead.businessId === null).length;
  const bookingsTable = world.bookings.length;
  const leadDerivedBookings = world.leads.filter((lead) =>
    (LEAD_DERIVED_BOOKING_STAGES as readonly string[]).includes(lead.stage),
  ).length;
  const eventImportQueue = world.eventImportQueue.length;
  const eventImportPending = world.eventImportQueue.filter((row) => row.reviewStatus === "pending_review").length;

  return {
    businessesAll,
    businessesDemo,
    businessesNonDemo,
    businessesPublished,
    businessesUnpublished,
    businessesActive,
    businessListingReview,
    outreachRecords,
    outreachHandoff,
    leadsAll,
    leadsDirect,
    leadsMarketplace,
    bookingsTable,
    leadDerivedBookings,
    eventImportQueue,
    eventImportPending,
  };
}

export function scopeInvariantFailures(counts: ReturnType<typeof countScopes>): string[] {
  const failures: string[] = [];
  if (counts.businessesDemo + counts.businessesNonDemo !== counts.businessesAll) {
    failures.push("demo + non-demo must equal all businesses");
  }
  if (counts.businessesPublished + counts.businessesUnpublished !== counts.businessesAll) {
    failures.push("published + unpublished must equal all businesses");
  }
  if (counts.businessesActive > counts.businessesPublished) {
    failures.push("active businesses must be a subset of published businesses");
  }
  if (counts.leadsDirect + counts.leadsMarketplace !== counts.leadsAll) {
    failures.push("direct + marketplace must equal all leads");
  }
  if (counts.outreachHandoff > counts.outreachRecords) {
    failures.push("outreach handoff must be a subset of outreach records");
  }
  if (counts.eventImportPending > counts.eventImportQueue) {
    failures.push("pending event imports must be a subset of the event import queue");
  }
  if (counts.businessListingReview > counts.businessesAll) {
    failures.push("business listing review cannot exceed businesses");
  }
  return failures;
}

export const QUEUE_LABELS = {
  businessListingReview: "Business listing review",
  eventImportQueue: "Event import queue",
} as const;
