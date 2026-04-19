const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

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

function parseDateAndTime(dateValue, timeValue) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const [hours, minutes, seconds = "00"] = String(timeValue).split(":");
  date.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return date;
}

function isPastDateOnly(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  const inputDate = new Date(year, month - 1, day);
  const today = new Date();
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
}

function isWithinWorkingHours(startTime, endTime) {
  return startTime >= "07:00" && endTime <= "17:00";
}

router.get("/calendar", authenticateToken, (req, res) => {
  console.log("[GET /bookings/calendar] query params:", req.query);

  const sql = `
    SELECT
      b.BookingID,
      DATE_FORMAT(b.BookingDate, '%Y-%m-%d') AS BookingDate,
      TIME_FORMAT(b.StartTime, '%H:%i') AS StartTime,
      TIME_FORMAT(b.EndTime, '%H:%i') AS EndTime,
      b.Purpose,
      b.BookingStatus,
      b.CancelledAt,
      r.ResourceID,
      r.ResourceName,
      r.ResourceType,
      e.FullName,
      e.EmployeeCode
    FROM bookings b
    JOIN resources r ON b.ResourceID = r.ResourceID
    JOIN employees e ON b.EmployeeID = e.EmployeeID
    WHERE r.IsActive = 1
    ORDER BY b.BookingDate, r.ResourceName, b.StartTime
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("[GET /bookings/calendar] SQL error:", err);
      return res.status(500).json({
        success: false,
        message: "Không thể tải dữ liệu lịch.",
      });
    }

    console.log("[GET /bookings/calendar] result length:", results.length);

    return res.json({
      success: true,
      data: results,
    });
  });
});

router.get("/my/:employeeId", authenticateToken, (req, res) => {
  const { employeeId } = req.params;

  console.log("[GET /bookings/my/:employeeId] query params:", req.query);

  if (req.user.role !== "Admin" && Number(req.user.id) !== Number(employeeId)) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền xem dữ liệu này.",
    });
  }

  const sql = `
    SELECT
      b.BookingID,
      DATE_FORMAT(b.BookingDate, '%Y-%m-%d') AS BookingDate,
      TIME_FORMAT(b.StartTime, '%H:%i') AS StartTime,
      TIME_FORMAT(b.EndTime, '%H:%i') AS EndTime,
      b.Purpose,
      b.BookingStatus,
      b.CancelledAt,
      r.ResourceName,
      r.ResourceType
    FROM bookings b
    JOIN resources r ON b.ResourceID = r.ResourceID
    WHERE b.EmployeeID = ?
    ORDER BY b.BookingDate DESC, b.StartTime DESC
  `;

  db.query(sql, [employeeId], (err, results) => {
    if (err) {
      console.error("[GET /bookings/my/:employeeId] SQL error:", err);
      return res.status(500).json({
        success: false,
        message: "Không thể tải lịch sử đặt phòng.",
      });
    }

    console.log("[GET /bookings/my/:employeeId] result length:", results.length);

    return res.json({
      success: true,
      data: results,
    });
  });
});

router.post("/", authenticateToken, (req, res) => {
  const { employeeId, resourceId, bookingDate, startTime, endTime, purpose } = req.body;

  if (Number(req.user.id) !== Number(employeeId) && req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền tạo booking cho người dùng khác.",
    });
  }

  if (!employeeId || !resourceId || !bookingDate || !startTime || !endTime || !purpose) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin đặt phòng.",
    });
  }

  if (isPastDateOnly(bookingDate)) {
    return res.status(400).json({
      success: false,
      message: "Không thể đặt phòng cho ngày trong quá khứ.",
    });
  }

  if (startTime >= endTime) {
    return res.status(400).json({
      success: false,
      message: "Giờ bắt đầu phải nhỏ hơn giờ kết thúc.",
    });
  }

  if (!isWithinWorkingHours(startTime, endTime)) {
    return res.status(400).json({
      success: false,
      message: "Chỉ được đặt phòng trong khung giờ làm việc từ 07:00 đến 17:00.",
    });
  }

  const overlapSql = `
    SELECT BookingID
    FROM bookings
    WHERE ResourceID = ?
      AND BookingDate = ?
      AND BookingStatus = 'Đã đặt'
      AND NOT (EndTime <= ? OR StartTime >= ?)
    LIMIT 1
  `;

  db.query(
    overlapSql,
    [resourceId, bookingDate, startTime, endTime],
    (overlapErr, overlapResults) => {
      if (overlapErr) {
        return res.status(500).json({
          success: false,
          message: "Không thể kiểm tra trùng lịch.",
        });
      }

      if (overlapResults.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Phòng đã được đặt trong khung giờ này.",
        });
      }

      const insertSql = `
        INSERT INTO bookings
        (EmployeeID, ResourceID, BookingDate, StartTime, EndTime, Purpose, BookingStatus)
        VALUES (?, ?, ?, ?, ?, ?, 'Đã đặt')
      `;

      db.query(
        insertSql,
        [employeeId, resourceId, bookingDate, startTime, endTime, purpose],
        (insertErr) => {
          if (insertErr) {
            return res.status(500).json({
              success: false,
              message: "Không thể tạo booking.",
            });
          }

          return res.json({
            success: true,
            message: "Đặt phòng thành công.",
          });
        }
      );
    }
  );
});

router.patch("/:bookingId/cancel", authenticateToken, (req, res) => {
  const { bookingId } = req.params;
  const bookingTables = ["bookings", "Bookings"];

  queryWithTableFallback(
    bookingTables,
    (tableName) => `
      SELECT BookingID, EmployeeID, BookingDate, StartTime, BookingStatus
      FROM ${tableName}
      WHERE BookingID = ?
      LIMIT 1
    `,
    [bookingId],
    (findErr, findResults) => {
      if (findErr) {
        console.error("Booking cancel lookup failed:", findErr);
        return res.status(500).json({
          success: false,
          message: "Không thể kiểm tra booking cần hủy.",
        });
      }

      if (findResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy booking.",
        });
      }

      const booking = findResults[0];

      if (Number(booking.EmployeeID) !== Number(req.user.id) && req.user.role !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền hủy booking này.",
        });
      }

      if (booking.BookingStatus === "Đã hủy") {
        return res.status(400).json({
          success: false,
          message: "Booking này đã được hủy trước đó.",
        });
      }

      const bookingDateTime = parseDateAndTime(booking.BookingDate, booking.StartTime);
      const now = new Date();
      const diffMinutes = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffMinutes < 60) {
        return res.status(400).json({
          success: false,
          message: "Bạn chỉ có thể hủy lịch trước giờ bắt đầu ít nhất 60 phút.",
        });
      }

      queryWithTableFallback(
        bookingTables,
        (tableName) => `
          UPDATE ${tableName}
          SET BookingStatus = 'Đã hủy', CancelledAt = NOW()
          WHERE BookingID = ?
        `,
        [bookingId],
        (updateErr) => {
          if (updateErr) {
            console.error("Booking cancel update failed:", updateErr);
            return res.status(500).json({
              success: false,
              message: "Không thể hủy booking.",
            });
          }

          return res.json({
            success: true,
            message: "Hủy booking thành công.",
          });
        }
      );
    }
  );
});

module.exports = router;
