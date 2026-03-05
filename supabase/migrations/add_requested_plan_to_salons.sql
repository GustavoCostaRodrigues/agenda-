-- ==========================================================
-- SALONHUB - ADD REQUESTED PLAN TO SALONS
-- ==========================================================

-- 1. Add requested_plan column as FK to plans
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS requested_plan bigint REFERENCES public.plans(id);

COMMENT ON COLUMN public.salons.requested_plan IS 'Plano que o dono do salão solicitou upgrade/downgrade.';
