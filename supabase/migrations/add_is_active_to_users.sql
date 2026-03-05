-- ==========================================================
-- SALONHUB - USER ACTIVATION STATUS
-- ==========================================================

-- 1. Add is_active column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Update existing users to ensure they are active (idempotent)
UPDATE public.users SET is_active = true WHERE is_active IS NULL;

-- 3. Update Sync Trigger (if exists)
-- This ensures new synced users start as active
-- (The trigger already inserts default values, but being explicit here if needed)
