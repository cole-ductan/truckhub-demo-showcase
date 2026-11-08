import type { MarketOrOrganizer, OccurrencePublicationState, SourceFreshnessFlag } from "@/lib/events/types";

const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider";

function marketKindLabel(kind: MarketOrOrganizer["kind"]): string {
  if (kind === "market") return "Market";
  if (kind === "organizer") return "Organizer";
  return "Venue series";
}

export function MarketKindBadge({ kind }: { kind: MarketOrOrganizer["kind"] }) {
  return <span className={`${pill} bg-secondary text-secondary-foreground`}>{marketKindLabel(kind)}</span>;
}

export function PublicationBadge({ state }: { state: OccurrencePublicationState }) {
  const label =
    state === "published"
      ? "Published"
      : state === "cancelled"
        ? "Cancelled"
        : state === "needs_review"
          ? "Needs review"
          : state === "draft_unverified"
            ? "Draft"
            : "Unpublished";
  const tone = state === "cancelled" ? "bg-destructive text-destructive-foreground" : "bg-accent/40 text-accent-foreground";
  return <span className={`${pill} ${tone}`}>{label}</span>;
}

export function TimeUnconfirmedBadge() {
  return <span className={`${pill} border border-border bg-card text-foreground`}>Time unconfirmed</span>;
}

export function FreshnessBadge({ freshness }: { freshness: SourceFreshnessFlag | null }) {
  if (!freshness) return null;
  const label = freshness === "fresh" ? "Fresh · fixture" : freshness === "aging" ? "Aging · fixture" : "Stale · fixture";
  const tone =
    freshness === "stale"
      ? "border border-destructive/40 text-destructive"
      : freshness === "aging"
        ? "border border-amber-500/40 text-amber-800"
        : "border border-emerald-600/30 text-emerald-800";
  return (
    <span className={`${pill} ${tone}`} title="Fixture flag. This is not a live verification.">
      {label}
    </span>
  );
}

export function ListingOriginBadge({ origin }: { origin: "claimed" | "imported" }) {
  const label = origin === "claimed" ? "Claimed · fixture" : "Imported · fixture";
  const tone = origin === "claimed" ? "bg-secondary text-secondary-foreground" : "border border-border bg-card text-foreground";
  return (
    <span className={`${pill} ${tone}`} title="Fixture flag. This is not a live claim check.">
      {label}
    </span>
  );
}
