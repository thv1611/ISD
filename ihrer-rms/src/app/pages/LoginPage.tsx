import { useState, type ChangeEvent, type FormEvent } from "react";
import { API_BASE } from "../config";

type Role = "Admin" | "Staff";
type AuthMode = "login" | "requestReset" | "confirmReset";

type LoginPageProps = {
  onLoginSuccess: (user: {
    id: number;
    employeeCode: string;
    fullName: string;
    email: string;
    role: Role;
  }, token: string) => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [requestResetForm, setRequestResetForm] = useState({
    identifier: "",
  });
  const [confirmResetForm, setConfirmResetForm] = useState({
    identifier: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isLoginFormValid =
    form.identifier.trim().length > 0 && form.password.trim().length > 0;
  const isRequestResetFormValid = requestResetForm.identifier.trim().length > 0;
  const isConfirmResetFormValid =
    confirmResetForm.identifier.trim().length > 0 &&
    confirmResetForm.otp.trim().length > 0 &&
    confirmResetForm.newPassword.trim().length > 0 &&
    confirmResetForm.confirmPassword.trim().length > 0;

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLoading(false);
    clearMessages();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    clearMessages();
  };

  const handleRequestResetChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRequestResetForm({ ...requestResetForm, [e.target.name]: e.target.value });
    clearMessages();
  };

  const handleConfirmResetChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setConfirmResetForm({ ...confirmResetForm, [e.target.name]: e.target.value });
    clearMessages();
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let timeoutId: number | undefined;

    if (!form.identifier.trim() && !form.password.trim()) {
      setError("Vui lòng nhập Email/Mã nhân viên và mật khẩu.");
      return;
    }

    if (!form.identifier.trim()) {
      setError("Vui lòng nhập Email hoặc Mã nhân viên.");
      return;
    }

    if (!form.password.trim()) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          identifier: form.identifier.trim(),
          password: form.password,
        }),
      });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok || !data?.success) {
        setError(data?.message || "Đăng nhập thất bại.");
        return;
      }

      onLoginSuccess(data.user, data.token);

      setForm({
        identifier: "",
        password: "",
      });
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError("Máy chủ đăng nhập phản hồi quá lâu. Kiểm tra backend rồi thử lại.");
        return;
      }

      setError("Không thể kết nối tới máy chủ backend.");
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let timeoutId: number | undefined;

    if (!requestResetForm.identifier.trim()) {
      setError("Vui lòng nhập Email hoặc Mã nhân viên.");
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE}/auth/request-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          identifier: requestResetForm.identifier.trim(),
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok || !data?.success) {
        setError(data?.message || "Không thể tạo yêu cầu đặt lại mật khẩu.");
        return;
      }

      setSuccess(
        data?.message || "Nếu tài khoản tồn tại, mã OTP đã được gửi về email."
      );

      setConfirmResetForm((prev) => ({
        ...prev,
        identifier: requestResetForm.identifier.trim(),
      }));
      setMode("confirmReset");
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError("Máy chủ phản hồi quá lâu. Kiểm tra backend rồi thử lại.");
        return;
      }

      setError("Không thể kết nối tới máy chủ backend.");
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let timeoutId: number | undefined;

    if (!confirmResetForm.identifier.trim()) {
      setError("Vui lòng nhập Email hoặc Mã nhân viên.");
      return;
    }

    if (!confirmResetForm.otp.trim()) {
      setError("Vui lòng nhập mã OTP.");
      return;
    }

    if (!confirmResetForm.newPassword.trim()) {
      setError("Vui lòng nhập mật khẩu mới.");
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE}/auth/confirm-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          identifier: confirmResetForm.identifier.trim(),
          otp: confirmResetForm.otp.trim(),
          newPassword: confirmResetForm.newPassword,
          confirmPassword: confirmResetForm.confirmPassword,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok || !data?.success) {
        setError(data?.message || "Đặt lại mật khẩu thất bại.");
        return;
      }

      setSuccess(data.message || "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.");
      setConfirmResetForm({
        identifier: "",
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMode("login");
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError("Máy chủ phản hồi quá lâu. Kiểm tra backend rồi thử lại.");
        return;
      }

      setError("Không thể kết nối tới máy chủ backend.");
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <img src="/logo.png" alt="Logo IHRER" className="h-24 w-auto object-contain" />
          </div>

          <div className="mb-3 inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-700">
            Viện thủy điện và năng lượng tái tạo
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            {mode === "login" && "Đăng nhập"}
            {mode === "requestReset" && "Yêu cầu đặt lại mật khẩu"}
            {mode === "confirmReset" && "Xác nhận mật khẩu mới"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "login" && "Vui lòng đăng nhập để sử dụng hệ thống."}
            {mode === "requestReset" &&
              "Nhập Email hoặc Mã nhân viên để nhận OTP đặt lại mật khẩu qua email."}
            {mode === "confirmReset" &&
              "Nhập OTP nhận được trong email, sau đó đặt mật khẩu mới."}
          </p>
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email / Mã nhân viên
              </label>
              <input
                type="text"
                name="identifier"
                value={form.identifier}
                onChange={handleChange}
                placeholder="Nhập email hoặc mã nhân viên"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-16 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode("requestReset")}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Quên mật khẩu?
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

              <button
                type="submit"
                disabled={loading || !isLoginFormValid}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        )}

        {mode === "requestReset" && (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email / Mã nhân viên
              </label>
              <input
                type="text"
                name="identifier"
                value={requestResetForm.identifier}
                onChange={handleRequestResetChange}
                placeholder="Nhập email hoặc mã nhân viên"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={loading || !isRequestResetFormValid}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading ? "Đang gửi OTP..." : "Gửi OTP"}
              </button>
            </div>
          </form>
        )}

        {mode === "confirmReset" && (
          <form onSubmit={handleConfirmReset} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email / Mã nhân viên
              </label>
              <input
                type="text"
                name="identifier"
                value={confirmResetForm.identifier}
                onChange={handleConfirmResetChange}
                placeholder="Nhập email hoặc mã nhân viên"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mã OTP
              </label>
              <input
                type="text"
                name="otp"
                inputMode="numeric"
                value={confirmResetForm.otp}
                onChange={handleConfirmResetChange}
                placeholder="Nhập mã OTP 6 chữ số"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showResetPassword ? "text" : "password"}
                  name="newPassword"
                  value={confirmResetForm.newPassword}
                  onChange={handleConfirmResetChange}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-16 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  {showResetPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showResetConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={confirmResetForm.confirmPassword}
                  onChange={handleConfirmResetChange}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-16 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  {showResetConfirmPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => switchMode("requestReset")}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={loading || !isConfirmResetFormValid}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

