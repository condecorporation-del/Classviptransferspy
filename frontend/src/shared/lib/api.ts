/**
 * API base URL for fetch calls.
 * Points to the Python backend (no trailing path).
 */
export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim() || "http://localhost:8000";
  return configured.replace(/\/+$/, "");
};
