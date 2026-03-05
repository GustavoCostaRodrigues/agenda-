-- ==========================================================
-- SALONHUB - DATABASE SECURITY (RLS POLICIES) - FIXED v3
-- ==========================================================

-- 1. ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FUNCTIONS (SECURITY DEFINER to avoid recursion)
-- These functions run with owner privileges, bypassing RLS to check roles

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_salon_id()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT salon_id FROM public.users 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old function if exists to change return type or signature if needed
DROP FUNCTION IF EXISTS get_my_user_id();

CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT u.id 
    FROM public.users u
    WHERE lower(u.email) = (SELECT lower(email) FROM auth.users WHERE id = auth.uid())
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. POLICIES FOR 'users' TABLE

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Owners can view their salon team" ON public.users;
DROP POLICY IF EXISTS "Allow public insert for signup" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Restrict updates by hierarchy" ON public.users;

-- Anyone can read their own profile OR Devs can read any
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (
  email = auth.jwt() ->> 'email' 
  OR get_my_role() = 'DEV'
);

-- Owners can view users in their salon
CREATE POLICY "Owners can view their salon team" 
ON public.users FOR SELECT 
USING (
  get_my_role() = 'owner' 
  AND salon_id = get_my_salon_id()
);

-- Public insert for signup
CREATE POLICY "Allow public insert for signup" 
ON public.users FOR INSERT 
WITH CHECK (true);

-- Users can update their own profile (e.g., set salon_id via code)
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (lower(email) = lower(auth.jwt() ->> 'email'))
WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

-- Devs can update anyone. Owners can update team.
CREATE POLICY "Restrict updates by hierarchy" 
ON public.users FOR UPDATE 
USING (
  get_my_role() = 'DEV' 
  OR (
    get_my_role() = 'owner' 
    AND salon_id = get_my_salon_id()
  )
);

-- 4. POLICIES FOR 'salons' TABLE

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view salons" ON public.salons;
DROP POLICY IF EXISTS "Only dev can manage salons" ON public.salons;

-- Everyone can view active salons (to link via code)
CREATE POLICY "Public can view salons" 
ON public.salons FOR SELECT 
USING (true);

-- Only DEV can insert/update salons
CREATE POLICY "Only dev can manage salons" 
ON public.salons FOR ALL
USING (get_my_role() = 'DEV')
WITH CHECK (get_my_role() = 'DEV');
