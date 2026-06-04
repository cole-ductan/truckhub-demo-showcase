-- Checkpoint C cleanup: enforce CRM invariants and move multi-write admin actions into guarded RPCs.

-- 1. Every business must receive exactly one outreach pipeline row, including future imports
--    and owner-created listings after the initial backfill has already run.
CREATE OR REPLACE FUNCTION public.ensure_business_outreach_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_outreach (business_id, outreach_status)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.owner_id IS NOT NULL OR NEW.listing_status IN ('claimed_free', 'premium') THEN 'claimed'
      ELSE 'not_contacted'
    END
  )
  ON CONFLICT (business_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_ensure_outreach_row ON public.businesses;
CREATE TRIGGER trg_businesses_ensure_outreach_row
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.ensure_business_outreach_row();

-- Re-run the backfill idempotently in case a listing was inserted between migrations.
INSERT INTO public.business_outreach (business_id, outreach_status)
SELECT b.id,
       CASE
         WHEN b.owner_id IS NOT NULL OR b.listing_status IN ('claimed_free', 'premium') THEN 'claimed'
         ELSE 'not_contacted'
       END
FROM public.businesses b
ON CONFLICT (business_id) DO NOTHING;

-- 2. Outreach history is append-only. Existing rows remain readable, but browser clients
--    cannot rewrite or delete the audit trail. Business deletion still cascades safely.
REVOKE UPDATE, DELETE ON public.business_outreach_activities FROM authenticated;
DROP POLICY IF EXISTS "admins update business_outreach_activities" ON public.business_outreach_activities;
DROP POLICY IF EXISTS "admins delete business_outreach_activities" ON public.business_outreach_activities;

-- Keep one pipeline row per business. Direct deletion would violate that invariant.
REVOKE DELETE ON public.business_outreach FROM authenticated;
DROP POLICY IF EXISTS "admins delete business_outreach" ON public.business_outreach;

-- New admin-created history rows automatically retain the acting user for auditability.
ALTER TABLE public.business_outreach_activities
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 3. Atomically move a reviewed inventory listing into the outreach pipeline.
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
  IF biz.listing_status = 'archived' THEN RAISE EXCEPTION 'cannot prepare an archived listing for outreach'; END IF;

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

-- 4. Update pipeline state and append its status transition as one transaction.
CREATE OR REPLACE FUNCTION public.update_business_outreach_pipeline(
  _business_id uuid,
  _outreach_status text,
  _priority text,
  _next_follow_up_at timestamptz DEFAULT NULL
)
RETURNS public.business_outreach
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_status text;
  result public.business_outreach;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'business not found';
  END IF;

  SELECT outreach_status INTO previous_status
  FROM public.business_outreach
  WHERE business_id = _business_id
  FOR UPDATE;

  INSERT INTO public.business_outreach (business_id, outreach_status, priority, next_follow_up_at)
  VALUES (_business_id, _outreach_status, _priority, _next_follow_up_at)
  ON CONFLICT (business_id) DO UPDATE
    SET outreach_status = EXCLUDED.outreach_status,
        priority = EXCLUDED.priority,
        next_follow_up_at = EXCLUDED.next_follow_up_at,
        updated_at = now()
  RETURNING * INTO result;

  IF previous_status IS DISTINCT FROM _outreach_status THEN
    INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
    VALUES (
      _business_id,
      auth.uid(),
      'status_changed',
      CASE
        WHEN previous_status IS NULL THEN 'Outreach status initialized to ' || _outreach_status || '.'
        ELSE 'Status changed from ' || previous_status || ' to ' || _outreach_status || '.'
      END
    );
  END IF;

  RETURN result;
END;
$$;

-- 5. Log an outreach activity and increment contact counters atomically.
CREATE OR REPLACE FUNCTION public.log_business_outreach_activity(
  _business_id uuid,
  _activity_type text,
  _contact_method text,
  _summary text,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS public.business_outreach_activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.business_outreach_activities;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF length(trim(COALESCE(_summary, ''))) = 0 THEN
    RAISE EXCEPTION 'summary required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'business not found';
  END IF;

  INSERT INTO public.business_outreach (business_id)
  VALUES (_business_id)
  ON CONFLICT (business_id) DO NOTHING;

  INSERT INTO public.business_outreach_activities (
    business_id, created_by, activity_type, contact_method, summary, occurred_at
  )
  VALUES (
    _business_id, auth.uid(), _activity_type, NULLIF(_contact_method, ''), trim(_summary), COALESCE(_occurred_at, now())
  )
  RETURNING * INTO result;

  IF _activity_type IN ('email_sent','phone_call','text_message','social_dm','claim_invite_sent') THEN
    UPDATE public.business_outreach
       SET contact_attempt_count = contact_attempt_count + 1,
           last_contacted_at = CASE
             WHEN last_contacted_at IS NULL OR last_contacted_at < COALESCE(_occurred_at, now()) THEN COALESCE(_occurred_at, now())
             ELSE last_contacted_at
           END,
           updated_at = now()
     WHERE business_id = _business_id;
  END IF;

  RETURN result;
END;
$$;

-- 6. New SECURITY DEFINER helpers are not API-callable by default.
REVOKE ALL ON FUNCTION public.ensure_business_outreach_row() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_business_ready_for_outreach(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_business_outreach_pipeline(uuid, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_business_outreach_activity(uuid, text, text, text, timestamptz) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.mark_business_ready_for_outreach(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_outreach_pipeline(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_business_outreach_activity(uuid, text, text, text, timestamptz) TO authenticated;
