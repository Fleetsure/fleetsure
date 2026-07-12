import { supabase } from "@/lib/supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import type { TyreLog, TyreRotation, TyreScrap, ServiceResponse } from "@/lib/types";

export const tyreService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<TyreLog[]>> {
    const uid = getUid();
    const q = scopeToFirm(supabase.from("tyre_logs").select("*").eq("owner_id", uid)).order("date", { ascending: false });
    return query(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
  },

  async add(data: Omit<TyreLog, "id" | "owner_id">): Promise<ServiceResponse<TyreLog>> {
    return query(
      supabase.from("tyre_logs").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("tyre_logs").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};

export const tyreRotationService = {
  async getAll(): Promise<ServiceResponse<TyreRotation[]>> {
    return query(scopeToFirm(supabase.from("tyre_rotations").select("*").eq("owner_id", getUid())).order("date", { ascending: false }));
  },

  async add(data: Omit<TyreRotation, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<TyreRotation>> {
    return query(supabase.from("tyre_rotations").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single());
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(supabase.from("tyre_rotations").delete().eq("id", id).eq("owner_id", getUid()));
  },
};

export const tyreScrapService = {
  async getAll(): Promise<ServiceResponse<TyreScrap[]>> {
    return query(scopeToFirm(supabase.from("tyre_scraps").select("*").eq("owner_id", getUid())).order("date", { ascending: false }));
  },

  async add(data: Omit<TyreScrap, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<TyreScrap>> {
    return query(supabase.from("tyre_scraps").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single());
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(supabase.from("tyre_scraps").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
