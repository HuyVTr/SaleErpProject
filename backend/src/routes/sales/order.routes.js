import { Router } from "express";
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updateOrderPayment,
  getOrderActivities,
  orderSchema,
} from "../../controllers/sales/order.controller.js";
import { validate } from "../../middlewares/validate.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Lấy danh sách đơn hàng & chi tiết đơn hàng (Kế toán 1, Sales 2, Admin 3, 5 và Kho 4 cần đọc)
router.get("/", protect, authorize(1, 2, 3, 4, 5), getOrders);
router.get("/:id", protect, authorize(1, 2, 3, 4, 5), getOrder);
router.get("/:id/activities", protect, authorize(1, 2, 3, 4, 5), getOrderActivities);

// Các thao tác nghiệp vụ chỉnh sửa đơn hàng chỉ dành riêng cho Sales (2)
router.post("/", protect, authorize(2), validate(orderSchema), createOrder);
router.put("/:id/status", protect, authorize(2), updateOrderStatus);
router.put("/:id/payment", protect, authorize(2), updateOrderPayment);

export default router;

