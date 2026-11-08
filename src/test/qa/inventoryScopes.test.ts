import { describe, expect, it } from "vitest";
import { countScopes, QUEUE_LABELS, scopeInvariantFailures } from "@/lib/qa/inventoryScopes";
import { syntheticWorld } from "@/test/fixtures/syntheticWorld";

describe("inventory scope reconciliation", () => {
  const counts = countScopes(syntheticWorld);

  it("reconciles all, demo, published, and active from the same rows", () => {
    expect(scopeInvariantFailures(counts)).toEqual([]);
    expect(counts.businessesAll).toBe(6);
    expect(counts.businessesDemo).toBe(3);
    expect(counts.businessesNonDemo).toBe(3);
    expect(counts.businessesPublished).toBe(3);
    expect(counts.businessesUnpublished).toBe(3);
    expect(counts.businessesActive).toBe(3);
  });

  it("keeps business listing review apart from outreach handoff and the event import queue", () => {
    expect(counts.businessListingReview).toBe(2);
    expect(counts.outreachRecords).toBe(5);
    expect(counts.outreachHandoff).toBe(3);
    expect(counts.eventImportQueue).toBe(3);
    expect(counts.eventImportPending).toBe(3);
    expect(counts.businessListingReview).not.toBe(counts.eventImportPending);
    expect(QUEUE_LABELS.businessListingReview).not.toBe(QUEUE_LABELS.eventImportQueue);
  });

  it("splits leads into direct and marketplace and does not use the bookings table", () => {
    expect(counts.leadsAll).toBe(3);
    expect(counts.leadsDirect).toBe(2);
    expect(counts.leadsMarketplace).toBe(1);
    expect(counts.bookingsTable).toBe(0);
    expect(counts.leadDerivedBookings).toBe(1);
  });
});
