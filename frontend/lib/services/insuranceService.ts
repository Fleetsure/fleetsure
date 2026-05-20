import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { InsurancePolicy, ServiceResponse } from "@/lib/types";

export const insuranceService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<InsurancePolicy[]>> {
    const uid = getUid();
    const q = supabase
      .from("insurance_policies")
      .select("*, vehicles(registration_number)")
      .eq("owner_id", uid)
      .order("expiry_date");
    const res = await query<any[]>(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
    if (!res.success) return res;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const data = (res.data || []).map((p: any) => {
      const expiry = p.expiry_date ? new Date(p.expiry_date) : null;
      const days = expiry ? Math.floor((expiry.getTime() - today.getTime()) / 86400000) : null;
      const status = days === null ? "unknown" : days < 0 ? "expired" : days <= 30 ? "expiring_soon" : "active";
      return {
        ...p,
        reg_number: p.vehicles?.registration_number || null,
        days_left: days ?? 0,
        status,
      };
    });
    return { success: true, data };
  },

  async create(data: Omit<InsurancePolicy, "id" | "owner_id" | "days_left" | "status" | "reg_number">): Promise<ServiceResponse<InsurancePolicy>> {
    return query(
      supabase.from("insurance_policies").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("insurance_policies").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
