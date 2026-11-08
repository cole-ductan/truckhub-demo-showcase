import { useSearchParams } from "react-router-dom";
import { filtersAreActive, readDiscoveryFilters, type DiscoveryFilters } from "@/lib/events/catalog";
import type { MarketOrOrganizer } from "@/lib/events/types";

const selectClass =
  "h-10 rounded-full border border-border bg-card px-3 text-sm font-medium normal-case tracking-normal text-foreground";

export function DiscoveryFilters({ cities, markets }: { cities: string[]; markets: MarketOrOrganizer[] }) {
  const [params, setParams] = useSearchParams();
  const filters = readDiscoveryFilters(params);

  function update(patch: Partial<DiscoveryFilters>) {
    const next = new URLSearchParams(params);
    const merged = { ...filters, ...patch };
    writeParam(next, "category", merged.category, "all");
    writeParam(next, "city", merged.city, "all");
    writeParam(next, "market", merged.marketSlug, "all");
    writeParam(next, "date", merged.date, "");
    setParams(next, { replace: true });
  }

  return (
    <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filter synthetic demo catalog" onSubmit={(event) => event.preventDefault()}>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Category
        <select className={selectClass} value={filters.category} onChange={(event) => update({ category: event.target.value as DiscoveryFilters["category"] })}>
          <option value="all">All categories</option>
          <option value="maker">Makers</option>
          <option value="food">Food</option>
          <option value="beverage">Beverage</option>
          <option value="truck">Trucks</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        City
        <select className={selectClass} value={filters.city} onChange={(event) => update({ city: event.target.value })}>
          <option value="all">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Market
        <select className={selectClass} value={filters.marketSlug} onChange={(event) => update({ marketSlug: event.target.value })}>
          <option value="all">All markets</option>
          {markets.map((market) => (
            <option key={market.id} value={market.slug}>{market.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Date
        <input
          type="date"
          className={selectClass}
          value={filters.date}
          onChange={(event) => update({ date: event.target.value })}
        />
      </label>
      {filtersAreActive(filters) ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="button"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
            onClick={() => update({ category: "all", city: "all", marketSlug: "all", date: "" })}
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </form>
  );
}

function writeParam(params: URLSearchParams, key: string, value: string, empty: string) {
  if (!value || value === empty) params.delete(key);
  else params.set(key, value);
}
