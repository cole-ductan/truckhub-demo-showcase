import { useParams } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { getOccurrenceView } from "@/lib/events/catalog";
import { usePublicEventCatalog } from "@/lib/events/usePublicEventCatalog";
import { CatalogEmpty, CatalogError, CatalogLoading } from "@/components/events/CatalogStates";
import { OccurrenceView } from "@/components/events/OccurrenceView";
import { PublicEventFrame } from "@/components/events/PublicEventFrame";

export default function EventOccurrenceDetailPage() {
  const { seriesSlug, occurrenceSlug } = useParams<{ seriesSlug: string; occurrenceSlug: string }>();
  const state = usePublicEventCatalog();
  const view = state.status === "ready" ? getOccurrenceView(state.catalog, seriesSlug, occurrenceSlug) : null;
  useSEO({
    title: view ? `${view.occurrence.title} — FoodXMobile` : "Occurrence (synthetic demo) — FoodXMobile",
    description: "Synthetic demo occurrence. Times are America/Chicago wall times from the fixture.",
  });
  return (
    <PublicEventFrame>
      {state.status === "loading" ? <CatalogLoading /> : null}
      {state.status === "error" ? <CatalogError message={state.message} /> : null}
      {state.status === "ready" && view && view.visibility === "withheld" ? (
        <CatalogEmpty
          title="Withheld from public pages"
          body="This fixture stays off the public demo. Draft and unpublished records are not listed as occurrences."
          actionHref="/events"
          actionLabel="Back to events"
        />
      ) : null}
      {state.status === "ready" && view && view.visibility !== "withheld" ? <OccurrenceView model={view} /> : null}
      {state.status === "ready" && !view ? (
        <CatalogEmpty
          title="Occurrence not in the demo catalog"
          body="No stored series and occurrence slug pair matches this URL."
          actionHref="/events"
          actionLabel="Back to events"
        />
      ) : null}
    </PublicEventFrame>
  );
}
