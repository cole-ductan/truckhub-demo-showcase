import { INVENTORY_KIND } from "@/lib/publicInventoryCopy";
import { cn } from "@/lib/utils";

export function InventoryKindBadge({
  isDemo,
  onDark = false,
  className,
}: {
  isDemo: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const kind = isDemo ? INVENTORY_KIND.demo : INVENTORY_KIND.verified;
  return (
    <span
      data-inventory-kind={isDemo ? "demo" : "verified"}
      title={kind.detail}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        isDemo
          ? "border-amber-600/40 bg-amber-500/15 text-amber-900"
          : onDark
            ? "border-cream/30 bg-cream/10 text-cream"
            : "border-border bg-background/90 text-foreground",
        className,
      )}
    >
      {kind.label}
    </span>
  );
}
