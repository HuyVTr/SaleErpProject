// Lỗi có kèm HTTP status code, để middleware xử lý lỗi trả về đúng mã
export default class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
