export type AvailabilityState = "available" | "possibly" | "unknown" | "contact";

export type AvailabilityScheduleItem = {
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

export function getAvailabilityState(
  date: string | null | undefined,
  schedule: AvailabilityScheduleItem[] | null | undefined,
): AvailabilityState {
  if (!schedule || schedule.length === 0) return "unknown";
  if (!date) return "contact";
  const sameDay = schedule.filter((s) => (s.event_date ?? "") === date);
  if (sameDay.length === 0) return "possibly";
  // Has explicit event(s) that day — treat as confirmed busy unless tag indicates available
  return "available";
}

export const AVAILABILITY_LABEL: Record<AvailabilityState, string> = {
  available: "Available",
  possibly: "Possibly Available",
  unknown: "Availability Not Confirmed",
  contact: "Contact Vendor",
};

export const AVAILABILITY_TONE: Record<AvailabilityState, string> = {
  available: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  possibly: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  unknown: "bg-muted text-muted-foreground border-border",
  contact: "bg-primary/10 text-primary border-primary/30",
};