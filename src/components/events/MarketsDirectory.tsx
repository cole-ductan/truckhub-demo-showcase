import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import {
  allOccurrenceModels,
  filterChoices,
  filteredMarkets,
  readDiscoveryFilters,
} from "@/lib/events/catalog";
import { marketPath } from "@/lib/events/paths";
import { usePublicEventCatalog } from "@/lib/events/usePublicEventCatalog";
import { CatalogEmpty, CatalogError, CatalogLoading } from "./CatalogStates";
import { DiscoveryFilters } from "./DiscoveryFilters";
import { MarketKindBadge } from "./EventBadges";

export function MarketsDirectory() {
  const state = usePublicEventCatalog();
  const [params] = useSearchParams();
  if (state.status === "loading") return <CatalogLoading />;
  if (state.status === "error") return <CatalogError message={state.message} />;

  const filters = readDiscoveryFilters(params);
  const markets = filteredMarkets(state.catalog, filters);
  const choices = filterChoices(state.catalog);
  const models = allOccurrenceModels(state.catalog);

  return (
    <section>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Markets</p>
      <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Markets</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Market, organizer, and venue-series pages from the synthetic demo. Owner schedules stay on their own calendar.
      </p>
      <DiscoveryFilters cities={choices.cities} markets={choices.markets} />
      {markets.length === 0 ? (
        <CatalogEmpty
          title="No synthetic demo markets match"
          body="Clearing these filters still shows only the fixture catalog. It does not load a regional market list."
        />
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {markets.map((market) => {
            const related = models.filter((model) =>
              market.kind === "organizer" ? model.organizer?.id === market.id : model.occurrence.marketId === market.id,
            );
            const listed = related.filter((model) => model.visibility === "listed");
            const next = listed[0];
            return (
              <li key={market.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <MarketKindBadge kind={market.kind} />
                <h2 className="mt-3 font-display text-2xl font-semibold">
                  <Link to={marketPath(market)} className="hover:text-primary">{market.name}</Link>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {next ? `Next fixture date ${next.dateLabel}` : "No published occurrence in this fixture"}
                </p>
                {related.some((model) => model.visibility === "review") ? (
                  <p className="mt-2 text-sm text-muted-foreground">Includes an item held for review.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
