const fallbackApiBase = "http://localhost:5000";
const productionApiBase = "https://isd-web-5lms.onrender.com";

const runtimeFallbackApiBase =
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? productionApiBase
    : fallbackApiBase;

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || runtimeFallbackApiBase).trim();
