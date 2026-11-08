import { SYNTHETIC_DISCLAIMER } from "@/lib/events/fixtures";

export function SyntheticNotice() {
  return (
    <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground" data-synthetic="true">
      {SYNTHETIC_DISCLAIMER}
    </p>
  );
}
