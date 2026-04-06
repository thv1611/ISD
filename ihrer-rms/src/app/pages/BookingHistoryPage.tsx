import { API_BASE } from "../config";

type BookingHistoryPageProps = {
    bookings: {
        BookingID: number;
        BookingDate: string;
        StartTime: string;
        EndTime: string;
        Purpose: string;
        BookingStatus: "Đã đặt" | "Đã hủy";
        CancelledAt?: string | null;
        ResourceName: string;
        ResourceType: "Phòng họp" | "Phòng lab";
    }[];
    authToken: string;
    currentUser: {
        id: number;
        role: "Admin" | "Staff";
    };
    renderStatusBadge: (status: string) => React.ReactNode;
    onRefresh: () => void;
};

function formatDateVN(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
}

export default function BookingHistoryPage({
    bookings,
    authToken,
    currentUser,
    renderStatusBadge,
    onRefresh,
}: BookingHistoryPageProps) {
    const handleCancelBooking = async (bookingId: number) => {
        const confirmed = window.confirm("Bạn có chắc chắn muốn hủy đặt phòng này không?");
        if (!confirmed) return;

        const response = await fetch(
            `${API_BASE}/bookings/${bookingId}/cancel`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
            }
        );

        const data = await response.json();
        alert(data.message || "Đã xử lý.");
        if (data.success) {
            onRefresh();
        }
    };

return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-5 flex items-center gap-2">
            <span className="text-lg">🗓️</span>
            <h2 className="text-xl font-bold text-slate-900">Lịch sử đặt phòng</h2>
        </div>

        <div className="space-y-4">
            {bookings.map((booking) => (
                <div
                    key={booking.BookingID}
                    className="rounded-2xl border border-slate-200 p-4"
                >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="text-lg font-semibold text-slate-900">
                                    {booking.ResourceName}
                                </div>
                                {renderStatusBadge(booking.BookingStatus)}
                            </div>

                            <div className="mt-3 text-sm leading-6 text-slate-600">
                                <div>
                                    <span className="font-medium">Loại phòng:</span>{" "}
                                    {booking.ResourceType}
                                </div>
                                <div>
                                    <span className="font-medium">Ngày:</span>{" "}
                                    {formatDateVN(booking.BookingDate)}
                                </div>
                                <div>
                                    <span className="font-medium">Thời gian:</span>{" "}
                                    {booking.StartTime} - {booking.EndTime}
                                </div>
                                <div>
                                    <span className="font-medium">Mục đích:</span>{" "}
                                    {booking.Purpose}
                                </div>
                            </div>
                        </div>

                        {booking.BookingStatus === "Đã đặt" && currentUser.role === "Staff" && (
                            <button
                                onClick={() => handleCancelBooking(booking.BookingID)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                                Hủy
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {bookings.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                    Bạn chưa có lịch sử đặt phòng nào.
                </div>
            )}
        </div>
    </div>
);
}
