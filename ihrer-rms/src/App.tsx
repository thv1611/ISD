import { useEffect, useMemo, useRef, useState } from "react";
import LoginPage from "./app/pages/LoginPage";
import DashboardPage from "./app/pages/DashboardPage";
import ResourceCalendar from "./app/pages/ResourceCalendar";
import ManageUsers from "./app/pages/ManageUsers";
import BookingPage from "./app/pages/BookingPage";
import BookingHistoryPage from "./app/pages/BookingHistoryPage";

type Role = "Admin" | "Staff";
type PageKey = "dashboard" | "calendar" | "booking" | "history" | "users" | "profile";
type LoggedInUser = {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  role: Role;
};

type DashboardSummary = {
  totalResources: number;
  totalUsers: number;
  totalBooked: number;
  totalCancelled: number;
};

type ResourceItem = {
  ResourceID: number;
  ResourceCode: string;
  ResourceName: string;
  ResourceType: "Phòng họp" | "Phòng lab";
  Capacity: number;
  ResourceStatus: "Sẵn sàng" | "Bảo trì";
  Location?: string;
  Description?: string;
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

type MyBookingItem = {
  BookingID: number;
  BookingDate: string;
  StartTime: string;
  EndTime: string;
  Purpose: string;
  BookingStatus: "Đã đặt" | "Đã hủy";
  CancelledAt?: string | null;
  ResourceName: string;
  ResourceType: "Phòng họp" | "Phòng lab";
};

type UserItem = {
  EmployeeID: number;
  EmployeeCode: string;
  FullName: string;
  Email: string;
  Role: Role;
  AccountStatus: "Active" | "Locked";
};

const API_BASE = "http://localhost:5000";
const INACTIVE_TIMEOUT = 60 * 60 * 1000;
const DASHBOARD_REFRESH_INTERVAL = 30 * 1000;
const TOKEN_KEY = "ihrer_auth_token";
const USER_KEY = "ihrer_auth_user";

export default function App() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [currentPage, setCurrentPage] = useState<PageKey>("dashboard");
  const [authToken, setAuthToken] = useState<string>("");

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>({
    totalResources: 0,
    totalUsers: 0,
    totalBooked: 0,
    totalCancelled: 0,
  });

  const [rooms, setRooms] = useState<ResourceItem[]>([]);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBookingItem[]>([]);
  const [myBookings, setMyBookings] = useState<MyBookingItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  const inactivityTimerRef = useRef<number | null>(null);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  });

  const handleLogout = (showMessage = false) => {
    setCurrentUser(null);
    setAuthToken("");
    setCurrentPage("dashboard");
    setMyBookings([]);
    setUsers([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }

    if (showMessage) {
      alert("Phiên đăng nhập đã hết hạn do không hoạt động trong 60 phút.");
    }
  };

  const handleUnauthorizedIfNeeded = (res: Response, data: any) => {
    if (res.status === 401) {
      handleLogout(true);
      return true;
    }

    if (res.status === 403 && data?.message?.includes("không có quyền")) {
      alert(data.message);
      return true;
    }

    return false;
  };

  const loadDashboard = async () => {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (handleUnauthorizedIfNeeded(res, data)) return;
    if (data.success) setDashboardSummary(data.data);
  };

  const loadRooms = async () => {
    const res = await fetch(`${API_BASE}/resources`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (handleUnauthorizedIfNeeded(res, data)) return;
    if (data.success) setRooms(data.data);
  };

  const loadCalendar = async () => {
    const res = await fetch(`${API_BASE}/bookings/calendar`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (handleUnauthorizedIfNeeded(res, data)) return;
    if (data.success) setCalendarBookings(data.data);
  };

  const loadUsers = async () => {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (handleUnauthorizedIfNeeded(res, data)) return;
    if (data.success) setUsers(data.data);
  };

  const loadMyBookings = async (employeeId: number) => {
    const res = await fetch(`${API_BASE}/bookings/my/${employeeId}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (handleUnauthorizedIfNeeded(res, data)) return;
    if (data.success) setMyBookings(data.data);
  };

  const refreshAll = async (employeeId?: number) => {
    await Promise.all([loadDashboard(), loadRooms(), loadCalendar()]);
    if (currentUser?.role === "Admin") {
      await loadUsers();
    }
    if ((employeeId || currentUser?.id) && currentUser?.role === "Staff") {
      await loadMyBookings(employeeId || currentUser!.id);
    }
  };

  const resetInactivityTimer = () => {
    if (!currentUser) return;

    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = window.setTimeout(() => {
      handleLogout(true);
    }, INACTIVE_TIMEOUT);
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);

    if (token && user) {
      setAuthToken(token);
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  useEffect(() => {
    if (currentUser && authToken) {
      refreshAll(currentUser.id);
    }
  }, [currentUser, authToken]);
  useEffect(() => {
    if (!currentUser || !authToken) return;
    if (currentPage !== "dashboard") return;

    const intervalId = window.setInterval(() => {
      loadDashboard();
    }, DASHBOARD_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentUser, authToken, currentPage]);

  useEffect(() => {
    if (!currentUser) return;

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    resetInactivityTimer();

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity);
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });

      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [currentUser]);

  const handleLoginSuccess = (user: LoggedInUser, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    setCurrentPage("dashboard");
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const roleLabel: Record<Role, string> = {
    Admin: "Quản trị viên",
    Staff: "Nhân viên",
  };

  const renderStatusBadge = (status: string) => {
    let className = "inline-flex rounded-full px-3 py-1 text-xs font-semibold ";

    if (status === "Hoạt động" || status === "Active" || status === "Trống") {
      className += "bg-emerald-100 text-emerald-700";
    } else if (status === "Đã khóa" || status === "Locked" || status === "Đã hủy") {
      className += "bg-slate-200 text-slate-700";
    } else if (status === "Đã đặt") {
      className += "bg-rose-100 text-rose-700";
    } else if (status === "Sẵn sàng") {
      className += "bg-blue-100 text-blue-700";
    } else {
      className += "bg-slate-100 text-slate-700";
    }

    return <span className={className}>{status}</span>;
  };

  const pageTitle = useMemo(() => {
    switch (currentPage) {
      case "dashboard":
        return "Trang tổng quan";
      case "calendar":
        return "Lịch phòng/lab";
      case "booking":
        return "Đặt phòng";
      case "history":
        return "Lịch sử đặt phòng";
      case "users":
        return "Quản lý người dùng";
      case "profile":
        return "Thông tin cá nhân";
      default:
        return "";
    }
  }, [currentPage]);

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 h-screen w-72 border-r border-slate-200 bg-white p-6">
        <div className="mb-8">
          <div className="mb-4 flex justify-center">
            <img src="/logo.png" alt="Logo IHRER" className="h-16 w-auto object-contain" />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Viện thủy điện và năng lượng tái tạo
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Website nội bộ quản lý đặt lịch phòng họp và phòng lab
          </p>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className={`w-full rounded-2xl px-4 py-3 text-left ${currentPage === "dashboard"
              ? "bg-blue-600 text-white"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
          >
            Trang tổng quan
          </button>

          <button
            onClick={() => setCurrentPage("calendar")}
            className={`w-full rounded-2xl px-4 py-3 text-left ${currentPage === "calendar"
              ? "bg-blue-600 text-white"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
          >
            Lịch phòng/lab
          </button>

          {currentUser.role === "Staff" && (
            <>
              <button
                onClick={() => setCurrentPage("booking")}
                className={`w-full rounded-2xl px-4 py-3 text-left ${currentPage === "booking"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
              >
                Đặt phòng
              </button>
              <button
                onClick={() => setCurrentPage("profile")}
                className={`w-full rounded-2xl px-4 py-3 text-left ${currentPage === "profile"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
              >
                Thông tin cá nhân
              </button>
              <button
                onClick={() => setCurrentPage("history")}
                className={`w-full rounded-2xl px-4 py-3 text-left ${currentPage === "history"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
              >
                Lịch sử đặt phòng
              </button>
            </>
          )}

          {currentUser.role === "Admin" && (
            <button
              onClick={() => setCurrentPage("users")}
              className={`w-full rounded-2xl px-4 py-3 text-left ${currentPage === "users"
                ? "bg-blue-600 text-white"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
            >
              Quản lý người dùng
            </button>
          )}
        </nav>
      </aside>

      <main className="ml-72 p-8">
        <div className="mb-6 flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div>
            <div className="text-sm text-slate-500">Xin chào</div>
            <div className="text-xl font-bold text-slate-900">{currentUser.fullName}</div>
            <div className="mt-1 text-sm text-slate-500">
              {roleLabel[currentUser.role]} • {currentUser.employeeCode}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm text-slate-500">
              <div>{pageTitle}</div>
              <div>{currentUser.email}</div>
            </div>
            <button
              onClick={() => handleLogout(false)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {currentPage === "dashboard" && <DashboardPage summary={dashboardSummary} />}

        {currentPage === "calendar" && (
          <ResourceCalendar
            rooms={rooms}
            calendarBookings={calendarBookings}
            currentUser={currentUser}
            renderStatusBadge={renderStatusBadge}
          />
        )}

        {currentPage === "booking" && currentUser.role === "Staff" && (
          <BookingPage
            currentUser={currentUser}
            authToken={authToken}
            roomOptions={rooms.filter((item) => item.ResourceStatus === "Sẵn sàng")}
            onBookingSuccess={() => refreshAll()}
          />
        )}

        {currentPage === "history" && currentUser.role === "Staff" && (
          <BookingHistoryPage
            bookings={myBookings}
            authToken={authToken}
            currentUser={currentUser}
            renderStatusBadge={renderStatusBadge}
            onRefresh={() => refreshAll()}
          />
        )}
        {currentPage === "profile" && (
          <ProfilePage
            authToken={authToken}
            currentUser={currentUser}
            onProfileUpdated={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
            }}
          />
        )}
        {currentPage === "users" && currentUser.role === "Admin" && (
          <ManageUsers
            authToken={authToken}
            userList={users}
            renderStatusBadge={renderStatusBadge}
            onRefresh={loadUsers}
          />
        )}
      </main>
    </div>
  );
}
import ProfilePage from "./app/pages/ProfilePage";