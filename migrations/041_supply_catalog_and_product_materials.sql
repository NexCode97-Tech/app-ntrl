-- Catálogo de insumos con precio por unidad
CREATE TABLE supply_catalog (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  unit         VARCHAR(50)  NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  category     VARCHAR(100),
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BOM: consumo de insumos por producto
CREATE TABLE product_materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supply_catalog_id UUID NOT NULL REFERENCES supply_catalog(id) ON DELETE CASCADE,
  quantity_per_unit NUMERIC(10,4) NOT NULL,
  UNIQUE(product_id, supply_catalog_id)
);

-- Vincular supply_requests al catálogo (nullable — retrocompatible)
ALTER TABLE supply_requests
  ADD COLUMN IF NOT EXISTS supply_catalog_id UUID REFERENCES supply_catalog(id) ON DELETE SET NULL;
