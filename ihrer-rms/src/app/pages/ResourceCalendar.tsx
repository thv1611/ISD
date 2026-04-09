import { useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type RoomItem = {
  ResourceID: number;
  ResourceCode: string;
  ResourceName: string;
  ResourceType: "Phòng họp" | "Phòng lab";
  Capacity: number;
  ResourceStatus: "Sẵn sàng" | "Bảo trì";
};

type CalendarBookingItem = {
  BookingID: number;
  BookingDate: string;
  StartTime: string;
  EndTime: string;
  Purpose: string;
  BookingStatus: "Đã đặt" | "Đã hủy";
  CancelledAt?: string | null;
  ResourceID: number;
  ResourceName: string;
  ResourceType: "Phòng họp" | "Phòng lab";
  FullName: string;
  EmployeeCode: string;
};

type ResourceCalendarProps = {
  rooms: RoomItem[];
  calendarBookings: CalendarBookingItem[];
  currentUser: {
    id: number;
    role: "Admin" | "Staff";
  };
  renderStatusBadge: (status: string) => React.ReactNode;
};

const timeSlots = [
  { start: "07:00", end: "09:00", label: "07:00 - 09:00" },
  { start: "09:00", end: "11:00", label: "09:00 - 11:00" },
  { start: "13:00", end: "15:00", label: "13:00 - 15:00" },
  { start: "15:00", end: "17:00", label: "15:00 - 17:00" },
];

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("vi-VN");
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function buildWeekDays(baseDate: Date) {
  const start = startOfWeek(baseDate);
  const labels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  return Array.from({ length: 7 }).map((_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);

    return {
      label: labels[index],
      date: formatDate(current),
      dateText: formatDisplayDate(current),
    };
  });
}

function overlaps(slotStart: string, slotEnd: string, bookingStart: string, bookingEnd: string) {
  return !(bookingEnd <= slotStart || bookingStart >= slotEnd);
}

export default function ResourceCalendar({
  rooms,
  calendarBookings,
}: ResourceCalendarProps) {
  const [selectedType, setSelectedType] = useState<"Tất cả" | "Phòng họp" | "Phòng lab">(
    "Tất cả"
  );
  const [capacityFilter, setCapacityFilter] = useState("");
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const datePickerRef = useRef<DatePicker | null>(null);

  const weekDays = useMemo(() => buildWeekDays(currentWeekDate), [currentWeekDate]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((item) => {
      const matchType =
        selectedType === "Tất cả" ? true : item.ResourceType === selectedType;

      const matchCapacity =
        capacityFilter.trim() === ""
          ? true
          : item.Capacity >= Number(capacityFilter);

      return matchType && matchCapacity;
    });
  }, [rooms, selectedType, capacityFilter]);

  const getSlotStatus = (
    roomName: string,
    date: string,
    slotStart: string,
    slotEnd: string
  ): "Trống" | "Đã đặt" | "Đã hủy" => {
    const relatedBookings = calendarBookings.filter(
      (item) =>
        item.ResourceName === roomName &&
        item.BookingDate.startsWith(date) &&
        overlaps(slotStart, slotEnd, item.StartTime, item.EndTime)
    );

    if (relatedBookings.length === 0) {
      return "Trống";
    }

    const activeCancelled = relatedBookings.find((item) => {
      if (item.BookingStatus !== "Đã hủy" || !item.CancelledAt) return false;
      const cancelledAt = new Date(item.CancelledAt);
      const now = new Date();
      const diffMs = now.getTime() - cancelledAt.getTime();
      return diffMs <= 5 * 60 * 1000;
    });

    const activeBooked = relatedBookings.find((item) => item.BookingStatus === "Đã đặt");

    if (activeBooked) return "Đã đặt";
    if (activeCancelled) return "Đã hủy";
    return "Trống";
  };

  const getSlotClass = (status: string) => {
    if (status === "Trống") {
      return "border border-emerald-100 bg-emerald-50 text-emerald-700";
    }
    if (status === "Đã hủy") {
      return "border border-slate-200 bg-slate-100 text-slate-700";
    }
    return "border border-rose-100 bg-rose-50 text-rose-700";
  };

  const goToPreviousWeek = () => {
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() - 7);
    setCurrentWeekDate(next);
  };

  const goToNextWeek = () => {
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() + 7);
    setCurrentWeekDate(next);
  };

  const handleJumpToDate = (date: Date | null) => {
    if (!date) return;
    setCurrentWeekDate(startOfWeek(date));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={goToPreviousWeek}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Tuần trước
            </button>

            <button
              type="button"
              onClick={() => datePickerRef.current?.setOpen(true)}
              className="inline-flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-800 transition hover:bg-slate-50"
              aria-label="Mở lịch để chọn ngày"
              title="Chọn ngày"
            >
              <span>{weekDays[0].dateText} - {weekDays[6].dateText}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-500"
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

            <div className="relative">
              <DatePicker
                ref={datePickerRef}
                selected={currentWeekDate}
                onChange={handleJumpToDate}
                dateFormat="dd/MM/yyyy"
                placeholderText="Chọn ngày"
                className="sr-only"
                customInput={<span />}
              />
            </div>

            <button
              onClick={goToNextWeek}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Tuần sau
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value as "Tất cả" | "Phòng họp" | "Phòng lab")
              }
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 outline-none"
            >
              <option value="Tất cả">Tất cả phòng</option>
              <option value="Phòng họp">Phòng họp</option>
              <option value="Phòng lab">Phòng lab</option>
            </select>

            <input
              type="number"
              min="1"
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
              placeholder="Sức chứa tối đa"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 outline-none"
            />

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-200"></span>
                <span className="text-slate-600">Trống</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-200"></span>
                <span className="text-slate-600">Đã đặt</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-300"></span>
                <span className="text-slate-600">Đã hủy</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1200px] border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50">
                <th className="min-w-[220px] border-b border-r border-slate-200 px-4 py-4 text-left text-sm font-semibold text-slate-700">
                  Phòng
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.date}
                    className="min-w-[145px] border-b border-r border-slate-200 px-3 py-4 text-center last:border-r-0"
                  >
                    <div className="text-sm font-semibold text-slate-800">
                      {day.label}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{day.dateText}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.ResourceID}>
                  <td className="border-r border-b border-slate-200 px-4 py-4 align-top">
                    <div className="text-lg font-semibold text-slate-900">
                      {room.ResourceName}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {room.ResourceType} • Sức chứa {room.Capacity}
                    </div>
                  </td>

                  {weekDays.map((day) => (
                    <td
                      key={`${room.ResourceID}-${day.date}`}
                      className="border-r border-b border-slate-200 p-2 align-top last:border-r-0"
                    >
                      <div className="space-y-2">
                        {timeSlots.map((slot) => {
                          const status = getSlotStatus(
                            room.ResourceName,
                            day.date,
                            slot.start,
                            slot.end
                          );

                          return (
                            <div
                              key={slot.label}
                              className={`rounded-lg px-2.5 py-2 text-xs ${getSlotClass(
                                status
                              )}`}
                            >
                              <div className="font-medium">{slot.label}</div>
                              <div className="mt-1 font-semibold">{status}</div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}

              {filteredRooms.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Không có phòng phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

