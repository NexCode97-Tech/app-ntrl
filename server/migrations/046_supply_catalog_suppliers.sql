-- Relación muchos-a-muchos: insumos ↔ proveedores
-- Un insumo puede ser suministrado por varios proveedores (con precio propio)
-- Un proveedor puede suministrar varios insumos

CREATE TABLE IF NOT EXISTS supply_catalog_suppliers (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_catalog_id UUID         NOT NULL REFERENCES supply_catalog(id) ON DELETE CASCADE,
  supplier_id       UUID         NOT NULL REFERENCES suppliers(id)       ON DELETE CASCADE,
  unit_price        NUMERIC(12,2),          -- precio de este proveedor (override del precio base)
  is_preferred      BOOLEAN      NOT NULL DEFAULT FALSE,
  notes             TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(supply_catalog_id, supplier_id)
);

-- Solo puede haber un proveedor preferido por insumo
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_preferred_per_catalog
  ON supply_catalog_suppliers (supply_catalog_id)
  WHERE is_preferred = TRUE;
