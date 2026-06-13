import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// GET /api/notifications
// Lấy danh sách thông báo phù hợp với vai trò của user đăng nhập
export const getNotifications = asyncHandler(async (req, res) => {
  const userRole = req.user.roleID;

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Lọc thông báo theo vai trò (tương tự logic trên FE)
  const filtered = notifications.filter(notif => {
    if (!notif.roleIds || notif.roleIds.length === 0) return true;
    return notif.roleIds.includes(userRole);
  });

  res.json(filtered);
});

// GET /api/notifications/unread-count
// Đếm số lượng thông báo chưa đọc
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userRole = req.user.roleID;

  const notifications = await prisma.notification.findMany({
    where: { isRead: false },
  });

  const filtered = notifications.filter(notif => {
    if (!notif.roleIds || notif.roleIds.length === 0) return true;
    return notif.roleIds.includes(userRole);
  });

  res.json({ count: filtered.length });
});

// PATCH /api/notifications/:id/read
// Đánh dấu một thông báo là đã đọc
export const markAsRead = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const notification = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  res.json(notification);
});

// PATCH /api/notifications/read-all
// Đánh dấu tất cả thông báo của vai trò hiện tại là đã đọc
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userRole = req.user.roleID;

  const notifications = await prisma.notification.findMany({
    where: { isRead: false },
  });

  const targetNotifs = notifications.filter(notif => {
    if (!notif.roleIds || notif.roleIds.length === 0) return true;
    return notif.roleIds.includes(userRole);
  });

  const ids = targetNotifs.map(n => n.id);

  await prisma.notification.updateMany({
    where: {
      id: { in: ids }
    },
    data: { isRead: true }
  });

  res.json({ success: true });
});

