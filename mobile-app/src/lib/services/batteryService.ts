import { supabase } from "../supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import type { VehicleBattery, ServiceResponse } from "../types";

type BatteryInsert = Omit<VehicleBattery, "id" | "owner_id" | "firm_id" | "created_at" | "updated_at">;

export const batteryService = {
  async getAll(): Promise<ServiceResponse<VehicleBattery[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("vehicle_batteries").select("*").eq("owner_id", uid)).order("created_at", { ascending: false })
    );
  },

  async add(data: BatteryInsert): Promise<ServiceResponse<VehicleBattery>> {
    return query(
      supabase.from("vehicle_batteries").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("vehicle_batteries").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
