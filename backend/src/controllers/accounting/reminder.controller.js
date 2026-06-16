import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";

// POST /api/reminders/send
export const sendReminder = asyncHandler(async (req, res) => {
  const { invoiceID } = req.body;
  
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceID: Number(invoiceID) },
    include: {
      order: {
        include: { customer: true }
      }
    }
  });

  if (!invoice) throw new ApiError(404, "Không tìm thấy hóa đơn");

  const customerName = invoice.order?.customer?.companyName || "Khách hàng";
  console.log(`[Reminder Service] Đang gửi email nhắc nợ hóa đơn #${invoiceID} tới ${customerName}...`);

  const updatedInvoice = await prisma.invoice.update({
    where: { invoiceID: Number(invoiceID) },
    data: { lastReminderDate: new Date() }
  });

  res.json({ 
    success: true, 
    message: "Gửi nhắc nợ thành công", 
    lastReminderDate: updatedInvoice.lastReminderDate 
  });
});

// POST /api/reminders/batch-send
export const sendBatchReminders = asyncHandler(async (req, res) => {
  const { invoiceIDs } = req.body;

  if (!invoiceIDs || !Array.isArray(invoiceIDs)) {
    throw new ApiError(400, "Danh sách mã hóa đơn không hợp lệ");
  }

  console.log(`[Reminder Service] Đang gửi email nhắc nợ hàng loạt cho ${invoiceIDs.length} hóa đơn:`, invoiceIDs);

  const now = new Date();
  await prisma.invoice.updateMany({
    where: { invoiceID: { in: invoiceIDs.map(Number) } },
    data: { lastReminderDate: now }
  });

  res.json({ success: true, count: invoiceIDs.length, lastReminderDate: now });
});
