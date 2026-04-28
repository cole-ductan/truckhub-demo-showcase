-- 1. Add optional owner_title to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owner_title text;

-- 2. owner_preferences table (per business)
CREATE TABLE IF NOT EXISTS public.owner_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  sms_notifications_enabled boolean NOT NULL DEFAULT false,
  new_lead_notifications_enabled boolean NOT NULL DEFAULT true,
  owner_reply_notifications_enabled boolean NOT NULL DEFAULT true,
  deposit_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_preferences ENABLE ROW LEVEL SECURITY;

-- Owners: full access to preferences for businesses they own
CREATE POLICY "owners manage own preferences"
  ON public.owner_preferences
  FOR ALL
  USING (public.owns_business(auth.uid(), business_id))
  WITH CHECK (public.owns_business(auth.uid(), business_id));

-- Admins: full access to all preferences
CREATE POLICY "admins manage all preferences"
  ON public.owner_preferences
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- updated_at trigger (touch_updated_at already exists)
DROP TRIGGER IF EXISTS owner_preferences_touch ON public.owner_preferences;
CREATE TRIGGER owner_preferences_touch
  BEFORE UPDATE ON public.owner_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();