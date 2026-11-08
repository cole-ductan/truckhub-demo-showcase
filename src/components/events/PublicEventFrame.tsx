import type { ReactNode } from "react";
import { DemoBanner } from "@/components/site/DemoBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SyntheticNotice } from "./SyntheticNotice";

export function PublicEventFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <SiteHeader withBanner />
      <main className="pb-20 pt-28 md:pt-32">
        <div className="container-tight">
          <SyntheticNotice />
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
