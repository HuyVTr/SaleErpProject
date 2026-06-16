import { z } from "zod";
import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const customerSchema = z.object({
  firstName: z.string().min(1, "Tên bắt buộc"),
  lastName: z.string().min(1, "Họ bắt buộc"),
  companyName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email("Email không hợp lệ").optional().nullable(),
  status: z.string().optional(),
  priceListId: z.number().int().optional().nullable(),
});

// GET /api/customers?search=
export const getCustomers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { phoneNumber: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { customerID: "asc" },
  });
  res.json({ success: true, data: customers });
});

// GET /api/customers/:id
export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { customerID: Number(req.params.id) },
    include: { orders: true },
  });
  if (!customer) throw new ApiError(404, "Không tìm thấy khách hàng");
  res.json({ success: true, data: customer });
});

export const createCustomer = asyncHandler(async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Customer"', 'customerID'), coalesce(max("customerID"), 1)) FROM "Customer";`
    );
  } catch (seqErr) {
    console.error("Không thể đồng bộ sequence cho Customer:", seqErr);
  }

  const customer = await prisma.customer.create({ data: req.body });
  res.status(201).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.priceListId !== undefined) {
    data.priceListId = data.priceListId === null ? null : Number(data.priceListId);
  }
  const customer = await prisma.customer.update({
    where: { customerID: Number(req.params.id) },
    data,
  });
  res.json({ success: true, data: customer });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await prisma.customer.delete({ where: { customerID: Number(req.params.id) } });
  res.json({ success: true, message: "Đã xóa khách hàng" });
});

// GET /api/customers/:id/history
export const getCustomerHistory = asyncHandler(async (req, res) => {
  const history = await prisma.activity.findMany({
    where: {
      relatedType: "Customer",
      relatedID: Number(req.params.id),
    },
    orderBy: { activityTime: "desc" },
  });
  res.json({ success: true, data: history });
});


