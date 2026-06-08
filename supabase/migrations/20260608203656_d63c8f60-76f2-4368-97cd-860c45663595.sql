-- RLS policies for business-assets bucket
CREATE POLICY "business-assets read public" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'business-assets');

CREATE POLICY "business-assets owner/admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND (
      public.is_admin(auth.uid())
      OR public.owns_business(auth.uid(), (split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "business-assets owner/admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (
      public.is_admin(auth.uid())
      OR public.owns_business(auth.uid(), (split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "business-assets owner/admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (
      public.is_admin(auth.uid())
      OR public.owns_business(auth.uid(), (split_part(name, '/', 1))::uuid)
    )
  );
