import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../../config/prisma.js";
import { env } from "../../config/env.js";
import ApiError from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const signToken = (user) =>
  jwt.sign(
    { userID: user.userID, roleID: user.roleID, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Email hoặc mật khẩu không đúng");
  }

  const { password: _, ...safeUser } = user;
  res.json({ success: true, token: signToken(user), user: safeUser });
});

// GET /api/auth/me  (cần đăng nhập)
export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { userID: req.user.userID },
    include: { role: true },
  });
  if (!user) throw new ApiError(404, "Không tìm thấy người dùng");
  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});
