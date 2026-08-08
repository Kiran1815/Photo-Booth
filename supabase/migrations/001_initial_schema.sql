-- =====================================================
-- UTKARSH 2026 PHOTO BOOTH CONTEST — DATABASE SCHEMA
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
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'valid', 'rejected')),
  is_valid       BOOLEAN NOT NULL DEFAULT FALSE,
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
-- SEQUENCE: ticket counter (atomic, no duplicates)
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

-- =====================================================
-- FUNCTION: generate_ticket_number()
-- Returns next ticket like UTKARSH2026-0001
-- =====================================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  SELECT nextval('ticket_seq') INTO next_val;
  RETURN 'UTKARSH2026-' || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- =====================================================
-- FUNCTION: execute_lucky_draw(p_admin_id UUID)
-- Selects one random valid entry as winner.
-- Idempotent check: prevents running twice.
-- Returns: winner entry info as JSON
-- =====================================================
CREATE OR REPLACE FUNCTION execute_lucky_draw(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winner_entry  entries%ROWTYPE;
  v_winner_student students%ROWTYPE;
  v_draw_id       UUID;
  v_total         INTEGER;
  v_result        JSONB;
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

  -- 8. Return sanitized winner info (no PII)
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

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE students    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs  ENABLE ROW LEVEL SECURITY;

-- Students can only read their own row
CREATE POLICY "Students: read own record"
  ON students FOR SELECT
  USING (auth.uid()::TEXT = id::TEXT);

-- Entries: students read own entry
CREATE POLICY "Entries: read own"
  ON entries FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE id::TEXT = auth.uid()::TEXT
    )
  );

-- Winners: public read (sanitized by API, no PII)
CREATE POLICY "Winners: public read"
  ON winners FOR SELECT
  USING (TRUE);

-- Service role bypasses RLS (used in server functions only)
-- No additional policies needed for service role.

-- =====================================================
-- STORAGE BUCKETS
-- Run this separately or via Supabase dashboard Storage tab
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('contest-photos', 'contest-photos', false);
--
-- Note: Create this bucket manually in Supabase Dashboard:
--   Storage → New bucket → Name: contest-photos → Private (unchecked public)

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_entries_student_id    ON entries(student_id);
CREATE INDEX IF NOT EXISTS idx_entries_is_valid       ON entries(is_valid, status);
CREATE INDEX IF NOT EXISTS idx_entries_ticket_number  ON entries(ticket_number);
CREATE INDEX IF NOT EXISTS idx_students_email         ON students(college_email);
CREATE INDEX IF NOT EXISTS idx_students_reg_number    ON students(register_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin       ON audit_logs(admin_id);
