-- Add draw_number column to winners so we can record multiple draws (1,2,...)
ALTER TABLE IF EXISTS public.winners
ADD COLUMN IF NOT EXISTS draw_number INTEGER DEFAULT 1;

-- Create an index for faster lookups by draw_number, but only if the table exists.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'winners'
	) THEN
		-- Use dynamic SQL so the migration does not error on platforms with
		-- slightly different privileges or schema cache timing.
		EXECUTE 'CREATE INDEX IF NOT EXISTS idx_winners_draw_number ON public.winners(draw_number)';
	END IF;
END;
$$;
