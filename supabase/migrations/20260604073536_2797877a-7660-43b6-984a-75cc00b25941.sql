DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'businesses'
      AND policyname = 'admins insert businesses'
  ) THEN
    CREATE POLICY "admins insert businesses"
    ON public.businesses
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END
$$;