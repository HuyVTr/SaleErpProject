import { z } from "zod";
import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const productSchema = z.object({
  productName: z.string().min(1, "Tên sản phẩm bắt buộc"),
  salePrice: z.number().nonnegative("Giá phải >= 0"),
  cost: z.number().nonnegative().optional().nullable(),
  unit: z.string().optional(),
  description: z.string().optional().nullable(),
  imageURL: z.string().optional().nullable(),
  status: z.string().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  categoryID: z.number().int("Category ID phải là số nguyên"),
});

// GET /api/products?search=&categoryID=&page=&limit=
export const getProducts = asyncHandler(async (req, res) => {
  const { search, categoryID, page: pageQuery, limit: limitQuery } = req.query;

  const where = {
    ...(search && { productName: { contains: search, mode: "insensitive" } }),
    ...(categoryID && { categoryID: Number(categoryID) }),
  };

  // Nếu không truyền page/limit, giữ hành vi cũ: trả toàn bộ danh sách
  if (!pageQuery && !limitQuery) {
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { productID: "asc" },
    });
    return res.json({ success: true, data: products });
  }

  const page = Math.max(1, Number(pageQuery) || 1);
  const limit = Math.max(1, Number(limitQuery) || 20);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { productID: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/products/:id
export const getProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { productID: Number(req.params.id) },
    include: { category: true },
  });
  if (!product) throw new ApiError(404, "Không tìm thấy sản phẩm");
  res.json({ success: true, data: product });
});

// POST /api/products
export const createProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.create({ data: req.body });
  res.status(201).json({ success: true, data: product });
});

// PUT /api/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.update({
    where: { productID: Number(req.params.id) },
    data: req.body,
  });
  res.json({ success: true, data: product });
});

// DELETE /api/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
  await prisma.product.delete({ where: { productID: Number(req.params.id) } });
  res.json({ success: true, message: "Đã xóa sản phẩm" });
});

// GET /api/products/:id/activities
export const getProductActivities = asyncHandler(async (req, res) => {
  const history = await prisma.activity.findMany({
    where: {
      relatedType: "Product",
      relatedID: Number(req.params.id),
    },
    orderBy: { activityTime: "desc" },
  });
  res.json({ success: true, data: history });
});

