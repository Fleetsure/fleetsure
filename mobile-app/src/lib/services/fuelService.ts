import { supabase } from "../supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import { documentService } from "./documentService";
import type { FuelLog, ServiceResponse } from "../types";
import type { Database } from "../database.types";

type FuelLogInsert = Database["public"]["Tables"]["fuel_logs"]["Insert"];

export const fuelService = {
  async getAll(vehicleId?: string): Promise<ServiceResponse<FuelLog[]>> {
    const uid = getUid();
    let q = scopeToFirm(supabase.from("fuel_logs").select("*").eq("owner_id", uid));
    if (vehicleId) q = q.eq("vehicle_id", vehicleId);
    return query(q.order("date", { ascending: false }));
  },

  async uploadReceipt(file: { uri: string; name: string; mimeType: string | null }): Promise<ServiceResponse<string>> {
    return documentService.upload(file, "fuel-receipts");
  },

  async add(data: Omit<FuelLogInsert, "owner_id">): Promise<ServiceResponse<FuelLog>> {
    return query(
      supabase.from("fuel_logs").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("fuel_logs").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
