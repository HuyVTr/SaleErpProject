import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// helmet: tự động thêm các HTTP header bảo mật (chống clickjacking, sniffing MIME...)
app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (origin === env.clientUrl) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Kiểm tra sức khỏe server
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server đang chạy 🚀" });
});

// Tất cả route nghiệp vụ nằm dưới /api
app.use("/api", routes);

// Xử lý 404 và lỗi (đặt cuối)
app.use(notFound);
app.use(errorHandler);

export default app;
