import { useState, type ChangeEvent, type FormEvent } from "react";
import { API_BASE } from "../config";

type Role = "Admin" | "Staff";

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
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isFormValid =
    form.identifier.trim().length > 0 && form.password.trim().length > 0;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
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
      setError("");
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
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
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

          <h1 className="text-3xl font-bold text-slate-900">Đăng nhập</h1>
          <p className="mt-2 text-sm text-slate-500">
            Vui lòng đăng nhập để sử dụng hệ thống.
          </p>
        </div>

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

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
