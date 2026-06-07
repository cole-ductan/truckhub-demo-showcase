import { Link } from "react-router-dom";
import { ArrowRight, CalendarHeart, MapPin, Megaphone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/site/DemoBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { LiveDiscoveryMap } from "@/components/site/LiveDiscoveryMap";
import { TodaysFoodTrucks } from "@/components/site/TodaysFoodTrucks";
import { EventsThisWeek } from "@/components/site/EventsThisWeek";
import { PlanningEventCTA } from "@/components/site/PlanningEventCTA";
import { BrowseCategories } from "@/components/site/BrowseCategories";
import { useSEO } from "@/hooks/useSEO";

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
        <section className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
          <div className="absolute inset-0 -z-10 bg-gradient-warm" />
          <div className="container-tight grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
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
                <Button asChild size="lg" variant="outline" className="rounded-full"><Link to="/book-a-food-truck"><CalendarHeart className="mr-2 h-4 w-4" /> Book a Truck</Link></Button>
              </div>
            </div>
            <LiveDiscoveryMap compact />
          </div>
        </section>

        <TodaysFoodTrucks />
        <PlanningEventCTA />
        <EventsThisWeek />
        <BrowseCategories />

        <section className="py-16 md:py-20">
          <div className="container-tight grid gap-8 rounded-[2rem] bg-ink p-8 text-cream md:grid-cols-[1fr_auto] md:items-center md:p-12">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary-glow"><Megaphone className="h-3 w-3" /> For vendors</p>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Own a Food Truck or Mobile Food Business?</h2>
              <p className="mt-4 max-w-2xl text-cream/75">Claim your listing, manage your schedule, and connect with customers looking for local vendors.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full"><Link to="/food-trucks">Claim Your Listing <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-cream/30 bg-cream/5 text-cream hover:bg-cream/10"><Link to="/for-vendors">Learn More for Vendors</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
