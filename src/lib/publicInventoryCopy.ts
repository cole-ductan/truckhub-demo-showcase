/**
 * Public inventory, freshness, and inquiry language (FXM-008).
 *
 * Verified published listing: a business the public directory can read
 * (published and not archived, which row-level security already enforces)
 * with is_demo = false. That classification is not a live GPS fix, not a
 * freshness timestamp, and not proof the business is operating today.
 *
 * Demo listing: is_demo = true. Sample content. Do not describe it as a
 * real operating food truck.
 *
 * Do not hardcode a directory total. A 2026-11-08 read-only audit counted
 * 9 businesses, 7 published, 6 of those published demo, and 1 published
 * non-demo. Those figures are a snapshot for tests and review, not copy
 * to paste into the UI. Render counts from the definitions above, or show
 * that the count could not be loaded.
 *
 * Google Calendar sync is not a confirmed product capability and must not
 * be advertised. A saved or routed inquiry is not an email or text delivery.
 */

export type PublicInventoryCounts = {
  verifiedPublished: number | null;
  demoPublished: number | null;
  unavailable: boolean;
};

export const INVENTORY_KIND = {
  demo: {
    label: "Demo",
    detail: "Sample listing. Not a confirmed operating business.",
  },
  verified: {
    label: "Verified",
    detail:
      "Published listing that is not marked demo. Saved location and hours are not a live check-in.",
  },
} as const;

export const EVENT_KIND = {
  demo: {
    label: "Demo",
    detail: "Sample event. Not a confirmed occurrence.",
  },
  verified: {
    label: "Verified",
    detail: "Public event that is not marked demo. Saved time and place are not a live update.",
  },
} as const;

export type ListedStatus = "open" | "soon" | "closed";

/** Stored listing status. These words must not read as a live check-in. */
export const LISTED_STATUS_LABEL: Record<ListedStatus, string> = {
  open: "Listed as open",
  soon: "Listed as opening later",
  closed: "Listed as closed",
};

export const STATUS_NOT_LIVE_NOTE =
  "Open, later, and closed are the status saved on the listing. They are not a live check-in.";

export const SAVED_LOCATION_NOTE =
  "Locations, hours, and map pins are what the listing has saved. They are not a live location.";

export const DIRECT_INQUIRY_RECEIPT = {
  title: (name: string) => `Request saved for ${name}`,
  body: "Your inquiry is saved on FoodXMobile and routed to this listing. That is not a delivery receipt. We do not confirm that the business received an email or text, and a reply is not guaranteed.",
  formNote: (name: string) =>
    `Saved for ${name} on FoodXMobile. Email or text delivery is not confirmed.`,
  asideNote: "A reply is not guaranteed.",
};

export const MARKETPLACE_INQUIRY_RECEIPT = {
  title: "Your event request was saved",
  description:
    "Your event request was saved and routed for matching. This page is not a delivery receipt.",
  body: "Your request is saved and routed for matching. This is not a delivery receipt. We do not confirm that a vendor received an email or text, and a response is not guaranteed.",
};

export function formatVerifiedAggregate(counts: PublicInventoryCounts): string {
  if (counts.unavailable || counts.verifiedPublished == null || counts.demoPublished == null) {
    return "Listing counts could not be loaded. No estimated total is shown.";
  }

  const verifiedLabel =
    counts.verifiedPublished === 1 ? "verified published listing" : "verified published listings";
  const demoLabel = counts.demoPublished === 1 ? "sample demo listing" : "sample demo listings";

  return `${counts.verifiedPublished} ${verifiedLabel} on the public directory. ${counts.demoPublished} ${demoLabel} are shown separately and are not operating-truck totals. Verified means published and not marked demo.`;
}

/** Phrases that overstate inventory, freshness, or delivery. Public UI must not use them. */
export const FORBIDDEN_PUBLIC_PHRASES = [
  "28+",
  "28+ trucks",
  "Updated continuously",
  "Updated daily",
  "Browse live locations",
  "Live directory",
  "Live local map",
  "Live page",
  "We sent your request directly",
  "Inquiry sent",
  "Goes directly",
  "reply within 24 hours",
  "Replies typically within 24",
  "sends straight to your inbox",
  "Sent straight to your phone",
  "truckhubgb.com",
  "Google Calendar",
  "Serving now",
  "Open now",
  "2,400",
  "Live map pin updated",
  "Customers can now see your current location",
] as const;

export function findForbiddenPhrases(
  text: string,
  phrases: readonly string[] = FORBIDDEN_PUBLIC_PHRASES,
): string[] {
  const haystack = text.toLowerCase();
  return phrases.filter((phrase) => haystack.includes(phrase.toLowerCase()));
}

export const PUBLIC_COPY_FILES = [
  "index.html",
  "src/pages/Index.tsx",
  "src/pages/SmokeTrail.tsx",
  "src/pages/FoodTrucks.tsx",
  "src/pages/TruckProfile.tsx",
  "src/pages/Book.tsx",
  "src/pages/BookFoodTruck.tsx",
  "src/pages/BookRequestReceived.tsx",
  "src/pages/ClaimListing.tsx",
  "src/pages/PublicCalendar.tsx",
  "src/pages/owner/OwnerMapLocations.tsx",
  "src/pages/owner/OwnerProfile.tsx",
  "src/components/demo/tourSteps.ts",
  "src/components/site/BrowseCategories.tsx",
  "src/components/site/DemoBanner.tsx",
  "src/components/site/EventsThisWeek.tsx",
  "src/components/site/LiveDiscoveryMap.tsx",
  "src/components/site/PlanningEventCTA.tsx",
  "src/components/site/SiteFooter.tsx",
  "src/components/site/SiteHeader.tsx",
  "src/components/site/TodaysFoodTrucks.tsx",
  "src/components/site/InventoryKindBadge.tsx",
] as const;
