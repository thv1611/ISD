const mysql = require("mysql2");
const fs = require("fs");
require("dotenv").config();

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  console.error("Thiếu biến môi trường database.");
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync("./ca.pem", "utf8"),
  },
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