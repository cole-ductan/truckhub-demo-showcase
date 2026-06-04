-- Security advisor cleanup: remove implicit API execution rights from every
-- SECURITY DEFINER function in the exposed public schema, then re-grant only
-- the small authenticated allowlist required by the application.
--
-- Important: SECURITY DEFINER is still intentional for guarded RPCs and RLS
-- helper functions. Each writable RPC performs its own auth/ownership/admin
-- checks before changing data.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      fn.signature
    );
  END LOOP;
END
$$;

-- RLS helper functions. These are safe for signed-in callers and are used by
-- row-level security policies. Anonymous execution is intentionally denied.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_business(uuid, uuid) TO authenticated;

-- Signed-in owner workflow.
GRANT EXECUTE ON FUNCTION public.claim_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_claim_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_claim_request(uuid, text, text) TO authenticated;

-- Admin workflow. These remain callable by the authenticated database role,
-- but each function rejects non-admin users internally via public.is_admin().
GRANT EXECUTE ON FUNCTION public.approve_claim_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_claim_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_more_info_claim_request(uuid, text) TO authenticated;

-- Trigger-only SECURITY DEFINER functions, including public.handle_new_user(),
-- intentionally receive no API EXECUTE grant.
