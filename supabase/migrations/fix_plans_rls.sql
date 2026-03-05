-- ==========================================================
-- AGENDA+ - FIX PLANS VISIBILITY (RLS)
-- ==========================================================

-- 1. Enable RLS on plans table
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policy if exists
DROP POLICY IF EXISTS "Public can view plans" ON public.plans;

-- 3. Create policy to allow everyone to view plans
CREATE POLICY "Public can view plans" 
ON public.plans FOR SELECT 
USING (true);

-- 4. Initial Seed (Ensure plans exist if not already there)
-- This is a fallback in case the table is empty during testing
-- INSERT INTO public.plans (name, price, max_workers, expiration)
-- VALUES 
-- ('Básico', 0, 1, 'ilimitado'),
-- ('Premium', 99.90, 5, 'mensal'),
-- ('Pro', 199.90, 15, 'mensal')
-- ON CONFLICT (id) DO NOTHING;
