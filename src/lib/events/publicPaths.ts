/** Locked Lane B paths. Occurrence routes use stored series and occurrence slugs. */
export const publicDiscoveryPaths = [
  "/markets",
  "/markets/:slug",
  "/events",
  "/events/:seriesSlug/:occurrenceSlug",
  "/events/:slug",
  "/vendors",
] as const;

export type PublicDiscoveryPath = (typeof publicDiscoveryPaths)[number];
