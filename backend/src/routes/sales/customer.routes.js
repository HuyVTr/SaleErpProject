import { Router } from "express";
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerHistory,
  customerSchema,
} from "../../controllers/sales/customer.controller.js";
import { validate } from "../../middlewares/validate.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Đọc dữ liệu khách hàng (Kế toán 1 và Admin 3, 5 cần đọc để map thông tin lên hóa đơn/báo cáo)
router.get("/", protect, authorize(1, 2, 3, 5), getCustomers);
router.get("/:id", protect, authorize(1, 2, 3, 5), getCustomer);
router.get("/:id/history", protect, authorize(1, 2, 3, 5), getCustomerHistory);
router.get("/:id/activities", protect, authorize(1, 2, 3, 5), getCustomerHistory);

// Chỉ Sales (2) mới được thêm mới, cập nhật hoặc xóa khách hàng
router.post("/", protect, authorize(2), validate(customerSchema), createCustomer);
router.put("/:id", protect, authorize(2), validate(customerSchema), updateCustomer);
router.delete("/:id", protect, authorize(2), deleteCustomer);

export default router;


