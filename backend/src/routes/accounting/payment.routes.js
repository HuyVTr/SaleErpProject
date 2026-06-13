import { Router } from "express";
import { getPayments, createPayment } from "../../controllers/accounting/payment.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Chỉ Kế toán (1) mới được quản lý thanh toán
router.get("/", protect, authorize(1), getPayments);
router.post("/", protect, authorize(1), createPayment);

export default router;

