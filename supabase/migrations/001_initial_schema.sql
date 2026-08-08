-- =====================================================
-- UTKARSH 2026 PHOTO BOOTH CONTEST — COMPLETE DATABASE SCHEMA & STORAGE POLICIES
-- Run this entire script in Supabase Dashboard:
--   SQL Editor → New query → Paste → Run
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLE: students
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  college_name    TEXT NOT NULL,
  register_number TEXT NOT NULL,
  college_email   TEXT NOT NULL,
  contact_number  TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'disqualified')),

  -- Uniqueness constraints
  CONSTRAINT students_college_email_unique   UNIQUE (college_email),
  CONSTRAINT students_register_number_unique UNIQUE (register_number),
  CONSTRAINT students_contact_unique         UNIQUE (contact_number)
);

-- =====================================================
-- TABLE: entries (one per student max)
-- =====================================================
CREATE TABLE IF NOT EXISTS entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ticket_number  TEXT NOT NULL UNIQUE,
  photo_path     TEXT NOT NULL,
  thumbnail_path TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         TEXT NOT NULL DEFAULT 'valid'
                   CHECK (status IN ('pending', 'valid', 'rejected')),
  is_valid       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One entry per student
  CONSTRAINT entries_student_id_unique UNIQUE (student_id)
);

-- =====================================================
-- TABLE: draws
-- =====================================================
CREATE TABLE IF NOT EXISTS draws (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_by      UUID,          -- admin user id
  executed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_entries    INTEGER NOT NULL DEFAULT 0,
  winner_entry_id  UUID REFERENCES entries(id),
  status           TEXT NOT NULL DEFAULT 'completed'
                     CHECK (status IN ('completed', 'cancelled'))
);

-- =====================================================
-- TABLE: winners
-- =====================================================
CREATE TABLE IF NOT EXISTS winners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES entries(id),
  ticket_number TEXT NOT NULL,
  draw_id       UUID REFERENCES draws(id),
  selected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: audit_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID,
  action     TEXT NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SEQUENCE: ticket counter (atomic, sequential, no duplicates)
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

-- =====================================================
-- FUNCTION: generate_ticket_number()
-- Returns next ticket like UTKARSH2026-0001
-- =====================================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  SELECT nextval('ticket_seq') INTO next_val;
  RETURN 'UTKARSH2026-' || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION generate_ticket_number() TO anon, authenticated, service_role;

-- =====================================================
-- FUNCTION: execute_lucky_draw(p_admin_id UUID)
-- Selects one random valid entry as winner (ORDER BY random() LIMIT 1).
-- Idempotent check: prevents running twice.
-- Returns: winner entry info as JSON
-- =====================================================
CREATE OR REPLACE FUNCTION execute_lucky_draw(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winner_entry   entries%ROWTYPE;
  v_winner_student students%ROWTYPE;
  v_draw_id        UUID;
  v_total          INTEGER;
  v_result         JSONB;
BEGIN
  -- 1. Prevent running twice
  IF EXISTS (SELECT 1 FROM winners LIMIT 1) THEN
    RAISE EXCEPTION 'Lucky draw has already been executed. A winner exists.';
  END IF;

  -- 2. Count valid entries
  SELECT COUNT(*) INTO v_total FROM entries WHERE is_valid = TRUE AND status = 'valid';

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No valid entries found for the lucky draw.';
  END IF;

  -- 3. Randomly select winner (equal probability for all valid entries)
  SELECT * INTO v_winner_entry
  FROM entries
  WHERE is_valid = TRUE AND status = 'valid'
  ORDER BY random()
  LIMIT 1;

  -- 4. Get student details
  SELECT * INTO v_winner_student
  FROM students
  WHERE id = v_winner_entry.student_id;

  -- 5. Create draw record
  INSERT INTO draws (executed_by, total_entries, winner_entry_id, status)
  VALUES (p_admin_id, v_total, v_winner_entry.id, 'completed')
  RETURNING id INTO v_draw_id;

  -- 6. Create winner record
  INSERT INTO winners (entry_id, ticket_number, draw_id)
  VALUES (v_winner_entry.id, v_winner_entry.ticket_number, v_draw_id);

  -- 7. Audit log
  INSERT INTO audit_logs (admin_id, action, metadata)
  VALUES (
    p_admin_id,
    'LUCKY_DRAW_EXECUTED',
    jsonb_build_object(
      'ticket_number', v_winner_entry.ticket_number,
      'total_entries', v_total,
      'draw_id',       v_draw_id
    )
  );

  -- 8. Return winner info
  v_result := jsonb_build_object(
    'ticket_number', v_winner_entry.ticket_number,
    'display_name',  v_winner_student.full_name,
    'college_name',  v_winner_student.college_name,
    'photo_path',    v_winner_entry.photo_path,
    'selected_at',   NOW(),
    'total_entries', v_total
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_lucky_draw(UUID) TO authenticated, service_role;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE students    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs  ENABLE ROW LEVEL SECURITY;

-- 1. Students policies
DROP POLICY IF EXISTS "Allow student insert" ON students;
CREATE POLICY "Allow student insert"
  ON students FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow student select" ON students;
CREATE POLICY "Allow student select"
  ON students FOR SELECT USING (TRUE);

-- 2. Entries policies
DROP POLICY IF EXISTS "Allow entry insert" ON entries;
CREATE POLICY "Allow entry insert"
  ON entries FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow entry select" ON entries;
CREATE POLICY "Allow entry select"
  ON entries FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow entry update" ON entries;
CREATE POLICY "Allow entry update"
  ON entries FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "Allow entry delete" ON entries;
CREATE POLICY "Allow entry delete"
  ON entries FOR DELETE USING (TRUE);

-- 3. Winners policies
DROP POLICY IF EXISTS "Winners: public read" ON winners;
CREATE POLICY "Winners: public read"
  ON winners FOR SELECT USING (TRUE);

-- 4. Draws & Audit logs
DROP POLICY IF EXISTS "Draws read" ON draws;
CREATE POLICY "Draws read"
  ON draws FOR SELECT USING (TRUE);

-- =====================================================
-- STORAGE BUCKETS & RLS POLICIES
-- =====================================================

-- Create contest-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contest-photos', 'contest-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for contest-photos
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

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_entries_student_id    ON entries(student_id);
CREATE INDEX IF NOT EXISTS idx_entries_is_valid       ON entries(is_valid, status);
CREATE INDEX IF NOT EXISTS idx_entries_ticket_number  ON entries(ticket_number);
CREATE INDEX IF NOT EXISTS idx_students_email         ON students(college_email);
CREATE INDEX IF NOT EXISTS idx_students_reg_number    ON students(register_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin       ON audit_logs(admin_id);
