import { supabase } from "../config/supabase";
import { query, getUid } from "./_base";
import type { FuelLog, ServiceResponse } from "../types";

export const fuelService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<FuelLog[]>> {
    const uid = getUid();
    const q = supabase
      .from("fuel_logs")
      .select("*, vehicles(registration_number)")
      .eq("owner_id", uid)
      .order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async add(data: Omit<FuelLog, "id" | "owner_id">): Promise<ServiceResponse<FuelLog>> {
    return query(
      supabase
        .from("fuel_logs")
        .insert({ ...data, owner_id: getUid() })
        .select()
        .single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("fuel_logs").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
