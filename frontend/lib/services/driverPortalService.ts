import { supabase } from "@/lib/supabase";
import type { ServiceResponse } from "@/lib/types";

export interface DriverProfile {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  license_number?: string | null;
  license_expiry?: string | null;
  status?: string;
  firebase_uid?: string | null;
}

export interface DriverTrip {
  id: string;
  owner_id: string;
  vehicle_id: string;
  driver_id: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date?: string | null;
  distance_km?: number | null;
  freight_amount: number;
  driver_advance?: number | null;
  status: string;
  material?: string | null;
  weight_tonnes?: number | null;
  notes?: string | null;
  doc_number?: string | null;
  vehicles?: { registration_number: string; make?: string; model?: string } | null;
}

export interface VehicleIssue {
  id?: string;
  owner_id: string;
  driver_id: string;
  vehicle_id: string;
  trip_id?: string | null;
  issue_type: string;
  description: string;
  severity: string;
  status?: string;
  image_url?: string | null;
}

function ok<T>(data: T): ServiceResponse<T> { return { success: true, data }; }
function fail(e: any): ServiceResponse<any> {
  return { success: false, error: e?.message ?? String(e) };
}

export const driverPortalService = {
  // ── Profile ──────────────────────────────────────────────────────────────────

  async getProfileByPhone(phone: string): Promise<ServiceResponse<DriverProfile>> {
    const normalized = phone.replace(/\D/g, "").slice(-10);
    const { data, error } = await supabase.rpc("get_driver_by_phone", { p_phone: normalized });
    if (error) return fail(error);
    if (!data || (Array.isArray(data) && data.length === 0)) return fail({ message: "No driver account found for this phone number. Ask your fleet manager to register you first." });
    const row = Array.isArray(data) ? data[0] : data;
    return ok(row as DriverProfile);
  },

  async linkFirebaseUid(driverId: string, firebaseUid: string): Promise<ServiceResponse<null>> {
    const { error } = await supabase.rpc("link_driver_firebase_uid", { p_driver_id: driverId, p_firebase_uid: firebaseUid });
    if (error) return fail(error);
    return ok(null);
  },

  async getProfileByUid(): Promise<ServiceResponse<DriverProfile>> {
    const { data, error } = await supabase
      .from("drivers")
      .select("id, owner_id, name, phone, license_number, license_expiry, status, firebase_uid")
      .maybeSingle();
    if (error) return fail(error);
    if (!data) return fail({ message: "Driver profile not found." });
    return ok(data as DriverProfile);
  },

  // ── Trips ─────────────────────────────────────────────────────────────────────

  async getActiveTrips(driverId: string): Promise<ServiceResponse<DriverTrip[]>> {
    const { data, error } = await supabase
      .from("trips")
      .select("*, vehicles(registration_number, make, model)")
      .eq("driver_id", driverId)
      .in("status", ["planned", "in_progress"])
      .order("start_date", { ascending: false });
    if (error) return fail(error);
    return ok((data ?? []) as DriverTrip[]);
  },

  async getTripById(tripId: string): Promise<ServiceResponse<DriverTrip & {
    expenses: any[]; fuel_logs: any[]; toll_logs: any[]; misc_expenses: any[];
  }>> {
    const [tripRes, expRes, fuelRes, tollRes, miscRes] = await Promise.all([
      supabase.from("trips").select("*, vehicles(registration_number, make, model)").eq("id", tripId).single(),
      supabase.from("expenses").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("fuel_logs").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("toll_logs").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("misc_expenses").select("*").eq("trip_id", tripId).order("date"),
    ]);
    if (tripRes.error) return fail(tripRes.error);
    return ok({
      ...tripRes.data,
      expenses:      expRes.data  ?? [],
      fuel_logs:     fuelRes.data ?? [],
      toll_logs:     tollRes.data ?? [],
      misc_expenses: miscRes.data ?? [],
    } as any);
  },

  async updateTripStatus(
    tripId: string,
    status: "in_progress" | "completed",
    updates: Partial<{ end_date: string; notes: string }>= {}
  ): Promise<ServiceResponse<null>> {
    const { error } = await supabase
      .from("trips")
      .update({ status, ...updates })
      .eq("id", tripId);
    if (error) return fail(error);
    return ok(null);
  },

  async getCompletedTrips(driverId: string): Promise<ServiceResponse<DriverTrip[]>> {
    const { data, error } = await supabase
      .from("trips")
      .select("*, vehicles(registration_number, make, model)")
      .eq("driver_id", driverId)
      .eq("status", "completed")
      .order("end_date", { ascending: false })
      .limit(50);
    if (error) return fail(error);
    return ok((data ?? []) as DriverTrip[]);
  },

  // ── Expenses ─────────────────────────────────────────────────────────────────

  async addExpense(
    tripId: string,
    ownerId: string,
    vehicleId: string,
    data: { expense_type: string; amount: number; date: string; description?: string }
  ): Promise<ServiceResponse<any>> {
    const { data: row, error } = await supabase
      .from("expenses")
      .insert({ trip_id: tripId, owner_id: ownerId, ...data })
      .select().single();
    if (error) return fail(error);
    return ok(row);
  },

  async addFuelLog(
    tripId: string,
    ownerId: string,
    vehicleId: string,
    data: { date: string; litres: number; amount: number; odometer_km?: number; fuel_station?: string; notes?: string }
  ): Promise<ServiceResponse<any>> {
    const { data: row, error } = await supabase
      .from("fuel_logs")
      .insert({ trip_id: tripId, owner_id: ownerId, vehicle_id: vehicleId, ...data })
      .select().single();
    if (error) return fail(error);
    return ok(row);
  },

  async addTollLog(
    tripId: string,
    ownerId: string,
    vehicleId: string,
    data: { date: string; amount: number; toll_plaza?: string; route?: string; payment_mode?: string }
  ): Promise<ServiceResponse<any>> {
    const { data: row, error } = await supabase
      .from("toll_logs")
      .insert({ trip_id: tripId, owner_id: ownerId, vehicle_id: vehicleId, ...data })
      .select().single();
    if (error) return fail(error);
    return ok(row);
  },

  async addMiscExpense(
    tripId: string,
    ownerId: string,
    vehicleId: string,
    data: { date: string; amount: number; category: string; description?: string }
  ): Promise<ServiceResponse<any>> {
    const { data: row, error } = await supabase
      .from("misc_expenses")
      .insert({ trip_id: tripId, owner_id: ownerId, vehicle_id: vehicleId, ...data })
      .select().single();
    if (error) return fail(error);
    return ok(row);
  },

  // ── Image upload ──────────────────────────────────────────────────────────────

  async uploadExpenseImage(
    file: File,
    driverId: string,
    tripId: string
  ): Promise<ServiceResponse<string>> {
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${driverId}/${tripId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("driver-uploads")
      .upload(path, file, { upsert: false });
    if (error) return fail(error);
    const { data: { publicUrl } } = supabase.storage
      .from("driver-uploads")
      .getPublicUrl(path);
    return ok(publicUrl);
  },

  // ── Vehicle issues ────────────────────────────────────────────────────────────

  async reportIssue(issue: VehicleIssue): Promise<ServiceResponse<any>> {
    const { data, error } = await supabase
      .from("vehicle_issues")
      .insert(issue)
      .select().single();
    if (error) return fail(error);
    return ok(data);
  },

  async getMyIssues(driverId: string): Promise<ServiceResponse<any[]>> {
    const { data, error } = await supabase
      .from("vehicle_issues")
      .select("*, vehicles(registration_number)")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });
    if (error) return fail(error);
    return ok(data ?? []);
  },

  // ── Owner contact ─────────────────────────────────────────────────────────────

  async getOwnerContact(ownerId: string): Promise<ServiceResponse<{ name: string; phone: string | null }>> {
    const { data, error } = await supabase
      .from("users")
      .select("name, phone")
      .eq("id", ownerId)
      .single();
    if (error) return fail(error);
    return ok(data as { name: string; phone: string | null });
  },

  // ── Payments ─────────────────────────────────────────────────────────────────

  async getPayments(driverId: string): Promise<ServiceResponse<any[]>> {
    const { data, error } = await supabase
      .from("driver_payments")
      .select("*")
      .eq("driver_id", driverId)
      .order("date", { ascending: false })
      .limit(50);
    if (error) return fail(error);
    return ok(data ?? []);
  },
};
