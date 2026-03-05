-- ==========================================================
-- AGENDA+ - SALON SETTINGS (WHITE LABEL & PERMISSIONS)
-- ==========================================================

-- 1. Add new columns to public.salons
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS app_name text,
ADD COLUMN IF NOT EXISTS app_logo_url text,
ADD COLUMN IF NOT EXISTS app_colors jsonb DEFAULT '{"primary": "#007AFF", "secondary": "#5856D6"}'::jsonb,
ADD COLUMN IF NOT EXISTS manager_permissions jsonb DEFAULT '["Agenda", "Financeiro", "Clientes"]'::jsonb;

-- 2. Update RLS policies for public.salons
-- Owners should be able to update their own salon settings
DROP POLICY IF EXISTS "Owners can update their own salon" ON public.salons;
CREATE POLICY "Owners can update their own salon"
ON public.salons FOR UPDATE
USING (
  id = get_my_salon_id() 
  AND get_my_role() = 'owner'
)
WITH CHECK (
  id = get_my_salon_id() 
  AND get_my_role() = 'owner'
);

-- Owners can also view their own salon (public view already allows this, but let's be explicit for settings)
DROP POLICY IF EXISTS "Owners can view their salon settings" ON public.salons;
CREATE POLICY "Owners can view their salon settings"
ON public.salons FOR SELECT
USING (
  id = get_my_salon_id() 
  AND get_my_role() = 'owner'
);

COMMENT ON COLUMN public.salons.manager_permissions IS 'Lista de telas permitidas para o cargo manager.';
COMMENT ON COLUMN public.salons.app_colors IS 'Cores personalizadas do app (White Label).';
