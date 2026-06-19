import { pool } from "../config/database.js";

async function cached(key, fn) {
  return await fn();
}

// Resuelve el rango de fechas desde la query.
// Acepta: ?start=YYYY-MM-DD&end=YYYY-MM-DD (rango libre) o ?month=YYYY-MM (mes completo).
// Devuelve { start, end } como strings YYYY-MM-DD, o null si no hay filtro.
function resolveRange(query) {
  const { start, end, month } = query;
  if (start && end) return { start, end };
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
  }
  return { start: null, end: null };
}

// Guarda snapshot del mes indicado (formato 'YYYY-MM') si aún no existe
async function saveSnapshotIfMissing(month) {
  const existing = await pool.query(
    `SELECT id FROM monthly_snapshots WHERE month = $1`,
    [month]
  );
  if (existing.rowCount > 0) return;

  const [financial, byStatus] = await Promise.all([
    pool.query(`
      SELECT
        COALESCE(SUM(total), 0)       AS total_revenue,
        COALESCE(SUM(amount_paid), 0) AS collected,
        COALESCE(SUM(balance), 0)     AS pending,
        COUNT(*)                      AS orders_count
      FROM orders
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)
    `, [`${month}-01`]),
    pool.query(`
      SELECT status, COUNT(*) AS total
      FROM orders
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)
      GROUP BY status
    `, [`${month}-01`]),
  ]);

  const statusCounts = {};
  byStatus.rows.forEach((r) => { statusCounts[r.status] = Number(r.total); });
  const f = financial.rows[0];

  await pool.query(
    `INSERT INTO monthly_snapshots (month, total_revenue, collected, pending, orders_count, status_counts)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (month) DO NOTHING`,
    [month, f.total_revenue, f.collected, f.pending, f.orders_count, JSON.stringify(statusCounts)]
  );
}

// Devuelve 'YYYY-MM' del mes anterior al actual
function previousMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getSummary(req, res, next) {
  try {
    // Guardar snapshot del mes anterior en background (sin bloquear respuesta)
    saveSnapshotIfMissing(previousMonth()).catch(() => {});

    const data = await cached("dashboard:summary", async () => {
      const [byStatus, monthly, bySport, byLine, financial, workerPerf, prevPeriod] = await Promise.all([
        // Solo pedidos del mes actual
        pool.query(`
          SELECT status, COUNT(*) AS total
          FROM orders
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
          GROUP BY status
        `),

        pool.query(`
          SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
                 COUNT(*) AS orders, SUM(total) AS revenue
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '12 months'
          GROUP BY month ORDER BY month
        `),

        pool.query(`
          SELECT s.name AS sport, COUNT(DISTINCT o.id) AS orders, SUM(oi.subtotal) AS revenue
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN lines l ON l.id = p.line_id
          JOIN sports s ON s.id = l.sport_id
          JOIN orders o ON o.id = oi.order_id
          GROUP BY s.name ORDER BY revenue DESC
        `),

        pool.query(`
          SELECT l.name AS line, s.name AS sport, COUNT(DISTINCT o.id) AS orders, SUM(oi.subtotal) AS revenue
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN lines l ON l.id = p.line_id
          JOIN sports s ON s.id = l.sport_id
          JOIN orders o ON o.id = oi.order_id
          GROUP BY l.name, s.name ORDER BY revenue DESC LIMIT 10
        `),

        // Solo pedidos del mes actual (total y pendiente por fecha de pedido, recaudado por fecha de pago)
        pool.query(`
          SELECT
            COALESCE(SUM(total), 0)   AS total_revenue,
            COALESCE(SUM(balance), 0) AS pending,
            (SELECT COALESCE(SUM(amount), 0) FROM order_payments
             WHERE DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())) AS collected
          FROM orders
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        `),

        // Mismo periodo del mes anterior (día 1 hasta el día equivalente al día actual)
        pool.query(`
          SELECT
            COALESCE(SUM(total), 0)   AS total_revenue,
            COALESCE(SUM(balance), 0) AS pending,
            (SELECT COALESCE(SUM(amount), 0) FROM order_payments
             WHERE paid_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
               AND paid_at <  (DATE_TRUNC('month', NOW()) - INTERVAL '1 month')
                             + (NOW() - DATE_TRUNC('month', NOW()))
            ) AS collected
          FROM orders
          WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
            AND created_at <  (DATE_TRUNC('month', NOW()) - INTERVAL '1 month')
                            + (NOW() - DATE_TRUNC('month', NOW()))
        `),

        pool.query(`
          SELECT u.name, u.area,
                 COUNT(*) FILTER (WHERE pt.status = 'done')        AS completed,
                 COUNT(*) FILTER (WHERE pt.status = 'in_progress') AS in_progress
          FROM production_tasks pt
          JOIN users u ON u.id = pt.completed_by OR u.id = pt.started_by
          WHERE u.role = 'worker'
          GROUP BY u.id, u.name, u.area ORDER BY completed DESC
        `),
      ]);

      return {
        byStatus:   byStatus.rows,
        monthly:    monthly.rows,
        bySport:    bySport.rows,
        byLine:     byLine.rows,
        financial:  financial.rows[0],
        workerPerf: workerPerf.rows,
        prev_period: prevPeriod.rows[0],
      };
    });

    res.json({ status: "ok", data });
  } catch (err) { next(err); }
}

export async function invalidateCache(req, res) {
  res.json({ status: "ok", message: "Caché invalidada." });
}

export async function getMonthlyHistory(req, res, next) {
  try {
    // Calcular directamente desde orders — no depende de monthly_snapshots
    const { rows } = await pool.query(`
      SELECT
        f.month,
        f.total_revenue,
        COALESCE(p.collected, 0) AS collected,
        f.pending,
        f.orders_count,
        s.status_counts
      FROM (
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(total), 0)   AS total_revenue,
          COALESCE(SUM(balance), 0) AS pending,
          COUNT(*)                  AS orders_count
        FROM orders
        WHERE DATE_TRUNC('month', created_at) < DATE_TRUNC('month', NOW())
        GROUP BY DATE_TRUNC('month', created_at)
      ) f
      LEFT JOIN (
        SELECT
          TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') AS month,
          COALESCE(SUM(amount), 0) AS collected
        FROM order_payments
        WHERE DATE_TRUNC('month', paid_at) < DATE_TRUNC('month', NOW())
        GROUP BY DATE_TRUNC('month', paid_at)
      ) p ON p.month = f.month
      JOIN (
        SELECT
          month,
          jsonb_object_agg(status, cnt) AS status_counts
        FROM (
          SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
            status,
            COUNT(*) AS cnt
          FROM orders
          WHERE DATE_TRUNC('month', created_at) < DATE_TRUNC('month', NOW())
          GROUP BY DATE_TRUNC('month', created_at), status
        ) sc
        GROUP BY month
      ) s ON s.month = f.month
      ORDER BY f.month DESC
      LIMIT 24
    `);

    // Guardar snapshots en background para auditoría (no bloquea respuesta)
    rows.forEach((r) => saveSnapshotIfMissing(r.month).catch(() => {}));

    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getDateRangeSummary(req, res, next) {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ status: "error", message: "Parámetros start y end requeridos." });

    const startDate = new Date(start + "T00:00:00.000Z");
    const endDate   = new Date(end   + "T23:59:59.999Z");
    if (isNaN(startDate) || isNaN(endDate)) return res.status(400).json({ status: "error", message: "Fechas inválidas." });

    const [financial, byStatus] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(total), 0)   AS total_revenue,
          COALESCE(SUM(balance), 0) AS pending,
          (SELECT COALESCE(SUM(amount), 0) FROM order_payments
           WHERE paid_at >= $1 AND paid_at <= $2) AS collected
        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
      `, [startDate, endDate]),

      pool.query(`
        SELECT status, COUNT(*) AS total
        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY status
      `, [startDate, endDate]),
    ]);

    res.json({
      status: "ok",
      data: {
        financial:  financial.rows[0],
        byStatus:   byStatus.rows,
      },
    });
  } catch (err) { next(err); }
}

export async function getPendingBalances(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.order_number, TO_CHAR(o.order_number,'FM000') AS order_number_fmt,
              c.name AS customer_name, o.total, o.amount_paid, o.balance
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.balance > 0
       ORDER BY o.balance DESC
       LIMIT 100`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getSportByMonth(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);

    const { rows } = await pool.query(`
      SELECT s.name AS sport,
             COUNT(DISTINCT o.id)      AS orders,
             COALESCE(SUM(oi.subtotal), 0) AS revenue
      FROM order_items oi
      JOIN products p  ON p.id  = oi.product_id
      JOIN lines l     ON l.id  = p.line_id
      JOIN sports s    ON s.id  = l.sport_id
      JOIN orders o    ON o.id  = oi.order_id
      WHERE ($1::date IS NULL OR o.created_at::date BETWEEN $1::date AND $2::date)
      GROUP BY s.name
      ORDER BY revenue DESC
    `, [start, end]);

    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getTopCustomers(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);
    const { rows } = await pool.query(`
      SELECT c.id, c.name AS customer,
             COUNT(DISTINCT o.id)    AS orders,
             COALESCE(SUM(o.total), 0) AS revenue
      FROM customers c
      JOIN orders o ON o.customer_id = c.id
      WHERE ($1::date IS NULL OR o.created_at::date BETWEEN $1::date AND $2::date)
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT 5
    `, [start, end]);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getTopProducts(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);
    const { rows } = await pool.query(`
      SELECT p.name                                                          AS product,
             COUNT(DISTINCT o.id)                                           AS orders,
             COALESCE(SUM((
               SELECT SUM(v::numeric)
               FROM jsonb_each_text(oi.sizes) AS t(k, v)
             )), 0)                                                         AS units,
             COALESCE(SUM(oi.subtotal), 0)                                  AS revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o   ON o.id = oi.order_id
      WHERE ($1::date IS NULL
             OR o.created_at::date BETWEEN $1::date AND $2::date)
      GROUP BY p.name
      ORDER BY units DESC
      LIMIT 5
    `, [start, end]);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getGeoByMonth(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(c.department), ''), 'Sin departamento') AS department,
        COALESCE(NULLIF(TRIM(c.city),       ''), 'Sin ciudad')       AS city,
        COUNT(DISTINCT o.id)                                          AS orders,
        COALESCE(SUM(o.total), 0)                                     AS revenue
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE ($1::date IS NULL
             OR o.created_at::date BETWEEN $1::date AND $2::date)
      GROUP BY department, city
      ORDER BY revenue DESC
      LIMIT 20
    `, [start, end]);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getGenderByMonth(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);
    const { rows } = await pool.query(`
      SELECT oi.gender,
             COUNT(DISTINCT o.id)                                                         AS orders,
             COALESCE(SUM(oi.subtotal), 0)                                               AS revenue,
             COALESCE(SUM((
               SELECT SUM(v::numeric)
               FROM jsonb_each_text(oi.sizes) AS t(k, v)
             )), 0)                                                                       AS units
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE ($1::date IS NULL
             OR o.created_at::date BETWEEN $1::date AND $2::date)
      GROUP BY oi.gender
      ORDER BY revenue DESC
    `, [start, end]);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getUpcomingDeliveries(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.order_number, TO_CHAR(o.order_number,'FM000') AS order_number_fmt,
              o.delivery_date, o.status, c.name AS customer_name
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.status NOT IN ('delivered','cancelled')
         AND o.delivery_date IS NOT NULL
       ORDER BY o.delivery_date ASC
       LIMIT 5`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// Serie diaria del mes actual vs mes anterior: facturado, recaudado y pendiente por día.
export async function getDailyComparison(req, res, next) {
  try {
    async function dailySeries(monthOffset) {
      const { rows } = await pool.query(`
        WITH ref AS (
          SELECT DATE_TRUNC('month', NOW()) - ($1 || ' month')::interval AS month_start
        ),
        days AS (
          SELECT generate_series(
            (SELECT month_start FROM ref),
            (SELECT month_start FROM ref) + INTERVAL '1 month' - INTERVAL '1 day',
            INTERVAL '1 day'
          )::date AS d
        ),
        fact AS (
          SELECT created_at::date AS d,
                 SUM(total)   AS facturado,
                 SUM(balance) AS pendiente
          FROM orders
          WHERE DATE_TRUNC('month', created_at) = (SELECT month_start FROM ref)
          GROUP BY created_at::date
        ),
        recau AS (
          SELECT paid_at::date AS d, SUM(amount) AS recaudado
          FROM order_payments
          WHERE DATE_TRUNC('month', paid_at) = (SELECT month_start FROM ref)
          GROUP BY paid_at::date
        )
        SELECT EXTRACT(DAY FROM days.d)::int AS day,
               COALESCE(fact.facturado, 0)   AS facturado,
               COALESCE(recau.recaudado, 0)  AS recaudado,
               COALESCE(fact.pendiente, 0)   AS pendiente
        FROM days
        LEFT JOIN fact  ON fact.d  = days.d
        LEFT JOIN recau ON recau.d = days.d
        WHERE days.d <= CASE WHEN $1 = '0' THEN NOW()::date ELSE days.d END
        ORDER BY day
      `, [String(monthOffset)]);
      return rows;
    }

    const [current, previous] = await Promise.all([dailySeries(0), dailySeries(1)]);
    res.json({ status: "ok", data: { current, previous } });
  } catch (err) { next(err); }
}
