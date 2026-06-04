-- Outreach CRM (Checkpoint C)

CREATE TABLE IF NOT EXISTS public.business_outreach (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  outreach_status text NOT NULL DEFAULT 'not_contacted',
  priority text NOT NULL DEFAULT 'normal',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  preferred_contact_method text,
  contact_attempt_count integer NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_outreach_status_check CHECK (outreach_status IN (
    'not_contacted','researching','ready_to_contact','contacted',
    'follow_up_needed','interested','claim_invited','claimed',
    'not_interested','do_not_contact'
  )),
  CONSTRAINT business_outreach_priority_check CHECK (priority IN ('low','normal','high')),
  CONSTRAINT business_outreach_contact_method_check CHECK (
    preferred_contact_method IS NULL OR preferred_contact_method IN ('email','phone','text','social','in_person')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_outreach TO authenticated;
GRANT ALL ON public.business_outreach TO service_role;

ALTER TABLE public.business_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read business_outreach"
  ON public.business_outreach FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "admins insert business_outreach"
  ON public.business_outreach FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins update business_outreach"
  ON public.business_outreach FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins delete business_outreach"
  ON public.business_outreach FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_business_outreach_touch
  BEFORE UPDATE ON public.business_outreach
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_business_outreach_status ON public.business_outreach(outreach_status);
CREATE INDEX IF NOT EXISTS idx_business_outreach_followup ON public.business_outreach(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_business_outreach_priority ON public.business_outreach(priority);

CREATE TABLE IF NOT EXISTS public.business_outreach_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  contact_method text,
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_outreach_activities_type_check CHECK (activity_type IN (
    'note','email_sent','email_received','phone_call','text_message',
    'social_dm','follow_up_scheduled','claim_invite_sent','status_changed'
  )),
  CONSTRAINT business_outreach_activities_method_check CHECK (
    contact_method IS NULL OR contact_method IN ('email','phone','text','social','in_person')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_outreach_activities TO authenticated;
GRANT ALL ON public.business_outreach_activities TO service_role;

ALTER TABLE public.business_outreach_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read business_outreach_activities"
  ON public.business_outreach_activities FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "admins insert business_outreach_activities"
  ON public.business_outreach_activities FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins update business_outreach_activities"
  ON public.business_outreach_activities FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins delete business_outreach_activities"
  ON public.business_outreach_activities FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_outreach_activities_business ON public.business_outreach_activities(business_id, occurred_at DESC);

-- Backfill: one row per existing business
INSERT INTO public.business_outreach (business_id, outreach_status)
SELECT b.id,
       CASE WHEN b.owner_id IS NOT NULL OR b.listing_status = 'claimed_free' THEN 'claimed'
            ELSE 'not_contacted' END
FROM public.businesses b
ON CONFLICT (business_id) DO NOTHING;

-- Update approve_claim_request to also flip outreach status + log activity
CREATE OR REPLACE FUNCTION public.approve_claim_request(_claim_request_id uuid)
 RETURNS claim_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE public.claim_requests
     SET status = 'denied',
         admin_notes = COALESCE(admin_notes, 'Another ownership claim for this listing was approved.'),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE business_id = biz.id
     AND id <> cr.id
     AND status IN ('pending','more_info_requested');

  -- Sync outreach CRM
  INSERT INTO public.business_outreach (business_id, outreach_status)
  VALUES (biz.id, 'claimed')
  ON CONFLICT (business_id) DO UPDATE
    SET outreach_status = 'claimed', updated_at = now();

  INSERT INTO public.business_outreach_activities (business_id, created_by, activity_type, summary)
  VALUES (biz.id, auth.uid(), 'status_changed', 'Claim approved; outreach marked as claimed.');

  RETURN cr;
END;
$function$;