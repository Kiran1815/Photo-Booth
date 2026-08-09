-- =====================================================
-- UTKARSH 2026 PHOTO BOOTH CONTEST — DATABASE SCHEMA & RLS POLICIES
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Ensure notify_me column exists in students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS notify_me BOOLEAN DEFAULT FALSE;

-- 2. Ensure winners table exists
CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies for students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow student select" ON students;
CREATE POLICY "Allow student select" ON students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow student insert" ON students;
CREATE POLICY "Allow student insert" ON students FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow student update" ON students;
CREATE POLICY "Allow student update" ON students FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow student delete" ON students;
CREATE POLICY "Allow student delete" ON students FOR DELETE USING (true);

-- 4. RLS Policies for winners table
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow winners select" ON winners;
CREATE POLICY "Allow winners select" ON winners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow winners insert" ON winners;
CREATE POLICY "Allow winners insert" ON winners FOR INSERT WITH CHECK (true);

-- 5. RLS Policies for contest-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contest-photos', 'contest-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public select contest-photos" ON storage.objects;
CREATE POLICY "Public select contest-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contest-photos');

DROP POLICY IF EXISTS "Public insert contest-photos" ON storage.objects;
CREATE POLICY "Public insert contest-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contest-photos');

DROP POLICY IF EXISTS "Public update contest-photos" ON storage.objects;
CREATE POLICY "Public update contest-photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'contest-photos');

DROP POLICY IF EXISTS "Public delete contest-photos" ON storage.objects;
CREATE POLICY "Public delete contest-photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contest-photos');
