
-- Phase 2: Add lead enrichment fields & business-claim helper
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS estimated_value numeric,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- Allow owners to delete their own leads (parity with owners_update_own_leads)
DO $$ BEGIN
  CREATE POLICY "owners delete own leads" ON public.leads
    FOR DELETE USING (public.owns_business(auth.uid(), business_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow owners to delete their own business
DO $$ BEGIN
  CREATE POLICY "owners delete own business" ON public.businesses
    FOR DELETE USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Claim a currently-unowned demo business (so demo trucks can be edited by a signed-in owner).
CREATE OR REPLACE FUNCTION public.claim_business(_business_id uuid)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.businesses;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'must be signed in'; END IF;

  UPDATE public.businesses
     SET owner_id = auth.uid(), updated_at = now()
   WHERE id = _business_id AND owner_id IS NULL
   RETURNING * INTO b;

  IF b.id IS NULL THEN
    RAISE EXCEPTION 'business not available to claim';
  END IF;

  RETURN b;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_business(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_business(uuid) TO authenticated;
