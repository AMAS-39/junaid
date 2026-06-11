-- Nutrition Clinic — Supabase Storage RLS policies
-- Run in Supabase Dashboard → SQL Editor (project: vlwbxdlaupykxlgthdxp)
--
-- Prerequisites:
-- 1. Create private buckets: medicine-photos, meal-photos, progress-photos, lab-reports, documents
-- 2. Authentication → Providers → enable Firebase (project: junaid-2d4e6)

DROP POLICY IF EXISTS "ncms_authenticated_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "ncms_authenticated_select_photos" ON storage.objects;
DROP POLICY IF EXISTS "ncms_anon_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "ncms_anon_select_photos" ON storage.objects;
DROP POLICY IF EXISTS "ncms_authenticated_upload_documents" ON storage.objects;
DROP POLICY IF EXISTS "ncms_authenticated_select_documents" ON storage.objects;
DROP POLICY IF EXISTS "ncms_anon_upload_documents" ON storage.objects;
DROP POLICY IF EXISTS "ncms_anon_select_documents" ON storage.objects;

-- Photo buckets
CREATE POLICY "ncms_authenticated_upload_photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('medicine-photos', 'meal-photos', 'progress-photos', 'lab-reports'));

CREATE POLICY "ncms_authenticated_select_photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('medicine-photos', 'meal-photos', 'progress-photos', 'lab-reports'));

CREATE POLICY "ncms_anon_upload_photos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id IN ('medicine-photos', 'meal-photos', 'progress-photos', 'lab-reports'));

CREATE POLICY "ncms_anon_select_photos"
ON storage.objects FOR SELECT TO anon
USING (bucket_id IN ('medicine-photos', 'meal-photos', 'progress-photos', 'lab-reports'));

-- Medicine papers / documents bucket
CREATE POLICY "ncms_authenticated_upload_documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "ncms_authenticated_select_documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "ncms_anon_upload_documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "ncms_anon_select_documents"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'documents');
