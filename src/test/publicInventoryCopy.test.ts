import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DIRECT_INQUIRY_RECEIPT,
  FORBIDDEN_PUBLIC_PHRASES,
  MARKETPLACE_INQUIRY_RECEIPT,
  PUBLIC_COPY_FILES,
  formatVerifiedAggregate,
} from "@/lib/publicInventoryCopy";

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
      expect(source.text, source.file).not.toContain("28+");
      expect(source.text, source.file).not.toMatch(/Trucks on the hub/i);
    }
  });

  it("does not advertise unverified live location, continuous updates, Google sync, or delivery", () => {
    for (const source of sources) {
      for (const phrase of FORBIDDEN_PUBLIC_PHRASES) {
        expect(source.text, `${source.file} contains “${phrase}”`).not.toContain(phrase);
      }
    }
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
      expect(text, file).toMatch(/InventoryKindBadge|Verified listing/);
    }
  });
});
