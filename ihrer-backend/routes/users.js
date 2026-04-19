const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { hashPassword } = require("../utils/password");

function queryWithTableFallback(tableNames, buildSql, params, callback) {
  const tryQuery = (index) => {
    db.query(buildSql(tableNames[index]), params, (err, results) => {
      if (err && err.code === "ER_NO_SUCH_TABLE" && index < tableNames.length - 1) {
        return tryQuery(index + 1);
      }

      return callback(err, results);
    });
  };

  return tryQuery(0);
}

router.get("/", authenticateToken, requireRole("Admin"), (req, res) => {
  const sql = `
    SELECT
      EmployeeID,
      EmployeeCode,
      FullName,
      Email,
      Role,
      AccountStatus
    FROM employees
    ORDER BY EmployeeID ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách người dùng.",
      });
    }

    return res.json({
      success: true,
      data: results,
    });
  });
});

router.post("/", authenticateToken, requireRole("Admin"), (req, res) => {
  const { employeeCode, fullName, email, role, accountStatus } = req.body;

  if (!employeeCode || !fullName || !email || !role || !accountStatus) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin người dùng.",
    });
  }

  const checkSql = `
    SELECT EmployeeID
    FROM employees
    WHERE EmployeeCode = ? OR Email = ?
    LIMIT 1
  `;

  db.query(checkSql, [employeeCode, email], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("User uniqueness check failed:", checkErr);
      return res.status(500).json({
        success: false,
        message: "Lỗi kiểm tra dữ liệu người dùng.",
      });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên hoặc email đã tồn tại.",
      });
    }

    const defaultPasswordHash = hashPassword("1");

    const insertSql = `
      INSERT INTO employees
      (EmployeeCode, FullName, Email, PasswordHash, Role, AccountStatus, FailedLoginAttempts)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `;

    db.query(
      insertSql,
      [employeeCode, fullName, email, defaultPasswordHash, role, accountStatus],
      (insertErr) => {
        if (insertErr) {
          console.error("User insert failed:", insertErr);
          return res.status(500).json({
            success: false,
            message: "Không thể tạo người dùng.",
          });
        }

        return res.json({
          success: true,
          message: "Tạo người dùng thành công.",
        });
      }
    );
  });
});

router.put("/:id", authenticateToken, requireRole("Admin"), (req, res) => {
  const { id } = req.params;
  const { employeeCode, fullName, email, role, accountStatus } = req.body;

  if (!employeeCode || !fullName || !email || !role || !accountStatus) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin người dùng.",
    });
  }

  const checkSql = `
    SELECT EmployeeID
    FROM employees
    WHERE (EmployeeCode = ? OR Email = ?) AND EmployeeID <> ?
    LIMIT 1
  `;

  db.query(checkSql, [employeeCode, email, id], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("User update uniqueness check failed:", checkErr);
      return res.status(500).json({
        success: false,
        message: "Lỗi kiểm tra dữ liệu người dùng.",
      });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên hoặc email đã tồn tại.",
      });
    }

    const updateSql = `
      UPDATE employees
      SET EmployeeCode = ?, FullName = ?, Email = ?, Role = ?, AccountStatus = ?
      WHERE EmployeeID = ?
    `;

    db.query(
      updateSql,
      [employeeCode, fullName, email, role, accountStatus, id],
      (updateErr) => {
        if (updateErr) {
          console.error("User update failed:", updateErr);
          return res.status(500).json({
            success: false,
            message: "Không thể cập nhật người dùng.",
          });
        }

        return res.json({
          success: true,
          message: "Cập nhật người dùng thành công.",
        });
      }
    );
  });
});

router.patch("/:id/toggle-lock", authenticateToken, requireRole("Admin"), (req, res) => {
  const { id } = req.params;
  const employeeTables = ["employees", "Employees"];

  queryWithTableFallback(
    employeeTables,
    (tableName) => `SELECT AccountStatus FROM ${tableName} WHERE EmployeeID = ? LIMIT 1`,
    [id],
    (findErr, findResults) => {
      if (findErr) {
        console.error("User lock lookup failed:", findErr);
        return res.status(500).json({
          success: false,
          message: "Không thể kiểm tra trạng thái tài khoản.",
        });
      }

      if (findResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng.",
        });
      }

      const currentStatus = findResults[0].AccountStatus;
      const nextStatus = currentStatus === "Active" ? "Locked" : "Active";

      queryWithTableFallback(
        employeeTables,
        (tableName) => `UPDATE ${tableName} SET AccountStatus = ? WHERE EmployeeID = ?`,
        [nextStatus, id],
        (updateErr) => {
          if (updateErr) {
            console.error("User lock update failed:", updateErr);
            return res.status(500).json({
              success: false,
              message: "Không thể cập nhật trạng thái tài khoản.",
            });
          }

          return res.json({
            success: true,
            message: "Cập nhật trạng thái tài khoản thành công.",
          });
        }
      );
    }
  );
});

module.exports = router;
