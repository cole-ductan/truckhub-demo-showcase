
-- 1. Create admin-only metadata table
CREATE TABLE public.business_admin_metadata (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  outreach_email text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Grants: admins act via authenticated role; service_role for edge fns. No anon.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_admin_metadata TO authenticated;
GRANT ALL ON public.business_admin_metadata TO service_role;

-- 3. RLS
ALTER TABLE public.business_admin_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read business admin metadata"
  ON public.business_admin_metadata FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admins insert business admin metadata"
  ON public.business_admin_metadata FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins update business admin metadata"
  ON public.business_admin_metadata FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins delete business admin metadata"
  ON public.business_admin_metadata FOR DELETE
  USING (public.is_admin(auth.uid()));

-- 4. updated_at trigger (reuses existing touch_updated_at function)
CREATE TRIGGER trg_business_admin_metadata_updated_at
  BEFORE UPDATE ON public.business_admin_metadata
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Copy existing sensitive data over
INSERT INTO public.business_admin_metadata (business_id, outreach_email, internal_notes)
SELECT id, outreach_email, internal_notes
FROM public.businesses
WHERE outreach_email IS NOT NULL OR internal_notes IS NOT NULL
ON CONFLICT (business_id) DO UPDATE
  SET outreach_email = EXCLUDED.outreach_email,
      internal_notes = EXCLUDED.internal_notes;

-- 6. Clear the legacy columns now that data is safely moved
UPDATE public.businesses
   SET outreach_email = NULL,
       internal_notes = NULL
 WHERE outreach_email IS NOT NULL OR internal_notes IS NOT NULL;

-- 7. Mark legacy columns deprecated (kept for compatibility, do not use)
COMMENT ON COLUMN public.businesses.outreach_email IS
  'DEPRECATED — moved to public.business_admin_metadata.outreach_email. Kept temporarily for compatibility; do not read or write. Will be dropped in a future migration.';
COMMENT ON COLUMN public.businesses.internal_notes IS
  'DEPRECATED — moved to public.business_admin_metadata.internal_notes. Kept temporarily for compatibility; do not read or write. Will be dropped in a future migration.';
