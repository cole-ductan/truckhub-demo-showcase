import { useSEO } from "@/hooks/useSEO";
import { EventsDirectory } from "@/components/events/EventsDirectory";
import { PublicEventFrame } from "@/components/events/PublicEventFrame";

export default function EventsPage() {
  useSEO({
    title: "Events (synthetic demo) — FoodXMobile",
    description: "Synthetic demo event series and occurrences in America/Chicago. Not a complete regional calendar.",
  });
  return (
    <PublicEventFrame>
      <EventsDirectory />
    </PublicEventFrame>
  );
}
