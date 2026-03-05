-- Normalize appointment statuses to match the requested design system
-- Blue = agendado, Green = concluido, Red = cancelado

-- 1. Remove old constraint if it exists
DO $$ 
BEGIN 
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
EXCEPTION 
    WHEN undefined_object THEN NULL;
END $$;

-- 2. Update existing records to new values
UPDATE appointments SET status = 'agendado' WHERE status IN ('confirmado', 'espera', 'atendimento');
UPDATE appointments SET status = 'concluido' WHERE status = 'finalizado';

-- 3. Add the new constraint
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('agendado', 'concluido', 'cancelado'));

-- 4. Set default status
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'agendado';

COMMENT ON COLUMN appointments.status IS 'Status do agendamento: agendado (azul), concluido (verde), cancelado (vermelho)';
