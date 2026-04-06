import { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { API_BASE } from "../config";

type BookingPageProps = {
  currentUser: {
    id: number;
    employeeCode: string;
    fullName: string;
    email: string;
    role: "Admin" | "Staff";
  };
  authToken: string;
  roomOptions: {
    ResourceID: number;
    ResourceName: string;
    ResourceType: "Phòng họp" | "Phòng lab";
    Capacity?: number;
  }[];
  onBookingSuccess: () => void;
};

function formatDateToISO(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export default function BookingPage({
  currentUser,
  authToken,
  roomOptions,
  onBookingSuccess,
}: BookingPageProps) {
  const [roomTypeFilter, setRoomTypeFilter] = useState<
    "Tất cả" | "Phòng họp" | "Phòng lab"
  >("Tất cả");

  const [selectedDate, setSelectedDate] = useState<Date | null>(getToday());

  const [form, setForm] = useState({
    roomId: "",
    bookingDate: formatDateToISO(getToday()),
    startTime: "",
    endTime: "",
    purpose: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(false);
  const [requiredErrors, setRequiredErrors] = useState({
    roomId: false,
    bookingDate: false,
    startTime: false,
    endTime: false,
    purpose: false,
  });

  const datePickerRef = useRef<any>(null);

  useEffect(() => {
    if (selectedDate) {
      setForm((prev) => ({
        ...prev,
        bookingDate: formatDateToISO(selectedDate),
      }));
    }
  }, [selectedDate]);

  const filteredRooms = useMemo(() => {
    if (roomTypeFilter === "Tất cả") return roomOptions;
    return roomOptions.filter((item) => item.ResourceType === roomTypeFilter);
  }, [roomOptions, roomTypeFilter]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setRequiredErrors((prev) => ({
      ...prev,
      [name]: name === "purpose" ? !value.trim() : !value,
    }));
    setMessage("");
    setMessageType("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors = {
      roomId: !form.roomId,
      bookingDate: !form.bookingDate,
      startTime: !form.startTime,
      endTime: !form.endTime,
      purpose: !form.purpose.trim(),
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setRequiredErrors(nextErrors);
      setMessage("Vui lòng nhập đầy đủ thông tin đặt phòng.");
      setMessageType("error");
      return;
    }

    setRequiredErrors({
      roomId: false,
      bookingDate: false,
      startTime: false,
      endTime: false,
      purpose: false,
    });

    const today = formatDateToISO(getToday());

    if (form.bookingDate < today) {
      setMessage("Không thể đặt phòng cho ngày trong quá khứ.");
      setMessageType("error");
      return;
    }

    if (form.startTime >= form.endTime) {
      setMessage("Giờ bắt đầu phải nhỏ hơn giờ kết thúc.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          employeeId: currentUser.id,
          resourceId: Number(form.roomId),
          bookingDate: form.bookingDate,
          startTime: form.startTime,
          endTime: form.endTime,
          purpose: form.purpose.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setMessage(data.message || "Đặt phòng thất bại.");
        setMessageType("error");
        return;
      }

      setMessage("Đặt phòng thành công.");
      setMessageType("success");

      const todayDate = getToday();

      setSelectedDate(todayDate);
      setForm({
        roomId: "",
        bookingDate: formatDateToISO(todayDate),
        startTime: "",
        endTime: "",
        purpose: "",
      });
      setRequiredErrors({
        roomId: false,
        bookingDate: false,
        startTime: false,
        endTime: false,
        purpose: false,
      });

      onBookingSuccess();
    } catch {
      setMessage("Không thể kết nối tới máy chủ backend.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Đặt phòng</h2>
          <p className="mt-2 text-sm text-slate-500">
            Chọn phòng đang trống và đặt trực tiếp, không cần phê duyệt.
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Lọc theo loại phòng
          </label>
          <select
            value={roomTypeFilter}
            onChange={(e) =>
              setRoomTypeFilter(
                e.target.value as "Tất cả" | "Phòng họp" | "Phòng lab"
              )
            }
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="Tất cả">Tất cả</option>
            <option value="Phòng họp">Phòng họp</option>
            <option value="Phòng lab">Phòng lab</option>
          </select>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Chọn phòng
            </label>
            <div className="relative">
              <select
                name="roomId"
                value={form.roomId}
                onChange={handleChange}
                onBlur={() =>
                  setRequiredErrors((prev) => ({ ...prev, roomId: !form.roomId }))
                }
                className={`w-full rounded-2xl border px-4 py-3 pr-10 outline-none transition ${requiredErrors.roomId
                    ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
              >
                <option value="">-- Chọn phòng --</option>
                {filteredRooms.map((item) => (
                  <option key={item.ResourceID} value={item.ResourceID}>
                    {item.ResourceName} ({item.ResourceType})
                  </option>
                ))}
              </select>
              <span
                className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg ${requiredErrors.roomId ? "text-red-500" : "text-slate-400"
                  }`}
              >
                *
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ngày đặt
            </label>

            <div className="relative">
              <DatePicker
                ref={datePickerRef}
                selected={selectedDate}
                onChange={(date: Date | null) => {
                  setSelectedDate(date);
                  setRequiredErrors((prev) => ({ ...prev, bookingDate: !date }));
                  setMessage("");
                  setMessageType("");
                }}
                dateFormat="dd/MM/yyyy"
                minDate={getToday()}
                placeholderText="dd/MM/yyyy"
                wrapperClassName="w-full"

                className={`w-full rounded-2xl border px-4 py-3 pr-16 outline-none transition ${requiredErrors.bookingDate
                    ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
              />

              <button
                type="button"
                onClick={() => datePickerRef.current?.setOpen(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800"
                aria-label="Mở lịch chọn ngày"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mục đích sử dụng
            </label>
            <div className="relative">
              <input
                type="text"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                onBlur={() =>
                  setRequiredErrors((prev) => ({ ...prev, purpose: !form.purpose.trim() }))
                }
                required
                placeholder="Ví dụ: Họp nhóm, học thực hành..."
                className={`w-full rounded-2xl border px-4 py-3 pr-10 outline-none transition ${requiredErrors.purpose
                    ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
              />
              <span
                className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg ${requiredErrors.purpose ? "text-red-500" : "text-slate-400"
                  }`}
              >
                *
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Giờ bắt đầu
            </label>
            <div className="relative">
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                onBlur={() =>
                  setRequiredErrors((prev) => ({ ...prev, startTime: !form.startTime }))
                }
                className={`w-full rounded-2xl border px-4 py-3 pr-10 outline-none transition ${requiredErrors.startTime
                    ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
              />
              <span
                className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg ${requiredErrors.startTime ? "text-red-500" : "text-slate-400"
                  }`}
              >
                *
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Giờ kết thúc
            </label>
            <div className="relative">
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                onBlur={() =>
                  setRequiredErrors((prev) => ({ ...prev, endTime: !form.endTime }))
                }
                className={`w-full rounded-2xl border px-4 py-3 pr-10 outline-none transition ${requiredErrors.endTime
                    ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
              />
              <span
                className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg ${requiredErrors.endTime ? "text-red-500" : "text-slate-400"
                  }`}
              >
                *
              </span>
            </div>
          </div>

          {message && (
            <div
              className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${messageType === "success"
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
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Đang xử lý..." : "Đặt phòng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
