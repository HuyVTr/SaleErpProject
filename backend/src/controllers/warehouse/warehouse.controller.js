import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import fs from "fs";
import path from "path";

const IMPORTS_FILE_PATH = path.join(process.cwd(), "src", "data", "import_receipts.json");

// Đọc lịch sử từ file JSON
const readImportReceipts = () => {
  try {
    const dir = path.dirname(IMPORTS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(IMPORTS_FILE_PATH)) {
      fs.writeFileSync(IMPORTS_FILE_PATH, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(IMPORTS_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Lỗi đọc file phiếu nhập kho:", err);
    return [];
  }
};

// Ghi lịch sử vào file JSON
const writeImportReceipts = (receipts) => {
  try {
    const dir = path.dirname(IMPORTS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(IMPORTS_FILE_PATH, JSON.stringify(receipts, null, 2), "utf-8");
  } catch (err) {
    console.error("Lỗi ghi file phiếu nhập kho:", err);
  }
};

// GET /api/warehouse/imports
// Lấy lịch sử phiếu nhập kho
export const getImportReceipts = asyncHandler(async (req, res) => {
  const receipts = readImportReceipts();
  res.json(receipts);
});

// POST /api/warehouse/imports
// Tạo phiếu nhập kho và cộng tồn kho
export const createImportReceipt = asyncHandler(async (req, res) => {
  const { items, supplier } = req.body;
  const user = req.user;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Danh sách sản phẩm nhập không hợp lệ");
  }

  // Thực hiện transaction cộng dồn kho sản phẩm
  const result = await prisma.$transaction(async (tx) => {
    const updatedProducts = [];
    for (const item of items) {
      const updated = await tx.product.update({
        where: { productID: Number(item.productId || item.productID) },
        data: {
          stockQuantity: {
            increment: Number(item.quantity)
          }
        }
      });
      updatedProducts.push(updated);
    }
    return updatedProducts;
  });

  // Lưu thông tin phiếu nhập vào file JSON lịch sử
  const receipts = readImportReceipts();
  
  // Tính ID tuần tự NK-001, NK-002... dựa trên các phiếu hiện có bắt đầu bằng NK-
  const maxSeq = receipts.reduce((m, r) => {
    const code = String(r.receiptId || r.id || '');
    if (!code.startsWith('NK-')) return m;
    const numPart = code.replace(/\D/g, '');
    const n = parseInt(numPart, 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const receiptId = `NK-${String(maxSeq + 1).padStart(3, '0')}`;
  
  // Tính tổng giá trị nếu FE không gửi lên hoặc tính lại để đảm bảo chính xác
  const computedTotalValue = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitPrice || 0)), 0);

  const newReceipt = {
    receiptId,
    id: receiptId, // alias để khớp FE
    supplier: supplier || "Nhà cung cấp tự do",
    date: new Date().toISOString(),
    status: "COMPLETED",
    createdBy: req.body.createdBy || user?.fullName || user?.username || user?.email || "Hệ thống",
    totalValue: Number(req.body.totalValue) || computedTotalValue,
    notes: req.body.notes || "",
    items: items.map(it => ({
      productId: Number(it.productId || it.productID),
      productName: it.productName || `Sản phẩm #${it.productId || it.productID}`,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice || 0),
      unit: it.unit || "Cái"
    }))
  };
  receipts.unshift(newReceipt); // Đưa phiếu mới lên đầu
  writeImportReceipts(receipts);

  res.status(201).json({ success: true, data: newReceipt });
});

// POST /api/warehouse/imports/:receiptId/revert
// Hoàn tác phiếu nhập kho và trừ tồn kho
export const revertImportReceipt = asyncHandler(async (req, res) => {
  const { receiptId } = req.params;
  const receipts = readImportReceipts();
  const foundIndex = receipts.findIndex(r => String(r.receiptId) === String(receiptId));

  if (foundIndex === -1) {
    throw new ApiError(404, "Không tìm thấy phiếu nhập kho");
  }

  const receipt = receipts[foundIndex];
  if (receipt.status === "REVERTED") {
    throw new ApiError(400, "Phiếu nhập kho này đã được hoàn tác trước đó");
  }

  // Thực hiện transaction trừ lại số lượng trong kho sản phẩm (Đảo ngược tồn kho)
  await prisma.$transaction(async (tx) => {
    for (const item of receipt.items) {
      // Đọc tồn kho hiện tại để tránh việc trừ âm kho
      const product = await tx.product.findUnique({
        where: { productID: Number(item.productId) }
      });
      if (!product) {
        throw new ApiError(404, `Sản phẩm #${item.productId} không tồn tại`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new ApiError(400, `Không thể hoàn tác. Tồn kho sản phẩm "${product.productName}" hiện tại (${product.stockQuantity}) ít hơn số lượng cần trừ (${item.quantity}).`);
      }

      await tx.product.update({
        where: { productID: Number(item.productId) },
        data: {
          stockQuantity: {
            decrement: Number(item.quantity)
          }
        }
      });
    }
  });

  // Cập nhật trạng thái phiếu nhập kho thành REVERTED
  receipts[foundIndex].status = "REVERTED";
  writeImportReceipts(receipts);

  res.json({ success: true, message: "Hoàn tác phiếu nhập kho thành công" });
});

// GET /api/warehouse/delivery-history/:orderID
// Lấy lịch sử giao nhận đơn hàng
export const getDeliveryHistory = asyncHandler(async (req, res) => {
  const history = await prisma.deliveryStatusHistory.findMany({
    where: { orderID: Number(req.params.orderID) },
    include: { user: true },
    orderBy: { changedAt: "asc" },
  });
  res.json(history);
});

// POST /api/warehouse/delivery-history
// Thêm trạng thái lịch sử giao hàng
export const createDeliveryHistory = asyncHandler(async (req, res) => {
  const { orderID, status, note } = req.body;
  const userID = req.user.userID;

  const VALID_ORDER_STATUS = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "FAILED", "CANCELLED"];
  if (!VALID_ORDER_STATUS.includes(status)) {
    throw new ApiError(400, `Trạng thái đơn hàng không hợp lệ: ${status}`);
  }

  const entry = await prisma.deliveryStatusHistory.create({
    data: {
      orderID: Number(orderID),
      status,
      note,
      changedAt: new Date(),
      userID: Number(userID),
    },
    include: {
      user: true
    }
  });

  // Đồng thời cập nhật trạng thái đơn hàng trong bảng Order
  await prisma.order.update({
    where: { orderID: Number(orderID) },
    data: { orderStatus: status }
  });

  res.status(201).json(entry);
});

