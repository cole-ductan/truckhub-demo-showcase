-- Final Checkpoint C guard: Review Queue handoff may only transition claimable inventory.
-- Keep the UI filter as a convenience, but enforce the invariant in the database RPC.

CREATE OR REPLACE FUNCTION public.mark_business_ready_for_outreach(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz public.businesses;
  previous_status text;
  stamp text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO biz
  FROM public.businesses
  WHERE id = _business_id
  FOR UPDATE;

  IF biz.id IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF biz.owner_id IS NOT NULL THEN RAISE EXCEPTION 'owned listings cannot be moved into outreach'; END IF;
  IF biz.listing_status NOT IN ('draft', 'unclaimed') THEN
    RAISE EXCEPTION 'listing is not eligible for outreach: %', biz.listing_status;
  END IF;

  SELECT outreach_status INTO previous_status
  FROM public.business_outreach
  WHERE business_id = _business_id
  FOR UPDATE;

  INSERT INTO public.business_outreach (business_id, outreach_status)
  VALUES (_business_id, 'ready_to_contact')
  ON CONFLICT (business_id) DO UPDATE
    SET outreach_status = 'ready_to_contact', updated_at = now();

  UPDATE public.businesses
     SET listing_status = 'unclaimed', updated_at = now()
   WHERE id = _business_id;

  IF previous_status IS DISTINCT FROM 'ready_to_contact' THEN
    stamp := '[' || to_char(CURRENT_DATE, 'YYYY-MM-DD') || '] marked ready for outreach';

    INSERT INTO public.business_admin_metadata (business_id, internal_notes)
    VALUES (_business_id, stamp)
    ON CONFLICT (business_id) DO UPDATE
      SET internal_notes = CASE
        WHEN public.business_admin_metadata.internal_notes IS NULL OR trim(public.business_admin_metadata.internal_notes) = '' THEN stamp
        ELSE public.business_admin_metadata.internal_notes || E'\n' || stamp
      END,
      updated_at = now();

    INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
    VALUES (_business_id, auth.uid(), 'status_changed', 'Marked ready for outreach from review queue.');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_business_ready_for_outreach(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_business_ready_for_outreach(uuid) TO authenticated;
