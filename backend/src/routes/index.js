import { Router } from "express";
import authRoutes from "./auth/auth.routes.js";
import productRoutes from "./sales/product.routes.js";
import customerRoutes from "./sales/customer.routes.js";
import orderRoutes from "./sales/order.routes.js";
import priceAndCategoryRoutes from "./sales/priceAndCategory.routes.js";
import quotationRoutes from "./sales/quotation.routes.js";
import salesRoutes from "./sales/sales.routes.js";
import reportRoutes from "./accounting/report.routes.js";
import invoiceRoutes from "./accounting/invoice.routes.js";
import paymentRoutes from "./accounting/payment.routes.js";
import reminderRoutes from "./accounting/reminder.routes.js";
import userRoutes from "./admin/user.routes.js";
import priceListRoutes from "./admin/priceList.routes.js";
import categoryRoutes from "./admin/category.routes.js";
import warehouseRoutes from "./warehouse/warehouse.routes.js";
import notificationRoutes from "./auth/notification.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/customers", customerRoutes);
router.use("/orders", orderRoutes);
router.use("/price-lists", priceListRoutes); // đăng ký API ghi bảng giá thuộc Admin
router.use("/categories", categoryRoutes); // đăng ký API danh mục thuộc Admin
router.use("/", priceAndCategoryRoutes); // đăng ký trực tiếp /categories và /price-lists (chỉ còn các API đọc của Sales)
router.use("/quotations", quotationRoutes);
router.use("/reports", reportRoutes);
router.use("/sales", salesRoutes); // đăng ký API sales dashboard
router.use("/invoices", invoiceRoutes); // đăng ký API hóa đơn
router.use("/payments", paymentRoutes); // đăng ký API thanh toán
router.use("/reminders", reminderRoutes); // đăng ký API nhắc nợ
router.use("/", userRoutes); // đăng ký /users và /roles
router.use("/", warehouseRoutes); // đăng ký các API kho
router.use("/notifications", notificationRoutes); // đăng ký API thông báo

export default router;


