import { supabase } from "@/lib/supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import type { MaintenanceSchedule, ServiceResponse } from "@/lib/types";

export const maintenanceService = {
  async getAll(): Promise<ServiceResponse<MaintenanceSchedule[]>> {
    return query(scopeToFirm(supabase.from("maintenance_schedules").select("*").eq("owner_id", getUid())).order("next_due_date", { ascending: true }));
  },

  async add(data: Omit<MaintenanceSchedule, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<MaintenanceSchedule>> {
    return query(supabase.from("maintenance_schedules").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single());
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(supabase.from("maintenance_schedules").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
