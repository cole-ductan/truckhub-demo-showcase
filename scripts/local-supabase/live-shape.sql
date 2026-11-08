-- Local live-shaped baseline only.
-- Drops objects the 2026-11-08 production catalog confirmed absent.
-- This file is not under supabase/migrations.
-- It is not docs/proposals/fxm-004-business-outreach-crm-state.sql.
-- It does not add columns or routines, and it does not restore review_event_import.
-- It does not drop storage.buckets or the public business-assets bucket.
-- Do not run this against foodxmobile.com or any hosted database.

DROP TRIGGER IF EXISTS businesses_force_archived_unpublished ON public.businesses;
DROP TRIGGER IF EXISTS businesses_block_implicit_archived_restore ON public.businesses;
DROP TRIGGER IF EXISTS claim_requests_reject_obvious_email_typos ON public.claim_requests;

DROP FUNCTION IF EXISTS public.set_business_outreach_crm_state(uuid, text);
DROP FUNCTION IF EXISTS public.enforce_archived_business_unpublished();
DROP FUNCTION IF EXISTS public.archive_business_listing(uuid);
DROP FUNCTION IF EXISTS public.reject_obvious_claim_email_typos();
DROP FUNCTION IF EXISTS public.prevent_implicit_archived_business_restore();

-- Main does not define review_event_import. Drop an overload only if one exists.
DO $$
DECLARE
  sig regprocedure;
BEGIN
  FOR sig IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'review_event_import'
  LOOP
    EXECUTE format('DROP FUNCTION %s', sig);
  END LOOP;
END $$;

ALTER TABLE public.business_outreach
  DROP COLUMN IF EXISTS crm_state,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS deleted_at;
