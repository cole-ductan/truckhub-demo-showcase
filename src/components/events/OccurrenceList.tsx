import { Link } from "react-router-dom";
import type { OccurrenceModel } from "@/lib/events/catalog";
import { marketPath, occurrencePath, seriesPath } from "@/lib/events/paths";
import { FreshnessBadge, PublicationBadge, TimeUnconfirmedBadge } from "./EventBadges";

export function OccurrenceList({ items }: { items: OccurrenceModel[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item) => {
        const title = item.series ? (
          <Link to={occurrencePath(item.series, item.occurrence)} className="hover:text-primary">
            {item.occurrence.title}
          </Link>
        ) : (
          item.occurrence.title
        );
        return (
          <li key={item.occurrence.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <div className="grid h-16 w-20 flex-none place-items-center rounded-xl bg-secondary text-center text-secondary-foreground">
              <div className="leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{item.dateLabel.split(",")[0]}</div>
                <div className="font-display text-sm font-bold">{item.dateKey.slice(5)}</div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                <PublicationBadge state={item.occurrence.publicationState} />
                {item.occurrence.timeUnconfirmed ? <TimeUnconfirmedBadge /> : null}
                <FreshnessBadge freshness={item.freshness} />
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold leading-tight">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.dateLabel} · {item.timeLabel}
                {item.venue?.city ? ` · ${item.venue.city}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.venue?.name}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                {item.series ? <Link className="text-primary hover:underline" to={seriesPath(item.series)}>Series</Link> : null}
                {item.market ? <Link className="text-primary hover:underline" to={marketPath(item.market)}>{item.market.name}</Link> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
