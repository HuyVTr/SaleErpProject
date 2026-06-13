import { Router } from "express";
import { getDashboardStats } from "../../controllers/accounting/report.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Lấy thống kê dashboard bán hàng
router.get("/dashboard/stats", protect, authorize(2), getDashboardStats);

export default router;

