import { useEffect, useState } from "react";
import { API_BASE } from "../config";

type ProfilePageProps = {
  authToken: string;
  onProfileUpdated: (updatedUser: {
    id: number;
    employeeCode: string;
    fullName: string;
    email: string;
    role: "Admin" | "Staff";
  }) => void;
};

export default function ProfilePage({
  authToken,
  onProfileUpdated,
}: ProfilePageProps) {
  const [form, setForm] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    role: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/profile/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setForm({
            employeeCode: data.data.EmployeeCode || "",
            fullName: data.data.FullName || "",
            email: data.data.Email || "",
            role: data.data.Role || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        } else {
          setMessage(data.message || "Không thể tải thông tin cá nhân.");
          setMessageType("error");
        }
      } catch {
        setMessage("Không thể kết nối tới máy chủ backend.");
        setMessageType("error");
      }
    };

    loadProfile();
  }, [authToken]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      if (form.newPassword && form.newPassword.length < 8) {
        setMessage("Mật khẩu phải có ít nhất 8 ký tự.");
        setMessageType("error");
        return;
      }

      if (form.newPassword && form.newPassword !== form.confirmPassword) {
        setMessage("Mật khẩu xác nhận không khớp.");
        setMessageType("error");
        return;
      }

      if (form.newPassword && !form.currentPassword) {
        setMessage("Vui lòng nhập mật khẩu hiện tại.");
        setMessageType("error");
        return;
      }

      const response = await fetch(`${API_BASE}/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setMessage(data.message || "Cập nhật thất bại.");
        setMessageType("error");
        return;
      }

      if (data.user) {
        onProfileUpdated(data.user);
      }

      setForm((prev) => ({
        ...prev,
        fullName: data.user?.fullName ?? prev.fullName,
        email: data.user?.email ?? prev.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setMessage(data.message || "Cập nhật thành công.");
      setMessageType("success");
    } catch {
      setMessage("Không thể kết nối tới máy chủ backend.");
      setMessageType("error");
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Thông tin cá nhân</h2>
        <p className="mt-2 text-sm text-slate-500">
          Người dùng có thể xem và cập nhật thông tin cá nhân của mình.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Mã nhân viên
          </label>
          <input
            type="text"
            value={form.employeeCode}
            disabled
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Vai trò
          </label>
          <input
            type="text"
            value={form.role === "Admin" ? "Quản trị viên" : "Nhân viên"}
            disabled
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Họ và tên
          </label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Mật khẩu hiện tại
          </label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            placeholder="Chỉ nhập nếu muốn đổi mật khẩu"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Mật khẩu mới
          </label>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Nhập mật khẩu mới"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Xác nhận mật khẩu mới
          </label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Nhập lại mật khẩu mới"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {message && (
          <div
            className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
              messageType === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}

