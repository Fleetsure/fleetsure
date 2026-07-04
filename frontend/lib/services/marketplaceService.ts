import { supabase } from "@/lib/supabase";
import { query, getUid } from "./_base";
import type { ReturnLoad, LoadInterest, ServiceResponse } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type ReturnLoadInsert = Database["public"]["Tables"]["marketplace_return_loads"]["Insert"];
type ReturnLoadUpdate = Database["public"]["Tables"]["marketplace_return_loads"]["Update"];
type LoadInterestUpdate = Database["public"]["Tables"]["marketplace_load_interests"]["Update"];

interface LoadFilters {
  from_city?: string;
  to_city?: string;
  from_date?: string;
  to_date?: string;
}

export const marketplaceService = {
  async getLoads(filters?: LoadFilters): Promise<ServiceResponse<ReturnLoad[]>> {
    let q = supabase.from("marketplace_return_loads").select("*").eq("status", "open").order("available_date");
    if (filters?.from_city) q = q.ilike("from_city", `%${filters.from_city}%`);
    if (filters?.to_city)   q = q.ilike("to_city", `%${filters.to_city}%`);
    if (filters?.from_date) q = q.gte("available_date", filters.from_date);
    if (filters?.to_date)   q = q.lte("available_date", filters.to_date);
    return query(q);
  },

  async getMyLoads(): Promise<ServiceResponse<ReturnLoad[]>> {
    return query(
      supabase.from("marketplace_return_loads").select("*").eq("owner_id", getUid()).order("created_at", { ascending: false })
    );
  },

  async post(data: Omit<ReturnLoadInsert, "owner_id">): Promise<ServiceResponse<ReturnLoad>> {
    return query(
      supabase.from("marketplace_return_loads").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async update(id: string, data: ReturnLoadUpdate): Promise<ServiceResponse<ReturnLoad>> {
    return query(
      supabase.from("marketplace_return_loads").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async cancel(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("marketplace_return_loads").delete().eq("id", id).eq("owner_id", getUid())
    );
  },

  async expressInterest(loadId: string, data: { message?: string }): Promise<ServiceResponse<LoadInterest>> {
    return query(
      supabase.from("marketplace_load_interests").insert({ ...data, return_load_id: loadId, interested_user_id: getUid() }).select().single()
    );
  },

  async getInterestsReceived(): Promise<ServiceResponse<LoadInterest[]>> {
    const uid = getUid();
    return query(
      supabase
        .from("marketplace_load_interests")
        .select("*, marketplace_return_loads!inner(*)")
        .eq("marketplace_return_loads.owner_id", uid)
        .order("created_at", { ascending: false })
    );
  },

  async getInterestsSent(): Promise<ServiceResponse<LoadInterest[]>> {
    return query(
      supabase
        .from("marketplace_load_interests")
        .select("*, marketplace_return_loads(*)")
        .eq("interested_user_id", getUid())
        .order("created_at", { ascending: false })
    );
  },

  async updateInterest(id: string, data: LoadInterestUpdate): Promise<ServiceResponse<LoadInterest>> {
    return query(
      supabase.from("marketplace_load_interests").update(data).eq("id", id).select().single()
    );
  },
};
