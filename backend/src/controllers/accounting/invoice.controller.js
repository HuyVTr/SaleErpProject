import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";

// GET /api/invoices
export const getInvoices = asyncHandler(async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    include: {
      order: {
        include: { 
          customer: true,
          items: {
            include: { product: true }
          }
        }
      },
      user: true,
      payments: true
    },
    orderBy: { invoiceID: "desc" }
  });
  res.json({ success: true, data: invoices });
});

// GET /api/invoices/:id
export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceID: Number(req.params.id) },
    include: {
      order: {
        include: { 
          customer: true,
          items: {
            include: { product: true }
          }
        }
      },
      user: true,
      payments: true
    }
  });
  if (!invoice) throw new ApiError(404, "Không tìm thấy hóa đơn");
  res.json({ success: true, data: invoice });
});

// POST /api/invoices
export const createInvoice = asyncHandler(async (req, res) => {
  const { orderID, dueDate, totalAmount, paidAmount = 0, status = "PENDING" } = req.body;
  const userID = req.user.userID;

  // Kiểm tra đơn hàng tồn tại
  const order = await prisma.order.findUnique({
    where: { orderID: Number(orderID) }
  });
  if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng tương ứng");

  const invoice = await prisma.invoice.create({
    data: {
      orderID: Number(orderID),
      userID: Number(userID),
      dueDate: dueDate ? new Date(dueDate) : null,
      totalAmount: totalAmount ? Number(totalAmount) : order.totalAmount,
      paidAmount: Number(paidAmount),
      status
    },
    include: {
      order: { 
        include: { 
          customer: true,
          items: {
            include: { product: true }
          }
        } 
      }
    }
  });

  res.status(201).json({ success: true, data: invoice });
});

