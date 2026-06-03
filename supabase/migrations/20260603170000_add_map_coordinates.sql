-- FoodXMobile map MVP: coordinate support for live truck locations, saved stops, and events

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS today_latitude double precision,
  ADD COLUMN IF NOT EXISTS today_longitude double precision;

ALTER TABLE public.saved_locations
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.business_events
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Basic coordinate guards. NULL remains valid while an owner has not mapped a listing yet.
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_today_latitude_range CHECK (today_latitude IS NULL OR today_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT businesses_today_longitude_range CHECK (today_longitude IS NULL OR today_longitude BETWEEN -180 AND 180);

ALTER TABLE public.saved_locations
  ADD CONSTRAINT saved_locations_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT saved_locations_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

ALTER TABLE public.business_events
  ADD CONSTRAINT business_events_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT business_events_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

COMMENT ON COLUMN public.businesses.today_latitude IS 'Latitude for the business current public location shown on the live map.';
COMMENT ON COLUMN public.businesses.today_longitude IS 'Longitude for the business current public location shown on the live map.';
COMMENT ON COLUMN public.saved_locations.latitude IS 'Latitude for a reusable owner saved stop.';
COMMENT ON COLUMN public.saved_locations.longitude IS 'Longitude for a reusable owner saved stop.';
COMMENT ON COLUMN public.business_events.latitude IS 'Latitude for a public event map marker.';
COMMENT ON COLUMN public.business_events.longitude IS 'Longitude for a public event map marker.';
