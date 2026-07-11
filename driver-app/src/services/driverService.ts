import { supabase } from "../config/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

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

export interface TripDetail extends DriverTrip {
  fuel_logs: any[];
  toll_logs: any[];
  misc_expenses: any[];
  expenses: any[];
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

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function ok<T>(data: T): ServiceResponse<T> {
  return { success: true, data };
}
function fail(e: any): ServiceResponse<any> {
  return { success: false, error: e?.message ?? String(e) };
}

export const driverService = {
  // ── Profile ──────────────────────────────────────────────────────────────────

  async getProfileByPhone(phone: string): Promise<ServiceResponse<DriverProfile>> {
    const normalized = phone.replace(/\D/g, "").slice(-10);
    const { data, error } = await supabase.rpc("get_driver_by_phone", {
      p_phone: normalized,
    });
    if (error) return fail(error);
    if (!data || (Array.isArray(data) && data.length === 0))
      return fail({ message: "No driver account found for this phone number." });
    const row = Array.isArray(data) ? data[0] : data;
    return ok(row as DriverProfile);
  },

  async linkFirebaseUid(driverId: string, firebaseUid: string): Promise<ServiceResponse<null>> {
    const { error } = await supabase.rpc("link_driver_firebase_uid", {
      p_driver_id: driverId,
      p_firebase_uid: firebaseUid,
    });
    if (error) return fail(error);
    return ok(null);
  },

  // ── Trips ────────────────────────────────────────────────────────────────────

  async getActiveTrips(driverId: string): Promise<ServiceResponse<DriverTrip[]>> {
    const { data, error } = await supabase
      .rpc("get_active_driver_trips", { p_driver_id: driverId });
    if (error) return fail(error);
    return ok((data ?? []) as DriverTrip[]);
  },

  async getTripById(tripId: string, driverId?: string): Promise<ServiceResponse<TripDetail>> {
    // Fetch trip + expenses in parallel. Filter by driver_id too so driver-scoped
    // RLS policies can match. Expenses are fetched by trip_id only.
    const tripQuery = supabase
      .from("trips")
      .select("*, vehicles(registration_number, make, model)")
      .eq("id", tripId);
    if (driverId) tripQuery.eq("driver_id", driverId);

    const [tripRes, fuelRes, tollRes, miscRes, expRes] = await Promise.all([
      tripQuery.single(),
      supabase.from("fuel_logs").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("toll_logs").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("misc_expenses").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("expenses").select("*").eq("trip_id", tripId).order("date"),
    ]);

    let tripData = tripRes.data as any;

    // Fallback: direct query blocked by RLS → find the trip via the working RPCs
    if (!tripData && driverId) {
      const [activeRes, completedRes] = await Promise.all([
        supabase.rpc("get_active_driver_trips", { p_driver_id: driverId }),
        supabase.rpc("get_completed_driver_trips", { p_driver_id: driverId }),
      ]);
      const all = [...(activeRes.data ?? []), ...(completedRes.data ?? [])];
      tripData = all.find((t: any) => t.id === tripId) ?? null;
    }

    if (!tripData) return fail(tripRes.error ?? { message: "Trip not found." });

    return ok({
      ...tripData,
      fuel_logs: fuelRes.data ?? [],
      toll_logs: tollRes.data ?? [],
      misc_expenses: miscRes.data ?? [],
      expenses: expRes.data ?? [],
    } as TripDetail);
  },

  async updateTripStatus(
    tripId: string,
    status: string,
    updates?: { end_date?: string; notes?: string }
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
      .rpc("get_completed_driver_trips", { p_driver_id: driverId });
    if (error) return fail(error);
    return ok((data ?? []) as DriverTrip[]);
  },

  // ── Expenses ─────────────────────────────────────────────────────────────────

  async addFuelLog(
    tripId: string,
    ownerId: string,
    vehicleId: string,
    data: {
      date: string;
      litres: number;
      amount: number;
      odometer_km?: number | null;
      fuel_station?: string | null;
      notes?: string | null;
      image_url?: string | null;
    }
  ): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from("fuel_logs").insert({
      trip_id: tripId,
      owner_id: ownerId,
      vehicle_id: vehicleId,
      ...data,
    });
    if (error) return fail(error);
    return ok(null);
  },

  async addTollLog(
    tripId: string,
    ownerId: string,
    vehicleId: string,
    data: {
      date: string;
      amount: number;
      toll_plaza?: string | null;
      route?: string | null;
      payment_mode?: string;
    }
  ): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from("toll_logs").insert({
      trip_id: tripId,
      owner_id: ownerId,
      vehicle_id: vehicleId,
      ...data,
    });
    if (error) return fail(error);
    return ok(null);
  },

  async addMiscExpense(
    tripId: string,
    ownerId: string,
    vehicleId: string,
    data: {
      date: string;
      amount: number;
      category: string;
      description?: string | null;
      image_url?: string | null;
    }
  ): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from("misc_expenses").insert({
      trip_id: tripId,
      owner_id: ownerId,
      vehicle_id: vehicleId,
      ...data,
    });
    if (error) return fail(error);
    return ok(null);
  },

  // ── Driver Expenses (advance reconciliation claims) ─────────────────────────
  // Distinct from addMiscExpense above: this is a driver_id-scoped claim
  // against a trip's driver_advance, reviewed (approved/rejected) by the
  // owner on the web Driver Account page — not a generic trip expense.

  async addDriverExpense(
    tripId: string,
    driverId: string,
    ownerId: string,
    data: {
      amount: number;
      category: "fuel" | "food" | "loading" | "other";
      note?: string | null;
      receipt_url?: string | null;
    }
  ): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from("driver_expenses").insert({
      trip_id: tripId,
      driver_id: driverId,
      owner_id: ownerId,
      ...data,
    });
    if (error) return fail(error);
    // Mirror into the Documents Portal (documents table) so this receipt
    // shows up under "Expense Receipts" — owner_id is passed explicitly
    // since this app authenticates as the driver, not the fleet owner.
    if (data.receipt_url) {
      const catLabel = data.category.charAt(0).toUpperCase() + data.category.slice(1);
      await supabase.from("documents").insert({
        owner_id: ownerId,
        name: `${catLabel} Receipt — ${new Date().toISOString().slice(0, 10)}`,
        category: "Expense Receipts",
        file_url: data.receipt_url,
        linked_type: "trip",
        linked_id: tripId,
      });
    }
    return ok(null);
  },

  async getMyDriverExpenses(tripId: string): Promise<ServiceResponse<any[]>> {
    const { data, error } = await supabase
      .from("driver_expenses")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    if (error) return fail(error);
    return ok(data ?? []);
  },

  // ── Image Upload ─────────────────────────────────────────────────────────────

  async uploadExpenseImage(
    localUri: string,
    driverId: string,
    tripId: string
  ): Promise<ServiceResponse<string>> {
    try {
      const ext = localUri.split(".").pop() ?? "jpg";
      const path = `${driverId}/expenses/${tripId}/${Date.now()}.${ext}`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) return fail({ message: "File not found" });

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error } = await supabase.storage
        .from("fleet-documents")
        .upload(path, decode(base64), {
          contentType: `image/${ext}`,
          upsert: true,
        });
      if (error) return fail(error);

      const { data } = supabase.storage
        .from("fleet-documents")
        .getPublicUrl(path);
      return ok(data.publicUrl);
    } catch (e: any) {
      return fail(e);
    }
  },

  // ── Issues ───────────────────────────────────────────────────────────────────

  async reportIssue(issue: VehicleIssue): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from("vehicle_issues").insert(issue);
    if (error) return fail(error);
    return ok(null);
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

  async getOwnerContact(
    ownerId: string
  ): Promise<ServiceResponse<{ name: string; phone: string | null }>> {
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

// Helper: base64 decode for Supabase storage upload
function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
