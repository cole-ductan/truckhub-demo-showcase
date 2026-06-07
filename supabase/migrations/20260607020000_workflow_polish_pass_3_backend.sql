-- ============================================================
-- Workflow Polish Pass 3 — lifecycle hardening and CRM cleanup
-- ============================================================

-- CRM records have their own lifecycle. This stays separate from the
-- outreach pipeline status so completed/archived/deleted records do not
-- clutter the live acquisition queue.
ALTER TABLE public.business_outreach
  ADD COLUMN IF NOT EXISTS crm_state text NOT NULL DEFAULT 'active';

ALTER TABLE public.business_outreach
  DROP CONSTRAINT IF EXISTS business_outreach_crm_state_check;

ALTER TABLE public.business_outreach
  ADD CONSTRAINT business_outreach_crm_state_check
  CHECK (crm_state IN ('active','completed','archived','deleted'));

ALTER TABLE public.business_outreach
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS business_outreach_crm_state_idx
  ON public.business_outreach(crm_state);

-- Preserve claim history if a claimant closes their Auth account.
-- Contact details are anonymized by the delete-account edge function before
-- Auth deletion, while the FK is allowed to become NULL.
ALTER TABLE public.claim_requests
  ALTER COLUMN requester_user_id DROP NOT NULL;

ALTER TABLE public.claim_requests
  DROP CONSTRAINT IF EXISTS claim_requests_requester_user_id_fkey;

ALTER TABLE public.claim_requests
  ADD CONSTRAINT claim_requests_requester_user_id_fkey
  FOREIGN KEY (requester_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Archived listings must never be publicly visible, even when a stale client
-- attempts to publish them directly.
CREATE OR REPLACE FUNCTION public.enforce_archived_business_unpublished()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.listing_status = 'archived'::listing_status THEN
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_force_archived_unpublished ON public.businesses;
CREATE TRIGGER businesses_force_archived_unpublished
  BEFORE INSERT OR UPDATE OF listing_status, is_published
  ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_archived_business_unpublished();

-- Admin-only listing archive RPC. Keeps archive changes atomic and auditable.
CREATE OR REPLACE FUNCTION public.archive_business_listing(_business_id uuid)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz public.businesses;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  UPDATE public.businesses
     SET listing_status = 'archived'::listing_status,
         is_published = false,
         updated_at = now()
   WHERE id = _business_id
   RETURNING * INTO biz;

  IF biz.id IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;

  INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
  VALUES (_business_id, auth.uid(), 'status_changed', 'Listing archived by admin');

  RETURN biz;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_business_listing(uuid) TO authenticated;

-- CRM lifecycle RPC. A CRM delete is intentionally a soft-delete so outreach
-- history survives and can be reviewed or restored without touching the listing.
CREATE OR REPLACE FUNCTION public.set_business_outreach_crm_state(
  _business_id uuid,
  _crm_state text
) RETURNS public.business_outreach
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_out public.business_outreach;
  label text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _crm_state NOT IN ('active','completed','archived','deleted') THEN
    RAISE EXCEPTION 'invalid CRM state';
  END IF;

  UPDATE public.business_outreach
     SET crm_state = _crm_state,
         completed_at = CASE WHEN _crm_state = 'completed' THEN now() ELSE NULL END,
         archived_at = CASE WHEN _crm_state = 'archived' THEN now() ELSE NULL END,
         deleted_at = CASE WHEN _crm_state = 'deleted' THEN now() ELSE NULL END,
         updated_at = now()
   WHERE business_id = _business_id
   RETURNING * INTO row_out;

  IF row_out.business_id IS NULL THEN RAISE EXCEPTION 'CRM record not found'; END IF;

  label := CASE _crm_state
    WHEN 'active' THEN 'CRM record restored to active queue'
    WHEN 'completed' THEN 'CRM record marked complete'
    WHEN 'archived' THEN 'CRM record archived'
    WHEN 'deleted' THEN 'CRM record removed from live CRM'
  END;

  INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
  VALUES (_business_id, auth.uid(), 'status_changed', label);

  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_business_outreach_crm_state(uuid, text) TO authenticated;

-- Reconcile claim state when an admin assigns ownership from the Businesses page.
CREATE OR REPLACE FUNCTION public.assign_business_owner(
  _business_id uuid,
  _user_id uuid
) RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz public.businesses;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user id required'; END IF;

  SELECT * INTO biz FROM public.businesses WHERE id = _business_id FOR UPDATE;
  IF biz.id IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF biz.listing_status = 'archived' THEN RAISE EXCEPTION 'cannot assign owner to archived listing'; END IF;
  IF biz.owner_id = _user_id THEN RETURN biz; END IF;

  UPDATE public.businesses
     SET owner_id = _user_id,
         listing_status = 'claimed_free',
         updated_at = now()
   WHERE id = _business_id
   RETURNING * INTO biz;

  -- Resolve the selected owner's active claim if one exists.
  UPDATE public.claim_requests
     SET status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE business_id = _business_id
     AND requester_user_id = _user_id
     AND status IN ('pending','more_info_requested');

  -- Resolve competing active claims so badges and claimant consoles do not
  -- continue to show a listing that has already been assigned.
  UPDATE public.claim_requests
     SET status = 'denied',
         admin_notes = CASE
           WHEN admin_notes IS NULL OR trim(admin_notes) = '' THEN 'Listing assigned to another owner by admin.'
           ELSE admin_notes || E'\nListing assigned to another owner by admin.'
         END,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE business_id = _business_id
     AND requester_user_id IS DISTINCT FROM _user_id
     AND status IN ('pending','more_info_requested');

  INSERT INTO public.business_outreach (business_id, outreach_status, crm_state)
  VALUES (_business_id, 'claimed', 'active')
  ON CONFLICT (business_id) DO UPDATE
    SET outreach_status = 'claimed', crm_state = 'active', updated_at = now();

  INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
  VALUES (_business_id, auth.uid(), 'status_changed', 'Owner assigned by admin; active claims reconciled');

  RETURN biz;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_business_owner(uuid, uuid) TO authenticated;
