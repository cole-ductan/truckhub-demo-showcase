
-- Extend claim_requests
ALTER TABLE public.claim_requests
  ALTER COLUMN requester_user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text,
  ADD COLUMN IF NOT EXISTS best_contact_time text,
  ADD COLUMN IF NOT EXISTS claimant_message text,
  ADD COLUMN IF NOT EXISTS approved_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS authorized_confirmed boolean NOT NULL DEFAULT false;

DROP INDEX IF EXISTS public.claim_requests_one_active_per_requester;

DROP POLICY IF EXISTS "users insert own claim requests" ON public.claim_requests;

CREATE POLICY "anyone may submit claim for eligible listing"
  ON public.claim_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status IN ('submitted'::claim_request_status, 'pending'::claim_request_status)
    AND admin_notes IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND approved_owner_user_id IS NULL
    AND authorized_confirmed = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = claim_requests.business_id
        AND b.owner_id IS NULL
        AND b.listing_status IN ('unclaimed'::listing_status, 'draft'::listing_status)
        AND b.is_published = true
    )
  );

DROP POLICY IF EXISTS "admins update claim requests" ON public.claim_requests;
CREATE POLICY "admins update claim requests"
  ON public.claim_requests FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

GRANT INSERT ON public.claim_requests TO anon;

-- claim_activities
CREATE TABLE IF NOT EXISTS public.claim_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claim_requests(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  note text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.claim_activities TO authenticated;
GRANT ALL ON public.claim_activities TO service_role;

ALTER TABLE public.claim_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read claim activities"
  ON public.claim_activities FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "admins insert claim activities"
  ON public.claim_activities FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND performed_by = auth.uid());

CREATE INDEX IF NOT EXISTS claim_activities_claim_idx ON public.claim_activities(claim_id, created_at DESC);

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS preferred_contact_method text,
  ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check CHECK (account_status IN ('active','invited','suspended'));

DROP POLICY IF EXISTS "admins update all profiles" ON public.profiles;
CREATE POLICY "admins update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- admin_account_audit
CREATE TABLE IF NOT EXISTS public.admin_account_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_account_audit TO authenticated;
GRANT ALL ON public.admin_account_audit TO service_role;

ALTER TABLE public.admin_account_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read account audit"
  ON public.admin_account_audit FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS admin_account_audit_target_idx
  ON public.admin_account_audit(target_user_id, created_at DESC);
