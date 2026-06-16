import { Router } from "express";
import {
  getUsers,
  createUser,
  updateUser,
  getRoles,
} from "../../controllers/admin/user.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Quản trị viên (3) & Super Admin (5) quản lý nhân sự
router.get("/users", protect, authorize(3, 5), getUsers);
router.post("/users", protect, authorize(5), createUser); // Chỉ Super Admin tạo tài khoản mới
router.put("/users/:id", protect, authorize(3, 5), updateUser); // Super Admin và Admin cập nhật tài khoản

// Lấy danh sách Roles
router.get("/roles", protect, getRoles);

export default router;

