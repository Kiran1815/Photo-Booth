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

  -- Parse the numeric suffix from tickets of the form UTKARSH2026-XXXX.
  -- Reuse the lowest missing positive value and preserve the ticket prefix.
  SELECT COALESCE(MIN(missing_series.num), NULL) INTO v_candidate
  FROM (
    SELECT generate_series(1, COALESCE((SELECT MAX(CAST(REGEXP_REPLACE(ticket_number, '^.*-(\\d+)$', '\\1') AS BIGINT)) FROM students), 0) + 1) AS num
    EXCEPT
    SELECT CAST(REGEXP_REPLACE(ticket_number, '^.*-(\\d+)$', '\\1') AS BIGINT) FROM students
    WHERE ticket_number ~ '^UTKARSH2026-\\d{4}$'
    ORDER BY 1
  ) AS missing_series
  LIMIT 1;

  IF v_candidate IS NOT NULL THEN
    RETURN 'UTKARSH2026-' || LPAD(v_candidate::TEXT, 4, '0');
  END IF;

  -- Fallback: use sequence to generate the next ticket number.
  SELECT nextval('ticket_seq') INTO v_next;
  RETURN 'UTKARSH2026-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

-- Grant execute permission to relevant roles
GRANT EXECUTE ON FUNCTION generate_ticket_number() TO anon, authenticated, service_role;
