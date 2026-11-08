import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Filter } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { InventoryKindBadge } from "@/components/site/InventoryKindBadge";
import { isSampleInventory } from "@/lib/listingPresentation";

type Ev = {
  id: string; title: string; tag: string | null;
  location: string | null; event_date: string | null;
  start_time: string | null; end_time: string | null;
  is_demo?: boolean | null;
  businesses?: { slug?: string | null; name?: string | null; is_demo?: boolean | null } | null;
};

export default function PublicCalendar() {
  useSEO({
    title: "Local Event Calendar | FoodXMobile",
    description: "Browse public events saved on FoodXMobile. Demo events are labeled. Times are saved on the event, not a live update.",
  });

  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState<string>("all");
  const [selected, setSelected] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("business_events")
      .select("id,title,tag,location,event_date,start_time,end_time,is_demo,businesses(slug,name,is_demo)")
      .eq("is_public", true)
      .gte("event_date", today)
      .order("event_date")
      .limit(200)
      .then(({ data }) => { setEvents((data ?? []) as any); setLoading(false); });
  }, []);

  const tags = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.tag && set.add(e.tag));
    return Array.from(set);
  }, [events]);

  const filtered = useMemo(() => events.filter((e) => {
    if (tag !== "all" && e.tag !== tag) return false;
    if (selected && e.event_date !== selected.toISOString().slice(0, 10)) return false;
    return true;
  }), [events, tag, selected]);

  const eventDates = useMemo(() => {
    const set = new Set(events.map((e) => e.event_date).filter(Boolean) as string[]);
    return Array.from(set).map((d) => new Date(d + "T00:00:00"));
  }, [events]);

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader withBanner />
      <main className="pt-28 pb-20 md:pt-36">
        <div className="container-tight">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Local calendar</p>
              <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Upcoming events</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">Public events saved on listings. Demo events are sample content. A verified label means the event is not marked demo, not that the time was confirmed today.</p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All event types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All event types</SelectItem>
                  {tags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {selected && (
                <button onClick={() => setSelected(undefined)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
                  Clear date
                </button>
              )}
            </div>
          </div>

          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">List view</TabsTrigger>
              <TabsTrigger value="month">Month view</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading events…</p>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                  No public events match your filters yet.
                </div>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {filtered.map((e) => {
                    const inner = (
                      <>
                        <div className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-secondary text-secondary-foreground">
                          <div className="text-center leading-none">
                            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{e.event_date ? new Date(e.event_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }) : ""}</div>
                            <div className="font-display text-base font-bold">{e.event_date ? new Date(e.event_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</div>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <InventoryKindBadge subject="event" isDemo={isSampleInventory(e.is_demo, e.businesses?.is_demo)} />
                          {e.tag && <span className="ml-2 rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">{e.tag}</span>}
                          <h3 className="mt-1.5 font-display text-lg font-semibold leading-tight">{e.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {e.location}
                            {e.start_time ? ` · ${e.start_time}${e.end_time ? `–${e.end_time}` : ""}` : ""}
                            {e.businesses?.name ? ` · ${e.businesses.name}` : ""}
                          </p>
                        </div>
                        {e.businesses?.slug && <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:text-primary md:block" />}
                      </>
                    );
                    return (
                      <li key={e.id} className="group">
                        {e.businesses?.slug ? (
                          <Link to={`/food-trucks/${e.businesses.slug}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-5 p-5 transition hover:bg-muted/50">{inner}</Link>
                        ) : (
                          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5 p-5">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="month" className="mt-6">
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <div className="rounded-2xl border border-border bg-card p-3">
                  <Calendar mode="single" selected={selected} onSelect={setSelected}
                    modifiers={{ hasEvent: eventDates }}
                    modifiersClassNames={{ hasEvent: "bg-primary/15 text-primary font-bold rounded-md" }}
                    className="pointer-events-auto" />
                </div>
                <div className="space-y-3">
                  {selected ? (
                    filtered.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
                        No events on {selected.toLocaleDateString()}.
                      </div>
                    ) : filtered.map((e) => (
                      <div key={e.id} className="rounded-xl border border-border bg-card p-4">
                        <InventoryKindBadge subject="event" isDemo={isSampleInventory(e.is_demo, e.businesses?.is_demo)} />
                        {e.tag && <span className="ml-2 rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">{e.tag}</span>}
                        <h3 className="mt-1.5 font-display text-base font-semibold">{e.title}</h3>
                        <p className="text-xs text-muted-foreground">{e.location}{e.start_time ? ` · ${e.start_time}${e.end_time ? `–${e.end_time}` : ""}` : ""}</p>
                        {e.businesses?.slug && <Link to={`/food-trucks/${e.businesses.slug}`} className="mt-2 inline-flex items-center text-xs font-semibold text-primary">View vendor →</Link>}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
                      <CalendarDays className="mx-auto h-6 w-6" />
                      <p className="mt-2 text-sm">Select a highlighted date to see events.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}