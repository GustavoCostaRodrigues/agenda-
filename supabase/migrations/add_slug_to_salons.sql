-- Add slug and whatsapp columns to salons
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS whatsapp text;

-- Create an index for faster lookups by slug
CREATE INDEX IF NOT EXISTS salons_slug_idx ON public.salons (slug);

-- Update RLS to allow public reading of salon basic info by slug
DROP POLICY IF EXISTS "Anyone can view salon basic info by slug" ON public.salons;
CREATE POLICY "Anyone can view salon basic info by slug"
ON public.salons FOR SELECT
USING (true); -- We want this to be public for the booking page
