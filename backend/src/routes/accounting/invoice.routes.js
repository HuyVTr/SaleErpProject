import { Router } from "express";
import { getInvoices, getInvoice, createInvoice } from "../../controllers/accounting/invoice.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Chỉ Kế toán (1) mới được quản lý hóa đơn
router.get("/", protect, authorize(1), getInvoices);
router.get("/:id", protect, authorize(1), getInvoice);
router.post("/", protect, authorize(1), createInvoice);

export default router;

