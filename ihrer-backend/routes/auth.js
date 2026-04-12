const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const {
  hashPassword,
  isHashedPassword,
  verifyPassword,
} = require("../utils/password");

const JWT_SECRET = process.env.JWT_SECRET || "ihrer_super_secret_key_change_me";
const JWT_EXPIRES_IN = "8h";
const MIN_PASSWORD_LENGTH = 8;
const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const otpStore = new Map();

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function generateOtp(length = OTP_LENGTH) {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(length, "0");
}

function getMailerTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendResetOtpEmail({ toEmail, fullName, otpCode }) {
  const transporter = getMailerTransporter();
  if (!transporter) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const expiresInMinutes = Math.round(OTP_TTL_MS / 60000);
  const displayName = String(fullName || "").trim() || "Anh/Chị";

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "[IHRER RMS] Ma OTP dat lai mat khau",
    text: [
      `Xin chao ${displayName},`,
      "",
      `Ma OTP dat lai mat khau cua ban la: ${otpCode}`,
      `Ma co hieu luc trong ${expiresInMinutes} phut.`,
      "",
      "Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.",
    ].join("\n"),
  });
}

router.post("/login", (req, res) => {
  const { identifier, password } = req.body;
  console.log("LOGIN BODY:", req.body);

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập Email/Mã nhân viên và mật khẩu.",
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
      console.error("Login query failed:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ. Vui lòng thử lại sau.",
      });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email hoặc Mã nhân viên không tồn tại.",
      });
    }

    const user = results[0];
    console.log("USER:", user);

    if (user.AccountStatus === "Locked") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
      });
    }

    let isValidPassword = false;

    try {
      if (isHashedPassword(user.PasswordHash)) {
        isValidPassword = verifyPassword(password, user.PasswordHash);
      } else {
        isValidPassword = String(password) === String(user.PasswordHash);
      }
    } catch (verifyErr) {
      console.error("Password verification failed:", verifyErr);
      return res.status(500).json({
        success: false,
        message: "Lỗi xác thực mật khẩu.",
      });
    }

    if (!isValidPassword) {
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
            console.error("Failed to update login attempts:", updateErr);
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

    const nextStoredPassword = isHashedPassword(user.PasswordHash)
      ? user.PasswordHash
      : hashPassword(password);

    db.query(
      "UPDATE Employees SET FailedLoginAttempts = 0, PasswordHash = ? WHERE EmployeeID = ?",
      [nextStoredPassword, user.EmployeeID],
      (resetErr) => {
        if (resetErr) {
          console.error("Failed to finalize successful login:", resetErr);
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

router.post("/request-password-reset", (req, res) => {
  const { identifier } = req.body;

  if (!identifier || !String(identifier).trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập Email hoặc Mã nhân viên.",
    });
  }

  const sql = `
    SELECT EmployeeID, EmployeeCode, FullName, Email
    FROM Employees
    WHERE LOWER(Email) = LOWER(?) OR EmployeeCode = ?
    LIMIT 1
  `;

  db.query(sql, [identifier.trim(), identifier.trim()], async (err, results) => {
    if (err) {
      console.error("Request password reset lookup failed:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ. Vui lòng thử lại sau.",
      });
    }

    if (results.length === 0) {
      return res.json({
        success: true,
        message: "Nếu tài khoản tồn tại, mã OTP đã được gửi về email.",
      });
    }

    const user = results[0];
    const existingOtp = otpStore.get(user.EmployeeID);
    if (existingOtp && Date.now() - existingOtp.createdAt < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        success: false,
        message: "Vui lòng chờ 60 giây trước khi yêu cầu gửi lại OTP.",
      });
    }

    const otpCode = generateOtp();
    otpStore.set(user.EmployeeID, {
      otpHash: hashOtp(otpCode),
      email: String(user.Email || "").trim().toLowerCase(),
      createdAt: Date.now(),
      expiresAt: Date.now() + OTP_TTL_MS,
      failedAttempts: 0,
    });

    try {
      await sendResetOtpEmail({
        toEmail: user.Email,
        fullName: user.FullName,
        otpCode,
      });
    } catch (mailError) {
      otpStore.delete(user.EmployeeID);
      console.error("Send reset OTP email failed:", mailError);

      if (mailError && (mailError.code === "EAUTH" || String(mailError.response || "").includes("535"))) {
        return res.status(500).json({
          success: false,
          message:
            "SMTP đăng nhập thất bại. Vui lòng kiểm tra SMTP_USER/SMTP_PASS (App Password Gmail).",
        });
      }

      if (mailError && (mailError.code === "ESOCKET" || mailError.code === "ECONNECTION")) {
        return res.status(500).json({
          success: false,
          message:
            "Không kết nối được máy chủ SMTP. Vui lòng kiểm tra SMTP_HOST/SMTP_PORT/SMTP_SECURE.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Không thể gửi OTP qua email. Vui lòng kiểm tra cấu hình SMTP của hệ thống.",
      });
    }

    return res.json({
      success: true,
      message: "Mã OTP đã được gửi về email nhân viên. Vui lòng kiểm tra hộp thư.",
    });
  });
});

router.post("/confirm-password-reset", (req, res) => {
  const { identifier, otp, newPassword, confirmPassword } = req.body;

  if (!identifier || !String(identifier).trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập Email hoặc Mã nhân viên.",
    });
  }

  if (!otp || !String(otp).trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập mã OTP.",
    });
  }

  db.query(
    `
      SELECT EmployeeID, Email
      FROM Employees
      WHERE LOWER(Email) = LOWER(?) OR EmployeeCode = ?
      LIMIT 1
    `,
    [identifier.trim(), identifier.trim()],
    (findErr, results) => {
      if (findErr) {
        console.error("Confirm password reset lookup failed:", findErr);
        return res.status(500).json({
          success: false,
          message: "Lỗi máy chủ. Vui lòng thử lại sau.",
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
        });
      }

      const user = results[0];
      const otpRecord = otpStore.get(user.EmployeeID);
      const now = Date.now();
      const normalizedEmail = String(user.Email || "").trim().toLowerCase();

      if (
        !otpRecord ||
        otpRecord.email !== normalizedEmail ||
        now > otpRecord.expiresAt
      ) {
        otpStore.delete(user.EmployeeID);
        return res.status(400).json({
          success: false,
          message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
        });
      }

      const providedOtpHash = hashOtp(String(otp).trim());
      if (providedOtpHash !== otpRecord.otpHash) {
        otpRecord.failedAttempts += 1;
        if (otpRecord.failedAttempts >= OTP_MAX_ATTEMPTS) {
          otpStore.delete(user.EmployeeID);
        } else {
          otpStore.set(user.EmployeeID, otpRecord);
        }

        return res.status(400).json({
          success: false,
          message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
        });
      }

      if (!newPassword || !String(newPassword).trim()) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mật khẩu mới.",
        });
      }

      if (!confirmPassword || !String(confirmPassword).trim()) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng xác nhận mật khẩu mới.",
        });
      }

      if (String(newPassword) !== String(confirmPassword)) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu xác nhận không khớp.",
        });
      }

      if (String(newPassword).trim().length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`,
        });
      }

      const nextPasswordHash = hashPassword(newPassword);

      db.query(
        `
          UPDATE Employees
          SET PasswordHash = ?, FailedLoginAttempts = 0, AccountStatus = 'Active'
          WHERE EmployeeID = ?
        `,
        [nextPasswordHash, user.EmployeeID],
        (updateErr) => {
          if (updateErr) {
            console.error("Confirm password reset update failed:", updateErr);
            return res.status(500).json({
              success: false,
              message: "Không thể đặt lại mật khẩu.",
            });
          }

          otpStore.delete(user.EmployeeID);

          return res.json({
            success: true,
            message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.",
          });
        }
      );
    }
  );
});

router.get("/me", authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;