import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { resolveImage } from "@/lib/assets";
import { ArrowUpRight, Clock, MapPin, Search, ShoppingBag, Briefcase, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  city: string | null;
  ordering_enabled: boolean;
  online_ordering_url: string | null;
  order_button_label: string | null;
};

type Category = { id: string; name: string; slug: string; emoji: string | null; parent_id: string | null };

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
  const { categorySlug, specialtySlug } = useParams<{ categorySlug?: string; specialtySlug?: string }>();
  const [list, setList] = useState<Biz[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subPivot, setSubPivot] = useState<Array<{ business_id: string; category_id: string }>>([]);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [subcategoryId, setSubcategoryId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "soon" | "closed">("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>("all");

  const parentCats = categories.filter((c) => !c.parent_id);
  const childrenOf = (pid: string) => categories.filter((c) => c.parent_id === pid);

  const activeParent = parentCats.find((c) => c.id === categoryId);
  const activeSub = categories.find((c) => c.id === subcategoryId && c.parent_id);

  const seoTitle = activeSub
    ? `${activeSub.name} Food Trucks — FoodXMobile`
    : activeParent
    ? `${activeParent.name} Food Trucks — FoodXMobile`
    : "Food Trucks in Green Bay — FoodXMobile Directory";
  const seoDesc = activeSub
    ? `Find ${activeSub.name.toLowerCase()} food trucks. Locations, menus, and catering — all in one place.`
    : activeParent
    ? `Browse ${activeParent.name.toLowerCase()} food trucks. Today's locations, hours, and catering.`
    : "Browse every food truck in Green Bay. See today's locations, hours, cuisines, and order or book catering — all in one place.";
  useSEO({ title: seoTitle, description: seoDesc });

  useEffect(() => {
    supabase
      .from("businesses")
      .select("id,slug,name,tagline,cuisine,emoji,hero_image_url,today_location,today_hours,status,is_featured,category_id,city,ordering_enabled,online_ordering_url,order_button_label")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true })
      .then(({ data }) => setList((data ?? []) as Biz[]));
    supabase
      .from("business_categories")
      .select("id,name,slug,emoji,parent_id")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data ?? []) as Category[]));
    (supabase as any)
      .from("business_subcategories")
      .select("business_id,category_id")
      .then(({ data }: any) => setSubPivot((data ?? []) as Array<{ business_id: string; category_id: string }>));
  }, []);

  // Apply route params (/category/:slug, /specialty/:slug) once categories loaded
  useEffect(() => {
    if (categories.length === 0) return;
    if (categorySlug) {
      const match = categories.find((c) => c.slug === categorySlug && !c.parent_id);
      if (match) { setCategoryId(match.id); setSubcategoryId("all"); }
    } else if (specialtySlug) {
      const match = categories.find((c) => c.slug === specialtySlug && c.parent_id);
      if (match) { setCategoryId(match.parent_id!); setSubcategoryId(match.id); }
    }
  }, [categorySlug, specialtySlug, categories]);

  // Build set of business_ids matching selected subcategory
  const subFilteredBizIds = subcategoryId !== "all"
    ? new Set(subPivot.filter((p) => p.category_id === subcategoryId).map((p) => p.business_id))
    : null;

  const filtered = (list ?? []).filter((t) => {
    if (q && !(t.name + " " + (t.cuisine ?? "") + " " + (t.today_location ?? "") + " " + (t.city ?? "")).toLowerCase().includes(q.toLowerCase())) return false;
    if (categoryId !== "all" && t.category_id !== categoryId) return false;
    if (subFilteredBizIds && !subFilteredBizIds.has(t.id)) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (featuredOnly && !t.is_featured) return false;
    if (cityFilter !== "all" && (t.city ?? "") !== cityFilter) return false;
    return true;
  });

  const cities = Array.from(new Set((list ?? []).map((t) => t.city).filter(Boolean) as string[])).sort();
  const hasActiveFilters = !!q || categoryId !== "all" || subcategoryId !== "all" || statusFilter !== "all" || featuredOnly || cityFilter !== "all";
  function clearFilters() { setQ(""); setCategoryId("all"); setSubcategoryId("all"); setStatusFilter("all"); setFeaturedOnly(false); setCityFilter("all"); }

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader withBanner />

      <section className="pt-32 pb-10">
        <div className="container-tight">
          <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live directory</span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-tight md:text-6xl">
            All food trucks on the <em className="text-primary not-italic">Bay</em>.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Every truck on FoodXMobile. Updated daily. Tap any truck for menu, location, and catering.
          </p>

          <div data-tour="directory-filters" className="mt-8 flex max-w-md items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-soft">
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
            <button
              onClick={() => setFeaturedOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                featuredOnly
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/70 hover:border-foreground/30"
              }`}
            >
              <Sparkles className="h-3 w-3" /> Featured
            </button>
            {cities.length > 1 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 hover:border-foreground/30"
              >
                <option value="all">All cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {parentCats.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => { setCategoryId("all"); setSubcategoryId("all"); }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  categoryId === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/70 hover:border-foreground/30"
                }`}
              >
                All cuisines
              </button>
              {parentCats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategoryId(c.id); setSubcategoryId("all"); }}
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

          {activeParent && childrenOf(activeParent.id).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-l-2 border-primary/30 pl-3">
              <span className="self-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Specialty:</span>
              <button
                onClick={() => setSubcategoryId("all")}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  subcategoryId === "all"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground/70 hover:border-foreground/30"
                }`}
              >
                All
              </button>
              {childrenOf(activeParent.id).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubcategoryId(s.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    subcategoryId === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground/70 hover:border-foreground/30"
                  }`}
                >
                  {s.emoji && <span className="mr-1">{s.emoji}</span>}
                  {s.name}
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
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <p className="font-display text-xl font-semibold">No trucks match your filters</p>
              <p className="mt-2 text-sm text-muted-foreground">Try widening your search or clearing filters.</p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" className="mt-5 rounded-full">
                  <X className="mr-1.5 h-3.5 w-3.5" /> Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => (
                <div key={t.id} className="group overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:shadow-card">
                  <Link to={`/food-trucks/${t.slug}`} className="block">
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
                        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                          <Sparkles className="h-3 w-3" /> Featured
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-5">
                    <Link to={`/food-trucks/${t.slug}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-xl font-semibold leading-tight">
                          {t.emoji && <span className="mr-1.5">{t.emoji}</span>}
                          {t.name}
                        </h3>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                      </div>
                      {t.tagline && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.tagline}</p>}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {t.today_location && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {t.today_location}</p>}
                          {!t.today_location && t.city && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {t.city}</p>}
                          {t.today_hours && <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {t.today_hours}</p>}
                        </div>
                        <StatusDot status={t.status} />
                      </div>
                    </Link>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      {t.ordering_enabled && t.online_ordering_url && (
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <a href={t.online_ordering_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                            <ShoppingBag className="mr-1.5 h-3 w-3" /> {t.order_button_label || "Order"}
                          </a>
                        </Button>
                      )}
                      <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link to={`/book/${t.slug}`} onClick={(e) => e.stopPropagation()}>
                          <Briefcase className="mr-1.5 h-3 w-3" /> Book this truck
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}