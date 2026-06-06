import { supabase } from "../config/supabase";
import { query, getUid } from "./_base";
import type { MiscExpense, ServiceResponse } from "../types";

export const expenseService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<MiscExpense[]>> {
    const uid = getUid();
    const q = supabase
      .from("misc_expenses")
      .select("*, vehicles(registration_number)")
      .eq("owner_id", uid)
      .order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async add(
    data: Omit<MiscExpense, "id" | "owner_id">
  ): Promise<ServiceResponse<MiscExpense>> {
    return query(
      supabase
        .from("misc_expenses")
        .insert({ ...data, owner_id: getUid() })
        .select()
        .single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase
        .from("misc_expenses")
        .delete()
        .eq("id", id)
        .eq("owner_id", getUid())
    );
  },
};
