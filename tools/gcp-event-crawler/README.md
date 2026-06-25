# FoodXMobile GCP Event Crawler MVP

This worker is a temporary, credit-friendly crawler layer for FoodXMobile.

It does **not** replace Lovable, Supabase, or the public app. GCP also does **not** need the Supabase service role key.

Flow:

1. GCP calls the Lovable Edge Function `gcp-event-import` for active `event_sources`.
2. GCP fetches source URLs.
3. GCP extracts Schema.org JSON-LD `Event` records.
4. GCP normalizes candidate events.
5. GCP posts candidates back to `gcp-event-import`.
6. The Lovable Edge Function writes to `public.event_import_queue` using the internally injected service role key.

Imported records should not be published automatically. The review queue is the safety valve.

## Required GCP worker environment variables

| Variable | Purpose |
| --- | --- |
| `LOVABLE_EVENT_IMPORT_URL` | Deployed Lovable Edge Function URL for `gcp-event-import`. |
| `EVENT_INGEST_TOKEN` | Shared custom token used by GCP to authenticate with the Edge Function. |
| `MAX_SOURCES` | Optional. Number of sources to process per run. Default: `25`. |
| `REQUEST_TIMEOUT_MS` | Optional. Request timeout. Default: `15000`. |
| `USER_AGENT` | Optional. Identifies the crawler. |

## Required Lovable Edge Function secret

| Secret | Purpose |
| --- | --- |
| `GCP_EVENT_INGEST_TOKEN` | Same value as GCP `EVENT_INGEST_TOKEN`. The Edge Function rejects requests without this token. |

Do not add the Supabase service role key to GCP. On Lovable Cloud it is managed internally and available inside Edge Functions as `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`.

## GCP deployment path

Use Cloud Console for the first sprint.

1. Enable these APIs in the GCP project:
   - Cloud Run Admin API
   - Cloud Build API
   - Artifact Registry API
   - Cloud Scheduler API
   - Secret Manager API
   - Cloud Logging API
2. Create these secrets in GCP Secret Manager:
   - `LOVABLE_EVENT_IMPORT_URL`
   - `EVENT_INGEST_TOKEN`
3. Add the same token in Lovable as:
   - `GCP_EVENT_INGEST_TOKEN`
4. Deploy the `gcp-event-import` Edge Function through Lovable.
5. Create an Artifact Registry Docker repository, for example `foodxmobile-workers`.
6. Build and deploy this folder as a Cloud Run Job.
7. Configure the job container environment:
   - Mount/expose `LOVABLE_EVENT_IMPORT_URL` and `EVENT_INGEST_TOKEN` from GCP Secret Manager.
   - Set `MAX_SOURCES=10` for the first test run.
8. Run the job manually once.
9. Check Cloud Logging for crawler results.
10. Check Supabase/Lovable database `event_import_queue` for imported records.
11. Add a Cloud Scheduler trigger after the manual run works.

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
