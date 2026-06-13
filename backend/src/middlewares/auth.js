import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import ApiError from "../utils/ApiError.js";

// Kiểm tra JWT trong header Authorization: Bearer <token>
// Nếu hợp lệ, gắn thông tin user vào req.user
export const protect = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, "Chưa đăng nhập, thiếu token"));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded; // { userID, roleID, email }
    next();
  } catch {
    next(new ApiError(401, "Token không hợp lệ hoặc đã hết hạn"));
  }
};

// Chỉ cho phép một số roleID nhất định truy cập
// Ví dụ: authorize(3, 5) => chỉ Quản trị viên & Super Admin
export const authorize = (...roleIDs) => (req, res, next) => {
  if (!req.user || !roleIDs.includes(req.user.roleID)) {
    return next(new ApiError(403, "Bạn không có quyền thực hiện thao tác này"));
  }
  next();
};
