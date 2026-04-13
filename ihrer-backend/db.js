const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  console.error("Thiếu biến môi trường database.");
}

function buildSslConfig() {
  const mode = (process.env.DB_SSL_MODE || "off").toLowerCase();

  if (mode === "off" || mode === "false" || mode === "disabled") {
    return undefined;
  }

  if (mode === "insecure") {
    return { rejectUnauthorized: false };
  }

  const caPath = process.env.DB_SSL_CA_PATH
    ? path.resolve(process.cwd(), process.env.DB_SSL_CA_PATH)
    : path.resolve(__dirname, "ca.pem");

  if (!fs.existsSync(caPath)) {
    throw new Error(
      `Không tìm thấy file CA cho MySQL SSL tại: ${caPath}. Hãy kiểm tra DB_SSL_CA_PATH hoặc đặt DB_SSL_MODE=off/insecure nếu môi trường không cần xác thực CA.`
    );
  }

  return {
    ca: fs.readFileSync(caPath, "utf8"),
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: buildSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Lỗi kết nối MySQL:", err);
    return;
  }

  connection.release();
  console.log("Kết nối MySQL thành công");
});

module.exports = db;
