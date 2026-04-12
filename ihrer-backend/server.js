const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const resourceRoutes = require("./routes/resources");
const bookingRoutes = require("./routes/bookings");
const userRoutes = require("./routes/users");
const profileRoutes = require("./routes/profile");

const app = express();

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://isd-web.vercel.app",
]);

const configuredFrontendOrigin = normalizeOrigin(process.env.FRONTEND_URL);
if (configuredFrontendOrigin) {
  allowedOrigins.add(configuredFrontendOrigin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use((req, _res, next) => {
  req.requestStartedAt = Date.now();
  next();
});

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "ISD backend is running.",
  });
});

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/resources", resourceRoutes);
app.use("/bookings", bookingRoutes);
app.use("/users", userRoutes);
app.use("/profile", profileRoutes);

app.use((err, req, res, _next) => {
  console.error(
    `Unhandled error on ${req.method} ${req.originalUrl} after ${Date.now() - (req.requestStartedAt || Date.now())}ms:`,
    err
  );

  res.status(500).json({
    success: false,
    message: "Lỗi máy chủ. Vui lòng thử lại sau.",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
