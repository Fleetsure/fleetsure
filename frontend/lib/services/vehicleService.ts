import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { Vehicle, ServiceResponse } from "@/lib/types";

export const vehicleService = {
  async getAll(): Promise<ServiceResponse<Vehicle[]>> {
    const uid = getUid();
    return query(
      supabase.from("vehicles").select("*").eq("owner_id", uid).order("created_at", { ascending: false })
    );
  },

  async create(data: Omit<Vehicle, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<Vehicle>> {
    return query(
      supabase.from("vehicles").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async update(id: string, data: Partial<Vehicle>): Promise<ServiceResponse<Vehicle>> {
    return query(
      supabase.from("vehicles").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },
};
