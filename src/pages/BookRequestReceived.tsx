import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { useSEO } from "@/hooks/useSEO";
import { MARKETPLACE_INQUIRY_RECEIPT } from "@/lib/publicInventoryCopy";

export default function BookRequestReceived() {
  useSEO({
    title: "Event Request Saved | FoodXMobile",
    description: MARKETPLACE_INQUIRY_RECEIPT.description,
  });

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader withBanner />
      <main className="pt-28 pb-20 md:pt-36">
        <div className="container-tight max-w-2xl">
          <div className="rounded-[2rem] border border-border bg-card p-10 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-5 font-display text-3xl font-bold md:text-4xl">{MARKETPLACE_INQUIRY_RECEIPT.title}</h1>
            <p className="mt-4 text-muted-foreground">
              {MARKETPLACE_INQUIRY_RECEIPT.body} You can keep browsing listings while you wait.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full"><Link to="/food-trucks">Browse Food Trucks <ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="rounded-full"><Link to="/"><Home className="mr-1.5 h-4 w-4" /> Return Home</Link></Button>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}