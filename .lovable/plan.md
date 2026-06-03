# Checkpoint A — Inventory Foundation

Scope is **Checkpoint A only**. I will stop and summarize after it ships, then wait for approval before Checkpoint B.

## 1. Database migration (single migration, additive only)

Extend `public.businesses` with columns that don't already exist. Nothing renamed, nothing dropped.

New enum + columns:

```text
CREATE TYPE public.listing_status AS ENUM
  ('draft','unclaimed','claimed_free','premium','archived');

ALTER TABLE public.businesses
  ADD COLUMN listing_status   public.listing_status NOT NULL DEFAULT 'draft',
  ADD COLUMN contact_name     text,
  ADD COLUMN outreach_email   text,         -- internal, never exposed publicly
  ADD COLUMN service_area     text,
  ADD COLUMN current_address  text,
  ADD COLUMN current_latitude  numeric(9,6),
  ADD COLUMN current_longitude numeric(9,6),
  ADD COLUMN catering_available        boolean NOT NULL DEFAULT false,
  ADD COLUMN booking_inquiry_enabled   boolean NOT NULL DEFAULT true,
  ADD COLUMN internal_notes  text;          -- admin only
```

Reused (NOT re-added): `name, slug, emoji, description, tagline, cuisine, category_id, city, region, is_published, phone, email, website, instagram, facebook, online_ordering_url, today_location, today_hours, status, hero_image_url, logo_url`. Specialty categories continue to use existing `business_subcategories`.

Backfill: every existing row gets `listing_status = CASE WHEN owner_id IS NOT NULL THEN 'claimed_free' WHEN is_published THEN 'unclaimed' ELSE 'draft' END`.

### RLS adjustments (protect new admin-only fields)

The current `public read published businesses` policy grants public SELECT on every column. `outreach_email` and `internal_notes` must stay admin/owner-only.

Approach: keep the table policy as-is for owners/admins, but add a column-filtered **view** `public.businesses_public` (security_invoker) that excludes `outreach_email` and `internal_notes`, and revoke public SELECT on those two columns from the `anon` role via `REVOKE SELECT (outreach_email, internal_notes) ON public.businesses FROM anon`. The public site already selects explicit columns, so this is safe.

(Note: the existing `phone`/`email` public-exposure scanner warning is pre-existing and out of scope for Checkpoint A — flagged below.)

## 2. Admin UI — Businesses list (`/admin/businesses`)

Extend `AdminBusinesses.tsx`:
- Add a `listing_status` badge column with color coding.
- Add a Listing Status filter: All / Draft / Unclaimed / Claimed Free / Premium / Archived.
- Detail sheet: dropdown to change `listing_status`.
- Existing publish/feature/owner controls untouched.

## 3. Admin business editor — extended fields

Add a new admin page `/admin/businesses/:id/edit` (or extend the existing sheet into a full editor route) covering all sections listed in the brief — Core identity, Contact, Location (incl. lat/lng), Media, Operational, plus the new `internal_notes` and `outreach_email` fields. Specialty multi-select writes to `business_subcategories`.

## 4. CSV bulk import — `/admin/import-businesses`

New page + sidebar entry "Import Listings".

Flow:
1. Download template button (generates CSV with required + optional headers).
2. File picker → parse client-side with `papaparse` (already in repo? if not, add).
3. Preview table with per-row validation (required fields, slug format, lat/lng numeric, URLs).
4. Duplicate detection: normalized match on `slug`, `name`, `email`, `phone`, `website` against existing `businesses`. Per-row action: Skip / Insert / Overwrite-selected.
5. Submit → batched inserts/updates via supabase client (admin RLS allows). Default `listing_status='unclaimed'`, `is_published=false` unless CSV says otherwise.
6. Summary screen: inserted / updated / skipped / failed counts with row-level errors.

Required CSV headers (exactly as spec): `business_name, slug, cuisine, city, region, public_phone, public_email, website_url, instagram_url, facebook_url, short_description, today_location, today_latitude, today_longitude, listing_status, is_published, internal_notes`.

Optional: `contact_name, outreach_email, service_area, online_ordering_url, today_hours, catering_available, booking_inquiry_enabled, hero_image_url`.

## 5. Admin review queue — `/admin/listing-review`

New page + sidebar entry "Review Queue". Lists businesses with `listing_status IN ('draft','unclaimed')` ordered by `updated_at desc`. Card shows:
- Name, status, city, cuisine
- Completeness meters: contact (phone/email/website filled), images (hero+logo), location (address+lat+lng)
- Published badge
- Duplicate warning (same heuristic as import)
- Actions: Edit · Publish · Keep Draft · Archive · Mark Ready for Outreach (sets `listing_status='unclaimed'` + flag in `internal_notes` for now — full outreach tracker is Checkpoint C).

## 6. Routes & sidebar

`src/App.tsx`: add `/admin/import-businesses`, `/admin/listing-review`, `/admin/businesses/:id/edit`.
`src/components/admin/AdminSidebar.tsx`: add "Import Listings" and "Review Queue" links under Manage.

## 7. Types

`src/integrations/supabase/types.ts` regenerates after the migration runs.

## Out of scope (later checkpoints)
- Claim workflow, `claim_requests` table → Checkpoint B
- Outreach tracker table/page → Checkpoint C
- Tier-aware feature flags → Checkpoint D
- Pilot QA pass → Checkpoint E

## Risks / decisions to flag
- **Pre-existing security finding**: `businesses.phone` and `businesses.email` are publicly readable. Not introduced by this checkpoint; recommend addressing in a dedicated pass (move private contact to owner-only and expose only what the owner opts in to).
- The two SECURITY DEFINER linter warnings (`has_role`, `is_admin`, `owns_business`, `claim_business`) are intentional for RLS plumbing; will mark as accepted in security memory if you want.
- I'll add `papaparse` if not already installed.

## Stop condition
After implementation I will post: summary, files changed, migrations, new routes, RLS changes, QA checklist — then wait.
