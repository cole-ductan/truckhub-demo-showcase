CREATE POLICY "admins insert businesses"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
