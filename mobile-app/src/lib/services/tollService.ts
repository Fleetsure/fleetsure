import { supabase } from "../supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import { documentService } from "./documentService";
import type { TollLog, ServiceResponse } from "../types";
import type { Database } from "../database.types";

type TollLogInsert = Database["public"]["Tables"]["toll_logs"]["Insert"];

export const tollService = {
  async getAll(vehicleId?: string): Promise<ServiceResponse<TollLog[]>> {
    const uid = getUid();
    let q = scopeToFirm(supabase.from("toll_logs").select("*").eq("owner_id", uid));
    if (vehicleId) q = q.eq("vehicle_id", vehicleId);
    return query(q.order("date", { ascending: false }));
  },

  async uploadReceipt(file: { uri: string; name: string; mimeType: string | null }): Promise<ServiceResponse<string>> {
    return documentService.upload(file, "toll-receipts");
  },

  async add(data: Omit<TollLogInsert, "owner_id">): Promise<ServiceResponse<TollLog>> {
    return query(
      supabase.from("toll_logs").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("toll_logs").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
