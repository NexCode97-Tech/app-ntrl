-- Actualizar fn_recalc_order_total para aplicar descuento_porcentaje al total
CREATE OR REPLACE FUNCTION fn_recalc_order_total()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_subtotal NUMERIC(12,2);
  v_descuento NUMERIC(5,2);
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  -- Bloquea la fila del pedido para evitar actualizaciones concurrentes
  SELECT descuento_porcentaje INTO v_descuento
  FROM orders WHERE id = v_order_id FOR UPDATE;

  v_subtotal := COALESCE((SELECT SUM(subtotal) FROM order_items WHERE order_id = v_order_id), 0);

  UPDATE orders
  SET
    total      = v_subtotal * (1 - COALESCE(v_descuento, 0) / 100),
    updated_at = NOW()
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger en orders: recalcular total cuando cambia descuento_porcentaje
CREATE OR REPLACE FUNCTION fn_recalc_total_on_descuento()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal NUMERIC(12,2);
BEGIN
  IF NEW.descuento_porcentaje IS DISTINCT FROM OLD.descuento_porcentaje THEN
    v_subtotal := COALESCE((SELECT SUM(subtotal) FROM order_items WHERE order_id = NEW.id), 0);
    NEW.total := v_subtotal * (1 - COALESCE(NEW.descuento_porcentaje, 0) / 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_total_on_descuento ON orders;
CREATE TRIGGER trg_recalc_total_on_descuento
BEFORE UPDATE OF descuento_porcentaje ON orders
FOR EACH ROW EXECUTE FUNCTION fn_recalc_total_on_descuento();

-- Recalcular totales existentes que tengan descuento_porcentaje > 0
UPDATE orders
SET total = (
  SELECT COALESCE(SUM(subtotal), 0)
  FROM order_items
  WHERE order_id = orders.id
) * (1 - descuento_porcentaje / 100)
WHERE descuento_porcentaje > 0;
