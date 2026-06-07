import type { Database } from "@/integrations/supabase/types";

export type ListingStatus = Database["public"]["Enums"]["listing_status"];

export const LISTING_STATUSES: ListingStatus[] = [
  "draft",
  "unclaimed",
  "claimed_free",
  "premium",
  "archived",
];

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  unclaimed: "Unclaimed",
  claimed_free: "Claimed (Free)",
  premium: "Premium",
  archived: "Archived",
};

export const LISTING_STATUS_VARIANT: Record<
  ListingStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  unclaimed: "secondary",
  claimed_free: "default",
  premium: "default",
  archived: "destructive",
};

export function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Normalize a slug on blur/submit. Allows hyphens. Slices to 80 chars. */
export function normalizeSlug(value: string): string {
  return slugify(value);
}

/** Reject empty slugs, slashes, whitespace, and characters that aren't url-safe. */
export function isValidSlug(value: string): boolean {
  if (!value) return false;
  return /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(value);
}