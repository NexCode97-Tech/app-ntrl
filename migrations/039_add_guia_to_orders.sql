-- Agrega datos de guía de despacho a órdenes
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS guia_data JSONB DEFAULT NULL;

COMMENT ON COLUMN orders.guia_data IS 'Datos editables de la guía de despacho: transportadora, numero_guia, direccion_destino, observaciones';
