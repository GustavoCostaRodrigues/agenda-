-- Add notes column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update RLS if necessary (usually not needed for just a column addition if using SELECT *)
COMMENT ON COLUMN appointments.notes IS 'Observações livres do agendamento';
