import { Link } from "react-router-dom";
import type { MarketView } from "@/lib/events/catalog";
import { foodTruckProfilePath, seriesPath } from "@/lib/events/paths";
import { ListingOriginBadge, MarketKindBadge } from "./EventBadges";
import { OccurrenceList } from "./OccurrenceList";

export function MarketDetailView({ view }: { view: MarketView }) {
  const { market, venue, listed, review, vendors } = view;
  return (
    <article>
      <div className="mt-8 flex flex-wrap gap-2">
        <MarketKindBadge kind={market.kind} />
      </div>
      <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">{market.name}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {venue ? `${venue.name}${venue.city ? ` · ${venue.city}` : ""}` : "No single venue is stored on this record."}
      </p>
      {venue?.address ? <p className="mt-1 text-sm text-muted-foreground">{venue.address}</p> : null}
      {venue && !venue.address ? <p className="mt-1 text-sm text-muted-foreground">Address not on file for this fixture.</p> : null}
      {market.publicSourceUrl ? (
        <p className="mt-3 text-sm">
          <a className="font-semibold text-primary hover:underline" href={market.publicSourceUrl}>Fixture source</a>
        </p>
      ) : null}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Occurrences</h2>
        {listed.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No published occurrence in this fixture.</p>
        ) : (
          <OccurrenceList items={listed} />
        )}
      </section>
      {review.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Held for review</h2>
          <p className="mt-2 text-sm text-muted-foreground">Unresolved fixture reports stay side by side. No address or hours are selected.</p>
          <OccurrenceList items={review} />
        </section>
      ) : null}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Sourced vendors</h2>
        {vendors.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sourced vendor appearances on published dates.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card px-4">
            {vendors.map((vendor) => (
              <li key={vendor.displayName} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="font-semibold">
                  {vendor.businessId && vendor.profileSlug ? (
                    <Link to={foodTruckProfilePath(vendor.profileSlug)} className="hover:text-primary">{vendor.displayName}</Link>
                  ) : (
                    vendor.displayName
                  )}
                </span>
                <ListingOriginBadge origin={vendor.listingOrigin} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-8 text-sm">
        <Link to="/markets" className="font-semibold text-primary hover:underline">All markets</Link>
        {listed[0]?.series ? (
          <>
            {" · "}
            <Link to={seriesPath(listed[0].series)} className="font-semibold text-primary hover:underline">Event series</Link>
          </>
        ) : null}
      </p>
    </article>
  );
}
