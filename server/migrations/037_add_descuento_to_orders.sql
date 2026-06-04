-- Agrega campo de descuento en porcentaje a órdenes
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Comentario descriptivo
COMMENT ON COLUMN orders.descuento_porcentaje IS 'Porcentaje de descuento aplicado al total del pedido (0-100)';
