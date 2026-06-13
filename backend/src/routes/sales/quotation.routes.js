import { Router } from "express";
import {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotationStatus,
  convertQuotationToOrder,
  getQuotationActivities,
} from "../../controllers/sales/quotation.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Chỉ Sales (2) mới được quản lý báo giá
router.get("/", protect, authorize(2), getQuotations);
router.get("/:id", protect, authorize(2), getQuotation);
router.get("/:id/activities", protect, authorize(2), getQuotationActivities);
router.post("/", protect, authorize(2), createQuotation);
router.put("/:id/status", protect, authorize(2), updateQuotationStatus);
router.post("/:id/convert", protect, authorize(2), convertQuotationToOrder);

export default router;

