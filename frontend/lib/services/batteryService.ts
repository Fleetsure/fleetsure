import { supabase } from "@/lib/supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import type { VehicleBattery, ServiceResponse } from "@/lib/types";

export const batteryService = {
  async getAll(): Promise<ServiceResponse<VehicleBattery[]>> {
    return query(scopeToFirm(supabase.from("vehicle_batteries").select("*").eq("owner_id", getUid())).order("installation_date", { ascending: false }));
  },

  async add(data: Omit<VehicleBattery, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<VehicleBattery>> {
    return query(supabase.from("vehicle_batteries").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single());
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(supabase.from("vehicle_batteries").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
