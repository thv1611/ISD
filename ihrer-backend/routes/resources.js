const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

router.get("/", authenticateToken, (req, res) => {
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
    FROM Resources
    WHERE IsActive = 1
    ORDER BY ResourceType, ResourceName
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách phòng/lab.",
      });
    }

    return res.json({
      success: true,
      data: results,
    });
  });
});

module.exports = router;