import { Link } from "react-router-dom";
import type { AppearanceModel } from "@/lib/events/catalog";
import { foodTruckProfilePath } from "@/lib/events/paths";
import { ListingOriginBadge } from "./EventBadges";

export function AppearanceVendorLink({ item }: { item: AppearanceModel }) {
  const profileSlug = item.appearance.businessId ? item.vendor?.profileSlug : null;
  if (profileSlug) {
    return (
      <Link to={foodTruckProfilePath(profileSlug)} className="font-semibold text-foreground hover:text-primary">
        {item.appearance.displayName}
      </Link>
    );
  }
  return <span className="font-semibold text-foreground">{item.appearance.displayName}</span>;
}

export function AppearanceRow({ item }: { item: AppearanceModel }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <AppearanceVendorLink item={item} />
        <p className="text-xs text-muted-foreground">Sourced appearance</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {item.vendor ? <ListingOriginBadge origin={item.vendor.listingOrigin} /> : null}
        <a className="text-xs font-semibold text-primary hover:underline" href={item.appearance.sourceUrl}>
          Fixture source
        </a>
      </div>
    </li>
  );
}
