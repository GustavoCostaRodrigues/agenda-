-- ==========================================================
-- AGENDA+ - LOGO STORAGE & COLUMN FIX (REFINED RLS)
-- ==========================================================

-- 1. Ensure logo_url exists and clean up old naming
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS logo_url text;

-- If app_logo_url exists from previous step, migrate and drop
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='salons' AND column_name='app_logo_url') THEN
        UPDATE public.salons SET logo_url = app_logo_url WHERE logo_url IS NULL;
        ALTER TABLE public.salons DROP COLUMN app_logo_url;
    END IF;
END $$;

-- 2. Create the Storage Bucket for Logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies
-- First, drop existing policies to ensure a clean update
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete logos" ON storage.objects;

-- Allow public to view any logo
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

-- Allow authenticated owners to manage their salon's folder
-- Simplified folder check using the salon_id path
CREATE POLICY "Owners can upload logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'logos' 
    AND (storage.foldername(name))[1] = get_my_salon_id()::text
    AND get_my_role() = 'owner'
);

CREATE POLICY "Owners can update logos" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'logos' 
    AND (storage.foldername(name))[1] = get_my_salon_id()::text
    AND get_my_role() = 'owner'
);

CREATE POLICY "Owners can delete logos" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'logos' 
    AND (storage.foldername(name))[1] = get_my_salon_id()::text
    AND get_my_role() = 'owner'
);
