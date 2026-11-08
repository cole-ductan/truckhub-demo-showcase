import type { Actor, AdminActor, BusinessId, CrmSnapshot, LeadRecord, OwnerActor, ProfileId, SystemActor, VendorLeadState } from "./types";

/** Synthetic ids and secrets. These are not production customers. */
export const FX = {
  ownerA: "11111111-1111-4111-a111-111111111111",
  ownerB: "22222222-2222-4222-a222-222222222222",
  ownerC: "33333333-3333-4333-a333-333333333333",
  admin: "99999999-9999-4999-a999-999999999999",
  bizA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  bizB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  bizC: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  directA: "d1111111-1111-4111-8111-111111111111",
  directB: "d2222222-2222-4222-8222-222222222222",
  directC: "d3333333-3333-4333-8333-333333333333",
  marketShared: "m1111111-1111-4111-8111-111111111111",
  marketOffered: "m2222222-2222-4222-8222-222222222222",
  marketRevoked: "m3333333-3333-4333-8333-333333333333",
  marketExpired: "m4444444-4444-4444-8444-444444444444",
  marketOpen: "m5555555-5555-4555-8555-555555555555",
  marketLegacy: "m6666666-6666-4666-8666-666666666666",
  stateSharedA: "5a111111-1111-4111-8111-111111111111",
  stateSharedB: "5b111111-1111-4111-8111-111111111111",
  stateOfferedA: "5a222222-2222-4222-8222-222222222222",
  stateOfferedB: "5b222222-2222-4222-8222-222222222222",
  stateRevokedA: "5a333333-3333-4333-8333-333333333333",
  stateExpiredA: "5a444444-4444-4444-8444-444444444444",
  stateOpenA: "5a555555-5555-4555-8555-555555555555",
  threadSharedA: "7a111111-1111-4111-8111-111111111111",
  threadSharedB: "7b111111-1111-4111-8111-111111111111",
  threadRevokedA: "7a333333-3333-4333-8333-333333333333",
  threadExpiredA: "7a444444-4444-4444-8444-444444444444",
  threadOpenA: "7a555555-5555-4555-8555-555555555555",
} as const;

export const SECRET = {
  sharedNotes: "SHARED-NOTES-MUST-NOT-LEAK",
  adminNotes: "ADMIN-NOTES-MUST-NOT-LEAK",
  sharedThread: "SHARED-THREAD-MUST-NOT-LEAK",
  vendorANotes: "VENDOR-A-PRIVATE-PRETZEL-NOTE",
  vendorAQuote: "VENDOR-A-QUOTE-480",
  vendorAThread: "VENDOR-A-THREAD-ONLY",
  customerToA: "CUSTOMER-TO-A-ONLY",
  vendorBNotes: "VENDOR-B-PRIVATE-CITRUS-NOTE",
  vendorBQuote: "VENDOR-B-QUOTE-510",
  vendorBThread: "VENDOR-B-THREAD-ONLY",
  vendorARevokedNote: "VENDOR-A-REVOKED-NOTE",
  vendorARevokedQuote: "VENDOR-A-REVOKED-QUOTE",
  vendorARevokedThread: "VENDOR-A-REVOKED-THREAD",
  customerThreadJordan: "CUSTOMER-THREAD-JORDAN",
  vendorAExpiredNote: "VENDOR-A-EXPIRED-NOTE",
  customerThreadGray: "CUSTOMER-THREAD-GRAY",
  vendorAReassignNote: "VENDOR-A-REASSIGN-NOTE",
  directANotes: "DIRECT-A-NOTES",
  directBNotes: "DIRECT-B-NOTES",
  directCNotes: "DIRECT-C-NOTES",
  directAThread: "DIRECT-A-THREAD",
  messageRiley: "PII-MESSAGE-RILEY",
  messageCasey: "PII-MESSAGE-CASEY",
  messageJordan: "PII-MESSAGE-JORDAN",
  messageGray: "PII-MESSAGE-GRAY",
  messageDrew: "PII-MESSAGE-DREW",
  messageLegacy: "PII-MESSAGE-LEGACY",
  messagePat: "PII-MESSAGE-PAT",
  streetRiley: "STREET-RILEY",
  streetCasey: "STREET-CASEY",
  streetJordan: "STREET-JORDAN",
  streetGray: "STREET-GRAY",
  streetDrew: "STREET-DREW",
  streetLegacy: "STREET-LEGACY",
  streetPat: "STREET-PAT",
  phoneRiley: "PHONE-RILEY",
  phoneCasey: "PHONE-CASEY",
  phoneJordan: "PHONE-JORDAN",
  phoneGray: "PHONE-GRAY",
  phoneDrew: "PHONE-DREW",
  phoneLegacy: "PHONE-LEGACY",
  phonePat: "PHONE-PAT",
  phoneQuinn: "PHONE-QUINN",
  phoneSky: "PHONE-SKY",
  zipRiley: "ZIP-RILEY",
  zipCasey: "ZIP-CASEY",
  zipJordan: "ZIP-JORDAN",
  zipGray: "ZIP-GRAY",
  zipDrew: "ZIP-DREW",
  zipLegacy: "ZIP-LEGACY",
  emailRiley: "riley.sample@example.test",
  emailCasey: "casey.sample@example.test",
  emailJordan: "jordan.sample@example.test",
  emailGray: "gray.sample@example.test",
  emailDrew: "drew.sample@example.test",
  emailLegacy: "legacy.person@example.test",
  emailPat: "pat.example@example.test",
  emailQuinn: "quinn.example@example.test",
  emailSky: "sky.example@example.test",
} as const;

export const actorOwnerA: OwnerActor = { kind: "owner", userId: FX.ownerA, businessIds: [FX.bizA] };
export const actorOwnerB: OwnerActor = { kind: "owner", userId: FX.ownerB, businessIds: [FX.bizB] };
export const actorOwnerC: OwnerActor = { kind: "owner", userId: FX.ownerC, businessIds: [FX.bizC] };
export const actorAdmin: AdminActor = { kind: "admin", userId: FX.admin };
export const actorAnonymous: Actor = { kind: "anonymous" };
export const actorSystem: SystemActor = { kind: "system", job: "expire-offers" };

type LeadSeed = {
  id: string;
  businessId: BusinessId | null;
  leadType: string;
  stage: LeadRecord["stage"];
  internalNotes: string | null;
  estimatedValue: number | null;
  assignedVendorIds: BusinessId[];
  source: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  eventType: string | null;
  eventDate: string | null;
  start: string | null;
  end: string | null;
  guests: string | null;
  budgetRange: string | null;
  createdAt: string;
};

function lead(seed: LeadSeed): LeadRecord {
  return {
    id: seed.id,
    businessId: seed.businessId,
    leadType: seed.leadType,
    stage: seed.stage,
    internalNotes: seed.internalNotes,
    estimatedValue: seed.estimatedValue,
    adminNotes: SECRET.adminNotes,
    assignedVendorIds: [...seed.assignedVendorIds],
    distributionStatus: seed.businessId == null ? "matched" : null,
    source: seed.source,
    customer: {
      contactName: seed.name,
      contactEmail: seed.email,
      contactPhone: seed.phone,
      message: seed.message,
      streetAddress: seed.street,
      postalCode: seed.zip,
    },
    cityOrVenue: seed.city,
    eventType: seed.eventType,
    requestType: seed.businessId == null ? "multiple" : null,
    eventDate: seed.eventDate,
    eventStartTime: seed.start,
    eventEndTime: seed.end,
    guestCount: seed.guests,
    cuisinePreference: seed.businessId == null ? "pretzels" : null,
    budgetRange: seed.budgetRange,
    serviceStyle: seed.businessId == null ? "either" : null,
    eventFrequency: seed.businessId == null ? "one_time" : null,
    createdAt: seed.createdAt,
    updatedAt: seed.createdAt,
  };
}

function state(partial: VendorLeadState): VendorLeadState {
  return partial;
}

const BASE = "2026-10-";

function build(): CrmSnapshot {
  const leads: LeadRecord[] = [
    lead({
      id: FX.directA, businessId: FX.bizA, leadType: "vendor_direct", stage: "contacted",
      internalNotes: SECRET.directANotes, estimatedValue: 250, assignedVendorIds: [],
      source: "public_form", name: "Pat Example", email: SECRET.emailPat, phone: SECRET.phonePat,
      message: SECRET.messagePat, street: SECRET.streetPat, zip: null, city: "Exampleville",
      eventType: "Birthday", eventDate: "2026-11-02", start: null, end: null, guests: "30",
      budgetRange: null, createdAt: `${BASE}01T15:00:00.000Z`,
    }),
    lead({
      id: FX.directB, businessId: FX.bizB, leadType: "vendor_direct", stage: "new",
      internalNotes: SECRET.directBNotes, estimatedValue: null, assignedVendorIds: [],
      source: "public_form", name: "Quinn Example", email: SECRET.emailQuinn, phone: SECRET.phoneQuinn,
      message: "Direct fixture for citrus truck", street: null, zip: null, city: null,
      eventType: "Corporate lunch", eventDate: "2026-11-03", start: null, end: null, guests: "12",
      budgetRange: null, createdAt: `${BASE}02T15:00:00.000Z`,
    }),
    lead({
      id: FX.directC, businessId: FX.bizC, leadType: "vendor_direct", stage: "new",
      internalNotes: SECRET.directCNotes, estimatedValue: null, assignedVendorIds: [],
      source: "public_form", name: "Sky Example", email: SECRET.emailSky, phone: SECRET.phoneSky,
      message: "Direct fixture for unassigned cart", street: null, zip: null, city: null,
      eventType: "School event", eventDate: "2026-11-04", start: null, end: null, guests: "40",
      budgetRange: null, createdAt: `${BASE}03T15:00:00.000Z`,
    }),
    lead({
      id: FX.marketShared, businessId: null, leadType: "event_inquiry", stage: "lost",
      internalNotes: SECRET.sharedNotes, estimatedValue: 1800, assignedVendorIds: [FX.bizA, FX.bizB, FX.bizC],
      source: "Book a Food Truck", name: "Riley Sample", email: SECRET.emailRiley, phone: SECRET.phoneRiley,
      message: SECRET.messageRiley, street: SECRET.streetRiley, zip: SECRET.zipRiley, city: "Exampleville",
      eventType: "Wedding", eventDate: "2026-12-06", start: "16:00", end: "20:00", guests: "120",
      budgetRange: "$1,500–$3,000", createdAt: `${BASE}15T15:00:00.000Z`,
    }),
    lead({
      id: FX.marketOffered, businessId: null, leadType: "event_inquiry", stage: "lost",
      internalNotes: SECRET.sharedNotes, estimatedValue: 600, assignedVendorIds: [FX.bizA],
      source: "Book a Food Truck", name: "Casey Sample", email: SECRET.emailCasey, phone: SECRET.phoneCasey,
      message: SECRET.messageCasey, street: SECRET.streetCasey, zip: SECRET.zipCasey, city: "Exampleville Civic Green",
      eventType: "Graduation", eventDate: "2026-12-01", start: "11:00", end: "14:00", guests: "40",
      budgetRange: "Under $500", createdAt: `${BASE}20T15:00:00.000Z`,
    }),
    lead({
      id: FX.marketRevoked, businessId: null, leadType: "event_inquiry", stage: "lost",
      internalNotes: SECRET.sharedNotes, estimatedValue: 900, assignedVendorIds: [],
      source: "Book a Food Truck", name: "Jordan Sample", email: SECRET.emailJordan, phone: SECRET.phoneJordan,
      message: SECRET.messageJordan, street: SECRET.streetJordan, zip: SECRET.zipJordan, city: "Exampleville",
      eventType: "Corporate event", eventDate: "2026-12-09", start: "10:00", end: "13:00", guests: "60",
      budgetRange: "$500–$1,500", createdAt: `${BASE}21T15:00:00.000Z`,
    }),
    lead({
      id: FX.marketExpired, businessId: null, leadType: "event_inquiry", stage: "lost",
      internalNotes: SECRET.sharedNotes, estimatedValue: 700, assignedVendorIds: [],
      source: "Book a Food Truck", name: "Gray Sample", email: SECRET.emailGray, phone: SECRET.phoneGray,
      message: SECRET.messageGray, street: SECRET.streetGray, zip: SECRET.zipGray, city: "Exampleville",
      eventType: "Fundraiser", eventDate: "2026-12-12", start: "09:00", end: "12:00", guests: "80",
      budgetRange: "$500–$1,500", createdAt: `${BASE}22T15:00:00.000Z`,
    }),
    lead({
      id: FX.marketOpen, businessId: null, leadType: "event_inquiry", stage: "completed",
      internalNotes: SECRET.sharedNotes, estimatedValue: 1100, assignedVendorIds: [FX.bizA],
      source: "Book a Food Truck", name: "Drew Sample", email: SECRET.emailDrew, phone: SECRET.phoneDrew,
      message: SECRET.messageDrew, street: SECRET.streetDrew, zip: SECRET.zipDrew, city: "Exampleville",
      eventType: "Community event", eventDate: "2026-12-18", start: "12:00", end: "15:00", guests: "90",
      budgetRange: "$1,500–$3,000", createdAt: `${BASE}23T15:00:00.000Z`,
    }),
    lead({
      id: FX.marketLegacy, businessId: null, leadType: "event_inquiry", stage: "new",
      internalNotes: SECRET.sharedNotes, estimatedValue: 4242, assignedVendorIds: [FX.bizA, FX.bizB],
      source: "Book a Food Truck", name: "Legacy Person", email: SECRET.emailLegacy, phone: SECRET.phoneLegacy,
      message: SECRET.messageLegacy, street: SECRET.streetLegacy, zip: SECRET.zipLegacy, city: "Exampleville",
      eventType: "Festival", eventDate: "2026-12-19", start: "15:00", end: "18:00", guests: "200",
      budgetRange: "$3,000–$6,000", createdAt: `${BASE}24T15:00:00.000Z`,
    }),
  ];

  const vendorStates: VendorLeadState[] = [
    state({
      id: FX.stateSharedA, leadId: FX.marketShared, businessId: FX.bizA, assignmentStatus: "accepted",
      stage: "quote_sent", notes: SECRET.vendorANotes, quote: SECRET.vendorAQuote, threadId: FX.threadSharedA,
      assignedAt: `${BASE}15T16:00:00.000Z`, updatedAt: `${BASE}16T16:00:00.000Z`,
    }),
    state({
      id: FX.stateSharedB, leadId: FX.marketShared, businessId: FX.bizB, assignmentStatus: "accepted",
      stage: "contacted", notes: SECRET.vendorBNotes, quote: SECRET.vendorBQuote, threadId: FX.threadSharedB,
      assignedAt: `${BASE}15T16:05:00.000Z`, updatedAt: `${BASE}16T17:00:00.000Z`,
    }),
    state({
      id: FX.stateOfferedA, leadId: FX.marketOffered, businessId: FX.bizA, assignmentStatus: "offered",
      stage: "new", notes: null, quote: null, threadId: null,
      assignedAt: `${BASE}20T16:00:00.000Z`, updatedAt: `${BASE}20T16:00:00.000Z`,
    }),
    state({
      id: FX.stateOfferedB, leadId: FX.marketOffered, businessId: FX.bizB, assignmentStatus: "declined",
      stage: "new", notes: null, quote: null, threadId: null,
      assignedAt: `${BASE}20T16:05:00.000Z`, updatedAt: `${BASE}20T18:00:00.000Z`,
    }),
    state({
      id: FX.stateRevokedA, leadId: FX.marketRevoked, businessId: FX.bizA, assignmentStatus: "revoked",
      stage: "quote_sent", notes: SECRET.vendorARevokedNote, quote: SECRET.vendorARevokedQuote, threadId: FX.threadRevokedA,
      assignedAt: `${BASE}21T16:00:00.000Z`, updatedAt: `${BASE}21T19:00:00.000Z`,
    }),
    state({
      id: FX.stateExpiredA, leadId: FX.marketExpired, businessId: FX.bizA, assignmentStatus: "expired",
      stage: "pending", notes: SECRET.vendorAExpiredNote, quote: null, threadId: FX.threadExpiredA,
      assignedAt: `${BASE}22T16:00:00.000Z`, updatedAt: `${BASE}22T19:00:00.000Z`,
    }),
    state({
      id: FX.stateOpenA, leadId: FX.marketOpen, businessId: FX.bizA, assignmentStatus: "accepted",
      stage: "booked", notes: SECRET.vendorAReassignNote, quote: "VENDOR-A-REASSIGN-QUOTE", threadId: FX.threadOpenA,
      assignedAt: `${BASE}23T16:00:00.000Z`, updatedAt: `${BASE}23T18:00:00.000Z`,
    }),
  ];

  return {
    leads,
    vendorStates,
    messages: [
      { id: "msg-direct-a", threadId: `direct:${FX.directA}`, leadId: FX.directA, businessId: FX.bizA, senderRole: "owner", senderUserId: FX.ownerA as ProfileId, body: SECRET.directAThread, createdAt: `${BASE}01T18:00:00.000Z` },
      { id: "msg-shared-a-customer", threadId: FX.threadSharedA, leadId: FX.marketShared, businessId: FX.bizA, senderRole: "customer", senderUserId: null, body: SECRET.customerToA, createdAt: `${BASE}16T18:00:00.000Z` },
      { id: "msg-shared-a", threadId: FX.threadSharedA, leadId: FX.marketShared, businessId: FX.bizA, senderRole: "owner", senderUserId: FX.ownerA as ProfileId, body: SECRET.vendorAThread, createdAt: `${BASE}16T19:00:00.000Z` },
      { id: "msg-shared-b", threadId: FX.threadSharedB, leadId: FX.marketShared, businessId: FX.bizB, senderRole: "owner", senderUserId: FX.ownerB as ProfileId, body: SECRET.vendorBThread, createdAt: `${BASE}16T19:30:00.000Z` },
      { id: "msg-shared-unscoped", threadId: "thread-unscoped", leadId: FX.marketShared, businessId: null, senderRole: "customer", senderUserId: null, body: SECRET.sharedThread, createdAt: `${BASE}16T12:00:00.000Z` },
      { id: "msg-revoked-customer", threadId: FX.threadRevokedA, leadId: FX.marketRevoked, businessId: FX.bizA, senderRole: "customer", senderUserId: null, body: SECRET.customerThreadJordan, createdAt: `${BASE}21T18:00:00.000Z` },
      { id: "msg-revoked-owner", threadId: FX.threadRevokedA, leadId: FX.marketRevoked, businessId: FX.bizA, senderRole: "owner", senderUserId: FX.ownerA as ProfileId, body: SECRET.vendorARevokedThread, createdAt: `${BASE}21T18:30:00.000Z` },
      { id: "msg-expired-customer", threadId: FX.threadExpiredA, leadId: FX.marketExpired, businessId: FX.bizA, senderRole: "customer", senderUserId: null, body: SECRET.customerThreadGray, createdAt: `${BASE}22T18:00:00.000Z` },
      { id: "msg-open-a", threadId: FX.threadOpenA, leadId: FX.marketOpen, businessId: FX.bizA, senderRole: "owner", senderUserId: FX.ownerA as ProfileId, body: "VENDOR-A-OPEN-THREAD", createdAt: `${BASE}23T18:30:00.000Z` },
    ],
    assignmentEvents: [],
  };
}

export function syntheticCrmSnapshot(): CrmSnapshot {
  return structuredClone(build());
}
