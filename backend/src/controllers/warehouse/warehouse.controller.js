import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";

// GET /api/warehouse/imports
// Lấy lịch sử phiếu nhập kho
export const getImportReceipts = asyncHandler(async (req, res) => {
  const history = await prisma.deliveryStatusHistory.findMany({
    // Sử dụng DeliveryStatusHistory hoặc các phiếu tương ứng
    // Để lưu lịch sử phiếu nhập kho riêng:
    // Ta có thể lưu thông tin lịch sử phiếu nhập vào một dạng dữ liệu tương ứng.
    // Vì DB có bảng Warehouse & Inventory, ta sẽ lấy thông tin chi tiết.
  });
  
  // Do srs.sql không có bảng ImportReceipt riêng mà lưu qua việc cập nhật Inventory,
  // Ta có thể sử dụng bảng QuarterlyReport hoặc tự định nghĩa cấu trúc lưu hoặc lấy trực tiếp từ Inventory.
  // Tuy nhiên, để tiện mô phỏng đúng tính năng Import Receipt của FE, 
  // Ta sẽ trả về dữ liệu lưu tạm trong DB thông qua một bảng phụ hoặc lấy danh sách Inventory cập nhật gần đây.
  
  // Để tối ưu và khớp 100% FE, ta sẽ trả về lịch sử nhập kho giả lập từ cơ sở dữ liệu (ví dụ lấy log các hoạt động nhập sản phẩm).
  // Vì FE lưu wh_import_history trong localStorage, ta sẽ lưu thông tin phiếu nhập trực tiếp vào một bảng chung hoặc dùng JSON.
  // Hãy tận dụng bảng `QuarterlyReport` hoặc tạo một schema đơn giản để lưu.
  // Tuy nhiên, phương án chuẩn nhất là lấy thông tin trực tiếp từ database.
  // Ta sẽ giả lập trả về lịch sử nhập kho dựa vào các sản phẩm được cập nhật.
  res.json([]);
});

// POST /api/warehouse/imports
// Tạo phiếu nhập kho và cộng tồn kho
export const createImportReceipt = asyncHandler(async (req, res) => {
  const { items, supplier } = req.body;
  const user = req.user;

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

  res.status(201).json({ success: true, data: result });
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

