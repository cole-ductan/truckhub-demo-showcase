import { describe, expect, it } from "vitest";
import { datasetMayBeSeeded } from "@/lib/qa/fixturePolicy";
import { PHASE0_AUDIT, phase0ArithmeticGaps } from "@/lib/qa/phase0Audit";
import { syntheticWorld } from "@/test/fixtures/syntheticWorld";

describe("Phase 0 audit observations", () => {
  it("keeps the census internally consistent", () => {
    expect(phase0ArithmeticGaps()).toEqual([]);
  });

  it("refuses to treat the census as a fixture", () => {
    expect(PHASE0_AUDIT.importable).toBe(false);
    expect(datasetMayBeSeeded(PHASE0_AUDIT)).toBe(false);
    expect(datasetMayBeSeeded(syntheticWorld)).toBe(true);
  });

  it("does not match the synthetic world counts", () => {
    expect(syntheticWorld.businesses.length).not.toBe(PHASE0_AUDIT.businesses.all);
    expect(syntheticWorld.leads.length).not.toBe(PHASE0_AUDIT.leads.all);
    expect(syntheticWorld.bookings.length).toBe(PHASE0_AUDIT.bookingsTable);
    expect(syntheticWorld.eventImportQueue.length).not.toBe(PHASE0_AUDIT.eventImportQueue.all);
  });

  it("keeps marketplace assignment slots from becoming extra leads", () => {
    expect(PHASE0_AUDIT.leads.marketplaceNullBusiness).toBe(1);
    expect(PHASE0_AUDIT.leads.marketplaceAssignmentSlotsOnThatRow).toBe(2);
    expect(PHASE0_AUDIT.leads.all).toBe(6);
  });

  it("names production and leaves the other Lovable host out of scope", () => {
    expect(PHASE0_AUDIT.production.url).toBe("https://foodxmobile.com");
    expect(PHASE0_AUDIT.production.commit).toBe("7314f8bd1cd506c4c697a41c60748f237a5ce157");
    expect(PHASE0_AUDIT.doNotTarget).toContain("https://truckhub.lovable.app");
    expect(PHASE0_AUDIT.businessListingReviewCount).toBeNull();
  });
});
