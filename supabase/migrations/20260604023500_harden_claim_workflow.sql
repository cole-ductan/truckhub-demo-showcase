-- Checkpoint B cleanup: harden claim workflow permissions and preserve the demo shortcut safely.

-- 1. Direct claim inserts must target truly unclaimed listings and must not seed admin review fields.
DROP POLICY IF EXISTS "users insert own claim requests" ON public.claim_requests;
CREATE POLICY "users insert own claim requests"
  ON public.claim_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_user_id
    AND status = 'pending'
    AND admin_notes IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_id
        AND b.owner_id IS NULL
        AND b.listing_status = 'unclaimed'
    )
  );

-- 2. Owners and admins use guarded RPCs for state transitions. Remove browser-side UPDATE access.
REVOKE UPDATE ON public.claim_requests FROM authenticated;
DROP POLICY IF EXISTS "users withdraw own pending claim" ON public.claim_requests;
DROP POLICY IF EXISTS "admins update all claim requests" ON public.claim_requests;

-- 3. Verification URLs shown in the admin console must be http(s) only.
--    Neutralize malformed test data first so this migration remains safe on existing environments.
UPDATE public.claim_requests
SET verification_url = NULL
WHERE verification_url IS NOT NULL
  AND verification_url !~* '^https?://';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'claim_requests_verification_url_http_only'
  ) THEN
    ALTER TABLE public.claim_requests
      ADD CONSTRAINT claim_requests_verification_url_http_only
      CHECK (verification_url IS NULL OR verification_url ~* '^https?://');
  END IF;
END $$;

-- 4. Lock the legacy instant-claim helper to demo rows only.
CREATE OR REPLACE FUNCTION public.claim_business(_business_id uuid)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz public.businesses;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'must be signed in'; END IF;

  SELECT * INTO biz
  FROM public.businesses
  WHERE id = _business_id
  FOR UPDATE;

  IF biz.id IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF NOT biz.is_demo THEN RAISE EXCEPTION 'direct claim is only available for demo listings'; END IF;
  IF biz.owner_id IS NOT NULL THEN RAISE EXCEPTION 'business already has an owner'; END IF;
  IF biz.listing_status = 'archived' THEN RAISE EXCEPTION 'cannot claim an archived listing'; END IF;

  UPDATE public.businesses
     SET owner_id = auth.uid(),
         listing_status = 'claimed_free',
         updated_at = now()
   WHERE id = biz.id
   RETURNING * INTO biz;

  RETURN biz;
END;
$$;

-- 5. Approvals atomically assign the owner and close competing active requests.
CREATE OR REPLACE FUNCTION public.approve_claim_request(_claim_request_id uuid)
RETURNS public.claim_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cr public.claim_requests;
  biz public.businesses;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'must be signed in'; END IF;
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;

  SELECT * INTO cr
  FROM public.claim_requests
  WHERE id = _claim_request_id
  FOR UPDATE;

  IF cr.id IS NULL THEN RAISE EXCEPTION 'claim request not found'; END IF;
  IF cr.status NOT IN ('pending','more_info_requested') THEN
    RAISE EXCEPTION 'claim request not in approvable state: %', cr.status;
  END IF;

  SELECT * INTO biz
  FROM public.businesses
  WHERE id = cr.business_id
  FOR UPDATE;

  IF biz.id IS NULL THEN RAISE EXCEPTION 'business no longer exists'; END IF;
  IF biz.owner_id IS NOT NULL AND biz.owner_id <> cr.requester_user_id THEN
    RAISE EXCEPTION 'business already has a different owner';
  END IF;
  IF biz.listing_status = 'archived' THEN
    RAISE EXCEPTION 'cannot claim an archived listing';
  END IF;

  UPDATE public.businesses
     SET owner_id = cr.requester_user_id,
         listing_status = 'claimed_free',
         updated_at = now()
   WHERE id = biz.id;

  UPDATE public.claim_requests
     SET status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = cr.id
   RETURNING * INTO cr;

  UPDATE public.claim_requests
     SET status = 'denied',
         admin_notes = COALESCE(admin_notes, 'Another ownership claim for this listing was approved.'),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE business_id = biz.id
     AND id <> cr.id
     AND status IN ('pending','more_info_requested');

  RETURN cr;
END;
$$;

-- 6. Owners can respond to a request for more information without withdrawing and recreating the claim.
CREATE OR REPLACE FUNCTION public.resubmit_claim_request(
  _claim_request_id uuid,
  _verification_notes text,
  _verification_url text DEFAULT NULL
)
RETURNS public.claim_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cr public.claim_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'must be signed in'; END IF;
  IF length(trim(COALESCE(_verification_notes, ''))) = 0 THEN
    RAISE EXCEPTION 'verification notes are required';
  END IF;
  IF _verification_url IS NOT NULL AND _verification_url !~* '^https?://' THEN
    RAISE EXCEPTION 'verification URL must start with http:// or https://';
  END IF;

  UPDATE public.claim_requests
     SET verification_notes = CASE
           WHEN verification_notes IS NULL OR trim(verification_notes) = '' THEN trim(_verification_notes)
           ELSE verification_notes || E'\n\n[Additional information]\n' || trim(_verification_notes)
         END,
         verification_url = COALESCE(NULLIF(trim(_verification_url), ''), verification_url),
         status = 'pending',
         reviewed_by = NULL,
         reviewed_at = NULL,
         updated_at = now()
   WHERE id = _claim_request_id
     AND requester_user_id = auth.uid()
     AND status = 'more_info_requested'
   RETURNING * INTO cr;

  IF cr.id IS NULL THEN RAISE EXCEPTION 'claim request is not awaiting more information'; END IF;
  RETURN cr;
END;
$$;

-- 7. SECURITY DEFINER RPCs are executable only by authenticated users.
REVOKE ALL ON FUNCTION public.claim_business(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_claim_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deny_claim_request(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_more_info_claim_request(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_claim_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resubmit_claim_request(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_claim_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_claim_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_more_info_claim_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_claim_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_claim_request(uuid, text, text) TO authenticated;
