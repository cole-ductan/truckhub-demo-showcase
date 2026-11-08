import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DIRECT_INQUIRY_RECEIPT,
  EVENT_KIND,
  FORBIDDEN_PUBLIC_PHRASES,
  INVENTORY_KIND,
  LISTED_STATUS_LABEL,
  MARKETPLACE_INQUIRY_RECEIPT,
  PUBLIC_COPY_FILES,
  SAVED_LOCATION_NOTE,
  STATUS_NOT_LIVE_NOTE,
  findForbiddenPhrases,
  formatVerifiedAggregate,
} from "@/lib/publicInventoryCopy";
import { listingPageCopy } from "@/lib/listingPresentation";
import { PIN_KIND_LABEL } from "@/lib/mapPinIcons";

describe("verified inventory aggregate", () => {
  it("uses the defined verified and demo scopes for the 2026-11-08 snapshot", () => {
    const text = formatVerifiedAggregate({
      verifiedPublished: 1,
      demoPublished: 6,
      unavailable: false,
    });

    expect(text).toContain("1 verified published listing");
    expect(text).toContain("6 sample demo listings");
    expect(text).toContain("not operating-truck totals");
    expect(text).toContain("Verified means published and not marked demo");
    expect(text).not.toMatch(/28\+/);
    expect(text).not.toMatch(/\b7\b.*truck/i);
    expect(text).not.toMatch(/food trucks already/i);
  });

  it("does not invent a total when the count query fails", () => {
    const text = formatVerifiedAggregate({
      verifiedPublished: null,
      demoPublished: null,
      unavailable: true,
    });
    expect(text).toMatch(/could not be loaded/i);
    expect(text).toMatch(/No estimated total/i);
    expect(text).not.toMatch(/\d/);
  });

  it("does not treat a successful zero as an error", () => {
    const text = formatVerifiedAggregate({
      verifiedPublished: 0,
      demoPublished: 0,
      unavailable: false,
    });
    expect(text).toContain("0 verified published listings");
    expect(text).toContain("0 sample demo listings");
  });
});

describe("inquiry receipts", () => {
  it("distinguishes a saved and routed direct request from delivery", () => {
    const title = DIRECT_INQUIRY_RECEIPT.title("North Kitchen");
    expect(title).toMatch(/saved/i);
    expect(title).not.toMatch(/sent|delivered/i);
    expect(DIRECT_INQUIRY_RECEIPT.body).toMatch(/saved/i);
    expect(DIRECT_INQUIRY_RECEIPT.body).toMatch(/routed/i);
    expect(DIRECT_INQUIRY_RECEIPT.body).toMatch(/not a delivery receipt/i);
    expect(DIRECT_INQUIRY_RECEIPT.body).toMatch(/email or text/i);
    expect(DIRECT_INQUIRY_RECEIPT.formNote("North Kitchen")).toMatch(/not confirmed/i);
    expect(DIRECT_INQUIRY_RECEIPT.asideNote).toMatch(/not guaranteed/i);
  });

  it("distinguishes a saved and routed marketplace request from delivery", () => {
    expect(MARKETPLACE_INQUIRY_RECEIPT.title).toMatch(/saved/i);
    expect(MARKETPLACE_INQUIRY_RECEIPT.title).not.toMatch(/delivered/i);
    expect(MARKETPLACE_INQUIRY_RECEIPT.body).toMatch(/saved/i);
    expect(MARKETPLACE_INQUIRY_RECEIPT.body).toMatch(/routed/i);
    expect(MARKETPLACE_INQUIRY_RECEIPT.body).toMatch(/not a delivery receipt/i);
  });
});

describe("public copy files", () => {
  const sources = PUBLIC_COPY_FILES.map((file) => ({
    file,
    text: readFileSync(resolve(process.cwd(), file), "utf8"),
  }));

  it("does not keep the hardcoded 28+ trucks claim", () => {
    for (const source of sources) {
      expect(source.text, source.file).not.toMatch(/28\+/i);
      expect(source.text, source.file).not.toMatch(/Trucks on the hub/i);
    }
  });

  it("does not advertise unverified live location, continuous updates, Google sync, or delivery", () => {
    for (const source of sources) {
      expect(findForbiddenPhrases(source.text), source.file).toEqual([]);
    }
  });

  it("catches the old saved-pin toast without banning a not-live disclaimer", () => {
    expect(findForbiddenPhrases("Live map pin updated")).toContain("Live map pin updated");
    expect(findForbiddenPhrases("CUSTOMERS CAN NOW SEE YOUR CURRENT LOCATION on the map.")).toContain(
      "Customers can now see your current location",
    );
    const disclaimer = `${STATUS_NOT_LIVE_NOTE} ${SAVED_LOCATION_NOTE} They are not a live check-in.`;
    expect(findForbiddenPhrases(disclaimer)).toEqual([]);
  });

  it("checks rendered copy exports instead of comments that name banned phrases", () => {
    const demo = listingPageCopy({
      name: "North Kitchen",
      is_demo: true,
      description: "Best brisket daily",
      tagline: "Open now for lunch",
    });
    const rendered = [
      formatVerifiedAggregate({ verifiedPublished: 1, demoPublished: 6, unavailable: false }),
      formatVerifiedAggregate({ verifiedPublished: null, demoPublished: null, unavailable: true }),
      ...Object.values(LISTED_STATUS_LABEL),
      ...Object.values(INVENTORY_KIND).flatMap((kind) => [kind.label, kind.detail]),
      ...Object.values(EVENT_KIND).flatMap((kind) => [kind.label, kind.detail]),
      STATUS_NOT_LIVE_NOTE,
      SAVED_LOCATION_NOTE,
      DIRECT_INQUIRY_RECEIPT.title("North Kitchen"),
      DIRECT_INQUIRY_RECEIPT.body,
      DIRECT_INQUIRY_RECEIPT.formNote("North Kitchen"),
      DIRECT_INQUIRY_RECEIPT.asideNote,
      MARKETPLACE_INQUIRY_RECEIPT.title,
      MARKETPLACE_INQUIRY_RECEIPT.description,
      MARKETPLACE_INQUIRY_RECEIPT.body,
      PIN_KIND_LABEL.demo,
      PIN_KIND_LABEL.verified,
      demo.title,
      demo.description,
    ].join("\n");
    expect(findForbiddenPhrases(rendered)).toEqual([]);
    expect(rendered.toLowerCase()).toContain("not a live check-in");
    expect(PUBLIC_COPY_FILES).toEqual(expect.arrayContaining([
      "src/pages/ClaimListing.tsx",
      "src/components/demo/tourSteps.ts",
      "src/pages/owner/OwnerMapLocations.tsx",
      "src/pages/owner/OwnerProfile.tsx",
    ]));
    expect(PUBLIC_COPY_FILES).not.toContain("src/lib/publicInventoryCopy.ts");
  });

  it("keeps demo and verified labels on inventory surfaces", () => {
    const inventorySurfaces = [
      "src/pages/FoodTrucks.tsx",
      "src/pages/TruckProfile.tsx",
      "src/pages/BookFoodTruck.tsx",
      "src/pages/PublicCalendar.tsx",
      "src/components/site/TodaysFoodTrucks.tsx",
      "src/components/site/EventsThisWeek.tsx",
      "src/components/site/LiveDiscoveryMap.tsx",
    ];
    for (const file of inventorySurfaces) {
      const text = sources.find((source) => source.file === file)?.text ?? "";
      expect(text, file).toMatch(/is_demo/);
      expect(text, file).toMatch(/InventoryKindBadge|PinKindLegend|renderPinElement/);
    }
  });
});
