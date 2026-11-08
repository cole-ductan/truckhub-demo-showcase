import { describe, expect, it } from "vitest";
import { projectionToOwnerLeadView } from "./viewModel";
import type { MarketplaceLeadProjection } from "./types";

describe("owner lead view", () => {
  it("blanks customer fields unless the assignment is accepted", () => {
    const projection: MarketplaceLeadProjection = {
      kind: "marketplace",
      leadId: "lead",
      businessId: "biz",
      assignmentStatus: "offered",
      stage: "new",
      notes: null,
      quote: null,
      threadId: "should-not-pass",
      request: {
        eventType: "Graduation",
        requestType: null,
        eventDate: "2026-12-01",
        eventStartTime: "11:00",
        eventEndTime: "14:00",
        guestCount: "40",
        publicLocation: "Exampleville",
        cuisinePreference: null,
        budgetRange: null,
        estimatedValue: 600,
        serviceStyle: null,
        eventFrequency: null,
      },
      customer: {
        contactName: "Casey Sample",
        contactEmail: "casey.sample@example.test",
        contactPhone: "PHONE-CASEY",
        message: "PII-MESSAGE-CASEY",
        streetAddress: "STREET-CASEY",
        postalCode: "ZIP-CASEY",
      },
      assignedAt: "2026-10-20T16:00:00.000Z",
      updatedAt: "2026-10-20T16:00:00.000Z",
      createdAt: "2026-10-20T15:00:00.000Z",
    };
    const view = projectionToOwnerLeadView({ ...projection, threadId: null, customer: null });
    const forged = projectionToOwnerLeadView(projection);
    for (const candidate of [view, forged]) {
      expect(candidate.customer_visible).toBe(false);
      expect(candidate.contact_email).toBe("");
      expect(candidate.street_address).toBeNull();
      expect(candidate.can_delete).toBe(false);
      expect(candidate.can_accept).toBe(true);
      expect(candidate.thread_open).toBe(false);
      expect(candidate.public_location).toBe("Exampleville");
      expect(JSON.stringify(candidate)).not.toContain("casey.sample");
      expect(JSON.stringify(candidate)).not.toContain("STREET-CASEY");
    }
  });
});
