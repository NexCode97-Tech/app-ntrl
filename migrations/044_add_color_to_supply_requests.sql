-- Agrega campo color a supply_requests para especificar el color al momento de solicitar
ALTER TABLE supply_requests
  ADD COLUMN IF NOT EXISTS color VARCHAR(100) DEFAULT NULL;
