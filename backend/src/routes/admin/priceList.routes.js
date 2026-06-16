import { Router } from "express";
import {
  createPriceList,
  updatePriceList,
  savePriceListItems,
} from "../../controllers/admin/priceList.controller.js";
import { protect } from "../../middlewares/auth.js";

const router = Router();

router.post("/", protect, createPriceList);
router.put("/:id", protect, updatePriceList);
router.put("/:id/items", protect, savePriceListItems);

export default router;
