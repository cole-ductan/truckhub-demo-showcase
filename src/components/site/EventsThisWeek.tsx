import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InventoryKindBadge } from "@/components/site/InventoryKindBadge";
import { isSampleInventory } from "@/lib/listingPresentation";

type Ev = {
  id: string; title: string; tag: string | null;
  location: string | null; event_date: string | null;
  start_time: string | null; end_time: string | null;
  is_demo?: boolean | null;
  businesses?: { slug?: string | null; name?: string | null; is_demo?: boolean | null } | null;
};

function weekRange() {
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export function EventsThisWeek() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { start, end } = weekRange();
    supabase
      .from("business_events")
      .select("id,title,tag,location,event_date,start_time,end_time,is_demo,businesses(slug,name,is_demo)")
      .eq("is_public", true)
      .gte("event_date", start)
      .lte("event_date", end)
      .order("event_date")
      .limit(8)
      .then(({ data }) => { setEvents((data ?? []) as any); setLoading(false); });
  }, []);

  return (
    <section className="py-16 md:py-20">
      <div className="container-tight">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">On the calendar</p>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Events This Week</h2>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/calendar">View Full Calendar <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>

        {!loading && events.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">No public events are saved for this week. This list is not a continuous feed.</p>
            <Button asChild className="mt-5 rounded-full"><Link to="/calendar">Open full calendar</Link></Button>
          </div>
        ) : (
          <ul className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {events.map((e) => {
              const inner = (
                <>
                  <div className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <div className="text-center leading-none">
                      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        {e.event_date ? new Date(e.event_date).toLocaleDateString("en-US", { weekday: "short" }) : ""}
                      </div>
                      <div className="font-display text-base font-bold">
                        {e.event_date ? new Date(e.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="mr-2 inline-flex"><InventoryKindBadge subject="event" isDemo={isSampleInventory(e.is_demo, e.businesses?.is_demo)} /></span>
                    {e.tag && <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">{e.tag}</span>}
                    <h3 className="mt-1.5 font-display text-lg font-semibold leading-tight">{e.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {e.location}{e.start_time ? ` · ${e.start_time}${e.end_time ? `–${e.end_time}` : ""}` : ""}
                      {e.businesses?.name ? ` · ${e.businesses.name}` : ""}
                    </p>
                  </div>
                  {e.businesses?.slug && <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:text-primary md:block" />}
                </>
              );
              return (
                <li key={e.id} className="group">
                  {e.businesses?.slug ? (
                    <Link to={`/food-trucks/${e.businesses.slug}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-5 p-5 transition hover:bg-muted/50">
                      {inner}
                    </Link>
                  ) : (
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5 p-5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!loading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Public events saved on listings. Not a live feed.
          </div>
        )}
      </div>
    </section>
  );
}