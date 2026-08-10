-- Update generate_ticket_number to reuse lowest available ticket numbers when possible.
-- Uses an advisory lock to prevent race conditions.
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next BIGINT;
  v_candidate BIGINT;
  v_max BIGINT;
BEGIN
  -- Acquire transaction-scoped advisory lock to avoid race conditions
  PERFORM pg_advisory_xact_lock(123456789);

  -- Find the smallest missing positive integer in students.ticket_number
  SELECT COALESCE(MIN(missing_series.num), NULL) INTO v_candidate
  FROM (
    SELECT generate_series(1, COALESCE((SELECT MAX(ticket_number) FROM students), 0) + 1) AS num
    EXCEPT
    SELECT ticket_number FROM students
    ORDER BY 1
  ) AS missing_series
  LIMIT 1;

  IF v_candidate IS NOT NULL THEN
    RETURN 'UTKARSH2026-' || LPAD(v_candidate::TEXT, 4, '0');
  END IF;

  -- Fallback: use sequence to generate next ticket
  SELECT nextval('ticket_seq') INTO v_next;
  RETURN 'UTKARSH2026-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

-- Grant execute permission to relevant roles
GRANT EXECUTE ON FUNCTION generate_ticket_number() TO anon, authenticated, service_role;
