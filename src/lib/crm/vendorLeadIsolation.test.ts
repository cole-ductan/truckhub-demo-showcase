/**
 * Mock directory checks only. They are not proof of deployed row-level security.
 * A client helper that returns { saved: true, id } does not prove anonymous
 * read denial on the hosted database. submit_direct_inquiry is proposal-only.
 */
import { describe, expect, it } from "vitest";
import { LeadAccessError } from "./errors";
import {
  FX,
  SECRET,
  actorAdmin,
  actorAnonymous,
  actorOwnerA,
  actorOwnerB,
  actorOwnerC,
  actorSystem,
  syntheticCrmSnapshot,
} from "./fixtures";
import { createMockLeadDirectory } from "./mockLeadDirectory";
import type { MarketplaceLeadProjection, OwnerLeadProjection } from "./types";

function directory() {
  return createMockLeadDirectory();
}

it("keeps contact emails on the synthetic fixture domain", () => {
  const emails = JSON.stringify(syntheticCrmSnapshot()).match(/[^\s"]+@[^\s"]+/g) ?? [];
  expect(emails.length).toBeGreaterThan(0);
  for (const email of emails) expect(email.endsWith("@fxm-synthetic.test")).toBe(true);
});

function dump(value: unknown): string {
  return JSON.stringify(value);
}

function asMarketplace(projection: OwnerLeadProjection | null): MarketplaceLeadProjection {
  expect(projection?.kind).toBe("marketplace");
  return projection as MarketplaceLeadProjection;
}

const MARKET_KEYS = [
  "assignedAt",
  "assignmentStatus",
  "businessId",
  "createdAt",
  "customer",
  "kind",
  "leadId",
  "notes",
  "quote",
  "request",
  "stage",
  "threadId",
  "updatedAt",
].sort();

describe("per-vendor marketplace lead isolation", () => {
  it("shows direct leads and accepted marketplace leads only to the owning vendor", async () => {
    const crm = directory();
    const a = await crm.listOwnerProjections(actorOwnerA, FX.bizA);
    const b = await crm.listOwnerProjections(actorOwnerB, FX.bizB);
    expect(a.map((lead) => lead.leadId).sort()).toEqual([
      FX.directA,
      FX.marketExpired,
      FX.marketOffered,
      FX.marketOpen,
      FX.marketRevoked,
      FX.marketShared,
    ].sort());
    expect(b.map((lead) => lead.leadId).sort()).toEqual([
      FX.directB,
      FX.marketOffered,
      FX.marketShared,
    ].sort());
    expect(a.some((lead) => lead.leadId === FX.directB || lead.leadId === FX.marketLegacy)).toBe(false);

    const sharedA = asMarketplace(a.find((lead) => lead.leadId === FX.marketShared) ?? null);
    const sharedB = asMarketplace(b.find((lead) => lead.leadId === FX.marketShared) ?? null);
    expect(sharedA.stage).toBe("quote_sent");
    expect(sharedB.stage).toBe("contacted");
    expect(sharedA.notes).toBe(SECRET.vendorANotes);
    expect(sharedA.quote).toBe(SECRET.vendorAQuote);
    expect(sharedB.notes).toBe(SECRET.vendorBNotes);
    expect(sharedB.quote).toBe(SECRET.vendorBQuote);
    expect(sharedA.customer?.contactEmail).toBe(SECRET.emailRiley);
    expect(sharedB.customer?.contactEmail).toBe(SECRET.emailRiley);
    expect(sharedA.request.estimatedValue).toBe(1800);
    expect(sharedB.request.estimatedValue).toBe(1800);
    expect(dump(sharedA)).not.toContain(SECRET.vendorBNotes);
    expect(dump(sharedA)).not.toContain(SECRET.vendorBQuote);
    expect(dump(sharedA)).not.toContain(SECRET.vendorBThread);
    expect(dump(sharedB)).not.toContain(SECRET.vendorANotes);
    expect(dump(a)).not.toContain(SECRET.sharedNotes);
    expect(dump(a)).not.toContain(SECRET.adminNotes);
    expect(dump(b)).not.toContain(SECRET.sharedNotes);
    expect(Object.keys(sharedA).sort()).toEqual(MARKET_KEYS);
  });

  it("does not use the shared lead stage or assigned_vendor_ids as access", async () => {
    const snap = syntheticCrmSnapshot();
    const shared = snap.leads.find((lead) => lead.id === FX.marketShared);
    shared!.assignedVendorIds = shared!.assignedVendorIds.filter((id) => id !== FX.bizA);
    const crm = createMockLeadDirectory(snap);
    const view = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketShared));
    expect(view.assignmentStatus).toBe("accepted");
    expect(view.stage).toBe("quote_sent");
    expect(crm.readSnapshot().leads.find((lead) => lead.id === FX.marketShared)?.stage).toBe("lost");

    const unassigned = await crm.listOwnerProjections(actorOwnerC, FX.bizC);
    expect(unassigned.map((lead) => lead.leadId)).toEqual([FX.directC]);
    expect(dump(unassigned)).not.toContain(SECRET.emailRiley);
    expect(dump(unassigned)).not.toContain(SECRET.vendorANotes);
    expect(await crm.getOwnerProjection(actorOwnerC, FX.bizC, FX.marketShared)).toBeNull();
  });

  it("gives offered vendors a request summary and no customer PII", async () => {
    const crm = directory();
    const offered = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketOffered));
    expect(offered.assignmentStatus).toBe("offered");
    expect(offered.customer).toBeNull();
    expect(offered.threadId).toBeNull();
    expect(offered.request).toMatchObject({
      eventType: "Graduation",
      eventDate: "2026-12-01",
      eventStartTime: "11:00",
      eventEndTime: "14:00",
      guestCount: "40",
      publicLocation: "Exampleville Civic Green",
      estimatedValue: 600,
    });
    const text = dump(offered);
    for (const secret of [SECRET.emailCasey, SECRET.phoneCasey, SECRET.streetCasey, SECRET.zipCasey, SECRET.messageCasey, SECRET.sharedNotes, SECRET.adminNotes]) {
      expect(text).not.toContain(secret);
    }
    await expect(crm.listThread(actorOwnerA, FX.bizA, FX.marketOffered)).rejects.toBeInstanceOf(LeadAccessError);
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketOffered, { notes: "draft" })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("keeps revoked and expired vendors on their own notes without customer data or threads", async () => {
    const crm = directory();
    const revoked = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketRevoked));
    const expired = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketExpired));
    expect(revoked.assignmentStatus).toBe("revoked");
    expect(expired.assignmentStatus).toBe("expired");
    expect(revoked.customer).toBeNull();
    expect(expired.customer).toBeNull();
    expect(revoked.threadId).toBeNull();
    expect(expired.threadId).toBeNull();
    expect(revoked.notes).toBe(SECRET.vendorARevokedNote);
    expect(revoked.quote).toBe(SECRET.vendorARevokedQuote);
    expect(expired.notes).toBe(SECRET.vendorAExpiredNote);
    const text = dump([revoked, expired]);
    for (const secret of [SECRET.emailJordan, SECRET.streetJordan, SECRET.customerThreadJordan, SECRET.vendorARevokedThread, SECRET.emailGray, SECRET.customerThreadGray, SECRET.adminNotes]) {
      expect(text).not.toContain(secret);
    }
    await expect(crm.listThread(actorOwnerA, FX.bizA, FX.marketRevoked)).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.appendOwnerMessage(actorOwnerA, FX.bizA, FX.marketExpired, "hello")).rejects.toMatchObject({ code: "forbidden" });
    expect(crm.readSnapshot().messages.some((message) => message.body === SECRET.customerThreadJordan)).toBe(true);
  });

  it("isolates threads for two accepted vendors and hides unscoped messages", async () => {
    const crm = directory();
    const a = await crm.listThread(actorOwnerA, FX.bizA, FX.marketShared);
    const b = await crm.listThread(actorOwnerB, FX.bizB, FX.marketShared);
    expect(a.map((message) => message.body)).toEqual([SECRET.customerToA, SECRET.vendorAThread]);
    expect(b.map((message) => message.body)).toEqual([SECRET.vendorBThread]);
    const inbox = await crm.listOwnerThreads(actorOwnerA, FX.bizA);
    const text = dump(inbox);
    expect(text).toContain(SECRET.vendorAThread);
    expect(text).not.toContain(SECRET.vendorBThread);
    expect(text).not.toContain(SECRET.sharedThread);
    expect(text).not.toContain(SECRET.customerThreadJordan);

    await crm.appendOwnerMessage(actorOwnerA, FX.bizA, FX.marketShared, "A follow-up");
    const bAfter = await crm.listThread(actorOwnerB, FX.bizB, FX.marketShared);
    expect(bAfter.map((message) => message.body)).toEqual([SECRET.vendorBThread]);
  });

  it("lets each accepted vendor change only their own stage, notes, and quote", async () => {
    const crm = directory();
    await crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketShared, {
      stage: "booked",
      notes: "A-UPDATED",
      quote: "A-Q2",
    });
    const a = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketShared));
    const b = asMarketplace(await crm.getOwnerProjection(actorOwnerB, FX.bizB, FX.marketShared));
    expect(a.stage).toBe("booked");
    expect(a.notes).toBe("A-UPDATED");
    expect(a.quote).toBe("A-Q2");
    expect(b.stage).toBe("contacted");
    expect(b.notes).toBe(SECRET.vendorBNotes);
    expect(b.quote).toBe(SECRET.vendorBQuote);
    const lead = crm.readSnapshot().leads.find((row) => row.id === FX.marketShared);
    expect(lead).toMatchObject({
      businessId: null,
      stage: "lost",
      internalNotes: SECRET.sharedNotes,
      estimatedValue: 1800,
    });
    // Marketplace estimated_value is shared budget (Director lock, 2026-11-08 about 2:23 PM CST).
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketShared, { estimatedValue: 1, notes: "nope" })).rejects.toMatchObject({ code: "forbidden" });
    expect(crm.readSnapshot().leads.find((row) => row.id === FX.marketShared)?.estimatedValue).toBe(1800);
    expect(asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketShared)).notes).toBe("A-UPDATED");
  });

  it("rejects owner edits to assignment and admin fields", async () => {
    const crm = directory();
    const before = crm.readSnapshot();
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketShared, { assignmentStatus: "revoked" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketShared, { adminNotes: "nope" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketShared, { assignedVendorIds: [] })).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketShared, { businessId: FX.bizB })).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.revokeAssignment(actorOwnerA, FX.marketShared, FX.bizA)).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.expireAssignment(actorOwnerA, FX.marketShared, FX.bizA)).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.offerAssignment(actorOwnerA, FX.marketLegacy, FX.bizA)).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.reassignMarketplaceLead(actorOwnerA, FX.marketOpen, FX.bizA, FX.bizB)).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.acceptAssignment(actorOwnerA, FX.bizB, FX.marketShared)).rejects.toMatchObject({ code: "forbidden" });
    expect(crm.readSnapshot().vendorStates).toEqual(before.vendorStates);
  });

  it("unlocks customer fields only when that vendor accepts", async () => {
    const crm = directory();
    const accepted = asMarketplace(await crm.acceptAssignment(actorOwnerA, FX.bizA, FX.marketOffered));
    expect(accepted.assignmentStatus).toBe("accepted");
    expect(accepted.customer?.contactEmail).toBe(SECRET.emailCasey);
    expect(accepted.customer?.streetAddress).toBe(SECRET.streetCasey);
    const declinedVendor = asMarketplace(await crm.getOwnerProjection(actorOwnerB, FX.bizB, FX.marketOffered));
    expect(declinedVendor.customer).toBeNull();
    expect(dump(declinedVendor)).not.toContain(SECRET.emailCasey);
    const lead = crm.readSnapshot().leads.find((row) => row.id === FX.marketOffered);
    expect(lead?.businessId).toBeNull();
    expect(lead?.internalNotes).toBe(SECRET.sharedNotes);
  });

  it("declines without deleting the shared inquiry or the other vendor", async () => {
    const crm = directory();
    const before = crm.readSnapshot();
    const declined = asMarketplace(await crm.declineAssignment(actorOwnerA, FX.bizA, FX.marketOffered));
    expect(declined.assignmentStatus).toBe("declined");
    expect(declined.customer).toBeNull();
    const after = crm.readSnapshot();
    expect(after.leads.find((row) => row.id === FX.marketOffered)?.customer.contactEmail).toBe(SECRET.emailCasey);
    expect(after.messages).toHaveLength(before.messages.length);
    expect(after.vendorStates.find((row) => row.id === FX.stateOfferedB)?.assignmentStatus).toBe("declined");
    await expect(crm.deleteDirectLead(actorOwnerA, FX.bizA, FX.marketShared)).rejects.toMatchObject({ code: "forbidden" });
    expect(crm.readSnapshot().messages.some((message) => message.body === SECRET.vendorBThread)).toBe(true);
    await expect(crm.deleteDirectLead(actorAdmin, FX.bizA, FX.marketShared)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("revokes and expires without letting that vendor keep customer or thread access", async () => {
    const crm = directory();
    await crm.revokeAssignment(actorAdmin, FX.marketShared, FX.bizB);
    const revoked = asMarketplace(await crm.getOwnerProjection(actorOwnerB, FX.bizB, FX.marketShared));
    expect(revoked.assignmentStatus).toBe("revoked");
    expect(revoked.customer).toBeNull();
    expect(revoked.notes).toBe(SECRET.vendorBNotes);
    expect(dump(revoked)).not.toContain(SECRET.emailRiley);
    await expect(crm.listThread(actorOwnerB, FX.bizB, FX.marketShared)).rejects.toMatchObject({ code: "forbidden" });
    const a = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketShared));
    expect(a.customer?.contactEmail).toBe(SECRET.emailRiley);
    expect(a.notes).toBe(SECRET.vendorANotes);
    expect(dump(a)).not.toContain(SECRET.vendorBNotes);

    await crm.expireAssignment(actorSystem, FX.marketOpen, FX.bizA);
    const expired = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketOpen));
    expect(expired.assignmentStatus).toBe("expired");
    expect(expired.customer).toBeNull();
    expect(expired.notes).toBe(SECRET.vendorAReassignNote);
    expect(dump(expired)).not.toContain(SECRET.emailDrew);
    await expect(crm.listThread(actorOwnerA, FX.bizA, FX.marketOpen)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("reassigns by revoking the previous row and offering a blank one", async () => {
    const crm = directory();
    const beforeLead = crm.readSnapshot().leads.find((row) => row.id === FX.marketOpen);
    const result = await crm.reassignMarketplaceLead(actorAdmin, FX.marketOpen, FX.bizA, FX.bizB);
    expect(result.revoked.id).toBe(FX.stateOpenA);
    expect(result.revoked.businessId).toBe(FX.bizA);
    expect(result.revoked.assignmentStatus).toBe("revoked");
    expect(result.revoked.notes).toBe(SECRET.vendorAReassignNote);
    expect(result.revoked.quote).toBe("VENDOR-A-REASSIGN-QUOTE");
    expect(result.offered.businessId).toBe(FX.bizB);
    expect(result.offered.assignmentStatus).toBe("offered");
    expect(result.offered.notes).toBeNull();
    expect(result.offered.quote).toBeNull();
    expect(result.offered.threadId).toBeNull();
    expect(result.offered.id).not.toBe(result.revoked.id);

    const lead = crm.readSnapshot().leads.find((row) => row.id === FX.marketOpen);
    expect(lead?.businessId).toBeNull();
    expect(lead?.stage).toBe(beforeLead?.stage);
    expect(lead?.internalNotes).toBe(SECRET.sharedNotes);
    const events = crm.readSnapshot().assignmentEvents.filter((event) => event.leadId === FX.marketOpen);
    expect(events.map((event) => `${event.businessId}:${event.fromStatus ?? "none"}->${event.toStatus}`)).toEqual([
      `${FX.bizA}:accepted->revoked`,
      `${FX.bizB}:none->offered`,
    ]);

    const closed = crm.readSnapshot().vendorStates.find((row) => row.id === FX.stateOpenA);
    expect(closed?.notes).toBe(SECRET.vendorAReassignNote);
    expect(closed?.quote).toBe("VENDOR-A-REASSIGN-QUOTE");
    const previous = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketOpen));
    const next = asMarketplace(await crm.getOwnerProjection(actorOwnerB, FX.bizB, FX.marketOpen));
    expect(previous.customer).toBeNull();
    expect(previous.notes).toBe(SECRET.vendorAReassignNote);
    expect(next.customer).toBeNull();
    expect(dump(next)).not.toContain(SECRET.emailDrew);
    expect(dump(next)).not.toContain(SECRET.vendorAReassignNote);
    expect(dump(next)).not.toContain(SECRET.streetDrew);
    await expect(crm.listThread(actorOwnerA, FX.bizA, FX.marketOpen)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("refuses a second active assignment for the same lead and business", async () => {
    const crm = directory();
    await expect(crm.offerAssignment(actorAdmin, FX.marketOffered, FX.bizA)).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(crm.offerAssignment(actorAdmin, FX.marketShared, FX.bizA)).rejects.toMatchObject({ code: "invalid_transition" });
    expect(crm.readSnapshot().vendorStates.filter((row) => row.leadId === FX.marketOffered && row.businessId === FX.bizA)).toHaveLength(1);
    expect(crm.readSnapshot().vendorStates.filter((row) => row.leadId === FX.marketShared && row.businessId === FX.bizA)).toHaveLength(1);
    expect(crm.readSnapshot().vendorStates.find((row) => row.id === FX.stateSharedA)?.assignmentStatus).toBe("accepted");
  });

  it("stops revoked and expired vendors from writing customer fields or the customer thread", async () => {
    const crm = directory();
    const beforeMessages = crm.readSnapshot().messages.length;
    await crm.revokeAssignment(actorAdmin, FX.marketShared, FX.bizA);
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketShared, {
      stage: "lost",
      notes: "VENDOR-A-WROTE-AFTER-REVOKE",
      quote: "QUOTE-AFTER-REVOKE",
    })).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.appendOwnerMessage(actorOwnerA, FX.bizA, FX.marketShared, "THREAD-AFTER-REVOKE")).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketShared, { contactName: "Renamed Example" })).rejects.toMatchObject({ code: "forbidden" });
    const revoked = crm.readSnapshot().vendorStates.find((row) => row.id === FX.stateSharedA);
    expect(revoked?.assignmentStatus).toBe("revoked");
    expect(revoked?.notes).toBe(SECRET.vendorANotes);
    expect(revoked?.quote).toBe(SECRET.vendorAQuote);
    expect(crm.readSnapshot().messages.some((message) => message.body === "THREAD-AFTER-REVOKE")).toBe(false);

    await crm.expireAssignment(actorSystem, FX.marketOpen, FX.bizA);
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.marketOpen, {
      notes: "VENDOR-A-WROTE-AFTER-EXPIRE",
      quote: "QUOTE-AFTER-EXPIRE",
    })).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.appendOwnerMessage(actorOwnerA, FX.bizA, FX.marketOpen, "THREAD-AFTER-EXPIRE")).rejects.toMatchObject({ code: "forbidden" });
    const expired = crm.readSnapshot().vendorStates.find((row) => row.id === FX.stateOpenA);
    expect(expired?.notes).toBe(SECRET.vendorAReassignNote);
    expect(expired?.quote).toBe("VENDOR-A-REASSIGN-QUOTE");
    expect(crm.readSnapshot().messages).toHaveLength(beforeMessages);
    expect(crm.readSnapshot().leads.find((row) => row.id === FX.marketShared)?.customer.contactEmail).toBe(SECRET.emailRiley);
  });

  it("does not put a street-like event_location on an offered public location", async () => {
    const snap = syntheticCrmSnapshot();
    const lead = snap.leads.find((row) => row.id === FX.marketOffered);
    lead!.cityOrVenue = null;
    lead!.customer.streetAddress = "410 Synthetic Street";
    lead!.customer.postalCode = "ZIP-HIDDEN-OFFER";
    const crm = createMockLeadDirectory(snap);
    const offered = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketOffered));
    expect(offered.request.publicLocation).toBeNull();
    expect(offered.customer).toBeNull();
    const text = dump(offered);
    expect(text).not.toContain("410 Synthetic Street");
    expect(text).not.toContain("ZIP-HIDDEN-OFFER");
    expect(text).not.toContain(SECRET.emailCasey);
  });

  it("reopens a terminal row instead of creating a second active assignment", async () => {
    const crm = directory();
    await expect(crm.reassignMarketplaceLead(actorAdmin, FX.marketShared, FX.bizA, FX.bizB)).rejects.toMatchObject({ code: "invalid_transition" });
    expect(crm.readSnapshot().vendorStates.find((row) => row.id === FX.stateSharedA)?.assignmentStatus).toBe("accepted");

    const reopened = await crm.reassignMarketplaceLead(actorAdmin, FX.marketOffered, FX.bizA, FX.bizB);
    expect(reopened.offered.id).toBe(FX.stateOfferedB);
    expect(reopened.offered.assignmentStatus).toBe("offered");
    expect(crm.readSnapshot().vendorStates.filter((row) => row.leadId === FX.marketOffered && row.businessId === FX.bizB)).toHaveLength(1);
    const view = asMarketplace(await crm.getOwnerProjection(actorOwnerB, FX.bizB, FX.marketOffered));
    expect(view.customer).toBeNull();
    expect(dump(view)).not.toContain(SECRET.emailCasey);
  });

  it("maps legacy assignment slots to offered and never to accepted", async () => {
    const crm = directory();
    expect(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketLegacy)).toBeNull();
    const created = await crm.mapLegacyAssignmentSlots(actorAdmin, FX.marketLegacy);
    expect(created).toHaveLength(2);
    expect(created.every((row) => row.assignmentStatus === "offered" && row.stage === "new" && row.notes == null && row.quote == null && row.threadId == null)).toBe(true);
    const view = asMarketplace(await crm.getOwnerProjection(actorOwnerA, FX.bizA, FX.marketLegacy));
    expect(view.assignmentStatus).toBe("offered");
    expect(view.customer).toBeNull();
    const text = dump(view);
    for (const secret of [SECRET.emailLegacy, SECRET.phoneLegacy, SECRET.streetLegacy, SECRET.messageLegacy, SECRET.sharedNotes, SECRET.adminNotes]) {
      expect(text).not.toContain(secret);
    }
    expect(view.request.publicLocation).toBe("Exampleville");
    expect(view.request.estimatedValue).toBe(4242);

    const preserved = await crm.mapLegacyAssignmentSlots(actorAdmin, FX.marketShared);
    expect(preserved.map((row) => row.businessId)).toEqual([FX.bizC]);
    expect(preserved[0].assignmentStatus).toBe("offered");
    expect(crm.readSnapshot().vendorStates.find((row) => row.id === FX.stateSharedA)?.assignmentStatus).toBe("accepted");
    const c = asMarketplace(await crm.getOwnerProjection(actorOwnerC, FX.bizC, FX.marketShared));
    expect(c.customer).toBeNull();
    expect(dump(c)).not.toContain(SECRET.emailRiley);
    expect(dump(c)).not.toContain(SECRET.vendorANotes);
  });

  it("preserves historical direct leads and does not overlay vendor state on them", async () => {
    const snap = syntheticCrmSnapshot();
    snap.vendorStates.push({
      id: "stray-direct",
      leadId: FX.directA,
      businessId: FX.bizB,
      assignmentStatus: "accepted",
      stage: "lost",
      notes: "STRAY-SHOULD-NOT-REPLACE-DIRECT",
      quote: "stray-quote",
      threadId: null,
      assignedAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    const crm = createMockLeadDirectory(snap);
    // Direct owners may set estimated_value on their own inquiry (same 2:23 PM CST lock).
    const updated = await crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.directA, { stage: "pending", notes: "DIRECT-UPDATED", estimatedValue: 275 });
    expect(updated.kind).toBe("direct");
    if (updated.kind !== "direct") return;
    expect(updated.stage).toBe("pending");
    expect(updated.notes).toBe("DIRECT-UPDATED");
    expect(updated.customer.contactEmail).toBe(SECRET.emailPat);
    const stored = crm.readSnapshot().leads.find((row) => row.id === FX.directA);
    expect(stored?.businessId).toBe(FX.bizA);
    expect(crm.readSnapshot().vendorStates.some((row) => row.leadId === FX.directA && row.businessId === FX.bizA)).toBe(false);
    const b = await crm.listOwnerProjections(actorOwnerB, FX.bizB);
    expect(b.some((lead) => lead.leadId === FX.directA)).toBe(false);
    expect(dump(b)).not.toContain(SECRET.emailPat);
    expect(dump(await crm.listOwnerProjections(actorOwnerA, FX.bizA))).not.toContain("STRAY-SHOULD-NOT-REPLACE-DIRECT");
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.directA, { quote: "not-a-direct-quote" })).rejects.toMatchObject({ code: "forbidden" });
    expect(crm.readSnapshot().leads.find((row) => row.id === FX.directA)?.internalNotes).toBe("DIRECT-UPDATED");

    await crm.deleteDirectLead(actorOwnerA, FX.bizA, FX.directA);
    expect(crm.readSnapshot().leads.some((row) => row.id === FX.directA)).toBe(false);
    expect(crm.readSnapshot().leads.some((row) => row.id === FX.marketShared)).toBe(true);
    await expect(crm.deleteDirectLead(actorOwnerB, FX.bizB, FX.directB)).resolves.toBeUndefined();
  });

  it("lets an admin see every assignment without mixing vendor notes", async () => {
    const crm = directory();
    const admin = await crm.listAdminLeads(actorAdmin);
    const shared = admin.find((lead) => lead.leadId === FX.marketShared);
    expect(shared?.customer.contactEmail).toBe(SECRET.emailRiley);
    expect(shared?.adminNotes).toBe(SECRET.adminNotes);
    expect(shared?.sharedInternalNotes).toBe(SECRET.sharedNotes);
    expect(shared?.sharedStage).toBe("lost");
    const a = shared?.vendorStates.find((state) => state.businessId === FX.bizA);
    const b = shared?.vendorStates.find((state) => state.businessId === FX.bizB);
    expect(a?.notes).toBe(SECRET.vendorANotes);
    expect(b?.notes).toBe(SECRET.vendorBNotes);
    expect(a?.messages.map((message) => message.body)).toEqual([SECRET.customerToA, SECRET.vendorAThread]);
    expect(b?.messages.map((message) => message.body)).toEqual([SECRET.vendorBThread]);
    expect(shared?.unscopedMessages.map((message) => message.body)).toEqual([SECRET.sharedThread]);
    expect(dump(a)).not.toContain(SECRET.vendorBNotes);
    const revoked = admin.find((lead) => lead.leadId === FX.marketRevoked);
    expect(revoked?.vendorStates[0]?.notes).toBe(SECRET.vendorARevokedNote);
    expect(revoked?.vendorStates[0]?.messages.map((message) => message.body)).toContain(SECRET.customerThreadJordan);
    const direct = admin.find((lead) => lead.leadId === FX.directA);
    expect(direct?.directCrm).toEqual({ stage: "contacted", notes: SECRET.directANotes, estimatedValue: 250 });
    expect(direct?.vendorStates).toEqual([]);
    await expect(crm.listAdminLeads(actorOwnerA)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("gives anonymous users a submit receipt and no lead read", async () => {
    const crm = directory();
    await expect(crm.listOwnerProjections(actorAnonymous, FX.bizA)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(crm.getOwnerProjection(actorAnonymous, FX.bizA, FX.marketShared)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(crm.listAdminLeads(actorAnonymous)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(crm.listThread(actorAnonymous, FX.bizA, FX.directA)).rejects.toMatchObject({ code: "unauthenticated" });

    const receipt = await crm.submitMarketplace(actorAnonymous, {
      contactName: "Anon Example",
      contactEmail: "anon.submitter@fxm-synthetic.test",
      contactPhone: "PHONE-ANON",
      cityOrVenue: "Exampleville",
      streetAddress: "STREET-ANON",
      message: "PII-MESSAGE-ANON",
      eventType: "Other",
      eventDate: "2026-12-20",
      guestCount: "10",
    });
    expect(receipt).toEqual({ saved: true, id: expect.any(String) });
    expect(Object.keys(receipt).sort()).toEqual(["id", "saved"]);
    expect(dump(receipt)).not.toContain("anon.submitter@fxm-synthetic.test");
    await expect(crm.getOwnerProjection(actorAnonymous, FX.bizA, receipt.id)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(crm.listOwnerProjections(actorAnonymous, FX.bizA)).rejects.toMatchObject({ code: "unauthenticated" });
    const stored = crm.readSnapshot().leads.find((row) => row.id === receipt.id);
    expect(stored?.businessId).toBeNull();
    expect(crm.readSnapshot().vendorStates.some((row) => row.leadId === receipt.id)).toBe(false);
    const admin = await crm.listAdminLeads(actorAdmin);
    expect(admin.find((lead) => lead.leadId === receipt.id)?.customer.contactEmail).toBe("anon.submitter@fxm-synthetic.test");

    const direct = await crm.submitDirect(actorAnonymous, {
      businessId: FX.bizA,
      contactName: "Anon Direct",
      contactEmail: "anon.direct@fxm-synthetic.test",
      message: "PII-MESSAGE-DIRECT-ANON",
    });
    expect(Object.keys(direct).sort()).toEqual(["id", "saved"]);
    await expect(crm.getOwnerProjection(actorAnonymous, FX.bizA, direct.id)).rejects.toMatchObject({ code: "unauthenticated" });
    const owned = await crm.getOwnerProjection(actorOwnerA, FX.bizA, direct.id);
    expect(owned?.kind).toBe("direct");
    expect(crm.readSnapshot().leads.find((row) => row.id === direct.id)?.businessId).toBe(FX.bizA);
    expect(crm.readSnapshot().vendorStates.some((row) => row.leadId === direct.id)).toBe(false);

    try {
      await crm.listOwnerProjections(actorAnonymous, FX.bizA);
    } catch (error) {
      expect(error).toBeInstanceOf(LeadAccessError);
      expect((error as Error).message).not.toContain("riley.sample");
      expect((error as Error).message).not.toContain(SECRET.vendorANotes);
    }
  });
});
