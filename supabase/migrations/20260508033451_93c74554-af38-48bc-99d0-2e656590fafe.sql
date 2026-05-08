-- Extend owner_preferences
ALTER TABLE public.owner_preferences
  ADD COLUMN IF NOT EXISTS stripe_deposits_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_payment_url text,
  ADD COLUMN IF NOT EXISTS manual_deposit_instructions text,
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'no_deposits';

-- payment_mode validation
DO $$ BEGIN
  ALTER TABLE public.owner_preferences
    ADD CONSTRAINT owner_preferences_payment_mode_chk
    CHECK (payment_mode IN ('no_deposits','stripe','external_link','manual_instructions'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Deposit requests table
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  lead_id uuid,
  booking_id uuid,
  customer_name text,
  customer_email text,
  amount_total numeric,
  deposit_percentage numeric NOT NULL DEFAULT 0,
  deposit_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  checkout_url text,
  due_date date,
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deposit_requests_status_chk CHECK (status IN ('draft','checkout_created','pending','paid','failed','canceled','refunded'))
);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_business ON public.deposit_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_lead ON public.deposit_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_session ON public.deposit_requests(stripe_checkout_session_id);

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own deposits"
  ON public.deposit_requests FOR ALL
  USING (public.owns_business(auth.uid(), business_id))
  WITH CHECK (public.owns_business(auth.uid(), business_id));

CREATE POLICY "admins manage all deposits"
  ON public.deposit_requests FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_deposit_requests_updated_at
  BEFORE UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
