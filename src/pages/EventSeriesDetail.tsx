import { useParams } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { getSeriesView } from "@/lib/events/catalog";
import { usePublicEventCatalog } from "@/lib/events/usePublicEventCatalog";
import { CatalogEmpty, CatalogError, CatalogLoading } from "@/components/events/CatalogStates";
import { EventSeriesView } from "@/components/events/EventSeriesView";
import { PublicEventFrame } from "@/components/events/PublicEventFrame";

export default function EventSeriesDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = usePublicEventCatalog();
  const view = state.status === "ready" ? getSeriesView(state.catalog, slug) : null;
  useSEO({
    title: view ? `${view.series.title} — FoodXMobile` : "Event series (synthetic demo) — FoodXMobile",
    description: "Synthetic demo event series. Occurrences use stored slugs and America/Chicago dates.",
  });
  return (
    <PublicEventFrame>
      {state.status === "loading" ? <CatalogLoading /> : null}
      {state.status === "error" ? <CatalogError message={state.message} /> : null}
      {state.status === "ready" && view ? <EventSeriesView view={view} /> : null}
      {state.status === "ready" && !view ? (
        <CatalogEmpty
          title="Event series not in the demo catalog"
          body="No stored series slug matches this URL."
          actionHref="/events"
          actionLabel="Back to events"
        />
      ) : null}
    </PublicEventFrame>
  );
}
