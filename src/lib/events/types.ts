/**
 * Lane B public market / event contract.
 *
 * Director-owned schema contract, 2026-11-08. These types are the application
 * contract only. They are not a database migration, and they do not replace
 * `businesses`, `business_events`, `saved_locations`, `leads`, or `bookings`.
 *
 * Lane A CRM types (assignments, vendor lead stage, direct/marketplace lead
 * projections) are intentionally absent from this module.
 */

export const CHICAGO_TIMEZONE = "America/Chicago" as const;

export type ChicagoTimezone = typeof CHICAGO_TIMEZONE;

export type Venue = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  timezone: ChicagoTimezone;
};

export type MarketOrOrganizer = {
  id: string;
  /** Stable public slug for /markets/:slug. Stored. Not derived from the name at render time. */
  slug: string;
  name: string;
  kind: "market" | "organizer" | "venue_series";
  venueId: string | null;
  publicSourceUrl: string | null;
};

export type EventSeries = {
  id: string;
  /** Stable public slug for /events/:slug. Stored. Not derived from the title at render time. */
  slug: string;
  title: string;
  organizerId: string | null;
  venueId: string | null;
  category: string | null;
  /** Human note. Never an inferred recurrence expander. */
  recurrenceNotes: string | null;
};

export type OccurrencePublicationState =
  | "draft_unverified"
  | "needs_review"
  | "published"
  | "cancelled"
  | "unpublished";

export type EventOccurrence = {
  id: string;
  /**
   * Unique within its series. Stored. Prefer the Chicago calendar date
   * (`2026-11-19`). When two occurrences share a day, the extra slug is
   * stored too (`2026-11-20-late`), not generated while rendering.
   */
  slug: string;
  seriesId: string | null;
  marketId: string | null;
  venueId: string;
  title: string;
  /** ISO local datetime in America/Chicago, or a date with no clock time. No offset. */
  startLocal: string;
  endLocal: string | null;
  timeUnconfirmed: boolean;
  timezone: ChicagoTimezone;
  publicSourceUrl: string;
  verifiedAt: string;
  publicationState: OccurrencePublicationState;
  cancellationState: "active" | "cancelled";
  provenance: string;
};

export type VendorAppearance = {
  id: string;
  occurrenceId: string;
  /** Null when the appearance is only an unclaimed draft name in the fixture. */
  businessId: string | null;
  displayName: string;
  /** Attendance is never inferred. The literal `true` is required. */
  sourced: true;
  sourceUrl: string;
};

/**
 * Directory facet for public filters. Not a second event model.
 * Food and beverage stay distinct so the "food/beverage" browse can filter either.
 */
export type DiscoveryCategory = "all" | "maker" | "food" | "beverage" | "truck";

/**
 * Explicit fixture flag. Pages must read this value and must not invent a
 * live freshness check from the clock or from `verifiedAt`.
 */
export type SourceFreshnessFlag = "fresh" | "aging" | "stale";

/**
 * Directory row for /vendors. Not a second profile and not a Lane A lead.
 * `profileSlug` is the stored /food-trucks/:slug used when `businessId` is set.
 * It is null for unclaimed drafts. Never derive it from `displayName`.
 * `listingOrigin` is a fixture flag, not a live claim lookup.
 */
export type SyntheticVendorListing = {
  businessId: string | null;
  profileSlug: string | null;
  displayName: string;
  category: Exclude<DiscoveryCategory, "all">;
  city: string;
  listingOrigin: "claimed" | "imported";
  summary: string;
};

/**
 * Editorial fixture for a disagreement the catalog refuses to resolve.
 * Reports stay side by side. Nothing in this type selects a winning address or time.
 */
export type UnresolvedSourceConflict = {
  id: string;
  occurrenceId: string;
  topic: string;
  status: "unresolved";
  reports: Array<{
    id: string;
    sourceLabel: string;
    summary: string;
    sourceUrl: string;
  }>;
};

export type PublicEventCatalog = {
  label: "synthetic-demo";
  disclaimer: string;
  venues: Venue[];
  markets: MarketOrOrganizer[];
  series: EventSeries[];
  occurrences: EventOccurrence[];
  appearances: VendorAppearance[];
  vendors: SyntheticVendorListing[];
  freshness: Record<string, SourceFreshnessFlag>;
  conflicts: UnresolvedSourceConflict[];
};
