import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { Driver, DriverPayment, ServiceResponse } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type DriverInsert = Database["public"]["Tables"]["drivers"]["Insert"];
type DriverUpdate = Database["public"]["Tables"]["drivers"]["Update"];
type DriverPaymentInsert = Database["public"]["Tables"]["driver_payments"]["Insert"];

export const driverService = {
  async getAll(): Promise<ServiceResponse<Driver[]>> {
    const uid = getUid();
    return query(
      supabase.from("drivers").select("*").eq("owner_id", uid).order("name")
    );
  },

  async create(data: Omit<DriverInsert, "owner_id">): Promise<ServiceResponse<Driver>> {
    return query(
      supabase.from("drivers").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async update(id: string, data: DriverUpdate): Promise<ServiceResponse<Driver>> {
    return query(
      supabase.from("drivers").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async getPayments(driver_id?: string): Promise<ServiceResponse<DriverPayment[]>> {
    const uid = getUid();
    const q = supabase.from("driver_payments").select("*").eq("owner_id", uid).order("date", { ascending: false });
    return query(driver_id ? q.eq("driver_id", driver_id) : q);
  },

  async getLedger(driver_id: string): Promise<ServiceResponse<DriverPayment[]>> {
    return query(
      supabase.from("driver_payments").select("*").eq("driver_id", driver_id).eq("owner_id", getUid()).order("date", { ascending: false })
    );
  },

  async addPayment(data: Omit<DriverPaymentInsert, "owner_id">): Promise<ServiceResponse<DriverPayment>> {
    return query(
      supabase.from("driver_payments").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async deletePayment(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("driver_payments").delete().eq("id", id).eq("owner_id", getUid())
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("drivers").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
