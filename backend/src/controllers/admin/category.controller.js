import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// GET /api/categories
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.categories.findMany({
    orderBy: { categoryID: "asc" },
  });
  res.json(categories);
});

// POST /api/categories
export const createCategory = asyncHandler(async (req, res) => {
  const { categoryName, icon, parentCategoryID, status } = req.body;
  
  // Đồng bộ sequence ID của Categories trong Postgres
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Categories"', 'categoryID'), coalesce(max("categoryID"), 1)) FROM "Categories";`);
  } catch (seqErr) {
    console.error("Không thể đồng bộ sequence cho Categories:", seqErr);
  }

  const category = await prisma.categories.create({
    data: {
      categoryName,
      icon,
      parentCategoryID: parentCategoryID ? Number(parentCategoryID) : null,
      status,
    },
  });
  res.status(201).json(category);
});

// PUT /api/categories/:id
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { categoryName, icon, parentCategoryID, status } = req.body;
  const category = await prisma.categories.update({
    where: { categoryID: Number(id) },
    data: {
      categoryName,
      icon,
      parentCategoryID: parentCategoryID !== undefined ? (parentCategoryID ? Number(parentCategoryID) : null) : undefined,
      status,
    },
  });
  res.json(category);
});

// DELETE /api/categories/:id
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.categories.delete({
    where: { categoryID: Number(id) },
  });
  res.json({ success: true, message: "Đã xóa danh mục" });
});
