import { chicagoDateKey, formatChicagoDateLabel, formatChicagoTimeRange, formatChicagoTimestamp } from "./chicagoTime";
import type {
  DiscoveryCategory,
  EventOccurrence,
  EventSeries,
  MarketOrOrganizer,
  PublicEventCatalog,
  SourceFreshnessFlag,
  SyntheticVendorListing,
  UnresolvedSourceConflict,
  VendorAppearance,
  Venue,
} from "./types";

export type DiscoveryFilters = {
  category: DiscoveryCategory;
  city: string;
  /** Stored market or organizer slug, or "all". */
  marketSlug: string;
  /** Chicago calendar date `YYYY-MM-DD`, or empty. */
  date: string;
};

export const EMPTY_FILTERS: DiscoveryFilters = {
  category: "all",
  city: "all",
  marketSlug: "all",
  date: "",
};

const FACETS = new Set<DiscoveryCategory>(["all", "maker", "food", "beverage", "truck"]);

const SERIES_FACET: Record<string, Exclude<DiscoveryCategory, "all">> = {
  "maker-market": "maker",
  maker: "maker",
  food: "food",
  beverage: "beverage",
  "truck-popup": "truck",
  truck: "truck",
};

export function readDiscoveryFilters(params: URLSearchParams): DiscoveryFilters {
  const raw = params.get("category");
  const category = raw && FACETS.has(raw as DiscoveryCategory) ? (raw as DiscoveryCategory) : "all";
  const date = params.get("date") ?? "";
  return {
    category,
    city: params.get("city") || "all",
    marketSlug: params.get("market") || "all",
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
  };
}

export function filtersAreActive(filters: DiscoveryFilters): boolean {
  return filters.category !== "all" || filters.city !== "all" || filters.marketSlug !== "all" || filters.date !== "";
}

export type OccurrenceVisibility = "listed" | "review" | "withheld";

export function occurrenceVisibility(occurrence: EventOccurrence): OccurrenceVisibility {
  switch (occurrence.publicationState) {
    case "published":
    case "cancelled":
      return "listed";
    case "needs_review":
      return "review";
    default:
      return "withheld";
  }
}

export type CatalogIndex = {
  venues: Map<string, Venue>;
  markets: Map<string, MarketOrOrganizer>;
  marketsBySlug: Map<string, MarketOrOrganizer>;
  series: Map<string, EventSeries>;
  seriesBySlug: Map<string, EventSeries>;
  occurrences: Map<string, EventOccurrence>;
  vendorsById: Map<string, SyntheticVendorListing>;
  vendorsByName: Map<string, SyntheticVendorListing>;
  appearancesByOccurrence: Map<string, VendorAppearance[]>;
  conflictsByOccurrence: Map<string, UnresolvedSourceConflict>;
};

export function indexCatalog(catalog: PublicEventCatalog): CatalogIndex {
  const appearancesByOccurrence = new Map<string, VendorAppearance[]>();
  for (const appearance of catalog.appearances) {
    const list = appearancesByOccurrence.get(appearance.occurrenceId) ?? [];
    list.push(appearance);
    appearancesByOccurrence.set(appearance.occurrenceId, list);
  }
  const conflictsByOccurrence = new Map<string, UnresolvedSourceConflict>();
  for (const conflict of catalog.conflicts) {
    conflictsByOccurrence.set(conflict.occurrenceId, conflict);
  }
  return {
    venues: new Map(catalog.venues.map((venue) => [venue.id, venue])),
    markets: new Map(catalog.markets.map((market) => [market.id, market])),
    marketsBySlug: new Map(catalog.markets.map((market) => [market.slug, market])),
    series: new Map(catalog.series.map((series) => [series.id, series])),
    seriesBySlug: new Map(catalog.series.map((series) => [series.slug, series])),
    occurrences: new Map(catalog.occurrences.map((occurrence) => [occurrence.id, occurrence])),
    vendorsById: new Map(
      catalog.vendors.flatMap((vendor) => (vendor.businessId ? [[vendor.businessId, vendor] as const] : [])),
    ),
    vendorsByName: new Map(catalog.vendors.map((vendor) => [vendor.displayName, vendor])),
    appearancesByOccurrence,
    conflictsByOccurrence,
  };
}

export type AppearanceModel = {
  appearance: VendorAppearance;
  vendor: SyntheticVendorListing | null;
};

export type OccurrenceModel = {
  occurrence: EventOccurrence;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  verifiedAtLabel: string;
  venue: Venue | null;
  market: MarketOrOrganizer | null;
  series: EventSeries | null;
  organizer: MarketOrOrganizer | null;
  appearances: AppearanceModel[];
  freshness: SourceFreshnessFlag | null;
  conflict: UnresolvedSourceConflict | null;
  visibility: OccurrenceVisibility;
};

export function vendorForAppearance(index: CatalogIndex, appearance: VendorAppearance): SyntheticVendorListing | null {
  if (appearance.businessId) {
    return index.vendorsById.get(appearance.businessId) ?? index.vendorsByName.get(appearance.displayName) ?? null;
  }
  return index.vendorsByName.get(appearance.displayName) ?? null;
}

export function freshnessFor(catalog: PublicEventCatalog, occurrenceId: string): SourceFreshnessFlag | null {
  return catalog.freshness[occurrenceId] ?? null;
}

export function toOccurrenceModel(
  catalog: PublicEventCatalog,
  index: CatalogIndex,
  occurrence: EventOccurrence,
): OccurrenceModel {
  const series = occurrence.seriesId ? index.series.get(occurrence.seriesId) ?? null : null;
  const market = occurrence.marketId ? index.markets.get(occurrence.marketId) ?? null : null;
  const organizer = series?.organizerId ? index.markets.get(series.organizerId) ?? null : null;
  const appearances = (index.appearancesByOccurrence.get(occurrence.id) ?? []).map((appearance) => ({
    appearance,
    vendor: vendorForAppearance(index, appearance),
  }));
  return {
    occurrence,
    dateKey: chicagoDateKey(occurrence.startLocal),
    dateLabel: formatChicagoDateLabel(occurrence.startLocal),
    timeLabel: formatChicagoTimeRange(occurrence),
    verifiedAtLabel: formatChicagoTimestamp(occurrence.verifiedAt),
    venue: index.venues.get(occurrence.venueId) ?? null,
    market,
    series,
    organizer,
    appearances,
    freshness: freshnessFor(catalog, occurrence.id),
    conflict: index.conflictsByOccurrence.get(occurrence.id) ?? null,
    visibility: occurrenceVisibility(occurrence),
  };
}

export function allOccurrenceModels(catalog: PublicEventCatalog): OccurrenceModel[] {
  const index = indexCatalog(catalog);
  return catalog.occurrences
    .map((occurrence) => toOccurrenceModel(catalog, index, occurrence))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.occurrence.title.localeCompare(b.occurrence.title));
}

export function occurrenceMatchesCategory(model: OccurrenceModel, category: DiscoveryCategory): boolean {
  if (category === "all") return true;
  if (model.series?.category && SERIES_FACET[model.series.category] === category) return true;
  return model.appearances.some((item) => item.vendor?.category === category);
}

export function occurrenceMatchesFilters(model: OccurrenceModel, filters: DiscoveryFilters): boolean {
  if (model.visibility !== "listed") return false;
  if (!occurrenceMatchesCategory(model, filters.category)) return false;
  if (filters.city !== "all" && (model.venue?.city ?? "") !== filters.city) return false;
  if (
    filters.marketSlug !== "all" &&
    model.market?.slug !== filters.marketSlug &&
    model.organizer?.slug !== filters.marketSlug
  ) {
    return false;
  }
  if (filters.date && model.dateKey !== filters.date) return false;
  return true;
}

export function listedOccurrences(catalog: PublicEventCatalog, filters: DiscoveryFilters = EMPTY_FILTERS): OccurrenceModel[] {
  return allOccurrenceModels(catalog).filter((model) => occurrenceMatchesFilters(model, filters));
}

function relatedToMarket(model: OccurrenceModel, market: MarketOrOrganizer): boolean {
  if (market.kind === "organizer") return model.organizer?.id === market.id;
  return model.occurrence.marketId === market.id;
}

export function marketMatchesFilters(
  catalog: PublicEventCatalog,
  market: MarketOrOrganizer,
  filters: DiscoveryFilters,
): boolean {
  if (!filtersAreActive(filters)) return true;
  if (filters.marketSlug !== "all" && market.slug !== filters.marketSlug) return false;
  const index = indexCatalog(catalog);
  const venue = market.venueId ? index.venues.get(market.venueId) ?? null : null;
  const related = allOccurrenceModels(catalog).filter((model) => relatedToMarket(model, market));
  const listed = related.filter((model) => model.visibility === "listed");
  if (filters.city !== "all" && venue?.city !== filters.city && !listed.some((model) => model.venue?.city === filters.city)) {
    return false;
  }
  if (filters.date && !listed.some((model) => model.dateKey === filters.date)) return false;
  if (filters.category !== "all" && !listed.some((model) => occurrenceMatchesCategory(model, filters.category))) {
    return false;
  }
  if (filters.marketSlug !== "all") return true;
  if (filters.date || filters.category !== "all") return listed.some((model) => occurrenceMatchesFilters(model, filters));
  return true;
}

export type MarketView = {
  market: MarketOrOrganizer;
  venue: Venue | null;
  listed: OccurrenceModel[];
  review: OccurrenceModel[];
  vendors: SyntheticVendorListing[];
};

export function getMarketView(catalog: PublicEventCatalog, slug: string | undefined): MarketView | null {
  if (!slug) return null;
  const index = indexCatalog(catalog);
  const market = index.marketsBySlug.get(slug);
  if (!market) return null;
  const related = allOccurrenceModels(catalog).filter((model) => relatedToMarket(model, market));
  const listed = related.filter((model) => model.visibility === "listed");
  const vendorNames = new Map<string, SyntheticVendorListing>();
  for (const model of listed) {
    for (const item of model.appearances) {
      if (item.vendor) vendorNames.set(item.vendor.displayName, item.vendor);
    }
  }
  return {
    market,
    venue: market.venueId ? index.venues.get(market.venueId) ?? null : null,
    listed,
    review: related.filter((model) => model.visibility === "review"),
    vendors: Array.from(vendorNames.values()).sort((a, b) => a.displayName.localeCompare(b.displayName)),
  };
}

export type SeriesView = {
  series: EventSeries;
  organizer: MarketOrOrganizer | null;
  venue: Venue | null;
  listed: OccurrenceModel[];
  review: OccurrenceModel[];
};

export function getSeriesView(catalog: PublicEventCatalog, slug: string | undefined): SeriesView | null {
  if (!slug) return null;
  const index = indexCatalog(catalog);
  const series = index.seriesBySlug.get(slug);
  if (!series) return null;
  const related = allOccurrenceModels(catalog).filter((model) => model.occurrence.seriesId === series.id);
  return {
    series,
    organizer: series.organizerId ? index.markets.get(series.organizerId) ?? null : null,
    venue: series.venueId ? index.venues.get(series.venueId) ?? null : null,
    listed: related.filter((model) => model.visibility === "listed"),
    review: related.filter((model) => model.visibility === "review"),
  };
}

export function getOccurrenceView(
  catalog: PublicEventCatalog,
  seriesSlug: string | undefined,
  occurrenceSlug: string | undefined,
): OccurrenceModel | null {
  if (!seriesSlug || !occurrenceSlug) return null;
  const index = indexCatalog(catalog);
  const series = index.seriesBySlug.get(seriesSlug);
  if (!series) return null;
  const occurrence = catalog.occurrences.find(
    (item) => item.seriesId === series.id && item.slug === occurrenceSlug,
  );
  if (!occurrence) return null;
  return toOccurrenceModel(catalog, index, occurrence);
}

export type VendorAppearanceLink = OccurrenceModel & { appearance: AppearanceModel };

export type VendorView = {
  vendor: SyntheticVendorListing;
  appearances: VendorAppearanceLink[];
};

export function vendorDirectory(catalog: PublicEventCatalog): VendorView[] {
  return catalog.vendors.map((vendor) => ({
    vendor,
    appearances: allOccurrenceModels(catalog).flatMap((model) => {
      if (model.visibility === "withheld") return [];
      return model.appearances
        .filter((item) => item.vendor?.displayName === vendor.displayName && item.vendor?.businessId === vendor.businessId)
        .map((item) => ({ ...model, appearance: item }));
    }),
  }));
}

export function vendorMatchesFilters(view: VendorView, filters: DiscoveryFilters): boolean {
  const { vendor, appearances } = view;
  if (filters.category !== "all" && vendor.category !== filters.category) return false;
  if (filters.city !== "all" && vendor.city !== filters.city) return false;
  const listed = appearances.filter((item) => item.visibility === "listed");
  if (filters.marketSlug !== "all") {
    const hit = listed.some(
      (item) => item.market?.slug === filters.marketSlug || item.organizer?.slug === filters.marketSlug,
    );
    if (!hit) return false;
  }
  if (filters.date && !listed.some((item) => item.dateKey === filters.date)) return false;
  return true;
}

export function filteredVendors(catalog: PublicEventCatalog, filters: DiscoveryFilters = EMPTY_FILTERS): VendorView[] {
  return vendorDirectory(catalog)
    .filter((view) => vendorMatchesFilters(view, filters))
    .sort((a, b) => a.vendor.displayName.localeCompare(b.vendor.displayName));
}

export function filteredMarkets(catalog: PublicEventCatalog, filters: DiscoveryFilters = EMPTY_FILTERS): MarketOrOrganizer[] {
  return catalog.markets
    .filter((market) => marketMatchesFilters(catalog, market, filters))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterChoices(catalog: PublicEventCatalog): { cities: string[]; markets: MarketOrOrganizer[] } {
  const cities = new Set<string>();
  for (const venue of catalog.venues) if (venue.city) cities.add(venue.city);
  for (const vendor of catalog.vendors) cities.add(vendor.city);
  return {
    cities: Array.from(cities).sort((a, b) => a.localeCompare(b)),
    markets: [...catalog.markets].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function catalogProblems(catalog: PublicEventCatalog): string[] {
  const problems: string[] = [];
  const index = indexCatalog(catalog);
  if (catalog.label !== "synthetic-demo") problems.push("Catalog must be labeled synthetic-demo.");
  for (const venue of catalog.venues) {
    if (venue.timezone !== "America/Chicago") problems.push(`Venue ${venue.id} is not America/Chicago.`);
  }
  for (const occurrence of catalog.occurrences) {
    if (occurrence.timezone !== "America/Chicago") problems.push(`Occurrence ${occurrence.id} is not America/Chicago.`);
    if (!index.venues.has(occurrence.venueId)) problems.push(`Occurrence ${occurrence.id} venue is missing.`);
    if (occurrence.seriesId && !index.series.has(occurrence.seriesId)) problems.push(`Occurrence ${occurrence.id} series is missing.`);
    if (occurrence.marketId && !index.markets.has(occurrence.marketId)) problems.push(`Occurrence ${occurrence.id} market is missing.`);
    if (!catalog.freshness[occurrence.id]) problems.push(`Occurrence ${occurrence.id} has no freshness fixture flag.`);
    try {
      chicagoDateKey(occurrence.startLocal);
      if (occurrence.endLocal) chicagoDateKey(occurrence.endLocal);
      formatChicagoDateLabel(occurrence.startLocal);
    } catch (error) {
      problems.push(`Occurrence ${occurrence.id} has an unreadable Chicago time: ${(error as Error).message}`);
    }
  }
  for (const appearance of catalog.appearances) {
    if (appearance.sourced !== true) problems.push(`Appearance ${appearance.id} is not sourced.`);
    if (!appearance.sourceUrl) problems.push(`Appearance ${appearance.id} has no source URL.`);
    if (!index.occurrences.has(appearance.occurrenceId)) problems.push(`Appearance ${appearance.id} occurrence is missing.`);
    const vendor = vendorForAppearance(index, appearance);
    if (!vendor) problems.push(`Appearance ${appearance.id} does not match a synthetic vendor.`);
    if (vendor && vendor.displayName !== appearance.displayName) {
      problems.push(`Appearance ${appearance.id} display name does not match its vendor.`);
    }
  }
  for (const conflict of catalog.conflicts) {
    if (conflict.status !== "unresolved") problems.push(`Conflict ${conflict.id} is resolved.`);
    if (conflict.reports.length < 2) problems.push(`Conflict ${conflict.id} needs at least two reports.`);
    const occurrence = index.occurrences.get(conflict.occurrenceId);
    if (!occurrence) {
      problems.push(`Conflict ${conflict.id} occurrence is missing.`);
      continue;
    }
    const venue = index.venues.get(occurrence.venueId);
    if (venue?.address) problems.push(`Conflict ${conflict.id} occurrence has a chosen address.`);
    if (!occurrence.timeUnconfirmed) problems.push(`Conflict ${conflict.id} occurrence has a chosen time.`);
  }
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const marketSlugs = new Set<string>();
  for (const market of catalog.markets) {
    if (!slugPattern.test(market.slug)) problems.push(`Market ${market.id} slug is not a stored public slug.`);
    if (market.slug === market.id) problems.push(`Market ${market.id} uses its raw id as the public slug.`);
    if (marketSlugs.has(market.slug)) problems.push(`Duplicate market slug ${market.slug}.`);
    marketSlugs.add(market.slug);
  }
  const seriesSlugs = new Set<string>();
  for (const series of catalog.series) {
    if (!slugPattern.test(series.slug)) problems.push(`Series ${series.id} slug is not a stored public slug.`);
    if (series.slug === series.id) problems.push(`Series ${series.id} uses its raw id as the public slug.`);
    if (seriesSlugs.has(series.slug)) problems.push(`Duplicate series slug ${series.slug}.`);
    seriesSlugs.add(series.slug);
  }
  const occurrenceSlugsBySeries = new Map<string, Set<string>>();
  for (const occurrence of catalog.occurrences) {
    if (!slugPattern.test(occurrence.slug)) problems.push(`Occurrence ${occurrence.id} slug is not a stored public slug.`);
    if (occurrence.slug === occurrence.id) problems.push(`Occurrence ${occurrence.id} uses its raw id as the public slug.`);
    const seriesKey = occurrence.seriesId ?? "";
    const seen = occurrenceSlugsBySeries.get(seriesKey) ?? new Set<string>();
    if (seen.has(occurrence.slug)) problems.push(`Duplicate occurrence slug ${occurrence.slug} in series ${seriesKey}.`);
    seen.add(occurrence.slug);
    occurrenceSlugsBySeries.set(seriesKey, seen);
    if ((occurrence.publicationState === "published" || occurrence.publicationState === "cancelled" || occurrence.publicationState === "needs_review") && !occurrence.seriesId) {
      problems.push(`Occurrence ${occurrence.id} needs a series before it can use the public occurrence route.`);
    }
  }
  const profileSlugs = new Set<string>();
  for (const vendor of catalog.vendors) {
    if (vendor.businessId && !vendor.profileSlug) {
      problems.push(`Vendor ${vendor.displayName} has a businessId without a stored food-truck profile slug.`);
    }
    if (!vendor.businessId && vendor.profileSlug) {
      problems.push(`Vendor ${vendor.displayName} has a profile slug without a businessId.`);
    }
    if (vendor.profileSlug) {
      if (!slugPattern.test(vendor.profileSlug)) problems.push(`Vendor ${vendor.displayName} profile slug is invalid.`);
      if (profileSlugs.has(vendor.profileSlug)) problems.push(`Duplicate food-truck profile slug ${vendor.profileSlug}.`);
      profileSlugs.add(vendor.profileSlug);
    }
  }
  return problems;
}
