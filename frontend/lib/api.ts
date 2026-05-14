import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ── Auth interceptor: attach JWT to every request ─────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: redirect to login on 401 ────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const register = (data: { name: string; email: string; password: string }) =>
  api.post("/auth/register", data);
export const login = (data: { email: string; password: string }) =>
  api.post("/auth/login", data);
export const getMe = () => api.get("/auth/me");

// ── Vehicles ─────────────────────────────────────────────
export const getVehicles  = () => api.get("/vehicles/");
export const createVehicle = (data: any) => api.post("/vehicles/", data);
export const updateVehicle = (id: string, data: any) => api.patch(`/vehicles/${id}`, data);

// ── Drivers ──────────────────────────────────────────────
export const getDrivers   = () => api.get("/drivers/");
export const createDriver = (data: any) => api.post("/drivers/", data);
export const updateDriver = (id: string, data: any) => api.patch(`/drivers/${id}`, data);

// ── Trips ─────────────────────────────────────────────────
export const getTrips     = (limit = 200) => api.get("/trips/", { params: { limit } });
export const createTrip   = (data: any) => api.post("/trips/", data);
export const getTripDetail = (id: string) => api.get(`/trips/${id}`);
export const updateTrip   = (id: string, data: any) => api.patch(`/trips/${id}`, data);
export const getTripProfit = (id: string) => api.get(`/trips/${id}/profit`);

// ── Vahan RC Lookup ───────────────────────────────────────
export const vahanLookup = (params: Record<string, string>) => api.get("/vahan/lookup", { params });
export const vahanStatus = () => api.get("/vahan/status");

// ── Parivahan DL Lookup ───────────────────────────────────
export const dlLookup = (dl_no: string, dob: string) => api.get("/dl/lookup", { params: { dl_no, dob } });

// ── Expenses ──────────────────────────────────────────────
export const getTripExpenses = (tripId: string) => api.get(`/trips/${tripId}/expenses/`);
export const addExpense      = (tripId: string, data: any) => api.post(`/trips/${tripId}/expenses/`, data);

// ── Fuel Logs ─────────────────────────────────────────────
export const getFuelLogs     = (vehicle_id?: string) => api.get("/fuel/", { params: vehicle_id ? { vehicle_id } : {} });
export const addFuelLog      = (data: any) => api.post("/fuel/", data);
export const deleteFuelLog   = (id: string) => api.delete(`/fuel/${id}`);
export const getFuelAnalytics = () => api.get("/fuel/analytics");

// ── Driver Payments ───────────────────────────────────────
export const getDriverPayments  = (driver_id?: string) => api.get("/driver-payments/", { params: driver_id ? { driver_id } : {} });
export const addDriverPayment   = (data: any) => api.post("/driver-payments/", data);
export const deleteDriverPayment = (id: string) => api.delete(`/driver-payments/${id}`);
export const getDriverLedger    = (driver_id: string) => api.get(`/driver-payments/ledger/${driver_id}`);

// ── Parties ───────────────────────────────────────────────
export const getVehiclePnL = () => api.get("/pnl/vehicles");

export const getParties    = (party_type?: string) => api.get("/parties/", { params: party_type ? { party_type } : {} });
export const createParty   = (data: any) => api.post("/parties/", data);
export const updateParty   = (id: string, data: any) => api.patch(`/parties/${id}`, data);
export const deleteParty   = (id: string) => api.delete(`/parties/${id}`);

export const getPolicies     = (vehicle_id?: string) => api.get("/insurance/", { params: vehicle_id ? { vehicle_id } : {} });
export const createPolicy    = (data: any) => api.post("/insurance/", data);
export const deletePolicy    = (id: string) => api.delete(`/insurance/${id}`);

export const getDocuments    = (vehicle_id?: string) => api.get("/documents/", { params: vehicle_id ? { vehicle_id } : {} });
export const uploadDocument  = (data: any) => api.post("/documents/", data);
export const downloadDocument = (id: string) => api.get(`/documents/${id}/download`);
export const deleteDocument  = (id: string) => api.delete(`/documents/${id}`);

// ── Tolls ─────────────────────────────────────────────────
export const getTollLogs  = (vehicle_id?: string) => api.get("/tolls/", { params: vehicle_id ? { vehicle_id } : {} });
export const addTollLog   = (data: any) => api.post("/tolls/", data);
export const deleteTollLog = (id: string) => api.delete(`/tolls/${id}`);

// ── Tyres ─────────────────────────────────────────────────
export const getTyreLogs  = (vehicle_id?: string) => api.get("/tyres/", { params: vehicle_id ? { vehicle_id } : {} });
export const addTyreLog   = (data: any) => api.post("/tyres/", data);
export const deleteTyreLog = (id: string) => api.delete(`/tyres/${id}`);

// ── Misc Expenses ─────────────────────────────────────────
export const getMiscExpenses  = (vehicle_id?: string) => api.get("/misc-expenses/", { params: vehicle_id ? { vehicle_id } : {} });
export const addMiscExpense   = (data: any) => api.post("/misc-expenses/", data);
export const deleteMiscExpense = (id: string) => api.delete(`/misc-expenses/${id}`);


// ── Operational Insights ──────────────────────────────────
export const getInsights      = (include_dismissed = false) => api.get("/insights/", { params: { include_dismissed } });
export const refreshInsights  = () => api.post("/insights/refresh");
export const markInsightRead  = (id: string) => api.patch(`/insights/${id}/read`);
export const markAllRead      = () => api.patch("/insights/read-all");
export const dismissInsight   = (id: string) => api.patch(`/insights/${id}/dismiss`);

// ── Suggestions (Phase 2) ─────────────────────────────────
export const suggestVehicles   = (origin: string) => api.get("/suggestions/vehicles", { params: { origin } });
export const driverFatigueCheck = (driver_id: string) => api.get("/suggestions/driver-fatigue", { params: { driver_id } });

// ── Analytics (Phase 3) ───────────────────────────────────
export const getAnalyticsOverview  = (days = 30) => api.get("/analytics/overview",  { params: { days } });
export const getAnalyticsMonthly   = ()           => api.get("/analytics/monthly");
export const getAnalyticsVehicles  = (days = 30) => api.get("/analytics/vehicles",  { params: { days } });
export const getAnalyticsExpenses  = (days = 30) => api.get("/analytics/expenses",  { params: { days } });

// ── WhatsApp (Phase 5) ────────────────────────────────────
export const getDailySummary = () => api.get("/analytics/daily-summary");

// ── Marketplace (Phase 6) ─────────────────────────────────
export const getMarketplaceLoads = (params?: { from_city?: string; to_city?: string; from_date?: string; to_date?: string }) =>
  api.get("/marketplace/loads", { params });
export const getMyLoads          = () => api.get("/marketplace/loads/mine");
export const postReturnLoad      = (data: any) => api.post("/marketplace/loads", data);
export const updateReturnLoad    = (id: string, data: any) => api.patch(`/marketplace/loads/${id}`, data);
export const cancelReturnLoad    = (id: string) => api.delete(`/marketplace/loads/${id}`);
export const expressInterest     = (loadId: string, data: { message?: string }) =>
  api.post(`/marketplace/loads/${loadId}/interest`, data);
export const getInterestsReceived = () => api.get("/marketplace/interests/received");
export const getInterestsSent     = () => api.get("/marketplace/interests/sent");
export const updateInterest       = (id: string, data: { status?: string; rating?: number }) =>
  api.patch(`/marketplace/interests/${id}`, data);
