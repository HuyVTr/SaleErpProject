import { Router } from "express";
import {
  getImportReceipts,
  createImportReceipt,
  getDeliveryHistory,
  createDeliveryHistory,
} from "../../controllers/warehouse/warehouse.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Chỉ Nhân viên kho (4) mới được quản lý kho
router.get("/warehouse/imports", protect, authorize(4), getImportReceipts);
router.post("/warehouse/imports", protect, authorize(4), createImportReceipt);

// Lấy lịch sử giao nhận đơn hàng & cập nhật trạng thái đơn hàng
router.get("/warehouse/delivery-history/:orderID", protect, authorize(4), getDeliveryHistory);
router.post("/warehouse/delivery-history", protect, authorize(4), createDeliveryHistory);

export default router;

