import { supabase } from "@/lib/supabase";
import { query, ok, fail, getUid } from "./_base";
import { documentService } from "./documentService";
import type { Trip, Expense, ServiceResponse } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type TripInsert = Database["public"]["Tables"]["trips"]["Insert"];
type TripUpdate = Database["public"]["Tables"]["trips"]["Update"];
type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];

export const tripService = {
  async getAll(limit = 200): Promise<ServiceResponse<Trip[]>> {
    const uid = getUid();
    return query(
      supabase.from("trips").select("*").eq("owner_id", uid).order("start_date", { ascending: false }).limit(limit)
    );
  },

  async getById(id: string): Promise<ServiceResponse<Trip>> {
    const uid = getUid();
    const [tripRes, fuelRes, tollRes, miscRes, expRes] = await Promise.all([
      query(supabase.from("trips").select("*").eq("id", id).eq("owner_id", uid).single()),
      query(supabase.from("fuel_logs").select("*").eq("trip_id", id).eq("owner_id", uid).order("date", { ascending: false })),
      query(supabase.from("toll_logs").select("*").eq("trip_id", id).eq("owner_id", uid).order("date", { ascending: false })),
      query(supabase.from("misc_expenses").select("*").eq("trip_id", id).eq("owner_id", uid).order("date", { ascending: false })),
      query(supabase.from("expenses").select("*").eq("trip_id", id).order("date", { ascending: false })),
    ]);
    if (!tripRes.success || !tripRes.data) return tripRes as unknown as ServiceResponse<Trip>;
    return ok({
      ...(tripRes.data as any),
      fuel_logs:     fuelRes.data    ?? [],
      toll_logs:     tollRes.data    ?? [],
      misc_expenses: miscRes.data    ?? [],
      expenses:      expRes.data     ?? [],
    } as Trip);
  },

  async create(data: Omit<TripInsert, "owner_id">): Promise<ServiceResponse<Trip>> {
    return query(
      supabase.from("trips").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async update(id: string, data: TripUpdate): Promise<ServiceResponse<Trip>> {
    return query(
      supabase.from("trips").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async getExpenses(tripId: string): Promise<ServiceResponse<Expense[]>> {
    return query(
      supabase.from("expenses").select("*").eq("trip_id", tripId).order("date", { ascending: false })
    );
  },

  async addExpense(tripId: string, data: Omit<ExpenseInsert, "trip_id">): Promise<ServiceResponse<Expense>> {
    return query(
      supabase.from("expenses").insert({ ...data, trip_id: tripId }).select().single()
    );
  },

  async deleteExpense(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("expenses").delete().eq("id", id)
    );
  },

  // Weighbridge slip photos — uploaded to the shared fleet-documents bucket
  // and logged into the Documents Portal under "Trip Documents", tagged
  // with the trip's route/date so it's identifiable outside the trip page.
  async uploadWeighbridgeSlip(
    file: File, tripId: string, slot: 1 | 2 | 3, tripLabel?: { origin: string; destination: string; start_date: string }
  ): Promise<ServiceResponse<string>> {
    const uid = getUid();
    const uploadRes = await documentService.upload(file, uid, `trips/${tripId}`);
    if (!uploadRes.success || !uploadRes.data) return uploadRes;
    const routeLabel = tripLabel ? ` — ${tripLabel.origin} → ${tripLabel.destination} (${tripLabel.start_date})` : "";
    await documentService.logDocument({
      ownerId: uid,
      name: `Weighbridge Slip ${slot}${routeLabel}`,
      category: "Trip Documents",
      file_url: uploadRes.data,
      linked_type: "trip",
      linked_id: tripId,
    });
    return uploadRes;
  },
};
