-- ==========================================================
-- AGENDA+ - BILLING TRACKING COLUMNS
-- ==========================================================

-- 1. Add billing and plan change tracking
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS billing_day integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS plan_change_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS previous_plan_id bigint REFERENCES public.plans(id);

COMMENT ON COLUMN public.salons.billing_day IS 'Dia do mês para vencimento da fatura.';
COMMENT ON COLUMN public.salons.plan_change_date IS 'Data da última alteração de plano para cálculo pro-rata.';
COMMENT ON COLUMN public.salons.previous_plan_id IS 'Plano anterior para referência em cálculos proporcionais.';
