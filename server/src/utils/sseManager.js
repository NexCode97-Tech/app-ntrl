/**
 * SSE Manager — Notificaciones en tiempo real.
 * Modo memoria (single-instance): broadcastInvalidate entrega directamente a los clientes.
 * Si REDIS_URL está configurado: usa Redis Pub/Sub para escalar entre instancias.
 */

import { pool } from "../config/database.js";

const MAX_CONNECTIONS = 50;

// userId -> Set<{ res, role }>
const clients = new Map();

// ── Gestión de conexiones ─────────────────────────────────────

export function addClient(userId, role, res) {
  const total = [...clients.values()].reduce((sum, s) => sum + s.size, 0);
  if (total >= MAX_CONNECTIONS) {
    res.status(503).json({ error: "Capacidad SSE máxima alcanzada." });
    return false;
  }

  if (!clients.has(userId)) clients.set(userId, new Set());
  const entry = { res, role };
  clients.get(userId).add(entry);

  res.on("close", () => {
    clients.get(userId)?.delete(entry);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
  });

  return true;
}

// ── Entrega interna ───────────────────────────────────────────

function _deliver(msg) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const entrySet of clients.values()) {
    for (const { res, role } of entrySet) {
      if (msg.targetRole && msg.targetRole !== role) continue;
      if (msg.userId) {
        // notificación dirigida — se maneja en sendToUser
        continue;
      }
      try { res.write(data); } catch { /* cliente desconectado */ }
    }
  }
}

// ── API pública ───────────────────────────────────────────────

/** Inicializa suscriptor Redis si está disponible. Llamado desde server.js. */
export function initSSESubscriber() {
  if (!process.env.REDIS_URL) return; // sin Redis → modo memoria, nada que suscribir

  import("../config/redis.js").then(({ redisSub }) => {
    if (redisSub._isNoop) return;
    redisSub.subscribe("ntrl:notifications", (err) => {
      if (err) console.error("SSE Redis subscribe error:", err);
    });
    redisSub.on("message", (channel, raw) => {
      if (channel !== "ntrl:notifications") return;
      try { _deliver(JSON.parse(raw)); } catch { /* ignorar mensajes malformados */ }
    });
  }).catch(() => {});
}

/** Broadcast de invalidación de cache a todos los clientes conectados. */
export function broadcastInvalidate(...queryKeys) {
  const msg = { type: "invalidate", queryKeys };

  // Modo memoria — entrega directa (single-instance)
  _deliver(msg);

  // Si Redis está disponible, publicar también para otras instancias
  if (process.env.REDIS_URL) {
    import("../config/redis.js").then(({ redisPub }) => {
      if (!redisPub._isNoop) {
        redisPub.publish("ntrl:notifications", JSON.stringify(msg)).catch(() => {});
      }
    }).catch(() => {});
  }
}

/** Envia mensaje a un usuario específico. */
export function sendToUser(userId, msg) {
  const entrySet = clients.get(userId);
  if (!entrySet) return;
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const { res } of entrySet) {
    try { res.write(data); } catch { /* cliente desconectado */ }
  }
}

/** Guarda notificación admin en BD y envía SSE solo a admins. */
export async function notifyAdmins(type, message, data = {}) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, message, data) VALUES (NULL, $1, $2, $3)`,
    [type, message, JSON.stringify(data)]
  );
  _deliver({ targetRole: "admin", type, message, data });

  if (process.env.REDIS_URL) {
    import("../config/redis.js").then(({ redisPub }) => {
      if (!redisPub._isNoop) {
        redisPub.publish("ntrl:notifications", JSON.stringify({ targetRole: "admin", type, message, data })).catch(() => {});
      }
    }).catch(() => {});
  }
}

/** Notificación para un usuario específico. */
export async function notify(userId, type, message, data = {}) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, message, data) VALUES ($1, $2, $3, $4)`,
    [userId || null, type, message, JSON.stringify(data)]
  );
  sendToUser(userId, { userId, type, message, data });
}
