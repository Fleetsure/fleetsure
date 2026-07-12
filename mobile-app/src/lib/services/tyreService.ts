import { supabase } from "../supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import type { TyreLog, TyreRotation, TyreScrap, ServiceResponse } from "../types";
import type { Database } from "../database.types";

type TyreLogInsert = Database["public"]["Tables"]["tyre_logs"]["Insert"];
type TyreRotationInsert = Database["public"]["Tables"]["tyre_rotations"]["Insert"];
type TyreScrapInsert = Database["public"]["Tables"]["tyre_scraps"]["Insert"];

export const tyreService = {
  async getAll(vehicleId?: string): Promise<ServiceResponse<TyreLog[]>> {
    const uid = getUid();
    let q = scopeToFirm(supabase.from("tyre_logs").select("*").eq("owner_id", uid));
    if (vehicleId) q = q.eq("vehicle_id", vehicleId);
    return query(q.order("date", { ascending: false }));
  },

  async add(data: Omit<TyreLogInsert, "owner_id">): Promise<ServiceResponse<TyreLog>> {
    return query(
      supabase.from("tyre_logs").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("tyre_logs").delete().eq("id", id).eq("owner_id", getUid()));
  },
};

export const tyreRotationService = {
  async getAll(): Promise<ServiceResponse<TyreRotation[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("tyre_rotations").select("*").eq("owner_id", uid)).order("date", { ascending: false })
    );
  },

  async add(data: Omit<TyreRotationInsert, "owner_id">): Promise<ServiceResponse<TyreRotation>> {
    return query(
      supabase.from("tyre_rotations").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("tyre_rotations").delete().eq("id", id).eq("owner_id", getUid()));
  },
};

export const tyreScrapService = {
  async getAll(): Promise<ServiceResponse<TyreScrap[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("tyre_scraps").select("*").eq("owner_id", uid)).order("date", { ascending: false })
    );
  },

  async add(data: Omit<TyreScrapInsert, "owner_id">): Promise<ServiceResponse<TyreScrap>> {
    return query(
      supabase.from("tyre_scraps").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("tyre_scraps").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
