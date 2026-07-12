import { supabase } from "../supabase";
import { getUid, ok, fail } from "./_base";
import type { InsurancePolicy, ServiceResponse } from "../types";
import type { Database } from "../database.types";

type InsurancePolicyInsert = Database["public"]["Tables"]["insurance_policies"]["Insert"];

function daysLeft(expiry: string): number {
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
}

function withStatus(row: InsurancePolicy): InsurancePolicy {
  const d = daysLeft(row.expiry_date);
  return { ...row, days_left: d, status: d < 0 ? "expired" : d <= 30 ? "expiring_soon" : "active" };
}

export const insuranceService = {
  async getAll(vehicleId?: string): Promise<ServiceResponse<InsurancePolicy[]>> {
    let q = supabase.from("insurance_policies").select("*").eq("owner_id", getUid());
    if (vehicleId) q = q.eq("vehicle_id", vehicleId);
    const { data, error } = await q.order("expiry_date", { ascending: true });
    if (error) return fail(error);
    return ok((data ?? []).map(withStatus));
  },

  async create(data: Omit<InsurancePolicyInsert, "owner_id">): Promise<ServiceResponse<InsurancePolicy>> {
    const { data: row, error } = await supabase
      .from("insurance_policies")
      .insert({ ...data, owner_id: getUid() })
      .select()
      .single();
    if (error) return fail(error);
    return ok(withStatus(row as InsurancePolicy));
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from("insurance_policies").delete().eq("id", id).eq("owner_id", getUid());
    if (error) return fail(error);
    return ok(null);
  },
};
