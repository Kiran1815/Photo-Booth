-- =====================================================
-- UTKARSH 2026 PHOTO BOOTH CONTEST
-- SAFE DATABASE + STORAGE POLICIES
-- =====================================================

-- 1. Notify Me
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS notify_me BOOLEAN DEFAULT FALSE;


-- 2. Winners table
CREATE TABLE IF NOT EXISTS public.winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. STUDENTS RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow student select" ON public.students;
DROP POLICY IF EXISTS "Allow student insert" ON public.students;
DROP POLICY IF EXISTS "Allow student update" ON public.students;
DROP POLICY IF EXISTS "Allow student delete" ON public.students;

-- Registration is allowed from public website
CREATE POLICY "Public student registration"
ON public.students
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only logged-in/admin users can read student records
CREATE POLICY "Authenticated users can view students"
ON public.students
FOR SELECT
TO authenticated
USING (true);

-- Only logged-in/admin users can modify students
CREATE POLICY "Authenticated users can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only logged-in/admin users can delete students
CREATE POLICY "Authenticated users can delete students"
ON public.students
FOR DELETE
TO authenticated
USING (true);


-- 4. WINNERS RLS
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow winners select" ON public.winners;
DROP POLICY IF EXISTS "Allow winners insert" ON public.winners;

CREATE POLICY "Authenticated users can view winners"
ON public.winners
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create winners"
ON public.winners
FOR INSERT
TO authenticated
WITH CHECK (true);


-- 5. EXISTING STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('contest-photos', 'contest-photos', true)
ON CONFLICT (id)
DO UPDATE SET public = true;


-- 6. STORAGE POLICIES
DROP POLICY IF EXISTS "Public select contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public insert contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public update contest-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public delete contest-photos" ON storage.objects;

-- Anyone can VIEW photos because bucket is public
CREATE POLICY "Public can view contest photos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'contest-photos');

-- Participants can UPLOAD photos
CREATE POLICY "Public can upload contest photos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'contest-photos');

-- Only authenticated/admin users can modify photos
CREATE POLICY "Authenticated can update contest photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'contest-photos')
WITH CHECK (bucket_id = 'contest-photos');

-- Only authenticated/admin users can delete photos
CREATE POLICY "Authenticated can delete contest photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'contest-photos');