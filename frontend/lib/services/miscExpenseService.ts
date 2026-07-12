import { supabase } from "@/lib/supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import type { MiscExpense, ServiceResponse } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type MiscExpenseInsert = Database["public"]["Tables"]["misc_expenses"]["Insert"];

export const miscExpenseService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<MiscExpense[]>> {
    const uid = getUid();
    const q = scopeToFirm(supabase.from("misc_expenses").select("*").eq("owner_id", uid)).order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async add(data: Omit<MiscExpenseInsert, "owner_id">): Promise<ServiceResponse<MiscExpense>> {
    return query(
      supabase.from("misc_expenses").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("misc_expenses").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
