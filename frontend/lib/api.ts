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
export const getTrips     = () => api.get("/trips/");
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
export const getParties    = (party_type?: string) => api.get("/parties/", { params: party_type ? { party_type } : {} });
export const createParty   = (data: any) => api.post("/parties/", data);
export const updateParty   = (id: string, data: any) => api.patch(`/parties/${id}`, data);
export const deleteParty   = (id: string) => api.delete(`/parties/${id}`);
