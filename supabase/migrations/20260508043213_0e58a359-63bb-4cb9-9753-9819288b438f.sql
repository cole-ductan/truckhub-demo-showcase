
ALTER TABLE public.businesses        ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.leads             ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.lead_messages     ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings          ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.deposit_requests  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_categories   ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_items        ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.business_events   ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.saved_locations   ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.owner_preferences ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.business_photos   ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Tag existing seed businesses
UPDATE public.businesses SET is_demo = true
 WHERE slug IN ('smoke-trail-bbq','bay-burger-co','tortilla-norte','stone-oven-pies','north-coast-waffles','fowl-play');

-- Tag children of demo businesses
UPDATE public.menu_categories  SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
UPDATE public.menu_items       SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
UPDATE public.business_events  SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
UPDATE public.saved_locations  SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
UPDATE public.business_photos  SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
UPDATE public.leads            SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
UPDATE public.lead_messages    SET is_demo = true WHERE lead_id     IN (SELECT id FROM public.leads      WHERE is_demo);
UPDATE public.bookings         SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
UPDATE public.deposit_requests SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
UPDATE public.owner_preferences SET is_demo = true WHERE business_id IN (SELECT id FROM public.businesses WHERE is_demo);
