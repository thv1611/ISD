type DashboardSummary = {
  totalResources: number;
  totalUsers: number;
  totalBooked: number;
  totalCancelled: number;
};

type DashboardPageProps = {
  summary: DashboardSummary;
};

export default function DashboardPage({ summary }: DashboardPageProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Tổng số phòng / lab</p>
        <h3 className="mt-3 text-3xl font-bold text-slate-900">
          {summary.totalResources}
        </h3>
        <p className="mt-2 text-sm text-slate-500">Danh mục phòng cố định</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Người dùng hoạt động</p>
        <h3 className="mt-3 text-3xl font-bold text-slate-900">
          {summary.totalUsers}
        </h3>
        <p className="mt-2 text-sm text-slate-500">Tài khoản có thể đăng nhập hệ thống</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Lượt đặt hợp lệ</p>
        <h3 className="mt-3 text-3xl font-bold text-rose-600">
          {summary.totalBooked}
        </h3>
        <p className="mt-2 text-sm text-slate-500">Booking đang có hiệu lực</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Lượt đã hủy</p>
        <h3 className="mt-3 text-3xl font-bold text-slate-700">
          {summary.totalCancelled}
        </h3>
        <p className="mt-2 text-sm text-slate-500">Booking không còn hiệu lực</p>
      </div>
    </div>
  );
}