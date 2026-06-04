-- Status enum
DO $$ BEGIN
  CREATE TYPE public.claim_request_status AS ENUM ('pending','approved','denied','more_info_requested','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text,
  relationship_to_business text,
  verification_notes text,
  verification_url text,
  status public.claim_request_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.claim_requests TO authenticated;
GRANT ALL ON public.claim_requests TO service_role;

ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

-- Prevent duplicate active claims per requester per business
CREATE UNIQUE INDEX claim_requests_one_active_per_requester
  ON public.claim_requests(business_id, requester_user_id)
  WHERE status IN ('pending','more_info_requested');

CREATE INDEX claim_requests_business_idx ON public.claim_requests(business_id);
CREATE INDEX claim_requests_status_idx ON public.claim_requests(status);

-- updated_at trigger using existing helper
CREATE TRIGGER claim_requests_touch_updated_at
  BEFORE UPDATE ON public.claim_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS Policies
CREATE POLICY "users insert own claim requests"
  ON public.claim_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.owner_id IS NULL
        AND b.listing_status <> 'archived'
    )
  );

CREATE POLICY "users read own claim requests"
  ON public.claim_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_user_id);

CREATE POLICY "users withdraw own pending claim"
  ON public.claim_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = requester_user_id
    AND status IN ('pending','more_info_requested')
  )
  WITH CHECK (
    auth.uid() = requester_user_id
    AND status = 'withdrawn'
  );

CREATE POLICY "admins read all claim requests"
  ON public.claim_requests FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admins update all claim requests"
  ON public.claim_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins delete claim requests"
  ON public.claim_requests FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Approval RPC
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

  SELECT * INTO cr FROM public.claim_requests WHERE id = _claim_request_id FOR UPDATE;
  IF cr.id IS NULL THEN RAISE EXCEPTION 'claim request not found'; END IF;
  IF cr.status NOT IN ('pending','more_info_requested') THEN
    RAISE EXCEPTION 'claim request not in approvable state: %', cr.status;
  END IF;

  SELECT * INTO biz FROM public.businesses WHERE id = cr.business_id FOR UPDATE;
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

  RETURN cr;
END;
$$;

-- Deny RPC
CREATE OR REPLACE FUNCTION public.deny_claim_request(_claim_request_id uuid, _admin_notes text DEFAULT NULL)
RETURNS public.claim_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cr public.claim_requests;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.claim_requests
     SET status = 'denied',
         admin_notes = COALESCE(_admin_notes, admin_notes),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _claim_request_id
     AND status IN ('pending','more_info_requested')
   RETURNING * INTO cr;
  IF cr.id IS NULL THEN RAISE EXCEPTION 'claim request not deniable'; END IF;
  RETURN cr;
END;
$$;

-- Request more info RPC
CREATE OR REPLACE FUNCTION public.request_more_info_claim_request(_claim_request_id uuid, _admin_notes text)
RETURNS public.claim_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cr public.claim_requests;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.claim_requests
     SET status = 'more_info_requested',
         admin_notes = _admin_notes,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _claim_request_id
     AND status = 'pending'
   RETURNING * INTO cr;
  IF cr.id IS NULL THEN RAISE EXCEPTION 'claim request not pending'; END IF;
  RETURN cr;
END;
$$;

-- Withdraw own claim RPC (convenience for users)
CREATE OR REPLACE FUNCTION public.withdraw_claim_request(_claim_request_id uuid)
RETURNS public.claim_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cr public.claim_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'must be signed in'; END IF;
  UPDATE public.claim_requests
     SET status = 'withdrawn', updated_at = now()
   WHERE id = _claim_request_id
     AND requester_user_id = auth.uid()
     AND status IN ('pending','more_info_requested')
   RETURNING * INTO cr;
  IF cr.id IS NULL THEN RAISE EXCEPTION 'claim request not withdrawable'; END IF;
  RETURN cr;
END;
$$;