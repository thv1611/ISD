const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

router.get("/summary", authenticateToken, (req, res) => {
  console.log("[GET /dashboard/summary] query params:", req.query);

  const queries = {
    totalResources: `
      SELECT COUNT(*) AS total
      FROM resources
      WHERE IsActive = 1
    `,
    totalUsers: `
      SELECT COUNT(*) AS total
      FROM employees
      WHERE AccountStatus = 'Active'
    `,
    totalBooked: `
      SELECT COUNT(*) AS total
      FROM bookings
      WHERE BookingStatus = 'Đã đặt'
    `,
    totalCancelled: `
      SELECT COUNT(*) AS total
      FROM bookings
      WHERE BookingStatus = 'Đã hủy'
    `,
  };

  db.query(queries.totalResources, (err1, r1) => {
    if (err1) {
      console.error("[GET /dashboard/summary] totalResources SQL error:", err1);
      return res.status(500).json({ success: false, message: "Lỗi tải dashboard." });
    }

    db.query(queries.totalUsers, (err2, r2) => {
      if (err2) {
        console.error("[GET /dashboard/summary] totalUsers SQL error:", err2);
        return res.status(500).json({ success: false, message: "Lỗi tải dashboard." });
      }

      db.query(queries.totalBooked, (err3, r3) => {
        if (err3) {
          console.error("[GET /dashboard/summary] totalBooked SQL error:", err3);
          return res.status(500).json({ success: false, message: "Lỗi tải dashboard." });
        }

        db.query(queries.totalCancelled, (err4, r4) => {
          if (err4) {
            console.error("[GET /dashboard/summary] totalCancelled SQL error:", err4);
            return res.status(500).json({ success: false, message: "Lỗi tải dashboard." });
          }

          console.log("[GET /dashboard/summary] result lengths:", {
            totalResources: r1.length,
            totalUsers: r2.length,
            totalBooked: r3.length,
            totalCancelled: r4.length,
          });

          return res.json({
            success: true,
            data: {
              totalResources: r1[0].total,
              totalUsers: r2[0].total,
              totalBooked: r3[0].total,
              totalCancelled: r4[0].total,
            },
          });
        });
      });
    });
  });
});

module.exports = router;
