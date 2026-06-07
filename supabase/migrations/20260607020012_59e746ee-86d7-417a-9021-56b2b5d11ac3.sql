
-- 1. Extend leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'vendor_direct',
  ADD COLUMN IF NOT EXISTS event_start_time text,
  ADD COLUMN IF NOT EXISTS event_end_time text,
  ADD COLUMN IF NOT EXISTS event_location text,
  ADD COLUMN IF NOT EXISTS event_zip text,
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS event_frequency text,
  ADD COLUMN IF NOT EXISTS service_style text,
  ADD COLUMN IF NOT EXISTS cuisine_preference text,
  ADD COLUMN IF NOT EXISTS budget_range text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS distribution_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS matched_vendor_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_vendor_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE public.leads ALTER COLUMN business_id DROP NOT NULL;

-- Owner SELECT for matched event inquiries
DROP POLICY IF EXISTS "owners read matched event inquiries" ON public.leads;
CREATE POLICY "owners read matched event inquiries" ON public.leads
  FOR SELECT
  USING (
    lead_type = 'event_inquiry'
    AND business_id IS NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = auth.uid()
        AND b.id = ANY(public.leads.assigned_vendor_ids)
    )
  );

-- 2. vendor_lead_preferences
CREATE TABLE IF NOT EXISTS public.vendor_lead_preferences (
  business_id uuid PRIMARY KEY,
  receive_inquiries boolean NOT NULL DEFAULT true,
  paused boolean NOT NULL DEFAULT false,
  service_area text,
  max_travel_miles int,
  cuisine_categories text[] NOT NULL DEFAULT '{}',
  min_guest_count int,
  accepts_private boolean NOT NULL DEFAULT true,
  accepts_festivals boolean NOT NULL DEFAULT true,
  accepts_catering boolean NOT NULL DEFAULT true,
  accepts_individual_purchase boolean NOT NULL DEFAULT true,
  preferred_contact_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_lead_preferences TO authenticated;
GRANT ALL ON public.vendor_lead_preferences TO service_role;

ALTER TABLE public.vendor_lead_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners manage own lead prefs" ON public.vendor_lead_preferences;
CREATE POLICY "owners manage own lead prefs" ON public.vendor_lead_preferences
  FOR ALL
  USING (public.owns_business(auth.uid(), business_id))
  WITH CHECK (public.owns_business(auth.uid(), business_id));

DROP POLICY IF EXISTS "admins manage all lead prefs" ON public.vendor_lead_preferences;
CREATE POLICY "admins manage all lead prefs" ON public.vendor_lead_preferences
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER touch_vendor_lead_preferences_updated_at
  BEFORE UPDATE ON public.vendor_lead_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. submit_event_inquiry RPC
CREATE OR REPLACE FUNCTION public.submit_event_inquiry(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := trim(coalesce(_payload->>'contact_name', ''));
  v_email text := trim(coalesce(_payload->>'contact_email', ''));
  v_phone text := trim(coalesce(_payload->>'contact_phone', ''));
  v_event_date text := nullif(trim(coalesce(_payload->>'event_date', '')), '');
  v_location text := nullif(trim(coalesce(_payload->>'event_location', '')), '');
  v_guests text := nullif(trim(coalesce(_payload->>'guest_count', '')), '');
  v_consent boolean := coalesce((_payload->>'consent')::boolean, false);
  v_cuisine text := nullif(trim(coalesce(_payload->>'cuisine_preference', '')), '');
  v_category_id uuid := nullif(_payload->>'category_id', '')::uuid;
  v_lead_id uuid;
  v_matched uuid[];
BEGIN
  IF length(v_name) = 0 THEN RAISE EXCEPTION 'Contact name is required'; END IF;
  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'A valid email is required'; END IF;
  IF length(v_phone) = 0 THEN RAISE EXCEPTION 'Phone number is required'; END IF;
  IF v_event_date IS NULL THEN RAISE EXCEPTION 'Event date is required'; END IF;
  IF v_location IS NULL THEN RAISE EXCEPTION 'Event location is required'; END IF;
  IF v_guests IS NULL THEN RAISE EXCEPTION 'Estimated guest count is required'; END IF;
  IF NOT v_consent THEN RAISE EXCEPTION 'Consent is required'; END IF;

  -- Match up to 10 published vendors
  IF v_category_id IS NOT NULL THEN
    SELECT array_agg(b.id) INTO v_matched FROM (
      SELECT b.id FROM public.businesses b
      LEFT JOIN public.vendor_lead_preferences p ON p.business_id = b.id
      WHERE b.is_published = true
        AND b.listing_status IN ('claimed_free','premium')
        AND (p.business_id IS NULL OR (coalesce(p.receive_inquiries,true) AND NOT coalesce(p.paused,false)))
        AND (b.category_id = v_category_id
             OR EXISTS (SELECT 1 FROM public.business_subcategories bs WHERE bs.business_id = b.id AND bs.category_id = v_category_id))
      ORDER BY b.is_featured DESC, b.updated_at DESC
      LIMIT 10
    ) b;
  ELSE
    SELECT array_agg(b.id) INTO v_matched FROM (
      SELECT b.id FROM public.businesses b
      LEFT JOIN public.vendor_lead_preferences p ON p.business_id = b.id
      WHERE b.is_published = true
        AND b.listing_status IN ('claimed_free','premium')
        AND (p.business_id IS NULL OR (coalesce(p.receive_inquiries,true) AND NOT coalesce(p.paused,false)))
        AND (v_cuisine IS NULL OR coalesce(b.cuisine,'') ILIKE '%' || v_cuisine || '%')
      ORDER BY b.is_featured DESC, b.updated_at DESC
      LIMIT 10
    ) b;
  END IF;

  v_matched := coalesce(v_matched, '{}'::uuid[]);

  INSERT INTO public.leads (
    business_id, contact_name, contact_email, contact_phone,
    event_type, event_date, guest_count, message, source,
    lead_type, event_start_time, event_end_time, event_location, event_zip,
    request_type, event_frequency, service_style, cuisine_preference, budget_range,
    consent_at, distribution_status, matched_vendor_count, assigned_vendor_ids
  ) VALUES (
    NULL, v_name, v_email, nullif(v_phone, ''),
    nullif(trim(coalesce(_payload->>'event_type','')), ''),
    v_event_date, v_guests,
    nullif(trim(coalesce(_payload->>'message','')), ''),
    'Book a Food Truck',
    'event_inquiry',
    nullif(trim(coalesce(_payload->>'event_start_time','')), ''),
    nullif(trim(coalesce(_payload->>'event_end_time','')), ''),
    v_location,
    nullif(trim(coalesce(_payload->>'event_zip','')), ''),
    nullif(trim(coalesce(_payload->>'request_type','')), ''),
    nullif(trim(coalesce(_payload->>'event_frequency','')), ''),
    nullif(trim(coalesce(_payload->>'service_style','')), ''),
    v_cuisine,
    nullif(trim(coalesce(_payload->>'budget_range','')), ''),
    now(),
    CASE WHEN coalesce(array_length(v_matched,1),0) = 0 THEN 'pending_review' ELSE 'matched' END,
    coalesce(array_length(v_matched,1),0),
    v_matched
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_event_inquiry(jsonb) TO anon, authenticated;
