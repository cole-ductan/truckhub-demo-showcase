
-- Checkpoint A: listing status + inventory fields
CREATE TYPE public.listing_status AS ENUM ('draft','unclaimed','claimed_free','premium','archived');

ALTER TABLE public.businesses
  ADD COLUMN listing_status public.listing_status NOT NULL DEFAULT 'draft',
  ADD COLUMN contact_name text,
  ADD COLUMN outreach_email text,
  ADD COLUMN service_area text,
  ADD COLUMN current_address text,
  ADD COLUMN current_latitude numeric(9,6),
  ADD COLUMN current_longitude numeric(9,6),
  ADD COLUMN catering_available boolean NOT NULL DEFAULT false,
  ADD COLUMN booking_inquiry_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN internal_notes text;

-- Backfill existing rows
UPDATE public.businesses
   SET listing_status = CASE
     WHEN owner_id IS NOT NULL THEN 'claimed_free'::public.listing_status
     WHEN is_published THEN 'unclaimed'::public.listing_status
     ELSE 'draft'::public.listing_status
   END;

-- Protect admin-only columns from public/anon reads
REVOKE SELECT (outreach_email, internal_notes) ON public.businesses FROM anon;
REVOKE SELECT (outreach_email, internal_notes) ON public.businesses FROM authenticated;
-- Re-grant to authenticated for all non-admin-only columns
GRANT SELECT (id, owner_id, name, slug, tagline, description, cuisine, emoji, category_id,
  logo_url, hero_image_url, phone, email, website, instagram, facebook,
  today_location, today_hours, status, is_published, is_featured, city, region,
  created_at, updated_at, online_ordering_url, order_button_label, ordering_enabled,
  is_demo, listing_status, contact_name, service_area, current_address,
  current_latitude, current_longitude, catering_available, booking_inquiry_enabled
) ON public.businesses TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_businesses_listing_status ON public.businesses(listing_status);
