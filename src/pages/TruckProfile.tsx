import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { Button } from "@/components/ui/button";
import { resolveImage } from "@/lib/assets";
import { ArrowLeft, Briefcase, Calendar, Clock, Facebook, Flame, Globe, Instagram, Mail, MapPin, MessageSquare, Phone, ShoppingBag } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

type Biz = {
  id: string; slug: string; name: string; tagline: string | null; description: string | null;
  cuisine: string | null; emoji: string | null; hero_image_url: string | null; category_id: string | null;
  logo_url: string | null;
  phone: string | null; email: string | null; website: string | null;
  instagram: string | null; facebook: string | null;
  today_location: string | null; today_hours: string | null;
  status: "open" | "soon" | "closed";
  online_ordering_url: string | null; order_button_label: string | null; ordering_enabled: boolean;
  listing_status: string; owner_id: string | null;
};
type MenuCat = { id: string; name: string; sort_order: number };
type MenuItem = { id: string; category_id: string; name: string; description: string | null; price: string | null; sort_order: number; is_featured: boolean };
type Event = { id: string; kind: "weekly" | "one_off"; title: string; weekday: string | null; start_time: string | null; end_time: string | null; location: string | null; tag: string | null; event_date: string | null };
type Photo = { id: string; url: string };
type SavedLoc = {
  id: string; label: string; address: string | null; weekday: string | null;
  start_time: string | null; end_time: string | null; is_recurring: boolean; sort_order: number;
};
type CategoryRef = { id: string; name: string; slug: string; emoji: string | null; parent_id: string | null };

const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TruckProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [biz, setBiz] = useState<Biz | null | "missing">(null);
  const [cats, setCats] = useState<MenuCat[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [savedLocs, setSavedLocs] = useState<SavedLoc[]>([]);
  const [primaryCat, setPrimaryCat] = useState<CategoryRef | null>(null);
  const [specialties, setSpecialties] = useState<CategoryRef[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // Public allowlist — never select admin-only fields (outreach_email, internal_notes, etc.)
      const PUBLIC_FIELDS = [
        "id", "slug", "name", "tagline", "description",
        "cuisine", "emoji", "hero_image_url", "category_id", "logo_url",
        "phone", "email", "website", "instagram", "facebook",
        "today_location", "today_hours", "status",
        "online_ordering_url", "order_button_label", "ordering_enabled",
        "listing_status", "owner_id",
      ].join(",");
      const { data: b } = await supabase
        .from("businesses")
        .select(PUBLIC_FIELDS)
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle<Biz>();
      if (!b) { setBiz("missing"); return; }
      setBiz(b as Biz);
      const [{ data: c }, { data: it }, { data: ev }, { data: ph }, { data: sl }] = await Promise.all([
        supabase.from("menu_categories").select("*").eq("business_id", b.id).order("sort_order"),
        supabase.from("menu_items").select("*").eq("business_id", b.id).order("sort_order"),
        supabase.from("business_events").select("*").eq("business_id", b.id).eq("is_public", true),
        supabase.from("business_photos").select("id,url").eq("business_id", b.id).order("sort_order"),
        (supabase as any).from("saved_locations").select("*").eq("business_id", b.id).order("sort_order"),
      ]);
      setCats((c ?? []) as MenuCat[]);
      setItems((it ?? []) as MenuItem[]);
      setEvents((ev ?? []) as Event[]);
      setPhotos((ph ?? []) as Photo[]);
      setSavedLocs((sl ?? []) as SavedLoc[]);

      // Categories: primary + specialties
      const [{ data: primary }, { data: subRows }] = await Promise.all([
        b.category_id
          ? supabase.from("business_categories").select("id,name,slug,emoji,parent_id").eq("id", b.category_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        (supabase as any).from("business_subcategories").select("category_id").eq("business_id", b.id),
      ]);
      setPrimaryCat((primary as CategoryRef) ?? null);
      const subIds = ((subRows ?? []) as any[]).map((r) => r.category_id);
      if (subIds.length > 0) {
        const { data: subCats } = await supabase
          .from("business_categories")
          .select("id,name,slug,emoji,parent_id")
          .in("id", subIds);
        setSpecialties((subCats ?? []) as CategoryRef[]);
      } else {
        setSpecialties([]);
      }
    })();
  }, [slug]);

  const bizLoaded = biz && biz !== "missing" ? biz : null;
  const seoTitle = bizLoaded
    ? `${bizLoaded.name} — Food Truck in Green Bay, WI`
    : "Food Truck — FoodXMobile";
  const seoDesc = bizLoaded
    ? (bizLoaded.description?.slice(0, 155) || bizLoaded.tagline || `${bizLoaded.name}: ${bizLoaded.cuisine ?? "food truck"} in Green Bay.`)
    : "Discover food trucks in Green Bay, WI.";
  const seoImage = bizLoaded ? resolveImage(bizLoaded.hero_image_url) : undefined;
  const seoJsonLd = bizLoaded
    ? {
        "@context": "https://schema.org",
        "@type": "FoodEstablishment",
        name: bizLoaded.name,
        description: bizLoaded.description || bizLoaded.tagline || undefined,
        image: resolveImage(bizLoaded.hero_image_url),
        servesCuisine: bizLoaded.cuisine || undefined,
        telephone: bizLoaded.phone || undefined,
        email: bizLoaded.email || undefined,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        address: { "@type": "PostalAddress", addressLocality: "Green Bay", addressRegion: "WI", addressCountry: "US" },
        sameAs: [bizLoaded.website, bizLoaded.instagram, bizLoaded.facebook].filter(Boolean),
      }
    : undefined;
  useSEO({ title: seoTitle, description: seoDesc, image: seoImage, jsonLd: seoJsonLd });

  if (biz === null) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (biz === "missing")
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="font-display text-2xl">Truck not found</p>
          <Link to="/food-trucks" className="mt-3 inline-block text-primary hover:underline">← Back to all trucks</Link>
        </div>
      </div>
    );

  const weekly = events.filter((e) => e.kind === "weekly").sort(
    (a, b) => weekdayOrder.indexOf(a.weekday ?? "") - weekdayOrder.indexOf(b.weekday ?? ""),
  );
  const upcoming = events.filter((e) => e.kind === "one_off").sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));

  const heroImg = resolveImage(biz.hero_image_url);
  const logoImg = biz.logo_url ? resolveImage(biz.logo_url) : null;
  const showOrdering = biz.ordering_enabled && !!biz.online_ordering_url;
  const recurringLocs = [...savedLocs]
    .filter((l) => l.is_recurring && l.weekday)
    .sort((a, b) => weekdayOrder.indexOf(a.weekday ?? "") - weekdayOrder.indexOf(b.weekday ?? ""));
  // Merge weekly events + recurring saved locations into a unified weekly schedule
  const weeklySchedule: Array<{ id: string; weekday: string; location: string | null; start_time: string | null; end_time: string | null; source: "event" | "location" }> = [
    ...weekly.map((w) => ({ id: w.id, weekday: w.weekday ?? "", location: w.location, start_time: w.start_time, end_time: w.end_time, source: "event" as const })),
    ...recurringLocs.map((l) => ({ id: l.id, weekday: l.weekday ?? "", location: l.address ? `${l.label} · ${l.address}` : l.label, start_time: l.start_time, end_time: l.end_time, source: "location" as const })),
  ].sort((a, b) => weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday));

  const statusBadge =
    biz.status === "open"
      ? { label: "Open now", dot: "bg-emerald-400" }
      : biz.status === "soon"
      ? { label: "Opening soon", dot: "bg-amber-400" }
      : { label: "Closed", dot: "bg-muted-foreground" };

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader />

      <div className="bg-primary/10 pt-20">
        <div className="container-tight flex items-center justify-between gap-4 py-3 text-xs">
          <Link to="/food-trucks" className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> All trucks
          </Link>
          <div className="flex items-center gap-3">
            {biz.listing_status === "unclaimed" && !biz.owner_id && (
              <Link
                to={`/food-trucks/${biz.slug}/claim`}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground hover:bg-secondary/90"
              >
                Own this business? Claim this listing
              </Link>
            )}
            <span className="text-muted-foreground">Live page · powered by FoodXMobile</span>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section data-tour="truck-hero" className="relative overflow-hidden bg-ink text-ink-foreground">
        <div className="absolute inset-0">
          <img src={heroImg} alt={biz.name} className="h-full w-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/70 to-ink" />
        </div>
        <div className="container-tight relative py-20 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cream/85 backdrop-blur">
              <Flame className="h-3 w-3 text-primary-glow" /> Green Bay · {biz.cuisine ?? "Food Truck"}
            </span>
            <div className="mt-6 flex items-center gap-5">
              {logoImg && (
                <img
                  src={logoImg}
                  alt={`${biz.name} logo`}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-cream/20 bg-cream/10 object-cover backdrop-blur md:h-24 md:w-24"
                />
              )}
              <h1 className="font-display text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[0.95] text-cream">
                {biz.emoji && <span className="mr-3">{biz.emoji}</span>}
                {biz.name}
              </h1>
            </div>
            {biz.description && <p className="mt-5 max-w-xl text-lg text-cream/85">{biz.description}</p>}
            {!biz.description && biz.tagline && <p className="mt-5 max-w-xl text-lg text-cream/85">{biz.tagline}</p>}

            {(primaryCat || specialties.length > 0) && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {primaryCat && (
                  <Link to={`/category/${primaryCat.slug}`}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
                    {primaryCat.emoji && <span>{primaryCat.emoji}</span>}{primaryCat.name}
                  </Link>
                )}
                {specialties.map((s) => (
                  <Link key={s.id} to={`/specialty/${s.slug}`}
                    className="inline-flex items-center gap-1 rounded-full border border-cream/25 bg-cream/5 px-3 py-1 text-xs font-medium text-cream backdrop-blur hover:bg-cream/10">
                    {s.emoji && <span>{s.emoji}</span>}{s.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2.5">
              {showOrdering && (
                <Button asChild className="h-11 rounded-full bg-primary px-5 text-primary-foreground shadow-ember hover:bg-primary/90">
                  <a href={biz.online_ordering_url!} target="_blank" rel="noreferrer">
                    <ShoppingBag className="mr-1.5 h-4 w-4" /> {biz.order_button_label || "Order Online"}
                  </a>
                </Button>
              )}
              {biz.phone && (
                <>
                  <Button asChild variant={showOrdering ? "outline" : "default"} className={showOrdering
                    ? "h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10"
                    : "h-11 rounded-full bg-primary px-5 text-primary-foreground shadow-ember hover:bg-primary/90"}>
                    <a href={`tel:${biz.phone}`}><Phone className="mr-1.5 h-4 w-4" /> Call</a>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                    <a href={`sms:${biz.phone}`}><MessageSquare className="mr-1.5 h-4 w-4" /> Text</a>
                  </Button>
                </>
              )}
              <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                <Link to={`/book/${biz.slug}`}><Briefcase className="mr-1.5 h-4 w-4" /> Catering Inquiry</Link>
              </Button>
              {biz.email && (
                <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                  <a href={`mailto:${biz.email}`}><Mail className="mr-1.5 h-4 w-4" /> Email</a>
                </Button>
              )}
              {biz.website && (
                <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                  <a href={biz.website} target="_blank" rel="noreferrer"><Globe className="mr-1.5 h-4 w-4" /> Website</a>
                </Button>
              )}
              {biz.instagram && (
                <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                  <a href={biz.instagram} target="_blank" rel="noreferrer"><Instagram className="mr-1.5 h-4 w-4" /> Instagram</a>
                </Button>
              )}
              {biz.facebook && (
                <Button asChild variant="outline" className="h-11 rounded-full border-cream/25 bg-cream/5 px-5 text-cream backdrop-blur hover:bg-cream/10">
                  <a href={biz.facebook} target="_blank" rel="noreferrer"><Facebook className="mr-1.5 h-4 w-4" /> Facebook</a>
                </Button>
              )}
            </div>

            {biz.listing_status === "unclaimed" && !biz.owner_id && (
              <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-cream/25 bg-cream/10 px-5 py-3 text-cream backdrop-blur">
                <span className="text-sm">Own this business? Claim this listing to manage it on FoodXMobile.</span>
                <Button asChild size="sm" className="h-9 rounded-full bg-primary px-4 text-primary-foreground shadow-ember hover:bg-primary/90">
                  <Link to={`/food-trucks/${biz.slug}/claim`}>Claim this listing</Link>
                </Button>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-cream/15 bg-cream/5 px-5 py-3 text-sm text-cream backdrop-blur">
                <span className="relative inline-flex h-2.5 w-2.5">
                  {biz.status === "open" && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />
                  )}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusBadge.dot}`} />
                </span>
                <span>
                  <span className="font-semibold">{statusBadge.label}</span>
                  {biz.today_location && <> · <MapPin className="inline h-3.5 w-3.5 -translate-y-0.5" /> {biz.today_location}</>}
                  {biz.today_hours && <> · {biz.today_hours}</>}
                </span>
              </div>
              <Link
                to={`/book/${biz.slug}`}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-cream/15 bg-cream/5 px-4 py-3 text-sm text-cream backdrop-blur hover:bg-cream/10"
              >
                <Calendar className="h-3.5 w-3.5" /> Booking inquiries open
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MENU */}
      {cats.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="container-tight">
            <span className="badge-ember">The Menu</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
              What's <em className="text-primary not-italic">on the truck</em>.
            </h2>
            {items.some((i) => i.is_featured) && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.filter((i) => i.is_featured).slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        <Flame className="h-3 w-3" /> Fan favorite
                      </span>
                      {item.price && <span className="font-display text-base font-bold">{item.price}</span>}
                    </div>
                    <h4 className="mt-3 font-display text-lg font-semibold leading-tight">{item.name}</h4>
                    {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-12 grid gap-10 lg:grid-cols-2">
              {cats.map((c) => (
                <div key={c.id}>
                  <h3 className="font-display text-2xl font-semibold text-primary">{c.name}</h3>
                  <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
                    {items.filter((i) => i.category_id === c.id).map((item) => (
                      <div key={item.id} className="flex items-baseline justify-between gap-4 p-5">
                        <div>
                          <h4 className="font-display text-lg font-semibold leading-tight">
                            {item.name}
                            {item.is_featured && <Flame className="ml-1.5 inline h-3.5 w-3.5 -translate-y-0.5 text-primary" />}
                          </h4>
                          {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                        </div>
                        {item.price && <span className="font-display text-lg font-bold">{item.price}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SCHEDULE */}
      {weeklySchedule.length > 0 && (
        <section className="bg-cream-deep py-20 md:py-28">
          <div className="container-tight">
            <span className="badge-ember"><Calendar className="h-3 w-3" /> This Week</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">Where to find us.</h2>
            <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
              {weeklySchedule.map((row) => (
                <div key={row.id} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-border p-5 last:border-b-0">
                  <div className="text-center font-display text-lg font-bold">{row.weekday}</div>
                  <p className="flex items-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5 text-primary" /> {row.location}</p>
                  {(row.start_time || row.end_time) ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {row.start_time} – {row.end_time}
                    </div>
                  ) : <span />}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="container-tight">
            <span className="badge-ember">Public Events</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">Catch us out.</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((e) => (
                <div key={e.id} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-card">
                  <div className="font-display text-2xl font-bold text-primary">{e.event_date?.slice(5)}</div>
                  <h3 className="mt-2 font-display text-lg font-semibold leading-tight">{e.title}</h3>
                  {e.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{e.location}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {photos.length > 0 && (
        <section className="bg-cream-deep py-20 md:py-28">
          <div className="container-tight">
            <span className="badge-ember">Gallery</span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">A few from the truck.</h2>
            <div className="mt-10 grid auto-rows-[200px] grid-cols-2 gap-3 md:grid-cols-4 md:auto-rows-[240px]">
              {photos.slice(0, 5).map((p, i) => (
                <img
                  key={p.id}
                  src={resolveImage(p.url)}
                  alt=""
                  loading="lazy"
                  className={`h-full w-full rounded-2xl object-cover transition hover:scale-[1.02] ${i === 0 || i === 3 ? "md:row-span-2" : ""} ${i === 3 ? "md:col-span-2" : ""}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CATERING CTA */}
      <section className="bg-secondary py-20 text-secondary-foreground md:py-28">
        <div className="container-tight text-center">
          <h2 className="font-display text-4xl font-bold text-cream md:text-5xl">Bring {biz.name} to your event.</h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/80">Weddings, corporate lunches, graduations, backyard parties. Send a quick inquiry — we'll reply within 24 hours.</p>
          <Button asChild className="mt-8 h-12 rounded-full bg-primary px-7 text-primary-foreground shadow-ember hover:bg-primary/90">
            <Link to={`/book/${biz.slug}`}>Send a catering inquiry</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}