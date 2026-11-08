import { useSEO } from "@/hooks/useSEO";
import { PublicEventFrame } from "@/components/events/PublicEventFrame";
import { VendorsDirectory } from "@/components/events/VendorsDirectory";

export default function VendorsPage() {
  useSEO({
    title: "Vendors (synthetic demo) — FoodXMobile",
    description: "Synthetic demo directory of makers, food, beverage, and trucks. Profiles stay on food-truck pages.",
  });
  return (
    <PublicEventFrame>
      <VendorsDirectory />
    </PublicEventFrame>
  );
}
