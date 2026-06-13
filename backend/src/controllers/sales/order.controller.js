import { z } from "zod";
import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const orderSchema = z.object({
  customerID: z.number().int(),
  paymentTerm: z.string().optional(),
  paymentMethod: z.enum(["CASH", "TRANSFER"]).optional(),
  taxAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  items: z
    .array(
      z.object({
        productID: z.number().int(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
        discount: z.number().nonnegative().optional(),
      })
    )
    .min(1, "Đơn hàng phải có ít nhất 1 sản phẩm"),
});

// GET /api/orders
export const getOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { customer: true, user: true, items: { include: { product: true } } },
    orderBy: { orderID: "desc" },
  });
  res.json({ success: true, data: orders });
});

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderID: Number(req.params.id) },
    include: {
      customer: true,
      user: true,
      items: { include: { product: true } },
      invoices: true,
    },
  });
  if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng");
  res.json({ success: true, data: order });
});

// POST /api/orders
// Tạo đơn + chi tiết + trừ kho trong MỘT transaction.
// Nếu bất kỳ bước nào lỗi (vd: hết hàng) -> rollback toàn bộ.
export const createOrder = asyncHandler(async (req, res) => {
  const { customerID, items, paymentTerm, paymentMethod, taxAmount = 0, discountAmount = 0 } = req.body;

  const order = await prisma.$transaction(async (tx) => {
    // 1. Kiểm tra tồn kho từng sản phẩm
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { productID: item.productID } });
      if (!product) throw new ApiError(404, `Sản phẩm #${item.productID} không tồn tại`);
      if (product.stockQuantity < item.quantity) {
        throw new ApiError(400, `Sản phẩm '${product.productName}' không đủ tồn kho (còn ${product.stockQuantity})`);
      }
    }

    // 2. Tính tổng tiền hàng
    const subtotal = items.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity - (i.discount || 0),
      0
    );
    const totalAmount = subtotal + taxAmount - discountAmount;

    // 3. Tạo đơn + chi tiết
    const created = await tx.order.create({
      data: {
        customerID,
        userID: req.user.userID, // người tạo lấy từ token
        paymentTerm,
        paymentMethod,
        taxAmount,
        discountAmount,
        totalAmount,
        items: {
          create: items.map((i) => ({
            productID: i.productID,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount || 0,
          })),
        },
      },
      include: { items: true },
    });

    // 4. Trừ kho
    for (const item of items) {
      await tx.product.update({
        where: { productID: item.productID },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    return created;
  });

  res.status(201).json({ success: true, data: order });
});

// PUT /api/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await prisma.order.update({
    where: { orderID: Number(req.params.id) },
    data: { orderStatus: status },
  });
  res.json({ success: true, data: order });
});

// PUT /api/orders/:id/payment
export const updateOrderPayment = asyncHandler(async (req, res) => {
  const { paidAmount } = req.body;
  const order = await prisma.order.update({
    where: { orderID: Number(req.params.id) },
    data: { paidAmount: Number(paidAmount) },
  });
  res.json({ success: true, data: order });
});

// GET /api/orders/:id/activities
export const getOrderActivities = asyncHandler(async (req, res) => {
  const history = await prisma.activity.findMany({
    where: {
      relatedType: "Order",
      relatedID: Number(req.params.id),
    },
    orderBy: { activityTime: "desc" },
  });
  res.json({ success: true, data: history });
});


