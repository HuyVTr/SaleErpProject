import ApiError from "../utils/ApiError.js";

// Kiểm tra req.body theo schema Zod. Dùng: validate(schema)
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join("; ");
    return next(new ApiError(400, msg));
  }
  req.body = result.data;
  next();
};
