import { supabase } from "../supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import type { ServiceResponse } from "../types";

// database.types.ts has stale column names for this table (last_done/next_due) —
// the real migration and every web caller use last_done_date/next_due_date, so
// this service defines its own Row/Insert instead of trusting the generated
// Database["public"]["Tables"]["maintenance_schedules"] type.
export interface MaintenanceSchedule {
  id: string;
  owner_id: string;
  vehicle_id: string;
  description: string;
  frequency: string;
  amount: number;
  last_done_date: string | null;
  next_due_date: string | null;
  firm_id: string | null;
  created_at: string;
}

type MaintenanceInsert = {
  vehicle_id: string;
  description: string;
  frequency: string;
  amount: number;
  last_done_date?: string | null;
  next_due_date?: string | null;
};

export const maintenanceService = {
  async getAll(): Promise<ServiceResponse<MaintenanceSchedule[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("maintenance_schedules").select("*").eq("owner_id", uid)).order("next_due_date", { ascending: true })
    );
  },

  async add(data: MaintenanceInsert): Promise<ServiceResponse<MaintenanceSchedule>> {
    return query(
      supabase.from("maintenance_schedules").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("maintenance_schedules").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
