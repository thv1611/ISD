const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

router.get("/summary", authenticateToken, (req, res) => {
  const queries = {
    totalResources: `
      SELECT COUNT(*) AS total
      FROM Resources
      WHERE IsActive = 1
    `,
    totalUsers: `
      SELECT COUNT(*) AS total
      FROM Employees
      WHERE AccountStatus = 'Active'
    `,
    totalBooked: `
      SELECT COUNT(*) AS total
      FROM Bookings
      WHERE BookingStatus = 'Đã đặt'
    `,
    totalCancelled: `
      SELECT COUNT(*) AS total
      FROM Bookings
      WHERE BookingStatus = 'Đã hủy'
    `,
  };

  db.query(queries.totalResources, (err1, r1) => {
    if (err1) {
      return res.status(500).json({ success: false, message: "Lỗi tải dashboard." });
    }

    db.query(queries.totalUsers, (err2, r2) => {
      if (err2) {
        return res.status(500).json({ success: false, message: "Lỗi tải dashboard." });
      }

      db.query(queries.totalBooked, (err3, r3) => {
        if (err3) {
          return res.status(500).json({ success: false, message: "Lỗi tải dashboard." });
        }

        db.query(queries.totalCancelled, (err4, r4) => {
          if (err4) {
            return res.status(500).json({ success: false, message: "Lỗi tải dashboard." });
          }

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