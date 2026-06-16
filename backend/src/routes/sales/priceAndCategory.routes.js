import { Router } from "express";
import {
  getPriceLists,
  getPriceListItems,
} from "../../controllers/sales/priceAndCategory.controller.js";
import { protect } from "../../middlewares/auth.js";

const router = Router();

// Lấy bảng giá & chi tiết bảng giá
router.get("/price-lists", protect, getPriceLists);
router.get("/price-lists/:id/items", protect, getPriceListItems);

export default router;

