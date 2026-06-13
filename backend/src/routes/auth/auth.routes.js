import { Router } from "express";
import { login, getMe, loginSchema } from "../../controllers/auth/auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { protect } from "../../middlewares/auth.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.get("/me", protect, getMe);

export default router;

