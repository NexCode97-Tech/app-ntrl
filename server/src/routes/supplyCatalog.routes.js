import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/supplyCatalog.controller.js";

const router = Router();
router.use(requireAuth, moderateLimiter);

// Catálogo de insumos
router.get("/",               ctrl.list);
router.get("/all",            ctrl.listAll);
router.post("/",              ctrl.create);
router.put("/:id",            ctrl.update);
router.delete("/:id",         ctrl.remove);

// BOM: materiales por producto
router.get("/product/:productId/materials",  ctrl.getMaterials);
router.post("/product/:productId/materials", ctrl.addMaterial);
router.put("/materials/:id",                 ctrl.updateMaterial);
router.delete("/materials/:id",              ctrl.deleteMaterial);

export default router;
