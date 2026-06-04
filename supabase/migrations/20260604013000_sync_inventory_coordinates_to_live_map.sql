-- Checkpoint A cleanup: keep one operational source of truth for live listing pins.
-- The map MVP and owner workspace already use today_latitude/today_longitude.
-- Lovable's inventory migration added current_latitude/current_longitude separately.
-- Preserve any values already entered through the new admin editor by copying them
-- only where the canonical live-map fields are still empty.

UPDATE public.businesses
SET
  today_latitude = COALESCE(today_latitude, current_latitude::double precision),
  today_longitude = COALESCE(today_longitude, current_longitude::double precision)
WHERE
  (today_latitude IS NULL AND current_latitude IS NOT NULL)
  OR (today_longitude IS NULL AND current_longitude IS NOT NULL);

COMMENT ON COLUMN public.businesses.current_latitude IS
  'Checkpoint A compatibility field. Live map features use today_latitude. Do not write new UI values here.';

COMMENT ON COLUMN public.businesses.current_longitude IS
  'Checkpoint A compatibility field. Live map features use today_longitude. Do not write new UI values here.';
