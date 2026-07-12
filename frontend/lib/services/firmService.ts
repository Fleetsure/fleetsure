import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { Firm, ServiceResponse } from "@/lib/types";

export const firmService = {
  async getAll(): Promise<ServiceResponse<Firm[]>> {
    return query(supabase.from("firms").select("*").eq("owner_id", getUid()).order("created_at", { ascending: true }));
  },

  async create(data: Omit<Firm, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<Firm>> {
    return query(supabase.from("firms").insert({ ...data, owner_id: getUid() }).select().single());
  },

  async update(id: string, data: Partial<Omit<Firm, "id" | "owner_id" | "created_at">>): Promise<ServiceResponse<Firm>> {
    return query(supabase.from("firms").update(data).eq("id", id).eq("owner_id", getUid()).select().single());
  },
};
