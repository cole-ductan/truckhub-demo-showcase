# Public Discovery + Calendar + Book-a-Truck (Phase 1)

Big scope: 3 new public routes, homepage restructure, For-Vendors trim, new public lead-gen flow, CRM extension, and vendor lead-preference scaffolding. The private owner console, admin rules, and auth flows are not touched.

## Routes
- `/` — homepage becomes consumer discovery hub
- `/food-trucks` — unchanged
- `/calendar` — NEW public events page (works logged out)
- `/book-a-food-truck` — NEW public booking search + general inquiry
- `/book-a-food-truck/request-received` — NEW success page
- `/for-vendors` — trimmed to vendor-conversion only

## Navigation
`SiteHeader.tsx`: nav = Home, Food Trucks, Calendar, Book a Truck, For Vendors. Mobile keeps Book a Truck as a prominent button in the sheet.

## Homepage (`src/pages/SmokeTrail.tsx`)
1. Hero split: existing copy left, `LiveDiscoveryMap` moved into the right column (responsive height, no duplicate map elsewhere). Hero CTAs: "Explore Food Trucks" → `/food-trucks`, "Book a Truck" → `/book-a-food-truck`.
2. "Today's Food Trucks" section (moved from For Vendors) — filters businesses with a `business_events` or `saved_locations` entry covering today; empty state copy as specified, links to `/food-trucks`.
3. Compact "Planning an Event?" CTA card → `/book-a-food-truck`.
4. "Events This Week" (moved from For Vendors, renamed) with "View Full Calendar" → `/calendar`. Cards link to vendor profile (no broken event-detail links).
5. Browse Categories strip: Food Trucks → `/food-trucks`, Farmers Markets / Rallies / Local Events → `/calendar` until dedicated routes exist (no broken links).
6. Vendor CTA retained at bottom: "Claim Your Listing" → `/food-trucks` (claim entry) and "Learn More for Vendors" → `/for-vendors`.

## `/calendar` (new `src/pages/PublicCalendar.tsx`)
- Queries `business_events` where `is_public = true` joined to published businesses only.
- Layout: month calendar + list view tabs (reuses `@/components/ui/calendar` + cards). Filters by category and date range when data supports it.
- Empty state + SEO meta. No owner notes, drafts, or admin controls surfaced.

## `/book-a-food-truck` (new `src/pages/BookFoodTruck.tsx`)
Two tabs/paths on one page:
- **Browse**: filters (date, event type, location/ZIP, guest count, cuisine/category, optional budget, service style) → vendor cards reusing existing truck card. Availability badge derived from `business_events` + `saved_locations`:
  - explicit available event on date → "Available"
  - no conflict, no explicit confirm → "Possibly Available"
  - no schedule data → "Availability Not Confirmed"
  - fallback CTA → "Contact Vendor"
- **Send one request**: form with all fields listed (customer info, event details, request type, recurring, service style, consent). Required: name, email, phone, date, location, guest count, consent. Uses zod + honeypot field, 60s client rate-limit per browser. Submits to `submit_event_inquiry` RPC.

## `/book-a-food-truck/request-received`
Static confirmation page with "Browse Food Trucks" and "Return Home" buttons. No response-time promises.

## `/for-vendors` (`src/pages/Index.tsx`)
Remove Today's Trucks and Events preview sections; keep vendor-conversion content (claim, profile, schedule, promo, inquiries, subscription benefits, CTAs).

## Database (single migration)

```sql
-- 1. Extend leads with event-inquiry columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'vendor_direct',
  ADD COLUMN IF NOT EXISTS event_start_time text,
  ADD COLUMN IF NOT EXISTS event_end_time text,
  ADD COLUMN IF NOT EXISTS event_location text,
  ADD COLUMN IF NOT EXISTS event_zip text,
  ADD COLUMN IF NOT EXISTS request_type text,            -- single | multiple | unsure
  ADD COLUMN IF NOT EXISTS event_frequency text,         -- one_time | weekly | monthly | seasonal | multiple | unsure
  ADD COLUMN IF NOT EXISTS service_style text,           -- individual | host_pays | either | unsure
  ADD COLUMN IF NOT EXISTS cuisine_preference text,
  ADD COLUMN IF NOT EXISTS budget_range text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS distribution_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS matched_vendor_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_vendor_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- 2. Vendor lead preferences (scaffold)
CREATE TABLE IF NOT EXISTS public.vendor_lead_preferences (
  business_id uuid PRIMARY KEY,
  receive_inquiries boolean NOT NULL DEFAULT true,
  paused boolean NOT NULL DEFAULT false,
  service_area text,
  max_travel_miles int,
  cuisine_categories text[] DEFAULT '{}',
  min_guest_count int,
  accepts_private boolean DEFAULT true,
  accepts_festivals boolean DEFAULT true,
  accepts_catering boolean DEFAULT true,
  accepts_individual_purchase boolean DEFAULT true,
  preferred_contact_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_lead_preferences TO authenticated;
GRANT ALL ON public.vendor_lead_preferences TO service_role;
ALTER TABLE public.vendor_lead_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage own lead prefs" ON public.vendor_lead_preferences
  FOR ALL USING (public.owns_business(auth.uid(), business_id))
  WITH CHECK (public.owns_business(auth.uid(), business_id));
CREATE POLICY "admins manage all lead prefs" ON public.vendor_lead_preferences
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3. Public submission RPC (SECURITY DEFINER, anon-callable, capped vendor distribution)
CREATE OR REPLACE FUNCTION public.submit_event_inquiry(_payload jsonb) RETURNS uuid ...;
GRANT EXECUTE ON FUNCTION public.submit_event_inquiry(jsonb) TO anon, authenticated;
```

RPC behavior:
- Validates required fields and consent.
- Inserts a `leads` row with `business_id = NULL`-equivalent sentinel? — leads currently requires `business_id`; we'll relax with `ALTER TABLE public.leads ALTER COLUMN business_id DROP NOT NULL` and switch `lead_type='event_inquiry'` for null-business rows; existing RLS still covers vendor-direct rows.
- Matches up to 10 published businesses by cuisine/category, sets `assigned_vendor_ids` + `matched_vendor_count`, `distribution_status = 'matched'` (or `pending_review` if 0 matches).
- Adds RLS policy `anon insert event inquiries` scoped to `lead_type='event_inquiry' AND business_id IS NULL` via the SECURITY DEFINER function (no direct anon insert policy needed).
- Admin SELECT already covers it; add owner SELECT for rows where `business_id = ANY(assigned_vendor_ids)`.

## Admin CRM
`AdminLeads.tsx` gains a Source/Type column and filters for `lead_type` and `distribution_status`, plus actions: Mark complete, Archive, Delete, view archived. No new page — extends existing CRM.

## Vendor lead preferences UI
Add `src/pages/owner/OwnerLeadPreferences.tsx` route `/owner/lead-preferences` for owners with at least one approved business. Claimants-only (no `businesses.owner_id` rows) see a "Pending approval" notice. Full UI ships now since the data model is small.

## Availability helper
New `src/lib/availability.ts` with `getAvailability(business, date)` returning the four states. Reused by Browse path cards.

## Files

New:
- `src/pages/PublicCalendar.tsx`
- `src/pages/BookFoodTruck.tsx`
- `src/pages/BookRequestReceived.tsx`
- `src/pages/owner/OwnerLeadPreferences.tsx`
- `src/components/site/TodaysFoodTrucks.tsx`
- `src/components/site/EventsThisWeek.tsx`
- `src/components/site/BrowseCategories.tsx`
- `src/components/site/PlanningEventCTA.tsx`
- `src/lib/availability.ts`
- `supabase/migrations/<ts>_book_a_truck.sql`

Edited:
- `src/App.tsx` (routes)
- `src/components/site/SiteHeader.tsx` (nav)
- `src/pages/SmokeTrail.tsx` (homepage restructure, map in hero)
- `src/pages/Index.tsx` (For Vendors trim)
- `src/pages/admin/AdminLeads.tsx` (filters + actions)
- `src/components/owner/OwnerSidebar.tsx` (Lead Preferences link, gated)

## Explicitly deferred
- Outbound email/SMS automation to matched vendors (data captured, edge function not wired)
- Stripe-based lead unlocks, subscription tier gating, bidding
- Dedicated event-detail pages and Farmers Markets / Rallies category routes
- Honeypot-only spam protection now; full CAPTCHA deferred unless an existing provider is wired

Want me to proceed with this plan?
