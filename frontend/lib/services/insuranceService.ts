import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { InsurancePolicy, ServiceResponse } from "@/lib/types";

export const insuranceService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<InsurancePolicy[]>> {
    const uid = getUid();
    // No embed here — insurance_policies has no foreign key to vehicles at
    // all (checked the live schema), so `vehicles(registration_number)`
    // could never resolve: PostgREST requires a real FK for embeds and
    // returns a 400 ("could not find a relationship in the schema cache")
    // when there isn't one, silently failing every call. Same fix as
    // documentService.getAll(): a separate batched lookup instead.
    const q = supabase
      .from("insurance_policies")
      .select("*")
      .eq("owner_id", uid)
      .order("expiry_date");
    const res = await query<any[]>(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
    if (!res.success) return res;
    const rows = res.data || [];

    const vehicleIds = [...new Set(rows.map(p => p.vehicle_id).filter(Boolean))];
    const vehiclesRes = vehicleIds.length
      ? await query<{ id: string; registration_number: string }[]>(
          supabase.from("vehicles").select("id, registration_number").in("id", vehicleIds)
        )
      : { success: true, data: [] as { id: string; registration_number: string }[] };
    const vehicleMap = new Map((vehiclesRes.data || []).map(v => [v.id, v.registration_number]));

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const data = rows.map((p: any) => {
      const expiry = p.expiry_date ? new Date(p.expiry_date) : null;
      const days = expiry ? Math.floor((expiry.getTime() - today.getTime()) / 86400000) : null;
      const status = days === null ? "unknown" : days < 0 ? "expired" : days <= 30 ? "expiring_soon" : "active";
      return {
        ...p,
        reg_number: vehicleMap.get(p.vehicle_id) || null,
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
