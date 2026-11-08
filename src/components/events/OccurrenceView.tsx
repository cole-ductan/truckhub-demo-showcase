import { Link } from "react-router-dom";
import type { OccurrenceModel } from "@/lib/events/catalog";
import { marketPath, seriesPath } from "@/lib/events/paths";
import { AppearanceRow } from "./AppearanceLinks";
import { FreshnessBadge, PublicationBadge, TimeUnconfirmedBadge } from "./EventBadges";

export function OccurrenceView({ model }: { model: OccurrenceModel }) {
  const { occurrence, venue, market, series, organizer, conflict } = model;
  return (
    <article>
      <div className="mt-8 flex flex-wrap gap-1.5">
        <PublicationBadge state={occurrence.publicationState} />
        {occurrence.timeUnconfirmed ? <TimeUnconfirmedBadge /> : null}
        <FreshnessBadge freshness={model.freshness} />
      </div>
      <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">{occurrence.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        {model.dateLabel} · {model.timeLabel}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">America/Chicago</p>
      {occurrence.cancellationState === "cancelled" ? (
        <p className="mt-4 rounded-2xl border border-destructive/30 bg-card p-4 text-sm">
          This date is an explicit cancellation in the fixture.
        </p>
      ) : null}
      {model.visibility === "review" ? (
        <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
          Held for review. This page keeps every fixture report and does not select a winner.
        </p>
      ) : null}
      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold">Venue</h2>
        <p className="mt-2 text-sm text-muted-foreground">{venue?.name ?? "Venue missing from the fixture."}</p>
        {venue?.address ? <p className="text-sm text-muted-foreground">{venue.address}</p> : <p className="text-sm text-muted-foreground">Address not on file for this fixture.</p>}
        {venue?.city ? <p className="text-sm text-muted-foreground">{venue.city}</p> : null}
      </section>
      {conflict ? (
        <section className="mt-8" aria-label="Unresolved source conflict">
          <h2 className="font-display text-2xl font-semibold">Unresolved source conflict</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {conflict.topic}. Status: {conflict.status}. Both reports stay visible. The fixture does not select an address or hours.
          </p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {conflict.reports.map((report) => (
              <li key={report.id} className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-display text-lg font-semibold">{report.sourceLabel}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{report.summary}</p>
                <a className="mt-3 inline-block text-xs font-semibold text-primary hover:underline" href={report.sourceUrl}>
                  {report.sourceLabel} fixture URL
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold">Sourced appearances</h2>
        <p className="mt-2 text-sm text-muted-foreground">Freshness and claimed or imported badges read fixture flags.</p>
        {model.appearances.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sourced vendor appearances for this date.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card px-4">
            {model.appearances.map((item) => (
              <AppearanceRow key={item.appearance.id} item={item} />
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8 text-sm text-muted-foreground">
        <p>Fixture timestamp: {model.verifiedAtLabel}</p>
        <p className="mt-2">{occurrence.provenance}</p>
        <p className="mt-2">
          <a className="font-semibold text-primary hover:underline" href={occurrence.publicSourceUrl}>Public fixture source</a>
        </p>
      </section>
      <p className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
        {series ? <Link className="text-primary hover:underline" to={seriesPath(series)}>Event series</Link> : null}
        {market ? <Link className="text-primary hover:underline" to={marketPath(market)}>{market.name}</Link> : null}
        {organizer ? <Link className="text-primary hover:underline" to={marketPath(organizer)}>{organizer.name}</Link> : null}
        <Link className="text-primary hover:underline" to="/events">All events</Link>
      </p>
    </article>
  );
}
