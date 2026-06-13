import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";

// GET /api/categories
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.categories.findMany({
    orderBy: { categoryID: "asc" },
  });
  res.json(categories);
});

// GET /api/price-lists
export const getPriceLists = asyncHandler(async (req, res) => {
  const priceLists = await prisma.priceList.findMany({
    orderBy: { priceListID: "asc" },
  });
  res.json(priceLists);
});

// GET /api/price-lists/:id/items
export const getPriceListItems = asyncHandler(async (req, res) => {
  const items = await prisma.priceListItem.findMany({
    where: { priceListID: Number(req.params.id) },
    include: { products: true },
  });
  res.json(items);
});

