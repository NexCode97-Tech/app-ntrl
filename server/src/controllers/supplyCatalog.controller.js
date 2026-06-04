import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

// ── CATÁLOGO DE INSUMOS ────────────────────────────────────────

/** GET /supply-catalog — todos autenticados (para el dropdown en solicitudes) */
export async function list(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, unit, unit_price, category, color
       FROM supply_catalog
       WHERE is_active = TRUE
       ORDER BY category NULLS LAST, name ASC`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

/** GET /supply-catalog/all — solo admin, incluye inactivos */
export async function listAll(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { rows } = await pool.query(
      `SELECT id, name, unit, unit_price, category, color, notes, is_active, created_at
       FROM supply_catalog
       ORDER BY category NULLS LAST, name ASC`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

/** POST /supply-catalog — crear insumo (solo admin) */
export async function create(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { name, unit, unit_price = 0, category = null, color = null, notes = null } = req.body;
    if (!name?.trim()) throw new AppError("El nombre es requerido.", 400, "BAD_REQUEST");
    if (!unit?.trim()) throw new AppError("La unidad es requerida.", 400, "BAD_REQUEST");

    const { rows: [row] } = await pool.query(
      `INSERT INTO supply_catalog (name, unit, unit_price, category, color, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name.trim(), unit.trim(), Number(unit_price) || 0, category?.trim() || null, color?.trim() || null, notes?.trim() || null]
    );
    res.status(201).json({ status: "ok", data: row });
  } catch (err) { next(err); }
}

/** PUT /supply-catalog/:id — editar (solo admin) */
export async function update(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { id } = req.params;
    const { name, unit, unit_price, category, color, notes, is_active } = req.body;

    const sets = [];
    const vals = [id];
    if (name       !== undefined) { vals.push(name.trim());                    sets.push(`name = $${vals.length}`); }
    if (unit       !== undefined) { vals.push(unit.trim());                    sets.push(`unit = $${vals.length}`); }
    if (unit_price !== undefined) { vals.push(Number(unit_price) || 0);        sets.push(`unit_price = $${vals.length}`); }
    if (category   !== undefined) { vals.push(category?.trim() || null);       sets.push(`category = $${vals.length}`); }
    if (color      !== undefined) { vals.push(color?.trim() || null);          sets.push(`color = $${vals.length}`); }
    if (notes      !== undefined) { vals.push(notes?.trim() || null);          sets.push(`notes = $${vals.length}`); }
    if (is_active  !== undefined) { vals.push(Boolean(is_active));             sets.push(`is_active = $${vals.length}`); }

    if (!sets.length) throw new AppError("Nada que actualizar.", 400, "BAD_REQUEST");

    const { rows: [row] } = await pool.query(
      `UPDATE supply_catalog SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      vals
    );
    if (!row) throw new AppError("Insumo no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: row });
  } catch (err) { next(err); }
}

/** DELETE /supply-catalog/:id — soft delete (solo admin) */
export async function remove(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { rows: [row] } = await pool.query(
      `UPDATE supply_catalog SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!row) throw new AppError("Insumo no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}

// ── BOM: MATERIALES POR PRODUCTO ──────────────────────────────

/** GET /supply-catalog/product/:productId/materials */
export async function getMaterials(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT pm.id, pm.quantity_per_unit,
              sc.id AS supply_catalog_id, sc.name, sc.unit, sc.unit_price,
              ROUND(pm.quantity_per_unit * sc.unit_price, 2) AS subtotal_costo
       FROM product_materials pm
       JOIN supply_catalog sc ON sc.id = pm.supply_catalog_id
       WHERE pm.product_id = $1
       ORDER BY sc.name ASC`,
      [req.params.productId]
    );
    const costo_total = rows.reduce((s, r) => s + Number(r.subtotal_costo), 0);
    res.json({ status: "ok", data: rows, costo_total });
  } catch (err) { next(err); }
}

/** POST /supply-catalog/product/:productId/materials */
export async function addMaterial(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { supply_catalog_id, quantity_per_unit } = req.body;
    if (!supply_catalog_id) throw new AppError("supply_catalog_id requerido.", 400, "BAD_REQUEST");
    if (!quantity_per_unit || Number(quantity_per_unit) <= 0) throw new AppError("La cantidad debe ser mayor a 0.", 400, "BAD_REQUEST");

    const { rows: [row] } = await pool.query(
      `INSERT INTO product_materials (product_id, supply_catalog_id, quantity_per_unit)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, supply_catalog_id)
       DO UPDATE SET quantity_per_unit = EXCLUDED.quantity_per_unit
       RETURNING *`,
      [req.params.productId, supply_catalog_id, Number(quantity_per_unit)]
    );
    res.status(201).json({ status: "ok", data: row });
  } catch (err) { next(err); }
}

/** PUT /supply-catalog/materials/:id */
export async function updateMaterial(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { quantity_per_unit } = req.body;
    if (!quantity_per_unit || Number(quantity_per_unit) <= 0) throw new AppError("La cantidad debe ser mayor a 0.", 400, "BAD_REQUEST");
    const { rows: [row] } = await pool.query(
      `UPDATE product_materials SET quantity_per_unit = $1 WHERE id = $2 RETURNING *`,
      [Number(quantity_per_unit), req.params.id]
    );
    if (!row) throw new AppError("Material no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: row });
  } catch (err) { next(err); }
}

/** DELETE /supply-catalog/materials/:id */
export async function deleteMaterial(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { rowCount } = await pool.query(`DELETE FROM product_materials WHERE id = $1`, [req.params.id]);
    if (!rowCount) throw new AppError("Material no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}

// ── PROVEEDORES POR INSUMO ────────────────────────────────────

/** GET /supply-catalog/:id/suppliers — proveedores asignados a un insumo */
export async function getCatalogSuppliers(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT cs.id, cs.unit_price, cs.is_preferred, cs.notes,
              s.id AS supplier_id, s.name AS supplier_name, s.contact_name, s.phone, s.email
       FROM supply_catalog_suppliers cs
       JOIN suppliers s ON s.id = cs.supplier_id
       WHERE cs.supply_catalog_id = $1
       ORDER BY cs.is_preferred DESC, s.name ASC`,
      [req.params.id]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

/** POST /supply-catalog/:id/suppliers — asignar proveedor a un insumo */
export async function addCatalogSupplier(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { supplier_id, unit_price = null, is_preferred = false, notes = null } = req.body;
    if (!supplier_id) throw new AppError("supplier_id requerido.", 400, "BAD_REQUEST");

    // Si se marca como preferido, quitar preferido anterior
    if (is_preferred) {
      await pool.query(
        `UPDATE supply_catalog_suppliers SET is_preferred = FALSE WHERE supply_catalog_id = $1`,
        [req.params.id]
      );
    }

    const { rows: [row] } = await pool.query(
      `INSERT INTO supply_catalog_suppliers (supply_catalog_id, supplier_id, unit_price, is_preferred, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (supply_catalog_id, supplier_id)
       DO UPDATE SET unit_price = EXCLUDED.unit_price, is_preferred = EXCLUDED.is_preferred, notes = EXCLUDED.notes
       RETURNING *`,
      [req.params.id, supplier_id, unit_price ? Number(unit_price) : null, Boolean(is_preferred), notes?.trim() || null]
    );
    res.status(201).json({ status: "ok", data: row });
  } catch (err) { next(err); }
}

/** PUT /supply-catalog/catalog-suppliers/:id — editar asignación */
export async function updateCatalogSupplier(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { unit_price, is_preferred, notes } = req.body;

    // Obtener supply_catalog_id para poder quitar preferido anterior
    const { rows: [existing] } = await pool.query(
      `SELECT supply_catalog_id FROM supply_catalog_suppliers WHERE id = $1`, [req.params.id]
    );
    if (!existing) throw new AppError("Asignación no encontrada.", 404, "NOT_FOUND");

    if (is_preferred) {
      await pool.query(
        `UPDATE supply_catalog_suppliers SET is_preferred = FALSE WHERE supply_catalog_id = $1 AND id != $2`,
        [existing.supply_catalog_id, req.params.id]
      );
    }

    const sets = [], vals = [req.params.id];
    if (unit_price   !== undefined) { vals.push(unit_price ? Number(unit_price) : null); sets.push(`unit_price = $${vals.length}`); }
    if (is_preferred !== undefined) { vals.push(Boolean(is_preferred));                  sets.push(`is_preferred = $${vals.length}`); }
    if (notes        !== undefined) { vals.push(notes?.trim() || null);                  sets.push(`notes = $${vals.length}`); }

    if (!sets.length) throw new AppError("Nada que actualizar.", 400, "BAD_REQUEST");

    const { rows: [row] } = await pool.query(
      `UPDATE supply_catalog_suppliers SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, vals
    );
    res.json({ status: "ok", data: row });
  } catch (err) { next(err); }
}

/** DELETE /supply-catalog/catalog-suppliers/:id — quitar proveedor de insumo */
export async function removeCatalogSupplier(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { rowCount } = await pool.query(
      `DELETE FROM supply_catalog_suppliers WHERE id = $1`, [req.params.id]
    );
    if (!rowCount) throw new AppError("Asignación no encontrada.", 404, "NOT_FOUND");
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}
