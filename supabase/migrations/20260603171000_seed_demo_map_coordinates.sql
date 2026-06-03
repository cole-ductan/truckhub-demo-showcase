-- FoodXMobile map MVP: preview coordinates for existing demo content
-- These rows are intentionally limited to seeded demo listings and can be edited later in the owner/admin UI.

UPDATE public.businesses
SET today_latitude = 44.5039,
    today_longitude = -88.0605
WHERE slug = 'smoke-trail-bbq';

UPDATE public.saved_locations sl
SET latitude = CASE sl.label
    WHEN 'Titletown District' THEN 44.5039
    WHEN 'Hinterland Brewery' THEN 44.4978
    ELSE sl.latitude
  END,
  longitude = CASE sl.label
    WHEN 'Titletown District' THEN -88.0605
    WHEN 'Hinterland Brewery' THEN -88.0558
    ELSE sl.longitude
  END
FROM public.businesses b
WHERE sl.business_id = b.id
  AND b.slug = 'smoke-trail-bbq'
  AND sl.label IN ('Titletown District', 'Hinterland Brewery');

UPDATE public.business_events be
SET latitude = CASE be.title
    WHEN 'Titletown Spring Food Truck Rally' THEN 44.5039
    WHEN 'First Friday on Broadway' THEN 44.5184
    WHEN 'Packers Draft Watch Party' THEN 44.5013
    ELSE be.latitude
  END,
  longitude = CASE be.title
    WHEN 'Titletown Spring Food Truck Rally' THEN -88.0605
    WHEN 'First Friday on Broadway' THEN -88.0198
    WHEN 'Packers Draft Watch Party' THEN -88.0622
    ELSE be.longitude
  END
FROM public.businesses b
WHERE be.business_id = b.id
  AND b.slug = 'smoke-trail-bbq'
  AND be.title IN (
    'Titletown Spring Food Truck Rally',
    'First Friday on Broadway',
    'Packers Draft Watch Party'
  );
