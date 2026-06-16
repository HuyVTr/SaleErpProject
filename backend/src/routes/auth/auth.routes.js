import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, getMe, updateMe, changePassword, refreshToken, loginSchema } from "../../controllers/auth/auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { protect } from "../../middlewares/auth.js";

const router = Router();

// Giới hạn số lần đăng nhập theo IP để chống dò mật khẩu (brute-force).
// Tối đa 10 lần thử trong 15 phút; người dùng bình thường không bị ảnh hưởng.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.",
  },
});

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", refreshToken);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.put("/change-password", protect, changePassword);

export default router;

