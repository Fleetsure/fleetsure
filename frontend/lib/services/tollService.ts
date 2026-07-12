import { supabase } from "@/lib/supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import { documentService } from "./documentService";
import type { TollLog, ServiceResponse } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type TollLogInsert = Database["public"]["Tables"]["toll_logs"]["Insert"];

export const tollService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<TollLog[]>> {
    const uid = getUid();
    const q = scopeToFirm(supabase.from("toll_logs").select("*").eq("owner_id", uid)).order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async uploadReceipt(file: File): Promise<ServiceResponse<string>> {
    return documentService.upload(file, getUid(), "toll-receipts");
  },

  async add(data: Omit<TollLogInsert, "owner_id">): Promise<ServiceResponse<TollLog>> {
    const res = await query<TollLog>(
      supabase.from("toll_logs").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
    if (res.success && data.receipt_url) {
      await documentService.logDocument({
        name: `Toll Receipt — ${data.date}`, category: "Expense Receipts",
        file_url: data.receipt_url, linked_type: data.trip_id ? "trip" : "other", linked_id: data.trip_id ?? null,
      });
    }
    return res;
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("toll_logs").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
