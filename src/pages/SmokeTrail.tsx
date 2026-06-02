import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, Search, Store, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/site/DemoBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useSEO } from "@/hooks/useSEO";
import heroTruck from "@/assets/hero-truck.jpg";

const discovery = [
  { title: "Food Trucks", body: "Browse live locations, menus, and schedules.", href: "/food-trucks", icon: UtensilsCrossed },
  { title: "Markets", body: "Find local makers, growers, and pop-up markets.", href: "/markets", icon: Store },
  { title: "Local Events", body: "See festivals, rallies, and neighborhood events.", href: "/events", icon: CalendarDays },
  { title: "Vendors", body: "Discover mobile businesses beyond the truck window.", href: "/vendors", icon: MapPin },
];

export default function SmokeTrail() {
  useSEO({
    title: "FoodXMobile | Discover Food Trucks, Markets & Local Events",
    description: "Discover food trucks, markets, and local events near you. Browse live locations, menus, schedules, specialties, and upcoming events with FoodXMobile.",
  });

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader withBanner />
      <main>
        <section className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
          <div className="absolute inset-0 -z-10 bg-gradient-warm" />
          <div className="container-tight grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <span className="badge-ember"><MapPin className="h-3 w-3" /> Local discovery, simplified</span>
              <h1 className="mt-5 font-display text-[clamp(3rem,7vw,5.5rem)] font-bold leading-[0.98]">
                Discover what is <em className="not-italic text-primary">happening near you.</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Find food trucks, markets, vendors, and local events in one place. Browse today's locations, menus, schedules, and upcoming events.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full"><Link to="/food-trucks"><Search className="mr-2 h-4 w-4" /> Explore Food Trucks</Link></Button>
                <Button asChild size="lg" variant="outline" className="rounded-full"><Link to="/for-vendors">List Your Business <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] shadow-lift">
              <img src={heroTruck} alt="Local food truck serving customers" className="h-[420px] w-full object-cover md:h-[520px]" />
            </div>
          </div>
        </section>

        <section className="bg-cream-deep py-20 md:py-24">
          <div className="container-tight">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Explore local</p>
            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Start with what sounds good.</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {discovery.map((item) => (
                <Link key={item.title} to={item.href} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-card">
                  <item.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-5 font-display text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-primary">Explore <ArrowRight className="ml-1 h-4 w-4" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="container-tight grid gap-8 rounded-[2rem] bg-ink p-8 text-cream md:grid-cols-[1fr_auto] md:items-center md:p-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-glow">For local businesses</p>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Get discovered on FoodXMobile.</h2>
              <p className="mt-4 max-w-2xl text-cream/75">Run a food truck, market, or mobile business? Give customers one clean place to find your schedule, menu, and booking information.</p>
            </div>
            <Button asChild size="lg" className="rounded-full"><Link to="/for-vendors">List Your Business <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
