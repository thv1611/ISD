import { useState } from "react";

type Role = "Admin" | "Staff";
type Status = "Active" | "Locked";

type UserItem = {
  EmployeeID: number;
  EmployeeCode: string;
  FullName: string;
  Email: string;
  Role: Role;
  AccountStatus: Status;
};

type ManageUsersProps = {
  authToken: string;
  userList: UserItem[];
  renderStatusBadge: (status: string) => React.ReactNode;
  onRefresh: () => Promise<void>;
};

const roleLabel: Record<Role, string> = {
  Admin: "Quản trị viên",
  Staff: "Nhân viên",
};

export default function ManageUsers({
  authToken,
  userList,
  renderStatusBadge,
  onRefresh,
}: ManageUsersProps) {
  const [form, setForm] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    role: "Staff" as Role,
    accountStatus: "Active" as Status,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setForm({
      employeeCode: "",
      fullName: "",
      email: "",
      role: "Staff",
      accountStatus: "Active",
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    const url =
      editingId === null
        ? "http://localhost:5000/users"
        : `http://localhost:5000/users/${editingId}`;

    const method = editingId === null ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(form),
    });

    const data = await response.json();
    setMessage(data.message || "Đã xử lý.");

    if (data.success) {
      resetForm();
      await onRefresh();
    }
  };

  const handleEdit = (item: UserItem) => {
    setEditingId(item.EmployeeID);
    setForm({
      employeeCode: item.EmployeeCode,
      fullName: item.FullName,
      email: item.Email,
      role: item.Role,
      accountStatus: item.AccountStatus,
    });
  };

  const handleToggleLock = async (id: number, currentStatus: "Active" | "Locked") => {
  const actionText = currentStatus === "Active" ? "khóa" : "mở khóa";
  const confirmed = window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này không?`);
  if (!confirmed) return;

  const response = await fetch(
    `http://localhost:5000/users/${id}/toggle-lock`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  const data = await response.json();
  setMessage(data.message || "Đã cập nhật trạng thái.");
  if (data.success) {
    await onRefresh();
  }
};

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {editingId ? "Cập nhật người dùng" : "Thêm người dùng"}
          </h2>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            placeholder="Mã nhân viên"
            value={form.employeeCode}
            onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
          <input
            placeholder="Họ và tên"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="Admin">Quản trị viên</option>
            <option value="Staff">Nhân viên</option>
          </select>
          <select
            value={form.accountStatus}
            onChange={(e) =>
              setForm({ ...form, accountStatus: e.target.value as Status })
            }
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="Active">Hoạt động</option>
            <option value="Locked">Đã khóa</option>
          </select>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSubmit}
            className="rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {editingId ? "Lưu thay đổi" : "Thêm người dùng"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Danh sách người dùng</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Mã NV</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Họ tên</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Vai trò</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Trạng thái</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((item) => (
                <tr key={item.EmployeeID} className="border-b border-slate-100">
                  <td className="px-4 py-4 text-sm text-slate-700">{item.EmployeeCode}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.FullName}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.Email}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{roleLabel[item.Role]}</td>
                  <td className="px-4 py-4">
                    {renderStatusBadge(item.AccountStatus === "Active" ? "Hoạt động" : "Đã khóa")}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleToggleLock(item.EmployeeID, item.AccountStatus)}
                        className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100"
                      >
                        {item.AccountStatus === "Active" ? "Khóa" : "Mở khóa"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}