-- Online ordering fields on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS online_ordering_url text,
  ADD COLUMN IF NOT EXISTS order_button_label text DEFAULT 'Order Online',
  ADD COLUMN IF NOT EXISTS ordering_enabled boolean NOT NULL DEFAULT false;

-- Saved locations for quick today/recurring assignment
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  label text NOT NULL,
  address text,
  notes text,
  weekday text,
  start_time text,
  end_time text,
  is_recurring boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own saved locations"
  ON public.saved_locations FOR ALL
  USING (owns_business(auth.uid(), business_id))
  WITH CHECK (owns_business(auth.uid(), business_id));

CREATE POLICY "admins manage all saved locations"
  ON public.saved_locations FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "public read saved locations of published"
  ON public.saved_locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = saved_locations.business_id AND b.is_published
  ));

CREATE TRIGGER touch_saved_locations_updated_at
  BEFORE UPDATE ON public.saved_locations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();