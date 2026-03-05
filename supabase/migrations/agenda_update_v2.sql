-- ==========================================================
-- SALONHUB - AGENDA UPDATES (Price & Status)
-- ==========================================================

-- 1. Add price column
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0;

-- 2. Update status constraint
-- We need to drop the old constraint if it exists and add the new one
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('confirmado', 'espera', 'atendimento', 'finalizado'));

-- Update existing rows to a valid status if necessary
UPDATE public.appointments SET status = 'confirmado' WHERE status NOT IN ('confirmado', 'espera', 'atendimento', 'finalizado');
