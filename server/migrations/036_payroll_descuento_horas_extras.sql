-- Agrega columna para descuento de horas que el empleado debe a la empresa
ALTER TABLE payroll_transactions
  ADD COLUMN IF NOT EXISTS descuento_horas_extras NUMERIC(12,2) NOT NULL DEFAULT 0;
