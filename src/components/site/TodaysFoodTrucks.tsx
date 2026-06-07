import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/assets";
import { Button } from "@/components/ui/button";

type Truck = {
  id: string; slug: string; name: string; tagline: string | null; cuisine: string | null;
  emoji: string | null; hero_image_url: string | null;
  today_location: string | null; today_hours: string | null;
  status: "open" | "soon" | "closed"; is_featured: boolean;
};

const StatusDot = ({ status }: { status: Truck["status"] }) => {
  const map = {
    open: { bg: "bg-emerald-500", label: "Serving now" },
    soon: { bg: "bg-amber-500", label: "Opens later today" },
    closed: { bg: "bg-muted-foreground/40", label: "Closed today" },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span className={`relative inline-flex h-2 w-2 rounded-full ${s.bg}`}>
        {status === "open" && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />}
      </span>
      {s.label}
    </span>
  );
};

export function TodaysFoodTrucks() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("id,slug,name,tagline,cuisine,emoji,hero_image_url,today_location,today_hours,status,is_featured")
      .eq("is_published", true)
      .in("status", ["open", "soon"])
      .order("is_featured", { ascending: false })
      .order("status")
      .limit(6)
      .then(({ data }) => { setTrucks((data ?? []) as Truck[]); setLoading(false); });
  }, []);

  return (
    <section className="bg-cream-deep py-16 md:py-20">
      <div className="container-tight">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Today on the hub</p>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Today's Food Trucks</h2>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/food-trucks">Browse all <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>

        {!loading && trucks.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">No food trucks are currently scheduled for today. Browse all food trucks or check upcoming events.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild className="rounded-full"><Link to="/food-trucks">Browse Food Trucks</Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link to="/calendar">Upcoming Events</Link></Button>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trucks.map((t) => (
              <Link key={t.id} to={`/food-trucks/${t.slug}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:shadow-card">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img src={resolveImage(t.hero_image_url)} alt={t.name} loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  {t.cuisine && (
                    <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
                      {t.cuisine.split("·")[0].trim()}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold leading-tight">
                      {t.emoji && <span className="mr-1.5">{t.emoji}</span>}{t.name}
                    </h3>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  {t.tagline && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.tagline}</p>}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {t.today_location && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {t.today_location}</p>}
                      {t.today_hours && <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {t.today_hours}</p>}
                    </div>
                    <StatusDot status={t.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}