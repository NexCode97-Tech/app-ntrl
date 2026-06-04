-- Agrega campo color a supply_catalog para diferenciar variantes del mismo insumo
ALTER TABLE supply_catalog
  ADD COLUMN IF NOT EXISTS color VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN supply_catalog.color IS 'Color o variante del insumo (ej: Blanco, Negro, Rojo)';
