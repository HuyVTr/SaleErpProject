import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";

// GET /api/quotations
export const getQuotations = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const quotations = await prisma.quotation.findMany({
    where: {
      ...(search && {
        customer: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ]
        }
      })
    },
    include: {
      customer: true,
      user: true,
    },
    orderBy: { quotationID: "desc" },
  });
  res.json({ success: true, data: quotations });
});

// GET /api/quotations/:id
export const getQuotation = asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({
    where: { quotationID: Number(req.params.id) },
    include: {
      customer: true,
      user: true,
      items: {
        include: { product: true }
      }
    },
  });
  if (!quotation) throw new ApiError(404, "Không tìm thấy báo giá");
  res.json(quotation);
});

// POST /api/quotations
export const createQuotation = asyncHandler(async (req, res) => {
  const { customerID, totalAmount, items } = req.body;
  const userID = req.user.userID;

  const quotation = await prisma.quotation.create({
    data: {
      customerID: Number(customerID),
      userID: Number(userID),
      totalAmount: Number(totalAmount),
      quotationStatus: "PENDING",
      items: {
        create: items.map(item => ({
          productID: Number(item.productID),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount || 0),
        }))
      }
    },
    include: {
      items: true
    }
  });

  res.status(201).json(quotation);
});

// PUT /api/quotations/:id/status
export const updateQuotationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const quotation = await prisma.quotation.update({
    where: { quotationID: Number(req.params.id) },
    data: { quotationStatus: status },
  });
  res.json(quotation);
});

// POST /api/quotations/:id/convert
export const convertQuotationToOrder = asyncHandler(async (req, res) => {
  const quotationID = Number(req.params.id);
  
  const quotation = await prisma.quotation.findUnique({
    where: { quotationID },
    include: { items: true }
  });

  if (!quotation) throw new ApiError(404, "Không tìm thấy báo giá");
  if (quotation.quotationStatus !== "APPROVED") {
    throw new ApiError(400, "Chỉ báo giá đã duyệt (APPROVED) mới có thể chuyển thành đơn hàng");
  }

  // Tạo Đơn hàng từ Báo giá
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        customerID: quotation.customerID,
        userID: quotation.userID,
        totalAmount: quotation.totalAmount,
        orderStatus: "PENDING",
        items: {
          create: quotation.items.map(item => ({
            productID: item.productID,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
          }))
        }
      }
    });

    // Cập nhật link báo giá trỏ tới đơn hàng vừa tạo
    await tx.quotation.update({
      where: { quotationID },
      data: { orderID: newOrder.orderID }
    });

    return newOrder;
  });

  res.json({ success: true, data: order });
});

// GET /api/quotations/:id/activities
export const getQuotationActivities = asyncHandler(async (req, res) => {
  const history = await prisma.activity.findMany({
    where: {
      relatedType: "Quotation",
      relatedID: Number(req.params.id),
    },
    orderBy: { activityTime: "desc" },
  });
  res.json({ success: true, data: history });
});

