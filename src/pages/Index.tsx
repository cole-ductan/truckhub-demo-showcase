import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { supabase } from "@/integrations/supabase/client";
import heroTruck from "@/assets/hero-truck.jpg";
import { useSEO } from "@/hooks/useSEO";
import {
  formatVerifiedAggregate,
  type PublicInventoryCounts,
} from "@/lib/publicInventoryCopy";
import { loadPublicInventoryCounts } from "@/lib/publicInventoryCounts";
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
  Search,
  Megaphone,
  Inbox,
  LayoutDashboard,
} from "lucide-react";

const benefits = [
  { icon: Utensils, title: "Menu", body: "A page can show menu items, photos, and prices when those details are saved on the listing." },
  { icon: MapPin, title: "Saved location", body: "The listing can show a location the owner saved. FoodXMobile does not confirm a live GPS position." },
  { icon: Briefcase, title: "Catering inquiries", body: "A customer can save an inquiry on the listing. Saving it is not the same as an email or text being delivered." },
  { icon: Calendar, title: "Events on the listing", body: "Public events appear when they are saved on a listing. FoodXMobile does not fill in dates that were not entered." },
  { icon: Smartphone, title: "Mobile-First", body: "The public pages are built to be read on a phone." },
  { icon: RefreshCw, title: "Owner edits", body: "Owners can edit their own listing. FoodXMobile does not promise same-day or continuous public updates." },
];

const steps = [
  { n: "01", title: "Create the listing", body: "A listing can include a menu, photos, and contact links. Publishing it does not by itself confirm the business is operating today." },
  { n: "02", title: "Edit what is public", body: "Schedule and menu changes are whatever is saved on the listing. There is no same-day update promise." },
  { n: "03", title: "Receive saved inquiries", body: "Customers can submit an inquiry. It is saved and routed to the listing. That is not confirmation of an email or text delivery." },
];

const tiers = [
  {
    name: "Starter",
    price: "$39",
    period: "/mo",
    blurb: "A one-page listing with the details you save.",
    features: ["Listing page on foodxmobile.com", "Menu and photo fields", "Call, text, and social links you add", "Readable on a phone", "A public URL under foodxmobile.com"],
    cta: "Start Simple",
    featured: false,
  },
  {
    name: "Hub Plus",
    price: "$79",
    period: "/mo",
    blurb: "Everything in Starter, plus a directory listing and an inquiry form.",
    features: ["Everything in Starter", "Eligible for the FoodXMobile directory", "Schedule fields you edit", "A location field you edit", "Catering inquiry form that saves a request"],
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

const Index = () => {
  const [counts, setCounts] = useState<PublicInventoryCounts>({
    verifiedPublished: null,
    demoPublished: null,
    unavailable: false,
  });

  useEffect(() => {
    let cancelled = false;
    loadPublicInventoryCounts(supabase as unknown as Parameters<typeof loadPublicInventoryCounts>[0]).then((next) => {
      if (!cancelled) setCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useSEO({
    title: "FoodXMobile — Listings for mobile food businesses",
    description: "FoodXMobile lists published businesses and sample demo listings. Locations are saved on each listing. Catering inquiries are saved, not confirmed as delivered.",
  });

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader withBanner />

      {/* HERO */}
      <section data-tour="home-hero" className="relative overflow-hidden pt-16 pb-20 md:pt-20 md:pb-28">
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
              FoodXMobile is a listing page for a mobile food business: menu, a location you save,
              and a catering inquiry form. The public directory mixes verified published listings
              and labeled sample demos.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-primary px-7 text-base text-primary-foreground shadow-ember hover:bg-primary/90">
                <Link to="/food-trucks">
                  <Search className="mr-1.5 h-4 w-4" /> Find Food Trucks
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/20 bg-background/60 px-7 text-base backdrop-blur hover:bg-background">
                <Link to="/auth">List Your Truck <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Free to browse · Publishing a listing is a separate step from saving a draft
            </p>
            <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted-foreground" data-testid="verified-inventory-aggregate">
              {formatVerifiedAggregate(counts)}
            </p>
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

            {/* Sample illustration. Not a live location or a counted listing. */}
            <div className="absolute -left-4 bottom-6 w-[260px] rounded-2xl border border-border bg-card p-4 shadow-card md:-left-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sample illustration</p>
              <p className="mt-2 font-display text-lg font-semibold leading-tight">Example listing</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> Location saved on the listing
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Hours saved on the listing
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Not a live check-in and not part of the directory count.</p>
            </div>

            <div className="absolute -right-2 top-8 hidden w-[240px] rounded-2xl border border-border bg-card p-4 shadow-card md:block">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Sample inquiry</p>
                  <p className="font-semibold leading-tight">Saved on the listing</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">An inquiry is saved in FoodXMobile. This card is not a text delivery.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample names only. These are not the public directory and not a truck count. */}
      <section className="overflow-hidden border-y border-border bg-cream-deep py-5" aria-label="Sample listing names">
        <p className="container-tight pb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Sample names used in the preview. Not the public directory and not a count of operating businesses.
        </p>
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
            <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-primary" />What a listing can include</span>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight md:text-5xl">
              Everything you wish your <em className="text-primary not-italic">Facebook page</em> could do.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Owners edit the listing. Customers see what was saved, including a clear demo or verified label.
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
                "Lead pipeline & CRM — track every catering inquiry from new to booked",
                "Bookings dashboard with revenue, deposits, and event calendar",
                "Optional Stripe deposits — only when you want them",
                "One link for bio, business cards, signage — everything",
                "Customers can read the location saved on the listing",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary-glow" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                <Link to="/auth"><LayoutDashboard className="mr-1.5 h-4 w-4" /> Owner login</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-full border-cream/30 bg-cream/5 px-6 text-cream hover:bg-cream/10">
                <a href="#demo"><Inbox className="mr-1.5 h-4 w-4" /> See it in action</a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-cream/15 bg-cream/5 p-6 backdrop-blur">
              <div className="rounded-xl bg-background/95 p-5 text-foreground">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Public directory</p>
                <p className="mt-2 text-sm leading-relaxed" data-testid="verified-inventory-aggregate-detail">
                  {formatVerifiedAggregate(counts)}
                </p>
              </div>
              <div className="mt-5 rounded-xl bg-cream/10 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/70">Illustration only. Not a customer result.</p>
                <p className="mt-3 font-display text-lg italic leading-snug text-cream">
                  A listing can replace a scattered set of links when the owner keeps the saved details current.
                </p>
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
                  See your truck on FoodXMobile. <span className="opacity-80">Free preview.</span>
                </h2>
                <p className="mt-4 max-w-xl text-lg text-primary-foreground/85">
                  This preview form does not store a submission and does not create a listing.
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
