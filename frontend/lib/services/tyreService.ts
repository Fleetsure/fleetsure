import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { TyreLog, ServiceResponse } from "@/lib/types";

export const tyreService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<TyreLog[]>> {
    const uid = getUid();
    const q = supabase.from("tyre_logs").select("*").eq("owner_id", uid).order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async add(data: Omit<TyreLog, "id" | "owner_id">): Promise<ServiceResponse<TyreLog>> {
    return query(
      supabase.from("tyre_logs").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("tyre_logs").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
