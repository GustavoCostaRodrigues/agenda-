-- ==========================================================
-- SALONHUB - USER AVATAR & STORAGE BUCKET (FINAL FIX)
-- ==========================================================

-- 1. Add avatar_url to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create Storage Bucket for Avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies
-- First, drop existing to ensure clean overwrite
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Management" ON storage.objects;

-- Allow public access to read avatars
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to manage their own folder in avatars
-- We use split_part to get the first part of the path (the user ID)
CREATE POLICY "Avatar Management" ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND split_part(name, '/', 1) = get_my_user_id()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND split_part(name, '/', 1) = get_my_user_id()::text
);
