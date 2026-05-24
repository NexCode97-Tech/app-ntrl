import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Token de acceso requerido.", 401, "UNAUTHORIZED");
    }

    const token = authHeader.slice(7);

    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = { id: payload.sub, role: payload.role, area: payload.area };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Token expirado.", 401, "TOKEN_EXPIRED"));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new AppError("Token inválido.", 401, "TOKEN_INVALID"));
    }
    next(err);
  }
}

// Variante para SSE: acepta token via query param ?token=... (EventSource no soporta headers)
export async function requireAuthSSE(req, res, next) {
  try {
    const token = req.query.token;
    if (!token) throw new AppError("Token requerido.", 401, "UNAUTHORIZED");

    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = { id: payload.sub, role: payload.role, area: payload.area };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return next(new AppError("Token expirado.", 401, "TOKEN_EXPIRED"));
    if (err.name === "JsonWebTokenError")  return next(new AppError("Token inválido.", 401, "TOKEN_INVALID"));
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError("No tienes permisos para esta acción.", 403, "FORBIDDEN"));
    }
    next();
  };
}
