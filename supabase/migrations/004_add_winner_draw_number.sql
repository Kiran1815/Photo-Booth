-- Add draw_number column to winners so we can record multiple draws (1,2,...)
ALTER TABLE IF EXISTS public.winners
ADD COLUMN IF NOT EXISTS draw_number INTEGER DEFAULT 1;

-- Create an index for faster lookups by draw_number
CREATE INDEX IF NOT EXISTS idx_winners_draw_number ON public.winners(draw_number);
