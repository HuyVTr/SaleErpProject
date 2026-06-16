import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Lấy biến môi trường bắt buộc:
// - Ở production: thiếu biến => DỪNG server ngay (fail-fast), tránh chạy với secret mặc định dễ đoán.
// - Ở dev/local: nếu thiếu thì dùng giá trị fallback chỉ-dành-cho-dev để tiện chạy thử.
const requireEnv = (key, devFallback) => {
  const value = process.env[key];
  if (value) return value;
  if (isProduction) {
    throw new Error(
      `[CONFIG] Thiếu biến môi trường bắt buộc: ${key}. Hãy đặt nó trong file .env trước khi chạy production.`
    );
  }
  return devFallback;
};

export const env = {
  port: process.env.PORT || 5000,
  jwtSecret: requireEnv("JWT_SECRET", "dev-secret-chi-dung-local"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  jwtRefreshSecret: requireEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-chi-dung-local"),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};
