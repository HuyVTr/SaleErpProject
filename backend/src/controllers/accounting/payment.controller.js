import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";

// GET /api/payments
export const getPayments = asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    include: {
      invoice: {
        include: {
          order: {
            include: { customer: true }
          }
        }
      }
    },
    orderBy: { paymentID: "desc" }
  });
  res.json({ success: true, data: payments });
});

// POST /api/payments
export const createPayment = asyncHandler(async (req, res) => {
  const { invoiceID, amount, paymentMethod, paymentDate, status = "completed" } = req.body;

  // Kiểm tra hóa đơn tồn tại
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceID: Number(invoiceID) }
  });
  if (!invoice) throw new ApiError(404, "Không tìm thấy hóa đơn tương ứng");

  const payment = await prisma.$transaction(async (tx) => {
    // 1. Tạo phiếu thu (payment record)
    const createdPayment = await tx.payment.create({
      data: {
        invoiceID: Number(invoiceID),
        amount: Number(amount),
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        status
      }
    });

    // 2. Cập nhật số tiền đã thanh toán (paidAmount) trên hóa đơn
    const newPaidAmount = Number(invoice.paidAmount || 0) + Number(amount);
    
    // Tự động tính toán status mới của hóa đơn
    let newStatus = "PARTIAL";
    if (newPaidAmount >= Number(invoice.totalAmount)) {
      newStatus = "PAID";
    }

    await tx.invoice.update({
      where: { invoiceID: Number(invoiceID) },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus
      }
    });

    return createdPayment;
  });

  res.status(201).json({ success: true, data: payment });
});

