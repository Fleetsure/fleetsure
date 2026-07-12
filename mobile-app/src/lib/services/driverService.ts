import { supabase } from "../supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import type { Driver, DriverPayment, ServiceResponse } from "../types";
import type { Database } from "../database.types";

type DriverInsert = Database["public"]["Tables"]["drivers"]["Insert"];
type DriverUpdate = Database["public"]["Tables"]["drivers"]["Update"];

export const driverService = {
  async getAll(): Promise<ServiceResponse<Driver[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("drivers").select("*").eq("owner_id", uid)).order("name")
    );
  },

  async create(data: Omit<DriverInsert, "owner_id">): Promise<ServiceResponse<Driver>> {
    return query(
      supabase.from("drivers").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async update(id: string, data: DriverUpdate): Promise<ServiceResponse<Driver>> {
    return query(
      supabase.from("drivers").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async getPayments(): Promise<ServiceResponse<DriverPayment[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("driver_payments").select("*").eq("owner_id", uid)).order("date", { ascending: false })
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("drivers").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
