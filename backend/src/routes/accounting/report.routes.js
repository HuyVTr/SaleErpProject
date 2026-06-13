import { Router } from "express";
import {
  getRevenueReport,
  getDebtReport,
  getTopProducts,
  getSalesPerformanceReport,
} from "../../controllers/accounting/report.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Kế toán (1) mới được truy cập báo cáo
router.get("/revenue", protect, authorize(1), getRevenueReport);
router.get("/debt", protect, authorize(1), getDebtReport);
router.get("/top-products", protect, authorize(1), getTopProducts);
router.get("/sales-performance", protect, authorize(1), getSalesPerformanceReport);

export default router;

