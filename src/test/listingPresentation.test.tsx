import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InventoryKindBadge } from "@/components/site/InventoryKindBadge";
import { isClearlyFoodBusiness, isSampleInventory, listingPageCopy } from "@/lib/listingPresentation";
import { PIN_KIND_LABEL, renderPinElement } from "@/lib/mapPinIcons";

describe("listing metadata", () => {
  it("does not emit structured data or raw marketing copy for a sample demo listing", () => {
    const copy = listingPageCopy({
      name: "North Kitchen",
      is_demo: true,
      description: "Best brisket daily",
      tagline: "Serving the district",
      cuisine: "BBQ",
      phone: "555-0100",
      email: "sample@example.com",
      city: "Example City",
    });
    expect(copy.title.toLowerCase()).toContain("sample demo listing");
    expect(copy.description).toBe("Sample demo listing for North Kitchen. Not a confirmed operating business.");
    expect(copy.description).not.toContain("Best brisket daily");
    expect(copy.description).not.toContain("Serving the district");
    expect(copy.jsonLd).toBeNull();
    expect(JSON.stringify(copy)).not.toContain("FoodEstablishment");
    expect(JSON.stringify(copy)).not.toContain("555-0100");
  });

  it("uses FoodEstablishment only when the listing is clearly a food business", () => {
    const food = listingPageCopy({
      name: "North Kitchen",
      is_demo: false,
      cuisine: "BBQ",
      description: "Smoked plates",
    });
    expect(food.jsonLd?.["@type"]).toBe("FoodEstablishment");
    expect(isClearlyFoodBusiness({ cuisine: "BBQ", categoryName: null })).toBe(true);

    const maker = listingPageCopy({
      name: "North Studio",
      is_demo: false,
      cuisine: null,
      categoryName: "Maker",
      description: "Printed goods",
    });
    expect(maker.jsonLd?.["@type"]).toBe("LocalBusiness");
    expect(JSON.stringify(maker.jsonLd)).not.toContain("FoodEstablishment");
  });
});

describe("nested sample identity", () => {
  it("treats a demo parent or a demo event row as sample", () => {
    expect(isSampleInventory(false, true)).toBe(true);
    expect(isSampleInventory(true, false)).toBe(true);
    expect(isSampleInventory(false, false)).toBe(false);
  });

  it("gives events an event detail instead of a published-listing detail", () => {
    render(<InventoryKindBadge subject="event" isDemo />);
    expect(screen.getByTitle(/sample event/i).getAttribute("title")).not.toMatch(/published listing/i);
    render(<InventoryKindBadge subject="event" isDemo={false} />);
    const verified = screen.getByTitle(/public event that is not marked demo/i);
    expect(verified.getAttribute("title")).not.toMatch(/published listing/i);
  });

  it("marks profile schedule rows from the event flag and the parent listing", () => {
    const profile = readFileSync(resolve(process.cwd(), "src/pages/TruckProfile.tsx"), "utf8");
    expect(profile).toContain('subject={row.source === "event" ? "event" : "listing"}');
    expect(profile).toContain("isSampleInventory(w.is_demo, biz.is_demo)");
    expect(profile).toContain("isSampleInventory(e.is_demo, biz.is_demo)");
    expect(profile).not.toContain('"@type": "FoodEstablishment"');
  });
});

describe("map pin identity", () => {
  it("labels sample and verified markers before a popup can open", () => {
    const demo = renderPinElement("truck", { isDemo: true, accessibleName: "North Kitchen" });
    const verified = renderPinElement("truck", { isDemo: false, accessibleName: "North Kitchen", status: "open" });
    expect(demo.getAttribute("aria-label")).toBe("Sample demo: North Kitchen");
    expect(verified.getAttribute("aria-label")).toBe("Verified: North Kitchen");
    expect(demo.textContent).toContain(PIN_KIND_LABEL.demo);
    expect(verified.textContent).toContain(PIN_KIND_LABEL.verified);
    expect(demo.dataset.pinKind).toBe("demo");
    expect(verified.dataset.pinKind).toBe("verified");
    expect(demo.querySelector("path")?.getAttribute("fill")).toBe(verified.querySelector("path")?.getAttribute("fill"));
  });
});
