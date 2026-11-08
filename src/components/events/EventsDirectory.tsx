import { Link, useSearchParams } from "react-router-dom";
import {
  allOccurrenceModels,
  filterChoices,
  filtersAreActive,
  listedOccurrences,
  readDiscoveryFilters,
} from "@/lib/events/catalog";
import { seriesPath } from "@/lib/events/paths";
import { usePublicEventCatalog } from "@/lib/events/usePublicEventCatalog";
import { CatalogEmpty, CatalogError, CatalogLoading } from "./CatalogStates";
import { DiscoveryFilters } from "./DiscoveryFilters";
import { OccurrenceList } from "./OccurrenceList";

export function EventsDirectory() {
  const state = usePublicEventCatalog();
  const [params] = useSearchParams();
  if (state.status === "loading") return <CatalogLoading />;
  if (state.status === "error") return <CatalogError message={state.message} />;

  const filters = readDiscoveryFilters(params);
  const occurrences = listedOccurrences(state.catalog, filters);
  const choices = filterChoices(state.catalog);
  const seriesIds = new Set(occurrences.map((item) => item.series?.id).filter((id): id is string => Boolean(id)));
  const series = state.catalog.series.filter((item) => seriesIds.has(item.id));
  const review = filtersAreActive(filters) ? [] : allOccurrenceModels(state.catalog).filter((item) => item.visibility === "review");

  return (
    <section>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Events</p>
      <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Events</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Synthetic series and occurrences. Dates are America/Chicago wall times. The public calendar at /calendar stays a separate page.
      </p>
      <DiscoveryFilters cities={choices.cities} markets={choices.markets} />
      <div className="mt-8">
        <h2 className="font-display text-2xl font-semibold">Series</h2>
        {series.length === 0 ? (
          <CatalogEmpty
            title="No synthetic demo series match"
            body="This filter result is limited to the fixture catalog."
          />
        ) : (
          <ul className="mt-4 grid gap-3">
            {series.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                <Link to={seriesPath(item)} className="font-display text-lg font-semibold hover:text-primary">{item.title}</Link>
                {item.category ? <p className="text-sm text-muted-foreground">{item.category}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Occurrences</h2>
        <p className="mt-1 text-sm text-muted-foreground">{occurrences.length} fixture occurrences match.</p>
        {occurrences.length === 0 ? (
          <CatalogEmpty
            title="No synthetic demo occurrences match"
            body="An empty filter result is not a statement that the region has no events."
          />
        ) : (
          <OccurrenceList items={occurrences} />
        )}
      </div>
      {review.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Held for review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These fixtures stay out of the published list. Conflicting reports are left unresolved.
          </p>
          <OccurrenceList items={review} />
        </div>
      ) : null}
    </section>
  );
}
