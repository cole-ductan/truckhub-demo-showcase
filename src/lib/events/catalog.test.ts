import { describe, expect, it } from "vitest";
import {
  catalogProblems,
  filteredVendors,
  getOccurrenceView,
  listedOccurrences,
  occurrenceVisibility,
  readDiscoveryFilters,
} from "./catalog";
import { FIXTURE, syntheticPublicEventCatalog } from "./fixtures";
import { foodTruckProfilePath, marketPath, occurrencePath, seriesPath } from "./paths";

const catalog = syntheticPublicEventCatalog;

describe("Lane B synthetic catalog", () => {
  it("is internally consistent and labeled synthetic", () => {
    expect(catalogProblems(catalog)).toEqual([]);
    expect(catalog.label).toBe("synthetic-demo");
    expect(catalog.disclaimer).toMatch(/does not list every regional event/i);
    expect(JSON.stringify(catalog)).not.toMatch(/christkindl|artisan alley|bellin|daily buzz|resch complex|fire & fir/i);
  });

  it("uses stored slugs instead of ids or display names", () => {
    const market = catalog.markets.find((item) => item.id === FIXTURE.marketLantern)!;
    const series = catalog.series.find((item) => item.id === FIXTURE.seriesLantern)!;
    const occurrence = catalog.occurrences.find((item) => item.id === FIXTURE.occNov21)!;
    expect(market.slug).toBe("lantern-lane-night-market");
    expect(market.slug).not.toBe(market.id);
    expect(market.slug).not.toContain("synthetic");
    expect(marketPath(market)).toBe("/markets/lantern-lane-night-market");
    expect(seriesPath(series)).toBe("/events/lantern-lane-saturdays");
    expect(occurrencePath(series, occurrence)).toBe("/events/lantern-lane-saturdays/2026-11-21");
    expect(occurrence.slug).toBe("2026-11-21");
    expect(occurrence.slug).not.toBe(occurrence.id);
  });

  it("disambiguates two occurrences on the same Chicago date with stored slugs", () => {
    const series = catalog.series.find((item) => item.id === FIXTURE.seriesCinder)!;
    const midday = getOccurrenceView(catalog, series.slug, FIXTURE.slugCinder);
    const late = getOccurrenceView(catalog, series.slug, FIXTURE.slugCinderLate);
    expect(midday?.dateKey).toBe("2026-11-20");
    expect(late?.dateKey).toBe("2026-11-20");
    expect(midday?.occurrence.id).not.toBe(late?.occurrence.id);
    expect(occurrencePath(series, midday!.occurrence)).toBe("/events/cinder-lot-truck-stop/2026-11-20");
    expect(occurrencePath(series, late!.occurrence)).toBe("/events/cinder-lot-truck-stop/2026-11-20-late");
    expect(getOccurrenceView(catalog, FIXTURE.slugLanternSeries, FIXTURE.slugCinder)).toBeNull();
  });

  it("keeps the multi-date series bounded and does not fill the closure or Thanksgiving", () => {
    const listed = listedOccurrences(catalog).filter((item) => item.series?.id === FIXTURE.seriesLantern);
    expect(listed.map((item) => item.dateKey)).toEqual(["2026-11-21", "2026-11-28", "2026-12-05", "2026-12-12"]);
    expect(listed.map((item) => item.dateKey)).not.toContain("2026-11-26");
    expect(listed.map((item) => item.dateKey)).not.toContain("2026-12-26");
    const closed = listed.find((item) => item.occurrence.id === FIXTURE.occNov28);
    expect(closed?.occurrence.cancellationState).toBe("cancelled");
    expect(closed?.occurrence.publicationState).toBe("cancelled");
    expect(closed?.appearances).toHaveLength(0);
    const unconfirmed = listed.find((item) => item.occurrence.id === FIXTURE.occDec12);
    expect(unconfirmed?.timeLabel).toBe("Time unconfirmed");
    expect(unconfirmed?.appearances).toHaveLength(0);
  });

  it("requires sourced appearances and links profiles only through a stored food-truck slug", () => {
    expect(catalog.appearances.length).toBeGreaterThan(0);
    for (const appearance of catalog.appearances) {
      expect(appearance.sourced).toBe(true);
      expect(appearance.sourceUrl).toMatch(/^https:\/\/example.com\/foodxmobile-demo\//);
    }
    const loom = catalog.vendors.find((vendor) => vendor.businessId === FIXTURE.bizLoom)!;
    const pie = catalog.vendors.find((vendor) => vendor.displayName === "Kettle Pie Demo")!;
    expect(foodTruckProfilePath(loom.profileSlug!)).toBe("/food-trucks/demo-loom-and-linen");
    expect(pie.businessId).toBeNull();
    expect(pie.profileSlug).toBeNull();
    const nov21 = getOccurrenceView(catalog, FIXTURE.slugLanternSeries, FIXTURE.slugNov21);
    expect(nov21?.appearances.map((item) => item.appearance.displayName).sort()).toEqual([
      "Kettle Pie Demo",
      "Loom & Linen Demo Co.",
    ]);
  });

  it("reads freshness from fixture flags, including when timestamps match", () => {
    const open = catalog.occurrences.find((item) => item.id === FIXTURE.occNov21)!;
    const closed = catalog.occurrences.find((item) => item.id === FIXTURE.occNov28)!;
    expect(open.verifiedAt).toBe(closed.verifiedAt);
    expect(catalog.freshness[open.id]).toBe("fresh");
    expect(catalog.freshness[closed.id]).toBe("stale");
  });

  it("leaves the source conflict unresolved", () => {
    const conflict = catalog.conflicts[0];
    expect(conflict.status).toBe("unresolved");
    expect(conflict.reports).toHaveLength(2);
    const occurrence = catalog.occurrences.find((item) => item.id === conflict.occurrenceId)!;
    const venue = catalog.venues.find((item) => item.id === occurrence.venueId)!;
    expect(venue.address).toBeNull();
    expect(occurrence.timeUnconfirmed).toBe(true);
    expect(occurrenceVisibility(occurrence)).toBe("review");
    expect(listedOccurrences(catalog).some((item) => item.occurrence.id === occurrence.id)).toBe(false);
    const summaries = conflict.reports.map((report) => report.summary).join(" ");
    expect(summaries).toContain("Sample Roaster Cafe");
    expect(summaries).toContain("Fixture Hall");
  });

  it("filters by category, city, market slug, and Chicago date", () => {
    const trucks = listedOccurrences(catalog, { ...readDiscoveryFilters(new URLSearchParams("category=truck")) });
    expect(trucks.map((item) => item.occurrence.id).sort()).toEqual([FIXTURE.occCinder, FIXTURE.occCinderLate].sort());
    const day = listedOccurrences(catalog, readDiscoveryFilters(new URLSearchParams("date=2026-11-21")));
    expect(day.map((item) => item.occurrence.id)).toEqual([FIXTURE.occNov21]);
    const vendors = filteredVendors(catalog, readDiscoveryFilters(new URLSearchParams("category=beverage&city=Sample+Bend")));
    expect(vendors.map((item) => item.vendor.displayName)).toEqual(["Cedar Cider Demo"]);
    const marketVendors = filteredVendors(
      catalog,
      readDiscoveryFilters(new URLSearchParams(`market=${FIXTURE.slugLanternMarket}`)),
    );
    expect(marketVendors.map((item) => item.vendor.displayName).sort()).toEqual([
      "Cedar Cider Demo",
      "Kettle Pie Demo",
      "Loom & Linen Demo Co.",
    ]);
    expect(listedOccurrences(catalog, readDiscoveryFilters(new URLSearchParams("date=2026-11-26")))).toHaveLength(0);
    expect(listedOccurrences(catalog, readDiscoveryFilters(new URLSearchParams("date=2026-12-19")))).toHaveLength(0);
  });
});
