import { Link } from "react-router-dom";
import type { SeriesView } from "@/lib/events/catalog";
import { marketPath } from "@/lib/events/paths";
import { OccurrenceList } from "./OccurrenceList";

export function EventSeriesView({ view }: { view: SeriesView }) {
  const { series, organizer, venue, listed, review } = view;
  return (
    <article>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Event series</p>
      <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">{series.title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {series.category ? `${series.category}. ` : ""}
        Dates below are the stored occurrences. The recurrence note is a human description and does not generate extra dates.
      </p>
      {series.recurrenceNotes ? (
        <blockquote className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          {series.recurrenceNotes}
        </blockquote>
      ) : null}
      <dl className="mt-4 space-y-1 text-sm text-muted-foreground">
        {organizer ? (
          <div>
            Organizer: <Link className="font-semibold text-primary hover:underline" to={marketPath(organizer)}>{organizer.name}</Link>
          </div>
        ) : null}
        {venue ? <div>Venue: {venue.name}{venue.city ? ` · ${venue.city}` : ""}</div> : null}
      </dl>
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Occurrences</h2>
        {listed.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No published occurrence is stored on this series.</p>
        ) : (
          <OccurrenceList items={listed} />
        )}
      </section>
      {review.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Held for review</h2>
          <OccurrenceList items={review} />
        </section>
      ) : null}
      <p className="mt-8">
        <Link to="/events" className="text-sm font-semibold text-primary hover:underline">All events</Link>
      </p>
    </article>
  );
}
