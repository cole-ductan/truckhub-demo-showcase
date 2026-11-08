import { describe, expect, it } from "vitest";
import { countScopes, isBusinessListingReviewEligible, QUEUE_LABELS, scopeInvariantFailures } from "@/lib/qa/inventoryScopes";
import { syntheticWorld } from "@/test/fixtures/syntheticWorld";

describe("inventory scope reconciliation", () => {
  const counts = countScopes(syntheticWorld);

  it("reconciles all, demo, published, and active from the same rows", () => {
    expect(scopeInvariantFailures(counts)).toEqual([]);
    expect(counts.businessesAll).toBe(8);
    expect(counts.businessesDemo).toBe(3);
    expect(counts.businessesNonDemo).toBe(5);
    expect(counts.businessesPublished).toBe(5);
    expect(counts.businessesUnpublished).toBe(3);
    expect(counts.businessesActive).toBe(5);
  });

  it("keeps business listing review apart from outreach handoff and the event import queue", () => {
    expect(counts.businessListingReview).toBe(2);
    expect(counts.outreachRecords).toBe(7);
    expect(counts.outreachHandoff).toBe(5);
    expect(counts.eventImportQueue).toBe(3);
    expect(counts.eventImportPending).toBe(3);
    expect(counts.businessListingReview).not.toBe(counts.eventImportPending);
    expect(QUEUE_LABELS.businessListingReview).not.toBe(QUEUE_LABELS.eventImportQueue);
  });

  it("pins business listing review to draft or unclaimed with early outreach only", () => {
    const eligible = (listingStatus: string, outreachStatus: string | null) =>
      isBusinessListingReviewEligible({ listingStatus, outreachStatus });
    expect(eligible("draft", null)).toBe(true);
    expect(eligible("unclaimed", null)).toBe(true);
    expect(eligible("draft", "not_contacted")).toBe(true);
    expect(eligible("unclaimed", "researching")).toBe(true);
    expect(eligible("unclaimed", "ready_to_contact")).toBe(false);
    expect(eligible("unclaimed", "claimed")).toBe(false);
    expect(eligible("claimed_free", "not_contacted")).toBe(false);
    expect(eligible("claimed_free", null)).toBe(false);
    expect(eligible("premium", null)).toBe(false);
    expect(eligible("archived", "not_contacted")).toBe(false);
    expect(eligible("archived", null)).toBe(false);
  });

  it("splits leads into direct and marketplace and does not use the bookings table", () => {
    expect(counts.leadsAll).toBe(3);
    expect(counts.leadsDirect).toBe(2);
    expect(counts.leadsMarketplace).toBe(1);
    expect(counts.bookingsTable).toBe(0);
    expect(counts.leadDerivedBookings).toBe(1);
  });
});
