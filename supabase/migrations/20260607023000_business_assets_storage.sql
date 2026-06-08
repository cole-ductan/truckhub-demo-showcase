-- ============================================================
-- Business asset uploads (hero + logo)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  6291456,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 6291456,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "public read business assets" ON storage.objects;
CREATE POLICY "public read business assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "admins insert business assets" ON storage.objects;
CREATE POLICY "admins insert business assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins update business assets" ON storage.objects;
CREATE POLICY "admins update business assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'business-assets' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'business-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins delete business assets" ON storage.objects;
CREATE POLICY "admins delete business assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "owners insert own business assets" ON storage.objects;
CREATE POLICY "owners insert own business assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = auth.uid()
        AND b.id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "owners update own business assets" ON storage.objects;
CREATE POLICY "owners update own business assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = auth.uid()
        AND b.id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = auth.uid()
        AND b.id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "owners delete own business assets" ON storage.objects;
CREATE POLICY "owners delete own business assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = auth.uid()
        AND b.id::text = (storage.foldername(name))[1]
    )
  );
