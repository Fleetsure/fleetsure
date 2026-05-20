import { supabase } from "@/lib/supabase";
import { query, getUid, ok, fail } from "./_base";
import { api } from "@/lib/api";
import type { FuelLog, ServiceResponse } from "@/lib/types";

export const fuelService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<FuelLog[]>> {
    const uid = getUid();
    const q = supabase.from("fuel_logs").select("*").eq("owner_id", uid).order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async add(data: Omit<FuelLog, "id" | "owner_id">): Promise<ServiceResponse<FuelLog>> {
    return query(
      supabase.from("fuel_logs").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("fuel_logs").delete().eq("id", id).eq("owner_id", getUid())
    );
  },

  async getAnalytics(): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get("/fuel/analytics");
      return ok(res.data);
    } catch (e) {
      return fail(e);
    }
  },
};
