# FoodXMobile GCP Event Crawler Sprint

## Goal

Use expiring GCP credits to create a temporary crawler/testing layer for local event discovery while keeping FoodXMobile's source of truth in Supabase.

Architecture:

```text
Cloud Scheduler
  -> Cloud Run Job
    -> event_sources
    -> source websites with JSON-LD Event metadata
    -> event_import_queue
    -> admin review
    -> public events later
```

## What this PR includes

- `event_sources` table for admin-managed event URLs.
- `event_import_queue` table for imported event candidates.
- `review_event_import()` RPC for admin review status updates.
- A separate Cloud Run compatible worker in `tools/gcp-event-crawler`.
- A deployment README for the GCP side.

## What this PR intentionally does not include

- Public auto-publishing.
- Facebook/Google results scraping.
- Login-gated crawler behavior.
- Full admin UI.
- ICS/RSS/custom parsers.

Those should be separate PRs after the foundation is verified.

## Seven-day sprint

### Day 1: Merge foundation

- Review and merge this PR.
- Confirm Supabase migration applies cleanly.
- Confirm `event_sources` and `event_import_queue` exist.

### Day 2: Add first event sources

Add 10 to 20 sources manually in Supabase or through the next admin UI update.

Recommended fields:

| Field | Example |
| --- | --- |
| `source_name` | Green Bay Events Calendar |
| `source_url` | Source calendar URL |
| `source_type` | `json_ld` or `webpage` |
| `city` | Green Bay |
| `region` | Brown County |
| `category` | Community |
| `crawl_frequency` | daily |
| `active` | true |

### Day 3: Deploy worker to GCP

- Enable required APIs.
- Store Supabase secrets in Secret Manager.
- Deploy the worker as a Cloud Run Job.
- Run it manually with `MAX_SOURCES=10`.

### Day 4: Validate data quality

Check:

- Titles are readable.
- Dates are correct.
- Venue/address fields are usable.
- Source URL points back to the original event.
- Duplicates are not multiplying.

### Day 5: Add admin review UI

Add an admin page for:

- Event sources
- Import queue
- Approve/reject/needs edit
- Duplicate status
- Source crawl health

### Day 6: Add scheduler

Create a Cloud Scheduler trigger for one daily run. Keep volume small until quality is proven.

### Day 7: Decide keep/kill/migrate

Choose one:

1. Keep Cloud Run Job active with billing.
2. Pause the scheduler and keep only the code.
3. Move the worker to another low-cost scheduled environment.
4. Expand with RSS/ICS/custom parsers.

## Source policy

Use crawling to discover and summarize events, not clone sites.

Do:

- Store source attribution.
- Store source event URL.
- Keep descriptions concise when needed.
- Prefer structured feeds and official calendars.

Do not:

- Scrape Google search results.
- Scrape Facebook Events behind login/anti-bot controls.
- Copy entire copyrighted event pages.
- Hammer sites with aggressive frequency.

## Next PR recommendation

Build the admin UI after this PR:

- `/admin/event-sources`
- `/admin/event-imports`
- Source health cards
- Review queue table
- Edit modal
- Publish action to the real public events table once that schema is finalized
