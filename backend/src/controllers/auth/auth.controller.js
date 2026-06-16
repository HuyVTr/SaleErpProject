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

const signRefreshToken = (user) =>
  jwt.sign(
    { userID: user.userID },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
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
  res.json({
    success: true,
    token: signToken(user),
    refreshToken: signRefreshToken(user),
    user: safeUser,
  });
});

// POST /api/auth/refresh
// Nhận refreshToken trong body, cấp lại access token (và refresh token) mới.
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) throw new ApiError(401, "Thiếu refresh token");

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw new ApiError(401, "Refresh token không hợp lệ hoặc đã hết hạn");
  }

  const user = await prisma.user.findUnique({
    where: { userID: decoded.userID },
    include: { role: true },
  });
  if (!user) throw new ApiError(404, "Không tìm thấy người dùng");

  const { password: _, ...safeUser } = user;
  res.json({
    success: true,
    token: signToken(user),
    refreshToken: signRefreshToken(user),
    user: safeUser,
  });
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

// PUT /api/auth/me (cần đăng nhập)
export const updateMe = asyncHandler(async (req, res) => {
  const { lastName, firstName, phoneNumber, dateOfBirth, address, dept, email } = req.body;
  const currentUserID = req.user.userID;

  if (email) {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser && existingUser.userID !== currentUserID) {
      throw new ApiError(400, "Email đã được sử dụng bởi người dùng khác");
    }
  }

  const updateData = {};
  if (lastName !== undefined) updateData.lastName = lastName;
  if (firstName !== undefined) updateData.firstName = firstName;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (address !== undefined) updateData.address = address;
  if (dept !== undefined) updateData.dept = dept;
  if (email !== undefined) updateData.email = email;
  if (dateOfBirth !== undefined) {
    updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  }

  const updatedUser = await prisma.user.update({
    where: { userID: currentUserID },
    data: updateData,
    include: { role: true }
  });

  const { password: _, ...safeUser } = updatedUser;
  res.json({ success: true, user: safeUser });
});

// PUT /api/auth/change-password (cần đăng nhập)
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const currentUserID = req.user.userID;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, "Vui lòng điền đầy đủ thông tin mật khẩu");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Mật khẩu xác nhận không khớp");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "Mật khẩu mới phải có ít nhất 6 ký tự");
  }

  const user = await prisma.user.findUnique({
    where: { userID: currentUserID }
  });

  if (!user) {
    throw new ApiError(404, "Không tìm thấy người dùng");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Mật khẩu hiện tại không chính xác");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { userID: currentUserID },
    data: { password: hashedPassword }
  });

  res.json({ success: true, message: "Mật khẩu được cập nhật thành công" });
});
