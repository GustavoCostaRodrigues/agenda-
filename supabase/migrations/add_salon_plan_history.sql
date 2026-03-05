-- ==========================================================
-- AGENDA+ - SALON PLAN HISTORY
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.salon_plan_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    salon_id bigint NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    previous_plan_id bigint REFERENCES public.plans(id),
    new_plan_id bigint NOT NULL REFERENCES public.plans(id),
    change_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salon_plan_history ENABLE ROW LEVEL SECURITY;

-- Simple policy for authenticated users (can be refined later)
CREATE POLICY "Enable all for authenticated users" ON public.salon_plan_history
    FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.salon_plan_history IS 'Histórico de trocas de plano dos salões.';
