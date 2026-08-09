-- =====================================================
-- UPDATE RLS POLICY FOR STUDENTS TABLE
-- Run this in Supabase Dashboard → SQL Editor
-- Allows photo_path update after student photo upload
-- =====================================================

DROP POLICY IF EXISTS "Allow student update" ON students;
CREATE POLICY "Allow student update"
  ON students FOR UPDATE
  USING (true)
  WITH CHECK (true);
