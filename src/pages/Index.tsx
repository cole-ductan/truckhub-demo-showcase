import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/assets";
import heroTruck from "@/assets/hero-truck.jpg";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Clock,
  Calendar,
  Smartphone,
  Utensils,
  Briefcase,
  Sparkles,
  RefreshCw,
  Check,
  Star,
  Search,
  Megaphone,
} from "lucide-react";

const benefits = [
  { icon: Utensils, title: "Beautiful Menu", body: "A clean, scrollable menu customers can read in one tap. Photos, prices, dietary tags." },
  { icon: MapPin, title: "Today's Location", body: "One source of truth. We update where you're parked — no more 'Are you open?' DMs." },
  { icon: Briefcase, title: "Catering Leads", body: "Inquiry form sends straight to your inbox or text. Capture private events on autopilot." },
  { icon: Calendar, title: "Event Calendar", body: "Show every market, festival, and brewery night. People plan their weekends around you." },
  { icon: Smartphone, title: "Mobile-First", body: "Looks gorgeous on the phone — because that's where your customers actually find you." },
  { icon: RefreshCw, title: "Simple Updates", body: "Text us your weekly schedule. We handle the rest. No dashboards to learn." },
];

const steps = [
  { n: "01", title: "We build your page", body: "Branded one-pager built around your truck — menu, photos, contact buttons. Live in 5 days." },
  { n: "02", title: "We keep it updated", body: "You text us your schedule and menu changes. We update the page and the hub the same day." },
  { n: "03", title: "Customers find & book", body: "You appear on the Green Bay hub, in search, and on social. One link does everything." },
];

const tiers = [
  {
    name: "Starter",
    price: "$39",
    period: "/mo",
    blurb: "A clean one-page truck site. Perfect to replace your link-in-bio.",
    features: ["Branded one-page site", "Menu & photo gallery", "Call / text / social buttons", "Mobile-optimized & fast", "Custom truckname.truckhubgb.com"],
    cta: "Start Simple",
    featured: false,
  },
  {
    name: "Hub Plus",
    price: "$79",
    period: "/mo",
    blurb: "Everything in Starter, plus we keep it fresh and put you on the map.",
    features: ["Everything in Starter", "Listed on TruckHub directory", "Weekly schedule updates", "Today's-location widget", "Catering inquiry form"],
    cta: "Most Popular",
    featured: true,
  },
  {
    name: "Premium",
    price: "$149",
    period: "/mo",
    blurb: "Be the truck people think of first. Featured placement + lead support.",
    features: ["Everything in Hub Plus", "Featured spot on the hub", "Event calendar promotion", "Lead-capture follow-up support", "Quarterly photo refresh"],
    cta: "Get Featured",
    featured: false,
  },
];

const StatusDot = ({ status }: { status: "open" | "soon" | "closed" }) => {
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

const Index = () => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("id,slug,name,tagline,cuisine,emoji,hero_image_url,today_location,today_hours,status,is_featured")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("name")
      .limit(6)
      .then(({ data }) => setTrucks(data ?? []));
    supabase
      .from("business_events")
      .select("id,title,location,event_date,tag")
      .eq("kind", "one_off")
      .eq("is_public", true)
      .order("event_date")
      .limit(6)
      .then(({ data }) => setEvents(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader withBanner />

      {/* HERO */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-20 md:pb-28">
        <div className="absolute inset-0 -z-10 bg-gradient-warm" />
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: "var(--gradient-radial-ember)" }} />
        <div className="container-tight grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="animate-fade-up">
            <span className="badge-ember">
              <Sparkles className="h-3 w-3" />
              Built for Northeast Wisconsin trucks
            </span>
            <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,4.75rem)] font-bold leading-[1.02] text-balance">
              One clean online <em className="not-italic text-primary">home</em> for your food truck.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              TruckHub Green Bay gives every truck a beautiful one-page site — menu, today's location,
              catering form, all in one link. Plus a city-wide hub where hungry locals actually find you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-primary px-7 text-base text-primary-foreground shadow-ember hover:bg-primary/90">
                <Link to="/smoke-trail-bbq">
                  See Sample Truck Page
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/20 bg-background/60 px-7 text-base backdrop-blur hover:bg-background">
                <a href="#demo">Book a Demo</a>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <span><span className="font-semibold text-foreground">28+ trucks</span> already on the hub</span>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] shadow-lift grain">
              <img
                src={heroTruck}
                alt="Colorful Green Bay food truck at golden hour with happy customers"
                width={1600}
                height={1200}
                className="h-[480px] w-full object-cover md:h-[560px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
            </div>

            {/* Floating today card */}
            <div className="absolute -left-4 bottom-6 w-[260px] rounded-2xl border border-border bg-card p-4 shadow-card md:-left-10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Open Now</span>
                <StatusDot status="open" />
              </div>
              <p className="mt-2 font-display text-lg font-semibold leading-tight">Smoke Trail BBQ</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> Titletown · Brookwood Dr
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> 11:30a – 8:00p
              </p>
            </div>

            {/* Floating booking card */}
            <div className="absolute -right-2 top-8 hidden w-[240px] rounded-2xl border border-border bg-card p-4 shadow-card md:block">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">New catering lead</p>
                  <p className="font-semibold leading-tight">Wedding · 120 guests</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Sent straight to your phone — no logins.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden border-y border-border bg-cream-deep py-5">
        <div className="flex animate-marquee gap-12 whitespace-nowrap text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex items-center gap-12">
              <span>🍔 Bay Burger Co.</span><span>·</span>
              <span>🔥 Smoke Trail BBQ</span><span>·</span>
              <span>🌮 Tortilla Norte</span><span>·</span>
              <span>🍕 Stone Oven Pies</span><span>·</span>
              <span>🧇 North Coast Waffles</span><span>·</span>
              <span>🐔 Fowl Play Hot Chicken</span><span>·</span>
              <span>🥟 Bay Dumpling Co.</span><span>·</span>
              <span>🍦 Frozen Tundra Creamery</span><span>·</span>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-20 md:py-28">
        <div className="container-tight">
          <div className="mx-auto max-w-2xl text-center">
            <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-primary" />What every truck gets</span>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight md:text-5xl">
              Everything you wish your <em className="text-primary not-italic">Facebook page</em> could do.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No dashboard to log into. No app to learn. Just a beautiful site that works as hard as you do.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TODAYS TRUCKS */}
      <section id="trucks" className="bg-cream-deep py-20 md:py-28">
        <div className="container-tight">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Today on the hub</span>
              <h2 className="mt-5 font-display text-4xl font-bold leading-tight md:text-5xl">
                Today's trucks in <em className="text-primary not-italic">Green Bay</em>.
              </h2>
            </div>
            <p className="max-w-sm text-muted-foreground">
              Updated every morning. Tap any truck to see the menu and where they're parked right now.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trucks.map((t) => (
              <Link
                key={t.slug}
                to={`/food-trucks/${t.slug}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={resolveImage(t.hero_image_url)}
                    alt={`${t.name} food`}
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
                      {t.emoji && <span className="mr-1.5">{t.emoji}</span>}{t.name}
                    </h3>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
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
        </div>
      </section>

      {/* EVENTS */}
      <section id="events" className="py-20 md:py-28">
        <div className="container-tight">
          <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
            <div>
              <span className="pill"><Calendar className="h-3 w-3" />On the calendar</span>
              <h2 className="mt-5 font-display text-4xl font-bold leading-tight md:text-5xl">
                Upcoming events.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Festivals, brewery nights, and food truck rallies happening across the Bay. We promote
                every event our trucks are at — to thousands of locals every week.
              </p>
              <Button asChild variant="outline" className="mt-6 rounded-full">
                <a href="#">View full calendar <ArrowRight className="ml-1.5 h-4 w-4" /></a>
              </Button>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {events.map((e, i) => (
                <li key={i} className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 p-5 transition hover:bg-muted/50">
                  <div className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <div className="text-center leading-none">
                      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{e.event_date ? new Date(e.event_date).toLocaleDateString("en-US", { weekday: "short" }) : ""}</div>
                      <div className="font-display text-base font-bold">{e.event_date ? new Date(e.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">{e.tag}</span>
                    </div>
                    <h3 className="mt-1.5 font-display text-lg font-semibold leading-tight">{e.title}</h3>
                    <p className="text-sm text-muted-foreground">{e.location}</p>
                  </div>
                  <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:text-primary md:block" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-ink py-20 text-ink-foreground md:py-28">
        <div className="container-tight">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cream/15 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-cream/70">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-glow" /> How it works
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight text-cream md:text-5xl">
              Three simple steps. <em className="not-italic text-primary-glow">No tech headache.</em>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative overflow-hidden rounded-2xl border border-cream/10 bg-cream/5 p-7">
                <div className="font-display text-6xl font-bold text-primary/90">{s.n}</div>
                <h3 className="mt-3 font-display text-2xl font-semibold text-cream">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/70">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="container-tight">
          <div className="mx-auto max-w-2xl text-center">
            <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Simple, honest pricing</span>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight md:text-5xl">
              Pick the plan that <em className="text-primary not-italic">fits your truck</em>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Month-to-month. Cancel anytime. First two weeks free for Green Bay trucks.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`relative flex flex-col rounded-2xl border p-7 transition ${
                  t.featured
                    ? "border-primary bg-card shadow-ember md:-translate-y-3"
                    : "border-border bg-card hover:shadow-card"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-soft">
                    {t.cta}
                  </span>
                )}
                <h3 className="font-display text-2xl font-semibold">{t.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t.blurb}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold">{t.price}</span>
                  <span className="text-sm text-muted-foreground">{t.period}</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-8 h-11 rounded-full ${
                    t.featured
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-foreground text-background hover:bg-foreground/85"
                  }`}
                >
                  <a href="#demo">Get started</a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OWNER PITCH */}
      <section id="owner-pitch" className="relative overflow-hidden bg-secondary py-20 text-secondary-foreground md:py-28">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" aria-hidden />
        <div className="container-tight grid gap-14 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-cream/80">
              <Megaphone className="h-3 w-3" /> For truck owners
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight text-cream md:text-5xl">
              Tired of customers DMing you "are you open today?"
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-cream/80">
              Facebook is great for posts. It's terrible for being found, taking catering inquiries,
              showing your menu, and looking professional to brides, HR teams, and event planners.
            </p>
            <ul className="mt-7 space-y-3 text-cream/90">
              {[
                "One link to share — bio, business cards, signage, everything",
                "Searchable on Google for 'food trucks near me'",
                "Catering inquiries land in your text messages, not lost in DMs",
                "Customers stop asking 'where are you parked?'",
                "Looks great to event coordinators and corporate caterers",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary-glow" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-cream/15 bg-cream/5 p-6 backdrop-blur">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: "Avg. monthly site visits", v: "2,400+" },
                  { k: "Avg. catering leads / mo", v: "6–12" },
                  { k: "Avg. setup time", v: "5 days" },
                  { k: "Trucks on the hub", v: "28" },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl bg-background/95 p-5 text-foreground">
                    <div className="font-display text-3xl font-bold text-primary">{s.v}</div>
                    <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-cream/10 p-5">
                <p className="font-display text-lg italic leading-snug text-cream">
                  "We replaced our Linktree, our outdated website, and three Facebook posts a week — with one TruckHub page. Catering bookings are up 3x."
                </p>
                <p className="mt-3 text-xs uppercase tracking-wider text-cream/60">— Sample testimonial · Smoke Trail BBQ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO CTA */}
      <section id="demo" className="py-20 md:py-28">
        <div className="container-tight">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-ember p-10 text-primary-foreground shadow-lift md:p-16">
            <div className="absolute -right-10 -top-10 h-60 w-60 rounded-full bg-primary-foreground/10 blur-3xl" aria-hidden />
            <div className="grid items-center gap-10 md:grid-cols-[1.5fr_1fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
                  <Search className="h-3 w-3" /> 15-minute demo
                </span>
                <h2 className="mt-5 font-display text-4xl font-bold leading-tight md:text-5xl">
                  See your truck on TruckHub. <span className="opacity-80">Free preview.</span>
                </h2>
                <p className="mt-4 max-w-xl text-lg text-primary-foreground/85">
                  We'll mock up your truck's page in 24 hours — no commitment. If you love it, we go live.
                  If not, you keep the design.
                </p>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); alert("Demo request received! (sample form)"); }}
                className="space-y-3 rounded-2xl bg-background p-5 text-foreground shadow-card"
              >
                <input required placeholder="Truck name" className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
                <input required type="email" placeholder="Email" className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
                <input placeholder="Phone (for catering leads)" className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
                <Button className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Request my free preview <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">No credit card. Demo form — no submission stored.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
