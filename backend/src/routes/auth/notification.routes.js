import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationDetail,
  getNotificationExtended,
} from "../../controllers/auth/notification.controller.js";
import { protect } from "../../middlewares/auth.js";

const router = Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.get("/:id", protect, getNotificationDetail);
router.get("/:id/extended", protect, getNotificationExtended);
router.patch("/:id/read", protect, markAsRead);
router.patch("/read-all", protect, markAllAsRead);

export default router;

