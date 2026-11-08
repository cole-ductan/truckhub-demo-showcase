/**
 * Public paths concatenate stored slugs. They do not build a slug from a name or id.
 */

export function marketPath(market: { slug: string }): string {
  return `/markets/${market.slug}`;
}

export function seriesPath(series: { slug: string }): string {
  return `/events/${series.slug}`;
}

export function occurrencePath(series: { slug: string }, occurrence: { slug: string }): string {
  return `/events/${series.slug}/${occurrence.slug}`;
}

export function foodTruckProfilePath(profileSlug: string): string {
  return `/food-trucks/${profileSlug}`;
}
