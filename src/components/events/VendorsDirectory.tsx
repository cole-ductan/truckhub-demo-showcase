import { Link, useSearchParams } from "react-router-dom";
import { filterChoices, filteredVendors, readDiscoveryFilters } from "@/lib/events/catalog";
import { foodTruckProfilePath, occurrencePath } from "@/lib/events/paths";
import { usePublicEventCatalog } from "@/lib/events/usePublicEventCatalog";
import { CatalogEmpty, CatalogError, CatalogLoading } from "./CatalogStates";
import { DiscoveryFilters } from "./DiscoveryFilters";
import { ListingOriginBadge } from "./EventBadges";

const categoryLabel = {
  maker: "Maker",
  food: "Food",
  beverage: "Beverage",
  truck: "Truck",
} as const;

export function VendorsDirectory() {
  const state = usePublicEventCatalog();
  const [params] = useSearchParams();
  if (state.status === "loading") return <CatalogLoading />;
  if (state.status === "error") return <CatalogError message={state.message} />;

  const filters = readDiscoveryFilters(params);
  const vendors = filteredVendors(state.catalog, filters);
  const choices = filterChoices(state.catalog);

  return (
    <section>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Vendors</p>
      <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Vendors</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Makers, food, beverage, and trucks in one directory. Profile links use the stored food-truck slug when a fixture has a business id. Imported drafts stay on this list without a profile route.
      </p>
      <DiscoveryFilters cities={choices.cities} markets={choices.markets} />
      {vendors.length === 0 ? (
        <CatalogEmpty
          title="No synthetic demo vendors match"
          body="This directory is the fixture set for makers, food, beverage, and trucks."
        />
      ) : (
        <ul className="mt-8 grid gap-4">
          {vendors.map((view) => {
            const listed = view.appearances.filter((item) => item.visibility === "listed");
            const name = view.vendor.businessId && view.vendor.profileSlug ? (
              <Link to={foodTruckProfilePath(view.vendor.profileSlug)} className="hover:text-primary">
                {view.vendor.displayName}
              </Link>
            ) : (
              view.vendor.displayName
            );
            return (
              <li key={`${view.vendor.businessId ?? "draft"}-${view.vendor.displayName}`} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {categoryLabel[view.vendor.category]} · {view.vendor.city}
                  </span>
                  <ListingOriginBadge origin={view.vendor.listingOrigin} />
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold">{name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{view.vendor.summary}</p>
                {listed.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No published sourced appearance in this fixture.</p>
                ) : (
                  <ul className="mt-3 space-y-1 text-sm">
                    {listed.map((item) => (
                      <li key={item.appearance.appearance.id}>
                        {item.series ? (
                          <Link className="font-semibold text-primary hover:underline" to={occurrencePath(item.series, item.occurrence)}>
                            {item.dateLabel} · {item.occurrence.title}
                          </Link>
                        ) : (
                          item.occurrence.title
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
