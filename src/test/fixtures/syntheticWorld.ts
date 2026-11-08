import type { Actor, FixtureLead } from "@/lib/qa/access";
import type { ScopeBusiness } from "@/lib/qa/inventoryScopes";

export const SYNTHETIC_ACTORS = {
  anonymous: { role: "anonymous" } satisfies Actor,
  admin: { role: "admin", userId: "synth-admin" } satisfies Actor,
  ownerA: { role: "owner", userId: "synth-owner-a", businessId: "synth-biz-north-pier" } satisfies Actor,
  ownerB: { role: "owner", userId: "synth-owner-b", businessId: "synth-biz-fox-lantern" } satisfies Actor,
  ownerDeclined: { role: "owner", userId: "synth-owner-declined", businessId: "synth-biz-declined-cart" } satisfies Actor,
  ownerRevoked: { role: "owner", userId: "synth-owner-revoked", businessId: "synth-biz-revoked-cart" } satisfies Actor,
  suspendedOwner: {
    role: "owner",
    userId: "synth-owner-suspended",
    businessId: "synth-biz-north-pier",
    suspended: true,
  } satisfies Actor,
};

export const syntheticBusinesses: ScopeBusiness[] = [
  {
    id: "synth-biz-north-pier",
    isDemo: false,
    isPublished: true,
    listingStatus: "claimed_free",
    outreachStatus: "claimed",
  },
  {
    id: "synth-biz-fox-lantern",
    isDemo: false,
    isPublished: true,
    listingStatus: "claimed_free",
    outreachStatus: "claimed",
  },
  {
    id: "synth-biz-unmatched-cart",
    isDemo: true,
    isPublished: true,
    listingStatus: "unclaimed",
    outreachStatus: "not_contacted",
  },
  {
    id: "synth-biz-draft-stand",
    isDemo: false,
    isPublished: false,
    listingStatus: "draft",
    outreachStatus: null,
  },
  {
    id: "synth-biz-ready-truck",
    isDemo: true,
    isPublished: false,
    listingStatus: "unclaimed",
    outreachStatus: "ready_to_contact",
  },
  {
    id: "synth-biz-archived-stand",
    isDemo: true,
    isPublished: false,
    listingStatus: "archived",
    outreachStatus: "not_contacted",
  },
  {
    id: "synth-biz-declined-cart",
    isDemo: false,
    isPublished: true,
    listingStatus: "claimed_free",
    outreachStatus: "claimed",
  },
  {
    id: "synth-biz-revoked-cart",
    isDemo: false,
    isPublished: true,
    listingStatus: "claimed_free",
    outreachStatus: "claimed",
  },
];

export const syntheticLeads: FixtureLead[] = [
  {
    id: "synth-lead-direct-a",
    businessId: "synth-biz-north-pier",
    contactName: "Ada Fixture",
    contactEmail: "ada.customer@fxm-synthetic.test",
    stage: "booked",
    internalNotes: "North Pier private note",
    assignments: [],
  },
  {
    id: "synth-lead-direct-b",
    businessId: "synth-biz-fox-lantern",
    contactName: "Ben Fixture",
    contactEmail: "ben.customer@fxm-synthetic.test",
    stage: "new",
    internalNotes: "Fox Lantern private note",
    assignments: [],
  },
  {
    id: "synth-lead-marketplace",
    businessId: null,
    contactName: "Casey Fixture",
    contactEmail: "casey.marketplace@fxm-synthetic.test",
    stage: "new",
    internalNotes: null,
    assignments: [
      {
        businessId: "synth-biz-north-pier",
        status: "accepted",
        notes: "North Pier quote note",
      },
      {
        businessId: "synth-biz-fox-lantern",
        status: "accepted",
        notes: "Fox Lantern quote note",
      },
      {
        businessId: "synth-biz-declined-cart",
        status: "declined",
        notes: "Declined vendor private note",
      },
      {
        businessId: "synth-biz-revoked-cart",
        status: "revoked",
        notes: "Revoked vendor private note",
      },
    ],
  },
];

export const syntheticWorld = {
  source: "synthetic" as const,
  importable: true as const,
  label: "Two accepted owners on one marketplace lead, plus declined, revoked, and unmatched vendors.",
  businesses: syntheticBusinesses,
  leads: syntheticLeads.map((lead) => ({
    id: lead.id,
    businessId: lead.businessId,
    stage: lead.stage,
  })),
  bookings: [] as { id: string }[],
  eventImportQueue: [
    { id: "synth-import-1", reviewStatus: "pending_review" },
    { id: "synth-import-2", reviewStatus: "pending_review" },
    { id: "synth-import-3", reviewStatus: "pending_review" },
  ],
};

export const syntheticContacts = [
  "ada.customer@fxm-synthetic.test",
  "ben.customer@fxm-synthetic.test",
  "casey.marketplace@fxm-synthetic.test",
  "owner.a@fxm-synthetic.test",
  "owner.b@fxm-synthetic.test",
  "admin@fxm-synthetic.test",
  "declined.owner@fxm-synthetic.test",
  "revoked.owner@fxm-synthetic.test",
];
