-- =====================================================
-- UTKARSH 2026 PHOTO BOOTH CONTEST
-- FIX PHOTO UPDATE, DELETE & STORAGE RLS POLICIES
-- =====================================================

-- 1. Allow student UPDATE and DELETE for anon and authenticated users
DROP POLICY IF EXISTS "Allow student update" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Allow public photo update" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON public.students;
DROP POLICY IF EXISTS "Allow public delete students" ON public.students;

CREATE POLICY "Allow public photo update"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete students"
ON public.students
FOR DELETE
TO anon, authenticated
USING (true);

-- 2. Also allow SELECT for anon (gallery / photo lookup)
DROP POLICY IF EXISTS "Allow student select" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;

CREATE POLICY "Allow student select"
ON public.students
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. SECURITY DEFINER RPCs for reliable Admin Operations (bypasses RLS)
CREATE OR REPLACE FUNCTION delete_student_entry(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.students WHERE id = p_student_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_student_entry(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION update_student_photo(p_student_id UUID, p_photo_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.students SET photo_path = p_photo_path WHERE id = p_student_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_student_photo(UUID, TEXT) TO anon, authenticated, service_role;

-- 4. Ensure storage bucket contest-photos exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('contest-photos', 'contest-photos', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- 5. Storage RLS Policies for contest-photos bucket
DROP POLICY IF EXISTS "Public select contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public insert contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public update contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public delete contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Public select contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Public insert contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Public update contest photos" ON storage.objects;
DROP POLICY IF EXISTS "Public delete contest photos" ON storage.objects;

CREATE POLICY "Public select contest photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'contest-photos');

CREATE POLICY "Public insert contest photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'contest-photos');

CREATE POLICY "Public update contest photos"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'contest-photos');

CREATE POLICY "Public delete contest photos"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'contest-photos');

-- 6. Remove duplicate/test entries that have no real photo
-- Delete entries that were test/auto-generated (no photo, auto-generated register numbers)
DELETE FROM public.students
WHERE photo_path IS NULL
  AND (
    full_name ILIKE 'Test%'
    OR full_name ILIKE 'Auto%'
    OR full_name ILIKE 'Frontend%'
    OR register_number ILIKE 'REG%'
    OR register_number ILIKE 'R%1786%'
    OR register_number ILIKE 'RT%1786%'
    OR college_email ILIKE '%example.com'
  );
