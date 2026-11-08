import type { ReactNode } from "react";
import { Route } from "react-router-dom";
import MarketsPage from "@/pages/Markets.tsx";
import MarketDetailPage from "@/pages/MarketDetail.tsx";
import EventsPage from "@/pages/Events.tsx";
import EventSeriesDetailPage from "@/pages/EventSeriesDetail.tsx";
import EventOccurrenceDetailPage from "@/pages/EventOccurrenceDetail.tsx";
import VendorsPage from "@/pages/Vendors.tsx";
import { publicDiscoveryPaths, type PublicDiscoveryPath } from "@/lib/events/publicPaths";

const elements: Record<PublicDiscoveryPath, ReactNode> = {
  "/markets": <MarketsPage />,
  "/markets/:slug": <MarketDetailPage />,
  "/events": <EventsPage />,
  "/events/:seriesSlug/:occurrenceSlug": <EventOccurrenceDetailPage />,
  "/events/:slug": <EventSeriesDetailPage />,
  "/vendors": <VendorsPage />,
};

export function PublicDiscoveryRouteElements() {
  return publicDiscoveryPaths.map((path) => <Route key={path} path={path} element={elements[path]} />);
}
