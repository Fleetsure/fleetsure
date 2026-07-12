import { supabase } from "../supabase";
import { query, ok, getUid, getFirmId, scopeToFirm } from "./_base";
import type { Trip, ServiceResponse } from "../types";
import type { Database } from "../database.types";

type TripInsert = Database["public"]["Tables"]["trips"]["Insert"];
type TripUpdate = Database["public"]["Tables"]["trips"]["Update"];

export const tripService = {
  async getAll(limit = 200): Promise<ServiceResponse<Trip[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("trips").select("*").eq("owner_id", uid)).order("start_date", { ascending: false }).limit(limit)
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
      supabase.from("trips").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async update(id: string, data: TripUpdate): Promise<ServiceResponse<Trip>> {
    return query(
      supabase.from("trips").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("trips").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
