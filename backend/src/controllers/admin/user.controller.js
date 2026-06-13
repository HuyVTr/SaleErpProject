import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import bcrypt from "bcryptjs";

// GET /api/users
export const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { userID: "asc" },
  });
  res.json(users);
});

// POST /api/users
export const createUser = asyncHandler(async (req, res) => {
  const { lastName, firstName, dateOfBirth, phoneNumber, email, password, address, dept, roleID } = req.body;
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new ApiError(400, "Email đã tồn tại");

  const hashedPassword = await bcrypt.hash(password || "123456", 10);

  const newUser = await prisma.user.create({
    data: {
      lastName,
      firstName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      phoneNumber: phoneNumber || "",
      email,
      password: hashedPassword,
      address,
      dept,
      roleID: Number(roleID),
    },
    include: { role: true }
  });

  res.status(201).json(newUser);
});

// PUT /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const { lastName, firstName, dateOfBirth, phoneNumber, password, address, dept, roleID } = req.body;
  
  const data = {
    lastName,
    firstName,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    phoneNumber,
    address,
    dept,
    roleID: roleID ? Number(roleID) : undefined,
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { userID: Number(req.params.id) },
    data,
    include: { role: true }
  });

  res.json(updatedUser);
});

// GET /api/roles
export const getRoles = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { roleID: "asc" },
  });
  res.json(roles);
});

