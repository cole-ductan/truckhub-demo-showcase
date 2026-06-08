-- Archived listings are terminal until a deliberate restore workflow is added.
-- This prevents direct table updates from silently reactivating an archived row.
CREATE OR REPLACE FUNCTION public.prevent_implicit_archived_business_restore()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.listing_status = 'archived'::listing_status
     AND NEW.listing_status <> 'archived'::listing_status THEN
    RAISE EXCEPTION 'archived listings cannot be restored from this workflow';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_block_implicit_archived_restore ON public.businesses;
CREATE TRIGGER businesses_block_implicit_archived_restore
  BEFORE UPDATE OF listing_status
  ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_implicit_archived_business_restore();
