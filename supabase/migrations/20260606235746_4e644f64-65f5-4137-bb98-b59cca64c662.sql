
-- ============================================================
-- Workflow Polish Pass 2 — new admin/owner RPCs
-- ============================================================

-- 1) submit_new_business_request
-- Creates a draft business + pending claim request; never grants ownership.
CREATE OR REPLACE FUNCTION public.submit_new_business_request(
  _name text,
  _slug text,
  _category_id uuid,
  _phone text,
  _requester_name text,
  _requester_email text,
  _requester_phone text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(_name, ''));
  v_slug text;
  v_email text := trim(coalesce(_requester_email, ''));
  v_rname text := trim(coalesce(_requester_name, ''));
  v_phone text := nullif(trim(coalesce(_requester_phone, '')), '');
  v_biz_id uuid;
  v_stamp text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'must be signed in'; END IF;
  IF length(v_name) = 0 THEN RAISE EXCEPTION 'business name is required'; END IF;
  IF length(v_rname) = 0 THEN RAISE EXCEPTION 'your name is required'; END IF;
  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'a valid contact email is required'; END IF;

  -- Normalize slug (mirror client slugify)
  v_slug := lower(coalesce(nullif(trim(_slug), ''), v_name));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  v_slug := left(v_slug, 80);
  IF length(v_slug) = 0 THEN RAISE EXCEPTION 'could not derive a URL slug from the business name'; END IF;

  IF EXISTS (SELECT 1 FROM public.businesses WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'a listing with that URL slug already exists. Please try a different name or slug.';
  END IF;

  -- Reject duplicate active submissions by this requester for the same name
  IF EXISTS (
    SELECT 1
    FROM public.claim_requests cr
    JOIN public.businesses b ON b.id = cr.business_id
    WHERE cr.requester_user_id = v_uid
      AND cr.status IN ('pending','more_info_requested')
      AND (lower(b.slug) = v_slug OR lower(b.name) = lower(v_name))
  ) THEN
    RAISE EXCEPTION 'You already have a pending submission for this business. Check My Claims for status.';
  END IF;

  -- Insert draft business (owner_id stays null until approval)
  INSERT INTO public.businesses (
    name, slug, category_id, phone, listing_status, is_published, is_demo, owner_id
  ) VALUES (
    v_name, v_slug, _category_id, nullif(trim(coalesce(_phone, '')), ''),
    'draft'::listing_status, false, false, NULL
  )
  RETURNING id INTO v_biz_id;

  -- Create pending claim request tied to submitter
  INSERT INTO public.claim_requests (
    business_id, requester_user_id, requester_name, requester_email, requester_phone,
    relationship_to_business, verification_notes, status
  ) VALUES (
    v_biz_id, v_uid, v_rname, v_email, v_phone,
    'creator',
    'New business submission for admin review.',
    'pending'::claim_request_status
  );

  -- Admin metadata: outreach email + dated internal note
  v_stamp := '[' || to_char(CURRENT_DATE, 'YYYY-MM-DD') || '] New business submitted for admin review';
  INSERT INTO public.business_admin_metadata (business_id, outreach_email, internal_notes)
  VALUES (v_biz_id, v_email, v_stamp)
  ON CONFLICT (business_id) DO UPDATE
    SET outreach_email = COALESCE(public.business_admin_metadata.outreach_email, EXCLUDED.outreach_email),
        internal_notes = CASE
          WHEN public.business_admin_metadata.internal_notes IS NULL OR trim(public.business_admin_metadata.internal_notes) = ''
            THEN EXCLUDED.internal_notes
          ELSE public.business_admin_metadata.internal_notes || E'\n' || EXCLUDED.internal_notes
        END,
        updated_at = now();

  -- CRM: ensure exactly one outreach row, set source = self_submitted
  INSERT INTO public.business_outreach (business_id, outreach_status, source)
  VALUES (v_biz_id, 'not_contacted', 'self_submitted')
  ON CONFLICT (business_id) DO UPDATE
    SET source = 'self_submitted', updated_at = now();

  -- CRM activity log
  INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
  VALUES (v_biz_id, v_uid, 'status_changed', 'New business submitted for admin review');

  RETURN v_biz_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_new_business_request(text, text, uuid, text, text, text, text) TO authenticated;


-- 2) assign_business_owner — admin only
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

  INSERT INTO public.business_outreach (business_id, outreach_status)
  VALUES (_business_id, 'claimed')
  ON CONFLICT (business_id) DO UPDATE
    SET outreach_status = 'claimed', updated_at = now();

  INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
  VALUES (_business_id, auth.uid(), 'status_changed', 'Owner assigned by admin');

  RETURN biz;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_business_owner(uuid, uuid) TO authenticated;


-- 3) remove_business_owner — admin only, keeps UI in sync
CREATE OR REPLACE FUNCTION public.remove_business_owner(_business_id uuid)
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
     SET owner_id = NULL,
         listing_status = CASE WHEN listing_status IN ('claimed_free','premium') THEN 'unclaimed'::listing_status ELSE listing_status END,
         updated_at = now()
   WHERE id = _business_id
   RETURNING * INTO biz;

  IF biz.id IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;

  INSERT INTO public.business_outreach (business_id, outreach_status)
  VALUES (_business_id, 'not_contacted')
  ON CONFLICT (business_id) DO UPDATE
    SET outreach_status = 'not_contacted', updated_at = now();

  INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
  VALUES (_business_id, auth.uid(), 'status_changed', 'Owner removed by admin');

  RETURN biz;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_business_owner(uuid) TO authenticated;


-- 4) delete_unlinked_business — admin only, safe hard delete
CREATE OR REPLACE FUNCTION public.delete_unlinked_business(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz public.businesses;
  active_claims int;
  lead_count int;
  deposit_count int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO biz FROM public.businesses WHERE id = _business_id FOR UPDATE;
  IF biz.id IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF biz.owner_id IS NOT NULL THEN
    RAISE EXCEPTION 'Listing has an owner. Remove the owner first or archive instead.';
  END IF;

  SELECT count(*) INTO active_claims FROM public.claim_requests
    WHERE business_id = _business_id AND status IN ('pending','more_info_requested','approved');
  IF active_claims > 0 THEN
    RAISE EXCEPTION 'Listing has active or approved claim requests. Archive instead.';
  END IF;

  SELECT count(*) INTO lead_count FROM public.leads WHERE business_id = _business_id;
  IF lead_count > 0 THEN
    RAISE EXCEPTION 'Listing has % lead(s). Archive instead to preserve history.', lead_count;
  END IF;

  SELECT count(*) INTO deposit_count FROM public.deposit_requests WHERE business_id = _business_id;
  IF deposit_count > 0 THEN
    RAISE EXCEPTION 'Listing has deposit requests. Archive instead.';
  END IF;

  -- Safe to remove dependent rows + listing
  DELETE FROM public.claim_requests WHERE business_id = _business_id;
  DELETE FROM public.business_outreach_activities WHERE business_id = _business_id;
  DELETE FROM public.business_outreach WHERE business_id = _business_id;
  DELETE FROM public.business_admin_metadata WHERE business_id = _business_id;
  DELETE FROM public.business_photos WHERE business_id = _business_id;
  DELETE FROM public.business_subcategories WHERE business_id = _business_id;
  DELETE FROM public.business_events WHERE business_id = _business_id;
  DELETE FROM public.menu_items WHERE business_id = _business_id;
  DELETE FROM public.menu_categories WHERE business_id = _business_id;
  DELETE FROM public.saved_locations WHERE business_id = _business_id;
  DELETE FROM public.owner_preferences WHERE business_id = _business_id;
  DELETE FROM public.businesses WHERE id = _business_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_unlinked_business(uuid) TO authenticated;
