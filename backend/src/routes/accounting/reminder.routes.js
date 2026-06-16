import { Router } from "express";
import { sendReminder, sendBatchReminders } from "../../controllers/accounting/reminder.controller.js";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

// Chỉ Kế toán (1) mới được thực hiện chức năng nhắc nợ
router.post("/send", protect, authorize(1), sendReminder);
router.post("/batch-send", protect, authorize(1), sendBatchReminders);

export default router;
