// Bọc controller async để tự động chuyển lỗi sang middleware xử lý lỗi
// (khỏi phải viết try/catch ở mọi nơi)
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
