import ApiError from "../utils/ApiError.js";

// Route không tồn tại
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Không tìm thấy đường dẫn: ${req.originalUrl}`));
};

// Middleware xử lý lỗi tập trung — phải đặt CUỐI CÙNG
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Lỗi máy chủ nội bộ";

  // Lỗi trùng dữ liệu unique của Prisma
  if (err.code === "P2002") {
    statusCode = 409;
    message = `Giá trị '${err.meta?.target}' đã tồn tại`;
  }
  // Bản ghi không tồn tại
  if (err.code === "P2025") {
    statusCode = 404;
    message = "Không tìm thấy bản ghi";
  }

  if (statusCode === 500) console.error(err);

  res.status(statusCode).json({ success: false, message });
};
