import { Router } from "express";
import {
  getCategories,
  getPriceLists,
  getPriceListItems,
} from "../../controllers/sales/priceAndCategory.controller.js";
import { protect } from "../../middlewares/auth.js";

const router = Router();

// Lấy danh mục sản phẩm
router.get("/categories", protect, getCategories);

// Lấy bảng giá & chi tiết bảng giá
router.get("/price-lists", protect, getPriceLists);
router.get("/price-lists/:id/items", protect, getPriceListItems);

export default router;

