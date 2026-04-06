const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { hashPassword, verifyPassword } = require("../utils/password");

router.get("/me", authenticateToken, (req, res) => {
  const sql = `
    SELECT
      EmployeeID,
      EmployeeCode,
      FullName,
      Email,
      Role,
      AccountStatus
    FROM Employees
    WHERE EmployeeID = ?
    LIMIT 1
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Không thể tải thông tin cá nhân.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    return res.json({
      success: true,
      data: results[0],
    });
  });
});

router.put("/me", authenticateToken, (req, res) => {
  const { fullName, email, currentPassword, newPassword } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ họ tên và email.",
    });
  }

  const checkEmailSql = `
    SELECT EmployeeID
    FROM Employees
    WHERE Email = ? AND EmployeeID <> ?
    LIMIT 1
  `;

  db.query(checkEmailSql, [email, req.user.id], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Profile email check failed:", checkErr);
      return res.status(500).json({
        success: false,
        message: "Lỗi kiểm tra email.",
      });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại.",
      });
    }

    const getUserSql = `
      SELECT EmployeeID, EmployeeCode, FullName, Email, Role, PasswordHash
      FROM Employees
      WHERE EmployeeID = ?
      LIMIT 1
    `;

    db.query(getUserSql, [req.user.id], (findErr, findResults) => {
      if (findErr) {
        console.error("Profile lookup failed:", findErr);
        return res.status(500).json({
          success: false,
          message: "Không thể tải thông tin người dùng.",
        });
      }

      if (findResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng.",
        });
      }

      const user = findResults[0];
      let finalPassword = user.PasswordHash;

      if (newPassword && !currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mật khẩu hiện tại.",
        });
      }

      if (newPassword && !verifyPassword(currentPassword, user.PasswordHash)) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu hiện tại không đúng.",
        });
      }

      if (newPassword) {
        finalPassword = hashPassword(newPassword);
      }

      const updateSql = `
        UPDATE Employees
        SET FullName = ?, Email = ?, PasswordHash = ?
        WHERE EmployeeID = ?
      `;

      db.query(
        updateSql,
        [fullName, email, finalPassword, req.user.id],
        (updateErr) => {
          if (updateErr) {
            console.error("Profile update failed:", updateErr);
            return res.status(500).json({
              success: false,
              message: "Không thể cập nhật thông tin cá nhân.",
            });
          }

          return res.json({
            success: true,
            message: newPassword
              ? "Cập nhật thông tin và đổi mật khẩu thành công."
              : "Cập nhật thông tin cá nhân thành công.",
            user: {
              id: user.EmployeeID,
              employeeCode: user.EmployeeCode,
              fullName,
              email,
              role: user.Role,
            },
          });
        }
      );
    });
  });
});

module.exports = router;
