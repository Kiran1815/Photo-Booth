-- =====================================================
-- UTKARSH 2026 PHOTO BOOTH CONTEST
-- FIX PHOTO UPDATE & STORAGE RLS POLICIES
-- =====================================================

-- 1. Allow student photo_path update for anon and authenticated users
DROP POLICY IF EXISTS "Allow student update" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;

CREATE POLICY "Allow public photo update"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. Ensure storage bucket contest-photos exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('contest-photos', 'contest-photos', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- 3. Storage RLS Policies for contest-photos bucket
DROP POLICY IF EXISTS "Public select contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public insert contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public update contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public delete contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete contest photos" ON storage.objects;

-- Allow public viewing of photos
CREATE POLICY "Public select contest photos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'contest-photos');

-- Allow public uploading of photos
CREATE POLICY "Public insert contest photos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'contest-photos');

-- Allow updating photo objects
CREATE POLICY "Public update contest photos"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'contest-photos');

-- Allow deleting photo objects
CREATE POLICY "Public delete contest photos"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'contest-photos');
