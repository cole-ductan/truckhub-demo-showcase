import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Store, Truck, Users } from "lucide-react";

const categories = [
  { title: "Food Trucks", body: "Browse published listings and menus. Demo cards are labeled.", href: "/food-trucks", icon: Truck },
  { title: "Farmers Markets", body: "Find weekly markets in the area.", href: "/calendar", icon: Store },
  { title: "Food Truck Rallies", body: "Catch the next rally near you.", href: "/calendar", icon: Users },
  { title: "Local Events", body: "Festivals, pop-ups, and more.", href: "/calendar", icon: CalendarDays },
];

export function BrowseCategories() {
  return (
    <section className="bg-cream-deep py-16 md:py-20">
      <div className="container-tight">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Browse local</p>
        <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Find what sounds good.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.title} to={c.href} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-card">
              <c.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">Explore <ArrowRight className="ml-1 h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}