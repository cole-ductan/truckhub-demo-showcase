ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_spam boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.business_categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;