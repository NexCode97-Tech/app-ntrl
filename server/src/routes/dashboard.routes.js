import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { permissiveLimiter, moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/dashboard.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/",                    requireRole("admin"), permissiveLimiter, ctrl.getSummary);
router.get("/range",               requireRole("admin"), permissiveLimiter, ctrl.getDateRangeSummary);
router.get("/history",             requireRole("admin"), permissiveLimiter, ctrl.getMonthlyHistory);
router.get("/upcoming-deliveries", requireRole("admin","vendedor"), permissiveLimiter, ctrl.getUpcomingDeliveries);
router.get("/top-customers",       requireRole("admin","vendedor"), permissiveLimiter, ctrl.getTopCustomers);
router.get("/sport-by-month",      requireRole("admin","vendedor"), permissiveLimiter, ctrl.getSportByMonth);
router.get("/gender-by-month",     requireRole("admin","vendedor"), permissiveLimiter, ctrl.getGenderByMonth);
router.get("/geo-by-month",        requireRole("admin","vendedor"), permissiveLimiter, ctrl.getGeoByMonth);
router.get("/top-products",        requireRole("admin","vendedor"), permissiveLimiter, ctrl.getTopProducts);
router.get("/pending-balances",    requireRole("admin","vendedor"), permissiveLimiter, ctrl.getPendingBalances);
router.delete("/cache",            requireRole("admin"), moderateLimiter,   ctrl.invalidateCache);

export default router;
