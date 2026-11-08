import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { FIXTURE } from "@/lib/events/fixtures";
import { publicDiscoveryPaths } from "@/lib/events/publicPaths";
import { PublicDiscoveryRouteElements } from "@/routes/publicDiscoveryRoutes";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    roles: [],
    loading: false,
    isAdmin: false,
    isOwner: false,
    signOut: async () => {},
  }),
}));

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        {PublicDiscoveryRouteElements()}
        <Route path="/food-trucks/:slug" element={<p>Food truck profile</p>} />
        <Route path="/food-trucks" element={<p>Food trucks directory</p>} />
        <Route path="/calendar" element={<h1>Public calendar</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("public market and event pages", () => {
  it("replaces the market, event, and vendor redirects with fixture pages", () => {
    renderAt("/markets");
    expect(screen.getByRole("heading", { level: 1, name: "Markets" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lantern Lane Night Market (synthetic)" })).toHaveAttribute(
      "href",
      "/markets/lantern-lane-night-market",
    );
    expect(screen.queryByText("Food trucks directory")).not.toBeInTheDocument();
    expect(screen.getByText(/does not list every regional event/i)).toBeInTheDocument();
  });

  it("renders series and same-day occurrence routes from stored slugs", () => {
    renderAt("/events/cinder-lot-truck-stop");
    expect(screen.getByRole("heading", { level: 1, name: "Cinder Lot Truck Stop (synthetic)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cinder Lot Truck Stop (synthetic)" })).toHaveAttribute(
      "href",
      "/events/cinder-lot-truck-stop/2026-11-20",
    );
    expect(screen.getByRole("link", { name: "Cinder Lot Truck Stop — late service (synthetic)" })).toHaveAttribute(
      "href",
      "/events/cinder-lot-truck-stop/2026-11-20-late",
    );
    renderAt("/events/cinder-lot-truck-stop/2026-11-20-late");
    expect(screen.getByRole("heading", { level: 1, name: "Cinder Lot Truck Stop — late service (synthetic)" })).toBeInTheDocument();
    expect(screen.getByText("Fri, Nov 20, 2026 · 5:00 PM–7:00 PM CT")).toBeInTheDocument();
    expect(screen.getByText("No sourced vendor appearances for this date.")).toBeInTheDocument();
  });

  it("shows a cancellation, an unconfirmed time, and fixture freshness", () => {
    renderAt(`/events/${FIXTURE.slugLanternSeries}/${FIXTURE.slugNov28}`);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Stale · fixture")).toBeInTheDocument();
    expect(screen.getByText("This date is an explicit cancellation in the fixture.")).toBeInTheDocument();
    expect(screen.getByText("Sat, Nov 28, 2026 · 10:00 AM–4:00 PM CT")).toBeInTheDocument();
    cleanup();
    renderAt(`/events/${FIXTURE.slugLanternSeries}/${FIXTURE.slugDec12}`);
    expect(screen.getByText("Time unconfirmed")).toBeInTheDocument();
    expect(screen.getByText("Aging · fixture")).toBeInTheDocument();
    expect(screen.getByText("Sat, Dec 12, 2026 · Time unconfirmed")).toBeInTheDocument();
  });

  it("navigates vendor, appearance, and market without a second vendor profile", () => {
    renderAt(`/events/${FIXTURE.slugLanternSeries}/${FIXTURE.slugNov21}`);
    expect(screen.getByText("Sat, Nov 21, 2026 · 10:00 AM–4:00 PM CT")).toBeInTheDocument();
    expect(screen.getByText("Claimed · fixture")).toBeInTheDocument();
    expect(screen.getByText("Imported · fixture")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Loom & Linen Demo Co." })).toHaveAttribute(
      "href",
      "/food-trucks/demo-loom-and-linen",
    );
    expect(screen.getByText("Kettle Pie Demo").closest("a")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Loom & Linen Demo Co." }));
    expect(screen.getByText("Food truck profile")).toBeInTheDocument();

    cleanup();
    renderAt("/vendors?category=truck");
    expect(screen.getByRole("link", { name: "Ember Axle Demo Truck" })).toHaveAttribute(
      "href",
      "/food-trucks/demo-ember-axle-truck",
    );
    expect(screen.queryByText("Loom & Linen Demo Co.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /\/vendors\// })).not.toBeInTheDocument();
    const vendorLinks = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");
    expect(vendorLinks.some((href) => href.startsWith("/vendors/"))).toBe(false);
  });

  it("shows both conflict reports and does not select a venue or hours", () => {
    renderAt(`/events/${FIXTURE.slugNorthDockSeries}/${FIXTURE.slugConflict}`);
    const region = screen.getByRole("region", { name: "Unresolved source conflict" });
    expect(region).toHaveTextContent("unresolved");
    expect(region).toHaveTextContent("Sample Roaster Cafe");
    expect(region).toHaveTextContent("Fixture Hall");
    expect(region).toHaveTextContent("9:00 AM–2:00 PM");
    expect(region).toHaveTextContent("10:00 AM–4:00 PM");
    expect(screen.getByRole("heading", { level: 2, name: "Venue" }).parentElement).toHaveTextContent(
      "Unresolved venue (synthetic conflict)",
    );
    expect(screen.getByText("Address not on file for this fixture.")).toBeInTheDocument();
    expect(screen.getByText("Time unconfirmed")).toBeInTheDocument();
    expect(screen.queryByText(/selected source/i)).not.toBeInTheDocument();
  });

  it("withholds the draft occurrence from the series page and the direct URL", () => {
    renderAt(`/events/${FIXTURE.slugLanternSeries}`);
    expect(screen.queryByText(/unpublished draft/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lantern Lane Night Market — closed this date (synthetic)" })).toBeInTheDocument();
    cleanup();
    renderAt(`/events/${FIXTURE.slugLanternSeries}/${FIXTURE.slugDraft}`);
    expect(screen.getByRole("heading", { name: "Withheld from public pages" })).toBeInTheDocument();
    expect(screen.queryByText("10:00 AM–4:00 PM CT")).not.toBeInTheDocument();
  });

  it("renders loading, error, and empty catalog states", () => {
    renderAt("/markets?catalog=loading");
    expect(screen.getByRole("status")).toHaveTextContent("Loading synthetic demo catalog");
    expect(screen.queryByRole("heading", { name: "Markets" })).not.toBeInTheDocument();

    cleanup();
    renderAt("/events?catalog=error");
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was fetched from a live source.");
    expect(screen.queryByText("Lantern Lane Saturdays (synthetic)")).not.toBeInTheDocument();

    cleanup();
    renderAt("/vendors?catalog=empty");
    expect(screen.getByRole("heading", { name: "No synthetic demo vendors match" })).toBeInTheDocument();
  });

  it("filters the event directory by Chicago date", () => {
    renderAt("/events");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-11-20" } });
    expect(screen.getByText("2 fixture occurrences match.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cinder Lot Truck Stop — late service (synthetic)" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Lantern Lane Night Market — closed this date (synthetic)" })).not.toBeInTheDocument();
  });

  it("keeps /calendar as its own route and locks the discovery paths", () => {
    expect([...publicDiscoveryPaths]).toEqual([
      "/markets",
      "/markets/:slug",
      "/events",
      "/events/:seriesSlug/:occurrenceSlug",
      "/events/:slug",
      "/vendors",
    ]);
    const app = readFileSync(path.resolve("src/App.tsx"), "utf8");
    expect(app).toContain('path="/calendar" element={<PublicCalendar />}');
    expect(app).not.toMatch(/path="\/markets" element={<Navigate/);
    expect(app).not.toMatch(/path="\/events" element={<Navigate/);
    expect(app).not.toMatch(/path="\/vendors" element={<Navigate/);
    expect(app).not.toContain("/vendors/:slug");
    renderAt("/calendar");
    expect(screen.getByRole("heading", { name: "Public calendar" })).toBeInTheDocument();
  });
});

describe("new event code stays off the owner schedule and UTC date cuts", () => {
  it("does not query business_events or slice UTC dates", () => {
    const files = [
      ...walk("src/lib/events"),
      ...walk("src/components/events"),
      ...walk("src/routes"),
      "src/pages/Markets.tsx",
      "src/pages/MarketDetail.tsx",
      "src/pages/Events.tsx",
      "src/pages/EventSeriesDetail.tsx",
      "src/pages/EventOccurrenceDetail.tsx",
      "src/pages/Vendors.tsx",
    ];
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/from\(["']business_events["']\)/);
    expect(source).not.toMatch(/toISOString\(\)/);
    expect(source).not.toMatch(/slugify/);
    expect(source).not.toMatch(/\/vendors\/\$\{/);
    expect(source).not.toMatch(/from\("businesses"\)/);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    if (full.endsWith(".test.ts") || full.endsWith(".test.tsx")) return [];
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}
