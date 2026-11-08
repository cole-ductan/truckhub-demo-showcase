import { useSEO } from "@/hooks/useSEO";
import { MarketsDirectory } from "@/components/events/MarketsDirectory";
import { PublicEventFrame } from "@/components/events/PublicEventFrame";

export default function MarketsPage() {
  useSEO({
    title: "Markets (synthetic demo) — FoodXMobile",
    description: "Synthetic demo market, organizer, and venue-series pages. Not a complete regional directory.",
  });
  return (
    <PublicEventFrame>
      <MarketsDirectory />
    </PublicEventFrame>
  );
}
