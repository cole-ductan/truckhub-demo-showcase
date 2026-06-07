import { Link } from "react-router-dom";
import { CalendarHeart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlanningEventCTA() {
  return (
    <section className="py-10 md:py-14">
      <div className="container-tight">
        <div className="grid items-center gap-6 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:grid-cols-[auto_1fr_auto] md:p-8">
          <span className="hidden h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary md:grid">
            <CalendarHeart className="h-7 w-7" />
          </span>
          <div>
            <h3 className="font-display text-2xl font-bold md:text-3xl">Planning an Event?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground md:text-base">
              Search local food trucks, compare profiles, and send one request to matching vendors.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-full">
            <Link to="/book-a-food-truck">Find a Food Truck for Your Event <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}