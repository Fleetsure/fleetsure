import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { TollLog, ServiceResponse } from "@/lib/types";

export const tollService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<TollLog[]>> {
    const uid = getUid();
    const q = supabase.from("toll_logs").select("*").eq("owner_id", uid).order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async add(data: Omit<TollLog, "id" | "owner_id">): Promise<ServiceResponse<TollLog>> {
    return query(
      supabase.from("toll_logs").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("toll_logs").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
