const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

router.get("/", authenticateToken, (req, res) => {
  console.log("[GET /resources] query params:", req.query);

  const sql = `
    SELECT
      ResourceID,
      ResourceCode,
      ResourceName,
      ResourceType,
      Capacity,
      ResourceStatus,
      Location,
      Description
    FROM resources
    WHERE IsActive = 1
    ORDER BY ResourceType, ResourceName
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("[GET /resources] SQL error:", err);
      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách phòng/lab.",
      });
    }

    console.log("[GET /resources] result length:", results.length);

    return res.json({
      success: true,
      data: results,
    });
  });
});

module.exports = router;
