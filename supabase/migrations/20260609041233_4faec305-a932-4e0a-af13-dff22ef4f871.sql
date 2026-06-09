
ALTER TYPE public.claim_request_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE public.claim_request_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE public.claim_request_status ADD VALUE IF NOT EXISTS 'awaiting_verification';
ALTER TYPE public.claim_request_status ADD VALUE IF NOT EXISTS 'archived';
