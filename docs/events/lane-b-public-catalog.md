# Lane B public catalog (FXM-009 / #22, FXM-013 / #26)

Director contract, amended 2026-11-08. This branch adds application types, synthetic fixtures, and public pages. It does not add a migration, apply SQL, ingest Discovery research, or publish live winter listings.

## Types

`src/lib/events/types.ts` follows Lane B:

- `Venue.timezone` is `America/Chicago`
- `MarketOrOrganizer.slug` is stored and routes to `/markets/:slug`
- `EventSeries.slug` is stored and routes to `/events/:slug`
- `EventOccurrence.slug` is stored, unique within its series, and routes to `/events/:seriesSlug/:occurrenceSlug`
- `VendorAppearance.sourced` is the literal `true`

Slugs are fields on the fixture records. Render code concatenates those fields. It does not slugify display names or raw ids.

Lane A CRM types are not part of this change. `business_events` and `saved_locations` stay the owner schedule and canonical geo. These pages do not query them.

## Routes

| Path | Page |
| --- | --- |
| `/markets` | Market directory |
| `/markets/:slug` | Market, organizer, or venue series |
| `/events` | Series and occurrence directory |
| `/events/:slug` | Event series |
| `/events/:seriesSlug/:occurrenceSlug` | Occurrence |
| `/vendors` | Makers, food, beverage, and trucks |
| `/food-trucks/:slug` | Existing vendor profile |
| `/calendar` | Existing public calendar, unchanged |

There is no `/vendors/:slug` profile. An appearance links to `/food-trucks/:slug` only when `businessId` is set, using the fixture's stored `profileSlug`. An imported draft with `businessId: null` has no profile link.

`/explore` still redirects to `/food-trucks`.

## Fixtures

`src/lib/events/fixtures.ts` is fictional. Names, addresses, and `example.com` URLs are not a Green Bay or Fox Valley directory and were not copied from production.

The catalog includes:

- a multi-date series with an explicit cancellation and no generated extra dates
- a time-unconfirmed occurrence
- sourced appearances, including one claimed profile link and one imported draft with no `businessId`
- two occurrences on `2026-11-20` whose stored slugs are `2026-11-20` and `2026-11-20-late`
- one withheld draft
- one unresolved two-report conflict with a null address and unconfirmed time

Freshness and claimed/imported badges read fixture flags. They are not live verification.

Dates are America/Chicago wall times. This change does not repair the existing `/calendar` UTC date handling (`#27`).

## States

`?catalog=loading`, `?catalog=error`, and `?catalog=empty` show the loading, error, and empty states. The default catalog is the in-memory fixture. Nothing is fetched from a live source.

## SQL

No file was added under `supabase/migrations`. A database migration waits for a Director-approved slot.
