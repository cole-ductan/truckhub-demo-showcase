-- Keep map pins stable when owners use existing one-tap location actions or reset demo content.

CREATE OR REPLACE FUNCTION public.sync_business_today_coordinates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  matched_lat double precision;
  matched_lng double precision;
  location_changed boolean;
  coordinates_unchanged boolean;
BEGIN
  location_changed := TG_OP = 'INSERT';
  coordinates_unchanged := NEW.today_latitude IS NULL OR NEW.today_longitude IS NULL;

  IF TG_OP = 'UPDATE' THEN
    location_changed := NEW.today_location IS DISTINCT FROM OLD.today_location;
    coordinates_unchanged := coordinates_unchanged OR (
      NEW.today_latitude IS NOT DISTINCT FROM OLD.today_latitude
      AND NEW.today_longitude IS NOT DISTINCT FROM OLD.today_longitude
    );
  END IF;

  -- Preserve manually supplied coordinates. When only the text location changes,
  -- copy coordinates from a matching saved stop when available.
  IF NEW.today_location IS NOT NULL AND location_changed AND coordinates_unchanged THEN
    SELECT sl.latitude, sl.longitude
      INTO matched_lat, matched_lng
      FROM public.saved_locations sl
     WHERE sl.business_id = NEW.id
       AND sl.latitude IS NOT NULL
       AND sl.longitude IS NOT NULL
       AND (sl.address = NEW.today_location OR sl.label = NEW.today_location)
     ORDER BY sl.sort_order, sl.created_at
     LIMIT 1;

    IF matched_lat IS NOT NULL AND matched_lng IS NOT NULL THEN
      NEW.today_latitude := matched_lat;
      NEW.today_longitude := matched_lng;
    END IF;
  END IF;

  -- Demo fallback keeps the showcase map alive after admin reset.
  IF NEW.slug = 'smoke-trail-bbq' AND (NEW.today_latitude IS NULL OR NEW.today_longitude IS NULL) THEN
    NEW.today_latitude := 44.5039;
    NEW.today_longitude := -88.0605;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_business_today_coordinates_trigger ON public.businesses;
CREATE TRIGGER sync_business_today_coordinates_trigger
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.sync_business_today_coordinates();

CREATE OR REPLACE FUNCTION public.seed_demo_saved_location_coordinates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    IF NEW.label = 'Titletown District' THEN
      NEW.latitude := 44.5039;
      NEW.longitude := -88.0605;
    ELSIF NEW.label = 'Hinterland Brewery' THEN
      NEW.latitude := 44.4978;
      NEW.longitude := -88.0558;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_demo_saved_location_coordinates_trigger ON public.saved_locations;
CREATE TRIGGER seed_demo_saved_location_coordinates_trigger
BEFORE INSERT OR UPDATE ON public.saved_locations
FOR EACH ROW EXECUTE FUNCTION public.seed_demo_saved_location_coordinates();

CREATE OR REPLACE FUNCTION public.seed_demo_event_coordinates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    IF NEW.title = 'Titletown Spring Food Truck Rally' THEN
      NEW.latitude := 44.5039;
      NEW.longitude := -88.0605;
    ELSIF NEW.title = 'First Friday on Broadway' THEN
      NEW.latitude := 44.5184;
      NEW.longitude := -88.0198;
    ELSIF NEW.title = 'Packers Draft Watch Party' THEN
      NEW.latitude := 44.5013;
      NEW.longitude := -88.0622;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_demo_event_coordinates_trigger ON public.business_events;
CREATE TRIGGER seed_demo_event_coordinates_trigger
BEFORE INSERT OR UPDATE ON public.business_events
FOR EACH ROW EXECUTE FUNCTION public.seed_demo_event_coordinates();
