const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

function parseDateAndTime(dateValue, timeValue) {
  const date = new Date(dateValue);
  const [hours, minutes, seconds = "00"] = String(timeValue).split(":");
  date.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return date;
}

function isPastDateOnly(dateString) {
  const inputDate = new Date(dateString);
  const today = new Date();
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
}

function isWithinWorkingHours(startTime, endTime) {
  return startTime >= "07:00" && endTime <= "17:00";
}

router.get("/calendar", authenticateToken, (req, res) => {
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
    FROM Bookings b
    JOIN Resources r ON b.ResourceID = r.ResourceID
    JOIN Employees e ON b.EmployeeID = e.EmployeeID
    WHERE r.IsActive = 1
    ORDER BY b.BookingDate, r.ResourceName, b.StartTime
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Không thể tải dữ liệu lịch.",
      });
    }

    return res.json({
      success: true,
      data: results,
    });
  });
});

router.get("/my/:employeeId", authenticateToken, (req, res) => {
  const { employeeId } = req.params;

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
    FROM Bookings b
    JOIN Resources r ON b.ResourceID = r.ResourceID
    WHERE b.EmployeeID = ?
    ORDER BY b.BookingDate DESC, b.StartTime DESC
  `;

  db.query(sql, [employeeId], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Không thể tải lịch sử đặt phòng.",
      });
    }

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
    FROM Bookings
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
        INSERT INTO Bookings
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

  const findSql = `
    SELECT BookingID, EmployeeID, BookingDate, StartTime, BookingStatus
    FROM Bookings
    WHERE BookingID = ?
    LIMIT 1
  `;

  db.query(findSql, [bookingId], (findErr, findResults) => {
    if (findErr || findResults.length === 0) {
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

    const updateSql = `
      UPDATE Bookings
      SET BookingStatus = 'Đã hủy', CancelledAt = NOW()
      WHERE BookingID = ?
    `;

    db.query(updateSql, [bookingId], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({
          success: false,
          message: "Không thể hủy booking.",
        });
      }

      return res.json({
        success: true,
        message: "Hủy booking thành công.",
      });
    });
  });
});

module.exports = router;
