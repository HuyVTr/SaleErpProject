import { Router } from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../controllers/admin/category.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// GET có thể cho phép kế toán, sales, admin và kho truy cập (1, 2, 3, 4, 5)
router.get("/", protect, authorize(1, 2, 3, 4, 5), getCategories);

// POST, PUT, DELETE chỉ cho phép Admin (3, 5)
router.post("/", protect, authorize(3, 5), createCategory);
router.put("/:id", protect, authorize(3, 5), updateCategory);
router.delete("/:id", protect, authorize(3, 5), deleteCategory);

export default router;
