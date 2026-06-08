-- ============================================================
-- Public archive safety net + obvious claim-email typo blocking
-- ============================================================

-- Public listing reads must exclude archived rows even if stale application
-- code accidentally leaves is_published=true.
DROP POLICY IF EXISTS "public read published businesses" ON public.businesses;
CREATE POLICY "public read published businesses"
  ON public.businesses FOR SELECT
  USING (is_published = true AND listing_status <> 'archived'::listing_status);

-- Apply the same stale-flag safety net to dependent public resources.
DROP POLICY IF EXISTS "public read photos of published" ON public.business_photos;
CREATE POLICY "public read photos of published"
  ON public.business_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.is_published = true
        AND b.listing_status <> 'archived'::listing_status
    )
  );

DROP POLICY IF EXISTS "public read menu cats of published" ON public.menu_categories;
CREATE POLICY "public read menu cats of published"
  ON public.menu_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.is_published = true
        AND b.listing_status <> 'archived'::listing_status
    )
  );

DROP POLICY IF EXISTS "public read menu items of published" ON public.menu_items;
CREATE POLICY "public read menu items of published"
  ON public.menu_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.is_published = true
        AND b.listing_status <> 'archived'::listing_status
    )
  );

DROP POLICY IF EXISTS "public read public events of published" ON public.business_events;
CREATE POLICY "public read public events of published"
  ON public.business_events FOR SELECT
  USING (
    is_public
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.is_published = true
        AND b.listing_status <> 'archived'::listing_status
    )
  );

DROP POLICY IF EXISTS "anyone can submit leads to published" ON public.leads;
CREATE POLICY "anyone can submit leads to published"
  ON public.leads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.is_published = true
        AND b.listing_status <> 'archived'::listing_status
    )
  );

-- Obvious malformed-but-regex-valid typo patterns should not pass through the
-- claim workflow. Provider misspellings remain a client warning so legitimate
-- custom domains are not overblocked.
CREATE OR REPLACE FUNCTION public.reject_obvious_claim_email_typos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(NEW.requester_email, '')));
BEGIN
  IF v_email ~ '\.(coms|con|cmo)$' THEN
    RAISE EXCEPTION 'That email domain looks mistyped. Please review and correct the email address.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claim_requests_reject_obvious_email_typos ON public.claim_requests;
CREATE TRIGGER claim_requests_reject_obvious_email_typos
  BEFORE INSERT OR UPDATE OF requester_email
  ON public.claim_requests
  FOR EACH ROW EXECUTE FUNCTION public.reject_obvious_claim_email_typos();
