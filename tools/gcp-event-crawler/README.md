# FoodXMobile GCP Event Crawler MVP

This worker is a temporary, credit-friendly crawler layer for FoodXMobile.

It does **not** replace Lovable, Supabase, or the public app. It only:

1. Reads active rows from `public.event_sources`.
2. Fetches the source URL.
3. Extracts Schema.org JSON-LD `Event` records.
4. Normalizes candidate events.
5. Inserts them into `public.event_import_queue` for admin review.

Imported records should not be published automatically. The review queue is the safety valve.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key. Store only in GCP Secret Manager. |
| `MAX_SOURCES` | Optional. Number of sources to process per run. Default: `25`. |
| `REQUEST_TIMEOUT_MS` | Optional. Request timeout. Default: `15000`. |
| `USER_AGENT` | Optional. Identifies the crawler. |

## GCP deployment path

Use Cloud Console for the first sprint.

1. Enable these APIs in the GCP project:
   - Cloud Run Admin API
   - Cloud Build API
   - Artifact Registry API
   - Cloud Scheduler API
   - Secret Manager API
   - Cloud Logging API
2. Create secrets in Secret Manager:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Create an Artifact Registry Docker repository, for example `foodxmobile-workers`.
4. Build and deploy this folder as a Cloud Run Job.
5. Configure the job container environment:
   - Mount or expose the two Supabase secrets as environment variables.
   - Set `MAX_SOURCES=10` for the first test run.
6. Run the job manually once.
7. Check Cloud Logging for crawler results.
8. Check Supabase `event_import_queue` for imported records.
9. Add a Cloud Scheduler trigger after the manual run works.

## Recommended first source strategy

Start with sources that publish structured event metadata:

- City or municipal event calendars
- County/tourism calendars
- Venue calendars
- Libraries
- Farmers market sites
- Chamber calendars

Avoid scraping Google search results, Facebook Events, login-gated pages, or sites that clearly prohibit crawling.

## MVP limitation

This first worker extracts JSON-LD Event data only. That is intentional.

JSON-LD is lower-risk and more stable than brittle page scraping. Add RSS, ICS, and custom parsers later after the admin review flow proves useful.

## Kill switch

Disable crawling without redeploying by setting `active=false` on rows in `event_sources`.

## Success criteria

The MVP is working when:

- The Cloud Run Job finishes without crashing.
- Each source has `last_crawled_at` and a clear `crawl_status`.
- Valid candidates appear in `event_import_queue`.
- Duplicate source events do not create duplicate queue rows.
- Nothing publishes publicly until an admin reviews it.
