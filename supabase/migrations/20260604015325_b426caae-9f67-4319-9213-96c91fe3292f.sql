
-- 1. Ensure canonical live-map coordinate columns exist (earlier map migrations
--    were never applied to this database — recreate idempotently).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS today_latitude double precision,
  ADD COLUMN IF NOT EXISTS today_longitude double precision;

ALTER TABLE public.saved_locations
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.business_events
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_today_latitude_range') THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_today_latitude_range CHECK (today_latitude IS NULL OR today_latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_today_longitude_range') THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_today_longitude_range CHECK (today_longitude IS NULL OR today_longitude BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_locations_latitude_range') THEN
    ALTER TABLE public.saved_locations
      ADD CONSTRAINT saved_locations_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_locations_longitude_range') THEN
    ALTER TABLE public.saved_locations
      ADD CONSTRAINT saved_locations_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_events_latitude_range') THEN
    ALTER TABLE public.business_events
      ADD CONSTRAINT business_events_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_events_longitude_range') THEN
    ALTER TABLE public.business_events
      ADD CONSTRAINT business_events_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
END $$;

-- 2. Migrate any data from the deprecated current_* fields into the canonical today_* fields.
UPDATE public.businesses
SET
  today_latitude  = COALESCE(today_latitude,  current_latitude::double precision),
  today_longitude = COALESCE(today_longitude, current_longitude::double precision)
WHERE
  (today_latitude  IS NULL AND current_latitude  IS NOT NULL)
  OR (today_longitude IS NULL AND current_longitude IS NOT NULL);

COMMENT ON COLUMN public.businesses.today_latitude  IS 'Latitude for the business current public location shown on the live map.';
COMMENT ON COLUMN public.businesses.today_longitude IS 'Longitude for the business current public location shown on the live map.';
COMMENT ON COLUMN public.businesses.current_latitude  IS 'DEPRECATED compatibility field. Live map uses today_latitude. Do not write new values.';
COMMENT ON COLUMN public.businesses.current_longitude IS 'DEPRECATED compatibility field. Live map uses today_longitude. Do not write new values.';

-- 3. Lock the deprecated sensitive columns to NULL so nothing can write back to them.
--    Verified above that no rows currently hold non-null values.
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_deprecated_outreach_email_null CHECK (outreach_email IS NULL),
  ADD CONSTRAINT businesses_deprecated_internal_notes_null CHECK (internal_notes IS NULL);
