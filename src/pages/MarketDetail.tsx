import { useParams } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { getMarketView } from "@/lib/events/catalog";
import { usePublicEventCatalog } from "@/lib/events/usePublicEventCatalog";
import { CatalogEmpty, CatalogError, CatalogLoading } from "@/components/events/CatalogStates";
import { MarketDetailView } from "@/components/events/MarketDetailView";
import { PublicEventFrame } from "@/components/events/PublicEventFrame";

export default function MarketDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = usePublicEventCatalog();
  const view = state.status === "ready" ? getMarketView(state.catalog, slug) : null;
  useSEO({
    title: view ? `${view.market.name} — FoodXMobile` : "Market (synthetic demo) — FoodXMobile",
    description: "Synthetic demo market page. Fixture data only.",
  });
  return (
    <PublicEventFrame>
      {state.status === "loading" ? <CatalogLoading /> : null}
      {state.status === "error" ? <CatalogError message={state.message} /> : null}
      {state.status === "ready" && view ? <MarketDetailView view={view} /> : null}
      {state.status === "ready" && !view ? (
        <CatalogEmpty
          title="Market not in the demo catalog"
          body="No stored market slug matches this URL."
          actionHref="/markets"
          actionLabel="Back to markets"
        />
      ) : null}
    </PublicEventFrame>
  );
}
