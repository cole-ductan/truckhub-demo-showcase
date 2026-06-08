-- ============================================================
-- Workflow Polish Pass 3 review fixes
-- ============================================================

-- The archive trigger protects future writes, but rows archived before the
-- trigger existed must also be corrected immediately.
UPDATE public.businesses
   SET is_published = false,
       updated_at = now()
 WHERE listing_status = 'archived'::listing_status
   AND is_published = true;

-- Preserve claim review history without blocking a later Auth account deletion.
-- This matters when an administrator role is removed before the account itself
-- is deleted. Historical claim rows remain intact and simply lose the reviewer
-- pointer.
ALTER TABLE public.claim_requests
  DROP CONSTRAINT IF EXISTS claim_requests_reviewed_by_fkey;

ALTER TABLE public.claim_requests
  ADD CONSTRAINT claim_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
