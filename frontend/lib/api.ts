import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

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
