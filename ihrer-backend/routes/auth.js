const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "ihrer_super_secret_key_change_me";
const JWT_EXPIRES_IN = "8h";

router.post("/login", (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier && !password) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập Email/Mã nhân viên và mật khẩu.",
    });
  }

  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập Email hoặc Mã nhân viên.",
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập mật khẩu.",
    });
  }

  const sql = `
    SELECT
      EmployeeID,
      EmployeeCode,
      FullName,
      Email,
      PasswordHash,
      Role,
      AccountStatus,
      FailedLoginAttempts
    FROM Employees
    WHERE Email = ? OR EmployeeCode = ?
    LIMIT 1
  `;

  db.query(sql, [identifier.trim(), identifier.trim()], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ. Vui lòng thử lại sau.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email hoặc Mã nhân viên không tồn tại.",
      });
    }

    const user = results[0];

    if (user.AccountStatus === "Locked") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
      });
    }

    if (user.PasswordHash !== password) {
      const newAttempts = Number(user.FailedLoginAttempts || 0) + 1;
      const willLock = newAttempts >= 5;

      db.query(
        `
          UPDATE Employees
          SET FailedLoginAttempts = ?, AccountStatus = ?
          WHERE EmployeeID = ?
        `,
        [newAttempts, willLock ? "Locked" : "Active", user.EmployeeID],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({
              success: false,
              message: "Lỗi cập nhật trạng thái đăng nhập.",
            });
          }

          if (willLock) {
            return res.status(403).json({
              success: false,
              message: "Bạn đã nhập sai mật khẩu 5 lần. Tài khoản đã bị khóa.",
            });
          }

          return res.status(401).json({
            success: false,
            message: `Sai mật khẩu. Bạn còn ${5 - newAttempts} lần thử.`,
          });
        }
      );

      return;
    }

    db.query(
      "UPDATE Employees SET FailedLoginAttempts = 0 WHERE EmployeeID = ?",
      [user.EmployeeID],
      (resetErr) => {
        if (resetErr) {
          return res.status(500).json({
            success: false,
            message: "Lỗi cập nhật đăng nhập.",
          });
        }

        const userPayload = {
          id: user.EmployeeID,
          employeeCode: user.EmployeeCode,
          fullName: user.FullName,
          email: user.Email,
          role: user.Role,
        };

        const token = jwt.sign(userPayload, JWT_SECRET, {
          expiresIn: JWT_EXPIRES_IN,
        });

        return res.json({
          success: true,
          message: "Đăng nhập thành công.",
          token,
          user: userPayload,
        });
      }
    );
  });
});

router.get("/me", authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;