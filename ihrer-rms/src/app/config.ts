const fallbackApiBase = "http://localhost:5000";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.trim() || fallbackApiBase;
