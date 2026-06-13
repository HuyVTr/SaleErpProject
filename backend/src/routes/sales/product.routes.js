import { Router } from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductActivities,
  productSchema,
} from "../../controllers/sales/product.controller.js";
import { validate } from "../../middlewares/validate.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Ai đăng nhập cũng xem được
router.get("/", protect, getProducts);
router.get("/:id", protect, getProduct);
router.get("/:id/activities", protect, getProductActivities);

// Chỉ Admin (3) và Super Admin (5) được thêm/sửa/xóa
router.post("/", protect, authorize(3, 5), validate(productSchema), createProduct);
router.put("/:id", protect, authorize(3, 5), validate(productSchema), updateProduct);
router.delete("/:id", protect, authorize(3, 5), deleteProduct);

export default router;

