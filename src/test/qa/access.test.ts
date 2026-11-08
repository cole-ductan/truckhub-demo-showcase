import { describe, expect, it } from "vitest";
import {
  adminRouteDecision,
  canEditAssignment,
  canInvokeOutreachCrmState,
  assignmentNotesVisibleTo,
  canReadCustomer,
  canReadVendorNote,
  currentOwnerLeadIds,
  ownerRouteDecision,
  publicDiscoveryAllowed,
} from "@/lib/qa/access";
import { bannedFixtureText, syntheticContactProblems } from "@/lib/qa/fixturePolicy";
import { SYNTHETIC_ACTORS, syntheticContacts, syntheticLeads, syntheticWorld } from "@/test/fixtures/syntheticWorld";

const marketplace = syntheticLeads.find((lead) => lead.id === "synth-lead-marketplace");
const directA = syntheticLeads.find((lead) => lead.id === "synth-lead-direct-a");
const directB = syntheticLeads.find((lead) => lead.id === "synth-lead-direct-b");

describe("synthetic role fixtures", () => {
  it("uses synthetic contacts and does not embed production hosts", () => {
    expect(syntheticContactProblems(syntheticContacts)).toEqual([]);
    expect(bannedFixtureText(JSON.stringify(syntheticWorld))).toEqual([]);
    expect(bannedFixtureText(JSON.stringify(syntheticLeads))).toEqual([]);
    expect(marketplace).toBeDefined();
    expect(directA).toBeDefined();
    expect(directB).toBeDefined();
  });

  it("matches the current owner query, which hides the null-business marketplace lead", () => {
    expect(currentOwnerLeadIds(SYNTHETIC_ACTORS.ownerA.businessId, syntheticLeads)).toEqual(["synth-lead-direct-a"]);
    expect(currentOwnerLeadIds(SYNTHETIC_ACTORS.ownerB.businessId, syntheticLeads)).toEqual(["synth-lead-direct-b"]);
    expect(currentOwnerLeadIds(SYNTHETIC_ACTORS.ownerA.businessId, syntheticLeads)).not.toContain("synth-lead-marketplace");
  });

  it("isolates customer data across anonymous, two owners, and admin", () => {
    expect(canReadCustomer(SYNTHETIC_ACTORS.anonymous, marketplace!)).toBe(false);
    expect(canReadCustomer(SYNTHETIC_ACTORS.anonymous, directA!)).toBe(false);
    expect(canReadCustomer(SYNTHETIC_ACTORS.ownerA, directA!)).toBe(true);
    expect(canReadCustomer(SYNTHETIC_ACTORS.ownerA, directB!)).toBe(false);
    expect(canReadCustomer(SYNTHETIC_ACTORS.ownerA, marketplace!)).toBe(true);
    expect(canReadCustomer(SYNTHETIC_ACTORS.ownerB, marketplace!)).toBe(true);
    expect(canReadCustomer(SYNTHETIC_ACTORS.ownerB, directA!)).toBe(false);
    expect(canReadCustomer(SYNTHETIC_ACTORS.ownerDeclined, marketplace!)).toBe(false);
    expect(canReadCustomer(SYNTHETIC_ACTORS.ownerRevoked, marketplace!)).toBe(false);
    expect(canReadCustomer(SYNTHETIC_ACTORS.admin, marketplace!)).toBe(true);
    expect(canReadCustomer(SYNTHETIC_ACTORS.suspendedOwner, directA!)).toBe(false);
  });

  it("keeps vendor notes and assignment edits on the owning role", () => {
    expect(canReadVendorNote(SYNTHETIC_ACTORS.ownerA, "synth-biz-fox-lantern")).toBe(false);
    expect(canReadVendorNote(SYNTHETIC_ACTORS.ownerB, "synth-biz-north-pier")).toBe(false);
    expect(canReadVendorNote(SYNTHETIC_ACTORS.ownerA, "synth-biz-north-pier")).toBe(true);
    expect(canReadVendorNote(SYNTHETIC_ACTORS.anonymous, "synth-biz-north-pier")).toBe(false);
    expect(canReadVendorNote(SYNTHETIC_ACTORS.admin, "synth-biz-fox-lantern")).toBe(true);
    expect(canEditAssignment(SYNTHETIC_ACTORS.ownerA)).toBe(false);
    expect(canEditAssignment(SYNTHETIC_ACTORS.anonymous)).toBe(false);
    expect(canEditAssignment(SYNTHETIC_ACTORS.admin)).toBe(true);
  });

  it("isolates per-vendor notes when two owners are accepted on the same marketplace lead", () => {
    const notesFor = (actor: (typeof SYNTHETIC_ACTORS)[keyof typeof SYNTHETIC_ACTORS]) =>
      assignmentNotesVisibleTo(actor, marketplace!);
    expect(notesFor(SYNTHETIC_ACTORS.ownerA)).toEqual(["North Pier quote note"]);
    expect(notesFor(SYNTHETIC_ACTORS.ownerB)).toEqual(["Fox Lantern quote note"]);
    expect(notesFor(SYNTHETIC_ACTORS.ownerA)).not.toContain("Fox Lantern quote note");
    expect(notesFor(SYNTHETIC_ACTORS.ownerB)).not.toContain("North Pier quote note");
    expect(notesFor(SYNTHETIC_ACTORS.ownerDeclined)).toEqual([]);
    expect(notesFor(SYNTHETIC_ACTORS.ownerRevoked)).toEqual([]);
    expect(notesFor(SYNTHETIC_ACTORS.anonymous)).toEqual([]);
    expect(notesFor(SYNTHETIC_ACTORS.admin)).toEqual([
      "North Pier quote note",
      "Fox Lantern quote note",
      "Declined vendor private note",
      "Revoked vendor private note",
    ]);
    expect(canReadVendorNote(SYNTHETIC_ACTORS.ownerDeclined, "synth-biz-north-pier")).toBe(false);
    expect(canReadVendorNote(SYNTHETIC_ACTORS.ownerDeclined, "synth-biz-fox-lantern")).toBe(false);
    expect(canReadVendorNote(SYNTHETIC_ACTORS.ownerRevoked, "synth-biz-north-pier")).toBe(false);
    expect(canReadVendorNote(SYNTHETIC_ACTORS.ownerRevoked, "synth-biz-fox-lantern")).toBe(false);
  });

  it("follows the admin, owner, and public route assumptions", () => {
    expect(adminRouteDecision(SYNTHETIC_ACTORS.anonymous)).toBe("redirect-auth");
    expect(adminRouteDecision(SYNTHETIC_ACTORS.ownerA)).toBe("redirect-owner");
    expect(adminRouteDecision(SYNTHETIC_ACTORS.admin)).toBe("allow");
    expect(ownerRouteDecision(SYNTHETIC_ACTORS.anonymous)).toBe("redirect-auth");
    expect(ownerRouteDecision(SYNTHETIC_ACTORS.ownerB)).toBe("allow");
    expect(ownerRouteDecision(SYNTHETIC_ACTORS.suspendedOwner)).toBe("suspended");
    expect(publicDiscoveryAllowed(SYNTHETIC_ACTORS.anonymous)).toBe(true);
    expect(canInvokeOutreachCrmState(SYNTHETIC_ACTORS.admin)).toBe(true);
    expect(canInvokeOutreachCrmState(SYNTHETIC_ACTORS.ownerA)).toBe(false);
    expect(canInvokeOutreachCrmState(SYNTHETIC_ACTORS.anonymous)).toBe(false);
  });
});
