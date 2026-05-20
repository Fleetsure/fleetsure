import axios from "axios";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach Firebase JWT to requests to Python backend (PDF, export, billing)
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      await signOut(auth);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Documents (download only — upload/list via db.ts) ─────
export const downloadDocument = (id: string) => api.get(`/documents/${id}/download`);

// ── PDF ───────────────────────────────────────────────────
export const getTripPdf = (tripId: string) =>
  api.get(`/trips/${tripId}/pdf`, { responseType: "blob" });

// ── Export ────────────────────────────────────────────────
export const exportData = (format: "xlsx" | "csv" = "xlsx") =>
  api.get("/export/", { params: { format }, responseType: "blob" });

// ── Billing ───────────────────────────────────────────────
export const getBillingStatus = () => api.get("/billing/status");
export const subscribePlan    = (plan: string) => api.post(`/billing/subscribe/${plan}`);
export const cancelBilling    = () => api.post("/billing/cancel");

// ── Vahan RC Lookup (external proxy, keep in Python) ──────
export const vahanLookup = (params: Record<string, string>) => api.get("/vahan/lookup", { params });
export const vahanStatus = () => api.get("/vahan/status");

// ── Parivahan DL Lookup ───────────────────────────────────
export const dlLookup = (dl_no: string, dob: string) => api.get("/dl/lookup", { params: { dl_no, dob } });

// ── Suggestions ──────────────────────────────────────────
export const suggestVehicles    = (origin: string) => api.get("/suggestions/vehicles", { params: { origin } });
export const driverFatigueCheck = (driver_id: string) => api.get("/suggestions/driver-fatigue", { params: { driver_id } });

// ── Analytics (server-side aggregations) ─────────────────
export const getAnalyticsOverview  = (days = 30) => api.get("/analytics/overview",  { params: { days } });
export const getAnalyticsMonthly   = ()           => api.get("/analytics/monthly");
export const getAnalyticsVehicles  = (days = 30) => api.get("/analytics/vehicles",  { params: { days } });
export const getAnalyticsExpenses  = (days = 30) => api.get("/analytics/expenses",  { params: { days } });
export const getDailySummary       = ()           => api.get("/analytics/daily-summary");
export const getFuelAnalytics      = ()           => api.get("/fuel/analytics");
export const getVehiclePnLApi      = ()           => api.get("/pnl/vehicles");
