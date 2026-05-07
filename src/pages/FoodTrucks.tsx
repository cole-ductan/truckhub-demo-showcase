import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { resolveImage } from "@/lib/assets";
import { ArrowUpRight, Clock, MapPin, Search } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

type Biz = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  cuisine: string | null;
  emoji: string | null;
  hero_image_url: string | null;
  today_location: string | null;
  today_hours: string | null;
  status: "open" | "soon" | "closed";
  is_featured: boolean;
  category_id: string | null;
};

type Category = { id: string; name: string; slug: string; emoji: string | null };

const StatusDot = ({ status }: { status: Biz["status"] }) => {
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

export default function FoodTrucks() {
  const [list, setList] = useState<Biz[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "soon" | "closed">("all");

  useSEO({
    title: "Food Trucks in Green Bay — TruckHub Directory",
    description: "Browse every food truck in Green Bay. See today's locations, hours, cuisines, and order or book catering — all in one place.",
  });

  useEffect(() => {
    supabase
      .from("businesses")
      .select("id,slug,name,tagline,cuisine,emoji,hero_image_url,today_location,today_hours,status,is_featured,category_id")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true })
      .then(({ data }) => setList((data ?? []) as Biz[]));
    supabase
      .from("business_categories")
      .select("id,name,slug,emoji")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  const filtered = (list ?? []).filter((t) => {
    if (q && !(t.name + " " + (t.cuisine ?? "")).toLowerCase().includes(q.toLowerCase())) return false;
    if (categoryId !== "all" && t.category_id !== categoryId) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader />

      <section className="pt-32 pb-10">
        <div className="container-tight">
          <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live directory</span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-tight md:text-6xl">
            All food trucks on the <em className="text-primary not-italic">Bay</em>.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Every truck on TruckHub Green Bay. Updated daily. Tap any truck for menu, location, and catering.
          </p>

          <div className="mt-8 flex max-w-md items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-soft">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search trucks or cuisine…"
              className="h-9 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["all", "open", "soon", "closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                  statusFilter === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/70 hover:border-foreground/30"
                }`}
              >
                {s === "all" ? "All status" : s === "open" ? "Open now" : s === "soon" ? "Opening soon" : "Closed"}
              </button>
            ))}
          </div>

          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryId("all")}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  categoryId === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/70 hover:border-foreground/30"
                }`}
              >
                All cuisines
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    categoryId === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground/70 hover:border-foreground/30"
                  }`}
                >
                  {c.emoji && <span className="mr-1">{c.emoji}</span>}
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pb-24">
        <div className="container-tight">
          {list === null ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No trucks match your search.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => (
                <Link
                  key={t.id}
                  to={`/food-trucks/${t.slug}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:shadow-card"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={resolveImage(t.hero_image_url)}
                      alt={t.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    {t.cuisine && (
                      <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
                        {t.cuisine.split("·")[0].trim()}
                      </div>
                    )}
                    {t.is_featured && (
                      <div className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                        Featured
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl font-semibold leading-tight">
                        {t.emoji && <span className="mr-1.5">{t.emoji}</span>}
                        {t.name}
                      </h3>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                    </div>
                    {t.tagline && <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>}
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

      <SiteFooter />
    </div>
  );
}