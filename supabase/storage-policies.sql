-- Nutrition Clinic — Supabase Storage RLS policies
-- Run in Supabase Dashboard → SQL Editor (project: vlwbxdlaupykxlgthdxp)
--
-- Prerequisites:
-- 1. Create private buckets: medicine-photos, meal-photos, progress-photos, lab-reports
-- 2. Authentication → Providers → enable Firebase (project: junaid-2d4e6)
--
-- The app bridges Firebase login to Supabase via signInWithIdToken before uploads.

-- Remove old policies if you re-run this script (ignore errors if they do not exist)
DROP POLICY IF EXISTS "ncms_authenticated_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "ncms_authenticated_select_photos" ON storage.objects;
DROP POLICY IF EXISTS "ncms_anon_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "ncms_anon_select_photos" ON storage.objects;

-- Authenticated users (Firebase bridged via signInWithIdToken)
CREATE POLICY "ncms_authenticated_upload_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('medicine-photos', 'meal-photos', 'progress-photos', 'lab-reports')
);

CREATE POLICY "ncms_authenticated_select_photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('medicine-photos', 'meal-photos', 'progress-photos', 'lab-reports')
);

-- Anon fallback until Firebase provider is enabled in Supabase
CREATE POLICY "ncms_anon_upload_photos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id IN ('medicine-photos', 'meal-photos', 'progress-photos', 'lab-reports')
);

CREATE POLICY "ncms_anon_select_photos"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id IN ('medicine-photos', 'meal-photos', 'progress-photos', 'lab-reports')
);
